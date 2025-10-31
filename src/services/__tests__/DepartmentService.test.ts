/**
 * DepartmentService Unit Tests
 *
 * Comprehensive unit tests for the DepartmentService including:
 * - CRUD operations
 * - Hierarchy management
 * - Validation and error handling
 * - Search and filtering
 * - Statistics and analytics
 *
 * Created for Issue #209: Department Lookup Table Implementation
 */

import { describe, expect, test, beforeEach, afterEach, vi } from 'vitest';

// Mock the database module with vi.hoisted to ensure proper mocking order
const mockPrisma = vi.hoisted(() => ({
  department: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
    upsert: vi.fn()
  },
  site: {
    findUnique: vi.fn()
  },
  user: {
    findUnique: vi.fn(),
    count: vi.fn()
  },
  personnelInfoExchange: {
    findMany: vi.fn(),
    count: vi.fn()
  },
  engineeringChangeOrder: {
    findMany: vi.fn(),
    count: vi.fn()
  },
  eCOTask: {
    findMany: vi.fn(),
    count: vi.fn()
  },
  iCDChangeRequest: {
    findMany: vi.fn(),
    count: vi.fn()
  }
}));

vi.mock('../lib/database', () => ({
  default: mockPrisma
}));

import { DepartmentService, CreateDepartmentData, UpdateDepartmentData } from '../DepartmentService';

