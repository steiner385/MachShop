/**
 * Configuration Validator Service
 * Core service for per-site extension configuration management, validation, and compliance tracking
 */

import {
  SiteExtensionConfiguration,
  ComplianceSignoff,
  DetectedConflict,
  DependencyResolution,
  ValidationReport,
  PreActivationValidationRequest,
  ActivateExtensionRequest,
  DeactivateExtensionRequest,
  DeactivationResult,
  ConfigurationFilter,
  SignoffFilter,
  ConfigurationChangeEvent,
  SiteConfigurationStatus,
  ConfigurationWithSignoffStatus,
  SignoffRecord,
  ConfigurationAuditEntry,
} from './types';

/**
 * In-memory store for configurations (for testing and development)
 * In production, would be replaced with database store
 */
export interface ConfigurationStore {
  // Get/set configurations
  getConfiguration(siteId: string, extensionId: string): Promise<SiteExtensionConfiguration | undefined>;
  getConfigurationsForSite(siteId: string): Promise<SiteExtensionConfiguration[]>;
  saveConfiguration(config: SiteExtensionConfiguration): Promise<void>;
  deleteConfiguration(siteId: string, extensionId: string): Promise<void>;

  // Get/set compliance signoffs
  getSignoffs(siteId: string, extensionId: string): Promise<ComplianceSignoff[]>;
  addSignoff(signoff: ComplianceSignoff): Promise<void>;
  removeSignoff(siteId: string, extensionId: string, aspect: string): Promise<void>;

  // Audit trail
  addAuditEntry(entry: ConfigurationAuditEntry): Promise<void>;
  getAuditTrail(siteId: string, extensionId: string): Promise<ConfigurationAuditEntry[]>;
}

/**
 * In-memory implementation of ConfigurationStore
 */
export class InMemoryConfigurationStore implements ConfigurationStore {
  private configurations: Map<string, SiteExtensionConfiguration> = new Map();
  private signoffs: Map<string, ComplianceSignoff[]> = new Map();
  private auditLog: ConfigurationAuditEntry[] = [];

  private key(siteId: string, extensionId: string): string {
    return `${siteId}::${extensionId}`;
  }

  async getConfiguration(
    siteId: string,
    extensionId: string
  ): Promise<SiteExtensionConfiguration | undefined> {
    return this.configurations.get(this.key(siteId, extensionId));
  }

  async getConfigurationsForSite(siteId: string): Promise<SiteExtensionConfiguration[]> {
    return Array.from(this.configurations.values()).filter(c => c.siteId === siteId);
  }

  async saveConfiguration(config: SiteExtensionConfiguration): Promise<void> {
    this.configurations.set(this.key(config.siteId, config.extensionId), config);
  }

  async deleteConfiguration(siteId: string, extensionId: string): Promise<void> {
    this.configurations.delete(this.key(siteId, extensionId));
  }

  async getSignoffs(siteId: string, extensionId: string): Promise<ComplianceSignoff[]> {
    return this.signoffs.get(this.key(siteId, extensionId)) || [];
  }

  async addSignoff(signoff: ComplianceSignoff): Promise<void> {
    const key = this.key(signoff.siteId, signoff.extensionId);
    if (!this.signoffs.has(key)) {
      this.signoffs.set(key, []);
    }
    this.signoffs.get(key)!.push(signoff);
  }

  async removeSignoff(siteId: string, extensionId: string, aspect: string): Promise<void> {
    const key = this.key(siteId, extensionId);
    const signoffs = this.signoffs.get(key);
    if (signoffs) {
      const index = signoffs.findIndex(s => s.aspect === aspect);
      if (index >= 0) {
        signoffs.splice(index, 1);
      }
    }
  }

  async addAuditEntry(entry: ConfigurationAuditEntry): Promise<void> {
    this.auditLog.push(entry);
  }

  async getAuditTrail(siteId: string, extensionId: string): Promise<ConfigurationAuditEntry[]> {
    return this.auditLog.filter(e => e.siteId === siteId && e.extensionId === extensionId);
  }

  // Utility method for testing
  clear(): void {
    this.configurations.clear();
    this.signoffs.clear();
    this.auditLog = [];
  }
}

/**
 * Configuration Validator Service
 * Manages per-site extension configurations with dependency/conflict validation and compliance tracking
 */
export class ConfigurationValidator {
  private store: ConfigurationStore;

  constructor(store?: ConfigurationStore) {
    this.store = store || new InMemoryConfigurationStore();
  }

