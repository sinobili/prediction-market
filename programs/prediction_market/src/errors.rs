// programs/prediction_market/errors.rs
use anchor_lang::prelude::*;

#[error_code]
pub enum PredictionMarketError {
    #[msg("Question length exceeds maximum allowed")]
    QuestionTooLong,
    
    #[msg("Invalid number of options")]
    InvalidOptionCount,
    
    #[msg("Option text too long")]
    OptionTooLong,
    
    #[msg("Market end time must be in the future")]
    EndTimeInPast,
    
    #[msg("Market duration too short")]
    MarketTooShort,
    
    #[msg("Market duration too long")]
    MarketTooLong,
    
    #[msg("Market is not active")]
    MarketNotActive,
    
    #[msg("Market has already ended")]
    MarketEnded,
    
    #[msg("Invalid option index")]
    InvalidOptionIndex,
    
    #[msg("Bet amount too small")]
    BetTooSmall,
    
    #[msg("Exceeds velocity limit")]
    VelocityLimitExceeded,
    
    #[msg("Market not yet ended")]
    MarketNotEnded,
    
    #[msg("Market not resolved")]
    MarketNotResolved,
    
    #[msg("Market already resolved")]
    MarketAlreadyResolved,
    
    #[msg("Not a winner")]
    NotWinner,
    
    #[msg("Already claimed")]
    AlreadyClaimed,
    
    #[msg("Nothing to claim")]
    NothingToClaim,
    
    #[msg("Unauthorized")]
    Unauthorized,
    
    #[msg("Market is paused")]
    MarketPaused,
    
    #[msg("Insufficient funds for market creation")]
    InsufficientCreationFee,
    
    #[msg("Arithmetic overflow")]
    MathOverflow,
    
    #[msg("No bets placed yet")]
    NoBetsPlaced,
}