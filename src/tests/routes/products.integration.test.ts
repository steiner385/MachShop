import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import productRoutes from '../../routes/products';
import { ProductService } from '../../services/ProductService';
import { MaterialService } from '../../services/MaterialService';
import { RoutingService } from '../../services/RoutingService';
import {
  AuthTestHelper,
  RequestTestHelper,
  ValidationTestHelper,
  ResponseTestHelper,
  DatabaseTestHelper
} from '../helpers/routeTestHelpers';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData } from '../helpers/database';

/**
 * Integration Tests for Product Routes
 *
 * These tests verify complete request flows including:
 * - Full database integration (not mocked)
 * - Real service interactions
 * - Actual middleware execution
 * - End-to-end request/response cycles
 * - Cross-service dependencies
 */

describe('Product Routes - Integration Tests', () => {
  let app: express.Application;
  let testDb: PrismaClient;
  let testUser: any;
  let testSite: any;

  beforeAll(async () => {
    testDb = await setupTestDatabase();
  });

  afterAll(async () => {
    await teardownTestDatabase();
  });

  beforeEach(async () => {
    // Setup real Express app with actual services (no mocking)
    app = express();
    app.use(express.json());

    // Setup real authentication middleware
    app.use((req, res, next) => {
      req.user = testUser;
      next();
    });

    // Mount the actual product routes
    app.use('/api/v1/products', productRoutes);

    // Create test user and site
    testUser = AuthTestHelper.createSupervisorUser();
    testSite = DatabaseTestHelper.createTestSite();

    // Create real test data in database
    await testDb.site.upsert({
      where: { siteCode: testSite.siteCode },
      update: {},
      create: testSite
    });

    await testDb.user.upsert({
      where: { username: testUser.username },
      update: {},
      create: {
        id: testUser.id,
        username: testUser.username,
        email: testUser.email,
        firstName: testUser.firstName,
        lastName: testUser.lastName,
        passwordHash: '$2b$10$test.hash.value',
        roles: testUser.roles,
        permissions: testUser.permissions,
        isActive: testUser.isActive
      }
    });
  });

  afterEach(async () => {
    await cleanupTestData(testDb);
  });

  describe('Product Lifecycle Integration', () => {
    it('should create, retrieve, update, and delete a product through complete workflow', async () => {
      // Step 1: Create a new product
      const createProductData = {
        partNumber: 'PROD-INT-001',
        partName: 'Integration Test Product',
        partType: 'MANUFACTURED',
        description: 'Product for integration testing',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 25.50,
        specifications: {
          material: 'Aluminum 6061',
          finish: 'Anodized',
          weight: '2.5 lbs'
        }
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, createProductData
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data).toHaveProperty('id');
      expect(createResponse.body.data.partNumber).toBe(createProductData.partNumber);

      const productId = createResponse.body.data.id;

      // Step 2: Retrieve the created product
      const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/products/${productId}`, testUser
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(productId);
      expect(getResponse.body.data.partNumber).toBe(createProductData.partNumber);

      // Step 3: Update the product
      const updateData = {
        partName: 'Updated Integration Test Product',
        standardCost: 30.00,
        specifications: {
          ...createProductData.specifications,
          weight: '3.0 lbs'
        }
      };

      const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', `/api/v1/products/${productId}`, testUser, updateData
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.partName).toBe(updateData.partName);
      expect(updateResponse.body.data.standardCost).toBe(updateData.standardCost);

      // Step 4: Verify the update persisted
      const getUpdatedResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/products/${productId}`, testUser
      );

      expect(getUpdatedResponse.body.data.partName).toBe(updateData.partName);
      expect(getUpdatedResponse.body.data.standardCost).toBe(updateData.standardCost);

      // Step 5: Delete the product
      const deleteResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', `/api/v1/products/${productId}`, testUser
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Step 6: Verify deletion
      const getDeletedResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/products/${productId}`, testUser
      );

      expect(getDeletedResponse.status).toBe(404);
    });

    it('should handle product creation with BOM (Bill of Materials)', async () => {
      // First create some component parts
      const component1Data = {
        partNumber: 'COMP-001',
        partName: 'Component 1',
        partType: 'PURCHASED',
        description: 'First component',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 5.00
      };

      const component1Response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, component1Data
      );

      const component1Id = component1Response.body.data.id;

      const component2Data = {
        partNumber: 'COMP-002',
        partName: 'Component 2',
        partType: 'PURCHASED',
        description: 'Second component',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 3.50
      };

      const component2Response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, component2Data
      );

      const component2Id = component2Response.body.data.id;

      // Create assembly product with BOM
      const assemblyData = {
        partNumber: 'ASSY-001',
        partName: 'Test Assembly',
        partType: 'MANUFACTURED',
        description: 'Assembly with BOM',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 20.00,
        billOfMaterials: [
          {
            componentId: component1Id,
            quantity: 2,
            unitOfMeasure: 'EA'
          },
          {
            componentId: component2Id,
            quantity: 1,
            unitOfMeasure: 'EA'
          }
        ]
      };

      const assemblyResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, assemblyData
      );

      expect(assemblyResponse.status).toBe(201);
      expect(assemblyResponse.body.data.billOfMaterials).toHaveLength(2);
      expect(assemblyResponse.body.data.billOfMaterials[0].quantity).toBe(2);
      expect(assemblyResponse.body.data.billOfMaterials[1].quantity).toBe(1);

      // Verify BOM is retrievable
      const getAssemblyResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/products/${assemblyResponse.body.data.id}`, testUser
      );

      expect(getAssemblyResponse.body.data.billOfMaterials).toHaveLength(2);
      expect(getAssemblyResponse.body.data.billOfMaterials[0].component.partNumber).toBe('COMP-001');
      expect(getAssemblyResponse.body.data.billOfMaterials[1].component.partNumber).toBe('COMP-002');
    });
  });

  describe('Product Search and Filtering Integration', () => {
    beforeEach(async () => {
      // Create test products for search testing
      const testProducts = [
        {
          partNumber: 'SEARCH-001',
          partName: 'Aluminum Housing',
          partType: 'MANUFACTURED',
          description: 'Aluminum housing for motor assembly',
          revision: 'A',
          unitOfMeasure: 'EA',
          standardCost: 15.00,
          category: 'Housing'
        },
        {
          partNumber: 'SEARCH-002',
          partName: 'Steel Bracket',
          partType: 'MANUFACTURED',
          description: 'Steel mounting bracket',
          revision: 'B',
          unitOfMeasure: 'EA',
          standardCost: 8.50,
          category: 'Bracket'
        },
        {
          partNumber: 'SEARCH-003',
          partName: 'Aluminum Plate',
          partType: 'PURCHASED',
          description: 'Raw aluminum plate material',
          revision: 'A',
          unitOfMeasure: 'LB',
          standardCost: 3.25,
          category: 'Material'
        }
      ];

      for (const productData of testProducts) {
        await RequestTestHelper.makeAuthenticatedRequest(
          app, 'post', '/api/v1/products', testUser, productData
        );
      }
    });

    it('should search products by part number', async () => {
      const searchResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        { search: 'SEARCH-001' }
      );

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.data).toHaveLength(1);
      expect(searchResponse.body.data[0].partNumber).toBe('SEARCH-001');
    });

    it('should search products by material type', async () => {
      const searchResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        { search: 'aluminum' }
      );

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.data).toHaveLength(2); // Both aluminum products

      const partNumbers = searchResponse.body.data.map((p: any) => p.partNumber);
      expect(partNumbers).toContain('SEARCH-001');
      expect(partNumbers).toContain('SEARCH-003');
    });

    it('should filter products by part type', async () => {
      const filterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        { partType: 'MANUFACTURED' }
      );

      expect(filterResponse.status).toBe(200);
      expect(filterResponse.body.data).toHaveLength(2); // Two manufactured parts

      filterResponse.body.data.forEach((product: any) => {
        expect(product.partType).toBe('MANUFACTURED');
      });
    });

    it('should filter products by cost range', async () => {
      const filterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        { minCost: '5.00', maxCost: '10.00' }
      );

      expect(filterResponse.status).toBe(200);
      expect(filterResponse.body.data).toHaveLength(1); // Steel bracket at $8.50
      expect(filterResponse.body.data[0].partNumber).toBe('SEARCH-002');
    });

    it('should combine multiple filters', async () => {
      const filterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        {
          partType: 'MANUFACTURED',
          search: 'aluminum',
          minCost: '10.00'
        }
      );

      expect(filterResponse.status).toBe(200);
      expect(filterResponse.body.data).toHaveLength(1); // Only aluminum housing
      expect(filterResponse.body.data[0].partNumber).toBe('SEARCH-001');
    });
  });

  describe('Product-Routing Integration', () => {
    it('should create product with routing and verify relationships', async () => {
      // Create a routing first
      const routingData = {
        routingNumber: 'RT-INT-001',
        routingName: 'Standard Machining Route',
        description: 'Standard routing for machined parts',
        operations: [
          {
            operationNumber: '010',
            operationName: 'Setup',
            description: 'Machine setup and fixture',
            standardTime: 15,
            workCenterCode: 'WC-001'
          },
          {
            operationNumber: '020',
            operationName: 'Rough Cut',
            description: 'Rough machining operation',
            standardTime: 30,
            workCenterCode: 'WC-001'
          }
        ]
      };

      const routingResponse = await request(app)
        .post('/api/v1/routings')
        .set('Authorization', `Bearer test-token-${testUser.id}`)
        .send(routingData);

      const routingId = routingResponse.body.data.id;

      // Create product with routing reference
      const productData = {
        partNumber: 'PROD-RT-001',
        partName: 'Machined Component',
        partType: 'MANUFACTURED',
        description: 'Component requiring machining',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 45.00,
        defaultRoutingId: routingId
      };

      const productResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, productData
      );

      expect(productResponse.status).toBe(201);
      expect(productResponse.body.data.defaultRoutingId).toBe(routingId);

      // Verify routing relationship
      const getProductResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/products/${productResponse.body.data.id}`, testUser
      );

      expect(getProductResponse.body.data.defaultRouting).toBeDefined();
      expect(getProductResponse.body.data.defaultRouting.routingNumber).toBe('RT-INT-001');
      expect(getProductResponse.body.data.defaultRouting.operations).toHaveLength(2);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle constraint violations gracefully', async () => {
      // Create a product
      const productData = {
        partNumber: 'UNIQUE-001',
        partName: 'Unique Product',
        partType: 'MANUFACTURED',
        description: 'Product with unique part number',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 25.00
      };

      const firstResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, productData
      );

      expect(firstResponse.status).toBe(201);

      // Try to create another product with same part number
      const duplicateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, productData
      );

      expect(duplicateResponse.status).toBe(409);
      expect(duplicateResponse.body.success).toBe(false);
      expect(duplicateResponse.body.error).toContain('Part number already exists');
    });

    it('should handle invalid foreign key references', async () => {
      const productData = {
        partNumber: 'INVALID-REF-001',
        partName: 'Invalid Reference Product',
        partType: 'MANUFACTURED',
        description: 'Product with invalid routing reference',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 25.00,
        defaultRoutingId: 'non-existent-routing-id'
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, productData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid routing reference');
    });

    it('should handle database connection issues', async () => {
      // Temporarily break database connection
      await testDb.$disconnect();

      const productData = {
        partNumber: 'DB-ERROR-001',
        partName: 'Database Error Product',
        partType: 'MANUFACTURED',
        description: 'Product to test DB error handling',
        revision: 'A',
        unitOfMeasure: 'EA',
        standardCost: 25.00
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/products', testUser, productData
      );

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Database connection failed');

      // Reconnect for cleanup
      await testDb.$connect();
    });
  });

  describe('Performance and Pagination Integration', () => {
    beforeEach(async () => {
      // Create a large dataset for pagination testing
      const products = [];
      for (let i = 1; i <= 25; i++) {
        products.push({
          partNumber: `PERF-${String(i).padStart(3, '0')}`,
          partName: `Performance Test Product ${i}`,
          partType: i % 2 === 0 ? 'MANUFACTURED' : 'PURCHASED',
          description: `Product ${i} for performance testing`,
          revision: 'A',
          unitOfMeasure: 'EA',
          standardCost: i * 2.5
        });
      }

      // Create products in batches to avoid overwhelming the database
      for (const productData of products) {
        await RequestTestHelper.makeAuthenticatedRequest(
          app, 'post', '/api/v1/products', testUser, productData
        );
      }
    });

    it('should handle pagination correctly with large datasets', async () => {
      // Test first page
      const page1Response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        { page: 1, limit: 10 }
      );

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data).toHaveLength(10);
      expect(page1Response.body.pagination.page).toBe(1);
      expect(page1Response.body.pagination.totalPages).toBeGreaterThanOrEqual(3);

      // Test second page
      const page2Response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        { page: 2, limit: 10 }
      );

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data).toHaveLength(10);
      expect(page2Response.body.pagination.page).toBe(2);

      // Verify different results
      const page1Ids = page1Response.body.data.map((p: any) => p.id);
      const page2Ids = page2Response.body.data.map((p: any) => p.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('should handle sorting with pagination', async () => {
      const sortedResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/products', testUser, undefined,
        { page: 1, limit: 5, sortBy: 'standardCost', sortOrder: 'desc' }
      );

      expect(sortedResponse.status).toBe(200);
      expect(sortedResponse.body.data).toHaveLength(5);

      // Verify descending cost order
      const costs = sortedResponse.body.data.map((p: any) => p.standardCost);
      for (let i = 1; i < costs.length; i++) {
        expect(costs[i]).toBeLessThanOrEqual(costs[i - 1]);
      }
    });
  });
});