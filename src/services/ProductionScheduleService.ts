/**
 * Production Schedule Service (ISA-95 Production Scheduling - Task 1.6)
 *
 * Handles all production scheduling operations including:
 * - Production schedule CRUD (master schedules)
 * - Schedule entry management (individual line items)
 * - Schedule constraint validation and checking
 * - State machine management (FORECAST → RELEASED → DISPATCHED → RUNNING → COMPLETED → CLOSED)
 * - Scheduling algorithms (Priority-based, EDD, Capacity feasibility)
 * - Dispatch operations (converting schedule entries to work orders)
 * - Feasibility analysis and constraint violation detection
 * - Statistics and reporting
 *
 * This service implements ISA-95 Part 2 Section 4: Production Scheduling
 */

import { PrismaClient, ScheduleState, SchedulePriority, ConstraintType, Prisma } from '@prisma/client';

export class ProductionScheduleService {
  private prisma: PrismaClient;

  constructor(prismaClient?: PrismaClient) {
    this.prisma = prismaClient || new PrismaClient();
  }

// ============================================================================
// PRODUCTION SCHEDULE CRUD OPERATIONS
// ============================================================================

  /**
   * Create a new production schedule
   */
  async createSchedule(data: {
  scheduleNumber: string;
  scheduleName: string;
  description?: string;
  periodStart: Date;
  periodEnd: Date;
  periodType?: string;
  siteId?: string;
  areaId?: string;
  priority?: SchedulePriority;
  plannedBy?: string;
  notes?: string;
  metadata?: any;
}) {
  const schedule = await this.prisma.productionSchedule.create({
    data: {
      ...data,
      state: 'FORECAST', // Always start in FORECAST state
      periodType: data.periodType || 'MONTHLY',
      priority: data.priority || 'NORMAL',
      totalEntries: 0,
      dispatchedCount: 0,
      isFeasible: true,
    },
    include: {
      entries: {
        include: {
          part: true,
          workCenter: true,
          constraints: true,
        },
      },
    },
  });

  // Create initial state history record
  await this.prisma.scheduleStateHistory.create({
    data: {
      scheduleId: schedule.id,
      previousState: null,
      newState: 'FORECAST',
      transitionDate: new Date(),
      reason: 'Initial schedule creation',
      changedBy: data.plannedBy,
      entriesAffected: 0,
      notificationsSent: false,
    },
  });

  // Refetch schedule with state history included
  const scheduleWithHistory = await this.prisma.productionSchedule.findUnique({
    where: { id: schedule.id },
    include: {
      entries: {
        include: {
          part: true,
          workCenter: true,
          constraints: true,
        },
      },
      stateHistory: {
        orderBy: { transitionDate: 'desc' },
        take: 5,
      },
    },
  });

  return scheduleWithHistory!;
}

