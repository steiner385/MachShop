/**
 * Frontend Routing Type Definitions
 * Sprint 4: Routing Management UI
 *
 * Type definitions for routing-related data structures
 * Matches backend API responses from /api/v1/routings
 */

// ============================================
// ENUMS
// ============================================

export enum RoutingLifecycleState {
  DRAFT = 'DRAFT',
  REVIEW = 'REVIEW',
  RELEASED = 'RELEASED',
  PRODUCTION = 'PRODUCTION',
  OBSOLETE = 'OBSOLETE'
}

export enum DependencyType {
  FINISH_TO_START = 'FINISH_TO_START',
  START_TO_START = 'START_TO_START',
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',
  START_TO_FINISH = 'START_TO_FINISH'
}

export enum DependencyTimingType {
  AS_SOON_AS_POSSIBLE = 'AS_SOON_AS_POSSIBLE',
  AS_LATE_AS_POSSIBLE = 'AS_LATE_AS_POSSIBLE',
  MUST_START_ON = 'MUST_START_ON',
  MUST_FINISH_ON = 'MUST_FINISH_ON'
}

// ============================================
// CORE ENTITY TYPES
// ============================================

export interface Part {
  id: string;
  partNumber: string;
  name: string;
}

export interface Site {
  id: string;
  siteName: string;
  siteCode: string;
}

export interface ProcessSegment {
  id: string;
  segmentName: string;
  operationType: string;
  setupTime?: number;
  duration?: number;
  teardownTime?: number;
  isStandardOperation: boolean;
  siteId?: string;
}

export interface WorkCenter {
  id: string;
  name: string;
  workCenterCode: string;
  isActive: boolean;
}

export interface Routing {
  id: string;
  routingNumber: string;
  partId: string;
  siteId: string;
  version: string;
  lifecycleState: RoutingLifecycleState;
  description?: string;
  isPrimaryRoute: boolean;
  isActive: boolean;
  effectiveDate?: string;
  expirationDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  notes?: string;

  // Relations (populated when includeSteps=true)
  part?: Part;
  site?: Site;
  steps?: RoutingStep[];
}

export interface RoutingStep {
  id: string;
  routingId: string;
  stepNumber: number;
  processSegmentId: string;
  workCenterId?: string;
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;
  isOptional: boolean;
  isQualityInspection: boolean;
  isCriticalPath: boolean;
  stepInstructions?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  routing?: Routing;
  processSegment?: ProcessSegment;
  workCenter?: WorkCenter;
  dependencies?: RoutingStepDependency[];
  prerequisites?: RoutingStepDependency[];
}

export interface RoutingStepDependency {
  id: string;
  dependentStepId: string;
  prerequisiteStepId: string;
  dependencyType: DependencyType;
  timingType: DependencyTimingType;
  lagTime?: number;
  leadTime?: number;
  createdAt: string;
}

export interface PartSiteAvailability {
  id: string;
  partId: string;
  siteId: string;
  isPreferred: boolean;
  isActive: boolean;
  leadTimeDays?: number;
  minimumLotSize?: number;
  maximumLotSize?: number;
  standardCost?: number;
  setupCost?: number;
  effectiveDate?: string;
  expirationDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;

  // Relations
  part?: Part;
  site?: Site;
}

// ============================================
// REQUEST TYPES (API Inputs)
// ============================================

export interface CreateRoutingRequest {
  routingNumber: string;
  partId: string;
  siteId: string;
  version?: string;
  lifecycleState?: RoutingLifecycleState;
  description?: string;
  isPrimaryRoute?: boolean;
  isActive?: boolean;
  effectiveDate?: string;
  expirationDate?: string;
  createdBy?: string;
  notes?: string;
  steps?: CreateRoutingStepRequest[];
}

export interface CreateRoutingStepRequest {
  routingId: string;
  stepNumber: number;
  processSegmentId: string;
  workCenterId?: string;
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;
  isOptional?: boolean;
  isQualityInspection?: boolean;
  isCriticalPath?: boolean;
  stepInstructions?: string;
  notes?: string;
}

export interface UpdateRoutingRequest {
  routingNumber?: string;
  partId?: string;
  siteId?: string;
  version?: string;
  lifecycleState?: RoutingLifecycleState;
  description?: string;
  isPrimaryRoute?: boolean;
  isActive?: boolean;
  effectiveDate?: string;
  expirationDate?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdBy?: string;
  notes?: string;
}

export interface UpdateRoutingStepRequest {
  stepNumber?: number;
  processSegmentId?: string;
  workCenterId?: string;
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;
  isOptional?: boolean;
  isQualityInspection?: boolean;
  isCriticalPath?: boolean;
  stepInstructions?: string;
  notes?: string;
}

export interface CreateStepDependencyRequest {
  dependentStepId: string;
  prerequisiteStepId: string;
  dependencyType: DependencyType;
  timingType: DependencyTimingType;
  lagTime?: number;
  leadTime?: number;
}

export interface CreatePartSiteAvailabilityRequest {
  partId: string;
  siteId: string;
  isPreferred?: boolean;
  isActive?: boolean;
  leadTimeDays?: number;
  minimumLotSize?: number;
  maximumLotSize?: number;
  standardCost?: number;
  setupCost?: number;
  effectiveDate?: string;
  expirationDate?: string;
  notes?: string;
}

