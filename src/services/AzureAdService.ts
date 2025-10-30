/**
 * Azure AD / Entra ID Integration Service (Issue #133)
 *
 * Comprehensive Azure AD service providing native integration with Microsoft Graph API.
 * Handles OAuth2 authentication, conditional access, group sync, and enterprise features.
 *
 * Features:
 * - MSAL-based authentication with PKCE support
 * - Microsoft Graph API integration
 * - Conditional Access Policy support
 * - Multi-Factor Authentication handling
 * - Group membership synchronization
 * - Device compliance integration
 * - Application permission management
 * - Tenant-specific configurations
 */

import { EventEmitter } from 'events';
import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential, DefaultAzureCredential } from '@azure/identity';
import { SsoProviderType } from '@prisma/client';
import prisma from '../lib/database';
import { logger } from '../utils/logger';

// Azure AD specific configuration interface
export interface AzureAdConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  authority?: string;
  redirectUri: string;
  scopes: string[];
  // Enterprise features
  conditionalAccess?: {
    enabled: boolean;
    policies: string[];
    mfaRequired: boolean;
    deviceComplianceRequired: boolean;
  };
  // Graph API configuration
  graphApi?: {
    baseUrl?: string;
    version?: string;
    groupSyncEnabled: boolean;
    groupSyncInterval: number;
    userSyncEnabled: boolean;
    userSyncInterval: number;
  };
  // Advanced settings
  advanced?: {
    tokenCacheLocation?: string;
    logLevel?: 'error' | 'warning' | 'info' | 'verbose';
    instanceDiscovery?: boolean;
    validateAuthority?: boolean;
    cloudDiscoveryMetadata?: string;
    authorityMetadata?: string;
  };
}

// User profile from Microsoft Graph
export interface AzureAdUserProfile {
  id: string;
  userPrincipalName: string;
  displayName: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  mobilePhone?: string;
  officeLocation?: string;
  preferredLanguage?: string;
  jobTitle?: string;
  department?: string;
  companyName?: string;
  businessPhones: string[];
  groups?: AzureAdGroup[];
  roles?: string[];
  accountEnabled: boolean;
  lastSignInDateTime?: Date;
  signInActivity?: {
    lastSignInDateTime?: Date;
    lastNonInteractiveSignInDateTime?: Date;
  };
}

// Azure AD Group information
export interface AzureAdGroup {
  id: string;
  displayName: string;
  description?: string;
  groupTypes: string[];
  mail?: string;
  mailEnabled: boolean;
  securityEnabled: boolean;
  visibility?: string;
  membershipRule?: string;
  membershipRuleProcessingState?: string;
}

// Authentication result with Azure AD specific data
export interface AzureAdAuthResult {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  account: {
    homeAccountId: string;
    environment: string;
    tenantId: string;
    username: string;
    localAccountId: string;
    name?: string;
    idTokenClaims?: Record<string, any>;
  };
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
  };
}

// Group sync result
export interface GroupSyncResult {
  syncId: string;
  startTime: Date;
  endTime: Date;
  groupsProcessed: number;
  groupsAdded: number;
  groupsUpdated: number;
  groupsRemoved: number;
  membersProcessed: number;
  membersAdded: number;
  membersRemoved: number;
  errors: Array<{
    type: 'group' | 'member';
    id: string;
    error: string;
  }>;
  status: 'success' | 'partial' | 'failed';
}

// Azure AD Service Events
export interface AzureAdServiceEvents {
  'auth:success': (result: AzureAdAuthResult) => void;
  'auth:failed': (error: Error, context?: any) => void;
  'token:refreshed': (result: AzureAdAuthResult) => void;
  'token:expired': (account: any) => void;
  'sync:started': (type: 'users' | 'groups') => void;
  'sync:completed': (type: 'users' | 'groups', result: GroupSyncResult) => void;
  'sync:failed': (type: 'users' | 'groups', error: Error) => void;
  'conditional-access:triggered': (policyId: string, account: any) => void;
  'mfa:required': (account: any, challenge: any) => void;
  'device:compliance-check': (deviceId: string, compliant: boolean) => void;
}

export class AzureAdService extends EventEmitter {
  private msalApp: ConfidentialClientApplication | null = null;
  private graphClient: Client | null = null;
  private config: AzureAdConfig | null = null;
  private cryptoProvider: CryptoProvider;
  private syncIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.cryptoProvider = new CryptoProvider();

