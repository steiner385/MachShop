/**
 * Workflow Configuration Types
 * Created for GitHub Issue #40 - Site-Level Workflow Configuration System
 */

// Workflow modes
export type WorkflowMode = 'STRICT' | 'FLEXIBLE' | 'HYBRID';

// Base configuration interface
export interface WorkflowConfigurationBase {
  mode: WorkflowMode;
  enforceOperationSequence?: boolean;
  enforceStatusGating?: boolean;
  allowExternalVouching?: boolean;
  enforceQualityChecks?: boolean;
  requireStartTransition?: boolean;
  requireJustification?: boolean;
  requireApproval?: boolean;
}

// Site-level configuration
export interface SiteWorkflowConfiguration extends WorkflowConfigurationBase {
  id: string;
  siteId: string;
  effectiveDate: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  updatedBy?: string;
}

// Routing-level override
export interface RoutingWorkflowConfiguration extends WorkflowConfigurationBase {
  id: string;
  routingId: string;
  siteConfigId?: string;
  overrideReason?: string;
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Work order-level override (requires approval)
export interface WorkOrderWorkflowConfiguration extends WorkflowConfigurationBase {
  id: string;
  workOrderId: string;
  siteConfigId?: string;
  routingConfigId?: string;
  overrideReason: string;
  approvedBy: string;
  approvedAt: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

// Configuration history entry
export interface ConfigurationHistory {
  id: string;
  configType: 'SITE' | 'ROUTING' | 'WORK_ORDER';
  configId: string;
  previousMode?: WorkflowMode;
  newMode?: WorkflowMode;
  changedFields: Record<string, any>;
  changeReason?: string;
  createdAt: string;
  createdBy?: string;
}

// Effective configuration with inheritance resolved
export interface EffectiveConfiguration extends WorkflowConfigurationBase {
  isStrictMode: boolean;
  isFlexibleMode: boolean;
  isHybridMode: boolean;
  source: {
    site: SiteWorkflowConfiguration | null;
    routing: RoutingWorkflowConfiguration | null;
    workOrder: WorkOrderWorkflowConfiguration | null;
  };
}

// Configuration validation result
export interface ConfigurationValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// API request/response types
export interface UpdateSiteConfigurationRequest extends WorkflowConfigurationBase {
  reason?: string;
}

export interface CreateRoutingOverrideRequest extends Partial<WorkflowConfigurationBase> {
  overrideReason?: string;
  approvedBy?: string;
}

export interface CreateWorkOrderOverrideRequest extends Partial<WorkflowConfigurationBase> {
  overrideReason: string;
  approvedBy: string;
}

// Pagination
export interface PaginatedHistoryResponse {
  success: boolean;
  data: ConfigurationHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
  };
}

// API response wrapper
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

// Mode configuration details for UI
export interface ModeConfig {
  mode: WorkflowMode;
  title: string;
  description: string;
  icon: string;
  color: string;
  useCases: string[];
  rules: {
    enforceOperationSequence: boolean;
    enforceStatusGating: boolean;
    allowExternalVouching: boolean;
    enforceQualityChecks: boolean;
  };
}

// Rule configuration with metadata
export interface RuleConfig {
  key: keyof WorkflowConfigurationBase;
  label: string;
  description: string;
  defaultValue: boolean;
  allowedInModes: WorkflowMode[];
  help?: string;
}
