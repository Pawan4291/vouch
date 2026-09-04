import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, RefreshCw, Zap, Package, Briefcase, Settings } from 'lucide-react';
import { useListings } from '../hooks/useListings';
import { useTrustScore } from '../hooks/useTrustScore';
import { ListingCard } from '../components/ListingCard';
import type { Listing } from '../hooks/useListings';

const CATEGORIES = [
  { value: '', label: 'All', icon: <Zap size={13} /> },
  { value: 'gig', label: 'Gigs', icon: <Briefcase size={13} /> },
  { value: 'sale', label: 'Sales', icon: <Package size={13} /> },
  { value: 'task', label: 'Tasks', icon: <Settings size={13} /> },
  { value: 'service', label: 'Services', icon: <Zap size={13} /> },
];

function SellerScoreProvider({ listing, children }: { listing: Listing; children: (score: bigint) => React.ReactNode }) {
  const { score } = useTrustScore(listing.seller);
  return <>{children(score)}</>;
}

interface Props {
  onSelectListing: (id: bigint) => void;
}

export function Feed({ onSelectListing }: Props) {
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const { listings, isLoading, error, refresh } = useListings(category || undefined);

  const filtered = listings.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.meta.title.toLowerCase().includes(q) ||
      l.meta.description.toLowerCase().includes(q) ||
      l.meta.tags.some((t) => t.toLowerCase().includes(q)) ||
      l.seller.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-1"
      >
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Marketplace{' '}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            Feed
          </span>
        </h1>
        <p className="text-indigo-400 text-sm">
          Live listings from the Polygon Amoy chain — all reads are real contract events.
        </p>
      </motion.div>

      {/* Search + refresh */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex gap-3"
      >
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search listings, tags, addresses…"
            className="w-full bg-indigo-950/70 border border-indigo-700/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-indigo-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
          />
        </div>
        <motion.button
          onClick={refresh}
          disabled={isLoading}
          className="px-3.5 py-2.5 rounded-xl bg-indigo-900/60 border border-indigo-700/40 text-indigo-300 hover:border-amber-500/40 hover:text-amber-300 transition-all disabled:opacity-50"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95, rotate: 180 }}
        >
          <RefreshCw size={15} className={isLoading ? 'animate-spin' : ''} />
        </motion.button>
      </motion.div>

      {/* Category filter */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-1 scrollbar-none"
      >
        {CATEGORIES.map((cat) => (
          <motion.button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-sm font-medium border flex-shrink-0 transition-all ${
              category === cat.value
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300 shadow-sm shadow-amber-500/10'
                : 'bg-indigo-950/50 border-indigo-700/30 text-indigo-400 hover:border-amber-500/30 hover:text-amber-300'
            }`}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            {cat.icon}
            {cat.label}
          </motion.button>
        ))}
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full border-2 border-indigo-700 border-t-amber-400"
            />
            <p className="text-indigo-400 text-sm">Reading chain events…</p>
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-3"
          >
            <p className="text-red-400 text-sm font-medium">Failed to load listings</p>
            <p className="text-indigo-500 text-xs font-mono">{error}</p>
            <button onClick={refresh} className="text-amber-400 text-xs underline">Retry</button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center py-20 space-y-4"
          >
            <motion.div
              className="w-16 h-16 mx-auto rounded-2xl bg-indigo-900/40 border border-indigo-700/30 flex items-center justify-center"
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Package size={28} className="text-indigo-600" />
            </motion.div>
            <div>
              <p className="text-indigo-300 font-semibold">
                {search || category ? 'No matching listings' : 'No listings yet'}
              </p>
              <p className="text-indigo-500 text-sm mt-1">
                {search || category
                  ? 'Try a different search or category'
                  : 'Be the first to post a deal on-chain.'}
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="grid grid-cols-1 gap-4"
          >
            {/* Result count */}
            <p className="text-xs text-indigo-500">
              {filtered.length} listing{filtered.length !== 1 ? 's' : ''} found on-chain
            </p>

            {filtered.map((listing, i) => (
              <SellerScoreProvider key={String(listing.listingId)} listing={listing}>
                {(score) => (
                  <ListingCard
                    listing={listing}
                    sellerScore={score}
                    onClick={() => onSelectListing(listing.listingId)}
                    index={i}
                  />
                )}
              </SellerScoreProvider>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
