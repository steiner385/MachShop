/**
 * ISA-95 B2M (Business to Manufacturing) Integration Types
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Type definitions for bidirectional data exchange between MES (Level 3) and ERP (Level 4)
 * Following ISA-95 Part 3 specification for production operations management
 */

import {
  ScheduleType,
  SchedulePriority,
  B2MMessageStatus,
  ERPTransactionType,
  PersonnelActionType,
  IntegrationDirection,
} from '@prisma/client';

// ============================================================================
// Production Schedule Request/Response Types
// ============================================================================

export interface ProductionScheduleRequestInput {
  messageId: string;
  configId: string;
  scheduleType: ScheduleType;
  priority: SchedulePriority;
  requestedBy: string;
  effectiveStartDate: Date;
  effectiveEndDate: Date;
  externalWorkOrderId: string;
  partNumber?: string;
  quantity: number;
  unitOfMeasure: string;
  dueDate: Date;
  workCenterId?: string;
  equipmentRequirements?: Record<string, any>;
  personnelRequirements?: Record<string, any>;
  materialRequirements?: Record<string, any>;
  requestPayload: Record<string, any>;
}

export interface ProductionScheduleResponseInput {
  requestId: string;
  messageId: string;
  accepted: boolean;
  confirmedStartDate?: Date;
  confirmedEndDate?: Date;
  confirmedQuantity?: number;
  rejectionReason?: string;
  modifications?: Record<string, any>;
  constraints?: Record<string, any>;
  proposedStartDate?: Date;
  proposedEndDate?: Date;
  proposedQuantity?: number;
  respondedBy: string;
  responsePayload: Record<string, any>;
}

// ============================================================================
// Production Performance Actuals Types (MES → ERP)
// ============================================================================

export interface ProductionPerformanceActualInput {
  messageId: string;
  configId: string;
  workOrderId: string;
  externalWorkOrderId: string;
  operationId?: string;
  reportingPeriodStart: Date;
  reportingPeriodEnd: Date;

  // Production quantities
  quantityProduced: number;
  quantityGood: number;
  quantityScrap: number;
  quantityRework: number;
  yieldPercentage?: number;

  // Time actuals
  setupTimeActual?: number;
  runTimeActual?: number;
  downtimeActual?: number;
  laborHoursActual?: number;

  // Cost actuals
  laborCostActual?: number;
  materialCostActual?: number;
  overheadCostActual?: number;
  totalCostActual?: number;

  // Variances
  quantityVariance?: number;
  timeVariance?: number;
  costVariance?: number;
  efficiencyVariance?: number;

  // Actuals data
  personnelActuals?: Record<string, any>;
  equipmentActuals?: Record<string, any>;
  materialActuals?: Record<string, any>;

  createdBy: string;
  messagePayload: Record<string, any>;
}

export interface ProductionPerformanceExportResult {
  messageId: string;
  workOrderId: string;
  externalWorkOrderId: string;
  status: B2MMessageStatus;
  sentToERP: boolean;
  sentAt?: Date;
  erpConfirmation?: string;
  errorMessage?: string;
}

// ============================================================================
// Material Transaction Exchange Types
// ============================================================================

export interface ERPMaterialTransactionInput {
  messageId: string;
  configId: string;
  transactionType: ERPTransactionType;
  direction: IntegrationDirection;
  externalPartId: string;
  partId?: string;
  quantity: number;
  unitOfMeasure: string;

  // Location references
  fromLocation?: string;
  toLocation?: string;
  workOrderId?: string;
  externalWorkOrderId?: string;

  // Tracking
  lotNumber?: string;
  serialNumber?: string;

  // Cost/valuation
  unitCost?: number;
  totalCost?: number;
  currency?: string;

  // Transaction codes
  movementType: string;
  reasonCode?: string;

  createdBy: string;
  messagePayload: Record<string, any>;
}

export interface MaterialTransactionSyncResult {
  messageId: string;
  transactionType: ERPTransactionType;
  status: B2MMessageStatus;
  processedAt?: Date;
  erpTransactionId?: string;
  errorMessage?: string;
}

