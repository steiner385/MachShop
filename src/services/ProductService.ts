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

import { ProductType, ProductLifecycleState, ConfigurationType, SpecificationType, Prisma, MakeOrBuyDecision } from '@prisma/client';
import prisma from '../lib/database';

// Guard check for prisma instance
if (!prisma) {
  throw new Error('Database connection not available. Check DATABASE_URL environment variable and database server connectivity.');
}

export class ProductService {
  constructor() {
  }

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
  makeOrBuy?: MakeOrBuyDecision;
  leadTimeDays?: number;
  lotSizeMin?: number;
  lotSizeMultiple?: number;
  standardCost?: number;
  targetCost?: number;
  currency?: string;
  isConfigurable?: boolean;
  requiresFAI?: boolean;
}) {
  // Prepare UOM data (both string and FK)
  const uomData = await this.prepareUomData(data.unitOfMeasure);

  const part = await prisma.part.create({
    data: {
      ...data,
      unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
      unitOfMeasureId: uomData.unitOfMeasureId,
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
  const part = await prisma.part.findUnique({
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
  const part = await prisma.part.findUnique({
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
 * Get part by persistent UUID (MBE traceability)
 * Supports NIST AMS 300-12 compliant UUID-based lookup
 */
async getPartByPersistentUuid(persistentUuid: string, includeRelations: boolean = true) {
  // Import UUID utilities for validation
  const { normalizePersistentUUID } = await import('../utils/uuidUtils');

  const normalizedUuid = normalizePersistentUUID(persistentUuid);

  const part = await prisma.part.findFirst({
    where: { persistentUuid: normalizedUuid },
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
      serializedParts: {
        take: 5,
        orderBy: { createdAt: 'desc' },
      },
      qualityPlans: true,
      routings: {
        where: { isActive: true },
        take: 5,
      },
      unitOfMeasureRef: true,
    } : undefined,
  });

  if (!part) {
    throw new Error(`Part with persistent UUID ${persistentUuid} not found`);
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
  makeOrBuy?: MakeOrBuyDecision;
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

  const parts = await prisma.part.findMany({
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
  makeOrBuy: MakeOrBuyDecision;
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
  // Check if part exists first
  const existingPart = await prisma.part.findUnique({
    where: { id },
  });

  if (!existingPart) {
    throw new Error(`Part with ID ${id} not found`);
  }

  const part = await prisma.part.update({
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
  // Use transaction to ensure atomicity of part deletion with related records
  return await prisma.$transaction(async (prisma) => {
    // Check if part exists first
    const existingPart = await prisma.part.findUnique({
      where: { id },
      include: {
        bomItems: { where: { isActive: true } },
        componentItems: { where: { isActive: true } },
        configurations: { where: { isActive: true } },
        specifications: { where: { isActive: true } },
      },
    });

    if (!existingPart) {
      throw new Error(`Part with ID ${id} not found`);
    }

    if (hardDelete) {
      // For hard delete, we need to check dependencies
      if (existingPart.componentItems.length > 0) {
        const parentParts = existingPart.componentItems.map(item => item.parentPartId || 'Unknown').join(', ');
        throw new Error(`Cannot delete part ${existingPart.partNumber} - it is used as component in parts: ${parentParts}`);
      }

      // Hard delete (cascade will handle related records)
      await prisma.part.delete({
        where: { id },
      });
      return { message: 'Part permanently deleted', id };
    } else {
      // Soft delete: deactivate part and related records atomically
      await prisma.part.update({
        where: { id },
        data: { isActive: false },
      });

      // Deactivate all BOM items where this part is the parent
      if (existingPart.bomItems.length > 0) {
        await prisma.bOMItem.updateMany({
          where: { parentPartId: id, isActive: true },
          data: { isActive: false },
        });
      }

      // Deactivate all configurations for this part
      if (existingPart.configurations.length > 0) {
        // First delete all configuration options for active configurations
        // (ConfigurationOption has no isActive field, so we delete them)
        for (const config of existingPart.configurations) {
          await prisma.configurationOption.deleteMany({
            where: { configurationId: config.id },
          });
        }

        // Then deactivate the configurations
        await prisma.productConfiguration.updateMany({
          where: { partId: id, isActive: true },
          data: { isActive: false },
        });
      }

      // Deactivate all specifications for this part
      if (existingPart.specifications.length > 0) {
        await prisma.productSpecification.updateMany({
          where: { partId: id, isActive: true },
          data: { isActive: false },
        });
      }

      return {
        message: 'Part and related records deactivated',
        id,
        affectedRecords: {
          bomItems: existingPart.bomItems.length,
          configurations: existingPart.configurations.length,
          specifications: existingPart.specifications.length,
        }
      };
    }
  });
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
  const spec = await prisma.productSpecification.create({
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
  const specs = await prisma.productSpecification.findMany({
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
  // Check if specification exists first
  const existingSpec = await prisma.productSpecification.findUnique({
    where: { id: specificationId },
  });

  if (!existingSpec) {
    throw new Error(`Product specification with ID ${specificationId} not found`);
  }

  const spec = await prisma.productSpecification.update({
    where: { id: specificationId },
    data,
  });

  return spec;
}

/**
 * Delete specification
 */
async deleteSpecification(specificationId: string) {
  // Check if specification exists first
  const existingSpec = await prisma.productSpecification.findUnique({
    where: { id: specificationId },
  });

  if (!existingSpec) {
    throw new Error(`Product specification with ID ${specificationId} not found`);
  }

  await prisma.productSpecification.delete({
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
  // ✅ PHASE 6F FIX: Validate part exists before creating configuration
  const existingPart = await prisma.part.findUnique({
    where: { id: partId },
    select: { id: true, isActive: true }
  });

  if (!existingPart) {
    throw new Error(`Part with ID ${partId} not found - cannot create configuration`);
  }

  if (!existingPart.isActive) {
    throw new Error(`Part with ID ${partId} is not active - cannot create configuration`);
  }

  const config = await prisma.productConfiguration.create({
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
  // ✅ PHASE 6F FIX: Validate part exists before querying configurations
  const existingPart = await prisma.part.findUnique({
    where: { id: partId },
    select: { id: true, isActive: true }
  });

  if (!existingPart) {
    throw new Error(`Part with ID ${partId} not found - cannot retrieve configurations`);
  }

  const configs = await prisma.productConfiguration.findMany({
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
  // ✅ PHASE 6F FIX: Enhanced validation for configuration updates
  const existingConfig = await prisma.productConfiguration.findUnique({
    where: { id: configurationId },
    select: { id: true, isActive: true, partId: true }
  });

  if (!existingConfig) {
    throw new Error(`Product configuration with ID ${configurationId} not found`);
  }

  if (!existingConfig.isActive) {
    throw new Error(`Product configuration with ID ${configurationId} is not active - cannot update`);
  }

  // Validate that the parent part is still active
  const parentPart = await prisma.part.findUnique({
    where: { id: existingConfig.partId },
    select: { id: true, isActive: true }
  });

  if (!parentPart?.isActive) {
    throw new Error(`Parent part is not active - cannot update configuration ${configurationId}`);
  }

  const config = await prisma.productConfiguration.update({
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
  // Check if configuration exists first
  const existingConfig = await prisma.productConfiguration.findUnique({
    where: { id: configurationId },
  });

  if (!existingConfig) {
    throw new Error(`Product configuration with ID ${configurationId} not found`);
  }

  // CRITICAL: Delete all configuration options first to avoid foreign key constraint violations
  // ConfigurationOption has a foreign key to ProductConfiguration
  await prisma.configurationOption.deleteMany({
    where: { configurationId: configurationId },
  });

  // Now safe to delete the configuration
  await prisma.productConfiguration.delete({
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
  // ✅ PHASE 7C FIX: Validate configurationId parameter is provided
  if (!configurationId || configurationId === 'undefined') {
    throw new Error(`Configuration ID is required but was: ${configurationId}. This indicates a test setup failure or missing configuration creation.`);
  }

  // CRITICAL: Validate configuration exists and is active before creating option
  const existingConfiguration = await prisma.productConfiguration.findUnique({
    where: { id: configurationId },
    select: { id: true, isActive: true }
  });

  if (!existingConfiguration) {
    throw new Error(`Product configuration with ID ${configurationId} not found - cannot create configuration option`);
  }

  if (!existingConfiguration.isActive) {
    throw new Error(`Product configuration with ID ${configurationId} is not active - cannot create configuration option`);
  }

  // CRITICAL: Validate part IDs exist if provided to prevent foreign key violations
  if (data.addedPartIds && data.addedPartIds.length > 0) {
    const existingParts = await prisma.part.findMany({
      where: {
        id: { in: data.addedPartIds },
        isActive: true
      },
      select: { id: true }
    });

    const missingPartIds = data.addedPartIds.filter(
      partId => !existingParts.some(part => part.id === partId)
    );

    if (missingPartIds.length > 0) {
      throw new Error(`The following part IDs do not exist or are inactive: ${missingPartIds.join(', ')}`);
    }
  }

  if (data.removedPartIds && data.removedPartIds.length > 0) {
    const existingParts = await prisma.part.findMany({
      where: {
        id: { in: data.removedPartIds },
        isActive: true
      },
      select: { id: true }
    });

    const missingPartIds = data.removedPartIds.filter(
      partId => !existingParts.some(part => part.id === partId)
    );

    if (missingPartIds.length > 0) {
      throw new Error(`The following part IDs do not exist or are inactive: ${missingPartIds.join(', ')}`);
    }
  }

  const option = await prisma.configurationOption.create({
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
  // ✅ PHASE 7C FIX: Validate optionId parameter is provided
  if (!optionId || optionId === 'undefined') {
    throw new Error(`Option ID is required but was: ${optionId}. This indicates a test setup failure or missing option creation.`);
  }

  // CRITICAL: Check if option exists and its configuration is active
  const existingOption = await prisma.configurationOption.findUnique({
    where: { id: optionId },
    include: {
      configuration: {
        select: { id: true, isActive: true }
      }
    }
  });

  if (!existingOption) {
    throw new Error(`Configuration option with ID ${optionId} not found`);
  }

  if (!existingOption.configuration?.isActive) {
    throw new Error(`Configuration option with ID ${optionId} belongs to an inactive configuration - cannot update`);
  }

  // CRITICAL: Validate part IDs exist if being updated to prevent foreign key violations
  if (data.addedPartIds && data.addedPartIds.length > 0) {
    const existingParts = await prisma.part.findMany({
      where: {
        id: { in: data.addedPartIds },
        isActive: true
      },
      select: { id: true }
    });

    const missingPartIds = data.addedPartIds.filter(
      partId => !existingParts.some(part => part.id === partId)
    );

    if (missingPartIds.length > 0) {
      throw new Error(`The following part IDs do not exist or are inactive: ${missingPartIds.join(', ')}`);
    }
  }

  if (data.removedPartIds && data.removedPartIds.length > 0) {
    const existingParts = await prisma.part.findMany({
      where: {
        id: { in: data.removedPartIds },
        isActive: true
      },
      select: { id: true }
    });

    const missingPartIds = data.removedPartIds.filter(
      partId => !existingParts.some(part => part.id === partId)
    );

    if (missingPartIds.length > 0) {
      throw new Error(`The following part IDs do not exist or are inactive: ${missingPartIds.join(', ')}`);
    }
  }

  const option = await prisma.configurationOption.update({
    where: { id: optionId },
    data,
  });

  return option;
}

/**
 * Delete configuration option
 */
async deleteConfigurationOption(optionId: string) {
  // ✅ PHASE 7C FIX: Validate optionId parameter is provided
  if (!optionId || optionId === 'undefined') {
    throw new Error(`Option ID is required but was: ${optionId}. This indicates a test setup failure or missing option creation.`);
  }

  // CRITICAL: Check if option exists and validate configuration state
  const existingOption = await prisma.configurationOption.findUnique({
    where: { id: optionId },
    include: {
      configuration: {
        select: { id: true, isActive: true }
      }
    }
  });

  if (!existingOption) {
    throw new Error(`Configuration option with ID ${optionId} not found`);
  }

  if (!existingOption.configuration?.isActive) {
    throw new Error(`Configuration option with ID ${optionId} belongs to an inactive configuration - cannot delete`);
  }

  // CRITICAL: Safe deletion with proper constraint handling
  try {
    await prisma.configurationOption.delete({
      where: { id: optionId },
    });
  } catch (error: any) {
    if (error.code === 'P2003') {
      throw new Error(`Cannot delete configuration option - it is referenced by other records. Please remove references first.`);
    }
    throw error;
  }

  return { message: 'Configuration option deleted successfully', id: optionId };
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
  // Use transaction to ensure atomicity of lifecycle transition
  return await prisma.$transaction(async (prisma) => {
    // Get current part state
    const part = await prisma.part.findUnique({
      where: { id: partId },
      select: { lifecycleState: true },
    });

    if (!part) {
      throw new Error(`Part with ID ${partId} not found`);
    }

    // Create lifecycle history record
    const lifecycleRecord = await prisma.productLifecycle.create({
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

    // Update part lifecycle state atomically
    await prisma.part.update({
      where: { id: partId },
      data: {
        lifecycleState: data.newState,
        ...(data.newState === 'OBSOLETE' ? { obsoleteDate: new Date() } : {}),
      },
    });

    return lifecycleRecord;
  });
}

/**
 * Get lifecycle history for a part
 */
async getPartLifecycleHistory(partId: string) {
  const history = await prisma.productLifecycle.findMany({
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
  // Prepare UOM data (both string and FK)
  const uomData = await this.prepareUomData(data.unitOfMeasure);

  // Use transaction to ensure atomicity of BOM item creation with validation
  return await prisma.$transaction(async (prisma) => {
    // Validate parent part exists
    const parentPart = await prisma.part.findUnique({
      where: { id: data.parentPartId },
      select: { id: true, partNumber: true, isActive: true },
    });

    if (!parentPart) {
      throw new Error(`Parent part with ID ${data.parentPartId} not found`);
    }

    if (!parentPart.isActive) {
      throw new Error(`Parent part ${parentPart.partNumber} is not active`);
    }

    // Validate component part exists
    const componentPart = await prisma.part.findUnique({
      where: { id: data.componentPartId },
      select: { id: true, partNumber: true, isActive: true },
    });

    if (!componentPart) {
      throw new Error(`Component part with ID ${data.componentPartId} not found`);
    }

    if (!componentPart.isActive) {
      throw new Error(`Component part ${componentPart.partNumber} is not active`);
    }

    // Validate operation exists if specified
    if (data.operationId) {
      const operation = await prisma.operation.findUnique({
        where: { id: data.operationId },
        select: { id: true, isActive: true },
      });

      if (!operation) {
        throw new Error(`Operation with ID ${data.operationId} not found`);
      }

      if (!operation.isActive) {
        throw new Error(`Operation with ID ${data.operationId} is not active`);
      }
    }

    // Check for circular reference (component cannot be parent of itself)
    if (data.parentPartId === data.componentPartId) {
      throw new Error('Cannot add part as component of itself (circular reference)');
    }

    // Create BOM item atomically
    const bomItem = await prisma.bOMItem.create({
      data: {
        ...data,
        unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
        unitOfMeasureId: uomData.unitOfMeasureId,
        scrapFactor: data.scrapFactor || 0,
      },
      include: {
        parentPart: true,
        componentPart: true,
        operation: true,
      },
    });

    return bomItem;
  });
}

/**
 * Get BOM for a part (all components)
 */
async getPartBOM(partId: string, includeProcessSegments: boolean = true) {
  const bomItems = await prisma.bOMItem.findMany({
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
  const whereUsed = await prisma.bOMItem.findMany({
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
  // Check if BOM item exists first
  const existingBOMItem = await prisma.bOMItem.findUnique({
    where: { id: bomItemId },
  });

  if (!existingBOMItem) {
    throw new Error(`BOM item with ID ${bomItemId} not found`);
  }

  // Prepare UOM data if unitOfMeasure is being updated
  const uomData = data.unitOfMeasure ? await this.prepareUomData(data.unitOfMeasure) : {};

  const bomItem = await prisma.bOMItem.update({
    where: { id: bomItemId },
    data: {
      ...data,
      ...(data.unitOfMeasure && {
        unitOfMeasure: uomData.unitOfMeasure || data.unitOfMeasure,
        unitOfMeasureId: uomData.unitOfMeasureId,
      }),
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
 * Delete BOM item
 */
async deleteBOMItem(bomItemId: string, hardDelete: boolean = false) {
  // Check if BOM item exists first
  const existingBOMItem = await prisma.bOMItem.findUnique({
    where: { id: bomItemId },
  });

  if (!existingBOMItem) {
    throw new Error(`BOM item with ID ${bomItemId} not found`);
  }

  if (hardDelete) {
    await prisma.bOMItem.delete({
      where: { id: bomItemId },
    });
    return { message: 'BOM item permanently deleted', id: bomItemId };
  } else {
    await prisma.bOMItem.update({
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
    prisma.part.count(),
    prisma.part.count({ where: { isActive: true } }),
    prisma.part.count({ where: { isActive: false } }),
    prisma.part.groupBy({
      by: ['productType'],
      _count: true,
    }),
    prisma.part.groupBy({
      by: ['lifecycleState'],
      _count: true,
    }),
    prisma.productSpecification.count(),
    prisma.productSpecification.count({ where: { isCritical: true } }),
    prisma.productConfiguration.count(),
    prisma.configurationOption.count(),
    prisma.bOMItem.count({ where: { isActive: true } }),
    prisma.productLifecycle.count(),
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
  const parts = await prisma.part.findMany({
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
  const parts = await prisma.part.findMany({
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
