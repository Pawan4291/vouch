// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title IReputationRegistry
/// @notice Interface for the Vouch reputation staking system
interface IReputationRegistry {
    // ─── Events ────────────────────────────────────────────────────────────────

    event Vouched(address indexed voucher, address indexed vouchee, uint256 amount, uint256 timestamp);
    event Slashed(address indexed user, address indexed voucher, uint256 amount);
    event VouchWithdrawn(address indexed voucher, address indexed vouchee, uint256 amount, uint256 timestamp);

    // ─── View functions ────────────────────────────────────────────────────────

    /// @notice Computed trust score for a user.
    ///         Formula: (totalVouchStake / STAKE_DIVISOR) + completedDeals - (slashCount * SLASH_PENALTY)
    ///         New addresses start at 0 — no hardcoded starting score.
    function trustScore(address user) external view returns (uint256);

    /// @notice Amount + timestamp + active status of a specific vouch.
    function getVouchInfo(address voucher, address vouchee)
        external
        view
        returns (uint256 amount, uint256 timestamp, bool active);

    /// @notice All addresses that have vouched for `vouchee`.
    function getVouchers(address vouchee) external view returns (address[] memory);

    /// @notice Count of successfully completed deals for `user`.
    function completedDeals(address user) external view returns (uint256);

    /// @notice Count of times `user` has been slashed.
    function slashCount(address user) external view returns (uint256);

    /// @notice Total active USDT stake vouched by others for `user`.
    function totalVouchStake(address user) external view returns (uint256);

    /// @notice All addresses with trustScore >= minScore (used for jury selection).
    function highTrustUsers(uint256 minScore) external view returns (address[] memory);

    // ─── Write functions ────────────────────────────────────────────────────────

    /// @notice Stake `amount` of USDT against `user`'s reputation.
    ///         Caller must have approved this contract to spend `amount` of stakeToken.
    function vouchFor(address user, uint256 amount) external;

    /// @notice Release a vouch stake back to the voucher.
    ///         Reverts if the cooldown period has not elapsed.
    function withdrawVouch(address user) external;

    /// @notice Slash the vouchers of `user` (called by DealEscrow or DisputeJury only).
    function slash(address user) external;

    /// @notice Increment completed-deal count for `user` (called by DealEscrow only).
    function recordDealComplete(address user) external;
}
