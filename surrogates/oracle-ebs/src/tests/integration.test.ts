/**
 * Oracle EBS Surrogate - Integration Test Suite
 * Comprehensive testing for all API endpoints and workflows
 */

import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'http://localhost:3002/api';

describe('Oracle EBS Surrogate - Integration Tests', () => {
  let client: AxiosInstance;

  beforeAll(() => {
    client = axios.create({
      baseURL: BASE_URL,
      validateStatus: () => true // Don't throw on any status code
    });
  });

  describe('Health Check', () => {
    test('should return health status', async () => {
      const response = await client.get('/health');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Work Order Management', () => {
    let workOrderId: string;

    test('should create a new work order', async () => {
      const response = await client.post('/work-orders', {
        equipment_id: 'EQ-001',
        description: 'Integration test maintenance',
        estimated_hours: 8,
        cost_center: 'CC-001'
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.workOrderId).toBeDefined();
      workOrderId = response.data.workOrderId;
    });

    test('should retrieve work order details', async () => {
      const response = await client.get(`/work-orders/${workOrderId}`);
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(response.data.data.id).toBe(workOrderId);
    });

    test('should update work order status', async () => {
      const response = await client.patch(
        `/work-orders/${workOrderId}/status`,
        { newStatus: 'IN_PROGRESS' }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    test('should list work orders with pagination', async () => {
      const response = await client.get('/work-orders?page=1&pageSize=10');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    test('should filter work orders by status', async () => {
      const response = await client.get('/work-orders?status=IN_PROGRESS');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });

    test('should complete work order', async () => {
      const response = await client.patch(
        `/work-orders/${workOrderId}/status`,
        { newStatus: 'COMPLETED' }
      );

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Inventory Management', () => {
    let partNumber: string;

    test('should create inventory item', async () => {
      partNumber = `PART-${Date.now()}`;
      const response = await client.post('/inventory/items', {
        part_number: partNumber,
        description: 'Test part',
        quantity: 100,
        unit_cost: 25.50,
        location: 'LOC-001'
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    test('should list inventory items', async () => {
      const response = await client.get('/inventory/items');
      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });

    test('should record inventory transaction', async () => {
      const response = await client.post('/inventory/transactions', {
        part_number: partNumber,
        quantity: 10,
        transaction_type: 'OUT',
        reason: 'Integration test withdrawal'
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Purchase Order Management', () => {
    test('should create PO receipt', async () => {
      const response = await client.post('/po-receipts', {
        po_number: `PO-${Date.now()}`,
        part_number: 'PART-001',
        quantity_received: 50,
        unit_cost: 30
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Financial Management', () => {
    let workOrderId: string;

    beforeAll(async () => {
      const response = await client.post('/work-orders', {
        equipment_id: 'EQ-FIN-001',
        description: 'Financial testing work order',
        estimated_hours: 10,
        cost_center: 'CC-FIN-001'
      });
      workOrderId = response.data.workOrderId;
    });

    test('should record labor cost', async () => {
      const response = await client.post('/financial/costs/labor', {
        workOrderId,
        hours: 8,
        hourlyRate: 75,
        costCenter: 'CC-FIN-001',
        description: 'Integration test labor cost'
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    test('should get cost allocation for work order', async () => {
      const response = await client.get(`/financial/costs/allocation/${workOrderId}`);

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
    });
  });

  describe('Webhook Management', () => {
    test('should create webhook subscription', async () => {
      const response = await client.post('/webhooks/subscriptions', {
        name: 'Integration Test Webhook',
        url: 'http://localhost:9000/webhooks',
        events: ['WORK_ORDER_CREATED', 'INVENTORY_TRANSACTION']
      });

      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
    });

    test('should list webhook subscriptions', async () => {
      const response = await client.get('/webhooks/subscriptions');

      expect(response.status).toBe(200);
      expect(response.data.success).toBe(true);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    test('should return 400 for missing required fields', async () => {
      const response = await client.post('/work-orders', {
        equipment_id: 'EQ-001'
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
    });

    test('should return 404 for non-existent work order', async () => {
      const response = await client.get('/work-orders/NONEXISTENT');

      expect(response.status).toBe(404);
      expect(response.data.success).toBe(false);
    });
  });
});
