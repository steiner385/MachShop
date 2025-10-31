import { EventEmitter } from 'events';
import { ErrorSimulationService } from './ErrorSimulationService';

/**
 * IndySoft Calibration Management Surrogate
 *
 * Comprehensive mock implementation of IndySoft APIs for calibration management,
 * gauge tracking, Gage R&R studies, and measurement system analysis. Designed
 * for integration testing without requiring live IndySoft system access.
 */

// Gauge Types and Enums
export enum GaugeType {
  CALIPER = 'CALIPER',
  MICROMETER = 'MICROMETER',
  HEIGHT_GAUGE = 'HEIGHT_GAUGE',
  INDICATOR = 'INDICATOR',
  CMM = 'CMM',
  SURFACE_PLATE = 'SURFACE_PLATE',
  TORQUE_WRENCH = 'TORQUE_WRENCH',
  PRESSURE_GAUGE = 'PRESSURE_GAUGE',
  THERMOMETER = 'THERMOMETER',
  SCALE = 'SCALE',
  THREAD_GAUGE = 'THREAD_GAUGE',
  OPTICAL_COMPARATOR = 'OPTICAL_COMPARATOR'
}

export enum GaugeStatus {
  ACTIVE = 'ACTIVE',
  CALIBRATION_DUE = 'CALIBRATION_DUE',
  OVERDUE = 'OVERDUE',
  OUT_OF_TOLERANCE = 'OUT_OF_TOLERANCE',
  OUT_OF_SERVICE = 'OUT_OF_SERVICE',
  RETIRED = 'RETIRED'
}

export enum CalibrationStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  PASS = 'PASS',
  FAIL = 'FAIL',
  LIMITED_USE = 'LIMITED_USE',
  CANCELLED = 'CANCELLED'
}

export enum CalibrationFrequency {
  DAILY = 30,
  MONTHLY = 30,
  QUARTERLY = 90,
  SEMI_ANNUAL = 180,
  ANNUAL = 365,
  BIENNIAL = 730
}

export enum MeasurementUncertaintyType {
  ABSOLUTE = 'ABSOLUTE',
  RELATIVE = 'RELATIVE',
  PERCENTAGE = 'PERCENTAGE'
}

// Data Models
export interface Gauge {
  gaugeId: string;
  assetTag: string;
  description: string;
  gaugeType: GaugeType;
  status: GaugeStatus;
  manufacturer: string;
  model: string;
  serialNumber: string;
  measurementRange: MeasurementRange;
  resolution: number;
  accuracy: number;
  location: string;
  assignedTo?: string;
  department: string;
  costCenter: string;
  acquisitionDate: Date;
  acquisitionCost?: number;
  calibrationFrequency: number; // in days
  lastCalibrationDate?: Date;
  nextCalibrationDate: Date;
  certificateNumber?: string;
  customAttributes: Record<string, any>;
  createdDate: Date;
  lastModified: Date;
  createdBy: string;
  lastModifiedBy: string;
}

export interface MeasurementRange {
  minimum: number;
  maximum: number;
  units: string;
  nominalValue?: number;
}

export interface CalibrationRecord {
  calibrationId: string;
  gaugeId: string;
  calibrationDate: Date;
  status: CalibrationStatus;
  technician: string;
  calibrationStandard: string;
  environmentalConditions: EnvironmentalConditions;
  procedure: string;
  certificateNumber: string;
  asFoundReadings: CalibrationReading[];
  asLeftReadings: CalibrationReading[];
  adjustmentsMade: string[];
  measurementUncertainty: MeasurementUncertainty;
  passFailCriteria: PassFailCriteria;
  overallResult: 'PASS' | 'FAIL' | 'LIMITED_USE';
  comments?: string;
  nextCalibrationDate: Date;
  attachments: CalibrationAttachment[];
  createdDate: Date;
  createdBy: string;
}

export interface CalibrationReading {
  nominalValue: number;
  actualValue: number;
  error: number;
  tolerance: number;
  withinTolerance: boolean;
  units: string;
}

export interface EnvironmentalConditions {
  temperature: number; // Celsius
  humidity: number; // Percentage
  pressure: number; // kPa
  vibration?: string;
  other?: Record<string, any>;
}

export interface MeasurementUncertainty {
  value: number;
  type: MeasurementUncertaintyType;
  coverageFactor: number;
  confidenceLevel: number; // percentage
  contributingFactors: UncertaintyComponent[];
}

export interface UncertaintyComponent {
  source: string;
  value: number;
  distribution: 'NORMAL' | 'RECTANGULAR' | 'TRIANGULAR';
  sensitivity: number;
}

export interface PassFailCriteria {
  tolerancePercentage: number;
  acceptanceLimit: number;
  units: string;
  specification: string;
}

export interface CalibrationAttachment {
  attachmentId: string;
  filename: string;
  fileType: string;
  fileSize: number;
  description: string;
  uploadDate: Date;
  uploadedBy: string;
}

export interface CalibrationSchedule {
  scheduleId: string;
  gaugeId: string;
  frequency: number; // in days
  nextDueDate: Date;
  isActive: boolean;
  assignedTechnician?: string;
  priority: number; // 1-5
  estimatedDuration: number; // in hours
  specialInstructions?: string;
  requiredStandards: string[];
  environmentalRequirements?: EnvironmentalConditions;
  createdDate: Date;
  lastModified: Date;
}

export interface GageRRStudy {
  studyId: string;
  gaugeId: string;
  studyName: string;
  studyDate: Date;
  conductor: string;
  parts: GageRRPart[];
  operators: string[];
  trials: number;
  measurements: GageRRMeasurement[];
  results: GageRRResults;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  comments?: string;
  createdDate: Date;
  createdBy: string;
}

