import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, DollarSign, Tag, CheckCircle, ExternalLink, AlertCircle, Info, Coins } from 'lucide-react';
import { getWalletClient } from '../sdk/evmProvider';
import { publicClient } from '../lib/rpc';
import { CONTRACTS, LISTING_FEE_NIM } from '../contracts/addresses';
import { DEAL_ESCROW_ABI } from '../contracts/abis/DealEscrow';
import { sendNIM } from '../sdk/nimiqMiniApp';

interface Props {
  evmAddress: `0x${string}` | null;
  nimAddress: string | null;
  isEvmConnected: boolean;
  onCreated: (listingId: bigint) => void;
}

const CATEGORIES = ['gig', 'sale', 'task', 'service'];

export function CreateListing({ evmAddress, nimAddress, isEvmConnected, onCreated }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('gig');
  const [tags, setTags] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [nimHash, setNimHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'form' | 'nim' | 'evm' | 'done'>('form');

  const isValid = title.trim() && price && parseFloat(price) > 0 && isEvmConnected;

  const buildMetadataURI = () =>
    JSON.stringify({
      title: title.trim(),
      description: description.trim(),
      tags: tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    });

  const submit = async () => {
    if (!isValid || !evmAddress) return;
    setIsPending(true);
    setError(null);

    try {
      // Step 1: Pay NIM listing fee (if NIM wallet connected)
      if (nimAddress) {
        setStep('nim');
        try {
          const nimResult = await sendNIM(
            CONTRACTS.TREASURY_NIM,
            LISTING_FEE_NIM,
            `vouch-listing-fee`
          );
          if (nimResult) setNimHash(nimResult.hash);
        } catch {
          // NIM fee optional — don't block if Nimiq Pay not available
        }
      }

      // Step 2: Write listing to DealEscrow on Polygon
      setStep('evm');
      const priceWei = BigInt(Math.round(parseFloat(price) * 1_000_000)); // USDT 6 decimals
      const metadataURI = buildMetadataURI();
      const client = await getWalletClient();
      if (!client) throw new Error('No EVM wallet client — connect wallet first');

      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.DEAL_ESCROW,
        abi: DEAL_ESCROW_ABI,
        functionName: 'createListing',
        args: [priceWei, metadataURI, category],
        account: evmAddress,
      });

      const hash = await client.writeContract(request);
      setTxHash(hash);
      setStep('done');

      // Wait for receipt to get the listingId from event
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      // Parse listingId from event log (first ListingCreated event)
      const log = receipt.logs[0];
      if (log?.topics?.[1]) {
        const listingId = BigInt(log.topics[1]);
        onCreated(listingId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
      setStep('form');
    } finally {
      setIsPending(false);
    }
  };

  if (step === 'done' && txHash) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-16 space-y-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          className="w-20 h-20 mx-auto rounded-full bg-emerald-900/40 border-2 border-emerald-500/50 flex items-center justify-center"
        >
          <CheckCircle size={36} className="text-emerald-400" />
        </motion.div>
        <div>
          <h2 className="text-xl font-bold text-white mb-2">Listing Created!</h2>
          <p className="text-indigo-400 text-sm">Your deal is now live on Polygon Amoy.</p>
        </div>
        <div className="space-y-3">
          <a
            href={`https://amoy.polygonscan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
          >
            <ExternalLink size={14} />
            View EVM transaction
          </a>
          {nimHash && (
            <a
              href={`https://nimiq.watch/#${nimHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors"
            >
              <ExternalLink size={14} />
              View NIM fee transaction
            </a>
          )}
        </div>
        <motion.button
          onClick={() => { setStep('form'); setTitle(''); setDescription(''); setPrice(''); setTags(''); setTxHash(null); setNimHash(null); }}
          className="px-6 py-2.5 rounded-xl bg-indigo-800/60 border border-indigo-600/40 text-indigo-200 text-sm font-medium hover:border-amber-500/40 hover:text-amber-300 transition-all"
          whileHover={{ scale: 1.03 }}
        >
          Create Another
        </motion.button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Post a{' '}
          <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
            Listing
          </span>
        </h1>
        <p className="text-indigo-400 text-sm mt-1">
          Your listing is stored on-chain via{' '}
          <code className="text-amber-400/80 text-xs">DealEscrow.createListing()</code>.
          {nimAddress && ` A ${LISTING_FEE_NIM} NIM fee is sent via Nimiq Pay.`}
        </p>
      </motion.div>

      {!isEvmConnected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-4 rounded-xl bg-amber-900/20 border border-amber-500/30 text-amber-300 text-sm"
        >
          <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
          Connect your EVM wallet to post listings on Polygon.
        </motion.div>
      )}

      {/* NIM fee notice */}
      {nimAddress && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-start gap-3 p-3.5 rounded-xl bg-indigo-900/40 border border-indigo-600/30 text-indigo-300 text-xs"
        >
          <Coins size={14} className="flex-shrink-0 mt-0.5 text-amber-400" />
          <span>
            <span className="font-semibold text-amber-300">{LISTING_FEE_NIM} NIM</span> listing fee sent via Nimiq Pay. Feeless, instant.
          </span>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-5"
      >
        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-indigo-200 mb-2">
            Title <span className="text-red-400">*</span>
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Logo design, vintage keyboard, translation task…"
            maxLength={120}
            className="w-full bg-indigo-950/70 border border-indigo-700/40 rounded-xl px-4 py-3 text-white placeholder-indigo-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-sm transition-all"
          />
          <p className="text-xs text-indigo-600 mt-1">{title.length}/120</p>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-indigo-200 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you offering? Deliverables, timeline, conditions…"
            rows={4}
            maxLength={500}
            className="w-full bg-indigo-950/70 border border-indigo-700/40 rounded-xl px-4 py-3 text-white placeholder-indigo-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-sm transition-all resize-none"
          />
          <p className="text-xs text-indigo-600 mt-1">{description.length}/500</p>
        </div>

        {/* Price + Category row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-indigo-200 mb-2">
              Price (USDT) <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <DollarSign size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-400" />
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="25.00"
                min="0.01"
                step="0.01"
                className="w-full bg-indigo-950/70 border border-indigo-700/40 rounded-xl pl-8 pr-4 py-3 text-white placeholder-indigo-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-sm transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-indigo-200 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-indigo-950/70 border border-indigo-700/40 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50 text-sm transition-all appearance-none"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-indigo-950">
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-sm font-semibold text-indigo-200 mb-2">
            <Tag size={13} className="inline mr-1" />
            Tags (comma-separated)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="design, branding, vector"
            className="w-full bg-indigo-950/70 border border-indigo-700/40 rounded-xl px-4 py-3 text-white placeholder-indigo-500 focus:outline-none focus:border-amber-500/50 focus:ring-1 focus:ring-amber-500/20 text-sm transition-all"
          />
        </div>

        {/* Info box */}
        <motion.div
          className="flex gap-3 p-3.5 rounded-xl bg-indigo-900/30 border border-indigo-700/20 text-xs text-indigo-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <Info size={13} className="flex-shrink-0 mt-0.5 text-indigo-500" />
          <span>
            Metadata is stored inline as JSON in the <code className="text-amber-400/70">metadataURI</code> field.
            The feed reads the <code className="text-amber-400/70">ListingCreated</code> event directly — no backend.
          </span>
        </motion.div>

        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-start gap-2 p-3.5 rounded-xl bg-red-900/20 border border-red-500/30 text-red-300 text-sm"
          >
            <AlertCircle size={15} className="flex-shrink-0 mt-0.5" />
            <span className="font-mono text-xs">{error}</span>
          </motion.div>
        )}

        {/* Progress steps (shown during submission) */}
        <AnimatePresence>
          {isPending && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-2"
            >
              {[
                { key: 'nim', label: 'Sending NIM listing fee…', active: step === 'nim' },
                { key: 'evm', label: 'Writing listing to Polygon…', active: step === 'evm' },
              ].map((s) => (
                <div key={s.key} className={`flex items-center gap-2 text-xs ${s.active ? 'text-amber-300' : 'text-indigo-600'}`}>
                  {s.active ? (
                    <motion.div
                      className="w-3 h-3 rounded-full border border-amber-400 border-t-transparent"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    />
                  ) : (
                    <div className="w-3 h-3 rounded-full border border-indigo-700" />
                  )}
                  {s.label}
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit */}
        <motion.button
          onClick={submit}
          disabled={!isValid || isPending}
          className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-950 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
          whileHover={isValid && !isPending ? { scale: 1.02 } : {}}
          whileTap={isValid && !isPending ? { scale: 0.98 } : {}}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <motion.div
                className="w-4 h-4 border-2 border-indigo-950/30 border-t-indigo-950 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              Posting On-Chain…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Plus size={16} />
              Post Listing
            </span>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}
