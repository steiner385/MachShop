import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { SaviyntApiClient, SaviyntUser, SaviyntRole } from '../../services/SaviyntApiClient';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('SaviyntApiClient', () => {
  let client: SaviyntApiClient;
  let mockCreate: any;
  let mockRequest: any;

  beforeEach(() => {
    // Mock axios.create
    mockRequest = vi.fn();
    mockCreate = vi.fn().mockReturnValue({
      request: mockRequest,
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() }
      }
    });
    mockedAxios.create = mockCreate;
    mockedAxios.post = vi.fn();

    // Create client with test credentials
    client = new SaviyntApiClient({
      username: 'test-user',
      password: 'test-password',
      apiKey: 'test-api-key'
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should create client with provided credentials', () => {
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: expect.any(String),
          timeout: expect.any(Number),
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          })
        })
      );
    });

    it('should use default credentials from config when none provided', () => {
      const defaultClient = new SaviyntApiClient();
      expect(defaultClient).toBeInstanceOf(SaviyntApiClient);
    });

    it('should setup request and response interceptors', () => {
      expect(mockCreate().interceptors.request.use).toHaveBeenCalled();
      expect(mockCreate().interceptors.response.use).toHaveBeenCalled();
    });
  });

  describe('Authentication', () => {
    it('should authenticate with username and password', async () => {
      const mockResponse = {
        data: {
          access_token: 'test-token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await client.authenticate();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/ECM/api/login'),
        {
          username: 'test-user',
          password: 'test-password'
        },
        expect.any(Object)
      );
    });

    it('should authenticate with OAuth2 client credentials', async () => {
      const oAuthClient = new SaviyntApiClient({
        clientId: 'test-client',
        clientSecret: 'test-secret'
      });

      const mockResponse = {
        data: {
          access_token: 'oauth-token',
          token_type: 'Bearer',
          expires_in: 3600
        }
      };

      mockedAxios.post.mockResolvedValueOnce(mockResponse);

      await oAuthClient.authenticate();

      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.stringContaining('/oauth2/token'),
        expect.any(URLSearchParams),
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        })
      );
    });

    it('should handle authentication failure', async () => {
      mockedAxios.post.mockRejectedValueOnce(new Error('Authentication failed'));

      await expect(client.authenticate()).rejects.toThrow('Saviynt authentication failed');
    });

    it('should validate token expiration', () => {
      // Test token validation logic
      const authStatus = client.getAuthStatus();
      expect(authStatus.authenticated).toBe(false);
    });
  });

  describe('Connection Testing', () => {
    it('should test connection successfully', async () => {
      mockRequest.mockResolvedValueOnce({
        status: 200,
        data: { errorCode: '0' }
      });

      const result = await client.testConnection();

      expect(result).toBe(true);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/ECM/api/v1/getHealthCheck'
      });
    });

    it('should handle connection test failure', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Network error'));

      const result = await client.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('User Management', () => {
    const mockUser: SaviyntUser = {
      userkey: 'user123',
      username: 'testuser',
      email: 'test@example.com',
      firstname: 'Test',
      lastname: 'User',
      statuskey: '1'
    };

    it('should get user by username', async () => {
      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: [mockUser]
        }
      });

      const result = await client.getUser('testuser');

      expect(result).toEqual(mockUser);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/ECM/api/v1/getUser',
        data: null,
        params: { username: 'testuser' }
      });
    });

    it('should return null when user not found', async () => {
      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: []
        }
      });

      const result = await client.getUser('nonexistent');

      expect(result).toBeNull();
    });

    it('should create new user', async () => {
      const newUser: SaviyntUser = {
        username: 'newuser',
        email: 'new@example.com',
        firstname: 'New',
        lastname: 'User'
      };

      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: { userkey: 'user456' }
        }
      });

      const userKey = await client.createUser(newUser);

      expect(userKey).toBe('user456');
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/createUser',
        data: { userdata: [newUser] }
      });
    });

    it('should update existing user', async () => {
      const updates = {
        email: 'updated@example.com',
        firstname: 'Updated'
      };

      mockRequest.mockResolvedValueOnce({
        data: { errorCode: '0' }
      });

      await client.updateUser('user123', updates);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/updateUser',
        data: {
          userdata: [{
            userkey: 'user123',
            ...updates
          }]
        }
      });
    });

    it('should disable user', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { errorCode: '0' }
      });

      await client.disableUser('user123');

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/updateUser',
        data: {
          userdata: [{
            userkey: 'user123',
            statuskey: '0'
          }]
        }
      });
    });

    it('should enable user', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { errorCode: '0' }
      });

      await client.enableUser('user123');

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/updateUser',
        data: {
          userdata: [{
            userkey: 'user123',
            statuskey: '1'
          }]
        }
      });
    });
  });

  describe('Role Management', () => {
    const mockRole: SaviyntRole = {
      rolekey: 'role123',
      rolename: 'TEST_ROLE',
      roledisplayname: 'Test Role',
      roledescription: 'Test role description'
    };

    it('should get role by name', async () => {
      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: [mockRole]
        }
      });

      const result = await client.getRole('TEST_ROLE');

      expect(result).toEqual(mockRole);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/ECM/api/v1/getRole',
        data: null,
        params: { rolename: 'TEST_ROLE' }
      });
    });

    it('should create new role', async () => {
      const newRole: SaviyntRole = {
        rolename: 'NEW_ROLE',
        roledisplayname: 'New Role',
        roledescription: 'New role description'
      };

      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: { rolekey: 'role456' }
        }
      });

      const roleKey = await client.createRole(newRole);

      expect(roleKey).toBe('role456');
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/createRole',
        data: { roledata: [newRole] }
      });
    });

    it('should update existing role', async () => {
      const updates = {
        roledisplayname: 'Updated Role',
        roledescription: 'Updated description'
      };

      mockRequest.mockResolvedValueOnce({
        data: { errorCode: '0' }
      });

      await client.updateRole('role123', updates);

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/updateRole',
        data: {
          roledata: [{
            rolekey: 'role123',
            ...updates
          }]
        }
      });
    });
  });

  describe('Access Management', () => {
    it('should assign role to user', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { errorCode: '0' }
      });

      await client.assignRoleToUser('user123', 'role456');

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/addAccessToUser',
        data: {
          username: 'user123',
          rolename: 'role456'
        }
      });
    });

    it('should remove role from user', async () => {
      mockRequest.mockResolvedValueOnce({
        data: { errorCode: '0' }
      });

      await client.removeRoleFromUser('user123', 'role456');

      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/removeAccessFromUser',
        data: {
          username: 'user123',
          rolename: 'role456'
        }
      });
    });

    it('should get user roles', async () => {
      const mockRoles = [
        { rolekey: 'role1', rolename: 'ROLE1' },
        { rolekey: 'role2', rolename: 'ROLE2' }
      ];

      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: mockRoles
        }
      });

      const result = await client.getUserRoles('user123');

      expect(result).toEqual(mockRoles);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'GET',
        url: '/ECM/api/v1/getUserRoles',
        data: null,
        params: { userkey: 'user123' }
      });
    });
  });

  describe('Bulk Operations', () => {
    it('should bulk create users', async () => {
      const users: SaviyntUser[] = [
        { username: 'user1', email: 'user1@test.com' },
        { username: 'user2', email: 'user2@test.com' }
      ];

      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: {
            successrecords: 2,
            failedrecords: 0
          }
        }
      });

      const result = await client.bulkCreateUsers(users);

      expect(result.successrecords).toBe(2);
      expect(result.failedrecords).toBe(0);
      expect(mockRequest).toHaveBeenCalledWith({
        method: 'POST',
        url: '/ECM/api/v1/bulkCreateUser',
        data: { userdata: users }
      });
    });

    it('should bulk update users', async () => {
      const users = [
        { userkey: 'user1', email: 'updated1@test.com' },
        { userkey: 'user2', email: 'updated2@test.com' }
      ];

      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '0',
          result: {
            successrecords: 2,
            failedrecords: 0
          }
        }
      });

      const result = await client.bulkUpdateUsers(users);

      expect(result.successrecords).toBe(2);
      expect(result.failedrecords).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle API errors with retry logic', async () => {
      const error = new Error('API Error');
      mockRequest
        .mockRejectedValueOnce(error)
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce({
          data: {
            errorCode: '0',
            result: [{ userkey: 'user123' }]
          }
        });

      // The client should retry and eventually succeed
      const result = await client.getUser('testuser');

      expect(result).toBeDefined();
      expect(mockRequest).toHaveBeenCalledTimes(3);
    });

    it('should handle Saviynt error responses', async () => {
      mockRequest.mockResolvedValueOnce({
        data: {
          errorCode: '500',
          msg: 'Internal server error'
        }
      });

      await expect(client.getUser('testuser')).rejects.toThrow('Saviynt API Error: 500 - Internal server error');
    });

    it('should handle network timeouts', async () => {
      mockRequest.mockRejectedValueOnce(new Error('Network timeout'));

      await expect(client.getUser('testuser')).rejects.toThrow();
    });
  });

  describe('Configuration Management', () => {
    it('should return client configuration', () => {
      const config = client.getConfig();

      expect(config).toHaveProperty('baseUrl');
      expect(config).toHaveProperty('timeout');
      expect(config).toHaveProperty('retryAttempts');
    });

    it('should clear authentication', () => {
      client.clearAuth();

      const authStatus = client.getAuthStatus();
      expect(authStatus.authenticated).toBe(false);
    });
  });
});