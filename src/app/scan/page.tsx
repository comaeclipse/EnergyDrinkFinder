'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader, NotFoundException } from '@zxing/library';
import type { EnergyDrink, ScanResponse } from '@/types';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scannedDrink, setScannedDrink] = useState<EnergyDrink | null>(null);
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const codeReaderRef = useRef<BrowserMultiFormatReader | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (codeReaderRef.current) {
        codeReaderRef.current.reset();
      }
    };
  }, []);

  const startScanning = async () => {
    setError('');
    setScannedDrink(null);
    setIsLoading(false);

    try {
      // Check if we have camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }, // Use back camera on mobile
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
      const selectedDevice = videoInputDevices.find(device =>
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

            // Stop scanning temporarily while we process
            stopScanning();

            // Look up the drink
            await lookupDrink(barcode);
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
          setError('Camera permission denied. Please allow camera access to scan barcodes.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.');
        } else {
          setError(`Error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Please check your permissions.');
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

  const lookupDrink = async (barcode: string) => {
    setIsLoading(true);
    setError('');

    try {
      // Get user's location if available
      let latitude: number | undefined;
      let longitude: number | undefined;

      try {
        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            timeout: 5000,
            maximumAge: 60000,
          });
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
      } catch (geoError) {
        console.warn('Could not get location:', geoError);
        // Continue without location
      }

      // Call the scan API
      const response = await fetch('/api/scan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          barcode,
          latitude,
          longitude,
        }),
      });

      const data: ScanResponse = await response.json();

      if (data.success && data.data) {
        setScannedDrink(data.data.drink);
      } else {
        setError(data.message || 'Drink not found in our database');
      }
    } catch (err) {
      console.error('Error looking up drink:', err);
      setError('Failed to look up drink. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const scanAgain = () => {
    setScannedDrink(null);
    setError('');
    startScanning();
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-black dark:text-white">
          Scan Energy Drink
        </h1>

        {/* Camera View */}
        <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ minHeight: '400px' }}>
          {!isScanning && !scannedDrink && !error && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={startScanning}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-colors"
              >
                Start Scanning
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
            <div className="absolute top-4 right-4">
              <button
                onClick={stopScanning}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-colors"
              >
                Stop
              </button>
            </div>
          )}

          {isScanning && (
            <div className="absolute bottom-4 left-0 right-0 text-center">
              <p className="text-white text-lg font-medium bg-black/50 inline-block px-4 py-2 rounded">
                Point camera at barcode
              </p>
            </div>
          )}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-8">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
              Looking up drink...
            </p>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
            <p className="text-red-800 dark:text-red-200 font-medium">{error}</p>
            <button
              onClick={scanAgain}
              className="mt-2 text-red-600 dark:text-red-400 underline"
            >
              Try again
            </button>
          </div>
        )}

        {/* Drink Information */}
        {scannedDrink && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg shadow-lg p-6 border border-zinc-200 dark:border-zinc-800">
            <h2 className="text-2xl font-bold mb-4 text-black dark:text-white">
              Found Drink!
            </h2>

            {scannedDrink.image_url && (
              <img
                src={scannedDrink.image_url}
                alt={`${scannedDrink.brand} ${scannedDrink.flavor}`}
                className="w-full max-w-xs mx-auto mb-4 rounded"
              />
            )}

            <div className="space-y-3">
              <div>
                <h3 className="text-xl font-semibold text-black dark:text-white">
                  {scannedDrink.brand} - {scannedDrink.flavor}
                </h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-3">
                  <p className="text-zinc-600 dark:text-zinc-400">Size</p>
                  <p className="font-semibold text-black dark:text-white">{scannedDrink.size_ml}ml</p>
                </div>

                {scannedDrink.caffeine_mg && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-3">
                    <p className="text-zinc-600 dark:text-zinc-400">Caffeine</p>
                    <p className="font-semibold text-black dark:text-white">{scannedDrink.caffeine_mg}mg</p>
                  </div>
                )}

                {scannedDrink.sugar_g !== undefined && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-3">
                    <p className="text-zinc-600 dark:text-zinc-400">Sugar</p>
                    <p className="font-semibold text-black dark:text-white">{scannedDrink.sugar_g}g</p>
                  </div>
                )}

                {scannedDrink.calories !== undefined && (
                  <div className="bg-zinc-50 dark:bg-zinc-800 rounded p-3">
                    <p className="text-zinc-600 dark:text-zinc-400">Calories</p>
                    <p className="font-semibold text-black dark:text-white">{scannedDrink.calories}</p>
                  </div>
                )}
              </div>

              {scannedDrink.description && (
                <div className="mt-4">
                  <p className="text-zinc-700 dark:text-zinc-300">{scannedDrink.description}</p>
                </div>
              )}

              {scannedDrink.barcode && (
                <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                  <p className="text-xs text-zinc-500 dark:text-zinc-500">
                    Barcode: {scannedDrink.barcode}
                  </p>
                </div>
              )}
            </div>

            <button
              onClick={scanAgain}
              className="mt-6 w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-lg transition-colors"
            >
              Scan Another Drink
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
