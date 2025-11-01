import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { PrismaClient } from '@prisma/client';
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
 * Integration Tests for Andon Configuration Routes
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * These tests verify configuration management functionality including:
 * - Global configuration CRUD operations
 * - Site-specific configuration management
 * - Notification template management
 * - System settings management
 * - Bulk operations and validation
 * - Configuration export/import
 */

describe('Andon Configuration Routes - Integration Tests', () => {
  let app: express.Application;
  let testDb: PrismaClient;
  let testUser: any;
  let testSite: any;
  let testGlobalConfig: any;
  let testSiteConfig: any;

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

    // Mount the Andon configuration routes
    app.use('/api/v1/andon/config', andonConfigRoutes);

    // Create test user and site
    testUser = AuthTestHelper.createManagerUser(); // Manager for config access
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

    // Create test global configuration
    testGlobalConfig = await testDb.andonConfiguration.create({
      data: {
        id: 'test-global-config-1',
        configKey: 'test.global.setting',
        configValue: {
          enabled: true,
          maxAlerts: 50,
          defaultTimeout: 30
        },
        description: 'Test global configuration for integration testing',
        category: 'SYSTEM',
        dataType: 'JSON',
        isActive: true,
        createdBy: testUser.id,
        updatedBy: testUser.id
      }
    });

    // Create test site configuration
    testSiteConfig = await testDb.andonSiteConfiguration.create({
      data: {
        id: 'test-site-config-1',
        siteId: testSite.id,
        configKey: 'test.site.setting',
        configValue: {
          siteSpecific: true,
          localSettings: {
            timezone: 'EST',
            workingHours: '07:00-19:00'
          }
        },
        description: 'Test site configuration for integration testing',
        category: 'SITE',
        dataType: 'JSON',
        isActive: true,
        createdBy: testUser.id,
        updatedBy: testUser.id
      }
    });
  });

  afterEach(async () => {
    // Clean up Andon configuration test data
    await testDb.andonConfiguration.deleteMany();
    await testDb.andonSiteConfiguration.deleteMany();
    await testDb.andonNotificationTemplate.deleteMany();
    await testDb.andonSystemSettings.deleteMany();

    await cleanupTestData(testDb);
  });

  describe('Global Configuration Management', () => {
    it('should create, retrieve, update, and delete global configurations', async () => {
      // Step 1: Create a new global configuration
      const createData = {
        configKey: 'test.new.global.setting',
        configValue: {
          feature: 'enabled',
          maxRetries: 3,
          alertSettings: {
            defaultSeverity: 'MEDIUM',
            escalationEnabled: true
          }
        },
        description: 'New test global configuration',
        category: 'ALERTS',
        dataType: 'JSON'
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, createData
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.configKey).toBe(createData.configKey);
      expect(createResponse.body.data.configValue).toEqual(createData.configValue);

      const configId = createResponse.body.data.id;

      // Step 2: Retrieve all global configurations
      const listResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config', testUser
      );

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toBeInstanceOf(Array);
      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(2); // Including our test configs

      // Step 3: Retrieve specific configuration by key
      const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/config/${createData.configKey}`, testUser
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.configKey).toBe(createData.configKey);
      expect(getResponse.body.data.configValue).toEqual(createData.configValue);

      // Step 4: Update the configuration
      const updateData = {
        configValue: {
          feature: 'enabled',
          maxRetries: 5, // Changed value
          alertSettings: {
            defaultSeverity: 'HIGH', // Changed value
            escalationEnabled: true,
            newSetting: 'added' // New value
          }
        },
        description: 'Updated test global configuration'
      };

      const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, {
          id: configId,
          configKey: createData.configKey,
          ...updateData
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.configValue).toEqual(updateData.configValue);
      expect(updateResponse.body.data.description).toBe(updateData.description);

      // Step 5: Delete the configuration
      const deleteResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', `/api/v1/andon/config/${createData.configKey}`, testUser
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);

      // Step 6: Verify deletion
      const getDeletedResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/config/${createData.configKey}`, testUser
      );

      expect(getDeletedResponse.status).toBe(404);
    });

    it('should handle configuration filtering by category', async () => {
      // Create configurations in different categories
      const systemConfig = {
        configKey: 'test.system.config',
        configValue: { systemSetting: true },
        description: 'System configuration',
        category: 'SYSTEM',
        dataType: 'JSON'
      };

      const alertConfig = {
        configKey: 'test.alert.config',
        configValue: { alertSetting: true },
        description: 'Alert configuration',
        category: 'ALERTS',
        dataType: 'JSON'
      };

      await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, systemConfig
      );

      await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, alertConfig
      );

      // Filter by SYSTEM category
      const systemFilterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config', testUser, undefined,
        { category: 'SYSTEM' }
      );

      expect(systemFilterResponse.status).toBe(200);
      systemFilterResponse.body.data.forEach((config: any) => {
        expect(config.category).toBe('SYSTEM');
      });

      // Filter by ALERTS category
      const alertFilterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config', testUser, undefined,
        { category: 'ALERTS' }
      );

      expect(alertFilterResponse.status).toBe(200);
      alertFilterResponse.body.data.forEach((config: any) => {
        expect(config.category).toBe('ALERTS');
      });
    });
  });

  describe('Site Configuration Management', () => {
    it('should create, retrieve, update, and delete site configurations', async () => {
      // Step 1: Create a new site configuration
      const createData = {
        siteId: testSite.id,
        configKey: 'test.new.site.setting',
        configValue: {
          siteSpecificFeature: true,
          localOverrides: {
            escalationDelay: 45,
            notificationChannels: ['email', 'sms']
          }
        },
        description: 'New test site configuration',
        category: 'SITE',
        dataType: 'JSON'
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/sites', testUser, createData
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.configKey).toBe(createData.configKey);
      expect(createResponse.body.data.siteId).toBe(testSite.id);

      const configId = createResponse.body.data.id;

      // Step 2: Retrieve site configurations
      const listResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/config/sites/${testSite.id}`, testUser
      );

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toBeInstanceOf(Array);
      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(2); // Including our test configs

      // Step 3: Update the site configuration
      const updateData = {
        configValue: {
          siteSpecificFeature: false, // Changed value
          localOverrides: {
            escalationDelay: 60, // Changed value
            notificationChannels: ['email', 'sms', 'slack'] // Added channel
          }
        },
        description: 'Updated test site configuration'
      };

      const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/sites', testUser, {
          id: configId,
          siteId: testSite.id,
          configKey: createData.configKey,
          ...updateData
        }
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.configValue).toEqual(updateData.configValue);

      // Step 4: Delete the site configuration
      const deleteResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'delete', `/api/v1/andon/config/sites/${testSite.id}/${createData.configKey}`, testUser
      );

      expect(deleteResponse.status).toBe(200);
      expect(deleteResponse.body.success).toBe(true);
    });

    it('should handle configuration inheritance and overrides', async () => {
      // Create a global configuration
      const globalConfig = {
        configKey: 'test.inheritance.setting',
        configValue: {
          globalValue: 'default',
          timeout: 30,
          enabled: true
        },
        description: 'Global configuration for inheritance test',
        category: 'SYSTEM',
        dataType: 'JSON'
      };

      await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, globalConfig
      );

      // Create a site-specific override
      const siteConfig = {
        siteId: testSite.id,
        configKey: 'test.inheritance.setting',
        configValue: {
          globalValue: 'site-override', // Override global value
          timeout: 45, // Override global value
          enabled: true,
          siteSpecific: 'additional-value' // Site-specific value
        },
        description: 'Site override configuration',
        category: 'SITE',
        dataType: 'JSON'
      };

      await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/sites', testUser, siteConfig
      );

      // Retrieve configuration with site context
      const configResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/config/${globalConfig.configKey}`, testUser, undefined,
        { siteId: testSite.id }
      );

      expect(configResponse.status).toBe(200);
      // Should return the site-specific override values
      expect(configResponse.body.data.globalValue).toBe('site-override');
      expect(configResponse.body.data.timeout).toBe(45);
      expect(configResponse.body.data.siteSpecific).toBe('additional-value');
    });
  });

  describe('Notification Template Management', () => {
    it('should create, retrieve, update, and delete notification templates', async () => {
      // Step 1: Create a notification template
      const templateData = {
        name: 'Test Escalation Template',
        description: 'Template for escalation notifications',
        templateType: 'EMAIL',
        subject: 'Alert Escalation: {{alert.title}}',
        body: `
          Alert escalated: {{alert.title}}

          Details:
          - Severity: {{alert.severity}}
          - Location: {{alert.location}}
          - Time: {{alert.createdAt}}

          Please take immediate action.
        `,
        variables: {
          alert: {
            title: 'string',
            severity: 'string',
            location: 'string',
            createdAt: 'date'
          }
        },
        isActive: true
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/notification-templates', testUser, templateData
      );

      expect(createResponse.status).toBe(201);
      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(templateData.name);

      const templateId = createResponse.body.data.id;

      // Step 2: Retrieve the template
      const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/config/notification-templates/${templateId}`, testUser
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data.name).toBe(templateData.name);
      expect(getResponse.body.data.subject).toBe(templateData.subject);

      // Step 3: Update the template
      const updateData = {
        subject: 'URGENT: Alert Escalation - {{alert.title}}',
        body: templateData.body + '\n\nThis is an updated template.',
        variables: {
          ...templateData.variables,
          site: {
            name: 'string'
          }
        }
      };

      const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'put', `/api/v1/andon/config/notification-templates/${templateId}`, testUser, updateData
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.data.subject).toBe(updateData.subject);

      // Step 4: List all templates
      const listResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/notification-templates', testUser
      );

      expect(listResponse.status).toBe(200);
      expect(listResponse.body.data).toBeInstanceOf(Array);
      expect(listResponse.body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter templates by type and site', async () => {
      // Create templates of different types
      const emailTemplate = {
        name: 'Email Template',
        templateType: 'EMAIL',
        subject: 'Email Subject',
        body: 'Email body',
        isActive: true
      };

      const smsTemplate = {
        name: 'SMS Template',
        templateType: 'SMS',
        body: 'SMS: {{alert.title}}',
        isActive: true
      };

      await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/notification-templates', testUser, emailTemplate
      );

      await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/notification-templates', testUser, smsTemplate
      );

      // Filter by EMAIL type
      const emailFilterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/notification-templates', testUser, undefined,
        { templateType: 'EMAIL' }
      );

      expect(emailFilterResponse.status).toBe(200);
      emailFilterResponse.body.data.forEach((template: any) => {
        expect(template.templateType).toBe('EMAIL');
      });

      // Filter by SMS type
      const smsFilterResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/notification-templates', testUser, undefined,
        { templateType: 'SMS' }
      );

      expect(smsFilterResponse.status).toBe(200);
      smsFilterResponse.body.data.forEach((template: any) => {
        expect(template.templateType).toBe('SMS');
      });
    });
  });

  describe('System Settings Management', () => {
    it('should retrieve and update system settings', async () => {
      // Step 1: Retrieve current system settings
      const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/system-settings', testUser
      );

      expect(getResponse.status).toBe(200);
      expect(getResponse.body.data).toBeInstanceOf(Array);

      // Step 2: Update system settings
      const updateData = {
        siteId: testSite.id,
        settings: {
          globalAlertLimit: 100,
          defaultEscalationTime: 30,
          enableAutoEscalation: true,
          notificationSettings: {
            retryAttempts: 3,
            retryDelay: 60,
            enableBatch: true
          },
          systemMaintenance: {
            maintenanceMode: false,
            maintenanceMessage: 'System is operational'
          }
        }
      };

      const updateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/system-settings', testUser, updateData
      );

      expect(updateResponse.status).toBe(200);
      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.settings).toEqual(updateData.settings);

      // Step 3: Verify settings were persisted
      const verifyResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/system-settings', testUser, undefined,
        { siteId: testSite.id }
      );

      expect(verifyResponse.status).toBe(200);
      const savedSettings = verifyResponse.body.data.find((s: any) => s.siteId === testSite.id);
      expect(savedSettings).toBeDefined();
      expect(savedSettings.settings).toEqual(updateData.settings);
    });
  });

  describe('Bulk Operations', () => {
    it('should handle bulk global configuration operations', async () => {
      const bulkConfigurations = [
        {
          configKey: 'bulk.test.config.1',
          configValue: { setting1: 'value1' },
          description: 'Bulk test configuration 1',
          category: 'SYSTEM',
          dataType: 'JSON'
        },
        {
          configKey: 'bulk.test.config.2',
          configValue: { setting2: 'value2' },
          description: 'Bulk test configuration 2',
          category: 'ALERTS',
          dataType: 'JSON'
        },
        {
          configKey: 'bulk.test.config.3',
          configValue: { setting3: 'value3' },
          description: 'Bulk test configuration 3',
          category: 'NOTIFICATIONS',
          dataType: 'JSON'
        }
      ];

      const bulkResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/bulk', testUser, { configurations: bulkConfigurations }
      );

      expect(bulkResponse.status).toBe(200);
      expect(bulkResponse.body.success).toBe(true);
      expect(bulkResponse.body.data).toHaveLength(3);

      // Verify all configurations were created
      for (const config of bulkConfigurations) {
        const getResponse = await RequestTestHelper.makeAuthenticatedRequest(
          app, 'get', `/api/v1/andon/config/${config.configKey}`, testUser
        );

        expect(getResponse.status).toBe(200);
        expect(getResponse.body.data.configValue).toEqual(config.configValue);
      }
    });

    it('should handle bulk site configuration operations', async () => {
      const bulkSiteConfigurations = [
        {
          siteId: testSite.id,
          configKey: 'bulk.site.config.1',
          configValue: { siteSetting1: 'value1' },
          description: 'Bulk site configuration 1',
          category: 'SITE',
          dataType: 'JSON'
        },
        {
          siteId: testSite.id,
          configKey: 'bulk.site.config.2',
          configValue: { siteSetting2: 'value2' },
          description: 'Bulk site configuration 2',
          category: 'SITE',
          dataType: 'JSON'
        }
      ];

      const bulkResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/sites/bulk', testUser, {
          siteId: testSite.id,
          configurations: bulkSiteConfigurations
        }
      );

      expect(bulkResponse.status).toBe(200);
      expect(bulkResponse.body.success).toBe(true);
      expect(bulkResponse.body.data).toHaveLength(2);

      // Verify site configurations were created
      const siteConfigsResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/config/sites/${testSite.id}`, testUser
      );

      expect(siteConfigsResponse.status).toBe(200);
      expect(siteConfigsResponse.body.data.length).toBeGreaterThanOrEqual(3); // Including our test configs
    });
  });

  describe('Configuration Validation and Export', () => {
    it('should validate configuration changes', async () => {
      const configurationsToValidate = [
        {
          configKey: 'validation.test.1',
          configValue: { validSetting: true },
          category: 'SYSTEM',
          dataType: 'JSON'
        },
        {
          configKey: 'validation.test.2',
          configValue: 'invalid-json-structure', // This should fail validation
          category: 'SYSTEM',
          dataType: 'JSON'
        }
      ];

      const validateResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config/validate', testUser, {
          configurations: configurationsToValidate
        }
      );

      expect(validateResponse.status).toBe(200);
      expect(validateResponse.body.data).toHaveProperty('valid');
      expect(validateResponse.body.data).toHaveProperty('errors');
      expect(validateResponse.body.data.valid).toBe(false);
      expect(validateResponse.body.data.errors).toHaveLength(1);
    });

    it('should export configuration data', async () => {
      // Export global configurations only
      const globalExportResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/export', testUser, undefined,
        { includeGlobal: 'true' }
      );

      expect(globalExportResponse.status).toBe(200);
      expect(globalExportResponse.body.data).toHaveProperty('globalConfigurations');
      expect(globalExportResponse.body.data.globalConfigurations).toBeInstanceOf(Array);

      // Export site-specific configurations
      const siteExportResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/export', testUser, undefined,
        { siteId: testSite.id }
      );

      expect(siteExportResponse.status).toBe(200);
      expect(siteExportResponse.body.data).toHaveProperty('siteConfigurations');
      expect(siteExportResponse.body.data.siteConfigurations).toBeInstanceOf(Array);

      // Export everything
      const fullExportResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/export', testUser, undefined,
        { siteId: testSite.id, includeGlobal: 'true' }
      );

      expect(fullExportResponse.status).toBe(200);
      expect(fullExportResponse.body.data).toHaveProperty('globalConfigurations');
      expect(fullExportResponse.body.data).toHaveProperty('siteConfigurations');
      expect(fullExportResponse.body.data).toHaveProperty('notificationTemplates');
      expect(fullExportResponse.body.data).toHaveProperty('systemSettings');
    });
  });

  describe('Error Handling and Validation', () => {
    it('should handle validation errors for configuration creation', async () => {
      const invalidData = {
        // Missing required configKey field
        configValue: { test: true },
        description: 'Invalid configuration'
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, invalidData
      );

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.errors).toBeDefined();
    });

    it('should handle configuration key conflicts', async () => {
      const configData = {
        configKey: testGlobalConfig.configKey, // Use existing key
        configValue: { newValue: true },
        description: 'Conflicting configuration',
        category: 'SYSTEM',
        dataType: 'JSON'
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, configData
      );

      expect(response.status).toBe(409);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Configuration key already exists');
    });

    it('should handle invalid configuration keys', async () => {
      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', '/api/v1/andon/config/non.existent.key', testUser
      );

      expect(response.status).toBe(404);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Configuration not found');
    });

    it('should handle unauthorized configuration access', async () => {
      const unauthorizedUser = AuthTestHelper.createReadOnlyUser();

      const configData = {
        configKey: 'unauthorized.test',
        configValue: { test: true },
        description: 'Unauthorized configuration attempt',
        category: 'SYSTEM',
        dataType: 'JSON'
      };

      const response = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', unauthorizedUser, configData
      );

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Insufficient permissions');
    });
  });

  describe('Performance and Concurrency', () => {
    it('should handle concurrent configuration updates', async () => {
      const configKey = 'concurrent.test.config';

      // Create initial configuration
      const initialConfig = {
        configKey,
        configValue: { counter: 0 },
        description: 'Concurrent test configuration',
        category: 'SYSTEM',
        dataType: 'JSON'
      };

      const createResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'post', '/api/v1/andon/config', testUser, initialConfig
      );

      const configId = createResponse.body.data.id;

      // Attempt concurrent updates
      const updatePromises = [];
      for (let i = 1; i <= 5; i++) {
        const updateData = {
          id: configId,
          configKey,
          configValue: { counter: i },
          description: `Concurrent update ${i}`,
          category: 'SYSTEM',
          dataType: 'JSON'
        };

        updatePromises.push(
          RequestTestHelper.makeAuthenticatedRequest(
            app, 'post', '/api/v1/andon/config', testUser, updateData
          )
        );
      }

      const responses = await Promise.all(updatePromises);

      // At least one update should succeed
      const successfulUpdates = responses.filter(r => r.status === 200);
      expect(successfulUpdates.length).toBeGreaterThan(0);

      // Verify final state
      const finalResponse = await RequestTestHelper.makeAuthenticatedRequest(
        app, 'get', `/api/v1/andon/config/${configKey}`, testUser
      );

      expect(finalResponse.status).toBe(200);
      expect(finalResponse.body.data.configValue.counter).toBeGreaterThan(0);
    });
  });
});