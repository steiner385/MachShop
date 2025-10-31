import { PrismaClient } from '@prisma/client';
import { SaviyntApiClient } from './SaviyntApiClient';
import { logger } from '../utils/logger';
import { config } from '../config/config';
import { createWriteStream, promises as fs } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';
import {
  SaviyntCertificationStatus,
  SaviyntEntityType
} from '@prisma/client';

export interface CertificationExportRequest {
  id: string;
  requestedBy: string;
  requestedAt: Date;
  exportType: CertificationExportType;
  format: ExportFormat;
  scope: CertificationScope;
  filters: CertificationFilters;
  status: ExportStatus;
  parameters: CertificationExportParameters;
  outputLocation?: string;
  downloadUrl?: string;
  expiresAt?: Date;
  completedAt?: Date;
  errorMessage?: string;
  recordCount?: number;
  fileSize?: number;
}

export enum CertificationExportType {
  USER_ACCESS_REPORT = 'USER_ACCESS_REPORT',
  ROLE_ASSIGNMENT_REPORT = 'ROLE_ASSIGNMENT_REPORT',
  PERMISSION_MATRIX = 'PERMISSION_MATRIX',
  SEGREGATION_VIOLATIONS = 'SEGREGATION_VIOLATIONS',
  DORMANT_ACCOUNTS = 'DORMANT_ACCOUNTS',
  PRIVILEGED_ACCESS = 'PRIVILEGED_ACCESS',
  CERTIFICATION_CAMPAIGN = 'CERTIFICATION_CAMPAIGN',
  COMPLIANCE_ATTESTATION = 'COMPLIANCE_ATTESTATION',
  RISK_ASSESSMENT = 'RISK_ASSESSMENT',
  AUDIT_TRAIL = 'AUDIT_TRAIL'
}

export enum ExportFormat {
  CSV = 'CSV',
  XLSX = 'XLSX',
  JSON = 'JSON',
  PDF = 'PDF',
  XML = 'XML'
}

