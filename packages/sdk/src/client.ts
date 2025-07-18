// packages/sdk/src/client.ts
import { Connection, PublicKey, Commitment } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { Program, AnchorProvider, Idl } from '@coral-xyz/anchor';
import { PredictionMarketInstructions } from './instructions';
import { PredictionMarketUtils } from './utils';
import { Market, UserBet, MarketPhase } from './types';
import { PROGRAM_ID } from './constants';

// Import IDL as JSON
const IDL = require('./prediction_market.json');

export class PredictionMarketClient {
  public program: Program<any>;
  public instructions: PredictionMarketInstructions;
  public utils = PredictionMarketUtils;
  public provider: AnchorProvider;

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
    
    // Anchor Program constructor signature: new Program(idl, provider)
    this.program = new Program(
      customIdl as any,
      this.provider
    );
    
    this.instructions = new PredictionMarketInstructions(this.program);
  }

  // Fetch market account with proper error handling
  async fetchMarket(marketPda: PublicKey): Promise<Market | null> {
    try {
      // Use bracket notation to access account types
      const marketAccount = await (this.program.account as any)['market'].fetch(marketPda);
      return marketAccount as Market;
    } catch (error: any) {
      if (error.message?.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  // Fetch user bet account with proper error handling
  async fetchUserBet(userBetPda: PublicKey): Promise<UserBet | null> {
    try {
      const userBetAccount = await (this.program.account as any)['userBet'].fetch(userBetPda);
      return userBetAccount as UserBet;
    } catch (error: any) {
      if (error.message?.includes('Account does not exist')) {
        return null;
      }
      throw error;
    }
  }

  // Fetch all markets with proper typing
  async fetchAllMarkets(): Promise<Array<{ publicKey: PublicKey; account: Market }>> {
    try {
      const markets = await (this.program.account as any)['market'].all();
      return markets.map((market: any) => ({
        publicKey: market.publicKey,
        account: market.account as Market
      }));
    } catch (error) {
      console.error('Error fetching markets:', error);
      return [];
    }
  }

  // Fetch markets by creator with proper memcmp
  async fetchMarketsByCreator(creator: PublicKey): Promise<Array<{ publicKey: PublicKey; account: Market }>> {
    try {
      const markets = await (this.program.account as any)['market'].all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: creator.toBase58(),
          },
        },
      ]);
      return markets.map((market: any) => ({
        publicKey: market.publicKey,
        account: market.account as Market
      }));
    } catch (error) {
      console.error('Error fetching markets by creator:', error);
      return [];
    }
  }

  // Fetch user bets for a specific user
  async fetchUserBets(user: PublicKey): Promise<Array<{ publicKey: PublicKey; account: UserBet }>> {
    try {
      const userBets = await (this.program.account as any)['userBet'].all([
        {
          memcmp: {
            offset: 8, // After discriminator
            bytes: user.toBase58(),
          },
        },
      ]);
      return userBets.map((bet: any) => ({
        publicKey: bet.publicKey,
        account: bet.account as UserBet
      }));
    } catch (error) {
      console.error('Error fetching user bets:', error);
      return [];
    }
  }

  // Subscribe to market changes
  subscribeToMarket(
    marketPda: PublicKey,
    callback: (market: Market) => void
  ): number {
    return (this.program.account as any)['market'].subscribe(marketPda, (account: any) => {
      callback(account as Market);
    });
  }

  // Unsubscribe with proper error handling
  async unsubscribe(subscriptionId: number): Promise<void> {
    try {
      await (this.program.account as any)['market'].unsubscribe(subscriptionId);
    } catch (error) {
      console.error('Error unsubscribing:', error);
    }
  }

  // Helper to get market with calculated fields
  async getMarketWithStats(marketPda: PublicKey) {
    const market = await this.fetchMarket(marketPda);
    if (!market) {
      return null;
    }

    const odds = this.utils.calculateOdds(market);
    const currentTime = new anchor.BN(Date.now() / 1000);
    const timeRemaining = this.utils.formatTimeRemaining(market.endTime, currentTime);
    
    // Check if market is active - fix the phase checking
    const isActive = this.isMarketActive(market);
    
    return {
      ...market,
      odds,
      timeRemaining,
      isActive,
    };
  }

  // Helper to check if market is active
  private isMarketActive(market: Market): boolean {
    // Check if market is in betting phase and not paused
    return market.phase === MarketPhase.Betting && !market.paused;
  }

  // Helper to get market status string
  getMarketStatus(market: Market): string {
    if (market.paused) return 'Paused';
    
    switch (market.phase) {
      case MarketPhase.Betting:
        return 'Active';
      case MarketPhase.Resolving:
        return 'Resolving';
      case MarketPhase.Resolved:
        return 'Resolved';
      case MarketPhase.Cancelled:
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  }

  // Helper to get connection from provider
  get connection(): Connection {
    return this.provider.connection;
  }

  // Helper to get wallet from provider - fix the undefined issue
  get wallet(): anchor.Wallet {
    return this.provider.wallet as anchor.Wallet;
  }
}