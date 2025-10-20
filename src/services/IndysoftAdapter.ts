import axios, { AxiosInstance, AxiosError } from 'axios';
import { PrismaClient } from '@prisma/client';
import { QIFService } from './QIFService';
import { QIFDocument, QIFResources, MeasurementDevice } from '@/types/qif';

const prisma = new PrismaClient();

/**
 * Indysoft Gauge Calibration Adapter
 *
 * Integrates with Indysoft for gauge/instrument calibration management
 * with ISO 17025 and AS9100 compliance for aerospace manufacturing.
 *
 * Features:
 * - Gauge calibration certificate management
 * - Measurement uncertainty tracking per ISO 17025
 * - NIST traceability chain documentation
 * - Out-of-tolerance detection and suspect material quarantine
 * - Automatic NCR generation for out-of-cal gauges
 * - MSA/Gage R&R study tracking
 * - Calibration due date tracking and alerts
 * - Digital thread linking gauges to parts measured
 * - Certificate storage and retrieval
 * - Calibration history and trends
 *
 * ISO 17025 Compliance:
 * - Measurement uncertainty budgets
 * - Traceability to NIST/national standards
 * - Calibration procedures and methods
 * - Environmental conditions documentation
 * - Competence of calibration personnel
 *
 * AS9100 Compliance:
 * - Clause 7.1.5: Monitoring and Measuring Resources
 * - Clause 7.1.5.1: Measurement Traceability
 * - Clause 7.1.5.2: Measurement System Analysis (MSA)
 * - Out-of-tolerance investigation and NCR process
 * - Suspect material identification and quarantine
 *
 * Indysoft API Documentation:
 * https://www.indysoft.com/api-documentation
 */

export interface IndysoftConfig {
  baseUrl: string;              // Indysoft server URL
  username: string;             // Authentication username
  password: string;             // Authentication password
  apiKey?: string;              // API Key
  timeout?: number;             // Request timeout (ms)
  retryAttempts?: number;       // Number of retry attempts
  autoCheckDueDates?: boolean;  // Automatically check for gauges coming due
  dueDateWarningDays?: number;  // Days before due date to warn (default: 30)
  autoQuarantineOnOutOfCal?: boolean; // Automatically quarantine parts when gauge is out-of-cal
}

/**
 * Gauge/Instrument Master Data
 */
export interface IndysoftGauge {
  gaugeId: string;              // Unique gauge ID
  description: string;          // Gauge description
  manufacturer?: string;        // Manufacturer
  model?: string;               // Model number
  serialNumber?: string;        // Serial number
  gaugeType: string;            // Type (CMM, Micrometer, Caliper, etc.)
  measurementType: string;      // What it measures (Length, Angle, Temperature, etc.)
  range?: string;               // Measurement range (e.g., "0-6 inches")
  resolution?: number;          // Instrument resolution
  accuracy?: number;            // Instrument accuracy
  location?: string;            // Storage location
  calibrationFrequency?: number; // Calibration frequency (days)
  lastCalibrationDate?: Date;   // Last calibration date
  nextCalibrationDate?: Date;   // Next calibration due date
  calibrationStatus: 'IN_CAL' | 'OUT_OF_CAL' | 'DUE' | 'OVERDUE' | 'QUARANTINE';
  isActive?: boolean;           // Currently active
}

/**
 * Calibration Certificate
 */
export interface CalibrationCertificate {
  certificateNumber: string;    // Certificate number
  gaugeId: string;              // Gauge ID
  calibrationDate: Date;        // Date calibrated
  dueDate: Date;                // Next due date
  calibratedBy?: string;        // Technician who performed calibration
  calibrationLab?: string;      // Lab that performed calibration (internal/external)
  procedure?: string;           // Calibration procedure used
  asFoundCondition: 'PASS' | 'FAIL' | 'LIMITED'; // As-found condition
  asLeftCondition: 'PASS' | 'FAIL'; // As-left condition
  uncertainty?: number;         // Measurement uncertainty (±)
  uncertaintyUnit?: string;     // Uncertainty unit
  uncertaintyK?: number;        // Coverage factor (k=2 for 95% confidence)
  traceabilityChain?: string;   // NIST traceability chain
  environmentalConditions?: {   // Environmental conditions during calibration
    temperature?: number;
    humidity?: number;
    pressure?: number;
  };
  certificateUrl?: string;      // URL to certificate PDF
  notes?: string;               // Additional notes
}

