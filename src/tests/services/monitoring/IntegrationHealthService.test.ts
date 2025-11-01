/**
 * Integration Health Service Unit Tests
 * Issue #60: Phase 11 - Advanced Monitoring & Observability
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import IntegrationHealthService, { HealthStatus } from '../../../services/monitoring/IntegrationHealthService';

describe('IntegrationHealthService', () => {
  let service: IntegrationHealthService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      erpIntegration: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'integration-1',
          name: 'Test Integration',
          enabled: true,
          lastSync: new Date(),
        }),
        findMany: vi.fn(),
      },
      erpLog: {
        count: vi.fn(),
      },
      erpWebhookEndpoint: {
        count: vi.fn(),
      },
      erpWebhookDelivery: {
        count: vi.fn(),
      },
    };

    service = new IntegrationHealthService(mockPrisma);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('healthCheck', () => {
    it('should return HEALTHY status when all checks pass', async () => {
      const now = new Date();
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({
        id: 'integration-1',
        name: 'Test Integration',
        enabled: true,
        lastSync: now,
      });

      mockPrisma.erpLog.count
        .mockResolvedValueOnce(96) // successful syncs
        .mockResolvedValueOnce(100) // total syncs
        .mockResolvedValueOnce(0) // errors in 24h
        .mockResolvedValueOnce(100); // total in 24h

      mockPrisma.erpWebhookEndpoint.count
        .mockResolvedValueOnce(5) // active webhooks
        .mockResolvedValueOnce(0); // failed webhooks

      mockPrisma.erpWebhookDelivery.count.mockResolvedValueOnce(0); // failed deliveries

      const result = await service.healthCheck('integration-1');

      expect(result.integrationId).toBe('integration-1');
      expect(result.status).toBe(HealthStatus.HEALTHY);
    });

    it('should return DEGRADED status when sync rate is low', async () => {
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({
        id: 'integration-1',
        name: 'Test Integration',
        enabled: true,
        lastSync: new Date(),
      });

      mockPrisma.erpLog.count
        .mockResolvedValueOnce(50) // successful syncs (50%)
        .mockResolvedValueOnce(100) // total syncs
        .mockResolvedValueOnce(5) // errors in 24h
        .mockResolvedValueOnce(100); // total in 24h

      mockPrisma.erpWebhookEndpoint.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      mockPrisma.erpWebhookDelivery.count.mockResolvedValueOnce(0);

      const result = await service.healthCheck('integration-1');

      expect(result.status).toBe(HealthStatus.DEGRADED);
      expect(result.checks.syncSuccessRate.status).toBe(HealthStatus.DEGRADED);
    });

    it('should evaluate all health checks properly', async () => {
      const now = new Date();
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({
        id: 'integration-1',
        name: 'Test Integration',
        enabled: true,
        lastSync: now,
      });

      mockPrisma.erpLog.count
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(100);

      mockPrisma.erpWebhookEndpoint.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      mockPrisma.erpWebhookDelivery.count.mockResolvedValueOnce(0);

      const result = await service.healthCheck('integration-1');

      expect(result.checks).toBeDefined();
      expect(result.checks.lastSync).toBeDefined();
      expect(result.checks.syncSuccessRate).toBeDefined();
      expect(result.checks.webhookHealth).toBeDefined();
      expect(result.checks.errorRate).toBeDefined();
    });

    it('should include recommendations in result', async () => {
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce({
        id: 'integration-1',
        name: 'Test Integration',
        enabled: true,
        lastSync: new Date(),
      });

      mockPrisma.erpLog.count
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(100);

      mockPrisma.erpWebhookEndpoint.count
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0);

      mockPrisma.erpWebhookDelivery.count.mockResolvedValueOnce(0);

      const result = await service.healthCheck('integration-1');

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should throw error for non-existent integration', async () => {
      mockPrisma.erpIntegration.findUnique.mockResolvedValueOnce(null);

      await expect(service.healthCheck('integration-1')).rejects.toThrow('not found');
    });
  });

  describe('getAllHealthStatus', () => {
    it('should get health status for all integrations', async () => {
      mockPrisma.erpIntegration.findMany.mockResolvedValueOnce([
        { id: 'integration-1', name: 'Integration 1', enabled: true, lastSync: new Date() },
        { id: 'integration-2', name: 'Integration 2', enabled: true, lastSync: new Date() },
      ]);

      // Mock the health check responses for each integration
      mockPrisma.erpLog.count
        // First integration
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(100)
        // Second integration
        .mockResolvedValueOnce(90)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(100);

      mockPrisma.erpWebhookEndpoint.count
        // First integration
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(0)
        // Second integration
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(0);

      mockPrisma.erpWebhookDelivery.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const results = await service.getAllHealthStatus();

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      expect(results[0].integrationId).toBe('integration-1');
      expect(results[1].integrationId).toBe('integration-2');
    });

    it('should handle errors gracefully', async () => {
      mockPrisma.erpIntegration.findMany.mockRejectedValueOnce(new Error('DB error'));

      await expect(service.getAllHealthStatus()).rejects.toThrow();
    });
  });
});
