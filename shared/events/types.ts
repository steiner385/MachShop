/**
 * Event Type Definitions
 * Phase 2, Task 2.3: Database Per Service Pattern
 *
 * CloudEvents-compliant event schemas for cross-service communication
 */

export interface EventMetadata {
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  [key: string]: any;
}

/**
 * Base domain event interface (CloudEvents 1.0 compliant)
 */
export interface DomainEvent<T = any> {
  // CloudEvents required fields
  id: string; // Unique event ID
  type: string; // Event type (e.g., "material.part.updated")
  source: string; // Service that produced the event
  timestamp: Date; // When the event occurred

  // Event payload
  payload: T;

  // Optional CloudEvents fields
  datacontenttype?: string; // Always "application/json"
  subject?: string; // Subject of the event

  // Custom fields for correlation
  entityId?: string; // ID of the affected entity (for partitioning)
  entityType?: string; // Type of entity (Part, WorkOrder, etc.)
  correlationId?: string; // For request tracing
  causationId?: string; // ID of event that caused this event

  // Additional metadata
  metadata?: EventMetadata;
}

// ============================================================================
// Material Service Events
// ============================================================================

export interface PartCreatedPayload {
  partId: string;
  partNumber: string;
  partName: string;
  revision?: string;
  unitOfMeasure: string;
  materialType?: string;
}

export interface PartUpdatedPayload {
  partId: string;
  partNumber: string;
  partName: string;
  revision?: string;
  changes: Partial<PartCreatedPayload>;
  previousValues?: Partial<PartCreatedPayload>;
}

export interface PartDeletedPayload {
  partId: string;
  partNumber: string;
  deletedAt: Date;
}

export interface LotCreatedPayload {
  lotId: string;
  lotNumber: string;
  partId: string;
  partNumber: string;
  quantity: number;
  receivedDate: Date;
}

export interface SerialCreatedPayload {
  serialId: string;
  serialNumber: string;
  partId: string;
  partNumber: string;
  lotNumber?: string;
  workOrderId?: string;
}

// ============================================================================
// Resource Service Events
// ============================================================================

export interface WorkCenterUpdatedPayload {
  workCenterId: string;
  workCenterCode: string;
  workCenterName: string;
  status: string;
  changes: Record<string, any>;
}

export interface PersonnelUpdatedPayload {
  personnelId: string;
  userId: string;
  firstName: string;
  lastName: string;
  changes: Record<string, any>;
}

export interface ProductUpdatedPayload {
  productId: string;
  productCode: string;
  productName: string;
  changes: Record<string, any>;
}

// ============================================================================
// Auth Service Events
// ============================================================================

export interface UserCreatedPayload {
  userId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export interface UserUpdatedPayload {
  userId: string;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  changes: Record<string, any>;
}

export interface UserDeletedPayload {
  userId: string;
  username: string;
  deletedAt: Date;
}

// ============================================================================
// Work Order Service Events
// ============================================================================

export interface WorkOrderCreatedPayload {
  workOrderId: string;
  workOrderNumber: string;
  partId: string;
  partNumber?: string;
  quantity: number;
  status: string;
}

export interface WorkOrderStatusChangedPayload {
  workOrderId: string;
  workOrderNumber: string;
  previousStatus: string;
  newStatus: string;
  changedAt: Date;
  changedBy: string;
}

export interface WorkOrderCompletedPayload {
  workOrderId: string;
  workOrderNumber: string;
  quantityCompleted: number;
  quantityScrapped: number;
  completedAt: Date;
}

// ============================================================================
// Quality Service Events
// ============================================================================

export interface InspectionCompletedPayload {
  inspectionId: string;
  inspectionNumber: string;
  partId?: string;
  workOrderId?: string;
  result: 'PASS' | 'FAIL';
  completedAt: Date;
  inspectedBy: string;
}

export interface NCRCreatedPayload {
  ncrId: string;
  ncrNumber: string;
  partId?: string;
  severity: string;
  problemDescription: string;
}

// ============================================================================
// Event Type Enumerations
// ============================================================================

export enum MaterialEventTypes {
  PART_CREATED = 'material.part.created',
  PART_UPDATED = 'material.part.updated',
  PART_DELETED = 'material.part.deleted',
  LOT_CREATED = 'material.lot.created',
  LOT_UPDATED = 'material.lot.updated',
  SERIAL_CREATED = 'material.serial.created',
  SERIAL_UPDATED = 'material.serial.updated',
}

export enum ResourceEventTypes {
  WORK_CENTER_CREATED = 'resource.workcenter.created',
  WORK_CENTER_UPDATED = 'resource.workcenter.updated',
  PERSONNEL_CREATED = 'resource.personnel.created',
  PERSONNEL_UPDATED = 'resource.personnel.updated',
  PRODUCT_CREATED = 'resource.product.created',
  PRODUCT_UPDATED = 'resource.product.updated',
}

export enum AuthEventTypes {
  USER_CREATED = 'auth.user.created',
  USER_UPDATED = 'auth.user.updated',
  USER_DELETED = 'auth.user.deleted',
}

export enum WorkOrderEventTypes {
  WORK_ORDER_CREATED = 'workorder.created',
  WORK_ORDER_UPDATED = 'workorder.updated',
  WORK_ORDER_STATUS_CHANGED = 'workorder.status.changed',
  WORK_ORDER_COMPLETED = 'workorder.completed',
}

export enum QualityEventTypes {
  INSPECTION_COMPLETED = 'quality.inspection.completed',
  NCR_CREATED = 'quality.ncr.created',
  NCR_UPDATED = 'quality.ncr.updated',
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new domain event
 */
export function createDomainEvent<T>(
  type: string,
  source: string,
  payload: T,
  options: {
    entityId?: string;
    entityType?: string;
    correlationId?: string;
    causationId?: string;
    metadata?: EventMetadata;
  } = {}
): DomainEvent<T> {
  return {
    id: generateEventId(),
    type,
    source,
    timestamp: new Date(),
    payload,
    datacontenttype: 'application/json',
    ...options,
  };
}

/**
 * Generate unique event ID
 */
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Extract entity ID from event for partitioning
 */
export function getEventPartitionKey(event: DomainEvent): string {
  return event.entityId || event.id;
}

/**
 * Validate CloudEvents format
 */
export function validateCloudEvent(event: any): boolean {
  const required = ['id', 'type', 'source', 'timestamp'];
  return required.every((field) => event[field] !== undefined);
}
