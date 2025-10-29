/**
 * Test Data Factories
 *
 * Factory functions for creating consistent test data across all database tests.
 * These factories generate realistic test data with proper relationships and constraints.
 */

import { faker } from '@faker-js/faker';
import type {
  User,
  Enterprise,
  Site,
  Part,
  WorkOrder,
  Equipment,
  Comment,
  CollaborationEvent,
  TimeEntry,
  Role,
  Permission,
  UserSite,
  PartInventory,
} from '@prisma/client';

/**
 * Base factory configuration
 */
export interface FactoryOptions<T> {
  /** Override specific fields */
  overrides?: Partial<T>;
  /** Generate multiple instances */
  count?: number;
  /** Use consistent seed for reproducible data */
  seed?: number;
}

/**
 * Generate test-prefixed unique identifiers
 */
export function generateTestId(prefix: string = 'test'): string {
  return `${prefix}-${faker.string.uuid()}`;
}

/**
 * Generate consistent test data with seed
 */
export function withSeed<T>(seed: number, factory: () => T): T {
  faker.seed(seed);
  const result = factory();
  faker.seed(); // Reset seed
  return result;
}

/**
 * Enterprise factory
 */
export function createEnterpriseData(options: FactoryOptions<Enterprise> = {}): Omit<Enterprise, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    enterpriseName: `test-enterprise-${faker.company.name()}`,
    enterpriseCode: faker.string.alphanumeric(6).toUpperCase(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    postalCode: faker.location.zipCode(),
    country: faker.location.country(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    website: faker.internet.url(),
    description: faker.company.catchPhrase(),
    isActive: true,
    metadata: {
      industry: faker.company.buzzNoun(),
      employees: faker.number.int({ min: 10, max: 10000 }),
      founded: faker.date.past({ years: 50 }).getFullYear(),
    },
    ...overrides,
  };
}

/**
 * Site factory
 */
export function createSiteData(
  enterpriseId: string,
  options: FactoryOptions<Site> = {}
): Omit<Site, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    siteName: `test-site-${faker.location.city()}`,
    siteCode: faker.string.alphanumeric(8).toUpperCase(),
    address: faker.location.streetAddress(),
    city: faker.location.city(),
    state: faker.location.state({ abbreviated: true }),
    postalCode: faker.location.zipCode(),
    country: faker.location.country(),
    phone: faker.phone.number(),
    email: faker.internet.email(),
    description: faker.lorem.sentence(),
    enterpriseId,
    isActive: true,
    metadata: {
      timezone: faker.location.timeZone(),
      area: faker.number.int({ min: 1000, max: 100000 }),
      type: faker.helpers.arrayElement(['manufacturing', 'warehouse', 'office', 'retail']),
    },
    ...overrides,
  };
}

/**
 * User factory
 */
export function createUserData(options: FactoryOptions<User> = {}): Omit<User, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    username: `test-user-${faker.internet.userName({ firstName, lastName })}`,
    email: `test-${faker.internet.email({ firstName, lastName })}`,
    firstName,
    lastName,
    passwordHash: '$2b$10$test.hash.value.' + faker.string.alphanumeric(20),
    phone: faker.phone.number(),
    department: faker.commerce.department(),
    jobTitle: faker.person.jobTitle(),
    isActive: true,
    lastLoginAt: faker.date.recent(),
    metadata: {
      preferences: {
        theme: faker.helpers.arrayElement(['light', 'dark']),
        language: faker.helpers.arrayElement(['en', 'es', 'fr']),
        notifications: faker.datatype.boolean(),
      },
      skills: faker.helpers.arrayElements([
        'mechanical', 'electrical', 'programming', 'quality', 'safety'
      ], { min: 1, max: 3 }),
    },
    ...overrides,
  };
}

/**
 * Part factory
 */
