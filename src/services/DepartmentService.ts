/**
 * DepartmentService - Comprehensive department management with hierarchy support
 *
 * Provides full CRUD operations for departments including:
 * - Create, read, update, delete operations
 * - Hierarchical organization management
 * - Cost center and budget tracking
 * - Manager assignments
 * - Department-based filtering and search
 *
 * Created for Issue #209: Department Lookup Table Implementation
 */

import { Department, User, Site } from '@prisma/client';
import prisma from '../lib/database';

// Guard check for prisma instance
if (!prisma) {
  throw new Error('Database connection not available. Check DATABASE_URL environment variable and database server connectivity.');
}

// Types for department operations
export interface CreateDepartmentData {
  departmentCode: string;
  departmentName: string;
  description?: string;
  parentDepartmentId?: string;
  siteId?: string;
  costCenter?: string;
  budgetCode?: string;
  managerId?: string;
  isActive?: boolean;
}

export interface UpdateDepartmentData {
  departmentName?: string;
  description?: string;
  parentDepartmentId?: string;
  siteId?: string;
  costCenter?: string;
  budgetCode?: string;
  managerId?: string;
  isActive?: boolean;
}

export interface DepartmentFilterOptions {
  siteId?: string;
  parentDepartmentId?: string;
  isActive?: boolean;
  search?: string;
  managerId?: string;
  costCenter?: string;
}

export interface DepartmentWithRelations extends Department {
  parentDepartment?: Department | null;
  childDepartments?: Department[];
  site?: Site | null;
  manager?: User | null;
  users?: User[];
  _count?: {
    users: number;
    childDepartments: number;
  };
}

export interface DepartmentHierarchy extends Department {
  level: number;
  hasChildren: boolean;
  childDepartments: DepartmentHierarchy[];
}

export interface DepartmentStats {
  totalDepartments: number;
  activeDepartments: number;
  inactiveDepartments: number;
  departmentsWithUsers: number;
  departmentsWithManagers: number;
  averageUsersPerDepartment: number;
  departmentsByLevel: Record<number, number>;
}

/**
 * Department Service Class
 */
