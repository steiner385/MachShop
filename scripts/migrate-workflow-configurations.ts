/**
 * Migration Script: Workflow Configuration Initialization
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 *
 * Initializes default STRICT mode workflow configurations for all existing sites
 * that don't yet have a configuration record. Ensures all sites have at least
 * one configuration for proper system operation.
 *
 * Usage:
 *   npm run migrate:workflow-config
 *   npm run migrate:workflow-config -- --dryrun    # Preview changes without applying
 *   npm run migrate:workflow-config -- --rollback  # Rollback to pre-migration state
 */

import { prisma, getPrisma } from '../src/lib/database';
import { logger } from '../src/utils/logger';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

interface MigrationResult {
  sitesProcessed: number;
  configurationsCreated: number;
  configurationsSkipped: number;
  errors: Array<{ siteId: string; error: string }>;
  startTime: Date;
  endTime: Date;
  durationMs: number;
}

interface MigrationLog {
  timestamp: Date;
  version: string;
  migrationResult: MigrationResult;
  rollbackData: Array<{
    siteId: string;
    configurationId: string;
    createdAt: Date;
  }>;
}

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

const DEFAULT_STRICT_CONFIG = {
  mode: 'STRICT' as const,
  enforceOperationSequence: true,
  enforceStatusGating: true,
  allowExternalVouching: false,
  enforceQualityChecks: true,
  requireStartTransition: true,
  requireJustification: false,
  requireApproval: false,
};

const MIGRATION_LOG_DIR = path.join(process.cwd(), 'migration-logs');
const MIGRATION_LOG_FILE = path.join(MIGRATION_LOG_DIR, `workflow-config-migration-${new Date().toISOString().split('T')[0]}.json`);
const ROLLBACK_FILE = path.join(MIGRATION_LOG_DIR, 'workflow-config-rollback.json');

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Initialize migration log directory if it doesn't exist
 */
async function initializeMigrationLogDir() {
  try {
    if (!fs.existsSync(MIGRATION_LOG_DIR)) {
      fs.mkdirSync(MIGRATION_LOG_DIR, { recursive: true });
      logger.info(`Created migration log directory: ${MIGRATION_LOG_DIR}`);
    }
  } catch (error) {
    logger.error('Failed to create migration log directory', error);
    throw error;
  }
}

/**
 * Get all sites from database
 */
async function getAllSites(dbClient = prisma) {
  try {
    if (!dbClient) {
      throw new Error('Database client not initialized');
    }

    const sites = await dbClient.site.findMany({
      select: {
        id: true,
        siteName: true,
        siteCode: true,
      },
    });

    logger.info(`Found ${sites.length} sites in database`);
    return sites;
  } catch (error) {
    logger.error('Failed to fetch sites from database', error);
    throw error;
  }
}

/**
 * Check if a site already has a workflow configuration
 */
async function getSiteConfiguration(siteId: string, dbClient = prisma) {
  try {
    if (!dbClient) {
      throw new Error('Database client not initialized');
    }

    const config = await dbClient.siteWorkflowConfiguration.findUnique({
      where: { siteId },
    });

    return config;
  } catch (error) {
    logger.error(`Failed to check configuration for site ${siteId}`, error);
    throw error;
  }
}

/**
 * Create default STRICT configuration for a site
 */
async function createDefaultConfiguration(siteId: string, userId: string = 'migration-script', dbClient = prisma) {
  try {
    if (!dbClient) {
      throw new Error('Database client not initialized');
    }

    const configId = `config-${siteId}-${Date.now()}`;

    const config = await dbClient.siteWorkflowConfiguration.create({
      data: {
        id: configId,
        siteId,
        ...DEFAULT_STRICT_CONFIG,
        effectiveDate: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: userId,
        updatedBy: userId,
      },
    });

    logger.info(`Created default STRICT configuration for site ${siteId}: ${configId}`);

    return config;
  } catch (error) {
    logger.error(`Failed to create configuration for site ${siteId}`, error);
    throw error;
  }
}

/**
 * Create audit history entry for migration
 */
async function createMigrationHistoryEntry(siteConfigId: string, userId: string = 'migration-script', dbClient = prisma) {
  try {
    if (!dbClient) {
      throw new Error('Database client not initialized');
    }

    const history = await dbClient.workflowConfigurationHistory.create({
      data: {
        configType: 'SITE',
        configId: siteConfigId,
        field: 'mode',
        oldValue: null,
        newValue: 'STRICT',
        changeReason: 'Initial configuration from migration script',
        changedBy: userId,
        siteConfigId: siteConfigId,
      },
    });

    return history;
  } catch (error) {
    logger.error(`Failed to create history entry for config ${siteConfigId}`, error);
    throw error;
  }
}

