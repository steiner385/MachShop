#!/usr/bin/env tsx
/**
 * UOM Migration Production
 * PRODUCTION migration of UOM foreign keys - MAKES PERMANENT CHANGES
 * Run with: npm run migrate:uom:production or tsx scripts/migrate-uom-production.ts
 */

import { main as runMigration } from '../src/tools/migrate-uom-foreign-keys';

async function main(): Promise<void> {
  console.log('🚨 UOM Migration PRODUCTION');
  console.log('===========================');
  console.log('⚠️  WARNING: This will make PERMANENT changes to the database!');
  console.log('');
  console.log('Prerequisites:');
  console.log('✅ Dry run completed and reviewed');
  console.log('✅ Database backup created');
  console.log('✅ Migration plan validated');
  console.log('✅ Stakeholders notified');
  console.log('');

  // Production safety check
  if (!process.argv.includes('--confirmed')) {
    console.error('❌ Production migration requires --confirmed flag for safety');
    console.error('   Run: tsx scripts/migrate-uom-production.ts --confirmed');
    process.exit(1);
  }

  console.log('🔄 Starting production migration...');

  try {
    await runMigration(false); // dryRun = false

    console.log('\n✅ Production Migration Complete!');
    console.log('');
    console.log('🎯 Post-Migration Tasks:');
    console.log('   1. Validate application functionality');
    console.log('   2. Check data integrity');
    console.log('   3. Monitor for any issues');
    console.log('   4. Update API services to use UOM relationships');
    console.log('   5. Run comprehensive tests');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ Production migration failed:', error);
    console.error('');
    console.error('🚨 IMPORTANT: Check database state and consider rollback if needed');
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;