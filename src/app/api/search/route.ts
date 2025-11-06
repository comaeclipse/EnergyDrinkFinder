import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { SearchResult } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const latitude = parseFloat(searchParams.get('latitude') || '0');
    const longitude = parseFloat(searchParams.get('longitude') || '0');
    const radius = parseFloat(searchParams.get('radius') || '10'); // default 10km
    const brand = searchParams.get('brand');
    const flavor = searchParams.get('flavor');

    if (!latitude || !longitude) {
      return NextResponse.json(
        { error: 'Latitude and longitude are required' },
        { status: 400 }
      );
    }

    // TODO: Implement PostGIS query for nearby stores with energy drink inventory
    // Example query structure (requires PostGIS extension):
    // SELECT s.*,
    //   ST_Distance(
    //     ST_MakePoint(s.longitude, s.latitude)::geography,
    //     ST_MakePoint($1, $2)::geography
    //   ) / 1000 as distance_km
    // FROM stores s
    // WHERE ST_DWithin(
    //   ST_MakePoint(s.longitude, s.latitude)::geography,
    //   ST_MakePoint($1, $2)::geography,
    //   $3 * 1000
    // )

    const results: SearchResult[] = [];

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
