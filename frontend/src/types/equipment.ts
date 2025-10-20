/**
 * Equipment Management Types
 * Phase 3: Equipment Maintenance Scheduling API Integration
 */

// ============================================
// ENUMS
// ============================================

export enum EquipmentClass {
  PRODUCTION = 'PRODUCTION',
  MAINTENANCE = 'MAINTENANCE',
  QUALITY = 'QUALITY',
  MATERIAL_HANDLING = 'MATERIAL_HANDLING',
  LABORATORY = 'LABORATORY',
  STORAGE = 'STORAGE',
  ASSEMBLY = 'ASSEMBLY',
}

export enum EquipmentStatus {
  AVAILABLE = 'AVAILABLE',
  IN_USE = 'IN_USE',
  OPERATIONAL = 'OPERATIONAL',
  MAINTENANCE = 'MAINTENANCE',
  DOWN = 'DOWN',
  RETIRED = 'RETIRED',
}

export enum EquipmentState {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  BLOCKED = 'BLOCKED',
  STARVED = 'STARVED',
  FAULT = 'FAULT',
  MAINTENANCE = 'MAINTENANCE',
  SETUP = 'SETUP',
  EMERGENCY = 'EMERGENCY',
}

export enum MaintenanceType {
  PREVENTIVE = 'PREVENTIVE',
  CORRECTIVE = 'CORRECTIVE',
  PREDICTIVE = 'PREDICTIVE',
  CALIBRATION = 'CALIBRATION',
}

export enum MaintenanceStatus {
  SCHEDULED = 'SCHEDULED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  OVERDUE = 'OVERDUE',
  CANCELLED = 'CANCELLED',
}

// ============================================
// INTERFACES
// ============================================

export interface Equipment {
  id: string;
  equipmentNumber: string;
  name: string;
  description?: string;
  equipmentClass: EquipmentClass;
  equipmentType?: string;
  equipmentLevel: number;
  parentEquipmentId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  installDate?: string;
  commissionDate?: string;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  status: EquipmentStatus;
  currentState: EquipmentState;
  stateChangedAt: string;
  utilizationRate?: number;
  availability?: number;
  performance?: number;
  quality?: number;
  oee?: number;
  ratedCapacity?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  parentEquipment?: Equipment;
  childEquipment?: Equipment[];
  maintenanceRecords?: MaintenanceRecord[];
  stateHistory?: EquipmentStateHistory[];
}

export interface MaintenanceRecord {
  id: string;
  equipmentId: string;
  maintenanceType: MaintenanceType;
  status: MaintenanceStatus;
  scheduledDate: string;
  completedDate?: string;
  description: string;
  performedBy?: string;
  duration?: number;
  cost?: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  equipment?: Equipment;
}

export interface EquipmentStateHistory {
  id: string;
  equipmentId: string;
  previousState: EquipmentState;
  newState: EquipmentState;
  changedAt: string;
  changedBy?: string;
  reason?: string;
  duration?: number;
  createdAt: string;
  // Relations
  equipment?: Equipment;
}

export interface EquipmentStatistics {
  totalEquipment: number;
  totalActive: number;
  byClass: Record<EquipmentClass, number>;
  byStatus: Record<EquipmentStatus, number>;
  byState: Record<EquipmentState, number>;
  averageOEE: number;
  averageAvailability: number;
  totalMaintenanceScheduled: number;
  totalMaintenanceOverdue: number;
  totalMaintenanceCompleted: number;
}

export interface OEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  utilizationRate?: number;
  teep?: number;
}

export interface OEEDashboardData {
  summary: {
    totalEquipment: number;
    equipmentWithOEE: number;
    averageOEE: number;
    averageAvailability: number;
    averagePerformance: number;
    averageQuality: number;
  };
  distribution: {
    excellent: number; // ≥ 85%
    good: number; // 70-85%
    fair: number; // 50-70%
    poor: number; // < 50%
    noData: number;
  };
  byStatus: Record<EquipmentStatus, number>;
  byState: Record<EquipmentState, number>;
  topPerformers: Array<{
    id: string;
    equipmentNumber: string;
    name: string;
    equipmentClass: EquipmentClass;
    oee: number | null;
    availability: number | null;
    performance: number | null;
    quality: number | null;
    status: EquipmentStatus;
  }>;
  bottomPerformers: Array<{
    id: string;
    equipmentNumber: string;
    name: string;
    equipmentClass: EquipmentClass;
    oee: number | null;
    availability: number | null;
    performance: number | null;
    quality: number | null;
    status: EquipmentStatus;
  }>;
}

// ============================================
// QUERY PARAMETERS
// ============================================

