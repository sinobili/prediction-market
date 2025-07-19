// src/components/market/MarketCard.tsx
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Users, TrendingUp } from 'lucide-react';
import { MockMarket, formatTimeRemaining } from '@/lib/mock-data';

interface MarketCardProps {
  market: MockMarket;
  onClick?: () => void;
  showBetButton?: boolean;
}

export default function MarketCard({ 
  market, 
  onClick, 
  showBetButton = true 
}: MarketCardProps) {
  const getPhaseColor = (phase: string) => {
    switch (phase) {
      case 'betting': return 'default';
      case 'resolution': return 'secondary';
      case 'settled': return 'outline';
      default: return 'default';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'betting': return '🎯';
      case 'resolution': return '⏳';
      case 'settled': return '✅';
      default: return '🎯';
    }
  };

  return (
    <Card 
      className="hover:shadow-lg transition-all duration-200 cursor-pointer group hover:scale-[1.02]"
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start mb-3">
          <Badge 
            variant={getPhaseColor(market.phase)}
            className="mb-2"
          >
            {getPhaseIcon(market.phase)} {market.phase.toUpperCase()}
          </Badge>
          <div className="flex space-x-1">
            {market.whaleWarning && (
              <Badge variant="destructive" className="text-xs">
                🐋 Whale Alert
              </Badge>
            )}
            {market.recentActivity.length > 3 && (
              <Badge variant="outline" className="text-xs">
                🔥 Hot
              </Badge>
            )}
          </div>
        </div>
        
        <CardTitle className="text-lg leading-tight group-hover:text-blue-600 transition-colors">
          {market.question}
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Pool Info - More Prominent */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 flex items-center">
                <TrendingUp className="w-4 h-4 mr-1" />
                Total Pool:
              </span>
              <span className="font-bold text-lg text-blue-600">
                {market.totalPool.toLocaleString()} SOL
              </span>
            </div>
          </div>
          
          {/* Options and Odds with Better Visual */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">
              Market Odds:
            </h4>
            {market.options.map((option, index) => (
              <div key={index} className="space-y-1">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-800">
                    {option}
                  </span>
                  <span className="text-sm font-bold text-gray-900">
                    {(market.odds[index] * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div 
                    className="bg-gradient-to-r from-blue-500 to-blue-600 h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${market.odds[index] * 100}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t">
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-500 mb-1">
                <Users className="w-4 h-4 mr-1" />
                <span className="text-xs">Bettors</span>
              </div>
              <div className="font-semibold text-sm">{market.uniqueBettors}</div>
            </div>
            
            <div className="text-center">
              <div className="flex items-center justify-center text-gray-500 mb-1">
                <Clock className="w-4 h-4 mr-1" />
                <span className="text-xs">Time Left</span>
              </div>
              <div className="font-semibold text-sm">
                {formatTimeRemaining(market.timeRemaining)}
              </div>
            </div>
          </div>
          
          {/* Commission Info */}
          <div className="text-xs text-gray-500 text-center py-2 bg-gray-50 rounded">
            Commission: {(market.currentCommission * 100).toFixed(3)}% • 
            Velocity Limit: {market.velocityLimit} SOL/h
          </div>
          
          {/* Action Button */}
          {showBetButton && market.phase === 'betting' && (
            <Button 
              className="w-full mt-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
              onClick={(e) => {
                e.stopPropagation();
                // Handle bet click
                console.log('Bet on market:', market.id);
              }}
            >
              Place Bet
            </Button>
          )}
          
          {market.phase === 'resolution' && (
            <Button 
              variant="outline" 
              className="w-full mt-3"
              onClick={(e) => {
                e.stopPropagation();
                console.log('View resolution:', market.id);
              }}
            >
              View Resolution
            </Button>
          )}
          
          {market.phase === 'settled' && (
            <Button 
              variant="ghost" 
              className="w-full mt-3"
              disabled
            >
              Market Settled
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}