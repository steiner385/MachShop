/**
 * Azure AD / Entra ID Types and Interfaces (Issue #133)
 *
 * Comprehensive type definitions for Azure AD integration including
 * configuration, authentication, Microsoft Graph API, and enterprise features.
 *
 * Features covered:
 * - Azure AD configuration and validation schemas
 * - Authentication flow types and results
 * - Microsoft Graph API response types
 * - Conditional Access and MFA types
 * - Group and user synchronization types
 * - Enterprise security feature types
 * - API request/response interfaces
 */

import { z } from 'zod';
import { SsoProviderType } from '@prisma/client';

// =============================================================================
// AZURE AD CONFIGURATION SCHEMAS
// =============================================================================

/**
 * Base Azure AD Configuration Schema
 * Core required settings for Azure AD integration
 */
export const AzureAdConfigSchema = z.object({
  tenantId: z.string().uuid('Tenant ID must be a valid UUID'),
  clientId: z.string().uuid('Client ID must be a valid UUID'),
  clientSecret: z.string().min(1, 'Client secret is required'),
  authority: z.string().url().optional(),
  redirectUri: z.string().url('Redirect URI must be a valid URL'),
  scopes: z.array(z.string()).min(1, 'At least one scope is required'),

  // Enterprise conditional access settings
  conditionalAccess: z.object({
    enabled: z.boolean().default(false),
    policies: z.array(z.string()).default([]),
    mfaRequired: z.boolean().default(false),
    deviceComplianceRequired: z.boolean().default(false),
    trustedIpRanges: z.array(z.string().ip()).optional(),
    sessionTimeout: z.number().min(1).max(1440).optional(), // 1 minute to 24 hours
    persistentBrowserSession: z.boolean().default(false)
  }).optional(),

  // Microsoft Graph API configuration
  graphApi: z.object({
    baseUrl: z.string().url().default('https://graph.microsoft.com'),
    version: z.enum(['v1.0', 'beta']).default('v1.0'),
    groupSyncEnabled: z.boolean().default(false),
    groupSyncInterval: z.number().min(300).default(3600), // 5 minutes to default 1 hour
    userSyncEnabled: z.boolean().default(false),
    userSyncInterval: z.number().min(300).default(7200), // 5 minutes to default 2 hours
    batchSize: z.number().min(1).max(999).default(100),
    maxRetries: z.number().min(0).max(10).default(3),
    timeoutMs: z.number().min(1000).max(60000).default(30000)
  }).optional(),

  // Advanced MSAL settings
  advanced: z.object({
    tokenCacheLocation: z.enum(['localStorage', 'sessionStorage', 'memory']).default('sessionStorage'),
    logLevel: z.enum(['error', 'warning', 'info', 'verbose']).default('info'),
    instanceDiscovery: z.boolean().default(true),
    validateAuthority: z.boolean().default(true),
    cloudDiscoveryMetadata: z.string().optional(),
    authorityMetadata: z.string().optional(),
    knownAuthorities: z.array(z.string().url()).optional(),
    protocolMode: z.enum(['AAD', 'OIDC']).default('AAD'),
    skipAuthorityMetadataCache: z.boolean().default(false)
  }).optional()
});

export type AzureAdConfig = z.infer<typeof AzureAdConfigSchema>;

/**
 * Azure AD Provider Registration Schema
 * For registering Azure AD as an SSO provider
 */
export const AzureAdProviderSchema = z.object({
  name: z.string().min(1, 'Provider name is required'),
  type: z.literal(SsoProviderType.AZURE_AD),
  config: AzureAdConfigSchema,
  priority: z.number().min(0).max(100).default(50),
  isActive: z.boolean().default(true),
  isDefault: z.boolean().default(false),
  domainRestrictions: z.array(z.string().regex(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)).default([]),
  groupRestrictions: z.array(z.string()).default([]),
  metadata: z.record(z.any()).optional()
});

