/**
 * Directory Services Tests
 * Issue #128: External Integration: LDAP/AD Role Synchronization
 *
 * Basic tests for directory service functionality
 */

import request from 'supertest';
import { PrismaClient } from '@prisma/client-integration';
import { DirectoryServiceFactory } from '../services/directory/factory';
import { LdapDirectoryService } from '../services/directory/implementations/ldap';
import { ActiveDirectoryService } from '../services/directory/implementations/active-directory';
import { DirectoryType } from '../types/directory';

// Mock app for testing
const mockApp = {
  listen: jest.fn(),
  use: jest.fn(),
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
};

describe('Directory Services', () => {
  let prisma: PrismaClient;
  let factory: DirectoryServiceFactory;

  beforeAll(async () => {
    prisma = new PrismaClient();
    factory = DirectoryServiceFactory.getInstance();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Clean up directory configurations before each test
    await prisma.directorySyncLog.deleteMany();
    await prisma.directoryGroupMapping.deleteMany();
    await prisma.directoryUserMapping.deleteMany();
    await prisma.directoryConfig.deleteMany();
  });

  describe('DirectoryServiceFactory', () => {
    it('should be a singleton', () => {
      const instance1 = DirectoryServiceFactory.getInstance();
      const instance2 = DirectoryServiceFactory.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should return supported directory types', () => {
      const supportedTypes = factory.getSupportedTypes();
      expect(supportedTypes).toContain(DirectoryType.LDAP);
      expect(supportedTypes).toContain(DirectoryType.OPENLDAP);
      expect(supportedTypes).toContain(DirectoryType.ACTIVE_DIRECTORY);
      expect(supportedTypes).not.toContain(DirectoryType.AZURE_AD); // Not yet implemented
    });

    it('should check if directory type is supported', () => {
      expect(factory.isTypeSupported(DirectoryType.LDAP)).toBe(true);
      expect(factory.isTypeSupported(DirectoryType.ACTIVE_DIRECTORY)).toBe(true);
      expect(factory.isTypeSupported(DirectoryType.AZURE_AD)).toBe(false);
    });

    it('should create LDAP service for LDAP type', async () => {
      const config = {
        id: 'test-ldap',
        name: 'Test LDAP',
        type: DirectoryType.LDAP,
        host: 'ldap.example.com',
        port: 389,
        baseDN: 'dc=example,dc=com',
        userSearchBase: 'ou=users,dc=example,dc=com',
        isActive: true,
        useSSL: false,
        useStartTLS: false,
        timeout: 30000,
        maxConnections: 5,
        enableSync: false,
        syncInterval: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const service = await factory.createService(config);
      expect(service).toBeInstanceOf(LdapDirectoryService);
    });

    it('should create Active Directory service for AD type', async () => {
      const config = {
        id: 'test-ad',
        name: 'Test AD',
        type: DirectoryType.ACTIVE_DIRECTORY,
        host: 'ad.example.com',
        port: 389,
        baseDN: 'dc=example,dc=com',
        userSearchBase: 'ou=users,dc=example,dc=com',
        bindDN: 'cn=admin,dc=example,dc=com',
        bindPassword: 'password',
        isActive: true,
        useSSL: false,
        useStartTLS: false,
        timeout: 30000,
        maxConnections: 5,
        enableSync: false,
        syncInterval: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const service = await factory.createService(config);
      expect(service).toBeInstanceOf(ActiveDirectoryService);
    });

    it('should throw error for unsupported directory type', async () => {
      const config = {
        id: 'test-azure',
        name: 'Test Azure AD',
        type: DirectoryType.AZURE_AD,
        host: 'azure.example.com',
        port: 389,
        baseDN: 'dc=example,dc=com',
        userSearchBase: 'ou=users,dc=example,dc=com',
        isActive: true,
        useSSL: false,
        useStartTLS: false,
        timeout: 30000,
        maxConnections: 5,
        enableSync: false,
        syncInterval: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await expect(factory.createService(config)).rejects.toThrow('Azure AD integration is not yet implemented');
    });

    it('should cache directory services', async () => {
      const config = {
        id: 'test-cache',
        name: 'Test Cache',
        type: DirectoryType.LDAP,
        host: 'ldap.example.com',
        port: 389,
        baseDN: 'dc=example,dc=com',
        userSearchBase: 'ou=users,dc=example,dc=com',
        isActive: true,
        useSSL: false,
        useStartTLS: false,
        timeout: 30000,
        maxConnections: 5,
        enableSync: false,
        syncInterval: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const service1 = await factory.createService(config);
      const service2 = await factory.createService(config);

      // Should return the same cached instance
      expect(service1).toBe(service2);
    });

    it('should provide cache statistics', () => {
      const stats = factory.getCacheStats();
      expect(stats).toHaveProperty('totalCached');
      expect(stats).toHaveProperty('connectedServices');
      expect(stats).toHaveProperty('servicesByType');
      expect(typeof stats.totalCached).toBe('number');
      expect(typeof stats.connectedServices).toBe('number');
    });
  });

  describe('LdapDirectoryService', () => {
    let service: LdapDirectoryService;

    beforeEach(() => {
      service = new LdapDirectoryService();
    });

    it('should not be connected initially', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should validate configuration', async () => {
      const validConfig = {
        id: 'test-ldap',
        name: 'Test LDAP',
        type: DirectoryType.LDAP,
        host: 'ldap.example.com',
        port: 389,
        baseDN: 'dc=example,dc=com',
        userSearchBase: 'ou=users,dc=example,dc=com',
        isActive: true,
        useSSL: false,
        useStartTLS: false,
        timeout: 30000,
        maxConnections: 5,
        enableSync: false,
        syncInterval: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.validateConfig(validConfig);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail validation for missing required fields', async () => {
      const invalidConfig = {
        id: 'test-invalid',
        name: 'Test Invalid',
        type: DirectoryType.LDAP,
        host: '', // Missing host
        port: 389,
        baseDN: '', // Missing baseDN
        userSearchBase: '', // Missing userSearchBase
        isActive: true,
        useSSL: false,
        useStartTLS: false,
        timeout: 30000,
        maxConnections: 5,
        enableSync: false,
        syncInterval: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.validateConfig(invalidConfig);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should return directory capabilities', async () => {
      const capabilities = await service.getCapabilities();
      expect(capabilities).toHaveProperty('supportsStartTLS');
      expect(capabilities).toHaveProperty('supportsSSL');
      expect(capabilities).toHaveProperty('supportsPaging');
      expect(capabilities).toHaveProperty('supportedLdapVersions');
      expect(capabilities.supportedLdapVersions).toContain('3');
    });
  });

  describe('ActiveDirectoryService', () => {
    let service: ActiveDirectoryService;

    beforeEach(() => {
      service = new ActiveDirectoryService();
    });

    it('should not be connected initially', () => {
      expect(service.isConnected()).toBe(false);
    });

    it('should require bind credentials for AD', async () => {
      const configWithoutCredentials = {
        id: 'test-ad-no-creds',
        name: 'Test AD No Creds',
        type: DirectoryType.ACTIVE_DIRECTORY,
        host: 'ad.example.com',
        port: 389,
        baseDN: 'dc=example,dc=com',
        userSearchBase: 'ou=users,dc=example,dc=com',
        // Missing bindDN and bindPassword
        isActive: true,
        useSSL: false,
        useStartTLS: false,
        timeout: 30000,
        maxConnections: 5,
        enableSync: false,
        syncInterval: 3600,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await service.validateConfig(configWithoutCredentials);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'bindDN')).toBe(true);
      expect(result.errors.some(e => e.field === 'bindPassword')).toBe(true);
    });

    it('should return enhanced AD capabilities', async () => {
      const capabilities = await service.getCapabilities();
      expect(capabilities).toHaveProperty('supportsChangeNotifications');
      expect(capabilities).toHaveProperty('supportsWriteOperations');
      expect(capabilities.supportsChangeNotifications).toBe(true);
      expect(capabilities.supportsWriteOperations).toBe(true);
      expect(capabilities.supportedSaslMechanisms).toContain('GSSAPI');
      expect(capabilities.supportedSaslMechanisms).toContain('NTLM');
    });
  });

  describe('Database Integration', () => {
    it('should create directory configuration in database', async () => {
      const configData = {
        name: 'Test DB Config',
        type: DirectoryType.LDAP,
        host: 'ldap.test.com',
        port: 389,
        baseDN: 'dc=test,dc=com',
        userSearchBase: 'ou=users,dc=test,dc=com',
        isActive: true,
      };

      const config = await prisma.directoryConfig.create({
        data: configData,
      });

      expect(config).toHaveProperty('id');
      expect(config.name).toBe(configData.name);
      expect(config.type).toBe(configData.type);
      expect(config.host).toBe(configData.host);
    });

    it('should create user mappings for directory configuration', async () => {
      const config = await prisma.directoryConfig.create({
        data: {
          name: 'Test Mapping Config',
          type: DirectoryType.LDAP,
          host: 'ldap.test.com',
          baseDN: 'dc=test,dc=com',
          userSearchBase: 'ou=users,dc=test,dc=com',
        },
      });

      const mapping = await prisma.directoryUserMapping.create({
        data: {
          configId: config.id,
          ldapAttribute: 'mail',
          mesField: 'email',
          isRequired: true,
          isIdentity: false,
        },
      });

      expect(mapping).toHaveProperty('id');
      expect(mapping.configId).toBe(config.id);
      expect(mapping.ldapAttribute).toBe('mail');
      expect(mapping.mesField).toBe('email');
    });

    it('should create group mappings for directory configuration', async () => {
      const config = await prisma.directoryConfig.create({
        data: {
          name: 'Test Group Config',
          type: DirectoryType.ACTIVE_DIRECTORY,
          host: 'ad.test.com',
          baseDN: 'dc=test,dc=com',
          userSearchBase: 'ou=users,dc=test,dc=com',
        },
      });

      const mapping = await prisma.directoryGroupMapping.create({
        data: {
          configId: config.id,
          groupDN: 'cn=Administrators,ou=groups,dc=test,dc=com',
          groupName: 'Administrators',
          roleId: 'admin-role-id',
          autoAssign: true,
        },
      });

      expect(mapping).toHaveProperty('id');
      expect(mapping.configId).toBe(config.id);
      expect(mapping.groupDN).toBe('cn=Administrators,ou=groups,dc=test,dc=com');
      expect(mapping.roleId).toBe('admin-role-id');
    });

    it('should create sync logs for directory operations', async () => {
      const config = await prisma.directoryConfig.create({
        data: {
          name: 'Test Sync Config',
          type: DirectoryType.LDAP,
          host: 'ldap.test.com',
          baseDN: 'dc=test,dc=com',
          userSearchBase: 'ou=users,dc=test,dc=com',
        },
      });

      const syncLog = await prisma.directorySyncLog.create({
        data: {
          configId: config.id,
          type: 'FULL',
          status: 'COMPLETED',
          batchId: 'batch-123',
          startedAt: new Date(),
          completedAt: new Date(),
          usersProcessed: 100,
          usersCreated: 10,
          usersUpdated: 90,
          groupsProcessed: 5,
          summary: 'Test sync completed successfully',
        },
      });

      expect(syncLog).toHaveProperty('id');
      expect(syncLog.configId).toBe(config.id);
      expect(syncLog.type).toBe('FULL');
      expect(syncLog.status).toBe('COMPLETED');
      expect(syncLog.usersProcessed).toBe(100);
    });

    it('should handle cascading deletes', async () => {
      const config = await prisma.directoryConfig.create({
        data: {
          name: 'Test Cascade Config',
          type: DirectoryType.LDAP,
          host: 'ldap.test.com',
          baseDN: 'dc=test,dc=com',
          userSearchBase: 'ou=users,dc=test,dc=com',
        },
      });

      // Create related records
      await prisma.directoryUserMapping.create({
        data: {
          configId: config.id,
          ldapAttribute: 'uid',
          mesField: 'username',
        },
      });

      await prisma.directoryGroupMapping.create({
        data: {
          configId: config.id,
          groupDN: 'cn=Users,dc=test,dc=com',
          roleId: 'user-role-id',
        },
      });

      await prisma.directorySyncLog.create({
        data: {
          configId: config.id,
          type: 'FULL',
          status: 'COMPLETED',
          batchId: 'cascade-test',
          startedAt: new Date(),
        },
      });

      // Delete the config - should cascade delete all related records
      await prisma.directoryConfig.delete({
        where: { id: config.id },
      });

      // Verify related records were deleted
      const userMappings = await prisma.directoryUserMapping.findMany({
        where: { configId: config.id },
      });
      const groupMappings = await prisma.directoryGroupMapping.findMany({
        where: { configId: config.id },
      });
      const syncLogs = await prisma.directorySyncLog.findMany({
        where: { configId: config.id },
      });

      expect(userMappings).toHaveLength(0);
      expect(groupMappings).toHaveLength(0);
      expect(syncLogs).toHaveLength(0);
    });
  });
});