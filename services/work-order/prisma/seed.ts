/**
 * Work Order Service Seed Script
 * Populates work order database with development data
 */

import { PrismaClient } from '../../../node_modules/.prisma/client-work-order';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Work Order Service database...');

  // User IDs from Auth Service (these should match the auth seed)
  const ADMIN_USER_ID = 'admin-user-id';
  const SUPERVISOR_USER_ID = 'supervisor-user-id';
  const OPERATOR_USER_ID = 'operator-user-id';

  // Part IDs from Resource Service (cross-service references)
  const PART_ID_BRACKET = 'part-bracket-001';
  const PART_ID_SHAFT = 'part-shaft-002';
  const PART_ID_HOUSING = 'part-housing-003';

  // 1. Create Production Schedule
  const schedule = await prisma.productionSchedule.upsert({
    where: { scheduleNumber: 'SCHED-2025-10' },
    update: {},
    create: {
      scheduleNumber: 'SCHED-2025-10',
      scheduleName: 'October 2025 Production Schedule',
      description: 'Monthly production schedule for October 2025',
      periodStart: new Date('2025-10-01'),
      periodEnd: new Date('2025-10-31'),
      periodType: 'MONTHLY',
      state: 'RELEASED',
      priority: 'NORMAL',
      totalEntries: 3,
      dispatchedCount: 2,
    },
  });

  console.log(`✅ Created schedule: ${schedule.scheduleNumber}`);

  // 2. Create Schedule Entries
  const scheduleEntry1 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule.id, entryNumber: 1 } },
    update: {},
    create: {
      scheduleId: schedule.id,
      entryNumber: 1,
      partId: PART_ID_BRACKET,
      partNumber: 'BRK-001',
      description: 'Machined Aluminum Bracket',
      plannedQuantity: 100,
      dispatchedQuantity: 100,
      completedQuantity: 75,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-10-05'),
      plannedEndDate: new Date('2025-10-10'),
      actualStartDate: new Date('2025-10-05T08:00:00Z'),
      priority: 'HIGH',
      sequenceNumber: 1,
      estimatedDuration: 40,
      customerOrder: 'CO-2025-001',
      customerDueDate: new Date('2025-10-12'),
      isDispatched: true,
      dispatchedAt: new Date('2025-10-05T07:00:00Z'),
    },
  });

  const scheduleEntry2 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule.id, entryNumber: 2 } },
    update: {},
    create: {
      scheduleId: schedule.id,
      entryNumber: 2,
      partId: PART_ID_SHAFT,
      partNumber: 'SFT-002',
      description: 'Steel Drive Shaft',
      plannedQuantity: 50,
      dispatchedQuantity: 50,
      completedQuantity: 30,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-10-12'),
      plannedEndDate: new Date('2025-10-18'),
      actualStartDate: new Date('2025-10-12T08:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 2,
      estimatedDuration: 48,
      customerOrder: 'CO-2025-002',
      isDispatched: true,
      dispatchedAt: new Date('2025-10-12T07:00:00Z'),
    },
  });

  console.log(`✅ Created ${2} schedule entries`);

  // 3. Create Work Orders
  const workOrder1 = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2025-001' },
    update: {},
    create: {
      workOrderNumber: 'WO-2025-001',
      partId: PART_ID_BRACKET,
      partNumber: 'BRK-001',
      quantity: 100,
      quantityCompleted: 75,
      quantityScrapped: 5,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-10-12'),
      customerOrder: 'CO-2025-001',
      createdById: SUPERVISOR_USER_ID,
      assignedToId: OPERATOR_USER_ID,
      startedAt: new Date('2025-10-05T08:00:00Z'),
      actualStartDate: new Date('2025-10-05T08:00:00Z'),
    },
  });

  const workOrder2 = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2025-002' },
    update: {},
    create: {
      workOrderNumber: 'WO-2025-002',
      partId: PART_ID_SHAFT,
      partNumber: 'SFT-002',
      quantity: 50,
      quantityCompleted: 30,
      quantityScrapped: 2,
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-10-20'),
      customerOrder: 'CO-2025-002',
      createdById: SUPERVISOR_USER_ID,
      assignedToId: OPERATOR_USER_ID,
      startedAt: new Date('2025-10-12T08:00:00Z'),
      actualStartDate: new Date('2025-10-12T08:00:00Z'),
    },
  });

  const workOrder3 = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2025-003' },
    update: {},
    create: {
      workOrderNumber: 'WO-2025-003',
      partId: PART_ID_HOUSING,
      partNumber: 'HSG-003',
      quantity: 75,
      quantityCompleted: 0,
      quantityScrapped: 0,
      priority: 'NORMAL',
      status: 'CREATED',
      dueDate: new Date('2025-10-25'),
      customerOrder: 'CO-2025-003',
      createdById: SUPERVISOR_USER_ID,
    },
  });

  console.log(`✅ Created ${3} work orders`);

  // 4. Create Work Order Operations
  const operation1 = await prisma.workOrderOperation.create({
    data: {
      workOrderId: workOrder1.id,
      routingOperationId: 'route-op-001',
      operationNumber: '10',
      operationName: 'CNC Milling',
      status: 'COMPLETED',
      quantity: 100,
      quantityCompleted: 100,
      quantityScrap: 3,
      startedAt: new Date('2025-10-05T08:00:00Z'),
      completedAt: new Date('2025-10-07T16:00:00Z'),
    },
  });

  const operation2 = await prisma.workOrderOperation.create({
    data: {
      workOrderId: workOrder1.id,
      routingOperationId: 'route-op-002',
      operationNumber: '20',
      operationName: 'Deburring',
      status: 'IN_PROGRESS',
      quantity: 97,
      quantityCompleted: 75,
      quantityScrap: 2,
      startedAt: new Date('2025-10-08T08:00:00Z'),
    },
  });

  console.log(`✅ Created ${2} work order operations`);

  // 5. Create Work Performance Records
  await prisma.workPerformance.create({
    data: {
      workOrderId: workOrder1.id,
      operationId: operation1.id,
      performanceType: 'LABOR',
      personnelId: OPERATOR_USER_ID,
      laborHours: 16.5,
      laborCost: 412.50,
      laborEfficiency: 0.95,
      recordedAt: new Date('2025-10-07T16:00:00Z'),
    },
  });

  await prisma.workPerformance.create({
    data: {
      workOrderId: workOrder1.id,
      operationId: operation1.id,
      performanceType: 'QUALITY',
      quantityProduced: 100,
      quantityGood: 97,
      quantityScrap: 3,
      quantityRework: 0,
      yieldPercentage: 97.0,
      scrapReason: 'Tool wear - out of tolerance',
      recordedAt: new Date('2025-10-07T16:00:00Z'),
    },
  });

  console.log(`✅ Created ${2} work performance records`);

  // 6. Create Production Variances
  await prisma.productionVariance.create({
    data: {
      workOrderId: workOrder1.id,
      operationId: operation1.id,
      varianceType: 'QUALITY',
      varianceCategory: 'UNFAVORABLE',
      plannedValue: 100,
      actualValue: 97,
      variance: -3,
      variancePercent: -3.0,
      costImpact: 45.0,
      severity: 'MINOR',
      rootCause: 'Tool wear exceeded expected rate',
      correctiveAction: 'Implement more frequent tool inspection',
      detectedAt: new Date('2025-10-07T16:00:00Z'),
    },
  });

  console.log(`✅ Created ${1} production variance`);

  // 7. Create Work Instructions
  const workInstruction = await prisma.workInstruction.upsert({
    where: { id: 'wi-cnc-milling-001' },
    update: {},
    create: {
      id: 'wi-cnc-milling-001',
      title: 'CNC Milling - Aluminum Bracket',
      description: 'Standard work instruction for milling aluminum brackets',
      partId: PART_ID_BRACKET,
      version: '2.1.0',
      status: 'APPROVED',
      effectiveDate: new Date('2025-01-01'),
      approvedAt: new Date('2024-12-15'),
      createdById: ADMIN_USER_ID,
      updatedById: ADMIN_USER_ID,
    },
  });

  // 8. Create Work Instruction Steps
  await prisma.workInstructionStep.create({
    data: {
      workInstructionId: workInstruction.id,
      stepNumber: 1,
      title: 'Material Setup',
      content: 'Mount aluminum stock in CNC vise with proper alignment',
      imageUrls: [],
      videoUrls: [],
      attachmentUrls: [],
      estimatedDuration: 300,
      isCritical: true,
      requiresSignature: false,
    },
  });

  await prisma.workInstructionStep.create({
    data: {
      workInstructionId: workInstruction.id,
      stepNumber: 2,
      title: 'Tool Selection',
      content: 'Install 0.5" carbide end mill (Tool #T0001)',
      imageUrls: [],
      videoUrls: [],
      attachmentUrls: [],
      estimatedDuration: 180,
      isCritical: true,
      requiresSignature: false,
    },
  });

  await prisma.workInstructionStep.create({
    data: {
      workInstructionId: workInstruction.id,
      stepNumber: 3,
      title: 'Run CNC Program',
      content: 'Load and execute program BRK-001-MILL.nc',
      imageUrls: [],
      videoUrls: [],
      attachmentUrls: [],
      estimatedDuration: 900,
      isCritical: true,
      requiresSignature: true,
    },
  });

  console.log(`✅ Created work instruction with ${3} steps`);

  console.log('\n📊 Seed Summary:');
  const scheduleCount = await prisma.productionSchedule.count();
  const workOrderCount = await prisma.workOrder.count();
  const operationCount = await prisma.workOrderOperation.count();
  const performanceCount = await prisma.workPerformance.count();
  const wiCount = await prisma.workInstruction.count();

  console.log(`  - Production Schedules: ${scheduleCount}`);
  console.log(`  - Work Orders: ${workOrderCount}`);
  console.log(`  - Operations: ${operationCount}`);
  console.log(`  - Performance Records: ${performanceCount}`);
  console.log(`  - Work Instructions: ${wiCount}`);
  console.log('\n✅ Work Order Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
