/**
 * Torque Management System - Type Definitions
 * Digital torque management for engine assembly operations
 * Supports NIST standards and AS9100 compliance
 */

import { Prisma, TorqueMethod, TorquePattern } from '@prisma/client';

// ==============================================================================
// BASE TYPES FROM PRISMA
// ==============================================================================

export type TorqueSpecification = Prisma.TorqueSpecificationGetPayload<{
  include: {
    part: true;
    operation: true;
    routingOperation: true;
    creator: true;
    approver: true;
    sequences: true;
    events: true;
  };
}>;

export type TorqueSequence = Prisma.TorqueSequenceGetPayload<{
  include: {
    torqueSpec: true;
    events: true;
  };
}>;

export type TorqueEvent = Prisma.TorqueEventGetPayload<{
  include: {
    workOrder: true;
    torqueSpec: true;
    sequence: true;
    operator: true;
    supervisorReviewer: true;
    reworkUser: true;
  };
}>;

// Re-export enums
export { TorqueMethod, TorquePattern };

// ==============================================================================
// ENHANCED INTERFACES FOR UI AND BUSINESS LOGIC
// ==============================================================================

/**
 * Enhanced Torque Specification with computed fields
 */
export interface TorqueSpecificationWithMetadata extends Omit<TorqueSpecification, 'events'> {
  // Computed fields
  toleranceRange: {
    min: number;
    max: number;
    range: number;
  };
  isCurrentlyActive: boolean;
  totalEvents: number;
  averageActualTorque?: number;
  successRate?: number; // Percentage of in-spec torque events

  // Event summaries
  recentEvents?: TorqueEventSummary[];
  outOfSpecEvents?: TorqueEventSummary[];
}

/**
 * Bolt position definition for sequences
 */
export interface BoltPosition {
  position: number;           // 1-48 for turbine disk example
  coordinates?: {             // Physical coordinates for visual display
    x: number;
    y: number;
    rotation?: number;
  };
  label?: string;             // Optional label like "A1", "B3", etc.
  fastenerType?: string;      // M12x1.5, etc.
  notes?: string;             // Special instructions for this bolt
}

/**
 * Enhanced Torque Sequence with visual data
 */
export interface TorqueSequenceWithVisual extends TorqueSequence {
  boltPositions: BoltPosition[];
  sequenceOrder: number[];
  visualPattern?: {
    svg?: string;             // SVG representation of the pattern
    coordinates: Array<{
      position: number;
      x: number;
      y: number;
    }>;
  };
}

/**
 * Summary view of torque events for reporting
 */
export interface TorqueEventSummary {
  id: string;
  workOrderNumber: string;
  serialNumber?: string;
  boltPosition: number;
  passNumber: number;
  actualTorque: number;
  targetTorque: number;
  isInSpec: boolean;
  deviationPercent?: number;
  timestamp: Date;
  operatorName: string;
  requiresRework: boolean;
}

/**
 * Digital Wrench Integration Data
 */
export interface DigitalWrenchReading {
  wrenchId: string;
  serialNumber: string;
  calibrationDate: Date;
  torqueValue: number;
  torqueUnit: string;
  angle?: number;             // For torque-angle methods
  timestamp: Date;
  isCalibrated: boolean;
  batteryLevel?: number;
  connectionType: 'Bluetooth' | 'WiFi' | 'USB' | 'Serial';
}

/**
 * Supported Digital Wrench Brands
 */
export enum DigitalWrenchBrand {
  SNAP_ON = 'SNAP_ON',
  NORBAR = 'NORBAR',
  CDI = 'CDI',
  GEDORE = 'GEDORE',
  BETA = 'BETA',
  CRAFTSMAN = 'CRAFTSMAN'
}

/**
 * Digital Wrench Configuration
 */
export interface DigitalWrenchConfig {
  id: string;
  brand: DigitalWrenchBrand;
  model: string;
  serialNumber: string;
  torqueRange: {
    min: number;
    max: number;
    unit: string;
  };
  accuracy: number;           // Percentage accuracy (e.g., ±2%)
  lastCalibrationDate: Date;
  calibrationDueDate: Date;
  connectionSettings: {
    type: 'Bluetooth' | 'WiFi' | 'USB' | 'Serial';
    address?: string;         // Bluetooth MAC or IP address
    port?: number;
    baudRate?: number;        // For serial connections
  };
  isActive: boolean;
}

