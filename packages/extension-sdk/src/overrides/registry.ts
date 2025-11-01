/**
 * Component Override Registry
 * Issue #428: Component Override Safety System with Fallback & Approval
 */

import { randomUUID } from 'crypto';
import type {
  ComponentOverrideDeclaration,
  ComponentOverride,
  OverrideQueryOptions,
  OverrideEvent,
  IOverrideRegistry,
  RolloutInfo,
  ApprovalRequest,
} from './types';
import {
  OverrideStatus,
  RolloutStatus,
  RolloutPhase,
  OverrideNotFoundError,
  OverrideValidationError,
  ApprovalRequiredError,
} from './types';

/**
 * Component Override Registry - Manages component overrides with fallback and approval
 */
export class OverrideRegistry implements IOverrideRegistry {
  private overrides: Map<string, ComponentOverride> = new Map();
  private overridesByComponent: Map<string, Set<string>> = new Map();
  private overridesBySite: Map<string, Set<string>> = new Map();
  private approvalRequests: Map<string, ApprovalRequest> = new Map();
  private listeners: Set<(event: OverrideEvent) => void> = new Set();

  /**
   * Register a component override
   */
  async registerOverride(declaration: ComponentOverrideDeclaration): Promise<ComponentOverride> {
    const id = declaration.id || `override-${randomUUID()}`;

    // Create override with status PENDING_APPROVAL if requires approval
    const override: ComponentOverride = {
      ...declaration,
      id,
      status: declaration.requiresApproval ? OverrideStatus.PENDING_APPROVAL : OverrideStatus.APPROVED,
      registeredAt: new Date(),
    };

    this.overrides.set(id, override);

    // Index by component
    if (!this.overridesByComponent.has(declaration.overridesComponentId)) {
      this.overridesByComponent.set(declaration.overridesComponentId, new Set());
    }
    this.overridesByComponent.get(declaration.overridesComponentId)!.add(id);

    // Index by sites
    if (declaration.scopedToSites) {
      for (const siteId of declaration.scopedToSites) {
        if (!this.overridesBySite.has(siteId)) {
          this.overridesBySite.set(siteId, new Set());
        }
        this.overridesBySite.get(siteId)!.add(id);
      }
    }

    // Create approval request if needed
    if (declaration.requiresApproval) {
      const approvalRequest: ApprovalRequest = {
        overrideId: id,
        componentId: declaration.overridesComponentId,
        extensionId: declaration.extensionId,
        justification: declaration.reason,
        testReportUrl: declaration.testingReport,
        riskLevel: declaration.breaking ? 'high' : 'medium',
        requestedAt: new Date(),
        status: 'pending',
      };
      this.approvalRequests.set(id, approvalRequest);
    } else {
      // Auto-activate if no approval needed
      override.status = OverrideStatus.ACTIVE;
      override.activatedAt = new Date();
    }

    this.emitEvent({
      type: 'registered',
      overrideId: id,
      componentId: declaration.overridesComponentId,
      extensionId: declaration.extensionId,
      timestamp: new Date(),
    });

    return override;
  }

  /**
   * Unregister an override
   */
  async unregisterOverride(overrideId: string): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    this.overrides.delete(overrideId);

    // Remove from component index
    this.overridesByComponent.get(override.overridesComponentId)?.delete(overrideId);

    // Remove from site indices
    if (override.scopedToSites) {
      for (const siteId of override.scopedToSites) {
        this.overridesBySite.get(siteId)?.delete(overrideId);
      }
    }

    // Remove approval request if exists
    this.approvalRequests.delete(overrideId);

