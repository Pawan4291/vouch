import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, CheckCircle, AlertTriangle, Gavel, DollarSign, User, ExternalLink, Loader2 } from 'lucide-react';
import { publicClient, shortAddr, formatUsdt } from '../lib/rpc';
import { CONTRACTS } from '../contracts/addresses';
import { DEAL_ESCROW_ABI } from '../contracts/abis/DealEscrow';
import { getWalletClient } from '../sdk/evmProvider';
import { useTrustScore } from '../hooks/useTrustScore';
import { useDispute } from '../hooks/useDispute';
import { DealStatus, type DealStatusCode } from '../components/DealStatus';
import { TrustBadge } from '../components/TrustBadge';
import type { Listing } from '../hooks/useListings';
import { sendNIM } from '../sdk/nimiqMiniApp';

interface DealData {
  listingId: bigint;
  seller: `0x${string}`;
  buyer: `0x${string}`;
  amount: bigint;
  status: number;
  sellerConfirmed: boolean;
  buyerConfirmed: boolean;
  timestamp: bigint;
}

interface Props {
  listing: Listing;
  evmAddress: `0x${string}` | null;
  nimAddress: string | null;
  onBack: () => void;
}

export function DealRoom({ listing, evmAddress, nimAddress, onBack }: Props) {
  const [deal, setDeal] = useState<DealData | null>(null);
  const [dealId, setDealId] = useState<bigint | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tipAmount, setTipAmount] = useState('');
  const [isTipping, setIsTipping] = useState(false);

  const sellerScore = useTrustScore(listing.seller);
  const dispute = useDispute(dealId, evmAddress);

  // Detect if caller has a deal on this listing
  useEffect(() => {
    const findDeal = async () => {
      if (!evmAddress) return;
      try {
        const ids = await publicClient.readContract({
          address: CONTRACTS.DEAL_ESCROW,
          abi: DEAL_ESCROW_ABI,
          functionName: 'getDealsForListing',
          args: [listing.listingId],
        }) as bigint[];

        for (const id of ids) {
          const d = await publicClient.readContract({
            address: CONTRACTS.DEAL_ESCROW,
            abi: DEAL_ESCROW_ABI,
            functionName: 'getDeal',
            args: [id],
          }) as [bigint, `0x${string}`, `0x${string}`, bigint, number, boolean, boolean, bigint];

          if (d[2].toLowerCase() === evmAddress.toLowerCase() || d[1].toLowerCase() === evmAddress.toLowerCase()) {
            setDealId(id);
            setDeal({
              listingId: d[0],
              seller: d[1],
              buyer: d[2],
              amount: d[3],
              status: d[4],
              sellerConfirmed: d[5],
              buyerConfirmed: d[6],
              timestamp: d[7],
            });
            break;
          }
        }
      } catch {
        // No deal found
      }
    };
    findDeal();
  }, [listing.listingId, evmAddress]);

  const joinDeal = async () => {
    if (!evmAddress) return;
    setIsJoining(true);
    setError(null);
    try {
      const client = await getWalletClient();
      if (!client) throw new Error('No wallet');

      // Approve USDT first
      const ERC20_ABI = [
        { type: 'function', name: 'approve', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] }
      ] as const;

      const { request: approveReq } = await publicClient.simulateContract({
        address: CONTRACTS.USDT,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [CONTRACTS.DEAL_ESCROW, listing.price],
        account: evmAddress,
      });
      await client.writeContract(approveReq);

      // Join deal
      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.DEAL_ESCROW,
        abi: DEAL_ESCROW_ABI,
        functionName: 'joinDeal',
        args: [listing.listingId],
        account: evmAddress,
      });
      const hash = await client.writeContract(request);
      setTxHash(hash);
      setIsJoining(false);

      // Refresh deal state after tx
      setTimeout(async () => {
        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        const log = receipt.logs.find((l) => l.topics[0]);
        if (log?.topics?.[1]) {
          const id = BigInt(log.topics[1]);
          setDealId(id);
        }
      }, 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join deal');
      setIsJoining(false);
    }
  };

  const markComplete = async () => {
    if (!evmAddress || !dealId) return;
    setIsActing(true);
    setError(null);
    try {
      const client = await getWalletClient();
      if (!client) throw new Error('No wallet');
      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.DEAL_ESCROW,
        abi: DEAL_ESCROW_ABI,
        functionName: 'markComplete',
        args: [dealId],
        account: evmAddress,
      });
      const hash = await client.writeContract(request);
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsActing(false);
    }
  };

  const raiseDispute = async () => {
    if (!evmAddress || !dealId) return;
    setIsActing(true);
    setError(null);
    try {
      const client = await getWalletClient();
      if (!client) throw new Error('No wallet');
      const { request } = await publicClient.simulateContract({
        address: CONTRACTS.DEAL_ESCROW,
        abi: DEAL_ESCROW_ABI,
        functionName: 'raiseDispute',
        args: [dealId],
        account: evmAddress,
      });
      const hash = await client.writeContract(request);
      setTxHash(hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Transaction failed');
    } finally {
      setIsActing(false);
    }
  };

  const sendTip = async () => {
    if (!nimAddress || !tipAmount) return;
    setIsTipping(true);
    try {
      await sendNIM(listing.seller, parseFloat(tipAmount), `vouch-tip-${listing.listingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tip failed');
    } finally {
      setIsTipping(false);
    }
  };

  const isSeller = evmAddress?.toLowerCase() === listing.seller.toLowerCase();
  const hasDispute = deal?.status === 4 || deal?.status === 5;

  return (
    <div className="space-y-6">
      {/* Back */}
      <motion.button
        onClick={onBack}
        className="flex items-center gap-2 text-sm text-indigo-400 hover:text-amber-300 transition-colors"
        whileHover={{ x: -3 }}
      >
        <ArrowLeft size={15} />
        Back to Feed
      </motion.button>

      {/* Listing header */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl border border-indigo-700/30 bg-indigo-950/60 space-y-4"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">{listing.meta.title}</h1>
            {listing.meta.description && (
              <p className="text-indigo-300 text-sm mt-1">{listing.meta.description}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <div className="text-2xl font-bold text-amber-400">
              ${formatUsdt(listing.price)}
            </div>
            <div className="text-xs text-indigo-500 mt-0.5">USDT</div>
          </div>
        </div>

        {/* Seller info */}
        <div className="flex items-center justify-between pt-3 border-t border-indigo-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center">
              <User size={13} className="text-white/80" />
            </div>
            <div>
              <p className="text-xs text-indigo-500">Seller</p>
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-mono text-indigo-200">{shortAddr(listing.seller)}</span>
                <TrustBadge score={sellerScore.score} size="sm" showLabel={false} />
              </div>
            </div>
          </div>
          <a
            href={`https://amoy.polygonscan.com/address/${listing.seller}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-500 hover:text-amber-400 transition-colors"
          >
            <ExternalLink size={13} />
          </a>
        </div>
      </motion.div>

      {/* Deal State */}
      {deal ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-4"
        >
          {/* Status bar */}
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-indigo-300">Deal Status</h2>
            <DealStatus status={deal.status as DealStatusCode} />
          </div>

          {/* Deal details */}
          <div className="p-4 rounded-xl border border-indigo-700/30 bg-indigo-950/50 space-y-3 text-sm">
            <div className="flex justify-between text-indigo-400">
              <span>Deal ID</span>
              <span className="font-mono text-indigo-200">#{String(dealId)}</span>
            </div>
            <div className="flex justify-between text-indigo-400">
              <span>Escrow Amount</span>
              <span className="text-amber-400 font-semibold">${formatUsdt(deal.amount)} USDT</span>
            </div>
            <div className="flex justify-between text-indigo-400">
              <span>Seller Confirmed</span>
              <span className={deal.sellerConfirmed ? 'text-emerald-400' : 'text-indigo-600'}>
                {deal.sellerConfirmed ? '✓ Yes' : '✗ No'}
              </span>
            </div>
            <div className="flex justify-between text-indigo-400">
              <span>Buyer Confirmed</span>
              <span className={deal.buyerConfirmed ? 'text-emerald-400' : 'text-indigo-600'}>
                {deal.buyerConfirmed ? '✓ Yes' : '✗ No'}
              </span>
            </div>
          </div>

          {/* Actions */}
          {deal.status === 0 || deal.status === 1 || deal.status === 2 ? (
            <div className="flex gap-3">
              <motion.button
                onClick={markComplete}
                disabled={isActing}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm bg-emerald-600/80 hover:bg-emerald-600 text-white disabled:opacity-40 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle size={15} />
                Mark Complete
              </motion.button>
              <motion.button
                onClick={raiseDispute}
                disabled={isActing}
                className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm bg-red-900/50 hover:bg-red-900/70 border border-red-600/40 text-red-300 disabled:opacity-40 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <AlertTriangle size={15} />
                Dispute
              </motion.button>
            </div>
          ) : null}

          {/* Dispute info */}
          {hasDispute && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-red-500/30 bg-red-900/20"
            >
              <div className="flex items-center gap-2 mb-3">
                <Gavel size={14} className="text-red-400" />
                <span className="text-sm font-semibold text-red-300">Dispute in Progress</span>
              </div>
              {dispute.jurors.length > 0 ? (
                <div className="space-y-2 text-xs text-indigo-300">
                  <div className="flex justify-between">
                    <span>Seller votes</span>
                    <span className="text-amber-400 font-bold">{String(dispute.sellerVotes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Buyer votes</span>
                    <span className="text-amber-400 font-bold">{String(dispute.buyerVotes)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Jurors</span>
                    <span className="text-indigo-400">{dispute.jurors.length}</span>
                  </div>
                  {dispute.isJuror && !dispute.hasVoted && !dispute.resolved && (
                    <div className="flex gap-2 mt-3">
                      <motion.button
                        onClick={() => dispute.castVote(true)}
                        className="flex-1 py-2 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold hover:bg-amber-500/30 transition-all"
                        whileHover={{ scale: 1.03 }}
                      >
                        Release to Seller
                      </motion.button>
                      <motion.button
                        onClick={() => dispute.castVote(false)}
                        className="flex-1 py-2 rounded-lg bg-blue-500/20 border border-blue-500/40 text-blue-300 text-xs font-semibold hover:bg-blue-500/30 transition-all"
                        whileHover={{ scale: 1.03 }}
                      >
                        Refund Buyer
                      </motion.button>
                    </div>
                  )}
                </div>
              ) : (
                <motion.button
                  onClick={() => dispute.selectJury()}
                  className="w-full py-2 rounded-lg bg-indigo-800/50 border border-indigo-600/40 text-indigo-300 text-xs font-semibold hover:border-amber-500/40 transition-all"
                  whileHover={{ scale: 1.02 }}
                >
                  Select Jury (anyone can trigger)
                </motion.button>
              )}
            </motion.div>
          )}

          {/* NIM Tip (after completed deal) */}
          {deal.status === 3 && !isSeller && nimAddress && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="p-4 rounded-xl border border-amber-500/20 bg-amber-900/10"
            >
              <p className="text-sm font-semibold text-amber-300 mb-3">💛 Send a NIM Tip to the Seller</p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <DollarSign size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-600" />
                  <input
                    type="number"
                    value={tipAmount}
                    onChange={(e) => setTipAmount(e.target.value)}
                    placeholder="1.0 NIM"
                    min="0.1"
                    step="0.1"
                    className="w-full bg-indigo-950/60 border border-amber-700/30 rounded-lg pl-7 pr-3 py-2 text-sm text-white placeholder-amber-900 focus:outline-none focus:border-amber-500/50 transition-all"
                  />
                </div>
                <motion.button
                  onClick={sendTip}
                  disabled={isTipping || !tipAmount}
                  className="px-4 py-2 rounded-lg bg-amber-500/20 border border-amber-400/50 text-amber-300 text-sm font-semibold disabled:opacity-40 hover:bg-amber-500/30 transition-all"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                >
                  {isTipping ? <Loader2 size={14} className="animate-spin" /> : 'Tip NIM'}
                </motion.button>
              </div>
            </motion.div>
          )}
        </motion.div>
      ) : (
        /* No deal yet — offer to join */
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {!isSeller && evmAddress ? (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-indigo-700/30 bg-indigo-950/50 text-sm text-indigo-300">
                <p className="font-semibold text-white mb-1">Join this Deal</p>
                <p>Send <span className="text-amber-400 font-bold">${formatUsdt(listing.price)} USDT</span> into escrow. Funds release only when both parties confirm completion — or via jury if disputed.</p>
              </div>
              <motion.button
                onClick={joinDeal}
                disabled={isJoining}
                className="w-full py-3.5 rounded-xl font-bold text-sm bg-gradient-to-r from-amber-500 to-yellow-400 text-indigo-950 disabled:opacity-40 shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 transition-all"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {isJoining ? (
                  <span className="flex items-center justify-center gap-2">
                    <motion.div className="w-4 h-4 border-2 border-indigo-950/30 border-t-indigo-950 rounded-full" animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
                    Joining Deal…
                  </span>
                ) : (
                  `Fund Escrow — $${formatUsdt(listing.price)} USDT`
                )}
              </motion.button>
            </div>
          ) : isSeller ? (
            <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-900/10 text-sm text-amber-300">
              This is your listing. Waiting for a buyer to join the deal.
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-indigo-700/30 bg-indigo-950/50 text-sm text-indigo-400">
              Connect your wallet to join this deal.
            </div>
          )}
        </motion.div>
      )}

      {/* Transaction link */}
      {txHash && (
        <motion.a
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          href={`https://amoy.polygonscan.com/tx/${txHash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 text-xs text-amber-400 hover:text-amber-300 transition-colors"
        >
          <ExternalLink size={12} />
          View transaction on Amoy Explorer
        </motion.a>
      )}

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-3 rounded-xl border border-red-500/30 bg-red-900/20 text-xs text-red-300 font-mono"
        >
          {error}
        </motion.div>
      )}
    </div>
  );
}