/**
 * Measurement Uncertainty Budget
 */
export interface UncertaintyBudget {
  gaugeId: string;
  totalUncertainty: number;     // Combined standard uncertainty
  coverageFactor: number;       // k-factor (typically 2)
  expandedUncertainty: number;  // Total uncertainty with confidence level
  components: Array<{           // Uncertainty components
    source: string;             // Source of uncertainty (resolution, linearity, repeatability, etc.)
    value: number;              // Uncertainty value
    distribution: 'normal' | 'rectangular' | 'triangular'; // Statistical distribution
    divisor: number;            // Divisor for standard uncertainty
  }>;
}

/**
 * MSA/Gage R&R Study
 */
export interface GageRRStudy {
  studyId: string;
  gaugeId: string;
  studyDate: Date;
  studyType: 'ANOVA' | 'XBAR_R';
  operators: string[];          // Operators who participated
  parts: number;                // Number of parts measured
  trials: number;               // Number of trials per part
  grr: number;                  // Total Gage R&R (%)
  repeatability: number;        // Equipment variation (EV) %
  reproducibility: number;      // Appraiser variation (AV) %
  partVariation: number;        // Part-to-part variation (PV) %
  ndc: number;                  // Number of distinct categories
  acceptable: boolean;          // Study passed (GRR < 10% excellent, < 30% acceptable)
  studyUrl?: string;            // URL to study report
}

/**
 * Out-of-Calibration Investigation
 */
export interface OutOfCalInvestigation {
  investigationId: string;
  gaugeId: string;
  discoveryDate: Date;
  lastCalibrationDate: Date;
  asFoundCondition: string;
  outOfToleranceBy: number;     // How far out of tolerance
  affectedParts: string[];      // Serial numbers of parts measured with this gauge
  rootCause?: string;           // Root cause of out-of-cal condition
  correctiveAction?: string;    // Corrective action taken
  ncrNumber?: string;           // NCR number if generated
  dispositionRequired: boolean; // Does this require part disposition?
}

/**
 * Sync Result
 */
export interface CalibrationSyncResult {
  success: boolean;
  gaugesSynced: number;
  gaugesFailed: number;
  errors: Array<{ gaugeId: string; error: string }>;
  duration: number;
}

export class IndysoftAdapter {
  private config: IndysoftConfig;
  private httpClient: AxiosInstance;
  private qifService: QIFService;

  constructor(config: IndysoftConfig) {
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      autoCheckDueDates: true,
      dueDateWarningDays: 30,
      autoQuarantineOnOutOfCal: true,
      ...config,
    };

    // Initialize QIF service for Resources export
    this.qifService = new QIFService();

