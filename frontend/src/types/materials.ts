/**
 * Materials Management Types
 * Phase 3: Material Movement Tracking API Integration
 */

// ============================================
// ENUMS
// ============================================

export enum MaterialType {
  RAW_MATERIAL = 'RAW_MATERIAL',
  COMPONENT = 'COMPONENT',
  SUBASSEMBLY = 'SUBASSEMBLY',
  ASSEMBLY = 'ASSEMBLY',
  FINISHED_GOODS = 'FINISHED_GOODS',
  WIP = 'WIP',
  CONSUMABLE = 'CONSUMABLE',
  PACKAGING = 'PACKAGING',
  TOOLING = 'TOOLING',
  MAINTENANCE = 'MAINTENANCE',
}

export enum MaterialLotStatus {
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  IN_USE = 'IN_USE',
  DEPLETED = 'DEPLETED',
  QUARANTINED = 'QUARANTINED',
  EXPIRED = 'EXPIRED',
  REJECTED = 'REJECTED',
  RETURNED = 'RETURNED',
  SCRAPPED = 'SCRAPPED',
}

export enum MaterialLotState {
  RECEIVED = 'RECEIVED',
  INSPECTED = 'INSPECTED',
  APPROVED = 'APPROVED',
  ISSUED = 'ISSUED',
  IN_PROCESS = 'IN_PROCESS',
  CONSUMED = 'CONSUMED',
  RETURNED = 'RETURNED',
  DISPOSED = 'DISPOSED',
}

export enum MaterialTransactionType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  RETURN = 'RETURN',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  CONSUMPTION = 'CONSUMPTION',
  SCRAP = 'SCRAP',
  CYCLE_COUNT = 'CYCLE_COUNT',
}

// ============================================
// INTERFACES
// ============================================

export interface MaterialClass {
  id: string;
  classCode: string;
  className: string;
  description?: string;
  level: number;
  parentClassId?: string;
  requiresLotTracking: boolean;
  requiresSerialTracking: boolean;
  requiresExpirationDate: boolean;
  shelfLifeDays?: number;
  storageRequirements?: string;
  handlingInstructions?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  parentClass?: MaterialClass;
  childClasses?: MaterialClass[];
  materials?: MaterialDefinition[];
}

export interface MaterialDefinition {
  id: string;
  materialNumber: string;
  materialName: string;
  description?: string;
  materialClassId: string;
  baseUnitOfMeasure: string;
  alternateUnitOfMeasure?: string;
  conversionFactor?: number;
  materialType: MaterialType;
  materialGrade?: string;
  specification?: string;
  minimumStock?: number;
  reorderPoint?: number;
  reorderQuantity?: number;
  leadTimeDays?: number;
  requiresLotTracking: boolean;
  lotNumberFormat?: string;
  defaultShelfLifeDays?: number;
  standardCost?: number;
  currency?: string;
  isActive: boolean;
  isSerialized: boolean;
  createdAt: string;
  updatedAt: string;
  // Relations
  materialClass?: MaterialClass;
  lots?: MaterialLot[];
  properties?: MaterialProperty[];
}

export interface MaterialLot {
  id: string;
  lotNumber: string;
  materialId: string;
  supplierLotNumber?: string;
  purchaseOrderNumber?: string;
  heatNumber?: string;
  serialNumber?: string;
  originalQuantity: number;
  currentQuantity: number;
  unitOfMeasure: string;
  location?: string;
  warehouseId?: string;
  manufactureDate?: string;
  receivedDate: string;
  expirationDate?: string;
  shelfLifeDays?: number;
  firstUsedDate?: string;
  lastUsedDate?: string;
  status: MaterialLotStatus;
  state: MaterialLotState;
  isQuarantined: boolean;
  isExpired: boolean;
  quarantineReason?: string;
  releaseApprovedBy?: string;
  releaseApprovedAt?: string;
  holdReason?: string;
  disposalDate?: string;
  disposalReason?: string;
  certificateFileUrl?: string;
  mttrFileUrl?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
  // Relations
  material?: MaterialDefinition;
  transactions?: MaterialTransaction[];
}

