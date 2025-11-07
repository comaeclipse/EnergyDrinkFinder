import { NextRequest, NextResponse } from 'next/server';
import { geocodeAddress, type AddressComponents, type GeocodeResult } from '@/lib/geocode';

/**
 * POST /api/geocode
 *
 * Convert an address to coordinates (latitude, longitude) using geocode.maps.co API
 *
 * Request body (two formats supported):
 * 1. Full address string:
 *    { "address": "555 5th Ave New York NY 10017 US" }
 *
 * 2. Address components:
 *    {
 *      "address": "555 5th Ave",
 *      "city": "New York",
 *      "state": "NY",
 *      "zip_code": "10017",
 *      "country": "US"
 *    }
 *
 * Returns:
 * - 200: Successfully geocoded address
 *   {
 *     "success": true,
 *     "data": {
 *       "latitude": 40.7551,
 *       "longitude": -73.9787,
 *       "display_name": "555 5th Avenue, Manhattan, New York, NY 10017, USA",
 *       "boundingbox": ["40.7541", "40.7561", "-73.9797", "-73.9777"]
 *     }
 *   }
 * - 400: Invalid request (missing address)
 * - 404: Address not found
 * - 500: Server error
 */

interface GeocodeRequest {
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

interface GeocodeResponse {
  success: boolean;
  message?: string;
  data?: GeocodeResult;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: GeocodeRequest = await request.json();

    // Validate that we have either a full address or at least some components
    const hasFullAddress = body.address && typeof body.address === 'string';
    const hasComponents = body.city || body.state || body.zip_code;

    if (!hasFullAddress && !hasComponents) {
      return NextResponse.json<GeocodeResponse>(
        {
          success: false,
          message: 'Address is required. Provide either a full address string or address components (city, state, zip_code)',
          error: 'Missing address data',
        },
        { status: 400 }
      );
    }

    // Build address input
    let addressInput: string | AddressComponents;

    if (hasFullAddress && !hasComponents) {
      // Use full address string
      addressInput = body.address!;
    } else {
      // Use address components
      addressInput = {
        address: body.address,
        city: body.city,
        state: body.state,
        zip_code: body.zip_code,
        country: body.country || 'US',
      };
    }

    // Call geocoding utility
    const result = await geocodeAddress(addressInput);

    return NextResponse.json<GeocodeResponse>(
      {
        success: true,
        message: 'Address successfully geocoded',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Geocode endpoint error:', error);

    // Check if it's a "no results found" error
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNotFound = errorMessage.toLowerCase().includes('no results found');

    return NextResponse.json<GeocodeResponse>(
      {
        success: false,
        message: isNotFound ? 'Address not found' : 'Geocoding failed',
        error: errorMessage,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}

/**
 * GET /api/geocode
 *
 * Convert an address to coordinates using query parameters
 *
 * Query parameters:
 * - q or address: Full address string
 * - city: City name
 * - state: State abbreviation
 * - zip: ZIP code
 * - country: Country code (default: US)
 *
 * Example: /api/geocode?address=555+5th+Ave&city=New+York&state=NY&zip=10017
 *
 * Returns same format as POST endpoint
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const fullAddress = searchParams.get('q') || searchParams.get('address');
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const zipCode = searchParams.get('zip') || searchParams.get('zip_code');
    const country = searchParams.get('country') || 'US';

    // Validate that we have some address data
    if (!fullAddress && !city && !state && !zipCode) {
      return NextResponse.json<GeocodeResponse>(
        {
          success: false,
          message: 'Address is required. Provide query parameters: q/address, city, state, or zip',
          error: 'Missing address data',
        },
        { status: 400 }
      );
    }

    // Build address input
    let addressInput: string | AddressComponents;

    if (fullAddress && !city && !state && !zipCode) {
      // Use full address string
      addressInput = fullAddress;
    } else {
      // Use address components
      addressInput = {
        address: fullAddress || undefined,
        city: city || undefined,
        state: state || undefined,
        zip_code: zipCode || undefined,
        country,
      };
    }

    // Call geocoding utility
    const result = await geocodeAddress(addressInput);

    return NextResponse.json<GeocodeResponse>(
      {
        success: true,
        message: 'Address successfully geocoded',
        data: result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Geocode endpoint error:', error);

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isNotFound = errorMessage.toLowerCase().includes('no results found');

    return NextResponse.json<GeocodeResponse>(
      {
        success: false,
        message: isNotFound ? 'Address not found' : 'Geocoding failed',
        error: errorMessage,
      },
      { status: isNotFound ? 404 : 500 }
    );
  }
}
