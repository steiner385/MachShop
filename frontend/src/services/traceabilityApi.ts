import { apiClient } from './apiClient';

// Genealogy Node Types
export interface GenealogyNode {
  id: string;
  serialNumber: string;
  partNumber: string;
  partName: string;
  lotNumber?: string;
  quantity?: number;
  children?: GenealogyNode[];
}

// Manufacturing History Entry
export interface ManufacturingHistoryEntry {
  id: string;
  operationNumber: string;
  operationName: string;
  workOrderNumber: string;
  machineId?: string;
  machineName?: string;
  operatorId: string;
  operatorName: string;
  startTime: string;
  endTime: string;
  status: 'COMPLETED' | 'IN_PROGRESS' | 'FAILED';
  notes?: string;
}

// Material Certificate
export interface MaterialCertificate {
  id: string;
  certificateNumber: string;
  supplierName: string;
  materialType: string;
  lotNumber: string;
  heatNumber?: string;
  receivedDate: string;
  expiryDate?: string;
  documentUrl?: string;
}

// Quality Record
export interface QualityRecord {
  id: string;
  inspectionType: string;
  inspectionDate: string;
  inspector: string;
  result: 'PASS' | 'FAIL' | 'CONDITIONAL';
  notes?: string;
  documentUrl?: string;
}

// Traceability Details (complete record)
export interface TraceabilityDetails {
  serialNumber: string;
  partNumber: string;
  partName: string;
  genealogy: GenealogyNode;
  manufacturingHistory: ManufacturingHistoryEntry[];
  materialCertificates: MaterialCertificate[];
  qualityRecords: QualityRecord[];
}

// Forward Traceability Result
export interface ForwardTraceabilityResult {
  materialLot: string;
  usedInParts: Array<{
    serialNumber: string;
    partNumber: string;
    partName: string;
    workOrderNumber: string;
    dateUsed: string;
  }>;
}

// Search Filters
export interface TraceabilitySearchFilters {
  serialNumber?: string;
  partNumber?: string;
  lotNumber?: string;
  workOrderNumber?: string;
  startDate?: string;
  endDate?: string;
}

/**
 * Traceability API Service
 * Provides access to material traceability, genealogy, and manufacturing history
 */
export const traceabilityApi = {
  /**
   * Get complete traceability details for a serial number
   * Includes genealogy, manufacturing history, certificates, and quality records
   */
  async getTraceabilityBySerialNumber(serialNumber: string): Promise<TraceabilityDetails> {
    const response = await apiClient.get<TraceabilityDetails>(
      `/traceability/serial/${serialNumber}`
    );
    return response.data;
  },

  /**
   * Get genealogy tree for a serial number (backward traceability)
   */
  async getGenealogy(serialNumber: string): Promise<GenealogyNode> {
    const response = await apiClient.get<GenealogyNode>(
      `/traceability/genealogy/${serialNumber}`
    );
    return response.data;
  },

  /**
   * Get manufacturing history timeline for a serial number
   */
  async getManufacturingHistory(serialNumber: string): Promise<ManufacturingHistoryEntry[]> {
    const response = await apiClient.get<ManufacturingHistoryEntry[]>(
      `/traceability/history/${serialNumber}`
    );
    return response.data;
  },

  /**
   * Get material certificates for a serial number
   */
  async getMaterialCertificates(serialNumber: string): Promise<MaterialCertificate[]> {
    const response = await apiClient.get<MaterialCertificate[]>(
      `/traceability/certificates/${serialNumber}`
    );
    return response.data;
  },

  /**
   * Get quality records for a serial number
   */
  async getQualityRecords(serialNumber: string): Promise<QualityRecord[]> {
    const response = await apiClient.get<QualityRecord[]>(
      `/traceability/quality/${serialNumber}`
    );
    return response.data;
  },

  /**
   * Get forward traceability - find where a material lot was used
   */
  async getForwardTraceability(materialLot: string): Promise<ForwardTraceabilityResult> {
    const response = await apiClient.get<ForwardTraceabilityResult>(
      `/traceability/forward/${materialLot}`
    );
    return response.data;
  },

  /**
   * Search for traceability records with filters
   */
  async searchTraceability(
    filters: TraceabilitySearchFilters
  ): Promise<Array<{ serialNumber: string; partNumber: string; partName: string }>> {
    const response = await apiClient.get('/traceability/search', {
      params: filters,
    });
    return response.data;
  },
};
