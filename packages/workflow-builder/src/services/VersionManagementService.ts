/**
 * Version Management Service
 * Manages workflow versions with tracking, comparison, and promotion capabilities
 */

import { Workflow } from '../types/workflow';

/**
 * Version status
 */
export type VersionStatus = 'draft' | 'published' | 'active' | 'deprecated' | 'archived';

/**
 * Version metadata
 */
export interface VersionMetadata {
  id: string;
  workflowId: string;
  version: string; // semantic versioning: major.minor.patch
  status: VersionStatus;
  description?: string;
  changelog?: string;
  author: string;
  createdAt: number;
  publishedAt?: number;
  deprecatedAt?: number;
  archivedAt?: number;
  tags?: string[];
  parentVersionId?: string;
  compatibility?: {
    minApiVersion?: string;
    maxApiVersion?: string;
    requiredFeatures?: string[];
  };
  metrics?: {
    nodeCount: number;
    executionCount?: number;
    successRate?: number;
    averageExecutionTime?: number;
  };
}

/**
 * Version snapshot
 */
export interface VersionSnapshot {
  id: string;
  versionId: string;
  workflow: any; // Full workflow definition
  nodeDefinitions: Record<string, any>;
  variables: Record<string, any>;
  configuration: Record<string, any>;
  timestamp: number;
}

/**
 * Version difference
 */
export interface VersionDifference {
  versionIdA: string;
  versionIdB: string;
  differences: Array<{
    type: 'node_added' | 'node_removed' | 'node_modified' | 'config_changed' | 'variable_changed';
    path: string;
    oldValue?: any;
    newValue?: any;
  }>;
}

/**
 * Version comparison result
 */
export interface VersionComparison {
  versionA: VersionMetadata;
  versionB: VersionMetadata;
  isDifferent: boolean;
  changeCount: number;
  changes: VersionDifference['differences'];
  compatibility: 'compatible' | 'breaking' | 'requires_migration';
}

/**
 * Rollout version link
 */
export interface RolloutVersionLink {
  rolloutId: string;
  versionId: string;
  linkedAt: number;
  linkedBy: string;
  status: 'in_progress' | 'completed' | 'failed' | 'rolled_back';
  result?: Record<string, any>;
}

/**
 * Version promotion record
 */
export interface VersionPromotion {
  id: string;
  fromVersionId: string;
  toVersionId: string;
  fromStatus: VersionStatus;
  toStatus: VersionStatus;
  promotedBy: string;
  promotedAt: number;
  reason?: string;
  approval?: {
    approverId: string;
    approvedAt: number;
  };
}

/**
 * Version Management Service
 */
export class VersionManagementService {
  private versions: Map<string, VersionMetadata> = new Map();
  private snapshots: Map<string, VersionSnapshot> = new Map();
  private rolloutLinks: Map<string, RolloutVersionLink[]> = new Map();
  private promotionHistory: VersionPromotion[] = [];
  private versionHistory: Map<string, string[]> = new Map(); // workflowId -> versionIds
  private maxHistorySize = 5000;

  /**
   * Create new version
   */
  createVersion(config: {
    workflowId: string;
    workflow: any;
    description?: string;
    author: string;
    parentVersionId?: string;
    tags?: string[];
  }): VersionMetadata {
    try {
      const existingVersions = this.versionHistory.get(config.workflowId) || [];
      const nextPatch = existingVersions.length + 1;
      const version = `1.0.${nextPatch}`;

      const versionId = `version-${config.workflowId}-${Date.now()}`;
      const metadata: VersionMetadata = {
        id: versionId,
        workflowId: config.workflowId,
        version,
        status: 'draft',
        description: config.description,
        author: config.author,
        createdAt: Date.now(),
        tags: config.tags,
        parentVersionId: config.parentVersionId,
        metrics: {
          nodeCount: config.workflow.nodes?.length || 0,
        },
      };

      this.versions.set(versionId, metadata);

      // Create snapshot
      const snapshot: VersionSnapshot = {
        id: `snapshot-${versionId}`,
        versionId,
        workflow: JSON.parse(JSON.stringify(config.workflow)), // Deep copy
        nodeDefinitions: config.workflow.nodeDefinitions || {},
        variables: config.workflow.variables || {},
        configuration: config.workflow.configuration || {},
        timestamp: Date.now(),
      };

      this.snapshots.set(versionId, snapshot);

      // Add to history
      existingVersions.push(versionId);
      this.versionHistory.set(config.workflowId, existingVersions);

      return metadata;
    } catch (error) {
      console.error(`Failed to create version for ${config.workflowId}:`, error);
      throw error;
    }
  }

