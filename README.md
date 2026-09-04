# Vouch — Staked Reputation Marketplace

> A mini app for Nimiq Pay: post deals, fund on-chain escrow, build reputation by staking trust.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Chain: Polygon Amoy](https://img.shields.io/badge/Chain-Polygon%20Amoy-8247e5)](https://amoy.polygonscan.com)
[![NIM: Supported](https://img.shields.io/badge/NIM-Supported-blue)](https://nimiq.com)

## What is Vouch?

Vouch is a staked-reputation marketplace where:

- **Sellers** post listings (gigs, sales, tasks, services) on-chain
- **Buyers** fund escrow with USDT; funds release only when both confirm completion
- **Vouchers** stake USDT on friends' reputations — if a friend scams, the voucher's stake is slashed
- **Disputes** are settled by a randomly-selected jury of high-trust users

All state lives on Polygon smart contracts. No backend. No database. The frontend reads events directly.

## Why Two Chains?

| Chain | What it does |
|-------|-------------|
| **Polygon (EVM)** | Escrow, staking, reputation, jury votes — all smart contract logic |
| **NIM (Nimiq)** | Listing fees and tips — feeless, instant, native Nimiq Pay integration |

NIM is the native payment rail; it's used for listing fees and gratitude tips between buyer and seller after a completed deal. Every number in the UI comes from a real contract read.

## Architecture

```
contracts/
├── src/
│   ├── ReputationRegistry.sol  — vouchFor, slash, trustScore
│   ├── DealEscrow.sol          — createListing, joinDeal, markComplete, raiseDispute
│   └── DisputeJury.sol         — selectJury (block.prevrandao), castVote, resolve
app/
├── src/
│   ├── sdk/nimiqMiniApp.ts     — init(), sendNIM() via @nimiq/mini-app-sdk
│   ├── sdk/evmProvider.ts      — window.ethereum wrapper for Polygon
│   ├── lib/rpc.ts              — read-only viem client, fetchListings from events
│   ├── hooks/                  — useWallet, useTrustScore, useListings, useVouch, useDispute
│   └── pages/                  — Feed, CreateListing, DealRoom, Profile, Vouch, Disputes
```

## Trust Score Formula

```
trustScore = (totalVouchStake / $10 USDT) + completedDeals − (slashCount × 3)
```

New addresses start at 0. Earn it by completing deals and having others stake on you.

## Randomness Notice

Jury selection uses `block.prevrandao` (post-Merge RANDAO). This is pseudo-random and suitable for testnet/hackathon use. A validator could theoretically bias it. Production deployments should use Chainlink VRF.

## Development

### Contracts

```bash
cd contracts
forge install foundry-rs/forge-std
forge build
forge test -vvv
```

### Deploy to Polygon Amoy

```bash
export DEPLOYER_PRIVATE_KEY=0x...
forge script script/Deploy.s.sol \
  --rpc-url https://polygon-amoy.drpc.org \
  --broadcast -vvvv
# Copy addresses to app/src/contracts/addresses.ts
```

### Frontend

```bash
cd app  # or project root for this demo
npm install
npm run dev
```

## Deployed Contracts (Amoy Testnet)

| Contract | Address |
|----------|---------|
| ReputationRegistry | _Deploy and update addresses.ts_ |
| DealEscrow | _Deploy and update addresses.ts_ |
| DisputeJury | _Deploy and update addresses.ts_ |

## Competition Submission

- **Framework**: Nimiq Pay Mini Apps Framework
- **NIM Integration**: Listing fees + tips via `sendNIM()` (Nimiq Pay SDK)
- **USDT Integration**: Escrow, staking via Polygon USDT ERC-20
- **Open Source**: MIT License ✓
- **No hardcoded secrets** ✓
- **No fake/mock data** — all UI values from contract reads ✓

## License

[MIT](LICENSE) — required by Nimiq Mini Apps Competition rules.
