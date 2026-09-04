import { motion } from 'framer-motion';
import { Wallet, AlertTriangle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { shortAddr } from '../lib/rpc';
import type { WalletState } from '../hooks/useWallet';

interface Props {
  wallet: WalletState & {
    connectEvmWallet: () => Promise<void>;
    switchChain: () => Promise<void>;
  };
}

export function ConnectButton({ wallet }: Props) {
  const { isEvmConnected, evmAddress, isCorrectChain, isConnecting, connectEvmWallet, switchChain } = wallet;

  if (isConnecting) {
    return (
      <motion.div
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-900/60 border border-indigo-500/30 text-indigo-300"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        <Loader2 size={16} className="animate-spin" />
        <span className="text-sm font-medium">Connecting…</span>
      </motion.div>
    );
  }

  if (isEvmConnected && !isCorrectChain) {
    return (
      <motion.button
        onClick={switchChain}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-900/60 border border-amber-500/40 text-amber-300 hover:bg-amber-800/60 transition-all"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <AlertTriangle size={16} />
        <span className="text-sm font-medium">Switch to Amoy</span>
      </motion.button>
    );
  }

  if (isEvmConnected && evmAddress) {
    return (
      <div className="flex items-center gap-2">
        <motion.a
          href={`https://www.alchemy.com/faucets/polygon-amoy`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-900/40 border border-amber-500/30 text-amber-300 hover:bg-amber-800/40 transition-all"
          whileHover={{ scale: 1.02 }}
          title="Get free test POL for Polygon Amoy — paste your address, no login needed"
        >
          <span className="text-sm font-medium">Get Faucet</span>
          <ExternalLink size={11} className="text-amber-500/60" />
        </motion.a>
        <motion.a
          href={`https://amoy.polygonscan.com/address/${evmAddress}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-800/40 transition-all"
          whileHover={{ scale: 1.02 }}
        >
          <CheckCircle size={14} className="text-emerald-400" />
          <span className="text-sm font-mono font-medium">{shortAddr(evmAddress)}</span>
          <ExternalLink size={11} className="text-emerald-500/60" />
        </motion.a>
      </div>
    );
  }

  return (
    <motion.button
      onClick={connectEvmWallet}
      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gold-500 to-amber-500 text-indigo-950 font-semibold text-sm shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
      style={{ background: 'linear-gradient(135deg, #f5c842, #e8a020)' }}
      whileHover={{ scale: 1.04, boxShadow: '0 0 24px rgba(245,200,66,0.4)' }}
      whileTap={{ scale: 0.97 }}
    >
      <Wallet size={16} />
      <span>Connect Wallet</span>
    </motion.button>
  );
}
