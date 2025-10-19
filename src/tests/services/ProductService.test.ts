import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductService } from '../../services/ProductService';
import type { PrismaClient } from '@prisma/client';

// Mock Prisma Client with actual enums preserved
vi.mock('@prisma/client', async () => {
  const actual = await vi.importActual('@prisma/client');

  const mockPrisma = {
    part: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    productSpecification: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    productConfiguration: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    configurationOption: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    productLifecycle: {
      create: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    bOMItem: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  };

  return {
    ...actual,
    PrismaClient: vi.fn(() => mockPrisma),
  };
});

describe('ProductService', () => {
  let productService: ProductService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      part: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
        groupBy: vi.fn(),
      },
      productSpecification: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      productConfiguration: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      configurationOption: {
        create: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      productLifecycle: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
      },
      bOMItem: {
        create: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
    };

    productService = new ProductService(mockPrisma as unknown as PrismaClient);
    vi.clearAllMocks();
  });

  // ========================================================================
  // PART (PRODUCT DEFINITION) CRUD OPERATIONS
  // ========================================================================

  describe('createPart', () => {
    it('should create a new part with all fields', async () => {
      const mockPart = {
        id: 'part-1',
        partNumber: 'PN-12345',
        partName: 'Test Part',
        description: 'A test part',
        partType: 'ASSEMBLY',
        productType: 'MADE_TO_STOCK',
        lifecycleState: 'PRODUCTION',
        unitOfMeasure: 'EA',
        weight: 10.5,
        weightUnit: 'kg',
        drawingNumber: 'DWG-001',
        revision: 'Rev C',
        cadModelUrl: 'https://cad.example.com/model.step',
        releaseDate: new Date('2025-01-01'),
        makeOrBuy: 'MAKE',
        leadTimeDays: 30,
        lotSizeMin: 10,
        lotSizeMultiple: 5,
        standardCost: 100.0,
        targetCost: 95.0,
        currency: 'USD',
        isConfigurable: true,
        requiresFAI: true,
        isActive: true,
        specifications: [],
        configurations: [],
        lifecycleHistory: [],
        bomItems: [],
        componentItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.part.create.mockResolvedValue(mockPart);

      const result = await productService.createPart({
        partNumber: 'PN-12345',
        partName: 'Test Part',
        description: 'A test part',
        partType: 'ASSEMBLY',
        productType: 'MADE_TO_STOCK',
        lifecycleState: 'PRODUCTION',
        unitOfMeasure: 'EA',
        weight: 10.5,
        weightUnit: 'kg',
        drawingNumber: 'DWG-001',
        revision: 'Rev C',
        cadModelUrl: 'https://cad.example.com/model.step',
        releaseDate: new Date('2025-01-01'),
        makeOrBuy: 'MAKE',
        leadTimeDays: 30,
        lotSizeMin: 10,
        lotSizeMultiple: 5,
        standardCost: 100.0,
        targetCost: 95.0,
        currency: 'USD',
        isConfigurable: true,
        requiresFAI: true,
      });

      expect(mockPrisma.part.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partNumber: 'PN-12345',
          partName: 'Test Part',
          productType: 'MADE_TO_STOCK',
          lifecycleState: 'PRODUCTION',
        }),
        include: expect.objectContaining({
          specifications: true,
          configurations: true,
          lifecycleHistory: true,
          bomItems: true,
          componentItems: true,
        }),
      });
      expect(result).toEqual(mockPart);
      expect(result.partNumber).toBe('PN-12345');
    });

    it('should create a part with minimal required fields and default values', async () => {
      const mockPart = {
        id: 'part-2',
        partNumber: 'PN-99999',
        partName: 'Minimal Part',
        partType: 'COMPONENT',
        productType: 'MADE_TO_STOCK',
        lifecycleState: 'PRODUCTION',
        unitOfMeasure: 'EA',
        isActive: true,
        specifications: [],
        configurations: [],
        lifecycleHistory: [],
        bomItems: [],
        componentItems: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.part.create.mockResolvedValue(mockPart);

      const result = await productService.createPart({
        partNumber: 'PN-99999',
        partName: 'Minimal Part',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA',
      });

      expect(mockPrisma.part.create).toHaveBeenCalled();
      expect(result.productType).toBe('MADE_TO_STOCK');
      expect(result.lifecycleState).toBe('PRODUCTION');
    });
  });

  describe('getPartById', () => {
    it('should get part by ID with all relations', async () => {
      const mockPart = {
        id: 'part-1',
        partNumber: 'PN-12345',
        partName: 'Test Part',
        partType: 'ASSEMBLY',
        productType: 'MADE_TO_STOCK',
        lifecycleState: 'PRODUCTION',
        unitOfMeasure: 'EA',
        isActive: true,
        specifications: [{ id: 'spec-1', specificationName: 'Test Spec' }],
        configurations: [{ id: 'config-1', configurationName: 'Default', options: [] }],
        lifecycleHistory: [{ id: 'lc-1', transitionDate: new Date() }],
        bomItems: [
          {
            id: 'bom-1',
            componentPart: { id: 'part-2', partNumber: 'PN-COMP' },
            processSegment: { id: 'ps-1', segmentName: 'Assembly' },
          },
        ],
        componentItems: [],
        replacementPart: null,
        workOrders: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);

      const result = await productService.getPartById('part-1');

      expect(mockPrisma.part.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: expect.objectContaining({
          specifications: true,
          configurations: expect.objectContaining({
            include: { options: true },
          }),
          lifecycleHistory: expect.objectContaining({
            orderBy: { transitionDate: 'desc' },
            take: 10,
          }),
          bomItems: expect.objectContaining({
            include: {
              componentPart: true,
              processSegment: true,
            },
          }),
        }),
      });
      expect(result).toEqual(mockPart);
      expect(result.specifications).toHaveLength(1);
      expect(result.bomItems).toHaveLength(1);
    });

    it('should get part without relations when includeRelations is false', async () => {
      const mockPart = {
        id: 'part-1',
        partNumber: 'PN-12345',
        partName: 'Test Part',
        isActive: true,
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);

      const result = await productService.getPartById('part-1', false);

      expect(mockPrisma.part.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        include: undefined,
      });
      expect(result).toEqual(mockPart);
    });

    it('should throw error when part not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(productService.getPartById('non-existent'))
        .rejects.toThrow('Part with ID non-existent not found');
    });
  });

  describe('getPartByPartNumber', () => {
    it('should get part by part number with relations', async () => {
      const mockPart = {
        id: 'part-1',
        partNumber: 'PN-12345',
        partName: 'Test Part',
        specifications: [],
        configurations: [],
        lifecycleHistory: [],
        bomItems: [],
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);

      const result = await productService.getPartByPartNumber('PN-12345');

      expect(mockPrisma.part.findUnique).toHaveBeenCalledWith({
        where: { partNumber: 'PN-12345' },
        include: expect.any(Object),
      });
      expect(result.partNumber).toBe('PN-12345');
    });

    it('should throw error when part number not found', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(productService.getPartByPartNumber('PN-INVALID'))
        .rejects.toThrow('Part with part number PN-INVALID not found');
    });
  });

  describe('getAllParts', () => {
    it('should get all parts with filters', async () => {
      const mockParts = [
        { id: 'part-1', partNumber: 'PN-001', partType: 'ASSEMBLY', productType: 'MADE_TO_STOCK', lifecycleState: 'PRODUCTION', isActive: true },
        { id: 'part-2', partNumber: 'PN-002', partType: 'ASSEMBLY', productType: 'MADE_TO_STOCK', lifecycleState: 'PRODUCTION', isActive: true },
      ];

      mockPrisma.part.findMany.mockResolvedValue(mockParts);

      const result = await productService.getAllParts({
        partType: 'ASSEMBLY',
        productType: 'MADE_TO_STOCK',
        lifecycleState: 'PRODUCTION',
        isActive: true,
      });

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
        where: {
          partType: 'ASSEMBLY',
          productType: 'MADE_TO_STOCK',
          lifecycleState: 'PRODUCTION',
          isActive: true,
        },
        include: undefined,
        orderBy: { partNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
    });

    it('should get configurable parts only', async () => {
      const mockParts = [
        { id: 'part-1', partNumber: 'PN-001', isConfigurable: true },
      ];

      mockPrisma.part.findMany.mockResolvedValue(mockParts);

      const result = await productService.getAllParts({ isConfigurable: true });

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
        where: { isConfigurable: true },
        include: undefined,
        orderBy: { partNumber: 'asc' },
      });
      expect(result).toHaveLength(1);
    });

    it('should get parts by makeOrBuy filter', async () => {
      const mockParts = [
        { id: 'part-1', partNumber: 'PN-001', makeOrBuy: 'MAKE' },
        { id: 'part-2', partNumber: 'PN-002', makeOrBuy: 'MAKE' },
      ];

      mockPrisma.part.findMany.mockResolvedValue(mockParts);

      const result = await productService.getAllParts({ makeOrBuy: 'MAKE' });

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
        where: { makeOrBuy: 'MAKE' },
        include: undefined,
        orderBy: { partNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('updatePart', () => {
    it('should update part fields', async () => {
      const mockUpdatedPart = {
        id: 'part-1',
        partNumber: 'PN-12345',
        partName: 'Updated Part Name',
        revision: 'Rev D',
        standardCost: 105.0,
        specifications: [],
        configurations: [],
        lifecycleHistory: [],
      };

      mockPrisma.part.update.mockResolvedValue(mockUpdatedPart);

      const result = await productService.updatePart('part-1', {
        partName: 'Updated Part Name',
        revision: 'Rev D',
        standardCost: 105.0,
      });

      expect(mockPrisma.part.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: {
          partName: 'Updated Part Name',
          revision: 'Rev D',
          standardCost: 105.0,
        },
        include: {
          specifications: true,
          configurations: true,
          lifecycleHistory: true,
        },
      });
      expect(result.partName).toBe('Updated Part Name');
    });
  });

  describe('deletePart', () => {
    it('should soft delete part by default', async () => {
      mockPrisma.part.update.mockResolvedValue({ id: 'part-1', isActive: false });

      const result = await productService.deletePart('part-1');

      expect(mockPrisma.part.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: { isActive: false },
      });
      expect(result.message).toBe('Part deactivated');
      expect(result.id).toBe('part-1');
    });

    it('should hard delete part when specified', async () => {
      mockPrisma.part.delete.mockResolvedValue({ id: 'part-1' });

      const result = await productService.deletePart('part-1', true);

      expect(mockPrisma.part.delete).toHaveBeenCalledWith({
        where: { id: 'part-1' },
      });
      expect(result.message).toBe('Part permanently deleted');
      expect(result.id).toBe('part-1');
    });
  });

  // ========================================================================
  // PRODUCT SPECIFICATION OPERATIONS
  // ========================================================================

  describe('addSpecification', () => {
    it('should add dimensional specification to part', async () => {
      const mockSpec = {
        id: 'spec-1',
        partId: 'part-1',
        specificationName: 'Overall Length',
        specificationType: 'DIMENSIONAL',
        nominalValue: 100.0,
        minValue: 99.9,
        maxValue: 100.1,
        unitOfMeasure: 'mm',
        testMethod: 'CMM Inspection',
        inspectionFrequency: 'First Article',
        isCritical: true,
        isRegulatory: false,
        documentReferences: ['DWG-001', 'SPEC-1234'],
        notes: 'Critical dimension for fit',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.productSpecification.create.mockResolvedValue(mockSpec);

      const result = await productService.addSpecification('part-1', {
        specificationName: 'Overall Length',
        specificationType: 'DIMENSIONAL',
        nominalValue: 100.0,
        minValue: 99.9,
        maxValue: 100.1,
        unitOfMeasure: 'mm',
        testMethod: 'CMM Inspection',
        inspectionFrequency: 'First Article',
        isCritical: true,
        isRegulatory: false,
        documentReferences: ['DWG-001', 'SPEC-1234'],
        notes: 'Critical dimension for fit',
      });

      expect(mockPrisma.productSpecification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partId: 'part-1',
          specificationName: 'Overall Length',
          specificationType: 'DIMENSIONAL',
          isCritical: true,
          documentReferences: ['DWG-001', 'SPEC-1234'],
        }),
      });
      expect(result).toEqual(mockSpec);
    });

    it('should add material specification with regulatory flag', async () => {
      const mockSpec = {
        id: 'spec-2',
        partId: 'part-1',
        specificationName: 'Material Compliance',
        specificationType: 'MATERIAL',
        specificationValue: 'RoHS Compliant',
        isCritical: false,
        isRegulatory: true,
        documentReferences: ['CERT-RoHS-2025'],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.productSpecification.create.mockResolvedValue(mockSpec);

      const result = await productService.addSpecification('part-1', {
        specificationName: 'Material Compliance',
        specificationType: 'MATERIAL',
        specificationValue: 'RoHS Compliant',
        isRegulatory: true,
        documentReferences: ['CERT-RoHS-2025'],
      });

      expect(result.isRegulatory).toBe(true);
      expect(result.specificationType).toBe('MATERIAL');
    });

    it('should handle specification with empty document references', async () => {
      const mockSpec = {
        id: 'spec-3',
        partId: 'part-1',
        specificationName: 'Test Spec',
        specificationType: 'PERFORMANCE',
        documentReferences: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.productSpecification.create.mockResolvedValue(mockSpec);

      const result = await productService.addSpecification('part-1', {
        specificationName: 'Test Spec',
        specificationType: 'PERFORMANCE',
      });

      expect(mockPrisma.productSpecification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          documentReferences: [],
        }),
      });
      expect(result.documentReferences).toEqual([]);
    });
  });

  describe('getPartSpecifications', () => {
    it('should get all specifications for a part ordered by criticality', async () => {
      const mockSpecs = [
        {
          id: 'spec-1',
          partId: 'part-1',
          specificationName: 'Critical Dimension',
          specificationType: 'DIMENSIONAL',
          isCritical: true,
        },
        {
          id: 'spec-2',
          partId: 'part-1',
          specificationName: 'Material Spec',
          specificationType: 'MATERIAL',
          isCritical: false,
        },
      ];

      mockPrisma.productSpecification.findMany.mockResolvedValue(mockSpecs);

      const result = await productService.getPartSpecifications('part-1');

      expect(mockPrisma.productSpecification.findMany).toHaveBeenCalledWith({
        where: { partId: 'part-1' },
        orderBy: [
          { isCritical: 'desc' },
          { specificationType: 'asc' },
          { specificationName: 'asc' },
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0].isCritical).toBe(true);
    });
  });

  describe('updateSpecification', () => {
    it('should update specification values', async () => {
      const mockUpdatedSpec = {
        id: 'spec-1',
        specificationName: 'Updated Spec Name',
        nominalValue: 105.0,
        maxValue: 105.5,
        isCritical: true,
      };

      mockPrisma.productSpecification.update.mockResolvedValue(mockUpdatedSpec);

      const result = await productService.updateSpecification('spec-1', {
        specificationName: 'Updated Spec Name',
        nominalValue: 105.0,
        maxValue: 105.5,
        isCritical: true,
      });

      expect(mockPrisma.productSpecification.update).toHaveBeenCalledWith({
        where: { id: 'spec-1' },
        data: {
          specificationName: 'Updated Spec Name',
          nominalValue: 105.0,
          maxValue: 105.5,
          isCritical: true,
        },
      });
      expect(result).toEqual(mockUpdatedSpec);
    });
  });

  describe('deleteSpecification', () => {
    it('should delete specification', async () => {
      mockPrisma.productSpecification.delete.mockResolvedValue({ id: 'spec-1' });

      const result = await productService.deleteSpecification('spec-1');

      expect(mockPrisma.productSpecification.delete).toHaveBeenCalledWith({
        where: { id: 'spec-1' },
      });
      expect(result.message).toBe('Specification deleted');
      expect(result.id).toBe('spec-1');
    });
  });

  // ========================================================================
  // PRODUCT CONFIGURATION OPERATIONS
  // ========================================================================

  describe('addConfiguration', () => {
    it('should add configuration with all options', async () => {
      const mockConfig = {
        id: 'config-1',
        partId: 'part-1',
        configurationName: 'Premium Configuration',
        configurationType: 'FEATURE',
        description: 'Premium features package',
        configurationCode: 'PREM',
        attributes: { feature1: 'enabled', feature2: 'enabled' },
        priceModifier: 500.0,
        costModifier: 300.0,
        leadTimeDelta: 5,
        isAvailable: true,
        effectiveDate: new Date('2025-01-01'),
        isDefault: false,
        marketingName: 'Premium Edition',
        imageUrl: 'https://example.com/premium.jpg',
        isActive: true,
        options: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.productConfiguration.create.mockResolvedValue(mockConfig);

      const result = await productService.addConfiguration('part-1', {
        configurationName: 'Premium Configuration',
        configurationType: 'FEATURE',
        description: 'Premium features package',
        configurationCode: 'PREM',
        attributes: { feature1: 'enabled', feature2: 'enabled' },
        priceModifier: 500.0,
        costModifier: 300.0,
        leadTimeDelta: 5,
        isAvailable: true,
        effectiveDate: new Date('2025-01-01'),
        isDefault: false,
        marketingName: 'Premium Edition',
        imageUrl: 'https://example.com/premium.jpg',
      });

      expect(mockPrisma.productConfiguration.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partId: 'part-1',
          configurationName: 'Premium Configuration',
          configurationType: 'FEATURE',
          priceModifier: 500.0,
          costModifier: 300.0,
        }),
        include: { options: true },
      });
      expect(result).toEqual(mockConfig);
    });

    it('should add color configuration', async () => {
      const mockConfig = {
        id: 'config-2',
        partId: 'part-1',
        configurationName: 'Red',
        configurationType: 'COLOR',
        configurationCode: 'RED',
        priceModifier: 0,
        isDefault: true,
        isActive: true,
        options: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.productConfiguration.create.mockResolvedValue(mockConfig);

      const result = await productService.addConfiguration('part-1', {
        configurationName: 'Red',
        configurationType: 'COLOR',
        configurationCode: 'RED',
        isDefault: true,
      });

      expect(result.configurationType).toBe('COLOR');
      expect(result.isDefault).toBe(true);
    });
  });

  describe('getPartConfigurations', () => {
    it('should get all configurations for a part ordered by default first', async () => {
      const mockConfigs = [
        {
          id: 'config-1',
          partId: 'part-1',
          configurationName: 'Default',
          isDefault: true,
          options: [],
        },
        {
          id: 'config-2',
          partId: 'part-1',
          configurationName: 'Premium',
          isDefault: false,
          options: [],
        },
      ];

      mockPrisma.productConfiguration.findMany.mockResolvedValue(mockConfigs);

      const result = await productService.getPartConfigurations('part-1');

      expect(mockPrisma.productConfiguration.findMany).toHaveBeenCalledWith({
        where: { partId: 'part-1' },
        include: { options: true },
        orderBy: [
          { isDefault: 'desc' },
          { configurationName: 'asc' },
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0].isDefault).toBe(true);
    });
  });

  describe('updateConfiguration', () => {
    it('should update configuration', async () => {
      const mockUpdatedConfig = {
        id: 'config-1',
        configurationName: 'Updated Config',
        priceModifier: 600.0,
        isAvailable: false,
        options: [],
      };

      mockPrisma.productConfiguration.update.mockResolvedValue(mockUpdatedConfig);

      const result = await productService.updateConfiguration('config-1', {
        configurationName: 'Updated Config',
        priceModifier: 600.0,
        isAvailable: false,
      });

      expect(mockPrisma.productConfiguration.update).toHaveBeenCalledWith({
        where: { id: 'config-1' },
        data: {
          configurationName: 'Updated Config',
          priceModifier: 600.0,
          isAvailable: false,
        },
        include: { options: true },
      });
      expect(result).toEqual(mockUpdatedConfig);
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete configuration', async () => {
      mockPrisma.productConfiguration.delete.mockResolvedValue({ id: 'config-1' });

      const result = await productService.deleteConfiguration('config-1');

      expect(mockPrisma.productConfiguration.delete).toHaveBeenCalledWith({
        where: { id: 'config-1' },
      });
      expect(result.message).toBe('Configuration deleted');
      expect(result.id).toBe('config-1');
    });
  });

  // ========================================================================
  // CONFIGURATION OPTION OPERATIONS
  // ========================================================================

  describe('addConfigurationOption', () => {
    it('should add option to configuration with all fields', async () => {
      const mockOption = {
        id: 'option-1',
        configurationId: 'config-1',
        optionName: 'Extended Warranty',
        optionCode: 'EXT-WARR',
        description: '3-year extended warranty',
        optionCategory: 'WARRANTY',
        optionValue: '3_YEARS',
        isRequired: false,
        isDefault: true,
        addedPartIds: ['part-2', 'part-3'],
        removedPartIds: [],
        priceModifier: 199.0,
        costModifier: 50.0,
        displayOrder: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.configurationOption.create.mockResolvedValue(mockOption);

      const result = await productService.addConfigurationOption('config-1', {
        optionName: 'Extended Warranty',
        optionCode: 'EXT-WARR',
        description: '3-year extended warranty',
        optionCategory: 'WARRANTY',
        optionValue: '3_YEARS',
        isRequired: false,
        isDefault: true,
        addedPartIds: ['part-2', 'part-3'],
        removedPartIds: [],
        priceModifier: 199.0,
        costModifier: 50.0,
        displayOrder: 1,
      });

      expect(mockPrisma.configurationOption.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          configurationId: 'config-1',
          optionName: 'Extended Warranty',
          addedPartIds: ['part-2', 'part-3'],
          removedPartIds: [],
        }),
      });
      expect(result).toEqual(mockOption);
    });

    it('should add required option', async () => {
      const mockOption = {
        id: 'option-2',
        configurationId: 'config-1',
        optionName: 'Safety Package',
        isRequired: true,
        isDefault: false,
        addedPartIds: [],
        removedPartIds: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.configurationOption.create.mockResolvedValue(mockOption);

      const result = await productService.addConfigurationOption('config-1', {
        optionName: 'Safety Package',
        isRequired: true,
      });

      expect(result.isRequired).toBe(true);
    });
  });

  describe('updateConfigurationOption', () => {
    it('should update option', async () => {
      const mockUpdatedOption = {
        id: 'option-1',
        optionName: 'Updated Option',
        priceModifier: 250.0,
        isDefault: false,
      };

      mockPrisma.configurationOption.update.mockResolvedValue(mockUpdatedOption);

      const result = await productService.updateConfigurationOption('option-1', {
        optionName: 'Updated Option',
        priceModifier: 250.0,
        isDefault: false,
      });

      expect(mockPrisma.configurationOption.update).toHaveBeenCalledWith({
        where: { id: 'option-1' },
        data: {
          optionName: 'Updated Option',
          priceModifier: 250.0,
          isDefault: false,
        },
      });
      expect(result).toEqual(mockUpdatedOption);
    });
  });

  describe('deleteConfigurationOption', () => {
    it('should delete option', async () => {
      mockPrisma.configurationOption.delete.mockResolvedValue({ id: 'option-1' });

      const result = await productService.deleteConfigurationOption('option-1');

      expect(mockPrisma.configurationOption.delete).toHaveBeenCalledWith({
        where: { id: 'option-1' },
      });
      expect(result.message).toBe('Configuration option deleted');
      expect(result.id).toBe('option-1');
    });
  });

  // ========================================================================
  // PRODUCT LIFECYCLE OPERATIONS
  // ========================================================================

  describe('transitionLifecycleState', () => {
    it('should transition part lifecycle state with full details', async () => {
      const mockPart = {
        id: 'part-1',
        lifecycleState: 'DEVELOPMENT',
      };

      const mockLifecycleRecord = {
        id: 'lc-1',
        partId: 'part-1',
        previousState: 'DEVELOPMENT',
        newState: 'PRODUCTION',
        transitionDate: new Date(),
        reason: 'Completed validation testing',
        ecoNumber: 'ECO-2025-001',
        approvedBy: 'engineer@example.com',
        approvedAt: new Date(),
        notificationsSent: true,
        impactAssessment: 'No impact to existing production',
        notes: 'All tests passed',
        metadata: { testResults: 'PASS' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.productLifecycle.create.mockResolvedValue(mockLifecycleRecord);
      mockPrisma.part.update.mockResolvedValue({ ...mockPart, lifecycleState: 'PRODUCTION' });

      const result = await productService.transitionLifecycleState('part-1', {
        newState: 'PRODUCTION',
        reason: 'Completed validation testing',
        ecoNumber: 'ECO-2025-001',
        approvedBy: 'engineer@example.com',
        approvedAt: new Date(),
        notificationsSent: true,
        impactAssessment: 'No impact to existing production',
        notes: 'All tests passed',
        metadata: { testResults: 'PASS' },
      });

      expect(mockPrisma.part.findUnique).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        select: { lifecycleState: true },
      });

      expect(mockPrisma.productLifecycle.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          partId: 'part-1',
          previousState: 'DEVELOPMENT',
          newState: 'PRODUCTION',
          ecoNumber: 'ECO-2025-001',
          approvedBy: 'engineer@example.com',
        }),
      });

      expect(mockPrisma.part.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: expect.objectContaining({
          lifecycleState: 'PRODUCTION',
        }),
      });

      expect(result).toEqual(mockLifecycleRecord);
    });

    it('should set obsolete date when transitioning to OBSOLETE', async () => {
      const mockPart = {
        id: 'part-1',
        lifecycleState: 'PHASE_OUT',
      };

      const mockLifecycleRecord = {
        id: 'lc-2',
        partId: 'part-1',
        previousState: 'PHASE_OUT',
        newState: 'OBSOLETE',
        transitionDate: new Date(),
        reason: 'End of product life',
        notificationsSent: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.part.findUnique.mockResolvedValue(mockPart);
      mockPrisma.productLifecycle.create.mockResolvedValue(mockLifecycleRecord);
      mockPrisma.part.update.mockResolvedValue({
        ...mockPart,
        lifecycleState: 'OBSOLETE',
        obsoleteDate: new Date(),
      });

      const result = await productService.transitionLifecycleState('part-1', {
        newState: 'OBSOLETE',
        reason: 'End of product life',
      });

      expect(mockPrisma.part.update).toHaveBeenCalledWith({
        where: { id: 'part-1' },
        data: expect.objectContaining({
          lifecycleState: 'OBSOLETE',
          obsoleteDate: expect.any(Date),
        }),
      });
    });

    it('should throw error if part not found for lifecycle transition', async () => {
      mockPrisma.part.findUnique.mockResolvedValue(null);

      await expect(
        productService.transitionLifecycleState('non-existent', {
          newState: 'PRODUCTION',
        })
      ).rejects.toThrow('Part with ID non-existent not found');
    });
  });

  describe('getPartLifecycleHistory', () => {
    it('should get lifecycle history ordered by transition date descending', async () => {
      const mockHistory = [
        {
          id: 'lc-2',
          partId: 'part-1',
          previousState: 'DEVELOPMENT',
          newState: 'PRODUCTION',
          transitionDate: new Date('2025-02-01'),
        },
        {
          id: 'lc-1',
          partId: 'part-1',
          previousState: 'CONCEPT',
          newState: 'DEVELOPMENT',
          transitionDate: new Date('2025-01-01'),
        },
      ];

      mockPrisma.productLifecycle.findMany.mockResolvedValue(mockHistory);

      const result = await productService.getPartLifecycleHistory('part-1');

      expect(mockPrisma.productLifecycle.findMany).toHaveBeenCalledWith({
        where: { partId: 'part-1' },
        orderBy: { transitionDate: 'desc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].newState).toBe('PRODUCTION');
    });
  });

  // ========================================================================
  // BOM OPERATIONS
  // ========================================================================

  describe('addBOMItem', () => {
    it('should add BOM item with all fields', async () => {
      const mockBOMItem = {
        id: 'bom-1',
        parentPartId: 'part-1',
        componentPartId: 'part-2',
        quantity: 4.0,
        unitOfMeasure: 'EA',
        scrapFactor: 0.05,
        sequence: 10,
        findNumber: '1',
        referenceDesignator: 'R1, R2, R3, R4',
        processSegmentId: 'ps-1',
        operationNumber: 100,
        effectiveDate: new Date('2025-01-01'),
        ecoNumber: 'ECO-2025-001',
        isOptional: false,
        isCritical: true,
        notes: 'Critical component - verify stock before production',
        isActive: true,
        parentPart: { id: 'part-1', partNumber: 'PN-PARENT' },
        componentPart: { id: 'part-2', partNumber: 'PN-COMP' },
        processSegment: { id: 'ps-1', segmentName: 'PCB Assembly' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bOMItem.create.mockResolvedValue(mockBOMItem);

      const result = await productService.addBOMItem({
        parentPartId: 'part-1',
        componentPartId: 'part-2',
        quantity: 4.0,
        unitOfMeasure: 'EA',
        scrapFactor: 0.05,
        sequence: 10,
        findNumber: '1',
        referenceDesignator: 'R1, R2, R3, R4',
        processSegmentId: 'ps-1',
        operationNumber: 100,
        effectiveDate: new Date('2025-01-01'),
        ecoNumber: 'ECO-2025-001',
        isOptional: false,
        isCritical: true,
        notes: 'Critical component - verify stock before production',
      });

      expect(mockPrisma.bOMItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentPartId: 'part-1',
          componentPartId: 'part-2',
          quantity: 4.0,
          scrapFactor: 0.05,
          processSegmentId: 'ps-1',
          isCritical: true,
        }),
        include: {
          parentPart: true,
          componentPart: true,
          processSegment: true,
        },
      });
      expect(result).toEqual(mockBOMItem);
    });

    it('should use default scrap factor of 0 when not provided', async () => {
      const mockBOMItem = {
        id: 'bom-2',
        parentPartId: 'part-1',
        componentPartId: 'part-2',
        quantity: 1.0,
        unitOfMeasure: 'EA',
        scrapFactor: 0,
        isActive: true,
        parentPart: { id: 'part-1' },
        componentPart: { id: 'part-2' },
        processSegment: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.bOMItem.create.mockResolvedValue(mockBOMItem);

      const result = await productService.addBOMItem({
        parentPartId: 'part-1',
        componentPartId: 'part-2',
        quantity: 1.0,
        unitOfMeasure: 'EA',
      });

      expect(mockPrisma.bOMItem.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          scrapFactor: 0,
        }),
        include: expect.any(Object),
      });
      expect(result.scrapFactor).toBe(0);
    });
  });

  describe('getPartBOM', () => {
    it('should get BOM with process segments ordered by sequence', async () => {
      const mockBOMItems = [
        {
          id: 'bom-1',
          parentPartId: 'part-1',
          componentPartId: 'part-2',
          quantity: 2.0,
          sequence: 10,
          findNumber: '1',
          isActive: true,
          componentPart: { id: 'part-2', partNumber: 'PN-COMP-1' },
          processSegment: { id: 'ps-1', segmentName: 'Assembly' },
        },
        {
          id: 'bom-2',
          parentPartId: 'part-1',
          componentPartId: 'part-3',
          quantity: 1.0,
          sequence: 20,
          findNumber: '2',
          isActive: true,
          componentPart: { id: 'part-3', partNumber: 'PN-COMP-2' },
          processSegment: { id: 'ps-2', segmentName: 'Testing' },
        },
      ];

      mockPrisma.bOMItem.findMany.mockResolvedValue(mockBOMItems);

      const result = await productService.getPartBOM('part-1');

      expect(mockPrisma.bOMItem.findMany).toHaveBeenCalledWith({
        where: { parentPartId: 'part-1', isActive: true },
        include: {
          componentPart: true,
          processSegment: true,
        },
        orderBy: [
          { sequence: 'asc' },
          { findNumber: 'asc' },
        ],
      });
      expect(result).toHaveLength(2);
      expect(result[0].sequence).toBe(10);
    });

    it('should get BOM without process segments when flag is false', async () => {
      const mockBOMItems = [
        {
          id: 'bom-1',
          parentPartId: 'part-1',
          componentPartId: 'part-2',
          quantity: 2.0,
          isActive: true,
          componentPart: { id: 'part-2', partNumber: 'PN-COMP-1' },
          processSegment: false,
        },
      ];

      mockPrisma.bOMItem.findMany.mockResolvedValue(mockBOMItems);

      const result = await productService.getPartBOM('part-1', false);

      expect(mockPrisma.bOMItem.findMany).toHaveBeenCalledWith({
        where: { parentPartId: 'part-1', isActive: true },
        include: {
          componentPart: true,
          processSegment: false,
        },
        orderBy: expect.any(Array),
      });
      expect(result).toHaveLength(1);
    });
  });

  describe('getPartWhereUsed', () => {
    it('should get where-used list for a component part', async () => {
      const mockWhereUsed = [
        {
          id: 'bom-1',
          parentPartId: 'part-1',
          componentPartId: 'part-comp',
          quantity: 2.0,
          isActive: true,
          parentPart: {
            id: 'part-1',
            partNumber: 'PN-ASSEMBLY-1',
            partName: 'Assembly 1',
          },
          processSegment: { id: 'ps-1', segmentName: 'Assembly' },
        },
        {
          id: 'bom-2',
          parentPartId: 'part-2',
          componentPartId: 'part-comp',
          quantity: 4.0,
          isActive: true,
          parentPart: {
            id: 'part-2',
            partNumber: 'PN-ASSEMBLY-2',
            partName: 'Assembly 2',
          },
          processSegment: { id: 'ps-2', segmentName: 'PCB Assembly' },
        },
      ];

      mockPrisma.bOMItem.findMany.mockResolvedValue(mockWhereUsed);

      const result = await productService.getPartWhereUsed('part-comp');

      expect(mockPrisma.bOMItem.findMany).toHaveBeenCalledWith({
        where: { componentPartId: 'part-comp', isActive: true },
        include: {
          parentPart: true,
          processSegment: true,
        },
        orderBy: { parentPart: { partNumber: 'asc' } },
      });
      expect(result).toHaveLength(2);
      expect(result[0].parentPart.partNumber).toBe('PN-ASSEMBLY-1');
    });
  });

  describe('updateBOMItem', () => {
    it('should update BOM item', async () => {
      const mockUpdatedBOM = {
        id: 'bom-1',
        quantity: 5.0,
        scrapFactor: 0.1,
        sequence: 15,
        isCritical: true,
        parentPart: { id: 'part-1' },
        componentPart: { id: 'part-2' },
        processSegment: { id: 'ps-1' },
      };

      mockPrisma.bOMItem.update.mockResolvedValue(mockUpdatedBOM);

      const result = await productService.updateBOMItem('bom-1', {
        quantity: 5.0,
        scrapFactor: 0.1,
        sequence: 15,
        isCritical: true,
      });

      expect(mockPrisma.bOMItem.update).toHaveBeenCalledWith({
        where: { id: 'bom-1' },
        data: {
          quantity: 5.0,
          scrapFactor: 0.1,
          sequence: 15,
          isCritical: true,
        },
        include: {
          parentPart: true,
          componentPart: true,
          processSegment: true,
        },
      });
      expect(result).toEqual(mockUpdatedBOM);
    });
  });

  describe('deleteBOMItem', () => {
    it('should soft delete BOM item by default', async () => {
      mockPrisma.bOMItem.update.mockResolvedValue({ id: 'bom-1', isActive: false });

      const result = await productService.deleteBOMItem('bom-1');

      expect(mockPrisma.bOMItem.update).toHaveBeenCalledWith({
        where: { id: 'bom-1' },
        data: { isActive: false },
      });
      expect(result.message).toBe('BOM item deactivated');
      expect(result.id).toBe('bom-1');
    });

    it('should hard delete BOM item when specified', async () => {
      mockPrisma.bOMItem.delete.mockResolvedValue({ id: 'bom-1' });

      const result = await productService.deleteBOMItem('bom-1', true);

      expect(mockPrisma.bOMItem.delete).toHaveBeenCalledWith({
        where: { id: 'bom-1' },
      });
      expect(result.message).toBe('BOM item permanently deleted');
      expect(result.id).toBe('bom-1');
    });
  });

  // ========================================================================
  // STATISTICS AND REPORTING
  // ========================================================================

  describe('getStatistics', () => {
    it('should calculate comprehensive product definition statistics', async () => {
      mockPrisma.part.count
        .mockResolvedValueOnce(100) // total parts
        .mockResolvedValueOnce(85)  // active parts
        .mockResolvedValueOnce(15); // inactive parts

      mockPrisma.part.groupBy
        .mockResolvedValueOnce([
          { productType: 'MADE_TO_STOCK', _count: 50 },
          { productType: 'MADE_TO_ORDER', _count: 30 },
          { productType: 'ENGINEER_TO_ORDER', _count: 20 },
        ])
        .mockResolvedValueOnce([
          { lifecycleState: 'PRODUCTION', _count: 60 },
          { lifecycleState: 'DEVELOPMENT', _count: 25 },
          { lifecycleState: 'PHASE_OUT', _count: 10 },
          { lifecycleState: 'OBSOLETE', _count: 5 },
        ]);

      mockPrisma.productSpecification.count
        .mockResolvedValueOnce(250) // total specs
        .mockResolvedValueOnce(45); // critical specs

      mockPrisma.productConfiguration.count.mockResolvedValue(120);
      mockPrisma.configurationOption.count.mockResolvedValue(380);
      mockPrisma.bOMItem.count.mockResolvedValue(500);
      mockPrisma.productLifecycle.count.mockResolvedValue(175);

      const result = await productService.getStatistics();

      expect(result).toEqual({
        parts: {
          total: 100,
          active: 85,
          inactive: 15,
          byType: {
            MADE_TO_STOCK: 50,
            MADE_TO_ORDER: 30,
            ENGINEER_TO_ORDER: 20,
          },
          byLifecycleState: {
            PRODUCTION: 60,
            DEVELOPMENT: 25,
            PHASE_OUT: 10,
            OBSOLETE: 5,
          },
        },
        specifications: {
          total: 250,
          critical: 45,
        },
        configurations: {
          total: 120,
          options: 380,
        },
        bom: {
          totalItems: 500,
        },
        lifecycle: {
          totalTransitions: 175,
        },
      });
    });
  });

  describe('getConfigurableParts', () => {
    it('should get all configurable parts with configurations and options', async () => {
      const mockParts = [
        {
          id: 'part-1',
          partNumber: 'PN-CONFIG-1',
          partName: 'Configurable Product 1',
          isConfigurable: true,
          isActive: true,
          configurations: [
            {
              id: 'config-1',
              configurationName: 'Color',
              isActive: true,
              options: [
                { id: 'opt-1', optionName: 'Red' },
                { id: 'opt-2', optionName: 'Blue' },
              ],
            },
          ],
        },
        {
          id: 'part-2',
          partNumber: 'PN-CONFIG-2',
          partName: 'Configurable Product 2',
          isConfigurable: true,
          isActive: true,
          configurations: [
            {
              id: 'config-2',
              configurationName: 'Size',
              isActive: true,
              options: [
                { id: 'opt-3', optionName: 'Small' },
                { id: 'opt-4', optionName: 'Large' },
              ],
            },
          ],
        },
      ];

      mockPrisma.part.findMany.mockResolvedValue(mockParts);

      const result = await productService.getConfigurableParts();

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
        where: {
          isConfigurable: true,
          isActive: true,
        },
        include: {
          configurations: {
            where: { isActive: true },
            include: {
              options: true,
            },
          },
        },
        orderBy: { partNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].configurations).toHaveLength(1);
      expect(result[0].configurations[0].options).toHaveLength(2);
    });
  });

  describe('getPartsByLifecycleState', () => {
    it('should get parts by lifecycle state', async () => {
      const mockParts = [
        {
          id: 'part-1',
          partNumber: 'PN-001',
          partName: 'Production Part 1',
          lifecycleState: 'PRODUCTION',
          isActive: true,
        },
        {
          id: 'part-2',
          partNumber: 'PN-002',
          partName: 'Production Part 2',
          lifecycleState: 'PRODUCTION',
          isActive: true,
        },
      ];

      mockPrisma.part.findMany.mockResolvedValue(mockParts);

      const result = await productService.getPartsByLifecycleState('PRODUCTION');

      expect(mockPrisma.part.findMany).toHaveBeenCalledWith({
        where: {
          lifecycleState: 'PRODUCTION',
          isActive: true,
        },
        orderBy: { partNumber: 'asc' },
      });
      expect(result).toHaveLength(2);
      expect(result[0].lifecycleState).toBe('PRODUCTION');
    });
  });

  // ========================================================================
  // INTEGRATION AND EDGE CASES
  // ========================================================================

  describe('Integration Tests', () => {
    it('should create part with specifications and configurations together', async () => {
      const mockPart = {
        id: 'part-1',
        partNumber: 'PN-INTEGRATED',
        partName: 'Integrated Test Part',
        isActive: true,
        specifications: [],
        configurations: [],
        lifecycleHistory: [],
        bomItems: [],
        componentItems: [],
      };

      const mockSpec = {
        id: 'spec-1',
        partId: 'part-1',
        specificationName: 'Dimension',
        specificationType: 'DIMENSIONAL',
      };

      const mockConfig = {
        id: 'config-1',
        partId: 'part-1',
        configurationName: 'Color',
        configurationType: 'COLOR',
        options: [],
      };

      mockPrisma.part.create.mockResolvedValue(mockPart);
      mockPrisma.productSpecification.create.mockResolvedValue(mockSpec);
      mockPrisma.productConfiguration.create.mockResolvedValue(mockConfig);

      const part = await productService.createPart({
        partNumber: 'PN-INTEGRATED',
        partName: 'Integrated Test Part',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA',
      });

      const spec = await productService.addSpecification(part.id, {
        specificationName: 'Dimension',
        specificationType: 'DIMENSIONAL',
      });

      const config = await productService.addConfiguration(part.id, {
        configurationName: 'Color',
        configurationType: 'COLOR',
      });

      expect(part.id).toBe('part-1');
      expect(spec.partId).toBe('part-1');
      expect(config.partId).toBe('part-1');
    });

    it('should handle multi-level BOM structure', async () => {
      const mockBOMLevel1 = {
        id: 'bom-1',
        parentPartId: 'part-assembly',
        componentPartId: 'part-subassembly',
        quantity: 1.0,
        isActive: true,
        componentPart: { id: 'part-subassembly', partNumber: 'PN-SUB' },
        processSegment: { id: 'ps-1', segmentName: 'Assembly' },
      };

      const mockBOMLevel2 = {
        id: 'bom-2',
        parentPartId: 'part-subassembly',
        componentPartId: 'part-component',
        quantity: 2.0,
        isActive: true,
        componentPart: { id: 'part-component', partNumber: 'PN-COMP' },
        processSegment: { id: 'ps-2', segmentName: 'Sub-assembly' },
      };

      mockPrisma.bOMItem.create
        .mockResolvedValueOnce(mockBOMLevel1)
        .mockResolvedValueOnce(mockBOMLevel2);

      mockPrisma.bOMItem.findMany
        .mockResolvedValueOnce([mockBOMLevel1])
        .mockResolvedValueOnce([mockBOMLevel2]);

      // Level 1: Assembly contains Subassembly
      const bom1 = await productService.addBOMItem({
        parentPartId: 'part-assembly',
        componentPartId: 'part-subassembly',
        quantity: 1.0,
        unitOfMeasure: 'EA',
      });

      // Level 2: Subassembly contains Component
      const bom2 = await productService.addBOMItem({
        parentPartId: 'part-subassembly',
        componentPartId: 'part-component',
        quantity: 2.0,
        unitOfMeasure: 'EA',
      });

      // Get top-level BOM
      const topBOM = await productService.getPartBOM('part-assembly');

      // Get second-level BOM
      const subBOM = await productService.getPartBOM('part-subassembly');

      expect(topBOM).toHaveLength(1);
      expect(subBOM).toHaveLength(1);
      expect(bom1.componentPartId).toBe('part-subassembly');
      expect(bom2.componentPartId).toBe('part-component');
    });
  });

  describe('Edge Cases', () => {
    it('should handle part with no BOM items', async () => {
      mockPrisma.bOMItem.findMany.mockResolvedValue([]);

      const result = await productService.getPartBOM('part-no-bom');

      expect(result).toEqual([]);
    });

    it('should handle part with no where-used', async () => {
      mockPrisma.bOMItem.findMany.mockResolvedValue([]);

      const result = await productService.getPartWhereUsed('part-unused');

      expect(result).toEqual([]);
    });

    it('should handle part with no lifecycle history', async () => {
      mockPrisma.productLifecycle.findMany.mockResolvedValue([]);

      const result = await productService.getPartLifecycleHistory('part-new');

      expect(result).toEqual([]);
    });

    it('should handle replacement part chain', async () => {
      const mockOriginalPart = {
        id: 'part-old',
        partNumber: 'PN-OLD',
        replacementPartId: 'part-new',
        lifecycleState: 'OBSOLETE',
      };

      const mockReplacementPart = {
        id: 'part-new',
        partNumber: 'PN-NEW',
        replacementPartId: null,
        lifecycleState: 'PRODUCTION',
      };

      mockPrisma.part.findUnique
        .mockResolvedValueOnce(mockOriginalPart)
        .mockResolvedValueOnce(mockReplacementPart);

      const original = await productService.getPartById('part-old', false);
      const replacement = await productService.getPartById('part-new', false);

      expect(original.replacementPartId).toBe('part-new');
      expect(replacement.replacementPartId).toBeNull();
    });
  });
});
