/**
 * Product Service (ISA-95 Product Definition Model - Task 1.5)
 *
 * Handles all product-related operations including:
 * - Part CRUD operations
 * - Product specifications
 * - Product configurations (variants and options)
 * - Product lifecycle management
 * - BOM integration with process segments
 *
 * This service implements ISA-95 Part 2 Section 5: Product Definition
 */

import { PrismaClient, ProductType, ProductLifecycleState, ConfigurationType, SpecificationType, Prisma } from '@prisma/client';

export class ProductService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  // ============================================================================
  // PART (PRODUCT DEFINITION) CRUD OPERATIONS
  // ============================================================================

  /**
   * Create a new part/product
   */
  async createPart(data: {
  partNumber: string;
  partName: string;
  description?: string;
  partType: string;
  productType?: ProductType;
  lifecycleState?: ProductLifecycleState;
  unitOfMeasure: string;
  weight?: number;
  weightUnit?: string;
  drawingNumber?: string;
  revision?: string;
  cadModelUrl?: string;
  releaseDate?: Date;
  obsoleteDate?: Date;
  replacementPartId?: string;
  makeOrBuy?: string;
  leadTimeDays?: number;
  lotSizeMin?: number;
  lotSizeMultiple?: number;
  standardCost?: number;
  targetCost?: number;
  currency?: string;
  isConfigurable?: boolean;
  requiresFAI?: boolean;
}) {
  const part = await this.prisma.part.create({
    data: {
      ...data,
      productType: data.productType || 'MADE_TO_STOCK',
      lifecycleState: data.lifecycleState || 'PRODUCTION',
    },
    include: {
      specifications: true,
      configurations: true,
      lifecycleHistory: true,
      bomItems: true,
      componentItems: true,
    },
  });

  return part;
}

/**
 * Get part by ID
 */
async getPartById(id: string, includeRelations: boolean = true) {
  const part = await this.prisma.part.findUnique({
    where: { id },
    include: includeRelations ? {
      specifications: true,
      configurations: {
        include: {
          options: true,
        },
      },
      lifecycleHistory: {
        orderBy: { transitionDate: 'desc' },
        take: 10,
      },
      bomItems: {
        include: {
          componentPart: true,
          operation: true,
        },
      },
      componentItems: {
        include: {
          parentPart: true,
        },
      },
      replacementPart: true,
      workOrders: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
    } : undefined,
  });

  if (!part) {
    throw new Error(`Part with ID ${id} not found`);
  }

  return part;
}

/**
 * Get part by part number
 */
async getPartByPartNumber(partNumber: string, includeRelations: boolean = true) {
  const part = await this.prisma.part.findUnique({
    where: { partNumber },
    include: includeRelations ? {
      specifications: true,
      configurations: {
        include: {
          options: true,
        },
      },
      lifecycleHistory: {
        orderBy: { transitionDate: 'desc' },
        take: 10,
      },
      bomItems: {
        include: {
          componentPart: true,
          operation: true,
        },
      },
    } : undefined,
  });

  if (!part) {
    throw new Error(`Part with part number ${partNumber} not found`);
  }

  return part;
}

/**
 * Get all parts with optional filters
 */
