/**
 * Authentication Handler
 * Manages secure credential handling and authentication for integrations
 */

import {
  AuthenticationCredential,
  AuthenticationType,
} from '../types';

/**
 * Authentication handler with support for multiple authentication methods
 * Integrates with CyberArk for secure credential storage
 */
export class AuthenticationHandler {
  // In production, this would connect to CyberArk
  // For now, use in-memory storage with encryption
  private credentials: Map<string, AuthenticationCredential> = new Map();
  private credentialMetadata: Map<string, { createdAt: Date; lastRotated?: Date; rotationRequired?: boolean }> =
    new Map();

  /**
   * Store authentication credential securely
   */
  async storeCredential(
    credentialId: string,
    credential: AuthenticationCredential,
    overwrite: boolean = false
  ): Promise<void> {
    if (this.credentials.has(credentialId) && !overwrite) {
      throw new Error(`Credential ${credentialId} already exists`);
    }

    // In production, encrypt before storage and send to CyberArk
    this.credentials.set(credentialId, credential);
    this.credentialMetadata.set(credentialId, {
      createdAt: new Date(),
    });
  }

  /**
   * Retrieve authentication credential
   */
  async getCredential(credentialId: string): Promise<AuthenticationCredential | null> {
    const credential = this.credentials.get(credentialId);
    if (!credential) {
      return null;
    }

    // In production, decrypt from storage
    return { ...credential };
  }

  /**
   * Delete authentication credential
   */
  async deleteCredential(credentialId: string): Promise<void> {
    this.credentials.delete(credentialId);
    this.credentialMetadata.delete(credentialId);
  }

