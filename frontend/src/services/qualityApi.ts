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

// ===== CAPA (Corrective/Preventive Action) Types =====
export type CAStatus =
  | 'OPEN'
  | 'IN_PROGRESS'
  | 'IMPLEMENTED'
  | 'VERIFICATION_IN_PROGRESS'
  | 'VERIFIED_EFFECTIVE'
  | 'VERIFIED_INEFFECTIVE'
  | 'CLOSED';

export type CAPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RCAMethod = '5_WHY' | 'FISHBONE' | 'FAULT_TREE' | 'PARETO' | '8D' | 'OTHER';

export interface CorrectiveAction {
  id: string;
  caNumber: string;
  title: string;
  description: string;
  status: CAStatus;
  priority: CAPriority;
  source: string; // NCR, Customer Complaint, SPC Violation, etc.
  sourceId?: string; // Link to NCR or other source
  assignedTo: string;
  targetDate: string;
  completedDate?: string;
  rootCauseMethod?: RCAMethod;
  rootCause?: string;
  correctiveAction: string;
  preventiveAction?: string;
  owner: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuditTrailEntry {
  id: string;
  caId: string;
  userId: string;
  action: string;
  previousValue?: Record<string, any>;
  newValue?: Record<string, any>;
  notes?: string;
  timestamp: string;
}

export interface CADashboardMetrics {
  total: number;
  byStatus: Record<CAStatus, number>;
  overdue: number;
  approachingDeadline: number;
  averageResolutionTime: number;
  effectivenessRate: number;
}

export interface CorrectiveActionListResponse {
  correctiveActions: CorrectiveAction[];
  total: number;
  page: number;
  limit: number;
}

export interface CAFilters {
  status?: CAStatus;
  priority?: CAPriority;
  assignedTo?: string;
  source?: string;
  startDate?: string;
  endDate?: string;
  overdue?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateCARequest {
  title: string;
  description: string;
  priority: CAPriority;
  source: string;
  sourceId?: string;
  assignedTo: string;
  targetDate: string;
  correctiveAction: string;
  preventiveAction?: string;
}

export interface UpdateCARequest {
  title?: string;
  description?: string;
  priority?: CAPriority;
  assignedTo?: string;
  targetDate?: string;
  correctiveAction?: string;
  preventiveAction?: string;
}

export interface VerifyEffectivenessRequest {
  effective: boolean;
  verificationDate: string;
  verificationNotes: string;
  evidence?: string[];
}

export interface ApproveRCARequest {
  approved: boolean;
  approverNotes?: string;
}

/**
 * Quality API Service
 * Provides access to quality management endpoints (inspections, NCRs, CAPAs)
 */
export const qualityApi = {
  // ===== Corrective/Preventive Action (CAPA) Endpoints =====

  /**
   * Get list of corrective actions with optional filters
   */
  async getCorrectiveActions(filters?: CAFilters): Promise<CorrectiveActionListResponse> {
    return await apiClient.get<CorrectiveActionListResponse>('/corrective-actions', {
      params: filters,
    });
  },

  /**
   * Get corrective action by ID
   */
  async getCorrectiveActionById(id: string): Promise<CorrectiveAction> {
    return await apiClient.get<CorrectiveAction>(`/corrective-actions/${id}`);
  },

  /**
   * Create a new corrective action
   */
  async createCorrectiveAction(data: CreateCARequest): Promise<CorrectiveAction> {
    return await apiClient.post<CorrectiveAction>('/corrective-actions', data);
  },

  /**
   * Update corrective action
   */
  async updateCorrectiveAction(
    id: string,
    data: UpdateCARequest
  ): Promise<CorrectiveAction> {
    return await apiClient.patch<CorrectiveAction>(`/corrective-actions/${id}`, data);
  },

  /**
   * Mark corrective action as implemented
   */
  async markImplemented(id: string, notes?: string): Promise<CorrectiveAction> {
    return await apiClient.post<CorrectiveAction>(`/corrective-actions/${id}/mark-implemented`, {
      implementedDate: new Date().toISOString(),
      notes,
    });
  },

  /**
   * Verify effectiveness of corrective action
   */
  async verifyEffectiveness(
    id: string,
    data: VerifyEffectivenessRequest
  ): Promise<CorrectiveAction> {
    return await apiClient.post<CorrectiveAction>(
      `/corrective-actions/${id}/verify-effectiveness`,
      data
    );
  },

  /**
   * Get audit trail for a corrective action
   */
  async getAuditTrail(id: string): Promise<AuditTrailEntry[]> {
    return await apiClient.get<AuditTrailEntry[]>(`/corrective-actions/${id}/audit-trail`);
  },

  /**
   * Get CAPA dashboard metrics
   */
  async getDashboardMetrics(): Promise<CADashboardMetrics> {
    return await apiClient.get<CADashboardMetrics>('/corrective-actions/dashboard/metrics');
  },

  /**
   * Approve root cause analysis
   */
  async approveRCA(id: string, data: ApproveRCARequest): Promise<CorrectiveAction> {
    return await apiClient.post<CorrectiveAction>(`/corrective-actions/${id}/approve-rca`, data);
  },

  // ===== Inspection Endpoints =====

  /**
   * Get list of quality inspections with optional filters
   */
  async getInspections(filters?: InspectionFilters): Promise<InspectionListResponse> {
    return await apiClient.get<InspectionListResponse>('/quality/inspections', {
      params: filters,
    });
  },

  /**
   * Get inspection by ID
   */
  async getInspectionById(id: string): Promise<QualityInspection> {
    return await apiClient.get<QualityInspection>(`/quality/inspections/${id}`);
  },

  /**
   * Create a new quality inspection
   */
  async createInspection(data: CreateInspectionRequest): Promise<QualityInspection> {
    return await apiClient.post<QualityInspection>('/quality/inspections', data);
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
    return await apiClient.patch<QualityInspection>(`/quality/inspections/${id}`, {
      result,
      passedCharacteristics,
      notes,
      completedAt: new Date().toISOString(),
    });
  },

  // ===== NCR Endpoints =====

  /**
   * Get list of NCRs with optional filters
   */
  async getNCRs(filters?: NCRFilters): Promise<NCRListResponse> {
    return await apiClient.get<NCRListResponse>('/quality/ncrs', {
      params: filters,
    });
  },

  /**
   * Get NCR by ID
   */
  async getNCRById(id: string): Promise<NCR> {
    return await apiClient.get<NCR>(`/quality/ncrs/${id}`);
  },

  /**
   * Create a new NCR
   */
  async createNCR(data: CreateNCRRequest): Promise<NCR> {
    return await apiClient.post<NCR>('/quality/ncrs', data);
  },

  /**
   * Update NCR status
   */
  async updateNCRStatus(id: string, status: NCRStatus, notes?: string): Promise<NCR> {
    return await apiClient.patch<NCR>(`/quality/ncrs/${id}/status`, {
      status,
      notes,
    });
  },

  /**
   * Add corrective action to NCR
   */
  async addCorrectiveAction(
    id: string,
    correctiveAction: string,
    rootCause?: string
  ): Promise<NCR> {
    return await apiClient.patch<NCR>(`/quality/ncrs/${id}/corrective-action`, {
      correctiveAction,
      rootCause,
    });
  },

  /**
   * Close an NCR
   */
  async closeNCR(id: string, resolution: string): Promise<NCR> {
    return await apiClient.patch<NCR>(`/quality/ncrs/${id}/close`, {
      resolution,
      closedAt: new Date().toISOString(),
    });
  },
};
