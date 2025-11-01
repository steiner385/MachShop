/**
 * Workflow Configuration API Layer
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 */

import axios from 'axios';
import { tokenUtils } from './auth';
import {
  SiteWorkflowConfiguration,
  RoutingWorkflowConfiguration,
  WorkOrderWorkflowConfiguration,
  EffectiveConfiguration,
  ConfigurationHistory,
  ConfigurationValidation,
  UpdateSiteConfigurationRequest,
  CreateRoutingOverrideRequest,
  CreateWorkOrderOverrideRequest,
  ApiResponse,
  PaginatedHistoryResponse,
} from '@/types/workflowConfiguration';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance for workflow configuration operations
const workflowConfigClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
workflowConfigClient.interceptors.request.use((config) => {
  const token = tokenUtils.getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
workflowConfigClient.interceptors.response.use(
  (response) => {
    // Handle both direct data and wrapped response
    return response.data.data || response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
      return Promise.reject(new Error('Authentication required'));
    }

    if (error.response?.status === 403) {
      throw new Error('Insufficient permissions to perform this action');
    }

    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }

    if (error.response?.data?.errors?.[0]) {
      throw new Error(error.response.data.errors[0]);
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message);
    }

    throw new Error(error.message || 'An unexpected error occurred');
  }
);

export const workflowConfigurationAPI = {
  // ==================== SITE CONFIGURATION ====================

  /**
   * Get site workflow configuration
   */
  getSiteConfiguration: async (siteId: string): Promise<SiteWorkflowConfiguration> => {
    return workflowConfigClient.get(`/sites/${siteId}/workflow-configuration`);
  },

  /**
   * Update site workflow configuration
   */
  updateSiteConfiguration: async (
    siteId: string,
    config: UpdateSiteConfigurationRequest
  ): Promise<SiteWorkflowConfiguration> => {
    return workflowConfigClient.put(`/sites/${siteId}/workflow-configuration`, config);
  },

  /**
   * Validate configuration before saving
   */
  validateConfiguration: async (config: any): Promise<ConfigurationValidation> => {
    return workflowConfigClient.post(`/configuration/validate`, config);
  },

  // ==================== EFFECTIVE CONFIGURATION ====================

  /**
   * Get effective configuration for a work order (with inheritance resolved)
   */
  getEffectiveConfiguration: async (workOrderId: string): Promise<EffectiveConfiguration> => {
    return workflowConfigClient.get(
      `/work-orders/${workOrderId}/effective-configuration`
    );
  },

  /**
   * Check if operation can be executed given workflow configuration
   */
  canExecuteOperation: async (
    workOrderId: string,
    operationId: string
  ): Promise<{ canExecute: boolean; reason?: string }> => {
    return workflowConfigClient.get(
      `/work-orders/${workOrderId}/can-execute-operation/${operationId}`
    );
  },

  /**
   * Check if data can be collected given workflow configuration
   */
  canCollectData: async (workOrderId: string): Promise<{ canCollect: boolean; reason?: string }> => {
    return workflowConfigClient.get(`/work-orders/${workOrderId}/can-collect-data`);
  },

  // ==================== ROUTING OVERRIDES ====================

  /**
   * Get routing override configuration
   */
  getRoutingOverride: async (routingId: string): Promise<RoutingWorkflowConfiguration> => {
    return workflowConfigClient.get(`/routings/${routingId}/workflow-configuration`);
  },

  /**
   * Create or update routing override
   */
  createRoutingOverride: async (
    routingId: string,
    override: CreateRoutingOverrideRequest
  ): Promise<RoutingWorkflowConfiguration> => {
    return workflowConfigClient.post(`/routings/${routingId}/workflow-configuration`, override);
  },

  /**
   * Delete routing override
   */
  deleteRoutingOverride: async (routingId: string): Promise<void> => {
    return workflowConfigClient.delete(`/routings/${routingId}/workflow-configuration`);
  },

  // ==================== WORK ORDER OVERRIDES ====================

  /**
   * Get work order override configuration
   */
  getWorkOrderOverride: async (
    workOrderId: string
  ): Promise<WorkOrderWorkflowConfiguration> => {
    return workflowConfigClient.get(
      `/work-orders/${workOrderId}/workflow-configuration`
    );
  },

  /**
   * Create or update work order override (requires approval)
   */
  createWorkOrderOverride: async (
    workOrderId: string,
    override: CreateWorkOrderOverrideRequest
  ): Promise<WorkOrderWorkflowConfiguration> => {
    return workflowConfigClient.post(
      `/work-orders/${workOrderId}/workflow-configuration`,
      override
    );
  },

  /**
   * Delete work order override
   */
  deleteWorkOrderOverride: async (workOrderId: string): Promise<void> => {
    return workflowConfigClient.delete(`/work-orders/${workOrderId}/workflow-configuration`);
  },

  // ==================== CONFIGURATION HISTORY ====================

  /**
   * Get site configuration change history
   */
  getSiteConfigurationHistory: async (
    siteId: string,
    limit: number = 50,
    page: number = 1
  ): Promise<PaginatedHistoryResponse> => {
    return workflowConfigClient.get(
      `/sites/${siteId}/workflow-configuration/history?limit=${limit}&page=${page}`
    );
  },

  /**
   * Get routing configuration change history
   */
  getRoutingConfigurationHistory: async (
    routingId: string,
    limit: number = 50,
    page: number = 1
  ): Promise<PaginatedHistoryResponse> => {
    return workflowConfigClient.get(
      `/routings/${routingId}/workflow-configuration/history?limit=${limit}&page=${page}`
    );
  },

  /**
   * Get work order configuration change history
   */
  getWorkOrderConfigurationHistory: async (
    workOrderId: string,
    limit: number = 50,
    page: number = 1
  ): Promise<PaginatedHistoryResponse> => {
    return workflowConfigClient.get(
      `/work-orders/${workOrderId}/workflow-configuration/history?limit=${limit}&page=${page}`
    );
  },
};