    this.emitEvent({
      type: 'deactivated',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      timestamp: new Date(),
    });
  }

  /**
   * Get override by ID
   */
  getOverride(overrideId: string): ComponentOverride | undefined {
    return this.overrides.get(overrideId);
  }

  /**
   * Get all overrides for a component
   */
  getOverridesForComponent(componentId: string): ComponentOverride[] {
    const overrideIds = this.overridesByComponent.get(componentId);
    if (!overrideIds) {
      return [];
    }

    return Array.from(overrideIds)
      .map(id => this.overrides.get(id))
      .filter((override): override is ComponentOverride => !!override);
  }

  /**
   * Get active override for component at site
   */
  getActiveOverride(componentId: string, siteId?: string): ComponentOverride | undefined {
    const overrides = this.getOverridesForComponent(componentId);

    // Filter by active status
    const activeOverrides = overrides.filter(o => o.status === OverrideStatus.ACTIVE);

    if (!activeOverrides.length) {
      return undefined;
    }

    // If site specified, prioritize site-scoped overrides
    if (siteId) {
      const siteScoped = activeOverrides.find(
        o => o.scopedToSites && o.scopedToSites.includes(siteId)
      );
      if (siteScoped) {
        return siteScoped;
      }

      // Fall back to global override (no site scope)
      const global = activeOverrides.find(o => !o.scopedToSites || o.scopedToSites.length === 0);
      if (global) {
        return global;
      }

      // Return first active override
      return activeOverrides[0];
    }

    // Return first active override
    return activeOverrides[0];
  }

  /**
   * Activate an override
   */
  async activateOverride(overrideId: string): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    override.status = OverrideStatus.ACTIVE;
    override.activatedAt = new Date();

    // Remove approval request
    this.approvalRequests.delete(overrideId);

    this.emitEvent({
      type: 'activated',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      timestamp: new Date(),
    });
  }

  /**
   * Deactivate an override
   */
  async deactivateOverride(overrideId: string): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    override.status = OverrideStatus.PAUSED;

    this.emitEvent({
      type: 'deactivated',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      timestamp: new Date(),
    });
  }

  /**
   * Approve an override
   */
  async approveOverride(overrideId: string, approvedBy: string, comment?: string): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    override.status = OverrideStatus.APPROVED;
    override.approval = {
      approvedBy,
      approvedAt: new Date(),
      approvalComment: comment,
    };

    // Update approval request
    const request = this.approvalRequests.get(overrideId);
    if (request) {
      request.status = 'approved';
      request.approval = {
        approvedBy,
        approvedAt: new Date(),
        comment,
      };
    }

    this.emitEvent({
      type: 'approved',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      timestamp: new Date(),
    });
  }

  /**
   * Reject an override
   */
  async rejectOverride(overrideId: string, rejectedBy: string, reason: string): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    override.status = OverrideStatus.FAILED;

    // Update approval request
    const request = this.approvalRequests.get(overrideId);
    if (request) {
      request.status = 'rejected';
      request.rejection = {
        rejectedBy,
        rejectedAt: new Date(),
        reason,
      };
    }

    this.emitEvent({
      type: 'rejected',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      timestamp: new Date(),
    });
  }

  /**
   * Get rollout status
   */
  getRolloutStatus(overrideId: string): RolloutInfo | undefined {
    const override = this.overrides.get(overrideId);
    return override?.rollout;
  }

  /**
   * Initiate rollout for override
   */
  async initiateRollout(
    overrideId: string,
    initialSite: string
  ): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    override.rollout = {
      status: RolloutStatus.IN_PROGRESS,
      phase: RolloutPhase.SINGLE_SITE,
      deployedSites: [initialSite],
      startedAt: new Date(),
      nextPhaseScheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    };

    this.emitEvent({
      type: 'activated',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      details: { rolloutPhase: RolloutPhase.SINGLE_SITE, initialSite },
      timestamp: new Date(),
    });
  }

  /**
   * Advance rollout to next phase
   */
  async advanceRollout(overrideId: string, sites: string[]): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override || !override.rollout) {
      throw new OverrideNotFoundError(overrideId);
    }

    const rollout = override.rollout;

    // Advance phase
    if (rollout.phase === RolloutPhase.SINGLE_SITE) {
      rollout.phase = RolloutPhase.REGIONAL;
    } else if (rollout.phase === RolloutPhase.REGIONAL) {
      rollout.phase = RolloutPhase.GLOBAL;
      rollout.status = RolloutStatus.COMPLETED;
      rollout.completedAt = new Date();
    }

    rollout.deployedSites = [...new Set([...rollout.deployedSites, ...sites])];

    if (rollout.phase !== RolloutPhase.GLOBAL) {
      rollout.nextPhaseScheduledAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    this.emitEvent({
      type: 'activated',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      details: { rolloutPhase: rollout.phase, deployedSites: sites },
      timestamp: new Date(),
    });
  }

  /**
   * Rollback override
   */
  async rollback(overrideId: string, reason: string, initiatedBy: string): Promise<void> {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    override.status = OverrideStatus.ROLLED_BACK;

    if (override.rollout) {
      override.rollout.status = RolloutStatus.ROLLED_BACK;
      override.rollout.rollback = {
        rolledBackAt: new Date(),
        reason,
        initiatedBy,
      };
    }

    this.emitEvent({
      type: 'rolled_back',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      details: { reason, initiatedBy },
      timestamp: new Date(),
    });
  }

  /**
   * Update override metrics
   */
  updateMetrics(overrideId: string, metrics: any): void {
    const override = this.overrides.get(overrideId);
    if (!override) {
      throw new OverrideNotFoundError(overrideId);
    }

    override.metrics = {
      ...override.metrics,
      ...metrics,
      lastUpdated: new Date(),
    };

    this.emitEvent({
      type: 'metrics_updated',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      details: metrics,
      timestamp: new Date(),
    });
  }

  /**
   * Add error to override
   */
  recordError(overrideId: string, error: any): void {
    const override = this.overrides.get(overrideId);
    if (!override) {
      return;
    }

    if (!override.errors) {
      override.errors = [];
    }

    override.errors.push({
      timestamp: new Date(),
      message: error.message || String(error),
      code: error.code || 'UNKNOWN',
      details: error.details,
      stack: error.stack,
    });

    // Update error count in metrics
    if (override.metrics) {
      override.metrics.errorCount = (override.metrics.errorCount || 0) + 1;
      override.metrics.errorRate = override.metrics.errorCount / Math.max(1, override.metrics.renderCount || 1);
    }

    this.emitEvent({
      type: 'failed',
      overrideId,
      componentId: override.overridesComponentId,
      extensionId: override.extensionId,
      details: { error: error.message },
      timestamp: new Date(),
    });
  }

  /**
   * Query overrides
   */
  queryOverrides(options: OverrideQueryOptions): ComponentOverride[] {
    let results = Array.from(this.overrides.values());

    if (options.componentId) {
      results = results.filter(o => o.overridesComponentId === options.componentId);
    }

    if (options.extensionId) {
      results = results.filter(o => o.extensionId === options.extensionId);
    }

    if (options.status) {
      results = results.filter(o => o.status === options.status);
    }

    if (options.siteId) {
      results = results.filter(
        o => !o.scopedToSites || o.scopedToSites.length === 0 || o.scopedToSites.includes(options.siteId!)
      );
    }

    if (!options.includeInactive) {
      results = results.filter(
        o => o.status === OverrideStatus.ACTIVE || o.status === OverrideStatus.APPROVED
      );
    }

    return results;
  }

  /**
   * Get pending approval requests
   */
  getPendingRequests(): ApprovalRequest[] {
    return Array.from(this.approvalRequests.values()).filter(r => r.status === 'pending');
  }

  /**
   * Listen to override events
   */
  onOverrideEvent(listener: (event: OverrideEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Emit override event
   */
  private emitEvent(event: OverrideEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }
}

/**
 * Singleton instance
 */
let overrideRegistry: OverrideRegistry | null = null;

/**
 * Get or create singleton instance
 */
export function getOverrideRegistry(): OverrideRegistry {
  if (!overrideRegistry) {
    overrideRegistry = new OverrideRegistry();
  }
  return overrideRegistry;
}
