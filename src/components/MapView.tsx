'use client';

import { useEffect, useState } from 'react';
import { MapPin } from 'lucide-react';

interface MapViewProps {
  latitude?: number;
  longitude?: number;
}

export default function MapView({ latitude = 37.7749, longitude = -122.4194 }: MapViewProps) {
  const [location, setLocation] = useState({ lat: latitude, lng: longitude });

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
        }
      );
    }
  }, []);

  // Mock gas stations for demo
  const mockStations = [
    { id: 1, name: 'Shell Station', lat: location.lat + 0.01, lng: location.lng + 0.01 },
    { id: 2, name: '7-Eleven', lat: location.lat - 0.01, lng: location.lng - 0.01 },
    { id: 3, name: 'Chevron', lat: location.lat + 0.015, lng: location.lng - 0.015 },
    { id: 4, name: 'Mobil', lat: location.lat - 0.015, lng: location.lng + 0.015 },
  ];

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-purple-500/30 shadow-xl shadow-purple-500/10 bg-gradient-to-br from-zinc-900 to-zinc-950">
      <div className="relative w-full h-full">
        {/* Placeholder map background */}
        <div className="absolute inset-0 bg-zinc-900">
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="grid grid-cols-12 h-full">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="border-r border-zinc-700" />
              ))}
            </div>
          </div>

          {/* Map info */}
          <div className="absolute top-4 left-4 bg-black/80 backdrop-blur-sm px-4 py-2 rounded-lg border border-purple-500/20">
            <p className="text-xs text-zinc-400">
              Location: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
            </p>
          </div>

          {/* Navigation controls */}
          <div className="absolute top-4 right-4 flex flex-col gap-2">
            <button className="bg-black/80 backdrop-blur-sm p-2 rounded border border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </button>
            <button className="bg-black/80 backdrop-blur-sm p-2 rounded border border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            </button>
          </div>

          {/* Mock station markers */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative w-full h-full max-w-2xl max-h-2xl">
              {mockStations.map((station, index) => (
                <div
                  key={station.id}
                  className="absolute group cursor-pointer"
                  style={{
                    left: `${20 + index * 20}%`,
                    top: `${30 + (index % 2) * 25}%`,
                  }}
                >
                  <div className="flex flex-col items-center animate-bounce-slow">
                    <div className="bg-purple-600 p-2.5 rounded-full shadow-lg group-hover:bg-purple-500 transition-all group-hover:scale-110">
                      <MapPin className="w-5 h-5 text-white fill-white" />
                    </div>
                    <div className="mt-2 bg-black/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-purple-500/30 opacity-0 group-hover:opacity-100 transition-all whitespace-nowrap shadow-xl">
                      <p className="text-sm font-semibold text-white">{station.name}</p>
                      <p className="text-xs text-purple-300">2 drinks available</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Center location marker */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
              <div className="relative bg-blue-500 p-2 rounded-full border-4 border-white shadow-xl">
                <div className="w-2 h-2" />
              </div>
            </div>
          </div>
        </div>

        {/* Map attribution */}
        <div className="absolute bottom-4 right-4 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded text-xs text-zinc-400">
          Interactive map • Demo mode
        </div>
      </div>
    </div>
  );
}
