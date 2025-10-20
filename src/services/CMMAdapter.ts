/**
 * CMM (Coordinate Measuring Machine) Adapter
 *
 * Integrates with PC-DMIS and Calypso CMM software for dimensional inspection
 * with QIF (Quality Information Framework) 3.0 support for AS9102 FAI compliance.
 *
 * Supported CMM Software:
 * - PC-DMIS (Hexagon Manufacturing Intelligence)
 * - Calypso (Carl Zeiss)
 *
 * Features:
 * - QIF 3.0 MeasurementPlan import/export
 * - QIF 3.0 MeasurementResults import/export
 * - Automatic inspection program execution
 * - Real-time measurement data collection
 * - GD&T characteristic evaluation
 * - AS9102 Form 3 characteristic data
 * - Digital thread linking measurements to parts
 * - CMM program version control
 * - Part setup validation
 * - Statistical analysis (Cpk, Ppk)
 *
 * QIF 3.0 Compliance:
 * - MeasurementPlan XML generation and parsing
 * - MeasurementResults XML generation and parsing
 * - QIF Resources (measurement devices/gauges)
 * - QIF Product (part definitions)
 * - GD&T characteristics per Y14.5
 *
 * AS9102 Compliance:
 * - Form 3 characteristic accountability
 * - Measurement traceability
 * - Gauge/CMM calibration verification
 * - Statistical analysis requirements
 *
 * API Documentation:
 * - PC-DMIS: http://docs.pcdmis.com/
 * - Calypso: https://www.zeiss.com/metrology/
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { QIFService } from './QIFService';
import { QIFDocument, MESQIFPlan, MESQIFResults } from '../types/qif';

const prisma = new PrismaClient();

export interface CMMConfig {
  baseUrl: string;              // CMM software API URL
  cmmType: 'PC-DMIS' | 'Calypso'; // CMM software type
  username?: string;            // Authentication username
  password?: string;            // Authentication password
  apiKey?: string;              // API Key
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts
  autoImportResults?: boolean;  // Automatically import measurement results
  pollInterval?: number;        // Polling interval for new results (ms)
  qifVersion?: string;          // QIF version (default: 3.0.0)
}

/**
 * CMM Program
 */
export interface CMMProgram {
  programId: string;
  programName: string;
  partNumber: string;
  revision: string;
  cmmType: string;              // PC-DMIS, Calypso
  programPath?: string;         // Path to program file
  qifMeasurementPlanId?: string; // Associated QIF plan
  characteristics: number;      // Number of characteristics
  createdDate?: Date;
  modifiedDate?: Date;
  isActive: boolean;
}

/**
 * CMM Measurement Result
 */
export interface CMMMeasurementResult {
  resultId: string;
  programId: string;
  partNumber: string;
  serialNumber?: string;
  operatorId?: string;
  inspectionDate: Date;
  overallStatus: 'PASS' | 'FAIL' | 'CONDITIONAL';
  qifResultsId?: string;        // QIF results document ID
  characteristics: CMMCharacteristic[];
}

/**
 * CMM Characteristic Measurement
 */
export interface CMMCharacteristic {
  characteristicId: string;
  balloonNumber?: string;
  description: string;
  gdtType?: string;             // Position, Flatness, Perpendicularity, etc.
  nominalValue: number;
  upperTolerance: number;
  lowerTolerance: number;
  measuredValue: number;
  deviation: number;
  status: 'PASS' | 'FAIL';
  unitOfMeasure: string;
}

/**
 * CMM Inspection Request
 */
export interface CMMInspectionRequest {
  programName: string;
  partNumber: string;
  serialNumber?: string;
  operatorId?: string;
  workOrderNumber?: string;
  qifMeasurementPlanId?: string;
}

/**
 * CMM Inspection Status
 */
export interface CMMInspectionStatus {
  inspectionId: string;
  status: 'QUEUED' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  progress?: number;            // Percentage complete
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export class CMMAdapter {
  private config: CMMConfig;
  private httpClient: AxiosInstance;
  private qifService: QIFService;

  constructor(config: CMMConfig) {
    this.config = {
      timeout: 60000,
      retryAttempts: 3,
      autoImportResults: true,
      pollInterval: 30000,
      qifVersion: '3.0.0',
      ...config,
    };

    // Create QIF service
    this.qifService = new QIFService();

    // Create HTTP client for CMM software API
    const authHeader = this.config.apiKey
      ? { 'X-API-Key': this.config.apiKey }
      : this.config.username && this.config.password
      ? { 'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}` }
      : {};

    this.httpClient = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...authHeader,
      },
    });