  /**
   * Get version by ID
   */
  getVersion(versionId: string): VersionMetadata | undefined {
    return this.versions.get(versionId);
  }

  /**
   * Get version snapshot
   */
  getSnapshot(versionId: string): VersionSnapshot | undefined {
    return this.snapshots.get(versionId);
  }

  /**
   * Get all versions for workflow
   */
  getWorkflowVersions(workflowId: string): VersionMetadata[] {
    const versionIds = this.versionHistory.get(workflowId) || [];
    return versionIds
      .map(id => this.versions.get(id))
      .filter((v): v is VersionMetadata => v !== undefined);
  }

  /**
   * Get active version for workflow
   */
  getActiveVersion(workflowId: string): VersionMetadata | undefined {
    const versions = this.getWorkflowVersions(workflowId);
    return versions.find(v => v.status === 'active');
  }

  /**
   * Publish version
   */
  publishVersion(versionId: string, publishedBy: string): boolean {
    try {
      const version = this.versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      if (version.status !== 'draft') {
        throw new Error(`Only draft versions can be published`);
      }

      version.status = 'published';
      version.publishedAt = Date.now();

      // Record promotion
      this.promotionHistory.push({
        id: `promo-${Date.now()}`,
        fromVersionId: versionId,
        toVersionId: versionId,
        fromStatus: 'draft',
        toStatus: 'published',
        promotedBy: publishedBy,
        promotedAt: Date.now(),
      });

      return true;
    } catch (error) {
      console.error(`Failed to publish version ${versionId}:`, error);
      return false;
    }
  }

  /**
   * Activate version (promote to active)
   */
  activateVersion(versionId: string, activatedBy: string, approval?: {
    approverId: string;
    approvedAt: number;
  }): boolean {
    try {
      const version = this.versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      if (version.status === 'draft') {
        throw new Error(`Draft versions must be published before activation`);
      }

      // Deactivate previous active version
      const workflowId = version.workflowId;
      const versions = this.getWorkflowVersions(workflowId);
      for (const v of versions) {
        if (v.status === 'active') {
          v.status = 'published';
        }
      }

      // Activate new version
      version.status = 'active';
      version.publishedAt = version.publishedAt || Date.now();

      // Record promotion
      this.promotionHistory.push({
        id: `promo-${Date.now()}`,
        fromVersionId: versionId,
        toVersionId: versionId,
        fromStatus: 'published',
        toStatus: 'active',
        promotedBy: activatedBy,
        promotedAt: Date.now(),
        reason: 'Version activation',
        approval,
      });

      return true;
    } catch (error) {
      console.error(`Failed to activate version ${versionId}:`, error);
      return false;
    }
  }

  /**
   * Deprecate version
   */
  deprecateVersion(versionId: string, deprecatedBy: string, reason?: string): boolean {
    try {
      const version = this.versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      if (version.status === 'active') {
        throw new Error(`Cannot deprecate active version`);
      }

      version.status = 'deprecated';
      version.deprecatedAt = Date.now();

      // Record promotion
      this.promotionHistory.push({
        id: `promo-${Date.now()}`,
        fromVersionId: versionId,
        toVersionId: versionId,
        fromStatus: version.status,
        toStatus: 'deprecated',
        promotedBy: deprecatedBy,
        promotedAt: Date.now(),
        reason,
      });

      return true;
    } catch (error) {
      console.error(`Failed to deprecate version ${versionId}:`, error);
      return false;
    }
  }

  /**
   * Archive version
   */
  archiveVersion(versionId: string, archivedBy: string): boolean {
    try {
      const version = this.versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      version.status = 'archived';
      version.archivedAt = Date.now();

      return true;
    } catch (error) {
      console.error(`Failed to archive version ${versionId}:`, error);
      return false;
    }
  }

