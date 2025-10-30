#!/usr/bin/env tsx
/**
 * Standalone UnitOfMeasure Seeding Script
 * Run with: npm run seed:units or tsx scripts/seed-units-of-measure.ts
 */

import { seedUnitsOfMeasure } from '../prisma/seeds/seed-unit-of-measure';

async function main(): Promise<void> {
  console.log('🚀 UnitOfMeasure Seeding Script');
  console.log('==============================');

  try {
    await seedUnitsOfMeasure();
    console.log('\n✅ UnitOfMeasure seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ UnitOfMeasure seeding failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;