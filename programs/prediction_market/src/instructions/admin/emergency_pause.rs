// programs/prediction_market/src/instructions/admin/emergency_pause.rs
use anchor_lang::prelude::*;
use crate::state::*;
use crate::errors::*;
use crate::events::*;

#[derive(Accounts)]
pub struct EmergencyPause<'info> {
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
    
    #[account(address = crate::PLATFORM_ADMIN @ PredictionMarketError::Unauthorized)]
    pub admin: Signer<'info>,
}

pub fn handler(ctx: Context<EmergencyPause>, paused: bool) -> Result<()> {
    let market = &mut ctx.accounts.market;
    
    market.paused = paused;
    
    emit!(MarketPausedChanged {
        market: market.key(),
        paused,
        admin: ctx.accounts.admin.key(),
    });
    
    Ok(())
}