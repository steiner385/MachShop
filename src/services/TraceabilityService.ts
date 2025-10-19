import { PrismaClient, SerializedPart, PartGenealogy } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Graph node for genealogy visualization
 */
export interface GenealogyNode {
  id: string;
  serialNumber: string;
  partNumber: string;
  partName: string;
  partType: string;
  lotNumber?: string;
  status: string;
  manufactureDate?: string;
  level: number; // Tree depth level
  nodeType: 'finished' | 'wip' | 'raw_material' | 'purchased';
}

/**
 * Graph edge for genealogy visualization
 */
export interface GenealogyEdge {
  id: string;
  source: string; // parent node ID
  target: string; // child node ID
  relationship: 'contains' | 'used_in';
  assemblyDate?: string;
  assemblyOperator?: string;
}

/**
 * Genealogy graph for D3.js visualization
 */
export interface GenealogyGraph {
  nodes: GenealogyNode[];
  edges: GenealogyEdge[];
  rootNodeId: string;
  maxDepth: number;
}

/**
 * Forward traceability result
 */
export interface ForwardTraceabilityResult {
  lotNumber: string;
  usedInProducts: {
    serialNumber: string;
    partNumber: string;
    partName: string;
    workOrderNumber?: string;
    dateUsed: string;
    currentStatus: string;
  }[];
  totalProducts: number;
}

/**
 * Backward traceability result
 */
export interface BackwardTraceabilityResult {
  serialNumber: string;
  partNumber: string;
  partName: string;
  components: {
    serialNumber: string;
    partNumber: string;
    partName: string;
    lotNumber?: string;
    supplier?: string;
    assemblyDate?: string;
    level: number;
  }[];
  totalComponents: number;
}

/**
 * Traceability Service
 *
 * Provides comprehensive traceability functionality:
 * - Forward traceability (lot → products)
 * - Backward traceability (serial → materials)
 * - Genealogy tree visualization (graph format for D3.js)
 * - Circular reference detection
 */
export class TraceabilityService {

  /**
   * Get forward traceability - Find all products made from a specific lot
   */
  async getForwardTraceability(lotNumber: string): Promise<ForwardTraceabilityResult> {
    try {
      // Find all serialized parts with this lot number
      const directParts = await prisma.serializedPart.findMany({
        where: { lotNumber },
        include: {
          part: true,
        },
      });

      // Also find parts where this lot was used as a component
      const componentUsage = await prisma.partGenealogy.findMany({
        where: {
          componentPart: {
            lotNumber,
          },
        },
        include: {
          parentPart: {
            include: {
              part: true,
            },
          },
          componentPart: true,
        },
      });

      // Combine results
      const usedInProducts = [
        ...directParts.map((sp) => ({
          serialNumber: sp.serialNumber,
          partNumber: sp.part.partNumber,
          partName: sp.part.partName,
          workOrderNumber: sp.workOrderId || undefined,
          dateUsed: sp.manufactureDate?.toISOString() || sp.createdAt.toISOString(),
          currentStatus: sp.status,
        })),
        ...componentUsage.map((gu) => ({
          serialNumber: gu.parentPart.serialNumber,
          partNumber: gu.parentPart.part.partNumber,
          partName: gu.parentPart.part.partName,
          workOrderNumber: gu.parentPart.workOrderId || undefined,
          dateUsed: gu.assemblyDate?.toISOString() || gu.createdAt.toISOString(),
          currentStatus: gu.parentPart.status,
        })),
      ];

      // Remove duplicates
      const uniqueProducts = Array.from(
        new Map(usedInProducts.map((p) => [p.serialNumber, p])).values()
      );

      return {
        lotNumber,
        usedInProducts: uniqueProducts,
        totalProducts: uniqueProducts.length,
      };
    } catch (error) {
      console.error('Forward traceability query failed:', error);
      throw new Error('Failed to retrieve forward traceability');
    }
  }

  /**
   * Get backward traceability - Find all materials/components used to make a product
   */
  async getBackwardTraceability(serialNumber: string): Promise<BackwardTraceabilityResult> {
    try {
      // Get the serialized part
      const serializedPart = await prisma.serializedPart.findUnique({
        where: { serialNumber },
        include: {
          part: true,
          components: {
            include: {
              componentPart: {
                include: {
                  part: true,
                },
              },
            },
          },
        },
      });

      if (!serializedPart) {
        throw new Error('Serialized part not found');
      }

      // Recursively collect all components
      const components = await this.collectAllComponents(serializedPart.id, 0);

      return {
        serialNumber: serializedPart.serialNumber,
        partNumber: serializedPart.part.partNumber,
        partName: serializedPart.part.partName,
        components,
        totalComponents: components.length,
      };
    } catch (error) {
      console.error('Backward traceability query failed:', error);
      throw new Error('Failed to retrieve backward traceability');
    }
  }

