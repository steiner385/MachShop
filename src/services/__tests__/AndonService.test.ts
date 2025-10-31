/**
 * AndonService Unit Tests
 *
 * Comprehensive unit tests for the AndonService including:
 * - Alert CRUD operations
 * - Issue type management
 * - Escalation rule operations
 * - Configuration management
 * - System statistics and analytics
 * - Validation and error handling
 * - Search and filtering
 *
 * Created for Issue #171: Production Alerts & Andon Core Infrastructure
 */

import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';

// Mock the database module with vi.hoisted to ensure proper mocking order
const mockPrisma = vi.hoisted(() => ({
  andonAlert: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn()
  },
  andonIssueType: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  andonEscalationRule: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn()
  },
  andonConfiguration: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn()
  },
  andonSiteConfiguration: {
    findFirst: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn()
  },
  andonEscalationRuleResult: {
    findMany: vi.fn(),
    create: vi.fn(),
    count: vi.fn(),
    groupBy: vi.fn()
  },
  site: {
    findUnique: vi.fn()
  },
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    findFirst: vi.fn()
  },
  area: {
    findUnique: vi.fn()
  },
  workCenter: {
    findUnique: vi.fn()
  },
  equipment: {
    findUnique: vi.fn()
  },
  workOrder: {
    findUnique: vi.fn()
  },
  operation: {
    findUnique: vi.fn()
  }
}));

vi.mock('../lib/database', () => ({
  default: mockPrisma
}));

import { AndonService } from '../AndonService';
import { CreateAndonAlertData, UpdateAndonAlertData, CreateAndonIssueTypeData } from '../AndonService';
import { AndonSeverity, AndonPriority, AndonAlertStatus } from '@prisma/client';

