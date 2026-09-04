// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "./interfaces/IReputationRegistry.sol";

interface IERC20 {
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

interface IDisputeJury {
    function openDispute(uint256 dealId) external;
}

/// @title DealEscrow
/// @author Vouch
/// @notice On-chain escrow for Vouch marketplace deals.
///
/// Lifecycle:
///   Seller → createListing()     → ListingCreated event (feed source of truth)
///   Buyer  → joinDeal()          → USDT locked in escrow
///   Both   → markComplete()      → funds release when both confirm
///   Either → raiseDispute()      → jury selected, voting begins
///   Jury   → resolve()           → funds released + reputation updated
///
contract DealEscrow {
    // ─── Types ────────────────────────────────────────────────────────────────

    enum DealStatus {
        Active,          // 0 — buyer funded, awaiting completion
        SellerConfirmed, // 1 — seller marked complete
        BuyerConfirmed,  // 2 — buyer marked complete
        Completed,       // 3 — both confirmed, funds released
        Disputed,        // 4 — dispute raised, jury deciding
        Resolved         // 5 — jury resolved
    }

    struct Listing {
        address seller;
        uint256 price;       // USDT wei (6 decimals)
        string  metadataURI; // JSON: {title, description, tags}
        string  category;    // "gig" | "sale" | "task" | "service"
        bool    active;
        uint256 timestamp;
    }

    struct Deal {
        uint256    listingId;
        address    seller;
        address    buyer;
        uint256    amount;           // USDT locked
        DealStatus status;
        bool       sellerConfirmed;
        bool       buyerConfirmed;
        uint256    timestamp;
    }

    // ─── Events ───────────────────────────────────────────────────────────────

    /// @notice Emitted when a listing is created. This is the ONLY source of feed data.
    event ListingCreated(
        uint256 indexed listingId,
        address indexed seller,
        uint256 price,
        string metadataURI,
        uint256 timestamp,
        string category
    );

    event DealJoined(
        uint256 indexed dealId,
        uint256 indexed listingId,
        address indexed buyer,
        uint256 amount,
        uint256 timestamp
    );

    event CompletionMarked(uint256 indexed dealId, address indexed by);
    event DealCompleted(uint256 indexed dealId, address indexed seller, address indexed buyer, uint256 amount);
    event DisputeRaised(uint256 indexed dealId, address indexed raisedBy, uint256 timestamp);

    // ─── Storage ──────────────────────────────────────────────────────────────

    IERC20               public immutable usdt;
    IReputationRegistry  public immutable registry;
    IDisputeJury         public           disputeJury; // set post-deploy

    address public owner;

    uint256 public listingCount;
    uint256 public dealCount;

    mapping(uint256 => Listing)   public listings;
    mapping(uint256 => Deal)      public deals;
    mapping(uint256 => uint256[]) public listingDeals; // listingId → dealIds

    // ─── Constructor ──────────────────────────────────────────────────────────

    constructor(address _usdt, address _registry) {
        usdt     = IERC20(_usdt);
        registry = IReputationRegistry(_registry);
        owner    = msg.sender;
    }

    // ─── Owner functions ──────────────────────────────────────────────────────

    function setDisputeJury(address _jury) external {
        require(msg.sender == owner, "DealEscrow: not owner");
        disputeJury = IDisputeJury(_jury);
    }

    // ─── Listing functions ────────────────────────────────────────────────────

    /// @notice Create a new listing.
    ///         The emitted ListingCreated event is the only source of the feed UI.
    ///         No off-chain database is used.
    function createListing(uint256 price, string calldata metadataURI, string calldata category)
        external
        returns (uint256 listingId)
    {
        require(price > 0, "DealEscrow: price must be > 0");
        require(bytes(metadataURI).length > 0, "DealEscrow: empty metadata");

        listingId = ++listingCount;
        listings[listingId] = Listing({
            seller:      msg.sender,
            price:       price,
            metadataURI: metadataURI,
            category:    category,
            active:      true,
            timestamp:   block.timestamp
        });

        emit ListingCreated(listingId, msg.sender, price, metadataURI, block.timestamp, category);
    }

    // ─── Deal functions ───────────────────────────────────────────────────────

    /// @notice Join a deal as buyer — locks price amount of USDT into escrow.
    ///         Caller must have approved this contract to spend `listings[listingId].price` USDT.
    function joinDeal(uint256 listingId) external returns (uint256 dealId) {
        Listing storage l = listings[listingId];
        require(l.active, "DealEscrow: listing not active");
        require(l.seller != msg.sender, "DealEscrow: seller cannot be buyer");

        dealId = ++dealCount;
        deals[dealId] = Deal({
            listingId:       listingId,
            seller:          l.seller,
            buyer:           msg.sender,
            amount:          l.price,
            status:          DealStatus.Active,
            sellerConfirmed: false,
            buyerConfirmed:  false,
            timestamp:       block.timestamp
        });
        listingDeals[listingId].push(dealId);
        l.active = false; // one buyer per listing (re-listing possible)

        require(usdt.transferFrom(msg.sender, address(this), l.price), "DealEscrow: transfer failed");

        emit DealJoined(dealId, listingId, msg.sender, l.price, block.timestamp);
    }

    /// @notice Both parties must call this to release funds.
    ///         Funds release automatically on the second call.
    function markComplete(uint256 dealId) external {
        Deal storage d = deals[dealId];
        require(d.status == DealStatus.Active || d.status == DealStatus.SellerConfirmed || d.status == DealStatus.BuyerConfirmed,
            "DealEscrow: deal not in completable state");
        require(msg.sender == d.seller || msg.sender == d.buyer, "DealEscrow: not a party");

        emit CompletionMarked(dealId, msg.sender);

        if (msg.sender == d.seller) {
            d.sellerConfirmed = true;
            d.status = d.buyerConfirmed ? DealStatus.Completed : DealStatus.SellerConfirmed;
        } else {
            d.buyerConfirmed = true;
            d.status = d.sellerConfirmed ? DealStatus.Completed : DealStatus.BuyerConfirmed;
        }

        if (d.status == DealStatus.Completed) {
            _releaseFunds(dealId, true); // release to seller
        }
    }

    /// @notice Raise a dispute — freezes fund release, opens jury process.
    function raiseDispute(uint256 dealId) external {
        Deal storage d = deals[dealId];
        require(
            d.status == DealStatus.Active ||
            d.status == DealStatus.SellerConfirmed ||
            d.status == DealStatus.BuyerConfirmed,
            "DealEscrow: cannot dispute"
        );
        require(msg.sender == d.seller || msg.sender == d.buyer, "DealEscrow: not a party");

        d.status = DealStatus.Disputed;
        require(address(disputeJury) != address(0), "DealEscrow: jury not set");
        disputeJury.openDispute(dealId);

        emit DisputeRaised(dealId, msg.sender, block.timestamp);
    }

    /// @notice Release funds — called by DisputeJury after resolution.
    function releaseFunds(uint256 dealId, bool releaseToSeller) external {
        require(msg.sender == address(disputeJury), "DealEscrow: only jury");
        Deal storage d = deals[dealId];
        require(d.status == DealStatus.Disputed, "DealEscrow: not disputed");
        d.status = DealStatus.Resolved;
        _releaseFunds(dealId, releaseToSeller);
    }

    // ─── Read functions ───────────────────────────────────────────────────────

    function getListing(uint256 listingId)
        external
        view
        returns (address seller, uint256 price, string memory metadataURI, string memory category, bool active, uint256 timestamp)
    {
        Listing storage l = listings[listingId];
        return (l.seller, l.price, l.metadataURI, l.category, l.active, l.timestamp);
    }

    function getDeal(uint256 dealId)
        external
        view
        returns (
            uint256 listingId, address seller, address buyer, uint256 amount,
            uint8 status, bool sellerConfirmed, bool buyerConfirmed, uint256 timestamp
        )
    {
        Deal storage d = deals[dealId];
        return (d.listingId, d.seller, d.buyer, d.amount, uint8(d.status), d.sellerConfirmed, d.buyerConfirmed, d.timestamp);
    }

    function getDealsForListing(uint256 listingId) external view returns (uint256[] memory) {
        return listingDeals[listingId];
    }

    // ─── Internal ─────────────────────────────────────────────────────────────

    function _releaseFunds(uint256 dealId, bool releaseToSeller) internal {
        Deal storage d = deals[dealId];
        uint256 amount = d.amount;
        address recipient = releaseToSeller ? d.seller : d.buyer;

        require(usdt.transfer(recipient, amount), "DealEscrow: release failed");

        if (releaseToSeller) {
            registry.recordDealComplete(d.seller);
            registry.recordDealComplete(d.buyer);
        } else {
            // Buyer won dispute → seller scammed → slash seller's vouchers
            registry.slash(d.seller);
        }

        emit DealCompleted(dealId, d.seller, d.buyer, amount);
    }
}