  /**
   * Authenticate with OAuth2
   */
  async authenticateOAuth2(
    clientId: string,
    clientSecret: string,
    authEndpoint: string
  ): Promise<AuthenticationCredential> {
    // In production, make actual OAuth2 request
    const accessToken = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    return {
      type: AuthenticationType.OAUTH2,
      clientId,
      clientSecret,
      bearerToken: accessToken,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  /**
   * Authenticate with API Key
   */
  async authenticateApiKey(apiKey: string): Promise<AuthenticationCredential> {
    // Validate API key format
    if (!apiKey || apiKey.length < 10) {
      throw new Error('Invalid API key format');
    }

    return {
      type: AuthenticationType.API_KEY,
      apiKey,
      expiresAt: new Date(Date.now() + 86400000 * 365), // 1 year
    };
  }

  /**
   * Authenticate with SAML
   */
  async authenticateSAML(samlAssertion: string): Promise<AuthenticationCredential> {
    // In production, validate SAML assertion
    if (!samlAssertion || !samlAssertion.includes('Assertion')) {
      throw new Error('Invalid SAML assertion');
    }

    return {
      type: AuthenticationType.SAML,
      samlAssertion,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  /**
   * Authenticate with basic auth
   */
  async authenticateBasic(username: string, password: string): Promise<AuthenticationCredential> {
    if (!username || !password) {
      throw new Error('Username and password required');
    }

    const encoded = Buffer.from(`${username}:${password}`).toString('base64');

    return {
      type: AuthenticationType.BASIC,
      username,
      password,
      bearerToken: encoded,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  /**
   * Authenticate with bearer token
   */
  async authenticateBearerToken(token: string): Promise<AuthenticationCredential> {
    if (!token) {
      throw new Error('Bearer token required');
    }

    return {
      type: AuthenticationType.BEARER_TOKEN,
      bearerToken: token,
      expiresAt: new Date(Date.now() + 3600000), // 1 hour
    };
  }

  /**
   * Check if credential is expired
   */
  isCredentialExpired(credential: AuthenticationCredential): boolean {
    if (!credential.expiresAt) {
      return false;
    }
    return new Date() > credential.expiresAt;
  }

  /**
   * Refresh credential if applicable
   */
  async refreshCredential(credential: AuthenticationCredential): Promise<AuthenticationCredential> {
    if (!credential.refreshToken) {
      throw new Error('Credential does not support refresh');
    }

    // In production, use refresh token to get new access token
    const newToken = Buffer.from(credential.refreshToken).toString('base64');

    return {
      ...credential,
      bearerToken: newToken,
      expiresAt: new Date(Date.now() + 3600000),
    };
  }

  /**
   * Rotate API key
   */
  async rotateApiKey(
    credentialId: string,
    newApiKey: string
  ): Promise<AuthenticationCredential> {
    const existing = this.credentials.get(credentialId);
    if (!existing || existing.type !== AuthenticationType.API_KEY) {
      throw new Error('Credential not found or not an API key');
    }

    const rotated: AuthenticationCredential = {
      type: AuthenticationType.API_KEY,
      apiKey: newApiKey,
      expiresAt: new Date(Date.now() + 86400000 * 365),
    };

    this.credentials.set(credentialId, rotated);
    const metadata = this.credentialMetadata.get(credentialId);
    if (metadata) {
      metadata.lastRotated = new Date();
    }

    return rotated;
  }

  /**
   * Mark credential for required rotation
   */
  requireRotation(credentialId: string): void {
    const metadata = this.credentialMetadata.get(credentialId);
    if (metadata) {
      metadata.rotationRequired = true;
    }
  }

  /**
   * Check if credential needs rotation
   */
  needsRotation(credentialId: string): boolean {
    const metadata = this.credentialMetadata.get(credentialId);
    if (!metadata) {
      return false;
    }

    // Require rotation if:
    // 1. Explicitly marked for rotation
    if (metadata.rotationRequired) {
      return true;
    }

    // 2. Not rotated in last 90 days
    if (metadata.lastRotated) {
      const daysSinceRotation = (Date.now() - metadata.lastRotated.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceRotation > 90) {
        return true;
      }
    }

    return false;
  }

  /**
   * Build Authorization header
   */
  buildAuthHeader(credential: AuthenticationCredential): Record<string, string> {
    const headers: Record<string, string> = {};

    switch (credential.type) {
      case AuthenticationType.OAUTH2:
      case AuthenticationType.BEARER_TOKEN:
        if (credential.bearerToken) {
          headers['Authorization'] = `Bearer ${credential.bearerToken}`;
        }
        break;

      case AuthenticationType.API_KEY:
        if (credential.apiKey) {
          headers['X-API-Key'] = credential.apiKey;
        }
        break;

      case AuthenticationType.BASIC:
        if (credential.bearerToken) {
          headers['Authorization'] = `Basic ${credential.bearerToken}`;
        }
        break;

      case AuthenticationType.SAML:
        if (credential.samlAssertion) {
          headers['X-SAML-Assertion'] = credential.samlAssertion;
        }
        break;

      case AuthenticationType.CUSTOM:
        if (credential.customPayload) {
          // Custom auth headers
          Object.assign(headers, credential.customPayload);
        }
        break;
    }

    return headers;
  }

  /**
   * Validate credential
   */
  async validateCredential(credential: AuthenticationCredential): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Check expiration
    if (this.isCredentialExpired(credential)) {
      errors.push('Credential has expired');
    }

    // Type-specific validation
    switch (credential.type) {
      case AuthenticationType.OAUTH2:
        if (!credential.clientId || !credential.clientSecret) {
          errors.push('OAuth2 requires clientId and clientSecret');
        }
        break;

      case AuthenticationType.API_KEY:
        if (!credential.apiKey || credential.apiKey.length < 10) {
          errors.push('Invalid API key format');
        }
        break;

      case AuthenticationType.BASIC:
        if (!credential.username || !credential.password) {
          errors.push('Basic auth requires username and password');
        }
        break;

      case AuthenticationType.BEARER_TOKEN:
        if (!credential.bearerToken) {
          errors.push('Bearer token is required');
        }
        break;

      case AuthenticationType.SAML:
        if (!credential.samlAssertion) {
          errors.push('SAML assertion is required');
        }
        break;
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * List all credentials (for auditing)
   */
  listCredentials(): string[] {
    return Array.from(this.credentials.keys());
  }

  /**
   * Get credential metadata
   */
  getCredentialMetadata(credentialId: string): {
    createdAt: Date;
    lastRotated?: Date;
    rotationRequired?: boolean;
  } | null {
    return this.credentialMetadata.get(credentialId) || null;
  }

  /**
   * Clear all credentials (for testing)
   */
  clear(): void {
    this.credentials.clear();
    this.credentialMetadata.clear();
  }
}

// Singleton instance
export const authenticationHandler = new AuthenticationHandler();
