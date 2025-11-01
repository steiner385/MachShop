/**
 * Version Adapter Pattern
 * Transforms between different API versions while maintaining backward compatibility
 * Shared business logic with version-specific transformations
 */

import { IVersionAdapter } from '../types/versioning';

/**
 * Base Version Adapter - provides common structure for all adapters
 */
export abstract class BaseVersionAdapter implements IVersionAdapter {
  protected version: string;

  constructor(version: string) {
    this.version = version;
  }

  /**
   * Convert internal domain model to API response format
   */
  abstract toApiResponse(data: unknown): unknown;

  /**
   * Convert API request format to internal domain model
   */
  abstract fromApiRequest(data: unknown): unknown;

  /**
   * Validate request against version schema
   */
  abstract validateRequest(data: unknown): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Validate response against version schema
   */
  abstract validateResponse(data: unknown): Promise<{ valid: boolean; errors?: string[] }>;

  /**
   * Get version identifier
   */
  getVersion(): string {
    return this.version;
  }
}

/**
 * V1 API Adapter - Legacy format
 * Used for backward compatibility with existing clients
 */
export class WorkOrderV1Adapter extends BaseVersionAdapter {
  constructor() {
    super('v1');
  }

  /**
   * Convert domain WorkOrder to V1 API response
   * V1 uses string status instead of enum
   */
  toApiResponse(workOrder: any): any {
    return {
      id: workOrder.id,
      number: workOrder.workOrderNumber,
      status: String(workOrder.status), // String format in v1
      title: workOrder.title,
      description: workOrder.description,
      priority: workOrder.priority,
      startDate: workOrder.scheduledStartDate?.toISOString(),
      endDate: workOrder.scheduledEndDate?.toISOString(),
      actualStartDate: workOrder.actualStartDate?.toISOString(),
      actualEndDate: workOrder.actualEndDate?.toISOString(),
      assignedTo: workOrder.assignedToId,
      createdAt: workOrder.createdAt.toISOString(),
      updatedAt: workOrder.updatedAt.toISOString(),
      // V1 doesn't have these fields - omitted for compatibility
    };
  }

  /**
   * Convert V1 request to domain format
   */
  fromApiRequest(request: any): any {
    return {
      workOrderNumber: request.number,
      title: request.title,
      description: request.description,
      priority: request.priority,
      scheduledStartDate: request.startDate ? new Date(request.startDate) : undefined,
      scheduledEndDate: request.endDate ? new Date(request.endDate) : undefined,
      assignedToId: request.assignedTo,
      // Parse status from string to enum
      status: this.parseV1Status(request.status),
    };
  }

