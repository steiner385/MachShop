/**
 * Work Order Service Type Definitions
 * Extracted from monolith - provides complete type safety for work order management
 */

// ============================================================================
// Work Order Enums
// ============================================================================

export enum WorkOrderStatus {
  CREATED = 'CREATED',
  RELEASED = 'RELEASED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED'
}

export enum WorkOrderPriority {
  LOW = 'LOW',
  NORMAL = 'NORMAL',
  HIGH = 'HIGH',
  URGENT = 'URGENT'
}

export enum OperationStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  SKIPPED = 'SKIPPED'
}

// ============================================================================
// Work Order Core Types
// ============================================================================

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  partId: string;
  partNumber: string;
  routeId: string;
  quantityOrdered: number;
  quantityCompleted: number;
  quantityScrapped: number;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  customerOrder?: string;
  dueDate?: Date;
  scheduledStartDate?: Date;
  actualStartDate?: Date;
  scheduledEndDate?: Date;
  actualEndDate?: Date;
  siteId: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  operations?: WorkOrderOperation[];
}

export interface WorkOrderOperation {
  id: string;
  workOrderId: string;
  routeOperationId: string;
  operationNumber: number;
  operationCode: string;
  operationName: string;
  status: OperationStatus;
  quantityCompleted: number;
  quantityScrapped: number;
  setupStartTime?: Date;
  setupEndTime?: Date;
  runStartTime?: Date;
  runEndTime?: Date;
  operatorId?: string;
  workCenterId?: string;
  equipmentId?: string;
  actualCycleTimeMinutes?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Request/Response Types
// ============================================================================

export interface CreateWorkOrderRequest {
  partNumber: string;
  quantityOrdered: number;
  priority?: WorkOrderPriority;
  customerOrder?: string;
  dueDate?: Date;
  siteId: string;
}

export interface UpdateWorkOrderRequest {
  quantityOrdered?: number;
  priority?: WorkOrderPriority;
  customerOrder?: string;
  dueDate?: Date;
  scheduledStartDate?: Date;
  scheduledEndDate?: Date;
}

export interface StartOperationRequest {
  operatorId: string;
  equipmentId?: string;
  setupTime?: Date;
}

export interface CompleteOperationRequest {
  quantityCompleted: number;
  quantityScrapped?: number;
  notes?: string;
}

export interface WorkOrderFilters {
  status?: WorkOrderStatus;
  priority?: WorkOrderPriority;
  partNumber?: string;
  dueAfter?: Date;
  dueBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface WorkOrderListResponse {
  data: WorkOrder[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardMetrics {
  totalWorkOrders: number;
  activeWorkOrders: number;
  overdueWorkOrders: number;
  completedThisMonth: number;
  averageCompletionTime?: number;
  onTimeDeliveryRate?: number;
  productionEfficiency?: number;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface WorkOrderValidationError {
  field: string;
  message: string;
  code: string;
}

export interface WorkOrderBusinessRule {
  validate(workOrder: WorkOrder | CreateWorkOrderRequest): WorkOrderValidationError[];
}

export interface CancellationCheck {
  canCancel: boolean;
  reason?: string;
}

// ============================================================================
// Event Types (for Kafka integration)
// ============================================================================

export enum WorkOrderEventType {
  WORK_ORDER_CREATED = 'workorder.created',
  WORK_ORDER_UPDATED = 'workorder.updated',
  WORK_ORDER_RELEASED = 'workorder.released',
  WORK_ORDER_STARTED = 'workorder.started',
  WORK_ORDER_COMPLETED = 'workorder.completed',
  WORK_ORDER_CANCELLED = 'workorder.cancelled',
  OPERATION_STARTED = 'workorder.operation.started',
  OPERATION_COMPLETED = 'workorder.operation.completed',
}

export interface WorkOrderEvent {
  type: WorkOrderEventType;
  workOrderId: string;
  workOrderNumber: string;
  userId: string;
  timestamp: Date;
  data: any;
}

// ============================================================================
// Service Dependencies
// ============================================================================

export interface PartReference {
  id: string;
  partNumber: string;
  description?: string;
  uom?: string;
}

export interface RouteReference {
  id: string;
  routeCode: string;
  description?: string;
  operationCount?: number;
}

export interface UserReference {
  id: string;
  username: string;
  email?: string;
}
