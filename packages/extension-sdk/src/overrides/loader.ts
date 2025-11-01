/**
 * Component Override Loader and Rollout Manager
 * Issue #428: Component Override Safety System with Fallback & Approval
 */

import React from 'react';
import type { ComponentOverride } from './types';
import { RolloutPhase, OverrideLoadError } from './types';
import { getOverrideRegistry } from './registry';

/**
 * Load component with override support
 */
export async function loadComponentWithOverride(
  componentId: string,
  siteId?: string
): Promise<React.ComponentType<any>> {
  const registry = getOverrideRegistry();

  try {
    const override = registry.getActiveOverride(componentId, siteId);

    if (!override) {
      // No override, load original component
      return loadOriginalComponent(componentId);
    }

    // Track load time
    const startTime = performance.now();

    try {
      const component = override.component;
      const loadTime = performance.now() - startTime;

      // Update metrics
      registry.updateMetrics(override.id, {
        loadTimeMs: loadTime,
      });

      return component;
    } catch (error) {
      registry.recordError(override.id, {
        message: `Failed to load override component: ${error}`,
        code: 'COMPONENT_LOAD_ERROR',
        stack: (error as Error).stack,
      });

      throw new OverrideLoadError(override.id, String(error));
    }
  } catch (error) {
    // Fall back to original component on error
    console.warn(`Failed to load override for ${componentId}:`, error);
    return loadOriginalComponent(componentId);
  }
}

/**
 * Load original component (placeholder - in production would use a component registry)
 */
function loadOriginalComponent(componentId: string): React.ComponentType<any> {
  // In a real implementation, this would look up the component from a registry
  // For now, return a placeholder
  return () => React.createElement('div', null, `Original Component: ${componentId}`);
}

/**
 * Rollout Manager for gradual override deployment
 */
export class RolloutManager {
  /**
   * Initiate single-site rollout
   */
  static async initiateSingleSiteRollout(
    overrideId: string,
    siteId: string
  ): Promise<void> {
    const registry = getOverrideRegistry();
    const override = registry.getOverride(overrideId);

    if (!override) {
      throw new OverrideLoadError(overrideId, 'Override not found');
    }

    await registry.initiateRollout(overrideId, siteId);
  }

  /**
   * Advance rollout to regional deployment
   */
  static async advanceToRegional(
    overrideId: string,
    regions: string[]
  ): Promise<void> {
    const registry = getOverrideRegistry();
    const override = registry.getOverride(overrideId);

    if (!override || !override.rollout) {
      throw new OverrideLoadError(overrideId, 'Rollout not found');
    }

    if (override.rollout.phase !== RolloutPhase.SINGLE_SITE) {
      throw new OverrideLoadError(
        overrideId,
        `Cannot advance from ${override.rollout.phase} phase`
      );
    }

    await registry.advanceRollout(overrideId, regions);
  }

  /**
   * Advance rollout to global deployment
   */
  static async advanceToGlobal(
    overrideId: string,
    sites: string[]
  ): Promise<void> {
    const registry = getOverrideRegistry();
    const override = registry.getOverride(overrideId);

    if (!override || !override.rollout) {
      throw new OverrideLoadError(overrideId, 'Rollout not found');
    }

    if (override.rollout.phase !== RolloutPhase.REGIONAL) {
      throw new OverrideLoadError(
        overrideId,
        `Cannot advance from ${override.rollout.phase} phase`
      );
    }

    await registry.advanceRollout(overrideId, sites);
  }

  /**
   * Get rollout progress
   */
  static getRolloutProgress(overrideId: string): {
    phase: RolloutPhase;
    deployedSites: string[];
    completedAt?: Date;
  } | null {
    const registry = getOverrideRegistry();
    const override = registry.getOverride(overrideId);

    if (!override?.rollout) {
      return null;
    }

    return {
      phase: override.rollout.phase,
      deployedSites: override.rollout.deployedSites,
      completedAt: override.rollout.completedAt,
    };
  }

