import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MaterialService } from '../../services/MaterialService';
import { ProductService } from '../../services/ProductService';
import { OperationService } from '../../services/OperationService';

const prisma = new PrismaClient();

describe('Unit of Measure Integration Tests', () => {
  let materialService: MaterialService;
  let productService: ProductService;
  let operationService: OperationService;

  // Test data IDs
  let testUomEaId: string;
  let testUomKgId: string;
  let testMaterialClassId: string;
  let testMaterialDefinitionId: string;
  let testMaterialLotId: string;
  let testOperationId: string;

  beforeAll(async () => {
    // Initialize services
    materialService = new MaterialService(prisma);
    productService = new ProductService(prisma);
    operationService = new OperationService(prisma);

    // Create test UOM data
    const uomEa = await prisma.unitOfMeasure.create({
      data: {
        code: 'EA',
        name: 'Each',
        unitType: 'QUANTITY',
        systemOfMeasure: 'METRIC',
        isBaseUnit: true,
        isActive: true
      }
    });
    testUomEaId = uomEa.id;

    const uomKg = await prisma.unitOfMeasure.create({
      data: {
        code: 'KG',
        name: 'Kilogram',
        unitType: 'MASS',
        systemOfMeasure: 'METRIC',
        isBaseUnit: true,
        isActive: true
      }
    });
    testUomKgId = uomKg.id;
  });

  afterAll(async () => {
    // Cleanup test data in correct order to avoid FK violations
    await prisma.$transaction([
      prisma.materialStateHistory.deleteMany(),
      prisma.materialLotGenealogy.deleteMany(),
      prisma.materialSublot.deleteMany(),
      prisma.materialLot.deleteMany(),
      prisma.materialDefinition.deleteMany(),
      prisma.materialClass.deleteMany(),
      prisma.operationParameter.deleteMany(),
      prisma.materialOperationSpecification.deleteMany(),
      prisma.operation.deleteMany(),
      prisma.bOMItem.deleteMany(),
      // Delete work orders first to avoid FK constraint on parts
      prisma.workOrder.deleteMany(),
      prisma.part.deleteMany(),
      prisma.unitOfMeasure.deleteMany()
    ]);
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test material class
    const materialClass = await prisma.materialClass.create({
      data: {
        className: 'TEST_METALS',
        description: 'Test metal materials',
        level: 1,
        isActive: true
      }
    });
    testMaterialClassId = materialClass.id;

    // Create test material definition
    const materialDefinition = await prisma.materialDefinition.create({
      data: {
        materialNumber: 'MAT-TEST-001',
        materialName: 'Test Aluminum',
        description: 'Test aluminum alloy',
        materialClassId: testMaterialClassId,
        baseUnitOfMeasure: 'KG',
        baseUnitOfMeasureId: testUomKgId,
        alternateUnitOfMeasure: 'LB',
        isActive: true
      }
    });
    testMaterialDefinitionId = materialDefinition.id;

    // Create test material lot
    const materialLot = await prisma.materialLot.create({
      data: {
        lotNumber: 'LOT-TEST-001',
        materialId: testMaterialDefinitionId,
        supplierId: 'test-supplier',
        receivedQuantity: 100.0,
        currentQuantity: 100.0,
        unitOfMeasure: 'KG',
        unitOfMeasureId: testUomKgId,
        status: 'AVAILABLE',
        state: 'RAW_MATERIAL'
      }
    });
    testMaterialLotId = materialLot.id;

    // Create test operation
    const operation = await prisma.operation.create({
      data: {
        operationCode: 'OP-TEST-001',
        operationName: 'Test Machining',
        operationType: 'MACHINING',
        level: 1,
        isActive: true
      }
    });
    testOperationId = operation.id;
  });

  describe('MaterialService UOM Integration', () => {
    it('should create material sublot with UOM foreign key from string code', async () => {
      const sublotData = {
        sublotNumber: 'SUBLOT-001',
        parentLotId: testMaterialLotId,
        quantity: 25.0,
        splitReason: 'Production requirement',
        createdById: 'test-user'
      };

      const sublot = await materialService.splitLot(sublotData);

      expect(sublot).toBeDefined();
      expect(sublot.unitOfMeasure).toBe('KG');
      expect(sublot.unitOfMeasureId).toBe(testUomKgId);
    });

    it('should create genealogy record with enhanced UOM handling', async () => {
      const genealogyData = {
        parentLotId: testMaterialLotId,
        childLotId: testMaterialLotId, // Self-reference for testing
        relationshipType: 'CONSUMPTION' as const,
        quantityConsumed: 10.0,
        quantityProduced: 8.0,
        unitOfMeasure: 'kg' // Test case-insensitive matching
      };

      const genealogy = await materialService.createGenealogyRecord(genealogyData);

      expect(genealogy).toBeDefined();
      expect(genealogy.unitOfMeasure).toBe('KG'); // Normalized to uppercase
      expect(genealogy.unitOfMeasureId).toBe(testUomKgId);
    });

    it('should create state transition with optional UOM', async () => {
      const transitionData = {
        lotId: testMaterialLotId,
        newState: 'IN_PROCESS' as const,
        transitionType: 'MANUAL' as const,
        quantity: 50.0,
        unitOfMeasure: 'KG',
        reason: 'Started processing'
      };

      const transition = await materialService.createStateTransition(transitionData);

      expect(transition).toBeDefined();
      expect(transition.unitOfMeasure).toBe('KG');
      expect(transition.unitOfMeasureId).toBe(testUomKgId);
    });

    it('should handle CUID ID as UOM input', async () => {
      const genealogyData = {
        parentLotId: testMaterialLotId,
        childLotId: testMaterialLotId,
        relationshipType: 'CONSUMPTION' as const,
        quantityConsumed: 5.0,
        unitOfMeasure: testUomEaId // Use CUID directly
      };

      const genealogy = await materialService.createGenealogyRecord(genealogyData);

      expect(genealogy).toBeDefined();
      expect(genealogy.unitOfMeasure).toBe(testUomEaId); // Should preserve CUID when provided
      expect(genealogy.unitOfMeasureId).toBe(testUomEaId);
    });
  });

  describe('ProductService UOM Integration', () => {
    it('should create part with UOM foreign key support', async () => {
      const partData = {
        partNumber: 'PART-TEST-001',
        partName: 'Test Component',
        description: 'Test component part',
        partType: 'COMPONENT',
        unitOfMeasure: 'ea' // Test case-insensitive
      };

      const part = await productService.createPart(partData);

      expect(part).toBeDefined();
      expect(part.unitOfMeasure).toBe('EA'); // Normalized
      expect(part.unitOfMeasureId).toBe(testUomEaId);
    });

    it('should create BOM item with enhanced UOM handling', async () => {
      // Create parent and component parts first
      const parentPart = await productService.createPart({
        partNumber: 'PARENT-001',
        partName: 'Parent Assembly',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA'
      });

      const componentPart = await productService.createPart({
        partNumber: 'COMP-001',
        partName: 'Component Part',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA'
      });

      const bomData = {
        parentPartId: parentPart.id,
        componentPartId: componentPart.id,
        quantity: 2,
        unitOfMeasure: 'EA',
        scrapFactor: 0.05
      };

      const bomItem = await productService.addBOMItem(bomData);

      expect(bomItem).toBeDefined();
      expect(bomItem.unitOfMeasure).toBe('EA');
      expect(bomItem.unitOfMeasureId).toBe(testUomEaId);
    });

    it('should update BOM item UOM correctly', async () => {
      // Create parts and BOM item first
      const parentPart = await productService.createPart({
        partNumber: 'PARENT-002',
        partName: 'Parent Assembly 2',
        partType: 'ASSEMBLY',
        unitOfMeasure: 'EA'
      });

      const componentPart = await productService.createPart({
        partNumber: 'COMP-002',
        partName: 'Component Part 2',
        partType: 'COMPONENT',
        unitOfMeasure: 'EA'
      });

      const bomItem = await productService.addBOMItem({
        parentPartId: parentPart.id,
        componentPartId: componentPart.id,
        quantity: 1,
        unitOfMeasure: 'EA'
      });

      // Update UOM to KG
      const updatedBomItem = await productService.updateBOMItem(bomItem.id, {
        unitOfMeasure: 'KG'
      });

      expect(updatedBomItem.unitOfMeasure).toBe('KG');
      expect(updatedBomItem.unitOfMeasureId).toBe(testUomKgId);
    });
  });

  describe('OperationService UOM Integration', () => {
    it('should add operation parameter with UOM support', async () => {
      const parameterData = {
        parameterName: 'Temperature',
        parameterType: 'PROCESS_PARAMETER',
        dataType: 'NUMERIC',
        defaultValue: '25',
        unitOfMeasure: 'C', // Celsius - should be mapped if exists
        minValue: '0',
        maxValue: '100',
        isRequired: true
      };

      const parameter = await operationService.addParameter(testOperationId, parameterData);

      expect(parameter).toBeDefined();
      expect(parameter.parameterName).toBe('Temperature');
      expect(parameter.unitOfMeasure).toBe('C');
      // Note: unitOfMeasureId might be null if 'C' unit doesn't exist in test data
    });

    it('should add material specification with UOM FK', async () => {
      const specData = {
        materialDefinitionId: testMaterialDefinitionId,
        materialType: 'RAW_MATERIAL',
        quantity: 10.0,
        unitOfMeasure: 'KG',
        consumptionType: 'CONSUMED'
      };

      const spec = await operationService.addMaterialSpec(testOperationId, specData);

      expect(spec).toBeDefined();
      expect(spec.unitOfMeasure).toBe('KG');
      expect(spec.unitOfMeasureId).toBe(testUomKgId);
    });

    it('should handle null UOM gracefully', async () => {
      const parameterData = {
        parameterName: 'ProcessStep',
        parameterType: 'PROCESS_PARAMETER',
        dataType: 'TEXT',
        defaultValue: 'Step1',
        // No unitOfMeasure provided
        isRequired: false
      };

      const parameter = await operationService.addParameter(testOperationId, parameterData);

      expect(parameter).toBeDefined();
      expect(parameter.unitOfMeasure).toBeNull();
      expect(parameter.unitOfMeasureId).toBeNull();
    });
  });

  describe('UOM Resolution Edge Cases', () => {
    it('should handle non-existent UOM codes gracefully', async () => {
      const genealogyData = {
        parentLotId: testMaterialLotId,
        childLotId: testMaterialLotId,
        relationshipType: 'CONSUMPTION' as const,
        quantityConsumed: 1.0,
        unitOfMeasure: 'NONEXISTENT'
      };

      const genealogy = await materialService.createGenealogyRecord(genealogyData);

      expect(genealogy).toBeDefined();
      expect(genealogy.unitOfMeasure).toBe('NONEXISTENT'); // Preserves original
      expect(genealogy.unitOfMeasureId).toBeNull(); // FK should be null
    });

    it('should preserve case for unrecognized CUID-like strings', async () => {
      const fakeId = 'clabcdefg123456789012345'; // CUID-like but not real

      const genealogyData = {
        parentLotId: testMaterialLotId,
        childLotId: testMaterialLotId,
        relationshipType: 'CONSUMPTION' as const,
        quantityConsumed: 1.0,
        unitOfMeasure: fakeId
      };

      const genealogy = await materialService.createGenealogyRecord(genealogyData);

      expect(genealogy).toBeDefined();
      expect(genealogy.unitOfMeasure).toBe(fakeId); // Should preserve fake ID
      expect(genealogy.unitOfMeasureId).toBe(fakeId); // Should attempt to use as ID
    });
  });

  describe('Backward Compatibility', () => {
    it('should maintain existing string-based functionality', async () => {
      // Test that existing code using only string UOM still works
      const genealogyData = {
        parentLotId: testMaterialLotId,
        childLotId: testMaterialLotId,
        relationshipType: 'CONSUMPTION' as const,
        quantityConsumed: 1.0,
        unitOfMeasure: 'CUSTOM_UNIT' // Custom unit not in lookup table
      };

      const genealogy = await materialService.createGenealogyRecord(genealogyData);

      expect(genealogy).toBeDefined();
      expect(genealogy.unitOfMeasure).toBe('CUSTOM_UNIT');
      expect(genealogy.unitOfMeasureId).toBeNull(); // No FK for unknown unit
    });

    it('should normalize common UOM codes correctly', async () => {
      const testCases = [
        { input: 'ea', expected: 'EA' },
        { input: 'Ea', expected: 'EA' },
        { input: 'kg', expected: 'KG' },
        { input: 'KG', expected: 'KG' }
      ];

      for (const testCase of testCases) {
        const genealogy = await materialService.createGenealogyRecord({
          parentLotId: testMaterialLotId,
          childLotId: testMaterialLotId,
          relationshipType: 'CONSUMPTION' as const,
          quantityConsumed: 1.0,
          unitOfMeasure: testCase.input
        });

        expect(genealogy.unitOfMeasure).toBe(testCase.expected);
      }
    });
  });
});