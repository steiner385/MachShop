/**
 * Presence API Client
 * Sprint 4: Collaborative Routing Features
 *
 * API client for user presence tracking
 */

import axios from 'axios';
import { tokenUtils } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// ============================================
// TYPES
// ============================================

export interface PresenceInfo {
  resourceId: string;
  activeUsers: ActiveUser[];
  viewerCount: number;
  editorCount: number;
}

export interface ActiveUser {
  userId: string;
  userName: string;
  action: 'viewing' | 'editing';
  lastSeen: Date;
  duration: number; // seconds
}

export type ResourceType = 'routing' | 'routing-step' | 'work-order';
export type PresenceAction = 'viewing' | 'editing';

// ============================================
// AXIOS CLIENT
// ============================================

const presenceClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
presenceClient.interceptors.request.use(
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
presenceClient.interceptors.response.use(
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

    const errorMessage = error.response?.data?.error ||
                         error.response?.data?.message ||
                         error.message ||
                         'An error occurred';

    throw new Error(errorMessage);
  }
);

// ============================================
// PRESENCE API
// ============================================

export const presenceAPI = {
  /**
   * Update user presence (heartbeat)
   * Call this periodically (every 30s) to maintain presence
   */
  updatePresence: async (params: {
    resourceType: ResourceType;
    resourceId: string;
    action: PresenceAction;
    userName?: string;
  }): Promise<{ success: boolean; message: string }> => {
    return presenceClient.post('/presence/update', {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
      action: params.action,
      userName: params.userName,
    });
  },

  /**
   * Get active users for a resource
   */
  getPresence: async (params: {
    resourceType: ResourceType;
    resourceId: string;
  }): Promise<{ success: boolean; data: PresenceInfo }> => {
    return presenceClient.get(`/presence/${params.resourceType}/${params.resourceId}`);
  },

  /**
   * Remove user presence (call on unmount/navigate away)
   */
  removePresence: async (params: {
    resourceType: ResourceType;
    resourceId: string;
  }): Promise<{ success: boolean; message: string }> => {
    return presenceClient.post('/presence/remove', {
      resourceType: params.resourceType,
      resourceId: params.resourceId,
    });
  },
};

export default presenceAPI;
