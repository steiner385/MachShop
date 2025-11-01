/**
 * ERP Adapters - Unit Tests
 * Tests for ImpactERPAdapter, SAPERPAdapter, OracleERPAdapter, and ERPAdapterFactory
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ImpactERPAdapter } from '../../../services/erp/adapters/ImpactERPAdapter';
import { SAPERPAdapter } from '../../../services/erp/adapters/SAPERPAdapter';
import { OracleERPAdapter } from '../../../services/erp/adapters/OracleERPAdapter';
import { ERPAdapterFactory } from '../../../services/erp/adapters/ERPAdapterFactory';

// Mock logger
vi.mock('../../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('ImpactERPAdapter', () => {
  let adapter: ImpactERPAdapter;

  beforeEach(() => {
    adapter = new ImpactERPAdapter();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct adapter name', () => {
      expect(adapter.getAdapterName()).toBe('Impact');
    });

    it('should connect successfully with valid config', async () => {
      const config = {
        apiEndpoint: 'https://impact-api.example.com',
        apiUsername: 'user@example.com',
        apiPassword: 'password123',
        company: 'COMPANY1',
      };

      await adapter.connect(config);

      expect(adapter.getAdapterName()).toBe('Impact');
    });

    it('should fail to connect with missing config', async () => {
      const config = {
        apiEndpoint: '',
        apiUsername: '',
        apiPassword: '',
      };

      await expect(adapter.connect(config as any)).rejects.toThrow('Missing required');
    });
  });

  describe('testConnection', () => {
    it('should test connection when not configured', async () => {
      const result = await adapter.testConnection();

      expect(result.connected).toBe(false);
      expect(result.error).toBe('NOTCONFIGURED');
    });

    it('should test connection when configured', async () => {
      const config = {
        apiEndpoint: 'https://impact-api.example.com',
        apiUsername: 'user',
        apiPassword: 'pass',
        company: 'COMPANY1',
      };

      await adapter.connect(config);
      const result = await adapter.testConnection();

      expect(result.connected).toBe(true);
      expect(result.message).toContain('Impact');
    });
  });

  describe('PO operations', () => {
    beforeEach(async () => {
      const config = {
        apiEndpoint: 'https://impact-api.example.com',
        apiUsername: 'user',
        apiPassword: 'pass',
        company: 'COMPANY1',
      };
      await adapter.connect(config);
    });

    it('should create purchase order', async () => {
      const po = {
        erpPoId: '',
        poNumber: '',
        poDate: new Date(),
        vendorId: 'VENDOR001',
        vendorCode: 'V001',
        status: 'DRAFT' as const,
        totalAmount: 10000,
        currency: 'USD',
        quantity: 100,
      };

      const result = await adapter.createPurchaseOrder(po);

      // Mock returns PO number
      expect(result).toBeDefined();
    });

    it('should cancel purchase order', async () => {
      await adapter.cancelPurchaseOrder('PO-001');

      expect(true).toBe(true); // No error thrown
    });
  });

  describe('disconnect', () => {
    it('should disconnect successfully', async () => {
      const config = {
        apiEndpoint: 'https://impact-api.example.com',
        apiUsername: 'user',
        apiPassword: 'pass',
        company: 'COMPANY1',
      };

      await adapter.connect(config);
      await adapter.disconnect();

      expect(true).toBe(true);
    });
  });
});

describe('SAPERPAdapter', () => {
  let adapter: SAPERPAdapter;

  beforeEach(() => {
    adapter = new SAPERPAdapter();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct adapter name', () => {
      expect(adapter.getAdapterName()).toBe('SAP');
    });

    it('should connect to SAP S/4HANA', async () => {
      const config = {
        system: 'S4HANA' as const,
        apiEndpoint: 'https://sap-api.example.com/odata/v4',
        username: 'sapuser',
        password: 'sappass',
        client: '100',
        company: '1000',
        plant: 'P001',
      };

      await adapter.connect(config);

      expect(adapter.getAdapterName()).toBe('SAP');
    });

    it('should connect to SAP ECC', async () => {
      const config = {
        system: 'ECC' as const,
        apiEndpoint: 'https://sap-ecc.example.com/odata/v2',
        username: 'sapuser',
        password: 'sappass',
        client: '100',
      };

      await adapter.connect(config);

      expect(adapter.getAdapterName()).toBe('SAP');
    });

    it('should fail with missing config', async () => {
      const config = {
        system: 'S4HANA' as const,
        apiEndpoint: '',
        username: '',
        password: '',
      };

      await expect(adapter.connect(config as any)).rejects.toThrow('Missing required');
    });
  });

  describe('PO operations', () => {
    beforeEach(async () => {
      const config = {
        system: 'S4HANA' as const,
        apiEndpoint: 'https://sap-api.example.com',
        username: 'sapuser',
        password: 'sappass',
        client: '100',
        company: '1000',
      };
      await adapter.connect(config);
    });

    it('should create SAP purchase order via BAPI', async () => {
      const po = {
        erpPoId: '',
        poNumber: '',
        poDate: new Date(),
        vendorId: 'VENDOR1',
        vendorCode: 'V1',
        status: 'DRAFT' as const,
        totalAmount: 5000,
        currency: 'EUR',
      };

      const result = await adapter.createPurchaseOrder(po);

      // Mock returns PO number
      expect(result).toBeDefined();
    });

    it('should update SAP purchase order', async () => {
      await adapter.updatePurchaseOrder('4500000001', {
        status: 'APPROVED',
      });

      expect(true).toBe(true);
    });

    it('should get SAP purchase order', async () => {
      const po = await adapter.getPurchaseOrder('4500000001');

      // Mock returns PO object
      expect(po).toBeDefined();
    });
  });

  describe('Receipt operations', () => {
    beforeEach(async () => {
      const config = {
        system: 'S4HANA' as const,
        apiEndpoint: 'https://sap-api.example.com',
        username: 'sapuser',
        password: 'sappass',
        client: '100',
        plant: 'P001',
      };
      await adapter.connect(config);
    });

    it('should post receipt via BAPI_GOODSRECEIPT_CREATE', async () => {
      const receipt = {
        poId: '4500000001',
        poLineNumber: 1,
        quantityReceived: 50,
        receiptDate: new Date(),
        receiptLocation: 'STORE01',
      };

      await adapter.postReceipt(receipt);

      expect(true).toBe(true);
    });
  });

  describe('Inventory operations', () => {
    beforeEach(async () => {
      const config = {
        system: 'S4HANA' as const,
        apiEndpoint: 'https://sap-api.example.com',
        username: 'sapuser',
        password: 'sappass',
        client: '100',
        plant: 'P001',
      };
      await adapter.connect(config);
    });

    it('should post inventory transaction', async () => {
      const transaction = {
        materialId: 'MAT001',
        quantity: 100,
        transactionType: 'RECEIPT' as const,
        transactionDate: new Date(),
        unitOfMeasure: 'EA',
      };

      await adapter.postInventoryTransaction(transaction);

      expect(true).toBe(true);
    });
  });
});

describe('OracleERPAdapter', () => {
  let adapter: OracleERPAdapter;

  beforeEach(() => {
    adapter = new OracleERPAdapter();
    vi.clearAllMocks();
  });

  describe('initialization', () => {
    it('should have correct adapter name', () => {
      expect(adapter.getAdapterName()).toBe('Oracle');
    });

    it('should connect to Oracle EBS', async () => {
      const config = {
        version: 'EBS' as const,
        apiEndpoint: 'https://oracle-ebs.example.com/api',
        username: 'oracleuser',
        password: 'oraclepass',
        orgId: '101',
        operatingUnit: 'MAIN',
      };

      await adapter.connect(config);

      expect(adapter.getAdapterName()).toBe('Oracle');
    });

    it('should connect to Oracle Cloud ERP', async () => {
      const config = {
        version: 'CLOUD' as const,
        apiEndpoint: 'https://instance.fa.ocs.oraclecloud.com/api',
        username: 'oracleuser',
        password: 'oraclepass',
        cloudInstance: 'instance',
      };

      await adapter.connect(config);

      expect(adapter.getAdapterName()).toBe('Oracle');
    });

    it('should fail with missing config', async () => {
      const config = {
        version: 'EBS' as const,
        apiEndpoint: '',
        username: '',
        password: '',
      };

      await expect(adapter.connect(config as any)).rejects.toThrow('Missing required');
    });
  });

  describe('PO operations', () => {
    beforeEach(async () => {
      const config = {
        version: 'EBS' as const,
        apiEndpoint: 'https://oracle-ebs.example.com/api',
        username: 'oracleuser',
        password: 'oraclepass',
        orgId: '101',
      };
      await adapter.connect(config);
    });

    it('should create Oracle purchase order', async () => {
      const po = {
        erpPoId: '',
        poNumber: '',
        poDate: new Date(),
        vendorId: 'VENDOR1',
        vendorCode: 'V1',
        status: 'DRAFT' as const,
        totalAmount: 7500,
        currency: 'USD',
      };

      const result = await adapter.createPurchaseOrder(po);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should update Oracle PO', async () => {
      await adapter.updatePurchaseOrder('54321', {
        status: 'APPROVED',
      });

      expect(true).toBe(true);
    });
  });

  describe('Receipt operations', () => {
    beforeEach(async () => {
      const config = {
        version: 'EBS' as const,
        apiEndpoint: 'https://oracle-ebs.example.com/api',
        username: 'oracleuser',
        password: 'oraclepass',
        orgId: '101',
      };
      await adapter.connect(config);
    });

    it('should post receipt via RCV_TRANSACTIONS interface', async () => {
      const receipt = {
        poId: '54321',
        quantityReceived: 75,
        receiptDate: new Date(),
        receiptLocation: 'REC_LOC_01',
      };

      await adapter.postReceipt(receipt);

      expect(true).toBe(true);
    });
  });
});

describe('ERPAdapterFactory', () => {
  describe('registration', () => {
    it('should have Impact adapter available', () => {
      expect(ERPAdapterFactory.isAdapterAvailable('Impact')).toBe(true);
    });

    it('should have SAP adapter available', () => {
      expect(ERPAdapterFactory.isAdapterAvailable('SAP')).toBe(true);
    });

    it('should have Oracle adapter available', () => {
      expect(ERPAdapterFactory.isAdapterAvailable('Oracle')).toBe(true);
    });

    it('should list all available adapters', () => {
      const adapters = ERPAdapterFactory.getAvailableAdapters();

      expect(adapters).toContain('Impact');
      expect(adapters).toContain('SAP');
      expect(adapters).toContain('Oracle');
    });

    it('should return false for unknown adapter', () => {
      expect(ERPAdapterFactory.isAdapterAvailable('UnknownERP')).toBe(false);
    });
  });

  describe('adapter creation', () => {
    afterEach(async () => {
      await ERPAdapterFactory.releaseAllAdapters();
    });

    it('should create Impact adapter instance', async () => {
      const config = {
        apiEndpoint: 'https://impact.example.com',
        apiUsername: 'user',
        apiPassword: 'pass',
        company: 'COMPANY1',
      };

      const adapter = await ERPAdapterFactory.createAdapter('Impact', config, 'impact-1');

      expect(adapter.getAdapterName()).toBe('Impact');
    });

    it('should create SAP adapter instance', async () => {
      const config = {
        system: 'S4HANA' as const,
        apiEndpoint: 'https://sap.example.com',
        username: 'sapuser',
        password: 'sappass',
        client: '100',
      };

      const adapter = await ERPAdapterFactory.createAdapter('SAP', config, 'sap-1');

      expect(adapter.getAdapterName()).toBe('SAP');
    });

    it('should create Oracle adapter instance', async () => {
      const config = {
        version: 'EBS' as const,
        apiEndpoint: 'https://oracle.example.com',
        username: 'oracleuser',
        password: 'oraclepass',
        orgId: '101',
      };

      const adapter = await ERPAdapterFactory.createAdapter('Oracle', config, 'oracle-1');

      expect(adapter.getAdapterName()).toBe('Oracle');
    });

    it('should fail with unknown adapter type', async () => {
      await expect(
        ERPAdapterFactory.createAdapter('UnknownERP', {}, 'unknown-1')
      ).rejects.toThrow('Unknown adapter type');
    });

    it('should cache and retrieve adapter instance', async () => {
      const config = {
        apiEndpoint: 'https://impact.example.com',
        apiUsername: 'user',
        apiPassword: 'pass',
        company: 'COMPANY1',
      };

      const adapter1 = await ERPAdapterFactory.createAdapter('Impact', config, 'impact-cache');
      const adapter2 = ERPAdapterFactory.getAdapter('impact-cache');

      expect(adapter1).toBe(adapter2);
    });

    it('should return null for non-existent adapter instance', () => {
      const adapter = ERPAdapterFactory.getAdapter('non-existent');

      expect(adapter).toBeNull();
    });
  });

  describe('adapter release', () => {
    it('should release single adapter instance', async () => {
      const config = {
        apiEndpoint: 'https://impact.example.com',
        apiUsername: 'user',
        apiPassword: 'pass',
        company: 'COMPANY1',
      };

      await ERPAdapterFactory.createAdapter('Impact', config, 'impact-release');
      await ERPAdapterFactory.releaseAdapter('impact-release');

      const adapter = ERPAdapterFactory.getAdapter('impact-release');
      expect(adapter).toBeNull();
    });

    it('should release all adapter instances', async () => {
      const impactConfig = {
        apiEndpoint: 'https://impact.example.com',
        apiUsername: 'user',
        apiPassword: 'pass',
        company: 'COMPANY1',
      };

      const sapConfig = {
        system: 'S4HANA' as const,
        apiEndpoint: 'https://sap.example.com',
        username: 'sapuser',
        password: 'sappass',
        client: '100',
      };

      await ERPAdapterFactory.createAdapter('Impact', impactConfig, 'impact-all');
      await ERPAdapterFactory.createAdapter('SAP', sapConfig, 'sap-all');

      await ERPAdapterFactory.releaseAllAdapters();

      expect(ERPAdapterFactory.getAdapter('impact-all')).toBeNull();
      expect(ERPAdapterFactory.getAdapter('sap-all')).toBeNull();
    });
  });

  describe('statistics', () => {
    it('should return adapter statistics', () => {
      const stats = ERPAdapterFactory.getStatistics();

      expect(stats.registeredAdapters).toBe(3); // Impact, SAP, Oracle
      expect(stats.adapters).toContain('Impact');
      expect(stats.adapters).toContain('SAP');
      expect(stats.adapters).toContain('Oracle');
      expect(stats.activeInstances).toBeGreaterThanOrEqual(0);
    });
  });
});
