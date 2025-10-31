/**
 * SAML 2.0 Service Provider Implementation (Issue #131)
 *
 * Core SAML service providing enterprise SSO authentication capabilities.
 * Integrates with the unified SSO orchestration system for seamless authentication.
 *
 * Features:
 * - SAML 2.0 Service Provider functionality
 * - Metadata generation for IdP configuration
 * - Assertion Consumer Service (ACS) endpoint handling
 * - Single Logout (SLO) support
 * - Certificate management and validation
 * - User provisioning and attribute mapping
 */

import { EventEmitter } from 'events';
import { SAML, SamlConfig as NodeSamlConfig } from '@node-saml/node-saml';
import { SamlConfig, SamlSession, SamlAuthRequest, User } from '@prisma/client';
import prisma from '../lib/database';
import { logger } from '../utils/logger';
import crypto from 'crypto';

export interface SamlServiceConfig {
  baseUrl: string;
  acsPath: string;
  metadataPath: string;
  sloPath: string;
}

export interface SamlAuthenticationRequest {
  configId: string;
  relayState?: string;
  returnUrl?: string;
}

export interface SamlAuthenticationResult {
  success: boolean;
  user?: User;
  sessionId?: string;
  nameId?: string;
  attributes?: Record<string, any>;
  errorCode?: string;
  errorMessage?: string;
}

export interface SamlAssertion {
  nameId: string;
  nameIdFormat: string;
  sessionIndex?: string;
  attributes: Record<string, any>;
  issuer: string;
  audience: string;
  inResponseTo?: string;
}

export class SamlService extends EventEmitter {
  private samlInstances: Map<string, SAML> = new Map();
  private config: SamlServiceConfig;

  constructor(config: SamlServiceConfig) {
    super();
    this.config = config;
  }

  /**
   * Initialize SAML configuration and create SAML instance
   */
  async initializeSamlConfig(configId: string): Promise<SAML> {
    const samlConfig = await prisma.samlConfig.findUnique({
      where: { id: configId }
    });

    if (!samlConfig) {
      throw new Error(`SAML configuration not found: ${configId}`);
    }

    if (!samlConfig.isActive) {
      throw new Error(`SAML configuration is inactive: ${configId}`);
    }

    const nodeSamlConfig: NodeSamlConfig = {
      // Service Provider Configuration
      issuer: samlConfig.entityId,
      callbackUrl: `${this.config.baseUrl}${this.config.acsPath}`,
      entryPoint: samlConfig.ssoUrl,
      logoutUrl: samlConfig.sloUrl || undefined,

      // Certificate Configuration
      cert: samlConfig.certificate,
      privateCert: samlConfig.privateKey,

      // Security Configuration
      signatureAlgorithm: 'sha256',
      digestAlgorithm: 'sha256',
      disableRequestedAuthnContext: false,
      wantAssertionsSigned: samlConfig.signAssertions,
      wantAuthnResponseSigned: samlConfig.signRequests,

      // Name ID Configuration
      identifierFormat: samlConfig.nameIdFormat,

      // Clock skew tolerance (in seconds)
      clockTolerance: samlConfig.clockTolerance,

      // Additional options
      skipRequestCompression: false,
      disableRequestAcsUrl: false,

      // Metadata URL if provided
      idpMetadata: samlConfig.idpMetadata || undefined,
    };

    const samlInstance = new SAML(nodeSamlConfig);
    this.samlInstances.set(configId, samlInstance);

    logger.info(`SAML configuration initialized: ${samlConfig.name}`, {
      configId,
      entityId: samlConfig.entityId
    });

    return samlInstance;
  }

  /**
   * Get or create SAML instance for configuration
   */
  async getSamlInstance(configId: string): Promise<SAML> {
    let samlInstance = this.samlInstances.get(configId);

    if (!samlInstance) {
      samlInstance = await this.initializeSamlConfig(configId);
    }

    return samlInstance;
  }

