/**
 * Production Scheduling Types
 * Phase 2: Production Scheduling Dashboard
 */

// ============================================
// ENUMS
// ============================================

export type ScheduleState =
  | 'FORECAST'
  | 'RELEASED'
  | 'DISPATCHED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'CLOSED';

export type SchedulePriority =
  | 'LOW'
  | 'NORMAL'
  | 'HIGH'
  | 'URGENT'
  | 'HOT';

export type ConstraintType =
  | 'CAPACITY'
  | 'MATERIAL'
  | 'PERSONNEL'
  | 'EQUIPMENT'
  | 'DATE'
  | 'QUALITY'
  | 'OTHER';

// ============================================
// ENTITY INTERFACES
// ============================================

export interface ProductionSchedule {
  id: string;
  scheduleNumber: string;
  scheduleName: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  periodType: string;
  state: ScheduleState;
  priority: SchedulePriority;
  siteId?: string;
  areaId?: string;
  plannedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  stateChangedAt?: string;
  stateChangedBy?: string;
  totalEntries: number;
  dispatchedCount: number;
  isLocked: boolean;
  isFeasible: boolean;
  feasibilityNotes?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // Relations
  site?: {
    id: string;
    siteName: string;
    siteCode: string;
  };
  entries?: ScheduleEntry[];
  stateHistory?: ScheduleStateHistory[];
}

export interface ScheduleEntry {
  id: string;
  scheduleId: string;
  entryNumber: number;
  partId: string;
  partNumber: string;
  description?: string;
  plannedQuantity: number;
  dispatchedQuantity: number;
  completedQuantity: number;
  unitOfMeasure: string;
  plannedStartDate: string;
  plannedEndDate: string;
  actualStartDate?: string;
  actualEndDate?: string;
  priority: SchedulePriority;
  sequenceNumber?: number;
  estimatedDuration?: number;
  workCenterId?: string;
  routingId?: string;
  customerOrder?: string;
  customerDueDate?: string;
  salesOrder?: string;
  workOrderId?: string;
  isDispatched: boolean;
  dispatchedAt?: string;
  dispatchedBy?: string;
  isCancelled: boolean;
  cancelledAt?: string;
  cancelledReason?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;

  // Relations
  part?: {
    id: string;
    partNumber: string;
    partName: string;
  };
  workCenter?: {
    id: string;
    workcenterName: string;
  };
  routing?: {
    id: string;
    routingNumber: string;
  };
  workOrder?: {
    id: string;
    orderNumber: string;
  };
  constraints?: ScheduleConstraint[];
}

