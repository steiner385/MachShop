/**
 * Process Segment Hierarchy E2E Tests
 * ISA-95 Process Segment Model (Task 1.4)
 *
 * Comprehensive test suite covering:
 * - Process segment CRUD operations
 * - Hierarchy navigation (parents, children, ancestors, trees)
 * - Parameters management
 * - Dependencies and sequencing
 * - Resource specifications (personnel, equipment, materials, assets)
 * - Statistics and reporting
 */

import { test, expect, request, APIRequestContext } from '@playwright/test';
import { config } from '../../config/config';

// Test configuration
// Fix: Use backend API server (port 3101), not frontend server (port 5278)
const BASE_URL = process.env.E2E_BASE_URL || 'http://localhost:3101';
const API_BASE = `${BASE_URL}/api/v1`;

// Test user credentials - use valid test user from seed data
const TEST_USER = {
  username: 'admin',
  password: 'password123'
};

let authToken: string;
let apiContext: APIRequestContext;

// Test IDs (will be populated during tests)
let millingSegmentId: string;
let roughMillingStepId: string;
let finishMillingStepId: string;
let inspectionSegmentId: string;

// Generate unique test prefix to avoid conflicts between test runs
// Use 'API-TEST-' prefix instead of 'OP-TEST-' to avoid conflicts with seed data
const testRunId = Date.now().toString().slice(-6); // Last 6 digits of timestamp
const TEST_PREFIX = `API-TEST-${testRunId}`;

