import {
  PrismaClient,
  DowntimeEvent,
  DowntimeType,
  DowntimeReason,
  Prisma
} from '@prisma/client';
import { ValidationError, NotFoundError, ConflictError } from '../middleware/errorHandler';

const prisma = new PrismaClient();

// Downtime event with related data
export interface DowntimeEventWithRelations extends DowntimeEvent {
  equipment?: any;
  downtimeReason?: DowntimeReason;
  reportedBy?: any;
  maintenanceWorkOrder?: any;
}

// Create downtime event data
export interface CreateDowntimeEventData {
  equipmentId: string;
  downtimeReasonId: string;
  downtimeType: DowntimeType;
  startTime: Date;
  description: string;
  reportedById: string;
  affectedWorkOrderIds?: string[];
  productionLoss?: number;
  notes?: string;
}

// Update downtime event data
export interface UpdateDowntimeEventData {
  downtimeReasonId?: string;
  downtimeType?: DowntimeType;
  endTime?: Date;
  description?: string;
  rootCause?: string;
  correctiveAction?: string;
  affectedWorkOrderIds?: string[];
  productionLoss?: number;
  notes?: string;
  maintenanceWorkOrderId?: string;
}

// Close downtime event data
export interface CloseDowntimeEventData {
  endTime: Date;
  rootCause?: string;
  correctiveAction?: string;
  maintenanceWorkOrderId?: string;
}

// Downtime event filters
export interface DowntimeEventFilters {
  equipmentId?: string;
  downtimeReasonId?: string;
  downtimeType?: DowntimeType;
  isOpen?: boolean; // true = no end time, false = has end time
  startTime?: { from?: Date; to?: Date };
  endTime?: { from?: Date; to?: Date };
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  search?: string;
  durationMinutes?: { min?: number; max?: number };
}

// Create downtime reason data
export interface CreateDowntimeReasonData {
  code: string;
  name: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

// Update downtime reason data
export interface UpdateDowntimeReasonData {
  code?: string;
  name?: string;
  description?: string;
  category?: string;
  isActive?: boolean;
}

// Downtime analytics data
export interface DowntimeAnalytics {
  equipmentId?: string;
  period: string;
  totalEvents: number;
  totalDowntimeMinutes: number;
  averageDowntimeMinutes: number;
  longestDowntimeMinutes: number;
  shortestDowntimeMinutes: number;
  plannedDowntimeMinutes: number;
  unplannedDowntimeMinutes: number;
  mttr: number; // Mean Time To Repair
  frequencyByReason: Array<{
    reasonId: string;
    reasonName: string;
    category: string;
    count: number;
    totalMinutes: number;
    averageMinutes: number;
  }>;
  frequencyByHour: Array<{
    hour: number;
    count: number;
  }>;
  frequencyByDayOfWeek: Array<{
    dayOfWeek: number;
    dayName: string;
    count: number;
  }>;
}

class DowntimeService {
  /**
   * Create downtime event
   */
  async createDowntimeEvent(data: CreateDowntimeEventData): Promise<DowntimeEvent> {
    // Validate equipment exists
    const equipment = await prisma.equipment.findUnique({
      where: { id: data.equipmentId },
    });

    if (!equipment) {
      throw new NotFoundError(`Equipment with ID ${data.equipmentId} not found`);
    }

    // Validate downtime reason exists
    const reason = await prisma.downtimeReason.findUnique({
      where: { id: data.downtimeReasonId },
    });

    if (!reason) {
      throw new NotFoundError(`Downtime reason with ID ${data.downtimeReasonId} not found`);
    }

    // Validate reporter exists
    const reporter = await prisma.user.findUnique({
      where: { id: data.reportedById },
    });

    if (!reporter) {
      throw new NotFoundError(`Reporter user with ID ${data.reportedById} not found`);
    }

    // Check for overlapping downtime events
    const overlapping = await prisma.downtimeEvent.findFirst({
      where: {
        equipmentId: data.equipmentId,
        endTime: null, // Still open
        startTime: { lte: data.startTime },
      },
    });

    if (overlapping) {
      throw new ValidationError(
        `Equipment already has an open downtime event (ID: ${overlapping.id}). Close it before creating a new one.`
      );
    }

    return prisma.downtimeEvent.create({
      data,
    });
  }