describe('AndonService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // ANDON ALERT MANAGEMENT
  // ============================================================================

  describe('createAndonAlert', () => {
    const validAlertData: CreateAndonAlertData = {
      title: 'Test Quality Issue',
      description: 'Test description',
      issueTypeId: 'issue-type-123',
      severity: AndonSeverity.HIGH,
      priority: AndonPriority.HIGH,
      raisedById: 'user-123',
      siteId: 'site-123',
      metadata: { source: 'test' }
    };

    const mockIssueType = {
      id: 'issue-type-123',
      typeCode: 'QUALITY',
      typeName: 'Quality Issue',
      defaultSeverity: AndonSeverity.MEDIUM,
      defaultPriority: AndonPriority.NORMAL,
      enableEscalation: true,
      escalationTimeoutMins: 30,
      autoAssignUserId: null,
      autoAssignRole: null,
      isActive: true
    };

    const mockUser = {
      id: 'user-123',
      username: 'testuser',
      isActive: true
    };

    const mockCreatedAlert = {
      id: 'alert-123',
      alertNumber: 'AND-20231031-0001',
      title: validAlertData.title,
      description: validAlertData.description,
      issueTypeId: validAlertData.issueTypeId,
      severity: AndonSeverity.HIGH,
      priority: AndonPriority.HIGH,
      raisedById: validAlertData.raisedById,
      siteId: validAlertData.siteId,
      status: AndonAlertStatus.OPEN,
      currentEscalationLevel: 0,
      statusHistory: [
        {
          status: AndonAlertStatus.OPEN,
          timestamp: new Date().toISOString(),
          userId: validAlertData.raisedById,
          notes: 'Alert created'
        }
      ],
      escalationHistory: [],
      metadata: validAlertData.metadata,
      attachments: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should create alert successfully with valid data', async () => {
      // Mock database calls
      mockPrisma.andonIssueType.findUnique.mockResolvedValue(mockIssueType);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.andonAlert.create.mockResolvedValue(mockCreatedAlert);

      // Mock alert number generation
      mockPrisma.andonAlert.count.mockResolvedValue(0);

      const result = await AndonService.createAndonAlert(validAlertData);

      expect(result).toEqual(mockCreatedAlert);
      expect(mockPrisma.andonIssueType.findUnique).toHaveBeenCalledWith({
        where: { id: validAlertData.issueTypeId, isActive: true }
      });
      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { id: validAlertData.raisedById, isActive: true }
      });
      expect(mockPrisma.andonAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: validAlertData.title,
          description: validAlertData.description,
          issueTypeId: validAlertData.issueTypeId,
          severity: AndonSeverity.HIGH,
          priority: AndonPriority.HIGH,
          raisedById: validAlertData.raisedById,
          status: AndonAlertStatus.OPEN,
          currentEscalationLevel: 0
        })
      });
    });

    test('should use issue type defaults when severity/priority not provided', async () => {
      const alertDataWithoutSeverity = { ...validAlertData };
      delete alertDataWithoutSeverity.severity;
      delete alertDataWithoutSeverity.priority;

      mockPrisma.andonIssueType.findUnique.mockResolvedValue(mockIssueType);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.andonAlert.create.mockResolvedValue(mockCreatedAlert);
      mockPrisma.andonAlert.count.mockResolvedValue(0);

      await AndonService.createAndonAlert(alertDataWithoutSeverity);

      expect(mockPrisma.andonAlert.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          severity: mockIssueType.defaultSeverity,
          priority: mockIssueType.defaultPriority
        })
      });
    });

    test('should throw error for invalid issue type', async () => {
      mockPrisma.andonIssueType.findUnique.mockResolvedValue(null);

      await expect(AndonService.createAndonAlert(validAlertData))
        .rejects
        .toThrow(`Active issue type with ID '${validAlertData.issueTypeId}' not found`);
    });

    test('should throw error for invalid user', async () => {
      mockPrisma.andonIssueType.findUnique.mockResolvedValue(mockIssueType);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(AndonService.createAndonAlert(validAlertData))
        .rejects
        .toThrow(`Active user with ID '${validAlertData.raisedById}' not found`);
    });

    test('should validate optional foreign keys', async () => {
      const alertDataWithSite = {
        ...validAlertData,
        siteId: 'invalid-site'
      };

      mockPrisma.andonIssueType.findUnique.mockResolvedValue(mockIssueType);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.site.findUnique.mockResolvedValue(null);

      await expect(AndonService.createAndonAlert(alertDataWithSite))
        .rejects
        .toThrow(`Site with ID 'invalid-site' not found`);
    });
  });

  describe('getAndonAlertById', () => {
    const alertId = 'alert-123';
    const mockAlert = {
      id: alertId,
      alertNumber: 'AND-20231031-0001',
      title: 'Test Alert',
      status: AndonAlertStatus.OPEN,
      severity: AndonSeverity.HIGH,
      priority: AndonPriority.HIGH,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should return alert by ID without relations', async () => {
      mockPrisma.andonAlert.findUnique.mockResolvedValue(mockAlert);

      const result = await AndonService.getAndonAlertById(alertId, false);

      expect(result).toEqual(mockAlert);
      expect(mockPrisma.andonAlert.findUnique).toHaveBeenCalledWith({
        where: { id: alertId },
        include: undefined
      });
    });

    test('should return alert by ID with relations', async () => {
      const mockAlertWithRelations = {
        ...mockAlert,
        issueType: { id: 'issue-type-123', typeName: 'Quality Issue' },
        raisedBy: { id: 'user-123', username: 'testuser' }
      };

      mockPrisma.andonAlert.findUnique.mockResolvedValue(mockAlertWithRelations);

      const result = await AndonService.getAndonAlertById(alertId, true);

      expect(result).toEqual(mockAlertWithRelations);
      expect(mockPrisma.andonAlert.findUnique).toHaveBeenCalledWith({
        where: { id: alertId },
        include: expect.objectContaining({
          issueType: true,
          raisedBy: expect.any(Object),
          assignedTo: expect.any(Object)
        })
      });
    });

    test('should return null for non-existent alert', async () => {
      mockPrisma.andonAlert.findUnique.mockResolvedValue(null);

      const result = await AndonService.getAndonAlertById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('updateAndonAlert', () => {
    const alertId = 'alert-123';
    const updateData: UpdateAndonAlertData = {
      title: 'Updated Title',
      severity: AndonSeverity.CRITICAL,
      assignedToId: 'user-456'
    };

    const existingAlert = {
      id: alertId,
      title: 'Original Title',
      severity: AndonSeverity.HIGH,
      status: AndonAlertStatus.OPEN,
      statusHistory: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updatedAlert = {
      ...existingAlert,
      ...updateData,
      updatedAt: new Date()
    };

    test('should update alert successfully', async () => {
      mockPrisma.andonAlert.findUnique.mockResolvedValue(existingAlert);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'user-456', isActive: true });
      mockPrisma.andonAlert.update.mockResolvedValue(updatedAlert);

      const result = await AndonService.updateAndonAlert(alertId, updateData);

      expect(result).toEqual(updatedAlert);
      expect(mockPrisma.andonAlert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: expect.objectContaining({
          title: updateData.title,
          severity: updateData.severity,
          assignedToId: updateData.assignedToId
        })
      });
    });

    test('should throw error for non-existent alert', async () => {
      mockPrisma.andonAlert.findUnique.mockResolvedValue(null);

      await expect(AndonService.updateAndonAlert(alertId, updateData))
        .rejects
        .toThrow(`Andon alert with ID '${alertId}' not found`);
    });

    test('should validate assignee when provided', async () => {
      const updateWithInvalidAssignee = {
        assignedToId: 'invalid-user'
      };

      mockPrisma.andonAlert.findUnique.mockResolvedValue(existingAlert);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(AndonService.updateAndonAlert(alertId, updateWithInvalidAssignee))
        .rejects
        .toThrow(`Active user with ID 'invalid-user' not found`);
    });
  });

  describe('closeAndonAlert', () => {
    const alertId = 'alert-123';
    const closedById = 'user-123';
    const resolutionNotes = 'Issue resolved';

    const existingAlert = {
      id: alertId,
      status: AndonAlertStatus.OPEN,
      statusHistory: [],
      createdAt: new Date(),
      resolvedAt: null,
      resolutionTime: null
    };

    test('should close alert successfully', async () => {
      const closedAlert = {
        ...existingAlert,
        status: AndonAlertStatus.CLOSED,
        resolvedAt: new Date(),
        resolvedById: closedById,
        resolutionNotes,
        resolutionTime: 30,
        statusHistory: [
          {
            status: AndonAlertStatus.CLOSED,
            timestamp: expect.any(String),
            userId: closedById,
            notes: resolutionNotes
          }
        ]
      };

      mockPrisma.andonAlert.findUnique.mockResolvedValue(existingAlert);
      mockPrisma.andonAlert.update.mockResolvedValue(closedAlert);

      const result = await AndonService.closeAndonAlert(alertId, closedById, resolutionNotes);

      expect(result).toEqual(closedAlert);
      expect(mockPrisma.andonAlert.update).toHaveBeenCalledWith({
        where: { id: alertId },
        data: expect.objectContaining({
          status: AndonAlertStatus.CLOSED,
          resolvedAt: expect.any(Date),
          resolvedById: closedById,
          resolutionNotes,
          nextEscalationAt: null
        })
      });
    });

    test('should throw error for already closed alert', async () => {
      const closedAlert = { ...existingAlert, status: AndonAlertStatus.CLOSED };
      mockPrisma.andonAlert.findUnique.mockResolvedValue(closedAlert);

      await expect(AndonService.closeAndonAlert(alertId, closedById))
        .rejects
        .toThrow('Alert is already closed');
    });

    test('should throw error for non-existent alert', async () => {
      mockPrisma.andonAlert.findUnique.mockResolvedValue(null);

      await expect(AndonService.closeAndonAlert(alertId, closedById))
        .rejects
        .toThrow(`Andon alert with ID '${alertId}' not found`);
    });
  });

  describe('listAndonAlerts', () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        title: 'Alert 1',
        severity: AndonSeverity.HIGH,
        status: AndonAlertStatus.OPEN,
        createdAt: new Date()
      },
      {
        id: 'alert-2',
        title: 'Alert 2',
        severity: AndonSeverity.MEDIUM,
        status: AndonAlertStatus.IN_PROGRESS,
        createdAt: new Date()
      }
    ];

    test('should list alerts with default pagination', async () => {
      mockPrisma.andonAlert.findMany.mockResolvedValue(mockAlerts);
      mockPrisma.andonAlert.count.mockResolvedValue(2);

      const result = await AndonService.listAndonAlerts();

      expect(result).toEqual({
        alerts: mockAlerts,
        total: 2,
        page: 1,
        pageSize: 20,
        totalPages: 1
      });

      expect(mockPrisma.andonAlert.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should filter alerts by status', async () => {
      const filters = { status: [AndonAlertStatus.OPEN] };

      mockPrisma.andonAlert.findMany.mockResolvedValue([mockAlerts[0]]);
      mockPrisma.andonAlert.count.mockResolvedValue(1);

      const result = await AndonService.listAndonAlerts(filters);

      expect(result.total).toBe(1);
      expect(mockPrisma.andonAlert.findMany).toHaveBeenCalledWith({
        where: { status: { in: [AndonAlertStatus.OPEN] } },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });

    test('should handle pagination correctly', async () => {
      const pagination = { page: 2, pageSize: 10 };

      mockPrisma.andonAlert.findMany.mockResolvedValue(mockAlerts);
      mockPrisma.andonAlert.count.mockResolvedValue(25);

      const result = await AndonService.listAndonAlerts({}, pagination);

      expect(result).toEqual({
        alerts: mockAlerts,
        total: 25,
        page: 2,
        pageSize: 10,
        totalPages: 3
      });

      expect(mockPrisma.andonAlert.findMany).toHaveBeenCalledWith({
        where: {},
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 10,
        take: 10
      });
    });
  });

  // ============================================================================
  // ISSUE TYPE MANAGEMENT
  // ============================================================================

  describe('createAndonIssueType', () => {
    const validIssueTypeData: CreateAndonIssueTypeData = {
      typeCode: 'QUALITY',
      typeName: 'Quality Issue',
      description: 'Quality issues and defects',
      defaultSeverity: AndonSeverity.HIGH,
      defaultPriority: AndonPriority.HIGH,
      createdBy: 'user-123'
    };

    const mockCreatedIssueType = {
      id: 'issue-type-123',
      ...validIssueTypeData,
      requiresAttachment: false,
      requiresWorkOrder: false,
      requiresEquipment: false,
      enableEscalation: true,
      escalationTimeoutMins: 30,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should create issue type successfully', async () => {
      mockPrisma.andonIssueType.findUnique.mockResolvedValue(null);
      mockPrisma.andonIssueType.create.mockResolvedValue(mockCreatedIssueType);

      const result = await AndonService.createAndonIssueType(validIssueTypeData);

      expect(result).toEqual(mockCreatedIssueType);
      expect(mockPrisma.andonIssueType.findUnique).toHaveBeenCalledWith({
        where: { typeCode: validIssueTypeData.typeCode }
      });
      expect(mockPrisma.andonIssueType.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          typeCode: validIssueTypeData.typeCode,
          typeName: validIssueTypeData.typeName,
          defaultSeverity: AndonSeverity.HIGH,
          defaultPriority: AndonPriority.HIGH
        })
      });
    });

    test('should throw error for duplicate type code', async () => {
      mockPrisma.andonIssueType.findUnique.mockResolvedValue(mockCreatedIssueType);

      await expect(AndonService.createAndonIssueType(validIssueTypeData))
        .rejects
        .toThrow(`Issue type with code '${validIssueTypeData.typeCode}' already exists`);
    });
  });

  describe('listAndonIssueTypes', () => {
    const mockIssueTypes = [
      {
        id: 'issue-type-1',
        typeCode: 'QUALITY',
        typeName: 'Quality Issue',
        isActive: true,
        displayOrder: 1
      },
      {
        id: 'issue-type-2',
        typeCode: 'SAFETY',
        typeName: 'Safety Issue',
        isActive: true,
        displayOrder: 2
      }
    ];

    test('should list active issue types by default', async () => {
      mockPrisma.andonIssueType.findMany.mockResolvedValue(mockIssueTypes);

      const result = await AndonService.listAndonIssueTypes();

      expect(result).toEqual(mockIssueTypes);
      expect(mockPrisma.andonIssueType.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: expect.any(Object),
        orderBy: [
          { displayOrder: 'asc' },
          { typeName: 'asc' }
        ]
      });
    });

    test('should filter by site ID', async () => {
      const siteId = 'site-123';
      mockPrisma.andonIssueType.findMany.mockResolvedValue(mockIssueTypes);

      await AndonService.listAndonIssueTypes(siteId);

      expect(mockPrisma.andonIssueType.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { siteId: siteId },
            { siteId: null }
          ]
        },
        include: expect.any(Object),
        orderBy: [
          { displayOrder: 'asc' },
          { typeName: 'asc' }
        ]
      });
    });
  });

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  describe('getConfiguration', () => {
    const configKey = 'andon.system.enabled';
    const siteId = 'site-123';

    test('should return site-specific configuration when available', async () => {
      const siteConfig = {
        configKey,
        configValue: false,
        siteId
      };

      mockPrisma.andonSiteConfiguration.findFirst.mockResolvedValue(siteConfig);

      const result = await AndonService.getConfiguration(configKey, siteId);

      expect(result).toBe(false);
      expect(mockPrisma.andonSiteConfiguration.findFirst).toHaveBeenCalledWith({
        where: {
          siteId,
          configKey,
          isActive: true
        }
      });
    });

    test('should fall back to global configuration', async () => {
      const globalConfig = {
        configKey,
        configValue: true
      };

      mockPrisma.andonSiteConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.andonConfiguration.findUnique.mockResolvedValue(globalConfig);

      const result = await AndonService.getConfiguration(configKey, siteId);

      expect(result).toBe(true);
      expect(mockPrisma.andonConfiguration.findUnique).toHaveBeenCalledWith({
        where: { configKey }
      });
    });

    test('should return null for non-existent configuration', async () => {
      mockPrisma.andonSiteConfiguration.findFirst.mockResolvedValue(null);
      mockPrisma.andonConfiguration.findUnique.mockResolvedValue(null);

      const result = await AndonService.getConfiguration('non.existent.key');

      expect(result).toBeNull();
    });
  });

  // ============================================================================
  // SYSTEM STATISTICS
  // ============================================================================

  describe('getAndonSystemStats', () => {
    test('should return comprehensive system statistics', async () => {
      // Mock database calls for statistics
      mockPrisma.andonAlert.count
        .mockResolvedValueOnce(100) // totalAlerts
        .mockResolvedValueOnce(25)  // openAlerts
        .mockResolvedValueOnce(75); // resolvedAlerts

      mockPrisma.andonAlert.groupBy
        .mockResolvedValueOnce([ // alertsBySeverity
          { severity: AndonSeverity.CRITICAL, _count: { severity: 10 } },
          { severity: AndonSeverity.HIGH, _count: { severity: 30 } }
        ])
        .mockResolvedValueOnce([ // alertsByStatus
          { status: AndonAlertStatus.OPEN, _count: { status: 15 } },
          { status: AndonAlertStatus.RESOLVED, _count: { status: 75 } }
        ])
        .mockResolvedValueOnce([ // alertsByIssueType
          { issueTypeId: 'type-1', _count: { issueTypeId: 50 } },
          { issueTypeId: 'type-2', _count: { issueTypeId: 30 } }
        ]);

      mockPrisma.andonEscalationRuleResult.groupBy.mockResolvedValue([
        { escalationLevel: 1, _count: { escalationLevel: 20 } }
      ]);

      mockPrisma.andonAlert.aggregate.mockResolvedValue({
        _avg: {
          responseTime: 15,
          resolutionTime: 45
        }
      });

      mockPrisma.andonIssueType.findMany.mockResolvedValue([
        { id: 'type-1', typeName: 'Quality Issue' },
        { id: 'type-2', typeName: 'Safety Issue' }
      ]);

      const result = await AndonService.getAndonSystemStats();

      expect(result).toEqual({
        totalAlerts: 100,
        openAlerts: 25,
        resolvedAlerts: 75,
        averageResponseTime: 15,
        averageResolutionTime: 45,
        alertsBySeverity: {
          CRITICAL: 10,
          HIGH: 30,
          MEDIUM: 0,
          LOW: 0
        },
        alertsByStatus: expect.any(Object),
        alertsByIssueType: expect.any(Object),
        escalationStats: {
          totalEscalations: 20,
          escalationsByLevel: { 1: 20 }
        },
        topIssues: expect.any(Array)
      });
    });
  });

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  describe('generateAlertNumber', () => {
    test('should generate unique alert number with date prefix', async () => {
      // Mock the alert count for today
      mockPrisma.andonAlert.count.mockResolvedValue(5);

      // Access the private method through service instance
      const service = new (AndonService as any)();
      const alertNumber = await service.generateAlertNumber();

      const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const expectedNumber = `AND-${today}-0006`;

      expect(alertNumber).toBe(expectedNumber);
    });
  });

  describe('searchAndonAlerts', () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        title: 'Quality Issue',
        description: 'Product defect found',
        alertNumber: 'AND-20231031-0001'
      }
    ];

    test('should search alerts by text term', async () => {
      const searchTerm = 'quality';

      mockPrisma.andonAlert.findMany.mockResolvedValue(mockAlerts);
      mockPrisma.andonAlert.count.mockResolvedValue(1);

      const result = await AndonService.searchAndonAlerts(searchTerm);

      expect(result.alerts).toEqual(mockAlerts);
      expect(mockPrisma.andonAlert.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
            { alertNumber: { contains: searchTerm, mode: 'insensitive' } },
            { resolutionNotes: { contains: searchTerm, mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
        skip: 0,
        take: 20
      });
    });
  });

  describe('getOverdueAlerts', () => {
    const mockOverdueAlerts = [
      {
        id: 'alert-1',
        title: 'Overdue Alert',
        nextEscalationAt: new Date(Date.now() - 60000), // 1 minute ago
        status: AndonAlertStatus.OPEN
      }
    ];

    test('should return overdue alerts', async () => {
      mockPrisma.andonAlert.findMany.mockResolvedValue(mockOverdueAlerts);

      const result = await AndonService.getOverdueAlerts();

      expect(result).toEqual(mockOverdueAlerts);
      expect(mockPrisma.andonAlert.findMany).toHaveBeenCalledWith({
        where: {
          nextEscalationAt: { lt: expect.any(Date) },
          status: {
            in: [AndonAlertStatus.OPEN, AndonAlertStatus.ACKNOWLEDGED, AndonAlertStatus.IN_PROGRESS]
          }
        },
        include: expect.any(Object),
        orderBy: { nextEscalationAt: 'asc' }
      });
    });

    test('should filter overdue alerts by site', async () => {
      const siteId = 'site-123';
      mockPrisma.andonAlert.findMany.mockResolvedValue(mockOverdueAlerts);

      await AndonService.getOverdueAlerts(siteId);

      expect(mockPrisma.andonAlert.findMany).toHaveBeenCalledWith({
        where: {
          nextEscalationAt: { lt: expect.any(Date) },
          status: {
            in: [AndonAlertStatus.OPEN, AndonAlertStatus.ACKNOWLEDGED, AndonAlertStatus.IN_PROGRESS]
          },
          siteId
        },
        include: expect.any(Object),
        orderBy: { nextEscalationAt: 'asc' }
      });
    });
  });
});