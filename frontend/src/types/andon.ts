/**
 * Andon System TypeScript Types
 * GitHub Issue #171: Production Alerts & Andon Core Infrastructure
 */

// Enums matching Prisma schema
export enum AndonSeverity {
  CRITICAL = 'CRITICAL',
  HIGH = 'HIGH',
  MEDIUM = 'MEDIUM',
  LOW = 'LOW'
}

export enum AndonPriority {
  URGENT = 'URGENT',
  HIGH = 'HIGH',
  NORMAL = 'NORMAL',
  LOW = 'LOW'
}

export enum AndonAlertStatus {
  OPEN = 'OPEN',
  ACKNOWLEDGED = 'ACKNOWLEDGED',
  IN_PROGRESS = 'IN_PROGRESS',
  ESCALATED = 'ESCALATED',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
  CANCELLED = 'CANCELLED'
}

// Core Andon Models
export interface AndonAlert {
  id: string;
  alertNumber: string;
  title: string;
  description?: string;

  // Classification
  issueTypeId: string;
  issueType?: AndonIssueType;
  severity: AndonSeverity;
  priority: AndonPriority;

  // Location context
  siteId?: string;
  site?: {
    id: string;
    siteName: string;
  };
  areaId?: string;
  area?: {
    id: string;
    areaName: string;
  };
  workCenterId?: string;
  workCenter?: {
    id: string;
    name: string;
  };
  equipmentId?: string;
  equipment?: {
    id: string;
    name: string;
    equipmentNumber: string;
  };

  // Work Order context
  workOrderId?: string;
  workOrder?: {
    id: string;
    workOrderNumber: string;
  };
  operationId?: string;
  operation?: {
    id: string;
    operationName: string;
  };

  // Personnel
  raisedById: string;
  raisedBy?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  assignedToId?: string;
  assignedTo?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };

  // Status tracking
  status: AndonAlertStatus;
  statusHistory: AndonStatusHistoryEntry[];

  // Escalation tracking
  currentEscalationLevel: number;
  nextEscalationAt?: string;
  escalationHistory: AndonEscalationHistoryEntry[];

  // Resolution
  resolvedAt?: string;
  resolvedById?: string;
  resolvedBy?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  resolutionNotes?: string;
  resolutionActionTaken?: string;

  // Timing
  responseTime?: number; // minutes
  resolutionTime?: number; // minutes

  // Metadata
  metadata?: any;
  attachments: AndonAttachment[];

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface AndonIssueType {
  id: string;
  typeCode: string;
  typeName: string;
  description?: string;

  // Configuration
  defaultSeverity: AndonSeverity;
  defaultPriority: AndonPriority;
  requiresAttachment: boolean;
  requiresWorkOrder: boolean;
  requiresEquipment: boolean;

  // Auto-assignment
  autoAssignRole?: string;
  autoAssignUserId?: string;
  autoAssignUser?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };

  // Escalation
  enableEscalation: boolean;
  escalationTimeoutMins?: number;

  // Site-specific
  siteId?: string;
  site?: {
    id: string;
    siteName: string;
  };

  // Visual configuration
  iconName?: string;
  colorCode?: string;

  // Status
  isActive: boolean;
  displayOrder?: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;

  // Relations
  alerts?: AndonAlert[];
  escalationRules?: AndonEscalationRule[];

  // Counts
  _count?: {
    alerts: number;
    escalationRules: number;
  };
}

export interface AndonEscalationRule {
  id: string;
  ruleName: string;
  description?: string;

  // Rule scope
  siteId?: string;
  site?: {
    id: string;
    siteName: string;
  };
  issueTypeId?: string;
  issueType?: {
    id: string;
    typeName: string;
  };

  // Trigger conditions
  triggerSeverity: AndonSeverity[];
  triggerAfterMinutes: number;
  escalationLevel: number;

  // Escalation actions
  notifyUserIds: string[];
  notifyRoles: string[];
  notifyChannels: string[];
  assignToUserId?: string;
  assignToUser?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
  assignToRole?: string;

  // Advanced conditions
  conditions?: any;

  // Rule execution tracking
  isActive: boolean;
  executionCount: number;
  lastExecutedAt?: string;

  // Rule priority
  priority: number;

  // Timestamps
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy?: string;

  // Relations
  results?: AndonEscalationRuleResult[];

  // Counts
  _count?: {
    results: number;
  };
}

export interface AndonEscalationRuleResult {
  id: string;
  alertId: string;
  ruleId: string;

  // Execution details
  executedAt: string;
  escalationLevel: number;
  success: boolean;
  errorMessage?: string;

  // Actions taken
  actionsTaken: any[];
  notifiedUsers: string[];
}

// Support interfaces
export interface AndonStatusHistoryEntry {
  status: AndonAlertStatus;
  timestamp: string;
  userId?: string;
  notes?: string;
}

export interface AndonEscalationHistoryEntry {
  level: number;
  timestamp: string;
  previousAssignee?: string;
  newAssignee?: string;
}

export interface AndonAttachment {
  name: string;
  type: string;
  size: number;
  url?: string;
}

// API Request/Response types
export interface CreateAndonAlertData {
  title: string;
  description?: string;
  issueTypeId: string;
  severity?: AndonSeverity;
  priority?: AndonPriority;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  equipmentId?: string;
  workOrderId?: string;
  operationId?: string;
  raisedById: string;
  metadata?: any;
  attachments?: AndonAttachment[];
}

