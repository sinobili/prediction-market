// packages/sdk/src/utils.ts
import { PublicKey, Connection } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { BN } from '@coral-xyz/anchor';
import { Market, MarketPhase, UserBet } from './types';
import { FEES, LIMITS } from './constants';

export class PredictionMarketUtils {
  // Calculate commission based on time
  static calculateCommission(
    amount: BN,
    currentTime: BN,
    marketStart: BN,
    marketEnd: BN
  ): { commission: BN; netAmount: BN } {
    const elapsedTime = currentTime.sub(marketStart);
    const totalDuration = marketEnd.sub(marketStart);
    const timePercentage = elapsedTime.mul(new BN(100)).div(totalDuration);

    const commissionBps = timePercentage.lte(new BN(FEES.EARLY_BET_THRESHOLD))
      ? FEES.BASE_COMMISSION_BPS
      : FEES.LATE_COMMISSION_BPS;

    const commission = amount.mul(new BN(commissionBps)).div(new BN(10000));
    const netAmount = amount.sub(commission);

    return { commission, netAmount };
  }

  // Calculate velocity limit
  static calculateVelocityLimit(
    totalPool: BN,
    currentTime: BN,
    endTime: BN
  ): BN {
    const timeRemaining = endTime.sub(currentTime);
    const hoursRemaining = timeRemaining.div(new BN(3600));

    if (totalPool.isZero() || hoursRemaining.isZero()) {
      return new BN(LIMITS.MIN_VELOCITY);
    }

    const dynamicLimit = totalPool
      .mul(new BN(20)) // 20% of pool
      .div(new BN(100))
      .div(hoursRemaining);

    return BN.max(dynamicLimit, new BN(LIMITS.MIN_VELOCITY));
  }

  // Calculate odds for each option
  static calculateOdds(market: Market): number[] {
    if (market.totalPool.isZero()) {
      return market.options.map(() => 0);
    }

    return market.optionPools.map(pool => 
      pool.mul(new BN(100)).div(market.totalPool).toNumber()
    );
  }

  // Calculate potential payout
  static calculatePotentialPayout(
    betAmount: BN,
    optionPool: BN,
    totalPool: BN
  ): BN {
    if (optionPool.isZero()) {
      return new BN(0);
    }

    return betAmount.mul(totalPool).div(optionPool);
  }

  // Format time remaining
  static formatTimeRemaining(endTime: BN, currentTime: BN): string {
    const remaining = endTime.sub(currentTime).toNumber();
    
    if (remaining <= 0) return 'Ended';
    
    const days = Math.floor(remaining / 86400);
    const hours = Math.floor((remaining % 86400) / 3600);
    const minutes = Math.floor((remaining % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  }

  // Validate market parameters
  static validateMarketParams(
    question: string,
    options: string[],
    endTime: BN,
    currentTime: BN
  ): { valid: boolean; error?: string } {
    if (question.length === 0 || question.length > 280) {
      return { valid: false, error: 'Question must be 1-280 characters' };
    }

    if (options.length < 2 || options.length > 10) {
      return { valid: false, error: 'Must have 2-10 options' };
    }

    if (options.some(opt => opt.length === 0 || opt.length > 100)) {
      return { valid: false, error: 'Options must be 1-100 characters' };
    }

    if (endTime.lte(currentTime)) {
      return { valid: false, error: 'End time must be in the future' };
    }

    const duration = endTime.sub(currentTime);
    if (duration.lt(new BN(3600))) {
      return { valid: false, error: 'Market must be at least 1 hour long' };
    }

    if (duration.gt(new BN(365 * 24 * 60 * 60))) {
      return { valid: false, error: 'Market cannot be longer than 1 year' };
    }

    return { valid: true };
  }
}