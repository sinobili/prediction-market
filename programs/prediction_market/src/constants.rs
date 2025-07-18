// programs/prediction_market/constants.rs

// fee constants
pub const BASE_COMMISSION_BPS: u16 = 25; // %0.25
pub const LATE_COMMISSION_BPS: u16 = 50; // %0.50
pub const EARLY_BET_THRESHOLD: u64 = 33; // %33

// Limits
pub const MIN_BET_AMOUNT: u64 = 5_000_000; // 0.005 SOL (~5 USD)
pub const MAX_QUESTION_LEN: usize = 280;
pub const MAX_OPTION_LEN: usize = 100;
pub const MAX_OPTIONS: usize = 10;
pub const MIN_OPTIONS: usize = 2;

// Velocity limit
pub const MIN_VELOCITY: u64 = 100_000_000; // 0.1 SOL
pub const VELOCITY_FACTOR: u64 = 50; // %20

// time constants
pub const MAX_MARKET_DURATION: i64 = 365 * 24 * 60 * 60; // 1 yıl
pub const MIN_MARKET_DURATION: i64 = 60 * 60; // 1 saat

// Platform
pub const PLATFORM_FEE_BPS: u16 = 100; // %1 platform ücreti
pub const CREATE_MARKET_FEE: u64 = 1_000_000_000; // 1 SOL