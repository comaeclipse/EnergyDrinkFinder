/**
 * Database migration runner
 *
 * Usage: npx tsx db/migrate.ts
 */

import { config } from 'dotenv';
import { Pool, neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join } from 'path';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function runMigration() {
  const dbUrl = process.env.DATABASE_URL;

  if (!dbUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    console.error('Make sure you have .env.local file with DATABASE_URL');
    process.exit(1);
  }

  console.log('🔄 Connecting to Neon database...');
  const pool = new Pool({ connectionString: dbUrl });
  const sql = neon(dbUrl);

  try {
    // Read the migration SQL file
    const migrationPath = join(__dirname, 'migrations', '001_initial_schema.sql');
    console.log(`📄 Reading migration: ${migrationPath}`);
    const migrationSql = readFileSync(migrationPath, 'utf-8');

    // Execute the migration using Pool for raw SQL
    console.log('🚀 Running migration...');
    await pool.query(migrationSql);

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Database schema created:');
    console.log('  - stores table (with PostGIS location support)');
    console.log('  - energy_drinks table');
    console.log('  - store_inventory table');
    console.log('  - Sample data inserted');

    // Verify the tables were created
    console.log('\n🔍 Verifying tables...');
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log('📋 Tables in database:');
    tables.forEach((table: any) => {
      console.log(`  - ${table.table_name}`);
    });

    // Check row counts
    const storeCount = await sql`SELECT COUNT(*) as count FROM stores`;
    const drinkCount = await sql`SELECT COUNT(*) as count FROM energy_drinks`;
    const inventoryCount = await sql`SELECT COUNT(*) as count FROM store_inventory`;

    console.log('\n📈 Data inserted:');
    console.log(`  - ${storeCount[0].count} stores`);
    console.log(`  - ${drinkCount[0].count} energy drinks`);
    console.log(`  - ${inventoryCount[0].count} inventory items`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();
