/**
 * Change Impact Analysis Service (Issue #225)
 *
 * Service for analyzing the impact of part changes across BOM hierarchy,
 * identifying affected assemblies, and recommending change propagation strategy.
 *
 * Features:
 * - Multi-level BOM where-used analysis
 * - Interface boundary detection
 * - Interchangeability assessment
 * - Impact recommendation (Propagate vs. Isolate)
 * - Risk assessment and blast radius calculation
 * - Change impact visualization data generation
 */

import prisma from '../lib/database';
import { logger } from '../utils/logger';
import { PartInterchangeabilityService } from './PartInterchangeabilityService';
import { ICDService } from './ICDService';
import { AsBuiltBOMService } from './AsBuiltBOMService';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface WhereUsedAnalysisRequest {
  partId: string;
  includeEffectivity?: boolean;
  effectiveDate?: Date;
  maxDepth?: number;
}

export interface WhereUsedResult {
  partId: string;
  partNumber: string;
  partName: string;
  affectedAssemblies: AffectedAssembly[];
  totalAffectedCount: number;
  hierarchyDepth: number;
  lastAnalyzedAt: Date;
}

export interface AffectedAssembly {
  assemblyId: string;
  partNumber: string;
  partName: string;
  assemblyLevel: number;
  quantity: number;
  position?: string;
  relationship?: string;
  isEffective: boolean;
  effectivityStart?: Date;
  effectivityEnd?: Date;
  ancestors: AncestorAssembly[];
  hasInterfaceBoundary: boolean;
  interfaceControlDocuments?: string[];
}

export interface AncestorAssembly {
  partId: string;
  partNumber: string;
  partName: string;
  level: number;
  quantity: number;
}

export interface ImpactAssessmentRequest {
  sourcePart: {
    id: string;
    partNumber: string;
  };
  changeDescription: string;
  changeType: 'DESIGN' | 'MATERIAL' | 'PROCESS' | 'DIMENSIONAL' | 'FUNCTIONAL';
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  affectedAssemblies: string[];
}

export interface ImpactAssessment {
  sourcePart: {
    id: string;
    partNumber: string;
  };
  changeType: string;
  severity: string;
  affectedAssemblyCount: number;
  blastRadius: BlastRadius;
  interchangeabilityStatus: InterchangeabilityStatus;
  recommendation: ChangeRecommendation;
  riskAssessment: RiskAssessment;
  implications: Implication[];
}

export interface BlastRadius {
  directlyAffected: number;
  indirectlyAffected: number;
  totalAffected: number;
  maxDepth: number;
  estimatedProductsImpacted: number;
}

export interface InterchangeabilityStatus {
  hasInterchangeabilityGroup: boolean;
  groupId?: string;
  substitutesAvailable: number;
  availableSubstitutes: {
    partId: string;
    partNumber: string;
    partName: string;
    priority: number;
  }[];
}

export interface ChangeRecommendation {
  strategy: 'PROPAGATE' | 'ISOLATE' | 'REVISION_ONLY';
  rationale: string;
  confidence: number; // 0-100
  alternativeStrategies: string[];
  estimatedImpact: string;
}

export interface RiskAssessment {
  overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  supplyChainRisk: string;
  complianceRisk: string;
  inventoryRisk: string;
  scheduleRisk: string;
  mitigationActions: string[];
}

export interface Implication {
  category: string;
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  affectedAreas: string[];
}

export interface RecommendationRequest {
  partId: string;
  changeType: 'DESIGN' | 'MATERIAL' | 'PROCESS' | 'DIMENSIONAL' | 'FUNCTIONAL';
  severity: 'MINOR' | 'MODERATE' | 'MAJOR' | 'CRITICAL';
  whiteUsedAnalysis: WhereUsedResult;
}

export class ChangeImpactAnalysisService {
  private static instance: ChangeImpactAnalysisService;
  private partInterchangeabilityService: PartInterchangeabilityService;
  private icdService: ICDService;
  private asBuiltBOMService: AsBuiltBOMService;

  private constructor() {
    this.partInterchangeabilityService = PartInterchangeabilityService.getInstance();
    this.icdService = new ICDService(prisma);
    this.asBuiltBOMService = AsBuiltBOMService.getInstance();
  }

  public static getInstance(): ChangeImpactAnalysisService {
    if (!ChangeImpactAnalysisService.instance) {
      ChangeImpactAnalysisService.instance = new ChangeImpactAnalysisService();
    }
    return ChangeImpactAnalysisService.instance;
  }

