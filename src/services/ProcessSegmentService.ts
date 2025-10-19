/**
 * Process Segment Service
 * ISA-95 Process Segment Model (Task 1.4)
 *
 * Provides comprehensive business logic for managing process segments (manufacturing "recipes"):
 * - Process segment CRUD with hierarchy support (5 levels)
 * - Parameter management (inputs, outputs, set points, measured values)
 * - Dependency management (prerequisites, sequencing, timing)
 * - Resource specification management (personnel, equipment, materials, physical assets)
 * - Validation and business rules
 * - Statistics and reporting
 */

import { PrismaClient, Prisma } from '@prisma/client';

export interface CreateProcessSegmentData {
  segmentCode: string;
  segmentName: string;
  description?: string;
  level?: number;
  parentSegmentId?: string;
  segmentType: string;
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

export interface UpdateProcessSegmentData {
  segmentName?: string;
  description?: string;
  level?: number;
  parentSegmentId?: string;
  segmentType?: string;
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

export interface ProcessSegmentFilters {
  segmentType?: string;
  category?: string;
  level?: number;
  parentSegmentId?: string;
  isActive?: boolean;
}

export class ProcessSegmentService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Create a new process segment
   */
  async createProcessSegment(data: CreateProcessSegmentData) {
    // Validate parent segment exists and prevent circular references
    if (data.parentSegmentId) {
      const parent = await this.prisma.processSegment.findUnique({
        where: { id: data.parentSegmentId }
      });

      if (!parent) {
        throw new Error(`Parent segment ${data.parentSegmentId} not found`);
      }

      // Prevent self-parenting
      if (data.parentSegmentId === data.segmentCode) {
        throw new Error('Process segment cannot be its own parent');
      }

      // Auto-set level if not provided (parent level + 1)
      if (!data.level) {
        data.level = parent.level + 1;
      }
    }

    const segment = await this.prisma.processSegment.create({
      data: {
        segmentCode: data.segmentCode,
        segmentName: data.segmentName,
        description: data.description,
        level: data.level ?? 1,
        parentSegmentId: data.parentSegmentId,
        segmentType: data.segmentType as any,
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
      },
      include: {
        parentSegment: true,
        childSegments: true,
        parameters: true,
        dependencies: true,
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      }
    });

    return segment;
  }

  /**
   * Get process segment by ID
   */
  async getProcessSegmentById(id: string, includeRelations = true) {
    const segment = await this.prisma.processSegment.findUnique({
      where: { id },
      include: includeRelations ? {
        parentSegment: true,
        childSegments: true,
        parameters: true,
        dependencies: {
          include: {
            prerequisiteSegment: true
          }
        },
        prerequisiteFor: {
          include: {
            dependentSegment: true
          }
        },
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      } : undefined
    });

    if (!segment) {
      throw new Error(`Process segment ${id} not found`);
    }

    return segment;
  }

  /**
   * Get process segment by code
   */
  async getProcessSegmentByCode(segmentCode: string, includeRelations = true) {
    const segment = await this.prisma.processSegment.findUnique({
      where: { segmentCode },
      include: includeRelations ? {
        parentSegment: true,
        childSegments: true,
        parameters: true,
        dependencies: {
          include: {
            prerequisiteSegment: true
          }
        },
        prerequisiteFor: {
          include: {
            dependentSegment: true
          }
        },
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      } : undefined
    });

    if (!segment) {
      throw new Error(`Process segment with code ${segmentCode} not found`);
    }

    return segment;
  }

  /**
   * Get all process segments with optional filters
   */
  async getAllProcessSegments(filters?: ProcessSegmentFilters, includeRelations = false) {
    const where: Prisma.ProcessSegmentWhereInput = {};

    if (filters?.segmentType) {
      where.segmentType = filters.segmentType as any;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.level !== undefined) {
      where.level = filters.level;
    }

    if (filters?.parentSegmentId !== undefined) {
      where.parentSegmentId = filters.parentSegmentId === 'null' ? null : filters.parentSegmentId;
    }

    if (filters?.isActive !== undefined) {
      where.isActive = filters.isActive;
    }

    const segments = await this.prisma.processSegment.findMany({
      where,
      include: includeRelations ? {
        parentSegment: true,
        childSegments: true,
        parameters: true,
        dependencies: {
          include: {
            prerequisiteSegment: true
          }
        },
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      } : undefined,
      orderBy: [
        { level: 'asc' },
        { segmentCode: 'asc' }
      ]
    });

    return segments;
  }

