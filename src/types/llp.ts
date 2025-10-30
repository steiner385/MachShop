/**
 * Life-Limited Parts (LLP) Type Definitions
 *
 * Comprehensive type system for LLP back-to-birth traceability,
 * life tracking, alert management, and certification documentation.
 *
 * Supports IATA, FAA, EASA regulatory compliance requirements
 * for safety-critical aerospace components.
 */

import {
  Part,
  SerializedPart,
  LLPLifeHistory,
  LLPAlert,
  LLPCertification,
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPStatus,
  LLPAlertSeverity,
  LLPCertificationType
} from '@prisma/client';

// ============================================================================
// ENHANCED LLP TYPES WITH RELATIONSHIPS
// ============================================================================

/**
 * Part with LLP configuration and computed life status
 */
export interface LLPPart extends Part {
  // Computed LLP status
  currentLifeStatus?: LLPLifeStatus;
  activeAlerts?: LLPAlert[];
  certificationStatus?: LLPCertificationStatus;
}

/**
 * SerializedPart with complete LLP tracking data
 */
export interface LLPSerializedPart extends SerializedPart {
  part: LLPPart;
  llpLifeHistory: LLPLifeHistory[];
  llpAlerts: LLPAlert[];
  llpCertifications: LLPCertification[];
  // Computed fields
  currentLifeStatus: LLPLifeStatus;
  backToBirthTrace: LLPBackToBirthTrace;
}

/**
 * Enhanced LLP life history with relationships
 */
export interface LLPLifeHistoryWithRelations extends LLPLifeHistory {
  serializedPart: LLPSerializedPart;
}

/**
 * Enhanced LLP alert with relationships
 */
export interface LLPAlertWithRelations extends LLPAlert {
  serializedPart: LLPSerializedPart;
}

/**
 * Enhanced LLP certification with relationships
 */
export interface LLPCertificationWithRelations extends LLPCertification {
  serializedPart: LLPSerializedPart;
}

// ============================================================================
// LLP BUSINESS LOGIC TYPES
// ============================================================================

/**
 * Current life status of an LLP
 */
export interface LLPLifeStatus {
  // Cycle tracking
  totalCycles: number;
  cycleLimit: number | null;
  cyclePercentageUsed: number;
  remainingCycles: number | null;

  // Time tracking
  totalYears: number;
  timeLimit: number | null;
  timePercentageUsed: number;
  remainingYears: number | null;

  // Overall status
  overallPercentageUsed: number;
  retirementDue: Date | null;
  status: LLPLifeStatusType;
  alertLevel: LLPAlertSeverity;

  // Inspection tracking
  lastInspectionCycles: number | null;
  lastInspectionDate: Date | null;
  nextInspectionDue: number | null;
  nextInspectionDate: Date | null;

  // Compliance
  isRetired: boolean;
  isExpired: boolean;
  canBeInstalled: boolean;
  retirementReason?: string;
}

/**
 * LLP life status types
 */
export enum LLPLifeStatusType {
  NEW = 'NEW',                    // 0-20% life used
  ACTIVE = 'ACTIVE',              // 20-80% life used
  AGING = 'AGING',                // 80-90% life used
  CRITICAL = 'CRITICAL',          // 90-95% life used
  NEAR_RETIREMENT = 'NEAR_RETIREMENT', // 95-100% life used
  RETIRED = 'RETIRED',            // Past retirement limit
  EXPIRED = 'EXPIRED'             // Past expiration date
}

/**
 * Complete back-to-birth traceability record
 */
export interface LLPBackToBirthTrace {
  serializedPartId: string;
  partNumber: string;
  serialNumber: string;

  // Manufacturing origin
  manufacturingDate: Date | null;
  manufacturingLocation: string | null;
  heatLot: string | null;
  materialCertifications: LLPCertification[];

  // Complete installation history
  installationHistory: LLPInstallationRecord[];

  // Maintenance and repair history
  maintenanceHistory: LLPMaintenanceRecord[];

  // All certifications and documents
  allCertifications: LLPCertification[];

  // Current status
  currentLifeStatus: LLPLifeStatus;

  // Compliance status
  complianceStatus: LLPComplianceStatus;
}

/**
 * Installation record for back-to-birth tracking
 */
