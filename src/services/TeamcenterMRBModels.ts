/**
 * Teamcenter Quality MRB (Material Review Board) Data Models
 * Defines all data structures for MRB integration with MES
 * Issue #266 - Teamcenter Quality MRB Integration Infrastructure
 */

/**
 * MRB Member Role enumeration
 */
export enum MRBMemberRole {
  CHAIRMAN = 'CHAIRMAN',
  QUALITY_ENGINEER = 'QUALITY_ENGINEER',
  ENGINEERING = 'ENGINEERING',
  MANUFACTURING = 'MANUFACTURING',
  SUPPLIER_QUALITY = 'SUPPLIER_QUALITY',
  CUSTOMER_REPRESENTATIVE = 'CUSTOMER_REPRESENTATIVE',
  OTHER = 'OTHER',
}

/**
 * MRB Disposition Status enumeration
 */
export enum MRBDispositionStatus {
  USE_AS_IS = 'USE_AS_IS',
  REPAIR = 'REPAIR',
  REWORK = 'REWORK',
  SCRAP = 'SCRAP',
  RETURN_TO_SUPPLIER = 'RETURN_TO_SUPPLIER',
  PENDING = 'PENDING',
  DEFERRED = 'DEFERRED',
}

/**
 * MRB Review Status enumeration
 */
export enum MRBReviewStatus {
  INITIATED = 'INITIATED',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  DEFERRED = 'DEFERRED',
  CLOSED = 'CLOSED',
}

/**
 * MRB Sync Status enumeration
 */
export enum MRBSyncStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  SYNCED = 'SYNCED',
  FAILED = 'FAILED',
  CONFLICT = 'CONFLICT',
}

/**
 * MRB Member - Represents a member of the MRB team
 */
export interface MRBMember {
  id: string;
  mrbReviewId: string;
  teamcenterId: string;
  name: string;
  email: string;
  department: string;
  role: MRBMemberRole;
  companyAbbreviation?: string;
  signatureImage?: string;
  signatureTimestamp?: Date;
  approvalStatus?: 'APPROVED' | 'REJECTED' | 'PENDING';
  comments?: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MRB Disposition - Records the decision and disposition for affected parts
 */
export interface MRBDisposition {
  id: string;
  mrbReviewId: string;
  nonconformanceId: string;
  affectedPartNumber: string;
  affectedSerialNumber?: string;
  affectedQuantity: number;
  status: MRBDispositionStatus;
  justification: string;
  inspectionLevel?: 'DETAILED' | 'SAMPLE' | 'NONE';
  customerApprovalRequired: boolean;
  customerApprovalStatus?: 'APPROVED' | 'REJECTED' | 'PENDING';
  customerComments?: string;
  supplementalData?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * MRB Review - Represents a Material Review Board review in Teamcenter
 */
export interface MRBReview {
  id: string;
  teamcenterId: string;
  mrbNumber: string;
  nonconformanceId: string;
  status: MRBReviewStatus;

  // Review Details
  initiationDate: Date;
  reviewDate?: Date;
  closureDate?: Date;

  // Metadata
  affectedPartNumber: string;
  affectedPartDescription: string;
  affectedQuantity: number;
  defectDescription: string;
  defectPhaseDiscovered: string;
  defectCategory?: string;

  // MRB Team
  members: MRBMember[];
  chairman?: MRBMember;

  // Dispositions and Decisions
  dispositions: MRBDisposition[];
  recommendedDisposition?: MRBDispositionStatus;
  finalDisposition?: MRBDispositionStatus;
  riskAssessment?: {
    safetyRisk: 'HIGH' | 'MEDIUM' | 'LOW';
    flightRisk: 'HIGH' | 'MEDIUM' | 'LOW';
    scheduleImpact: 'HIGH' | 'MEDIUM' | 'LOW';
  };

  // Documentation
  attachments: string[]; // URLs to Teamcenter documents
  meetingNotes?: string;

