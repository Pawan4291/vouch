import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useMotionValue, useSpring } from 'framer-motion';
import {
  LayoutGrid,
  Plus,
  Shield,
  User,
  Gavel,
  Zap,
  ChevronRight,
  Star,
  ExternalLink,
  X,
  Menu,
} from 'lucide-react';
import { useWallet } from './hooks/useWallet';
import { ConnectButton } from './components/ConnectButton';
import { Feed } from './pages/Feed';
import { CreateListing } from './pages/CreateListing';
import { DealRoom } from './pages/DealRoom';
import { Profile } from './pages/Profile';
import { VouchPage } from './pages/Vouch';
import { Disputes } from './pages/Disputes';
import type { Listing } from './hooks/useListings';

// ─── Particle / background animation ─────────────────────────────────────────

function FloatingParticle({ delay, x, y, size }: { delay: number; x: number; y: number; size: number }) {
  return (
    <motion.div
      className="absolute rounded-full pointer-events-none"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        width: size,
        height: size,
        background: 'radial-gradient(circle, rgba(245,200,66,0.6) 0%, rgba(245,200,66,0) 70%)',
      }}
      animate={{
        y: [0, -40, 0],
        opacity: [0, 0.6, 0],
        scale: [0.5, 1.2, 0.5],
      }}
      transition={{
        duration: 4 + Math.random() * 3,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    />
  );
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  delay: i * 0.4,
  x: Math.random() * 100,
  y: Math.random() * 100,
  size: 2 + Math.random() * 6,
}));

// ─── Animated grid lines in background ───────────────────────────────────────

function GridBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="rgba(245,200,66,1)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Radial gradient vignette */}
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse at 50% 50%, transparent 40%, #0d0920 100%)' }}
      />
      {/* Ambient glow blobs */}
      <motion.div
        className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(99,60,220,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }}
        animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(circle, rgba(245,200,66,0.05) 0%, transparent 70%)', filter: 'blur(40px)' }}
        animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.7, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
      />
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

type PageId = 'feed' | 'create' | 'vouch' | 'disputes' | 'profile';

const NAV_ITEMS: { id: PageId; label: string; icon: React.ReactNode }[] = [
  { id: 'feed',     label: 'Feed',      icon: <LayoutGrid size={18} /> },
  { id: 'create',   label: 'Post',      icon: <Plus size={18} /> },
  { id: 'vouch',    label: 'Vouch',     icon: <Shield size={18} /> },
  { id: 'disputes', label: 'Disputes',  icon: <Gavel size={18} /> },
  { id: 'profile',  label: 'Profile',   icon: <User size={18} /> },
];

// ─── Logo mark ────────────────────────────────────────────────────────────────

