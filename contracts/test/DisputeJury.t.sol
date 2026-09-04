// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ReputationRegistry.sol";
import "../src/DealEscrow.sol";
import "../src/DisputeJury.sol";
import "../script/Deploy.s.sol"; // for MockUSDT

contract DisputeJuryTest is Test {
    MockUSDT           public usdt;
    ReputationRegistry public registry;
    DealEscrow         public escrow;
    DisputeJury        public jury;

    address public seller = makeAddr("seller");
    address public buyer  = makeAddr("buyer");
    uint256 public dealId;

    address[] public jurors;

    uint256 constant PRICE       = 100e6;  // $100 USDT
    uint256 constant STAKE_EACH  = 100e6;  // $100 per juror = 10 trust score each
    uint256 constant NUM_JURORS  = 5;

    function setUp() public {
        usdt = new MockUSDT();

        address[] memory emptyAuth = new address[](0);
        registry = new ReputationRegistry(address(usdt), emptyAuth);
        escrow   = new DealEscrow(address(usdt), address(registry));
        jury     = new DisputeJury(address(registry), address(escrow));

        escrow.setDisputeJury(address(jury));
        registry.setAuthorized(address(escrow), true);
        registry.setAuthorized(address(jury),   true);

        // Create 5 high-trust addresses (each with score >= 10)
        for (uint256 i = 0; i < NUM_JURORS; i++) {
            address juror    = makeAddr(string(abi.encodePacked("juror", i)));
            address voucher  = makeAddr(string(abi.encodePacked("voucher", i)));
            jurors.push(juror);

            // Mint + approve for voucher
            usdt.mint(voucher, STAKE_EACH);
            vm.prank(voucher);
            usdt.approve(address(registry), STAKE_EACH);

            // Vouch for juror (10 trust score from $100 stake)
            vm.prank(voucher);
            registry.vouchFor(juror, STAKE_EACH);

            assertEq(registry.trustScore(juror), 10); // sanity check
        }

        // Create a deal
        usdt.mint(buyer, PRICE);
        vm.prank(buyer);
        usdt.approve(address(escrow), PRICE);

        vm.prank(seller);
        uint256 listingId = escrow.createListing(PRICE, '{"title":"Test"}', "gig");

        vm.prank(buyer);
        dealId = escrow.joinDeal(listingId);

        // Raise a dispute
        vm.prank(buyer);
        escrow.raiseDispute(dealId);
    }

    // ─── selectJury ──────────────────────────────────────────────────────────

    function test_SelectJury_HappyPath() public {
        // Anyone can trigger jury selection
        jury.selectJury(dealId);

        (address[] memory selectedJurors,,,,,) = jury.getDispute(dealId);
        assertEq(selectedJurors.length, NUM_JURORS);

        // All selected jurors must be from the eligible set
        for (uint256 i = 0; i < selectedJurors.length; i++) {
            assertTrue(jury.isJuror(dealId, selectedJurors[i]));
        }
    }

    function test_SelectJury_CannotBeCalledTwice() public {
        jury.selectJury(dealId);

        vm.expectRevert("DisputeJury: jury already selected");
        jury.selectJury(dealId);
    }

    function test_SelectJury_RevertsIfInsufficientHighTrustUsers() public {
        // Create a new dispute where no high-trust users exist yet
        MockUSDT        usdt2    = new MockUSDT();
        address[] memory empty   = new address[](0);
        ReputationRegistry reg2  = new ReputationRegistry(address(usdt2), empty);
        DealEscrow       esc2   = new DealEscrow(address(usdt2), address(reg2));
        DisputeJury      jury2  = new DisputeJury(address(reg2), address(esc2));

        esc2.setDisputeJury(address(jury2));
        reg2.setAuthorized(address(esc2), true);
        reg2.setAuthorized(address(jury2), true);

        usdt2.mint(buyer, PRICE);
        vm.prank(buyer);
        usdt2.approve(address(esc2), PRICE);

        vm.prank(seller);
        uint256 lid = esc2.createListing(PRICE, '{"title":"T"}', "gig");

        vm.prank(buyer);
        uint256 did = esc2.joinDeal(lid);

        vm.prank(buyer);
        esc2.raiseDispute(did);

        vm.expectRevert("DisputeJury: insufficient high-trust users");
        jury2.selectJury(did);
    }

    // ─── castVote ────────────────────────────────────────────────────────────

    function test_CastVote_HappyPath() public {
        jury.selectJury(dealId);
        (address[] memory selected,,,,,) = jury.getDispute(dealId);

        vm.prank(selected[0]);
        jury.castVote(dealId, true); // vote for seller

        assertFalse(jury.hasVoted(dealId, selected[0]) == false);

        (,uint256 sellerVotes,,,, ) = jury.getDispute(dealId);
        assertEq(sellerVotes, 1);
    }

    function test_CastVote_CannotVoteTwice() public {
        jury.selectJury(dealId);
        (address[] memory selected,,,,,) = jury.getDispute(dealId);

        vm.prank(selected[0]);
        jury.castVote(dealId, true);

        vm.prank(selected[0]);
        vm.expectRevert("DisputeJury: already voted");
        jury.castVote(dealId, true);
    }

    function test_CastVote_NonJurorRejected() public {
        jury.selectJury(dealId);

        address stranger = makeAddr("stranger");
        vm.prank(stranger);
        vm.expectRevert("DisputeJury: not a juror");
        jury.castVote(dealId, true);
    }

    // ─── resolve ─────────────────────────────────────────────────────────────

    function test_Resolve_MajoritySellerWins() public {
        jury.selectJury(dealId);
        (address[] memory selected,,,,,) = jury.getDispute(dealId);

        uint256 sellerBalBefore = usdt.balanceOf(seller);

        // 3 votes for seller (majority of 5)
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(selected[i]);
            jury.castVote(dealId, true);
        }

        jury.resolve(dealId);

        // Seller received funds
        assertGt(usdt.balanceOf(seller), sellerBalBefore);

        // Dispute marked resolved
        (,,,bool resolved, bool releaseToSeller,) = jury.getDispute(dealId);
        assertTrue(resolved);
        assertTrue(releaseToSeller);
    }

    function test_Resolve_MajorityBuyerWins_SlashesSeller() public {
        // Give seller some vouchers so slash has something to burn
        address voucher = makeAddr("sellerVoucher");
        usdt.mint(voucher, 100e6);
        vm.prank(voucher);
        usdt.approve(address(registry), 100e6);
        vm.prank(voucher);
        registry.vouchFor(seller, 100e6);

        jury.selectJury(dealId);
        (address[] memory selected,,,,,) = jury.getDispute(dealId);

        uint256 buyerBalBefore = usdt.balanceOf(buyer);

        // 3 votes for buyer (majority of 5)
        for (uint256 i = 0; i < 3; i++) {
            vm.prank(selected[i]);
            jury.castVote(dealId, false);
        }

        jury.resolve(dealId);

        // Buyer refunded
        assertGt(usdt.balanceOf(buyer), buyerBalBefore);

        // Seller was slashed
        assertEq(registry.slashCount(seller), 1);

        (,,,bool resolved, bool releaseToSeller,) = jury.getDispute(dealId);
        assertTrue(resolved);
        assertFalse(releaseToSeller);
    }

    function test_Resolve_RevertsIfNoMajority() public {
        jury.selectJury(dealId);
        (address[] memory selected,,,,,) = jury.getDispute(dealId);

        // Only 2 votes — not enough for majority (need 3)
        vm.prank(selected[0]);
        jury.castVote(dealId, true);
        vm.prank(selected[1]);
        jury.castVote(dealId, true);

        vm.expectRevert("DisputeJury: no majority yet");
        jury.resolve(dealId);
    }

    function test_Resolve_CannotResolveAgain() public {
        jury.selectJury(dealId);
        (address[] memory selected,,,,,) = jury.getDispute(dealId);

        for (uint256 i = 0; i < 3; i++) {
            vm.prank(selected[i]);
            jury.castVote(dealId, true);
        }
        jury.resolve(dealId);

        vm.expectRevert("DisputeJury: already resolved");
        jury.resolve(dealId);
    }
}
