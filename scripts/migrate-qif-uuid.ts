#!/usr/bin/env tsx

/**
 * QIF UUID Migration Script
 * Migrates existing QIF records to use UUID identifiers per NIST AMS 300-12 standards
 *
 * This script:
 * 1. Generates UUIDs for all existing QIF records
 * 2. Updates UUID reference fields in QIFMeasurement
 * 3. Maintains backward compatibility with legacy string IDs
 * 4. Provides comprehensive logging and rollback capabilities
 */

import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';

interface MigrationStats {
  measurementPlans: {
    total: number;
    migrated: number;
    skipped: number;
  };
  characteristics: {
    total: number;
    migrated: number;
    skipped: number;
  };
  measurementResults: {
    total: number;
    migrated: number;
    skipped: number;
  };
  measurements: {
    total: number;
    migrated: number;
    skipped: number;
  };
}

interface RollbackData {
  measurementPlanUpdates: Array<{ id: string; qifPlanUuid: string }>;
  characteristicUpdates: Array<{ id: string; characteristicUuid: string }>;
  measurementResultUpdates: Array<{ id: string; qifResultsUuid: string }>;
  measurementUpdates: Array<{ id: string; characteristicUuidRef: string | null }>;
}

class QIFUUIDMigrator {
  private prisma: PrismaClient;
  private dryRun: boolean;
  private stats: MigrationStats;
  private rollbackData: RollbackData;
  private logFile: string;

