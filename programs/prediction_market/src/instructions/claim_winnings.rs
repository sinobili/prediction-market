// programs/prediction_market/src/instructions/claim_winnings.rs
use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::events::*;

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(
        mut,
        seeds = [
            b"market",
            market.creator.as_ref(),
            market.market_id.to_le_bytes().as_ref()
        ],
        bump = market.bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(
        mut,
        seeds = [
            UserBet::SEED_PREFIX,
            user.key().as_ref(),
            market.key().as_ref()
        ],
        bump = user_bet.bump,
        has_one = user @ PredictionMarketError::Unauthorized,
        close = user
    )]
    pub user_bet: Account<'info, UserBet>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimWinnings>) -> Result<()> {
    let market = &ctx.accounts.market;
    let user_bet = &ctx.accounts.user_bet;
    
    // Validations
    require!(
        market.phase == MarketPhase::Resolved,
        PredictionMarketError::MarketNotResolved
    );
    
    require!(
        !user_bet.claimed,
        PredictionMarketError::AlreadyClaimed
    );
    
    let winner = market.winner.ok_or(PredictionMarketError::MarketNotResolved)?;
    
    require!(
        user_bet.option_index == winner,
        PredictionMarketError::NotWinner
    );
    
    // Calculate payout
    let winning_pool = market.option_pools[winner as usize];
    require!(
        winning_pool > 0,
        PredictionMarketError::NothingToClaim
    );
    
    let payout = (user_bet.amount as u128 * market.total_pool as u128 / winning_pool as u128) as u64;
    
    // Transfer winnings from market PDA to user
    let market_key = market.key();
    let market_id_bytes = market.market_id.to_le_bytes();
    let seeds = &[
        b"market",
        market.creator.as_ref(),
        market_id_bytes.as_ref(),
        &[market.bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    **market.to_account_info().try_borrow_mut_lamports()? -= payout;
    **ctx.accounts.user.to_account_info().try_borrow_mut_lamports()? += payout;
    
    emit!(WinningsClaimed {
        market: market.key(),
        user: ctx.accounts.user.key(),
        payout,
    });
    
    // Account will be closed automatically due to close = user
    Ok(())
}