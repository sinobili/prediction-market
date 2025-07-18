// // programs/prediction_market/src/instructions/resolve_market.rs
use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::events::*;

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(
        mut,
        seeds = [
            b"market",
            market.creator.as_ref(),
            market.market_id.to_le_bytes().as_ref()
        ],
        bump = market.bump,
        has_one = creator @ PredictionMarketError::Unauthorized
    )]
    pub market: Account<'info, Market>,
    
    pub creator: Signer<'info>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(ctx: Context<ResolveMarket>) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = &ctx.accounts.clock;
    
    // Validations
    require!(
        market.phase == MarketPhase::Betting,
        PredictionMarketError::MarketAlreadyResolved
    );
    
    require!(
        clock.unix_timestamp >= market.end_time,
        PredictionMarketError::MarketNotEnded
    );
    
    require!(
        market.total_pool > 0,
        PredictionMarketError::NoBetsPlaced
    );
    
    // Calculate winner based on time-weighted score
    let winner = calculate_winner(market, clock)?;
    
    // Update market state
    market.phase = MarketPhase::Resolved;
    market.winner = Some(winner);
    market.resolution_time = Some(clock.unix_timestamp);
    
    let winning_pool = market.option_pools[winner as usize];
    
    emit!(MarketResolved {
        market: market.key(),
        winning_option: winner,
        total_pool: market.total_pool,
        winning_pool,
        resolution_time: clock.unix_timestamp,
    });
    
    Ok(())
}

fn calculate_winner(market: &Market, clock: &Clock) -> Result<u8> {
    let total_duration = market.end_time - market.start_time;
    let mut best_score = 0u128;
    let mut winner = 0u8;
    
    for (i, pool) in market.option_pools.iter().enumerate() {
        if *pool == 0 {
            continue;
        }
        
        // score logic %70 time, %30 money
        let time_score = if market.leading_option == Some(i as u8) {
            let leadership_duration = clock.unix_timestamp - market.leading_since.unwrap_or(market.start_time);
            let time_percentage = (leadership_duration as u128 * 100) / total_duration as u128;
            time_percentage * 70
        } else {
            0
        };
        
        let money_score = (*pool as u128 * 100 * 30) / market.total_pool as u128;
        let total_score = time_score + money_score;
        
        if total_score > best_score {
            best_score = total_score;
            winner = i as u8;
        }
    }
    
    Ok(winner)
}