export interface LLPInstallationRecord {
  eventDate: Date;
  eventType: 'INSTALL' | 'REMOVE';
  cyclesAtEvent: number | null;
  hoursAtEvent: number | null;
  parentAssemblyId: string | null;
  parentSerialNumber: string | null;
  location: string | null;
  performedBy: string | null;
  workOrderId: string | null;
  notes: string | null;
}

/**
 * Maintenance record for back-to-birth tracking
 */
export interface LLPMaintenanceRecord {
  eventDate: Date;
  eventType: 'REPAIR' | 'INSPECT' | 'OVERHAUL' | 'REWORK';
  cyclesAtEvent: number | null;
  hoursAtEvent: number | null;
  maintenanceDetails: any; // JSON data
  inspectionResults: any;  // JSON data
  location: string | null;
  performedBy: string | null;
  workOrderId: string | null;
  certificationUrls: string[];
  notes: string | null;
}

/**
 * LLP certification status summary
 */
export interface LLPCertificationStatus {
  hasForm1: boolean;
  hasMaterialCert: boolean;
  hasTestReports: boolean;
  hasTraceabilityCert: boolean;
  missingCertifications: LLPCertificationType[];
  expiringCertifications: LLPCertification[];
  isCompliant: boolean;
  complianceNotes: string[];
}

/**
 * LLP compliance status for regulatory requirements
 */
export interface LLPComplianceStatus {
  // IATA compliance
  iataCompliant: boolean;
  hasBackToBirthTrace: boolean;

  // FAA compliance
  faaCompliant: boolean;
  hasPart43Records: boolean;

  // EASA compliance
  easaCompliant: boolean;
  hasMarkingRequirements: boolean;

  // Overall compliance
  overallCompliant: boolean;
  complianceIssues: string[];
  complianceNotes: string[];
}

// ============================================================================
// LLP API REQUEST/RESPONSE TYPES
// ============================================================================

/**
 * Request to create or update LLP configuration
 */
export interface LLPConfigurationRequest {
  partId: string;
  isLifeLimited: boolean;
  criticalityLevel: LLPCriticalityLevel;
  retirementType: LLPRetirementType;
  cycleLimit?: number;
  timeLimit?: number;
  inspectionInterval?: number;
  regulatoryReference?: string;
  certificationRequired: boolean;
  notes?: string;
}

/**
 * Request to record LLP life event
 */
export interface LLPLifeEventRequest {
  serializedPartId: string;
  eventType: string;
  eventDate: Date;
  cyclesAtEvent?: number;
  hoursAtEvent?: number;
  parentAssemblyId?: string;
  parentSerialNumber?: string;
  workOrderId?: string;
  operationId?: string;
  performedBy?: string;
  location?: string;
  notes?: string;
  certificationUrls?: string[];
  inspectionResults?: any;
  repairDetails?: any;
  metadata?: any;
}

/**
 * Request to create LLP alert
 */
export interface LLPAlertRequest {
  serializedPartId: string;
  alertType: string;
  severity: LLPAlertSeverity;
  triggerCycles?: number;
  triggerDate?: Date;
  thresholdPercentage?: number;
  message: string;
  actionRequired?: string;
  dueDate?: Date;
}

/**
 * Request to add LLP certification
 */
export interface LLPCertificationRequest {
  serializedPartId: string;
  certificationType: LLPCertificationType;
  documentName: string;
  documentUrl: string;
  documentHash?: string;
  issuedBy?: string;
  issuedDate?: Date;
  expirationDate?: Date;
  certificationNumber?: string;
  batchNumber?: string;
  testResults?: any;
  complianceStandards?: string[];
  verifiedBy?: string;
  verifiedAt?: Date;
  notes?: string;
}

/**
 * Response for LLP life status query
 */
export interface LLPLifeStatusResponse {
  serializedPartId: string;
  partNumber: string;
  serialNumber: string;
  lifeStatus: LLPLifeStatus;
  activeAlerts: LLPAlert[];
  nextActions: LLPNextAction[];
}

/**
 * Next action recommendations for LLP
 */
export interface LLPNextAction {
  actionType: 'INSPECT' | 'RETIRE' | 'PLAN_REPLACEMENT' | 'UPDATE_RECORDS';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dueDate: Date | null;
  dueCycles: number | null;
  description: string;
  actionRequired: boolean;
}

/**
 * LLP retirement request
 */