  /**
   * Compare two versions
   */
  compareVersions(versionIdA: string, versionIdB: string): VersionComparison | null {
    try {
      const versionA = this.versions.get(versionIdA);
      const versionB = this.versions.get(versionIdB);

      if (!versionA || !versionB) {
        return null;
      }

      const snapshotA = this.snapshots.get(versionIdA);
      const snapshotB = this.snapshots.get(versionIdB);

      if (!snapshotA || !snapshotB) {
        return null;
      }

      const differences: VersionDifference['differences'] = [];

      // Compare nodes
      const nodesA = new Map(snapshotA.workflow.nodes?.map((n: any) => [n.id, n]) || []);
      const nodesB = new Map(snapshotB.workflow.nodes?.map((n: any) => [n.id, n]) || []);

      // Check for added/removed/modified nodes
      const allNodeIds = new Set([...nodesA.keys(), ...nodesB.keys()]);
      for (const nodeId of allNodeIds) {
        const nodeA = nodesA.get(nodeId);
        const nodeB = nodesB.get(nodeId);

        if (!nodeA && nodeB) {
          differences.push({
            type: 'node_added',
            path: `nodes[${nodeId}]`,
            newValue: nodeB,
          });
        } else if (nodeA && !nodeB) {
          differences.push({
            type: 'node_removed',
            path: `nodes[${nodeId}]`,
            oldValue: nodeA,
          });
        } else if (JSON.stringify(nodeA) !== JSON.stringify(nodeB)) {
          differences.push({
            type: 'node_modified',
            path: `nodes[${nodeId}]`,
            oldValue: nodeA,
            newValue: nodeB,
          });
        }
      }

      // Compare configuration
      const configA = JSON.stringify(snapshotA.configuration);
      const configB = JSON.stringify(snapshotB.configuration);
      if (configA !== configB) {
        differences.push({
          type: 'config_changed',
          path: 'configuration',
          oldValue: snapshotA.configuration,
          newValue: snapshotB.configuration,
        });
      }

      // Compare variables
      const varsA = JSON.stringify(snapshotA.variables);
      const varsB = JSON.stringify(snapshotB.variables);
      if (varsA !== varsB) {
        differences.push({
          type: 'variable_changed',
          path: 'variables',
          oldValue: snapshotA.variables,
          newValue: snapshotB.variables,
        });
      }

      // Determine compatibility
      let compatibility: 'compatible' | 'breaking' | 'requires_migration' = 'compatible';
      const nodeRemovals = differences.filter(d => d.type === 'node_removed');
      const configChanges = differences.filter(d => d.type === 'config_changed');

      if (nodeRemovals.length > 0) {
        compatibility = 'breaking';
      } else if (configChanges.length > 0) {
        compatibility = 'requires_migration';
      }

      return {
        versionA,
        versionB,
        isDifferent: differences.length > 0,
        changeCount: differences.length,
        changes: differences,
        compatibility,
      };
    } catch (error) {
      console.error(`Failed to compare versions:`, error);
      return null;
    }
  }

  /**
   * Link rollout to version
   */
  linkRollout(rolloutId: string, versionId: string, linkedBy: string): boolean {
    try {
      const version = this.versions.get(versionId);
      if (!version) {
        throw new Error(`Version ${versionId} not found`);
      }

      const link: RolloutVersionLink = {
        rolloutId,
        versionId,
        linkedAt: Date.now(),
        linkedBy,
        status: 'in_progress',
      };

      if (!this.rolloutLinks.has(rolloutId)) {
        this.rolloutLinks.set(rolloutId, []);
      }

      this.rolloutLinks.get(rolloutId)!.push(link);
      return true;
    } catch (error) {
      console.error(`Failed to link rollout ${rolloutId} to version ${versionId}:`, error);
      return false;
    }
  }

