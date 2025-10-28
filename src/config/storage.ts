/**
 * Cloud Storage Configuration for S3/MinIO
 * Supports enterprise-grade cloud storage with versioning, CDN, and lifecycle management
 */

export interface StorageProvider {
  type: 's3' | 'minio';
  region?: string;
  endpoint?: string;
  port?: number;
  useSSL?: boolean;
  accessKey: string;
  secretKey: string;
  bucket: string;
  pathStyle?: boolean; // For MinIO compatibility
}

export interface CDNConfig {
  enabled: boolean;
  domain?: string;
  provider?: 'cloudfront' | 'cloudflare' | 'custom';
  cacheMaxAge?: number; // seconds
  enableGzip?: boolean;
}

export interface UploadConfig {
  maxFileSize: number; // bytes
  chunkSize: number; // bytes for multipart uploads
  allowedMimeTypes: string[];
  enableDeduplication: boolean;
  enableVersioning: boolean;
  enableEncryption: boolean;
  tempUploadDir: string;
}

export interface LifecycleConfig {
  warmStorageAfterDays: number;
  coldStorageAfterDays: number;
  archiveAfterDays: number;
  deleteAfterDays: number;
  enableAutoCleanup: boolean;
}

export interface BackupConfig {
  enabled: boolean;
  frequency: 'hourly' | 'daily' | 'weekly';
  retentionDays: number;
  crossRegionReplication: boolean;
  backupBucket?: string;
}

export interface SecurityConfig {
  encryptionAtRest: boolean;
  encryptionInTransit: boolean;
  signedUrlExpirationMinutes: number;
  enableAccessLogging: boolean;
  corsOrigins: string[];
}

export interface StorageConfig {
  provider: StorageProvider;
  cdn: CDNConfig;
  upload: UploadConfig;
  lifecycle: LifecycleConfig;
  backup: BackupConfig;
  security: SecurityConfig;
}

