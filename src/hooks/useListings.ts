/**
 * useListings — fetches live listings from DealEscrow ListingCreated events
 *
 * Uses getLogs via the public Amoy RPC client (no wallet needed).
 * Returns an empty array when the contract has no listings — NOT sample data.
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchListings, parseListingMeta, type ChainListing, type ParsedListingMeta } from '../lib/rpc';

export interface Listing extends ChainListing {
  meta: ParsedListingMeta;
}

export interface ListingsState {
  listings: Listing[];
  isLoading: boolean;
  error: string | null;
}

export function useListings(category?: string) {
  const [state, setState] = useState<ListingsState>({
    listings: [],
    isLoading: true,
    error: null,
  });

  const load = useCallback(async () => {
    setState((s) => ({ ...s, isLoading: true, error: null }));
    try {
      const raw = await fetchListings();
      const parsed: Listing[] = raw
        .map((l) => ({ ...l, meta: parseListingMeta(l.metadataURI) }))
        .filter((l) => !category || l.category === category)
        .sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1)); // newest first

      setState({ listings: parsed, isLoading: false, error: null });
    } catch (err) {
      setState({
        listings: [],
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load listings',
      });
    }
  }, [category]);

  useEffect(() => {
    load();
    // Poll for new listings every 15 seconds
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, [load]);

  return { ...state, refresh: load };
}
