/**
 * ECO Classification Service (Issue #226)
 *
 * Intelligent classification system for Engineering Change Orders that determines:
 * - Change type (Form/Fit/Function impact)
 * - Safety criticality assessment
 * - Certification impact (FAA, EASA, etc.)
 * - Interface boundary detection
 * - Automatic classification with engineer override capability
 */

import { PrismaClient, ECOType, ECOPriority, EffectivityType } from '@prisma/client';
import { logger } from '../utils/logger';

export enum ChangeClassification {
  FORM_CHANGE = 'FORM_CHANGE',           // Shape/appearance only
  FIT_CHANGE = 'FIT_CHANGE',             // Dimensional/interface change
  FUNCTION_CHANGE = 'FUNCTION_CHANGE',   // Performance/behavior change
  COMBINED_CHANGE = 'COMBINED_CHANGE',   // Multiple categories
}

export enum SafetyCriticality {
  NON_CRITICAL = 'NON_CRITICAL',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export enum CertificationImpact {
  NONE = 'NONE',
  MINOR = 'MINOR',                   // Affects documentation only
  MODERATE = 'MODERATE',             // Requires re-analysis
  MAJOR = 'MAJOR',                   // Requires re-certification
  COMPLETE_RECERTIFICATION = 'COMPLETE_RECERTIFICATION',
}

export interface ClassificationRequest {
  ecoId: string;
  partId: string;
  changeDescription: string;
  currentCharacteristics: {
    form?: string;
    fit?: string;
    function?: string;
    safetyFunction?: boolean;
    certificated?: boolean;
    certificationBodies?: string[];
  };
  proposedCharacteristics: {
    form?: string;
    fit?: string;
    function?: string;
    safetyFunction?: boolean;
  };
  affectedAssemblyIds?: string[];
  overrideClassification?: {
    classification: ChangeClassification;
    reason: string;
    overriddenBy: string;
  };
}

export interface ClassificationResult {
  ecoId: string;
  partId: string;
  changeClassification: ChangeClassification;
  safetyCriticality: SafetyCriticality;
  certificationImpact: CertificationImpact;
  affectedCertificationBodies: string[];
  requiresFullPropagation: boolean;
  requiresCRBReview: boolean;
  suggestedPriority: ECOPriority;
  classificationRationale: string;
  riskFactors: string[];
  overriddenFromAutomatic?: {
    automaticClassification: ChangeClassification;
    overriddenBy: string;
    overrideReason: string;
    overriddenAt: Date;
  };
  confidence: number;
  suggestedApprovers: string[];
}

export interface InterfaceBoundaryAnalysis {
  partId: string;
  interfaceIds: string[];
  interfaceDocuments: Array<{
    icdId: string;
    icdNumber: string;
    interfaceType: string;
    isMaintained: boolean;
  }>;
  canBeContained: boolean;
  containmentRationale: string;
  affectedInterfaces: string[];
}

export class ECOClassificationService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Classify an ECO based on change characteristics
   */
  async classifyChange(request: ClassificationRequest): Promise<ClassificationResult> {
    try {
      logger.info(`Classifying ECO ${request.ecoId} for part ${request.partId}`);

      // Determine change type (Form/Fit/Function)
      const changeClassification = this.determineChangeClassification(request);

      // Assess safety criticality
      const safetyCriticality = this.assessSafetyCriticality(
        request,
        changeClassification
      );

      // Assess certification impact
      const certificationImpact = this.assessCertificationImpact(
        request,
        changeClassification
      );

      // Get affected certification bodies
      const affectedBodies = await this.getAffectedCertificationBodies(request.partId);

      // Determine if full propagation is required
      const requiresFullPropagation = this.determineFullPropagationNeed(
        changeClassification,
        safetyCriticality,
        certificationImpact
      );

      // Determine if CRB review is required
      const requiresCRBReview = this.determineCRBReviewNeed(
        changeClassification,
        safetyCriticality,
        certificationImpact,
        request.affectedAssemblyIds?.length || 0
      );

      // Suggest priority level
      const suggestedPriority = this.suggestPriority(
        safetyCriticality,
        requiresFullPropagation
      );

      // Suggest approvers based on classification
      const suggestedApprovers = await this.suggestApprovers(
        changeClassification,
        safetyCriticality,
        certificationImpact,
        request.partId
      );

      // Build rationale
      const classificationRationale = this.buildRationale(
        changeClassification,
        safetyCriticality,
        certificationImpact,
        requiresFullPropagation
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(
        changeClassification,
        safetyCriticality,
        certificationImpact,
        request
      );

      // Calculate confidence score (0-100)
      const confidence = this.calculateConfidenceScore(request);

      // Check for override
      const overriddenFromAutomatic = request.overrideClassification
        ? {
            automaticClassification: changeClassification,
            overriddenBy: request.overrideClassification.overriddenBy,
            overrideReason: request.overrideClassification.reason,
            overriddenAt: new Date(),
          }
        : undefined;

      const result: ClassificationResult = {
        ecoId: request.ecoId,
        partId: request.partId,
        changeClassification: request.overrideClassification
          ? request.overrideClassification.classification
          : changeClassification,
        safetyCriticality,
        certificationImpact,
        affectedCertificationBodies: affectedBodies,
        requiresFullPropagation,
        requiresCRBReview,
        suggestedPriority,
        classificationRationale,
        riskFactors,
        overriddenFromAutomatic,
        confidence,
        suggestedApprovers,
      };

      logger.info(`ECO classified successfully: ${changeClassification}`, {
        ecoId: request.ecoId,
        safetyCriticality,
        certificationImpact,
        requiresFullPropagation,
      });

      return result;

    } catch (error) {
      logger.error('Error classifying ECO:', error);
      throw new Error(`Failed to classify ECO: ${error.message}`);
    }
  }

  /**
   * Analyze interface boundaries for a part change
   */
  async analyzeInterfaceBoundaries(
    partId: string,
    changeDescription: string
  ): Promise<InterfaceBoundaryAnalysis> {
    try {
      // Get part and its interfaces
      const part = await this.prisma.part.findUnique({
        where: { id: partId },
        include: {
          icdOwner: {
            include: {
              interfaceDefinition: true,
            },
          },
          icdParticipant: {
            include: {
              interfaceDefinition: true,
            },
          },
        },
      });

      if (!part) {
        throw new Error(`Part ${partId} not found`);
      }

      // Get all interface control documents
      const ownedInterfaces = part.icdOwner || [];
      const participatingInterfaces = part.icdParticipant || [];

      const allInterfaces = [
        ...ownedInterfaces.map((icd) => ({
          icdId: icd.id,
          icdNumber: icd.icdNumber,
          interfaceType: 'OWNS',
          isMaintained: this.checkInterfaceMaintenance(icd, changeDescription),
        })),
        ...participatingInterfaces.map((icd) => ({
          icdId: icd.id,
          icdNumber: icd.icdNumber,
          interfaceType: 'PARTICIPATES',
          isMaintained: this.checkInterfaceMaintenance(icd, changeDescription),
        })),
      ];

      const maintainedInterfaces = allInterfaces.filter((i) => i.isMaintained);
      const affectedInterfaces = allInterfaces.filter((i) => !i.isMaintained);

      const canBeContained = maintainedInterfaces.length > 0 && affectedInterfaces.length === 0;
      const containmentRationale = canBeContained
        ? `All ${maintainedInterfaces.length} interfaces are maintained by this change`
        : `${affectedInterfaces.length} interfaces are affected and would require updates`;

      const analysis: InterfaceBoundaryAnalysis = {
        partId,
        interfaceIds: allInterfaces.map((i) => i.icdId),
        interfaceDocuments: allInterfaces,
        canBeContained,
        containmentRationale,
        affectedInterfaces: affectedInterfaces.map((i) => i.icdNumber),
      };

      logger.info(`Interface boundary analysis complete for part ${partId}`, {
        totalInterfaces: allInterfaces.length,
        maintainedCount: maintainedInterfaces.length,
        affectedCount: affectedInterfaces.length,
        canBeContained,
      });

      return analysis;

    } catch (error) {
      logger.error('Error analyzing interface boundaries:', error);
      throw new Error(`Failed to analyze interface boundaries: ${error.message}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private determineChangeClassification(
    request: ClassificationRequest
  ): ChangeClassification {
    const changes = {
      formChange: request.currentCharacteristics.form !== request.proposedCharacteristics.form,
      fitChange: request.currentCharacteristics.fit !== request.proposedCharacteristics.fit,
      functionChange:
        request.currentCharacteristics.function !== request.proposedCharacteristics.function,
    };

    const changeCount = Object.values(changes).filter(Boolean).length;

    if (changeCount === 0) {
      return ChangeClassification.FORM_CHANGE; // Default to minimal
    }

    if (changeCount === 1) {
      if (changes.functionChange) return ChangeClassification.FUNCTION_CHANGE;
      if (changes.fitChange) return ChangeClassification.FIT_CHANGE;
      return ChangeClassification.FORM_CHANGE;
    }

    return ChangeClassification.COMBINED_CHANGE;
  }

  private assessSafetyCriticality(
    request: ClassificationRequest,
    classification: ChangeClassification
  ): SafetyCriticality {
    const isSafetyFunction =
      request.currentCharacteristics.safetyFunction ||
      request.proposedCharacteristics.safetyFunction;

    if (!isSafetyFunction) {
      return SafetyCriticality.NON_CRITICAL;
    }

    // If it's a safety function, assess based on change type
    switch (classification) {
      case ChangeClassification.FORM_CHANGE:
        return SafetyCriticality.LOW;
      case ChangeClassification.FIT_CHANGE:
        return SafetyCriticality.HIGH;
      case ChangeClassification.FUNCTION_CHANGE:
        return SafetyCriticality.CRITICAL;
      case ChangeClassification.COMBINED_CHANGE:
        return SafetyCriticality.CRITICAL;
      default:
        return SafetyCriticality.MEDIUM;
    }
  }

  private assessCertificationImpact(
    request: ClassificationRequest,
    classification: ChangeClassification
  ): CertificationImpact {
    if (!request.currentCharacteristics.certificated) {
      return CertificationImpact.NONE;
    }

    switch (classification) {
      case ChangeClassification.FORM_CHANGE:
        return CertificationImpact.MINOR;
      case ChangeClassification.FIT_CHANGE:
        return CertificationImpact.MODERATE;
      case ChangeClassification.FUNCTION_CHANGE:
        return CertificationImpact.MAJOR;
      case ChangeClassification.COMBINED_CHANGE:
        return CertificationImpact.COMPLETE_RECERTIFICATION;
      default:
        return CertificationImpact.MINOR;
    }
  }

  private async getAffectedCertificationBodies(partId: string): Promise<string[]> {
    try {
      const part = await this.prisma.part.findUnique({
        where: { id: partId },
        select: {
          certificationBodies: true,
        },
      });

      return part?.certificationBodies || [];
    } catch {
      return [];
    }
  }

  private determineFullPropagationNeed(
    classification: ChangeClassification,
    criticality: SafetyCriticality,
    certification: CertificationImpact
  ): boolean {
    // Function changes always require full propagation
    if (classification === ChangeClassification.FUNCTION_CHANGE) {
      return true;
    }

    // Combined changes require full propagation
    if (classification === ChangeClassification.COMBINED_CHANGE) {
      return true;
    }

    // Safety-critical or certification-impacting changes require full propagation
    if (
      criticality === SafetyCriticality.CRITICAL ||
      criticality === SafetyCriticality.HIGH
    ) {
      return true;
    }

    if (
      certification === CertificationImpact.MAJOR ||
      certification === CertificationImpact.COMPLETE_RECERTIFICATION
    ) {
      return true;
    }

    // Fit changes may require propagation depending on severity
    if (
      classification === ChangeClassification.FIT_CHANGE &&
      (criticality === SafetyCriticality.MEDIUM || certification === CertificationImpact.MODERATE)
    ) {
      return true;
    }

    return false;
  }

  private determineCRBReviewNeed(
    classification: ChangeClassification,
    criticality: SafetyCriticality,
    certification: CertificationImpact,
    affectedAssemblyCount: number
  ): boolean {
    // CRB review required for significant changes
    if (classification === ChangeClassification.FUNCTION_CHANGE) {
      return true;
    }

    if (classification === ChangeClassification.COMBINED_CHANGE) {
      return true;
    }

    if (criticality === SafetyCriticality.CRITICAL) {
      return true;
    }

    if (certification !== CertificationImpact.NONE) {
      return true;
    }

    // Large cascades require CRB review
    if (affectedAssemblyCount > 5) {
      return true;
    }

    return false;
  }

  private suggestPriority(
    criticality: SafetyCriticality,
    requiresFullPropagation: boolean
  ): ECOPriority {
    if (criticality === SafetyCriticality.CRITICAL) {
      return ECOPriority.CRITICAL;
    }

    if (criticality === SafetyCriticality.HIGH) {
      return ECOPriority.HIGH;
    }

    if (criticality === SafetyCriticality.MEDIUM || requiresFullPropagation) {
      return ECOPriority.MEDIUM;
    }

    return ECOPriority.LOW;
  }

  private async suggestApprovers(
    classification: ChangeClassification,
    criticality: SafetyCriticality,
    certification: CertificationImpact,
    partId: string
  ): Promise<string[]> {
    const approvers: string[] = [];

    // Always need engineering approval
    approvers.push('ENGINEERING');

    // Quality approval needed for certified items
    if (certification !== CertificationImpact.NONE) {
      approvers.push('QUALITY');
    }

    // Manufacturing approval for fit/function changes
    if (
      classification === ChangeClassification.FIT_CHANGE ||
      classification === ChangeClassification.FUNCTION_CHANGE
    ) {
      approvers.push('MANUFACTURING');
    }

    // Supply chain for significant changes
    if (
      criticality === SafetyCriticality.HIGH ||
      criticality === SafetyCriticality.CRITICAL ||
      classification === ChangeClassification.FUNCTION_CHANGE
    ) {
      approvers.push('SUPPLY_CHAIN');
    }

    // Customer approval for certified assemblies
    const part = await this.prisma.part.findUnique({
      where: { id: partId },
      select: { customerApprovalRequired: true },
    });

    if (part?.customerApprovalRequired) {
      approvers.push('CUSTOMER');
    }

    return Array.from(new Set(approvers));
  }

  private buildRationale(
    classification: ChangeClassification,
    criticality: SafetyCriticality,
    certification: CertificationImpact,
    requiresFullPropagation: boolean
  ): string {
    const parts: string[] = [];

    parts.push(`Change type: ${this.humanize(classification)}`);
    parts.push(`Safety criticality: ${this.humanize(criticality)}`);
    parts.push(`Certification impact: ${this.humanize(certification)}`);

    if (requiresFullPropagation) {
      parts.push('Requires full BOM propagation due to criticality or certification impact');
    } else {
      parts.push('Can be contained if interfaces are maintained');
    }

    return parts.join('; ');
  }

  private identifyRiskFactors(
    classification: ChangeClassification,
    criticality: SafetyCriticality,
    certification: CertificationImpact,
    request: ClassificationRequest
  ): string[] {
    const factors: string[] = [];

    if (criticality === SafetyCriticality.CRITICAL) {
      factors.push('Safety-critical change - requires extensive review');
    }

    if (certification === CertificationImpact.COMPLETE_RECERTIFICATION) {
      factors.push('Requires complete re-certification');
    }

    if (classification === ChangeClassification.FUNCTION_CHANGE) {
      factors.push('Function change - high engineering impact');
    }

    if (
      request.affectedAssemblyIds &&
      request.affectedAssemblyIds.length > 0
    ) {
      factors.push(`Affects ${request.affectedAssemblyIds.length} assemblies`);
    }

    return factors;
  }

  private calculateConfidenceScore(request: ClassificationRequest): number {
    let confidence = 80; // Start with 80%

    // Reduce confidence if information is incomplete
    if (!request.currentCharacteristics.form) {
      confidence -= 5;
    }
    if (!request.currentCharacteristics.fit) {
      confidence -= 5;
    }
    if (!request.currentCharacteristics.function) {
      confidence -= 5;
    }

    // Reduce confidence for complex multi-category changes
    const categoryCount = [
      request.proposedCharacteristics.form !== request.currentCharacteristics.form,
      request.proposedCharacteristics.fit !== request.currentCharacteristics.fit,
      request.proposedCharacteristics.function !==
        request.currentCharacteristics.function,
    ].filter(Boolean).length;

    if (categoryCount > 1) {
      confidence -= 10;
    }

    return Math.max(60, Math.min(100, confidence));
  }

  private checkInterfaceMaintenance(icd: any, changeDescription: string): boolean {
    // Simple heuristic: check if change description mentions interface
    const interfaceKeywords = ['interface', 'connection', 'connector', 'port', 'pin'];
    const mentionsInterface = interfaceKeywords.some((keyword) =>
      changeDescription.toLowerCase().includes(keyword)
    );

    return !mentionsInterface;
  }

  private humanize(str: string): string {
    return str
      .replace(/_/g, ' ')
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      .toLowerCase()
      .replace(/^./, (c) => c.toUpperCase());
  }
}

export default ECOClassificationService;