export interface CopyRoutingRequest {
  targetSiteId?: string;
  newVersion?: string;
  includeSteps?: boolean;
  includeDependencies?: boolean;
  newLifecycleState?: RoutingLifecycleState;
}

export interface ApproveRoutingRequest {
  routingId: string;
  approvedBy: string;
  notes?: string;
}

export interface ResequenceStepsRequest {
  routingId: string;
  stepOrder: Array<{
    stepId: string;
    newStepNumber: number;
  }>;
}

// ============================================
// QUERY PARAMETER TYPES
// ============================================

export interface RoutingQueryParams {
  partId?: string;
  siteId?: string;
  lifecycleState?: RoutingLifecycleState;
  isActive?: boolean;
  isPrimaryRoute?: boolean;
  version?: string;
  includeSteps?: boolean;
  includeExpired?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RoutingStepQueryParams {
  routingId?: string;
  processSegmentId?: string;
  workCenterId?: string;
  isOptional?: boolean;
  isQualityInspection?: boolean;
  isCriticalPath?: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface RoutingResponse {
  success: boolean;
  data?: Routing;
  error?: string;
}

export interface RoutingListResponse {
  success: boolean;
  data?: Routing[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

export interface RoutingStepResponse {
  success: boolean;
  data?: RoutingStep;
  error?: string;
}

export interface RoutingStepListResponse {
  success: boolean;
  data?: RoutingStep[];
  error?: string;
}

export interface PartSiteAvailabilityResponse {
  success: boolean;
  data?: PartSiteAvailability;
  error?: string;
}

export interface RoutingVersionsResponse {
  success: boolean;
  data?: {
    currentVersion: string;
    allVersions: Array<{
      version: string;
      lifecycleState: RoutingLifecycleState;
      effectiveDate?: string;
      expirationDate?: string;
    }>;
  };
  error?: string;
}

export interface RoutingTimingResponse {
  success: boolean;
  data?: {
    totalSetupTime: number;
    totalCycleTime: number;
    totalTeardownTime: number;
    totalTime: number;
    criticalPathTime: number;
  };
  error?: string;
}

export interface RoutingValidationResponse {
  success: boolean;
  data?: {
    isValid: boolean;
    errors: Array<{
      field: string;
      message: string;
      value?: any;
    }>;
  };
  error?: string;
}

// ============================================
// UI STATE TYPES
// ============================================

export interface RoutingFilters {
  search: string;
  siteId: string | null;
  partId: string | null;
  lifecycleState: RoutingLifecycleState | null;
  isActive: boolean | null;
  isPrimaryRoute: boolean | null;
}

export interface RoutingFormData {
  routingNumber: string;
  partId: string;
  siteId: string;
  version: string;
  description: string;
  isPrimaryRoute: boolean;
  isActive: boolean;
  effectiveDate: string | null;
  expirationDate: string | null;
  notes: string;
}

export interface RoutingStepFormData {
  stepNumber: number;
  processSegmentId: string;
  workCenterId: string | null;
  setupTimeOverride: number | null;
  cycleTimeOverride: number | null;
  teardownTimeOverride: number | null;
  isOptional: boolean;
  isQualityInspection: boolean;
  isCriticalPath: boolean;
  stepInstructions: string;
  notes: string;
}

// ============================================
// TABLE COLUMN TYPES
// ============================================

export interface RoutingTableColumn {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  fixed?: 'left' | 'right';
  sorter?: boolean;
  filterable?: boolean;
}

export interface RoutingStepTableColumn {
  key: string;
  title: string;
  dataIndex?: string;
  width?: number | string;
  editable?: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

export type RoutingWithSteps = Routing & {
  steps: RoutingStep[];
};

export type RoutingStepWithDependencies = RoutingStep & {
  dependencies: RoutingStepDependency[];
  prerequisites: RoutingStepDependency[];
};

// Lifecycle state colors for badges
export const LIFECYCLE_STATE_COLORS: Record<RoutingLifecycleState, string> = {
  [RoutingLifecycleState.DRAFT]: 'default',
  [RoutingLifecycleState.REVIEW]: 'processing',
  [RoutingLifecycleState.RELEASED]: 'success',
  [RoutingLifecycleState.PRODUCTION]: 'blue',
  [RoutingLifecycleState.OBSOLETE]: 'error',
};

// Lifecycle state labels
export const LIFECYCLE_STATE_LABELS: Record<RoutingLifecycleState, string> = {
  [RoutingLifecycleState.DRAFT]: 'Draft',
  [RoutingLifecycleState.REVIEW]: 'In Review',
  [RoutingLifecycleState.RELEASED]: 'Released',
  [RoutingLifecycleState.PRODUCTION]: 'Production',
  [RoutingLifecycleState.OBSOLETE]: 'Obsolete',
};

// Dependency type labels
export const DEPENDENCY_TYPE_LABELS: Record<DependencyType, string> = {
  [DependencyType.FINISH_TO_START]: 'Finish to Start',
  [DependencyType.START_TO_START]: 'Start to Start',
  [DependencyType.FINISH_TO_FINISH]: 'Finish to Finish',
  [DependencyType.START_TO_FINISH]: 'Start to Finish',
};
