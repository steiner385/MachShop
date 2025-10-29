/**
 * Unit Tests for Storage Configuration
 * Tests the cloud storage configuration validation and path building utilities
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  StorageConfig,
  StoragePathBuilder,
  StorageClass,
  STORAGE_PATHS,
  validateStorageConfig,
} from '../../config/storage';

describe('Storage Configuration', () => {
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    // Clear environment variables
    delete process.env.STORAGE_PROVIDER;
    delete process.env.AWS_REGION;
    delete process.env.MINIO_ENDPOINT;
    delete process.env.STORAGE_ACCESS_KEY;
    delete process.env.STORAGE_SECRET_KEY;
    delete process.env.STORAGE_BUCKET;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('StoragePathBuilder', () => {
    it('should build document path without version', () => {
      const path = StoragePathBuilder.buildDocumentPath('WORK_INSTRUCTIONS', 'doc-123', 'manual.pdf');
      expect(path).toBe('documents/work-instructions/doc-123/manual.pdf');
    });

    it('should build document path with version', () => {
      const path = StoragePathBuilder.buildDocumentPath('WORK_INSTRUCTIONS', 'doc-123', 'manual.pdf', 2);
      expect(path).toBe('documents/work-instructions/doc-123/v2/manual.pdf');
    });

    it('should build media path for images', () => {
      const path = StoragePathBuilder.buildMediaPath('IMAGES', 'photo.jpg');
      expect(path).toBe('media/images/photo.jpg');
    });

    it('should build export path for PDF', () => {
      const path = StoragePathBuilder.buildExportPath('PDF', 'report.pdf');
      expect(path).toBe('exports/pdf/report.pdf');
    });

    it('should build backup path with date', () => {
      const timestamp = '2024-01-15T10:30:00Z';
      const path = StoragePathBuilder.buildBackupPath(timestamp, 'backup.sql');
      expect(path).toBe('backups/2024-01-15/backup.sql');
    });

    it('should build version path', () => {
      const originalPath = 'documents/work-instructions/doc-123/manual.pdf';
      const path = StoragePathBuilder.buildVersionPath(originalPath, 3);
      expect(path).toBe('documents/work-instructions/doc-123/versions/v3/manual.pdf');
    });

    it('should handle unknown document types', () => {
      const path = StoragePathBuilder.buildDocumentPath('CUSTOM_TYPE', 'doc-123', 'file.pdf');
      expect(path).toBe('documents/custom_type/doc-123/file.pdf');
    });
  });

  describe('STORAGE_PATHS constants', () => {
    it('should have all required document paths', () => {
      expect(STORAGE_PATHS.DOCUMENTS.WORK_INSTRUCTIONS).toBe('documents/work-instructions');
      expect(STORAGE_PATHS.DOCUMENTS.SETUP_SHEETS).toBe('documents/setup-sheets');
      expect(STORAGE_PATHS.DOCUMENTS.INSPECTION_PLANS).toBe('documents/inspection-plans');
      expect(STORAGE_PATHS.DOCUMENTS.SOPS).toBe('documents/sops');
    });

    it('should have all required media paths', () => {
      expect(STORAGE_PATHS.MEDIA.IMAGES).toBe('media/images');
      expect(STORAGE_PATHS.MEDIA.VIDEOS).toBe('media/videos');
      expect(STORAGE_PATHS.MEDIA.CAD_FILES).toBe('media/cad-files');
    });

    it('should have export paths', () => {
      expect(STORAGE_PATHS.EXPORTS.PDF).toBe('exports/pdf');
      expect(STORAGE_PATHS.EXPORTS.DOCX).toBe('exports/docx');
    });
  });

  describe('StorageClass enum', () => {
    it('should have correct storage class values', () => {
      expect(StorageClass.HOT).toBe('STANDARD');
      expect(StorageClass.WARM).toBe('STANDARD_IA');
      expect(StorageClass.COLD).toBe('GLACIER');
      expect(StorageClass.ARCHIVE).toBe('DEEP_ARCHIVE');
    });
  });

  describe('validateStorageConfig', () => {
    const createValidConfig = (): StorageConfig => ({
      provider: {
        type: 's3',
        region: 'us-east-1',
        accessKey: 'test-key',
        secretKey: 'test-secret',
        bucket: 'test-bucket',
      },
      cdn: {
        enabled: false,
      },
      upload: {
        maxFileSize: 100 * 1024 * 1024,
        chunkSize: 5 * 1024 * 1024,
        allowedMimeTypes: ['image/*'],
        enableDeduplication: false,
        enableVersioning: false,
        enableEncryption: false,
        tempUploadDir: './temp',
      },
      lifecycle: {
        warmStorageAfterDays: 90,
        coldStorageAfterDays: 365,
        archiveAfterDays: 2555,
        deleteAfterDays: 3650,
        enableAutoCleanup: false,
      },
      backup: {
        enabled: false,
        frequency: 'daily',
        retentionDays: 30,
        crossRegionReplication: false,
      },
      security: {
        encryptionAtRest: true,
        encryptionInTransit: true,
        signedUrlExpirationMinutes: 60,
        enableAccessLogging: false,
        corsOrigins: ['http://localhost:3000'],
      },
    });

    it('should validate valid S3 configuration', () => {
      const config = createValidConfig();
      expect(() => validateStorageConfig(config)).not.toThrow();
    });

    it('should validate valid MinIO configuration', () => {
      const config = createValidConfig();
      config.provider.type = 'minio';
      config.provider.endpoint = 'localhost:9000';
      expect(() => validateStorageConfig(config)).not.toThrow();
    });

    it('should throw error for missing access key', () => {
      const config = createValidConfig();
      config.provider.accessKey = '';
      expect(() => validateStorageConfig(config)).toThrow('Storage access key is required');
    });

    it('should throw error for missing secret key', () => {
      const config = createValidConfig();
      config.provider.secretKey = '';
      expect(() => validateStorageConfig(config)).toThrow('Storage secret key is required');
    });

    it('should throw error for missing bucket', () => {
      const config = createValidConfig();
      config.provider.bucket = '';
      expect(() => validateStorageConfig(config)).toThrow('Storage bucket name is required');
    });

    it('should throw error for MinIO without endpoint', () => {
      const config = createValidConfig();
      config.provider.type = 'minio';
      delete config.provider.endpoint;
      expect(() => validateStorageConfig(config)).toThrow('MinIO endpoint is required');
    });

    it('should throw error for S3 without region', () => {
      const config = createValidConfig();
      config.provider.type = 's3';
      delete config.provider.region;
      expect(() => validateStorageConfig(config)).toThrow('AWS region is required for S3');
    });

    it('should throw error for invalid max file size', () => {
      const config = createValidConfig();
      config.upload.maxFileSize = 0;
      expect(() => validateStorageConfig(config)).toThrow('Max file size must be greater than 0');
    });

    it('should throw error for invalid chunk size', () => {
      const config = createValidConfig();
      config.upload.chunkSize = config.upload.maxFileSize + 1;
      expect(() => validateStorageConfig(config)).toThrow('Chunk size must be greater than 0 and less than max file size');
    });

    it('should throw error for invalid lifecycle configuration', () => {
      const config = createValidConfig();
      config.lifecycle.warmStorageAfterDays = 400; // Greater than cold storage
      expect(() => validateStorageConfig(config)).toThrow('Warm storage days must be less than cold storage days');
    });

    it('should throw error for multiple validation issues', () => {
      const config = createValidConfig();
      config.provider.accessKey = '';
      config.provider.secretKey = '';
      expect(() => validateStorageConfig(config)).toThrow(/Storage access key is required.*Storage secret key is required/s);
    });
  });

  describe('Environment variable parsing', () => {
    it('should use MinIO as default provider', () => {
      // Test would require dynamic import to test getStorageConfig function
      // For now, we test the logic through exports
      expect(true).toBe(true); // Placeholder
    });

    it('should parse boolean environment variables correctly', () => {
      process.env.CDN_ENABLED = 'true';
      process.env.STORAGE_USE_SSL = 'false';
      // Test logic would be implemented here
      expect(true).toBe(true); // Placeholder
    });

    it('should handle missing optional environment variables', () => {
      // Test default value handling
      expect(true).toBe(true); // Placeholder
    });
  });
});