export type AzureAdProviderConfig = z.infer<typeof AzureAdProviderSchema>;

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

/**
 * Azure AD Authentication Request
 */
export interface AzureAdAuthRequest {
  authorizationCode: string;
  codeVerifier: string;
  state: string;
  nonce?: string;
  sessionState?: string;
  correlationId?: string;
}

/**
 * Azure AD Authentication Account Information
 */
export interface AzureAdAccount {
  homeAccountId: string;
  environment: string;
  tenantId: string;
  username: string;
  localAccountId: string;
  name?: string;
  authorityType?: string;
  idTokenClaims?: AzureAdIdTokenClaims;
}

/**
 * ID Token Claims from Azure AD
 */
export interface AzureAdIdTokenClaims {
  aud: string; // Audience
  iss: string; // Issuer
  iat: number; // Issued at
  exp: number; // Expires at
  sub: string; // Subject
  tid: string; // Tenant ID
  oid: string; // Object ID
  upn?: string; // User Principal Name
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  preferred_username?: string;

  // Authorization context
  acrs?: string[]; // Authentication context class reference
  amr?: string[]; // Authentication methods references
  auth_time?: number; // Authentication time

  // Conditional access
  acct?: number; // Account type
  app_displayname?: string;
  appid?: string;
  appidacr?: string; // Application authentication context class reference
  deviceid?: string;

  // Risk and compliance
  at_hash?: string;
  c_hash?: string;
  compliant?: string;
  riskLevel?: 'low' | 'medium' | 'high' | 'hidden';
  riskState?: 'none' | 'confirmedSafe' | 'remediated' | 'dismissed' | 'atRisk' | 'confirmedCompromised';

  // Session information
  sid?: string; // Session ID

  // Custom claims
  [key: string]: any;
}

/**
 * Azure AD Authentication Result
 */
export interface AzureAdAuthResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  account: AzureAdAccount;
  scopes: string[];
  expiresOn: Date;
  extExpiresOn?: Date;
  familyId?: string;
  cloudGraphHostName?: string;
  msGraphHost?: string;
  correlationId: string;
  requestId?: string;
  fromCache: boolean;

  // Conditional Access information
  conditionalAccessInfo?: {
    policyId?: string;
    enforcedSessionControls?: string[];
    mfaRequired: boolean;
    deviceCompliant?: boolean;
    riskLevel?: 'low' | 'medium' | 'high';
    trustedLocation?: boolean;
    conditionalAccessStatus?: 'success' | 'failure' | 'notApplied' | 'unknownFutureValue';
  };

  // Token validation information
  tokenValidation?: {
    isValid: boolean;
    validatedClaims: string[];
    validationErrors: string[];
    signatureValid: boolean;
    audienceValid: boolean;
    issuerValid: boolean;
    timestampValid: boolean;
  };
}

/**
 * Token Refresh Request
 */
export interface AzureAdTokenRefreshRequest {
  refreshToken: string;
  account: AzureAdAccount;
  scopes?: string[];
  forceRefresh?: boolean;
}

// =============================================================================
// MICROSOFT GRAPH API TYPES
// =============================================================================

/**
 * Microsoft Graph User Profile
 */
export interface AzureAdUserProfile {
  id: string;
  userPrincipalName: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  mailNickname?: string;
  mobilePhone?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  businessPhones: string[];
  accountEnabled: boolean;
  userType?: 'Member' | 'Guest';
  creationType?: string;

  // Extended properties
  employeeId?: string;
  employeeType?: string;
  employeeHireDate?: Date;
  manager?: AzureAdUserProfile;
  directReports?: AzureAdUserProfile[];

  // Group memberships
  groups?: AzureAdGroup[];

  // Directory roles
  roles?: AzureAdDirectoryRole[];

