/**
 * B2M Integration E2E Tests
 * Task 1.8: Level 4 (ERP) Integration Model
 *
 * Tests for ISA-95 B2M (Business to Manufacturing) integration flows
 * including production performance export, material transactions, and personnel sync
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
// Use E2E backend server on port 3101
const BASE_URL = process.env.API_URL || 'http://localhost:3101';

let authToken: string;
let testConfigId: string;
let testWorkOrderId: string;
let testPartId: string;
let testUserId: string;

test.beforeAll(async () => {
  // Get authentication token by logging in via API
  const apiContext = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const loginResponse = await apiContext.post('/api/v1/auth/login', {
    data: {
      username: 'admin',
      password: 'password123', // Correct password for test users
    },
  });

  if (!loginResponse.ok()) {
    throw new Error(`API login failed during test setup. Status: ${loginResponse.status()}. Response: ${await loginResponse.text()}. Ensure E2E backend is running on port 3101.`);
  }

  const loginData = await loginResponse.json();
  authToken = loginData.token;

  // Clean up any existing test data from previous runs
  await prisma.integrationConfig.deleteMany({
    where: { name: 'TEST_ERP_B2M' },
  });
  await prisma.part.deleteMany({
    where: { partNumber: 'B2M-TEST-PART-001' },  // Fix #14: Match actual partNumber used in test
  });
  await prisma.user.deleteMany({
    where: { username: 'b2m-test-user' },
  });

  // Create test integration config
  const config = await prisma.integrationConfig.create({
    data: {
      name: 'TEST_ERP_B2M',
      displayName: 'Test ERP for B2M',
      type: 'ERP',
      enabled: true,
      config: {
        baseUrl: 'https://test.erp.com',
        apiKey: 'test-api-key',
      },
    },
  });
  testConfigId = config.id;

  // Create test part
  const part = await prisma.part.create({
    data: {
      partNumber: 'B2M-TEST-PART-001',
      partName: 'B2M Test Part 001',  // Required field
      partType: 'COMPONENT',  // Required field - FIX #11
      description: 'Test Part for B2M Integration',
      unitOfMeasure: 'EA',
    },
  });
  testPartId = part.id;

  // Fix #18: Get admin user ID for createdBy field
  const adminUser = await prisma.user.findUnique({
    where: { username: 'admin' },
    select: { id: true },
  });
  if (!adminUser) throw new Error('Admin user not found');

  // Create test work order with completed status
  // Fix #16: Use relation syntax for partId instead of direct assignment
  const workOrder = await prisma.workOrder.create({
    data: {
      workOrderNumber: 'WO-B2M-TEST-001',
      part: {
        connect: { id: testPartId }
      },
      createdBy: {
        connect: { id: adminUser.id }
      },
      partNumber: part.partNumber,
      quantity: 10,
      quantityCompleted: 9, // Track completed quantity
      quantityScrapped: 1, // Track scrapped quantity
      status: 'COMPLETED',
      priority: 'NORMAL',
      customerOrder: 'SO-12345',
      dueDate: new Date('2025-10-15'),
      startedAt: new Date('2025-10-02'),
      completedAt: new Date('2025-10-14'),
      // Required for B2M export - actual production dates
      actualStartDate: new Date('2025-10-02'),
      actualEndDate: new Date('2025-10-14'),
    },
  });
  testWorkOrderId = workOrder.id;

  // Create work performance records (for production performance export)
  await prisma.workPerformance.createMany({
    data: [
      {
        workOrderId: testWorkOrderId,
        performanceType: 'QUALITY',
        quantityProduced: 10,
        quantityGood: 9,
        quantityScrap: 1,
        quantityRework: 0,
        recordedBy: 'test-operator',
      },
      {
        workOrderId: testWorkOrderId,
        performanceType: 'LABOR',
        laborHours: 8.5,
        laborCost: 425.0,
        laborEfficiency: 95.5,
        recordedBy: 'test-operator',
      },
      {
        workOrderId: testWorkOrderId,
        performanceType: 'MATERIAL',
        quantityConsumed: 12,
        quantityPlanned: 10,
        totalCost: 120.0,
        recordedBy: 'test-operator',
      },
    ],
  });

  // Create inventory record for the part
  const inventory = await prisma.inventory.create({
    data: {
      partId: testPartId,
      location: 'WH-01',
      lotNumber: 'LOT-2025-001',
      quantity: 100,
      unitOfMeasure: 'EA',
      unitCost: 10.0,
      receivedDate: new Date('2025-10-01'),
    },
  });

  // Create material transactions for work order
  await prisma.materialTransaction.create({
    data: {
      inventoryId: inventory.id,
      workOrderId: testWorkOrderId,
      quantity: 12,
      transactionType: 'ISSUE', // Changed from CONSUMPTION to valid enum value
      unitOfMeasure: 'EA',
      reference: 'Material consumed for B2M test work order',
      transactionDate: new Date('2025-10-10'),
    },
  });

  // Create test user
  const user = await prisma.user.create({
    data: {
      username: 'b2m-test-user',
      firstName: 'B2M',
      lastName: 'Test User',
      email: 'b2m.test@company.com',
      passwordHash: '$2b$10$abcdefghijklmnopqrstuv', // Dummy hashed password for testing
      employeeNumber: 'EMP-B2M-001',
      roles: ['Production Operator'],
      permissions: ['workorders.read', 'workorders.execute'],
      isActive: true,
    },
  });
  testUserId = user.id;
});

test.afterAll(async () => {
  // Clean up test data
  await prisma.workPerformance.deleteMany({
    where: { workOrderId: testWorkOrderId },
  });

  await prisma.materialTransaction.deleteMany({
    where: { workOrderId: testWorkOrderId },
  });

  await prisma.productionPerformanceActual.deleteMany({
    where: { workOrderId: testWorkOrderId },
  });

  await prisma.eRPMaterialTransaction.deleteMany({
    where: { configId: testConfigId },
  });

  await prisma.personnelInfoExchange.deleteMany({
    where: { configId: testConfigId },
  });

  // Delete work performance records that reference the work order
  await prisma.workPerformance.deleteMany({
    where: { workOrderId: testWorkOrderId },
  });

  // Delete material transactions that reference the work order
  // Fix #15: MaterialTransaction model doesn't have partId field, only inventoryId and workOrderId
  await prisma.materialTransaction.deleteMany({
    where: { workOrderId: testWorkOrderId },
  });

  // Delete quality inspections that reference the work order
  await prisma.qualityInspection.deleteMany({
    where: { workOrderId: testWorkOrderId },
  });

  await prisma.workOrder.deleteMany({
    where: { id: testWorkOrderId },
  });

  // Delete schedule entries that reference the part
  await prisma.scheduleEntry.deleteMany({
    where: { partId: testPartId },
  });

  // Delete BOM items that reference the part (as parent or component)
  // Fix #17: Model name is BOMItem (capital letters), not bomItem
  // Fix #19: Field name is componentPartId, not childPartId
  await prisma.BOMItem.deleteMany({
    where: {
      OR: [
        { parentPartId: testPartId },
        { componentPartId: testPartId },
      ],
    },
  });

  // Delete inventory records before deleting the part (foreign key: inventory_partId_fkey)
  await prisma.inventory.deleteMany({
    where: { partId: testPartId },
  });

  await prisma.part.deleteMany({
    where: { id: testPartId },
  });

  // Fix #20: Delete NCRs before user (foreign key: ncrs_createdById_fkey)
  await prisma.nCR.deleteMany({
    where: { createdById: testUserId },
  });

  // Fix #22: Delete personnel certifications before user (foreign key: personnel_certifications_personnelId_fkey)
  await prisma.personnelCertification.deleteMany({
    where: { personnelId: testUserId },
  });

  // Fix #23: Delete personnel skill assignments before user (foreign key: personnel_skill_assignments_personnelId_fkey)
  await prisma.personnelSkillAssignment.deleteMany({
    where: { personnelId: testUserId },
  });

  // Fix #25: Delete personnel availability before user (foreign key: personnel_availability_personnelId_fkey)
  await prisma.personnelAvailability.deleteMany({
    where: { personnelId: testUserId },
  });

  // Delete quality inspections that reference the user (foreign key: quality_inspections_inspectorId_fkey)
  await prisma.qualityInspection.deleteMany({
    where: { inspectorId: testUserId },
  });

  await prisma.user.deleteMany({
    where: { id: testUserId },
  });

  await prisma.integrationConfig.deleteMany({
    where: { id: testConfigId },
  });

  await prisma.$disconnect();
});

// ============================================================================
// Production Performance Export Tests
// ============================================================================

// Force serial execution to prevent parallel test data conflicts - FIX #12
test.describe.configure({ mode: 'serial' });

test.describe('Production Performance Export', () => {
  test('should export work order production actuals to ERP', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/production-performance/export/${testWorkOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.messageId).toBeDefined();
    expect(body.data.workOrderId).toBe(testWorkOrderId);
    expect(body.data.status).toBe('PROCESSED');

    // Verify record was created in database
    const performanceActual = await prisma.productionPerformanceActual.findUnique({
      where: { messageId: body.data.messageId },
    });
    expect(performanceActual).toBeDefined();
    expect(performanceActual!.quantityProduced).toBe(10);
    expect(performanceActual!.quantityGood).toBe(9);
    expect(performanceActual!.quantityScrap).toBe(1);
    expect(performanceActual!.laborHoursActual).toBe(8.5);
  });

  test('should get production performance export status', async ({ request }) => {
    // First export
    const exportResponse = await request.post(
      `${BASE_URL}/api/v1/b2m/production-performance/export/${testWorkOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
        },
      }
    );
    const exportBody = await exportResponse.json();
    const messageId = exportBody.data.messageId;

    // Get status
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/production-performance/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.messageId).toBe(messageId);
    expect(body.data.status).toBe('PROCESSED');
    expect(body.data.workOrder).toBeDefined();
  });

  test('should get all exports for a work order', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/production-performance/work-order/${testWorkOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);
  });

  test('should reject export for work order without actual dates', async ({ request }) => {
    // Create work order without completion
    const incompleteWO = await prisma.workOrder.create({
      data: {
        workOrderNumber: 'WO-B2M-INCOMPLETE',
        part: {
          connect: { id: testPartId }
        },
        createdBy: {
          connect: { id: testUserId }
        },
        partNumber: 'B2M-TEST-PART-001',
        quantity: 5,
        status: 'IN_PROGRESS',
        priority: 'NORMAL',
        dueDate: new Date(),
        // No actualStartDate or actualEndDate - this should trigger validation error
      },
    });

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/production-performance/export/${incompleteWO.id}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
        },
      }
    );

    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('actual dates');

    // Cleanup
    await prisma.workOrder.delete({ where: { id: incompleteWO.id } });
  });
});

// ============================================================================
// Material Transaction Export Tests
// ============================================================================

test.describe('Material Transaction Export', () => {
  test('should export material transaction to ERP (CONSUMPTION)', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/export`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          transactionType: 'CONSUMPTION',
          partId: testPartId,
          quantity: 5,
          unitOfMeasure: 'EA',
          fromLocation: 'WH-01',
          toLocation: 'PROD-LINE-01',
          workOrderId: testWorkOrderId,
          lotNumber: 'LOT-2025-001',
          unitCost: 10.0,
          movementType: 'ISSUE',
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.messageId).toBeDefined();
    expect(body.data.transactionType).toBe('CONSUMPTION');
    expect(body.data.status).toBe('PROCESSED');
  });

  test('should export material transaction to ERP (RECEIPT)', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/export`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          transactionType: 'RECEIPT',
          partId: testPartId,
          quantity: 50,
          unitOfMeasure: 'EA',
          toLocation: 'WH-01',
          lotNumber: 'LOT-2025-002',
          serialNumber: 'SN-001',
          unitCost: 12.5,
          movementType: 'RECEIPT',
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.transactionType).toBe('RECEIPT');
  });

  test('should get material transaction status', async ({ request }) => {
    // First export
    const exportResponse = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/export`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          transactionType: 'ISSUE',
          partId: testPartId,
          quantity: 10,
          unitOfMeasure: 'EA',
          movementType: 'ISSUE',
        },
      }
    );
    const exportBody = await exportResponse.json();
    const messageId = exportBody.data.messageId;

    // Get status
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/material-transactions/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.messageId).toBe(messageId);
    expect(body.data.status).toBe('PROCESSED');
  });

  test('should get material transactions for a part', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/material-transactions/part/${testPartId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should bulk export work order materials', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/bulk-export/${testWorkOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  test('should reject export with missing required fields', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/export`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          // Missing transactionType, partId, quantity, etc.
        },
      }
    );

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('required');
  });
});

// ============================================================================
// Material Transaction Inbound Tests
// ============================================================================

test.describe('Material Transaction Inbound', () => {
  test('should process inbound material transaction from ERP (RECEIPT)', async ({ request }) => {
    const isa95Message = {
      messageType: 'MaterialTransaction',
      messageId: `TEST-INBOUND-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'ERP_TEST',
      receiver: 'MES',
      transactionType: 'RECEIPT',
      material: {
        partNumber: 'B2M-TEST-PART-001',
        quantity: 100,
        unitOfMeasure: 'EA',
        lotNumber: 'LOT-ERP-001',
      },
      locations: {
        to: 'WH-01',
      },
      cost: {
        unit: 15.0,
        total: 1500.0,
        currency: 'USD',
      },
    };

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/inbound`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          messagePayload: isa95Message,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.transactionType).toBe('RECEIPT');
    expect(body.data.status).toBe('PROCESSED');

    // Verify inventory was updated
    const updatedPart = await prisma.part.findUnique({
      where: { id: testPartId },
    });
    expect(updatedPart!.quantityOnHand).toBeGreaterThanOrEqual(100);
  });

  test('should process inbound material transaction from ERP (ISSUE)', async ({ request }) => {
    const isa95Message = {
      messageType: 'MaterialTransaction',
      messageId: `TEST-INBOUND-ISSUE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'ERP_TEST',
      receiver: 'MES',
      transactionType: 'ISSUE',
      material: {
        partNumber: 'B2M-TEST-PART-001',
        quantity: 10,
        unitOfMeasure: 'EA',
      },
      locations: {
        from: 'WH-01',
        to: 'PROD-LINE-01',
      },
    };

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/inbound`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          messagePayload: isa95Message,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PROCESSED');
  });

  test('should reject invalid ISA-95 message format', async ({ request }) => {
    const invalidMessage = {
      messageType: 'MaterialTransaction',
      // Missing required fields
      sender: 'ERP_TEST',
    };

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/material-transactions/inbound`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          messagePayload: invalidMessage,
        },
      }
    );

    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});

// ============================================================================
// Personnel Information Export Tests
// ============================================================================

test.describe('Personnel Information Export', () => {
  test('should export personnel info to ERP (UPDATE)', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/personnel/export`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          userId: testUserId,
          actionType: 'UPDATE',
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data).toBeDefined();
    expect(body.data.messageId).toBeDefined();
    expect(body.data.personnelId).toBe(testUserId);
    expect(body.data.actionType).toBe('UPDATE');
    expect(body.data.status).toBe('PROCESSED');
  });

  test('should get personnel exchange status', async ({ request }) => {
    // First export
    const exportResponse = await request.post(
      `${BASE_URL}/api/v1/b2m/personnel/export`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          userId: testUserId,
          actionType: 'UPDATE',
        },
      }
    );
    const exportBody = await exportResponse.json();
    const messageId = exportBody.data.messageId;

    // Get status
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/personnel/${messageId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.messageId).toBe(messageId);
    expect(body.data.status).toBe('PROCESSED');
  });

  test('should get user exchanges', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/personnel/user/${testUserId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });
});

// ============================================================================
// Personnel Information Inbound Tests
// ============================================================================

test.describe('Personnel Information Inbound', () => {
  test('should process inbound personnel info from ERP (CREATE)', async ({ request }) => {
    const isa95Message = {
      messageType: 'PersonnelInfo',
      messageId: `TEST-PERSONNEL-CREATE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'ERP_TEST',
      receiver: 'MES',
      actionType: 'CREATE',
      personnel: {
        externalId: 'new-erp-user-001',
        employeeNumber: 'EMP-NEW-001',
        firstName: 'John',
        lastName: 'NewEmployee',
        email: 'john.new@company.com',
        department: 'Production',
        jobTitle: 'Operator',
      },
    };

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/personnel/inbound`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          messagePayload: isa95Message,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.actionType).toBe('CREATE');
    expect(body.data.status).toBe('PROCESSED');
    expect(body.data.personnelId).toBeDefined();

    // Verify user was created
    const newUser = await prisma.user.findFirst({
      where: { username: 'new-erp-user-001' },
    });
    expect(newUser).toBeDefined();
    expect(newUser!.name).toBe('John NewEmployee');
    expect(newUser!.employeeId).toBe('EMP-NEW-001');

    // Cleanup
    if (newUser) {
      await prisma.user.delete({ where: { id: newUser.id } });
    }
  });

  test('should process inbound personnel info from ERP (UPDATE)', async ({ request }) => {
    const isa95Message = {
      messageType: 'PersonnelInfo',
      messageId: `TEST-PERSONNEL-UPDATE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'ERP_TEST',
      receiver: 'MES',
      actionType: 'UPDATE',
      personnel: {
        externalId: 'b2m-test-user',
        employeeNumber: 'EMP-B2M-001-UPDATED',
        email: 'b2m.test.updated@company.com',
      },
    };

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/personnel/inbound`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          messagePayload: isa95Message,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PROCESSED');

    // Verify user was updated
    const updatedUser = await prisma.user.findUnique({
      where: { id: testUserId },
    });
    expect(updatedUser!.employeeId).toBe('EMP-B2M-001-UPDATED');
    expect(updatedUser!.email).toBe('b2m.test.updated@company.com');
  });

  test('should process inbound personnel info from ERP (DELETE)', async ({ request }) => {
    // Create a user to delete
    const userToDelete = await prisma.user.create({
      data: {
        username: 'user-to-delete',
        name: 'Delete Me',
        email: 'delete.me@company.com',
        password: 'test123',
        role: 'OPERATOR',
        isActive: true,
      },
    });

    const isa95Message = {
      messageType: 'PersonnelInfo',
      messageId: `TEST-PERSONNEL-DELETE-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'ERP_TEST',
      receiver: 'MES',
      actionType: 'DELETE',
      personnel: {
        externalId: 'user-to-delete',
      },
    };

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/personnel/inbound`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          messagePayload: isa95Message,
        },
      }
    );

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.data.status).toBe('PROCESSED');

    // Verify user was soft-deleted (marked inactive)
    const deletedUser = await prisma.user.findUnique({
      where: { id: userToDelete.id },
    });
    expect(deletedUser!.isActive).toBe(false);

    // Cleanup
    await prisma.user.delete({ where: { id: userToDelete.id } });
  });

  test('should reject CREATE for existing user', async ({ request }) => {
    const isa95Message = {
      messageType: 'PersonnelInfo',
      messageId: `TEST-PERSONNEL-DUP-${Date.now()}`,
      timestamp: new Date().toISOString(),
      sender: 'ERP_TEST',
      receiver: 'MES',
      actionType: 'CREATE',
      personnel: {
        externalId: 'b2m-test-user', // Already exists
        firstName: 'Should',
        lastName: 'Fail',
      },
    };

    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/personnel/inbound`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: testConfigId,
          messagePayload: isa95Message,
        },
      }
    );

    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain('already exists');
  });
});

// ============================================================================
// Error Handling and Edge Cases
// ============================================================================

test.describe('Error Handling', () => {
  test('should require authentication for all B2M endpoints', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/production-performance/work-order/${testWorkOrderId}`
    );

    expect(response.status()).toBe(401);
  });

  test('should return 404 for non-existent message ID', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/api/v1/b2m/production-performance/NONEXISTENT-MESSAGE-ID`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    expect(response.status()).toBe(404);
  });

  test('should validate integration config exists', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/api/v1/b2m/production-performance/export/${testWorkOrderId}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        data: {
          configId: 'NONEXISTENT-CONFIG-ID',
        },
      }
    );

    expect(response.status()).toBe(500);
    const body = await response.json();
    expect(body.success).toBe(false);
  });
});
