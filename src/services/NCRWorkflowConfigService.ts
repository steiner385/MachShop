/**
 * ✅ GITHUB ISSUE #55: Enhanced NCR Workflow States & Disposition Management
 * NCR Workflow Configuration Service - Phase 1-2
 *
 * Manages site-specific and severity-level-specific workflow configurations
 * Controls allowed state transitions, disposition options, and approval requirements
 */

import { NCRWorkflowConfig, NCRStatus, NCRSeverity, NCRDisposition } from '@/types/quality';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Default workflow configuration for all sites and severities
 * Provides sensible defaults for basic NCR workflows
 */
const DEFAULT_WORKFLOW_CONFIG: Omit<NCRWorkflowConfig, 'id' | 'siteId' | 'severityLevel' | 'createdAt' | 'updatedAt'> = {
  // Basic state transitions for all NCRs
  allowedStateTransitions: [
    { from: NCRStatus.DRAFT, to: [NCRStatus.SUBMITTED, NCRStatus.CANCELLED] },
    { from: NCRStatus.SUBMITTED, to: [NCRStatus.UNDER_INVESTIGATION, NCRStatus.CANCELLED] },
    { from: NCRStatus.UNDER_INVESTIGATION, to: [NCRStatus.CONTAINMENT, NCRStatus.PENDING_DISPOSITION, NCRStatus.CANCELLED] },
    { from: NCRStatus.CONTAINMENT, to: [NCRStatus.PENDING_DISPOSITION, NCRStatus.CANCELLED] },
    { from: NCRStatus.PENDING_DISPOSITION, to: [NCRStatus.CTP, NCRStatus.DDR, NCRStatus.MRB, NCRStatus.CORRECTIVE_ACTION, NCRStatus.CANCELLED] },
    { from: NCRStatus.CTP, to: [NCRStatus.VERIFICATION, NCRStatus.CANCELLED] },
    { from: NCRStatus.DDR, to: [NCRStatus.PENDING_DISPOSITION, NCRStatus.CANCELLED] },
    { from: NCRStatus.MRB, to: [NCRStatus.CORRECTIVE_ACTION, NCRStatus.CANCELLED] },
    { from: NCRStatus.CORRECTIVE_ACTION, to: [NCRStatus.VERIFICATION, NCRStatus.CANCELLED] },
    { from: NCRStatus.VERIFICATION, to: [NCRStatus.CLOSED, NCRStatus.CANCELLED] },
    // Legacy support
    { from: NCRStatus.OPEN, to: [NCRStatus.UNDER_REVIEW, NCRStatus.CLOSED, NCRStatus.CANCELLED] },
    { from: NCRStatus.UNDER_REVIEW, to: [NCRStatus.DISPOSITION_SET, NCRStatus.CLOSED, NCRStatus.CANCELLED] },
    { from: NCRStatus.DISPOSITION_SET, to: [NCRStatus.CLOSED, NCRStatus.CANCELLED] },
  ],

  // Dispositions allowed in each state
  dispositionsByState: [
    { status: NCRStatus.PENDING_DISPOSITION, allowedDispositions: [NCRDisposition.REWORK, NCRDisposition.REPAIR, NCRDisposition.SCRAP, NCRDisposition.USE_AS_IS, NCRDisposition.RETURN_TO_SUPPLIER, NCRDisposition.SORT_AND_SEGREGATE, NCRDisposition.RETURN_TO_STOCK, NCRDisposition.ENGINEER_USE_ONLY] },
    { status: NCRStatus.CTP, allowedDispositions: [NCRDisposition.REWORK, NCRDisposition.REPAIR, NCRDisposition.SCRAP, NCRDisposition.USE_AS_IS, NCRDisposition.RETURN_TO_SUPPLIER, NCRDisposition.SORT_AND_SEGREGATE, NCRDisposition.RETURN_TO_STOCK, NCRDisposition.ENGINEER_USE_ONLY] },
    { status: NCRStatus.DDR, allowedDispositions: [NCRDisposition.REWORK, NCRDisposition.REPAIR, NCRDisposition.SCRAP, NCRDisposition.USE_AS_IS, NCRDisposition.RETURN_TO_SUPPLIER, NCRDisposition.SORT_AND_SEGREGATE, NCRDisposition.RETURN_TO_STOCK, NCRDisposition.ENGINEER_USE_ONLY] },
    { status: NCRStatus.MRB, allowedDispositions: [NCRDisposition.REWORK, NCRDisposition.REPAIR, NCRDisposition.SCRAP, NCRDisposition.USE_AS_IS, NCRDisposition.RETURN_TO_SUPPLIER, NCRDisposition.SORT_AND_SEGREGATE, NCRDisposition.RETURN_TO_STOCK, NCRDisposition.ENGINEER_USE_ONLY] },
  ],

  // Default approvals: single approver for all types
  requiredApprovalsForDisposition: [
    { severity: NCRSeverity.MINOR, disposition: NCRDisposition.REWORK, approverRoles: ['QUALITY_MANAGER'], approvalCount: 1 },
    { severity: NCRSeverity.MINOR, disposition: NCRDisposition.USE_AS_IS, approverRoles: ['QUALITY_MANAGER'], approvalCount: 1 },
    { severity: NCRSeverity.MAJOR, disposition: NCRDisposition.REWORK, approverRoles: ['QUALITY_MANAGER'], approvalCount: 1 },
    { severity: NCRSeverity.MAJOR, disposition: NCRDisposition.USE_AS_IS, approverRoles: ['QUALITY_MANAGER'], approvalCount: 1 },
    { severity: NCRSeverity.CRITICAL, disposition: NCRDisposition.REWORK, approverRoles: ['QUALITY_MANAGER', 'ENGINEERING_MANAGER'], approvalCount: 2 },
    { severity: NCRSeverity.CRITICAL, disposition: NCRDisposition.USE_AS_IS, approverRoles: ['QUALITY_MANAGER', 'ENGINEERING_MANAGER'], approvalCount: 2 },
  ],

  ctpExpirationDays: 30,
  ddrMaxDays: 15,
  mrbScheduleBuffer: 2,
};

