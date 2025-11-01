/**
 * Product Genealogy Service
 * Issue #105: Product Genealogy & BOM Management
 *
 * Provides comprehensive product genealogy, traceability, and BOM management:
 * - Forward and backward traceability
 * - Complete genealogy trees
 * - Part numbering schemes
 * - Product family relationships
 * - BOM composition and variants
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface GenealogyPath {
  root: string;
  path: Array<{
    partId: string;
    partNumber: string;
    partName: string;
    genealogyType: 'COMPONENT' | 'ASSEMBLY' | 'FINISHED_GOOD';
    level: number;
    relationshipType?: string;
  }>;
  totalLevels: number;
}

export interface FullGenealogyTree {
  rootPartId: string;
  rootPartNumber: string;
  rootPartName: string;
  upstreamTree: GenealogyPath;
  downstreamTree: GenealogyPath;
  immediateRelatives: {
    parents: Array<any>;
    children: Array<any>;
  };
}

export interface RecallImpact {
  initiatingPartId: string;
  affectedCount: number;
  affectedParts: Array<{
    partId: string;
    partNumber: string;
    partName: string;
    relationshipPath: string[];
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }>;
  estimatedProductsAffected: number;
  downstreamProductsAffected: Array<{
    partId: string;
    productCount: number;
    riskLevel: string;
  }>;
}

export interface PartNumberScheme {
  schemeId: string;
  schemeName: string;
  description: string;
  segments: Array<{
    segmentName: string;
    position: number;
    length: number;
    pattern: string;
    description: string;
  }>;
  examplePartNumber: string;
}

export class ProductGenealogyService {
  private prisma: PrismaClient;

  constructor(prisma?: PrismaClient) {
    this.prisma = prisma || new PrismaClient();
  }

  /**
   * Get backward traceability (upstream - where the part comes from)
   * Traces the supply chain backward to raw materials
   */
  async getBackwardTraceability(
    partId: string,
    depth: number = 10
  ): Promise<GenealogyPath> {
    try {
      const path: GenealogyPath = {
        root: partId,
        path: [],
        totalLevels: 0,
      };

      const visited = new Set<string>();
      const queue: Array<{ partId: string; level: number }> = [
        { partId, level: 0 },
      ];

      while (queue.length > 0 && path.totalLevels < depth) {
        const { partId: currentPartId, level } = queue.shift()!;

        if (visited.has(currentPartId)) continue;
        visited.add(currentPartId);

        const part = await this.prisma.part.findUnique({
          where: { id: currentPartId },
          include: {
            parentBom: {
              include: { parent: true },
            },
          },
        });

        if (!part) continue;

        path.path.push({
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.partName,
          genealogyType: this.determinePartType(part),
          level,
        });

        if (part.parentBom && part.parentBom.length > 0) {
          part.parentBom.forEach((bom) => {
            queue.push({ partId: bom.parent.id, level: level + 1 });
          });
          path.totalLevels = Math.max(path.totalLevels, level + 1);
        } else {
          // Reached raw material level
          path.totalLevels = Math.max(path.totalLevels, level + 1);
        }
      }

      logger.info(`Retrieved backward traceability for part ${partId} with ${path.path.length} ancestors`);
      return path;
    } catch (error) {
      logger.error(`Error in getBackwardTraceability: ${error}`);
      throw error;
    }
  }

  /**
   * Get forward traceability (downstream - where the part is used)
   * Traces the supply chain forward to finished goods
   */
  async getForwardTraceability(
    partId: string,
    depth: number = 10
  ): Promise<GenealogyPath> {
    try {
      const path: GenealogyPath = {
        root: partId,
        path: [],
        totalLevels: 0,
      };

      const visited = new Set<string>();
      const queue: Array<{ partId: string; level: number }> = [
        { partId, level: 0 },
      ];

      while (queue.length > 0 && path.totalLevels < depth) {
        const { partId: currentPartId, level } = queue.shift()!;

        if (visited.has(currentPartId)) continue;
        visited.add(currentPartId);

        const part = await this.prisma.part.findUnique({
          where: { id: currentPartId },
          include: {
            bom: {
              include: { component: true },
            },
          },
        });

        if (!part) continue;

        path.path.push({
          partId: part.id,
          partNumber: part.partNumber,
          partName: part.partName,
          genealogyType: this.determinePartType(part),
          level,
        });

        if (part.bom && part.bom.length > 0) {
          part.bom.forEach((bom) => {
            queue.push({ partId: bom.component.id, level: level + 1 });
          });
          path.totalLevels = Math.max(path.totalLevels, level + 1);
        } else {
          // Reached finished good level
          path.totalLevels = Math.max(path.totalLevels, level + 1);
        }
      }

      logger.info(
        `Retrieved forward traceability for part ${partId} with ${path.path.length} descendants`
      );
      return path;
    } catch (error) {
      logger.error(`Error in getForwardTraceability: ${error}`);
      throw error;
    }
  }

  /**
   * Get complete genealogy tree (both upstream and downstream)
   */
  async getFullGenealogyTree(
    partId: string,
    upstreamDepth: number = 5,
    downstreamDepth: number = 5
  ): Promise<FullGenealogyTree> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: partId },
      });

      if (!part) {
        throw new Error(`Part ${partId} not found`);
      }

      const [upstreamTree, downstreamTree] = await Promise.all([
        this.getBackwardTraceability(partId, upstreamDepth),
        this.getForwardTraceability(partId, downstreamDepth),
      ]);

      // Get immediate relationships
      const partDetails = await this.prisma.part.findUnique({
        where: { id: partId },
        include: {
          parentBom: { include: { parent: true } },
          bom: { include: { component: true } },
        },
      });

      const immediateRelatives = {
        parents: partDetails?.parentBom?.map((bom) => ({
          partId: bom.parent.id,
          partNumber: bom.parent.partNumber,
          partName: bom.parent.partName,
          quantity: bom.quantity,
          uom: bom.uom,
        })) || [],
        children: partDetails?.bom?.map((bom) => ({
          partId: bom.component.id,
          partNumber: bom.component.partNumber,
          partName: bom.component.partName,
          quantity: bom.quantity,
          uom: bom.uom,
        })) || [],
      };

      logger.info(`Retrieved complete genealogy tree for part ${partId}`);
      return {
        rootPartId: partId,
        rootPartNumber: part.partNumber,
        rootPartName: part.partName,
        upstreamTree,
        downstreamTree,
        immediateRelatives,
      };
    } catch (error) {
      logger.error(`Error in getFullGenealogyTree: ${error}`);
      throw error;
    }
  }

  /**
   * Analyze recall impact on dependent products
   */
  async analyzeRecallImpact(partId: string): Promise<RecallImpact> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: partId },
      });

      if (!part) {
        throw new Error(`Part ${partId} not found`);
      }

      // Get all downstream products (where this part is used)
      const downstreamTree = await this.getForwardTraceability(partId, 20);

      const affectedParts = downstreamTree.path.map((p, index) => ({
        partId: p.partId,
        partNumber: p.partNumber,
        partName: p.partName,
        relationshipPath: downstreamTree.path.slice(0, index + 1).map((x) => x.partNumber),
        riskLevel: this.calculateRiskLevel(p.level, downstreamTree.totalLevels),
      }));

      // Estimate products affected based on serialized parts in downstream assemblies
      let estimatedProductsAffected = 0;
      const downstreamProductsAffected: Array<{
        partId: string;
        productCount: number;
        riskLevel: string;
      }> = [];

      for (const affected of affectedParts) {
        const serialCount = await this.prisma.serializedPart.count({
          where: { partId: affected.partId },
        });

        estimatedProductsAffected += serialCount;
        downstreamProductsAffected.push({
          partId: affected.partId,
          productCount: serialCount,
          riskLevel: affected.riskLevel,
        });
      }

      logger.info(
        `Analyzed recall impact for part ${partId}: ${affectedParts.length} affected parts, ${estimatedProductsAffected} products`
      );

      return {
        initiatingPartId: partId,
        affectedCount: affectedParts.length,
        affectedParts,
        estimatedProductsAffected,
        downstreamProductsAffected,
      };
    } catch (error) {
      logger.error(`Error in analyzeRecallImpact: ${error}`);
      throw error;
    }
  }

  /**
   * Get part numbering scheme for a family of parts
   */
  async getPartNumberingScheme(
    schemeId: string
  ): Promise<PartNumberScheme | null> {
    try {
      // This would typically be stored in a configuration table
      // For now, return a standard scheme
      const schemes: Record<string, PartNumberScheme> = {
        'standard-manufacturing': {
          schemeId: 'standard-manufacturing',
          schemeName: 'Standard Manufacturing',
          description: 'Standard part numbering for manufacturing',
          segments: [
            {
              segmentName: 'Product Type',
              position: 1,
              length: 2,
              pattern: '[A-Z]{2}',
              description: 'Product category code',
            },
            {
              segmentName: 'Family Code',
              position: 2,
              length: 3,
              pattern: '[0-9]{3}',
              description: 'Product family identifier',
            },
            {
              segmentName: 'Sequence',
              position: 3,
              length: 4,
              pattern: '[0-9]{4}',
              description: 'Sequential identifier',
            },
            {
              segmentName: 'Variant',
              position: 4,
              length: 2,
              pattern: '[A-Z0-9]{2}',
              description: 'Variant code (optional)',
            },
          ],
          examplePartNumber: 'MF-001-0001-A1',
        },
      };

      const scheme = schemes[schemeId] || null;
      logger.info(
        `Retrieved part numbering scheme: ${schemeId || 'not found'}`
      );
      return scheme;
    } catch (error) {
      logger.error(`Error in getPartNumberingScheme: ${error}`);
      throw error;
    }
  }

  /**
   * Get product family and variant information
   */
  async getProductFamily(parentPartId: string): Promise<any> {
    try {
      const parent = await this.prisma.part.findUnique({
        where: { id: parentPartId },
        include: {
          bom: {
            include: { component: true },
          },
        },
      });

      if (!parent) {
        throw new Error(`Parent part ${parentPartId} not found`);
      }

      // Get all products that use these same components (variants)
      const variants = await this.prisma.part.findMany({
        where: {
          id: { not: parentPartId },
          bom: {
            some: {
              componentId: {
                in: parent.bom?.map((b) => b.componentId) || [],
              },
            },
          },
        },
        include: {
          bom: {
            include: { component: true },
          },
        },
      });

      logger.info(
        `Retrieved product family for part ${parentPartId} with ${variants.length} variants`
      );

      return {
        parentPartId,
        parentPartNumber: parent.partNumber,
        parentPartName: parent.partName,
        commonComponents: parent.bom?.length || 0,
        variants: variants.map((v) => ({
          partId: v.id,
          partNumber: v.partNumber,
          partName: v.partName,
          componentCount: v.bom?.length || 0,
        })),
      };
    } catch (error) {
      logger.error(`Error in getProductFamily: ${error}`);
      throw error;
    }
  }

  /**
   * Get genealogy depth (maximum levels up and down)
   */
  async getGenealogyDepth(partId: string): Promise<{
    upstreamDepth: number;
    downstreamDepth: number;
    totalDepth: number;
  }> {
    try {
      const [upstream, downstream] = await Promise.all([
        this.getBackwardTraceability(partId, 100),
        this.getForwardTraceability(partId, 100),
      ]);

      const upstreamDepth = upstream.totalLevels;
      const downstreamDepth = downstream.totalLevels;

      logger.info(
        `Retrieved genealogy depth for part ${partId}: upstream=${upstreamDepth}, downstream=${downstreamDepth}`
      );

      return {
        upstreamDepth,
        downstreamDepth,
        totalDepth: upstreamDepth + downstreamDepth,
      };
    } catch (error) {
      logger.error(`Error in getGenealogyDepth: ${error}`);
      throw error;
    }
  }

  /**
   * Helper: Determine part type based on attributes
   */
  private determinePartType(
    part: any
  ): 'COMPONENT' | 'ASSEMBLY' | 'FINISHED_GOOD' {
    if (part.partType === 'RAW_MATERIAL' || part.partType === 'COMPONENT') {
      return 'COMPONENT';
    } else if (
      part.partType === 'ASSEMBLY' ||
      part.partType === 'SUB_ASSEMBLY'
    ) {
      return 'ASSEMBLY';
    } else {
      return 'FINISHED_GOOD';
    }
  }

  /**
   * Helper: Calculate risk level based on genealogy depth
   */
  private calculateRiskLevel(
    currentLevel: number,
    maxLevel: number
  ): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const percentage = (currentLevel / maxLevel) * 100;

    if (percentage < 25) return 'CRITICAL';
    if (percentage < 50) return 'HIGH';
    if (percentage < 75) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Disconnect Prisma client
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default ProductGenealogyService;