  /**
   * Get schedule by ID
   */
  async getScheduleById(id: string, includeRelations: boolean = true) {
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { id },
    include: includeRelations ? {
      site: true,
      entries: {
        include: {
          part: true,
          workCenter: true,
          workOrder: true,
          constraints: true,
        },
        orderBy: [
          { sequenceNumber: 'asc' },
          { entryNumber: 'asc' },
        ],
      },
      stateHistory: {
        orderBy: { transitionDate: 'desc' },
        take: 10,
      },
    } : undefined,
  });

  if (!schedule) {
    throw new Error(`Production schedule with ID ${id} not found`);
  }

  return schedule;
}

  /**
   * Get schedule by schedule number
   */
  async getScheduleByNumber(scheduleNumber: string, includeRelations: boolean = true) {
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { scheduleNumber },
    include: includeRelations ? {
      site: true,
      entries: {
        include: {
          part: true,
          workCenter: true,
          workOrder: true,
          constraints: true,
        },
        orderBy: [
          { sequenceNumber: 'asc' },
          { entryNumber: 'asc' },
        ],
      },
      stateHistory: {
        orderBy: { transitionDate: 'desc' },
      },
    } : undefined,
  });

  if (!schedule) {
    throw new Error(`Production schedule with number ${scheduleNumber} not found`);
  }

  return schedule;
}

  /**
   * Get all schedules with optional filters
   */
  async getAllSchedules(filters: {
  state?: ScheduleState;
  priority?: SchedulePriority;
  siteId?: string;
  periodStart?: Date;
  periodEnd?: Date;
  isLocked?: boolean;
  isFeasible?: boolean;
}, includeRelations: boolean = false) {
  const where: Prisma.ProductionScheduleWhereInput = {};

  if (filters.state) {
    where.state = filters.state;
  }

  if (filters.priority) {
    where.priority = filters.priority;
  }

  if (filters.siteId) {
    where.siteId = filters.siteId;
  }

  if (filters.periodStart) {
    where.periodStart = { gte: filters.periodStart };
  }

  if (filters.periodEnd) {
    where.periodEnd = { lte: filters.periodEnd };
  }

  if (filters.isLocked !== undefined) {
    where.isLocked = filters.isLocked;
  }

  if (filters.isFeasible !== undefined) {
    where.isFeasible = filters.isFeasible;
  }

  const schedules = await this.prisma.productionSchedule.findMany({
    where,
    include: includeRelations ? {
      site: true,
      entries: {
        include: {
          part: true,
          workCenter: true,
        },
      },
    } : undefined,
    orderBy: [
      { priority: 'desc' },
      { periodStart: 'asc' },
    ],
  });

  return schedules;
}

  /**
   * Update schedule
   */
  async updateSchedule(id: string, data: Partial<{
  scheduleName: string;
  description: string;
  periodStart: Date;
  periodEnd: Date;
  periodType: string;
  priority: SchedulePriority;
  plannedBy: string;
  approvedBy: string;
  approvedAt: Date;
  isLocked: boolean;
  isFeasible: boolean;
  feasibilityNotes: string;
  notes: string;
  metadata: any;
}>) {
  // Check if schedule is locked
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { id },
    select: { isLocked: true, state: true },
  });

  if (!schedule) {
    throw new Error(`Production schedule with ID ${id} not found`);
  }

  if (schedule.isLocked && schedule.state !== 'FORECAST') {
    throw new Error('Cannot update locked schedule that is not in FORECAST state');
  }

  const updatedSchedule = await this.prisma.productionSchedule.update({
    where: { id },
    data,
    include: {
      entries: true,
      stateHistory: {
        orderBy: { transitionDate: 'desc' },
        take: 5,
      },
    },
  });

  return updatedSchedule;
}

  /**
   * Delete schedule (soft delete by locking)
   */
  async deleteSchedule(id: string, hardDelete: boolean = false) {
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { id },
    select: { state: true, dispatchedCount: true },
  });

  if (!schedule) {
    throw new Error(`Production schedule with ID ${id} not found`);
  }

  // Prevent deletion if any entries have been dispatched
  if (schedule.dispatchedCount > 0 && !hardDelete) {
    throw new Error('Cannot delete schedule with dispatched entries. Use hard delete if necessary.');
  }

  if (hardDelete) {
    await this.prisma.productionSchedule.delete({
      where: { id },
    });
    return { message: 'Production schedule permanently deleted', id };
  } else {
    await this.prisma.productionSchedule.update({
      where: { id },
      data: { isLocked: true, notes: 'Schedule locked for deletion' },
    });
    return { message: 'Production schedule locked', id };
  }
}

