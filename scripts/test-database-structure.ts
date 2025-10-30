#!/usr/bin/env tsx
/**
 * Test database structure to understand actual table and column names
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabaseStructure(): Promise<void> {
  console.log('🔍 Testing Database Structure');
  console.log('============================');

  try {
    // Test a known table - parts
    console.log('\n📋 Testing parts table...');
    const parts = await prisma.part.findMany({
      take: 2,
      select: {
        id: true,
        partNumber: true,
        unitOfMeasure: true,
        weightUnit: true,
      }
    });
    console.log('Parts found:', parts.length);
    if (parts.length > 0) {
      console.log('Sample part:', parts[0]);
    }

    // Test material lots
    console.log('\n📦 Testing material lots...');
    const materialLots = await prisma.materialLot.findMany({
      take: 2,
      select: {
        id: true,
        lotNumber: true,
        unitOfMeasure: true,
      }
    });
    console.log('Material lots found:', materialLots.length);
    if (materialLots.length > 0) {
      console.log('Sample material lot:', materialLots[0]);
    }

    // Test inventory
    console.log('\n📊 Testing inventory...');
    const inventory = await prisma.inventory.findMany({
      take: 2,
      select: {
        id: true,
        partId: true,
        unitOfMeasure: true,
        quantity: true,
      }
    });
    console.log('Inventory records found:', inventory.length);
    if (inventory.length > 0) {
      console.log('Sample inventory:', inventory[0]);
    }

    // Test schedule entries
    console.log('\n📅 Testing schedule entries...');
    const scheduleEntries = await prisma.scheduleEntry.findMany({
      take: 2,
      select: {
        id: true,
        partNumber: true,
        unitOfMeasure: true,
        plannedQuantity: true,
      }
    });
    console.log('Schedule entries found:', scheduleEntries.length);
    if (scheduleEntries.length > 0) {
      console.log('Sample schedule entry:', scheduleEntries[0]);
    }

    // Use raw query to get actual table info
    console.log('\n🔍 Raw query test on parts table...');
    const rawResult = await prisma.$queryRaw`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'parts'
      AND column_name LIKE '%unit%'
      ORDER BY ordinal_position
    `;
    console.log('Parts table unit columns:', rawResult);

  } catch (error) {
    console.error('❌ Error testing database structure:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  testDatabaseStructure().catch(console.error);
}

export default testDatabaseStructure;