  // ============================================================================
  // WHERE-USED ANALYSIS
  // ============================================================================

  /**
   * Perform multi-level BOM where-used analysis to find all assemblies using a part
   */
  async analyzeWhereUsed(request: WhereUsedAnalysisRequest): Promise<WhereUsedResult> {
    try {
      const { partId, includeEffectivity = true, effectiveDate = new Date(), maxDepth = 10 } = request;

      // Get the part
      const part = await prisma.part.findUnique({
        where: { id: partId },
        select: { id: true, partNumber: true, partName: true },
      });

      if (!part) {
        throw new Error(`Part ${partId} not found`);
      }

      logger.info(`Starting where-used analysis for part ${part.partNumber}`);

      // Find all direct usages
      const affectedAssemblies: AffectedAssembly[] = [];
      const directUsages = await this.findDirectUsages(partId, includeEffectivity, effectiveDate);

      // For each direct usage, traverse up the BOM hierarchy
      for (const usage of directUsages) {
        const ancestors = await this.traverseBOMHierarchy(usage.assemblyId, maxDepth, includeEffectivity, effectiveDate);
        const hasInterfaceBoundary = await this.checkInterfaceBoundary(usage.assemblyId);
        const icdDocuments = await this.findICDDocuments(partId, usage.assemblyId);

        affectedAssemblies.push({
          assemblyId: usage.assemblyId,
          partNumber: usage.partNumber,
          partName: usage.partName,
          assemblyLevel: 1,
          quantity: usage.quantity,
          position: usage.position,
          relationship: usage.relationship,
          isEffective: usage.isEffective,
          effectivityStart: usage.effectivityStart,
          effectivityEnd: usage.effectivityEnd,
          ancestors,
          hasInterfaceBoundary,
          interfaceControlDocuments: icdDocuments,
        });
      }

      logger.info(`Where-used analysis complete: Found ${affectedAssemblies.length} affected assemblies`);

      return {
        partId,
        partNumber: part.partNumber,
        partName: part.partName,
        affectedAssemblies,
        totalAffectedCount: affectedAssemblies.length,
        hierarchyDepth: this.calculateHierarchyDepth(affectedAssemblies),
        lastAnalyzedAt: new Date(),
      };
    } catch (error) {
      logger.error(`Where-used analysis failed: ${error}`);
      throw error;
    }
  }

  /**
   * Find all direct usages of a part in parent assemblies
   */
  private async findDirectUsages(
    partId: string,
    includeEffectivity: boolean,
    effectiveDate: Date
  ): Promise<any[]> {
    try {
      // Query BOM lines where this part is used
      const bomLines = await prisma.bOMLine.findMany({
        where: {
          partId,
          ...(includeEffectivity && {
            OR: [
              { effectivityStart: { lte: effectiveDate } },
              { effectivityStart: null },
            ],
            AND: [
              {
                OR: [
                  { effectivityEnd: { gte: effectiveDate } },
                  { effectivityEnd: null },
                ],
              },
            ],
          }),
        },
        include: {
          bom: {
            select: {
              id: true,
              partId: true,
              part: { select: { partNumber: true, partName: true } },
            },
          },
        },
      });

      return bomLines.map((line) => ({
        assemblyId: line.bomId,
        partNumber: line.bom.part.partNumber,
        partName: line.bom.part.partName,
        quantity: line.quantity,
        position: line.position,
        relationship: line.relationship,
        isEffective: includeEffectivity ? this.isEffective(line, effectiveDate) : true,
        effectivityStart: line.effectivityStart,
        effectivityEnd: line.effectivityEnd,
      }));
    } catch (error) {
      logger.error(`Failed to find direct usages: ${error}`);
      throw error;
    }
  }