export interface MaterialTransaction {
  id: string;
  transactionNumber: string;
  transactionType: MaterialTransactionType;
  materialId: string;
  lotId?: string;
  fromLotId?: string;
  toLotId?: string;
  quantity: number;
  unitOfMeasure: string;
  fromLocation?: string;
  toLocation?: string;
  workOrderId?: string;
  workOrderNumber?: string;
  operationId?: string;
  personnelId?: string;
  personnelName?: string;
  transactionDate: string;
  reason?: string;
  remarks?: string;
  documentReference?: string;
  createdBy: string;
  createdAt: string;
  // Relations
  material?: MaterialDefinition;
  lot?: MaterialLot;
}

export interface MaterialProperty {
  id: string;
  materialId: string;
  propertyName: string;
  propertyValue: string;
  propertyType: string;
  unitOfMeasure?: string;
  isRequired: boolean;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface MaterialStatistics {
  totalDefinitions: number;
  totalLots: number;
  totalActiveLots: number;
  totalQuantityOnHand: number;
  lowStockCount: number;
  expiringSoonCount: number;
  expiredCount: number;
  quarantinedCount: number;
  byMaterialType: Record<MaterialType, number>;
  byLotStatus: Record<MaterialLotStatus, number>;
}

// ============================================
// QUERY PARAMETERS
// ============================================

export interface MaterialQueryParams {
  materialClassId?: string;
  materialType?: MaterialType;
  includeRelations?: boolean;
  searchText?: string;
  isActive?: boolean;
  page?: number;
  pageSize?: number;
}

export interface MaterialLotQueryParams {
  materialId?: string;
  materialNumber?: string;
  status?: MaterialLotStatus;
  state?: MaterialLotState;
  location?: string;
  warehouseId?: string;
  isExpired?: boolean;
  isQuarantined?: boolean;
  expiringSoonDays?: number;
  includeRelations?: boolean;
  searchText?: string;
  page?: number;
  pageSize?: number;
}

export interface MaterialTransactionQueryParams {
  materialId?: string;
  lotId?: string;
  transactionType?: MaterialTransactionType;
  workOrderId?: string;
  personnelId?: string;
  startDate?: string;
  endDate?: string;
  includeRelations?: boolean;
  page?: number;
  pageSize?: number;
}

// ============================================
// UI MAPPING CONSTANTS
// ============================================

export const MATERIAL_TYPE_LABELS: Record<MaterialType, string> = {
  [MaterialType.RAW_MATERIAL]: 'Raw Material',
  [MaterialType.COMPONENT]: 'Component',
  [MaterialType.SUBASSEMBLY]: 'Subassembly',
  [MaterialType.ASSEMBLY]: 'Assembly',
  [MaterialType.FINISHED_GOODS]: 'Finished Goods',
  [MaterialType.WIP]: 'Work In Progress',
  [MaterialType.CONSUMABLE]: 'Consumable',
  [MaterialType.PACKAGING]: 'Packaging',
  [MaterialType.TOOLING]: 'Tooling',
  [MaterialType.MAINTENANCE]: 'Maintenance',
};

export const MATERIAL_TYPE_COLORS: Record<MaterialType, string> = {
  [MaterialType.RAW_MATERIAL]: 'blue',
  [MaterialType.COMPONENT]: 'cyan',
  [MaterialType.SUBASSEMBLY]: 'geekblue',
  [MaterialType.ASSEMBLY]: 'purple',
  [MaterialType.FINISHED_GOODS]: 'green',
  [MaterialType.WIP]: 'orange',
  [MaterialType.CONSUMABLE]: 'volcano',
  [MaterialType.PACKAGING]: 'magenta',
  [MaterialType.TOOLING]: 'gold',
  [MaterialType.MAINTENANCE]: 'lime',
};

export const LOT_STATUS_LABELS: Record<MaterialLotStatus, string> = {
  [MaterialLotStatus.AVAILABLE]: 'Available',
  [MaterialLotStatus.RESERVED]: 'Reserved',
  [MaterialLotStatus.IN_USE]: 'In Use',
  [MaterialLotStatus.DEPLETED]: 'Depleted',
  [MaterialLotStatus.QUARANTINED]: 'Quarantined',
  [MaterialLotStatus.EXPIRED]: 'Expired',
  [MaterialLotStatus.REJECTED]: 'Rejected',
  [MaterialLotStatus.RETURNED]: 'Returned',
  [MaterialLotStatus.SCRAPPED]: 'Scrapped',
};

export const LOT_STATUS_COLORS: Record<MaterialLotStatus, string> = {
  [MaterialLotStatus.AVAILABLE]: 'success',
  [MaterialLotStatus.RESERVED]: 'processing',
  [MaterialLotStatus.IN_USE]: 'warning',
  [MaterialLotStatus.DEPLETED]: 'default',
  [MaterialLotStatus.QUARANTINED]: 'error',
  [MaterialLotStatus.EXPIRED]: 'error',
  [MaterialLotStatus.REJECTED]: 'error',
  [MaterialLotStatus.RETURNED]: 'warning',
  [MaterialLotStatus.SCRAPPED]: 'default',
};

export const LOT_STATE_LABELS: Record<MaterialLotState, string> = {
  [MaterialLotState.RECEIVED]: 'Received',
  [MaterialLotState.INSPECTED]: 'Inspected',
  [MaterialLotState.APPROVED]: 'Approved',
  [MaterialLotState.ISSUED]: 'Issued',
  [MaterialLotState.IN_PROCESS]: 'In Process',
  [MaterialLotState.CONSUMED]: 'Consumed',
  [MaterialLotState.RETURNED]: 'Returned',
  [MaterialLotState.DISPOSED]: 'Disposed',
};

export const LOT_STATE_COLORS: Record<MaterialLotState, string> = {
  [MaterialLotState.RECEIVED]: 'cyan',
  [MaterialLotState.INSPECTED]: 'geekblue',
  [MaterialLotState.APPROVED]: 'green',
  [MaterialLotState.ISSUED]: 'blue',
  [MaterialLotState.IN_PROCESS]: 'processing',
  [MaterialLotState.CONSUMED]: 'default',
  [MaterialLotState.RETURNED]: 'warning',
  [MaterialLotState.DISPOSED]: 'default',
};

export const TRANSACTION_TYPE_LABELS: Record<MaterialTransactionType, string> = {
  [MaterialTransactionType.RECEIPT]: 'Receipt',
  [MaterialTransactionType.ISSUE]: 'Issue',
  [MaterialTransactionType.RETURN]: 'Return',
  [MaterialTransactionType.TRANSFER]: 'Transfer',
  [MaterialTransactionType.ADJUSTMENT]: 'Adjustment',
  [MaterialTransactionType.CONSUMPTION]: 'Consumption',
  [MaterialTransactionType.SCRAP]: 'Scrap',
  [MaterialTransactionType.CYCLE_COUNT]: 'Cycle Count',
};

export const TRANSACTION_TYPE_COLORS: Record<MaterialTransactionType, string> = {
  [MaterialTransactionType.RECEIPT]: 'green',
  [MaterialTransactionType.ISSUE]: 'blue',
  [MaterialTransactionType.RETURN]: 'orange',
  [MaterialTransactionType.TRANSFER]: 'cyan',
  [MaterialTransactionType.ADJUSTMENT]: 'purple',
  [MaterialTransactionType.CONSUMPTION]: 'geekblue',
  [MaterialTransactionType.SCRAP]: 'red',
  [MaterialTransactionType.CYCLE_COUNT]: 'gold',
};
