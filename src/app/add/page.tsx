'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import type { EnergyDrink, Store } from '@/types';

interface NearbyStore extends Store {
  distance_km: number;
}

interface ScannedItem {
  drink: EnergyDrink;
  timestamp: Date;
  status: 'pending' | 'adding' | 'success' | 'error';
  price?: number;
  errorMessage?: string;
}

export default function AddPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [nearbyStores, setNearbyStores] = useState<NearbyStore[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState<number | null>(null);
  const [loadingStores, setLoadingStores] = useState(false);
  const [locationError, setLocationError] = useState<string>('');

  const [isScanning, setIsScanning] = useState(false);
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentPrice, setCurrentPrice] = useState<string>('');

  // Get user's location on mount
  useEffect(() => {
    getLocation();

    // Cleanup on unmount
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  // Fetch nearby stores when location is obtained
  useEffect(() => {
    if (userLocation) {
      fetchNearbyStores();
    }
  }, [userLocation]);

  const getLocation = () => {
    setLocationError('');
    setLoadingStores(true);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      setLoadingStores(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.error('Location error:', error);
        setLocationError('Unable to retrieve your location. Please enable location services.');
        setLoadingStores(false);
      },
      {
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  };

  const fetchNearbyStores = async () => {
    if (!userLocation) return;

    setLoadingStores(true);
    try {
      const response = await fetch(
        `/api/stores/nearby?latitude=${userLocation.latitude}&longitude=${userLocation.longitude}&radius=10&limit=20`
      );

      const data = await response.json();

      if (data.success && data.data?.stores) {
        setNearbyStores(data.data.stores);
        // Auto-select the first (closest) store
        if (data.data.stores.length > 0) {
          setSelectedStoreId(data.data.stores[0].id);
        }
      } else {
        setLocationError(data.message || 'No nearby stores found');
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
      setLocationError('Failed to fetch nearby stores');
    } finally {
      setLoadingStores(false);
    }
  };

  const startScanning = async () => {
    if (!selectedStoreId) {
      alert('Please select a gas station first');
      return;
    }

    try {
      // Check if we have camera permission
      await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });

      // Create code reader if it doesn't exist
      if (!codeReaderRef.current) {
        codeReaderRef.current = new BrowserMultiFormatReader();
      }

      setIsScanning(true);

      // Get video devices
      const videoInputDevices = await codeReaderRef.current.listVideoInputDevices();

      if (videoInputDevices.length === 0) {
        throw new Error('No camera found on this device');
      }

      // Use the first available camera (prefer back camera on mobile)
      const selectedDevice = videoInputDevices.find((device) =>
        device.label.toLowerCase().includes('back')
      ) || videoInputDevices[0];

      // Start decoding from video device
      codeReaderRef.current.decodeFromVideoDevice(
        selectedDevice.deviceId,
        videoRef.current!,
        async (result, error) => {
          if (result) {
            const barcode = result.getText();
            console.log('Barcode detected:', barcode);

            // Check if already scanned
            const alreadyScanned = scannedItems.some(
              (item) => item.drink.barcode === barcode
            );

            if (!alreadyScanned) {
              await handleBarcodeScanned(barcode);
            }
          }

          if (error && !(error instanceof NotFoundException)) {
            console.error('Scan error:', error);
          }
        }
      );
    } catch (err) {
      console.error('Error starting camera:', err);
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          alert('Camera permission denied. Please allow camera access to scan barcodes.');
        } else if (err.name === 'NotFoundError') {
          alert('No camera found on this device.');
        } else {
          alert(`Error: ${err.message}`);
        }
      } else {
        alert('Failed to access camera. Please check your permissions.');
      }
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (codeReaderRef.current) {
      codeReaderRef.current.reset();
    }
    setIsScanning(false);
  };

  const handleBarcodeScanned = async (barcode: string) => {
    // First, lookup the drink
    try {
      const drinkResponse = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          barcode,
          store_id: selectedStoreId,
          price: currentPrice ? parseFloat(currentPrice) : undefined,
        }),
      });

      const drinkData = await drinkResponse.json();

      if (drinkData.success && drinkData.data) {
        // Add to scanned items with success status
        const newItem: ScannedItem = {
          drink: drinkData.data.drink,
          timestamp: new Date(),
          status: 'success',
          price: currentPrice ? parseFloat(currentPrice) : undefined,
        };

        setScannedItems((prev) => [newItem, ...prev]);
      } else {
        // Drink not found or error
        const errorItem: ScannedItem = {
          drink: {
            id: 0,
            brand: 'Unknown',
            flavor: 'Unknown',
            size_ml: 0,
            barcode,
          },
          timestamp: new Date(),
          status: 'error',
          errorMessage: drinkData.message || 'Drink not found',
        };

        setScannedItems((prev) => [errorItem, ...prev]);
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      const errorItem: ScannedItem = {
        drink: {
          id: 0,
          brand: 'Unknown',
          flavor: 'Unknown',
          size_ml: 0,
          barcode,
        },
        timestamp: new Date(),
        status: 'error',
        errorMessage: 'Failed to process barcode',
      };

      setScannedItems((prev) => [errorItem, ...prev]);
    }
  };

  const removeItem = (index: number) => {
    setScannedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const selectedStore = nearbyStores.find((s) => s.id === selectedStoreId);

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-black dark:text-white">
          Add Inventory
        </h1>

        {/* Location and Store Selection */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-4 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            Select Gas Station
          </h2>

          {loadingStores && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-zinc-600 dark:text-zinc-400">
                Finding nearby stores...
              </p>
            </div>
          )}

          {locationError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              <p className="text-red-800 dark:text-red-200">{locationError}</p>
              <button
                onClick={getLocation}
                className="mt-2 text-red-600 dark:text-red-400 underline"
              >
                Retry
              </button>
            </div>
          )}

          {nearbyStores.length > 0 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Choose a gas station:
                </label>
                <select
                  value={selectedStoreId || ''}
                  onChange={(e) => setSelectedStoreId(parseInt(e.target.value))}
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {nearbyStores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} - {store.address} ({store.distance_km.toFixed(2)} km)
                    </option>
                  ))}
                </select>
              </div>

              {selectedStore && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-800 dark:text-blue-200">
                    <strong>Selected:</strong> {selectedStore.name}
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    {selectedStore.address}, {selectedStore.city}, {selectedStore.state}
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                    {selectedStore.distance_km.toFixed(2)} km away
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">
                  Default Price (optional):
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(e.target.value)}
                  placeholder="e.g., 3.99"
                  className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                  Leave empty if price varies or unknown
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Scanner Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 mb-4 border border-zinc-200 dark:border-zinc-800">
          <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
            Scan Items
          </h2>

          <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ minHeight: '300px' }}>
            {!isScanning && (
              <div className="absolute inset-0 flex items-center justify-center">
                <button
                  onClick={startScanning}
                  disabled={!selectedStoreId}
                  className={`px-8 py-4 font-semibold rounded-lg text-lg transition-colors ${
                    selectedStoreId
                      ? 'bg-blue-600 hover:bg-blue-700 text-white'
                      : 'bg-zinc-400 text-zinc-700 cursor-not-allowed'
                  }`}
                >
                  {selectedStoreId ? 'Start Scanning' : 'Select a store first'}
                </button>
              </div>
            )}

            <video
              ref={videoRef}
              className={`w-full h-auto ${isScanning ? 'block' : 'hidden'}`}
              playsInline
              muted
            />

            {isScanning && (
              <>
                <div className="absolute top-4 right-4">
                  <button
                    onClick={stopScanning}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
                  >
                    Stop
                  </button>
                </div>

                <div className="absolute bottom-4 left-0 right-0 text-center">
                  <p className="text-white text-lg font-medium bg-black/50 inline-block px-4 py-2 rounded">
                    Point camera at barcode
                  </p>
                </div>
              </>
            )}
          </div>

          <p className="text-sm text-zinc-600 dark:text-zinc-400 text-center">
            Scanned items will automatically be added to the selected store
          </p>
        </div>

        {/* Scanned Items List */}
        {scannedItems.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-xl font-semibold mb-4 text-black dark:text-white">
              Scanned Items ({scannedItems.length})
            </h2>

            <div className="space-y-3">
              {scannedItems.map((item, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${
                    item.status === 'success'
                      ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                      : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3
                        className={`font-semibold ${
                          item.status === 'success'
                            ? 'text-green-900 dark:text-green-100'
                            : 'text-red-900 dark:text-red-100'
                        }`}
                      >
                        {item.drink.brand} - {item.drink.flavor}
                      </h3>
                      <div className="text-sm mt-1">
                        {item.status === 'success' ? (
                          <>
                            <p className="text-green-700 dark:text-green-300">
                              {item.drink.size_ml}ml
                              {item.price && ` • $${item.price.toFixed(2)}`}
                            </p>
                            <p className="text-green-600 dark:text-green-400 text-xs mt-1">
                              ✓ Added successfully
                            </p>
                          </>
                        ) : (
                          <p className="text-red-700 dark:text-red-300">
                            {item.errorMessage}
                          </p>
                        )}
                      </div>
                      {item.drink.barcode && (
                        <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">
                          UPC: {item.drink.barcode}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 ml-4"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
