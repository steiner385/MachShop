/**
 * Kit Generation Service
 *
 * Handles automatic kit generation from Bill of Materials (BOM) structures.
 * Supports multi-level BOM analysis, quantity calculations with scrap factors,
 * and intelligent staging location assignment for engine assembly operations.
 */

import { PrismaClient, Kit, KitItem, BOMItem, Part, Inventory, KitStatus, KitPriority, KitItemStatus } from '@prisma/client';
import { logger } from '../utils/logger';
import {
  KittingError,
  KittingErrorHandler,
  KittingErrorType,
  KittingErrorSeverity,
  KittingCircuitBreaker
} from '../utils/kittingErrors';

export interface KitGenerationOptions {
  workOrderId: string;
  operationId?: string;
  assemblyStage?: string;
  workCellId?: string;
  priority?: KitPriority;
  scrapFactor?: number;
  autoStage?: boolean;
  includeTools?: boolean;
  vendorKitHandling?: 'include' | 'separate' | 'exclude';
  maxKitSize?: number; // Maximum number of items per kit
}

export interface BOMAnalysisResult {
  totalItems: number;
  totalQuantity: number;
  maxDepth: number;
  vendorKitItems: BOMItemWithDetails[];
  criticalItems: BOMItemWithDetails[];
  hazardousItems: BOMItemWithDetails[];
  longLeadTimeItems: BOMItemWithDetails[];
}

export interface BOMItemWithDetails extends BOMItem {
  componentPart: Part;
  availableInventory?: Inventory[];
  shortfallQuantity?: number;
  isVendorKit?: boolean;
  estimatedLeadTime?: number;
}

export interface KitGenerationResult {
  kits: Kit[];
  analysis: BOMAnalysisResult;
  shortages: ShortageItem[];
  warnings: string[];
  estimatedStagingTime: number; // in minutes
}

export interface ShortageItem {
  partId: string;
  partNumber: string;
  requiredQuantity: number;
  availableQuantity: number;
  shortfallQuantity: number;
  preferredSuppliers: string[];
  estimatedLeadTime: number;
}

