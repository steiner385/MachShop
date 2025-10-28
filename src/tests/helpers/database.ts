import { PrismaClient } from '@prisma/client';
import { execSync } from 'child_process';

let testDb: PrismaClient;

export async function setupTestDatabase(): Promise<PrismaClient> {
  if (!testDb) {
    // Create test database if it doesn't exist
    try {
      execSync('createdb mes_test', { stdio: 'ignore' });
    } catch {
      // Database might already exist
    }

    testDb = new PrismaClient({
      datasources: {
        db: {
          url: 'postgresql://mes_user:mes_password@localhost:5432/mes_test'
        }
      }
    });

    // Run migrations
    try {
      execSync('DATABASE_URL=postgresql://mes_user:mes_password@localhost:5432/mes_test npx prisma migrate deploy', { stdio: 'ignore' });
    } catch (error) {
      console.warn('Migration warning (this is expected for first run):', error);
    }

    // Connect to database
    await testDb.$connect();
  }

  return testDb;
}

export async function seedTestData(db: PrismaClient) {
  // Create test site
  const testSite = await db.site.upsert({
    where: { siteCode: 'TEST-SITE' },
    update: {},
    create: {
      id: 'test-site-123',
      siteCode: 'TEST-SITE',
      siteName: 'Test Manufacturing Site',
      location: 'Test Location',
      isActive: true
    }
  });

  // Create test user
  const testUser = await db.user.upsert({
    where: { username: 'testuser' },
    update: {},
    create: {
      id: 'test-user-123',
      username: 'testuser',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      passwordHash: '$2b$10$test.hash.value',
      roles: ['Operator'],
      permissions: ['workorders.read'],
      isActive: true
    }
  });

  // Create test part
  const testPart = await db.part.upsert({
    where: { partNumber: 'TEST-PART-001' },
    update: {},
    create: {
      id: 'test-part-123',
      partNumber: 'TEST-PART-001',
      partName: 'Test Part',
      description: 'Test part for unit tests',
      partType: 'COMPONENT',
      unitOfMeasure: 'EA',
      isActive: true
    }
  });

  // Create test routing
  const testRouting = await db.routing.upsert({
    where: { routingNumber: 'TEST-ROUTING-001' },
    update: {},
    create: {
      id: 'test-routing-123',
      routingNumber: 'TEST-ROUTING-001',
      description: 'Test Routing',
      partId: testPart.id,
      isActive: true
    }
  });

  return { testSite, testUser, testPart, testRouting };
}

export async function cleanupTestData(db: PrismaClient) {
  // Clean up in reverse dependency order
  await db.nCR.deleteMany();
  await db.qualityInspection.deleteMany();
  await db.qualityCharacteristic.deleteMany();
  await db.qualityPlan.deleteMany();
  await db.workOrderOperation.deleteMany();
  await db.workOrder.deleteMany();
  await db.equipment.deleteMany();
  await db.routingOperation.deleteMany();
  await db.routing.deleteMany();
  await db.part.deleteMany();
  await db.site.deleteMany();

  // CRITICAL FIX: Only delete non-essential test users, preserve admin and other seed users
  // This prevents breaking authentication for other tests that depend on these users
  await db.user.deleteMany({
    where: {
      AND: [
        {
          // Only delete users that are clearly test-created (not from seed)
          OR: [
            { username: { contains: 'test-' } },
            { username: { contains: '-test' } },
            { email: { contains: 'test.' } },
            { email: { contains: '.test@' } },
            { username: { in: ['user-to-delete', 'account.status.test'] } }, // Specific test users
          ]
        },
        {
          // Never delete essential seed users
          username: {
            notIn: [
              'admin',
              'jane.smith',
              'john.doe',
              'prod.operator',
              'prod.supervisor',
              'prod.planner',
              'prod.scheduler',
              'mfg.engineer',
              'quality.engineer',
              'quality.inspector',
              'dcma.inspector',
              'process.engineer',
              'warehouse.manager',
              'materials.handler',
              'shipping.specialist',
              'logistics.coordinator',
              'maint.technician',
              'maint.supervisor',
              'plant.manager',
              'sys.admin',
              'superuser',
              'inventory.specialist'
            ]
          }
        }
      ]
    }
  });
}

export async function teardownTestDatabase() {
  if (testDb) {
    await testDb.$disconnect();
  }
}