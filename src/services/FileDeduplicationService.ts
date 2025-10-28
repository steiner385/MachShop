import { PrismaClient, StoredFile } from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import logger from '../utils/logger';
import { AppError } from '../middleware/errorHandler';
import { cloudStorageService } from './CloudStorageService';

/**
 * TypeScript interfaces for File Deduplication Operations
 */
export interface DeduplicationResult {
  isDuplicate: boolean;
  originalFileId?: string;
  duplicateFileIds: string[];
  spacesSaved: number; // bytes
  percentageSaved: number;
}

export interface DeduplicationStats {
  totalFiles: number;
  uniqueFiles: number;
  duplicateFiles: number;
  totalSpaceUsed: number; // bytes
  totalSpaceSaved: number; // bytes
  deduplicationRatio: number; // percentage
  topDuplicatedFiles: Array<{
    fileHash: string;
    fileName: string;
    duplicateCount: number;
    spacesSaved: number;
  }>;
}

export interface CleanupResult {
  filesProcessed: number;
  orphanedReferencesRemoved: number;
  spaceFreedup: number; // bytes
  errors: Array<{
    fileId: string;
    error: string;
  }>;
}

export interface DeduplicationReport {
  scanDate: Date;
  totalFilesScanned: number;
  duplicatesFound: number;
  spaceReclaimed: number; // bytes
  duplicateGroups: Array<{
    fileHash: string;
    fileName: string;
    fileSize: number;
    duplicateCount: number;
    files: Array<{
      id: string;
      storagePath: string;
      uploadedAt: Date;
      uploadedBy: string;
    }>;
  }>;
}

/**
 * File Deduplication Service - Advanced file deduplication and storage optimization
 * Manages file hashing, duplicate detection, space optimization, and cleanup operations
 */
