/**
 * OSP Workflow Integration Tests
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Tests the complete OSP operation lifecycle from creation to acceptance
 */

import axios from 'axios';
import { OSPOperationStatus, OSPShipmentStatus } from '@prisma/client';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000/api/v1';

describe('OSP Complete Workflow', () => {
  let ospOperationId: string;
  let shipmentId: string;
  let vendorId = 'test-vendor-001';

  describe('OSP Operation Lifecycle', () => {
    it('should create a new OSP operation in PENDING_SHIPMENT status', async () => {
      // Act
      const response = await axios.post(`${API_BASE_URL}/osp/operations`, {
        operationId: 'test-op-001',
        vendorId,
        quantitySent: 100,
        requestedReturnDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
        inspectionRequired: true,
        notes: 'Test OSP operation for integration testing'
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe('PENDING_SHIPMENT');
      expect(response.data.data.ospNumber).toMatch(/^OSP-\d{4}-\d{5}$/);

      ospOperationId = response.data.data.id;
    });

    it('should transition OSP operation from PENDING_SHIPMENT to SHIPPED', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/operations/${ospOperationId}/transition`,
        { status: 'SHIPPED' as OSPShipmentStatus }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('SHIPPED');
    });

    it('should transition OSP operation from SHIPPED to AT_SUPPLIER', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/operations/${ospOperationId}/transition`,
        { status: 'AT_SUPPLIER' }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('AT_SUPPLIER');
    });

    it('should transition OSP operation from AT_SUPPLIER to IN_PROGRESS', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/operations/${ospOperationId}/transition`,
        { status: 'IN_PROGRESS' }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('IN_PROGRESS');
    });

    it('should transition OSP operation from IN_PROGRESS to INSPECTION', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/operations/${ospOperationId}/transition`,
        { status: 'INSPECTION' }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('INSPECTION');
    });

    it('should transition OSP operation from INSPECTION to RECEIVED', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/operations/${ospOperationId}/transition`,
        { status: 'RECEIVED' }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('RECEIVED');
    });

    it('should transition OSP operation from RECEIVED to ACCEPTED', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/operations/${ospOperationId}/transition`,
        { status: 'ACCEPTED' }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('ACCEPTED');
    });
  });

  describe('Shipment Workflow', () => {
    it('should create a shipment for the OSP operation', async () => {
      // Act
      const response = await axios.post(`${API_BASE_URL}/osp/shipments`, {
        ospOperationId,
        shipmentType: 'TO_SUPPLIER',
        sendingVendorId: 'internal-vendor',
        receivingVendorId: vendorId,
        quantity: 100,
        shippingMethod: 'Ground'
      });

      // Assert
      expect(response.status).toBe(201);
      expect(response.data.success).toBe(true);
      expect(response.data.data.status).toBe('DRAFT');

      shipmentId = response.data.data.id;
    });

    it('should mark shipment as shipped with tracking', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/shipments/${shipmentId}/mark-shipped`,
        {
          trackingNumber: 'FDX123456789',
          carrierName: 'FedEx'
        }
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('SHIPPED');
      expect(response.data.data.trackingNumber).toBe('FDX123456789');
    });

    it('should track shipment by tracking number', async () => {
      // Act
      const response = await axios.get(
        `${API_BASE_URL}/osp/shipments/track/FDX123456789`
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.trackingNumber).toBe('FDX123456789');
    });

    it('should mark shipment as received', async () => {
      // Act
      const response = await axios.post(
        `${API_BASE_URL}/osp/shipments/${shipmentId}/mark-received`
      );

      // Assert
      expect(response.status).toBe(200);
      expect(response.data.data.status).toBe('RECEIVED');
    });
  });

  describe('Query and Filtering', () => {
    it('should retrieve OSP operations by status', async () => {
      // Act
      const response = await axios.get(`${API_BASE_URL}/osp/operations`, {
        params: { status: 'ACCEPTED' }
      });

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      // All returned operations should have ACCEPTED status
      response.data.data.forEach((op: any) => {
        expect(op.status).toBe('ACCEPTED');
      });
    });

    it('should retrieve supplier OSP operations', async () => {
      // Act
      const response = await axios.get(`${API_BASE_URL}/osp/operations`, {
        params: { vendorId }
      });

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
      // All returned operations should be for this vendor
      response.data.data.forEach((op: any) => {
        expect(op.vendorId).toBe(vendorId);
      });
    });

    it('should list recent shipments', async () => {
      // Act
      const response = await axios.get(`${API_BASE_URL}/osp/shipments`, {
        params: { limit: 10 }
      });

      // Assert
      expect(response.status).toBe(200);
      expect(Array.isArray(response.data.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should reject invalid status transitions', async () => {
      // Create a fresh operation for this test
      const createResponse = await axios.post(`${API_BASE_URL}/osp/operations`, {
        operationId: 'test-op-invalid',
        vendorId,
        quantitySent: 50,
        requestedReturnDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      });

      const testOspId = createResponse.data.data.id;

      // Try to transition from PENDING_SHIPMENT directly to INSPECTION (invalid)
      // Act & Assert
      try {
        await axios.post(
          `${API_BASE_URL}/osp/operations/${testOspId}/transition`,
          { status: 'INSPECTION' }
        );
        fail('Should have thrown error for invalid transition');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
        expect(error.response.data.error).toContain('Invalid status transition');
      }
    });

    it('should handle missing required fields', async () => {
      // Act & Assert
      try {
        await axios.post(`${API_BASE_URL}/osp/operations`, {
          operationId: 'test-op-002'
          // Missing vendorId and quantitySent
        });
        fail('Should have thrown error for missing fields');
      } catch (error: any) {
        expect(error.response.status).toBe(400);
      }
    });
  });
});