/**
 * Severity-specific overrides for CRITICAL NCRs
 */
const CRITICAL_SEVERITY_OVERRIDES: Partial<NCRWorkflowConfig> = {
  requiredApprovalsForDisposition: [
    { severity: NCRSeverity.CRITICAL, disposition: NCRDisposition.REWORK, approverRoles: ['QUALITY_MANAGER', 'ENGINEERING_MANAGER'], approvalCount: 2 },
    { severity: NCRSeverity.CRITICAL, disposition: NCRDisposition.USE_AS_IS, approverRoles: ['QUALITY_MANAGER', 'ENGINEERING_MANAGER', 'COMPLIANCE_MANAGER'], approvalCount: 3 },
    { severity: NCRSeverity.CRITICAL, disposition: NCRDisposition.SCRAP, approverRoles: ['QUALITY_MANAGER', 'FINANCE_MANAGER'], approvalCount: 2 },
  ],
  ctpExpirationDays: 14,  // Shorter CTP window for critical
};

/**
 * NCRWorkflowConfigService
 * Manages site-specific workflow configurations with caching
 */
export class NCRWorkflowConfigService {
  // Configuration cache with TTL (1 hour = 3600000ms)
  private configCache: Map<string, { config: NCRWorkflowConfig; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 3600000; // 1 hour

  constructor(private prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get configuration key for caching
   */
  private getConfigKey(siteId: string, severity: NCRSeverity): string {
    return `${siteId}:${severity}`;
  }

  /**
   * Clear cache for a specific configuration
   */
  private invalidateCache(siteId: string, severity: NCRSeverity): void {
    const key = this.getConfigKey(siteId, severity);
    this.configCache.delete(key);
  }

  /**
   * Clear all cached configurations
   */
  clearCache(): void {
    this.configCache.clear();
  }

  /**
   * Get configuration by site and severity
   * Uses cache when available, falls back to database, then defaults
   */
  async getConfigBySiteAndSeverity(siteId: string, severity: NCRSeverity): Promise<NCRWorkflowConfig> {
    const key = this.getConfigKey(siteId, severity);

    // Check cache
    const cached = this.configCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.config;
    }

    // Try to fetch from database
    let config = await this.prisma?.nCRWorkflowConfig.findUnique({
      where: { siteId_severityLevel: { siteId, severityLevel: severity } },
    });

    // Use default configuration if not found
    if (!config) {
      config = {
        id: uuidv4(),
        siteId,
        severityLevel: severity,
        ...DEFAULT_WORKFLOW_CONFIG,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Apply severity-specific overrides
      if (severity === NCRSeverity.CRITICAL) {
        config.ctpExpirationDays = CRITICAL_SEVERITY_OVERRIDES.ctpExpirationDays || DEFAULT_WORKFLOW_CONFIG.ctpExpirationDays;
        config.requiredApprovalsForDisposition = CRITICAL_SEVERITY_OVERRIDES.requiredApprovalsForDisposition || DEFAULT_WORKFLOW_CONFIG.requiredApprovalsForDisposition;
      }
    }

    // Cache the result
    this.configCache.set(key, { config, timestamp: Date.now() });

    return config;
  }

  /**
   * Create or update configuration
   */
  async createOrUpdateConfig(config: NCRWorkflowConfig): Promise<NCRWorkflowConfig> {
    // Validate the configuration
    this.validateConfiguration(config);

    // Upsert to database
    const result = await this.prisma?.nCRWorkflowConfig.upsert({
      where: {
        siteId_severityLevel: {
          siteId: config.siteId,
          severityLevel: config.severityLevel,
        },
      },
      update: {
        allowedStateTransitions: config.allowedStateTransitions,
        dispositionsByState: config.dispositionsByState,
        requiredApprovalsForDisposition: config.requiredApprovalsForDisposition,
        ctpExpirationDays: config.ctpExpirationDays,
        ddrMaxDays: config.ddrMaxDays,
        mrbScheduleBuffer: config.mrbScheduleBuffer,
        updatedAt: new Date(),
      },
      create: {
        id: uuidv4(),
        siteId: config.siteId,
        severityLevel: config.severityLevel,
        allowedStateTransitions: config.allowedStateTransitions,
        dispositionsByState: config.dispositionsByState,
        requiredApprovalsForDisposition: config.requiredApprovalsForDisposition,
        ctpExpirationDays: config.ctpExpirationDays,
        ddrMaxDays: config.ddrMaxDays,
        mrbScheduleBuffer: config.mrbScheduleBuffer,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Invalidate cache
    this.invalidateCache(config.siteId, config.severityLevel);

    return result!;
  }

  /**
   * Check if a state transition is allowed
   */
  async isTransitionAllowed(siteId: string, severity: NCRSeverity, from: NCRStatus, to: NCRStatus): Promise<boolean> {
    const config = await this.getConfigBySiteAndSeverity(siteId, severity);

    const transition = config.allowedStateTransitions.find(t => t.from === from);
    if (!transition) {
      return false;
    }

    return transition.to.includes(to);
  }

  /**
   * Check if a disposition is allowed in a given state
   */
  async isDispositionAllowedInState(siteId: string, status: NCRStatus, disposition: NCRDisposition): Promise<boolean> {
    // Get config for MINOR severity as a base (most permissive)
    const config = await this.getConfigBySiteAndSeverity(siteId, NCRSeverity.MINOR);

    const dispositionRule = config.dispositionsByState.find(d => d.status === status);
    if (!dispositionRule) {
      return false;
    }

    return dispositionRule.allowedDispositions.includes(disposition);
  }

  /**
   * Get required approvers for a disposition
   */
  async getRequiredApproversForDisposition(
    siteId: string,
    severity: NCRSeverity,
    disposition: NCRDisposition
  ): Promise<{ roles: string[]; count: number }> {
    const config = await this.getConfigBySiteAndSeverity(siteId, severity);

    const approval = config.requiredApprovalsForDisposition.find(
      a => a.severity === severity && a.disposition === disposition
    );

    if (!approval) {
      // Default to single QUALITY_MANAGER approval
      return { roles: ['QUALITY_MANAGER'], count: 1 };
    }

    return { roles: approval.approverRoles, count: approval.approvalCount };
  }

  /**
   * Get all valid next states for a given current state
   */
  async getValidNextStates(siteId: string, severity: NCRSeverity, currentStatus: NCRStatus): Promise<NCRStatus[]> {
    const config = await this.getConfigBySiteAndSeverity(siteId, severity);

    const transition = config.allowedStateTransitions.find(t => t.from === currentStatus);
    return transition ? transition.to : [];
  }

  /**
   * Get all valid dispositions for a given state
   */
  async getValidDispositionsForState(siteId: string, status: NCRStatus): Promise<NCRDisposition[]> {
    const config = await this.getConfigBySiteAndSeverity(siteId, NCRSeverity.MINOR);

    const dispositionRule = config.dispositionsByState.find(d => d.status === status);
    return dispositionRule ? dispositionRule.allowedDispositions : [];
  }

  /**
   * Validate workflow configuration
   */
  private validateConfiguration(config: NCRWorkflowConfig): void {
    // Validate state transitions reference valid states
    for (const transition of config.allowedStateTransitions) {
      if (!Object.values(NCRStatus).includes(transition.from)) {
        throw new Error(`Invalid 'from' state: ${transition.from}`);
      }
      for (const toState of transition.to) {
        if (!Object.values(NCRStatus).includes(toState)) {
          throw new Error(`Invalid 'to' state: ${toState}`);
        }
      }
    }

    // Validate disposition rules reference valid states and dispositions
    for (const rule of config.dispositionsByState) {
      if (!Object.values(NCRStatus).includes(rule.status)) {
        throw new Error(`Invalid disposition state: ${rule.status}`);
      }
      for (const disposition of rule.allowedDispositions) {
        if (!Object.values(NCRDisposition).includes(disposition)) {
          throw new Error(`Invalid disposition: ${disposition}`);
        }
      }
    }

    // Validate approval configurations
    for (const approval of config.requiredApprovalsForDisposition) {
      if (!Object.values(NCRSeverity).includes(approval.severity)) {
        throw new Error(`Invalid severity: ${approval.severity}`);
      }
      if (!Object.values(NCRDisposition).includes(approval.disposition)) {
        throw new Error(`Invalid disposition: ${approval.disposition}`);
      }
      if (approval.approvalCount < 1) {
        throw new Error(`Approval count must be at least 1`);
      }
      if (approval.approverRoles.length === 0) {
        throw new Error(`At least one approver role is required`);
      }
    }

    // Validate numeric fields
    if (config.ctpExpirationDays < 1) {
      throw new Error(`CTP expiration days must be at least 1`);
    }
    if (config.ddrMaxDays < 1) {
      throw new Error(`DDR max days must be at least 1`);
    }
  }

  /**
   * Get default workflow configuration for a site/severity
   * Useful for initializing new sites
   */
  getDefaultConfigForSite(siteId: string, severity: NCRSeverity): NCRWorkflowConfig {
    return {
      id: uuidv4(),
      siteId,
      severityLevel: severity,
      ...DEFAULT_WORKFLOW_CONFIG,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  /**
   * Migrate legacy NCR states to new workflow
   * Maps old states to new states for backward compatibility
   */
  migrateOldStatus(oldStatus: string): NCRStatus {
    const migrations: Record<string, NCRStatus> = {
      'OPEN': NCRStatus.SUBMITTED,
      'UNDER_REVIEW': NCRStatus.UNDER_INVESTIGATION,
      'DISPOSITION_SET': NCRStatus.CORRECTIVE_ACTION,
      'CLOSED': NCRStatus.CLOSED,
    };

    return migrations[oldStatus] || (oldStatus as NCRStatus);
  }

  /**
   * Close connection to database
   */
  async disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
    }
  }
}

// Export singleton instance for convenience
let configServiceInstance: NCRWorkflowConfigService | null = null;

export function getNCRWorkflowConfigService(prisma?: PrismaClient): NCRWorkflowConfigService {
  if (!configServiceInstance) {
    configServiceInstance = new NCRWorkflowConfigService(prisma);
  }
  return configServiceInstance;
}