export interface LLPRetirementRequest {
  serializedPartId: string;
  retirementDate: Date;
  retirementCycles: number;
  retirementReason: string;
  disposition: 'SCRAP' | 'MUSEUM' | 'TRAINING' | 'RETURN_TO_OEM';
  performedBy: string;
  location: string;
  notes?: string;
}

// ============================================================================
// LLP REPORTING TYPES
// ============================================================================

/**
 * LLP fleet status report
 */
export interface LLPFleetReport {
  reportDate: Date;
  totalLLPs: number;
  llpsByStatus: Record<LLPLifeStatusType, number>;
  llpsByAlert: Record<LLPAlertSeverity, number>;
  retirementsThisMonth: number;
  retirementsNext30Days: number;
  retirementsNext90Days: number;
  inspectionsDue: number;
  complianceIssues: number;
  partsByCategory: LLPPartCategoryReport[];
}

/**
 * LLP part category report
 */
export interface LLPPartCategoryReport {
  partNumber: string;
  partName: string;
  totalCount: number;
  activeCount: number;
  retiredCount: number;
  averageLifeUsed: number;
  criticalityLevel: LLPCriticalityLevel;
  nextRetirement: Date | null;
}

/**
 * LLP detailed part report
 */
export interface LLPPartReport {
  serializedPartId: string;
  partNumber: string;
  serialNumber: string;
  lifeStatus: LLPLifeStatus;
  backToBirthTrace: LLPBackToBirthTrace;
  certificationStatus: LLPCertificationStatus;
  complianceStatus: LLPComplianceStatus;
  recommendedActions: LLPNextAction[];
  reportGeneratedDate: Date;
  reportGeneratedBy: string;
}

/**
 * LLP audit trail report
 */
export interface LLPAuditReport {
  serializedPartId: string;
  auditPeriod: {
    startDate: Date;
    endDate: Date;
  };
  allEvents: LLPLifeHistory[];
  allAlerts: LLPAlert[];
  allCertifications: LLPCertification[];
  auditFindings: LLPAuditFinding[];
  complianceStatus: LLPComplianceStatus;
}

/**
 * LLP audit finding
 */
export interface LLPAuditFinding {
  findingType: 'MISSING_RECORD' | 'INVALID_DATA' | 'COMPLIANCE_ISSUE' | 'RECOMMENDATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  recommendation: string;
  dueDate?: Date;
}

// ============================================================================
// LLP ANALYTICS TYPES
// ============================================================================

/**
 * LLP analytics dashboard data
 */
export interface LLPAnalyticsDashboard {
  // Fleet overview
  fleetSummary: LLPFleetSummary;

  // Retirement forecasting
  retirementForecast: LLPRetirementForecast;

  // Performance metrics
  performanceMetrics: LLPPerformanceMetrics;

  // Cost analysis
  costAnalysis: LLPCostAnalysis;

  // Trend analysis
  trendAnalysis: LLPTrendAnalysis;
}

/**
 * LLP fleet summary for analytics
 */
export interface LLPFleetSummary {
  totalLLPs: number;
  activeLLPs: number;
  retiredLLPs: number;
  averageLifeUsed: number;
  totalValue: number;
  criticalAlerts: number;
  complianceRate: number;
}

/**
 * LLP retirement forecasting
 */
export interface LLPRetirementForecast {
  next30Days: LLPRetirementPrediction[];
  next90Days: LLPRetirementPrediction[];
  next365Days: LLPRetirementPrediction[];
  forecastAccuracy: number;
}

/**
 * LLP retirement prediction
 */
export interface LLPRetirementPrediction {
  serializedPartId: string;
  partNumber: string;
  serialNumber: string;
  predictedRetirementDate: Date;
  confidenceLevel: number;
  currentLifeUsed: number;
  retirementReason: 'CYCLES' | 'TIME' | 'BOTH';
}

/**
 * LLP performance metrics
 */
export interface LLPPerformanceMetrics {
  averagePartLife: number;
  partsExceedingExpectation: number;
  partsUnderperforming: number;
  maintenanceFrequency: number;
  inspectionCompliance: number;
  documentationCompleteness: number;
}

/**
 * LLP cost analysis
 */
export interface LLPCostAnalysis {
  totalFleetValue: number;
  averagePartCost: number;
  maintenanceCostPerCycle: number;
  retirementCostThisYear: number;
  projectedCostNextYear: number;
  costPerFlightHour: number;
}

/**
 * LLP trend analysis
 */
