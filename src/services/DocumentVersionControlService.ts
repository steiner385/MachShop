/**
 * Document Version Control Service
 * Enterprise-grade version control for work instructions and documents
 * Issue #72 - Phase 1: Basic Version Control
 */

import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';

/**
 * Version Metadata
 */
export interface VersionMetadata {
  createdBy: string;
  createdAt: Date;
  description?: string;
  tags?: string[];
  changeType?: 'major' | 'minor' | 'patch';
  isPublished: boolean;
}

/**
 * Document Version
 */
export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: string; // e.g., "1.2.3"
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;
  content: Record<string, any>;
  metadata: VersionMetadata;
  status: 'draft' | 'published' | 'archived';
  previousVersionId?: string;
  tags: string[];
  checksum: string; // For integrity verification
}

/**
 * Change Record
 */
export interface ChangeRecord {
  versionId: string;
  documentId: string;
  changeType: 'create' | 'update' | 'delete' | 'rollback' | 'merge';
  changedBy: string;
  changedAt: Date;
  description: string;
  changes?: Record<string, any>;
  previousVersionId?: string;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Version Comparison Result
 */
export interface VersionComparison {
  fromVersion: string;
  toVersion: string;
  differences: {
    field: string;
    oldValue: any;
    newValue: any;
    type: 'added' | 'removed' | 'modified';
  }[];
  changesSummary: {
    added: number;
    removed: number;
    modified: number;
  };
}

/**
 * Document Version Control Service
 * Manages version control, rollback, and audit trails for documents
 */
export class DocumentVersionControlService {
  private readonly prisma: PrismaClient;
  private readonly logger: Logger;

  constructor(prisma: PrismaClient, logger: Logger) {
    this.prisma = prisma;
    this.logger = logger;
  }

  /**
   * Create a new version of a document
   */
  async createVersion(
    documentId: string,
    content: Record<string, any>,
    metadata: VersionMetadata,
    changeType: 'major' | 'minor' | 'patch' = 'patch'
  ): Promise<DocumentVersion> {
    try {
      // Get latest version
      const latestVersion = await this.getLatestVersion(documentId);

      // Calculate new version number
      let major = 0, minor = 0, patch = 1;
      if (latestVersion) {
        major = latestVersion.majorVersion;
        minor = latestVersion.minorVersion;
        patch = latestVersion.patchVersion + 1;

        if (changeType === 'major') {
          major++;
          minor = 0;
          patch = 0;
        } else if (changeType === 'minor') {
          minor++;
          patch = 0;
        }
      }

      const versionNumber = `${major}.${minor}.${patch}`;
      const checksum = this.calculateChecksum(content);

      const newVersion: DocumentVersion = {
        id: `${documentId}-v${versionNumber}`,
        documentId,
        versionNumber,
        majorVersion: major,
        minorVersion: minor,
        patchVersion: patch,
        content,
        metadata: {
          ...metadata,
          createdAt: new Date(),
        },
        status: 'draft',
        previousVersionId: latestVersion?.id,
        tags: metadata.tags || [],
        checksum,
      };

      // Store in database
      await this.prisma.documentVersion.create({
        data: {
          id: newVersion.id,
          documentId,
          versionNumber,
          majorVersion: major,
          minorVersion: minor,
          patchVersion: patch,
          content: content as any,
          metadata: metadata as any,
          status: 'draft',
          previousVersionId: latestVersion?.id,
          tags: metadata.tags || [],
          checksum,
        },
      });

      // Record change
      await this.recordChange({
        versionId: newVersion.id,
        documentId,
        changeType: 'create',
        changedBy: metadata.createdBy,
        changedAt: new Date(),
        description: metadata.description || `Version ${versionNumber} created`,
      });

      this.logger.info(
        `Created version ${versionNumber} for document ${documentId}`
      );

      return newVersion;
    } catch (error) {
      this.logger.error(`Failed to create version: ${error}`);
      throw error;
    }
  }

  /**
   * Get a specific version
   */
  async getVersion(versionId: string): Promise<DocumentVersion | null> {
    try {
      const version = await this.prisma.documentVersion.findUnique({
        where: { id: versionId },
      });

      if (!version) return null;

      return {
        id: version.id,
        documentId: version.documentId,
        versionNumber: version.versionNumber,
        majorVersion: version.majorVersion,
        minorVersion: version.minorVersion,
        patchVersion: version.patchVersion,
        content: version.content as Record<string, any>,
        metadata: version.metadata as VersionMetadata,
        status: version.status as 'draft' | 'published' | 'archived',
        previousVersionId: version.previousVersionId || undefined,
        tags: version.tags,
        checksum: version.checksum,
      };
    } catch (error) {
      this.logger.error(`Failed to get version ${versionId}: ${error}`);
      return null;
    }
  }

