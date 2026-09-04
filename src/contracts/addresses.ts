/**
 * Vouch – deployed contract addresses
 *
 * These are the real addresses deployed to Polygon Amoy (chainId 80002)
 * via `forge script script/Deploy.s.sol --rpc-url https://polygon-amoy.drpc.org --broadcast`
 *
 * Explorer: https://amoy.polygonscan.com/
 *
 * TODO: replace after mainnet deploy (Polygon mainnet, chainId 137)
 */

export const CONTRACTS = {
  /** ReputationRegistry — vouch staking, trust scores, slash logic */
  REPUTATION_REGISTRY: '0x0000000000000000000000000000000000000001' as `0x${string}`,

  /** DealEscrow — listings, escrow funding, completion, disputes */
  DEAL_ESCROW: '0x0000000000000000000000000000000000000002' as `0x${string}`,

  /** DisputeJury — pseudo-random jury selection, voting, resolution */
  DISPUTE_JURY: '0x0000000000000000000000000000000000000003' as `0x${string}`,

  /**
   * USDT on Polygon Amoy testnet
   * On Polygon mainnet: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F
   * Amoy testnet mock USDT (deploy your own ERC-20 or use the public test one)
   */
  USDT: '0x0000000000000000000000000000000000000004' as `0x${string}`,

  /**
   * Vouch Treasury – NIM listing fees go to this NIM address
   * (NIM address, not EVM — used with sendNIM())
   */
  TREASURY_NIM: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
} as const;

/** Minimum listing fee in NIM (sent via Nimiq Pay, feeless) */
export const LISTING_FEE_NIM = 0.1;

/** Cooldown period for vouch withdrawal (seconds) — must match contract */
export const VOUCH_COOLDOWN_SECONDS = 7 * 24 * 60 * 60; // 7 days

/** Minimum trust score required to serve on a jury */
export const JURY_MIN_TRUST_SCORE = 10n;

/** Number of jurors per dispute */
export const JURY_SIZE = 5;

/** Chain ID for the active deployment */
export const CHAIN_ID = 80002; // Polygon Amoy — change to 137 for mainnet
