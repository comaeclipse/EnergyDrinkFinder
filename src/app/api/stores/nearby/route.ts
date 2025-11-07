import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Store } from '@/types';

export interface NearbyStoresResponse {
  success: boolean;
  message: string;
  data?: {
    stores: Array<Store & { distance_km: number }>;
  };
  error?: string;
}

/**
 * GET /api/stores/nearby
 *
 * Get nearby gas stations based on user's location
 *
 * Query params:
 * - latitude: number (required) - User's latitude
 * - longitude: number (required) - User's longitude
 * - radius: number (optional, default: 10) - Search radius in kilometers
 * - limit: number (optional, default: 10) - Maximum number of stores to return
 *
 * Returns:
 * - 200: Successfully retrieved nearby stores
 * - 400: Invalid request (missing lat/long)
 * - 500: Server error
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latitude = parseFloat(searchParams.get('latitude') || '');
    const longitude = parseFloat(searchParams.get('longitude') || '');
    const radius = parseFloat(searchParams.get('radius') || '10'); // default 10km
    const limit = parseInt(searchParams.get('limit') || '10'); // default 10 stores

    // Validate required parameters
    if (!latitude || !longitude || isNaN(latitude) || isNaN(longitude)) {
      return NextResponse.json<NearbyStoresResponse>(
        {
          success: false,
          message: 'Latitude and longitude are required',
          error: 'Missing or invalid location parameters',
        },
        { status: 400 }
      );
    }

    // Query nearby stores using PostGIS
    const storesResult = await sql`
      SELECT
        id, name, address, city, state, zip_code, latitude, longitude,
        ST_Distance(
          location,
          ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
        ) / 1000 as distance_km
      FROM stores
      WHERE ST_DWithin(
        location,
        ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography,
        ${radius * 1000}
      )
      ORDER BY location <-> ST_SetSRID(ST_MakePoint(${longitude}, ${latitude}), 4326)::geography
      LIMIT ${limit}
    `;

    const stores = storesResult.map((row) => ({
      id: row.id,
      name: row.name,
      address: row.address,
      city: row.city,
      state: row.state,
      zip_code: row.zip_code,
      latitude: parseFloat(row.latitude),
      longitude: parseFloat(row.longitude),
      distance_km: parseFloat(row.distance_km),
    })) as Array<Store & { distance_km: number }>;

    return NextResponse.json<NearbyStoresResponse>(
      {
        success: true,
        message: `Found ${stores.length} nearby stores`,
        data: { stores },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Nearby stores endpoint error:', error);
    return NextResponse.json<NearbyStoresResponse>(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
