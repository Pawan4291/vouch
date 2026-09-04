/**
 * useTrustScore — reads live trust score data from ReputationRegistry
 *
 * All values come from actual contract reads via the public Amoy RPC client.
 * No hardcoded defaults, no Math.random(), no fake scores.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  readTrustScore,
  readCompletedDeals,
  readSlashCount,
  readTotalVouchStake,
  fetchVouchesForUser,
  type ChainVouch,
} from '../lib/rpc';

export interface TrustScoreData {
  score: bigint;
  completedDeals: bigint;
  slashCount: bigint;
  totalVouchStake: bigint; // USDT wei staked by others on this user
  vouches: ChainVouch[];   // individual vouch records
  isLoading: boolean;
  error: string | null;
}

const INITIAL: TrustScoreData = {
  score: 0n,
  completedDeals: 0n,
  slashCount: 0n,
  totalVouchStake: 0n,
  vouches: [],
  isLoading: false,
  error: null,
};

export function useTrustScore(address: `0x${string}` | null): TrustScoreData & { refresh: () => void } {
  const [data, setData] = useState<TrustScoreData>(INITIAL);

  const fetch = useCallback(async () => {
    if (!address) {
      setData(INITIAL);
      return;
    }

    setData((d) => ({ ...d, isLoading: true, error: null }));

    try {
      const [score, completed, slashes, stake, vouches] = await Promise.all([
        readTrustScore(address),
        readCompletedDeals(address),
        readSlashCount(address),
        readTotalVouchStake(address),
        fetchVouchesForUser(address),
      ]);

      setData({
        score,
        completedDeals: completed,
        slashCount: slashes,
        totalVouchStake: stake,
        vouches,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setData((d) => ({
        ...d,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load trust data',
      }));
    }
  }, [address]);

  useEffect(() => {
    fetch();
    // Refresh every 30 seconds to pick up on-chain changes
    const interval = setInterval(fetch, 30_000);
    return () => clearInterval(interval);
  }, [fetch]);

  return { ...data, refresh: fetch };
}