  // Sync Tracking
  syncStatus: MRBSyncStatus;
  lastSyncTime?: Date;
  syncErrors?: string[];

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * MRB Sync Configuration
 */
export interface MRBSyncConfig {
  id: string;
  teamcenterId: string;
  teamcenterUrl: string;
  apiVersion: string;
  authenticationType: 'OAUTH2' | 'API_KEY' | 'BASIC_AUTH';
  credentialId: string;
  syncInterval: number; // minutes
  autoSync: boolean;
  conflictResolutionStrategy: 'MES_WINS' | 'TEAMCENTER_WINS' | 'MANUAL';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * MRB Sync Event - Audit trail for sync operations
 */
export interface MRBSyncEvent {
  id: string;
  mrbReviewId: string;
  eventType: 'CREATED' | 'UPDATED' | 'SYNCED' | 'CONFLICT' | 'ERROR' | 'RESOLVED';
  source: 'MES' | 'TEAMCENTER';
  timestamp: Date;
  details: {
    changes?: Record<string, any>;
    errorMessage?: string;
    conflictDetails?: {
      field: string;
      mesValue: any;
      teamcenterValue: any;
      resolution: 'MES' | 'TEAMCENTER' | 'MANUAL';
    };
  };
  userId: string;
  status: 'COMPLETED' | 'FAILED' | 'PENDING';
}

/**
 * Teamcenter Credentials - Secure storage of Teamcenter connection info
 */
export interface TeamcenterCredentials {
  id: string;
  clientId: string;
  clientSecret?: string; // Encrypted
  accessToken?: string; // Encrypted
  refreshToken?: string; // Encrypted
  tokenExpireTime?: Date;
  apiKey?: string; // Encrypted (for API key auth)
  username?: string; // Encrypted (for basic auth)
  password?: string; // Encrypted (for basic auth)
  createdAt: Date;
  updatedAt: Date;
  lastValidationTime?: Date;
}

/**
 * MRB Webhook Event - Event data from Teamcenter webhooks
 */
export interface MRBWebhookEvent {
  id: string;
  eventType: 'MRB_CREATED' | 'MRB_UPDATED' | 'MRB_CLOSED' | 'DISPOSITION_CHANGED' | 'MEMBER_SIGNED';
  teamcenterId: string;
  mrbNumber: string;
  timestamp: Date;
  data: Record<string, any>;
  processed: boolean;
  processingError?: string;
  retryCount: number;
  maxRetries: number;
}

/**
 * MRB Integration Status - Overall health of integration
 */
export interface MRBIntegrationStatus {
  id: string;
  teamcenterId: string;
  connectionStatus: 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
  lastConnectionTime?: Date;
  lastSyncTime?: Date;
  syncQueueSize: number;
  pendingWebhooks: number;
  errorCount: number;
  totalSyncs: number;
  successfulSyncs: number;
  failedSyncs: number;
  lastError?: {
    message: string;
    timestamp: Date;
    details: string;
  };
  healthScore: number; // 0-100
}

/**
 * MRB Conflict - When MES and Teamcenter have conflicting data
 */
export interface MRBConflict {
  id: string;
  mrbReviewId: string;
  conflictType: 'STATUS_MISMATCH' | 'DISPOSITION_MISMATCH' | 'MEMBER_MISMATCH' | 'ATTACHMENT_MISMATCH';
  mesValue: any;
  teamcenterValue: any;
  resolutionStrategy: 'AUTO' | 'MANUAL' | 'PENDING';
  resolvedValue?: any;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

/**
 * MRB Audit Log - Comprehensive audit trail for compliance
 */
export interface MRBAuditLog {
  id: string;
  mrbReviewId: string;
  action: string;
  actionBy: string;
  actionByRole?: MRBMemberRole;
  actionByCompany?: string;
  timestamp: Date;
  previousValue?: any;
  newValue?: any;
  ipAddress?: string;
  sessionId?: string;
  details: string;
  complianceRelevant: boolean;
}

/**
 * MRB Bulk Sync Request - For initial data migration
 */
export interface MRBBulkSyncRequest {
  id: string;
  startDate: Date;
  endDate: Date;
  filters?: {
    status?: MRBReviewStatus[];
    disposition?: MRBDispositionStatus[];
    partNumber?: string[];
  };
  totalRecords: number;
  processedRecords: number;
  failedRecords: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: Date;
  completedAt?: Date;
  createdBy: string;
  errors: Array<{ recordId: string; error: string }>;
}
