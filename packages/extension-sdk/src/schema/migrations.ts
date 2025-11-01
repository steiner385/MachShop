/**
 * Migration Manager - Handles database schema migrations with versioning
 * Issue #438: Database Schema Extension Framework
 */

import type {
  SchemaMigration,
  MigrationState,
  SchemaExtension,
  DataSafetyPolicy,
} from './types';

import { MigrationError } from './types';

/**
 * Migration manager for handling schema changes with versioning and rollback
 */
export class MigrationManager {
  private migrationStates = new Map<string, MigrationState>();
  private migrationHistory = new Map<string, SchemaMigration[]>();
  private listeners: Array<(event: MigrationEvent) => void> = [];

  /**
   * Create a new migration
   */
  createMigration(
    extensionId: string,
    version: string,
    type: 'create' | 'modify' | 'delete' | 'rename',
    tableName: string,
    changes: SchemaMigration['changes']
  ): SchemaMigration {
    const now = new Date();
    const id = `${extensionId}-${version}-${Date.now()}`;

    const migration: SchemaMigration = {
      id,
      extensionId,
      version,
      type,
      tableName,
      changes,
      createdAt: now,
      reversible: this.isReversible(type, changes),
    };

    return migration;
  }

  /**
   * Initialize migration state for an extension
   */
  initializeMigrationState(
    extensionId: string,
    initialVersion: string
  ): MigrationState {
    const state: MigrationState = {
      extensionId,
      currentVersion: initialVersion,
      appliedMigrations: [],
      pendingMigrations: [],
    };

    this.migrationStates.set(extensionId, state);
    this.migrationHistory.set(extensionId, []);

    return state;
  }

  /**
   * Get migration state for an extension
   */
  getMigrationState(extensionId: string): MigrationState | undefined {
    return this.migrationStates.get(extensionId);
  }

  /**
   * Register a pending migration
   */
  registerMigration(migration: SchemaMigration): void {
    const state = this.migrationStates.get(migration.extensionId);
    if (!state) {
      throw new MigrationError(
        `Migration state not initialized for extension: ${migration.extensionId}`,
        migration
      );
    }

    state.pendingMigrations.push(migration.id);

    this.emit({
      type: 'migration:registered',
      migration,
    });
  }

  /**
   * Apply a migration
   */
  async applyMigration(
    migration: SchemaMigration,
    dataSafetyPolicy?: DataSafetyPolicy
  ): Promise<void> {
    const state = this.migrationStates.get(migration.extensionId);
    if (!state) {
      throw new MigrationError(
        `Migration state not found for extension: ${migration.extensionId}`,
        migration
      );
    }

    try {
      // Check for destructive operations if safety policy requires approval
      if (
        dataSafetyPolicy?.requireApprovalForDestructive &&
        this.isDestructive(migration)
      ) {
        throw new MigrationError(
          `Destructive migration requires approval: ${migration.id}`,
          migration
        );
      }

      // Create backup if safety policy requires it
      if (dataSafetyPolicy?.backupBeforeMigration) {
        await this.createBackup(
          migration.extensionId,
          migration.tableName
        );
      }

      // Mark migration as applied
      migration.appliedAt = new Date();
      state.appliedMigrations.push(migration.id);

      // Remove from pending
      const pendingIndex = state.pendingMigrations.indexOf(migration.id);
      if (pendingIndex >= 0) {
        state.pendingMigrations.splice(pendingIndex, 1);
      }

      // Update current version
      state.currentVersion = migration.version;
      state.lastAppliedAt = new Date();

      // Store in history
      const history = this.migrationHistory.get(migration.extensionId) || [];
      history.push(migration);
      this.migrationHistory.set(migration.extensionId, history);

      this.emit({
        type: 'migration:applied',
        migration,
      });
    } catch (error) {
      this.emit({
        type: 'migration:failed',
        migration,
        error: error as Error,
      });

      throw error;
    }
  }

