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

export interface WorkOrderValidationError {
  field: string;
  message: string;
  code: string;
}

export interface WorkOrderBusinessRule {
  validate(workOrder: WorkOrder | CreateWorkOrderRequest): WorkOrderValidationError[];
}