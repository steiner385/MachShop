import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import MetadataExtractor from '../../tools/metadata-extractor';
import { SchemaMetadata } from '../../tools/types/schema-metadata';

// Mock fs module
vi.mock('fs', () => ({
  promises: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn()
  },
  existsSync: vi.fn(),
  statSync: vi.fn()
}));

describe('MetadataExtractor', () => {
  let extractor: MetadataExtractor;
  let mockSchema: string;

  beforeEach(() => {
    // Sample Prisma schema for testing
    mockSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum UserRole {
  ADMIN
  USER
  OPERATOR
}

model User {
  id        String   @id @default(cuid())
  username  String   @unique
  email     String   @unique
  isActive  Boolean  @default(true)
  role      UserRole @default(USER)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  posts     Post[]

  @@map("users")
}

model Post {
  id       String @id @default(cuid())
  title    String
  content  String?
  authorId String
  author   User   @relation(fields: [authorId], references: [id])

  @@map("posts")
}
    `.trim();

    extractor = new MetadataExtractor('./test-schema.prisma');

    // Mock fs.promises.readFile to return our test schema
    (fs.promises.readFile as any).mockResolvedValue(mockSchema);
    (fs.promises.writeFile as any).mockResolvedValue(undefined);
    (fs.promises.mkdir as any).mockResolvedValue(undefined);
    (fs.existsSync as any).mockReturnValue(true);
    (fs.statSync as any).mockReturnValue({ size: 1000 });

    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadSchema', () => {
    it('should load schema file successfully', async () => {
      await extractor.loadSchema();

      expect(fs.promises.readFile).toHaveBeenCalledWith(
        path.resolve('./test-schema.prisma'),
        'utf8'
      );
    });

    it('should throw error if schema file cannot be read', async () => {
      (fs.promises.readFile as any).mockRejectedValue(new Error('File not found'));

      await expect(extractor.loadSchema()).rejects.toThrow('Failed to load schema file');
    });
  });

  describe('extractMetadata', () => {
    it('should extract comprehensive metadata from schema', async () => {
      const metadata = await extractor.extractMetadata();

      expect(metadata).toMatchObject({
        totalModels: 2,
        totalFields: expect.any(Number),
        totalRelationships: expect.any(Number),
        generatedAt: expect.any(String)
      });

      expect(metadata.models).toHaveLength(2);
      expect(metadata.enums).toHaveLength(1);
    });

    it('should extract models with correct structure', async () => {
      const metadata = await extractor.extractMetadata();

      const userModel = metadata.models.find(m => m.name === 'User');
      expect(userModel).toBeDefined();
      expect(userModel).toMatchObject({
        name: 'User',
        category: expect.any(String),
        isJunctionTable: false,
        fields: expect.arrayContaining([
          expect.objectContaining({
            name: 'id',
            type: 'String',
            isId: true
          }),
          expect.objectContaining({
            name: 'username',
            type: 'String',
            isUnique: true
          })
        ])
      });
    });

    it('should extract relationships correctly', async () => {
      const metadata = await extractor.extractMetadata();

      const userModel = metadata.models.find(m => m.name === 'User');
      const postModel = metadata.models.find(m => m.name === 'Post');

      expect(userModel?.relationships).toContainEqual(
        expect.objectContaining({
          type: 'one-to-many',
          relatedModel: 'Post',
          fieldName: 'posts'
        })
      );

      expect(postModel?.relationships).toContainEqual(
        expect.objectContaining({
          type: 'one-to-one',
          relatedModel: 'User',
          fieldName: 'author'
        })
      );
    });

    it('should extract enums correctly', async () => {
      const metadata = await extractor.extractMetadata();

      expect(metadata.enums).toHaveLength(1);
      expect(metadata.enums[0]).toMatchObject({
        name: 'UserRole',
        values: [
          { name: 'ADMIN' },
          { name: 'USER' },
          { name: 'OPERATOR' }
        ]
      });
    });

    it('should categorize models correctly', async () => {
      const metadata = await extractor.extractMetadata();

      const userModel = metadata.models.find(m => m.name === 'User');
      expect(userModel?.category).toBe('Personnel Management');
    });

    it('should detect junction tables', async () => {
      // Add a junction table to the schema
      const schemaWithJunction = mockSchema + `

model UserPost {
  userId String
  postId String
  user   User   @relation(fields: [userId], references: [id])
  post   Post   @relation(fields: [postId], references: [id])

  @@id([userId, postId])
}
      `;

      (fs.promises.readFile as any).mockResolvedValue(schemaWithJunction);

      const metadata = await extractor.extractMetadata();
      const junctionModel = metadata.models.find(m => m.name === 'UserPost');

      expect(junctionModel?.isJunctionTable).toBe(true);
    });
  });

  describe('field parsing', () => {
    it('should parse field types correctly', async () => {
      const metadata = await extractor.extractMetadata();
      const userModel = metadata.models.find(m => m.name === 'User');

      const idField = userModel?.fields.find(f => f.name === 'id');
      expect(idField).toMatchObject({
        name: 'id',
        type: 'String',
        kind: 'scalar',
        isId: true,
        hasDefaultValue: true,
        defaultValue: 'cuid()'
      });

      const roleField = userModel?.fields.find(f => f.name === 'role');
      expect(roleField).toMatchObject({
        name: 'role',
        type: 'UserRole',
        kind: 'enum',
        hasDefaultValue: true,
        defaultValue: 'USER'
      });
    });

    it('should handle optional fields correctly', async () => {
      const metadata = await extractor.extractMetadata();
      const postModel = metadata.models.find(m => m.name === 'Post');

      const contentField = postModel?.fields.find(f => f.name === 'content');
      expect(contentField?.isOptional).toBe(true);

      const titleField = postModel?.fields.find(f => f.name === 'title');
      expect(titleField?.isOptional).toBe(false);
    });

    it('should extract relation information', async () => {
      const metadata = await extractor.extractMetadata();
      const postModel = metadata.models.find(m => m.name === 'Post');

      const authorField = postModel?.fields.find(f => f.name === 'author');
      expect(authorField).toMatchObject({
        name: 'author',
        type: 'User',
        kind: 'object',
        relationFromFields: ['authorId'],
        relationToFields: ['id']
      });
    });
  });

  describe('exportToFile', () => {
    it('should export metadata to JSON file', async () => {
      const metadata = await extractor.extractMetadata();
      const outputPath = './test-output.json';

      await extractor.exportToFile(metadata, outputPath);

      expect(fs.promises.writeFile).toHaveBeenCalledWith(
        outputPath,
        JSON.stringify(metadata, null, 2),
        'utf8'
      );
    });
  });

  describe('edge cases', () => {
    it('should handle empty schema gracefully', async () => {
      const emptySchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
      `;

      (fs.promises.readFile as any).mockResolvedValue(emptySchema);

      const metadata = await extractor.extractMetadata();

      expect(metadata.totalModels).toBe(0);
      expect(metadata.totalFields).toBe(0);
      expect(metadata.models).toHaveLength(0);
      expect(metadata.enums).toHaveLength(0);
    });

    it('should handle complex field attributes', async () => {
      const complexSchema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model ComplexModel {
  id          String    @id @default(cuid())
  uniqueField String    @unique
  indexedField String   @map("indexed_column")
  defaultInt  Int       @default(42)
  defaultBool Boolean   @default(false)
  arrayField  String[]

  @@index([indexedField])
  @@unique([uniqueField, indexedField])
  @@map("complex_models")
}
      `;

      (fs.promises.readFile as any).mockResolvedValue(complexSchema);

      const metadata = await extractor.extractMetadata();
      const model = metadata.models[0];

      expect(model.name).toBe('ComplexModel');
      expect(model.uniqueFields).toHaveLength(1);
      expect(model.indices).toHaveLength(1);

      const arrayField = model.fields.find(f => f.name === 'arrayField');
      expect(arrayField?.isList).toBe(true);
    });

    it('should handle malformed schema gracefully', async () => {
      const malformedSchema = `
generator client {
  provider = "prisma-client-js"
}

model InvalidModel {
  id String @id
  // Missing field type
  badField
      `;

      (fs.promises.readFile as any).mockResolvedValue(malformedSchema);

      const metadata = await extractor.extractMetadata();

      // Should not crash and should handle valid parts
      expect(metadata.models).toHaveLength(1);
      expect(metadata.models[0].name).toBe('InvalidModel');
    });
  });
});