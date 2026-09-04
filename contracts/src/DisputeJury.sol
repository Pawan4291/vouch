// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IReputationRegistry.sol";

interface IDealEscrow {
    function releaseFunds(uint256 dealId, bool releaseToSeller) external;
}

/// @title DisputeJury
/// @author Vouch
/// @notice Pseudo-random jury selection and voting for Vouch disputes.
///
/// RANDOMNESS DISCLAIMER:
///   Jury selection uses `block.prevrandao` (post-Merge RANDAO beacon value).
///   This is pseudo-random: a validator controlling block production could
///   theoretically bias the selection by re-proposing blocks. This is acceptable
///   for a testnet/hackathon deployment but NOT suitable for high-value mainnet
///   production use. For production, integrate Chainlink VRF or RANDAO commit-reveal.
///
/// Dispute lifecycle:
///   1. DealEscrow.raiseDispute() → calls openDispute(dealId)
///   2. Anyone calls selectJury(dealId) to randomly pick N jurors from
///      high-trust users in ReputationRegistry.
///   3. Each juror calls castVote(dealId, releaseToSeller).
///   4. Anyone calls resolve(dealId) once enough votes are cast (simple majority).
///   5. resolve() calls DealEscrow.releaseFunds() and optionally slash().
///
contract DisputeJury {
    // ─── Constants ────────────────────────────────────────────────────────────

    uint256 public constant JURY_SIZE      = 5;
    uint256 public constant MIN_TRUST      = 10;  // minimum trustScore to be a juror
    uint256 public constant VOTE_THRESHOLD = 3;   // majority of 5

    // ─── Types ────────────────────────────────────────────────────────────────

    struct Dispute {
        address[]           jurors;
        mapping(address => bool) voted;
        mapping(address => bool) isJuror;
        uint256             sellerVotes;
        uint256             buyerVotes;
        bool                resolved;
        bool                releaseToSeller;
        uint256             openedAt;
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    event DisputeOpened  (uint256 indexed dealId, uint256 timestamp);
    event JurySelected   (uint256 indexed dealId, address[] jurors);
    event VoteCast       (uint256 indexed dealId, address indexed juror, bool releaseToSeller);
    event DisputeResolved(uint256 indexed dealId, bool releaseToSeller, uint256 sellerVotes, uint256 buyerVotes);

    // ─── Storage ──────────────────────────────────────────────────────────────

    IReputationRegistry public immutable registry;
    IDealEscrow         public immutable escrow;

    mapping(uint256 => Dispute) private _disputes;
    uint256[] private _activeDisputeIds;
    mapping(uint256 => bool) private _isActive;

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _registry, address _escrow) {
        registry = IReputationRegistry(_registry);
        escrow   = IDealEscrow(_escrow);
    }

    // ─── Called by DealEscrow ─────────────────────────────────────────────────

    /// @notice Open a dispute for a deal. Only callable by DealEscrow.
    function openDispute(uint256 dealId) external {
        require(msg.sender == address(escrow), "DisputeJury: only escrow");
        Dispute storage d = _disputes[dealId];
        require(d.openedAt == 0, "DisputeJury: already open");
        d.openedAt = block.timestamp;

        if (!_isActive[dealId]) {
            _isActive[dealId] = true;
            _activeDisputeIds.push(dealId);
        }

        emit DisputeOpened(dealId, block.timestamp);
    }

    // ─── Public functions ─────────────────────────────────────────────────────

    /// @notice Select jury for a dispute. Callable by anyone — no trust required.
    ///
    /// Selection algorithm (PSEUDO-RANDOM — see contract header disclaimer):
    ///   1. Fetch all high-trust user addresses from ReputationRegistry.
    ///   2. Use block.prevrandao + dealId as a seed.
    ///   3. Fisher-Yates partial shuffle to pick JURY_SIZE jurors.
    ///
    function selectJury(uint256 dealId) external {
        Dispute storage d = _disputes[dealId];
        require(d.openedAt > 0, "DisputeJury: dispute not open");
        require(d.jurors.length == 0, "DisputeJury: jury already selected");

        address[] memory candidates = registry.highTrustUsers(MIN_TRUST);
        require(candidates.length >= JURY_SIZE, "DisputeJury: insufficient high-trust users");

        // Fisher-Yates partial shuffle using block.prevrandao as seed
        uint256 seed = uint256(keccak256(abi.encodePacked(block.prevrandao, dealId, block.timestamp)));
        uint256 n    = candidates.length;

        for (uint256 i = 0; i < JURY_SIZE; i++) {
            uint256 j = i + (seed % (n - i));
            seed = uint256(keccak256(abi.encodePacked(seed, i)));

            // Swap candidates[i] and candidates[j]
            address tmp   = candidates[i];
            candidates[i] = candidates[j];
            candidates[j] = tmp;

            d.jurors.push(candidates[i]);
            d.isJuror[candidates[i]] = true;
        }

        emit JurySelected(dealId, d.jurors);
    }

    /// @notice Cast a vote. Only callable by selected jurors, once per juror per dispute.
    function castVote(uint256 dealId, bool releaseToSeller) external {
        Dispute storage d = _disputes[dealId];
        require(d.isJuror[msg.sender], "DisputeJury: not a juror");
        require(!d.voted[msg.sender],  "DisputeJury: already voted");
        require(!d.resolved,           "DisputeJury: already resolved");

        d.voted[msg.sender] = true;

        if (releaseToSeller) {
            d.sellerVotes++;
        } else {
            d.buyerVotes++;
        }

        emit VoteCast(dealId, msg.sender, releaseToSeller);
    }

    /// @notice Resolve a dispute once majority threshold is reached.
    ///         Callable by anyone — incentivizes parties to trigger resolution.
    function resolve(uint256 dealId) external {
        Dispute storage d = _disputes[dealId];
        require(!d.resolved, "DisputeJury: already resolved");
        require(d.openedAt > 0, "DisputeJury: not open");

        bool releaseToSeller;
        bool hasWinner;

        if (d.sellerVotes >= VOTE_THRESHOLD) {
            releaseToSeller = true;
            hasWinner = true;
        } else if (d.buyerVotes >= VOTE_THRESHOLD) {
            releaseToSeller = false;
            hasWinner = true;
        }

        require(hasWinner, "DisputeJury: no majority yet");

        d.resolved        = true;
        d.releaseToSeller = releaseToSeller;

        // Release funds via DealEscrow (also triggers slash if buyer won)
        escrow.releaseFunds(dealId, releaseToSeller);

        emit DisputeResolved(dealId, releaseToSeller, d.sellerVotes, d.buyerVotes);
    }

    // ─── View functions ───────────────────────────────────────────────────────

    function getDispute(uint256 dealId)
        external
        view
        returns (
            address[] memory jurors,
            uint256 sellerVotes,
            uint256 buyerVotes,
            bool resolved,
            bool releaseToSeller,
            uint256 openedAt
        )
    {
        Dispute storage d = _disputes[dealId];
        return (d.jurors, d.sellerVotes, d.buyerVotes, d.resolved, d.releaseToSeller, d.openedAt);
    }

    function hasVoted(uint256 dealId, address juror) external view returns (bool) {
        return _disputes[dealId].voted[juror];
    }

    function isJuror(uint256 dealId, address addr) external view returns (bool) {
        return _disputes[dealId].isJuror[addr];
    }

    function activeDisputeIds() external view returns (uint256[] memory) {
        return _activeDisputeIds;
    }
}