  // Authentication and activity
  lastSignInDateTime?: Date;
  signInActivity?: {
    lastSignInDateTime?: Date;
    lastNonInteractiveSignInDateTime?: Date;
    lastSuccessfulSignInDateTime?: Date;
    lastSuccessfulSignInRequestId?: string;
  };

  // Licenses and subscriptions
  assignedLicenses?: Array<{
    skuId: string;
    disabledPlans?: string[];
  }>;

  // Custom attributes
  extensionAttributes?: Record<string, string>;
  onPremisesAttributes?: {
    onPremisesDomainName?: string;
    onPremisesSamAccountName?: string;
    onPremisesUserPrincipalName?: string;
    onPremisesDistinguishedName?: string;
    onPremisesSyncEnabled?: boolean;
    onPremisesLastSyncDateTime?: Date;
  };
}

/**
 * Microsoft Graph Group
 */
export interface AzureAdGroup {
  id: string;
  displayName: string;
  description?: string;
  groupTypes: string[];
  mail?: string;
  mailEnabled: boolean;
  mailNickname?: string;
  securityEnabled: boolean;
  visibility?: 'Private' | 'Public' | 'Hiddenmembership';

  // Dynamic groups
  membershipRule?: string;
  membershipRuleProcessingState?: 'On' | 'Paused' | 'Processing';

  // Group metadata
  createdDateTime?: Date;
  renewedDateTime?: Date;
  expirationDateTime?: Date;

  // Classification and compliance
  classification?: string;
  resourceBehaviorOptions?: string[];
  resourceProvisioningOptions?: string[];

  // Members and owners
  members?: AzureAdUserProfile[];
  owners?: AzureAdUserProfile[];
  membershipType?: 'direct' | 'dynamic' | 'assigned';

  // Team information (if group is Teams-enabled)
  team?: {
    id: string;
    displayName: string;
    description?: string;
    isArchived: boolean;
    webUrl: string;
  };
}

/**
 * Azure AD Directory Role
 */
export interface AzureAdDirectoryRole {
  id: string;
  displayName: string;
  description?: string;
  roleTemplateId: string;
  isBuiltIn: boolean;
  isEnabled: boolean;

  // Role assignments
  members?: AzureAdUserProfile[];

  // Role permissions
  rolePermissions?: Array<{
    allowedResourceActions: string[];
    condition?: string;
  }>;
}

/**
 * Microsoft Graph API Response Wrapper
 */
export interface GraphApiResponse<T> {
  value: T[];
  '@odata.count'?: number;
  '@odata.nextLink'?: string;
  '@odata.deltaLink'?: string;
  '@odata.context'?: string;
}

/**
 * Graph API Error Response
 */
export interface GraphApiError {
  error: {
    code: string;
    message: string;
    details?: Array<{
      code: string;
      message: string;
      target?: string;
    }>;
    innerError?: {
      code?: string;
      message?: string;
      'request-id'?: string;
      date?: string;
    };
  };
}

// =============================================================================
// SYNCHRONIZATION TYPES
// =============================================================================

/**
 * User Synchronization Configuration
 */
export const UserSyncConfigSchema = z.object({
  enabled: z.boolean().default(false),
  syncInterval: z.number().min(300).default(7200), // 5 minutes to 2 hours default
  batchSize: z.number().min(1).max(999).default(100),
  userFilter: z.string().optional(), // OData filter for users
  attributeMapping: z.record(z.string()).optional(),
  includeGroups: z.boolean().default(true),
  includeRoles: z.boolean().default(true),
  includeManager: z.boolean().default(false),
  includeDirectReports: z.boolean().default(false),
  autoCreateUsers: z.boolean().default(true),
  autoUpdateUsers: z.boolean().default(true),
  autoDisableUsers: z.boolean().default(false),
  conflictResolution: z.enum(['skip', 'overwrite', 'merge']).default('merge')
});

export type UserSyncConfig = z.infer<typeof UserSyncConfigSchema>;

/**
 * Group Synchronization Configuration
 */
