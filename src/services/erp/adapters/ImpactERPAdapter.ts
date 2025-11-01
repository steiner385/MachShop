/**
 * ImpactERPAdapter - Integration with Impact ERP/MES system
 * Issue #60: Phase 4 - Impact ERP Adapter
 *
 * Impact is a comprehensive MES/ERP solution common in aerospace/defense
 * manufacturing. This adapter handles API integration and transaction posting.
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
 * Impact-specific configuration
 */
export interface ImpactConfig {
  apiEndpoint: string; // e.g., https://impact-erp.company.com/api
  apiVersion?: string; // e.g., v1, v2
  apiUsername: string;
  apiPassword: string;
  company: string; // Impact company code
  warehouse?: string; // Default warehouse for transactions
  businessUnit?: string; // Business unit code
  division?: string; // Division code
  facility?: string; // Facility/plant code
  timeout?: number; // Request timeout in ms
}

/**
 * Impact ERP Adapter implementation
 */
export class ImpactERPAdapter implements IERPAdapter {
  private config: ImpactConfig | null = null;
  private authToken: string | null = null;
  private apiClient: any = null;

  getAdapterName(): string {
    return 'Impact';
  }

  /**
   * Connect to Impact ERP system
   */
  async connect(config: ImpactConfig): Promise<void> {
    try {
      this.config = config;

      // Validate required fields
      if (!config.apiEndpoint || !config.apiUsername || !config.apiPassword) {
        throw new Error('Missing required Impact configuration: apiEndpoint, apiUsername, apiPassword');
      }

      // Authenticate with Impact API
      await this.authenticate();

      logger.info('Connected to Impact ERP system', {
        endpoint: config.apiEndpoint,
        company: config.company,
      });
    } catch (error) {
      logger.error('Failed to connect to Impact ERP', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Test connection to Impact system
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
      const response = await this.apiCall('GET', '/health', {});

      return {
        connected: true,
        message: `Connected to Impact ERP (${this.config.company})`,
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
   * Disconnect from Impact system
   */
  async disconnect(): Promise<void> {
    this.authToken = null;
    this.config = null;
    logger.info('Disconnected from Impact ERP');
  }

  /**
   * Fetch suppliers from Impact
   */
  async syncSuppliers(filters?: any): Promise<ERPSupplier[]> {
    try {
      const response = await this.apiCall('GET', '/suppliers', {
        params: {
          company: this.config?.company,
          limit: filters?.limit || 100,
          offset: filters?.offset || 0,
        },
      });

      return response.data.map((supplier: any) => ({
        vendorId: supplier.id,
        vendorCode: supplier.code,
        vendorName: supplier.name,
        address: supplier.address1,
        city: supplier.city,
        state: supplier.state,
        country: supplier.country,
        postalCode: supplier.zip,
        contactEmail: supplier.email,
        contactPhone: supplier.phone,
        paymentTerms: supplier.payment_terms,
        currency: supplier.currency,
        approvedVendor: supplier.approved_flag === 'Y',
        qualityRating: supplier.quality_rating,
        onTimeDeliveryRate: supplier.on_time_rate,
        certifications: supplier.certifications || [],
        preferredCarrier: supplier.preferred_carrier,
        leadTime: supplier.lead_time_days,
      }));
    } catch (error) {
      logger.warn('Failed to fetch suppliers from Impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch purchase orders from Impact
   */
  async syncPurchaseOrders(filters?: any): Promise<ERPPO[]> {
    try {
      const response = await this.apiCall('GET', '/purchase-orders', {
        params: {
          company: this.config?.company,
          status: filters?.status || 'OPEN',
          limit: filters?.limit || 100,
          offset: filters?.offset || 0,
        },
      });

      return response.data.map((po: any) => ({
        erpPoId: po.id,
        poNumber: po.po_number,
        poDate: new Date(po.po_date),
        vendorId: po.vendor_id,
        vendorCode: po.vendor_code,
        status: po.status as any,
        totalAmount: parseFloat(po.total_amount),
        currency: po.currency,
        quantity: parseInt(po.quantity),
        requiredDate: po.required_date ? new Date(po.required_date) : undefined,
        shipToLocation: po.ship_to_location,
        accountCode: po.account_code,
        costCenter: po.cost_center,
        description: po.description,
        lines: po.line_items?.map((line: any) => ({
          lineNumber: line.line_number,
          partNumber: line.part_number,
          description: line.description,
          quantity: parseInt(line.quantity),
          unitOfMeasure: line.uom,
          unitPrice: parseFloat(line.unit_price),
          extendedPrice: parseFloat(line.extended_price),
          requiredDate: line.required_date ? new Date(line.required_date) : undefined,
        })),
      }));
    } catch (error) {
      logger.warn('Failed to fetch purchase orders from Impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch work orders from Impact
   */
  async syncWorkOrders(filters?: any): Promise<any[]> {
    try {
      const response = await this.apiCall('GET', '/work-orders', {
        params: {
          company: this.config?.company,
          facility: this.config?.facility,
          limit: filters?.limit || 100,
          offset: filters?.offset || 0,
        },
      });

      return response.data.map((wo: any) => ({
        id: wo.id,
        workOrderNumber: wo.wo_number,
        status: wo.status,
        operationId: wo.operation_id,
        quantity: wo.quantity,
        createdDate: new Date(wo.created_date),
        requiredDate: wo.required_date ? new Date(wo.required_date) : undefined,
      }));
    } catch (error) {
      logger.warn('Failed to fetch work orders from Impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Create purchase order in Impact
   */
  async createPurchaseOrder(po: ERPPO): Promise<string> {
    try {
      const payload = {
        company: this.config?.company,
        vendor_id: po.vendorId,
        vendor_code: po.vendorCode,
        po_date: po.poDate.toISOString().split('T')[0],
        required_date: po.requiredDate?.toISOString().split('T')[0],
        currency: po.currency || 'USD',
        total_amount: po.totalAmount,
        account_code: po.accountCode,
        cost_center: po.costCenter,
        description: po.description,
        line_items: po.lines?.map((line) => ({
          line_number: line.lineNumber,
          part_number: line.partNumber,
          description: line.description,
          quantity: line.quantity,
          uom: line.unitOfMeasure,
          unit_price: line.unitPrice,
          extended_price: line.extendedPrice,
          required_date: line.requiredDate?.toISOString().split('T')[0],
        })),
      };

      const response = await this.apiCall('POST', '/purchase-orders', payload);

      logger.info('Created purchase order in Impact', {
        erpPoId: response.data.id,
        poNumber: response.data.po_number,
      });

      return response.data.po_number;
    } catch (error) {
      logger.error('Failed to create purchase order in Impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update purchase order in Impact
   */
  async updatePurchaseOrder(erpPoId: string, updates: Partial<ERPPO>): Promise<void> {
    try {
      const payload: any = {};

      if (updates.status) payload.status = updates.status;
      if (updates.totalAmount) payload.total_amount = updates.totalAmount;
      if (updates.requiredDate) payload.required_date = updates.requiredDate.toISOString().split('T')[0];
      if (updates.description) payload.description = updates.description;

      await this.apiCall('PATCH', `/purchase-orders/${erpPoId}`, payload);

      logger.info('Updated purchase order in Impact', {
        erpPoId,
        updates: Object.keys(payload),
      });
    } catch (error) {
      logger.error('Failed to update purchase order in Impact', {
        erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get purchase order from Impact
   */
  async getPurchaseOrder(erpPoId: string): Promise<ERPPO | null> {
    try {
      const response = await this.apiCall('GET', `/purchase-orders/${erpPoId}`, {});
      const po = response.data;

      return {
        erpPoId: po.id,
        poNumber: po.po_number,
        poDate: new Date(po.po_date),
        vendorId: po.vendor_id,
        vendorCode: po.vendor_code,
        status: po.status,
        totalAmount: parseFloat(po.total_amount),
        currency: po.currency,
        quantity: parseInt(po.quantity),
        requiredDate: po.required_date ? new Date(po.required_date) : undefined,
        shipToLocation: po.ship_to_location,
        accountCode: po.account_code,
        costCenter: po.cost_center,
        description: po.description,
      };
    } catch (error) {
      logger.warn('Failed to get purchase order from Impact', {
        erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cancel purchase order in Impact
   */
  async cancelPurchaseOrder(erpPoId: string): Promise<void> {
    try {
      await this.apiCall('PATCH', `/purchase-orders/${erpPoId}`, {
        status: 'CANCELLED',
      });

      logger.info('Cancelled purchase order in Impact', {
        erpPoId,
      });
    } catch (error) {
      logger.error('Failed to cancel purchase order in Impact', {
        erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Post receipt to Impact
   */
  async postReceipt(receipt: ERPReceipt): Promise<void> {
    try {
      const payload = {
        company: this.config?.company,
        po_id: receipt.poId,
        po_line_number: receipt.poLineNumber,
        quantity_received: receipt.quantityReceived,
        receipt_date: receipt.receiptDate.toISOString().split('T')[0],
        receipt_location: receipt.receiptLocation || this.config?.warehouse,
        lot_number: receipt.lotNumber,
        serial_numbers: receipt.serialNumbers,
        accepted_quantity: receipt.acceptedQuantity || receipt.quantityReceived,
        rejected_quantity: receipt.rejectedQuantity || 0,
        inspection_status: receipt.inspectionStatus || 'ACCEPTED',
        comments: receipt.comments,
      };

      await this.apiCall('POST', '/receipts', payload);

      logger.info('Posted receipt to Impact', {
        poId: receipt.poId,
        quantity: receipt.quantityReceived,
      });
    } catch (error) {
      logger.error('Failed to post receipt to Impact', {
        poId: receipt.poId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get receipt status from Impact
   */
  async getReceiptStatus(receiptId: string): Promise<any> {
    try {
      const response = await this.apiCall('GET', `/receipts/${receiptId}`, {});
      return response.data;
    } catch (error) {
      logger.warn('Failed to get receipt status from Impact', {
        receiptId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Post cost to Impact
   */
  async postCost(cost: ERPCost): Promise<void> {
    try {
      const payload = {
        company: this.config?.company,
        work_order_id: cost.workOrderId,
        po_id: cost.poId,
        cost_type: cost.costType,
        estimated_cost: cost.estimatedCost,
        actual_cost: cost.actualCost,
        cost_variance: cost.costVariance,
        invoice_number: cost.invoiceNumber,
        invoice_date: cost.invoiceDate?.toISOString().split('T')[0],
        account_code: cost.accountCode,
        cost_center: cost.costCenter,
        description: cost.description,
      };

      await this.apiCall('POST', '/costs', payload);

      logger.info('Posted cost to Impact', {
        workOrderId: cost.workOrderId,
        actualCost: cost.actualCost,
      });
    } catch (error) {
      logger.error('Failed to post cost to Impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cost status from Impact
   */
  async getCostStatus(costId: string): Promise<any> {
    try {
      const response = await this.apiCall('GET', `/costs/${costId}`, {});
      return response.data;
    } catch (error) {
      logger.warn('Failed to get cost status from Impact', {
        costId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Notify Impact of shipment
   */
  async notifyShipment(shipment: ERPShipment): Promise<void> {
    try {
      const payload = {
        company: this.config?.company,
        po_id: shipment.poId,
        shipment_number: shipment.shipmentNumber,
        shipment_date: shipment.shipmentDate.toISOString().split('T')[0],
        carrier_name: shipment.carrierName,
        tracking_number: shipment.trackingNumber,
        expected_delivery_date: shipment.expectedDeliveryDate?.toISOString().split('T')[0],
        quantity: shipment.quantity,
        status: shipment.shipmentStatus,
        comments: shipment.comments,
      };

      await this.apiCall('POST', '/shipments', payload);

      logger.info('Notified Impact of shipment', {
        shipmentNumber: shipment.shipmentNumber,
        poId: shipment.poId,
      });
    } catch (error) {
      logger.error('Failed to notify Impact of shipment', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update shipment status in Impact
   */
  async updateShipmentStatus(shipmentId: string, status: string): Promise<void> {
    try {
      await this.apiCall('PATCH', `/shipments/${shipmentId}`, {
        status,
      });

      logger.info('Updated shipment status in Impact', {
        shipmentId,
        status,
      });
    } catch (error) {
      logger.error('Failed to update shipment status in Impact', {
        shipmentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Post inventory transaction to Impact
   */
  async postInventoryTransaction(transaction: ERPInventoryTransaction): Promise<void> {
    try {
      const payload = {
        company: this.config?.company,
        transaction_type: transaction.transactionType,
        material_id: transaction.materialId,
        part_number: transaction.partNumber,
        quantity: transaction.quantity,
        unit_cost: transaction.unitCost,
        total_cost: transaction.totalCost,
        warehouse_id: transaction.warehouseId || this.config?.warehouse,
        location: transaction.location,
        transaction_date: transaction.transactionDate.toISOString().split('T')[0],
        reference_number: transaction.referenceNumber,
        description: transaction.description,
      };

      await this.apiCall('POST', '/inventory-transactions', payload);

      logger.info('Posted inventory transaction to Impact', {
        transactionType: transaction.transactionType,
        materialId: transaction.materialId,
        quantity: transaction.quantity,
      });
    } catch (error) {
      logger.error('Failed to post inventory transaction to Impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get inventory balance from Impact
   */
  async getInventoryBalance(materialId: string, warehouseId?: string): Promise<any> {
    try {
      const response = await this.apiCall('GET', `/inventory-balance/${materialId}`, {
        params: {
          warehouse_id: warehouseId || this.config?.warehouse,
        },
      });
      return response.data;
    } catch (error) {
      logger.warn('Failed to get inventory balance from Impact', {
        materialId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Retry failed transaction in Impact
   */
  async retryTransaction(transactionId: string): Promise<boolean> {
    try {
      const response = await this.apiCall('POST', `/transactions/${transactionId}/retry`, {});
      return response.data.success === true;
    } catch (error) {
      logger.error('Failed to retry transaction in Impact', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get transaction error details from Impact
   */
  async getTransactionError(transactionId: string): Promise<any> {
    try {
      const response = await this.apiCall('GET', `/transactions/${transactionId}/error`, {});
      return response.data;
    } catch (error) {
      logger.warn('Failed to get transaction error from Impact', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Authenticate with Impact API
   */
  private async authenticate(): Promise<void> {
    try {
      // In a real implementation, this would use actual Impact authentication
      // For now, simulate successful authentication
      const payload = {
        username: this.config?.apiUsername,
        password: this.config?.apiPassword,
      };

      // TODO: Implement actual Impact API authentication
      // const response = await fetch(`${this.config?.apiEndpoint}/auth/login`, {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // });
      // const data = await response.json();
      // this.authToken = data.token;

      // For Phase 4, use mock token
      this.authToken = `bearer_token_${Date.now()}`;

      logger.debug('Authenticated with Impact ERP', {
        company: this.config?.company,
      });
    } catch (error) {
      logger.error('Failed to authenticate with Impact', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Make API call to Impact
   */
  private async apiCall(method: string, path: string, data: any): Promise<any> {
    try {
      // TODO: Implement actual HTTP requests in Phase 4+
      // For Phase 4, return mock responses

      logger.debug('Impact API call', {
        method,
        path,
        hasAuth: !!this.authToken,
      });

      // Simulate successful API response
      const mockData = data.params ? [] : { id: `impact-${Date.now()}`, po_number: `IMP-PO-${Date.now()}`, ...data };
      return {
        status: 200,
        data: mockData,
      };
    } catch (error) {
      logger.error('Impact API call failed', {
        method,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }
}

export default ImpactERPAdapter;
