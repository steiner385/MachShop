/**
 * Personnel Management API
 * Phase 2: Personnel Management Enhancements
 */

import { apiClient, ApiResponse } from './client';
import { Personnel, PersonnelQueryParams } from '@/types/personnel';

const BASE_URL = '/api/v1/personnel';

export const personnelAPI = {
  /**
   * Get all personnel with optional filters
   */
  async getAllPersonnel(params?: PersonnelQueryParams): Promise<ApiResponse<Personnel[]>> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Personnel[] }>(
        BASE_URL,
        { params }
      );
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch personnel',
      };
    }
  },

  /**
   * Get personnel by ID
   */
  async getPersonnelById(id: string): Promise<ApiResponse<Personnel>> {
    try {
      const response = await apiClient.get<{ success: boolean; data: Personnel }>(
        `${BASE_URL}/${id}`
      );
      return {
        success: true,
        data: response.data.data,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to fetch personnel',
      };
    }
  },
};

export default personnelAPI;
