#!/usr/bin/env tsx

/**
 * Torque Management Data Seeder
 *
 * This script seeds the database with comprehensive torque management data including:
 * - Torque specifications for various engine assembly operations
 * - Torque sequences with different bolt patterns (star, linear, cross, spiral)
 * - Sample torque events demonstrating pass/fail scenarios
 * - Digital wrench configurations for different brands
 * - Validation rules for torque operations
 *
 * Usage:
 *   npm run seed:torque
 *   or
 *   npx tsx scripts/seed-torque-data.ts
 */

import { PrismaClient } from '@prisma/client';
import { seedTorqueData } from '../prisma/seeds/seed-torque-data';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting torque management data seeding...');

  try {
    // Check if main seed data exists
    const userCount = await prisma.user.count();
    const workCenterCount = await prisma.workCenter.count();

    if (userCount === 0 || workCenterCount === 0) {
      console.log('⚠️  Main seed data not found. Running main seed first...');
      console.log('Please run: npm run seed');
      process.exit(1);
    }

    console.log(`✅ Found ${userCount} users and ${workCenterCount} work centers`);

    // Check if torque data already exists
    const existingSpecs = await prisma.torqueSpecification.count();
    if (existingSpecs > 0) {
      console.log(`⚠️  Found ${existingSpecs} existing torque specifications`);
      console.log('This will add additional test data with unique identifiers');
    }

    // Seed torque data
    await seedTorqueData();

    // Print summary
    const finalStats = {
      torqueSpecifications: await prisma.torqueSpecification.count(),
      torqueSequences: await prisma.torqueSequence.count(),
      torqueEvents: await prisma.torqueEvent.count()
    };

    console.log('\n📊 Torque Data Summary:');
    console.log(`   Specifications: ${finalStats.torqueSpecifications}`);
    console.log(`   Sequences: ${finalStats.torqueSequences}`);
    console.log(`   Events: ${finalStats.torqueEvents}`);

    console.log('\n🎉 Torque management data seeding completed successfully!');
    console.log('\n💡 Next steps:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Visit the torque management dashboard');
    console.log('   3. Test digital wrench integration');
    console.log('   4. Try real-time torque validation');

  } catch (error) {
    console.error('❌ Error during torque data seeding:', error);

    if (error instanceof Error) {
      console.error('Error details:', error.message);

      if (error.message.includes('Foreign key constraint')) {
        console.log('\n💡 This error usually means:');
        console.log('   - Main seed data is missing or incomplete');
        console.log('   - Run the main seed first: npm run seed');
      }

      if (error.message.includes('Unique constraint')) {
        console.log('\n💡 This error usually means:');
        console.log('   - Torque data already exists');
        console.log('   - Use a different DATABASE_URL for clean testing');
        console.log('   - Or reset the database: npm run db:reset');
      }
    }

    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();