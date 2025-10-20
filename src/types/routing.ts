/**
 * Routing Type Definitions
 * Sprint 2: Backend Services & APIs
 *
 * Comprehensive TypeScript types for multi-site routing system
 */

// Import and re-export enums from Prisma
import {
  RoutingLifecycleState,
  DependencyType,
  DependencyTimingType
} from '@prisma/client';

export {
  RoutingLifecycleState,
  DependencyType,
  DependencyTimingType
};

// ============================================
// BASE ENTITY TYPES (from Database)
// ============================================

/**
 * Routing - Complete manufacturing route for a part at a specific site
 */
export interface Routing {
  id: string;
  routingNumber: string;
  partId: string;
  siteId: string;
  version: string;
  lifecycleState: RoutingLifecycleState;
  description?: string;

  // Route attributes
  isPrimaryRoute: boolean;
  isActive: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;

  // Approval tracking
  approvedBy?: string;
  approvedAt?: Date;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  notes?: string;
}

/**
 * RoutingStep - Individual operation in a routing sequence
 */
export interface RoutingStep {
  id: string;
  routingId: string;
  stepNumber: number;
  processSegmentId: string;
  workCenterId?: string;

  // Timing overrides (optional, defaults come from ProcessSegment)
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;

  // Step attributes
  isOptional: boolean;
  isQualityInspection: boolean;
  isCriticalPath: boolean;

  // Instructions
  stepInstructions?: string;
  notes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RoutingStepDependency - Dependencies between routing steps
 */
export interface RoutingStepDependency {
  id: string;
  dependentStepId: string;
  prerequisiteStepId: string;
  dependencyType: DependencyType;
  timingType: DependencyTimingType;
  lagTime?: number;  // Minimum time delay (seconds) after prerequisite
  leadTime?: number; // Maximum time gap (seconds) allowed
  createdAt: Date;
}

/**
 * PartSiteAvailability - Which parts can be manufactured at which sites
 */
export interface PartSiteAvailability {
  id: string;
  partId: string;
  siteId: string;

  // Availability attributes
  isPreferred: boolean;
  isActive: boolean;

  // Site-specific manufacturing data
  leadTimeDays?: number;
  minimumLotSize?: number;
  maximumLotSize?: number;

  // Cost data (site-specific)
  standardCost?: number;
  setupCost?: number;

  // Dates
  effectiveDate?: Date;
  expirationDate?: Date;

  // Metadata
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// EXTENDED TYPES (with Relations)
// ============================================

/**
 * RoutingWithRelations - Routing with all related entities
 */
export interface RoutingWithRelations extends Routing {
  part?: {
    id: string;
    partNumber: string;
    name: string;
  };
  site?: {
    id: string;
    siteName: string;
    siteCode: string;
  };
  steps?: RoutingStepWithRelations[];
}

/**
 * RoutingStepWithRelations - RoutingStep with related entities
 */
export interface RoutingStepWithRelations extends RoutingStep {
  routing?: Routing;
  processSegment?: {
    id: string;
    segmentName: string;
    segmentType: string;
    setupTime?: number;
    duration?: number;
    teardownTime?: number;
    isStandardOperation: boolean;
    siteId?: string;
  };
  workCenter?: {
    id: string;
    name: string;
    isActive: boolean;
  };
  dependencies?: RoutingStepDependency[];
  prerequisites?: RoutingStepDependency[];
}

/**
 * PartSiteAvailabilityWithRelations - PartSiteAvailability with relations
 */
export interface PartSiteAvailabilityWithRelations extends PartSiteAvailability {
  part: {
    id: string;
    partNumber: string;
    name: string;
  };
  site: {
    id: string;
    siteName: string;
    siteCode: string;
  };
}

// ============================================
// CREATE DTOs (Data Transfer Objects)
// ============================================

/**
 * CreateRoutingDTO - Data for creating a new routing
 */
export interface CreateRoutingDTO {
  routingNumber: string;
  partId: string;
  siteId: string;
  version?: string; // Defaults to "1.0"
  lifecycleState?: RoutingLifecycleState; // Defaults to DRAFT
  description?: string;

  // Route attributes
  isPrimaryRoute?: boolean; // Defaults to false
  isActive?: boolean; // Defaults to true
  effectiveDate?: Date;
  expirationDate?: Date;

  // Metadata
  createdBy?: string;
  notes?: string;

  // Optional: Create steps inline
  steps?: CreateRoutingStepDTO[];
}

/**
 * CreateRoutingStepDTO - Data for creating a new routing step
 */
export interface CreateRoutingStepDTO {
  routingId: string;
  stepNumber: number;
  processSegmentId: string;
  workCenterId?: string;

  // Timing overrides
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;

  // Step attributes
  isOptional?: boolean; // Defaults to false
  isQualityInspection?: boolean; // Defaults to false
  isCriticalPath?: boolean; // Defaults to false

  // Instructions
  stepInstructions?: string;
  notes?: string;
}

/**
 * CreateRoutingStepDependencyDTO - Data for creating step dependency
 */
export interface CreateRoutingStepDependencyDTO {
  dependentStepId: string;
  prerequisiteStepId: string;
  dependencyType: DependencyType;
  timingType: DependencyTimingType;
  lagTime?: number;
  leadTime?: number;
}

/**
 * CreatePartSiteAvailabilityDTO - Data for creating part-site availability
 */
export interface CreatePartSiteAvailabilityDTO {
  partId: string;
  siteId: string;

  // Availability attributes
  isPreferred?: boolean; // Defaults to false
  isActive?: boolean; // Defaults to true

  // Site-specific manufacturing data
  leadTimeDays?: number;
  minimumLotSize?: number;
  maximumLotSize?: number;

