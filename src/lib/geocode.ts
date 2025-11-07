/**
 * Geocoding utility using geocode.maps.co API
 * Converts addresses to coordinates (latitude, longitude)
 */

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name?: string;
  boundingbox?: [string, string, string, string];
}

export interface AddressComponents {
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
}

interface GeocodeApiResponse {
  lat: string;
  lon: string;
  display_name: string;
  boundingbox: [string, string, string, string];
  place_id: number;
  osm_type: string;
  osm_id: number;
}

/**
 * Geocode an address to coordinates using geocode.maps.co API
 *
 * @param address - Full address string or address components
 * @returns Promise with latitude, longitude, and additional metadata
 * @throws Error if geocoding fails or no results found
 */
export async function geocodeAddress(
  address: string | AddressComponents
): Promise<GeocodeResult> {
  const apiKey = process.env.GEOCODING_API_KEY;

  if (!apiKey) {
    throw new Error('GEOCODING_API_KEY not found in environment variables');
  }

  // Build query string from address components or use full address
  let queryAddress: string;
  if (typeof address === 'string') {
    queryAddress = address;
  } else {
    const parts = [
      address.address,
      address.city,
      address.state,
      address.zip_code,
      address.country || 'US',
    ].filter(Boolean);
    queryAddress = parts.join(' ');
  }

  if (!queryAddress.trim()) {
    throw new Error('Address cannot be empty');
  }

  try {
    const url = new URL('https://geocode.maps.co/search');
    url.searchParams.append('q', queryAddress);
    url.searchParams.append('api_key', apiKey);

    const response = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'EnergyDrinkFinder/1.0',
      },
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unable to read error response');
      throw new Error(`Geocoding API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: GeocodeApiResponse[] = await response.json();

    if (!data || data.length === 0) {
      throw new Error(`No results found for address: ${queryAddress}`);
    }

    // Return the first (most relevant) result
    const result = data[0];

    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      display_name: result.display_name,
      boundingbox: result.boundingbox,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Geocoding failed: ${error.message}`);
    }
    throw new Error('Geocoding failed with unknown error');
  }
}

/**
 * Batch geocode multiple addresses
 * Note: geocode.maps.co has rate limits, so this includes delays between requests
 *
 * @param addresses - Array of address strings or components
 * @param delayMs - Delay between requests in milliseconds (default: 1000ms)
 * @returns Promise with array of results (null for failed geocoding)
 */
export async function batchGeocodeAddresses(
  addresses: (string | AddressComponents)[],
  delayMs: number = 1000
): Promise<(GeocodeResult | null)[]> {
  const results: (GeocodeResult | null)[] = [];

  for (let i = 0; i < addresses.length; i++) {
    try {
      const result = await geocodeAddress(addresses[i]);
      results.push(result);

      // Add delay between requests to respect rate limits
      if (i < addresses.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (error) {
      console.error(`Failed to geocode address ${i}:`, error);
      results.push(null);
    }
  }

  return results;
}
