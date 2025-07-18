// packages/sdk/tests/sdk.test.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';
import { PredictionMarketClient, PredictionMarketUtils } from '../src';
import { assert } from 'chai';

describe('PredictionMarket SDK', () => {
  it('should calculate commission correctly', () => {
    const amount = new BN(1 * LAMPORTS_PER_SOL);
    const currentTime = new BN(1000);
    const marketStart = new BN(0);
    const marketEnd = new BN(10000);
    
    // Early bet (10% of time passed)
    const { commission, netAmount } = PredictionMarketUtils.calculateCommission(
      amount,
      currentTime,
      marketStart,
      marketEnd
    );
    
    assert.equal(commission.toNumber(), amount.toNumber() * 25 / 10000);
    assert.equal(netAmount.toNumber(), amount.toNumber() - commission.toNumber());
  });

  it('should calculate velocity limit', () => {
    const totalPool = new BN(10 * LAMPORTS_PER_SOL);
    const currentTime = new BN(Date.now() / 1000);
    const endTime = currentTime.add(new BN(3600)); // 1 hour
    
    const limit = PredictionMarketUtils.calculateVelocityLimit(
      totalPool,
      currentTime,
      endTime
    );
    
    assert.isAbove(limit.toNumber(), 0);
  });

  it('should validate market params', () => {
    const currentTime = new BN(Date.now() / 1000);
    const endTime = currentTime.add(new BN(7200)); // 2 hours
    
    const result = PredictionMarketUtils.validateMarketParams(
      "Who will win?",
      ["Option A", "Option B"],
      endTime,
      currentTime
    );
    
    assert.isTrue(result.valid);
  });
});