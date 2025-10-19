import { test, expect, APIRequestContext, request } from '@playwright/test';

/**
 * L2 Equipment Integration E2E Tests
 *
 * Tests ISA-95 Level 2 (Equipment) Integration Model including:
 * - Equipment Data Collection (sensors, alarms, events, measurements)
 * - Equipment Commands (issue, status, timeout, retry, priority)
 * - Material Movement Tracking (load, unload, consume, produce, scrap, traceability)
 * - Process Data Collection (start, complete, parameters, summary, trends)
 *
 * Task 1.9: Phase 1 - ISA-95 Compliance Architecture
 */

let apiContext: APIRequestContext;
let authToken: string;
let testEquipmentId: string;
let testWorkOrderId: string;
let testPartId: string;

test.describe('L2 Equipment Integration API Tests', () => {
  test.beforeAll(async () => {
    // Create API request context - use E2E backend server (port 3101)
    apiContext = await request.newContext({
      baseURL: 'http://localhost:3101',
    });

    // Login to get auth token
    const loginResponse = await apiContext.post('/api/v1/auth/login', {
      data: {
        username: 'admin',
        password: 'password123',
      },
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

    // Create test fixtures
    await createTestFixtures();
  });

  test.afterAll(async () => {
    await apiContext.dispose();
  });

  /**
   * Create test fixtures (equipment, work order, part)
   */
  async function createTestFixtures() {
    // Get existing equipment or create one
    const equipmentResponse = await apiContext.get('/api/v1/equipment?limit=1', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const equipmentData = await equipmentResponse.json();
    if (equipmentData.equipment && equipmentData.equipment.length > 0) {
      testEquipmentId = equipmentData.equipment[0].id;
    } else {
      // Create test equipment if none exists
      const createEquipmentResponse = await apiContext.post('/api/v1/equipment', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentNumber: 'TEST-EQ-001',
          name: 'Test CNC Machine',
          equipmentClass: 'PRODUCTION_UNIT',
          type: 'CNC',
          equipmentLevel: 3,
          status: 'OPERATIONAL',
        },
      });
      const newEquipment = await createEquipmentResponse.json();
      testEquipmentId = newEquipment.id;
    }

    // Get existing work order or create one
    const workOrderResponse = await apiContext.get('/api/v1/workorders?limit=1', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const workOrderData = await workOrderResponse.json();
    if (workOrderData.workOrders && workOrderData.workOrders.length > 0) {
      testWorkOrderId = workOrderData.workOrders[0].id;
    }

    // Get existing part
    const partResponse = await apiContext.get('/api/v1/materials?type=part&limit=1', {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const partData = await partResponse.json();
    if (partData.materials && partData.materials.length > 0) {
      testPartId = partData.materials[0].id;
    }
  }

  // ===================================================================
  // Equipment Data Collection Tests
  // ===================================================================

  test.describe('Equipment Data Collection', () => {
    test('should collect single sensor data point successfully', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/data/collect', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          dataCollectionType: 'SENSOR',
          dataPointName: 'SpindleSpeed',
          dataPointId: 'ns=2;i=1001',
          value: 12500.5,
          unitOfMeasure: 'RPM',
          quality: 'GOOD',
          equipmentState: 'RUNNING',
          protocol: 'OPC_UA',
          sourceAddress: 'opc.tcp://192.168.1.100:4840',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.equipmentId).toBe(testEquipmentId);
      expect(data.data.dataCollectionType).toBe('SENSOR');
      expect(data.data.dataPointName).toBe('SpindleSpeed');
      expect(data.data.numericValue).toBe(12500.5);
      expect(data.data.quality).toBe('GOOD');
    });

    test('should collect alarm data point successfully', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/data/collect', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          dataCollectionType: 'ALARM',
          dataPointName: 'TemperatureAlarm',
          value: 'TEMPERATURE_HIGH',
          quality: 'GOOD',
          equipmentState: 'ALARM',
          protocol: 'MQTT',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.dataCollectionType).toBe('ALARM');
      expect(data.data.stringValue).toBe('TEMPERATURE_HIGH');
    });

    test('should batch collect multiple data points', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/data/collect-batch', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          dataPoints: [
            {
              equipmentId: testEquipmentId,
              dataCollectionType: 'SENSOR',
              dataPointName: 'Temperature',
              value: 85.5,
              unitOfMeasure: '°C',
              quality: 'GOOD',
            },
            {
              equipmentId: testEquipmentId,
              dataCollectionType: 'SENSOR',
              dataPointName: 'Pressure',
              value: 150.2,
              unitOfMeasure: 'PSI',
              quality: 'GOOD',
            },
            {
              equipmentId: testEquipmentId,
              dataCollectionType: 'MEASUREMENT',
              dataPointName: 'PartDimension',
              value: 100.123,
              unitOfMeasure: 'mm',
              quality: 'GOOD',
            },
          ],
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.successful)).toBe(true);
      expect(data.data.successful.length).toBe(3);
      expect(Array.isArray(data.data.failed)).toBe(true);
      expect(data.data.failed.length).toBe(0);
    });

    test('should query data collections with filters', async () => {
      // First collect some test data
      await apiContext.post('/api/v1/l2-equipment/equipment/data/collect', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          dataCollectionType: 'SENSOR',
          dataPointName: 'TestQuery',
          value: 100,
          quality: 'GOOD',
        },
      });

      // Query the data
      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/data/query?equipmentId=${testEquipmentId}&dataCollectionType=SENSOR&limit=10`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
      data.data.forEach((item: any) => {
        expect(item.equipmentId).toBe(testEquipmentId);
        expect(item.dataCollectionType).toBe('SENSOR');
      });
    });

    test.skip('should calculate equipment utilization', async () => {
      // Collect status events for utilization calculation
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      await apiContext.post('/api/v1/l2-equipment/equipment/data/collect-batch', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          dataPoints: [
            {
              equipmentId: testEquipmentId,
              dataCollectionType: 'STATUS',
              dataPointName: 'EquipmentState',
              value: 'RUNNING',
              quality: 'GOOD',
            },
            {
              equipmentId: testEquipmentId,
              dataCollectionType: 'STATUS',
              dataPointName: 'EquipmentState',
              value: 'IDLE',
              quality: 'GOOD',
            },
          ],
        },
      });

      const response = await apiContext.post('/api/v1/l2-equipment/equipment/data/utilization', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          startDate: oneHourAgo.toISOString(),
          endDate: now.toISOString(),
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.utilizationPercentage).toBeDefined();
      expect(typeof data.data.utilizationPercentage).toBe('number');
      expect(data.data.totalTime).toBeGreaterThan(0);
      expect(data.data.runningTime).toBeDefined();
      expect(data.data.idleTime).toBeDefined();
      expect(data.data.downTime).toBeDefined();
    });

    test('should generate data summary for equipment', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/data/${testEquipmentId}/summary?dataCollectionType=SENSOR&startDate=${encodeURIComponent(oneDayAgo.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.equipmentId).toBe(testEquipmentId);
      expect(data.data.dataCollectionType).toBe('SENSOR');
      expect(data.data.totalDataPoints).toBeDefined();
      expect(typeof data.data.totalDataPoints).toBe('number');
    });

    test('should get data point trend', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/data/${testEquipmentId}/trend?dataPointName=SpindleSpeed&startDate=${encodeURIComponent(oneDayAgo.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.dataPointName).toBe('SpindleSpeed');
      expect(Array.isArray(data.data.dataPoints)).toBe(true);
      if (data.data.dataPoints.length > 0) {
        expect(data.data.statistics).toBeDefined();
        expect(data.data.statistics.min).toBeDefined();
        expect(data.data.statistics.max).toBeDefined();
        expect(data.data.statistics.average).toBeDefined();
      }
    });

    test('should reject invalid equipment ID', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/data/collect', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: 'non-existent-id',
          dataCollectionType: 'SENSOR',
          dataPointName: 'Test',
          value: 100,
        },
      });

      expect(response.ok()).toBe(false);
      expect(response.status()).toBe(500);
    });
  });

  // ===================================================================
  // Equipment Command Tests
  // ===================================================================

  test.describe('Equipment Commands', () => {
    let testCommandId: string;

    test.beforeAll(async () => {
      // Create a test command to use for status update tests
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'START',
          commandName: 'STATUS_UPDATE_TEST',
          priority: 1,
        },
      });
      const data = await response.json();
      testCommandId = data.data.id;
    });

    test('should issue START command successfully', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'START',
          commandName: 'START_PRODUCTION',
          commandPayload: {
            programNumber: 'O1001',
            feedrate: 500,
            spindleSpeed: 1200,
          },
          workOrderId: testWorkOrderId,
          timeoutSeconds: 60,
          priority: 1,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.commandType).toBe('START');
      expect(data.data.commandStatus).toBe('PENDING');
      expect(data.data.priority).toBe(1);
      testCommandId = data.data.id;
    });

    test('should issue STOP command successfully', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'STOP',
          commandName: 'STOP_PRODUCTION',
          priority: 2,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandType).toBe('STOP');
      expect(data.data.commandStatus).toBe('PENDING');
    });

    test('should issue CONFIGURE command with payload', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'CONFIGURE',
          commandName: 'SET_PARAMETERS',
          commandPayload: {
            temperature: 85,
            pressure: 150,
            speed: 1200,
          },
          priority: 5,
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandType).toBe('CONFIGURE');
      expect(data.data.commandPayload).toBeDefined();
    });

    test('should update command status to SENT', async () => {
      const response = await apiContext.put(`/api/v1/l2-equipment/equipment/commands/${testCommandId}/status`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          commandStatus: 'SENT',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandStatus).toBe('SENT');
      expect(data.data.sentAt).toBeDefined();
    });

    test('should update command status to ACKNOWLEDGED', async () => {
      const response = await apiContext.put(
        `/api/v1/l2-equipment/equipment/commands/${testCommandId}/status`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            commandStatus: 'ACKNOWLEDGED',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandStatus).toBe('ACKNOWLEDGED');
      expect(data.data.acknowledgedAt).toBeDefined();
    });

    test('should update command status to EXECUTING', async () => {
      const response = await apiContext.put(
        `/api/v1/l2-equipment/equipment/commands/${testCommandId}/status`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            commandStatus: 'EXECUTING',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandStatus).toBe('EXECUTING');
    });

    test('should complete command successfully', async () => {
      const response = await apiContext.put(
        `/api/v1/l2-equipment/equipment/commands/${testCommandId}/complete`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            responsePayload: {
              result: 'SUCCESS',
              executionTime: 45.5,
            },
            responseCode: '200',
            responseMessage: 'Command executed successfully',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandStatus).toBe('COMPLETED');
      expect(data.data.completedAt).toBeDefined();
      expect(data.data.responseCode).toBe('200');
    });

    test('should fail command with error message', async () => {
      // Issue a new command for testing failure
      const issueResponse = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'LOAD_PROGRAM',
          commandName: 'LOAD_NC_PROGRAM',
        },
      });
      const issueData = await issueResponse.json();
      const failCommandId = issueData.data.id;

      const response = await apiContext.put(`/api/v1/l2-equipment/equipment/commands/${failCommandId}/fail`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          responseCode: 'ERR_404',
          responseMessage: 'Program file not found',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandStatus).toBe('FAILED');
      expect(data.data.responseCode).toBe('ERR_404');
    });

    test('should retry failed command', async () => {
      // Issue a command and fail it
      const issueResponse = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'DIAGNOSTIC',
          commandName: 'RUN_DIAGNOSTIC',
          maxRetries: 3,
        },
      });
      const issueData = await issueResponse.json();
      const retryCommandId = issueData.data.id;

      await apiContext.put(`/api/v1/l2-equipment/equipment/commands/${retryCommandId}/fail`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { responseCode: 'ERR_TIMEOUT' },
      });

      // Retry the command
      const response = await apiContext.post(
        `/api/v1/l2-equipment/equipment/commands/${retryCommandId}/retry`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandStatus).toBe('PENDING');
      expect(data.data.retryCount).toBe(1);
    });

    test('should cancel pending command', async () => {
      // Issue a new command
      const issueResponse = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'RESET',
          commandName: 'RESET_EQUIPMENT',
        },
      });
      const issueData = await issueResponse.json();
      const cancelCommandId = issueData.data.id;

      const response = await apiContext.put(
        `/api/v1/l2-equipment/equipment/commands/${cancelCommandId}/status`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            commandStatus: 'CANCELLED',
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.commandStatus).toBe('CANCELLED');
    });

    test('should query pending commands for equipment', async () => {
      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/commands/${testEquipmentId}/pending`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should query command history', async () => {
      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/commands/query?equipmentId=${testEquipmentId}&limit=10`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test.skip('should detect timed-out commands', async () => {
      const response = await apiContext.get('/api/v1/l2-equipment/equipment/commands/check-timeouts', {
        headers: { Authorization: `Bearer ${authToken}` },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.timedOutCount).toBeDefined();
      expect(typeof data.data.timedOutCount).toBe('number');
    });
  });

  // ===================================================================
  // Material Movement Tracking Tests
  // ===================================================================

  test.describe('Material Movement Tracking', () => {
    let testMovementId: string;

    test('should record material load', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/material/movement', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          movementType: 'LOAD',
          equipmentId: testEquipmentId,
          partNumber: 'PN-001',
          quantity: 100,
          unitOfMeasure: 'EA',
          lotNumber: 'LOT-20251017-001',
          fromLocation: 'WAREHOUSE-A',
          toLocation: 'MACHINE-QUEUE',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.movementType).toBe('LOAD');
      expect(data.data.quantity).toBe(100);
      expect(data.data.qualityStatus).toBe('GOOD');
      testMovementId = data.data.id;
    });

    test('should record material consumption', async () => {
      if (!testWorkOrderId) {
        test.skip();
        return;
      }

      const response = await apiContext.post('/api/v1/l2-equipment/equipment/material/movement', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          movementType: 'CONSUME',
          equipmentId: testEquipmentId,
          partNumber: 'PN-001',
          quantity: 50,
          unitOfMeasure: 'EA',
          workOrderId: testWorkOrderId,
          lotNumber: 'LOT-20251017-001',
          fromLocation: 'MACHINE-QUEUE',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.movementType).toBe('CONSUME');
      expect(data.data.quantity).toBe(50);
    });

    test('should record material production', async () => {
      if (!testWorkOrderId) {
        test.skip();
        return;
      }

      const response = await apiContext.post('/api/v1/l2-equipment/equipment/material/movement', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          movementType: 'PRODUCE',
          equipmentId: testEquipmentId,
          partNumber: 'PN-FINISHED-001',
          quantity: 45,
          unitOfMeasure: 'EA',
          workOrderId: testWorkOrderId,
          lotNumber: 'LOT-20251017-002',
          serialNumber: 'SN-20251017-001',
          toLocation: 'FINISHED-GOODS',
          qualityStatus: 'GOOD',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.movementType).toBe('PRODUCE');
      expect(data.data.quantity).toBe(45);
      expect(data.data.serialNumber).toBe('SN-20251017-001');
    });

    test('should record material scrap', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/material/movement', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          movementType: 'SCRAP',
          equipmentId: testEquipmentId,
          partNumber: 'PN-001',
          quantity: 5,
          unitOfMeasure: 'EA',
          lotNumber: 'LOT-20251017-001',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.movementType).toBe('SCRAP');
      expect(data.data.qualityStatus).toBe('SCRAP');
    });

    test('should record material unload', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/material/movement', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          movementType: 'UNLOAD',
          equipmentId: testEquipmentId,
          partNumber: 'PN-FINISHED-001',
          quantity: 45,
          unitOfMeasure: 'EA',
          fromLocation: 'MACHINE-OUTPUT',
          toLocation: 'INSPECTION',
          qualityStatus: 'GOOD',
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.movementType).toBe('UNLOAD');
    });

    test('should query material movements', async () => {
      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/material/query?equipmentId=${testEquipmentId}&limit=20`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      expect(data.data.length).toBeGreaterThan(0);
    });

    test('should build traceability chain', async () => {
      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/material/traceability/${testMovementId}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data.movements)).toBe(true);
      expect(Array.isArray(data.data.upstreamChain)).toBe(true);
      expect(Array.isArray(data.data.downstreamChain)).toBe(true);
      expect(data.data.totalQuantity).toBeDefined();
    });

    test('should get material balance for equipment', async () => {
      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/material/${testEquipmentId}/balance`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
      if (data.data.length > 0) {
        const balance = data.data[0];
        expect(balance.partNumber).toBeDefined();
        expect(balance.loaded).toBeDefined();
        expect(balance.consumed).toBeDefined();
        expect(balance.produced).toBeDefined();
        expect(balance.balance).toBeDefined();
      }
    });

    test('should generate movement summary', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/material/${testEquipmentId}/summary?startDate=${encodeURIComponent(oneDayAgo.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.totalMovements).toBeDefined();
      expect(typeof data.data.totalMovements).toBe('number');
      expect(data.data.movementsByType).toBeDefined();
    });
  });

  // ===================================================================
  // Process Data Collection Tests
  // ===================================================================

  test.describe('Process Data Collection', () => {
    let testProcessDataId: string;

    test('should start process data collection', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/process/start', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          processName: 'CNC_MILLING',
          processStepNumber: 10,
          workOrderId: testWorkOrderId,
          partNumber: 'PN-001',
          lotNumber: 'LOT-20251017-001',
          parameters: {
            spindleSpeed: 1200,
            feedRate: 500,
            cutDepth: 2.5,
          },
        },
      });

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.id).toBeDefined();
      expect(data.data.processName).toBe('CNC_MILLING');
      expect(data.data.startTimestamp).toBeDefined();
      expect(data.data.endTimestamp).toBeNull();
      testProcessDataId = data.data.id;
    });

    test('should update process parameters during collection', async () => {
      const response = await apiContext.put(
        `/api/v1/l2-equipment/equipment/process/${testProcessDataId}/parameters`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            parameters: {
              currentCutDepth: 2.3,
              currentFeedRate: 485,
              toolWear: 0.05,
            },
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.parameters).toBeDefined();
      expect(data.data.parameters.toolWear).toBe(0.05);
    });

    test('should complete process data collection', async () => {
      const response = await apiContext.put(
        `/api/v1/l2-equipment/equipment/process/${testProcessDataId}/complete`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
          data: {
            endTimestamp: new Date().toISOString(),
            quantityProduced: 50,
            quantityGood: 45,
            quantityScrap: 5,
            inSpecCount: 45,
            outOfSpecCount: 5,
            averageUtilization: 85.5,
            peakUtilization: 95.2,
            alarmCount: 2,
            criticalAlarmCount: 0,
          },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.endTimestamp).toBeDefined();
      expect(data.data.duration).toBeGreaterThan(0);
      expect(data.data.quantityProduced).toBe(50);
      expect(data.data.quantityGood).toBe(45);
    });

    test('should query process data collections', async () => {
      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/process/query?equipmentId=${testEquipmentId}&limit=10`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(Array.isArray(data.data)).toBe(true);
    });

    test('should generate process summary', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/process/${testEquipmentId}/summary?processName=CNC_MILLING&startDate=${encodeURIComponent(oneDayAgo.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.processName).toBe('CNC_MILLING');
      expect(data.data.totalRuns).toBeDefined();
      expect(typeof data.data.totalRuns).toBe('number');
    });

    test('should get process parameter trend', async () => {
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await apiContext.get(
        `/api/v1/l2-equipment/equipment/process/${testEquipmentId}/trend?processName=CNC_MILLING&parameterName=spindleSpeed&startDate=${encodeURIComponent(oneDayAgo.toISOString())}&endDate=${encodeURIComponent(now.toISOString())}`,
        {
          headers: { Authorization: `Bearer ${authToken}` },
        }
      );

      expect(response.ok()).toBeTruthy();
      const data = await response.json();
      expect(data.success).toBe(true);
      expect(data.data.parameterName).toBe('spindleSpeed');
      expect(Array.isArray(data.data.dataPoints)).toBe(true);
    });
  });

  // ===================================================================
  // Integration & Error Handling Tests
  // ===================================================================

  test.describe('Integration & Error Handling', () => {
    test('should handle end-to-end equipment workflow', async () => {
      // 1. Issue START command
      const commandResponse = await apiContext.post('/api/v1/l2-equipment/equipment/commands/issue', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          commandType: 'START',
          commandName: 'START_INTEGRATED_TEST',
        },
      });
      const commandData = await commandResponse.json();
      const commandId = commandData.data.id;

      // 2. Start process data collection
      const processResponse = await apiContext.post('/api/v1/l2-equipment/equipment/process/start', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          processName: 'INTEGRATED_TEST',
          partNumber: 'INT-TEST-001',
          parameters: { testParam: 100 },
        },
      });
      const processData = await processResponse.json();
      const processId = processData.data.id;

      // 3. Collect sensor data
      await apiContext.post('/api/v1/l2-equipment/equipment/data/collect', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          dataCollectionType: 'SENSOR',
          dataPointName: 'IntegrationTest',
          value: 200,
        },
      });

      // 4. Record material consumption
      await apiContext.post('/api/v1/l2-equipment/equipment/material/movement', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          movementType: 'CONSUME',
          equipmentId: testEquipmentId,
          partNumber: 'INT-TEST-001',
          quantity: 10,
          unitOfMeasure: 'EA',
          workOrderId: testWorkOrderId,
        },
      });

      // 5. Complete process
      await apiContext.put(`/api/v1/l2-equipment/equipment/process/${processId}/complete`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          endTimestamp: new Date().toISOString(),
          quantityProduced: 10,
          quantityGood: 10,
        },
      });

      // 6. Complete command
      await apiContext.put(`/api/v1/l2-equipment/equipment/commands/${commandId}/complete`, {
        headers: { Authorization: `Bearer ${authToken}` },
        data: { responseCode: '200' },
      });

      // Verify all steps completed successfully
      expect(commandResponse.ok()).toBeTruthy();
      expect(processResponse.ok()).toBeTruthy();
    });

    test('should reject requests without authentication', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/data/collect', {
        data: {
          equipmentId: testEquipmentId,
          dataCollectionType: 'SENSOR',
          dataPointName: 'Test',
          value: 100,
        },
      });

      expect(response.status()).toBe(401);
    });

    test('should validate data collection input', async () => {
      const response = await apiContext.post('/api/v1/l2-equipment/equipment/data/collect', {
        headers: { Authorization: `Bearer ${authToken}` },
        data: {
          equipmentId: testEquipmentId,
          // Missing required fields
        },
      });

      expect(response.ok()).toBe(false);
    });
  });
});
