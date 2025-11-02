/**
 * Rollback and Recovery Service
 * Manages rollback procedures, recovery points, and health verification
 */

/**
 * Recovery point type
 */
export type RecoveryPointType = 'pre_deployment' | 'post_deployment' | 'manual' | 'automatic';

/**
 * Recovery point
 */
export interface RecoveryPoint {
  id: string;
  rolloutId: string;
  timestamp: number;
  type: RecoveryPointType;
  createdBy: string;
  description?: string;
  versionId: string;
  configSnapshot: Record<string, any>;
  variableSnapshot: Record<string, any>;
  deploymentState: Record<string, any>;
  metadata?: Record<string, any>;
}

/**
 * Rollback plan
 */
export interface RollbackPlan {
  id: string;
  rolloutId: string;
  recoveryPointId: string;
  rollbackReason: string;
  initiatedBy: string;
  initiatedAt: number;
  targetVersion: string;
  affectedSites: string[];
  estimatedDuration: number; // milliseconds
  rollbackSteps: Array<{
    stepNumber: number;
    action: string;
    siteIds: string[];
    estimatedTimeMs: number;
    dependencies?: number[]; // step dependencies
  }>;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'paused';
  completedAt?: number;
  failureReason?: string;
}

/**
 * Rollback execution
 */
export interface RollbackExecution {
  id: string;
  rollbackPlanId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'aborted';
  startedAt?: number;
  completedAt?: number;
  executionSteps: Array<{
    stepNumber: number;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startedAt?: number;
    completedAt?: number;
    result?: Record<string, any>;
    error?: string;
  }>;
  siteRollbacks: Map<string, {
    status: 'pending' | 'in_progress' | 'success' | 'failed' | 'partial';
    startedAt?: number;
    completedAt?: number;
    result?: Record<string, any>;
    error?: string;
  }>;
}

/**
 * Health check result
 */
export interface HealthCheckResult {
  id: string;
  rolloutId: string;
  timestamp: number;
  siteId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: Array<{
    name: string;
    status: 'pass' | 'fail' | 'warning';
    message?: string;
    duration?: number;
  }>;
  overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  failureCount: number;
  warningCount: number;
}

/**
 * Recovery action
 */
export interface RecoveryAction {
  id: string;
  rolloutId: string;
  timestamp: number;
  action: 'rollback' | 'skip_site' | 'pause_rollout' | 'scale_down' | 'isolate_site' | 'notify_team';
  reason: string;
  executedBy: string;
  targetSites?: string[];
  result?: Record<string, any>;
  reversalAction?: string;
}

/**
 * Rollback and Recovery Service
 */
export class RollbackRecoveryService {
  private recoveryPoints: Map<string, RecoveryPoint> = new Map();
  private rollbackPlans: Map<string, RollbackPlan> = new Map();
  private rollbackExecutions: Map<string, RollbackExecution> = new Map();
  private healthChecks: Map<string, HealthCheckResult[]> = new Map();
  private recoveryActions: RecoveryAction[] = [];
  private rolloutRecoveryPoints: Map<string, string[]> = new Map(); // rolloutId -> recoveryPointIds
  private maxRecoveryPoints = 100;
  private maxActionsHistory = 5000;