  constructor(dryRun: boolean = true) {
    this.prisma = new PrismaClient();
    this.dryRun = dryRun;
    this.stats = {
      measurementPlans: { total: 0, migrated: 0, skipped: 0 },
      characteristics: { total: 0, migrated: 0, skipped: 0 },
      measurementResults: { total: 0, migrated: 0, skipped: 0 },
      measurements: { total: 0, migrated: 0, skipped: 0 }
    };
    this.rollbackData = {
      measurementPlanUpdates: [],
      characteristicUpdates: [],
      measurementResultUpdates: [],
      measurementUpdates: []
    };
    this.logFile = `./logs/qif-uuid-migration-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
  }

  private log(message: string): void {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}`;
    console.log(logMessage);

    // Ensure logs directory exists
    if (!fs.existsSync('./logs')) {
      fs.mkdirSync('./logs', { recursive: true });
    }

    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async runMigration(): Promise<void> {
    this.log(`🚀 Starting QIF UUID Migration ${this.dryRun ? '(DRY RUN)' : '(PRODUCTION)'}`);
    this.log('=====================================');

    try {
      // Analyze current data
      await this.analyzeCurrentData();

      if (this.dryRun) {
        this.log('\n📊 DRY RUN - No changes will be made');
      } else {
        this.log('\n⚠️  PRODUCTION RUN - Changes will be committed to database');
      }

      // Perform migration steps
      await this.migrateMeasurementPlans();
      await this.migrateCharacteristics();
      await this.migrateMeasurementResults();
      await this.migrateMeasurements();

      // Save rollback data
      if (!this.dryRun) {
        await this.saveRollbackData();
      }

      this.log('\n✅ QIF UUID Migration completed successfully!');
      this.printStats();

    } catch (error) {
      this.log(`\n❌ Migration failed: ${error}`);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }

  private async analyzeCurrentData(): Promise<void> {
    this.log('\n🔍 Analyzing current QIF data...');

    // Count existing records
    const [plans, characteristics, results, measurements] = await Promise.all([
      this.prisma.qIFMeasurementPlan.count(),
      this.prisma.qIFCharacteristic.count(),
      this.prisma.qIFMeasurementResult.count(),
      this.prisma.qIFMeasurement.count()
    ]);

    this.stats.measurementPlans.total = plans;
    this.stats.characteristics.total = characteristics;
    this.stats.measurementResults.total = results;
    this.stats.measurements.total = measurements;

    this.log(`   📋 QIF Measurement Plans: ${plans}`);
    this.log(`   🔧 QIF Characteristics: ${characteristics}`);
    this.log(`   📊 QIF Measurement Results: ${results}`);
    this.log(`   📈 QIF Measurements: ${measurements}`);

    // Check for existing UUIDs
    const [plansWithUuid, charsWithUuid, resultsWithUuid] = await Promise.all([
      this.prisma.qIFMeasurementPlan.count({ where: { qifPlanUuid: { not: null } } }),
      this.prisma.qIFCharacteristic.count({ where: { characteristicUuid: { not: null } } }),
      this.prisma.qIFMeasurementResult.count({ where: { qifResultsUuid: { not: null } } })
    ]);

    this.log(`\n   🆔 Existing UUIDs found:`);
    this.log(`      Plans: ${plansWithUuid}/${plans}`);
    this.log(`      Characteristics: ${charsWithUuid}/${characteristics}`);
    this.log(`      Results: ${resultsWithUuid}/${results}`);
  }

  private async migrateMeasurementPlans(): Promise<void> {
    this.log('\n📋 Migrating QIF Measurement Plans...');

    const plans = await this.prisma.qIFMeasurementPlan.findMany({
      where: { qifPlanUuid: null },
      select: { id: true, qifPlanId: true }
    });

    this.log(`   Found ${plans.length} plans without UUIDs`);

    for (const plan of plans) {
      const qifPlanUuid = uuidv4();

      this.rollbackData.measurementPlanUpdates.push({
        id: plan.id,
        qifPlanUuid
      });

      if (!this.dryRun) {
        await this.prisma.qIFMeasurementPlan.update({
          where: { id: plan.id },
          data: { qifPlanUuid }
        });
      }

      this.stats.measurementPlans.migrated++;
      this.log(`   ✅ Plan ${plan.qifPlanId}: ${qifPlanUuid}`);
    }

    this.stats.measurementPlans.skipped = this.stats.measurementPlans.total - this.stats.measurementPlans.migrated;
  }

  private async migrateCharacteristics(): Promise<void> {
    this.log('\n🔧 Migrating QIF Characteristics...');

    const characteristics = await this.prisma.qIFCharacteristic.findMany({
      where: { characteristicUuid: null },
      select: { id: true, characteristicId: true }
    });

    this.log(`   Found ${characteristics.length} characteristics without UUIDs`);

    for (const char of characteristics) {
      const characteristicUuid = uuidv4();

      this.rollbackData.characteristicUpdates.push({
        id: char.id,
        characteristicUuid
      });

      if (!this.dryRun) {
        await this.prisma.qIFCharacteristic.update({
          where: { id: char.id },
          data: { characteristicUuid }
        });
      }

      this.stats.characteristics.migrated++;
      this.log(`   ✅ Characteristic ${char.characteristicId}: ${characteristicUuid}`);
    }

    this.stats.characteristics.skipped = this.stats.characteristics.total - this.stats.characteristics.migrated;
  }

  private async migrateMeasurementResults(): Promise<void> {
    this.log('\n📊 Migrating QIF Measurement Results...');

    const results = await this.prisma.qIFMeasurementResult.findMany({
      where: { qifResultsUuid: null },
      select: { id: true, qifResultsId: true }
    });

    this.log(`   Found ${results.length} results without UUIDs`);

    for (const result of results) {
      const qifResultsUuid = uuidv4();

      this.rollbackData.measurementResultUpdates.push({
        id: result.id,
        qifResultsUuid
      });

      if (!this.dryRun) {
        await this.prisma.qIFMeasurementResult.update({
          where: { id: result.id },
          data: { qifResultsUuid }
        });
      }

      this.stats.measurementResults.migrated++;
      this.log(`   ✅ Result ${result.qifResultsId}: ${qifResultsUuid}`);
    }

    this.stats.measurementResults.skipped = this.stats.measurementResults.total - this.stats.measurementResults.migrated;
  }

  private async migrateMeasurements(): Promise<void> {
    this.log('\n📈 Migrating QIF Measurements UUID references...');

    // Get all measurements that need UUID reference updates
    const measurements = await this.prisma.qIFMeasurement.findMany({
      where: { characteristicUuidRef: null },
      select: {
        id: true,
        characteristicId: true,
        qifCharacteristic: {
          select: { characteristicUuid: true }
        }
      }
    });

    this.log(`   Found ${measurements.length} measurements without UUID references`);

    for (const measurement of measurements) {
      const characteristicUuidRef = measurement.qifCharacteristic?.characteristicUuid || null;

      this.rollbackData.measurementUpdates.push({
        id: measurement.id,
        characteristicUuidRef
      });

      if (!this.dryRun) {
        await this.prisma.qIFMeasurement.update({
          where: { id: measurement.id },
          data: { characteristicUuidRef }
        });
      }

      this.stats.measurements.migrated++;
      if (characteristicUuidRef) {
        this.log(`   ✅ Measurement ${measurement.id}: linked to ${characteristicUuidRef}`);
      } else {
        this.log(`   ⚠️  Measurement ${measurement.id}: no characteristic found for ${measurement.characteristicId}`);
      }
    }

    this.stats.measurements.skipped = this.stats.measurements.total - this.stats.measurements.migrated;
  }

  private async saveRollbackData(): Promise<void> {
    const rollbackFile = `./logs/qif-uuid-rollback-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;

    fs.writeFileSync(rollbackFile, JSON.stringify(this.rollbackData, null, 2));
    this.log(`\n💾 Rollback data saved to: ${rollbackFile}`);
  }

  private printStats(): void {
    this.log('\n📊 Migration Statistics:');
    this.log('========================');
    this.log(`📋 Measurement Plans: ${this.stats.measurementPlans.migrated}/${this.stats.measurementPlans.total} migrated (${this.stats.measurementPlans.skipped} skipped)`);
    this.log(`🔧 Characteristics: ${this.stats.characteristics.migrated}/${this.stats.characteristics.total} migrated (${this.stats.characteristics.skipped} skipped)`);
    this.log(`📊 Measurement Results: ${this.stats.measurementResults.migrated}/${this.stats.measurementResults.total} migrated (${this.stats.measurementResults.skipped} skipped)`);
    this.log(`📈 Measurements: ${this.stats.measurements.migrated}/${this.stats.measurements.total} migrated (${this.stats.measurements.skipped} skipped)`);

    const totalMigrated = this.stats.measurementPlans.migrated + this.stats.characteristics.migrated +
                         this.stats.measurementResults.migrated + this.stats.measurements.migrated;

    this.log(`\n🎯 Total Records Migrated: ${totalMigrated}`);
    this.log(`📄 Log file: ${this.logFile}`);
  }

  // Rollback functionality
  async rollback(rollbackFile: string): Promise<void> {
    this.log(`🔄 Starting rollback from: ${rollbackFile}`);

    try {
      const rollbackData: RollbackData = JSON.parse(fs.readFileSync(rollbackFile, 'utf8'));

      // Rollback measurement plans
      for (const update of rollbackData.measurementPlanUpdates) {
        await this.prisma.qIFMeasurementPlan.update({
          where: { id: update.id },
          data: { qifPlanUuid: null }
        });
      }

      // Rollback characteristics
      for (const update of rollbackData.characteristicUpdates) {
        await this.prisma.qIFCharacteristic.update({
          where: { id: update.id },
          data: { characteristicUuid: null }
        });
      }

      // Rollback measurement results
      for (const update of rollbackData.measurementResultUpdates) {
        await this.prisma.qIFMeasurementResult.update({
          where: { id: update.id },
          data: { qifResultsUuid: null }
        });
      }

      // Rollback measurements
      for (const update of rollbackData.measurementUpdates) {
        await this.prisma.qIFMeasurement.update({
          where: { id: update.id },
          data: { characteristicUuidRef: null }
        });
      }

      this.log('✅ Rollback completed successfully');

    } catch (error) {
      this.log(`❌ Rollback failed: ${error}`);
      throw error;
    } finally {
      await this.prisma.$disconnect();
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const isDryRun = !args.includes('--production');
  const isRollback = args.includes('--rollback');
  const rollbackFile = args.find(arg => arg.startsWith('--rollback-file='))?.split('=')[1];

  if (isRollback) {
    if (!rollbackFile) {
      console.error('❌ Rollback requires --rollback-file=path/to/file.json');
      process.exit(1);
    }

    const migrator = new QIFUUIDMigrator(false);
    await migrator.rollback(rollbackFile);
  } else {
    const migrator = new QIFUUIDMigrator(isDryRun);
    await migrator.runMigration();
  }
}

// Execute if called directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  });
}

export { QIFUUIDMigrator };