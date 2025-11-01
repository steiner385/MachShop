/**
 * Document Version Control Service Tests
 * Comprehensive test suite for version control, rollback, and audit trails
 * Issue #72 - Phase 1: Basic Version Control
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { Logger } from 'winston';
import { DocumentVersionControlService } from '../../services/DocumentVersionControlService';
import { DocumentVersion, VersionMetadata, ChangeRecord, VersionComparison } from '../../services/DocumentVersionControlService';

// Mock Prisma and Logger
vi.mock('@prisma/client');
vi.mock('winston');

describe('DocumentVersionControlService', () => {
  let service: DocumentVersionControlService;
  let mockPrisma: any;
  let mockLogger: any;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Create mock Prisma client
    mockPrisma = {
      documentVersion: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
      },
      documentChangeRecord: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
    };

    // Create mock logger
    mockLogger = {
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn(),
    };

    // Initialize service
    service = new DocumentVersionControlService(mockPrisma, mockLogger);
  });

  describe('Version Creation', () => {
    it('should create initial version with 0.0.1 semantic version', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        description: 'Initial version',
        isPublished: false,
      };

      const content = { title: 'Document', body: 'Content' };

      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);
      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'doc1-v0.0.1',
        documentId: 'doc1',
        versionNumber: '0.0.1',
        majorVersion: 0,
        minorVersion: 0,
        patchVersion: 1,
        content,
        metadata,
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: expect.any(String),
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const version = await service.createVersion('doc1', content, metadata, 'patch');

      expect(version.versionNumber).toBe('0.0.1');
      expect(version.majorVersion).toBe(0);
      expect(version.minorVersion).toBe(0);
      expect(version.patchVersion).toBe(1);
      expect(version.status).toBe('draft');
      expect(mockPrisma.documentVersion.create).toHaveBeenCalled();
      expect(mockPrisma.documentChangeRecord.create).toHaveBeenCalled();
    });

    it('should increment patch version for patch change type', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        description: 'Patch update',
        isPublished: false,
      };

      const content = { title: 'Updated Document' };

      // Mock existing version
      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: { title: 'Document' },
        metadata,
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      });

      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'doc1-v1.0.1',
        documentId: 'doc1',
        versionNumber: '1.0.1',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 1,
        content,
        metadata,
        status: 'draft',
        previousVersionId: 'doc1-v1.0.0',
        tags: [],
        checksum: expect.any(String),
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const version = await service.createVersion('doc1', content, metadata, 'patch');

      expect(version.versionNumber).toBe('1.0.1');
      expect(version.patchVersion).toBe(1);
      expect(version.previousVersionId).toBe('doc1-v1.0.0');
    });

    it('should increment minor version and reset patch for minor change type', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        isPublished: false,
      };

      const content = { title: 'Updated' };

      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        id: 'doc1-v1.0.5',
        documentId: 'doc1',
        versionNumber: '1.0.5',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 5,
        content: {},
        metadata,
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      });

      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'doc1-v1.1.0',
        documentId: 'doc1',
        versionNumber: '1.1.0',
        majorVersion: 1,
        minorVersion: 1,
        patchVersion: 0,
        content,
        metadata,
        status: 'draft',
        previousVersionId: 'doc1-v1.0.5',
        tags: [],
        checksum: expect.any(String),
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const version = await service.createVersion('doc1', content, metadata, 'minor');

      expect(version.versionNumber).toBe('1.1.0');
      expect(version.minorVersion).toBe(1);
      expect(version.patchVersion).toBe(0);
    });

    it('should increment major version and reset minor/patch for major change type', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        isPublished: false,
      };

      const content = { title: 'Major update' };

      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        id: 'doc1-v1.5.3',
        documentId: 'doc1',
        versionNumber: '1.5.3',
        majorVersion: 1,
        minorVersion: 5,
        patchVersion: 3,
        content: {},
        metadata,
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      });

      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'doc1-v2.0.0',
        documentId: 'doc1',
        versionNumber: '2.0.0',
        majorVersion: 2,
        minorVersion: 0,
        patchVersion: 0,
        content,
        metadata,
        status: 'draft',
        previousVersionId: 'doc1-v1.5.3',
        tags: [],
        checksum: expect.any(String),
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const version = await service.createVersion('doc1', content, metadata, 'major');

      expect(version.versionNumber).toBe('2.0.0');
      expect(version.majorVersion).toBe(2);
      expect(version.minorVersion).toBe(0);
      expect(version.patchVersion).toBe(0);
    });

    it('should record change after version creation', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        description: 'Initial version',
        isPublished: false,
      };

      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);
      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: {},
        metadata,
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      await service.createVersion('doc1', {}, metadata);

      expect(mockPrisma.documentChangeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: 'create',
            documentId: 'doc1',
            changedBy: 'user1',
          }),
        })
      );
    });

    it('should handle creation errors gracefully', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        isPublished: false,
      };

      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);
      mockPrisma.documentVersion.create.mockRejectedValue(new Error('Database error'));

      await expect(service.createVersion('doc1', {}, metadata)).rejects.toThrow(
        'Database error'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Version Retrieval', () => {
    it('should retrieve a specific version by ID', async () => {
      const mockVersion = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: { title: 'Document' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: null,
        tags: ['production'],
        checksum: 'abc123',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue(mockVersion);

      const version = await service.getVersion('doc1-v1.0.0');

      expect(version?.id).toBe(mockVersion.id);
      expect(version?.versionNumber).toBe(mockVersion.versionNumber);
      expect(version?.documentId).toBe(mockVersion.documentId);
      expect(version?.content).toEqual(mockVersion.content);
      expect(mockPrisma.documentVersion.findUnique).toHaveBeenCalledWith({
        where: { id: 'doc1-v1.0.0' },
      });
    });

    it('should return null when version not found', async () => {
      mockPrisma.documentVersion.findUnique.mockResolvedValue(null);

      const version = await service.getVersion('nonexistent');

      expect(version).toBeNull();
    });

    it('should retrieve latest version of a document', async () => {
      const mockVersion = {
        id: 'doc1-v1.0.1',
        documentId: 'doc1',
        versionNumber: '1.0.1',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 1,
        content: { title: 'Updated' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: 'doc1-v1.0.0',
        tags: [],
        checksum: 'def456',
      };

      mockPrisma.documentVersion.findFirst.mockResolvedValue(mockVersion);

      const version = await service.getLatestVersion('doc1');

      expect(version).toEqual(mockVersion);
      expect(mockPrisma.documentVersion.findFirst).toHaveBeenCalledWith({
        where: { documentId: 'doc1' },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return null when no version exists for document', async () => {
      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);

      const version = await service.getLatestVersion('doc1');

      expect(version).toBeNull();
    });

    it('should list all versions with pagination', async () => {
      const mockVersions = [
        {
          id: 'doc1-v1.0.2',
          documentId: 'doc1',
          versionNumber: '1.0.2',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 2,
          content: {},
          metadata: {},
          status: 'draft',
          previousVersionId: 'doc1-v1.0.1',
          tags: [],
          checksum: 'ghi789',
        },
        {
          id: 'doc1-v1.0.1',
          documentId: 'doc1',
          versionNumber: '1.0.1',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 1,
          content: {},
          metadata: {},
          status: 'published',
          previousVersionId: 'doc1-v1.0.0',
          tags: [],
          checksum: 'def456',
        },
      ];

      mockPrisma.documentVersion.findMany.mockResolvedValue(mockVersions);

      const versions = await service.listVersions('doc1', 50, 0);

      expect(versions).toHaveLength(2);
      expect(mockPrisma.documentVersion.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc1' },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should list versions with custom limit and offset', async () => {
      mockPrisma.documentVersion.findMany.mockResolvedValue([]);

      await service.listVersions('doc1', 10, 5);

      expect(mockPrisma.documentVersion.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc1' },
        orderBy: { createdAt: 'desc' },
        take: 10,
        skip: 5,
      });
    });

    it('should return empty array on retrieval error', async () => {
      mockPrisma.documentVersion.findMany.mockRejectedValue(new Error('Database error'));

      const versions = await service.listVersions('doc1');

      expect(versions).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Version Rollback', () => {
    it('should rollback to a previous version', async () => {
      const targetVersion = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: { title: 'Original' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      const newVersion = {
        id: 'doc1-v1.0.3',
        documentId: 'doc1',
        versionNumber: '1.0.3',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 3,
        content: { title: 'Original' },
        metadata: { createdBy: 'admin', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: 'doc1-v1.0.2',
        tags: [],
        checksum: 'jkl012',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue(targetVersion);
      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        ...targetVersion,
        id: 'doc1-v1.0.2',
        versionNumber: '1.0.2',
      });
      mockPrisma.documentVersion.create.mockResolvedValue(newVersion);
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const version = await service.rollback('doc1', 'doc1-v1.0.0', 'Revert bad changes', 'admin');

      expect(version?.content).toEqual(targetVersion.content);
      expect(mockPrisma.documentChangeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            changeType: 'rollback',
            changedBy: 'admin',
          }),
        })
      );
    });

    it('should throw error when target version not found', async () => {
      mockPrisma.documentVersion.findUnique.mockResolvedValue(null);

      await expect(
        service.rollback('doc1', 'nonexistent', 'reason', 'admin')
      ).rejects.toThrow('Version nonexistent not found');
    });

    it('should record rollback reason in audit trail', async () => {
      const targetVersion = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: {},
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue(targetVersion);
      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        ...targetVersion,
        id: 'doc1-v1.0.1',
      });
      mockPrisma.documentVersion.create.mockResolvedValue({
        ...targetVersion,
        id: 'doc1-v1.0.2',
        versionNumber: '1.0.2',
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      await service.rollback('doc1', 'doc1-v1.0.0', 'Critical bug found', 'admin');

      expect(mockPrisma.documentChangeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: expect.stringContaining('Critical bug found'),
          }),
        })
      );
    });
  });

  describe('Version Publishing', () => {
    it('should publish a version', async () => {
      const version = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: {},
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue({
        ...version,
        status: 'published',
      });
      mockPrisma.documentVersion.update.mockResolvedValue({
        ...version,
        status: 'published',
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const published = await service.publishVersion('doc1-v1.0.0', 'admin');

      expect(published?.status).toBe('published');
      expect(mockPrisma.documentVersion.update).toHaveBeenCalledWith({
        where: { id: 'doc1-v1.0.0' },
        data: { status: 'published' },
      });
    });

    it('should record publication in change history', async () => {
      const version = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: {},
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue(version);
      mockPrisma.documentVersion.update.mockResolvedValue({
        ...version,
        status: 'published',
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      await service.publishVersion('doc1-v1.0.0', 'admin');

      expect(mockPrisma.documentChangeRecord.create).toHaveBeenCalled();
    });

    it('should return null when version not found', async () => {
      mockPrisma.documentVersion.findUnique.mockResolvedValue(null);

      const published = await service.publishVersion('nonexistent', 'admin');

      expect(published).toBeNull();
    });
  });

  describe('Version Comparison', () => {
    it('should compare two versions and detect added fields', async () => {
      const fromVersion = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: { title: 'Document' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      const toVersion = {
        id: 'doc1-v1.0.1',
        documentId: 'doc1',
        versionNumber: '1.0.1',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 1,
        content: { title: 'Document', body: 'New content' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: 'doc1-v1.0.0',
        tags: [],
        checksum: 'def456',
      };

      mockPrisma.documentVersion.findUnique
        .mockResolvedValueOnce(fromVersion)
        .mockResolvedValueOnce(toVersion);

      const comparison = await service.compareVersions('doc1-v1.0.0', 'doc1-v1.0.1');

      expect(comparison.fromVersion).toBe('1.0.0');
      expect(comparison.toVersion).toBe('1.0.1');
      expect(comparison.differences).toHaveLength(1);
      expect(comparison.differences[0].type).toBe('added');
      expect(comparison.differences[0].field).toBe('body');
      expect(comparison.changesSummary.added).toBe(1);
    });

    it('should detect removed fields', async () => {
      const fromVersion = {
        id: 'doc1-v1.0.1',
        documentId: 'doc1',
        versionNumber: '1.0.1',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 1,
        content: { title: 'Document', body: 'Content', deprecated: 'field' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: 'doc1-v1.0.0',
        tags: [],
        checksum: 'def456',
      };

      const toVersion = {
        id: 'doc1-v1.0.2',
        documentId: 'doc1',
        versionNumber: '1.0.2',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 2,
        content: { title: 'Document', body: 'Content' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: 'doc1-v1.0.1',
        tags: [],
        checksum: 'ghi789',
      };

      mockPrisma.documentVersion.findUnique
        .mockResolvedValueOnce(fromVersion)
        .mockResolvedValueOnce(toVersion);

      const comparison = await service.compareVersions('doc1-v1.0.1', 'doc1-v1.0.2');

      expect(comparison.differences).toHaveLength(1);
      expect(comparison.differences[0].type).toBe('removed');
      expect(comparison.differences[0].field).toBe('deprecated');
      expect(comparison.changesSummary.removed).toBe(1);
    });

    it('should detect modified fields', async () => {
      const fromVersion = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: { title: 'Old Title', status: 'draft' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      const toVersion = {
        id: 'doc1-v1.0.1',
        documentId: 'doc1',
        versionNumber: '1.0.1',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 1,
        content: { title: 'New Title', status: 'published' },
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'draft',
        previousVersionId: 'doc1-v1.0.0',
        tags: [],
        checksum: 'def456',
      };

      mockPrisma.documentVersion.findUnique
        .mockResolvedValueOnce(fromVersion)
        .mockResolvedValueOnce(toVersion);

      const comparison = await service.compareVersions('doc1-v1.0.0', 'doc1-v1.0.1');

      expect(comparison.differences).toHaveLength(2);
      expect(comparison.differences.filter((d) => d.type === 'modified')).toHaveLength(2);
      expect(comparison.changesSummary.modified).toBe(2);
    });

    it('should throw error when version not found', async () => {
      mockPrisma.documentVersion.findUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({});

      await expect(
        service.compareVersions('doc1-v1.0.0', 'doc1-v1.0.1')
      ).rejects.toThrow('One or both versions not found');
    });
  });

  describe('Audit Trail', () => {
    it('should retrieve audit trail for document', async () => {
      const mockChanges = [
        {
          versionId: 'doc1-v1.0.2',
          documentId: 'doc1',
          changeType: 'update',
          changedBy: 'user1',
          changedAt: new Date(),
          description: 'Updated content',
          changes: null,
          previousVersionId: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        {
          versionId: 'doc1-v1.0.1',
          documentId: 'doc1',
          changeType: 'create',
          changedBy: 'user1',
          changedAt: new Date(),
          description: 'Created version',
          changes: null,
          previousVersionId: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ];

      mockPrisma.documentChangeRecord.findMany.mockResolvedValue(mockChanges);

      const trail = await service.getAuditTrail('doc1');

      expect(trail).toHaveLength(2);
      expect(trail[0].changeType).toBe('update');
      expect(trail[1].changeType).toBe('create');
      expect(mockPrisma.documentChangeRecord.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc1' },
        orderBy: { changedAt: 'desc' },
        take: 100,
      });
    });

    it('should return audit trail with custom limit', async () => {
      mockPrisma.documentChangeRecord.findMany.mockResolvedValue([]);

      await service.getAuditTrail('doc1', 50);

      expect(mockPrisma.documentChangeRecord.findMany).toHaveBeenCalledWith({
        where: { documentId: 'doc1' },
        orderBy: { changedAt: 'desc' },
        take: 50,
      });
    });

    it('should return empty array on error', async () => {
      mockPrisma.documentChangeRecord.findMany.mockRejectedValue(
        new Error('Database error')
      );

      const trail = await service.getAuditTrail('doc1');

      expect(trail).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Version Tagging', () => {
    it('should tag a version', async () => {
      const version = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: {},
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue(version);
      mockPrisma.documentVersion.update.mockResolvedValue({
        ...version,
        tags: ['production', 'stable'],
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const tagged = await service.tagVersion('doc1-v1.0.0', ['production', 'stable'], 'admin');

      expect(tagged?.tags).toContain('production');
      expect(tagged?.tags).toContain('stable');
      expect(mockPrisma.documentVersion.update).toHaveBeenCalled();
    });

    it('should deduplicate tags', async () => {
      const version = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: {},
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: null,
        tags: ['production'],
        checksum: 'abc123',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue(version);
      mockPrisma.documentVersion.update.mockResolvedValue({
        ...version,
        tags: ['production', 'stable'],
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const tagged = await service.tagVersion('doc1-v1.0.0', ['production', 'stable'], 'admin');

      expect(tagged?.tags.filter((t) => t === 'production')).toHaveLength(1);
    });

    it('should record tagging in change history', async () => {
      const version = {
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: {},
        metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
        status: 'published',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      };

      mockPrisma.documentVersion.findUnique.mockResolvedValue(version);
      mockPrisma.documentVersion.update.mockResolvedValue({
        ...version,
        tags: ['qa', 'review'],
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      await service.tagVersion('doc1-v1.0.0', ['qa', 'review'], 'admin');

      expect(mockPrisma.documentChangeRecord.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            description: expect.stringContaining('qa'),
          }),
        })
      );
    });

    it('should return null when version not found', async () => {
      mockPrisma.documentVersion.findUnique.mockResolvedValue(null);

      const tagged = await service.tagVersion('nonexistent', ['tag'], 'admin');

      expect(tagged).toBeNull();
    });
  });

  describe('Get Versions by Tag', () => {
    it('should retrieve versions with specific tag', async () => {
      const mockVersions = [
        {
          id: 'doc1-v1.0.1',
          documentId: 'doc1',
          versionNumber: '1.0.1',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 1,
          content: {},
          metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
          status: 'published',
          previousVersionId: 'doc1-v1.0.0',
          tags: ['production', 'stable'],
          checksum: 'def456',
        },
        {
          id: 'doc1-v1.0.0',
          documentId: 'doc1',
          versionNumber: '1.0.0',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 0,
          content: {},
          metadata: { createdBy: 'user1', createdAt: new Date(), isPublished: false },
          status: 'published',
          previousVersionId: null,
          tags: ['production'],
          checksum: 'abc123',
        },
      ];

      mockPrisma.documentVersion.findMany.mockResolvedValue(mockVersions);

      const versions = await service.getVersionsByTag('doc1', 'production');

      expect(versions).toHaveLength(2);
      expect(versions.every((v) => v.tags.includes('production'))).toBe(true);
      expect(mockPrisma.documentVersion.findMany).toHaveBeenCalledWith({
        where: {
          documentId: 'doc1',
          tags: { has: 'production' },
        },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should return empty array when no versions have tag', async () => {
      mockPrisma.documentVersion.findMany.mockResolvedValue([]);

      const versions = await service.getVersionsByTag('doc1', 'nonexistent');

      expect(versions).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockPrisma.documentVersion.findMany.mockRejectedValue(new Error('Database error'));

      const versions = await service.getVersionsByTag('doc1', 'tag');

      expect(versions).toEqual([]);
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Checksum Integrity', () => {
    it('should generate consistent checksums for same content', async () => {
      const content = { title: 'Document', body: 'Content' };
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        isPublished: false,
      };

      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);
      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'doc1-v1.0.0',
        documentId: 'doc1',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content,
        metadata,
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: expect.any(String),
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const version1 = await service.createVersion('doc1', content, metadata);

      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        id: 'doc1-v1.0.0',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content,
        metadata,
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: version1.checksum,
      });
      mockPrisma.documentVersion.create.mockResolvedValue({
        id: 'doc1-v1.0.1',
        documentId: 'doc1',
        versionNumber: '1.0.1',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 1,
        content,
        metadata,
        status: 'draft',
        previousVersionId: 'doc1-v1.0.0',
        tags: [],
        checksum: expect.any(String),
      });

      const version2 = await service.createVersion('doc1', content, metadata, 'patch');

      expect(version1.checksum).toBe(version2.checksum);
    });

    it('should generate different checksums for different content', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        isPublished: false,
      };

      const content1 = { title: 'Document 1' };
      const content2 = { title: 'Document 2' };

      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);
      mockPrisma.documentVersion.create
        .mockResolvedValueOnce({
          id: 'doc1-v1.0.0',
          documentId: 'doc1',
          versionNumber: '1.0.0',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 0,
          content: content1,
          metadata,
          status: 'draft',
          previousVersionId: null,
          tags: [],
          checksum: 'checksum1',
        })
        .mockResolvedValueOnce({
          id: 'doc1-v1.0.1',
          documentId: 'doc1',
          versionNumber: '1.0.1',
          majorVersion: 1,
          minorVersion: 0,
          patchVersion: 1,
          content: content2,
          metadata,
          status: 'draft',
          previousVersionId: 'doc1-v1.0.0',
          tags: [],
          checksum: 'checksum2',
        });
      mockPrisma.documentChangeRecord.create.mockResolvedValue({});

      const version1 = await service.createVersion('doc1', content1, metadata);

      mockPrisma.documentVersion.findFirst.mockResolvedValue({
        id: 'doc1-v1.0.0',
        versionNumber: '1.0.0',
        majorVersion: 1,
        minorVersion: 0,
        patchVersion: 0,
        content: content1,
        metadata,
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: 'checksum1',
      });

      const version2 = await service.createVersion('doc1', content2, metadata, 'patch');

      expect(version1.checksum).not.toBe(version2.checksum);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors in createVersion during create', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        isPublished: false,
      };

      const dbError = new Error('Database connection failed');
      mockPrisma.documentVersion.findFirst.mockResolvedValue(null);
      mockPrisma.documentVersion.create.mockRejectedValue(dbError);

      await expect(service.createVersion('doc1', {}, metadata)).rejects.toThrow(
        'Database connection failed'
      );
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle errors in getVersion', async () => {
      mockPrisma.documentVersion.findUnique.mockRejectedValue(
        new Error('Query timeout')
      );

      const version = await service.getVersion('doc1-v1.0.0');

      expect(version).toBeNull();
      expect(mockLogger.error).toHaveBeenCalled();
    });

    it('should handle errors in compareVersions', async () => {
      mockPrisma.documentVersion.findUnique.mockRejectedValue(
        new Error('Database error')
      );

      await expect(
        service.compareVersions('doc1-v1.0.0', 'doc1-v1.0.1')
      ).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalled();
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete version lifecycle', async () => {
      const metadata: VersionMetadata = {
        createdBy: 'user1',
        createdAt: new Date(),
        description: 'Initial version',
        isPublished: false,
      };

      // Create version
      mockPrisma.documentVersion.findFirst.mockResolvedValueOnce(null);
      mockPrisma.documentVersion.create.mockResolvedValueOnce({
        id: 'doc1-v0.0.1',
        documentId: 'doc1',
        versionNumber: '0.0.1',
        majorVersion: 0,
        minorVersion: 0,
        patchVersion: 1,
        content: { title: 'Initial' },
        metadata,
        status: 'draft',
        previousVersionId: null,
        tags: [],
        checksum: 'abc123',
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValueOnce({});

      const created = await service.createVersion('doc1', { title: 'Initial' }, metadata);
      expect(created.versionNumber).toBe('0.0.1');

      // Publish version
      mockPrisma.documentVersion.findUnique.mockResolvedValueOnce(created);
      mockPrisma.documentVersion.update.mockResolvedValueOnce({
        ...created,
        status: 'published',
      });
      mockPrisma.documentChangeRecord.create.mockResolvedValueOnce({});

      const published = await service.publishVersion('doc1-v0.0.1', 'admin');
      expect(published?.status).toBe('published');

      // Get audit trail
      mockPrisma.documentChangeRecord.findMany.mockResolvedValueOnce([
        {
          versionId: 'doc1-v1.0.0',
          documentId: 'doc1',
          changeType: 'update',
          changedBy: 'admin',
          changedAt: new Date(),
          description: 'Version 1.0.0 published',
          changes: null,
          previousVersionId: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
        {
          versionId: 'doc1-v1.0.0',
          documentId: 'doc1',
          changeType: 'create',
          changedBy: 'user1',
          changedAt: new Date(),
          description: 'Version 1.0.0 created',
          changes: null,
          previousVersionId: null,
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        },
      ]);

      const trail = await service.getAuditTrail('doc1');
      expect(trail).toHaveLength(2);
      expect(trail.some((t) => t.changeType === 'create')).toBe(true);
    });
  });
});