  /**
   * Create recovery point
   */
  createRecoveryPoint(config: {
    rolloutId: string;
    versionId: string;
    type: RecoveryPointType;
    createdBy: string;
    description?: string;
    configSnapshot: Record<string, any>;
    variableSnapshot: Record<string, any>;
    deploymentState: Record<string, any>;
  }): RecoveryPoint {
    try {
      const pointId = `recovery-${config.rolloutId}-${Date.now()}`;
      const point: RecoveryPoint = {
        id: pointId,
        rolloutId: config.rolloutId,
        timestamp: Date.now(),
        type: config.type,
        createdBy: config.createdBy,
        description: config.description,
        versionId: config.versionId,
        configSnapshot: JSON.parse(JSON.stringify(config.configSnapshot)), // Deep copy
        variableSnapshot: JSON.parse(JSON.stringify(config.variableSnapshot)),
        deploymentState: JSON.parse(JSON.stringify(config.deploymentState)),
      };

      this.recoveryPoints.set(pointId, point);

      // Track recovery points per rollout
      if (!this.rolloutRecoveryPoints.has(config.rolloutId)) {
        this.rolloutRecoveryPoints.set(config.rolloutId, []);
      }
      this.rolloutRecoveryPoints.get(config.rolloutId)!.push(pointId);

      // Cleanup old recovery points if necessary
      if (this.recoveryPoints.size > this.maxRecoveryPoints) {
        this.cleanupOldRecoveryPoints();
      }

      return point;
    } catch (error) {
      console.error(`Failed to create recovery point for ${config.rolloutId}:`, error);
      throw error;
    }
  }

  /**
   * Get recovery point
   */
  getRecoveryPoint(pointId: string): RecoveryPoint | undefined {
    return this.recoveryPoints.get(pointId);
  }

  /**
   * Get rollout recovery points
   */
  getRolloutRecoveryPoints(rolloutId: string): RecoveryPoint[] {
    const pointIds = this.rolloutRecoveryPoints.get(rolloutId) || [];
    return pointIds
      .map(id => this.recoveryPoints.get(id))
      .filter((p): p is RecoveryPoint => p !== undefined)
      .sort((a, b) => b.timestamp - a.timestamp); // Most recent first
  }

  /**
   * Create rollback plan
   */
  createRollbackPlan(config: {
    rolloutId: string;
    recoveryPointId: string;
    rollbackReason: string;
    initiatedBy: string;
    targetVersion: string;
    affectedSites: string[];
  }): RollbackPlan | null {
    try {
      const recoveryPoint = this.recoveryPoints.get(config.recoveryPointId);
      if (!recoveryPoint) {
        throw new Error(`Recovery point ${config.recoveryPointId} not found`);
      }

      const planId = `rollback-plan-${config.rolloutId}-${Date.now()}`;

      // Generate rollback steps
      const rollbackSteps = this.generateRollbackSteps(
        config.affectedSites,
        config.targetVersion
      );

      const plan: RollbackPlan = {
        id: planId,
        rolloutId: config.rolloutId,
        recoveryPointId: config.recoveryPointId,
        rollbackReason: config.rollbackReason,
        initiatedBy: config.initiatedBy,
        initiatedAt: Date.now(),
        targetVersion: config.targetVersion,
        affectedSites: config.affectedSites,
        estimatedDuration: this.calculateEstimatedDuration(rollbackSteps),
        rollbackSteps,
        status: 'pending',
      };

      this.rollbackPlans.set(planId, plan);
      return plan;
    } catch (error) {
      console.error(`Failed to create rollback plan for ${config.rolloutId}:`, error);
      return null;
    }
  }

  /**
   * Get rollback plan
   */
  getRollbackPlan(planId: string): RollbackPlan | undefined {
    return this.rollbackPlans.get(planId);
  }

  /**
   * Get rollout rollback plan
   */
  getRolloutRollbackPlan(rolloutId: string): RollbackPlan | undefined {
    const plans = Array.from(this.rollbackPlans.values());
    return plans.find(p => p.rolloutId === rolloutId && p.status !== 'completed');
  }