  /**
   * Traverse BOM hierarchy to find ancestor assemblies
   */
  private async traverseBOMHierarchy(
    assemblyId: string,
    maxDepth: number,
    includeEffectivity: boolean,
    effectiveDate: Date,
    currentDepth: number = 0,
    visited: Set<string> = new Set()
  ): Promise<AncestorAssembly[]> {
    if (currentDepth >= maxDepth || visited.has(assemblyId)) {
      return [];
    }

    visited.add(assemblyId);
    const ancestors: AncestorAssembly[] = [];

    try {
      // Find parent assemblies that use this assembly
      const parentBomLines = await prisma.bOMLine.findMany({
        where: {
          partId: assemblyId,
          ...(includeEffectivity && {
            OR: [
              { effectivityStart: { lte: effectiveDate } },
              { effectivityStart: null },
            ],
            AND: [
              {
                OR: [
                  { effectivityEnd: { gte: effectiveDate } },
                  { effectivityEnd: null },
                ],
              },
            ],
          }),
        },
        include: {
          bom: {
            select: {
              id: true,
              partId: true,
              part: { select: { id: true, partNumber: true, partName: true } },
            },
          },
        },
      });

      for (const bomLine of parentBomLines) {
        ancestors.push({
          partId: bomLine.bom.part.id,
          partNumber: bomLine.bom.part.partNumber,
          partName: bomLine.bom.part.partName,
          level: currentDepth + 1,
          quantity: bomLine.quantity,
        });

        // Recursively find higher-level ancestors
        const higherAncestors = await this.traverseBOMHierarchy(
          bomLine.bomId,
          maxDepth,
          includeEffectivity,
          effectiveDate,
          currentDepth + 1,
          visited
        );
        ancestors.push(...higherAncestors);
      }
    } catch (error) {
      logger.error(`Failed to traverse BOM hierarchy: ${error}`);
    }

    return ancestors;
  }

  /**
   * Check if there's an interface boundary at the assembly
   */
  private async checkInterfaceBoundary(assemblyId: string): Promise<boolean> {
    try {
      const icdInterfaces = await prisma.interfaceControlDocument.findMany({
        where: {
          OR: [
            { providingComponentId: assemblyId },
            { consumingComponentId: assemblyId },
          ],
        },
        take: 1,
      });

      return icdInterfaces.length > 0;
    } catch (error) {
      logger.error(`Failed to check interface boundary: ${error}`);
      return false;
    }
  }

  /**
   * Find Interface Control Documents related to the part and assembly
   */
  private async findICDDocuments(partId: string, assemblyId: string): Promise<string[]> {
    try {
      const icds = await prisma.interfaceControlDocument.findMany({
        where: {
          OR: [
            {
              icdPartImplementations: {
                some: {
                  partId,
                },
              },
            },
            {
              icdPartConsumptions: {
                some: {
                  partId,
                },
              },
            },
          ],
        },
        select: { icdNumber: true },
      });

      return icds.map((icd) => icd.icdNumber);
    } catch (error) {
      logger.error(`Failed to find ICD documents: ${error}`);
      return [];
    }
  }

  /**
   * Calculate maximum hierarchy depth
   */
  private calculateHierarchyDepth(affectedAssemblies: AffectedAssembly[]): number {
    if (affectedAssemblies.length === 0) return 0;
    return Math.max(...affectedAssemblies.map((a) => Math.max(...a.ancestors.map((anc) => anc.level), 0))) + 1;
  }

  /**
   * Check if a BOM line is effective at the given date
   */
  private isEffective(bomLine: any, effectiveDate: Date): boolean {
    const start = bomLine.effectivityStart || new Date(0);
    const end = bomLine.effectivityEnd || new Date('2099-12-31');
    return effectiveDate >= start && effectiveDate <= end;
  }

  // ============================================================================
  // IMPACT ASSESSMENT
  // ============================================================================

  /**
   * Perform comprehensive impact assessment for a change
   */
  async assessChangeImpact(request: ImpactAssessmentRequest): Promise<ImpactAssessment> {
    try {
      logger.info(`Assessing impact for part ${request.sourcePart.partNumber}`);

      // Get where-used analysis
      const whereUsedResult = await this.analyzeWhereUsed({
        partId: request.sourcePart.id,
        maxDepth: 10,
      });

      // Calculate blast radius
      const blastRadius = this.calculateBlastRadius(whereUsedResult);

      // Check interchangeability options
      const interchangeabilityStatus = await this.assessInterchangeability(request.sourcePart.id);

      // Get intelligent recommendation
      const recommendation = this.generateRecommendation(
        request,
        whereUsedResult,
        interchangeabilityStatus
      );

      // Assess risks
      const riskAssessment = this.assessRisks(request, blastRadius, whereUsedResult);

      // Identify implications
      const implications = this.identifyImplications(request, whereUsedResult);

      const assessment: ImpactAssessment = {
        sourcePart: request.sourcePart,
        changeType: request.changeType,
        severity: request.severity,
        affectedAssemblyCount: whereUsedResult.affectedAssemblies.length,
        blastRadius,
        interchangeabilityStatus,
        recommendation,
        riskAssessment,
        implications,
      };

      logger.info(`Impact assessment complete for ${request.sourcePart.partNumber}`);
      return assessment;
    } catch (error) {
      logger.error(`Impact assessment failed: ${error}`);
      throw error;
    }
  }

