/**
 * Directory Service Interfaces
 * Issue #128: External Integration: LDAP/AD Role Synchronization
 *
 * This file defines the core interfaces for directory service implementations.
 * These interfaces provide a consistent API for different directory types
 * (LDAP, Active Directory, Azure AD, etc.).
 */

import {
  DirectoryConfig,
  DirectoryUser,
  DirectoryGroup,
  DirectoryEntry,
  DirectorySearchOptions,
  DirectorySearchResult,
  SyncOptions,
  SyncResult,
  ConnectionOptions,
  AuthenticationOptions,
  ConnectionStatus,
  ConfigValidationResult,
  ConnectionTestResult,
  SearchTestResult,
  UserSearchFilters,
  GroupSearchFilters,
} from '../../types/directory';

// ============================================================================
// Core Directory Service Interface
// ============================================================================

/**
 * Main interface that all directory service implementations must follow.
 * This provides a unified API for interacting with different directory types.
 */
export interface IDirectoryService {
  // ============================================================================
  // Connection Management
  // ============================================================================

  /**
   * Connect to the directory server
   */
  connect(config: DirectoryConfig, options?: ConnectionOptions): Promise<void>;

  /**
   * Disconnect from the directory server
   */
  disconnect(): Promise<void>;

  /**
   * Check if currently connected to the directory
   */
  isConnected(): boolean;

  /**
   * Get current connection status and server information
   */
  getConnectionStatus(): Promise<ConnectionStatus>;

  /**
   * Test connection with given configuration
   */
  testConnection(config: DirectoryConfig): Promise<ConnectionTestResult>;

  // ============================================================================
  // Authentication
  // ============================================================================

  /**
   * Authenticate a user against the directory
   */
  authenticateUser(username: string, password: string): Promise<boolean>;

  /**
   * Verify if a user exists in the directory
   */
  userExists(username: string): Promise<boolean>;

  /**
   * Change user password (if supported)
   */
  changePassword(username: string, oldPassword: string, newPassword: string): Promise<boolean>;

  // ============================================================================
  // User Operations
  // ============================================================================

  /**
   * Search for users in the directory
   */
  searchUsers(filters?: UserSearchFilters, options?: DirectorySearchOptions): Promise<DirectoryUser[]>;

  /**
   * Get a specific user by username/identifier
   */
  getUserByUsername(username: string): Promise<DirectoryUser | null>;

  /**
   * Get a user by distinguished name
   */
  getUserByDN(dn: string): Promise<DirectoryUser | null>;

  /**
   * Get all groups that a user is a member of
   */
  getUserGroups(userDN: string): Promise<DirectoryGroup[]>;

  /**
   * Check if a user is a member of a specific group
   */
  isUserMemberOf(userDN: string, groupDN: string): Promise<boolean>;

  // ============================================================================
  // Group Operations
  // ============================================================================

  /**
   * Search for groups in the directory
   */
  searchGroups(filters?: GroupSearchFilters, options?: DirectorySearchOptions): Promise<DirectoryGroup[]>;

  /**
   * Get a specific group by name
   */
  getGroupByName(name: string): Promise<DirectoryGroup | null>;

  /**
   * Get a group by distinguished name
   */
  getGroupByDN(dn: string): Promise<DirectoryGroup | null>;

  /**
   * Get all members of a specific group
   */
  getGroupMembers(groupDN: string, recursive?: boolean): Promise<DirectoryUser[]>;

  /**
   * Get nested groups (groups that are members of other groups)
   */
  getNestedGroups(groupDN: string): Promise<DirectoryGroup[]>;

  // ============================================================================
  // Generic Search Operations
  // ============================================================================

  /**
   * Perform a generic LDAP search
   */
  search(options: DirectorySearchOptions): Promise<DirectorySearchResult>;

  /**
   * Get a specific entry by distinguished name
   */
  getEntry(dn: string, attributes?: string[]): Promise<DirectoryEntry | null>;