  /**
   * Execute rollback plan
   */
  executeRollbackPlan(planId: string, executedBy: string): RollbackExecution | null {
    try {
      const plan = this.rollbackPlans.get(planId);
      if (!plan) {
        throw new Error(`Rollback plan ${planId} not found`);
      }

      if (plan.status !== 'pending') {
        throw new Error(`Rollback plan is already ${plan.status}`);
      }

      plan.status = 'in_progress';

      const executionId = `rollback-exec-${planId}-${Date.now()}`;
      const execution: RollbackExecution = {
        id: executionId,
        rollbackPlanId: planId,
        status: 'in_progress',
        startedAt: Date.now(),
        executionSteps: plan.rollbackSteps.map(step => ({
          stepNumber: step.stepNumber,
          status: 'pending',
        })),
        siteRollbacks: new Map(plan.affectedSites.map(site => [
          site,
          { status: 'pending' }
        ])),
      };

      this.rollbackExecutions.set(executionId, execution);

      // Record recovery action
      this.recordRecoveryAction({
        rolloutId: plan.rolloutId,
        action: 'rollback',
        reason: plan.rollbackReason,
        executedBy,
        targetSites: plan.affectedSites,
      });

      return execution;
    } catch (error) {
      console.error(`Failed to execute rollback plan ${planId}:`, error);
      return null;
    }
  }

  /**
   * Update rollback execution step
   */
  updateRollbackStep(
    executionId: string,
    stepNumber: number,
    status: 'in_progress' | 'completed' | 'failed',
    result?: Record<string, any>,
    error?: string
  ): boolean {
    try {
      const execution = this.rollbackExecutions.get(executionId);
      if (!execution) {
        throw new Error(`Rollback execution ${executionId} not found`);
      }

      const step = execution.executionSteps.find(s => s.stepNumber === stepNumber);
      if (!step) {
        throw new Error(`Step ${stepNumber} not found in execution`);
      }

      step.status = status;
      if (status === 'in_progress') {
        step.startedAt = Date.now();
      } else {
        step.completedAt = Date.now();
        if (result) step.result = result;
        if (error) step.error = error;
      }

      return true;
    } catch (error) {
      console.error(`Failed to update rollback step ${executionId}:${stepNumber}:`, error);
      return false;
    }
  }

  /**
   * Update site rollback status
   */
  updateSiteRollbackStatus(
    executionId: string,
    siteId: string,
    status: 'in_progress' | 'success' | 'failed' | 'partial',
    result?: Record<string, any>,
    error?: string
  ): boolean {
    try {
      const execution = this.rollbackExecutions.get(executionId);
      if (!execution) {
        throw new Error(`Rollback execution ${executionId} not found`);
      }

      const siteRollback = execution.siteRollbacks.get(siteId);
      if (!siteRollback) {
        throw new Error(`Site rollback for ${siteId} not found`);
      }

      siteRollback.status = status;
      if (status === 'in_progress') {
        siteRollback.startedAt = Date.now();
      } else {
        siteRollback.completedAt = Date.now();
        if (result) siteRollback.result = result;
        if (error) siteRollback.error = error;
      }

      return true;
    } catch (error) {
      console.error(`Failed to update site rollback status ${executionId}:${siteId}:`, error);
      return false;
    }
  }

