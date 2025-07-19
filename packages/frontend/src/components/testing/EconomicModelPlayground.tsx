// packages/frontend/src/components/testing/EconomicModelPlayground.tsx
'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TestScenario, defaultEconomicParams, EconomicModelParams } from '@/lib/mock-data';
import { Calculator, RotateCcw, TrendingUp, Users, DollarSign } from 'lucide-react';

interface EconomicModelPlaygroundProps {
  scenarios?: TestScenario[];
}

interface BetSimulation {
  user: string;
  amount: number;
  choice: number;
  timestamp: number;
  isWhale: boolean;
}

export default function EconomicModelPlayground({ 
  scenarios = [] 
}: EconomicModelPlaygroundProps) {
  const [params, setParams] = useState<EconomicModelParams>(defaultEconomicParams);
  const [selectedScenario, setSelectedScenario] = useState<string>('custom');
  const [customBets, setCustomBets] = useState<BetSimulation[]>([
    { user: 'Alice', amount: 10, choice: 0, timestamp: 0, isWhale: false },
    { user: 'Bob', amount: 5, choice: 1, timestamp: 1000, isWhale: false },
    { user: 'Whale', amount: 100, choice: 0, timestamp: 2000, isWhale: true },
  ]);

  // Economic Model Calculations
  const calculateOutcomeScore = (
    timeLeadership: number,
    totalTime: number,
    betAmount: number,
    totalPool: number,
    modelType: string = 'current'
  ): number => {
    const timeScore = (timeLeadership / totalTime) * 100;
    let financialScore = (betAmount / totalPool) * 100;

    switch (modelType) {
      case 'quadratic':
        financialScore = (Math.sqrt(betAmount) / Math.sqrt(totalPool)) * 100;
        break;
      case 'logarithmic':
        financialScore = (Math.log(betAmount + 1) / Math.log(totalPool + 1)) * 100;
        break;
      case 'current':
      default:
        financialScore = (betAmount / totalPool) * 100;
        break;
    }

    // Whale penalty
    if (betAmount > totalPool * params.whaleThreshold) {
      financialScore *= params.whalePenalty;
    }

    return (
      (timeScore * params.timeWeight +
       financialScore * params.financialWeight +
       (params.democraticWeight * 10)) / // Simplified democracy bonus
      100
    );
  };

  const calculateCommission = (
    remainingTimeFactor: number,
    totalPool: number
  ): number => {
    const baseFee = 0.0025; // 0.25%
    
    switch (params.commissionCurve) {
      case 'exponential':
        return baseFee * Math.pow(1 - remainingTimeFactor, 2) * 4;
      case 'logarithmic':
        return baseFee * (1 + Math.log(2 - remainingTimeFactor));
      case 'linear':
      default:
        return baseFee * (1 + (1 - remainingTimeFactor));
    }
  };

  const resetToDefaults = () => {
    setParams(defaultEconomicParams);
  };

  const loadScenario = (scenarioName: string) => {
    const scenario = scenarios.find(s => s.name === scenarioName);
    if (scenario) {
      setParams(scenario.economicParams);
      // Convert MockBet to BetSimulation
      const convertedBets = scenario.bets.map((bet, index) => ({
        user: bet.user,
        amount: bet.amount,
        choice: bet.choice,
        timestamp: index * 1000,
        isWhale: bet.amount > 50 // Simple whale detection
      }));
      setCustomBets(convertedBets);
    }
  };

  // Calculate results for current parameters
  const totalPool = customBets.reduce((sum, bet) => sum + bet.amount, 0);
  const results = customBets.map(bet => ({
    ...bet,
    currentScore: calculateOutcomeScore(500, 1000, bet.amount, totalPool, 'current'),
    quadraticScore: calculateOutcomeScore(500, 1000, bet.amount, totalPool, 'quadratic'),
    logScore: calculateOutcomeScore(500, 1000, bet.amount, totalPool, 'logarithmic'),
    commission: calculateCommission(0.3, totalPool)
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calculator className="w-6 h-6" />
            <span>Economic Model Playground</span>
          </CardTitle>
          <p className="text-sm text-gray-600">
            Test different economic models and see their effects on market outcomes
          </p>
        </CardHeader>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Controls Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Model Parameters</CardTitle>
            <div className="flex space-x-2">
              <Select value={selectedScenario} onValueChange={(value) => {
                setSelectedScenario(value);
                if (value !== 'custom') loadScenario(value);
              }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Load Scenario" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">Custom</SelectItem>
                  {scenarios.map(scenario => (
                    <SelectItem key={scenario.name} value={scenario.name}>
                      {scenario.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={resetToDefaults}>
                <RotateCcw className="w-4 h-4 mr-1" />
                Reset
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {/* Weight Sliders */}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium flex items-center">
                    <TrendingUp className="w-4 h-4 mr-1" />
                    Time Weight
                  </label>
                  <span className="text-sm text-gray-600">{params.timeWeight}%</span>
                </div>
                <Slider
                  value={[params.timeWeight]}
                  onValueChange={([value]) => setParams({...params, timeWeight: value})}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium flex items-center">
                    <DollarSign className="w-4 h-4 mr-1" />
                    Financial Weight
                  </label>
                  <span className="text-sm text-gray-600">{params.financialWeight}%</span>
                </div>
                <Slider
                  value={[params.financialWeight]}
                  onValueChange={([value]) => setParams({...params, financialWeight: value})}
                  max={100}
                  step={5}
                  className="w-full"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-sm font-medium flex items-center">
                    <Users className="w-4 h-4 mr-1" />
                    Democratic Weight
                  </label>
                  <span className="text-sm text-gray-600">{params.democraticWeight}%</span>
                </div>
                <Slider
                  value={[params.democraticWeight]}
                  onValueChange={([value]) => setParams({...params, democraticWeight: value})}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>
            </div>

            {/* Whale Protection */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Whale Protection</h4>
              <div className="space-y-3">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Whale Threshold</label>
                    <span className="text-sm text-gray-600">{(params.whaleThreshold * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[params.whaleThreshold * 100]}
                    onValueChange={([value]) => setParams({...params, whaleThreshold: value / 100})}
                    max={50}
                    step={5}
                    className="w-full"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium">Whale Penalty</label>
                    <span className="text-sm text-gray-600">{(params.whalePenalty * 100).toFixed(0)}%</span>
                  </div>
                  <Slider
                    value={[params.whalePenalty * 100]}
                    onValueChange={([value]) => setParams({...params, whalePenalty: value / 100})}
                    min={50}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Commission Curve */}
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-3">Commission Model</h4>
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
          </CardContent>
        </Card>

        {/* Results Panel */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Simulation Results</CardTitle>
            <p className="text-sm text-gray-600">
              Compare different scoring models with current parameters
            </p>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">{totalPool}</div>
                  <div className="text-xs text-gray-600">Total Pool</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">{customBets.length}</div>
                  <div className="text-xs text-gray-600">Bettors</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-red-600">
                    {customBets.filter(b => b.isWhale).length}
                  </div>
                  <div className="text-xs text-gray-600">Whales</div>
                </div>
              </div>

              {/* Detailed Results */}
              <div className="space-y-3">
                {results.map((result, index) => (
                  <div key={index} className="border rounded-lg p-3">
                    <div className="flex justify-between items-center mb-2">
                      <span className="font-medium">{result.user}</span>
                      <div className="flex space-x-2">
                        <Badge variant={result.isWhale ? "destructive" : "default"}>
                          {result.amount} SOL
                        </Badge>
                        {result.isWhale && <Badge variant="outline">🐋</Badge>}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-gray-600">Current Model</div>
                        <div className="font-semibold">{result.currentScore.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Quadratic</div>
                        <div className="font-semibold">{result.quadraticScore.toFixed(1)}</div>
                      </div>
                      <div>
                        <div className="text-gray-600">Logarithmic</div>
                        <div className="font-semibold">{result.logScore.toFixed(1)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Commission Info */}
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="text-sm font-medium text-blue-800 mb-1">
                  Commission ({params.commissionCurve})
                </div>
                <div className="text-2xl font-bold text-blue-600">
                  {(results[0]?.commission * 100 || 0).toFixed(3)}%
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}