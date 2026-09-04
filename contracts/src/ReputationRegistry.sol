// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IReputationRegistry.sol";

// ─── Minimal IERC-20 for USDT transfers ──────────────────────────────────────
interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

/// @title ReputationRegistry
/// @author Vouch
/// @notice Staked-reputation system for the Vouch marketplace.
///
/// Trust score formula (view only, never stored):
///   score = (totalActiveStake / STAKE_DIVISOR) + completedDeals - (slashCount * SLASH_PENALTY)
///   capped at zero minimum (negative trust = 0)
///
/// Vouching flow:
///   1. Caller approves stakeToken.transferFrom to this contract.
///   2. Caller calls vouchFor(user, amount).
///   3. Tokens are locked; vouchee's trust score rises.
///   4. Voucher can withdrawVouch() after COOLDOWN has passed.
///   5. If vouchee scams, DealEscrow/DisputeJury calls slash() → partial stake burned.
///
contract ReputationRegistry is IReputationRegistry {
    // ─── Constants ────────────────────────────────────────────────────────────

    /// @dev $10 USDT (6 decimals) per 1 trust point from staking.
    uint256 public constant STAKE_DIVISOR = 10e6;
    /// @dev Each slash deducts 3 trust points.
    uint256 public constant SLASH_PENALTY = 3;
    /// @dev Vouchers must wait 7 days before withdrawing.
    uint256 public constant COOLDOWN = 7 days;
    /// @dev Fraction of each voucher's stake burned on slash (50%).
    uint256 public constant SLASH_FRACTION = 2;

    // ─── Storage ──────────────────────────────────────────────────────────────

    /// @notice The ERC-20 used for staking (USDT on Polygon).
    IERC20 public immutable stakeToken;

    /// @notice Addresses authorized to call slash() and recordDealComplete().
    mapping(address => bool) public authorized;

    /// @notice Vouch record: voucher → vouchee → info.
    struct VouchRecord {
        uint256 amount;    // USDT wei
        uint256 timestamp; // when vouchFor was called
        bool    active;    // false after withdrawal or full slash
    }
    mapping(address voucher => mapping(address vouchee => VouchRecord)) public vouches;

    /// @notice All vouchers for a given vouchee.
    mapping(address vouchee => address[]) private _vouchers;

    /// @notice Per-address stats (stored for gas efficiency in trust score reads).
    mapping(address => uint256) private _completedDeals;
    mapping(address => uint256) private _slashCount;
    mapping(address => uint256) private _totalStake; // sum of active stakes vouched FOR this address

    /// @notice All users who have ever received a vouch (for highTrustUsers enumeration).
    address[] private _allVouchees;
    mapping(address => bool) private _isVouchee;

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param _stakeToken USDT contract address on the deployment chain.
    /// @param _authorized Initial authorized callers (DealEscrow + DisputeJury).
    constructor(address _stakeToken, address[] memory _authorized) {
        stakeToken = IERC20(_stakeToken);
        for (uint256 i = 0; i < _authorized.length; i++) {
            authorized[_authorized[i]] = true;
        }
    }

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyAuthorized() {
        require(authorized[msg.sender], "ReputationRegistry: not authorized");
        _;
    }

    // ─── View: trust score ────────────────────────────────────────────────────

    /// @inheritdoc IReputationRegistry
    function trustScore(address user) external view override returns (uint256) {
        uint256 fromStake = _totalStake[user] / STAKE_DIVISOR;
        uint256 fromDeals = _completedDeals[user];
        uint256 penalty   = _slashCount[user] * SLASH_PENALTY;
        uint256 raw       = fromStake + fromDeals;
        return raw > penalty ? raw - penalty : 0;
    }

    /// @inheritdoc IReputationRegistry
    function getVouchInfo(address voucher, address vouchee)
        external
        view
        override
        returns (uint256 amount, uint256 timestamp, bool active)
    {
        VouchRecord storage r = vouches[voucher][vouchee];
        return (r.amount, r.timestamp, r.active);
    }

    /// @inheritdoc IReputationRegistry
    function getVouchers(address vouchee) external view override returns (address[] memory) {
        return _vouchers[vouchee];
    }

    /// @inheritdoc IReputationRegistry
    function completedDeals(address user) external view override returns (uint256) {
        return _completedDeals[user];
    }

    /// @inheritdoc IReputationRegistry
    function slashCount(address user) external view override returns (uint256) {
        return _slashCount[user];
    }

    /// @inheritdoc IReputationRegistry
    function totalVouchStake(address user) external view override returns (uint256) {
        return _totalStake[user];
    }

    /// @inheritdoc IReputationRegistry
    /// @dev O(n) over all vouchees — acceptable for testnet. For production, use
    ///      an off-chain indexer or a sorted on-chain structure.
    function highTrustUsers(uint256 minScore) external view override returns (address[] memory) {
        address[] memory temp = new address[](_allVouchees.length);
        uint256 count = 0;
        for (uint256 i = 0; i < _allVouchees.length; i++) {
            address u = _allVouchees[i];
            uint256 score = _scoreOf(u);
            if (score >= minScore) {
                temp[count++] = u;
            }
        }
        address[] memory result = new address[](count);
        for (uint256 i = 0; i < count; i++) {
            result[i] = temp[i];
        }
        return result;
    }

    // ─── Write: vouch ─────────────────────────────────────────────────────────

    /// @inheritdoc IReputationRegistry
    function vouchFor(address user, uint256 amount) external override {
        require(user != address(0), "ReputationRegistry: zero address");
        require(user != msg.sender, "ReputationRegistry: cannot vouch for yourself");
        require(amount > 0, "ReputationRegistry: amount must be > 0");

        VouchRecord storage r = vouches[msg.sender][user];

        if (r.active) {
            // Increase existing vouch
            r.amount += amount;
            r.timestamp = block.timestamp; // reset cooldown on top-up
        } else {
            vouches[msg.sender][user] = VouchRecord({ amount: amount, timestamp: block.timestamp, active: true });
            _vouchers[user].push(msg.sender);
        }

        _totalStake[user] += amount;

        if (!_isVouchee[user]) {
            _isVouchee[user] = true;
            _allVouchees.push(user);
        }

        require(stakeToken.transferFrom(msg.sender, address(this), amount), "ReputationRegistry: transfer failed");

        emit Vouched(msg.sender, user, amount, block.timestamp);
    }

    /// @inheritdoc IReputationRegistry
    function withdrawVouch(address user) external override {
        VouchRecord storage r = vouches[msg.sender][user];
        require(r.active, "ReputationRegistry: no active vouch");
        require(block.timestamp >= r.timestamp + COOLDOWN, "ReputationRegistry: cooldown not elapsed");

        uint256 amount = r.amount;
        r.active = false;
        r.amount = 0;

        _totalStake[user] -= amount;

        require(stakeToken.transfer(msg.sender, amount), "ReputationRegistry: transfer failed");

        emit VouchWithdrawn(msg.sender, user, amount, block.timestamp);
    }

    // ─── Write: authorized ────────────────────────────────────────────────────

    /// @inheritdoc IReputationRegistry
    /// @dev Slashes 50% of each active voucher's stake for `user`.
    ///      This creates real skin-in-the-game: vouching for a scammer is costly.
    function slash(address user) external override onlyAuthorized {
        address[] storage vouchers = _vouchers[user];
        for (uint256 i = 0; i < vouchers.length; i++) {
            VouchRecord storage r = vouches[vouchers[i]][user];
            if (!r.active) continue;

            uint256 slashAmt = r.amount / SLASH_FRACTION;
            if (slashAmt == 0) continue;

            r.amount -= slashAmt;
            _totalStake[user] -= slashAmt;

            // Burned (stays in contract) — in production, send to DAO treasury
            emit Slashed(user, vouchers[i], slashAmt);
        }
        _slashCount[user] += 1;
    }

    /// @inheritdoc IReputationRegistry
    function recordDealComplete(address user) external override onlyAuthorized {
        _completedDeals[user] += 1;
    }

    // ─── Admin ────────────────────────────────────────────────────────────────

    /// @notice Add or remove an authorized caller (only callable by existing authorized).
    function setAuthorized(address addr, bool status) external onlyAuthorized {
        authorized[addr] = status;
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _scoreOf(address user) internal view returns (uint256) {
        uint256 fromStake = _totalStake[user] / STAKE_DIVISOR;
        uint256 fromDeals = _completedDeals[user];
        uint256 penalty   = _slashCount[user] * SLASH_PENALTY;
        uint256 raw       = fromStake + fromDeals;
        return raw > penalty ? raw - penalty : 0;
    }
}
