import { apiClient } from './apiClient';

// Quality Inspection Types
export type InspectionResult = 'PASS' | 'FAIL' | 'CONDITIONAL';

export interface QualityInspection {
  id: string;
  workOrderId: string;
  workOrderNumber?: string;
  partNumber?: string;
  partName?: string;
  operation: string;
  qualityPlanId: string;
  qualityPlanName?: string;
  result: InspectionResult;
  inspector: string;
  startedAt: string;
  completedAt: string | null;
  totalCharacteristics: number;
  passedCharacteristics: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InspectionListResponse {
  inspections: QualityInspection[];
  total: number;
  page: number;
  limit: number;
}

export interface InspectionFilters {
  result?: InspectionResult;
  workOrderId?: string;
  inspector?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// NCR (Non-Conformance Report) Types
export type NCRSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';
export type NCRStatus = 'OPEN' | 'IN_REVIEW' | 'CORRECTIVE_ACTION' | 'CLOSED';

export interface NCR {
  id: string;
  ncrNumber: string;
  workOrderId: string;
  workOrderNumber?: string;
  partNumber?: string;
  partName?: string;
  operation: string;
  defectType: string;
  description: string;
  severity: NCRSeverity;
  status: NCRStatus;
  quantity: number;
  createdBy: string;
  assignedTo?: string;
  rootCause?: string;
  correctiveAction?: string;
  createdAt: string;
  dueDate: string;
  closedAt?: string;
  updatedAt: string;
}

export interface NCRListResponse {
  ncrs: NCR[];
  total: number;
  page: number;
  limit: number;
}

export interface NCRFilters {
  status?: NCRStatus;
  severity?: NCRSeverity;
  workOrderId?: string;
  defectType?: string;
  assignedTo?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  limit?: number;
}

// Create Inspection Request
export interface CreateInspectionRequest {
  workOrderId: string;
  operation: string;
  qualityPlanId: string;
  inspector?: string;
  quantity?: number;
  notes?: string;
}

// Create NCR Request
export interface CreateNCRRequest {
  workOrderId: string;
  operation: string;
  defectType: string;
  description: string;
  severity: NCRSeverity;
  quantity: number;
  assignedTo?: string;
  dueDate: string;
  immediateAction?: boolean;
  customerNotification?: boolean;
  rootCause?: string;
}

/**
 * Quality API Service
 * Provides access to quality management endpoints (inspections, NCRs)
 */
export const qualityApi = {
  // ===== Inspection Endpoints =====

  /**
   * Get list of quality inspections with optional filters
   */
  async getInspections(filters?: InspectionFilters): Promise<InspectionListResponse> {
    const response = await apiClient.get<InspectionListResponse>('/quality/inspections', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get inspection by ID
   */
  async getInspectionById(id: string): Promise<QualityInspection> {
    const response = await apiClient.get<QualityInspection>(`/quality/inspections/${id}`);
    return response.data;
  },

  /**
   * Create a new quality inspection
   */
  async createInspection(data: CreateInspectionRequest): Promise<QualityInspection> {
    const response = await apiClient.post<QualityInspection>('/quality/inspections', data);
    return response.data;
  },

  /**
   * Update inspection result
   */
  async updateInspectionResult(
    id: string,
    result: InspectionResult,
    passedCharacteristics: number,
    notes?: string
  ): Promise<QualityInspection> {
    const response = await apiClient.patch<QualityInspection>(`/quality/inspections/${id}`, {
      result,
      passedCharacteristics,
      notes,
      completedAt: new Date().toISOString(),
    });
    return response.data;
  },

  // ===== NCR Endpoints =====

  /**
   * Get list of NCRs with optional filters
   */
  async getNCRs(filters?: NCRFilters): Promise<NCRListResponse> {
    const response = await apiClient.get<NCRListResponse>('/quality/ncrs', {
      params: filters,
    });
    return response.data;
  },

  /**
   * Get NCR by ID
   */
  async getNCRById(id: string): Promise<NCR> {
    const response = await apiClient.get<NCR>(`/quality/ncrs/${id}`);
    return response.data;
  },

  /**
   * Create a new NCR
   */
  async createNCR(data: CreateNCRRequest): Promise<NCR> {
    const response = await apiClient.post<NCR>('/quality/ncrs', data);
    return response.data;
  },

  /**
   * Update NCR status
   */
  async updateNCRStatus(id: string, status: NCRStatus, notes?: string): Promise<NCR> {
    const response = await apiClient.patch<NCR>(`/quality/ncrs/${id}/status`, {
      status,
      notes,
    });
    return response.data;
  },

  /**
   * Add corrective action to NCR
   */
  async addCorrectiveAction(
    id: string,
    correctiveAction: string,
    rootCause?: string
  ): Promise<NCR> {
    const response = await apiClient.patch<NCR>(`/quality/ncrs/${id}/corrective-action`, {
      correctiveAction,
      rootCause,
    });
    return response.data;
  },

  /**
   * Close an NCR
   */
  async closeNCR(id: string, resolution: string): Promise<NCR> {
    const response = await apiClient.patch<NCR>(`/quality/ncrs/${id}/close`, {
      resolution,
      closedAt: new Date().toISOString(),
    });
    return response.data;
  },
};
