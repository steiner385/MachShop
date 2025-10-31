/**
 * Kit Management API Client
 *
 * API functions for kit generation, staging, workflow management,
 * barcode scanning, and shortage identification
 */

import axios from 'axios';
import {
  Kit,
  KitItem,
  StagingLocation,
  KitStatusHistory,
  KitShortageAlert,
  CreateKitRequest,
  UpdateKitRequest,
  CreateKitItemRequest,
  UpdateKitItemRequest,
  KitGenerationRequest,
  KitTransitionRequest,
  StagingAssignmentRequest,
  KitListResponse,
  KitGenerationResponse,
  KitMetricsResponse,
  StagingLocationOptimizationResponse,
  KitSearchParams,
  BarcodeScanRequest,
  BarcodeScanResult
} from '../types/kits';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || '/api/v1';

// Kit Management API
export const kitApi = {
  // Basic CRUD operations
  async getKits(params?: KitSearchParams): Promise<KitListResponse> {
    const response = await axios.get(`${API_BASE_URL}/kits`, { params });
    return response.data;
  },

  async getKit(id: string): Promise<Kit> {
    const response = await axios.get(`${API_BASE_URL}/kits/${id}`);
    return response.data;
  },

  async createKit(data: CreateKitRequest): Promise<Kit> {
    const response = await axios.post(`${API_BASE_URL}/kits`, data);
    return response.data;
  },

  async updateKit(id: string, data: UpdateKitRequest): Promise<Kit> {
    const response = await axios.put(`${API_BASE_URL}/kits/${id}`, data);
    return response.data;
  },

  async deleteKit(id: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/kits/${id}`);
  },

  // Kit Items
  async getKitItems(kitId: string): Promise<KitItem[]> {
    const response = await axios.get(`${API_BASE_URL}/kits/${kitId}/items`);
    return response.data;
  },

  async addKitItem(kitId: string, data: CreateKitItemRequest): Promise<KitItem> {
    const response = await axios.post(`${API_BASE_URL}/kits/${kitId}/items`, data);
    return response.data;
  },

  async updateKitItem(kitId: string, itemId: string, data: UpdateKitItemRequest): Promise<KitItem> {
    const response = await axios.put(`${API_BASE_URL}/kits/${kitId}/items/${itemId}`, data);
    return response.data;
  },

  async removeKitItem(kitId: string, itemId: string): Promise<void> {
    await axios.delete(`${API_BASE_URL}/kits/${kitId}/items/${itemId}`);
  },

  // Kit Generation
  async generateKits(data: KitGenerationRequest): Promise<KitGenerationResponse> {
    const response = await axios.post(`${API_BASE_URL}/kits/generate`, data);
    return response.data;
  },

  async generateKitsFromWorkOrder(workOrderId: string, data: Omit<KitGenerationRequest, 'workOrderId'>): Promise<KitGenerationResponse> {
    const response = await axios.post(`${API_BASE_URL}/workorders/${workOrderId}/generate-kits`, data);
    return response.data;
  },

  async getWorkOrderKits(workOrderId: string): Promise<Kit[]> {
    const response = await axios.get(`${API_BASE_URL}/workorders/${workOrderId}/kits`);
    return response.data;
  },

  // Kit Workflow
  async transitionKitStatus(data: KitTransitionRequest): Promise<{
    success: boolean;
    kit?: Kit;
    validationResults: Array<{
      type: 'ERROR' | 'WARNING' | 'INFO';
      message: string;
      field?: string;
    }>;
  }> {
    const response = await axios.post(`${API_BASE_URL}/kits/transition`, data);
    return response.data;
  },

  async getKitStatusHistory(kitId: string): Promise<KitStatusHistory[]> {
    const response = await axios.get(`${API_BASE_URL}/kits/${kitId}/status-history`);
    return response.data;
  },

  // Kit Metrics and Analytics
  async getKitMetrics(): Promise<KitMetricsResponse> {
    const response = await axios.get(`${API_BASE_URL}/kits/metrics`);
    return response.data;
  },

  async getKitStatistics(): Promise<{
    totalKits: number;
    activeKits: number;
    completedKits: number;
    overdueKits: number;
    totalShortages: number;
    stagingUtilization: number;
  }> {
    const response = await axios.get(`${API_BASE_URL}/kits/statistics`);
    return response.data;
  },

  // Kit Shortages
  async getKitShortages(kitId?: string): Promise<KitShortageAlert[]> {
    const url = kitId ? `${API_BASE_URL}/kits/${kitId}/shortages` : `${API_BASE_URL}/kits/shortages`;
    const response = await axios.get(url);
    return response.data;
  },

  async identifyKitShortages(kitId: string): Promise<KitShortageAlert[]> {
    const response = await axios.post(`${API_BASE_URL}/kits/${kitId}/identify-shortages`);
    return response.data;
  },

  async resolveShortage(shortageId: string, resolution: {
    action: 'SOURCED' | 'SUBSTITUTED' | 'DEFERRED' | 'CANCELLED';
    notes?: string;
  }): Promise<void> {
    await axios.put(`${API_BASE_URL}/kits/shortages/${shortageId}/resolve`, resolution);
  },

  // Barcode Scanning
  async scanKit(data: BarcodeScanRequest): Promise<BarcodeScanResult> {
    const response = await axios.post(`${API_BASE_URL}/kits/scan/kit`, data);
    return response.data;
  },

  async scanPart(data: BarcodeScanRequest): Promise<BarcodeScanResult> {
    const response = await axios.post(`${API_BASE_URL}/kits/scan/part`, data);
    return response.data;
  },

  async scanLocation(data: BarcodeScanRequest): Promise<BarcodeScanResult> {
    const response = await axios.post(`${API_BASE_URL}/kits/scan/location`, data);
    return response.data;
  },

  async validateBarcode(data: BarcodeScanRequest): Promise<{
    isValid: boolean;
    type?: string;
    data?: any;
    errors: string[];
    suggestions: string[];
  }> {
    const response = await axios.post(`${API_BASE_URL}/kits/scan/validate`, data);
    return response.data;
  },

  // QR Code Generation
  async generateKitQR(kitId: string, options?: {
    format?: 'json' | 'simple';
    size?: number;
    errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  }): Promise<{
    qrCodeData: string;
    qrCodeUrl?: string;
    metadata: {
      format: string;
      size: number;
      errorCorrectionLevel: string;
    };
  }> {
    const response = await axios.post(`${API_BASE_URL}/kits/qr/generate`, {
      kitId,
      ...options
    });
    return response.data;
  },

  async getKitQR(kitId: string): Promise<string> {
    const response = await axios.get(`${API_BASE_URL}/kits/${kitId}/qr`);
    return response.data;
  }
};

// Staging Location API
export const stagingApi = {
  // Staging Locations
  async getStagingLocations(filters?: {
    areaId?: string;
    locationType?: string;
    isAvailable?: boolean;
    hasCapacity?: boolean;
  }): Promise<StagingLocation[]> {
    const response = await axios.get(`${API_BASE_URL}/staging/locations`, { params: filters });
    return response.data;
  },

  async getStagingLocation(id: string): Promise<StagingLocation> {
    const response = await axios.get(`${API_BASE_URL}/staging/locations/${id}`);
    return response.data;
  },

  // Location Optimization
  async findOptimalLocation(requirements: {
    kitId: string;
    workCellId?: string;
    requiresCleanRoom?: boolean;
    requiredCapacity?: number;
    proximityWeight?: number;
    capacityWeight?: number;
  }): Promise<StagingLocationOptimizationResponse> {
    const response = await axios.post(`${API_BASE_URL}/staging/optimize-location`, requirements);
    return response.data;
  },

  // Staging Workflow
  async initiateStagingProcess(data: {
    kitId: string;
    locationId?: string;
    priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
    scheduledStartTime?: string;
    assignedUserId?: string;
    specialInstructions?: string;
  }): Promise<{
    success: boolean;
    stagingProcess: {
      id: string;
      kitId: string;
      status: string;
      assignedLocation?: StagingLocation;
      estimatedCompletionTime?: string;
    };
    warnings: string[];
  }> {
    const response = await axios.post(`${API_BASE_URL}/staging/initiate`, data);
    return response.data;
  },

  async assignKitToLocation(data: StagingAssignmentRequest): Promise<{
    success: boolean;
    kit: Kit;
    location: StagingLocation;
    validationResults: Array<{
      type: 'ERROR' | 'WARNING' | 'INFO';
      message: string;
    }>;
  }> {
    const response = await axios.post(`${API_BASE_URL}/staging/assign`, data);
    return response.data;
  },

  async updateStagingProgress(stagingProcessId: string, data: {
    completedItems?: string[];
    progress?: number;
    notes?: string;
    estimatedCompletionTime?: string;
  }): Promise<{
    success: boolean;
    stagingProcess: any;
    nextActions: string[];
  }> {
    const response = await axios.put(`${API_BASE_URL}/staging/progress/${stagingProcessId}`, data);
    return response.data;
  },

  async completeStagingProcess(stagingProcessId: string, data: {
    actualCompletionTime?: string;
    finalNotes?: string;
    qualityCheckPassed?: boolean;
    readyForIssue?: boolean;
  }): Promise<{
    success: boolean;
    kit: Kit;
    nextActions: string[];
    recommendations: string[];
  }> {
    const response = await axios.post(`${API_BASE_URL}/staging/complete/${stagingProcessId}`, data);
    return response.data;
  },

  // Staging Dashboard
  async getStagingDashboard(): Promise<{
    activeStagingProcesses: number;
    completedToday: number;
    averageCompletionTime: number;
    locationUtilization: Record<string, {
      locationCode: string;
      currentOccupancy: number;
      maxCapacity: number;
      utilizationRate: number;
    }>;
    pendingAssignments: Array<{
      kitId: string;
      kitNumber: string;
      priority: string;
      waitTime: number;
    }>;
    alerts: Array<{
      type: 'CAPACITY' | 'OVERDUE' | 'SHORTAGE' | 'QUALITY';
      message: string;
      severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
      locationId?: string;
      kitId?: string;
    }>;
  }> {
    const response = await axios.get(`${API_BASE_URL}/staging/dashboard`);
    return response.data;
  }
};

// Helper function for error handling
export const handleApiError = (error: any): string => {
  if (error.response?.data?.message) {
    return error.response.data.message;
  } else if (error.message) {
    return error.message;
  } else {
    return 'An unexpected error occurred';
  }
};

// Export combined API
export const kitsApiClient = {
  ...kitApi,
  staging: stagingApi,
  handleError: handleApiError
};