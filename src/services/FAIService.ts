import { PrismaClient, FAIReport as PrismaFAIReport, FAICharacteristic as PrismaFAICharacteristic } from '@prisma/client';
import { logger } from '@/utils/logger';
import {
  CreateFAIReportInput,
  UpdateFAIReportInput,
  CreateCharacteristicInput,
  UpdateCharacteristicInput,
  FAIReport,
  FAICharacteristic,
  FAIQueryParams,
  FAIListResponse,
  FAIStatus,
  validateCharacteristic,
  calculateDeviation,
  calculateAverage,
  CharacteristicResult,
} from '@/types/fai';
import { QIFService } from './QIFService';
import { QIFDocument, MESQIFPlan, MESQIFResults } from '@/types/qif';

/**
 * FAIService
 *
 * Implements AS9102 Rev C First Article Inspection reporting
 *
 * Features:
 * - Form 1 generation (Part Number Accountability)
 * - Form 2 generation (Product Accountability)
 * - Form 3 management (Characteristic Accountability)
 * - Characteristic measurement validation
 * - FAI report lifecycle management
 * - QIF 3.0 AS9102 report generation
 */
export class FAIService {
  private qifService: QIFService;

  constructor(private prisma: PrismaClient) {
    this.qifService = new QIFService();
  }

  /**
   * Create a new FAI report
   *
   * @param input - FAI report creation data
   * @param createdById - User ID creating the report
   * @returns Created FAI report
   */
  async createFAIReport(input: CreateFAIReportInput, createdById: string): Promise<FAIReport> {
    try {
      // Verify part exists
      const part = await this.prisma.part.findUnique({
        where: { id: input.partId },
      });

      if (!part) {
        throw new Error(`Part not found with ID: ${input.partId}`);
      }

      // Check if FAI number already exists
      const existingFAI = await this.prisma.fAIReport.findUnique({
        where: { faiNumber: input.faiNumber },
      });

      if (existingFAI) {
        throw new Error(`FAI report with number ${input.faiNumber} already exists`);
      }

      // Create FAI report
      const faiReport = await this.prisma.fAIReport.create({
        data: {
          faiNumber: input.faiNumber,
          partId: input.partId,
          workOrderId: input.workOrderId,
          inspectionId: input.inspectionId,
          revisionLevel: input.revisionLevel || 'Rev C',
          form1Data: input.form1Data as any,
          form2Data: input.form2Data as any,
          status: FAIStatus.IN_PROGRESS,
          createdById,
        },
        include: {
          characteristics: true,
        },
      });

      logger.info(`FAI report created`, {
        faiId: faiReport.id,
        faiNumber: faiReport.faiNumber,
        partId: faiReport.partId,
        createdById,
      });

      return this.mapToFAIReport(faiReport);
    } catch (error) {
      logger.error('Error creating FAI report', { error, input });
      throw error;
    }
  }

