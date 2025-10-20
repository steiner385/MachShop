/**
 * Demo Credentials Configuration
 * 
 * This file serves as the single source of truth for demo/test credentials
 * used in development mode. It ensures consistency between:
 * - Database seed data (prisma/seed.ts)
 * - Frontend login page display
 * - Test files
 * - Documentation
 */

export interface DemoUser {
  username: string;
  password: string;
  email: string;
  firstName: string;
  lastName: string;
  roles: string[];
  permissions: string[];
  description: string;
  displayName: string;
}

/**
 * Demo password used for all test accounts in development
 * This should NEVER be used in production environments
 */
export const DEMO_PASSWORD = 'password123';

/**
 * Demo user definitions
 * These users are automatically created by the database seed script
 */
export const DEMO_USERS: DemoUser[] = [
  {
    username: 'admin',
    password: DEMO_PASSWORD,
    email: 'admin@mes.com',
    firstName: 'System',
    lastName: 'Administrator',
    roles: ['Plant Manager', 'System Administrator'],
    permissions: [
      'workorders.read', 'workorders.write', 'workorders.delete',
      'quality.read', 'quality.write',
      'traceability.read', 'traceability.write',
      'equipment.read', 'equipment.write',
      'users.read', 'users.write'
    ],
    description: 'Full system access - Plant management and system administration',
    displayName: 'System Administrator'
  },
  {
    username: 'jane.smith',
    password: DEMO_PASSWORD,
    email: 'jane.smith@mes.com',
    firstName: 'Jane',
    lastName: 'Smith',
    roles: ['Quality Engineer'],
    permissions: [
      'workorders.read',
      'quality.read', 'quality.write',
      'traceability.read'
    ],
    description: 'Quality management - Inspections, NCRs, and quality reporting',
    displayName: 'Quality Engineer'
  },
  {
    username: 'john.doe',
    password: DEMO_PASSWORD,
    email: 'john.doe@mes.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['Production Operator'],
    permissions: [
      'workorders.read',
      'workinstructions.read', 'workinstructions.execute',
      'traceability.read'
    ],
    description: 'Production operations - Work order viewing and basic operations',
    displayName: 'Production Operator'
  },

  // === Additional Role-Based Test Users (Tier 1: Production) ===
  {
    username: 'prod.operator',
    password: DEMO_PASSWORD,
    email: 'prod.operator@mes.com',
    firstName: 'Production',
    lastName: 'Operator',
    roles: ['Production Operator'],
    permissions: ['workorders.read', 'workinstructions.read', 'workinstructions.execute', 'equipment.read'],
    description: 'Production operator - Execute work orders',
    displayName: 'Production Operator (Test)'
  },
  {
    username: 'prod.supervisor',
    password: DEMO_PASSWORD,
    email: 'prod.supervisor@mes.com',
    firstName: 'Production',
    lastName: 'Supervisor',
    roles: ['Production Supervisor'],
    permissions: ['workorders.read', 'workorders.write', 'production.read', 'production.write', 'personnel.read'],
    description: 'Production supervisor - Manage production floor',
    displayName: 'Production Supervisor'
  },
  {
    username: 'prod.planner',
    password: DEMO_PASSWORD,
    email: 'prod.planner@mes.com',
    firstName: 'Production',
    lastName: 'Planner',
    roles: ['Production Planner'],
    permissions: ['workorders.read', 'workorders.write', 'schedules.read', 'schedules.write', 'materials.read'],
    description: 'Production planner - Plan production schedules',
    displayName: 'Production Planner'
  },
  {
    username: 'prod.scheduler',
    password: DEMO_PASSWORD,
    email: 'prod.scheduler@mes.com',
    firstName: 'Production',
    lastName: 'Scheduler',
    roles: ['Production Scheduler'],
    permissions: ['workorders.read', 'schedules.read', 'schedules.write', 'equipment.read', 'materials.read'],
    description: 'Production scheduler - Schedule work orders',
    displayName: 'Production Scheduler'
  },
  {
    username: 'mfg.engineer',
    password: DEMO_PASSWORD,
    email: 'mfg.engineer@mes.com',
    firstName: 'Manufacturing',
    lastName: 'Engineer',
    roles: ['Manufacturing Engineer'],
    permissions: ['routing.read', 'routing.write', 'processsegments.read', 'processsegments.write', 'workinstructions.read', 'workinstructions.write'],
    description: 'Manufacturing engineer - Design process routings',
    displayName: 'Manufacturing Engineer'
  },

  // === Tier 2: Quality & Compliance ===
  {
    username: 'quality.engineer',
    password: DEMO_PASSWORD,
    email: 'quality.engineer@mes.com',
    firstName: 'Quality',
    lastName: 'Engineer',
    roles: ['Quality Engineer'],
    permissions: ['quality.read', 'quality.write', 'fai.read', 'fai.write', 'ncr.read', 'ncr.write', 'traceability.read'],
    description: 'Quality engineer - Manage quality programs',
    displayName: 'Quality Engineer (Test)'
  },
  {
    username: 'quality.inspector',
    password: DEMO_PASSWORD,
    email: 'quality.inspector@mes.com',
    firstName: 'Quality',
    lastName: 'Inspector',
    roles: ['Quality Inspector'],
    permissions: ['quality.read', 'quality.write', 'inspections.read', 'inspections.write', 'ncr.read', 'ncr.write'],
    description: 'Quality inspector - Perform inspections',
    displayName: 'Quality Inspector'
  },
  {
    username: 'dcma.inspector',
    password: DEMO_PASSWORD,
    email: 'dcma.inspector@mes.com',
    firstName: 'DCMA',
    lastName: 'Inspector',
    roles: ['DCMA Inspector'],
    permissions: ['*.read'], // READ-ONLY access to everything
    description: 'DCMA inspector - Government audit access (read-only)',
    displayName: 'DCMA Inspector'
  },
  {
    username: 'process.engineer',
    password: DEMO_PASSWORD,
    email: 'process.engineer@mes.com',
    firstName: 'Process',
    lastName: 'Engineer',
    roles: ['Process Engineer'],
    permissions: ['processsegments.read', 'processsegments.write', 'routing.read', 'routing.write', 'quality.read'],
    description: 'Process engineer - Optimize manufacturing processes',
    displayName: 'Process Engineer'
  },

  // === Tier 3: Materials & Logistics ===
  {
    username: 'warehouse.manager',
    password: DEMO_PASSWORD,
    email: 'warehouse.manager@mes.com',
    firstName: 'Warehouse',
    lastName: 'Manager',
    roles: ['Warehouse Manager'],
    permissions: ['materials.read', 'materials.write', 'inventory.read', 'inventory.write', 'shipping.read', 'shipping.write'],
    description: 'Warehouse manager - Manage inventory',
    displayName: 'Warehouse Manager'
  },
  {
    username: 'materials.handler',
    password: DEMO_PASSWORD,
    email: 'materials.handler@mes.com',
    firstName: 'Materials',
    lastName: 'Handler',
    roles: ['Materials Handler'],
    permissions: ['materials.read', 'materials.write', 'inventory.read', 'inventory.write'],
    description: 'Materials handler - Handle material transactions',
    displayName: 'Materials Handler'
  },
  {
    username: 'shipping.receiving',
    password: DEMO_PASSWORD,
    email: 'shipping.receiving@mes.com',
    firstName: 'Shipping',
    lastName: 'Receiving',
    roles: ['Shipping & Receiving Specialist'],
    permissions: ['shipping.read', 'shipping.write', 'receiving.read', 'receiving.write', 'materials.read'],
    description: 'Shipping & receiving - Handle shipments',
    displayName: 'Shipping & Receiving'
  },
  {
    username: 'logistics.coordinator',
    password: DEMO_PASSWORD,
    email: 'logistics.coordinator@mes.com',
    firstName: 'Logistics',
    lastName: 'Coordinator',
    roles: ['Logistics Coordinator'],
    permissions: ['shipping.read', 'shipping.write', 'schedules.read', 'materials.read'],
    description: 'Logistics coordinator - Coordinate material flow',
    displayName: 'Logistics Coordinator'
  },

  // === Tier 4: Maintenance ===
  {
    username: 'maint.tech',
    password: DEMO_PASSWORD,
    email: 'maint.tech@mes.com',
    firstName: 'Maintenance',
    lastName: 'Technician',
    roles: ['Maintenance Technician'],
    permissions: ['equipment.read', 'equipment.write', 'maintenance.read', 'maintenance.write'],
    description: 'Maintenance technician - Perform equipment maintenance',
    displayName: 'Maintenance Technician'
  },
  {
    username: 'maint.supervisor',
    password: DEMO_PASSWORD,
    email: 'maint.supervisor@mes.com',
    firstName: 'Maintenance',
    lastName: 'Supervisor',
    roles: ['Maintenance Supervisor'],
    permissions: ['equipment.read', 'equipment.write', 'maintenance.read', 'maintenance.write', 'personnel.read'],
    description: 'Maintenance supervisor - Manage maintenance team',
    displayName: 'Maintenance Supervisor'
  },

  // === Tier 5: Administration ===
  {
    username: 'plant.manager',
    password: DEMO_PASSWORD,
    email: 'plant.manager@mes.com',
    firstName: 'Plant',
    lastName: 'Manager',
    roles: ['Plant Manager'],
    permissions: ['*.read', 'reports.read'], // READ-ONLY + reports
    description: 'Plant manager - Executive oversight (read-only)',
    displayName: 'Plant Manager'
  },
  {
    username: 'sys.admin',
    password: DEMO_PASSWORD,
    email: 'sys.admin@mes.com',
    firstName: 'System',
    lastName: 'Admin',
    roles: ['System Administrator'],
    permissions: ['*'], // Full access
    description: 'System administrator - Full system access',
    displayName: 'System Admin'
  },
  {
    username: 'superuser',
    password: DEMO_PASSWORD,
    email: 'superuser@mes.com',
    firstName: 'Super',
    lastName: 'User',
    roles: ['Superuser'],
    permissions: ['*'], // Full access with audit logging
    description: 'Superuser - Full access with audit logging',
    displayName: 'Superuser'
  },
  {
    username: 'inventory.specialist',
    password: DEMO_PASSWORD,
    email: 'inventory.specialist@mes.com',
    firstName: 'Inventory',
    lastName: 'Specialist',
    roles: ['Inventory Control Specialist'],
    permissions: ['inventory.read', 'inventory.write', 'materials.read', 'materials.write', 'traceability.read'],
    description: 'Inventory specialist - Manage inventory accuracy',
    displayName: 'Inventory Control Specialist'
  }
];

