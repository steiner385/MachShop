/**
 * Work Order Execution E2E Tests (Task 1.7)
 *
 * Comprehensive API testing for ISA-95 Production Dispatching & Execution:
 * - Work order dispatching (CREATED → RELEASED)
 * - Status transition state machine
 * - Work performance actuals capture (labor, material, equipment, quality, downtime)
 * - Automatic variance calculation
 * - Performance and variance queries
 * - Real-time execution dashboard
 */

import { test, expect, APIRequestContext, request } from '@playwright/test';

let apiContext: APIRequestContext;
let authToken: string;
let testWorkOrderId: string;
let testWorkOrderId2: string;

test.describe('Work Order Execution API Tests', () => {
  test.beforeAll(async () => {
    // Create API request context - use E2E backend server (port 3101)
    apiContext = await request.newContext({
      baseURL: 'http://localhost:3101/api/v1',
    });

    // Login to get auth token
    const loginResponse = await apiContext.post('/auth/login', {
      data: {
        username: 'admin',
        password: 'password123'
      }
    });

    if (!loginResponse.ok()) {
      const errorText = await loginResponse.text();
      throw new Error(
        `API login failed during test setup. Status: ${loginResponse.status()}. ` +
        `Response: ${errorText}. ` +
        `Ensure E2E backend is running on port 3101.`
      );
    }

    const loginData = await loginResponse.json();
    authToken = loginData.token;
    expect(authToken).toBeDefined();

    // Create test work orders for testing
    const createResponse1 = await apiContext.post('/workorders', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        partNumber: 'TEST-EXEC-001',
        quantityOrdered: 50,
        priority: 'HIGH',
        customerOrder: 'TEST-CO-EXEC-001',
        siteId: 'test-site-id'
      }
    });
    const createData1 = await createResponse1.json();
    testWorkOrderId = createData1.id;

    const createResponse2 = await apiContext.post('/workorders', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        partNumber: 'TEST-EXEC-002',
        quantityOrdered: 25,
        priority: 'NORMAL',
        customerOrder: 'TEST-CO-EXEC-002',
        siteId: 'test-site-id'
      }
    });
    const createData2 = await createResponse2.json();
    testWorkOrderId2 = createData2.id;
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  // ======================
  // TEST SUITE 1: WORK ORDER DISPATCHING (5 tests)
  // ======================

  test.describe('1. Work Order Dispatching', () => {
    test('should dispatch single work order successfully', async () => {
      const response = await apiContext.post('/work-order-execution/dispatch', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          workOrderId: testWorkOrderId,
          dispatchedBy: 'admin-user-id',
          dispatchedFrom: 'Production Schedule TEST-001',
          assignedToId: 'operator-user-id',
          workCenterId: 'machining-center-id',
          priorityOverride: 'HIGH',
          expectedStartDate: new Date().toISOString(),
          expectedEndDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          materialReserved: true,
          toolingReserved: true,
          dispatchNotes: 'E2E test dispatch - high priority order',
          metadata: { testRun: true }
        }
      });

      expect(response.status()).toBe(201);
      const data = await response.json();

      // Verify dispatch log created
      expect(data.dispatchLog).toBeDefined();
      expect(data.dispatchLog.workOrderId).toBe(testWorkOrderId);
      expect(data.dispatchLog.dispatchedBy).toBe('admin-user-id');
      expect(data.dispatchLog.materialReserved).toBe(true);

      // Verify work order status changed to RELEASED
      expect(data.workOrder).toBeDefined();
      expect(data.workOrder.status).toBe('RELEASED');
    });

    test('should get work orders ready for dispatch', async () => {
      const response = await apiContext.get('/work-order-execution/dispatch/ready', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      // All returned work orders should have CREATED status
      data.forEach((wo: any) => {
        expect(wo.status).toBe('CREATED');
      });
    });

    test('should dispatch multiple work orders in bulk', async () => {
      // Create two more test work orders for bulk dispatch
      const wo1Response = await apiContext.post('/workorders', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          partNumber: 'BULK-TEST-001',
          quantityOrdered: 10,
          siteId: 'test-site-id'
        }
      });
      const wo1Data = await wo1Response.json();

      const wo2Response = await apiContext.post('/workorders', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          partNumber: 'BULK-TEST-002',
          quantityOrdered: 15,
          siteId: 'test-site-id'
        }
      });
      const wo2Data = await wo2Response.json();

      // Bulk dispatch
      const response = await apiContext.post('/work-order-execution/dispatch/bulk', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          workOrderIds: [wo1Data.id, wo2Data.id],
          dispatchedBy: 'admin-user-id',
          dispatchedFrom: 'Production Schedule BULK-001',
          workCenterId: 'machining-center-id'
        }
      });

      expect(response.status()).toBe(207); // Multi-status response
      const data = await response.json();

      expect(data.successful).toBe(2);
      expect(data.failed).toBe(0);
      expect(data.results.length).toBe(2);
    });

    test('should reject dispatch with missing required fields', async () => {
      const response = await apiContext.post('/work-order-execution/dispatch', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          workOrderId: testWorkOrderId2
          // Missing dispatchedBy
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('ValidationError');
      expect(data.message).toContain('required');
    });

    test('should reject dispatch of non-CREATED work order', async () => {
      // testWorkOrderId is already RELEASED from first test
      const response = await apiContext.post('/work-order-execution/dispatch', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          workOrderId: testWorkOrderId,
          dispatchedBy: 'admin-user-id'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('InvalidStatus');
      expect(data.message).toContain('cannot be dispatched');
    });
  });

  // ======================
  // TEST SUITE 2: STATUS TRANSITION MANAGEMENT (4 tests)
  // ======================

  test.describe('2. Status Transition Management', () => {
    test('should transition work order to IN_PROGRESS', async () => {
      const response = await apiContext.post(`/work-order-execution/${testWorkOrderId}/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          newStatus: 'IN_PROGRESS',
          reason: 'Production started on shop floor',
          changedBy: 'operator-user-id',
          notes: 'E2E test transition - work started'
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.workOrder.status).toBe('IN_PROGRESS');
      expect(data.statusHistory).toBeDefined();
      expect(data.statusHistory.previousStatus).toBe('RELEASED');
      expect(data.statusHistory.newStatus).toBe('IN_PROGRESS');
    });

    test('should get status history for work order', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/status/history`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThanOrEqual(2); // CREATED→RELEASED, RELEASED→IN_PROGRESS

      // Verify history records are ordered by date
      const transitions = data.map((h: any) => h.newStatus);
      expect(transitions).toContain('RELEASED');
      expect(transitions).toContain('IN_PROGRESS');
    });

    test('should get work orders by status', async () => {
      const response = await apiContext.get('/work-order-execution/status/IN_PROGRESS', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      // All returned work orders should have IN_PROGRESS status
      data.forEach((wo: any) => {
        expect(wo.status).toBe('IN_PROGRESS');
      });
    });

    test('should reject invalid status transitions', async () => {
      // Try to transition directly from IN_PROGRESS to CREATED (invalid)
      const response = await apiContext.post(`/work-order-execution/${testWorkOrderId}/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          newStatus: 'CREATED',
          changedBy: 'operator-user-id'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('InvalidTransition');
      expect(data.message).toContain('Invalid status transition');
    });
  });

  // ======================
  // TEST SUITE 3: WORK PERFORMANCE ACTUALS (5 tests)
  // ======================

  test.describe('3. Work Performance Actuals', () => {
    test('should record labor performance actuals', async () => {
      const response = await apiContext.post(`/work-order-execution/${testWorkOrderId}/performance`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          performanceType: 'LABOR',
          recordedBy: 'operator-user-id',
          personnelId: 'operator-user-id',
          laborHours: 8.5,
          laborCost: 425.00,
          laborEfficiency: 94.1,
          notes: 'E2E test - Day 1 labor hours'
        }
      });

      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.performanceType).toBe('LABOR');
      expect(data.laborHours).toBe(8.5);
      expect(data.laborCost).toBe(425.00);
      expect(data.laborEfficiency).toBe(94.1);
    });

    test('should record material performance actuals', async () => {
      const response = await apiContext.post(`/work-order-execution/${testWorkOrderId}/performance`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          performanceType: 'MATERIAL',
          recordedBy: 'operator-user-id',
          partId: 'titanium-alloy-id',
          quantityConsumed: 105.5,
          quantityPlanned: 100.0,
          materialVariance: 5.5,
          unitCost: 25.00,
          totalCost: 2637.50,
          notes: 'E2E test - Material consumption with 5.5% variance'
        }
      });

      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.performanceType).toBe('MATERIAL');
      expect(data.quantityConsumed).toBe(105.5);
      expect(data.materialVariance).toBe(5.5);
    });

    test('should record quality performance actuals', async () => {
      const response = await apiContext.post(`/work-order-execution/${testWorkOrderId}/performance`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          performanceType: 'QUALITY',
          recordedBy: 'quality-user-id',
          quantityProduced: 50,
          quantityGood: 48,
          quantityScrap: 2,
          quantityRework: 0,
          yieldPercentage: 96.0,
          scrapReason: '2 parts failed dimensional inspection',
          notes: 'E2E test - Quality inspection results'
        }
      });

      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.performanceType).toBe('QUALITY');
      expect(data.quantityProduced).toBe(50);
      expect(data.quantityGood).toBe(48);
      expect(data.yieldPercentage).toBe(96.0);
    });

    test('should record downtime performance', async () => {
      const response = await apiContext.post(`/work-order-execution/${testWorkOrderId}/performance`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          performanceType: 'DOWNTIME',
          recordedBy: 'operator-user-id',
          downtimeMinutes: 45,
          downtimeReason: 'Tool change required',
          downtimeCategory: 'PLANNED',
          notes: 'E2E test - Planned downtime for tool replacement'
        }
      });

      expect(response.status()).toBe(201);
      const data = await response.json();

      expect(data.performanceType).toBe('DOWNTIME');
      expect(data.downtimeMinutes).toBe(45);
      expect(data.downtimeCategory).toBe('PLANNED');
    });

    test('should reject performance record with invalid type', async () => {
      const response = await apiContext.post(`/work-order-execution/${testWorkOrderId}/performance`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          performanceType: 'INVALID_TYPE',
          recordedBy: 'operator-user-id'
        }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('ValidationError');
      expect(data.message).toContain('Invalid performanceType');
    });
  });

  // ======================
  // TEST SUITE 4: VARIANCE CALCULATION (4 tests)
  // ======================

  test.describe('4. Variance Calculation', () => {
    test('should get all production variances for work order', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/variances`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      // Should have auto-calculated variances from performance records
      expect(data.length).toBeGreaterThan(0);

      // Verify variance structure
      const variance = data[0];
      expect(variance.varianceType).toBeDefined();
      expect(variance.plannedValue).toBeDefined();
      expect(variance.actualValue).toBeDefined();
      expect(variance.variance).toBeDefined();
      expect(variance.variancePercent).toBeDefined();
      expect(variance.isFavorable).toBeDefined();
    });

    test('should get variance summary with analytics', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/variances/summary`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.totalVariances).toBeDefined();
      expect(data.favorableVariances).toBeDefined();
      expect(data.unfavorableVariances).toBeDefined();
      expect(data.totalCostImpact).toBeDefined();
      expect(data.byType).toBeDefined();

      // Verify summary calculations
      expect(typeof data.totalVariances).toBe('number');
      expect(data.totalVariances).toBeGreaterThanOrEqual(0);
      expect(data.favorableVariances + data.unfavorableVariances).toBe(data.totalVariances);
    });

    test('should filter variances by type', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/variances/EFFICIENCY`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      // All returned variances should be EFFICIENCY type
      data.forEach((variance: any) => {
        expect(variance.varianceType).toBe('EFFICIENCY');
      });
    });

    test('should reject invalid variance type', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/variances/INVALID_TYPE`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.status()).toBe(400);
      const data = await response.json();

      expect(data.error).toBe('ValidationError');
      expect(data.message).toContain('Invalid type');
    });
  });

  // ======================
  // TEST SUITE 5: PERFORMANCE QUERIES (3 tests)
  // ======================

  test.describe('5. Performance Queries', () => {
    test('should get all performance records for work order', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/performance`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThanOrEqual(4); // LABOR, MATERIAL, QUALITY, DOWNTIME

      // Verify all performance types are present
      const types = data.map((p: any) => p.performanceType);
      expect(types).toContain('LABOR');
      expect(types).toContain('MATERIAL');
      expect(types).toContain('QUALITY');
      expect(types).toContain('DOWNTIME');
    });

    test('should filter performance records by type using query param', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/performance?type=LABOR`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      // All returned records should be LABOR type
      data.forEach((record: any) => {
        expect(record.performanceType).toBe('LABOR');
      });
    });

    test('should filter performance records by type using path param', async () => {
      const response = await apiContext.get(`/work-order-execution/${testWorkOrderId}/performance/QUALITY`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      // All returned records should be QUALITY type
      data.forEach((record: any) => {
        expect(record.performanceType).toBe('QUALITY');
      });
    });
  });

  // ======================
  // TEST SUITE 6: REAL-TIME DASHBOARD (2 tests)
  // ======================

  test.describe('6. Real-time Dashboard', () => {
    test('should get execution dashboard with real-time stats', async () => {
      const response = await apiContext.get('/work-order-execution/dashboard', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      // Verify dashboard structure
      expect(data.statusCounts).toBeDefined();
      expect(data.statusCounts.CREATED).toBeDefined();
      expect(data.statusCounts.RELEASED).toBeDefined();
      expect(data.statusCounts.IN_PROGRESS).toBeDefined();
      expect(data.statusCounts.ON_HOLD).toBeDefined();
      expect(data.statusCounts.COMPLETED).toBeDefined();
      expect(data.statusCounts.CANCELLED).toBeDefined();

      expect(data.todayStats).toBeDefined();
      expect(data.todayStats.dispatched).toBeDefined();
      expect(data.todayStats.started).toBeDefined();
      expect(data.todayStats.completed).toBeDefined();

      expect(data.performanceStats).toBeDefined();
      expect(data.performanceStats.totalLaborHours).toBeDefined();
      expect(data.performanceStats.totalDowntimeMinutes).toBeDefined();

      expect(data.varianceStats).toBeDefined();
      expect(data.varianceStats.totalVariances).toBeDefined();
      expect(data.varianceStats.favorableCount).toBeDefined();
      expect(data.varianceStats.unfavorableCount).toBeDefined();

      // Verify all counts are numbers
      expect(typeof data.statusCounts.CREATED).toBe('number');
      expect(typeof data.todayStats.dispatched).toBe('number');
      expect(typeof data.performanceStats.totalLaborHours).toBe('number');
      expect(typeof data.varianceStats.totalVariances).toBe('number');
    });

    test('should filter dashboard by site ID', async () => {
      const response = await apiContext.get('/work-order-execution/dashboard?siteId=test-site-id', {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.statusCounts).toBeDefined();
      expect(data.todayStats).toBeDefined();
      expect(data.performanceStats).toBeDefined();
      expect(data.varianceStats).toBeDefined();
    });
  });

  // ======================
  // TEST SUITE 7: EDGE CASES & ERROR HANDLING (1 test)
  // ======================

  test.describe('7. Edge Cases & Error Handling', () => {
    test('should handle 404 for non-existent work order', async () => {
      const nonExistentId = 'non-existent-work-order-id';

      // Test status transition
      const statusResponse = await apiContext.post(`/work-order-execution/${nonExistentId}/status`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          newStatus: 'IN_PROGRESS',
          changedBy: 'operator-user-id'
        }
      });
      expect(statusResponse.status()).toBe(404);

      // Test performance record
      const perfResponse = await apiContext.post(`/work-order-execution/${nonExistentId}/performance`, {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          performanceType: 'LABOR',
          recordedBy: 'operator-user-id',
          laborHours: 8
        }
      });
      expect(perfResponse.status()).toBe(404);

      // Test variance summary
      const varianceResponse = await apiContext.get(`/work-order-execution/${nonExistentId}/variances/summary`, {
        headers: { 'Authorization': `Bearer ${authToken}` }
      });
      expect(varianceResponse.status()).toBe(404);
    });
  });
});
