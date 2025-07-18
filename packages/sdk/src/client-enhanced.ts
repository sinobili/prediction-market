// packages/sdk/src/client-enhanced.ts
import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { PredictionMarketInstructions } from './instructions';
import { PredictionMarketUtils } from './utils';
import { Market, UserBet, MarketPhase } from './types';
import { PROGRAM_ID } from './constants';
import { 
  PredictionMarketError, 
  ErrorCode, 
  createAccountNotFoundError,
  createInvalidAccountDataError 
} from './errors';
import { withRetry, CircuitBreaker, DEFAULT_RETRY_OPTIONS } from './utils/retry';

// Import IDL as JSON
const IDL = require('./prediction_market.json');

export class PredictionMarketClient {
  public program: Program<any>;
  public instructions: PredictionMarketInstructions;
  public utils = PredictionMarketUtils;
  public provider: AnchorProvider;
  private circuitBreaker: CircuitBreaker;

  constructor(
    connection: Connection,
    wallet: anchor.Wallet,
    programId: PublicKey = PROGRAM_ID,
    opts?: anchor.web3.ConfirmOptions
  ) {
    this.provider = new AnchorProvider(
      connection,
      wallet,
      opts || AnchorProvider.defaultOptions()
    );
    
    // Create a modified IDL with custom program ID
    const customIdl = {
      ...IDL,
      address: programId.toString()
    };
    
    this.program = new Program(
      customIdl as any,
      this.provider
    );
    
    this.instructions = new PredictionMarketInstructions(this.program);
    this.circuitBreaker = new CircuitBreaker();
  }

  // Enhanced fetch market with comprehensive error handling
  async fetchMarket(marketPda: PublicKey): Promise<Market | null> {
    return withRetry(async () => {
      return this.circuitBreaker.execute(async () => {
        try {
          const marketAccount = await (this.program.account as any)['market'].fetch(marketPda);
          
          // Validate account data
          if (!marketAccount || !marketAccount.creator) {
            throw createInvalidAccountDataError('Market', 'Missing required fields');
          }
          
          return marketAccount as Market;
        } catch (error: any) {
          if (error instanceof PredictionMarketError) {
            throw error;
          }
          
          if (error.message?.includes('Account does not exist')) {
            return null; // This is expected behavior, not an error
          }
          
          if (error.message?.includes('Invalid account discriminator')) {
            throw createInvalidAccountDataError('Market', 'Invalid account discriminator');
          }
          
          throw PredictionMarketError.fromRpcError(error);
        }
      });
    });
  }

  // Enhanced fetch user bet with error handling
  async fetchUserBet(userBetPda: PublicKey): Promise<UserBet | null> {
    return withRetry(async () => {
      return this.circuitBreaker.execute(async () => {
        try {
          const userBetAccount = await (this.program.account as any)['userBet'].fetch(userBetPda);
          
          if (!userBetAccount || !userBetAccount.user) {
            throw createInvalidAccountDataError('UserBet', 'Missing required fields');
          }
          
          return userBetAccount as UserBet;
        } catch (error: any) {
          if (error instanceof PredictionMarketError) {
            throw error;
          }
          
          if (error.message?.includes('Account does not exist')) {
            return null;
          }
          
          throw PredictionMarketError.fromRpcError(error);
        }
      });
    });
  }

  // Enhanced fetch all markets with pagination and error handling
  async fetchAllMarkets(
    options: {
      limit?: number;
      offset?: number;
      filters?: any[];
    } = {}
  ): Promise<Array<{ publicKey: PublicKey; account: Market }>> {
    return withRetry(async () => {
      return this.circuitBreaker.execute(async () => {
        try {
          const markets = await (this.program.account as any)['market'].all(options.filters);
          
          // Apply pagination if specified
          let result = markets.map((market: any) => ({
            publicKey: market.publicKey,
            account: market.account as Market
          }));
          
          if (options.offset) {
            result = result.slice(options.offset);
          }
          
          if (options.limit) {
            result = result.slice(0, options.limit);
          }
          
          return result;
        } catch (error: any) {
          throw PredictionMarketError.fromRpcError(error);
        }
      });
    });
  }

