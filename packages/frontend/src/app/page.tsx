// src/app/page.tsx
'use client';

import { mockMarkets } from '@/lib/mock-data';
import MarketCard from '@/components/market/MarketCard';
import EconomicModelPlayground from '@/components/testing/EconomicModelPlayground';
import { testScenarios } from '@/lib/mock-data';
import AdvancedEconomicPlayground from '@/components/testing/AdvancedEconomicPlayground';


export default function HomePage() {
  const handleMarketClick = (marketId: string) => {
    console.log('Market clicked:', marketId);
    // will add: router.push(`/market/${marketId}`)
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto p-8">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Prediction Markets
          </h1>
          <p className="text-xl text-gray-600 mb-2">
            Decentralized prediction markets on Solana
          </p>
          <p className="text-sm text-gray-500">
            Oracle-free • Community-driven • Transparent
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-blue-600">
              {mockMarkets.length}
            </div>
            <div className="text-sm text-gray-600">Active Markets</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-green-600">
              {mockMarkets.reduce((sum, m) => sum + m.totalPool, 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600">Total SOL Locked</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-purple-600">
              {mockMarkets.reduce((sum, m) => sum + m.uniqueBettors, 0)}
            </div>
            <div className="text-sm text-gray-600">Total Bettors</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow-sm text-center">
            <div className="text-2xl font-bold text-orange-600">
              {mockMarkets.filter(m => m.whaleWarning).length}
            </div>
            <div className="text-sm text-gray-600">Whale Alerts</div>
          </div>
        </div>

        {/* Markets Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {mockMarkets.map(market => (
            <MarketCard 
              key={market.id} 
              market={market}
              onClick={() => handleMarketClick(market.id)}
            />
          ))}
        </div>
        {/* Economic Model Playground */}
        <div className="mt-16">
          <EconomicModelPlayground scenarios={testScenarios} /> 
        </div>
        {/* Advanced Economic Playground */}
        <div className="mt-16">
          <AdvancedEconomicPlayground />
        </div>

        {/* Footer */}
        <div className="mt-16 text-center text-gray-500 text-sm">
          <p>Powered by Solana • Built with Next.js</p>
        </div>
      </div>
    </main>
  );
}
