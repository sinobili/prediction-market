// programs/prediction_market/events.rs

use anchor_lang::prelude::*;

#[event]
pub struct MarketCreated {
    pub market: Pubkey,
    pub creator: Pubkey,
    pub market_id: u64,
    pub end_time: i64,
    pub options_count: u8,
}

#[event]
pub struct BetPlaced {
    pub market: Pubkey,
    pub user: Pubkey,
    pub option_index: u8,
    pub amount: u64,
    pub new_pool_size: u64,
    pub new_odds: Vec<u64>, // Basitleştirilmiş oran gösterimi
    pub timestamp: i64,
}

#[event]
pub struct MarketResolved {
    pub market: Pubkey,
    pub winning_option: u8,
    pub total_pool: u64,
    pub winning_pool: u64,
    pub resolution_time: i64,
}

#[event]
pub struct WinningsClaimed {
    pub market: Pubkey,
    pub user: Pubkey,
    pub payout: u64,
}

#[event]
pub struct MarketPausedChanged {
    pub market: Pubkey,
    pub paused: bool,
    pub admin: Pubkey,
}

#[event]
pub struct LeaderChanged {
    pub market: Pubkey,
    pub new_leader: u8,
    pub timestamp: i64,
}

#[event]
pub struct VelocityLimitTriggered {
    pub market: Pubkey,
    pub user: Pubkey,
    pub attempted_amount: u64,
    pub limit: u64,
}