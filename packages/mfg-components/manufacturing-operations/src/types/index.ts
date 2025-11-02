/**
 * Type definitions for Manufacturing Operations Components
 */

export interface WorkOrder {
  id: string;
  number: string;
  partNumber: string;
  partName: string;
  quantity: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  actualStartDate?: Date;
  actualEndDate?: Date;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'HOLD' | 'CANCELLED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedOperator?: string;
  assignedWorkCenter?: string;
  notes?: string;
}

export interface Operation {
  id: string;
  workOrderId: string;
  operationNumber: number;
  description: string;
  sequence: number;
  estimatedDuration: number; // minutes
  actualDuration?: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'REJECTED';
  workCenter: string;
  skills?: string[];
}

export interface QualityCheckData {
  id: string;
  workOrderId: string;
  operationId: string;
  checkType: 'INCOMING' | 'IN_PROCESS' | 'FINAL';
  measurements: Measurement[];
  status: 'ACCEPTED' | 'REJECTED' | 'CONDITIONAL_ACCEPT';
  rejectionReason?: string;
  checkedBy: string;
  checkedAt: Date;
  notes?: string;
}

export interface Measurement {
  parameterId: string;
  parameterName: string;
  value: number;
  unit: string;
  minValue?: number;
  maxValue?: number;
  targetValue?: number;
  status: 'OK' | 'OUT_OF_RANGE' | 'WARNING';
}

export interface TimeTrackingEntry {
  id: string;
  operatorId: string;
  workOrderId: string;
  operationId: string;
  startTime: Date;
  endTime?: Date;
  duration?: number; // seconds
  breaks: Break[];
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED';
}

export interface Break {
  id: string;
  type: 'SCHEDULED' | 'UNSCHEDULED';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  reason?: string;
}

export interface MaterialConsumption {
  id: string;
  workOrderId: string;
  operationId: string;
  materialId: string;
  materialNumber: string;
  quantity: number;
  unit: string;
  timestamp: Date;
  consumedBy: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  name: string;
  equipmentNumber: string;
  status: 'OPERATIONAL' | 'MAINTENANCE' | 'BREAKDOWN' | 'OFFLINE';
  healthScore: number; // 0-100
  lastMaintenanceDate?: Date;
  nextMaintenanceDate?: Date;
  parameters: EquipmentParameter[];
}

export interface EquipmentParameter {
  id: string;
  name: string;
  value: number;
  unit: string;
  minValue?: number;
  maxValue?: number;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
  updatedAt: Date;
}

export interface Lot {
  id: string;
  lotNumber: string;
  partNumber: string;
  quantity: number;
  unit: string;
  createdDate: Date;
  completedDate?: Date;
  status: 'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | 'QUARANTINE';
  serialNumbers?: string[];
  workOrders: string[];
  notes?: string;
}

export interface SerialNumber {
  id: string;
  number: string;
  lotId: string;
  partNumber: string;
  status: 'ACTIVE' | 'ARCHIVED' | 'QUARANTINE';
  createdDate: Date;
  metadata?: Record<string, unknown>;
}

// Component Props Interfaces

export interface WorkOrderFormProps {
  onSubmit: (data: Omit<WorkOrder, 'id'>) => Promise<void>;
  initialData?: WorkOrder;
  isLoading?: boolean;
  error?: string;
}

export interface QualityCheckFormProps {
  workOrderId: string;
  operationId: string;
  parameters: Measurement[];
  onSubmit: (data: QualityCheckData) => Promise<void>;
  isLoading?: boolean;
}

export interface GanttChartProps {
  workOrders: WorkOrder[];
  operations: Operation[];
  onOperationClick?: (operation: Operation) => void;
  onReschedule?: (operationId: string, newDate: Date) => Promise<void>;
  height?: number;
  startDate?: Date;
  endDate?: Date;
}

export interface EquipmentStatusProps {
  equipment: Equipment;
  onMaintenanceAlert?: (equipmentId: string) => void;
  showDetailedView?: boolean;
  refreshInterval?: number; // milliseconds
}

export interface ShiftClockProps {
  operatorId: string;
  workOrderId?: string;
  operationId?: string;
  onClockIn?: (entry: TimeTrackingEntry) => Promise<void>;
  onClockOut?: (entryId: string) => Promise<void>;
  onBreak?: (entry: TimeTrackingEntry) => Promise<void>;
}

export interface MeasurementCaptureProps {
  parameters: Measurement[];
  onSubmit: (measurements: Measurement[]) => Promise<void>;
  autoCalculateStatus?: boolean;
  isLoading?: boolean;
}

export interface NCRDashboardProps {
  filters?: {
    startDate?: Date;
    endDate?: Date;
    status?: string;
    severity?: string;
  };
  onNCRClick?: (ncr: QualityCheckData) => void;
  refreshInterval?: number;
}

export interface ComponentLibraryConfig {
  theme?: {
    primaryColor?: string;
    secondaryColor?: string;
    fontFamily?: string;
  };
  locale?: string;
  dateFormat?: string;
  timeFormat?: string;
  decimalPlaces?: number;
  currencySymbol?: string;
}
