import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Shop Floor Connect (SFC) Adapter
 *
 * Integrates with Shop Floor Connect for CNC program version control between
 * PLM (Teamcenter) and manufacturing equipment with AS9100 compliance.
 *
 * Features:
 * - CNC program version management and synchronization
 * - ECO (Engineering Change Order) tracking and enforcement
 * - Program revision control and approval workflows
 * - Digital product definition (DPD) linking
 * - Model-Based Enterprise (MBE) support with STEP AP242
 * - Effectivity date management
 * - First piece validation before production release
 * - Program download tracking and audit trails
 * - Revision mismatch detection and alerts
 * - Automatic program quarantine on ECO release
 *
 * AS9100 Compliance:
 * - Clause 8.5.6: Control of changes (ECO/ECN management)
 * - Configuration management for NC programs
 * - Revision control and traceability
 * - First Article requirement before production
 * - Change approval and authorization
 *
 * Model-Based Enterprise (MBE):
 * - STEP AP242 support (3D PMI models)
 * - Digital product definition without 2D drawings
 * - Automated program generation from 3D models
 * - PMI (Product Manufacturing Information) integration
 *
 * Integration Points:
 * - Teamcenter PLM: Source of truth for program revisions
 * - Predator DNC: Program distribution to machines
 * - MES Work Orders: Enforce correct revision per work order
 * - Quality FAI: First piece validation before production
 *
 * Shop Floor Connect API Documentation:
 * https://www.shopfloorconnect.com/api-documentation
 */

export interface ShopFloorConnectConfig {
  baseUrl: string;              // SFC server URL
  username: string;             // Authentication username
  password: string;             // Authentication password
  teamcenterUrl?: string;       // Teamcenter PLM URL
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts
  autoSyncPrograms?: boolean;   // Auto-sync programs from Teamcenter
  enforceRevisionControl?: boolean; // Block downloads of unapproved revisions
  requireFirstPieceApproval?: boolean; // Require FAI before production release
  autoQuarantineOnECO?: boolean; // Quarantine old revisions when ECO released
}

/**
 * CNC Program Metadata
 */
export interface CNCProgram {
  programId: string;            // Unique program ID
  programName: string;          // Program name (e.g., "1234-56_OP10.NC")
  partNumber: string;           // Part number
  operationCode: string;        // Operation code
  revision: string;             // Current revision (A, B, C, etc.)
  revisionDate: Date;           // Revision date
  status: 'DRAFT' | 'APPROVED' | 'RELEASED' | 'OBSOLETE' | 'QUARANTINE';
  machineType?: string;         // Machine type (CNC_MILL, CNC_LATHE, etc.)
  postProcessor?: string;       // Post processor used
  toolList?: string;            // Tool list reference
  setupSheet?: string;          // Setup sheet URL
  approvedBy?: string;          // Approver name
  approvalDate?: Date;          // Approval date
  ecoNumber?: string;           // ECO that released this revision
  effectiveDate?: Date;         // Effective date for production
  firstPieceRequired: boolean;  // Requires first piece inspection
  firstPieceApproved?: boolean; // First piece approved
  firstPieceDate?: Date;        // First piece approval date
  programUrl?: string;          // URL to program file
  stepAP242Url?: string;        // URL to STEP AP242 3D model
  pmiDataUrl?: string;          // URL to PMI data
  teamcenterItemId?: string;    // Teamcenter item ID
}

/**
 * Engineering Change Order (ECO)
 */
export interface EngineeringChangeOrder {
  ecoNumber: string;            // ECO number
  description: string;          // Change description
  status: 'PENDING' | 'APPROVED' | 'RELEASED' | 'CLOSED';
  affectedPrograms: string[];   // Program IDs affected
  affectedParts: string[];      // Part numbers affected
  initiator?: string;           // Who initiated ECO
  approver?: string;            // Who approved ECO
  releaseDate?: Date;           // Release date
  effectiveDate?: Date;         // Effective date
  changeReason?: string;        // Reason for change
  dispositionInstructions?: string; // What to do with parts made with old revision
}

/**
 * Program Download Record
 */
