// packages/sdk/src/instructions.ts
import * as anchor from '@coral-xyz/anchor';
import { Program, BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_CLOCK_PUBKEY } from '@solana/web3.js';
import { PROGRAM_ID, SEEDS } from './constants';
import { CreateMarketParams, PlaceBetParams } from './types';

export class PredictionMarketInstructions {
  constructor(private program: Program<any>) {}

  // Find PDA helpers
  static findMarketPDA(creator: PublicKey, marketId: BN): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEEDS.MARKET),
        creator.toBuffer(),
        marketId.toArrayLike(Buffer, 'le', 8),
      ],
      PROGRAM_ID
    );
  }

  static findUserBetPDA(user: PublicKey, market: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [
        Buffer.from(SEEDS.USER_BET),
        user.toBuffer(),
        market.toBuffer(),
      ],
      PROGRAM_ID
    );
  }

  // Create Market instruction builder
  createMarket(
    params: CreateMarketParams,
    creator: PublicKey,
    platform: PublicKey
  ): any {
    const [marketPda] = PredictionMarketInstructions.findMarketPDA(
      creator,
      params.marketId
    );

    try {
      // Use bracket notation to avoid typing issues
      return (this.program.methods as any)['createMarket'](
        params.marketId,
        params.question,
        params.options,
        params.endTime
      ).accounts({
        market: marketPda,
        creator,
        platform,
        systemProgram: SystemProgram.programId,
      });
    } catch (error) {
      console.error('Error building createMarket instruction:', error);
      throw error;
    }
  }

  // Place Bet instruction builder
  placeBet(
    params: PlaceBetParams,
    user: PublicKey
  ): any {
    const [userBetPda] = PredictionMarketInstructions.findUserBetPDA(
      user,
      params.market
    );

    try {
      return (this.program.methods as any)['placeBet'](
        params.optionIndex,
        params.amount
      ).accounts({
        market: params.market,
        userBet: userBetPda,
        user,
        systemProgram: SystemProgram.programId,
        clock: SYSVAR_CLOCK_PUBKEY,
      });
    } catch (error) {
      console.error('Error building placeBet instruction:', error);
      throw error;
    }
  }

  // Resolve Market instruction builder
  resolveMarket(market: PublicKey, creator: PublicKey): any {
    try {
      return (this.program.methods as any)['resolveMarket']().accounts({
        market,
        creator,
        clock: SYSVAR_CLOCK_PUBKEY,
      });
    } catch (error) {
      console.error('Error building resolveMarket instruction:', error);
      throw error;
    }
  }

  // Claim Winnings instruction builder
  claimWinnings(market: PublicKey, user: PublicKey): any {
    const [userBetPda] = PredictionMarketInstructions.findUserBetPDA(user, market);

    try {
      return (this.program.methods as any)['claimWinnings']().accounts({
        market,
        userBet: userBetPda,
        user,
        systemProgram: SystemProgram.programId,
      });
    } catch (error) {
      console.error('Error building claimWinnings instruction:', error);
      throw error;
    }
  }

  // Emergency Pause instruction builder
  emergencyPause(market: PublicKey, admin: PublicKey, paused: boolean): any {
    try {
      return (this.program.methods as any)['emergencyPause'](paused).accounts({
        market,
        admin,
      });
    } catch (error) {
      console.error('Error building emergencyPause instruction:', error);
      throw error;
    }
  }

  // Utility method to get market PDA
  getMarketPDA(creator: PublicKey, marketId: BN): PublicKey {
    const [marketPda] = PredictionMarketInstructions.findMarketPDA(creator, marketId);
    return marketPda;
  }

  // Utility method to get user bet PDA
  getUserBetPDA(user: PublicKey, market: PublicKey): PublicKey {
    const [userBetPda] = PredictionMarketInstructions.findUserBetPDA(user, market);
    return userBetPda;
  }

  // Simulate transaction (for testing/validation)
  async simulateTransaction(instruction: any): Promise<any> {
    try {
      return await instruction.simulate();
    } catch (error) {
      console.error('Transaction simulation failed:', error);
      throw error;
    }
  }
}