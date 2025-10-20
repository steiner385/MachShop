/**
 * Production Scheduling API
 * Phase 2: Production Scheduling Dashboard
 */

import { apiClient, ApiResponse } from './client';
import {
  ProductionSchedule,
  ScheduleEntry,
  ScheduleConstraint,
  ScheduleStateHistory,
  ScheduleStatistics,
  FeasibilityResult,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  CreateScheduleEntryRequest,
  UpdateScheduleEntryRequest,
  TransitionStateRequest,
  ScheduleQueryParams,
} from '@/types/scheduling';

const BASE_URL = '/api/v1/production-schedules';

// ============================================
// SCHEDULE CRUD OPERATIONS
// ============================================

export const schedulingAPI = {
  /**
   * Get all schedules with optional filters
   */
  async getAllSchedules(params?: ScheduleQueryParams): Promise<ApiResponse<ProductionSchedule[]>> {
    try {
      const response = await apiClient.get<ProductionSchedule[]>(BASE_URL, { params });
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch schedules',
      };
    }
  },

  /**
   * Get schedule by ID
   */
  async getScheduleById(
    id: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<ProductionSchedule>> {
    try {
      const response = await apiClient.get<ProductionSchedule>(
        `${BASE_URL}/${id}`,
        { params: { includeRelations } }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch schedule',
      };
    }
  },

  /**
   * Get schedule by schedule number
   */
  async getScheduleByNumber(
    scheduleNumber: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<ProductionSchedule>> {
    try {
      const response = await apiClient.get<ProductionSchedule>(
        `${BASE_URL}/number/${scheduleNumber}`,
        { params: { includeRelations } }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch schedule',
      };
    }
  },

  /**
   * Create new schedule
   */
  async createSchedule(data: CreateScheduleRequest): Promise<ApiResponse<ProductionSchedule>> {
    try {
      const response = await apiClient.post<ProductionSchedule>(BASE_URL, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create schedule',
      };
    }
  },

  /**
   * Update schedule
   */
  async updateSchedule(
    id: string,
    data: UpdateScheduleRequest
  ): Promise<ApiResponse<ProductionSchedule>> {
    try {
      const response = await apiClient.put<ProductionSchedule>(`${BASE_URL}/${id}`, data);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update schedule',
      };
    }
  },

  /**
   * Delete schedule
   */
  async deleteSchedule(id: string, hardDelete: boolean = false): Promise<ApiResponse<void>> {
    try {
      await apiClient.delete(`${BASE_URL}/${id}`, { params: { hardDelete } });
      return {
        success: true,
        data: undefined,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to delete schedule',
      };
    }
  },

  /**
   * Get schedules by state
   */
  async getSchedulesByState(state: string): Promise<ApiResponse<ProductionSchedule[]>> {
    try {
      const response = await apiClient.get<ProductionSchedule[]>(`${BASE_URL}/state/${state}`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch schedules by state',
      };
    }
  },
};

// ============================================
// SCHEDULE ENTRY OPERATIONS
// ============================================

