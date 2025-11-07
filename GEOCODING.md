# Address to Coordinates Geocoding

This project includes address-to-coordinates conversion using the [geocode.maps.co](https://geocode.maps.co/) API.

## Features

- 🗺️ Convert addresses to coordinates (latitude/longitude)
- 🔧 TypeScript utility function for programmatic use
- 🌐 REST API endpoints (GET and POST)
- 📦 Batch geocoding utility for existing stores
- 🔒 Secure API key storage in `.env`

## Setup

1. **API Key**: The geocoding API key is already configured in `.env`:
   ```
   GEOCODING_API_KEY=690d3bdbdc7b9916900746oyd89ee4b
   ```

2. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

## Usage

### 1. Programmatic Usage (TypeScript)

```typescript
import { geocodeAddress } from '@/lib/geocode';

// Option 1: Full address string
const result1 = await geocodeAddress('555 5th Ave New York NY 10017 US');

// Option 2: Address components
const result2 = await geocodeAddress({
  address: '123 Main St',
  city: 'Seattle',
  state: 'WA',
  zip_code: '98101',
  country: 'US'
});

console.log(result1.latitude, result1.longitude);
// => 40.7551, -73.9787
```

### 2. REST API Endpoints

#### POST /api/geocode

Convert an address to coordinates using JSON body.

**Request (full address string):**
```bash
curl -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"address": "555 5th Ave New York NY 10017 US"}'
```

**Request (address components):**
```bash
curl -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{
    "address": "555 5th Ave",
    "city": "New York",
    "state": "NY",
    "zip_code": "10017",
    "country": "US"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Address successfully geocoded",
  "data": {
    "latitude": 40.7551,
    "longitude": -73.9787,
    "display_name": "555 5th Avenue, Manhattan, New York, NY 10017, USA",
    "boundingbox": ["40.7541", "40.7561", "-73.9797", "-73.9777"]
  }
}
```

#### GET /api/geocode

Convert an address using query parameters (useful for browser testing).

**Examples:**
```bash
# Full address in query parameter
curl "http://localhost:3000/api/geocode?q=555+5th+Ave+New+York+NY+10017+US"

# Address components
curl "http://localhost:3000/api/geocode?address=555+5th+Ave&city=New+York&state=NY&zip=10017"
```

### 3. Batch Geocode Existing Stores

Update stores in your database that are missing coordinates:

```bash
# Geocode stores missing coordinates
npm run geocode-stores

# Force re-geocode all stores
npm run geocode-stores -- --all

# Preview changes without updating (dry run)
npm run geocode-stores -- --dry-run
```

**Example output:**
```
🗺️  Batch Geocoding Stores

Found 4 store(s) to geocode

[1/4] 7-Eleven Downtown
  Address: 123 Broadway, New York, NY 10001
  📍 Geocoded: 40.750580, -73.993584
  🌐 Location: 123 Broadway, Manhattan, New York, NY 10001, USA
  ✅ Updated in database

...

📊 Summary:
   Total stores: 4
   ✅ Successful: 4
   ❌ Failed: 0
```

## API Details

### Rate Limits

The geocode.maps.co free tier has rate limits:
- 2 requests per second
- The batch geocoding utility automatically adds 600ms delays between requests

### Response Format

```typescript
interface GeocodeResult {
  latitude: number;
  longitude: number;
  display_name?: string;  // Formatted address from API
  boundingbox?: [string, string, string, string];  // [min_lat, max_lat, min_lon, max_lon]
}
```

### Error Handling

All functions and endpoints include comprehensive error handling:
- Missing/invalid addresses return 400 status
- Addresses not found return 404 status
- API errors return 500 status with error details

## Database Integration

When you update a store's latitude/longitude, the PostGIS trigger automatically updates the `location` field:

```sql
UPDATE stores
SET latitude = 40.7551, longitude = -73.9787
WHERE id = 1;
-- The 'location' geography field is automatically updated via trigger
```

## Files

- `src/lib/geocode.ts` - Core geocoding utilities
- `src/app/api/geocode/route.ts` - REST API endpoints
- `db/geocode-stores.ts` - Batch geocoding script
- `.env` - API key configuration (gitignored)
- `.env.example` - Environment variable template

## Testing

To test the API endpoint locally:

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open your browser or use curl:
   ```
   http://localhost:3000/api/geocode?q=555+5th+Ave+New+York+NY
   ```

## Security

- ✅ API key stored in `.env` (gitignored)
- ✅ `.env.example` includes placeholder for documentation
- ✅ API key never exposed in frontend code
- ✅ All requests server-side only

## Next Steps

Consider enhancing with:
- Address autocomplete on store creation forms
- Map preview showing geocoded location
- Caching geocoded results to reduce API calls
- Reverse geocoding (coordinates → address)
