#!/usr/bin/env tsx

/**
 * Test script for API Metadata Extractor
 * Generates comprehensive API endpoint inventory
 */

import { APIMetadataExtractor } from './api-metadata-extractor';
import * as path from 'path';

async function main() {
  console.log('🚀 Starting API metadata extraction...\n');

  try {
    // Initialize the extractor with the routes directory
    const extractor = new APIMetadataExtractor('./src/routes');

    // Extract comprehensive metadata
    const metadata = await extractor.extractMetadata();

    // Display summary statistics
    console.log('📊 API Metadata Summary:');
    console.log('========================');
    console.log(`📁 Total Modules: ${metadata.modules.length}`);
    console.log(`🔗 Total Endpoints: ${metadata.totalEndpoints}`);
    console.log(`📋 Documentation Coverage: ${metadata.coverage.documented}/${metadata.coverage.total} (${Math.round((metadata.coverage.documented / metadata.coverage.total) * 100)}%)`);
    console.log(`✅ Validated Endpoints: ${metadata.coverage.validated}`);
    console.log('');

    // Endpoints by HTTP method
    console.log('📈 Endpoints by HTTP Method:');
    Object.entries(metadata.endpointsByMethod)
      .sort(([,a], [,b]) => b - a)
      .forEach(([method, count]) => {
        console.log(`   ${method}: ${count}`);
      });
    console.log('');

    // Endpoints by business domain
    console.log('🏢 Endpoints by Business Domain:');
    Object.entries(metadata.endpointsByDomain)
      .sort(([,a], [,b]) => b - a)
      .forEach(([domain, count]) => {
        console.log(`   ${domain}: ${count}`);
      });
    console.log('');

    // Largest route modules
    console.log('📦 Largest Route Modules:');
    metadata.modules
      .sort((a, b) => b.endpoints.length - a.endpoints.length)
      .slice(0, 10)
      .forEach(module => {
        console.log(`   ${module.moduleName}: ${module.endpoints.length} endpoints`);
      });
    console.log('');

    // Validation schema statistics
    const totalSchemas = metadata.modules.reduce((sum, mod) => sum + mod.schemas.length, 0);
    console.log('🔧 Validation Statistics:');
    console.log(`   Total Zod Schemas: ${totalSchemas}`);
    console.log(`   Modules with Validation: ${metadata.modules.filter(m => m.schemas.length > 0).length}`);
    console.log('');

    // Export detailed results
    const outputPath = './docs/generated/api-metadata.json';
    await extractor.exportToFile(metadata, outputPath);

    // Show sample endpoints from different domains
    console.log('🔍 Sample Endpoints by Domain:');
    const samplesByDomain = new Map<string, any[]>();

    metadata.modules.forEach(module => {
      if (!samplesByDomain.has(module.businessDomain)) {
        samplesByDomain.set(module.businessDomain, []);
      }

      const domainSamples = samplesByDomain.get(module.businessDomain)!;
      if (domainSamples.length < 2 && module.endpoints.length > 0) {
        domainSamples.push({
          module: module.moduleName,
          endpoint: module.endpoints[0]
        });
      }
    });

    samplesByDomain.forEach((samples, domain) => {
      console.log(`\n   ${domain}:`);
      samples.forEach(({ module, endpoint }) => {
        console.log(`     ${endpoint.method} ${endpoint.path} (${module})`);
        if (endpoint.description) {
          console.log(`       → ${endpoint.description}`);
        }
        if (endpoint.middleware.length > 0) {
          console.log(`       → Middleware: ${endpoint.middleware.join(', ')}`);
        }
      });
    });

    console.log('\n✅ API metadata extraction completed successfully!');
    console.log(`📄 Detailed results exported to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error during API metadata extraction:', error);
    process.exit(1);
  }
}

// Run the extraction
main().catch(console.error);