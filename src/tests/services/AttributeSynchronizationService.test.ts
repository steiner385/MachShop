import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  AttributeSynchronizationService,
  SyncDirection,
  TransformationType,
  ValidationType,
  ConflictResolutionStrategy,
  ConflictStatus,
  ConflictType
} from '../../services/AttributeSynchronizationService';
import { SaviyntApiClient, SaviyntUser } from '../../services/SaviyntApiClient';
import { SaviyntSyncStatus, SaviyntEntityType } from '@prisma/client';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('../../services/SaviyntApiClient');
vi.mock('../../config/config', () => ({
  config: {
    saviynt: {
      enabled: true
    }
  }
}));

describe('AttributeSynchronizationService', () => {
  let service: AttributeSynchronizationService;
  let mockPrisma: any;
  let mockSaviyntClient: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      user: {
        findUnique: vi.fn(),
        update: vi.fn()
      },
      saviyntUserMapping: {
        update: vi.fn()
      }
    };

    // Mock Saviynt API client
    mockSaviyntClient = {
      getUser: vi.fn(),
      updateUser: vi.fn()
    };

    service = new AttributeSynchronizationService(mockPrisma as PrismaClient, mockSaviyntClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully when enabled', async () => {
      const loadMappingsSpy = vi.spyOn(service as any, 'loadAttributeMappings').mockResolvedValue(undefined);
      const loadConflictsSpy = vi.spyOn(service as any, 'loadPendingConflicts').mockResolvedValue(undefined);

      await service.initialize();

      expect(loadMappingsSpy).toHaveBeenCalled();
      expect(loadConflictsSpy).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      service['isEnabled'] = false;

      const loadMappingsSpy = vi.spyOn(service as any, 'loadAttributeMappings');
      const loadConflictsSpy = vi.spyOn(service as any, 'loadPendingConflicts');

      await service.initialize();

      expect(loadMappingsSpy).not.toHaveBeenCalled();
      expect(loadConflictsSpy).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      vi.spyOn(service as any, 'loadAttributeMappings').mockRejectedValue(new Error('Load failed'));

      await expect(service.initialize()).rejects.toThrow('Load failed');
    });
  });

  describe('Mapping Loading', () => {
    it('should load default attribute mappings', async () => {
      await service['loadAttributeMappings']();

      const mappings = service['mappings'];
      expect(mappings.size).toBeGreaterThan(0);

      // Check user mappings
      expect(mappings.has('user-username')).toBe(true);
      expect(mappings.has('user-email')).toBe(true);
      expect(mappings.has('user-firstname')).toBe(true);
      expect(mappings.has('user-lastname')).toBe(true);

      // Check role mappings
      expect(mappings.has('role-name')).toBe(true);
      expect(mappings.has('role-displayname')).toBe(true);
      expect(mappings.has('role-description')).toBe(true);
    });

    it('should validate mapping structure', async () => {
      await service['loadAttributeMappings']();

      const mappings = Array.from(service['mappings'].values());

      mappings.forEach(mapping => {
        expect(mapping).toHaveProperty('id');
        expect(mapping).toHaveProperty('name');
        expect(mapping).toHaveProperty('mesField');
        expect(mapping).toHaveProperty('saviyntField');
        expect(mapping).toHaveProperty('entityType');
        expect(mapping).toHaveProperty('direction');
        expect(mapping).toHaveProperty('isActive');
        expect(mapping).toHaveProperty('priority');
        expect(mapping).toHaveProperty('conflictResolution');
        expect(['USER', 'ROLE']).toContain(mapping.entityType);
        expect(Object.values(SyncDirection)).toContain(mapping.direction);
        expect(Object.values(ConflictResolutionStrategy)).toContain(mapping.conflictResolution);
      });
    });

    it('should configure transformations correctly', async () => {
      await service['loadAttributeMappings']();

      const emailMapping = service['mappings'].get('user-email');
      expect(emailMapping?.transformation?.type).toBe(TransformationType.CASE_CONVERSION);
      expect(emailMapping?.transformation?.parameters.case).toBe('lower');

      const displayNameMapping = service['mappings'].get('user-displayname');
      expect(displayNameMapping?.transformation?.type).toBe(TransformationType.CONCATENATION);
      expect(displayNameMapping?.transformation?.parameters.separator).toBe(' ');

      const statusMapping = service['mappings'].get('user-status');
      expect(statusMapping?.transformation?.type).toBe(TransformationType.VALUE_MAPPING);
      expect(statusMapping?.transformation?.parameters.mapping).toEqual({ true: '1', false: '0' });
    });

    it('should configure validation rules correctly', async () => {
      await service['loadAttributeMappings']();

      const usernameMapping = service['mappings'].get('user-username');
      expect(usernameMapping?.validationRules).toHaveLength(2);
      expect(usernameMapping?.validationRules?.[0].type).toBe(ValidationType.REQUIRED);
      expect(usernameMapping?.validationRules?.[1].type).toBe(ValidationType.MIN_LENGTH);

      const emailMapping = service['mappings'].get('user-email');
      expect(emailMapping?.validationRules).toHaveLength(2);
      expect(emailMapping?.validationRules?.[0].type).toBe(ValidationType.REQUIRED);
      expect(emailMapping?.validationRules?.[1].type).toBe(ValidationType.EMAIL_FORMAT);
    });
  });

  describe('User Attribute Synchronization', () => {
    beforeEach(async () => {
      await service['loadAttributeMappings']();

      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'Test',
        lastName: 'User',
        isActive: true,
        updatedAt: new Date(),
        saviyntUserMapping: {
          userId: 'user123',
          saviyntUserId: 'saviynt123',
          saviyntUsername: 'testuser'
        }
      });

      mockSaviyntClient.getUser.mockResolvedValue({
        userkey: 'saviynt123',
        username: 'testuser',
        email: 'TEST@EXAMPLE.COM',
        firstname: 'Test',
        lastname: 'User',
        statuskey: '1'
      });
    });

    it('should sync user attributes from MES to Saviynt', async () => {
      const result = await service.syncUserAttributes(
        'user123',
        SyncDirection.MES_TO_SAVIYNT,
        'admin'
      );

      expect(result.success).toBe(true);
      expect(result.entityId).toBe('user123');
      expect(result.saviyntEntityId).toBe('saviynt123');
      expect(result.syncedFields.length).toBeGreaterThan(0);

      expect(mockSaviyntClient.updateUser).toHaveBeenCalledWith(
        'saviynt123',
        expect.objectContaining({
          email: 'test@example.com' // Should be lowercased due to transformation
        })
      );

      expect(mockPrisma.saviyntUserMapping.update).toHaveBeenCalledWith({
        where: { userId: 'user123' },
        data: {
          lastSyncAt: expect.any(Date),
          syncStatus: SaviyntSyncStatus.COMPLETED
        }
      });
    });

    it('should sync user attributes from Saviynt to MES', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        username: 'testuser',
        email: null, // No email in MES
        firstName: 'Test',
        lastName: 'User',
        saviyntUserMapping: {
          userId: 'user123',
          saviyntUserId: 'saviynt123'
        }
      });

      const result = await service.syncUserAttributes(
        'user123',
        SyncDirection.SAVIYNT_TO_MES,
        'admin'
      );

      expect(result.success).toBe(true);
      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'user123' },
        data: expect.objectContaining({
          email: 'test@example.com' // Should be lowercased from Saviynt
        })
      });
    });

    it('should handle bidirectional sync with conflict detection', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        username: 'testuser',
        email: 'test@example.com',
        firstName: 'TestMES',
        lastName: 'User',
        updatedAt: new Date(),
        saviyntUserMapping: {
          userId: 'user123',
          saviyntUserId: 'saviynt123'
        }
      });

      mockSaviyntClient.getUser.mockResolvedValue({
        userkey: 'saviynt123',
        username: 'testuser',
        email: 'test@example.com',
        firstname: 'TestSaviynt',
        lastname: 'User'
      });

      const result = await service.syncUserAttributes(
        'user123',
        SyncDirection.BIDIRECTIONAL,
        'admin'
      );

      expect(result.conflicts.length).toBeGreaterThan(0);
      const firstNameConflict = result.conflicts.find(c => c.fieldName === 'firstName');
      expect(firstNameConflict).toBeDefined();
      expect(firstNameConflict?.mesValue).toBe('TestMES');
      expect(firstNameConflict?.saviyntValue).toBe('TestSaviynt');
    });

    it('should handle user not found error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.syncUserAttributes(
        'nonexistent',
        SyncDirection.MES_TO_SAVIYNT,
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('User not found');
    });

    it('should handle user not mapped to Saviynt error', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user123',
        username: 'testuser',
        saviyntUserMapping: null
      });

      const result = await service.syncUserAttributes(
        'user123',
        SyncDirection.MES_TO_SAVIYNT,
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('User not mapped to Saviynt');
    });

    it('should handle Saviynt user not found error', async () => {
      mockSaviyntClient.getUser.mockResolvedValue(null);

      const result = await service.syncUserAttributes(
        'user123',
        SyncDirection.MES_TO_SAVIYNT,
        'admin'
      );

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('Saviynt user not found');
    });

    it('should throw error when service disabled', async () => {
      service['isEnabled'] = false;

      await expect(service.syncUserAttributes(
        'user123',
        SyncDirection.MES_TO_SAVIYNT,
        'admin'
      )).rejects.toThrow('Attribute synchronization is disabled');
    });
  });

  describe('Value Transformations', () => {
    it('should perform direct copy transformation', async () => {
      const result = await service['transformValue'](
        'test',
        { type: TransformationType.DIRECT_COPY, parameters: {} }
      );

      expect(result).toBe('test');
    });

    it('should perform case conversion transformations', async () => {
      const lowerResult = await service['transformValue'](
        'TEST',
        { type: TransformationType.CASE_CONVERSION, parameters: { case: 'lower' } }
      );
      expect(lowerResult).toBe('test');

      const upperResult = await service['transformValue'](
        'test',
        { type: TransformationType.CASE_CONVERSION, parameters: { case: 'upper' } }
      );
      expect(upperResult).toBe('TEST');

      const titleResult = await service['transformValue'](
        'test user',
        { type: TransformationType.CASE_CONVERSION, parameters: { case: 'title' } }
      );
      expect(titleResult).toBe('Test User');
    });

    it('should perform value mapping transformation', async () => {
      const result = await service['transformValue'](
        true,
        {
          type: TransformationType.VALUE_MAPPING,
          parameters: { mapping: { true: '1', false: '0' } }
        }
      );

      expect(result).toBe('1');
    });

    it('should perform concatenation transformation', async () => {
      const userData = { firstName: 'Test', lastName: 'User' };

      const result = await service['transformValue'](
        userData,
        {
          type: TransformationType.CONCATENATION,
          parameters: { separator: ' ', fields: ['firstName', 'lastName'] }
        }
      );

      expect(result).toBe('Test User');
    });

    it('should perform split transformation', async () => {
      const result = await service['transformValue'](
        'Test User',
        {
          type: TransformationType.SPLIT,
          parameters: { separator: ' ', index: 0 }
        }
      );

      expect(result).toBe('Test');
    });

    it('should perform phone format conversion', async () => {
      const result = await service['transformValue'](
        '1234567890',
        {
          type: TransformationType.FORMAT_CONVERSION,
          parameters: { inputFormat: 'any', outputFormat: 'E.164' }
        }
      );

      expect(result).toBe('+11234567890');
    });

    it('should perform date format transformation', async () => {
      const date = new Date('2023-12-25');
      const result = await service['transformValue'](
        date,
        {
          type: TransformationType.DATE_FORMAT,
          parameters: { format: 'YYYY-MM-DD' }
        }
      );

      expect(result).toBe('2023-12-25');
    });

    it('should handle unknown transformation types', async () => {
      const result = await service['transformValue'](
        'test',
        { type: 'UNKNOWN' as any, parameters: {} }
      );

      expect(result).toBe('test');
    });
  });

  describe('Value Validation', () => {
    it('should validate required values', async () => {
      const errors = await service['validateValue'](
        '',
        [{ type: ValidationType.REQUIRED, parameters: {}, errorMessage: 'Required' }]
      );

      expect(errors).toContain('Required');
    });

    it('should validate minimum length', async () => {
      const errors = await service['validateValue'](
        'ab',
        [{ type: ValidationType.MIN_LENGTH, parameters: { minLength: 3 }, errorMessage: 'Too short' }]
      );

      expect(errors).toContain('Too short');
    });

    it('should validate maximum length', async () => {
      const errors = await service['validateValue'](
        'abcdef',
        [{ type: ValidationType.MAX_LENGTH, parameters: { maxLength: 3 }, errorMessage: 'Too long' }]
      );

      expect(errors).toContain('Too long');
    });

    it('should validate regex patterns', async () => {
      const errors = await service['validateValue'](
        'abc123',
        [{ type: ValidationType.REGEX_PATTERN, parameters: { pattern: '^[A-Z]+$' }, errorMessage: 'Invalid format' }]
      );

      expect(errors).toContain('Invalid format');
    });

    it('should validate email format', async () => {
      const errors = await service['validateValue'](
        'invalid-email',
        [{ type: ValidationType.EMAIL_FORMAT, parameters: {}, errorMessage: 'Invalid email' }]
      );

      expect(errors).toContain('Invalid email');

      const validErrors = await service['validateValue'](
        'test@example.com',
        [{ type: ValidationType.EMAIL_FORMAT, parameters: {}, errorMessage: 'Invalid email' }]
      );

      expect(validErrors).toHaveLength(0);
    });

    it('should validate value in list', async () => {
      const errors = await service['validateValue'](
        'invalid',
        [{ type: ValidationType.VALUE_IN_LIST, parameters: { values: ['valid1', 'valid2'] }, errorMessage: 'Not in list' }]
      );

      expect(errors).toContain('Not in list');
    });

    it('should pass valid values', async () => {
      const errors = await service['validateValue'](
        'test@example.com',
        [
          { type: ValidationType.REQUIRED, parameters: {}, errorMessage: 'Required' },
          { type: ValidationType.EMAIL_FORMAT, parameters: {}, errorMessage: 'Invalid email' },
          { type: ValidationType.MIN_LENGTH, parameters: { minLength: 5 }, errorMessage: 'Too short' }
        ]
      );

      expect(errors).toHaveLength(0);
    });
  });

  describe('Conflict Resolution', () => {
    beforeEach(async () => {
      await service['loadAttributeMappings']();
    });

    it('should resolve conflict with MES_WINS strategy', async () => {
      const conflict = {
        id: 'conflict1',
        entityType: SaviyntEntityType.USER,
        entityId: 'user123',
        saviyntEntityId: 'saviynt123',
        fieldName: 'firstName',
        mesValue: 'MESValue',
        saviyntValue: 'SaviyntValue',
        mesTimestamp: new Date(),
        conflictType: ConflictType.VALUE_MISMATCH,
        resolutionStrategy: ConflictResolutionStrategy.MES_WINS,
        status: ConflictStatus.PENDING
      };

      const resolution = await service['resolveConflict'](conflict);

      expect(resolution.autoResolved).toBe(true);
      expect(resolution.usesMesValue).toBe(true);
      expect(resolution.resolution).toBe('MESValue');
      expect(conflict.status).toBe(ConflictStatus.RESOLVED);
    });

    it('should resolve conflict with SAVIYNT_WINS strategy', async () => {
      const conflict = {
        id: 'conflict1',
        entityType: SaviyntEntityType.USER,
        entityId: 'user123',
        saviyntEntityId: 'saviynt123',
        fieldName: 'firstName',
        mesValue: 'MESValue',
        saviyntValue: 'SaviyntValue',
        mesTimestamp: new Date(),
        conflictType: ConflictType.VALUE_MISMATCH,
        resolutionStrategy: ConflictResolutionStrategy.SAVIYNT_WINS,
        status: ConflictStatus.PENDING
      };

      const resolution = await service['resolveConflict'](conflict);

      expect(resolution.autoResolved).toBe(true);
      expect(resolution.usesMesValue).toBe(false);
      expect(resolution.resolution).toBe('SaviyntValue');
    });

    it('should resolve conflict with LATEST_CHANGE_WINS strategy', async () => {
      const newerDate = new Date();
      const olderDate = new Date(Date.now() - 60000); // 1 minute ago

      const conflict = {
        id: 'conflict1',
        entityType: SaviyntEntityType.USER,
        entityId: 'user123',
        saviyntEntityId: 'saviynt123',
        fieldName: 'firstName',
        mesValue: 'MESValue',
        saviyntValue: 'SaviyntValue',
        mesTimestamp: newerDate,
        saviyntTimestamp: olderDate,
        conflictType: ConflictType.VALUE_MISMATCH,
        resolutionStrategy: ConflictResolutionStrategy.LATEST_CHANGE_WINS,
        status: ConflictStatus.PENDING
      };

      const resolution = await service['resolveConflict'](conflict);

      expect(resolution.autoResolved).toBe(true);
      expect(resolution.usesMesValue).toBe(true);
      expect(resolution.resolution).toBe('MESValue');
    });

    it('should not auto-resolve conflict with MANUAL_REVIEW strategy', async () => {
      const conflict = {
        id: 'conflict1',
        entityType: SaviyntEntityType.USER,
        entityId: 'user123',
        saviyntEntityId: 'saviynt123',
        fieldName: 'firstName',
        mesValue: 'MESValue',
        saviyntValue: 'SaviyntValue',
        mesTimestamp: new Date(),
        conflictType: ConflictType.VALUE_MISMATCH,
        resolutionStrategy: ConflictResolutionStrategy.MANUAL_REVIEW,
        status: ConflictStatus.PENDING
      };

      const resolution = await service['resolveConflict'](conflict);

      expect(resolution.autoResolved).toBe(false);
    });

    it('should merge string values with MERGE_VALUES strategy', async () => {
      const conflict = {
        id: 'conflict1',
        entityType: SaviyntEntityType.USER,
        entityId: 'user123',
        saviyntEntityId: 'saviynt123',
        fieldName: 'notes',
        mesValue: 'MES Note',
        saviyntValue: 'Saviynt Note',
        mesTimestamp: new Date(),
        conflictType: ConflictType.VALUE_MISMATCH,
        resolutionStrategy: ConflictResolutionStrategy.MERGE_VALUES,
        status: ConflictStatus.PENDING
      };

      const resolution = await service['resolveConflict'](conflict);

      expect(resolution.autoResolved).toBe(true);
      expect(resolution.resolution).toBe('MES Note | Saviynt Note');
    });
  });

  describe('Bulk Synchronization', () => {
    beforeEach(async () => {
      await service['loadAttributeMappings']();
    });

    it('should perform bulk user synchronization', async () => {
      const userIds = ['user1', 'user2', 'user3'];

      vi.spyOn(service, 'syncUserAttributes')
        .mockResolvedValueOnce({
          success: true,
          entityId: 'user1',
          syncedFields: ['email'],
          skippedFields: [],
          conflicts: []
        })
        .mockResolvedValueOnce({
          success: false,
          entityId: 'user2',
          syncedFields: [],
          skippedFields: [],
          conflicts: [],
          errorMessage: 'User not found'
        })
        .mockResolvedValueOnce({
          success: true,
          entityId: 'user3',
          syncedFields: ['firstName'],
          skippedFields: [],
          conflicts: [{ id: 'conflict1' } as any]
        });

      const result = await service.bulkSyncUsers(
        userIds,
        SyncDirection.MES_TO_SAVIYNT,
        'admin'
      );

      expect(result.totalEntities).toBe(3);
      expect(result.successfulSyncs).toBe(2);
      expect(result.failedSyncs).toBe(1);
      expect(result.conflicts).toBe(1);
      expect(result.results).toHaveLength(3);
      expect(result.batchId).toMatch(/bulk-sync-\d+/);
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should handle bulk sync with exceptions', async () => {
      const userIds = ['user1', 'user2'];

      vi.spyOn(service, 'syncUserAttributes')
        .mockResolvedValueOnce({
          success: true,
          entityId: 'user1',
          syncedFields: ['email'],
          skippedFields: [],
          conflicts: []
        })
        .mockRejectedValueOnce(new Error('Sync failed'));

      const result = await service.bulkSyncUsers(
        userIds,
        SyncDirection.MES_TO_SAVIYNT,
        'admin'
      );

      expect(result.successfulSyncs).toBe(1);
      expect(result.failedSyncs).toBe(1);
      expect(result.results[1].success).toBe(false);
      expect(result.results[1].errorMessage).toBe('Sync failed');
    });
  });

  describe('Conflict Management', () => {
    beforeEach(() => {
      // Add test conflicts
      const conflict1 = {
        id: 'conflict1',
        entityType: SaviyntEntityType.USER,
        entityId: 'user1',
        saviyntEntityId: 'saviynt1',
        fieldName: 'firstName',
        mesValue: 'John',
        saviyntValue: 'Johnny',
        mesTimestamp: new Date(),
        conflictType: ConflictType.VALUE_MISMATCH,
        resolutionStrategy: ConflictResolutionStrategy.MANUAL_REVIEW,
        status: ConflictStatus.PENDING
      };

      const conflict2 = {
        id: 'conflict2',
        entityType: SaviyntEntityType.USER,
        entityId: 'user2',
        saviyntEntityId: 'saviynt2',
        fieldName: 'email',
        mesValue: 'user@company.com',
        saviyntValue: 'user@external.com',
        mesTimestamp: new Date(),
        conflictType: ConflictType.VALUE_MISMATCH,
        resolutionStrategy: ConflictResolutionStrategy.MANUAL_REVIEW,
        status: ConflictStatus.RESOLVED
      };

      service['conflicts'].set('conflict1', conflict1);
      service['conflicts'].set('conflict2', conflict2);
    });

    it('should get pending conflicts', () => {
      const pendingConflicts = service.getPendingConflicts();

      expect(pendingConflicts).toHaveLength(1);
      expect(pendingConflicts[0].id).toBe('conflict1');
      expect(pendingConflicts[0].status).toBe(ConflictStatus.PENDING);
    });

    it('should manually resolve conflict', async () => {
      await service.resolveConflictManually(
        'conflict1',
        'John',
        'admin'
      );

      const conflict = service['conflicts'].get('conflict1')!;
      expect(conflict.status).toBe(ConflictStatus.RESOLVED);
      expect(conflict.resolution).toBe('John');
      expect(conflict.resolvedBy).toBe('admin');
      expect(conflict.resolvedAt).toBeInstanceOf(Date);
    });

    it('should handle resolve non-existent conflict', async () => {
      await expect(service.resolveConflictManually(
        'nonexistent',
        'value',
        'admin'
      )).rejects.toThrow('Conflict not found');
    });
  });

  describe('Utility Functions', () => {
    it('should get nested object values correctly', () => {
      const obj = {
        user: {
          profile: {
            email: 'test@example.com'
          }
        }
      };

      const value = service['getNestedValue'](obj, 'user.profile.email');
      expect(value).toBe('test@example.com');
    });

    it('should set nested object values correctly', () => {
      const obj = {};

      service['setNestedValue'](obj, 'user.profile.email', 'test@example.com');

      expect(obj).toEqual({
        user: {
          profile: {
            email: 'test@example.com'
          }
        }
      });
    });

    it('should compare values correctly', () => {
      expect(service['compareValues']('test', 'test')).toBe(true);
      expect(service['compareValues']('test', 'different')).toBe(false);
      expect(service['compareValues'](null, null)).toBe(true);
      expect(service['compareValues'](undefined, undefined)).toBe(true);
      expect(service['compareValues'](null, undefined)).toBe(false);

      expect(service['compareValues']([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(service['compareValues']([1, 2, 3], [3, 2, 1])).toBe(false);

      expect(service['compareValues']({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
      expect(service['compareValues']({ a: 1, b: 2 }, { a: 1, b: 3 })).toBe(false);
    });

    it('should convert to title case correctly', () => {
      const result = service['toTitleCase']('hello world');
      expect(result).toBe('Hello World');
    });

    it('should format phone numbers correctly', () => {
      const result1 = service['formatValue'](
        '1234567890',
        { inputFormat: 'any', outputFormat: 'E.164' }
      );
      expect(result1).toBe('+11234567890');

      const result2 = service['formatValue'](
        '11234567890',
        { inputFormat: 'any', outputFormat: 'E.164' }
      );
      expect(result2).toBe('+11234567890');
    });

    it('should format dates correctly', () => {
      const date = new Date('2023-12-25');
      const result = service['formatDate'](date, 'YYYY-MM-DD');
      expect(result).toBe('2023-12-25');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Add test conflicts and mappings
      const conflicts = [
        { status: ConflictStatus.PENDING, conflictType: ConflictType.VALUE_MISMATCH },
        { status: ConflictStatus.RESOLVED, conflictType: ConflictType.VALUE_MISMATCH },
        { status: ConflictStatus.PENDING, conflictType: ConflictType.FORMAT_INCOMPATIBLE }
      ];

      conflicts.forEach((conflict, index) => {
        service['conflicts'].set(`conflict${index}`, conflict as any);
      });
    });

    it('should return synchronization statistics', async () => {
      await service['loadAttributeMappings'](); // Load mappings

      const stats = service.getSyncStatistics();

      expect(stats.activeMappings).toBeGreaterThan(0);
      expect(stats.totalConflicts).toBe(3);
      expect(stats.conflictsByStatus[ConflictStatus.PENDING]).toBe(2);
      expect(stats.conflictsByStatus[ConflictStatus.RESOLVED]).toBe(1);
      expect(stats.conflictsByType[ConflictType.VALUE_MISMATCH]).toBe(2);
      expect(stats.conflictsByType[ConflictType.FORMAT_INCOMPATIBLE]).toBe(1);
      expect(stats.pendingConflicts).toBe(2);
    });
  });
});