  /**
   * Abort and rollback deployment
   */
  static async abort(
    overrideId: string,
    reason: string
  ): Promise<void> {
    const registry = getOverrideRegistry();
    await registry.rollback(overrideId, reason, 'system');
  }
}

/**
 * Override deployment scheduler
 */
export class OverrideDeploymentScheduler {
  private schedules: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Schedule automatic advance to next phase
   */
  scheduleNextPhase(
    overrideId: string,
    delayMs: number
  ): void {
    // Clear existing schedule if any
    this.clearSchedule(overrideId);

    const timeout = setTimeout(async () => {
      try {
        const registry = getOverrideRegistry();
        const override = registry.getOverride(overrideId);

        if (!override?.rollout) {
          return;
        }

        // Auto-advance based on current phase
        if (override.rollout.phase === RolloutPhase.SINGLE_SITE) {
          await RolloutManager.advanceToRegional(overrideId, []);
        } else if (override.rollout.phase === RolloutPhase.REGIONAL) {
          await RolloutManager.advanceToGlobal(overrideId, []);
        }
      } catch (error) {
        console.error(`Failed to auto-advance rollout for ${overrideId}:`, error);
      }
    }, delayMs);

    this.schedules.set(overrideId, timeout);
  }

  /**
   * Clear scheduled deployment
   */
  clearSchedule(overrideId: string): void {
    const timeout = this.schedules.get(overrideId);
    if (timeout) {
      clearTimeout(timeout);
      this.schedules.delete(overrideId);
    }
  }

  /**
   * Cleanup all schedules
   */
  cleanup(): void {
    for (const timeout of this.schedules.values()) {
      clearTimeout(timeout);
    }
    this.schedules.clear();
  }
}

/**
 * Override performance monitor
 */
export class OverridePerformanceMonitor {
  private thresholds = {
    maxErrorRate: 0.05, // 5%
    minA11yScore: 80,
    minTestCoverage: 80,
    maxLoadTimeDegradation: 100, // ms
  };

  /**
   * Check if override meets performance criteria
   */
  meetsPerformanceCriteria(override: ComponentOverride): {
    passes: boolean;
    issues: string[];
  } {
    const issues: string[] = [];

    if (!override.metrics) {
      return { passes: false, issues: ['No metrics available'] };
    }

    const { metrics } = override;

    // Check error rate
    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      issues.push(
        `Error rate ${(metrics.errorRate * 100).toFixed(2)}% exceeds threshold of ${this.thresholds.maxErrorRate * 100}%`
      );
    }

    // Check accessibility
    if (metrics.a11yScore < this.thresholds.minA11yScore) {
      issues.push(
        `Accessibility score ${metrics.a11yScore} below minimum of ${this.thresholds.minA11yScore}`
      );
    }

    // Check test coverage
    if (metrics.testCoverage < this.thresholds.minTestCoverage) {
      issues.push(
        `Test coverage ${metrics.testCoverage}% below minimum of ${this.thresholds.minTestCoverage}%`
      );
    }

    // Check performance impact
    const loadTimeDegradation = metrics.loadTimeMs - (metrics.originalLoadTimeMs || 0);
    if (loadTimeDegradation > this.thresholds.maxLoadTimeDegradation) {
      issues.push(
        `Load time degradation ${loadTimeDegradation}ms exceeds threshold of ${this.thresholds.maxLoadTimeDegradation}ms`
      );
    }

    return {
      passes: issues.length === 0,
      issues,
    };
  }

  /**
   * Check if override should be auto-rolled back
   */
  shouldAutoRollback(override: ComponentOverride): boolean {
    if (!override.metrics) {
      return false;
    }

    // Auto-rollback if error rate is critical (>10%)
    if (override.metrics.errorRate > 0.1) {
      return true;
    }

    // Auto-rollback if accessibility severely degraded (<60%)
    if (override.metrics.a11yScore < 60) {
      return true;
    }

    return false;
  }

  /**
   * Set custom thresholds
   */
  setThresholds(thresholds: Partial<typeof this.thresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }
}