  /**
   * Get all downtime events with filtering and pagination
   */
  async getAllDowntimeEvents(
    filters?: DowntimeEventFilters,
    options?: { skip?: number; take?: number; includeRelations?: boolean }
  ): Promise<{ events: DowntimeEventWithRelations[]; total: number }> {
    const where: Prisma.DowntimeEventWhereInput = {};

    if (filters) {
      if (filters.equipmentId) where.equipmentId = filters.equipmentId;
      if (filters.downtimeReasonId) where.downtimeReasonId = filters.downtimeReasonId;
      if (filters.downtimeType) where.downtimeType = filters.downtimeType;

      // Open/closed filter
      if (filters.isOpen !== undefined) {
        if (filters.isOpen) {
          where.endTime = null;
        } else {
          where.endTime = { not: null };
        }
      }

      // Equipment location filters
      if (filters.siteId || filters.areaId || filters.workCenterId) {
        where.equipment = {};
        if (filters.siteId) where.equipment.siteId = filters.siteId;
        if (filters.areaId) where.equipment.areaId = filters.areaId;
        if (filters.workCenterId) where.equipment.workCenterId = filters.workCenterId;
      }

      // Date range filters
      if (filters.startTime) {
        where.startTime = {};
        if (filters.startTime.from) where.startTime.gte = filters.startTime.from;
        if (filters.startTime.to) where.startTime.lte = filters.startTime.to;
      }

      if (filters.endTime) {
        where.endTime = {};
        if (filters.endTime.from) where.endTime.gte = filters.endTime.from;
        if (filters.endTime.to) where.endTime.lte = filters.endTime.to;
      }

      // Duration filters
      if (filters.durationMinutes) {
        where.durationMinutes = {};
        if (filters.durationMinutes.min) where.durationMinutes.gte = filters.durationMinutes.min;
        if (filters.durationMinutes.max) where.durationMinutes.lte = filters.durationMinutes.max;
      }

      // Text search
      if (filters.search) {
        where.OR = [
          { description: { contains: filters.search, mode: 'insensitive' } },
          { rootCause: { contains: filters.search, mode: 'insensitive' } },
          { correctiveAction: { contains: filters.search, mode: 'insensitive' } },
          { equipment: { name: { contains: filters.search, mode: 'insensitive' } } },
          { equipment: { equipmentNumber: { contains: filters.search, mode: 'insensitive' } } },
          { downtimeReason: { name: { contains: filters.search, mode: 'insensitive' } } },
        ];
      }
    }

    const include = options?.includeRelations
      ? {
          equipment: {
            select: {
              id: true,
              equipmentNumber: true,
              name: true,
              criticality: true,
              site: { select: { id: true, name: true } },
              area: { select: { id: true, name: true } },
              workCenter: { select: { id: true, name: true } },
            },
          },
          downtimeReason: true,
          reportedBy: {
            select: { id: true, firstName: true, lastName: true, username: true },
          },
          maintenanceWorkOrder: {
            select: {
              id: true,
              workOrderNumber: true,
              description: true,
              status: true,
            },
          },
        }
      : undefined;

    const [events, total] = await Promise.all([
      prisma.downtimeEvent.findMany({
        where,
        include,
        skip: options?.skip,
        take: options?.take,
        orderBy: { startTime: 'desc' },
      }),
      prisma.downtimeEvent.count({ where }),
    ]);

    return { events, total };
  }

  /**
   * Get downtime event by ID
   */
  async getDowntimeEventById(id: string): Promise<DowntimeEventWithRelations | null> {
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('Invalid downtime event ID provided');
    }