export interface CertificationScope {
  includeUsers: boolean;
  includeRoles: boolean;
  includePermissions: boolean;
  includeApplications: boolean;
  includeEntitlements: boolean;
  includeMESData: boolean;
  includeSaviyntData: boolean;
  includeInactiveRecords: boolean;
  dateRange?: DateRange;
  departments?: string[];
  locations?: string[];
  riskLevels?: RiskLevel[];
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export enum RiskLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface CertificationFilters {
  userIds?: string[];
  roleIds?: string[];
  departments?: string[];
  certificationStatus?: SaviyntCertificationStatus[];
  lastLoginBefore?: Date;
  lastLoginAfter?: Date;
  createdBefore?: Date;
  createdAfter?: Date;
  hasPrivilegedAccess?: boolean;
  hasExpiredCertifications?: boolean;
  hasViolations?: boolean;
  customFilter?: string;
}

export interface CertificationExportParameters {
  includeHeaders: boolean;
  includeMetadata: boolean;
  includeSignatures: boolean;
  includeApprovals: boolean;
  includeComments: boolean;
  maskSensitiveData: boolean;
  encryptOutput: boolean;
  encryptionKey?: string;
  watermark?: string;
  maxRecords?: number;
  chunkSize?: number;
}

export enum ExportStatus {
  REQUESTED = 'REQUESTED',
  QUEUED = 'QUEUED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED'
}

export interface UserAccessRecord {
  userId: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  department: string;
  title?: string;
  manager?: string;
  employeeId: string;
  isActive: boolean;
  lastLoginAt?: Date;
  roles: RoleAccessRecord[];
  directPermissions: PermissionRecord[];
  applications: ApplicationAccessRecord[];
  riskScore: number;
  certificationStatus: SaviyntCertificationStatus;
  lastCertificationDate?: Date;
  nextCertificationDue?: Date;
  violations: ViolationRecord[];
}

export interface RoleAccessRecord {
  roleId: string;
  roleCode: string;
  roleName: string;
  assignedAt: Date;
  assignedBy: string;
  expiresAt?: Date;
  source: 'MES' | 'SAVIYNT' | 'INHERITED';
  permissions: PermissionRecord[];
  riskLevel: RiskLevel;
  isCertified: boolean;
  lastCertificationDate?: Date;
}

export interface PermissionRecord {
  permissionId: string;
  permissionCode: string;
  permissionName: string;
  category: string;
  riskLevel: RiskLevel;
  source: 'DIRECT' | 'ROLE' | 'INHERITED';
  grantedThrough?: string;
}

export interface ApplicationAccessRecord {
  applicationId: string;
  applicationName: string;
  accountId?: string;
  accountName?: string;
  accessType: string;
  permissions: string[];
  lastAccessDate?: Date;
  isActive: boolean;
  provisionedAt: Date;
  provisionedBy: string;
}

export interface ViolationRecord {
  violationId: string;
  violationType: 'SOD' | 'EXCESSIVE_PRIVILEGE' | 'DORMANT_ACCOUNT' | 'EXPIRED_CERTIFICATION';
  description: string;
  severity: RiskLevel;
  detectedAt: Date;
  status: 'OPEN' | 'ACKNOWLEDGED' | 'RESOLVED' | 'IGNORED';
  resolvedAt?: Date;
  resolvedBy?: string;
}

export interface CertificationCampaignRecord {
  campaignId: string;
  campaignName: string;
  description: string;
  certifier: string;
  certifierType: 'MANAGER' | 'APPLICATION_OWNER' | 'SECURITY_ADMIN';
  scope: string;
  startDate: Date;
  endDate: Date;
  status: SaviyntCertificationStatus;
  totalItems: number;
  certifiedItems: number;
  pendingItems: number;
  rejectedItems: number;
  participationRate: number;
  completionRate: number;
  items: CertificationItemRecord[];
}

export interface CertificationItemRecord {
  itemId: string;
  itemType: SaviyntEntityType;
  itemName: string;
  user: {
    userId: string;
    username: string;
    name: string;
    department: string;
  };
  access: {
    type: string;
    name: string;
    description: string;
    riskLevel: RiskLevel;
  };
  certification: {
    status: SaviyntCertificationStatus;
    certifier: string;
    certifiedAt?: Date;
    decision?: 'APPROVE' | 'REVOKE' | 'MODIFY';
    comments?: string;
  };
  businessJustification?: string;
  lastReviewDate?: Date;
  nextReviewDate?: Date;
}

export class AccessCertificationExportService {
  private prisma: PrismaClient;
  private saviyntClient: SaviyntApiClient;
  private isEnabled: boolean;
  private exportDirectory: string;
  private activeExports: Map<string, CertificationExportRequest> = new Map();

  constructor(prisma: PrismaClient, saviyntClient: SaviyntApiClient) {
    this.prisma = prisma;
    this.saviyntClient = saviyntClient;
    this.isEnabled = config.saviynt.enabled;
    this.exportDirectory = config.upload.path + '/exports';
  }

  /**
   * Initialize the access certification export service
   */
  public async initialize(): Promise<void> {
    if (!this.isEnabled) {
      logger.info('Access certification export service is disabled (Saviynt integration disabled)');
      return;
    }

    try {
      // Ensure export directory exists
      await fs.mkdir(this.exportDirectory, { recursive: true });

      // Load pending exports
      await this.loadPendingExports();

      // Schedule cleanup of expired exports
      this.scheduleCleanupTasks();

      logger.info('Access certification export service initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize access certification export service', { error });
      throw error;
    }
  }

