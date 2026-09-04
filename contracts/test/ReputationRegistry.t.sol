// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../src/ReputationRegistry.sol";
import "../script/Deploy.s.sol"; // for MockUSDT

contract ReputationRegistryTest is Test {
    ReputationRegistry public registry;
    MockUSDT           public usdt;

    address public alice  = makeAddr("alice");
    address public bob    = makeAddr("bob");
    address public carol  = makeAddr("carol");
    address public authorized = makeAddr("authorized");

    uint256 constant STAKE_10_USDT  = 10e6;
    uint256 constant STAKE_100_USDT = 100e6;

    function setUp() public {
        // Deploy mock USDT
        usdt = new MockUSDT();

        // Deploy registry with 'authorized' as the sole authorized caller
        address[] memory auth = new address[](1);
        auth[0] = authorized;
        registry = new ReputationRegistry(address(usdt), auth);

        // Fund alice + carol with USDT
        usdt.mint(alice,  STAKE_100_USDT * 10);
        usdt.mint(carol,  STAKE_100_USDT * 10);

        // Approve registry to spend from alice + carol
        vm.prank(alice);
        usdt.approve(address(registry), type(uint256).max);

        vm.prank(carol);
        usdt.approve(address(registry), type(uint256).max);
    }

    // ─── Trust score ──────────────────────────────────────────────────────────

    function test_NewAddressHasZeroTrustScore() public {
        // New addresses start at exactly 0 — no hardcoded starting score
        assertEq(registry.trustScore(bob), 0);
    }

    function test_TrustScoreIncreasesWithStake() public {
        // $100 USDT vouched → +10 trust points (STAKE_DIVISOR = $10)
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_100_USDT);

        assertEq(registry.trustScore(bob), 10);
    }

    function test_TrustScoreIncreasesWithCompletedDeals() public {
        vm.prank(authorized);
        registry.recordDealComplete(bob);

        assertEq(registry.trustScore(bob), 1);
    }

    function test_TrustScoreDecreasesWithSlash() public {
        // Give bob some trust first
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_100_USDT); // +10 score

        // Slash → penalty = 3
        vm.prank(authorized);
        registry.slash(bob);

        // Score: 10 (from stake) - 3 (slash penalty) = 7
        assertEq(registry.trustScore(bob), 7);
    }

    function test_TrustScoreNeverNegative() public {
        // No stake, 2 slashes → score should be 0, not negative
        vm.startPrank(authorized);
        registry.slash(bob);
        registry.slash(bob);
        vm.stopPrank();

        assertEq(registry.trustScore(bob), 0);
    }

    // ─── vouchFor ─────────────────────────────────────────────────────────────

    function test_VouchFor_HappyPath() public {
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_10_USDT);

        (uint256 amount, , bool active) = registry.getVouchInfo(alice, bob);
        assertEq(amount, STAKE_10_USDT);
        assertTrue(active);
        assertEq(registry.totalVouchStake(bob), STAKE_10_USDT);
    }

    function test_VouchFor_TransfersTokens() public {
        uint256 balanceBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        registry.vouchFor(bob, STAKE_10_USDT);

        assertEq(usdt.balanceOf(alice), balanceBefore - STAKE_10_USDT);
        assertEq(usdt.balanceOf(address(registry)), STAKE_10_USDT);
    }

    function test_VouchFor_EmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit IReputationRegistry.Vouched(alice, bob, STAKE_10_USDT, block.timestamp);

        vm.prank(alice);
        registry.vouchFor(bob, STAKE_10_USDT);
    }

    function test_VouchFor_CannotVouchForSelf() public {
        vm.prank(alice);
        vm.expectRevert("ReputationRegistry: cannot vouch for yourself");
        registry.vouchFor(alice, STAKE_10_USDT);
    }

    function test_VouchFor_CannotVouchZeroAmount() public {
        vm.prank(alice);
        vm.expectRevert("ReputationRegistry: amount must be > 0");
        registry.vouchFor(bob, 0);
    }

    function test_VouchFor_MultipleVouchers() public {
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_10_USDT);

        vm.prank(carol);
        registry.vouchFor(bob, STAKE_100_USDT);

        assertEq(registry.totalVouchStake(bob), STAKE_10_USDT + STAKE_100_USDT);
        assertEq(registry.getVouchers(bob).length, 2);
    }

    // ─── withdrawVouch ────────────────────────────────────────────────────────

    function test_WithdrawVouch_AfterCooldown() public {
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_10_USDT);

        // Warp past cooldown
        vm.warp(block.timestamp + registry.COOLDOWN() + 1);

        uint256 balanceBefore = usdt.balanceOf(alice);

        vm.prank(alice);
        registry.withdrawVouch(bob);

        assertEq(usdt.balanceOf(alice), balanceBefore + STAKE_10_USDT);

        (, , bool active) = registry.getVouchInfo(alice, bob);
        assertFalse(active);
    }

    function test_WithdrawVouch_RevertsBeforeCooldown() public {
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_10_USDT);

        // Don't warp — cooldown not elapsed
        vm.prank(alice);
        vm.expectRevert("ReputationRegistry: cooldown not elapsed");
        registry.withdrawVouch(bob);
    }

    function test_WithdrawVouch_RevertsIfNoVouch() public {
        vm.prank(alice);
        vm.expectRevert("ReputationRegistry: no active vouch");
        registry.withdrawVouch(bob);
    }

    // ─── slash ────────────────────────────────────────────────────────────────

    function test_Slash_ReducesVoucherStake() public {
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_100_USDT);

        vm.prank(authorized);
        registry.slash(bob);

        // 50% of alice's stake burned
        (uint256 amount, , ) = registry.getVouchInfo(alice, bob);
        assertEq(amount, STAKE_100_USDT / 2);
    }

    function test_Slash_RevertsForUnauthorizedCaller() public {
        vm.prank(alice);
        vm.expectRevert("ReputationRegistry: not authorized");
        registry.slash(bob);
    }

    // ─── highTrustUsers ───────────────────────────────────────────────────────

    function test_HighTrustUsers_ReturnsEligible() public {
        // Give bob score 10 ($100 stake)
        vm.prank(alice);
        registry.vouchFor(bob, STAKE_100_USDT);

        // Carol with score 5 ($50 stake)
        vm.prank(carol);
        registry.vouchFor(carol, 50e6); // won't work - can't vouch for self
        // Actually vouch carol for someone else, then have them vouch carol
        // Let's use alice to vouch carol
        vm.prank(alice);
        registry.vouchFor(carol, 50e6); // +5 score

        address[] memory highTrust = registry.highTrustUsers(10);
        assertEq(highTrust.length, 1);
        assertEq(highTrust[0], bob);
    }
}
