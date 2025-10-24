import { test, expect, APIRequestContext, request } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
let apiContext: APIRequestContext;
let authToken: string;

test.beforeAll(async () => {
  // Fix: Use correct baseURL pattern with trailing slash to match L2 Equipment tests
  apiContext = await request.newContext({
    baseURL: 'http://localhost:3101/api/v1/',
  });

  // Login to get auth token - remove /api/v1/ prefix to match correct pattern
  const loginResponse = await apiContext.post('auth/login', {
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

test.describe('Material Class Hierarchy - ISA-95 Compliance', () => {
  let parentClassId: string;
  let childClassId: string;

  test('should retrieve all material classes', async () => {
    const response = await apiContext.get('materials/classes', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const classes = await response.json();
    expect(Array.isArray(classes)).toBe(true);
    expect(classes.length).toBeGreaterThan(0);
  });

  test('should retrieve material class by ID with relations', async () => {
    // Get the METAL class from seed data
    const metalClass = await prisma.materialClass.findFirst({
      where: { classCode: 'METAL' }
    });
    expect(metalClass).toBeDefined();

    const response = await apiContext.get(`materials/classes/${metalClass!.id}?includeRelations=true`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const classData = await response.json();
    expect(classData.id).toBe(metalClass!.id);
    expect(classData.classCode).toBe('METAL');
    expect(classData).toHaveProperty('parentClass');
    expect(classData).toHaveProperty('materials');
  });

  test('should retrieve material class hierarchy chain', async () => {
    // Get the METAL class (child of RAW)
    const metalClass = await prisma.materialClass.findFirst({
      where: { classCode: 'METAL' }
    });

    const response = await apiContext.get(`materials/classes/${metalClass!.id}/hierarchy`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const hierarchy = await response.json();
    expect(Array.isArray(hierarchy)).toBe(true);
    expect(hierarchy.length).toBeGreaterThan(0);

    // Should include parent class (RAW)
    const rawClass = hierarchy.find((c: any) => c.classCode === 'RAW');
    expect(rawClass).toBeDefined();
  });

  test('should retrieve child material classes', async () => {
    // Get the RAW class (parent of METAL)
    const rawClass = await prisma.materialClass.findFirst({
      where: { classCode: 'RAW' }
    });

    const response = await apiContext.get(`materials/classes/${rawClass!.id}/children`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const children = await response.json();
    expect(Array.isArray(children)).toBe(true);
    expect(children.length).toBeGreaterThan(0);

    // Should include METAL class
    const metalChild = children.find((c: any) => c.classCode === 'METAL');
    expect(metalChild).toBeDefined();
  });
});

test.describe('Material Definition Management', () => {
  let testMaterialId: string;

  test('should retrieve all material definitions', async () => {
    const response = await apiContext.get('materials/definitions', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const definitions = await response.json();
    expect(Array.isArray(definitions)).toBe(true);
    expect(definitions.length).toBeGreaterThan(0);
  });

  test('should filter material definitions by material class', async () => {
    // Get METAL class ID
    const metalClass = await prisma.materialClass.findFirst({
      where: { classCode: 'METAL' }
    });

    const response = await apiContext.get(`materials/definitions?materialClassId=${metalClass!.id}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const definitions = await response.json();
    expect(Array.isArray(definitions)).toBe(true);

    // All returned materials should belong to METAL class
    definitions.forEach((mat: any) => {
      expect(mat.materialClassId).toBe(metalClass!.id);
    });
  });

  test('should filter material definitions by material type', async () => {
    const response = await apiContext.get('materials/definitions?materialType=RAW_MATERIAL', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const definitions = await response.json();
    expect(Array.isArray(definitions)).toBe(true);

    // All returned materials should be RAW_MATERIAL type
    definitions.forEach((mat: any) => {
      expect(mat.materialType).toBe('RAW_MATERIAL');
    });
  });

  test('should retrieve material definition by ID', async () => {
    // Get aluminum alloy from seed data
    const aluminum = await prisma.materialDefinition.findFirst({
      where: { materialNumber: 'AL-6061-T6-BAR' }
    });

    if (!aluminum) {
      throw new Error('Test material AL-6061-T6-BAR not found in database. Ensure seed data is loaded.');
    }

    testMaterialId = aluminum.id;

    const response = await apiContext.get(`materials/definitions/${testMaterialId}?includeRelations=true`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const material = await response.json();
    expect(material.id).toBe(testMaterialId);
    expect(material.materialNumber).toBe('AL-6061-T6-BAR');
    expect(material).toHaveProperty('materialClass');
    expect(material).toHaveProperty('lots');
  });

  test('should retrieve material definition by material number', async () => {
    const response = await apiContext.get('materials/definitions/number/AL-6061-T6-BAR', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const material = await response.json();
    expect(material.materialNumber).toBe('AL-6061-T6-BAR');
    expect(material.description).toContain('Aluminum');
  });

  test('should update material definition', async () => {
    const updatedDescription = 'Updated Material Description - Test';

    const response = await apiContext.put(`materials/definitions/${testMaterialId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        description: updatedDescription
      }
    });

    expect(response.status()).toBe(200);
    const material = await response.json();
    expect(material.description).toBe(updatedDescription);
  });

  test('should retrieve material properties', async () => {
    const response = await apiContext.get(`materials/definitions/${testMaterialId}/properties`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const properties = await response.json();
    expect(Array.isArray(properties)).toBe(true);
  });

  test('should create material property', async () => {
    const response = await apiContext.post('materials/properties', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        materialId: testMaterialId,
        propertyName: 'Test Property',
        propertyType: 'CHEMICAL',
        propertyValue: '99.5%',
        propertyUnit: 'percent',
        testMethod: 'ASTM-TEST',
        minValue: 99.0,
        maxValue: 100.0
      }
    });

    expect(response.status()).toBe(201);
    const property = await response.json();
    expect(property.propertyName).toBe('Test Property');
    expect(property.propertyType).toBe('CHEMICAL');
  });
});

test.describe('Material Lot Management', () => {
  let testLotId: string;
  let testMaterialId: string;

  test.beforeAll(async () => {
    // Get test material
    const material = await prisma.materialDefinition.findFirst({
      where: { materialNumber: 'AL-6061-T6-BAR' }
    });
    testMaterialId = material!.id;

    // Get test lot
    const lot = await prisma.materialLot.findFirst({
      where: { lotNumber: 'AL-20240115-001' }
    });
    testLotId = lot!.id;
  });

  test('should retrieve all material lots', async () => {
    const response = await apiContext.get('materials/lots', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lots = await response.json();
    expect(Array.isArray(lots)).toBe(true);
    expect(lots.length).toBeGreaterThan(0);
  });

  test('should filter lots by material ID', async () => {
    const response = await apiContext.get(`materials/lots?materialId=${testMaterialId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lots = await response.json();
    expect(Array.isArray(lots)).toBe(true);

    // All lots should belong to the test material
    lots.forEach((lot: any) => {
      expect(lot.materialId).toBe(testMaterialId);
    });
  });

  test('should filter lots by status', async () => {
    const response = await apiContext.get('materials/lots?status=AVAILABLE', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lots = await response.json();
    expect(Array.isArray(lots)).toBe(true);

    // All lots should have AVAILABLE status
    lots.forEach((lot: any) => {
      expect(lot.status).toBe('AVAILABLE');
    });
  });

  test('should filter lots by state', async () => {
    const response = await apiContext.get('materials/lots?state=APPROVED', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lots = await response.json();
    expect(Array.isArray(lots)).toBe(true);

    // All lots should have APPROVED state
    lots.forEach((lot: any) => {
      expect(lot.state).toBe('APPROVED');
    });
  });

  test('should filter lots by quality status', async () => {
    const response = await apiContext.get('materials/lots?qualityStatus=APPROVED', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lots = await response.json();
    expect(Array.isArray(lots)).toBe(true);

    // All lots should have APPROVED quality status
    lots.forEach((lot: any) => {
      expect(lot.qualityStatus).toBe('APPROVED');
    });
  });

  test('should retrieve lot by ID with relations', async () => {
    const response = await apiContext.get(`materials/lots/${testLotId}?includeRelations=true`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lot = await response.json();
    expect(lot.id).toBe(testLotId);
    expect(lot).toHaveProperty('material');
    expect(lot).toHaveProperty('stateHistory');
  });

  test('should retrieve lot by lot number', async () => {
    const response = await apiContext.get('materials/lots/number/AL-20240115-001', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lot = await response.json();
    expect(lot.lotNumber).toBe('AL-20240115-001');
  });

  test('should update material lot', async () => {
    const response = await apiContext.put(`materials/lots/${testLotId}`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        currentQuantity: 1400.0
      }
    });

    expect(response.status()).toBe(200);
    const lot = await response.json();
    expect(lot.currentQuantity).toBe(1400.0);
  });

  test('should retrieve lots expiring soon', async () => {
    const response = await apiContext.get('materials/lots/expiring/soon?daysAhead=30', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const expiringLots = await response.json();
    expect(Array.isArray(expiringLots)).toBe(true);

    // All lots should have expiration dates within 30 days
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    expiringLots.forEach((lot: any) => {
      if (lot.expirationDate) {
        const expirationDate = new Date(lot.expirationDate);
        expect(expirationDate.getTime()).toBeLessThanOrEqual(thirtyDaysFromNow.getTime());
        expect(expirationDate.getTime()).toBeGreaterThan(now.getTime());
      }
    });
  });

  test('should retrieve expired lots', async () => {
    const response = await apiContext.get('materials/lots/expired/all', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const expiredLots = await response.json();
    expect(Array.isArray(expiredLots)).toBe(true);

    // All lots should have expiration dates in the past
    const now = new Date();
    expiredLots.forEach((lot: any) => {
      if (lot.expirationDate) {
        const expirationDate = new Date(lot.expirationDate);
        expect(expirationDate.getTime()).toBeLessThan(now.getTime());
      }
    });
  });

  test('should retrieve material lot statistics', async () => {
    const response = await apiContext.get('materials/lots/statistics/summary', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const stats = await response.json();
    expect(stats).toHaveProperty('totalLots');
    expect(stats).toHaveProperty('lotsByStatus');
    expect(stats).toHaveProperty('lotsByState');
    expect(stats).toHaveProperty('lotsByQualityStatus');
    expect(stats.totalLots).toBeGreaterThan(0);
  });
});

test.describe('Material Sublot and Split/Merge Operations', () => {
  let testLotId: string;
  let testSublotId: string;

  test.beforeAll(async () => {
    // Get a lot with sufficient quantity
    const lot = await prisma.materialLot.findFirst({
      where: {
        lotNumber: 'AL-20240115-001',
        currentQuantity: { gte: 100 }
      }
    });
    testLotId = lot!.id;
  });

  test('should split material lot into sublot', async () => {
    const sublotNumber = `SUBLOT-TEST-${Date.now()}`;

    const response = await apiContext.post(`materials/lots/${testLotId}/split`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        sublotNumber: sublotNumber,
        quantity: 50.0
      }
    });

    expect(response.status()).toBe(201);
    const sublot = await response.json();
    expect(sublot.sublotNumber).toBe(sublotNumber);
    expect(sublot.quantity).toBe(50.0);
    expect(sublot.operationType).toBe('SPLIT');
    testSublotId = sublot.id;
  });

  test('should retrieve sublots for a lot', async () => {
    const response = await apiContext.get(`materials/lots/${testLotId}/sublots`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const sublots = await response.json();
    expect(Array.isArray(sublots)).toBe(true);
    expect(sublots.length).toBeGreaterThan(0);
  });

  test('should reject split with insufficient quantity', async () => {
    const response = await apiContext.post(`materials/lots/${testLotId}/split`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        sublotNumber: 'SUBLOT-FAIL',
        quantity: 999999.0 // Exceeds available quantity
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('Insufficient quantity');
  });

  test('should merge sublots back into parent lot', async () => {
    // Get sublots for the test lot
    const sublotsResponse = await apiContext.get(`materials/lots/${testLotId}/sublots`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const sublots = await sublotsResponse.json();

    if (sublots.length > 0) {
      const sublotIds = [sublots[0].id];

      const response = await apiContext.post('materials/lots/merge', {
        headers: { 'Authorization': `Bearer ${authToken}` },
        data: {
          sublotIds: sublotIds
        }
      });

      expect(response.status()).toBe(200);
      const result = await response.json();
      expect(result).toHaveProperty('mergedQuantity');
      expect(result.mergedQuantity).toBeGreaterThan(0);
    }
  });
});

test.describe('Material Genealogy and Traceability', () => {
  let parentLotId: string;
  let childLotId: string;
  let workOrderId: string;

  test.beforeAll(async () => {
    // Get parent and child lots from seed data
    const parentLot = await prisma.materialLot.findFirst({
      where: { lotNumber: 'AL-20240115-001' }
    });
    parentLotId = parentLot!.id;

    const childLot = await prisma.materialLot.findFirst({
      where: { lotNumber: 'WIP-2024-002' }
    });
    childLotId = childLot!.id;

    // Get work order
    const workOrder = await prisma.workOrder.findFirst();
    workOrderId = workOrder!.id;
  });

  test('should retrieve lot genealogy (direct parents and children)', async () => {
    const response = await apiContext.get(`materials/lots/${parentLotId}/genealogy`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const genealogy = await response.json();
    expect(genealogy).toHaveProperty('produced');
    expect(genealogy).toHaveProperty('consumed');
    expect(Array.isArray(genealogy.produced)).toBe(true);
    expect(Array.isArray(genealogy.consumed)).toBe(true);
  });

  test('should retrieve full genealogy tree (forward traceability)', async () => {
    const response = await apiContext.get(`materials/lots/${parentLotId}/genealogy/tree?direction=forward`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const tree = await response.json();
    expect(Array.isArray(tree)).toBe(true);
  });

  test('should retrieve full genealogy tree (backward traceability)', async () => {
    const response = await apiContext.get(`materials/lots/${childLotId}/genealogy/tree?direction=backward`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const tree = await response.json();
    expect(Array.isArray(tree)).toBe(true);
  });

  test('should create genealogy record (material consumption)', async () => {
    // Create a new test lot for consumption
    const testMaterial = await prisma.materialDefinition.findFirst();
    const newLot = await prisma.materialLot.create({
      data: {
        lotNumber: `TEST-GENEALOGY-${Date.now()}`,
        materialId: testMaterial!.id,
        originalQuantity: 100.0,
        currentQuantity: 100.0,
        unitOfMeasure: 'kg',
        receivedDate: new Date(),
        status: 'AVAILABLE',
        state: 'APPROVED',
        qualityStatus: 'APPROVED'
      }
    });

    const response = await apiContext.post('materials/genealogy', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        parentLotId: newLot.id,
        childLotId: childLotId,
        relationshipType: 'CONSUMED_BY',
        quantityConsumed: 10.0,
        quantityProduced: 5.0,
        workOrderId: workOrderId,
        processDate: new Date().toISOString()
      }
    });

    expect(response.status()).toBe(201);
    const genealogy = await response.json();
    expect(genealogy.parentLotId).toBe(newLot.id);
    expect(genealogy.childLotId).toBe(childLotId);
    expect(genealogy.relationshipType).toBe('CONSUMED_BY');
    expect(genealogy.quantityConsumed).toBe(10.0);

    // Clean up
    await prisma.materialLot.delete({ where: { id: newLot.id } });
  });

  test('should require all mandatory fields for genealogy record', async () => {
    const response = await apiContext.post('materials/genealogy', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        parentLotId: parentLotId,
        childLotId: childLotId
        // Missing required fields
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('required');
  });
});

test.describe('Material State Management', () => {
  let testLotId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    // Get test lot
    const lot = await prisma.materialLot.findFirst({
      where: { lotNumber: 'AL-20240115-001' }
    });
    testLotId = lot!.id;

    // Get test user
    const user = await prisma.user.findFirst();
    testUserId = user!.id;
  });

  test('should retrieve lot state history', async () => {
    const response = await apiContext.get(`materials/lots/${testLotId}/history`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const history = await response.json();
    expect(Array.isArray(history)).toBe(true);

    if (history.length > 0) {
      const stateRecord = history[0];
      expect(stateRecord).toHaveProperty('previousState');
      expect(stateRecord).toHaveProperty('newState');
      expect(stateRecord).toHaveProperty('transitionType');
      expect(stateRecord).toHaveProperty('transitionDate');
    }
  });

  test('should update lot state with history tracking', async () => {
    const response = await apiContext.put(`materials/lots/${testLotId}/state`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        state: 'ISSUED',
        transitionType: 'ISSUE',
        userId: testUserId,
        reason: 'Issued for production'
      }
    });

    expect(response.status()).toBe(200);
    const lot = await response.json();
    expect(lot.state).toBe('ISSUED');

    // Verify history was created
    const historyResponse = await apiContext.get(`materials/lots/${testLotId}/history`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });
    const history = await historyResponse.json();
    const issueRecord = history.find((h: any) => h.newState === 'ISSUED');
    expect(issueRecord).toBeDefined();
    expect(issueRecord.transitionType).toBe('ISSUE');
  });

  test('should require mandatory fields for state update', async () => {
    const response = await apiContext.put(`materials/lots/${testLotId}/state`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        state: 'CONSUMED'
        // Missing transitionType and userId
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('required');
  });
});

test.describe('Quality Management', () => {
  let testLotId: string;
  let testUserId: string;

  test.beforeAll(async () => {
    // Create a test lot for quality operations
    const testMaterial = await prisma.materialDefinition.findFirst();
    const testLot = await prisma.materialLot.create({
      data: {
        lotNumber: `TEST-QUALITY-${Date.now()}`,
        materialId: testMaterial!.id,
        originalQuantity: 100.0,
        currentQuantity: 100.0,
        unitOfMeasure: 'kg',
        receivedDate: new Date(),
        status: 'AVAILABLE',
        state: 'APPROVED',
        qualityStatus: 'APPROVED'
      }
    });
    testLotId = testLot.id;

    // Get test user
    const user = await prisma.user.findFirst();
    testUserId = user!.id;
  });

  test.afterAll(async () => {
    // Clean up test lot
    await prisma.materialLot.delete({ where: { id: testLotId } }).catch(() => {});
  });

  test('should quarantine material lot', async () => {
    const response = await apiContext.post(`materials/lots/${testLotId}/quarantine`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        userId: testUserId,
        reason: 'Failed quality inspection'
      }
    });

    expect(response.status()).toBe(200);
    const lot = await response.json();
    expect(lot.state).toBe('QUARANTINED');
    expect(lot.status).toBe('QUARANTINE');
    expect(lot.qualityStatus).toBe('ON_HOLD');
  });

  test('should release material lot from quarantine', async () => {
    const response = await apiContext.post(`materials/lots/${testLotId}/release`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        userId: testUserId,
        reason: 'Re-inspection passed'
      }
    });

    expect(response.status()).toBe(200);
    const lot = await response.json();
    expect(lot.state).toBe('APPROVED');
    expect(lot.status).toBe('AVAILABLE');
    expect(lot.qualityStatus).toBe('APPROVED');
  });

  test('should reject material lot', async () => {
    const response = await apiContext.post(`materials/lots/${testLotId}/reject`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        userId: testUserId,
        reason: 'Material contamination detected'
      }
    });

    expect(response.status()).toBe(200);
    const lot = await response.json();
    expect(lot.qualityStatus).toBe('REJECTED');
    expect(lot.status).toBe('SCRAPPED');
  });

  test('should require userId and reason for quarantine', async () => {
    const response = await apiContext.post(`materials/lots/${testLotId}/quarantine`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        // Missing required fields
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('required');
  });

  test('should require userId and reason for release', async () => {
    const response = await apiContext.post(`materials/lots/${testLotId}/release`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        userId: testUserId
        // Missing reason
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('required');
  });

  test('should require userId and reason for reject', async () => {
    const response = await apiContext.post(`materials/lots/${testLotId}/reject`, {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        reason: 'Missing userId'
        // Missing userId
      }
    });

    expect(response.status()).toBe(400);
    const error = await response.json();
    expect(error.message).toContain('required');
  });
});

test.describe('Work Order Integration', () => {
  let testWorkOrderId: string;

  test.beforeAll(async () => {
    // Get test work order
    const workOrder = await prisma.workOrder.findFirst();
    testWorkOrderId = workOrder!.id;
  });

  test('should retrieve material usage by work order', async () => {
    const response = await apiContext.get(`materials/work-orders/${testWorkOrderId}/usage`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const usage = await response.json();
    expect(usage).toHaveProperty('consumed');
    expect(usage).toHaveProperty('produced');
    expect(Array.isArray(usage.consumed)).toBe(true);
    expect(Array.isArray(usage.produced)).toBe(true);
  });
});

test.describe('Legacy Routes - Backward Compatibility', () => {
  test('should support legacy inventory route', async () => {
    const response = await apiContext.get('materials/inventory', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const lots = await response.json();
    expect(Array.isArray(lots)).toBe(true);
  });

  test('should support legacy consumption route', async () => {
    // Get a test lot
    const lot = await prisma.materialLot.findFirst({
      where: { status: 'AVAILABLE', currentQuantity: { gte: 10 } }
    });

    // Get test user and work order
    const user = await prisma.user.findFirst();
    const workOrder = await prisma.workOrder.findFirst();

    const response = await apiContext.post('materials/consumption', {
      headers: { 'Authorization': `Bearer ${authToken}` },
      data: {
        lotId: lot!.id,
        quantity: 5.0,
        workOrderId: workOrder!.id,
        userId: user!.id
      }
    });

    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result).toHaveProperty('message');
    expect(result.message).toContain('consumption recorded');
  });
});