export function createPartData(options: FactoryOptions<Part> = {}): Omit<Part, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    partNumber: `test-part-${faker.string.alphanumeric(8).toUpperCase()}`,
    partName: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    unitOfMeasure: faker.helpers.arrayElement(['EA', 'LB', 'FT', 'GAL', 'PCS']),
    unitCost: parseFloat(faker.commerce.price({ min: 1, max: 1000 })),
    category: faker.commerce.department(),
    manufacturer: faker.company.name(),
    manufacturerPartNumber: faker.string.alphanumeric(10),
    supplier: faker.company.name(),
    supplierPartNumber: faker.string.alphanumeric(12),
    leadTimeDays: faker.number.int({ min: 1, max: 90 }),
    minimumStock: faker.number.int({ min: 0, max: 100 }),
    maximumStock: faker.number.int({ min: 100, max: 1000 }),
    isActive: true,
    specifications: {
      weight: faker.number.float({ min: 0.1, max: 100, fractionDigits: 2 }),
      dimensions: {
        length: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
        width: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
        height: faker.number.float({ min: 1, max: 100, fractionDigits: 2 }),
      },
      material: faker.helpers.arrayElement(['steel', 'aluminum', 'plastic', 'rubber']),
    },
    ...overrides,
  };
}

/**
 * WorkOrder factory
 */
export function createWorkOrderData(
  siteId: string,
  options: FactoryOptions<WorkOrder> = {}
): Omit<WorkOrder, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    workOrderNumber: `test-wo-${faker.string.alphanumeric(8).toUpperCase()}`,
    title: `Test Work Order - ${faker.commerce.productAdjective()} ${faker.commerce.product()}`,
    description: faker.lorem.paragraphs(2),
    priority: faker.helpers.arrayElement(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']),
    status: faker.helpers.arrayElement(['DRAFT', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
    workOrderType: faker.helpers.arrayElement(['PREVENTIVE', 'CORRECTIVE', 'EMERGENCY', 'PROJECT']),
    siteId,
    assignedToUserId: null,
    equipmentId: null,
    partId: null,
    scheduledStartDate: faker.date.future(),
    scheduledEndDate: faker.date.future(),
    actualStartDate: null,
    actualEndDate: null,
    estimatedHours: faker.number.float({ min: 0.5, max: 40, fractionDigits: 1 }),
    actualHours: null,
    estimatedCost: parseFloat(faker.commerce.price({ min: 100, max: 5000 })),
    actualCost: null,
    isActive: true,
    instructions: faker.lorem.paragraphs(3),
    safetyNotes: faker.lorem.sentences(2),
    completionNotes: null,
    metadata: {
      source: faker.helpers.arrayElement(['manual', 'scheduled', 'sensor', 'inspection']),
      tags: faker.helpers.arrayElements([
        'maintenance', 'repair', 'inspection', 'calibration', 'upgrade'
      ], { min: 1, max: 3 }),
    },
    ...overrides,
  };
}

/**
 * Equipment factory
 */
export function createEquipmentData(
  siteId: string,
  options: FactoryOptions<Equipment> = {}
): Omit<Equipment, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    equipmentNumber: `test-eq-${faker.string.alphanumeric(8).toUpperCase()}`,
    equipmentName: faker.commerce.productName(),
    description: faker.commerce.productDescription(),
    equipmentType: faker.helpers.arrayElement(['MACHINE', 'TOOL', 'VEHICLE', 'INSTRUMENT']),
    manufacturer: faker.company.name(),
    model: faker.string.alphanumeric(10),
    serialNumber: faker.string.alphanumeric(15),
    location: faker.location.streetAddress(),
    siteId,
    isActive: true,
    installationDate: faker.date.past({ years: 10 }),
    warrantyExpiration: faker.date.future({ years: 2 }),
    specifications: {
      capacity: faker.number.int({ min: 100, max: 10000 }),
      power: faker.number.int({ min: 1, max: 500 }),
      voltage: faker.helpers.arrayElement([110, 220, 440]),
      frequency: faker.helpers.arrayElement([50, 60]),
    },
    maintenanceSchedule: {
      interval: faker.number.int({ min: 30, max: 365 }),
      lastMaintenance: faker.date.past(),
      nextMaintenance: faker.date.future(),
    },
    ...overrides,
  };
}

/**
 * Comment factory
 */