  /**
   * Update process segment
   */
  async updateProcessSegment(id: string, data: UpdateProcessSegmentData) {
    // Validate parent segment if changing
    if (data.parentSegmentId) {
      const parent = await this.prisma.processSegment.findUnique({
        where: { id: data.parentSegmentId }
      });

      if (!parent) {
        throw new Error(`Parent segment ${data.parentSegmentId} not found`);
      }

      // Prevent self-parenting
      if (data.parentSegmentId === id) {
        throw new Error('Process segment cannot be its own parent');
      }

      // Prevent circular references by checking if new parent is a descendant
      const isCircular = await this.isDescendant(id, data.parentSegmentId);
      if (isCircular) {
        throw new Error('Circular reference detected: new parent is a descendant of this segment');
      }
    }

    const segment = await this.prisma.processSegment.update({
      where: { id },
      data: {
        segmentName: data.segmentName,
        description: data.description,
        level: data.level,
        parentSegmentId: data.parentSegmentId,
        segmentType: data.segmentType as any,
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
      },
      include: {
        parentSegment: true,
        childSegments: true,
        parameters: true,
        dependencies: true,
        personnelSpecs: true,
        equipmentSpecs: true,
        materialSpecs: true,
        assetSpecs: true
      }
    });

    return segment;
  }