  /**
   * Check if a distinguished name exists
   */
  entryExists(dn: string): Promise<boolean>;

  // ============================================================================
  // Synchronization Operations
  // ============================================================================

  /**
   * Perform a full synchronization
   */
  fullSync(options?: SyncOptions): Promise<SyncResult>;

  /**
   * Perform an incremental synchronization
   */
  incrementalSync(options?: SyncOptions): Promise<SyncResult>;

  /**
   * Synchronize only users
   */
  syncUsers(options?: SyncOptions): Promise<SyncResult>;

  /**
   * Synchronize only groups and role mappings
   */
  syncGroups(options?: SyncOptions): Promise<SyncResult>;

  // ============================================================================
  // Configuration and Validation
  // ============================================================================

  /**
   * Validate configuration settings
   */
  validateConfig(config: DirectoryConfig): Promise<ConfigValidationResult>;

  /**
   * Test search operations with the current configuration
   */
  testSearch(config: DirectoryConfig): Promise<SearchTestResult>;

  /**
   * Get directory schema information
   */
  getSchema(): Promise<DirectorySchema>;

  /**
   * Get server capabilities
   */
  getCapabilities(): Promise<DirectoryCapabilities>;
}

// ============================================================================
// Specialized Interfaces
// ============================================================================

/**
 * Interface for directory services that support real-time change notifications
 */
export interface IChangeNotificationService {
  /**
   * Start listening for directory changes
   */
  startChangeNotifications(callback: (change: DirectoryChange) => void): Promise<void>;

  /**
   * Stop listening for directory changes
   */
  stopChangeNotifications(): Promise<void>;

  /**
   * Check if change notifications are supported
   */
  supportsChangeNotifications(): boolean;
}

/**
 * Interface for directory services that support advanced query features
 */
export interface IAdvancedQueryService {
  /**
   * Perform a paged search for large result sets
   */
  pagedSearch(options: DirectorySearchOptions & { pageSize: number }): AsyncIterableIterator<DirectoryEntry[]>;

  /**
   * Perform a search with sorting
   */
  sortedSearch(options: DirectorySearchOptions & { sortBy: string; sortOrder: 'asc' | 'desc' }): Promise<DirectorySearchResult>;

  /**
   * Get approximate entry count for a search filter
   */
  getEntryCount(filter: string, base?: string): Promise<number>;
}

/**
 * Interface for directory services that support write operations
 */
export interface IWritableDirectoryService {
  /**
   * Create a new user in the directory
   */
  createUser(userAttributes: Record<string, string | string[]>): Promise<string>;

  /**
   * Update an existing user
   */
  updateUser(dn: string, changes: Record<string, string | string[]>): Promise<void>;

  /**
   * Delete a user from the directory
   */
  deleteUser(dn: string): Promise<void>;

  /**
   * Add a user to a group
   */
  addUserToGroup(userDN: string, groupDN: string): Promise<void>;

  /**
   * Remove a user from a group
   */
  removeUserFromGroup(userDN: string, groupDN: string): Promise<void>;
}

// ============================================================================
// Factory Interface
// ============================================================================

/**
 * Factory interface for creating directory service instances
 */
export interface IDirectoryServiceFactory {
  /**
   * Create a directory service instance for the given configuration
   */
  createService(config: DirectoryConfig): Promise<IDirectoryService>;

  /**
   * Get supported directory types
   */
  getSupportedTypes(): string[];

  /**
   * Check if a directory type is supported
   */
  isTypeSupported(type: string): boolean;
}

// ============================================================================
// Supporting Types
// ============================================================================

export interface DirectorySchema {
  objectClasses: ObjectClassDefinition[];
  attributeTypes: AttributeTypeDefinition[];
  syntaxes: SyntaxDefinition[];
  matchingRules: MatchingRuleDefinition[];
}

export interface ObjectClassDefinition {
  oid: string;
  name: string;
  description?: string;
  structural: boolean;
  auxiliary: boolean;
  abstract: boolean;
  superClasses: string[];
  requiredAttributes: string[];
  optionalAttributes: string[];
}

