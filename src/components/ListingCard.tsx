import { motion } from 'framer-motion';
import { DollarSign, User, Tag, ArrowRight, Clock } from 'lucide-react';
import { formatUsdt, shortAddr, formatTimestamp } from '../lib/rpc';
import { TrustPill } from './TrustBadge';
import type { Listing } from '../hooks/useListings';

interface Props {
  listing: Listing;
  sellerScore: bigint;
  onClick: () => void;
  index?: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  gig: 'text-purple-400 bg-purple-900/30 border-purple-600/30',
  sale: 'text-blue-400 bg-blue-900/30 border-blue-600/30',
  task: 'text-amber-400 bg-amber-900/30 border-amber-600/30',
  service: 'text-emerald-400 bg-emerald-900/30 border-emerald-600/30',
};

export function ListingCard({ listing, sellerScore, onClick, index = 0 }: Props) {
  const catClass = CATEGORY_COLORS[listing.category] ?? 'text-gray-400 bg-gray-900/30 border-gray-600/30';

  return (
    <motion.div
      onClick={onClick}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07, duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(245, 200, 66, 0.1)' }}
      className="group relative cursor-pointer rounded-2xl border border-indigo-700/30 bg-gradient-to-b from-indigo-950/80 to-indigo-950/60 backdrop-blur-sm overflow-hidden transition-all duration-300 hover:border-amber-500/30"
    >
      {/* Gold accent top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-amber-500/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-amber-500/0 group-hover:from-amber-500/3 group-hover:to-transparent transition-all duration-500 pointer-events-none" />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-semibold text-base leading-snug truncate group-hover:text-amber-100 transition-colors">
              {listing.meta.title}
            </h3>
          </div>
          <motion.div
            className="flex-shrink-0 text-xl font-bold text-amber-400 flex items-center gap-0.5"
            whileHover={{ scale: 1.05 }}
          >
            <DollarSign size={14} className="text-amber-500/70" />
            {formatUsdt(listing.price)}
          </motion.div>
        </div>

        {/* Description */}
        {listing.meta.description && (
          <p className="text-sm text-indigo-300/80 mb-3 line-clamp-2 leading-relaxed">
            {listing.meta.description}
          </p>
        )}

        {/* Tags */}
        {listing.meta.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {listing.meta.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs bg-indigo-900/50 border border-indigo-700/30 text-indigo-300"
              >
                <Tag size={9} />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-indigo-800/30">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
              <User size={10} className="text-white/80" />
            </div>
            <span className="text-xs text-indigo-400 font-mono">{shortAddr(listing.seller)}</span>
            <TrustPill score={sellerScore} />
          </div>

          <div className="flex items-center gap-2">
            {listing.category && (
              <span className={`px-2 py-0.5 rounded-md text-xs font-medium border ${catClass}`}>
                {listing.category}
              </span>
            )}
            <div className="flex items-center gap-1 text-xs text-indigo-500">
              <Clock size={10} />
              {formatTimestamp(listing.timestamp)}
            </div>
          </div>
        </div>
      </div>

      {/* CTA arrow */}
      <motion.div
        className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
        animate={{ x: [0, 3, 0] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <ArrowRight size={16} className="text-amber-400" />
      </motion.div>
    </motion.div>
  );
}
