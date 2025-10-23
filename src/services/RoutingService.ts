/**
 * Routing Service
 * Sprint 2: Backend Services & APIs
 *
 * Comprehensive service for multi-site routing management
 * Provides CRUD operations and business logic for:
 * - Routings
 * - Routing Steps
 * - Routing Step Dependencies
 * - Part Site Availability
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { VersionConflictError } from '../middleware/errorHandler';
import {
  RoutingLifecycleState,
  DependencyType,
  DependencyTimingType,
  CreateRoutingDTO,
  CreateRoutingStepDTO,
  CreateRoutingStepDependencyDTO,
  CreatePartSiteAvailabilityDTO,
  UpdateRoutingDTO,
  UpdateRoutingStepDTO,
  UpdatePartSiteAvailabilityDTO,
  RoutingQueryParams,
  RoutingWithRelations,
  RoutingStepWithRelations,
  RoutingCopyOptions,
  RoutingApprovalRequest,
  RoutingVersionInfo,
  RoutingTimingCalculation,
  RoutingStepResequenceRequest,
  RoutingValidationResult,
  RoutingValidationError,
  // Phase 3.2: Template types
  RoutingTemplate,
  CreateRoutingTemplateDTO,
  UpdateRoutingTemplateDTO,
  RoutingTemplateQueryParams,
  VisualRoutingData,
  CreateRoutingWithVisualDTO,
  UpdateRoutingWithVisualDTO
} from '../types/routing';

const prisma = new PrismaClient();

/**
 * RoutingService - Main service class for routing operations
 */
export class RoutingService {

  // ============================================
  // ROUTING CRUD OPERATIONS
  // ============================================

  /**
   * Create a new routing
   */
  async createRouting(data: CreateRoutingDTO): Promise<RoutingWithRelations> {
    // Validate unique constraint
    const existing = await prisma.routing.findFirst({
      where: {
        partId: data.partId,
        siteId: data.siteId,
        version: data.version || '1.0'
      }
    });

    if (existing) {
      throw new Error(
        `Routing already exists for part ${data.partId} at site ${data.siteId} version ${data.version || '1.0'}`
      );
    }

    // Create routing with optional steps
    const routing = await prisma.routing.create({
      data: {
        routingNumber: data.routingNumber,
        partId: data.partId,
        siteId: data.siteId,
        version: data.version || '1.0',
        lifecycleState: data.lifecycleState || RoutingLifecycleState.DRAFT,
        description: data.description,
        isPrimaryRoute: data.isPrimaryRoute ?? false,
        isActive: data.isActive ?? true,
        effectiveDate: data.effectiveDate,
        expirationDate: data.expirationDate,
        createdBy: data.createdBy,
        notes: data.notes,
        steps: data.steps ? {
          create: data.steps.map(step => ({
            stepNumber: step.stepNumber,
            processSegmentId: step.processSegmentId,
            workCenterId: step.workCenterId,
            setupTimeOverride: step.setupTimeOverride,
            cycleTimeOverride: step.cycleTimeOverride,
            teardownTimeOverride: step.teardownTimeOverride,
            isOptional: step.isOptional ?? false,
            isQualityInspection: step.isQualityInspection ?? false,
            isCriticalPath: step.isCriticalPath ?? false,
            stepInstructions: step.stepInstructions,
            notes: step.notes
          }))
        } : undefined
      },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        },
        steps: {
          include: {
            processSegment: {
              select: {
                id: true,
                segmentName: true,
                segmentType: true,
                setupTime: true,
                duration: true,
                teardownTime: true,
                isStandardOperation: true,
                siteId: true
              }
            },
            workCenter: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: {
            stepNumber: 'asc'
          }
        }
      }
    });

