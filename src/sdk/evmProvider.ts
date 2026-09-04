/**
 * Vouch – EVM / window.ethereum provider wrapper
 *
 * Nimiq Pay injects `window.ethereum` which gives access to Polygon (EVM).
 * All escrow, staking, reputation, and dispute operations go through here.
 *
 * Chain: Polygon Amoy testnet (chainId 80002) for development/submission.
 *        Switch to chainId 137 (Polygon mainnet) for production deployment.
 */

import { createWalletClient, custom, type WalletClient, type Chain } from 'viem';
import { polygonAmoy } from 'viem/chains';

// ─── Types ────────────────────────────────────────────────────────────────────

declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, handler: (...args: unknown[]) => void) => void;
      removeListener: (event: string, handler: (...args: unknown[]) => void) => void;
      isMetaMask?: boolean;
      selectedAddress?: string;
    };
    // nimiqPay is declared by @nimiq/mini-app-sdk; we extend it here only if not already declared
    // nimiqPay?: { language?: string };
  }
}

// ─── State ────────────────────────────────────────────────────────────────────

let _walletClient: WalletClient | null = null;

/** The active chain – Amoy testnet for hackathon/testnet deployment */
export const ACTIVE_CHAIN: Chain = polygonAmoy;

/** Chain ID we expect window.ethereum to be on */
export const EXPECTED_CHAIN_ID = 80002; // Polygon Amoy

// ─── Provider helpers ─────────────────────────────────────────────────────────

/** True when an EVM-compatible provider is injected by Nimiq Pay (or MetaMask in dev). */
export function hasEvmProvider(): boolean {
  return typeof window !== 'undefined' && !!window.ethereum;
}

/**
 * Build (or return cached) a viem WalletClient backed by window.ethereum.
 * This is used for all write operations (sendTransaction, writeContract, etc).
 */
export async function getWalletClient(): Promise<WalletClient | null> {
  if (!hasEvmProvider()) return null;
  if (_walletClient) return _walletClient;

  _walletClient = createWalletClient({
    chain: ACTIVE_CHAIN,
    transport: custom(window.ethereum!),
  });

  return _walletClient;
}

/**
 * Request the user's EVM accounts.
 * Triggers a Nimiq Pay native approval dialog when inside the app.
 * Returns the first address (the primary account).
 */
export async function connectEvm(): Promise<`0x${string}` | null> {
  if (!hasEvmProvider()) return null;
  try {
    const accounts = (await window.ethereum!.request({
      method: 'eth_requestAccounts',
    })) as `0x${string}`[];
    return accounts[0] ?? null;
  } catch {
    return null;
  }
}

/** Get already-connected accounts without triggering a dialog. */
export async function getEvmAccounts(): Promise<`0x${string}`[]> {
  if (!hasEvmProvider()) return [];
  try {
    return (await window.ethereum!.request({
      method: 'eth_accounts',
    })) as `0x${string}`[];
  } catch {
    return [];
  }
}

/** Get the current chain ID from the provider. */
export async function getChainId(): Promise<number | null> {
  if (!hasEvmProvider()) return null;
  try {
    const hex = (await window.ethereum!.request({ method: 'eth_chainId' })) as string;
    return parseInt(hex, 16);
  } catch {
    return null;
  }
}

/**
 * Ask the provider to switch to Polygon Amoy.
 * If the chain isn't registered in the wallet yet, adds it automatically.
 */
export async function switchToAmoy(): Promise<void> {
  if (!hasEvmProvider()) return;
  try {
    await window.ethereum!.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}` }],
    });
  } catch (err: unknown) {
    // Error code 4902 = chain not added yet
    if ((err as { code?: number }).code === 4902) {
      await window.ethereum!.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: `0x${EXPECTED_CHAIN_ID.toString(16)}`,
            chainName: 'Polygon Amoy Testnet',
            nativeCurrency: { name: 'POL', symbol: 'POL', decimals: 18 },
            rpcUrls: ['https://polygon-amoy.drpc.org'],
            blockExplorerUrls: ['https://amoy.polygonscan.com/'],
          },
        ],
      });
    }
  }
}

/** Subscribe to account-change events from the provider. */
export function onAccountsChanged(handler: (accounts: string[]) => void): () => void {
  if (!hasEvmProvider()) return () => {};
  window.ethereum!.on('accountsChanged', handler as (...args: unknown[]) => void);
  return () => window.ethereum!.removeListener('accountsChanged', handler as (...args: unknown[]) => void);
}

/** Subscribe to chain-change events. */
export function onChainChanged(handler: (chainId: string) => void): () => void {
  if (!hasEvmProvider()) return () => {};
  window.ethereum!.on('chainChanged', handler as (...args: unknown[]) => void);
  return () => window.ethereum!.removeListener('chainChanged', handler as (...args: unknown[]) => void);
}
