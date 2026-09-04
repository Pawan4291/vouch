/**
 * Vouch – read-only viem public client for Polygon Amoy
 *
 * This client reads chain state (getLogs, getContractEvents, readContract)
 * WITHOUT requiring a connected wallet. It uses the public Amoy RPC endpoint
 * so the feed loads immediately on page open, before any wallet interaction.
 *
 * RPC: https://polygon-amoy.drpc.org  (Polygon Amoy, chainId 80002)
 * Source: https://docs.polygon.technology/pos/reference/rpc-endpoints
 */

import { createPublicClient, http } from 'viem';
import { polygonAmoy } from 'viem/chains';
import { DEAL_ESCROW_ABI } from '../contracts/abis/DealEscrow';
import { REPUTATION_REGISTRY_ABI } from '../contracts/abis/ReputationRegistry';
import { DISPUTE_JURY_ABI } from '../contracts/abis/DisputeJury';
import { CONTRACTS } from '../contracts/addresses';

// ─── Public read-only client ─────────────────────────────────────────────────

export const publicClient = createPublicClient({
  chain: polygonAmoy,
  transport: http('https://polygon-amoy.drpc.org', {
    retryCount: 3,
    timeout: 30_000,
  }),
});

// ─── Type definitions matching contract events ────────────────────────────────

export interface ChainListing {
  listingId: bigint;
  seller: `0x${string}`;
  price: bigint;         // in USDT wei (6 decimals)
  metadataURI: string;  // JSON stored on IPFS or inline
  category: string;
  timestamp: bigint;
  blockNumber: bigint;
}

export interface ParsedListingMeta {
  title: string;
  description: string;
  tags: string[];
}

export interface ChainDeal {
  dealId: bigint;
  listingId: bigint;
  buyer: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
}

export interface ChainVouch {
  voucher: `0x${string}`;
  vouchee: `0x${string}`;
  amount: bigint;
  timestamp: bigint;
}

// ─── Listing event fetcher ────────────────────────────────────────────────────

/**
 * Fetch all `ListingCreated` events from DealEscrow.
 * This is the ONLY source of listing data — no backend, no static array.
 * Returns empty array when the contract has no listings (not sample data).
 */
export async function fetchListings(
  fromBlock: bigint = 0n,
  toBlock: bigint | 'latest' = 'latest'
): Promise<ChainListing[]> {
  try {
    const logs = await publicClient.getContractEvents({
      address: CONTRACTS.DEAL_ESCROW,
      abi: DEAL_ESCROW_ABI,
      eventName: 'ListingCreated',
      fromBlock,
      toBlock,
    });

    return logs.map((log) => ({
      listingId: log.args.listingId ?? 0n,
      seller: (log.args.seller ?? '0x0') as `0x${string}`,
      price: log.args.price ?? 0n,
      metadataURI: log.args.metadataURI ?? '',
      category: log.args.category ?? '',
      timestamp: log.args.timestamp ?? 0n,
      blockNumber: log.blockNumber ?? 0n,
    }));
  } catch {
    // Contract not yet deployed or network unavailable — return empty, not fake data
    return [];
  }
}

/**
 * Try to parse metadataURI as inline JSON for title/description/tags.
 * Falls back gracefully to URI string if not JSON.
 */
export function parseListingMeta(metadataURI: string): ParsedListingMeta {
  try {
    const parsed = JSON.parse(metadataURI);
    return {
      title: parsed.title ?? 'Untitled',
      description: parsed.description ?? '',
      tags: Array.isArray(parsed.tags) ? parsed.tags : [],
    };
  } catch {
    return {
      title: metadataURI.slice(0, 60) || 'Untitled',
      description: '',
      tags: [],
    };
  }
}

// ─── Trust score reader ───────────────────────────────────────────────────────

/** Read the trust score directly from ReputationRegistry. Never faked. */
export async function readTrustScore(address: `0x${string}`): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: CONTRACTS.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'trustScore',
      args: [address],
    });
  } catch {
    return 0n;
  }
}

/** Read completed deal count. */
export async function readCompletedDeals(address: `0x${string}`): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: CONTRACTS.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'completedDeals',
      args: [address],
    });
  } catch {
    return 0n;
  }
}

/** Read slash count. */
export async function readSlashCount(address: `0x${string}`): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: CONTRACTS.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'slashCount',
      args: [address],
    });
  } catch {
    return 0n;
  }
}