export interface GageRRPart {
  partId: string;
  partNumber: string;
  description: string;
  nominalValue: number;
  tolerance: number;
  units: string;
}

export interface GageRRMeasurement {
  partId: string;
  operator: string;
  trial: number;
  measurement: number;
  timestamp: Date;
}

export interface GageRRResults {
  repeatability: number; // %GRR
  reproducibility: number; // %GRR
  gageRR: number; // Total %GRR
  partVariation: number; // %PV
  totalVariation: number; // %TV
  numberDistinctCategories: number; // NDC
  studyVariation: number; // SV
  tolerance: number; // Tolerance
  anova: ANOVAResults;
  acceptanceCriteria: {
    gageRRLimit: number; // typically 10% or 30%
    ndcMinimum: number; // typically 5
  };
  conclusion: 'ACCEPTABLE' | 'MARGINAL' | 'UNACCEPTABLE';
  recommendations: string[];
}

export interface ANOVAResults {
  partVariance: number;
  operatorVariance: number;
  partOperatorVariance: number;
  equipmentVariance: number;
  totalVariance: number;
  fStatistics: {
    part: number;
    operator: number;
    partOperator: number;
  };
  pValues: {
    part: number;
    operator: number;
    partOperator: number;
  };
}

export interface OutOfToleranceEvent {
  ootId: string;
  gaugeId: string;
  detectionDate: Date;
  calibrationId: string;
  readings: CalibrationReading[];
  impactAnalysis: ImpactAnalysis;
  correctiveActions: CorrectiveAction[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'CLOSED';
  resolvedDate?: Date;
  resolvedBy?: string;
  cost?: number;
  createdDate: Date;
  createdBy: string;
}

export interface ImpactAnalysis {
  analysisDate: Date;
  analyst: string;
  affectedParts: AffectedPart[];
  affectedWorkOrders: string[];
  riskAssessment: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  remeasurementRequired: boolean;
  quarantineRequired: boolean;
  customerNotificationRequired: boolean;
}

export interface AffectedPart {
  partNumber: string;
  serialNumber?: string;
  measurementDate: Date;
  workOrderId: string;
  characteristic: string;
  measuredValue: number;
  tolerance: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface CorrectiveAction {
  actionId: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  completedDate?: Date;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  verification?: string;
}

// Configuration
export interface IndySoftSurrogateConfig {
  mockMode: boolean;
  enableDataExport: boolean;
  erpEndpoint?: string;
  enableAuditLogging: boolean;
  maxGaugeRecords: number;
  maxCalibrationHistory: number;
  autoGenerateCalibrationDueNotifications: boolean;
  defaultTechnician: string;
  defaultGageRRAcceptanceCriteria: {
    gageRRLimit: number;
    ndcMinimum: number;
  };
  enableErrorSimulation?: boolean;
}

// API Response Types
export interface IndySoftResponse<T> {
  success: boolean;
  data?: T;
  errors?: string[];
  metadata?: {
    totalCount?: number;
    pageSize?: number;
    currentPage?: number;
    hasMore?: boolean;
  };
  timestamp: Date;
}

export interface GaugeQueryFilter {
  gaugeType?: GaugeType;
  status?: GaugeStatus;
  location?: string;
  department?: string;
  assignedTo?: string;
  manufacturer?: string;
  calibrationDueBefore?: Date;
  calibrationDueAfter?: Date;
  search?: string;
  limit?: number;
  offset?: number;
}

export interface CalibrationQueryFilter {
  gaugeId?: string;
  status?: CalibrationStatus;
  technician?: string;
  calibrationAfter?: Date;
  calibrationBefore?: Date;
  overdue?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * IndySoft Calibration Management Surrogate Service
 *
 * Provides comprehensive mock implementation of IndySoft APIs including:
 * - Gauge master data management
 * - Calibration scheduling and records
 * - Gage R&R studies and MSA
 * - Out-of-tolerance management
 * - Impact analysis and corrective actions
 * - Integration with ERP systems
 */
export class IndySoftSurrogate extends EventEmitter {
  private config: IndySoftSurrogateConfig;
  private gaugeStore: Map<string, Gauge> = new Map();
  private calibrationStore: Map<string, CalibrationRecord> = new Map();
  private scheduleStore: Map<string, CalibrationSchedule> = new Map();
  private gageRRStore: Map<string, GageRRStudy> = new Map();
  private ootStore: Map<string, OutOfToleranceEvent> = new Map();
  private errorSimulation: ErrorSimulationService;

  // Counters for generating IDs
  private gaugeCounter = 1;
  private calibrationCounter = 1;
  private scheduleCounter = 1;
  private studyCounter = 1;
  private ootCounter = 1;

  constructor(config: Partial<IndySoftSurrogateConfig> = {}) {
    super();
    this.config = {
      mockMode: true,
      enableDataExport: true,
      enableAuditLogging: true,
      maxGaugeRecords: 2000,
      maxCalibrationHistory: 10000,
      autoGenerateCalibrationDueNotifications: true,
      defaultTechnician: 'SYSTEM',
      defaultGageRRAcceptanceCriteria: {
        gageRRLimit: 10,
        ndcMinimum: 5
      },
      erpEndpoint: 'http://localhost:3000/api/testing/erp',
      enableErrorSimulation: true,
      ...config
    };

    // Initialize error simulation service
    this.errorSimulation = new ErrorSimulationService({
      enableSimulation: this.config.enableErrorSimulation || false,
      globalProbability: 0.15,
      maxConcurrentScenarios: 3
    });

    // Initialize with sample data
    this.initializeSampleData();

    // Set up automatic calibration due notifications
    if (this.config.autoGenerateCalibrationDueNotifications) {
      this.setupCalibrationNotifications();
    }
  }