  /**
   * Request a new certification export
   */
  public async requestExport(
    exportType: CertificationExportType,
    format: ExportFormat,
    scope: CertificationScope,
    filters: CertificationFilters,
    parameters: CertificationExportParameters,
    requestedBy: string
  ): Promise<CertificationExportRequest> {
    try {
      const requestId = `export-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      const exportRequest: CertificationExportRequest = {
        id: requestId,
        requestedBy,
        requestedAt: new Date(),
        exportType,
        format,
        scope,
        filters,
        parameters,
        status: ExportStatus.REQUESTED,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days expiry
      };

      this.activeExports.set(requestId, exportRequest);

      // Process export asynchronously
      this.processExportAsync(requestId);

      logger.info('Export request created', {
        requestId,
        exportType,
        format,
        requestedBy
      });

      return exportRequest;

    } catch (error) {
      logger.error('Failed to create export request', {
        exportType,
        format,
        requestedBy,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Process export request asynchronously
   */
  private async processExportAsync(requestId: string): Promise<void> {
    const request = this.activeExports.get(requestId);
    if (!request) {
      logger.error('Export request not found', { requestId });
      return;
    }

    try {
      request.status = ExportStatus.IN_PROGRESS;

      switch (request.exportType) {
        case CertificationExportType.USER_ACCESS_REPORT:
          await this.generateUserAccessReport(request);
          break;

        case CertificationExportType.ROLE_ASSIGNMENT_REPORT:
          await this.generateRoleAssignmentReport(request);
          break;

        case CertificationExportType.PERMISSION_MATRIX:
          await this.generatePermissionMatrix(request);
          break;

        case CertificationExportType.SEGREGATION_VIOLATIONS:
          await this.generateSegregationViolationsReport(request);
          break;

        case CertificationExportType.DORMANT_ACCOUNTS:
          await this.generateDormantAccountsReport(request);
          break;

        case CertificationExportType.PRIVILEGED_ACCESS:
          await this.generatePrivilegedAccessReport(request);
          break;

        case CertificationExportType.CERTIFICATION_CAMPAIGN:
          await this.generateCertificationCampaignReport(request);
          break;

        case CertificationExportType.COMPLIANCE_ATTESTATION:
          await this.generateComplianceAttestationReport(request);
          break;

        case CertificationExportType.RISK_ASSESSMENT:
          await this.generateRiskAssessmentReport(request);
          break;

        case CertificationExportType.AUDIT_TRAIL:
          await this.generateAuditTrailReport(request);
          break;

        default:
          throw new Error(`Unsupported export type: ${request.exportType}`);
      }

      request.status = ExportStatus.COMPLETED;
      request.completedAt = new Date();

      logger.info('Export completed successfully', {
        requestId,
        exportType: request.exportType,
        recordCount: request.recordCount,
        fileSize: request.fileSize
      });

    } catch (error) {
      request.status = ExportStatus.FAILED;
      request.errorMessage = error instanceof Error ? error.message : 'Unknown error';

      logger.error('Export failed', {
        requestId,
        exportType: request.exportType,
        error: request.errorMessage
      });
    }
  }

  /**
   * Generate user access report
   */
  private async generateUserAccessReport(request: CertificationExportRequest): Promise<void> {
    const users = await this.prisma.user.findMany({
      where: this.buildUserFilter(request.filters),
      include: {
        userRoles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } }
              }
            }
          }
        },
        saviyntUserMapping: true
      }
    });

    const userAccessRecords: UserAccessRecord[] = [];

    for (const user of users) {
      const roles: RoleAccessRecord[] = user.userRoles.map(ur => ({
        roleId: ur.role.id,
        roleCode: ur.role.roleCode,
        roleName: ur.role.roleName,
        assignedAt: ur.assignedAt,
        assignedBy: ur.assignedBy || 'SYSTEM',
        expiresAt: ur.expiresAt || undefined,
        source: 'MES',
        permissions: ur.role.permissions.map(rp => ({
          permissionId: rp.permission.id,
          permissionCode: rp.permission.permissionCode,
          permissionName: rp.permission.permissionName,
          category: rp.permission.category || 'GENERAL',
          riskLevel: this.calculatePermissionRisk(rp.permission.permissionCode),
          source: 'ROLE',
          grantedThrough: ur.role.roleCode
        })),
        riskLevel: this.calculateRoleRisk(ur.role.roleCode),
        isCertified: false, // Would be determined by certification data
        lastCertificationDate: undefined
      }));

      // Get all permissions (flattened from roles)
      const allPermissions = roles.flatMap(role => role.permissions);

      const record: UserAccessRecord = {
        userId: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        department: user.department || '',
        title: undefined,
        manager: undefined,
        employeeId: user.employeeNumber || '',
        isActive: user.isActive,
        lastLoginAt: user.lastLoginAt || undefined,
        roles,
        directPermissions: [], // User doesn't have direct permissions in this model
        applications: [], // Would be populated from application access data
        riskScore: this.calculateUserRiskScore(roles),
        certificationStatus: SaviyntCertificationStatus.PENDING,
        lastCertificationDate: undefined,
        nextCertificationDue: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days
        violations: [] // Would be populated with actual violations
      };

      userAccessRecords.push(record);
    }

    // Export the data
    const filename = await this.exportData(
      userAccessRecords,
      request,
      'user_access_report'
    );

    request.outputLocation = filename;
    request.recordCount = userAccessRecords.length;
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Generate role assignment report
   */
  private async generateRoleAssignmentReport(request: CertificationExportRequest): Promise<void> {
    const roleAssignments = await this.prisma.userRole.findMany({
      include: {
        user: true,
        role: {
          include: {
            permissions: { include: { permission: true } }
          }
        }
      },
      where: {
        user: this.buildUserFilter(request.filters)
      }
    });

    const reportData = roleAssignments.map(assignment => ({
      userId: assignment.user.id,
      username: assignment.user.username,
      userEmail: assignment.user.email,
      userDepartment: assignment.user.department,
      roleId: assignment.role.id,
      roleCode: assignment.role.roleCode,
      roleName: assignment.role.roleName,
      roleDescription: assignment.role.description,
      assignedAt: assignment.assignedAt,
      assignedBy: assignment.assignedBy,
      expiresAt: assignment.expiresAt,
      isActive: assignment.role.isActive,
      permissionCount: assignment.role.permissions.length,
      permissions: assignment.role.permissions.map(rp => rp.permission.permissionCode).join(', '),
      riskLevel: this.calculateRoleRisk(assignment.role.roleCode)
    }));

    const filename = await this.exportData(reportData, request, 'role_assignment_report');
    request.outputLocation = filename;
    request.recordCount = reportData.length;
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Generate permission matrix
   */
  private async generatePermissionMatrix(request: CertificationExportRequest): Promise<void> {
    const roles = await this.prisma.role.findMany({
      where: { isActive: true },
      include: {
        permissions: { include: { permission: true } }
      }
    });

    const permissions = await this.prisma.permission.findMany({
      where: { isActive: true }
    });

    // Create matrix structure
    const matrix = [];
    const header = ['Role Code', 'Role Name', ...permissions.map(p => p.permissionCode)];
    matrix.push(header);

    for (const role of roles) {
      const row = [role.roleCode, role.roleName];
      const rolePermissions = role.permissions.map(rp => rp.permission.permissionCode);

      for (const permission of permissions) {
        row.push(rolePermissions.includes(permission.permissionCode) ? 'X' : '');
      }

      matrix.push(row);
    }

    const filename = await this.exportData(matrix, request, 'permission_matrix');
    request.outputLocation = filename;
    request.recordCount = matrix.length - 1; // Exclude header
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Generate segregation violations report
   */
  private async generateSegregationViolationsReport(request: CertificationExportRequest): Promise<void> {
    // This would implement sophisticated SOD violation detection
    const violations = [
      {
        userId: 'example-user-1',
        username: 'jdoe',
        violationType: 'SOD',
        conflictingRoles: ['ADMIN', 'AUDITOR'],
        severity: 'CRITICAL',
        detectedAt: new Date(),
        status: 'OPEN'
      }
      // More violation records would be generated from actual analysis
    ];

    const filename = await this.exportData(violations, request, 'segregation_violations');
    request.outputLocation = filename;
    request.recordCount = violations.length;
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Generate dormant accounts report
   */
  private async generateDormantAccountsReport(request: CertificationExportRequest): Promise<void> {
    const cutoffDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days

    const dormantUsers = await this.prisma.user.findMany({
      where: {
        isActive: true,
        lastLoginAt: { lt: cutoffDate }
      },
      include: {
        userRoles: { include: { role: true } }
      }
    });

    const reportData = dormantUsers.map(user => ({
      userId: user.id,
      username: user.username,
      email: user.email,
      department: user.department,
      lastLoginAt: user.lastLoginAt,
      daysSinceLastLogin: user.lastLoginAt ?
        Math.floor((Date.now() - user.lastLoginAt.getTime()) / (24 * 60 * 60 * 1000)) : null,
      roleCount: user.userRoles.length,
      roles: user.userRoles.map(ur => ur.role.roleCode).join(', '),
      riskLevel: this.calculateUserRiskScore(user.userRoles as any),
      recommendedAction: user.userRoles.length > 0 ? 'REVIEW_ACCESS' : 'DISABLE_ACCOUNT'
    }));

    const filename = await this.exportData(reportData, request, 'dormant_accounts');
    request.outputLocation = filename;
    request.recordCount = reportData.length;
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Generate privileged access report
   */
  private async generatePrivilegedAccessReport(request: CertificationExportRequest): Promise<void> {
    const privilegedRoles = await this.prisma.role.findMany({
      where: {
        OR: [
          { roleCode: { contains: 'ADMIN' } },
          { roleCode: { contains: 'MANAGER' } },
          { roleCode: { contains: 'SECURITY' } },
          { roleCode: { contains: 'AUDIT' } }
        ]
      },
      include: {
        userRoles: {
          include: { user: true }
        },
        permissions: { include: { permission: true } }
      }
    });

    const reportData = [];
    for (const role of privilegedRoles) {
      for (const userRole of role.userRoles) {
        reportData.push({
          userId: userRole.user.id,
          username: userRole.user.username,
          email: userRole.user.email,
          department: userRole.user.department,
          roleCode: role.roleCode,
          roleName: role.roleName,
          assignedAt: userRole.assignedAt,
          assignedBy: userRole.assignedBy,
          expiresAt: userRole.expiresAt,
          permissionCount: role.permissions.length,
          riskLevel: this.calculateRoleRisk(role.roleCode),
          lastLogin: userRole.user.lastLoginAt,
          certificationRequired: true,
          nextReviewDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        });
      }
    }

    const filename = await this.exportData(reportData, request, 'privileged_access');
    request.outputLocation = filename;
    request.recordCount = reportData.length;
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Generate certification campaign report
   */
  private async generateCertificationCampaignReport(request: CertificationExportRequest): Promise<void> {
    // This would pull data from Saviynt certification campaigns
    const campaigns = await this.prisma.saviyntAccessCertification.findMany({
      where: {
        createdAt: {
          gte: request.scope.dateRange?.startDate,
          lte: request.scope.dateRange?.endDate
        }
      }
    });

    const reportData = campaigns.map(cert => ({
      certificationId: cert.certificationId,
      campaignName: cert.campaignName,
      certificationName: cert.certificationName,
      entityType: cert.entityType,
      status: cert.status,
      dueDate: cert.dueDate,
      certifiedAt: cert.certifiedAt,
      certifiedBy: cert.certifiedBy,
      certificationDecision: cert.certificationDecision,
      comments: cert.comments,
      riskScore: cert.riskScore
    }));

    const filename = await this.exportData(reportData, request, 'certification_campaigns');
    request.outputLocation = filename;
    request.recordCount = reportData.length;
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Generate other report types (simplified implementations)
   */
  private async generateComplianceAttestationReport(request: CertificationExportRequest): Promise<void> {
    const reportData = []; // Implementation would generate compliance attestation data
    const filename = await this.exportData(reportData, request, 'compliance_attestation');
    request.outputLocation = filename;
    request.recordCount = reportData.length;
    request.fileSize = await this.getFileSize(filename);
  }

  private async generateRiskAssessmentReport(request: CertificationExportRequest): Promise<void> {
    const reportData = []; // Implementation would generate risk assessment data
    const filename = await this.exportData(reportData, request, 'risk_assessment');
    request.outputLocation = filename;
    request.recordCount = reportData.length;
    request.fileSize = await this.getFileSize(filename);
  }

  private async generateAuditTrailReport(request: CertificationExportRequest): Promise<void> {
    const auditLogs = await this.prisma.saviyntSyncLog.findMany({
      where: {
        startedAt: {
          gte: request.scope.dateRange?.startDate,
          lte: request.scope.dateRange?.endDate
        }
      }
    });

    const filename = await this.exportData(auditLogs, request, 'audit_trail');
    request.outputLocation = filename;
    request.recordCount = auditLogs.length;
    request.fileSize = await this.getFileSize(filename);
  }

  /**
   * Export data to file
   */
  private async exportData(
    data: any[],
    request: CertificationExportRequest,
    baseFilename: string
  ): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${baseFilename}_${timestamp}.${request.format.toLowerCase()}`;
    const filepath = path.join(this.exportDirectory, filename);

    switch (request.format) {
      case ExportFormat.CSV:
        await this.exportToCSV(data, filepath, request.parameters);
        break;

      case ExportFormat.JSON:
        await this.exportToJSON(data, filepath, request.parameters);
        break;

      case ExportFormat.XLSX:
        await this.exportToXLSX(data, filepath, request.parameters);
        break;

      default:
        throw new Error(`Unsupported export format: ${request.format}`);
    }

    return filepath;
  }

  /**
   * Export to CSV format
   */
  private async exportToCSV(
    data: any[],
    filepath: string,
    parameters: CertificationExportParameters
  ): Promise<void> {
    if (data.length === 0) return;

    const writeStream = createWriteStream(filepath);

    // Write headers
    if (parameters.includeHeaders) {
      const headers = Object.keys(data[0]);
      writeStream.write(headers.join(',') + '\n');
    }

    // Write data rows
    for (const row of data) {
      const values = Object.values(row).map(value => {
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') return JSON.stringify(value);
        return String(value).replace(/"/g, '""');
      });
      writeStream.write('"' + values.join('","') + '"\n');
    }

    writeStream.end();
    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });
  }