test.describe('Process Segment Hierarchy Tests', { tag: '@api' }, () => {
  // Configure serial mode at the top level - all tests depend on setup data
  // millingSegmentId is set by the first test and used throughout
  test.describe.configure({ mode: 'serial' });

  // ======================
  // SETUP & TEARDOWN
  // ======================

  test.beforeAll(async () => {
    // Create API context - match L2 Equipment test pattern with trailing slash
    apiContext = await request.newContext({
      baseURL: 'http://localhost:3101/api/v1/',
      extraHTTPHeaders: {
        'Content-Type': 'application/json'
      }
    });

    // Authenticate and get token - no leading slash to match L2 Equipment pattern
    const loginResponse = await apiContext.post('auth/login', {
      data: TEST_USER
    });

    // Add better error handling like L2 Equipment tests
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

    console.log('✅ Authentication successful');

    // Clean up any existing test data to ensure test isolation
    // Fetch all process segments and delete any test segments (those starting with 'OP-TEST-')
    const listResponse = await apiContext.get('process-segments', {
      headers: { Authorization: `Bearer ${authToken}` }
    });

    if (listResponse.ok()) {
      const segments = await listResponse.json();
      let testSegments = segments.filter((seg: any) =>
        seg.segmentCode && (seg.segmentCode.startsWith('API-TEST-') || seg.segmentCode.startsWith(TEST_PREFIX))
      );

      // STEP 1: Delete ALL dependencies first (both directions)
      // This prevents constraint violations when deleting segments
      let dependenciesDeleted = 0;
      for (const segment of testSegments) {
        try {
          // Get dependencies for this segment
          const depsResponse = await apiContext.get(`process-segments/${segment.id}/dependencies`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          if (depsResponse.ok()) {
            const { dependencies, prerequisites } = await depsResponse.json();

            // Delete all dependencies where this segment is dependent
            for (const dep of dependencies || []) {
              const delResponse = await apiContext.delete(`process-segments/dependencies/${dep.id}`, {
                headers: { Authorization: `Bearer ${authToken}` }
              });
              if (delResponse.ok()) dependenciesDeleted++;
            }

            // Delete all prerequisites where this segment is prerequisite
            for (const prereq of prerequisites || []) {
              const delResponse = await apiContext.delete(`process-segments/dependencies/${prereq.id}`, {
                headers: { Authorization: `Bearer ${authToken}` }
              });
              if (delResponse.ok()) dependenciesDeleted++;
            }
          }
        } catch (error) {
          // Continue even if dependency deletion fails for a segment
        }
      }

      if (dependenciesDeleted > 0) {
        console.log(`🧹 Deleted ${dependenciesDeleted} dependency relationship(s)`);
      }

      // STEP 2: Delete test segments in hierarchical order (leaf nodes first)
      // Make multiple passes, deleting segments with no children each time
      let deletedCount = 0;
      let maxPasses = 10; // Safety limit to prevent infinite loops
      let pass = 0;

      while (testSegments.length > 0 && pass < maxPasses) {
        pass++;
        const beforeCount = testSegments.length;

        // Find segments with no children (leaf nodes)
        const leafSegments = testSegments.filter((seg: any) => {
          const hasChildren = testSegments.some((other: any) => other.parentSegmentId === seg.id);
          return !hasChildren;
        });

        // Delete each leaf segment
        for (const segment of leafSegments) {
          const deleteResponse = await apiContext.delete(`process-segments/${segment.id}?hardDelete=true`, {
            headers: { Authorization: `Bearer ${authToken}` }
          });

          if (deleteResponse.ok()) {
            deletedCount++;
            // Remove from testSegments array
            testSegments = testSegments.filter((seg: any) => seg.id !== segment.id);
          }
        }

        // If no segments were deleted in this pass, break to avoid infinite loop
        if (beforeCount === testSegments.length) {
          console.warn(`⚠️  Could not delete ${testSegments.length} segments (may need manual cleanup)`);
          break;
        }
      }

      if (deletedCount > 0) {
        console.log(`🧹 Cleaned up ${deletedCount} existing test segment(s) in ${pass} pass(es)`);
      }
    }
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  // ======================
  // CRUD OPERATIONS
  // ======================

  test.describe('Process Segment CRUD', () => {
    test('should create a new process segment', async () => {
      const response = await apiContext.post('process-segments', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          segmentCode: `${TEST_PREFIX}-001`,
          segmentName: 'Test Milling Operation',
          description: 'Test description',
          level: 1,
          segmentType: 'PRODUCTION',
          category: 'MACHINING',
          duration: 3600,
          setupTime: 1800,
          teardownTime: 600,
          isActive: true
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('id');
      expect(data.segmentCode).toBe(`${TEST_PREFIX}-001`);
      expect(data.segmentName).toBe('Test Milling Operation');
      expect(data.level).toBe(1);
      expect(data.segmentType).toBe('PRODUCTION');

      millingSegmentId = data.id;
    });

    test('should get process segment by ID', async () => {
      const response = await apiContext.get(`process-segments/${millingSegmentId}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.id).toBe(millingSegmentId);
      expect(data.segmentCode).toBe(`${TEST_PREFIX}-001`);
    });

    test('should get process segment by code', async () => {
      const response = await apiContext.get(`process-segments/code/${TEST_PREFIX}-001`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.segmentCode).toBe(`${TEST_PREFIX}-001`);
      expect(data.id).toBe(millingSegmentId);
    });

    test('should get all process segments', async () => {
      const response = await apiContext.get('process-segments', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);
    });

    test('should filter process segments by type', async () => {
      const response = await apiContext.get('process-segments?segmentType=PRODUCTION', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      data.forEach((segment: any) => {
        expect(segment.segmentType).toBe('PRODUCTION');
      });
    });

    test('should filter process segments by level', async () => {
      const response = await apiContext.get('process-segments?level=1', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(Array.isArray(data)).toBeTruthy();
      data.forEach((segment: any) => {
        expect(segment.level).toBe(1);
      });
    });

    test('should update process segment', async () => {
      const response = await apiContext.put(`process-segments/${millingSegmentId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          segmentName: 'Updated Milling Operation',
          description: 'Updated description',
          duration: 4200
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.segmentName).toBe('Updated Milling Operation');
      expect(data.description).toBe('Updated description');
      expect(data.duration).toBe(4200);
    });

    test('should soft delete process segment', async () => {
      // Create a test segment to delete
      const createResponse = await apiContext.post('process-segments', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          segmentCode: `${TEST_PREFIX}-DELETE`,
          segmentName: 'To Delete',
          level: 1,
          segmentType: 'PRODUCTION',
          isActive: true
        }
      });

      const created = await createResponse.json();

      // Soft delete
      const deleteResponse = await apiContext.delete(`process-segments/${created.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(deleteResponse.ok()).toBeTruthy();
      const deleteData = await deleteResponse.json();
      expect(deleteData.deleted).toBe(true);
      expect(deleteData.hardDelete).toBe(false);

      // Verify segment still exists but is inactive
      const getResponse = await apiContext.get(`process-segments/${created.id}`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      const segment = await getResponse.json();
      expect(segment.isActive).toBe(false);
    });
  });

  // ======================
  // HIERARCHY OPERATIONS
  // ======================

  test.describe('Process Segment Hierarchy', () => {
    test('should create child segments', async () => {
      // Create rough milling step
      const roughResponse = await apiContext.post('process-segments', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          segmentCode: `${TEST_PREFIX}-001-010`,
          segmentName: 'Rough Milling Step',
          level: 2,
          parentSegmentId: millingSegmentId,
          segmentType: 'PRODUCTION',
          category: 'MACHINING',
          duration: 1200
        }
      });

      expect(roughResponse.ok()).toBeTruthy();
      const roughData = await roughResponse.json();
      roughMillingStepId = roughData.id;

      expect(roughData.parentSegmentId).toBe(millingSegmentId);
      expect(roughData.level).toBe(2);

      // Create finish milling step
      const finishResponse = await apiContext.post('process-segments', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          segmentCode: `${TEST_PREFIX}-001-020`,
          segmentName: 'Finish Milling Step',
          level: 2,
          parentSegmentId: millingSegmentId,
          segmentType: 'PRODUCTION',
          category: 'MACHINING',
          duration: 2400
        }
      });

      expect(finishResponse.ok()).toBeTruthy();
      const finishData = await finishResponse.json();
      finishMillingStepId = finishData.id;
    });

    test('should get child segments', async () => {
      const response = await apiContext.get(`process-segments/${millingSegmentId}/children`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const children = await response.json();

      expect(Array.isArray(children)).toBeTruthy();
      expect(children.length).toBeGreaterThanOrEqual(2);

      const segmentCodes = children.map((c: any) => c.segmentCode);
      expect(segmentCodes).toContain(`${TEST_PREFIX}-001-010`);
      expect(segmentCodes).toContain(`${TEST_PREFIX}-001-020`);
    });

    test('should get root segments', async () => {
      const response = await apiContext.get('process-segments/hierarchy/roots', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const roots = await response.json();

      expect(Array.isArray(roots)).toBeTruthy();
      roots.forEach((root: any) => {
        expect(root.parentSegmentId).toBeNull();
      });
    });

    test('should get hierarchy tree', async () => {
      const response = await apiContext.get(`process-segments/${millingSegmentId}/hierarchy-tree`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const tree = await response.json();

      expect(tree.id).toBe(millingSegmentId);
      expect(tree.children).toBeDefined();
      expect(Array.isArray(tree.children)).toBeTruthy();
      expect(tree.children.length).toBeGreaterThanOrEqual(2);
    });

    test('should get ancestor chain', async () => {
      const response = await apiContext.get(`process-segments/${roughMillingStepId}/ancestors`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const ancestors = await response.json();

      expect(Array.isArray(ancestors)).toBeTruthy();
      expect(ancestors.length).toBeGreaterThan(0);

      // Last ancestor should be the parent (root first, so parent is last)
      const lastAncestor = ancestors[ancestors.length - 1];
      expect(lastAncestor.id).toBe(millingSegmentId);
    });

    test('should prevent circular references', async () => {
      // Try to set parent as its own child
      const response = await apiContext.put(`process-segments/${millingSegmentId}`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          parentSegmentId: roughMillingStepId // Child trying to be parent
        }
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });
  });

  // ======================
  // PARAMETER OPERATIONS
  // ======================

  test.describe('Process Segment Parameters', () => {
    test('should add parameter to segment', async () => {
      const response = await apiContext.post(`process-segments/${millingSegmentId}/parameters`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          parameterName: 'Spindle Speed',
          parameterType: 'SET_POINT',
          dataType: 'NUMBER',
          defaultValue: '3000',
          unitOfMeasure: 'RPM',
          minValue: 2000,
          maxValue: 5000,
          isRequired: true,
          isCritical: true
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.parameterName).toBe('Spindle Speed');
      expect(data.parameterType).toBe('SET_POINT');
      expect(data.minValue).toBe(2000);
      expect(data.maxValue).toBe(5000);
    });

    test('should get segment parameters', async () => {
      const response = await apiContext.get(`process-segments/${millingSegmentId}/parameters`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const parameters = await response.json();

      expect(Array.isArray(parameters)).toBeTruthy();
      expect(parameters.length).toBeGreaterThan(0);

      const spindleSpeed = parameters.find((p: any) => p.parameterName === 'Spindle Speed');
      expect(spindleSpeed).toBeDefined();
    });
  });

  // ======================
  // DEPENDENCY OPERATIONS
  // ======================

  test.describe('Process Segment Dependencies', () => {
    test.beforeAll(async () => {
      // Create inspection segment for dependency testing
      const response = await apiContext.post('process-segments', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          segmentCode: `${TEST_PREFIX}-002`,
          segmentName: 'Test Inspection',
          level: 1,
          segmentType: 'QUALITY',
          category: 'INSPECTION',
          duration: 1800
        }
      });

      const data = await response.json();
      inspectionSegmentId = data.id;
    });

    test('should add dependency between segments', async () => {
      const response = await apiContext.post('process-segments/dependencies', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          dependentSegmentId: inspectionSegmentId,
          prerequisiteSegmentId: millingSegmentId,
          dependencyType: 'MUST_COMPLETE',
          timingType: 'FINISH_TO_START',
          lagTime: 300
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.dependentSegmentId).toBe(inspectionSegmentId);
      expect(data.prerequisiteSegmentId).toBe(millingSegmentId);
      expect(data.dependencyType).toBe('MUST_COMPLETE');
    });

    test('should get segment dependencies', async () => {
      const response = await apiContext.get(`process-segments/${inspectionSegmentId}/dependencies`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('dependencies');
      expect(data).toHaveProperty('prerequisites');

      expect(Array.isArray(data.dependencies)).toBeTruthy();
      expect(data.dependencies.length).toBeGreaterThan(0);
    });

    test('should prevent self-dependency', async () => {
      const response = await apiContext.post('process-segments/dependencies', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          dependentSegmentId: millingSegmentId,
          prerequisiteSegmentId: millingSegmentId, // Same segment
          dependencyType: 'MUST_COMPLETE',
          timingType: 'FINISH_TO_START'
        }
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBe(400);
    });
  });

  // ======================
  // RESOURCE SPECIFICATIONS
  // ======================

  test.describe('Resource Specifications', () => {
    test('should add personnel specification', async () => {
      const response = await apiContext.post(`process-segments/${millingSegmentId}/personnel-specs`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          minimumCompetency: 'COMPETENT',
          requiredCertifications: ['CNC-001'],
          quantity: 1,
          roleName: 'CNC Operator',
          isOptional: false
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.minimumCompetency).toBe('COMPETENT');
      expect(data.roleName).toBe('CNC Operator');
    });

    test('should add equipment specification', async () => {
      const response = await apiContext.post(`process-segments/${millingSegmentId}/equipment-specs`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentClass: 'PRODUCTION',
          equipmentType: 'CNC_MILL',
          requiredCapabilities: ['5-axis'],
          quantity: 1,
          setupRequired: true
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.equipmentClass).toBe('PRODUCTION');
      expect(data.equipmentType).toBe('CNC_MILL');
    });

    test('should add material specification', async () => {
      const response = await apiContext.post(`process-segments/${millingSegmentId}/material-specs`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          materialType: 'RAW_MATERIAL',
          quantity: 1.5,
          unitOfMeasure: 'LB',
          consumptionType: 'PER_UNIT',
          isOptional: false
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.materialType).toBe('RAW_MATERIAL');
      expect(data.quantity).toBe(1.5);
    });

    test('should add physical asset specification', async () => {
      const response = await apiContext.post(`process-segments/${millingSegmentId}/asset-specs`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          assetType: 'TOOLING',
          assetCode: 'EM-0.500-TiN',
          assetName: '0.5" End Mill',
          quantity: 2,
          requiresCalibration: false
        }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data.assetType).toBe('TOOLING');
      expect(data.assetName).toBe('0.5" End Mill');
    });

    test('should get all resource specifications', async () => {
      const response = await apiContext.get(`process-segments/${millingSegmentId}/resource-specs`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('personnel');
      expect(data).toHaveProperty('equipment');
      expect(data).toHaveProperty('materials');
      expect(data).toHaveProperty('assets');

      expect(Array.isArray(data.personnel)).toBeTruthy();
      expect(Array.isArray(data.equipment)).toBeTruthy();
      expect(Array.isArray(data.materials)).toBeTruthy();
      expect(Array.isArray(data.assets)).toBeTruthy();
    });
  });

  // ======================
  // STATISTICS & REPORTING
  // ======================

  test.describe('Statistics and Reporting', () => {
    test('should get process segment statistics', async () => {
      const response = await apiContext.get('process-segments/statistics/overview', {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const stats = await response.json();

      expect(stats).toHaveProperty('totalSegments');
      expect(stats).toHaveProperty('segmentsByType');
      expect(stats).toHaveProperty('segmentsByLevel');
      expect(stats).toHaveProperty('activeSegments');

      expect(typeof stats.totalSegments).toBe('number');
      expect(stats.totalSegments).toBeGreaterThan(0);
    });

    test('should calculate total segment time', async () => {
      const response = await apiContext.get(`process-segments/${millingSegmentId}/total-time`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();

      expect(data).toHaveProperty('totalTimeSeconds');
      expect(typeof data.totalTimeSeconds).toBe('number');
      expect(data.totalTimeSeconds).toBeGreaterThan(0);
    });
  });
});
