// lib/mock-data.ts

export interface MockMarket {
  id: string;
  question: string;
  options: string[];
  odds: number[];
  totalPool: number;
  endTime: Date;
  phase: 'betting' | 'resolution' | 'settled';
  timeRemaining: number; // hours
  uniqueBettors: number;
  recentActivity: MockBet[];
  whaleWarning?: boolean;
  velocityLimit: number;
  currentCommission: number;
}

export interface MockBet {
  id: string;
  user: string;
  amount: number;
  choice: number;
  timestamp: Date;
  odds: number[];
}

export interface MockUser {
  address: string;
  nickname: string;
  totalBets: number;
  winRate: number;
  isWhale: boolean;
}

// Mock Market Data
export const mockMarkets: MockMarket[] = [
  {
    id: '1',
    question: 'Will Bitcoin reach $100,000 by end of 2025?',
    options: ['Yes', 'No'],
    odds: [0.65, 0.35],
    totalPool: 1500, // SOL
    endTime: new Date('2025-12-31T23:59:59'),
    phase: 'betting',
    timeRemaining: 156, // hours
    uniqueBettors: 42,
    velocityLimit: 50, // SOL per hour
    currentCommission: 0.0025, // 0.25%
    recentActivity: [
      {
        id: 'bet1',
        user: 'Alice',
        amount: 10,
        choice: 0,
        timestamp: new Date(Date.now() - 30000),
        odds: [0.64, 0.36]
      },
      {
        id: 'bet2', 
        user: 'Bob',
        amount: 25,
        choice: 1,
        timestamp: new Date(Date.now() - 60000),
        odds: [0.66, 0.34]
      }
    ]
  },
  {
    id: '2',
    question: 'Will Solana surpass Ethereum in TVL by 2026?',
    options: ['Yes', 'No'],
    odds: [0.28, 0.72],
    totalPool: 850,
    endTime: new Date('2026-01-01T00:00:00'),
    phase: 'betting',
    timeRemaining: 8760, // 1 year
    uniqueBettors: 18,
    velocityLimit: 30,
    currentCommission: 0.0025,
    whaleWarning: true,
    recentActivity: [
      {
        id: 'bet3',
        user: 'Charlie',
        amount: 150,
        choice: 0,
        timestamp: new Date(Date.now() - 120000),
        odds: [0.25, 0.75]
      }
    ]
  },
  {
    id: '3',
    question: 'Will AI achieve AGI (Artificial General Intelligence) by 2030?',
    options: ['Yes', 'No', 'Uncertain'],
    odds: [0.45, 0.35, 0.20],
    totalPool: 2300,
    endTime: new Date('2030-12-31T23:59:59'),
    phase: 'betting',
    timeRemaining: 43800, // ~5 years
    uniqueBettors: 67,
    velocityLimit: 75,
    currentCommission: 0.0025,
    recentActivity: []
  },
  {
    id: '4',
    question: 'Will there be a major earthquake (>7.0) in California in 2025?',
    options: ['Yes', 'No'],
    odds: [0.15, 0.85],
    totalPool: 420,
    endTime: new Date('2025-12-31T23:59:59'),
    phase: 'resolution', // Voting phase
    timeRemaining: 0,
    uniqueBettors: 23,
    velocityLimit: 0,
    currentCommission: 0.005, // Higher commission in resolution
    recentActivity: []
  }
];

// Mock Users
export const mockUsers: MockUser[] = [
  {
    address: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    nickname: 'CryptoWhale92',
    totalBets: 157,
    winRate: 0.68,
    isWhale: true
  },
  {
    address: '4vJ9JU1bJJE96FWSJKvHsmmFADCg4gpZQff4P3bkLKi',
    nickname: 'SmartMoney',
    totalBets: 89,
    winRate: 0.72,
    isWhale: false
  },
  {
    address: 'AxZfZWeqztBCL4Kg8kzfYQpJqjAyTwxF8nSJ2w7x9Rb',
    nickname: 'NewbieTrader',
    totalBets: 12,
    winRate: 0.33,
    isWhale: false
  }
];

