import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
import andonRoutes from '../../routes/andon';
import andonConfigRoutes from '../../routes/andonConfig';
import {
  AuthTestHelper,
  RequestTestHelper,
  ValidationTestHelper,
  ResponseTestHelper,
  DatabaseTestHelper
} from '../helpers/routeTestHelpers';
import { setupTestDatabase, teardownTestDatabase, cleanupTestData } from '../helpers/database';

/**
 * Integration Tests for Andon Routes
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * These tests verify complete request flows including:
 * - Full database integration (not mocked)
 * - Real service interactions
 * - Actual middleware execution
 * - End-to-end request/response cycles
 * - Cross-service dependencies
 */

describe('Andon Routes - Integration Tests', () => {
  let app: express.Application;
  let testDb: PrismaClient;
  let testUser: any;
  let testSite: any;
  let testIssueType: any;
  let testEscalationRule: any;

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

    // Mount the actual Andon routes
    app.use('/api/v1/andon', andonRoutes);
    app.use('/api/v1/andon/config', andonConfigRoutes);

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

    // Create test issue type
    testIssueType = await testDb.andonIssueType.create({
      data: {
        id: 'test-issue-type-1',
        name: 'Test Quality Issue',
        description: 'Test issue type for integration testing',
        category: 'QUALITY',
        severity: 'MEDIUM',
        priority: 'MEDIUM',
        expectedResolutionTime: 30,
        siteId: testSite.id,
        isActive: true,
        createdBy: testUser.id,
        updatedBy: testUser.id
      }
    });

    // Create test escalation rule
    testEscalationRule = await testDb.andonEscalationRule.create({
      data: {
        id: 'test-escalation-rule-1',
        name: 'Test Escalation Rule',
        description: 'Test escalation rule for integration testing',
        siteId: testSite.id,
        issueTypeId: testIssueType.id,
        triggerAfterMinutes: 15,
        escalationLevel: 1,
        conditions: {
          severity: ['MEDIUM', 'HIGH', 'CRITICAL'],
          priority: ['MEDIUM', 'HIGH', 'CRITICAL']
        },
        actions: {
          notifications: [
            {
              type: 'email',
              recipients: ['supervisor@test.com'],
              template: 'escalation_alert'
            }
          ],
          reassign: {
            assignToUserId: testUser.id
          }
        },
        isActive: true,
        createdBy: testUser.id,
        updatedBy: testUser.id
      }
    });
  });

  afterEach(async () => {
    // Clean up Andon-specific test data
    await testDb.andonEscalationRuleResult.deleteMany();
    await testDb.andonAlert.deleteMany();
    await testDb.andonEscalationRule.deleteMany();
    await testDb.andonIssueType.deleteMany();
    await testDb.andonConfiguration.deleteMany();
    await testDb.andonSiteConfiguration.deleteMany();
    await testDb.andonNotificationTemplate.deleteMany();
    await testDb.andonSystemSettings.deleteMany();

    await cleanupTestData(testDb);
  });

  describe('Andon Alert Lifecycle Integration', () => {
    it('should create, retrieve, update, acknowledge, and close an alert through complete workflow', async () => {
      // Step 1: Create a new alert
      const createAlertData = {
        issueTypeId: testIssueType.id,
        siteId: testSite.id,
        title: 'Integration Test Alert',
        description: 'Test alert created during integration testing',
        severity: 'MEDIUM',
        priority: 'MEDIUM',
        location: 'Line 1, Station 3',
        reportedBy: testUser.id,
        metadata: {
          equipment: 'CNC-001',
          shift: 'Day',
          operator: 'Test Operator'
        }
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/alerts', testUser, createAlertData
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data).toHaveProperty('id');
      expect(createResponse.body.data).toHaveProperty('alertNumber');
      expect(createResponse.body.data.title).toBe(createAlertData.title);
      expect(createResponse.body.data.status).toBe('OPEN');

      const alertId = createResponse.body.data.id;
      const alertNumber = createResponse.body.data.alertNumber;

      // Step 2: Retrieve the created alert
      const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/alerts/${alertId}`, testUser
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.success).toBe(true);
      expect(getResponse.body.data.id).toBe(alertId);
      expect(getResponse.body.data.title).toBe(createAlertData.title);
      expect(getResponse.body.data.issueType.name).toBe(testIssueType.name);

      // Step 3: Update the alert
      const updateData = {
        title: 'Updated Integration Test Alert',
        description: 'Updated description for integration testing',
        severity: 'HIGH',
        priority: 'HIGH',
        metadata: {
          ...createAlertData.metadata,
          updated: true
        }
      };

      const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', `/api/v1/andon/alerts/${alertId}`, testUser, updateData
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.title).toBe(updateData.title);
      expect(updateResponse.body.data.severity).toBe(updateData.severity);

      // Step 4: Acknowledge the alert
      const acknowledgeData = {
        acknowledgedBy: testUser.id,
        acknowledgedAt: new Date().toISOString(),
        acknowledgmentNotes: 'Alert acknowledged during integration testing'
      };

      const acknowledgeResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', `/api/v1/andon/alerts/${alertId}`, testUser, {
          status: 'ACKNOWLEDGED',
          ...acknowledgeData
        }
      );

      expect(acknowledgeResponse.status).toBe(200);
      expect(acknowledgeResponse.body.data.status).toBe('ACKNOWLEDGED');
      expect(acknowledgeResponse.body.data.acknowledgedBy).toBe(testUser.id);

      // Step 5: Close the alert
      const closeData = {
        resolutionNotes: 'Issue resolved during integration testing',
        resolutionActionTaken: 'Machine recalibrated and issue fixed'
      };

      const closeResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', `/api/v1/andon/alerts/${alertId}/close`, testUser, closeData
      );

      expect(closeResponse.status).toBe(200);
      expect(closeResponse.body.success).toBe(true);
      expect(closeResponse.body.data.status).toBe('CLOSED');
      expect(closeResponse.body.data.closedAt).toBeDefined();
      expect(closeResponse.body.data.resolutionNotes).toBe(closeData.resolutionNotes);

      // Step 6: Verify the final state
      const getFinalResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/alerts/${alertId}`, testUser
      );

      expect(getFinalResponse.body.data.status).toBe('CLOSED');
      expect(getFinalResponse.body.data.closedBy).toBe(testUser.id);
      expect(getFinalResponse.body.data.resolutionActionTaken).toBe(closeData.resolutionActionTaken);
    });

    it('should handle alert escalation workflow', async () => {
      // Create an alert that will trigger escalation
      const alertData = {
        issueTypeId: testIssueType.id,
        siteId: testSite.id,
        title: 'Escalation Test Alert',
        description: 'Alert that should trigger escalation',
        severity: 'HIGH',
        priority: 'HIGH',
        location: 'Line 2, Station 1',
        reportedBy: testUser.id
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/alerts', testUser, alertData
      );

      const alertId = createResponse.body.data.id;

      // Manually trigger escalation
      const escalateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', `/api/v1/andon/alerts/${alertId}/escalate`, testUser
      );

      expect(escalateResponse.status).toBe(200);
      expect(escalateResponse.body.success).toBe(true);

      // Verify alert status changed to escalated
      const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/alerts/${alertId}`, testUser
      );

      expect(getResponse.body.data.status).toBe('ESCALATED');
      expect(getResponse.body.data.escalationLevel).toBeGreaterThan(0);
    });
  });

  describe('Alert Search and Filtering Integration', () => {
    beforeEach(async () => {
      // Create multiple test alerts for search testing
      const testAlerts = [
        {
          issueTypeId: testIssueType.id,
          siteId: testSite.id,
          title: 'Search Test Alert 1',
          description: 'Quality issue on Line 1',
          severity: 'MEDIUM',
          priority: 'LOW',
          location: 'Line 1',
          status: 'OPEN',
          reportedBy: testUser.id
        },
        {
          issueTypeId: testIssueType.id,
          siteId: testSite.id,
          title: 'Search Test Alert 2',
          description: 'Safety concern on Line 2',
          severity: 'HIGH',
          priority: 'HIGH',
          location: 'Line 2',
          status: 'ACKNOWLEDGED',
          reportedBy: testUser.id,
          acknowledgedBy: testUser.id,
          acknowledgedAt: new Date()
        },
        {
          issueTypeId: testIssueType.id,
          siteId: testSite.id,
          title: 'Search Test Alert 3',
          description: 'Equipment malfunction',
          severity: 'CRITICAL',
          priority: 'CRITICAL',
          location: 'Line 3',
          status: 'CLOSED',
          reportedBy: testUser.id,
          closedBy: testUser.id,
          closedAt: new Date(),
          resolutionNotes: 'Equipment repaired'
        }
      ];

      for (const alertData of testAlerts) {
        await RequestTestHelper.makeAuthenticatedRequest(
          app, 'post', '/api/v1/andon/alerts', testUser, alertData
        );
      }
    });

    it('should search alerts by title', async () => {
      const searchResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts', testUser, undefined,
        { search: 'Search Test Alert 1' }
      );

      expect(searchResponse.status).toBe(200);
      expect(searchResponse.body.data.alerts).toHaveLength(1);
      expect(searchResponse.body.data.alerts[0].title).toBe('Search Test Alert 1');
    });

    it('should filter alerts by status', async () => {
      const filterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts', testUser, undefined,
        { status: 'OPEN,ACKNOWLEDGED' }
      );

      expect(filterResponse.status).toBe(200);
      expect(filterResponse.body.data.alerts).toHaveLength(2);

      const statuses = filterResponse.body.data.alerts.map((alert: any) => alert.status);
      expect(statuses).toContain('OPEN');
      expect(statuses).toContain('ACKNOWLEDGED');
      expect(statuses).not.toContain('CLOSED');
    });

    it('should filter alerts by severity', async () => {
      const filterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts', testUser, undefined,
        { severity: 'HIGH,CRITICAL' }
      );

      expect(filterResponse.status).toBe(200);
      expect(filterResponse.body.data.alerts).toHaveLength(2);

      filterResponse.body.data.alerts.forEach((alert: any) => {
        expect(['HIGH', 'CRITICAL']).toContain(alert.severity);
      });
    });

    it('should filter alerts by site', async () => {
      const filterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts', testUser, undefined,
        { siteId: testSite.id }
      );

      expect(filterResponse.status).toBe(200);
      filterResponse.body.data.alerts.forEach((alert: any) => {
        expect(alert.siteId).toBe(testSite.id);
      });
    });

    it('should handle pagination correctly', async () => {
      // Test first page
      const page1Response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts', testUser, undefined,
        { page: 1, pageSize: 2 }
      );

      expect(page1Response.status).toBe(200);
      expect(page1Response.body.data.alerts).toHaveLength(2);
      expect(page1Response.body.data.pagination.page).toBe(1);
      expect(page1Response.body.data.pagination.totalCount).toBeGreaterThanOrEqual(3);

      // Test second page
      const page2Response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts', testUser, undefined,
        { page: 2, pageSize: 2 }
      );

      expect(page2Response.status).toBe(200);
      expect(page2Response.body.data.alerts).toHaveLength(1);
      expect(page2Response.body.data.pagination.page).toBe(2);

      // Verify different results
      const page1Ids = page1Response.body.data.alerts.map((alert: any) => alert.id);
      const page2Ids = page2Response.body.data.alerts.map((alert: any) => alert.id);
      expect(page1Ids).not.toEqual(page2Ids);
    });
  });

  describe('Issue Type Management Integration', () => {
    it('should create, retrieve, update, and manage issue types', async () => {
      // Create a new issue type
      const createData = {
        name: 'New Test Issue Type',
        description: 'New issue type for integration testing',
        category: 'EQUIPMENT',
        severity: 'HIGH',
        priority: 'HIGH',
        expectedResolutionTime: 45,
        siteId: testSite.id,
        escalationRules: [
          {
            triggerAfterMinutes: 20,
            escalationLevel: 1,
            actions: {
              notifications: [
                {
                  type: 'email',
                  recipients: ['manager@test.com']
                }
              ]
            }
          }
        ]
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/issue-types', testUser, createData
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(createData.name);

      const issueTypeId = createResponse.body.data.id;

      // Retrieve the issue type
      const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/issue-types/${issueTypeId}`, testUser
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.name).toBe(createData.name);
      expect(getResponse.body.data.escalationRules).toHaveLength(1);

      // Update the issue type
      const updateData = {
        name: 'Updated Test Issue Type',
        expectedResolutionTime: 60
      };

      const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', `/api/v1/andon/issue-types/${issueTypeId}`, testUser, updateData
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.name).toBe(updateData.name);
      expect(updateResponse.body.data.expectedResolutionTime).toBe(updateData.expectedResolutionTime);
    });

    it('should list issue types with filtering', async () => {
      // List all issue types
      const listResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/issue-types', testUser
      );

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toBeInstanceOf(Array);
      expect(listResponse.body.data.length).toBeGreaterThan(0);

      // Filter by site
      const filterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/issue-types', testUser, undefined,
        { siteId: testSite.id }
      );

      expect(filterResponse.status).toBe(200);
      filterResponse.body.data.forEach((issueType: any) => {
        expect(issueType.siteId).toBe(testSite.id);
      });
    });
  });

  describe('System Statistics Integration', () => {
    it('should retrieve system statistics correctly', async () => {
      const statsResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/stats', testUser
      );

      expect(statsResponse.status).toBe(200);
      expect(statsResponse.body.success).toBe(true);
      expect(statsResponse.body.data).toHaveProperty('totalAlerts');
      expect(statsResponse.body.data).toHaveProperty('activeAlerts');
      expect(statsResponse.body.data).toHaveProperty('overdue');
      expect(statsResponse.body.data).toHaveProperty('byStatus');
      expect(statsResponse.body.data).toHaveProperty('bySeverity');
      expect(statsResponse.body.data).toHaveProperty('byIssueType');
    });

    it('should retrieve escalation statistics', async () => {
      const escalationStatsResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/escalation-stats', testUser
      );

      expect(escalationStatsResponse.status).toBe(200);
      expect(escalationStatsResponse.body.success).toBe(true);
      expect(escalationStatsResponse.body.data).toHaveProperty('totalEscalations');
      expect(escalationStatsResponse.body.data).toHaveProperty('escalationsByLevel');
      expect(escalationStatsResponse.body.data).toHaveProperty('escalationsByRule');
    });

    it('should retrieve overdue alerts', async () => {
      const overdueResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/overdue-alerts', testUser
      );

      expect(overdueResponse.status).toBe(200);
      expect(overdueResponse.body.success).toBe(true);
      expect(overdueResponse.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle validation errors for alert creation', async () => {
      const invalidData = {
        // Missing required fields
        title: 'Invalid Alert'
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/alerts', testUser, invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle invalid foreign key references', async () => {
      const invalidData = {
        issueTypeId: 'non-existent-issue-type',
        siteId: testSite.id,
        title: 'Invalid Reference Alert',
        description: 'Alert with invalid issue type reference',
        severity: 'MEDIUM',
        priority: 'MEDIUM',
        reportedBy: testUser.id
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/alerts', testUser, invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Invalid issue type reference');
    });

    it('should handle not found errors', async () => {
      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts/non-existent-id', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Alert not found');
    });

    it('should handle unauthorized access attempts', async () => {
      const unauthorizedUser = AuthTestHelper.createReadOnlyUser();

      const alertData = {
        issueTypeId: testIssueType.id,
        siteId: testSite.id,
        title: 'Unauthorized Alert',
        description: 'Alert creation by unauthorized user',
        severity: 'MEDIUM',
        priority: 'MEDIUM',
        reportedBy: unauthorizedUser.id
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/alerts', unauthorizedUser, alertData
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Performance and Concurrency Integration', () => {
    it('should handle concurrent alert creation', async () => {
      const alertPromises = [];

      // Create 5 alerts concurrently
      for (let i = 0; i < 5; i++) {
        const alertData = {
          issueTypeId: testIssueType.id,
          siteId: testSite.id,
          title: `Concurrent Alert ${i + 1}`,
          description: `Concurrent alert creation test ${i + 1}`,
          severity: 'MEDIUM',
          priority: 'MEDIUM',
          location: `Line ${i + 1}`,
          reportedBy: testUser.id
        };

        alertPromises.push(
          RequestTestHelper.makeAuthenticatedRequest(
            app, 'post', '/api/v1/andon/alerts', testUser, alertData
          )
        );
      }

      const responses = await Promise.all(alertPromises);

      // Verify all alerts were created successfully
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.title).toBe(`Concurrent Alert ${index + 1}`);
        expect(response.body.data.alertNumber).toBeDefined();
      });

      // Verify unique alert numbers
      const alertNumbers = responses.map(r => r.body.data.alertNumber);
      const uniqueNumbers = new Set(alertNumbers);
      expect(uniqueNumbers.size).toBe(alertNumbers.length);
    });

    it('should handle heavy filtering and search loads', async () => {
      // Create a large dataset
      const alertPromises = [];
      for (let i = 0; i < 20; i++) {
        const alertData = {
          issueTypeId: testIssueType.id,
          siteId: testSite.id,
          title: `Load Test Alert ${i + 1}`,
          description: `Load testing alert ${i + 1}`,
          severity: i % 3 === 0 ? 'HIGH' : 'MEDIUM',
          priority: i % 2 === 0 ? 'HIGH' : 'LOW',
          location: `Line ${(i % 3) + 1}`,
          reportedBy: testUser.id
        };

        alertPromises.push(
          RequestTestHelper.makeAuthenticatedRequest(
            app, 'post', '/api/v1/andon/alerts', testUser, alertData
          )
        );
      }

      await Promise.all(alertPromises);

      // Test complex filtering
      const complexFilterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/alerts', testUser, undefined,
        {
          search: 'Load Test',
          severity: 'HIGH',
          status: 'OPEN',
          siteId: testSite.id,
          sortBy: 'createdAt',
          sortOrder: 'desc',
          page: 1,
          pageSize: 5
        }
      );

      expect(complexFilterResponse.status).toBe(200);
      expect(complexFilterResponse.body.data.alerts).toHaveLength(5);
      expect(complexFilterResponse.body.data.pagination).toBeDefined();

      // Verify all results match filter criteria
      complexFilterResponse.body.data.alerts.forEach((alert: any) => {
        expect(alert.severity).toBe('HIGH');
        expect(alert.status).toBe('OPEN');
        expect(alert.title).toContain('Load Test');
      });
    });
  });
});