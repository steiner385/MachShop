import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * TypeScript interfaces for Inspection Plans
 */
export interface InspectionPlan {
  id: string;
  documentNumber: string;
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  inspectionType: 'INCOMING' | 'IN_PROCESS' | 'FINAL' | 'AUDIT';
  frequency: 'EVERY_PIECE' | 'SAMPLE' | 'FIRST_PIECE' | 'LAST_PIECE';
  sampleSize?: number;
  acceptanceLevel?: string;
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  safetyRequirements?: string;
  equipmentRequired?: string;
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
  characteristics?: InspectionCharacteristic[];
  steps?: InspectionStep[];
  executions?: InspectionExecution[];
}

export interface InspectionCharacteristic {
  id: string;
  inspectionPlanId: string;
  characteristicName: string;
  description?: string;
  measurementType: 'DIMENSIONAL' | 'ATTRIBUTE' | 'VARIABLE';
  specification?: string;
  tolerance?: string;
  unitOfMeasure?: string;
  targetValue?: string;
  inspectionMethod?: string;
  isRequired: boolean;
  notes?: string;
}

export interface InspectionStep {
  id: string;
  inspectionPlanId: string;
  stepNumber: number;
  title: string;
  description?: string;
  instructions?: string;
  estimatedTime?: number;
  isRequired: boolean;
  safetyNotes?: string;
  qualityNotes?: string;
}

export interface InspectionExecution {
  id: string;
  inspectionPlanId: string;
  inspectorId: string;
  batchNumber?: string;
  lotNumber?: string;
  workOrderId?: string;
  startedAt: string;
  completedAt?: string;
  overallResult?: 'PASS' | 'FAIL' | 'NA';
  overallDisposition?: 'ACCEPT' | 'REJECT' | 'REWORK' | 'USE_AS_IS';
  notes?: string;
  results?: InspectionResult[];
}

export interface InspectionResult {
  id: string;
  inspectionExecutionId: string;
  characteristicId: string;
  measuredValue?: string;
  result: 'PASS' | 'FAIL' | 'NA';
  disposition?: 'ACCEPT' | 'REJECT' | 'REWORK' | 'USE_AS_IS';
  notes?: string;
}

export interface CreateInspectionPlanRequest {
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  inspectionType?: 'INCOMING' | 'IN_PROCESS' | 'FINAL' | 'AUDIT';
  frequency?: 'EVERY_PIECE' | 'SAMPLE' | 'FIRST_PIECE' | 'LAST_PIECE';
  sampleSize?: number;
  acceptanceLevel?: string;
  safetyRequirements?: string;
  equipmentRequired?: string;
  notes?: string;
  tags?: string[];
  categories?: string[];
  characteristics?: Omit<InspectionCharacteristic, 'id' | 'inspectionPlanId'>[];
}

