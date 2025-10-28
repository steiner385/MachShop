import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEMO_USERS, DEMO_PASSWORD, validateDemoCredentials } from '../src/config/demoCredentials';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting minimal auth-only database seed...');

  // Validate demo credentials configuration
  const validation = validateDemoCredentials();
  if (!validation.valid) {
    console.error('❌ Demo credentials validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    throw new Error('Invalid demo credentials configuration');
  }
  console.log('✅ Demo credentials validation passed');

  // Create users from shared configuration
  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  const createdUsers = [];

  for (const demoUser of DEMO_USERS) {
    const user = await prisma.user.upsert({
      where: { username: demoUser.username },
      update: {
        // Update password and permissions in case they changed
        passwordHash: hashedPassword,
        roles: demoUser.roles,
        permissions: demoUser.permissions,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        isActive: true, // Ensure test users are always active
      },
      create: {
        username: demoUser.username,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        passwordHash: hashedPassword,
        roles: demoUser.roles,
        permissions: demoUser.permissions,
        isActive: true // Explicitly set active for new users
      }
    });

    createdUsers.push(user);
    console.log(`  📝 User: ${demoUser.username} (${demoUser.displayName})`);
  }

  console.log('✅ Users created');

  // Create minimal site data required for E2E tests
  try {
    console.log('🏭 Creating test site...');
    const site = await prisma.site.upsert({
      where: { siteCode: 'SITE-001' },
      update: {
        siteName: 'Test Manufacturing Site',
        location: 'Test Location',
        isActive: true
      },
      create: {
        siteCode: 'SITE-001',
        siteName: 'Test Manufacturing Site',
        location: 'Test Location',
        isActive: true
      }
    });

    console.log(`  📍 Site: ${site.siteCode} (${site.siteName})`);
    console.log('✅ Site created');
  } catch (error) {
    console.error('❌ Failed to create test site:', error);
    throw error;
  }
  console.log('🎉 Auth-only seed completed successfully');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });