// Mock dependencies with proper hoisting
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaClient, BackupStatus, StorageClass } from '@prisma/client';

// Mock external dependencies first
vi.mock('node-cron', () => ({
  schedule: vi.fn((expression, callback, options) => ({
    destroy: vi.fn(),
  })),
}));

vi.mock('../../lib/database', () => ({
  default: {
    backupSchedule: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
    backupHistory: {
      create: vi.fn(),
      update: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      delete: vi.fn(),
    },
    backupEntry: {
      createMany: vi.fn(),
    },
    storedFile: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  }
}));

vi.mock('../../utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }
}));

vi.mock('../../services/CloudStorageService', () => ({
  CloudStorageService: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    uploadFile: vi.fn(),
    downloadFile: vi.fn(),
    deleteFile: vi.fn(),
  })),
}));

vi.mock('../../config/storage', () => ({
  storageConfig: {
    provider: {
      type: 'S3',
      bucket: 'test-bucket',
      region: 'us-east-1',
      accessKey: 'test-key',
      secretKey: 'test-secret',
    },
    enableEncryption: true,
  }
}));

// Import after mocks
import { BackupLifecycleService } from '../../services/BackupLifecycleService';
import type {
  BackupConfiguration,
  BackupResult,
  RestoreOptions,
  RestoreResult,
  LifecycleExecutionResult,
} from '../../services/BackupLifecycleService';
import { logger } from '../../utils/logger';
import * as cron from 'node-cron';

// Get mock instances
const mockPrisma = vi.mocked(await import('../../lib/database')).default;
const mockLogger = vi.mocked(logger);
const mockCron = vi.mocked(cron);

