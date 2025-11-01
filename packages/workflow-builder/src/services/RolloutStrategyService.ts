/**
 * Rollout Strategy Service
 * Manages gradual rollout strategies for workflow deployments
 */

/**
 * Rollout strategy types
 */
export type RolloutStrategyType = 'immediate' | 'staged' | 'canary' | 'scheduled';

/**
 * Rollout status
 */
export type RolloutStatus = 'pending' | 'in_progress' | 'paused' | 'completed' | 'rolled_back' | 'failed';

/**
 * Staged rollout configuration
 */
export interface StagedRolloutConfig {
  stages: Array<{
    stageNumber: number;
    sitesOrRegions: string[];
    delayHours?: number;
    validateBeforeNext: boolean;
    successCriteriaPercentage?: number;
  }>;
}

/**
 * Canary rollout configuration
 */
export interface CanaryRolloutConfig {
  canaryPercentage: number; // 1-100
  canaryDurationHours: number;
  metricsToMonitor: string[];
  errorThresholdPercentage: number;
  performanceThresholdPercentage: number;
  autoPromoteIfSuccessful: boolean;
}

/**
 * Scheduled rollout configuration
 */
export interface ScheduledRolloutConfig {
  startTime: number;
  endTime?: number;
  maxParallelSites?: number;
  maintenanceWindow?: {
    startHour: number;
    endHour: number;
    daysOfWeek: number[];
  };
}

/**
 * Rollout execution
 */
export interface RolloutExecution {
  id: string;
  workflowId: string;
  versionId: string;
  strategy: RolloutStrategyType;
  config:
    | StagedRolloutConfig
    | CanaryRolloutConfig
    | ScheduledRolloutConfig;
  status: RolloutStatus;
  startedAt: number;
  completedAt?: number;
  failureReason?: string;
  rollbackAt?: number;
  deployments: RolloutDeployment[];
  metrics?: RolloutMetrics;
  createdBy: string;
  approvalRequestId?: string;
}

/**
 * Individual deployment in rollout
 */
export interface RolloutDeployment {
  id: string;
  rolloutId: string;
  siteId: string;
  status: 'pending' | 'in_progress' | 'success' | 'failed' | 'rolled_back';
  startedAt?: number;
  completedAt?: number;
  duration?: number;
  error?: string;
  metrics?: DeploymentMetrics;
}

/**
 * Deployment metrics
 */
export interface DeploymentMetrics {
  errorRate: number; // 0-100
  responseTimeMs: number;
  successCount: number;
  failureCount: number;
  executionCount: number;
  timestamp: number;
}

/**
 * Overall rollout metrics
 */
export interface RolloutMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  successRate: number;
  averageErrorRate: number;
  averageResponseTime: number;
  totalDuration: number;
  estimatedTimeRemaining?: number;
}

/**
 * Rollout Strategy Service
 */
export class RolloutStrategyService {
  private rollouts: Map<string, RolloutExecution> = new Map();
  private deployments: Map<string, RolloutDeployment> = new Map();
  private metricsHistory: Array<{
    rolloutId: string;
    metrics: DeploymentMetrics;
    timestamp: number;
  }> = [];
  private maxMetricsSize = 100000;

  /**
   * Create rollout
   */
  createRollout(config: {
    workflowId: string;
    versionId: string;
    strategy: RolloutStrategyType;
    strategyConfig: StagedRolloutConfig | CanaryRolloutConfig | ScheduledRolloutConfig;
    createdBy: string;
    approvalRequestId?: string;
  }): RolloutExecution {
    const rolloutId = `rollout-${Date.now()}`;
    const rollout: RolloutExecution = {
      id: rolloutId,
      workflowId: config.workflowId,
      versionId: config.versionId,
      strategy: config.strategy,
      config: config.strategyConfig,
      status: 'pending',
      startedAt: Date.now(),
      deployments: [],
      createdBy: config.createdBy,
      approvalRequestId: config.approvalRequestId,
    };

    this.rollouts.set(rolloutId, rollout);
    return rollout;
  }

  /**
   * Get rollout by ID
   */
  getRollout(rolloutId: string): RolloutExecution | undefined {
    return this.rollouts.get(rolloutId);
  }