// ============================================================================
// SCHEDULE ENTRY OPERATIONS
// ============================================================================

  /**
   * Add schedule entry to schedule
   */
  async addScheduleEntry(scheduleId: string, data: {
  partId: string;
  partNumber: string;
  description?: string;
  plannedQuantity: number;
  unitOfMeasure: string;
  plannedStartDate: Date;
  plannedEndDate: Date;
  priority?: SchedulePriority;
  sequenceNumber?: number;
  estimatedDuration?: number;
  workCenterId?: string;
  routingId?: string;
  customerOrder?: string;
  customerDueDate?: Date;
  salesOrder?: string;
  notes?: string;
  metadata?: any;
}) {
  // Get current schedule
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { id: scheduleId },
    select: { state: true, isLocked: true, totalEntries: true },
  });

  if (!schedule) {
    throw new Error(`Production schedule with ID ${scheduleId} not found`);
  }

  if (schedule.isLocked) {
    throw new Error('Cannot add entries to locked schedule');
  }

  if (schedule.state === 'CLOSED') {
    throw new Error('Cannot add entries to closed schedule');
  }

  // Determine entry number (next available)
  const entryNumber = schedule.totalEntries + 1;

  const entry = await this.prisma.scheduleEntry.create({
    data: {
      scheduleId,
      entryNumber,
      ...data,
      priority: data.priority || 'NORMAL',
      dispatchedQuantity: 0,
      completedQuantity: 0,
      isDispatched: false,
      isCancelled: false,
    },
    include: {
      part: true,
      workCenter: true,
      routing: true,
      constraints: true,
    },
  });

  // Update schedule total entries count
  await this.prisma.productionSchedule.update({
    where: { id: scheduleId },
    data: { totalEntries: { increment: 1 } },
  });

  return entry;
}

  /**
   * Get all entries for a schedule
   */
  async getScheduleEntries(scheduleId: string, includeConstraints: boolean = true) {
  const entries = await this.prisma.scheduleEntry.findMany({
    where: { scheduleId },
    include: {
      part: true,
      workCenter: true,
      routing: true,
      workOrder: true,
      constraints: includeConstraints,
    },
    orderBy: [
      { sequenceNumber: 'asc' },
      { priority: 'desc' },
      { plannedStartDate: 'asc' },
    ],
  });

  return entries;
}

  /**
   * Update schedule entry
   */
  async updateScheduleEntry(entryId: string, data: Partial<{
  description: string;
  plannedQuantity: number;
  plannedStartDate: Date;
  plannedEndDate: Date;
  priority: SchedulePriority;
  sequenceNumber: number;
  estimatedDuration: number;
  workCenterId: string;
  routingId: string;
  customerOrder: string;
  customerDueDate: Date;
  salesOrder: string;
  notes: string;
  metadata: any;
}>) {
  // Check if entry is already dispatched
  const entry = await this.prisma.scheduleEntry.findUnique({
    where: { id: entryId },
    select: { isDispatched: true, scheduleId: true },
  });

  if (!entry) {
    throw new Error(`Schedule entry with ID ${entryId} not found`);
  }

  if (entry.isDispatched) {
    throw new Error('Cannot update dispatched schedule entry');
  }

  const updatedEntry = await this.prisma.scheduleEntry.update({
    where: { id: entryId },
    data,
    include: {
      part: true,
      workCenter: true,
      routing: true,
      constraints: true,
    },
  });

  return updatedEntry;
}

  /**
   * Cancel schedule entry
   */
  async cancelScheduleEntry(entryId: string, reason: string, cancelledBy?: string) {
  const entry = await this.prisma.scheduleEntry.findUnique({
    where: { id: entryId },
    select: { isDispatched: true, scheduleId: true },
  });

  if (!entry) {
    throw new Error(`Schedule entry with ID ${entryId} not found`);
  }

  if (entry.isDispatched) {
    throw new Error('Cannot cancel dispatched schedule entry');
  }

  const cancelledEntry = await this.prisma.scheduleEntry.update({
    where: { id: entryId },
    data: {
      isCancelled: true,
      cancelledAt: new Date(),
      cancelledReason: reason,
    },
    include: {
      part: true,
      workCenter: true,
    },
  });

  return cancelledEntry;
}