export const GroupSyncConfigSchema = z.object({
  enabled: z.boolean().default(false),
  syncInterval: z.number().min(300).default(3600), // 5 minutes to 1 hour default
  batchSize: z.number().min(1).max(999).default(100),
  groupFilter: z.string().optional(), // OData filter for groups
  syncSecurityGroups: z.boolean().default(true),
  syncDistributionGroups: z.boolean().default(false),
  syncDynamicGroups: z.boolean().default(true),
  syncTeams: z.boolean().default(false),
  includeMembers: z.boolean().default(true),
  includeOwners: z.boolean().default(false),
  autoCreateGroups: z.boolean().default(true),
  autoUpdateGroups: z.boolean().default(true),
  autoDeleteGroups: z.boolean().default(false),
  membershipSyncEnabled: z.boolean().default(true),
  nestedGroupsEnabled: z.boolean().default(false)
});

export type GroupSyncConfig = z.infer<typeof GroupSyncConfigSchema>;

/**
 * Synchronization Result
 */
export interface AzureAdSyncResult {
  syncId: string;
  syncType: 'users' | 'groups' | 'full';
  startTime: Date;
  endTime: Date;
  status: 'success' | 'partial' | 'failed' | 'cancelled';

  // Statistics
  totalProcessed: number;
  successfullyProcessed: number;
  skipped: number;
  errors: number;

  // Detailed counts
  usersProcessed?: number;
  usersCreated?: number;
  usersUpdated?: number;
  usersDisabled?: number;
  usersErrors?: number;

  groupsProcessed?: number;
  groupsCreated?: number;
  groupsUpdated?: number;
  groupsDeleted?: number;
  groupsErrors?: number;

  membershipsProcessed?: number;
  membershipsAdded?: number;
  membershipsRemoved?: number;
  membershipsErrors?: number;

  // Error details
  errors_detail: Array<{
    type: 'user' | 'group' | 'membership' | 'general';
    objectId?: string;
    objectName?: string;
    errorCode: string;
    errorMessage: string;
    retryable: boolean;
    timestamp: Date;
  }>;

  // Performance metrics
  performanceMetrics?: {
    totalDuration: number; // milliseconds
    graphApiCalls: number;
    averageResponseTime: number;
    rateLimitHits: number;
    retries: number;
  };

  // Next sync recommendation
  nextSyncRecommendation?: {
    recommendedTime: Date;
    reason: string;
    priority: 'low' | 'medium' | 'high';
  };
}

/**
 * Synchronization Status
 */
