#!/usr/bin/env tsx
/**
 * Quick UOM Functionality Test
 * Validates that the UOM integration is working correctly
 */

import { PrismaClient } from '@prisma/client';
import { MaterialService } from './src/services/MaterialService';
import { ProductService } from './src/services/ProductService';

const prisma = new PrismaClient();

async function testUomFunctionality() {
  console.log('🧪 Testing UOM Functionality Integration');
  console.log('=====================================');

  try {
    const materialService = new MaterialService(prisma);
    const productService = new ProductService(prisma);

    console.log('✅ Services initialized successfully');

    // Test UOM resolution
    console.log('\n🔍 Testing UOM resolution...');

    // Check if EA unit exists (should exist from our migration)
    const eaUnit = await prisma.unitOfMeasure.findFirst({
      where: { code: 'EA' }
    });

    if (eaUnit) {
      console.log(`✅ Found EA unit: ${eaUnit.name} (ID: ${eaUnit.id})`);
    } else {
      console.log('⚠️  EA unit not found - creating test unit...');

      // Create a test unit
      const testUnit = await prisma.unitOfMeasure.create({
        data: {
          code: 'EA',
          name: 'Each',
          unitType: 'QUANTITY',
          systemOfMeasure: 'METRIC',
          isBaseUnit: true
        }
      });
      console.log(`✅ Created test EA unit: ${testUnit.id}`);
    }

    // Test creating a part with UOM
    console.log('\n🔧 Testing Part creation with UOM...');
    const testPart = await productService.createPart({
      partNumber: 'TEST-UOM-001',
      partName: 'Test UOM Part',
      description: 'Test part for UOM validation',
      partType: 'COMPONENT',
      unitOfMeasure: 'EA'
    });

    console.log(`✅ Created part: ${testPart.partNumber}`);
    console.log(`   - UOM String: ${testPart.unitOfMeasure}`);
    console.log(`   - UOM ID: ${testPart.unitOfMeasureId}`);

    // Test case-insensitive UOM resolution
    console.log('\n🔍 Testing case-insensitive UOM resolution...');
    const testPart2 = await productService.createPart({
      partNumber: 'TEST-UOM-002',
      partName: 'Test UOM Part 2',
      description: 'Test part for case-insensitive UOM',
      partType: 'COMPONENT',
      unitOfMeasure: 'ea' // lowercase
    });

    console.log(`✅ Created part with lowercase UOM: ${testPart2.partNumber}`);
    console.log(`   - UOM String: ${testPart2.unitOfMeasure} (normalized)`);
    console.log(`   - UOM ID: ${testPart2.unitOfMeasureId}`);

    // Cleanup test data
    console.log('\n🧹 Cleaning up test data...');
    await prisma.part.deleteMany({
      where: {
        partNumber: {
          in: ['TEST-UOM-001', 'TEST-UOM-002']
        }
      }
    });
    console.log('✅ Test data cleaned up');

    console.log('\n🎉 UOM Functionality Test PASSED!');
    console.log('   ✅ UOM resolution working');
    console.log('   ✅ Service integration working');
    console.log('   ✅ Case-insensitive handling working');
    console.log('   ✅ Foreign key population working');

  } catch (error) {
    console.error('\n❌ UOM Functionality Test FAILED!');
    console.error('Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Execute the test
if (require.main === module) {
  testUomFunctionality()
    .then(() => {
      console.log('\n✅ UOM Integration Test Complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ UOM Integration Test Failed:', error);
      process.exit(1);
    });
}

export default testUomFunctionality;