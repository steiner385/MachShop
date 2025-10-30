import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AzureAdService, AzureAdConfig } from '../../services/AzureAdService';
import { ConfidentialClientApplication, CryptoProvider } from '@azure/msal-node';
import { Client } from '@microsoft/microsoft-graph-client';
import { ClientSecretCredential } from '@azure/identity';

// Mock dependencies
vi.mock('@azure/msal-node');
vi.mock('@microsoft/microsoft-graph-client');
vi.mock('@azure/identity');
vi.mock('../lib/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
    role: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const MockedConfidentialClientApplication = ConfidentialClientApplication as vi.MockedClass<typeof ConfidentialClientApplication>;
const MockedClient = Client as vi.MockedClass<typeof Client>;
const MockedClientSecretCredential = ClientSecretCredential as vi.MockedClass<typeof ClientSecretCredential>;
const MockedCryptoProvider = CryptoProvider as vi.MockedClass<typeof CryptoProvider>;

describe('AzureAdService', () => {
  let azureAdService: AzureAdService;
  let mockConfig: AzureAdConfig;
  let mockMsalInstance: any;
  let mockGraphClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      tenantId: '12345678-1234-1234-1234-123456789012',
      clientId: '87654321-4321-4321-4321-210987654321',
      clientSecret: 'test-client-secret-value',
      authority: 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012',
      redirectUri: 'http://localhost:3000/auth/callback/azure',
      scopes: ['openid', 'profile', 'email', 'User.Read'],
    };

    // Mock MSAL instance
    mockMsalInstance = {
      acquireTokenByClientCredential: vi.fn(),
      getAuthCodeUrl: vi.fn(),
      acquireTokenByCode: vi.fn(),
      acquireTokenByRefreshToken: vi.fn(),
      getAuthority: vi.fn().mockResolvedValue('https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012'),
    };

    // Mock Graph client
    mockGraphClient = {
      api: vi.fn().mockReturnThis(),
      get: vi.fn(),
      select: vi.fn().mockReturnThis(),
      top: vi.fn().mockReturnThis(),
      orderby: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };

    // Setup constructor mocks
    MockedConfidentialClientApplication.mockImplementation(() => mockMsalInstance);
    MockedClient.mockImplementation(() => mockGraphClient);

    // Mock Client.initWithMiddleware static method
    MockedClient.initWithMiddleware = vi.fn().mockReturnValue(mockGraphClient);

    // Mock ClientSecretCredential
    MockedClientSecretCredential.mockImplementation(() => ({
      getToken: vi.fn().mockResolvedValue({ token: 'test-access-token' })
    }));

    // Mock CryptoProvider
    MockedCryptoProvider.mockImplementation(() => ({
      createNewGuid: vi.fn().mockReturnValue('12345678-1234-1234-1234-123456789012'),
      generatePkceCodes: vi.fn().mockReturnValue({
        challenge: 'test-challenge',
        verifier: 'test-verifier'
      })
    }));

    azureAdService = new AzureAdService();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('initialization', () => {
    it('should create service instance', () => {
      expect(azureAdService).toBeDefined();
      expect(azureAdService).toBeInstanceOf(AzureAdService);
    });

    it('should initialize with valid configuration', async () => {
      await expect(azureAdService.initialize(mockConfig)).resolves.not.toThrow();
    });

    it('should throw error with invalid tenant ID', async () => {
      const invalidConfig = { ...mockConfig, tenantId: 'invalid-tenant' };
      await expect(azureAdService.initialize(invalidConfig)).rejects.toThrow('Invalid tenant ID format');
    });

    it('should throw error with missing client ID', async () => {
      const invalidConfig = { ...mockConfig, clientId: '' };
      await expect(azureAdService.initialize(invalidConfig)).rejects.toThrow('Missing required Azure AD configuration: clientId');
    });

    it('should throw error with missing client secret', async () => {
      const invalidConfig = { ...mockConfig, clientSecret: '' };
      await expect(azureAdService.initialize(invalidConfig)).rejects.toThrow('Missing required Azure AD configuration: clientSecret');
    });
  });

  describe('authentication flow', () => {
    beforeEach(async () => {
      await azureAdService.initialize(mockConfig);
    });

    it('should generate authorization URL', async () => {
      const expectedUrl = 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012/oauth2/v2.0/authorize?...';
      mockMsalInstance.getAuthCodeUrl.mockResolvedValue(expectedUrl);

      const authUrl = await azureAdService.getAuthorizationUrl('test-state');

      expect(authUrl).toBe(expectedUrl);
      expect(mockMsalInstance.getAuthCodeUrl).toHaveBeenCalled();
    });

    it('should exchange authorization code for tokens', async () => {
      const mockTokenResponse = {
        accessToken: 'test-access-token',
        idToken: 'test-id-token',
        refreshToken: 'test-refresh-token',
        expiresOn: new Date(Date.now() + 3600000),
        account: {
          homeAccountId: 'test-account-id',
          localAccountId: 'test-local-id',
          username: 'test@example.com',
          name: 'Test User',
        },
      };

      mockMsalInstance.acquireTokenByCode.mockResolvedValue(mockTokenResponse);

      const result = await azureAdService.exchangeAuthorizationCode('test-code', 'test-state');

      expect(result).toHaveProperty('accessToken', 'test-access-token');
      expect(result).toHaveProperty('idToken', 'test-id-token');
      expect(result).toHaveProperty('refreshToken', 'test-refresh-token');
      expect(mockMsalInstance.acquireTokenByCode).toHaveBeenCalled();
    });

    it('should handle authentication errors', async () => {
      const error = new Error('Authentication failed');
      mockMsalInstance.acquireTokenByCode.mockRejectedValue(error);

      await expect(azureAdService.exchangeAuthorizationCode('invalid-code', 'state'))
        .rejects.toThrow();
    });
  });

  describe('user profile and groups', () => {
    beforeEach(async () => {
      await azureAdService.initialize(mockConfig);
    });

    it('should fetch user profile from Microsoft Graph', async () => {
      const mockUserProfile = {
        id: 'test-user-id',
        userPrincipalName: 'test@example.com',
        displayName: 'Test User',
        givenName: 'Test',
        surname: 'User',
        mail: 'test@example.com',
        jobTitle: 'Developer',
        department: 'Engineering',
      };

      // Mock the multiple Graph API calls that getUserProfile makes
      mockGraphClient.get
        .mockResolvedValueOnce(mockUserProfile) // First call for user profile
        .mockResolvedValueOnce({ value: [] }) // Second call for user groups
        .mockResolvedValueOnce({ value: [] }); // Third call for user roles

      const profile = await azureAdService.getUserProfile('test-access-token');

      expect(profile).toEqual({
        ...mockUserProfile,
        groups: [],
        roles: [],
        lastSignInDateTime: undefined
      });
      expect(mockGraphClient.api).toHaveBeenCalledWith('/me');
    });

    it('should fetch user groups', async () => {
      const mockGroups = [
        {
          id: 'group-1',
          displayName: 'Engineering Team',
          description: 'Engineering department group',
        },
        {
          id: 'group-2',
          displayName: 'Managers',
          description: 'Management group',
        },
      ];

      mockGraphClient.get.mockResolvedValue({ value: mockGroups });

      const groups = await azureAdService.getUserGroups('test-access-token', 'test-user-id');

      expect(groups).toEqual(mockGroups);
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/test-user-id/memberOf');
    });

    it('should handle Graph API errors', async () => {
      const error = new Error('Graph API error');
      mockGraphClient.get.mockRejectedValue(error);

      await expect(azureAdService.getUserProfile('invalid-token'))
        .rejects.toThrow();
    });
  });

  describe('user and group synchronization', () => {
    beforeEach(async () => {
      await azureAdService.initialize(mockConfig);
    });

    it('should sync users from Azure AD', async () => {
      const mockUsersResponse = {
        value: [
          {
            id: 'user-1',
            userPrincipalName: 'user1@example.com',
            displayName: 'User One',
            mail: 'user1@example.com',
            accountEnabled: true,
          },
        ],
      };

      mockGraphClient.get.mockResolvedValue(mockUsersResponse);

      const result = await azureAdService.syncUsers();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('membersProcessed', 1);
      expect(result).toHaveProperty('syncId');
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users');
    });

    it('should sync groups from Azure AD', async () => {
      const mockGroupsResponse = {
        value: [
          {
            id: 'group-1',
            displayName: 'Engineering Team',
            securityEnabled: true,
          },
        ],
      };

      mockGraphClient.get.mockResolvedValue(mockGroupsResponse);

      const result = await azureAdService.syncGroups();

      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('groupsProcessed', 1);
      expect(result).toHaveProperty('syncId');
      expect(mockGraphClient.api).toHaveBeenCalledWith('/groups');
    });

    it('should handle sync errors gracefully', async () => {
      const error = new Error('Sync error');
      mockGraphClient.get.mockRejectedValue(error);

      await expect(azureAdService.syncUsers()).rejects.toThrow('Sync error');
    });
  });

  describe('health status', () => {
    beforeEach(async () => {
      await azureAdService.initialize(mockConfig);
    });

    it('should return healthy status when connection works', async () => {
      const health = await azureAdService.getHealthStatus();

      expect(health).toHaveProperty('status', 'healthy');
      expect(health).toHaveProperty('details');
      expect(health.details).toHaveProperty('initialized', true);
      expect(health.details).toHaveProperty('config', true);
    });

    it('should return unhealthy status when connection fails', async () => {
      // Override the ClientSecretCredential mock to fail
      MockedClientSecretCredential.mockImplementation(() => ({
        getToken: vi.fn().mockRejectedValue(new Error('Connection failed'))
      }));

      const health = await azureAdService.getHealthStatus();

      expect(health).toHaveProperty('status', 'unhealthy');
      expect(health).toHaveProperty('details.error', 'Connection failed');
    });
  });

  describe('cleanup', () => {
    beforeEach(async () => {
      await azureAdService.initialize(mockConfig);
    });

    it('should cleanup resources', async () => {
      await expect(azureAdService.cleanup()).resolves.not.toThrow();
    });
  });
});