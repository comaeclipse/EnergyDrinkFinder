'use client';

import { useEffect, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import { MapPin } from 'lucide-react';
import type { Store } from '@/types';

interface MapViewProps {
  latitude?: number;
  longitude?: number;
}

// Pensacola, FL default coordinates
const PENSACOLA_LAT = 30.4213;
const PENSACOLA_LNG = -87.2169;

export default function MapView({ latitude = PENSACOLA_LAT, longitude = PENSACOLA_LNG }: MapViewProps) {
  const [viewState, setViewState] = useState({
    latitude: latitude,
    longitude: longitude,
    zoom: 10, // Zoomed out to show broader Pensacola area
  });
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get user's current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setUserLocation(newLocation);

          // Update map view to center on user's location
          setViewState({
            latitude: newLocation.lat,
            longitude: newLocation.lng,
            zoom: 12, // Zoom in when we have actual user location
          });
        },
        (error) => {
          console.log('Geolocation error:', error);
          // Keep default Pensacola location
        }
      );
    }

    // Fetch all stores from API
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const response = await fetch('/api/stores/all');
      const data = await response.json();

      if (data.success && data.data?.stores) {
        setStores(data.data.stores);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-full rounded-lg overflow-hidden border border-purple-500/30 shadow-xl shadow-purple-500/10">
      {loading ? (
        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-purple-600 border-t-transparent mb-4"></div>
            <p className="text-zinc-400">Loading map...</p>
          </div>
        </div>
      ) : (
        <Map
          {...viewState}
          onMove={(evt) => setViewState(evt.viewState)}
          style={{ width: '100%', height: '100%' }}
          mapStyle="https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json"
        >
          {/* Navigation controls */}
          <NavigationControl position="top-right" />

          {/* User location marker - only show if we have user's location */}
          {userLocation && (
            <Marker
              latitude={userLocation.lat}
              longitude={userLocation.lng}
              anchor="center"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
                <div className="relative bg-blue-500 p-2 rounded-full border-4 border-white shadow-xl">
                  <div className="w-2 h-2" />
                </div>
              </div>
            </Marker>
          )}

          {/* Store markers */}
          {stores.map((store) => (
            <Marker
              key={store.id}
              latitude={store.latitude}
              longitude={store.longitude}
              anchor="bottom"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedStore(store);
              }}
            >
              <div className="cursor-pointer group">
                <div className="bg-purple-600 p-2.5 rounded-full shadow-lg group-hover:bg-purple-500 transition-all group-hover:scale-110">
                  <MapPin className="w-5 h-5 text-white fill-white" />
                </div>
              </div>
            </Marker>
          ))}

          {/* Store info popup */}
          {selectedStore && (
            <div className="absolute top-4 left-4 z-10 bg-black/90 backdrop-blur-sm px-4 py-3 rounded-lg border border-purple-500/30 shadow-xl max-w-sm">
              <button
                onClick={() => setSelectedStore(null)}
                className="absolute top-2 right-2 text-zinc-400 hover:text-white"
              >
                ✕
              </button>
              <h3 className="text-white font-semibold mb-1">{selectedStore.name}</h3>
              <p className="text-sm text-zinc-300">
                {selectedStore.address}
              </p>
              <p className="text-sm text-zinc-400">
                {selectedStore.city}, {selectedStore.state} {selectedStore.zip_code}
              </p>
            </div>
          )}
        </Map>
      )}
    </div>
  );
}
