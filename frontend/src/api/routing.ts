/**
 * Routing API Client
 * Sprint 4: Routing Management UI
 *
 * API client for routing-related endpoints
 * Provides methods for CRUD operations, lifecycle management, and business logic
 */

import axios from 'axios';
import {
  Routing,
  RoutingStep,
  RoutingStepDependency,
  PartSiteAvailability,
  CreateRoutingRequest,
  CreateRoutingStepRequest,
  UpdateRoutingRequest,
  UpdateRoutingStepRequest,
  CreateStepDependencyRequest,
  CreatePartSiteAvailabilityRequest,
  CopyRoutingRequest,
  ApproveRoutingRequest,
  ResequenceStepsRequest,
  RoutingQueryParams,
  RoutingResponse,
  RoutingListResponse,
  RoutingStepResponse,
  RoutingStepListResponse,
  PartSiteAvailabilityResponse,
  RoutingVersionsResponse,
  RoutingTimingResponse,
  RoutingValidationResponse,
} from '@/types/routing';
import { tokenUtils } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

// Create axios instance for routing API
const routingClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
routingClient.interceptors.request.use(
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
routingClient.interceptors.response.use(
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

// ============================================
// ROUTING API
// ============================================

export const routingAPI = {
  /**
   * Get all routings with optional filters
   */
  getAllRoutings: async (params?: RoutingQueryParams): Promise<RoutingListResponse> => {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      });
    }

    const queryString = queryParams.toString();
    const url = queryString ? `/routings?${queryString}` : '/routings';

    return routingClient.get(url);
  },

  /**
   * Get routing by ID
   */
  getRoutingById: async (id: string, includeSteps: boolean = true): Promise<RoutingResponse> => {
    return routingClient.get(`/routings/${id}?includeSteps=${includeSteps}`);
  },

  /**
   * Get routing by routing number
   */
  getRoutingByNumber: async (routingNumber: string): Promise<RoutingResponse> => {
    return routingClient.get(`/routings/number/${routingNumber}`);
  },

  /**
   * Create new routing
   */
  createRouting: async (data: CreateRoutingRequest): Promise<RoutingResponse> => {
    return routingClient.post('/routings', data);
  },

  /**
   * Update routing
   */
  updateRouting: async (id: string, data: UpdateRoutingRequest): Promise<RoutingResponse> => {
    return routingClient.put(`/routings/${id}`, data);
  },

  /**
   * Delete routing
   */
  deleteRouting: async (id: string): Promise<{ success: boolean; message: string }> => {
    return routingClient.delete(`/routings/${id}`);
  },

  /**
   * Copy routing to new version or site
   */
  copyRouting: async (id: string, options: CopyRoutingRequest): Promise<RoutingResponse> => {
    return routingClient.post(`/routings/${id}/copy`, options);
  },

  /**
   * Approve routing (move to RELEASED state)
   */
  approveRouting: async (request: ApproveRoutingRequest): Promise<RoutingResponse> => {
    return routingClient.post(`/routings/${request.routingId}/approve`, request);
  },

  /**
   * Activate routing (move to PRODUCTION state)
   */
  activateRouting: async (id: string): Promise<RoutingResponse> => {
    return routingClient.post(`/routings/${id}/activate`);
  },

  /**
   * Mark routing as obsolete
   */
  obsoleteRouting: async (id: string): Promise<RoutingResponse> => {
    return routingClient.post(`/routings/${id}/obsolete`);
  },

  /**
   * Get all versions of a routing
   */
  getRoutingVersions: async (partId: string, siteId: string): Promise<RoutingVersionsResponse> => {
    return routingClient.get(`/routings/${partId}/${siteId}/versions`);
  },

  /**
   * Calculate routing timing
   */
  calculateRoutingTiming: async (id: string): Promise<RoutingTimingResponse> => {
    return routingClient.get(`/routings/${id}/timing`);
  },

  /**
   * Validate routing
   */
  validateRouting: async (id: string): Promise<RoutingValidationResponse> => {
    return routingClient.get(`/routings/${id}/validate`);
  },
};

// ============================================
// ROUTING STEP API
// ============================================