// ============================================================================
// SCHEDULE CONSTRAINT OPERATIONS
// ============================================================================

  /**
   * Add constraint to schedule entry
   */
  async addConstraint(entryId: string, data: {
  constraintType: ConstraintType;
  constraintName: string;
  description?: string;
  resourceId?: string;
  resourceType?: string;
  requiredQuantity?: number;
  availableQuantity?: number;
  unitOfMeasure?: string;
  constraintDate?: Date;
  leadTimeDays?: number;
  notes?: string;
  metadata?: any;
}) {
  const constraint = await this.prisma.scheduleConstraint.create({
    data: {
      entryId,
      ...data,
      isViolated: false,
      isResolved: false,
    },
  });

  // Check if constraint is violated
  await this.checkConstraintViolation(constraint.id);

  return constraint;
}

  /**
   * Get all constraints for a schedule entry
   */
  async getEntryConstraints(entryId: string) {
  const constraints = await this.prisma.scheduleConstraint.findMany({
    where: { entryId },
    orderBy: [
      { isViolated: 'desc' },
      { constraintType: 'asc' },
    ],
  });

  return constraints;
}

  /**
   * Update constraint
   */
  async updateConstraint(constraintId: string, data: Partial<{
  constraintName: string;
  description: string;
  requiredQuantity: number;
  availableQuantity: number;
  unitOfMeasure: string;
  constraintDate: Date;
  leadTimeDays: number;
  isViolated: boolean;
  violationSeverity: string;
  violationMessage: string;
  isResolved: boolean;
  resolvedAt: Date;
  resolvedBy: string;
  resolutionNotes: string;
  notes: string;
  metadata: any;
}>) {
  const constraint = await this.prisma.scheduleConstraint.update({
    where: { id: constraintId },
    data,
  });

  return constraint;
}

  /**
   * Resolve constraint violation
   */
  async resolveConstraint(constraintId: string, resolvedBy: string, resolutionNotes: string) {
  const constraint = await this.prisma.scheduleConstraint.update({
    where: { id: constraintId },
    data: {
      isResolved: true,
      resolvedAt: new Date(),
      resolvedBy,
      resolutionNotes,
      isViolated: false,
    },
  });

  return constraint;
}

  /**
   * Check constraint violation
   */
  async checkConstraintViolation(constraintId: string) {
  const constraint = await this.prisma.scheduleConstraint.findUnique({
    where: { id: constraintId },
  });

  if (!constraint) {
    throw new Error(`Constraint with ID ${constraintId} not found`);
  }

  let isViolated = false;
  let violationSeverity = 'LOW';
  let violationMessage = '';

  // Check based on constraint type
  switch (constraint.constraintType) {
    case 'CAPACITY':
      if (constraint.requiredQuantity && constraint.availableQuantity) {
        if (constraint.requiredQuantity > constraint.availableQuantity) {
          isViolated = true;
          const shortfall = constraint.requiredQuantity - constraint.availableQuantity;
          const percentShortfall = (shortfall / constraint.requiredQuantity) * 100;
          violationSeverity = percentShortfall >= 50 ? 'HIGH' : percentShortfall > 20 ? 'MEDIUM' : 'LOW';
          violationMessage = `Capacity shortage: Required ${constraint.requiredQuantity} ${constraint.unitOfMeasure}, Available ${constraint.availableQuantity} ${constraint.unitOfMeasure}`;
        }
      }
      break;

    case 'MATERIAL':
      if (constraint.requiredQuantity && constraint.availableQuantity) {
        if (constraint.requiredQuantity > constraint.availableQuantity) {
          isViolated = true;
          const shortfall = constraint.requiredQuantity - constraint.availableQuantity;
          const percentShortfall = (shortfall / constraint.requiredQuantity) * 100;
          violationSeverity = percentShortfall >= 50 ? 'HIGH' : percentShortfall > 20 ? 'MEDIUM' : 'LOW';
          violationMessage = `Material shortage: Required ${constraint.requiredQuantity} ${constraint.unitOfMeasure}, Available ${constraint.availableQuantity} ${constraint.unitOfMeasure}`;
        }
      }
      break;

    case 'DATE':
      if (constraint.constraintDate) {
        const now = new Date();
        const daysUntilDeadline = Math.floor((constraint.constraintDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        if (daysUntilDeadline < 0) {
          isViolated = true;
          violationSeverity = 'HIGH';
          violationMessage = `Date constraint violated: Deadline ${constraint.constraintDate.toISOString().split('T')[0]} has passed`;
        } else if (daysUntilDeadline < 3) {
          isViolated = true;
          violationSeverity = 'MEDIUM';
          violationMessage = `Date constraint at risk: Only ${daysUntilDeadline} days until deadline`;
        }
      }
      break;

    default:
      // For other constraint types, use existing violation status
      break;
  }

  // Update constraint if violation status changed
  if (isViolated !== constraint.isViolated) {
    await this.prisma.scheduleConstraint.update({
      where: { id: constraintId },
      data: {
        isViolated,
        violationSeverity: isViolated ? violationSeverity : null,
        violationMessage: isViolated ? violationMessage : null,
      },
    });
  }

  return { isViolated, violationSeverity, violationMessage };
}

// ============================================================================
// STATE MANAGEMENT OPERATIONS
// ============================================================================

  /**
   * Transition schedule to new state
   */
  async transitionScheduleState(scheduleId: string, data: {
  newState: ScheduleState;
  reason?: string;
  changedBy?: string;
  notificationsSent?: boolean;
  notes?: string;
  metadata?: any;
}) {
  // Get current schedule state
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { id: scheduleId },
    select: { state: true, totalEntries: true, isLocked: true },
  });

  if (!schedule) {
    throw new Error(`Production schedule with ID ${scheduleId} not found`);
  }

  // Validate state transitions
  const validTransitions: Record<ScheduleState, ScheduleState[]> = {
    FORECAST: ['RELEASED'],
    RELEASED: ['DISPATCHED', 'FORECAST'],
    DISPATCHED: ['RUNNING'],
    RUNNING: ['COMPLETED'],
    COMPLETED: ['CLOSED'],
    CLOSED: [],
  };

  if (!validTransitions[schedule.state].includes(data.newState)) {
    throw new Error(`Invalid state transition from ${schedule.state} to ${data.newState}`);
  }

  // Create state history record
  const stateHistory = await this.prisma.scheduleStateHistory.create({
    data: {
      scheduleId,
      previousState: schedule.state,
      newState: data.newState,
      transitionDate: new Date(),
      reason: data.reason,
      changedBy: data.changedBy,
      entriesAffected: schedule.totalEntries,
      notificationsSent: data.notificationsSent || false,
      notes: data.notes,
      metadata: data.metadata,
    },
  });

  // Update schedule state
  await this.prisma.productionSchedule.update({
    where: { id: scheduleId },
    data: {
      state: data.newState,
      stateChangedAt: new Date(),
      stateChangedBy: data.changedBy,
      ...(data.newState === 'RELEASED' && !schedule.isLocked ? { isLocked: true } : {}),
    },
  });

  return stateHistory;
}

  /**
   * Get state history for schedule
   */
  async getScheduleStateHistory(scheduleId: string) {
  const history = await this.prisma.scheduleStateHistory.findMany({
    where: { scheduleId },
    orderBy: { transitionDate: 'desc' },
  });

  return history;
}

