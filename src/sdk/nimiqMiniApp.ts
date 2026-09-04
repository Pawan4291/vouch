/**
 * Vouch – Nimiq Mini App SDK wrapper
 *
 * Pattern: call `init()` from `@nimiq/mini-app-sdk` and wait for the injected
 * Nimiq provider to be ready before any NIM wallet operation.
 *
 * The SDK's `init()` helper:
 *  1. Waits for `window.nimiq` (the injected Nimiq provider) to be available.
 *  2. Returns a typed proxy object exposing listAccounts(), isConsensusEstablished(),
 *     getBlockNumber(), sendTransaction(), signMessage(), etc.
 *  3. Every sensitive call triggers a native Nimiq Pay confirmation dialog –
 *     the mini app CANNOT bypass it.
 *
 * In this app, NIM is used for:
 *   • Listing fees  (small NIM tip burned to the Vouch treasury)
 *   • Gratitude tips (buyer → seller after a completed deal)
 *
 * All escrow / staking / dispute logic lives in Solidity on Polygon (EVM).
 */

type NimiqProvider = {
  listAccounts: () => Promise<Array<{ address: string; balance: number; label?: string }>>;
  isConsensusEstablished: () => Promise<boolean>;
  getBlockNumber: () => Promise<number>;
  sendTransaction: (tx: {
    recipient: string;
    value: number; // luna (1 NIM = 100_000 luna)
    fee?: number;
    extraData?: string;
    validityDuration?: number;
  }) => Promise<{ hash: string; serializedTx: string }>;
  signMessage: (opts: { message: string; address?: string }) => Promise<{ signature: string; publicKey: string }>;
};

let _nimiq: NimiqProvider | null = null;
let _initPromise: Promise<NimiqProvider | null> | null = null;

/** NIM → luna conversion (1 NIM = 100,000 luna) */
export const nimToLuna = (nim: number): number => Math.round(nim * 100_000);
/** luna → NIM */
export const lunaToNim = (luna: number): number => luna / 100_000;

/**
 * Initialise the Nimiq provider using the Mini App SDK pattern.
 *
 * Falls back gracefully when not inside Nimiq Pay (e.g. browser dev mode):
 * returns null and the UI shows a "not connected" state instead of crashing.
 */
export async function initNimiq(): Promise<NimiqProvider | null> {
  if (_nimiq) return _nimiq;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      // Dynamic import so the bundle still loads outside Nimiq Pay
      const { init } = await import('@nimiq/mini-app-sdk');
      const nimiq = await Promise.race([
        init(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
      ]);
      if (!nimiq) return null;
      _nimiq = nimiq as unknown as NimiqProvider;
      return _nimiq;
    } catch {
      // Outside Nimiq Pay – provider not injected
      return null;
    }
  })();

  return _initPromise;
}

/** Get the first NIM account address (primary wallet). */
export async function getNimAddress(): Promise<string | null> {
  const nim = await initNimiq();
  if (!nim) return null;
  try {
    const accounts = await nim.listAccounts();
    return accounts[0]?.address ?? null;
  } catch {
    return null;
  }
}

/** Get NIM balance in luna for the primary account. */
export async function getNimBalance(): Promise<number | null> {
  const nim = await initNimiq();
  if (!nim) return null;
  try {
    const accounts = await nim.listAccounts();
    return accounts[0]?.balance ?? null;
  } catch {
    return null;
  }
}

/**
 * Send NIM to a recipient.
 * Used for listing fees and gratitude tips — not escrow (that's EVM).
 *
 * @param to   Recipient NIM address (human-readable "NQ…" format)
 * @param nim  Amount in NIM (will be converted to luna internally)
 */
export async function sendNIM(
  to: string,
  nim: number,
  extraData?: string
): Promise<{ hash: string } | null> {
  const provider = await initNimiq();
  if (!provider) return null;

  const result = await provider.sendTransaction({
    recipient: to,
    value: nimToLuna(nim),
    fee: 0,
    extraData,
    validityDuration: 120,
  });
  return { hash: result.hash };
}

/** Check whether the Nimiq consensus is established (chain is in sync). */
export async function isNimiqReady(): Promise<boolean> {
  const nim = await initNimiq();
  if (!nim) return false;
  try {
    return await nim.isConsensusEstablished();
  } catch {
    return false;
  }
}
