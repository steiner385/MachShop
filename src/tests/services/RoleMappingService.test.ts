import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  RoleMappingService,
  RoleMappingType,
  ConflictSeverity,
  ConflictStatus,
  RoleConflictType,
  RoleAssignmentOperation,
  InheritanceType
} from '../../services/RoleMappingService';
import { SaviyntApiClient, SaviyntRole } from '../../services/SaviyntApiClient';
import { SaviyntSyncStatus, SaviyntMappingType } from '@prisma/client';

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

describe('RoleMappingService', () => {
  let service: RoleMappingService;
  let mockPrisma: any;
  let mockSaviyntClient: any;

  beforeEach(() => {
    // Mock Prisma client
    mockPrisma = {
      saviyntRoleMapping: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      role: {
        findUnique: vi.fn(),
        findMany: vi.fn()
      },
      user: {
        findUnique: vi.fn()
      },
      userRole: {
        findMany: vi.fn(),
        create: vi.fn(),
        deleteMany: vi.fn()
      }
    };

    // Mock Saviynt API client
    mockSaviyntClient = {
      getRole: vi.fn(),
      createRole: vi.fn(),
      updateRole: vi.fn(),
      assignRoleToUser: vi.fn(),
      removeRoleFromUser: vi.fn()
    };

    service = new RoleMappingService(mockPrisma as PrismaClient, mockSaviyntClient);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully when enabled', async () => {
      const loadMappingsSpy = vi.spyOn(service as any, 'loadRoleMappings').mockResolvedValue(undefined);
      const loadHierarchiesSpy = vi.spyOn(service as any, 'loadRoleHierarchies').mockResolvedValue(undefined);
      const loadSegregationSpy = vi.spyOn(service as any, 'loadSegregationRules').mockResolvedValue(undefined);
      const syncExistingSpy = vi.spyOn(service as any, 'syncExistingRoles').mockResolvedValue(undefined);

      await service.initialize();

      expect(loadMappingsSpy).toHaveBeenCalled();
      expect(loadHierarchiesSpy).toHaveBeenCalled();
      expect(loadSegregationSpy).toHaveBeenCalled();
      expect(syncExistingSpy).toHaveBeenCalled();
    });

    it('should skip initialization when disabled', async () => {
      service['isEnabled'] = false;

      const loadMappingsSpy = vi.spyOn(service as any, 'loadRoleMappings');
      const loadHierarchiesSpy = vi.spyOn(service as any, 'loadRoleHierarchies');

      await service.initialize();

      expect(loadMappingsSpy).not.toHaveBeenCalled();
      expect(loadHierarchiesSpy).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      vi.spyOn(service as any, 'loadRoleMappings').mockRejectedValue(new Error('Load failed'));

      await expect(service.initialize()).rejects.toThrow('Load failed');
    });
  });

  describe('Role Mapping Loading', () => {
    it('should load role mappings from database', async () => {
      const mockMappings = [
        {
          id: 'mapping1',
          roleId: 'role1',
          saviyntRoleId: 'saviynt1',
          mappingType: SaviyntMappingType.AUTOMATIC,
          isActive: true,
          createdAt: new Date(),
          lastSyncAt: new Date(),
          conditions: null,
          role: { id: 'role1', roleCode: 'USER' }
        },
        {
          id: 'mapping2',
          roleId: 'role2',
          saviyntRoleId: 'saviynt2',
          mappingType: SaviyntMappingType.CONDITIONAL,
          isActive: true,
          createdAt: new Date(),
          lastSyncAt: null,
          conditions: { department: 'IT' },
          role: { id: 'role2', roleCode: 'ADMIN' }
        }
      ];

      mockPrisma.saviyntRoleMapping.findMany.mockResolvedValue(mockMappings);

      await service['loadRoleMappings']();

      const mappings = service['mappings'];
      expect(mappings.size).toBe(2);
      expect(mappings.has('mapping1')).toBe(true);
      expect(mappings.has('mapping2')).toBe(true);

      const mapping1 = mappings.get('mapping1')!;
      expect(mapping1.mesRoleId).toBe('role1');
      expect(mapping1.saviyntRoleId).toBe('saviynt1');
      expect(mapping1.mappingType).toBe(RoleMappingType.DIRECT);
    });

    it('should load role hierarchies from database', async () => {
      const mockRoles = [
        {
          id: 'role1',
          roleCode: 'ADMIN',
          permissions: [
            { permission: { permissionCode: 'READ_ALL' } },
            { permission: { permissionCode: 'WRITE_ALL' } }
          ]
        },
        {
          id: 'role2',
          roleCode: 'USER',
          permissions: [
            { permission: { permissionCode: 'READ_OWN' } }
          ]
        }
      ];

      mockPrisma.role.findMany.mockResolvedValue(mockRoles);

      await service['loadRoleHierarchies']();

      const hierarchies = service['hierarchies'];
      expect(hierarchies.size).toBe(2);

      const adminHierarchy = hierarchies.get('role1')!;
      expect(adminHierarchy.roleId).toBe('role1');
      expect(adminHierarchy.level).toBe(1); // ADMIN should be level 1
      expect(adminHierarchy.effectivePermissions).toContain('READ_ALL');
      expect(adminHierarchy.effectivePermissions).toContain('WRITE_ALL');

      const userHierarchy = hierarchies.get('role2')!;
      expect(userHierarchy.level).toBe(5); // Basic user level
    });

    it('should load segregation of duties rules', async () => {
      await service['loadSegregationRules']();

      const segregationRules = service['segregationRules'];
      expect(segregationRules.size).toBeGreaterThan(0);
      expect(segregationRules.has('ADMIN')).toBe(true);
      expect(segregationRules.get('ADMIN')).toContain('AUDITOR');
      expect(segregationRules.get('ADMIN')).toContain('FINANCIAL_CONTROLLER');
    });

    it('should sync existing unmapped roles', async () => {
      const unmappedRoles = [
        { id: 'role1', roleCode: 'NEW_ROLE', isActive: true },
        { id: 'role2', roleCode: 'ANOTHER_ROLE', isActive: true }
      ];

      mockPrisma.role.findMany.mockResolvedValue(unmappedRoles);

      const createMappingSpy = vi.spyOn(service, 'createRoleMapping')
        .mockResolvedValueOnce({} as any)
        .mockRejectedValueOnce(new Error('Creation failed'));

      await service['syncExistingRoles']();

      expect(createMappingSpy).toHaveBeenCalledTimes(2);
      expect(createMappingSpy).toHaveBeenCalledWith('role1', 'system-init');
      expect(createMappingSpy).toHaveBeenCalledWith('role2', 'system-init');
    });
  });

  describe('Role Mapping Creation', () => {
    beforeEach(() => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'TEST_ROLE',
        roleName: 'Test Role',
        description: 'Test role description',
        isGlobal: true,
        createdBy: 'admin',
        permissions: [
          { permission: { permissionCode: 'READ_DATA' } },
          { permission: { permissionCode: 'WRITE_DATA' } }
        ]
      });

      mockPrisma.saviyntRoleMapping.findFirst.mockResolvedValue(null);
      mockPrisma.saviyntRoleMapping.create.mockResolvedValue({
        id: 'mapping1',
        roleId: 'role1',
        saviyntRoleId: 'saviynt123',
        saviyntRoleName: 'TEST_ROLE',
        mappingType: SaviyntMappingType.AUTOMATIC,
        isActive: true,
        createdAt: new Date(),
        lastSyncAt: new Date()
      });
    });

    it('should create role mapping for new Saviynt role', async () => {
      mockSaviyntClient.getRole.mockResolvedValue(null);
      mockSaviyntClient.createRole.mockResolvedValue('saviynt123');

      const mapping = await service.createRoleMapping('role1', 'admin');

      expect(mapping.mesRoleId).toBe('role1');
      expect(mapping.saviyntRoleId).toBe('saviynt123');
      expect(mapping.mappingType).toBe(RoleMappingType.DIRECT);

      expect(mockSaviyntClient.createRole).toHaveBeenCalledWith({
        rolename: 'TEST_ROLE',
        roledisplayname: 'Test Role',
        roledescription: 'Test role description',
        attributes: {
          mesRoleId: 'role1',
          isGlobal: true,
          permissions: ['READ_DATA', 'WRITE_DATA'],
          createdBy: 'admin',
          mappingType: RoleMappingType.DIRECT
        }
      });

      expect(mockPrisma.saviyntRoleMapping.create).toHaveBeenCalledWith({
        data: {
          roleId: 'role1',
          saviyntRoleId: 'saviynt123',
          saviyntRoleName: 'TEST_ROLE',
          mappingType: SaviyntMappingType.AUTOMATIC,
          isActive: true,
          lastSyncAt: expect.any(Date)
        }
      });
    });

    it('should create role mapping for existing Saviynt role', async () => {
      mockSaviyntClient.getRole.mockResolvedValue({
        rolekey: 'existing123',
        rolename: 'TEST_ROLE',
        roledisplayname: 'Test Role',
        roledescription: 'Test role description'
      });

      const mapping = await service.createRoleMapping('role1', 'admin');

      expect(mapping.saviyntRoleId).toBe('existing123');
      expect(mockSaviyntClient.createRole).not.toHaveBeenCalled();
    });

    it('should handle role not found error', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null);

      await expect(service.createRoleMapping('nonexistent', 'admin'))
        .rejects.toThrow('MES role not found');
    });

    it('should handle existing mapping error', async () => {
      mockPrisma.saviyntRoleMapping.findFirst.mockResolvedValue({
        id: 'existing',
        roleId: 'role1',
        isActive: true
      });

      await expect(service.createRoleMapping('role1', 'admin'))
        .rejects.toThrow('Role mapping already exists');
    });

    it('should handle different mapping types', async () => {
      mockSaviyntClient.getRole.mockResolvedValue(null);
      mockSaviyntClient.createRole.mockResolvedValue('saviynt123');

      const mapping = await service.createRoleMapping(
        'role1',
        'admin',
        RoleMappingType.HIERARCHICAL
      );

      expect(mapping.mappingType).toBe(RoleMappingType.HIERARCHICAL);
    });
  });

  describe('Role Assignment', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        userRoles: [
          { roleId: 'existing-role', role: { roleCode: 'USER' } }
        ],
        saviyntUserMapping: {
          userId: 'user1',
          saviyntUserId: 'saviynt-user1'
        }
      });

      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'MANAGER',
        permissions: [
          { permission: { permissionCode: 'MANAGE_TEAM' } }
        ],
        saviyntRoleMappings: [
          {
            id: 'mapping1',
            roleId: 'role1',
            saviyntRoleId: 'saviynt-role1',
            isActive: true
          }
        ]
      });

      mockPrisma.userRole.create.mockResolvedValue({
        id: 'user-role1',
        userId: 'user1',
        roleId: 'role1'
      });
    });

    it('should assign role to user successfully', async () => {
      vi.spyOn(service as any, 'detectRoleConflicts').mockResolvedValue([]);
      vi.spyOn(service as any, 'calculateInheritedRoles').mockResolvedValue(['inherited1']);
      vi.spyOn(service as any, 'calculateEffectivePermissions').mockResolvedValue(['MANAGE_TEAM', 'READ_DATA']);

      const result = await service.assignRoleToUser('user1', 'role1', 'admin');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user1');
      expect(result.roleId).toBe('role1');
      expect(result.saviyntRoleId).toBe('saviynt-role1');
      expect(result.operation).toBe(RoleAssignmentOperation.ASSIGN);
      expect(result.inheritedRoles).toEqual(['inherited1']);
      expect(result.effectivePermissions).toEqual(['MANAGE_TEAM', 'READ_DATA']);

      expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
        data: {
          userId: 'user1',
          roleId: 'role1',
          assignedBy: 'admin',
          assignedAt: expect.any(Date)
        }
      });

      expect(mockSaviyntClient.assignRoleToUser).toHaveBeenCalledWith(
        'saviynt-user1',
        'saviynt-role1'
      );
    });

    it('should handle role assignment with critical conflicts', async () => {
      vi.spyOn(service as any, 'detectRoleConflicts').mockResolvedValue([
        {
          id: 'conflict1',
          severity: ConflictSeverity.CRITICAL,
          conflictType: RoleConflictType.SEGREGATION_OF_DUTIES
        }
      ]);

      const result = await service.assignRoleToUser('user1', 'role1', 'admin');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toBe('Critical role conflicts detected');
      expect(result.conflictingRoles).toEqual(['conflict1']);

      expect(mockPrisma.userRole.create).not.toHaveBeenCalled();
      expect(mockSaviyntClient.assignRoleToUser).not.toHaveBeenCalled();
    });

    it('should create role mapping if none exists', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'MANAGER',
        permissions: [],
        saviyntRoleMappings: [] // No existing mappings
      });

      vi.spyOn(service as any, 'detectRoleConflicts').mockResolvedValue([]);
      vi.spyOn(service, 'createRoleMapping').mockResolvedValue({
        id: 'new-mapping',
        saviyntRoleId: 'new-saviynt-role',
        mappingType: RoleMappingType.DIRECT
      } as any);

      const result = await service.assignRoleToUser('user1', 'role1', 'admin');

      expect(service.createRoleMapping).toHaveBeenCalledWith('role1', 'admin');
      expect(result.success).toBe(true);
    });

    it('should handle user or role not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.assignRoleToUser('nonexistent', 'role1', 'admin');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('User or role not found');
    });

    it('should handle Saviynt assignment failure gracefully', async () => {
      vi.spyOn(service as any, 'detectRoleConflicts').mockResolvedValue([]);
      vi.spyOn(service as any, 'calculateInheritedRoles').mockResolvedValue([]);
      vi.spyOn(service as any, 'calculateEffectivePermissions').mockResolvedValue([]);

      mockSaviyntClient.assignRoleToUser.mockRejectedValue(new Error('Saviynt API failed'));

      const result = await service.assignRoleToUser('user1', 'role1', 'admin');

      expect(result.success).toBe(true); // Should still succeed in MES
      expect(mockPrisma.userRole.create).toHaveBeenCalled(); // MES assignment should complete
    });
  });

  describe('Role Removal', () => {
    beforeEach(() => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user1',
        saviyntUserMapping: {
          userId: 'user1',
          saviyntUserId: 'saviynt-user1'
        }
      });

      mockPrisma.saviyntRoleMapping.findFirst.mockResolvedValue({
        roleId: 'role1',
        saviyntRoleId: 'saviynt-role1',
        isActive: true
      });
    });

    it('should remove role from user successfully', async () => {
      vi.spyOn(service as any, 'calculateEffectivePermissions').mockResolvedValue(['READ_DATA']);

      const result = await service.removeRoleFromUser('user1', 'role1', 'admin');

      expect(result.success).toBe(true);
      expect(result.userId).toBe('user1');
      expect(result.roleId).toBe('role1');
      expect(result.operation).toBe(RoleAssignmentOperation.REMOVE);

      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'user1', roleId: 'role1' }
      });

      expect(mockSaviyntClient.removeRoleFromUser).toHaveBeenCalledWith(
        'saviynt-user1',
        'saviynt-role1'
      );
    });

    it('should handle user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const result = await service.removeRoleFromUser('nonexistent', 'role1', 'admin');

      expect(result.success).toBe(false);
      expect(result.errorMessage).toContain('User not found');
    });

    it('should handle removal without Saviynt mapping', async () => {
      mockPrisma.saviyntRoleMapping.findFirst.mockResolvedValue(null);
      vi.spyOn(service as any, 'calculateEffectivePermissions').mockResolvedValue([]);

      const result = await service.removeRoleFromUser('user1', 'role1', 'admin');

      expect(result.success).toBe(true);
      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalled();
      expect(mockSaviyntClient.removeRoleFromUser).not.toHaveBeenCalled();
    });

    it('should handle Saviynt removal failure gracefully', async () => {
      mockSaviyntClient.removeRoleFromUser.mockRejectedValue(new Error('Saviynt API failed'));
      vi.spyOn(service as any, 'calculateEffectivePermissions').mockResolvedValue([]);

      const result = await service.removeRoleFromUser('user1', 'role1', 'admin');

      expect(result.success).toBe(true); // Should still succeed in MES
      expect(mockPrisma.userRole.deleteMany).toHaveBeenCalled(); // MES removal should complete
    });
  });

  describe('Role Conflict Detection', () => {
    beforeEach(async () => {
      await service['loadSegregationRules']();
    });

    it('should detect segregation of duties conflicts', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { roleId: 'existing-role', role: { roleCode: 'AUDITOR' } }
      ]);

      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'ADMIN'
      });

      const conflicts = await service['detectRoleConflicts']('user1', 'role1');

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe(RoleConflictType.SEGREGATION_OF_DUTIES);
      expect(conflicts[0].severity).toBe(ConflictSeverity.CRITICAL);
      expect(conflicts[0].description).toContain('ADMIN conflicts with AUDITOR');
    });

    it('should detect excessive privileges conflicts', async () => {
      const userRoles = Array.from({ length: 5 }, (_, i) => ({
        roleId: `role${i}`,
        role: { roleCode: `ROLE${i}` }
      }));

      mockPrisma.userRole.findMany.mockResolvedValue(userRoles);
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'ADDITIONAL_ROLE'
      });

      const conflicts = await service['detectRoleConflicts']('user1', 'role1');

      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].conflictType).toBe(RoleConflictType.EXCESSIVE_PRIVILEGES);
      expect(conflicts[0].severity).toBe(ConflictSeverity.MEDIUM);
      expect(conflicts[0].description).toContain('excessive roles (6 total)');
    });

    it('should return no conflicts for valid role assignment', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { roleId: 'existing-role', role: { roleCode: 'USER' } }
      ]);

      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'MANAGER'
      });

      const conflicts = await service['detectRoleConflicts']('user1', 'role1');

      expect(conflicts).toHaveLength(0);
    });

    it('should handle role not found gracefully', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([]);
      mockPrisma.role.findUnique.mockResolvedValue(null);

      const conflicts = await service['detectRoleConflicts']('user1', 'role1');

      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Role Hierarchy and Permissions', () => {
    beforeEach(async () => {
      // Set up test hierarchies
      service['hierarchies'].set('parent-role', {
        roleId: 'parent-role',
        childRoleIds: ['child-role1', 'child-role2'],
        level: 1,
        inheritanceType: InheritanceType.ADDITIVE,
        effectivePermissions: ['PARENT_PERM1', 'PARENT_PERM2']
      });

      service['hierarchies'].set('child-role1', {
        roleId: 'child-role1',
        parentRoleId: 'parent-role',
        childRoleIds: [],
        level: 2,
        inheritanceType: InheritanceType.ADDITIVE,
        effectivePermissions: ['CHILD_PERM1']
      });
    });

    it('should calculate inherited roles correctly', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        { roleId: 'parent-role', role: { roleCode: 'PARENT' } }
      ]);

      const inheritedRoles = await service['calculateInheritedRoles']('user1');

      expect(inheritedRoles).toEqual(['child-role1', 'child-role2']);
    });

    it('should calculate effective permissions correctly', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([
        {
          roleId: 'role1',
          role: {
            permissions: [
              { permission: { permissionCode: 'DIRECT_PERM1' } },
              { permission: { permissionCode: 'DIRECT_PERM2' } }
            ]
          }
        },
        {
          roleId: 'parent-role',
          role: {
            permissions: [
              { permission: { permissionCode: 'PARENT_DIRECT' } }
            ]
          }
        }
      ]);

      const effectivePermissions = await service['calculateEffectivePermissions']('user1');

      expect(effectivePermissions).toContain('DIRECT_PERM1');
      expect(effectivePermissions).toContain('DIRECT_PERM2');
      expect(effectivePermissions).toContain('PARENT_DIRECT');
      expect(effectivePermissions).toContain('PARENT_PERM1');
      expect(effectivePermissions).toContain('PARENT_PERM2');
    });

    it('should handle users with no roles', async () => {
      mockPrisma.userRole.findMany.mockResolvedValue([]);

      const inheritedRoles = await service['calculateInheritedRoles']('user1');
      const effectivePermissions = await service['calculateEffectivePermissions']('user1');

      expect(inheritedRoles).toEqual([]);
      expect(effectivePermissions).toEqual([]);
    });
  });

  describe('Role Assignment Validation', () => {
    beforeEach(async () => {
      await service['loadSegregationRules']();
    });

    it('should validate role assignment successfully', async () => {
      vi.spyOn(service as any, 'detectRoleConflicts').mockResolvedValue([]);

      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'MANAGER'
      });

      mockPrisma.userRole.findMany.mockResolvedValue([
        { roleId: 'basic-role', role: { roleCode: 'USER' } }
      ]);

      const validation = await service.validateRoleAssignment('user1', 'role1');

      expect(validation.isValid).toBe(true);
      expect(validation.violations).toHaveLength(0);
      expect(validation.warnings).toHaveLength(0);
    });

    it('should detect validation violations', async () => {
      vi.spyOn(service as any, 'detectRoleConflicts').mockResolvedValue([
        {
          severity: ConflictSeverity.CRITICAL,
          description: 'Critical conflict detected'
        }
      ]);

      const validation = await service.validateRoleAssignment('user1', 'role1');

      expect(validation.isValid).toBe(false);
      expect(validation.violations).toContain('Critical conflict detected');
    });

    it('should detect validation warnings', async () => {
      vi.spyOn(service as any, 'detectRoleConflicts').mockResolvedValue([
        {
          severity: ConflictSeverity.MEDIUM,
          description: 'Medium level conflict'
        }
      ]);

      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleCode: 'ADMIN_ROLE'
      });

      mockPrisma.userRole.findMany.mockResolvedValue([]);

      const validation = await service.validateRoleAssignment('user1', 'role1');

      expect(validation.isValid).toBe(true);
      expect(validation.warnings).toContain('Medium level conflict');
      expect(validation.warnings).toContain('Admin role assignment without basic user role');
    });
  });

  describe('Role Synchronization', () => {
    beforeEach(() => {
      // Set up test mappings
      service['mappings'].set('mapping1', {
        id: 'mapping1',
        mesRoleId: 'role1',
        saviyntRoleId: 'saviynt1',
        mappingType: RoleMappingType.DIRECT,
        isActive: true,
        priority: 1,
        createdAt: new Date(),
        syncStatus: SaviyntSyncStatus.COMPLETED
      });
    });

    it('should sync role mappings successfully', async () => {
      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleName: 'Updated Role Name',
        description: 'Updated description',
        permissions: [
          { permission: { permissionCode: 'NEW_PERM' } }
        ]
      });

      mockSaviyntClient.getRole.mockResolvedValue({
        rolekey: 'saviynt1',
        rolename: 'OLD_ROLE',
        roledisplayname: 'Old Role Name',
        roledescription: 'Old description'
      });

      vi.spyOn(service as any, 'compareRoles').mockResolvedValue(true);
      vi.spyOn(service as any, 'syncSingleRole').mockResolvedValue(undefined);

      const result = await service.syncRoleMappings();

      expect(result.synchronized).toBe(1);
      expect(result.conflicts).toBe(0);
      expect(result.errors).toBe(0);
    });

    it('should handle sync errors gracefully', async () => {
      mockPrisma.role.findUnique.mockResolvedValue(null); // Role not found

      const result = await service.syncRoleMappings();

      expect(result.synchronized).toBe(0);
      expect(result.errors).toBe(1);
    });

    it('should compare roles correctly', async () => {
      const mesRole = {
        roleName: 'Test Role',
        description: 'Test description',
        permissions: [
          { permission: { permissionCode: 'PERM1' } },
          { permission: { permissionCode: 'PERM2' } }
        ]
      };

      const saviyntRole = {
        roledisplayname: 'Different Name',
        roledescription: 'Test description',
        attributes: {
          permissions: ['PERM1', 'PERM2']
        }
      };

      const needsSync = await service['compareRoles'](mesRole, saviyntRole);
      expect(needsSync).toBe(true); // Different names

      const sameRole = {
        roledisplayname: 'Test Role',
        roledescription: 'Test description',
        attributes: {
          permissions: ['PERM1', 'PERM2']
        }
      };

      const noSyncNeeded = await service['compareRoles'](mesRole, sameRole);
      expect(noSyncNeeded).toBe(false); // Same content
    });

    it('should sync single role successfully', async () => {
      const mapping = service['mappings'].get('mapping1')!;

      mockPrisma.role.findUnique.mockResolvedValue({
        id: 'role1',
        roleName: 'Updated Role',
        description: 'Updated description',
        isGlobal: true,
        permissions: [
          { permission: { permissionCode: 'UPDATED_PERM' } }
        ]
      });

      await service['syncSingleRole'](mapping);

      expect(mockSaviyntClient.updateRole).toHaveBeenCalledWith('saviynt1', {
        roledisplayname: 'Updated Role',
        roledescription: 'Updated description',
        attributes: {
          mesRoleId: 'role1',
          isGlobal: true,
          permissions: ['UPDATED_PERM'],
          lastSyncAt: expect.any(String)
        }
      });

      expect(mockPrisma.saviyntRoleMapping.update).toHaveBeenCalledWith({
        where: { id: 'mapping1' },
        data: { lastSyncAt: expect.any(Date) }
      });
    });
  });

  describe('Conflict Management', () => {
    beforeEach(() => {
      // Add test conflicts
      service['conflicts'].set('conflict1', {
        id: 'conflict1',
        userId: 'user1',
        conflictType: RoleConflictType.SEGREGATION_OF_DUTIES,
        status: ConflictStatus.DETECTED,
        severity: ConflictSeverity.CRITICAL,
        mesRoles: ['role1', 'role2'],
        saviyntRoles: [],
        description: 'SOD violation',
        resolutionStrategy: 'SECURITY_REVIEW' as any,
        detectedAt: new Date()
      });

      service['conflicts'].set('conflict2', {
        id: 'conflict2',
        userId: 'user2',
        conflictType: RoleConflictType.EXCESSIVE_PRIVILEGES,
        status: ConflictStatus.RESOLVED,
        severity: ConflictSeverity.MEDIUM,
        mesRoles: ['role3'],
        saviyntRoles: [],
        description: 'Too many roles',
        resolutionStrategy: 'SUPERVISOR_APPROVAL' as any,
        detectedAt: new Date()
      });
    });

    it('should get pending conflicts', () => {
      const pendingConflicts = service.getPendingConflicts();

      expect(pendingConflicts).toHaveLength(1);
      expect(pendingConflicts[0].id).toBe('conflict1');
      expect(pendingConflicts[0].status).toBe(ConflictStatus.DETECTED);
    });

    it('should resolve conflict successfully', async () => {
      await service.resolveConflict('conflict1', ConflictStatus.APPROVED, 'admin', 'Approved by security team');

      const conflict = service['conflicts'].get('conflict1')!;
      expect(conflict.status).toBe(ConflictStatus.APPROVED);
      expect(conflict.resolvedBy).toBe('admin');
      expect(conflict.resolvedAt).toBeInstanceOf(Date);
    });

    it('should handle resolve non-existent conflict', async () => {
      await expect(service.resolveConflict('nonexistent', ConflictStatus.RESOLVED, 'admin'))
        .rejects.toThrow('Conflict not found');
    });
  });

  describe('Statistics', () => {
    beforeEach(() => {
      // Set up test data
      service['mappings'].set('mapping1', {
        id: 'mapping1',
        mappingType: RoleMappingType.DIRECT,
        isActive: true
      } as any);

      service['mappings'].set('mapping2', {
        id: 'mapping2',
        mappingType: RoleMappingType.HIERARCHICAL,
        isActive: false
      } as any);

      service['conflicts'].set('conflict1', {
        severity: ConflictSeverity.CRITICAL,
        status: ConflictStatus.DETECTED
      } as any);

      service['conflicts'].set('conflict2', {
        severity: ConflictSeverity.MEDIUM,
        status: ConflictStatus.RESOLVED
      } as any);
    });

    it('should return role mapping statistics', () => {
      const stats = service.getRoleMappingStatistics();

      expect(stats.totalMappings).toBe(2);
      expect(stats.activeMappings).toBe(1);
      expect(stats.mappingsByType[RoleMappingType.DIRECT]).toBe(1);
      expect(stats.mappingsByType[RoleMappingType.HIERARCHICAL]).toBe(1);
      expect(stats.totalConflicts).toBe(2);
      expect(stats.conflictsBySeverity[ConflictSeverity.CRITICAL]).toBe(1);
      expect(stats.conflictsBySeverity[ConflictSeverity.MEDIUM]).toBe(1);
      expect(stats.pendingConflicts).toBe(1);
    });
  });

  describe('Utility Functions', () => {
    it('should map database types to role mapping types correctly', () => {
      expect(service['mapToRoleMappingType'](SaviyntMappingType.AUTOMATIC)).toBe(RoleMappingType.DIRECT);
      expect(service['mapToRoleMappingType'](SaviyntMappingType.CONDITIONAL)).toBe(RoleMappingType.CONDITIONAL);
      expect(service['mapToRoleMappingType'](SaviyntMappingType.HYBRID)).toBe(RoleMappingType.COMPOSITE);
    });

    it('should map role mapping types to database types correctly', () => {
      expect(service['mapFromRoleMappingType'](RoleMappingType.DIRECT)).toBe(SaviyntMappingType.AUTOMATIC);
      expect(service['mapFromRoleMappingType'](RoleMappingType.CONDITIONAL)).toBe(SaviyntMappingType.CONDITIONAL);
      expect(service['mapFromRoleMappingType'](RoleMappingType.COMPOSITE)).toBe(SaviyntMappingType.HYBRID);
    });

    it('should calculate role levels correctly', () => {
      expect(service['calculateRoleLevel']('ADMIN_USER')).toBe(1);
      expect(service['calculateRoleLevel']('MANAGER_ROLE')).toBe(2);
      expect(service['calculateRoleLevel']('SUPERVISOR_ACCESS')).toBe(3);
      expect(service['calculateRoleLevel']('TEAM_LEAD')).toBe(4);
      expect(service['calculateRoleLevel']('BASIC_USER')).toBe(5);
    });
  });
});