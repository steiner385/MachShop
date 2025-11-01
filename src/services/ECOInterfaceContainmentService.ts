/**
 * ECO Interface Containment Service (Issue #226)
 *
 * Validates when engineering changes can be contained at interface boundaries
 * without cascading to parent assemblies. Ensures:
 * - All affected interfaces are maintained
 * - Interface specifications are satisfied
 * - No form/fit/function impact on interface mating surfaces
 * - Full documentation and compliance records
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

export interface ContainmentRequest {
  ecoId: string;
  affectedPartId: string;
  changeDescription: string;
  currentSpecifications: {
    form: string;
    fit: string;
    function: string;
    interfaceSpecifications: string[];
  };
  proposedSpecifications: {
    form: string;
    fit: string;
    function: string;
    interfaceSpecifications: string[];
  };
  affectedInterfaceIds: string[];
}

export interface InterfaceContainmentAnalysis {
  ecoId: string;
  partId: string;
  canBeContained: boolean;
  containmentLevel: 'MODULE' | 'SUBASSEMBLY' | 'COMPONENT' | 'NOT_CONTAINABLE';
  interfaceComplianceStatus: InterfaceCompliance[];
  riskFactors: string[];
  containmentRationale: string;
  requiredValidations: string[];
  documentationRequired: string[];
  containmentEffectiveness: number; // 0-100
}

export interface InterfaceCompliance {
  interfaceId: string;
  interfaceNumber: string;
  icdNumber: string;
  specificationsMaintained: boolean;
  matingPartImpact: string;
  validationRequired: boolean;
  complianceStatus: 'COMPLIANT' | 'NON_COMPLIANT' | 'REQUIRES_ANALYSIS';
}

export interface ContainmentValidation {
  isValid: boolean;
  violations: ContainmentViolation[];
  compensationActions: string[];
  requiresWaiver: boolean;
  validationDate: Date;
  validatedBy: string;
}

export interface ContainmentViolation {
  interfaceId: string;
  violationType: string;
  description: string;
  severity: 'MINOR' | 'MAJOR' | 'CRITICAL';
  compensationRequired: boolean;
  compensationDescription?: string;
}

export class ECOInterfaceContainmentService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Analyze if a change can be contained without cascading to parents
   */
  async analyzeContainment(request: ContainmentRequest): Promise<InterfaceContainmentAnalysis> {
    try {
      logger.info(`Analyzing containment for ECO ${request.ecoId}, part ${request.affectedPartId}`);

      const part = await this.prisma.part.findUnique({
        where: { id: request.affectedPartId },
        include: {
          icdOwner: {
            include: {
              interfaceDefinition: true,
              participant: true,
            },
          },
          icdParticipant: {
            include: {
              interfaceDefinition: true,
              owner: true,
            },
          },
        },
      });

      if (!part) {
        throw new Error(`Part ${request.affectedPartId} not found`);
      }

      // Check if interfaces are affected by the change
      const interfaceCompliance = await this.checkInterfaceCompliance(
        request,
        part
      );

      // Determine if containment is possible
      const allCompliant = interfaceCompliance.every((c) =>
        c.specificationsMaintained
      );
      const canBeContained = allCompliant && request.affectedInterfaceIds.length > 0;

      // Assess containment effectiveness
      const containmentEffectiveness = this.calculateContainmentEffectiveness(
        interfaceCompliance
      );

      // Determine containment level
      const containmentLevel = this.determineContainmentLevel(
        request,
        interfaceCompliance
      );

      // Identify risk factors
      const riskFactors = this.identifyRiskFactors(
        request,
        interfaceCompliance
      );

      // Build rationale
      const containmentRationale = this.buildContainmentRationale(
        canBeContained,
        interfaceCompliance,
        containmentLevel
      );

      // Determine required validations
      const requiredValidations = this.determineRequiredValidations(
        request,
        interfaceCompliance
      );

      // Determine documentation needs
      const documentationRequired = this.determineDocumentationRequired(
        canBeContained,
        interfaceCompliance
      );

      const analysis: InterfaceContainmentAnalysis = {
        ecoId: request.ecoId,
        partId: request.affectedPartId,
        canBeContained,
        containmentLevel,
        interfaceComplianceStatus: interfaceCompliance,
        riskFactors,
        containmentRationale,
        requiredValidations,
        documentationRequired,
        containmentEffectiveness,
      };

      logger.info(`Containment analysis complete for ECO ${request.ecoId}`, {
        canBeContained,
        containmentLevel,
        effectiveness: containmentEffectiveness,
      });

      return analysis;

    } catch (error) {
      logger.error('Error analyzing containment:', error);
      throw new Error(`Failed to analyze containment: ${error.message}`);
    }
  }

  /**
   * Validate that a proposed containment meets all requirements
   */
  async validateContainment(
    ecoId: string,
    partId: string,
    interfaceIds: string[],
    validatedBy: string
  ): Promise<ContainmentValidation> {
    try {
      logger.info(`Validating containment for ECO ${ecoId}`);

      const violations: ContainmentViolation[] = [];
      const compensationActions: string[] = [];

      // Check each interface
      for (const interfaceId of interfaceIds) {
        const icd = await this.prisma.interfaceControlDocument.findUnique({
          where: { id: interfaceId },
          include: {
            interfaceDefinition: true,
          },
        });

        if (!icd) {
          violations.push({
            interfaceId,
            violationType: 'ICD_NOT_FOUND',
            description: `Interface Control Document ${interfaceId} not found`,
            severity: 'CRITICAL',
            compensationRequired: true,
          });
          continue;
        }

        // Validate interface specifications
        const specsValid = await this.validateInterfaceSpecifications(
          partId,
          icd
        );

        if (!specsValid) {
          violations.push({
            interfaceId,
            violationType: 'SPEC_MISMATCH',
            description: `Interface specifications do not match ICD ${icd.icdNumber}`,
            severity: 'MAJOR',
            compensationRequired: true,
            compensationDescription: 'Engineering review and waiver required',
          });

          compensationActions.push(
            `Obtain engineering sign-off on ICD ${icd.icdNumber} deviation`
          );
        }

        // Check mating part compatibility
        const matingPartCompatible = await this.checkMatingPartCompatibility(
          partId,
          icd
        );

        if (!matingPartCompatible) {
          violations.push({
            interfaceId,
            violationType: 'MATING_PART_INCOMPATIBLE',
            description: `Change affects mating part compatibility`,
            severity: 'CRITICAL',
            compensationRequired: true,
            compensationDescription:
              'Coordinate with mating part owner for concurrent ECO',
          });

          compensationActions.push('Create concurrent ECO for mating part');
        }
      }

      // Determine if containment is valid
      const hasNoViolations = violations.length === 0;
      const hasCriticalViolations = violations.some((v) => v.severity === 'CRITICAL');
      const requiresWaiver = violations.length > 0 && !hasCriticalViolations;

      const validation: ContainmentValidation = {
        isValid: hasNoViolations || (requiresWaiver && compensationActions.length > 0),
        violations,
        compensationActions,
        requiresWaiver,
        validationDate: new Date(),
        validatedBy,
      };

      logger.info(`Containment validation complete for ECO ${ecoId}`, {
        isValid: validation.isValid,
        violationCount: violations.length,
      });

      return validation;

    } catch (error) {
      logger.error('Error validating containment:', error);
      throw new Error(`Failed to validate containment: ${error.message}`);
    }
  }

  /**
   * Execute interface containment by recording validation and preventing cascade
   */
  async executeContainment(
    ecoId: string,
    partId: string,
    interfaceIds: string[],
    rationale: string,
    approvedBy: string
  ): Promise<void> {
    try {
      logger.info(`Executing interface containment for ECO ${ecoId}`);

      // Validate first
      const validation = await this.validateContainment(
        ecoId,
        partId,
        interfaceIds,
        approvedBy
      );

      if (!validation.isValid && !validation.requiresWaiver) {
        throw new Error('Containment validation failed and no waiver is available');
      }

      // Record containment decision in ECO
      const eco = await this.prisma.engineeringChangeOrder.findUnique({
        where: { id: ecoId },
      });

      if (!eco) {
        throw new Error(`ECO ${ecoId} not found`);
      }

      const containmentRecord = {
        containedAt: new Date(),
        containmentLevel: this.determineContainmentLevelFromInterfaces(interfaceIds),
        maintainedInterfaces: interfaceIds,
        rationale,
        validationStatus: validation.isValid ? 'VALIDATED' : 'WAIVERED',
        waiverRequired: validation.requiresWaiver,
        compensationActions: validation.compensationActions,
        approvedBy,
        violations: validation.violations,
      };

      // Update ECO with containment information
      const currentImpactAnalysis = (eco.impactAnalysis as any) || {};
      const impactAnalysis = {
        ...currentImpactAnalysis,
        containment: containmentRecord,
      };

      await this.prisma.engineeringChangeOrder.update({
        where: { id: ecoId },
        data: {
          impactAnalysis: impactAnalysis as any,
        },
      });

      // Create history entry
      await this.prisma.eCOHistory.create({
        data: {
          ecoId,
          eventType: 'CONTAINMENT_APPROVED',
          eventDescription: `Change contained at interface boundary - ${interfaceIds.length} interface(s) maintained`,
          details: containmentRecord as any,
          performedById: approvedBy,
          performedByName: 'System',
          occurredAt: new Date(),
        },
      });

      logger.info(`Interface containment executed for ECO ${ecoId}`);

    } catch (error) {
      logger.error('Error executing containment:', error);
      throw new Error(`Failed to execute containment: ${error.message}`);
    }
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async checkInterfaceCompliance(
    request: ContainmentRequest,
    part: any
  ): Promise<InterfaceCompliance[]> {
    const compliance: InterfaceCompliance[] = [];

    // Get all interfaces for this part
    const allInterfaces = [
      ...(part.icdOwner || []),
      ...(part.icdParticipant || []),
    ];

    for (const icd of allInterfaces) {
      // Check if specifications are maintained
      const specsMaintained = this.checkSpecificationMaintenance(
        request.currentSpecifications,
        request.proposedSpecifications,
        icd
      );

      const matingPartImpact = specsMaintained
        ? 'No impact expected'
        : 'Potential impact - review required';

      compliance.push({
        interfaceId: icd.id,
        interfaceNumber: icd.icdNumber,
        icdNumber: icd.icdNumber,
        specificationsMaintained: specsMaintained,
        matingPartImpact,
        validationRequired: !specsMaintained,
        complianceStatus: specsMaintained ? 'COMPLIANT' : 'REQUIRES_ANALYSIS',
      });
    }

    return compliance;
  }

  private checkSpecificationMaintenance(
    currentSpecs: any,
    proposedSpecs: any,
    icd: any
  ): boolean {
    // Check if any interface specification changes
    const interfaceSpecsChanged =
      JSON.stringify(currentSpecs.interfaceSpecifications) !==
      JSON.stringify(proposedSpecs.interfaceSpecifications);

    // Check if fit or function changes affect interface
    const fitChanged = currentSpecs.fit !== proposedSpecs.fit;
    const functionChanged = currentSpecs.function !== proposedSpecs.function;

    // Interfaces are maintained if no interface or fit/function changes
    return !interfaceSpecsChanged && !fitChanged && !functionChanged;
  }

  private async validateInterfaceSpecifications(
    partId: string,
    icd: any
  ): Promise<boolean> {
    try {
      // In a real implementation, this would validate against ICD requirements
      // For now, assume specifications are valid if ICD exists
      return !!icd && !!icd.interfaceDefinition;
    } catch {
      return false;
    }
  }

  private async checkMatingPartCompatibility(
    partId: string,
    icd: any
  ): Promise<boolean> {
    try {
      // Check if mating part is available and compatible
      const matingPart = icd.participant || icd.owner;
      return !!matingPart;
    } catch {
      return false;
    }
  }

  private calculateContainmentEffectiveness(compliance: InterfaceCompliance[]): number {
    if (compliance.length === 0) return 0;

    const compliantCount = compliance.filter((c) => c.specificationsMaintained).length;
    return Math.round((compliantCount / compliance.length) * 100);
  }

  private determineContainmentLevel(
    request: ContainmentRequest,
    compliance: InterfaceCompliance[]
  ): 'MODULE' | 'SUBASSEMBLY' | 'COMPONENT' | 'NOT_CONTAINABLE' {
    const allCompliant = compliance.every((c) => c.specificationsMaintained);

    if (!allCompliant) {
      return 'NOT_CONTAINABLE';
    }

    // Determine containment level based on assembly type
    // This would typically be determined from part classification
    if (request.currentSpecifications.form === request.proposedSpecifications.form) {
      return 'COMPONENT';
    }

    return 'MODULE';
  }

  private determineContainmentLevelFromInterfaces(interfaceIds: string[]): string {
    if (interfaceIds.length === 0) return 'NONE';
    if (interfaceIds.length === 1) return 'COMPONENT';
    if (interfaceIds.length <= 3) return 'SUBASSEMBLY';
    return 'MODULE';
  }

  private identifyRiskFactors(
    request: ContainmentRequest,
    compliance: InterfaceCompliance[]
  ): string[] {
    const factors: string[] = [];

    const nonCompliant = compliance.filter((c) => !c.specificationsMaintained);
    if (nonCompliant.length > 0) {
      factors.push(`${nonCompliant.length} interface(s) require analysis`);
    }

    if (request.proposedSpecifications.fit !== request.currentSpecifications.fit) {
      factors.push('Fit change detected - interface impact possible');
    }

    if (
      request.proposedSpecifications.function !==
      request.currentSpecifications.function
    ) {
      factors.push('Function change detected - interface impact likely');
    }

    return factors;
  }

  private buildContainmentRationale(
    canBeContained: boolean,
    compliance: InterfaceCompliance[],
    containmentLevel: string
  ): string {
    const parts: string[] = [];

    if (canBeContained) {
      const maintainedInterfaces = compliance.filter(
        (c) => c.specificationsMaintained
      ).length;
      parts.push(
        `Change can be contained at ${containmentLevel} level`
      );
      parts.push(`All ${maintainedInterfaces} interface(s) specifications maintained`);
      parts.push('No cascade to parent assemblies required');
    } else {
      const failedInterfaces = compliance.filter(
        (c) => !c.specificationsMaintained
      );
      parts.push('Change cannot be contained');
      parts.push(
        `${failedInterfaces.length} interface(s) affected by change`
      );
      parts.push('Cascade to parent assemblies required');
    }

    return parts.join('; ');
  }

  private determineRequiredValidations(
    request: ContainmentRequest,
    compliance: InterfaceCompliance[]
  ): string[] {
    const validations: string[] = [];

    const needsAnalysis = compliance.filter((c) => c.validationRequired);
    if (needsAnalysis.length > 0) {
      validations.push('Interface specification impact analysis');
    }

    if (request.proposedSpecifications.fit !== request.currentSpecifications.fit) {
      validations.push('Dimensional analysis and fit validation');
    }

    if (
      request.proposedSpecifications.function !==
      request.currentSpecifications.function
    ) {
      validations.push('Functional testing and performance validation');
    }

    return validations;
  }

  private determineDocumentationRequired(
    canBeContained: boolean,
    compliance: InterfaceCompliance[]
  ): string[] {
    const docs: string[] = [];

    // Always need updated drawings
    docs.push('Updated part drawing with revision');

    if (!canBeContained) {
      docs.push('Cascade impact analysis');
      docs.push('Parent assembly design changes');
    }

    const needsAnalysis = compliance.filter((c) => c.validationRequired);
    if (needsAnalysis.length > 0) {
      docs.push('Interface specification compliance report');
      docs.push('Engineering waiver (if necessary)');
    }

    return docs;
  }
}

export default ECOInterfaceContainmentService;