  /**
   * Get genealogy tree as graph (optimized for D3.js visualization)
   */
  async getGenealogyGraph(
    serialNumber: string,
    maxDepth: number = 10
  ): Promise<GenealogyGraph> {
    try {
      // Get the serialized part
      const serializedPart = await prisma.serializedPart.findUnique({
        where: { serialNumber },
        include: {
          part: true,
        },
      });

      if (!serializedPart) {
        throw new Error('Serialized part not found');
      }

      const nodes: GenealogyNode[] = [];
      const edges: GenealogyEdge[] = [];
      const visited = new Set<string>();

      // Build graph recursively
      await this.buildGenealogyGraph(
        serializedPart.id,
        0,
        maxDepth,
        nodes,
        edges,
        visited
      );

      return {
        nodes,
        edges,
        rootNodeId: serializedPart.id,
        maxDepth: Math.max(...nodes.map((n) => n.level)),
      };
    } catch (error) {
      console.error('Genealogy graph generation failed:', error);
      throw new Error('Failed to generate genealogy graph');
    }
  }

  // ===== PRIVATE METHODS =====

  /**
   * Recursively collect all components for backward traceability
   */
  private async collectAllComponents(
    parentPartId: string,
    level: number,
    visited: Set<string> = new Set()
  ): Promise<BackwardTraceabilityResult['components']> {
    // Prevent circular references
    if (visited.has(parentPartId)) {
      return [];
    }
    visited.add(parentPartId);

    // Get components of this part
    const genealogyRecords = await prisma.partGenealogy.findMany({
      where: { parentPartId },
      include: {
        componentPart: {
          include: {
            part: true,
          },
        },
      },
    });

    const components: BackwardTraceabilityResult['components'] = [];

    for (const record of genealogyRecords) {
      const componentPart = record.componentPart;

      components.push({
        serialNumber: componentPart.serialNumber,
        partNumber: componentPart.part.partNumber,
        partName: componentPart.part.partName,
        lotNumber: componentPart.lotNumber || undefined,
        supplier: componentPart.customerInfo || undefined, // Reusing this field
        assemblyDate: record.assemblyDate?.toISOString(),
        level,
      });

      // Recursively get sub-components
      const subComponents = await this.collectAllComponents(
        componentPart.id,
        level + 1,
        visited
      );
      components.push(...subComponents);
    }

    return components;
  }

  /**
   * Recursively build genealogy graph for D3.js
   */
  private async buildGenealogyGraph(
    partId: string,
    level: number,
    maxDepth: number,
    nodes: GenealogyNode[],
    edges: GenealogyEdge[],
    visited: Set<string>
  ): Promise<void> {
    // Prevent circular references and depth limit
    if (visited.has(partId) || level > maxDepth) {
      return;
    }
    visited.add(partId);

    // Get serialized part with components
    const serializedPart = await prisma.serializedPart.findUnique({
      where: { id: partId },
      include: {
        part: true,
        components: {
          include: {
            componentPart: {
              include: {
                part: true,
              },
            },
          },
        },
      },
    });

    if (!serializedPart) {
      return;
    }

    // Add node
    nodes.push({
      id: serializedPart.id,
      serialNumber: serializedPart.serialNumber,
      partNumber: serializedPart.part.partNumber,
      partName: serializedPart.part.partName,
      partType: serializedPart.part.partType,
      lotNumber: serializedPart.lotNumber || undefined,
      status: serializedPart.status,
      manufactureDate: serializedPart.manufactureDate?.toISOString(),
      level,
      nodeType: this.determineNodeType(serializedPart.part.partType, level),
    });

    // Process components
    for (const genealogy of serializedPart.components) {
      const componentPart = genealogy.componentPart;

      // Add edge
      edges.push({
        id: genealogy.id,
        source: serializedPart.id,
        target: componentPart.id,
        relationship: 'contains',
        assemblyDate: genealogy.assemblyDate?.toISOString(),
        assemblyOperator: genealogy.assemblyOperator || undefined,
      });

      // Recursively add component nodes
      await this.buildGenealogyGraph(
        componentPart.id,
        level + 1,
        maxDepth,
        nodes,
        edges,
        visited
      );
    }
  }

