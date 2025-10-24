/**
 * Product Definition E2E Tests (ISA-95 Task 1.5)
 *
 * Tests for Product Definition Model including:
 * - Part CRUD operations
 * - Product specifications
 * - Product configurations and options
 * - Product lifecycle management
 * - BOM operations with process segment integration
 */

import { test, expect } from '@playwright/test';
import { loginAsTestUser } from '../helpers/testAuthHelper';

test.describe('Product Definition - Part CRUD Operations', () => {
  let authHeaders: Record<string, string>;
  let testPartId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);
  });

  test('should create a new part successfully', async ({ request }) => {
    const response = await request.post('/api/v1/products', {
      headers: authHeaders,
      data: {
        partNumber: `TEST-PART-${Date.now()}`,
        partName: 'Test Machined Part',
        description: 'Test part for E2E testing',
        partType: 'COMPONENT',
        productType: 'MADE_TO_STOCK',
        lifecycleState: 'DESIGN',
        unitOfMeasure: 'EA',
        weight: 2.5,
        weightUnit: 'LB',
        drawingNumber: 'DWG-12345',
        revision: 'A',
        makeOrBuy: 'MAKE',
        leadTimeDays: 10,
        standardCost: 45.50,
        currency: 'USD',
        isConfigurable: false,
        requiresFAI: true,
      },
    });

    expect(response.status()).toBe(201);
    const part = await response.json();
    expect(part.partNumber).toContain('TEST-PART-');
    expect(part.partName).toBe('Test Machined Part');
    expect(part.productType).toBe('MADE_TO_STOCK');
    expect(part.lifecycleState).toBe('DESIGN');
    expect(part.requiresFAI).toBe(true);

    testPartId = part.id;
  });

  test('should get part by ID', async ({ request }) => {
    const response = await request.get(`/api/v1/products/${testPartId}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const part = await response.json();
    expect(part.id).toBe(testPartId);
    expect(part.partName).toBe('Test Machined Part');
  });

  test('should update part details', async ({ request }) => {
    const response = await request.put(`/api/v1/products/${testPartId}`, {
      headers: authHeaders,
      data: {
        description: 'Updated description for testing',
        standardCost: 50.00,
        revision: 'B',
      },
    });

    expect(response.status()).toBe(200);
    const updatedPart = await response.json();
    expect(updatedPart.description).toBe('Updated description for testing');
    expect(updatedPart.standardCost).toBe(50.00);
    expect(updatedPart.revision).toBe('B');
  });

  test('should get all parts with filters', async ({ request }) => {
    const response = await request.get('/api/v1/products?productType=MADE_TO_STOCK&isActive=true', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const parts = await response.json();
    expect(Array.isArray(parts)).toBe(true);
    expect(parts.length).toBeGreaterThan(0);
  });

  test('should soft delete a part', async ({ request }) => {
    // Create a part to delete
    const createResponse = await request.post('/api/v1/products', {
      headers: authHeaders,
      data: {
        partNumber: `DELETE-TEST-${Date.now()}`,
        partName: 'Part to Delete',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
      },
    });
    const partToDelete = await createResponse.json();

    // Soft delete
    const deleteResponse = await request.delete(`/api/v1/products/${partToDelete.id}`, {
      headers: authHeaders,
    });

    expect(deleteResponse.status()).toBe(200);
    const result = await deleteResponse.json();
    expect(result.message).toContain('deactivated');
  });
});

test.describe('Product Specifications', () => {
  // Configure serial mode to ensure tests run in order and share state
  test.describe.configure({ mode: 'serial' });

  let authHeaders: Record<string, string>;
  let testPartId: string;
  let testSpecId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create a test part
    const response = await request.post('/api/v1/products', {
      headers: authHeaders,
      data: {
        partNumber: `SPEC-TEST-${Date.now()}`,
        partName: 'Part with Specifications',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
      },
    });
    const part = await response.json();
    testPartId = part.id;
  });

  test('should add specification to part', async ({ request }) => {
    const response = await request.post(`/api/v1/products/${testPartId}/specifications`, {
      headers: authHeaders,
      data: {
        specificationName: 'Overall Length',
        specificationType: 'PHYSICAL',
        nominalValue: 10.000,
        minValue: 9.995,
        maxValue: 10.005,
        unitOfMeasure: 'IN',
        testMethod: 'Caliper measurement',
        inspectionFrequency: '100%',
        isCritical: true,
        isRegulatory: false,
        documentReferences: ['DWG-12345', 'SPEC-789'],
      },
    });

    expect(response.status()).toBe(201);
    const spec = await response.json();
    expect(spec.specificationName).toBe('Overall Length');
    expect(spec.specificationType).toBe('PHYSICAL');
    expect(spec.isCritical).toBe(true);
    expect(spec.nominalValue).toBe(10.000);

    testSpecId = spec.id;
  });

  test('should get all specifications for a part', async ({ request }) => {
    const response = await request.get(`/api/v1/products/${testPartId}/specifications`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const specs = await response.json();
    expect(Array.isArray(specs)).toBe(true);
    expect(specs.length).toBeGreaterThan(0);
    expect(specs[0].specificationName).toBe('Overall Length');
  });

  test('should update specification', async ({ request }) => {
    const response = await request.put(`/api/v1/products/specifications/${testSpecId}`, {
      headers: authHeaders,
      data: {
        maxValue: 10.010,
        notes: 'Tolerance increased per ECO-123',
      },
    });

    expect(response.status()).toBe(200);
    const updatedSpec = await response.json();
    expect(updatedSpec.maxValue).toBe(10.010);
    expect(updatedSpec.notes).toBe('Tolerance increased per ECO-123');
  });

  test('should delete specification', async ({ request }) => {
    const response = await request.delete(`/api/v1/products/specifications/${testSpecId}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.message).toContain('deleted');
  });
});

