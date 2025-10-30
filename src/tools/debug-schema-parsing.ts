#!/usr/bin/env tsx

/**
 * Debug Schema Parsing - Check how comments are being read
 */

import EnhancedMetadataExtractor from './enhanced-metadata-extractor';

async function debugSchemaParsing() {
  console.log('🔍 Debugging Schema Comment Parsing\n');

  const extractor = new EnhancedMetadataExtractor('./prisma/schema.final.prisma', null);
  const metadata = await extractor.extractEnhancedMetadata();

  console.log(`📊 Found ${metadata.models.length} models`);

  // Check first few models for documentation
  for (let i = 0; i < Math.min(3, metadata.models.length); i++) {
    const model = metadata.models[i];
    console.log(`\n📋 Model: ${model.name}`);
    console.log(`   Documentation: ${model.documentation || 'NONE'}`);
    console.log(`   Fields: ${model.fields.length}`);

    // Check first few fields
    for (let j = 0; j < Math.min(3, model.fields.length); j++) {
      const field = model.fields[j];
      console.log(`     Field: ${field.name}`);
      console.log(`       Type: ${field.type}`);
      console.log(`       Documentation: ${field.documentation || 'NONE'}`);
    }
  }
}

debugSchemaParsing().catch(console.error);