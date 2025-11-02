/**
 * AI Services Test Suite (Issue #400)
 * Tests for provider-agnostic AI services with safety, compliance, and audit features
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  AIAgentService,
  AIProvider,
  ProviderRegistry,
  AIProviderConfig,
  AIProviderType,
  AIAgentRequest,
  AIContext,
  ValidationResult,
  WorkflowGenerationRequest,
  GeneratedWorkflow,
  FormGenerationRequest,
  GeneratedForm,
  RuleGenerationRequest,
  GeneratedRule,
  ChatbotRequest,
  ChatbotResponse,
} from '../src';

// ========== Mock Provider for Testing ==========

class MockAIProvider implements AIProvider {
  private config: AIProviderConfig;

  constructor(config: AIProviderConfig) {
    this.config = config;
  }

  getConfig() {
    return { ...this.config };
  }

  setConfig(config: Partial<AIProviderConfig>) {
    this.config = { ...this.config, ...config };
  }

  validateConfig() {
    return {
      isValid: true,
      errors: [],
      warnings: [],
    };
  }

  async complete(request: any) {
    return {
      id: 'mock-123',
      content: '{"status": "success"}',
      stopReason: 'end_turn' as const,
      usage: {
        inputTokens: 100,
        outputTokens: 50,
        totalTokens: 150,
      },
      model: this.config.model,
      timestamp: new Date(),
    };
  }

  async *stream(request: any) {
    yield {
      id: 'mock-123',
      type: 'content_block_delta' as const,
      timestamp: new Date(),
      delta: { type: 'text_delta', text: 'Mock response' },
    };
  }

  async structuredOutput<T>(request: any, schema: any): Promise<T> {
    return { success: true } as T;
  }

  async countTokens(text: string) {
    return Math.ceil(text.length / 4);
  }

  async estimateCost(inputTokens: number, outputTokens: number) {
    return (inputTokens + outputTokens) * 0.00001;
  }

  async healthCheck() {
    return {
      status: 'healthy' as const,
      latency: 100,
      available: true,
      lastChecked: new Date(),
    };
  }

  getUsageStats() {
    return {
      totalRequests: 1,
      totalInputTokens: 100,
      totalOutputTokens: 50,
      estimatedCost: 0.0015,
      errorCount: 0,
      averageLatency: 100,
    };
  }
}

// ========== Test Suite Setup ==========

describe('AI Services - Provider Agnostic Architecture', () => {
  let service: AIAgentService;
  let mockConfig: AIProviderConfig;

  beforeEach(() => {
    mockConfig = {
      providerId: 'mock-provider',
      providerType: 'custom' as AIProviderType,
      model: 'mock-model',
      maxTokens: 2000,
      temperature: 0.7,
    };

    // Register mock provider
    ProviderRegistry.register('custom', {
      create: (config) => new MockAIProvider(config),
      getAvailableProviders: () => ['mock-model'],
      isProviderAvailable: () => true,
    });

    service = new AIAgentService(mockConfig);
  });

  // ========== Provider Registry Tests ==========

  describe('Provider Registry', () => {
    it('should register and retrieve providers', () => {
      expect(ProviderRegistry.isRegistered('custom')).toBe(true);
    });

    it('should create provider instances', () => {
      const provider = ProviderRegistry.createProvider(mockConfig);
      expect(provider).toBeDefined();
      expect(provider.getConfig().model).toBe('mock-model');
    });

    it('should throw error for unregistered providers', () => {
      expect(() => {
        ProviderRegistry.createProvider({
          ...mockConfig,
          providerType: 'unknown' as any,
        });
      }).toThrow();
    });
  });

  // ========== AI Agent Service Tests ==========

  describe('AI Agent Service', () => {
    it('should process valid requests', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-001',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'Generate a workflow for handling quality issues',
        context: {},
      };

      const response = await service.process(request);

      expect(response.success).toBe(true);
      expect(response.requestId).toBe('req-001');
      expect(response.status).toBe('completed');
      expect(response.auditTrail).toBeDefined();
      expect(response.auditTrail!.length).toBeGreaterThan(0);
    });

    it('should reject requests without userId', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-002',
        timestamp: new Date(),
        userId: '',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'Test query',
        context: {},
      };

      const response = await service.process(request);

      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
      expect(response.error?.code).toBe('VALIDATION_ERROR');
    });

    it('should maintain audit trail', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-003',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'form-generation',
        query: 'Generate a form',
        context: {},
      };

      await service.process(request);
      const auditTrail = service.getAuditTrail('req-003');

      expect(auditTrail).toBeDefined();
      expect(auditTrail.length).toBeGreaterThan(0);
      expect(auditTrail[0].userId).toBe('user-123');
      expect(auditTrail[0].operation).toContain('AI_');
    });

    it('should track costs', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-004',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'rule-generation',
        query: 'Generate a rule',
        context: {},
      };

      await service.process(request);
      const costs = service.getCostTracking('tenant-456');

      expect(costs).toBeDefined();
      expect(costs.length).toBeGreaterThan(0);
      expect(costs[0].estimatedCost).toBeGreaterThan(0);
    });
  });

  // ========== Safety & Validation Tests ==========

  describe('Safety & Validation', () => {
    it('should detect code injection attempts', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-005',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'Generate: <script>alert("malicious")</script>',
        context: {},
        constraints: {
          forbiddenPatterns: ['<script', 'eval', 'exec'],
        },
      };

      const response = await service.process(request);
      expect(response.success).toBe(false);
    });

    it('should apply safety constraints', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-006',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'Workflow query',
        context: {},
        constraints: {
          maxComplexity: 5,
          requiredCompliance: ['FDA', 'WCAG'],
        },
      };

      const response = await service.process(request);
      expect(response.success).toBe(true);
    });
  });

  // ========== Context & Constraints Tests ==========

  describe('Context & Constraints', () => {
    it('should process requests with data models', async () => {
      const context: AIContext = {
        dataModels: [
          {
            id: 'model-001',
            name: 'WorkOrder',
            description: 'Work order model',
            fields: [
              {
                id: 'field-001',
                name: 'orderNumber',
                type: 'string',
                required: true,
              },
            ],
          },
        ],
      };

      const request: AIAgentRequest = {
        requestId: 'req-007',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'form-generation',
        query: 'Generate form for work orders',
        context,
      };

      const response = await service.process(request);
      expect(response.success).toBe(true);
    });

    it('should handle governance rules', async () => {
      const context: AIContext = {
        governanceRules: [
          {
            id: 'rule-001',
            name: 'FDA Compliance',
            description: 'FDA 21 CFR Part 11',
            type: 'compliance',
            expression: 'auditTrail required',
            enforced: true,
            severity: 'error',
          },
        ],
      };

      const request: AIAgentRequest = {
        requestId: 'req-008',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'rule-generation',
        query: 'Generate FDA-compliant rules',
        context,
      };

      const response = await service.process(request);
      expect(response.success).toBe(true);
    });
  });

  // ========== Streaming Tests ==========

  describe('Streaming Operations', () => {
    it('should support streaming responses', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-009',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'Generate workflow',
        context: {},
      };

      const chunks: any[] = [];
      for await (const chunk of service.processStream(request)) {
        chunks.push(chunk);
      }

      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0].requestId).toBe('req-009');
    });
  });

  // ========== Health & Status Tests ==========

  describe('Health & Status', () => {
    it('should report health status', async () => {
      const health = await service.getHealthStatus();

      expect(health).toBeDefined();
      expect(health.provider).toBeDefined();
      expect(health.provider.status).toBe('healthy');
      expect(health.service).toBeDefined();
      expect(health.stats).toBeDefined();
    });

    it('should track usage statistics', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-010',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'chatbot',
        query: 'Hello',
        context: {},
      };

      await service.process(request);
      const health = await service.getHealthStatus();

      expect(health.stats.totalRequests).toBeGreaterThan(0);
      expect(health.stats.totalInputTokens).toBeGreaterThan(0);
    });
  });

  // ========== Prompt Template Tests ==========

  describe('Prompt Templates', () => {
    it('should register and use prompt templates', async () => {
      service.registerPromptTemplate({
        id: 'template-001',
        name: 'Workflow Generation',
        description: 'Template for generating workflows',
        version: '1.0.0',
        template: 'Generate a workflow for: {input}',
        examples: [
          {
            input: 'handling quality failures',
            output: 'Workflow with decision and notification nodes',
          },
        ],
        category: 'workflow-generation',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const request: AIAgentRequest = {
        requestId: 'req-011',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'handling quality failures',
        context: {},
      };

      const response = await service.process(request);
      expect(response.success).toBe(true);
    });
  });

  // ========== Multi-Tenant Tests ==========

  describe('Multi-Tenant Isolation', () => {
    it('should isolate costs by tenant', async () => {
      const req1: AIAgentRequest = {
        requestId: 'req-t1-1',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-001',
        category: 'workflow-generation',
        query: 'Query 1',
        context: {},
      };

      const req2: AIAgentRequest = {
        requestId: 'req-t2-1',
        timestamp: new Date(),
        userId: 'user-456',
        tenantId: 'tenant-002',
        category: 'form-generation',
        query: 'Query 2',
        context: {},
      };

      await service.process(req1);
      await service.process(req2);

      const costs1 = service.getCostTracking('tenant-001');
      const costs2 = service.getCostTracking('tenant-002');

      expect(costs1.length).toBeGreaterThan(0);
      expect(costs2.length).toBeGreaterThan(0);
      expect(costs1[0].tenantId).toBe('tenant-001');
      expect(costs2[0].tenantId).toBe('tenant-002');
    });

    it('should isolate audit trails by tenant', async () => {
      const req1: AIAgentRequest = {
        requestId: 'req-a1',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-a',
        category: 'chatbot',
        query: 'Query A',
        context: {},
      };

      const req2: AIAgentRequest = {
        requestId: 'req-b1',
        timestamp: new Date(),
        userId: 'user-456',
        tenantId: 'tenant-b',
        category: 'chatbot',
        query: 'Query B',
        context: {},
      };

      await service.process(req1);
      await service.process(req2);

      const audit1 = service.getAuditTrail('req-a1');
      const audit2 = service.getAuditTrail('req-b1');

      expect(audit1[0].tenantId).toBe('tenant-a');
      expect(audit2[0].tenantId).toBe('tenant-b');
    });
  });

  // ========== Error Handling Tests ==========

  describe('Error Handling', () => {
    it('should handle missing required fields', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-err-1',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: '',
        context: {},
      };

      const response = await service.process(request);
      expect(response.success).toBe(false);
      expect(response.error).toBeDefined();
    });

    it('should handle provider errors gracefully', async () => {
      const badConfig: AIProviderConfig = {
        providerId: 'bad-provider',
        providerType: 'custom',
        model: 'invalid-model',
        maxTokens: 100000000, // Invalid
        temperature: 5, // Invalid
      };

      const badService = new AIAgentService(badConfig);
      const request: AIAgentRequest = {
        requestId: 'req-err-2',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'Test',
        context: {},
      };

      const response = await badService.process(request);
      expect(response).toBeDefined();
    });
  });

  // ========== Batch Operations Tests ==========

  describe('Batch Operations', () => {
    it('should handle multiple requests', async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        requestId: `req-batch-${i}`,
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation' as const,
        query: `Query ${i}`,
        context: {},
      }));

      const results = await Promise.all(requests.map((req) => service.process(req)));

      expect(results.length).toBe(5);
      expect(results.every((r) => r.requestId)).toBe(true);
    });
  });

  // ========== Performance Tests ==========

  describe('Performance', () => {
    it('should complete requests within reasonable time', async () => {
      const request: AIAgentRequest = {
        requestId: 'req-perf-1',
        timestamp: new Date(),
        userId: 'user-123',
        tenantId: 'tenant-456',
        category: 'workflow-generation',
        query: 'Performance test query',
        context: {},
      };

      const startTime = Date.now();
      await service.process(request);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(5000); // Should complete in less than 5 seconds
    });
  });
});
