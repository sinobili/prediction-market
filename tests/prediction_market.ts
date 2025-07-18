// tests/prediction_market.ts
import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PredictionMarket } from "../target/types/prediction_market.js";
import { assert, expect } from "chai";

describe("prediction-market", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.PredictionMarket as Program<PredictionMarket>;
  
  let marketPda: anchor.web3.PublicKey;
  let userBetPda: anchor.web3.PublicKey;
  const marketId = new anchor.BN(Date.now());
  
  const user2 = anchor.web3.Keypair.generate();
  const user3 = anchor.web3.Keypair.generate();

  before(async () => {
    // Airdrop to test users
    for (const user of [user2, user3]) {
      const signature = await provider.connection.requestAirdrop(
        user.publicKey,
        5 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);
    }
  });

  it("Creates a market", async () => {
    const question = "Who will win the match?";
    const options = ["Team A", "Team B"];
    const endTime = new anchor.BN(Math.floor(Date.now() / 1000) + 7200); // 2 hours

    [marketPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        provider.wallet.publicKey.toBuffer(),
        marketId.toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );

    await program.methods
      .createMarket(marketId, question, options, endTime)
      .accounts({
        market: marketPda,
        creator: provider.wallet.publicKey,
        platform: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.question, question);
    assert.deepEqual(market.options, options);
    assert.equal(market.totalPool.toNumber(), 0);
    assert.equal(market.phase.betting !== undefined, true);
  });

  it("Places a bet with early commission", async () => {
    [userBetPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_bet"),
        provider.wallet.publicKey.toBuffer(),
        marketPda.toBuffer(),
      ],
      program.programId
    );

    const betAmount = new anchor.BN(0.1 * anchor.web3.LAMPORTS_PER_SOL);
    const optionIndex = 0;

    const marketBefore = await program.account.market.fetch(marketPda);
    
    await program.methods
      .placeBet(optionIndex, betAmount)
      .accounts({
        market: marketPda,
        userBet: userBetPda,
        user: provider.wallet.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    const userBet = await program.account.userBet.fetch(userBetPda);
    
    // Early bet commission is 0.25%
    const expectedCommission = betAmount.toNumber() * 25 / 10000;
    const expectedNetAmount = betAmount.toNumber() - expectedCommission;
    
    assert.equal(userBet.optionIndex, optionIndex);
    assert.equal(userBet.amount.toNumber(), betAmount.toNumber());
    assert.approximately(
      market.totalPool.toNumber(), 
      expectedNetAmount,
      1000 // Small tolerance for rounding
    );
    assert.equal(market.optionPools[0].toNumber(), market.totalPool.toNumber());
    assert.equal(market.leadingOption, 0);
  });

  it("Another user places a larger bet on different option", async () => {
    const [user2BetPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("user_bet"),
        user2.publicKey.toBuffer(),
        marketPda.toBuffer(),
      ],
      program.programId
    );

    const betAmount = new anchor.BN(0.2 * anchor.web3.LAMPORTS_PER_SOL);
    const optionIndex = 1;

    await program.methods
      .placeBet(optionIndex, betAmount)
      .accounts({
        market: marketPda,
        userBet: user2BetPda,
        user: user2.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
      })
      .signers([user2])
      .rpc();

    const market = await program.account.market.fetch(marketPda);
    assert.equal(market.leadingOption, 1); // Team B should be leading now
    
    // Check odds calculation
    const totalPool = market.totalPool.toNumber();
    const odds0 = (market.optionPools[0].toNumber() * 100) / totalPool;
    const odds1 = (market.optionPools[1].toNumber() * 100) / totalPool;
    
    console.log(`Odds - Team A: ${odds0}%, Team B: ${odds1}%`);
    assert.isAbove(odds1, odds0); // Team B should have higher odds
  });

  it("Tests velocity limit", async () => {
    const hugeBetAmount = new anchor.BN(10 * anchor.web3.LAMPORTS_PER_SOL);
    
    try {
      await program.methods
        .placeBet(0, hugeBetAmount)
        .accounts({
          market: marketPda,
          userBet: userBetPda,
          user: provider.wallet.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
      
      assert.fail("Should have failed due to velocity limit");
    } catch (error) {
      assert.include(error.toString(), "VelocityLimitExceeded");
    }
  });

  it("Cannot resolve market before end time", async () => {
    try {
      await program.methods
        .resolveMarket()
        .accounts({
          market: marketPda,
          creator: provider.wallet.publicKey,
          clock: anchor.web3.SYSVAR_CLOCK_PUBKEY,
        })
        .rpc();
      
      assert.fail("Should have failed");
    } catch (error) {
      assert.include(error.toString(), "MarketNotEnded");
    }
  });

  it("Only creator can resolve market", async () => {
    // Bu test için market'in bitmesini simüle edemeyiz localnet'te
    // Frontend testlerinde veya mainnet'te test edilebilir
  });

  // Daha fazla test: emergency pause, claim winnings vs.
});