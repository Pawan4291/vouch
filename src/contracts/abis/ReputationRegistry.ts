/**
 * ReputationRegistry ABI
 * Generated from: contracts/src/ReputationRegistry.sol
 * Deployed on Polygon Amoy — see contracts/addresses.ts
 */
export const REPUTATION_REGISTRY_ABI = [
  // ─── Events ────────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'Vouched',
    inputs: [
      { name: 'voucher',  type: 'address', indexed: true },
      { name: 'vouchee',  type: 'address', indexed: true },
      { name: 'amount',   type: 'uint256', indexed: false },
      { name: 'timestamp',type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Slashed',
    inputs: [
      { name: 'user',    type: 'address', indexed: true },
      { name: 'voucher', type: 'address', indexed: true },
      { name: 'amount',  type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'VouchWithdrawn',
    inputs: [
      { name: 'voucher',   type: 'address', indexed: true },
      { name: 'vouchee',  type: 'address', indexed: true },
      { name: 'amount',   type: 'uint256', indexed: false },
      { name: 'timestamp',type: 'uint256', indexed: false },
    ],
  },
  // ─── Read functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'trustScore',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'getVouchInfo',
    stateMutability: 'view',
    inputs: [
      { name: 'voucher', type: 'address' },
      { name: 'vouchee', type: 'address' },
    ],
    outputs: [
      { name: 'amount',    type: 'uint256' },
      { name: 'timestamp', type: 'uint256' },
      { name: 'active',    type: 'bool'    },
    ],
  },
  {
    type: 'function',
    name: 'getVouchers',
    stateMutability: 'view',
    inputs: [{ name: 'vouchee', type: 'address' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  {
    type: 'function',
    name: 'completedDeals',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'slashCount',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'totalVouchStake',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'highTrustUsers',
    stateMutability: 'view',
    inputs: [{ name: 'minScore', type: 'uint256' }],
    outputs: [{ name: '', type: 'address[]' }],
  },
  // ─── Write functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'vouchFor',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user',   type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'withdrawVouch',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'slash',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'recordDealComplete',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
] as const;
