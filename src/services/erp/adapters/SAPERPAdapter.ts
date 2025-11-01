/**
 * SAPERPAdapter - Integration with SAP S/4HANA and ECC
 * Issue #60: Phase 5-8 - SAP ERP Adapter with Real HTTP/BAPI Integration
 *
 * Supports both SAP S/4HANA (modern) and ECC (legacy) systems
 * Implements BAPIs (Business APIs) for core transactions via OData and REST APIs
 * with real HTTP calls, authentication, retry logic, and exponential backoff
 */

import axios, { AxiosInstance, AxiosError } from 'axios';
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
 * SAP-specific configuration
 */
export interface SAPConfig {
  system: 'S4HANA' | 'ECC';
  apiEndpoint: string; // OData endpoint
  username: string;
  password: string;
  client: string; // SAP client number (100, 200, etc.)
  language?: string; // EN, DE, etc.
  company?: string; // Company code
  plant?: string; // Plant/warehouse code
  warehouse?: string; // Warehouse number
  timeout?: number;
}

/**
 * SAP ERP Adapter implementation with real HTTP/BAPI integration
 */
export class SAPERPAdapter implements IERPAdapter {
  private config: SAPConfig | null = null;
  private authToken: string | null = null;
  private httpClient: AxiosInstance | null = null;
  private retryConfig = {
    maxRetries: 3,
    baseDelay: 1000, // 1 second
    maxDelay: 30000, // 30 seconds
  };

  getAdapterName(): string {
    return 'SAP';
  }