  // Cost data
  standardCost?: number;
  setupCost?: number;

  // Dates
  effectiveDate?: Date;
  expirationDate?: Date;

  // Metadata
  notes?: string;
}

// ============================================
// UPDATE DTOs
// ============================================

/**
 * UpdateRoutingDTO - Data for updating an existing routing
 * All fields optional (partial update)
 */
export interface UpdateRoutingDTO {
  routingNumber?: string;
  partId?: string;
  siteId?: string;
  version?: string;
  lifecycleState?: RoutingLifecycleState;
  description?: string;

  // Route attributes
  isPrimaryRoute?: boolean;
  isActive?: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;

  // Approval tracking
  approvedBy?: string;
  approvedAt?: Date;

  // Metadata
  createdBy?: string;
  notes?: string;
}

/**
 * UpdateRoutingStepDTO - Data for updating an existing routing step
 */
export interface UpdateRoutingStepDTO {
  stepNumber?: number;
  processSegmentId?: string;
  workCenterId?: string;

  // Timing overrides
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;

  // Step attributes
  isOptional?: boolean;
  isQualityInspection?: boolean;
  isCriticalPath?: boolean;

  // Instructions
  stepInstructions?: string;
  notes?: string;
}

/**
 * UpdatePartSiteAvailabilityDTO - Data for updating part-site availability
 */
export interface UpdatePartSiteAvailabilityDTO {
  isPreferred?: boolean;
  isActive?: boolean;
  leadTimeDays?: number;
  minimumLotSize?: number;
  maximumLotSize?: number;
  standardCost?: number;
  setupCost?: number;
  effectiveDate?: Date;
  expirationDate?: Date;
  notes?: string;
}

// ============================================
// QUERY/FILTER TYPES
// ============================================

/**
 * RoutingQueryParams - Query parameters for filtering routings
 */
export interface RoutingQueryParams {
  partId?: string;
  siteId?: string;
  lifecycleState?: RoutingLifecycleState;
  isActive?: boolean;
  isPrimaryRoute?: boolean;
  version?: string;
  includeSteps?: boolean; // Include related steps in response
  includeExpired?: boolean; // Include expired routes (default: false)
}

/**
 * RoutingStepQueryParams - Query parameters for filtering routing steps
 */
export interface RoutingStepQueryParams {
  routingId?: string;
  processSegmentId?: string;
  workCenterId?: string;
  isOptional?: boolean;
  isQualityInspection?: boolean;
  isCriticalPath?: boolean;
}

/**
 * PartSiteAvailabilityQueryParams - Query parameters for part-site availability
 */
export interface PartSiteAvailabilityQueryParams {
  partId?: string;
  siteId?: string;
  isPreferred?: boolean;
  isActive?: boolean;
}

// ============================================
// API RESPONSE TYPES
// ============================================

/**
 * PaginatedResponse - Generic paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * RoutingResponse - API response for routing operations
 */
export interface RoutingResponse {
  success: boolean;
  data?: RoutingWithRelations;
  error?: string;
}

/**
 * RoutingListResponse - API response for routing list
 */
export interface RoutingListResponse {
  success: boolean;
  data?: RoutingWithRelations[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  error?: string;
}

/**
 * RoutingStepResponse - API response for routing step operations
 */
export interface RoutingStepResponse {
  success: boolean;
  data?: RoutingStepWithRelations;
  error?: string;
}

/**
 * PartSiteAvailabilityResponse - API response for availability operations
 */
export interface PartSiteAvailabilityResponse {
  success: boolean;
  data?: PartSiteAvailabilityWithRelations;
  error?: string;
}

// ============================================
// VALIDATION TYPES
// ============================================

/**
 * RoutingValidationError - Validation error details
 */
export interface RoutingValidationError {
  field: string;
  message: string;
  value?: any;
}

/**
 * RoutingValidationResult - Result of routing validation
 */
export interface RoutingValidationResult {
  isValid: boolean;
  errors: RoutingValidationError[];
}

// ============================================
// BUSINESS LOGIC TYPES
// ============================================

/**
 * RoutingCopyOptions - Options for copying a routing
 */
export interface RoutingCopyOptions {
  targetSiteId?: string;    // Copy to different site
  newVersion?: string;      // New version number
  includeSteps?: boolean;    // Copy all steps (default: true)
  includeDependencies?: boolean; // Copy step dependencies (default: true)
  newLifecycleState?: RoutingLifecycleState; // Reset lifecycle state
}

/**
 * RoutingApprovalRequest - Request to approve a routing
 */
export interface RoutingApprovalRequest {
  routingId: string;
  approvedBy: string;
  notes?: string;
}

/**
 * RoutingVersionInfo - Version information for a routing
 */
export interface RoutingVersionInfo {
  currentVersion: string;
  allVersions: Array<{
    version: string;
    lifecycleState: RoutingLifecycleState;
    effectiveDate?: Date;
    expirationDate?: Date;
  }>;
}

/**
 * RoutingTimingCalculation - Calculated timing for a routing
 */
export interface RoutingTimingCalculation {
  totalSetupTime: number;    // Sum of all step setup times (seconds)
  totalCycleTime: number;    // Sum of all step cycle times (seconds)
  totalTeardownTime: number; // Sum of all step teardown times (seconds)
  totalTime: number;         // Total time for one unit (seconds)
  criticalPathTime: number;  // Time along critical path (seconds)
}

/**
 * RoutingStepResequenceRequest - Request to reorder routing steps
 */
export interface RoutingStepResequenceRequest {
  routingId: string;
  stepOrder: Array<{
    stepId: string;
    newStepNumber: number;
  }>;
}

// All types and interfaces are exported inline above
// Enums are also exported inline at the top of this file
