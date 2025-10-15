import { apiClient } from './apiClient';

// Equipment Status
export type EquipmentStatus = 'OPERATIONAL' | 'MAINTENANCE' | 'DOWN';

// Equipment Entity
export interface Equipment {
  id: string;
  name: string;
  type: string;
  status: EquipmentStatus;
  lastMaintenanceDate: string | null;
  nextMaintenanceDate: string | null;
  utilizationRate: number;
  location?: string;
  model?: string;
  serialNumber?: string;
  createdAt: string;
  updatedAt: string;
}

// Equipment Statistics
export interface EquipmentStatistics {
  total: number;
  operational: number;
  maintenance: number;
  down: number;
  averageUtilization: number;
}

// Equipment Status History
export interface EquipmentStatusHistory {
  id: string;
  equipmentId: string;
  status: EquipmentStatus;
  notes?: string;
  recordedAt: string;
  recordedBy: string;
}

// Equipment List Response
export interface EquipmentListResponse {
  equipment: Equipment[];
  total: number;
  page: number;
  limit: number;
}

// Equipment Filters
export interface EquipmentFilters {
  status?: EquipmentStatus;
  type?: string;
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * Equipment API Service
 * Provides access to equipment management endpoints
 */
export const equipmentApi = {
  /**
   * Get list of equipment with optional filters
   */
  async getEquipment(filters?: EquipmentFilters): Promise<EquipmentListResponse> {
    const response = await apiClient.get<EquipmentListResponse>('/equipment', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get equipment by ID
   */
  async getEquipmentById(id: string): Promise<Equipment> {
    const response = await apiClient.get<Equipment>(`/equipment/${id}`);
    return response.data;
  },

  /**
   * Get equipment statistics (counts and averages)
   */
  async getStatistics(): Promise<EquipmentStatistics> {
    const response = await apiClient.get<EquipmentStatistics>('/equipment/statistics');
    return response.data;
  },

  /**
   * Get equipment status and current information
   */
  async getEquipmentStatus(id: string): Promise<{
    status: EquipmentStatus;
    utilizationRate: number;
    lastMaintenanceDate: string | null;
    nextMaintenanceDate: string | null;
  }> {
    const response = await apiClient.get(`/equipment/${id}/status`);
    return response.data;
  },

  /**
   * Get equipment status history
   */
  async getStatusHistory(id: string): Promise<EquipmentStatusHistory[]> {
    const response = await apiClient.get<EquipmentStatusHistory[]>(`/equipment/${id}/history`);
    return response.data;
  },

  /**
   * Update equipment status
   */
  async updateStatus(
    id: string,
    status: EquipmentStatus,
    notes?: string
  ): Promise<Equipment> {
    const response = await apiClient.post<Equipment>(`/equipment/${id}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  /**
   * Schedule equipment maintenance
   */
  async scheduleMaintenance(
    id: string,
    maintenanceDate: string,
    notes?: string
  ): Promise<Equipment> {
    const response = await apiClient.post<Equipment>(`/equipment/${id}/maintenance`, {
      maintenanceDate,
      notes,
    });
    return response.data;
  },
};
