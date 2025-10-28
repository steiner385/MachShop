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
  DependencyTimingType,
  RoutingType,
  OperationClassification
} from '@prisma/client';

export {
  RoutingLifecycleState,
  DependencyType,
  DependencyTimingType,
  RoutingType,
  OperationClassification
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
  isPrimaryRoute: boolean; // DEPRECATED: Use routingType instead
  isActive: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;

  // Oracle ERP / Teamcenter PLM terminology (NEW)
  routingType: RoutingType; // PRIMARY, ALTERNATE, REWORK, PROTOTYPE, ENGINEERING
  alternateForId?: string;  // If ALTERNATE, links to PRIMARY routing
  priority: number;         // Selection priority (1=highest)

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
  operationId: string; // ISA-95: processSegmentId
  workCenterId?: string;

  // Timing overrides (optional, defaults come from Operation)
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;

  // Step attributes
  isOptional: boolean;
  isQualityInspection: boolean;
  isCriticalPath: boolean;

  // Work instruction linkage (NEW) - overrides Operation standard WI
  workInstructionId?: string;

  // Instructions
  stepInstructions?: string;
  notes?: string;

  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

/**
 * RoutingStepParameter - Parameter override for a routing step
 * Overrides Operation base parameter values for site-specific tuning
 * ISA-95: Overrides ProcessSegment base parameter values
 */
export interface RoutingStepParameter {
  id: string;
  routingStepId: string;

  // Parameter definition
  parameterName: string;   // e.g., "spindle_speed", "feed_rate", "temperature"
  parameterValue: string;  // Override value
  unitOfMeasure?: string;  // e.g., "RPM", "IPM", "°F", "PSI"

  // Metadata
  notes?: string;          // Why this override is needed
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
  operation?: {
    id: string;
    operationName: string;
    operationType: string;
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
  isPrimaryRoute?: boolean; // DEPRECATED: Use routingType instead
  isActive?: boolean; // Defaults to true
  effectiveDate?: Date;
  expirationDate?: Date;

  // Oracle ERP / Teamcenter PLM terminology (NEW)
  routingType?: RoutingType; // Defaults to PRIMARY
  alternateForId?: string;   // If ALTERNATE, links to PRIMARY routing
  priority?: number;         // Selection priority (1=highest, defaults to 1)

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
  operationId: string;
  workCenterId?: string;

  // Timing overrides
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;

  // Step attributes
  isOptional?: boolean; // Defaults to false
  isQualityInspection?: boolean; // Defaults to false
  isCriticalPath?: boolean; // Defaults to false

  // Work instruction linkage (NEW)
  workInstructionId?: string; // Override ProcessSegment standard work instruction

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
  isPrimaryRoute?: boolean; // DEPRECATED: Use routingType instead
  isActive?: boolean;
  effectiveDate?: Date;
  expirationDate?: Date;

  // Oracle ERP / Teamcenter PLM terminology (NEW)
  routingType?: RoutingType;
  alternateForId?: string;
  priority?: number;

  // Approval tracking
  approvedBy?: string;
  approvedAt?: Date;

  // Metadata
  createdBy?: string;
  notes?: string;

  // Optimistic locking - version control for collaborative editing
  currentVersion?: string; // The version the client has - used to detect conflicts
}

/**
 * UpdateRoutingStepDTO - Data for updating an existing routing step
 */
export interface UpdateRoutingStepDTO {
  stepNumber?: number;
  operationId?: string;
  workCenterId?: string;

  // Timing overrides
  setupTimeOverride?: number;
  cycleTimeOverride?: number;
  teardownTimeOverride?: number;

  // Step attributes
  isOptional?: boolean;
  isQualityInspection?: boolean;
  isCriticalPath?: boolean;

  // Work instruction linkage (NEW)
  workInstructionId?: string;

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
  operationId?: string;
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
 * RoutingSubmitForReviewRequest - Request to submit a routing for review
 */
export interface RoutingSubmitForReviewRequest {
  routingId: string;
  submittedBy: string;
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

// ============================================
// VISUAL ROUTING EDITOR TYPES (Phase 2)
// ============================================

/**
 * StepType - Types of routing steps for visual editor
 */
export enum StepType {
  PROCESS = 'PROCESS',                 // Standard manufacturing operation
  INSPECTION = 'INSPECTION',           // Quality inspection/verification
  DECISION = 'DECISION',               // Branch/decision point (mutually exclusive)
  PARALLEL_SPLIT = 'PARALLEL_SPLIT',   // Split into parallel operations
  PARALLEL_JOIN = 'PARALLEL_JOIN',     // Join parallel operations back together
  OSP = 'OSP',                         // Outside processing/farmout
  LOT_SPLIT = 'LOT_SPLIT',             // Split lot into multiple sublots
  LOT_MERGE = 'LOT_MERGE',             // Merge multiple lots/sublots
  TELESCOPING = 'TELESCOPING',         // Optional/telescoping operation
  START = 'START',                     // Start node
  END = 'END',                         // End node
}

/**
 * ControlType - Material control types
 */
export enum ControlType {
  LOT_CONTROLLED = 'LOT_CONTROLLED',
  SERIAL_CONTROLLED = 'SERIAL_CONTROLLED',
  MIXED = 'MIXED',
}

/**
 * ConnectionDependencyType - Advanced dependency types for visual editor
 */
export enum ConnectionDependencyType {
  FINISH_TO_START = 'FINISH_TO_START',     // Most common: Successor starts after predecessor finishes
  START_TO_START = 'START_TO_START',       // Successor starts when predecessor starts
  FINISH_TO_FINISH = 'FINISH_TO_FINISH',   // Successor finishes when predecessor finishes
  START_TO_FINISH = 'START_TO_FINISH',     // Successor finishes when predecessor starts (rare)
}

/**
 * RoutingStepNodeData - Data structure for ReactFlow nodes
 */
export interface RoutingStepNodeData {
  label: string;
  stepNumber: string;
  stepType: StepType;
  operationCode?: string;
  workCenterId?: string;
  description?: string;
  standardTime?: number;
  setupTime?: number;
  controlType?: ControlType;
  isOptional?: boolean;
  isCriticalPath?: boolean;
}

/**
 * RoutingConnectionData - Data structure for ReactFlow edges/connections
 */
export interface RoutingConnectionData {
  dependencyType: ConnectionDependencyType;
  lagTime?: number;        // Positive = delay, Negative = lead/overlap
  description?: string;
  isOptional?: boolean;
  isCriticalPath?: boolean;
}

/**
 * VisualRoutingData - Complete visual routing structure
 * Stored as JSON in database for visual editor
 */
export interface VisualRoutingData {
  nodes: Array<{
    id: string;
    type: string;
    position: { x: number; y: number };
    data: RoutingStepNodeData;
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    type?: string;
    data?: RoutingConnectionData;
  }>;
}

/**
 * RoutingTemplate - Reusable routing pattern
 */
export interface RoutingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];

  // Visual routing structure
  visualData: VisualRoutingData;

  // Usage tracking
  isFavorite?: boolean;
  usageCount?: number;

  // Metadata
  createdBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * CreateRoutingTemplateDTO - Data for creating a routing template
 */
export interface CreateRoutingTemplateDTO {
  name: string;
  description: string;
  category: string;
  tags: string[];
  visualData: VisualRoutingData;
  isFavorite?: boolean;
  createdBy?: string;
  siteId?: string;
}

/**
 * UpdateRoutingTemplateDTO - Data for updating a routing template
 */
export interface UpdateRoutingTemplateDTO {
  name?: string;
  description?: string;
  category?: string;
  tags?: string[];
  visualData?: VisualRoutingData;
  isFavorite?: boolean;
}

/**
 * RoutingTemplateQueryParams - Query parameters for templates
 */
export interface RoutingTemplateQueryParams {
  category?: string;
  tags?: string[];
  isFavorite?: boolean;
  searchText?: string;
  createdBy?: string;
}

// ============================================
// EXTENDED ROUTING WITH VISUAL DATA
// ============================================

/**
 * RoutingWithVisualData - Routing with visual editor data
 */
export interface RoutingWithVisualData extends Routing {
  visualData?: VisualRoutingData;
}

/**
 * CreateRoutingWithVisualDTO - Create routing with visual data
 */
export interface CreateRoutingWithVisualDTO extends CreateRoutingDTO {
  visualData?: VisualRoutingData;
}

/**
 * UpdateRoutingWithVisualDTO - Update routing with visual data
 */
export interface UpdateRoutingWithVisualDTO extends UpdateRoutingDTO {
  visualData?: VisualRoutingData;
}

// ============================================
// PARAMETER OVERRIDE TYPES (NEW)
// ============================================

/**
 * CreateRoutingStepParameterDTO - Data for creating a parameter override
 */
export interface CreateRoutingStepParameterDTO {
  routingStepId: string;
  parameterName: string;
  parameterValue: string;
  unitOfMeasure?: string;
  notes?: string;
}

/**
 * UpdateRoutingStepParameterDTO - Data for updating a parameter override
 */
export interface UpdateRoutingStepParameterDTO {
  parameterValue?: string;
  unitOfMeasure?: string;
  notes?: string;
}

/**
 * EffectiveParameterResult - Result of parameter inheritance calculation
 * Combines ProcessSegment base parameters with RoutingStep overrides
 */
export interface EffectiveParameterResult {
  parameterName: string;
  parameterValue: string;
  unitOfMeasure: string | null;
  source: 'process_segment' | 'routing_step_override'; // Where this value came from
  isOverridden: boolean; // True if this is an override, false if from base
  notes?: string; // Override notes if applicable
}

// All types and interfaces are exported inline above
// Enums are also exported inline at the top of this file