async getAllParts(filters: {
  partType?: string;
  productType?: ProductType;
  lifecycleState?: ProductLifecycleState;
  makeOrBuy?: string;
  isActive?: boolean;
  isConfigurable?: boolean;
}, includeRelations: boolean = false) {
  const where: Prisma.PartWhereInput = {};

  if (filters.partType) {
    where.partType = filters.partType;
  }

  if (filters.productType) {
    where.productType = filters.productType;
  }

  if (filters.lifecycleState) {
    where.lifecycleState = filters.lifecycleState;
  }

  if (filters.makeOrBuy) {
    where.makeOrBuy = filters.makeOrBuy;
  }

  if (filters.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  if (filters.isConfigurable !== undefined) {
    where.isConfigurable = filters.isConfigurable;
  }

  const parts = await this.prisma.part.findMany({
    where,
    include: includeRelations ? {
      specifications: true,
      configurations: true,
      bomItems: {
        include: {
          componentPart: true,
        },
      },
    } : undefined,
    orderBy: { partNumber: 'asc' },
  });

  return parts;
}

/**
 * Update part
 */
async updatePart(id: string, data: Partial<{
  partName: string;
  description: string;
  partType: string;
  productType: ProductType;
  lifecycleState: ProductLifecycleState;
  unitOfMeasure: string;
  weight: number;
  weightUnit: string;
  drawingNumber: string;
  revision: string;
  cadModelUrl: string;
  releaseDate: Date;
  obsoleteDate: Date;
  replacementPartId: string;
  makeOrBuy: string;
  leadTimeDays: number;
  lotSizeMin: number;
  lotSizeMultiple: number;
  standardCost: number;
  targetCost: number;
  currency: string;
  isActive: boolean;
  isConfigurable: boolean;
  requiresFAI: boolean;
}>) {
  const part = await this.prisma.part.update({
    where: { id },
    data,
    include: {
      specifications: true,
      configurations: true,
      lifecycleHistory: true,
    },
  });

  return part;
}

/**
 * Delete part (soft delete by default)
 */
async deletePart(id: string, hardDelete: boolean = false) {
  if (hardDelete) {
    await this.prisma.part.delete({
      where: { id },
    });
    return { message: 'Part permanently deleted', id };
  } else {
    await this.prisma.part.update({
      where: { id },
      data: { isActive: false },
    });
    return { message: 'Part deactivated', id };
  }
}

// ============================================================================
// PRODUCT SPECIFICATION OPERATIONS
// ============================================================================

/**
 * Add specification to part
 */
async addSpecification(partId: string, data: {
  specificationName: string;
  specificationType: SpecificationType;
  specificationValue?: string;
  nominalValue?: number;
  minValue?: number;
  maxValue?: number;
  unitOfMeasure?: string;
  testMethod?: string;
  inspectionFrequency?: string;
  isCritical?: boolean;
  isRegulatory?: boolean;
  documentReferences?: string[];
  notes?: string;
}) {
  const spec = await this.prisma.productSpecification.create({
    data: {
      partId,
      ...data,
      documentReferences: data.documentReferences || [],
    },
  });

  return spec;
}

/**
 * Get all specifications for a part
 */
async getPartSpecifications(partId: string) {
  const specs = await this.prisma.productSpecification.findMany({
    where: { partId },
    orderBy: [
      { isCritical: 'desc' },
      { specificationType: 'asc' },
      { specificationName: 'asc' },
    ],
  });

  return specs;
}

/**
 * Update specification
 */
async updateSpecification(specificationId: string, data: Partial<{
  specificationName: string;
  specificationType: SpecificationType;
  specificationValue: string;
  nominalValue: number;
  minValue: number;
  maxValue: number;
  unitOfMeasure: string;
  testMethod: string;
  inspectionFrequency: string;
  isCritical: boolean;
  isRegulatory: boolean;
  documentReferences: string[];
  notes: string;
  isActive: boolean;
}>) {
  const spec = await this.prisma.productSpecification.update({
    where: { id: specificationId },
    data,
  });

  return spec;
}

/**
 * Delete specification
 */
async deleteSpecification(specificationId: string) {
  await this.prisma.productSpecification.delete({
    where: { id: specificationId },
  });

  return { message: 'Specification deleted', id: specificationId };
}

// ============================================================================
// PRODUCT CONFIGURATION OPERATIONS
// ============================================================================

/**
 * Add configuration to part
 */
async addConfiguration(partId: string, data: {
  configurationName: string;
  configurationType: ConfigurationType;
  description?: string;
  configurationCode?: string;
  attributes?: any;
  priceModifier?: number;
  costModifier?: number;
  leadTimeDelta?: number;
  isAvailable?: boolean;
  effectiveDate?: Date;
  obsoleteDate?: Date;
  isDefault?: boolean;
  marketingName?: string;
  imageUrl?: string;
}) {
  const config = await this.prisma.productConfiguration.create({
    data: {
      partId,
      ...data,
    },
    include: {
      options: true,
    },
  });

  return config;
}

/**
 * Get all configurations for a part
 */
async getPartConfigurations(partId: string) {
  const configs = await this.prisma.productConfiguration.findMany({
    where: { partId },
    include: {
      options: true,
    },
    orderBy: [
      { isDefault: 'desc' },
      { configurationName: 'asc' },
    ],
  });

  return configs;
}

/**
 * Update configuration
 */
async updateConfiguration(configurationId: string, data: Partial<{
  configurationName: string;
  configurationType: ConfigurationType;
  description: string;
  configurationCode: string;
  attributes: any;
  priceModifier: number;
  costModifier: number;
  leadTimeDelta: number;
  isAvailable: boolean;
  effectiveDate: Date;
  obsoleteDate: Date;
  isDefault: boolean;
  marketingName: string;
  imageUrl: string;
  isActive: boolean;
}>) {
  const config = await this.prisma.productConfiguration.update({
    where: { id: configurationId },
    data,
    include: {
      options: true,
    },
  });

  return config;
}

/**
 * Delete configuration
 */
async deleteConfiguration(configurationId: string) {
  await this.prisma.productConfiguration.delete({
    where: { id: configurationId },
  });

  return { message: 'Configuration deleted', id: configurationId };
}

/**
 * Add option to configuration
 */
async addConfigurationOption(configurationId: string, data: {
  optionName: string;
  optionCode?: string;
  description?: string;
  optionCategory?: string;
  optionValue?: string;
  isRequired?: boolean;
  isDefault?: boolean;
  addedPartIds?: string[];
  removedPartIds?: string[];
  priceModifier?: number;
  costModifier?: number;
  displayOrder?: number;
}) {
  const option = await this.prisma.configurationOption.create({
    data: {
      configurationId,
      ...data,
      addedPartIds: data.addedPartIds || [],
      removedPartIds: data.removedPartIds || [],
    },
  });

  return option;
}

/**
 * Update configuration option
 */
async updateConfigurationOption(optionId: string, data: Partial<{
  optionName: string;
  optionCode: string;
  description: string;
  optionCategory: string;
  optionValue: string;
  isRequired: boolean;
  isDefault: boolean;
  addedPartIds: string[];
  removedPartIds: string[];
  priceModifier: number;
  costModifier: number;
  displayOrder: number;
}>) {
  const option = await this.prisma.configurationOption.update({
    where: { id: optionId },
    data,
  });

  return option;
}

/**
 * Delete configuration option
 */
async deleteConfigurationOption(optionId: string) {
  await this.prisma.configurationOption.delete({
    where: { id: optionId },
  });

  return { message: 'Configuration option deleted', id: optionId };
}

// ============================================================================
// PRODUCT LIFECYCLE OPERATIONS
// ============================================================================

/**
 * Transition part to new lifecycle state
 */
async transitionLifecycleState(partId: string, data: {
  newState: ProductLifecycleState;
  reason?: string;
  ecoNumber?: string;
  approvedBy?: string;
  approvedAt?: Date;
  notificationsSent?: boolean;
  impactAssessment?: string;
  notes?: string;
  metadata?: any;
}) {
  // Get current part state
  const part = await this.prisma.part.findUnique({
    where: { id: partId },
    select: { lifecycleState: true },
  });

  if (!part) {
    throw new Error(`Part with ID ${partId} not found`);
  }

  // Create lifecycle history record
  const lifecycleRecord = await this.prisma.productLifecycle.create({
    data: {
      partId,
      previousState: part.lifecycleState,
      newState: data.newState,
      transitionDate: new Date(),
      reason: data.reason,
      ecoNumber: data.ecoNumber,
      approvedBy: data.approvedBy,
      approvedAt: data.approvedAt,
      notificationsSent: data.notificationsSent || false,
      impactAssessment: data.impactAssessment,
      notes: data.notes,
      metadata: data.metadata,
    },
  });

  // Update part lifecycle state
  await this.prisma.part.update({
    where: { id: partId },
    data: {
      lifecycleState: data.newState,
      ...(data.newState === 'OBSOLETE' ? { obsoleteDate: new Date() } : {}),
    },
  });

  return lifecycleRecord;
}

/**
 * Get lifecycle history for a part
 */
async getPartLifecycleHistory(partId: string) {
  const history = await this.prisma.productLifecycle.findMany({
    where: { partId },
    orderBy: { transitionDate: 'desc' },
  });

  return history;
}

// ============================================================================
// BOM OPERATIONS (Enhanced with Process Segment Integration)
// ============================================================================

/**
 * Add BOM item to part
 */
async addBOMItem(data: {
  parentPartId: string;
  componentPartId: string;
  quantity: number;
  unitOfMeasure: string;
  scrapFactor?: number;
  sequence?: number;
  findNumber?: string;
  referenceDesignator?: string;
  operationId?: string;
  operationNumber?: number;
  effectiveDate?: Date;
  obsoleteDate?: Date;
  ecoNumber?: string;
  isOptional?: boolean;
  isCritical?: boolean;
  notes?: string;
}) {
  const bomItem = await this.prisma.bOMItem.create({
    data: {
      ...data,
      scrapFactor: data.scrapFactor || 0,
    },
    include: {
      parentPart: true,
      componentPart: true,
      operation: true,
    },
  });

  return bomItem;
}

/**
 * Get BOM for a part (all components)
 */
async getPartBOM(partId: string, includeProcessSegments: boolean = true) {
  const bomItems = await this.prisma.bOMItem.findMany({
    where: { parentPartId: partId, isActive: true },
    include: {
      componentPart: true,
      operation: includeProcessSegments,
    },
    orderBy: [
      { sequence: 'asc' },
      { findNumber: 'asc' },
    ],
  });

  return bomItems;
}

/**
 * Get where-used for a part (all parents that use this part)
 */
async getPartWhereUsed(partId: string) {
  const whereUsed = await this.prisma.bOMItem.findMany({
    where: { componentPartId: partId, isActive: true },
    include: {
      parentPart: true,
      operation: true,
    },
    orderBy: { parentPart: { partNumber: 'asc' } },
  });

  return whereUsed;
}

/**
 * Update BOM item
 */
async updateBOMItem(bomItemId: string, data: Partial<{
  quantity: number;
  unitOfMeasure: string;
  scrapFactor: number;
  sequence: number;
  findNumber: string;
  referenceDesignator: string;
  operationId: string;
  operationNumber: number;
  effectiveDate: Date;
  obsoleteDate: Date;
  ecoNumber: string;
  isOptional: boolean;
  isCritical: boolean;
  notes: string;
  isActive: boolean;
}>) {
  const bomItem = await this.prisma.bOMItem.update({
    where: { id: bomItemId },
    data,
    include: {
      parentPart: true,
      componentPart: true,
      operation: true,
    },
  });

  return bomItem;
}

/**
 * Delete BOM item
 */
async deleteBOMItem(bomItemId: string, hardDelete: boolean = false) {
  if (hardDelete) {
    await this.prisma.bOMItem.delete({
      where: { id: bomItemId },
    });
    return { message: 'BOM item permanently deleted', id: bomItemId };
  } else {
    await this.prisma.bOMItem.update({
      where: { id: bomItemId },
      data: { isActive: false },
    });
    return { message: 'BOM item deactivated', id: bomItemId };
  }
}

// ============================================================================
// STATISTICS AND REPORTING
// ============================================================================

/**
 * Get product definition statistics
 */
async getStatistics() {
  const [
    totalParts,
    activeParts,
    inactiveParts,
    partsByType,
    partsByLifecycleState,
    totalSpecifications,
    criticalSpecifications,
    totalConfigurations,
    totalOptions,
    totalBOMItems,
    lifecycleTransitions,
  ] = await Promise.all([
    this.prisma.part.count(),
    this.prisma.part.count({ where: { isActive: true } }),
    this.prisma.part.count({ where: { isActive: false } }),
    this.prisma.part.groupBy({
      by: ['productType'],
      _count: true,
    }),
    this.prisma.part.groupBy({
      by: ['lifecycleState'],
      _count: true,
    }),
    this.prisma.productSpecification.count(),
    this.prisma.productSpecification.count({ where: { isCritical: true } }),
    this.prisma.productConfiguration.count(),
    this.prisma.configurationOption.count(),
    this.prisma.bOMItem.count({ where: { isActive: true } }),
    this.prisma.productLifecycle.count(),
  ]);

  return {
    parts: {
      total: totalParts,
      active: activeParts,
      inactive: inactiveParts,
      byType: partsByType.reduce((acc, item) => {
        acc[item.productType] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byLifecycleState: partsByLifecycleState.reduce((acc, item) => {
        acc[item.lifecycleState] = item._count;
        return acc;
      }, {} as Record<string, number>),
    },
    specifications: {
      total: totalSpecifications,
      critical: criticalSpecifications,
    },
    configurations: {
      total: totalConfigurations,
      options: totalOptions,
    },
    bom: {
      totalItems: totalBOMItems,
    },
    lifecycle: {
      totalTransitions: lifecycleTransitions,
    },
  };
}

/**
 * Get configurable parts
 */
async getConfigurableParts() {
  const parts = await this.prisma.part.findMany({
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

  return parts;
}

/**
 * Get parts by lifecycle state
 */
async getPartsByLifecycleState(lifecycleState: ProductLifecycleState) {
  const parts = await this.prisma.part.findMany({
    where: {
      lifecycleState,
      isActive: true,
    },
    orderBy: { partNumber: 'asc' },
  });

  return parts;
}

}

export default new ProductService();
