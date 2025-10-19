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