  /**
   * Get FAI report by ID
   *
   * @param faiReportId - FAI report ID
   * @returns FAI report with characteristics
   */
  async getFAIReport(faiReportId: string): Promise<FAIReport | null> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });

      if (!faiReport) {
        return null;
      }

      return this.mapToFAIReport(faiReport);
    } catch (error) {
      logger.error('Error getting FAI report', { error, faiReportId });
      throw error;
    }
  }

  /**
   * Get FAI report by FAI number
   *
   * @param faiNumber - FAI report number
   * @returns FAI report
   */
  async getFAIReportByNumber(faiNumber: string): Promise<FAIReport | null> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { faiNumber },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });

      if (!faiReport) {
        return null;
      }

      return this.mapToFAIReport(faiReport);
    } catch (error) {
      logger.error('Error getting FAI report by number', { error, faiNumber });
      throw error;
    }
  }

  /**
   * Update FAI report
   *
   * @param faiReportId - FAI report ID
   * @param input - Update data
   * @returns Updated FAI report
   */
  async updateFAIReport(faiReportId: string, input: UpdateFAIReportInput): Promise<FAIReport> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      const updatedReport = await this.prisma.fAIReport.update({
        where: { id: faiReportId },
        data: {
          status: input.status,
          form1Data: input.form1Data as any,
          form2Data: input.form2Data as any,
          reviewedById: input.reviewedById,
          approvedById: input.approvedById,
          reviewedAt: input.reviewedById ? new Date() : undefined,
          approvedAt: input.approvedById ? new Date() : undefined,
        },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });

      logger.info(`FAI report updated`, {
        faiId: faiReportId,
        status: input.status,
      });

      return this.mapToFAIReport(updatedReport);
    } catch (error) {
      logger.error('Error updating FAI report', { error, faiReportId, input });
      throw error;
    }
  }

  /**
   * Delete FAI report
   *
   * @param faiReportId - FAI report ID
   */
  async deleteFAIReport(faiReportId: string): Promise<void> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      // Don't allow deletion of approved FAI reports
      if (faiReport.status === FAIStatus.APPROVED) {
        throw new Error('Cannot delete approved FAI report');
      }

      await this.prisma.fAIReport.delete({
        where: { id: faiReportId },
      });

      logger.info(`FAI report deleted`, { faiId: faiReportId });
    } catch (error) {
      logger.error('Error deleting FAI report', { error, faiReportId });
      throw error;
    }
  }

  /**
   * List FAI reports with filtering and pagination
   *
   * @param params - Query parameters
   * @returns Paginated list of FAI reports
   */
  async listFAIReports(params: FAIQueryParams): Promise<FAIListResponse> {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        partId,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      // Build where clause
      const where: any = {};

      if (status) {
        where.status = status;
      }

      if (partId) {
        where.partId = partId;
      }

      if (search) {
        where.OR = [
          { faiNumber: { contains: search, mode: 'insensitive' } },
        ];
      }

      // Get total count
      const total = await this.prisma.fAIReport.count({ where });

      // Get paginated results
      const faiReports = await this.prisma.fAIReport.findMany({
        where,
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      const data = faiReports.map((report) => this.mapToFAIReport(report));

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      logger.error('Error listing FAI reports', { error, params });
      throw error;
    }
  }

  /**
   * Add characteristic to FAI report
   *
   * @param faiReportId - FAI report ID
   * @param input - Characteristic data
   * @returns Created characteristic
   */
  async addCharacteristic(
    faiReportId: string,
    input: CreateCharacteristicInput
  ): Promise<FAICharacteristic> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      // Check if characteristic number already exists
      const existingChar = await this.prisma.fAICharacteristic.findUnique({
        where: {
          faiReportId_characteristicNumber: {
            faiReportId,
            characteristicNumber: input.characteristicNumber,
          },
        },
      });

      if (existingChar) {
        throw new Error(
          `Characteristic number ${input.characteristicNumber} already exists for this FAI report`
        );
      }

      // Calculate actual value from measured values
      let actualValue = input.actualValue;
      if (!actualValue && input.measuredValues && input.measuredValues.length > 0) {
        actualValue = calculateAverage(input.measuredValues);
      }

      // Calculate deviation
      let deviation = input.deviation;
      if (actualValue !== undefined && input.nominalValue !== undefined) {
        deviation = calculateDeviation(actualValue, input.nominalValue);
      }

      // Validate result
      let result = input.result;
      if (!result && actualValue !== undefined && input.nominalValue !== undefined) {
        result = validateCharacteristic(
          actualValue,
          input.nominalValue,
          input.upperLimit,
          input.lowerLimit,
          input.toleranceType
        );
      }

      const characteristic = await this.prisma.fAICharacteristic.create({
        data: {
          faiReportId,
          characteristicNumber: input.characteristicNumber,
          characteristic: input.characteristic,
          specification: input.specification,
          requirement: input.requirement,
          toleranceType: input.toleranceType,
          nominalValue: input.nominalValue,
          upperLimit: input.upperLimit,
          lowerLimit: input.lowerLimit,
          unitOfMeasure: input.unitOfMeasure,
          inspectionMethod: input.inspectionMethod,
          inspectionFrequency: input.inspectionFrequency,
          measuredValues: input.measuredValues || [],
          actualValue,
          deviation,
          result,
          notes: input.notes,
        },
      });

      logger.info(`Characteristic added to FAI report`, {
        faiId: faiReportId,
        characteristicId: characteristic.id,
        characteristicNumber: characteristic.characteristicNumber,
      });

      return this.mapToCharacteristic(characteristic);
    } catch (error) {
      logger.error('Error adding characteristic', { error, faiReportId, input });
      throw error;
    }
  }

  /**
   * Update characteristic
   *
   * @param characteristicId - Characteristic ID
   * @param input - Update data
   * @returns Updated characteristic
   */
  async updateCharacteristic(
    characteristicId: string,
    input: UpdateCharacteristicInput
  ): Promise<FAICharacteristic> {
    try {
      const characteristic = await this.prisma.fAICharacteristic.findUnique({
        where: { id: characteristicId },
      });

      if (!characteristic) {
        throw new Error(`Characteristic not found with ID: ${characteristicId}`);
      }

      // Recalculate actual value if measured values provided
      let actualValue = input.actualValue;
      if (input.measuredValues && input.measuredValues.length > 0) {
        actualValue = calculateAverage(input.measuredValues);
      } else if (actualValue === undefined) {
        actualValue = characteristic.actualValue || undefined;
      }

      // Recalculate deviation
      const nominalValue = input.nominalValue ?? characteristic.nominalValue;
      let deviation = input.deviation;
      if (actualValue !== undefined && actualValue !== null && nominalValue !== undefined && nominalValue !== null) {
        deviation = calculateDeviation(actualValue, nominalValue);
      }

      // Recalculate result
      const upperLimit = input.upperLimit ?? characteristic.upperLimit;
      const lowerLimit = input.lowerLimit ?? characteristic.lowerLimit;
      const toleranceType = input.toleranceType ?? (characteristic.toleranceType as any);

      let result = input.result;
      if (!result && actualValue !== undefined && actualValue !== null && nominalValue !== undefined && nominalValue !== null) {
        result = validateCharacteristic(
          actualValue,
          nominalValue,
          upperLimit || undefined,
          lowerLimit || undefined,
          toleranceType
        );
      }

      const updated = await this.prisma.fAICharacteristic.update({
        where: { id: characteristicId },
        data: {
          characteristic: input.characteristic,
          specification: input.specification,
          requirement: input.requirement,
          toleranceType: input.toleranceType,
          nominalValue: input.nominalValue,
          upperLimit: input.upperLimit,
          lowerLimit: input.lowerLimit,
          unitOfMeasure: input.unitOfMeasure,
          inspectionMethod: input.inspectionMethod,
          inspectionFrequency: input.inspectionFrequency,
          measuredValues: input.measuredValues as any,
          actualValue,
          deviation,
          result,
          notes: input.notes,
        },
      });

      logger.info(`Characteristic updated`, {
        characteristicId,
        result: updated.result,
      });

      return this.mapToCharacteristic(updated);
    } catch (error) {
      logger.error('Error updating characteristic', { error, characteristicId, input });
      throw error;
    }
  }

  /**
   * Delete characteristic
   *
   * @param characteristicId - Characteristic ID
   */
  async deleteCharacteristic(characteristicId: string): Promise<void> {
    try {
      const characteristic = await this.prisma.fAICharacteristic.findUnique({
        where: { id: characteristicId },
      });

      if (!characteristic) {
        throw new Error(`Characteristic not found with ID: ${characteristicId}`);
      }

      await this.prisma.fAICharacteristic.delete({
        where: { id: characteristicId },
      });

      logger.info(`Characteristic deleted`, { characteristicId });
    } catch (error) {
      logger.error('Error deleting characteristic', { error, characteristicId });
      throw error;
    }
  }

  /**
   * Get characteristics for FAI report
   *
   * @param faiReportId - FAI report ID
   * @returns List of characteristics
   */
  async getCharacteristics(faiReportId: string): Promise<FAICharacteristic[]> {
    try {
      const characteristics = await this.prisma.fAICharacteristic.findMany({
        where: { faiReportId },
        orderBy: { characteristicNumber: 'asc' },
      });

      return characteristics.map((char) => this.mapToCharacteristic(char));
    } catch (error) {
      logger.error('Error getting characteristics', { error, faiReportId });
      throw error;
    }
  }

  /**
   * Approve FAI report
   *
   * @param faiReportId - FAI report ID
   * @param approvedById - User ID approving the report
   * @returns Updated FAI report
   */
  async approveFAIReport(faiReportId: string, approvedById: string): Promise<FAIReport> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
        include: { characteristics: true },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      // Validate that all characteristics have been measured
      const unmeasuredChars = faiReport.characteristics.filter(
        (char) => !char.actualValue && !char.result
      );

      if (unmeasuredChars.length > 0) {
        throw new Error(
          `Cannot approve FAI report: ${unmeasuredChars.length} characteristics have not been measured`
        );
      }

      // Check for failed characteristics
      const failedChars = faiReport.characteristics.filter(
        (char) => char.result === CharacteristicResult.FAIL
      );

      if (failedChars.length > 0) {
        logger.warn(`Approving FAI report with ${failedChars.length} failed characteristics`, {
          faiId: faiReportId,
          failedCount: failedChars.length,
        });
      }

      const updated = await this.prisma.fAIReport.update({
        where: { id: faiReportId },
        data: {
          status: FAIStatus.APPROVED,
          approvedById,
          approvedAt: new Date(),
        },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });

      logger.info(`FAI report approved`, {
        faiId: faiReportId,
        approvedById,
        characteristicsCount: updated.characteristics.length,
        failedCount: failedChars.length,
      });

      return this.mapToFAIReport(updated);
    } catch (error) {
      logger.error('Error approving FAI report', { error, faiReportId });
      throw error;
    }
  }

  /**
   * Generate QIF MeasurementPlan from FAI report
   * Creates a QIF 3.0 measurement plan suitable for CMM programming
   *
   * @param faiReportId - FAI report ID
   * @returns QIF MeasurementPlan XML
   */
  async generateQIFPlan(faiReportId: string): Promise<string> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      // Get part information
      const part = await this.prisma.part.findUnique({
        where: { id: faiReport.partId },
      });

      if (!part) {
        throw new Error(`Part not found with ID: ${faiReport.partId}`);
      }

      const partNumber = part.partNumber;
      const revision = faiReport.revisionLevel || 'A';

      // Convert FAI characteristics to QIF plan format
      const characteristics = faiReport.characteristics.map((char) => ({
        balloonNumber: char.characteristicNumber.toString(),
        description: char.characteristic,
        nominalValue: char.nominalValue || 0,
        upperTolerance: char.upperLimit || 0,
        lowerTolerance: char.lowerLimit || 0,
      }));

      // Create QIF document
      const qifDoc = this.qifService.createMeasurementPlan({
        partNumber,
        revision,
        characteristics: characteristics.map(c => ({ ...c, characteristicType: 'DIMENSIONAL' })) as any,
      });

      // Generate XML
      const qifXml = this.qifService.generateQIF(qifDoc);

      // Store QIF plan in database
      await this.prisma.qIFMeasurementPlan.create({
        data: {
          qifPlanId: `FAI-${faiReport.faiNumber}`,
          partNumber,
          partRevision: revision,
          planVersion: '1.0',
          qifXmlContent: qifXml,
          qifVersion: '3.0.0',
          characteristicCount: faiReport.characteristics.length,
          faiReportId: faiReport.id,
          status: 'ACTIVE',
        },
      });

      logger.info(`QIF measurement plan generated for FAI report`, {
        faiId: faiReportId,
        faiNumber: faiReport.faiNumber,
        characteristicsCount: faiReport.characteristics.length,
      });

      return qifXml;
    } catch (error) {
      logger.error('Error generating QIF plan', { error, faiReportId });
      throw error;
    }
  }

  /**
   * Generate QIF MeasurementResults from FAI report
   * Creates a QIF 3.0 results document with actual measurements
   *
   * @param faiReportId - FAI report ID
   * @param serialNumber - Optional serial number
   * @returns QIF MeasurementResults XML
   */
  async generateQIFResults(faiReportId: string, serialNumber?: string): Promise<string> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      // Get part information
      const part = await this.prisma.part.findUnique({
        where: { id: faiReport.partId },
      });

      if (!part) {
        throw new Error(`Part not found with ID: ${faiReport.partId}`);
      }

      const partNumber = part.partNumber;

      // Convert FAI characteristics to QIF results format
      const measurements = faiReport.characteristics
        .filter((char) => char.actualValue !== null)
        .map((char) => ({
          characteristicId: `CHAR-${char.characteristicNumber}`,
          measuredValue: char.actualValue || 0,
          status: char.result === CharacteristicResult.PASS ? 'PASS' as const : 'FAIL' as const,
        }));

      // Determine overall status
      const hasFailures = faiReport.characteristics.some(
        (char) => char.result === CharacteristicResult.FAIL
      );
      const overallStatus = hasFailures ? 'FAIL' : 'PASS';

      // Get inspector information
      const inspectedBy = faiReport.approvedById || faiReport.createdById || 'Unknown';

      // Create QIF results document
      const qifDoc = this.qifService.createMeasurementResults({
        partNumber,
        serialNumber,
        measurements: measurements.map((m, idx) => ({ ...m, balloonNumber: `CHAR-${idx + 1}` })) as any,
        inspectedBy,
      });

      // Generate XML
      const qifXml = this.qifService.generateQIF(qifDoc);

      // Store QIF results in database
      await this.prisma.qIFMeasurementResult.create({
        data: {
          qifResultsId: `FAI-RESULT-${faiReport.faiNumber}`,
          partNumber,
          serialNumber,
          inspectionDate: faiReport.approvedAt || new Date(),
          inspectedBy,
          overallStatus,
          qifXmlContent: qifXml,
          faiReportId: faiReport.id,
        },
      });

      logger.info(`QIF measurement results generated for FAI report`, {
        faiId: faiReportId,
        faiNumber: faiReport.faiNumber,
        overallStatus,
        measurementsCount: measurements.length,
      });

      return qifXml;
    } catch (error) {
      logger.error('Error generating QIF results', { error, faiReportId });
      throw error;
    }
  }

  /**
   * Export FAI report as complete QIF document
   * Generates both MeasurementPlan and MeasurementResults in single QIF file
   *
   * @param faiReportId - FAI report ID
   * @param serialNumber - Optional serial number
   * @returns Complete QIF XML document
   */
  async exportFAIAsQIF(faiReportId: string, serialNumber?: string): Promise<string> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
        include: {
          characteristics: {
            orderBy: { characteristicNumber: 'asc' },
          },
        },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      // Get part information
      const part = await this.prisma.part.findUnique({
        where: { id: faiReport.partId },
      });

      if (!part) {
        throw new Error(`Part not found with ID: ${faiReport.partId}`);
      }

      const partNumber = part.partNumber;
      const revision = faiReport.revisionLevel || 'A';

      // Build complete QIF document with both plan and results
      const qifDoc: QIFDocument = {
        QIFDocument: {
          Version: '3.0.0',
          idMax: faiReport.characteristics.length + 100,
          FileUnits: {
            PrimaryUnits: { UnitName: 'inch' },
            AngularUnits: { UnitName: 'degree' },
          },
          Header: {
            Author: 'MES FAI Module',
            Organization: 'Manufacturing Enterprise',
            CreationDate: new Date().toISOString(),
          },
          Product: [
            {
              id: '1',
              PartNumber: partNumber,
              PartName: part.partName,
              Revision: revision,
              // PartFamily not in QIFProduct type - using PartName instead
            },
          ],
          MeasurementPlan: {
            id: `FAI-PLAN-${faiReport.faiNumber}`,
            Version: '1.0',
            CreationDate: faiReport.createdAt.toISOString(),
            InspectionSteps: faiReport.characteristics.map((char, idx) => ({
              id: `STEP-${idx + 1}`,
              CharacteristicId: `CHAR-${char.characteristicNumber}`,
              BalloonNumber: char.characteristicNumber.toString(),
              NominalValue: char.nominalValue || undefined,
              UpperLimit: char.upperLimit || undefined,
              LowerLimit: char.lowerLimit || undefined,
              CharacteristicType: char.toleranceType || undefined,
            })) as any,
          },
          MeasurementResults: {
            id: `FAI-RESULTS-${faiReport.faiNumber}`,
            MeasurementDate: (faiReport.approvedAt || new Date()).toISOString(),
            MeasuredBy: faiReport.approvedById || faiReport.createdById || 'Unknown',
            InspectionStatus: faiReport.characteristics.some((c) => c.result === CharacteristicResult.FAIL)
              ? 'FAIL'
              : 'PASS',
            Results: faiReport.characteristics
              .filter((char) => char.actualValue !== null)
              .map((char) => ({
                CharacteristicId: `CHAR-${char.characteristicNumber}`,
                MeasuredValue: char.actualValue || 0,
                Status: char.result === CharacteristicResult.PASS ? 'PASS' : 'FAIL',
                Deviation: char.deviation,
              })) as any,
            Summary: {
              TotalCharacteristics: faiReport.characteristics.length,
              PassedCharacteristics: faiReport.characteristics.filter((c) => c.result === CharacteristicResult.PASS).length,
              FailedCharacteristics: faiReport.characteristics.filter((c) => c.result === CharacteristicResult.FAIL).length,
              OverallStatus: faiReport.characteristics.some((c) => c.result === CharacteristicResult.FAIL) ? 'FAIL' as const : 'PASS' as const,
              InspectionDate: (faiReport.approvedAt || new Date()).toISOString(),
            },
          },
        },
      };

      // Generate XML
      const qifXml = this.qifService.generateQIF(qifDoc);

      logger.info(`Complete QIF AS9102 document exported for FAI report`, {
        faiId: faiReportId,
        faiNumber: faiReport.faiNumber,
        partNumber,
      });

      return qifXml;
    } catch (error) {
      logger.error('Error exporting FAI as QIF', { error, faiReportId });
      throw error;
    }
  }

  /**
   * Import QIF MeasurementResults into FAI report
   * Updates FAI characteristics with CMM measurement data
   *
   * @param faiReportId - FAI report ID
   * @param qifXml - QIF XML string
   * @returns Updated FAI report
   */
  async importQIFResults(faiReportId: string, qifXml: string): Promise<FAIReport> {
    try {
      const faiReport = await this.prisma.fAIReport.findUnique({
        where: { id: faiReportId },
        include: {
          characteristics: true,
        },
      });

      if (!faiReport) {
        throw new Error(`FAI report not found with ID: ${faiReportId}`);
      }

      // Parse QIF XML
      const importResult = await this.qifService.importQIF(qifXml);

      if (!importResult.measurements || typeof importResult.measurements === 'number') {
        throw new Error('No measurement results found in QIF document');
      }

      // Update FAI characteristics with QIF results
      let updatedCount = 0;
      const results = Array.isArray(importResult.measurements) ? importResult.measurements : (importResult.measurements as any).results || [];
      for (const result of results) {
        // Find matching characteristic by ID or balloon number
        const charMatch = faiReport.characteristics.find(
          (char) =>
            char.characteristicNumber.toString() === result.characteristicId ||
            `CHAR-${char.characteristicNumber}` === result.characteristicId
        );

        if (charMatch) {
          await this.prisma.fAICharacteristic.update({
            where: { id: charMatch.id },
            data: {
              actualValue: result.measuredValue,
              deviation: result.deviation,
              result: result.status,
            },
          });
          updatedCount++;
        }
      }

      logger.info(`QIF results imported into FAI report`, {
        faiId: faiReportId,
        faiNumber: faiReport.faiNumber,
        updatedCount,
      });

      // Return updated FAI report
      return this.getFAIReport(faiReportId) as Promise<FAIReport>;
    } catch (error) {
      logger.error('Error importing QIF results', { error, faiReportId });
      throw error;
    }
  }

  /**
   * Map Prisma FAI report to API type
   */
  private mapToFAIReport(
    report: PrismaFAIReport & { characteristics?: PrismaFAICharacteristic[] }
  ): FAIReport {
    return {
      id: report.id,
      faiNumber: report.faiNumber,
      partId: report.partId,
      workOrderId: report.workOrderId || undefined,
      inspectionId: report.inspectionId || undefined,
      status: report.status as FAIStatus,
      revisionLevel: report.revisionLevel || undefined,
      form1Data: report.form1Data as any,
      form2Data: report.form2Data as any,
      characteristics: report.characteristics?.map((char) => this.mapToCharacteristic(char)),
      createdById: report.createdById || undefined,
      reviewedById: report.reviewedById || undefined,
      approvedById: report.approvedById || undefined,
      reviewedAt: report.reviewedAt || undefined,
      approvedAt: report.approvedAt || undefined,
      createdAt: report.createdAt,
      updatedAt: report.updatedAt,
    };
  }

  /**
   * Map Prisma characteristic to API type
   */
  private mapToCharacteristic(char: PrismaFAICharacteristic): FAICharacteristic {
    return {
      id: char.id,
      faiReportId: char.faiReportId,
      characteristicNumber: char.characteristicNumber,
      characteristic: char.characteristic,
      specification: char.specification,
      requirement: char.requirement || undefined,
      toleranceType: char.toleranceType as any,
      nominalValue: char.nominalValue || undefined,
      upperLimit: char.upperLimit || undefined,
      lowerLimit: char.lowerLimit || undefined,
      unitOfMeasure: char.unitOfMeasure || undefined,
      inspectionMethod: char.inspectionMethod as any,
      inspectionFrequency: char.inspectionFrequency || undefined,
      measuredValues: char.measuredValues as number[],
      actualValue: char.actualValue || undefined,
      deviation: char.deviation || undefined,
      result: char.result as any,
      notes: char.notes || undefined,
      verifiedById: char.verifiedById || undefined,
      verifiedAt: char.verifiedAt || undefined,
      createdAt: char.createdAt,
      updatedAt: char.updatedAt,
    };
  }
}

// Export singleton instance
export const faiService = new FAIService(new PrismaClient());
