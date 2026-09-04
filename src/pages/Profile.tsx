import { motion, AnimatePresence } from 'framer-motion';
import { User, Shield, CheckCircle, TrendingUp, ExternalLink, Copy } from 'lucide-react';
import { useTrustScore } from '../hooks/useTrustScore';
import { TrustBadge } from '../components/TrustBadge';
import { shortAddr, formatUsdt, formatTimestamp } from '../lib/rpc';
import { useState } from 'react';

interface Props {
  evmAddress: `0x${string}` | null;
  nimAddress: string | null;
  nimBalance: number | null;
}

function StatCard({ label, value, sub, color = 'text-white' }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <motion.div
      className="p-4 rounded-xl border border-indigo-700/30 bg-indigo-950/60 text-center"
      whileHover={{ y: -2, borderColor: 'rgba(245, 200, 66, 0.25)' }}
    >
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      {sub && <div className="text-xs text-indigo-500 mt-0.5">{sub}</div>}
      <div className="text-xs text-indigo-400 mt-1">{label}</div>
    </motion.div>
  );
}

export function Profile({ evmAddress, nimAddress, nimBalance }: Props) {
  const trust = useTrustScore(evmAddress);
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (!evmAddress) return;
    navigator.clipboard.writeText(evmAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!evmAddress) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">
        <motion.div
          className="w-20 h-20 rounded-full bg-indigo-900/40 border border-indigo-700/30 flex items-center justify-center"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <User size={32} className="text-indigo-600" />
        </motion.div>
        <div className="text-center">
          <p className="text-white font-semibold text-lg">Not Connected</p>
          <p className="text-indigo-400 text-sm mt-1">Connect your EVM wallet to view your profile</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white">
          Your{' '}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            Profile
          </span>
        </h1>
        <p className="text-indigo-400 text-sm mt-1">On-chain reputation — all values read from ReputationRegistry.</p>
      </motion.div>

      {/* Identity card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-5 rounded-2xl border border-indigo-700/30 bg-gradient-to-b from-indigo-900/40 to-indigo-950/60 space-y-4"
      >
        {/* Avatar + address */}
        <div className="flex items-center gap-4">
          <motion.div
            className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg"
            style={{ background: 'linear-gradient(135deg, #3730a3, #7c3aed)' }}
            animate={{ boxShadow: ['0 0 0px rgba(245,200,66,0)', '0 0 20px rgba(245,200,66,0.2)', '0 0 0px rgba(245,200,66,0)'] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            {evmAddress.slice(2, 4).toUpperCase()}
          </motion.div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-indigo-200 truncate">{evmAddress}</span>
              <motion.button
                onClick={copy}
                className="flex-shrink-0 p-1 rounded-md text-indigo-500 hover:text-amber-400 transition-colors"
                whileTap={{ scale: 0.85 }}
              >
                <AnimatePresence mode="wait">
                  {copied ? (
                    <motion.div key="check" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <CheckCircle size={13} className="text-emerald-400" />
                    </motion.div>
                  ) : (
                    <motion.div key="copy" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <Copy size={13} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <TrustBadge score={trust.score} size="sm" />
              <a
                href={`https://amoy.polygonscan.com/address/${evmAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-500 hover:text-amber-400 transition-colors"
              >
                <ExternalLink size={11} />
              </a>
            </div>
          </div>
        </div>

        {/* NIM wallet */}
        {nimAddress && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-900/10 border border-amber-700/20 text-xs">
            <div className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center">
              <span className="text-amber-400 text-xs font-bold">N</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-amber-300 font-semibold truncate">{nimAddress}</p>
              {nimBalance !== null && (
                <p className="text-amber-600 text-xs">{nimBalance.toFixed(4)} NIM</p>
              )}
            </div>
            <span className="text-amber-500 text-xs font-medium">Nimiq</span>
          </div>
        )}
      </motion.div>

      {/* Stats grid */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-2 gap-3"
      >
        <StatCard
          label="Trust Score"
          value={trust.isLoading ? '…' : String(Number(trust.score))}
          color="text-amber-400"
        />
        <StatCard
          label="Deals Completed"
          value={trust.isLoading ? '…' : String(Number(trust.completedDeals))}
          color="text-emerald-400"
        />
        <StatCard
          label="Slashes Received"
          value={trust.isLoading ? '…' : String(Number(trust.slashCount))}
          color={trust.slashCount > 0n ? 'text-red-400' : 'text-gray-500'}
        />
        <StatCard
          label="USDT Vouched For"
          value={trust.isLoading ? '…' : `$${formatUsdt(trust.totalVouchStake)}`}
          sub="staked by others"
          color="text-blue-400"
        />
      </motion.div>

      {/* Vouch history */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <h2 className="text-sm font-semibold text-indigo-300 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-amber-400" />
          Vouchers ({trust.vouches.length})
        </h2>

        {trust.isLoading ? (
          <div className="flex items-center gap-2 text-indigo-500 text-sm py-4">
            <motion.div
              className="w-4 h-4 rounded-full border-2 border-indigo-700 border-t-amber-400"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
            />
            Loading vouch history…
          </div>
        ) : trust.vouches.length === 0 ? (
          <div className="text-center py-8 text-indigo-500 text-sm">
            No vouches yet. Your reputation starts at 0 and is earned on-chain.
          </div>
        ) : (
          <div className="space-y-2">
            {trust.vouches.map((v, i) => (
              <motion.div
                key={`${v.voucher}-${v.timestamp}`}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.06 }}
                className="flex items-center justify-between p-3 rounded-xl border border-indigo-700/30 bg-indigo-950/50 text-sm hover:border-amber-500/20 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-xs font-bold text-white">
                    {v.voucher.slice(2, 4).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-mono text-xs text-indigo-200">{shortAddr(v.voucher)}</p>
                    <p className="text-xs text-indigo-500">{formatTimestamp(v.timestamp)}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-amber-400 font-semibold text-sm">${formatUsdt(v.amount)}</p>
                  <p className="text-xs text-indigo-500">USDT staked</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Trust score explanation */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="p-4 rounded-xl border border-indigo-700/20 bg-indigo-950/40 text-xs text-indigo-500 space-y-1"
      >
        <div className="flex items-center gap-1.5 text-indigo-400 font-medium mb-2">
          <TrendingUp size={12} />
          How Trust Score Works
        </div>
        <p>• Each completed deal = <span className="text-amber-400">+1</span> trust point</p>
        <p>• Each USDT vouched for you = <span className="text-amber-400">+1</span> point per $10 staked</p>
        <p>• Each slash = <span className="text-red-400">−3</span> trust points</p>
        <p>• Computed live from <code className="text-amber-400/70">ReputationRegistry.trustScore()</code></p>
      </motion.div>
    </div>
  );
}