    return routing as unknown as RoutingWithRelations;
  }

  /**
   * Get routing by ID
   */
  async getRoutingById(id: string, includeSteps: boolean = true): Promise<RoutingWithRelations | null> {
    return prisma.routing.findUnique({
      where: { id },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        },
        steps: includeSteps ? {
          include: {
            processSegment: {
              select: {
                id: true,
                segmentName: true,
                segmentType: true,
                setupTime: true,
                duration: true,
                teardownTime: true,
                isStandardOperation: true,
                siteId: true
              }
            },
            workCenter: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            },
            dependencies: true,
            prerequisites: true
          },
          orderBy: {
            stepNumber: 'asc'
          }
        } : false
      }
    }) as Promise<RoutingWithRelations | null>;
  }

  /**
   * Get routing by routing number
   */
  async getRoutingByNumber(routingNumber: string): Promise<RoutingWithRelations | null> {
    return prisma.routing.findUnique({
      where: { routingNumber },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        },
        steps: {
          include: {
            processSegment: {
              select: {
                id: true,
                segmentName: true,
                segmentType: true,
                setupTime: true,
                duration: true,
                teardownTime: true,
                isStandardOperation: true,
                siteId: true
              }
            },
            workCenter: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: {
            stepNumber: 'asc'
          }
        }
      }
    }) as Promise<RoutingWithRelations | null>;
  }

  /**
   * Query routings with filters
   */
  async queryRoutings(params: RoutingQueryParams): Promise<RoutingWithRelations[]> {
    const where: Prisma.RoutingWhereInput = {};

    if (params.partId) where.partId = params.partId;
    if (params.siteId) where.siteId = params.siteId;
    if (params.lifecycleState) where.lifecycleState = params.lifecycleState;
    if (params.isActive !== undefined) where.isActive = params.isActive;
    if (params.isPrimaryRoute !== undefined) where.isPrimaryRoute = params.isPrimaryRoute;
    if (params.version) where.version = params.version;

    // Filter out expired routes unless explicitly included
    if (!params.includeExpired) {
      where.OR = [
        { expirationDate: null },
        { expirationDate: { gt: new Date() } }
      ];
    }

    return prisma.routing.findMany({
      where,
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        },
        steps: params.includeSteps ? {
          include: {
            processSegment: {
              select: {
                id: true,
                segmentName: true,
                segmentType: true,
                setupTime: true,
                duration: true,
                teardownTime: true,
                isStandardOperation: true,
                siteId: true
              }
            },
            workCenter: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: {
            stepNumber: 'asc'
          }
        } : false
      },
      orderBy: [
        { partId: 'asc' },
        { version: 'desc' }
      ]
    }) as unknown as Promise<RoutingWithRelations[]>;
  }

  /**
   * Update routing
   */
  async updateRouting(id: string, data: UpdateRoutingDTO): Promise<RoutingWithRelations> {
    // Get current routing state
    const existing = await prisma.routing.findUnique({ where: { id } });
    if (!existing) {
      throw new Error(`Routing ${id} not found`);
    }

    // OPTIMISTIC LOCKING: Check version if currentVersion is provided
    if (data.currentVersion !== undefined) {
      if (existing.version !== data.currentVersion) {
        throw new VersionConflictError(
          `Routing has been modified by another user. Current version is ${existing.version}, but you are trying to update version ${data.currentVersion}.`,
          {
            currentVersion: existing.version,
            attemptedVersion: data.currentVersion,
            lastModified: existing.updatedAt,
            lastModifiedBy: existing.createdBy // Note: In a real system, track lastModifiedBy separately
          }
        );
      }
    }

    // If updating to a version that already exists for this part/site, reject
    if (data.version || data.partId || data.siteId) {
      const checkVersion = await prisma.routing.findFirst({
        where: {
          partId: data.partId || existing.partId,
          siteId: data.siteId || existing.siteId,
          version: data.version || existing.version,
          id: { not: id }
        }
      });

      if (checkVersion) {
        throw new Error(
          `Routing already exists for part ${data.partId || existing.partId} at site ${data.siteId || existing.siteId} version ${data.version || existing.version}`
        );
      }
    }

    return prisma.routing.update({
      where: { id },
      data: {
        routingNumber: data.routingNumber,
        partId: data.partId,
        siteId: data.siteId,
        version: data.version,
        lifecycleState: data.lifecycleState,
        description: data.description,
        isPrimaryRoute: data.isPrimaryRoute,
        isActive: data.isActive,
        effectiveDate: data.effectiveDate,
        expirationDate: data.expirationDate,
        approvedBy: data.approvedBy,
        approvedAt: data.approvedAt,
        createdBy: data.createdBy,
        notes: data.notes
      },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        },
        steps: {
          include: {
            processSegment: {
              select: {
                id: true,
                segmentName: true,
                segmentType: true,
                setupTime: true,
                duration: true,
                teardownTime: true,
                isStandardOperation: true,
                siteId: true
              }
            },
            workCenter: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: {
            stepNumber: 'asc'
          }
        }
      }
    }) as unknown as Promise<RoutingWithRelations>;
  }

  /**
   * Delete routing
   */
  async deleteRouting(id: string): Promise<void> {
    // Check if routing is used in work orders
    const workOrderCount = await prisma.workOrder.count({
      where: { routingId: id }
    });

    if (workOrderCount > 0) {
      throw new Error(
        `Cannot delete routing ${id}: it is used by ${workOrderCount} work order(s). Consider marking it as OBSOLETE instead.`
      );
    }

    await prisma.routing.delete({ where: { id } });
  }

  // ============================================
  // ROUTING STEP CRUD OPERATIONS
  // ============================================

  /**
   * Create routing step
   */
  async createRoutingStep(data: CreateRoutingStepDTO): Promise<RoutingStepWithRelations> {
    // Validate unique step number within routing
    const existing = await prisma.routingStep.findFirst({
      where: {
        routingId: data.routingId,
        stepNumber: data.stepNumber
      }
    });

    if (existing) {
      throw new Error(
        `Step number ${data.stepNumber} already exists in routing ${data.routingId}`
      );
    }

    return prisma.routingStep.create({
      data: {
        routingId: data.routingId,
        stepNumber: data.stepNumber,
        processSegmentId: data.processSegmentId,
        workCenterId: data.workCenterId,
        setupTimeOverride: data.setupTimeOverride,
        cycleTimeOverride: data.cycleTimeOverride,
        teardownTimeOverride: data.teardownTimeOverride,
        isOptional: data.isOptional ?? false,
        isQualityInspection: data.isQualityInspection ?? false,
        isCriticalPath: data.isCriticalPath ?? false,
        stepInstructions: data.stepInstructions,
        notes: data.notes
      },
      include: {
        routing: true,
        processSegment: {
          select: {
            id: true,
            segmentName: true,
            segmentType: true,
            setupTime: true,
            duration: true,
            teardownTime: true,
            isStandardOperation: true,
            siteId: true
          }
        },
        workCenter: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        dependencies: true,
        prerequisites: true
      }
    }) as Promise<RoutingStepWithRelations>;
  }

  /**
   * Get routing step by ID
   */
  async getRoutingStepById(id: string): Promise<RoutingStepWithRelations | null> {
    return prisma.routingStep.findUnique({
      where: { id },
      include: {
        routing: true,
        processSegment: {
          select: {
            id: true,
            segmentName: true,
            segmentType: true,
            setupTime: true,
            duration: true,
            teardownTime: true,
            isStandardOperation: true,
            siteId: true
          }
        },
        workCenter: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        dependencies: true,
        prerequisites: true
      }
    }) as Promise<RoutingStepWithRelations | null>;
  }

  /**
   * Get all steps for a routing
   */
  async getRoutingSteps(routingId: string): Promise<RoutingStepWithRelations[]> {
    return prisma.routingStep.findMany({
      where: { routingId },
      include: {
        routing: true,
        processSegment: {
          select: {
            id: true,
            segmentName: true,
            segmentType: true,
            setupTime: true,
            duration: true,
            teardownTime: true,
            isStandardOperation: true,
            siteId: true
          }
        },
        workCenter: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        dependencies: true,
        prerequisites: true
      },
      orderBy: {
        stepNumber: 'asc'
      }
    }) as Promise<RoutingStepWithRelations[]>;
  }

  /**
   * Update routing step
   */
  async updateRoutingStep(id: string, data: UpdateRoutingStepDTO): Promise<RoutingStepWithRelations> {
    // If updating step number, check uniqueness
    if (data.stepNumber !== undefined) {
      const step = await prisma.routingStep.findUnique({ where: { id } });
      if (!step) {
        throw new Error(`Routing step ${id} not found`);
      }

      const existing = await prisma.routingStep.findFirst({
        where: {
          routingId: step.routingId,
          stepNumber: data.stepNumber,
          id: { not: id }
        }
      });

      if (existing) {
        throw new Error(
          `Step number ${data.stepNumber} already exists in routing ${step.routingId}`
        );
      }
    }

    return prisma.routingStep.update({
      where: { id },
      data: {
        stepNumber: data.stepNumber,
        processSegmentId: data.processSegmentId,
        workCenterId: data.workCenterId,
        setupTimeOverride: data.setupTimeOverride,
        cycleTimeOverride: data.cycleTimeOverride,
        teardownTimeOverride: data.teardownTimeOverride,
        isOptional: data.isOptional,
        isQualityInspection: data.isQualityInspection,
        isCriticalPath: data.isCriticalPath,
        stepInstructions: data.stepInstructions,
        notes: data.notes
      },
      include: {
        routing: true,
        processSegment: {
          select: {
            id: true,
            segmentName: true,
            segmentType: true,
            setupTime: true,
            duration: true,
            teardownTime: true,
            isStandardOperation: true,
            siteId: true
          }
        },
        workCenter: {
          select: {
            id: true,
            name: true,
            isActive: true
          }
        },
        dependencies: true,
        prerequisites: true
      }
    }) as Promise<RoutingStepWithRelations>;
  }

  /**
   * Delete routing step
   */
  async deleteRoutingStep(id: string): Promise<void> {
    // Dependencies are deleted via cascade
    await prisma.routingStep.delete({ where: { id } });
  }

  /**
   * Resequence routing steps
   */
  async resequenceSteps(request: RoutingStepResequenceRequest): Promise<RoutingStepWithRelations[]> {
    // Use transaction to update all step numbers atomically
    await prisma.$transaction(
      request.stepOrder.map(({ stepId, newStepNumber }) =>
        prisma.routingStep.update({
          where: { id: stepId },
          data: { stepNumber: newStepNumber }
        })
      )
    );

    // Return updated steps
    return this.getRoutingSteps(request.routingId);
  }

  // ============================================
  // ROUTING STEP DEPENDENCY OPERATIONS
  // ============================================

  /**
   * Create routing step dependency
   */
  async createStepDependency(data: CreateRoutingStepDependencyDTO) {
    // Validate steps belong to same routing
    const [dependent, prerequisite] = await Promise.all([
      prisma.routingStep.findUnique({ where: { id: data.dependentStepId } }),
      prisma.routingStep.findUnique({ where: { id: data.prerequisiteStepId } })
    ]);

    if (!dependent || !prerequisite) {
      throw new Error('One or both routing steps not found');
    }

    if (dependent.routingId !== prerequisite.routingId) {
      throw new Error('Dependency can only be created between steps in the same routing');
    }

    // Check for circular dependencies
    const hasCircular = await this.checkCircularDependency(
      data.dependentStepId,
      data.prerequisiteStepId
    );

    if (hasCircular) {
      throw new Error(
        'Cannot create dependency: would create a circular dependency'
      );
    }

    return prisma.routingStepDependency.create({
      data: {
        dependentStepId: data.dependentStepId,
        prerequisiteStepId: data.prerequisiteStepId,
        dependencyType: data.dependencyType,
        timingType: data.timingType,
        lagTime: data.lagTime,
        leadTime: data.leadTime
      }
    });
  }

  /**
   * Delete routing step dependency
   */
  async deleteStepDependency(id: string): Promise<void> {
    await prisma.routingStepDependency.delete({ where: { id } });
  }

  /**
   * Check for circular dependencies
   */
  private async checkCircularDependency(
    dependentStepId: string,
    prerequisiteStepId: string
  ): Promise<boolean> {
    // If prerequisite depends on dependent (directly or indirectly), it's circular
    const visited = new Set<string>();
    const queue = [prerequisiteStepId];

    while (queue.length > 0) {
      const currentStepId = queue.shift()!;

      if (currentStepId === dependentStepId) {
        return true; // Found circular dependency
      }

      if (visited.has(currentStepId)) {
        continue;
      }
      visited.add(currentStepId);

      // Get all steps that depend on current step
      const dependencies = await prisma.routingStepDependency.findMany({
        where: { prerequisiteStepId: currentStepId }
      });

      for (const dep of dependencies) {
        queue.push(dep.dependentStepId);
      }
    }

    return false;
  }

  // ============================================
  // PART SITE AVAILABILITY OPERATIONS
  // ============================================

  /**
   * Create part site availability
   */
  async createPartSiteAvailability(data: CreatePartSiteAvailabilityDTO) {
    // Check unique constraint
    const existing = await prisma.partSiteAvailability.findFirst({
      where: {
        partId: data.partId,
        siteId: data.siteId
      }
    });

    if (existing) {
      throw new Error(
        `Part site availability already exists for part ${data.partId} at site ${data.siteId}`
      );
    }

    return prisma.partSiteAvailability.create({
      data: {
        partId: data.partId,
        siteId: data.siteId,
        isPreferred: data.isPreferred ?? false,
        isActive: data.isActive ?? true,
        leadTimeDays: data.leadTimeDays,
        minimumLotSize: data.minimumLotSize,
        maximumLotSize: data.maximumLotSize,
        standardCost: data.standardCost,
        setupCost: data.setupCost,
        effectiveDate: data.effectiveDate,
        expirationDate: data.expirationDate,
        notes: data.notes
      },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        }
      }
    });
  }

  /**
   * Get part site availability
   */
  async getPartSiteAvailability(partId: string, siteId: string) {
    return prisma.partSiteAvailability.findFirst({
      where: { partId, siteId },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        }
      }
    });
  }

  /**
   * Get all sites where a part is available
   */
  async getPartAvailableSites(partId: string) {
    return prisma.partSiteAvailability.findMany({
      where: {
        partId,
        isActive: true
      },
      include: {
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        }
      },
      orderBy: [
        { isPreferred: 'desc' },
        { site: { siteName: 'asc' } }
      ]
    });
  }

  /**
   * Update part site availability
   */
  async updatePartSiteAvailability(
    id: string,
    data: UpdatePartSiteAvailabilityDTO
  ) {
    return prisma.partSiteAvailability.update({
      where: { id },
      data: {
        isPreferred: data.isPreferred,
        isActive: data.isActive,
        leadTimeDays: data.leadTimeDays,
        minimumLotSize: data.minimumLotSize,
        maximumLotSize: data.maximumLotSize,
        standardCost: data.standardCost,
        setupCost: data.setupCost,
        effectiveDate: data.effectiveDate,
        expirationDate: data.expirationDate,
        notes: data.notes
      },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        }
      }
    });
  }

  /**
   * Delete part site availability
   */
  async deletePartSiteAvailability(id: string): Promise<void> {
    await prisma.partSiteAvailability.delete({ where: { id } });
  }

  // ============================================
  // BUSINESS LOGIC METHODS
  // ============================================

  /**
   * Copy routing to new version or site
   */
  async copyRouting(
    sourceRoutingId: string,
    options: RoutingCopyOptions
  ): Promise<RoutingWithRelations> {
    const sourceRouting = await this.getRoutingById(sourceRoutingId, true);
    if (!sourceRouting) {
      throw new Error(`Source routing ${sourceRoutingId} not found`);
    }

    // Determine target site and version
    const targetSiteId = options.targetSiteId || sourceRouting.siteId;
    const targetVersion = options.newVersion || this.incrementVersion(sourceRouting.version);

    // Generate new routing number
    const newRoutingNumber = await this.generateRoutingNumber(
      sourceRouting.partId,
      targetSiteId
    );

    // Create new routing
    const newRouting = await prisma.routing.create({
      data: {
        routingNumber: newRoutingNumber,
        partId: sourceRouting.partId,
        siteId: targetSiteId,
        version: targetVersion,
        lifecycleState: options.newLifecycleState || RoutingLifecycleState.DRAFT,
        description: sourceRouting.description,
        isPrimaryRoute: false, // New copy is not primary by default
        isActive: true,
        createdBy: sourceRouting.createdBy,
        notes: `Copied from ${sourceRouting.routingNumber}`,
        steps: (options.includeSteps !== false) && sourceRouting.steps ? {
          create: sourceRouting.steps.map(step => ({
            stepNumber: step.stepNumber,
            processSegmentId: step.processSegmentId,
            workCenterId: step.workCenterId,
            setupTimeOverride: step.setupTimeOverride,
            cycleTimeOverride: step.cycleTimeOverride,
            teardownTimeOverride: step.teardownTimeOverride,
            isOptional: step.isOptional,
            isQualityInspection: step.isQualityInspection,
            isCriticalPath: step.isCriticalPath,
            stepInstructions: step.stepInstructions,
            notes: step.notes
          }))
        } : undefined
      },
      include: {
        part: {
          select: {
            id: true,
            partNumber: true,
            partName: true
          }
        },
        site: {
          select: {
            id: true,
            siteName: true,
            siteCode: true
          }
        },
        steps: {
          include: {
            processSegment: {
              select: {
                id: true,
                segmentName: true,
                segmentType: true,
                setupTime: true,
                duration: true,
                teardownTime: true,
                isStandardOperation: true,
                siteId: true
              }
            },
            workCenter: {
              select: {
                id: true,
                name: true,
                isActive: true
              }
            }
          },
          orderBy: {
            stepNumber: 'asc'
          }
        }
      }
    });

    // Copy dependencies if requested
    if (options.includeDependencies !== false && options.includeSteps !== false && sourceRouting.steps) {
      const stepMapping = new Map<string, string>();

      // Map old step IDs to new step IDs
      sourceRouting.steps.forEach((oldStep, index) => {
        if (newRouting.steps && newRouting.steps[index]) {
          stepMapping.set(oldStep.id, newRouting.steps[index].id);
        }
      });

      // Create dependencies
      for (const oldStep of sourceRouting.steps) {
        if (oldStep.dependencies) {
          for (const dep of oldStep.dependencies) {
            const newDependentId = stepMapping.get(dep.dependentStepId);
            const newPrerequisiteId = stepMapping.get(dep.prerequisiteStepId);

            if (newDependentId && newPrerequisiteId) {
              await prisma.routingStepDependency.create({
                data: {
                  dependentStepId: newDependentId,
                  prerequisiteStepId: newPrerequisiteId,
                  dependencyType: dep.dependencyType,
                  timingType: dep.timingType,
                  lagTime: dep.lagTime,
                  leadTime: dep.leadTime
                }
              });
            }
          }
        }
      }
    }

    return newRouting as unknown as RoutingWithRelations;
  }

  /**
   * Approve a routing (move to RELEASED state)
   */
  async approveRouting(request: RoutingApprovalRequest): Promise<RoutingWithRelations> {
    const routing = await this.getRoutingById(request.routingId);
    if (!routing) {
      throw new Error(`Routing ${request.routingId} not found`);
    }

    if (routing.lifecycleState !== RoutingLifecycleState.REVIEW) {
      throw new Error(
        `Routing must be in REVIEW state to be approved (current state: ${routing.lifecycleState})`
      );
    }

    // Validate routing before approval
    const validation = await this.validateRouting(request.routingId);
    if (!validation.isValid) {
      throw new Error(
        `Routing validation failed: ${validation.errors.map(e => e.message).join(', ')}`
      );
    }

    return this.updateRouting(request.routingId, {
      lifecycleState: RoutingLifecycleState.RELEASED,
      approvedBy: request.approvedBy,
      approvedAt: new Date(),
      notes: request.notes || routing.notes
    });
  }

  /**
   * Activate a routing (move to PRODUCTION state)
   */
  async activateRouting(routingId: string): Promise<RoutingWithRelations> {
    const routing = await this.getRoutingById(routingId);
    if (!routing) {
      throw new Error(`Routing ${routingId} not found`);
    }

    if (routing.lifecycleState !== RoutingLifecycleState.RELEASED) {
      throw new Error(
        `Routing must be in RELEASED state to be activated (current state: ${routing.lifecycleState})`
      );
    }

    return this.updateRouting(routingId, {
      lifecycleState: RoutingLifecycleState.PRODUCTION,
      effectiveDate: routing.effectiveDate || new Date()
    });
  }

  /**
   * Obsolete a routing
   */
  async obsoleteRouting(routingId: string): Promise<RoutingWithRelations> {
    return this.updateRouting(routingId, {
      lifecycleState: RoutingLifecycleState.OBSOLETE,
      isActive: false,
      expirationDate: new Date()
    });
  }

  /**
   * Get all versions of a routing
   */
  async getRoutingVersions(partId: string, siteId: string): Promise<RoutingVersionInfo> {
    const routings = await prisma.routing.findMany({
      where: { partId, siteId },
      orderBy: { version: 'desc' }
    });

    if (routings.length === 0) {
      throw new Error(`No routings found for part ${partId} at site ${siteId}`);
    }

    return {
      currentVersion: routings[0].version,
      allVersions: routings.map(r => ({
        version: r.version,
        lifecycleState: r.lifecycleState as RoutingLifecycleState,
        effectiveDate: r.effectiveDate || undefined,
        expirationDate: r.expirationDate || undefined
      }))
    };
  }

  /**
   * Calculate routing timing
   */
  async calculateRoutingTiming(routingId: string): Promise<RoutingTimingCalculation> {
    const steps = await this.getRoutingSteps(routingId);

    let totalSetupTime = 0;
    let totalCycleTime = 0;
    let totalTeardownTime = 0;

    for (const step of steps) {
      const setupTime = step.setupTimeOverride ?? step.processSegment?.setupTime ?? 0;
      const cycleTime = step.cycleTimeOverride ?? step.processSegment?.duration ?? 0;
      const teardownTime = step.teardownTimeOverride ?? step.processSegment?.teardownTime ?? 0;

      totalSetupTime += setupTime;
      totalCycleTime += cycleTime;
      totalTeardownTime += teardownTime;
    }

    // Calculate critical path (simplified - assumes sequential execution)
    const criticalPathSteps = steps.filter(s => s.isCriticalPath);
    let criticalPathTime = 0;

    if (criticalPathSteps.length > 0) {
      for (const step of criticalPathSteps) {
        const setupTime = step.setupTimeOverride ?? step.processSegment?.setupTime ?? 0;
        const cycleTime = step.cycleTimeOverride ?? step.processSegment?.duration ?? 0;
        const teardownTime = step.teardownTimeOverride ?? step.processSegment?.teardownTime ?? 0;
        criticalPathTime += setupTime + cycleTime + teardownTime;
      }
    } else {
      // If no critical path marked, total time is the critical path
      criticalPathTime = totalSetupTime + totalCycleTime + totalTeardownTime;
    }

    return {
      totalSetupTime,
      totalCycleTime,
      totalTeardownTime,
      totalTime: totalSetupTime + totalCycleTime + totalTeardownTime,
      criticalPathTime
    };
  }

  /**
   * Validate routing
   */
  async validateRouting(routingId: string): Promise<RoutingValidationResult> {
    const errors: RoutingValidationError[] = [];
    const routing = await this.getRoutingById(routingId, true);

    if (!routing) {
      return {
        isValid: false,
        errors: [{ field: 'id', message: 'Routing not found' }]
      };
    }

    // Must have at least one step
    if (!routing.steps || routing.steps.length === 0) {
      errors.push({
        field: 'steps',
        message: 'Routing must have at least one step'
      });
    }

    // Validate step numbers are sequential
    if (routing.steps && routing.steps.length > 0) {
      const stepNumbers = routing.steps.map(s => s.stepNumber).sort((a, b) => a - b);
      for (let i = 0; i < stepNumbers.length - 1; i++) {
        if (stepNumbers[i] === stepNumbers[i + 1]) {
          errors.push({
            field: 'steps',
            message: `Duplicate step number: ${stepNumbers[i]}`
          });
        }
      }
    }

    // Validate effective/expiration dates
    if (routing.effectiveDate && routing.expirationDate) {
      if (routing.effectiveDate >= routing.expirationDate) {
        errors.push({
          field: 'expirationDate',
          message: 'Expiration date must be after effective date'
        });
      }
    }

    // Validate part-site availability exists
    const availability = await this.getPartSiteAvailability(routing.partId, routing.siteId);
    if (!availability) {
      errors.push({
        field: 'siteId',
        message: 'Part is not available at this site. Create PartSiteAvailability first.'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Generate unique routing number
   */
  private async generateRoutingNumber(partId: string, siteId: string): Promise<string> {
    const part = await prisma.part.findUnique({ where: { id: partId } });
    const site = await prisma.site.findUnique({ where: { id: siteId } });

    if (!part || !site) {
      throw new Error('Part or site not found');
    }

    const count = await prisma.routing.count({
      where: { partId, siteId }
    });

    return `RTG-${site.siteCode}-${part.partNumber}-${String(count + 1).padStart(3, '0')}`;
  }

  /**
   * Increment version string (e.g., "1.0" -> "2.0", "1.5" -> "1.6")
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const major = parseInt(parts[0]);
    const minor = parts.length > 1 ? parseInt(parts[1]) : 0;

    // Increment major version
    return `${major + 1}.0`;
  }

  // ============================================
  // ROUTING TEMPLATE OPERATIONS (Phase 3.2)
  // ============================================

  /**
   * Create a new routing template
   */
  async createRoutingTemplate(data: CreateRoutingTemplateDTO): Promise<RoutingTemplate> {
    // Validate template name uniqueness
    const existing = await prisma.routingTemplate.findFirst({
      where: {
        name: data.name,
        createdBy: data.createdBy
      }
    });

    if (existing) {
      throw new Error(`Template with name "${data.name}" already exists for this user`);
    }

    // Create template
    const template = await prisma.routingTemplate.create({
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags,
        visualData: data.visualData as Prisma.InputJsonValue,
        isFavorite: data.isFavorite ?? false,
        usageCount: 0,
        createdBy: data.createdBy
      }
    });

    return this.mapTemplateFromPrisma(template);
  }

  /**
   * Get all routing templates with optional filtering
   */
  async getRoutingTemplates(params?: RoutingTemplateQueryParams): Promise<RoutingTemplate[]> {
    const where: Prisma.RoutingTemplateWhereInput = {};

    if (params?.category) {
      where.category = params.category;
    }

    if (params?.isFavorite !== undefined) {
      where.isFavorite = params.isFavorite;
    }

    if (params?.createdBy) {
      where.createdBy = params.createdBy;
    }

    if (params?.tags && params.tags.length > 0) {
      where.tags = {
        hasSome: params.tags
      };
    }

    if (params?.searchText) {
      where.OR = [
        { name: { contains: params.searchText, mode: 'insensitive' } },
        { description: { contains: params.searchText, mode: 'insensitive' } },
        { category: { contains: params.searchText, mode: 'insensitive' } }
      ];
    }

    const templates = await prisma.routingTemplate.findMany({
      where,
      orderBy: [
        { isFavorite: 'desc' },
        { usageCount: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    return templates.map(t => this.mapTemplateFromPrisma(t));
  }

  /**
   * Get a single routing template by ID
   */
  async getRoutingTemplateById(id: string): Promise<RoutingTemplate | null> {
    const template = await prisma.routingTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      return null;
    }

    return this.mapTemplateFromPrisma(template);
  }

  /**
   * Update a routing template
   */
  async updateRoutingTemplate(
    id: string,
    data: UpdateRoutingTemplateDTO
  ): Promise<RoutingTemplate> {
    const template = await prisma.routingTemplate.update({
      where: { id },
      data: {
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags,
        visualData: data.visualData ? (data.visualData as Prisma.InputJsonValue) : undefined,
        isFavorite: data.isFavorite
      }
    });

    return this.mapTemplateFromPrisma(template);
  }

  /**
   * Delete a routing template
   */
  async deleteRoutingTemplate(id: string): Promise<void> {
    await prisma.routingTemplate.delete({
      where: { id }
    });
  }

  /**
   * Increment template usage count
   */
  async incrementTemplateUsage(id: string): Promise<void> {
    await prisma.routingTemplate.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });
  }

  /**
   * Toggle template favorite status
   */
  async toggleTemplateFavorite(id: string): Promise<RoutingTemplate> {
    const template = await prisma.routingTemplate.findUnique({
      where: { id }
    });

    if (!template) {
      throw new Error(`Template ${id} not found`);
    }

    const updated = await prisma.routingTemplate.update({
      where: { id },
      data: {
        isFavorite: !template.isFavorite
      }
    });

    return this.mapTemplateFromPrisma(updated);
  }

  /**
   * Get template categories with counts
   */
  async getTemplateCategories(): Promise<Array<{ category: string; count: number }>> {
    const result = await prisma.routingTemplate.groupBy({
      by: ['category'],
      _count: {
        id: true
      },
      orderBy: {
        _count: {
          id: 'desc'
        }
      }
    });

    return result.map(r => ({
      category: r.category,
      count: r._count.id
    }));
  }

  /**
   * Create routing from template
   */
  async createRoutingFromTemplate(
    templateId: string,
    routingData: Omit<CreateRoutingDTO, 'visualData'>,
    userId?: string
  ): Promise<RoutingWithRelations> {
    // Get template
    const template = await this.getRoutingTemplateById(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    // Increment usage count
    await this.incrementTemplateUsage(templateId);

    // Create routing with visual data from template
    const routingWithVisual: CreateRoutingWithVisualDTO = {
      ...routingData,
      visualData: template.visualData,
      createdBy: userId,
      notes: `Created from template: ${template.name}`
    };

    return await this.createRoutingWithVisualData(routingWithVisual);
  }

  // ============================================
  // VISUAL ROUTING DATA OPERATIONS (Phase 3.2)
  // ============================================

  /**
   * Create routing with visual data
   */
  async createRoutingWithVisualData(
    data: CreateRoutingWithVisualDTO
  ): Promise<RoutingWithRelations> {
    // Store visual data as JSON in a separate field or in notes
    // For now, we'll store it in the notes field as a JSON string
    const visualDataJson = data.visualData ? JSON.stringify(data.visualData) : null;

    const routingData: CreateRoutingDTO = {
      ...data,
      notes: visualDataJson
        ? `${data.notes || ''}\n\n[VISUAL_DATA]${visualDataJson}[/VISUAL_DATA]`
        : data.notes
    };

    return await this.createRouting(routingData);
  }

  /**
   * Update routing with visual data
   */
  async updateRoutingWithVisualData(
    id: string,
    data: UpdateRoutingWithVisualDTO
  ): Promise<RoutingWithRelations> {
    const existing = await this.getRoutingById(id);
    if (!existing) {
      throw new Error(`Routing ${id} not found`);
    }

    // Extract existing visual data from notes
    const existingVisualData = this.extractVisualDataFromNotes(existing.notes || '');

    // Prepare visual data
    const visualDataJson = data.visualData ? JSON.stringify(data.visualData) : null;

    // Prepare notes with visual data
    let notes = data.notes !== undefined ? data.notes : existing.notes || '';

    // Remove old visual data marker if exists
    notes = notes.replace(/\[VISUAL_DATA\].*?\[\/VISUAL_DATA\]/s, '');

    // Add new visual data marker if provided
    if (visualDataJson) {
      notes = `${notes}\n\n[VISUAL_DATA]${visualDataJson}[/VISUAL_DATA]`;
    }

    const routingData: UpdateRoutingDTO = {
      ...data,
      notes
    };

    return await this.updateRouting(id, routingData);
  }

  /**
   * Get visual data for a routing
   */
  async getRoutingVisualData(routingId: string): Promise<VisualRoutingData | null> {
    const routing = await this.getRoutingById(routingId);
    if (!routing) {
      return null;
    }

    return this.extractVisualDataFromNotes(routing.notes || '');
  }

  /**
   * Helper: Extract visual data from notes field
   */
  private extractVisualDataFromNotes(notes: string): VisualRoutingData | null {
    const match = notes.match(/\[VISUAL_DATA\](.*?)\[\/VISUAL_DATA\]/s);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.error('Failed to parse visual data:', e);
        return null;
      }
    }
    return null;
  }

  /**
   * Helper: Map Prisma template to RoutingTemplate type
   */
  private mapTemplateFromPrisma(template: any): RoutingTemplate {
    return {
      id: template.id,
      name: template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      visualData: template.visualData as VisualRoutingData,
      isFavorite: template.isFavorite,
      usageCount: template.usageCount,
      createdBy: template.createdBy,
      createdAt: template.createdAt,
      updatedAt: template.updatedAt
    };
  }

  // ============================================================================
  // NEW: Routing Type Methods (MES Enhancement Phase 3)
  // ============================================================================

  /**
   * Get routings by type (PRIMARY, ALTERNATE, REWORK, PROTOTYPE, ENGINEERING)
   */
  async getRoutingsByType(
    partId: string,
    siteId: string,
    routingType: string
  ) {
    const routings = await prisma.routing.findMany({
      where: {
        partId,
        siteId,
        routingType: routingType as any,
        isActive: true
      },
      include: {
        part: true,
        site: true,
        steps: {
          include: {
            processSegment: true,
            workCenter: true,
            workInstruction: true
          }
        }
      },
      orderBy: [
        { priority: 'asc' }, // Lower priority number = higher priority
        { version: 'desc' }
      ]
    });

    return routings;
  }

  /**
   * Get PRIMARY routing for a part at a site
   */
  async getPrimaryRouting(partId: string, siteId: string) {
    const routing = await prisma.routing.findFirst({
      where: {
        partId,
        siteId,
        routingType: 'PRIMARY',
        isActive: true
      },
      include: {
        part: true,
        site: true,
        steps: {
          include: {
            processSegment: true,
            workCenter: true,
            workInstruction: true,
            parameterOverrides: true
          },
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: { priority: 'asc' } // Get highest priority (lowest number)
    });

    return routing;
  }

  /**
   * Get ALTERNATE routings for a PRIMARY routing
   */
  async getAlternateRoutings(primaryRoutingId: string) {
    // Verify primary routing exists
    const primary = await prisma.routing.findUnique({
      where: { id: primaryRoutingId }
    });

    if (!primary) {
      throw new Error(`Routing ${primaryRoutingId} not found`);
    }

    if (primary.routingType !== 'PRIMARY') {
      throw new Error(
        `Routing ${primaryRoutingId} is not a PRIMARY routing`
      );
    }

    const alternates = await prisma.routing.findMany({
      where: {
        alternateForId: primaryRoutingId,
        routingType: 'ALTERNATE',
        isActive: true
      },
      include: {
        steps: {
          include: {
            processSegment: true,
            workCenter: true
          },
          orderBy: { stepNumber: 'asc' }
        }
      },
      orderBy: { priority: 'asc' }
    });

    return alternates;
  }

  /**
   * Validate alternate routing (must link to PRIMARY)
   */
  async validateAlternateRouting(routingId: string) {
    const routing = await prisma.routing.findUnique({
      where: { id: routingId },
      include: {
        alternateFor: true
      }
    });

    if (!routing) {
      throw new Error(`Routing ${routingId} not found`);
    }

    if (routing.routingType === 'ALTERNATE') {
      if (!routing.alternateForId) {
        throw new Error(
          'ALTERNATE routing must reference a PRIMARY routing via alternateForId'
        );
      }

      if (routing.alternateFor?.routingType !== 'PRIMARY') {
        throw new Error(
          'alternateForId must reference a routing with routingType=PRIMARY'
        );
      }

      // Validate same part and site
      if (
        routing.partId !== routing.alternateFor.partId ||
        routing.siteId !== routing.alternateFor.siteId
      ) {
        throw new Error(
          'ALTERNATE routing must be for the same part and site as the PRIMARY'
        );
      }
    }

    return true;
  }

  // ============================================================================
  // NEW: Routing Step Parameter Override Methods (MES Enhancement Phase 2)
  // ============================================================================

  /**
   * Set parameter override for a routing step
   */
  async setRoutingStepParameterOverride(
    stepId: string,
    parameterName: string,
    parameterValue: string,
    unitOfMeasure?: string,
    notes?: string
  ) {
    // Verify routing step exists
    const step = await prisma.routingStep.findUnique({
      where: { id: stepId },
      include: { processSegment: true }
    });

    if (!step) {
      throw new Error(`Routing step ${stepId} not found`);
    }

    // Upsert parameter override
    const override = await prisma.routingStepParameter.upsert({
      where: {
        routingStepId_parameterName: {
          routingStepId: stepId,
          parameterName
        }
      },
      update: {
        parameterValue,
        unitOfMeasure,
        notes
      },
      create: {
        routingStepId: stepId,
        parameterName,
        parameterValue,
        unitOfMeasure,
        notes
      }
    });

    return override;
  }

  /**
   * Get parameter overrides for a routing step
   */
  async getRoutingStepParameterOverrides(stepId: string) {
    const overrides = await prisma.routingStepParameter.findMany({
      where: { routingStepId: stepId },
      orderBy: { parameterName: 'asc' }
    });

    return overrides;
  }

  /**
   * Get effective parameters for a routing step
   * (merges ProcessSegment base parameters with routing step overrides)
   */
  async getEffectiveStepParameters(stepId: string) {
    const step = await prisma.routingStep.findUnique({
      where: { id: stepId },
      include: {
        processSegment: {
          include: {
            parameters: true
          }
        },
        parameterOverrides: true
      }
    });

    if (!step) {
      throw new Error(`Routing step ${stepId} not found`);
    }

    // Start with base parameters from ProcessSegment
    const effectiveParameters = step.processSegment.parameters.map((p) => ({
      parameterName: p.parameterName,
      parameterValue: p.defaultValue || '',
      unitOfMeasure: p.unitOfMeasure || null,
      source: 'process_segment',
      isOverridden: false
    }));

    // Apply overrides
    const overrideMap = new Map(
      step.parameterOverrides.map((o) => [o.parameterName, o])
    );

    effectiveParameters.forEach((p) => {
      const override = overrideMap.get(p.parameterName);
      if (override) {
        p.parameterValue = override.parameterValue;
        p.unitOfMeasure = override.unitOfMeasure || p.unitOfMeasure;
        p.source = 'routing_step_override';
        p.isOverridden = true;
      }
    });

    // Add any override-only parameters (not in base)
    step.parameterOverrides.forEach((override) => {
      if (
        !effectiveParameters.find(
          (p) => p.parameterName === override.parameterName
        )
      ) {
        effectiveParameters.push({
          parameterName: override.parameterName,
          parameterValue: override.parameterValue,
          unitOfMeasure: override.unitOfMeasure || null,
          source: 'routing_step_override',
          isOverridden: true
        });
      }
    });

    return effectiveParameters;
  }

  /**
   * Delete parameter override for a routing step
   */
  async deleteRoutingStepParameterOverride(
    stepId: string,
    parameterName: string
  ) {
    const deleted = await prisma.routingStepParameter.deleteMany({
      where: {
        routingStepId: stepId,
        parameterName
      }
    });

    return deleted.count > 0;
  }

  // ============================================================================
  // NEW: Work Instruction Assignment Methods (MES Enhancement Phase 1)
  // ============================================================================

  /**
   * Assign work instruction to routing step (overrides ProcessSegment standard WI)
   */
  async assignWorkInstructionToStep(
    stepId: string,
    workInstructionId: string
  ) {
    // Verify routing step exists
    const step = await prisma.routingStep.findUnique({
      where: { id: stepId }
    });

    if (!step) {
      throw new Error(`Routing step ${stepId} not found`);
    }

    // Verify work instruction exists
    const workInstruction = await prisma.workInstruction.findUnique({
      where: { id: workInstructionId }
    });

    if (!workInstruction) {
      throw new Error(`Work instruction ${workInstructionId} not found`);
    }

    // Update routing step
    const updated = await prisma.routingStep.update({
      where: { id: stepId },
      data: { workInstructionId },
      include: {
        workInstruction: true,
        processSegment: {
          include: {
            standardWorkInstruction: true
          }
        }
      }
    });

    return updated;
  }

  /**
   * Remove work instruction override from routing step
   * (will fall back to ProcessSegment standard WI if available)
   */
  async removeWorkInstructionFromStep(stepId: string) {
    const step = await prisma.routingStep.findUnique({
      where: { id: stepId }
    });

    if (!step) {
      throw new Error(`Routing step ${stepId} not found`);
    }

    const updated = await prisma.routingStep.update({
      where: { id: stepId },
      data: { workInstructionId: null }
    });

    return updated;
  }

  /**
   * Get effective work instruction for a routing step
   * Returns step-level override if exists, otherwise ProcessSegment standard WI
   */
  async getEffectiveWorkInstruction(stepId: string) {
    const step = await prisma.routingStep.findUnique({
      where: { id: stepId },
      include: {
        workInstruction: {
          include: {
            steps: true
          }
        },
        processSegment: {
          include: {
            standardWorkInstruction: {
              include: {
                steps: true
              }
            }
          }
        }
      }
    });

    if (!step) {
      throw new Error(`Routing step ${stepId} not found`);
    }

    // Return step-level override if exists, otherwise standard WI
    return step.workInstruction || step.processSegment.standardWorkInstruction;
  }
}

// Export singleton instance
export const routingService = new RoutingService();