    // Create HTTP client for Indysoft API
    const authHeader = this.config.apiKey
      ? { 'X-API-Key': this.config.apiKey }
      : { 'Authorization': `Basic ${Buffer.from(`${this.config.username}:${this.config.password}`).toString('base64')}` };

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
        console.error('Indysoft API error:', error.response?.data || error.message);
        return Promise.reject(error);
      }
    );

    console.log('Indysoft Calibration Adapter initialized');
  }

  /**
   * Test connection to Indysoft
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
   * Sync gauge master data from Indysoft to MES
   */
  async syncGaugesFromIndysoft(activeOnly: boolean = true): Promise<CalibrationSyncResult> {
    const startTime = Date.now();
    const result: CalibrationSyncResult = {
      success: false,
      gaugesSynced: 0,
      gaugesFailed: 0,
      errors: [],
      duration: 0,
    };

    try {
      const params: any = {};
      if (activeOnly) {
        params.status = 'active';
      }

      const response = await this.httpClient.get('/api/v1/gauges', { params });
      const gauges = response.data.gauges || [];

      for (const gauge of gauges) {
        try {
          const existingGauge = await prisma.measurementEquipment.findFirst({
            where: { externalGaugeId: gauge.gaugeId },
          });

          // Determine calibration status
          let calibrationStatus = 'IN_CAL';
          const nextDueDate = gauge.nextCalibrationDate ? new Date(gauge.nextCalibrationDate) : null;
          const now = new Date();

          if (nextDueDate) {
            if (nextDueDate < now) {
              calibrationStatus = 'OVERDUE';
            } else {
              const daysUntilDue = Math.floor((nextDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              if (daysUntilDue <= (this.config.dueDateWarningDays || 30)) {
                calibrationStatus = 'DUE';
              }
            }
          }

          const gaugeData = {
            externalGaugeId: gauge.gaugeId,
            description: gauge.description,
            manufacturer: gauge.manufacturer,
            model: gauge.model,
            serialNumber: gauge.serialNumber,
            gaugeType: gauge.gaugeType,
            measurementType: gauge.measurementType,
            measurementRange: gauge.range,
            resolution: gauge.resolution,
            accuracy: gauge.accuracy,
            location: gauge.location,
            calibrationFrequency: gauge.calibrationFrequency,
            lastCalibrationDate: gauge.lastCalibrationDate ? new Date(gauge.lastCalibrationDate) : null,
            nextCalibrationDate: nextDueDate,
            calibrationStatus,
            isActive: gauge.isActive !== false,
            lastSyncedAt: new Date(),
          };

          if (existingGauge) {
            await prisma.measurementEquipment.update({
              where: { id: existingGauge.id },
              data: gaugeData,
            });
          } else {
            await prisma.measurementEquipment.create({
              data: gaugeData,
            });
          }

          result.gaugesSynced++;
        } catch (error: any) {
          result.gaugesFailed++;
          result.errors.push({
            gaugeId: gauge.gaugeId,
            error: error.message,
          });
        }
      }

      result.success = true;
      result.duration = Date.now() - startTime;

      console.log(`Synced ${result.gaugesSynced} gauges from Indysoft (${result.gaugesFailed} failed)`);
      return result;
    } catch (error: any) {
      result.duration = Date.now() - startTime;
      result.errors.push({
        gaugeId: 'bulk_sync',
        error: error.message,
      });
      console.error('Failed to sync gauges from Indysoft:', error.message);
      return result;
    }
  }

  /**
   * Get calibration certificate for a gauge
   */
  async getCalibrationCertificate(gaugeId: string): Promise<CalibrationCertificate | null> {
    try {
      const response = await this.httpClient.get(`/api/v1/gauges/${gaugeId}/certificates/latest`);
      const cert = response.data.certificate;

      if (!cert) {
        return null;
      }

      return {
        certificateNumber: cert.certificateNumber,
        gaugeId: cert.gaugeId,
        calibrationDate: new Date(cert.calibrationDate),
        dueDate: new Date(cert.dueDate),
        calibratedBy: cert.calibratedBy,
        calibrationLab: cert.calibrationLab,
        procedure: cert.procedure,
        asFoundCondition: cert.asFoundCondition,
        asLeftCondition: cert.asLeftCondition,
        uncertainty: cert.uncertainty,
        uncertaintyUnit: cert.uncertaintyUnit,
        uncertaintyK: cert.uncertaintyK || 2,
        traceabilityChain: cert.traceabilityChain,
        environmentalConditions: cert.environmentalConditions,
        certificateUrl: cert.certificateUrl,
        notes: cert.notes,
      };
    } catch (error: any) {
      console.error(`Failed to get calibration certificate for ${gaugeId}:`, error.message);
      return null;
    }
  }

  /**
   * Check for gauges coming due for calibration
   * Returns list of gauges that need calibration within warning period
   */
  async checkGaugesDueSoon(warningDays?: number): Promise<IndysoftGauge[]> {
    try {
      const days = warningDays || this.config.dueDateWarningDays || 30;
      const response = await this.httpClient.get('/api/v1/gauges/due-soon', {
        params: { days },
      });

      return response.data.gauges || [];
    } catch (error: any) {
      console.error('Failed to check gauges due soon:', error.message);
      return [];
    }
  }

  /**
   * Get measurement uncertainty budget for a gauge
   * Critical for ISO 17025 compliance
   */
  async getUncertaintyBudget(gaugeId: string): Promise<UncertaintyBudget | null> {
    try {
      const response = await this.httpClient.get(`/api/v1/gauges/${gaugeId}/uncertainty-budget`);
      return response.data.uncertaintyBudget || null;
    } catch (error: any) {
      console.error(`Failed to get uncertainty budget for ${gaugeId}:`, error.message);
      return null;
    }
  }

  /**
   * Get Gage R&R study results
   * Critical for AS9100 Clause 7.1.5.2 MSA requirements
   */
  async getGageRRStudy(gaugeId: string): Promise<GageRRStudy | null> {
    try {
      const response = await this.httpClient.get(`/api/v1/gauges/${gaugeId}/grr/latest`);
      const study = response.data.study;

      if (!study) {
        return null;
      }

      return {
        studyId: study.studyId,
        gaugeId: study.gaugeId,
        studyDate: new Date(study.studyDate),
        studyType: study.studyType,
        operators: study.operators,
        parts: study.parts,
        trials: study.trials,
        grr: study.grr,
        repeatability: study.repeatability,
        reproducibility: study.reproducibility,
        partVariation: study.partVariation,
        ndc: study.ndc,
        acceptable: study.grr < 30, // GRR < 10% excellent, 10-30% acceptable, >30% unacceptable
        studyUrl: study.studyUrl,
      };
    } catch (error: any) {
      console.error(`Failed to get Gage R&R study for ${gaugeId}:`, error.message);
      return null;
    }
  }

  /**
   * Handle out-of-calibration event
   * AS9100 requires investigation of all measurements taken with out-of-cal gauge
   */
  async handleOutOfCalibration(
    gaugeId: string,
    asFoundCondition: string,
    outOfToleranceBy: number
  ): Promise<OutOfCalInvestigation> {
    try {
      // Find all parts measured with this gauge since last calibration
      const gauge = await prisma.measurementEquipment.findFirst({
        where: { externalGaugeId: gaugeId },
      });

      if (!gauge) {
        throw new Error(`Gauge ${gaugeId} not found in MES`);
      }

      // Find inspection records using this gauge since last calibration
      const lastCalDate = gauge.lastCalibrationDate || new Date(0);
      const affectedInspections = await prisma.inspectionRecord.findMany({
        where: {
          measurementEquipmentId: gauge.id,
          inspectionDate: {
            gte: lastCalDate,
          },
        },
      });

      const affectedParts = affectedInspections
        .filter(insp => insp.serializedPartId)
        .map(insp => insp.serializedPartId!);

      const investigation: OutOfCalInvestigation = {
        investigationId: `OUT_OF_CAL_${gaugeId}_${Date.now()}`,
        gaugeId,
        discoveryDate: new Date(),
        lastCalibrationDate: lastCalDate,
        asFoundCondition,
        outOfToleranceBy,
        affectedParts: Array.from(new Set(affectedParts)),
        dispositionRequired: affectedParts.length > 0,
      };

      // Auto-quarantine affected parts if configured
      if (this.config.autoQuarantineOnOutOfCal && affectedParts.length > 0) {
        console.log(`Quarantining ${affectedParts.length} parts measured with out-of-cal gauge ${gaugeId}`);

        // Update serial numbers to quarantine status
        await prisma.serializedPart.updateMany({
          where: {
            serialNumber: { in: affectedParts },
          },
          data: {
            status: 'QUARANTINE',
          },
        });

        // Generate NCR for investigation (if NCR model exists)
        // Note: nonConformanceReport model may not exist in current schema
        const ncr = await (prisma as any).nonConformanceReport?.create({
          data: {
            ncrNumber: `NCR-GAUGE-${Date.now()}`,
            description: `Out-of-calibration gauge ${gaugeId} detected. ${affectedParts.length} parts affected.`,
            severity: 'MAJOR',
            status: 'OPEN',
            detectionSource: 'CALIBRATION',
            rootCause: `Gauge ${gaugeId} found out of tolerance by ${outOfToleranceBy} during calibration`,
            affectedQuantity: affectedParts.length,
            detectedAt: new Date(),
          },
        });

        investigation.ncrNumber = ncr.ncrNumber;
      }

      console.log(`Out-of-calibration investigation created: ${investigation.investigationId}`);
      return investigation;
    } catch (error: any) {
      console.error('Failed to handle out-of-calibration event:', error.message);
      throw new Error(`Failed to handle out-of-calibration: ${error.message}`);
    }
  }

  /**
   * Validate gauge is in calibration before use
   * Should be called before any inspection/measurement
   */
  async validateGaugeInCalibration(gaugeId: string): Promise<{
    isValid: boolean;
    status: string;
    daysUntilDue?: number;
    message?: string;
  }> {
    try {
      const gauge = await prisma.measurementEquipment.findFirst({
        where: { externalGaugeId: gaugeId },
      });

      if (!gauge) {
        return {
          isValid: false,
          status: 'NOT_FOUND',
          message: `Gauge ${gaugeId} not found`,
        };
      }

      if (!gauge.isActive) {
        return {
          isValid: false,
          status: 'INACTIVE',
          message: `Gauge ${gaugeId} is inactive`,
        };
      }

      const now = new Date();
      const dueDate = gauge.nextCalibrationDate;

      if (!dueDate) {
        return {
          isValid: false,
          status: 'NO_DUE_DATE',
          message: `Gauge ${gaugeId} has no calibration due date`,
        };
      }

      if (dueDate < now) {
        return {
          isValid: false,
          status: 'OVERDUE',
          message: `Gauge ${gaugeId} calibration is overdue`,
        };
      }

      const daysUntilDue = Math.floor((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      return {
        isValid: true,
        status: 'IN_CAL',
        daysUntilDue,
        message: `Gauge ${gaugeId} is in calibration (${daysUntilDue} days until due)`,
      };
    } catch (error: any) {
      console.error(`Failed to validate gauge ${gaugeId}:`, error.message);
      return {
        isValid: false,
        status: 'ERROR',
        message: error.message,
      };
    }
  }

  /**
   * Link gauge measurement to part for traceability
   * Digital thread requirement for AS9100
   */
  async linkMeasurementToPart(
    gaugeId: string,
    serialNumber: string,
    measurementData: {
      characteristic: string;
      nominalValue: number;
      actualValue: number;
      lowerTolerance: number;
      upperTolerance: number;
      unit: string;
    }
  ): Promise<void> {
    try {
      const gauge = await prisma.measurementEquipment.findFirst({
        where: { externalGaugeId: gaugeId },
      });

      if (!gauge) {
        throw new Error(`Gauge ${gaugeId} not found`);
      }

      const serial = await prisma.serializedPart.findFirst({
        where: { serialNumber },
      });

      if (!serial) {
        throw new Error(`Serial number ${serialNumber} not found`);
      }

      // Validate gauge is in calibration
      const validation = await this.validateGaugeInCalibration(gaugeId);
      if (!validation.isValid) {
        throw new Error(`Cannot use out-of-calibration gauge: ${validation.message}`);
      }

      // Create inspection record
      await prisma.inspectionRecord.create({
        data: {
          serializedPartId: serial.id,
          measurementEquipmentId: gauge.id,
          characteristic: measurementData.characteristic,
          nominalValue: measurementData.nominalValue,
          actualValue: measurementData.actualValue,
          lowerTolerance: measurementData.lowerTolerance,
          upperTolerance: measurementData.upperTolerance,
          unit: measurementData.unit,
          result: (measurementData.actualValue >= measurementData.lowerTolerance &&
                   measurementData.actualValue <= measurementData.upperTolerance) ? 'PASS' : 'FAIL',
          inspectionDate: new Date(),
        },
      });

      console.log(`Linked measurement for ${serialNumber} using gauge ${gaugeId}`);
    } catch (error: any) {
      console.error('Failed to link measurement to part:', error.message);
      throw error;
    }
  }

  /**
   * Export gauge as QIF Resource
   * Generates QIF 3.0 Resources document for a single gauge
   * Includes calibration, uncertainty budget, and capabilities
   */
  async exportGaugeAsQIFResource(gaugeId: string): Promise<string> {
    try {
      const gauge = await prisma.measurementEquipment.findFirst({
        where: { externalGaugeId: gaugeId },
      });

      if (!gauge) {
        throw new Error(`Gauge ${gaugeId} not found`);
      }

      // Get calibration certificate
      const certificate = await this.getCalibrationCertificate(gaugeId);

      // Get uncertainty budget
      const uncertaintyBudget = await this.getUncertaintyBudget(gaugeId);

      // Build QIF MeasurementDevice
      const measurementDevice = {
        '@_id': `GAUGE-${gauge.id}`,
        Name: gauge.description,
        Manufacturer: gauge.manufacturer || 'Unknown',
        Model: gauge.model || undefined,
        SerialNumber: gauge.serialNumber || undefined,
        DeviceType: (gauge.gaugeType as any) || 'MANUAL',
        MeasurementCapability: {
          MeasurementType: gauge.measurementType,
          Range: gauge.measurementRange || undefined,
          Resolution: gauge.resolution ? String(gauge.resolution) : undefined,
          Accuracy: gauge.accuracy ? String(gauge.accuracy) : undefined,
        },
        CalibrationStatus: {
          Status: gauge.calibrationStatus,
          LastCalibrationDate: gauge.lastCalibrationDate?.toISOString(),
          NextCalibrationDate: gauge.nextCalibrationDate?.toISOString(),
          CalibrationFrequency: gauge.calibrationFrequency ? `${gauge.calibrationFrequency} days` : undefined,
        },
      };

      // Add calibration certificate if available
      if (certificate) {
        (measurementDevice as any).CalibrationCertificate = {
          CertificateNumber: certificate.certificateNumber,
          CalibrationDate: certificate.calibrationDate.toISOString(),
          DueDate: certificate.dueDate.toISOString(),
          CalibratedBy: certificate.calibratedBy,
          CalibrationLab: certificate.calibrationLab,
          Procedure: certificate.procedure,
          AsFoundCondition: certificate.asFoundCondition,
          AsLeftCondition: certificate.asLeftCondition,
          TraceabilityChain: certificate.traceabilityChain,
          CertificateURL: certificate.certificateUrl,
        };
      }

      // Add uncertainty budget if available
      if (uncertaintyBudget) {
        (measurementDevice as any).UncertaintyBudget = {
          CombinedUncertainty: String(uncertaintyBudget.totalUncertainty),
          CoverageFactor: String(uncertaintyBudget.coverageFactor),
          ExpandedUncertainty: String(uncertaintyBudget.expandedUncertainty),
          UncertaintyComponents: uncertaintyBudget.components.map(comp => ({
            Source: comp.source,
            Value: String(comp.value),
            Distribution: comp.distribution,
          })),
        };
      }

      // Build QIF Resources document
      const qifDoc = {
        QIFDocument: {
          '@_xmlns': 'http://qifstandards.org/xsd/qif3',
          '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          '@_xsi:schemaLocation': 'http://qifstandards.org/xsd/qif3 http://qifstandards.org/xsd/qif3/QIFDocument.xsd',
          '@_versionQIF': '3.0.0',
          '@_idMax': 1,
          Version: '3.0.0' as any,
          Header: {
            Application: {
              Name: 'MES - Indysoft Calibration Integration',
              Organization: 'Manufacturing Execution System',
            },
          } as any,
          FileUnits: {
            PrimaryUnits: {
              LinearUnit: { UnitName: 'mm' },
              AngularUnit: { UnitName: 'degree' },
            } as any,
          },
          Resources: {
            MeasurementDevices: [measurementDevice] as any,
          },
        },
      };

      return this.qifService.generateQIF(qifDoc as any);
    } catch (error: any) {
      console.error(`Failed to export gauge ${gaugeId} as QIF Resource:`, error.message);
      throw error;
    }
  }

  /**
   * Export multiple gauges as QIF Resources document
   * Useful for sending complete gauge list to CMM or FAI system
   */
  async exportGaugesAsQIFResources(
    gaugeIds?: string[],
    activeOnly: boolean = true
  ): Promise<string> {
    try {
      let gauges;

      if (gaugeIds && gaugeIds.length > 0) {
        // Export specific gauges
        gauges = await prisma.measurementEquipment.findMany({
          where: {
            externalGaugeId: { in: gaugeIds },
            ...(activeOnly ? { isActive: true } : {}),
          },
        });
      } else {
        // Export all active gauges
        gauges = await prisma.measurementEquipment.findMany({
          where: activeOnly ? { isActive: true } : {},
          orderBy: { description: 'asc' },
        });
      }

      if (gauges.length === 0) {
        throw new Error('No gauges found to export');
      }

      const measurementDevices: MeasurementDevice[] = [];
      let idCounter = 1;

      // Build MeasurementDevice entries for each gauge
      for (const gauge of gauges) {
        const measurementDevice = {
          '@_id': `GAUGE-${idCounter++}`,
          Name: gauge.description,
          Manufacturer: gauge.manufacturer || 'Unknown',
          Model: gauge.model || undefined,
          SerialNumber: gauge.serialNumber || undefined,
          DeviceType: (gauge.gaugeType as any) || 'MANUAL',
          MeasurementCapability: {
            MeasurementType: gauge.measurementType,
            Range: gauge.measurementRange || undefined,
            Resolution: gauge.resolution ? String(gauge.resolution) : undefined,
            Accuracy: gauge.accuracy ? String(gauge.accuracy) : undefined,
          },
          CalibrationStatus: {
            Status: gauge.calibrationStatus,
            LastCalibrationDate: gauge.lastCalibrationDate?.toISOString(),
            NextCalibrationDate: gauge.nextCalibrationDate?.toISOString(),
            CalibrationFrequency: gauge.calibrationFrequency ? `${gauge.calibrationFrequency} days` : undefined,
          },
        };

        // Optionally fetch detailed calibration info for each gauge
        if (gauge.externalGaugeId) {
          try {
            const certificate = await this.getCalibrationCertificate(gauge.externalGaugeId);
            if (certificate) {
              (measurementDevice as any).CalibrationCertificate = {
                CertificateNumber: certificate.certificateNumber,
                CalibrationDate: certificate.calibrationDate.toISOString(),
                DueDate: certificate.dueDate.toISOString(),
                CalibratedBy: certificate.calibratedBy,
                CalibrationLab: certificate.calibrationLab,
                Procedure: certificate.procedure,
                AsFoundCondition: certificate.asFoundCondition,
                AsLeftCondition: certificate.asLeftCondition,
                TraceabilityChain: certificate.traceabilityChain,
                CertificateURL: certificate.certificateUrl,
              };
            }
          } catch (err) {
            // Continue if certificate fetch fails for individual gauge
            console.warn(`Could not fetch certificate for gauge ${gauge.externalGaugeId}`);
          }
        }

        measurementDevices.push(measurementDevice as any);
      }

      // Build QIF Resources document
      const qifDoc = {
        QIFDocument: {
          '@_xmlns': 'http://qifstandards.org/xsd/qif3',
          '@_xmlns:xsi': 'http://www.w3.org/2001/XMLSchema-instance',
          '@_xsi:schemaLocation': 'http://qifstandards.org/xsd/qif3 http://qifstandards.org/xsd/qif3/QIFDocument.xsd',
          '@_versionQIF': '3.0.0',
          '@_idMax': idCounter - 1,
          Version: '3.0.0' as any,
          Header: {
            Application: {
              Name: 'MES - Indysoft Calibration Integration',
              Organization: 'Manufacturing Execution System',
            },
          } as any,
          FileUnits: {
            PrimaryUnits: {
              LinearUnit: { UnitName: 'mm' },
              AngularUnit: { UnitName: 'degree' },
            } as any,
          },
          Resources: {
            MeasurementDevices: measurementDevices as any,
          },
        },
      };

      console.log(`Exported ${gauges.length} gauges as QIF Resources`);
      return this.qifService.generateQIF(qifDoc as any);
    } catch (error: any) {
      console.error('Failed to export gauges as QIF Resources:', error.message);
      throw error;
    }
  }

  /**
   * Get QIF Resources for specific measurement types
   * Useful for filtering gauges by what they measure (e.g., only length gauges)
   */
  async exportGaugesByMeasurementType(measurementType: string): Promise<string> {
    try {
      const gauges = await prisma.measurementEquipment.findMany({
        where: {
          measurementType,
          isActive: true,
        },
      });

      if (gauges.length === 0) {
        throw new Error(`No active gauges found for measurement type: ${measurementType}`);
      }

      const gaugeIds = gauges
        .filter(g => g.externalGaugeId)
        .map(g => g.externalGaugeId!);

      return this.exportGaugesAsQIFResources(gaugeIds, true);
    } catch (error: any) {
      console.error(`Failed to export gauges for measurement type ${measurementType}:`, error.message);
      throw error;
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
    console.log('Indysoft adapter cleanup completed');
  }
}

export default IndysoftAdapter;
