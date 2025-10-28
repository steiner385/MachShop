import { PrismaClient, StoredFile } from '@prisma/client';
import * as crypto from 'crypto';
import { CloudStorageService } from './CloudStorageService';

export interface DuplicateGroup {
  checksum: string;
  count: number;
  files: Array<{
    id: string;
    fileName: string;
    checksum: string;
    size: number;
    storageKey: string;
    createdAt: Date;
  }>;
  totalSize: number;
  potentialSavings: number;
}

export interface DeduplicationResult {
  keptFile: any;
  removedFiles: any[];
  spaceSaved: number;
  method: 'soft' | 'hard';
}

export interface IntegrityResult {
  fileId: string;
  isValid: boolean;
  originalChecksum: string;
  currentChecksum: string;
}

export interface OrphanCleanupResult {
  totalScanned: number;
  orphanedFound: number;
  cleaned: number;
  orphanedFiles: any[];
}

export interface DeduplicationStatistics {
  totalFiles: number;
  uniqueFiles: number;
  duplicateFiles: number;
  duplicateGroups: number;
  totalSize: number;
  totalSizeFormatted: string;
  uniqueSize: number;
  uniqueSizeFormatted: string;
  duplicateSize: number;
  duplicateSizeFormatted: string;
  potentialSavings: number;
  potentialSavingsFormatted: string;
  deduplicationRatio: number;
  averageDuplicatesPerGroup: number;
}

/**
 * File Deduplication Service - Advanced deduplication system with SHA-256 hashing
 * Handles file deduplication, integrity verification, and orphaned reference cleanup
 */
export class FileDeduplicationService {
  private prisma: PrismaClient;
  private cloudStorageService: CloudStorageService;

  constructor() {
    this.prisma = new PrismaClient();
    this.cloudStorageService = new CloudStorageService();
  }

  /**
   * Calculate SHA-256 checksum for a buffer
   */
  async calculateChecksum(buffer: Buffer): Promise<string> {
    try {
      return crypto.createHash('sha256').update(buffer).digest('hex');
    } catch (error: any) {
      throw new Error(`Failed to calculate file checksum: ${error.message}`);
    }
  }