  /**
   * Calculate the blast radius of a change
   */
  private calculateBlastRadius(whereUsedResult: WhereUsedResult): BlastRadius {
    const directlyAffected = whereUsedResult.affectedAssemblies.length;
    const allAffected = new Set<string>();

    for (const assembly of whereUsedResult.affectedAssemblies) {
      allAffected.add(assembly.assemblyId);
      assembly.ancestors.forEach((anc) => allAffected.add(anc.partId));
    }

    const indirectlyAffected = allAffected.size - directlyAffected;

    return {
      directlyAffected,
      indirectlyAffected,
      totalAffected: allAffected.size,
      maxDepth: whereUsedResult.hierarchyDepth,
      estimatedProductsImpacted: Math.ceil(allAffected.size * 1.2), // Estimate 20% more due to variances
    };
  }

  /**
   * Assess interchangeability options
   */
  private async assessInterchangeability(partId: string): Promise<InterchangeabilityStatus> {
    try {
      // This would integrate with PartInterchangeabilityService
      // For now, return a basic structure
      return {
        hasInterchangeabilityGroup: false,
        substitutesAvailable: 0,
        availableSubstitutes: [],
      };
    } catch (error) {
      logger.error(`Failed to assess interchangeability: ${error}`);
      return {
        hasInterchangeabilityGroup: false,
        substitutesAvailable: 0,
        availableSubstitutes: [],
      };
    }
  }

  /**
   * Generate intelligent change recommendation
   */
  private generateRecommendation(
    request: ImpactAssessmentRequest,
    whereUsedResult: WhereUsedResult,
    interchangeabilityStatus: InterchangeabilityStatus
  ): ChangeRecommendation {
    const hasInterfaceBoundaries = whereUsedResult.affectedAssemblies.some((a) => a.hasInterfaceBoundary);
    const isFullyInterchangeable = interchangeabilityStatus.hasInterchangeabilityGroup &&
                                   interchangeabilityStatus.substitutesAvailable > 0;

    let strategy: 'PROPAGATE' | 'ISOLATE' | 'REVISION_ONLY';
    let rationale: string;
    let confidence: number;

    if (isFullyInterchangeable && request.severity === 'MINOR') {
      strategy = 'REVISION_ONLY';
      rationale = 'Part is fully interchangeable with approved substitutes; revision-only change allowed.';
      confidence = 95;
    } else if (hasInterfaceBoundaries && whereUsedResult.affectedAssemblies.every((a) => a.hasInterfaceBoundary)) {
      strategy = 'ISOLATE';
      rationale =
        'All affected assemblies have interface boundaries; change can be isolated at interface level.';
      confidence = 85;
    } else if (request.severity === 'CRITICAL' || whereUsedResult.hierarchyDepth > 6) {
      strategy = 'PROPAGATE';
      rationale = 'Critical change or deep hierarchy requires full propagation for consistency and safety.';
      confidence = 80;
    } else {
      strategy = 'PROPAGATE';
      rationale = 'Recommend propagating change to maintain consistency across affected assemblies.';
      confidence = 70;
    }

    const alternativeStrategies = strategy !== 'PROPAGATE' ? ['PROPAGATE'] :
                                   strategy !== 'ISOLATE' ? ['ISOLATE'] :
                                   ['PROPAGATE', 'ISOLATE'];

    return {
      strategy,
      rationale,
      confidence,
      alternativeStrategies,
      estimatedImpact:
        strategy === 'PROPAGATE'
          ? `Full propagation affecting ${whereUsedResult.totalAffectedCount} assemblies`
          : strategy === 'ISOLATE'
            ? `Change contained at interface boundaries; ${whereUsedResult.affectedAssemblies.length} direct usages`
            : `Revision-only change; no propagation required`,
    };
  }