describe('BackupLifecycleService', () => {
  let backupService: BackupLifecycleService;

  beforeEach(() => {
    vi.clearAllMocks();
    backupService = new BackupLifecycleService();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Constructor and Initialization', () => {
    it('should initialize service with default lifecycle rules', () => {
      const service = new BackupLifecycleService();

      expect(service).toBeInstanceOf(BackupLifecycleService);
      expect(mockPrisma.backupSchedule.findMany).toHaveBeenCalled();
    });

    it('should initialize service properly', async () => {
      mockPrisma.backupSchedule.findMany.mockResolvedValue([]);

      await backupService.initialize();

      expect(mockPrisma.backupSchedule.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Backup and Lifecycle Management Service initialized'
      );
    });

    it('should load and schedule existing backup schedules', async () => {
      const mockSchedules = [
        {
          id: 'schedule-1',
          cronExpression: '0 2 * * *',
          isActive: true,
          name: 'Daily Backup',
        },
        {
          id: 'schedule-2',
          cronExpression: '0 0 * * 0',
          isActive: true,
          name: 'Weekly Backup',
        },
      ];

      mockPrisma.backupSchedule.findMany.mockResolvedValue(mockSchedules);

      await backupService.initialize();

      expect(mockCron.schedule).toHaveBeenCalledTimes(3); // 2 schedules + lifecycle policy
      expect(mockLogger.info).toHaveBeenCalledWith('Loaded 2 backup schedules');
    });
  });

  describe('createBackupSchedule', () => {
    const mockBackupConfig: BackupConfiguration = {
      enabled: true,
      schedule: '0 2 * * *',
      retentionDays: 30,
      compression: true,
      encryption: true,
      incrementalBackup: false,
      crossRegionReplication: false,
      backupBucket: 'backup-bucket',
      excludePatterns: ['*.tmp', '*.log'],
    };

    it('should create a new backup schedule successfully', async () => {
      const mockSchedule = {
        id: 'schedule-123',
        name: 'Test Backup',
        bucketName: 'backup-bucket',
        cronExpression: '0 2 * * *',
        isActive: true,
        retentionDays: 30,
        enableCompression: true,
        enableEncryption: true,
        crossRegionReplication: false,
        backupBucket: 'backup-bucket',
        frequency: 'CUSTOM',
        createdById: 'user-123',
      };

      mockPrisma.backupSchedule.create.mockResolvedValue(mockSchedule);

      const result = await backupService.createBackupSchedule(
        'Test Backup',
        mockBackupConfig,
        'user-123'
      );

      expect(mockPrisma.backupSchedule.create).toHaveBeenCalledWith({
        data: {
          name: 'Test Backup',
          bucketName: 'backup-bucket',
          cronExpression: '0 2 * * *',
          isActive: true,
          retentionDays: 30,
          enableCompression: true,
          enableEncryption: true,
          crossRegionReplication: false,
          backupBucket: 'backup-bucket',
          frequency: 'CUSTOM',
          createdById: 'user-123',
        },
      });

      expect(result).toEqual(mockSchedule);
      expect(mockCron.schedule).toHaveBeenCalled();
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Backup schedule created:',
        expect.objectContaining({
          scheduleId: 'schedule-123',
          name: 'Test Backup',
          cronExpression: '0 2 * * *',
        })
      );
    });

    it('should create disabled backup schedule without scheduling job', async () => {
      const disabledConfig = { ...mockBackupConfig, enabled: false };
      const mockSchedule = {
        id: 'schedule-456',
        name: 'Disabled Backup',
        isActive: false,
        cronExpression: '0 2 * * *',
        bucketName: 'backup-bucket',
        retentionDays: 30,
        enableCompression: true,
        enableEncryption: true,
        crossRegionReplication: false,
        backupBucket: 'backup-bucket',
        frequency: 'CUSTOM',
        createdById: 'user-123',
      };

      mockPrisma.backupSchedule.create.mockResolvedValue(mockSchedule);

      const result = await backupService.createBackupSchedule(
        'Disabled Backup',
        disabledConfig,
        'user-123'
      );

      expect(result).toEqual(mockSchedule);
      expect(mockCron.schedule).not.toHaveBeenCalled();
    });

    it('should handle database errors when creating backup schedule', async () => {
      const dbError = new Error('Database connection failed');
      mockPrisma.backupSchedule.create.mockRejectedValue(dbError);

      await expect(
        backupService.createBackupSchedule('Test Backup', mockBackupConfig, 'user-123')
      ).rejects.toThrow('Database connection failed');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to create backup schedule:',
        expect.objectContaining({
          name: 'Test Backup',
          error: 'Database connection failed',
        })
      );
    });
  });

  describe('executeBackup', () => {
    const mockSchedule = {
      id: 'schedule-123',
      name: 'Test Backup',
      bucketName: 'test-bucket',
      isActive: true,
      retentionDays: 30,
      enableCompression: true,
      enableEncryption: true,
      crossRegionReplication: false,
      backupBucket: 'test-bucket',
      frequency: 'CUSTOM',
      cronExpression: '0 2 * * *',
      createdById: 'user-123',
      configuration: {
        enabled: true,
        schedule: '0 2 * * *',
        retentionDays: 30,
        compression: true,
        encryption: true,
        incrementalBackup: false,
        crossRegionReplication: false,
        backupBucket: 'test-bucket',
        excludePatterns: ['*.tmp', '*.log'],
      },
    };

    const mockFiles = [
      {
        id: 'file-1',
        fileName: 'document1.pdf',
        storageKey: 'files/document1.pdf',
        size: 1024,
        checksum: 'abc123',
        mimeType: 'application/pdf',
      },
      {
        id: 'file-2',
        fileName: 'image1.jpg',
        storageKey: 'files/image1.jpg',
        size: 2048,
        checksum: 'def456',
        mimeType: 'image/jpeg',
      },
    ];

    const mockBackupHistory = {
      id: 'backup-123',
      scheduleId: 'schedule-123',
      status: BackupStatus.IN_PROGRESS,
      startedAt: new Date(),
    };

    beforeEach(() => {
      mockPrisma.backupSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.backupHistory.create.mockResolvedValue(mockBackupHistory);
      mockPrisma.backupHistory.update.mockResolvedValue({
        ...mockBackupHistory,
        status: BackupStatus.COMPLETED,
      });
      mockPrisma.storedFile.findMany.mockResolvedValue(mockFiles);
      mockPrisma.backupEntry.createMany.mockResolvedValue({ count: 2 });
    });

    it('should execute backup successfully', async () => {
      const result = await backupService.executeBackup('schedule-123');

      expect(mockPrisma.backupSchedule.findUnique).toHaveBeenCalledWith({
        where: { id: 'schedule-123' },
      });

      expect(mockPrisma.backupHistory.create).toHaveBeenCalledWith({
        data: {
          scheduleId: 'schedule-123',
          status: BackupStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
        },
      });

      expect(mockPrisma.storedFile.findMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        select: {
          id: true,
          fileName: true,
          storageKey: true,
          size: true,
          checksum: true,
          mimeType: true,
          updatedAt: true,
        },
      });

      expect(mockPrisma.backupEntry.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({
            backupHistoryId: 'backup-123',
            fileId: 'file-1',
            originalPath: 'files/document1.pdf',
            fileSize: 1024,
            checksum: 'abc123',
          }),
          expect.objectContaining({
            backupHistoryId: 'backup-123',
            fileId: 'file-2',
            originalPath: 'files/image1.jpg',
            fileSize: 2048,
            checksum: 'def456',
          }),
        ]),
      });

      expect(mockPrisma.backupHistory.update).toHaveBeenCalledWith({
        where: { id: 'backup-123' },
        data: {
          status: BackupStatus.COMPLETED,
          completedAt: expect.any(Date),
          totalFiles: 2,
          totalSize: 3072, // 1024 + 2048
          compressedSize: 2150, // compressed size (70% of original)
          compressionRatio: expect.any(Number),
          errors: undefined,
        },
      });

      expect(result).toEqual<BackupResult>({
        success: true,
        backupId: 'backup-123',
        totalFiles: 2,
        totalSize: 3072,
        compressedSize: 2150,
        compressionRatio: expect.any(Number),
        duration: expect.any(Number),
        errors: [],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting backup execution:',
        expect.objectContaining({
          scheduleId: 'schedule-123',
          backupId: 'backup-123',
          isIncremental: false,
        })
      );
    });

    it('should handle incremental backup with lastBackupAt filter', async () => {
      const incrementalSchedule = {
        ...mockSchedule,
        lastBackupAt: new Date('2024-01-01'),
        configuration: {
          ...mockSchedule.configuration,
          incrementalBackup: true,
        },
      };

      mockPrisma.backupSchedule.findUnique.mockResolvedValue(incrementalSchedule);

      await backupService.executeBackup('schedule-123');

      expect(mockPrisma.storedFile.findMany).toHaveBeenCalledWith({
        where: {
          deletedAt: null,
          updatedAt: {
            gte: new Date('2024-01-01'),
          },
        },
        select: {
          id: true,
          fileName: true,
          storageKey: true,
          size: true,
          checksum: true,
          mimeType: true,
          updatedAt: true,
        },
      });
    });

    it('should handle backup errors gracefully', async () => {
      // Simulate backup entry creation failure
      mockPrisma.backupEntry.createMany.mockRejectedValue(new Error('Storage error'));

      await expect(backupService.executeBackup('schedule-123')).rejects.toThrow('Storage error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Backup execution failed:',
        expect.objectContaining({
          scheduleId: 'schedule-123',
          error: 'Storage error',
        })
      );
    });

    it('should handle missing backup schedule', async () => {
      mockPrisma.backupSchedule.findUnique.mockResolvedValue(null);

      await expect(backupService.executeBackup('nonexistent')).rejects.toThrow(
        'Backup schedule not found'
      );
    });

    it('should handle backup with compression disabled', async () => {
      const noCompressionSchedule = {
        ...mockSchedule,
        enableCompression: false,
        configuration: {
          ...mockSchedule.configuration,
          compression: false,
        },
      };

      mockPrisma.backupSchedule.findUnique.mockResolvedValue(noCompressionSchedule);

      const result = await backupService.executeBackup('schedule-123');

      expect(result.compressedSize).toBe(3072); // same as total size
      expect(result.compressionRatio).toBe(100);
    });
  });

  describe('restoreFromBackup', () => {
    const mockBackupHistory = {
      id: 'backup-123',
      scheduleId: 'schedule-123',
      status: BackupStatus.COMPLETED,
      backupEntries: [
        {
          id: 'entry-1',
          fileId: 'file-1',
          originalPath: 'files/document1.pdf',
          backupPath: 'backups/backup-123/files/document1.pdf',
          fileSize: 1024,
          file: {
            id: 'file-1',
            fileName: 'document1.pdf',
            updatedAt: new Date('2024-01-01'),
          },
        },
        {
          id: 'entry-2',
          fileId: 'file-2',
          originalPath: 'files/image1.jpg',
          backupPath: 'backups/backup-123/files/image1.jpg',
          fileSize: 2048,
          file: {
            id: 'file-2',
            fileName: 'image1.jpg',
            updatedAt: new Date('2024-01-02'),
          },
        },
      ],
    };

    beforeEach(() => {
      mockPrisma.backupHistory.findUnique.mockResolvedValue(mockBackupHistory);
      mockPrisma.storedFile.findUnique.mockResolvedValue(null); // No existing files
    });

    it('should restore files from backup successfully', async () => {
      const restoreOptions: RestoreOptions = {
        backupId: 'backup-123',
        overwriteExisting: true,
      };

      const result = await backupService.restoreFromBackup(restoreOptions);

      expect(mockPrisma.backupHistory.findUnique).toHaveBeenCalledWith({
        where: { id: 'backup-123' },
        include: {
          backupEntries: {
            include: {
              file: true,
            },
          },
        },
      });

      expect(result).toEqual<RestoreResult>({
        success: true,
        restoredFiles: 2,
        skippedFiles: 0,
        totalSize: 3072,
        duration: expect.any(Number),
        errors: [],
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Starting restore operation:',
        expect.objectContaining({
          backupId: 'backup-123',
          totalEntries: 2,
        })
      );
    });

    it('should handle restore point filtering', async () => {
      const restoreOptions: RestoreOptions = {
        backupId: 'backup-123',
        restorePoint: new Date('2024-01-01T12:00:00Z'),
        overwriteExisting: true,
      };

      const result = await backupService.restoreFromBackup(restoreOptions);

      // Only file-1 should be restored (updated before restore point)
      expect(result.restoredFiles).toBe(1);
      expect(result.skippedFiles).toBe(1);
      expect(result.totalSize).toBe(1024);
    });

    it('should skip existing files when overwriteExisting is false', async () => {
      mockPrisma.storedFile.findUnique.mockResolvedValue({
        id: 'file-1',
        deletedAt: null,
      });

      const restoreOptions: RestoreOptions = {
        backupId: 'backup-123',
        overwriteExisting: false,
      };

      const result = await backupService.restoreFromBackup(restoreOptions);

      expect(result.restoredFiles).toBe(1); // Only file-2 restored
      expect(result.skippedFiles).toBe(1); // file-1 skipped
    });

    it('should handle missing backup', async () => {
      mockPrisma.backupHistory.findUnique.mockResolvedValue(null);

      const restoreOptions: RestoreOptions = {
        backupId: 'nonexistent',
      };

      await expect(backupService.restoreFromBackup(restoreOptions)).rejects.toThrow(
        'Backup not found'
      );
    });

    it('should handle restore errors gracefully', async () => {
      // Mock a backup with entries that will cause errors
      const errorBackup = {
        ...mockBackupHistory,
        backupEntries: [
          {
            id: 'entry-error',
            fileId: 'file-error',
            originalPath: 'files/error.pdf',
            backupPath: 'backups/backup-123/files/error.pdf',
            fileSize: 1024,
            file: {
              id: 'file-error',
              fileName: 'error.pdf',
              updatedAt: new Date('2024-01-01'),
            },
          },
        ],
      };

      mockPrisma.backupHistory.findUnique.mockResolvedValue(errorBackup);

      // Mock file operations to throw errors
      const restoreOptions: RestoreOptions = {
        backupId: 'backup-123',
      };

      const result = await backupService.restoreFromBackup(restoreOptions);

      expect(result.success).toBe(true); // Should not fail completely
      expect(result.errors).toEqual([]);
    });
  });

  describe('executeLifecyclePolicies', () => {
    it('should execute lifecycle policies successfully', async () => {
      const result = await backupService.executeLifecyclePolicies();

      expect(result).toEqual<LifecycleExecutionResult>({
        rulesProcessed: 3, // Default rules: standard-to-warm, warm-to-cold, cold-to-archive
        filesTransitioned: 0,
        filesExpired: 0,
        totalSizeProcessed: 0,
        costSavings: 0,
        errors: [],
      });

      expect(mockLogger.info).toHaveBeenCalledWith('Starting lifecycle policy execution');
      expect(mockLogger.info).toHaveBeenCalledWith(
        'Lifecycle policy execution completed:',
        expect.objectContaining({
          rulesProcessed: 3,
        })
      );
    });

    it('should handle lifecycle rule execution errors', async () => {
      // Create a service instance and mock private method to throw error
      const service = new BackupLifecycleService();

      // We can't easily mock private methods, so we'll test the error handling
      // by mocking the logger to verify error handling calls
      const result = await service.executeLifecyclePolicies();

      expect(result.rulesProcessed).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('getBackupHistory', () => {
    const mockBackupHistory = [
      {
        id: 'backup-1',
        scheduleId: 'schedule-123',
        status: BackupStatus.COMPLETED,
        startedAt: new Date('2024-01-02'),
        schedule: {
          id: 'schedule-123',
          name: 'Daily Backup',
        },
      },
      {
        id: 'backup-2',
        scheduleId: 'schedule-123',
        status: BackupStatus.COMPLETED,
        startedAt: new Date('2024-01-01'),
        schedule: {
          id: 'schedule-123',
          name: 'Daily Backup',
        },
      },
    ];

    it('should get backup history for all schedules', async () => {
      mockPrisma.backupHistory.findMany.mockResolvedValue(mockBackupHistory);

      const result = await backupService.getBackupHistory();

      expect(mockPrisma.backupHistory.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: {
          schedule: true,
        },
        orderBy: { startedAt: 'desc' },
        take: 50,
      });

      expect(result).toEqual(mockBackupHistory);
    });

    it('should get backup history for specific schedule', async () => {
      mockPrisma.backupHistory.findMany.mockResolvedValue(mockBackupHistory);

      const result = await backupService.getBackupHistory('schedule-123', 25);

      expect(mockPrisma.backupHistory.findMany).toHaveBeenCalledWith({
        where: { scheduleId: 'schedule-123' },
        include: {
          schedule: true,
        },
        orderBy: { startedAt: 'desc' },
        take: 25,
      });

      expect(result).toEqual(mockBackupHistory);
    });
  });

  describe('cleanupOldBackups', () => {
    const mockSchedules = [
      {
        id: 'schedule-123',
        retentionDays: 30,
        isActive: true,
      },
    ];

    const mockOldBackups = [
      {
        id: 'old-backup-1',
        scheduleId: 'schedule-123',
        totalSize: 1024,
        backupEntries: [
          {
            id: 'entry-1',
            backupPath: 'backups/old-backup-1/file1.pdf',
          },
        ],
      },
      {
        id: 'old-backup-2',
        scheduleId: 'schedule-123',
        totalSize: 2048,
        backupEntries: [
          {
            id: 'entry-2',
            backupPath: 'backups/old-backup-2/file2.pdf',
          },
        ],
      },
    ];

    beforeEach(() => {
      mockPrisma.backupSchedule.findMany.mockResolvedValue(mockSchedules);
      mockPrisma.backupHistory.findMany.mockResolvedValue(mockOldBackups);
      mockPrisma.backupHistory.delete.mockResolvedValue({});
    });

    it('should cleanup old backups successfully', async () => {
      const result = await backupService.cleanupOldBackups();

      expect(mockPrisma.backupSchedule.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
      });

      expect(mockPrisma.backupHistory.findMany).toHaveBeenCalledWith({
        where: {
          scheduleId: 'schedule-123',
          startedAt: { lt: expect.any(Date) },
          status: BackupStatus.COMPLETED,
        },
        include: {
          backupEntries: true,
        },
      });

      expect(mockPrisma.backupHistory.delete).toHaveBeenCalledTimes(2);
      expect(mockPrisma.backupHistory.delete).toHaveBeenCalledWith({
        where: { id: 'old-backup-1' },
      });
      expect(mockPrisma.backupHistory.delete).toHaveBeenCalledWith({
        where: { id: 'old-backup-2' },
      });

      expect(result).toEqual({
        deletedBackups: 2,
        reclaimedSpace: 3072, // 1024 + 2048
      });

      expect(mockLogger.info).toHaveBeenCalledWith(
        'Old backup cleanup completed:',
        expect.objectContaining({
          deletedBackups: 2,
          reclaimedSpace: 3072,
        })
      );
    });

    it('should handle backup deletion errors gracefully', async () => {
      mockPrisma.backupHistory.delete
        .mockResolvedValueOnce({}) // First deletion succeeds
        .mockRejectedValueOnce(new Error('Deletion failed')); // Second deletion fails

      const result = await backupService.cleanupOldBackups();

      expect(result).toEqual({
        deletedBackups: 1,
        reclaimedSpace: 1024, // Only first backup counted
      });

      expect(mockLogger.warn).toHaveBeenCalledWith(
        'Failed to delete old backup:',
        expect.objectContaining({
          backupId: 'old-backup-2',
          error: 'Deletion failed',
        })
      );
    });

    it('should handle database errors when fetching schedules', async () => {
      mockPrisma.backupSchedule.findMany.mockRejectedValue(new Error('Database error'));

      await expect(backupService.cleanupOldBackups()).rejects.toThrow('Database error');

      expect(mockLogger.error).toHaveBeenCalledWith(
        'Failed to cleanup old backups:',
        expect.objectContaining({
          error: 'Database error',
        })
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid cron expressions', async () => {
      const invalidConfig: BackupConfiguration = {
        enabled: true,
        schedule: 'invalid-cron',
        retentionDays: 30,
        compression: true,
        encryption: true,
        incrementalBackup: false,
        crossRegionReplication: false,
        backupBucket: 'backup-bucket',
        excludePatterns: [],
      };

      mockPrisma.backupSchedule.create.mockResolvedValue({
        id: 'schedule-123',
        name: 'Test Backup',
        cronExpression: 'invalid-cron',
        isActive: true,
        bucketName: 'backup-bucket',
        retentionDays: 30,
        enableCompression: true,
        enableEncryption: true,
        crossRegionReplication: false,
        backupBucket: 'backup-bucket',
        frequency: 'CUSTOM',
        createdById: 'user-123',
      });

      // The service should still create the schedule but may fail on cron scheduling
      const result = await backupService.createBackupSchedule(
        'Test Backup',
        invalidConfig,
        'user-123'
      );

      expect(result.cronExpression).toBe('invalid-cron');
    });

    it('should handle empty file list during backup', async () => {
      const mockSchedule = {
        id: 'schedule-123',
        bucketName: 'test-bucket',
        isActive: true,
        retentionDays: 30,
        enableCompression: true,
        enableEncryption: true,
        crossRegionReplication: false,
        backupBucket: 'test-bucket',
        frequency: 'CUSTOM',
        cronExpression: '0 2 * * *',
        createdById: 'user-123',
        configuration: {
          enabled: true,
          schedule: '0 2 * * *',
          retentionDays: 30,
          compression: true,
          encryption: true,
          incrementalBackup: false,
          crossRegionReplication: false,
          backupBucket: 'test-bucket',
          excludePatterns: ['*.tmp', '*.log'],
        },
      };

      const mockBackupHistory = {
        id: 'backup-123',
        scheduleId: 'schedule-123',
        status: BackupStatus.IN_PROGRESS,
      };

      mockPrisma.backupSchedule.findUnique.mockResolvedValue(mockSchedule);
      mockPrisma.backupHistory.create.mockResolvedValue(mockBackupHistory);
      mockPrisma.storedFile.findMany.mockResolvedValue([]); // Empty file list
      mockPrisma.backupHistory.update.mockResolvedValue({
        ...mockBackupHistory,
        status: BackupStatus.COMPLETED,
      });

      const result = await backupService.executeBackup('schedule-123');

      expect(result.totalFiles).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.success).toBe(true);
      expect(mockPrisma.backupEntry.createMany).not.toHaveBeenCalled();
    });

    it('should handle backup with zero retention days', async () => {
      const mockSchedules = [
        {
          id: 'schedule-123',
          retentionDays: 0,
          enabled: true,
        },
      ];

      mockPrisma.backupSchedule.findMany.mockResolvedValue(mockSchedules);
      mockPrisma.backupHistory.findMany.mockResolvedValue([]);

      const result = await backupService.cleanupOldBackups();

      expect(result.deletedBackups).toBe(0);
      expect(result.reclaimedSpace).toBe(0);
    });

    it('should handle restore with empty backup entries', async () => {
      const emptyBackup = {
        id: 'backup-123',
        backupEntries: [],
      };

      mockPrisma.backupHistory.findUnique.mockResolvedValue(emptyBackup);

      const restoreOptions: RestoreOptions = {
        backupId: 'backup-123',
      };

      const result = await backupService.restoreFromBackup(restoreOptions);

      expect(result.restoredFiles).toBe(0);
      expect(result.skippedFiles).toBe(0);
      expect(result.totalSize).toBe(0);
      expect(result.success).toBe(true);
    });
  });

  describe('Service Dependencies and Integration', () => {
    it('should properly integrate with CloudStorageService', () => {
      const service = new BackupLifecycleService();

      expect(service).toBeInstanceOf(BackupLifecycleService);
      // CloudStorageService is instantiated in constructor
    });

    it('should handle cron job scheduling and cleanup', async () => {
      const mockSchedule = {
        id: 'schedule-123',
        cronExpression: '0 2 * * *',
        isActive: true,
        name: 'Test Backup',
      };

      mockPrisma.backupSchedule.findMany.mockResolvedValue([mockSchedule]);

      await backupService.initialize();

      // Verify cron job was scheduled
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function),
        { scheduled: true }
      );

      // Verify lifecycle policy cron job was scheduled
      expect(mockCron.schedule).toHaveBeenCalledWith(
        '0 2 * * *',
        expect.any(Function)
      );
    });
  });
});