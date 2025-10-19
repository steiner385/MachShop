import { test, expect, APIRequestContext, request } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let apiContext: APIRequestContext;
let authToken: string;

test.beforeAll(async () => {
  // Create API request context - use E2E backend server (port 3101)
  apiContext = await request.newContext({
    baseURL: 'http://localhost:3101',
  });

  // Login to get auth token
  const loginResponse = await apiContext.post('/api/v1/auth/login', {
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
});

test.afterAll(async () => {
  await apiContext.dispose();
  await prisma.$disconnect();
});

test.describe.configure({ mode: 'serial' });

test.describe('Equipment Hierarchy - ISA-95 Compliance', () => {
  let testSiteId: string;
  let testAreaId: string;
  let testWorkCenterId: string;
  let parentEquipmentId: string;
  let childEquipmentId: string;

  test.beforeAll(async () => {
    // Set up test data - Get existing site, area, and work center from seed
    const site = await prisma.site.findFirst({
      where: { siteCode: 'SITE-001' }
    });
    testSiteId = site!.id;

    const area = await prisma.area.findFirst({
      where: { areaCode: 'AREA-PROD-001' }
    });
    testAreaId = area!.id;

    const workCenter = await prisma.workCenter.findFirst({
      where: { name: 'CNC Machining Cell 1' }
    });
    testWorkCenterId = workCenter!.id;

    // Create test equipment for all tests to use (ensuring proper test isolation)
    // Delete any existing test equipment first and wait for completion
    await prisma.equipment.deleteMany({
      where: { equipmentNumber: { in: ['TEST-PARENT-001', 'TEST-CHILD-001'] } }
    });

    // Small delay to ensure deleteMany completes
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create parent equipment directly via Prisma (not API to avoid race conditions)
    const parentEquipment = await prisma.equipment.create({
      data: {
        equipmentNumber: 'TEST-PARENT-001',
        name: 'Test Parent Equipment',
        description: 'Parent equipment for hierarchy testing',
        equipmentClass: 'PRODUCTION',
        equipmentType: 'CNC_CELL',
        equipmentLevel: 1,
        status: 'AVAILABLE',
        currentState: 'IDLE',
        siteId: testSiteId,
        areaId: testAreaId,
        workCenterId: testWorkCenterId
      }
    });
    parentEquipmentId = parentEquipment.id;

    // Create child equipment directly via Prisma
    const childEquipment = await prisma.equipment.create({
      data: {
        equipmentNumber: 'TEST-CHILD-001',
        name: 'Test Child Equipment',
        description: 'Child equipment for hierarchy testing',
        equipmentClass: 'PRODUCTION',
        equipmentType: 'CNC_MACHINE',
        equipmentLevel: 2,
        parentEquipmentId: parentEquipmentId,
        status: 'AVAILABLE',
        currentState: 'IDLE',
        siteId: testSiteId,
        areaId: testAreaId,
        workCenterId: testWorkCenterId
      }
    });
    childEquipmentId = childEquipment.id;
  });

  test.afterAll(async () => {
    // Clean up test equipment
    if (childEquipmentId) {
      await prisma.equipment.delete({ where: { id: childEquipmentId } }).catch(() => {});
    }
    if (parentEquipmentId) {
      await prisma.equipment.delete({ where: { id: parentEquipmentId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });

  test('should create parent equipment at top level', async () => {
    // Verify the parent equipment created in beforeAll
    const response = await apiContext.get(`/api/v1/equipment/${parentEquipmentId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const equipment = await response.json();
    expect(equipment).toHaveProperty('id');
    expect(equipment.equipmentNumber).toBe('TEST-PARENT-001');
    expect(equipment.equipmentClass).toBe('PRODUCTION');
    expect(equipment.equipmentLevel).toBe(1);
    expect(equipment.parentEquipmentId).toBeNull();
  });

  test('should create child equipment under parent', async () => {
    // Verify the child equipment created in beforeAll
    const response = await apiContext.get(`/api/v1/equipment/${childEquipmentId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const equipment = await response.json();
    expect(equipment).toHaveProperty('id');
    expect(equipment.equipmentNumber).toBe('TEST-CHILD-001');
    expect(equipment.parentEquipmentId).toBe(parentEquipmentId);
    expect(equipment.equipmentLevel).toBe(2);
  });

  test('should retrieve equipment hierarchy (children)', async () => {
    const response = await apiContext.get(`/api/v1/equipment/${parentEquipmentId}/children`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const children = await response.json();
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThan(0);

    const testChild = children.find((c: any) => c.id === childEquipmentId);
    expect(testChild).toBeDefined();
    expect(testChild.equipmentNumber).toBe('TEST-CHILD-001');
  });

  test('should retrieve equipment ancestors (parent chain)', async () => {
    const response = await apiContext.get(`/api/v1/equipment/${childEquipmentId}/ancestors`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const ancestors = await response.json();
    expect(Array.isArray(ancestors)).toBe(true);
    expect(ancestors.length).toBeGreaterThan(0);

    const parent = ancestors.find((a: any) => a.id === parentEquipmentId);
    expect(parent).toBeDefined();
    expect(parent.equipmentNumber).toBe('TEST-PARENT-001');
  });

  test('should retrieve full equipment hierarchy tree', async () => {
    const response = await apiContext.get(`/api/v1/equipment/${parentEquipmentId}/hierarchy`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const hierarchy = await response.json();
    expect(Array.isArray(hierarchy)).toBe(true);
    expect(hierarchy.length).toBeGreaterThan(0);

    const descendant = hierarchy.find((h: any) => h.id === childEquipmentId);
    expect(descendant).toBeDefined();
  });

  test('should prevent circular references in hierarchy', async () => {
    // Try to set parent's parent to its own child (circular reference)
    const response = await apiContext.put(`/api/v1/equipment/${parentEquipmentId}`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        parentEquipmentId: childEquipmentId
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('circular reference');
  });

  test('should prevent equipment from being its own parent', async () => {
    const response = await apiContext.put(`/api/v1/equipment/${parentEquipmentId}`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        parentEquipmentId: parentEquipmentId
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('own parent');
  });

  test('should prevent deleting equipment with children', async () => {
    const response = await apiContext.delete(`/api/v1/equipment/${parentEquipmentId}`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('child equipment');
  });

  test('should support 5-level equipment hierarchy', async () => {
    // Clean up any existing test equipment from previous runs
    await prisma.equipment.deleteMany({
      where: { equipmentNumber: { in: ['TEST-LEVEL-3', 'TEST-LEVEL-4', 'TEST-LEVEL-5'] } }
    });

    // Create a 5-level hierarchy: Level1 (parent) → Level2 (child) → Level3 → Level4 → Level5
    // Start from childEquipmentId (Level 2) to build on existing 2-level hierarchy
    let currentParentId = childEquipmentId;
    const createdEquipment: string[] = [];

    for (let level = 3; level <= 5; level++) {
      const response = await apiContext.post('/api/v1/equipment', { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
          equipmentNumber: `TEST-LEVEL-${level}`,
          name: `Test Equipment Level ${level}`,
          equipmentClass: 'PRODUCTION',
          equipmentType: 'COMPONENT',
          equipmentLevel: level,
          parentEquipmentId: currentParentId,
          status: 'AVAILABLE',
          siteId: testSiteId
        }
      });

      expect(response.status()).toBe(201);
      const equipment = await response.json();
      currentParentId = equipment.id;
      createdEquipment.push(equipment.id);
    }

    // Verify the bottom level (Level 5) has 4 ancestors
    const response = await apiContext.get(`/api/v1/equipment/${currentParentId}/ancestors`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    expect(response.status()).toBe(200);
    const ancestors = await response.json();
    expect(ancestors.length).toBe(4); // Level 4, 3, 2, 1

    // Clean up the created equipment (from bottom to top)
    for (let i = createdEquipment.length - 1; i >= 0; i--) {
      await prisma.equipment.delete({ where: { id: createdEquipment[i] } });
    }
  });

  test('should filter equipment by class', async () => {
    const response = await apiContext.get('/api/v1/equipment?equipmentClass=PRODUCTION&includeRelations=true', { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.equipment).toBeDefined();
    expect(Array.isArray(result.equipment)).toBe(true);

    // All returned equipment should be PRODUCTION class
    result.equipment.forEach((eq: any) => {
      expect(eq.equipmentClass).toBe('PRODUCTION');
    });
  });

  test('should filter equipment by site and area', async () => {
    const response = await apiContext.get(`/api/v1/equipment?siteId=${testSiteId}&areaId=${testAreaId}`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.equipment).toBeDefined();
    expect(result.total).toBeGreaterThan(0);

    // All returned equipment should belong to the test site and area
    result.equipment.forEach((eq: any) => {
      expect(eq.siteId).toBe(testSiteId);
      expect(eq.areaId).toBe(testAreaId);
    });
  });

  test('should get top-level equipment (no parent)', async () => {
    const response = await apiContext.get('/api/v1/equipment?parentEquipmentId=null&includeRelations=true', { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.equipment).toBeDefined();

    // All returned equipment should have no parent
    result.equipment.forEach((eq: any) => {
      expect(eq.parentEquipmentId).toBeNull();
    });
  });

  test('should update equipment location in hierarchy', async () => {
    // Create or get a second area to test moving equipment
    await prisma.area.deleteMany({ where: { areaCode: 'TEST-AREA-002' } }); // Clean up first
    const newArea = await prisma.area.create({
      data: {
        areaCode: 'TEST-AREA-002',
        areaName: 'Test Area 2',
        siteId: testSiteId
      }
    });

    const response = await apiContext.put(`/api/v1/equipment/${childEquipmentId}`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        areaId: newArea.id
      }
    });

    expect(response.status()).toBe(200);
    const equipment = await response.json();
    expect(equipment.areaId).toBe(newArea.id);

    // Clean up
    await prisma.area.delete({ where: { id: newArea.id } });
  });

  test('should retrieve equipment with full relations', async () => {
    const response = await apiContext.get(`/api/v1/equipment/${childEquipmentId}?includeRelations=true`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const equipment = await response.json();

    // Should include parent equipment
    if (equipment.parentEquipment) {
      expect(equipment.parentEquipment.id).toBe(parentEquipmentId);
    }

    // Should include site, area, workCenter relations
    expect(equipment).toHaveProperty('site');
    expect(equipment).toHaveProperty('area');
    expect(equipment).toHaveProperty('workCenter');
  });
});

test.describe('Equipment State Management', () => {
  let testEquipmentId: string;

  test.beforeAll(async () => {
    // Get existing equipment from seed data
    const equipment = await prisma.equipment.findFirst({
      where: { equipmentNumber: 'CNC-001' }
    });
    testEquipmentId = equipment!.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should change equipment state from IDLE to RUNNING', async () => {
    const response = await apiContext.post(`/api/v1/equipment/${testEquipmentId}/state`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        newState: 'RUNNING',
        reason: 'Starting production run',
        workOrderId: null
      }
    });

    expect(response.status()).toBe(200);
    const equipment = await response.json();
    expect(equipment.currentState).toBe('RUNNING');
    expect(equipment.status).toBe('OPERATIONAL'); // Status should auto-update based on state
  });

  test('should retrieve equipment state history', async () => {
    const response = await apiContext.get(`/api/v1/equipment/${testEquipmentId}/state-history?limit=10`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const stateHistory = await response.json();
    expect(Array.isArray(stateHistory)).toBe(true);
    expect(stateHistory.length).toBeGreaterThan(0);

    // Should have timestamps
    const latestState = stateHistory[0];
    expect(latestState).toHaveProperty('stateStartTime');
    expect(latestState).toHaveProperty('newState');
    expect(latestState).toHaveProperty('previousState');
  });

  test('should track state duration', async () => {
    // Change state to MAINTENANCE
    await apiContext.post(`/api/v1/equipment/${testEquipmentId}/state`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        newState: 'MAINTENANCE',
        reason: 'Scheduled maintenance'
      }
    });

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Change state back to IDLE
    await apiContext.post(`/api/v1/equipment/${testEquipmentId}/state`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        newState: 'IDLE',
        reason: 'Maintenance complete'
      }
    });

    // Get state history
    const response = await apiContext.get(`/api/v1/equipment/${testEquipmentId}/state-history?limit=5`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    const stateHistory = await response.json();

    // Find the MAINTENANCE state entry
    const maintenanceState = stateHistory.find((s: any) => s.newState === 'MAINTENANCE');
    expect(maintenanceState).toBeDefined();
    expect(maintenanceState.stateEndTime).not.toBeNull();
    expect(maintenanceState.duration).toBeGreaterThan(0);
  });

  test('should reject invalid equipment state', async () => {
    const response = await apiContext.post(`/api/v1/equipment/${testEquipmentId}/state`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        newState: 'INVALID_STATE',
        reason: 'Testing invalid state'
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe('VALIDATION_ERROR');
  });

  test('should require newState field', async () => {
    const response = await apiContext.post(`/api/v1/equipment/${testEquipmentId}/state`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        reason: 'Missing newState field'
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe('VALIDATION_ERROR');
  });

  test('should filter state history by date range', async () => {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const response = await apiContext.get(
      `/api/v1/equipment/${testEquipmentId}/state-history?from=${oneHourAgo.toISOString()}&to=${now.toISOString()}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    expect(response.status()).toBe(200);
    const stateHistory = await response.json();
    expect(Array.isArray(stateHistory)).toBe(true);

    // All states should be within the date range
    stateHistory.forEach((state: any) => {
      const stateTime = new Date(state.stateStartTime);
      expect(stateTime.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
      expect(stateTime.getTime()).toBeLessThanOrEqual(now.getTime());
    });
  });

  test('should mark downtime states correctly', async () => {
    // Change to a downtime state (FAULT)
    await apiContext.post(`/api/v1/equipment/${testEquipmentId}/state`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        newState: 'FAULT',
        reason: 'Equipment malfunction'
      }
    });

    // Get state history
    const response = await apiContext.get(`/api/v1/equipment/${testEquipmentId}/state-history?limit=1`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    const stateHistory = await response.json();

    const faultState = stateHistory[0];
    expect(faultState.newState).toBe('FAULT');
    expect(faultState.downtime).toBe(true); // FAULT should be marked as downtime
  });
});

test.describe('OEE Calculations', () => {
  let testEquipmentId: string;

  test.beforeAll(async () => {
    // Get existing equipment from seed data
    const equipment = await prisma.equipment.findFirst({
      where: { equipmentNumber: 'CNC-001' }
    });
    testEquipmentId = equipment!.id;
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should record OEE performance data', async () => {
    const now = new Date();
    const shiftStart = new Date(now.getTime() - 8 * 60 * 60 * 1000); // 8 hours ago

    const response = await apiContext.post(`/api/v1/equipment/${testEquipmentId}/oee`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        periodStart: shiftStart.toISOString(),
        periodEnd: now.toISOString(),
        periodType: 'SHIFT',
        plannedProductionTime: 28800, // 8 hours in seconds
        idealCycleTime: 3600, // 1 hour per unit
        totalUnitsProduced: 7,
        targetProduction: 8,
        goodUnits: 6,
        rejectedUnits: 1,
        scrapUnits: 0,
        reworkUnits: 0
      }
    });

    expect(response.status()).toBe(201);
    const performanceLog = await response.json();

    expect(performanceLog).toHaveProperty('oee');
    expect(performanceLog).toHaveProperty('availability');
    expect(performanceLog).toHaveProperty('performance');
    expect(performanceLog).toHaveProperty('quality');

    // OEE should be calculated
    expect(performanceLog.oee).toBeGreaterThan(0);
    expect(performanceLog.oee).toBeLessThanOrEqual(100);

    // Quality should be 6/7 ≈ 85.7%
    expect(performanceLog.quality).toBeCloseTo(85.7, 1);
  });

  test('should retrieve OEE performance logs', async () => {
    const response = await apiContext.get(`/api/v1/equipment/${testEquipmentId}/oee?periodType=SHIFT&limit=10`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    expect(response.status()).toBe(200);
    const performanceLogs = await response.json();
    expect(Array.isArray(performanceLogs)).toBe(true);

    if (performanceLogs.length > 0) {
      const log = performanceLogs[0];
      expect(log).toHaveProperty('oee');
      expect(log).toHaveProperty('periodType');
      expect(log.periodType).toBe('SHIFT');
    }
  });

  test('should get current/latest OEE', async () => {
    const response = await apiContext.get(`/api/v1/equipment/${testEquipmentId}/oee/current`, { headers: { 'Authorization': `Bearer ${authToken}` } });

    if (response.status() === 200) {
      const currentOEE = await response.json();
      expect(currentOEE).toHaveProperty('oee');
      expect(currentOEE).toHaveProperty('availability');
      expect(currentOEE).toHaveProperty('performance');
      expect(currentOEE).toHaveProperty('quality');
    } else {
      // No OEE data yet - that's also acceptable
      expect(response.status()).toBe(404);
    }
  });

  test('should get aggregated OEE data', async () => {
    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const response = await apiContext.get(
      `/api/v1/equipment/${testEquipmentId}/oee?aggregate=true&periodType=SHIFT&from=${oneWeekAgo.toISOString()}&to=${now.toISOString()}`,
      { headers: { 'Authorization': `Bearer ${authToken}` } }
    );

    expect(response.status()).toBe(200);
    const aggregated = await response.json();

    expect(aggregated).toHaveProperty('periods');
    expect(aggregated).toHaveProperty('average');
    expect(aggregated).toHaveProperty('best');
    expect(aggregated).toHaveProperty('worst');

    expect(aggregated.average).toHaveProperty('oee');
    expect(aggregated.average).toHaveProperty('availability');
    expect(aggregated.average).toHaveProperty('performance');
    expect(aggregated.average).toHaveProperty('quality');
  });

  test('should reject OEE data with missing fields', async () => {
    const response = await apiContext.post(`/api/v1/equipment/${testEquipmentId}/oee`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        periodStart: new Date().toISOString(),
        periodEnd: new Date().toISOString(),
        // Missing required fields
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.error).toBe('VALIDATION_ERROR');
  });

  test('should detect OEE anomalies', async () => {
    const now = new Date();
    const shiftStart = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    // Record performance with impossible metrics (>100% performance)
    const response = await apiContext.post(`/api/v1/equipment/${testEquipmentId}/oee`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        periodStart: shiftStart.toISOString(),
        periodEnd: now.toISOString(),
        periodType: 'SHIFT',
        plannedProductionTime: 28800,
        idealCycleTime: 3600,
        totalUnitsProduced: 20, // Impossible: would require >20 hours
        targetProduction: 8,
        goodUnits: 20,
        rejectedUnits: 0,
        scrapUnits: 0,
        reworkUnits: 0
      }
    });

    expect(response.status()).toBe(201);
    const performanceLog = await response.json();

    // Should flag as anomaly
    expect(performanceLog.hasAnomalies).toBe(true);
  });

  test('should update equipment OEE fields after recording performance', async () => {
    const now = new Date();
    const shiftStart = new Date(now.getTime() - 8 * 60 * 60 * 1000);

    // Record performance
    await apiContext.post(`/api/v1/equipment/${testEquipmentId}/oee`, { headers: { 'Authorization': `Bearer ${authToken}` }, data: {
        periodStart: shiftStart.toISOString(),
        periodEnd: now.toISOString(),
        periodType: 'SHIFT',
        plannedProductionTime: 28800,
        idealCycleTime: 3600,
        totalUnitsProduced: 7,
        targetProduction: 8,
        goodUnits: 7,
        rejectedUnits: 0,
        scrapUnits: 0,
        reworkUnits: 0
      }
    });

    // Get equipment details
    const response = await apiContext.get(`/api/v1/equipment/${testEquipmentId}`, { headers: { 'Authorization': `Bearer ${authToken}` } });
    expect(response.status()).toBe(200);

    const equipment = await response.json();

    // Equipment should have updated OEE metrics
    expect(equipment.oee).toBeGreaterThan(0);
    expect(equipment.availability).toBeDefined();
    expect(equipment.performance).toBeDefined();
    expect(equipment.quality).toBeDefined();
  });
});