// ============================================================================
// SCHEDULING ALGORITHMS
// ============================================================================

  /**
   * Apply priority-based sequencing to schedule entries
   */
  async applyPrioritySequencing(scheduleId: string) {
  const entries = await this.prisma.scheduleEntry.findMany({
    where: { scheduleId, isCancelled: false },
    orderBy: [
      { priority: 'desc' },
      { customerDueDate: 'asc' },
      { plannedStartDate: 'asc' },
    ],
  });

  // Update sequence numbers based on priority
  for (let i = 0; i < entries.length; i++) {
    await this.prisma.scheduleEntry.update({
      where: { id: entries[i].id },
      data: { sequenceNumber: i + 1 },
    });
  }

  return entries.length;
}

  /**
   * Apply Earliest Due Date (EDD) sequencing
   */
  async applyEDDSequencing(scheduleId: string) {
  const entries = await this.prisma.scheduleEntry.findMany({
    where: { scheduleId, isCancelled: false },
    orderBy: [
      { customerDueDate: 'asc' },
      { priority: 'desc' },
    ],
  });

  // Update sequence numbers based on due dates
  for (let i = 0; i < entries.length; i++) {
    await this.prisma.scheduleEntry.update({
      where: { id: entries[i].id },
      data: { sequenceNumber: i + 1 },
    });
  }

  return entries.length;
}

  /**
   * Check schedule feasibility (capacity, materials, dates)
   */
  async checkScheduleFeasibility(scheduleId: string) {
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      entries: {
        include: {
          constraints: true,
        },
      },
    },
  });

  if (!schedule) {
    throw new Error(`Production schedule with ID ${scheduleId} not found`);
  }

  let isFeasible = true;
  const feasibilityIssues: string[] = [];

  // Check all entry constraints
  for (const entry of schedule.entries) {
    for (const constraint of entry.constraints) {
      const violation = await this.checkConstraintViolation(constraint.id);
      if (violation.isViolated) {
        isFeasible = false;
        feasibilityIssues.push(`Entry ${entry.entryNumber} - ${constraint.constraintName}: ${violation.violationMessage}`);
      }
    }
  }

  // Update schedule feasibility
  await this.prisma.productionSchedule.update({
    where: { id: scheduleId },
    data: {
      isFeasible,
      feasibilityNotes: feasibilityIssues.length > 0 ? feasibilityIssues.join('\n') : 'All constraints satisfied',
    },
  });

  return {
    isFeasible,
    feasibilityIssues,
  };
}

