/**
 * OpenStreetMap Overpass API Integration
 *
 * Free API for querying Points of Interest from OpenStreetMap
 * No API key required
 *
 * Docs: https://wiki.openstreetmap.org/wiki/Overpass_API
 */

interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags: {
    name?: string;
    'addr:street'?: string;
    'addr:housenumber'?: string;
    'addr:city'?: string;
    'addr:state'?: string;
    'addr:postcode'?: string;
    brand?: string;
    amenity?: string;
    fuel?: string;
  };
}

interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export interface GasStation {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  latitude: number;
  longitude: number;
  brand?: string;
}

/**
 * Query OpenStreetMap Overpass API for gas stations near a location
 *
 * @param latitude - Center latitude
 * @param longitude - Center longitude
 * @param radiusMeters - Search radius in meters (default: 5000m = 5km)
 * @returns Array of gas stations
 */
export async function findNearbyGasStations(
  latitude: number,
  longitude: number,
  radiusMeters: number = 5000
): Promise<GasStation[]> {
  // Overpass QL query to find gas stations
  // amenity=fuel finds all gas/petrol stations
  const query = `
    [out:json];
    (
      node["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude});
      way["amenity"="fuel"](around:${radiusMeters},${latitude},${longitude});
    );
    out center;
  `;

  try {
    const response = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data: OverpassResponse = await response.json();

    // Transform Overpass results to our GasStation format
    const stations: GasStation[] = data.elements
      .filter((element) => {
        // Must have coordinates and a name
        const lat = element.lat ?? element.center?.lat;
        const lon = element.lon ?? element.center?.lon;
        return lat && lon && element.tags.name;
      })
      .map((element) => {
        const lat = element.lat ?? element.center!.lat;
        const lon = element.lon ?? element.center!.lon;
        const tags = element.tags;

        // Build address from OSM tags
        const streetNumber = tags['addr:housenumber'] || '';
        const street = tags['addr:street'] || '';
        const address = `${streetNumber} ${street}`.trim() || 'Address not available';

        return {
          name: tags.brand || tags.name || 'Unknown Gas Station',
          address,
          city: tags['addr:city'] || 'Unknown',
          state: tags['addr:state'] || 'Unknown',
          zipCode: tags['addr:postcode'] || '00000',
          latitude: lat,
          longitude: lon,
          brand: tags.brand,
        };
      });

    return stations;
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    throw error;
  }
}

/**
 * Rate-limited version of findNearbyGasStations
 * Overpass API requests should be rate-limited to be respectful
 */
export async function findNearbyGasStationsRateLimited(
  latitude: number,
  longitude: number,
  radiusMeters: number = 5000
): Promise<GasStation[]> {
  // Wait 1 second before making request (be nice to free API)
  await new Promise((resolve) => setTimeout(resolve, 1000));
  return findNearbyGasStations(latitude, longitude, radiusMeters);
}
