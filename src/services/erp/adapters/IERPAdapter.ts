/**
 * IERPAdapter - Interface for all ERP system adapters
 * Issue #60: Phase 4-6 - ERP-Specific Adapters
 *
 * All ERP adapters (Impact, SAP, Oracle, etc.) must implement this interface
 * to ensure consistent behavior across different ERP systems.
 */

/**
 * Supplier/vendor data from ERP
 */
export interface ERPSupplier {
  vendorId: string;
  vendorCode: string;
  vendorName: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  contactEmail?: string;
  contactPhone?: string;
  paymentTerms?: string;
  currency?: string;
  approvedVendor: boolean;
  qualityRating?: number;
  onTimeDeliveryRate?: number;
  certifications?: string[];
  preferredCarrier?: string;
  leadTime?: number; // in days
  metadata?: any;
}

/**
 * Purchase order data from ERP
 */
export interface ERPPO {
  erpPoId: string;
  poNumber: string;
  poDate: Date;
  vendorId: string;
  vendorCode: string;
  status: 'DRAFT' | 'APPROVED' | 'SENT' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RECEIVED' | 'CLOSED';
  totalAmount: number;
  currency?: string;
  quantity?: number;
  requiredDate?: Date;
  shipToLocation?: string;
  accountCode?: string;
  costCenter?: string;
  description?: string;
  lines?: ERPPOLine[];
  metadata?: any;
}

/**
 * Purchase order line item
 */
export interface ERPPOLine {
  lineNumber: number;
  partNumber?: string;
  description: string;
  quantity: number;
  unitOfMeasure: string;
  unitPrice: number;
  extendedPrice: number;
  requiredDate?: Date;
  metadata?: any;
}

/**
 * Receipt data for posting to ERP
 */
export interface ERPReceipt {
  poId: string;
  poLineNumber?: number;
  receiptNumber?: string;
  quantityReceived: number;
  receiptDate: Date;
  receiptLocation?: string;
  lotNumber?: string;
  serialNumbers?: string[];
  acceptedQuantity?: number;
  rejectedQuantity?: number;
  inspectionStatus?: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  comments?: string;
  metadata?: any;
}

/**
 * Cost data for posting to ERP
 */
export interface ERPCost {
  workOrderId?: string;
  poId?: string;
  costType: 'OUTSOURCED_OPERATION' | 'MATERIAL' | 'LABOR' | 'FREIGHT' | 'OTHER';
  estimatedCost?: number;
  actualCost: number;
  costVariance?: number;
  invoiceNumber?: string;
  invoiceDate?: Date;
  accountCode?: string;
  costCenter?: string;
  description?: string;
  metadata?: any;
}

/**
 * Shipment data for ERP notification
 */
export interface ERPShipment {
  shipmentId?: string;
  poId: string;
  shipmentNumber: string;
  shipmentDate: Date;
  carrierName?: string;
  trackingNumber?: string;
  expectedDeliveryDate?: Date;
  shipmentStatus: 'DRAFT' | 'SHIPPED' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  quantity: number;
  comments?: string;
  metadata?: any;
}

/**
 * Inventory transaction for posting
 */
export interface ERPInventoryTransaction {
  transactionNumber?: string;
  transactionType: 'RECEIPT' | 'ISSUE' | 'TRANSFER' | 'ADJUSTMENT' | 'SCRAP' | 'CONSIGNMENT';
  materialId: string;
  partNumber?: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  warehouseId?: string;
  location?: string;
  transactionDate: Date;
  referenceNumber?: string;
  description?: string;
  metadata?: any;
}

/**
 * Base interface for all ERP adapters
 */
export interface IERPAdapter {
  /**
   * Get adapter name/type
   */
  getAdapterName(): string;

  /**
   * Initialize connection to ERP system
   */
  connect(config: any): Promise<void>;

  /**
   * Test connection to ERP system
   */
  testConnection(): Promise<{
    connected: boolean;
    message: string;
    error?: string;
  }>;

  /**
   * Disconnect from ERP system
   */
  disconnect(): Promise<void>;

  // ========== Master Data Sync ==========

  /**
   * Fetch suppliers from ERP
   */
  syncSuppliers(filters?: any): Promise<ERPSupplier[]>;

  /**
   * Fetch purchase orders from ERP
   */
  syncPurchaseOrders(filters?: any): Promise<ERPPO[]>;

  /**
   * Fetch work order status from ERP
   */
  syncWorkOrders(filters?: any): Promise<any[]>;

  // ========== Purchase Order Management ==========

  /**
   * Create purchase order in ERP
   * Returns the ERP-assigned PO number
   */
  createPurchaseOrder(po: ERPPO): Promise<string>;

  /**
   * Update purchase order in ERP
   */
  updatePurchaseOrder(erpPoId: string, updates: Partial<ERPPO>): Promise<void>;

  /**
   * Get purchase order from ERP
   */
  getPurchaseOrder(erpPoId: string): Promise<ERPPO | null>;

  /**
   * Cancel purchase order in ERP
   */
  cancelPurchaseOrder(erpPoId: string): Promise<void>;

  // ========== Receipt Posting ==========

  /**
   * Post receipt to ERP (for PO)
   */
  postReceipt(receipt: ERPReceipt): Promise<void>;

  /**
   * Get receipt status from ERP
   */
  getReceiptStatus(receiptId: string): Promise<any>;

  // ========== Cost Posting ==========

  /**
   * Post cost/invoice to ERP work order
   */
  postCost(cost: ERPCost): Promise<void>;

  /**
   * Get cost/invoice status from ERP
   */
  getCostStatus(costId: string): Promise<any>;

  // ========== Shipment Notification ==========

  /**
   * Notify ERP of shipment
   */
  notifyShipment(shipment: ERPShipment): Promise<void>;

  /**
   * Update shipment status in ERP
   */
  updateShipmentStatus(shipmentId: string, status: string): Promise<void>;

  // ========== Inventory Transactions ==========

  /**
   * Post inventory transaction to ERP
   */
  postInventoryTransaction(transaction: ERPInventoryTransaction): Promise<void>;

  /**
   * Get inventory balance from ERP
   */
  getInventoryBalance(materialId: string, warehouseId?: string): Promise<any>;

  // ========== Error Handling ==========

  /**
   * Retry failed transaction
   */
  retryTransaction(transactionId: string): Promise<boolean>;

  /**
   * Get error details for a transaction
   */
  getTransactionError(transactionId: string): Promise<any>;
}

export default IERPAdapter;
