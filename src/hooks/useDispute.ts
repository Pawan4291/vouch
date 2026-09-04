/**
 * useDispute — jury voting and dispute resolution via DisputeJury
 *
 * Only renders the voting UI for addresses that are actually selected jurors.
 * Reads jury selection, vote counts, and resolution status from the chain.
 */

import { useState, useEffect, useCallback } from 'react';
import { publicClient } from '../lib/rpc';
import { CONTRACTS } from '../contracts/addresses';
import { DISPUTE_JURY_ABI } from '../contracts/abis/DisputeJury';
import { getWalletClient } from '../sdk/evmProvider';

export interface DisputeData {
  jurors: `0x${string}`[];
  sellerVotes: bigint;
  buyerVotes: bigint;
  resolved: boolean;
  releaseToSeller: boolean;
  openedAt: bigint;
  isJuror: boolean;
  hasVoted: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface DisputeActions {
  castVote: (releaseToSeller: boolean) => Promise<void>;
  resolve: () => Promise<void>;
  selectJury: () => Promise<void>;
  refresh: () => void;
  txHash: string | null;
  isPending: boolean;
}

export function useDispute(
  dealId: bigint | null,
  callerAddress: `0x${string}` | null
): DisputeData & DisputeActions {
  const [data, setData] = useState<DisputeData>({
    jurors: [],
    sellerVotes: 0n,
    buyerVotes: 0n,
    resolved: false,
    releaseToSeller: false,
    openedAt: 0n,
    isJuror: false,
    hasVoted: false,
    isLoading: false,
    error: null,
  });
  const [txHash, setTxHash] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const load = useCallback(async () => {
    if (!dealId) return;
    setData((d) => ({ ...d, isLoading: true, error: null }));

    try {
      const [dispute, isJurorResult, hasVotedResult] = await Promise.all([
        publicClient.readContract({
          address: CONTRACTS.DISPUTE_JURY,
          abi: DISPUTE_JURY_ABI,
          functionName: 'getDispute',
          args: [dealId],
        }),
        callerAddress
          ? publicClient.readContract({
              address: CONTRACTS.DISPUTE_JURY,
              abi: DISPUTE_JURY_ABI,
              functionName: 'isJuror',
              args: [dealId, callerAddress],
            })
          : Promise.resolve(false),
        callerAddress
          ? publicClient.readContract({
              address: CONTRACTS.DISPUTE_JURY,
              abi: DISPUTE_JURY_ABI,
              functionName: 'hasVoted',
              args: [dealId, callerAddress],
            })
          : Promise.resolve(false),
      ]);

      const [jurors, sellerVotes, buyerVotes, resolved, releaseToSeller, openedAt] = dispute as [
        `0x${string}`[],
        bigint,
        bigint,
        boolean,
        boolean,
        bigint,
      ];

      setData({
        jurors,
        sellerVotes,
        buyerVotes,
        resolved,
        releaseToSeller,
        openedAt,
        isJuror: isJurorResult as boolean,
        hasVoted: hasVotedResult as boolean,
        isLoading: false,
        error: null,
      });
    } catch (err) {
      setData((d) => ({
        ...d,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load dispute',
      }));
    }
  }, [dealId, callerAddress]);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10_000);
    return () => clearInterval(interval);
  }, [load]);

  const write = useCallback(
    async (fn: () => Promise<`0x${string}`>) => {
      setIsPending(true);
      setTxHash(null);
      try {
        const hash = await fn();
        setTxHash(hash);
        setTimeout(load, 3000);
      } catch (err) {
        setData((d) => ({
          ...d,
          error: err instanceof Error ? err.message : 'Transaction failed',
        }));
      } finally {
        setIsPending(false);
      }
    },
    [load]
  );

  const castVote = useCallback(
    async (releaseToSeller: boolean) => {
      if (!dealId || !callerAddress) return;
      await write(async () => {
        const client = await getWalletClient();
        if (!client) throw new Error('No wallet');
        const { request } = await publicClient.simulateContract({
          address: CONTRACTS.DISPUTE_JURY,
          abi: DISPUTE_JURY_ABI,
          functionName: 'castVote',
          args: [dealId, releaseToSeller],
          account: callerAddress,
        });
        return client.writeContract(request);
      });
    },
    [dealId, callerAddress, write]
  );

  const resolve = useCallback(async () => {
    if (!dealId || !callerAddress) return;
    await write(async () => {
      const client = await getWalletClient();
      if (!client) throw new Error('No wallet');
      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.DISPUTE_JURY,
        abi: DISPUTE_JURY_ABI,
        functionName: 'resolve',
        args: [dealId],
        account: callerAddress,
      });
      return client.writeContract(request);
    });
  }, [dealId, callerAddress, write]);

  const selectJury = useCallback(async () => {
    if (!dealId || !callerAddress) return;
    await write(async () => {
      const client = await getWalletClient();
      if (!client) throw new Error('No wallet');
      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.DISPUTE_JURY,
        abi: DISPUTE_JURY_ABI,
        functionName: 'selectJury',
        args: [dealId],
        account: callerAddress,
      });
      return client.writeContract(request);
    });
  }, [dealId, callerAddress, write]);

  return { ...data, castVote, resolve, selectJury, refresh: load, txHash, isPending };
}