// ============================================================================
// DISPATCH OPERATIONS (Convert Schedule Entries to Work Orders)
// ============================================================================

  /**
   * Dispatch schedule entry (create work order)
   */
  async dispatchScheduleEntry(entryId: string, dispatchedBy: string) {
  const entry = await this.prisma.scheduleEntry.findUnique({
    where: { id: entryId },
    include: {
      part: true,
      schedule: true,
      routing: true,
    },
  });

  if (!entry) {
    throw new Error(`Schedule entry with ID ${entryId} not found`);
  }

  if (entry.isDispatched) {
    throw new Error('Schedule entry already dispatched');
  }

  if (entry.isCancelled) {
    throw new Error('Cannot dispatch cancelled schedule entry');
  }

  if (entry.schedule.state !== 'RELEASED' && entry.schedule.state !== 'DISPATCHED') {
    throw new Error(`Cannot dispatch entry from schedule in ${entry.schedule.state} state`);
  }

  // Look up user by username to get user ID for foreign key constraint
  const user = await this.prisma.user.findUnique({
    where: { username: dispatchedBy }
  });

  if (!user) {
    throw new Error(`User with username '${dispatchedBy}' not found`);
  }

  // Create work order from schedule entry
  const workOrder = await this.prisma.workOrder.create({
    data: {
      workOrderNumber: `WO-${entry.schedule.scheduleNumber}-${entry.entryNumber}`,
      partId: entry.partId,
      quantity: entry.plannedQuantity,
      priority: entry.priority as any, // Map schedule priority to work order priority
      status: 'CREATED',
      dueDate: entry.customerDueDate || entry.plannedEndDate,
      customerOrder: entry.customerOrder,
      createdById: user.id, // Use user ID, not username (fixes foreign key constraint)
      // Note: WorkOrder model doesn't have a notes field
      // Dispatch context is tracked via WorkOrderStatusHistory.notes and DispatchLog
    },
  });

  // Update schedule entry
  const updatedEntry = await this.prisma.scheduleEntry.update({
    where: { id: entryId },
    data: {
      isDispatched: true,
      dispatchedAt: new Date(),
      dispatchedBy,
      dispatchedQuantity: entry.plannedQuantity,
      workOrderId: workOrder.id,
      actualStartDate: new Date(),
    },
  });

  // Update schedule dispatched count
  await this.prisma.productionSchedule.update({
    where: { id: entry.scheduleId },
    data: {
      dispatchedCount: { increment: 1 },
    },
  });

  // Transition schedule to DISPATCHED state if first entry
  if (entry.schedule.state === 'RELEASED') {
    await this.transitionScheduleState(entry.scheduleId, {
      newState: 'DISPATCHED',
      reason: 'First entry dispatched',
      changedBy: dispatchedBy,
    });
  }

  return {
    entry: updatedEntry,
    workOrder,
  };
}

  /**
   * Dispatch all entries in schedule
   */
  async dispatchAllEntries(scheduleId: string, dispatchedBy: string) {
  const schedule = await this.prisma.productionSchedule.findUnique({
    where: { id: scheduleId },
    include: {
      entries: {
        where: {
          isDispatched: false,
          isCancelled: false,
        },
        orderBy: [
          { sequenceNumber: 'asc' },
          { entryNumber: 'asc' },
        ],
      },
    },
  });

  if (!schedule) {
    throw new Error(`Production schedule with ID ${scheduleId} not found`);
  }

  if (schedule.state !== 'RELEASED') {
    throw new Error(`Cannot dispatch entries from schedule in ${schedule.state} state. Schedule must be in RELEASED state.`);
  }

  const dispatchedEntries: any[] = [];

  for (const entry of schedule.entries) {
    try {
      const result = await this.dispatchScheduleEntry(entry.id, dispatchedBy);
      dispatchedEntries.push(result);
    } catch (error: any) {
      console.error(`Failed to dispatch entry ${entry.entryNumber}:`, error.message);
    }
  }

  return {
    dispatchedCount: dispatchedEntries.length,
    entries: dispatchedEntries,
  };
}

