import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * TypeScript interfaces for Setup Sheets
 */
export interface SetupSheet {
  id: string;
  documentNumber: string;
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  machineId?: string;
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  setupTime?: number;
  teardownTime?: number;
  safetyRequirements?: string;
  qualityRequirements?: string;
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
  steps?: SetupStep[];
  parameters?: SetupParameter[];
  tools?: SetupTool[];
  executions?: SetupExecution[];
}

export interface SetupStep {
  id: string;
  setupSheetId: string;
  stepNumber: number;
  title: string;
  description?: string;
  instructions?: string;
  estimatedTime?: number;
  isRequired: boolean;
  safetyNotes?: string;
  qualityNotes?: string;
}

export interface SetupParameter {
  id: string;
  setupSheetId: string;
  parameterName: string;
  targetValue: string;
  tolerance?: string;
  unitOfMeasure?: string;
  measurementMethod?: string;
  isRequired: boolean;
  notes?: string;
}

export interface SetupTool {
  id: string;
  setupSheetId: string;
  toolName: string;
  toolNumber?: string;
  quantity: number;
  isRequired: boolean;
  notes?: string;
}

export interface SetupExecution {
  id: string;
  setupSheetId: string;
  operatorId: string;
  startedAt: string;
  completedAt?: string;
  machineId?: string;
  workOrderId?: string;
  lotNumber?: string;
  actualSetupTime?: number;
  actualTeardownTime?: number;
  isFirstPieceGood?: boolean;
  firstPieceNotes?: string;
  completionNotes?: string;
  notes?: string;
}

export interface CreateSetupSheetRequest {
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  machineId?: string;
  setupTime?: number;
  teardownTime?: number;
  safetyRequirements?: string;
  qualityRequirements?: string;
  notes?: string;
  tags?: string[];
  categories?: string[];
  steps?: Omit<SetupStep, 'id' | 'setupSheetId'>[];
}

export interface UpdateSetupSheetRequest {
  title?: string;
  description?: string;
  partId?: string;
  operationId?: string;
  machineId?: string;
  setupTime?: number;
  teardownTime?: number;
  safetyRequirements?: string;
  qualityRequirements?: string;
  notes?: string;
  tags?: string[];
  categories?: string[];
}

export interface SetupSheetQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  partId?: string;
  operationId?: string;
  machineId?: string;
  search?: string;
  tags?: string[];
  categories?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedSetupSheetResponse {
  data: SetupSheet[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Setup Sheet API client
 */
class SetupSheetApi {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/setup-sheets`;
  }

  async createSetupSheet(data: CreateSetupSheetRequest): Promise<SetupSheet> {
    const response = await axios.post<SetupSheet>(this.baseURL, data);
    return response.data;
  }

  async getSetupSheets(params?: SetupSheetQueryParams): Promise<PaginatedSetupSheetResponse> {
    const response = await axios.get<PaginatedSetupSheetResponse>(this.baseURL, { params });
    return response.data;
  }

  async getSetupSheetById(id: string): Promise<SetupSheet> {
    const response = await axios.get<SetupSheet>(`${this.baseURL}/${id}`);
    return response.data;
  }

  async updateSetupSheet(id: string, data: UpdateSetupSheetRequest): Promise<SetupSheet> {
    const response = await axios.put<SetupSheet>(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  async deleteSetupSheet(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`);
  }

  async addSetupStep(setupSheetId: string, step: Omit<SetupStep, 'id' | 'setupSheetId'>): Promise<SetupStep> {
    const response = await axios.post<SetupStep>(`${this.baseURL}/${setupSheetId}/steps`, step);
    return response.data;
  }

  async updateSetupStep(stepId: string, step: Partial<Omit<SetupStep, 'id' | 'setupSheetId'>>): Promise<SetupStep> {
    const response = await axios.put<SetupStep>(`${this.baseURL}/steps/${stepId}`, step);
    return response.data;
  }

  async deleteSetupStep(stepId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/steps/${stepId}`);
  }

  async addSetupParameter(setupSheetId: string, parameter: Omit<SetupParameter, 'id' | 'setupSheetId'>): Promise<SetupParameter> {
    const response = await axios.post<SetupParameter>(`${this.baseURL}/${setupSheetId}/parameters`, parameter);
    return response.data;
  }

  async deleteSetupParameter(parameterId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/parameters/${parameterId}`);
  }

  async addSetupTool(setupSheetId: string, tool: Omit<SetupTool, 'id' | 'setupSheetId'>): Promise<SetupTool> {
    const response = await axios.post<SetupTool>(`${this.baseURL}/${setupSheetId}/tools`, tool);
    return response.data;
  }

  async deleteSetupTool(toolId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/tools/${toolId}`);
  }

  async startSetupExecution(setupSheetId: string, execution: {
    operatorId: string;
    machineId?: string;
    workOrderId?: string;
    lotNumber?: string;
    notes?: string;
  }): Promise<SetupExecution> {
    const response = await axios.post<SetupExecution>(`${this.baseURL}/${setupSheetId}/executions`, execution);
    return response.data;
  }

  async completeSetupExecution(executionId: string, data: {
    actualSetupTime?: number;
    actualTeardownTime?: number;
    isFirstPieceGood?: boolean;
    firstPieceNotes?: string;
    completionNotes?: string;
  }): Promise<SetupExecution> {
    const response = await axios.put<SetupExecution>(`${this.baseURL}/executions/${executionId}/complete`, data);
    return response.data;
  }

  async getSetupExecutions(setupSheetId: string): Promise<SetupExecution[]> {
    const response = await axios.get<SetupExecution[]>(`${this.baseURL}/${setupSheetId}/executions`);
    return response.data;
  }

  async approveSetupSheet(id: string): Promise<SetupSheet> {
    const response = await axios.post<SetupSheet>(`${this.baseURL}/${id}/approve`);
    return response.data;
  }

  async rejectSetupSheet(id: string, reason: string, comments: string): Promise<SetupSheet> {
    const response = await axios.post<SetupSheet>(`${this.baseURL}/${id}/reject`, { reason, comments });
    return response.data;
  }

  async getSetupSheetsByPartId(partId: string): Promise<SetupSheet[]> {
    const response = await axios.get<SetupSheet[]>(`${this.baseURL}/part/${partId}`);
    return response.data;
  }

  async getSetupSheetsByOperationId(operationId: string): Promise<SetupSheet[]> {
    const response = await axios.get<SetupSheet[]>(`${this.baseURL}/operation/${operationId}`);
    return response.data;
  }
}

export const setupSheetApi = new SetupSheetApi();
export default setupSheetApi;