  /**
   * Validate V1 request format
   */
  async validateRequest(data: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const req = data as any;

    if (!req.number || typeof req.number !== 'string') {
      errors.push('number is required and must be a string');
    }
    if (!req.title || typeof req.title !== 'string') {
      errors.push('title is required and must be a string');
    }
    if (req.status && !this.isValidV1Status(req.status)) {
      errors.push(`status must be one of: OPEN, IN_PROGRESS, COMPLETED, CLOSED`);
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Validate V1 response format
   */
  async validateResponse(data: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const res = data as any;

    if (!res.id) errors.push('id is required');
    if (!res.status) errors.push('status is required');
    if (typeof res.status !== 'string') errors.push('status must be a string in v1');

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private parseV1Status(status: string): string {
    // Map V1 string statuses to internal enum
    const statusMap: Record<string, string> = {
      OPEN: 'OPEN',
      'IN_PROGRESS': 'IN_PROGRESS',
      COMPLETED: 'COMPLETED',
      CLOSED: 'CLOSED',
    };
    return statusMap[status] || 'OPEN';
  }

  private isValidV1Status(status: string): boolean {
    return ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status);
  }
}

/**
 * V2 API Adapter - Current format with enhancements
 * Uses enum status, additional fields, improved structure
 */
export class WorkOrderV2Adapter extends BaseVersionAdapter {
  constructor() {
    super('v2');
  }

  /**
   * Convert domain WorkOrder to V2 API response
   * V2 uses enum status and includes additional fields
   */
  toApiResponse(workOrder: any): any {
    return {
      id: workOrder.id,
      number: workOrder.workOrderNumber,
      status: {
        value: workOrder.status,
        displayName: this.getStatusDisplayName(workOrder.status),
      },
      title: workOrder.title,
      description: workOrder.description,
      priority: {
        value: workOrder.priority,
        displayName: this.getPriorityDisplayName(workOrder.priority),
      },
      schedule: {
        startDate: workOrder.scheduledStartDate?.toISOString(),
        endDate: workOrder.scheduledEndDate?.toISOString(),
      },
      actual: {
        startDate: workOrder.actualStartDate?.toISOString(),
        endDate: workOrder.actualEndDate?.toISOString(),
        duration: this.calculateDuration(workOrder.actualStartDate, workOrder.actualEndDate),
      },
      assignment: {
        assignedToId: workOrder.assignedToId,
        assignedAt: workOrder.assignedAt?.toISOString(),
      },
      metadata: {
        createdAt: workOrder.createdAt.toISOString(),
        updatedAt: workOrder.updatedAt.toISOString(),
        createdBy: workOrder.createdById,
      },
    };
  }

  /**
   * Convert V2 request to domain format
   */
  fromApiRequest(request: any): any {
    return {
      workOrderNumber: request.number,
      title: request.title,
      description: request.description,
      priority: request.priority?.value || request.priority,
      scheduledStartDate: request.schedule?.startDate ? new Date(request.schedule.startDate) : undefined,
      scheduledEndDate: request.schedule?.endDate ? new Date(request.schedule.endDate) : undefined,
      assignedToId: request.assignment?.assignedToId,
      status: request.status?.value || request.status,
    };
  }

  /**
   * Validate V2 request format
   */
  async validateRequest(data: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const req = data as any;

    if (!req.number || typeof req.number !== 'string') {
      errors.push('number is required and must be a string');
    }
    if (!req.title || typeof req.title !== 'string') {
      errors.push('title is required and must be a string');
    }
    if (req.priority && !this.isValidPriority(req.priority?.value || req.priority)) {
      errors.push('priority must be one of: LOW, MEDIUM, HIGH, URGENT');
    }
    if (req.status && !this.isValidStatus(req.status?.value || req.status)) {
      errors.push('status must be one of: OPEN, IN_PROGRESS, COMPLETED, CLOSED');
    }

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  /**
   * Validate V2 response format
   */
  async validateResponse(data: unknown): Promise<{ valid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    const res = data as any;

    if (!res.id) errors.push('id is required');
    if (!res.status) errors.push('status is required');
    if (res.status && !res.status.value) errors.push('status.value is required');

    return { valid: errors.length === 0, errors: errors.length > 0 ? errors : undefined };
  }

  private isValidStatus(status: string): boolean {
    return ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'].includes(status);
  }

  private isValidPriority(priority: string): boolean {
    return ['LOW', 'MEDIUM', 'HIGH', 'URGENT'].includes(priority);
  }

  private getStatusDisplayName(status: string): string {
    const displayNames: Record<string, string> = {
      OPEN: 'Open',
      IN_PROGRESS: 'In Progress',
      COMPLETED: 'Completed',
      CLOSED: 'Closed',
    };
    return displayNames[status] || status;
  }

  private getPriorityDisplayName(priority: string): string {
    const displayNames: Record<string, string> = {
      LOW: 'Low',
      MEDIUM: 'Medium',
      HIGH: 'High',
      URGENT: 'Urgent',
    };
    return displayNames[priority] || priority;
  }

  private calculateDuration(start: Date | undefined, end: Date | undefined): number | undefined {
    if (!start || !end) return undefined;
    return Math.round((end.getTime() - start.getTime()) / 1000); // Duration in seconds
  }
}

/**
 * Adapter Factory - creates appropriate adapter based on version
 */
export class AdapterFactory {
  private static adapters: Map<string, BaseVersionAdapter> = new Map([
    ['v1', new WorkOrderV1Adapter()],
    ['v2', new WorkOrderV2Adapter()],
  ]);

  /**
   * Get adapter for version
   */
  static getAdapter(version: string): BaseVersionAdapter {
    const adapter = this.adapters.get(version);
    if (!adapter) {
      throw new Error(`No adapter found for version ${version}`);
    }
    return adapter;
  }

  /**
   * Register custom adapter
   */
  static registerAdapter(version: string, adapter: BaseVersionAdapter): void {
    this.adapters.set(version, adapter);
  }

  /**
   * Get all registered adapters
   */
  static getAllAdapters(): Map<string, BaseVersionAdapter> {
    return new Map(this.adapters);
  }
}

/**
 * Middleware to apply version adapter transformations
 */
export async function applyVersionAdapter(req: any, res: any, next: any): Promise<void> {
  try {
    const version = req.apiVersion || 'v1';
    const adapter = AdapterFactory.getAdapter(version);

    // Attach adapter to request for use in controllers
    req.adapter = adapter;

    // Wrap response.json to apply adapter transformations
    const originalJson = res.json.bind(res);
    res.json = function (data: any) {
      try {
        const transformed = adapter.toApiResponse(data);
        return originalJson(transformed);
      } catch (error) {
        console.error(`Failed to transform response for version ${version}:`, error);
        return originalJson(data); // Fallback to original data
      }
    };

    next();
  } catch (error) {
    next(error);
  }
}
