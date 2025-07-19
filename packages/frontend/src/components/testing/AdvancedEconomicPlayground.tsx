// packages/frontend/src/components/testing/AdvancedEconomicPlayground.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Calculator, 
  RotateCcw, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  AlertTriangle,
  Play,
  Pause,
  SkipForward,
  Target,
  Gavel,
  TrendingDown
} from 'lucide-react';

// Extended interfaces for comprehensive testing
interface MarketPhase {
  phase: 'betting' | 'resolution' | 'settled';
  timeRemaining: number; // in hours
  totalDuration: number; // in hours
}

interface ExtendedBet {
  id: string;
  user: string;
  amount: number;
  choice: number;
  timestamp: number; // relative to market start
  isWhale: boolean;
  leadershipTime?: number; // how long this choice was leading after this bet
}

interface ResolutionVote {
  voter: string;
  choice: number;
  stake: number;
  timestamp: number;
}

interface TestScenarioType {
  name: string;
  description: string;
  bets: ExtendedBet[];
  resolutionVotes?: ResolutionVote[];
  hardcap?: number;
  actualOutcome: number;
}

interface MarketSimulation {
  id: string;
  question: string;
  options: string[];
  bets: ExtendedBet[];
  resolutionVotes: ResolutionVote[];
  phase: MarketPhase;
  hardcap?: number;
  actualOutcome?: number; // for testing accuracy
  economicParams: EconomicModelParams;
}

interface EconomicModelParams {
  // Phase 1: Betting
  timeWeight: number;
  financialWeight: number;
  democraticWeight: number;
  whaleThreshold: number;
  whalePenalty: number;
  commissionCurve: 'linear' | 'exponential' | 'logarithmic';
  velocityFactor: number;
  hardcapEnabled: boolean;
  hardcapMultiplier: number; // 2x, 5x, 10x of initial pool
  
  // Phase 2: Resolution
  resolutionMethod: 'time-weighted' | 'stake-weighted' | 'hybrid';
  resolutionMinStake: number;
  resolutionTimeWindow: number; // hours
  uncertaintyThreshold: number; // % for "uncertain" outcome
  slashingPenalty: number; // penalty for wrong resolution votes
}

const defaultParams: EconomicModelParams = {
  timeWeight: 70,
  financialWeight: 25,
  democraticWeight: 5,
  whaleThreshold: 0.2,
  whalePenalty: 0.8,
  commissionCurve: 'linear',
  velocityFactor: 0.2,
  hardcapEnabled: false,
  hardcapMultiplier: 5,
  resolutionMethod: 'hybrid',
  resolutionMinStake: 10,
  resolutionTimeWindow: 48,
  uncertaintyThreshold: 0.1,
  slashingPenalty: 0.2
};

