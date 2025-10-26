import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface ParameterLimits {
  id: string;
  parameterId: string;
  engineeringMin: number | null;
  lowLowAlarm: number | null;
  lowAlarm: number | null;
  operatingMin: number | null;
  LSL: number | null;
  nominalValue: number | null;
  USL: number | null;
  operatingMax: number | null;
  highAlarm: number | null;
  highHighAlarm: number | null;
  engineeringMax: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ParameterGroup {
  id: string;
  groupName: string;
  groupType: 'PROCESS' | 'QUALITY' | 'MATERIAL' | 'EQUIPMENT' | 'ENVIRONMENTAL' | 'CUSTOM';
  parentGroupId: string | null;
  description?: string;
  tags?: string[];
  displayOrder?: number;
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  childGroups?: ParameterGroup[];
  _count?: {
    parameters: number;
    childGroups: number;
  };
}

export interface ParameterFormula {
  id: string;
  formulaName: string;
  formulaExpression: string;
  outputParameterId: string;
  inputParameterIds: string[];
  evaluationTrigger: 'ON_CHANGE' | 'ON_DEMAND' | 'SCHEDULED';
  isActive: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface LimitEvaluationResult {
  severity: 'OK' | 'INFO' | 'WARNING' | 'CRITICAL';
  type: 'IN_SPEC' | 'OPERATING_LOW' | 'OPERATING_HIGH' | 'SPEC_LOW' | 'SPEC_HIGH' |
        'ALARM_LOW' | 'ALARM_HIGH' | 'ALARM_LOW_LOW' | 'ALARM_HIGH_HIGH' |
        'ENGINEERING_LOW' | 'ENGINEERING_HIGH';
  message: string;
  limit?: number;
}

export interface FormulaEvaluationResult {
  success: boolean;
  value?: number;
  error?: string;
  computedAt?: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// ==================== Parameter Limits API ====================

export const createOrUpdateParameterLimits = async (
  parameterId: string,
  limits: Partial<Omit<ParameterLimits, 'id' | 'parameterId' | 'createdAt' | 'updatedAt'>>
): Promise<ParameterLimits> => {
  const response = await axios.post(`${API_URL}/api/v1/parameters/${parameterId}/limits`, limits);
  return response.data;
};

export const getParameterLimits = async (parameterId: string): Promise<ParameterLimits> => {
  const response = await axios.get(`${API_URL}/api/v1/parameters/${parameterId}/limits`);
  return response.data;
};

export const deleteParameterLimits = async (parameterId: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/v1/parameters/${parameterId}/limits`);
};

export const validateParameterLimits = async (
  limits: Partial<Omit<ParameterLimits, 'id' | 'parameterId' | 'createdAt' | 'updatedAt'>>
): Promise<ValidationResult> => {
  const response = await axios.post(`${API_URL}/api/v1/parameters/limits/validate`, limits);
  return response.data;
};

export const evaluateParameterValue = async (
  parameterId: string,
  value: number
): Promise<LimitEvaluationResult> => {
  const response = await axios.post(`${API_URL}/api/v1/parameters/${parameterId}/limits/evaluate`, { value });
  return response.data;
};

export const getAllParametersWithLimits = async (): Promise<ParameterLimits[]> => {
  const response = await axios.get(`${API_URL}/api/v1/parameters/limits`);
  return response.data;
};

// ==================== Parameter Groups API ====================

export const createParameterGroup = async (
  group: Omit<ParameterGroup, 'id' | 'createdAt' | 'updatedAt' | 'childGroups' | '_count'>
): Promise<ParameterGroup> => {
  const response = await axios.post(`${API_URL}/api/v1/parameter-groups`, group);
  return response.data;
};

export const getParameterGroup = async (
  id: string,
  includeChildren: boolean = false
): Promise<ParameterGroup> => {
  const response = await axios.get(`${API_URL}/api/v1/parameter-groups/${id}`, {
    params: { includeChildren },
  });
  return response.data;
};

export const updateParameterGroup = async (
  id: string,
  updates: Partial<Omit<ParameterGroup, 'id' | 'createdAt' | 'updatedAt' | 'childGroups' | '_count'>>
): Promise<ParameterGroup> => {
  const response = await axios.put(`${API_URL}/api/v1/parameter-groups/${id}`, updates);
  return response.data;
};

export const deleteParameterGroup = async (id: string, force: boolean = false): Promise<void> => {
  await axios.delete(`${API_URL}/api/v1/parameter-groups/${id}`, {
    params: { force },
  });
};

export const getRootParameterGroups = async (): Promise<ParameterGroup[]> => {
  const response = await axios.get(`${API_URL}/api/v1/parameter-groups`);
  return response.data;
};

export const getParameterGroupTree = async (): Promise<ParameterGroup[]> => {
  const response = await axios.get(`${API_URL}/api/v1/parameter-groups`, {
    params: { tree: true },
  });
  return response.data;
};

export const getGroupsByType = async (
  groupType: ParameterGroup['groupType']
): Promise<ParameterGroup[]> => {
  const response = await axios.get(`${API_URL}/api/v1/parameter-groups`, {
    params: { groupType },
  });
  return response.data;
};

export const moveParameterGroup = async (
  id: string,
  newParentId: string | null
): Promise<ParameterGroup> => {
  const response = await axios.post(`${API_URL}/api/v1/parameter-groups/${id}/move`, {
    newParentId,
  });
  return response.data;
};

export const getGroupParameters = async (id: string): Promise<any[]> => {
  const response = await axios.get(`${API_URL}/api/v1/parameter-groups/${id}/parameters`);
  return response.data;
};

export const assignParameterToGroup = async (
  parameterId: string,
  groupId: string
): Promise<void> => {
  await axios.post(`${API_URL}/api/v1/parameter-groups/assign`, {
    parameterId,
    groupId,
  });
};

export const searchParameterGroups = async (query: string): Promise<ParameterGroup[]> => {
  const response = await axios.get(`${API_URL}/api/v1/parameter-groups/search/query`, {
    params: { q: query },
  });
  return response.data;
};

// ==================== Parameter Formulas API ====================

export const createFormula = async (
  formula: Omit<ParameterFormula, 'id' | 'createdAt' | 'updatedAt' | 'inputParameterIds'> & {
    testCases?: Array<{ inputs: Record<string, number>; expectedOutput: number }>;
  }
): Promise<ParameterFormula> => {
  const response = await axios.post(`${API_URL}/api/v1/formulas`, formula);
  return response.data;
};

export const getFormula = async (id: string): Promise<ParameterFormula> => {
  const response = await axios.get(`${API_URL}/api/v1/formulas/${id}`);
  return response.data;
};

export const updateFormula = async (
  id: string,
  updates: Partial<Omit<ParameterFormula, 'id' | 'createdAt' | 'updatedAt' | 'inputParameterIds'>>
): Promise<ParameterFormula> => {
  const response = await axios.put(`${API_URL}/api/v1/formulas/${id}`, updates);
  return response.data;
};

export const deleteFormula = async (id: string): Promise<void> => {
  await axios.delete(`${API_URL}/api/v1/formulas/${id}`);
};

export const listFormulas = async (params?: {
  isActive?: boolean;
  outputParameterId?: string;
}): Promise<ParameterFormula[]> => {
  const response = await axios.get(`${API_URL}/api/v1/formulas`, { params });
  return response.data;
};

export const evaluateFormula = async (
  id: string,
  parameterValues: Record<string, number>
): Promise<FormulaEvaluationResult> => {
  const response = await axios.post(`${API_URL}/api/v1/formulas/${id}/evaluate`, {
    parameterValues,
  });
  return response.data;
};

export const evaluateExpression = async (
  expression: string,
  scope: Record<string, number>
): Promise<FormulaEvaluationResult> => {
  const response = await axios.post(`${API_URL}/api/v1/formulas/evaluate-expression`, {
    expression,
    scope,
  });
  return response.data;
};

export const validateFormula = async (expression: string): Promise<ValidationResult> => {
  const response = await axios.post(`${API_URL}/api/v1/formulas/validate`, { expression });
  return response.data;
};

export const testFormula = async (
  expression: string,
  testCases: Array<{ inputs: Record<string, number>; expectedOutput: number }>
): Promise<Array<{ passed: boolean; error?: string; actualOutput?: number }>> => {
  const response = await axios.post(`${API_URL}/api/v1/formulas/test`, {
    expression,
    testCases,
  });
  return response.data;
};

export const extractDependencies = async (expression: string): Promise<{ dependencies: string[] }> => {
  const response = await axios.post(`${API_URL}/api/v1/formulas/extract-dependencies`, {
    expression,
  });
  return response.data;
};

export const toggleFormulaActive = async (
  id: string,
  isActive: boolean
): Promise<ParameterFormula> => {
  const response = await axios.patch(`${API_URL}/api/v1/formulas/${id}/active`, { isActive });
  return response.data;
};

export const getFormulasForParameter = async (
  parameterId: string
): Promise<{ asOutput: ParameterFormula[]; asInput: ParameterFormula[] }> => {
  const response = await axios.get(`${API_URL}/api/v1/formulas/parameter/${parameterId}`);
  return response.data;
};

export const getTriggeredFormulas = async (parameterId: string): Promise<ParameterFormula[]> => {
  const response = await axios.get(`${API_URL}/api/v1/formulas/triggered/${parameterId}`);
  return response.data;
};