  /**
   * Find all duplicate files grouped by checksum
   */
  async findDuplicateFiles(): Promise<DuplicateGroup[]> {
    try {
      // Find checksums with more than one file
      const duplicateChecksums = await this.prisma.storedFile.groupBy({
        by: ['checksum'],
        where: {
          autoDeleteAt: null, // Only include files not scheduled for deletion
          checksum: { not: null },
        },
        having: {
          id: { _count: { gt: 1 } },
        },
        _count: { id: true },
      });

      if (duplicateChecksums.length === 0) {
        return [];
      }

      const duplicateGroups: DuplicateGroup[] = [];

      for (const group of duplicateChecksums) {
        const files = await this.prisma.storedFile.findMany({
          where: {
            checksum: group.checksum,
            autoDeleteAt: null, // Only include files not scheduled for deletion
          },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            fileName: true,
            checksum: true,
            size: true,
            storageKey: true,
            createdAt: true,
          },
        });

        const totalSize = files.reduce((sum, file) => sum + file.size, 0);
        const potentialSavings = totalSize - files[0].size; // Keep first file, remove others

        duplicateGroups.push({
          checksum: group.checksum,
          count: group._count.id,
          files,
          totalSize,
          potentialSavings,
        });
      }

      return duplicateGroups;
    } catch (error: any) {
      throw new Error(`Failed to find duplicate files: ${error.message}`);
    }
  }

  /**
   * Find duplicates for a specific checksum
   */
  async findDuplicatesByChecksum(checksum: string): Promise<Array<{
    id: string;
    fileName: string;
    originalName?: string;
    size: number;
    checksum: string;
    storageKey: string;
    createdAt: Date;
    updatedAt: Date;
  }>> {
    return await this.prisma.storedFile.findMany({
      where: {
        checksum,
        deletedAt: null,
      },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        fileName: true,
        originalName: true,
        size: true,
        checksum: true,
        storageKey: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Perform deduplication for files with the same checksum
   */
  async performDeduplication(
    checksum: string,
    method: 'soft' | 'hard' = 'soft'
  ): Promise<DeduplicationResult> {
    try {
      const files = await this.findDuplicatesByChecksum(checksum);

      if (files.length === 0) {
        throw new Error(`No files found with checksum: ${checksum}`);
      }

      if (files.length === 1) {
        throw new Error('Only one file found with this checksum. No deduplication needed.');
      }

      // Keep the oldest file (first in the sorted list)
      const keptFile = files[0];
      const removedFiles = files.slice(1);
      const spaceSaved = removedFiles.reduce((sum, file) => sum + file.size, 0);

      // Remove duplicates using transaction
      await this.prisma.$transaction(async (tx) => {
        for (const file of removedFiles) {
          if (method === 'hard') {
            // Hard delete - remove from database and storage
            await tx.storedFile.delete({
              where: { id: file.id },
            });
            // Note: In real implementation, would also delete from cloud storage
          } else {
            // Soft delete - mark as deleted
            await tx.storedFile.update({
              where: { id: file.id },
              data: { deletedAt: new Date() },
            });
          }
        }
      });

      return {
        keptFile,
        removedFiles,
        spaceSaved,
        method,
      };
    } catch (error: any) {
      throw new Error(`Failed to perform deduplication: ${error.message}`);
    }
  }

  /**
   * Perform bulk deduplication on all duplicate files
   */
  async bulkDeduplication(
    method: 'soft' | 'hard' = 'soft',
    batchSize: number = 10
  ): Promise<{
    processedChecksums: number;
    totalFilesRemoved: number;
    totalSpaceSaved: number;
    details: DeduplicationResult[];
  }> {
    try {
      const duplicateGroups = await this.findDuplicateFiles();
      const limitedGroups = duplicateGroups.slice(0, batchSize);

      const details: DeduplicationResult[] = [];
      let totalFilesRemoved = 0;
      let totalSpaceSaved = 0;

      for (const group of limitedGroups) {
        const result = await this.performDeduplication(group.checksum, method);
        details.push(result);
        totalFilesRemoved += result.removedFiles.length;
        totalSpaceSaved += result.spaceSaved;
      }

      return {
        processedChecksums: limitedGroups.length,
        totalFilesRemoved,
        totalSpaceSaved,
        details,
      };
    } catch (error: any) {
      throw new Error(`Failed to perform bulk deduplication: ${error.message}`);
    }
  }

  /**
   * Verify file integrity by comparing stored checksum with actual file content
   */
  async verifyFileIntegrity(fileId: string): Promise<IntegrityResult> {
    try {
      const storedFile = await this.prisma.storedFile.findUnique({
        where: { id: fileId },
      });

      if (!storedFile) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Download file content
      const fileContent = await this.cloudStorageService.downloadFile(fileId);

      // Calculate current checksum
      const currentChecksum = await this.calculateChecksum(fileContent);

      return {
        fileId,
        isValid: currentChecksum === storedFile.checksum,
        originalChecksum: storedFile.checksum,
        currentChecksum,
      };
    } catch (error: any) {
      throw new Error(`Failed to verify file integrity: ${error.message}`);
    }
  }

  /**
   * Clean up orphaned file references (files in database but not in storage)
   */
  async cleanupOrphanedReferences(dryRun: boolean = true): Promise<OrphanCleanupResult> {
    try {
      const allFiles = await this.prisma.storedFile.findMany({
        where: { deletedAt: null },
        select: {
          id: true,
          fileName: true,
          storageKey: true,
        },
      });

      const orphanedFiles: any[] = [];

      // Check each file's existence in storage
      for (const file of allFiles) {
        try {
          // Try to get file metadata to check existence
          const exists = await this.checkFileExistsInStorage(file.id);
          if (!exists) {
            orphanedFiles.push(file);
          }
        } catch (error) {
          // If we can't check, assume it's orphaned
          orphanedFiles.push(file);
        }
      }

      let cleaned = 0;

      if (!dryRun && orphanedFiles.length > 0) {
        await this.prisma.$transaction(async (tx) => {
          for (const file of orphanedFiles) {
            await tx.storedFile.delete({
              where: { id: file.id },
            });
            cleaned++;
          }
        });
      }

      return {
        totalScanned: allFiles.length,
        orphanedFound: orphanedFiles.length,
        cleaned,
        orphanedFiles,
      };
    } catch (error: any) {
      throw new Error(`Failed to cleanup orphaned references: ${error.message}`);
    }
  }

  /**
   * Check if file exists in storage (mock implementation)
   */
  private async checkFileExistsInStorage(fileId: string): Promise<boolean> {
    try {
      // This is a simplified check - in real implementation would check actual storage
      await this.cloudStorageService.downloadFile(fileId);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get comprehensive deduplication statistics
   */
  async getDeduplicationStatistics(): Promise<DeduplicationStatistics> {
    try {
      // Total files
      const totalFiles = await this.prisma.storedFile.count({
        where: { deletedAt: null },
      });

      // Unique files (distinct checksums)
      const uniqueFiles = await this.prisma.storedFile.count({
        where: { deletedAt: null },
        distinct: ['checksum'],
      });

      const duplicateFiles = totalFiles - uniqueFiles;

      // Total size
      const totalSizeAgg = await this.prisma.storedFile.aggregate({
        where: { deletedAt: null },
        _sum: { size: true },
      });
      const totalSize = totalSizeAgg._sum.size || 0;

      // Unique size (size of first file for each checksum)
      const uniqueSizeAgg = await this.prisma.storedFile.aggregate({
        where: { deletedAt: null },
        _sum: { size: true },
        distinct: ['checksum'],
      });
      const uniqueSize = uniqueSizeAgg._sum.size || 0;

      const duplicateSize = totalSize - uniqueSize;
      const potentialSavings = duplicateSize;

      // Duplicate groups
      const duplicateGroups = await this.prisma.storedFile.groupBy({
        by: ['checksum'],
        where: {
          autoDeleteAt: null, // Only include files not scheduled for deletion
          checksum: { not: null },
        },
        having: {
          id: { _count: { gt: 1 } },
        },
        _count: { id: true },
        _sum: { size: true },
      });

      const deduplicationRatio = totalSize > 0 ? (duplicateSize / totalSize) * 100 : 0;
      const averageDuplicatesPerGroup = duplicateGroups.length > 0
        ? duplicateGroups.reduce((sum, group) => sum + group._count.id, 0) / duplicateGroups.length
        : 0;

      return {
        totalFiles,
        uniqueFiles,
        duplicateFiles,
        duplicateGroups: duplicateGroups.length,
        totalSize,
        totalSizeFormatted: this.formatBytes(totalSize),
        uniqueSize,
        uniqueSizeFormatted: this.formatBytes(uniqueSize),
        duplicateSize,
        duplicateSizeFormatted: this.formatBytes(duplicateSize),
        potentialSavings,
        potentialSavingsFormatted: this.formatBytes(potentialSavings),
        deduplicationRatio: Number(deduplicationRatio.toFixed(1)),
        averageDuplicatesPerGroup: Number(averageDuplicatesPerGroup.toFixed(1)),
      };
    } catch (error: any) {
      throw new Error(`Failed to get deduplication statistics: ${error.message}`);
    }
  }

  /**
   * Format bytes to human readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }
}