  /**
   * Complete rollback execution
   */
  completeRollbackExecution(
    executionId: string,
    status: 'completed' | 'failed' | 'aborted',
    failureReason?: string
  ): boolean {
    try {
      const execution = this.rollbackExecutions.get(executionId);
      if (!execution) {
        throw new Error(`Rollback execution ${executionId} not found`);
      }

      execution.status = status;
      execution.completedAt = Date.now();

      // Update rollback plan status
      const plan = this.rollbackPlans.get(execution.rollbackPlanId);
      if (plan) {
        plan.status = status === 'completed' ? 'completed' : status === 'failed' ? 'failed' : 'paused';
        plan.completedAt = Date.now();
        if (failureReason) {
          plan.failureReason = failureReason;
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to complete rollback execution ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Perform health check
   */
  performHealthCheck(config: {
    rolloutId: string;
    siteId: string;
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warning';
      message?: string;
      duration?: number;
    }>;
  }): HealthCheckResult {
    try {
      const checkId = `health-check-${config.siteId}-${Date.now()}`;

      const failureCount = config.checks.filter(c => c.status === 'fail').length;
      const warningCount = config.checks.filter(c => c.status === 'warning').length;

      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (failureCount > 0) {
        overallStatus = 'unhealthy';
      } else if (warningCount > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const result: HealthCheckResult = {
        id: checkId,
        rolloutId: config.rolloutId,
        timestamp: Date.now(),
        siteId: config.siteId,
        status: overallStatus,
        checks: config.checks,
        overallStatus,
        failureCount,
        warningCount,
      };

      // Store health checks
      if (!this.healthChecks.has(config.siteId)) {
        this.healthChecks.set(config.siteId, []);
      }
      this.healthChecks.get(config.siteId)!.push(result);

      // Keep only recent checks
      const siteChecks = this.healthChecks.get(config.siteId)!;
      if (siteChecks.length > 100) {
        siteChecks.shift();
      }

      return result;
    } catch (error) {
      console.error(`Failed to perform health check for ${config.siteId}:`, error);
      throw error;
    }
  }

  /**
   * Get latest health check
   */
  getLatestHealthCheck(siteId: string): HealthCheckResult | undefined {
    const checks = this.healthChecks.get(siteId);
    return checks?.[checks.length - 1];
  }

  /**
   * Get health check history
   */
  getHealthCheckHistory(siteId: string, limit?: number): HealthCheckResult[] {
    let checks = this.healthChecks.get(siteId) || [];

    if (limit) {
      checks = checks.slice(-limit);
    }

    return checks;
  }

  /**
   * Record recovery action
   */
  private recordRecoveryAction(config: {
    rolloutId: string;
    action: RecoveryAction['action'];
    reason: string;
    executedBy: string;
    targetSites?: string[];
  }): void {
    const action: RecoveryAction = {
      id: `action-${Date.now()}`,
      rolloutId: config.rolloutId,
      timestamp: Date.now(),
      action: config.action,
      reason: config.reason,
      executedBy: config.executedBy,
      targetSites: config.targetSites,
    };

    this.recoveryActions.push(action);

    // Trim history if too large
    if (this.recoveryActions.length > this.maxActionsHistory) {
      this.recoveryActions.splice(0, this.recoveryActions.length - this.maxActionsHistory);
    }
  }

  /**
   * Get recovery actions
   */
  getRecoveryActions(filters?: {
    rolloutId?: string;
    action?: string;
    startTime?: number;
    endTime?: number;
  }): RecoveryAction[] {
    let actions = this.recoveryActions;

    if (filters) {
      actions = actions.filter(a => {
        if (filters.rolloutId && a.rolloutId !== filters.rolloutId) {
          return false;
        }
        if (filters.action && a.action !== filters.action) {
          return false;
        }
        if (filters.startTime && a.timestamp < filters.startTime) {
          return false;
        }
        if (filters.endTime && a.timestamp > filters.endTime) {
          return false;
        }
        return true;
      });
    }

    return actions;
  }

  /**
   * Generate rollback steps (auto-generated based on sites and version)
   */
  private generateRollbackSteps(affectedSites: string[], targetVersion: string): RollbackPlan['rollbackSteps'] {
    const steps: RollbackPlan['rollbackSteps'] = [];

    // Group sites by batches (e.g., 5 sites per step)
    const batchSize = 5;
    for (let i = 0; i < affectedSites.length; i += batchSize) {
      const batch = affectedSites.slice(i, Math.min(i + batchSize, affectedSites.length));
      const stepNumber = Math.floor(i / batchSize) + 1;

      steps.push({
        stepNumber,
        action: `Rollback sites to version ${targetVersion}`,
        siteIds: batch,
        estimatedTimeMs: 30000 + (batch.length * 5000), // Base 30s + 5s per site
        dependencies: stepNumber > 1 ? [stepNumber - 1] : undefined,
      });
    }

    // Add verification step
    steps.push({
      stepNumber: steps.length + 1,
      action: 'Verify rollback success and health',
      siteIds: affectedSites,
      estimatedTimeMs: 15000,
      dependencies: [steps.length],
    });

    return steps;
  }

  /**
   * Calculate estimated duration
   */
  private calculateEstimatedDuration(steps: RollbackPlan['rollbackSteps']): number {
    let totalDuration = 0;
    const completedSteps = new Set<number>();

    // Calculate duration considering dependencies (parallel steps can run together)
    for (const step of steps) {
      if (!step.dependencies || step.dependencies.every(d => completedSteps.has(d))) {
        totalDuration += step.estimatedTimeMs;
        completedSteps.add(step.stepNumber);
      }
    }

    return totalDuration;
  }

  /**
   * Cleanup old recovery points
   */
  private cleanupOldRecoveryPoints(): void {
    const allPoints = Array.from(this.recoveryPoints.values());
    allPoints.sort((a, b) => b.timestamp - a.timestamp);

    const pointsToKeep = allPoints.slice(0, this.maxRecoveryPoints);
    const pointsToDelete = allPoints.slice(this.maxRecoveryPoints);

    for (const point of pointsToDelete) {
      this.recoveryPoints.delete(point.id);

      // Remove from rollout tracking
      const rolloutPoints = this.rolloutRecoveryPoints.get(point.rolloutId);
      if (rolloutPoints) {
        const idx = rolloutPoints.indexOf(point.id);
        if (idx > -1) {
          rolloutPoints.splice(idx, 1);
        }
      }
    }
  }

  /**
   * Get recovery statistics
   */
  getRecoveryStats(): {
    totalRecoveryPoints: number;
    totalRollbacks: number;
    successfulRollbacks: number;
    failedRollbacks: number;
    pendingRollbacks: number;
    averageRollbackDuration: number;
  } {
    const plans = Array.from(this.rollbackPlans.values());
    const completedPlans = plans.filter(p => p.status === 'completed' || p.status === 'failed');

    const totalDuration = completedPlans.reduce((sum, plan) => {
      if (plan.completedAt) {
        return sum + (plan.completedAt - plan.initiatedAt);
      }
      return sum;
    }, 0);

    return {
      totalRecoveryPoints: this.recoveryPoints.size,
      totalRollbacks: plans.length,
      successfulRollbacks: plans.filter(p => p.status === 'completed').length,
      failedRollbacks: plans.filter(p => p.status === 'failed').length,
      pendingRollbacks: plans.filter(p => p.status === 'pending' || p.status === 'in_progress').length,
      averageRollbackDuration: completedPlans.length > 0
        ? totalDuration / completedPlans.length
        : 0,
    };
  }

  /**
   * Export recovery point for backup
   */
  exportRecoveryPoint(pointId: string): Record<string, any> | null {
    const point = this.recoveryPoints.get(pointId);
    if (!point) {
      return null;
    }

    return {
      point,
      exportedAt: Date.now(),
    };
  }

  /**
   * Import recovery point from backup
   */
  importRecoveryPoint(exported: Record<string, any>): string | null {
    try {
      const { point } = exported;
      if (!point) {
        throw new Error('Invalid export format');
      }

      const newPointId = `recovery-${point.rolloutId}-${Date.now()}`;
      const newPoint: RecoveryPoint = {
        ...point,
        id: newPointId,
        timestamp: Date.now(),
      };

      this.recoveryPoints.set(newPointId, newPoint);

      if (!this.rolloutRecoveryPoints.has(point.rolloutId)) {
        this.rolloutRecoveryPoints.set(point.rolloutId, []);
      }
      this.rolloutRecoveryPoints.get(point.rolloutId)!.push(newPointId);

      return newPointId;
    } catch (error) {
      console.error(`Failed to import recovery point:`, error);
      return null;
    }
  }
}

export default RollbackRecoveryService;
