/**
 * OracleERPAdapter - Integration with Oracle E-Business Suite and Oracle Cloud ERP
 * Issue #60: Phase 6 - Oracle ERP Adapter
 *
 * Supports both Oracle EBS (legacy) and Oracle Cloud ERP (modern)
 * Uses REST APIs and interface tables
 */

import { logger } from '../../../utils/logger';
import {
  IERPAdapter,
  ERPSupplier,
  ERPPO,
  ERPReceipt,
  ERPCost,
  ERPShipment,
  ERPInventoryTransaction,
} from './IERPAdapter';

/**
 * Oracle-specific configuration
 */
export interface OracleConfig {
  version: 'EBS' | 'CLOUD';
  apiEndpoint: string; // REST API endpoint
  username: string;
  password: string;
  orgId?: string; // Organization ID (EBS)
  operatingUnit?: string; // Operating Unit (EBS)
  cloudInstance?: string; // Cloud instance name (Cloud)
  inventoryOrganization?: string; // Inventory organization
  timeout?: number;
}

/**
 * Oracle ERP Adapter implementation
 */
export class OracleERPAdapter implements IERPAdapter {
  private config: OracleConfig | null = null;
  private authToken: string | null = null;

  getAdapterName(): string {
    return 'Oracle';
  }

  /**
   * Connect to Oracle system
   */
  async connect(config: OracleConfig): Promise<void> {
    try {
      this.config = config;

      if (!config.apiEndpoint || !config.username || !config.password) {
        throw new Error('Missing required Oracle configuration: apiEndpoint, username, password');
      }

      // Authenticate with Oracle REST API
      await this.authenticate();

      logger.info('Connected to Oracle ERP system', {
        version: config.version,
        endpoint: config.apiEndpoint,
      });
    } catch (error) {
      logger.error('Failed to connect to Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Test connection to Oracle
   */
  async testConnection(): Promise<{
    connected: boolean;
    message: string;
    error?: string;
  }> {
    try {
      if (!this.config) {
        return {
          connected: false,
          message: 'Not configured',
          error: 'NOTCONFIGURED',
        };
      }

      // Make a simple API call to test connectivity
      const response = await this.restCall('GET', '/suppliers?limit=1', {});

      return {
        connected: true,
        message: `Connected to Oracle ${this.config.version}`,
      };
    } catch (error) {
      return {
        connected: false,
        message: 'Connection test failed',
        error: error instanceof Error ? error.message : 'UNKNOWN',
      };
    }
  }

  /**
   * Disconnect from Oracle
   */
  async disconnect(): Promise<void> {
    this.authToken = null;
    this.config = null;
    logger.info('Disconnected from Oracle ERP');
  }

  /**
   * Fetch suppliers from Oracle
   */
  async syncSuppliers(filters?: any): Promise<ERPSupplier[]> {
    try {
      const path = `/suppliers?limit=${filters?.limit || 100}&offset=${filters?.offset || 0}`;
      const response = await this.restCall('GET', path, {});

      return response.items.map((supplier: any) => ({
        vendorId: supplier.vendor_id,
        vendorCode: supplier.vendor_number,
        vendorName: supplier.vendor_name,
        address: supplier.address_line_1,
        city: supplier.city,
        state: supplier.state,
        country: supplier.country,
        postalCode: supplier.postal_code,
        contactEmail: supplier.email_address,
        contactPhone: supplier.phone_number,
        paymentTerms: supplier.payment_terms,
        currency: supplier.currency_code,
        approvedVendor: supplier.enabled_flag === 'Y',
        qualityRating: parseFloat(supplier.quality_rating || '0'),
        onTimeDeliveryRate: parseFloat(supplier.on_time_rate || '0'),
        certifications: supplier.certifications?.split(',') || [],
      }));
    } catch (error) {
      logger.warn('Failed to fetch suppliers from Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch purchase orders from Oracle
   */
  async syncPurchaseOrders(filters?: any): Promise<ERPPO[]> {
    try {
      const path =
        `/purchase_orders?limit=${filters?.limit || 100}&offset=${filters?.offset || 0}` +
        (filters?.status ? `&status=${filters.status}` : '');

      const response = await this.restCall('GET', path, {});

      return response.items.map((po: any) => ({
        erpPoId: po.po_header_id,
        poNumber: po.segment1, // PO number in Oracle
        poDate: new Date(po.creation_date),
        vendorId: po.vendor_id,
        vendorCode: po.vendor_number,
        status: this.mapOraclePOStatus(po.status),
        totalAmount: parseFloat(po.amount),
        currency: po.currency_code,
        quantity: parseInt(po.total_quantity || '0'),
        requiredDate: po.promised_date ? new Date(po.promised_date) : undefined,
        shipToLocation: po.ship_to_location,
        accountCode: po.code_combination_id,
        costCenter: po.cost_center,
        description: po.comments,
        lines: po.line_items?.map((line: any) => ({
          lineNumber: parseInt(line.line_num),
          partNumber: line.item_id,
          description: line.item_description,
          quantity: parseInt(line.quantity),
          unitOfMeasure: line.unit_meas_lookup_code,
          unitPrice: parseFloat(line.unit_price),
          extendedPrice: parseFloat(line.amount),
          requiredDate: line.promised_date ? new Date(line.promised_date) : undefined,
        })),
      }));
    } catch (error) {
      logger.warn('Failed to fetch purchase orders from Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch work orders from Oracle
   */
  async syncWorkOrders(filters?: any): Promise<any[]> {
    try {
      const path = `/work_orders?limit=${filters?.limit || 100}&offset=${filters?.offset || 0}`;
      const response = await this.restCall('GET', path, {});

      return response.items.map((wo: any) => ({
        id: wo.wip_entity_id,
        workOrderNumber: wo.wip_entity_name,
        status: wo.status_type,
        operationId: wo.operation_seq_num,
        quantity: parseInt(wo.start_quantity),
        createdDate: new Date(wo.creation_date),
        requiredDate: wo.due_date ? new Date(wo.due_date) : undefined,
      }));
    } catch (error) {
      logger.warn('Failed to fetch work orders from Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Create purchase order in Oracle
   */
  async createPurchaseOrder(po: ERPPO): Promise<string> {
    try {
      const payload = {
        vendor_id: po.vendorId,
        vendor_number: po.vendorCode,
        po_date: po.poDate.toISOString().split('T')[0],
        promised_date: po.requiredDate?.toISOString().split('T')[0],
        currency_code: po.currency || 'USD',
        amount: po.totalAmount,
        code_combination_id: po.accountCode,
        cost_center: po.costCenter,
        comments: po.description,
        line_items: po.lines?.map((line) => ({
          line_num: line.lineNumber,
          item_id: line.partNumber,
          item_description: line.description,
          quantity: line.quantity,
          unit_meas_lookup_code: line.unitOfMeasure,
          unit_price: line.unitPrice,
          amount: line.extendedPrice,
          promised_date: line.requiredDate?.toISOString().split('T')[0],
        })),
      };

      const response = await this.restCall('POST', '/purchase_orders', payload);

      logger.info('Created purchase order in Oracle', {
        poNumber: response.segment1,
        poHeaderId: response.po_header_id,
      });

      return response.segment1;
    } catch (error) {
      logger.error('Failed to create purchase order in Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update purchase order in Oracle
   */
  async updatePurchaseOrder(erpPoId: string, updates: Partial<ERPPO>): Promise<void> {
    try {
      const payload: any = {};

      if (updates.totalAmount) payload.amount = updates.totalAmount;
      if (updates.requiredDate) payload.promised_date = updates.requiredDate.toISOString().split('T')[0];
      if (updates.description) payload.comments = updates.description;
      if (updates.status) payload.status = this.mapStatusToOracle(updates.status);

      await this.restCall('PATCH', `/purchase_orders/${erpPoId}`, payload);

      logger.info('Updated purchase order in Oracle', {
        poId: erpPoId,
      });
    } catch (error) {
      logger.error('Failed to update purchase order in Oracle', {
        poId: erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get purchase order from Oracle
   */
  async getPurchaseOrder(erpPoId: string): Promise<ERPPO | null> {
    try {
      const response = await this.restCall('GET', `/purchase_orders/${erpPoId}`, {});
      const po = response;

      return {
        erpPoId: po.po_header_id,
        poNumber: po.segment1,
        poDate: new Date(po.creation_date),
        vendorId: po.vendor_id,
        vendorCode: po.vendor_number,
        status: this.mapOraclePOStatus(po.status),
        totalAmount: parseFloat(po.amount),
        currency: po.currency_code,
        quantity: parseInt(po.total_quantity || '0'),
        requiredDate: po.promised_date ? new Date(po.promised_date) : undefined,
        shipToLocation: po.ship_to_location,
        accountCode: po.code_combination_id,
        costCenter: po.cost_center,
        description: po.comments,
      };
    } catch (error) {
      logger.warn('Failed to get purchase order from Oracle', {
        poId: erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cancel purchase order in Oracle
   */
  async cancelPurchaseOrder(erpPoId: string): Promise<void> {
    try {
      await this.restCall('PATCH', `/purchase_orders/${erpPoId}`, {
        status: 'CANCELLED',
      });

      logger.info('Cancelled purchase order in Oracle', {
        poId: erpPoId,
      });
    } catch (error) {
      logger.error('Failed to cancel purchase order in Oracle', {
        poId: erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Post receipt in Oracle (RCV_TRANSACTIONS interface table)
   */
  async postReceipt(receipt: ERPReceipt): Promise<void> {
    try {
      const payload = {
        po_header_id: receipt.poId,
        po_line_location_id: receipt.poLineNumber,
        receipt_number: receipt.receiptNumber,
        transaction_type: 'RECEIVE', // Receipt transaction type
        quantity_received: receipt.quantityReceived,
        unit_of_measure: 'EA',
        receipt_date: receipt.receiptDate.toISOString().split('T')[0],
        location_id: receipt.receiptLocation,
        lot_number: receipt.lotNumber,
        serial_number: receipt.serialNumbers?.join(','),
        inspection_status_code: receipt.inspectionStatus || 'ACCEPTED',
        comments: receipt.comments,
      };

      await this.restCall('POST', '/receipts', payload);

      logger.info('Posted receipt in Oracle', {
        poId: receipt.poId,
        quantity: receipt.quantityReceived,
      });
    } catch (error) {
      logger.error('Failed to post receipt in Oracle', {
        poId: receipt.poId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get receipt status from Oracle
   */
  async getReceiptStatus(receiptId: string): Promise<any> {
    try {
      const response = await this.restCall('GET', `/receipts/${receiptId}`, {});
      return response;
    } catch (error) {
      logger.warn('Failed to get receipt status from Oracle', {
        receiptId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Post cost in Oracle (AP_INVOICES_INTERFACE table)
   */
  async postCost(cost: ERPCost): Promise<void> {
    try {
      const payload = {
        vendor_id: cost.invoiceNumber?.split('-')[0], // Extract from invoice number if present
        invoice_number: cost.invoiceNumber,
        invoice_date: cost.invoiceDate?.toISOString().split('T')[0],
        invoice_amount: cost.actualCost,
        currency_code: 'USD',
        po_number: cost.poId,
        cost_center: cost.costCenter,
        description: cost.description,
        invoice_type_lookup_code: 'STANDARD',
      };

      await this.restCall('POST', '/invoices', payload);

      logger.info('Posted cost in Oracle', {
        poId: cost.poId,
        amount: cost.actualCost,
      });
    } catch (error) {
      logger.error('Failed to post cost in Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cost status from Oracle
   */
  async getCostStatus(costId: string): Promise<any> {
    try {
      const response = await this.restCall('GET', `/invoices/${costId}`, {});
      return response;
    } catch (error) {
      logger.warn('Failed to get cost status from Oracle', {
        costId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Notify Oracle of shipment
   */
  async notifyShipment(shipment: ERPShipment): Promise<void> {
    try {
      const payload = {
        delivery_number: shipment.shipmentNumber,
        po_header_id: shipment.poId,
        shipment_date: shipment.shipmentDate.toISOString().split('T')[0],
        carrier_name: shipment.carrierName,
        tracking_number: shipment.trackingNumber,
        expected_delivery_date: shipment.expectedDeliveryDate?.toISOString().split('T')[0],
        delivery_status: this.mapStatusToOracle(shipment.shipmentStatus),
        quantity: shipment.quantity,
        comments: shipment.comments,
      };

      await this.restCall('POST', '/shipments', payload);

      logger.info('Notified Oracle of shipment', {
        shipmentNumber: shipment.shipmentNumber,
        poId: shipment.poId,
      });
    } catch (error) {
      logger.error('Failed to notify Oracle of shipment', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update shipment status in Oracle
   */
  async updateShipmentStatus(shipmentId: string, status: string): Promise<void> {
    try {
      await this.restCall('PATCH', `/shipments/${shipmentId}`, {
        delivery_status: this.mapStatusToOracle(status),
      });

      logger.info('Updated shipment status in Oracle', {
        shipmentId,
        status,
      });
    } catch (error) {
      logger.error('Failed to update shipment status in Oracle', {
        shipmentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Post inventory transaction in Oracle (MTL_TRANSACTIONS_INTERFACE table)
   */
  async postInventoryTransaction(transaction: ERPInventoryTransaction): Promise<void> {
    try {
      const payload = {
        inventory_item_id: transaction.materialId,
        item_number: transaction.partNumber,
        organization_id: this.config?.inventoryOrganization,
        transaction_type_id: this.mapTransactionTypeToOracle(transaction.transactionType),
        transaction_quantity: transaction.quantity,
        transaction_uom: 'EA',
        transaction_date: transaction.transactionDate.toISOString().split('T')[0],
        locator_id: transaction.location,
        reference_account: transaction.referenceNumber,
        comments: transaction.description,
      };

      await this.restCall('POST', '/inventory_transactions', payload);

      logger.info('Posted inventory transaction in Oracle', {
        materialId: transaction.materialId,
        quantity: transaction.quantity,
      });
    } catch (error) {
      logger.error('Failed to post inventory transaction in Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get inventory balance from Oracle
   */
  async getInventoryBalance(materialId: string, warehouseId?: string): Promise<any> {
    try {
      const path = `/inventory_balances?item_id=${materialId}&org_id=${this.config?.inventoryOrganization}`;
      const response = await this.restCall('GET', path, {});
      return response.items?.[0] || null;
    } catch (error) {
      logger.warn('Failed to get inventory balance from Oracle', {
        materialId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Retry failed transaction in Oracle
   */
  async retryTransaction(transactionId: string): Promise<boolean> {
    try {
      const response = await this.restCall('POST', `/transactions/${transactionId}/retry`, {});
      return response.success === true;
    } catch (error) {
      logger.error('Failed to retry transaction in Oracle', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get transaction error from Oracle
   */
  async getTransactionError(transactionId: string): Promise<any> {
    try {
      const response = await this.restCall('GET', `/transactions/${transactionId}/errors`, {});
      return response;
    } catch (error) {
      logger.warn('Failed to get transaction error from Oracle', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Authenticate with Oracle
   */
  private async authenticate(): Promise<void> {
    try {
      // TODO: Implement actual Oracle authentication in Phase 6+
      // This would typically use OAuth2 or basic auth with REST API
      this.authToken = `oracle_auth_${Date.now()}`;

      logger.debug('Authenticated with Oracle', {
        version: this.config?.version,
      });
    } catch (error) {
      logger.error('Failed to authenticate with Oracle', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Make REST call to Oracle
   */
  private async restCall(method: string, path: string, data: any): Promise<any> {
    logger.debug('Oracle REST call', {
      method,
      path,
    });

    // TODO: Implement actual HTTP requests to Oracle REST API
    // For Phase 6, return mock responses
    return {
      items: [],
      ...data,
      po_header_id: `ORA-${Date.now()}`,
      segment1: `PO${Date.now()}`,
    };
  }

  /**
   * Map Oracle PO status to standard status
   */
  private mapOraclePOStatus(
    oracleStatus: string
  ): 'DRAFT' | 'APPROVED' | 'SENT' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RECEIVED' | 'CLOSED' {
    const statusMap: Record<string, any> = {
      PENDING_APPROVAL: 'DRAFT',
      APPROVED: 'APPROVED',
      SENT: 'SENT',
      CONFIRMED: 'ACKNOWLEDGED',
      OPEN: 'IN_PROGRESS',
      CLOSED_FOR_RECEIVING: 'RECEIVED',
      FINALLY_CLOSED: 'CLOSED',
    };
    return statusMap[oracleStatus] || 'DRAFT';
  }

  /**
   * Map standard status to Oracle status
   */
  private mapStatusToOracle(status: string): string {
    const statusMap: Record<string, string> = {
      DRAFT: 'PENDING_APPROVAL',
      APPROVED: 'APPROVED',
      SENT: 'SENT',
      ACKNOWLEDGED: 'CONFIRMED',
      IN_PROGRESS: 'OPEN',
      RECEIVED: 'CLOSED_FOR_RECEIVING',
      CLOSED: 'FINALLY_CLOSED',
      SHIPPED: 'CONFIRMED',
      IN_TRANSIT: 'OPEN',
      DELIVERED: 'CLOSED_FOR_RECEIVING',
    };
    return statusMap[status] || 'PENDING_APPROVAL';
  }

  /**
   * Map transaction type to Oracle transaction type ID
   */
  private mapTransactionTypeToOracle(transactionType: string): number {
    const typeMap: Record<string, number> = {
      RECEIPT: 18, // Receive
      ISSUE: 8, // Subinventory transfer
      TRANSFER: 3, // Subinventory transfer
      ADJUSTMENT: 1, // Adjustment
      SCRAP: 17, // Scrap
      CONSIGNMENT: 33, // Consignment receipt
    };
    return typeMap[transactionType] || 18;
  }
}

export default OracleERPAdapter;
