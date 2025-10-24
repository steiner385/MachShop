/**
 * Operation API Client
 * API calls for ISA-95 Operation management
 *
 * ISA-95 Operations (formerly Process Segments) define the manufacturing
 * operations and steps that can be used to build routings.
 */

import axios from 'axios';
import type {
  Operation,
  OperationParameter,
  OperationDependency,
  PersonnelOperationSpecification,
  EquipmentOperationSpecification,
  MaterialOperationSpecification,
  PhysicalAssetOperationSpecification,
  CreateOperationData,
  UpdateOperationData,
  CreateOperationParameterData,
  CreateOperationDependencyData,
  OperationStatistics,
  OperationHierarchyNode,
  TotalTimeResult,
  OperationFilters,
} from '@/types/operation';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';
const BASE_PATH = '/api/operations';

// ============================================================================
// Operation CRUD
// ============================================================================

export const createOperation = async (
  data: CreateOperationData
): Promise<Operation> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}`, data);
  return response.data;
};

export const getOperationById = async (id: string): Promise<Operation> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${id}`);
  return response.data;
};

export const getOperationByCode = async (operationCode: string): Promise<Operation> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/code/${operationCode}`);
  return response.data;
};

export const getAllOperations = async (
  filters?: OperationFilters
): Promise<Operation[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}`, {
    params: filters,
  });
  return response.data;
};

export const updateOperation = async (
  id: string,
  data: Partial<UpdateOperationData>
): Promise<Operation> => {
  const response = await axios.put(`${API_BASE_URL}${BASE_PATH}/${id}`, data);
  return response.data;
};

export const deleteOperation = async (id: string, hard: boolean = false): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${id}`, {
    params: { hard },
  });
};

// ============================================================================
// Hierarchy Navigation
// ============================================================================

export const getChildOperations = async (parentId: string): Promise<Operation[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${parentId}/children`);
  return response.data;
};

export const getRootOperations = async (): Promise<Operation[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/hierarchy/roots`);
  return response.data;
};

export const getHierarchyTree = async (operationId: string): Promise<OperationHierarchyNode> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/hierarchy-tree`);
  return response.data;
};

export const getAncestors = async (operationId: string): Promise<Operation[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/ancestors`);
  return response.data;
};

// ============================================================================
// Operation Parameters
// ============================================================================

export const createParameter = async (
  operationId: string,
  data: CreateOperationParameterData
): Promise<OperationParameter> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}/${operationId}/parameters`, data);
  return response.data;
};

export const getParameters = async (operationId: string): Promise<OperationParameter[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/parameters`);
  return response.data;
};

export const updateParameter = async (
  operationId: string,
  parameterId: string,
  data: Partial<CreateOperationParameterData>
): Promise<OperationParameter> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/parameters/${parameterId}`,
    data
  );
  return response.data;
};

export const deleteParameter = async (operationId: string, parameterId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${operationId}/parameters/${parameterId}`);
};

// ============================================================================
// Operation Dependencies
// ============================================================================

export const createDependency = async (
  operationId: string,
  data: CreateOperationDependencyData
): Promise<OperationDependency> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}/${operationId}/dependencies`, data);
  return response.data;
};

export const getDependencies = async (operationId: string): Promise<OperationDependency[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/dependencies`);
  return response.data;
};

export const updateDependency = async (
  operationId: string,
  dependencyId: string,
  data: Partial<CreateOperationDependencyData>
): Promise<OperationDependency> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/dependencies/${dependencyId}`,
    data
  );
  return response.data;
};

export const deleteDependency = async (operationId: string, dependencyId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${operationId}/dependencies/${dependencyId}`);
};

// ============================================================================
// Personnel Specifications
// ============================================================================

export const createPersonnelSpec = async (
  operationId: string,
  data: Partial<PersonnelOperationSpecification>
): Promise<PersonnelOperationSpecification> => {
  const response = await axios.post(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/personnel-specs`,
    data
  );
  return response.data;
};

export const getPersonnelSpecs = async (
  operationId: string
): Promise<PersonnelOperationSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/personnel-specs`);
  return response.data;
};

export const updatePersonnelSpec = async (
  operationId: string,
  specId: string,
  data: Partial<PersonnelOperationSpecification>
): Promise<PersonnelOperationSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/personnel-specs/${specId}`,
    data
  );
  return response.data;
};

export const deletePersonnelSpec = async (operationId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${operationId}/personnel-specs/${specId}`);
};

// ============================================================================
// Equipment Specifications
// ============================================================================

export const createEquipmentSpec = async (
  operationId: string,
  data: Partial<EquipmentOperationSpecification>
): Promise<EquipmentOperationSpecification> => {
  const response = await axios.post(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/equipment-specs`,
    data
  );
  return response.data;
};

export const getEquipmentSpecs = async (
  operationId: string
): Promise<EquipmentOperationSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/equipment-specs`);
  return response.data;
};

export const updateEquipmentSpec = async (
  operationId: string,
  specId: string,
  data: Partial<EquipmentOperationSpecification>
): Promise<EquipmentOperationSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/equipment-specs/${specId}`,
    data
  );
  return response.data;
};

export const deleteEquipmentSpec = async (operationId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${operationId}/equipment-specs/${specId}`);
};

// ============================================================================
// Material Specifications
// ============================================================================

export const createMaterialSpec = async (
  operationId: string,
  data: Partial<MaterialOperationSpecification>
): Promise<MaterialOperationSpecification> => {
  const response = await axios.post(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/material-specs`,
    data
  );
  return response.data;
};

export const getMaterialSpecs = async (
  operationId: string
): Promise<MaterialOperationSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/material-specs`);
  return response.data;
};

export const updateMaterialSpec = async (
  operationId: string,
  specId: string,
  data: Partial<MaterialOperationSpecification>
): Promise<MaterialOperationSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/material-specs/${specId}`,
    data
  );
  return response.data;
};

export const deleteMaterialSpec = async (operationId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${operationId}/material-specs/${specId}`);
};

// ============================================================================
// Physical Asset Specifications
// ============================================================================

export const createPhysicalAssetSpec = async (
  operationId: string,
  data: Partial<PhysicalAssetOperationSpecification>
): Promise<PhysicalAssetOperationSpecification> => {
  const response = await axios.post(`${API_BASE_URL}${BASE_PATH}/${operationId}/asset-specs`, data);
  return response.data;
};

export const getPhysicalAssetSpecs = async (
  operationId: string
): Promise<PhysicalAssetOperationSpecification[]> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/asset-specs`);
  return response.data;
};

export const updatePhysicalAssetSpec = async (
  operationId: string,
  specId: string,
  data: Partial<PhysicalAssetOperationSpecification>
): Promise<PhysicalAssetOperationSpecification> => {
  const response = await axios.put(
    `${API_BASE_URL}${BASE_PATH}/${operationId}/asset-specs/${specId}`,
    data
  );
  return response.data;
};

export const deletePhysicalAssetSpec = async (operationId: string, specId: string): Promise<void> => {
  await axios.delete(`${API_BASE_URL}${BASE_PATH}/${operationId}/asset-specs/${specId}`);
};

// ============================================================================
// Statistics and Utilities
// ============================================================================

export const getStatistics = async (): Promise<OperationStatistics> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/statistics/overview`);
  return response.data;
};

export const getTotalTime = async (operationId: string): Promise<TotalTimeResult> => {
  const response = await axios.get(`${API_BASE_URL}${BASE_PATH}/${operationId}/total-time`);
  return response.data;
};