// ==============================================================================
// REQUEST/RESPONSE INTERFACES FOR APIs
// ==============================================================================

/**
 * Create Torque Specification Request
 */
export interface CreateTorqueSpecRequest {
  torqueSpecCode: string;
  name: string;
  description?: string;
  targetTorque: number;
  tolerancePlus: number;
  toleranceMinus: number;
  torqueUnit?: string;
  fastenerType: string;
  fastenerGrade?: string;
  fastenerCount: number;
  tighteningMethod?: TorqueMethod;
  numberOfPasses?: number;
  passPercentages?: number[];
  sequencePattern?: TorquePattern;
  customSequence?: number[];
  partId?: string;
  operationId?: string;
  routingOperationId?: string;
  workCenter?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
}

/**
 * Update Torque Specification Request
 */
export interface UpdateTorqueSpecRequest extends Partial<CreateTorqueSpecRequest> {
  id: string;
  revision?: string;
  engineerApprovedBy?: string;
  engineerApprovedAt?: Date;
}

/**
 * Create Torque Sequence Request
 */
export interface CreateTorqueSequenceRequest {
  torqueSpecId: string;
  sequenceName: string;
  boltPositions: BoltPosition[];
  sequenceOrder: number[];
  passNumber: number;
  passPercentage: number;
  visualPattern?: any;
  instructions?: string;
}

/**
 * Record Torque Event Request
 */
export interface RecordTorqueEventRequest {
  workOrderId: string;
  torqueSpecId: string;
  sequenceId?: string;
  serialNumber?: string;
  actualTorque: number;
  boltPosition: number;
  passNumber: number;
  digitalWrenchData?: DigitalWrenchReading;
  duration?: number;
}

/**
 * Torque Event Validation Result
 */
export interface TorqueValidationResult {
  isInSpec: boolean;
  deviationPercent: number;
  targetTorque: number;
  toleranceRange: {
    min: number;
    max: number;
  };
  message: string;
  requiresRework: boolean;
  requiresSupervisorReview: boolean;
}

// ==============================================================================
// REPORTING AND ANALYTICS INTERFACES
// ==============================================================================

/**
 * Torque Report Request
 */
export interface TorqueReportRequest {
  workOrderId?: string;
  serialNumber?: string;
  partNumber?: string;
  torqueSpecId?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
  includeMetadata?: boolean;
  format: 'PDF' | 'CSV' | 'JSON';
}

/**
 * Torque Report Data
 */
export interface TorqueReportData {
  reportId: string;
  generatedAt: Date;
  generatedBy: string;

  // Header Information
  workOrder?: {
    workOrderNumber: string;
    partNumber: string;
    serialNumber?: string;
    quantity: number;
  };

  torqueSpec: {
    torqueSpecCode: string;
    name: string;
    targetTorque: number;
    toleranceRange: string;
    fastenerType: string;
    fastenerCount: number;
  };

  // Torque Events Summary
  summary: {
    totalBolts: number;
    totalPasses: number;
    eventsRecorded: number;
    inSpecCount: number;
    outOfSpecCount: number;
    successRate: number;
    averageTorque: number;
    reworkRequired: number;
  };

  // Detailed Events
  events: TorqueEventSummary[];

  // Out of Spec Analysis
  outOfSpecAnalysis?: {
    underTorqued: number;
    overTorqued: number;
    reworkCompleted: number;
    pendingRework: number;
  };

  // Electronic Signatures
  signatures: Array<{
    role: string;
    name: string;
    timestamp: Date;
    signatureType: string;
  }>;
}

/**
 * Torque Analytics Dashboard Data
 */
export interface TorqueAnalyticsDashboard {
  dateRange: {
    start: Date;
    end: Date;
  };