class FileDeduplicationService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  /**
   * Calculate file hash for deduplication
   */
  async calculateFileHash(
    filePath: string | Buffer,
    algorithm: string = 'sha256'
  ): Promise<string> {
    try {
      const content = Buffer.isBuffer(filePath)
        ? filePath
        : await fs.readFile(filePath);

      const hash = crypto.createHash(algorithm).update(content).digest('hex');

      logger.debug('File hash calculated', {
        algorithm,
        hash: hash.substring(0, 16) + '...',
        size: content.length
      });

      return hash;
    } catch (error: any) {
      logger.error('Failed to calculate file hash', { error: error.message });
      throw new AppError('Hash calculation failed', 500, 'HASH_FAILED', error);
    }
  }

  /**
   * Check if a file is a duplicate based on hash
   */
  async checkForDuplicate(fileHash: string): Promise<DeduplicationResult> {
    try {
      logger.info('Checking for duplicate file', { fileHash: fileHash.substring(0, 16) + '...' });

      const existingFiles = await this.prisma.storedFile.findMany({
        where: { fileHash },
        select: {
          id: true,
          fileName: true,
          fileSize: true,
          uploadedAt: true,
          uploadedByName: true,
          storagePath: true,
          deduplicationRefs: true,
          originalFileId: true,
        },
        orderBy: { uploadedAt: 'asc' } // Oldest first
      });

      if (existingFiles.length === 0) {
        return {
          isDuplicate: false,
          duplicateFileIds: [],
          spacesSaved: 0,
          percentageSaved: 0,
        };
      }

      // Find the original file (the one without originalFileId)
      const originalFile = existingFiles.find(file => !file.originalFileId);
      const duplicateFileIds = existingFiles.map(file => file.id);
      const totalRefs = existingFiles.reduce((sum, file) => sum + file.deduplicationRefs, 0);
      const fileSize = existingFiles[0].fileSize;
      const spacesSaved = fileSize * (totalRefs - 1); // Space saved by not storing duplicates

      logger.info('Duplicate files found', {
        originalFileId: originalFile?.id,
        duplicateCount: existingFiles.length,
        totalReferences: totalRefs,
        spacesSaved
      });

      return {
        isDuplicate: true,
        originalFileId: originalFile?.id,
        duplicateFileIds,
        spacesSaved,
        percentageSaved: totalRefs > 1 ? ((totalRefs - 1) / totalRefs) * 100 : 0,
      };
    } catch (error: any) {
      logger.error('Failed to check for duplicate', { error: error.message, fileHash });
      throw new AppError('Duplicate check failed', 500, 'DUPLICATE_CHECK_FAILED', error);
    }
  }

  /**
   * Perform bulk deduplication scan on existing files
   */
  async performBulkDeduplication(options: {
    batchSize?: number;
    includeOrphaned?: boolean;
    dryRun?: boolean;
  } = {}): Promise<DeduplicationReport> {
    try {
      const { batchSize = 100, includeOrphaned = true, dryRun = false } = options;

      logger.info('Starting bulk deduplication scan', { batchSize, includeOrphaned, dryRun });

      const duplicateGroups: DeduplicationReport['duplicateGroups'] = [];
      let totalFilesScanned = 0;
      let duplicatesFound = 0;
      let spaceReclaimed = 0;

      // Get all files grouped by hash
      const fileGroups = await this.prisma.storedFile.groupBy({
        by: ['fileHash'],
        having: {
          fileHash: {
            _count: {
              gt: 1 // Only groups with more than 1 file (duplicates)
            }
          }
        },
        _count: {
          fileHash: true
        }
      });

      logger.info('Found duplicate groups', { groupCount: fileGroups.length });

      // Process each duplicate group
      for (const group of fileGroups) {
        const filesInGroup = await this.prisma.storedFile.findMany({
          where: { fileHash: group.fileHash },
          orderBy: { uploadedAt: 'asc' },
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            storagePath: true,
            uploadedAt: true,
            uploadedByName: true,
            originalFileId: true,
            deduplicationRefs: true,
          }
        });

        if (filesInGroup.length > 1) {
          const originalFile = filesInGroup[0]; // Keep the oldest as original
          const duplicates = filesInGroup.slice(1);

          const fileSize = originalFile.fileSize;
          const groupSpaceSaved = fileSize * duplicates.length;
          spaceReclaimed += groupSpaceSaved;
          duplicatesFound += duplicates.length;

          duplicateGroups.push({
            fileHash: group.fileHash,
            fileName: originalFile.fileName,
            fileSize: originalFile.fileSize,
            duplicateCount: filesInGroup.length,
            files: filesInGroup.map(file => ({
              id: file.id,
              storagePath: file.storagePath,
              uploadedAt: file.uploadedAt,
              uploadedBy: file.uploadedByName,
            }))
          });

          // Perform actual deduplication if not dry run
          if (!dryRun) {
            await this.deduplicateFileGroup(originalFile.id, duplicates.map(f => f.id));
          }
        }

        totalFilesScanned += filesInGroup.length;
      }

      const report: DeduplicationReport = {
        scanDate: new Date(),
        totalFilesScanned,
        duplicatesFound,
        spaceReclaimed,
        duplicateGroups: duplicateGroups.slice(0, 50) // Limit to top 50 for report
      };

      logger.info('Bulk deduplication completed', {
        totalFilesScanned,
        duplicatesFound,
        spaceReclaimed,
        dryRun
      });

      return report;
    } catch (error: any) {
      logger.error('Bulk deduplication failed', { error: error.message });
      throw new AppError('Bulk deduplication failed', 500, 'BULK_DEDUP_FAILED', error);
    }
  }

  /**
   * Deduplicate a group of files with the same hash
   */
  private async deduplicateFileGroup(originalFileId: string, duplicateFileIds: string[]): Promise<void> {
    try {
      // Update all duplicates to point to the original file
      await this.prisma.storedFile.updateMany({
        where: {
          id: { in: duplicateFileIds }
        },
        data: {
          originalFileId: originalFileId
        }
      });

      // Update reference count on original file
      await this.prisma.storedFile.update({
        where: { id: originalFileId },
        data: {
          deduplicationRefs: {
            increment: duplicateFileIds.length
          }
        }
      });

      // Delete duplicate files from storage (keep only the original)
      const duplicateFiles = await this.prisma.storedFile.findMany({
        where: { id: { in: duplicateFileIds } },
        select: { storagePath: true }
      });

      for (const file of duplicateFiles) {
        try {
          // Note: In a real implementation, you'd call the storage service to delete
          // For now, we just log it
          logger.debug('Would delete duplicate file from storage', { storagePath: file.storagePath });
        } catch (deleteError: any) {
          logger.warn('Failed to delete duplicate from storage', {
            storagePath: file.storagePath,
            error: deleteError.message
          });
        }
      }

      logger.info('File group deduplicated', {
        originalFileId,
        duplicatesProcessed: duplicateFileIds.length
      });
    } catch (error: any) {
      logger.error('Failed to deduplicate file group', {
        error: error.message,
        originalFileId,
        duplicateFileIds
      });
      throw error;
    }
  }

  /**
   * Get comprehensive deduplication statistics
   */
  async getDeduplicationStats(): Promise<DeduplicationStats> {
    try {
      logger.info('Calculating deduplication statistics');

      const [totalFiles, totalSize, duplicateGroups] = await Promise.all([
        // Total files count
        this.prisma.storedFile.count(),

        // Total size
        this.prisma.storedFile.aggregate({
          _sum: { fileSize: true }
        }),

        // Duplicate groups
        this.prisma.storedFile.groupBy({
          by: ['fileHash'],
          having: {
            fileHash: {
              _count: { gt: 1 }
            }
          },
          _count: { fileHash: true },
          _sum: { fileSize: true }
        })
      ]);

      // Calculate unique files and duplicates
      const uniqueFiles = await this.prisma.storedFile.count({
        where: { originalFileId: null }
      });

      const duplicateFiles = totalFiles - uniqueFiles;

      // Calculate space savings
      let totalSpaceSaved = 0;
      const topDuplicatedFiles: DeduplicationStats['topDuplicatedFiles'] = [];

      for (const group of duplicateGroups.slice(0, 10)) { // Top 10
        const filesInGroup = await this.prisma.storedFile.findMany({
          where: { fileHash: group.fileHash },
          select: { fileName: true, fileSize: true },
          take: 1
        });

        if (filesInGroup.length > 0) {
          const file = filesInGroup[0];
          const duplicateCount = group._count.fileHash;
          const spacesSaved = file.fileSize * (duplicateCount - 1);
          totalSpaceSaved += spacesSaved;

          topDuplicatedFiles.push({
            fileHash: group.fileHash,
            fileName: file.fileName,
            duplicateCount,
            spacesSaved
          });
        }
      }

      // Sort by spaces saved
      topDuplicatedFiles.sort((a, b) => b.spacesSaved - a.spacesSaved);

      const totalSpaceUsed = totalSize._sum.fileSize || 0;
      const deduplicationRatio = totalSpaceUsed > 0 ? (totalSpaceSaved / totalSpaceUsed) * 100 : 0;

      const stats: DeduplicationStats = {
        totalFiles,
        uniqueFiles,
        duplicateFiles,
        totalSpaceUsed,
        totalSpaceSaved,
        deduplicationRatio,
        topDuplicatedFiles
      };

      logger.info('Deduplication statistics calculated', {
        totalFiles,
        uniqueFiles,
        duplicateFiles,
        deduplicationRatio: Math.round(deduplicationRatio * 100) / 100
      });

      return stats;
    } catch (error: any) {
      logger.error('Failed to calculate deduplication statistics', { error: error.message });
      throw new AppError('Statistics calculation failed', 500, 'STATS_FAILED', error);
    }
  }

  /**
   * Find and clean up orphaned file references
   */
  async cleanupOrphanedReferences(): Promise<CleanupResult> {
    try {
      logger.info('Starting orphaned reference cleanup');

      const result: CleanupResult = {
        filesProcessed: 0,
        orphanedReferencesRemoved: 0,
        spaceFreedup: 0,
        errors: []
      };

      // Find files that reference a non-existent original file
      const orphanedFiles = await this.prisma.storedFile.findMany({
        where: {
          originalFileId: { not: null }
        },
        select: {
          id: true,
          originalFileId: true,
          fileSize: true,
          fileName: true,
          originalFile: true
        }
      });

      result.filesProcessed = orphanedFiles.length;

      for (const file of orphanedFiles) {
        try {
          if (!file.originalFile) {
            // Orphaned reference - the original file no longer exists
            logger.warn('Found orphaned file reference', {
              fileId: file.id,
              fileName: file.fileName,
              originalFileId: file.originalFileId
            });

            // Convert this file to be its own original
            await this.prisma.storedFile.update({
              where: { id: file.id },
              data: {
                originalFileId: null,
                deduplicationRefs: 1
              }
            });

            result.orphanedReferencesRemoved++;
            // Note: No space is actually freed since the file still exists
          }
        } catch (error: any) {
          logger.error('Failed to cleanup orphaned reference', {
            fileId: file.id,
            error: error.message
          });

          result.errors.push({
            fileId: file.id,
            error: error.message
          });
        }
      }

      logger.info('Orphaned reference cleanup completed', {
        filesProcessed: result.filesProcessed,
        orphanedReferencesRemoved: result.orphanedReferencesRemoved,
        errors: result.errors.length
      });

      return result;
    } catch (error: any) {
      logger.error('Orphaned reference cleanup failed', { error: error.message });
      throw new AppError('Cleanup failed', 500, 'CLEANUP_FAILED', error);
    }
  }

  /**
   * Verify file integrity by comparing stored hashes with actual file content
   */
  async verifyFileIntegrity(fileIds?: string[]): Promise<{
    verified: number;
    corrupted: Array<{
      fileId: string;
      fileName: string;
      storedHash: string;
      actualHash: string;
    }>;
    errors: Array<{
      fileId: string;
      error: string;
    }>;
  }> {
    try {
      logger.info('Starting file integrity verification', { fileIds: fileIds?.length });

      const result = {
        verified: 0,
        corrupted: [] as any[],
        errors: [] as any[]
      };

      // Get files to verify
      const whereClause = fileIds ? { id: { in: fileIds } } : {};
      const files = await this.prisma.storedFile.findMany({
        where: whereClause,
        select: {
          id: true,
          fileName: true,
          fileHash: true,
          storagePath: true
        },
        take: 100 // Limit for performance
      });

      for (const file of files) {
        try {
          // Download file content and calculate hash
          const { stream } = await cloudStorageService.downloadFile(file.id);

          // Convert stream to buffer for hash calculation
          const chunks: Buffer[] = [];
          stream.on('data', (chunk) => chunks.push(chunk));

          await new Promise<void>((resolve, reject) => {
            stream.on('end', resolve);
            stream.on('error', reject);
          });

          const content = Buffer.concat(chunks);
          const actualHash = await this.calculateFileHash(content);

          if (actualHash === file.fileHash) {
            result.verified++;
          } else {
            result.corrupted.push({
              fileId: file.id,
              fileName: file.fileName,
              storedHash: file.fileHash,
              actualHash
            });
          }
        } catch (error: any) {
          logger.error('Failed to verify file integrity', {
            fileId: file.id,
            error: error.message
          });

          result.errors.push({
            fileId: file.id,
            error: error.message
          });
        }
      }

      logger.info('File integrity verification completed', {
        totalFiles: files.length,
        verified: result.verified,
        corrupted: result.corrupted.length,
        errors: result.errors.length
      });

      return result;
    } catch (error: any) {
      logger.error('File integrity verification failed', { error: error.message });
      throw new AppError('Integrity verification failed', 500, 'VERIFICATION_FAILED', error);
    }
  }

  /**
   * Get duplicate files for a specific file hash
   */
  async getDuplicateFiles(fileHash: string): Promise<StoredFile[]> {
    try {
      const duplicates = await this.prisma.storedFile.findMany({
        where: { fileHash },
        orderBy: { uploadedAt: 'asc' }
      });

      logger.info('Retrieved duplicate files', {
        fileHash: fileHash.substring(0, 16) + '...',
        duplicateCount: duplicates.length
      });

      return duplicates;
    } catch (error: any) {
      logger.error('Failed to get duplicate files', { error: error.message, fileHash });
      throw new AppError('Failed to get duplicates', 500, 'GET_DUPLICATES_FAILED', error);
    }
  }

  /**
   * Schedule automated deduplication tasks
   */
  async scheduleDeduplication(
    schedule: 'hourly' | 'daily' | 'weekly',
    options: {
      autoCleanup?: boolean;
      batchSize?: number;
      enableNotifications?: boolean;
    } = {}
  ): Promise<string> {
    try {
      // In a real implementation, this would integrate with a job scheduler
      // For now, we'll just log the schedule
      const scheduleId = crypto.randomUUID();

      logger.info('Deduplication task scheduled', {
        scheduleId,
        schedule,
        options
      });

      // TODO: Integrate with job scheduler (Bull, Agenda, etc.)
      // TODO: Store schedule in database
      // TODO: Implement actual scheduling logic

      return scheduleId;
    } catch (error: any) {
      logger.error('Failed to schedule deduplication', { error: error.message });
      throw new AppError('Scheduling failed', 500, 'SCHEDULE_FAILED', error);
    }
  }

  /**
   * Close database connection
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export const fileDeduplicationService = new FileDeduplicationService();
export default fileDeduplicationService;