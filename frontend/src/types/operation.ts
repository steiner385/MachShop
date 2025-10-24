/**
 * Operation Types
 * ISA-95 Operation model types for manufacturing route management
 *
 * Operations (formerly Process Segments) define the standard manufacturing
 * operations that can be used to build routings. Each operation represents
 * a discrete manufacturing step with defined parameters, timing, and resource
 * requirements.
 */

export enum OperationType {
  PRODUCTION = 'PRODUCTION',
  QUALITY = 'QUALITY',
  MATERIAL_HANDLING = 'MATERIAL_HANDLING',
  MAINTENANCE = 'MAINTENANCE',
  SETUP = 'SETUP',
  CLEANING = 'CLEANING',
  PACKAGING = 'PACKAGING',
  TESTING = 'TESTING',
  REWORK = 'REWORK',
  OTHER = 'OTHER',
}

export enum ParameterType {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  SET_POINT = 'SET_POINT',
  MEASURED = 'MEASURED',
  CALCULATED = 'CALCULATED',
}

export enum ParameterDataType {
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',
  ENUM = 'ENUM',
  DATE = 'DATE',
  JSON = 'JSON',
}

export enum DependencyType {
  MUST_COMPLETE = 'MUST_COMPLETE',
  MUST_START = 'MUST_START',
  OVERLAP_ALLOWED = 'OVERLAP_ALLOWED',
  PARALLEL = 'PARALLEL',
}

export enum DependencyTimingType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH',
}

export enum EquipmentClass {
  MACHINE_TOOL = 'MACHINE_TOOL',
  INSPECTION = 'INSPECTION',
  ASSEMBLY = 'ASSEMBLY',
  MATERIAL_HANDLING = 'MATERIAL_HANDLING',
  TESTING = 'TESTING',
  PACKAGING = 'PACKAGING',
  OTHER = 'OTHER',
}

export enum CompetencyLevel {
  NOVICE = 'NOVICE',
  COMPETENT = 'COMPETENT',
  PROFICIENT = 'PROFICIENT',
  EXPERT = 'EXPERT',
}

// Operation
export interface Operation {
  id: string;
  operationCode: string;
  operationName: string;
  description?: string;

  // Hierarchy
  level: number;
  parentOperationId?: string;
  parentOperation?: Operation;
  childOperations?: Operation[];

  // Classification
  operationType: OperationType;
  category?: string;

  // Timing
  duration?: number;
  setupTime?: number;
  teardownTime?: number;
  minCycleTime?: number;
  maxCycleTime?: number;

  // Version control
  version: string;
  effectiveDate?: string;
  expirationDate?: string;

  // Status
  isActive: boolean;
  requiresApproval: boolean;
  approvedBy?: string;
  approvedAt?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;

  // Relations (loaded on demand)
  parameters?: OperationParameter[];
  dependencies?: OperationDependency[];
  prerequisiteFor?: OperationDependency[];
  personnelSpecs?: PersonnelOperationSpecification[];
  equipmentSpecs?: EquipmentOperationSpecification[];
  materialSpecs?: MaterialOperationSpecification[];
  assetSpecs?: PhysicalAssetOperationSpecification[];
}

// Operation Parameter
export interface OperationParameter {
  id: string;
  operationId: string;

  // Parameter definition
  parameterName: string;
  parameterType: ParameterType;
  dataType: ParameterDataType;

  // Value specification
  defaultValue?: string;
  unitOfMeasure?: string;

  // Constraints
  minValue?: number;
  maxValue?: number;
  allowedValues?: string[];

  // Requirements
  isRequired: boolean;
  isCritical: boolean;
  requiresVerification: boolean;

  // Display
  displayOrder?: number;
  notes?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// Operation Dependency
export interface OperationDependency {
  id: string;
  dependentOperationId: string;
  prerequisiteOperationId: string;

  // Dependency details
  dependencyType: DependencyType;
  timingType: DependencyTimingType;

  // Timing constraints
  lagTime?: number;
  leadTime?: number;

