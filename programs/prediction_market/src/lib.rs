// programs/prediction_market/src/lib.rs
use anchor_lang::prelude::*;

declare_id!("wV5jwseh9fQfrdHUbxafCfGpvuWbQaNYqQaBJS8vuVa"); // Deploy sonrası değişecek

pub const PLATFORM_ADMIN: Pubkey = pubkey!("wV5jwseh9fQfrdHUbxafCfGpvuWbQaNYqQaBJS8vuVa");

pub mod instructions;
pub mod state;
pub mod errors;
pub mod constants;
pub mod events;

use instructions::{
    CreateMarket, PlaceBet, ResolveMarket, ClaimWinnings, EmergencyPause,
};

pub(crate) use instructions::{
    __client_accounts_create_market,
    __client_accounts_place_bet,
    __client_accounts_resolve_market,
    __client_accounts_claim_winnings,
    __client_accounts_emergency_pause,
};

#[program]
pub mod prediction_market {
    use super::*;

    pub fn create_market(
        ctx: Context<CreateMarket>,
        market_id: u64,
        question: String,
        options: Vec<String>,
        end_time: i64,
    ) -> Result<()> {
        instructions::create_market::handler(
            ctx,
            market_id,
            question,
            options,
            end_time,
        )
    }

    pub fn place_bet(
        ctx: Context<PlaceBet>,
        outcome_index: u8,
        amount: u64,
    ) -> Result<()> {
        instructions::place_bet::handler(ctx, outcome_index, amount)
    }

    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
    ) -> Result<()> {
        instructions::resolve_market::handler(ctx)
    }

    pub fn claim_winnings(
        ctx: Context<ClaimWinnings>,
    ) -> Result<()> {
        instructions::claim_winnings::handler(ctx)
    }

    pub fn emergency_pause(
        ctx: Context<EmergencyPause>,
        paused: bool,
    ) -> Result<()> {
        instructions::admin::emergency_pause::handler(ctx, paused)
    }
}