  /**
   * Validate configuration before activation
   * Checks: schema, dependencies, conflicts, compliance requirements
   */
  async validateBeforeActivation(
    request: PreActivationValidationRequest
  ): Promise<ValidationReport> {
    const errors: any[] = [];
    const warnings: any[] = [];
    const conflicts: DetectedConflict[] = [];

    // 1. Validate schema/configuration structure
    // In production, would use extended manifest validator
    if (!request.extensionId || typeof request.extensionId !== 'string') {
      errors.push({
        type: 'schema',
        message: 'Invalid extensionId',
      });
    }

    if (!request.version || typeof request.version !== 'string') {
      errors.push({
        type: 'schema',
        message: 'Invalid version',
      });
    }

    if (!request.configuration || typeof request.configuration !== 'object') {
      errors.push({
        type: 'schema',
        message: 'Invalid configuration object',
      });
    }

    // 2. Check for conflicts with currently enabled extensions
    const siteConfigs = await this.store.getConfigurationsForSite(request.siteId);
    for (const existing of siteConfigs) {
      // Simple conflict detection
      // In production, would use capabilityRegistry for policy-based conflicts
      if (!request.ignoreConflicts?.includes(existing.extensionId)) {
        // Check for explicit conflicts
        // This would be expanded with capability registry checks
        conflicts.push({
          type: 'explicit',
          extensionId1: request.extensionId,
          extensionId2: existing.extensionId,
          reason: `Configuration check between ${request.extensionId} and ${existing.extensionId}`,
          severity: 'warning',
        });
      }
    }

    // 3. Check dependencies
    // In production, would resolve against capability registry
    const dependencyResolution: DependencyResolution = {
      satisfied: true,
      missingDependencies: [],
      warnings: [],
    };

    // 4. Check compliance requirements
    const pendingSignoffs: { extensionId: string; aspects: string[] }[] = [];
    // This would be populated from extension manifest compliance.delegations

    return {
      siteId: request.siteId,
      extensionId: request.extensionId,
      valid: errors.length === 0,
      timestamp: new Date(),
      schemaErrors: errors,
      dependencyErrors: [],
      conflictErrors: conflicts.filter(c => c.severity === 'error'),
      complianceWarnings: [],
      detectedConflicts: conflicts,
      dependencyResolution,
      missingSignoffs: pendingSignoffs,
      recommendations: [],
    };
  }

