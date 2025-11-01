import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import CauseCodeService from '../CauseCodeService';
import prisma from '../../lib/database';
import { CauseCode, CauseCodeCategory } from '@prisma/client';

describe('CauseCodeService', () => {
  let testCategory: CauseCodeCategory;
  let testCauseCode: CauseCode;
  let childCauseCode: CauseCode;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.causeCodeHistory.deleteMany({});
    await prisma.causeCode.deleteMany({});
    await prisma.causeCodeCategory.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.causeCodeHistory.deleteMany({});
    await prisma.causeCode.deleteMany({});
    await prisma.causeCodeCategory.deleteMany({});
  });

  describe('Category Operations', () => {
    it('should create a new cause code category', async () => {
      const result = await CauseCodeService.createCategory({
        code: 'MATERIAL',
        name: 'Material Issues',
        description: 'Issues related to material defects',
        createdBy: 'test-user',
      });

      expect(result).toBeDefined();
      expect(result.code).toBe('MATERIAL');
      expect(result.name).toBe('Material Issues');
      expect(result.enabled).toBe(true);

      testCategory = result;
    });

    it('should not create a category with duplicate code', async () => {
      await expect(
        CauseCodeService.createCategory({
          code: 'MATERIAL',
          name: 'Duplicate Material',
          createdBy: 'test-user',
        })
      ).rejects.toThrow('Category code MATERIAL already exists');
    });

    it('should create a category with parent', async () => {
      const parentResult = await CauseCodeService.createCategory({
        code: 'PARENT_CAT',
        name: 'Parent Category',
        createdBy: 'test-user',
      });

      const childResult = await CauseCodeService.createCategory({
        code: 'CHILD_CAT',
        name: 'Child Category',
        parentId: parentResult.id,
        createdBy: 'test-user',
      });

      expect(childResult.parentId).toBe(parentResult.id);
    });

    it('should fail when parent category does not exist', async () => {
      await expect(
        CauseCodeService.createCategory({
          code: 'ORPHAN',
          name: 'Orphan Category',
          parentId: 'nonexistent-id',
          createdBy: 'test-user',
        })
      ).rejects.toThrow('Parent category nonexistent-id not found');
    });

    it('should retrieve all enabled categories', async () => {
      const categories = await CauseCodeService.getCategories();

      expect(Array.isArray(categories)).toBe(true);
      expect(categories.length).toBeGreaterThan(0);
      expect(categories.every((c) => c.enabled)).toBe(true);
    });
  });

  describe('Cause Code Operations', () => {
    it('should create a new cause code', async () => {
      const result = await CauseCodeService.createCauseCode({
        code: 'MAT-001',
        name: 'Defective Material',
        description: 'Material received in defective condition',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      expect(result).toBeDefined();
      expect(result.code).toBe('MAT-001');
      expect(result.name).toBe('Defective Material');
      expect(result.categoryId).toBe(testCategory.id);
      expect(result.level).toBe(1);
      expect(result.enabled).toBe(true);
      expect(result.usageCount).toBe(0);

      testCauseCode = result;
    });

    it('should not create a cause code with duplicate code', async () => {
      await expect(
        CauseCodeService.createCauseCode({
          code: 'MAT-001',
          name: 'Another Defect',
          categoryId: testCategory.id,
          createdBy: 'test-user',
        })
      ).rejects.toThrow('Cause code MAT-001 already exists');
    });

    it('should fail when category does not exist', async () => {
      await expect(
        CauseCodeService.createCauseCode({
          code: 'INVALID-001',
          name: 'Invalid Code',
          categoryId: 'nonexistent-category',
          createdBy: 'test-user',
        })
      ).rejects.toThrow('Category nonexistent-category not found');
    });

    it('should create a hierarchical cause code with parent', async () => {
      const result = await CauseCodeService.createCauseCode({
        code: 'MAT-001-A',
        name: 'Scratched Surface',
        description: 'Material surface scratched',
        categoryId: testCategory.id,
        parentId: testCauseCode.id,
        createdBy: 'test-user',
      });

      expect(result.parentId).toBe(testCauseCode.id);
      expect(result.level).toBe(2);

      childCauseCode = result;
    });

    it('should fail when parent cause code does not exist', async () => {
      await expect(
        CauseCodeService.createCauseCode({
          code: 'MAT-002-A',
          name: 'Invalid Child',
          categoryId: testCategory.id,
          parentId: 'nonexistent-parent',
          createdBy: 'test-user',
        })
      ).rejects.toThrow('Parent cause code nonexistent-parent not found');
    });

    it('should retrieve a specific cause code', async () => {
      const result = await CauseCodeService.getCauseCode(testCauseCode.id);

      expect(result).toBeDefined();
      expect(result?.id).toBe(testCauseCode.id);
      expect(result?.code).toBe('MAT-001');
      expect(result?.category).toBeDefined();
    });

    it('should return null for nonexistent cause code', async () => {
      const result = await CauseCodeService.getCauseCode('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('Hierarchy Operations', () => {
    it('should build correct hierarchy', async () => {
      const hierarchy = await CauseCodeService.getHierarchy(testCategory.id);

      expect(Array.isArray(hierarchy)).toBe(true);
      expect(hierarchy.length).toBeGreaterThan(0);

      const root = hierarchy.find((h) => h.code === 'MAT-001');
      expect(root).toBeDefined();
      expect(root?.children).toBeDefined();
      expect(root?.children.length).toBeGreaterThan(0);

      const child = root?.children.find((c) => c.code === 'MAT-001-A');
      expect(child).toBeDefined();
      expect(child?.level).toBe(2);
    });

    it('should get full path for cause code', async () => {
      const path = await CauseCodeService.getFullPath(childCauseCode.id);

      expect(path).toBe('MAT-001 > MAT-001-A');
    });

    it('should return empty string for nonexistent cause code path', async () => {
      const path = await CauseCodeService.getFullPath('nonexistent-id');

      expect(path).toBe('');
    });

    it('should get cause codes by category', async () => {
      const codes = await CauseCodeService.getCauseCodesByCategory(testCategory.id);

      expect(Array.isArray(codes)).toBe(true);
      expect(codes.length).toBeGreaterThan(0);
      expect(codes.every((c) => c.categoryId === testCategory.id && c.enabled)).toBe(true);
    });
  });

  describe('Update Operations', () => {
    it('should update a cause code', async () => {
      const updated = await CauseCodeService.updateCauseCode(testCauseCode.id, {
        name: 'Updated Defective Material',
        description: 'Updated description',
        updatedBy: 'test-user',
        reason: 'Updated for clarity',
      });

      expect(updated.name).toBe('Updated Defective Material');
      expect(updated.description).toBe('Updated description');
      expect(updated.updatedAt > testCauseCode.updatedAt).toBe(true);
    });

    it('should fail when updating nonexistent cause code', async () => {
      await expect(
        CauseCodeService.updateCauseCode('nonexistent-id', {
          name: 'Updated',
          updatedBy: 'test-user',
        })
      ).rejects.toThrow('Cause code nonexistent-id not found');
    });

    it('should update enable/disable status', async () => {
      const result = await CauseCodeService.updateCauseCode(testCauseCode.id, {
        enabled: false,
        updatedBy: 'test-user',
        reason: 'Testing disable',
      });

      expect(result.enabled).toBe(false);
    });

    it('should re-enable a cause code', async () => {
      const result = await CauseCodeService.updateCauseCode(testCauseCode.id, {
        enabled: true,
        updatedBy: 'test-user',
      });

      expect(result.enabled).toBe(true);
    });
  });

  describe('Disable Operations', () => {
    it('should disable a cause code', async () => {
      // Create a new code specifically for disabling
      const codeToDisable = await CauseCodeService.createCauseCode({
        code: 'TEST-DISABLE-001',
        name: 'Test Disable Code',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      const result = await CauseCodeService.disableCauseCode(
        codeToDisable.id,
        'Testing disable function',
        'test-user'
      );

      expect(result.enabled).toBe(false);
    });

    it('should fail when disabling already disabled code', async () => {
      // Create and disable a code first
      const codeToDisable = await CauseCodeService.createCauseCode({
        code: 'TEST-ALREADY-DISABLED',
        name: 'Already Disabled',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      await CauseCodeService.disableCauseCode(codeToDisable.id, 'First disable', 'test-user');

      // Try to disable again
      await expect(
        CauseCodeService.disableCauseCode(codeToDisable.id, 'Second disable', 'test-user')
      ).rejects.toThrow(`Cause code ${codeToDisable.id} is already disabled`);
    });

    it('should cascade disable to child codes', async () => {
      // Create parent and child
      const parent = await CauseCodeService.createCauseCode({
        code: 'PARENT-CASCADE',
        name: 'Parent for cascade test',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      const child = await CauseCodeService.createCauseCode({
        code: 'CHILD-CASCADE',
        name: 'Child for cascade test',
        categoryId: testCategory.id,
        parentId: parent.id,
        createdBy: 'test-user',
      });

      // Disable parent
      await CauseCodeService.disableCauseCode(parent.id, 'Testing cascade', 'test-user');

      // Check child is also disabled
      const disabledChild = await CauseCodeService.getCauseCode(child.id);
      expect(disabledChild?.enabled).toBe(false);
    });
  });

  describe('Usage Tracking', () => {
    it('should record usage of a cause code', async () => {
      const before = await CauseCodeService.getCauseCode(testCauseCode.id);
      const initialCount = before?.usageCount || 0;

      await CauseCodeService.recordUsage(testCauseCode.id);

      const after = await CauseCodeService.getCauseCode(testCauseCode.id);
      expect(after?.usageCount).toBe(initialCount + 1);
      expect(after?.lastUsedAt).toBeDefined();
    });

    it('should increment usage count multiple times', async () => {
      const code = await CauseCodeService.createCauseCode({
        code: 'USAGE-TEST-001',
        name: 'Usage Test Code',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      await CauseCodeService.recordUsage(code.id);
      await CauseCodeService.recordUsage(code.id);
      await CauseCodeService.recordUsage(code.id);

      const updated = await CauseCodeService.getCauseCode(code.id);
      expect(updated?.usageCount).toBe(3);
    });
  });

  describe('Search Operations', () => {
    it('should search cause codes by code', async () => {
      const results = await CauseCodeService.search('MAT-001', 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.some((r) => r.code === 'MAT-001')).toBe(true);
    });

    it('should search cause codes by name', async () => {
      const results = await CauseCodeService.search('Defective', 10);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });

    it('should search cause codes by description', async () => {
      const results = await CauseCodeService.search('Material surface', 10);

      expect(Array.isArray(results)).toBe(true);
    });

    it('should respect search limit', async () => {
      const results = await CauseCodeService.search('', 5);

      expect(results.length).toBeLessThanOrEqual(5);
    });

    it('should be case insensitive', async () => {
      const resultsLower = await CauseCodeService.search('mat-001', 10);
      const resultsUpper = await CauseCodeService.search('MAT-001', 10);

      expect(resultsLower.length).toBe(resultsUpper.length);
    });
  });

  describe('Statistics Operations', () => {
    it('should get cause code statistics', async () => {
      const stats = await CauseCodeService.getStatistics();

      expect(stats).toBeDefined();
      expect(typeof stats.totalCategories).toBe('number');
      expect(typeof stats.totalCauseCodes).toBe('number');
      expect(Array.isArray(stats.mostUsedCodes)).toBe(true);
      expect(Array.isArray(stats.recentlyCreated)).toBe(true);
    });

    it('should return top 10 most used codes', async () => {
      const stats = await CauseCodeService.getStatistics();

      expect(stats.mostUsedCodes.length).toBeLessThanOrEqual(10);
      expect(stats.mostUsedCodes.every((c) => typeof c.usageCount === 'number')).toBe(true);

      // Verify they are sorted by usage count (descending)
      for (let i = 0; i < stats.mostUsedCodes.length - 1; i++) {
        expect(stats.mostUsedCodes[i].usageCount >= stats.mostUsedCodes[i + 1].usageCount).toBe(
          true
        );
      }
    });

    it('should return top 10 recently created codes', async () => {
      const stats = await CauseCodeService.getStatistics();

      expect(stats.recentlyCreated.length).toBeLessThanOrEqual(10);
      expect(
        stats.recentlyCreated.every((c) => c.createdAt instanceof Date)
      ).toBe(true);

      // Verify they are sorted by created date (descending)
      for (let i = 0; i < stats.recentlyCreated.length - 1; i++) {
        expect(stats.recentlyCreated[i].createdAt >= stats.recentlyCreated[i + 1].createdAt).toBe(
          true
        );
      }
    });
  });

  describe('History Operations', () => {
    it('should track creation in history', async () => {
      const code = await CauseCodeService.createCauseCode({
        code: 'HISTORY-TEST-001',
        name: 'History Test Code',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      const history = await CauseCodeService.getHistory(code.id, 10);

      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeGreaterThan(0);

      const creationEntry = history.find((h) => h.changeType === 'CREATED');
      expect(creationEntry).toBeDefined();
      expect(creationEntry?.changeReason).toBe('Created new cause code');
    });

    it('should track updates in history', async () => {
      const code = await CauseCodeService.createCauseCode({
        code: 'UPDATE-HISTORY-001',
        name: 'Update History Test',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      await CauseCodeService.updateCauseCode(code.id, {
        name: 'Updated Name',
        updatedBy: 'test-user',
        reason: 'Testing history update',
      });

      const history = await CauseCodeService.getHistory(code.id, 10);

      expect(history.length).toBeGreaterThanOrEqual(2);

      const updateEntry = history.find((h) => h.changeType === 'UPDATED');
      expect(updateEntry).toBeDefined();
      expect(updateEntry?.changeReason).toBe('Testing history update');
    });

    it('should track disable in history', async () => {
      const code = await CauseCodeService.createCauseCode({
        code: 'DISABLE-HISTORY-001',
        name: 'Disable History Test',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      await CauseCodeService.disableCauseCode(code.id, 'Testing disable history', 'test-user');

      const history = await CauseCodeService.getHistory(code.id, 10);

      const disableEntry = history.find((h) => h.changeType === 'DISABLED');
      expect(disableEntry).toBeDefined();
      expect(disableEntry?.changeReason).toBe('Testing disable history');
    });

    it('should respect history limit', async () => {
      const code = await CauseCodeService.createCauseCode({
        code: 'HISTORY-LIMIT-001',
        name: 'History Limit Test',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      const historyAll = await CauseCodeService.getHistory(code.id, 100);
      const historyLimited = await CauseCodeService.getHistory(code.id, 5);

      expect(historyLimited.length).toBeLessThanOrEqual(5);
      expect(historyLimited.length).toBeLessThanOrEqual(historyAll.length);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test that service methods throw errors appropriately
      await expect(
        CauseCodeService.getCauseCode('')
      ).resolves.toBeNull();
    });

    it('should include proper error messages', async () => {
      try {
        await CauseCodeService.createCategory({
          code: 'MATERIAL', // Duplicate
          name: 'Test',
          createdBy: 'test-user',
        });
        expect.fail('Should have thrown an error');
      } catch (error: any) {
        expect(error.message).toContain('already exists');
      }
    });
  });

  describe('Data Integrity', () => {
    it('should maintain referential integrity with categories', async () => {
      const category = await CauseCodeService.createCategory({
        code: 'INTEGRITY-TEST-CAT',
        name: 'Integrity Test Category',
        createdBy: 'test-user',
      });

      const code = await CauseCodeService.createCauseCode({
        code: 'INTEGRITY-TEST-001',
        name: 'Integrity Test Code',
        categoryId: category.id,
        createdBy: 'test-user',
      });

      const retrieved = await CauseCodeService.getCauseCode(code.id);
      expect(retrieved?.categoryId).toBe(category.id);
    });

    it('should maintain parent-child relationships', async () => {
      const parent = await CauseCodeService.createCauseCode({
        code: 'PARENT-INTEGRITY',
        name: 'Parent for Integrity',
        categoryId: testCategory.id,
        createdBy: 'test-user',
      });

      const child = await CauseCodeService.createCauseCode({
        code: 'CHILD-INTEGRITY',
        name: 'Child for Integrity',
        categoryId: testCategory.id,
        parentId: parent.id,
        createdBy: 'test-user',
      });

      const retrievedChild = await CauseCodeService.getCauseCode(child.id);
      expect(retrievedChild?.parentId).toBe(parent.id);

      const path = await CauseCodeService.getFullPath(child.id);
      expect(path).toContain(parent.code);
    });
  });
});
