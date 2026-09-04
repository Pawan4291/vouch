# Vouch — Smart Contracts

Solidity contracts for the Vouch staked-reputation marketplace.  
Deployed on **Polygon Amoy testnet** (chainId 80002).

## Architecture

```
ReputationRegistry.sol  — Vouch staking, trust scores, slash
DealEscrow.sol          — Listings, escrow, completion, dispute trigger  
DisputeJury.sol         — Pseudo-random jury selection, voting, resolution
interfaces/
  IReputationRegistry.sol — Interface used by DealEscrow + DisputeJury
```

## Trust Score Formula

```
trustScore(user) = (totalVouchStake / $10 USDT) + completedDeals - (slashCount × 3)
                  capped at 0 (never negative)
```

No hardcoded starting score. New addresses start at 0 and earn it.

## Randomness Disclaimer

Jury selection uses `block.prevrandao` (RANDAO beacon). This is pseudo-random — a validator controlling block production could bias selection. For a hackathon/testnet this is acceptable. Production use requires Chainlink VRF or a commit-reveal scheme.

## Setup

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash
foundryup

# Install dependencies
cd contracts
forge install foundry-rs/forge-std

# Build
forge build

# Test (runs against Anvil — a real local EVM)
forge test -vvv
```

## Deploy to Polygon Amoy

```bash
# Set env vars (never commit these)
export DEPLOYER_PRIVATE_KEY=0x...
export POLYGONSCAN_API_KEY=...

# Deploy
forge script script/Deploy.s.sol \
  --rpc-url https://polygon-amoy.drpc.org \
  --broadcast \
  --verify \
  -vvvv

# Copy printed addresses into app/src/contracts/addresses.ts
```

## Amoy Faucet

Get free test POL: https://www.alchemy.com/faucets/polygon-amoy

## Explorer

https://amoy.polygonscan.com/
