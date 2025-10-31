/**
 * Comprehensive tests for SamlService
 * Issue #131: SAML 2.0 Integration
 *
 * Tests SAML 2.0 Service Provider functionality including:
 * - SAML configuration management
 * - Authentication request creation
 * - Assertion processing and validation
 * - Metadata generation
 * - Single logout functionality
 * - User provisioning and attribute mapping
 * - Session management and security
 * - Configuration validation
 * - Cleanup operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';

// Mock dependencies with proper hoisting
vi.mock('../../lib/database', () => ({
  default: {
    samlConfig: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    samlSession: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    samlAuthRequest: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock('@node-saml/node-saml', () => ({
  SAML: vi.fn(() => ({
    getAuthorizeUrl: vi.fn(),
    validatePostResponse: vi.fn(),
    generateServiceProviderMetadata: vi.fn(),
    getLogoutUrl: vi.fn(),
  })),
}));

vi.mock('crypto', () => ({
  default: {
    randomBytes: vi.fn(() => ({ toString: vi.fn(() => 'mock-random-id') })),
  },
}));

import SamlService from '../../services/SamlService';
import type {
  SamlServiceConfig,
  SamlAuthenticationRequest,
  SamlAuthenticationResult,
  SamlAssertion
} from '../../services/SamlService';
import prisma from '../../lib/database';
import { logger } from '../../utils/logger';
import { SAML } from '@node-saml/node-saml';
import crypto from 'crypto';

// Get the mocked instances
const mockPrisma = prisma as any;
const mockLogger = logger as any;
const mockSAML = SAML as any;
const mockCrypto = crypto as any;

describe('SamlService', () => {
  let samlService: SamlService;
  const mockConfig: SamlServiceConfig = {
    baseUrl: 'https://test.example.com',
    acsPath: '/api/v1/sso/saml/acs',
    metadataPath: '/api/v1/sso/saml/metadata',
    sloPath: '/api/v1/sso/saml/slo'
  };

  const mockSamlConfig = {
    id: 'saml-config-1',
    name: 'Test SAML Config',
    entityId: 'https://test.example.com/saml',
    ssoUrl: 'https://idp.example.com/sso',
    sloUrl: 'https://idp.example.com/slo',
    certificate: 'mock-certificate',
    privateKey: 'mock-private-key',
    signRequests: true,
    signAssertions: true,
    encryptAssertions: false,
    nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
    attributeMapping: { email: 'email', firstName: 'givenName', lastName: 'surname' },
    clockTolerance: 300,
    isActive: true,
    idpMetadata: null,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  const mockUser = {
    id: 'user-1',
    username: 'testuser',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    samlService = new SamlService(mockConfig);

    // Setup default mock returns
    mockCrypto.randomBytes.mockReturnValue({
      toString: vi.fn(() => 'mock-random-id')
    });
  });

  afterEach(() => {
    // Clear all listeners
    samlService.removeAllListeners();
  });

  describe('Constructor and Configuration', () => {
    it('should create SamlService instance with valid configuration', () => {
      expect(samlService).toBeInstanceOf(SamlService);
      expect(samlService).toBeInstanceOf(EventEmitter);
    });

    it('should store configuration correctly', () => {
      // Access private config through type assertion for testing
      const service = samlService as any;
      expect(service.config).toEqual(mockConfig);
      expect(service.samlInstances).toBeInstanceOf(Map);
    });
  });

  describe('SAML Configuration Initialization', () => {
    beforeEach(() => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);
    });

    it('should initialize SAML configuration successfully', async () => {
      const samlInstance = await samlService.initializeSamlConfig('saml-config-1');

      expect(mockPrisma.samlConfig.findUnique).toHaveBeenCalledWith({
        where: { id: 'saml-config-1' }
      });
      expect(mockSAML).toHaveBeenCalledWith(expect.objectContaining({
        issuer: mockSamlConfig.entityId,
        callbackUrl: `${mockConfig.baseUrl}${mockConfig.acsPath}`,
        entryPoint: mockSamlConfig.ssoUrl,
        cert: mockSamlConfig.certificate,
        privateCert: mockSamlConfig.privateKey
      }));
      expect(mockLogger.info).toHaveBeenCalledWith(
        'SAML configuration initialized: Test SAML Config',
        expect.objectContaining({
          configId: 'saml-config-1',
          entityId: mockSamlConfig.entityId
        })
      );
    });

    it('should throw error for non-existent configuration', async () => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(null);

      await expect(samlService.initializeSamlConfig('invalid-config'))
        .rejects.toThrow('SAML configuration not found: invalid-config');
    });

    it('should throw error for inactive configuration', async () => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue({
        ...mockSamlConfig,
        isActive: false
      });

      await expect(samlService.initializeSamlConfig('saml-config-1'))
        .rejects.toThrow('SAML configuration is inactive: saml-config-1');
    });

    it('should cache SAML instances', async () => {
      const instance1 = await samlService.initializeSamlConfig('saml-config-1');
      const instance2 = await samlService.getSamlInstance('saml-config-1');

      expect(instance1).toBe(instance2);
      expect(mockPrisma.samlConfig.findUnique).toHaveBeenCalledTimes(1);
    });
  });

  describe('Authentication Request Creation', () => {
    beforeEach(() => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);
      mockPrisma.samlAuthRequest.create.mockResolvedValue({
        id: 'auth-req-1',
        requestId: 'mock-random-id',
        relayState: 'test-relay-state',
        destination: mockSamlConfig.ssoUrl,
        issueInstant: new Date(),
        configId: 'saml-config-1',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000)
      });

      const mockSamlInstance = {
        getAuthorizeUrl: vi.fn((options, callback) => {
          callback(null, 'https://idp.example.com/sso?SAMLRequest=encoded-request');
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);
    });

    it('should create authentication request successfully', async () => {
      const authRequest: SamlAuthenticationRequest = {
        configId: 'saml-config-1',
        relayState: 'test-relay-state',
        returnUrl: 'https://app.example.com/dashboard'
      };

      const authUrl = await samlService.createAuthenticationRequest(authRequest);

      expect(mockPrisma.samlAuthRequest.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          requestId: 'mock-random-id',
          relayState: 'test-relay-state',
          destination: mockSamlConfig.ssoUrl,
          configId: 'saml-config-1'
        })
      });

      expect(authUrl).toBe('https://idp.example.com/sso?SAMLRequest=encoded-request');

      // Verify event emission
      const emitSpy = vi.spyOn(samlService, 'emit');
      await samlService.createAuthenticationRequest(authRequest);
      expect(emitSpy).toHaveBeenCalledWith('authenticationRequested', expect.objectContaining({
        configId: 'saml-config-1',
        requestId: 'mock-random-id',
        relayState: 'test-relay-state'
      }));
    });

    it('should handle SAML library errors during auth request creation', async () => {
      const mockSamlInstance = {
        getAuthorizeUrl: vi.fn((options, callback) => {
          callback(new Error('SAML library error'), null);
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      const authRequest: SamlAuthenticationRequest = {
        configId: 'saml-config-1'
      };

      await expect(samlService.createAuthenticationRequest(authRequest))
        .rejects.toThrow('SAML library error');
    });
  });

  describe('Assertion Processing', () => {
    const mockProfile = {
      nameID: 'test@example.com',
      nameIDFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      sessionIndex: 'session-123',
      attributes: {
        email: 'test@example.com',
        givenName: 'Test',
        surname: 'User'
      },
      issuer: 'https://idp.example.com',
      audience: 'https://test.example.com/saml',
      inResponseTo: 'request-123',
      assertionId: 'assertion-123'
    };

    beforeEach(() => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);
      mockPrisma.samlSession.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.samlSession.create.mockResolvedValue({
        id: 'session-1',
        userId: 'user-1',
        sessionIndex: 'session-123',
        nameId: 'test@example.com',
        nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
        assertionId: 'assertion-123',
        configId: 'saml-config-1',
        attributes: mockProfile.attributes,
        expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000),
        createdAt: new Date()
      });

      const mockSamlInstance = {
        validatePostResponse: vi.fn((data, callback) => {
          callback(null, mockProfile);
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);
    });

    it('should process valid SAML assertion successfully', async () => {
      const result = await samlService.processAssertion(
        'saml-config-1',
        'encoded-saml-response',
        'test-relay-state'
      );

      expect(result.success).toBe(true);
      expect(result.user).toEqual(mockUser);
      expect(result.sessionId).toBe('session-1');
      expect(result.nameId).toBe('test@example.com');
      expect(result.attributes).toEqual(mockProfile.attributes);

      expect(mockPrisma.samlSession.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-1',
          sessionIndex: 'session-123',
          nameId: 'test@example.com',
          assertionId: 'assertion-123',
          configId: 'saml-config-1'
        })
      });

      // Verify event emission
      const emitSpy = vi.spyOn(samlService, 'emit');
      await samlService.processAssertion('saml-config-1', 'encoded-saml-response');
      expect(emitSpy).toHaveBeenCalledWith('authenticationSuccessful', expect.objectContaining({
        configId: 'saml-config-1',
        userId: 'user-1',
        sessionId: 'session-1'
      }));
    });

    it('should reject assertion if already used (replay attack prevention)', async () => {
      mockPrisma.samlSession.findUnique.mockResolvedValue({
        id: 'existing-session',
        assertionId: 'assertion-123'
      });

      const result = await samlService.processAssertion(
        'saml-config-1',
        'encoded-saml-response'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('REPLAY_ATTACK');
      expect(result.errorMessage).toBe('Assertion has already been used');
    });

    it('should handle invalid SAML assertion', async () => {
      const mockSamlInstance = {
        validatePostResponse: vi.fn((data, callback) => {
          callback(null, null);
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      const result = await samlService.processAssertion(
        'saml-config-1',
        'invalid-saml-response'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('INVALID_ASSERTION');
      expect(result.errorMessage).toBe('Invalid SAML assertion');
    });

    it('should handle SAML validation errors', async () => {
      const mockSamlInstance = {
        validatePostResponse: vi.fn((data, callback) => {
          callback(new Error('SAML validation failed'), null);
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      const result = await samlService.processAssertion(
        'saml-config-1',
        'encoded-saml-response'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ASSERTION_PROCESSING_FAILED');
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SAML assertion processing failed',
        expect.objectContaining({
          configId: 'saml-config-1',
          error: 'SAML validation failed'
        })
      );
    });
  });

  describe('User Provisioning and Attribute Mapping', () => {
    const mockAssertion: SamlAssertion = {
      nameId: 'newuser@example.com',
      nameIdFormat: 'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress',
      sessionIndex: 'session-456',
      attributes: {
        email: 'newuser@example.com',
        givenName: 'New',
        surname: 'User',
        department: 'Engineering'
      },
      issuer: 'https://idp.example.com',
      audience: 'https://test.example.com/saml'
    };

    beforeEach(() => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);
    });

    it('should create new user via Just-In-Time provisioning', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      const newUser = {
        id: 'user-2',
        username: 'newuser',
        email: 'newuser@example.com',
        firstName: 'New',
        lastName: 'User',
        isActive: true
      };
      mockPrisma.user.create.mockResolvedValue(newUser);

      const service = samlService as any;
      const result = await service.findOrCreateUser('saml-config-1', mockAssertion);

      expect(mockPrisma.user.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          username: 'newuser',
          email: 'newuser@example.com',
          firstName: 'New',
          lastName: 'User',
          isActive: true
        })
      });

      expect(result).toEqual(newUser);
      expect(mockLogger.info).toHaveBeenCalledWith(
        'User created via SAML JIT provisioning',
        expect.objectContaining({
          userId: 'user-2',
          email: 'newuser@example.com',
          configId: 'saml-config-1'
        })
      );
    });

    it('should update existing user attributes from SAML assertion', async () => {
      const existingUser = {
        id: 'user-1',
        email: 'test@example.com',
        firstName: 'Old',
        lastName: 'Name'
      };
      mockPrisma.user.findUnique.mockResolvedValue(existingUser);

      const updatedUser = {
        ...existingUser,
        firstName: 'Test',
        lastName: 'User'
      };
      mockPrisma.user.update.mockResolvedValue(updatedUser);

      const service = samlService as any;
      const result = await service.findOrCreateUser('saml-config-1', {
        ...mockAssertion,
        nameId: 'test@example.com',
        attributes: {
          email: 'test@example.com',
          givenName: 'Test',
          surname: 'User'
        }
      });

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user-1' },
        data: expect.objectContaining({
          firstName: 'Test',
          lastName: 'User',
          updatedAt: expect.any(Date)
        })
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'User attributes updated from SAML assertion',
        expect.objectContaining({
          userId: 'user-1',
          updates: { firstName: 'Test', lastName: 'User' },
          configId: 'saml-config-1'
        })
      );
    });

    it('should handle missing email in SAML assertion', async () => {
      const service = samlService as any;

      await expect(service.findOrCreateUser('saml-config-1', {
        ...mockAssertion,
        nameId: '',
        attributes: {}
      })).rejects.toThrow('No email found in SAML assertion');
    });

    it('should extract attributes correctly from arrays', async () => {
      const service = samlService as any;

      // Test with array values
      const arrayValue = service.extractAttribute({ testAttr: ['first', 'second'] }, 'testAttr');
      expect(arrayValue).toBe('first');

      // Test with single value
      const singleValue = service.extractAttribute({ testAttr: 'single' }, 'testAttr');
      expect(singleValue).toBe('single');

      // Test with null/undefined
      const nullValue = service.extractAttribute({}, 'testAttr');
      expect(nullValue).toBe(null);
    });
  });

  describe('Metadata Generation', () => {
    beforeEach(() => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);

      const mockSamlInstance = {
        generateServiceProviderMetadata: vi.fn(() => '<?xml version="1.0"?><EntityDescriptor>metadata</EntityDescriptor>')
      };
      mockSAML.mockReturnValue(mockSamlInstance);
    });

    it('should generate SP metadata successfully', async () => {
      const metadata = await samlService.generateMetadata('saml-config-1');

      expect(metadata).toContain('<?xml version="1.0"?>');
      expect(metadata).toContain('<EntityDescriptor>');

      const mockSamlInstance = mockSAML.mock.results[0].value;
      expect(mockSamlInstance.generateServiceProviderMetadata).toHaveBeenCalledWith(
        mockSamlConfig.certificate,
        mockSamlConfig.certificate
      );
    });

    it('should handle metadata generation errors', async () => {
      const mockSamlInstance = {
        generateServiceProviderMetadata: vi.fn(() => {
          throw new Error('Metadata generation failed');
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      await expect(samlService.generateMetadata('saml-config-1'))
        .rejects.toThrow('Metadata generation failed');
    });
  });

  describe('Single Logout (SLO)', () => {
    const mockSamlSession = {
      id: 'session-1',
      userId: 'user-1',
      sessionIndex: 'session-123',
      nameId: 'test@example.com',
      configId: 'saml-config-1',
      config: {
        id: 'saml-config-1',
        name: 'Test SAML Config'
      }
    };

    beforeEach(() => {
      mockPrisma.samlSession.findUnique.mockResolvedValue(mockSamlSession);
      mockPrisma.samlSession.delete.mockResolvedValue(mockSamlSession);
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);

      const mockSamlInstance = {
        getLogoutUrl: vi.fn((nameId, callback) => {
          callback(null, 'https://idp.example.com/slo?SAMLRequest=logout-request');
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);
    });

    it('should initiate single logout successfully', async () => {
      const logoutUrl = await samlService.initiateSingleLogout(
        'session-1',
        'test@example.com',
        'session-123'
      );

      expect(logoutUrl).toBe('https://idp.example.com/slo?SAMLRequest=logout-request');

      expect(mockPrisma.samlSession.delete).toHaveBeenCalledWith({
        where: { id: 'session-1' }
      });

      // Verify event emission
      const emitSpy = vi.spyOn(samlService, 'emit');
      await samlService.initiateSingleLogout('session-1', 'test@example.com');
      expect(emitSpy).toHaveBeenCalledWith('singleLogoutInitiated', expect.objectContaining({
        sessionId: 'session-1',
        nameId: 'test@example.com',
        configId: 'saml-config-1'
      }));
    });

    it('should handle non-existent session for SLO', async () => {
      mockPrisma.samlSession.findUnique.mockResolvedValue(null);

      await expect(samlService.initiateSingleLogout('invalid-session', 'test@example.com'))
        .rejects.toThrow('SAML session not found');
    });

    it('should handle SLO URL generation errors', async () => {
      const mockSamlInstance = {
        getLogoutUrl: vi.fn((nameId, callback) => {
          callback(new Error('SLO URL generation failed'), null);
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      await expect(samlService.initiateSingleLogout('session-1', 'test@example.com'))
        .rejects.toThrow('SLO URL generation failed');
    });
  });

  describe('Configuration Validation', () => {
    beforeEach(() => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);
      const mockSamlInstance = {};
      mockSAML.mockReturnValue(mockSamlInstance);
    });

    it('should validate configuration successfully', async () => {
      const isValid = await samlService.validateConfiguration('saml-config-1');

      expect(isValid).toBe(true);
      expect(mockPrisma.samlConfig.findUnique).toHaveBeenCalledWith({
        where: { id: 'saml-config-1' }
      });
    });

    it('should fail validation for missing required fields', async () => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue({
        ...mockSamlConfig,
        entityId: null,
        ssoUrl: null
      });

      const isValid = await samlService.validateConfiguration('saml-config-1');

      expect(isValid).toBe(false);
    });

    it('should handle validation errors', async () => {
      mockPrisma.samlConfig.findUnique.mockRejectedValue(new Error('Database error'));

      const isValid = await samlService.validateConfiguration('saml-config-1');

      expect(isValid).toBe(false);
      expect(mockLogger.error).toHaveBeenCalledWith(
        'SAML configuration validation failed',
        expect.objectContaining({
          configId: 'saml-config-1',
          error: 'Database error'
        })
      );
    });
  });

  describe('Cleanup Operations', () => {
    beforeEach(() => {
      mockPrisma.samlSession.deleteMany.mockResolvedValue({ count: 5 });
      mockPrisma.samlAuthRequest.deleteMany.mockResolvedValue({ count: 3 });
    });

    it('should clean up expired sessions and auth requests', async () => {
      await samlService.cleanup();

      expect(mockPrisma.samlSession.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });

      expect(mockPrisma.samlAuthRequest.deleteMany).toHaveBeenCalledWith({
        where: {
          expiresAt: {
            lt: expect.any(Date)
          }
        }
      });

      expect(mockLogger.info).toHaveBeenCalledWith('SAML cleanup completed');
    });

    it('should handle cleanup errors gracefully', async () => {
      mockPrisma.samlSession.deleteMany.mockRejectedValue(new Error('Cleanup error'));

      await expect(samlService.cleanup()).rejects.toThrow('Cleanup error');
    });
  });

  describe('Event Emission', () => {
    it('should emit authentication events correctly', async () => {
      const eventSpy = vi.fn();
      samlService.on('authenticationRequested', eventSpy);

      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);
      mockPrisma.samlAuthRequest.create.mockResolvedValue({
        id: 'auth-req-1',
        requestId: 'mock-random-id'
      });

      const mockSamlInstance = {
        getAuthorizeUrl: vi.fn((options, callback) => {
          callback(null, 'https://idp.example.com/sso');
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      await samlService.createAuthenticationRequest({
        configId: 'saml-config-1'
      });

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        configId: 'saml-config-1',
        requestId: 'mock-random-id'
      }));
    });

    it('should emit authentication failure events', async () => {
      const eventSpy = vi.fn();
      samlService.on('authenticationFailed', eventSpy);

      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);

      const mockSamlInstance = {
        validatePostResponse: vi.fn((data, callback) => {
          callback(new Error('Validation failed'), null);
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      await samlService.processAssertion('saml-config-1', 'invalid-response');

      expect(eventSpy).toHaveBeenCalledWith(expect.objectContaining({
        configId: 'saml-config-1',
        error: 'Validation failed'
      }));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle database connection errors', async () => {
      mockPrisma.samlConfig.findUnique.mockRejectedValue(new Error('Database unavailable'));

      await expect(samlService.initializeSamlConfig('saml-config-1'))
        .rejects.toThrow('Database unavailable');
    });

    it('should handle missing SAML library', async () => {
      // Set up database mock first
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);

      // Then set up SAML mock to throw error
      mockSAML.mockImplementation(() => {
        throw new Error('SAML library not available');
      });

      await expect(samlService.initializeSamlConfig('saml-config-1'))
        .rejects.toThrow('SAML library not available');
    });

    it('should handle malformed SAML responses', async () => {
      mockPrisma.samlConfig.findUnique.mockResolvedValue(mockSamlConfig);

      const mockSamlInstance = {
        validatePostResponse: vi.fn((data, callback) => {
          callback(new Error('Malformed SAML response'), null);
        })
      };
      mockSAML.mockReturnValue(mockSamlInstance);

      const result = await samlService.processAssertion(
        'saml-config-1',
        'malformed-response'
      );

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe('ASSERTION_PROCESSING_FAILED');
      expect(result.errorMessage).toBe('Malformed SAML response');
    });
  });
});