  // Conditions
  condition?: string;
  isOptional: boolean;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  dependentOperation?: Operation;
  prerequisiteOperation?: Operation;
}

// Personnel Operation Specification
export interface PersonnelOperationSpecification {
  id: string;
  operationId: string;

  // Personnel requirements
  personnelClassId?: string;
  skillId?: string;
  minimumCompetency?: CompetencyLevel;

  // Certification requirements
  requiredCertifications: string[];

  // Quantity
  quantity: number;
  isOptional: boolean;

  // Role definition
  roleName?: string;
  roleDescription?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Equipment Operation Specification
export interface EquipmentOperationSpecification {
  id: string;
  operationId: string;

  // Equipment requirements
  equipmentClass?: EquipmentClass;
  equipmentType?: string;
  specificEquipmentId?: string;

  // Capability requirements
  requiredCapabilities: string[];
  minimumCapacity?: number;

  // Quantity
  quantity: number;
  isOptional: boolean;

  // Usage
  setupRequired: boolean;
  setupTime?: number;
  teardownTime?: number;
  usageTime?: number;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Material Operation Specification
export interface MaterialOperationSpecification {
  id: string;
  operationId: string;

  // Material requirements
  materialType?: string;
  materialClassId?: string;
  specificMaterialId?: string;

  // Quantity
  quantity: number;
  unitOfMeasure: string;
  isOptional: boolean;

  // Consumption
  consumptionType: string;
  scrapFactor?: number;

  // Timing
  assemblyPoint?: string;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Physical Asset Operation Specification
export interface PhysicalAssetOperationSpecification {
  id: string;
  operationId: string;

  // Asset requirements
  assetType?: string;
  assetClassId?: string;
  specificAssetId?: string;

  // Capability requirements
  requiredCapabilities: string[];

  // Quantity
  quantity: number;
  isOptional: boolean;

  // Usage
  usageType: string;
  usageDuration?: number;

  // Metadata
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Create/Update DTOs
export interface CreateOperationData {
  operationCode: string;
  operationName: string;
  description?: string;
  level?: number;
  parentOperationId?: string;
  operationType: OperationType;
  category?: string;
  duration?: number;
  setupTime?: number;
  teardownTime?: number;
  minCycleTime?: number;
  maxCycleTime?: number;
  version?: string;
  effectiveDate?: string;
  expirationDate?: string;
  isActive?: boolean;
  requiresApproval?: boolean;
  approvedBy?: string;
  approvedAt?: string;
}

export interface UpdateOperationData extends Partial<CreateOperationData> {
  id: string;
}

export interface CreateOperationParameterData {
  parameterName: string;
  parameterType: ParameterType;
  dataType: ParameterDataType;
  defaultValue?: string;
  unitOfMeasure?: string;
  minValue?: number;
  maxValue?: number;
  allowedValues?: string[];
  isRequired?: boolean;
  isCritical?: boolean;
  requiresVerification?: boolean;
  displayOrder?: number;
  notes?: string;
}

export interface CreateOperationDependencyData {
  prerequisiteOperationId: string;
  dependencyType: DependencyType;
  timingType: DependencyTimingType;
  lagTime?: number;
  leadTime?: number;
  condition?: string;
  isOptional?: boolean;
  notes?: string;
}

// API Response types
export interface OperationStatistics {
  totalOperations: number;
  byType: Record<OperationType, number>;
  byLevel: Record<number, number>;
  activeOperations: number;
  inactiveOperations: number;
  pendingApproval: number;
}

export interface OperationHierarchyNode {
  operation: Operation;
  children: OperationHierarchyNode[];
  totalTime: number;
  depth: number;
}

export interface TotalTimeResult {
  operationId: string;
  operationName: string;
  ownTime: number;
  childrenTime: number;
  totalTime: number;
  breakdown: {
    duration: number;
    setupTime: number;
    teardownTime: number;
  };
}

// Filter types for list queries
export interface OperationFilters {
  operationType?: OperationType;
  level?: number;
  isActive?: boolean;
  category?: string;
  parentOperationId?: string;
  requiresApproval?: boolean;
  searchTerm?: string;
}
