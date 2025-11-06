import { config } from 'dotenv';
import { Pool } from '@neondatabase/serverless';

config({ path: '.env.local' });

(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const result = await pool.query(`
    SELECT brand, COUNT(*) as count
    FROM energy_drinks
    GROUP BY brand
    ORDER BY count DESC, brand
  `);

  console.log('📊 Drinks by brand:');
  result.rows.forEach((row: any) => console.log(`  - ${row.brand}: ${row.count} flavors`));

  const withBarcode = await pool.query('SELECT COUNT(*) as count FROM energy_drinks WHERE barcode IS NOT NULL');
  const withoutBarcode = await pool.query('SELECT COUNT(*) as count FROM energy_drinks WHERE barcode IS NULL');

  console.log(`\n📋 Barcode coverage:`);
  console.log(`  ✅ With barcode: ${withBarcode.rows[0].count}`);
  console.log(`  ⚠️  Without barcode: ${withoutBarcode.rows[0].count}`);

  await pool.end();
  process.exit(0);
})();
