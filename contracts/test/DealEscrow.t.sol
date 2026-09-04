// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ReputationRegistry.sol";
import "../src/DealEscrow.sol";
import "../src/DisputeJury.sol";
import "../script/Deploy.s.sol"; // for MockUSDT

contract DealEscrowTest is Test {
    MockUSDT           public usdt;
    ReputationRegistry public registry;
    DealEscrow         public escrow;
    DisputeJury        public jury;

    address public alice  = makeAddr("alice");  // seller
    address public bob    = makeAddr("bob");    // buyer
    address public carol  = makeAddr("carol");  // third party

    uint256 constant PRICE = 50e6; // $50 USDT

    event ListingCreated(uint256 indexed listingId, address indexed seller, uint256 price, string metadataURI, uint256 timestamp, string category);
    event DealCompleted(uint256 indexed dealId, address indexed seller, address indexed buyer, uint256 amount);

    function setUp() public {
        usdt = new MockUSDT();

        address[] memory emptyAuth = new address[](0);
        registry = new ReputationRegistry(address(usdt), emptyAuth);
        escrow   = new DealEscrow(address(usdt), address(registry));
        jury     = new DisputeJury(address(registry), address(escrow));

        escrow.setDisputeJury(address(jury));
        registry.setAuthorized(address(escrow), true);
        registry.setAuthorized(address(jury),   true);

        // Fund bob with USDT
        usdt.mint(bob, PRICE * 10);
        vm.prank(bob);
        usdt.approve(address(escrow), type(uint256).max);
    }

    // ─── createListing ────────────────────────────────────────────────────────

    function test_CreateListing_HappyPath() public {
        string memory meta = '{"title":"Logo Design","description":"Vector logo","tags":["design"]}';

        vm.prank(alice);
        uint256 id = escrow.createListing(PRICE, meta, "gig");

        assertEq(id, 1);
        assertEq(escrow.listingCount(), 1);

        (address seller, uint256 price, string memory metaURI, string memory cat, bool active,) = escrow.getListing(1);
        assertEq(seller, alice);
        assertEq(price, PRICE);
        assertEq(metaURI, meta);
        assertEq(cat, "gig");
        assertTrue(active);
    }

    function test_CreateListing_EmitsEvent() public {
        string memory meta = '{"title":"Test"}';

        vm.prank(alice);
        vm.expectEmit(true, true, false, false);
        emit ListingCreated(1, alice, PRICE, meta, block.timestamp, "gig");
        escrow.createListing(PRICE, meta, "gig");
    }

    function test_CreateListing_RevertsOnZeroPrice() public {
        vm.prank(alice);
        vm.expectRevert("DealEscrow: price must be > 0");
        escrow.createListing(0, "test", "gig");
    }

    function test_CreateListing_RevertsOnEmptyMetadata() public {
        vm.prank(alice);
        vm.expectRevert("DealEscrow: empty metadata");
        escrow.createListing(PRICE, "", "gig");
    }

    // ─── joinDeal ─────────────────────────────────────────────────────────────

    function test_JoinDeal_HappyPath() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        uint256 bobBalBefore = usdt.balanceOf(bob);

        vm.prank(bob);
        uint256 dealId = escrow.joinDeal(listingId);

        assertEq(dealId, 1);
        assertEq(usdt.balanceOf(bob), bobBalBefore - PRICE);
        assertEq(usdt.balanceOf(address(escrow)), PRICE);

        (,, address buyer,,,,, ) = escrow.getDeal(1);
        assertEq(buyer, bob);
    }

    function test_JoinDeal_SellerCannotBeBuyer() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        usdt.mint(alice, PRICE);
        vm.prank(alice);
        usdt.approve(address(escrow), PRICE);

        vm.prank(alice);
        vm.expectRevert("DealEscrow: seller cannot be buyer");
        escrow.joinDeal(listingId);
    }

    function test_JoinDeal_DeactivatesListing() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        vm.prank(bob);
        escrow.joinDeal(listingId);

        (,,,,bool active,) = escrow.getListing(listingId);
        assertFalse(active);
    }

    // ─── markComplete ─────────────────────────────────────────────────────────

    function test_MarkComplete_BothPartiesReleaseFunds() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        vm.prank(bob);
        uint256 dealId = escrow.joinDeal(listingId);

        uint256 aliceBalBefore = usdt.balanceOf(alice);

        // Seller confirms
        vm.prank(alice);
        escrow.markComplete(dealId);

        // Buyer confirms → triggers release
        vm.prank(bob);
        vm.expectEmit(true, true, true, true);
        emit DealCompleted(dealId, alice, bob, PRICE);
        escrow.markComplete(dealId);

        // Funds released to seller
        assertEq(usdt.balanceOf(alice), aliceBalBefore + PRICE);
        assertEq(usdt.balanceOf(address(escrow)), 0);
    }

    function test_MarkComplete_IncreasesReputation() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        vm.prank(bob);
        uint256 dealId = escrow.joinDeal(listingId);

        vm.prank(alice);
        escrow.markComplete(dealId);
        vm.prank(bob);
        escrow.markComplete(dealId);

        // Both parties gain a completed deal
        assertEq(registry.completedDeals(alice), 1);
        assertEq(registry.completedDeals(bob),   1);
    }

    function test_MarkComplete_CannotDoubleCall() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        vm.prank(bob);
        uint256 dealId = escrow.joinDeal(listingId);

        vm.prank(alice);
        escrow.markComplete(dealId);
        vm.prank(bob);
        escrow.markComplete(dealId); // deal now Completed

        // Third call should revert
        vm.prank(alice);
        vm.expectRevert("DealEscrow: deal not in completable state");
        escrow.markComplete(dealId);
    }

    function test_MarkComplete_OnlyPartiesCanCall() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        vm.prank(bob);
        uint256 dealId = escrow.joinDeal(listingId);

        vm.prank(carol);
        vm.expectRevert("DealEscrow: not a party");
        escrow.markComplete(dealId);
    }

    // ─── raiseDispute ─────────────────────────────────────────────────────────

    function test_RaiseDispute_HappyPath() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        vm.prank(bob);
        uint256 dealId = escrow.joinDeal(listingId);

        vm.prank(bob);
        escrow.raiseDispute(dealId);

        (,,,,uint8 status,,,) = escrow.getDeal(dealId);
        assertEq(status, 4); // Disputed
    }

    function test_RaiseDispute_OnlyPartiesCanCall() public {
        vm.prank(alice);
        uint256 listingId = escrow.createListing(PRICE, "test", "gig");

        vm.prank(bob);
        uint256 dealId = escrow.joinDeal(listingId);

        vm.prank(carol);
        vm.expectRevert("DealEscrow: not a party");
        escrow.raiseDispute(dealId);
    }
}