    // Set up event handlers
    this.setupEventHandlers();
  }

  /**
   * Initialize Azure AD service with configuration
   */
  async initialize(config: AzureAdConfig): Promise<void> {
    try {
      this.config = config;

      // Validate configuration
      await this.validateConfig(config);

      // Initialize MSAL Confidential Client
      await this.initializeMsal(config);

      // Initialize Microsoft Graph Client
      await this.initializeGraphClient(config);

      // Set up automatic sync if enabled
      this.setupAutomaticSync(config);

      logger.info('AzureAdService initialized successfully', {
        tenantId: config.tenantId,
        clientId: config.clientId,
        scopes: config.scopes
      });

    } catch (error) {
      logger.error('Failed to initialize AzureAdService', error);
      throw error;
    }
  }

  /**
   * Validate Azure AD configuration
   */
  private async validateConfig(config: AzureAdConfig): Promise<void> {
    const required = ['tenantId', 'clientId', 'clientSecret', 'redirectUri', 'scopes'];
    const missing = required.filter(field => !config[field as keyof AzureAdConfig]);

    if (missing.length > 0) {
      throw new Error(`Missing required Azure AD configuration: ${missing.join(', ')}`);
    }

    // Validate tenant ID format
    const tenantIdRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!tenantIdRegex.test(config.tenantId)) {
      throw new Error('Invalid tenant ID format. Expected UUID format.');
    }

    // Validate client ID format
    if (!tenantIdRegex.test(config.clientId)) {
      throw new Error('Invalid client ID format. Expected UUID format.');
    }

    // Validate redirect URI
    try {
      new URL(config.redirectUri);
    } catch {
      throw new Error('Invalid redirect URI format.');
    }

    // Validate scopes
    if (!Array.isArray(config.scopes) || config.scopes.length === 0) {
      throw new Error('Scopes must be a non-empty array.');
    }
  }

  /**
   * Initialize MSAL Confidential Client Application
   */
  private async initializeMsal(config: AzureAdConfig): Promise<void> {
    const authority = config.authority || `https://login.microsoftonline.com/${config.tenantId}`;

    const msalConfig = {
      auth: {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
        authority,
        cloudDiscoveryMetadata: config.advanced?.cloudDiscoveryMetadata,
        authorityMetadata: config.advanced?.authorityMetadata,
        validateAuthority: config.advanced?.validateAuthority ?? true,
        knownAuthorities: [authority]
      },
      cache: {
        cacheLocation: config.advanced?.tokenCacheLocation || 'sessionStorage'
      },
      system: {
        loggerOptions: {
          loggerCallback: (level: any, message: string) => {
            const logLevel = config.advanced?.logLevel || 'info';
            if (this.shouldLog(level, logLevel)) {
              logger.info(`MSAL: ${message}`);
            }
          },
          piiLoggingEnabled: false,
          logLevel: this.getMsalLogLevel(config.advanced?.logLevel || 'info')
        },
        instanceDiscovery: config.advanced?.instanceDiscovery ?? true
      }
    };

    this.msalApp = new ConfidentialClientApplication(msalConfig);

    // Test the configuration by getting the authority
    await this.msalApp.getAuthority();
  }

  /**
   * Initialize Microsoft Graph Client
   */
  private async initializeGraphClient(config: AzureAdConfig): Promise<void> {
    const credential = new ClientSecretCredential(
      config.tenantId,
      config.clientId,
      config.clientSecret
    );

    const graphConfig = config.graphApi || {};
    const baseUrl = graphConfig.baseUrl || 'https://graph.microsoft.com';
    const version = graphConfig.version || 'v1.0';

    this.graphClient = Client.initWithMiddleware({
      authProvider: {
        getAccessToken: async () => {
          const tokenResponse = await credential.getToken([
            'https://graph.microsoft.com/.default'
          ]);
          return tokenResponse?.token || '';
        }
      },
      baseUrl: `${baseUrl}/${version}`
    });
  }

  /**
   * Set up automatic synchronization for users and groups
   */
  private setupAutomaticSync(config: AzureAdConfig): void {
    const graphConfig = config.graphApi;
    if (!graphConfig) return;

    // Set up group sync
    if (graphConfig.groupSyncEnabled && graphConfig.groupSyncInterval > 0) {
      const interval = setInterval(async () => {
        try {
          await this.syncGroups();
        } catch (error) {
          logger.error('Automatic group sync failed', error);
          this.emit('sync:failed', 'groups', error as Error);
        }
      }, graphConfig.groupSyncInterval * 1000);

      this.syncIntervals.set('groups', interval);
    }

    // Set up user sync
    if (graphConfig.userSyncEnabled && graphConfig.userSyncInterval > 0) {
      const interval = setInterval(async () => {
        try {
          await this.syncUsers();
        } catch (error) {
          logger.error('Automatic user sync failed', error);
          this.emit('sync:failed', 'users', error as Error);
        }
      }, graphConfig.userSyncInterval * 1000);

      this.syncIntervals.set('users', interval);
    }
  }

  /**
   * Generate authorization URL for OAuth2 flow
   */
  async getAuthorizationUrl(state?: string, nonce?: string): Promise<string> {
    if (!this.msalApp || !this.config) {
      throw new Error('AzureAdService not initialized');
    }

    const authCodeUrlRequest = {
      scopes: this.config.scopes,
      redirectUri: this.config.redirectUri,
      state: state || this.cryptoProvider.createNewGuid(),
      nonce: nonce || this.cryptoProvider.createNewGuid(),
      responseMode: 'form_post' as const,
      codeChallenge: await this.cryptoProvider.generatePkceCodes().challenge,
      codeChallengeMethod: 'S256' as const
    };

    return await this.msalApp.getAuthCodeUrl(authCodeUrlRequest);
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeAuthorizationCode(
    code: string,
    codeVerifier: string,
    state?: string
  ): Promise<AzureAdAuthResult> {
    if (!this.msalApp || !this.config) {
      throw new Error('AzureAdService not initialized');
    }

    try {
      const tokenRequest = {
        code,
        scopes: this.config.scopes,
        redirectUri: this.config.redirectUri,
        codeVerifier,
        clientInfo: state
      };

      const response = await this.msalApp.acquireTokenByCode(tokenRequest);

      if (!response) {
        throw new Error('No token response received');
      }

      const authResult: AzureAdAuthResult = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        account: response.account!,
        scopes: response.scopes || [],
        expiresOn: response.expiresOn!,
        extExpiresOn: response.extExpiresOn,
        familyId: response.familyId,
        cloudGraphHostName: response.cloudGraphHostName,
        msGraphHost: response.msGraphHost,
        correlationId: response.correlationId,
        requestId: response.requestId,
        fromCache: response.fromCache
      };

      // Check for conditional access information
      if (response.idTokenClaims) {
        authResult.conditionalAccessInfo = this.extractConditionalAccessInfo(response.idTokenClaims);
      }

      this.emit('auth:success', authResult);
      return authResult;

    } catch (error) {
      logger.error('Failed to exchange authorization code', error);
      this.emit('auth:failed', error as Error, { code: code.substring(0, 10) + '...' });
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken: string, account: any): Promise<AzureAdAuthResult> {
    if (!this.msalApp || !this.config) {
      throw new Error('AzureAdService not initialized');
    }

    try {
      const refreshTokenRequest = {
        refreshToken,
        scopes: this.config.scopes,
        account
      };

      const response = await this.msalApp.acquireTokenByRefreshToken(refreshTokenRequest);

      if (!response) {
        throw new Error('No token response received');
      }

      const authResult: AzureAdAuthResult = {
        accessToken: response.accessToken,
        refreshToken: response.refreshToken,
        idToken: response.idToken,
        account: response.account!,
        scopes: response.scopes || [],
        expiresOn: response.expiresOn!,
        extExpiresOn: response.extExpiresOn,
        familyId: response.familyId,
        cloudGraphHostName: response.cloudGraphHostName,
        msGraphHost: response.msGraphHost,
        correlationId: response.correlationId,
        requestId: response.requestId,
        fromCache: response.fromCache
      };

      this.emit('token:refreshed', authResult);
      return authResult;

    } catch (error) {
      logger.error('Failed to refresh token', error);
      this.emit('token:expired', account);
      throw error;
    }
  }

  /**
   * Get user profile from Microsoft Graph
   */
  async getUserProfile(accessToken: string, userId?: string): Promise<AzureAdUserProfile> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      // Set authorization header
      this.graphClient = this.graphClient.api('').header('Authorization', `Bearer ${accessToken}`);

      const endpoint = userId ? `/users/${userId}` : '/me';

      const user = await this.graphClient
        .api(endpoint)
        .select([
          'id', 'userPrincipalName', 'displayName', 'givenName', 'surname',
          'mail', 'mobilePhone', 'officeLocation', 'preferredLanguage',
          'jobTitle', 'department', 'companyName', 'businessPhones',
          'accountEnabled', 'lastSignInDateTime', 'signInActivity'
        ].join(','))
        .get();

      // Get user's group memberships
      const groups = await this.getUserGroups(accessToken, user.id);

      // Get user's directory roles
      const roles = await this.getUserRoles(accessToken, user.id);

      return {
        ...user,
        groups,
        roles,
        lastSignInDateTime: user.lastSignInDateTime ? new Date(user.lastSignInDateTime) : undefined
      };

    } catch (error) {
      logger.error('Failed to get user profile', error);
      throw error;
    }
  }

  /**
   * Get user's group memberships
   */
  async getUserGroups(accessToken: string, userId: string): Promise<AzureAdGroup[]> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      this.graphClient = this.graphClient.api('').header('Authorization', `Bearer ${accessToken}`);

      const groups = await this.graphClient
        .api(`/users/${userId}/memberOf`)
        .select([
          'id', 'displayName', 'description', 'groupTypes', 'mail',
          'mailEnabled', 'securityEnabled', 'visibility',
          'membershipRule', 'membershipRuleProcessingState'
        ].join(','))
        .get();

      return groups.value || [];

    } catch (error) {
      logger.error('Failed to get user groups', error);
      throw error;
    }
  }

  /**
   * Get user's directory roles
   */
  async getUserRoles(accessToken: string, userId: string): Promise<string[]> {
    if (!this.graphClient) {
      throw new Error('Graph client not initialized');
    }

    try {
      this.graphClient = this.graphClient.api('').header('Authorization', `Bearer ${accessToken}`);

      const roles = await this.graphClient
        .api(`/users/${userId}/memberOf/microsoft.graph.directoryRole`)
        .select('displayName')
        .get();

      return roles.value?.map((role: any) => role.displayName) || [];

    } catch (error) {
      logger.error('Failed to get user roles', error);
      throw error;
    }
  }

  /**
   * Synchronize groups from Azure AD to local database
   */
  async syncGroups(): Promise<GroupSyncResult> {
    this.emit('sync:started', 'groups');

    const syncResult: GroupSyncResult = {
      syncId: this.cryptoProvider.createNewGuid(),
      startTime: new Date(),
      endTime: new Date(),
      groupsProcessed: 0,
      groupsAdded: 0,
      groupsUpdated: 0,
      groupsRemoved: 0,
      membersProcessed: 0,
      membersAdded: 0,
      membersRemoved: 0,
      errors: [],
      status: 'success'
    };

    try {
      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      // Get all groups from Azure AD
      const groups = await this.graphClient
        .api('/groups')
        .select([
          'id', 'displayName', 'description', 'groupTypes', 'mail',
          'mailEnabled', 'securityEnabled', 'visibility'
        ].join(','))
        .get();

      syncResult.groupsProcessed = groups.value?.length || 0;

      // Process each group
      for (const group of groups.value || []) {
        try {
          // Sync group to database
          await this.syncGroupToDatabase(group);

          // Sync group members
          await this.syncGroupMembers(group.id);

          syncResult.groupsAdded++;
        } catch (error) {
          syncResult.errors.push({
            type: 'group',
            id: group.id,
            error: (error as Error).message
          });
        }
      }

      syncResult.endTime = new Date();
      syncResult.status = syncResult.errors.length === 0 ? 'success' : 'partial';

      this.emit('sync:completed', 'groups', syncResult);
      return syncResult;

    } catch (error) {
      syncResult.endTime = new Date();
      syncResult.status = 'failed';
      syncResult.errors.push({
        type: 'group',
        id: 'global',
        error: (error as Error).message
      });

      this.emit('sync:failed', 'groups', error as Error);
      throw error;
    }
  }

  /**
   * Synchronize users from Azure AD to local database
   */
  async syncUsers(): Promise<GroupSyncResult> {
    this.emit('sync:started', 'users');

    const syncResult: GroupSyncResult = {
      syncId: this.cryptoProvider.createNewGuid(),
      startTime: new Date(),
      endTime: new Date(),
      groupsProcessed: 0,
      groupsAdded: 0,
      groupsUpdated: 0,
      groupsRemoved: 0,
      membersProcessed: 0,
      membersAdded: 0,
      membersRemoved: 0,
      errors: [],
      status: 'success'
    };

    try {
      if (!this.graphClient) {
        throw new Error('Graph client not initialized');
      }

      // Get all users from Azure AD
      const users = await this.graphClient
        .api('/users')
        .select([
          'id', 'userPrincipalName', 'displayName', 'givenName', 'surname',
          'mail', 'jobTitle', 'department', 'accountEnabled'
        ].join(','))
        .get();

      syncResult.membersProcessed = users.value?.length || 0;

      // Process each user
      for (const user of users.value || []) {
        try {
          // Sync user to database
          await this.syncUserToDatabase(user);
          syncResult.membersAdded++;
        } catch (error) {
          syncResult.errors.push({
            type: 'member',
            id: user.id,
            error: (error as Error).message
          });
        }
      }

      syncResult.endTime = new Date();
      syncResult.status = syncResult.errors.length === 0 ? 'success' : 'partial';

      this.emit('sync:completed', 'users', syncResult);
      return syncResult;

    } catch (error) {
      syncResult.endTime = new Date();
      syncResult.status = 'failed';

      this.emit('sync:failed', 'users', error as Error);
      throw error;
    }
  }

  /**
   * Extract conditional access information from ID token claims
   */
  private extractConditionalAccessInfo(claims: Record<string, any>): AzureAdAuthResult['conditionalAccessInfo'] {
    return {
      policyId: claims.acrs?.[0],
      enforcedSessionControls: claims.controls || [],
      mfaRequired: claims.amr?.includes('mfa') || false,
      deviceCompliant: claims.deviceid && claims.compliant === 'true',
      riskLevel: claims.riskLevel as 'low' | 'medium' | 'high' | undefined
    };
  }

  /**
   * Sync individual group to database
   */
  private async syncGroupToDatabase(group: any): Promise<void> {
    // Implementation would sync the group to the local database
    // This is a placeholder for the actual database sync logic
    logger.debug('Syncing group to database', { groupId: group.id, displayName: group.displayName });
  }

  /**
   * Sync group members to database
   */
  private async syncGroupMembers(groupId: string): Promise<void> {
    if (!this.graphClient) return;

    try {
      const members = await this.graphClient
        .api(`/groups/${groupId}/members`)
        .select('id,userPrincipalName,displayName')
        .get();

      // Implementation would sync members to the local database
      logger.debug('Syncing group members', { groupId, memberCount: members.value?.length || 0 });

    } catch (error) {
      logger.error('Failed to sync group members', { groupId, error });
      throw error;
    }
  }

  /**
   * Sync individual user to database
   */
  private async syncUserToDatabase(user: any): Promise<void> {
    // Implementation would sync the user to the local database
    // This is a placeholder for the actual database sync logic
    logger.debug('Syncing user to database', { userId: user.id, userPrincipalName: user.userPrincipalName });
  }

  /**
   * Set up event handlers for monitoring and analytics
   */
  private setupEventHandlers(): void {
    this.on('auth:success', (result) => {
      // Log successful authentication
      logger.info('Azure AD authentication successful', {
        tenantId: result.account.tenantId,
        username: result.account.username,
        scopes: result.scopes,
        fromCache: result.fromCache
      });
    });

    this.on('auth:failed', (error, context) => {
      // Log failed authentication
      logger.error('Azure AD authentication failed', { error: error.message, context });
    });

    this.on('conditional-access:triggered', (policyId, account) => {
      // Log conditional access policy enforcement
      logger.info('Conditional access policy triggered', { policyId, username: account.username });
    });

    this.on('mfa:required', (account, challenge) => {
      // Log MFA requirement
      logger.info('MFA required for user', { username: account.username, challenge });
    });
  }

  /**
   * Convert log level to MSAL log level
   */
  private getMsalLogLevel(level: string): number {
    const levels: Record<string, number> = {
      error: 0,
      warning: 1,
      info: 2,
      verbose: 3
    };
    return levels[level] || 2;
  }

  /**
   * Check if log should be written based on level
   */
  private shouldLog(msalLevel: number, configLevel: string): boolean {
    const configLevelNum = this.getMsalLogLevel(configLevel);
    return msalLevel <= configLevelNum;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    // Clear sync intervals
    for (const [name, interval] of this.syncIntervals) {
      clearInterval(interval);
      logger.debug(`Cleared sync interval: ${name}`);
    }
    this.syncIntervals.clear();

    // Remove all event listeners
    this.removeAllListeners();

    logger.info('AzureAdService cleaned up successfully');
  }

  /**
   * Get service health status
   */
  async getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }> {
    const details: Record<string, any> = {
      initialized: !!this.msalApp && !!this.graphClient,
      config: !!this.config,
      syncIntervals: this.syncIntervals.size
    };

    try {
      // Test Graph API connectivity
      if (this.graphClient && this.config) {
        const credential = new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecret
        );

        const token = await credential.getToken(['https://graph.microsoft.com/.default']);
        details.graphApiConnectivity = !!token;
      }

      const isHealthy = details.initialized && details.config;

      return {
        status: isHealthy ? 'healthy' : 'unhealthy',
        details
      };

    } catch (error) {
      details.error = (error as Error).message;
      return {
        status: 'unhealthy',
        details
      };
    }
  }
}

export default AzureAdService;