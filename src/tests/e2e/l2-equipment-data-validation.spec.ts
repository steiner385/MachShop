/**
 * L2 Equipment Data Collection Validation E2E Tests
 * GitHub Issue #14: Enhanced validation for equipment data collection
 *
 * Tests for enhanced error messages and validation in ISA-95 Level 2 equipment data collection
 */

import { test, expect, request as playwrightRequest } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BASE_URL = process.env.API_URL || 'http://localhost:3101';

let authToken: string;
let testEquipmentId: string;

test.beforeAll(async () => {
  // Get authentication token by logging in via API
  const apiContext = await playwrightRequest.newContext({ baseURL: BASE_URL });
  const loginResponse = await apiContext.post('/api/v1/auth/login', {
    data: {
      username: 'admin',
      password: 'password123',
    },
  });

  if (!loginResponse.ok()) {
    throw new Error(`API login failed during test setup. Status: ${loginResponse.status()}`);
  }

  const loginData = await loginResponse.json();
  authToken = loginData.token;

  // Create test equipment
  const equipment = await prisma.equipment.create({
    data: {
      equipmentNumber: 'L2-TEST-EQ-001',
      name: 'L2 Test Equipment for Validation',
      equipmentClass: 'PRODUCTION',
      type: 'CNC',
      equipmentLevel: 3,
      status: 'OPERATIONAL',
    },
  });
  testEquipmentId = equipment.id;
});

test.afterAll(async () => {
  // Clean up test data
  await prisma.equipmentDataCollection.deleteMany({
    where: { equipmentId: testEquipmentId },
  });

  await prisma.equipment.delete({
    where: { id: testEquipmentId },
  });

  await prisma.$disconnect();
});

test.describe('L2 Equipment Data Collection Validation', () => {
  // ✅ GITHUB ISSUE #14 TEST: Enhanced validation for equipment data collection

  test('should provide enhanced error message for non-existent equipment', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        equipmentId: 'NONEXISTENT-EQUIPMENT-ID',
        dataCollectionType: 'SENSOR',
        dataPointName: 'temperature',
        value: 25.5,
      },
    });

    expect(response.status()).toBe(404);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe('EQUIPMENT_NOT_FOUND');
    expect(body.message).toContain('Equipment with ID NONEXISTENT-EQUIPMENT-ID not found');
    expect(body.message).toContain('system registry');
    expect(body.message).toContain('ISA-95 Level 2 equipment hierarchy');
    expect(body.context).toBe('ISA-95 Level 2 Equipment Data Collection');
    expect(body.troubleshooting).toContain('Verify equipment ID exists in the ISA-95 equipment hierarchy');
  });

  test('should provide enhanced error message for invalid equipment ID format', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        equipmentId: '   ', // Invalid ID (just spaces)
        dataCollectionType: 'SENSOR',
        dataPointName: 'temperature',
        value: 25.5,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('INVALID_EQUIPMENT_ID');
    expect(body.message).toContain('Invalid equipment ID provided');
    expect(body.message).toContain('Equipment ID must be a non-empty string');
    expect(body.context).toBe('ISA-95 Level 2 Equipment Data Collection');
    expect(body.troubleshooting).toContain('Provide a valid, non-empty equipment ID');
  });

  test('should provide enhanced error message for missing required fields', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        equipmentId: testEquipmentId,
        // Missing dataCollectionType, dataPointName, and value
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('Equipment data collection requires all mandatory fields');
    expect(body.message).toContain('ISA-95 Level 2 compliance');
    expect(body.details.missingFields).toContain('dataCollectionType');
    expect(body.details.missingFields).toContain('dataPointName');
    expect(body.details.missingFields).toContain('value');
    expect(body.details.suggestion).toContain('Include all required fields');
  });

  test('should provide enhanced error message for invalid request body', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: null, // Invalid request body
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('Request body must contain equipment data collection parameters');
    expect(body.details.expected).toContain('Object with equipmentId, dataCollectionType, dataPointName, and value fields');
  });

  test('should successfully collect valid data point', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        equipmentId: testEquipmentId,
        dataCollectionType: 'SENSOR',
        dataPointName: 'temperature',
        value: 25.5,
        unitOfMeasure: 'C',
        quality: 'GOOD',
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toBe('Data point collected successfully');
    expect(body.data).toBeDefined();
    expect(body.data.equipmentId).toBe(testEquipmentId);
    expect(body.data.dataCollectionType).toBe('SENSOR');
    expect(body.data.dataPointName).toBe('temperature');
    expect(body.data.numericValue).toBe(25.5);
  });
});

test.describe('L2 Equipment Batch Data Collection Validation', () => {
  // ✅ GITHUB ISSUE #14 TEST: Enhanced validation for batch data collection

  test('should provide enhanced error message for missing dataPoints field', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect-batch`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        // Missing dataPoints field
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('Batch data collection requires a dataPoints array');
    expect(body.message).toContain('processing multiple equipment measurements');
    expect(body.details.field).toBe('dataPoints');
    expect(body.details.expected).toBe('Array of data point objects');
  });

  test('should provide enhanced error message for non-array dataPoints', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect-batch`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        dataPoints: 'not-an-array', // Invalid type
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('Data points must be provided as an array for batch processing');
    expect(body.details.field).toBe('dataPoints');
    expect(body.details.provided).toBe('string');
    expect(body.details.suggestion).toContain('Wrap individual data points in an array structure');
  });

  test('should provide enhanced error message for empty dataPoints array', async ({ request }) => {
    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect-batch`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        dataPoints: [], // Empty array
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('Batch data collection requires at least one data point to process');
    expect(body.details.field).toBe('dataPoints');
    expect(body.details.provided).toBe('Empty array');
    expect(body.details.suggestion).toContain('Include at least one data point object');
  });

  test('should provide enhanced error message for oversized batch', async ({ request }) => {
    // Create an array with more than 1000 items
    const oversizedDataPoints = Array.from({ length: 1001 }, (_, i) => ({
      equipmentId: testEquipmentId,
      dataCollectionType: 'SENSOR',
      dataPointName: `temperature_${i}`,
      value: 25.0 + i * 0.1,
    }));

    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect-batch`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        dataPoints: oversizedDataPoints,
      },
    });

    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('VALIDATION_ERROR');
    expect(body.message).toContain('Batch size exceeds maximum limit');
    expect(body.message).toContain('equipment data collection processing');
    expect(body.details.field).toBe('dataPoints');
    expect(body.details.provided).toBe(1001);
    expect(body.details.maximum).toBe(1000);
    expect(body.details.suggestion).toContain('Split large batches into smaller chunks');
  });

  test('should successfully process valid batch data collection', async ({ request }) => {
    const dataPoints = [
      {
        equipmentId: testEquipmentId,
        dataCollectionType: 'SENSOR',
        dataPointName: 'temperature',
        value: 25.5,
        unitOfMeasure: 'C',
      },
      {
        equipmentId: testEquipmentId,
        dataCollectionType: 'SENSOR',
        dataPointName: 'pressure',
        value: 101.3,
        unitOfMeasure: 'kPa',
      },
    ];

    const response = await request.post(`${BASE_URL}/api/v1/l2-equipment/equipment/data/collect-batch`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json',
      },
      data: {
        dataPoints,
      },
    });

    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain('Collected 2 data points, 0 failed');
    expect(body.data.successful).toHaveLength(2);
    expect(body.data.failed).toHaveLength(0);
  });
});