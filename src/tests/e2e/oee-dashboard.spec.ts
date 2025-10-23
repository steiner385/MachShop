/**
 * OEE Dashboard E2E Tests
 * Tests for the GET /api/v1/equipment/oee/dashboard endpoint
 * Phase 3: Testing OEE dashboard aggregation and metrics
 */

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

test.describe('OEE Dashboard API - /api/v1/equipment/oee/dashboard', () => {
  let testEquipment1Id: string;
  let testEquipment2Id: string;
  let testEquipment3Id: string;

  test.beforeAll(async () => {
    // Create test equipment with varying OEE values for testing distribution
    // Delete any existing test equipment first
    await prisma.equipment.deleteMany({
      where: {
        equipmentNumber: {
          in: ['TEST-OEE-EXCELLENT', 'TEST-OEE-GOOD', 'TEST-OEE-POOR']
        }
      }
    });

    await new Promise(resolve => setTimeout(resolve, 100));

    // Get test site/area/workCenter
    const site = await prisma.site.findFirst();
    const area = await prisma.area.findFirst();
    const workCenter = await prisma.workCenter.findFirst();

    // Create equipment with excellent OEE (≥85%)
    const equipment1 = await prisma.equipment.create({
      data: {
        equipmentNumber: 'TEST-OEE-EXCELLENT',
        name: 'Excellent OEE Equipment',
        equipmentClass: 'PRODUCTION',
        equipmentType: 'CNC_MACHINE',
        equipmentLevel: 1,
        status: 'OPERATIONAL',
        currentState: 'RUNNING',
        siteId: site!.id,
        areaId: area!.id,
        workCenterId: workCenter?.id,
        oee: 92.5,
        availability: 95.0,
        performance: 97.5,
        quality: 100.0,
      }
    });
    testEquipment1Id = equipment1.id;

    // Create equipment with good OEE (70-85%)
    const equipment2 = await prisma.equipment.create({
      data: {
        equipmentNumber: 'TEST-OEE-GOOD',
        name: 'Good OEE Equipment',
        equipmentClass: 'PRODUCTION',
        equipmentType: 'ASSEMBLY',
        equipmentLevel: 1,
        status: 'OPERATIONAL',
        currentState: 'RUNNING',
        siteId: site!.id,
        areaId: area!.id,
        workCenterId: workCenter?.id,
        oee: 75.0,
        availability: 85.0,
        performance: 90.0,
        quality: 98.0,
      }
    });
    testEquipment2Id = equipment2.id;

    // Create equipment with poor OEE (<50%)
    const equipment3 = await prisma.equipment.create({
      data: {
        equipmentNumber: 'TEST-OEE-POOR',
        name: 'Poor OEE Equipment',
        equipmentClass: 'PRODUCTION',
        equipmentType: 'MATERIAL_HANDLING',
        equipmentLevel: 1,
        status: 'MAINTENANCE',
        currentState: 'FAULT',
        siteId: site!.id,
        areaId: area!.id,
        workCenterId: workCenter?.id,
        oee: 45.0,
        availability: 60.0,
        performance: 75.0,
        quality: 100.0,
      }
    });
    testEquipment3Id = equipment3.id;
  });

  test.afterAll(async () => {
    // Clean up test equipment
    if (testEquipment1Id) {
      await prisma.equipment.delete({ where: { id: testEquipment1Id } }).catch(() => {});
    }
    if (testEquipment2Id) {
      await prisma.equipment.delete({ where: { id: testEquipment2Id } }).catch(() => {});
    }
    if (testEquipment3Id) {
      await prisma.equipment.delete({ where: { id: testEquipment3Id } }).catch(() => {});
    }
  });

  test('should return OEE dashboard data with correct structure', async () => {
    const response = await apiContext.get('equipment/oee/dashboard', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    // Verify summary structure
    expect(dashboardData).toHaveProperty('summary');
    expect(dashboardData.summary).toHaveProperty('totalEquipment');
    expect(dashboardData.summary).toHaveProperty('equipmentWithOEE');
    expect(dashboardData.summary).toHaveProperty('averageOEE');
    expect(dashboardData.summary).toHaveProperty('averageAvailability');
    expect(dashboardData.summary).toHaveProperty('averagePerformance');
    expect(dashboardData.summary).toHaveProperty('averageQuality');

    // Verify distribution structure
    expect(dashboardData).toHaveProperty('distribution');
    expect(dashboardData.distribution).toHaveProperty('excellent'); // ≥85%
    expect(dashboardData.distribution).toHaveProperty('good');       // 70-85%
    expect(dashboardData.distribution).toHaveProperty('fair');       // 50-70%
    expect(dashboardData.distribution).toHaveProperty('poor');       // <50%
    expect(dashboardData.distribution).toHaveProperty('noData');

    // Verify status/state breakdowns
    expect(dashboardData).toHaveProperty('byStatus');
    expect(dashboardData).toHaveProperty('byState');

    // Verify performers
    expect(dashboardData).toHaveProperty('topPerformers');
    expect(dashboardData).toHaveProperty('bottomPerformers');
    expect(Array.isArray(dashboardData.topPerformers)).toBe(true);
    expect(Array.isArray(dashboardData.bottomPerformers)).toBe(true);
  });

  test('should calculate OEE distribution correctly', async () => {
    const response = await apiContext.get('equipment/oee/dashboard', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    // Verify our test equipment is categorized correctly
    const { distribution } = dashboardData;

    // Should have at least 1 excellent (≥85%), 1 good (70-85%), and 1 poor (<50%)
    expect(distribution.excellent).toBeGreaterThanOrEqual(1);
    expect(distribution.good).toBeGreaterThanOrEqual(1);
    expect(distribution.poor).toBeGreaterThanOrEqual(1);

    // Total distribution should equal total equipment with OEE data
    const totalCategorized = distribution.excellent + distribution.good +
                              distribution.fair + distribution.poor;
    expect(totalCategorized).toBe(dashboardData.summary.equipmentWithOEE - distribution.noData);
  });

  test('should return top performers ordered by OEE descending', async () => {
    const response = await apiContext.get('equipment/oee/dashboard?limit=10', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    const { topPerformers } = dashboardData;

    if (topPerformers.length > 1) {
      // Verify descending order
      for (let i = 0; i < topPerformers.length - 1; i++) {
        const current = topPerformers[i].oee || 0;
        const next = topPerformers[i + 1].oee || 0;
        expect(current).toBeGreaterThanOrEqual(next);
      }

      // Verify performer has required fields
      const firstPerformer = topPerformers[0];
      expect(firstPerformer).toHaveProperty('id');
      expect(firstPerformer).toHaveProperty('equipmentNumber');
      expect(firstPerformer).toHaveProperty('name');
      expect(firstPerformer).toHaveProperty('equipmentClass');
      expect(firstPerformer).toHaveProperty('oee');
      expect(firstPerformer).toHaveProperty('availability');
      expect(firstPerformer).toHaveProperty('performance');
      expect(firstPerformer).toHaveProperty('quality');
      expect(firstPerformer).toHaveProperty('status');
    }
  });

  test('should return bottom performers ordered by OEE ascending', async () => {
    const response = await apiContext.get('equipment/oee/dashboard?limit=10', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    const { bottomPerformers } = dashboardData;

    if (bottomPerformers.length > 1) {
      // Verify ascending order (worst first)
      for (let i = 0; i < bottomPerformers.length - 1; i++) {
        const current = bottomPerformers[i].oee || 0;
        const next = bottomPerformers[i + 1].oee || 0;
        expect(current).toBeLessThanOrEqual(next);
      }
    }
  });

  test('should filter by equipment class', async () => {
    const response = await apiContext.get('equipment/oee/dashboard?equipmentClass=PRODUCTION', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    // All performers should be PRODUCTION class
    const { topPerformers, bottomPerformers } = dashboardData;

    topPerformers.forEach((performer: any) => {
      expect(performer.equipmentClass).toBe('PRODUCTION');
    });

    bottomPerformers.forEach((performer: any) => {
      expect(performer.equipmentClass).toBe('PRODUCTION');
    });
  });

  test('should calculate average OEE correctly', async () => {
    const response = await apiContext.get('equipment/oee/dashboard', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    const { summary } = dashboardData;

    // Average OEE should be between 0 and 100
    expect(summary.averageOEE).toBeGreaterThanOrEqual(0);
    expect(summary.averageOEE).toBeLessThanOrEqual(100);

    // Similar for other metrics
    expect(summary.averageAvailability).toBeGreaterThanOrEqual(0);
    expect(summary.averageAvailability).toBeLessThanOrEqual(100);
    expect(summary.averagePerformance).toBeGreaterThanOrEqual(0);
    expect(summary.averagePerformance).toBeLessThanOrEqual(100);
    expect(summary.averageQuality).toBeGreaterThanOrEqual(0);
    expect(summary.averageQuality).toBeLessThanOrEqual(100);

    // Equipment counts should be non-negative
    expect(summary.totalEquipment).toBeGreaterThanOrEqual(0);
    expect(summary.equipmentWithOEE).toBeGreaterThanOrEqual(0);
    expect(summary.equipmentWithOEE).toBeLessThanOrEqual(summary.totalEquipment);
  });

  test('should respect limit parameter for top/bottom performers', async () => {
    const limit = 3;
    const response = await apiContext.get(`/api/v1/equipment/oee/dashboard?limit=${limit}`, {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    const { topPerformers, bottomPerformers } = dashboardData;

    // Should not exceed the limit
    expect(topPerformers.length).toBeLessThanOrEqual(limit);
    expect(bottomPerformers.length).toBeLessThanOrEqual(limit);
  });

  test('should handle request without authentication', async () => {
    const response = await apiContext.get('equipment/oee/dashboard');

    // Should return 401 Unauthorized
    expect(response.status()).toBe(401);
  });

  test('should calculate status breakdown correctly', async () => {
    const response = await apiContext.get('equipment/oee/dashboard', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    const { byStatus } = dashboardData;

    // Should have status categories
    expect(typeof byStatus).toBe('object');

    // Sum of all status counts should equal total equipment
    const totalByStatus = Object.values(byStatus).reduce((sum: number, count: any) => sum + count, 0);
    expect(totalByStatus).toBe(dashboardData.summary.totalEquipment);
  });

  test('should calculate state breakdown correctly', async () => {
    const response = await apiContext.get('equipment/oee/dashboard', {
      headers: { 'Authorization': `Bearer ${authToken}` }
    });

    expect(response.status()).toBe(200);
    const dashboardData = await response.json();

    const { byState } = dashboardData;

    // Should have state categories
    expect(typeof byState).toBe('object');

    // Sum of all state counts should equal total equipment
    const totalByState = Object.values(byState).reduce((sum: number, count: any) => sum + count, 0);
    expect(totalByState).toBe(dashboardData.summary.totalEquipment);
  });
});
