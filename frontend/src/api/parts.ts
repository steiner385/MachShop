/**
 * Parts/Products API Client
 *
 * API client for fetching parts/products from the backend
 */

import axios from 'axios';
import { tokenUtils } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance for parts API
const partsClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
partsClient.interceptors.request.use(
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
partsClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    // Handle 401 Unauthorized
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('mes-auth-storage');
        const redirectUrl = window.location.pathname + window.location.search;
        window.location.href = `/login?redirect=${encodeURIComponent(redirectUrl)}`;
      }
    }

    // Extract error message
    const errorMessage = error.response?.data?.error ||
                         error.response?.data?.message ||
                         error.message ||
                         'An error occurred';

    throw new Error(errorMessage);
  }
);

export interface Part {
  id: string;
  partNumber: string;
  partName: string;
  description?: string;
  partType?: string;
  isActive?: boolean;
}

export interface PartsListResponse {
  success: boolean;
  data: Part[];
  total?: number;
}

// ============================================
// PARTS API
// ============================================

export const partsAPI = {
  /**
   * Get all parts with optional filters
   */
  getAllParts: async (params?: { isActive?: boolean }): Promise<Part[]> => {
    const queryParams = new URLSearchParams();

    if (params?.isActive !== undefined) {
      queryParams.append('isActive', String(params.isActive));
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/products?${queryString}` : '/products';

    const response: any = await partsClient.get(url);

    // Handle both response formats
    if (Array.isArray(response)) {
      return response;
    } else if (response.data && Array.isArray(response.data)) {
      return response.data;
    } else {
      return [];
    }
  },

  /**
   * Get part by ID
   */
  getPartById: async (id: string): Promise<Part> => {
    return partsClient.get(`/products/${id}`);
  },

  /**
   * Get part by part number
   */
  getPartByNumber: async (partNumber: string): Promise<Part> => {
    return partsClient.get(`/products/part-number/${partNumber}`);
  },
};

export default partsAPI;
