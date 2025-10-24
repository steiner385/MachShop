/**
 * Routing Template API Client
 * Sprint 4: Routing Management UI
 *
 * API client for routing template library endpoints
 */

import axios from 'axios';
import { tokenUtils } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance for routing template API
const templateClient = axios.create({
  baseURL: `${API_BASE_URL}/routing-templates`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
templateClient.interceptors.request.use(
  (config) => {
    const token = tokenUtils.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
templateClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    console.error('[Routing Template API Error]', message, error.response?.data);
    return Promise.reject(error);
  }
);

// TypeScript interfaces
export interface RoutingTemplate {
  id: string;
  name: string;
  number: string;
  category?: string;
  description?: string;
  tags: string[];
  isPublic: boolean;
  isFavorite: boolean;
  usageCount: number;
  rating?: number;
  visualData?: any;
  sourceRoutingId?: string;
  sourceRouting?: any;
  createdById: string;
  createdBy: {
    id: string;
    username: string;
    email: string;
  };
  siteId: string;
  site: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateTemplateRequest {
  name: string;
  category?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  visualData?: any;
  sourceRoutingId?: string;
  siteId: string;
  createdById: string;
}

export interface UpdateTemplateRequest {
  name?: string;
  category?: string;
  description?: string;
  tags?: string[];
  isPublic?: boolean;
  isFavorite?: boolean;
  rating?: number;
  visualData?: any;
}

export interface SearchTemplatesParams {
  search?: string;
  category?: string;
  tags?: string[];
  siteId?: string;
  isPublic?: boolean;
  isFavorite?: boolean;
  sortBy?: 'name' | 'usageCount' | 'rating' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

export interface TemplateListResponse {
  templates: RoutingTemplate[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface UseTemplateRequest {
  partId: string;
  routingNumber: string;
  siteId: string;
}

// API Methods
export const routingTemplateApi = {
  /**
   * Get list of routing templates with optional filtering and search
   */
  async getTemplates(params?: SearchTemplatesParams): Promise<TemplateListResponse> {
    const queryParams = new URLSearchParams();

    if (params?.search) queryParams.append('search', params.search);
    if (params?.category) queryParams.append('category', params.category);
    if (params?.tags) params.tags.forEach(tag => queryParams.append('tags', tag));
    if (params?.siteId) queryParams.append('siteId', params.siteId);
    if (params?.isPublic !== undefined) queryParams.append('isPublic', params.isPublic.toString());
    if (params?.isFavorite !== undefined) queryParams.append('isFavorite', params.isFavorite.toString());
    if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
    if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());

    return await templateClient.get(`?${queryParams.toString()}`);
  },

  /**
   * Get a single routing template by ID
   */
  async getTemplate(id: string): Promise<RoutingTemplate> {
    return await templateClient.get(`/${id}`);
  },

  /**
   * Create a new routing template
   */
  async createTemplate(data: CreateTemplateRequest): Promise<RoutingTemplate> {
    return await templateClient.post('', data);
  },

  /**
   * Update a routing template
   */
  async updateTemplate(id: string, data: UpdateTemplateRequest): Promise<RoutingTemplate> {
    return await templateClient.put(`/${id}`, data);
  },

  /**
   * Delete a routing template
   */
  async deleteTemplate(id: string): Promise<void> {
    return await templateClient.delete(`/${id}`);
  },

  /**
   * Toggle favorite status for a template
   */
  async toggleFavorite(id: string): Promise<RoutingTemplate> {
    return await templateClient.post(`/${id}/favorite`);
  },

  /**
   * Create a new routing from a template
   */
  async useTemplate(id: string, data: UseTemplateRequest): Promise<any> {
    return await templateClient.post(`/${id}/use`, data);
  },
};

export default routingTemplateApi;
