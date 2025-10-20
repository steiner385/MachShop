/**
 * Materials API Client
 * Phase 3: Material Movement Tracking API Integration
 */

import { apiClient, ApiResponse } from './client';
import {
  MaterialDefinition,
  MaterialLot,
  MaterialClass,
  MaterialTransaction,
  MaterialStatistics,
  MaterialQueryParams,
  MaterialLotQueryParams,
  MaterialTransactionQueryParams,
} from '@/types/materials';

const BASE_URL = '/materials';

// ============================================
// MATERIAL CLASS API
// ============================================

export const materialClassAPI = {
  /**
   * Get all material classes
   */
  async getAllClasses(includeRelations: boolean = false): Promise<ApiResponse<MaterialClass[]>> {
    try {
      const response = await apiClient.get<MaterialClass[]>(`${BASE_URL}/classes`, {
        params: { includeRelations },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material classes',
      };
    }
  },

  /**
   * Get material class by ID
   */
  async getClassById(
    id: string,
    includeRelations: boolean = false
  ): Promise<ApiResponse<MaterialClass>> {
    try {
      const response = await apiClient.get<MaterialClass>(`${BASE_URL}/classes/${id}`, {
        params: { includeRelations },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material class',
      };
    }
  },

  /**
   * Get material class hierarchy
   */
  async getClassHierarchy(id: string): Promise<ApiResponse<MaterialClass[]>> {
    try {
      const response = await apiClient.get<MaterialClass[]>(`${BASE_URL}/classes/${id}/hierarchy`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch class hierarchy',
      };
    }
  },

  /**
   * Get child material classes
   */
  async getChildClasses(id: string): Promise<ApiResponse<MaterialClass[]>> {
    try {
      const response = await apiClient.get<MaterialClass[]>(`${BASE_URL}/classes/${id}/children`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch child classes',
      };
    }
  },
};

// ============================================
// MATERIAL DEFINITION API
// ============================================

export const materialDefinitionAPI = {
  /**
   * Get all material definitions
   */
  async getAllDefinitions(params?: MaterialQueryParams): Promise<ApiResponse<MaterialDefinition[]>> {
    try {
      const response = await apiClient.get<MaterialDefinition[]>(`${BASE_URL}/definitions`, {
        params,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material definitions',
      };
    }
  },

  /**
   * Get material definition by ID
   */
  async getDefinitionById(
    id: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<MaterialDefinition>> {
    try {
      const response = await apiClient.get<MaterialDefinition>(`${BASE_URL}/definitions/${id}`, {
        params: { includeRelations },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material definition',
      };
    }
  },

  /**
   * Get material definition by material number
   */
  async getDefinitionByNumber(
    materialNumber: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<MaterialDefinition>> {
    try {
      const response = await apiClient.get<MaterialDefinition>(
        `${BASE_URL}/definitions/number/${materialNumber}`,
        { params: { includeRelations } }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material by number',
      };
    }
  },
};

// ============================================
// MATERIAL LOT API
// ============================================

export const materialLotAPI = {
  /**
   * Get all material lots
   */
  async getAllLots(params?: MaterialLotQueryParams): Promise<ApiResponse<MaterialLot[]>> {
    try {
      const response = await apiClient.get<MaterialLot[]>(`${BASE_URL}/lots`, { params });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material lots',
      };
    }
  },

  /**
   * Get material lot by ID
   */
  async getLotById(
    id: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<MaterialLot>> {
    try {
      const response = await apiClient.get<MaterialLot>(`${BASE_URL}/lots/${id}`, {
        params: { includeRelations },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material lot',
      };
    }
  },

  /**
   * Get material lot by lot number
   */
  async getLotByNumber(
    lotNumber: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<MaterialLot>> {
    try {
      const response = await apiClient.get<MaterialLot>(`${BASE_URL}/lots/number/${lotNumber}`, {
        params: { includeRelations },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch lot by number',
      };
    }
  },

  /**
   * Get expiring lots
   */
  async getExpiringSoon(days: number = 30): Promise<ApiResponse<MaterialLot[]>> {
    try {
      const response = await apiClient.get<MaterialLot[]>(`${BASE_URL}/lots/expiring/soon`, {
        params: { days },
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch expiring lots',
      };
    }
  },

  /**
   * Get expired lots
   */
  async getExpired(): Promise<ApiResponse<MaterialLot[]>> {
    try {
      const response = await apiClient.get<MaterialLot[]>(`${BASE_URL}/lots/expired/all`);
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch expired lots',
      };
    }
  },

  /**
   * Get lot statistics
   */
  async getLotStatistics(): Promise<ApiResponse<MaterialStatistics>> {
    try {
      const response = await apiClient.get<MaterialStatistics>(
        `${BASE_URL}/lots/statistics/summary`
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch lot statistics',
      };
    }
  },
};

// ============================================
// MATERIAL TRANSACTION API
// ============================================

export const materialTransactionAPI = {
  /**
   * Get all material transactions
   */
  async getAllTransactions(
    params?: MaterialTransactionQueryParams
  ): Promise<ApiResponse<MaterialTransaction[]>> {
    try {
      const response = await apiClient.get<MaterialTransaction[]>(`${BASE_URL}/transactions`, {
        params,
      });
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error:
          error.response?.data?.message || error.message || 'Failed to fetch material transactions',
      };
    }
  },

  /**
   * Get material transaction by ID
   */
  async getTransactionById(
    id: string,
    includeRelations: boolean = true
  ): Promise<ApiResponse<MaterialTransaction>> {
    try {
      const response = await apiClient.get<MaterialTransaction>(
        `${BASE_URL}/transactions/${id}`,
        {
          params: { includeRelations },
        }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch transaction',
      };
    }
  },

  /**
   * Get transactions by material ID
   */
  async getTransactionsByMaterial(
    materialId: string,
    params?: MaterialTransactionQueryParams
  ): Promise<ApiResponse<MaterialTransaction[]>> {
    try {
      const response = await apiClient.get<MaterialTransaction[]>(
        `${BASE_URL}/transactions/material/${materialId}`,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch material transactions',
      };
    }
  },

  /**
   * Get transactions by lot ID
   */
  async getTransactionsByLot(
    lotId: string,
    params?: MaterialTransactionQueryParams
  ): Promise<ApiResponse<MaterialTransaction[]>> {
    try {
      const response = await apiClient.get<MaterialTransaction[]>(
        `${BASE_URL}/transactions/lot/${lotId}`,
        { params }
      );
      return { success: true, data: response.data };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch lot transactions',
      };
    }
  },
};

// ============================================
// COMBINED/UTILITY API
// ============================================

/**
 * Get materials overview dashboard data
 */
export async function getMaterialsDashboard(): Promise<
  ApiResponse<{
    statistics: MaterialStatistics;
    recentTransactions: MaterialTransaction[];
    expiringSoon: MaterialLot[];
    lowStock: MaterialDefinition[];
  }>
> {
  try {
    const [statisticsRes, expiringSoonRes] = await Promise.all([
      materialLotAPI.getLotStatistics(),
      materialLotAPI.getExpiringSoon(30),
    ]);

    if (!statisticsRes.success) {
      return { success: false, error: statisticsRes.error };
    }

    return {
      success: true,
      data: {
        statistics: statisticsRes.data!,
        recentTransactions: [], // TODO: Implement when backend endpoint is available
        expiringSoon: expiringSoonRes.success ? expiringSoonRes.data! : [],
        lowStock: [], // TODO: Implement when backend endpoint is available
      },
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Failed to fetch materials dashboard data',
    };
  }
}