export class KitGenerationService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Generate kits for a work order based on BOM analysis
   */
  async generateKitsForWorkOrder(options: KitGenerationOptions): Promise<KitGenerationResult> {
    logger.info(`Generating kits for work order ${options.workOrderId}`, { options });

    return KittingErrorHandler.handleError(
      new Error('Kit generation operation'),
      async () => {
        // Get work order details
        const workOrder = await this.getWorkOrderWithBOM(options.workOrderId);
        if (!workOrder) {
          throw KittingErrorHandler.createKitError(
            KittingErrorType.INVALID_WORK_ORDER,
            `Work order ${options.workOrderId} not found or is invalid`,
            undefined,
            options.workOrderId
          );
        }

        // Validate work order has valid part and BOM
        if (!workOrder.partId) {
          throw KittingErrorHandler.createKitError(
            KittingErrorType.INVALID_WORK_ORDER,
            'Work order does not have a valid part assigned',
            undefined,
            options.workOrderId
          );
        }

        // Analyze BOM structure with error handling
        let analysis: BOMAnalysisResult;
        try {
          analysis = await this.analyzeBOMStructure(workOrder.partId, workOrder.quantity, options.scrapFactor);
        } catch (error) {
          if (error.message.includes('circular')) {
            throw KittingErrorHandler.createKitError(
              KittingErrorType.CIRCULAR_BOM_REFERENCE,
              'Circular reference detected in Bill of Materials structure',
              undefined,
              options.workOrderId,
              { partId: workOrder.partId }
            );
          }
          throw KittingErrorHandler.createKitError(
            KittingErrorType.BOM_ANALYSIS_FAILED,
            `Failed to analyze BOM structure: ${error.message}`,
            undefined,
            options.workOrderId,
            { partId: workOrder.partId, originalError: error.message }
          );
        }

        // Check for critical shortages before proceeding
        const shortages = await this.identifyShortages(analysis);
        const criticalShortages = shortages.filter(s => s.shortfallQuantity > s.requiredQuantity * 0.5);

        if (criticalShortages.length > 0) {
          throw KittingErrorHandler.createKitError(
            KittingErrorType.CRITICAL_SHORTAGE,
            `Critical material shortages detected for ${criticalShortages.length} items`,
            undefined,
            options.workOrderId,
            {
              criticalShortages: criticalShortages.map(s => ({
                partNumber: s.partNumber,
                required: s.requiredQuantity,
                available: s.availableQuantity,
                shortfall: s.shortfallQuantity
              }))
            }
          );
        }

        // Generate kit structure based on analysis
        const kitStructure = await this.generateKitStructure(workOrder, analysis, options);

        // Create kits in database with transaction
        let kits: Kit[];
        try {
          kits = await this.createKits(kitStructure, options);
        } catch (error) {
          throw KittingErrorHandler.createKitError(
            KittingErrorType.DATA_INTEGRITY_VIOLATION,
            `Failed to create kits in database: ${error.message}`,
            undefined,
            options.workOrderId,
            { originalError: error.message }
          );
        }

        // Generate warnings
        const warnings = this.generateWarnings(analysis, shortages);

        // Calculate staging time estimate
        const estimatedStagingTime = this.calculateStagingTime(analysis);

        logger.info(`Generated ${kits.length} kits for work order ${options.workOrderId}`, {
          totalKits: kits.length,
          totalItems: analysis.totalItems,
          shortages: shortages.length
        });

        return {
          kits,
          analysis,
          shortages,
          warnings,
          estimatedStagingTime
        };
      },
      3, // max retries
      1000 // backoff ms
    );
  }

  /**
   * Analyze multi-level BOM structure
   */
  private async analyzeBOMStructure(
    rootPartId: string,
    quantity: number,
    scrapFactor: number = 0.05
  ): Promise<BOMAnalysisResult> {
    const analysis: BOMAnalysisResult = {
      totalItems: 0,
      totalQuantity: 0,
      maxDepth: 0,
      vendorKitItems: [],
      criticalItems: [],
      hazardousItems: [],
      longLeadTimeItems: []
    };

    // Recursive BOM traversal
    await this.traverseBOM(rootPartId, quantity, 0, analysis, scrapFactor);

    return analysis;
  }

  /**
   * Recursively traverse BOM structure
   */
  private async traverseBOM(
    partId: string,
    quantity: number,
    depth: number,
    analysis: BOMAnalysisResult,
    scrapFactor: number,
    visited: Set<string> = new Set()
  ): Promise<void> {
    // Prevent infinite loops in circular BOMs
    if (visited.has(partId)) {
      const visitedPath = Array.from(visited).join(' -> ') + ' -> ' + partId;
      throw new KittingError(
        KittingErrorType.CIRCULAR_BOM_REFERENCE,
        `Circular BOM reference detected for part ${partId}`,
        {
          context: {
            partId,
            depth,
            visitedPath,
            quantity
          }
        }
      );
    }
    visited.add(partId);

    analysis.maxDepth = Math.max(analysis.maxDepth, depth);

    // Get BOM items for this part
    const bomItems = await this.prisma.bOMItem.findMany({
      where: {
        parentPartId: partId,
        isActive: true,
        OR: [
          { effectiveDate: null },
          { effectiveDate: { lte: new Date() } }
        ],
        OR: [
          { obsoleteDate: null },
          { obsoleteDate: { gte: new Date() } }
        ]
      },
      include: {
        componentPart: {
          include: {
            inventoryItems: {
              where: { isActive: true }
            }
          }
        },
        operation: true
      },
      orderBy: [
        { sequence: 'asc' },
        { findNumber: 'asc' }
      ]
    });

    for (const bomItem of bomItems) {
      const requiredQuantity = bomItem.quantity * quantity;
      const adjustedQuantity = requiredQuantity * (1 + scrapFactor + (bomItem.scrapFactor || 0));

      analysis.totalItems++;
      analysis.totalQuantity += adjustedQuantity;

      // Enhance BOM item with details
      const enhancedItem: BOMItemWithDetails = {
        ...bomItem,
        componentPart: bomItem.componentPart,
        availableInventory: bomItem.componentPart.inventoryItems,
        shortfallQuantity: this.calculateShortfall(bomItem.componentPart.inventoryItems, adjustedQuantity),
        isVendorKit: this.isVendorKitItem(bomItem.componentPart),
        estimatedLeadTime: bomItem.componentPart.leadTimeDays || 0
      };

      // Categorize items
      if (enhancedItem.isVendorKit) {
        analysis.vendorKitItems.push(enhancedItem);
      }

      if (bomItem.isCritical) {
        analysis.criticalItems.push(enhancedItem);
      }

      if (this.isHazardousMaterial(bomItem.componentPart)) {
        analysis.hazardousItems.push(enhancedItem);
      }

      if ((bomItem.componentPart.leadTimeDays || 0) > 30) {
        analysis.longLeadTimeItems.push(enhancedItem);
      }

      // Recursively process sub-assemblies (if part has its own BOM)
      const hasSubBOM = await this.prisma.bOMItem.count({
        where: {
          parentPartId: bomItem.componentPartId,
          isActive: true
        }
      });

      if (hasSubBOM > 0) {
        await this.traverseBOM(
          bomItem.componentPartId,
          adjustedQuantity,
          depth + 1,
          analysis,
          scrapFactor,
          new Set(visited) // Pass copy to avoid pollution between branches
        );
      }
    }
  }

  /**
   * Generate kit structure based on BOM analysis
   */
  private async generateKitStructure(
    workOrder: any,
    analysis: BOMAnalysisResult,
    options: KitGenerationOptions
  ): Promise<any[]> {
    const kits = [];

    // Strategy 1: Single kit for simple assemblies
    if (analysis.totalItems <= (options.maxKitSize || 50) && analysis.maxDepth <= 2) {
      kits.push(await this.createSingleKit(workOrder, analysis, options));
    }
    // Strategy 2: Multi-level kits for complex assemblies
    else if (options.assemblyStage) {
      kits.push(...await this.createStageBasedKits(workOrder, analysis, options));
    }
    // Strategy 3: Operation-based kits
    else if (options.operationId) {
      kits.push(...await this.createOperationBasedKits(workOrder, analysis, options));
    }
    // Strategy 4: Hybrid approach for complex engines
    else {
      kits.push(...await this.createHybridKits(workOrder, analysis, options));
    }

    return kits;
  }

  /**
   * Create single comprehensive kit
   */
  private async createSingleKit(workOrder: any, analysis: BOMAnalysisResult, options: KitGenerationOptions): Promise<any> {
    const kitNumber = await this.generateKitNumber(workOrder.workOrderNumber, 1);

    return {
      kitNumber,
      kitName: `Complete Kit - ${workOrder.part.partNumber}`,
      workOrderId: options.workOrderId,
      operationId: options.operationId,
      assemblyStage: options.assemblyStage || 'COMPLETE',
      workCellId: options.workCellId,
      priority: options.priority || KitPriority.NORMAL,
      scrapFactor: options.scrapFactor || 0.05,
      autoGenerated: true,
      generatedFromBOM: true,
      items: await this.generateKitItems(analysis, 1)
    };
  }

  /**
   * Create stage-based kits for engine assembly
   */
  private async createStageBasedKits(workOrder: any, analysis: BOMAnalysisResult, options: KitGenerationOptions): Promise<any[]> {
    const stages = ['FAN', 'COMPRESSOR', 'COMBUSTOR', 'TURBINE', 'INTEGRATION'];
    const kits = [];

    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      const stageItems = this.filterItemsByStage(analysis, stage);

      if (stageItems.length > 0) {
        const kitNumber = await this.generateKitNumber(workOrder.workOrderNumber, i + 1);

        kits.push({
          kitNumber,
          kitName: `${stage} Module Kit - ${workOrder.part.partNumber}`,
          workOrderId: options.workOrderId,
          operationId: options.operationId,
          assemblyStage: stage,
          workCellId: options.workCellId,
          priority: options.priority || KitPriority.NORMAL,
          scrapFactor: options.scrapFactor || 0.05,
          autoGenerated: true,
          generatedFromBOM: true,
          items: await this.generateKitItems({ ...analysis, vendorKitItems: stageItems }, i + 1)
        });
      }
    }

    return kits;
  }

  /**
   * Create operation-based kits
   */
  private async createOperationBasedKits(workOrder: any, analysis: BOMAnalysisResult, options: KitGenerationOptions): Promise<any[]> {
    // Group items by operation
    const operationGroups = await this.groupItemsByOperation(analysis);
    const kits = [];

    let kitIndex = 1;
    for (const [operationId, items] of operationGroups.entries()) {
      const operation = await this.prisma.operation.findUnique({
        where: { id: operationId }
      });

      const kitNumber = await this.generateKitNumber(workOrder.workOrderNumber, kitIndex++);

      kits.push({
        kitNumber,
        kitName: `Op ${operation?.operationNumber || kitIndex} Kit - ${workOrder.part.partNumber}`,
        workOrderId: options.workOrderId,
        operationId: operationId,
        assemblyStage: options.assemblyStage,
        workCellId: options.workCellId,
        priority: options.priority || KitPriority.NORMAL,
        scrapFactor: options.scrapFactor || 0.05,
        autoGenerated: true,
        generatedFromBOM: true,
        items: await this.generateKitItems({ ...analysis, vendorKitItems: items }, kitIndex)
      });
    }

    return kits;
  }

  /**
   * Create hybrid kits for complex assemblies
   */
  private async createHybridKits(workOrder: any, analysis: BOMAnalysisResult, options: KitGenerationOptions): Promise<any[]> {
    const kits = [];

    // Separate critical, hazardous, and vendor kit items
    const criticalKit = analysis.criticalItems.length > 0 ?
      await this.createSpecializedKit(workOrder, analysis.criticalItems, 'CRITICAL', options) : null;

    const hazmatKit = analysis.hazardousItems.length > 0 ?
      await this.createSpecializedKit(workOrder, analysis.hazardousItems, 'HAZMAT', options) : null;

    const vendorKit = analysis.vendorKitItems.length > 0 ?
      await this.createSpecializedKit(workOrder, analysis.vendorKitItems, 'VENDOR', options) : null;

    // Add specialized kits
    if (criticalKit) kits.push(criticalKit);
    if (hazmatKit) kits.push(hazmatKit);
    if (vendorKit) kits.push(vendorKit);

    // Create main assembly kit with remaining items
    const remainingItems = this.getRemainingItems(analysis);
    if (remainingItems.length > 0) {
      const mainKit = await this.createMainAssemblyKit(workOrder, remainingItems, options);
      kits.push(mainKit);
    }

    return kits;
  }

  /**
   * Create kits in database
   */
  private async createKits(kitStructures: any[], options: KitGenerationOptions): Promise<Kit[]> {
    const createdKits = [];

    for (const kitStructure of kitStructures) {
      // Create kit
      const kit = await this.prisma.kit.create({
        data: {
          kitNumber: kitStructure.kitNumber,
          kitName: kitStructure.kitName,
          workOrderId: kitStructure.workOrderId,
          operationId: kitStructure.operationId,
          assemblyStage: kitStructure.assemblyStage,
          workCellId: kitStructure.workCellId,
          status: KitStatus.PLANNED,
          priority: kitStructure.priority,
          autoGenerated: kitStructure.autoGenerated,
          generatedFromBOM: kitStructure.generatedFromBOM,
          scrapFactor: kitStructure.scrapFactor,
          createdById: 'system', // TODO: Get from context
          notes: `Auto-generated kit for ${kitStructure.assemblyStage || 'assembly'}`
        }
      });

      // Create kit items
      for (const itemData of kitStructure.items) {
        await this.prisma.kitItem.create({
          data: {
            kitId: kit.id,
            partId: itemData.partId,
            bomItemId: itemData.bomItemId,
            requiredQuantity: itemData.requiredQuantity,
            unitOfMeasure: itemData.unitOfMeasure,
            unitOfMeasureId: itemData.unitOfMeasureId,
            sequence: itemData.sequence,
            findNumber: itemData.findNumber,
            referenceDesignator: itemData.referenceDesignator,
            status: KitItemStatus.PLANNED,
            isCritical: itemData.isCritical,
            isHazardous: itemData.isHazardous,
            specialInstructions: itemData.specialInstructions
          }
        });
      }

      createdKits.push(kit);
    }

    return createdKits;
  }

  /**
   * Helper methods
   */

  private async getWorkOrderWithBOM(workOrderId: string) {
    return await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        part: {
          include: {
            bomItems: {
              where: { isActive: true },
              include: {
                componentPart: true
              }
            }
          }
        }
      }
    });
  }

  private calculateShortfall(inventory: Inventory[], requiredQuantity: number): number {
    const availableQuantity = inventory.reduce((sum, inv) => sum + inv.quantity, 0);
    return Math.max(0, requiredQuantity - availableQuantity);
  }

  private isVendorKitItem(part: Part): boolean {
    // Logic to determine if part comes pre-kitted from vendor
    return part.makeOrBuy === 'BUY' && part.partName?.toLowerCase().includes('kit');
  }

  private isHazardousMaterial(part: Part): boolean {
    // Logic to identify hazardous materials
    const hazardousKeywords = ['chemical', 'adhesive', 'sealant', 'lubricant', 'paint'];
    return hazardousKeywords.some(keyword =>
      part.partName?.toLowerCase().includes(keyword) ||
      part.description?.toLowerCase().includes(keyword)
    );
  }

  private filterItemsByStage(analysis: BOMAnalysisResult, stage: string): BOMItemWithDetails[] {
    // Logic to filter items by assembly stage
    // This would be enhanced based on part classifications or BOM structure
    return analysis.vendorKitItems.filter(item =>
      item.componentPart.partName?.toLowerCase().includes(stage.toLowerCase())
    );
  }

  private async groupItemsByOperation(analysis: BOMAnalysisResult): Promise<Map<string, BOMItemWithDetails[]>> {
    const groups = new Map();

    for (const item of analysis.vendorKitItems) {
      const operationId = item.operationId || 'default';
      if (!groups.has(operationId)) {
        groups.set(operationId, []);
      }
      groups.get(operationId).push(item);
    }

    return groups;
  }

  private async generateKitNumber(workOrderNumber: string, sequence: number): Promise<string> {
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    return `KIT-${workOrderNumber}-${sequence.toString().padStart(2, '0')}-${timestamp}`;
  }

  private async generateKitItems(analysis: BOMAnalysisResult, sequence: number): Promise<any[]> {
    // Generate kit items from analysis
    return analysis.vendorKitItems.map((item, index) => ({
      partId: item.componentPartId,
      bomItemId: item.id,
      requiredQuantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      unitOfMeasureId: item.unitOfMeasureId,
      sequence: index + 1,
      findNumber: item.findNumber,
      referenceDesignator: item.referenceDesignator,
      isCritical: item.isCritical,
      isHazardous: this.isHazardousMaterial(item.componentPart),
      specialInstructions: item.isVendorKit ? 'Vendor pre-kitted assembly' : null
    }));
  }

  private async createSpecializedKit(workOrder: any, items: BOMItemWithDetails[], type: string, options: KitGenerationOptions): Promise<any> {
    const kitNumber = await this.generateKitNumber(workOrder.workOrderNumber, Date.now());

    return {
      kitNumber,
      kitName: `${type} Kit - ${workOrder.part.partNumber}`,
      workOrderId: options.workOrderId,
      operationId: options.operationId,
      assemblyStage: type,
      workCellId: options.workCellId,
      priority: type === 'CRITICAL' ? KitPriority.HIGH : options.priority || KitPriority.NORMAL,
      scrapFactor: options.scrapFactor || 0.05,
      autoGenerated: true,
      generatedFromBOM: true,
      items: await this.generateKitItems({ ...{} as BOMAnalysisResult, vendorKitItems: items }, 1)
    };
  }

  private getRemainingItems(analysis: BOMAnalysisResult): BOMItemWithDetails[] {
    // Get items not in specialized kits
    const specializedItems = new Set([
      ...analysis.criticalItems.map(i => i.id),
      ...analysis.hazardousItems.map(i => i.id),
      ...analysis.vendorKitItems.map(i => i.id)
    ]);

    return analysis.vendorKitItems.filter(item => !specializedItems.has(item.id));
  }

  private async createMainAssemblyKit(workOrder: any, items: BOMItemWithDetails[], options: KitGenerationOptions): Promise<any> {
    const kitNumber = await this.generateKitNumber(workOrder.workOrderNumber, 999);

    return {
      kitNumber,
      kitName: `Main Assembly Kit - ${workOrder.part.partNumber}`,
      workOrderId: options.workOrderId,
      operationId: options.operationId,
      assemblyStage: 'ASSEMBLY',
      workCellId: options.workCellId,
      priority: options.priority || KitPriority.NORMAL,
      scrapFactor: options.scrapFactor || 0.05,
      autoGenerated: true,
      generatedFromBOM: true,
      items: await this.generateKitItems({ ...{} as BOMAnalysisResult, vendorKitItems: items }, 999)
    };
  }

  private async identifyShortages(analysis: BOMAnalysisResult): Promise<ShortageItem[]> {
    const shortages: ShortageItem[] = [];

    for (const item of analysis.vendorKitItems) {
      if (item.shortfallQuantity && item.shortfallQuantity > 0) {
        const availableQuantity = item.availableInventory?.reduce((sum, inv) => sum + inv.quantity, 0) || 0;

        shortages.push({
          partId: item.componentPartId,
          partNumber: item.componentPart.partNumber,
          requiredQuantity: item.quantity,
          availableQuantity,
          shortfallQuantity: item.shortfallQuantity,
          preferredSuppliers: [], // TODO: Get from part supplier relationships
          estimatedLeadTime: item.estimatedLeadTime || 0
        });
      }
    }

    return shortages;
  }

  private generateWarnings(analysis: BOMAnalysisResult, shortages: ShortageItem[]): string[] {
    const warnings: string[] = [];

    if (analysis.maxDepth > 5) {
      warnings.push(`Complex BOM structure detected (${analysis.maxDepth} levels deep). Consider pre-staging sub-assemblies.`);
    }

    if (shortages.length > 0) {
      warnings.push(`${shortages.length} shortage(s) identified. Review material availability before starting assembly.`);
    }

    if (analysis.hazardousItems.length > 0) {
      warnings.push(`${analysis.hazardousItems.length} hazardous material(s) require special handling and storage.`);
    }

    if (analysis.longLeadTimeItems.length > 0) {
      warnings.push(`${analysis.longLeadTimeItems.length} long lead time item(s) detected. Verify availability.`);
    }

    return warnings;
  }

  private calculateStagingTime(analysis: BOMAnalysisResult): number {
    // Estimate staging time based on complexity
    const baseTime = 30; // 30 minutes base time
    const itemTime = analysis.totalItems * 2; // 2 minutes per item
    const complexityTime = analysis.maxDepth * 15; // 15 minutes per BOM level

    return baseTime + itemTime + complexityTime;
  }
}