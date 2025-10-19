/**
 * Auth Service Seed Script
 * Populates the auth database with development users and test data
 */

import { PrismaClient } from '../../../node_modules/.prisma/client-auth';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const BCRYPT_ROUNDS = 10;

async function main() {
  console.log('🌱 Seeding Auth Service database...');

  // Hash password for all test users
  const defaultPasswordHash = await bcrypt.hash('password123', BCRYPT_ROUNDS);

  // 1. Create Admin User
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'System',
      lastName: 'Administrator',
      isActive: true,
    },
  });

  console.log(`✅ Created admin user: ${adminUser.username}`);

  // 2. Create Supervisor Users
  const supervisor1 = await prisma.user.upsert({
    where: { username: 'john.supervisor' },
    update: {},
    create: {
      username: 'john.supervisor',
      email: 'john.supervisor@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'John',
      lastName: 'Supervisor',
      isActive: true,
    },
  });

  const supervisor2 = await prisma.user.upsert({
    where: { username: 'sarah.supervisor' },
    update: {},
    create: {
      username: 'sarah.supervisor',
      email: 'sarah.supervisor@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Sarah',
      lastName: 'Wilson',
      isActive: true,
    },
  });

  console.log(`✅ Created supervisor users`);

  // 3. Create Quality Inspector Users
  const qc1 = await prisma.user.upsert({
    where: { username: 'mike.qc' },
    update: {},
    create: {
      username: 'mike.qc',
      email: 'mike.qc@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Mike',
      lastName: 'Johnson',
      isActive: true,
    },
  });

  const qc2 = await prisma.user.upsert({
    where: { username: 'lisa.qc' },
    update: {},
    create: {
      username: 'lisa.qc',
      email: 'lisa.qc@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Lisa',
      lastName: 'Chen',
      isActive: true,
    },
  });

  console.log(`✅ Created quality inspector users`);

  // 4. Create Operator Users
  const operators = [];
  const operatorNames = [
    { username: 'tom.operator', firstName: 'Tom', lastName: 'Anderson' },
    { username: 'jane.operator', firstName: 'Jane', lastName: 'Smith' },
    { username: 'bob.operator', firstName: 'Bob', lastName: 'Martinez' },
    { username: 'alice.operator', firstName: 'Alice', lastName: 'Brown' },
    { username: 'david.operator', firstName: 'David', lastName: 'Lee' },
  ];

  for (const op of operatorNames) {
    const operator = await prisma.user.upsert({
      where: { username: op.username },
      update: {},
      create: {
        username: op.username,
        email: `${op.username}@machshop.com`,
        passwordHash: defaultPasswordHash,
        firstName: op.firstName,
        lastName: op.lastName,
        isActive: true,
      },
    });
    operators.push(operator);
  }

  console.log(`✅ Created ${operators.length} operator users`);

  // 5. Create Material Handler Users
  const materialHandler = await prisma.user.upsert({
    where: { username: 'carlos.material' },
    update: {},
    create: {
      username: 'carlos.material',
      email: 'carlos.material@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      isActive: true,
    },
  });

  console.log(`✅ Created material handler user`);

  // 6. Create Maintenance Technician Users
  const maintenance = await prisma.user.upsert({
    where: { username: 'frank.maintenance' },
    update: {},
    create: {
      username: 'frank.maintenance',
      email: 'frank.maintenance@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Frank',
      lastName: 'Taylor',
      isActive: true,
    },
  });

  console.log(`✅ Created maintenance technician user`);

  // 7. Create Engineer Users
  const engineer = await prisma.user.upsert({
    where: { username: 'emily.engineer' },
    update: {},
    create: {
      username: 'emily.engineer',
      email: 'emily.engineer@machshop.com',
      passwordHash: defaultPasswordHash,
      firstName: 'Emily',
      lastName: 'Davis',
      isActive: true,
    },
  });

  console.log(`✅ Created engineer user`);

  // 8. Create MFA Settings for Admin (for testing)
  const adminMFA = await prisma.mFASettings.upsert({
    where: { userId: adminUser.id },
    update: {},
    create: {
      userId: adminUser.id,
      isTOTPEnabled: false, // Disabled for development
      totpSecret: null,
      totpBackupCodes: [],
    },
  });

  console.log(`✅ Created MFA settings for admin`);

  // 9. Create Audit Log Entries (sample)
  await prisma.authAuditLog.create({
    data: {
      userId: adminUser.id,
      username: adminUser.username,
      eventType: 'LOGIN_SUCCESS',
      eventStatus: 'SUCCESS',
      eventMessage: 'Admin user seed login event',
      ipAddress: '127.0.0.1',
      userAgent: 'Seed Script',
      metadata: { source: 'database_seed', version: '1.0.0' },
    },
  });

  console.log(`✅ Created sample audit log entries`);

  console.log('\n📊 Seed Summary:');
  const userCount = await prisma.user.count();
  const auditCount = await prisma.authAuditLog.count();
  console.log(`  - Users: ${userCount}`);
  console.log(`  - Audit Logs: ${auditCount}`);
  console.log(`  - MFA Settings: 1`);
  console.log('\n✅ Auth Service database seeded successfully!');
  console.log('\n🔐 Default password for all users: password123');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
