/**
 * ECO Cascade Logic Service (Issue #226)
 *
 * Handles automatic cascading of engineering changes up the BOM when:
 * - Interchangeability is broken
 * - Form/Fit/Function changes require propagation
 * - Generates new part numbers for affected assemblies
 * - Updates revision levels and creates revision records
 * - Stops cascading when interchangeability is reestablished at a parent level
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { PartInterchangeabilityService } from './PartInterchangeabilityService';

export interface CascadeChange {
  partId: string;
  partNumber: string;
  assemblyLevel: number;
  parentPartId: string;
  parentPartNumber: string;
  currentRevision: string;
  newRevision: string;
  newPartNumber?: string;
  cascadeReason: string;
  cascadeRequired: boolean;
  interchangeabilityMaintained: boolean;
}

export interface CascadePlan {
  originalPartId: string;
  originalPartNumber: string;
  totalLevelsAffected: number;
  cascadeChanges: CascadeChange[];
  newPartNumbersGenerated: number;
  estimatedEffort: number;
  estimatedCost: number;
  cascadeStopsAt?: {
    partId: string;
    partNumber: string;
    reason: string;
  };
  documentUpdateRequired: boolean;
  routingUpdateRequired: boolean;
  bomUpdateRequired: boolean;
}

export interface PartNumberGenerationRequest {
  basePartNumber: string;
  revisionLevel: string;
  changeType: string;
  cascadeReason: string;
  effectivityType: string;
  effectivityValue?: string;
}

export interface PartNumberGenerationResult {
  originalPartNumber: string;
  newPartNumber: string;
  revisionChange: {
    from: string;
    to: string;
  };
  generatedAt: Date;
  isInterchangeable: boolean;
}

export class ECOCascadeLogicService {
  private prisma: PrismaClient;
  private interchangeabilityService: PartInterchangeabilityService;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
    this.interchangeabilityService = new PartInterchangeabilityService(prisma);
  }

  /**
   * Analyze BOM and determine cascade requirements
   */
  async analyzeCascadeRequirements(
    affectedPartId: string,
    changeDescription: string,
    breakInterchangeability: boolean
  ): Promise<CascadePlan> {
    try {
      logger.info(`Analyzing cascade requirements for part ${affectedPartId}`, {
        breaksInterchangeability: breakInterchangeability,
      });

      const affectedPart = await this.prisma.part.findUnique({
        where: { id: affectedPartId },
        include: {
          bOMLines: {
            include: {
              bom: {
                include: {
                  part: true,
                },
              },
            },
          },
        },
      });

      if (!affectedPart) {
        throw new Error(`Part ${affectedPartId} not found`);
      }

      const cascadeChanges: CascadeChange[] = [];

      // Get all parent assemblies (where this part is used)
      const parentBomLines = await this.prisma.bOMLine.findMany({
        where: { partId: affectedPartId },
        include: {
          bom: {
            include: {
              part: {
                include: {
                  bOMLines: {
                    include: {
                      bom: {
                        include: {
                          part: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Traverse up the BOM hierarchy
      let currentLevel = 1;
      let parentPartsToProcess = parentBomLines.map((bl) => bl.bom.part);

      while (parentPartsToProcess.length > 0 && currentLevel <= 10) {
        const nextLevelParents: any[] = [];

        for (const parentPart of parentPartsToProcess) {
          // Check if interchangeability is broken
          const interchangeabilityStatus = await this.checkInterchangeabilityImpact(
            affectedPart,
            parentPart,
            changeDescription
          );

          // Create cascade change record
          const cascadeChange: CascadeChange = {
            partId: affectedPart.id,
            partNumber: affectedPart.partNumber,
            assemblyLevel: currentLevel,
            parentPartId: parentPart.id,
            parentPartNumber: parentPart.partNumber,
            currentRevision: parentPart.revisionLevel || 'A',
            newRevision: this.incrementRevision(parentPart.revisionLevel || 'A'),
            cascadeReason: breakInterchangeability
              ? `Interchangeability broken in component ${affectedPart.partNumber}`
              : `Cascade required for ${changeDescription}`,
            cascadeRequired: breakInterchangeability || !interchangeabilityStatus.maintained,
            interchangeabilityMaintained: interchangeabilityStatus.maintained,
          };

          cascadeChanges.push(cascadeChange);

          // Check if we should continue cascading
          if (!cascadeChange.cascadeRequired && !breakInterchangeability) {
            // Interchangeability is maintained or established at this level
            logger.info(
              `Cascade stops at part ${parentPart.partNumber} - interchangeability ${
                interchangeabilityStatus.maintained ? 'maintained' : 'reestablished'
              }`
            );
            break;
          }

          // Get next level parents
          const grandparentBomLines = await this.prisma.bOMLine.findMany({
            where: { partId: parentPart.id },
            include: {
              bom: {
                include: {
                  part: true,
                },
              },
            },
          });

          nextLevelParents.push(
            ...grandparentBomLines.map((bl) => bl.bom.part)
          );
        }

        parentPartsToProcess = Array.from(new Set(nextLevelParents)); // Deduplicate
        currentLevel++;
      }

      // Generate new part numbers for affected parts
      const newPartNumbers = await this.generateNewPartNumbers(cascadeChanges);

      // Build cascade plan
      const cascadePlan: CascadePlan = {
        originalPartId: affectedPart.id,
        originalPartNumber: affectedPart.partNumber,
        totalLevelsAffected: cascadeChanges.length,
        cascadeChanges: newPartNumbers,
        newPartNumbersGenerated: cascadeChanges.filter((c) => c.cascadeRequired).length,
        estimatedEffort: this.estimateEffort(cascadeChanges.length),
        estimatedCost: this.estimateCost(cascadeChanges.length),
        cascadeStopsAt:
          cascadeChanges.length > 0
            ? {
                partId: cascadeChanges[cascadeChanges.length - 1].parentPartId,
                partNumber: cascadeChanges[cascadeChanges.length - 1].parentPartNumber,
                reason: 'Interchangeability maintained or BOM hierarchy limit reached',
              }
            : undefined,
        documentUpdateRequired: true,
        routingUpdateRequired: cascadeChanges.length > 0,
        bomUpdateRequired: cascadeChanges.length > 0,
      };

      logger.info(`Cascade analysis complete for part ${affectedPartId}`, {
        levelsAffected: cascadePlan.totalLevelsAffected,
        newPartNumbers: cascadePlan.newPartNumbersGenerated,
        estimatedDays: cascadePlan.estimatedEffort,
      });

      return cascadePlan;

    } catch (error) {
      logger.error('Error analyzing cascade requirements:', error);
      throw new Error(`Failed to analyze cascade: ${error.message}`);
    }
  }

  /**
   * Generate new part numbers for all affected parts in cascade
   */
  async generateNewPartNumbers(
    cascadeChanges: CascadeChange[]
  ): Promise<CascadeChange[]> {
    try {
      const updatedChanges = await Promise.all(
        cascadeChanges.map(async (change) => {
          if (change.cascadeRequired) {
            // Generate new part number for the parent assembly
            const newPartNumber = await this.generatePartNumber(
              change.parentPartNumber,
              change.currentRevision,
              change.newRevision
            );

            change.newPartNumber = newPartNumber;
          }
          return change;
        })
      );

      logger.info('New part numbers generated for cascade', {
        count: updatedChanges.filter((c) => c.newPartNumber).length,
      });

      return updatedChanges;

    } catch (error) {
      logger.error('Error generating new part numbers:', error);
      throw new Error(`Failed to generate part numbers: ${error.message}`);
    }
  }

  /**
   * Execute cascade by creating new revisions and updating BOMs
   */
  async executeCascade(
    ecoId: string,
    cascadePlan: CascadePlan,
    executedBy: string
  ): Promise<void> {
    try {
      logger.info(
        `Executing cascade for ECO ${ecoId} with ${cascadePlan.cascadeChanges.length} changes`
      );

      // For each cascade change
      for (const change of cascadePlan.cascadeChanges) {
        if (!change.cascadeRequired) continue;

        // Create new part revision
        if (change.newPartNumber) {
          const newPart = await this.createPartRevision(
            change.parentPartId,
            change.newPartNumber,
            change.newRevision,
            ecoId,
            executedBy
          );

          logger.info(`Created new part revision: ${newPart.partNumber}`);

          // Update BOM to reference new part where needed
          await this.updateBOMReferences(
            change.parentPartId,
            newPart.id,
            ecoId,
            executedBy
          );
        }
      }

      // Create cascade record in audit trail
      await this.recordCascadeExecution(ecoId, cascadePlan, executedBy);

      logger.info(`Cascade execution complete for ECO ${ecoId}`);

    } catch (error) {
      logger.error('Error executing cascade:', error);
      throw new Error(`Failed to execute cascade: ${error.message}`);
    }
  }

  /**
   * Check if a change breaks interchangeability at a parent assembly level
   */
  private async checkInterchangeabilityImpact(
    changedPart: any,
    parentAssembly: any,
    changeDescription: string
  ): Promise<{ maintained: boolean; reason: string }> {
    try {
      // Check if the two parts are interchangeable
      const status = await this.interchangeabilityService.checkInterchangeability(
        changedPart.id,
        parentAssembly.id
      );

      return {
        maintained: status.isInterchangeable,
        reason: status.reason,
      };

    } catch {
      return {
        maintained: false,
        reason: 'Interchangeability check inconclusive',
      };
    }
  }

  /**
   * Generate a new part number with revision increment
   */
  private async generatePartNumber(
    basePartNumber: string,
    currentRevision: string,
    newRevision: string
  ): Promise<string> {
    try {
      // Extract part number components
      const parts = basePartNumber.split('-');
      if (parts.length < 2) {
        return `${basePartNumber}-${newRevision}`;
      }

      // Replace revision in part number
      const baseParts = parts.slice(0, -1);
      return `${baseParts.join('-')}-${newRevision}`;

    } catch (error) {
      logger.error('Error generating part number:', error);
      throw new Error(`Failed to generate part number: ${error.message}`);
    }
  }

  /**
   * Create a new part revision
   */
  private async createPartRevision(
    originalPartId: string,
    newPartNumber: string,
    newRevision: string,
    ecoId: string,
    createdBy: string
  ): Promise<any> {
    try {
      const originalPart = await this.prisma.part.findUnique({
        where: { id: originalPartId },
      });

      if (!originalPart) {
        throw new Error(`Original part ${originalPartId} not found`);
      }

      // Create new part record
      const newPart = await this.prisma.part.create({
        data: {
          partNumber: newPartNumber,
          partName: originalPart.partName,
          description: originalPart.description,
          revisionLevel: newRevision,
          status: 'RELEASED',
          classification: originalPart.classification,
          lifecycle: 'ACTIVE',
          previousRevisionId: originalPartId, // Link to previous revision
          createdBy,
          createdAt: new Date(),
        },
      });

      return newPart;

    } catch (error) {
      logger.error('Error creating part revision:', error);
      throw new Error(`Failed to create part revision: ${error.message}`);
    }
  }

  /**
   * Update BOM references to use new part revisions
   */
  private async updateBOMReferences(
    affectedPartId: string,
    newPartId: string,
    ecoId: string,
    updatedBy: string
  ): Promise<void> {
    try {
      // Find BOM lines that reference the old part
      const bomLines = await this.prisma.bOMLine.findMany({
        where: { partId: affectedPartId },
      });

      // Update each BOM line to new part
      for (const bomLine of bomLines) {
        await this.prisma.bOMLine.update({
          where: { id: bomLine.id },
          data: {
            partId: newPartId,
            updatedBy,
          },
        });
      }

      logger.info(`Updated ${bomLines.length} BOM line(s) to new part revision`);

    } catch (error) {
      logger.error('Error updating BOM references:', error);
      throw new Error(`Failed to update BOM references: ${error.message}`);
    }
  }

  /**
   * Record cascade execution in audit trail
   */
  private async recordCascadeExecution(
    ecoId: string,
    cascadePlan: CascadePlan,
    executedBy: string
  ): Promise<void> {
    try {
      // Record in ECO history
      await this.prisma.eCOHistory.create({
        data: {
          ecoId,
          eventType: 'CASCADE_EXECUTED',
          eventDescription: `Cascade executed affecting ${cascadePlan.totalLevelsAffected} assembly levels`,
          details: {
            cascadePlan: {
              originalPartNumber: cascadePlan.originalPartNumber,
              totalLevelsAffected: cascadePlan.totalLevelsAffected,
              newPartNumbersGenerated: cascadePlan.newPartNumbersGenerated,
              changes: cascadePlan.cascadeChanges.map((c) => ({
                parentPartNumber: c.parentPartNumber,
                newPartNumber: c.newPartNumber,
                cascadeRequired: c.cascadeRequired,
              })),
            },
          } as any,
          performedById: executedBy,
          performedByName: 'System',
          occurredAt: new Date(),
        },
      });

      logger.info(`Cascade execution recorded for ECO ${ecoId}`);

    } catch (error) {
      logger.error('Error recording cascade execution:', error);
      // Don't throw - recording failure shouldn't fail the cascade
    }
  }

  /**
   * Increment a revision level (A -> B -> ... -> Z -> AA, etc.)
   */
  private incrementRevision(currentRevision: string): string {
    if (!currentRevision || currentRevision.length === 0) {
      return 'B';
    }

    const chars = currentRevision.split('');
    let increment = true;

    for (let i = chars.length - 1; i >= 0 && increment; i--) {
      if (chars[i] === 'Z') {
        chars[i] = 'A';
      } else {
        chars[i] = String.fromCharCode(chars[i].charCodeAt(0) + 1);
        increment = false;
      }
    }

    if (increment) {
      chars.unshift('A');
    }

    return chars.join('');
  }

  /**
   * Estimate effort (in days) for cascade execution
   */
  private estimateEffort(cascadeDepth: number): number {
    // Base effort per level: 1 day per level
    return Math.max(1, cascadeDepth);
  }

  /**
   * Estimate cost for cascade execution
   */
  private estimateCost(cascadeDepth: number): number {
    // Rough estimate: $500 per assembly level affected
    return cascadeDepth * 500;
  }
}

export default ECOCascadeLogicService;