export interface UpdateAndonAlertData {
  title?: string;
  description?: string;
  severity?: AndonSeverity;
  priority?: AndonPriority;
  assignedToId?: string;
  status?: AndonAlertStatus;
  resolutionNotes?: string;
  resolutionActionTaken?: string;
  metadata?: any;
  attachments?: AndonAttachment[];
}

export interface AndonAlertFilters {
  status?: AndonAlertStatus[];
  severity?: AndonSeverity[];
  priority?: AndonPriority[];
  issueTypeId?: string;
  siteId?: string;
  areaId?: string;
  workCenterId?: string;
  equipmentId?: string;
  raisedById?: string;
  assignedToId?: string;
  createdAfter?: string;
  createdBefore?: string;
  isOverdue?: boolean;
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AndonAlertListResult {
  alerts: AndonAlert[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Statistics and Analytics
export interface AndonSystemStats {
  totalAlerts: number;
  openAlerts: number;
  resolvedAlerts: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  alertsBySeverity: Record<AndonSeverity, number>;
  alertsByStatus: Record<AndonAlertStatus, number>;
  alertsByIssueType: Record<string, { typeName: string; count: number }>;
  escalationStats: {
    totalEscalations: number;
    escalationsByLevel: Record<number, number>;
  };
  topIssues: Array<{
    issueTypeId: string;
    typeName: string;
    count: number;
    averageResolutionTime: number;
  }>;
}

// Configuration types
export interface AndonConfiguration {
  id: string;
  configKey: string;
  configValue: any;
  description?: string;
  dataType: string;
  category: string;
  isRequired: boolean;
  validationRules?: any;
  defaultValue?: any;
  isEncrypted: boolean;
  accessLevel: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  lastModifiedByUser?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

export interface AndonSiteConfiguration {
  id: string;
  siteId: string;
  site?: {
    id: string;
    siteName: string;
  };
  configKey: string;
  configValue: any;
  isOverride: boolean;
  inheritFromGlobal: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastModifiedBy: string;
  lastModifiedByUser?: {
    id: string;
    username: string;
    firstName?: string;
    lastName?: string;
  };
}

// UI-specific types
export interface QuickAlertConfig {
  key: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  severity: AndonSeverity;
  description: string;
}

export interface AndonStore {
  // State
  alerts: AndonAlert[];
  activeAlerts: AndonAlert[];
  issueTypes: AndonIssueType[];
  escalationRules: AndonEscalationRule[];
  systemStats?: AndonSystemStats;
  isLoading: boolean;
  error?: string;

  // Actions
  loadAlerts: (filters?: AndonAlertFilters, pagination?: PaginationOptions) => Promise<AndonAlertListResult>;
  loadActiveAlerts: (siteId?: string) => Promise<void>;
  loadIssueTypes: (siteId?: string, activeOnly?: boolean) => Promise<void>;
  loadEscalationRules: (siteId?: string, issueTypeId?: string) => Promise<void>;
  loadSystemStats: (siteId?: string, dateRange?: { from: Date; to: Date }) => Promise<void>;

  createAlert: (data: CreateAndonAlertData) => Promise<AndonAlert>;
  updateAlert: (id: string, data: UpdateAndonAlertData) => Promise<AndonAlert>;
  closeAlert: (id: string, resolutionNotes?: string, resolutionActionTaken?: string) => Promise<AndonAlert>;
  escalateAlert: (id: string) => Promise<any>;

  createIssueType: (data: any) => Promise<AndonIssueType>;
  updateIssueType: (id: string, data: any) => Promise<AndonIssueType>;

  createEscalationRule: (data: any) => Promise<AndonEscalationRule>;
  updateEscalationRule: (id: string, data: any) => Promise<AndonEscalationRule>;

  // Utility actions
  searchAlerts: (searchTerm: string, filters?: AndonAlertFilters) => Promise<AndonAlertListResult>;
  getOverdueAlerts: (siteId?: string) => Promise<AndonAlert[]>;
  processEscalations: (siteId?: string) => Promise<any>;

  clearError: () => void;
  reset: () => void;
}

// Color and status mappings for UI
export const SEVERITY_COLORS: Record<AndonSeverity, string> = {
  CRITICAL: '#ff4d4f',
  HIGH: '#ff7a45',
  MEDIUM: '#ffa940',
  LOW: '#52c41a'
};

export const PRIORITY_COLORS: Record<AndonPriority, string> = {
  URGENT: '#f5222d',
  HIGH: '#fa541c',
  NORMAL: '#1890ff',
  LOW: '#52c41a'
};

export const STATUS_COLORS: Record<AndonAlertStatus, string> = {
  OPEN: '#1890ff',
  ACKNOWLEDGED: '#722ed1',
  IN_PROGRESS: '#fa8c16',
  ESCALATED: '#f5222d',
  RESOLVED: '#52c41a',
  CLOSED: '#8c8c8c',
  CANCELLED: '#595959'
};

export const SEVERITY_LABELS: Record<AndonSeverity, string> = {
  CRITICAL: 'Critical',
  HIGH: 'High',
  MEDIUM: 'Medium',
  LOW: 'Low'
};

export const PRIORITY_LABELS: Record<AndonPriority, string> = {
  URGENT: 'Urgent',
  HIGH: 'High',
  NORMAL: 'Normal',
  LOW: 'Low'
};

export const STATUS_LABELS: Record<AndonAlertStatus, string> = {
  OPEN: 'Open',
  ACKNOWLEDGED: 'Acknowledged',
  IN_PROGRESS: 'In Progress',
  ESCALATED: 'Escalated',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled'
};