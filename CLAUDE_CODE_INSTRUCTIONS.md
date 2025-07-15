# Claude Code Instructions - Prediction Market

## 🚨 IMPORTANT: macOS ARM (M1/M2/M3) Setup

This project is configured for macOS ARM architecture. All dependencies are ARM-native.

## Project Overview
Oracle-free prediction market on Solana using Anchor framework.

## Initial Setup Commands
```bash
# 1. Clone and setup
cd ~/
git clone <repo-url> prediction-market
cd prediction-market

# 2. Install dependencies
pnpm install

# 3. Build Anchor program
anchor build

# 4. Run tests
anchor test --skip-local-validator

# 5. Start frontend
cd packages/web && pnpm dev