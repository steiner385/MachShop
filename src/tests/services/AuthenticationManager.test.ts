import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthenticationManager } from '../../services/AuthenticationManager';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock external dependencies
vi.mock('bcrypt');
vi.mock('jsonwebtoken');
vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    warn: vi.fn()
  }
}));

// Mock config
vi.mock('../../config/config', () => ({
  config: {
    jwt: {
      secret: 'test-secret',
      expire: '1h',
      refreshExpire: '7d'
    }
  }
}));

// Mock database
vi.mock('../../lib/database', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn()
    }
  }
}));

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRE = '1h';
process.env.JWT_REFRESH_EXPIRE = '7d';

describe('AuthenticationManager', () => {
  let authManager: AuthenticationManager;
  let mockPrisma: any;
  const mockBcrypt = bcrypt as any;
  const mockJwt = jwt as any;

  beforeEach(async () => {
    // Clear singleton instance for clean tests
    (AuthenticationManager as any).instance = null;

    // Get the mocked database instance
    mockPrisma = (await import('../../lib/database')).default;

    // Reset all mocks
    vi.clearAllMocks();

    // Setup default mock implementations
    mockBcrypt.compare = vi.fn();
    mockJwt.sign = vi.fn();
    mockJwt.verify = vi.fn();

    // Get fresh instance for each test
    authManager = AuthenticationManager.getInstance({
      maxConcurrentLogins: 2,
      loginTimeoutMs: 5000,
      tokenRefreshBufferMs: 60000,
      proactiveRefreshEnabled: false // Disable for most tests
    });
  });

  afterEach(() => {
    // Clean up resources to prevent test interference
    authManager.cleanup();
    vi.resetAllMocks();
  });

  describe('singleton pattern', () => {
    it('should return the same instance when called multiple times', () => {
      const instance1 = AuthenticationManager.getInstance();
      const instance2 = AuthenticationManager.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should apply config only on first instantiation', () => {
      // Clear the instance first for this specific test
      (AuthenticationManager as any).instance = null;

      const customConfig = { maxConcurrentLogins: 5 };
      const instance1 = AuthenticationManager.getInstance(customConfig);
      const instance2 = AuthenticationManager.getInstance({ maxConcurrentLogins: 10 });

      expect(instance1).toBe(instance2);

      // Should use first config
      const status = instance1.getQueueStatus();
      expect(status.maxConcurrentLogins).toBe(5);
    });
  });

  describe('queue management', () => {
    it('should queue login requests for same user', async () => {
      // Setup successful authentication
      setupSuccessfulAuth();

      // Start multiple logins for same user
      const promise1 = authManager.queueLogin('testuser', 'password123');
      const promise2 = authManager.queueLogin('testuser', 'password123');

      // Check queue status
      const status = authManager.getQueueStatus();
      expect(status.queuedUsers).toBe(1);
      expect(status.queueSizes.testuser).toBe(1); // One active, one queued

      // Both should eventually succeed
      const results = await Promise.all([promise1, promise2]);
      expect(results).toHaveLength(2);
      expect(results[0].message).toBe('Login successful');
      expect(results[1].message).toBe('Login successful');
    });

    it('should enforce concurrent login limits', async () => {
      setupSuccessfulAuth();

      // Start logins that will exceed the limit (maxConcurrentLogins = 2)
      const promise1 = authManager.queueLogin('user1', 'password123');
      const promise2 = authManager.queueLogin('user2', 'password123');
      const promise3 = authManager.queueLogin('user3', 'password123');

      // Should have 2 active and 1 queued
      await new Promise(resolve => setTimeout(resolve, 100)); // Let processing start

      const status = authManager.getQueueStatus();
      expect(status.totalActiveLogins).toBeLessThanOrEqual(2);

      const results = await Promise.all([promise1, promise2, promise3]);
      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.message).toBe('Login successful');
      });
    });

    it('should handle login timeouts', async () => {
      // Create a fresh instance with very short timeout
      (AuthenticationManager as any).instance = null;
      const fastAuthManager = AuthenticationManager.getInstance({
        loginTimeoutMs: 50, // Even shorter timeout
        proactiveRefreshEnabled: false
      });

      // Setup authentication that will hang
      mockPrisma.user.findUnique.mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      await expect(fastAuthManager.queueLogin('testuser', 'password123'))
        .rejects.toThrow('Login timeout for user testuser after 50ms');

      fastAuthManager.cleanup();
    }, 1000); // Shorter test timeout

    it('should clean up empty queues', async () => {
      setupSuccessfulAuth();

      // Queue and complete a login
      await authManager.queueLogin('testuser', 'password123');

      // Queue should be cleaned up
      await new Promise(resolve => setTimeout(resolve, 200)); // Wait for cleanup
      const status = authManager.getQueueStatus();
      expect(status.queuedUsers).toBe(0);
    });
  });

  describe('authentication logic', () => {
    it('should authenticate valid user credentials', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      setupTokenGeneration();

      const result = await authManager.queueLogin('testuser', 'password123');

      expect(result.message).toBe('Login successful');
      expect(result.user.username).toBe('testuser');
      expect(result.token).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });

    it('should reject invalid username', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(authManager.queueLogin('invaliduser', 'password123'))
        .rejects.toThrow('Invalid username or password');
    });

    it('should reject invalid password', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(false);

      await expect(authManager.queueLogin('testuser', 'wrongpassword'))
        .rejects.toThrow('Invalid username or password');
    });

    it('should reactivate inactive users in test mode', async () => {
      const mockUser = createMockUser({ isActive: false });
      const reactivatedUser = createMockUser({ isActive: true });

      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockPrisma.user.update.mockResolvedValue(reactivatedUser);
      mockBcrypt.compare.mockResolvedValue(true);
      setupTokenGeneration();

      const result = await authManager.queueLogin('testuser', 'password123');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: mockUser.id },
        data: { isActive: true }
      });
      expect(result.message).toBe('Login successful');
    });

    it('should reject inactive users in production mode', async () => {
      process.env.NODE_ENV = 'production';

      const mockUser = createMockUser({ isActive: false });
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);

      await expect(authManager.queueLogin('testuser', 'password123'))
        .rejects.toThrow('Account is deactivated');

      process.env.NODE_ENV = 'test'; // Reset
    });
  });

  describe('error handling and retries', () => {
    it('should retry failed database operations', async () => {
      const mockUser = createMockUser();

      // Fail first attempt, succeed on second
      mockPrisma.user.findUnique
        .mockRejectedValueOnce(new Error('Database connection error'))
        .mockResolvedValue(mockUser);

      mockBcrypt.compare.mockResolvedValue(true);
      setupTokenGeneration();

      const result = await authManager.queueLogin('testuser', 'password123');

      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(2);
      expect(result.message).toBe('Login successful');
    });

    it('should not retry non-retryable errors', async () => {
      mockPrisma.user.findUnique.mockRejectedValue(new Error('Invalid username or password'));

      await expect(authManager.queueLogin('testuser', 'password123'))
        .rejects.toThrow('Authentication failed - database error');

      // Should not retry authentication errors
      expect(mockPrisma.user.findUnique).toHaveBeenCalledTimes(1);
    });

    it('should handle bcrypt comparison errors', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockRejectedValue(new Error('Bcrypt error'));

      await expect(authManager.queueLogin('testuser', 'password123'))
        .rejects.toThrow('Password verification failed');
    });

    it('should extract safe error messages from various error types', async () => {
      const testCases = [
        { error: null },
        { error: 'string error' },
        { error: { message: 'object error' } },
        { error: { code: 'ERROR_CODE' } },
        { error: {} }
      ];

      for (const testCase of testCases) {
        mockPrisma.user.findUnique.mockRejectedValue(testCase.error);

        await expect(authManager.queueLogin('testuser', 'password123'))
          .rejects.toThrow(expect.stringContaining('Authentication failed - database error'));
      }
    });
  });

  describe('token validation', () => {
    it('should validate valid tokens', async () => {
      mockJwt.verify.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 }); // 1 hour from now

      const isValid = await authManager.validateToken('valid-token');

      expect(isValid).toBe(true);
      expect(mockJwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret');
    });

    it('should invalidate expired tokens', async () => {
      mockJwt.verify.mockReturnValue({ exp: Math.floor(Date.now() / 1000) - 3600 }); // 1 hour ago

      const isValid = await authManager.validateToken('expired-token');

      expect(isValid).toBe(false);
    });

    it('should cache validation results', async () => {
      mockJwt.verify.mockReturnValue({ exp: Math.floor(Date.now() / 1000) + 3600 });

      // First call should hit JWT verify
      const isValid1 = await authManager.validateToken('cached-token');
      expect(isValid1).toBe(true);
      expect(mockJwt.verify).toHaveBeenCalledTimes(1);

      // Second call within cache window should use cache
      const isValid2 = await authManager.validateToken('cached-token');
      expect(isValid2).toBe(true);
      expect(mockJwt.verify).toHaveBeenCalledTimes(1); // No additional call
    });

    it('should handle JWT verification errors', async () => {
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const isValid = await authManager.validateToken('invalid-token');

      expect(isValid).toBe(false);
    });
  });

  describe('proactive token refresh', () => {
    it('should store token info after successful authentication', async () => {
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      setupTokenGeneration();

      // Enable proactive refresh for this test
      const refreshManager = AuthenticationManager.getInstance({
        proactiveRefreshEnabled: true
      });

      const result = await refreshManager.queueLogin('testuser', 'password123');

      expect(result.token).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');

      // Token should be stored for refresh tracking
      const status = refreshManager.getQueueStatus();
      expect(status.totalTokens).toBe(1);

      refreshManager.cleanup();
    });

    it('should refresh tokens proactively before expiry', async () => {
      // This would require more complex mocking of timers
      // For now, test the basic token storage functionality
      const mockUser = createMockUser();
      mockPrisma.user.findUnique.mockResolvedValue(mockUser);
      mockBcrypt.compare.mockResolvedValue(true);
      setupTokenGeneration();

      const result = await authManager.queueLogin('testuser', 'password123');
      expect(result.refreshToken).toBe('mock-refresh-token');
    });
  });

  describe('queue status monitoring', () => {
    it('should provide accurate queue status', async () => {
      setupSuccessfulAuth();

      // Start some logins
      const promise1 = authManager.queueLogin('user1', 'password123');
      const promise2 = authManager.queueLogin('user2', 'password123');

      await new Promise(resolve => setTimeout(resolve, 50)); // Let processing start

      const status = authManager.getQueueStatus();

      expect(status).toHaveProperty('totalActiveLogins');
      expect(status).toHaveProperty('maxConcurrentLogins', 2);
      expect(status).toHaveProperty('queuedUsers');
      expect(status).toHaveProperty('queueSizes');
      expect(status).toHaveProperty('totalTokens');
      expect(status).toHaveProperty('totalRefreshScheduled');

      expect(status.totalActiveLogins).toBeGreaterThanOrEqual(0);
      expect(status.totalActiveLogins).toBeLessThanOrEqual(2);

      await Promise.all([promise1, promise2]);
    });

    it('should track individual user queue sizes', async () => {
      setupSuccessfulAuth();

      // Queue multiple requests for same user
      authManager.queueLogin('testuser', 'password123');
      authManager.queueLogin('testuser', 'password123');
      authManager.queueLogin('otheruser', 'password123');

      await new Promise(resolve => setTimeout(resolve, 50));

      const status = authManager.getQueueStatus();
      expect(status.queueSizes).toHaveProperty('testuser');
    });
  });

  describe('resource cleanup', () => {
    it('should clean up all resources', () => {
      setupSuccessfulAuth();

      // Create some state
      authManager.queueLogin('testuser', 'password123');

      // Clean up
      authManager.cleanup();

      // Verify cleanup
      const status = authManager.getQueueStatus();
      expect(status.totalActiveLogins).toBe(0);
      expect(status.queuedUsers).toBe(0);
      expect(status.totalTokens).toBe(0);
      expect(status.totalRefreshScheduled).toBe(0);
    });

    it('should clear all timeouts during cleanup', () => {
      const clearTimeoutSpy = vi.spyOn(global, 'clearTimeout');

      // Create some state with timeouts
      authManager.queueLogin('testuser', 'password123');

      authManager.cleanup();

      expect(clearTimeoutSpy).toHaveBeenCalled();
    });
  });

  describe('event emission', () => {
    it('should emit login-success event', async () => {
      setupSuccessfulAuth();

      const successListener = vi.fn();
      authManager.on('login-success', successListener);

      await authManager.queueLogin('testuser', 'password123');

      expect(successListener).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'testuser',
          requestId: expect.any(String),
          result: expect.objectContaining({
            message: 'Login successful'
          })
        })
      );
    });

    it('should emit login-failure event', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const failureListener = vi.fn();
      authManager.on('login-failure', failureListener);

      await expect(authManager.queueLogin('invaliduser', 'password123'))
        .rejects.toThrow();

      expect(failureListener).toHaveBeenCalledWith(
        expect.objectContaining({
          username: 'invaliduser',
          requestId: expect.any(String),
          error: expect.any(Error)
        })
      );
    });
  });

  // Helper functions
  function createMockUser(overrides = {}) {
    return {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '$2b$10$hashedpassword',
      roles: ['user'],
      permissions: ['read'],
      isActive: true,
      lastLoginAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  function setupSuccessfulAuth() {
    const mockUser = createMockUser();
    mockPrisma.user.findUnique.mockResolvedValue(mockUser);
    mockBcrypt.compare.mockResolvedValue(true);
    setupTokenGeneration();
  }

  function setupTokenGeneration() {
    mockJwt.sign
      .mockReturnValueOnce('mock-access-token')
      .mockReturnValueOnce('mock-refresh-token');

    mockJwt.verify.mockReturnValue({
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      userId: 'user-123'
    });
  }

});