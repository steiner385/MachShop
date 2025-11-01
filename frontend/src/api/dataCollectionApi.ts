/**
 * Data Collection API (Issue #45)
 * Client for communicating with data collection backend
 */

import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// ============================================================================
// Type Definitions
// ============================================================================

export interface DataCollectionFormDTO {
  id: string;
  routingOperationId: string;
  formName: string;
  description?: string;
  version: string;
  fields: any[];
  requiredForCompletion: boolean;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string;
}

export interface DataCollectionSubmissionDTO {
  id: string;
  workOrderOperationId: string;
  formId: string;
  data: Record<string, any>;
  validationStatus: string;
  validationErrors?: any[];
  submittedBy: string;
  submittedAt: string;
  deviceInfo?: string;
  locationCode?: string;
  offlineSubmitted: boolean;
  syncedAt?: string;
  syncStatus: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{ fieldId: string; fieldName: string; error: string }>;
  warnings: string[];
}

// ============================================================================
// Data Collection API Service
// ============================================================================

class DataCollectionApiService {
  private baseUrl = `${API_BASE_URL}/data-collection`;

  /**
   * Get all data collection forms for a routing operation
   */
  async getDataCollectionForms(routingOperationId: string): Promise<DataCollectionFormDTO[]> {
    try {
      const response = await axios.get(`${this.baseUrl}/operations/${routingOperationId}/forms`);
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching data collection forms:', error);
      throw error;
    }
  }

  /**
   * Get a specific data collection form
   */
  async getDataCollectionForm(formId: string): Promise<DataCollectionFormDTO | null> {
    try {
      const response = await axios.get(`${this.baseUrl}/forms/${formId}`);
      return response.data.data || null;
    } catch (error) {
      if ((error as any)?.response?.status === 404) {
        return null;
      }
      console.error('Error fetching data collection form:', error);
      throw error;
    }
  }

  /**
   * Create a new data collection form
   */
  async createDataCollectionForm(
    routingOperationId: string,
    formData: Partial<DataCollectionFormDTO>
  ): Promise<DataCollectionFormDTO> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/operations/${routingOperationId}/forms`,
        formData
      );
      return response.data.data;
    } catch (error) {
      console.error('Error creating data collection form:', error);
      throw error;
    }
  }

  /**
   * Update a data collection form
   */
  async updateDataCollectionForm(
    formId: string,
    formData: Partial<DataCollectionFormDTO>
  ): Promise<DataCollectionFormDTO> {
    try {
      const response = await axios.put(`${this.baseUrl}/forms/${formId}`, formData);
      return response.data.data;
    } catch (error) {
      console.error('Error updating data collection form:', error);
      throw error;
    }
  }

  /**
   * Delete a data collection form
   */
  async deleteDataCollectionForm(formId: string): Promise<void> {
    try {
      await axios.delete(`${this.baseUrl}/forms/${formId}`);
    } catch (error) {
      console.error('Error deleting data collection form:', error);
      throw error;
    }
  }

  /**
   * Submit collected data
   */
  async submitDataCollection(
    operationId: string,
    submissionData: {
      formId: string;
      data: Record<string, any>;
      deviceInfo?: string;
      locationCode?: string;
      notes?: string;
      offlineSubmitted?: boolean;
    }
  ): Promise<DataCollectionSubmissionDTO> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/operations/${operationId}/submit`,
        submissionData
      );
      return response.data.data;
    } catch (error) {
      console.error('Error submitting data collection:', error);
      throw error;
    }
  }

  /**
   * Validate data against form schema
   */
  async validateDataCollection(
    formId: string,
    data: Record<string, any>
  ): Promise<ValidationResult> {
    try {
      const response = await axios.post(`${this.baseUrl}/forms/${formId}/validate`, { data });
      return response.data.data;
    } catch (error) {
      console.error('Error validating data collection:', error);
      throw error;
    }
  }

  /**
   * Get submission history for an operation
   */
  async getSubmissionHistory(
    operationId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<{
    submissions: DataCollectionSubmissionDTO[];
    pagination: {
      limit: number;
      offset: number;
      total: number;
      hasMore: boolean;
    };
  }> {
    try {
      const params = new URLSearchParams();
      if (options?.limit) params.append('limit', options.limit.toString());
      if (options?.offset) params.append('offset', options.offset.toString());

      const response = await axios.get(
        `${this.baseUrl}/operations/${operationId}/submissions?${params.toString()}`
      );
      return response.data;
    } catch (error) {
      console.error('Error fetching submission history:', error);
      throw error;
    }
  }

  /**
   * Sync pending offline submissions
   */
  async syncOfflineSubmissions(submissions: any[]): Promise<{
    synced: number;
    failed: number;
    results: any[];
  }> {
    try {
      const response = await axios.post(`${this.baseUrl}/sync`, {
        pendingSubmissions: submissions,
      });
      return response.data.data;
    } catch (error) {
      console.error('Error syncing offline submissions:', error);
      throw error;
    }
  }

  /**
   * Track work instruction view
   */
  async trackWorkInstructionView(
    instructionId: string,
    viewData: {
      workOrderOperationId?: string;
      viewDuration?: number;
      stepsViewed?: number[];
      deviceType?: string;
      deviceId?: string;
    }
  ): Promise<void> {
    try {
      await axios.post(`${this.baseUrl}/work-instructions/${instructionId}/view`, viewData);
    } catch (error) {
      // Non-critical, don't throw
      console.warn('Error tracking work instruction view:', error);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data.success === true;
    } catch (error) {
      return false;
    }
  }
}

export const dataCollectionApi = new DataCollectionApiService();

export default dataCollectionApi;
