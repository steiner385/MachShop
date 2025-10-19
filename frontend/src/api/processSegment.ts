/**
 * Process Segment API Client
 * API calls for ISA-95 Process Segment management
 */

import axios from 'axios';
import type {
  ProcessSegment,
  ProcessSegmentParameter,
  ProcessSegmentDependency,
  PersonnelSegmentSpecification,
  EquipmentSegmentSpecification,
  MaterialSegmentSpecification,
  PhysicalAssetSegmentSpecification,
  CreateProcessSegmentData,
  UpdateProcessSegmentData,
  CreateProcessSegmentParameterData,
  CreateProcessSegmentDependencyData,
  ProcessSegmentStatistics,
  ProcessSegmentHierarchyNode,
  TotalTimeResult,
  ProcessSegmentFilters,
} from '@/types/processSegment';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const BASE_PATH = '/api/process-segments';

// ============================================================================
// Process Segment CRUD
// ============================================================================

export const createProcessSegment = async (
  data: CreateProcessSegmentData
): Promise<ProcessSegment> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}`, data);
  return response.data;
};

export const getProcessSegmentById = async (id: string): Promise<ProcessSegment> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${id}`);
  return response.data;
};

export const getProcessSegmentByCode = async (segmentCode: string): Promise<ProcessSegment> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/code/${segmentCode}`);
  return response.data;
};

export const getAllProcessSegments = async (
  filters?: ProcessSegmentFilters
): Promise<ProcessSegment[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}`, {
    params: filters,
  });
  return response.data;
};

export const updateProcessSegment = async (
  id: string,
  data: Partial<UpdateProcessSegmentData>
): Promise<ProcessSegment> => {
  const response = await axios.put(`${API_BASE_URL}${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteProcessSegment = async (id: string, hard: boolean = false): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${id}`, {
    params: { hard },
  });
};

// ============================================================================
// Hierarchy Navigation
// ============================================================================

export const getChildSegments = async (parentId: string): Promise<ProcessSegment[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${parentId}/children`);
  return response.data;
};

export const getRootSegments = async (): Promise<ProcessSegment[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/hierarchy/roots`);
  return response.data;
};

export const getHierarchyTree = async (segmentId: string): Promise<ProcessSegmentHierarchyNode> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/hierarchy-tree`);
  return response.data;
};

export const getAncestors = async (segmentId: string): Promise<ProcessSegment[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/ancestors`);
  return response.data;
};

// ============================================================================
// Process Segment Parameters
// ============================================================================

export const createParameter = async (
  segmentId: string,
  data: CreateProcessSegmentParameterData
): Promise<ProcessSegmentParameter> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}/${segmentId}/parameters`, data);
  return response.data;
};

export const getParameters = async (segmentId: string): Promise<ProcessSegmentParameter[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/parameters`);
  return response.data;
};

export const updateParameter = async (
  segmentId: string,
  parameterId: string,
  data: Partial<CreateProcessSegmentParameterData>
): Promise<ProcessSegmentParameter> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/parameters/${parameterId}`,
    data
  );
  return response.data;
};

export const deleteParameter = async (segmentId: string, parameterId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${segmentId}/parameters/${parameterId}`);
};

// ============================================================================
// Process Segment Dependencies
// ============================================================================

export const createDependency = async (
  segmentId: string,
  data: CreateProcessSegmentDependencyData
): Promise<ProcessSegmentDependency> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}/${segmentId}/dependencies`, data);
  return response.data;
};

export const getDependencies = async (segmentId: string): Promise<ProcessSegmentDependency[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/dependencies`);
  return response.data;
};

export const updateDependency = async (
  segmentId: string,
  dependencyId: string,
  data: Partial<CreateProcessSegmentDependencyData>
): Promise<ProcessSegmentDependency> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/dependencies/${dependencyId}`,
    data
  );
  return response.data;
};

export const deleteDependency = async (segmentId: string, dependencyId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${segmentId}/dependencies/${dependencyId}`);
};

// ============================================================================
// Personnel Specifications
// ============================================================================

export const createPersonnelSpec = async (
  segmentId: string,
  data: Partial<PersonnelSegmentSpecification>
): Promise<PersonnelSegmentSpecification> => {
  const response = await axios.post(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/personnel-specs`,
    data
  );
  return response.data;
};

export const getPersonnelSpecs = async (
  segmentId: string
): Promise<PersonnelSegmentSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/personnel-specs`);
  return response.data;
};

export const updatePersonnelSpec = async (
  segmentId: string,
  specId: string,
  data: Partial<PersonnelSegmentSpecification>
): Promise<PersonnelSegmentSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/personnel-specs/${specId}`,
    data
  );
  return response.data;
};

export const deletePersonnelSpec = async (segmentId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${segmentId}/personnel-specs/${specId}`);
};

// ============================================================================
// Equipment Specifications
// ============================================================================

export const createEquipmentSpec = async (
  segmentId: string,
  data: Partial<EquipmentSegmentSpecification>
): Promise<EquipmentSegmentSpecification> => {
  const response = await axios.post(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/equipment-specs`,
    data
  );
  return response.data;
};

export const getEquipmentSpecs = async (
  segmentId: string
): Promise<EquipmentSegmentSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/equipment-specs`);
  return response.data;
};

export const updateEquipmentSpec = async (
  segmentId: string,
  specId: string,
  data: Partial<EquipmentSegmentSpecification>
): Promise<EquipmentSegmentSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/equipment-specs/${specId}`,
    data
  );
  return response.data;
};

export const deleteEquipmentSpec = async (segmentId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${segmentId}/equipment-specs/${specId}`);
};

// ============================================================================
// Material Specifications
// ============================================================================

export const createMaterialSpec = async (
  segmentId: string,
  data: Partial<MaterialSegmentSpecification>
): Promise<MaterialSegmentSpecification> => {
  const response = await axios.post(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/material-specs`,
    data
  );
  return response.data;
};

export const getMaterialSpecs = async (
  segmentId: string
): Promise<MaterialSegmentSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/material-specs`);
  return response.data;
};

export const updateMaterialSpec = async (
  segmentId: string,
  specId: string,
  data: Partial<MaterialSegmentSpecification>
): Promise<MaterialSegmentSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/material-specs/${specId}`,
    data
  );
  return response.data;
};

export const deleteMaterialSpec = async (segmentId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${segmentId}/material-specs/${specId}`);
};

// ============================================================================
// Physical Asset Specifications
// ============================================================================

export const createPhysicalAssetSpec = async (
  segmentId: string,
  data: Partial<PhysicalAssetSegmentSpecification>
): Promise<PhysicalAssetSegmentSpecification> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}/${segmentId}/asset-specs`, data);
  return response.data;
};

export const getPhysicalAssetSpecs = async (
  segmentId: string
): Promise<PhysicalAssetSegmentSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/asset-specs`);
  return response.data;
};

export const updatePhysicalAssetSpec = async (
  segmentId: string,
  specId: string,
  data: Partial<PhysicalAssetSegmentSpecification>
): Promise<PhysicalAssetSegmentSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${segmentId}/asset-specs/${specId}`,
    data
  );
  return response.data;
};

export const deletePhysicalAssetSpec = async (segmentId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${segmentId}/asset-specs/${specId}`);
};

// ============================================================================
// Statistics and Utilities
// ============================================================================

export const getStatistics = async (): Promise<ProcessSegmentStatistics> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/statistics/overview`);
  return response.data;
};

export const getTotalTime = async (segmentId: string): Promise<TotalTimeResult> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${segmentId}/total-time`);
  return response.data;
};