export default function AdvancedEconomicPlayground() {
  const [params, setParams] = useState<EconomicModelParams>(defaultParams);
  const [simulation, setSimulation] = useState<MarketSimulation>({
    id: 'test-1',
    question: 'Will Bitcoin reach $100,000 by end of 2025?',
    options: ['Yes', 'No'],
    bets: [
      { id: 'b1', user: 'Alice', amount: 10, choice: 0, timestamp: 0, isWhale: false },
      { id: 'b2', user: 'Bob', amount: 15, choice: 1, timestamp: 1000, isWhale: false },
      { id: 'b3', user: 'Charlie', amount: 5, choice: 0, timestamp: 2000, isWhale: false },
    ],
    resolutionVotes: [],
    phase: { phase: 'betting', timeRemaining: 24, totalDuration: 168 }, // 1 week
    actualOutcome: 0, // Bitcoin will reach $100k
    economicParams: defaultParams
  });
  
  const [isSimulating, setIsSimulating] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>('whale-manipulation');

  // Predefined test scenarios
  const testScenarios: Record<string, TestScenarioType> = {
    'whale-manipulation': {
      name: 'Whale Manipulation Test',
      description: 'Large bettor tries to manipulate market in final hours',
      bets: [
        { id: 'w1', user: 'EarlyBird', amount: 10, choice: 0, timestamp: 0, isWhale: false },
        { id: 'w2', user: 'Normal1', amount: 5, choice: 1, timestamp: 1000, isWhale: false },
        { id: 'w3', user: 'Normal2', amount: 8, choice: 0, timestamp: 2000, isWhale: false },
        { id: 'w4', user: 'WHALE', amount: 200, choice: 1, timestamp: 160000, isWhale: true }, // Last 8 hours
      ],
      actualOutcome: 0 // Early prediction was correct
    },
    'hardcap-test': {
      name: 'Hardcap Mechanism Test',
      description: 'Market hits hardcap and stops accepting bets',
      bets: [
        { id: 'h1', user: 'User1', amount: 50, choice: 0, timestamp: 0, isWhale: false },
        { id: 'h2', user: 'User2', amount: 100, choice: 1, timestamp: 1000, isWhale: true },
        { id: 'h3', user: 'User3', amount: 150, choice: 0, timestamp: 2000, isWhale: true }, // Would exceed hardcap
      ],
      hardcap: 200,
      actualOutcome: 1
    },
    'uncertain-resolution': {
      name: 'Uncertain Resolution Test',
      description: 'Market outcome is unclear, should resolve as uncertain',
      bets: [
        { id: 'u1', user: 'Optimist', amount: 25, choice: 0, timestamp: 0, isWhale: false },
        { id: 'u2', user: 'Pessimist', amount: 25, choice: 1, timestamp: 1000, isWhale: false },
        { id: 'u3', user: 'Balanced', amount: 20, choice: 0, timestamp: 2000, isWhale: false },
      ],
      resolutionVotes: [
        { voter: 'Resolver1', choice: 0, stake: 10, timestamp: 0 },
        { voter: 'Resolver2', choice: 1, stake: 12, timestamp: 100 },
        { voter: 'Resolver3', choice: 0, stake: 8, timestamp: 200 },
      ],
      actualOutcome: -1 // Uncertain
    },
    'late-rush': {
      name: 'Late Rush Test',
      description: 'Many bets placed in final hours with high commission',
      bets: [
        { id: 'l1', user: 'Early1', amount: 20, choice: 0, timestamp: 0, isWhale: false },
        { id: 'l2', user: 'Early2', amount: 15, choice: 1, timestamp: 1000, isWhale: false },
        { id: 'l3', user: 'Late1', amount: 30, choice: 1, timestamp: 160000, isWhale: false }, // Last 8h
        { id: 'l4', user: 'Late2', amount: 25, choice: 1, timestamp: 164000, isWhale: false }, // Last 4h
        { id: 'l5', user: 'VeryLate', amount: 40, choice: 1, timestamp: 166000, isWhale: false }, // Last 2h
      ],
      actualOutcome: 0 // Early prediction was right, but late money dominated
    }
  };

  // Economic calculations
  const calculateLeadershipTime = (bets: ExtendedBet[], totalTime: number) => {
    const leadershipTracker: { [choice: number]: number } = {};
    let currentLeader = -1;
    let lastTimestamp = 0;
    
    // Sort bets by timestamp
    const sortedBets = [...bets].sort((a, b) => a.timestamp - b.timestamp);
    
    sortedBets.forEach((bet, index) => {
      // Update leadership time for current leader
      if (currentLeader !== -1) {
        leadershipTracker[currentLeader] = (leadershipTracker[currentLeader] || 0) + 
          (bet.timestamp - lastTimestamp);
      }
      
      // Calculate new pools after this bet
      const poolsByChoice: { [choice: number]: number } = {};
      sortedBets.slice(0, index + 1).forEach(b => {
        poolsByChoice[b.choice] = (poolsByChoice[b.choice] || 0) + b.amount;
      });
      
      // Find new leader
      currentLeader = Object.keys(poolsByChoice).reduce((leader, choice) => 
        poolsByChoice[parseInt(choice)] > (poolsByChoice[leader] || 0) ? parseInt(choice) : leader
      , 0);
      
      lastTimestamp = bet.timestamp;
    });
    
    // Add remaining time for final leader
    if (currentLeader !== -1) {
      leadershipTracker[currentLeader] = (leadershipTracker[currentLeader] || 0) + 
        (totalTime * 3600000 - lastTimestamp); // Convert hours to ms
    }
    
    return leadershipTracker;
  };

  const calculateOutcomeScore = (
    choice: number,
    bets: ExtendedBet[],
    leadershipTime: { [choice: number]: number },
    totalTime: number
  ): number => {
    const choiceBets = bets.filter(b => b.choice === choice);
    const totalBetAmount = choiceBets.reduce((sum, bet) => sum + bet.amount, 0);
    const totalPool = bets.reduce((sum, bet) => sum + bet.amount, 0);
    
    // Time component
    const timeScore = ((leadershipTime[choice] || 0) / (totalTime * 3600000)) * 100;
    
    // Financial component (with whale penalties)
    let financialScore = (totalBetAmount / totalPool) * 100;
    
    // Apply whale penalties
    choiceBets.forEach(bet => {
      if (bet.amount > totalPool * params.whaleThreshold) {
        const penalty = 1 - params.whalePenalty;
        financialScore -= (bet.amount / totalPool) * penalty * 100;
      }
    });
    
    // Democratic component (number of unique bettors)
    const democraticScore = (choiceBets.length / bets.length) * 100;
    
    return (
      (timeScore * params.timeWeight +
       Math.max(0, financialScore) * params.financialWeight +
       democraticScore * params.democraticWeight) / 100
    );
  };

  const calculateCommission = (timestamp: number, totalDuration: number): number => {
    const remainingTime = Math.max(0, totalDuration * 3600000 - timestamp);
    const remainingFactor = remainingTime / (totalDuration * 3600000);
    const baseFee = 0.0025;
    
    switch (params.commissionCurve) {
      case 'exponential':
        return baseFee * Math.pow(2, 2 * (1 - remainingFactor));
      case 'logarithmic':
        return baseFee * (1 + Math.log(2 - remainingFactor));
      case 'linear':
      default:
        return baseFee * (1 + (1 - remainingFactor));
    }
  };

  const runSimulation = () => {
    const scenario = testScenarios[selectedTest];
    
    setSimulation({
      ...simulation,
      bets: scenario.bets,
      resolutionVotes: scenario.resolutionVotes || [],
      hardcap: scenario.hardcap,
      actualOutcome: scenario.actualOutcome,
      economicParams: params
    });
  };

  const simulateResolution = () => {
    // Calculate final scores
    const leadershipTime = calculateLeadershipTime(simulation.bets, simulation.phase.totalDuration);
    const scores = simulation.options.map((_, index) => 
      calculateOutcomeScore(index, simulation.bets, leadershipTime, simulation.phase.totalDuration)
    );
    
    // Determine winner based on resolution method
    let resolvedOutcome: number;
    
    if (params.resolutionMethod === 'time-weighted') {
      resolvedOutcome = scores.indexOf(Math.max(...scores));
    } else if (params.resolutionMethod === 'stake-weighted' && simulation.resolutionVotes.length > 0) {
      const votesByChoice: { [choice: number]: number } = {};
      simulation.resolutionVotes.forEach(vote => {
        votesByChoice[vote.choice] = (votesByChoice[vote.choice] || 0) + vote.stake;
      });
      const winningChoice = Object.keys(votesByChoice).reduce((a, b) => 
        votesByChoice[parseInt(a)] > votesByChoice[parseInt(b)] ? a : b
      );
      resolvedOutcome = parseInt(winningChoice);
    } else {
      // Hybrid: combine both methods
      resolvedOutcome = scores.indexOf(Math.max(...scores));
    }
    
    // Check for uncertainty
    const topTwo = scores.sort((a, b) => b - a);
    const margin = (topTwo[0] - topTwo[1]) / topTwo[0];
    
    if (margin < params.uncertaintyThreshold) {
      resolvedOutcome = -1; // Uncertain
    }
    
    setSimulation({
      ...simulation,
      phase: { ...simulation.phase, phase: 'settled' }
    });
    
    return { resolvedOutcome, scores, margin };
  };

  // Calculate current results
  const totalPool = simulation.bets.reduce((sum, bet) => sum + bet.amount, 0);
  const leadershipTime = calculateLeadershipTime(simulation.bets, simulation.phase.totalDuration);
  const currentScores = simulation.options.map((_, index) => 
    calculateOutcomeScore(index, simulation.bets, leadershipTime, simulation.phase.totalDuration)
  );

  const loadTestScenario = (scenarioKey: string) => {
    setSelectedTest(scenarioKey);
    runSimulation();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-6 h-6" />
            <span>Advanced Economic Model Testing</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Comprehensive testing for two-phase market resolution, whale protection, hardcaps, and edge cases
          </p>
        </CardHeader>
      </Card>

      {/* Test Scenario Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center space-x-2">
            <Target className="w-5 h-5" />
            <span>Test Scenarios</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(testScenarios).map(([key, scenario]) => (
              <Button
                key={key}
                variant={selectedTest === key ? "default" : "outline"}
                className="h-auto p-3 text-left"
                onClick={() => loadTestScenario(key)}
              >
                <div>
                  <div className="font-semibold text-sm">{scenario.name}</div>
                  <div className="text-xs text-gray-600 mt-1">{scenario.description}</div>
                </div>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Phase 1 Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <TrendingUp className="w-5 h-5" />
              <span>Phase 1: Betting</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Weight Controls */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">Time Weight: {params.timeWeight}%</label>
                <Slider
                  value={[params.timeWeight]}
                  onValueChange={([value]) => setParams({...params, timeWeight: value})}
                  max={100}
                  step={5}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Financial Weight: {params.financialWeight}%</label>
                <Slider
                  value={[params.financialWeight]}
                  onValueChange={([value]) => setParams({...params, financialWeight: value})}
                  max={100}
                  step={5}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium">Democratic Weight: {params.democraticWeight}%</label>
                <Slider
                  value={[params.democraticWeight]}
                  onValueChange={([value]) => setParams({...params, democraticWeight: value})}
                  max={30}
                  step={1}
                />
              </div>
            </div>

            {/* Whale Protection */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">Whale Protection</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-sm">Threshold: {(params.whaleThreshold * 100).toFixed(0)}%</label>
                  <Slider
                    value={[params.whaleThreshold * 100]}
                    onValueChange={([value]) => setParams({...params, whaleThreshold: value / 100})}
                    max={50}
                    step={5}
                  />
                </div>
                <div>
                  <label className="text-sm">Penalty: {(params.whalePenalty * 100).toFixed(0)}%</label>
                  <Slider
                    value={[params.whalePenalty * 100]}
                    onValueChange={([value]) => setParams({...params, whalePenalty: value / 100})}
                    min={50}
                    max={100}
                    step={5}
                  />
                </div>
              </div>
            </div>

            {/* Commission & Hardcap */}
            <div className="border-t pt-4 space-y-3">
              <div>
                <label className="text-sm font-medium">Commission Curve</label>
                <Select 
                  value={params.commissionCurve} 
                  onValueChange={(value: 'linear' | 'exponential' | 'logarithmic') => 
                    setParams({...params, commissionCurve: value})
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linear">Linear</SelectItem>
                    <SelectItem value="exponential">Exponential</SelectItem>
                    <SelectItem value="logarithmic">Logarithmic</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center space-x-2">
                <input 
                  type="checkbox" 
                  checked={params.hardcapEnabled}
                  onChange={(e) => setParams({...params, hardcapEnabled: e.target.checked})}
                />
                <label className="text-sm">Enable Hardcap</label>
              </div>
              
              {params.hardcapEnabled && (
                <div>
                  <label className="text-sm">Hardcap Multiplier: {params.hardcapMultiplier}x</label>
                  <Slider
                    value={[params.hardcapMultiplier]}
                    onValueChange={([value]) => setParams({...params, hardcapMultiplier: value})}
                    min={2}
                    max={20}
                    step={1}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Phase 2 Parameters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <Gavel className="w-5 h-5" />
              <span>Phase 2: Resolution</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Resolution Method</label>
              <Select 
                value={params.resolutionMethod} 
                onValueChange={(value: 'time-weighted' | 'stake-weighted' | 'hybrid') => 
                  setParams({...params, resolutionMethod: value})
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="time-weighted">Time-weighted Only</SelectItem>
                  <SelectItem value="stake-weighted">Stake-weighted Only</SelectItem>
                  <SelectItem value="hybrid">Hybrid (Time + Stake)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm">Min Stake for Resolution: {params.resolutionMinStake} SOL</label>
              <Slider
                value={[params.resolutionMinStake]}
                onValueChange={([value]) => setParams({...params, resolutionMinStake: value})}
                min={1}
                max={100}
                step={1}
              />
            </div>
            
            <div>
              <label className="text-sm">Resolution Window: {params.resolutionTimeWindow}h</label>
              <Slider
                value={[params.resolutionTimeWindow]}
                onValueChange={([value]) => setParams({...params, resolutionTimeWindow: value})}
                min={12}
                max={168}
                step={12}
              />
            </div>
            
            <div>
              <label className="text-sm">Uncertainty Threshold: {(params.uncertaintyThreshold * 100).toFixed(0)}%</label>
              <Slider
                value={[params.uncertaintyThreshold * 100]}
                onValueChange={([value]) => setParams({...params, uncertaintyThreshold: value / 100})}
                min={5}
                max={30}
                step={1}
              />
            </div>
            
            <div>
              <label className="text-sm">Slashing Penalty: {(params.slashingPenalty * 100).toFixed(0)}%</label>
              <Slider
                value={[params.slashingPenalty * 100]}
                onValueChange={([value]) => setParams({...params, slashingPenalty: value / 100})}
                min={10}
                max={50}
                step={5}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results & Simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center space-x-2">
              <TrendingDown className="w-5 h-5" />
              <span>Live Results</span>
            </CardTitle>
            <div className="flex space-x-2">
              <Button size="sm" onClick={runSimulation}>
                <Play className="w-4 h-4 mr-1" />
                Run Test
              </Button>
              <Button size="sm" variant="outline" onClick={simulateResolution}>
                <SkipForward className="w-4 h-4 mr-1" />
                Resolve
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Current Market State */}
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium mb-2">Market Status</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>Total Pool: <span className="font-semibold">{totalPool} SOL</span></div>
                <div>Bettors: <span className="font-semibold">{simulation.bets.length}</span></div>
                <div>Phase: <Badge variant="outline">{simulation.phase.phase}</Badge></div>
                <div>Whales: <span className="font-semibold text-red-600">{simulation.bets.filter(b => b.isWhale).length}</span></div>
              </div>
            </div>

            {/* Current Scores */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Current Scores:</div>
              {simulation.options.map((option, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span className="text-sm">{option}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full" 
                        style={{ width: `${(currentScores[index] || 0)}%` }}
                      ></div>
                    </div>
                    <span className="text-xs font-semibold min-w-[40px]">
                      {(currentScores[index] || 0).toFixed(1)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Bet Details */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Recent Bets:</div>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {simulation.bets.slice(-5).map((bet, index) => (
                  <div key={bet.id} className="flex justify-between items-center text-xs bg-white p-2 rounded">
                    <span>{bet.user}</span>
                    <div className="flex items-center space-x-1">
                      <span>{bet.amount} SOL</span>
                      <Badge variant={bet.isWhale ? "destructive" : "secondary"} className="text-xs">
                        {simulation.options[bet.choice]}
                      </Badge>
                      {bet.isWhale && <span>🐋</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Leadership Time */}
            <div className="space-y-2">
              <div className="text-sm font-medium">Leadership Time:</div>
              {simulation.options.map((option, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span>{option}</span>
                  <span>{((leadershipTime[index] || 0) / 3600000).toFixed(1)}h</span>
                </div>
              ))}
            </div>

            {/* Accuracy Check */}
            {simulation.actualOutcome !== undefined && (
              <div className="border-t pt-3">
                <div className="text-sm font-medium mb-1">Accuracy Check:</div>
                <div className="text-xs">
                  <div>Actual: <Badge>{
                    simulation.actualOutcome === -1 ? 'Uncertain' : simulation.options[simulation.actualOutcome]
                  }</Badge></div>
                  <div>Predicted: <Badge variant="outline">{
                    simulation.options[currentScores.indexOf(Math.max(...currentScores))]
                  }</Badge></div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}