function Logo({ size = 28 }: { size?: number }) {
  return (
    <motion.div
      className="relative flex items-center justify-center rounded-xl overflow-hidden"
      style={{ width: size, height: size, background: 'linear-gradient(135deg, #1e1060, #2d1875)' }}
      whileHover={{ rotate: [0, -5, 5, 0] }}
      transition={{ duration: 0.4 }}
    >
      <Shield size={size * 0.55} className="text-amber-400" fill="rgba(245,200,66,0.15)" />
      <motion.div
        className="absolute inset-0 rounded-xl"
        animate={{ boxShadow: ['0 0 0px rgba(245,200,66,0.2)', '0 0 12px rgba(245,200,66,0.5)', '0 0 0px rgba(245,200,66,0.2)'] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </motion.div>
  );
}

// ─── Cursor glow ──────────────────────────────────────────────────────────────

function CursorGlow() {
  const x = useMotionValue(-200);
  const y = useMotionValue(-200);
  const springX = useSpring(x, { damping: 25, stiffness: 200 });
  const springY = useSpring(y, { damping: 25, stiffness: 200 });

  useEffect(() => {
    const move = (e: MouseEvent) => { x.set(e.clientX); y.set(e.clientY); };
    window.addEventListener('mousemove', move);
    return () => window.removeEventListener('mousemove', move);
  }, [x, y]);

  return (
    <motion.div
      className="fixed pointer-events-none z-0 rounded-full"
      style={{
        left: springX,
        top: springY,
        width: 300,
        height: 300,
        x: '-50%',
        y: '-50%',
        background: 'radial-gradient(circle, rgba(245,200,66,0.06) 0%, transparent 70%)',
      }}
    />
  );
}

// ─── Typing headline ──────────────────────────────────────────────────────────

const HEADLINES = [
  'Trust, staked on-chain.',
  'Reputation that travels.',
  'Vouch for your people.',
  'Disputes settled by peers.',
  'Deals backed by real stakes.',
];

function TypingHeadline() {
  const [idx, setIdx] = useState(0);
  const [displayed, setDisplayed] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const text = HEADLINES[idx];
    let timeout: ReturnType<typeof setTimeout>;

    if (!deleting && displayed.length < text.length) {
      timeout = setTimeout(() => setDisplayed(text.slice(0, displayed.length + 1)), 55);
    } else if (!deleting && displayed.length === text.length) {
      timeout = setTimeout(() => setDeleting(true), 2200);
    } else if (deleting && displayed.length > 0) {
      timeout = setTimeout(() => setDisplayed(displayed.slice(0, -1)), 28);
    } else if (deleting && displayed.length === 0) {
      setDeleting(false);
      setIdx((i) => (i + 1) % HEADLINES.length);
    }

    return () => clearTimeout(timeout);
  }, [displayed, deleting, idx]);

  return (
    <span className="bg-gradient-to-r from-amber-400 to-yellow-300 bg-clip-text text-transparent">
      {displayed}
      <motion.span
        className="inline-block w-0.5 h-7 bg-amber-400 ml-0.5 align-middle"
        animate={{ opacity: [1, 0, 1] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      />
    </span>
  );
}

// ─── Orbiting rings animation ─────────────────────────────────────────────────

function OrbitRings() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {[220, 320, 420].map((r, i) => (
        <motion.div
          key={r}
          className="absolute rounded-full border"
          style={{
            width: r,
            height: r,
            borderColor: `rgba(245, 200, 66, ${0.06 - i * 0.015})`,
            borderStyle: 'dashed',
          }}
          animate={{ rotate: i % 2 === 0 ? 360 : -360 }}
          transition={{ duration: 20 + i * 8, repeat: Infinity, ease: 'linear' }}
        />
      ))}
      {/* Orbiting dot */}
      <motion.div
        className="absolute"
        style={{ width: 280, height: 280 }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-400"
          style={{ boxShadow: '0 0 8px rgba(245,200,66,0.8)' }}
        />
      </motion.div>
      <motion.div
        className="absolute"
        style={{ width: 380, height: 380 }}
        animate={{ rotate: -360 }}
        transition={{ duration: 10, repeat: Infinity, ease: 'linear' }}
      >
        <div
          className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-indigo-400"
          style={{ boxShadow: '0 0 6px rgba(99,102,241,0.8)' }}
        />
      </motion.div>
    </div>
  );
}

// ─── Hero splash (first visit) ────────────────────────────────────────────────

function Hero({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center text-center px-6"
      style={{ background: 'linear-gradient(160deg, #0d0920 0%, #100d30 50%, #0d0920 100%)' }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.6 }}
    >
      <GridBackground />
      <OrbitRings />
      {PARTICLES.map((p) => <FloatingParticle key={p.id} {...p} />)}

      {/* Logo + wordmark */}
      <motion.div
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="flex items-center gap-3 mb-8"
      >
        <Logo size={44} />
        <span className="text-4xl font-black text-white tracking-tight">Vouch</span>
      </motion.div>

      {/* Headline */}
      <motion.h1
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-3xl sm:text-4xl font-extrabold text-white mb-3 leading-tight max-w-md"
      >
        <TypingHeadline />
      </motion.h1>

      <motion.p
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.35 }}
        className="text-indigo-400 text-base max-w-sm leading-relaxed mb-10"
      >
        A staked-reputation marketplace for Nimiq Pay. All state lives on Polygon — no backend, no trust needed.
      </motion.p>

      {/* Feature pills */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.45 }}
        className="flex flex-wrap justify-center gap-2 mb-10"
      >
        {[
          { icon: <Shield size={12} />, text: 'Staked Vouch' },
          { icon: <Gavel size={12} />, text: 'Jury Disputes' },
          { icon: <Zap size={12} />, text: 'NIM + USDT' },
          { icon: <Star size={12} />, text: 'On-Chain Rep' },
        ].map((f) => (
          <span
            key={f.text}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border border-amber-500/30 bg-amber-500/10 text-amber-300"
          >
            {f.icon}
            {f.text}
          </span>
        ))}
      </motion.div>

      {/* CTA */}
      <motion.button
        initial={{ y: 20, opacity: 0, scale: 0.9 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ delay: 0.55 }}
        onClick={onEnter}
        className="flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-lg text-indigo-950"
        style={{ background: 'linear-gradient(135deg, #f5c842, #e8a020)' }}
        whileHover={{ scale: 1.05, boxShadow: '0 0 40px rgba(245,200,66,0.5)' }}
        whileTap={{ scale: 0.97 }}
      >
        Open Marketplace
        <ChevronRight size={20} />
      </motion.button>

      {/* Chain badges */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="flex items-center gap-4 mt-10 text-xs text-indigo-600"
      >
        <span>Polygon Amoy (chain 80002)</span>
        <span>·</span>
        <span>NIM via Nimiq Pay</span>
        <span>·</span>
        <a
          href="https://amoy.polygonscan.com"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 hover:text-amber-400 transition-colors"
        >
          Explorer <ExternalLink size={9} />
        </a>
      </motion.div>
    </motion.div>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [showHero, setShowHero] = useState(true);
  const [activePage, setActivePage] = useState<PageId>('feed');
  const [selectedListing, setSelectedListing] = useState<{ id: bigint; listing: Listing } | null>(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const wallet = useWallet();
  const contentRef = useRef<HTMLDivElement>(null);

  // Fake-data audit: confirm nothing in this file ever returns hardcoded listings
  // All listings come from fetchListings() → publicClient.getContractEvents() in lib/rpc.ts

  const navigate = (page: PageId) => {
    setActivePage(page);
    setSelectedListing(null);
    setMobileNavOpen(false);
    contentRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // When a listing is selected from Feed, show DealRoom
  const handleSelectListing = async (listingId: bigint) => {
    // We need the full listing object — fetch from the listings hook context
    // For now, store the id and let DealRoom fetch it
    const { fetchListings, parseListingMeta } = await import('./lib/rpc');
    const all = await fetchListings();
    const raw = all.find((l) => l.listingId === listingId);
    if (raw) {
      setSelectedListing({ id: listingId, listing: { ...raw, meta: parseListingMeta(raw.metadataURI) } });
    }
  };

  return (
    <>
      {/* Cursor glow (desktop) */}
      <CursorGlow />

      {/* Hero splash */}
      <AnimatePresence>
        {showHero && <Hero onEnter={() => setShowHero(false)} />}
      </AnimatePresence>

      {/* Main shell */}
      <div
        className="fixed inset-0 flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(160deg, #0d0920 0%, #100d30 60%, #0d0920 100%)' }}
      >
        <GridBackground />
        {PARTICLES.slice(0, 8).map((p) => <FloatingParticle key={p.id} {...p} />)}

        {/* ── Top bar ───────────────────────────────────────────── */}
        <motion.header
          initial={{ y: -60 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.3, type: 'spring', stiffness: 120 }}
          className="relative z-20 flex items-center justify-between px-4 py-3 border-b border-indigo-800/30 backdrop-blur-sm"
          style={{ background: 'rgba(13, 9, 32, 0.85)' }}
        >
          <button onClick={() => navigate('feed')} className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-lg font-black text-white tracking-tight">Vouch</span>
            <motion.span
              className="px-1.5 py-0.5 rounded text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20"
              animate={{ opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              TESTNET
            </motion.span>
          </button>

          <div className="flex items-center gap-2">
            {/* NIM indicator */}
            {wallet.isNimConnected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-900/20 border border-amber-700/30 text-xs text-amber-400"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                NIM
              </motion.div>
            )}

            <ConnectButton wallet={wallet} />

            {/* Mobile hamburger */}
            <motion.button
              className="sm:hidden p-2 rounded-lg bg-indigo-900/50 border border-indigo-700/30 text-indigo-300"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
              whileTap={{ scale: 0.9 }}
            >
              {mobileNavOpen ? <X size={18} /> : <Menu size={18} />}
            </motion.button>
          </div>
        </motion.header>

        {/* ── Mobile nav drawer ─────────────────────────────────── */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="sm:hidden relative z-20 border-b border-indigo-800/30 px-4 py-2 flex gap-2 overflow-x-auto scrollbar-none"
              style={{ background: 'rgba(13, 9, 32, 0.95)' }}
            >
              {NAV_ITEMS.map((item) => (
                <motion.button
                  key={item.id}
                  onClick={() => navigate(item.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                    activePage === item.id
                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                      : 'text-indigo-400 bg-indigo-900/40 border border-indigo-700/20 hover:text-amber-300'
                  }`}
                  whileTap={{ scale: 0.95 }}
                >
                  {item.icon}
                  {item.label}
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Body ─────────────────────────────────────────────────── */}
        <div className="relative z-10 flex flex-1 overflow-hidden">
          {/* Desktop sidebar nav */}
          <motion.nav
            initial={{ x: -80, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4, type: 'spring', stiffness: 100 }}
            className="hidden sm:flex flex-col w-[72px] border-r border-indigo-800/20 py-4 gap-1 flex-shrink-0"
            style={{ background: 'rgba(13, 9, 32, 0.6)' }}
          >
            {NAV_ITEMS.map((item) => (
              <motion.button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`relative flex flex-col items-center gap-1 mx-2 py-3 rounded-xl text-xs font-medium transition-all ${
                  activePage === item.id
                    ? 'text-amber-300'
                    : 'text-indigo-500 hover:text-indigo-300'
                }`}
                whileHover={{ scale: 1.08 }}
                whileTap={{ scale: 0.93 }}
              >
                {/* Active indicator */}
                {activePage === item.id && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute inset-0 rounded-xl border border-amber-500/30"
                    style={{ background: 'rgba(245,200,66,0.08)' }}
                    transition={{ type: 'spring', stiffness: 250, damping: 25 }}
                  />
                )}
                <span className="relative z-10">{item.icon}</span>
                <span className="relative z-10 text-[10px]">{item.label}</span>
              </motion.button>
            ))}
          </motion.nav>

          {/* Page content */}
          <main
            ref={contentRef}
            className="flex-1 overflow-y-auto"
            style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(100,80,180,0.3) transparent' }}
          >
            <div className="max-w-2xl mx-auto px-4 py-6 pb-24 sm:pb-6">
              <AnimatePresence mode="wait">
                {selectedListing ? (
                  <motion.div
                    key="deal-room"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <DealRoom
                      listing={selectedListing.listing}
                      evmAddress={wallet.evmAddress}
                      nimAddress={wallet.nimAddress}
                      onBack={() => setSelectedListing(null)}
                    />
                  </motion.div>
                ) : activePage === 'feed' ? (
                  <motion.div
                    key="feed"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Feed onSelectListing={handleSelectListing} />
                  </motion.div>
                ) : activePage === 'create' ? (
                  <motion.div
                    key="create"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                  >
                    <CreateListing
                      evmAddress={wallet.evmAddress}
                      nimAddress={wallet.nimAddress}
                      isEvmConnected={wallet.isEvmConnected}
                      onCreated={(id) => handleSelectListing(id)}
                    />
                  </motion.div>
                ) : activePage === 'vouch' ? (
                  <motion.div
                    key="vouch"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                  >
                    <VouchPage
                      evmAddress={wallet.evmAddress}
                      isEvmConnected={wallet.isEvmConnected}
                    />
                  </motion.div>
                ) : activePage === 'disputes' ? (
                  <motion.div
                    key="disputes"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Disputes evmAddress={wallet.evmAddress} />
                  </motion.div>
                ) : activePage === 'profile' ? (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -16 }}
                    transition={{ duration: 0.3 }}
                  >
                    <Profile
                      evmAddress={wallet.evmAddress}
                      nimAddress={wallet.nimAddress}
                      nimBalance={wallet.nimBalance}
                    />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </main>
        </div>

        {/* ── Mobile bottom nav ──────────────────────────────────── */}
        <motion.nav
          initial={{ y: 80 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}
          className="sm:hidden relative z-20 flex border-t border-indigo-800/30 pb-safe"
          style={{ background: 'rgba(13, 9, 32, 0.95)', backdropFilter: 'blur(16px)' }}
        >
          {NAV_ITEMS.map((item) => (
            <motion.button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex-1 flex flex-col items-center gap-1 py-3 text-xs font-medium transition-all ${
                activePage === item.id ? 'text-amber-300' : 'text-indigo-500'
              }`}
              whileTap={{ scale: 0.9 }}
            >
              {activePage === item.id ? (
                <motion.div
                  layoutId="mobile-nav-active"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full"
                  style={{ width: `${100 / NAV_ITEMS.length}%`, left: `${(NAV_ITEMS.findIndex((n) => n.id === item.id) * 100) / NAV_ITEMS.length}%` }}
                />
              ) : null}
              {item.icon}
              <span className="text-[10px]">{item.label}</span>
            </motion.button>
          ))}
        </motion.nav>
      </div>
    </>
  );
}
