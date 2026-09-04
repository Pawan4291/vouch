import { motion } from 'framer-motion';
import { Clock, CheckCircle, AlertTriangle, Gavel, Check } from 'lucide-react';

// Deal status enum matching contract: 0=Active 1=SellerComplete 2=BuyerComplete 3=Completed 4=Disputed 5=Resolved
export type DealStatusCode = 0 | 1 | 2 | 3 | 4 | 5;

const STATUS_CONFIG: Record<DealStatusCode, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  0: { label: 'Active', color: 'text-blue-400', bg: 'bg-blue-900/30', border: 'border-blue-500/40', icon: <Clock size={12} /> },
  1: { label: 'Seller Confirmed', color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-500/40', icon: <Check size={12} /> },
  2: { label: 'Buyer Confirmed', color: 'text-amber-400', bg: 'bg-amber-900/30', border: 'border-amber-500/40', icon: <Check size={12} /> },
  3: { label: 'Completed', color: 'text-emerald-400', bg: 'bg-emerald-900/30', border: 'border-emerald-500/40', icon: <CheckCircle size={12} /> },
  4: { label: 'Disputed', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-500/40', icon: <AlertTriangle size={12} /> },
  5: { label: 'Resolved', color: 'text-purple-400', bg: 'bg-purple-900/30', border: 'border-purple-500/40', icon: <Gavel size={12} /> },
};

interface Props {
  status: DealStatusCode;
  size?: 'sm' | 'md';
}

export function DealStatus({ status, size = 'md' }: Props) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG[0];
  const cls = size === 'sm' ? 'px-2 py-0.5 text-xs gap-1' : 'px-3 py-1 text-xs gap-1.5';

  return (
    <motion.span
      className={`inline-flex items-center ${cls} rounded-full border font-semibold ${cfg.color} ${cfg.bg} ${cfg.border}`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      {cfg.icon}
      {cfg.label}
    </motion.span>
  );
}