test.describe('Product Configurations and Options', () => {
  let authHeaders: Record<string, string>;
  let testPartId: string;
  let testConfigId: string;
  let testOptionId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create a configurable part
    const response = await request.post('/api/v1/products', {
      headers: authHeaders,
      data: {
        partNumber: `CONFIG-TEST-${Date.now()}`,
        partName: 'Configurable Product',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA',
        isConfigurable: true,
      },
    });
    const part = await response.json();
    testPartId = part.id;
  });

  test('should add configuration to part', async ({ request }) => {
    const response = await request.post(`/api/v1/products/${testPartId}/configurations`, {
      headers: authHeaders,
      data: {
        configurationName: 'Premium Configuration',
        configurationType: 'VARIANT',
        description: 'Premium features included',
        configurationCode: 'PREM',
        attributes: {
          size: 'Large',
          color: 'Blue',
          voltage: '220V',
        },
        priceModifier: 250.00,
        costModifier: 150.00,
        leadTimeDelta: 5,
        isDefault: false,
        marketingName: 'Premium Edition',
      },
    });

    expect(response.status()).toBe(201);
    const config = await response.json();
    expect(config.configurationName).toBe('Premium Configuration');
    expect(config.configurationType).toBe('VARIANT');
    expect(config.priceModifier).toBe(250.00);
    expect(config.attributes.size).toBe('Large');

    testConfigId = config.id;
  });

  test('should get all configurations for a part', async ({ request }) => {
    const response = await request.get(`/api/v1/products/${testPartId}/configurations`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const configs = await response.json();
    expect(Array.isArray(configs)).toBe(true);
    expect(configs.length).toBeGreaterThan(0);
  });

  test('should add option to configuration', async ({ request }) => {
    const response = await request.post(`/api/v1/products/configurations/${testConfigId}/options`, {
      headers: authHeaders,
      data: {
        optionName: 'Extended Warranty',
        optionCode: 'EXT-WARR-3Y',
        description: '3-year extended warranty coverage',
        optionCategory: 'WARRANTY',
        optionValue: '3 Years',
        isRequired: false,
        isDefault: false,
        priceModifier: 99.99,
        costModifier: 25.00,
        displayOrder: 1,
      },
    });

    expect(response.status()).toBe(201);
    const option = await response.json();
    expect(option.optionName).toBe('Extended Warranty');
    expect(option.priceModifier).toBe(99.99);

    testOptionId = option.id;
  });

  test('should update configuration option', async ({ request }) => {
    const response = await request.put(`/api/v1/products/options/${testOptionId}`, {
      headers: authHeaders,
      data: {
        priceModifier: 89.99,
        description: '3-year extended warranty with priority support',
      },
    });

    expect(response.status()).toBe(200);
    const updatedOption = await response.json();
    expect(updatedOption.priceModifier).toBe(89.99);
  });

  test('should delete configuration option', async ({ request }) => {
    const response = await request.delete(`/api/v1/products/options/${testOptionId}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
  });

  test('should get configurable parts list', async ({ request }) => {
    const response = await request.get('/api/v1/products/configurable/list', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const configurableParts = await response.json();
    expect(Array.isArray(configurableParts)).toBe(true);
  });
});

test.describe('Product Lifecycle Management', () => {
  let authHeaders: Record<string, string>;
  let testPartId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create a part for lifecycle testing
    const response = await request.post('/api/v1/products', {
      headers: authHeaders,
      data: {
        partNumber: `LIFECYCLE-TEST-${Date.now()}`,
        partName: 'Part for Lifecycle Testing',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
        lifecycleState: 'DESIGN',
      },
    });
    const part = await response.json();
    testPartId = part.id;
  });

  test('should transition part from DESIGN to PROTOTYPE', async ({ request }) => {
    const response = await request.post(`/api/v1/products/${testPartId}/lifecycle/transition`, {
      headers: authHeaders,
      data: {
        newState: 'PROTOTYPE',
        reason: 'Design review completed, moving to prototype phase',
        ecoNumber: 'ECO-2024-001',
        impactAssessment: 'No impact on existing production',
      },
    });

    expect(response.status()).toBe(201);
    const lifecycleRecord = await response.json();
    expect(lifecycleRecord.previousState).toBe('DESIGN');
    expect(lifecycleRecord.newState).toBe('PROTOTYPE');
    expect(lifecycleRecord.ecoNumber).toBe('ECO-2024-001');
  });

  test('should transition part from PROTOTYPE to PRODUCTION', async ({ request }) => {
    const response = await request.post(`/api/v1/products/${testPartId}/lifecycle/transition`, {
      headers: authHeaders,
      data: {
        newState: 'PRODUCTION',
        reason: 'Prototype testing successful, releasing to production',
      },
    });

    expect(response.status()).toBe(201);
    const lifecycleRecord = await response.json();
    expect(lifecycleRecord.previousState).toBe('PROTOTYPE');
    expect(lifecycleRecord.newState).toBe('PRODUCTION');
  });

  test('should get lifecycle history for part', async ({ request }) => {
    const response = await request.get(`/api/v1/products/${testPartId}/lifecycle/history`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const history = await response.json();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(2); // At least 2 transitions
    expect(history[0].newState).toBe('PRODUCTION'); // Most recent first
  });

  test('should get parts by lifecycle state', async ({ request }) => {
    const response = await request.get('/api/v1/products/lifecycle/PRODUCTION', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const productionParts = await response.json();
    expect(Array.isArray(productionParts)).toBe(true);
  });

  test('should transition part to OBSOLETE', async ({ request }) => {
    const response = await request.post(`/api/v1/products/${testPartId}/lifecycle/transition`, {
      headers: authHeaders,
      data: {
        newState: 'OBSOLETE',
        reason: 'Replaced by newer design',
        ecoNumber: 'ECO-2024-999',
      },
    });

    expect(response.status()).toBe(201);
    const lifecycleRecord = await response.json();
    expect(lifecycleRecord.newState).toBe('OBSOLETE');
  });
});

test.describe('BOM Operations with Process Segment Integration', () => {
  // Configure serial mode to ensure tests run in order and share state
  test.describe.configure({ mode: 'serial' });

  let authHeaders: Record<string, string>;
  let parentPartId: string;
  let componentPartId: string;
  let processSegmentId: string;
  let bomItemId: string;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);

    // Create parent assembly part
    const parentResponse = await request.post('/api/v1/products', {
      headers: authHeaders,
      data: {
        partNumber: `ASSEMBLY-${Date.now()}`,
        partName: 'Test Assembly',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA',
      },
    });
    const parentPart = await parentResponse.json();
    parentPartId = parentPart.id;

    // Create component part
    const componentResponse = await request.post('/api/v1/products', {
      headers: authHeaders,
      data: {
        partNumber: `COMPONENT-${Date.now()}`,
        partName: 'Test Component',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
      },
    });
    const componentPart = await componentResponse.json();
    componentPartId = componentPart.id;

    // Get a process segment for integration testing
    const segmentsResponse = await request.get('/api/v1/process-segments', {
      headers: authHeaders,
    });
    const segments = await segmentsResponse.json();
    if (segments.length > 0) {
      processSegmentId = segments[0].id;
    }
  });

  test('should add BOM item with process segment link', async ({ request }) => {
    const response = await request.post(`/api/v1/products/${parentPartId}/bom`, {
      headers: authHeaders,
      data: {
        componentPartId,
        quantity: 4,
        unitOfMeasure: 'EA',
        scrapFactor: 2.5,
        sequence: 10,
        findNumber: '1',
        referenceDesignator: 'C1, C2, C3, C4',
        operationId: processSegmentId || undefined,
        operationNumber: 20,
        isCritical: true,
        notes: 'Install during assembly operation',
      },
    });

    expect(response.status()).toBe(201);
    const bomItem = await response.json();
    expect(bomItem.quantity).toBe(4);
    expect(bomItem.scrapFactor).toBe(2.5);
    expect(bomItem.isCritical).toBe(true);
    expect(bomItem.findNumber).toBe('1');

    bomItemId = bomItem.id;
  });

  test('should get BOM for parent part', async ({ request }) => {
    const response = await request.get(`/api/v1/products/${parentPartId}/bom`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const bom = await response.json();
    expect(Array.isArray(bom)).toBe(true);
    expect(bom.length).toBeGreaterThan(0);
    expect(bom[0].componentPart).toBeDefined();
    expect(bom[0].componentPart.partName).toBe('Test Component');
  });

  test('should get where-used for component part', async ({ request }) => {
    const response = await request.get(`/api/v1/products/${componentPartId}/where-used`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const whereUsed = await response.json();
    expect(Array.isArray(whereUsed)).toBe(true);
    expect(whereUsed.length).toBeGreaterThan(0);
    expect(whereUsed[0].parentPart.partName).toBe('Test Assembly');
  });

  test('should update BOM item', async ({ request }) => {
    const response = await request.put(`/api/v1/products/bom/${bomItemId}`, {
      headers: authHeaders,
      data: {
        quantity: 6,
        scrapFactor: 3.0,
        notes: 'Quantity updated per ECO-456',
      },
    });

    expect(response.status()).toBe(200);
    const updatedBomItem = await response.json();
    expect(updatedBomItem.quantity).toBe(6);
    expect(updatedBomItem.scrapFactor).toBe(3.0);
  });

  test('should soft delete BOM item', async ({ request }) => {
    const response = await request.delete(`/api/v1/products/bom/${bomItemId}`, {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result.message).toContain('deactivated');
  });
});

test.describe('Product Statistics and Reporting', () => {
  let authHeaders: Record<string, string>;

  test.beforeAll(async ({ request }) => {
    authHeaders = await loginAsTestUser(request);
  });

  test('should get product statistics overview', async ({ request }) => {
    const response = await request.get('/api/v1/products/statistics/overview', {
      headers: authHeaders,
    });

    expect(response.status()).toBe(200);
    const stats = await response.json();
    expect(stats.parts).toBeDefined();
    expect(stats.parts.total).toBeGreaterThan(0);
    expect(stats.parts.active).toBeGreaterThan(0);
    expect(stats.specifications).toBeDefined();
    expect(stats.configurations).toBeDefined();
    expect(stats.bom).toBeDefined();
    expect(stats.lifecycle).toBeDefined();
  });
});