  /**
   * Connect to SAP system
   */
  async connect(config: SAPConfig): Promise<void> {
    try {
      this.config = config;

      if (!config.apiEndpoint || !config.username || !config.password) {
        throw new Error('Missing required SAP configuration: apiEndpoint, username, password');
      }

      // Authenticate with SAP OData service
      await this.authenticate();

      logger.info('Connected to SAP ERP system', {
        system: config.system,
        client: config.client,
        endpoint: config.apiEndpoint,
      });
    } catch (error) {
      logger.error('Failed to connect to SAP', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Test connection to SAP
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

      // Make a simple OData call to test connectivity
      const response = await this.odataCall('GET', '/Vendors?$top=1', {});

      return {
        connected: true,
        message: `Connected to SAP ${this.config.system} (Client: ${this.config.client})`,
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
   * Disconnect from SAP
   */
  async disconnect(): Promise<void> {
    this.authToken = null;
    this.config = null;
    logger.info('Disconnected from SAP ERP');
  }

  /**
   * Fetch suppliers from SAP
   */
  async syncSuppliers(filters?: any): Promise<ERPSupplier[]> {
    try {
      const response = await this.odataCall(
        'GET',
        `/Vendors?$filter=CompanyCode eq '${this.config?.company}'&$top=${filters?.limit || 100}&$skip=${filters?.offset || 0}`,
        {}
      );

      return response.value.map((vendor: any) => ({
        vendorId: vendor.VendorNumber,
        vendorCode: vendor.VendorCode,
        vendorName: vendor.VendorName,
        address: vendor.AddressLine1,
        city: vendor.City,
        state: vendor.Region,
        country: vendor.Country,
        postalCode: vendor.PostalCode,
        contactEmail: vendor.EmailAddress,
        contactPhone: vendor.PhoneNumber,
        paymentTerms: vendor.PaymentTerms,
        currency: vendor.Currency,
        approvedVendor: vendor.ApprovedFlag === 'X',
        qualityRating: parseFloat(vendor.QualityScore || '0'),
        onTimeDeliveryRate: parseFloat(vendor.OnTimeRate || '0'),
        certifications: vendor.Certifications?.split(',') || [],
      }));
    } catch (error) {
      logger.warn('Failed to fetch suppliers from SAP', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch purchase orders from SAP
   */
  async syncPurchaseOrders(filters?: any): Promise<ERPPO[]> {
    try {
      const statusFilter = filters?.status ? `&$filter=Status eq '${filters.status}'` : '';
      const response = await this.odataCall(
        'GET',
        `/PurchaseOrders?$filter=Company eq '${this.config?.company}'${statusFilter}&$expand=LineItems&$top=${filters?.limit || 100}&$skip=${filters?.offset || 0}`,
        {}
      );

      return response.value.map((po: any) => ({
        erpPoId: po.PurchaseOrderNumber,
        poNumber: po.PONumber,
        poDate: new Date(po.PODate),
        vendorId: po.VendorNumber,
        vendorCode: po.VendorCode,
        status: this.mapSAPPOStatus(po.Status),
        totalAmount: parseFloat(po.NetAmount),
        currency: po.Currency,
        quantity: parseInt(po.TotalQuantity || '0'),
        requiredDate: po.DeliveryDate ? new Date(po.DeliveryDate) : undefined,
        shipToLocation: po.DeliveryLocation,
        accountCode: po.CostCenter,
        costCenter: po.CostCenter,
        description: po.Description,
        lines: po.LineItems?.map((line: any) => ({
          lineNumber: parseInt(line.ItemNumber),
          partNumber: line.MaterialNumber,
          description: line.ItemDescription,
          quantity: parseInt(line.Quantity),
          unitOfMeasure: line.UnitOfMeasure,
          unitPrice: parseFloat(line.UnitPrice),
          extendedPrice: parseFloat(line.Amount),
          requiredDate: line.DeliveryDate ? new Date(line.DeliveryDate) : undefined,
        })),
      }));
    } catch (error) {
      logger.warn('Failed to fetch purchase orders from SAP', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Fetch work orders from SAP
   */
  async syncWorkOrders(filters?: any): Promise<any[]> {
    try {
      const response = await this.odataCall(
        'GET',
        `/WorkOrders?$filter=Plant eq '${this.config?.plant}'&$top=${filters?.limit || 100}&$skip=${filters?.offset || 0}`,
        {}
      );

      return response.value.map((wo: any) => ({
        id: wo.OrderNumber,
        workOrderNumber: wo.OrderNumber,
        status: this.mapSAPOrderStatus(wo.Status),
        operationId: wo.OperationNumber,
        quantity: parseInt(wo.Quantity),
        createdDate: new Date(wo.CreatedDate),
        requiredDate: wo.RequiredDate ? new Date(wo.RequiredDate) : undefined,
      }));
    } catch (error) {
      logger.warn('Failed to fetch work orders from SAP', {
        error: error instanceof Error ? error.message : String(error),
      });
      return [];
    }
  }

  /**
   * Create purchase order in SAP (BAPI_PO_CREATE1)
   */
  async createPurchaseOrder(po: ERPPO): Promise<string> {
    try {
      // SAP BAPI format
      const payload = {
        PurchasingDocumentType: 'NB', // Standard PO
        VendorNumber: po.vendorId,
        CompanyCode: this.config?.company,
        PurchasingGroup: '001',
        DocumentCurrency: po.currency || 'USD',
        PurchasingDocumentHeader: {
          VendorAccountNumber: po.vendorId,
          DocumentDate: po.poDate.toISOString().split('T')[0],
          DeliveryDate: po.requiredDate?.toISOString().split('T')[0],
          PurchasingDocumentDescription: po.description,
        },
        PurchasingDocumentItems: po.lines?.map((line) => ({
          PurchasingDocumentItemNumber: line.lineNumber.toString().padStart(5, '0'),
          MaterialNumber: line.partNumber,
          ItemDescription: line.description,
          DeliveryDate: line.requiredDate?.toISOString().split('T')[0],
          Quantity: line.quantity,
          Unit: line.unitOfMeasure,
          NetPrice: line.unitPrice,
          DeliveryAddress: po.shipToLocation,
        })),
      };

      const response = await this.bapiCall('BAPI_PO_CREATE1', payload);

      const poNumber = response.PurchasingDocumentNumber || response.DocumentNumber;

      logger.info('Created purchase order in SAP', {
        poNumber,
        vendor: po.vendorCode,
      });

      return poNumber;
    } catch (error) {
      logger.error('Failed to create purchase order in SAP', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update purchase order in SAP
   */
  async updatePurchaseOrder(erpPoId: string, updates: Partial<ERPPO>): Promise<void> {
    try {
      const payload: any = {
        PurchasingDocumentNumber: erpPoId,
      };

      if (updates.status) {
        payload.PurchasingDocumentStatus = this.mapStatusToSAP(updates.status);
      }
      if (updates.requiredDate) {
        payload.DeliveryDate = updates.requiredDate.toISOString().split('T')[0];
      }

      await this.bapiCall('BAPI_PO_CHANGE', payload);

      logger.info('Updated purchase order in SAP', {
        poNumber: erpPoId,
      });
    } catch (error) {
      logger.error('Failed to update purchase order in SAP', {
        poNumber: erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get purchase order from SAP
   */
  async getPurchaseOrder(erpPoId: string): Promise<ERPPO | null> {
    try {
      const response = await this.odataCall(
        'GET',
        `/PurchaseOrders('${erpPoId}')?$expand=LineItems`,
        {}
      );

      const po = response;
      return {
        erpPoId: po.PurchaseOrderNumber,
        poNumber: po.PONumber,
        poDate: new Date(po.PODate),
        vendorId: po.VendorNumber,
        vendorCode: po.VendorCode,
        status: this.mapSAPPOStatus(po.Status),
        totalAmount: parseFloat(po.NetAmount),
        currency: po.Currency,
        quantity: parseInt(po.TotalQuantity || '0'),
        requiredDate: po.DeliveryDate ? new Date(po.DeliveryDate) : undefined,
        shipToLocation: po.DeliveryLocation,
        accountCode: po.CostCenter,
        costCenter: po.CostCenter,
        description: po.Description,
      };
    } catch (error) {
      logger.warn('Failed to get purchase order from SAP', {
        poNumber: erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Cancel purchase order in SAP
   */
  async cancelPurchaseOrder(erpPoId: string): Promise<void> {
    try {
      await this.bapiCall('BAPI_PO_DELETE', {
        PurchasingDocumentNumber: erpPoId,
      });

      logger.info('Cancelled purchase order in SAP', {
        poNumber: erpPoId,
      });
    } catch (error) {
      logger.error('Failed to cancel purchase order in SAP', {
        poNumber: erpPoId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Post receipt in SAP (BAPI_GOODSRECEIPT_CREATE)
   */
  async postReceipt(receipt: ERPReceipt): Promise<void> {
    try {
      const payload = {
        PurchasingDocumentNumber: receipt.poId,
        PurchasingDocumentItemNumber: receipt.poLineNumber?.toString().padStart(5, '0'),
        DeliveryDocumentDate: receipt.receiptDate.toISOString().split('T')[0],
        Quantity: receipt.quantityReceived,
        UnitOfMeasure: 'EA',
        ReceivingLocation: receipt.receiptLocation || this.config?.warehouse,
        LotNumber: receipt.lotNumber,
        InspectionStatus: receipt.inspectionStatus || 'ACCEPTED',
      };

      await this.bapiCall('BAPI_GOODSRECEIPT_CREATE', payload);

      logger.info('Posted receipt in SAP', {
        poNumber: receipt.poId,
        quantity: receipt.quantityReceived,
      });
    } catch (error) {
      logger.error('Failed to post receipt in SAP', {
        poNumber: receipt.poId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get receipt status from SAP
   */
  async getReceiptStatus(receiptId: string): Promise<any> {
    try {
      const response = await this.odataCall('GET', `/DeliveryDocuments('${receiptId}')`, {});
      return response;
    } catch (error) {
      logger.warn('Failed to get receipt status from SAP', {
        receiptId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Post cost in SAP
   */
  async postCost(cost: ERPCost): Promise<void> {
    try {
      const payload = {
        CompanyCode: this.config?.company,
        DocumentType: 'IV', // Invoice
        DocumentNumber: cost.invoiceNumber,
        InvoiceDate: cost.invoiceDate?.toISOString().split('T')[0],
        PurchasingDocumentNumber: cost.poId,
        Amount: cost.actualCost,
        Currency: 'USD',
        CostCenter: cost.costCenter,
        Description: cost.description,
      };

      await this.bapiCall('BAPI_INCOMINGINVOICE_CREATE', payload);

      logger.info('Posted cost in SAP', {
        poNumber: cost.poId,
        amount: cost.actualCost,
      });
    } catch (error) {
      logger.error('Failed to post cost in SAP', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get cost status from SAP
   */
  async getCostStatus(costId: string): Promise<any> {
    try {
      const response = await this.odataCall('GET', `/Invoices('${costId}')`, {});
      return response;
    } catch (error) {
      logger.warn('Failed to get cost status from SAP', {
        costId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Notify SAP of shipment
   */
  async notifyShipment(shipment: ERPShipment): Promise<void> {
    try {
      const payload = {
        OutboundDeliveryDocumentNumber: shipment.shipmentNumber,
        PurchasingDocumentNumber: shipment.poId,
        DeliveryDocumentDate: shipment.shipmentDate.toISOString().split('T')[0],
        CarrierName: shipment.carrierName,
        TrackingNumber: shipment.trackingNumber,
        ExpectedDeliveryDate: shipment.expectedDeliveryDate?.toISOString().split('T')[0],
        Status: this.mapStatusToSAP(shipment.shipmentStatus),
      };

      await this.bapiCall('BAPI_OUTBOUND_DELIVERY_CREATE', payload);

      logger.info('Notified SAP of shipment', {
        shipmentNumber: shipment.shipmentNumber,
        poNumber: shipment.poId,
      });
    } catch (error) {
      logger.error('Failed to notify SAP of shipment', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Update shipment status in SAP
   */
  async updateShipmentStatus(shipmentId: string, status: string): Promise<void> {
    try {
      await this.bapiCall('BAPI_OUTBOUND_DELIVERY_CHANGE', {
        OutboundDeliveryDocumentNumber: shipmentId,
        Status: this.mapStatusToSAP(status),
      });

      logger.info('Updated shipment status in SAP', {
        shipmentNumber: shipmentId,
        status,
      });
    } catch (error) {
      logger.error('Failed to update shipment status in SAP', {
        shipmentNumber: shipmentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Post inventory transaction in SAP
   */
  async postInventoryTransaction(transaction: ERPInventoryTransaction): Promise<void> {
    try {
      const payload = {
        CompanyCode: this.config?.company,
        Plant: this.config?.plant,
        StorageLocation: transaction.location || this.config?.warehouse,
        MaterialNumber: transaction.materialId,
        Quantity: transaction.quantity,
        UnitOfMeasure: 'EA',
        MovementType: this.mapTransactionTypeToSAP(transaction.transactionType),
        PostingDate: transaction.transactionDate.toISOString().split('T')[0],
        DocumentHeaderText: transaction.description,
        ReferenceName: transaction.referenceNumber,
      };

      await this.bapiCall('BAPI_MATERIAL_STOCK_POST', payload);

      logger.info('Posted inventory transaction in SAP', {
        materialId: transaction.materialId,
        quantity: transaction.quantity,
      });
    } catch (error) {
      logger.error('Failed to post inventory transaction in SAP', {
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Get inventory balance from SAP
   */
  async getInventoryBalance(materialId: string, warehouseId?: string): Promise<any> {
    try {
      const response = await this.odataCall(
        'GET',
        `/MaterialStock?$filter=MaterialNumber eq '${materialId}' and StorageLocation eq '${warehouseId || this.config?.warehouse}'`,
        {}
      );
      return response.value?.[0] || null;
    } catch (error) {
      logger.warn('Failed to get inventory balance from SAP', {
        materialId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Retry failed transaction in SAP
   */
  async retryTransaction(transactionId: string): Promise<boolean> {
    try {
      await this.bapiCall('BAPI_TRANSACTION_ROLLBACK', {});
      return true;
    } catch (error) {
      logger.error('Failed to retry transaction in SAP', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Get transaction error from SAP
   */
  async getTransactionError(transactionId: string): Promise<any> {
    try {
      return await this.bapiCall('BAPI_TRANSACTION_GETLOG', {
        TransactionID: transactionId,
      });
    } catch (error) {
      logger.warn('Failed to get transaction error from SAP', {
        transactionId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Authenticate with SAP using OData or RFC credentials
   * Implements exponential backoff retry on failure
   */
  private async authenticate(): Promise<void> {
    try {
      if (!this.config) {
        throw new Error('SAP adapter not configured');
      }

      // Initialize HTTP client if not already done
      if (!this.httpClient) {
        this.httpClient = axios.create({
          baseURL: this.config.apiEndpoint,
          timeout: this.config.timeout || 30000,
          auth: {
            username: this.config.username,
            password: this.config.password,
          },
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'MachShop-ERPAdapter/1.0',
            'X-CSRF-Token': 'Fetch', // SAP CSRF token fetch
          },
        });

        // Add interceptor to fetch and include CSRF token
        this.httpClient.interceptors.response.use(
          response => {
            const token = response.headers['x-csrf-token'];
            if (token) {
              this.httpClient!.defaults.headers.common['X-CSRF-Token'] = token;
            }
            return response;
          },
          error => Promise.reject(error)
        );
      }

      // Test authentication with a simple call
      await this.retryWithBackoff(
        async () =>
          this.httpClient!.get('/sap/opu/odata/sap/C_PURCHASEORDER_SRV/$metadata', {
            headers: { 'X-CSRF-Token': 'Fetch' },
          }),
        'SAP authentication'
      );

      this.authToken = `authenticated_${Date.now()}`;

      logger.info('Successfully authenticated with SAP', {
        system: this.config.system,
        client: this.config.client,
        endpoint: this.config.apiEndpoint,
      });
    } catch (error) {
      logger.error('Failed to authenticate with SAP', {
        error: error instanceof Error ? error.message : String(error),
        config: {
          system: this.config?.system,
          client: this.config?.client,
          endpoint: this.config?.apiEndpoint,
        },
      });
      throw error;
    }
  }

  /**
   * Make OData call to SAP with retry logic
   */
  private async odataCall(method: string, path: string, data: any): Promise<any> {
    try {
      if (!this.httpClient) {
        throw new Error('HTTP client not initialized');
      }

      if (!this.authToken) {
        await this.authenticate();
      }

      logger.debug('Making SAP OData call', {
        method,
        path,
      });

      const response = await this.retryWithBackoff(
        async () => {
          const config: any = { method, url: path };

          if (method === 'GET') {
            config.params = data.params || {};
          } else {
            config.data = data;
          }

          return this.httpClient!.request(config);
        },
        `SAP OData ${method} ${path}`
      );

      return response.data;
    } catch (error) {
      logger.error('SAP OData call failed', {
        method,
        path,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Make BAPI call to SAP via OData or REST with retry logic
   * Handles both synchronous and asynchronous BAPI execution
   */
  private async bapiCall(bapiName: string, payload: any): Promise<any> {
    try {
      if (!this.httpClient) {
        throw new Error('HTTP client not initialized');
      }

      if (!this.authToken) {
        await this.authenticate();
      }

      logger.debug('Making SAP BAPI call', {
        bapiName,
        payloadKeys: Object.keys(payload),
      });

      // Construct BAPI endpoint path
      // Format: /sap/opu/odata/sap/C_PURCHASEORDER_SRV/C_PurchaseOrders
      const bapiPath = `/sap/opu/odata/sap/${bapiName}`;

      const response = await this.retryWithBackoff(
        async () =>
          this.httpClient!.post(bapiPath, payload, {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            },
          }),
        `SAP BAPI ${bapiName}`
      );

      logger.debug('SAP BAPI call succeeded', {
        bapiName,
        status: response.status,
      });

      return response.data;
    } catch (error) {
      logger.error('SAP BAPI call failed', {
        bapiName,
        error: error instanceof Error ? error.message : String(error),
        details: error instanceof AxiosError ? {
          status: error.response?.status,
          statusText: error.response?.statusText,
        } : undefined,
      });
      throw error;
    }
  }

  /**
   * Retry with exponential backoff for transient failures
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        const isRetryable = this.isRetryableError(error);

        if (attempt < this.retryConfig.maxRetries && isRetryable) {
          const delay = this.calculateBackoffDelay(attempt);
          logger.warn(`Retrying ${operationName} (attempt ${attempt + 1}/${this.retryConfig.maxRetries})`, {
            error: lastError.message,
            delayMs: delay,
          });

          await this.sleep(delay);
        } else {
          break;
        }
      }
    }

    throw lastError || new Error(`${operationName} failed after ${this.retryConfig.maxRetries} retries`);
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (error instanceof AxiosError) {
      const status = error.response?.status;
      return status === 408 || status === 429 || (status !== undefined && status >= 500);
    }
    return error instanceof Error && (
      error.message.includes('ECONNREFUSED') ||
      error.message.includes('ENOTFOUND') ||
      error.message.includes('ETIMEDOUT') ||
      error.message.includes('timeout')
    );
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoffDelay(attempt: number): number {
    const exponentialDelay = this.retryConfig.baseDelay * Math.pow(2, attempt);
    const jitterDelay = exponentialDelay + Math.random() * 1000;
    return Math.min(jitterDelay, this.retryConfig.maxDelay);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Map SAP PO status to standard status
   */
  private mapSAPPOStatus(
    sapStatus: string
  ): 'DRAFT' | 'APPROVED' | 'SENT' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RECEIVED' | 'CLOSED' {
    const statusMap: Record<string, any> = {
      B: 'DRAFT', // Pending
      A: 'APPROVED', // Approved
      F: 'SENT', // Released
      C: 'ACKNOWLEDGED', // Confirmed
      E: 'IN_PROGRESS', // Order complete (PO still open)
      G: 'RECEIVED', // Goods receipt
      H: 'CLOSED', // Closed
    };
    return statusMap[sapStatus] || 'DRAFT';
  }

  /**
   * Map SAP order status to standard status
   */
  private mapSAPOrderStatus(sapStatus: string): string {
    const statusMap: Record<string, string> = {
      CRTD: 'CREATED',
      REL: 'RELEASED',
      PRTD: 'PRINTED',
      CNFD: 'CONFIRMED',
      COMP: 'COMPLETED',
      CLOS: 'CLOSED',
    };
    return statusMap[sapStatus] || 'CREATED';
  }

  /**
   * Map standard status to SAP status code
   */
  private mapStatusToSAP(status: string): string {
    const statusMap: Record<string, string> = {
      DRAFT: 'B',
      APPROVED: 'A',
      SENT: 'F',
      ACKNOWLEDGED: 'C',
      IN_PROGRESS: 'E',
      RECEIVED: 'G',
      CLOSED: 'H',
      SHIPPED: 'C',
      IN_TRANSIT: 'E',
      DELIVERED: 'G',
    };
    return statusMap[status] || 'B';
  }

  /**
   * Map transaction type to SAP movement type
   */
  private mapTransactionTypeToSAP(transactionType: string): string {
    const movementMap: Record<string, string> = {
      RECEIPT: '101', // Goods receipt for PO
      ISSUE: '261', // Goods issue
      TRANSFER: '311', // Transfer between locations
      ADJUSTMENT: '321', // Stock adjustment
      SCRAP: '551', // Scrap
      CONSIGNMENT: '491', // Consignment stock
    };
    return movementMap[transactionType] || '101';
  }
}

export default SAPERPAdapter;
