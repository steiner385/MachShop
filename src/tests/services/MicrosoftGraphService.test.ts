import { describe, it, expect, beforeEach, afterEach, vi, MockedFunction } from 'vitest';
import { MicrosoftGraphService } from '../../services/MicrosoftGraphService';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@azure/msal-node';
import { MicrosoftGraphConfig, UserSyncResult, GroupSyncResult, SyncOptions } from '../../types/azureAd';

// Mock dependencies
vi.mock('@microsoft/microsoft-graph-client');
vi.mock('../../lib/prisma', () => ({
  default: {
    user: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    role: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

const MockedClient = Client as vi.MockedClass<typeof Client>;

describe('MicrosoftGraphService', () => {
  let graphService: MicrosoftGraphService;
  let mockConfig: MicrosoftGraphConfig;
  let mockGraphClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      tenantId: 'test-tenant-id',
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['https://graph.microsoft.com/.default'],
    };

    mockGraphClient = {
      api: vi.fn().mockReturnThis(),
      get: vi.fn(),
      select: vi.fn().mockReturnThis(),
      top: vi.fn().mockReturnThis(),
      orderby: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      expand: vi.fn().mockReturnThis(),
      version: vi.fn().mockReturnThis(),
      header: vi.fn().mockReturnThis(),
    };

    MockedClient.initWithMiddleware = vi.fn().mockReturnValue(mockGraphClient);

    graphService = new MicrosoftGraphService(mockConfig);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with provided configuration', () => {
      expect(graphService).toBeDefined();
      expect(MockedClient.initWithMiddleware).toHaveBeenCalled();
    });

    it('should throw error with invalid configuration', () => {
      const invalidConfig = { ...mockConfig, tenantId: '' };
      expect(() => new MicrosoftGraphService(invalidConfig)).toThrow('Invalid Microsoft Graph configuration');
    });
  });

  describe('syncUsers', () => {
    it('should sync all users from Microsoft Graph', async () => {
      const mockUsersResponse = {
        value: [
          {
            id: 'user-1',
            userPrincipalName: 'user1@example.com',
            displayName: 'User One',
            givenName: 'User',
            surname: 'One',
            mail: 'user1@example.com',
            jobTitle: 'Developer',
            department: 'Engineering',
            accountEnabled: true,
          },
          {
            id: 'user-2',
            userPrincipalName: 'user2@example.com',
            displayName: 'User Two',
            givenName: 'User',
            surname: 'Two',
            mail: 'user2@example.com',
            jobTitle: 'Manager',
            department: 'Engineering',
            accountEnabled: true,
          },
        ],
        '@odata.nextLink': null,
      };

      mockGraphClient.get.mockResolvedValue(mockUsersResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.user.upsert.mockResolvedValue({
        id: 'local-user-id',
        email: 'user1@example.com',
        azureAdId: 'user-1',
      });

      const options: SyncOptions = { batchSize: 100 };
      const result = await graphService.syncUsers(options);

      expect(result).toEqual({
        success: true,
        totalUsers: 2,
        syncedUsers: 2,
        createdUsers: 0,
        updatedUsers: 2,
        skippedUsers: 0,
        errors: [],
        duration: expect.any(Number),
      });

      expect(mockGraphClient.api).toHaveBeenCalledWith('/users');
      expect(mockGraphClient.select).toHaveBeenCalledWith(
        'id,userPrincipalName,displayName,givenName,surname,mail,jobTitle,department,officeLocation,businessPhones,mobilePhone,accountEnabled,createdDateTime,lastSignInDateTime'
      );
      expect(mockGraphClient.top).toHaveBeenCalledWith(100);
    });

    it('should handle pagination when syncing users', async () => {
      const firstPageResponse = {
        value: [
          {
            id: 'user-1',
            userPrincipalName: 'user1@example.com',
            displayName: 'User One',
            mail: 'user1@example.com',
            accountEnabled: true,
          },
        ],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/users?$skiptoken=page2',
      };

      const secondPageResponse = {
        value: [
          {
            id: 'user-2',
            userPrincipalName: 'user2@example.com',
            displayName: 'User Two',
            mail: 'user2@example.com',
            accountEnabled: true,
          },
        ],
        '@odata.nextLink': null,
      };

      mockGraphClient.get
        .mockResolvedValueOnce(firstPageResponse)
        .mockResolvedValueOnce(secondPageResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.user.upsert.mockResolvedValue({});

      const result = await graphService.syncUsers();

      expect(result.totalUsers).toBe(2);
      expect(mockGraphClient.get).toHaveBeenCalledTimes(2);
    });

    it('should handle sync errors gracefully', async () => {
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

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.user.upsert.mockRejectedValue(new Error('Database error'));

      const result = await graphService.syncUsers();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Database error');
    });

    it('should support delta sync', async () => {
      const deltaToken = 'test-delta-token';
      graphService.setDeltaToken('users', deltaToken);

      const mockDeltaResponse = {
        value: [
          {
            id: 'user-1',
            userPrincipalName: 'user1@example.com',
            displayName: 'User One Updated',
            mail: 'user1@example.com',
            accountEnabled: true,
          },
        ],
        '@odata.deltaLink': 'https://graph.microsoft.com/v1.0/users/delta?$deltatoken=new-token',
      };

      mockGraphClient.get.mockResolvedValue(mockDeltaResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.user.upsert.mockResolvedValue({});

      const options: SyncOptions = { deltaSync: true };
      const result = await graphService.syncUsers(options);

      expect(result.success).toBe(true);
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/delta');
      expect(mockGraphClient.header).toHaveBeenCalledWith('deltatoken', deltaToken);
    });
  });

  describe('syncGroups', () => {
    it('should sync all groups from Microsoft Graph', async () => {
      const mockGroupsResponse = {
        value: [
          {
            id: 'group-1',
            displayName: 'Engineering Team',
            description: 'Engineering department group',
            mail: 'engineering@example.com',
            groupTypes: ['Unified'],
            securityEnabled: true,
          },
          {
            id: 'group-2',
            displayName: 'Managers',
            description: 'Management group',
            mail: 'managers@example.com',
            groupTypes: [],
            securityEnabled: true,
          },
        ],
        '@odata.nextLink': null,
      };

      mockGraphClient.get.mockResolvedValue(mockGroupsResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.role.findMany.mockResolvedValue([]);
      mockPrisma.role.create.mockResolvedValue({
        id: 'role-id',
        name: 'Engineering Team',
        azureAdGroupId: 'group-1',
      });

      const result = await graphService.syncGroups();

      expect(result).toEqual({
        success: true,
        totalGroups: 2,
        syncedGroups: 2,
        createdGroups: 2,
        updatedGroups: 0,
        skippedGroups: 0,
        errors: [],
        duration: expect.any(Number),
      });

      expect(mockGraphClient.api).toHaveBeenCalledWith('/groups');
      expect(mockGraphClient.select).toHaveBeenCalledWith(
        'id,displayName,description,mail,groupTypes,securityEnabled,createdDateTime'
      );
    });

    it('should handle group sync errors', async () => {
      const mockGroupsResponse = {
        value: [
          {
            id: 'group-1',
            displayName: 'Test Group',
            securityEnabled: true,
          },
        ],
      };

      mockGraphClient.get.mockResolvedValue(mockGroupsResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.role.findMany.mockRejectedValue(new Error('Database connection failed'));

      const result = await graphService.syncGroups();

      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe('getUserById', () => {
    it('should fetch user by ID from Microsoft Graph', async () => {
      const mockUser = {
        id: 'user-1',
        userPrincipalName: 'user1@example.com',
        displayName: 'User One',
        givenName: 'User',
        surname: 'One',
        mail: 'user1@example.com',
        jobTitle: 'Developer',
        department: 'Engineering',
      };

      mockGraphClient.get.mockResolvedValue(mockUser);

      const result = await graphService.getUserById('user-1');

      expect(result).toEqual(mockUser);
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users/user-1');
    });

    it('should handle user not found', async () => {
      const error = new Error('User not found');
      error.name = 'NotFound';
      mockGraphClient.get.mockRejectedValue(error);

      await expect(graphService.getUserById('nonexistent')).rejects.toThrow('User not found');
    });
  });

  describe('getGroupMembers', () => {
    it('should fetch group members from Microsoft Graph', async () => {
      const mockMembersResponse = {
        value: [
          {
            id: 'user-1',
            userPrincipalName: 'user1@example.com',
            displayName: 'User One',
          },
          {
            id: 'user-2',
            userPrincipalName: 'user2@example.com',
            displayName: 'User Two',
          },
        ],
      };

      mockGraphClient.get.mockResolvedValue(mockMembersResponse);

      const result = await graphService.getGroupMembers('group-1');

      expect(result).toEqual(mockMembersResponse.value);
      expect(mockGraphClient.api).toHaveBeenCalledWith('/groups/group-1/members');
    });
  });

  describe('searchUsers', () => {
    it('should search users by query', async () => {
      const mockSearchResponse = {
        value: [
          {
            id: 'user-1',
            userPrincipalName: 'john.doe@example.com',
            displayName: 'John Doe',
            mail: 'john.doe@example.com',
          },
        ],
      };

      mockGraphClient.get.mockResolvedValue(mockSearchResponse);

      const result = await graphService.searchUsers('john');

      expect(result).toEqual(mockSearchResponse.value);
      expect(mockGraphClient.api).toHaveBeenCalledWith('/users');
      expect(mockGraphClient.filter).toHaveBeenCalledWith(
        "startswith(displayName,'john') or startswith(userPrincipalName,'john') or startswith(mail,'john')"
      );
    });
  });

  describe('getHealth', () => {
    it('should return healthy status when Graph API is accessible', async () => {
      const mockOrgResponse = {
        value: [
          {
            id: 'org-1',
            displayName: 'Test Organization',
            verifiedDomains: [{ name: 'example.com', isDefault: true }],
          },
        ],
      };

      mockGraphClient.get.mockResolvedValue(mockOrgResponse);

      const health = await graphService.getHealth();

      expect(health).toEqual({
        status: 'healthy',
        lastCheck: expect.any(Date),
        details: {
          connection: 'connected',
          organization: mockOrgResponse.value[0],
          apiVersion: 'v1.0',
        },
      });
    });

    it('should return unhealthy status when Graph API is not accessible', async () => {
      const error = new Error('Network error');
      mockGraphClient.get.mockRejectedValue(error);

      const health = await graphService.getHealth();

      expect(health).toEqual({
        status: 'unhealthy',
        lastCheck: expect.any(Date),
        details: {
          connection: 'failed',
          error: 'Network error',
        },
      });
    });
  });

  describe('batch operations', () => {
    it('should process users in batches', async () => {
      const mockUsers = Array.from({ length: 250 }, (_, i) => ({
        id: `user-${i}`,
        userPrincipalName: `user${i}@example.com`,
        displayName: `User ${i}`,
        mail: `user${i}@example.com`,
        accountEnabled: true,
      }));

      const mockResponse = {
        value: mockUsers,
        '@odata.nextLink': null,
      };

      mockGraphClient.get.mockResolvedValue(mockResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.user.upsert.mockResolvedValue({});

      const options: SyncOptions = { batchSize: 100 };
      const result = await graphService.syncUsers(options);

      expect(result.totalUsers).toBe(250);
      expect(result.success).toBe(true);
    });
  });

  describe('error handling and retry logic', () => {
    it('should retry on throttling errors', async () => {
      const throttleError = new Error('Rate limit exceeded');
      throttleError.name = 'TooManyRequests';

      const mockResponse = {
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

      mockGraphClient.get
        .mockRejectedValueOnce(throttleError)
        .mockRejectedValueOnce(throttleError)
        .mockResolvedValue(mockResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.user.upsert.mockResolvedValue({});

      const result = await graphService.syncUsers();

      expect(result.success).toBe(true);
      expect(mockGraphClient.get).toHaveBeenCalledTimes(3);
    });

    it('should fail after maximum retries', async () => {
      const error = new Error('Persistent error');
      mockGraphClient.get.mockRejectedValue(error);

      const result = await graphService.syncUsers();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Failed to fetch users: Persistent error');
    });
  });

  describe('delta token management', () => {
    it('should store and retrieve delta tokens', () => {
      const token = 'test-delta-token';
      graphService.setDeltaToken('users', token);

      expect(graphService.getDeltaToken('users')).toBe(token);
    });

    it('should clear delta tokens', () => {
      graphService.setDeltaToken('users', 'test-token');
      graphService.clearDeltaToken('users');

      expect(graphService.getDeltaToken('users')).toBeUndefined();
    });
  });

  describe('event emissions', () => {
    it('should emit events during sync operations', (done) => {
      const mockResponse = {
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

      mockGraphClient.get.mockResolvedValue(mockResponse);

      const mockPrisma = require('../../lib/prisma').default;
      mockPrisma.user.upsert.mockResolvedValue({});

      let eventCount = 0;

      graphService.on('sync:start', () => {
        eventCount++;
      });

      graphService.on('sync:progress', () => {
        eventCount++;
      });

      graphService.on('sync:complete', () => {
        eventCount++;
        expect(eventCount).toBeGreaterThan(0);
        done();
      });

      graphService.syncUsers();
    });
  });
});