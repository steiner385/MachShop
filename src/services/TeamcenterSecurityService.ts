/**
 * Teamcenter Security Service
 * Handles credential encryption, access control, and security policies
 * Issue #266 - Teamcenter Quality MRB Integration Infrastructure
 */

import { Logger } from 'winston';
import { PrismaClient } from '@prisma/client';
import type { TeamcenterCredentials } from './TeamcenterMRBModels';

/**
 * Credential encryption provider
 */
export interface CredentialEncryptionProvider {
  encrypt(data: string): Promise<string>;
  decrypt(encrypted: string): Promise<string>;
}

/**
 * Default credential encryption provider using environment-based encryption
 */
export class DefaultCredentialEncryptionProvider implements CredentialEncryptionProvider {
  private encryptionKey: string;

  constructor(private logger: Logger) {
    this.encryptionKey = process.env.TEAMCENTER_ENCRYPTION_KEY || 'default-key';
    if (!process.env.TEAMCENTER_ENCRYPTION_KEY) {
      this.logger.warn('Using default encryption key. Set TEAMCENTER_ENCRYPTION_KEY in production!');
    }
  }

  async encrypt(data: string): Promise<string> {
    // In production, use proper encryption (e.g., crypto module with AES-256)
    // This is a placeholder implementation
    const buffer = Buffer.from(data);
    return buffer.toString('base64');
  }

  async decrypt(encrypted: string): Promise<string> {
    // In production, use proper decryption
    // This is a placeholder implementation
    const buffer = Buffer.from(encrypted, 'base64');
    return buffer.toString('utf-8');
  }
}

/**
 * Role-based access control for Teamcenter operations
 */
export enum TeamcenterOperationRole {
  ADMIN = 'TEAMCENTER_ADMIN',
  MANAGER = 'TEAMCENTER_MANAGER',
  OPERATOR = 'TEAMCENTER_OPERATOR',
  VIEWER = 'TEAMCENTER_VIEWER',
}

/**
 * Operation type for RBAC
 */
export enum TeamcenterOperation {
  READ_MRB = 'read:mrb',
  WRITE_MRB = 'write:mrb',
  DELETE_MRB = 'delete:mrb',
  MANAGE_CONFIG = 'manage:config',
  VIEW_AUDIT = 'view:audit',
  MANAGE_CREDENTIALS = 'manage:credentials',
}

/**
 * RBAC permission matrix
 */
const PERMISSION_MATRIX: Record<TeamcenterOperationRole, TeamcenterOperation[]> = {
  [TeamcenterOperationRole.ADMIN]: [
    TeamcenterOperation.READ_MRB,
    TeamcenterOperation.WRITE_MRB,
    TeamcenterOperation.DELETE_MRB,
    TeamcenterOperation.MANAGE_CONFIG,
    TeamcenterOperation.VIEW_AUDIT,
    TeamcenterOperation.MANAGE_CREDENTIALS,
  ],
  [TeamcenterOperationRole.MANAGER]: [
    TeamcenterOperation.READ_MRB,
    TeamcenterOperation.WRITE_MRB,
    TeamcenterOperation.VIEW_AUDIT,
  ],
  [TeamcenterOperationRole.OPERATOR]: [
    TeamcenterOperation.READ_MRB,
    TeamcenterOperation.WRITE_MRB,
  ],
  [TeamcenterOperationRole.VIEWER]: [
    TeamcenterOperation.READ_MRB,
  ],
};

/**
 * Teamcenter Security Service
 * Manages encryption, access control, and security policies
 */
export class TeamcenterSecurityService {
  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private encryptionProvider: CredentialEncryptionProvider = new DefaultCredentialEncryptionProvider(logger)
  ) {}

  /**
   * Encrypt credentials for secure storage
   */
  async encryptCredentials(credentials: TeamcenterCredentials): Promise<TeamcenterCredentials> {
    try {
      const encrypted = { ...credentials };

      if (credentials.clientSecret) {
        encrypted.clientSecret = await this.encryptionProvider.encrypt(credentials.clientSecret);
      }
      if (credentials.accessToken) {
        encrypted.accessToken = await this.encryptionProvider.encrypt(credentials.accessToken);
      }
      if (credentials.refreshToken) {
        encrypted.refreshToken = await this.encryptionProvider.encrypt(credentials.refreshToken);
      }
      if (credentials.apiKey) {
        encrypted.apiKey = await this.encryptionProvider.encrypt(credentials.apiKey);
      }
      if (credentials.password) {
        encrypted.password = await this.encryptionProvider.encrypt(credentials.password);
      }

      return encrypted;
    } catch (error) {
      this.logger.error('Failed to encrypt credentials', { error });
      throw error;
    }
  }

  /**
   * Decrypt credentials for use
   */
  async decryptCredentials(credentials: TeamcenterCredentials): Promise<TeamcenterCredentials> {
    try {
      const decrypted = { ...credentials };

      if (credentials.clientSecret) {
        decrypted.clientSecret = await this.encryptionProvider.decrypt(credentials.clientSecret);
      }
      if (credentials.accessToken) {
        decrypted.accessToken = await this.encryptionProvider.decrypt(credentials.accessToken);
      }
      if (credentials.refreshToken) {
        decrypted.refreshToken = await this.encryptionProvider.decrypt(credentials.refreshToken);
      }
      if (credentials.apiKey) {
        decrypted.apiKey = await this.encryptionProvider.decrypt(credentials.apiKey);
      }
      if (credentials.password) {
        decrypted.password = await this.encryptionProvider.decrypt(credentials.password);
      }

      return decrypted;
    } catch (error) {
      this.logger.error('Failed to decrypt credentials', { error });
      throw error;
    }
  }

  /**
   * Check if user has permission for operation
   */
  hasPermission(role: TeamcenterOperationRole, operation: TeamcenterOperation): boolean {
    const permissions = PERMISSION_MATRIX[role];
    return permissions ? permissions.includes(operation) : false;
  }

  /**
   * Verify user has required permission
   */
  verifyPermission(role: TeamcenterOperationRole, operation: TeamcenterOperation): void {
    if (!this.hasPermission(role, operation)) {
      throw new Error(`User does not have permission for operation: ${operation}`);
    }
  }

  /**
   * Get all permissions for a role
   */
  getPermissions(role: TeamcenterOperationRole): TeamcenterOperation[] {
    return PERMISSION_MATRIX[role] || [];
  }
}