export const routingStepAPI = {
  /**
   * Get all steps for a routing
   */
  getRoutingSteps: async (routingId: string): Promise<RoutingStepListResponse> => {
    return routingClient.get(`/routings/${routingId}/steps`);
  },

  /**
   * Get routing step by ID
   */
  getRoutingStepById: async (stepId: string): Promise<RoutingStepResponse> => {
    return routingClient.get(`/routings/steps/${stepId}`);
  },

  /**
   * Create routing step
   */
  createRoutingStep: async (routingId: string, data: CreateRoutingStepRequest): Promise<RoutingStepResponse> => {
    return routingClient.post(`/routings/${routingId}/steps`, data);
  },

  /**
   * Update routing step
   */
  updateRoutingStep: async (stepId: string, data: UpdateRoutingStepRequest): Promise<RoutingStepResponse> => {
    return routingClient.put(`/routings/steps/${stepId}`, data);
  },

  /**
   * Delete routing step
   */
  deleteRoutingStep: async (stepId: string): Promise<{ success: boolean; message: string }> => {
    return routingClient.delete(`/routings/steps/${stepId}`);
  },

  /**
   * Resequence routing steps
   */
  resequenceSteps: async (request: ResequenceStepsRequest): Promise<RoutingStepListResponse> => {
    return routingClient.post(`/routings/${request.routingId}/steps/resequence`, request);
  },
};

// ============================================
// STEP DEPENDENCY API
// ============================================

export const stepDependencyAPI = {
  /**
   * Create step dependency
   */
  createStepDependency: async (data: CreateStepDependencyRequest): Promise<{ success: boolean; data: RoutingStepDependency }> => {
    return routingClient.post('/routings/steps/dependencies', data);
  },

  /**
   * Delete step dependency
   */
  deleteStepDependency: async (dependencyId: string): Promise<{ success: boolean; message: string }> => {
    return routingClient.delete(`/routings/steps/dependencies/${dependencyId}`);
  },
};

// ============================================
// PART SITE AVAILABILITY API
// ============================================

export const partSiteAvailabilityAPI = {
  /**
   * Get part site availability
   */
  getPartSiteAvailability: async (partId: string, siteId: string): Promise<PartSiteAvailabilityResponse> => {
    return routingClient.get(`/routings/part-site-availability/${partId}/${siteId}`);
  },

  /**
   * Get all sites where a part is available
   */
  getPartAvailableSites: async (partId: string): Promise<{ success: boolean; data: PartSiteAvailability[] }> => {
    return routingClient.get(`/routings/parts/${partId}/available-sites`);
  },

  /**
   * Create part site availability
   */
  createPartSiteAvailability: async (data: CreatePartSiteAvailabilityRequest): Promise<PartSiteAvailabilityResponse> => {
    return routingClient.post('/routings/part-site-availability', data);
  },

  /**
   * Update part site availability
   */
  updatePartSiteAvailability: async (id: string, data: Partial<CreatePartSiteAvailabilityRequest>): Promise<PartSiteAvailabilityResponse> => {
    return routingClient.put(`/routings/part-site-availability/${id}`, data);
  },

  /**
   * Delete part site availability
   */
  deletePartSiteAvailability: async (id: string): Promise<{ success: boolean; message: string }> => {
    return routingClient.delete(`/routings/part-site-availability/${id}`);
  },
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format seconds to human-readable time
 */
export const formatTime = (seconds: number): string => {
  if (seconds < 60) {
    return `${seconds}s`;
  } else if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  } else {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  }
};

/**
 * Calculate total routing time from steps
 */
export const calculateTotalTime = (steps: RoutingStep[]): number => {
  return steps.reduce((total, step) => {
    const setup = step.setupTimeOverride ?? step.processSegment?.setupTime ?? 0;
    const cycle = step.cycleTimeOverride ?? step.processSegment?.duration ?? 0;
    const teardown = step.teardownTimeOverride ?? step.processSegment?.teardownTime ?? 0;
    return total + setup + cycle + teardown;
  }, 0);
};

/**
 * Check if routing is editable based on lifecycle state
 */
export const isRoutingEditable = (routing: Routing): boolean => {
  return routing.lifecycleState === 'DRAFT' || routing.lifecycleState === 'REVIEW';
};

/**
 * Check if routing can transition to next state
 */
export const canTransitionToState = (currentState: string, targetState: string): boolean => {
  const transitions: Record<string, string[]> = {
    'DRAFT': ['REVIEW'],
    'REVIEW': ['RELEASED', 'DRAFT'],
    'RELEASED': ['PRODUCTION', 'REVIEW'],
    'PRODUCTION': ['OBSOLETE'],
    'OBSOLETE': [],
  };

  return transitions[currentState]?.includes(targetState) ?? false;
};

// Export all APIs
export default {
  routing: routingAPI,
  step: routingStepAPI,
  dependency: stepDependencyAPI,
  partSiteAvailability: partSiteAvailabilityAPI,
  utils: {
    formatTime,
    calculateTotalTime,
    isRoutingEditable,
    canTransitionToState,
  },
};
