import { apiClient } from './apiClient';

export interface WorkOrder {
  id: string;
  workOrderNumber: string;
  partNumber: string;
  partName: string;
  quantity: number;
  completed: number;
  scrap?: number;
  status: 'CREATED' | 'RELEASED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD';
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  dueDate: string;
  scheduledStartDate?: string;
  scheduledEndDate?: string;
  customerOrder?: string;
  createdDate: string;
  startedDate?: string;
  completedDate?: string;
  progress: number;
  operations?: WorkOrderOperation[];
}

export interface WorkOrderOperation {
  id: string;
  operationNumber: number;
  operationName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';
  quantity: number;
  completed: number;
  scrap: number;
  progress: number;
  startedAt?: string;
  completedAt?: string;
}

export interface CreateWorkOrderRequest {
  partNumber: string;
  quantity: number;
  priority: WorkOrder['priority'];
  dueDate?: string;
  customerOrder?: string;
}

export interface UpdateWorkOrderRequest {
  quantity?: number;
  priority?: WorkOrder['priority'];
  dueDate?: string;
  status?: WorkOrder['status'];
}

export interface WorkOrderFilters {
  status?: WorkOrder['status'];
  priority?: WorkOrder['priority'];
  partNumber?: string;
  dueAfter?: string;
  dueBefore?: string;
  page?: number;
  limit?: number;
}

export interface WorkOrderListResponse {
  workOrders: WorkOrder[];
  total: number;
  page: number;
  totalPages: number;
}

class WorkOrderApiService {
  private readonly baseUrl = '/workorders';

  async getWorkOrders(filters?: WorkOrderFilters): Promise<WorkOrderListResponse> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }

    const response: any = await apiClient.get(`${this.baseUrl}?${params.toString()}`);
    
    // Transform backend response to frontend format
    return {
      workOrders: response.data.map((wo: any) => ({
        id: wo.id,
        workOrderNumber: wo.workOrderNumber,
        partNumber: wo.partNumber,
        partName: wo.partNumber, // Use partNumber as partName for now
        quantity: wo.quantityOrdered,
        completed: wo.quantityCompleted,
        scrap: wo.quantityScrapped,
        status: wo.status,
        priority: wo.priority,
        dueDate: wo.dueDate,
        customerOrder: wo.customerOrder,
        createdDate: wo.createdAt,
        startedDate: wo.actualStartDate,
        completedDate: wo.actualEndDate,
        progress: wo.completionPercentage || 0,
      })),
      total: response.pagination?.total || response.data.length,
      page: response.pagination?.page || 1,
      totalPages: response.pagination?.totalPages || 1,
    };
  }

  async getWorkOrderById(id: string): Promise<WorkOrder> {
    return apiClient.get(`${this.baseUrl}/${id}`);
  }

  async createWorkOrder(request: CreateWorkOrderRequest): Promise<WorkOrder> {
    return apiClient.post(this.baseUrl, request);
  }

  async updateWorkOrder(id: string, updates: UpdateWorkOrderRequest): Promise<WorkOrder> {
    return apiClient.patch(`${this.baseUrl}/${id}`, updates);
  }

  async deleteWorkOrder(id: string): Promise<void> {
    return apiClient.delete(`${this.baseUrl}/${id}`);
  }

  async releaseWorkOrder(id: string): Promise<WorkOrder> {
    return apiClient.post(`${this.baseUrl}/${id}/release`);
  }

  async startWorkOrder(id: string): Promise<WorkOrder> {
    return apiClient.post(`${this.baseUrl}/${id}/start`);
  }

  async completeWorkOrder(id: string): Promise<WorkOrder> {
    return apiClient.post(`${this.baseUrl}/${id}/complete`);
  }

  async cancelWorkOrder(id: string, reason?: string): Promise<WorkOrder> {
    return apiClient.post(`${this.baseUrl}/${id}/cancel`, { reason });
  }

  async updateProgress(id: string, progress: {
    operationId: string;
    completed: number;
    scrap?: number;
  }): Promise<WorkOrder> {
    return apiClient.post(`${this.baseUrl}/${id}/progress`, progress);
  }

  async getWorkOrderOperations(id: string): Promise<WorkOrderOperation[]> {
    return apiClient.get(`${this.baseUrl}/${id}/operations`);
  }

  async startOperation(workOrderId: string, operationId: string): Promise<WorkOrderOperation> {
    return apiClient.post(`${this.baseUrl}/${workOrderId}/operations/${operationId}/start`);
  }

  async completeOperation(workOrderId: string, operationId: string, data: {
    completed: number;
    scrap?: number;
    notes?: string;
  }): Promise<WorkOrderOperation> {
    return apiClient.post(`${this.baseUrl}/${workOrderId}/operations/${operationId}/complete`, data);
  }

  async exportWorkOrders(filters?: WorkOrderFilters, format: 'csv' | 'excel' = 'csv'): Promise<void> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value.toString());
        }
      });
    }
    
    params.append('format', format);
    
    return apiClient.downloadFile(
      `${this.baseUrl}/export?${params.toString()}`,
      `work-orders-${new Date().toISOString().split('T')[0]}.${format}`
    );
  }

  // Mock data for development - remove when backend is ready
  async getMockWorkOrders(): Promise<WorkOrderListResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockData: WorkOrder[] = [
      {
        id: '1',
        workOrderNumber: 'WO-2024-001001',
        partNumber: 'ENG-BLADE-001',
        partName: 'Turbine Blade',
        quantity: 10,
        completed: 6,
        scrap: 1,
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        dueDate: '2024-02-15',
        customerOrder: 'CO-2024-001',
        createdDate: '2024-01-15',
        startedDate: '2024-01-20',
        progress: 60,
      },
      {
        id: '2',
        workOrderNumber: 'WO-2024-001002',
        partNumber: 'ENG-VANE-002',
        partName: 'Guide Vane',
        quantity: 25,
        completed: 0,
        status: 'RELEASED',
        priority: 'NORMAL',
        dueDate: '2024-03-01',
        customerOrder: 'CO-2024-002',
        createdDate: '2024-01-18',
        progress: 0,
      },
      {
        id: '3',
        workOrderNumber: 'WO-2024-001003',
        partNumber: 'ENG-DISK-003',
        partName: 'Compressor Disk',
        quantity: 5,
        completed: 5,
        status: 'COMPLETED',
        priority: 'HIGH',
        dueDate: '2024-01-28',
        customerOrder: 'CO-2024-003',
        createdDate: '2024-01-10',
        startedDate: '2024-01-15',
        completedDate: '2024-01-28',
        progress: 100,
      },
    ];

    return {
      workOrders: mockData,
      total: mockData.length,
      page: 1,
      totalPages: 1,
    };
  }
}

export const workOrderApi = new WorkOrderApiService();
export default workOrderApi;