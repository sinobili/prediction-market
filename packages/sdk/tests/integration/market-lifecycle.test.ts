// packages/sdk/tests/integration/market-lifecycle.test.ts
import { BN } from '@coral-xyz/anchor';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { assert } from 'chai';
import { 
  TestEnvironment, 
  TestDataGenerator, 
  TestAssertions 
} from '../setup';
import { 
  PredictionMarketError, 
  ErrorCode 
} from '../../src/errors';
import { MarketPhase } from '../../src/types';

describe('Market Lifecycle Integration Tests', () => {
  let testEnv: TestEnvironment;

  before(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
  });

  after(async () => {
    await testEnv.cleanup();
  });

  describe('Market Creation', () => {
    it('should create a market successfully', async () => {
      const { marketId, marketPda } = await testEnv.createTestMarket();
      
      // Verify market exists and has correct data
      const market = await testEnv.client.fetchMarket(marketPda);
      assert.isNotNull(market);
      assert.isTrue(market!.marketId.eq(marketId));
      assert.equal(market!.phase, MarketPhase.Betting);
      assert.isFalse(market!.paused);
      assert.isNull(market!.winner);
    });

    it('should reject market with invalid parameters', async () => {
      const marketId = new BN(Date.now());
      const endTime = new BN(Math.floor(Date.now() / 1000) - 3600); // Past time
      
      try {
        await testEnv.client.createMarket(
          marketId,
          "Invalid market?",
          ["Yes", "No"],
          endTime,
          testEnv.platformAddress
        );
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.instanceOf(error, PredictionMarketError);
        // Should be validation error about end time
      }
    });

    it('should reject market with too long question', async () => {
      const marketId = new BN(Date.now());
      const endTime = TestDataGenerator.generateFutureTimestamp(24);
      const longQuestion = 'a'.repeat(281);
      
      try {
        await testEnv.client.createMarket(
          marketId,
          longQuestion,
          ["Yes", "No"],
          endTime,
          testEnv.platformAddress
        );
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.instanceOf(error, PredictionMarketError);
      }
    });

    it('should reject market with invalid option count', async () => {
      const marketId = new BN(Date.now());
      const endTime = TestDataGenerator.generateFutureTimestamp(24);
      
      try {
        await testEnv.client.createMarket(
          marketId,
          "Valid question?",
          ["Only one option"], // Invalid: only 1 option
          endTime,
          testEnv.platformAddress
        );
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.instanceOf(error, PredictionMarketError);
      }
    });
  });

  describe('Bet Placement', () => {
    let marketPda: any;
    let marketId: BN;

    beforeEach(async () => {
      const result = await testEnv.createTestMarket();
      marketPda = result.marketPda;
      marketId = result.marketId;
    });

    it('should place bet successfully', async () => {
      const betAmount = TestDataGenerator.generateBetAmount();
      const optionIndex = 0;
      
      const userClient = testEnv.createUserClient(0);
      
      const tx = await userClient.placeBet(marketPda, optionIndex, betAmount);
      assert.isString(tx);
      
      // Verify bet was recorded
      await TestAssertions.assertUserBetExists(
        userClient,
        testEnv.users[0].publicKey,
        marketPda
      );
      
      // Verify market state updated
      const market = await userClient.fetchMarket(marketPda);
      assert.isNotNull(market);
      TestAssertions.assertBNGreaterThan(market!.totalPool, new BN(0));
      TestAssertions.assertBNGreaterThan(market!.optionPools[optionIndex], new BN(0));
    });

    it('should reject bet below minimum amount', async () => {
      const betAmount = new BN(1000); // Below 0.005 SOL minimum
      const optionIndex = 0;
      
      const userClient = testEnv.createUserClient(0);
      
      try {
        await userClient.placeBet(marketPda, optionIndex, betAmount);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.instanceOf(error, PredictionMarketError);
        assert.equal((error as PredictionMarketError).code, ErrorCode.BET_TOO_SMALL);
      }
    });

    it('should reject bet on invalid option index', async () => {
      const betAmount = TestDataGenerator.generateBetAmount();
      const invalidOptionIndex = 99;
      
      const userClient = testEnv.createUserClient(0);
      
      try {
        await userClient.placeBet(marketPda, invalidOptionIndex, betAmount);
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.instanceOf(error, PredictionMarketError);
        assert.equal((error as PredictionMarketError).code, ErrorCode.INVALID_OPTION_INDEX);
      }
    });

    it('should handle multiple bets from same user', async () => {
      const betAmount1 = TestDataGenerator.generateBetAmount();
      const betAmount2 = TestDataGenerator.generateBetAmount();
      const optionIndex = 0;
      
      const userClient = testEnv.createUserClient(0);
      
      // Place first bet
      await userClient.placeBet(marketPda, optionIndex, betAmount1);
      
      // Place second bet on same option
      await userClient.placeBet(marketPda, optionIndex, betAmount2);
      
      // Verify total bet amount
      const [userBetPda] = userClient.instructions.constructor.findUserBetPDA(
        testEnv.users[0].publicKey,
        marketPda
      );
      const userBet = await userClient.fetchUserBet(userBetPda);
      
      assert.isNotNull(userBet);
      const expectedTotal = betAmount1.add(betAmount2);
      TestAssertions.assertBNEqual(userBet!.amount, expectedTotal);
    });

    it('should handle bets from multiple users', async () => {
      const betAmount = TestDataGenerator.generateBetAmount();
      
      // User 0 bets on option 0
      const userClient0 = testEnv.createUserClient(0);
      await userClient0.placeBet(marketPda, 0, betAmount);
      
      // User 1 bets on option 1
      const userClient1 = testEnv.createUserClient(1);
      await userClient1.placeBet(marketPda, 1, betAmount);
      
      // Verify market state
      const market = await testEnv.client.fetchMarket(marketPda);
      assert.isNotNull(market);
      
      // Both option pools should have funds
      TestAssertions.assertBNGreaterThan(market!.optionPools[0], new BN(0));
      TestAssertions.assertBNGreaterThan(market!.optionPools[1], new BN(0));
      
      // Total pool should be sum of both bets (minus commission)
      TestAssertions.assertBNGreaterThan(market!.totalPool, betAmount);
    });
  });

  describe('Market Resolution', () => {
    let marketPda: any;
    let marketId: BN;

    beforeEach(async () => {
      const result = await testEnv.createTestMarket();
      marketPda = result.marketPda;
      marketId = result.marketId;
    });

    it('should reject resolution before end time', async () => {
      try {
        await testEnv.client.program.methods
          .resolveMarket()
          .accounts({
            market: marketPda,
            creator: testEnv.payer.publicKey,
            clock: testEnv.client.program.provider.connection,
          })
          .rpc();
        
        assert.fail('Should have thrown error');
      } catch (error) {
        // Should fail because market hasn't ended yet
        assert.isTrue(error.toString().includes('MarketNotEnded'));
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', async () => {
      // Create client with invalid RPC endpoint
      const invalidConnection = new testEnv.connection.constructor('http://invalid-url:8899');
      const wallet = testEnv.client.wallet;
      
      // This should be handled by retry mechanism
      // For testing, we'll just verify error structure
      try {
        await invalidConnection.getLatestBlockhash();
        assert.fail('Should have thrown network error');
      } catch (error) {
        // Verify it's a network error
        assert.isTrue(
          error.toString().includes('fetch') || 
          error.toString().includes('network') ||
          error.toString().includes('ENOTFOUND')
        );
      }
    });

    it('should handle account not found errors', async () => {
      const nonExistentPda = testEnv.users[0].publicKey; // Random address
      
      const market = await testEnv.client.fetchMarket(nonExistentPda);
      assert.isNull(market); // Should return null, not throw
    });
  });

  describe('Health Check', () => {
    it('should perform health check successfully', async () => {
      const health = await testEnv.client.healthCheck();
      
      assert.isTrue(health.connection);
      assert.isTrue(health.program);
      assert.equal(health.circuitBreakerState.state, 'CLOSED');
    });
  });
});