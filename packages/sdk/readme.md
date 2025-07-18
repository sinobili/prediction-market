# Prediction Market SDK

TypeScript SDK for interacting with the Oracle-less Prediction Market on Solana.

## Features

- 🎯 **Type-safe** interactions with the prediction market program
- 🔄 **Retry mechanism** with exponential backoff for network resilience 
- ⚡ **Circuit breaker** pattern to prevent cascading failures
- 🛡️ **Comprehensive error handling** with user-friendly messages
- 📊 **Market utilities** for odds calculation, validation, and formatting
- 🧪 **Extensive testing** with unit and integration tests

## Installation

```bash
npm install @prediction-market/sdk
# or
yarn add @prediction-market/sdk
```

## Quick Start

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { Wallet, BN } from '@coral-xyz/anchor';
import { PredictionMarketClient } from '@prediction-market/sdk';

// Setup connection and wallet
const connection = new Connection('https://api.devnet.solana.com');
const wallet = new Wallet(Keypair.generate());

// Create client
const client = new PredictionMarketClient(connection, wallet);

// Create a market
const marketId = new BN(Date.now());
const question = "Will BTC reach $100k by end of year?";
const options = ["Yes", "No"];
const endTime = new BN(Math.floor(Date.now() / 1000) + 86400); // 24 hours

try {
  const tx = await client.createMarket(
    marketId,
    question,
    options,
    endTime,
    platformAddress
  );
  console.log('Market created:', tx);
} catch (error) {
  if (error instanceof PredictionMarketError) {
    console.error('User-friendly error:', error.getUserFriendlyMessage());
  }
}
```

## API Reference

### PredictionMarketClient

Main client class for interacting with the prediction market.

#### Constructor

```typescript
new PredictionMarketClient(
  connection: Connection,
  wallet: Wallet,
  programId?: PublicKey,
  opts?: ConfirmOptions
)
```

#### Methods

##### Market Operations

```typescript
// Create a new market
async createMarket(
  marketId: BN,
  question: string,
  options: string[],
  endTime: BN,
  platformAddress: PublicKey
): Promise<string>

// Fetch market data
async fetchMarket(marketPda: PublicKey): Promise<Market | null>

// Fetch all markets with pagination
async fetchAllMarkets(options?: {
  limit?: number;
  offset?: number;
  filters?: any[];
}): Promise<Array<{ publicKey: PublicKey; account: Market }>>
```

##### Betting Operations

```typescript
// Place a bet
async placeBet(
  market: PublicKey,
  optionIndex: number,
  amount: BN
): Promise<string>

// Fetch user bet
async fetchUserBet(userBetPda: PublicKey): Promise<UserBet | null>

// Claim winnings
async claimWinnings(market: PublicKey): Promise<string>
```

##### Utility Methods

```typescript
// Health check
async healthCheck(): Promise<{
  connection: boolean;
  program: boolean;
  circuitBreakerState: any;
}>

// Get market with calculated stats
async getMarketWithStats(marketPda: PublicKey): Promise<MarketWithStats | null>
```

### PredictionMarketUtils

Utility functions for market calculations and validations.

```typescript
// Calculate commission based on timing
static calculateCommission(
  amount: BN,
  currentTime: BN,
  marketStart: BN,
  marketEnd: BN
): { commission: BN; netAmount: BN }

// Calculate velocity limit
static calculateVelocityLimit(
  totalPool: BN,
  currentTime: BN,
  endTime: BN
): BN

// Calculate odds for each option
static calculateOdds(market: Market): number[]

// Validate market parameters
static validateMarketParams(
  question: string,
  options: string[],
  endTime: BN,
  currentTime: BN
): { valid: boolean; error?: string }
```

### Error Handling

The SDK provides comprehensive error handling with specific error types:

```typescript
import { PredictionMarketError, ErrorCode } from '@prediction-market/sdk';

try {
  await client.placeBet(market, 0, amount);
} catch (error) {
  if (error instanceof PredictionMarketError) {
    console.log('Error code:', error.code);
    console.log('User message:', error.getUserFriendlyMessage());
    console.log('Is recoverable:', error.isRecoverable());
    
    if (error.code === ErrorCode.BET_TOO_SMALL) {
      // Handle specific error type
    }
  }
}
```

### Retry Mechanism

Built-in retry mechanism for network resilience:

```typescript
import { withRetry } from '@prediction-market/sdk';

// Automatic retry for recoverable errors
const result = await withRetry(
  () => client.fetchMarket(marketPda),
  {
    maxAttempts: 3,
    baseDelay: 1000,
    backoffMultiplier: 2
  }
);
```

## Error Codes

| Code | Description | Recoverable |
|------|-------------|-------------|
| `ACCOUNT_NOT_FOUND` | Account doesn't exist | No |
| `NETWORK_ERROR` | Network connectivity issue | Yes |
| `BET_TOO_SMALL` | Bet below minimum amount | No |
| `MARKET_NOT_ACTIVE` | Market not accepting bets | No |
| `VELOCITY_LIMIT_EXCEEDED` | Bet exceeds velocity limit | No |
| `INSUFFICIENT_FUNDS` | Not enough SOL | No |
| `RPC_TIMEOUT` | RPC request timeout | Yes |

## Examples

### Creating and Betting on a Market

```typescript
import { Connection, Keypair } from '@solana/web3.js';
import { Wallet, BN } from '@coral-xyz/anchor';
import { PredictionMarketClient, LAMPORTS_PER_SOL } from '@prediction-market/sdk';

async function example() {
  const connection = new Connection('https://api.devnet.solana.com');
  const creator = Keypair.generate();
  const bettor = Keypair.generate();
  
  // Create market
  const creatorClient = new PredictionMarketClient(
    connection,
    new Wallet(creator)
  );
  
  const marketId = new BN(Date.now());
  const endTime = new BN(Math.floor(Date.now() / 1000) + 86400);
  
  await creatorClient.createMarket(
    marketId,
    "Will it rain tomorrow?",
    ["Yes", "No"],
    endTime,
    platformAddress
  );
  
  // Place bet
  const bettorClient = new PredictionMarketClient(
    connection,
    new Wallet(bettor)
  );
  
  const [marketPda] = creatorClient.instructions.constructor.findMarketPDA(
    creator.publicKey,
    marketId
  );
  
  await bettorClient.placeBet(
    marketPda,
    0, // Bet on "Yes"
    new BN(0.1 * LAMPORTS_PER_SOL)
  );
  
  // Check market stats
  const marketStats = await creatorClient.getMarketWithStats(marketPda);
  console.log('Market odds:', marketStats?.odds);
  console.log('Time remaining:', marketStats?.timeRemaining);
}
```

## Testing

Run the test suite:

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Watch mode
npm run test:watch

# Coverage report
npm run coverage
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Lint
npm run lint

# Format
npm run format
```

## License

MIT