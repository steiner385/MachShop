/**
 * Domain Event Type Definitions
 *
 * Defines all event types across the MES microservices architecture.
 * Each service publishes events that other services can consume.
 */

import { BaseEvent } from './base';

// ============================================================================
// EVENT TYPE CONSTANTS
// ============================================================================

export const EventTypes = {
  // Work Order Events
  WORK_ORDER_CREATED: 'work-order.created',
  WORK_ORDER_UPDATED: 'work-order.updated',
  WORK_ORDER_STARTED: 'work-order.started',
  WORK_ORDER_COMPLETED: 'work-order.completed',
  WORK_ORDER_CANCELLED: 'work-order.cancelled',

  // Quality Events
  QUALITY_INSPECTION_CREATED: 'quality.inspection.created',
  QUALITY_INSPECTION_COMPLETED: 'quality.inspection.completed',
  QUALITY_INSPECTION_FAILED: 'quality.inspection.failed',
  NCR_CREATED: 'quality.ncr.created',
  NCR_CLOSED: 'quality.ncr.closed',
  FAI_APPROVED: 'quality.fai.approved',
  FAI_REJECTED: 'quality.fai.rejected',

  // Material Events
  MATERIAL_RECEIVED: 'material.received',
  MATERIAL_ISSUED: 'material.issued',
  MATERIAL_RETURNED: 'material.returned',
  LOT_CREATED: 'material.lot.created',
  SERIAL_NUMBER_GENERATED: 'material.serial.generated',
  INVENTORY_ADJUSTED: 'material.inventory.adjusted',

  // Traceability Events
  TRACEABILITY_EVENT_CREATED: 'traceability.event.created',
  LOT_GENEALOGY_UPDATED: 'traceability.lot.genealogy.updated',
  SERIAL_GENEALOGY_UPDATED: 'traceability.serial.genealogy.updated',
  RECALL_INITIATED: 'traceability.recall.initiated',

  // Resource Events
  EQUIPMENT_STATUS_CHANGED: 'resource.equipment.status.changed',
  PERSONNEL_ASSIGNED: 'resource.personnel.assigned',
  TOOL_ASSIGNED: 'resource.tool.assigned',
  SHIFT_STARTED: 'resource.shift.started',
  SHIFT_ENDED: 'resource.shift.ended',

  // Auth Events
  USER_CREATED: 'auth.user.created',
  USER_UPDATED: 'auth.user.updated',
  USER_LOCKED: 'auth.user.locked',
  USER_UNLOCKED: 'auth.user.unlocked',
  LOGIN_SUCCESS: 'auth.login.success',
  LOGIN_FAILED: 'auth.login.failed',

  // Reporting Events
  KPI_CALCULATED: 'reporting.kpi.calculated',
  ALERT_TRIGGERED: 'reporting.alert.triggered',
  REPORT_GENERATED: 'reporting.report.generated',

  // Integration Events
  INTEGRATION_SYNC_STARTED: 'integration.sync.started',
  INTEGRATION_SYNC_COMPLETED: 'integration.sync.completed',
  INTEGRATION_SYNC_FAILED: 'integration.sync.failed',
  B2M_MESSAGE_SENT: 'integration.b2m.sent',
  B2M_MESSAGE_RECEIVED: 'integration.b2m.received',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// ============================================================================
// WORK ORDER EVENTS
// ============================================================================

export interface WorkOrderCreatedData {
  workOrderId: string;
  workOrderNumber: string;
  partId: string;
  partNumber: string;
  quantity: number;
  dueDate: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  createdBy: string;
}

export interface WorkOrderCompletedData {
  workOrderId: string;
  workOrderNumber: string;
  quantityCompleted: number;
  quantityRejected: number;
  completedAt: string;
  completedBy: string;
}

export type WorkOrderCreatedEvent = BaseEvent<WorkOrderCreatedData>;
export type WorkOrderCompletedEvent = BaseEvent<WorkOrderCompletedData>;

// ============================================================================
// QUALITY EVENTS
// ============================================================================

export interface QualityInspectionCompletedData {
  inspectionId: string;
  inspectionNumber: string;
  workOrderId?: string;
  lotNumber?: string;
  serialNumber?: string;
  result: 'PASS' | 'FAIL' | 'CONDITIONAL';
  quantityInspected: number;
  quantityAccepted: number;
  quantityRejected: number;
  ncrGenerated: boolean;
  ncrId?: string;
  inspectedBy: string;
  inspectionDate: string;
}

export interface NCRCreatedData {
  ncrId: string;
  ncrNumber: string;
  partId: string;
  workOrderId?: string;
  lotNumber?: string;
  ncrType: 'INTERNAL' | 'SUPPLIER' | 'CUSTOMER';
  severity: 'CRITICAL' | 'MAJOR' | 'MINOR';
  problemDescription: string;
  quantityAffected: number;
  createdBy: string;
}

export type QualityInspectionCompletedEvent = BaseEvent<QualityInspectionCompletedData>;
export type NCRCreatedEvent = BaseEvent<NCRCreatedData>;

// ============================================================================
// MATERIAL EVENTS
// ============================================================================

export interface MaterialReceivedData {
  transactionId: string;
  partId: string;
  partNumber: string;
  quantity: number;
  lotNumber: string;
  supplierId?: string;
  receivedBy: string;
  receivedDate: string;
}

export interface MaterialIssuedData {
  transactionId: string;
  partId: string;
  partNumber: string;
  quantity: number;
  lotNumber?: string;
  workOrderId?: string;
  issuedTo: string;
  issuedBy: string;
  issuedDate: string;
}

export interface SerialNumberGeneratedData {
  serialId: string;
  serialNumber: string;
  partId: string;
  partNumber: string;
  lotNumber?: string;
  workOrderId?: string;
  generatedBy: string;
  generatedDate: string;
}

export type MaterialReceivedEvent = BaseEvent<MaterialReceivedData>;
export type MaterialIssuedEvent = BaseEvent<MaterialIssuedData>;
export type SerialNumberGeneratedEvent = BaseEvent<SerialNumberGeneratedData>;

// ============================================================================
// TRACEABILITY EVENTS
// ============================================================================

export interface TraceabilityEventData {
  eventId: string;
  eventType: 'MATERIAL_RECEIVED' | 'LOT_CREATED' | 'SERIAL_CREATED' |
              'WORK_ORDER_STARTED' | 'WORK_ORDER_COMPLETED' | 'INSPECTION' |
              'MATERIAL_ISSUED' | 'MATERIAL_CONSUMED';
  partId?: string;
  partNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  fromLocation?: string;
  toLocation?: string;
  quantity?: number;
  uom?: string;
  performedBy?: string;
  eventDate: string;
  eventDetails?: Record<string, any>;
}

export type TraceabilityEventCreatedEvent = BaseEvent<TraceabilityEventData>;

// ============================================================================
// RESOURCE EVENTS
// ============================================================================

export interface EquipmentStatusChangedData {
  equipmentId: string;
  equipmentCode: string;
  previousStatus: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DOWN' | 'RETIRED';
  newStatus: 'AVAILABLE' | 'IN_USE' | 'MAINTENANCE' | 'DOWN' | 'RETIRED';
  reason?: string;
  changedBy: string;
  changedAt: string;
}

export type EquipmentStatusChangedEvent = BaseEvent<EquipmentStatusChangedData>;

// ============================================================================
// CACHE INVALIDATION EVENTS
// ============================================================================

export interface CacheInvalidationData {
  cacheKey: string;
  cachePattern?: string;  // For wildcard invalidation
  reason: string;
  invalidatedBy: string;
}

export const CACHE_INVALIDATION_EVENT = 'cache.invalidate';
export type CacheInvalidationEvent = BaseEvent<CacheInvalidationData>;
