import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * TypeScript interfaces for Tool & Fixture Drawings
 */
export interface ToolDrawing {
  id: string;
  documentNumber: string;
  title: string;
  description?: string;
  toolType: 'FIXTURE' | 'JIG' | 'GAUGE' | 'CUTTING_TOOL' | 'MEASURING_TOOL' | 'ASSEMBLY_TOOL';
  toolNumber?: string;
  partId?: string;
  operationId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  specifications?: string;
  dimensions?: string;
  weight?: number;
  material?: string;
  hardnessRequirement?: string;
  accuracy?: string;
  tolerances?: string;
  maintenanceInstructions?: string;
  calibrationRequired: boolean;
  calibrationFrequencyDays?: number;
  safetyRequirements?: string;
  storageRequirements?: string;
  currentLocation?: string;
  notes?: string;
  tags?: string[];
  categories?: string[];
  effectiveDate?: string;
  supersededDate?: string;
  ecoNumber?: string;
  approvedById?: string;
  approvedAt?: string;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
  maintenanceRecords?: ToolMaintenanceRecord[];
  calibrationRecords?: ToolCalibrationRecord[];
  usageLogs?: ToolUsageLog[];
}

export interface ToolMaintenanceRecord {
  id: string;
  toolDrawingId: string;
  maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'EMERGENCY';
  performedBy: string;
  maintenanceDate: string;
  description: string;
  partsReplaced?: string;
  cost?: number;
  downtime?: number;
  nextMaintenanceDate?: string;
  notes?: string;
  performer?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export interface ToolCalibrationRecord {
  id: string;
  toolDrawingId: string;
  performedBy: string;
  calibrationDate: string;
  calibrationStandard?: string;
  results?: string;
  passed: boolean;
  adjustmentsMade?: string;
  nextCalibrationDate?: string;
  certificateNumber?: string;
  notes?: string;
  performer?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export interface ToolUsageLog {
  id: string;
  toolDrawingId: string;
  operatorId: string;
  usageDate: string;
  operationId?: string;
  workOrderId?: string;
  partId?: string;
  quantity: number;
  cycleCount?: number;
  usageTime?: number;
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  notes?: string;
  operator?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export interface CreateToolDrawingRequest {
  title: string;
  description?: string;
  toolType?: 'FIXTURE' | 'JIG' | 'GAUGE' | 'CUTTING_TOOL' | 'MEASURING_TOOL' | 'ASSEMBLY_TOOL';
  toolNumber?: string;
  partId?: string;
  operationId?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  specifications?: string;
  dimensions?: string;
  weight?: number;
  material?: string;
  hardnessRequirement?: string;
  accuracy?: string;
  tolerances?: string;
  maintenanceInstructions?: string;
  calibrationRequired?: boolean;
  calibrationFrequencyDays?: number;
  safetyRequirements?: string;
  storageRequirements?: string;
  notes?: string;
  tags?: string[];
  categories?: string[];
}

export interface ToolDrawingQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  toolType?: string;
  toolNumber?: string;
  partId?: string;
  operationId?: string;
  manufacturer?: string;
  search?: string;
  tags?: string[];
  categories?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedToolDrawingResponse {
  data: ToolDrawing[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ToolAvailability {
  isAvailable: boolean;
  currentLocation?: string;
  condition?: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
  lastUsed?: string;
  nextMaintenance?: string;
  nextCalibration?: string;
  maintenanceOverdue: boolean;
  calibrationOverdue: boolean;
}

export interface ToolUsageStatistics {
  totalUsages: number;
  totalRuntime: number;
  avgUsageTime: number;
  utilizationRate: number;
  conditionTrend: Array<{
    date: string;
    condition: string;
    usageCount: number;
  }>;
}

/**
 * Tool Drawing API client
 */
class ToolDrawingApi {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/tool-drawings`;
  }

  async createToolDrawing(data: CreateToolDrawingRequest): Promise<ToolDrawing> {
    const response = await axios.post<ToolDrawing>(this.baseURL, data);
    return response.data;
  }

  async getToolDrawings(params?: ToolDrawingQueryParams): Promise<PaginatedToolDrawingResponse> {
    const response = await axios.get<PaginatedToolDrawingResponse>(this.baseURL, { params });
    return response.data;
  }

  async getToolDrawingById(id: string): Promise<ToolDrawing> {
    const response = await axios.get<ToolDrawing>(`${this.baseURL}/${id}`);
    return response.data;
  }

  async updateToolDrawing(id: string, data: Partial<CreateToolDrawingRequest>): Promise<ToolDrawing> {
    const response = await axios.put<ToolDrawing>(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  async deleteToolDrawing(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`);
  }

  async recordToolMaintenance(toolId: string, maintenance: {
    maintenanceType: 'PREVENTIVE' | 'CORRECTIVE' | 'PREDICTIVE' | 'EMERGENCY';
    performedBy: string;
    description: string;
    partsReplaced?: string;
    cost?: number;
    downtime?: number;
    nextMaintenanceDate?: string;
    notes?: string;
  }): Promise<ToolMaintenanceRecord> {
    const response = await axios.post<ToolMaintenanceRecord>(`${this.baseURL}/${toolId}/maintenance`, maintenance);
    return response.data;
  }

  async getToolMaintenanceHistory(toolId: string, params?: {
    maintenanceType?: string;
  }): Promise<ToolMaintenanceRecord[]> {
    const response = await axios.get<ToolMaintenanceRecord[]>(`${this.baseURL}/${toolId}/maintenance`, { params });
    return response.data;
  }

  async getToolsDueForMaintenance(params?: {
    daysAhead?: number;
    toolType?: string;
  }): Promise<ToolDrawing[]> {
    const response = await axios.get<ToolDrawing[]>(`${this.baseURL}/maintenance/due`, { params });
    return response.data;
  }

  async recordToolCalibration(toolId: string, calibration: {
    performedBy: string;
    calibrationStandard?: string;
    results?: string;
    passed: boolean;
    adjustmentsMade?: string;
    nextCalibrationDate?: string;
    certificateNumber?: string;
    notes?: string;
  }): Promise<ToolCalibrationRecord> {
    const response = await axios.post<ToolCalibrationRecord>(`${this.baseURL}/${toolId}/calibration`, calibration);
    return response.data;
  }

  async getToolCalibrationHistory(toolId: string): Promise<ToolCalibrationRecord[]> {
    const response = await axios.get<ToolCalibrationRecord[]>(`${this.baseURL}/${toolId}/calibration`);
    return response.data;
  }

  async getToolsDueForCalibration(params?: {
    daysAhead?: number;
    toolType?: string;
  }): Promise<ToolDrawing[]> {
    const response = await axios.get<ToolDrawing[]>(`${this.baseURL}/calibration/due`, { params });
    return response.data;
  }

  async getToolCalibrationStatus(toolId: string): Promise<{
    isValid: boolean;
    lastCalibration?: ToolCalibrationRecord;
    nextCalibrationDate?: string;
    daysUntilDue?: number;
    isOverdue: boolean;
  }> {
    const response = await axios.get(`${this.baseURL}/${toolId}/calibration/status`);
    return response.data;
  }

  async recordToolUsage(toolId: string, usage: {
    operatorId: string;
    operationId?: string;
    workOrderId?: string;
    partId?: string;
    quantity?: number;
    cycleCount?: number;
    usageTime?: number;
    condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR';
    notes?: string;
  }): Promise<ToolUsageLog> {
    const response = await axios.post<ToolUsageLog>(`${this.baseURL}/${toolId}/usage`, usage);
    return response.data;
  }

  async getToolUsageHistory(toolId: string, params?: {
    startDate?: string;
    endDate?: string;
  }): Promise<ToolUsageLog[]> {
    const response = await axios.get<ToolUsageLog[]>(`${this.baseURL}/${toolId}/usage`, { params });
    return response.data;
  }

  async getToolUsageStatistics(toolId: string, days: number = 30): Promise<ToolUsageStatistics> {
    const response = await axios.get<ToolUsageStatistics>(`${this.baseURL}/${toolId}/usage/statistics`, { params: { days } });
    return response.data;
  }

  async getToolInventory(params?: {
    toolType?: string;
    condition?: string;
    location?: string;
  }): Promise<ToolDrawing[]> {
    const response = await axios.get<ToolDrawing[]>(`${this.baseURL}/inventory`, { params });
    return response.data;
  }

  async checkToolAvailability(toolId: string): Promise<ToolAvailability> {
    const response = await axios.get<ToolAvailability>(`${this.baseURL}/${toolId}/availability`);
    return response.data;
  }

  async updateToolLocation(toolId: string, location: string, notes?: string): Promise<ToolDrawing> {
    const response = await axios.put<ToolDrawing>(`${this.baseURL}/${toolId}/location`, { location, notes });
    return response.data;
  }

  async approveToolDrawing(id: string): Promise<ToolDrawing> {
    const response = await axios.post<ToolDrawing>(`${this.baseURL}/${id}/approve`);
    return response.data;
  }

  async rejectToolDrawing(id: string, reason: string, comments: string): Promise<ToolDrawing> {
    const response = await axios.post<ToolDrawing>(`${this.baseURL}/${id}/reject`, { reason, comments });
    return response.data;
  }

  async getToolDrawingsByPartId(partId: string): Promise<ToolDrawing[]> {
    const response = await axios.get<ToolDrawing[]>(`${this.baseURL}/part/${partId}`);
    return response.data;
  }

  async getToolDrawingsByOperationId(operationId: string): Promise<ToolDrawing[]> {
    const response = await axios.get<ToolDrawing[]>(`${this.baseURL}/operation/${operationId}`);
    return response.data;
  }

  async getToolDrawingByToolNumber(toolNumber: string): Promise<ToolDrawing> {
    const response = await axios.get<ToolDrawing>(`${this.baseURL}/tool-number/${toolNumber}`);
    return response.data;
  }
}

export const toolDrawingApi = new ToolDrawingApi();
export default toolDrawingApi;