  overview: {
    totalTorqueEvents: number;
    successRate: number;
    averageSuccessRate: number;
    reworkRate: number;
    mostUsedSpecs: Array<{
      torqueSpecCode: string;
      name: string;
      usageCount: number;
    }>;
  };

  trends: {
    dailySuccessRates: Array<{
      date: Date;
      successRate: number;
      eventCount: number;
    }>;
    operatorPerformance: Array<{
      operatorName: string;
      eventCount: number;
      successRate: number;
      averageTime: number;
    }>;
  };

  qualityMetrics: {
    outOfSpecTrends: Array<{
      date: Date;
      underTorqued: number;
      overTorqued: number;
      total: number;
    }>;
    reworkAnalysis: {
      totalReworkEvents: number;
      averageReworkTime: number;
      topReworkReasons: Array<{
        reason: string;
        count: number;
      }>;
    };
  };
}

// ==============================================================================
// CONFIGURATION AND SYSTEM INTERFACES
// ==============================================================================

/**
 * Torque Management System Configuration
 */
export interface TorqueSystemConfig {
  // Digital Wrench Settings
  enableAutoCapture: boolean;
  wrenchTimeout: number;           // Seconds to wait for wrench reading
  requireWrenchCalibration: boolean;
  autoRetryFailedConnections: boolean;

  // Validation Settings
  strictToleranceMode: boolean;    // Require all bolts to be in spec
  allowSupervisorOverride: boolean;
  requireJustificationForOverride: boolean;
  autoFlagRework: boolean;

  // Visual Guidance Settings
  enableVisualGuidance: boolean;
  highlightNextBolt: boolean;
  showProgressIndicator: boolean;
  enableAudioCues: boolean;

  // Reporting Settings
  autoGenerateReports: boolean;
  requireElectronicSignature: boolean;
  emailReportsTo: string[];

  // Integration Settings
  enableMESIntegration: boolean;
  enableERPIntegration: boolean;
  enableQualitySystemIntegration: boolean;
}

/**
 * Visual Sequence Guidance State
 */
export interface SequenceGuidanceState {
  currentStep: {
    boltPosition: number;
    passNumber: number;
    targetTorque: number;
    instructions?: string;
  };

  progress: {
    totalSteps: number;
    completedSteps: number;
    currentPass: number;
    totalPasses: number;
    overallPercent: number;
  };

  visualData: {
    boltPositions: BoltPosition[];
    completedPositions: number[];
    currentPosition: number;
    nextPositions: number[];
  };

  status: 'ready' | 'in_progress' | 'waiting_for_input' | 'out_of_spec' | 'completed' | 'error';
  lastEvent?: TorqueEventSummary;
  messages: string[];
}

// ==============================================================================
// ERROR AND VALIDATION TYPES
// ==============================================================================

/**
 * Torque System Error Types
 */
export enum TorqueErrorType {
  WRENCH_CONNECTION_FAILED = 'WRENCH_CONNECTION_FAILED',
  WRENCH_NOT_CALIBRATED = 'WRENCH_NOT_CALIBRATED',
  READING_OUT_OF_RANGE = 'READING_OUT_OF_RANGE',
  SEQUENCE_VALIDATION_FAILED = 'SEQUENCE_VALIDATION_FAILED',
  SUPERVISOR_APPROVAL_REQUIRED = 'SUPERVISOR_APPROVAL_REQUIRED',
  REWORK_REQUIRED = 'REWORK_REQUIRED',
  TIMEOUT_EXCEEDED = 'TIMEOUT_EXCEEDED',
  INVALID_TORQUE_SPEC = 'INVALID_TORQUE_SPEC',
  WORK_ORDER_NOT_FOUND = 'WORK_ORDER_NOT_FOUND'
}

/**
 * Torque System Error
 */
export interface TorqueError {
  type: TorqueErrorType;
  message: string;
  details?: any;
  timestamp: Date;
  recoverable: boolean;
  suggestedActions?: string[];
}

/**
 * Real-time Torque Event
 */
export interface RealtimeTorqueEvent {
  type: 'torque_reading' | 'sequence_advance' | 'validation_result' | 'error' | 'completion';
  data: any;
  timestamp: Date;
  workOrderId: string;
  operatorId: string;
}