  /**
   * Export to JSON format
   */
  private async exportToJSON(
    data: any[],
    filepath: string,
    parameters: CertificationExportParameters
  ): Promise<void> {
    const exportData = {
      metadata: parameters.includeMetadata ? {
        exportedAt: new Date(),
        recordCount: data.length,
        version: '1.0'
      } : undefined,
      data
    };

    await fs.writeFile(filepath, JSON.stringify(exportData, null, 2));
  }

  /**
   * Export to XLSX format (simplified implementation)
   */
  private async exportToXLSX(
    data: any[],
    filepath: string,
    parameters: CertificationExportParameters
  ): Promise<void> {
    // This would use a library like ExcelJS for actual XLSX generation
    // For now, fall back to JSON
    await this.exportToJSON(data, filepath.replace('.xlsx', '.json'), parameters);
  }

  /**
   * Utility methods
   */

  private buildUserFilter(filters: CertificationFilters): any {
    const whereClause: any = {};

    if (filters.userIds?.length) {
      whereClause.id = { in: filters.userIds };
    }

    if (filters.departments?.length) {
      whereClause.department = { in: filters.departments };
    }

    if (filters.lastLoginBefore) {
      whereClause.lastLoginAt = { lt: filters.lastLoginBefore };
    }

    if (filters.lastLoginAfter) {
      whereClause.lastLoginAt = { gte: filters.lastLoginAfter };
    }

    if (filters.createdBefore) {
      whereClause.createdAt = { lt: filters.createdBefore };
    }

    if (filters.createdAfter) {
      whereClause.createdAt = { gte: filters.createdAfter };
    }

    return whereClause;
  }