  // Gauge Management APIs
  async createGauge(gaugeData: Partial<Gauge>): Promise<IndySoftResponse<Gauge>> {
    try {
      // Check for error simulation
      const simulationResult = this.errorSimulation.simulateRequest('INDYSOFT', 'createGauge', gaugeData);
      if (simulationResult.shouldFail) {
        if (simulationResult.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, simulationResult.delay));
        }
        throw new Error(`Simulated error: ${simulationResult.errorMessage}`);
      }

      const gaugeId = `GAGE-${String(this.gaugeCounter++).padStart(6, '0')}`;
      const assetTag = gaugeData.assetTag || gaugeId;

      // Check for duplicate asset tag
      const existingGauge = Array.from(this.gaugeStore.values())
        .find(gauge => gauge.assetTag === assetTag);

      if (existingGauge) {
        return {
          success: false,
          errors: [`Gauge with asset tag ${assetTag} already exists`],
          timestamp: new Date()
        };
      }

      const nextCalibrationDate = new Date();
      nextCalibrationDate.setDate(nextCalibrationDate.getDate() + (gaugeData.calibrationFrequency || 365));

      const gauge: Gauge = {
        gaugeId,
        assetTag,
        description: gaugeData.description || '',
        gaugeType: gaugeData.gaugeType || GaugeType.CALIPER,
        status: gaugeData.status || GaugeStatus.ACTIVE,
        manufacturer: gaugeData.manufacturer || 'Unknown',
        model: gaugeData.model || 'Standard',
        serialNumber: gaugeData.serialNumber || `SN-${Date.now()}`,
        measurementRange: gaugeData.measurementRange || {
          minimum: 0,
          maximum: 100,
          units: 'mm'
        },
        resolution: gaugeData.resolution || 0.01,
        accuracy: gaugeData.accuracy || 0.02,
        location: gaugeData.location || 'INSPECTION',
        assignedTo: gaugeData.assignedTo,
        department: gaugeData.department || 'QUALITY',
        costCenter: gaugeData.costCenter || 'QC001',
        acquisitionDate: gaugeData.acquisitionDate || new Date(),
        acquisitionCost: gaugeData.acquisitionCost,
        calibrationFrequency: gaugeData.calibrationFrequency || 365,
        lastCalibrationDate: gaugeData.lastCalibrationDate,
        nextCalibrationDate,
        certificateNumber: gaugeData.certificateNumber,
        customAttributes: gaugeData.customAttributes || {},
        createdDate: new Date(),
        lastModified: new Date(),
        createdBy: this.config.defaultTechnician,
        lastModifiedBy: this.config.defaultTechnician
      };

      this.gaugeStore.set(gaugeId, gauge);
      this.emit('gaugeCreated', gauge);

      // Create calibration schedule
      await this.createCalibrationSchedule(gaugeId, gauge.calibrationFrequency);

      // Export to ERP if enabled
      if (this.config.enableDataExport) {
        await this.exportGaugeToERP(gauge);
      }

      return {
        success: true,
        data: gauge,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      };
    }
  }

  async getGauge(gaugeId: string): Promise<IndySoftResponse<Gauge>> {
    const gauge = this.gaugeStore.get(gaugeId);

    if (!gauge) {
      return {
        success: false,
        errors: [`Gauge ${gaugeId} not found`],
        timestamp: new Date()
      };
    }

    return {
      success: true,
      data: gauge,
      timestamp: new Date()
    };
  }

  async queryGauges(filter: GaugeQueryFilter = {}): Promise<IndySoftResponse<Gauge[]>> {
    let gauges = Array.from(this.gaugeStore.values());

    // Apply filters
    if (filter.gaugeType) {
      gauges = gauges.filter(gauge => gauge.gaugeType === filter.gaugeType);
    }
    if (filter.status) {
      gauges = gauges.filter(gauge => gauge.status === filter.status);
    }
    if (filter.location) {
      gauges = gauges.filter(gauge => gauge.location === filter.location);
    }
    if (filter.department) {
      gauges = gauges.filter(gauge => gauge.department === filter.department);
    }
    if (filter.assignedTo) {
      gauges = gauges.filter(gauge => gauge.assignedTo === filter.assignedTo);
    }
    if (filter.manufacturer) {
      gauges = gauges.filter(gauge =>
        gauge.manufacturer.toLowerCase().includes(filter.manufacturer!.toLowerCase())
      );
    }
    if (filter.search) {
      const searchTerm = filter.search.toLowerCase();
      gauges = gauges.filter(gauge =>
        gauge.description.toLowerCase().includes(searchTerm) ||
        gauge.assetTag.toLowerCase().includes(searchTerm) ||
        gauge.serialNumber.toLowerCase().includes(searchTerm)
      );
    }
    if (filter.calibrationDueBefore) {
      gauges = gauges.filter(gauge => gauge.nextCalibrationDate <= filter.calibrationDueBefore!);
    }
    if (filter.calibrationDueAfter) {
      gauges = gauges.filter(gauge => gauge.nextCalibrationDate >= filter.calibrationDueAfter!);
    }

    // Apply pagination
    const totalCount = gauges.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    gauges = gauges.slice(offset, offset + limit);

    return {
      success: true,
      data: gauges,
      metadata: {
        totalCount,
        pageSize: limit,
        currentPage: Math.floor(offset / limit) + 1,
        hasMore: offset + limit < totalCount
      },
      timestamp: new Date()
    };
  }

  // Calibration Management APIs
  async createCalibrationRecord(calibrationData: Partial<CalibrationRecord>): Promise<IndySoftResponse<CalibrationRecord>> {
    try {
      // Check for error simulation
      const simulationResult = this.errorSimulation.simulateRequest('INDYSOFT', 'createCalibrationRecord', calibrationData);
      if (simulationResult.shouldFail) {
        if (simulationResult.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, simulationResult.delay));
        }
        throw new Error(`Simulated error: ${simulationResult.errorMessage}`);
      }

