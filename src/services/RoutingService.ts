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
  RoutingValidationError
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
                operationType: true,
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
                workCenterCode: true,
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

    return routing as RoutingWithRelations;
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
                operationType: true,
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
                workCenterCode: true,
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
                operationType: true,
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
                workCenterCode: true,
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
                operationType: true,
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
                workCenterCode: true,
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
    }) as Promise<RoutingWithRelations[]>;
  }

  /**
   * Update routing
   */
  async updateRouting(id: string, data: UpdateRoutingDTO): Promise<RoutingWithRelations> {
    // If updating to a version that already exists for this part/site, reject
    if (data.version || data.partId || data.siteId) {
      const existing = await prisma.routing.findUnique({ where: { id } });
      if (!existing) {
        throw new Error(`Routing ${id} not found`);
      }

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
                operationType: true,
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
                workCenterCode: true,
                isActive: true
              }
            }
          },
          orderBy: {
            stepNumber: 'asc'
          }
        }
      }
    }) as Promise<RoutingWithRelations>;
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
            operationType: true,
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
            workCenterCode: true,
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
            operationType: true,
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
            workCenterCode: true,
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
            operationType: true,
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
            workCenterCode: true,
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
            operationType: true,
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
            workCenterCode: true,
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
                operationType: true,
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
                workCenterCode: true,
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

    return newRouting as RoutingWithRelations;
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
}

// Export singleton instance
export const routingService = new RoutingService();
