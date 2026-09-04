import { useState } from 'react';
import { motion } from 'framer-motion';
import { DollarSign, AlertCircle } from 'lucide-react';

interface Props {
  label?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  onConfirm: (amount: bigint) => void;
  isPending?: boolean;
  disabled?: boolean;
}

const PRESETS = [5, 10, 25, 50, 100];

export function StakeInput({
  label = 'Stake Amount (USDT)',
  placeholder = '10',
  min = 1,
  max = 10_000,
  onConfirm,
  isPending = false,
  disabled = false,
}: Props) {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const handle = () => {
    const n = parseFloat(value);
    if (isNaN(n) || n < min) {
      setError(`Minimum stake is $${min} USDT`);
      return;
    }
    if (n > max) {
      setError(`Maximum stake is $${max} USDT`);
      return;
    }
    setError('');
    // Convert USDT to wei (6 decimals)
    const wei = BigInt(Math.round(n * 1_000_000));
    onConfirm(wei);
  };

  const set = (preset: number) => {
    setValue(String(preset));
    setError('');
  };

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-semibold text-indigo-200">{label}</label>
      )}

      {/* Preset buttons */}
      <div className="flex gap-2 flex-wrap">
        {PRESETS.map((p) => (
          <motion.button
            key={p}
            onClick={() => set(p)}
            disabled={disabled || isPending}
            className={`px-3 py-1 rounded-lg text-xs font-semibold border transition-all ${
              value === String(p)
                ? 'bg-amber-500/20 border-amber-400/60 text-amber-300'
                : 'bg-indigo-900/40 border-indigo-600/30 text-indigo-300 hover:border-amber-500/40 hover:text-amber-300'
            }`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ${p}
          </motion.button>
        ))}
      </div>

      {/* Custom amount input */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
          <input
            type="number"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            placeholder={placeholder}
            min={min}
            max={max}
            disabled={disabled || isPending}
            className="w-full bg-indigo-950/60 border border-indigo-700/40 rounded-xl pl-8 pr-4 py-2.5 text-white placeholder-indigo-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/20 text-sm transition-all disabled:opacity-50"
          />
        </div>
        <motion.button
          onClick={handle}
          disabled={disabled || isPending || !value}
          className="px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-950 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          {isPending ? (
            <span className="flex items-center gap-2">
              <motion.div
                className="w-3.5 h-3.5 border-2 border-indigo-950/30 border-t-indigo-950 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Pending
            </span>
          ) : 'Stake'}
        </motion.button>
      </div>

      {error && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-1.5 text-xs text-red-400"
        >
          <AlertCircle size={12} />
          {error}
        </motion.p>
      )}
    </div>
  );
}