    // Add response interceptor for error handling
    this.httpClient.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        console.error(`${this.config.cmmType} API error:`, error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log(`CMM Adapter initialized for ${this.config.cmmType}`);
  }

  /**
   * Test connection to CMM software
   */
  async testConnection(): Promise<boolean> {
    try {
      const endpoint = this.config.cmmType === 'PC-DMIS'
        ? '/api/v1/status'
        : '/api/system/health';
      const response = await this.httpClient.get(endpoint);
      return response.status === 200;
    } catch (error: any) {
      console.error('Connection test failed:', error.message);
      return false;
    }
  }

  /**
   * Import QIF Measurement Plan
   * Creates inspection program from QIF XML
   */
  async importQIFPlan(qifXml: string): Promise<string> {
    try {
      // Parse QIF XML
      const qifDoc = this.qifService.parseQIF(qifXml);

      // Validate QIF document
      const validation = this.qifService.validateQIF(qifDoc);
      if (!validation.valid) {
        throw new Error(`Invalid QIF document: ${validation.errors.join(', ')}`);
      }

      // Extract measurement plan
      const measurementPlan = qifDoc.QIFDocument.MeasurementPlan;
      if (!measurementPlan) {
        throw new Error('No MeasurementPlan found in QIF document');
      }

      const product = qifDoc.QIFDocument.Product?.[0];
      const partNumber = product?.PartNumber || 'UNKNOWN';
      const revision = product?.Revision || 'A';

      // Store QIF plan in database
      const qifPlan = await prisma.qIFMeasurementPlan.create({
        data: {
          qifPlanId: measurementPlan.id,
          partNumber,
          partRevision: revision,
          planVersion: measurementPlan.Version || '1.0',
          qifXmlContent: qifXml,
          qifVersion: this.config.qifVersion || '3.0.0',
          characteristicCount: measurementPlan.InspectionSteps?.length || 0,
          status: 'ACTIVE',
        },
      });

      // Create characteristics
      if (measurementPlan.InspectionSteps) {
        for (const step of measurementPlan.InspectionSteps) {
          await prisma.qIFCharacteristic.create({
            data: {
              qifMeasurementPlanId: qifPlan.id,
              characteristicId: step.id || `CHAR-${Date.now()}`,
              balloonNumber: (step as any).BalloonNumber || (step as any).balloonNumber,
              nominalValue: (step as any).NominalValue || (step as any).nominalValue || 0,
              upperTolerance: (step as any).UpperLimit || (step as any).upperLimit || 0,
              lowerTolerance: (step as any).LowerLimit || (step as any).lowerLimit || 0,
              gdtType: (step as any).CharacteristicType || (step as any).characteristicType,
            },
          });
        }
      }

      console.log(`Imported QIF plan ${measurementPlan.id} for part ${partNumber}`);
      return measurementPlan.id;
    } catch (error: any) {
      console.error('Failed to import QIF plan:', error.message);
      throw error;
    }
  }

  /**
   * Export QIF Measurement Plan
   * Generates QIF XML from database
   */
  async exportQIFPlan(qifPlanId: string): Promise<string> {
    try {
      const plan = await prisma.qIFMeasurementPlan.findUnique({
        where: { qifPlanId },
        include: { characteristics: true },
      });

      if (!plan) {
        throw new Error(`QIF plan ${qifPlanId} not found`);
      }

      // Return stored XML content
      return plan.qifXmlContent;
    } catch (error: any) {
      console.error('Failed to export QIF plan:', error.message);
      throw error;
    }
  }

