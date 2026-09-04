import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, CheckCircle, AlertCircle, ExternalLink, Info, Clock } from 'lucide-react';
import { useVouch } from '../hooks/useVouch';
import { useTrustScore } from '../hooks/useTrustScore';
import { StakeInput } from '../components/StakeInput';
import { TrustBadge } from '../components/TrustBadge';
import { shortAddr } from '../lib/rpc';
import { VOUCH_COOLDOWN_SECONDS } from '../contracts/addresses';

interface Props {
  evmAddress: `0x${string}` | null;
  isEvmConnected: boolean;
}

function VoucheePreview({ address }: { address: `0x${string}` }) {
  const trust = useTrustScore(address);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl border border-indigo-700/30 bg-indigo-950/60 space-y-3"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-sm font-bold text-white">
            {address.slice(2, 4).toUpperCase()}
          </div>
          <div>
            <p className="text-xs font-mono text-indigo-200">{shortAddr(address)}</p>
            <p className="text-xs text-indigo-500">on Polygon Amoy</p>
          </div>
        </div>
        <TrustBadge score={trust.score} size="sm" />
      </div>
      <div className="grid grid-cols-3 gap-2 text-center text-xs">
        <div className="p-2 rounded-lg bg-indigo-900/40">
          <div className="text-amber-400 font-bold">{String(Number(trust.completedDeals))}</div>
          <div className="text-indigo-500">Deals</div>
        </div>
        <div className="p-2 rounded-lg bg-indigo-900/40">
          <div className="text-blue-400 font-bold">{trust.vouches.length}</div>
          <div className="text-indigo-500">Vouchers</div>
        </div>
        <div className="p-2 rounded-lg bg-indigo-900/40">
          <div className={trust.slashCount > 0n ? 'text-red-400 font-bold' : 'text-gray-600 font-bold'}>
            {String(Number(trust.slashCount))}
          </div>
          <div className="text-indigo-500">Slashes</div>
        </div>
      </div>
      <a
        href={`https://amoy.polygonscan.com/address/${address}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 text-xs text-indigo-500 hover:text-amber-400 transition-colors"
      >
        <ExternalLink size={10} />
        View on Amoy Explorer
      </a>
    </motion.div>
  );
}

export function VouchPage({ evmAddress, isEvmConnected }: Props) {
  const [target, setTarget] = useState('');
  const [targetAddress, setTargetAddress] = useState<`0x${string}` | null>(null);
  const [addressError, setAddressError] = useState('');
  const [activeTab, setActiveTab] = useState<'vouch' | 'withdraw'>('vouch');

  const vouch = useVouch(evmAddress);

  const validateAndPreview = () => {
    const addr = target.trim();
    if (!addr.startsWith('0x') || addr.length !== 42) {
      setAddressError('Enter a valid EVM address (0x…)');
      setTargetAddress(null);
      return;
    }
    setAddressError('');
    setTargetAddress(addr as `0x${string}`);
  };

  const handleVouch = async (amount: bigint) => {
    if (!targetAddress) return;
    await vouch.vouchFor(targetAddress, amount);
  };

  const handleWithdraw = async () => {
    if (!targetAddress) return;
    await vouch.withdrawVouch(targetAddress);
  };

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Vouch for{' '}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            Trust
          </span>
        </h1>
        <p className="text-indigo-400 text-sm mt-1">
          Stake USDT on someone's reputation. If they scam, your stake is slashed.
        </p>
      </motion.div>

      {!isEvmConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-900/20 border border-amber-500/30 text-amber-300 text-sm"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          Connect your EVM wallet to stake vouch tokens on Polygon.
        </motion.div>
      )}

      {/* How it works */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="p-4 rounded-xl border border-indigo-700/20 bg-indigo-950/40 text-xs text-indigo-400 space-y-1.5"
      >
        <div className="flex items-center gap-1.5 text-indigo-300 font-semibold mb-2">
          <Info size={12} className="text-amber-400" />
          How vouching works
        </div>
        <p>1. Enter the EVM address of someone you <em>personally trust</em></p>
        <p>2. Stake USDT (held in ReputationRegistry contract)</p>
        <p>3. Their trust score increases, making them eligible for higher-value deals &amp; jury duty</p>
        <p>4. If they scam a deal, <code className="text-red-400">slash()</code> burns part of your stake</p>
        <p>5. Withdraw after <span className="text-amber-400">{Math.round(VOUCH_COOLDOWN_SECONDS / 86400)} days</span> cooldown (enforced by <code className="text-amber-400/70">block.timestamp</code>)</p>
      </motion.div>

      {/* Target address input */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-indigo-200">
          Address to Vouch For
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-indigo-500" />
            <input
              value={target}
              onChange={(e) => { setTarget(e.target.value); setAddressError(''); setTargetAddress(null); }}
              onKeyDown={(e) => e.key === 'Enter' && validateAndPreview()}
              placeholder="0x… EVM address"
              className="w-full bg-indigo-950/70 border border-indigo-700/40 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-indigo-500 font-mono focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 transition-all"
            />
          </div>
          <motion.button
            onClick={validateAndPreview}
            className="px-4 py-2.5 rounded-xl bg-indigo-800/60 border border-indigo-600/40 text-indigo-200 text-sm font-medium hover:border-amber-500/40 hover:text-amber-300 transition-all"
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
          >
            Preview
          </motion.button>
        </div>
        {addressError && (
          <p className="text-xs text-red-400 flex items-center gap-1">
            <AlertCircle size={11} />
            {addressError}
          </p>
        )}
      </div>

      {/* Vouchee preview */}
      <AnimatePresence>
        {targetAddress && <VoucheePreview address={targetAddress} />}
      </AnimatePresence>

      {/* Tabs */}
      {targetAddress && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
          <div className="flex rounded-xl overflow-hidden border border-indigo-700/30">
            {(['vouch', 'withdraw'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? 'bg-amber-500/15 text-amber-300'
                    : 'bg-indigo-950/50 text-indigo-500 hover:text-indigo-300'
                }`}
              >
                {tab === 'vouch' ? '🔐 Stake Vouch' : '↩ Withdraw'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'vouch' ? (
              <motion.div
                key="vouch"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
              >
                <StakeInput
                  label="USDT Stake Amount"
                  onConfirm={handleVouch}
                  isPending={vouch.isPending}
                  disabled={!isEvmConnected}
                />
              </motion.div>
            ) : (
              <motion.div
                key="withdraw"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                className="space-y-4"
              >
                <div className="flex items-start gap-2 p-3 rounded-xl bg-indigo-900/30 border border-indigo-700/20 text-xs text-indigo-400">
                  <Clock size={12} className="flex-shrink-0 mt-0.5 text-amber-500" />
                  Withdrawal requires {Math.round(VOUCH_COOLDOWN_SECONDS / 86400)}-day cooldown enforced by the contract. The tx will revert if too early.
                </div>
                <motion.button
                  onClick={handleWithdraw}
                  disabled={vouch.isPending || !isEvmConnected}
                  className="w-full py-3 rounded-xl font-semibold text-sm border border-red-500/30 bg-red-900/20 text-red-300 hover:bg-red-900/30 disabled:opacity-40 transition-all"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {vouch.isPending ? 'Processing…' : 'Withdraw Vouch Stake'}
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result feedback */}
          <AnimatePresence>
            {vouch.txHash && (
              <motion.a
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                href={`https://amoy.polygonscan.com/tx/${vouch.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 rounded-xl border border-emerald-500/30 bg-emerald-900/20 text-xs text-emerald-300"
              >
                <CheckCircle size={13} />
                Transaction confirmed —{' '}
                <span className="underline font-mono">{shortAddr(vouch.txHash)}</span>
                <ExternalLink size={11} />
              </motion.a>
            )}
            {vouch.error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-3 rounded-xl border border-red-500/30 bg-red-900/20 text-xs text-red-300 font-mono"
              >
                {vouch.error}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </div>
  );
}
