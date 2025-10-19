import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api/v1';

/**
 * FAI API Client
 *
 * Provides methods for interacting with AS9102 First Article Inspection endpoints.
 */

// Types
export interface FAIReport {
  id: string;
  faiNumber: string;
  partId: string;
  workOrderId?: string;
  inspectionId?: string;
  status: 'IN_PROGRESS' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  revisionLevel?: string;
  form1Data?: any;
  form2Data?: any;
  createdById?: string;
  reviewedById?: string;
  approvedById?: string;
  createdAt: Date;
  updatedAt: Date;
  characteristics?: FAICharacteristic[];
}

export interface FAICharacteristic {
  id: string;
  faiReportId: string;
  characteristicNumber: number;
  characteristic: string;
  specification: string;
  nominalValue?: number;
  upperLimit?: number;
  lowerLimit?: number;
  toleranceType?: string;
  measuredValues: number[];
  actualValue?: number;
  deviation?: number;
  result?: 'PASS' | 'FAIL' | 'N/A';
  inspectionMethod?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateFAIReportInput {
  faiNumber: string;
  partId: string;
  workOrderId?: string;
  inspectionId?: string;
  revisionLevel?: string;
  form1Data?: any;
  form2Data?: any;
}

export interface UpdateFAIReportInput {
  status?: 'IN_PROGRESS' | 'REVIEW' | 'APPROVED' | 'REJECTED' | 'SUPERSEDED';
  revisionLevel?: string;
  form1Data?: any;
  form2Data?: any;
  reviewedById?: string;
}

export interface CreateCharacteristicInput {
  characteristicNumber: number;
  characteristic: string;
  specification: string;
  nominalValue?: number;
  upperLimit?: number;
  lowerLimit?: number;
  toleranceType?: 'BILATERAL' | 'UNILATERAL_PLUS' | 'UNILATERAL_MINUS' | 'NOMINAL';
  inspectionMethod?: string;
  measuredValues?: number[];
  notes?: string;
}

export interface UpdateCharacteristicInput {
  characteristic?: string;
  specification?: string;
  nominalValue?: number;
  upperLimit?: number;
  lowerLimit?: number;
  toleranceType?: string;
  inspectionMethod?: string;
  measuredValues?: number[];
  notes?: string;
}

export interface ListFAIReportsParams {
  page?: number;
  limit?: number;
  status?: string;
  partId?: string;
  search?: string;
}

export interface ListFAIReportsResponse {
  reports: FAIReport[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

class FAIAPIClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  /**
   * Create a new FAI report
   */
  async createFAIReport(data: CreateFAIReportInput): Promise<FAIReport> {
    const response = await axios.post(`${this.baseURL}/fai`, data);
    return response.data;
  }

  /**
   * Get FAI report by ID
   */
  async getFAIReport(id: string): Promise<FAIReport> {
    const response = await axios.get(`${this.baseURL}/fai/${id}`);
    return response.data;
  }

  /**
   * Get FAI report by FAI number
   */
  async getFAIReportByNumber(faiNumber: string): Promise<FAIReport> {
    const response = await axios.get(`${this.baseURL}/fai/number/${faiNumber}`);
    return response.data;
  }

  /**
   * List FAI reports with pagination and filters
   */
  async listFAIReports(params?: ListFAIReportsParams): Promise<ListFAIReportsResponse> {
    const response = await axios.get(`${this.baseURL}/fai`, { params });
    return response.data;
  }

  /**
   * Update FAI report
   */
  async updateFAIReport(id: string, data: UpdateFAIReportInput): Promise<FAIReport> {
    const response = await axios.put(`${this.baseURL}/fai/${id}`, data);
    return response.data;
  }

  /**
   * Delete FAI report
   */
  async deleteFAIReport(id: string): Promise<void> {
    await axios.delete(`${this.baseURL}/fai/${id}`);
  }

  /**
   * Add characteristic to FAI report
   */
  async addCharacteristic(faiReportId: string, data: CreateCharacteristicInput): Promise<FAICharacteristic> {
    const response = await axios.post(`${this.baseURL}/fai/${faiReportId}/characteristics`, data);
    return response.data;
  }

  /**
   * Get characteristics for FAI report
   */
  async getCharacteristics(faiReportId: string): Promise<FAICharacteristic[]> {
    const response = await axios.get(`${this.baseURL}/fai/${faiReportId}/characteristics`);
    return response.data;
  }

  /**
   * Update characteristic
   */
  async updateCharacteristic(
    faiReportId: string,
    characteristicId: string,
    data: UpdateCharacteristicInput
  ): Promise<FAICharacteristic> {
    const response = await axios.put(
      `${this.baseURL}/fai/${faiReportId}/characteristics/${characteristicId}`,
      data
    );
    return response.data;
  }

  /**
   * Delete characteristic
   */
  async deleteCharacteristic(faiReportId: string, characteristicId: string): Promise<void> {
    await axios.delete(`${this.baseURL}/fai/${faiReportId}/characteristics/${characteristicId}`);
  }

  /**
   * Approve FAI report
   */
  async approveFAIReport(id: string): Promise<FAIReport> {
    const response = await axios.post(`${this.baseURL}/fai/${id}/approve`);
    return response.data;
  }
}

export const faiAPI = new FAIAPIClient(API_BASE_URL);