  /**
   * Delete process segment (soft delete by setting isActive = false)
   */
  async deleteProcessSegment(id: string, hardDelete = false) {
    // Check if segment has children
    const childCount = await this.prisma.processSegment.count({
      where: { parentSegmentId: id }
    });

    if (childCount > 0) {
      throw new Error(`Cannot delete segment: ${childCount} child segments exist. Delete children first.`);
    }

    if (hardDelete) {
      // Hard delete - delete dependencies and related records first (cascade delete handles this)
      await this.prisma.processSegment.delete({
        where: { id }
      });

      return { deleted: true, hardDelete: true };
    } else {
      // Soft delete - just mark as inactive
      await this.prisma.processSegment.update({
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
   * Get child segments of a process segment
   */
  async getChildSegments(segmentId: string) {
    const children = await this.prisma.processSegment.findMany({
      where: { parentSegmentId: segmentId },
      include: {
        childSegments: true,
        parameters: true
      },
      orderBy: { segmentCode: 'asc' }
    });

    return children;
  }

  /**
   * Get root segments (top-level, no parent)
   */
  async getRootSegments() {
    const roots = await this.prisma.processSegment.findMany({
      where: { parentSegmentId: null },
      include: {
        childSegments: true,
        parameters: true
      },
      orderBy: { segmentCode: 'asc' }
    });

    return roots;
  }

  /**
   * Get full hierarchy tree starting from a segment
   */
  async getSegmentHierarchyTree(segmentId: string): Promise<any> {
    const segment = await this.prisma.processSegment.findUnique({
      where: { id: segmentId },
      include: {
        childSegments: true,
        parameters: true
      }
    });

    if (!segment) {
      throw new Error(`Segment ${segmentId} not found`);
    }

    // Recursively get children
    const children = await Promise.all(
      segment.childSegments.map(child => this.getSegmentHierarchyTree(child.id))
    );

    return {
      ...segment,
      children
    };
  }

  /**
   * Get ancestor chain (path to root)
   */
  async getAncestorChain(segmentId: string): Promise<any[]> {
    const ancestors: any[] = [];
    let currentId: string | null = segmentId;

    while (currentId) {
      const segment = await this.prisma.processSegment.findUnique({
        where: { id: currentId },
        include: { parentSegment: true }
      });

      if (!segment) break;

      ancestors.push(segment);
      currentId = segment.parentSegmentId;

      // Prevent infinite loops
      if (ancestors.length > 10) {
        throw new Error('Circular reference detected in segment hierarchy');
      }
    }

    return ancestors.reverse(); // Root first
  }

  /**
   * Check if segment A is a descendant of segment B
   */
  async isDescendant(segmentId: string, potentialAncestorId: string): Promise<boolean> {
    const ancestors = await this.getAncestorChain(segmentId);
    return ancestors.some(ancestor => ancestor.id === potentialAncestorId);
  }

  // ======================
  // PARAMETER METHODS
  // ======================

  /**
   * Add parameter to segment
   */
  async addParameter(segmentId: string, parameterData: any) {
    // Verify segment exists
    await this.getProcessSegmentById(segmentId, false);

    const parameter = await this.prisma.processSegmentParameter.create({
      data: {
        segmentId,
        parameterName: parameterData.parameterName,
        parameterType: parameterData.parameterType,
        dataType: parameterData.dataType,
        defaultValue: parameterData.defaultValue,
        unitOfMeasure: parameterData.unitOfMeasure,
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
   * Get all parameters for a segment
   */
  async getSegmentParameters(segmentId: string) {
    const parameters = await this.prisma.processSegmentParameter.findMany({
      where: { segmentId },
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
    const parameter = await this.prisma.processSegmentParameter.update({
      where: { id: parameterId },
      data
    });

    return parameter;
  }

  /**
   * Delete parameter
   */
  async deleteParameter(parameterId: string) {
    await this.prisma.processSegmentParameter.delete({
      where: { id: parameterId }
    });

    return { deleted: true };
  }

  // ======================
  // DEPENDENCY METHODS
  // ======================

  /**
   * Add dependency between segments
   */
  async addDependency(dependencyData: any) {
    // Verify both segments exist
    await this.getProcessSegmentById(dependencyData.dependentSegmentId, false);
    await this.getProcessSegmentById(dependencyData.prerequisiteSegmentId, false);

    // Prevent self-dependency
    if (dependencyData.dependentSegmentId === dependencyData.prerequisiteSegmentId) {
      throw new Error('Segment cannot depend on itself');
    }

    const dependency = await this.prisma.processSegmentDependency.create({
      data: {
        dependentSegmentId: dependencyData.dependentSegmentId,
        prerequisiteSegmentId: dependencyData.prerequisiteSegmentId,
        dependencyType: dependencyData.dependencyType,
        timingType: dependencyData.timingType,
        lagTime: dependencyData.lagTime,
        leadTime: dependencyData.leadTime,
        condition: dependencyData.condition,
        isOptional: dependencyData.isOptional ?? false,
        notes: dependencyData.notes
      },
      include: {
        dependentSegment: true,
        prerequisiteSegment: true
      }
    });

    return dependency;
  }

  /**
   * Get all dependencies for a segment (both as dependent and prerequisite)
   */
  async getSegmentDependencies(segmentId: string) {
    const [dependencies, prerequisites] = await Promise.all([
      // This segment depends on these
      this.prisma.processSegmentDependency.findMany({
        where: { dependentSegmentId: segmentId },
        include: { prerequisiteSegment: true }
      }),
      // These segments depend on this one
      this.prisma.processSegmentDependency.findMany({
        where: { prerequisiteSegmentId: segmentId },
        include: { dependentSegment: true }
      })
    ]);

    return {
      dependencies, // What this segment depends on
      prerequisites // What depends on this segment
    };
  }

  /**
   * Delete dependency
   */
  async deleteDependency(dependencyId: string) {
    await this.prisma.processSegmentDependency.delete({
      where: { id: dependencyId }
    });

    return { deleted: true };
  }

  // ======================
  // RESOURCE SPECIFICATION METHODS
  // ======================

  /**
   * Add personnel specification to segment
   */
  async addPersonnelSpec(segmentId: string, specData: any) {
    await this.getProcessSegmentById(segmentId, false);

    const spec = await this.prisma.personnelSegmentSpecification.create({
      data: {
        segmentId,
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
   * Add equipment specification to segment
   */
  async addEquipmentSpec(segmentId: string, specData: any) {
    await this.getProcessSegmentById(segmentId, false);

    const spec = await this.prisma.equipmentSegmentSpecification.create({
      data: {
        segmentId,
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
   * Add material specification to segment
   */
  async addMaterialSpec(segmentId: string, specData: any) {
    await this.getProcessSegmentById(segmentId, false);

    const spec = await this.prisma.materialSegmentSpecification.create({
      data: {
        segmentId,
        materialDefinitionId: specData.materialDefinitionId,
        materialClassId: specData.materialClassId,
        materialType: specData.materialType,
        quantity: specData.quantity,
        unitOfMeasure: specData.unitOfMeasure,
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
   * Add physical asset specification to segment
   */
  async addPhysicalAssetSpec(segmentId: string, specData: any) {
    await this.getProcessSegmentById(segmentId, false);

    const spec = await this.prisma.physicalAssetSegmentSpecification.create({
      data: {
        segmentId,
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
   * Get all resource specifications for a segment
   */
  async getSegmentResourceSpecs(segmentId: string) {
    const [personnel, equipment, materials, assets] = await Promise.all([
      this.prisma.personnelSegmentSpecification.findMany({
        where: { segmentId }
      }),
      this.prisma.equipmentSegmentSpecification.findMany({
        where: { segmentId }
      }),
      this.prisma.materialSegmentSpecification.findMany({
        where: { segmentId }
      }),
      this.prisma.physicalAssetSegmentSpecification.findMany({
        where: { segmentId }
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
   * Get process segment statistics
   */
  async getStatistics() {
    const [
      totalSegments,
      segmentsByType,
      segmentsByLevel,
      activeSegments,
      approvedSegments
    ] = await Promise.all([
      this.prisma.processSegment.count(),
      this.prisma.processSegment.groupBy({
        by: ['segmentType'],
        _count: true
      }),
      this.prisma.processSegment.groupBy({
        by: ['level'],
        _count: true,
        orderBy: { level: 'asc' }
      }),
      this.prisma.processSegment.count({ where: { isActive: true } }),
      this.prisma.processSegment.count({ where: { requiresApproval: true, approvedAt: { not: null } } })
    ]);

    return {
      totalSegments,
      segmentsByType,
      segmentsByLevel,
      activeSegments,
      inactiveSegments: totalSegments - activeSegments,
      approvedSegments
    };
  }

  /**
   * Get total estimated time for a segment (including all children)
   */
  async getSegmentTotalTime(segmentId: string): Promise<number> {
    const segment = await this.getProcessSegmentById(segmentId, true);

    let totalTime = segment.duration ?? 0;
    totalTime += segment.setupTime ?? 0;
    totalTime += segment.teardownTime ?? 0;

    // Add child segment times recursively
    for (const child of segment.childSegments) {
      totalTime += await this.getSegmentTotalTime(child.id);
    }

    return totalTime;
  }
}

export default new ProcessSegmentService();