/**
 * Get demo users for frontend display
 * Returns a simplified format suitable for showing on login page
 */
export function getDemoCredentialsForDisplay() {
  return DEMO_USERS.map(user => ({
    username: user.username,
    password: user.password,
    displayName: user.displayName,
    description: user.description
  }));
}

/**
 * Get demo user by username
 */
export function getDemoUserByUsername(username: string): DemoUser | undefined {
  return DEMO_USERS.find(user => user.username === username);
}

/**
 * Validate that demo credentials are properly configured
 * Used in development environment health checks
 */
export function validateDemoCredentials(): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check that all users have required fields
  for (const user of DEMO_USERS) {
    if (!user.username) errors.push(`User missing username: ${JSON.stringify(user)}`);
    if (!user.password) errors.push(`User ${user.username} missing password`);
    if (!user.email) errors.push(`User ${user.username} missing email`);
    if (!user.roles || user.roles.length === 0) errors.push(`User ${user.username} missing roles`);
  }
  
  // Check for duplicate usernames
  const usernames = DEMO_USERS.map(u => u.username);
  const duplicates = usernames.filter((username, index) => usernames.indexOf(username) !== index);
  if (duplicates.length > 0) {
    errors.push(`Duplicate usernames found: ${duplicates.join(', ')}`);
  }
  
  // Check for duplicate emails
  const emails = DEMO_USERS.map(u => u.email);
  const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index);
  if (duplicateEmails.length > 0) {
    errors.push(`Duplicate emails found: ${duplicateEmails.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Development mode warning
 * This should be displayed prominently when demo credentials are used
 */
export const DEMO_WARNING = 
  'These are demo credentials for development only. Never use these in production!';