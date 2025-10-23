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
      'workorders.read', 'workorders.write', 'workorders.create', 'workorders.update', 'workorders.delete', 'workorders.release',
      'quality.read', 'quality.write',
      'traceability.read', 'traceability.write',
      'equipment.read', 'equipment.write',
      'users.read', 'users.write',
      'materials.read', 'materials.write',
      'scheduling.read', 'scheduling.write',
      'workinstructions.read', 'workinstructions.write', 'workinstructions.create', 'workinstructions.execute'
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
      'traceability.read',
      'fai.read', 'fai.write', 'fai.approve',
      'ncr.read', 'ncr.write', 'ncr.close',
      'signatures.read', 'signatures.write'
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
      'workorders.read', 'workorders.execute',
      'workinstructions.read', 'workinstructions.execute',
      'traceability.read'
    ],
    description: 'Production operations - Work order viewing and execution',
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
    permissions: ['workorders.read', 'workorders.execute', 'workinstructions.read', 'workinstructions.execute', 'equipment.read'],
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
    permissions: ['workorders.read', 'workorders.write', 'workorders.assign', 'personnel.read', 'personnel.assign', 'workinstructions.read', 'equipment.read', 'materials.read'],
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
    permissions: ['workorders.read', 'workorders.create', 'scheduling.read', 'scheduling.write', 'capacity.read', 'routings.read', 'bom.read', 'materials.read'],
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
    permissions: ['workorders.read', 'workorders.update', 'workorders.priority', 'scheduling.read', 'scheduling.write', 'equipment.read', 'materials.read', 'capacity.read'],
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
    permissions: ['routings.read', 'routings.create', 'routings.write', 'routings.update', 'routings.delete', 'bom.read', 'bom.write', 'processSegments.read', 'processSegments.create', 'processSegments.write', 'workorders.read', 'quality.read', 'equipment.read'],
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
    permissions: ['workorders.read', 'quality.read', 'quality.write', 'fai.read', 'fai.write', 'fai.approve', 'ncr.read', 'ncr.write', 'ncr.close', 'signatures.read', 'signatures.write', 'traceability.read', 'inspections.read', 'inspections.approve'],
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
    permissions: ['workorders.read', 'quality.read', 'inspections.read', 'inspections.write', 'fai.read', 'fai.execute', 'ncr.read', 'ncr.write', 'signatures.read', 'signatures.write', 'traceability.read'],
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
    permissions: ['workorders.read', 'quality.read', 'fai.read', 'ncr.read', 'signatures.read', 'traceability.read', 'audit.read', 'audit.export'],
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
    permissions: ['workorders.read', 'quality.read', 'spc.read', 'spc.write', 'processImprovement.read', 'processImprovement.write', 'yield.read', 'yield.write', 'capability.read', 'capability.write', 'equipment.read'],
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
    permissions: ['inventory.read', 'inventory.write', 'materials.read', 'materials.write', 'warehouse.read', 'warehouse.write', 'cycleCounts.read', 'cycleCounts.write', 'adjustments.approve'],
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
    permissions: ['workorders.read', 'materials.read', 'materials.move', 'inventory.read', 'inventory.update', 'cycleCounts.read', 'cycleCounts.execute'],
    description: 'Materials handler - Handle material transactions',
    displayName: 'Materials Handler'
  },
  {
    username: 'shipping.specialist',
    password: DEMO_PASSWORD,
    email: 'shipping.specialist@mes.com',
    firstName: 'Shipping',
    lastName: 'Specialist',
    roles: ['Shipping/Receiving Specialist'],
    permissions: ['shipments.read', 'shipments.write', 'receiving.read', 'receiving.write', 'carriers.read', 'carriers.write', 'packingLists.read', 'packingLists.write', 'workorders.read', 'materials.read'],
    description: 'Shipping & receiving - Handle shipments',
    displayName: 'Shipping/Receiving Specialist'
  },
  {
    username: 'logistics.coordinator',
    password: DEMO_PASSWORD,
    email: 'logistics.coordinator@mes.com',
    firstName: 'Logistics',
    lastName: 'Coordinator',
    roles: ['Logistics Coordinator'],
    permissions: ['logistics.read', 'logistics.write', 'shipments.read', 'shipments.write', 'tracking.read', 'tracking.write', 'carriers.read', 'workorders.read', 'inventory.read'],
    description: 'Logistics coordinator - Coordinate material flow',
    displayName: 'Logistics Coordinator'
  },

  // === Tier 4: Maintenance ===
  {
    username: 'maint.technician',
    password: DEMO_PASSWORD,
    email: 'maint.technician@mes.com',
    firstName: 'Maintenance',
    lastName: 'Technician',
    roles: ['Maintenance Technician'],
    permissions: ['equipment.read', 'equipment.write', 'maintenance.read', 'maintenance.execute', 'pmScheduling.read', 'workorders.read'],
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
    permissions: ['equipment.read', 'equipment.write', 'maintenance.read', 'maintenance.write', 'pmScheduling.read', 'pmScheduling.write', 'workRequests.approve', 'spareParts.read', 'spareParts.write', 'workorders.read'],
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
    permissions: ['workorders.read', 'quality.read', 'equipment.read', 'materials.read', 'personnel.read', 'reports.read', 'reports.write', 'kpi.read', 'capex.approve', 'traceability.read', 'audit.read'],
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
    permissions: ['users.read', 'users.write', 'roles.read', 'roles.write', 'permissions.read', 'permissions.write', 'system.config', 'audit.read', 'integrations.read', 'integrations.write'],
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
    permissions: ['*', 'bypass.validations', 'impersonate.*', 'force.status', 'audit.read'],
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
    permissions: ['inventory.read', 'inventory.write', 'cycleCounts.read', 'cycleCounts.write', 'adjustments.read', 'adjustments.write', 'minmax.read', 'minmax.write', 'mrp.read', 'mrp.write', 'materials.read'],
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