export const scheduleEntryAPI = {
  /**
   * Get all entries for a schedule
   */
  async getScheduleEntries(
    scheduleId: string,
    includeConstraints: boolean = true
  ): Promise<ApiResponse<ScheduleEntry[]>> {
    try {
      const response = await apiClient.get<ScheduleEntry[]>(
        `${BASE_URL}/${scheduleId}/entries`,
        { params: { includeConstraints } }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch schedule entries',
      };
    }
  },

  /**
   * Add entry to schedule
   */
  async createScheduleEntry(
    scheduleId: string,
    data: CreateScheduleEntryRequest
  ): Promise<ApiResponse<ScheduleEntry>> {
    try {
      const response = await apiClient.post<ScheduleEntry>(
        `${BASE_URL}/${scheduleId}/entries`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create schedule entry',
      };
    }
  },

  /**
   * Update schedule entry
   */
  async updateScheduleEntry(
    entryId: string,
    data: UpdateScheduleEntryRequest
  ): Promise<ApiResponse<ScheduleEntry>> {
    try {
      const response = await apiClient.put<ScheduleEntry>(
        `${BASE_URL}/entries/${entryId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update schedule entry',
      };
    }
  },

  /**
   * Cancel schedule entry
   */
  async cancelScheduleEntry(
    entryId: string,
    reason: string,
    cancelledBy?: string
  ): Promise<ApiResponse<ScheduleEntry>> {
    try {
      const response = await apiClient.post<ScheduleEntry>(
        `${BASE_URL}/entries/${entryId}/cancel`,
        { reason, cancelledBy }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to cancel schedule entry',
      };
    }
  },

  /**
   * Get entries ready for dispatch
   */
  async getEntriesReadyForDispatch(siteId?: string): Promise<ApiResponse<ScheduleEntry[]>> {
    try {
      const response = await apiClient.get<ScheduleEntry[]>(
        `${BASE_URL}/dispatch/ready`,
        { params: { siteId } }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch dispatch-ready entries',
      };
    }
  },
};

// ============================================
// CONSTRAINT OPERATIONS
// ============================================

export const constraintAPI = {
  /**
   * Get all constraints for a schedule entry
   */
  async getEntryConstraints(entryId: string): Promise<ApiResponse<ScheduleConstraint[]>> {
    try {
      const response = await apiClient.get<ScheduleConstraint[]>(
        `${BASE_URL}/entries/${entryId}/constraints`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch constraints',
      };
    }
  },

  /**
   * Add constraint to schedule entry
   */
  async createConstraint(
    entryId: string,
    data: Partial<ScheduleConstraint>
  ): Promise<ApiResponse<ScheduleConstraint>> {
    try {
      const response = await apiClient.post<ScheduleConstraint>(
        `${BASE_URL}/entries/${entryId}/constraints`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to create constraint',
      };
    }
  },

  /**
   * Update constraint
   */
  async updateConstraint(
    constraintId: string,
    data: Partial<ScheduleConstraint>
  ): Promise<ApiResponse<ScheduleConstraint>> {
    try {
      const response = await apiClient.put<ScheduleConstraint>(
        `${BASE_URL}/constraints/${constraintId}`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to update constraint',
      };
    }
  },

  /**
   * Resolve constraint violation
   */
  async resolveConstraint(
    constraintId: string,
    resolvedBy: string,
    resolutionNotes: string
  ): Promise<ApiResponse<ScheduleConstraint>> {
    try {
      const response = await apiClient.post<ScheduleConstraint>(
        `${BASE_URL}/constraints/${constraintId}/resolve`,
        { resolvedBy, resolutionNotes }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to resolve constraint',
      };
    }
  },

  /**
   * Check constraint violation status
   */
  async checkConstraintViolation(
    constraintId: string
  ): Promise<ApiResponse<{ isViolated: boolean; violationSeverity: string; violationMessage: string }>> {
    try {
      const response = await apiClient.post<{
        isViolated: boolean;
        violationSeverity: string;
        violationMessage: string;
      }>(`${BASE_URL}/constraints/${constraintId}/check`);
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to check constraint violation',
      };
    }
  },
};

// ============================================
// STATE MANAGEMENT OPERATIONS
// ============================================

export const stateAPI = {
  /**
   * Transition schedule to new state
   */
  async transitionScheduleState(
    scheduleId: string,
    data: TransitionStateRequest
  ): Promise<ApiResponse<ScheduleStateHistory>> {
    try {
      const response = await apiClient.post<ScheduleStateHistory>(
        `${BASE_URL}/${scheduleId}/state/transition`,
        data
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to transition schedule state',
      };
    }
  },

  /**
   * Get state history for schedule
   */
  async getScheduleStateHistory(scheduleId: string): Promise<ApiResponse<ScheduleStateHistory[]>> {
    try {
      const response = await apiClient.get<ScheduleStateHistory[]>(
        `${BASE_URL}/${scheduleId}/state/history`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch state history',
      };
    }
  },
};

// ============================================
// SCHEDULING ALGORITHM OPERATIONS
// ============================================

export const sequencingAPI = {
  /**
   * Apply priority-based sequencing
   */
  async applyPrioritySequencing(
    scheduleId: string
  ): Promise<ApiResponse<{ message: string; entriesAffected: number }>> {
    try {
      const response = await apiClient.post<{ message: string; entriesAffected: number }>(
        `${BASE_URL}/${scheduleId}/sequencing/priority`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to apply priority sequencing',
      };
    }
  },

  /**
   * Apply Earliest Due Date (EDD) sequencing
   */
  async applyEDDSequencing(
    scheduleId: string
  ): Promise<ApiResponse<{ message: string; entriesAffected: number }>> {
    try {
      const response = await apiClient.post<{ message: string; entriesAffected: number }>(
        `${BASE_URL}/${scheduleId}/sequencing/edd`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to apply EDD sequencing',
      };
    }
  },

  /**
   * Check schedule feasibility
   */
  async checkScheduleFeasibility(scheduleId: string): Promise<ApiResponse<FeasibilityResult>> {
    try {
      const response = await apiClient.post<FeasibilityResult>(
        `${BASE_URL}/${scheduleId}/feasibility/check`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to check schedule feasibility',
      };
    }
  },
};

// ============================================
// DISPATCH OPERATIONS
// ============================================

export const dispatchAPI = {
  /**
   * Dispatch schedule entry (create work order)
   */
  async dispatchScheduleEntry(
    entryId: string,
    dispatchedBy: string
  ): Promise<ApiResponse<{ entry: ScheduleEntry; workOrder: any }>> {
    try {
      const response = await apiClient.post<{ entry: ScheduleEntry; workOrder: any }>(
        `${BASE_URL}/entries/${entryId}/dispatch`,
        { dispatchedBy }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to dispatch schedule entry',
      };
    }
  },

  /**
   * Dispatch all entries in schedule
   */
  async dispatchAllEntries(
    scheduleId: string,
    dispatchedBy: string
  ): Promise<ApiResponse<{ dispatchedCount: number; entries: any[] }>> {
    try {
      const response = await apiClient.post<{ dispatchedCount: number; entries: any[] }>(
        `${BASE_URL}/${scheduleId}/dispatch/all`,
        { dispatchedBy }
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to dispatch all entries',
      };
    }
  },
};

// ============================================
// STATISTICS & REPORTING
// ============================================

export const statisticsAPI = {
  /**
   * Get production scheduling statistics
   */
  async getStatistics(): Promise<ApiResponse<ScheduleStatistics>> {
    try {
      const response = await apiClient.get<ScheduleStatistics>(
        `${BASE_URL}/statistics/overview`
      );
      return {
        success: true,
        data: response.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.error || error.message || 'Failed to fetch statistics',
      };
    }
  },
};

// Export all APIs as a single object for convenience
export default {
  scheduling: schedulingAPI,
  entries: scheduleEntryAPI,
  constraints: constraintAPI,
  state: stateAPI,
  sequencing: sequencingAPI,
  dispatch: dispatchAPI,
  statistics: statisticsAPI,
};