  // Enhanced market creation with validation
  async createMarket(
    marketId: anchor.BN,
    question: string,
    options: string[],
    endTime: anchor.BN,
    platformAddress: PublicKey
  ): Promise<string> {
    // Validate inputs before sending transaction
    const currentTime = new anchor.BN(Date.now() / 1000);
    const validation = this.utils.validateMarketParams(question, options, endTime, currentTime);
    
    if (!validation.valid) {
      throw new PredictionMarketError(
        ErrorCode.INVALID_OPTION_COUNT, // or appropriate error code
        validation.error!
      );
    }

    return withRetry(async () => {
      return this.circuitBreaker.execute(async () => {
        try {
          const instruction = this.instructions.createMarket(
            { marketId, question, options, endTime },
            this.wallet.publicKey,
            platformAddress
          );
          
          const tx = await instruction.rpc();
          return tx;
        } catch (error: any) {
          throw PredictionMarketError.fromAnchorError(error);
        }
      });
    });
  }

  // Enhanced bet placement with pre-validation
  async placeBet(
    market: PublicKey,
    optionIndex: number,
    amount: anchor.BN
  ): Promise<string> {
    // Pre-validate market state
    const marketData = await this.fetchMarket(market);
    if (!marketData) {
      throw createAccountNotFoundError('Market', market);
    }
    
    if (!this.isMarketActive(marketData)) {
      throw new PredictionMarketError(
        ErrorCode.MARKET_NOT_ACTIVE,
        'Market is not currently accepting bets'
      );
    }
    
    if (optionIndex >= marketData.options.length) {
      throw new PredictionMarketError(
        ErrorCode.INVALID_OPTION_INDEX,
        `Option index ${optionIndex} is invalid. Market has ${marketData.options.length} options.`
      );
    }

    return withRetry(async () => {
      return this.circuitBreaker.execute(async () => {
        try {
          const instruction = this.instructions.placeBet(
            { market, optionIndex, amount },
            this.wallet.publicKey
          );
          
          const tx = await instruction.rpc();
          return tx;
        } catch (error: any) {
          throw PredictionMarketError.fromAnchorError(error);
        }
      });
    });
  }

  // Enhanced claim winnings with validation
  async claimWinnings(market: PublicKey): Promise<string> {
    const marketData = await this.fetchMarket(market);
    if (!marketData) {
      throw createAccountNotFoundError('Market', market);
    }
    
    if (marketData.phase !== MarketPhase.Resolved) {
      throw new PredictionMarketError(
        ErrorCode.MARKET_NOT_RESOLVED,
        'Market has not been resolved yet'
      );
    }

    return withRetry(async () => {
      return this.circuitBreaker.execute(async () => {
        try {
          const instruction = this.instructions.claimWinnings(
            market,
            this.wallet.publicKey
          );
          
          const tx = await instruction.rpc();
          return tx;
        } catch (error: any) {
          throw PredictionMarketError.fromAnchorError(error);
        }
      });
    });
  }

  // Health check method
  async healthCheck(): Promise<{
    connection: boolean;
    program: boolean;
    circuitBreakerState: any;
  }> {
    const health = {
      connection: false,
      program: false,
      circuitBreakerState: this.circuitBreaker.getState(),
    };

    try {
      // Test connection
      await this.connection.getLatestBlockhash();
      health.connection = true;
      
      // Test program access
      await (this.program.account as any)['market'].all();
      health.program = true;
    } catch (error) {
      console.warn('Health check failed:', error);
    }

    return health;
  }

  // Helper methods (same as before but with error handling)
  private isMarketActive(market: Market): boolean {
    return market.phase === MarketPhase.Betting && !market.paused;
  }

  get connection(): Connection {
    return this.provider.connection;
  }

  get wallet(): anchor.Wallet {
    return this.provider.wallet as anchor.Wallet;
  }
}