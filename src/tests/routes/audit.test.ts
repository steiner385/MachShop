/**
 * Audit Routes Test Suite - GitHub Issue #127
 *
 * Tests for the audit API endpoints including permission usage logs,
 * security events, user sessions, and report generation.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient, SecurityEventType, SecuritySeverity, ReportType } from '@prisma/client';
import jwt from 'jsonwebtoken';
import { config } from '../../config/config';
import auditRoutes from '../../routes/audit';
import { authMiddleware } from '../../middleware/auth';
import { errorHandler } from '../../middleware/errorHandler';
import { auditingService } from '../../services/AuditingService';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';

let prisma: PrismaClient;

// Create Express app for testing
const app = express();
app.use(express.json());
app.use('/api/v1/audit', auditRoutes);
app.use(errorHandler);

describe('Audit Routes', () => {
  let testUserId: string;
  let testUser2Id: string;
  let testSiteId: string;
  let authToken: string;
  let adminToken: string;

  beforeAll(async () => {
    // Initialize test database
    prisma = await setupTestDatabase();

    // Create test users
    const testUser = await prisma.user.create({
      data: {
        username: 'auditRouteTestUser',
        email: 'audit.route.test@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'Audit',
        lastName: 'Route Test',
        roles: ['Test User'],
        permissions: ['audit.read', 'audit.sessions.read'],
      },
    });
    testUserId = testUser.id;

    const adminUser = await prisma.user.create({
      data: {
        username: 'auditRouteAdminUser',
        email: 'audit.route.admin@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'Audit',
        lastName: 'Admin Test',
        roles: ['System Administrator'],
        permissions: ['*'],
      },
    });
    testUser2Id = adminUser.id;

    // Create test site
    const testSite = await prisma.site.create({
      data: {
        siteCode: 'AUDIT-ROUTE-TEST',
        siteName: 'Audit Route Test Site',
        location: 'Test Location',
        isActive: true,
      },
    });
    testSiteId = testSite.id;

    // Generate JWT tokens
    authToken = jwt.sign(
      {
        userId: testUserId,
        username: testUser.username,
        email: testUser.email,
        roles: testUser.roles,
        permissions: testUser.permissions,
        siteId: testSiteId,
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );

    adminToken = jwt.sign(
      {
        userId: testUser2Id,
        username: adminUser.username,
        email: adminUser.email,
        roles: adminUser.roles,
        permissions: adminUser.permissions,
        siteId: testSiteId,
      },
      config.jwt.secret,
      { expiresIn: '1h' }
    );
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.permissionUsageLog.deleteMany({
      where: { userId: { in: [testUserId, testUser2Id] } },
    });
    await prisma.securityEvent.deleteMany({
      where: { userId: { in: [testUserId, testUser2Id] } },
    });
    await prisma.userSessionLog.deleteMany({
      where: { userId: { in: [testUserId, testUser2Id] } },
    });
    await prisma.auditReport.deleteMany({
      where: { generatedBy: { in: [testUserId, testUser2Id] } },
    });

    await prisma.user.deleteMany({
      where: { id: { in: [testUserId, testUser2Id] } },
    });
    await prisma.site.delete({
      where: { id: testSiteId },
    });

    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up audit logs before each test
    await prisma.permissionUsageLog.deleteMany({
      where: { userId: { in: [testUserId, testUser2Id] } },
    });
    await prisma.securityEvent.deleteMany({
      where: { userId: { in: [testUserId, testUser2Id] } },
    });
    await prisma.userSessionLog.deleteMany({
      where: { userId: { in: [testUserId, testUser2Id] } },
    });
    await prisma.auditReport.deleteMany({
      where: { generatedBy: { in: [testUserId, testUser2Id] } },
    });
  });

  describe('Permission Usage Logs', () => {
    beforeEach(async () => {
      // Create test permission usage logs
      const logs = [
        {
          userId: testUserId,
          permission: 'test.read',
          endpoint: '/api/test',
          method: 'GET',
          success: true,
          ip: '192.168.1.100',
          userAgent: 'Test Agent',
          siteId: testSiteId,
          duration: 25,
          context: { test: 'data' },
        },
        {
          userId: testUserId,
          permission: 'test.write',
          endpoint: '/api/test',
          method: 'POST',
          success: false,
          ip: '192.168.1.100',
          userAgent: 'Test Agent',
          duration: 50,
        },
      ];

      for (const log of logs) {
        await auditingService.logPermissionUsage(log);
      }
    });

    it('should get permission usage logs with authentication', async () => {
      const response = await request(app)
        .get('/api/v1/audit/permission-usage')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
      expect(response.body.pagination.totalCount).toBeGreaterThan(0);
    });

    it('should reject unauthenticated requests', async () => {
      await request(app)
        .get('/api/v1/audit/permission-usage')
        .expect(401);
    });

    it('should filter permission usage logs by user', async () => {
      const response = await request(app)
        .get('/api/v1/audit/permission-usage')
        .query({ userId: testUserId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((log: any) => {
        expect(log.userId).toBe(testUserId);
      });
    });

    it('should filter permission usage logs by permission', async () => {
      const response = await request(app)
        .get('/api/v1/audit/permission-usage')
        .query({ permission: 'test.read' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((log: any) => {
        expect(log.permission).toContain('test.read');
      });
    });

    it('should filter permission usage logs by success status', async () => {
      const response = await request(app)
        .get('/api/v1/audit/permission-usage')
        .query({ success: 'true' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((log: any) => {
        expect(log.success).toBe(true);
      });
    });

    it('should paginate permission usage logs', async () => {
      const response = await request(app)
        .get('/api/v1/audit/permission-usage')
        .query({ page: 1, limit: 1 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.pagination.page).toBe(1);
      expect(response.body.pagination.limit).toBe(1);
    });

    it('should get permission usage statistics', async () => {
      const response = await request(app)
        .get('/api/v1/audit/permission-usage/stats')
        .query({ timeRange: 'day' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.analytics).toBeDefined();
      expect(response.body.analytics.totalPermissionChecks).toBeGreaterThan(0);
      expect(response.body.analytics.successfulChecks).toBeDefined();
      expect(response.body.analytics.failedChecks).toBeDefined();
    });
  });

  describe('Security Events', () => {
    beforeEach(async () => {
      // Create test security events
      const events = [
        {
          eventType: SecurityEventType.AUTH_FAILURE,
          severity: SecuritySeverity.MEDIUM,
          userId: testUserId,
          ip: '192.168.1.100',
          description: 'Test auth failure',
          siteId: testSiteId,
        },
        {
          eventType: SecurityEventType.PERMISSION_DENIED,
          severity: SecuritySeverity.LOW,
          userId: testUserId,
          ip: '192.168.1.100',
          description: 'Test permission denied',
        },
      ];

      for (const event of events) {
        await auditingService.logSecurityEvent(event);
      }
    });

    it('should get security events with admin permissions', async () => {
      const response = await request(app)
        .get('/api/v1/audit/security-events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should reject non-admin access to security events', async () => {
      await request(app)
        .get('/api/v1/audit/security-events')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should filter security events by event type', async () => {
      const response = await request(app)
        .get('/api/v1/audit/security-events')
        .query({ eventType: SecurityEventType.AUTH_FAILURE })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((event: any) => {
        expect(event.eventType).toBe(SecurityEventType.AUTH_FAILURE);
      });
    });

    it('should filter security events by severity', async () => {
      const response = await request(app)
        .get('/api/v1/audit/security-events')
        .query({ severity: SecuritySeverity.MEDIUM })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((event: any) => {
        expect(event.severity).toBe(SecuritySeverity.MEDIUM);
      });
    });

    it('should resolve security events', async () => {
      // First, get a security event to resolve
      const eventsResponse = await request(app)
        .get('/api/v1/audit/security-events')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const eventId = eventsResponse.body.data[0].id;

      // Resolve the event
      const response = await request(app)
        .put(`/api/v1/audit/security-events/${eventId}/resolve`)
        .send({ notes: 'Resolved during testing' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('resolved successfully');

      // Verify the event is resolved in the database
      const resolvedEvent = await prisma.securityEvent.findUnique({
        where: { id: eventId },
      });

      expect(resolvedEvent!.resolved).toBe(true);
      expect(resolvedEvent!.resolvedBy).toBe(testUser2Id);
    });

    it('should get security metrics', async () => {
      const response = await request(app)
        .get('/api/v1/audit/security-events/metrics')
        .query({ timeRange: 'day' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalSecurityEvents).toBeGreaterThan(0);
      expect(response.body.metrics.eventsByType).toBeInstanceOf(Array);
      expect(response.body.metrics.eventsBySeverity).toBeInstanceOf(Array);
    });
  });

  describe('User Sessions', () => {
    beforeEach(async () => {
      // Create test user sessions
      const sessions = [
        {
          userId: testUserId,
          sessionId: 'test-session-1',
          ip: '192.168.1.100',
          userAgent: 'Test Browser',
          siteAccess: [testSiteId],
        },
        {
          userId: testUserId,
          sessionId: 'test-session-2',
          ip: '192.168.1.101',
          userAgent: 'Test Mobile',
          siteAccess: [],
        },
      ];

      for (const session of sessions) {
        await auditingService.startUserSession(session);
      }

      // End one session
      await auditingService.endUserSession('test-session-2');
    });

    it('should get user sessions', async () => {
      const response = await request(app)
        .get('/api/v1/audit/user-sessions')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter user sessions by user', async () => {
      const response = await request(app)
        .get('/api/v1/audit/user-sessions')
        .query({ userId: testUserId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((session: any) => {
        expect(session.userId).toBe(testUserId);
      });
    });

    it('should filter user sessions by active status', async () => {
      const response = await request(app)
        .get('/api/v1/audit/user-sessions')
        .query({ active: 'true' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      response.body.data.forEach((session: any) => {
        expect(session.endTime).toBeNull();
      });
    });

    it('should get session metrics', async () => {
      const response = await request(app)
        .get('/api/v1/audit/user-sessions/metrics')
        .query({ timeRange: 'day' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.metrics).toBeDefined();
      expect(response.body.metrics.totalSessions).toBeGreaterThan(0);
      expect(response.body.metrics.uniqueUsers).toBeGreaterThan(0);
    });
  });

  describe('Audit Reports', () => {
    it('should generate audit reports with admin permissions', async () => {
      const reportData = {
        reportType: ReportType.USER_ACCESS,
        title: 'Test User Access Report',
        timeRange: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          endDate: new Date().toISOString(),
        },
        siteId: testSiteId,
      };

      const response = await request(app)
        .post('/api/v1/audit/reports/generate')
        .send(reportData)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.reportId).toBeDefined();
      expect(response.body.status).toBe('GENERATING');
    });

    it('should reject report generation without admin permissions', async () => {
      const reportData = {
        reportType: ReportType.USER_ACCESS,
        title: 'Test Report',
      };

      await request(app)
        .post('/api/v1/audit/reports/generate')
        .send(reportData)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(403);
    });

    it('should validate report generation parameters', async () => {
      const invalidReportData = {
        reportType: 'INVALID_TYPE',
        title: '',
      };

      await request(app)
        .post('/api/v1/audit/reports/generate')
        .send(invalidReportData)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });

    it('should list audit reports', async () => {
      // Generate a test report first
      const reportParams = {
        reportType: ReportType.SECURITY_EVENTS,
        title: 'Test Security Report',
        timeRange: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
      };

      await auditingService.generateAuditReport(reportParams, testUser2Id);

      const response = await request(app)
        .get('/api/v1/audit/reports')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter reports by type', async () => {
      const response = await request(app)
        .get('/api/v1/audit/reports')
        .query({ reportType: ReportType.USER_ACCESS })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Analytics Dashboard', () => {
    beforeEach(async () => {
      // Create test data for dashboard
      await auditingService.logPermissionUsage({
        userId: testUserId,
        permission: 'dashboard.test',
        endpoint: '/api/dashboard',
        method: 'GET',
        success: true,
        duration: 30,
      });

      await auditingService.logSecurityEvent({
        eventType: SecurityEventType.ADMIN_ACTION,
        severity: SecuritySeverity.MEDIUM,
        userId: testUserId,
        description: 'Dashboard test event',
      });

      await auditingService.startUserSession({
        userId: testUserId,
        sessionId: 'dashboard-test-session',
        ip: '192.168.1.100',
        userAgent: 'Dashboard Test',
      });
    });

    it('should get comprehensive dashboard data', async () => {
      const response = await request(app)
        .get('/api/v1/audit/dashboard')
        .query({ timeRange: 'day' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.dashboard).toBeDefined();
      expect(response.body.dashboard.permissionUsage).toBeDefined();
      expect(response.body.dashboard.security).toBeDefined();
      expect(response.body.dashboard.activity).toBeDefined();
    });

    it('should filter dashboard data by site', async () => {
      const response = await request(app)
        .get('/api/v1/audit/dashboard')
        .query({ timeRange: 'day', siteId: testSiteId })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.siteId).toBe(testSiteId);
      expect(response.body.dashboard).toBeDefined();
    });

    it('should get trend analysis', async () => {
      const response = await request(app)
        .get('/api/v1/audit/trends')
        .query({
          metric: 'permission_usage',
          period: 'daily',
          days: 7,
        })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(response.body.trends).toBeDefined();
      expect(response.body.trends.metric).toBe('permission_usage');
      expect(response.body.trends.period).toBe('daily');
      expect(response.body.trends.days).toBe(7);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid query parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/v1/audit/permission-usage')
        .query({ page: 'invalid', limit: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle non-existent security event resolution', async () => {
      await request(app)
        .put('/api/v1/audit/security-events/non-existent-id/resolve')
        .send({ notes: 'Test notes' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });

    it('should handle non-existent report download', async () => {
      await request(app)
        .get('/api/v1/audit/reports/non-existent-id/download')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404);
    });
  });

  describe('Validation', () => {
    it('should validate timeRange parameters', async () => {
      await request(app)
        .get('/api/v1/audit/permission-usage/stats')
        .query({ timeRange: 'invalid' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should validate pagination parameters', async () => {
      await request(app)
        .get('/api/v1/audit/permission-usage')
        .query({ page: 0, limit: 1000 })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('should validate security event resolution data', async () => {
      await request(app)
        .put('/api/v1/audit/security-events/some-id/resolve')
        .send({ invalidField: 'invalid' })
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(400);
    });
  });
});