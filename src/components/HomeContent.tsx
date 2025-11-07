'use client';

import dynamic from 'next/dynamic';
import DrinkSearch from '@/components/DrinkSearch';
import { Zap } from 'lucide-react';

// Dynamically import MapView to avoid SSR issues with mapbox-gl
const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-900 rounded-lg">
      <p className="text-zinc-400">Loading map...</p>
    </div>
  ),
});

export default function HomeContent() {
  return (
    <>
      {/* Header */}
      <header className="border-b border-purple-500/20 bg-black/40 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-purple-600 to-purple-800 p-2 rounded-lg">
              <Zap className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-white">
              Energy Drink <span className="text-purple-400">Finder</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[calc(100vh-120px)]">
          {/* Left Panel - Search */}
          <div className="flex flex-col gap-6">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">
                Find Your Perfect Energy Drink
              </h2>
              <p className="text-zinc-400">
                Search for your favorite energy drink and find nearby stores
              </p>
            </div>

            <DrinkSearch />

            {/* Info Cards */}
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-gradient-to-br from-purple-900/30 to-black/30 border border-purple-500/20 rounded-lg backdrop-blur-sm">
                <div className="text-2xl font-bold text-purple-400">50+</div>
                <div className="text-sm text-zinc-400">Energy Drinks</div>
              </div>
              <div className="p-4 bg-gradient-to-br from-purple-900/30 to-black/30 border border-purple-500/20 rounded-lg backdrop-blur-sm">
                <div className="text-2xl font-bold text-purple-400">100+</div>
                <div className="text-sm text-zinc-400">Locations</div>
              </div>
            </div>
          </div>

          {/* Right Panel - Map */}
          <div className="h-full min-h-[500px] lg:min-h-0">
            <MapView />
          </div>
        </div>
      </main>
    </>
  );
}
