/**
 * Unit Tests for Database Module
 * Tests database connection configuration, pool settings, and environment-specific behavior
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock PrismaClient before importing the database module
const mockPrismaClient = {
  $disconnect: vi.fn().mockResolvedValue(undefined)
};

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient)
}));

// Mock console.log to capture database initialization logs
global.console.log = vi.fn();

describe('Database Module', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear relevant environment variables
    delete process.env.DATABASE_URL;
    delete process.env.NODE_ENV;
    delete process.env.DB_CONNECTION_LIMIT;

    // Clear global prisma instance
    delete (global as any).__prisma;

    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  describe('Database URL Configuration', () => {
    it('should throw error when DATABASE_URL is not set', async () => {
      // Import after clearing DATABASE_URL
      await expect(async () => {
        await import('../../lib/database');
      }).rejects.toThrow('DATABASE_URL environment variable is not set');
    });

    it('should configure production connection pool settings', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';
      process.env.DB_CONNECTION_LIMIT = '200';

      // Import database module
      const database = await import('../../lib/database');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Database] Initializing connection pool (production): limit=200, pool_timeout=30s, connect_timeout=10s')
      );
    });

    it('should configure test connection pool settings', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/test_db';
      process.env.NODE_ENV = 'test';

      // Import database module
      const database = await import('../../lib/database');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Database] Initializing connection pool (test): limit=100, pool_timeout=30s, connect_timeout=15s')
      );
    });

    it('should configure development connection pool settings', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/dev_db';
      process.env.NODE_ENV = 'development';

      // Import database module
      const database = await import('../../lib/database');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Database] Initializing connection pool (development): limit=15, pool_timeout=10s, connect_timeout=5s')
      );
    });

    it('should use default connection pool settings for unknown environment', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'unknown';

      // Import database module
      const database = await import('../../lib/database');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Database] Initializing connection pool (unknown): limit=10, pool_timeout=10s, connect_timeout=10s')
      );
    });

    it('should use custom DB_CONNECTION_LIMIT when provided', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';
      process.env.DB_CONNECTION_LIMIT = '300';

      // Import database module
      const database = await import('../../lib/database');

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('limit=300')
      );
    });

    it('should handle DATABASE_URL with existing query parameters', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?sslmode=require&application_name=mes';
      process.env.NODE_ENV = 'test';

      // Import database module
      const database = await import('../../lib/database');

      // Should still add connection pool parameters
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[Database] Initializing connection pool (test)')
      );
    });
  });

  describe('PrismaClient Configuration', () => {
    it('should create PrismaClient with correct datasource URL', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'test';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          datasources: {
            db: {
              url: expect.stringContaining('postgresql://user:pass@localhost:5432/db')
            }
          }
        })
      );
    });

    it('should configure production logging (warn, error only)', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          log: ['warn', 'error']
        })
      );
    });

    it('should configure test logging (error only)', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'test';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          log: ['error']
        })
      );
    });

    it('should configure development logging (full logging)', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'development';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      expect(PrismaClient).toHaveBeenCalledWith(
        expect.objectContaining({
          log: ['query', 'info', 'warn', 'error']
        })
      );
    });
  });

  describe('Singleton Pattern', () => {
    it('should create fresh instance in test mode', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'test';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module twice
      await import('../../lib/database');
      vi.resetModules();
      await import('../../lib/database');

      // Should create two instances (no singleton in test mode)
      expect(PrismaClient).toHaveBeenCalledTimes(2);
    });

    it('should use singleton pattern in development mode', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'development';

      // Clear global
      delete (global as any).__prisma;

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database1 = await import('../../lib/database');

      // Check that global instance was set
      expect((global as any).__prisma).toBeDefined();

      // Import again without resetting modules
      const database2 = await import('../../lib/database');

      // Should only create one instance due to singleton
      expect(PrismaClient).toHaveBeenCalledTimes(1);
    });

    it('should not set global instance in production mode', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';

      // Clear global
      delete (global as any).__prisma;

      // Import database module
      const database = await import('../../lib/database');

      // Should not set global instance in production
      expect((global as any).__prisma).toBeUndefined();
    });
  });

  describe('Database URL Parameter Handling', () => {
    it('should add connection pool parameters to URL', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';
      process.env.DB_CONNECTION_LIMIT = '150';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      // Check that PrismaClient was called with URL containing pool parameters
      const callArgs = (PrismaClient as any).mock.calls[0][0];
      const databaseUrl = callArgs.datasources.db.url;

      expect(databaseUrl).toContain('connection_limit=150');
      expect(databaseUrl).toContain('pool_timeout=30');
      expect(databaseUrl).toContain('connect_timeout=10');
    });

    it('should preserve existing URL parameters', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db?sslmode=require&application_name=mes';
      process.env.NODE_ENV = 'development';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      const callArgs = (PrismaClient as any).mock.calls[0][0];
      const databaseUrl = callArgs.datasources.db.url;

      // Should preserve original parameters
      expect(databaseUrl).toContain('sslmode=require');
      expect(databaseUrl).toContain('application_name=mes');

      // Should add new pool parameters
      expect(databaseUrl).toContain('connection_limit=15');
      expect(databaseUrl).toContain('pool_timeout=10');
      expect(databaseUrl).toContain('connect_timeout=5');
    });
  });

  describe('Environment-specific Connection Limits', () => {
    const testCases = [
      {
        env: 'production',
        defaultLimit: 150,
        poolTimeout: 30,
        connectTimeout: 10
      },
      {
        env: 'test',
        defaultLimit: 100,
        poolTimeout: 30,
        connectTimeout: 15
      },
      {
        env: 'development',
        defaultLimit: 15,
        poolTimeout: 10,
        connectTimeout: 5
      }
    ];

    testCases.forEach(({ env, defaultLimit, poolTimeout, connectTimeout }) => {
      it(`should use correct defaults for ${env} environment`, async () => {
        process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
        process.env.NODE_ENV = env;

        const { PrismaClient } = await import('@prisma/client');

        // Import database module
        const database = await import('../../lib/database');

        const callArgs = (PrismaClient as any).mock.calls[0][0];
        const databaseUrl = callArgs.datasources.db.url;

        expect(databaseUrl).toContain(`connection_limit=${defaultLimit}`);
        expect(databaseUrl).toContain(`pool_timeout=${poolTimeout}`);
        expect(databaseUrl).toContain(`connect_timeout=${connectTimeout}`);
      });
    });
  });

  describe('Process Event Handlers', () => {
    it('should register beforeExit handler for graceful shutdown', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'test';

      const originalOn = process.on;
      const mockOn = vi.fn();
      process.on = mockOn;

      try {
        // Import database module
        const database = await import('../../lib/database');

        expect(mockOn).toHaveBeenCalledWith('beforeExit', expect.any(Function));
      } finally {
        process.on = originalOn;
      }
    });

    it('should call $disconnect on beforeExit', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'test';

      const beforeExitHandlers: Array<() => Promise<void>> = [];
      const originalOn = process.on;
      process.on = vi.fn((event: string, handler: any) => {
        if (event === 'beforeExit') {
          beforeExitHandlers.push(handler);
        }
        return process;
      });

      try {
        // Import database module
        const database = await import('../../lib/database');

        // Simulate beforeExit event
        for (const handler of beforeExitHandlers) {
          await handler();
        }

        expect(mockPrismaClient.$disconnect).toHaveBeenCalled();
      } finally {
        process.on = originalOn;
      }
    });
  });

  describe('Module Exports', () => {
    it('should export prisma instance', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'test';

      const database = await import('../../lib/database');

      expect(database.prisma).toBeDefined();
      expect(database.default).toBeDefined();
      expect(database.prisma).toBe(database.default);
    });
  });

  describe('Invalid Environment Configuration', () => {
    it('should handle invalid DB_CONNECTION_LIMIT values', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';
      process.env.DB_CONNECTION_LIMIT = 'invalid';

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      // Should fall back to default when parseInt returns NaN
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('limit=150') // Default production limit
      );
    });

    it('should handle missing DB_CONNECTION_LIMIT gracefully', async () => {
      process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/db';
      process.env.NODE_ENV = 'production';
      // Don't set DB_CONNECTION_LIMIT

      const { PrismaClient } = await import('@prisma/client');

      // Import database module
      const database = await import('../../lib/database');

      // Should use default
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('limit=150')
      );
    });
  });
});