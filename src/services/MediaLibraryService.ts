/**
 * MediaLibraryService
 *
 * Part of GitHub Issue #18: Multi-Format Document Management & Native Work Instruction Editor
 *
 * Manages media assets for work instructions including images, videos, documents,
 * diagrams, and annotations. Provides centralized media library with usage tracking.
 */

import { PrismaClient } from '@prisma/client';
import { FileUploadService } from './FileUploadService';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Type definitions for media operations
export interface MediaMetadata {
  fileName: string;
  title?: string;
  description?: string;
  tags?: string[];
  instructionId: string;
  mediaType: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'DIAGRAM' | 'CAD_MODEL' | 'ANIMATION';
  mimeType: string;
}

export interface MediaFilters {
  mediaType?: 'IMAGE' | 'VIDEO' | 'DOCUMENT' | 'DIAGRAM' | 'CAD_MODEL' | 'ANIMATION';
  tags?: string[];
  instructionId?: string;
  hasAnnotations?: boolean;
}

export interface Annotation {
  id: string;
  type: 'arrow' | 'callout' | 'highlight' | 'circle' | 'rectangle' | 'text';
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  };
  content?: string;
  style?: {
    color?: string;
    strokeWidth?: number;
    fontSize?: number;
  };
}

export interface UsageStats {
  totalUsage: number;
  recentUsage: number; // Last 30 days
  lastUsedAt?: Date;
  usedInInstructions: string[]; // Instruction IDs
}

export class MediaLibraryService {
  private prisma: PrismaClient;
  private fileUploadService: FileUploadService;

  constructor() {
    this.prisma = new PrismaClient();
    this.fileUploadService = new FileUploadService();
  }

  /**
   * Upload media file to library and create database record
   */
  async uploadMedia(fileBuffer: Buffer, metadata: MediaMetadata): Promise<any> {
    try {
      logger.info(`[MediaLibrary] Uploading media: ${metadata.fileName}`);

      // Generate unique filename
      const fileExtension = path.extname(metadata.fileName);
      const uniqueFileName = `${uuidv4()}${fileExtension}`;

      // Determine upload path based on media type
      const uploadPath = this.getMediaPath(metadata.mediaType);
      const fullPath = path.join(uploadPath, uniqueFileName);

      // Ensure directory exists
      await fs.mkdir(uploadPath, { recursive: true });

      // Write file to disk
      await fs.writeFile(fullPath, fileBuffer);

      // Calculate file size
      const fileSize = fileBuffer.length;

      // Create database record
      const mediaRecord = await this.prisma.workInstructionMedia.create({
        data: {
          instructionId: metadata.instructionId,
          mediaType: metadata.mediaType,
          fileName: metadata.fileName,
          fileUrl: `/uploads/media/${metadata.mediaType.toLowerCase()}/${uniqueFileName}`,
          fileSize,
          mimeType: metadata.mimeType,
          title: metadata.title,
          description: metadata.description,
          tags: metadata.tags || [],
          usageCount: 0
        }
      });

      logger.info(`[MediaLibrary] ✅ Media uploaded successfully: ${mediaRecord.id}`);
      return mediaRecord;

    } catch (error) {
      logger.error('[MediaLibrary] Media upload failed:', error);
      throw new Error(`Media upload failed: ${error.message}`);
    }
  }

  /**
   * Add annotations to media (for images/diagrams)
   */
  async annotateMedia(mediaId: string, annotations: Annotation[]): Promise<any> {
    try {
      logger.info(`[MediaLibrary] Adding annotations to media: ${mediaId}`);

      const updatedMedia = await this.prisma.workInstructionMedia.update({
        where: { id: mediaId },
        data: {
          annotations: annotations as any,
          updatedAt: new Date()
        }
      });

      logger.info(`[MediaLibrary] ✅ Annotations added successfully: ${annotations.length} annotations`);
      return updatedMedia;

    } catch (error) {
      logger.error('[MediaLibrary] Annotation failed:', error);
      throw new Error(`Annotation failed: ${error.message}`);
    }
  }

  /**
   * Search media library with filters
   */
  async searchMedia(query: string, filters: MediaFilters): Promise<any[]> {
    try {
      logger.info(`[MediaLibrary] Searching media: ${query}`);

      const where: any = {};

      // Text search in title, description, tags, and filename
      if (query) {
        where.OR = [
          { title: { contains: query, mode: 'insensitive' } },
          { description: { contains: query, mode: 'insensitive' } },
          { fileName: { contains: query, mode: 'insensitive' } },
          { tags: { has: query } }
        ];
      }

      // Filter by media type
      if (filters.mediaType) {
        where.mediaType = filters.mediaType;
      }

      // Filter by tags
      if (filters.tags && filters.tags.length > 0) {
        where.tags = { hasSome: filters.tags };
      }

      // Filter by instruction
      if (filters.instructionId) {
        where.instructionId = filters.instructionId;
      }

      // Filter by annotation presence
      if (filters.hasAnnotations !== undefined) {
        if (filters.hasAnnotations) {
          where.annotations = { not: null };
        } else {
          where.annotations = null;
        }
      }

      const mediaItems = await this.prisma.workInstructionMedia.findMany({
        where,
        include: {
          instruction: {
            select: { id: true, title: true }
          }
        },
        orderBy: [
          { usageCount: 'desc' },
          { updatedAt: 'desc' }
        ]
      });

      return mediaItems;

    } catch (error) {
      logger.error('[MediaLibrary] Search failed:', error);
      throw new Error(`Media search failed: ${error.message}`);
    }
  }

