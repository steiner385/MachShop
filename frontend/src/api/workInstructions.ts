import axios, { AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

/**
 * TypeScript interfaces for Work Instructions
 */

export interface ApprovalStep {
  id: string;
  title: string;
  description: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  approver?: {
    id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  approvedAt?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  comments?: string;
}

export interface WorkInstruction {
  id: string;
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  version: string;
  status: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  effectiveDate?: string;
  supersededDate?: string;
  ecoNumber?: string;
  approvedById?: string;
  approvedAt?: string;
  approvalHistory?: ApprovalStep[];
  createdById: string;
  updatedById: string;
  createdAt: string;
  updatedAt: string;
  steps?: WorkInstructionStep[];
}

export interface WorkInstructionStep {
  id: string;
  workInstructionId: string;
  stepNumber: number;
  title: string;
  content: string;
  imageUrls: string[];
  videoUrls: string[];
  attachmentUrls: string[];
  estimatedDuration?: number;
  isCritical: boolean;
  requiresSignature: boolean;
  dataEntryFields?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkInstructionInput {
  title: string;
  description?: string;
  partId?: string;
  operationId?: string;
  version?: string;
}

export interface UpdateWorkInstructionInput {
  title?: string;
  description?: string;
  partId?: string;
  operationId?: string;
  version?: string;
  status?: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  effectiveDate?: string;
  supersededDate?: string;
  ecoNumber?: string;
}

export interface CreateStepInput {
  stepNumber: number;
  title: string;
  content: string;
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  estimatedDuration?: number;
  isCritical?: boolean;
  requiresSignature?: boolean;
  dataEntryFields?: Record<string, any>;
}

export interface UpdateStepInput {
  title?: string;
  content?: string;
  imageUrls?: string[];
  videoUrls?: string[];
  attachmentUrls?: string[];
  estimatedDuration?: number;
  isCritical?: boolean;
  requiresSignature?: boolean;
  dataEntryFields?: Record<string, any>;
}

export interface ListWorkInstructionsParams {
  search?: string;
  status?: 'DRAFT' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED' | 'ARCHIVED';
  partId?: string;
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'version';
  sortOrder?: 'asc' | 'desc';
}

export interface ListWorkInstructionsResponse {
  workInstructions: WorkInstruction[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Create authenticated axios instance
 */
const createApiClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: API_BASE_URL,
    timeout: 15000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor to add auth token
  client.interceptors.request.use(
    (config) => {
      try {
        const authStorage = localStorage.getItem('mes-auth-storage');
        if (authStorage) {
          const parsed = JSON.parse(authStorage);
          const token = parsed.state?.token;
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
      } catch (error) {
        console.error('Error getting auth token', error);
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => response.data,
    (error) => {
      if (error.response?.data) {
        throw new Error(error.response.data.error || error.response.data.message || 'API request failed');
      }
      throw new Error(error.message || 'Network error');
    }
  );

  return client;
};

const apiClient = createApiClient();

/**
 * Work Instructions API
 */
export const workInstructionsAPI = {
  /**
   * List work instructions with filtering and pagination
   */
  list: async (params?: ListWorkInstructionsParams): Promise<ListWorkInstructionsResponse> => {
    return apiClient.get('/work-instructions', { params });
  },

  /**
   * Get work instruction by ID
   */
  getById: async (id: string): Promise<WorkInstruction> => {
    return apiClient.get(`/work-instructions/${id}`);
  },

  /**
   * Get work instructions by part ID
   */
  getByPartId: async (partId: string): Promise<WorkInstruction[]> => {
    return apiClient.get(`/work-instructions/part/${partId}`);
  },

  /**
   * Create a new work instruction
   */
  create: async (data: CreateWorkInstructionInput): Promise<WorkInstruction> => {
    return apiClient.post('/work-instructions', data);
  },

  /**
   * Update a work instruction
   */
  update: async (id: string, data: UpdateWorkInstructionInput): Promise<WorkInstruction> => {
    return apiClient.put(`/work-instructions/${id}`, data);
  },

  /**
   * Delete a work instruction
   */
  delete: async (id: string): Promise<void> => {
    return apiClient.delete(`/work-instructions/${id}`);
  },

  /**
   * Approve a work instruction
   */
  approve: async (id: string): Promise<WorkInstruction> => {
    return apiClient.post(`/work-instructions/${id}/approve`);
  },

  /**
   * Reject a work instruction with reason and comments
   */
  reject: async (id: string, reason: string, comments: string): Promise<WorkInstruction> => {
    return apiClient.post(`/work-instructions/${id}/reject`, { reason, comments });
  },

  /**
   * Add a step to a work instruction
   */
  addStep: async (workInstructionId: string, data: CreateStepInput): Promise<WorkInstructionStep> => {
    return apiClient.post(`/work-instructions/${workInstructionId}/steps`, data);
  },

  /**
   * Update a step
   */
  updateStep: async (
    workInstructionId: string,
    stepId: string,
    data: UpdateStepInput
  ): Promise<WorkInstructionStep> => {
    return apiClient.put(`/work-instructions/${workInstructionId}/steps/${stepId}`, data);
  },

  /**
   * Delete a step
   */
  deleteStep: async (workInstructionId: string, stepId: string): Promise<void> => {
    return apiClient.delete(`/work-instructions/${workInstructionId}/steps/${stepId}`);
  },

  /**
   * Reorder steps
   */
  reorderSteps: async (workInstructionId: string, stepOrders: { stepId: string; stepNumber: number }[]): Promise<void> => {
    return apiClient.post(`/work-instructions/${workInstructionId}/steps/reorder`, { stepOrders });
  },
};

/**
 * File Upload API
 */
export const uploadAPI = {
  /**
   * Upload a single file
   */
  uploadFile: async (file: File): Promise<{ url: string; filename: string; category: string }> => {
    const formData = new FormData();
    formData.append('file', file);

    return axios.post(`${API_BASE_URL}/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      timeout: 30000, // 30 seconds for file uploads
    }).then(res => res.data);
  },

  /**
   * Upload multiple files
   */
  uploadFiles: async (files: File[]): Promise<{ urls: string[]; filenames: string[]; categories: string[] }> => {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    return axios.post(`${API_BASE_URL}/upload/multiple`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${getAuthToken()}`,
      },
      timeout: 60000, // 60 seconds for multiple files
    }).then(res => res.data);
  },

  /**
   * Delete a file
   */
  deleteFile: async (filename: string): Promise<void> => {
    return apiClient.delete(`/upload/${filename}`);
  },
};

/**
 * Helper function to get auth token
 */
function getAuthToken(): string | null {
  try {
    const authStorage = localStorage.getItem('mes-auth-storage');
    if (authStorage) {
      const parsed = JSON.parse(authStorage);
      return parsed.state?.token || null;
    }
    return null;
  } catch {
    return null;
  }
}

export default workInstructionsAPI;