      const calibrationId = `CAL-${String(this.calibrationCounter++).padStart(6, '0')}`;

      // Validate gauge exists
      const gauge = this.gaugeStore.get(calibrationData.gaugeId!);
      if (!gauge) {
        return {
          success: false,
          errors: [`Gauge ${calibrationData.gaugeId} not found`],
          timestamp: new Date()
        };
      }

      const nextCalibrationDate = new Date();
      nextCalibrationDate.setDate(nextCalibrationDate.getDate() + gauge.calibrationFrequency);

      const calibrationRecord: CalibrationRecord = {
        calibrationId,
        gaugeId: calibrationData.gaugeId!,
        calibrationDate: calibrationData.calibrationDate || new Date(),
        status: calibrationData.status || CalibrationStatus.PASS,
        technician: calibrationData.technician || this.config.defaultTechnician,
        calibrationStandard: calibrationData.calibrationStandard || 'NIST',
        environmentalConditions: calibrationData.environmentalConditions || {
          temperature: 20,
          humidity: 50,
          pressure: 101.3
        },
        procedure: calibrationData.procedure || 'Standard calibration procedure',
        certificateNumber: calibrationData.certificateNumber || `CERT-${Date.now()}`,
        asFoundReadings: calibrationData.asFoundReadings || [],
        asLeftReadings: calibrationData.asLeftReadings || [],
        adjustmentsMade: calibrationData.adjustmentsMade || [],
        measurementUncertainty: calibrationData.measurementUncertainty || {
          value: 0.01,
          type: MeasurementUncertaintyType.ABSOLUTE,
          coverageFactor: 2,
          confidenceLevel: 95,
          contributingFactors: []
        },
        passFailCriteria: calibrationData.passFailCriteria || {
          tolerancePercentage: 10,
          acceptanceLimit: 0.02,
          units: 'mm',
          specification: 'ISO 17025'
        },
        overallResult: calibrationData.overallResult || 'PASS',
        comments: calibrationData.comments,
        nextCalibrationDate,
        attachments: calibrationData.attachments || [],
        createdDate: new Date(),
        createdBy: this.config.defaultTechnician
      };

      this.calibrationStore.set(calibrationId, calibrationRecord);

      // Update gauge with calibration information
      gauge.lastCalibrationDate = calibrationRecord.calibrationDate;
      gauge.nextCalibrationDate = nextCalibrationDate;
      gauge.certificateNumber = calibrationRecord.certificateNumber;
      gauge.status = calibrationRecord.overallResult === 'PASS' ? GaugeStatus.ACTIVE : GaugeStatus.OUT_OF_TOLERANCE;
      gauge.lastModified = new Date();

      this.gaugeStore.set(gauge.gaugeId, gauge);
      this.emit('calibrationCompleted', calibrationRecord, gauge);

      // Check for out-of-tolerance condition
      if (calibrationRecord.overallResult === 'FAIL') {
        await this.createOutOfToleranceEvent(gauge.gaugeId, calibrationId, calibrationRecord.asFoundReadings);
      }