// ============================================================================
// Personnel Information Exchange Types
// ============================================================================

export interface PersonnelInfoExchangeInput {
  messageId: string;
  configId: string;
  externalPersonnelId: string;
  personnelId?: string;
  actionType: PersonnelActionType;
  direction: IntegrationDirection;

  // Personnel details
  firstName?: string;
  lastName?: string;
  email?: string;
  employeeNumber?: string;
  department?: string;
  jobTitle?: string;

  // Skills and certifications
  skills?: Record<string, any>;
  certifications?: Record<string, any>;
  qualifications?: Record<string, any>;

  // Availability/scheduling
  shiftCode?: string;
  workCalendar?: string;
  availableFrom?: Date;
  availableTo?: Date;

  // Status
  employmentStatus?: string;
  lastWorkDate?: Date;

  messagePayload: Record<string, any>;
}

export interface PersonnelInfoSyncResult {
  messageId: string;
  externalPersonnelId: string;
  personnelId?: string;
  actionType: PersonnelActionType;
  status: B2MMessageStatus;
  processedAt?: Date;
  errorMessage?: string;
}

// ============================================================================
// ISA-95 B2M Message Builder Types
// ============================================================================

export interface ISA95ProductionScheduleMessage {
  messageType: 'ProductionSchedule';
  messageId: string;
  timestamp: string;
  sender: string;
  receiver: string;
  scheduleType: ScheduleType;
  priority: SchedulePriority;
  workOrder: {
    externalId: string;
    partNumber: string;
    quantity: number;
    unitOfMeasure: string;
    dueDate: string;
    startDate: string;
    endDate: string;
  };
  resources?: {
    personnel?: Array<{ skillCode: string; quantity: number }>;
    equipment?: Array<{ equipmentClass: string; quantity: number }>;
    materials?: Array<{ partNumber: string; quantity: number }>;
  };
}

export interface ISA95ProductionPerformanceMessage {
  messageType: 'ProductionPerformance';
  messageId: string;
  timestamp: string;
  sender: string;
  receiver: string;
  workOrder: {
    externalId: string;
    actualStartDate: string;
    actualEndDate: string;
  };
  quantities: {
    produced: number;
    good: number;
    scrap: number;
    rework: number;
    yield: number;
  };
  actuals: {
    labor?: { hours: number; cost: number };
    material?: { cost: number };
    overhead?: { cost: number };
    total?: { cost: number };
  };
  variances: {
    quantity?: number;
    time?: number;
    cost?: number;
    efficiency?: number;
  };
}

export interface ISA95MaterialTransactionMessage {
  messageType: 'MaterialTransaction';
  messageId: string;
  timestamp: string;
  sender: string;
  receiver: string;
  transactionType: ERPTransactionType;
  material: {
    partNumber: string;
    quantity: number;
    unitOfMeasure: string;
    lotNumber?: string;
    serialNumber?: string;
  };
  locations: {
    from?: string;
    to?: string;
  };
  cost?: {
    unit: number;
    total: number;
    currency: string;
  };
  workOrderReference?: string;
}

export interface ISA95PersonnelInfoMessage {
  messageType: 'PersonnelInfo';
  messageId: string;
  timestamp: string;
  sender: string;
  receiver: string;
  actionType: PersonnelActionType;
  personnel: {
    externalId: string;
    employeeNumber?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    department?: string;
    jobTitle?: string;
  };
  skills?: Array<{ code: string; level: string }>;
  certifications?: Array<{ code: string; expirationDate?: string }>;
  availability?: {
    shiftCode?: string;
    calendar?: string;
    from?: string;
    to?: string;
  };
}

// ============================================================================
// Integration API Response Types
// ============================================================================

export interface B2MIntegrationResponse<T = any> {
  success: boolean;
  messageId: string;
  status: B2MMessageStatus;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: string;
}

export interface B2MBulkIntegrationResponse {
  successful: number;
  failed: number;
  results: Array<{
    messageId: string;
    status: B2MMessageStatus;
    data?: any;
  }>;
  errors: Array<{
    messageId: string;
    error: string;
  }>;
  timestamp: string;
}
