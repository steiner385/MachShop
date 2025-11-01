/**
 * Oracle EBS Surrogate - Integration Tests
 * Tests basic CRUD operations and workflow scenarios
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/index';

const BASE_URL = 'http://localhost:3002';
let server: any;

beforeAll(async () => {
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));
});

afterAll(async () => {
  // Cleanup
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
});

describe('Oracle EBS Surrogate - Integration Tests', () => {
  describe('Health Check', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('healthy');
    });
  });

  describe('Work Orders', () => {
    it('should list work orders', async () => {
      const response = await request(app).get('/api/workorders');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should filter work orders by status', async () => {
      const response = await request(app).get('/api/workorders?status=RELEASED');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      // All returned work orders should have RELEASED status
      response.body.data.forEach((wo: any) => {
        expect(wo.status).toBe('RELEASED');
      });
    });

    it('should get single work order', async () => {
      const response = await request(app).get('/api/workorders/WO-2024-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order_number).toBe('WO-2024-001');
    });

    it('should return 404 for non-existent work order', async () => {
      const response = await request(app).get('/api/workorders/NONEXISTENT');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('WO_NOT_FOUND');
    });

    it('should create a new work order', async () => {
      const newWO = {
        orderNumber: 'WO-TEST-001',
        description: 'Integration Test Work Order',
        quantity: 5
      };

      const response = await request(app).post('/api/workorders').send(newWO);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.order_number).toBe('WO-TEST-001');
      expect(response.body.data.status).toBe('RELEASED');
    });

    it('should reject duplicate work order numbers', async () => {
      const newWO = {
        orderNumber: 'WO-2024-001',
        description: 'Duplicate Order',
        quantity: 5
      };

      const response = await request(app).post('/api/workorders').send(newWO);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('DUPLICATE_WO');
    });

    it('should update work order status', async () => {
      const response = await request(app)
        .put('/api/workorders/WO-2024-001')
        .send({ status: 'IN_PROCESS' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('IN_PROCESS');
    });

    it('should reject invalid status', async () => {
      const response = await request(app)
        .put('/api/workorders/WO-2024-001')
        .send({ status: 'INVALID_STATUS' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INVALID_STATUS');
    });
  });

  describe('Inventory Management', () => {
    it('should list inventory items', async () => {
      const response = await request(app).get('/api/inventory');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should search inventory by part number', async () => {
      const response = await request(app).get('/api/inventory?partNumber=PART-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      response.body.data.forEach((item: any) => {
        expect(item.part_number).toContain('PART-001');
      });
    });

    it('should get inventory for specific part', async () => {
      const response = await request(app).get('/api/inventory/PART-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.part_number).toBe('PART-001');
      expect(response.body.data.on_hand_quantity).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent part', async () => {
      const response = await request(app).get('/api/inventory/NONEXISTENT');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should record inventory transaction (ISSUE)', async () => {
      const transaction = {
        partNumber: 'PART-001',
        transactionType: 'ISSUE',
        quantity: 10,
        workOrderId: 'WO-2024-001'
      };

      const response = await request(app)
        .post('/api/inventory/transactions')
        .send(transaction);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction_type).toBe('ISSUE');
      expect(response.body.data.quantity).toBe(10);
    });

    it('should reject insufficient inventory', async () => {
      const transaction = {
        partNumber: 'PART-001',
        transactionType: 'ISSUE',
        quantity: 10000 // More than available
      };

      const response = await request(app)
        .post('/api/inventory/transactions')
        .send(transaction);

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errorCode).toBe('INSUFFICIENT_INVENTORY');
    });

    it('should record inventory transaction (RECEIVE)', async () => {
      const transaction = {
        partNumber: 'PART-005',
        transactionType: 'RECEIVE',
        quantity: 50
      };

      const response = await request(app)
        .post('/api/inventory/transactions')
        .send(transaction);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction_type).toBe('RECEIVE');
    });
  });

  describe('Purchase Orders', () => {
    it('should list purchase orders', async () => {
      const response = await request(app).get('/api/purchaseorders');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get single purchase order', async () => {
      const response = await request(app).get('/api/purchaseorders/PO-2024-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.po_number).toBe('PO-2024-001');
      expect(Array.isArray(response.body.data.lines)).toBe(true);
    });

    it('should return 404 for non-existent PO', async () => {
      const response = await request(app).get('/api/purchaseorders/NONEXISTENT');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Equipment Master Data', () => {
    it('should list equipment', async () => {
      const response = await request(app).get('/api/equipment');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get single equipment', async () => {
      const response = await request(app).get('/api/equipment/EQ-CNC-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.equipment_id).toBe('EQ-CNC-001');
    });

    it('should return 404 for non-existent equipment', async () => {
      const response = await request(app).get('/api/equipment/NONEXISTENT');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Gauge Master Data', () => {
    it('should list gauges', async () => {
      const response = await request(app).get('/api/gauges');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get single gauge', async () => {
      const response = await request(app).get('/api/gauges/GAGE-CAL-001');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data.gauge_id).toBe('GAGE-CAL-001');
    });

    it('should return 404 for non-existent gauge', async () => {
      const response = await request(app).get('/api/gauges/NONEXISTENT');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Data Management', () => {
    it('should reset database to initial state', async () => {
      const response = await request(app).post('/api/admin/reset');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verify data was reset
      const woResponse = await request(app).get('/api/workorders');
      expect(woResponse.body.data.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app).get('/api/nonexistent');

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
    });

    it('should handle missing required fields in POST', async () => {
      const response = await request(app)
        .post('/api/workorders')
        .send({ orderNumber: 'WO-TEST' });
      // Missing description and quantity

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
    });
  });
});