      return {
        success: true,
        data: calibrationRecord,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        errors: [(error as Error).message],
        timestamp: new Date()
      };
    }
  }

  // Private helper methods
  private async createCalibrationSchedule(gaugeId: string, frequency: number): Promise<void> {
    const scheduleId = `SCHED-${String(this.scheduleCounter++).padStart(6, '0')}`;
    const nextDueDate = new Date();
    nextDueDate.setDate(nextDueDate.getDate() + frequency);

    const schedule: CalibrationSchedule = {
      scheduleId,
      gaugeId,
      frequency,
      nextDueDate,
      isActive: true,
      priority: 3,
      estimatedDuration: 2,
      requiredStandards: ['NIST'],
      createdDate: new Date(),
      lastModified: new Date()
    };

    this.scheduleStore.set(scheduleId, schedule);
  }

  private async createOutOfToleranceEvent(gaugeId: string, calibrationId: string, readings: CalibrationReading[]): Promise<void> {
    const ootId = `OOT-${String(this.ootCounter++).padStart(6, '0')}`;

    const ootEvent: OutOfToleranceEvent = {
      ootId,
      gaugeId,
      detectionDate: new Date(),
      calibrationId,
      readings,
      impactAnalysis: {
        analysisDate: new Date(),
        analyst: this.config.defaultTechnician,
        affectedParts: [],
        affectedWorkOrders: [],
        riskAssessment: 'MEDIUM',
        remeasurementRequired: true,
        quarantineRequired: false,
        customerNotificationRequired: false
      },
      correctiveActions: [],
      status: 'OPEN',
      createdDate: new Date(),
      createdBy: this.config.defaultTechnician
    };

    this.ootStore.set(ootId, ootEvent);
    this.emit('outOfToleranceDetected', ootEvent);
  }

  private async exportGaugeToERP(gauge: Gauge): Promise<void> {
    if (!this.config.erpEndpoint) return;

    try {
      // Check for error simulation
      const simulationResult = this.errorSimulation.simulateRequest('INDYSOFT', 'exportToERP', gauge);
      if (simulationResult.shouldFail) {
        if (simulationResult.delay > 0) {
          await new Promise(resolve => setTimeout(resolve, simulationResult.delay));
        }
        throw new Error(`Simulated error: ${simulationResult.errorMessage}`);
      }

      // Make actual HTTP call to ERP surrogate
      const exportData = {
        sourceSystem: 'INDYSOFT' as const,
        importType: 'INCREMENTAL' as const,
        data: [{
          gaugeId: gauge.gaugeId,
          assetTag: gauge.assetTag,
          description: gauge.description,
          gaugeType: gauge.gaugeType,
          status: gauge.status,
          location: gauge.location,
          department: gauge.department,
          manufacturer: gauge.manufacturer,
          model: gauge.model,
          serialNumber: gauge.serialNumber,
          calibrationFrequency: gauge.calibrationFrequency,
          nextCalibrationDate: gauge.nextCalibrationDate,
          accuracy: gauge.accuracy,
          acquisitionDate: gauge.acquisitionDate,
          acquisitionCost: gauge.acquisitionCost,
          costCenter: gauge.costCenter,
          id: gauge.gaugeId
        }],
        requestedBy: 'INDYSOFT_SURROGATE'
      };

      const response = await fetch(`${this.config.erpEndpoint}/import/assets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(exportData)
      });

      if (!response.ok) {
        throw new Error(`ERP export failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Emit event for monitoring
      this.emit('erpExport', {
        type: 'GAUGE',
        status: 'SUCCESS',
        gaugeId: gauge.gaugeId,
        result,
        timestamp: new Date()
      });

      console.log(`[IndySoft] Successfully exported gauge ${gauge.assetTag} to ERP`);
    } catch (error) {
      console.error('Failed to export gauge to ERP:', error);

      // Emit error event
      this.emit('erpExportError', {
        type: 'GAUGE',
        gaugeId: gauge.gaugeId,
        error: (error as Error).message,
        timestamp: new Date()
      });
    }
  }

  private initializeSampleData(): void {
    // Generate comprehensive sample gauge data (200+ records)
    const manufacturers = {
      [GaugeType.CALIPER]: ['Mitutoyo', 'Starrett', 'Brown & Sharpe', 'Fowler', 'SPI'],
      [GaugeType.MICROMETER]: ['Mitutoyo', 'Starrett', 'Brown & Sharpe', 'Fowler', 'Tesa'],
      [GaugeType.HEIGHT_GAUGE]: ['Mitutoyo', 'Starrett', 'Brown & Sharpe', 'Tesa', 'Mahr'],
      [GaugeType.INDICATOR]: ['Mitutoyo', 'Starrett', 'Federal', 'Mahr', 'Tesa'],
      [GaugeType.CMM]: ['Zeiss', 'Hexagon', 'Mitutoyo', 'Nikon', 'FARO'],
      [GaugeType.SURFACE_PLATE]: ['Starrett', 'Mitutoyo', 'Brown & Sharpe', 'Precision Granite', 'SPI'],
      [GaugeType.TORQUE_WRENCH]: ['Snap-on', 'Proto', 'CDI', 'Norbar', 'Mountz'],
      [GaugeType.PRESSURE_GAUGE]: ['Ashcroft', 'Wika', 'Omega', 'Dwyer', 'Winters'],
      [GaugeType.THERMOMETER]: ['Fluke', 'Omega', 'Extech', 'Cole-Parmer', 'NIST'],
      [GaugeType.SCALE]: ['Mettler Toledo', 'Ohaus', 'A&D', 'Sartorius', 'Adam Equipment'],
      [GaugeType.THREAD_GAUGE]: ['Starrett', 'Vermont Gage', 'Deltronic', 'PMC', 'Gagemaker'],
      [GaugeType.OPTICAL_COMPARATOR]: ['Starrett', 'Mitutoyo', 'Optical Gaging', 'Nikon', 'Vision Engineering']
    };

    const locations = ['INSPECTION_A', 'INSPECTION_B', 'INSPECTION_C', 'QC_LAB', 'INCOMING_INSPECTION', 'FINAL_INSPECTION', 'CMM_ROOM', 'CALIBRATION_LAB', 'PRODUCTION_FLOOR', 'TOOLROOM'];
    const departments = ['QUALITY', 'INCOMING_INSPECTION', 'FINAL_INSPECTION', 'PROCESS_CONTROL', 'CALIBRATION', 'PRODUCTION', 'ENGINEERING'];
    const costCenters = ['QC001', 'QC002', 'QC003', 'INSP001', 'INSP002', 'CAL001', 'ENG001'];

    let gaugeCount = 0;

    // Generate gauges for each type
    Object.values(GaugeType).forEach(gaugeType => {
      const manufacturerList = manufacturers[gaugeType];
      const gaugesPerType = Math.floor(220 / Object.values(GaugeType).length) + 1;

      for (let i = 1; i <= gaugesPerType && gaugeCount < 220; i++) {
        const manufacturer = manufacturerList[Math.floor(Math.random() * manufacturerList.length)];
        const location = locations[Math.floor(Math.random() * locations.length)];
        const department = departments[Math.floor(Math.random() * departments.length)];
        const costCenter = costCenters[Math.floor(Math.random() * costCenters.length)];
        const acquisitionYear = 2018 + Math.floor(Math.random() * 6); // 2018-2023

        const gauge = {
          description: this.generateGaugeDescription(gaugeType, i),
          gaugeType,
          status: this.generateGaugeStatus(),
          manufacturer,
          model: this.generateGaugeModel(manufacturer, gaugeType),
          serialNumber: `${manufacturer.substring(0, 3).toUpperCase()}-${acquisitionYear}-G${i.toString().padStart(3, '0')}`,
          measurementRange: this.generateMeasurementRange(gaugeType),
          resolution: this.generateResolution(gaugeType),
          accuracy: this.generateAccuracy(gaugeType),
          location,
          assignedTo: Math.random() > 0.7 ? this.generateOperatorName() : undefined,
          department,
          costCenter,
          acquisitionDate: new Date(acquisitionYear, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1),
          acquisitionCost: this.generateGaugeAcquisitionCost(gaugeType),
          calibrationFrequency: this.generateCalibrationFrequency(gaugeType),
          customAttributes: {
            criticality: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'][Math.floor(Math.random() * 4)],
            portableGauge: Math.random() > 0.6,
            requiresSpecialHandling: Math.random() > 0.8,
            environmentalSensitive: Math.random() > 0.7
          }
        };

        this.createGauge(gauge);
        gaugeCount++;
      }
    });

    // Generate some calibration records for a subset of gauges
    const gaugeIds = Array.from(this.gaugeStore.keys());
    const calibrationSampleSize = Math.min(50, gaugeIds.length);

    for (let i = 0; i < calibrationSampleSize; i++) {
      const gaugeId = gaugeIds[i];
      this.generateSampleCalibrationRecord(gaugeId);
    }

    console.log(`[IndySoft] Initialized with ${this.gaugeStore.size} gauge records`);
  }

  private generateGaugeDescription(gaugeType: GaugeType, index: number): string {
    const descriptions = {
      [GaugeType.CALIPER]: ['Digital Caliper', 'Dial Caliper', 'Vernier Caliper'],
      [GaugeType.MICROMETER]: ['Outside Micrometer', 'Inside Micrometer', 'Depth Micrometer'],
      [GaugeType.HEIGHT_GAUGE]: ['Digital Height Gauge', 'Dial Height Gauge', 'Scribing Height Gauge'],
      [GaugeType.INDICATOR]: ['Dial Indicator', 'Digital Indicator', 'Test Indicator'],
      [GaugeType.CMM]: ['Coordinate Measuring Machine', 'Bridge CMM', 'Horizontal Arm CMM'],
      [GaugeType.SURFACE_PLATE]: ['Granite Surface Plate', 'Cast Iron Surface Plate'],
      [GaugeType.TORQUE_WRENCH]: ['Click-Type Torque Wrench', 'Beam Torque Wrench', 'Digital Torque Wrench'],
      [GaugeType.PRESSURE_GAUGE]: ['Pressure Gauge', 'Digital Pressure Gauge', 'Test Pressure Gauge'],
      [GaugeType.THERMOMETER]: ['Digital Thermometer', 'RTD Thermometer', 'Thermocouple'],
      [GaugeType.SCALE]: ['Precision Balance', 'Analytical Balance', 'Industrial Scale'],
      [GaugeType.THREAD_GAUGE]: ['Thread Ring Gauge', 'Thread Plug Gauge', 'Thread Pitch Gauge'],
      [GaugeType.OPTICAL_COMPARATOR]: ['Optical Comparator', 'Profile Projector', 'Shadow Graph']
    };

    const typeDescriptions = descriptions[gaugeType] || ['Measurement Device'];
    const description = typeDescriptions[Math.floor(Math.random() * typeDescriptions.length)];
    const range = this.generateMeasurementRange(gaugeType);

    return `${description} ${range.minimum}-${range.maximum}${range.units} #${index.toString().padStart(3, '0')}`;
  }

  private generateGaugeStatus(): GaugeStatus {
    const statuses = [
      GaugeStatus.ACTIVE,
      GaugeStatus.ACTIVE,
      GaugeStatus.ACTIVE,
      GaugeStatus.ACTIVE, // Weight towards ACTIVE
      GaugeStatus.CALIBRATION_DUE,
      GaugeStatus.OVERDUE,
      GaugeStatus.OUT_OF_TOLERANCE,
      GaugeStatus.OUT_OF_SERVICE
    ];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private generateGaugeModel(manufacturer: string, gaugeType: GaugeType): string {
    const modelPrefixes = {
      'Mitutoyo': ['CD', 'IP', 'MDC', 'ID', 'QM'],
      'Starrett': ['798', '436', '257', '711', '440'],
      'Zeiss': ['PRISMO', 'CONTURA', 'O-INSPECT', 'DuraMax'],
      'Fluke': ['1551A', '1502A', '5615', '1523'],
      'Snap-on': ['TECH', 'QJR', 'TQR', 'CDI']
    };

    const prefixes = modelPrefixes[manufacturer] || ['MOD'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 900) + 100;
    const suffix = ['', 'A', 'B', 'C', 'X'][Math.floor(Math.random() * 5)];

    return `${prefix}-${number}${suffix}`;
  }

  private generateMeasurementRange(gaugeType: GaugeType): { minimum: number; maximum: number; units: string } {
    switch (gaugeType) {
      case GaugeType.CALIPER:
        const caliperRanges = [
          { minimum: 0, maximum: 150, units: 'mm' },
          { minimum: 0, maximum: 200, units: 'mm' },
          { minimum: 0, maximum: 300, units: 'mm' },
          { minimum: 0, maximum: 6, units: 'in' },
          { minimum: 0, maximum: 8, units: 'in' },
          { minimum: 0, maximum: 12, units: 'in' }
        ];
        return caliperRanges[Math.floor(Math.random() * caliperRanges.length)];

      case GaugeType.MICROMETER:
        const micrometerRanges = [
          { minimum: 0, maximum: 25, units: 'mm' },
          { minimum: 25, maximum: 50, units: 'mm' },
          { minimum: 50, maximum: 75, units: 'mm' },
          { minimum: 0, maximum: 1, units: 'in' },
          { minimum: 1, maximum: 2, units: 'in' },
          { minimum: 2, maximum: 3, units: 'in' }
        ];
        return micrometerRanges[Math.floor(Math.random() * micrometerRanges.length)];

      case GaugeType.TORQUE_WRENCH:
        const torqueRanges = [
          { minimum: 10, maximum: 50, units: 'Nm' },
          { minimum: 40, maximum: 200, units: 'Nm' },
          { minimum: 150, maximum: 750, units: 'Nm' },
          { minimum: 10, maximum: 150, units: 'ft-lb' },
          { minimum: 30, maximum: 250, units: 'ft-lb' }
        ];
        return torqueRanges[Math.floor(Math.random() * torqueRanges.length)];

      case GaugeType.PRESSURE_GAUGE:
        const pressureRanges = [
          { minimum: 0, maximum: 100, units: 'psi' },
          { minimum: 0, maximum: 500, units: 'psi' },
          { minimum: 0, maximum: 1000, units: 'psi' },
          { minimum: 0, maximum: 10, units: 'bar' },
          { minimum: 0, maximum: 16, units: 'bar' }
        ];
        return pressureRanges[Math.floor(Math.random() * pressureRanges.length)];

      case GaugeType.THERMOMETER:
        const temperatureRanges = [
          { minimum: -50, maximum: 200, units: '°C' },
          { minimum: -100, maximum: 500, units: '°C' },
          { minimum: 0, maximum: 1000, units: '°C' },
          { minimum: -58, maximum: 392, units: '°F' },
          { minimum: -148, maximum: 932, units: '°F' }
        ];
        return temperatureRanges[Math.floor(Math.random() * temperatureRanges.length)];

      case GaugeType.SCALE:
        const scaleRanges = [
          { minimum: 0, maximum: 500, units: 'g' },
          { minimum: 0, maximum: 2000, units: 'g' },
          { minimum: 0, maximum: 5000, units: 'g' },
          { minimum: 0, maximum: 50, units: 'kg' },
          { minimum: 0, maximum: 200, units: 'kg' }
        ];
        return scaleRanges[Math.floor(Math.random() * scaleRanges.length)];

      default:
        return { minimum: 0, maximum: 100, units: 'mm' };
    }
  }

  private generateResolution(gaugeType: GaugeType): number {
    const resolutions = {
      [GaugeType.CALIPER]: [0.01, 0.02, 0.001],
      [GaugeType.MICROMETER]: [0.001, 0.0001],
      [GaugeType.HEIGHT_GAUGE]: [0.01, 0.001],
      [GaugeType.INDICATOR]: [0.01, 0.001, 0.0001],
      [GaugeType.CMM]: [0.0001, 0.00005, 0.0002],
      [GaugeType.TORQUE_WRENCH]: [0.1, 0.5, 1.0],
      [GaugeType.PRESSURE_GAUGE]: [0.1, 0.25, 0.5],
      [GaugeType.THERMOMETER]: [0.1, 0.01, 0.001],
      [GaugeType.SCALE]: [0.1, 0.01, 0.001, 0.0001]
    };

    const typeResolutions = resolutions[gaugeType] || [0.01];
    return typeResolutions[Math.floor(Math.random() * typeResolutions.length)];
  }

  private generateAccuracy(gaugeType: GaugeType): number {
    const accuracies = {
      [GaugeType.CALIPER]: [0.02, 0.03, 0.015],
      [GaugeType.MICROMETER]: [0.002, 0.001, 0.0005],
      [GaugeType.HEIGHT_GAUGE]: [0.03, 0.02, 0.015],
      [GaugeType.INDICATOR]: [0.01, 0.005, 0.002],
      [GaugeType.CMM]: [0.0015, 0.001, 0.0008],
      [GaugeType.TORQUE_WRENCH]: [2.0, 3.0, 4.0], // percentage
      [GaugeType.PRESSURE_GAUGE]: [0.25, 0.5, 1.0], // percentage
      [GaugeType.THERMOMETER]: [0.1, 0.2, 0.5],
      [GaugeType.SCALE]: [0.1, 0.01, 0.001]
    };

    const typeAccuracies = accuracies[gaugeType] || [0.02];
    return typeAccuracies[Math.floor(Math.random() * typeAccuracies.length)];
  }

  private generateCalibrationFrequency(gaugeType: GaugeType): number {
    const frequencies = {
      [GaugeType.CALIPER]: [365, 180, 90],
      [GaugeType.MICROMETER]: [365, 180],
      [GaugeType.HEIGHT_GAUGE]: [365, 180],
      [GaugeType.INDICATOR]: [365, 180, 90],
      [GaugeType.CMM]: [365, 180],
      [GaugeType.SURFACE_PLATE]: [730, 365], // Less frequent
      [GaugeType.TORQUE_WRENCH]: [365, 180, 90],
      [GaugeType.PRESSURE_GAUGE]: [365, 180],
      [GaugeType.THERMOMETER]: [365, 180],
      [GaugeType.SCALE]: [365, 180, 90],
      [GaugeType.THREAD_GAUGE]: [730, 365], // Less frequent
      [GaugeType.OPTICAL_COMPARATOR]: [365, 180]
    };

    const typeFrequencies = frequencies[gaugeType] || [365];
    return typeFrequencies[Math.floor(Math.random() * typeFrequencies.length)];
  }

  private generateGaugeAcquisitionCost(gaugeType: GaugeType): number {
    const baseCosts = {
      [GaugeType.CALIPER]: 200,
      [GaugeType.MICROMETER]: 300,
      [GaugeType.HEIGHT_GAUGE]: 800,
      [GaugeType.INDICATOR]: 150,
      [GaugeType.CMM]: 250000,
      [GaugeType.SURFACE_PLATE]: 2000,
      [GaugeType.TORQUE_WRENCH]: 500,
      [GaugeType.PRESSURE_GAUGE]: 400,
      [GaugeType.THERMOMETER]: 300,
      [GaugeType.SCALE]: 1500,
      [GaugeType.THREAD_GAUGE]: 100,
      [GaugeType.OPTICAL_COMPARATOR]: 15000
    };

    const baseCost = baseCosts[gaugeType] || 500;
    const variation = 0.6; // ±60% variation
    return Math.floor(baseCost * (1 + (Math.random() - 0.5) * variation));
  }

  private generateOperatorName(): string {
    const firstNames = ['John', 'Jane', 'Mike', 'Sarah', 'David', 'Lisa', 'Robert', 'Maria', 'James', 'Jennifer'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'];

    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

    return `${firstName} ${lastName}`;
  }

  private generateSampleCalibrationRecord(gaugeId: string): void {
    const gauge = this.gaugeStore.get(gaugeId);
    if (!gauge) return;

    const calibrationDate = new Date(Date.now() - Math.floor(Math.random() * 90) * 24 * 60 * 60 * 1000); // Within last 90 days

    const asFoundReadings: CalibrationReading[] = this.generateCalibrationReadings(gauge);
    const asLeftReadings: CalibrationReading[] = this.generateCalibrationReadings(gauge, true);

    const overallResult = asLeftReadings.every(reading => reading.withinTolerance) ? 'PASS' :
                         asLeftReadings.some(reading => reading.withinTolerance) ? 'LIMITED_USE' : 'FAIL';

    const calibrationData = {
      gaugeId,
      calibrationDate,
      status: CalibrationStatus.PASS,
      technician: this.generateOperatorName(),
      calibrationStandard: 'NIST Traceable Standard',
      environmentalConditions: {
        temperature: 20 + (Math.random() - 0.5) * 2, // 19-21°C
        humidity: 50 + (Math.random() - 0.5) * 10, // 45-55%
        pressure: 101.3 + (Math.random() - 0.5) * 1, // 100.8-101.8 kPa
      },
      procedure: `Standard calibration procedure for ${gauge.gaugeType}`,
      asFoundReadings,
      asLeftReadings,
      adjustmentsMade: overallResult === 'PASS' ? [] : ['Zeroing adjustment', 'Span adjustment'],
      measurementUncertainty: {
        value: gauge.accuracy / 3, // Typical 3:1 ratio
        type: MeasurementUncertaintyType.ABSOLUTE,
        coverageFactor: 2,
        confidenceLevel: 95,
        contributingFactors: [
          {
            source: 'Standard uncertainty',
            value: gauge.accuracy / 4,
            distribution: 'NORMAL' as const,
            sensitivity: 1
          },
          {
            source: 'Environmental conditions',
            value: gauge.accuracy / 10,
            distribution: 'RECTANGULAR' as const,
            sensitivity: 0.5
          }
        ]
      },
      passFailCriteria: {
        tolerancePercentage: 10,
        acceptanceLimit: gauge.accuracy,
        units: gauge.measurementRange.units,
        specification: 'ISO/IEC 17025'
      },
      overallResult,
      comments: overallResult === 'PASS' ? 'Calibration completed successfully' : 'Minor adjustments required'
    };

    this.createCalibrationRecord(calibrationData);
  }

  private generateCalibrationReadings(gauge: Gauge, adjusted: boolean = false): CalibrationReading[] {
    const readings: CalibrationReading[] = [];
    const range = gauge.measurementRange.maximum - gauge.measurementRange.minimum;
    const testPoints = 5; // Typically test at 5 points across range

    for (let i = 0; i < testPoints; i++) {
      const nominalValue = gauge.measurementRange.minimum + (range * i / (testPoints - 1));

      // Simulate measurement error
      let error = adjusted ?
        (Math.random() - 0.5) * gauge.accuracy * 0.5 : // Better after adjustment
        (Math.random() - 0.5) * gauge.accuracy * 1.5; // Potentially out of tolerance before

      const actualValue = nominalValue + error;
      const tolerance = gauge.accuracy;
      const withinTolerance = Math.abs(error) <= tolerance;

      readings.push({
        nominalValue,
        actualValue,
        error,
        tolerance,
        withinTolerance,
        units: gauge.measurementRange.units
      });
    }

    return readings;
  }

  private setupCalibrationNotifications(): void {
    // Set up periodic calibration due checking
    setInterval(() => {
      this.checkCalibrationDueNotifications();
    }, 60000); // Check every minute for demo purposes
  }

  private checkCalibrationDueNotifications(): void {
    const now = new Date();
    const sevenDaysFromNow = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));

    Array.from(this.gaugeStore.values()).forEach(gauge => {
      if (gauge.nextCalibrationDate <= sevenDaysFromNow) {
        if (gauge.nextCalibrationDate <= now) {
          // Overdue
          gauge.status = GaugeStatus.OVERDUE;
          this.emit('calibrationOverdue', gauge);
        } else {
          // Due within 7 days
          gauge.status = GaugeStatus.CALIBRATION_DUE;
          this.emit('calibrationDue', gauge);
        }
        this.gaugeStore.set(gauge.gaugeId, gauge);
      }
    });
  }

  // Health check method
  async getHealthStatus(): Promise<IndySoftResponse<any>> {
    return {
      success: true,
      data: {
        service: 'IndySoft Calibration Management Surrogate',
        version: '1.0.0',
        status: 'healthy',
        timestamp: new Date(),
        mockMode: this.config.mockMode,
        gaugeCount: this.gaugeStore.size,
        calibrationRecordCount: this.calibrationStore.size,
        calibrationScheduleCount: this.scheduleStore.size,
        gageRRStudyCount: this.gageRRStore.size,
        outOfToleranceEventCount: this.ootStore.size,
        gagesDue: Array.from(this.gaugeStore.values()).filter(g => g.status === GaugeStatus.CALIBRATION_DUE).length,
        gaugesOverdue: Array.from(this.gaugeStore.values()).filter(g => g.status === GaugeStatus.OVERDUE).length
      },
      timestamp: new Date()
    };
  }

  // Reset mock data for testing
  async resetMockData(): Promise<IndySoftResponse<void>> {
    this.gaugeStore.clear();
    this.calibrationStore.clear();
    this.scheduleStore.clear();
    this.gageRRStore.clear();
    this.ootStore.clear();

    this.gaugeCounter = 1;
    this.calibrationCounter = 1;
    this.scheduleCounter = 1;
    this.studyCounter = 1;
    this.ootCounter = 1;

    // Reinitialize sample data
    this.initializeSampleData();

    return {
      success: true,
      timestamp: new Date()
    };
  }
}