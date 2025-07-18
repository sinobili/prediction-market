// programs/prediction_market/state/market.rs
use anchor_lang::prelude::*;
use crate::constants::*;

#[account]
#[derive(InitSpace)]
pub struct Market {
    // Kimlik
    pub creator: Pubkey,
    pub market_id: u64,
    
    // Market detayları
    #[max_len(MAX_QUESTION_LEN)]
    pub question: String,
    #[max_len(MAX_OPTIONS, MAX_OPTION_LEN)]
    pub options: Vec<String>,
    
    // Zaman
    pub start_time: i64,
    pub end_time: i64,
    pub resolution_time: Option<i64>,
    
    // Bahis havuzları
    #[max_len(MAX_OPTIONS)]
    pub option_pools: Vec<u64>, // Her seçenek için toplam bahis
    pub total_pool: u64,
    pub total_fees: u64,
    
    // Liderlik takibi (V1 için basit)
    pub leading_option: Option<u8>,
    pub leading_since: Option<i64>,
    
    // Durum
    pub phase: MarketPhase,
    pub winner: Option<u8>,
    pub paused: bool,
    
    // PDA bump
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, InitSpace)]
pub enum MarketPhase {
    Betting,    // 
    Resolving,  // 
    Resolved,   // 
    Cancelled,  // 
}

impl Market {
    pub fn is_active(&self) -> bool {
        self.phase == MarketPhase::Betting && !self.paused
    }
    
    pub fn update_leader(&mut self, clock: &Clock) {
        let mut max_pool = 0u64;
        let mut leader = 0u8;
        
        for (i, pool) in self.option_pools.iter().enumerate() {
            if *pool > max_pool {
                max_pool = *pool;
                leader = i as u8;
            }
        }
        
        if self.leading_option != Some(leader) {
            self.leading_option = Some(leader);
            self.leading_since = Some(clock.unix_timestamp);
        }
    }
}