  /**
   * Create SAML authentication request URL
   */
  async createAuthenticationRequest(request: SamlAuthenticationRequest): Promise<string> {
    const samlInstance = await this.getSamlInstance(request.configId);

    // Generate unique request ID
    const requestId = crypto.randomBytes(16).toString('hex');

    // Store authentication request for security validation
    await prisma.samlAuthRequest.create({
      data: {
        requestId,
        relayState: request.relayState || null,
        destination: (await this.getSamlConfig(request.configId)).ssoUrl,
        issueInstant: new Date(),
        configId: request.configId,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
      }
    });

    // Create SAML authentication request
    const authUrl = await new Promise<string>((resolve, reject) => {
      samlInstance.getAuthorizeUrl(
        {
          RelayState: request.relayState,
        },
        (err, url) => {
          if (err) {
            reject(err);
          } else {
            resolve(url);
          }
        }
      );
    });

    this.emit('authenticationRequested', {
      configId: request.configId,
      requestId,
      relayState: request.relayState
    });

    return authUrl;
  }

  /**
   * Process SAML assertion and authenticate user
   */
  async processAssertion(
    configId: string,
    samlResponse: string,
    relayState?: string
  ): Promise<SamlAuthenticationResult> {
    try {
      const samlInstance = await this.getSamlInstance(configId);

      // Validate SAML response
      const profile = await new Promise<any>((resolve, reject) => {
        samlInstance.validatePostResponse(
          { SAMLResponse: samlResponse },
          (err, profile) => {
            if (err) {
              reject(err);
            } else {
              resolve(profile);
            }
          }
        );
      });

      if (!profile) {
        return {
          success: false,
          errorCode: 'INVALID_ASSERTION',
          errorMessage: 'Invalid SAML assertion'
        };
      }

      // Extract user information from assertion
      const assertion: SamlAssertion = {
        nameId: profile.nameID,
        nameIdFormat: profile.nameIDFormat,
        sessionIndex: profile.sessionIndex,
        attributes: profile.attributes || {},
        issuer: profile.issuer,
        audience: profile.audience,
        inResponseTo: profile.inResponseTo
      };

      // Validate assertion ID is unique (prevent replay attacks)
      if (profile.assertionId) {
        const existingSession = await prisma.samlSession.findUnique({
          where: { assertionId: profile.assertionId }
        });

        if (existingSession) {
          return {
            success: false,
            errorCode: 'REPLAY_ATTACK',
            errorMessage: 'Assertion has already been used'
          };
        }
      }

      // Find or create user based on SAML assertion
      const user = await this.findOrCreateUser(configId, assertion);

      if (!user) {
        return {
          success: false,
          errorCode: 'USER_PROVISIONING_FAILED',
          errorMessage: 'Failed to provision user from SAML assertion'
        };
      }

      // Create SAML session
      const samlSession = await prisma.samlSession.create({
        data: {
          userId: user.id,
          sessionIndex: assertion.sessionIndex || null,
          nameId: assertion.nameId,
          nameIdFormat: assertion.nameIdFormat,
          assertionId: profile.assertionId || crypto.randomBytes(16).toString('hex'),
          configId,
          attributes: assertion.attributes,
          expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000), // 8 hours
        }
      });

      this.emit('authenticationSuccessful', {
        configId,
        userId: user.id,
        sessionId: samlSession.id,
        nameId: assertion.nameId,
        attributes: assertion.attributes
      });

      return {
        success: true,
        user,
        sessionId: samlSession.id,
        nameId: assertion.nameId,
        attributes: assertion.attributes
      };

    } catch (error) {
      logger.error('SAML assertion processing failed', {
        configId,
        error: error.message
      });

      this.emit('authenticationFailed', {
        configId,
        error: error.message,
        relayState
      });

      return {
        success: false,
        errorCode: 'ASSERTION_PROCESSING_FAILED',
        errorMessage: error.message
      };
    }
  }

  /**
   * Find or create user from SAML assertion
   */
  private async findOrCreateUser(
    configId: string,
    assertion: SamlAssertion
  ): Promise<User | null> {
    const samlConfig = await this.getSamlConfig(configId);
    const attributeMapping = samlConfig.attributeMapping as any || {};

    // Extract email from assertion (primary identifier)
    const email = this.extractAttribute(assertion.attributes, attributeMapping.email || 'email')
      || assertion.nameId;

    if (!email) {
      throw new Error('No email found in SAML assertion');
    }

    // Try to find existing user
    let user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      // Create new user (Just-In-Time provisioning)
      const firstName = this.extractAttribute(assertion.attributes, attributeMapping.firstName || 'firstName');
      const lastName = this.extractAttribute(assertion.attributes, attributeMapping.lastName || 'lastName');
      const username = this.extractAttribute(assertion.attributes, attributeMapping.username || 'username')
        || email.split('@')[0];

      user = await prisma.user.create({
        data: {
          username,
          email,
          firstName,
          lastName,
          isActive: true,
          // Additional fields can be mapped from SAML attributes
        }
      });

      logger.info('User created via SAML JIT provisioning', {
        userId: user.id,
        email,
        configId
      });
    } else {
      // Update user attributes from SAML assertion
      const updates: any = {};

      if (attributeMapping.firstName) {
        const firstName = this.extractAttribute(assertion.attributes, attributeMapping.firstName);
        if (firstName && firstName !== user.firstName) {
          updates.firstName = firstName;
        }
      }

      if (attributeMapping.lastName) {
        const lastName = this.extractAttribute(assertion.attributes, attributeMapping.lastName);
        if (lastName && lastName !== user.lastName) {
          updates.lastName = lastName;
        }
      }

      if (Object.keys(updates).length > 0) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: {
            ...updates,
            updatedAt: new Date()
          }
        });

        logger.info('User attributes updated from SAML assertion', {
          userId: user.id,
          updates,
          configId
        });
      }
    }

    return user;
  }

  /**
   * Extract attribute value from SAML attributes
   */
  private extractAttribute(attributes: Record<string, any>, attributeName: string): string | null {
    const value = attributes[attributeName];

    if (Array.isArray(value)) {
      return value[0] || null;
    }

    return value || null;
  }

  /**
   * Generate SP metadata XML
   */
  async generateMetadata(configId: string): Promise<string> {
    const samlInstance = await this.getSamlInstance(configId);
    const samlConfig = await this.getSamlConfig(configId);

    const metadata = samlInstance.generateServiceProviderMetadata(
      samlConfig.certificate,
      samlConfig.certificate
    );

    return metadata;
  }

  /**
   * Initiate Single Logout
   */
  async initiateSingleLogout(
    sessionId: string,
    nameId: string,
    sessionIndex?: string
  ): Promise<string> {
    const samlSession = await prisma.samlSession.findUnique({
      where: { id: sessionId },
      include: { config: true }
    });

    if (!samlSession) {
      throw new Error('SAML session not found');
    }

    const samlInstance = await this.getSamlInstance(samlSession.configId);

    const logoutUrl = await new Promise<string>((resolve, reject) => {
      samlInstance.getLogoutUrl(
        nameId,
        (err, url) => {
          if (err) {
            reject(err);
          } else {
            resolve(url);
          }
        }
      );
    });

    // Mark session as logged out
    await prisma.samlSession.delete({
      where: { id: sessionId }
    });

    this.emit('singleLogoutInitiated', {
      sessionId,
      nameId,
      configId: samlSession.configId
    });

    return logoutUrl;
  }

  /**
   * Get SAML configuration
   */
  private async getSamlConfig(configId: string): Promise<SamlConfig> {
    const config = await prisma.samlConfig.findUnique({
      where: { id: configId }
    });

    if (!config) {
      throw new Error(`SAML configuration not found: ${configId}`);
    }

    return config;
  }

  /**
   * Validate SAML configuration
   */
  async validateConfiguration(configId: string): Promise<boolean> {
    try {
      const config = await this.getSamlConfig(configId);

      // Validate required fields
      if (!config.entityId || !config.ssoUrl || !config.certificate) {
        return false;
      }

      // Test SAML instance creation
      await this.getSamlInstance(configId);

      return true;
    } catch (error) {
      logger.error('SAML configuration validation failed', {
        configId,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Clean up expired sessions and auth requests
   */
  async cleanup(): Promise<void> {
    const now = new Date();

    // Clean up expired sessions
    await prisma.samlSession.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    // Clean up expired auth requests
    await prisma.samlAuthRequest.deleteMany({
      where: {
        expiresAt: {
          lt: now
        }
      }
    });

    logger.info('SAML cleanup completed');
  }
}

export default SamlService;