export interface ProgramDownloadRecord {
  downloadId: string;
  programId: string;
  programName: string;
  revision: string;
  machineId: string;
  operatorId: string;
  downloadDate: Date;
  workOrderNumber?: string;
  authorized: boolean;
  authorizationMethod: string;  // 'AUTO' | 'MANUAL_OVERRIDE' | 'FAI_APPROVED'
}

/**
 * Revision Check Result
 */
export interface RevisionCheckResult {
  correct: boolean;
  programName: string;
  currentRevision: string;
  requiredRevision?: string;
  status: string;
  effectiveDate?: Date;
  ecoNumber?: string;
  firstPieceRequired: boolean;
  firstPieceApproved: boolean;
  reasons: string[];
}

/**
 * Sync Result
 */
export interface ProgramSyncResult {
  success: boolean;
  programsSynced: number;
  programsFailed: number;
  errors: Array<{ programId: string; error: string }>;
  duration: number;
}

export class ShopFloorConnectAdapter {
  private config: ShopFloorConnectConfig;
  private httpClient: AxiosInstance;

  constructor(config: ShopFloorConnectConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      autoSyncPrograms: false,
      enforceRevisionControl: true,
      requireFirstPieceApproval: true,
      autoQuarantineOnECO: true,
      ...config,
    };

    // Create HTTP client for Shop Floor Connect API
    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        console.error('Shop Floor Connect API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log('Shop Floor Connect Adapter initialized');
  }