/** Read total USDT staked on behalf of a user (sum of all active vouches). */
export async function readTotalVouchStake(address: `0x${string}`): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: CONTRACTS.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      functionName: 'totalVouchStake',
      args: [address],
    });
  } catch {
    return 0n;
  }
}

// ─── Vouch event fetcher ──────────────────────────────────────────────────────

/** Fetch all Vouched events for a specific vouchee address. */
export async function fetchVouchesForUser(
  vouchee: `0x${string}`
): Promise<ChainVouch[]> {
  try {
    const logs = await publicClient.getContractEvents({
      address: CONTRACTS.REPUTATION_REGISTRY,
      abi: REPUTATION_REGISTRY_ABI,
      eventName: 'Vouched',
      args: { vouchee },
      fromBlock: 0n,
      toBlock: 'latest',
    });

    return logs.map((log) => ({
      voucher: (log.args.voucher ?? '0x0') as `0x${string}`,
      vouchee: (log.args.vouchee ?? '0x0') as `0x${string}`,
      amount: log.args.amount ?? 0n,
      timestamp: log.args.timestamp ?? 0n,
    }));
  } catch {
    return [];
  }
}

// ─── Deal fetcher ─────────────────────────────────────────────────────────────

/** Fetch DealJoined events for a listing. */
export async function fetchDealsForListing(
  listingId: bigint
): Promise<ChainDeal[]> {
  try {
    const logs = await publicClient.getContractEvents({
      address: CONTRACTS.DEAL_ESCROW,
      abi: DEAL_ESCROW_ABI,
      eventName: 'DealJoined',
      args: { listingId },
      fromBlock: 0n,
      toBlock: 'latest',
    });

    return logs.map((log) => ({
      dealId: log.args.dealId ?? 0n,
      listingId: log.args.listingId ?? 0n,
      buyer: (log.args.buyer ?? '0x0') as `0x${string}`,
      amount: log.args.amount ?? 0n,
      timestamp: log.args.timestamp ?? 0n,
    }));
  } catch {
    return [];
  }
}

/** Read a single deal's state from the contract. */
export async function readDeal(dealId: bigint) {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.DEAL_ESCROW,
      abi: DEAL_ESCROW_ABI,
      functionName: 'getDeal',
      args: [dealId],
    });
    return result;
  } catch {
    return null;
  }
}

/** Read a single listing from the contract. */
export async function readListing(listingId: bigint) {
  try {
    return await publicClient.readContract({
      address: CONTRACTS.DEAL_ESCROW,
      abi: DEAL_ESCROW_ABI,
      functionName: 'getListing',
      args: [listingId],
    });
  } catch {
    return null;
  }
}

// ─── Dispute reader ───────────────────────────────────────────────────────────

/** Read dispute state for a deal. */
export async function readDispute(dealId: bigint) {
  try {
    return await publicClient.readContract({
      address: CONTRACTS.DISPUTE_JURY,
      abi: DISPUTE_JURY_ABI,
      functionName: 'getDispute',
      args: [dealId],
    });
  } catch {
    return null;
  }
}

/** Check if an address is a juror for a deal. */
export async function readIsJuror(dealId: bigint, addr: `0x${string}`): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: CONTRACTS.DISPUTE_JURY,
      abi: DISPUTE_JURY_ABI,
      functionName: 'isJuror',
      args: [dealId, addr],
    });
  } catch {
    return false;
  }
}

/** Fetch all active dispute IDs. */
export async function fetchActiveDisputeIds(): Promise<bigint[]> {
  try {
    const result = await publicClient.readContract({
      address: CONTRACTS.DISPUTE_JURY,
      abi: DISPUTE_JURY_ABI,
      functionName: 'activeDisputeIds',
      args: [],
    });
    return result as bigint[];
  } catch {
    return [];
  }
}

// ─── Utility ──────────────────────────────────────────────────────────────────

/** Format USDT amount (6 decimals) as readable string. */
export function formatUsdt(wei: bigint): string {
  const usdt = Number(wei) / 1_000_000;
  return usdt.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Shorten an EVM address for display. */
export function shortAddr(addr: string): string {
  if (!addr || addr.length < 10) return addr;
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

/** Format a Unix timestamp as readable date string. */
export function formatTimestamp(ts: bigint): string {
  return new Date(Number(ts) * 1000).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