    return prisma.downtimeEvent.findUnique({
      where: { id: id.trim() },
      include: {
        equipment: {
          include: {
            site: true,
            area: true,
            workCenter: true,
            equipmentTypeRef: true,
          },
        },
        downtimeReason: true,
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true },
        },
        maintenanceWorkOrder: {
          include: {
            assignedTo: {
              select: { id: true, firstName: true, lastName: true, username: true },
            },
          },
        },
      },
    });
  }

  /**
   * Update downtime event
   */
  async updateDowntimeEvent(id: string, data: UpdateDowntimeEventData): Promise<DowntimeEvent> {
    const event = await this.getDowntimeEventById(id);
    if (!event) {
      throw new NotFoundError(`Downtime event with ID ${id} not found`);
    }

    // Validate downtime reason if changing
    if (data.downtimeReasonId) {
      const reason = await prisma.downtimeReason.findUnique({
        where: { id: data.downtimeReasonId },
      });

      if (!reason) {
        throw new NotFoundError(`Downtime reason with ID ${data.downtimeReasonId} not found`);
      }
    }

    // Calculate duration if end time is provided
    const updateData: any = { ...data };
    if (data.endTime && event.startTime) {
      updateData.durationMinutes = Math.round(
        (data.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)
      );
    }

    return prisma.downtimeEvent.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Close downtime event
   */
  async closeDowntimeEvent(id: string, data: CloseDowntimeEventData): Promise<DowntimeEvent> {
    const event = await this.getDowntimeEventById(id);
    if (!event) {
      throw new NotFoundError(`Downtime event with ID ${id} not found`);
    }

    if (event.endTime) {
      throw new ValidationError('Downtime event is already closed');
    }

    if (data.endTime <= event.startTime) {
      throw new ValidationError('End time must be after start time');
    }

    const durationMinutes = Math.round(
      (data.endTime.getTime() - event.startTime.getTime()) / (1000 * 60)
    );

    return prisma.downtimeEvent.update({
      where: { id },
      data: {
        endTime: data.endTime,
        durationMinutes,
        rootCause: data.rootCause,
        correctiveAction: data.correctiveAction,
        maintenanceWorkOrderId: data.maintenanceWorkOrderId,
      },
    });
  }

  /**
   * Delete downtime event
   */
  async deleteDowntimeEvent(id: string): Promise<DowntimeEvent> {
    const event = await this.getDowntimeEventById(id);
    if (!event) {
      throw new NotFoundError(`Downtime event with ID ${id} not found`);
    }

    return prisma.downtimeEvent.delete({
      where: { id },
    });
  }

  /**
   * Get active (open) downtime events
   */
  async getActiveDowntimeEvents(siteId?: string) {
    const where: Prisma.DowntimeEventWhereInput = {
      endTime: null,
    };

    if (siteId) {
      where.equipment = { siteId };
    }

    return prisma.downtimeEvent.findMany({
      where,
      include: {
        equipment: {
          select: {
            id: true,
            equipmentNumber: true,
            name: true,
            criticality: true,
            site: { select: { id: true, name: true } },
            area: { select: { id: true, name: true } },
            workCenter: { select: { id: true, name: true } },
          },
        },
        downtimeReason: true,
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
      },
      orderBy: [
        { equipment: { criticality: 'desc' } },
        { startTime: 'asc' },
      ],
    });
  }

  /**
   * Get downtime events by equipment
   */
  async getDowntimeEventsByEquipment(
    equipmentId: string,
    options?: { limit?: number; includeOpen?: boolean }
  ) {
    const where: Prisma.DowntimeEventWhereInput = { equipmentId };

    if (options?.includeOpen === false) {
      where.endTime = { not: null };
    }

    return prisma.downtimeEvent.findMany({
      where,
      include: {
        downtimeReason: true,
        reportedBy: {
          select: { id: true, firstName: true, lastName: true, username: true },
        },
        maintenanceWorkOrder: {
          select: {
            id: true,
            workOrderNumber: true,
            status: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: options?.limit || 20,
    });
  }

  /**
   * Get downtime analytics for equipment or site
   */
  async getDowntimeAnalytics(
    options: {
      equipmentId?: string;
      siteId?: string;
      days?: number;
    }
  ): Promise<DowntimeAnalytics> {
    const days = options.days || 30;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const where: Prisma.DowntimeEventWhereInput = {
      startTime: { gte: startDate },
      endTime: { not: null }, // Only completed events
    };

    if (options.equipmentId) {
      where.equipmentId = options.equipmentId;
    } else if (options.siteId) {
      where.equipment = { siteId: options.siteId };
    }

    const events = await prisma.downtimeEvent.findMany({
      where,
      include: {
        downtimeReason: true,
      },
      orderBy: { startTime: 'desc' },
    });

    if (events.length === 0) {
      return {
        equipmentId: options.equipmentId,
        period: `${days} days`,
        totalEvents: 0,
        totalDowntimeMinutes: 0,
        averageDowntimeMinutes: 0,
        longestDowntimeMinutes: 0,
        shortestDowntimeMinutes: 0,
        plannedDowntimeMinutes: 0,
        unplannedDowntimeMinutes: 0,
        mttr: 0,
        frequencyByReason: [],
        frequencyByHour: [],
        frequencyByDayOfWeek: [],
      };
    }

    // Calculate basic metrics
    const durations = events.map(event => event.durationMinutes || 0);
    const totalDowntimeMinutes = durations.reduce((sum, duration) => sum + duration, 0);
    const averageDowntimeMinutes = totalDowntimeMinutes / events.length;
    const longestDowntimeMinutes = Math.max(...durations);
    const shortestDowntimeMinutes = Math.min(...durations);

    // Planned vs unplanned downtime
    const plannedEvents = events.filter(event => event.downtimeType === DowntimeType.PLANNED);
    const unplannedEvents = events.filter(event => event.downtimeType === DowntimeType.UNPLANNED);
    const plannedDowntimeMinutes = plannedEvents.reduce((sum, event) => sum + (event.durationMinutes || 0), 0);
    const unplannedDowntimeMinutes = unplannedEvents.reduce((sum, event) => sum + (event.durationMinutes || 0), 0);

    // MTTR (Mean Time To Repair) - only for unplanned downtime
    const mttr = unplannedEvents.length > 0 ? unplannedDowntimeMinutes / unplannedEvents.length : 0;

    // Group by reason
    const reasonMap = new Map();
    events.forEach(event => {
      const reasonId = event.downtimeReasonId;
      if (!reasonMap.has(reasonId)) {
        reasonMap.set(reasonId, {
          reasonId,
          reasonName: event.downtimeReason.name,
          category: event.downtimeReason.category || 'Unknown',
          count: 0,
          totalMinutes: 0,
        });
      }
      const reason = reasonMap.get(reasonId);
      reason.count++;
      reason.totalMinutes += event.durationMinutes || 0;
    });

    const frequencyByReason = Array.from(reasonMap.values()).map(reason => ({
      ...reason,
      averageMinutes: reason.totalMinutes / reason.count,
    }));

    // Group by hour of day
    const hourMap = new Map();
    for (let hour = 0; hour < 24; hour++) {
      hourMap.set(hour, 0);
    }
    events.forEach(event => {
      const hour = event.startTime.getHours();
      hourMap.set(hour, hourMap.get(hour) + 1);
    });
    const frequencyByHour = Array.from(hourMap.entries()).map(([hour, count]) => ({
      hour,
      count,
    }));

    // Group by day of week
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayMap = new Map();
    for (let day = 0; day < 7; day++) {
      dayMap.set(day, 0);
    }
    events.forEach(event => {
      const day = event.startTime.getDay();
      dayMap.set(day, dayMap.get(day) + 1);
    });
    const frequencyByDayOfWeek = Array.from(dayMap.entries()).map(([dayOfWeek, count]) => ({
      dayOfWeek,
      dayName: dayNames[dayOfWeek],
      count,
    }));

    return {
      equipmentId: options.equipmentId,
      period: `${days} days`,
      totalEvents: events.length,
      totalDowntimeMinutes,
      averageDowntimeMinutes,
      longestDowntimeMinutes,
      shortestDowntimeMinutes,
      plannedDowntimeMinutes,
      unplannedDowntimeMinutes,
      mttr,
      frequencyByReason,
      frequencyByHour,
      frequencyByDayOfWeek,
    };
  }

  // ============================================================================
  // DOWNTIME REASON MANAGEMENT
  // ============================================================================

  /**
   * Create downtime reason
   */
  async createDowntimeReason(data: CreateDowntimeReasonData): Promise<DowntimeReason> {
    // Check if code already exists
    const existing = await prisma.downtimeReason.findUnique({
      where: { code: data.code },
    });

    if (existing) {
      throw new ConflictError(`Downtime reason with code ${data.code} already exists`);
    }

    return prisma.downtimeReason.create({
      data: {
        ...data,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });
  }

  /**
   * Get all downtime reasons
   */
  async getAllDowntimeReasons(options?: { includeInactive?: boolean }): Promise<DowntimeReason[]> {
    const where: Prisma.DowntimeReasonWhereInput = {};

    if (!options?.includeInactive) {
      where.isActive = true;
    }

    return prisma.downtimeReason.findMany({
      where,
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    });
  }

  /**
   * Get downtime reason by ID
   */
  async getDowntimeReasonById(id: string): Promise<DowntimeReason | null> {
    return prisma.downtimeReason.findUnique({
      where: { id },
    });
  }

  /**
   * Get downtime reasons by category
   */
  async getDowntimeReasonsByCategory(category: string): Promise<DowntimeReason[]> {
    return prisma.downtimeReason.findMany({
      where: {
        category: { contains: category, mode: 'insensitive' },
        isActive: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  /**
   * Update downtime reason
   */
  async updateDowntimeReason(id: string, data: UpdateDowntimeReasonData): Promise<DowntimeReason> {
    const reason = await this.getDowntimeReasonById(id);
    if (!reason) {
      throw new NotFoundError(`Downtime reason with ID ${id} not found`);
    }

    // Check code uniqueness if changing
    if (data.code && data.code !== reason.code) {
      const existing = await prisma.downtimeReason.findUnique({
        where: { code: data.code },
      });

      if (existing) {
        throw new ConflictError(`Downtime reason with code ${data.code} already exists`);
      }
    }

    return prisma.downtimeReason.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete downtime reason
   */
  async deleteDowntimeReason(id: string): Promise<DowntimeReason> {
    const reason = await this.getDowntimeReasonById(id);
    if (!reason) {
      throw new NotFoundError(`Downtime reason with ID ${id} not found`);
    }

    // Check if any downtime events use this reason
    const eventCount = await prisma.downtimeEvent.count({
      where: { downtimeReasonId: id },
    });

    if (eventCount > 0) {
      throw new ValidationError(
        `Cannot delete downtime reason: ${eventCount} downtime events are using this reason`
      );
    }

    return prisma.downtimeReason.delete({
      where: { id },
    });
  }

  /**
   * Get downtime reason usage statistics
   */
  async getDowntimeReasonUsageStats(days: number = 30) {
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const usage = await prisma.downtimeEvent.groupBy({
      by: ['downtimeReasonId'],
      where: {
        startTime: { gte: startDate },
        endTime: { not: null },
      },
      _count: { downtimeReasonId: true },
      _sum: { durationMinutes: true },
      _avg: { durationMinutes: true },
    });

    const reasons = await prisma.downtimeReason.findMany({
      where: {
        id: { in: usage.map(u => u.downtimeReasonId) },
      },
    });

    return usage.map(u => {
      const reason = reasons.find(r => r.id === u.downtimeReasonId);
      return {
        reasonId: u.downtimeReasonId,
        reasonName: reason?.name || 'Unknown',
        reasonCode: reason?.code || 'Unknown',
        category: reason?.category || 'Unknown',
        eventCount: u._count.downtimeReasonId,
        totalMinutes: u._sum.durationMinutes || 0,
        averageMinutes: u._avg.durationMinutes || 0,
      };
    }).sort((a, b) => b.totalMinutes - a.totalMinutes);
  }
}

export default new DowntimeService();