  /**
   * Activate extension at site with compliance signoffs
   */
  async activateExtension(request: ActivateExtensionRequest): Promise<void> {
    // Generate configuration hash (SHA-256 in production)
    const configHash = this.hashConfiguration(request.configuration);

    // Create configuration record
    const config: SiteExtensionConfiguration = {
      siteId: request.siteId,
      extensionId: request.extensionId,
      version: request.version,
      enabledAt: new Date(),
      configurationHash: configHash,
      configuration: request.configuration,
      validated: true,
      validationErrors: undefined,
      detectedConflicts: undefined,
    };

    // Save configuration
    await this.store.saveConfiguration(config);

    // Record compliance signoffs
    for (const signoff of request.complianceSignoffs) {
      const record: ComplianceSignoff = {
        siteId: request.siteId,
        extensionId: request.extensionId,
        aspect: signoff.aspect,
        signedBy: signoff.signedBy,
        role: signoff.role,
        timestamp: new Date(),
        configurationHash: configHash,
        notes: signoff.notes,
      };
      await this.store.addSignoff(record);
    }

    // Record audit entry
    const auditEntry: ConfigurationAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      siteId: request.siteId,
      extensionId: request.extensionId,
      action: 'activated',
      changedBy: request.activatedBy,
      changedAt: new Date(),
      newConfigHash: configHash,
      reason: request.reason,
    };
    await this.store.addAuditEntry(auditEntry);
  }

  /**
   * Deactivate extension at site
   * Checks if other extensions depend on it
   */
  async deactivateExtension(
    request: DeactivateExtensionRequest
  ): Promise<DeactivationResult> {
    const config = await this.store.getConfiguration(
      request.siteId,
      request.extensionId
    );

    if (!config) {
      return {
        ok: false,
        message: `Extension ${request.extensionId} not found at site ${request.siteId}`,
      };
    }

    // Check for dependencies
    const siteConfigs = await this.store.getConfigurationsForSite(request.siteId);
    const dependents = siteConfigs.filter(c => {
      // Check if this config depends on the extension being deactivated
      // In production, would check manifest dependencies
      return false; // Simplified for now
    });

    if (dependents.length > 0) {
      return {
        ok: false,
        dependentExtensions: dependents.map(c => c.extensionId),
        message: `Cannot deactivate ${request.extensionId}: other extensions depend on it`,
      };
    }

    // Safe to deactivate
    await this.store.deleteConfiguration(request.siteId, request.extensionId);

    // Record audit entry
    const auditEntry: ConfigurationAuditEntry = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      siteId: request.siteId,
      extensionId: request.extensionId,
      action: 'deactivated',
      changedBy: request.deactivatedBy,
      changedAt: new Date(),
      oldConfigHash: config.configurationHash,
      reason: request.reason,
    };
    await this.store.addAuditEntry(auditEntry);

    return {
      ok: true,
      deactivated: true,
    };
  }

  /**
   * Get configuration with signoff status
   */
  async getConfigurationWithSignoffs(
    siteId: string,
    extensionId: string
  ): Promise<ConfigurationWithSignoffStatus | undefined> {
    const config = await this.store.getConfiguration(siteId, extensionId);
    if (!config) return undefined;

    const signoffs = await this.store.getSignoffs(siteId, extensionId);

    return {
      ...config,
      complianceSignoffs: signoffs.map(s => ({
        extensionId: s.extensionId,
        aspect: s.aspect,
        signedBy: s.signedBy,
        role: s.role,
        signedAt: s.timestamp,
        configurationHash: s.configurationHash,
        notes: s.notes,
      })),
      pendingSignoffs: [], // Would be populated from extension manifest
      isFullySigned: signoffs.length > 0, // Simplified check
    };
  }

  /**
   * Get site-wide configuration status
   */
  async getSiteConfigurationStatus(siteId: string): Promise<SiteConfigurationStatus> {
    const configs = await this.store.getConfigurationsForSite(siteId);

    const validConfigs = configs.filter(c => c.validated && !c.validationErrors);
    const invalidConfigs = configs.filter(c => !c.validated || c.validationErrors);
    const conflictingConfigs = configs.filter(c => c.detectedConflicts?.length);

    return {
      siteId,
      totalExtensions: configs.length,
      validConfigurations: validConfigs.length,
      invalidConfigurations: invalidConfigs.length,
      conflictingConfigurations: conflictingConfigs.length,
      unsignedCompliance: [], // Would check signoff completeness
      lastValidatedAt: new Date(),
      requiresAttention: invalidConfigs.length > 0 || conflictingConfigs.length > 0,
    };
  }

  /**
   * Find configurations with issues
   */
  async findInvalidConfigurations(): Promise<
    Array<{ siteId: string; configuration: SiteExtensionConfiguration }>
  > {
    // In production, would query database
    // This is a placeholder
    return [];
  }

  /**
   * Find unsigned compliance requirements
   */
  async findUnsignedCompliance(
    filter: Partial<{ extensionId: string; aspect: string; siteId: string }>
  ): Promise<Array<{ siteId: string; extensionId: string; aspects: string[] }>> {
    // In production, would query database with proper filtering
    // This is a placeholder
    return [];
  }

  /**
   * Query configurations by filter
   */
  async queryConfigurations(
    filter: ConfigurationFilter
  ): Promise<SiteExtensionConfiguration[]> {
    // In production, would use proper database queries
    if (filter.siteId) {
      return this.store.getConfigurationsForSite(filter.siteId);
    }
    return [];
  }

  /**
   * Query signoffs by filter
   */
  async querySignoffs(filter: SignoffFilter): Promise<ComplianceSignoff[]> {
    // In production, would use proper database queries
    if (filter.siteId && filter.extensionId) {
      return this.store.getSignoffs(filter.siteId, filter.extensionId);
    }
    return [];
  }

  /**
   * Generate audit report for compliance
   */
  async generateComplianceReport(
    siteId: string,
    fromDate?: Date,
    toDate?: Date
  ): Promise<{ entries: ConfigurationAuditEntry[]; summary: string }> {
    // In production, would query and format audit log
    return {
      entries: [],
      summary: `Compliance report for site ${siteId}`,
    };
  }

  /**
   * Simple configuration hash function
   * In production, would use crypto.createHash('sha256')
   */
  private hashConfiguration(config: Record<string, any>): string {
    const json = JSON.stringify(config, Object.keys(config).sort());
    // Simple hash for demo - use crypto in production
    let hash = 0;
    for (let i = 0; i < json.length; i++) {
      const char = json.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return `hash-${Math.abs(hash).toString(16)}`;
  }
}

/**
 * Default global validator instance
 */
export const configurationValidator = new ConfigurationValidator();

/**
 * Create validator with custom store
 */
export function createValidator(store: ConfigurationStore): ConfigurationValidator {
  return new ConfigurationValidator(store);
}
