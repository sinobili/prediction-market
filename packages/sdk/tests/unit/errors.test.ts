// packages/sdk/tests/unit/errors.test.ts
import { assert } from 'chai';
import { 
  PredictionMarketError, 
  ErrorCode,
  createAccountNotFoundError,
  createInvalidAccountDataError 
} from '../../src/errors';
import { withRetry, CircuitBreaker } from '../../src/utils/retry';

describe('Error Handling', () => {
  describe('PredictionMarketError', () => {
    it('should create error with correct properties', () => {
      const error = new PredictionMarketError(
        ErrorCode.MARKET_NOT_ACTIVE,
        'Market is not active',
        undefined,
        { marketId: '123' }
      );
      
      assert.equal(error.code, ErrorCode.MARKET_NOT_ACTIVE);
      assert.equal(error.message, 'Market is not active');
      assert.equal(error.name, 'PredictionMarketError');
      assert.deepEqual(error.context, { marketId: '123' });
    });

    it('should determine if error is recoverable', () => {
      const recoverableError = new PredictionMarketError(
        ErrorCode.NETWORK_ERROR,
        'Network issue'
      );
      
      const nonRecoverableError = new PredictionMarketError(
        ErrorCode.MARKET_NOT_ACTIVE,
        'Market closed'
      );
      
      assert.isTrue(recoverableError.isRecoverable());
      assert.isFalse(nonRecoverableError.isRecoverable());
    });

    it('should provide user-friendly messages', () => {
      const error = new PredictionMarketError(
        ErrorCode.BET_TOO_SMALL,
        'Technical error message'
      );
      
      const userMessage = error.getUserFriendlyMessage();
      assert.equal(userMessage, 'Bet amount is too small. Minimum is 0.005 SOL');
    });

    it('should create from Anchor error', () => {
      const anchorError = {
        error: {
          errorCode: { code: 'BetTooSmall' },
          errorMessage: 'Bet amount too small'
        },
        logs: ['Program log: error']
      };
      
      const predictionError = PredictionMarketError.fromAnchorError(anchorError);
      
      assert.equal(predictionError.code, ErrorCode.BET_TOO_SMALL);
      assert.equal(predictionError.message, 'Bet amount too small');
      assert.deepEqual(predictionError.context?.logs, ['Program log: error']);
    });

    it('should create from RPC error', () => {
      const rpcError = new Error('Request timeout');
      
      const predictionError = PredictionMarketError.fromRpcError(rpcError);
      
      assert.equal(predictionError.code, ErrorCode.RPC_TIMEOUT);
      assert.include(predictionError.message, 'timeout');
    });
  });

  describe('Error Factory Functions', () => {
    it('should create account not found error', () => {
      const mockPublicKey = { toString: () => 'mock-address' } as any;
      const error = createAccountNotFoundError('Market', mockPublicKey);
      
      assert.equal(error.code, ErrorCode.ACCOUNT_NOT_FOUND);
      assert.include(error.message, 'Market');
      assert.equal(error.context?.accountType, 'Market');
    });

    it('should create invalid account data error', () => {
      const error = createInvalidAccountDataError('UserBet', 'missing user field');
      
      assert.equal(error.code, ErrorCode.INVALID_ACCOUNT_DATA);
      assert.include(error.message, 'UserBet');
      assert.include(error.message, 'missing user field');
    });
  });

  describe('Retry Mechanism', () => {
    it('should retry recoverable errors', async () => {
      let attemptCount = 0;
      
      const operation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new PredictionMarketError(ErrorCode.NETWORK_ERROR, 'Network issue');
        }
        return 'success';
      };
      
      const result = await withRetry(operation, { maxAttempts: 3, baseDelay: 10 });
      
      assert.equal(result, 'success');
      assert.equal(attemptCount, 3);
    });

    it('should not retry non-recoverable errors', async () => {
      let attemptCount = 0;
      
      const operation = async () => {
        attemptCount++;
        throw new PredictionMarketError(ErrorCode.MARKET_NOT_ACTIVE, 'Market closed');
      };
      
      try {
        await withRetry(operation, { maxAttempts: 3, baseDelay: 10 });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.equal(attemptCount, 1); // Should not retry
        assert.instanceOf(error, PredictionMarketError);
      }
    });

    it('should respect max attempts', async () => {
      let attemptCount = 0;
      
      const operation = async () => {
        attemptCount++;
        throw new PredictionMarketError(ErrorCode.NETWORK_ERROR, 'Network issue');
      };
      
      try {
        await withRetry(operation, { maxAttempts: 2, baseDelay: 10 });
        assert.fail('Should have thrown error');
      } catch (error) {
        assert.equal(attemptCount, 2);
        assert.instanceOf(error, PredictionMarketError);
      }
    });
  });

  describe('Circuit Breaker', () => {
    it('should open circuit after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000); // 2 failures, 1 second recovery
      
      const failingOperation = async () => {
        throw new Error('Service unavailable');
      };
      
      // First failure
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected
      }
      
      // Second failure - should open circuit
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected
      }
      
      const state = circuitBreaker.getState();
      assert.equal(state.state, 'OPEN');
      assert.equal(state.failureCount, 2);
    });

    it('should reject requests when circuit is open', async () => {
      const circuitBreaker = new CircuitBreaker(1, 1000); // 1 failure, 1 second recovery
      
      const failingOperation = async () => {
        throw new Error('Service unavailable');
      };
      
      // Trigger circuit opening
      try {
        await circuitBreaker.execute(failingOperation);
      } catch (error) {
        // Expected
      }
      
      // Should reject immediately without calling operation
      try {
        await circuitBreaker.execute(async () => 'should not be called');
        assert.fail('Should have thrown circuit breaker error');
      } catch (error) {
        assert.instanceOf(error, PredictionMarketError);
        assert.equal((error as PredictionMarketError).code, ErrorCode.NETWORK_ERROR);
        assert.include(error.message, 'Circuit breaker is OPEN');
      }
    });

    it('should reset on successful operation', async () => {
      const circuitBreaker = new CircuitBreaker(3, 1000);
      
      // Cause some failures but not enough to open circuit
      try {
        await circuitBreaker.execute(async () => { throw new Error('fail'); });
      } catch (error) { /* expected */ }
      
      try {
        await circuitBreaker.execute(async () => { throw new Error('fail'); });
      } catch (error) { /* expected */ }
      
      let state = circuitBreaker.getState();
      assert.equal(state.failureCount, 2);
      assert.equal(state.state, 'CLOSED');
      
      // Successful operation should reset failure count
      await circuitBreaker.execute(async () => 'success');
      
      state = circuitBreaker.getState();
      assert.equal(state.failureCount, 0);
      assert.equal(state.state, 'CLOSED');
    });
  });
});