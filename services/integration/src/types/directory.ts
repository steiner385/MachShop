/**
 * Directory Services TypeScript Types
 * Issue #128: External Integration: LDAP/AD Role Synchronization
 *
 * This file contains all TypeScript interfaces and types for the
 * directory services integration functionality.
 */

// Re-export Prisma generated types for consistency
export {
  DirectoryConfig,
  DirectoryUserMapping,
  DirectoryGroupMapping,
  DirectorySyncLog,
  DirectoryType,
  SyncType,
  SyncStatus,
} from '@prisma/client-integration';

// ============================================================================
// Configuration Types
// ============================================================================

export interface DirectoryConfigInput {
  name: string;
  description?: string;
  type: DirectoryType;
  host: string;
  port?: number;
  useSSL?: boolean;
  useStartTLS?: boolean;
  baseDN: string;
  bindDN?: string;
  bindPassword?: string;
  userSearchBase: string;
  userSearchFilter?: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  timeout?: number;
  maxConnections?: number;
  enableSync?: boolean;
  syncInterval?: number;
}

export interface DirectoryConfigUpdate {
  name?: string;
  description?: string;
  host?: string;
  port?: number;
  useSSL?: boolean;
  useStartTLS?: boolean;
  baseDN?: string;
  bindDN?: string;
  bindPassword?: string;
  userSearchBase?: string;
  userSearchFilter?: string;
  groupSearchBase?: string;
  groupSearchFilter?: string;
  timeout?: number;
  maxConnections?: number;
  isActive?: boolean;
  enableSync?: boolean;
  syncInterval?: number;
}

// ============================================================================
// Mapping Types
// ============================================================================

export interface DirectoryUserMappingInput {
  configId: string;
  ldapAttribute: string;
  mesField: string;
  isRequired?: boolean;
  isIdentity?: boolean;
  defaultValue?: string;
  transform?: string;
  transformConfig?: Record<string, any>;
}

export interface DirectoryGroupMappingInput {
  configId: string;
  groupDN: string;
  groupName?: string;
  roleId: string;
  siteId?: string;
  autoAssign?: boolean;
  requiresApproval?: boolean;
  priority?: number;
}

// ============================================================================
// Directory Data Types (from LDAP/AD)
// ============================================================================

export interface DirectoryUser {
  dn: string;
  attributes: Record<string, string | string[]>;
  groups?: DirectoryGroup[];
  objectClass?: string[];
  // Common attributes (may not always be present)
  cn?: string;
  sAMAccountName?: string;
  userPrincipalName?: string;
  mail?: string;
  givenName?: string;
  sn?: string;
  displayName?: string;
  department?: string;
  title?: string;
  telephoneNumber?: string;
  mobile?: string;
  manager?: string;
  employeeID?: string;
  employeeNumber?: string;
  whenCreated?: Date;
  whenChanged?: Date;
  lastLogon?: Date;
  accountExpires?: Date;
  userAccountControl?: number;
  memberOf?: string[];
}

export interface DirectoryGroup {
  dn: string;
  attributes: Record<string, string | string[]>;
  members?: DirectoryUser[];
  objectClass?: string[];
  // Common attributes
  cn?: string;
  name?: string;
  sAMAccountName?: string;
  description?: string;
  groupType?: number;
  whenCreated?: Date;
  whenChanged?: Date;
  member?: string[];
  memberOf?: string[];
}

export interface DirectoryEntry {
  dn: string;
  attributes: Record<string, string | string[]>;
  objectClass?: string[];
}

// ============================================================================
// Search and Filter Types
// ============================================================================

export interface DirectorySearchOptions {
  base?: string;
  scope?: 'base' | 'one' | 'sub';
  filter?: string;
  attributes?: string[];
  sizeLimit?: number;
  timeLimit?: number;
  paged?: boolean;
  pageSize?: number;
  cookie?: Buffer;
}

export interface DirectorySearchResult {
  entries: DirectoryEntry[];
  referrals?: string[];
  controls?: any[];
  hasMore?: boolean;
  cookie?: Buffer;
}

export interface UserSearchFilters {
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  department?: string;
  title?: string;
  isActive?: boolean;
}

export interface GroupSearchFilters {
  name?: string;
  description?: string;
  type?: string;
}

// ============================================================================
// Synchronization Types
// ============================================================================

export interface SyncOptions {
  type?: SyncType;
  dryRun?: boolean;
  batchSize?: number;
  maxErrors?: number;
  includeUsers?: boolean;
  includeGroups?: boolean;
  userFilters?: UserSearchFilters;
  groupFilters?: GroupSearchFilters;
  onProgress?: (progress: SyncProgress) => void;
  onError?: (error: SyncError) => void;
}

export interface SyncProgress {
  stage: 'connecting' | 'users' | 'groups' | 'roles' | 'cleanup' | 'complete';
  current: number;
  total: number;
  percentage: number;
  message?: string;
  usersProcessed?: number;
  groupsProcessed?: number;
  errorsEncountered?: number;
}