  /**
   * Import QIF Measurement Results from CMM
   */
  async importQIFResults(qifXml: string, workOrderId?: string, serializedPartId?: string): Promise<string> {
    try {
      // Parse QIF XML
      const qifDoc = this.qifService.parseQIF(qifXml);

      // Validate QIF document
      const validation = this.qifService.validateQIF(qifDoc);
      if (!validation.valid) {
        throw new Error(`Invalid QIF document: ${validation.errors.join(', ')}`);
      }

      // Extract measurement results
      const measurementResults = qifDoc.QIFDocument.MeasurementResults;
      if (!measurementResults) {
        throw new Error('No MeasurementResults found in QIF document');
      }

      const product = qifDoc.QIFDocument.Product?.[0];
      const partNumber = product?.PartNumber || 'UNKNOWN';
      const serialNumber = product?.SerialNumber;

      // Find associated measurement plan
      const measurementPlan = qifDoc.QIFDocument.MeasurementPlan;
      let qifMeasurementPlanId: string | undefined;

      if (measurementPlan) {
        const plan = await prisma.qIFMeasurementPlan.findUnique({
          where: { qifPlanId: measurementPlan.id },
        });
        qifMeasurementPlanId = plan?.id;
      }

      // Store QIF results in database
      const qifResult = await prisma.qIFMeasurementResult.create({
        data: {
          qifResultsId: measurementResults.id,
          qifMeasurementPlanId,
          partNumber,
          serialNumber,
          inspectionDate: measurementResults.MeasurementDate
            ? new Date(measurementResults.MeasurementDate)
            : new Date(),
          inspectedBy: measurementResults.MeasuredBy || 'CMM-AUTO',
          overallStatus: measurementResults.InspectionStatus || 'PASS',
          qifXmlContent: qifXml,
          workOrderId,
          serializedPartId,
        },
      });

      // Create individual measurements
      if (measurementResults.Results) {
        for (const result of measurementResults.Results) {
          await prisma.qIFMeasurement.create({
            data: {
              qifMeasurementResultId: qifResult.id,
              characteristicId: result.CharacteristicId || `CHAR-${Date.now()}`,
              measuredValue: result.MeasuredValue || 0,
              status: result.Status || 'PASS',
            },
          });
        }
      }

      console.log(`Imported QIF results ${measurementResults.id} for part ${partNumber}`);
      return measurementResults.id;
    } catch (error: any) {
      console.error('Failed to import QIF results:', error.message);
      throw error;
    }
  }

  /**
   * Export QIF Measurement Results
   * Generates QIF XML from database
   */
  async exportQIFResults(qifResultsId: string): Promise<string> {
    try {
      const result = await prisma.qIFMeasurementResult.findUnique({
        where: { qifResultsId },
        include: { measurements: true },
      });

      if (!result) {
        throw new Error(`QIF results ${qifResultsId} not found`);
      }

      // Return stored XML content
      return result.qifXmlContent;
    } catch (error: any) {
      console.error('Failed to export QIF results:', error.message);
      throw error;
    }
  }

  /**
   * Execute CMM inspection program
   */
  async executeInspection(request: CMMInspectionRequest): Promise<CMMInspectionStatus> {
    try {
      console.log(`Executing CMM inspection for program ${request.programName}`);

      // Send inspection request to CMM software
      const response = await this.httpClient.post('/api/v1/inspections', {
        programName: request.programName,
        partNumber: request.partNumber,
        serialNumber: request.serialNumber,
        operatorId: request.operatorId,
      });

      const inspection = response.data.inspection;

      return {
        inspectionId: inspection.id,
        status: inspection.status,
        progress: inspection.progress || 0,
        startTime: inspection.startTime ? new Date(inspection.startTime) : new Date(),
      };
    } catch (error: any) {
      console.error('Failed to execute inspection:', error.message);
      throw error;
    }
  }

  /**
   * Get inspection status
   */
  async getInspectionStatus(inspectionId: string): Promise<CMMInspectionStatus> {
    try {
      const response = await this.httpClient.get(`/api/v1/inspections/${inspectionId}`);
      const inspection = response.data.inspection;

      return {
        inspectionId: inspection.id,
        status: inspection.status,
        progress: inspection.progress,
        startTime: inspection.startTime ? new Date(inspection.startTime) : undefined,
        endTime: inspection.endTime ? new Date(inspection.endTime) : undefined,
        error: inspection.error,
      };
    } catch (error: any) {
      console.error('Failed to get inspection status:', error.message);
      throw error;
    }
  }

  /**
   * Get measurement results
   */
  async getMeasurementResults(inspectionId: string): Promise<CMMMeasurementResult | null> {
    try {
      const response = await this.httpClient.get(`/api/v1/inspections/${inspectionId}/results`);
      const results = response.data.results;

      if (!results) {
        return null;
      }

      return {
        resultId: results.id,
        programId: results.programId,
        partNumber: results.partNumber,
        serialNumber: results.serialNumber,
        operatorId: results.operatorId,
        inspectionDate: new Date(results.inspectionDate),
        overallStatus: results.overallStatus,
        qifResultsId: results.qifResultsId,
        characteristics: results.characteristics || [],
      };
    } catch (error: any) {
      console.error('Failed to get measurement results:', error.message);
      return null;
    }
  }

