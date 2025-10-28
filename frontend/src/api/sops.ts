import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * TypeScript interfaces for SOPs (Standard Operating Procedures)
 */
export interface SOP {
  id: string;
  documentNumber: string;
  title: string;
  description?: string;
  sopType: 'SAFETY' | 'QUALITY' | 'OPERATIONAL' | 'MAINTENANCE' | 'ENVIRONMENTAL';
  partId?: string;
  operationId?: string;
  department?: string;
  scope?: string;
  purpose?: string;
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  safetyRequirements?: string;
  trainingRequired: boolean;
  reviewFrequencyDays: number;
  notes?: string;
  tags?: string[];
  categories?: string[];
  effectiveDate?: string;
  supersededDate?: string;
  ecoNumber?: string;
  approvedById?: string;
  approvedAt?: string;
  nextReviewDate?: string;
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
  steps?: SOPStep[];
  acknowledgments?: SOPAcknowledgment[];
  audits?: SOPAudit[];
}

export interface SOPStep {
  id: string;
  sopId: string;
  stepNumber: number;
  title: string;
  description?: string;
  instructions?: string;
  estimatedTime?: number;
  isRequired: boolean;
  safetyNotes?: string;
  warningLevel?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface SOPAcknowledgment {
  id: string;
  sopId: string;
  userId: string;
  acknowledgmentType: 'read' | 'trained' | 'certified';
  trainingScore?: number;
  assessmentPassed?: boolean;
  acknowledgedAt: string;
  notes?: string;
  user?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export interface SOPAudit {
  id: string;
  sopId: string;
  auditorId: string;
  auditType: 'compliance' | 'effectiveness' | 'training';
  auditDate: string;
  findings?: string;
  recommendations?: string;
  score?: number;
  nextAuditDate?: string;
  auditor?: {
    id: string;
    username: string;
    firstName: string;
    lastName: string;
  };
}

export interface TrainingStatus {
  hasRead: boolean;
  hasTraining: boolean;
  isCertified: boolean;
  lastAcknowledgment?: SOPAcknowledgment;
  trainingScore?: number;
  certificationExpiry?: string;
}

export interface CreateSOPRequest {
  title: string;
  description?: string;
  sopType?: 'SAFETY' | 'QUALITY' | 'OPERATIONAL' | 'MAINTENANCE' | 'ENVIRONMENTAL';
  partId?: string;
  operationId?: string;
  department?: string;
  scope?: string;
  purpose?: string;
  safetyRequirements?: string;
  trainingRequired?: boolean;
  reviewFrequencyDays?: number;
  notes?: string;
  tags?: string[];
  categories?: string[];
  steps?: Omit<SOPStep, 'id' | 'sopId'>[];
}

export interface SOPQueryParams {
  page?: number;
  pageSize?: number;
  status?: string;
  sopType?: string;
  partId?: string;
  operationId?: string;
  department?: string;
  search?: string;
  tags?: string[];
  categories?: string[];
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedSOPResponse {
  data: SOP[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TrainingComplianceReport {
  totalSOPs: number;
  compliantSOPs: number;
  overDueSOPs: number;
  complianceRate: number;
  departmentBreakdown: Array<{
    department: string;
    totalSOPs: number;
    compliantSOPs: number;
    complianceRate: number;
  }>;
}

/**
 * SOP API client
 */
class SOPApi {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/sops`;
  }

  async createSOP(data: CreateSOPRequest): Promise<SOP> {
    const response = await axios.post<SOP>(this.baseURL, data);
    return response.data;
  }

  async getSOPs(params?: SOPQueryParams): Promise<PaginatedSOPResponse> {
    const response = await axios.get<PaginatedSOPResponse>(this.baseURL, { params });
    return response.data;
  }

  async getSOPById(id: string): Promise<SOP> {
    const response = await axios.get<SOP>(`${this.baseURL}/${id}`);
    return response.data;
  }

  async updateSOP(id: string, data: Partial<CreateSOPRequest>): Promise<SOP> {
    const response = await axios.put<SOP>(`${this.baseURL}/${id}`, data);
    return response.data;
  }

  async deleteSOP(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/${id}`);
  }

  async addSOPStep(sopId: string, step: Omit<SOPStep, 'id' | 'sopId'>): Promise<SOPStep> {
    const response = await axios.post<SOPStep>(`${this.baseURL}/${sopId}/steps`, step);
    return response.data;
  }

  async updateSOPStep(stepId: string, step: Partial<Omit<SOPStep, 'id' | 'sopId'>>): Promise<SOPStep> {
    const response = await axios.put<SOPStep>(`${this.baseURL}/steps/${stepId}`, step);
    return response.data;
  }

  async deleteSOPStep(stepId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/steps/${stepId}`);
  }

  async createSOPAcknowledgment(sopId: string, acknowledgment: {
    userId: string;
    acknowledgmentType: 'read' | 'trained' | 'certified';
    trainingScore?: number;
    assessmentPassed?: boolean;
    notes?: string;
  }): Promise<SOPAcknowledgment> {
    const response = await axios.post<SOPAcknowledgment>(`${this.baseURL}/${sopId}/acknowledgments`, acknowledgment);
    return response.data;
  }

  async getSOPAcknowledgments(sopId: string, params?: {
    userId?: string;
    acknowledgmentType?: string;
  }): Promise<SOPAcknowledgment[]> {
    const response = await axios.get<SOPAcknowledgment[]>(`${this.baseURL}/${sopId}/acknowledgments`, { params });
    return response.data;
  }

  async getUserTrainingStatus(sopId: string, userId: string): Promise<TrainingStatus> {
    const response = await axios.get<TrainingStatus>(`${this.baseURL}/${sopId}/training-status/${userId}`);
    return response.data;
  }

  async createSOPAudit(sopId: string, audit: {
    auditorId: string;
    auditType: 'compliance' | 'effectiveness' | 'training';
    findings?: string;
    recommendations?: string;
    score?: number;
    nextAuditDate?: string;
  }): Promise<SOPAudit> {
    const response = await axios.post<SOPAudit>(`${this.baseURL}/${sopId}/audits`, audit);
    return response.data;
  }

  async getSOPAudits(sopId: string): Promise<SOPAudit[]> {
    const response = await axios.get<SOPAudit[]>(`${this.baseURL}/${sopId}/audits`);
    return response.data;
  }

  async getSOPsDueForReview(params?: {
    department?: string;
    daysAhead?: number;
  }): Promise<SOP[]> {
    const response = await axios.get<SOP[]>(`${this.baseURL}/due-for-review`, { params });
    return response.data;
  }

  async getTrainingComplianceReport(params?: {
    department?: string;
    sopType?: string;
  }): Promise<TrainingComplianceReport> {
    const response = await axios.get<TrainingComplianceReport>(`${this.baseURL}/training-compliance`, { params });
    return response.data;
  }

  async scheduleSOPReview(sopId: string, data: {
    reviewDate: string;
    reviewerIds?: string[];
    notes?: string;
  }): Promise<{ message: string }> {
    const response = await axios.post<{ message: string }>(`${this.baseURL}/${sopId}/schedule-review`, data);
    return response.data;
  }

  async approveSOP(id: string): Promise<SOP> {
    const response = await axios.post<SOP>(`${this.baseURL}/${id}/approve`);
    return response.data;
  }

  async rejectSOP(id: string, reason: string, comments: string): Promise<SOP> {
    const response = await axios.post<SOP>(`${this.baseURL}/${id}/reject`, { reason, comments });
    return response.data;
  }

  async getSOPsByPartId(partId: string): Promise<SOP[]> {
    const response = await axios.get<SOP[]>(`${this.baseURL}/part/${partId}`);
    return response.data;
  }

  async getSOPsByOperationId(operationId: string): Promise<SOP[]> {
    const response = await axios.get<SOP[]>(`${this.baseURL}/operation/${operationId}`);
    return response.data;
  }

  async getSOPsByDepartment(department: string): Promise<SOP[]> {
    const response = await axios.get<SOP[]>(`${this.baseURL}/department/${department}`);
    return response.data;
  }
}

export const sopApi = new SOPApi();
export default sopApi;