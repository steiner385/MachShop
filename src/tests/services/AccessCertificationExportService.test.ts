import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  AccessCertificationExportService,
  CertificationExportType,
  ExportFormat,
  ExportStatus,
  RiskLevel,
  CertificationScope,
  CertificationFilters,
  CertificationExportParameters
} from '../../services/AccessCertificationExportService';
import { SaviyntApiClient } from '../../services/SaviyntApiClient';
import { SaviyntCertificationStatus, SaviyntEntityType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('../../services/SaviyntApiClient');
vi.mock('fs');
vi.mock('../../config/config', () => ({
  config: {
    saviynt: {
      enabled: true
    },
    upload: {
      path: '/tmp/uploads'
    }
  }
}));

describe('AccessCertificationExportService', () => {
  let service: AccessCertificationExportService;
  let mockPrisma: any;
  let mockSaviyntClient: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      user: {
        findMany: vi.fn()
      },
      role: {
        findMany: vi.fn()
      },
      userRole: {
        findMany: vi.fn()
      },
      saviyntCertification: {
        findMany: vi.fn()
      },
      permission: {
        findMany: vi.fn()
      }
    };

    // Mock Saviynt API client
    mockSaviyntClient = {
      getCertificationCampaigns: vi.fn(),
      getCertificationItems: vi.fn(),
      getUserAccess: vi.fn()
    };

    // Mock file system
    vi.mocked(fs.createWriteStream).mockReturnValue({
      write: vi.fn(),
      end: vi.fn(),
      on: vi.fn()
    } as any);

    vi.mocked(fs.promises.mkdir).mockResolvedValue(undefined);
    vi.mocked(fs.promises.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.promises.stat).mockResolvedValue({ size: 1024 } as any);

    service = new AccessCertificationExportService(mockPrisma as PrismaClient, mockSaviyntClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize service with correct configuration', () => {
      expect(service['isEnabled']).toBe(true);
      expect(service['exportDirectory']).toBe('/tmp/uploads/exports');
      expect(service['activeExports']).toBeInstanceOf(Map);
    });

    it('should handle disabled state', () => {
      vi.mocked(vi.importActual('../../config/config')).mockReturnValue({
        config: { saviynt: { enabled: false }, upload: { path: '/tmp' } }
      });

      const disabledService = new AccessCertificationExportService(mockPrisma, mockSaviyntClient);
      expect(disabledService['isEnabled']).toBe(false);
    });
  });

  describe('Export Request Creation', () => {
    const mockScope: CertificationScope = {
      includeUsers: true,
      includeRoles: true,
      includePermissions: true,
      includeApplications: false,
      includeEntitlements: false,
      includeMESData: true,
      includeSaviyntData: true,
      includeInactiveRecords: false,
      departments: ['IT', 'Finance'],
      riskLevels: [RiskLevel.HIGH, RiskLevel.CRITICAL]
    };

    const mockFilters: CertificationFilters = {
      userIds: ['user1', 'user2'],
      departments: ['IT'],
      hasPrivilegedAccess: true,
      hasViolations: true
    };

    const mockParameters: CertificationExportParameters = {
      includeHeaders: true,
      includeMetadata: true,
      includeSignatures: false,
      includeApprovals: true,
      includeComments: true,
      maskSensitiveData: false,
      encryptOutput: false,
      maxRecords: 10000,
      chunkSize: 1000
    };

    it('should create export request successfully', async () => {
      const createRequestSpy = vi.spyOn(service as any, 'createExportRequest').mockResolvedValue({
        id: 'export-123',
        requestedBy: 'admin',
        requestedAt: new Date(),
        exportType: CertificationExportType.USER_ACCESS_REPORT,
        format: ExportFormat.CSV,
        scope: mockScope,
        filters: mockFilters,
        status: ExportStatus.REQUESTED,
        parameters: mockParameters
      });

      const request = await service['createExportRequest'](
        CertificationExportType.USER_ACCESS_REPORT,
        ExportFormat.CSV,
        mockScope,
        mockFilters,
        mockParameters,
        'admin'
      );

      expect(request.id).toBe('export-123');
      expect(request.status).toBe(ExportStatus.REQUESTED);
      expect(request.exportType).toBe(CertificationExportType.USER_ACCESS_REPORT);
      expect(request.format).toBe(ExportFormat.CSV);
    });

    it('should queue export request for processing', async () => {
      const request = {
        id: 'export-123',
        status: ExportStatus.REQUESTED,
        exportType: CertificationExportType.USER_ACCESS_REPORT,
        format: ExportFormat.CSV
      };

      const processExportSpy = vi.spyOn(service as any, 'processExportRequest').mockResolvedValue(undefined);

      await service['queueExportRequest'](request as any);

      expect(request.status).toBe(ExportStatus.QUEUED);
      expect(processExportSpy).toHaveBeenCalledWith('export-123');
    });

    it('should handle export request validation', async () => {
      const invalidScope = {
        ...mockScope,
        includeUsers: false,
        includeRoles: false,
        includePermissions: false
      };

      const validateSpy = vi.spyOn(service as any, 'validateExportRequest').mockReturnValue({
        isValid: false,
        errors: ['At least one data type must be included']
      });

      const validation = service['validateExportRequest'](
        CertificationExportType.USER_ACCESS_REPORT,
        invalidScope,
        mockFilters,
        mockParameters
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors).toContain('At least one data type must be included');
    });
  });

  describe('Data Gathering', () => {
    beforeEach(() => {
      mockPrisma.user.findMany.mockResolvedValue([
        {
          id: 'user1',
          username: 'testuser1',
          email: 'test1@example.com',
          firstName: 'Test',
          lastName: 'User1',
          department: 'IT',
          isActive: true,
          lastLoginAt: new Date('2023-12-01'),
          employeeNumber: 'EMP001',
          userRoles: [
            {
              roleId: 'role1',
              assignedAt: new Date('2023-01-01'),
              assignedBy: 'admin',
              role: {
                roleCode: 'ADMIN',
                roleName: 'Administrator',
                permissions: [
                  { permission: { permissionCode: 'ALL_ACCESS', permissionName: 'Full Access' } }
                ]
              }
            }
          ]
        }
      ]);

      mockSaviyntClient.getUserAccess.mockResolvedValue([
        {
          userkey: 'saviynt-user1',
          username: 'testuser1',
          applications: [
            {
              applicationName: 'SAP',
              accountName: 'sap-account1',
              permissions: ['SAP_READ', 'SAP_WRITE']
            }
          ]
        }
      ]);
    });

    it('should gather user access data successfully', async () => {
      const scope: CertificationScope = {
        includeUsers: true,
        includeRoles: true,
        includePermissions: true,
        includeApplications: true,
        includeEntitlements: false,
        includeMESData: true,
        includeSaviyntData: true,
        includeInactiveRecords: false
      };

      const filters: CertificationFilters = {
        departments: ['IT']
      };

      const userData = await service['gatherUserAccessData'](scope, filters);

      expect(userData).toHaveLength(1);
      expect(userData[0].userId).toBe('user1');
      expect(userData[0].username).toBe('testuser1');
      expect(userData[0].roles).toHaveLength(1);
      expect(userData[0].roles[0].roleCode).toBe('ADMIN');
      expect(userData[0].applications).toHaveLength(1);
      expect(userData[0].applications[0].applicationName).toBe('SAP');
    });

    it('should gather role assignment data', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          userId: 'user1',
          roleId: 'role1',
          assignedAt: new Date('2023-01-01'),
          assignedBy: 'admin',
          user: {
            username: 'testuser1',
            firstName: 'Test',
            lastName: 'User1',
            department: 'IT'
          },
          role: {
            roleCode: 'ADMIN',
            roleName: 'Administrator',
            description: 'Full system access'
          }
        }
      ]);

      const scope: CertificationScope = {
        includeUsers: false,
        includeRoles: true,
        includePermissions: false,
        includeApplications: false,
        includeEntitlements: false,
        includeMESData: true,
        includeSaviyntData: false,
        includeInactiveRecords: false
      };

      const roleData = await service['gatherRoleAssignmentData'](scope, {});

      expect(roleData).toHaveLength(1);
      expect(roleData[0].userId).toBe('user1');
      expect(roleData[0].roleId).toBe('role1');
      expect(roleData[0].roleCode).toBe('ADMIN');
    });

    it('should gather certification campaign data', async () => {
      mockSaviyntClient.getCertificationCampaigns.mockResolvedValue([
        {
          campaignId: 'camp1',
          campaignName: 'Q4 Certification',
          status: SaviyntCertificationStatus.IN_PROGRESS,
          startDate: new Date('2023-10-01'),
          endDate: new Date('2023-12-31'),
          totalItems: 100,
          certifiedItems: 75,
          pendingItems: 20,
          rejectedItems: 5
        }
      ]);

      const scope: CertificationScope = {
        includeUsers: false,
        includeRoles: false,
        includePermissions: false,
        includeApplications: false,
        includeEntitlements: false,
        includeMESData: false,
        includeSaviyntData: true,
        includeInactiveRecords: false
      };

      const campaignData = await service['gatherCertificationCampaignData'](scope, {});

      expect(campaignData).toHaveLength(1);
      expect(campaignData[0].campaignId).toBe('camp1');
      expect(campaignData[0].campaignName).toBe('Q4 Certification');
      expect(campaignData[0].totalItems).toBe(100);
    });

    it('should apply filters correctly', async () => {
      const scope: CertificationScope = {
        includeUsers: true,
        includeRoles: false,
        includePermissions: false,
        includeApplications: false,
        includeEntitlements: false,
        includeMESData: true,
        includeSaviyntData: false,
        includeInactiveRecords: false
      };

      const filters: CertificationFilters = {
        departments: ['Finance'], // Different from IT
        hasPrivilegedAccess: true
      };

      await service['gatherUserAccessData'](scope, filters);

      expect(mockPrisma.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            department: { in: ['Finance'] },
            isActive: true
          })
        })
      );
    });
  });

  describe('Export Processing', () => {
    const mockRequest = {
      id: 'export-123',
      requestedBy: 'admin',
      requestedAt: new Date(),
      exportType: CertificationExportType.USER_ACCESS_REPORT,
      format: ExportFormat.CSV,
      scope: {
        includeUsers: true,
        includeRoles: true,
        includePermissions: true,
        includeApplications: false,
        includeEntitlements: false,
        includeMESData: true,
        includeSaviyntData: true,
        includeInactiveRecords: false
      } as CertificationScope,
      filters: {},
      status: ExportStatus.QUEUED,
      parameters: {
        includeHeaders: true,
        includeMetadata: true,
        includeSignatures: false,
        includeApprovals: true,
        includeComments: true,
        maskSensitiveData: false,
        encryptOutput: false
      } as CertificationExportParameters
    };

    it('should process export request successfully', async () => {
      const gatherDataSpy = vi.spyOn(service as any, 'gatherExportData').mockResolvedValue({
        users: [{ userId: 'user1', username: 'testuser1' }],
        roles: [],
        campaigns: []
      });

      const generateFileSpy = vi.spyOn(service as any, 'generateExportFile').mockResolvedValue({
        filePath: '/tmp/exports/export-123.csv',
        fileSize: 1024
      });

      await service['processExportRequest']('export-123');

      const request = service['activeExports'].get('export-123');
      expect(request?.status).toBe(ExportStatus.COMPLETED);
      expect(request?.outputLocation).toBe('/tmp/exports/export-123.csv');
      expect(request?.fileSize).toBe(1024);
      expect(request?.completedAt).toBeInstanceOf(Date);

      expect(gatherDataSpy).toHaveBeenCalledWith(mockRequest.scope, mockRequest.filters);
      expect(generateFileSpy).toHaveBeenCalled();
    });

    it('should handle export processing failure', async () => {
      service['activeExports'].set('export-123', { ...mockRequest } as any);

      vi.spyOn(service as any, 'gatherExportData').mockRejectedValue(new Error('Data gathering failed'));

      await service['processExportRequest']('export-123');

      const request = service['activeExports'].get('export-123');
      expect(request?.status).toBe(ExportStatus.FAILED);
      expect(request?.errorMessage).toBe('Data gathering failed');
    });

    it('should update export status during processing', async () => {
      service['activeExports'].set('export-123', { ...mockRequest } as any);

      const gatherDataSpy = vi.spyOn(service as any, 'gatherExportData').mockImplementation(async () => {
        const request = service['activeExports'].get('export-123')!;
        expect(request.status).toBe(ExportStatus.IN_PROGRESS);
        return { users: [], roles: [], campaigns: [] };
      });

      vi.spyOn(service as any, 'generateExportFile').mockResolvedValue({
        filePath: '/tmp/exports/export-123.csv',
        fileSize: 1024
      });

      await service['processExportRequest']('export-123');

      expect(gatherDataSpy).toHaveBeenCalled();
    });
  });

  describe('File Generation', () => {
    const mockData = {
      users: [
        {
          userId: 'user1',
          username: 'testuser1',
          email: 'test1@example.com',
          firstName: 'Test',
          lastName: 'User1',
          department: 'IT',
          roles: [
            {
              roleCode: 'ADMIN',
              roleName: 'Administrator',
              assignedAt: new Date('2023-01-01')
            }
          ]
        }
      ],
      roles: [],
      campaigns: []
    };

    it('should generate CSV file successfully', async () => {
      const mockWriteStream = {
        write: vi.fn(),
        end: vi.fn(),
        on: vi.fn()
      };

      vi.mocked(fs.createWriteStream).mockReturnValue(mockWriteStream as any);

      const result = await service['generateCSVFile'](mockData, '/tmp/exports/test.csv', {
        includeHeaders: true,
        includeMetadata: true
      } as any);

      expect(result.filePath).toBe('/tmp/exports/test.csv');
      expect(mockWriteStream.write).toHaveBeenCalled();
      expect(mockWriteStream.end).toHaveBeenCalled();
    });

    it('should generate JSON file successfully', async () => {
      const result = await service['generateJSONFile'](mockData, '/tmp/exports/test.json', {
        includeMetadata: true
      } as any);

      expect(result.filePath).toBe('/tmp/exports/test.json');
      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        '/tmp/exports/test.json',
        expect.stringContaining('"userId":"user1"'),
        'utf-8'
      );
    });

    it('should handle file generation errors', async () => {
      vi.mocked(fs.promises.writeFile).mockRejectedValue(new Error('Disk full'));

      await expect(service['generateJSONFile'](mockData, '/tmp/exports/test.json', {} as any))
        .rejects.toThrow('Disk full');
    });

    it('should apply data masking when enabled', async () => {
      const sensitiveData = {
        users: [
          {
            userId: 'user1',
            username: 'testuser1',
            email: 'sensitive@example.com',
            ssn: '123-45-6789'
          }
        ],
        roles: [],
        campaigns: []
      };

      const maskDataSpy = vi.spyOn(service as any, 'maskSensitiveData').mockReturnValue({
        users: [
          {
            userId: 'user1',
            username: 'testuser1',
            email: '****@example.com',
            ssn: '***-**-****'
          }
        ],
        roles: [],
        campaigns: []
      });

      await service['generateJSONFile'](sensitiveData, '/tmp/exports/test.json', {
        maskSensitiveData: true
      } as any);

      expect(maskDataSpy).toHaveBeenCalledWith(sensitiveData);
    });
  });

  describe('Export Status Management', () => {
    beforeEach(() => {
      service['activeExports'].set('export-123', {
        id: 'export-123',
        status: ExportStatus.COMPLETED,
        outputLocation: '/tmp/exports/test.csv',
        downloadUrl: '/api/exports/download/export-123',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      } as any);

      service['activeExports'].set('export-456', {
        id: 'export-456',
        status: ExportStatus.IN_PROGRESS
      } as any);
    });

    it('should get export status correctly', () => {
      const status = service.getExportStatus('export-123');

      expect(status?.id).toBe('export-123');
      expect(status?.status).toBe(ExportStatus.COMPLETED);
      expect(status?.downloadUrl).toBe('/api/exports/download/export-123');
    });

    it('should return null for non-existent export', () => {
      const status = service.getExportStatus('nonexistent');
      expect(status).toBeNull();
    });

    it('should list active exports', () => {
      const activeExports = service.getActiveExports();

      expect(activeExports).toHaveLength(2);
      expect(activeExports.some(exp => exp.id === 'export-123')).toBe(true);
      expect(activeExports.some(exp => exp.id === 'export-456')).toBe(true);
    });

    it('should cancel export request', async () => {
      const result = await service.cancelExport('export-456', 'admin');

      expect(result.success).toBe(true);
      const request = service['activeExports'].get('export-456');
      expect(request?.status).toBe(ExportStatus.CANCELLED);
    });

    it('should handle cancel non-existent export', async () => {
      const result = await service.cancelExport('nonexistent', 'admin');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Export request not found');
    });

    it('should handle cancel completed export', async () => {
      const result = await service.cancelExport('export-123', 'admin');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Cannot cancel completed export');
    });
  });

  describe('Export Cleanup', () => {
    beforeEach(() => {
      const expiredDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

      service['activeExports'].set('expired-export', {
        id: 'expired-export',
        status: ExportStatus.COMPLETED,
        expiresAt: expiredDate,
        outputLocation: '/tmp/exports/expired.csv'
      } as any);

      service['activeExports'].set('valid-export', {
        id: 'valid-export',
        status: ExportStatus.COMPLETED,
        expiresAt: futureDate,
        outputLocation: '/tmp/exports/valid.csv'
      } as any);
    });

    it('should clean up expired exports', async () => {
      const unlinkSpy = vi.spyOn(fs.promises, 'unlink').mockResolvedValue(undefined);

      await service['cleanupExpiredExports']();

      expect(unlinkSpy).toHaveBeenCalledWith('/tmp/exports/expired.csv');
      expect(service['activeExports'].has('expired-export')).toBe(false);
      expect(service['activeExports'].has('valid-export')).toBe(true);
    });

    it('should handle cleanup errors gracefully', async () => {
      vi.spyOn(fs.promises, 'unlink').mockRejectedValue(new Error('File not found'));

      await expect(service['cleanupExpiredExports']()).resolves.not.toThrow();
      expect(service['activeExports'].has('expired-export')).toBe(false);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(() => {
      service['activeExports'].set('export1', {
        status: ExportStatus.COMPLETED,
        exportType: CertificationExportType.USER_ACCESS_REPORT,
        recordCount: 1000
      } as any);

      service['activeExports'].set('export2', {
        status: ExportStatus.IN_PROGRESS,
        exportType: CertificationExportType.ROLE_ASSIGNMENT_REPORT
      } as any);

      service['activeExports'].set('export3', {
        status: ExportStatus.FAILED,
        exportType: CertificationExportType.USER_ACCESS_REPORT
      } as any);
    });

    it('should return export statistics', () => {
      const stats = service.getExportStatistics();

      expect(stats.totalExports).toBe(3);
      expect(stats.statusBreakdown[ExportStatus.COMPLETED]).toBe(1);
      expect(stats.statusBreakdown[ExportStatus.IN_PROGRESS]).toBe(1);
      expect(stats.statusBreakdown[ExportStatus.FAILED]).toBe(1);
      expect(stats.typeBreakdown[CertificationExportType.USER_ACCESS_REPORT]).toBe(2);
      expect(stats.typeBreakdown[CertificationExportType.ROLE_ASSIGNMENT_REPORT]).toBe(1);
      expect(stats.totalRecordsExported).toBe(1000);
    });

    it('should return performance metrics', () => {
      const metrics = service.getPerformanceMetrics();

      expect(metrics).toHaveProperty('activeExports');
      expect(metrics).toHaveProperty('completedExports');
      expect(metrics).toHaveProperty('failedExports');
      expect(metrics).toHaveProperty('averageProcessingTime');
    });
  });

  describe('Error Handling', () => {
    it('should handle service disabled state', async () => {
      service['isEnabled'] = false;

      await expect(service['createExportRequest'](
        CertificationExportType.USER_ACCESS_REPORT,
        ExportFormat.CSV,
        {} as any,
        {},
        {} as any,
        'admin'
      )).rejects.toThrow('Access certification export service is disabled');
    });

    it('should handle invalid export parameters', () => {
      const validation = service['validateExportRequest'](
        CertificationExportType.USER_ACCESS_REPORT,
        { includeUsers: false, includeRoles: false } as any,
        {},
        {} as any
      );

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });

    it('should handle data gathering errors gracefully', async () => {
      mockPrisma.user.findMany.mockRejectedValue(new Error('Database connection lost'));

      await expect(service['gatherUserAccessData']({} as any, {}))
        .rejects.toThrow('Database connection lost');
    });

    it('should handle file system errors during export', async () => {
      vi.mocked(fs.promises.mkdir).mockRejectedValue(new Error('Permission denied'));

      await expect(service['ensureExportDirectory']())
        .rejects.toThrow('Permission denied');
    });
  });
});