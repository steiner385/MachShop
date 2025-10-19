/**
 * Integration Service Seed Script
 * Populates integration database with endpoints, mappings, and sync jobs
 */

import { PrismaClient} from '../../../node_modules/.prisma/client-integration';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Integration Service database...');

  // 1. Create Integration Endpoint
  const endpointERP = await prisma.integrationEndpoint.upsert({
    where: { endpointCode: 'ERP-ORACLE-FUSION' },
    update: {},
    create: {
      endpointCode: 'ERP-ORACLE-FUSION',
      endpointName: 'Oracle Fusion ERP',
      description: 'Oracle Fusion Cloud ERP system integration',
      systemType: 'ERP',
      systemName: 'Oracle Fusion',
      systemVersion: '24.10',
      connectionType: 'HTTPS',
      baseUrl: 'https://erp.example.com/api/v1',
      port: 443,
      username: 'mes_integration',
      authType: 'OAUTH2',
      authConfig: {
        clientId: 'mes-client-id',
        tokenUrl: 'https://erp.example.com/oauth/token',
      },
      protocol: 'REST',
      protocolConfig: {
        contentType: 'application/json',
        acceptHeader: 'application/json',
      },
      maxRetries: 3,
      retryDelayMs: 1000,
      timeoutMs: 30000,
      rateLimit: 60,
      rateLimitPeriod: 60,
      healthCheckUrl: 'https://erp.example.com/health',
      healthStatus: 'UNKNOWN',
      isActive: true,
    },
  });

  console.log(`✅ Created integration endpoint: ${endpointERP.endpointName}`);

  // 2. Create Data Mapping
  const mappingWorkOrders = await prisma.dataMapping.upsert({
    where: { mappingCode: 'WO-TO-ERP-PROD-ORDER' },
    update: {},
    create: {
      endpointId: endpointERP.id,
      mappingCode: 'WO-TO-ERP-PROD-ORDER',
      mappingName: 'Work Order to ERP Production Order',
      description: 'Maps MES work orders to ERP production orders',
      direction: 'OUTBOUND',
      sourceEntity: 'WorkOrder',
      targetEntity: 'ProductionOrder',
      sourceSchema: {
        fields: ['workOrderNumber', 'partId', 'quantity', 'dueDate', 'status'],
      },
      targetSchema: {
        fields: ['orderNumber', 'itemId', 'qty', 'scheduledDate', 'orderStatus'],
      },
      transformationType: 'FIELD_MAPPING',
      transformationConfig: {
        fieldMappings: [
          { source: 'workOrderNumber', target: 'orderNumber' },
          { source: 'partId', target: 'itemId' },
          { source: 'quantity', target: 'qty' },
          { source: 'dueDate', target: 'scheduledDate' },
          { source: 'status', target: 'orderStatus', transform: 'STATUS_MAPPING' },
        ],
        statusMapping: {
          'IN_PROGRESS': 'RELEASED',
          'COMPLETED': 'CLOSED',
          'CANCELLED': 'CANCELLED',
        },
      },
      b2mObjectType: 'WORK_ORDER',
      b2mOperation: 'CHANGE',
      filterConditions: {
        status: ['IN_PROGRESS', 'COMPLETED'],
      },
      validationRules: {
        required: ['workOrderNumber', 'partId', 'quantity'],
      },
      isActive: true,
    },
  });

  console.log(`✅ Created data mapping: ${mappingWorkOrders.mappingName}`);

  // 3. Create Sync Job
  const syncJob = await prisma.syncJob.upsert({
    where: { jobCode: 'SYNC-WO-DAILY' },
    update: {},
    create: {
      endpointId: endpointERP.id,
      dataMappingId: mappingWorkOrders.id,
      jobCode: 'SYNC-WO-DAILY',
      jobName: 'Daily Work Order Sync',
      description: 'Syncs completed work orders to ERP nightly',
      jobType: 'PUSH',
      scheduleType: 'CRON',
      cronExpression: '0 2 * * *',
      batchSize: 100,
      parallelThreads: 2,
      onErrorAction: 'RETRY_THEN_FAIL',
      notifyOnError: true,
      notifyEmails: ['integration-team@machshop.com'],
      isActive: true,
      nextRunAt: new Date('2025-10-19T02:00:00Z'),
    },
  });

  console.log(`✅ Created sync job: ${syncJob.jobName}`);

  // 4. Create ISA-95 B2M Message
  await prisma.iSA95B2MMessage.create({
    data: {
      endpointId: endpointERP.id,
      messageId: 'MSG-2025-10-18-001',
      objectType: 'PRODUCTION_PERFORMANCE',
      verb: 'PROCESS',
      direction: 'OUTBOUND',
      messageBody: {
        workOrderNumber: 'WO-2025-001',
        partNumber: 'BRK-001',
        quantityProduced: 95,
        quantityScrap: 3,
        productionDate: '2025-10-17',
        metrics: {
          oee: 81.3,
          availability: 91.1,
          performance: 92.3,
          quality: 96.8,
        },
      },
      messageFormat: 'JSON',
      senderSystem: 'MES',
      receiverSystem: 'Oracle Fusion ERP',
      status: 'PROCESSED',
      acknowledgement: 'ACKNOWLEDGED',
      sentTimestamp: new Date('2025-10-18T02:00:00Z'),
      receivedTimestamp: new Date('2025-10-18T02:00:05Z'),
      processedTimestamp: new Date('2025-10-18T02:00:10Z'),
      acknowledgedTimestamp: new Date('2025-10-18T02:00:12Z'),
      requiresResponse: false,
      isIdempotent: true,
      processingKey: 'WO-2025-001-20251017',
    },
  });

  console.log(`✅ Created ${1} B2M message`);

  // 5. Create Integration Event
  await prisma.integrationEvent.create({
    data: {
      endpointId: endpointERP.id,
      eventType: 'SYNC_COMPLETED',
      eventCategory: 'SYNC',
      eventTitle: 'Daily Work Order Sync Completed',
      eventMessage: 'Successfully synced 95 work orders to ERP',
      eventData: {
        recordsProcessed: 95,
        recordsSuccess: 95,
        recordsFailed: 0,
        durationSeconds: 45,
      },
      severity: 'INFO',
    },
  });

  console.log(`✅ Created ${1} integration event`);

  console.log('\n📊 Seed Summary:');
  const endpointCount = await prisma.integrationEndpoint.count();
  const mappingCount = await prisma.dataMapping.count();
  const syncJobCount = await prisma.syncJob.count();
  const b2mMessageCount = await prisma.iSA95B2MMessage.count();
  const eventCount = await prisma.integrationEvent.count();

  console.log(`  - Integration Endpoints: ${endpointCount}`);
  console.log(`  - Data Mappings: ${mappingCount}`);
  console.log(`  - Sync Jobs: ${syncJobCount}`);
  console.log(`  - B2M Messages: ${b2mMessageCount}`);
  console.log(`  - Integration Events: ${eventCount}`);
  console.log('\n✅ Integration Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