export interface InspectionPlanQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  partId?: string;
  operationId?: string;
  inspectionType?: string;
  frequency?: string;
  search?: string;
  tags?: string[];
  categories?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedInspectionPlanResponse {
  data: InspectionPlan[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface InspectionStatistics {
  totalExecutions: number;
  passRate: number;
  failRate: number;
  avgCompletionTime: number;
  trendData: Array<{
    date: string;
    passCount: number;
    failCount: number;
    passRate: number;
  }>;
}

/**
 * Inspection Plan API client
 */
class InspectionPlanApi {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/inspection-plans`;
  }

  async createInspectionPlan(data: CreateInspectionPlanRequest): Promise<InspectionPlan> {
    const response = await axios.post<InspectionPlan>(this.baseURL, data);
    return response.data;
  }

  async getInspectionPlans(params?: InspectionPlanQueryParams): Promise<PaginatedInspectionPlanResponse> {
    const response = await axios.get<PaginatedInspectionPlanResponse>(this.baseURL, { params });
    return response.data;
  }

  async getInspectionPlanById(id: string): Promise<InspectionPlan> {
    const response = await axios.get<InspectionPlan>(`${this.baseURL}/${id}`);
    return response.data;
  }

  async updateInspectionPlan(id: string, data: Partial<CreateInspectionPlanRequest>): Promise<InspectionPlan> {
    const response = await axios.put<InspectionPlan>(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  async deleteInspectionPlan(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`);
  }

  async addInspectionCharacteristic(planId: string, characteristic: Omit<InspectionCharacteristic, 'id' | 'inspectionPlanId'>): Promise<InspectionCharacteristic> {
    const response = await axios.post<InspectionCharacteristic>(`${this.baseURL}/${planId}/characteristics`, characteristic);
    return response.data;
  }

  async updateInspectionCharacteristic(characteristicId: string, characteristic: Partial<Omit<InspectionCharacteristic, 'id' | 'inspectionPlanId'>>): Promise<InspectionCharacteristic> {
    const response = await axios.put<InspectionCharacteristic>(`${this.baseURL}/characteristics/${characteristicId}`, characteristic);
    return response.data;
  }

  async deleteInspectionCharacteristic(characteristicId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/characteristics/${characteristicId}`);
  }

  async addInspectionStep(planId: string, step: Omit<InspectionStep, 'id' | 'inspectionPlanId'>): Promise<InspectionStep> {
    const response = await axios.post<InspectionStep>(`${this.baseURL}/${planId}/steps`, step);
    return response.data;
  }

  async deleteInspectionStep(stepId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/steps/${stepId}`);
  }

  async createInspectionExecution(planId: string, execution: {
    inspectorId: string;
    batchNumber?: string;
    lotNumber?: string;
    workOrderId?: string;
    notes?: string;
  }): Promise<InspectionExecution> {
    const response = await axios.post<InspectionExecution>(`${this.baseURL}/${planId}/executions`, execution);
    return response.data;
  }

  async recordInspectionResult(executionId: string, result: {
    characteristicId: string;
    measuredValue?: string;
    result: 'PASS' | 'FAIL' | 'NA';
    disposition?: 'ACCEPT' | 'REJECT' | 'REWORK' | 'USE_AS_IS';
    notes?: string;
  }): Promise<InspectionResult> {
    const response = await axios.post<InspectionResult>(`${this.baseURL}/executions/${executionId}/results`, result);
    return response.data;
  }

  async completeInspectionExecution(executionId: string, completionNotes?: string): Promise<InspectionExecution> {
    const response = await axios.put<InspectionExecution>(`${this.baseURL}/executions/${executionId}/complete`, { completionNotes });
    return response.data;
  }

  async getInspectionExecutions(planId: string): Promise<InspectionExecution[]> {
    const response = await axios.get<InspectionExecution[]>(`${this.baseURL}/${planId}/executions`);
    return response.data;
  }

  async getInspectionStatistics(planId: string, days: number = 30): Promise<InspectionStatistics> {
    const response = await axios.get<InspectionStatistics>(`${this.baseURL}/${planId}/statistics`, { params: { days } });
    return response.data;
  }

  async approveInspectionPlan(id: string): Promise<InspectionPlan> {
    const response = await axios.post<InspectionPlan>(`${this.baseURL}/${id}/approve`);
    return response.data;
  }

  async rejectInspectionPlan(id: string, reason: string, comments: string): Promise<InspectionPlan> {
    const response = await axios.post<InspectionPlan>(`${this.baseURL}/${id}/reject`, { reason, comments });
    return response.data;
  }

  async getInspectionPlansByPartId(partId: string): Promise<InspectionPlan[]> {
    const response = await axios.get<InspectionPlan[]>(`${this.baseURL}/part/${partId}`);
    return response.data;
  }

  async getInspectionPlansByOperationId(operationId: string): Promise<InspectionPlan[]> {
    const response = await axios.get<InspectionPlan[]>(`${this.baseURL}/operation/${operationId}`);
    return response.data;
  }
}

export const inspectionPlanApi = new InspectionPlanApi();
export default inspectionPlanApi;