export interface ScheduleConstraint {
  id: string;
  entryId: string;
  constraintType: ConstraintType;
  constraintName: string;
  description?: string;
  resourceId?: string;
  resourceType?: string;
  requiredQuantity?: number;
  availableQuantity?: number;
  unitOfMeasure?: string;
  constraintDate?: string;
  leadTimeDays?: number;
  isViolated: boolean;
  violationSeverity?: string;
  violationMessage?: string;
  isResolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  resolutionNotes?: string;
  notes?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ScheduleStateHistory {
  id: string;
  scheduleId: string;
  previousState?: ScheduleState;
  newState: ScheduleState;
  transitionDate: string;
  reason?: string;
  changedBy?: string;
  entriesAffected?: number;
  notificationsSent: boolean;
  notes?: string;
  metadata?: Record<string, any>;
}

// ============================================
// REQUEST/RESPONSE TYPES
// ============================================

export interface CreateScheduleRequest {
  scheduleNumber: string;
  scheduleName: string;
  description?: string;
  periodStart: string;
  periodEnd: string;
  periodType?: string;
  siteId?: string;
  areaId?: string;
  priority?: SchedulePriority;
  plannedBy?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateScheduleRequest {
  scheduleName?: string;
  description?: string;
  periodStart?: string;
  periodEnd?: string;
  periodType?: string;
  priority?: SchedulePriority;
  plannedBy?: string;
  approvedBy?: string;
  approvedAt?: string;
  isLocked?: boolean;
  isFeasible?: boolean;
  feasibilityNotes?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface CreateScheduleEntryRequest {
  partId: string;
  partNumber: string;
  description?: string;
  plannedQuantity: number;
  unitOfMeasure: string;
  plannedStartDate: string;
  plannedEndDate: string;
  priority?: SchedulePriority;
  sequenceNumber?: number;
  estimatedDuration?: number;
  workCenterId?: string;
  routingId?: string;
  customerOrder?: string;
  customerDueDate?: string;
  salesOrder?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface UpdateScheduleEntryRequest {
  description?: string;
  plannedQuantity?: number;
  plannedStartDate?: string;
  plannedEndDate?: string;
  priority?: SchedulePriority;
  sequenceNumber?: number;
  estimatedDuration?: number;
  workCenterId?: string;
  routingId?: string;
  customerOrder?: string;
  customerDueDate?: string;
  salesOrder?: string;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface TransitionStateRequest {
  newState: ScheduleState;
  reason?: string;
  changedBy?: string;
  notificationsSent?: boolean;
  notes?: string;
  metadata?: Record<string, any>;
}

export interface DispatchEntryRequest {
  dispatchedBy: string;
}

// ============================================
// QUERY/FILTER TYPES
// ============================================

export interface ScheduleQueryParams {
  state?: ScheduleState;
  priority?: SchedulePriority;
  siteId?: string;
  periodStart?: string;
  periodEnd?: string;
  isLocked?: boolean;
  isFeasible?: boolean;
  includeRelations?: boolean;
  page?: number;
  limit?: number;
}

export interface ScheduleFilters {
  search?: string | null;
  state?: ScheduleState | null;
  priority?: SchedulePriority | null;
  siteId?: string | null;
  isLocked?: boolean | null;
  isFeasible?: boolean | null;
}

// ============================================
// STATISTICS TYPES
// ============================================

export interface ScheduleStatistics {
  schedules: {
    total: number;
    byState: Record<ScheduleState, number>;
    byPriority: Record<SchedulePriority, number>;
  };
  entries: {
    total: number;
    dispatched: number;
    cancelled: number;
    pending: number;
  };
  constraints: {
    total: number;
    violated: number;
    resolved: number;
  };
  stateTransitions: {
    total: number;
  };
}

export interface FeasibilityResult {
  isFeasible: boolean;
  feasibilityIssues: string[];
}

// ============================================
// UI COLOR/LABEL MAPPINGS
// ============================================

export const SCHEDULE_STATE_COLORS: Record<ScheduleState, string> = {
  FORECAST: 'default',
  RELEASED: 'processing',
  DISPATCHED: 'cyan',
  RUNNING: 'blue',
  COMPLETED: 'success',
  CLOSED: 'default',
};

export const SCHEDULE_STATE_LABELS: Record<ScheduleState, string> = {
  FORECAST: 'Forecast',
  RELEASED: 'Released',
  DISPATCHED: 'Dispatched',
  RUNNING: 'Running',
  COMPLETED: 'Completed',
  CLOSED: 'Closed',
};

export const PRIORITY_COLORS: Record<SchedulePriority, string> = {
  LOW: 'default',
  NORMAL: 'blue',
  HIGH: 'orange',
  URGENT: 'red',
  HOT: 'magenta',
};

export const PRIORITY_LABELS: Record<SchedulePriority, string> = {
  LOW: 'Low',
  NORMAL: 'Normal',
  HIGH: 'High',
  URGENT: 'Urgent',
  HOT: 'Hot',
};

export const CONSTRAINT_TYPE_COLORS: Record<ConstraintType, string> = {
  CAPACITY: 'orange',
  MATERIAL: 'blue',
  PERSONNEL: 'green',
  EQUIPMENT: 'purple',
  DATE: 'red',
  QUALITY: 'gold',
  OTHER: 'default',
};

export const CONSTRAINT_TYPE_LABELS: Record<ConstraintType, string> = {
  CAPACITY: 'Capacity',
  MATERIAL: 'Material',
  PERSONNEL: 'Personnel',
  EQUIPMENT: 'Equipment',
  DATE: 'Date',
  QUALITY: 'Quality',
  OTHER: 'Other',
};
