/**
 * Operation Service
 * ISA-95: Process Segment Service
 *
 * Provides comprehensive business logic for managing operations (manufacturing "recipes"):
 * - Operation CRUD with hierarchy support (5 levels)
 * - Parameter management (inputs, outputs, set points, measured values)
 * - Dependency management (prerequisites, sequencing, timing)
 * - Resource specification management (personnel, equipment, materials, physical assets)
 * - Validation and business rules
 * - Statistics and reporting
 */

import { Prisma } from '@prisma/client';
import prisma from '../lib/database';

export interface CreateOperationData {
  operationCode: string;
  operationName: string;
  description?: string;
  level?: number;
  parentOperationId?: string;
  operationType: string;
  category?: string;
  duration?: number;
  setupTime?: number;
  teardownTime?: number;
  minCycleTime?: number;
  maxCycleTime?: number;
  version?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  isActive?: boolean;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface UpdateOperationData {
  operationName?: string;
  description?: string;
  level?: number;
  parentOperationId?: string;
  operationType?: string;
  category?: string;
  duration?: number;
  setupTime?: number;
  teardownTime?: number;
  minCycleTime?: number;
  maxCycleTime?: number;
  version?: string;
  effectiveDate?: Date;
  expirationDate?: Date;
  isActive?: boolean;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface OperationFilters {
  operationType?: string;
  category?: string;
  level?: number;
  parentOperationId?: string;
  isActive?: boolean;
}

export class OperationService {

  constructor() {}

  // ==================== UOM HELPER METHODS ====================

  /**
   * Resolve UnitOfMeasure ID from string code
   * Supports both direct ID (if already a CUID) and code lookup
   */
  private async resolveUomId(uomCode: string): Promise<string | null> {
    // If it's already a CUID (starts with 'c'), assume it's an ID
    if (uomCode.startsWith('c') && uomCode.length > 20) {
      return uomCode;
    }

    // Look up by code (case-insensitive)
    const uom = await prisma.unitOfMeasure.findFirst({
      where: {
        code: { equals: uomCode.toUpperCase(), mode: 'insensitive' },
        isActive: true
      },
      select: { id: true }
    });

    return uom?.id || null;
  }

  /**
   * Enhanced UOM data preparation for database operations
   * Returns both string and FK for dual-field support
   */
  private async prepareUomData(uomCode?: string) {
    if (!uomCode) return { unitOfMeasure: null, unitOfMeasureId: null };

    const unitOfMeasureId = await this.resolveUomId(uomCode);
    return {
      unitOfMeasure: uomCode.toUpperCase(), // Normalize to uppercase
      unitOfMeasureId
    };
  }

  /**
   * Create a new operation
   */
  async createOperation(data: CreateOperationData) {
    // Validate parent operation exists and prevent circular references
    if (data.parentOperationId) {
      const parent = await prisma.operation.findUnique({
        where: { id: data.parentOperationId }
      });

      if (!parent) {
        throw new Error(`Parent operation ${data.parentOperationId} not found`);
      }

      // Prevent self-parenting
      if (data.parentOperationId === data.operationCode) {
        throw new Error('Operation cannot be its own parent');
      }

      // Auto-set level if not provided (parent level + 1)
      if (!data.level) {
        data.level = parent.level + 1;
      }
    }

    // Create operation WITHOUT include to avoid Prisma proxy object issues with foreign keys
    // Foreign keys like parentOperationId return null when using include with create
    // Tests can call GET endpoint if relations are needed
    const operation = await prisma.operation.create({
      data: {
        operationCode: data.operationCode,
        operationName: data.operationName,
        description: data.description,
        level: data.level ?? 1,
        parentOperationId: data.parentOperationId,
        operationType: data.operationType as any,
        category: data.category,
        duration: data.duration,
        setupTime: data.setupTime,
        teardownTime: data.teardownTime,
        minCycleTime: data.minCycleTime,
        maxCycleTime: data.maxCycleTime,
        version: data.version ?? '1.0',
        effectiveDate: data.effectiveDate,
        expirationDate: data.expirationDate,
        isActive: data.isActive ?? true,
        requiresApproval: data.requiresApproval ?? false,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt
      }
    });

    return operation;
  }

  /**
   * Get operation by ID
   */
  async getOperationById(id: string, includeRelations = true) {
    const operation = await prisma.operation.findUnique({
      where: { id },
      include: includeRelations ? {
        parentOperation: true,
        childOperations: true,
        parameters: true,
        dependencies: {
          include: {
            prerequisiteOperation: true
          }
        },
        prerequisiteFor: {
          include: {
            dependentOperation: true
          }
        },
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      } : undefined
    });

    if (!operation) {
      throw new Error(`Operation ${id} not found`);
    }

    return operation;
  }

  /**
   * Get operation by code
   */
  async getOperationByCode(operationCode: string, includeRelations = true) {
    const operation = await prisma.operation.findUnique({
      where: { operationCode },
      include: includeRelations ? {
        parentOperation: true,
        childOperations: true,
        parameters: true,
        dependencies: {
          include: {
            prerequisiteOperation: true
          }
        },
        prerequisiteFor: {
          include: {
            dependentOperation: true
          }
        },
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      } : undefined
    });

    if (!operation) {
      throw new Error(`Operation with code ${operationCode} not found`);
    }

    return operation;
  }

  /**
   * Get all operations with optional filters
   */
  async getAllOperations(filters?: OperationFilters, includeRelations = false) {
    const where: Prisma.OperationWhereInput = {};

    if (filters?.operationType) {
      where.operationType = filters.operationType as any;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.level !== undefined) {
      where.level = filters.level;
    }

    if (filters?.parentOperationId !== undefined) {
      where.parentOperationId = filters.parentOperationId === 'null' ? null : filters.parentOperationId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const operations = await prisma.operation.findMany({
      where,
      include: includeRelations ? {
        parentOperation: true,
        childOperations: true,
        parameters: true,
        dependencies: {
          include: {
            prerequisiteOperation: true
          }
        },
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      } : undefined,
      orderBy: [
        { level: 'asc' },
        { operationCode: 'asc' }
      ]
    });

    return operations;
  }

  /**
   * Update operation
   */
  async updateOperation(id: string, data: UpdateOperationData) {
    // Validate parent operation if changing
    if (data.parentOperationId) {
      const parent = await prisma.operation.findUnique({
        where: { id: data.parentOperationId }
      });

      if (!parent) {
        throw new Error(`Parent operation ${data.parentOperationId} not found`);
      }

      // Prevent self-parenting
      if (data.parentOperationId === id) {
        throw new Error('Operation cannot be its own parent');
      }

      // Prevent circular references by checking if new parent is a descendant
      const isCircular = await this.isDescendant(data.parentOperationId, id);
      if (isCircular) {
        throw new Error('Circular reference detected: new parent is a descendant of this operation');
      }
    }

    // Update WITHOUT include to avoid Prisma proxy object issues with foreign keys
    const operation = await prisma.operation.update({
      where: { id },
      data: {
        operationName: data.operationName,
        description: data.description,
        level: data.level,
        parentOperationId: data.parentOperationId,
        operationType: data.operationType as any,
        category: data.category,
        duration: data.duration,
        setupTime: data.setupTime,
        teardownTime: data.teardownTime,
        minCycleTime: data.minCycleTime,
        maxCycleTime: data.maxCycleTime,
        version: data.version,
        effectiveDate: data.effectiveDate,
        expirationDate: data.expirationDate,
        isActive: data.isActive,
        requiresApproval: data.requiresApproval,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt
      }
    });

    return operation;
  }

  /**
   * Delete operation (soft delete by setting isActive = false)
   */
  async deleteOperation(id: string, hardDelete = false) {
    // Check if operation has children
    const childCount = await prisma.operation.count({
      where: { parentOperationId: id }
    });

    if (childCount > 0) {
      throw new Error(`Cannot delete operation: ${childCount} child operations exist. Delete children first.`);
    }

    if (hardDelete) {
      // Hard delete - delete dependencies and related records first (cascade delete handles this)
      await prisma.operation.delete({
        where: { id }
      });

      return { deleted: true, hardDelete: true };
    } else {
      // Soft delete - just mark as inactive
      await prisma.operation.update({
        where: { id },
        data: { isActive: false }
      });

      return { deleted: true, hardDelete: false };
    }
  }

  // ======================
  // HIERARCHY METHODS
  // ======================

  /**
   * Get child operations of an operation
   */
  async getChildOperations(operationId: string) {
    const children = await prisma.operation.findMany({
      where: { parentOperationId: operationId },
      include: {
        childOperations: true,
        parameters: true
      },
      orderBy: { operationCode: 'asc' }
    });

    return children;
  }

  /**
   * Get root operations (top-level, no parent)
   */
  async getRootOperations() {
    const roots = await prisma.operation.findMany({
      where: { parentOperationId: null },
      include: {
        childOperations: true,
        parameters: true
      },
      orderBy: { operationCode: 'asc' }
    });

    return roots;
  }

  /**
   * Get full hierarchy tree starting from an operation
   */
  async getOperationHierarchyTree(operationId: string): Promise<any> {
    const operation = await prisma.operation.findUnique({
      where: { id: operationId },
      include: {
        childOperations: true,
        parameters: true
      }
    });

    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    // Recursively get children
    const children = await Promise.all(
      (operation as any).childOperations.map((child: any) => this.getOperationHierarchyTree(child.id))
    );

    return {
      ...operation,
      children
    };
  }

  /**
   * Get ancestor chain (path to root)
   */
  async getAncestorChain(operationId: string): Promise<any[]> {
    const chain: any[] = [];

    // Start from the operation itself
    let currentId: string | null = operationId;

    while (currentId) {
      const operation = await prisma.operation.findUnique({
        where: { id: currentId },
        include: { parentOperation: true }
      });

      if (!operation) {
        throw new Error(`Operation with ID ${currentId} not found`);
      }

      chain.push(operation);
      currentId = operation.parentOperationId;

      // Prevent infinite loops
      if (chain.length > 10) {
        throw new Error('Circular reference detected in operation hierarchy');
      }
    }

    return chain.reverse(); // Root first
  }

  /**
   * Check if operation A is a descendant of operation B
   */
  async isDescendant(operationId: string, potentialAncestorId: string): Promise<boolean> {
    const ancestors = await this.getAncestorChain(operationId);
    return ancestors.some(ancestor => ancestor.id === potentialAncestorId);
  }

  // ======================
  // PARAMETER METHODS
  // ======================

  /**
   * Add parameter to operation
   */
  async addParameter(operationId: string, parameterData: any) {
    // Verify operation exists
    await this.getOperationById(operationId, false);

    // Prepare UOM data (both string and FK) if provided
    const uomData = parameterData.unitOfMeasure ? await this.prepareUomData(parameterData.unitOfMeasure) : { unitOfMeasure: null, unitOfMeasureId: null };

    const parameter = await prisma.operationParameter.create({
      data: {
        operationId,
        parameterName: parameterData.parameterName,
        parameterType: parameterData.parameterType,
        dataType: parameterData.dataType,
        defaultValue: parameterData.defaultValue,
        unitOfMeasure: uomData.unitOfMeasure || parameterData.unitOfMeasure,
        unitOfMeasureId: uomData.unitOfMeasureId,
        minValue: parameterData.minValue,
        maxValue: parameterData.maxValue,
        allowedValues: parameterData.allowedValues ?? [],
        isRequired: parameterData.isRequired ?? false,
        isCritical: parameterData.isCritical ?? false,
        requiresVerification: parameterData.requiresVerification ?? false,
        displayOrder: parameterData.displayOrder,
        notes: parameterData.notes
      }
    });

    return parameter;
  }

  /**
   * Get all parameters for an operation
   */
  async getOperationParameters(operationId: string) {
    const parameters = await prisma.operationParameter.findMany({
      where: { operationId },
      orderBy: [
        { displayOrder: 'asc' },
        { parameterName: 'asc' }
      ]
    });

    return parameters;
  }

  /**
   * Update parameter
   */
  async updateParameter(parameterId: string, data: any) {
    const parameter = await prisma.operationParameter.update({
      where: { id: parameterId },
      data
    });

    return parameter;
  }

  /**
   * Delete parameter
   */
  async deleteParameter(parameterId: string) {
    await prisma.operationParameter.delete({
      where: { id: parameterId }
    });

    return { deleted: true };
  }

  // ======================
  // DEPENDENCY METHODS
  // ======================

  /**
   * Add dependency between operations
   */
  async addDependency(dependencyData: any) {
    // Verify both operations exist
    await this.getOperationById(dependencyData.dependentOperationId, false);
    await this.getOperationById(dependencyData.prerequisiteOperationId, false);

    // Prevent self-dependency
    if (dependencyData.dependentOperationId === dependencyData.prerequisiteOperationId) {
      throw new Error('Operation cannot depend on itself');
    }

    const dependency = await prisma.operationDependency.create({
      data: {
        dependentOperationId: dependencyData.dependentOperationId,
        prerequisiteOperationId: dependencyData.prerequisiteOperationId,
        dependencyType: dependencyData.dependencyType,
        timingType: dependencyData.timingType,
        lagTime: dependencyData.lagTime,
        leadTime: dependencyData.leadTime,
        condition: dependencyData.condition,
        isOptional: dependencyData.isOptional ?? false,
        notes: dependencyData.notes
      },
      include: {
        dependentOperation: true,
        prerequisiteOperation: true
      }
    });

    return dependency;
  }

  /**
   * Get all dependencies for an operation (both as dependent and prerequisite)
   */
  async getOperationDependencies(operationId: string) {
    const [dependencies, prerequisites] = await Promise.all([
      // This operation depends on these
      prisma.operationDependency.findMany({
        where: { dependentOperationId: operationId },
        include: { prerequisiteOperation: true }
      }),
      // These operations depend on this one
      prisma.operationDependency.findMany({
        where: { prerequisiteOperationId: operationId },
        include: { dependentOperation: true }
      })
    ]);

    return {
      dependencies, // What this operation depends on
      prerequisites // What depends on this operation
    };
  }

  /**
   * Delete dependency
   */
  async deleteDependency(dependencyId: string) {
    await prisma.operationDependency.delete({
      where: { id: dependencyId }
    });

    return { deleted: true };
  }

  // ======================
  // RESOURCE SPECIFICATION METHODS
  // ======================

  /**
   * Add personnel specification to operation
   */
  async addPersonnelSpec(operationId: string, specData: any) {
    await this.getOperationById(operationId, false);

    const spec = await prisma.personnelOperationSpecification.create({
      data: {
        operationId,
        personnelClassId: specData.personnelClassId,
        skillId: specData.skillId,
        minimumCompetency: specData.minimumCompetency,
        requiredCertifications: specData.requiredCertifications ?? [],
        quantity: specData.quantity ?? 1,
        isOptional: specData.isOptional ?? false,
        roleName: specData.roleName,
        roleDescription: specData.roleDescription,
        notes: specData.notes
      }
    });

    return spec;
  }

  /**
   * Add equipment specification to operation
   */
  async addEquipmentSpec(operationId: string, specData: any) {
    await this.getOperationById(operationId, false);

    const spec = await prisma.equipmentOperationSpecification.create({
      data: {
        operationId,
        equipmentClass: specData.equipmentClass,
        equipmentType: specData.equipmentType,
        specificEquipmentId: specData.specificEquipmentId,
        requiredCapabilities: specData.requiredCapabilities ?? [],
        minimumCapacity: specData.minimumCapacity,
        quantity: specData.quantity ?? 1,
        isOptional: specData.isOptional ?? false,
        setupRequired: specData.setupRequired ?? false,
        setupTime: specData.setupTime,
        notes: specData.notes
      }
    });

    return spec;
  }

  /**
   * Add material specification to operation
   */
  async addMaterialSpec(operationId: string, specData: any) {
    await this.getOperationById(operationId, false);

    // Prepare UOM data (both string and FK)
    const uomData = await this.prepareUomData(specData.unitOfMeasure);

    const spec = await prisma.materialOperationSpecification.create({
      data: {
        operationId,
        materialDefinitionId: specData.materialDefinitionId,
        materialClassId: specData.materialClassId,
        materialType: specData.materialType,
        quantity: specData.quantity,
        unitOfMeasure: uomData.unitOfMeasure || specData.unitOfMeasure,
        unitOfMeasureId: uomData.unitOfMeasureId,
        consumptionType: specData.consumptionType,
        requiredProperties: specData.requiredProperties ?? [],
        qualityRequirements: specData.qualityRequirements,
        isOptional: specData.isOptional ?? false,
        allowSubstitutes: specData.allowSubstitutes ?? false,
        notes: specData.notes
      }
    });

    return spec;
  }

  /**
   * Add physical asset specification to operation
   */
  async addPhysicalAssetSpec(operationId: string, specData: any) {
    await this.getOperationById(operationId, false);

    const spec = await prisma.physicalAssetOperationSpecification.create({
      data: {
        operationId,
        assetType: specData.assetType,
        assetCode: specData.assetCode,
        assetName: specData.assetName,
        specifications: specData.specifications,
        quantity: specData.quantity ?? 1,
        isOptional: specData.isOptional ?? false,
        requiresCalibration: specData.requiresCalibration ?? false,
        calibrationInterval: specData.calibrationInterval,
        estimatedLifeCycles: specData.estimatedLifeCycles,
        notes: specData.notes
      }
    });

    return spec;
  }

  /**
   * Get all resource specifications for an operation
   */
  async getOperationResourceSpecs(operationId: string) {
    const [personnel, equipment, materials, assets] = await Promise.all([
      prisma.personnelOperationSpecification.findMany({
        where: { operationId }
      }),
      prisma.equipmentOperationSpecification.findMany({
        where: { operationId }
      }),
      prisma.materialOperationSpecification.findMany({
        where: { operationId }
      }),
      prisma.physicalAssetOperationSpecification.findMany({
        where: { operationId }
      })
    ]);

    return {
      personnel,
      equipment,
      materials,
      assets
    };
  }

  // ======================
  // STATISTICS & REPORTING
  // ======================

  /**
   * Get operation statistics
   */
  async getStatistics() {
    const [
      totalOperations,
      operationsByType,
      operationsByLevel,
      activeOperations,
      approvedOperations
    ] = await Promise.all([
      prisma.operation.count(),
      prisma.operation.groupBy({
        by: ['operationType'],
        _count: true
      }),
      prisma.operation.groupBy({
        by: ['level'],
        _count: true,
        orderBy: { level: 'asc' }
      }),
      prisma.operation.count({ where: { isActive: true } }),
      prisma.operation.count({ where: { requiresApproval: true, approvedAt: { not: null } } })
    ]);

    return {
      totalOperations,
      operationsByType,
      operationsByLevel,
      activeOperations,
      inactiveOperations: totalOperations - activeOperations,
      approvedOperations
    };
  }

  /**
   * Get total estimated time for an operation (including all children)
   */
  async getOperationTotalTime(operationId: string): Promise<number> {
    const operation = await this.getOperationById(operationId, true);

    let totalTime = operation.duration ?? 0;
    totalTime += operation.setupTime ?? 0;
    totalTime += operation.teardownTime ?? 0;

    // Add child operation times recursively
    for (const child of (operation as any).childOperations) {
      totalTime += await this.getOperationTotalTime(child.id);
    }

    return totalTime;
  }

  // ============================================================================
  // NEW: Work Instruction Linkage Methods (MES Enhancement Phase 1)
  // ============================================================================

  /**
   * Assign standard work instruction to operation
   * This WI will be the default for all routing steps using this operation
   */
  async assignStandardWorkInstruction(
    operationId: string,
    workInstructionId: string
  ) {
    // Validate operation exists
    await this.getOperationById(operationId, false);

    // Validate work instruction exists
    const workInstruction = await prisma.workInstruction.findUnique({
      where: { id: workInstructionId }
    });

    if (!workInstruction) {
      throw new Error(`Work instruction ${workInstructionId} not found`);
    }

    // Update operation with standard WI
    const updated = await prisma.operation.update({
      where: { id: operationId },
      data: { standardWorkInstructionId: workInstructionId },
      include: {
        standardWorkInstruction: true
      }
    });

    return updated;
  }

  /**
   * Remove standard work instruction from operation
   */
  async removeStandardWorkInstruction(operationId: string) {
    await this.getOperationById(operationId, false);

    const updated = await prisma.operation.update({
      where: { id: operationId },
      data: { standardWorkInstructionId: null }
    });

    return updated;
  }

  /**
   * Get standard work instruction for an operation
   */
  async getStandardWorkInstruction(operationId: string) {
    const operation = await prisma.operation.findUnique({
      where: { id: operationId },
      include: {
        standardWorkInstruction: {
          include: {
            steps: true
          }
        }
      }
    });

    if (!operation) {
      throw new Error(`Operation ${operationId} not found`);
    }

    return operation.standardWorkInstruction;
  }

  // ============================================================================
  // NEW: Oracle/Teamcenter Terminology Aliases (MES Enhancement Phase 4)
  // ============================================================================

  /**
   * Get operation by operation code (Oracle ERP alias)
   * Searches operationCode field
   */
  async getByOperationCode(operationCode: string) {
    const operation = await prisma.operation.findFirst({
      where: {
        operationCode,
        isActive: true
      },
      include: {
        parentOperation: true,
        childOperations: true,
        parameters: true,
        standardWorkInstruction: true
      }
    });

    if (!operation) {
      throw new Error(`Operation with code ${operationCode} not found`);
    }

    return operation;
  }

  /**
   * Get operations by classification (Oracle-style MAKE, ASSEMBLY, INSPECTION, etc.)
   */
  async getOperationsByClassification(classification: string) {
    const operations = await prisma.operation.findMany({
      where: {
        operationClassification: classification as any,
        isActive: true
      },
      include: {
        parameters: true,
        standardWorkInstruction: true
      },
      orderBy: [
        { level: 'asc' },
        { operationCode: 'asc' }
      ]
    });

    return operations;
  }

  /**
   * Update operation terminology fields (for Oracle/Teamcenter alignment)
   */
  async updateOperationTerminology(
    operationId: string,
    data: {
      operationCode?: string;
      operationName?: string;
      operationClassification?: string;
    }
  ) {
    await this.getOperationById(operationId, false);

    // Validate operationCode uniqueness if provided
    if (data.operationCode) {
      const existing = await prisma.operation.findFirst({
        where: {
          operationCode: data.operationCode,
          id: { not: operationId }
        }
      });

      if (existing) {
        throw new Error(
          `Operation code ${data.operationCode} is already in use`
        );
      }
    }

    const updated = await prisma.operation.update({
      where: { id: operationId },
      data: {
        operationCode: data.operationCode,
        operationName: data.operationName,
        operationClassification: data.operationClassification as any
      }
    });

    return updated;
  }

  /**
   * Search operations (searches both ISA-95 and Oracle terminology)
   */
  async searchOperations(searchTerm: string) {
    const operations = await prisma.operation.findMany({
      where: {
        OR: [
          { operationCode: { contains: searchTerm, mode: 'insensitive' } },
          { operationName: { contains: searchTerm, mode: 'insensitive' } },
          { description: { contains: searchTerm, mode: 'insensitive' } }
        ],
        isActive: true
      },
      include: {
        parameters: true,
        standardWorkInstruction: true
      },
      take: 50, // Limit results for performance
      orderBy: [
        { level: 'asc' },
        { operationCode: 'asc' }
      ]
    });

    return operations;
  }
}

export default new OperationService();