export interface AzureAdSyncStatus {
  isRunning: boolean;
  currentSyncId?: string;
  currentSyncType?: 'users' | 'groups' | 'full';
  startTime?: Date;
  estimatedCompletion?: Date;
  progress?: {
    totalEstimated: number;
    currentlyProcessed: number;
    percentage: number;
    currentPhase: string;
  };
  lastSync?: {
    syncId: string;
    endTime: Date;
    status: 'success' | 'partial' | 'failed';
    summary: string;
  };
  nextScheduledSync?: Date;
  healthStatus: 'healthy' | 'warning' | 'error';
  healthMessages: string[];
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

/**
 * Azure AD Provider Creation Request
 */
export const CreateAzureAdProviderRequestSchema = z.object({
  name: z.string().min(1).max(100),
  config: AzureAdConfigSchema,
  priority: z.number().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
  isDefault: z.boolean().optional(),
  domainRestrictions: z.array(z.string()).optional(),
  groupRestrictions: z.array(z.string()).optional(),
  testConnection: z.boolean().default(false)
});

export type CreateAzureAdProviderRequest = z.infer<typeof CreateAzureAdProviderRequestSchema>;

/**
 * Azure AD Provider Update Request
 */
export const UpdateAzureAdProviderRequestSchema = CreateAzureAdProviderRequestSchema.partial();
export type UpdateAzureAdProviderRequest = z.infer<typeof UpdateAzureAdProviderRequestSchema>;

/**
 * Azure AD Authentication Configuration Response
 */
export interface AzureAdAuthConfigResponse {
  authorizationUrl: string;
  state: string;
  nonce: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
  responseType: 'code';
  responseMode: 'form_post' | 'query';
  scopes: string[];
  redirectUri: string;
  clientId: string;
  tenantId: string;
}

/**
 * User Profile Request
 */
export const GetUserProfileRequestSchema = z.object({
  userId: z.string().optional(),
  includeGroups: z.boolean().default(true),
  includeRoles: z.boolean().default(true),
  includeManager: z.boolean().default(false),
  includeDirectReports: z.boolean().default(false),
  expand: z.array(z.string()).optional()
});

export type GetUserProfileRequest = z.infer<typeof GetUserProfileRequestSchema>;

/**
 * Group Listing Request
 */
export const ListGroupsRequestSchema = z.object({
  filter: z.string().optional(),
  search: z.string().optional(),
  orderby: z.string().optional(),
  top: z.number().min(1).max(999).optional(),
  skip: z.number().min(0).optional(),
  includeMembers: z.boolean().default(false),
  groupTypes: z.array(z.enum(['unified', 'security', 'distribution', 'dynamic'])).optional()
});

export type ListGroupsRequest = z.infer<typeof ListGroupsRequestSchema>;

/**
 * Sync Operation Request
 */
export const SyncOperationRequestSchema = z.object({
  syncType: z.enum(['users', 'groups', 'full']),
  force: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  batchSize: z.number().min(1).max(999).optional(),
  filter: z.string().optional(),
  includeDeleted: z.boolean().default(false)
});

export type SyncOperationRequest = z.infer<typeof SyncOperationRequestSchema>;

// =============================================================================
// CONDITIONAL ACCESS TYPES
// =============================================================================

/**
 * Conditional Access Policy Information
 */
export interface ConditionalAccessPolicyInfo {
  id: string;
  displayName: string;
  state: 'enabled' | 'disabled' | 'enabledForReportingButNotEnforced';
  conditions: {
    users?: {
      includeUsers?: string[];
      excludeUsers?: string[];
      includeGroups?: string[];
      excludeGroups?: string[];
      includeRoles?: string[];
      excludeRoles?: string[];
    };
    applications?: {
      includeApplications?: string[];
      excludeApplications?: string[];
    };
    locations?: {
      includeLocations?: string[];
      excludeLocations?: string[];
    };
    platforms?: {
      includePlatforms?: string[];
      excludePlatforms?: string[];
    };
    deviceStates?: {
      includeStates?: string[];
      excludeStates?: string[];
    };
    signInRiskLevels?: ('low' | 'medium' | 'high' | 'hidden' | 'none' | 'unknownFutureValue')[];
    userRiskLevels?: ('low' | 'medium' | 'high' | 'hidden' | 'none' | 'unknownFutureValue')[];
  };
  grantControls?: {
    operator: 'AND' | 'OR';
    builtInControls?: ('block' | 'mfa' | 'compliantDevice' | 'domainJoinedDevice' | 'approvedApplication' | 'compliantApplication' | 'passwordChange' | 'unknownFutureValue')[];
    customAuthenticationFactors?: string[];
    termsOfUse?: string[];
  };
  sessionControls?: {
    applicationEnforcedRestrictions?: {
      isEnabled: boolean;
    };
    cloudAppSecurity?: {
      isEnabled: boolean;
      cloudAppSecurityType?: 'mcasConfigured' | 'monitorOnly' | 'blockDownloads' | 'unknownFutureValue';
    };
    persistentBrowser?: {
      isEnabled: boolean;
      mode?: 'always' | 'never' | 'unknownFutureValue';
    };
    signInFrequency?: {
      isEnabled: boolean;
      type?: 'days' | 'hours' | 'unknownFutureValue';
      value?: number;
    };
  };
}

/**
 * MFA Challenge Information
 */
export interface MfaChallengeInfo {
  challengeId: string;
  challengeType: 'phoneAppOTP' | 'phoneAppNotification' | 'sms' | 'voiceCall' | 'email' | 'fido' | 'oath' | 'unknownFutureValue';
  challengeTargetId?: string;
  displayName?: string;
  isDefault: boolean;
  phoneNumber?: string;
  phoneType?: 'mobile' | 'alternateMobile' | 'office' | 'unknownFutureValue';
  methods: Array<{
    id: string;
    methodType: string;
    displayName?: string;
    isUsable: boolean;
  }>;
}

/**
 * Device Compliance Information
 */
export interface DeviceComplianceInfo {
  deviceId: string;
  deviceDisplayName?: string;
  operatingSystem?: string;
  operatingSystemVersion?: string;
  isCompliant: boolean;
  complianceGracePeriodExpirationDateTime?: Date;
  deviceTrustType?: 'workplace' | 'aadJoined' | 'aadRegistered' | 'hybridAzureADJoined' | 'unknownFutureValue';
  managementType?: 'eas' | 'mdm' | 'easMdm' | 'intuneClient' | 'easIntuneClient' | 'configurationManagerClient' | 'configurationManagerClientMdm' | 'configurationManagerClientMdmEas' | 'unknown' | 'jamf' | 'googleCloudDevicePolicyController' | 'microsoft365ManagedMdm' | 'msSense' | 'intuneAosp' | 'unknownFutureValue';
  complianceState?: 'unknown' | 'compliant' | 'noncompliant' | 'conflict' | 'error' | 'inGracePeriod' | 'configManager' | 'unknownFutureValue';
  lastContactDateTime?: Date;
}

// =============================================================================
// ERROR TYPES
// =============================================================================

/**
 * Azure AD Service Error Types
 */
export enum AzureAdErrorCode {
  // Configuration errors
  INVALID_CONFIGURATION = 'AZURE_AD_INVALID_CONFIGURATION',
  MISSING_REQUIRED_FIELD = 'AZURE_AD_MISSING_REQUIRED_FIELD',
  INVALID_TENANT_ID = 'AZURE_AD_INVALID_TENANT_ID',
  INVALID_CLIENT_ID = 'AZURE_AD_INVALID_CLIENT_ID',
  INVALID_REDIRECT_URI = 'AZURE_AD_INVALID_REDIRECT_URI',