  /**
   * Update rollout status
   */
  updateRolloutStatus(rolloutId: string, status: RolloutVersionLink['status'], result?: Record<string, any>): boolean {
    try {
      const links = this.rolloutLinks.get(rolloutId);
      if (!links || links.length === 0) {
        return false;
      }

      const latestLink = links[links.length - 1];
      latestLink.status = status;
      if (result) {
        latestLink.result = result;
      }

      return true;
    } catch (error) {
      console.error(`Failed to update rollout status for ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Get version promotions
   */
  getPromotionHistory(filters?: {
    versionId?: string;
    workflowId?: string;
    status?: VersionStatus;
    startTime?: number;
    endTime?: number;
  }): VersionPromotion[] {
    let history = this.promotionHistory;

    if (filters) {
      history = history.filter(p => {
        if (filters.versionId && p.fromVersionId !== filters.versionId) {
          return false;
        }
        if (filters.workflowId) {
          const version = this.versions.get(p.fromVersionId);
          if (!version || version.workflowId !== filters.workflowId) {
            return false;
          }
        }
        if (filters.status && p.toStatus !== filters.status) {
          return false;
        }
        if (filters.startTime && p.promotedAt < filters.startTime) {
          return false;
        }
        if (filters.endTime && p.promotedAt > filters.endTime) {
          return false;
        }
        return true;
      });
    }

    return history;
  }

  /**
   * Get rollout version links
   */
  getRolloutVersionLinks(rolloutId: string): RolloutVersionLink[] {
    return this.rolloutLinks.get(rolloutId) || [];
  }

  /**
   * Get version statistics
   */
  getVersionStats(): {
    totalVersions: number;
    totalWorkflows: number;
    activeVersions: number;
    publishedVersions: number;
    draftVersions: number;
    deprecatedVersions: number;
    archivedVersions: number;
  } {
    const versions = Array.from(this.versions.values());

    return {
      totalVersions: versions.length,
      totalWorkflows: this.versionHistory.size,
      activeVersions: versions.filter(v => v.status === 'active').length,
      publishedVersions: versions.filter(v => v.status === 'published').length,
      draftVersions: versions.filter(v => v.status === 'draft').length,
      deprecatedVersions: versions.filter(v => v.status === 'deprecated').length,
      archivedVersions: versions.filter(v => v.status === 'archived').length,
    };
  }

  /**
   * Export version
   */
  exportVersion(versionId: string): Record<string, any> | null {
    const metadata = this.versions.get(versionId);
    const snapshot = this.snapshots.get(versionId);

    if (!metadata || !snapshot) {
      return null;
    }

    return {
      metadata,
      snapshot,
      exportedAt: Date.now(),
    };
  }

  /**
   * Import version
   */
  importVersion(exported: Record<string, any>, importedBy: string): string | null {
    try {
      const { metadata, snapshot } = exported;

      if (!metadata || !snapshot) {
        throw new Error('Invalid export format');
      }

      const newVersionId = `version-${metadata.workflowId}-${Date.now()}`;
      const newMetadata: VersionMetadata = {
        ...metadata,
        id: newVersionId,
        createdAt: Date.now(),
        author: importedBy,
      };

      this.versions.set(newVersionId, newMetadata);

      const newSnapshot: VersionSnapshot = {
        ...snapshot,
        id: `snapshot-${newVersionId}`,
        versionId: newVersionId,
        timestamp: Date.now(),
      };

      this.snapshots.set(newVersionId, newSnapshot);

      // Add to history
      const versionIds = this.versionHistory.get(metadata.workflowId) || [];
      versionIds.push(newVersionId);
      this.versionHistory.set(metadata.workflowId, versionIds);

      return newVersionId;
    } catch (error) {
      console.error(`Failed to import version:`, error);
      return null;
    }
  }

  /**
   * Cleanup old versions
   */
  cleanupOldVersions(workflowId: string, keepCount: number = 5): number {
    try {
      const versionIds = this.versionHistory.get(workflowId) || [];
      if (versionIds.length <= keepCount) {
        return 0;
      }

      const versionsToCleanup = versionIds.slice(0, versionIds.length - keepCount);
      let cleanedCount = 0;

      for (const versionId of versionsToCleanup) {
        const version = this.versions.get(versionId);
        if (version && version.status !== 'active') {
          this.versions.delete(versionId);
          this.snapshots.delete(versionId);
          cleanedCount++;
        }
      }

      // Update history
      const remainingIds = versionIds.filter(id => this.versions.has(id));
      this.versionHistory.set(workflowId, remainingIds);

      return cleanedCount;
    } catch (error) {
      console.error(`Failed to cleanup old versions for ${workflowId}:`, error);
      return 0;
    }
  }
}

export default VersionManagementService;