  /**
   * Start immediate rollout
   */
  startImmediateRollout(rolloutId: string, targetSites: string[]): boolean {
    try {
      const rollout = this.rollouts.get(rolloutId);
      if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found`);
      }

      if (rollout.status !== 'pending') {
        throw new Error(`Rollout is already ${rollout.status}`);
      }

      rollout.status = 'in_progress';

      // Create deployment for each site
      for (const siteId of targetSites) {
        const deployment: RolloutDeployment = {
          id: `deploy-${Date.now()}-${siteId}`,
          rolloutId,
          siteId,
          status: 'in_progress',
          startedAt: Date.now(),
        };

        rollout.deployments.push(deployment);
        this.deployments.set(deployment.id, deployment);
      }

      return true;
    } catch (error) {
      console.error(`Failed to start immediate rollout ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Start staged rollout
   */
  startStagedRollout(rolloutId: string): boolean {
    try {
      const rollout = this.rollouts.get(rolloutId);
      if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found`);
      }

      if (!(rollout.config as any).stages) {
        throw new Error(`Not a staged rollout configuration`);
      }

      rollout.status = 'in_progress';

      const config = rollout.config as StagedRolloutConfig;
      const firstStage = config.stages[0];

      // Deploy to first stage
      for (const siteOrRegion of firstStage.sitesOrRegions) {
        const deployment: RolloutDeployment = {
          id: `deploy-${Date.now()}-${siteOrRegion}`,
          rolloutId,
          siteId: siteOrRegion,
          status: 'in_progress',
          startedAt: Date.now(),
        };

        rollout.deployments.push(deployment);
        this.deployments.set(deployment.id, deployment);
      }

      return true;
    } catch (error) {
      console.error(`Failed to start staged rollout ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Start canary rollout
   */
  startCanaryRollout(rolloutId: string, allSites: string[]): boolean {
    try {
      const rollout = this.rollouts.get(rolloutId);
      if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found`);
      }

      if (!(rollout.config as any).canaryPercentage) {
        throw new Error(`Not a canary rollout configuration`);
      }

      rollout.status = 'in_progress';

      const config = rollout.config as CanaryRolloutConfig;
      const canaryCount = Math.ceil((allSites.length * config.canaryPercentage) / 100);
      const canarySites = allSites.slice(0, canaryCount);

      // Deploy to canary sites
      for (const siteId of canarySites) {
        const deployment: RolloutDeployment = {
          id: `deploy-${Date.now()}-${siteId}`,
          rolloutId,
          siteId,
          status: 'in_progress',
          startedAt: Date.now(),
        };

        rollout.deployments.push(deployment);
        this.deployments.set(deployment.id, deployment);
      }

      return true;
    } catch (error) {
      console.error(`Failed to start canary rollout ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Update deployment status
   */
  updateDeploymentStatus(
    deploymentId: string,
    status: RolloutDeployment['status'],
    metrics?: DeploymentMetrics,
    error?: string
  ): boolean {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      deployment.status = status;

      if (metrics) {
        deployment.metrics = metrics;
        this.recordMetrics(deployment.rolloutId, metrics);
      }

      if (error) {
        deployment.error = error;
      }

      if (status === 'success' || status === 'failed' || status === 'rolled_back') {
        deployment.completedAt = Date.now();
        deployment.duration = deployment.completedAt - (deployment.startedAt || 0);
      }

      return true;
    } catch (error) {
      console.error(`Failed to update deployment ${deploymentId}:`, error);
      return false;
    }
  }

  /**
   * Complete rollout
   */
  completeRollout(rolloutId: string): boolean {
    try {
      const rollout = this.rollouts.get(rolloutId);
      if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found`);
      }

      rollout.status = 'completed';
      rollout.completedAt = Date.now();

      // Calculate metrics
      this.calculateRolloutMetrics(rollout);

      return true;
    } catch (error) {
      console.error(`Failed to complete rollout ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Rollback deployment
   */
  rollbackDeployment(deploymentId: string, reason: string): boolean {
    try {
      const deployment = this.deployments.get(deploymentId);
      if (!deployment) {
        throw new Error(`Deployment ${deploymentId} not found`);
      }

      deployment.status = 'rolled_back';
      deployment.error = reason;
      deployment.completedAt = Date.now();

      return true;
    } catch (error) {
      console.error(`Failed to rollback deployment ${deploymentId}:`, error);
      return false;
    }
  }

  /**
   * Rollback entire rollout
   */
  rollbackRollout(rolloutId: string, reason: string): boolean {
    try {
      const rollout = this.rollouts.get(rolloutId);
      if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found`);
      }

      rollout.status = 'rolled_back';
      rollout.failureReason = reason;
      rollout.rollbackAt = Date.now();

      // Rollback all deployments
      for (const deployment of rollout.deployments) {
        if (deployment.status === 'success') {
          this.rollbackDeployment(deployment.id, `Rolled back: ${reason}`);
        }
      }

      return true;
    } catch (error) {
      console.error(`Failed to rollback rollout ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Pause rollout
   */
  pauseRollout(rolloutId: string): boolean {
    try {
      const rollout = this.rollouts.get(rolloutId);
      if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found`);
      }

      if (rollout.status !== 'in_progress') {
        throw new Error(`Can only pause in-progress rollouts`);
      }

      rollout.status = 'paused';
      return true;
    } catch (error) {
      console.error(`Failed to pause rollout ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Resume rollout
   */
  resumeRollout(rolloutId: string): boolean {
    try {
      const rollout = this.rollouts.get(rolloutId);
      if (!rollout) {
        throw new Error(`Rollout ${rolloutId} not found`);
      }

      if (rollout.status !== 'paused') {
        throw new Error(`Can only resume paused rollouts`);
      }

      rollout.status = 'in_progress';
      return true;
    } catch (error) {
      console.error(`Failed to resume rollout ${rolloutId}:`, error);
      return false;
    }
  }

  /**
   * Record metrics
   */
  private recordMetrics(rolloutId: string, metrics: DeploymentMetrics): void {
    this.metricsHistory.push({
      rolloutId,
      metrics,
      timestamp: Date.now(),
    });

    // Trim if too large
    if (this.metricsHistory.length > this.maxMetricsSize) {
      this.metricsHistory.splice(0, this.metricsHistory.length - this.maxMetricsSize);
    }
  }

  /**
   * Calculate rollout metrics
   */
  private calculateRolloutMetrics(rollout: RolloutExecution): void {
    const deployments = rollout.deployments;
    const successCount = deployments.filter(d => d.status === 'success').length;
    const failureCount = deployments.filter(d => d.status === 'failed').length;

    const metrics: RolloutMetrics = {
      totalDeployments: deployments.length,
      successfulDeployments: successCount,
      failedDeployments: failureCount,
      successRate: (successCount / deployments.length) * 100,
      averageErrorRate: 0,
      averageResponseTime: 0,
      totalDuration: (rollout.completedAt || Date.now()) - rollout.startedAt,
    };

    // Calculate averages from deployment metrics
    let totalErrorRate = 0;
    let totalResponseTime = 0;
    let metricsCount = 0;

    for (const deployment of deployments) {
      if (deployment.metrics) {
        totalErrorRate += deployment.metrics.errorRate;
        totalResponseTime += deployment.metrics.responseTimeMs;
        metricsCount++;
      }
    }

    if (metricsCount > 0) {
      metrics.averageErrorRate = totalErrorRate / metricsCount;
      metrics.averageResponseTime = totalResponseTime / metricsCount;
    }

    rollout.metrics = metrics;
  }

  /**
   * Get rollout metrics
   */
  getRolloutMetrics(rolloutId: string): RolloutMetrics | undefined {
    const rollout = this.rollouts.get(rolloutId);
    return rollout?.metrics;
  }

  /**
   * Get deployment metrics history
   */
  getMetricsHistory(rolloutId: string, limit?: number): Array<{
    metrics: DeploymentMetrics;
    timestamp: number;
  }> {
    let history = this.metricsHistory.filter(m => m.rolloutId === rolloutId);

    if (limit) {
      history = history.slice(-limit);
    }

    return history.map(h => ({ metrics: h.metrics, timestamp: h.timestamp }));
  }

  /**
   * Get rollout progress
   */
  getRolloutProgress(rolloutId: string): {
    status: RolloutStatus;
    totalDeployments: number;
    completedDeployments: number;
    successfulDeployments: number;
    failedDeployments: number;
    progressPercentage: number;
    estimatedTimeRemaining?: number;
  } | null {
    const rollout = this.rollouts.get(rolloutId);
    if (!rollout) {
      return null;
    }

    const completed = rollout.deployments.filter(
      d => d.status === 'success' || d.status === 'failed' || d.status === 'rolled_back'
    ).length;
    const successful = rollout.deployments.filter(d => d.status === 'success').length;
    const failed = rollout.deployments.filter(d => d.status === 'failed').length;

    const progressPercentage = (completed / rollout.deployments.length) * 100;

    // Estimate time remaining
    let estimatedTimeRemaining: number | undefined;
    if (completed > 0 && completed < rollout.deployments.length) {
      const avgTimePerDeployment =
        (Date.now() - rollout.startedAt) / completed;
      const remainingDeployments = rollout.deployments.length - completed;
      estimatedTimeRemaining = avgTimePerDeployment * remainingDeployments;
    }

    return {
      status: rollout.status,
      totalDeployments: rollout.deployments.length,
      completedDeployments: completed,
      successfulDeployments: successful,
      failedDeployments: failed,
      progressPercentage,
      estimatedTimeRemaining,
    };
  }

  /**
   * Get all rollouts
   */
  getAllRollouts(): RolloutExecution[] {
    return Array.from(this.rollouts.values());
  }

  /**
   * Get rollouts by workflow
   */
  getRolloutsByWorkflow(workflowId: string): RolloutExecution[] {
    return Array.from(this.rollouts.values()).filter(r => r.workflowId === workflowId);
  }

  /**
   * Get rollouts by status
   */
  getRolloutsByStatus(status: RolloutStatus): RolloutExecution[] {
    return Array.from(this.rollouts.values()).filter(r => r.status === status);
  }

  /**
   * Get deployment history for site
   */
  getDeploymentHistoryForSite(siteId: string, limit?: number): RolloutDeployment[] {
    let history = Array.from(this.deployments.values()).filter(d => d.siteId === siteId);

    if (limit) {
      history = history.slice(-limit);
    }

    return history;
  }
}

export default RolloutStrategyService;