export function createCommentData(
  userId: string,
  options: FactoryOptions<Comment> = {}
): Omit<Comment, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    content: faker.lorem.paragraphs(faker.number.int({ min: 1, max: 3 })),
    type: faker.helpers.arrayElement(['GENERAL', 'TECHNICAL', 'SAFETY', 'QUALITY']),
    entityType: faker.helpers.arrayElement(['WORK_ORDER', 'EQUIPMENT', 'PART', 'USER']),
    entityId: generateTestId('entity'),
    userId,
    isActive: true,
    metadata: {
      priority: faker.helpers.arrayElement(['low', 'medium', 'high']),
      tags: faker.helpers.arrayElements(['urgent', 'review', 'follow-up'], { min: 0, max: 2 }),
    },
    ...overrides,
  };
}

/**
 * CollaborationEvent factory
 */
export function createCollaborationEventData(
  userId: string,
  options: FactoryOptions<CollaborationEvent> = {}
): Omit<CollaborationEvent, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    eventType: faker.helpers.arrayElement(['VIEW', 'EDIT', 'COMMENT', 'SHARE', 'APPROVE']),
    entityType: faker.helpers.arrayElement(['WORK_ORDER', 'EQUIPMENT', 'PART', 'DOCUMENT']),
    entityId: generateTestId('entity'),
    userId,
    details: {
      action: faker.helpers.arrayElement(['created', 'updated', 'deleted', 'viewed']),
      changes: {
        field: faker.database.column(),
        oldValue: faker.lorem.word(),
        newValue: faker.lorem.word(),
      },
    },
    sessionId: generateTestId('session'),
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    metadata: {
      source: faker.helpers.arrayElement(['web', 'mobile', 'api']),
      location: faker.location.city(),
    },
    ...overrides,
  };
}

/**
 * TimeEntry factory
 */
export function createTimeEntryData(
  userId: string,
  options: FactoryOptions<TimeEntry> = {}
): Omit<TimeEntry, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;
  const startTime = faker.date.recent();
  const endTime = new Date(startTime.getTime() + faker.number.int({ min: 30, max: 480 }) * 60000);

  return {
    userId,
    entityType: faker.helpers.arrayElement(['WORK_ORDER', 'PROJECT', 'GENERAL']),
    entityId: generateTestId('entity'),
    startTime,
    endTime,
    duration: Math.floor((endTime.getTime() - startTime.getTime()) / 60000), // minutes
    description: faker.lorem.sentence(),
    category: faker.helpers.arrayElement(['PRODUCTION', 'MAINTENANCE', 'SETUP', 'BREAK']),
    isActive: true,
    metadata: {
      location: faker.location.city(),
      activityType: faker.helpers.arrayElement(['manual', 'automatic', 'mobile']),
    },
    ...overrides,
  };
}

/**
 * Role factory
 */
export function createRoleData(options: FactoryOptions<Role> = {}): Omit<Role, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    name: `test-role-${faker.person.jobTitle().toLowerCase().replace(/\s+/g, '-')}`,
    description: faker.lorem.sentence(),
    isActive: true,
    metadata: {
      level: faker.helpers.arrayElement(['basic', 'intermediate', 'advanced']),
      department: faker.commerce.department(),
    },
    ...overrides,
  };
}

/**
 * Permission factory
 */
export function createPermissionData(options: FactoryOptions<Permission> = {}): Omit<Permission, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    name: `test-permission-${faker.database.collation().toLowerCase().replace(/\s+/g, '-')}`,
    resource: faker.helpers.arrayElement(['work_orders', 'equipment', 'parts', 'users', 'reports']),
    action: faker.helpers.arrayElement(['create', 'read', 'update', 'delete', 'approve']),
    description: faker.lorem.sentence(),
    isActive: true,
    metadata: {
      scope: faker.helpers.arrayElement(['global', 'site', 'department']),
      restrictions: [],
    },
    ...overrides,
  };
}

/**
 * UserSite factory
 */
export function createUserSiteData(
  userId: string,
  siteId: string,
  options: FactoryOptions<UserSite> = {}
): Omit<UserSite, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    userId,
    siteId,
    isActive: true,
    startDate: faker.date.past(),
    endDate: null,
    metadata: {
      accessLevel: faker.helpers.arrayElement(['basic', 'standard', 'advanced', 'admin']),
      department: faker.commerce.department(),
    },
    ...overrides,
  };
}

/**
 * PartInventory factory
 */
