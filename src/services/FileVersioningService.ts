import { PrismaClient, StoredFile, FileVersion, VersionChangeType, StorageClass } from '@prisma/client';
import * as crypto from 'crypto';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { cloudStorageService } from './CloudStorageService';
import { storageConfig, StoragePathBuilder } from '../config/storage';

/**
 * TypeScript interfaces for File Versioning Operations
 */
export interface VersionCreationOptions {
  changeType: VersionChangeType;
  changeDescription?: string;
  userId: string;
  userName: string;
  preservePreviousVersions?: boolean;
  maxVersionsToKeep?: number;
}

export interface VersionRestoreOptions {
  createNewVersion?: boolean;
  restoreDescription?: string;
  userId: string;
  userName: string;
}

export interface VersionComparisonResult {
  oldVersion: FileVersionDetails;
  newVersion: FileVersionDetails;
  sizeDifference: number;
  hashChanged: boolean;
  contentTypeChanged: boolean;
  changes: {
    metadata: Record<string, { old: any; new: any }>;
    properties: Record<string, { old: any; new: any }>;
  };
}

export interface FileVersionDetails extends FileVersion {
  file: StoredFile;
  downloadUrl?: string;
  isLatest: boolean;
  sizeDifference?: number; // Compared to previous version
  changesSinceCreation?: number; // Total changes since file creation
}

export interface VersionHistory {
  fileId: string;
  fileName: string;
  totalVersions: number;
  totalStorageUsed: number; // bytes across all versions
  oldestVersion: Date;
  newestVersion: Date;
  versions: FileVersionDetails[];
  versionTree?: VersionTreeNode[]; // For branch visualization
}

export interface VersionTreeNode {
  version: FileVersionDetails;
  children: VersionTreeNode[];
  parent?: VersionTreeNode;
  depth: number;
}

export interface VersionCleanupResult {
  versionsProcessed: number;
  versionsDeleted: number;
  spaceReclaimed: number; // bytes
  errors: Array<{
    versionId: string;
    error: string;
  }>;
}

export interface VersionPolicy {
  maxVersionsPerFile: number;
  maxVersionAge: number; // days
  compressOldVersions: boolean;
  archiveAfterDays: number;
  enableBranchVersioning: boolean;
  autoCleanupEnabled: boolean;
}

/**
 * File Versioning Service - Advanced file version management and history tracking
 * Supports branching, restoration, comparison, and automated cleanup
 */