  /**
   * Determine node type for visualization coloring
   */
  private determineNodeType(
    partType: string,
    level: number
  ): GenealogyNode['nodeType'] {
    if (level === 0) return 'finished';
    if (partType === 'RAW_MATERIAL' || partType === 'MATERIAL') return 'raw_material';
    if (partType === 'PURCHASED' || partType === 'PURCHASED_PART') return 'purchased';
    return 'wip';
  }

  /**
   * Detect circular references in genealogy
   */
  async detectCircularReferences(serialNumber: string): Promise<boolean> {
    try {
      const serializedPart = await prisma.serializedPart.findUnique({
        where: { serialNumber },
      });

      if (!serializedPart) {
        return false;
      }

      const visited = new Set<string>();
      return await this.hasCircularReference(serializedPart.id, visited);
    } catch (error) {
      console.error('Circular reference detection failed:', error);
      return false;
    }
  }

  /**
   * Recursively check for circular references
   */
  private async hasCircularReference(
    partId: string,
    visited: Set<string>,
    path: Set<string> = new Set()
  ): Promise<boolean> {
    if (path.has(partId)) {
      // Found circular reference
      return true;
    }

    if (visited.has(partId)) {
      // Already checked this branch
      return false;
    }

    visited.add(partId);
    path.add(partId);

    // Get components
    const genealogyRecords = await prisma.partGenealogy.findMany({
      where: { parentPartId: partId },
    });

    for (const record of genealogyRecords) {
      const hasCircular = await this.hasCircularReference(
        record.componentPartId,
        visited,
        new Set(path)
      );

      if (hasCircular) {
        return true;
      }
    }

    path.delete(partId);
    return false;
  }

  /**
   * Create genealogy relationship between parts
   */
  async createGenealogyRelationship(
    parentSerialNumber: string,
    componentSerialNumber: string,
    assemblyDate?: Date,
    assemblyOperator?: string
  ): Promise<PartGenealogy> {
    try {
      // Get parent and component parts
      const [parentPart, componentPart] = await Promise.all([
        prisma.serializedPart.findUnique({
          where: { serialNumber: parentSerialNumber },
        }),
        prisma.serializedPart.findUnique({
          where: { serialNumber: componentSerialNumber },
        }),
      ]);

      if (!parentPart || !componentPart) {
        throw new Error('Parent or component part not found');
      }

      // Check for circular reference before creating
      const wouldCreateCircular = await this.wouldCreateCircularReference(
        parentPart.id,
        componentPart.id
      );

      if (wouldCreateCircular) {
        throw new Error('Cannot create genealogy: would create circular reference');
      }

      // Create genealogy relationship
      const genealogy = await prisma.partGenealogy.create({
        data: {
          parentPartId: parentPart.id,
          componentPartId: componentPart.id,
          assemblyDate,
          assemblyOperator,
        },
      });

      return genealogy;
    } catch (error: any) {
      console.error('Failed to create genealogy relationship:', error);
      throw new Error(error.message || 'Failed to create genealogy relationship');
    }
  }

  /**
   * Check if creating a relationship would cause circular reference
   */
  private async wouldCreateCircularReference(
    parentPartId: string,
    componentPartId: string
  ): Promise<boolean> {
    // Check if componentPart is an ancestor of parentPart
    const visited = new Set<string>();
    return await this.isAncestor(componentPartId, parentPartId, visited);
  }

  /**
   * Check if potentialAncestor is an ancestor of descendant
   */
  private async isAncestor(
    potentialAncestorId: string,
    descendantId: string,
    visited: Set<string>
  ): Promise<boolean> {
    if (potentialAncestorId === descendantId) {
      return true;
    }

    if (visited.has(descendantId)) {
      return false;
    }
    visited.add(descendantId);

    // Get parents of descendant
    const parents = await prisma.partGenealogy.findMany({
      where: { componentPartId: descendantId },
    });

    for (const parent of parents) {
      const isAncestor = await this.isAncestor(
        potentialAncestorId,
        parent.parentPartId,
        visited
      );

      if (isAncestor) {
        return true;
      }
    }

    return false;
  }
}

export const traceabilityService = new TraceabilityService();
export default traceabilityService;
