// packages/sdk/src/errors.ts
import { PublicKey } from '@solana/web3.js';

export enum ErrorCode {
  // SDK Errors
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  INVALID_ACCOUNT_DATA = 'INVALID_ACCOUNT_DATA',
  NETWORK_ERROR = 'NETWORK_ERROR',
  SERIALIZATION_ERROR = 'SERIALIZATION_ERROR',
  
  // Program Errors (matching your IDL)
  QUESTION_TOO_LONG = 'QUESTION_TOO_LONG',
  INVALID_OPTION_COUNT = 'INVALID_OPTION_COUNT',
  OPTION_TOO_LONG = 'OPTION_TOO_LONG',
  END_TIME_IN_PAST = 'END_TIME_IN_PAST',
  MARKET_TOO_SHORT = 'MARKET_TOO_SHORT',
  MARKET_TOO_LONG = 'MARKET_TOO_LONG',
  MARKET_NOT_ACTIVE = 'MARKET_NOT_ACTIVE',
  MARKET_ENDED = 'MARKET_ENDED',
  INVALID_OPTION_INDEX = 'INVALID_OPTION_INDEX',
  BET_TOO_SMALL = 'BET_TOO_SMALL',
  VELOCITY_LIMIT_EXCEEDED = 'VELOCITY_LIMIT_EXCEEDED',
  MARKET_NOT_ENDED = 'MARKET_NOT_ENDED',
  MARKET_NOT_RESOLVED = 'MARKET_NOT_RESOLVED',
  MARKET_ALREADY_RESOLVED = 'MARKET_ALREADY_RESOLVED',
  NOT_WINNER = 'NOT_WINNER',
  ALREADY_CLAIMED = 'ALREADY_CLAIMED',
  NOTHING_TO_CLAIM = 'NOTHING_TO_CLAIM',
  UNAUTHORIZED = 'UNAUTHORIZED',
  MARKET_PAUSED = 'MARKET_PAUSED',
  INSUFFICIENT_CREATION_FEE = 'INSUFFICIENT_CREATION_FEE',
  MATH_OVERFLOW = 'MATH_OVERFLOW',
  NO_BETS_PLACED = 'NO_BETS_PLACED',
  
  // RPC Errors
  RPC_TIMEOUT = 'RPC_TIMEOUT',
  RPC_RATE_LIMIT = 'RPC_RATE_LIMIT',
  INSUFFICIENT_FUNDS = 'INSUFFICIENT_FUNDS',
  TRANSACTION_FAILED = 'TRANSACTION_FAILED',
  SIMULATION_FAILED = 'SIMULATION_FAILED',
}

export class PredictionMarketError extends Error {
  public readonly code: ErrorCode;
  public readonly originalError?: Error;
  public readonly context?: Record<string, any>;

