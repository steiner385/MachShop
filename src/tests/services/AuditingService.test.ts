/**
 * AuditingService Test Suite - GitHub Issue #127
 *
 * Comprehensive tests for the auditing service including permission usage tracking,
 * security event monitoring, and analytics functionality.
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import { PrismaClient, SecurityEventType, SecuritySeverity, ReportType, PermissionChangeType } from '@prisma/client';
import {
  AuditingService,
  auditingService,
  PermissionUsageContext,
  SecurityEventData,
  UserSessionData,
  PermissionChangeData,
  TimeRange,
} from '../../services/AuditingService';
import { setupTestDatabase, teardownTestDatabase } from '../helpers/database';

let prisma: PrismaClient;

describe('AuditingService', () => {
  let testUserId: string;
  let testUser2Id: string;
  let testSiteId: string;

  beforeAll(async () => {
    // Initialize test database
    prisma = await setupTestDatabase();

    // Create test users
    const testUser = await prisma.user.create({
      data: {
        username: 'auditTestUser',
        email: 'audit.test@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'Audit',
        lastName: 'Test',
        roles: ['Test User'],
        permissions: ['test.permission'],
      },
    });
    testUserId = testUser.id;

    const testUser2 = await prisma.user.create({
      data: {
        username: 'auditTestUser2',
        email: 'audit.test2@example.com',
        passwordHash: 'hashedPassword',
        firstName: 'Audit',
        lastName: 'Test2',
        roles: ['Test Admin'],
        permissions: ['admin.permission'],
      },
    });
    testUser2Id = testUser2.id;

    // Create test site
    const testSite = await prisma.site.create({
      data: {
        siteCode: 'AUDIT-TEST',
        siteName: 'Audit Test Site',
        location: 'Test Location',
        isActive: true,
      },
    });
    testSiteId = testSite.id;
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
    await prisma.permissionChangeLog.deleteMany({
      where: { targetUserId: { in: [testUserId, testUser2Id] } },
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
  });

  describe('Permission Usage Logging', () => {
    it('should log permission usage successfully', async () => {
      const context: PermissionUsageContext = {
        userId: testUserId,
        permission: 'test.read',
        endpoint: '/api/test',
        method: 'GET',
        success: true,
        ip: '192.168.1.100',
        userAgent: 'Test Agent',
        siteId: testSiteId,
        duration: 25,
        context: { testData: 'value' },
      };

      await auditingService.logPermissionUsage(context);

      const logs = await prisma.permissionUsageLog.findMany({
        where: { userId: testUserId },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0]).toMatchObject({
        userId: testUserId,
        permission: 'test.read',
        endpoint: '/api/test',
        method: 'GET',
        success: true,
        ip: '192.168.1.100',
        userAgent: 'Test Agent',
        siteId: testSiteId,
        duration: 25,
      });
      expect(logs[0].context).toEqual({ testData: 'value' });
    });

    it('should log failed permission attempts', async () => {
      const context: PermissionUsageContext = {
        userId: testUserId,
        permission: 'admin.delete',
        endpoint: '/api/admin/delete',
        method: 'DELETE',
        success: false,
        ip: '192.168.1.100',
        userAgent: 'Test Agent',
      };

      await auditingService.logPermissionUsage(context);

      const logs = await prisma.permissionUsageLog.findMany({
        where: { userId: testUserId, success: false },
      });

      expect(logs).toHaveLength(1);
      expect(logs[0].success).toBe(false);
      expect(logs[0].permission).toBe('admin.delete');
    });

    it('should handle permission logging errors gracefully', async () => {
      const context: PermissionUsageContext = {
        userId: 'invalid-user-id',
        permission: 'test.permission',
        endpoint: '/api/test',
        method: 'GET',
        success: true,
      };

      // Should not throw error
      await expect(auditingService.logPermissionUsage(context)).resolves.not.toThrow();
    });
  });

  describe('Security Event Logging', () => {
    it('should log security events successfully', async () => {
      const eventData: SecurityEventData = {
        eventType: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.MEDIUM,
        userId: testUserId,
        ip: '192.168.1.100',
        userAgent: 'Test Agent',
        description: 'Failed authentication attempt',
        metadata: { attempts: 3 },
        siteId: testSiteId,
      };

      const eventId = await auditingService.logSecurityEvent(eventData);

      expect(eventId).toBeDefined();

      const event = await prisma.securityEvent.findUnique({
        where: { id: eventId },
      });

      expect(event).toBeDefined();
      expect(event).toMatchObject({
        eventType: SecurityEventType.AUTH_FAILURE,
        severity: SecuritySeverity.MEDIUM,
        userId: testUserId,
        ip: '192.168.1.100',
        description: 'Failed authentication attempt',
        siteId: testSiteId,
        resolved: false,
      });
      expect(event!.metadata).toEqual({ attempts: 3 });
    });

    it('should resolve security events', async () => {
      // Create a security event
      const eventData: SecurityEventData = {
        eventType: SecurityEventType.SUSPICIOUS_IP,
        severity: SecuritySeverity.HIGH,
        userId: testUserId,
        description: 'Suspicious IP detected',
      };

      const eventId = await auditingService.logSecurityEvent(eventData);

      // Resolve the event
      await auditingService.resolveSecurityEvent(eventId, testUser2Id, 'False positive');

      const resolvedEvent = await prisma.securityEvent.findUnique({
        where: { id: eventId },
      });

      expect(resolvedEvent!.resolved).toBe(true);
      expect(resolvedEvent!.resolvedBy).toBe(testUser2Id);
      expect(resolvedEvent!.resolvedAt).toBeDefined();
    });
  });

  describe('User Session Tracking', () => {
    it('should start and track user sessions', async () => {
      const sessionData: UserSessionData = {
        userId: testUserId,
        sessionId: 'test-session-123',
        ip: '192.168.1.100',
        userAgent: 'Test Browser',
        siteAccess: [testSiteId],
      };

      const sessionLogId = await auditingService.startUserSession(sessionData);

      expect(sessionLogId).toBeDefined();

      const session = await prisma.userSessionLog.findUnique({
        where: { sessionId: 'test-session-123' },
      });

      expect(session).toBeDefined();
      expect(session).toMatchObject({
        userId: testUserId,
        sessionId: 'test-session-123',
        ip: '192.168.1.100',
        userAgent: 'Test Browser',
        siteAccess: [testSiteId],
      });
      expect(session!.endTime).toBeNull();
    });

    it('should end user sessions', async () => {
      // Start a session
      const sessionData: UserSessionData = {
        userId: testUserId,
        sessionId: 'test-session-456',
        ip: '192.168.1.100',
        userAgent: 'Test Browser',
      };

      await auditingService.startUserSession(sessionData);

      // End the session
      await auditingService.endUserSession('test-session-456');

      const session = await prisma.userSessionLog.findUnique({
        where: { sessionId: 'test-session-456' },
      });

      expect(session!.endTime).toBeDefined();
      expect(session!.duration).toBeGreaterThan(0);
    });

    it('should update session activity', async () => {
      // Start a session
      const sessionData: UserSessionData = {
        userId: testUserId,
        sessionId: 'test-session-789',
        ip: '192.168.1.100',
        userAgent: 'Test Browser',
        siteAccess: [],
      };

      await auditingService.startUserSession(sessionData);

      // Update activity
      await auditingService.updateSessionActivity('test-session-789', testSiteId);

      const session = await prisma.userSessionLog.findUnique({
        where: { sessionId: 'test-session-789' },
      });

      expect(session!.actionsCount).toBe(1);
      expect(session!.siteAccess).toContain(testSiteId);
    });

    it('should end active sessions when starting new session', async () => {
      // Start first session
      const sessionData1: UserSessionData = {
        userId: testUserId,
        sessionId: 'test-session-old',
        ip: '192.168.1.100',
        userAgent: 'Test Browser',
      };

      await auditingService.startUserSession(sessionData1);

      // Start second session (should end the first)
      const sessionData2: UserSessionData = {
        userId: testUserId,
        sessionId: 'test-session-new',
        ip: '192.168.1.101',
        userAgent: 'Test Browser',
      };

      await auditingService.startUserSession(sessionData2);

      const oldSession = await prisma.userSessionLog.findUnique({
        where: { sessionId: 'test-session-old' },
      });

      const newSession = await prisma.userSessionLog.findUnique({
        where: { sessionId: 'test-session-new' },
      });

      expect(oldSession!.endTime).toBeDefined(); // Old session ended
      expect(newSession!.endTime).toBeNull(); // New session active
    });
  });

  describe('Permission Change Logging', () => {
    it('should log permission changes', async () => {
      const changeData: PermissionChangeData = {
        changeType: PermissionChangeType.ROLE_ASSIGNED,
        targetUserId: testUserId,
        targetRole: 'Test Admin',
        changedBy: testUser2Id,
        reason: 'Role assignment for testing',
        oldValue: { roles: ['Test User'] },
        newValue: { roles: ['Test User', 'Test Admin'] },
        siteId: testSiteId,
      };

      await auditingService.logPermissionChange(changeData);

      const changes = await prisma.permissionChangeLog.findMany({
        where: { targetUserId: testUserId },
      });

      expect(changes).toHaveLength(1);
      expect(changes[0]).toMatchObject({
        changeType: PermissionChangeType.ROLE_ASSIGNED,
        targetUserId: testUserId,
        targetRole: 'Test Admin',
        changedBy: testUser2Id,
        reason: 'Role assignment for testing',
        siteId: testSiteId,
      });
      expect(changes[0].oldValue).toEqual({ roles: ['Test User'] });
      expect(changes[0].newValue).toEqual({ roles: ['Test User', 'Test Admin'] });
    });
  });

  describe('Report Generation', () => {
    it('should initiate audit report generation', async () => {
      const reportParams = {
        reportType: ReportType.USER_ACCESS,
        title: 'Test User Access Report',
        timeRange: {
          startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
          endDate: new Date(),
        },
        siteId: testSiteId,
      };

      const reportId = await auditingService.generateAuditReport(reportParams, testUserId);

      expect(reportId).toBeDefined();

      const report = await prisma.auditReport.findUnique({
        where: { id: reportId },
      });

      expect(report).toBeDefined();
      expect(report!.reportType).toBe(ReportType.USER_ACCESS);
      expect(report!.title).toBe('Test User Access Report');
      expect(report!.generatedBy).toBe(testUserId);
      expect(report!.siteId).toBe(testSiteId);
    });
  });

  describe('Analytics', () => {
    beforeEach(async () => {
      // Create test data for analytics
      const contexts = [
        {
          userId: testUserId,
          permission: 'test.read',
          endpoint: '/api/test',
          method: 'GET',
          success: true,
          duration: 25,
        },
        {
          userId: testUserId,
          permission: 'test.write',
          endpoint: '/api/test',
          method: 'POST',
          success: true,
          duration: 45,
        },
        {
          userId: testUserId,
          permission: 'admin.delete',
          endpoint: '/api/admin',
          method: 'DELETE',
          success: false,
          duration: 10,
        },
      ];

      for (const context of contexts) {
        await auditingService.logPermissionUsage(context as PermissionUsageContext);
      }

      // Create test security events
      const securityEvents = [
        {
          eventType: SecurityEventType.AUTH_FAILURE,
          severity: SecuritySeverity.LOW,
          userId: testUserId,
          description: 'Test auth failure',
        },
        {
          eventType: SecurityEventType.PERMISSION_DENIED,
          severity: SecuritySeverity.MEDIUM,
          userId: testUserId,
          description: 'Test permission denied',
        },
      ];

      for (const event of securityEvents) {
        await auditingService.logSecurityEvent(event as SecurityEventData);
      }

      // Create test session
      await auditingService.startUserSession({
        userId: testUserId,
        sessionId: 'analytics-test-session',
        ip: '192.168.1.100',
        userAgent: 'Test Browser',
      });
    });

    it('should get permission usage analytics', async () => {
      const timeRange: TimeRange = {
        startDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        endDate: new Date(),
      };

      const analytics = await auditingService.getPermissionUsageAnalytics(timeRange);

      expect(analytics.totalPermissionChecks).toBe(3);
      expect(analytics.successfulChecks).toBe(2);
      expect(analytics.failedChecks).toBe(1);
      expect(analytics.averageDuration).toBeGreaterThan(0);
      expect(analytics.topPermissions).toBeInstanceOf(Array);
      expect(analytics.topEndpoints).toBeInstanceOf(Array);
    });

    it('should get security metrics', async () => {
      const timeRange: TimeRange = {
        startDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        endDate: new Date(),
      };

      const metrics = await auditingService.getSecurityMetrics(timeRange);

      expect(metrics.totalSecurityEvents).toBe(2);
      expect(metrics.eventsByType).toBeInstanceOf(Array);
      expect(metrics.eventsBySeverity).toBeInstanceOf(Array);
      expect(metrics.unresolvedEvents).toBe(2);
      expect(metrics.topSourceIPs).toBeInstanceOf(Array);
    });

    it('should get activity metrics', async () => {
      const timeRange: TimeRange = {
        startDate: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
        endDate: new Date(),
      };

      const metrics = await auditingService.getActivityMetrics(timeRange);

      expect(metrics.totalSessions).toBe(1);
      expect(metrics.uniqueUsers).toBe(1);
      expect(metrics.activeSessions).toBeGreaterThanOrEqual(0);
      expect(metrics.totalActions).toBeGreaterThanOrEqual(0);
    });

    it('should filter analytics by site', async () => {
      // Create data with site-specific context
      await auditingService.logPermissionUsage({
        userId: testUserId,
        permission: 'site.specific',
        endpoint: '/api/site',
        method: 'GET',
        success: true,
        siteId: testSiteId,
      });

      const timeRange: TimeRange = {
        startDate: new Date(Date.now() - 60 * 60 * 1000),
        endDate: new Date(),
      };

      const analyticsWithSite = await auditingService.getPermissionUsageAnalytics(timeRange, testSiteId);
      const analyticsWithoutSite = await auditingService.getPermissionUsageAnalytics(timeRange);

      // Site-specific analytics should have fewer records
      expect(analyticsWithSite.totalPermissionChecks).toBeLessThanOrEqual(analyticsWithoutSite.totalPermissionChecks);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully in permission logging', async () => {
      const context: PermissionUsageContext = {
        userId: 'non-existent-user',
        permission: 'test.permission',
        endpoint: '/api/test',
        method: 'GET',
        success: true,
      };

      // Should not throw
      await expect(auditingService.logPermissionUsage(context)).resolves.not.toThrow();
    });

    it('should handle session tracking errors gracefully', async () => {
      // Should not throw for invalid session
      await expect(auditingService.endUserSession('non-existent-session')).resolves.not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should log permission usage within performance threshold', async () => {
      const context: PermissionUsageContext = {
        userId: testUserId,
        permission: 'performance.test',
        endpoint: '/api/performance',
        method: 'GET',
        success: true,
      };

      const startTime = Date.now();
      await auditingService.logPermissionUsage(context);
      const duration = Date.now() - startTime;

      // Audit logging should be fast (< 100ms)
      expect(duration).toBeLessThan(100);
    });

    it('should handle multiple concurrent audit operations', async () => {
      const contexts = Array.from({ length: 10 }, (_, i) => ({
        userId: testUserId,
        permission: `concurrent.test.${i}`,
        endpoint: `/api/concurrent/${i}`,
        method: 'GET',
        success: true,
      }));

      const startTime = Date.now();
      await Promise.all(contexts.map(context =>
        auditingService.logPermissionUsage(context as PermissionUsageContext)
      ));
      const duration = Date.now() - startTime;

      // All 10 operations should complete quickly
      expect(duration).toBeLessThan(500);

      // Verify all logs were created
      const logs = await prisma.permissionUsageLog.findMany({
        where: { permission: { startsWith: 'concurrent.test.' } },
      });
      expect(logs).toHaveLength(10);
    });
  });
});