  /**
   * Get latest version of a document
   */
  async getLatestVersion(documentId: string): Promise<DocumentVersion | null> {
    try {
      const version = await this.prisma.documentVersion.findFirst({
        where: { documentId },
        orderBy: { createdAt: 'desc' },
      });

      if (!version) return null;

      return {
        id: version.id,
        documentId: version.documentId,
        versionNumber: version.versionNumber,
        majorVersion: version.majorVersion,
        minorVersion: version.minorVersion,
        patchVersion: version.patchVersion,
        content: version.content as Record<string, any>,
        metadata: version.metadata as VersionMetadata,
        status: version.status as 'draft' | 'published' | 'archived',
        previousVersionId: version.previousVersionId || undefined,
        tags: version.tags,
        checksum: version.checksum,
      };
    } catch (error) {
      this.logger.error(
        `Failed to get latest version for ${documentId}: ${error}`
      );
      return null;
    }
  }

  /**
   * List all versions of a document
   */
  async listVersions(
    documentId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<DocumentVersion[]> {
    try {
      const versions = await this.prisma.documentVersion.findMany({
        where: { documentId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      });

      return versions.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        versionNumber: v.versionNumber,
        majorVersion: v.majorVersion,
        minorVersion: v.minorVersion,
        patchVersion: v.patchVersion,
        content: v.content as Record<string, any>,
        metadata: v.metadata as VersionMetadata,
        status: v.status as 'draft' | 'published' | 'archived',
        previousVersionId: v.previousVersionId || undefined,
        tags: v.tags,
        checksum: v.checksum,
      }));
    } catch (error) {
      this.logger.error(`Failed to list versions for ${documentId}: ${error}`);
      return [];
    }
  }

  /**
   * Rollback to a previous version
   */
  async rollback(
    documentId: string,
    targetVersionId: string,
    reason: string,
    performedBy: string
  ): Promise<DocumentVersion | null> {
    try {
      const targetVersion = await this.getVersion(targetVersionId);
      if (!targetVersion) {
        throw new Error(`Version ${targetVersionId} not found`);
      }

      // Create new version with rolled-back content
      const newVersion = await this.createVersion(
        documentId,
        targetVersion.content,
        {
          createdBy: performedBy,
          description: `Rollback to version ${targetVersion.versionNumber}: ${reason}`,
          isPublished: false,
        },
        'patch'
      );

      // Record rollback
      await this.recordChange({
        versionId: newVersion.id,
        documentId,
        changeType: 'rollback',
        changedBy: performedBy,
        changedAt: new Date(),
        description: `Rollback from ${targetVersion.versionNumber}: ${reason}`,
        previousVersionId: targetVersionId,
      });

      this.logger.info(
        `Rolled back document ${documentId} to version ${targetVersion.versionNumber}`
      );

      return newVersion;
    } catch (error) {
      this.logger.error(`Rollback failed: ${error}`);
      throw error;
    }
  }

  /**
   * Publish a version (mark as official release)
   */
  async publishVersion(
    versionId: string,
    publishedBy: string
  ): Promise<DocumentVersion | null> {
    try {
      const version = await this.getVersion(versionId);
      if (!version) return null;

      await this.prisma.documentVersion.update({
        where: { id: versionId },
        data: {
          status: 'published',
        },
      });

      // Record publication
      await this.recordChange({
        versionId,
        documentId: version.documentId,
        changeType: 'update',
        changedBy: publishedBy,
        changedAt: new Date(),
        description: `Version ${version.versionNumber} published`,
      });

      this.logger.info(`Published version ${version.versionNumber}`);

      version.status = 'published';
      return version;
    } catch (error) {
      this.logger.error(`Failed to publish version: ${error}`);
      throw error;
    }
  }

