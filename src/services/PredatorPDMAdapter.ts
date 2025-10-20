import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { QIFService } from './QIFService';
import { MESQIFPlan } from '@/types/qif';

const prisma = new PrismaClient();

/**
 * Predator PDM (Production Data Management) Adapter
 *
 * Integrates with Predator PDM for managing production documentation including
 * CAM programs, work instructions, setup sheets, and Model-Based Enterprise data.
 *
 * Features:
 * - CNC program storage and versioning
 * - Digital work instructions management
 * - Setup sheet and tooling documentation
 * - AS9102 First Article Inspection templates
 * - STEP AP242 3D model management (MBE)
 * - ReqIF requirements traceability
 * - Configuration management and change control
 * - Document approval workflows
 * - Revision history and audit trails
 * - Program search and retrieval
 *
 * Model-Based Enterprise (MBE) Support:
 * - STEP AP242 format (3D PMI models)
 * - ReqIF (Requirements Interchange Format)
 * - Digital product definition without 2D drawings
 * - PMI (Product Manufacturing Information) embedded in 3D
 * - Automated work instruction generation from 3D models
 *
 * AS9100 Compliance:
 * - Configuration management per AS9100 Rev D
 * - Document control and revision management
 * - Approval workflows and electronic signatures
 * - Traceability to engineering requirements
 * - First Article Inspection documentation
 *
 * Integration Points:
 * - Predator DNC: Source repository for CNC programs
 * - Shop Floor Connect: Program version synchronization
 * - MES Work Instructions: Digital work instruction display
 * - FAI Module: AS9102 form templates
 *
 * Predator PDM API Documentation:
 * https://www.predator-software.com/pdm-api
 */

export interface PredatorPDMConfig {
  baseUrl: string;              // Predator PDM server URL
  username: string;             // Authentication username
  password: string;             // Authentication password
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts
  enableMBE?: boolean;          // Enable Model-Based Enterprise features
  enableReqIF?: boolean;        // Enable ReqIF requirements traceability
  autoVersioning?: boolean;     // Automatic version control
}

/**
 * PDM Document
 */
export interface PDMDocument {
  documentId: string;
  documentType: 'NC_PROGRAM' | 'WORK_INSTRUCTION' | 'SETUP_SHEET' | 'TOOL_LIST' | 'FAI_TEMPLATE' | 'STEP_AP242' | 'REQIF';
  partNumber: string;
  operationCode?: string;
  revision: string;
  fileName: string;
  fileSize?: number;
  checksum?: string;            // MD5/SHA256 for integrity
  status: 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'RELEASED' | 'OBSOLETE';
  author?: string;
  createdDate: Date;
  modifiedDate?: Date;
  approvedBy?: string;
  approvalDate?: Date;
  description?: string;
  tags?: string[];
  downloadUrl?: string;
  viewerUrl?: string;           // URL for 3D viewer (for STEP files)
}

/**
 * Work Instruction
 */
export interface WorkInstruction {
  instructionId: string;
  partNumber: string;
  operationCode: string;
  revision: string;
  title: string;
  instructionType: 'TEXT' | 'IMAGES' | 'VIDEO' | 'INTERACTIVE_3D';
  content: string | object;     // HTML, JSON, or URL
  toolingRequired?: string[];
  safetyNotes?: string[];
  qualityCheckpoints?: string[];
  estimatedTime?: number;       // Minutes
  stepAP242Url?: string;        // Link to 3D model
  pmiHighlights?: object;       // PMI features to highlight
  approvedBy?: string;
  status: 'DRAFT' | 'APPROVED' | 'RELEASED';
}

/**
 * STEP AP242 Model (MBE)
 */
export interface STEPAP242Model {
  modelId: string;
  partNumber: string;
  revision: string;
  fileName: string;
  fileUrl: string;
  pmiData?: object;             // Product Manufacturing Information
  geometryTolerance?: object;   // GD&T annotations
  materialSpecification?: string;
  surfaceFinish?: object;
  requirementsLinks?: string[]; // Links to ReqIF requirements
  validationStatus: 'VALID' | 'INVALID' | 'NOT_VALIDATED';
}

