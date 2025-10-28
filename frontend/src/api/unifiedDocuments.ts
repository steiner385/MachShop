import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * TypeScript interfaces for Unified Document Operations
 */
export type DocumentType = 'SETUP_SHEET' | 'INSPECTION_PLAN' | 'SOP' | 'TOOL_DRAWING' | 'WORK_INSTRUCTION';

export interface UnifiedDocument {
  id: string;
  type: DocumentType;
  documentNumber: string;
  title: string;
  description?: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  version: string;
  partId?: string;
  operationId?: string;
  workCenterId?: string;
  tags?: string[];
  categories?: string[];
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedById?: string;
}

export interface DocumentSearchParams {
  query?: string;
  documentTypes?: DocumentType[];
  partId?: string;
  operationId?: string;
  workCenterId?: string;
  status?: string[];
  tags?: string[];
  categories?: string[];
  dateFrom?: string;
  dateTo?: string;
  createdBy?: string;
  approvedBy?: string;
  page?: number;
  pageSize?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'documentNumber' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export interface DocumentSearchResponse {
  documents: UnifiedDocument[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  facets: {
    documentTypes: Array<{ type: DocumentType; count: number }>;
    statuses: Array<{ status: string; count: number }>;
    tags: Array<{ tag: string; count: number }>;
    categories: Array<{ category: string; count: number }>;
  };
}

export interface ImpactAnalysis {
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  documentsByStatus: Record<string, number>;
  affectedDocuments: UnifiedDocument[];
  recommendations: string[];
}

export interface DocumentTemplate {
  id: string;
  name: string;
  description?: string;
  documentType: DocumentType;
  templateData: Record<string, any>;
  tags?: string[];
  categories?: string[];
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentTemplateRequest {
  name: string;
  description?: string;
  documentType: DocumentType;
  templateData: Record<string, any>;
  tags?: string[];
  categories?: string[];
  isPublic?: boolean;
}

export interface DocumentTemplateQueryParams {
  documentType?: DocumentType;
  createdBy?: string;
  isPublic?: boolean;
  tags?: string[];
  categories?: string[];
  search?: string;
}

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  results: Array<{
    documentId: string;
    success: boolean;
    error?: string;
  }>;
}

export interface DocumentAnalytics {
  totalDocuments: number;
  documentsByType: Record<DocumentType, number>;
  documentsByStatus: Record<string, number>;
  creationTrend: Array<{
    date: string;
    count: number;
    byType: Record<DocumentType, number>;
  }>;
  approvalTrend: Array<{
    date: string;
    approved: number;
    rejected: number;
  }>;
  topTags: Array<{ tag: string; count: number }>;
  topCategories: Array<{ category: string; count: number }>;
}

export interface SystemHealthCheck {
  status: 'healthy' | 'warning' | 'error';
  services: Array<{
    name: string;
    status: 'online' | 'offline' | 'degraded';
    responseTime?: number;
    lastCheck: string;
  }>;
  metrics: {
    totalDocuments: number;
    documentsCreatedToday: number;
    pendingApprovals: number;
    overdueReviews: number;
  };
}

/**
 * Unified Document API client
 */
class UnifiedDocumentApi {
  private baseURL: string;

  constructor() {
    this.baseURL = `${API_BASE_URL}/documents`;
  }

  async searchDocuments(params: DocumentSearchParams): Promise<DocumentSearchResponse> {
    const response = await axios.post<DocumentSearchResponse>(`${this.baseURL}/search`, params);
    return response.data;
  }

  async searchDocumentsSimple(params: Omit<DocumentSearchParams, 'page' | 'pageSize'> & { q?: string }): Promise<DocumentSearchResponse> {
    const response = await axios.get<DocumentSearchResponse>(`${this.baseURL}/search`, { params });
    return response.data;
  }

  async getDocumentsByPart(partId: string, documentTypes?: DocumentType[]): Promise<UnifiedDocument[]> {
    const response = await axios.get<UnifiedDocument[]>(`${this.baseURL}/part/${partId}`, {
      params: { types: documentTypes?.join(',') }
    });
    return response.data;
  }

  async getDocumentsByOperation(operationId: string, documentTypes?: DocumentType[]): Promise<UnifiedDocument[]> {
    const response = await axios.get<UnifiedDocument[]>(`${this.baseURL}/operation/${operationId}`, {
      params: { types: documentTypes?.join(',') }
    });
    return response.data;
  }

  async getDocumentsByWorkCenter(workCenterId: string, documentTypes?: DocumentType[]): Promise<UnifiedDocument[]> {
    const response = await axios.get<UnifiedDocument[]>(`${this.baseURL}/work-center/${workCenterId}`, {
      params: { types: documentTypes?.join(',') }
    });
    return response.data;
  }

  async analyzePartImpact(partId: string): Promise<ImpactAnalysis> {
    const response = await axios.get<ImpactAnalysis>(`${this.baseURL}/impact-analysis/part/${partId}`);
    return response.data;
  }

  async analyzeOperationImpact(operationId: string): Promise<ImpactAnalysis> {
    const response = await axios.get<ImpactAnalysis>(`${this.baseURL}/impact-analysis/operation/${operationId}`);
    return response.data;
  }

  async analyzeWorkCenterImpact(workCenterId: string): Promise<ImpactAnalysis> {
    const response = await axios.get<ImpactAnalysis>(`${this.baseURL}/impact-analysis/work-center/${workCenterId}`);
    return response.data;
  }

  async bulkUpdateDocuments(documentIds: string[], updates: {
    tags?: string[];
    categories?: string[];
    status?: string;
  }): Promise<BulkOperationResult> {
    const response = await axios.put<BulkOperationResult>(`${this.baseURL}/bulk-update`, {
      documentIds,
      updates
    });
    return response.data;
  }

  async bulkApproveDocuments(documentIds: string[]): Promise<BulkOperationResult> {
    const response = await axios.post<BulkOperationResult>(`${this.baseURL}/bulk-approve`, {
      documentIds
    });
    return response.data;
  }

  // Template operations
  async createDocumentTemplate(data: CreateDocumentTemplateRequest): Promise<DocumentTemplate> {
    const response = await axios.post<DocumentTemplate>(`${this.baseURL}/templates`, data);
    return response.data;
  }

  async getDocumentTemplates(params?: DocumentTemplateQueryParams): Promise<DocumentTemplate[]> {
    const response = await axios.get<DocumentTemplate[]>(`${this.baseURL}/templates`, { params });
    return response.data;
  }

  async getDocumentTemplateById(id: string): Promise<DocumentTemplate> {
    const response = await axios.get<DocumentTemplate>(`${this.baseURL}/templates/${id}`);
    return response.data;
  }

  async updateDocumentTemplate(id: string, data: Partial<CreateDocumentTemplateRequest>): Promise<DocumentTemplate> {
    const response = await axios.put<DocumentTemplate>(`${this.baseURL}/templates/${id}`, data);
    return response.data;
  }

  async deleteDocumentTemplate(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/templates/${id}`);
  }

  async createDocumentFromTemplate(templateId: string, customData?: Record<string, any>): Promise<UnifiedDocument> {
    const response = await axios.post<UnifiedDocument>(`${this.baseURL}/templates/${templateId}/use`, {
      customData
    });
    return response.data;
  }

  // Analytics and reporting
  async getDocumentAnalytics(params?: {
    days?: number;
    departmentFilter?: string;
  }): Promise<DocumentAnalytics> {
    const response = await axios.get<DocumentAnalytics>(`${this.baseURL}/analytics/summary`, { params });
    return response.data;
  }

  async getDocumentTrends(params?: {
    days?: number;
    documentType?: DocumentType;
  }): Promise<{
    creationTrend: Array<{ date: string; count: number }>;
    approvalTrend: Array<{ date: string; approved: number; rejected: number }>;
  }> {
    const response = await axios.get(`${this.baseURL}/analytics/trends`, { params });
    return response.data;
  }

  async getDocumentStatusDistribution(documentType?: DocumentType): Promise<Record<string, number>> {
    const response = await axios.get<Record<string, number>>(`${this.baseURL}/analytics/status-distribution`, {
      params: { documentType }
    });
    return response.data;
  }

  // Utility endpoints
  async getDocumentTypes(): Promise<Array<{ type: DocumentType; count: number }>> {
    const response = await axios.get<Array<{ type: DocumentType; count: number }>>(`${this.baseURL}/types`);
    return response.data;
  }

  async getAllDocumentTags(documentType?: DocumentType): Promise<string[]> {
    const response = await axios.get<string[]>(`${this.baseURL}/tags`, {
      params: { documentType }
    });
    return response.data;
  }

  async getAllDocumentCategories(documentType?: DocumentType): Promise<string[]> {
    const response = await axios.get<string[]>(`${this.baseURL}/categories`, {
      params: { documentType }
    });
    return response.data;
  }

  async getSystemHealthCheck(): Promise<SystemHealthCheck> {
    const response = await axios.get<SystemHealthCheck>(`${this.baseURL}/health-check`);
    return response.data;
  }
}

export const unifiedDocumentApi = new UnifiedDocumentApi();
export default unifiedDocumentApi;