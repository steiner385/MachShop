/**
 * Component Override System Tests
 * Issue #428: Component Override Safety System with Fallback & Approval
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  OverrideRegistry,
  getOverrideRegistry,
} from '../../../packages/extension-sdk/src/overrides/registry';
import {
  OverrideValidator,
  getOverrideValidator,
} from '../../../packages/extension-sdk/src/overrides/validator';
import {
  OverrideStatus,
  RolloutStatus,
  RolloutPhase,
  OverrideNotFoundError,
  OverrideConflictError,
} from '../../../packages/extension-sdk/src/overrides/types';
import {
  RolloutManager,
  OverridePerformanceMonitor,
} from '../../../packages/extension-sdk/src/overrides/loader';
import type {
  ComponentOverrideDeclaration,
  ComponentContract,
  ComponentOverride,
} from '../../../packages/extension-sdk/src/overrides/types';

describe('Component Override System', () => {
  let registry: OverrideRegistry;
  let validator: OverrideValidator;

  beforeEach(() => {
    registry = new OverrideRegistry();
    validator = new OverrideValidator();
  });

  describe('OverrideRegistry', () => {
    it('should register an override', async () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'work-order-form',
        component: () => null,
        reason: 'Custom fields for site XYZ',
        extensionId: 'my-extension',
        version: '1.0.0',
      };

      const override = await registry.registerOverride(declaration);

      expect(override).toBeDefined();
      expect(override.id).toBeDefined();
      expect(override.overridesComponentId).toBe('work-order-form');
      expect(override.extensionId).toBe('my-extension');
    });

    it('should set APPROVED status when no approval required', async () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'dashboard',
        component: () => null,
        reason: 'Performance improvement',
        extensionId: 'perf-ext',
        version: '1.0.0',
        requiresApproval: false,
      };

      const override = await registry.registerOverride(declaration);

      expect(override.status).toBe(OverrideStatus.APPROVED);
      expect(override.activatedAt).toBeDefined();
    });

    it('should set PENDING_APPROVAL status when approval required', async () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'core-component',
        component: () => null,
        reason: 'Breaking change to core component',
        extensionId: 'core-ext',
        version: '1.0.0',
        requiresApproval: true,
        breaking: true,
      };

      const override = await registry.registerOverride(declaration);

      expect(override.status).toBe(OverrideStatus.PENDING_APPROVAL);
      expect(override.approval).toBeUndefined();
    });

    it('should approve an override', async () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'form',
        component: () => null,
        reason: 'New feature',
        extensionId: 'ext-1',
        version: '1.0.0',
        requiresApproval: true,
      };

      const override = await registry.registerOverride(declaration);
      await registry.approveOverride(override.id, 'admin-user', 'Looks good');

      const approved = registry.getOverride(override.id);
      expect(approved?.status).toBe(OverrideStatus.APPROVED);
      expect(approved?.approval?.approvedBy).toBe('admin-user');
    });

    it('should get active override for component', async () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'button',
        component: () => null,
        reason: 'Custom styling',
        extensionId: 'styling-ext',
        version: '1.0.0',
      };

      const override = await registry.registerOverride(declaration);
      const active = registry.getActiveOverride('button');

      expect(active).toBeDefined();
      expect(active?.id).toBe(override.id);
    });

    it('should scope override to specific sites', async () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'dashboard',
        component: () => null,
        reason: 'Site-specific customization',
        extensionId: 'site-ext',
        version: '1.0.0',
        scopedToSites: ['site-a', 'site-b'],
      };

      const override = await registry.registerOverride(declaration);
      const forSiteA = registry.getActiveOverride('dashboard', 'site-a');
      const forSiteC = registry.getActiveOverride('dashboard', 'site-c');

      expect(forSiteA?.id).toBe(override.id);
      expect(forSiteC).toBeUndefined();
    });

    it('should emit event when override registered', () => {
      return new Promise<void>((resolve) => {
        const unsubscribe = registry.onOverrideEvent(event => {
          expect(event.type).toBe('registered');
          expect(event.componentId).toBe('form');
          unsubscribe();
          resolve();
        });

        registry.registerOverride({
          overridesComponentId: 'form',
          component: () => null,
          reason: 'Test',
          extensionId: 'test-ext',
          version: '1.0.0',
        });
      });
    });

    it('should handle rollout initiation', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'test-ext',
        version: '1.0.0',
      });

      await registry.initiateRollout(override.id, 'site-1');

      const rollout = registry.getRolloutStatus(override.id);
      expect(rollout?.phase).toBe(RolloutPhase.SINGLE_SITE);
      expect(rollout?.deployedSites).toContain('site-1');
    });

    it('should advance rollout to regional', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'test-ext',
        version: '1.0.0',
      });

      await registry.initiateRollout(override.id, 'site-1');
      await registry.advanceRollout(override.id, ['site-2', 'site-3']);

      const rollout = registry.getRolloutStatus(override.id);
      expect(rollout?.phase).toBe(RolloutPhase.REGIONAL);
      expect(rollout?.deployedSites).toContain('site-2');
    });

    it('should record errors', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'test-ext',
        version: '1.0.0',
      });

      registry.recordError(override.id, {
        message: 'Render failed',
        code: 'RENDER_ERROR',
      });

      const updated = registry.getOverride(override.id);
      expect(updated?.errors).toHaveLength(1);
      expect(updated?.errors?.[0].message).toBe('Render failed');
    });

    it('should rollback override', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'test-ext',
        version: '1.0.0',
      });

      await registry.rollback(override.id, 'Too many errors', 'admin');

      const updated = registry.getOverride(override.id);
      expect(updated?.status).toBe(OverrideStatus.ROLLED_BACK);
      expect(updated?.rollout?.rollback?.reason).toBe('Too many errors');
    });

    it('should query overrides', async () => {
      await registry.registerOverride({
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Test 1',
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      await registry.registerOverride({
        overridesComponentId: 'button',
        component: () => null,
        reason: 'Test 2',
        extensionId: 'ext-2',
        version: '1.0.0',
      });

      const formOverrides = registry.queryOverrides({ componentId: 'form' });
      expect(formOverrides).toHaveLength(1);
      expect(formOverrides[0].overridesComponentId).toBe('form');
    });
  });

  describe('OverrideValidator', () => {
    it('should validate complete override declaration', () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Custom fields needed',
        extensionId: 'my-ext',
        version: '1.0.0',
        testingReport: 'https://example.com/report',
        fallbackComponent: () => null,
      };

      const report = validator.validateOverride(declaration);

      expect(report.valid).toBe(true);
      expect(report.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const incomplete = {
        overridesComponentId: 'form',
        // missing component
        // missing reason
        extensionId: 'ext',
        version: '1.0.0',
      } as any;

      const report = validator.validateOverride(incomplete);

      expect(report.valid).toBe(false);
      expect(report.errors.length).toBeGreaterThan(0);
    });

    it('should warn about missing test report', () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      };

      const report = validator.validateOverride(declaration);

      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings.some(w => w.code === 'MISSING_TEST_REPORT')).toBe(true);
    });

    it('should validate version constraints', () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
        versionConstraints: {
          'core-ui': '>=2.0.0',
          'framework': '^1.5.0',
        },
      };

      const report = validator.validateVersionConstraints(declaration);

      expect(report.valid).toBe(true);
    });

    it('should detect conflicts with other overrides', async () => {
      const override1 = await registry.registerOverride({
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Test 1',
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      const declaration2: ComponentOverrideDeclaration = {
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Test 2',
        extensionId: 'ext-2',
        version: '1.0.0',
      };

      const conflict = validator.detectConflicts(declaration2);

      expect(conflict.hasConflicts).toBe(true);
      expect(conflict.conflicts).toHaveLength(1);
      expect(conflict.conflicts[0].conflictType).toBe('duplicate');
    });

    it('should validate contract compatibility', () => {
      const contract: ComponentContract = {
        id: 'form-contract',
        requiredProps: { onChange: 'function', value: 'string' },
        requiredMethods: ['validate', 'reset'],
        a11yRequirements: ['WCAG2.1 AA'],
      };

      validator.registerContract(contract);

      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
        implementsContract: 'form-contract',
      };

      const report = validator.validateContractCompatibility(declaration, contract);

      expect(report.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('RolloutManager', () => {
    it('should initiate single-site rollout', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      });

      await registry.initiateRollout(override.id, 'site-1');

      const rollout = registry.getRolloutStatus(override.id);
      expect(rollout?.phase).toBe(RolloutPhase.SINGLE_SITE);
      expect(rollout?.deployedSites).toContain('site-1');
    });

    it('should advance to regional phase', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      });

      await registry.initiateRollout(override.id, 'site-1');
      await registry.advanceRollout(override.id, ['site-2', 'site-3']);

      const rollout = registry.getRolloutStatus(override.id);
      expect(rollout?.phase).toBe(RolloutPhase.REGIONAL);
    });

    it('should advance to global phase', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      });

      await registry.initiateRollout(override.id, 'site-1');
      await registry.advanceRollout(override.id, ['site-2']);
      await registry.advanceRollout(override.id, ['site-3']);

      const rollout = registry.getRolloutStatus(override.id);
      expect(rollout?.phase).toBe(RolloutPhase.GLOBAL);
      expect(rollout?.completedAt).toBeDefined();
    });
  });

  describe('OverridePerformanceMonitor', () => {
    it('should check performance criteria', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      });

      registry.updateMetrics(override.id, {
        loadTimeMs: 100,
        originalLoadTimeMs: 90,
        errorCount: 0,
        errorRate: 0.01,
        renderCount: 100,
        failedRenderCount: 1,
        avgRenderTimeMs: 15,
        a11yScore: 95,
        testCoverage: 85,
      });

      const monitor = new OverridePerformanceMonitor();
      const updated = registry.getOverride(override.id)!;
      const result = monitor.meetsPerformanceCriteria(updated);

      expect(result.passes).toBe(true);
      expect(result.issues).toHaveLength(0);
    });

    it('should detect performance issues', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      });

      registry.updateMetrics(override.id, {
        loadTimeMs: 300,
        originalLoadTimeMs: 100,
        errorCount: 10,
        errorRate: 0.15,
        renderCount: 100,
        failedRenderCount: 15,
        avgRenderTimeMs: 50,
        a11yScore: 60,
        testCoverage: 50,
      });

      const monitor = new OverridePerformanceMonitor();
      const updated = registry.getOverride(override.id)!;
      const result = monitor.meetsPerformanceCriteria(updated);

      expect(result.passes).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should determine if auto-rollback is needed', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      });

      // Critical error rate
      registry.updateMetrics(override.id, {
        loadTimeMs: 100,
        originalLoadTimeMs: 90,
        errorCount: 15,
        errorRate: 0.15,
        renderCount: 100,
        failedRenderCount: 15,
        avgRenderTimeMs: 15,
        a11yScore: 95,
        testCoverage: 85,
      });

      const monitor = new OverridePerformanceMonitor();
      const updated = registry.getOverride(override.id)!;
      const shouldRollback = monitor.shouldAutoRollback(updated);

      expect(shouldRollback).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should throw OverrideNotFoundError', async () => {
      expect(registry.getOverride('non-existent')).toBeUndefined();

      await expect(registry.unregisterOverride('non-existent')).rejects.toThrow(OverrideNotFoundError);
    });

    it('should handle multiple registration attempts', async () => {
      const declaration: ComponentOverrideDeclaration = {
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext-1',
        version: '1.0.0',
      };

      const override1 = await registry.registerOverride(declaration);
      const override2 = await registry.registerOverride({
        ...declaration,
        extensionId: 'ext-2',
      });

      expect(override1.id).not.toBe(override2.id);
    });
  });

  describe('Edge cases', () => {
    it('should handle unregister', async () => {
      const override = await registry.registerOverride({
        overridesComponentId: 'component',
        component: () => null,
        reason: 'Test',
        extensionId: 'ext',
        version: '1.0.0',
      });

      await registry.unregisterOverride(override.id);

      expect(registry.getOverride(override.id)).toBeUndefined();
    });

    it('should handle site-specific queries', async () => {
      await registry.registerOverride({
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Global',
        extensionId: 'ext-1',
        version: '1.0.0',
      });

      await registry.registerOverride({
        overridesComponentId: 'form',
        component: () => null,
        reason: 'Site-specific',
        extensionId: 'ext-2',
        version: '1.0.0',
        scopedToSites: ['site-a'],
      });

      const results = registry.queryOverrides({
        componentId: 'form',
        siteId: 'site-a',
      });

      expect(results.length).toBeGreaterThan(0);
    });
  });
});
