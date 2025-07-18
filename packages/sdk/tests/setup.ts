// packages/sdk/tests/setup.ts
import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { BN, Wallet } from '@coral-xyz/anchor';
import { PredictionMarketClient } from '../src/client-enhanced';
import { PredictionMarketInstructions } from '../src/instructions';
import { PROGRAM_ID } from '../src/constants';

export class TestEnvironment {
  public connection: Connection;
  public programId: PublicKey;
  public payer: Keypair;
  public users: Keypair[];
  public client: PredictionMarketClient;
  public platformAddress: PublicKey;

  constructor() {
    // Use localnet for testing
    this.connection = new Connection('http://127.0.0.1:8899', 'confirmed');
    this.programId = PROGRAM_ID;
    this.payer = Keypair.generate();
    this.users = Array.from({ length: 5 }, () => Keypair.generate());
    this.platformAddress = Keypair.generate().publicKey;
    
    // Create client with payer as wallet
    const wallet = new Wallet(this.payer);
    this.client = new PredictionMarketClient(
      this.connection,
      wallet,
      this.programId
    );
  }

  // Setup test environment with funded accounts
  async setup(): Promise<void> {
    try {
      // Airdrop SOL to payer and users
      await this.airdropToAccount(this.payer.publicKey, 10);
      
      for (const user of this.users) {
        await this.airdropToAccount(user.publicKey, 5);
      }
      
      // Wait for transactions to confirm
      await this.waitForConfirmation();
      
      console.log('✅ Test environment setup complete');
    } catch (error) {
      console.error('❌ Test environment setup failed:', error);
      throw error;
    }
  }

  // Airdrop SOL to an account
  async airdropToAccount(publicKey: PublicKey, solAmount: number): Promise<void> {
    const lamports = solAmount * LAMPORTS_PER_SOL;
    const signature = await this.connection.requestAirdrop(publicKey, lamports);
    await this.connection.confirmTransaction(signature);
  }

  // Create a test market
  async createTestMarket(
    question: string = "Will BTC reach $100k by end of year?",
    options: string[] = ["Yes", "No"],
    durationHours: number = 24
  ): Promise<{ marketId: BN; marketPda: PublicKey }> {
    const marketId = new BN(Date.now());
    const endTime = new BN(Math.floor(Date.now() / 1000) + (durationHours * 3600));
    
    await this.client.createMarket(
      marketId,
      question,
      options,
      endTime,
      this.platformAddress
    );
    
    // Fixed: Use static method correctly
    const [marketPda] = PredictionMarketInstructions.findMarketPDA(
      this.payer.publicKey,
      marketId
    );
    
    return { marketId, marketPda };
  }

  // Create client for a specific user
  createUserClient(userIndex: number): PredictionMarketClient {
    const user = this.users[userIndex];
    const wallet = new Wallet(user);
    
    return new PredictionMarketClient(
      this.connection,
      wallet,
      this.programId
    );
  }

  // Wait for transaction confirmation
  async waitForConfirmation(ms: number = 2000): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  // Clean up test environment
  async cleanup(): Promise<void> {
    // In a real test environment, you might want to close accounts
    // or reset state here
    console.log('🧹 Test environment cleaned up');
  }
}

// Test data generators
export class TestDataGenerator {
  static generateMarketQuestion(): string {
    const topics = [
      'Will Bitcoin reach $100k',
      'Will Ethereum switch to PoS',
      'Will Tesla stock hit $500',
      'Will Apple release VR headset',
      'Will OpenAI release GPT-5'
    ];
    
    const timeframes = [
      'by end of 2024',
      'in next 6 months',
      'before Q2 2025',
      'this year'
    ];
    
    const topic = topics[Math.floor(Math.random() * topics.length)];
    const timeframe = timeframes[Math.floor(Math.random() * timeframes.length)];
    
    return `${topic} ${timeframe}?`;
  }

  static generateMarketOptions(count: number = 2): string[] {
    if (count === 2) {
      return ['Yes', 'No'];
    }
  
  // Array.from is used to create an array of options dynamically
    return Array.from({ length: count }, (_, i) => `Option ${i + 1}`);
  }

  static generateBetAmount(): BN {
    // Generate amounts between 0.005 and 1 SOL
    const minAmount = 5_000_000; // 0.005 SOL
    const maxAmount = 1_000_000_000; // 1 SOL
    
    const amount = Math.floor(Math.random() * (maxAmount - minAmount)) + minAmount;
    return new BN(amount);
  }

  static generateFutureTimestamp(hoursFromNow: number = 24): BN {
    const timestamp = Math.floor(Date.now() / 1000) + (hoursFromNow * 3600);
    return new BN(timestamp);
  }
}

// Custom assertions for testing
export class TestAssertions {
  static async assertMarketExists(
    client: PredictionMarketClient,
    marketPda: PublicKey
  ): Promise<void> {
    const market = await client.fetchMarket(marketPda);
    if (!market) {
      throw new Error(`Market ${marketPda.toString()} does not exist`);
    }
  }

  static async assertUserBetExists(
    client: PredictionMarketClient,
    user: PublicKey,
    market: PublicKey
  ): Promise<void> {
    // Fixed: Use static method correctly
    const [userBetPda] = PredictionMarketInstructions.findUserBetPDA(user, market);
    const userBet = await client.fetchUserBet(userBetPda);
    
    if (!userBet) {
      throw new Error(`User bet for ${user.toString()} on market ${market.toString()} does not exist`);
    }
  }

  static assertBNEqual(actual: BN, expected: BN, message?: string): void {
    if (!actual.eq(expected)) {
      throw new Error(
        message || `Expected ${expected.toString()}, got ${actual.toString()}`
      );
    }
  }

  static assertBNGreaterThan(actual: BN, minimum: BN, message?: string): void {
    if (!actual.gt(minimum)) {
      throw new Error(
        message || `Expected ${actual.toString()} to be greater than ${minimum.toString()}`
      );
    }
  }

  static assertMarketPhase(
    market: any,
    expectedPhase: string,
    message?: string
  ): void {
    if (market.phase !== expectedPhase) {
      throw new Error(
        message || `Expected market phase ${expectedPhase}, got ${market.phase}`
      );
    }
  }
}