/**
 * ReqIF Requirement (Requirements Interchange Format)
 */
export interface ReqIFRequirement {
  requirementId: string;
  title: string;
  description: string;
  category: 'DESIGN' | 'MANUFACTURING' | 'QUALITY' | 'TESTING';
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'DRAFT' | 'APPROVED' | 'VERIFIED' | 'VALIDATED';
  linkedDocuments?: string[];   // Document IDs that implement this requirement
  linkedParts?: string[];       // Part numbers affected
  traceabilityChain?: string[]; // Full traceability path
}

export class PredatorPDMAdapter {
  private config: PredatorPDMConfig;
  private httpClient: AxiosInstance;
  private qifService: QIFService;

  constructor(config: PredatorPDMConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      enableMBE: true,
      enableReqIF: true,
      autoVersioning: true,
      ...config,
    };

    // Initialize QIF service for MeasurementPlan storage
    this.qifService = new QIFService();

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}`,
      },
    });

    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        console.error('Predator PDM API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log('Predator PDM Adapter initialized');
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/api/v1/health');
      return response.status === 200;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Get NC program by part number and operation
   */
  async getNCProgram(partNumber: string, operationCode: string, revision?: string): Promise<PDMDocument | null> {
    try {
      const params: any = { partNumber, operationCode };
      if (revision) params.revision = revision;

      const response = await this.httpClient.get('/api/v1/documents/nc-programs', { params });
      return response.data.document || null;
    } catch (error: any) {
      console.error(`Failed to get NC program for ${partNumber} ${operationCode}:`, error.message);
      return null;
    }
  }

  /**
   * Get work instruction for operation
   */
  async getWorkInstruction(partNumber: string, operationCode: string): Promise<WorkInstruction | null> {
    try {
      const response = await this.httpClient.get('/api/v1/work-instructions', {
        params: { partNumber, operationCode },
      });
      return response.data.workInstruction || null;
    } catch (error: any) {
      console.error(`Failed to get work instruction for ${partNumber} ${operationCode}:`, error.message);
      return null;
    }
  }

  /**
   * Get STEP AP242 3D model with PMI (Model-Based Enterprise)
   */
  async getSTEPAP242Model(partNumber: string, revision?: string): Promise<STEPAP242Model | null> {
    if (!this.config.enableMBE) {
      console.warn('MBE is not enabled in configuration');
      return null;
    }

    try {
      const params: any = { partNumber };
      if (revision) params.revision = revision;

      const response = await this.httpClient.get('/api/v1/mbe/step-ap242', { params });
      return response.data.model || null;
    } catch (error: any) {
      console.error(`Failed to get STEP AP242 model for ${partNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Get requirements for part (ReqIF)
   */
  async getRequirements(partNumber: string): Promise<ReqIFRequirement[]> {
    if (!this.config.enableReqIF) {
      console.warn('ReqIF is not enabled in configuration');
      return [];
    }

    try {
      const response = await this.httpClient.get('/api/v1/requirements', {
        params: { partNumber },
      });
      return response.data.requirements || [];
    } catch (error: any) {
      console.error(`Failed to get requirements for ${partNumber}:`, error.message);
      return [];
    }
  }

  /**
   * Get FAI template for part
   */
  async getFAITemplate(partNumber: string): Promise<PDMDocument | null> {
    try {
      const response = await this.httpClient.get('/api/v1/documents/fai-templates', {
        params: { partNumber },
      });
      return response.data.document || null;
    } catch (error: any) {
      console.error(`Failed to get FAI template for ${partNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Search documents
   */
  async searchDocuments(criteria: {
    partNumber?: string;
    documentType?: string;
    status?: string;
    revision?: string;
    tags?: string[];
  }): Promise<PDMDocument[]> {
    try {
      const response = await this.httpClient.post('/api/v1/documents/search', criteria);
      return response.data.documents || [];
    } catch (error: any) {
      console.error('Failed to search documents:', error.message);
      return [];
    }
  }

  /**
   * Upload document to PDM
   */
  async uploadDocument(document: {
    documentType: string;
    partNumber: string;
    operationCode?: string;
    revision: string;
    fileName: string;
    fileContent: Buffer | string;
    author: string;
    description?: string;
    tags?: string[];
  }): Promise<string> {
    try {
      const formData = new FormData();
      formData.append('documentType', document.documentType);
      formData.append('partNumber', document.partNumber);
      if (document.operationCode) formData.append('operationCode', document.operationCode);
      formData.append('revision', document.revision);
      formData.append('fileName', document.fileName);
      formData.append('file', document.fileContent as any);
      formData.append('author', document.author);
      if (document.description) formData.append('description', document.description);
      if (document.tags) formData.append('tags', JSON.stringify(document.tags));

      const response = await this.httpClient.post('/api/v1/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const documentId = response.data.documentId;
      console.log(`Document uploaded to PDM: ${documentId}`);
      return documentId;
    } catch (error: any) {
      console.error('Failed to upload document:', error.message);
      throw new Error(`Failed to upload document: ${error.message}`);
    }
  }

  /**
   * Approve document
   */
  async approveDocument(documentId: string, approvedBy: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post(`/api/v1/documents/${documentId}/approve`, {
        approvedBy,
        approvalDate: new Date().toISOString(),
      });

      console.log(`Document ${documentId} approved by ${approvedBy}`);
      return response.status === 200;
    } catch (error: any) {
      console.error(`Failed to approve document ${documentId}:`, error.message);
      throw new Error(`Failed to approve document: ${error.message}`);
    }
  }

  /**
   * Get document revision history
   */
  async getRevisionHistory(partNumber: string, documentType?: string): Promise<PDMDocument[]> {
    try {
      const params: any = { partNumber };
      if (documentType) params.documentType = documentType;

      const response = await this.httpClient.get('/api/v1/documents/revision-history', { params });
      return response.data.revisions || [];
    } catch (error: any) {
      console.error(`Failed to get revision history for ${partNumber}:`, error.message);
      return [];
    }
  }

  /**
   * Link requirement to document (digital thread)
   */
  async linkRequirementToDocument(requirementId: string, documentId: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post('/api/v1/traceability/link', {
        requirementId,
        documentId,
        linkDate: new Date().toISOString(),
      });

      console.log(`Linked requirement ${requirementId} to document ${documentId}`);
      return response.status === 200;
    } catch (error: any) {
      console.error('Failed to link requirement to document:', error.message);
      throw new Error(`Failed to link requirement: ${error.message}`);
    }
  }

  /**
   * Store QIF MeasurementPlan in PDM
   * Stores the QIF inspection plan as a managed document in PDM system
   */
  async storeQIFMeasurementPlan(params: {
    partNumber: string;
    revision: string;
    qifXml: string;
    qifPlanId: string;
    operationCode?: string;
    author: string;
    description?: string;
  }): Promise<string> {
    try {
      // Upload QIF plan as PDM document
      const documentId = await this.uploadDocument({
        documentType: 'QIF_MEASUREMENT_PLAN',
        partNumber: params.partNumber,
        operationCode: params.operationCode,
        revision: params.revision,
        fileName: `QIF-Plan-${params.partNumber}-${params.revision}.xml`,
        fileContent: params.qifXml,
        author: params.author,
        description: params.description || `QIF Measurement Plan for ${params.partNumber} Rev ${params.revision}`,
        tags: ['QIF', 'MeasurementPlan', 'AS9102', 'Inspection'],
      });

      // Store reference in local database
      await prisma.qIFMeasurementPlan.upsert({
        where: { qifPlanId: params.qifPlanId },
        update: {
          qifXmlContent: params.qifXml,
          status: 'ACTIVE',
        },
        create: {
          qifPlanId: params.qifPlanId,
          partNumber: params.partNumber,
          partRevision: params.revision,
          planVersion: '1.0',
          qifXmlContent: params.qifXml,
          qifVersion: '3.0.0',
          characteristicCount: 0, // Will be populated by caller
          status: 'ACTIVE',
        },
      });

      console.log(`Stored QIF MeasurementPlan ${params.qifPlanId} in PDM as document ${documentId}`);
      return documentId;
    } catch (error: any) {
      console.error('Failed to store QIF MeasurementPlan in PDM:', error.message);
      throw new Error(`Failed to store QIF MeasurementPlan: ${error.message}`);
    }
  }

  /**
   * Retrieve QIF MeasurementPlan from PDM
   * Gets the QIF inspection plan for a specific part/revision
   */
  async retrieveQIFMeasurementPlan(
    partNumber: string,
    revision?: string,
    operationCode?: string
  ): Promise<MESQIFPlan | null> {
    try {
      // Search for QIF MeasurementPlan document
      const documents = await this.searchDocuments({
        partNumber,
        documentType: 'QIF_MEASUREMENT_PLAN',
        revision,
        status: 'RELEASED',
      });

      if (documents.length === 0) {
        console.warn(`No QIF MeasurementPlan found for ${partNumber} Rev ${revision || 'latest'}`);
        return null;
      }

      // Get the latest document if multiple versions exist
      const latestDoc = documents.sort((a, b) =>
        new Date(b.modifiedDate || b.createdDate).getTime() -
        new Date(a.modifiedDate || a.createdDate).getTime()
      )[0];

      // Fetch document content from PDM
      const response = await this.httpClient.get(`/api/v1/documents/${latestDoc.documentId}/content`);
      const qifXml = response.data.content || response.data;

      // Parse QIF to extract characteristics
      const qifData = await this.qifService.importQIF(qifXml);

      // Build MESQIFPlan
      const mesPlan: MESQIFPlan = {
        qifPlanId: latestDoc.documentId,
        partNumber,
        revision: latestDoc.revision,
        planVersion: '1.0',
        createdDate: new Date(),
        characteristics: (qifData as any).characteristics?.map((char: any) => ({
          characteristicId: char.characteristicId,
          balloonNumber: char.balloonNumber || '',
          nominalValue: char.nominalValue || 0,
          upperTolerance: char.upperTolerance || 0,
          lowerTolerance: char.lowerTolerance || 0,
        })) || [],
        xmlContent: qifXml,
      };

      console.log(`Retrieved QIF MeasurementPlan for ${partNumber} Rev ${latestDoc.revision}`);
      return mesPlan;
    } catch (error: any) {
      console.error(`Failed to retrieve QIF MeasurementPlan for ${partNumber}:`, error.message);
      return null;
    }
  }

  /**
   * Get QIF MeasurementPlan revision history
   * Returns all QIF plan versions for a part
   */
  async getQIFPlanHistory(partNumber: string): Promise<PDMDocument[]> {
    try {
      const history = await this.getRevisionHistory(partNumber, 'QIF_MEASUREMENT_PLAN');
      console.log(`Found ${history.length} QIF MeasurementPlan revisions for ${partNumber}`);
      return history;
    } catch (error: any) {
      console.error(`Failed to get QIF plan history for ${partNumber}:`, error.message);
      return [];
    }
  }

  /**
   * Link QIF MeasurementPlan to STEP AP242 model
   * Creates digital thread between 3D model and inspection plan
   */
  async linkQIFPlanToSTEPModel(qifPlanId: string, stepModelId: string): Promise<boolean> {
    try {
      const response = await this.httpClient.post('/api/v1/traceability/link-qif-to-step', {
        qifPlanId,
        stepModelId,
        linkDate: new Date().toISOString(),
        linkType: 'MBE_TO_QIF',
      });

      console.log(`Linked QIF plan ${qifPlanId} to STEP model ${stepModelId}`);
      return response.status === 200;
    } catch (error: any) {
      console.error('Failed to link QIF plan to STEP model:', error.message);
      return false;
    }
  }

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

  async cleanup(): Promise<void> {
    console.log('Predator PDM adapter cleanup completed');
  }
}

export default PredatorPDMAdapter;
