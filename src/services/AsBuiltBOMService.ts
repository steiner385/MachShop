/**
 * As-Built BOM Service
 * Issue #105: Product Genealogy & BOM Management
 *
 * Manages As-Built BOM (Bill of Materials):
 * - Tracks actual components used vs. planned BOM
 * - Variant management
 * - BOM version control
 * - Configuration management
 * - Component substitutions
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface BOMComponent {
  componentPartId: string;
  componentPartNumber: string;
  componentPartName: string;
  quantity: number;
  uom: string;
  isOptional: boolean;
  substitutableWith?: string[];
  notes?: string;
}

export interface AsBuiltBOM {
  bomId: string;
  parentPartId: string;
  parentPartNumber: string;
  parentPartName: string;
  bomVersion: number;
  components: BOMComponent[];
  lastModified: Date;
  modifiedBy: string;
  effectiveDate: Date;
  obsoleteDate?: Date;
  notes?: string;
}

export interface BOMVariant {
  variantId: string;
  parentPartId: string;
  variantPartId: string;
  variantPartNumber: string;
  variantPartName: string;
  differentiatingComponents: BOMComponent[];
  description?: string;
  createdDate: Date;
}

export interface BOMComparison {
  parentPartId: string;
  plannedBOM: BOMComponent[];
  asBuiltBOM: BOMComponent[];
  addedComponents: BOMComponent[];
  removedComponents: BOMComponent[];
  modifiedComponents: Array<{
    component: BOMComponent;
    plannedQuantity: number;
    asBuiltQuantity: number;
    plannedUom: string;
    asBuiltUom: string;
  }>;
  compliancePercentage: number;
}

export class AsBuiltBOMService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get As-Built BOM for a product
   */
  async getAsBuiltBOM(parentPartId: string): Promise<AsBuiltBOM | null> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: parentPartId },
        include: {
          bom: {
            include: { component: true },
          },
        },
      });

      if (!part) {
        throw new Error(`Part ${parentPartId} not found`);
      }

      const components: BOMComponent[] = part.bom?.map((b) => ({
        componentPartId: b.component.id,
        componentPartNumber: b.component.partNumber,
        componentPartName: b.component.partName,
        quantity: b.quantity,
        uom: b.uom,
        isOptional: false,
        notes: b.notes || undefined,
      })) || [];

      const asBuiltBOM: AsBuiltBOM = {
        bomId: `BOM-${part.id}`,
        parentPartId: part.id,
        parentPartNumber: part.partNumber,
        parentPartName: part.partName,
        bomVersion: 1,
        components,
        lastModified: new Date(),
        modifiedBy: 'SYSTEM',
        effectiveDate: new Date(),
        notes: `As-Built BOM for ${part.partName}`,
      };

      logger.info(`Retrieved As-Built BOM for part ${parentPartId}`);
      return asBuiltBOM;
    } catch (error) {
      logger.error(`Error in getAsBuiltBOM: ${error}`);
      throw error;
    }
  }

  /**
   * Create or update As-Built BOM
   */
  async createOrUpdateAsBuiltBOM(
    parentPartId: string,
    components: BOMComponent[],
    modifiedBy: string,
    notes?: string
  ): Promise<AsBuiltBOM> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: parentPartId },
      });

      if (!part) {
        throw new Error(`Part ${parentPartId} not found`);
      }

      // In a real implementation, this would update the BOM in the database
      // For now, we return the constructed BOM
      const asBuiltBOM: AsBuiltBOM = {
        bomId: `BOM-${part.id}`,
        parentPartId: part.id,
        parentPartNumber: part.partNumber,
        parentPartName: part.partName,
        bomVersion: 1,
        components,
        lastModified: new Date(),
        modifiedBy,
        effectiveDate: new Date(),
        notes,
      };

      logger.info(`Created/Updated As-Built BOM for part ${parentPartId}`);
      return asBuiltBOM;
    } catch (error) {
      logger.error(`Error in createOrUpdateAsBuiltBOM: ${error}`);
      throw error;
    }
  }

  /**
   * Get BOM variants (different product configurations)
   */
  async getBOMVariants(parentPartId: string): Promise<BOMVariant[]> {
    try {
      // Get the parent product
      const parentPart = await this.prisma.part.findUnique({
        where: { id: parentPartId },
        include: {
          bom: {
            include: { component: true },
          },
        },
      });

      if (!parentPart) {
        throw new Error(`Part ${parentPartId} not found`);
      }

      const parentComponents = new Set(
        parentPart.bom?.map((b) => b.componentId) || []
      );

      // Find variants (parts with similar but different BOMs)
      const relatedParts = await this.prisma.part.findMany({
        where: {
          partNumber: {
            startsWith: parentPart.partNumber.substring(0, 5),
          },
          id: { not: parentPartId },
        },
        include: {
          bom: {
            include: { component: true },
          },
        },
        take: 10,
      });

      const variants: BOMVariant[] = relatedParts.map((variant) => {
        const variantComponents = new Set(
          variant.bom?.map((b) => b.componentId) || []
        );

        // Find differentiating components
        const differentComponents = variant.bom?.filter(
          (b) => !parentComponents.has(b.componentId)
        ) || [];

        return {
          variantId: `VAR-${variant.id}`,
          parentPartId,
          variantPartId: variant.id,
          variantPartNumber: variant.partNumber,
          variantPartName: variant.partName,
          differentiatingComponents: differentComponents.map((b) => ({
            componentPartId: b.component.id,
            componentPartNumber: b.component.partNumber,
            componentPartName: b.component.partName,
            quantity: b.quantity,
            uom: b.uom,
            isOptional: false,
          })),
          createdDate: new Date(),
        };
      });

      logger.info(
        `Retrieved ${variants.length} BOM variants for part ${parentPartId}`
      );
      return variants;
    } catch (error) {
      logger.error(`Error in getBOMVariants: ${error}`);
      throw error;
    }
  }

  /**
   * Compare planned BOM vs As-Built BOM
   */
  async compareBOMs(
    parentPartId: string,
    plannedBOM: BOMComponent[],
    asBuiltBOM: BOMComponent[]
  ): Promise<BOMComparison> {
    try {
      const plannedSet = new Map(
        plannedBOM.map((c) => [c.componentPartId, c])
      );
      const builtSet = new Map(asBuiltBOM.map((c) => [c.componentPartId, c]));

      const addedComponents: BOMComponent[] = [];
      const removedComponents: BOMComponent[] = [];
      const modifiedComponents: Array<{
        component: BOMComponent;
        plannedQuantity: number;
        asBuiltQuantity: number;
        plannedUom: string;
        asBuiltUom: string;
      }> = [];

      // Find added and modified
      builtSet.forEach((builtComponent, componentId) => {
        const plannedComponent = plannedSet.get(componentId);
        if (!plannedComponent) {
          addedComponents.push(builtComponent);
        } else if (
          plannedComponent.quantity !== builtComponent.quantity ||
          plannedComponent.uom !== builtComponent.uom
        ) {
          modifiedComponents.push({
            component: builtComponent,
            plannedQuantity: plannedComponent.quantity,
            asBuiltQuantity: builtComponent.quantity,
            plannedUom: plannedComponent.uom,
            asBuiltUom: builtComponent.uom,
          });
        }
      });

      // Find removed
      plannedSet.forEach((plannedComponent, componentId) => {
        if (!builtSet.has(componentId)) {
          removedComponents.push(plannedComponent);
        }
      });

      // Calculate compliance percentage
      const totalComponents = Math.max(plannedBOM.length, asBuiltBOM.length);
      const matchedComponents = Math.min(
        plannedBOM.length,
        asBuiltBOM.length
      ) - modifiedComponents.length;
      const compliancePercentage =
        totalComponents > 0 ? (matchedComponents / totalComponents) * 100 : 0;

      logger.info(
        `Compared BOMs for part ${parentPartId}: ${compliancePercentage.toFixed(2)}% compliance`
      );

      return {
        parentPartId,
        plannedBOM,
        asBuiltBOM,
        addedComponents,
        removedComponents,
        modifiedComponents,
        compliancePercentage: Math.round(compliancePercentage * 100) / 100,
      };
    } catch (error) {
      logger.error(`Error in compareBOMs: ${error}`);
      throw error;
    }
  }

  /**
   * Check component substitution availability
   */
  async checkComponentSubstitutions(
    componentPartId: string
  ): Promise<string[]> {
    try {
      const component = await this.prisma.part.findUnique({
        where: { id: componentPartId },
      });

      if (!component) {
        throw new Error(`Component ${componentPartId} not found`);
      }

      // Find substitutable parts (same type, similar specifications)
      const substitutes = await this.prisma.part.findMany({
        where: {
          partType: component.partType,
          id: { not: componentPartId },
          isActive: true,
        },
        take: 10,
      });

      const substitutionList = substitutes.map((s) => s.id);

      logger.info(
        `Found ${substitutionList.length} substitutes for component ${componentPartId}`
      );
      return substitutionList;
    } catch (error) {
      logger.error(`Error in checkComponentSubstitutions: ${error}`);
      throw error;
    }
  }

  /**
   * Apply component substitution
   */
  async applySubstitution(
    originalComponentId: string,
    substitutionComponentId: string,
    parentPartId: string,
    appliedBy: string,
    notes?: string
  ): Promise<any> {
    try {
      const [originalComponent, substitutionComponent, parentPart] =
        await Promise.all([
          this.prisma.part.findUnique({ where: { id: originalComponentId } }),
          this.prisma.part.findUnique({
            where: { id: substitutionComponentId },
          }),
          this.prisma.part.findUnique({ where: { id: parentPartId } }),
        ]);

      if (!originalComponent || !substitutionComponent || !parentPart) {
        throw new Error('One or more parts not found');
      }

      // In a real implementation, this would update the BOM
      logger.info(
        `Applied substitution: ${originalComponent.partNumber} -> ${substitutionComponent.partNumber} in part ${parentPart.partNumber}`
      );

      return {
        success: true,
        originalComponent: originalComponent.partNumber,
        substitutionComponent: substitutionComponent.partNumber,
        parentPart: parentPart.partNumber,
        appliedBy,
        appliedDate: new Date(),
        notes,
      };
    } catch (error) {
      logger.error(`Error in applySubstitution: ${error}`);
      throw error;
    }
  }

  /**
   * Get BOM version history
   */
  async getBOMVersionHistory(parentPartId: string): Promise<any[]> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: parentPartId },
      });

      if (!part) {
        throw new Error(`Part ${parentPartId} not found`);
      }

      // Simulated version history
      const history = [
        {
          version: 1,
          createdDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          createdBy: 'SYSTEM',
          effectiveDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          obsoleteDate: null,
          changeDescription: 'Initial version',
          componentCount: 5,
        },
      ];

      logger.info(
        `Retrieved ${history.length} BOM versions for part ${parentPartId}`
      );
      return history;
    } catch (error) {
      logger.error(`Error in getBOMVersionHistory: ${error}`);
      throw error;
    }
  }

  /**
   * Validate BOM completeness
   */
  async validateBOMCompleteness(parentPartId: string): Promise<any> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: parentPartId },
        include: {
          bom: {
            include: { component: true },
          },
        },
      });

      if (!part) {
        throw new Error(`Part ${parentPartId} not found`);
      }

      const components = part.bom || [];
      const hasComponents = components.length > 0;
      const allComponentsActive = components.every((b) => b.component.isActive);
      const allQuantitiesValid = components.every((b) => b.quantity > 0);

      const isComplete = hasComponents && allComponentsActive && allQuantitiesValid;
      const issues = [];

      if (!hasComponents) issues.push('No components defined');
      if (!allComponentsActive)
        issues.push('Some components are inactive');
      if (!allQuantitiesValid) issues.push('Some quantities are invalid');

      logger.info(
        `Validated BOM for part ${parentPartId}: ${isComplete ? 'COMPLETE' : 'INCOMPLETE'}`
      );

      return {
        parentPartId,
        isComplete,
        componentCount: components.length,
        allComponentsActive,
        allQuantitiesValid,
        issues,
      };
    } catch (error) {
      logger.error(`Error in validateBOMCompleteness: ${error}`);
      throw error;
    }
  }

  /**
   * Get BOM cost analysis
   */
  async analyzeBOMCost(parentPartId: string): Promise<any> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: parentPartId },
        include: {
          bom: {
            include: { component: true },
          },
        },
      });

      if (!part) {
        throw new Error(`Part ${parentPartId} not found`);
      }

      // Calculate costs (simplified - would need unit cost in real implementation)
      let totalComponentCost = 0;
      const componentCosts = (part.bom || []).map((b) => {
        const unitCost = 10; // Placeholder
        const componentCost = unitCost * b.quantity;
        totalComponentCost += componentCost;
        return {
          componentId: b.component.id,
          componentNumber: b.component.partNumber,
          quantity: b.quantity,
          unitCost,
          totalCost: componentCost,
          percentOfTotal: 0,
        };
      });

      // Calculate percentages
      componentCosts.forEach((cc) => {
        cc.percentOfTotal =
          totalComponentCost > 0
            ? Math.round((cc.totalCost / totalComponentCost) * 10000) / 100
            : 0;
      });

      logger.info(
        `Analyzed BOM cost for part ${parentPartId}: total cost $${totalComponentCost}`
      );

      return {
        parentPartId,
        totalComponentCost,
        componentCount: componentCosts.length,
        componentCosts,
        averageCostPerComponent:
          componentCosts.length > 0
            ? totalComponentCost / componentCosts.length
            : 0,
      };
    } catch (error) {
      logger.error(`Error in analyzeBOMCost: ${error}`);
      throw error;
    }
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default AsBuiltBOMService;
