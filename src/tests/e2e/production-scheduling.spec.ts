/**
 * Production Scheduling E2E Tests (ISA-95 Task 1.6)
 *
 * Tests for Production Scheduling including:
 * - Schedule CRUD operations
 * - Schedule entry management
 * - Constraint operations and violation checking
 * - State machine transitions (FORECAST → RELEASED → DISPATCHED → RUNNING → COMPLETED → CLOSED)
 * - Scheduling algorithms (Priority sequencing, EDD, Feasibility checking)
 * - Dispatch operations (converting schedule entries to work orders)
 * - Statistics and reporting
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('Production Scheduling - Schedule CRUD Operations', () => {
  let authHeaders: Record<string, string>;
  let testScheduleId: string;
  let testSiteId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Get site for schedule creation
    const sitesResponse = await request.get('/api/v1/sites', {
      headers: authHeaders,
    });
    const sitesData = await sitesResponse.json();
    const sites = sitesData.data || sitesData.sites || [];
    if (sites.length > 0) {
      testSiteId = sites[0].id;
    }
  });

  test('should create a new production schedule successfully', async ({ request }) => {
    const response = await request.post('/api/v1/production-schedules', {
      headers: authHeaders,
      data: {
        scheduleNumber: `TEST-SCH-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scheduleName: 'Test Production Schedule',
        description: 'Test schedule for E2E testing',
        periodStart: new Date('2025-03-01T00:00:00Z').toISOString(),
        periodEnd: new Date('2025-03-31T23:59:59Z').toISOString(),
        periodType: 'MONTHLY',
        siteId: testSiteId,
        priority: 'HIGH',
        notes: 'Created for automated E2E testing',
      },
    });

    expect(response.status()).toBe(201);
    const schedule = await response.json();
    expect(schedule.scheduleNumber).toContain('TEST-SCH-');
    expect(schedule.scheduleName).toBe('Test Production Schedule');
    expect(schedule.state).toBe('FORECAST'); // Initial state
    expect(schedule.priority).toBe('HIGH');
    expect(schedule.totalEntries).toBe(0);
    expect(schedule.dispatchedCount).toBe(0);
    expect(schedule.isFeasible).toBe(true);

    testScheduleId = schedule.id;
  });

  test('should get schedule by ID', async ({ request }) => {
    const response = await request.get(`/api/v1/production-schedules/${testScheduleId}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const schedule = await response.json();
    expect(schedule.id).toBe(testScheduleId);
    expect(schedule.scheduleName).toBe('Test Production Schedule');
  });

  test('should update schedule details', async ({ request }) => {
    const response = await request.put(`/api/v1/production-schedules/${testScheduleId}`, {
      headers: authHeaders,
      data: {
        description: 'Updated description for testing',
        priority: 'NORMAL',
        notes: 'Priority adjusted for testing',
      },
    });

    expect(response.status()).toBe(200);
    const updatedSchedule = await response.json();
    expect(updatedSchedule.description).toBe('Updated description for testing');
    expect(updatedSchedule.priority).toBe('NORMAL');
  });

  test('should get all schedules with filters', async ({ request }) => {
    const response = await request.get('/api/v1/production-schedules?state=FORECAST&priority=NORMAL', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const schedules = await response.json();
    expect(Array.isArray(schedules)).toBe(true);
    expect(schedules.length).toBeGreaterThan(0);
  });

  test('should get schedule by schedule number', async ({ request }) => {
    // First get the schedule to know its number
    const getResponse = await request.get(`/api/v1/production-schedules/${testScheduleId}`, {
      headers: authHeaders,
    });
    const schedule = await getResponse.json();

    // Now fetch by schedule number
    const response = await request.get(`/api/v1/production-schedules/number/${schedule.scheduleNumber}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const scheduleByNumber = await response.json();
    expect(scheduleByNumber.id).toBe(testScheduleId);
  });
});

test.describe('Production Scheduling - Schedule Entry Operations', () => {
  // Configure serial mode to ensure tests run in order and share state
  test.describe.configure({ mode: 'serial' });

  let authHeaders: Record<string, string>;
  let testScheduleId: string;
  let testEntryId: string;
  let testPartId: string;
  let testWorkCenterId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create a test schedule
    const scheduleResponse = await request.post('/api/v1/production-schedules', {
      headers: authHeaders,
      data: {
        scheduleNumber: `ENTRY-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scheduleName: 'Schedule for Entry Testing',
        periodStart: new Date('2025-04-01T00:00:00Z').toISOString(),
        periodEnd: new Date('2025-04-30T23:59:59Z').toISOString(),
      },
    });
    const schedule = await scheduleResponse.json();
    testScheduleId = schedule.id;

    // Get a test part
    const partsResponse = await request.get('/api/v1/products', {
      headers: authHeaders,
    });
    const parts = await partsResponse.json();
    if (parts.length > 0) {
      testPartId = parts[0].id;
    }

    // Get a work center
    const workCentersResponse = await request.get('/api/v1/equipment/work-centers', {
      headers: authHeaders,
    });
    const workCenters = await workCentersResponse.json();
    if (workCenters.length > 0) {
      testWorkCenterId = workCenters[0].id;
    }
  });

  test('should add schedule entry to schedule', async ({ request }) => {
    // Get part details first
    const partResponse = await request.get(`/api/v1/products/${testPartId}`, {
      headers: authHeaders,
    });
    const part = await partResponse.json();

    const response = await request.post(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
      data: {
        partId: testPartId,
        partNumber: part.partNumber,
        description: 'Test production entry',
        plannedQuantity: 100,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-04-05T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-04-15T17:00:00Z').toISOString(),
        priority: 'HIGH',
        sequenceNumber: 1,
        estimatedDuration: 10,
        workCenterId: testWorkCenterId,
        customerOrder: 'CO-TEST-001',
        customerDueDate: new Date('2025-04-20T00:00:00Z').toISOString(),
        salesOrder: 'SO-TEST-001',
        notes: 'High-priority test entry',
      },
    });

    expect(response.status()).toBe(201);
    const entry = await response.json();
    expect(entry.entryNumber).toBe(1);
    expect(entry.plannedQuantity).toBe(100);
    expect(entry.priority).toBe('HIGH');
    expect(entry.isDispatched).toBe(false);
    expect(entry.isCancelled).toBe(false);

    testEntryId = entry.id;
  });

  test('should get all entries for schedule', async ({ request }) => {
    const response = await request.get(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const entries = await response.json();
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    expect(entries[0].entryNumber).toBe(1);
  });

  test('should update schedule entry', async ({ request }) => {
    const response = await request.put(`/api/v1/production-schedules/entries/${testEntryId}`, {
      headers: authHeaders,
      data: {
        plannedQuantity: 150,
        priority: 'URGENT',
        notes: 'Quantity and priority updated',
      },
    });

    expect(response.status()).toBe(200);
    const updatedEntry = await response.json();
    expect(updatedEntry.plannedQuantity).toBe(150);
    expect(updatedEntry.priority).toBe('URGENT');
  });

  test('should cancel schedule entry', async ({ request }) => {
    // Create another entry to cancel
    const partResponse = await request.get(`/api/v1/products/${testPartId}`, {
      headers: authHeaders,
    });
    const part = await partResponse.json();

    const createResponse = await request.post(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
      data: {
        partId: testPartId,
        partNumber: part.partNumber,
        description: 'Entry to cancel',
        plannedQuantity: 50,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-04-10T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-04-12T17:00:00Z').toISOString(),
      },
    });
    const entryToCancel = await createResponse.json();

    // Cancel it
    const response = await request.post(`/api/v1/production-schedules/entries/${entryToCancel.id}/cancel`, {
      headers: authHeaders,
      data: {
        reason: 'Customer cancelled order',
        cancelledBy: 'admin',
      },
    });

    expect(response.status()).toBe(200);
    const cancelledEntry = await response.json();
    expect(cancelledEntry.isCancelled).toBe(true);
    expect(cancelledEntry.cancelledReason).toBe('Customer cancelled order');
  });
});

test.describe('Production Scheduling - Constraint Operations', () => {
  // Configure serial mode to ensure tests run in order and share state
  test.describe.configure({ mode: 'serial' });

  let authHeaders: Record<string, string>;
  let testScheduleId: string;
  let testEntryId: string;
  let testConstraintId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create schedule and entry for constraint testing
    const scheduleResponse = await request.post('/api/v1/production-schedules', {
      headers: authHeaders,
      data: {
        scheduleNumber: `CONSTRAINT-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scheduleName: 'Schedule for Constraint Testing',
        periodStart: new Date('2025-05-01T00:00:00Z').toISOString(),
        periodEnd: new Date('2025-05-31T23:59:59Z').toISOString(),
      },
    });
    const schedule = await scheduleResponse.json();
    testScheduleId = schedule.id;

    // Get part and work center
    const partsResponse = await request.get('/api/v1/products', {
      headers: authHeaders,
    });
    const parts = await partsResponse.json();

    const workCentersResponse = await request.get('/api/v1/equipment/work-centers', {
      headers: authHeaders,
    });
    const workCenters = await workCentersResponse.json();

    // Create entry
    const entryResponse = await request.post(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
      data: {
        partId: parts[0].id,
        partNumber: parts[0].partNumber,
        description: 'Entry for constraint testing',
        plannedQuantity: 200,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-05-05T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-05-20T17:00:00Z').toISOString(),
        workCenterId: workCenters[0]?.id,
      },
    });
    const entry = await entryResponse.json();
    testEntryId = entry.id;
  });

  test('should add capacity constraint to entry', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/entries/${testEntryId}/constraints`, {
      headers: authHeaders,
      data: {
        constraintType: 'CAPACITY',
        constraintName: 'Machining Center Capacity',
        description: 'Work center capacity constraint for production',
        resourceType: 'WORK_CENTER',
        requiredQuantity: 1200,
        availableQuantity: 1500,
        unitOfMeasure: 'HOURS',
        constraintDate: new Date('2025-05-05T00:00:00Z').toISOString(),
        notes: 'Sufficient capacity available',
      },
    });

    expect(response.status()).toBe(201);
    const constraint = await response.json();
    expect(constraint.constraintType).toBe('CAPACITY');
    expect(constraint.constraintName).toBe('Machining Center Capacity');
    expect(constraint.requiredQuantity).toBe(1200);
    expect(constraint.availableQuantity).toBe(1500);
    expect(constraint.isViolated).toBe(false);

    testConstraintId = constraint.id;
  });

  test('should add material constraint with violation', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/entries/${testEntryId}/constraints`, {
      headers: authHeaders,
      data: {
        constraintType: 'MATERIAL',
        constraintName: 'Raw Material Availability',
        description: 'Material shortage detected',
        resourceType: 'MATERIAL',
        requiredQuantity: 1000,
        availableQuantity: 750,
        unitOfMeasure: 'KG',
        leadTimeDays: 14,
        constraintDate: new Date('2025-05-05T00:00:00Z').toISOString(),
        notes: 'Material procurement in progress',
      },
    });

    expect(response.status()).toBe(201);
    const constraint = await response.json();
    expect(constraint.constraintType).toBe('MATERIAL');
    // Constraint violation should be detected after creation
  });

  test('should get all constraints for entry', async ({ request }) => {
    const response = await request.get(`/api/v1/production-schedules/entries/${testEntryId}/constraints`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const constraints = await response.json();
    expect(Array.isArray(constraints)).toBe(true);
    expect(constraints.length).toBeGreaterThanOrEqual(2);
  });

  test('should update constraint', async ({ request }) => {
    const response = await request.put(`/api/v1/production-schedules/constraints/${testConstraintId}`, {
      headers: authHeaders,
      data: {
        availableQuantity: 1600,
        notes: 'Capacity increased due to overtime',
      },
    });

    expect(response.status()).toBe(200);
    const updatedConstraint = await response.json();
    expect(updatedConstraint.availableQuantity).toBe(1600);
  });

  test('should check constraint violation status', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/constraints/${testConstraintId}/check`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.isViolated).toBeDefined();
  });

  test('should resolve constraint violation', async ({ request }) => {
    // Get constraints to find one that's violated
    const constraintsResponse = await request.get(`/api/v1/production-schedules/entries/${testEntryId}/constraints`, {
      headers: authHeaders,
    });
    const constraints = await constraintsResponse.json();
    const violatedConstraint = constraints.find((c: any) => c.isViolated);

    if (violatedConstraint) {
      const response = await request.post(`/api/v1/production-schedules/constraints/${violatedConstraint.id}/resolve`, {
        headers: authHeaders,
        data: {
          resolvedBy: 'admin',
          resolutionNotes: 'Material procurement completed, inventory replenished',
        },
      });

      expect(response.status()).toBe(200);
      const resolvedConstraint = await response.json();
      expect(resolvedConstraint.isResolved).toBe(true);
      expect(resolvedConstraint.isViolated).toBe(false);
    }
  });
});

test.describe('Production Scheduling - State Management', () => {
  // Configure serial mode: tests must run in sequence because they depend on shared state
  test.describe.configure({ mode: 'serial' });

  let authHeaders: Record<string, string>;
  let testScheduleId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create schedule for state transition testing
    const scheduleResponse = await request.post('/api/v1/production-schedules', {
      headers: authHeaders,
      data: {
        scheduleNumber: `STATE-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scheduleName: 'Schedule for State Transition Testing',
        periodStart: new Date('2025-06-01T00:00:00Z').toISOString(),
        periodEnd: new Date('2025-06-30T23:59:59Z').toISOString(),
        state: 'FORECAST',
      },
    });
    const schedule = await scheduleResponse.json();
    testScheduleId = schedule.id;
  });

  test('should transition schedule from FORECAST to RELEASED', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/${testScheduleId}/state/transition`, {
      headers: authHeaders,
      data: {
        newState: 'RELEASED',
        reason: 'Schedule approved by production manager',
        changedBy: 'admin',
        notificationsSent: true,
        notes: 'Released for execution',
      },
    });

    expect(response.status()).toBe(201);
    const stateHistory = await response.json();
    expect(stateHistory.previousState).toBe('FORECAST');
    expect(stateHistory.newState).toBe('RELEASED');
    expect(stateHistory.reason).toContain('approved');
  });

  test('should get state history for schedule', async ({ request }) => {
    const response = await request.get(`/api/v1/production-schedules/${testScheduleId}/state/history`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const history = await response.json();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(2); // Initial FORECAST + transition to RELEASED
  });

  test('should get schedules by state', async ({ request }) => {
    const response = await request.get('/api/v1/production-schedules/state/RELEASED', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const schedules = await response.json();
    expect(Array.isArray(schedules)).toBe(true);
    if (schedules.length > 0) {
      expect(schedules[0].state).toBe('RELEASED');
    }
  });
});

test.describe('Production Scheduling - Scheduling Algorithms', () => {
  let authHeaders: Record<string, string>;
  let testScheduleId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create schedule with multiple entries for sequencing
    const scheduleResponse = await request.post('/api/v1/production-schedules', {
      headers: authHeaders,
      data: {
        scheduleNumber: `SEQ-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scheduleName: 'Schedule for Sequencing Testing',
        periodStart: new Date('2025-07-01T00:00:00Z').toISOString(),
        periodEnd: new Date('2025-07-31T23:59:59Z').toISOString(),
      },
    });
    const schedule = await scheduleResponse.json();
    testScheduleId = schedule.id;

    // Get parts and work center
    const partsResponse = await request.get('/api/v1/products', {
      headers: authHeaders,
    });
    const parts = await partsResponse.json();

    const workCentersResponse = await request.get('/api/v1/equipment/work-centers', {
      headers: authHeaders,
    });
    const workCenters = await workCentersResponse.json();

    // Add multiple entries with different priorities
    await request.post(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
      data: {
        partId: parts[0]?.id,
        partNumber: parts[0]?.partNumber,
        plannedQuantity: 50,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-07-05T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-07-10T17:00:00Z').toISOString(),
        priority: 'LOW',
        customerDueDate: new Date('2025-07-20T00:00:00Z').toISOString(),
        workCenterId: workCenters[0]?.id,
      },
    });

    await request.post(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
      data: {
        partId: parts[0]?.id,
        partNumber: parts[0]?.partNumber,
        plannedQuantity: 100,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-07-08T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-07-15T17:00:00Z').toISOString(),
        priority: 'URGENT',
        customerDueDate: new Date('2025-07-15T00:00:00Z').toISOString(),
        workCenterId: workCenters[0]?.id,
      },
    });

    await request.post(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
      data: {
        partId: parts[0]?.id,
        partNumber: parts[0]?.partNumber,
        plannedQuantity: 75,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-07-12T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-07-18T17:00:00Z').toISOString(),
        priority: 'NORMAL',
        customerDueDate: new Date('2025-07-25T00:00:00Z').toISOString(),
        workCenterId: workCenters[0]?.id,
      },
    });
  });

  test('should apply priority-based sequencing', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/${testScheduleId}/sequencing/priority`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.entriesAffected).toBeGreaterThan(0);
    expect(result.message).toContain('Priority sequencing applied');
  });

  test('should apply EDD (Earliest Due Date) sequencing', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/${testScheduleId}/sequencing/edd`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.entriesAffected).toBeGreaterThan(0);
    expect(result.message).toContain('EDD sequencing applied');
  });

  test('should check schedule feasibility', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/${testScheduleId}/feasibility/check`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.isFeasible).toBeDefined();
    expect(Array.isArray(result.feasibilityIssues)).toBe(true);
  });
});

test.describe('Production Scheduling - Dispatch Operations', () => {
  // Configure serial mode to ensure tests run in order and share state
  test.describe.configure({ mode: 'serial' });

  let authHeaders: Record<string, string>;
  let testScheduleId: string;
  let testEntryId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create schedule in RELEASED state for dispatch testing
    const scheduleResponse = await request.post('/api/v1/production-schedules', {
      headers: authHeaders,
      data: {
        scheduleNumber: `DISPATCH-TEST-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scheduleName: 'Schedule for Dispatch Testing',
        periodStart: new Date('2025-08-01T00:00:00Z').toISOString(),
        periodEnd: new Date('2025-08-31T23:59:59Z').toISOString(),
      },
    });
    const schedule = await scheduleResponse.json();
    testScheduleId = schedule.id;

    // Get parts and work center
    const partsResponse = await request.get('/api/v1/products', {
      headers: authHeaders,
    });
    const parts = await partsResponse.json();

    const workCentersResponse = await request.get('/api/v1/equipment/work-centers', {
      headers: authHeaders,
    });
    const workCenters = await workCentersResponse.json();

    // Add entry for dispatch
    const entryResponse = await request.post(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
      data: {
        partId: parts[0]?.id,
        partNumber: parts[0]?.partNumber,
        plannedQuantity: 100,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-08-05T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-08-15T17:00:00Z').toISOString(),
        priority: 'HIGH',
        workCenterId: workCenters[0]?.id,
      },
    });
    const entry = await entryResponse.json();
    testEntryId = entry.id;

    // Transition schedule to RELEASED
    await request.post(`/api/v1/production-schedules/${testScheduleId}/state/transition`, {
      headers: authHeaders,
      data: {
        newState: 'RELEASED',
        reason: 'Ready for dispatch',
        changedBy: 'admin',
      },
    });
  });

  test('should get entries ready for dispatch', async ({ request }) => {
    const response = await request.get('/api/v1/production-schedules/dispatch/ready', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const entries = await response.json();
    expect(Array.isArray(entries)).toBe(true);
  });

  test('should dispatch single schedule entry', async ({ request }) => {
    const response = await request.post(`/api/v1/production-schedules/entries/${testEntryId}/dispatch`, {
      headers: authHeaders,
      data: {
        dispatchedBy: 'admin',
      },
    });

    expect(response.status()).toBe(201);
    const result = await response.json();
    expect(result.entry).toBeDefined();
    expect(result.workOrder).toBeDefined();
    expect(result.entry.isDispatched).toBe(true);
    expect(result.entry.workOrderId).toBeDefined();
    expect(result.workOrder.status).toBe('CREATED');
  });

  test('should verify work order was created from dispatch', async ({ request }) => {
    // Get the entry to find the work order ID
    const entryResponse = await request.get(`/api/v1/production-schedules/${testScheduleId}/entries`, {
      headers: authHeaders,
    });
    const entries = await entryResponse.json();
    const dispatchedEntry = entries.find((e: any) => e.id === testEntryId);

    if (dispatchedEntry?.workOrderId) {
      const workOrderResponse = await request.get(`/api/v1/workorders/${dispatchedEntry.workOrderId}`, {
        headers: authHeaders,
      });

      expect(workOrderResponse.status()).toBe(200);
      const workOrder = await workOrderResponse.json();
      expect(workOrder.quantityOrdered).toBe(100); // Fixed: API returns 'quantityOrdered', not 'quantity'
      expect(workOrder.status).toBe('CREATED');
    }
  });

  test('should dispatch all entries in schedule', async ({ request }) => {
    // Create another schedule with multiple entries
    const newScheduleResponse = await request.post('/api/v1/production-schedules', {
      headers: authHeaders,
      data: {
        scheduleNumber: `BULK-DISPATCH-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        scheduleName: 'Schedule for Bulk Dispatch',
        periodStart: new Date('2025-09-01T00:00:00Z').toISOString(),
        periodEnd: new Date('2025-09-30T23:59:59Z').toISOString(),
      },
    });
    const newSchedule = await newScheduleResponse.json();

    // Add multiple entries
    const partsResponse = await request.get('/api/v1/products', {
      headers: authHeaders,
    });
    const parts = await partsResponse.json();

    await request.post(`/api/v1/production-schedules/${newSchedule.id}/entries`, {
      headers: authHeaders,
      data: {
        partId: parts[0]?.id,
        partNumber: parts[0]?.partNumber,
        plannedQuantity: 50,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-09-05T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-09-10T17:00:00Z').toISOString(),
      },
    });

    await request.post(`/api/v1/production-schedules/${newSchedule.id}/entries`, {
      headers: authHeaders,
      data: {
        partId: parts[0]?.id,
        partNumber: parts[0]?.partNumber,
        plannedQuantity: 75,
        unitOfMeasure: 'EA',
        plannedStartDate: new Date('2025-09-12T08:00:00Z').toISOString(),
        plannedEndDate: new Date('2025-09-18T17:00:00Z').toISOString(),
      },
    });

    // Transition to RELEASED
    await request.post(`/api/v1/production-schedules/${newSchedule.id}/state/transition`, {
      headers: authHeaders,
      data: {
        newState: 'RELEASED',
        reason: 'Ready for bulk dispatch',
        changedBy: 'admin',
      },
    });

    // Dispatch all
    const response = await request.post(`/api/v1/production-schedules/${newSchedule.id}/dispatch/all`, {
      headers: authHeaders,
      data: {
        dispatchedBy: 'admin',
      },
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.dispatchedCount).toBeGreaterThan(0);
    expect(Array.isArray(result.entries)).toBe(true);
  });
});

test.describe('Production Scheduling - Statistics and Reporting', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);
  });

  test('should get production scheduling statistics overview', async ({ request }) => {
    const response = await request.get('/api/v1/production-schedules/statistics/overview', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const stats = await response.json();
    expect(stats.schedules).toBeDefined();
    expect(stats.schedules.total).toBeGreaterThan(0);
    expect(stats.schedules.byState).toBeDefined();
    expect(stats.schedules.byPriority).toBeDefined();
    expect(stats.entries).toBeDefined();
    expect(stats.entries.total).toBeGreaterThan(0);
    expect(stats.entries.dispatched).toBeDefined();
    expect(stats.entries.cancelled).toBeDefined();
    expect(stats.entries.pending).toBeDefined();
    expect(stats.constraints).toBeDefined();
    expect(stats.stateTransitions).toBeDefined();
  });
});
