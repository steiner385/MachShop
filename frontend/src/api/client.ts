/**
 * API Client
 * Common axios client and response types for API calls
 */

import axios, { AxiosInstance } from 'axios';
import { tokenUtils } from './auth';
import { createAuthResponseInterceptor } from '@/utils/authInterceptor';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Common response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
  };
  error?: string;
}

// Create axios instance for general API calls
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
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

// Response interceptor for error handling with centralized auth
const authInterceptor = createAuthResponseInterceptor();
apiClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    // Handle 401 through centralized auth interceptor
    if (error.response?.status === 401) {
      try {
        await authInterceptor.onRejected(error);
      } catch (authError) {
        // The auth interceptor re-throws the error after handling 401
        // Continue with normal error processing
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

export default apiClient;
