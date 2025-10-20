/**
 * Equipment API Client
 * Phase 3: Equipment Maintenance Scheduling API Integration
 */

import { apiClient, ApiResponse } from './client';
import {
  Equipment,
  MaintenanceRecord,
  EquipmentStateHistory,
  EquipmentStatistics,
  OEEMetrics,
  OEEDashboardData,
  EquipmentQueryParams,
  MaintenanceQueryParams,
} from '@/types/equipment';

const BASE_URL = '/equipment';

// ============================================
// EQUIPMENT API
// ============================================

export const equipmentAPI = {
  /**
   * Get all equipment
   */
  async getAllEquipment(params?: EquipmentQueryParams): Promise<ApiResponse<Equipment[]>> {
    try {
      const response = await apiClient.get<Equipment[]>(BASE_URL, { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment',
      };
    }
  },

  /**
   * Get equipment by ID
   */
  async getEquipmentById(
    id: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<Equipment>> {
    try {
      const response = await apiClient.get<Equipment>(`${BASE_URL}/${id}`, {
        params: { includeRelations },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment',
      };
    }
  },

  /**
   * Get equipment by equipment number
   */
  async getEquipmentByNumber(
    equipmentNumber: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<Equipment>> {
    try {
      const response = await apiClient.get<Equipment>(
        `${BASE_URL}/number/${equipmentNumber}`,
        { params: { includeRelations } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment by number',
      };
    }
  },

  /**
   * Get equipment hierarchy
   */
  async getEquipmentHierarchy(id: string): Promise<ApiResponse<Equipment[]>> {
    try {
      const response = await apiClient.get<Equipment[]>(`${BASE_URL}/${id}/hierarchy`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment hierarchy',
      };
    }
  },

  /**
   * Get child equipment
   */
  async getChildEquipment(id: string): Promise<ApiResponse<Equipment[]>> {
    try {
      const response = await apiClient.get<Equipment[]>(`${BASE_URL}/${id}/children`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch child equipment',
      };
    }
  },

  /**
   * Get equipment by site
   */
  async getEquipmentBySite(siteId: string): Promise<ApiResponse<Equipment[]>> {
    try {
      const response = await apiClient.get<Equipment[]>(`${BASE_URL}/site/${siteId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment by site',
      };
    }
  },

  /**
   * Get equipment by area
   */
  async getEquipmentByArea(areaId: string): Promise<ApiResponse<Equipment[]>> {
    try {
      const response = await apiClient.get<Equipment[]>(`${BASE_URL}/area/${areaId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment by area',
      };
    }
  },

  /**
   * Get equipment by work center
   */
  async getEquipmentByWorkCenter(workCenterId: string): Promise<ApiResponse<Equipment[]>> {
    try {
      const response = await apiClient.get<Equipment[]>(`${BASE_URL}/workcenter/${workCenterId}`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment by work center',
      };
    }
  },

  /**
   * Get equipment statistics
   */
  async getEquipmentStatistics(): Promise<ApiResponse<EquipmentStatistics>> {
    try {
      const response = await apiClient.get<EquipmentStatistics>(`${BASE_URL}/statistics/summary`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment statistics',
      };
    }
  },
};

// ============================================
// MAINTENANCE API
// ============================================

export const maintenanceAPI = {
  /**
   * Get all maintenance records
   */
  async getAllMaintenance(params?: MaintenanceQueryParams): Promise<ApiResponse<MaintenanceRecord[]>> {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>(`${BASE_URL}/maintenance`, {
        params,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch maintenance records',
      };
    }
  },

  /**
   * Get maintenance record by ID
   */
  async getMaintenanceById(
    id: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<MaintenanceRecord>> {
    try {
      const response = await apiClient.get<MaintenanceRecord>(
        `${BASE_URL}/maintenance/${id}`,
        { params: { includeRelations } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch maintenance record',
      };
    }
  },

  /**
   * Get maintenance records by equipment ID
   */
  async getMaintenanceByEquipment(
    equipmentId: string,
    params?: MaintenanceQueryParams
  ): Promise<ApiResponse<MaintenanceRecord[]>> {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>(
        `${BASE_URL}/maintenance/equipment/${equipmentId}`,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch equipment maintenance records',
      };
    }
  },

  /**
   * Get scheduled maintenance
   */
  async getScheduledMaintenance(
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<MaintenanceRecord[]>> {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>(
        `${BASE_URL}/maintenance/scheduled`,
        { params: { startDate, endDate } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch scheduled maintenance',
      };
    }
  },

  /**
   * Get overdue maintenance
   */
  async getOverdueMaintenance(): Promise<ApiResponse<MaintenanceRecord[]>> {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>(`${BASE_URL}/maintenance/overdue`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch overdue maintenance',
      };
    }
  },

  /**
   * Get upcoming maintenance
   */
  async getUpcomingMaintenance(days: number = 30): Promise<ApiResponse<MaintenanceRecord[]>> {
    try {
      const response = await apiClient.get<MaintenanceRecord[]>(
        `${BASE_URL}/maintenance/upcoming`,
        { params: { days } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch upcoming maintenance',
      };
    }
  },

  /**
   * Create maintenance record
   */
  async createMaintenance(
    data: Partial<MaintenanceRecord>
  ): Promise<ApiResponse<MaintenanceRecord>> {
    try {
      const response = await apiClient.post<MaintenanceRecord>(`${BASE_URL}/maintenance`, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to create maintenance record',
      };
    }
  },

  /**
   * Update maintenance record
   */
  async updateMaintenance(
    id: string,
    data: Partial<MaintenanceRecord>
  ): Promise<ApiResponse<MaintenanceRecord>> {
    try {
      const response = await apiClient.put<MaintenanceRecord>(`${BASE_URL}/maintenance/${id}`, data);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update maintenance record',
      };
    }
  },

  /**
   * Complete maintenance record
   */
  async completeMaintenance(
    id: string,
    data: { completedDate: string; performedBy?: string; notes?: string; duration?: number; cost?: number }
  ): Promise<ApiResponse<MaintenanceRecord>> {
    try {
      const response = await apiClient.post<MaintenanceRecord>(
        `${BASE_URL}/maintenance/${id}/complete`,
        data
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to complete maintenance record',
      };
    }
  },

  /**
   * Cancel maintenance record
   */
  async cancelMaintenance(
    id: string,
    reason?: string
  ): Promise<ApiResponse<MaintenanceRecord>> {
    try {
      const response = await apiClient.post<MaintenanceRecord>(
        `${BASE_URL}/maintenance/${id}/cancel`,
        { reason }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to cancel maintenance record',
      };
    }
  },
};

// ============================================
// OEE API
// ============================================

export const oeeAPI = {
  /**
   * Get OEE metrics for equipment
   */
  async getOEEMetrics(
    equipmentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<OEEMetrics>> {
    try {
      const response = await apiClient.get<OEEMetrics>(`${BASE_URL}/${equipmentId}/oee`, {
        params: { startDate, endDate },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch OEE metrics',
      };
    }
  },

  /**
   * Get OEE history for equipment
   */
  async getOEEHistory(
    equipmentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<OEEMetrics[]>> {
    try {
      const response = await apiClient.get<OEEMetrics[]>(
        `${BASE_URL}/${equipmentId}/oee/history`,
        { params: { startDate, endDate } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch OEE history',
      };
    }
  },

  /**
   * Get OEE summary for all equipment
   */
  async getOEESummary(
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<{ equipmentId: string; equipmentNumber: string; equipmentName: string; oee: OEEMetrics }[]>> {
    try {
      const response = await apiClient.get(`${BASE_URL}/oee/summary`, {
        params: { startDate, endDate },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch OEE summary',
      };
    }
  },
};

// ============================================
// EQUIPMENT STATE HISTORY API
// ============================================

export const equipmentStateAPI = {
  /**
   * Get state history for equipment
   */
  async getStateHistory(
    equipmentId: string,
    startDate?: string,
    endDate?: string
  ): Promise<ApiResponse<EquipmentStateHistory[]>> {
    try {
      const response = await apiClient.get<EquipmentStateHistory[]>(
        `${BASE_URL}/${equipmentId}/state/history`,
        { params: { startDate, endDate } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch state history',
      };
    }
  },

  /**
   * Update equipment state
   */
  async updateEquipmentState(
    equipmentId: string,
    data: { newState: string; reason?: string; changedBy?: string }
  ): Promise<ApiResponse<Equipment>> {
    try {
      const response = await apiClient.post<Equipment>(
        `${BASE_URL}/${equipmentId}/state`,
        data
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to update equipment state',
      };
    }
  },
};

// ============================================
// COMBINED/UTILITY API
// ============================================

/**
 * Get equipment dashboard data
 */
export async function getEquipmentDashboard(): Promise<
  ApiResponse<{
    statistics: EquipmentStatistics;
    upcomingMaintenance: MaintenanceRecord[];
    overdueMaintenance: MaintenanceRecord[];
    criticalEquipment: Equipment[];
  }>
> {
  try {
    const [statisticsRes, upcomingRes, overdueRes] = await Promise.all([
      equipmentAPI.getEquipmentStatistics(),
      maintenanceAPI.getUpcomingMaintenance(30),
      maintenanceAPI.getOverdueMaintenance(),
    ]);

    if (!statisticsRes.success) {
      return { success: false, error: statisticsRes.error };
    }

    return {
      success: true,
      data: {
        statistics: statisticsRes.data!,
        upcomingMaintenance: upcomingRes.success ? upcomingRes.data! : [],
        overdueMaintenance: overdueRes.success ? overdueRes.data! : [],
        criticalEquipment: [], // TODO: Implement when backend endpoint is available
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch equipment dashboard data',
    };
  }
}

/**
 * Get maintenance calendar data
 */
export async function getMaintenanceCalendar(
  startDate: string,
  endDate: string
): Promise<ApiResponse<MaintenanceRecord[]>> {
  try {
    const response = await maintenanceAPI.getScheduledMaintenance(startDate, endDate);
    return response;
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch maintenance calendar data',
    };
  }
}

/**
 * Get OEE dashboard data - aggregated metrics for all equipment
 */
export async function getOEEDashboard(params?: {
  equipmentClass?: string;
  siteId?: string;
  areaId?: string;
  limit?: number;
}): Promise<ApiResponse<OEEDashboardData>> {
  try {
    const response = await apiClient.get<OEEDashboardData>(`${BASE_URL}/oee/dashboard`, {
      params,
    });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to fetch OEE dashboard data',
    };
  }
}