// Environment variable mappings
const getStorageConfig = (): StorageConfig => {
  const storageProvider = process.env.STORAGE_PROVIDER?.toLowerCase() as 's3' | 'minio' || 'minio';

  return {
    provider: {
      type: storageProvider,
      region: process.env.AWS_REGION || process.env.STORAGE_REGION || 'us-east-1',
      endpoint: process.env.MINIO_ENDPOINT || process.env.STORAGE_ENDPOINT,
      port: process.env.MINIO_PORT ? parseInt(process.env.MINIO_PORT) : 9000,
      useSSL: process.env.STORAGE_USE_SSL === 'true' || process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.AWS_ACCESS_KEY_ID || process.env.MINIO_ACCESS_KEY || process.env.STORAGE_ACCESS_KEY || '',
      secretKey: process.env.AWS_SECRET_ACCESS_KEY || process.env.MINIO_SECRET_KEY || process.env.STORAGE_SECRET_KEY || '',
      bucket: process.env.STORAGE_BUCKET || process.env.S3_BUCKET || process.env.MINIO_BUCKET || 'mes-production',
      pathStyle: storageProvider === 'minio' || process.env.STORAGE_PATH_STYLE === 'true',
    },

    cdn: {
      enabled: process.env.CDN_ENABLED === 'true',
      domain: process.env.CDN_DOMAIN,
      provider: (process.env.CDN_PROVIDER as 'cloudfront' | 'cloudflare' | 'custom') || 'cloudfront',
      cacheMaxAge: process.env.CDN_CACHE_MAX_AGE ? parseInt(process.env.CDN_CACHE_MAX_AGE) : 2592000, // 30 days
      enableGzip: process.env.CDN_ENABLE_GZIP !== 'false',
    },

    upload: {
      maxFileSize: process.env.MAX_FILE_SIZE ? parseInt(process.env.MAX_FILE_SIZE) : 104857600, // 100MB
      chunkSize: process.env.CHUNK_SIZE ? parseInt(process.env.CHUNK_SIZE) : 5242880, // 5MB
      allowedMimeTypes: process.env.ALLOWED_MIME_TYPES?.split(',') || [
        'image/*',
        'video/*',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/*',
        'application/zip',
        'application/x-rar-compressed',
        'application/step', // CAD files
        'application/iges',
        'image/vnd.dwg',
      ],
      enableDeduplication: process.env.ENABLE_DEDUPLICATION !== 'false',
      enableVersioning: process.env.ENABLE_VERSIONING !== 'false',
      enableEncryption: process.env.ENABLE_ENCRYPTION === 'true',
      tempUploadDir: process.env.TEMP_UPLOAD_DIR || './temp',
    },

    lifecycle: {
      warmStorageAfterDays: process.env.WARM_STORAGE_AFTER_DAYS ? parseInt(process.env.WARM_STORAGE_AFTER_DAYS) : 90,
      coldStorageAfterDays: process.env.COLD_STORAGE_AFTER_DAYS ? parseInt(process.env.COLD_STORAGE_AFTER_DAYS) : 365,
      archiveAfterDays: process.env.ARCHIVE_AFTER_DAYS ? parseInt(process.env.ARCHIVE_AFTER_DAYS) : 2555, // 7 years
      deleteAfterDays: process.env.DELETE_AFTER_DAYS ? parseInt(process.env.DELETE_AFTER_DAYS) : 3650, // 10 years
      enableAutoCleanup: process.env.ENABLE_AUTO_CLEANUP === 'true',
    },

    backup: {
      enabled: process.env.BACKUP_ENABLED === 'true',
      frequency: (process.env.BACKUP_FREQUENCY as 'hourly' | 'daily' | 'weekly') || 'daily',
      retentionDays: process.env.BACKUP_RETENTION_DAYS ? parseInt(process.env.BACKUP_RETENTION_DAYS) : 30,
      crossRegionReplication: process.env.CROSS_REGION_REPLICATION === 'true',
      backupBucket: process.env.BACKUP_BUCKET,
    },

    security: {
      encryptionAtRest: process.env.ENCRYPTION_AT_REST !== 'false',
      encryptionInTransit: process.env.ENCRYPTION_IN_TRANSIT !== 'false',
      signedUrlExpirationMinutes: process.env.SIGNED_URL_EXPIRATION_MINUTES ?
        parseInt(process.env.SIGNED_URL_EXPIRATION_MINUTES) : 60,
      enableAccessLogging: process.env.ENABLE_ACCESS_LOGGING === 'true',
      corsOrigins: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    },
  };
};

// Storage bucket organization structure
export const STORAGE_PATHS = {
  DOCUMENTS: {
    WORK_INSTRUCTIONS: 'documents/work-instructions',
    SETUP_SHEETS: 'documents/setup-sheets',
    INSPECTION_PLANS: 'documents/inspection-plans',
    SOPS: 'documents/sops',
    TOOL_DRAWINGS: 'documents/tool-drawings',
    WORK_ORDERS: 'documents/work-orders',
    ECOS: 'documents/ecos',
    FAQS: 'documents/faqs',
  },
  MEDIA: {
    IMAGES: 'media/images',
    VIDEOS: 'media/videos',
    CAD_FILES: 'media/cad-files',
    AUDIO: 'media/audio',
  },
  EXPORTS: {
    PDF: 'exports/pdf',
    DOCX: 'exports/docx',
    PPTX: 'exports/pptx',
    ZIP: 'exports/zip',
  },
  BACKUPS: 'backups',
  TEMP: 'temp',
  VERSIONS: 'versions',
} as const;

// Storage classes for lifecycle management
export enum StorageClass {
  HOT = 'STANDARD',           // Frequently accessed
  WARM = 'STANDARD_IA',       // Infrequently accessed
  COLD = 'GLACIER',           // Rarely accessed
  ARCHIVE = 'DEEP_ARCHIVE',   // Long-term archival
}

// File path utilities
export class StoragePathBuilder {
  static buildDocumentPath(documentType: string, documentId: string, filename: string, version?: number): string {
    const basePath = STORAGE_PATHS.DOCUMENTS[documentType.toUpperCase() as keyof typeof STORAGE_PATHS.DOCUMENTS] ||
                     `documents/${documentType.toLowerCase()}`;

    if (version) {
      return `${basePath}/${documentId}/v${version}/${filename}`;
    }
    return `${basePath}/${documentId}/${filename}`;
  }

  static buildMediaPath(mediaType: string, filename: string): string {
    const basePath = STORAGE_PATHS.MEDIA[mediaType.toUpperCase() as keyof typeof STORAGE_PATHS.MEDIA] ||
                     `media/${mediaType.toLowerCase()}`;
    return `${basePath}/${filename}`;
  }

  static buildExportPath(exportType: string, filename: string): string {
    const basePath = STORAGE_PATHS.EXPORTS[exportType.toUpperCase() as keyof typeof STORAGE_PATHS.EXPORTS] ||
                     `exports/${exportType.toLowerCase()}`;
    return `${basePath}/${filename}`;
  }

  static buildBackupPath(timestamp: string, filename: string): string {
    const date = new Date(timestamp).toISOString().split('T')[0]; // YYYY-MM-DD
    return `${STORAGE_PATHS.BACKUPS}/${date}/${filename}`;
  }

  static buildVersionPath(originalPath: string, version: number): string {
    const pathParts = originalPath.split('/');
    const filename = pathParts.pop();
    const basePath = pathParts.join('/');
    return `${basePath}/versions/v${version}/${filename}`;
  }
}

// Validate configuration on startup
export const validateStorageConfig = (config: StorageConfig): void => {
  const errors: string[] = [];

  // Required fields
  if (!config.provider.accessKey) {
    errors.push('Storage access key is required');
  }

  if (!config.provider.secretKey) {
    errors.push('Storage secret key is required');
  }

  if (!config.provider.bucket) {
    errors.push('Storage bucket name is required');
  }

  // MinIO specific validation
  if (config.provider.type === 'minio') {
    if (!config.provider.endpoint) {
      errors.push('MinIO endpoint is required');
    }
  }

  // S3 specific validation
  if (config.provider.type === 's3') {
    if (!config.provider.region) {
      errors.push('AWS region is required for S3');
    }
  }

  // Upload validation
  if (config.upload.maxFileSize <= 0) {
    errors.push('Max file size must be greater than 0');
  }

  if (config.upload.chunkSize <= 0 || config.upload.chunkSize > config.upload.maxFileSize) {
    errors.push('Chunk size must be greater than 0 and less than max file size');
  }

  // Lifecycle validation
  if (config.lifecycle.warmStorageAfterDays >= config.lifecycle.coldStorageAfterDays) {
    errors.push('Warm storage days must be less than cold storage days');
  }

  if (config.lifecycle.coldStorageAfterDays >= config.lifecycle.archiveAfterDays) {
    errors.push('Cold storage days must be less than archive days');
  }

  if (errors.length > 0) {
    throw new Error(`Storage configuration errors:\n${errors.join('\n')}`);
  }
};

// Export the configuration instance
export const storageConfig = getStorageConfig();

// Validate on import
try {
  validateStorageConfig(storageConfig);
} catch (error) {
  console.error('❌ Storage configuration validation failed:', error);
  // Don't throw in production, just log the error
  if (process.env.NODE_ENV !== 'production') {
    throw error;
  }
}

export default storageConfig;