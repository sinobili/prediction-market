// programs/prediction_market/instructions/mod.rs

// ---------- modules ----------
pub mod create_market;
pub mod place_bet;
pub mod resolve_market;
pub mod claim_winnings;
pub mod admin; 

// ---------- re export accounts structs  ----------
pub use create_market::CreateMarket;
pub use place_bet::PlaceBet;
pub use resolve_market::ResolveMarket;
pub use claim_winnings::ClaimWinnings;
pub use admin::EmergencyPause;  

// english: These are used for Anchor's client-side code generation
// english: required for Anchor's client-side code generation (macro usage, not visible in external API)
pub(crate) use create_market::__client_accounts_create_market;
pub(crate) use place_bet::__client_accounts_place_bet;
pub(crate) use resolve_market::__client_accounts_resolve_market;
pub(crate) use claim_winnings::__client_accounts_claim_winnings;
pub(crate) use admin::emergency_pause::__client_accounts_emergency_pause;