  constructor(
    code: ErrorCode,
    message: string,
    originalError?: Error,
    context?: Record<string, any>
  ) {
    super(message);
    this.name = 'PredictionMarketError';
    this.code = code;
    this.originalError = originalError;
    this.context = context;
    
    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, PredictionMarketError);
    }
  }

  // Helper to create from Anchor program error
  static fromAnchorError(error: any): PredictionMarketError {
    if (error.error?.errorCode?.code) {
      const anchorCode = error.error.errorCode.code;
      const programErrorCode = ANCHOR_ERROR_MAP[anchorCode] || ErrorCode.TRANSACTION_FAILED;
      
      return new PredictionMarketError(
        programErrorCode,
        error.error.errorMessage || error.message,
        error,
        {
          anchorErrorCode: anchorCode,
          logs: error.logs,
        }
      );
    }

    return new PredictionMarketError(
      ErrorCode.TRANSACTION_FAILED,
      error.message || 'Unknown anchor error',
      error
    );
  }

  // Helper to create from RPC error
  static fromRpcError(error: any): PredictionMarketError {
    if (error.message?.includes('timeout')) {
      return new PredictionMarketError(
        ErrorCode.RPC_TIMEOUT,
        'RPC request timed out',
        error
      );
    }

    if (error.message?.includes('rate limit')) {
      return new PredictionMarketError(
        ErrorCode.RPC_RATE_LIMIT,
        'RPC rate limit exceeded',
        error
      );
    }

    if (error.message?.includes('insufficient funds')) {
      return new PredictionMarketError(
        ErrorCode.INSUFFICIENT_FUNDS,
        'Insufficient SOL balance',
        error
      );
    }

    return new PredictionMarketError(
      ErrorCode.NETWORK_ERROR,
      error.message || 'Network error occurred',
      error
    );
  }

  // Helper to check if error is recoverable
  isRecoverable(): boolean {
    const recoverableErrors = [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.RPC_TIMEOUT,
      ErrorCode.RPC_RATE_LIMIT,
    ];
    
    return recoverableErrors.includes(this.code);
  }

  // Helper to get user-friendly message
  getUserFriendlyMessage(): string {
    switch (this.code) {
      case ErrorCode.ACCOUNT_NOT_FOUND:
        return 'Market or user data not found';
      case ErrorCode.NETWORK_ERROR:
        return 'Network connection issue. Please try again.';
      case ErrorCode.INSUFFICIENT_FUNDS:
        return 'Insufficient SOL balance for this transaction';
      case ErrorCode.MARKET_NOT_ACTIVE:
        return 'This market is not currently accepting bets';
      case ErrorCode.BET_TOO_SMALL:
        return 'Bet amount is too small. Minimum is 0.005 SOL';
      case ErrorCode.VELOCITY_LIMIT_EXCEEDED:
        return 'Bet amount exceeds velocity limit. Please try a smaller amount.';
      case ErrorCode.MARKET_ENDED:
        return 'This market has ended and no longer accepts bets';
      case ErrorCode.ALREADY_CLAIMED:
        return 'Winnings have already been claimed';
      case ErrorCode.NOT_WINNER:
        return 'No winnings to claim for this market';
      case ErrorCode.UNAUTHORIZED:
        return 'You are not authorized to perform this action';
      default:
        return this.message;
    }
  }
}

// Map Anchor error codes to our error codes
const ANCHOR_ERROR_MAP: Record<string, ErrorCode> = {
  'QuestionTooLong': ErrorCode.QUESTION_TOO_LONG,
  'InvalidOptionCount': ErrorCode.INVALID_OPTION_COUNT,
  'OptionTooLong': ErrorCode.OPTION_TOO_LONG,
  'EndTimeInPast': ErrorCode.END_TIME_IN_PAST,
  'MarketTooShort': ErrorCode.MARKET_TOO_SHORT,
  'MarketTooLong': ErrorCode.MARKET_TOO_LONG,
  'MarketNotActive': ErrorCode.MARKET_NOT_ACTIVE,
  'MarketEnded': ErrorCode.MARKET_ENDED,
  'InvalidOptionIndex': ErrorCode.INVALID_OPTION_INDEX,
  'BetTooSmall': ErrorCode.BET_TOO_SMALL,
  'VelocityLimitExceeded': ErrorCode.VELOCITY_LIMIT_EXCEEDED,
  'MarketNotEnded': ErrorCode.MARKET_NOT_ENDED,
  'MarketNotResolved': ErrorCode.MARKET_NOT_RESOLVED,
  'MarketAlreadyResolved': ErrorCode.MARKET_ALREADY_RESOLVED,
  'NotWinner': ErrorCode.NOT_WINNER,
  'AlreadyClaimed': ErrorCode.ALREADY_CLAIMED,
  'NothingToClaim': ErrorCode.NOTHING_TO_CLAIM,
  'Unauthorized': ErrorCode.UNAUTHORIZED,
  'MarketPaused': ErrorCode.MARKET_PAUSED,
  'InsufficientCreationFee': ErrorCode.INSUFFICIENT_CREATION_FEE,
  'MathOverflow': ErrorCode.MATH_OVERFLOW,
  'NoBetsPlaced': ErrorCode.NO_BETS_PLACED,
};

// Helper functions for common error scenarios
export const createAccountNotFoundError = (accountType: string, address: PublicKey) =>
  new PredictionMarketError(
    ErrorCode.ACCOUNT_NOT_FOUND,
    `${accountType} account not found`,
    undefined,
    { accountType, address: address.toString() }
  );

export const createInvalidAccountDataError = (accountType: string, reason: string) =>
  new PredictionMarketError(
    ErrorCode.INVALID_ACCOUNT_DATA,
    `Invalid ${accountType} account data: ${reason}`,
    undefined,
    { accountType, reason }
  );

export const createSerializationError = (operation: string, error: Error) =>
  new PredictionMarketError(
    ErrorCode.SERIALIZATION_ERROR,
    `Serialization failed during ${operation}`,
    error,
    { operation }
  );