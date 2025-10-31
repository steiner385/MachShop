/**
 * Andon API Service
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 *
 * API client for Andon system operations
 */

import axios from 'axios';
import type {
  AndonAlert,
  AndonIssueType,
  AndonEscalationRule,
  AndonSystemStats,
  AndonAlertFilters,
  PaginationOptions,
  AndonAlertListResult,
  CreateAndonAlertData,
  UpdateAndonAlertData,
  AndonConfiguration,
  AndonSiteConfiguration
} from '@/types/andon';

const API_BASE_URL = '/api/v1/andon';
const CONFIG_API_BASE_URL = '/api/v1/andon/config';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

const configApiClient = axios.create({
  baseURL: CONFIG_API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor for auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

configApiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
const responseInterceptor = (response: any) => {
  return response.data.success ? response.data.data : response.data;
};

const errorInterceptor = (error: any) => {
  const message = error.response?.data?.message || error.message || 'An error occurred';
  throw new Error(message);
};

apiClient.interceptors.response.use(responseInterceptor, errorInterceptor);
configApiClient.interceptors.response.use(responseInterceptor, errorInterceptor);

// Alert Operations
export const andonApi = {
  // ============================================================================
  // ALERT MANAGEMENT
  // ============================================================================

  /**
   * Get alerts with filtering and pagination
   */
  async getAlerts(params?: AndonAlertFilters & PaginationOptions): Promise<AndonAlertListResult> {
    const response = await apiClient.get('/alerts', { params });
    return response;
  },

  /**
   * Get specific alert by ID
   */
  async getAlert(id: string, includeRelations = false): Promise<AndonAlert> {
    const response = await apiClient.get(`/alerts/${id}`, {
      params: { include: includeRelations ? 'true' : 'false' }
    });
    return response;
  },

  /**
   * Create new alert
   */
  async createAlert(data: CreateAndonAlertData): Promise<AndonAlert> {
    const response = await apiClient.post('/alerts', data);
    return response;
  },

  /**
   * Update alert
   */
  async updateAlert(id: string, data: UpdateAndonAlertData): Promise<AndonAlert> {
    const response = await apiClient.put(`/alerts/${id}`, data);
    return response;
  },

  /**
   * Close alert
   */
  async closeAlert(id: string, closeData: {
    resolutionNotes?: string;
    resolutionActionTaken?: string;
  }): Promise<AndonAlert> {
    const response = await apiClient.post(`/alerts/${id}/close`, closeData);
    return response;
  },

  /**
   * Manually escalate alert
   */
  async escalateAlert(id: string): Promise<any> {
    const response = await apiClient.post(`/alerts/${id}/escalate`);
    return response;
  },

  // ============================================================================
  // ISSUE TYPE MANAGEMENT
  // ============================================================================

  /**
   * Get issue types
   */
  async getIssueTypes(params?: {
    siteId?: string;
    activeOnly?: boolean;
  }): Promise<AndonIssueType[]> {
    const response = await apiClient.get('/issue-types', { params });
    return response;
  },

  /**
   * Get specific issue type by ID
   */
  async getIssueType(id: string, includeRelations = false): Promise<AndonIssueType> {
    const response = await apiClient.get(`/issue-types/${id}`, {
      params: { include: includeRelations ? 'true' : 'false' }
    });
    return response;
  },

  /**
   * Create issue type
   */
  async createIssueType(data: any): Promise<AndonIssueType> {
    const response = await apiClient.post('/issue-types', data);
    return response;
  },

  /**
   * Update issue type
   */
  async updateIssueType(id: string, data: any): Promise<AndonIssueType> {
    const response = await apiClient.put(`/issue-types/${id}`, data);
    return response;
  },

  // ============================================================================
  // ESCALATION RULE MANAGEMENT
  // ============================================================================

  /**
   * Get escalation rules
   */
  async getEscalationRules(params?: {
    siteId?: string;
    issueTypeId?: string;
    activeOnly?: boolean;
  }): Promise<AndonEscalationRule[]> {
    const response = await apiClient.get('/escalation-rules', { params });
    return response;
  },

  /**
   * Get specific escalation rule by ID
   */
  async getEscalationRule(id: string, includeRelations = false): Promise<AndonEscalationRule> {
    const response = await apiClient.get(`/escalation-rules/${id}`, {
      params: { include: includeRelations ? 'true' : 'false' }
    });
    return response;
  },

  /**
   * Create escalation rule
   */
  async createEscalationRule(data: any): Promise<AndonEscalationRule> {
    const response = await apiClient.post('/escalation-rules', data);
    return response;
  },

  /**
   * Update escalation rule
   */
  async updateEscalationRule(id: string, data: any): Promise<AndonEscalationRule> {
    const response = await apiClient.put(`/escalation-rules/${id}`, data);
    return response;
  },

  /**
   * Test escalation rule
   */
  async testEscalationRule(ruleId: string, alertId: string): Promise<any> {
    const response = await apiClient.post(`/escalation-rules/${ruleId}/test`, { alertId });
    return response;
  },

  // ============================================================================
  // SYSTEM OPERATIONS
  // ============================================================================

  /**
   * Get system statistics
   */
  async getSystemStats(params?: {
    siteId?: string;
    dateRange?: { from: Date; to: Date };
  }): Promise<AndonSystemStats> {
    const queryParams: any = {};
    if (params?.siteId) queryParams.siteId = params.siteId;
    if (params?.dateRange) {
      queryParams.from = params.dateRange.from.toISOString();
      queryParams.to = params.dateRange.to.toISOString();
    }

    const response = await apiClient.get('/stats', { params: queryParams });
    return response;
  },

  /**
   * Get escalation statistics
   */
  async getEscalationStats(params?: {
    siteId?: string;
    dateRange?: { from: Date; to: Date };
  }): Promise<any> {
    const queryParams: any = {};
    if (params?.siteId) queryParams.siteId = params.siteId;
    if (params?.dateRange) {
      queryParams.from = params.dateRange.from.toISOString();
      queryParams.to = params.dateRange.to.toISOString();
    }

    const response = await apiClient.get('/escalation-stats', { params: queryParams });
    return response;
  },

  /**
   * Get overdue alerts
   */
  async getOverdueAlerts(params?: { siteId?: string }): Promise<AndonAlert[]> {
    const response = await apiClient.get('/overdue-alerts', { params });
    return response;
  },

  /**
   * Manually process escalations
   */
  async processEscalations(params?: { siteId?: string }): Promise<any> {
    const response = await apiClient.post('/process-escalations', {}, { params });
    return response;
  },

  // ============================================================================
  // CONFIGURATION MANAGEMENT
  // ============================================================================

  /**
   * Get global configurations
   */
  async getGlobalConfigurations(params?: {
    category?: string;
    activeOnly?: boolean;
  }): Promise<AndonConfiguration[]> {
    const response = await configApiClient.get('/', { params });
    return response;
  },

  /**
   * Get specific configuration value
   */
  async getConfiguration(key: string, siteId?: string): Promise<any> {
    const response = await configApiClient.get(`/${key}`, {
      params: siteId ? { siteId } : undefined
    });
    return response;
  },

  /**
   * Set global configuration
   */
  async setGlobalConfiguration(data: any): Promise<AndonConfiguration> {
    const response = await configApiClient.post('/', data);
    return response;
  },

  /**
   * Set multiple global configurations
   */
  async setBulkGlobalConfigurations(configurations: any[]): Promise<AndonConfiguration[]> {
    const response = await configApiClient.post('/bulk', { configurations });
    return response;
  },

  /**
   * Delete global configuration
   */
  async deleteGlobalConfiguration(key: string): Promise<void> {
    await configApiClient.delete(`/${key}`);
  },

  /**
   * Get site configurations
   */
  async getSiteConfigurations(siteId: string, params?: {
    activeOnly?: boolean;
  }): Promise<AndonSiteConfiguration[]> {
    const response = await configApiClient.get(`/sites/${siteId}`, { params });
    return response;
  },

  /**
   * Set site configuration
   */
  async setSiteConfiguration(data: any): Promise<AndonSiteConfiguration> {
    const response = await configApiClient.post('/sites', data);
    return response;
  },

  /**
   * Set multiple site configurations
   */
  async setBulkSiteConfigurations(siteId: string, configurations: any[]): Promise<AndonSiteConfiguration[]> {
    const response = await configApiClient.post('/sites/bulk', { siteId, configurations });
    return response;
  },

  /**
   * Delete site configuration
   */
  async deleteSiteConfiguration(siteId: string, key: string): Promise<void> {
    await configApiClient.delete(`/sites/${siteId}/${key}`);
  },

  /**
   * Get notification templates
   */
  async getNotificationTemplates(params?: {
    siteId?: string;
    activeOnly?: boolean;
  }): Promise<any[]> {
    const response = await configApiClient.get('/notification-templates', { params });
    return response;
  },

  /**
   * Create notification template
   */
  async createNotificationTemplate(data: any): Promise<any> {
    const response = await configApiClient.post('/notification-templates', data);
    return response;
  },

  /**
   * Get notification template
   */
  async getNotificationTemplate(id: string): Promise<any> {
    const response = await configApiClient.get(`/notification-templates/${id}`);
    return response;
  },

  /**
   * Update notification template
   */
  async updateNotificationTemplate(id: string, data: any): Promise<any> {
    const response = await configApiClient.put(`/notification-templates/${id}`, data);
    return response;
  },

  /**
   * Get system settings
   */
  async getSystemSettings(params?: { siteId?: string }): Promise<any[]> {
    const response = await configApiClient.get('/system-settings', { params });
    return response;
  },

  /**
   * Update system settings
   */
  async updateSystemSettings(data: any): Promise<any> {
    const response = await configApiClient.post('/system-settings', data);
    return response;
  },

  /**
   * Validate configuration changes
   */
  async validateConfigurations(configurations: any[], siteId?: string): Promise<any> {
    const response = await configApiClient.post('/validate', {
      configurations,
      siteId
    });
    return response;
  },

  /**
   * Export configuration
   */
  async exportConfiguration(params?: {
    siteId?: string;
    includeGlobal?: boolean;
  }): Promise<any> {
    const response = await configApiClient.get('/export', { params });
    return response;
  }
};

// Helper functions for common operations
export const andonHelpers = {
  /**
   * Build alert filters for common queries
   */
  buildActiveAlertsFilter: (siteId?: string): AndonAlertFilters => ({
    status: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'],
    ...(siteId && { siteId })
  }),

  /**
   * Build overdue alerts filter
   */
  buildOverdueAlertsFilter: (siteId?: string): AndonAlertFilters => ({
    isOverdue: true,
    status: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS'],
    ...(siteId && { siteId })
  }),

  /**
   * Build critical alerts filter
   */
  buildCriticalAlertsFilter: (siteId?: string): AndonAlertFilters => ({
    severity: ['CRITICAL'],
    status: ['OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'ESCALATED'],
    ...(siteId && { siteId })
  }),

  /**
   * Format date range for API
   */
  formatDateRange: (from: Date, to: Date) => ({
    from: from.toISOString(),
    to: to.toISOString()
  }),

  /**
   * Get default pagination options
   */
  getDefaultPagination: (): PaginationOptions => ({
    page: 1,
    pageSize: 20,
    sortBy: 'createdAt',
    sortOrder: 'desc'
  })
};

export default andonApi;