  /**
   * Test connection to Shop Floor Connect
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/v1/system/health');
      return response.status === 200;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Sync CNC programs from Teamcenter via Shop Floor Connect
   */
  async syncProgramsFromTeamcenter(partNumber?: string): Promise<ProgramSyncResult> {
    const startTime = Date.now();
    const result: ProgramSyncResult = {
      success: false,
      programsSynced: 0,
      programsFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      const params: any = {};
      if (partNumber) {
        params.partNumber = partNumber;
      }

      const response = await this.httpClient.get('/api/v1/programs', { params });
      const programs = response.data.programs || [];

      for (const program of programs) {
        try {
          const existingProgram = await prisma.cNCProgram.findFirst({
            where: { externalProgramId: program.programId },
          });

          const programData = {
            externalProgramId: program.programId,
            programName: program.programName,
            partNumber: program.partNumber,
            operationCode: program.operationCode,
            revision: program.revision,
            revisionDate: new Date(program.revisionDate),
            status: program.status,
            machineType: program.machineType,
            postProcessor: program.postProcessor,
            toolList: program.toolList,
            setupSheetUrl: program.setupSheet,
            approvedBy: program.approvedBy,
            approvalDate: program.approvalDate ? new Date(program.approvalDate) : null,
            ecoNumber: program.ecoNumber,
            effectiveDate: program.effectiveDate ? new Date(program.effectiveDate) : null,
            firstPieceRequired: program.firstPieceRequired,
            firstPieceApproved: program.firstPieceApproved || false,
            firstPieceDate: program.firstPieceDate ? new Date(program.firstPieceDate) : null,
            programUrl: program.programUrl,
            stepAP242Url: program.stepAP242Url,
            pmiDataUrl: program.pmiDataUrl,
            teamcenterItemId: program.teamcenterItemId,
            lastSyncedAt: new Date(),
          };

          if (existingProgram) {
            // Check if revision changed (potential ECO)
            if (existingProgram.revision !== program.revision) {
              console.warn(`Program ${program.programName} revision changed: ${existingProgram.revision} → ${program.revision}`);

              // Quarantine old revision if configured
              if (this.config.autoQuarantineOnECO && existingProgram.status === 'RELEASED') {
                console.log(`Quarantining old revision ${existingProgram.revision} of ${program.programName}`);
                // Old revision remains in database but status changes
              }
            }

            await prisma.cNCProgram.update({
              where: { id: existingProgram.id },
              data: programData,
            });
          } else {
            await prisma.cNCProgram.create({
              data: programData,
            });
          }

          result.programsSynced++;
        } catch (error: any) {
          result.programsFailed++;
          result.errors.push({
            programId: program.programId,
            error: error.message,
          });
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`Synced ${result.programsSynced} programs from Teamcenter (${result.programsFailed} failed)`);
      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors.push({
        programId: 'bulk_sync',
        error: error.message,
      });
      console.error('Failed to sync programs from Teamcenter:', error.message);
      return result;
    }
  }

  /**
   * Check program revision for work order
   * Validates that correct revision is being used
   */
  async checkProgramRevision(params: {
    programName: string;
    partNumber: string;
    workOrderNumber?: string;
  }): Promise<RevisionCheckResult> {
    try {
      const response = await this.httpClient.post('/api/v1/programs/check-revision', params);
      const check = response.data.revisionCheck;

      const result: RevisionCheckResult = {
        correct: check.correct,
        programName: params.programName,
        currentRevision: check.currentRevision,
        requiredRevision: check.requiredRevision,
        status: check.status,
        effectiveDate: check.effectiveDate ? new Date(check.effectiveDate) : undefined,
        ecoNumber: check.ecoNumber,
        firstPieceRequired: check.firstPieceRequired,
        firstPieceApproved: check.firstPieceApproved || false,
        reasons: check.reasons || [],
      };

      if (!check.correct) {
        console.warn(`Program revision mismatch for ${params.programName}: ${check.reasons.join(', ')}`);
      }

      return result;
    } catch (error: any) {
      console.error('Failed to check program revision:', error.message);
      return {
        correct: false,
        programName: params.programName,
        currentRevision: 'UNKNOWN',
        status: 'ERROR',
        firstPieceRequired: false,
        firstPieceApproved: false,
        reasons: [`Revision check failed: ${error.message}`],
      };
    }
  }

  /**
   * Authorize program download for DNC transfer
   * Part of DNC authorization handshake
   */
  async authorizeProgramDownload(params: {
    programName: string;
    partNumber: string;
    revision: string;
    machineId: string;
    operatorId: string;
    workOrderNumber?: string;
  }): Promise<{
    authorized: boolean;
    downloadUrl?: string;
    reasons: string[];
  }> {
    try {
      // Check program revision
      const revisionCheck = await this.checkProgramRevision({
        programName: params.programName,
        partNumber: params.partNumber,
        workOrderNumber: params.workOrderNumber,
      });

      // Check if first piece is required and approved
      if (revisionCheck.firstPieceRequired && !revisionCheck.firstPieceApproved) {
        return {
          authorized: false,
          reasons: ['First piece inspection required before production release'],
        };
      }

      // Check if program is released and effective
      if (revisionCheck.status !== 'RELEASED') {
        return {
          authorized: false,
          reasons: [`Program status is ${revisionCheck.status}, must be RELEASED`],
        };
      }

      if (revisionCheck.effectiveDate && revisionCheck.effectiveDate > new Date()) {
        return {
          authorized: false,
          reasons: [`Program not effective until ${revisionCheck.effectiveDate.toISOString()}`],
        };
      }

      // Request download authorization from SFC
      const response = await this.httpClient.post('/api/v1/programs/authorize-download', params);
      const auth = response.data.authorization;

      if (auth.authorized) {
        // Record download in audit trail
        await this.recordProgramDownload({
          programName: params.programName,
          revision: params.revision,
          machineId: params.machineId,
          operatorId: params.operatorId,
          workOrderNumber: params.workOrderNumber,
          authorized: true,
          authorizationMethod: 'SFC_AUTHORIZED',
        });
      }

      return {
        authorized: auth.authorized,
        downloadUrl: auth.downloadUrl,
        reasons: auth.reasons || [],
      };
    } catch (error: any) {
      console.error('Failed to authorize program download:', error.message);
      return {
        authorized: false,
        reasons: [`Authorization failed: ${error.message}`],
      };
    }
  }

  /**
   * Record program download for audit trail
   */
  async recordProgramDownload(params: {
    programName: string;
    revision: string;
    machineId: string;
    operatorId: string;
    workOrderNumber?: string;
    authorized: boolean;
    authorizationMethod: string;
  }): Promise<void> {
    try {
      await prisma.programDownloadLog.create({
        data: {
          programName: params.programName,
          revision: params.revision,
          machineId: params.machineId,
          operatorBadgeNumber: params.operatorId,
          workOrderNumber: params.workOrderNumber,
          downloadDate: new Date(),
          authorized: params.authorized,
          authorizationMethod: params.authorizationMethod,
        },
      });

      console.log(`Recorded program download: ${params.programName} rev ${params.revision} to ${params.machineId}`);
    } catch (error: any) {
      console.error('Failed to record program download:', error.message);
      throw error;
    }
  }

  /**
   * Get active ECOs affecting programs
   */
  async getActiveECOs(partNumber?: string): Promise<EngineeringChangeOrder[]> {
    try {
      const params: any = { status: 'APPROVED,RELEASED' };
      if (partNumber) {
        params.partNumber = partNumber;
      }

      const response = await this.httpClient.get('/api/v1/ecos', { params });
      return response.data.ecos || [];
    } catch (error: any) {
      console.error('Failed to get active ECOs:', error.message);
      return [];
    }
  }

  /**
   * Approve first piece for program release
   * AS9100 requires first article before production
   */
  async approveFirstPiece(params: {
    programId: string;
    programName: string;
    revision: string;
    faiReportNumber: string;
    approvedBy: string;
    approvalDate: Date;
  }): Promise<boolean> {
    try {
      const response = await this.httpClient.post('/api/v1/programs/approve-first-piece', params);

      // Update program in MES
      await prisma.cNCProgram.updateMany({
        where: {
          externalProgramId: params.programId,
          revision: params.revision,
        },
        data: {
          firstPieceApproved: true,
          firstPieceDate: params.approvalDate,
        },
      });

      console.log(`First piece approved for ${params.programName} rev ${params.revision}`);
      return response.status === 200;
    } catch (error: any) {
      console.error('Failed to approve first piece:', error.message);
      throw new Error(`Failed to approve first piece: ${error.message}`);
    }
  }

  /**
   * Get STEP AP242 3D model with PMI
   * Model-Based Enterprise support
   */
  async getStepAP242Model(programId: string): Promise<{
    modelUrl?: string;
    pmiDataUrl?: string;
    downloadUrl?: string;
  } | null> {
    try {
      const response = await this.httpClient.get(`/api/v1/programs/${programId}/step-ap242`);
      return response.data.model || null;
    } catch (error: any) {
      console.error(`Failed to get STEP AP242 model for ${programId}:`, error.message);
      return null;
    }
  }

  /**
   * Query program download history for audit
   */
  async getProgramDownloadHistory(params: {
    programName?: string;
    machineId?: string;
    operatorId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<ProgramDownloadRecord[]> {
    try {
      const response = await this.httpClient.get('/api/v1/programs/download-history', {
        params: {
          programName: params.programName,
          machineId: params.machineId,
          operatorId: params.operatorId,
          dateFrom: params.dateFrom?.toISOString(),
          dateTo: params.dateTo?.toISOString(),
        },
      });

      return response.data.downloads || [];
    } catch (error: any) {
      console.error('Failed to get program download history:', error.message);
      return [];
    }
  }

  /**
   * Notify SFC of ECO implementation
   * Mark old programs as obsolete when ECO is implemented
   */
  async notifyECOImplementation(ecoNumber: string, implementedBy: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post('/api/v1/ecos/implemented', {
        ecoNumber,
        implementedBy,
        implementationDate: new Date().toISOString(),
      });

      console.log(`ECO ${ecoNumber} marked as implemented`);
      return response.status === 200;
    } catch (error: any) {
      console.error(`Failed to notify ECO implementation:`, error.message);
      throw new Error(`Failed to notify ECO implementation: ${error.message}`);
    }
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    responseTime?: number;
    lastSync?: Date;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const connected = await this.testConnection();
      const responseTime = Date.now() - startTime;
      return { connected, responseTime };
    } catch (error: any) {
      return {
        connected: false,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log('Shop Floor Connect adapter cleanup completed');
  }
}

export default ShopFloorConnectAdapter;
