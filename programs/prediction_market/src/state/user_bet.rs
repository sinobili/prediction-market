// programs/prediction_market/state/user_bet.rs

use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct UserBet {
    pub user: Pubkey,
    pub market: Pubkey,
    pub option_index: u8,
    pub amount: u64,
    pub placed_at: i64,
    pub claimed: bool,
    pub bump: u8,
}

impl UserBet {
    pub const SEED_PREFIX: &'static [u8] = b"user_bet";
}