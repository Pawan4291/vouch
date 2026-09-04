/**
 * DisputeJury ABI
 * Generated from: contracts/src/DisputeJury.sol
 * Deployed on Polygon Amoy — see contracts/addresses.ts
 */
export const DISPUTE_JURY_ABI = [
  // ─── Events ────────────────────────────────────────────────────────────────
  {
    type: 'event',
    name: 'DisputeOpened',
    inputs: [
      { name: 'dealId',    type: 'uint256', indexed: true  },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'JurySelected',
    inputs: [
      { name: 'dealId', type: 'uint256',   indexed: true  },
      { name: 'jurors', type: 'address[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'VoteCast',
    inputs: [
      { name: 'dealId',          type: 'uint256', indexed: true  },
      { name: 'juror',           type: 'address', indexed: true  },
      { name: 'releaseToSeller', type: 'bool',    indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'DisputeResolved',
    inputs: [
      { name: 'dealId',          type: 'uint256', indexed: true  },
      { name: 'releaseToSeller', type: 'bool',    indexed: false },
      { name: 'sellerVotes',     type: 'uint256', indexed: false },
      { name: 'buyerVotes',      type: 'uint256', indexed: false },
    ],
  },
  // ─── Read functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'getDispute',
    stateMutability: 'view',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [
      { name: 'jurors',          type: 'address[]' },
      { name: 'sellerVotes',     type: 'uint256'   },
      { name: 'buyerVotes',      type: 'uint256'   },
      { name: 'resolved',        type: 'bool'       },
      { name: 'releaseToSeller', type: 'bool'       },
      { name: 'openedAt',        type: 'uint256'    },
    ],
  },
  {
    type: 'function',
    name: 'hasVoted',
    stateMutability: 'view',
    inputs: [
      { name: 'dealId', type: 'uint256' },
      { name: 'juror',  type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'isJuror',
    stateMutability: 'view',
    inputs: [
      { name: 'dealId', type: 'uint256' },
      { name: 'addr',   type: 'address' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'activeDisputeIds',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256[]' }],
  },
  // ─── Write functions ────────────────────────────────────────────────────────
  {
    type: 'function',
    name: 'openDispute',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'selectJury',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'castVote',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'dealId',          type: 'uint256' },
      { name: 'releaseToSeller', type: 'bool'    },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'resolve',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'dealId', type: 'uint256' }],
    outputs: [],
  },
] as const;