export interface EquipmentQueryParams {
  equipmentClass?: EquipmentClass;
  status?: EquipmentStatus;
  state?: EquipmentState;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  isActive?: boolean;
  searchText?: string;
  includeRelations?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MaintenanceQueryParams {
  equipmentId?: string;
  maintenanceType?: MaintenanceType;
  status?: MaintenanceStatus;
  startDate?: string;
  endDate?: string;
  isOverdue?: boolean;
  includeRelations?: boolean;
  page?: number;
  pageSize?: number;
}

// ============================================
// UI MAPPING CONSTANTS
// ============================================

export const EQUIPMENT_CLASS_LABELS: Record<EquipmentClass, string> = {
  [EquipmentClass.PRODUCTION]: 'Production',
  [EquipmentClass.MAINTENANCE]: 'Maintenance',
  [EquipmentClass.QUALITY]: 'Quality',
  [EquipmentClass.MATERIAL_HANDLING]: 'Material Handling',
  [EquipmentClass.LABORATORY]: 'Laboratory',
  [EquipmentClass.STORAGE]: 'Storage',
  [EquipmentClass.ASSEMBLY]: 'Assembly',
};

export const EQUIPMENT_CLASS_COLORS: Record<EquipmentClass, string> = {
  [EquipmentClass.PRODUCTION]: 'blue',
  [EquipmentClass.MAINTENANCE]: 'orange',
  [EquipmentClass.QUALITY]: 'green',
  [EquipmentClass.MATERIAL_HANDLING]: 'cyan',
  [EquipmentClass.LABORATORY]: 'purple',
  [EquipmentClass.STORAGE]: 'geekblue',
  [EquipmentClass.ASSEMBLY]: 'magenta',
};

export const EQUIPMENT_STATUS_LABELS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.AVAILABLE]: 'Available',
  [EquipmentStatus.IN_USE]: 'In Use',
  [EquipmentStatus.OPERATIONAL]: 'Operational',
  [EquipmentStatus.MAINTENANCE]: 'Maintenance',
  [EquipmentStatus.DOWN]: 'Down',
  [EquipmentStatus.RETIRED]: 'Retired',
};

export const EQUIPMENT_STATUS_COLORS: Record<EquipmentStatus, string> = {
  [EquipmentStatus.AVAILABLE]: 'success',
  [EquipmentStatus.IN_USE]: 'processing',
  [EquipmentStatus.OPERATIONAL]: 'success',
  [EquipmentStatus.MAINTENANCE]: 'warning',
  [EquipmentStatus.DOWN]: 'error',
  [EquipmentStatus.RETIRED]: 'default',
};

export const EQUIPMENT_STATE_LABELS: Record<EquipmentState, string> = {
  [EquipmentState.IDLE]: 'Idle',
  [EquipmentState.RUNNING]: 'Running',
  [EquipmentState.BLOCKED]: 'Blocked',
  [EquipmentState.STARVED]: 'Starved',
  [EquipmentState.FAULT]: 'Fault',
  [EquipmentState.MAINTENANCE]: 'Maintenance',
  [EquipmentState.SETUP]: 'Setup',
  [EquipmentState.EMERGENCY]: 'Emergency',
};

export const EQUIPMENT_STATE_COLORS: Record<EquipmentState, string> = {
  [EquipmentState.IDLE]: 'default',
  [EquipmentState.RUNNING]: 'success',
  [EquipmentState.BLOCKED]: 'warning',
  [EquipmentState.STARVED]: 'orange',
  [EquipmentState.FAULT]: 'error',
  [EquipmentState.MAINTENANCE]: 'processing',
  [EquipmentState.SETUP]: 'cyan',
  [EquipmentState.EMERGENCY]: 'error',
};

export const MAINTENANCE_TYPE_LABELS: Record<MaintenanceType, string> = {
  [MaintenanceType.PREVENTIVE]: 'Preventive',
  [MaintenanceType.CORRECTIVE]: 'Corrective',
  [MaintenanceType.PREDICTIVE]: 'Predictive',
  [MaintenanceType.CALIBRATION]: 'Calibration',
};

export const MAINTENANCE_TYPE_COLORS: Record<MaintenanceType, string> = {
  [MaintenanceType.PREVENTIVE]: 'blue',
  [MaintenanceType.CORRECTIVE]: 'orange',
  [MaintenanceType.PREDICTIVE]: 'purple',
  [MaintenanceType.CALIBRATION]: 'cyan',
};

export const MAINTENANCE_STATUS_LABELS: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.SCHEDULED]: 'Scheduled',
  [MaintenanceStatus.IN_PROGRESS]: 'In Progress',
  [MaintenanceStatus.COMPLETED]: 'Completed',
  [MaintenanceStatus.OVERDUE]: 'Overdue',
  [MaintenanceStatus.CANCELLED]: 'Cancelled',
};

export const MAINTENANCE_STATUS_COLORS: Record<MaintenanceStatus, string> = {
  [MaintenanceStatus.SCHEDULED]: 'processing',
  [MaintenanceStatus.IN_PROGRESS]: 'blue',
  [MaintenanceStatus.COMPLETED]: 'success',
  [MaintenanceStatus.OVERDUE]: 'error',
  [MaintenanceStatus.CANCELLED]: 'default',
};
