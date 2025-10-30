#!/usr/bin/env tsx
/**
 * UOM Migration Analysis Runner
 * Run with: npm run analyze:uom or tsx scripts/analyze-uom-migration.ts
 */

import { main as runAnalysis } from '../src/tools/analyze-existing-uom-values';

async function main(): Promise<void> {
  console.log('🚀 UOM Migration Analysis');
  console.log('=========================');

  try {
    await runAnalysis();

    console.log('\n🎯 Next Steps:');
    console.log('   1. Review the generated migration summary');
    console.log('   2. Validate high-confidence mappings');
    console.log('   3. Manual review medium/low confidence values');
    console.log('   4. Create missing standard units if needed');
    console.log('   5. Proceed with migration script development');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ UOM analysis failed:', error);
    process.exit(1);
  }
}

// Execute if run directly
if (require.main === module) {
  main().catch(console.error);
}

export default main;