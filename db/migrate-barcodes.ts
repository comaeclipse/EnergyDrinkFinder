import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';
import { readFileSync } from 'fs';

config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log('🚀 Running barcode migration...');
    const sql = readFileSync('db/migrations/002_add_barcodes.sql', 'utf-8');
    await pool.query(sql);
    console.log('✅ Barcode migration completed!');

    const result = await pool.query('SELECT brand, flavor, barcode FROM energy_drinks WHERE barcode IS NOT NULL ORDER BY brand, flavor');
    console.log('\n📊 Drinks with barcodes:');
    result.rows.forEach((row: any) => console.log(`  - ${row.brand} ${row.flavor}: ${row.barcode}`));
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
})();
