import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/lib/db';
import type { ScanRequest, ScanResponse, EnergyDrink, Store, StoreInventory } from '@/types';

/**
 * POST /api/scan
 *
 * Scan a barcode and mark an energy drink as available at a store.
 *
 * Request body:
 * - barcode: string (required) - UPC/EAN barcode of the energy drink
 * - store_id: number (optional) - ID of the store, if known
 * - latitude: number (optional) - User's latitude (used to find nearest store if no store_id)
 * - longitude: number (optional) - User's longitude
 * - price: number (optional) - Price of the drink at this store
 * - in_stock: boolean (optional, default: true) - Whether the drink is in stock
 *
 * Returns:
 * - 200: Successfully added/updated inventory
 * - 400: Invalid request (missing barcode, invalid data)
 * - 404: Barcode not found in database
 * - 500: Server error
 */
export async function POST(request: NextRequest) {
  try {
    const body: ScanRequest = await request.json();

    // Validate required fields
    if (!body.barcode) {
      return NextResponse.json<ScanResponse>(
        {
          success: false,
          message: 'Barcode is required',
          error: 'Missing barcode field',
        },
        { status: 400 }
      );
    }

    // Validate store identification
    if (!body.store_id && (!body.latitude || !body.longitude)) {
      return NextResponse.json<ScanResponse>(
        {
          success: false,
          message: 'Either store_id or latitude/longitude is required',
          error: 'Missing store identification',
        },
        { status: 400 }
      );
    }

    // Look up the energy drink by barcode
    const drinkResult = await sql`
      SELECT id, brand, flavor, size_ml, caffeine_mg, barcode, sugar_g, calories, description, image_url
      FROM energy_drinks
      WHERE barcode = ${body.barcode}
      LIMIT 1
    `;

    if (drinkResult.length === 0) {
      return NextResponse.json<ScanResponse>(
        {
          success: false,
          message: `No energy drink found with barcode ${body.barcode}`,
          error: 'Drink not found',
        },
        { status: 404 }
      );
    }

    const drink = drinkResult[0] as EnergyDrink;

    // Get or find the store
    let store: Store;

    if (body.store_id) {
      // Use provided store_id
      const storeResult = await sql`
        SELECT id, name, address, city, state, zip_code, latitude, longitude
        FROM stores
        WHERE id = ${body.store_id}
        LIMIT 1
      `;

      if (storeResult.length === 0) {
        return NextResponse.json<ScanResponse>(
          {
            success: false,
            message: `Store with ID ${body.store_id} not found`,
            error: 'Store not found',
          },
          { status: 404 }
        );
      }

      store = storeResult[0] as Store;
    } else {
      // Find nearest store using PostGIS
      const nearestStoreResult = await sql`
        SELECT
          id, name, address, city, state, zip_code, latitude, longitude,
          ST_Distance(
            location,
            ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326)::geography
          ) / 1000 as distance_km
        FROM stores
        ORDER BY location <-> ST_SetSRID(ST_MakePoint(${body.longitude}, ${body.latitude}), 4326)::geography
        LIMIT 1
      `;

      if (nearestStoreResult.length === 0) {
        return NextResponse.json<ScanResponse>(
          {
            success: false,
            message: 'No stores found in database',
            error: 'No stores available',
          },
          { status: 404 }
        );
      }

      store = nearestStoreResult[0] as Store;
      const distanceKm = nearestStoreResult[0].distance_km as number;

      // If store is more than 1km away, might not be the right one
      if (distanceKm > 1) {
        console.warn(`Nearest store is ${distanceKm.toFixed(2)}km away - might not be accurate`);
      }
    }

    // Prepare inventory data
    const price = body.price || 0;
    const inStock = body.in_stock !== undefined ? body.in_stock : true;

    // Upsert inventory record (insert or update if exists)
    const inventoryResult = await sql`
      INSERT INTO store_inventory (store_id, drink_id, price, in_stock)
      VALUES (${store.id}, ${drink.id}, ${price}, ${inStock})
      ON CONFLICT (store_id, drink_id)
      DO UPDATE SET
        price = EXCLUDED.price,
        in_stock = EXCLUDED.in_stock,
        last_updated = CURRENT_TIMESTAMP
      RETURNING id, store_id, drink_id, price, in_stock, last_updated
    `;

    const inventory = inventoryResult[0] as StoreInventory;

    // Determine if this was a new record or an update
    const wasCreated = inventoryResult.length > 0;

    return NextResponse.json<ScanResponse>(
      {
        success: true,
        message: wasCreated
          ? `Successfully added ${drink.brand} ${drink.flavor} to ${store.name}`
          : `Updated ${drink.brand} ${drink.flavor} at ${store.name}`,
        data: {
          drink,
          store,
          inventory,
          was_created: wasCreated,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Scan endpoint error:', error);
    return NextResponse.json<ScanResponse>(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
