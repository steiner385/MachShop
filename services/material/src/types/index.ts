/**
 * Material Service Types
 */

export enum MaterialType {
  RAW_MATERIAL = 'RAW_MATERIAL',
  WIP = 'WIP',
  FINISHED_GOOD = 'FINISHED_GOOD',
  CONSUMABLE = 'CONSUMABLE',
  TOOLING = 'TOOLING'
}

export enum LotStatus {
  QUARANTINE = 'QUARANTINE',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED',
  CONSUMED = 'CONSUMED',
  REJECTED = 'REJECTED'
}

export enum TransactionType {
  RECEIPT = 'RECEIPT',
  ISSUE = 'ISSUE',
  TRANSFER = 'TRANSFER',
  ADJUSTMENT = 'ADJUSTMENT',
  SCRAP = 'SCRAP',
  RETURN = 'RETURN'
}

export interface Material {
  id: string;
  materialNumber: string;
  materialName: string;
  description?: string;
  materialType: MaterialType;
  unitOfMeasure: string;
  standardCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialLot {
  id: string;
  lotNumber: string;
  materialId: string;
  quantity: number;
  status: LotStatus;
  expirationDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaterialTransaction {
  id: string;
  transactionNumber: string;
  transactionType: TransactionType;
  materialId: string;
  lotNumber?: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  workOrderId?: string;
  createdAt: Date;
}

export interface CreateMaterialRequest {
  materialNumber: string;
  materialName: string;
  description?: string;
  materialType: MaterialType;
  unitOfMeasure: string;
  standardCost?: number;
}

export interface CreateLotRequest {
  lotNumber: string;
  materialId: string;
  quantity: number;
  expirationDate?: Date;
}

export interface CreateTransactionRequest {
  transactionType: TransactionType;
  materialId: string;
  lotNumber?: string;
  quantity: number;
  fromLocation?: string;
  toLocation?: string;
  workOrderId?: string;
}
