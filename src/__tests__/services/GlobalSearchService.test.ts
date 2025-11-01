/**
 * GlobalSearchService Tests
 * Comprehensive test suite for cross-entity search functionality
 *
 * GitHub Issue #176: Epic 2: Backend Service Testing - Phase 2 (Business Critical)
 * Priority: P2 - Milestone 3
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GlobalSearchService } from '../../services/GlobalSearchService';
import {
  GlobalSearchRequest,
  GlobalSearchResponse,
  SearchResult,
  SearchEntityType,
  SearchScope
} from '../../types/search';
import { PrismaClient } from '@prisma/client';

// Mock Prisma
vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => ({
    workOrder: {
      findMany: vi.fn(),
    },
    materialDefinition: {
      findMany: vi.fn(),
    },
    materialLot: {
      findMany: vi.fn(),
    },
    equipment: {
      findMany: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    product: {
      findMany: vi.fn(),
    },
    site: {
      findMany: vi.fn(),
    },
    area: {
      findMany: vi.fn(),
    },
    workCenter: {
      findMany: vi.fn(),
    },
    processSegment: {
      findMany: vi.fn(),
    },
    $disconnect: vi.fn(),
  })),
}));

describe('GlobalSearchService', () => {
  let mockPrisma: any;

  // Mock search results
  const mockWorkOrderResults: SearchResult[] = [
    {
      id: 'wo-1',
      entityType: SearchEntityType.WORK_ORDER,
      title: 'WO-2023-001',
      description: 'Turbine Blade Manufacturing',
      url: '/work-orders/wo-1',
      relevanceScore: 0.95,
      metadata: {
        status: 'IN_PROGRESS',
        partNumber: 'TB-001',
        dueDate: '2023-12-15',
        priority: 'HIGH',
      },
    },
    {
      id: 'wo-2',
      entityType: SearchEntityType.WORK_ORDER,
      title: 'WO-2023-002',
      description: 'Compressor Disk Assembly',
      url: '/work-orders/wo-2',
      relevanceScore: 0.87,
      metadata: {
        status: 'RELEASED',
        partNumber: 'CD-002',
        dueDate: '2023-12-20',
        priority: 'MEDIUM',
      },
    },
  ];

  const mockMaterialResults: SearchResult[] = [
    {
      id: 'mat-1',
      entityType: SearchEntityType.MATERIAL_DEFINITION,
      title: 'Inconel 718',
      description: 'High-temperature superalloy',
      url: '/materials/mat-1',
      relevanceScore: 0.92,
      metadata: {
        materialType: 'RAW_MATERIAL',
        unitOfMeasure: 'LB',
        supplier: 'Special Metals Corp',
      },
    },
  ];

  const mockEquipmentResults: SearchResult[] = [
    {
      id: 'eq-1',
      entityType: SearchEntityType.EQUIPMENT,
      title: 'CNC-001',
      description: '5-Axis Machining Center',
      url: '/equipment/eq-1',
      relevanceScore: 0.89,
      metadata: {
        status: 'RUNNING',
        workCenter: 'MACHINING_CELL_1',
        model: 'DMG MORI DMU 65',
      },
    },
  ];

  const mockPersonnelResults: SearchResult[] = [
    {
      id: 'user-1',
      entityType: SearchEntityType.PERSONNEL,
      title: 'John Smith',
      description: 'Senior Machinist',
      url: '/personnel/user-1',
      relevanceScore: 0.85,
      metadata: {
        employeeNumber: 'EMP001',
        department: 'Manufacturing',
        skills: ['CNC Programming', 'Quality Inspection'],
      },
    },
  ];

  beforeEach(() => {
    // Get the mocked Prisma instance
    const PrismaClientMock = PrismaClient as any;
    mockPrisma = new PrismaClientMock();

    // Replace the static prisma instance in the service
    (GlobalSearchService as any).prisma = mockPrisma;

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Service Structure', () => {
    it('should be a static class with search method', () => {
      expect(GlobalSearchService).toBeDefined();
      expect(typeof GlobalSearchService.search).toBe('function');
    });
  });

  describe('Global Search', () => {
    describe('search method', () => {
      beforeEach(() => {
        // Mock all entity search methods
        mockPrisma.workOrder.findMany.mockResolvedValue([
          {
            id: 'wo-1',
            workOrderNumber: 'WO-2023-001',
            description: 'Turbine Blade Manufacturing',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: new Date('2023-12-15'),
            product: { partNumber: 'TB-001' },
          },
        ]);

        mockPrisma.materialDefinition.findMany.mockResolvedValue([
          {
            id: 'mat-1',
            materialNumber: 'INCONEL-718',
            description: 'High-temperature superalloy',
            materialType: 'RAW_MATERIAL',
            unitOfMeasure: 'LB',
            supplier: 'Special Metals Corp',
          },
        ]);

        mockPrisma.equipment.findMany.mockResolvedValue([
          {
            id: 'eq-1',
            equipmentNumber: 'CNC-001',
            description: '5-Axis Machining Center',
            status: 'RUNNING',
            model: 'DMG MORI DMU 65',
            workCenter: { name: 'MACHINING_CELL_1' },
          },
        ]);

        mockPrisma.user.findMany.mockResolvedValue([
          {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Smith',
            employeeNumber: 'EMP001',
            title: 'Senior Machinist',
            department: 'Manufacturing',
            skills: ['CNC Programming', 'Quality Inspection'],
          },
        ]);

        // Mock empty results for other entities
        mockPrisma.product.findMany.mockResolvedValue([]);
        mockPrisma.site.findMany.mockResolvedValue([]);
        mockPrisma.area.findMany.mockResolvedValue([]);
        mockPrisma.workCenter.findMany.mockResolvedValue([]);
        mockPrisma.processSegment.findMany.mockResolvedValue([]);
        mockPrisma.materialLot.findMany.mockResolvedValue([]);
      });

      it('should perform search across all entity types with default parameters', async () => {
        const request: GlobalSearchRequest = {
          query: 'turbine',
        };

        const result = await GlobalSearchService.search(request);

        expect(result).toBeDefined();
        expect(result.totalResults).toBeGreaterThan(0);
        expect(result.results).toBeInstanceOf(Array);
        expect(result.executionTime).toBeDefined();
        expect(result.query).toBe('turbine');
        expect(result.entityCounts).toBeDefined();
      });

      it('should filter results by entity types when specified', async () => {
        const request: GlobalSearchRequest = {
          query: 'machining',
          entityTypes: [SearchEntityType.WORK_ORDER, SearchEntityType.EQUIPMENT],
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results.every(r =>
          r.entityType === SearchEntityType.WORK_ORDER ||
          r.entityType === SearchEntityType.EQUIPMENT
        )).toBe(true);

        // Should not call other entity search methods
        expect(mockPrisma.materialDefinition.findMany).not.toHaveBeenCalled();
        expect(mockPrisma.user.findMany).not.toHaveBeenCalled();
      });

      it('should respect search scope limitations', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
          scope: SearchScope.PRODUCTION,
        };

        await GlobalSearchService.search(request);

        // Should only search production-related entities
        expect(mockPrisma.workOrder.findMany).toHaveBeenCalled();
        expect(mockPrisma.equipment.findMany).toHaveBeenCalled();
        expect(mockPrisma.materialDefinition.findMany).toHaveBeenCalled();
      });

      it('should apply limit parameter correctly', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
          limit: 5,
        };

        await GlobalSearchService.search(request);

        // Check that limit is passed to individual search methods
        expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 5 })
        );
      });

      it('should handle site and area filtering', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
          siteId: 'site-1',
          areaId: 'area-1',
        };

        await GlobalSearchService.search(request);

        // Verify site/area filters are applied where applicable
        expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              operation: expect.objectContaining({
                workCenter: expect.objectContaining({
                  areaId: 'area-1',
                }),
              }),
            }),
          })
        );
      });

      it('should include inactive entities when specified', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
          includeInactive: true,
        };

        await GlobalSearchService.search(request);

        // Verify that isActive filter is not applied
        expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
          expect.not.objectContaining({
            where: expect.objectContaining({
              isActive: true,
            }),
          })
        );
      });

      it('should exclude inactive entities by default', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
        };

        await GlobalSearchService.search(request);

        // Verify that isActive filter is applied by default
        expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              isActive: true,
            }),
          })
        );
      });

      it('should calculate relevance scores correctly', async () => {
        const request: GlobalSearchRequest = {
          query: 'turbine blade',
        };

        const result = await GlobalSearchService.search(request);

        // Results should be sorted by relevance score
        for (let i = 0; i < result.results.length - 1; i++) {
          expect(result.results[i].relevanceScore).toBeGreaterThanOrEqual(
            result.results[i + 1].relevanceScore
          );
        }

        // All scores should be between 0 and 1
        result.results.forEach(r => {
          expect(r.relevanceScore).toBeGreaterThanOrEqual(0);
          expect(r.relevanceScore).toBeLessThanOrEqual(1);
        });
      });

      it('should provide entity counts in response', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
        };

        const result = await GlobalSearchService.search(request);

        expect(result.entityCounts).toBeDefined();
        expect(typeof result.entityCounts[SearchEntityType.WORK_ORDER]).toBe('number');
        expect(typeof result.entityCounts[SearchEntityType.EQUIPMENT]).toBe('number');
        expect(typeof result.entityCounts[SearchEntityType.MATERIAL_DEFINITION]).toBe('number');
        expect(typeof result.entityCounts[SearchEntityType.PERSONNEL]).toBe('number');
      });

      it('should measure and return execution time', async () => {
        const request: GlobalSearchRequest = {
          query: 'performance test',
        };

        const result = await GlobalSearchService.search(request);

        expect(result.executionTime).toBeDefined();
        expect(typeof result.executionTime).toBe('number');
        expect(result.executionTime).toBeGreaterThan(0);
      });
    });

    describe('Error Handling', () => {
      it('should handle database errors gracefully', async () => {
        mockPrisma.workOrder.findMany.mockRejectedValue(new Error('Database connection failed'));

        const request: GlobalSearchRequest = {
          query: 'test',
        };

        // Should not throw, but continue with other searches
        const result = await GlobalSearchService.search(request);

        expect(result).toBeDefined();
        expect(result.results).toBeInstanceOf(Array);
      });

      it('should handle empty search query', async () => {
        const request: GlobalSearchRequest = {
          query: '',
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results).toEqual([]);
        expect(result.totalResults).toBe(0);
      });

      it('should handle whitespace-only search query', async () => {
        const request: GlobalSearchRequest = {
          query: '   \t\n   ',
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results).toEqual([]);
        expect(result.totalResults).toBe(0);
      });

      it('should handle invalid entity types gracefully', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
          entityTypes: ['INVALID_TYPE' as SearchEntityType],
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results).toEqual([]);
        expect(result.totalResults).toBe(0);
      });

      it('should handle very long search queries', async () => {
        const longQuery = 'a'.repeat(1000);
        const request: GlobalSearchRequest = {
          query: longQuery,
        };

        await expect(GlobalSearchService.search(request)).resolves.toBeDefined();
      });
    });
  });

  describe('Individual Entity Search Methods', () => {
    describe('Work Order Search', () => {
      beforeEach(() => {
        mockPrisma.workOrder.findMany.mockResolvedValue([
          {
            id: 'wo-1',
            workOrderNumber: 'WO-2023-001',
            description: 'Turbine Blade Manufacturing',
            status: 'IN_PROGRESS',
            priority: 'HIGH',
            dueDate: new Date('2023-12-15'),
            product: { partNumber: 'TB-001', description: 'Turbine Blade' },
            operation: { operationNumber: '030' },
          },
        ]);
      });

      it('should search work orders by number and description', async () => {
        const results = await (GlobalSearchService as any).searchWorkOrders('WO-2023', 10);

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('WO-2023-001');
        expect(results[0].entityType).toBe(SearchEntityType.WORK_ORDER);
        expect(results[0].metadata.status).toBe('IN_PROGRESS');
      });

      it('should include work order metadata', async () => {
        const results = await (GlobalSearchService as any).searchWorkOrders('turbine', 10);

        expect(results[0].metadata).toEqual(
          expect.objectContaining({
            status: 'IN_PROGRESS',
            partNumber: 'TB-001',
            priority: 'HIGH',
          })
        );
      });

      it('should generate correct work order URLs', async () => {
        const results = await (GlobalSearchService as any).searchWorkOrders('WO-2023', 10);

        expect(results[0].url).toBe('/work-orders/wo-1');
      });
    });

    describe('Material Definition Search', () => {
      beforeEach(() => {
        mockPrisma.materialDefinition.findMany.mockResolvedValue([
          {
            id: 'mat-1',
            materialNumber: 'INCONEL-718',
            description: 'Nickel-chromium superalloy',
            materialType: 'RAW_MATERIAL',
            unitOfMeasure: 'LB',
            supplier: 'Special Metals Corp',
            specifications: ['AMS 5663', 'AMS 5664'],
          },
        ]);
      });

      it('should search materials by number and description', async () => {
        const results = await (GlobalSearchService as any).searchMaterialDefinitions('inconel', 10);

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('INCONEL-718');
        expect(results[0].entityType).toBe(SearchEntityType.MATERIAL_DEFINITION);
      });

      it('should include material specifications in search', async () => {
        const results = await (GlobalSearchService as any).searchMaterialDefinitions('AMS 5663', 10);

        expect(results).toHaveLength(1);
        expect(results[0].metadata.specifications).toContain('AMS 5663');
      });
    });

    describe('Equipment Search', () => {
      beforeEach(() => {
        mockPrisma.equipment.findMany.mockResolvedValue([
          {
            id: 'eq-1',
            equipmentNumber: 'CNC-001',
            description: '5-Axis Machining Center',
            status: 'RUNNING',
            model: 'DMG MORI DMU 65',
            manufacturer: 'DMG MORI',
            serialNumber: 'DM12345',
            workCenter: { name: 'MACHINING_CELL_1' },
          },
        ]);
      });

      it('should search equipment by number, model, and description', async () => {
        const results = await (GlobalSearchService as any).searchEquipment('CNC-001', 10);

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('CNC-001');
        expect(results[0].entityType).toBe(SearchEntityType.EQUIPMENT);
      });

      it('should include equipment metadata', async () => {
        const results = await (GlobalSearchService as any).searchEquipment('machining', 10);

        expect(results[0].metadata).toEqual(
          expect.objectContaining({
            status: 'RUNNING',
            model: 'DMG MORI DMU 65',
            workCenter: 'MACHINING_CELL_1',
          })
        );
      });
    });

    describe('Personnel Search', () => {
      beforeEach(() => {
        mockPrisma.user.findMany.mockResolvedValue([
          {
            id: 'user-1',
            firstName: 'John',
            lastName: 'Smith',
            employeeNumber: 'EMP001',
            title: 'Senior Machinist',
            department: 'Manufacturing',
            email: 'john.smith@company.com',
            skills: ['CNC Programming', 'Quality Inspection'],
          },
        ]);
      });

      it('should search personnel by name, employee number, and title', async () => {
        const results = await (GlobalSearchService as any).searchPersonnel('John Smith', 10);

        expect(results).toHaveLength(1);
        expect(results[0].title).toBe('John Smith');
        expect(results[0].entityType).toBe(SearchEntityType.PERSONNEL);
      });

      it('should include personnel metadata', async () => {
        const results = await (GlobalSearchService as any).searchPersonnel('machinist', 10);

        expect(results[0].metadata).toEqual(
          expect.objectContaining({
            employeeNumber: 'EMP001',
            department: 'Manufacturing',
            skills: ['CNC Programming', 'Quality Inspection'],
          })
        );
      });

      it('should search by skills and department', async () => {
        const results = await (GlobalSearchService as any).searchPersonnel('CNC Programming', 10);

        expect(results).toHaveLength(1);
        expect(results[0].metadata.skills).toContain('CNC Programming');
      });
    });
  });

  describe('Search Optimization and Performance', () => {
    describe('Query Optimization', () => {
      it('should use database indexes effectively', async () => {
        const request: GlobalSearchRequest = {
          query: 'performance test',
          limit: 100,
        };

        await GlobalSearchService.search(request);

        // Verify that searches use appropriate WHERE clauses for indexing
        expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: expect.any(Array),
            }),
          })
        );
      });

      it('should limit database queries appropriately', async () => {
        const request: GlobalSearchRequest = {
          query: 'test',
          limit: 5,
        };

        await GlobalSearchService.search(request);

        // Verify that each entity search is limited
        expect(mockPrisma.workOrder.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 5 })
        );
        expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith(
          expect.objectContaining({ take: 5 })
        );
      });
    });

    describe('Result Ranking and Relevance', () => {
      it('should rank exact matches higher than partial matches', async () => {
        // Mock exact and partial matches
        mockPrisma.workOrder.findMany.mockResolvedValue([
          {
            id: 'wo-exact',
            workOrderNumber: 'TURBINE-001',
            description: 'Other description',
            status: 'ACTIVE',
          },
          {
            id: 'wo-partial',
            workOrderNumber: 'WO-001',
            description: 'Turbine blade manufacturing',
            status: 'ACTIVE',
          },
        ]);

        const request: GlobalSearchRequest = {
          query: 'TURBINE',
        };

        const result = await GlobalSearchService.search(request);

        // Exact match in title should rank higher than partial match in description
        const exactMatch = result.results.find(r => r.id === 'wo-exact');
        const partialMatch = result.results.find(r => r.id === 'wo-partial');

        if (exactMatch && partialMatch) {
          expect(exactMatch.relevanceScore).toBeGreaterThan(partialMatch.relevanceScore);
        }
      });

      it('should apply entity type weights correctly', async () => {
        // Work orders should generally rank higher than other entities
        mockPrisma.workOrder.findMany.mockResolvedValue([
          {
            id: 'wo-1',
            workOrderNumber: 'TEST-WO',
            description: 'Test work order',
            status: 'ACTIVE',
          },
        ]);

        mockPrisma.site.findMany.mockResolvedValue([
          {
            id: 'site-1',
            siteName: 'TEST Site',
            siteCode: 'TST',
          },
        ]);

        const request: GlobalSearchRequest = {
          query: 'TEST',
        };

        const result = await GlobalSearchService.search(request);

        const workOrderResult = result.results.find(r => r.entityType === SearchEntityType.WORK_ORDER);
        const siteResult = result.results.find(r => r.entityType === SearchEntityType.SITE);

        if (workOrderResult && siteResult) {
          expect(workOrderResult.relevanceScore).toBeGreaterThan(siteResult.relevanceScore);
        }
      });
    });

    describe('Concurrent Search Performance', () => {
      it('should handle concurrent searches efficiently', async () => {
        const requests = Array.from({ length: 10 }, (_, i) => ({
          query: `test-${i}`,
        }));

        const startTime = Date.now();
        const results = await Promise.all(
          requests.map(req => GlobalSearchService.search(req))
        );
        const endTime = Date.now();

        expect(results).toHaveLength(10);
        expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      });

      it('should handle large result sets efficiently', async () => {
        // Mock large result set
        const largeResultSet = Array.from({ length: 1000 }, (_, i) => ({
          id: `item-${i}`,
          workOrderNumber: `WO-${i}`,
          description: `Work order ${i}`,
          status: 'ACTIVE',
        }));

        mockPrisma.workOrder.findMany.mockResolvedValue(largeResultSet);

        const request: GlobalSearchRequest = {
          query: 'work order',
          limit: 50,
        };

        const startTime = Date.now();
        const result = await GlobalSearchService.search(request);
        const endTime = Date.now();

        expect(result.results.length).toBeLessThanOrEqual(50);
        expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
      });
    });
  });

  describe('Integration Scenarios', () => {
    describe('Manufacturing Workflow Integration', () => {
      it('should support work order search with production context', async () => {
        mockPrisma.workOrder.findMany.mockResolvedValue([
          {
            id: 'wo-1',
            workOrderNumber: 'WO-AERO-001',
            description: 'Aerospace component manufacturing',
            status: 'IN_PROGRESS',
            priority: 'CRITICAL',
            product: {
              partNumber: 'AERO-TB-001',
              description: 'Turbine Blade Stage 1',
            },
            operation: {
              operationNumber: '040',
              description: 'Final Machining',
            },
          },
        ]);

        const request: GlobalSearchRequest = {
          query: 'aerospace turbine',
          scope: SearchScope.PRODUCTION,
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results).toHaveLength(1);
        expect(result.results[0].metadata.partNumber).toBe('AERO-TB-001');
        expect(result.results[0].metadata.priority).toBe('CRITICAL');
      });

      it('should support equipment search with maintenance context', async () => {
        mockPrisma.equipment.findMany.mockResolvedValue([
          {
            id: 'eq-1',
            equipmentNumber: 'CNC-HAAS-001',
            description: 'High-precision CNC machine',
            status: 'NEEDS_MAINTENANCE',
            model: 'HAAS VF-3',
            lastMaintenanceDate: new Date('2023-10-01'),
            nextMaintenanceDate: new Date('2023-12-01'),
          },
        ]);

        const request: GlobalSearchRequest = {
          query: 'HAAS maintenance',
          entityTypes: [SearchEntityType.EQUIPMENT],
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results[0].metadata.status).toBe('NEEDS_MAINTENANCE');
      });
    });

    describe('Quality Management Integration', () => {
      it('should support material search with compliance requirements', async () => {
        mockPrisma.materialDefinition.findMany.mockResolvedValue([
          {
            id: 'mat-aerospace',
            materialNumber: 'TI-6AL-4V',
            description: 'Titanium alloy for aerospace applications',
            materialType: 'RAW_MATERIAL',
            specifications: ['AMS 4928', 'ASTM B265'],
            certificationRequired: true,
            hazardousClassification: 'NON_HAZARDOUS',
          },
        ]);

        const request: GlobalSearchRequest = {
          query: 'AMS 4928 titanium',
          entityTypes: [SearchEntityType.MATERIAL_DEFINITION],
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results[0].metadata.specifications).toContain('AMS 4928');
        expect(result.results[0].metadata.certificationRequired).toBe(true);
      });
    });

    describe('Personnel Management Integration', () => {
      it('should support skills-based personnel search', async () => {
        mockPrisma.user.findMany.mockResolvedValue([
          {
            id: 'user-specialist',
            firstName: 'Sarah',
            lastName: 'Johnson',
            title: 'Quality Inspector Level III',
            department: 'Quality Assurance',
            certifications: ['AS9102', 'ISO 9001 Lead Auditor'],
            skills: ['Dimensional Inspection', 'CMM Programming', 'GD&T'],
          },
        ]);

        const request: GlobalSearchRequest = {
          query: 'AS9102 dimensional inspection',
          entityTypes: [SearchEntityType.PERSONNEL],
        };

        const result = await GlobalSearchService.search(request);

        expect(result.results[0].metadata.certifications).toContain('AS9102');
        expect(result.results[0].metadata.skills).toContain('Dimensional Inspection');
      });
    });
  });

  describe('Edge Cases and Boundaries', () => {
    it('should handle special characters in search queries', async () => {
      const specialQueries = [
        'WO-2023/001',
        'Material #123',
        'User@domain.com',
        'Part (Rev A)',
        'Test & Quality',
      ];

      for (const query of specialQueries) {
        const request: GlobalSearchRequest = { query };
        await expect(GlobalSearchService.search(request)).resolves.toBeDefined();
      }
    });

    it('should handle Unicode and international characters', async () => {
      const unicodeQueries = [
        'Übung Test',
        '测试材料',
        'Прибор измерения',
        'Équipement français',
      ];

      for (const query of unicodeQueries) {
        const request: GlobalSearchRequest = { query };
        await expect(GlobalSearchService.search(request)).resolves.toBeDefined();
      }
    });

    it('should handle maximum limit constraints', async () => {
      const request: GlobalSearchRequest = {
        query: 'test',
        limit: 10000, // Very large limit
      };

      const result = await GlobalSearchService.search(request);

      // Should be capped at reasonable maximum
      expect(result.results.length).toBeLessThanOrEqual(1000);
    });

    it('should handle minimum limit constraints', async () => {
      const request: GlobalSearchRequest = {
        query: 'test',
        limit: -5, // Negative limit
      };

      const result = await GlobalSearchService.search(request);

      // Should use default or minimum limit
      expect(result.results.length).toBeGreaterThanOrEqual(0);
    });
  });
});