export interface AttributeTypeDefinition {
  oid: string;
  name: string;
  description?: string;
  syntax: string;
  equality?: string;
  ordering?: string;
  substring?: string;
  singleValue: boolean;
  userModifiable: boolean;
  usage: 'userApplications' | 'directoryOperation' | 'distributedOperation' | 'dSAOperation';
}

export interface SyntaxDefinition {
  oid: string;
  description?: string;
}

export interface MatchingRuleDefinition {
  oid: string;
  name: string;
  description?: string;
  syntax: string;
}

export interface DirectoryCapabilities {
  supportsStartTLS: boolean;
  supportsSSL: boolean;
  supportsPaging: boolean;
  supportsSorting: boolean;
  supportsChangeNotifications: boolean;
  supportsWriteOperations: boolean;
  maxConnections?: number;
  maxPageSize?: number;
  maxTimeLimit?: number;
  supportedLdapVersions: string[];
  supportedSaslMechanisms: string[];
  supportedExtensions: string[];
  supportedControls: string[];
  vendorName?: string;
  vendorVersion?: string;
}

export interface DirectoryChange {
  type: 'add' | 'modify' | 'delete' | 'modifyDN';
  dn: string;
  changeNumber?: number;
  changeTime?: Date;
  changes?: ChangeDetail[];
  newDN?: string; // For modifyDN operations
}

export interface ChangeDetail {
  operation: 'add' | 'delete' | 'replace';
  attribute: string;
  values?: string[];
}

// ============================================================================
// Error Types
// ============================================================================

export abstract class DirectoryServiceError extends Error {
  abstract readonly code: string;
  abstract readonly recoverable: boolean;

  constructor(message: string, public readonly details?: Record<string, any>) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ConnectionError extends DirectoryServiceError {
  readonly code = 'CONNECTION_ERROR';
  readonly recoverable = true;
}

export class AuthenticationError extends DirectoryServiceError {
  readonly code = 'AUTHENTICATION_ERROR';
  readonly recoverable = false;
}

export class SearchError extends DirectoryServiceError {
  readonly code = 'SEARCH_ERROR';
  readonly recoverable = true;
}

export class ValidationError extends DirectoryServiceError {
  readonly code = 'VALIDATION_ERROR';
  readonly recoverable = false;
}

export class UnsupportedOperationError extends DirectoryServiceError {
  readonly code = 'UNSUPPORTED_OPERATION';
  readonly recoverable = false;
}

export class TimeoutError extends DirectoryServiceError {
  readonly code = 'TIMEOUT_ERROR';
  readonly recoverable = true;
}

export class RateLimitError extends DirectoryServiceError {
  readonly code = 'RATE_LIMIT_ERROR';
  readonly recoverable = true;
}

// ============================================================================
// Service Registry Interface
// ============================================================================

/**
 * Interface for managing multiple directory service instances
 */
export interface IDirectoryServiceRegistry {
  /**
   * Register a directory service instance
   */
  register(configId: string, service: IDirectoryService): void;

  /**
   * Unregister a directory service instance
   */
  unregister(configId: string): void;

  /**
   * Get a directory service instance
   */
  get(configId: string): IDirectoryService | null;

  /**
   * Get all registered service instances
   */
  getAll(): Map<string, IDirectoryService>;

  /**
   * Check if a service is registered
   */
  has(configId: string): boolean;

  /**
   * Dispose all registered services
   */
  disposeAll(): Promise<void>;
}

// ============================================================================
// Event Emitter Interface
// ============================================================================

export interface IDirectoryEventEmitter {
  /**
   * Emit a directory event
   */
  emit(event: string, data: any): void;

  /**
   * Listen for directory events
   */
  on(event: string, listener: (...args: any[]) => void): void;

  /**
   * Remove event listener
   */
  off(event: string, listener: (...args: any[]) => void): void;

  /**
   * Listen for an event once
   */
  once(event: string, listener: (...args: any[]) => void): void;
}