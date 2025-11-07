import { NextRequest, NextResponse } from 'next/server';
import { findNearbyGasStationsRateLimited } from '@/lib/overpass';
import { sql } from '@/lib/db';

export interface DiscoverStoresResponse {
  success: boolean;
  message: string;
  data?: {
    discovered: number;
    added: number;
    skipped: number;
    stations: Array<{
      name: string;
      address: string;
      city: string;
      state: string;
      status: 'added' | 'skipped' | 'error';
    }>;
  };
  error?: string;
}

/**
 * POST /api/stores/discover
 *
 * Discover and import gas stations from OpenStreetMap near a location
 *
 * Body:
 * - latitude: number (required) - Center latitude
 * - longitude: number (required) - Center longitude
 * - radius: number (optional, default: 5000) - Search radius in meters
 * - autoImport: boolean (optional, default: false) - Automatically import to database
 *
 * Returns:
 * - 200: Successfully discovered and optionally imported gas stations
 * - 400: Invalid request (missing lat/long)
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { latitude, longitude, radius = 5000, autoImport = false } = body;

    // Validate required parameters
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json<DiscoverStoresResponse>(
        {
          success: false,
          message: 'Latitude and longitude are required',
          error: 'Missing or invalid location parameters',
        },
        { status: 400 }
      );
    }

    // Discover gas stations from OpenStreetMap
    const discoveredStations = await findNearbyGasStationsRateLimited(
      latitude,
      longitude,
      radius
    );

    const results = {
      discovered: discoveredStations.length,
      added: 0,
      skipped: 0,
      stations: [] as Array<{
        name: string;
        address: string;
        city: string;
        state: string;
        status: 'added' | 'skipped' | 'error';
      }>,
    };

    // If autoImport is true, add stations to database
    if (autoImport) {
      for (const station of discoveredStations) {
        try {
          // Check if station already exists (by address)
          const existing = await sql`
            SELECT id FROM stores
            WHERE LOWER(address) = LOWER(${station.address})
            AND LOWER(city) = LOWER(${station.city})
          `;

          if (existing.length > 0) {
            results.skipped++;
            results.stations.push({ ...station, status: 'skipped' });
            continue;
          }

          // Insert new station with PostGIS location
          await sql`
            INSERT INTO stores (name, address, city, state, zip_code, latitude, longitude, location)
            VALUES (
              ${station.name},
              ${station.address},
              ${station.city},
              ${station.state},
              ${station.zipCode},
              ${station.latitude},
              ${station.longitude},
              ST_SetSRID(ST_MakePoint(${station.longitude}, ${station.latitude}), 4326)::geography
            )
          `;

          results.added++;
          results.stations.push({ ...station, status: 'added' });
        } catch (error) {
          console.error(`Error importing station ${station.name}:`, error);
          results.stations.push({ ...station, status: 'error' });
        }
      }

      return NextResponse.json<DiscoverStoresResponse>(
        {
          success: true,
          message: `Discovered ${results.discovered} stations, added ${results.added}, skipped ${results.skipped}`,
          data: results,
        },
        { status: 200 }
      );
    }

    // If not auto-importing, just return discovered stations
    return NextResponse.json<DiscoverStoresResponse>(
      {
        success: true,
        message: `Discovered ${discoveredStations.length} gas stations`,
        data: {
          discovered: discoveredStations.length,
          added: 0,
          skipped: 0,
          stations: discoveredStations.map((s) => ({ ...s, status: 'skipped' as const })),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Discover stores endpoint error:', error);
    return NextResponse.json<DiscoverStoresResponse>(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
