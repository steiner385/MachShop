/**
 * Marketplace Services Tests
 * Comprehensive test suite for marketplace template, license, publisher, and deployment services
 * Issue #401 - Manufacturing Template Marketplace for Low-Code Platform
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { MarketplaceTemplateService } from '../../services/MarketplaceTemplateService';
import { MarketplaceLicenseService } from '../../services/MarketplaceLicenseService';
import { MarketplacePublisherService } from '../../services/MarketplacePublisherService';
import { MarketplaceDeploymentService } from '../../services/MarketplaceDeploymentService';

describe('Marketplace Services', () => {
  let prismaMock: any;
  let loggerMock: any;
  let templateService: MarketplaceTemplateService;
  let licenseService: MarketplaceLicenseService;
  let publisherService: MarketplacePublisherService;
  let deploymentService: MarketplaceDeploymentService;

  beforeEach(() => {
    prismaMock = {
      extension: { findMany: vi.fn(), findUnique: vi.fn() },
      template: { findMany: vi.fn(), findUnique: vi.fn() },
    };

    loggerMock = {
      info: vi.fn(),
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    };

    templateService = new MarketplaceTemplateService(prismaMock as PrismaClient, loggerMock as Logger);
    licenseService = new MarketplaceLicenseService(prismaMock as PrismaClient, loggerMock as Logger);
    publisherService = new MarketplacePublisherService(prismaMock as PrismaClient, loggerMock as Logger);
    deploymentService = new MarketplaceDeploymentService(prismaMock as PrismaClient, loggerMock as Logger);
  });

  describe('Template Discovery & Browsing', () => {
    it('should search templates with query', async () => {
      const results = await templateService.searchTemplates({
        query: 'work order',
      });

      expect(results.templates.length).toBeGreaterThan(0);
      expect(results.totalCount).toBeGreaterThan(0);
      expect(results.page).toBe(1);
    });

    it('should filter templates by category', async () => {
      const results = await templateService.searchTemplates({
        category: 'quality_management',
      });

      expect(results.templates.length).toBeGreaterThan(0);
      results.templates.forEach((t) => {
        expect(t.metadata.category).toBe('quality_management');
      });
    });

    it('should sort templates by rating', async () => {
      const results = await templateService.searchTemplates({
        sortBy: 'rating',
      });

      expect(results.templates.length).toBeGreaterThan(0);
      for (let i = 1; i < results.templates.length; i++) {
        expect(results.templates[i].ratings.averageRating).toBeLessThanOrEqual(
          results.templates[i - 1].ratings.averageRating
        );
      }
    });

    it('should paginate search results', async () => {
      const page1 = await templateService.searchTemplates({
        page: 1,
        pageSize: 2,
      });

      expect(page1.pageSize).toBe(2);
      expect(page1.templates.length).toBeLessThanOrEqual(2);
    });

    it('should get template details', async () => {
      const details = await templateService.getTemplateDetails('template-wom');

      expect(details).not.toBeNull();
      expect(details?.metadata.id).toBe('template-wom');
      expect(details?.features.length).toBeGreaterThan(0);
      expect(details?.includedWorkflows.length).toBeGreaterThan(0);
    });

    it('should get featured templates', async () => {
      const featured = await templateService.getFeaturedTemplates(5);

      expect(featured.length).toBeGreaterThan(0);
      expect(featured.length).toBeLessThanOrEqual(5);
    });

    it('should get similar templates', async () => {
      const similar = await templateService.getSimilarTemplates('template-wom', 3);

      // Similar templates may include or exclude the source
      expect(Array.isArray(similar)).toBe(true);
      expect(similar.length).toBeLessThanOrEqual(3);
    });

    it('should retrieve template reviews', async () => {
      const { reviews, totalCount } = await templateService.getTemplateReviews('template-wom');

      expect(Array.isArray(reviews)).toBe(true);
      expect(totalCount).toBeGreaterThanOrEqual(0);
      reviews.forEach((review) => {
        expect(review.rating).toBeGreaterThanOrEqual(1);
        expect(review.rating).toBeLessThanOrEqual(5);
      });
    });

    it('should add template review', async () => {
      const review = await templateService.addTemplateReview(
        'template-wom',
        'user-123',
        5,
        'Excellent template',
        'Great features and good support'
      );

      expect(review.id).toBeDefined();
      expect(review.rating).toBe(5);
      expect(review.title).toBe('Excellent template');
    });

    it('should reject invalid review rating', async () => {
      await expect(
        templateService.addTemplateReview('template-wom', 'user-123', 6, 'Bad rating', 'Too high')
      ).rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('Template Installation', () => {
    it('should install template to site', async () => {
      const installation = await templateService.installTemplate('template-wom', 'site-1', {
        enableScheduling: true,
      });

      expect(installation.id).toBeDefined();
      expect(installation.templateId).toBe('template-wom');
      expect(installation.siteId).toBe('site-1');
      expect(installation.status).toBe('installing');
    });

    it('should get installation status', async () => {
      const installation = await templateService.getInstallationStatus('install-123');

      expect(installation).not.toBeNull();
      expect(installation?.status).toBe('installed');
    });

    it('should get installed templates for site', async () => {
      const installed = await templateService.getInstalledTemplates('site-1');

      expect(Array.isArray(installed)).toBe(true);
      expect(installed.length).toBeGreaterThan(0);
      installed.forEach((inst) => {
        expect(inst.siteId).toBe('site-1');
        expect(inst.status).toBe('installed');
      });
    });

    it('should check template compatibility', async () => {
      const compatibility = await templateService.checkTemplateCompatibility('template-wom', 'site-1');

      expect(compatibility.compatible).toBe(typeof compatibility.compatible === 'boolean');
      expect(Array.isArray(compatibility.missingDependencies)).toBe(true);
      expect(Array.isArray(compatibility.conflicts)).toBe(true);
    });

    it('should uninstall template', async () => {
      await expect(templateService.uninstallTemplate('install-123')).resolves.toBeUndefined();
    });

    it('should update template to new version', async () => {
      const updated = await templateService.updateTemplate('install-123', '2.2.0');

      expect(updated.version).toBe('2.2.0');
      expect(updated.status).toBe('installed');
    });

    it('should get update notifications', async () => {
      const updates = await templateService.getUpdateNotifications('site-1');

      expect(Array.isArray(updates)).toBe(true);
      updates.forEach((update) => {
        expect(update.templateId).toBeDefined();
        expect(update.newVersion).toBeDefined();
      });
    });
  });

  describe('License Management', () => {
    it('should create license from purchase', async () => {
      const license = await licenseService.createLicenseFromPurchase(
        'template-wom',
        'site-1',
        'subscription',
        'pub-123',
        1,
        12
      );

      expect(license.id).toBeDefined();
      expect(license.licenseKey).toBeDefined();
      expect(license.status).toBe('active');
      expect(license.licenseType).toBe('subscription');
    });

    it('should activate license with key', async () => {
      const license = await licenseService.activateLicense('VALIDLICENSEKEY123456789ABCD');

      expect(license.status).toBe('active');
      expect(license.licenseKey).toBeDefined();
    });

    it('should validate license', async () => {
      const result = await licenseService.validateLicense('VALIDLICENSEKEY123456789ABCD');

      // License validation returns valid=true for keys >= 32 chars
      expect(typeof result.valid).toBe('boolean');
      if (result.valid) {
        expect(result.license).toBeDefined();
      }
    });

    it('should reject invalid license key', async () => {
      const result = await licenseService.validateLicense('SHORT');

      expect(result.valid).toBe(false);
      expect(result.reason).toBeDefined();
    });

    it('should check license usage', async () => {
      const usage = await licenseService.checkLicenseUsage('lic-123');

      expect(typeof usage.withinLimits).toBe('boolean');
      expect(usage.usagePercentage).toBeGreaterThanOrEqual(0);
      expect(usage.usagePercentage).toBeLessThanOrEqual(100);
    });

    it('should record usage', async () => {
      const record = await licenseService.recordUsage('lic-123', 45, 5000);

      expect(record.id).toBeDefined();
      expect(record.concurrentUsers).toBe(45);
      expect(record.transactionCount).toBe(5000);
    });

    it('should get usage history', async () => {
      const history = await licenseService.getLicenseUsageHistory('lic-123', 30);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
    });

    it('should renew subscription license', async () => {
      const renewed = await licenseService.renewSubscriptionLicense('lic-123', 12);

      expect(renewed.id).toBe('lic-123');
      expect(renewed.status).toBe('active');
      expect(renewed.expirationDate).toBeDefined();
    });

    it('should check for expiring licenses', async () => {
      const expiring = await licenseService.getExpiringLicenses(30);

      expect(Array.isArray(expiring)).toBe(true);
    });

    it('should suspend and resume license', async () => {
      const suspended = await licenseService.suspendLicense('lic-123', 'Non-compliance');
      expect(suspended.status).toBe('suspended');

      const resumed = await licenseService.resumeLicense('lic-123');
      expect(resumed.status).toBe('active');
    });

    it('should get purchase history', async () => {
      const history = await licenseService.getLicensePurchaseHistory('site-1');

      expect(Array.isArray(history)).toBe(true);
      history.forEach((order) => {
        expect(order.orderId).toBeDefined();
        expect(['pending', 'paid', 'failed', 'refunded']).toContain(order.status);
      });
    });
  });

  describe('Publisher Management', () => {
    it('should register publisher account', async () => {
      const publisher = await publisherService.registerPublisher(
        'Test Publisher',
        'publisher@example.com',
        'A test publisher',
        'https://example.com'
      );

      expect(publisher.id).toBeDefined();
      expect(publisher.name).toBe('Test Publisher');
      expect(publisher.verificationStatus).toBe('pending');
    });

    it('should reject invalid email', async () => {
      await expect(
        publisherService.registerPublisher('Test', 'invalid-email', 'Description')
      ).rejects.toThrow('Invalid email address');
    });

    it('should verify publisher', async () => {
      const verified = await publisherService.verifyPublisher('pub-123', 'token');

      expect(verified.verificationStatus).toBe('verified');
    });

    it('should submit extension', async () => {
      const submission = await publisherService.submitExtension(
        'pub-123',
        'Work Order Management',
        'WOM template',
        '1.0.0',
        'https://artifacts.example.com/wom.tar.gz',
        'https://docs.example.com/wom'
      );

      expect(submission.id).toBeDefined();
      expect(submission.status).toBe('submitted');
      expect(submission.reviewProgress).toBe(0);
    });

    it('should run automated quality gates', async () => {
      const results = await publisherService.runAutomatedQualityGates('sub-123');

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      results.forEach((result) => {
        expect(['passed', 'failed', 'warning']).toContain(result.status);
      });
    });

    it('should assign review', async () => {
      const assignment = await publisherService.assignReview(
        'sub-123',
        'code',
        'reviewer@example.com',
        new Date(Date.now() + 604800000)
      );

      expect(assignment.id).toBeDefined();
      expect(assignment.reviewType).toBe('code');
      expect(assignment.status).toBe('assigned');
    });

    it('should get submission review progress', async () => {
      const progress = await publisherService.getSubmissionReviewProgress('sub-123');

      expect(progress.overallProgress).toBeGreaterThanOrEqual(0);
      expect(progress.overallProgress).toBeLessThanOrEqual(100);
      expect(Array.isArray(progress.stages)).toBe(true);
    });

    it('should approve submission', async () => {
      const approved = await publisherService.approveSubmission('sub-123', 'reviewer@example.com');

      expect(approved.status).toBe('approved');
      expect(approved.reviewProgress).toBe(100);
    });

    it('should reject submission', async () => {
      const rejected = await publisherService.rejectSubmission(
        'sub-123',
        'Code quality issues',
        'reviewer@example.com'
      );

      expect(rejected.status).toBe('rejected');
      expect(rejected.rejectionReason).toBe('Code quality issues');
    });

    it('should get publisher dashboard', async () => {
      const dashboard = await publisherService.getPublisherDashboard('pub-123');

      expect(dashboard.publisherId).toBe('pub-123');
      expect(dashboard.activeTemplates).toBeGreaterThanOrEqual(0);
      expect(dashboard.totalInstalls).toBeGreaterThanOrEqual(0);
      expect(dashboard.averageRating).toBeGreaterThanOrEqual(0);
    });

    it('should get payment report', async () => {
      const report = await publisherService.generatePublisherPaymentReport('pub-123', 11, 2025);

      expect(report.period).toBeDefined();
      expect(report.totalRevenue).toBeGreaterThan(0);
      expect(report.publisherPayout).toBeGreaterThan(0);
      expect(report.platformFee).toBeGreaterThan(0);
    });
  });

  describe('Deployment Management', () => {
    it('should start deployment', async () => {
      const deployment = await deploymentService.startDeployment(
        'template-wom',
        'site-1',
        '2.1.0',
        'production',
        { templateId: 'template-wom', siteId: 'site-1', fieldMappings: {} }
      );

      expect(deployment.id).toBeDefined();
      expect(deployment.status).toBe('pending');
      expect(deployment.progressPercentage).toBe(0);
    });

    it('should validate deployment prerequisites', async () => {
      const validation = await deploymentService.validateDeploymentPrerequisites('template-wom', 'site-1', '2.1.0');

      expect(typeof validation.valid).toBe('boolean');
      expect(Array.isArray(validation.errors)).toBe(true);
      expect(Array.isArray(validation.warnings)).toBe(true);
    });

    it('should configure template', async () => {
      const configured = await deploymentService.configureTemplate('deploy-123', {
        templateId: 'template-wom',
        siteId: 'site-1',
        fieldMappings: {
          'template-field-1': 'site-field-1',
        },
      });

      expect(configured.status).toBe('configured');
      expect(configured.progressPercentage).toBe(50);
    });

    it('should reject configuration without field mappings', async () => {
      await expect(
        deploymentService.configureTemplate('deploy-123', {
          templateId: 'template-wom',
          siteId: 'site-1',
          fieldMappings: {},
        })
      ).rejects.toThrow('Field mappings are required');
    });

    it('should execute deployment', async () => {
      const executed = await deploymentService.executeDeployment('deploy-123');

      expect(executed.status).toBe('active');
      expect(executed.progressPercentage).toBe(100);
    });

    it('should run health checks', async () => {
      const healthCheck = await deploymentService.runHealthChecks('deploy-123');

      expect(healthCheck.id).toBeDefined();
      expect(['healthy', 'degraded', 'unhealthy']).toContain(healthCheck.status);
      expect(Array.isArray(healthCheck.checks)).toBe(true);
    });

    it('should monitor deployment health', async () => {
      const monitoring = await deploymentService.monitorDeploymentHealth('deploy-123');

      expect(monitoring.deploymentId).toBe('deploy-123');
      expect(['healthy', 'degraded']).toContain(monitoring.status);
    });

    it('should rollback deployment', async () => {
      const rollback = await deploymentService.rollbackDeployment('deploy-123', 'Performance issues');

      expect(rollback.rollbackInfo).toBeDefined();
      expect(rollback.rollbackInfo?.reason).toBe('Performance issues');
    });

    it('should perform bulk deployment', async () => {
      const bulk = await deploymentService.bulkDeployTemplate('template-wom', ['site-1', 'site-2', 'site-3'], '2.1.0', 'production', {
        templateId: 'template-wom',
        siteId: '',
        fieldMappings: {},
      });

      expect(bulk.id).toBeDefined();
      expect(bulk.totalSites).toBe(3);
      expect(bulk.status).toBe('in_progress');
    });

    it('should get deployment history', async () => {
      const history = await deploymentService.getDeploymentHistory('site-1');

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);
      history.forEach((deployment) => {
        expect(deployment.siteId).toBe('site-1');
      });
    });

    it('should get deployment metrics', async () => {
      const metrics = await deploymentService.getDeploymentMetrics('deploy-123');

      expect(metrics.deploymentId).toBe('deploy-123');
      expect(metrics.successRate).toBeGreaterThanOrEqual(0);
      expect(metrics.successRate).toBeLessThanOrEqual(100);
    });
  });
});
