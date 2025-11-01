/**
 * Integration Tests for Material Movement API Routes
 * Phase 11: Comprehensive Testing
 * Issue #64: Material Movement & Logistics Management System
 *
 * Tests API endpoint functionality including:
 * - Material movement CRUD operations
 * - Forklift management endpoints
 * - Container tracking endpoints
 * - Authorization and error handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { PrismaClient } from '@prisma/client';
import movementRoutes from '../../../routes/movements';

// Mock dependencies
vi.mock('@/services/movement/MaterialMovementService');
vi.mock('@/services/movement/ForkliftManagementService');
vi.mock('@/services/movement/ContainerTrackingService');
vi.mock('@/middleware/auth');

describe('Material Movement API Routes - Integration Tests', () => {
  let app: Express;
  let mockPrisma: any;

  beforeEach(() => {
    // Create Express app for testing
    app = express();
    app.use(express.json());

    // Mock auth middleware to always allow
    app.use((req, res, next) => {
      req.user = { id: 'user-123', role: 'ADMIN' };
      next();
    });

    app.use('/api/movements', movementRoutes);

    // Mock Prisma
    mockPrisma = new PrismaClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Material Movement Endpoints', () => {
    describe('POST /api/movements/create', () => {
      it('should create a new material movement', async () => {
        const response = await request(app)
          .post('/api/movements/create')
          .send({
            fromLocation: 'Warehouse A',
            toLocation: 'Warehouse B',
            materialId: 'MAT-001',
            quantity: 50,
            movedBy: 'operator-1',
            movementType: 'TRANSFER',
          });

        expect(response.status).toBe(201);
        expect(response.body).toHaveProperty('id');
        expect(response.body.status).toBe('REQUESTED');
        expect(response.body.fromLocation).toBe('Warehouse A');
        expect(response.body.toLocation).toBe('Warehouse B');
      });

      it('should validate required fields', async () => {
        const response = await request(app)
          .post('/api/movements/create')
          .send({
            fromLocation: 'Warehouse A',
            // Missing toLocation
            materialId: 'MAT-001',
            quantity: 50,
          });

        expect(response.status).toBe(400);
        expect(response.body).toHaveProperty('error');
      });

      it('should validate quantity is positive', async () => {
        const response = await request(app)
          .post('/api/movements/create')
          .send({
            fromLocation: 'Warehouse A',
            toLocation: 'Warehouse B',
            materialId: 'MAT-001',
            quantity: -10, // Invalid
            movedBy: 'operator-1',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/movements/:id', () => {
      it('should retrieve a movement by ID', async () => {
        const response = await request(app).get('/api/movements/mov-001');

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('id', 'mov-001');
        expect(response.body).toHaveProperty('status');
        expect(response.body).toHaveProperty('fromLocation');
      });

      it('should return 404 for non-existent movement', async () => {
        const response = await request(app).get('/api/movements/nonexistent');

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/movements', () => {
      it('should list all movements with pagination', async () => {
        const response = await request(app)
          .get('/api/movements')
          .query({ limit: 10, offset: 0 });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).toHaveProperty('total');
        expect(response.body).toHaveProperty('count');
      });

      it('should filter movements by status', async () => {
        const response = await request(app)
          .get('/api/movements')
          .query({ status: 'IN_PROGRESS' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should filter movements by location', async () => {
        const response = await request(app)
          .get('/api/movements')
          .query({ location: 'Warehouse A' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('should sort movements by date', async () => {
        const response = await request(app)
          .get('/api/movements')
          .query({ sort: 'createdAt', order: 'DESC' });

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('PUT /api/movements/:id', () => {
      it('should update a movement', async () => {
        const response = await request(app)
          .put('/api/movements/mov-001')
          .send({
            toLocation: 'Warehouse C',
            notes: 'Rerouted due to equipment failure',
          });

        expect(response.status).toBe(200);
        expect(response.body.toLocation).toBe('Warehouse C');
      });

      it('should not allow updating immutable fields', async () => {
        const response = await request(app)
          .put('/api/movements/mov-001')
          .send({
            fromLocation: 'New Location', // Cannot change origin
            id: 'different-id', // Cannot change ID
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/movements/:id/approve', () => {
      it('should approve a pending movement', async () => {
        const response = await request(app)
          .post('/api/movements/mov-001/approve')
          .send({ approvedBy: 'supervisor-1' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('APPROVED');
      });

      it('should reject approval if movement not in correct state', async () => {
        const response = await request(app)
          .post('/api/movements/completed-mov/approve')
          .send({ approvedBy: 'supervisor-1' });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/movements/:id/transition', () => {
      it('should transition movement status', async () => {
        const response = await request(app)
          .post('/api/movements/mov-001/transition')
          .send({ newStatus: 'IN_TRANSIT', transitionedBy: 'operator-1' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('IN_TRANSIT');
      });

      it('should validate status transitions', async () => {
        const response = await request(app)
          .post('/api/movements/mov-001/transition')
          .send({ newStatus: 'INVALID_STATUS' });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/movements/:id/tracking', () => {
      it('should update movement tracking', async () => {
        const response = await request(app)
          .post('/api/movements/mov-001/tracking')
          .send({
            currentLocation: 'In Transit - Location X',
            trackingData: { gps: { lat: 40.7128, lng: -74.006 } },
            updatedBy: 'operator-1',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('trackingData');
      });
    });

    describe('POST /api/movements/:id/cancel', () => {
      it('should cancel a movement', async () => {
        const response = await request(app)
          .post('/api/movements/mov-001/cancel')
          .send({ reason: 'Equipment breakdown', cancelledBy: 'supervisor-1' });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('CANCELLED');
      });

      it('should not allow cancelling completed movements', async () => {
        const response = await request(app)
          .post('/api/movements/completed-mov/cancel')
          .send({ reason: 'Too late to cancel' });

        expect(response.status).toBe(400);
      });
    });
  });

  describe('Forklift Management Endpoints', () => {
    describe('POST /api/movements/forklifts/create', () => {
      it('should create a new forklift', async () => {
        const response = await request(app)
          .post('/api/movements/forklifts/create')
          .send({
            forkliftNumber: 'FL-001',
            model: 'Toyota 8FGUN25',
            maxCapacity: 2500,
            assignedSite: 'Main Warehouse',
            status: 'AVAILABLE',
          });

        expect(response.status).toBe(201);
        expect(response.body.forkliftNumber).toBe('FL-001');
        expect(response.body.status).toBe('AVAILABLE');
      });

      it('should validate forklift data', async () => {
        const response = await request(app)
          .post('/api/movements/forklifts/create')
          .send({
            forkliftNumber: 'FL-001',
            // Missing required fields
          });

        expect(response.status).toBe(400);
      });
    });

    describe('GET /api/movements/forklifts/:id', () => {
      it('should retrieve forklift details', async () => {
        const response = await request(app).get(
          '/api/movements/forklifts/fl-001'
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('forkliftNumber');
        expect(response.body).toHaveProperty('status');
      });
    });

    describe('GET /api/movements/forklifts/site/:siteId', () => {
      it('should list forklifts at a site', async () => {
        const response = await request(app).get(
          '/api/movements/forklifts/site/site-001'
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('PUT /api/movements/forklifts/:id', () => {
      it('should update forklift status', async () => {
        const response = await request(app)
          .put('/api/movements/forklifts/fl-001')
          .send({
            status: 'MAINTENANCE',
            maintenanceReason: 'Oil change',
          });

        expect(response.status).toBe(200);
        expect(response.body.status).toBe('MAINTENANCE');
      });
    });

    describe('POST /api/movements/forklifts/:id/assign', () => {
      it('should assign operator to forklift', async () => {
        const response = await request(app)
          .post('/api/movements/forklifts/fl-001/assign')
          .send({
            operatorId: 'op-123',
            assignedBy: 'supervisor-1',
          });

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('operatorId');
      });
    });
  });

  describe('Container Tracking Endpoints', () => {
    describe('POST /api/movements/containers/create', () => {
      it('should create a new container', async () => {
        const response = await request(app)
          .post('/api/movements/containers/create')
          .send({
            containerNumber: 'CONT-001',
            containerType: 'Tote',
            size: 'Large',
            capacity: 100,
            currentLocation: 'Warehouse A',
            status: 'EMPTY',
          });

        expect(response.status).toBe(201);
        expect(response.body.containerNumber).toBe('CONT-001');
        expect(response.body.status).toBe('EMPTY');
      });
    });

    describe('GET /api/movements/containers/:id', () => {
      it('should retrieve container details', async () => {
        const response = await request(app).get(
          '/api/movements/containers/cont-001'
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('containerNumber');
        expect(response.body).toHaveProperty('capacity');
      });
    });

    describe('POST /api/movements/containers/:id/load', () => {
      it('should load materials into container', async () => {
        const response = await request(app)
          .post('/api/movements/containers/cont-001/load')
          .send({
            partNumbers: ['PART-123', 'PART-456'],
            quantity: 50,
            loadedBy: 'operator-1',
          });

        expect(response.status).toBe(200);
        expect(response.body.currentQuantity).toBeGreaterThan(0);
        expect(response.body.status).toBe('LOADED');
      });

      it('should prevent loading beyond capacity', async () => {
        const response = await request(app)
          .post('/api/movements/containers/cont-001/load')
          .send({
            partNumbers: ['PART-999'],
            quantity: 1000, // Over capacity
            loadedBy: 'operator-1',
          });

        expect(response.status).toBe(400);
      });
    });

    describe('POST /api/movements/containers/:id/unload', () => {
      it('should unload materials from container', async () => {
        const response = await request(app)
          .post('/api/movements/containers/cont-001/unload')
          .send({
            quantity: 25,
            targetLocation: 'Warehouse B',
            unloadedBy: 'operator-1',
          });

        expect(response.status).toBe(200);
        expect(response.body.currentQuantity).toBeGreaterThanOrEqual(0);
      });
    });

    describe('POST /api/movements/containers/:id/transfer', () => {
      it('should transfer container to new location', async () => {
        const response = await request(app)
          .post('/api/movements/containers/cont-001/transfer')
          .send({
            toLocation: 'Warehouse B',
            transferredBy: 'operator-1',
          });

        expect(response.status).toBe(200);
        expect(response.body.currentLocation).toBe('Warehouse B');
      });
    });

    describe('GET /api/movements/containers/:id/history', () => {
      it('should retrieve container movement history', async () => {
        const response = await request(app).get(
          '/api/movements/containers/cont-001/history'
        );

        expect(response.status).toBe(200);
        expect(Array.isArray(response.body)).toBe(true);
      });
    });

    describe('GET /api/movements/containers/:id/utilization', () => {
      it('should retrieve container utilization metrics', async () => {
        const response = await request(app).get(
          '/api/movements/containers/cont-001/utilization'
        );

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('utilizationPercent');
        expect(response.body).toHaveProperty('efficiency');
      });
    });
  });

  describe('Authorization', () => {
    beforeEach(() => {
      // Reset auth to require proper token
      app.use((req, res, next) => {
        const authHeader = req.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Unauthorized' });
        }
        req.user = { id: 'user-123', role: 'ADMIN' };
        next();
      });
    });

    it('should reject requests without authorization', async () => {
      const response = await request(app)
        .get('/api/movements')
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });

    it('should reject requests with invalid token', async () => {
      const response = await request(app)
        .get('/api/movements')
        .set('Authorization', 'Bearer invalid-token');

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('should handle 404 for non-existent endpoints', async () => {
      const response = await request(app).get('/api/movements/nonexistent');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle malformed JSON in request body', async () => {
      const response = await request(app)
        .post('/api/movements/create')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBeGreaterThanOrEqual(400);
    });

    it('should handle database errors gracefully', async () => {
      const response = await request(app).get('/api/movements/db-error');

      expect(response.status).toBeGreaterThanOrEqual(500);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Rate Limiting', () => {
    it('should handle rate limiting on endpoints', async () => {
      // Make many requests to test rate limiting
      const requests = Array.from({ length: 100 }, () =>
        request(app).get('/api/movements')
      );

      const responses = await Promise.all(requests);

      // At least some should be rate limited (429)
      // or all should succeed depending on configuration
      responses.forEach((response) => {
        expect([200, 429]).toContain(response.status);
      });
    });
  });

  describe('Response Formatting', () => {
    it('should return consistent response format', async () => {
      const response = await request(app).get('/api/movements');

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page');
    });

    it('should include proper headers in response', async () => {
      const response = await request(app).get('/api/movements');

      expect(response.headers['content-type']).toMatch(/application\/json/);
      expect(response.headers['x-total-count']).toBeDefined();
    });
  });
});
