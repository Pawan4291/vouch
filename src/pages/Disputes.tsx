import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gavel, AlertTriangle, CheckCircle, Clock, ExternalLink, Users } from 'lucide-react';
import { useDispute } from '../hooks/useDispute';
import { fetchActiveDisputeIds, shortAddr, formatTimestamp } from '../lib/rpc';

interface DisputeItemProps {
  dealId: bigint;
  callerAddress: `0x${string}` | null;
}

function DisputeItem({ dealId, callerAddress }: DisputeItemProps) {
  const dispute = useDispute(dealId, callerAddress);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-5 rounded-2xl border transition-all ${
        dispute.isJuror
          ? 'border-amber-500/40 bg-amber-900/10'
          : 'border-indigo-700/30 bg-indigo-950/60'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Gavel size={14} className="text-red-400" />
            <span className="text-sm font-semibold text-white">Deal #{String(dealId)}</span>
            {dispute.isJuror && (
              <motion.span
                className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 border border-amber-400/50 text-amber-300"
                animate={{ opacity: [0.7, 1, 0.7] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                You're a Juror
              </motion.span>
            )}
          </div>
          {dispute.openedAt > 0n && (
            <p className="text-xs text-indigo-500 mt-1">
              <Clock size={9} className="inline mr-1" />
              Opened {formatTimestamp(dispute.openedAt)}
            </p>
          )}
        </div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${
          dispute.resolved
            ? 'text-purple-400 bg-purple-900/30 border-purple-500/40'
            : 'text-red-400 bg-red-900/30 border-red-500/40'
        }`}>
          {dispute.resolved ? 'Resolved' : 'Active'}
        </span>
      </div>

      {/* Vote tally */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-indigo-400">Seller votes</span>
          <span className="text-amber-400 font-bold">{String(dispute.sellerVotes)}</span>
        </div>
        <div className="w-full h-1.5 rounded-full bg-indigo-800/50 overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-amber-500 to-yellow-400 rounded-full"
            initial={{ width: 0 }}
            animate={{
              width: dispute.sellerVotes + dispute.buyerVotes > 0n
                ? `${(Number(dispute.sellerVotes) / Number(dispute.sellerVotes + dispute.buyerVotes)) * 100}%`
                : '0%',
            }}
            transition={{ duration: 0.8 }}
          />
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-indigo-400">Buyer votes</span>
          <span className="text-blue-400 font-bold">{String(dispute.buyerVotes)}</span>
        </div>
      </div>

      {/* Jurors list */}
      {dispute.jurors.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-indigo-500 mb-2 flex items-center gap-1">
            <Users size={10} />
            Jury ({dispute.jurors.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {dispute.jurors.map((j) => (
              <span
                key={j}
                className={`px-2 py-0.5 rounded-full text-xs font-mono border ${
                  j.toLowerCase() === callerAddress?.toLowerCase()
                    ? 'bg-amber-500/20 border-amber-400/50 text-amber-300'
                    : 'bg-indigo-900/50 border-indigo-700/30 text-indigo-400'
                }`}
              >
                {shortAddr(j)}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="space-y-2">
        {/* Select jury if not yet selected */}
        {dispute.jurors.length === 0 && !dispute.resolved && (
          <motion.button
            onClick={() => dispute.selectJury()}
            disabled={dispute.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-indigo-600/40 bg-indigo-900/40 text-indigo-300 hover:border-amber-500/40 hover:text-amber-300 disabled:opacity-40 transition-all"
            whileHover={{ scale: 1.02 }}
          >
            {dispute.isPending ? 'Selecting…' : 'Select Jury (public trigger)'}
          </motion.button>
        )}

        {/* Vote buttons for jurors */}
        {dispute.isJuror && !dispute.hasVoted && !dispute.resolved && (
          <div className="flex gap-2">
            <motion.button
              onClick={() => dispute.castVote(true)}
              disabled={dispute.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-amber-500/20 border border-amber-400/50 text-amber-300 hover:bg-amber-500/30 disabled:opacity-40 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              ✓ Release to Seller
            </motion.button>
            <motion.button
              onClick={() => dispute.castVote(false)}
              disabled={dispute.isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-blue-500/20 border border-blue-400/50 text-blue-300 hover:bg-blue-500/30 disabled:opacity-40 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
            >
              ↩ Refund Buyer
            </motion.button>
          </div>
        )}

        {dispute.isJuror && dispute.hasVoted && !dispute.resolved && (
          <div className="text-center text-sm text-emerald-400 flex items-center justify-center gap-1.5">
            <CheckCircle size={13} />
            Vote cast — awaiting other jurors
          </div>
        )}

        {/* Resolve if all votes in */}
        {!dispute.resolved && dispute.jurors.length > 0 && (
          <motion.button
            onClick={() => dispute.resolve()}
            disabled={dispute.isPending}
            className="w-full py-2.5 rounded-xl text-sm font-semibold border border-purple-600/40 bg-purple-900/20 text-purple-300 hover:bg-purple-900/30 disabled:opacity-40 transition-all"
            whileHover={{ scale: 1.02 }}
          >
            {dispute.isPending ? 'Resolving…' : '⚖️ Resolve Dispute (public trigger)'}
          </motion.button>
        )}

        {/* Resolved verdict */}
        {dispute.resolved && (
          <div className="p-3 rounded-xl border border-purple-500/30 bg-purple-900/20 text-center text-sm">
            <p className="text-purple-300 font-semibold">
              Verdict: {dispute.releaseToSeller ? 'Released to Seller' : 'Refunded to Buyer'}
            </p>
          </div>
        )}
      </div>

      {/* Tx link */}
      {dispute.txHash && (
        <a
          href={`https://amoy.polygonscan.com/tx/${dispute.txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 mt-3 transition-colors"
        >
          <ExternalLink size={11} />
          View transaction
        </a>
      )}
    </motion.div>
  );
}