  private calculateUserRiskScore(roles: any[]): number {
    let riskScore = 0;
    for (const role of roles) {
      riskScore += this.getRoleRiskValue(this.calculateRoleRisk(role.roleCode || ''));
    }
    return Math.min(riskScore, 10); // Cap at 10
  }

  private calculateRoleRisk(roleCode: string): RiskLevel {
    if (roleCode.includes('ADMIN')) return RiskLevel.CRITICAL;
    if (roleCode.includes('MANAGER')) return RiskLevel.HIGH;
    if (roleCode.includes('SUPERVISOR')) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private calculatePermissionRisk(permissionCode: string): RiskLevel {
    if (permissionCode.includes('DELETE') || permissionCode.includes('ADMIN')) return RiskLevel.HIGH;
    if (permissionCode.includes('CREATE') || permissionCode.includes('UPDATE')) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }

  private getRoleRiskValue(riskLevel: RiskLevel): number {
    switch (riskLevel) {
      case RiskLevel.CRITICAL: return 4;
      case RiskLevel.HIGH: return 3;
      case RiskLevel.MEDIUM: return 2;
      case RiskLevel.LOW: return 1;
      default: return 0;
    }
  }

  private async getFileSize(filepath: string): Promise<number> {
    try {
      const stats = await fs.stat(filepath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  private async loadPendingExports(): Promise<void> {
    // Load pending exports from storage if they exist
    logger.info('Loaded pending exports');
  }

  private scheduleCleanupTasks(): void {
    // Clean up expired exports daily
    setInterval(async () => {
      const now = new Date();
      for (const [requestId, request] of this.activeExports.entries()) {
        if (request.expiresAt && now > request.expiresAt) {
          try {
            if (request.outputLocation) {
              await fs.unlink(request.outputLocation);
            }
            this.activeExports.delete(requestId);
          } catch (error) {
            logger.warn('Failed to cleanup expired export', { requestId, error });
          }
        }
      }
    }, 24 * 60 * 60 * 1000); // Daily cleanup
  }

  /**
   * Get export status
   */
  public getExportStatus(requestId: string): CertificationExportRequest | null {
    return this.activeExports.get(requestId) || null;
  }

  /**
   * Cancel export request
   */
  public async cancelExport(requestId: string, cancelledBy: string): Promise<void> {
    const request = this.activeExports.get(requestId);
    if (!request) {
      throw new Error(`Export request not found: ${requestId}`);
    }

    if (request.status === ExportStatus.COMPLETED) {
      throw new Error('Cannot cancel completed export');
    }

    request.status = ExportStatus.CANCELLED;

    logger.info('Export request cancelled', { requestId, cancelledBy });
  }

  /**
   * List active exports
   */
  public getActiveExports(): CertificationExportRequest[] {
    return Array.from(this.activeExports.values());
  }

  /**
   * Get export statistics
   */
  public getExportStatistics() {
    const exports = Array.from(this.activeExports.values());

    const statusCounts = exports.reduce((acc, exp) => {
      acc[exp.status] = (acc[exp.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const typeCounts = exports.reduce((acc, exp) => {
      acc[exp.exportType] = (acc[exp.exportType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalExports: exports.length,
      statusBreakdown: statusCounts,
      typeBreakdown: typeCounts,
      totalRecords: exports.reduce((sum, exp) => sum + (exp.recordCount || 0), 0),
      totalFileSize: exports.reduce((sum, exp) => sum + (exp.fileSize || 0), 0)
    };
  }
}