export interface LLPTrendAnalysis {
  lifeUtilizationTrend: TrendDataPoint[];
  retirementRateTrend: TrendDataPoint[];
  complianceRateTrend: TrendDataPoint[];
  costTrend: TrendDataPoint[];
}

/**
 * Trend data point
 */
export interface TrendDataPoint {
  date: Date;
  value: number;
  trend: 'INCREASING' | 'DECREASING' | 'STABLE';
}

// ============================================================================
// LLP WORKFLOW TYPES
// ============================================================================

/**
 * LLP workflow states
 */
export enum LLPWorkflowState {
  RECEIVED = 'RECEIVED',
  INSPECTED = 'INSPECTED',
  CERTIFIED = 'CERTIFIED',
  INSTALLED = 'INSTALLED',
  IN_SERVICE = 'IN_SERVICE',
  REMOVED = 'REMOVED',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  RETIRED = 'RETIRED'
}

/**
 * LLP workflow transition
 */
export interface LLPWorkflowTransition {
  from: LLPWorkflowState;
  to: LLPWorkflowState;
  requiredData: string[];
  requiredCertifications: LLPCertificationType[];
  approvalRequired: boolean;
  autoTransition: boolean;
}

/**
 * LLP alert configuration
 */
export interface LLPAlertConfig {
  enabled: boolean;
  thresholds: {
    info: number;      // e.g., 80% life used
    warning: number;   // e.g., 90% life used
    critical: number;  // e.g., 95% life used
    urgent: number;    // e.g., 98% life used
  };
  notifications: {
    email: boolean;
    sms: boolean;
    dashboard: boolean;
  };
  recipients: string[];
  escalationRules: LLPEscalationRule[];
}

/**
 * LLP escalation rule
 */
export interface LLPEscalationRule {
  condition: string;
  delayMinutes: number;
  escalateTo: string[];
  requiresAcknowledgment: boolean;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

/**
 * LLP error types
 */
export enum LLPErrorType {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  BUSINESS_RULE_VIOLATION = 'BUSINESS_RULE_VIOLATION',
  COMPLIANCE_VIOLATION = 'COMPLIANCE_VIOLATION',
  DATA_INTEGRITY_ERROR = 'DATA_INTEGRITY_ERROR',
  WORKFLOW_ERROR = 'WORKFLOW_ERROR',
  CERTIFICATION_ERROR = 'CERTIFICATION_ERROR'
}

/**
 * LLP error details
 */
export interface LLPError {
  type: LLPErrorType;
  code: string;
  message: string;
  details?: any;
  serializedPartId?: string;
  context?: Record<string, any>;
}

/**
 * LLP validation result
 */
export interface LLPValidationResult {
  isValid: boolean;
  errors: LLPError[];
  warnings: LLPError[];
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Create LLP type for new records
 */
export type CreateLLPLifeHistory = Omit<LLPLifeHistory, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateLLPAlert = Omit<LLPAlert, 'id' | 'createdAt' | 'updatedAt'>;
export type CreateLLPCertification = Omit<LLPCertification, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Update LLP type for existing records
 */
export type UpdateLLPLifeHistory = Partial<CreateLLPLifeHistory>;
export type UpdateLLPAlert = Partial<CreateLLPAlert>;
export type UpdateLLPCertification = Partial<CreateLLPCertification>;

/**
 * LLP query filters
 */
export interface LLPQueryFilters {
  partNumbers?: string[];
  serialNumbers?: string[];
  criticalityLevels?: LLPCriticalityLevel[];
  statuses?: LLPLifeStatusType[];
  alertSeverities?: LLPAlertSeverity[];
  lifePercentageMin?: number;
  lifePerce
age
?: number;
  lastInspectionAfter?: Date;
  lastInspectionBefore?: Date;
  retirementDueAfter?: Date;
  retirementDueBefore?: Date;
  hasActiveAlerts?: boolean;
  missingCertifications?: boolean;
  complianceIssues?: boolean;
}

/**
 * LLP sort options
 */
export interface LLPSortOptions {
  field: 'partNumber' | 'serialNumber' | 'lifePercentage' | 'retirementDate' | 'lastInspection';
  direction: 'asc' | 'desc';
}

/**
 * LLP pagination
 */
export interface LLPPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/**
 * LLP query result
 */
export interface LLPQueryResult<T> {
  data: T[];
  pagination: LLPPagination;
  filters: LLPQueryFilters;
  sort: LLPSortOptions;
}