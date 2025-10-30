#!/usr/bin/env tsx
/**
 * UOM Migration Dry Run
 * Safe testing of UOM foreign key migration without making changes
 * Run with: npm run migrate:uom:dryrun or tsx scripts/migrate-uom-dryrun.ts
 */

import { main as runMigration } from '../src/tools/migrate-uom-foreign-keys';

async function main(): Promise<void> {
  console.log('🧪 UOM Migration Dry Run');
  console.log('========================');
  console.log('This will analyze the migration without making any changes to the database.');
  console.log('');

  try {
    await runMigration(true); // dryRun = true

    console.log('\n🎯 Dry Run Complete!');
    console.log('Review the generated reports to validate the migration plan.');
    console.log('If everything looks good, run the production migration.');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Dry run failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;