export function createPartInventoryData(
  partId: string,
  siteId: string,
  options: FactoryOptions<PartInventory> = {}
): Omit<PartInventory, 'id' | 'createdAt' | 'updatedAt'> {
  const { overrides = {} } = options;

  return {
    partId,
    siteId,
    quantity: faker.number.int({ min: 0, max: 1000 }),
    location: faker.location.streetAddress(),
    binNumber: faker.string.alphanumeric(8).toUpperCase(),
    lotNumber: faker.string.alphanumeric(12).toUpperCase(),
    expirationDate: faker.date.future(),
    unitCost: parseFloat(faker.commerce.price({ min: 1, max: 500 })),
    isActive: true,
    metadata: {
      condition: faker.helpers.arrayElement(['new', 'used', 'refurbished']),
      storage: faker.helpers.arrayElement(['ambient', 'refrigerated', 'controlled']),
    },
    ...overrides,
  };
}

/**
 * Batch factory utilities
 */
export class BatchFactory {
  /**
   * Create multiple instances with related data
   */
  static async createEnterpriseWithSites(
    siteCount: number = 3,
    options: {
      enterprise?: FactoryOptions<Enterprise>;
      sites?: FactoryOptions<Site>;
    } = {}
  ) {
    const enterpriseData = createEnterpriseData(options.enterprise);
    const sitesData = Array.from({ length: siteCount }, () =>
      createSiteData('enterprise-id-placeholder', options.sites)
    );

    return { enterpriseData, sitesData };
  }

  /**
   * Create complete user setup with sites and roles
   */
  static async createUserWithSites(
    siteIds: string[],
    options: {
      user?: FactoryOptions<User>;
      userSites?: FactoryOptions<UserSite>;
    } = {}
  ) {
    const userData = createUserData(options.user);
    const userSitesData = siteIds.map(siteId =>
      createUserSiteData('user-id-placeholder', siteId, options.userSites)
    );

    return { userData, userSitesData };
  }

  /**
   * Create work order with related data
   */
  static async createWorkOrderWithDependencies(
    siteId: string,
    options: {
      workOrder?: FactoryOptions<WorkOrder>;
      equipment?: FactoryOptions<Equipment>;
      parts?: FactoryOptions<Part>[];
    } = {}
  ) {
    const workOrderData = createWorkOrderData(siteId, options.workOrder);
    const equipmentData = createEquipmentData(siteId, options.equipment);
    const partsData = options.parts?.map(partOptions => createPartData(partOptions)) || [];

    return { workOrderData, equipmentData, partsData };
  }
}

/**
 * Predefined test scenarios
 */
export const TestScenarios = {
  /**
   * Complete manufacturing setup
   */
  manufacturingSetup: () => ({
    enterprise: createEnterpriseData({
      overrides: {
        enterpriseName: 'test-manufacturing-corp',
        metadata: { industry: 'manufacturing' }
      }
    }),
    sites: [
      createSiteData('enterprise-id', {
        overrides: {
          siteName: 'test-main-plant',
          metadata: { type: 'manufacturing' }
        }
      }),
      createSiteData('enterprise-id', {
        overrides: {
          siteName: 'test-warehouse',
          metadata: { type: 'warehouse' }
        }
      }),
    ],
    users: [
      createUserData({
        overrides: {
          username: 'test-supervisor',
          jobTitle: 'Manufacturing Supervisor'
        }
      }),
      createUserData({
        overrides: {
          username: 'test-technician',
          jobTitle: 'Maintenance Technician'
        }
      }),
    ],
  }),

  /**
   * Maintenance workflow setup
   */
  maintenanceWorkflow: (siteId: string) => ({
    equipment: createEquipmentData(siteId, {
      overrides: {
        equipmentName: 'test-critical-machine',
        equipmentType: 'MACHINE',
      }
    }),
    workOrder: createWorkOrderData(siteId, {
      overrides: {
        title: 'test-preventive-maintenance',
        workOrderType: 'PREVENTIVE',
        priority: 'HIGH',
      }
    }),
    parts: [
      createPartData({
        overrides: {
          partName: 'test-maintenance-part',
          category: 'Maintenance',
        }
      }),
    ],
  }),
};