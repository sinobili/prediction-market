// packages/sdk/src/types.ts
import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Market {
  creator: PublicKey;
  marketId: BN;
  question: string;
  options: string[];
  startTime: BN;
  endTime: BN;
  resolutionTime: BN | null;
  optionPools: BN[];
  totalPool: BN;
  totalFees: BN;
  leadingOption: number | null;
  leadingSince: BN | null;
  phase: MarketPhase;
  winner: number | null;
  paused: boolean;
  bump: number;
}

// string enum to match the IDL structure
export enum MarketPhase {
  Betting = 'betting',
  Resolving = 'resolving', 
  Resolved = 'resolved',
  Cancelled = 'cancelled'
}

export interface UserBet {
  user: PublicKey;
  market: PublicKey;
  optionIndex: number;
  amount: BN;
  placedAt: BN;
  claimed: boolean;
  bump: number;
}

export interface CreateMarketParams {
  marketId: BN;
  question: string;
  options: string[];
  endTime: BN;
}

export interface PlaceBetParams {
  market: PublicKey;
  optionIndex: number;
  amount: BN;
}

// Event types for better type safety
export interface BetPlacedEvent {
  market: PublicKey;
  user: PublicKey;
  optionIndex: number;
  amount: BN;
  newPoolSize: BN;
  newOdds: BN[];
  timestamp: BN;
}

export interface MarketCreatedEvent {
  market: PublicKey;
  creator: PublicKey;
  marketId: BN;
  endTime: BN;
  optionsCount: number;
}

export interface MarketResolvedEvent {
  market: PublicKey;
  winningOption: number;
  totalPool: BN;
  winningPool: BN;
  resolutionTime: BN;
}

export interface WinningsClaimedEvent {
  market: PublicKey;
  user: PublicKey;
  payout: BN;
}

export interface MarketPausedChangedEvent {
  market: PublicKey;
  paused: boolean;
  admin: PublicKey;
}

export interface LeaderChangedEvent {
  market: PublicKey;
  newLeader: number;
  timestamp: BN;
}

export interface VelocityLimitTriggeredEvent {
  market: PublicKey;
  user: PublicKey;
  attemptedAmount: BN;
  limit: BN;
}

// Utility types
export interface MarketWithStats extends Market {
  odds: number[];
  timeRemaining: string;
  isActive: boolean;
}

export interface PredictionMarketError {
  code: number;
  name: string;
  message: string;
}

// RPC related types
export interface RpcConfig {
  commitment?: 'processed' | 'confirmed' | 'finalized';
  preflightCommitment?: 'processed' | 'confirmed' | 'finalized';
  skipPreflight?: boolean;
  maxRetries?: number;
  retryDelay?: number;
}