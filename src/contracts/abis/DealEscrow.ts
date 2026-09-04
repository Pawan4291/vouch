/**
 * DealEscrow ABI
 * Generated from: contracts/src/DealEscrow.sol
 * Deployed on Polygon Amoy — see contracts/addresses.ts
 */
export const DEAL_ESCROW_ABI = [
  // ─── Events ────────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'ListingCreated',
    inputs: [
      { name: 'listingId',   type: 'uint256', indexed: true  },
      { name: 'seller',      type: 'address', indexed: true  },
      { name: 'price',       type: 'uint256', indexed: false },
      { name: 'metadataURI', type: 'string',  indexed: false },
      { name: 'timestamp',   type: 'uint256', indexed: false },
      { name: 'category',    type: 'string',  indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DealJoined',
    inputs: [
      { name: 'dealId',    type: 'uint256', indexed: true  },
      { name: 'listingId', type: 'uint256', indexed: true  },
      { name: 'buyer',     type: 'address', indexed: true  },
      { name: 'amount',    type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DealCompleted',
    inputs: [
      { name: 'dealId',    type: 'uint256', indexed: true },
      { name: 'seller',    type: 'address', indexed: true },
      { name: 'buyer',     type: 'address', indexed: true },
      { name: 'amount',    type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DisputeRaised',
    inputs: [
      { name: 'dealId',   type: 'uint256', indexed: true  },
      { name: 'raisedBy', type: 'address', indexed: true  },
      { name: 'timestamp',type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'CompletionMarked',
    inputs: [
      { name: 'dealId', type: 'uint256', indexed: true },
      { name: 'by',     type: 'address', indexed: true },
    ],
  },
  // ─── Read functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'getListing',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [
      { name: 'seller',      type: 'address' },
      { name: 'price',       type: 'uint256' },
      { name: 'metadataURI', type: 'string'  },
      { name: 'category',    type: 'string'  },
      { name: 'active',      type: 'bool'    },
      { name: 'timestamp',   type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'getDeal',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [
      { name: 'listingId',       type: 'uint256' },
      { name: 'seller',          type: 'address' },
      { name: 'buyer',           type: 'address' },
      { name: 'amount',          type: 'uint256' },
      { name: 'status',          type: 'uint8'   }, // 0=Active 1=SellerComplete 2=BuyerComplete 3=Completed 4=Disputed 5=Resolved
      { name: 'sellerConfirmed', type: 'bool'    },
      { name: 'buyerConfirmed',  type: 'bool'    },
      { name: 'timestamp',       type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'listingCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'dealCount',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getDealsForListing',
    stateMutability: 'view',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  // ─── Write functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'createListing',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'price',       type: 'uint256' },
      { name: 'metadataURI', type: 'string'  },
      { name: 'category',    type: 'string'  },
    ],
    outputs: [{ name: 'listingId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'joinDeal',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'listingId', type: 'uint256' }],
    outputs: [{ name: 'dealId', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'markComplete',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'raiseDispute',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'releaseFunds',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId',         type: 'uint256' },
      { name: 'releaseToSeller',type: 'bool'    },
    ],
    outputs: [],
  },
] as const;