/**
 * Execute migration: Create default configurations for all sites
 */
async function executeMigration(dryRun: boolean = false, dbClient = prisma): Promise<MigrationResult> {
  const startTime = new Date();
  const result: MigrationResult = {
    sitesProcessed: 0,
    configurationsCreated: 0,
    configurationsSkipped: 0,
    errors: [],
    startTime,
    endTime: new Date(),
    durationMs: 0,
  };

  const rollbackData: Array<{ siteId: string; configurationId: string; createdAt: Date }> = [];

  try {
    if (!dbClient) {
      throw new Error('Database client not initialized');
    }

    // Get all sites
    const sites = await getAllSites(dbClient);
    result.sitesProcessed = sites.length;

    logger.info(`\n${'='.repeat(80)}`);
    logger.info(`Starting workflow configuration migration (${dryRun ? 'DRY RUN' : 'LIVE'})`);
    logger.info(`Sites to process: ${sites.length}`);
    logger.info(`${'='.repeat(80)}\n`);

    // Process each site
    for (const site of sites) {
      try {
        // Check if already configured
        const existingConfig = await getSiteConfiguration(site.id, dbClient);

        if (existingConfig) {
          logger.info(`SKIP: Site ${site.siteCode} (${site.id}) already has configuration`);
          result.configurationsSkipped++;
          continue;
        }

        logger.info(`PROCESS: Site ${site.siteCode} (${site.id}) - Creating default STRICT configuration`);

        if (!dryRun) {
          // Create default configuration
          const config = await createDefaultConfiguration(site.id, 'migration-script', dbClient);

          // Create history entry
          await createMigrationHistoryEntry(config.id, 'migration-script', dbClient);

          rollbackData.push({
            siteId: site.id,
            configurationId: config.id,
            createdAt: config.createdAt,
          });

          result.configurationsCreated++;
          logger.info(`✓ Created configuration ${config.id} for site ${site.id}`);
        } else {
          result.configurationsCreated++;
          logger.info(`✓ [DRY RUN] Would create configuration for site ${site.id}`);
        }
      } catch (error) {
        result.errors.push({
          siteId: site.id,
          error: error instanceof Error ? error.message : String(error),
        });
        logger.error(`✗ Failed to process site ${site.id}`, error);
      }
    }

    result.endTime = new Date();
    result.durationMs = result.endTime.getTime() - startTime.getTime();

    // Log summary
    logger.info(`\n${'='.repeat(80)}`);
    logger.info('Migration Summary:');
    logger.info(`  Sites Processed:        ${result.sitesProcessed}`);
    logger.info(`  Configurations Created: ${result.configurationsCreated}`);
    logger.info(`  Configurations Skipped: ${result.configurationsSkipped}`);
    logger.info(`  Errors:                 ${result.errors.length}`);
    logger.info(`  Duration:               ${(result.durationMs / 1000).toFixed(2)}s`);
    logger.info(`${'='.repeat(80)}\n`);

    if (result.errors.length > 0) {
      logger.warn('Errors encountered during migration:');
      result.errors.forEach((err) => {
        logger.warn(`  - Site ${err.siteId}: ${err.error}`);
      });
    }

    // Save migration log
    if (!dryRun && result.configurationsCreated > 0) {
      const migrationLog: MigrationLog = {
        timestamp: new Date(),
        version: '1.0.0',
        migrationResult: result,
        rollbackData,
      };

      await saveMigrationLog(migrationLog);
    }

    return result;
  } catch (error) {
    logger.error('Migration failed with error', error);
    throw error;
  }
}

/**
 * Save migration log for audit trail and rollback capability
 */
async function saveMigrationLog(log: MigrationLog) {
  try {
    await initializeMigrationLogDir();

    const logContent = JSON.stringify(log, null, 2);
    fs.writeFileSync(MIGRATION_LOG_FILE, logContent, 'utf-8');

    logger.info(`Migration log saved to: ${MIGRATION_LOG_FILE}`);

    // Also save rollback data separately
    const rollbackContent = JSON.stringify(log.rollbackData, null, 2);
    fs.writeFileSync(ROLLBACK_FILE, rollbackContent, 'utf-8');

    logger.info(`Rollback data saved to: ${ROLLBACK_FILE}`);
  } catch (error) {
    logger.error('Failed to save migration log', error);
    throw error;
  }
}

