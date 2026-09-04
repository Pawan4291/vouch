/**
 * useVouch — vouch staking / withdrawal via ReputationRegistry
 *
 * Writes to the contract via window.ethereum (Polygon Amoy).
 * Requires wallet connection and USDT approval before vouchFor().
 */

import { useState, useCallback } from 'react';
import { getWalletClient } from '../sdk/evmProvider';
import { CONTRACTS, VOUCH_COOLDOWN_SECONDS } from '../contracts/addresses';
import { REPUTATION_REGISTRY_ABI } from '../contracts/abis/ReputationRegistry';

// Minimal ERC-20 ABI for approve()
const ERC20_ABI = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
] as const;

export interface VouchState {
  isPending: boolean;
  txHash: string | null;
  error: string | null;
}

export function useVouch(callerAddress: `0x${string}` | null) {
  const [state, setState] = useState<VouchState>({
    isPending: false,
    txHash: null,
    error: null,
  });

  const reset = useCallback(() => {
    setState({ isPending: false, txHash: null, error: null });
  }, []);

  /**
   * Stake USDT to vouch for another address.
   * 1. Approve USDT transfer to ReputationRegistry
   * 2. Call vouchFor(user, amount)
   */
  const vouchFor = useCallback(
    async (vouchee: `0x${string}`, usdtAmount: bigint) => {
      if (!callerAddress) {
        setState((s) => ({ ...s, error: 'Wallet not connected' }));
        return;
      }
      setState({ isPending: true, txHash: null, error: null });

      try {
        const client = await getWalletClient();
        if (!client) throw new Error('No EVM wallet client');

        // Step 1: Approve USDT spend
        const { request: approveReq } = await (
          await import('../lib/rpc')
        ).publicClient.simulateContract({
          address: CONTRACTS.USDT,
          abi: ERC20_ABI,
          functionName: 'approve',
          args: [CONTRACTS.REPUTATION_REGISTRY, usdtAmount],
          account: callerAddress,
        });
        await client.writeContract(approveReq);

        // Step 2: Call vouchFor
        const { request: vouchReq } = await (
          await import('../lib/rpc')
        ).publicClient.simulateContract({
          address: CONTRACTS.REPUTATION_REGISTRY,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'vouchFor',
          args: [vouchee, usdtAmount],
          account: callerAddress,
        });
        const hash = await client.writeContract(vouchReq);

        setState({ isPending: false, txHash: hash, error: null });
      } catch (err) {
        setState({
          isPending: false,
          txHash: null,
          error: err instanceof Error ? err.message : 'Vouch transaction failed',
        });
      }
    },
    [callerAddress]
  );

  /**
   * Withdraw a vouch stake after the cooldown period.
   * Contract enforces the cooldown — this just calls withdrawVouch().
   * Cooldown: VOUCH_COOLDOWN_SECONDS (7 days, matches contract).
   */
  const withdrawVouch = useCallback(
    async (vouchee: `0x${string}`) => {
      if (!callerAddress) {
        setState((s) => ({ ...s, error: 'Wallet not connected' }));
        return;
      }
      setState({ isPending: true, txHash: null, error: null });

      try {
        const client = await getWalletClient();
        if (!client) throw new Error('No EVM wallet client');

        const { request } = await (
          await import('../lib/rpc')
        ).publicClient.simulateContract({
          address: CONTRACTS.REPUTATION_REGISTRY,
          abi: REPUTATION_REGISTRY_ABI,
          functionName: 'withdrawVouch',
          args: [vouchee],
          account: callerAddress,
        });

        const hash = await client.writeContract(request);
        setState({ isPending: false, txHash: hash, error: null });
      } catch (err) {
        setState({
          isPending: false,
          txHash: null,
          error: err instanceof Error ? err.message : 'Withdrawal failed',
        });
      }
    },
    [callerAddress]
  );

  return { ...state, vouchFor, withdrawVouch, reset, cooldownSeconds: VOUCH_COOLDOWN_SECONDS };
}
