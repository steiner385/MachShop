/**
 * Process Segment Types
 * ISA-95 Process Segment model types for manufacturing route management
 */

export enum ProcessSegmentType {
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

// Process Segment
export interface ProcessSegment {
  id: string;
  segmentCode: string;
  segmentName: string;
  description?: string;

  // Hierarchy
  level: number;
  parentSegmentId?: string;
  parentSegment?: ProcessSegment;
  childSegments?: ProcessSegment[];

  // Classification
  segmentType: ProcessSegmentType;
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
  parameters?: ProcessSegmentParameter[];
  dependencies?: ProcessSegmentDependency[];
  prerequisiteFor?: ProcessSegmentDependency[];
  personnelSpecs?: PersonnelSegmentSpecification[];
  equipmentSpecs?: EquipmentSegmentSpecification[];
  materialSpecs?: MaterialSegmentSpecification[];
  assetSpecs?: PhysicalAssetSegmentSpecification[];
}

// Process Segment Parameter
export interface ProcessSegmentParameter {
  id: string;
  segmentId: string;

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

// Process Segment Dependency
export interface ProcessSegmentDependency {
  id: string;
  dependentSegmentId: string;
  prerequisiteSegmentId: string;

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
  dependentSegment?: ProcessSegment;
  prerequisiteSegment?: ProcessSegment;
}

// Personnel Segment Specification
export interface PersonnelSegmentSpecification {
  id: string;
  segmentId: string;

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

// Equipment Segment Specification
export interface EquipmentSegmentSpecification {
  id: string;
  segmentId: string;

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

// Material Segment Specification
export interface MaterialSegmentSpecification {
  id: string;
  segmentId: string;

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

// Physical Asset Segment Specification
export interface PhysicalAssetSegmentSpecification {
  id: string;
  segmentId: string;

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
export interface CreateProcessSegmentData {
  segmentCode: string;
  segmentName: string;
  description?: string;
  level?: number;
  parentSegmentId?: string;
  segmentType: ProcessSegmentType;
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

export interface UpdateProcessSegmentData extends Partial<CreateProcessSegmentData> {
  id: string;
}

export interface CreateProcessSegmentParameterData {
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

export interface CreateProcessSegmentDependencyData {
  prerequisiteSegmentId: string;
  dependencyType: DependencyType;
  timingType: DependencyTimingType;
  lagTime?: number;
  leadTime?: number;
  condition?: string;
  isOptional?: boolean;
  notes?: string;
}

// API Response types
export interface ProcessSegmentStatistics {
  totalSegments: number;
  byType: Record<ProcessSegmentType, number>;
  byLevel: Record<number, number>;
  activeSegments: number;
  inactiveSegments: number;
  pendingApproval: number;
}

export interface ProcessSegmentHierarchyNode {
  segment: ProcessSegment;
  children: ProcessSegmentHierarchyNode[];
  totalTime: number;
  depth: number;
}

export interface TotalTimeResult {
  segmentId: string;
  segmentName: string;
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
export interface ProcessSegmentFilters {
  segmentType?: ProcessSegmentType;
  level?: number;
  isActive?: boolean;
  category?: string;
  parentSegmentId?: string;
  requiresApproval?: boolean;
  searchTerm?: string;
}