  /**
   * Rollback a migration
   */
  async rollbackMigration(
    migrationId: string
  ): Promise<void> {
    let targetMigration: SchemaMigration | undefined;
    let state: MigrationState | undefined;

    // Find the migration
    for (const [extensionId, history] of this.migrationHistory) {
      const found = history.find((m) => m.id === migrationId);
      if (found) {
        targetMigration = found;
        state = this.migrationStates.get(extensionId);
        break;
      }
    }

    if (!targetMigration || !state) {
      throw new MigrationError(
        `Migration not found: ${migrationId}`,
        { id: migrationId } as SchemaMigration
      );
    }

    if (!targetMigration.reversible) {
      throw new MigrationError(
        `Migration is not reversible: ${migrationId}`,
        targetMigration
      );
    }

    try {
      // Execute rollback script if available
      if (targetMigration.rollbackScript) {
        await this.executeRollbackScript(
          targetMigration.rollbackScript
        );
      }

      // Remove from applied migrations
      const appliedIndex = state.appliedMigrations.indexOf(migrationId);
      if (appliedIndex >= 0) {
        state.appliedMigrations.splice(appliedIndex, 1);
      }

      // Remove from history
      const history = this.migrationHistory.get(
        targetMigration.extensionId
      );
      if (history) {
        const historyIndex = history.findIndex((m) => m.id === migrationId);
        if (historyIndex >= 0) {
          history.splice(historyIndex, 1);
        }
      }

      // Update state
      if (state.appliedMigrations.length > 0) {
        const lastApplied = state.appliedMigrations[
          state.appliedMigrations.length - 1
        ];
        const history = this.migrationHistory.get(
          targetMigration.extensionId
        );
        const lastMigration = history?.find((m) => m.id === lastApplied);
        if (lastMigration) {
          state.currentVersion = lastMigration.version;
        }
      }

      this.emit({
        type: 'migration:rollback',
        migration: targetMigration,
      });
    } catch (error) {
      this.emit({
        type: 'migration:rollback:failed',
        migration: targetMigration,
        error: error as Error,
      });

      throw error;
    }
  }

  /**
   * Get migration history for an extension
   */
  getHistory(extensionId: string): SchemaMigration[] {
    return this.migrationHistory.get(extensionId) || [];
  }

  /**
   * Get pending migrations for an extension
   */
  getPendingMigrations(extensionId: string): SchemaMigration[] {
    const state = this.migrationStates.get(extensionId);
    if (!state) return [];

    const history = this.migrationHistory.get(extensionId) || [];
    return history.filter((m) =>
      state.pendingMigrations.includes(m.id)
    );
  }

  /**
   * Check if a migration is destructive
   */
  private isDestructive(migration: SchemaMigration): boolean {
    if (migration.type === 'delete') return true;

    for (const change of migration.changes) {
      if (change.operation === 'remove') return true;
    }

    return false;
  }

  /**
   * Check if a migration is reversible
   */
  private isReversible(
    type: 'create' | 'modify' | 'delete' | 'rename',
    changes: SchemaMigration['changes']
  ): boolean {
    if (type === 'delete') return false;

    // Check if all changes have old values for rollback
    if (type === 'modify') {
      for (const change of changes) {
        if (
          (change.operation === 'remove' || change.operation === 'modify') &&
          !change.oldValue
        ) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Create a backup (stub implementation)
   */
  private async createBackup(
    extensionId: string,
    tableName: string
  ): Promise<void> {
    const backupId = `backup-${extensionId}-${tableName}-${Date.now()}`;

    this.emit({
      type: 'backup:created',
      backupId,
      extensionId,
      tableName,
    });

    // In real implementation, would create actual database backup
    // For now, just emit event
  }

  /**
   * Execute a rollback script (stub implementation)
   */
  private async executeRollbackScript(script: string): Promise<void> {
    // In real implementation, would execute the script against the database
    // For now, just validate it exists
    if (!script || script.trim() === '') {
      throw new Error('Rollback script is empty');
    }
  }

  /**
   * Validate migration sequence
   */
  validateSequence(migrations: SchemaMigration[]): boolean {
    const seen = new Set<string>();

    for (const migration of migrations) {
      if (seen.has(migration.id)) {
        return false;
      }
      seen.add(migration.id);
    }

    return true;
  }

  /**
   * Listen to migration events
   */
  onEvent(listener: (event: MigrationEvent) => void): () => void {
    this.listeners.push(listener);

    return () => {
      const index = this.listeners.indexOf(listener);
      if (index >= 0) {
        this.listeners.splice(index, 1);
      }
    };
  }

  /**
   * Emit an event
   */
  private emit(event: MigrationEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Error in migration event listener:', e);
      }
    }
  }
}

/**
 * Migration event types
 */
export type MigrationEvent =
  | {
      type: 'migration:registered';
      migration: SchemaMigration;
    }
  | {
      type: 'migration:applied';
      migration: SchemaMigration;
    }
  | {
      type: 'migration:failed';
      migration: SchemaMigration;
      error: Error;
    }
  | {
      type: 'migration:rollback';
      migration: SchemaMigration;
    }
  | {
      type: 'migration:rollback:failed';
      migration: SchemaMigration;
      error: Error;
    }
  | {
      type: 'backup:created';
      backupId: string;
      extensionId: string;
      tableName: string;
    };

/**
 * Singleton instance
 */
export const migrationManager = new MigrationManager();