// Economic Model Testing Data
export interface EconomicModelParams {
  timeWeight: number;      // 0-100
  financialWeight: number; // 0-100
  democraticWeight: number; // 0-100
  whaleThreshold: number;  // 0-1
  whalePenalty: number;    // 0-1
  commissionCurve: 'linear' | 'exponential' | 'logarithmic';
  velocityFactor: number;  // 0-5
}

export const defaultEconomicParams: EconomicModelParams = {
  timeWeight: 70,
  financialWeight: 25,
  democraticWeight: 5,
  whaleThreshold: 0.2,
  whalePenalty: 0.8,
  commissionCurve: 'linear',
  velocityFactor: 0.2
};

// Scenario Testing Data
export interface TestScenario {
  name: string;
  description: string;
  bets: MockBet[];
  expectedOutcome: string;
  economicParams: EconomicModelParams;
}

export const testScenarios: TestScenario[] = [
  {
    name: 'Whale Dominance',
    description: 'Single large bettor tries to manipulate market',
    bets: [
      { id: 's1', user: 'SmallBettor1', amount: 1, choice: 0, timestamp: new Date(), odds: [0.5, 0.5] },
      { id: 's2', user: 'SmallBettor2', amount: 2, choice: 0, timestamp: new Date(), odds: [0.52, 0.48] },
      { id: 's3', user: 'WhaleUser', amount: 100, choice: 1, timestamp: new Date(), odds: [0.45, 0.55] },
    ],
    expectedOutcome: 'Whale penalty should limit impact',
    economicParams: {
      ...defaultEconomicParams,
      whaleThreshold: 0.3,
      whalePenalty: 0.7
    }
  },
  {
    name: 'Last Minute Rush',
    description: 'Many bets placed in final hour',
    bets: [
      { id: 'l1', user: 'EarlyBird', amount: 10, choice: 0, timestamp: new Date(Date.now() - 86400000), odds: [0.5, 0.5] },
      { id: 'l2', user: 'LastMinute1', amount: 15, choice: 1, timestamp: new Date(Date.now() - 3600000), odds: [0.6, 0.4] },
      { id: 'l3', user: 'LastMinute2', amount: 20, choice: 1, timestamp: new Date(Date.now() - 1800000), odds: [0.55, 0.45] },
    ],
    expectedOutcome: 'Higher commission should discourage late betting',
    economicParams: {
      ...defaultEconomicParams,
      commissionCurve: 'exponential'
    }
  }
];

// Helper Functions
export const calculateOdds = (pools: number[]): number[] => {
  const total = pools.reduce((sum, pool) => sum + pool, 0);
  if (total === 0) return pools.map(() => 0);
  return pools.map(pool => pool / total);
};

export const calculatePotentialPayout = (
  betAmount: number, 
  choice: number, 
  currentPools: number[]
): number => {
  const totalPool = currentPools.reduce((sum, pool) => sum + pool, 0);
  const newPools = [...currentPools];
  newPools[choice] += betAmount;
  const newTotal = newPools.reduce((sum, pool) => sum + pool, 0);
  
  // Simple pari-mutuel calculation
  return (newTotal / newPools[choice]) * betAmount;
};

export const formatTimeRemaining = (hours: number): string => {
  if (hours <= 0) return 'Ended';
  if (hours < 1) return `${Math.floor(hours * 60)}m`;
  if (hours < 24) return `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`;
  const days = Math.floor(hours / 24);
  const remainingHours = Math.floor(hours % 24);
  return `${days}d ${remainingHours}h`;
};

export const isWhaleWarning = (betAmount: number, totalPool: number): boolean => {
  return betAmount > totalPool * 0.2; // 20% threshold
};