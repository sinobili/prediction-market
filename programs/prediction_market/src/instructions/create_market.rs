// programs/prediction_market/instructions/create_market.rs
use anchor_lang::prelude::*;
use anchor_lang::solana_program::program::invoke;
use anchor_lang::solana_program::system_instruction;
use anchor_lang::system_program::{transfer, Transfer};

use crate::state::*;
use crate::errors::*;
use crate::events::*;
use crate::constants::*;

#[derive(Accounts)]
#[instruction(market_id: u64)]
pub struct CreateMarket<'info> {
    #[account(
        init,
        payer = creator,
        space = 8 + Market::INIT_SPACE,
        seeds = [
            b"market",
            creator.key().as_ref(),
            market_id.to_le_bytes().as_ref()
        ],
        bump
    )]
    pub market: Account<'info, Market>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    #[account(mut)]
    pub platform: SystemAccount<'info>,
    
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateMarket>,
    market_id: u64,
    question: String,
    options: Vec<String>,
    end_time: i64,
) -> Result<()> {
    let market = &mut ctx.accounts.market;
    let clock = Clock::get()?;
    
    // Validations
    require!(
        question.len() <= MAX_QUESTION_LEN,
        PredictionMarketError::QuestionTooLong
    );
    
    require!(
        options.len() >= MIN_OPTIONS && options.len() <= MAX_OPTIONS,
        PredictionMarketError::InvalidOptionCount
    );
    
    for option in &options {
        require!(
            option.len() <= MAX_OPTION_LEN,
            PredictionMarketError::OptionTooLong
        );
    }
    
    require!(
        end_time > clock.unix_timestamp,
        PredictionMarketError::EndTimeInPast
    );
    
    let duration = end_time - clock.unix_timestamp;
    require!(
        duration >= MIN_MARKET_DURATION,
        PredictionMarketError::MarketTooShort
    );
    require!(
        duration <= MAX_MARKET_DURATION,
        PredictionMarketError::MarketTooLong
    );
    
    // Platform fee
    let cpi_context = CpiContext::new(
        ctx.accounts.system_program.to_account_info(),
        Transfer {
            from: ctx.accounts.creator.to_account_info(),
            to: ctx.accounts.platform.to_account_info(),
        },
    );
    transfer(cpi_context, CREATE_MARKET_FEE)?;
    
    // Market initialization
    market.creator = ctx.accounts.creator.key();
    market.market_id = market_id;
    market.question = question;
    market.options = options.clone();
    market.start_time = clock.unix_timestamp;
    market.end_time = end_time;
    market.resolution_time = None;
    
    // analyze pools
    market.option_pools = vec![0u64; options.len()];
    market.total_pool = 0;
    market.total_fees = 0;
    
    market.leading_option = None;
    market.leading_since = None;
    
    market.phase = MarketPhase::Betting;
    market.winner = None;
    market.paused = false;
    market.bump = ctx.bumps.market;
    
    emit!(MarketCreated {
        market: market.key(),
        creator: market.creator,
        market_id,
        end_time,
        options_count: options.len() as u8,
    });
    
    Ok(())
}
