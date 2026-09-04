/**
 * useWallet — unified wallet state hook for Vouch
 *
 * Manages both the NIM provider (Nimiq Mini App SDK) and the EVM provider
 * (window.ethereum → Polygon) in a single React state object.
 *
 * Rules:
 * - If neither provider is available → show "not connected" state
 * - Never fake a connected wallet; every value comes from a real provider call
 */

import { useState, useEffect, useCallback } from 'react';
import { initNimiq, getNimAddress, getNimBalance, lunaToNim } from '../sdk/nimiqMiniApp';
import {
  connectEvm,
  getEvmAccounts,
  getChainId,
  switchToAmoy,
  onAccountsChanged,
  onChainChanged,
  hasEvmProvider,
  EXPECTED_CHAIN_ID,
} from '../sdk/evmProvider';

export interface WalletState {
  // EVM
  evmAddress: `0x${string}` | null;
  chainId: number | null;
  isCorrectChain: boolean;
  isEvmConnected: boolean;
  // NIM
  nimAddress: string | null;
  nimBalance: number | null; // in NIM
  isNimConnected: boolean;
  // General
  isConnecting: boolean;
  error: string | null;
}

const INITIAL: WalletState = {
  evmAddress: null,
  chainId: null,
  isCorrectChain: false,
  isEvmConnected: false,
  nimAddress: null,
  nimBalance: null,
  isNimConnected: false,
  isConnecting: false,
  error: null,
};

export function useWallet() {
  const [state, setState] = useState<WalletState>(INITIAL);

  // ── EVM: auto-detect already-connected accounts on mount ─────────────────

  const refreshEvm = useCallback(async () => {
    const accounts = await getEvmAccounts();
    const chainId = await getChainId();
    if (accounts.length > 0) {
      setState((s) => ({
        ...s,
        evmAddress: accounts[0],
        chainId,
        isCorrectChain: chainId === EXPECTED_CHAIN_ID,
        isEvmConnected: true,
      }));
    } else {
      setState((s) => ({
        ...s,
        evmAddress: null,
        chainId,
        isCorrectChain: chainId === EXPECTED_CHAIN_ID,
        isEvmConnected: false,
      }));
    }
  }, []);

  // ── NIM: auto-detect on mount ─────────────────────────────────────────────

  const refreshNim = useCallback(async () => {
    try {
      const nim = await initNimiq();
      if (!nim) return;
      const [addr, balanceLuna] = await Promise.all([getNimAddress(), getNimBalance()]);
      setState((s) => ({
        ...s,
        nimAddress: addr,
        nimBalance: balanceLuna !== null ? lunaToNim(balanceLuna) : null,
        isNimConnected: !!addr,
      }));
    } catch {
      // Outside Nimiq Pay — silently stay disconnected
    }
  }, []);

  useEffect(() => {
    refreshEvm();
    refreshNim();

    // Listen for account / chain changes from the EVM provider
    const unsubAccounts = onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        setState((s) => ({ ...s, evmAddress: null, isEvmConnected: false }));
      } else {
        setState((s) => ({
          ...s,
          evmAddress: accounts[0] as `0x${string}`,
          isEvmConnected: true,
        }));
      }
    });

    const unsubChain = onChainChanged((chainIdHex) => {
      const id = parseInt(chainIdHex, 16);
      setState((s) => ({ ...s, chainId: id, isCorrectChain: id === EXPECTED_CHAIN_ID }));
    });

    return () => {
      unsubAccounts();
      unsubChain();
    };
  }, [refreshEvm, refreshNim]);

  // ── Connect EVM ───────────────────────────────────────────────────────────

  const connectEvmWallet = useCallback(async () => {
    if (!hasEvmProvider()) {
      setState((s) => ({
        ...s,
        error: 'No EVM provider found. Open this app inside Nimiq Pay.',
      }));
      return;
    }

    setState((s) => ({ ...s, isConnecting: true, error: null }));
    try {
      const addr = await connectEvm();
      const chainId = await getChainId();

      if (chainId !== EXPECTED_CHAIN_ID) {
        await switchToAmoy();
        const newChainId = await getChainId();
        setState((s) => ({
          ...s,
          evmAddress: addr,
          chainId: newChainId,
          isCorrectChain: newChainId === EXPECTED_CHAIN_ID,
          isEvmConnected: !!addr,
          isConnecting: false,
        }));
      } else {
        setState((s) => ({
          ...s,
          evmAddress: addr,
          chainId,
          isCorrectChain: true,
          isEvmConnected: !!addr,
          isConnecting: false,
        }));
      }
    } catch (err) {
      setState((s) => ({
        ...s,
        isConnecting: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      }));
    }
  }, []);

  // ── Switch chain ──────────────────────────────────────────────────────────

  const switchChain = useCallback(async () => {
    await switchToAmoy();
    await refreshEvm();
  }, [refreshEvm]);

  return {
    ...state,
    connectEvmWallet,
    switchChain,
    refreshEvm,
    refreshNim,
  };
}
