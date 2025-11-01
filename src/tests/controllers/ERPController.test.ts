/**
 * ERP Controller Unit Tests
 * Issue #60: Phase 7 - REST API for ERP Integration Management
 *
 * Tests for all ERP controller methods including integration management,
 * sync operations, reconciliation, and discrepancy handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import ERPController from '../../controllers/ERPController';
import ERPIntegrationService from '../../services/erp/ERPIntegrationService';
import { SyncJobScheduler } from '../../services/erp/SyncJobScheduler';
import { ReconciliationService } from '../../services/erp/reconciliation';

// Mock dependencies
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@prisma/client', () => {
  const mockPrisma = {
    erpIntegration: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    erpSyncTransaction: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    erpReconciliationReport: {
      findMany: vi.fn(),
    },
    erpReconciliationDiscrepancy: {
      findMany: vi.fn(),
    },
    $queryRaw: vi.fn(),
  };

  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('ERPController', () => {
  let controller: ERPController;
  let mockPrisma: any;
  let mockERPService: any;
  let mockScheduler: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Setup mocks
    mockPrisma = new PrismaClient();
    mockERPService = {
      configureERPSystem: vi.fn(),
      testConnection: vi.fn(),
      setFieldMappings: vi.fn(),
      getFieldMappings: vi.fn(),
    };

    mockScheduler = {
      queueSyncJob: vi.fn(),
      getQueueStats: vi.fn(),
    };

    controller = new ERPController(mockPrisma, mockERPService, mockScheduler);

    // Reset mock response
    mockResponse = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };

    // Reset mock request
    mockRequest = {
      params: {},
      body: {},
      query: {},
    };

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // ========================================
  // CREATE INTEGRATION TESTS
  // ========================================

  describe('createIntegration', () => {
    it('should create ERP integration successfully', async () => {
      const integrationData = {
        name: 'SAP S/4HANA',
        erpSystem: 'SAP',
        config: {
          apiEndpoint: 'https://sap.example.com',
          username: 'sapuser',
          password: 'pass123',
        },
        description: 'Main SAP integration',
      };

      mockRequest.body = integrationData;
      const newIntegration = { id: 'erp-1', ...integrationData };
      mockERPService.configureERPSystem.mockResolvedValueOnce(newIntegration);

      await controller.createIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'ERP integration created successfully',
          integration: newIntegration,
        })
      );
    });

    it('should return 400 when required fields are missing', async () => {
      mockRequest.body = { name: 'Test' }; // Missing erpSystem and config

      await controller.createIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields: name, erpSystem, config',
        })
      );
    });

    it('should handle service errors gracefully', async () => {
      mockRequest.body = {
        name: 'SAP',
        erpSystem: 'SAP',
        config: { apiEndpoint: 'https://sap.example.com' },
      };

      const error = new Error('Configuration error');
      mockERPService.configureERPSystem.mockRejectedValueOnce(error);

      await controller.createIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Failed to create ERP integration',
        })
      );
    });
  });

  // ========================================
  // GET INTEGRATION TESTS
  // ========================================

  describe('getIntegration', () => {
    it('should get ERP integration by ID', async () => {
      const integrationId = 'erp-1';
      const integration = {
        id: integrationId,
        name: 'SAP Integration',
        erpSystem: 'SAP',
        fieldMappings: [],
        syncTransactions: [],
      };

      mockRequest.params = { id: integrationId };
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce(integration);

      await controller.getIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.erpIntegration.findUnique).toHaveBeenCalledWith({
        where: { id: integrationId },
        include: {
          fieldMappings: true,
          syncTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        integration,
      });
    });

    it('should return 404 when integration not found', async () => {
      mockRequest.params = { id: 'non-existent' };
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce(null);

      await controller.getIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Integration not found',
        })
      );
    });
  });

  // ========================================
  // LIST INTEGRATIONS TESTS
  // ========================================

  describe('listIntegrations', () => {
    it('should list integrations with pagination', async () => {
      mockRequest.query = { limit: '50', offset: '0' };
      const integrations = [
        { id: 'erp-1', name: 'SAP', erpSystem: 'SAP', _count: { fieldMappings: 2, syncTransactions: 5 } },
        { id: 'erp-2', name: 'Oracle', erpSystem: 'Oracle', _count: { fieldMappings: 3, syncTransactions: 8 } },
      ];

      mockPrisma.erpIntegration.findMany.mockResolvedValueOnce(integrations);
      mockPrisma.erpIntegration.count.mockResolvedValueOnce(2);

      await controller.listIntegrations(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        integrations,
        pagination: {
          total: 2,
          limit: 50,
          offset: 0,
        },
      });
    });

    it('should handle default pagination values', async () => {
      mockRequest.query = {};
      mockPrisma.erpIntegration.findMany.mockResolvedValueOnce([]);
      mockPrisma.erpIntegration.count.mockResolvedValueOnce(0);

      await controller.listIntegrations(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.erpIntegration.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 50,
          skip: 0,
        })
      );
    });
  });

  // ========================================
  // UPDATE INTEGRATION TESTS
  // ========================================

  describe('updateIntegration', () => {
    it('should update ERP integration', async () => {
      const integrationId = 'erp-1';
      const updates = { name: 'SAP Updated' };
      const updatedIntegration = { id: integrationId, name: 'SAP Updated', erpSystem: 'SAP' };

      mockRequest.params = { id: integrationId };
      mockRequest.body = updates;
      mockPrisma.erpIntegration.update.mockResolvedValueOnce(updatedIntegration);

      await controller.updateIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.erpIntegration.update).toHaveBeenCalledWith({
        where: { id: integrationId },
        data: updates,
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'ERP integration updated successfully',
        integration: updatedIntegration,
      });
    });

    it('should handle update errors', async () => {
      mockRequest.params = { id: 'erp-1' };
      mockRequest.body = { name: 'Updated' };
      const error = new Error('Update failed');
      mockPrisma.erpIntegration.update.mockRejectedValueOnce(error);

      await controller.updateIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ========================================
  // DELETE INTEGRATION TESTS
  // ========================================

  describe('deleteIntegration', () => {
    it('should delete ERP integration when no active syncs', async () => {
      const integrationId = 'erp-1';
      mockRequest.params = { id: integrationId };

      mockPrisma.erpSyncTransaction.count.mockResolvedValueOnce(0);
      mockPrisma.erpIntegration.delete.mockResolvedValueOnce({ id: integrationId });

      await controller.deleteIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.erpIntegration.delete).toHaveBeenCalledWith({
        where: { id: integrationId },
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'ERP integration deleted successfully',
      });
    });

    it('should prevent deletion when active syncs exist', async () => {
      const integrationId = 'erp-1';
      mockRequest.params = { id: integrationId };

      mockPrisma.erpSyncTransaction.count.mockResolvedValueOnce(2); // Active syncs

      await controller.deleteIntegration(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Cannot delete integration with active sync operations',
          activeSyncs: 2,
        })
      );

      expect(mockPrisma.erpIntegration.delete).not.toHaveBeenCalled();
    });
  });

  // ========================================
  // CONNECTION TEST TESTS
  // ========================================

  describe('testConnection', () => {
    it('should test connection successfully', async () => {
      const integrationId = 'erp-1';
      mockRequest.params = { id: integrationId };

      const connectionResult = {
        connected: true,
        message: 'Successfully connected to SAP',
      };

      mockERPService.testConnection.mockResolvedValueOnce(connectionResult);

      await controller.testConnection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        connectionTest: connectionResult,
      });
    });

    it('should handle connection test errors', async () => {
      mockRequest.params = { id: 'erp-1' };
      const error = new Error('Connection failed');
      mockERPService.testConnection.mockRejectedValueOnce(error);

      await controller.testConnection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
    });
  });

  // ========================================
  // FIELD MAPPING TESTS
  // ========================================

  describe('setFieldMappings', () => {
    it('should set field mappings successfully', async () => {
      const integrationId = 'erp-1';
      const mappings = [
        { mesField: 'partNumber', erpField: 'MaterialCode' },
        { mesField: 'supplierName', erpField: 'SupplierName' },
      ];

      mockRequest.params = { id: integrationId };
      mockRequest.body = { entityType: 'Material', mappings };

      mockERPService.setFieldMappings.mockResolvedValueOnce({ id: 'mapping-1', mappings });

      await controller.setFieldMappings(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Field mappings configured successfully',
        })
      );
    });

    it('should validate required fields', async () => {
      mockRequest.params = { id: 'erp-1' };
      mockRequest.body = { entityType: 'Material' }; // Missing mappings

      await controller.setFieldMappings(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required fields: entityType, mappings (array)',
        })
      );
    });
  });

  describe('getFieldMappings', () => {
    it('should get field mappings for entity type', async () => {
      const integrationId = 'erp-1';
      const mappings = [
        { mesField: 'partNumber', erpField: 'MaterialCode' },
      ];

      mockRequest.params = { id: integrationId };
      mockRequest.query = { entityType: 'Material' };

      mockERPService.getFieldMappings.mockResolvedValueOnce(mappings);

      await controller.getFieldMappings(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        entityType: 'Material',
        mappings,
      });
    });

    it('should require entityType query parameter', async () => {
      mockRequest.params = { id: 'erp-1' };
      mockRequest.query = {}; // Missing entityType

      await controller.getFieldMappings(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required query parameter: entityType',
        })
      );
    });
  });

  // ========================================
  // SYNC OPERATION TESTS
  // ========================================

  describe('triggerSync', () => {
    it('should trigger sync job successfully', async () => {
      const integrationId = 'erp-1';
      mockRequest.params = { id: integrationId };
      mockRequest.body = {
        jobType: 'SUPPLIER_SYNC',
        batchSize: 100,
        dryRun: false,
      };

      const job = {
        id: 'job-1',
        name: 'SUPPLIER_SYNC',
        data: { integrationId, jobType: 'SUPPLIER_SYNC' },
      };

      mockScheduler.queueSyncJob.mockResolvedValueOnce(job);

      await controller.triggerSync(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(202);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Sync job queued successfully',
          job: expect.objectContaining({
            id: 'job-1',
          }),
        })
      );
    });

    it('should require jobType', async () => {
      mockRequest.params = { id: 'erp-1' };
      mockRequest.body = { batchSize: 100 }; // Missing jobType

      await controller.triggerSync(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Missing required field: jobType',
        })
      );
    });
  });

  describe('getSyncTransactions', () => {
    it('should get sync transactions with filtering', async () => {
      const integrationId = 'erp-1';
      mockRequest.params = { id: integrationId };
      mockRequest.query = { status: 'COMPLETED', limit: '50', offset: '0' };

      const transactions = [
        { id: 'txn-1', jobType: 'SUPPLIER_SYNC', status: 'COMPLETED' },
      ];

      mockPrisma.erpSyncTransaction.findMany.mockResolvedValueOnce(transactions);
      mockPrisma.erpSyncTransaction.count.mockResolvedValueOnce(1);

      await controller.getSyncTransactions(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        transactions,
        pagination: {
          total: 1,
          limit: 50,
          offset: 0,
        },
      });
    });
  });

  describe('getQueueStats', () => {
    it('should get queue statistics', async () => {
      mockRequest.params = { id: 'erp-1' };

      const stats = {
        active: 2,
        completed: 15,
        failed: 1,
        delayed: 0,
        waiting: 3,
      };

      mockScheduler.getQueueStats.mockResolvedValueOnce(stats);

      await controller.getQueueStats(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        stats,
      });
    });
  });

  // ========================================
  // RECONCILIATION TESTS
  // ========================================

  describe('getReconciliationReports', () => {
    it('should get reconciliation reports', async () => {
      const integrationId = 'erp-1';
      mockRequest.params = { id: integrationId };
      mockRequest.query = { limit: '50', offset: '0' };

      const reports = [
        { id: 'report-1', entityType: 'Supplier', discrepancyCount: 2 },
      ];

      // Mock the reconciliation service
      const mockReconciliationService = {
        getReconciliationReports: vi.fn().mockResolvedValueOnce(reports),
      };

      controller['reconciliationService'] = mockReconciliationService;

      await controller.getReconciliationReports(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        reports,
      });
    });
  });

  describe('triggerReconciliation', () => {
    it('should trigger reconciliation successfully', async () => {
      mockRequest.params = { id: 'erp-1' };
      mockRequest.body = { entityType: 'Supplier' };

      const report = {
        integrationId: 'erp-1',
        entityType: 'Supplier',
        discrepancyCount: 3,
      };

      const mockReconciliationService = {
        reconcile: vi.fn().mockResolvedValueOnce(report),
      };

      controller['reconciliationService'] = mockReconciliationService;

      await controller.triggerReconciliation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(202);
    });

    it('should require entityType', async () => {
      mockRequest.params = { id: 'erp-1' };
      mockRequest.body = {}; // Missing entityType

      await controller.triggerReconciliation(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getPendingDiscrepancies', () => {
    it('should get pending discrepancies', async () => {
      mockRequest.params = { id: 'erp-1' };

      const discrepancies = [
        { id: 'disc-1', entityType: 'Supplier', severity: 'HIGH' },
      ];

      const mockReconciliationService = {
        getPendingDiscrepancies: vi.fn().mockResolvedValueOnce(discrepancies),
      };

      controller['reconciliationService'] = mockReconciliationService;

      await controller.getPendingDiscrepancies(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        discrepancies,
        count: 1,
      });
    });
  });

  describe('applyCorrection', () => {
    it('should apply correction to discrepancy', async () => {
      mockRequest.params = { discrepancyId: 'disc-1' };
      mockRequest.body = { action: 'UPDATE_MES' };

      const mockReconciliationService = {
        applyCorrection: vi.fn().mockResolvedValueOnce(true),
      };

      controller['reconciliationService'] = mockReconciliationService;

      await controller.applyCorrection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        message: 'Correction applied successfully',
      });
    });

    it('should require action', async () => {
      mockRequest.params = { discrepancyId: 'disc-1' };
      mockRequest.body = {}; // Missing action

      await controller.applyCorrection(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });

  // ========================================
  // AVAILABLE ADAPTERS TESTS
  // ========================================

  describe('getAvailableAdapters', () => {
    it('should get available adapters', async () => {
      await controller.getAvailableAdapters(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          adapters: expect.any(Array),
          registeredAdapters: expect.any(Number),
          activeInstances: expect.any(Number),
        })
      );
    });
  });
});