export class DepartmentService {
  /**
   * Create a new department
   */
  static async createDepartment(data: CreateDepartmentData): Promise<Department> {
    // Validate department code uniqueness
    const existingDepartment = await prisma.department.findUnique({
      where: { departmentCode: data.departmentCode }
    });

    if (existingDepartment) {
      throw new Error(`Department with code '${data.departmentCode}' already exists`);
    }

    // Validate parent department exists if specified
    if (data.parentDepartmentId) {
      const parentDepartment = await prisma.department.findUnique({
        where: { id: data.parentDepartmentId }
      });

      if (!parentDepartment) {
        throw new Error(`Parent department with ID '${data.parentDepartmentId}' not found`);
      }

      // Prevent circular references
      const isCircular = await DepartmentService.wouldCreateCircularReference(
        data.parentDepartmentId,
        data.departmentCode
      );

      if (isCircular) {
        throw new Error('Cannot create department: would create circular reference in hierarchy');
      }
    }

    // Validate site exists if specified
    if (data.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: data.siteId }
      });

      if (!site) {
        throw new Error(`Site with ID '${data.siteId}' not found`);
      }
    }

    // Validate manager exists if specified
    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId }
      });

      if (!manager) {
        throw new Error(`Manager with ID '${data.managerId}' not found`);
      }
    }

    return prisma.department.create({
      data: {
        departmentCode: data.departmentCode,
        departmentName: data.departmentName,
        description: data.description || null,
        parentDepartmentId: data.parentDepartmentId || null,
        siteId: data.siteId || null,
        costCenter: data.costCenter || null,
        budgetCode: data.budgetCode || null,
        managerId: data.managerId || null,
        isActive: data.isActive ?? true
      }
    });
  }

  /**
   * Get department by ID with optional relations
   */
  static async getDepartmentById(
    id: string,
    includeRelations: boolean = false
  ): Promise<DepartmentWithRelations | null> {
    return prisma.department.findUnique({
      where: { id },
      include: includeRelations ? {
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
      } : undefined
    });
  }

  /**
   * Get department by code with optional relations
   */
  static async getDepartmentByCode(
    departmentCode: string,
    includeRelations: boolean = false
  ): Promise<DepartmentWithRelations | null> {
    return prisma.department.findUnique({
      where: { departmentCode },
      include: includeRelations ? {
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
      } : undefined
    });
  }

  /**
   * Get all departments with filtering options
   */
  static async getDepartments(
    filters: DepartmentFilterOptions = {},
    includeRelations: boolean = false
  ): Promise<DepartmentWithRelations[]> {
    const whereClause: any = {};

    if (filters.siteId) {
      whereClause.siteId = filters.siteId;
    }

    if (filters.parentDepartmentId !== undefined) {
      whereClause.parentDepartmentId = filters.parentDepartmentId;
    }

    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    if (filters.managerId) {
      whereClause.managerId = filters.managerId;
    }

    if (filters.costCenter) {
      whereClause.costCenter = filters.costCenter;
    }

    if (filters.search) {
      whereClause.OR = [
        { departmentCode: { contains: filters.search, mode: 'insensitive' } },
        { departmentName: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } }
      ];
    }

    return prisma.department.findMany({
      where: whereClause,
      include: includeRelations ? {
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
      } : undefined,
      orderBy: { departmentName: 'asc' }
    });
  }

  /**
   * Update department by ID
   */
  static async updateDepartment(id: string, data: UpdateDepartmentData): Promise<Department> {
    // Verify department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id }
    });

    if (!existingDepartment) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    // Validate parent department if being updated
    if (data.parentDepartmentId !== undefined) {
      if (data.parentDepartmentId) {
        const parentDepartment = await prisma.department.findUnique({
          where: { id: data.parentDepartmentId }
        });

        if (!parentDepartment) {
          throw new Error(`Parent department with ID '${data.parentDepartmentId}' not found`);
        }

        // Prevent circular references
        const isCircular = await DepartmentService.wouldCreateCircularReference(
          data.parentDepartmentId,
          existingDepartment.departmentCode
        );

        if (isCircular) {
          throw new Error('Cannot update department: would create circular reference in hierarchy');
        }
      }
    }

    // Validate site exists if specified
    if (data.siteId) {
      const site = await prisma.site.findUnique({
        where: { id: data.siteId }
      });

      if (!site) {
        throw new Error(`Site with ID '${data.siteId}' not found`);
      }
    }

    // Validate manager exists if specified
    if (data.managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: data.managerId }
      });

      if (!manager) {
        throw new Error(`Manager with ID '${data.managerId}' not found`);
      }
    }

    return prisma.department.update({
      where: { id },
      data: {
        departmentName: data.departmentName,
        description: data.description === null ? null : data.description,
        parentDepartmentId: data.parentDepartmentId === null ? null : data.parentDepartmentId,
        siteId: data.siteId === null ? null : data.siteId,
        costCenter: data.costCenter === null ? null : data.costCenter,
        budgetCode: data.budgetCode === null ? null : data.budgetCode,
        managerId: data.managerId === null ? null : data.managerId,
        isActive: data.isActive,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Delete department by ID (soft delete by setting isActive to false)
   */
  static async deleteDepartment(id: string, hardDelete: boolean = false): Promise<Department> {
    // Verify department exists
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
      include: {
        childDepartments: true,
        users: true
      }
    });

    if (!existingDepartment) {
      throw new Error(`Department with ID '${id}' not found`);
    }

    // Check for dependencies
    if (existingDepartment.childDepartments.length > 0) {
      throw new Error('Cannot delete department: has child departments');
    }

    if (existingDepartment.users.length > 0) {
      throw new Error('Cannot delete department: has assigned users');
    }

    if (hardDelete) {
      return prisma.department.delete({
        where: { id }
      });
    } else {
      return prisma.department.update({
        where: { id },
        data: {
          isActive: false,
          updatedAt: new Date()
        }
      });
    }
  }

  /**
   * Get department hierarchy starting from root departments
   */
  static async getDepartmentHierarchy(siteId?: string): Promise<DepartmentHierarchy[]> {
    const rootDepartments = await prisma.department.findMany({
      where: {
        parentDepartmentId: null,
        isActive: true,
        ...(siteId && { siteId })
      },
      orderBy: { departmentName: 'asc' }
    });

    const buildHierarchy = async (department: Department, level: number = 0): Promise<DepartmentHierarchy> => {
      const childDepartments = await prisma.department.findMany({
        where: {
          parentDepartmentId: department.id,
          isActive: true
        },
        orderBy: { departmentName: 'asc' }
      });

      const children = await Promise.all(
        childDepartments.map(child => buildHierarchy(child, level + 1))
      );

      return {
        ...department,
        level,
        hasChildren: children.length > 0,
        childDepartments: children
      };
    };

    return Promise.all(rootDepartments.map(dept => buildHierarchy(dept)));
  }

  /**
   * Get all ancestors of a department
   */
  static async getDepartmentAncestors(departmentId: string): Promise<Department[]> {
    const ancestors: Department[] = [];
    let currentDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
      include: { parentDepartment: true }
    });

    while (currentDepartment?.parentDepartment) {
      ancestors.unshift(currentDepartment.parentDepartment);
      currentDepartment = await prisma.department.findUnique({
        where: { id: currentDepartment.parentDepartment.id },
        include: { parentDepartment: true }
      });
    }

    return ancestors;
  }

  /**
   * Get all descendants of a department
   */
  static async getDepartmentDescendants(departmentId: string): Promise<Department[]> {
    const descendants: Department[] = [];

    const getChildren = async (parentId: string): Promise<void> => {
      const children = await prisma.department.findMany({
        where: {
          parentDepartmentId: parentId,
          isActive: true
        }
      });

      for (const child of children) {
        descendants.push(child);
        await getChildren(child.id);
      }
    };

    await getChildren(departmentId);
    return descendants;
  }

  /**
   * Move department to a new parent
   */
  static async moveDepartment(departmentId: string, newParentId: string | null): Promise<Department> {
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      throw new Error(`Department with ID '${departmentId}' not found`);
    }

    if (newParentId) {
      const newParent = await prisma.department.findUnique({
        where: { id: newParentId }
      });

      if (!newParent) {
        throw new Error(`New parent department with ID '${newParentId}' not found`);
      }

      // Check for circular reference
      const isCircular = await DepartmentService.wouldCreateCircularReference(newParentId, department.departmentCode);
      if (isCircular) {
        throw new Error('Cannot move department: would create circular reference');
      }
    }

    return prisma.department.update({
      where: { id: departmentId },
      data: {
        parentDepartmentId: newParentId,
        updatedAt: new Date()
      }
    });
  }

  /**
   * Get department statistics
   */
  static async getDepartmentStats(siteId?: string): Promise<DepartmentStats> {
    const whereClause = siteId ? { siteId } : {};

    const [
      totalDepartments,
      activeDepartments,
      departmentsWithUsers,
      departmentsWithManagers,
      departmentLevels
    ] = await Promise.all([
      prisma.department.count({ where: whereClause }),
      prisma.department.count({ where: { ...whereClause, isActive: true } }),
      prisma.department.count({
        where: {
          ...whereClause,
          users: { some: {} }
        }
      }),
      prisma.department.count({
        where: {
          ...whereClause,
          managerId: { not: null }
        }
      }),
      prisma.department.findMany({
        where: whereClause,
        select: { id: true, parentDepartmentId: true }
      })
    ]);

    // Calculate department levels
    const departmentsByLevel: Record<number, number> = {};
    for (const dept of departmentLevels) {
      const level = await this.getDepartmentLevel(dept.id);
      departmentsByLevel[level] = (departmentsByLevel[level] || 0) + 1;
    }

    // Calculate average users per department
    const usersPerDepartment = await prisma.department.findMany({
      where: whereClause,
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    const totalUsers = usersPerDepartment.reduce((sum, dept) => sum + dept._count.users, 0);
    const averageUsersPerDepartment = totalDepartments > 0 ? totalUsers / totalDepartments : 0;

    return {
      totalDepartments,
      activeDepartments,
      inactiveDepartments: totalDepartments - activeDepartments,
      departmentsWithUsers,
      departmentsWithManagers,
      averageUsersPerDepartment: Math.round(averageUsersPerDepartment * 100) / 100,
      departmentsByLevel
    };
  }

  /**
   * Search departments with advanced options
   */
  static async searchDepartments(
    query: string,
    options: {
      siteId?: string;
      includeInactive?: boolean;
      exactMatch?: boolean;
    } = {}
  ): Promise<DepartmentWithRelations[]> {
    const whereClause: any = {
      isActive: options.includeInactive ? undefined : true,
      ...(options.siteId && { siteId: options.siteId })
    };

    if (options.exactMatch) {
      whereClause.OR = [
        { departmentCode: { equals: query, mode: 'insensitive' } },
        { departmentName: { equals: query, mode: 'insensitive' } }
      ];
    } else {
      whereClause.OR = [
        { departmentCode: { contains: query, mode: 'insensitive' } },
        { departmentName: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { costCenter: { contains: query, mode: 'insensitive' } },
        { budgetCode: { contains: query, mode: 'insensitive' } }
      ];
    }

    return prisma.department.findMany({
      where: whereClause,
      include: {
        parentDepartment: true,
        site: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        _count: {
          select: {
            users: true,
            childDepartments: true
          }
        }
      },
      orderBy: [
        { departmentCode: 'asc' },
        { departmentName: 'asc' }
      ]
    });
  }

  /**
   * Helper method to check if a parent assignment would create circular reference
   */
  private static async wouldCreateCircularReference(
    potentialParentId: string,
    departmentCode: string
  ): Promise<boolean> {
    const department = await prisma.department.findUnique({
      where: { departmentCode }
    });

    if (!department) return false;

    // Get all descendants of the current department
    const descendants = await this.getDepartmentDescendants(department.id);

    // Check if the potential parent is among the descendants
    return descendants.some(desc => desc.id === potentialParentId);
  }

  /**
   * Get the hierarchical level of a department (0 = root)
   */
  private static async getDepartmentLevel(departmentId: string): Promise<number> {
    let level = 0;
    let currentDepartment = await prisma.department.findUnique({
      where: { id: departmentId },
      select: { parentDepartmentId: true }
    });

    while (currentDepartment?.parentDepartmentId) {
      level++;
      currentDepartment = await prisma.department.findUnique({
        where: { id: currentDepartment.parentDepartmentId },
        select: { parentDepartmentId: true }
      });
    }

    return level;
  }
}

export default DepartmentService;