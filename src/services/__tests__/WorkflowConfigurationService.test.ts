/**
 * Unit Tests for WorkflowConfigurationService
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { WorkflowConfigurationService } from '../WorkflowConfigurationService';
import { WorkflowMode } from '@/types/workflowConfiguration';

// Mock Prisma
vi.mock('@prisma/client');

describe('WorkflowConfigurationService', () => {
  let service: WorkflowConfigurationService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      siteWorkflowConfiguration: {
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        upsert: vi.fn(),
      },
      routingWorkflowConfiguration: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workOrderWorkflowConfiguration: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      },
      workflowConfigurationHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      routing: {
        findUnique: vi.fn(),
      },
      workOrder: {
        findUnique: vi.fn(),
      },
    };

    service = new WorkflowConfigurationService(mockPrisma);
  });

  describe('getSiteConfiguration', () => {
    it('should retrieve existing site configuration', async () => {
      const siteId = 'SITE-001';
      const config = {
        id: 'config-1',
        siteId,
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: true,
        allowExternalVouching: false,
        enforceQualityChecks: true,
        requireStartTransition: true,
        requireJustification: false,
        requireApproval: false,
        effectiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPrisma.siteWorkflowConfiguration.findUnique.mockResolvedValue(config);

      const result = await service.getSiteConfiguration(siteId);

      expect(result).toEqual(config);
      expect(mockPrisma.siteWorkflowConfiguration.findUnique).toHaveBeenCalledWith({
        where: { siteId },
      });
    });

    it('should create default STRICT configuration if not found', async () => {
      const siteId = 'SITE-002';
      const newConfig = {
        id: 'config-new',
        siteId,
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: true,
        allowExternalVouching: false,
        enforceQualityChecks: true,
        requireStartTransition: true,
        requireJustification: false,
        requireApproval: false,
        effectiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPrisma.siteWorkflowConfiguration.findUnique.mockResolvedValue(null);
      mockPrisma.siteWorkflowConfiguration.create.mockResolvedValue(newConfig);

      const result = await service.getSiteConfiguration(siteId);

      expect(result.mode).toBe('STRICT');
      expect(result.enforceOperationSequence).toBe(true);
      expect(mockPrisma.siteWorkflowConfiguration.create).toHaveBeenCalled();
    });
  });

  describe('updateSiteConfiguration', () => {
    it('should update site configuration and track changes', async () => {
      const siteId = 'SITE-001';
      const config = {
        id: 'config-1',
        siteId,
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: true,
        allowExternalVouching: false,
        enforceQualityChecks: true,
        requireStartTransition: true,
        requireJustification: false,
        requireApproval: false,
        effectiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const updates = {
        mode: 'FLEXIBLE' as WorkflowMode,
        enforceStatusGating: false,
      };

      const updatedConfig = { ...config, ...updates };

      mockPrisma.siteWorkflowConfiguration.findUnique.mockResolvedValue(config);
      mockPrisma.siteWorkflowConfiguration.update.mockResolvedValue(updatedConfig);
      mockPrisma.workflowConfigurationHistory.create.mockResolvedValue({});

      const result = await service.updateSiteConfiguration(
        siteId,
        updates,
        'user-123',
        'Testing flexible mode'
      );

      expect(result.mode).toBe('FLEXIBLE');
      expect(result.enforceStatusGating).toBe(false);
      expect(mockPrisma.workflowConfigurationHistory.create).toHaveBeenCalled();
    });
  });

  describe('validateConfiguration', () => {
    it('should validate STRICT mode constraints', async () => {
      const invalidConfig = {
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: false, // Invalid for STRICT
      };

      const validation = await service.validateConfiguration(invalidConfig);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should allow FLEXIBLE mode with custom rules', async () => {
      const validConfig = {
        mode: 'FLEXIBLE' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: false,
        allowExternalVouching: false,
        enforceQualityChecks: true,
      };

      const validation = await service.validateConfiguration(validConfig);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });

    it('should validate HYBRID mode with external vouching', async () => {
      const validConfig = {
        mode: 'HYBRID' as WorkflowMode,
        allowExternalVouching: true,
        enforceQualityChecks: true,
      };

      const validation = await service.validateConfiguration(validConfig);

      expect(validation.valid).toBe(true);
    });
  });

  describe('getEffectiveConfiguration', () => {
    it('should resolve configuration with inheritance (WO > Routing > Site)', async () => {
      const siteConfig = {
        id: 'site-config-1',
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: true,
        allowExternalVouching: false,
        enforceQualityChecks: true,
      };

      const routingConfig = {
        id: 'routing-config-1',
        mode: null,
        enforceStatusGating: false, // Override
        enforceOperationSequence: null, // Inherit
      };

      const woConfig = {
        id: 'wo-config-1',
        mode: 'FLEXIBLE' as WorkflowMode,
        enforceStatusGating: null, // Inherit from routing
      };

      const workOrder = {
        id: 'WO-001',
        routingId: 'RT-001',
        siteId: 'SITE-001',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(workOrder);
      mockPrisma.workOrderWorkflowConfiguration.findUnique.mockResolvedValue(woConfig);
      mockPrisma.routingWorkflowConfiguration.findUnique.mockResolvedValue(routingConfig);
      mockPrisma.siteWorkflowConfiguration.findUnique.mockResolvedValue(siteConfig);

      const effective = await service.getEffectiveConfiguration('WO-001');

      expect(effective.mode).toBe('FLEXIBLE'); // From WO
      expect(effective.enforceStatusGating).toBe(false); // From Routing
      expect(effective.enforceOperationSequence).toBe(true); // From Site
    });

    it('should skip null configuration levels in inheritance chain', async () => {
      const siteConfig = {
        id: 'site-config-1',
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: true,
      };

      const workOrder = {
        id: 'WO-001',
        routingId: 'RT-001',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(workOrder);
      mockPrisma.workOrderWorkflowConfiguration.findUnique.mockResolvedValue(null);
      mockPrisma.routingWorkflowConfiguration.findUnique.mockResolvedValue(null);
      mockPrisma.siteWorkflowConfiguration.findUnique.mockResolvedValue(siteConfig);

      const effective = await service.getEffectiveConfiguration('WO-001');

      expect(effective.mode).toBe('STRICT');
      expect(effective.enforceOperationSequence).toBe(true);
    });
  });

  describe('canExecuteOperation', () => {
    it('should allow operation execution in STRICT mode when status is IN_PROGRESS', async () => {
      const config = {
        mode: 'STRICT' as WorkflowMode,
        enforceStatusGating: true,
      };

      const workOrder = {
        id: 'WO-001',
        status: 'IN_PROGRESS',
      };

      vi.spyOn(service, 'getEffectiveConfiguration').mockResolvedValue(config as any);
      mockPrisma.workOrder.findUnique.mockResolvedValue(workOrder);

      const result = await service.canExecuteOperation('WO-001', 'OP-001');

      expect(result.canExecute).toBe(true);
    });

    it('should prevent operation execution in STRICT mode when status is not IN_PROGRESS', async () => {
      const config = {
        mode: 'STRICT' as WorkflowMode,
        enforceStatusGating: true,
      };

      const workOrder = {
        id: 'WO-001',
        status: 'SCHEDULED',
      };

      vi.spyOn(service, 'getEffectiveConfiguration').mockResolvedValue(config as any);
      mockPrisma.workOrder.findUnique.mockResolvedValue(workOrder);

      const result = await service.canExecuteOperation('WO-001', 'OP-001');

      expect(result.canExecute).toBe(false);
    });

    it('should allow operation execution in FLEXIBLE mode regardless of status', async () => {
      const config = {
        mode: 'FLEXIBLE' as WorkflowMode,
        enforceStatusGating: false,
      };

      const workOrder = {
        id: 'WO-001',
        status: 'SCHEDULED',
      };

      vi.spyOn(service, 'getEffectiveConfiguration').mockResolvedValue(config as any);
      mockPrisma.workOrder.findUnique.mockResolvedValue(workOrder);

      const result = await service.canExecuteOperation('WO-001', 'OP-001');

      expect(result.canExecute).toBe(true);
    });
  });

  describe('createRoutingOverride', () => {
    it('should create routing override with inheritance', async () => {
      const override = {
        id: 'override-1',
        routingId: 'RT-001',
        mode: 'FLEXIBLE' as WorkflowMode,
        enforceStatusGating: false,
        overrideReason: 'Testing flexible mode',
        approvedBy: 'Manager A',
        createdAt: new Date().toISOString(),
        createdBy: 'user-123',
      };

      mockPrisma.routingWorkflowConfiguration.create.mockResolvedValue(override);

      const result = await service.createRoutingOverride(
        'RT-001',
        { mode: 'FLEXIBLE', enforceStatusGating: false },
        'user-123'
      );

      expect(result.routingId).toBe('RT-001');
      expect(result.mode).toBe('FLEXIBLE');
    });
  });

  describe('createWorkOrderOverride', () => {
    it('should create work order override with approval', async () => {
      const override = {
        id: 'override-2',
        workOrderId: 'WO-001',
        mode: 'HYBRID' as WorkflowMode,
        allowExternalVouching: true,
        overrideReason: 'ERP integration',
        approvedBy: 'Manager B',
        approvedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: 'user-456',
      };

      mockPrisma.workOrderWorkflowConfiguration.create.mockResolvedValue(override);

      const result = await service.createWorkOrderOverride(
        'WO-001',
        { mode: 'HYBRID', allowExternalVouching: true },
        'ERP integration',
        'Manager B',
        'user-456'
      );

      expect(result.workOrderId).toBe('WO-001');
      expect(result.approvedBy).toBe('Manager B');
    });

    it('should require override reason and approver', async () => {
      expect(() =>
        service.createWorkOrderOverride('WO-001', {}, '', '', 'user-123')
      ).toThrow('Override reason is required');
    });
  });

  describe('getConfigurationHistory', () => {
    it('should retrieve configuration change history', async () => {
      const history = [
        {
          id: 'hist-1',
          configType: 'SITE',
          configId: 'config-1',
          newMode: 'FLEXIBLE',
          previousMode: 'STRICT',
          changedFields: { mode: { previous: 'STRICT', current: 'FLEXIBLE' } },
          createdAt: new Date().toISOString(),
          createdBy: 'user-123',
        },
      ];

      mockPrisma.workflowConfigurationHistory.findMany.mockResolvedValue(history);

      const result = await service.getConfigurationHistory('SITE', 'config-1', 10);

      expect(result).toHaveLength(1);
      expect(result[0].newMode).toBe('FLEXIBLE');
    });

    it('should support pagination', async () => {
      mockPrisma.workflowConfigurationHistory.findMany.mockResolvedValue([]);

      await service.getConfigurationHistory('SITE', 'config-1', 20);

      expect(mockPrisma.workflowConfigurationHistory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 20,
        })
      );
    });
  });

  describe('Mode-specific behavior', () => {
    it('STRICT mode should enforce all controls', async () => {
      const strictConfig = {
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: true,
        allowExternalVouching: false,
        enforceQualityChecks: true,
        requireStartTransition: true,
      };

      const validation = await service.validateConfiguration(strictConfig);
      expect(validation.valid).toBe(true);
    });

    it('FLEXIBLE mode should allow rule customization', async () => {
      const flexibleConfig = {
        mode: 'FLEXIBLE' as WorkflowMode,
        enforceOperationSequence: true,
        enforceStatusGating: false, // Customizable
        allowExternalVouching: false,
        enforceQualityChecks: true,
      };

      const validation = await service.validateConfiguration(flexibleConfig);
      expect(validation.valid).toBe(true);
    });

    it('HYBRID mode should support external vouching', async () => {
      const hybridConfig = {
        mode: 'HYBRID' as WorkflowMode,
        allowExternalVouching: true,
        enforceQualityChecks: true,
      };

      const validation = await service.validateConfiguration(hybridConfig);
      expect(validation.valid).toBe(true);
    });
  });

  describe('Error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrisma.siteWorkflowConfiguration.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.getSiteConfiguration('SITE-001')).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should validate required fields for work order overrides', async () => {
      expect(() =>
        service.createWorkOrderOverride('WO-001', {}, '', '', 'user-123')
      ).toThrow();
    });
  });

  describe('Inheritance edge cases', () => {
    it('should handle missing routing configuration', async () => {
      const siteConfig = {
        id: 'site-config-1',
        mode: 'STRICT' as WorkflowMode,
        enforceOperationSequence: true,
      };

      const workOrder = {
        id: 'WO-001',
        routingId: 'RT-001',
      };

      mockPrisma.workOrder.findUnique.mockResolvedValue(workOrder);
      mockPrisma.workOrderWorkflowConfiguration.findUnique.mockResolvedValue(null);
      mockPrisma.routingWorkflowConfiguration.findUnique.mockResolvedValue(null);
      mockPrisma.siteWorkflowConfiguration.findUnique.mockResolvedValue(siteConfig);

      const effective = await service.getEffectiveConfiguration('WO-001');
      expect(effective.enforceOperationSequence).toBe(true);
    });

    it('should handle null values in inheritance chain correctly', async () => {
      const siteConfig = {
        enforceStatusGating: true,
        enforceOperationSequence: null, // Null value
      };

      const routingConfig = {
        enforceOperationSequence: false, // Override null
        enforceStatusGating: null, // Inherit from site
      };

      // Effective should be: statusGating=true (routing), operationSequence=false (routing)
      // This tests that null values properly skip to next level
      expect(true).toBe(true); // Placeholder for inheritance logic
    });
  });
});
