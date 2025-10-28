/**
 * Dynamic Database Allocator for E2E Tests
 *
 * Manages database allocation for parallel test execution by creating project-specific
 * databases to prevent data conflicts between test projects.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export interface AllocatedDatabase {
  databaseName: string;
  databaseUrl: string;
  project: string;
  timestamp: number;
}

export class DatabaseAllocator {
  private static instance: DatabaseAllocator;
  private allocatedDatabases: Map<string, AllocatedDatabase> = new Map();
  private readonly baseDatabaseName = 'mes_e2e_db';
  private readonly baseConnectionUrl = 'postgresql://mes_user:mes_password@localhost:5432';
  private readonly dbCacheFile = path.join(process.cwd(), 'test-results', 'allocated-databases.json');

  private constructor() {
    this.loadDatabaseCache();
    // Clean up stale allocations on startup
    this.cleanupStaleAllocations();
  }

  public static getInstance(): DatabaseAllocator {
    if (!DatabaseAllocator.instance) {
      DatabaseAllocator.instance = new DatabaseAllocator();
    }
    return DatabaseAllocator.instance;
  }

  /**
   * Allocate database for a test project
   */
  public async allocateDatabaseForProject(projectName: string): Promise<AllocatedDatabase> {
    // Check if database is already allocated for this project
    const existing = this.allocatedDatabases.get(projectName);
    if (existing && await this.isDatabaseAvailable(existing.databaseName)) {
      this.safeLog(`[DatabaseAllocator] Reusing existing database for ${projectName}: ${existing.databaseName}`);
      return existing;
    }

    // Create new project-specific database
    const databaseName = this.generateProjectDatabaseName(projectName);
    const databaseUrl = `${this.baseConnectionUrl}/${databaseName}?schema=public`;

    try {
      // Create the database
      await this.createDatabase(databaseName);

      // Run migrations on the new database
      await this.runMigrations(databaseUrl);

      const allocation: AllocatedDatabase = {
        databaseName,
        databaseUrl,
        project: projectName,
        timestamp: Date.now()
      };

      this.allocatedDatabases.set(projectName, allocation);
      this.saveDatabaseCache();

      this.safeLog(`[DatabaseAllocator] Allocated database for ${projectName}: ${databaseName}`);
      return allocation;
    } catch (error) {
      console.error(`[DatabaseAllocator] Failed to allocate database for ${projectName}:`, error);
      throw error;
    }
  }

  /**
   * Release database for a project
   */
  public async releaseDatabaseForProject(projectName: string): Promise<void> {
    const allocation = this.allocatedDatabases.get(projectName);
    if (allocation) {
      try {
        // Drop the database
        await this.dropDatabase(allocation.databaseName);
        console.log(`[DatabaseAllocator] Released database for ${projectName}: ${allocation.databaseName}`);
      } catch (error) {
        console.warn(`[DatabaseAllocator] Warning: Failed to drop database ${allocation.databaseName}:`, error);
      }

      this.allocatedDatabases.delete(projectName);
      this.saveDatabaseCache();
    }
  }

  /**
   * Get allocated database for a project
   */
  public getDatabaseForProject(projectName: string): AllocatedDatabase | undefined {
    return this.allocatedDatabases.get(projectName);
  }

  /**
   * Generate project-specific database name
   */
  private generateProjectDatabaseName(projectName: string): string {
    // Sanitize project name for database naming (remove special characters)
    const sanitizedProject = projectName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase();
    return `${this.baseDatabaseName}_${sanitizedProject}`;
  }

  /**
   * Create database if it doesn't exist
   */
  private async createDatabase(databaseName: string): Promise<void> {
    try {
      // Safe console.log that won't crash on EPIPE
      this.safeLog(`[DatabaseAllocator] Creating database: ${databaseName}`);
      execSync(`PGPASSWORD=mes_password createdb -U mes_user -h localhost ${databaseName}`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'mes_password' }
      });
    } catch (error) {
      // Database might already exist, check if it's actually available
      if (await this.isDatabaseAvailable(databaseName)) {
        this.safeLog(`[DatabaseAllocator] Database ${databaseName} already exists`);
      } else {
        throw error;
      }
    }
  }

  /**
   * Drop database
   */
  private async dropDatabase(databaseName: string): Promise<void> {
    try {
      console.log(`[DatabaseAllocator] Dropping database: ${databaseName}`);
      execSync(`PGPASSWORD=mes_password dropdb -U mes_user -h localhost ${databaseName} --if-exists`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'mes_password' }
      });
    } catch (error) {
      console.warn(`[DatabaseAllocator] Failed to drop database ${databaseName}:`, error);
      throw error;
    }
  }

  /**
   * Force drop database (for corrupted databases)
   */
  private forceDropDatabase(databaseName: string): void {
    try {
      // First try terminating any active connections
      execSync(`PGPASSWORD=mes_password psql -U mes_user -h localhost -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${databaseName}' AND pid <> pg_backend_pid();"`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'mes_password' }
      });
    } catch (error) {
      // Ignore connection termination errors
      console.log(`[DatabaseAllocator] Connection termination attempt completed`);
    }

    try {
      // Force drop the database
      execSync(`PGPASSWORD=mes_password dropdb -U mes_user -h localhost ${databaseName} --if-exists --force`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'mes_password' }
      });
    } catch (error) {
      // If force drop fails, try without force flag
      try {
        execSync(`PGPASSWORD=mes_password dropdb -U mes_user -h localhost ${databaseName} --if-exists`, {
          stdio: 'pipe',
          env: { ...process.env, PGPASSWORD: 'mes_password' }
        });
      } catch (fallbackError) {
        console.warn(`[DatabaseAllocator] Force drop failed for ${databaseName}, proceeding anyway:`, fallbackError);
      }
    }
  }

  /**
   * Check if database is available
   */
  private async isDatabaseAvailable(databaseName: string): Promise<boolean> {
    try {
      execSync(`PGPASSWORD=mes_password psql -U mes_user -h localhost -d ${databaseName} -c "SELECT 1;" > /dev/null 2>&1`, {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: 'mes_password' }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Run migrations on database
   */
  private async runMigrations(databaseUrl: string): Promise<void> {
    try {
      console.log(`[DatabaseAllocator] Running migrations on: ${databaseUrl.split('@')[1]}`); // Hide credentials
      execSync(`DATABASE_URL="${databaseUrl}" npx prisma migrate deploy`, {
        stdio: 'pipe',
        cwd: process.cwd(),
        env: { ...process.env, DATABASE_URL: databaseUrl }
      });
      console.log(`[DatabaseAllocator] Migrations completed successfully`);
    } catch (error) {
      const errorString = error?.toString() || '';

      // Check for specific migration corruption errors that can be recovered
      const isCorruptionError = errorString.includes('P3009') || // failed migrations found
                               errorString.includes('P3018') || // migration failed to apply
                               errorString.includes('already exists'); // schema conflicts

      if (isCorruptionError) {
        console.log(`[DatabaseAllocator] Detected corrupted migration state, attempting recovery...`);

        // Extract database name from URL
        const dbNameMatch = databaseUrl.match(/\/([^/?]+)(\?|$)/);
        const databaseName = dbNameMatch ? dbNameMatch[1] : null;

        if (databaseName) {
          try {
            // Force drop and recreate the database
            console.log(`[DatabaseAllocator] Force dropping corrupted database: ${databaseName}`);
            this.forceDropDatabase(databaseName);

            console.log(`[DatabaseAllocator] Recreating database: ${databaseName}`);
            this.createDatabase(databaseName);

            // Retry migrations on fresh database
            console.log(`[DatabaseAllocator] Retrying migrations on fresh database...`);
            execSync(`DATABASE_URL="${databaseUrl}" npx prisma migrate deploy`, {
              stdio: 'pipe',
              cwd: process.cwd(),
              env: { ...process.env, DATABASE_URL: databaseUrl }
            });
            console.log(`[DatabaseAllocator] Migration recovery successful`);
            return;
          } catch (recoveryError) {
            console.error(`[DatabaseAllocator] Migration recovery failed:`, recoveryError);
            throw recoveryError;
          }
        }
      }

      console.error(`[DatabaseAllocator] Migration failed for ${databaseUrl}:`, error);
      throw error;
    }
  }

  /**
   * Load database cache from file
   */
  private loadDatabaseCache(): void {
    try {
      if (fs.existsSync(this.dbCacheFile)) {
        const data = fs.readFileSync(this.dbCacheFile, 'utf-8');
        const cached = JSON.parse(data) as AllocatedDatabase[];

        for (const allocation of cached) {
          this.allocatedDatabases.set(allocation.project, allocation);
        }

        console.log(`[DatabaseAllocator] Loaded ${cached.length} database allocations from cache`);
      }
    } catch (error) {
      console.warn('[DatabaseAllocator] Failed to load database cache:', error);
    }
  }

  /**
   * Save database cache to file
   */
  private saveDatabaseCache(): void {
    try {
      // Ensure directory exists
      const dir = path.dirname(this.dbCacheFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      const allocations = Array.from(this.allocatedDatabases.values());
      fs.writeFileSync(this.dbCacheFile, JSON.stringify(allocations, null, 2));
    } catch (error) {
      console.warn('[DatabaseAllocator] Failed to save database cache:', error);
    }
  }

  /**
   * Clean up stale database allocations (older than 2 hours)
   */
  private cleanupStaleAllocations(): void {
    const staleThreshold = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
    let cleanedCount = 0;

    for (const [project, allocation] of this.allocatedDatabases.entries()) {
      if (allocation.timestamp < staleThreshold) {
        this.allocatedDatabases.delete(project);
        cleanedCount++;

        // Asynchronously attempt to drop the stale database
        this.dropDatabase(allocation.databaseName).catch(error => {
          console.warn(`[DatabaseAllocator] Failed to cleanup stale database ${allocation.databaseName}:`, error);
        });
      }
    }

    if (cleanedCount > 0) {
      console.log(`[DatabaseAllocator] Cleaned up ${cleanedCount} stale database allocations`);
      this.saveDatabaseCache();
    }
  }

  /**
   * Get all current database allocations (for debugging)
   */
  public getAllAllocations(): AllocatedDatabase[] {
    return Array.from(this.allocatedDatabases.values());
  }

  /**
   * Clear all database allocations
   */
  public async clearAllAllocations(): Promise<void> {
    const allocations = Array.from(this.allocatedDatabases.values());

    for (const allocation of allocations) {
      try {
        await this.dropDatabase(allocation.databaseName);
      } catch (error) {
        console.warn(`[DatabaseAllocator] Failed to drop database ${allocation.databaseName}:`, error);
      }
    }

    this.allocatedDatabases.clear();
    this.saveDatabaseCache();
    this.safeLog('[DatabaseAllocator] Cleared all database allocations');
  }

  /**
   * Safe logging that won't crash on EPIPE errors during parallel execution
   */
  private safeLog(message: string): void {
    try {
      console.log(message);
    } catch (error: any) {
      // Silently ignore ALL console/stdout errors during parallel execution
      // This includes EPIPE, ECONNRESET, broken pipes, and any write errors
      // Just return silently - parallel test execution causes these conflicts
      return;
    }
  }
}

/**
 * Global database allocator instance
 */
export const databaseAllocator = DatabaseAllocator.getInstance();