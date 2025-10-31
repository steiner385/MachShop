import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { SamlService } from '../../services/SamlService';

// Mock Prisma for integration testing
const mockPrisma = {
  samlConfig: {
    findFirst: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    findMany: vi.fn(),
  },
  samlSession: {
    create: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  samlAuthRequest: {
    create: vi.fn(),
    findFirst: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
  },
  user: {
    create: vi.fn(),
    findFirst: vi.fn(),
    upsert: vi.fn(),
  },
  $transaction: vi.fn(),
} as unknown as PrismaClient;

// Mock node-saml library
vi.mock('@node-saml/node-saml', () => ({
  SAML: vi.fn().mockImplementation(() => ({
    getAuthorizeUrlAsync: vi.fn().mockResolvedValue('https://idp.example.com/sso?SAMLRequest=mock_request'),
    validatePostResponseAsync: vi.fn().mockResolvedValue({
      profile: {
        nameID: 'test@example.com',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress': 'test@example.com',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'Test',
        'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'User',
      },
      loggedOut: false,
    }),
    getLogoutUrlAsync: vi.fn().mockResolvedValue('https://idp.example.com/slo'),
    generateServiceProviderMetadata: vi.fn().mockReturnValue('<xml>mock metadata</xml>'),
  })),
}));

describe('SAML Integration Tests', () => {
  let samlService: SamlService;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Initialize SAML service with config
    samlService = new SamlService({
      baseUrl: 'https://app.example.com',
      acsPath: '/api/v1/sso/saml/acs',
      metadataPath: '/api/v1/sso/saml/metadata',
      sloPath: '/api/v1/sso/saml/slo',
    });
  });

  afterEach(async () => {
    if (samlService) {
      await samlService.cleanup();
    }
  });

  describe('SAML Service Initialization', () => {
    it('should initialize SAML service successfully', async () => {
      expect(samlService).toBeDefined();
      expect(typeof samlService.createAuthenticationRequest).toBe('function');
      expect(typeof samlService.processAssertion).toBe('function');
      expect(typeof samlService.generateMetadata).toBe('function');
    });

    it('should be able to clean up SAML service', async () => {
      await expect(samlService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('SAML Configuration Management', () => {
    const mockSamlConfig = {
      id: 'test-config-1',
      name: 'Test SAML Provider',
      entityId: 'https://app.example.com',
      ssoUrl: 'https://idp.example.com/sso',
      certificate: 'mock-certificate',
      privateKey: 'mock-private-key',
      signRequests: true,
      signAssertions: true,
      encryptAssertions: false,
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: {},
      clockTolerance: 300,
      isActive: true,
      idpMetadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrisma.samlConfig.findFirst.mockResolvedValue(mockSamlConfig);
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);
    });

    it('should validate SAML configuration successfully', async () => {
      const isValid = await samlService.validateConfiguration('test-config-1');
      expect(isValid).toBe(true);
      expect(mockPrisma.samlConfig.findFirst).toHaveBeenCalledWith({
        where: { id: 'test-config-1', isActive: true },
      });
    });

    it('should generate SAML metadata for valid configuration', async () => {
      const metadata = await samlService.generateMetadata('test-config-1');
      expect(metadata).toBe('<xml>mock metadata</xml>');
      expect(mockPrisma.samlConfig.findFirst).toHaveBeenCalled();
    });
  });

  describe('SAML Authentication Flow', () => {
    const mockSamlConfig = {
      id: 'test-config-1',
      name: 'Test SAML Provider',
      entityId: 'https://app.example.com',
      ssoUrl: 'https://idp.example.com/sso',
      certificate: 'mock-certificate',
      privateKey: 'mock-private-key',
      signRequests: true,
      signAssertions: true,
      encryptAssertions: false,
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      attributeMapping: {},
      clockTolerance: 300,
      isActive: true,
      idpMetadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      mockPrisma.samlConfig.findFirst.mockResolvedValue(mockSamlConfig);
      mockPrisma.samlAuthRequest.create.mockResolvedValue({
        id: 'auth-req-1',
        configId: 'test-config-1',
        requestId: 'req-123',
        relayState: 'test-state',
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
      });
    });

    it('should create authentication request successfully', async () => {
      const authUrl = await samlService.createAuthenticationRequest({
        configId: 'test-config-1',
        relayState: 'test-state',
      });

      expect(authUrl).toBe('https://idp.example.com/sso?SAMLRequest=mock_request');
      expect(mockPrisma.samlAuthRequest.create).toHaveBeenCalled();
    });

    it('should process SAML assertion successfully', async () => {
      const mockUser = {
        id: 'user-1',
        username: 'test@example.com',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['OPERATOR'],
        permissions: ['workorders.read'],
        siteId: null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPrisma.samlAuthRequest.findFirst.mockResolvedValue({
        id: 'auth-req-1',
        configId: 'test-config-1',
        requestId: 'req-123',
        relayState: 'test-state',
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
      });

      mockPrisma.user.upsert.mockResolvedValue(mockUser);
      mockPrisma.samlSession.create.mockResolvedValue({
        id: 'session-1',
        configId: 'test-config-1',
        nameId: 'test@example.com',
        sessionIndex: 'session-idx-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await samlService.processAssertion(
        'test-config-1',
        'mock-saml-response',
        'test-state'
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.sessionId).toBe('session-1');
      expect(mockPrisma.user.upsert).toHaveBeenCalled();
      expect(mockPrisma.samlSession.create).toHaveBeenCalled();
    });
  });

  describe('SAML Single Logout', () => {
    beforeEach(() => {
      mockPrisma.samlSession.findFirst.mockResolvedValue({
        id: 'session-1',
        configId: 'test-config-1',
        nameId: 'test@example.com',
        sessionIndex: 'session-idx-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.samlConfig.findFirst.mockResolvedValue({
        id: 'test-config-1',
        name: 'Test SAML Provider',
        entityId: 'https://app.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        sloUrl: 'https://idp.example.com/slo',
        certificate: 'mock-certificate',
        privateKey: 'mock-private-key',
        signRequests: true,
        signAssertions: true,
        encryptAssertions: false,
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        attributeMapping: {},
        clockTolerance: 300,
        isActive: true,
        idpMetadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });

    it('should initiate single logout successfully', async () => {
      const logoutUrl = await samlService.initiateSingleLogout(
        'session-1',
        'test@example.com',
        'session-idx-1'
      );

      expect(logoutUrl).toBe('https://idp.example.com/slo');
      expect(mockPrisma.samlSession.findFirst).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid configuration gracefully', async () => {
      mockPrisma.samlConfig.findFirst.mockResolvedValue(null);

      await expect(
        samlService.validateConfiguration('non-existent-config')
      ).rejects.toThrow('SAML configuration not found');
    });

    it('should handle SAML library errors gracefully', async () => {
      const { SAML } = await import('@node-saml/node-saml');
      const mockSamlInstance = new SAML({});
      vi.mocked(mockSamlInstance.getAuthorizeUrlAsync).mockRejectedValue(
        new Error('SAML library error')
      );

      // Mock the constructor to return our mocked instance
      vi.mocked(SAML).mockImplementation(() => mockSamlInstance);

      mockPrisma.samlConfig.findFirst.mockResolvedValue({
        id: 'test-config-1',
        name: 'Test SAML Provider',
        entityId: 'https://app.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: 'mock-certificate',
        privateKey: 'mock-private-key',
        signRequests: true,
        signAssertions: true,
        encryptAssertions: false,
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        attributeMapping: {},
        clockTolerance: 300,
        isActive: true,
        idpMetadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(
        samlService.createAuthenticationRequest({
          configId: 'test-config-1',
          relayState: 'test-state',
        })
      ).rejects.toThrow('SAML library error');
    });
  });

  describe('Cleanup and Maintenance', () => {
    it('should clean up expired sessions and auth requests', async () => {
      mockPrisma.samlSession.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.samlAuthRequest.deleteMany.mockResolvedValue({ count: 1 });

      await samlService.cleanup();

      expect(mockPrisma.samlSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });

      expect(mockPrisma.samlAuthRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date),
          },
        },
      });
    });
  });

  describe('Integration with Unified SSO System', () => {
    it('should emit events for monitoring integration', async () => {
      const eventSpy = vi.fn();
      samlService.on('authenticationCompleted', eventSpy);

      const mockUser = {
        id: 'user-1',
        username: 'test@example.com',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        roles: ['OPERATOR'],
        permissions: ['workorders.read'],
        siteId: null,
        isActive: true,
        lastLogin: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      mockPrisma.samlConfig.findFirst.mockResolvedValue({
        id: 'test-config-1',
        name: 'Test SAML Provider',
        entityId: 'https://app.example.com',
        ssoUrl: 'https://idp.example.com/sso',
        certificate: 'mock-certificate',
        privateKey: 'mock-private-key',
        signRequests: true,
        signAssertions: true,
        encryptAssertions: false,
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        attributeMapping: {},
        clockTolerance: 300,
        isActive: true,
        idpMetadata: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      mockPrisma.samlAuthRequest.findFirst.mockResolvedValue({
        id: 'auth-req-1',
        configId: 'test-config-1',
        requestId: 'req-123',
        relayState: 'test-state',
        expiresAt: new Date(Date.now() + 300000),
        createdAt: new Date(),
      });

      mockPrisma.user.upsert.mockResolvedValue(mockUser);
      mockPrisma.samlSession.create.mockResolvedValue({
        id: 'session-1',
        configId: 'test-config-1',
        nameId: 'test@example.com',
        sessionIndex: 'session-idx-1',
        userId: 'user-1',
        expiresAt: new Date(Date.now() + 3600000),
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await samlService.processAssertion(
        'test-config-1',
        'mock-saml-response',
        'test-state'
      );

      // Verify event was emitted for monitoring integration
      expect(eventSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          sessionId: 'session-1',
          configId: 'test-config-1',
        })
      );
    });
  });
});