  /**
   * Compare two versions
   */
  async compareVersions(
    fromVersionId: string,
    toVersionId: string
  ): Promise<VersionComparison> {
    try {
      const fromVersion = await this.getVersion(fromVersionId);
      const toVersion = await this.getVersion(toVersionId);

      if (!fromVersion || !toVersion) {
        throw new Error('One or both versions not found');
      }

      const differences: VersionComparison['differences'] = [];
      const changesSummary = { added: 0, removed: 0, modified: 0 };

      // Compare fields
      const allKeys = new Set([
        ...Object.keys(fromVersion.content),
        ...Object.keys(toVersion.content),
      ]);

      for (const key of allKeys) {
        const oldValue = fromVersion.content[key];
        const newValue = toVersion.content[key];

        if (oldValue === undefined) {
          differences.push({
            field: key,
            oldValue,
            newValue,
            type: 'added',
          });
          changesSummary.added++;
        } else if (newValue === undefined) {
          differences.push({
            field: key,
            oldValue,
            newValue,
            type: 'removed',
          });
          changesSummary.removed++;
        } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
          differences.push({
            field: key,
            oldValue,
            newValue,
            type: 'modified',
          });
          changesSummary.modified++;
        }
      }

      return {
        fromVersion: fromVersion.versionNumber,
        toVersion: toVersion.versionNumber,
        differences,
        changesSummary,
      };
    } catch (error) {
      this.logger.error(`Comparison failed: ${error}`);
      throw error;
    }
  }

  /**
   * Get audit trail for a document
   */
  async getAuditTrail(
    documentId: string,
    limit: number = 100
  ): Promise<ChangeRecord[]> {
    try {
      const changes = await this.prisma.documentChangeRecord.findMany({
        where: { documentId },
        orderBy: { changedAt: 'desc' },
        take: limit,
      });

      return changes.map((c) => ({
        versionId: c.versionId,
        documentId: c.documentId,
        changeType: c.changeType as any,
        changedBy: c.changedBy,
        changedAt: c.changedAt,
        description: c.description,
        changes: c.changes as any,
        previousVersionId: c.previousVersionId || undefined,
        ipAddress: c.ipAddress || undefined,
        userAgent: c.userAgent || undefined,
      }));
    } catch (error) {
      this.logger.error(`Failed to get audit trail: ${error}`);
      return [];
    }
  }

  /**
   * Record a change
   */
  private async recordChange(record: ChangeRecord): Promise<void> {
    try {
      await this.prisma.documentChangeRecord.create({
        data: {
          versionId: record.versionId,
          documentId: record.documentId,
          changeType: record.changeType,
          changedBy: record.changedBy,
          changedAt: record.changedAt,
          description: record.description,
          changes: record.changes as any,
          previousVersionId: record.previousVersionId,
          ipAddress: record.ipAddress,
          userAgent: record.userAgent,
        },
      });
    } catch (error) {
      this.logger.error(`Failed to record change: ${error}`);
    }
  }

  /**
   * Calculate content checksum for integrity verification
   */
  private calculateChecksum(content: Record<string, any>): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    hash.update(JSON.stringify(content));
    return hash.digest('hex');
  }

  /**
   * Tag a version
   */
  async tagVersion(
    versionId: string,
    tags: string[],
    taggedBy: string
  ): Promise<DocumentVersion | null> {
    try {
      const version = await this.getVersion(versionId);
      if (!version) return null;

      const updatedTags = [...new Set([...version.tags, ...tags])];

      await this.prisma.documentVersion.update({
        where: { id: versionId },
        data: {
          tags: updatedTags,
        },
      });

      // Record tagging
      await this.recordChange({
        versionId,
        documentId: version.documentId,
        changeType: 'update',
        changedBy: taggedBy,
        changedAt: new Date(),
        description: `Tagged with: ${tags.join(', ')}`,
      });

      version.tags = updatedTags;
      return version;
    } catch (error) {
      this.logger.error(`Failed to tag version: ${error}`);
      throw error;
    }
  }

  /**
   * Get versions with specific tag
   */
  async getVersionsByTag(documentId: string, tag: string): Promise<DocumentVersion[]> {
    try {
      const versions = await this.prisma.documentVersion.findMany({
        where: {
          documentId,
          tags: { has: tag },
        },
        orderBy: { createdAt: 'desc' },
      });

      return versions.map((v) => ({
        id: v.id,
        documentId: v.documentId,
        versionNumber: v.versionNumber,
        majorVersion: v.majorVersion,
        minorVersion: v.minorVersion,
        patchVersion: v.patchVersion,
        content: v.content as Record<string, any>,
        metadata: v.metadata as VersionMetadata,
        status: v.status as 'draft' | 'published' | 'archived',
        previousVersionId: v.previousVersionId || undefined,
        tags: v.tags,
        checksum: v.checksum,
      }));
    } catch (error) {
      this.logger.error(`Failed to get versions by tag: ${error}`);
      return [];
    }
  }
}