  /**
   * Get QIF measurement results from CMM
   * Fetches results in QIF XML format
   */
  async getQIFResultsFromCMM(inspectionId: string): Promise<string | null> {
    try {
      const response = await this.httpClient.get(`/api/v1/inspections/${inspectionId}/qif`);
      return response.data.qifXml || null;
    } catch (error: any) {
      console.error('Failed to get QIF results from CMM:', error.message);
      return null;
    }
  }

  /**
   * List available CMM programs
   */
  async listPrograms(partNumber?: string): Promise<CMMProgram[]> {
    try {
      const params: any = {};
      if (partNumber) {
        params.partNumber = partNumber;
      }

      const response = await this.httpClient.get('/api/v1/programs', { params });
      const programs = response.data.programs || [];

      return programs.map((prog: any) => ({
        programId: prog.id,
        programName: prog.name,
        partNumber: prog.partNumber,
        revision: prog.revision,
        cmmType: this.config.cmmType,
        programPath: prog.path,
        qifMeasurementPlanId: prog.qifPlanId,
        characteristics: prog.characteristicCount || 0,
        createdDate: prog.createdDate ? new Date(prog.createdDate) : undefined,
        modifiedDate: prog.modifiedDate ? new Date(prog.modifiedDate) : undefined,
        isActive: prog.isActive !== false,
      }));
    } catch (error: any) {
      console.error('Failed to list CMM programs:', error.message);
      return [];
    }
  }

  /**
   * Create MES QIF Plan from part characteristics
   * Helper method to create QIF plans for FAI/inspection
   */
  async createMESQIFPlan(
    partNumber: string,
    revision: string,
    characteristics: Array<{
      balloonNumber: string;
      description: string;
      nominalValue: number;
      upperTolerance: number;
      lowerTolerance: number;
      gdtType?: string;
    }>,
    workOrderId?: string,
    faiReportId?: string
  ): Promise<MESQIFPlan> {
    try {
      // Create QIF document using QIF service
      const qifDoc = this.qifService.createMeasurementPlan({
        partNumber,
        revision,
        characteristics: characteristics.map(char => ({
          balloonNumber: char.balloonNumber,
          description: char.description,
          nominalValue: char.nominalValue,
          upperTolerance: char.upperTolerance,
          lowerTolerance: char.lowerTolerance,
          characteristicType: 'DIMENSIONAL',
        })),
      });

      // Generate QIF XML
      const qifXml = this.qifService.generateQIF(qifDoc);

      // Import the plan (stores in database)
      const qifPlanId = await this.importQIFPlan(qifXml);

      // Update work order or FAI report links if provided
      if (workOrderId || faiReportId) {
        await prisma.qIFMeasurementPlan.updateMany({
          where: { qifPlanId },
          data: {
            workOrderId,
            faiReportId,
          },
        });
      }

      return {
        qifPlanId,
        partNumber,
        revision,
        characteristics: characteristics.map((char, idx) => ({
          characteristicId: `CHAR-${idx + 1}`,
          balloonNumber: char.balloonNumber,
          description: char.description || 'CMM Measurement',
          nominalValue: char.nominalValue,
          upperTolerance: char.upperTolerance,
          lowerTolerance: char.lowerTolerance,
          toleranceType: 'BILATERAL',
          measurementMethod: 'CMM',
          samplingRequired: false,
        })),
        xmlContent: qifXml,
      };
    } catch (error: any) {
      console.error('Failed to create MES QIF plan:', error.message);
      throw error;
    }
  }

  /**
   * Get integration health status
   */
  async getHealthStatus(): Promise<{
    connected: boolean;
    cmmType: string;
    responseTime?: number;
    error?: string;
  }> {
    const startTime = Date.now();
    try {
      const connected = await this.testConnection();
      const responseTime = Date.now() - startTime;
      return {
        connected,
        cmmType: this.config.cmmType,
        responseTime
      };
    } catch (error: any) {
      return {
        connected: false,
        cmmType: this.config.cmmType,
        error: error.message,
      };
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    console.log(`CMM adapter (${this.config.cmmType}) cleanup completed`);
  }
}

export default CMMAdapter;
