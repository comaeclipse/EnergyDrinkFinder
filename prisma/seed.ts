import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...\n');

  // Sample energy drinks to seed (if not already exists)
  const drinks = [
    {
      brand: 'Red Bull',
      flavor: 'Original',
      size_ml: 250,
      caffeine_mg: 80,
      sugar_g: 27,
      calories: 110,
      barcode: '611269818994',
      description: 'Classic Red Bull energy drink',
    },
    {
      brand: 'Monster',
      flavor: 'Original (Green)',
      size_ml: 473,
      caffeine_mg: 300,
      sugar_g: 54,
      calories: 210,
      barcode: '070847815037',
      description: 'Monster Energy original green',
    },
    {
      brand: 'Reign',
      flavor: 'Sour Gummy Worm',
      size_ml: 473,
      caffeine_mg: 300,
      barcode: '815154025973',
      description: 'Reign Sour Gummy Worm energy drink',
    },
  ];

  let created = 0;
  let skipped = 0;

  for (const drink of drinks) {
    try {
      // Use upsert to avoid duplicates
      await prisma.energy_drinks.upsert({
        where: {
          brand_flavor_size_ml: {
            brand: drink.brand,
            flavor: drink.flavor,
            size_ml: drink.size_ml,
          },
        },
        update: {},
        create: drink,
      });
      console.log(`✅ ${drink.brand} ${drink.flavor}`);
      created++;
    } catch (error: any) {
      if (error.code === 'P2002') {
        console.log(`⏭️  Skipped ${drink.brand} ${drink.flavor} (already exists)`);
        skipped++;
      } else {
        console.error(`❌ Error seeding ${drink.brand} ${drink.flavor}:`, error.message);
      }
    }
  }

  console.log(`\n📊 Seed summary:`);
  console.log(`  ✅ Created: ${created}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);

  // Show total count
  const total = await prisma.energy_drinks.count();
  console.log(`\n🗄️  Total drinks in database: ${total}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error('❌ Seed failed:', e);
    await prisma.$disconnect();
    process.exit(1);
  });