// ============================================================================
// STATISTICS AND REPORTING
// ============================================================================

  /**
   * Get production scheduling statistics
   */
  async getStatistics() {
  const [
    totalSchedules,
    schedulesByState,
    schedulesByPriority,
    totalEntries,
    dispatchedEntries,
    cancelledEntries,
    totalConstraints,
    violatedConstraints,
    resolvedConstraints,
    stateTransitions,
  ] = await Promise.all([
    this.prisma.productionSchedule.count(),
    this.prisma.productionSchedule.groupBy({
      by: ['state'],
      _count: true,
    }),
    this.prisma.productionSchedule.groupBy({
      by: ['priority'],
      _count: true,
    }),
    this.prisma.scheduleEntry.count(),
    this.prisma.scheduleEntry.count({ where: { isDispatched: true } }),
    this.prisma.scheduleEntry.count({ where: { isCancelled: true } }),
    this.prisma.scheduleConstraint.count(),
    this.prisma.scheduleConstraint.count({ where: { isViolated: true } }),
    this.prisma.scheduleConstraint.count({ where: { isResolved: true } }),
    this.prisma.scheduleStateHistory.count(),
  ]);

  return {
    schedules: {
      total: totalSchedules,
      byState: schedulesByState.reduce((acc, item) => {
        acc[item.state] = item._count;
        return acc;
      }, {} as Record<string, number>),
      byPriority: schedulesByPriority.reduce((acc, item) => {
        acc[item.priority] = item._count;
        return acc;
      }, {} as Record<string, number>),
    },
    entries: {
      total: totalEntries,
      dispatched: dispatchedEntries,
      cancelled: cancelledEntries,
      pending: totalEntries - dispatchedEntries - cancelledEntries,
    },
    constraints: {
      total: totalConstraints,
      violated: violatedConstraints,
      resolved: resolvedConstraints,
    },
    stateTransitions: {
      total: stateTransitions,
    },
  };
}

  /**
   * Get schedules by state
   */
  async getSchedulesByState(state: ScheduleState) {
  const schedules = await this.prisma.productionSchedule.findMany({
    where: { state },
    include: {
      site: true,
      entries: {
        include: {
          part: true,
          workCenter: true,
        },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { periodStart: 'asc' },
    ],
  });

  return schedules;
}

  /**
   * Get entries ready for dispatch (in RELEASED schedules, not cancelled, not dispatched)
   */
  async getEntriesReadyForDispatch(siteId?: string) {
  const where: Prisma.ScheduleEntryWhereInput = {
    isDispatched: false,
    isCancelled: false,
    schedule: {
      state: 'RELEASED',
    },
  };

  if (siteId) {
    where.schedule = {
      ...where.schedule,
      siteId: siteId as any,
    };
  }

  const entries = await this.prisma.scheduleEntry.findMany({
    where,
    include: {
      part: true,
      workCenter: true,
      schedule: true,
      constraints: {
        where: { isViolated: true },
      },
    },
    orderBy: [
      { priority: 'desc' },
      { sequenceNumber: 'asc' },
      { customerDueDate: 'asc' },
    ],
  });

  return entries;
}
}

export default new ProductionScheduleService();