  /**
   * Get usage statistics for a media item
   */
  async getMediaUsage(mediaId: string): Promise<UsageStats> {
    try {
      const media = await this.prisma.workInstructionMedia.findUnique({
        where: { id: mediaId },
        include: {
          instruction: {
            select: { id: true, title: true }
          }
        }
      });

      if (!media) {
        throw new Error(`Media not found: ${mediaId}`);
      }

      // For now, we'll use simple usage tracking
      // In a more sophisticated system, we could track actual usage events
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const recentUsage = media.lastUsedAt && media.lastUsedAt > thirtyDaysAgo ? media.usageCount : 0;

      return {
        totalUsage: media.usageCount,
        recentUsage,
        lastUsedAt: media.lastUsedAt || undefined,
        usedInInstructions: [media.instructionId] // Simplified - could track multiple instructions
      };

    } catch (error) {
      logger.error('[MediaLibrary] Usage stats failed:', error);
      throw new Error(`Getting usage stats failed: ${error.message}`);
    }
  }

  /**
   * Delete unused media older than specified date
   */
  async deleteUnusedMedia(olderThan: Date): Promise<number> {
    try {
      logger.info(`[MediaLibrary] Cleaning up unused media older than: ${olderThan}`);

      // Find unused media (usage count = 0 and old)
      const unusedMedia = await this.prisma.workInstructionMedia.findMany({
        where: {
          usageCount: 0,
          createdAt: { lt: olderThan }
        }
      });

      let deletedCount = 0;

      for (const media of unusedMedia) {
        try {
          // Delete file from disk
          const filePath = path.join(process.cwd(), 'uploads', media.fileUrl.replace('/uploads/', ''));
          await fs.unlink(filePath).catch(() => {
            // File might not exist, log but continue
            logger.warn(`[MediaLibrary] File not found for deletion: ${filePath}`);
          });

          // Delete database record
          await this.prisma.workInstructionMedia.delete({
            where: { id: media.id }
          });

          deletedCount++;

        } catch (error) {
          logger.error(`[MediaLibrary] Failed to delete media ${media.id}:`, error);
        }
      }

      logger.info(`[MediaLibrary] ✅ Cleanup completed: ${deletedCount} media items deleted`);
      return deletedCount;

    } catch (error) {
      logger.error('[MediaLibrary] Cleanup failed:', error);
      throw new Error(`Media cleanup failed: ${error.message}`);
    }
  }

  /**
   * Update media metadata
   */
  async updateMediaMetadata(mediaId: string, updates: {
    title?: string;
    description?: string;
    tags?: string[];
  }): Promise<any> {
    try {
      logger.info(`[MediaLibrary] Updating media metadata: ${mediaId}`);

      const updatedMedia = await this.prisma.workInstructionMedia.update({
        where: { id: mediaId },
        data: {
          ...updates,
          updatedAt: new Date()
        }
      });

      logger.info(`[MediaLibrary] ✅ Media metadata updated successfully`);
      return updatedMedia;

    } catch (error) {
      logger.error('[MediaLibrary] Update metadata failed:', error);
      throw new Error(`Update metadata failed: ${error.message}`);
    }
  }

  /**
   * Track media usage (increment usage count)
   */
  async trackUsage(mediaId: string): Promise<void> {
    try {
      await this.prisma.workInstructionMedia.update({
        where: { id: mediaId },
        data: {
          usageCount: { increment: 1 },
          lastUsedAt: new Date()
        }
      });

      logger.debug(`[MediaLibrary] Usage tracked for media: ${mediaId}`);

    } catch (error) {
      logger.error('[MediaLibrary] Track usage failed:', error);
      // Don't throw error for usage tracking failures
    }
  }

  /**
   * Get media library statistics
   */
  async getLibraryStats(): Promise<{
    totalItems: number;
    totalSize: number;
    byType: Record<string, number>;
    recentUploads: number;
  }> {
    try {
      const stats = await this.prisma.workInstructionMedia.aggregate({
        _count: { id: true },
        _sum: { fileSize: true }
      });

      const byType = await this.prisma.workInstructionMedia.groupBy({
        by: ['mediaType'],
        _count: { id: true }
      });

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const recentUploads = await this.prisma.workInstructionMedia.count({
        where: { createdAt: { gte: sevenDaysAgo } }
      });

      return {
        totalItems: stats._count.id || 0,
        totalSize: stats._sum.fileSize || 0,
        byType: byType.reduce((acc, item) => {
          acc[item.mediaType] = item._count.id;
          return acc;
        }, {} as Record<string, number>),
        recentUploads
      };

    } catch (error) {
      logger.error('[MediaLibrary] Get stats failed:', error);
      throw new Error(`Get library stats failed: ${error.message}`);
    }
  }

  // Helper methods

  private getMediaPath(mediaType: string): string {
    const baseUploadDir = process.env.UPLOAD_DIR || './uploads';
    const mediaDir = path.join(baseUploadDir, 'media', mediaType.toLowerCase());
    return mediaDir;
  }

  /**
   * Cleanup method for proper service shutdown
   */
  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}

export default MediaLibraryService;