  // Authentication errors
  AUTHENTICATION_FAILED = 'AZURE_AD_AUTHENTICATION_FAILED',
  INVALID_AUTHORIZATION_CODE = 'AZURE_AD_INVALID_AUTHORIZATION_CODE',
  TOKEN_EXPIRED = 'AZURE_AD_TOKEN_EXPIRED',
  TOKEN_REFRESH_FAILED = 'AZURE_AD_TOKEN_REFRESH_FAILED',
  INVALID_TOKEN = 'AZURE_AD_INVALID_TOKEN',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'AZURE_AD_INSUFFICIENT_PERMISSIONS',
  CONDITIONAL_ACCESS_BLOCKED = 'AZURE_AD_CONDITIONAL_ACCESS_BLOCKED',
  MFA_REQUIRED = 'AZURE_AD_MFA_REQUIRED',
  DEVICE_NOT_COMPLIANT = 'AZURE_AD_DEVICE_NOT_COMPLIANT',

  // Graph API errors
  GRAPH_API_ERROR = 'AZURE_AD_GRAPH_API_ERROR',
  GRAPH_API_RATE_LIMITED = 'AZURE_AD_GRAPH_API_RATE_LIMITED',
  GRAPH_API_UNAUTHORIZED = 'AZURE_AD_GRAPH_API_UNAUTHORIZED',
  GRAPH_API_FORBIDDEN = 'AZURE_AD_GRAPH_API_FORBIDDEN',
  GRAPH_API_NOT_FOUND = 'AZURE_AD_GRAPH_API_NOT_FOUND',