  /**
   * Assess risks associated with the change
   */
  private assessRisks(
    request: ImpactAssessmentRequest,
    blastRadius: BlastRadius,
    whereUsedResult: WhereUsedResult
  ): RiskAssessment {
    const severityWeights = {
      MINOR: 1,
      MODERATE: 2,
      MAJOR: 3,
      CRITICAL: 4,
    };

    const severityWeight = severityWeights[request.severity] || 2;
    const impactWeight = blastRadius.totalAffected / 10; // Normalize

    let overallRisk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (severityWeight >= 3 || impactWeight >= 3) {
      overallRisk = 'CRITICAL';
    } else if (severityWeight >= 2 || impactWeight >= 2) {
      overallRisk = 'HIGH';
    } else if (severityWeight >= 1 || impactWeight >= 1) {
      overallRisk = 'MEDIUM';
    } else {
      overallRisk = 'LOW';
    }

    const mitigationActions = [];
    if (overallRisk === 'CRITICAL') {
      mitigationActions.push('Conduct formal design review');
      mitigationActions.push('Perform extensive testing on all affected assemblies');
    }
    if (blastRadius.totalAffected > 5) {
      mitigationActions.push('Develop detailed change communication plan');
      mitigationActions.push('Schedule supplier notification');
    }
    if (request.changeType === 'DIMENSIONAL' || request.changeType === 'DESIGN') {
      mitigationActions.push('Update engineering drawings and BOMs');
      mitigationActions.push('Verify tool and fixture compatibility');
    }

    return {
      overallRisk,
      supplyChainRisk: blastRadius.totalAffected > 3 ? 'High - Multiple suppliers may be affected' : 'Low',
      complianceRisk: whereUsedResult.affectedAssemblies.some((a) => a.interfaceControlDocuments && a.interfaceControlDocuments.length > 0)
        ? 'Medium - ICD changes may be required'
        : 'Low',
      inventoryRisk: blastRadius.totalAffected > 5 ? 'Medium - Significant inventory obsolescence risk' : 'Low',
      scheduleRisk: request.severity === 'CRITICAL' ? 'High - May impact production schedule' : 'Low',
      mitigationActions,
    };
  }

  /**
   * Identify implications of the change
   */
  private identifyImplications(request: ImpactAssessmentRequest, whereUsedResult: WhereUsedResult): Implication[] {
    const implications: Implication[] = [];

    // Engineering implications
    implications.push({
      category: 'Engineering',
      description: `Change affects ${whereUsedResult.affectedAssemblies.length} assemblies across ${whereUsedResult.hierarchyDepth} BOM levels`,
      severity: request.severity === 'CRITICAL' || request.severity === 'MAJOR' ? 'HIGH' : 'MEDIUM',
      affectedAreas: ['Design', 'Drawings', 'Specifications'],
    });

    // Compliance implications
    if (whereUsedResult.affectedAssemblies.some((a) => a.interfaceControlDocuments && a.interfaceControlDocuments.length > 0)) {
      implications.push({
        category: 'Compliance',
        description: 'Change affects Interface Control Documents; ICD revisions required',
        severity: 'HIGH',
        affectedAreas: ['ICD', 'Configuration Management', 'Traceability'],
      });
    }

    // Supply Chain implications
    if (whereUsedResult.affectedAssemblies.length > 3) {
      implications.push({
        category: 'Supply Chain',
        description: `Multiple suppliers and commodity suppliers may be affected; coordination required`,
        severity: 'MEDIUM',
        affectedAreas: ['Procurement', 'Supplier Management', 'Inventory'],
      });
    }

    // Schedule implications
    implications.push({
      category: 'Schedule',
      description: request.severity === 'CRITICAL' ?
        'Critical change may require production holds; schedule impact assessment needed' :
        'Standard ECO timeline applies',
      severity: request.severity === 'CRITICAL' ? 'HIGH' : 'LOW',
      affectedAreas: ['Production', 'Planning', 'Delivery'],
    });

    return implications;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Export where-used analysis for change order
   */
  async exportWhereUsedAnalysis(partId: string, format: 'JSON' | 'CSV' | 'PDF' = 'JSON'): Promise<any> {
    const analysis = await this.analyzeWhereUsed({ partId });

    if (format === 'JSON') {
      return analysis;
    } else if (format === 'CSV') {
      return this.convertToCSV(analysis);
    } else if (format === 'PDF') {
      // Would integrate with PDF generation library
      return { message: 'PDF export not yet implemented' };
    }
  }

  /**
   * Convert where-used analysis to CSV
   */
  private convertToCSV(analysis: WhereUsedResult): string {
    const headers = ['Part Number', 'Part Name', 'Assembly Level', 'Quantity', 'Position', 'Has Interface'];
    const rows = analysis.affectedAssemblies.map((a) => [
      a.partNumber,
      a.partName,
      a.assemblyLevel,
      a.quantity,
      a.position || '',
      a.hasInterfaceBoundary ? 'Yes' : 'No',
    ]);

    return [headers, ...rows].map((row) => row.join(',')).join('\n');
  }
}

export default ChangeImpactAnalysisService;
