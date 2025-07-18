// packages/sdk/src/constants.ts
import { PublicKey } from '@solana/web3.js';

export const PROGRAM_ID = new PublicKey('wV5jwseh9fQfrdHUbxafCfGpvuWbQaNYqQaBJS8vuVa');

export const SEEDS = {
  MARKET: 'market',
  USER_BET: 'user_bet',
} as const;

export const FEES = {
  CREATE_MARKET: 1_000_000_000, // 1 SOL
  BASE_COMMISSION_BPS: 25, // 0.25%
  LATE_COMMISSION_BPS: 50, // 0.50%
  EARLY_BET_THRESHOLD: 33, // 33%
} as const;

export const LIMITS = {
  MIN_BET_AMOUNT: 5_000_000, // 0.005 SOL
  MIN_VELOCITY: 100_000_000, // 0.1 SOL
} as const;