/**
 * Rollback migration by removing created configurations
 */
async function rollbackMigration(dbClient = prisma): Promise<{ deleted: number; errors: string[] }> {
  const result = { deleted: 0, errors: [] as string[] };

  try {
    if (!dbClient) {
      throw new Error('Database client not initialized');
    }

    // Check if rollback file exists
    if (!fs.existsSync(ROLLBACK_FILE)) {
      logger.warn('No rollback file found. Cannot rollback migration.');
      return result;
    }

    logger.info('\nStarting rollback process...\n');

    const rollbackData = JSON.parse(
      fs.readFileSync(ROLLBACK_FILE, 'utf-8')
    ) as Array<{ siteId: string; configurationId: string }>;

    logger.info(`Found ${rollbackData.length} configurations to rollback`);

    for (const item of rollbackData) {
      try {
        // Delete configuration
        await dbClient.siteWorkflowConfiguration.delete({
          where: { id: item.configurationId },
        });

        // Delete history entries
        await dbClient.workflowConfigurationHistory.deleteMany({
          where: { configId: item.configurationId },
        });

        result.deleted++;
        logger.info(`✓ Rolled back configuration for site ${item.siteId}`);
      } catch (error) {
        result.errors.push(
          `Failed to rollback site ${item.siteId}: ${error instanceof Error ? error.message : String(error)}`
        );
        logger.error(`✗ Failed to rollback site ${item.siteId}`, error);
      }
    }

    logger.info(`\nRollback Summary:`);
    logger.info(`  Deleted: ${result.deleted}`);
    logger.info(`  Errors:  ${result.errors.length}\n`);

    if (result.errors.length > 0) {
      logger.warn('Errors encountered during rollback:');
      result.errors.forEach((err) => logger.warn(`  - ${err}`));
    }

    return result;
  } catch (error) {
    logger.error('Rollback failed with error', error);
    throw error;
  }
}

/**
 * Verify migration results by checking all sites have configurations
 */
async function verifyMigration(dbClient = prisma): Promise<{ allConfigured: boolean; details: string }> {
  try {
    if (!dbClient) {
      throw new Error('Database client not initialized');
    }

    const sites = await getAllSites(dbClient);
    const sitesWithoutConfig: string[] = [];

    for (const site of sites) {
      const config = await getSiteConfiguration(site.id, dbClient);
      if (!config) {
        sitesWithoutConfig.push(`${site.siteCode} (${site.id})`);
      }
    }

    const allConfigured = sitesWithoutConfig.length === 0;
    const details = allConfigured
      ? `All ${sites.length} sites have workflow configurations`
      : `${sitesWithoutConfig.length} sites missing configurations: ${sitesWithoutConfig.join(', ')}`;

    return { allConfigured, details };
  } catch (error) {
    logger.error('Verification failed', error);
    throw error;
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dryrun');
  const rollback = args.includes('--rollback');
  const verify = args.includes('--verify');

  try {
    // Ensure Prisma is initialized (handles CyberArk PAM if enabled)
    const db = await getPrisma();

    await initializeMigrationLogDir();

    if (rollback) {
      const result = await rollbackMigration(db);
      process.exit(result.errors.length > 0 ? 1 : 0);
    }

    if (verify) {
      const verification = await verifyMigration(db);
      logger.info(`\nVerification Result:`);
      logger.info(`  All Configured: ${verification.allConfigured}`);
      logger.info(`  Details: ${verification.details}\n`);
      process.exit(verification.allConfigured ? 0 : 1);
    }

    // Execute migration
    const result = await executeMigration(dryRun, db);

    // Exit with error code if there were failures
    process.exit(result.errors.length > 0 ? 1 : 0);
  } catch (error) {
    logger.error('Migration script failed', error);
    process.exit(1);
  } finally {
    // Disconnect from database
    if (prisma) {
      await prisma.$disconnect();
    }
  }
}

// Run migration if this is the main module
if (require.main === module) {
  main().catch((error) => {
    logger.error('Unhandled error in migration script', error);
    process.exit(1);
  });
}

export { executeMigration, rollbackMigration, verifyMigration };
