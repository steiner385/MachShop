/**
 * Oracle Fusion Cloud ERP Adapter Tests
 *
 * Tests for Oracle Fusion integration adapter including:
 * - OAuth 2.0 authentication and token management
 * - Item (part) synchronization
 * - BOM synchronization
 * - Production confirmation
 * - Webhook event handling
 * - Error handling and retries
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OracleFusionAdapter, OracleFusionConfig } from '../../services/OracleFusionAdapter';
import { PrismaClient } from '@prisma/client';

// Mock axios
const mockedAxios = {
  create: vi.fn(),
  post: vi.fn(),
  get: vi.fn(),
  put: vi.fn(),
  delete: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: mockedAxios,
}));

// Mock Prisma
vi.mock('@prisma/client', () => {
  const mockPrisma = {
    part: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    bOMItem: {
      upsert: vi.fn(),
    },
  };
  return {
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('OracleFusionAdapter', () => {
  let adapter: OracleFusionAdapter;
  let config: OracleFusionConfig;

  beforeEach(() => {
    config = {
      oicBaseUrl: 'https://test.oic.oraclecloud.com',
      fusionBaseUrl: 'https://test.fa.oraclecloud.com',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      tokenUrl: 'https://test.identity.oraclecloud.com/oauth2/v1/token',
      scopes: ['urn:opc:resource:fa'],
      webhookSecret: 'test-webhook-secret',
      syncInterval: 60,
      batchSize: 100,
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
    };

    adapter = new OracleFusionAdapter(config);

    // Clear all mocks before each test
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Authentication', () => {
    it('should authenticate with OAuth 2.0 client credentials', async () => {
      const mockToken = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: mockToken,
      });

      // Trigger authentication by making a request
      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [] },
      });

      await adapter.syncItems();

      // Verify OAuth token request
      expect(mockedAxios.post).toHaveBeenCalledWith(
        config.tokenUrl,
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        })
      );

      // Verify token parameters
      const tokenRequestParams = mockedAxios.post.mock.calls[0][1] as URLSearchParams;
      expect(tokenRequestParams.get('grant_type')).toBe('client_credentials');
      expect(tokenRequestParams.get('client_id')).toBe(config.clientId);
      expect(tokenRequestParams.get('client_secret')).toBe(config.clientSecret);
    });

    it('should cache and reuse valid OAuth token', async () => {
      const mockToken = {
        access_token: 'test-access-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockedAxios.post.mockResolvedValueOnce({
        data: mockToken,
      });

      mockedAxios.get.mockResolvedValue({
        data: { items: [] },
      });

      // Make two requests
      await adapter.syncItems();
      await adapter.syncItems();

      // Should only authenticate once (token cached)
      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      expect(mockedAxios.get).toHaveBeenCalledTimes(2);
    });

    it('should refresh expired OAuth token automatically', async () => {
      const firstToken = {
        access_token: 'first-token',
        token_type: 'Bearer',
        expires_in: 1, // Expires in 1 second
      };

      const secondToken = {
        access_token: 'second-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: firstToken })
        .mockResolvedValueOnce({ data: secondToken });

      mockedAxios.get.mockResolvedValue({
        data: { items: [] },
      });

      // First request
      await adapter.syncItems();

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Second request should trigger re-authentication
      await adapter.syncItems();

      expect(mockedAxios.post).toHaveBeenCalledTimes(2);
    });

    it('should handle authentication failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Invalid credentials'));

      await expect(adapter.syncItems()).rejects.toThrow();
    });
  });

  describe('Item Synchronization', () => {
    beforeEach(() => {
      // Mock successful authentication
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });
    });

    it('should sync items from Fusion to MES', async () => {
      const mockItems = [
        {
          ItemNumber: 'PART-001',
          ItemDescription: 'Test Part 1',
          ItemClass: 'Root',
          UOMCode: 'EA',
          PrimaryUOMCode: 'EA',
        },
        {
          ItemNumber: 'PART-002',
          ItemDescription: 'Test Part 2',
          ItemClass: 'Purchased',
          UOMCode: 'EA',
          PrimaryUOMCode: 'EA',
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: { items: mockItems },
      });

      const prisma = new PrismaClient();
      const mockUpsert = vi.mocked(prisma.part.upsert);
      mockUpsert.mockResolvedValue({} as any);

      const result = await adapter.syncItems();

      expect(result.success).toBe(true);
      expect(result.recordsProcessed).toBe(2);
      expect(mockUpsert).toHaveBeenCalledTimes(2);
      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partNumber: 'PART-001' },
          update: expect.objectContaining({
            partNumber: 'PART-001',
            partName: 'Test Part 1',
          }),
          create: expect.objectContaining({
            partNumber: 'PART-001',
            partName: 'Test Part 1',
            unitOfMeasure: 'EA',
          }),
        })
      );
    });

    it('should apply filters when syncing items', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [] },
      });

      await adapter.syncItems({
        organizationCode: 'M1',
        itemClass: 'Manufactured',
        modifiedSince: new Date('2024-01-01'),
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/itemsV2'),
        expect.objectContaining({
          params: expect.objectContaining({
            organizationCode: 'M1',
            itemClass: 'Manufactured',
          }),
        })
      );
    });

    it('should handle item sync errors gracefully', async () => {
      const mockItems = [
        {
          ItemNumber: 'PART-001',
          ItemDescription: 'Valid Part',
          ItemClass: 'Root',
          UOMCode: 'EA',
        },
        {
          ItemNumber: 'PART-002',
          ItemDescription: 'Invalid Part',
          ItemClass: 'Root',
          UOMCode: 'EA',
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: { items: mockItems },
      });

      const prisma = new PrismaClient();
      const mockUpsert = vi.mocked(prisma.part.upsert);
      mockUpsert
        .mockResolvedValueOnce({} as any) // First succeeds
        .mockRejectedValueOnce(new Error('Database error')); // Second fails

      const result = await adapter.syncItems();

      expect(result.success).toBe(true); // Partial success
      expect(result.recordsProcessed).toBe(2);
      expect(result.recordsFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toEqual({
        record: 'PART-002',
        error: 'Database error',
      });
    });

    it('should respect batch size limit', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [] },
      });

      await adapter.syncItems();

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          params: expect.objectContaining({
            limit: config.batchSize,
          }),
        })
      );
    });
  });

  describe('BOM Synchronization', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });
    });

    it('should sync BOMs from Fusion to MES', async () => {
      const mockBOMs = [
        {
          AssemblyItemNumber: 'ASM-001',
          BOMComponents: [
            {
              ComponentItemNumber: 'PART-001',
              ComponentQuantity: 2,
              ComponentUOM: 'EA',
            },
            {
              ComponentItemNumber: 'PART-002',
              ComponentQuantity: 1,
              ComponentUOM: 'EA',
            },
          ],
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: { items: mockBOMs },
      });

      const prisma = new PrismaClient();
      const mockPartFindUnique = vi.mocked(prisma.part.findUnique);
      mockPartFindUnique.mockResolvedValue({
        id: 'part-id',
        partNumber: 'ASM-001',
        unitOfMeasure: 'EA',
      } as any);

      const mockBOMUpsert = vi.mocked(prisma.bOMItem.upsert);
      mockBOMUpsert.mockResolvedValue({} as any);

      const result = await adapter.syncBOMs();

      expect(result.success).toBe(true);
      expect(mockBOMUpsert).toHaveBeenCalledTimes(2);
    });

    it('should sync specific assembly BOM by item number', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { items: [] },
      });

      await adapter.syncBOMs('ASM-001');

      expect(mockedAxios.get).toHaveBeenCalledWith(
        expect.stringContaining('/billsOfMaterials'),
        expect.objectContaining({
          params: expect.objectContaining({
            assemblyItemNumber: 'ASM-001',
          }),
        })
      );
    });

    it('should handle missing parent part in BOM sync', async () => {
      const mockBOMs = [
        {
          AssemblyItemNumber: 'MISSING-ASM',
          BOMComponents: [],
        },
      ];

      mockedAxios.get.mockResolvedValueOnce({
        data: { items: mockBOMs },
      });

      const prisma = new PrismaClient();
      vi.mocked(prisma.part.findUnique).mockResolvedValue(null);

      const result = await adapter.syncBOMs();

      expect(result.recordsFailed).toBe(1);
      expect(result.errors[0].record).toBe('MISSING-ASM');
    });
  });

  describe('Production Confirmation', () => {
    beforeEach(() => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600,
        },
      });
    });

    it('should confirm production to Fusion ERP', async () => {
      const prisma = new PrismaClient();
      vi.mocked(prisma.part.findUnique).mockResolvedValue({
        id: 'wo-id',
        workOrderNumber: 'WO-001',
        externalSystemId: 'fusion-wo-123',
      } as any);

      mockedAxios.post.mockResolvedValueOnce({
        data: { transactionId: 'txn-123' },
      });

      const result = await adapter.confirmProduction('wo-id', 100, {
        scrapQuantity: 2,
        completionDate: new Date('2024-10-15'),
      });

      expect(result.success).toBe(true);
      expect(result.transactionId).toBe('txn-123');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/workOrderCompletions'),
        expect.objectContaining({
          WorkOrderNumber: expect.any(String),
          CompletedQuantity: 100,
          ScrapQuantity: 2,
        })
      );
    });

    it('should handle production confirmation failure', async () => {
      const prisma = new PrismaClient();
      vi.mocked(prisma.part.findUnique).mockResolvedValue({
        id: 'wo-id',
        externalSystemId: 'fusion-wo-123',
      } as any);

      mockedAxios.post.mockRejectedValueOnce(new Error('Network error'));

      const result = await adapter.confirmProduction('wo-id', 100);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
    });
  });

  describe('Webhook Event Handling', () => {
    it('should validate webhook signature', async () => {
      const payload = { eventType: 'item.created', data: {} };
      const crypto = require('crypto');
      const validSignature = crypto
        .createHmac('sha256', config.webhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');

      const invalidSignature = 'invalid-signature';

      // Valid signature should not throw
      await expect(
        adapter.handleWebhookEvent({
          eventType: 'item.created',
          payload,
          signature: validSignature,
        })
      ).resolves.not.toThrow();

      // Invalid signature should throw
      await expect(
        adapter.handleWebhookEvent({
          eventType: 'item.created',
          payload,
          signature: invalidSignature,
        })
      ).rejects.toThrow('Invalid webhook signature');
    });

    it('should handle item.created webhook event', async () => {
      const payload = {
        ItemNumber: 'WEBHOOK-PART',
        ItemDescription: 'Created via webhook',
        ItemClass: 'Root',
        UOMCode: 'EA',
      };

      const prisma = new PrismaClient();
      vi.mocked(prisma.part.upsert).mockResolvedValue({} as any);

      await adapter.handleWebhookEvent({
        eventType: 'item.created',
        payload,
      });

      expect(prisma.part.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { partNumber: 'WEBHOOK-PART' },
        })
      );
    });
  });

  describe('Health Status', () => {
    it('should return healthy status when connected', async () => {
      mockedAxios.get.mockResolvedValueOnce({
        data: { status: 'ok' },
      });

      const health = await adapter.getHealthStatus();

      expect(health.connected).toBe(true);
      expect(health.responseTime).toBeGreaterThan(0);
    });

    it('should return unhealthy status on connection failure', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Connection refused'));

      const health = await adapter.getHealthStatus();

      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should retry on 401 with expired token', async () => {
      const firstToken = {
        access_token: 'expired-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      const secondToken = {
        access_token: 'new-token',
        token_type: 'Bearer',
        expires_in: 3600,
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: firstToken })
        .mockResolvedValueOnce({ data: secondToken });

      mockedAxios.get
        .mockRejectedValueOnce({
          response: { status: 401 },
          config: { headers: {} },
        })
        .mockResolvedValueOnce({ data: { items: [] } });

      const result = await adapter.syncItems();

      expect(result.success).toBe(true);
      expect(mockedAxios.post).toHaveBeenCalledTimes(2); // Initial auth + re-auth
    });

    it('should track sync duration', async () => {
      mockedAxios.post.mockResolvedValue({
        data: {
          access_token: 'test-token',
          expires_in: 3600,
        },
      });

      mockedAxios.get.mockResolvedValue({
        data: { items: [] },
      });

      const result = await adapter.syncItems();

      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(typeof result.duration).toBe('number');
    });
  });
});
