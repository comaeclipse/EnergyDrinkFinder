#!/usr/bin/env tsx

/**
 * Batch geocode existing stores that are missing coordinates
 *
 * This script:
 * 1. Finds all stores with missing latitude/longitude
 * 2. Geocodes their addresses using the geocode.maps.co API
 * 3. Updates the database with the coordinates
 *
 * Usage:
 *   npm run geocode-stores              # Geocode stores missing coordinates
 *   npm run geocode-stores --all        # Re-geocode all stores (force update)
 *   npm run geocode-stores --dry-run    # Preview changes without updating
 */

import 'dotenv/config';
import { neon } from '@neondatabase/serverless';
import { geocodeAddress, type AddressComponents } from '../src/lib/geocode';

const sql = neon(process.env.DATABASE_URL!);

interface Store {
  id: number;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  latitude: number | null;
  longitude: number | null;
}

async function geocodeStores(options: { forceAll?: boolean; dryRun?: boolean } = {}) {
  const { forceAll = false, dryRun = false } = options;

  console.log('🗺️  Batch Geocoding Stores\n');

  // Find stores that need geocoding
  const whereClause = forceAll
    ? '' // All stores
    : 'WHERE latitude IS NULL OR longitude IS NULL'; // Only missing coordinates

  const stores = await sql`
    SELECT id, name, address, city, state, zip_code, latitude, longitude
    FROM stores
    ${sql.unsafe(whereClause)}
    ORDER BY id
  `;

  if (stores.length === 0) {
    console.log('✅ All stores already have coordinates!');
    return;
  }

  console.log(`Found ${stores.length} store(s) to geocode${forceAll ? ' (force update)' : ''}\n`);

  if (dryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < stores.length; i++) {
    const store = stores[i] as Store;

    console.log(`[${i + 1}/${stores.length}] ${store.name}`);
    console.log(`  Address: ${store.address}, ${store.city}, ${store.state} ${store.zip_code}`);

    if (store.latitude && store.longitude && !forceAll) {
      console.log(`  ⏭️  Skipping (already has coordinates: ${store.latitude}, ${store.longitude})\n`);
      continue;
    }

    try {
      // Build address components for geocoding
      const addressComponents: AddressComponents = {
        address: store.address,
        city: store.city,
        state: store.state,
        zip_code: store.zip_code,
        country: 'US',
      };

      // Geocode the address
      const result = await geocodeAddress(addressComponents);

      console.log(`  📍 Geocoded: ${result.latitude}, ${result.longitude}`);
      console.log(`  🌐 Location: ${result.display_name}`);

      if (!dryRun) {
        // Update the database with coordinates
        // Note: The PostGIS trigger will automatically update the location field
        await sql`
          UPDATE stores
          SET
            latitude = ${result.latitude},
            longitude = ${result.longitude}
          WHERE id = ${store.id}
        `;

        console.log(`  ✅ Updated in database`);
      } else {
        console.log(`  🔍 Would update in database (dry run)`);
      }

      successCount++;

      // Rate limiting: delay between requests (geocode.maps.co free tier)
      // API allows 2 requests per second, so we wait 600ms
      if (i < stores.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 600));
      }
    } catch (error) {
      console.log(`  ❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      failCount++;
    }

    console.log('');
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('📊 Summary:');
  console.log(`   Total stores: ${stores.length}`);
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  if (dryRun) {
    console.log('\n   🔍 DRY RUN - No changes were made');
  }
  console.log('═'.repeat(60));
}

// Parse command line arguments
const args = process.argv.slice(2);
const forceAll = args.includes('--all') || args.includes('-a');
const dryRun = args.includes('--dry-run') || args.includes('-d');

// Run the script
geocodeStores({ forceAll, dryRun })
  .then(() => {
    console.log('\n✨ Done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Fatal error:', error);
    process.exit(1);
  });