  // Sync errors
  SYNC_FAILED = 'AZURE_AD_SYNC_FAILED',
  SYNC_PARTIAL_FAILURE = 'AZURE_AD_SYNC_PARTIAL_FAILURE',
  SYNC_ALREADY_RUNNING = 'AZURE_AD_SYNC_ALREADY_RUNNING',
  SYNC_CONFIGURATION_ERROR = 'AZURE_AD_SYNC_CONFIGURATION_ERROR',

  // General errors
  SERVICE_NOT_INITIALIZED = 'AZURE_AD_SERVICE_NOT_INITIALIZED',
  NETWORK_ERROR = 'AZURE_AD_NETWORK_ERROR',
  TIMEOUT_ERROR = 'AZURE_AD_TIMEOUT_ERROR',
  UNKNOWN_ERROR = 'AZURE_AD_UNKNOWN_ERROR'
}

/**
 * Azure AD Service Error
 */
export class AzureAdError extends Error {
  public readonly code: AzureAdErrorCode;
  public readonly details?: Record<string, any>;
  public readonly correlationId?: string;
  public readonly timestamp: Date;
  public readonly retryable: boolean;

  constructor(
    code: AzureAdErrorCode,
    message: string,
    details?: Record<string, any>,
    correlationId?: string,
    retryable = false
  ) {
    super(message);
    this.name = 'AzureAdError';
    this.code = code;
    this.details = details;
    this.correlationId = correlationId;
    this.timestamp = new Date();
    this.retryable = retryable;
  }

  toJSON() {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      details: this.details,
      correlationId: this.correlationId,
      timestamp: this.timestamp,
      retryable: this.retryable,
      stack: this.stack
    };
  }
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

/**
 * Azure AD Service Health Status
 */
export interface AzureAdHealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  details: {
    msalInitialized: boolean;
    graphClientInitialized: boolean;
    configurationValid: boolean;
    tokenCacheAccessible: boolean;
    graphApiConnectivity: boolean;
    authenticationFlow: boolean;
    syncServicesRunning: boolean;
  };
  metrics: {
    totalAuthAttempts: number;
    successfulAuths: number;
    failedAuths: number;
    averageAuthTime: number;
    lastSuccessfulAuth?: Date;
    lastFailedAuth?: Date;
    graphApiCalls: number;
    graphApiErrors: number;
    syncOperations: number;
    lastSyncSuccess?: Date;
  };
  issues: Array<{
    severity: 'low' | 'medium' | 'high' | 'critical';
    component: string;
    description: string;
    recommendation?: string;
    detectedAt: Date;
  }>;
}

/**
 * Azure AD Service Configuration Validation Result
 */
export interface AzureAdConfigValidationResult {
  isValid: boolean;
  errors: Array<{
    field: string;
    code: string;
    message: string;
    severity: 'error' | 'warning';
  }>;
  warnings: Array<{
    field: string;
    code: string;
    message: string;
    recommendation?: string;
  }>;
  testedComponents: {
    tenantDiscovery: boolean;
    clientCredentials: boolean;
    redirectUriReachability: boolean;
    scopeValidation: boolean;
    graphApiAccess: boolean;
  };
  performanceMetrics: {
    validationDuration: number;
    discoveryLatency: number;
    authLatency: number;
    graphApiLatency: number;
  };
}

export default {
  AzureAdConfigSchema,
  AzureAdProviderSchema,
  CreateAzureAdProviderRequestSchema,
  UpdateAzureAdProviderRequestSchema,
  GetUserProfileRequestSchema,
  ListGroupsRequestSchema,
  SyncOperationRequestSchema,
  UserSyncConfigSchema,
  GroupSyncConfigSchema,
  AzureAdErrorCode,
  AzureAdError
};