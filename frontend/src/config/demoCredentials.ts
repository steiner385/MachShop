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
 * Comprehensive set covering all roles, permissions, and test scenarios
 */
export const DEMO_USERS: DemoUser[] = [
  // === ADMINISTRATIVE USERS ===
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
    username: 'plant.manager',
    password: DEMO_PASSWORD,
    email: 'plant.manager@mes.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    roles: ['Plant Manager'],
    permissions: [
      'workorders.read', 'workorders.write',
      'quality.read', 'quality.write',
      'traceability.read',
      'equipment.read', 'equipment.write',
      'users.read'
    ],
    description: 'Plant management - Production oversight and strategic planning',
    displayName: 'Plant Manager'
  },

  // === PRODUCTION USERS ===
  {
    username: 'john.doe',
    password: DEMO_PASSWORD,
    email: 'john.doe@mes.com',
    firstName: 'John',
    lastName: 'Doe',
    roles: ['Production Operator'],
    permissions: [
      'workorders.read'
    ],
    description: 'Production operations - Work order viewing and basic operations',
    displayName: 'Production Operator'
  },
  {
    username: 'production.supervisor',
    password: DEMO_PASSWORD,
    email: 'production.supervisor@mes.com',
    firstName: 'Mike',
    lastName: 'Wilson',
    roles: ['Production Supervisor'],
    permissions: [
      'workorders.read', 'workorders.write',
      'equipment.read'
    ],
    description: 'Production supervision - Work order management and operator oversight',
    displayName: 'Production Supervisor'
  },
  {
    username: 'shift.lead',
    password: DEMO_PASSWORD,
    email: 'shift.lead@mes.com',
    firstName: 'Lisa',
    lastName: 'Chen',
    roles: ['Shift Lead'],
    permissions: [
      'workorders.read', 'workorders.write',
      'equipment.read'
    ],
    description: 'Shift leadership - Work order coordination and team management',
    displayName: 'Shift Lead'
  },
  {
    username: 'manufacturing.engineer',
    password: DEMO_PASSWORD,
    email: 'manufacturing.engineer@mes.com',
    firstName: 'David',
    lastName: 'Rodriguez',
    roles: ['Manufacturing Engineer'],
    permissions: [
      'workorders.read', 'workorders.write',
      'quality.read',
      'traceability.read',
      'equipment.read', 'equipment.write'
    ],
    description: 'Manufacturing engineering - Process optimization and technical support',
    displayName: 'Manufacturing Engineer'
  },

  // === QUALITY USERS ===
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
    username: 'quality.inspector',
    password: DEMO_PASSWORD,
    email: 'quality.inspector@mes.com',
    firstName: 'Robert',
    lastName: 'Taylor',
    roles: ['Quality Inspector'],
    permissions: [
      'workorders.read',
      'quality.read', 'quality.write',
      'traceability.read'
    ],
    description: 'Quality inspection - Material inspection and quality control',
    displayName: 'Quality Inspector'
  },
  {
    username: 'quality.manager',
    password: DEMO_PASSWORD,
    email: 'quality.manager@mes.com',
    firstName: 'Emily',
    lastName: 'Brown',
    roles: ['Quality Manager'],
    permissions: [
      'workorders.read',
      'quality.read', 'quality.write',
      'traceability.read', 'traceability.write',
      'equipment.read'
    ],
    description: 'Quality management - Quality system oversight and compliance',
    displayName: 'Quality Manager'
  },

  // === ENGINEERING USERS ===
  {
    username: 'process.engineer',
    password: DEMO_PASSWORD,
    email: 'process.engineer@mes.com',
    firstName: 'Kevin',
    lastName: 'Anderson',
    roles: ['Process Engineer'],
    permissions: [
      'workorders.read', 'workorders.write',
      'quality.read',
      'traceability.read',
      'equipment.read', 'equipment.write'
    ],
    description: 'Process engineering - Process design and improvement',
    displayName: 'Process Engineer'
  },
  {
    username: 'design.engineer',
    password: DEMO_PASSWORD,
    email: 'design.engineer@mes.com',
    firstName: 'Amanda',
    lastName: 'Garcia',
    roles: ['Design Engineer'],
    permissions: [
      'workorders.read',
      'quality.read',
      'traceability.read',
      'equipment.read'
    ],
    description: 'Design engineering - Product design and engineering documentation',
    displayName: 'Design Engineer'
  },

  // === MAINTENANCE USERS ===
  {
    username: 'maintenance.tech',
    password: DEMO_PASSWORD,
    email: 'maintenance.tech@mes.com',
    firstName: 'Chris',
    lastName: 'Martinez',
    roles: ['Maintenance Technician'],
    permissions: [
      'workorders.read',
      'equipment.read', 'equipment.write'
    ],
    description: 'Equipment maintenance - Preventive and corrective maintenance',
    displayName: 'Maintenance Technician'
  },
  {
    username: 'maintenance.supervisor',
    password: DEMO_PASSWORD,
    email: 'maintenance.supervisor@mes.com',
    firstName: 'James',
    lastName: 'Thompson',
    roles: ['Maintenance Supervisor'],
    permissions: [
      'workorders.read', 'workorders.write',
      'equipment.read', 'equipment.write'
    ],
    description: 'Maintenance supervision - Maintenance planning and resource allocation',
    displayName: 'Maintenance Supervisor'
  },

  // === MATERIALS & LOGISTICS USERS ===
  {
    username: 'materials.handler',
    password: DEMO_PASSWORD,
    email: 'materials.handler@mes.com',
    firstName: 'Jessica',
    lastName: 'White',
    roles: ['Materials Handler'],
    permissions: [
      'workorders.read',
      'traceability.read'
    ],
    description: 'Materials handling - Material movement and inventory management',
    displayName: 'Materials Handler'
  },
  {
    username: 'warehouse.supervisor',
    password: DEMO_PASSWORD,
    email: 'warehouse.supervisor@mes.com',
    firstName: 'Daniel',
    lastName: 'Lee',
    roles: ['Warehouse Supervisor'],
    permissions: [
      'workorders.read',
      'traceability.read', 'traceability.write'
    ],
    description: 'Warehouse supervision - Inventory oversight and material flow',
    displayName: 'Warehouse Supervisor'
  },
  {
    username: 'shipping.coordinator',
    password: DEMO_PASSWORD,
    email: 'shipping.coordinator@mes.com',
    firstName: 'Nicole',
    lastName: 'Davis',
    roles: ['Shipping Coordinator'],
    permissions: [
      'workorders.read',
      'traceability.read'
    ],
    description: 'Shipping coordination - Order fulfillment and logistics',
    displayName: 'Shipping Coordinator'
  },

  // === COMPLIANCE & AUDIT USERS ===
  {
    username: 'compliance.officer',
    password: DEMO_PASSWORD,
    email: 'compliance.officer@mes.com',
    firstName: 'Rachel',
    lastName: 'Miller',
    roles: ['Compliance Officer'],
    permissions: [
      'workorders.read',
      'quality.read',
      'traceability.read',
      'users.read'
    ],
    description: 'Compliance oversight - Regulatory compliance and audit support',
    displayName: 'Compliance Officer'
  },
  {
    username: 'dcma.representative',
    password: DEMO_PASSWORD,
    email: 'dcma.representative@mes.com',
    firstName: 'Mark',
    lastName: 'Wilson',
    roles: ['DCMA Representative'],
    permissions: [
      'workorders.read',
      'quality.read',
      'traceability.read'
    ],
    description: 'DCMA oversight - Defense contract manufacturing compliance',
    displayName: 'DCMA Representative'
  },

  // === SPECIALIZED ROLES ===
  {
    username: 'inventory.controller',
    password: DEMO_PASSWORD,
    email: 'inventory.controller@mes.com',
    firstName: 'Susan',
    lastName: 'Clark',
    roles: ['Inventory Controller'],
    permissions: [
      'workorders.read',
      'traceability.read', 'traceability.write'
    ],
    description: 'Inventory control - Stock management and cycle counting',
    displayName: 'Inventory Controller'
  },
  {
    username: 'logistics.coordinator',
    password: DEMO_PASSWORD,
    email: 'logistics.coordinator@mes.com',
    firstName: 'Thomas',
    lastName: 'Young',
    roles: ['Logistics Coordinator'],
    permissions: [
      'workorders.read',
      'traceability.read'
    ],
    description: 'Logistics coordination - Supply chain and material planning',
    displayName: 'Logistics Coordinator'
  },

  // === TEST-SPECIFIC USERS ===
  {
    username: 'test.operator',
    password: DEMO_PASSWORD,
    email: 'test.operator@mes.com',
    firstName: 'Test',
    lastName: 'Operator',
    roles: ['Production Operator'],
    permissions: [
      'workorders.read'
    ],
    description: 'Test user - For automation testing and development',
    displayName: 'Test Operator'
  },
  {
    username: 'account.status.test',
    password: DEMO_PASSWORD,
    email: 'account.status.test@mes.com',
    firstName: 'Account',
    lastName: 'Test',
    roles: ['Production Operator'],
    permissions: [
      'workorders.read'
    ],
    description: 'Test user - For account status and authentication testing',
    displayName: 'Account Status Test'
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