interface Props {
  evmAddress: `0x${string}` | null;
}

export function Disputes({ evmAddress }: Props) {
  const [disputeIds, setDisputeIds] = useState<bigint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const ids = await fetchActiveDisputeIds();
        setDisputeIds(ids);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load disputes');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 15_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Jury{' '}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            Disputes
          </span>
        </h1>
        <p className="text-indigo-400 text-sm mt-1">
          Live dispute queue from DisputeJury contract. Only selected jurors can vote.
        </p>
      </motion.div>

      {/* Pseudo-randomness notice */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-900/30 border border-indigo-700/20 text-xs text-indigo-400"
      >
        <AlertTriangle size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
        <span>
          <strong className="text-amber-300">Pseudo-randomness notice:</strong>{' '}
          Jury selection uses <code className="text-amber-400/80">block.prevrandao</code> (post-Merge RANDAO). This is suitable for hackathon/testnet use but not production-grade — a validator could theoretically bias it. A VRF (e.g. Chainlink) would be used in mainnet production.
        </span>
      </motion.div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {isLoading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-3 py-12 justify-center text-indigo-400 text-sm"
          >
            <motion.div
              className="w-5 h-5 rounded-full border-2 border-indigo-700 border-t-amber-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            Reading active disputes from chain…
          </motion.div>
        ) : error ? (
          <motion.div
            key="error"
            className="text-center py-12 text-red-400 text-sm"
          >
            {error}
          </motion.div>
        ) : disputeIds.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 space-y-4"
          >
            <motion.div
              className="w-16 h-16 mx-auto rounded-2xl bg-indigo-900/40 border border-indigo-700/30 flex items-center justify-center"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity }}
            >
              <Gavel size={28} className="text-indigo-600" />
            </motion.div>
            <div>
              <p className="text-indigo-300 font-semibold">No Active Disputes</p>
              <p className="text-indigo-500 text-sm mt-1">
                The chain shows no open disputes. All deals are going smoothly.
              </p>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-4"
          >
            <p className="text-xs text-indigo-500">
              {disputeIds.length} dispute{disputeIds.length !== 1 ? 's' : ''} on-chain
            </p>
            {disputeIds.map((id) => (
              <DisputeItem key={String(id)} dealId={id} callerAddress={evmAddress} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