describe('DepartmentService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ============================================================================
  // CREATE OPERATIONS
  // ============================================================================

  describe('createDepartment', () => {
    const validDepartmentData: CreateDepartmentData = {
      departmentCode: 'ENG',
      departmentName: 'Engineering',
      description: 'Engineering department',
      costCenter: 'CC-3000',
      budgetCode: 'BG-ENG',
      isActive: true
    };

    test('should create a department successfully', async () => {
      // Mock unique check
      mockPrisma.department.findUnique.mockResolvedValue(null);

      // Mock creation
      const createdDepartment = {
        id: 'dept1',
        ...validDepartmentData,
        parentDepartmentId: null,
        siteId: null,
        managerId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockPrisma.department.create.mockResolvedValue(createdDepartment);

      const result = await DepartmentService.createDepartment(validDepartmentData);

      expect(result).toEqual(createdDepartment);
      expect(mockPrisma.department.findUnique).toHaveBeenCalledWith({
        where: { departmentCode: 'ENG' }
      });
      expect(mockPrisma.department.create).toHaveBeenCalledWith({
        data: {
          departmentCode: 'ENG',
          departmentName: 'Engineering',
          description: 'Engineering department',
          parentDepartmentId: null,
          siteId: null,
          costCenter: 'CC-3000',
          budgetCode: 'BG-ENG',
          managerId: null,
          isActive: true
        }
      });
    });

    test('should throw error if department code already exists', async () => {
      mockPrisma.department.findUnique.mockResolvedValue({
        id: 'existing',
        departmentCode: 'ENG',
        departmentName: 'Existing Engineering'
      });

      await expect(DepartmentService.createDepartment(validDepartmentData))
        .rejects.toThrow("Department with code 'ENG' already exists");
    });

    test('should validate parent department exists', async () => {
      mockPrisma.department.findUnique
        .mockResolvedValueOnce(null) // For uniqueness check
        .mockResolvedValueOnce(null); // For parent check

      const dataWithParent = {
        ...validDepartmentData,
        parentDepartmentId: 'nonexistent'
      };

      await expect(DepartmentService.createDepartment(dataWithParent))
        .rejects.toThrow("Parent department with ID 'nonexistent' not found");
    });

    test('should validate site exists', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      mockPrisma.site.findUnique.mockResolvedValue(null);

      const dataWithSite = {
        ...validDepartmentData,
        siteId: 'nonexistent'
      };

      await expect(DepartmentService.createDepartment(dataWithSite))
        .rejects.toThrow("Site with ID 'nonexistent' not found");
    });

    test('should validate manager exists', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      const dataWithManager = {
        ...validDepartmentData,
        managerId: 'nonexistent'
      };

      await expect(DepartmentService.createDepartment(dataWithManager))
        .rejects.toThrow("Manager with ID 'nonexistent' not found");
    });

    test('should create department with parent successfully', async () => {
      mockPrisma.department.findUnique
        .mockResolvedValueOnce(null) // Uniqueness check
        .mockResolvedValueOnce({ id: 'parent1', departmentCode: 'PARENT' }); // Parent check

      const createdDepartment = {
        id: 'dept1',
        ...validDepartmentData,
        parentDepartmentId: 'parent1',
        siteId: null,
        managerId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      mockPrisma.department.create.mockResolvedValue(createdDepartment);

      const dataWithParent = {
        ...validDepartmentData,
        parentDepartmentId: 'parent1'
      };

      const result = await DepartmentService.createDepartment(dataWithParent);

      expect(result).toEqual(createdDepartment);
      expect(mockPrisma.department.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          parentDepartmentId: 'parent1'
        })
      });
    });
  });

  // ============================================================================
  // READ OPERATIONS
  // ============================================================================

  describe('getDepartmentById', () => {
    const mockDepartment = {
      id: 'dept1',
      departmentCode: 'ENG',
      departmentName: 'Engineering',
      description: 'Engineering department',
      parentDepartmentId: null,
      siteId: null,
      costCenter: 'CC-3000',
      budgetCode: 'BG-ENG',
      managerId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should get department by ID without relations', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(mockDepartment);

      const result = await DepartmentService.getDepartmentById('dept1', false);

      expect(result).toEqual(mockDepartment);
      expect(mockPrisma.department.findUnique).toHaveBeenCalledWith({
        where: { id: 'dept1' },
        include: undefined
      });
    });

    test('should get department by ID with relations', async () => {
      const departmentWithRelations = {
        ...mockDepartment,
        parentDepartment: null,
        childDepartments: [],
        site: null,
        manager: null,
        users: [],
        _count: { users: 0, childDepartments: 0 }
      };

      mockPrisma.department.findUnique.mockResolvedValue(departmentWithRelations);

      const result = await DepartmentService.getDepartmentById('dept1', true);

      expect(result).toEqual(departmentWithRelations);
      expect(mockPrisma.department.findUnique).toHaveBeenCalledWith({
        where: { id: 'dept1' },
        include: {
          parentDepartment: true,
          childDepartments: {
            where: { isActive: true },
            orderBy: { departmentName: 'asc' }
          },
          site: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true
            }
          },
          users: {
            where: { isActive: true },
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              employeeNumber: true
            }
          },
          _count: {
            select: {
              users: true,
              childDepartments: true
            }
          }
        }
      });
    });

    test('should return null if department not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      const result = await DepartmentService.getDepartmentById('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getDepartmentByCode', () => {
    test('should get department by code', async () => {
      const mockDepartment = {
        id: 'dept1',
        departmentCode: 'ENG',
        departmentName: 'Engineering'
      };

      mockPrisma.department.findUnique.mockResolvedValue(mockDepartment);

      const result = await DepartmentService.getDepartmentByCode('ENG');

      expect(result).toEqual(mockDepartment);
      expect(mockPrisma.department.findUnique).toHaveBeenCalledWith({
        where: { departmentCode: 'ENG' },
        include: undefined
      });
    });
  });

  describe('getDepartments', () => {
    test('should get departments with no filters', async () => {
      const mockDepartments = [
        { id: 'dept1', departmentCode: 'ENG', departmentName: 'Engineering' },
        { id: 'dept2', departmentCode: 'QA', departmentName: 'Quality' }
      ];

      mockPrisma.department.findMany.mockResolvedValue(mockDepartments);

      const result = await DepartmentService.getDepartments();

      expect(result).toEqual(mockDepartments);
      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: {},
        include: undefined,
        orderBy: { departmentName: 'asc' }
      });
    });

    test('should get departments with filters', async () => {
      const mockDepartments = [
        { id: 'dept1', departmentCode: 'ENG', departmentName: 'Engineering', siteId: 'site1' }
      ];

      mockPrisma.department.findMany.mockResolvedValue(mockDepartments);

      const filters = {
        siteId: 'site1',
        isActive: true,
        search: 'eng'
      };

      const result = await DepartmentService.getDepartments(filters);

      expect(result).toEqual(mockDepartments);
      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: {
          siteId: 'site1',
          isActive: true,
          OR: [
            { departmentCode: { contains: 'eng', mode: 'insensitive' } },
            { departmentName: { contains: 'eng', mode: 'insensitive' } },
            { description: { contains: 'eng', mode: 'insensitive' } }
          ]
        },
        include: undefined,
        orderBy: { departmentName: 'asc' }
      });
    });

    test('should handle parent department filter', async () => {
      mockPrisma.department.findMany.mockResolvedValue([]);

      await DepartmentService.getDepartments({ parentDepartmentId: 'parent1' });

      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: { parentDepartmentId: 'parent1' },
        include: undefined,
        orderBy: { departmentName: 'asc' }
      });
    });

    test('should handle null parent department filter', async () => {
      mockPrisma.department.findMany.mockResolvedValue([]);

      await DepartmentService.getDepartments({ parentDepartmentId: null });

      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: { parentDepartmentId: null },
        include: undefined,
        orderBy: { departmentName: 'asc' }
      });
    });
  });

  // ============================================================================
  // UPDATE OPERATIONS
  // ============================================================================

  describe('updateDepartment', () => {
    const existingDepartment = {
      id: 'dept1',
      departmentCode: 'ENG',
      departmentName: 'Engineering',
      description: 'Old description',
      parentDepartmentId: null,
      siteId: null,
      costCenter: null,
      budgetCode: null,
      managerId: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should update department successfully', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existingDepartment);

      const updateData: UpdateDepartmentData = {
        departmentName: 'Updated Engineering',
        description: 'Updated description',
        costCenter: 'CC-3001'
      };

      const updatedDepartment = {
        ...existingDepartment,
        ...updateData,
        updatedAt: new Date()
      };

      mockPrisma.department.update.mockResolvedValue(updatedDepartment);

      const result = await DepartmentService.updateDepartment('dept1', updateData);

      expect(result).toEqual(updatedDepartment);
      expect(mockPrisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept1' },
        data: {
          departmentName: 'Updated Engineering',
          description: 'Updated description',
          parentDepartmentId: undefined,
          siteId: undefined,
          costCenter: 'CC-3001',
          budgetCode: undefined,
          managerId: undefined,
          isActive: undefined,
          updatedAt: expect.any(Date)
        }
      });
    });

    test('should throw error if department not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(DepartmentService.updateDepartment('nonexistent', {}))
        .rejects.toThrow("Department with ID 'nonexistent' not found");
    });

    test('should validate parent department when updating', async () => {
      mockPrisma.department.findUnique
        .mockResolvedValueOnce(existingDepartment) // Department exists check
        .mockResolvedValueOnce(null); // Parent check

      await expect(DepartmentService.updateDepartment('dept1', { parentDepartmentId: 'nonexistent' }))
        .rejects.toThrow("Parent department with ID 'nonexistent' not found");
    });

    test('should handle null values in updates', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(existingDepartment);
      mockPrisma.department.update.mockResolvedValue(existingDepartment);

      await DepartmentService.updateDepartment('dept1', {
        description: null,
        parentDepartmentId: null
      });

      expect(mockPrisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept1' },
        data: expect.objectContaining({
          description: null,
          parentDepartmentId: null
        })
      });
    });
  });

  // ============================================================================
  // DELETE OPERATIONS
  // ============================================================================

  describe('deleteDepartment', () => {
    const departmentWithoutDependencies = {
      id: 'dept1',
      departmentCode: 'ENG',
      departmentName: 'Engineering',
      childDepartments: [],
      users: []
    };

    test('should soft delete department successfully', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(departmentWithoutDependencies);

      const softDeletedDepartment = {
        ...departmentWithoutDependencies,
        isActive: false,
        updatedAt: new Date()
      };

      mockPrisma.department.update.mockResolvedValue(softDeletedDepartment);

      const result = await DepartmentService.deleteDepartment('dept1', false);

      expect(result).toEqual(softDeletedDepartment);
      expect(mockPrisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept1' },
        data: {
          isActive: false,
          updatedAt: expect.any(Date)
        }
      });
    });

    test('should hard delete department successfully', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(departmentWithoutDependencies);
      mockPrisma.department.delete.mockResolvedValue(departmentWithoutDependencies);

      const result = await DepartmentService.deleteDepartment('dept1', true);

      expect(result).toEqual(departmentWithoutDependencies);
      expect(mockPrisma.department.delete).toHaveBeenCalledWith({
        where: { id: 'dept1' }
      });
    });

    test('should throw error if department not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(DepartmentService.deleteDepartment('nonexistent'))
        .rejects.toThrow("Department with ID 'nonexistent' not found");
    });

    test('should throw error if department has child departments', async () => {
      const departmentWithChildren = {
        ...departmentWithoutDependencies,
        childDepartments: [{ id: 'child1', departmentName: 'Child' }],
        users: []
      };

      mockPrisma.department.findUnique.mockResolvedValue(departmentWithChildren);

      await expect(DepartmentService.deleteDepartment('dept1'))
        .rejects.toThrow('Cannot delete department: has child departments');
    });

    test('should throw error if department has assigned users', async () => {
      const departmentWithUsers = {
        ...departmentWithoutDependencies,
        childDepartments: [],
        users: [{ id: 'user1', firstName: 'John' }]
      };

      mockPrisma.department.findUnique.mockResolvedValue(departmentWithUsers);

      await expect(DepartmentService.deleteDepartment('dept1'))
        .rejects.toThrow('Cannot delete department: has assigned users');
    });
  });

  // ============================================================================
  // HIERARCHY OPERATIONS
  // ============================================================================

  describe('getDepartmentHierarchy', () => {
    test('should get department hierarchy', async () => {
      const rootDepartments = [
        { id: 'root1', departmentCode: 'ENG', departmentName: 'Engineering', parentDepartmentId: null }
      ];

      const childDepartments = [
        { id: 'child1', departmentCode: 'DESIGN', departmentName: 'Design', parentDepartmentId: 'root1' }
      ];

      mockPrisma.department.findMany
        .mockResolvedValueOnce(rootDepartments) // Root departments
        .mockResolvedValueOnce(childDepartments) // Child departments
        .mockResolvedValueOnce([]); // Grandchildren

      const result = await DepartmentService.getDepartmentHierarchy();

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: 'root1',
        level: 0,
        hasChildren: true,
        childDepartments: expect.arrayContaining([
          expect.objectContaining({
            id: 'child1',
            level: 1,
            hasChildren: false
          })
        ])
      });
    });

    test('should filter hierarchy by site', async () => {
      mockPrisma.department.findMany.mockResolvedValue([]);

      await DepartmentService.getDepartmentHierarchy('site1');

      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: {
          parentDepartmentId: null,
          isActive: true,
          siteId: 'site1'
        },
        orderBy: { departmentName: 'asc' }
      });
    });
  });

  describe('getDepartmentAncestors', () => {
    test('should get department ancestors', async () => {
      const grandchild = {
        id: 'grandchild1',
        parentDepartment: {
          id: 'child1',
          departmentName: 'Child'
        }
      };

      const child = {
        id: 'child1',
        parentDepartment: {
          id: 'root1',
          departmentName: 'Root'
        }
      };

      const root = {
        id: 'root1',
        parentDepartment: null
      };

      mockPrisma.department.findUnique
        .mockResolvedValueOnce(grandchild)
        .mockResolvedValueOnce(child)
        .mockResolvedValueOnce(root);

      const result = await DepartmentService.getDepartmentAncestors('grandchild1');

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'root1' });
      expect(result[1]).toMatchObject({ id: 'child1' });
    });
  });

  describe('moveDepartment', () => {
    test('should move department to new parent', async () => {
      const department = {
        id: 'dept1',
        departmentCode: 'ENG',
        departmentName: 'Engineering'
      };

      const newParent = {
        id: 'parent1',
        departmentCode: 'PARENT',
        departmentName: 'Parent'
      };

      mockPrisma.department.findUnique
        .mockResolvedValueOnce(department)
        .mockResolvedValueOnce(newParent);

      const updatedDepartment = {
        ...department,
        parentDepartmentId: 'parent1',
        updatedAt: new Date()
      };

      mockPrisma.department.update.mockResolvedValue(updatedDepartment);

      const result = await DepartmentService.moveDepartment('dept1', 'parent1');

      expect(result).toEqual(updatedDepartment);
      expect(mockPrisma.department.update).toHaveBeenCalledWith({
        where: { id: 'dept1' },
        data: {
          parentDepartmentId: 'parent1',
          updatedAt: expect.any(Date)
        }
      });
    });

    test('should throw error if department not found', async () => {
      mockPrisma.department.findUnique.mockResolvedValue(null);

      await expect(DepartmentService.moveDepartment('nonexistent', 'parent1'))
        .rejects.toThrow("Department with ID 'nonexistent' not found");
    });

    test('should throw error if new parent not found', async () => {
      mockPrisma.department.findUnique
        .mockResolvedValueOnce({ id: 'dept1', departmentCode: 'ENG' })
        .mockResolvedValueOnce(null);

      await expect(DepartmentService.moveDepartment('dept1', 'nonexistent'))
        .rejects.toThrow("New parent department with ID 'nonexistent' not found");
    });
  });

  // ============================================================================
  // SEARCH OPERATIONS
  // ============================================================================

  describe('searchDepartments', () => {
    test('should search departments with contains match', async () => {
      const mockResults = [
        { id: 'dept1', departmentCode: 'ENG', departmentName: 'Engineering' }
      ];

      mockPrisma.department.findMany.mockResolvedValue(mockResults);

      const result = await DepartmentService.searchDepartments('eng');

      expect(result).toEqual(mockResults);
      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { departmentCode: { contains: 'eng', mode: 'insensitive' } },
            { departmentName: { contains: 'eng', mode: 'insensitive' } },
            { description: { contains: 'eng', mode: 'insensitive' } },
            { costCenter: { contains: 'eng', mode: 'insensitive' } },
            { budgetCode: { contains: 'eng', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: [
          { departmentCode: 'asc' },
          { departmentName: 'asc' }
        ]
      });
    });

    test('should search departments with exact match', async () => {
      mockPrisma.department.findMany.mockResolvedValue([]);

      await DepartmentService.searchDepartments('ENG', { exactMatch: true });

      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: {
          isActive: true,
          OR: [
            { departmentCode: { equals: 'ENG', mode: 'insensitive' } },
            { departmentName: { equals: 'ENG', mode: 'insensitive' } }
          ]
        },
        include: expect.any(Object),
        orderBy: expect.any(Array)
      });
    });

    test('should include inactive departments when specified', async () => {
      mockPrisma.department.findMany.mockResolvedValue([]);

      await DepartmentService.searchDepartments('eng', { includeInactive: true });

      expect(mockPrisma.department.findMany).toHaveBeenCalledWith({
        where: {
          isActive: undefined,
          OR: expect.any(Array)
        },
        include: expect.any(Object),
        orderBy: expect.any(Array)
      });
    });
  });

  // ============================================================================
  // STATISTICS OPERATIONS
  // ============================================================================

  describe('getDepartmentStats', () => {
    test('should get department statistics', async () => {
      // Mock counts
      mockPrisma.department.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(8)  // active
        .mockResolvedValueOnce(5)  // with users
        .mockResolvedValueOnce(3); // with managers

      // Mock department levels
      mockPrisma.department.findMany
        .mockResolvedValueOnce([
          { id: 'dept1', parentDepartmentId: null },
          { id: 'dept2', parentDepartmentId: 'dept1' }
        ]) // for level calculation
        .mockResolvedValueOnce([
          { id: 'dept1', _count: { users: 5 } },
          { id: 'dept2', _count: { users: 3 } }
        ]); // for users per department

      // Mock hierarchy queries for level calculation
      mockPrisma.department.findUnique
        .mockResolvedValueOnce({ parentDepartmentId: null }) // dept1 level 0
        .mockResolvedValueOnce({ parentDepartmentId: 'dept1' }) // dept2 level 1
        .mockResolvedValueOnce({ parentDepartmentId: null }); // parent of dept2

      const result = await DepartmentService.getDepartmentStats();

      expect(result).toEqual({
        totalDepartments: 10,
        activeDepartments: 8,
        inactiveDepartments: 2,
        departmentsWithUsers: 5,
        departmentsWithManagers: 3,
        averageUsersPerDepartment: 0.8,
        departmentsByLevel: {
          0: 1,
          1: 1
        }
      });
    });

    test('should filter statistics by site', async () => {
      mockPrisma.department.count.mockResolvedValue(0);
      mockPrisma.department.findMany.mockResolvedValue([]);

      await DepartmentService.getDepartmentStats('site1');

      expect(mockPrisma.department.count).toHaveBeenCalledWith({
        where: { siteId: 'site1' }
      });
    });
  });
});