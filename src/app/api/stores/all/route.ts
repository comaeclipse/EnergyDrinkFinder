import { NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { Store } from '@/types';

export interface AllStoresResponse {
  success: boolean;
  message: string;
  data?: {
    stores: Store[];
  };
  error?: string;
}

/**
 * GET /api/stores/all
 *
 * Get all gas stations with their coordinates for map display
 *
 * Returns:
 * - 200: Successfully retrieved all stores
 * - 500: Server error
 */
export async function GET() {
  try {
    const storesResult = await sql`
      SELECT
        id, name, address, city, state, zip_code, latitude, longitude
      FROM stores
      ORDER BY name
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
    })) as Store[];

    return NextResponse.json<AllStoresResponse>(
      {
        success: true,
        message: `Found ${stores.length} stores`,
        data: { stores },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('All stores endpoint error:', error);
    return NextResponse.json<AllStoresResponse>(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