export interface SyncResult {
  success: boolean;
  batchId: string;
  duration: number;
  statistics: {
    usersProcessed: number;
    usersCreated: number;
    usersUpdated: number;
    usersDeactivated: number;
    usersSkipped: number;
    groupsProcessed: number;
    rolesAssigned: number;
    rolesRevoked: number;
    errorCount: number;
    warningCount: number;
  };
  errors: SyncError[];
  warnings: SyncWarning[];
  summary: string;
}

export interface SyncError {
  type: 'connection' | 'authentication' | 'search' | 'mapping' | 'validation' | 'database';
  code: string;
  message: string;
  details?: Record<string, any>;
  userDN?: string;
  groupDN?: string;
  timestamp: Date;
  recoverable: boolean;
}

export interface SyncWarning {
  type: 'mapping' | 'validation' | 'conflict' | 'performance';
  code: string;
  message: string;
  details?: Record<string, any>;
  userDN?: string;
  groupDN?: string;
  timestamp: Date;
}

// ============================================================================
// Connection and Authentication Types
// ============================================================================

export interface ConnectionOptions {
  host: string;
  port: number;
  secure?: boolean;
  startTLS?: boolean;
  timeout?: number;
  connectTimeout?: number;
  idleTimeout?: number;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectDelay?: number;
}

export interface AuthenticationOptions {
  bindDN?: string;
  password?: string;
  saslMechanism?: 'PLAIN' | 'DIGEST-MD5' | 'GSSAPI';
  saslOptions?: Record<string, any>;
}

export interface ConnectionStatus {
  connected: boolean;
  authenticated: boolean;
  serverInfo?: {
    vendorName?: string;
    vendorVersion?: string;
    supportedLdapVersion?: string[];
    supportedSaslMechanisms?: string[];
    supportedExtensions?: string[];
    supportedControls?: string[];
    namingContexts?: string[];
    subschemaSubentry?: string;
  };
  lastError?: string;
  connectedAt?: Date;
  authenticatedAt?: Date;
}

// ============================================================================
// Validation and Testing Types
// ============================================================================

export interface ConfigValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  connectionTest?: ConnectionTestResult;
  searchTest?: SearchTestResult;
}

export interface ValidationError {
  field: string;
  code: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ValidationWarning {
  field: string;
  code: string;
  message: string;
  suggestion?: string;
}

export interface ConnectionTestResult {
  success: boolean;
  responseTime: number;
  error?: string;
  serverInfo?: ConnectionStatus['serverInfo'];
}

export interface SearchTestResult {
  success: boolean;
  userCount: number;
  groupCount: number;
  responseTime: number;
  error?: string;
  sampleUsers: DirectoryUser[];
  sampleGroups: DirectoryGroup[];
}

// ============================================================================
// Utility Types
// ============================================================================

export interface PaginationOptions {
  page?: number;
  limit?: number;
  offset?: number;
}

export interface SortOptions {
  field: string;
  direction: 'asc' | 'desc';
}

export interface FilterOptions {
  search?: string;
  type?: DirectoryType;
  status?: SyncStatus;
  isActive?: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface DirectoryConfigResponse extends DirectoryConfig {
  userMappings: DirectoryUserMapping[];
  groupMappings: DirectoryGroupMapping[];
  lastSyncLog?: DirectorySyncLog;
  connectionStatus?: ConnectionStatus;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta?: {
    timestamp: Date;
    requestId: string;
    duration: number;
  };
}

// ============================================================================
// Event Types
// ============================================================================

export interface DirectoryEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed' | 'connection_lost' | 'config_updated';
  configId: string;
  timestamp: Date;
  data: Record<string, any>;
  severity: 'info' | 'warning' | 'error';
}

export interface DirectorySyncEvent extends DirectoryEvent {
  type: 'sync_started' | 'sync_completed' | 'sync_failed';
  data: {
    batchId: string;
    syncType: SyncType;
    result?: SyncResult;
    error?: SyncError;
  };
}

// ============================================================================
// Type Guards
// ============================================================================

export function isDirectoryUser(entry: DirectoryEntry): entry is DirectoryUser {
  return entry.objectClass?.includes('person') ||
         entry.objectClass?.includes('user') ||
         entry.objectClass?.includes('inetOrgPerson') ||
         Boolean(entry.attributes.sAMAccountName || entry.attributes.uid);
}

export function isDirectoryGroup(entry: DirectoryEntry): entry is DirectoryGroup {
  return entry.objectClass?.includes('group') ||
         entry.objectClass?.includes('groupOfNames') ||
         entry.objectClass?.includes('groupOfUniqueNames') ||
         Boolean(entry.attributes.member || entry.attributes.uniqueMember);
}

export function isSyncError(item: any): item is SyncError {
  return item && typeof item.type === 'string' && typeof item.message === 'string' && item.recoverable !== undefined;
}

export function isSyncWarning(item: any): item is SyncWarning {
  return item && typeof item.type === 'string' && typeof item.message === 'string' && item.recoverable === undefined;
}