class FileVersioningService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Create a new version of a file
   */
  async createVersion(
    fileId: string,
    newFileContent: Buffer,
    options: VersionCreationOptions
  ): Promise<FileVersionDetails> {
    try {
      logger.info('Creating new file version', {
        fileId,
        changeType: options.changeType,
        userId: options.userId
      });

      // Get current file
      const currentFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId },
        include: {
          versions: {
            orderBy: { versionNumber: 'desc' },
            take: 1
          }
        }
      });

      if (!currentFile) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      const currentVersion = currentFile.versions[0];
      const newVersionNumber = currentVersion ? currentVersion.versionNumber + 1 : 1;

      // Calculate new file hash
      const newFileHash = crypto.createHash('sha256').update(newFileContent).digest('hex');

      // Check if content actually changed
      if (currentFile.fileHash === newFileHash && options.changeType !== VersionChangeType.METADATA) {
        logger.warn('File content unchanged, skipping version creation', {
          fileId,
          changeType: options.changeType
        });
        throw new AppError('File content has not changed', 400, 'NO_CHANGES');
      }

      // Generate storage path for new version
      const versionStoragePath = this.generateVersionPath(currentFile, newVersionNumber);

      // Upload new version to cloud storage
      const uploadResult = await this.uploadVersionToStorage(
        versionStoragePath,
        newFileContent,
        currentFile.mimeType
      );

      // Create version record
      const newVersion = await this.prisma.fileVersion.create({
        data: {
          fileId,
          versionNumber: newVersionNumber,
          versionId: uploadResult.versionId,
          storagePath: versionStoragePath,
          fileSize: newFileContent.length,
          fileHash: newFileHash,
          mimeType: currentFile.mimeType,
          changeDescription: options.changeDescription,
          changeType: options.changeType,
          storageClass: currentFile.storageClass,
          createdById: options.userId,
          createdByName: options.userName,
          metadata: {
            originalFileId: fileId,
            uploadMethod: 'version_upload',
            sizeDifference: newFileContent.length - currentFile.fileSize,
            etag: uploadResult.etag,
          },
        },
        include: {
          file: true
        }
      });

      // Update main file record with latest version info
      await this.prisma.storedFile.update({
        where: { id: fileId },
        data: {
          fileSize: newFileContent.length,
          fileHash: newFileHash,
          storagePath: versionStoragePath,
          versionNumber: newVersionNumber,
          isLatestVersion: true,
          metadata: {
            ...currentFile.metadata,
            lastVersionCreated: new Date().toISOString(),
            totalVersions: newVersionNumber,
          }
        }
      });

      // Mark previous versions as not latest
      await this.prisma.storedFile.updateMany({
        where: {
          id: { not: fileId },
          originalFileId: fileId
        },
        data: { isLatestVersion: false }
      });

      // Apply version retention policy
      if (options.maxVersionsToKeep) {
        await this.applyRetentionPolicy(fileId, options.maxVersionsToKeep);
      }

      const versionDetails: FileVersionDetails = {
        ...newVersion,
        isLatest: true,
        sizeDifference: newFileContent.length - currentFile.fileSize,
        changesSinceCreation: newVersionNumber - 1,
      };

      logger.info('File version created successfully', {
        fileId,
        versionId: newVersion.id,
        versionNumber: newVersionNumber,
        sizeChange: versionDetails.sizeDifference
      });

      return versionDetails;
    } catch (error: any) {
      logger.error('Failed to create file version', {
        error: error.message,
        fileId,
        changeType: options.changeType
      });
      throw new AppError('Version creation failed', 500, 'VERSION_CREATE_FAILED', error);
    }
  }

  /**
   * Get complete version history for a file
   */
  async getVersionHistory(fileId: string, options: {
    includeContent?: boolean;
    generateUrls?: boolean;
    limit?: number;
    offset?: number;
  } = {}): Promise<VersionHistory> {
    try {
      logger.info('Retrieving version history', { fileId });

      const file = await this.prisma.storedFile.findUnique({
        where: { id: fileId }
      });

      if (!file) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      // Get all versions
      const versions = await this.prisma.fileVersion.findMany({
        where: { fileId },
        include: { file: true },
        orderBy: { versionNumber: 'desc' },
        take: options.limit,
        skip: options.offset,
      });

      // Calculate version details
      const versionDetails: FileVersionDetails[] = [];
      let previousSize = 0;

      for (let i = versions.length - 1; i >= 0; i--) {
        const version = versions[i];
        const sizeDifference = i === versions.length - 1 ? 0 : version.fileSize - previousSize;

        const details: FileVersionDetails = {
          ...version,
          isLatest: i === 0,
          sizeDifference,
          changesSinceCreation: version.versionNumber - 1,
        };

        // Generate download URL if requested
        if (options.generateUrls) {
          try {
            details.downloadUrl = await cloudStorageService.generateSignedUrl(
              version.fileId,
              'get',
              3600 // 1 hour
            );
          } catch (urlError: any) {
            logger.warn('Failed to generate download URL for version', {
              versionId: version.id,
              error: urlError.message
            });
          }
        }

        versionDetails.unshift(details);
        previousSize = version.fileSize;
      }

      // Calculate total storage used
      const totalStorageUsed = versions.reduce((total, v) => total + v.fileSize, 0);

      const history: VersionHistory = {
        fileId,
        fileName: file.fileName,
        totalVersions: versions.length,
        totalStorageUsed,
        oldestVersion: versions[versions.length - 1]?.createdAt || new Date(),
        newestVersion: versions[0]?.createdAt || new Date(),
        versions: versionDetails,
      };

      logger.info('Version history retrieved', {
        fileId,
        totalVersions: history.totalVersions,
        totalStorageUsed: history.totalStorageUsed
      });

      return history;
    } catch (error: any) {
      logger.error('Failed to get version history', { error: error.message, fileId });
      throw new AppError('Version history retrieval failed', 500, 'HISTORY_FAILED', error);
    }
  }

  /**
   * Restore a file to a specific version
   */
  async restoreToVersion(
    fileId: string,
    versionNumber: number,
    options: VersionRestoreOptions
  ): Promise<FileVersionDetails> {
    try {
      logger.info('Restoring file to version', {
        fileId,
        versionNumber,
        createNewVersion: options.createNewVersion
      });

      // Get the target version
      const targetVersion = await this.prisma.fileVersion.findFirst({
        where: {
          fileId,
          versionNumber
        },
        include: { file: true }
      });

      if (!targetVersion) {
        throw new AppError(
          `Version ${versionNumber} not found`,
          404,
          'VERSION_NOT_FOUND'
        );
      }

      // Get current file
      const currentFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId }
      });

      if (!currentFile) {
        throw new AppError('File not found', 404, 'FILE_NOT_FOUND');
      }

      if (options.createNewVersion) {
        // Download the target version content
        const { stream } = await cloudStorageService.downloadFile(targetVersion.fileId);

        // Convert stream to buffer
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));

        await new Promise<void>((resolve, reject) => {
          stream.on('end', resolve);
          stream.on('error', reject);
        });

        const versionContent = Buffer.concat(chunks);

        // Create new version with restored content
        return this.createVersion(fileId, versionContent, {
          changeType: VersionChangeType.RESTORE,
          changeDescription: options.restoreDescription ||
            `Restored to version ${versionNumber}`,
          userId: options.userId,
          userName: options.userName,
        });
      } else {
        // Direct restore - update current file to point to restored version
        await this.prisma.storedFile.update({
          where: { id: fileId },
          data: {
            fileSize: targetVersion.fileSize,
            fileHash: targetVersion.fileHash,
            storagePath: targetVersion.storagePath,
            versionNumber: targetVersion.versionNumber,
            metadata: {
              ...currentFile.metadata,
              restoredAt: new Date().toISOString(),
              restoredFromVersion: versionNumber,
              restoredBy: options.userName,
            }
          }
        });

        const restoredDetails: FileVersionDetails = {
          ...targetVersion,
          isLatest: true,
          changesSinceCreation: targetVersion.versionNumber - 1,
        };

        logger.info('File restored to version', {
          fileId,
          versionNumber,
          userId: options.userId
        });

        return restoredDetails;
      }
    } catch (error: any) {
      logger.error('Failed to restore file version', {
        error: error.message,
        fileId,
        versionNumber
      });
      throw new AppError('Version restore failed', 500, 'RESTORE_FAILED', error);
    }
  }

  /**
   * Compare two versions of a file
   */
  async compareVersions(
    fileId: string,
    versionA: number,
    versionB: number
  ): Promise<VersionComparisonResult> {
    try {
      logger.info('Comparing file versions', { fileId, versionA, versionB });

      const [versionARecord, versionBRecord] = await Promise.all([
        this.prisma.fileVersion.findFirst({
          where: { fileId, versionNumber: versionA },
          include: { file: true }
        }),
        this.prisma.fileVersion.findFirst({
          where: { fileId, versionNumber: versionB },
          include: { file: true }
        })
      ]);

      if (!versionARecord || !versionBRecord) {
        throw new AppError('One or both versions not found', 404, 'VERSION_NOT_FOUND');
      }

      const oldVersion: FileVersionDetails = {
        ...versionARecord,
        isLatest: false,
        changesSinceCreation: versionARecord.versionNumber - 1,
      };

      const newVersion: FileVersionDetails = {
        ...versionBRecord,
        isLatest: false,
        changesSinceCreation: versionBRecord.versionNumber - 1,
      };

      // Calculate differences
      const sizeDifference = versionBRecord.fileSize - versionARecord.fileSize;
      const hashChanged = versionARecord.fileHash !== versionBRecord.fileHash;
      const contentTypeChanged = versionARecord.mimeType !== versionBRecord.mimeType;

      // Compare metadata
      const metadataChanges: Record<string, { old: any; new: any }> = {};
      const oldMetadata = versionARecord.metadata as Record<string, any> || {};
      const newMetadata = versionBRecord.metadata as Record<string, any> || {};

      const allMetadataKeys = new Set([
        ...Object.keys(oldMetadata),
        ...Object.keys(newMetadata)
      ]);

      for (const key of allMetadataKeys) {
        if (oldMetadata[key] !== newMetadata[key]) {
          metadataChanges[key] = {
            old: oldMetadata[key],
            new: newMetadata[key]
          };
        }
      }

      // Compare file properties
      const propertyChanges: Record<string, { old: any; new: any }> = {};
      const properties = ['fileSize', 'mimeType', 'storageClass', 'changeType'];

      for (const prop of properties) {
        const oldValue = (versionARecord as any)[prop];
        const newValue = (versionBRecord as any)[prop];
        if (oldValue !== newValue) {
          propertyChanges[prop] = { old: oldValue, new: newValue };
        }
      }

      const comparison: VersionComparisonResult = {
        oldVersion,
        newVersion,
        sizeDifference,
        hashChanged,
        contentTypeChanged,
        changes: {
          metadata: metadataChanges,
          properties: propertyChanges,
        },
      };

      logger.info('Version comparison completed', {
        fileId,
        versionA,
        versionB,
        sizeDifference,
        hasChanges: hashChanged || contentTypeChanged ||
          Object.keys(metadataChanges).length > 0 ||
          Object.keys(propertyChanges).length > 0
      });

      return comparison;
    } catch (error: any) {
      logger.error('Failed to compare versions', {
        error: error.message,
        fileId,
        versionA,
        versionB
      });
      throw new AppError('Version comparison failed', 500, 'COMPARISON_FAILED', error);
    }
  }

  /**
   * Delete a specific version
   */
  async deleteVersion(
    fileId: string,
    versionNumber: number,
    options: {
      userId: string;
      force?: boolean; // Allow deletion of latest version
    }
  ): Promise<void> {
    try {
      logger.info('Deleting file version', { fileId, versionNumber });

      const version = await this.prisma.fileVersion.findFirst({
        where: { fileId, versionNumber },
        include: { file: true }
      });

      if (!version) {
        throw new AppError(
          `Version ${versionNumber} not found`,
          404,
          'VERSION_NOT_FOUND'
        );
      }

      // Check if this is the latest version
      const latestVersion = await this.prisma.fileVersion.findFirst({
        where: { fileId },
        orderBy: { versionNumber: 'desc' }
      });

      if (latestVersion?.versionNumber === versionNumber && !options.force) {
        throw new AppError(
          'Cannot delete latest version without force flag',
          400,
          'CANNOT_DELETE_LATEST'
        );
      }

      // Delete from cloud storage
      try {
        await this.deleteVersionFromStorage(version.storagePath);
      } catch (storageError: any) {
        logger.warn('Failed to delete version from storage', {
          versionId: version.id,
          storagePath: version.storagePath,
          error: storageError.message
        });
      }

      // Delete from database
      await this.prisma.fileVersion.delete({
        where: { id: version.id }
      });

      // If we deleted the latest version, promote the previous version
      if (latestVersion?.versionNumber === versionNumber) {
        const newLatestVersion = await this.prisma.fileVersion.findFirst({
          where: { fileId },
          orderBy: { versionNumber: 'desc' }
        });

        if (newLatestVersion) {
          await this.prisma.storedFile.update({
            where: { id: fileId },
            data: {
              fileSize: newLatestVersion.fileSize,
              fileHash: newLatestVersion.fileHash,
              storagePath: newLatestVersion.storagePath,
              versionNumber: newLatestVersion.versionNumber,
            }
          });
        }
      }

      logger.info('File version deleted successfully', {
        fileId,
        versionNumber,
        userId: options.userId
      });
    } catch (error: any) {
      logger.error('Failed to delete file version', {
        error: error.message,
        fileId,
        versionNumber
      });
      throw new AppError('Version deletion failed', 500, 'DELETE_FAILED', error);
    }
  }

  /**
   * Apply version retention policy
   */
  async applyRetentionPolicy(
    fileId: string,
    maxVersions: number,
    policy?: Partial<VersionPolicy>
  ): Promise<VersionCleanupResult> {
    try {
      logger.info('Applying version retention policy', { fileId, maxVersions });

      const result: VersionCleanupResult = {
        versionsProcessed: 0,
        versionsDeleted: 0,
        spaceReclaimed: 0,
        errors: [],
      };

      // Get all versions ordered by version number (oldest first)
      const versions = await this.prisma.fileVersion.findMany({
        where: { fileId },
        orderBy: { versionNumber: 'asc' }
      });

      result.versionsProcessed = versions.length;

      if (versions.length <= maxVersions) {
        logger.info('No versions to clean up', {
          fileId,
          totalVersions: versions.length,
          maxVersions
        });
        return result;
      }

      // Keep the latest N versions, delete the rest
      const versionsToDelete = versions.slice(0, versions.length - maxVersions);

      for (const version of versionsToDelete) {
        try {
          // Skip if this is the current/latest version
          const file = await this.prisma.storedFile.findUnique({
            where: { id: fileId }
          });

          if (file?.versionNumber === version.versionNumber) {
            logger.warn('Skipping deletion of current version', {
              versionId: version.id,
              versionNumber: version.versionNumber
            });
            continue;
          }

          await this.deleteVersionFromStorage(version.storagePath);
          await this.prisma.fileVersion.delete({
            where: { id: version.id }
          });

          result.versionsDeleted++;
          result.spaceReclaimed += version.fileSize;
        } catch (deleteError: any) {
          result.errors.push({
            versionId: version.id,
            error: deleteError.message
          });
        }
      }

      logger.info('Version retention policy applied', {
        fileId,
        versionsProcessed: result.versionsProcessed,
        versionsDeleted: result.versionsDeleted,
        spaceReclaimed: result.spaceReclaimed,
        errors: result.errors.length
      });

      return result;
    } catch (error: any) {
      logger.error('Failed to apply retention policy', {
        error: error.message,
        fileId,
        maxVersions
      });
      throw new AppError('Retention policy failed', 500, 'RETENTION_FAILED', error);
    }
  }

  /**
   * Get version statistics across all files
   */
  async getVersioningStats(): Promise<{
    totalFiles: number;
    totalVersions: number;
    averageVersionsPerFile: number;
    totalVersionStorage: number; // bytes
    oldestVersion: Date;
    newestVersion: Date;
    topVersionedFiles: Array<{
      fileId: string;
      fileName: string;
      versionCount: number;
      totalSize: number;
    }>;
  }> {
    try {
      const [fileCount, versionStats, topVersioned] = await Promise.all([
        this.prisma.storedFile.count(),

        this.prisma.fileVersion.aggregate({
          _count: { id: true },
          _sum: { fileSize: true },
          _min: { createdAt: true },
          _max: { createdAt: true },
        }),

        this.prisma.fileVersion.groupBy({
          by: ['fileId'],
          _count: { id: true },
          _sum: { fileSize: true },
          orderBy: { _count: { id: 'desc' } },
          take: 10
        })
      ]);

      // Get file names for top versioned files
      const topVersionedWithNames = await Promise.all(
        topVersioned.map(async (group) => {
          const file = await this.prisma.storedFile.findUnique({
            where: { id: group.fileId },
            select: { fileName: true }
          });

          return {
            fileId: group.fileId,
            fileName: file?.fileName || 'Unknown',
            versionCount: group._count.id,
            totalSize: group._sum.fileSize || 0,
          };
        })
      );

      return {
        totalFiles: fileCount,
        totalVersions: versionStats._count.id || 0,
        averageVersionsPerFile: fileCount > 0 ?
          (versionStats._count.id || 0) / fileCount : 0,
        totalVersionStorage: versionStats._sum.fileSize || 0,
        oldestVersion: versionStats._min.createdAt || new Date(),
        newestVersion: versionStats._max.createdAt || new Date(),
        topVersionedFiles: topVersionedWithNames,
      };
    } catch (error: any) {
      logger.error('Failed to get versioning statistics', { error: error.message });
      throw new AppError('Statistics failed', 500, 'STATS_FAILED', error);
    }
  }

  /**
   * Private helper methods
   */

  private generateVersionPath(file: StoredFile, versionNumber: number): string {
    const pathParts = file.storagePath.split('/');
    const fileName = pathParts.pop();
    const basePath = pathParts.join('/');

    return `${basePath}/versions/v${versionNumber}/${fileName}`;
  }

  private async uploadVersionToStorage(
    storagePath: string,
    content: Buffer,
    contentType: string
  ): Promise<{ versionId: string; etag: string }> {
    // Use CloudStorageService to upload the version
    const uploadResult = await cloudStorageService.uploadFile(content, {
      filename: storagePath.split('/').pop() || 'version',
      contentType,
      metadata: {
        isVersion: 'true',
        storagePath,
      }
    });

    return {
      versionId: uploadResult.id,
      etag: uploadResult.metadata?.etag || '',
    };
  }

  private async deleteVersionFromStorage(storagePath: string): Promise<void> {
    // For now, we'll just log the deletion
    // In a real implementation, you'd call the appropriate storage API
    logger.debug('Would delete version from storage', { storagePath });
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const fileVersioningService = new FileVersioningService();
export default fileVersioningService;