import { motion } from 'framer-motion';
import { Shield, ShieldCheck, Star } from 'lucide-react';

interface Props {
  score: bigint;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

function getTrustLevel(score: bigint): {
  label: string;
  color: string;
  bg: string;
  border: string;
  icon: React.ReactNode;
  glow: string;
} {
  const n = Number(score);
  if (n === 0) return {
    label: 'Unverified',
    color: 'text-gray-400',
    bg: 'bg-gray-900/50',
    border: 'border-gray-700/50',
    icon: <Shield size={12} />,
    glow: '',
  };
  if (n < 5) return {
    label: 'Newcomer',
    color: 'text-blue-400',
    bg: 'bg-blue-900/30',
    border: 'border-blue-600/40',
    icon: <Shield size={12} />,
    glow: 'shadow-blue-500/10',
  };
  if (n < 15) return {
    label: 'Trusted',
    color: 'text-amber-400',
    bg: 'bg-amber-900/30',
    border: 'border-amber-500/40',
    icon: <ShieldCheck size={12} />,
    glow: 'shadow-amber-500/20',
  };
  if (n < 30) return {
    label: 'Vouched',
    color: 'text-yellow-300',
    bg: 'bg-yellow-900/30',
    border: 'border-yellow-400/50',
    icon: <ShieldCheck size={12} />,
    glow: 'shadow-yellow-400/25',
  };
  return {
    label: 'Elite',
    color: 'text-gold-300',
    bg: 'bg-gradient-to-r from-amber-900/40 to-yellow-900/40',
    border: 'border-yellow-400/60',
    icon: <Star size={12} className="fill-current" />,
    glow: 'shadow-yellow-400/40',
  };
}

export function TrustBadge({ score, size = 'md', showLabel = true }: Props) {
  const level = getTrustLevel(score);
  const px = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : size === 'lg' ? 'px-4 py-1.5 text-sm gap-2' : 'px-3 py-1 text-xs gap-1.5';

  return (
    <motion.span
      className={`inline-flex items-center ${px} rounded-full border font-semibold ${level.color} ${level.bg} ${level.border} shadow-sm ${level.glow}`}
      whileHover={{ scale: 1.05 }}
    >
      {level.icon}
      <span className="tabular-nums">{Number(score)}</span>
      {showLabel && <span className="opacity-80">{level.label}</span>}
    </motion.span>
  );
}

// Compact inline trust display for cards
export function TrustPill({ score }: { score: bigint }) {
  const level = getTrustLevel(score);
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${level.color} ${level.bg} border ${level.border}`}>
      {level.icon}
      <span>{Number(score)}</span>
    </span>
  );
}
