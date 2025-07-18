// packages/sdk/tests/unit/utils.test.ts
import { BN } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PredictionMarketUtils } from '../../src/utils';
import { MarketPhase } from '../../src/types';
import { assert } from 'chai';

describe('PredictionMarketUtils', () => {
  describe('calculateCommission', () => {
    it('should calculate base commission for early bets', () => {
      const amount = new BN(1 * LAMPORTS_PER_SOL);
      const currentTime = new BN(1000);
      const marketStart = new BN(0);
      const marketEnd = new BN(10000); // 10% of time elapsed
      
      const { commission, netAmount } = PredictionMarketUtils.calculateCommission(
        amount,
        currentTime,
        marketStart,
        marketEnd
      );
      
      // Should use base commission (25 bps = 0.25%)
      const expectedCommission = amount.mul(new BN(25)).div(new BN(10000));
      assert.isTrue(commission.eq(expectedCommission));
      assert.isTrue(netAmount.eq(amount.sub(commission)));
    });

    it('should calculate late commission for late bets', () => {
      const amount = new BN(1 * LAMPORTS_PER_SOL);
      const currentTime = new BN(7000);
      const marketStart = new BN(0);
      const marketEnd = new BN(10000); // 70% of time elapsed
      
      const { commission, netAmount } = PredictionMarketUtils.calculateCommission(
        amount,
        currentTime,
        marketStart,
        marketEnd
      );
      
      // Should use late commission (50 bps = 0.50%)
      const expectedCommission = amount.mul(new BN(50)).div(new BN(10000));
      assert.isTrue(commission.eq(expectedCommission));
      assert.isTrue(netAmount.eq(amount.sub(commission)));
    });

    it('should handle boundary case at 33% threshold', () => {
      const amount = new BN(1 * LAMPORTS_PER_SOL);
      const currentTime = new BN(3300);
      const marketStart = new BN(0);
      const marketEnd = new BN(10000); // Exactly 33% elapsed
      
      const { commission } = PredictionMarketUtils.calculateCommission(
        amount,
        currentTime,
        marketStart,
        marketEnd
      );
      
      // Should still use base commission at exactly 33%
      const expectedCommission = amount.mul(new BN(25)).div(new BN(10000));
      assert.isTrue(commission.eq(expectedCommission));
    });
  });

  describe('calculateVelocityLimit', () => {
    it('should return minimum velocity for zero pool', () => {
      const totalPool = new BN(0);
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.add(new BN(3600)); // 1 hour
      
      const limit = PredictionMarketUtils.calculateVelocityLimit(
        totalPool,
        currentTime,
        endTime
      );
      
      assert.isTrue(limit.eq(new BN(100_000_000))); // MIN_VELOCITY
    });

    it('should calculate dynamic limit for non-zero pool', () => {
      const totalPool = new BN(10 * LAMPORTS_PER_SOL);
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.add(new BN(3600)); // 1 hour
      
      const limit = PredictionMarketUtils.calculateVelocityLimit(
        totalPool,
        currentTime,
        endTime
      );
      
      // Should be greater than minimum
      assert.isTrue(limit.gt(new BN(100_000_000)));
      
      // Should be reasonable (20% of pool)
      const expectedLimit = totalPool.mul(new BN(20)).div(new BN(100));
      assert.isTrue(limit.gte(expectedLimit) || limit.eq(new BN(100_000_000)));
    });

    it('should return minimum velocity for zero time remaining', () => {
      const totalPool = new BN(10 * LAMPORTS_PER_SOL);
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime; // No time remaining
      
      const limit = PredictionMarketUtils.calculateVelocityLimit(
        totalPool,
        currentTime,
        endTime
      );
      
      assert.isTrue(limit.eq(new BN(100_000_000))); // MIN_VELOCITY
    });
  });

  describe('calculateOdds', () => {
    it('should return zero odds for empty pool', () => {
      const market = {
        totalPool: new BN(0),
        optionPools: [new BN(0), new BN(0)],
        options: ['Yes', 'No']
      } as any;
      
      const odds = PredictionMarketUtils.calculateOdds(market);
      
      assert.deepEqual(odds, [0, 0]);
    });

    it('should calculate correct odds for balanced pool', () => {
      const market = {
        totalPool: new BN(1000),
        optionPools: [new BN(500), new BN(500)],
        options: ['Yes', 'No']
      } as any;
      
      const odds = PredictionMarketUtils.calculateOdds(market);
      
      assert.deepEqual(odds, [50, 50]); // 50% each
    });

    it('should calculate correct odds for unbalanced pool', () => {
      const market = {
        totalPool: new BN(1000),
        optionPools: [new BN(700), new BN(300)],
        options: ['Yes', 'No']
      } as any;
      
      const odds = PredictionMarketUtils.calculateOdds(market);
      
      assert.deepEqual(odds, [70, 30]); // 70% vs 30%
    });
  });

  describe('calculatePotentialPayout', () => {
    it('should return zero for zero option pool', () => {
      const betAmount = new BN(100);
      const optionPool = new BN(0);
      const totalPool = new BN(1000);
      
      const payout = PredictionMarketUtils.calculatePotentialPayout(
        betAmount,
        optionPool,
        totalPool
      );
      
      assert.isTrue(payout.eq(new BN(0)));
    });

    it('should calculate correct payout', () => {
      const betAmount = new BN(100);
      const optionPool = new BN(200);
      const totalPool = new BN(1000);
      
      const payout = PredictionMarketUtils.calculatePotentialPayout(
        betAmount,
        optionPool,
        totalPool
      );
      
      // Payout = betAmount * totalPool / optionPool = 100 * 1000 / 200 = 500
      assert.isTrue(payout.eq(new BN(500)));
    });
  });

  describe('formatTimeRemaining', () => {
    it('should return "Ended" for past time', () => {
      const endTime = new BN(1000);
      const currentTime = new BN(2000);
      
      const formatted = PredictionMarketUtils.formatTimeRemaining(endTime, currentTime);
      
      assert.equal(formatted, 'Ended');
    });

    it('should format days and hours', () => {
      const currentTime = new BN(0);
      const endTime = new BN(90000); // 25 hours = 1d 1h
      
      const formatted = PredictionMarketUtils.formatTimeRemaining(endTime, currentTime);
      
      assert.equal(formatted, '1d 1h');
    });

    it('should format hours and minutes', () => {
      const currentTime = new BN(0);
      const endTime = new BN(3900); // 65 minutes = 1h 5m
      
      const formatted = PredictionMarketUtils.formatTimeRemaining(endTime, currentTime);
      
      assert.equal(formatted, '1h 5m');
    });

    it('should format minutes only', () => {
      const currentTime = new BN(0);
      const endTime = new BN(300); // 5 minutes
      
      const formatted = PredictionMarketUtils.formatTimeRemaining(endTime, currentTime);
      
      assert.equal(formatted, '5m');
    });
  });

  describe('validateMarketParams', () => {
    it('should validate correct parameters', () => {
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.add(new BN(7200)); // 2 hours
      
      const result = PredictionMarketUtils.validateMarketParams(
        "Will BTC reach $100k?",
        ["Yes", "No"],
        endTime,
        currentTime
      );
      
      assert.isTrue(result.valid);
      assert.isUndefined(result.error);
    });

    it('should reject empty question', () => {
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.add(new BN(7200));
      
      const result = PredictionMarketUtils.validateMarketParams(
        "",
        ["Yes", "No"],
        endTime,
        currentTime
      );
      
      assert.isFalse(result.valid);
      assert.include(result.error!, 'Question must be 1-280 characters');
    });

    it('should reject too long question', () => {
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.add(new BN(7200));
      const longQuestion = 'a'.repeat(281);
      
      const result = PredictionMarketUtils.validateMarketParams(
        longQuestion,
        ["Yes", "No"],
        endTime,
        currentTime
      );
      
      assert.isFalse(result.valid);
      assert.include(result.error!, 'Question must be 1-280 characters');
    });

    it('should reject invalid option count', () => {
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.add(new BN(7200));
      
      const result = PredictionMarketUtils.validateMarketParams(
        "Valid question?",
        ["Only one option"],
        endTime,
        currentTime
      );
      
      assert.isFalse(result.valid);
      assert.include(result.error!, 'Must have 2-10 options');
    });

    it('should reject end time in past', () => {
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.sub(new BN(3600)); // 1 hour ago
      
      const result = PredictionMarketUtils.validateMarketParams(
        "Valid question?",
        ["Yes", "No"],
        endTime,
        currentTime
      );
      
      assert.isFalse(result.valid);
      assert.include(result.error!, 'End time must be in the future');
    });

    it('should reject too short duration', () => {
      const currentTime = new BN(Date.now() / 1000);
      const endTime = currentTime.add(new BN(1800)); // 30 minutes
      
      const result = PredictionMarketUtils.validateMarketParams(
        "Valid question?",
        ["Yes", "No"],
        endTime,
        currentTime
      );
      
      assert.isFalse(result.valid);
      assert.include(result.error!, 'Market must be at least 1 hour long');
    });
  });
});