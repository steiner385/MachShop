import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import express from 'express';
import { AzureAdService } from '../../services/AzureAdService';
import { SsoProviderService } from '../../services/SsoProviderService';
import { MicrosoftGraphService } from '../../services/MicrosoftGraphService';
import database from '../../lib/database';

// Mock external dependencies
vi.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: vi.fn(),
  CryptoProvider: vi.fn()
}));

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: vi.fn()
}));

vi.mock('@azure/identity', () => ({
  ClientSecretCredential: vi.fn()
}));

describe('Azure AD Integration End-to-End Tests', () => {
  let app: express.Application;
  let providerService: SsoProviderService;
  let azureAdService: AzureAdService;
  let graphService: MicrosoftGraphService;
  let testProviderId: string;

  const mockAzureAdConfig = {
    tenantId: '12345678-1234-1234-1234-123456789012',
    clientId: '87654321-4321-4321-4321-210987654321',
    clientSecret: 'test-client-secret-value',
    authority: 'https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012',
    redirectUri: 'http://localhost:3001/api/v1/sso/callback/azure',
    scopes: ['openid', 'profile', 'email', 'User.Read'],
    responseType: 'code',
    responseMode: 'query'
  };

  const mockUserProfile = {
    id: 'azure-user-123',
    userPrincipalName: 'testuser@company.com',
    displayName: 'Test User',
    givenName: 'Test',
    surname: 'User',
    mail: 'testuser@company.com',
    jobTitle: 'Software Engineer',
    department: 'Engineering',
    mobilePhone: '+1-555-0123'
  };

  const mockTokenResponse = {
    accessToken: 'mock-access-token',
    idToken: 'mock-id-token',
    refreshToken: 'mock-refresh-token',
    expiresOn: new Date(Date.now() + 3600000),
    account: {
      homeAccountId: 'test-account-id',
      localAccountId: 'test-local-id',
      username: 'testuser@company.com',
      name: 'Test User'
    }
  };

  beforeAll(async () => {
    // Setup test application
    app = express();
    app.use(express.json());

    // Initialize services
    providerService = SsoProviderService.getInstance();
    azureAdService = new AzureAdService();
    graphService = new MicrosoftGraphService();

    // Setup routes
    app.get('/api/v1/sso/login/azure', async (req, res) => {
      try {
        const authUrl = await azureAdService.getAuthorizationUrl('test-state');
        res.json({ authUrl, provider: 'azure-ad' });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/v1/sso/callback/azure', async (req, res) => {
      try {
        const { code, state } = req.body;
        const tokenResponse = await azureAdService.exchangeAuthorizationCode(code, state);
        const userProfile = await azureAdService.getUserProfile(tokenResponse.accessToken);

        res.json({
          success: true,
          user: userProfile,
          tokens: {
            accessToken: tokenResponse.accessToken,
            idToken: tokenResponse.idToken,
            expiresAt: tokenResponse.expiresOn
          }
        });
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    });

    app.get('/api/v1/admin/azure-ad/health', async (req, res) => {
      try {
        const health = await azureAdService.getHealthStatus();
        res.json(health);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.post('/api/v1/admin/azure-ad/sync/users', async (req, res) => {
      try {
        const syncResult = await graphService.syncUsers();
        res.json(syncResult);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    app.get('/api/v1/admin/azure-ad/users/:userId', async (req, res) => {
      try {
        const { userId } = req.params;
        const userProfile = await graphService.getUserProfile(userId);
        res.json(userProfile);
      } catch (error) {
        res.status(404).json({ error: error.message });
      }
    });
  });

  beforeEach(async () => {
    // Clear all mocks
    vi.clearAllMocks();

    // Setup proper mock implementations
    const mockMsalInstance = {
      acquireTokenByClientCredential: vi.fn(),
      getAuthCodeUrl: vi.fn(),
      acquireTokenByCode: vi.fn(),
      acquireTokenByRefreshToken: vi.fn(),
      getAuthority: vi.fn().mockResolvedValue('https://login.microsoftonline.com/12345678-1234-1234-1234-123456789012'),
    };

    const mockGraphClient = {
      api: vi.fn().mockReturnThis(),
      get: vi.fn(),
      select: vi.fn().mockReturnThis(),
      top: vi.fn().mockReturnThis(),
      orderby: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };

    // Setup constructor mocks with implementations using vi.mocked()
    const { ConfidentialClientApplication } = await import('@azure/msal-node');
    const { Client } = await import('@microsoft/microsoft-graph-client');
    const { ClientSecretCredential } = await import('@azure/identity');

    vi.mocked(ConfidentialClientApplication).mockImplementation(() => mockMsalInstance);
    vi.mocked(Client).mockImplementation(() => mockGraphClient);
    (Client as any).initWithMiddleware = vi.fn().mockReturnValue(mockGraphClient);

    vi.mocked(ClientSecretCredential).mockImplementation(() => ({
      getToken: vi.fn().mockResolvedValue({ token: 'test-access-token' })
    }));

    // Create test Azure AD provider
    const provider = await database.ssoProvider.create({
      data: {
        name: 'Test Azure AD Provider',
        type: 'AZURE_AD',
        configId: 'test-azure-ad',
        priority: 1,
        isActive: true,
        isDefault: true,
        domainRestrictions: ['company.com'],
        groupRestrictions: [],
        metadata: mockAzureAdConfig
      }
    });
    testProviderId = provider.id;

    // Initialize Azure AD service with test configuration
    await azureAdService.initialize(mockAzureAdConfig);

    // Initialize Graph service
    await graphService.initialize({
      tenantId: mockAzureAdConfig.tenantId,
      clientId: mockAzureAdConfig.clientId,
      clientSecret: mockAzureAdConfig.clientSecret,
      scopes: ['https://graph.microsoft.com/User.Read.All', 'https://graph.microsoft.com/Group.Read.All']
    });
  });

  afterEach(async () => {
    // Cleanup test data
    if (testProviderId) {
      await database.ssoProvider.delete({
        where: { id: testProviderId }
      });
    }

    // Cleanup Azure AD service
    await azureAdService.cleanup();
  });

  afterAll(async () => {
    // Disconnect from database
    await database.$disconnect();
  });

  describe('Authentication Flow', () => {
    it('should initiate Azure AD authentication successfully', async () => {
      const response = await request(app)
        .get('/api/v1/sso/login/azure')
        .expect(200);

      expect(response.body).toHaveProperty('authUrl');
      expect(response.body).toHaveProperty('provider', 'azure-ad');
      expect(response.body.authUrl).toContain('login.microsoftonline.com');
      expect(response.body.authUrl).toContain(mockAzureAdConfig.clientId);
      expect(response.body.authUrl).toContain('response_type=code');
    });

    it('should handle authorization code callback successfully', async () => {
      // Mock MSAL token exchange
      const mockMsalInstance = {
        acquireTokenByCode: vi.fn().mockResolvedValue(mockTokenResponse)
      };

      // Mock Graph client for user profile
      const mockGraphClient = {
        api: vi.fn().mockReturnThis(),
        get: vi.fn()
          .mockResolvedValueOnce(mockUserProfile) // User profile
          .mockResolvedValueOnce({ value: [] })    // User groups
          .mockResolvedValueOnce({ value: [] })    // User roles
      };

      // Replace service internals for this test
      (azureAdService as any).msalApp = mockMsalInstance;
      (azureAdService as any).graphClient = mockGraphClient;

      const response = await request(app)
        .post('/api/v1/sso/callback/azure')
        .send({
          code: 'test-authorization-code',
          state: 'test-state'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.user).toMatchObject({
        id: mockUserProfile.id,
        userPrincipalName: mockUserProfile.userPrincipalName,
        displayName: mockUserProfile.displayName,
        mail: mockUserProfile.mail
      });
      expect(response.body.tokens).toHaveProperty('accessToken');
      expect(response.body.tokens).toHaveProperty('idToken');
      expect(mockMsalInstance.acquireTokenByCode).toHaveBeenCalledWith({
        code: 'test-authorization-code',
        scopes: mockAzureAdConfig.scopes,
        redirectUri: mockAzureAdConfig.redirectUri
      });
    });

    it('should handle authentication errors gracefully', async () => {
      // Mock MSAL to throw an error
      const mockMsalInstance = {
        acquireTokenByCode: vi.fn().mockRejectedValue(new Error('Invalid authorization code'))
      };

      (azureAdService as any).msalApp = mockMsalInstance;

      const response = await request(app)
        .post('/api/v1/sso/callback/azure')
        .send({
          code: 'invalid-code',
          state: 'test-state'
        })
        .expect(400);

      expect(response.body.error).toContain('Invalid authorization code');
    });
  });

  describe('Health Monitoring', () => {
    it('should return healthy status when Azure AD is configured correctly', async () => {
      // Mock successful health check
      const mockCredential = {
        getToken: vi.fn().mockResolvedValue({ token: 'test-token' })
      };

      (azureAdService as any).credential = mockCredential;

      const response = await request(app)
        .get('/api/v1/admin/azure-ad/health')
        .expect(200);

      expect(response.body.status).toBe('healthy');
      expect(response.body.details).toHaveProperty('initialized', true);
      expect(response.body.details).toHaveProperty('config', true);
    });

    it('should return unhealthy status when Azure AD connection fails', async () => {
      // Mock failed health check
      const mockCredential = {
        getToken: vi.fn().mockRejectedValue(new Error('Authentication failed'))
      };

      (azureAdService as any).credential = mockCredential;

      const response = await request(app)
        .get('/api/v1/admin/azure-ad/health')
        .expect(200);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.details.error).toContain('Authentication failed');
    });
  });

  describe('User Synchronization', () => {
    it('should sync users from Azure AD successfully', async () => {
      // Mock Graph API response
      const mockGraphClient = {
        api: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          value: [mockUserProfile],
          '@odata.nextLink': null
        })
      };

      (graphService as any).graphClient = mockGraphClient;

      const response = await request(app)
        .post('/api/v1/admin/azure-ad/sync/users')
        .expect(200);

      expect(response.body.status).toBe('success');
      expect(response.body.usersProcessed).toBe(1);
      expect(response.body.syncId).toBeDefined();
    });

    it('should handle Graph API errors during user sync', async () => {
      // Mock Graph API to throw an error
      const mockGraphClient = {
        api: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error('Graph API rate limit exceeded'))
      };

      (graphService as any).graphClient = mockGraphClient;

      const response = await request(app)
        .post('/api/v1/admin/azure-ad/sync/users')
        .expect(500);

      expect(response.body.error).toContain('Graph API rate limit exceeded');
    });
  });

  describe('User Profile Management', () => {
    it('should retrieve user profile from Azure AD', async () => {
      // Mock Graph API response
      const mockGraphClient = {
        api: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue(mockUserProfile)
      };

      (graphService as any).graphClient = mockGraphClient;

      const response = await request(app)
        .get('/api/v1/admin/azure-ad/users/azure-user-123')
        .expect(200);

      expect(response.body).toMatchObject({
        id: mockUserProfile.id,
        userPrincipalName: mockUserProfile.userPrincipalName,
        displayName: mockUserProfile.displayName,
        mail: mockUserProfile.mail
      });
    });

    it('should handle user not found gracefully', async () => {
      // Mock Graph API to return 404
      const mockGraphClient = {
        api: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(new Error('User not found'))
      };

      (graphService as any).graphClient = mockGraphClient;

      const response = await request(app)
        .get('/api/v1/admin/azure-ad/users/nonexistent-user')
        .expect(404);

      expect(response.body.error).toContain('User not found');
    });
  });

  describe('Provider Integration', () => {
    it('should integrate with SSO provider service correctly', async () => {
      // Test provider retrieval
      const provider = await providerService.getProvider(testProviderId);
      expect(provider).toBeDefined();
      expect(provider!.type).toBe('AZURE_AD');
      expect(provider!.isActive).toBe(true);

      // Test Azure AD service instance retrieval
      const azureService = await providerService.getAzureAdService(testProviderId);
      expect(azureService).toBeDefined();
      expect(azureService).toBeInstanceOf(AzureAdService);
    });

    it('should handle provider configuration validation', async () => {
      // Test with invalid configuration
      const invalidProvider = await database.ssoProvider.create({
        data: {
          name: 'Invalid Azure AD Provider',
          type: 'AZURE_AD',
          configId: 'invalid-azure-ad',
          priority: 2,
          isActive: true,
          isDefault: false,
          domainRestrictions: [],
          groupRestrictions: [],
          metadata: {
            tenantId: 'invalid-tenant',
            clientId: '',
            clientSecret: '',
            authority: 'invalid-authority',
            redirectUri: 'invalid-uri',
            scopes: []
          }
        }
      });

      try {
        const invalidService = await providerService.getAzureAdService(invalidProvider.id);
        expect(invalidService).toBeNull();
      } finally {
        // Cleanup
        await database.ssoProvider.delete({
          where: { id: invalidProvider.id }
        });
      }
    });
  });

  describe('Security and Error Handling', () => {
    it('should validate configuration parameters', async () => {
      // Test service initialization with invalid config
      const invalidConfig = {
        ...mockAzureAdConfig,
        tenantId: 'invalid-tenant-id',
        clientId: '',
        clientSecret: ''
      };

      const invalidService = new AzureAdService();

      await expect(invalidService.initialize(invalidConfig))
        .rejects
        .toThrow('Invalid tenant ID format');
    });

    it('should handle token expiration gracefully', async () => {
      // Mock expired token scenario
      const expiredTokenResponse = {
        ...mockTokenResponse,
        expiresOn: new Date(Date.now() - 3600000) // Expired 1 hour ago
      };

      const mockMsalInstance = {
        acquireTokenByCode: vi.fn().mockResolvedValue(expiredTokenResponse)
      };

      (azureAdService as any).msalApp = mockMsalInstance;

      const response = await request(app)
        .post('/api/v1/sso/callback/azure')
        .send({
          code: 'test-code',
          state: 'test-state'
        })
        .expect(200); // Should still succeed but with expired token

      expect(response.body.success).toBe(true);
      expect(new Date(response.body.tokens.expiresAt)).toBeInstanceOf(Date);
    });

    it('should handle network timeouts and retries', async () => {
      // Mock network timeout
      const timeoutError = new Error('Request timeout');
      timeoutError.name = 'TimeoutError';

      const mockGraphClient = {
        api: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        get: vi.fn().mockRejectedValue(timeoutError)
      };

      (graphService as any).graphClient = mockGraphClient;

      const response = await request(app)
        .post('/api/v1/admin/azure-ad/sync/users')
        .expect(500);

      expect(response.body.error).toContain('Request timeout');
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle multiple concurrent authentication requests', async () => {
      // Simulate multiple concurrent requests
      const promises = Array.from({ length: 5 }, (_, index) =>
        request(app)
          .get('/api/v1/sso/login/azure')
          .query({ client_id: `test-client-${index}` })
      );

      const responses = await Promise.all(promises);

      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('authUrl');
      });
    });

    it('should handle large user sync operations efficiently', async () => {
      // Mock large user dataset
      const largeUserSet = Array.from({ length: 100 }, (_, index) => ({
        ...mockUserProfile,
        id: `azure-user-${index}`,
        userPrincipalName: `user${index}@company.com`,
        mail: `user${index}@company.com`
      }));

      const mockGraphClient = {
        api: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        top: vi.fn().mockReturnThis(),
        get: vi.fn().mockResolvedValue({
          value: largeUserSet,
          '@odata.nextLink': null
        })
      };

      (graphService as any).graphClient = mockGraphClient;

      const startTime = Date.now();
      const response = await request(app)
        .post('/api/v1/admin/azure-ad/sync/users')
        .expect(200);
      const endTime = Date.now();

      expect(response.body.status).toBe('success');
      expect(response.body.usersProcessed).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});