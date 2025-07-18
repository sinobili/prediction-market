// programs/prediction_market/src/instructions/place_bet.rs

use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;

use crate::state::*;
use crate::errors::*;
use crate::events::*;
use crate::constants::*;

#[derive(Accounts)]
pub struct PlaceBet<'info> {
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
        init_if_needed,
        payer = user,
        space = 8 + UserBet::INIT_SPACE,
        seeds = [
            UserBet::SEED_PREFIX,
            user.key().as_ref(),
            market.key().as_ref()
        ],
        bump
    )]
    pub user_bet: Account<'info, UserBet>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

pub fn handler(
    ctx: Context<PlaceBet>,
    option_index: u8,
    amount: u64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let user_bet = &mut ctx.accounts.user_bet;
    let clock = &ctx.accounts.clock;
    
    // Validations
    require!(
        market.is_active(),
        PredictionMarketError::MarketNotActive
    );
    
    require!(
        clock.unix_timestamp < market.end_time,
        PredictionMarketError::MarketEnded
    );
    
    require!(
        (option_index as usize) < market.options.len(),
        PredictionMarketError::InvalidOptionIndex
    );
    
    require!(
        amount >= MIN_BET_AMOUNT,
        PredictionMarketError::BetTooSmall
    );
    
    // Calculate commission
    let elapsed_time = clock.unix_timestamp - market.start_time;
    let total_duration = market.end_time - market.start_time;
    let time_percentage = (elapsed_time as u64 * 100) / total_duration as u64;
    
    let commission_bps = if time_percentage <= EARLY_BET_THRESHOLD {
        BASE_COMMISSION_BPS
    } else {
        LATE_COMMISSION_BPS
    };
    
    let commission = (amount * commission_bps as u64) / 10_000;
    let net_amount = amount - commission;
    
    // Velocity limit check
    let velocity_limit = calculate_velocity_limit(market.total_pool, clock.unix_timestamp, market.end_time);
    require!(
        amount <= velocity_limit,
        PredictionMarketError::VelocityLimitExceeded
    );
    
    // Transfer SOL to market PDA
    invoke(
        &system_instruction::transfer(
            &ctx.accounts.user.key(),
            &market.key(),
            net_amount,
        ),
        &[
            ctx.accounts.user.to_account_info(),
            market.to_account_info(),
            ctx.accounts.system_program.to_account_info(),
        ],
    )?;
    
    // Update market state
    market.option_pools[option_index as usize] = market.option_pools[option_index as usize]
        .checked_add(net_amount)
        .ok_or(PredictionMarketError::MathOverflow)?;
    
    market.total_pool = market.total_pool
        .checked_add(net_amount)
        .ok_or(PredictionMarketError::MathOverflow)?;
    
    market.total_fees = market.total_fees
        .checked_add(commission)
        .ok_or(PredictionMarketError::MathOverflow)?;
    
    // Update leader
    market.update_leader(clock);
    
    // Update or create user bet
    if user_bet.amount == 0 {
        user_bet.user = ctx.accounts.user.key();
        user_bet.market = market.key();
        user_bet.option_index = option_index;
        user_bet.amount = amount;
        user_bet.placed_at = clock.unix_timestamp;
        user_bet.claimed = false;
        user_bet.bump = ctx.bumps.user_bet;
    } else {
        // User can only bet on same option
        require!(
            user_bet.option_index == option_index,
            PredictionMarketError::InvalidOptionIndex
        );
        user_bet.amount = user_bet.amount
            .checked_add(amount)
            .ok_or(PredictionMarketError::MathOverflow)?;
    }
    
    // Calculate simple odds for event
    let mut odds = vec![];
    for pool in &market.option_pools {
        if market.total_pool > 0 {
            odds.push((*pool * 100) / market.total_pool);
        } else {
            odds.push(0);
        }
    }
    
    emit!(BetPlaced {
        market: market.key(),
        user: ctx.accounts.user.key(),
        option_index,
        amount,
        new_pool_size: market.option_pools[option_index as usize],
        new_odds: odds,
        timestamp: clock.unix_timestamp,
    });
    
    // Check if leader changed
    if let Some(leader) = market.leading_option {
        emit!(LeaderChanged {
            market: market.key(),
            new_leader: leader,
            timestamp: clock.unix_timestamp,
        });
    }
    
    Ok(())
}

fn calculate_velocity_limit(total_pool: u64, current_time: i64, end_time: i64) -> u64 {
    let time_remaining = (end_time - current_time).max(1) as u64;
    let hours_remaining = time_remaining / 3600;
    
    if total_pool == 0 || hours_remaining == 0 {
        return MIN_VELOCITY;
    }
    
    let dynamic_limit = (total_pool * VELOCITY_FACTOR) / 100 / hours_remaining.max(1).isqrt();
    
    dynamic_limit.max(MIN_VELOCITY)
}


