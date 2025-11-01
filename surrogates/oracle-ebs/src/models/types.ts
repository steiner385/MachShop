/**
 * Oracle EBS Surrogate - Type Definitions
 * Defines data models for Work Orders, Inventory, and Purchase Orders
 */

export enum WorkOrderStatus {
  RELEASED = 'RELEASED',
  IN_PROCESS = 'IN_PROCESS',
  COMPLETED = 'COMPLETED',
  CLOSED = 'CLOSED'
}

export enum TransactionType {
  ISSUE = 'ISSUE',
  RECEIVE = 'RECEIVE',
  ADJUST = 'ADJUST'
}

export enum POReceiptStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  REJECTED = 'REJECTED'
}

export interface WorkOrder {
  id: string;
  orderNumber: string;
  description: string;
  status: WorkOrderStatus;
  quantity: number;
  startDate: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  equipmentId?: string;
  costCenter?: string;
  bom?: BOMLine[];
}

export interface BOMLine {
  lineNumber: number;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
}

export interface InventoryItem {
  id: string;
  partNumber: string;
  description: string;
  onHandQuantity: number;
  allocatedQuantity: number;
  availableQuantity: number;
  unit: string;
  warehouseLocation: string;
  lastTransactionDate: string;
  lotNumber?: string;
  expiryDate?: string;
}

export interface InventoryTransaction {
  id: string;
  partNumber: string;
  transactionType: TransactionType;
  quantity: number;
  unit: string;
  workOrderId?: string;
  referenceNumber: string;
  notes: string;
  transactionDate: string;
  createdAt: string;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  vendor: string;
  description: string;
  poDate: string;
  dueDate: string;
  totalAmount: number;
  currency: string;
  status: string;
  lines: POLine[];
  createdAt: string;
  updatedAt: string;
}

export interface POLine {
  lineNumber: number;
  partNumber: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
}

export interface POReceipt {
  id: string;
  poNumber: string;
  receiptNumber: string;
  receiptDate: string;
  status: POReceiptStatus;
  lines: POReceiptLine[];
  createdAt: string;
  updatedAt: string;
}

export interface POReceiptLine {
  lineNumber: number;
  partNumber: string;
  quantityReceived: number;
  quantityRejected: number;
  unit: string;
  notes?: string;
}

export interface Equipment {
  id: string;
  equipmentId: string;
  description: string;
  type: string;
  location: string;
  status: string;
  make?: string;
  model?: string;
  serialNumber?: string;
  costCenter?: string;
}

export interface Gauge {
  id: string;
  gaugeId: string;
  description: string;
  type: string;
  location: string;
  accuracy: string;
  resolution: string;
  calibrationDueDate: string;
  calibrationStatus: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  errorCode: string;
  timestamp: string;
}
