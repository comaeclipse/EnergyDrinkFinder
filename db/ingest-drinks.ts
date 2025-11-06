/**
 * Ingest energy drinks from JSON file into database
 *
 * Usage: npx tsx db/ingest-drinks.ts
 */

import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

config({ path: '.env.local' });

interface DrinkData {
  brand: string;
  flavor: string;
  upc: string | null;
}

async function ingestDrinks() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    console.log('📂 Reading drinks data...');
    const jsonPath = join(__dirname, 'seed-drinks.json');
    const drinks: DrinkData[] = JSON.parse(readFileSync(jsonPath, 'utf-8'));

    console.log(`📊 Found ${drinks.length} drinks to ingest\n`);

    let inserted = 0;
    let updated = 0;
    let skipped = 0;

    for (const drink of drinks) {
      // Normalize UPC (remove leading zeros, handle null)
      const barcode = drink.upc ? drink.upc.replace(/^0+/, '') : null;

      // Determine size based on brand standards
      // Most energy drinks are 16oz (473ml) or 12oz (355ml)
      let size_ml = 473; // Default to 16oz
      let caffeine_mg = 300; // Default high caffeine

      // Adjust based on brand/flavor patterns
      if (drink.brand === 'Red Bull') {
        size_ml = 250; // Red Bull is typically 8.4oz
        caffeine_mg = 80;
      } else if (drink.brand === 'Celsius') {
        size_ml = 355; // 12oz
        caffeine_mg = 200;
      } else if (drink.brand === 'Alani Nu') {
        size_ml = 355; // 12oz
        caffeine_mg = 200;
      } else if (drink.flavor.includes('12oz') || drink.flavor.includes('12-pack')) {
        size_ml = 355; // Explicitly marked as 12oz
      }

      // Monster and Reign are typically 300mg caffeine
      if (drink.brand === 'Monster' || drink.brand === 'Reign') {
        caffeine_mg = 300;
      }

      // Bang is very high caffeine
      if (drink.brand === 'Bang') {
        caffeine_mg = 300;
      }

      try {
        // Check if drink already exists (by barcode OR brand+flavor)
        let existingDrink;
        if (barcode) {
          existingDrink = await pool.query(
            'SELECT id, barcode FROM energy_drinks WHERE barcode = $1',
            [barcode]
          );
        }

        if (!existingDrink?.rows.length) {
          existingDrink = await pool.query(
            'SELECT id, barcode FROM energy_drinks WHERE brand = $1 AND flavor = $2 AND size_ml = $3',
            [drink.brand, drink.flavor, size_ml]
          );
        }

        if (existingDrink?.rows.length > 0) {
          // Update existing drink if it has no barcode but we have one
          const existing = existingDrink.rows[0];
          if (!existing.barcode && barcode) {
            await pool.query(
              'UPDATE energy_drinks SET barcode = $1 WHERE id = $2',
              [barcode, existing.id]
            );
            console.log(`✏️  Updated: ${drink.brand} ${drink.flavor} - Added barcode ${barcode}`);
            updated++;
          } else {
            console.log(`⏭️  Skipped: ${drink.brand} ${drink.flavor} - Already exists`);
            skipped++;
          }
        } else {
          // Insert new drink
          await pool.query(
            `INSERT INTO energy_drinks
             (brand, flavor, size_ml, caffeine_mg, barcode, description)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
              drink.brand,
              drink.flavor,
              size_ml,
              caffeine_mg,
              barcode,
              `${drink.brand} ${drink.flavor} energy drink`
            ]
          );
          console.log(`✅ Inserted: ${drink.brand} ${drink.flavor} (${size_ml}ml, ${caffeine_mg}mg caffeine, barcode: ${barcode || 'N/A'})`);
          inserted++;
        }
      } catch (error: any) {
        // Handle unique constraint violations gracefully
        if (error.code === '23505') {
          console.log(`⏭️  Skipped: ${drink.brand} ${drink.flavor} - Duplicate`);
          skipped++;
        } else {
          console.error(`❌ Error inserting ${drink.brand} ${drink.flavor}:`, error.message);
        }
      }
    }

    console.log('\n📈 Summary:');
    console.log(`  ✅ Inserted: ${inserted}`);
    console.log(`  ✏️  Updated: ${updated}`);
    console.log(`  ⏭️  Skipped: ${skipped}`);
    console.log(`  📊 Total: ${drinks.length}`);

    // Show final count
    const result = await pool.query('SELECT COUNT(*) as count FROM energy_drinks');
    console.log(`\n🗄️  Total drinks in database: ${result.rows[0].count}`);

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Ingestion failed:', error);
    await pool.end();
    process.exit(1);
  }
}

ingestDrinks();
