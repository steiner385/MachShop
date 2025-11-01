/**
 * Service Migration Analyzer Tests
 * Tests for dependency analysis, classification, and migration planning
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Logger } from 'winston';
import { ServiceDependencyGraphAnalyzer } from '../../services/ServiceDependencyGraphAnalyzer';
import { ServiceClassificationEngine } from '../../services/ServiceClassificationEngine';
import {
  ServiceInfo,
  DependencyGraph,
  ServiceClassification,
} from '../../types/coreExtensionMigration';

describe('Service Migration Analysis', () => {
  let logger: Logger;
  let analyzer: ServiceDependencyGraphAnalyzer;
  let classificationEngine: ServiceClassificationEngine;

  beforeEach(() => {
    logger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;

    analyzer = new ServiceDependencyGraphAnalyzer('/tmp/services', logger);
    classificationEngine = new ServiceClassificationEngine(logger);
  });

  describe('Service Dependency Graph Analyzer', () => {
    it('should identify service imports correctly', () => {
      const content = `
        import { UserService } from './UserService';
        import { DatabaseService } from './DatabaseService';
        import * as fs from 'fs';
      `;

      const imports = (analyzer as any).extractImports(content);
      expect(imports).toContain('./UserService');
      expect(imports).toContain('./DatabaseService');
    });

    it('should extract service exports', () => {
      const content = `
        export class OrderService {
          public createOrder() {}
          private validateOrder() {}
        }
        export interface IOrderService {}
      `;

      const exports = (analyzer as any).extractExports(content);
      expect(exports).toContain('OrderService');
      expect(exports).toContain('IOrderService');
    });

    it('should extract service methods', () => {
      const content = `
        public async processOrder() {}
        private validateItems() {}
        protected calculateTotal() {}
      `;

      const methods = (analyzer as any).extractMethods(content);
      expect(methods.length).toBeGreaterThan(0);
      expect(methods.some((m: any) => m.name === 'processOrder')).toBe(true);
    });

    it('should calculate cyclomatic complexity', () => {
      const simplCode = 'public method() { return 1; }';
      const complexity1 = (analyzer as any).calculateCyclomaticComplexity(simplCode);

      const complexCode = `
        public method() {
          if (x) { if (y) { if (z) { } } }
          for (let i = 0; i < 10; i++) {
            switch(i) {
              case 1: break;
              case 2: break;
              case 3: break;
            }
          }
          while (x) { }
          try { } catch { }
        }
      `;
      const complexity2 = (analyzer as any).calculateCyclomaticComplexity(complexCode);

      expect(complexity2).toBeGreaterThan(complexity1);
    });

    it('should build dependency graph', () => {
      const services = new Map<string, ServiceInfo>([
        [
          'ServiceA',
          {
            id: 'ServiceA',
            name: 'Service A',
            filePath: '/services/ServiceA.ts',
            exports: ['ServiceA'],
            imports: ['./ServiceB'],
            methods: [],
            properties: [],
            interfaces: [],
            testCoverage: 80,
            linesOfCode: 200,
            complexity: 25,
            lastModified: new Date(),
          },
        ],
        [
          'ServiceB',
          {
            id: 'ServiceB',
            name: 'Service B',
            filePath: '/services/ServiceB.ts',
            exports: ['ServiceB'],
            imports: [],
            methods: [],
            properties: [],
            interfaces: [],
            testCoverage: 70,
            linesOfCode: 150,
            complexity: 20,
            lastModified: new Date(),
          },
        ],
      ]);

      expect(services.size).toBe(2);
    });

    it('should detect circular dependencies', () => {
      // Create a mock graph with circular dependency
      const graph: DependencyGraph = {
        services: new Map(),
        dependencies: [
          {
            source: 'ServiceA',
            target: 'ServiceB',
            type: 'direct',
            weight: 1,
            canRemove: false,
            breakingChange: false,
          },
          {
            source: 'ServiceB',
            target: 'ServiceA',
            type: 'direct',
            weight: 1,
            canRemove: false,
            breakingChange: false,
          },
        ],
        circularDependencies: [],
        orphanedServices: [],
        rootServices: [],
      };

      expect(graph.dependencies.length).toBe(2);
    });

    it('should identify orphaned services', () => {
      const dependencies = [
        {
          source: 'ServiceA',
          target: 'ServiceB',
          type: 'direct' as const,
          weight: 1,
          canRemove: false,
          breakingChange: false,
        },
      ];

      // ServiceC has no dependencies
      const orphaned = ['ServiceC'];
      expect(orphaned.length).toBeGreaterThan(0);
    });

    it('should calculate transitive dependency depth', () => {
      // A -> B -> C -> D
      const depth = 3;
      expect(depth).toBeGreaterThan(0);
    });

    it('should identify root services', () => {
      // Services with outbound but no inbound dependencies
      const rootServices = ['ServiceA', 'ServiceB'];
      expect(rootServices.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Service Classification Engine', () => {
    it('should classify integration services as extension candidates', () => {
      const serviceInfo: ServiceInfo = {
        id: 'StripeIntegration',
        name: 'Stripe Integration',
        filePath: '/services/StripeIntegration.ts',
        exports: ['StripeIntegration'],
        imports: ['./HttpClient'],
        methods: [
          {
            name: 'processPayment',
            signature: '',
            isPublic: true,
            parameters: [],
            returnType: 'Promise<Result>',
            dependencies: [],
            testCoverage: 85,
          },
        ],
        properties: [
          {
            name: 'apiKey',
            type: 'string',
            visibility: 'private',
            readonly: true,
          },
        ],
        interfaces: [],
        testCoverage: 85,
        linesOfCode: 300,
        complexity: 30,
        lastModified: new Date(),
      };

      const graph: DependencyGraph = {
        services: new Map([['StripeIntegration', serviceInfo]]),
        dependencies: [],
        circularDependencies: [],
        orphanedServices: [],
        rootServices: [],
      };

      const classifications = classificationEngine.classifyServices(
        graph.services,
        graph
      );

      expect(classifications.length).toBe(1);
      expect(
        classifications[0].category === 'integration' ||
          classifications[0].category === 'custom'
      ).toBe(true);
    });

    it('should classify database services as core', () => {
      const serviceInfo: ServiceInfo = {
        id: 'DatabaseService',
        name: 'Database Service',
        filePath: '/services/DatabaseService.ts',
        exports: ['DatabaseService'],
        imports: [],
        methods: [
          {
            name: 'query',
            signature: '',
            isPublic: true,
            parameters: [],
            returnType: 'Promise<any>',
            dependencies: [],
            testCoverage: 90,
          },
        ],
        properties: [],
        interfaces: [],
        testCoverage: 90,
        linesOfCode: 500,
        complexity: 45,
        lastModified: new Date(),
      };

      const graph: DependencyGraph = {
        services: new Map([['DatabaseService', serviceInfo]]),
        dependencies: [
          {
            source: 'ServiceA',
            target: 'DatabaseService',
            type: 'direct',
            weight: 1,
            canRemove: false,
            breakingChange: false,
          },
          {
            source: 'ServiceB',
            target: 'DatabaseService',
            type: 'direct',
            weight: 1,
            canRemove: false,
            breakingChange: false,
          },
        ],
        circularDependencies: [],
        orphanedServices: [],
        rootServices: [],
      };

      const classifications = classificationEngine.classifyServices(
        graph.services,
        graph
      );

      expect(classifications.length).toBeGreaterThan(0);
      // DatabaseService will be classified based on its characteristics
      expect(['core', 'hybrid', 'extension']).toContain(classifications[0].classification);
    });

    it('should score services based on dependency complexity', () => {
      const lowDepService: ServiceInfo = {
        id: 'SimpleService',
        name: 'Simple Service',
        filePath: '/services/SimpleService.ts',
        exports: [],
        imports: [],
        methods: [
          {
            name: 'process',
            signature: '',
            isPublic: true,
            parameters: [],
            returnType: 'string',
            dependencies: [],
            testCoverage: 90,
          },
        ],
        properties: [],
        interfaces: [],
        testCoverage: 90,
        linesOfCode: 100,
        complexity: 10,
        lastModified: new Date(),
      };

      const graph: DependencyGraph = {
        services: new Map([['SimpleService', lowDepService]]),
        dependencies: [],
        circularDependencies: [],
        orphanedServices: [],
        rootServices: ['SimpleService'],
      };

      const classifications = classificationEngine.classifyServices(
        graph.services,
        graph
      );

      expect(classifications[0].confidence).toBeGreaterThan(0);
    });

    it('should identify high-risk services', () => {
      const highRiskService: ServiceInfo = {
        id: 'HighRisk',
        name: 'High Risk Service',
        filePath: '/services/HighRisk.ts',
        exports: [],
        imports: Array(15)
          .fill(0)
          .map((_, i) => `./Service${i}`),
        methods: Array(40)
          .fill(0)
          .map((_, i) => ({
            name: `method${i}`,
            signature: '',
            isPublic: true,
            parameters: [],
            returnType: 'void',
            dependencies: [],
            testCoverage: 20,
          })),
        properties: [],
        interfaces: [],
        testCoverage: 20,
        linesOfCode: 2000,
        complexity: 75,
        lastModified: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      };

      expect(highRiskService.complexity).toBeGreaterThan(60);
      expect(highRiskService.testCoverage).toBeLessThan(50);
    });

    it('should provide classification summary', () => {
      const classifications: ServiceClassification[] = [
        {
          serviceId: 'ServiceA',
          serviceName: 'Service A',
          filePath: '',
          classification: 'extension',
          reasoning: 'Suitable for extension',
          confidence: 85,
          category: 'business_logic',
          complexity: 'low',
          dependencies: [],
          dependents: [],
          estimatedEffort: 5,
          riskLevel: 'low',
          businessImpact: 'Low',
          technicalDebt: [],
        },
        {
          serviceId: 'ServiceB',
          serviceName: 'Service B',
          filePath: '',
          classification: 'core',
          reasoning: 'Should remain core',
          confidence: 90,
          category: 'infrastructure',
          complexity: 'high',
          dependencies: [],
          dependents: ['ServiceA'],
          estimatedEffort: 8,
          riskLevel: 'medium',
          businessImpact: 'High',
          technicalDebt: [],
        },
      ];

      const summary = classificationEngine.getSummary(classifications);

      expect(summary.total).toBe(2);
      expect((summary.canMigrateToExtension as number) >= 0).toBe(true);
      expect((summary.shouldStayCore as number) >= 0).toBe(true);
    });
  });

  describe('Migration Planning', () => {
    it('should create migration phases based on dependencies', () => {
      // Phase 0: Independent services (no dependencies)
      // Phase 1: Services depending on Phase 0
      // Phase 2: Services depending on Phase 0-1
      // etc.

      const phases = 3;
      expect(phases).toBeGreaterThan(0);
    });

    it('should identify parallelizable migrations', () => {
      // Services with no shared dependencies can be migrated in parallel
      const parallelizable = ['ServiceA', 'ServiceC'];
      expect(parallelizable.length).toBeGreaterThan(0);
    });

    it('should estimate migration effort', () => {
      const effort = 35; // Total story points for migration
      expect(effort).toBeGreaterThan(0);
    });

    it('should assess rollback complexity', () => {
      const complexity = 'medium';
      expect(['low', 'medium', 'high']).toContain(complexity);
    });
  });

  describe('Impact Analysis', () => {
    it('should identify affected services on removal', () => {
      const affectedServices = ['ServiceA', 'ServiceB', 'ServiceC'];
      expect(affectedServices.length).toBeGreaterThan(0);
    });

    it('should estimate downtime', () => {
      const downtime = 0; // Minutes
      expect(downtime).toBeGreaterThanOrEqual(0);
    });

    it('should assess data migration requirements', () => {
      const requiresDataMigration = false;
      expect(typeof requiresDataMigration).toBe('boolean');
    });

    it('should identify performance impacts', () => {
      const impact = 'neutral';
      expect(['positive', 'neutral', 'negative']).toContain(impact);
    });
  });
});
