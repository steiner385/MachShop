/**
 * Traceability Service Seed Script
 * Populates traceability database with event logs and genealogy data
 */

import { PrismaClient } from '../../../node_modules/.prisma/client-traceability';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Traceability Service database...');

  // User IDs from Auth Service
  const OPERATOR_USER_ID = 'operator-user-id';
  const MATERIAL_HANDLER_ID = 'material-handler-id';

  // 1. Create Traceability Events
  await prisma.traceabilityEvent.create({
    data: {
      eventType: 'MATERIAL_RECEIVED',
      eventTimestamp: new Date('2025-09-15T10:00:00Z'),
      partId: 'part-raw-aluminum',
      partNumber: 'RM-AL6061-001',
      lotNumber: 'LOT-2025-001',
      quantity: 200,
      unitOfMeasure: 'EA',
      locationId: 'loc-raw-001',
      locationName: 'Raw Material Storage',
      performedById: MATERIAL_HANDLER_ID,
      performedByName: 'Carlos Rodriguez',
      metadata: {
        receivingDocument: 'PO-2025-0123',
        supplier: 'Acme Aluminum Inc',
        inspectionStatus: 'APPROVED',
      },
    },
  });

  await prisma.traceabilityEvent.create({
    data: {
      eventType: 'LOT_CREATED',
      eventTimestamp: new Date('2025-10-05T08:00:00Z'),
      partId: 'part-bracket-001',
      partNumber: 'BRK-001',
      lotNumber: 'LOT-2025-002',
      workOrderId: 'wo-2025-001',
      workOrderNumber: 'WO-2025-001',
      quantity: 100,
      unitOfMeasure: 'EA',
      locationId: 'loc-wip-001',
      locationName: 'WIP Storage',
      performedById: OPERATOR_USER_ID,
      performedByName: 'Tom Anderson',
      parentLotNumber: 'LOT-2025-001',
      relationship: 'PRODUCED',
      metadata: {
        operation: 'CNC Milling',
        workCenter: 'WC-MILL-01',
      },
    },
  });

  await prisma.traceabilityEvent.create({
    data: {
      eventType: 'SERIAL_CREATED',
      eventTimestamp: new Date('2025-10-12T09:00:00Z'),
      partId: 'part-shaft-002',
      partNumber: 'SFT-002',
      lotNumber: 'LOT-SFT-001',
      serialNumber: 'SFT-002-SN-00001',
      workOrderId: 'wo-2025-002',
      workOrderNumber: 'WO-2025-002',
      quantity: 1,
      unitOfMeasure: 'EA',
      locationId: 'loc-wip-001',
      locationName: 'WIP Storage',
      performedById: OPERATOR_USER_ID,
      performedByName: 'Tom Anderson',
      parentLotNumber: 'LOT-SFT-001',
      relationship: 'PRODUCED',
    },
  });

  await prisma.traceabilityEvent.create({
    data: {
      eventType: 'INSPECTION_PERFORMED',
      eventTimestamp: new Date('2025-10-07T14:00:00Z'),
      partId: 'part-bracket-001',
      partNumber: 'BRK-001',
      lotNumber: 'LOT-2025-002',
      quantity: 2,
      unitOfMeasure: 'EA',
      locationId: 'loc-qc-001',
      locationName: 'QC Inspection Area',
      performedById: 'qc-inspector-id',
      performedByName: 'Mike Johnson',
      metadata: {
        inspectionNumber: 'INS-2025-001',
        result: 'PASS',
        inspector: 'Mike Johnson',
      },
    },
  });

  console.log(`✅ Created ${4} traceability events`);

  // 2. Create Lot Genealogy
  await prisma.lotGenealogy.upsert({
    where: { lotNumber: 'LOT-2025-001' },
    update: {},
    create: {
      lotNumber: 'LOT-2025-001',
      partId: 'part-raw-aluminum',
      partNumber: 'RM-AL6061-001',
      parentLots: [],
      childLots: ['LOT-2025-002'],
      ancestorLots: [],
      descendantLots: ['LOT-2025-002'],
      serialNumbers: [],
      depth: 0,
      treeVersion: 1,
    },
  });

  await prisma.lotGenealogy.upsert({
    where: { lotNumber: 'LOT-2025-002' },
    update: {},
    create: {
      lotNumber: 'LOT-2025-002',
      partId: 'part-bracket-001',
      partNumber: 'BRK-001',
      parentLots: ['LOT-2025-001'],
      childLots: [],
      ancestorLots: ['LOT-2025-001'],
      descendantLots: [],
      serialNumbers: [],
      depth: 1,
      treeVersion: 1,
    },
  });

  console.log(`✅ Created ${2} lot genealogy records`);

  // 3. Create Serial Genealogy
  await prisma.serialGenealogy.upsert({
    where: { serialNumber: 'SFT-002-SN-00001' },
    update: {},
    create: {
      serialNumber: 'SFT-002-SN-00001',
      partId: 'part-shaft-002',
      partNumber: 'SFT-002',
      lotNumber: 'LOT-SFT-001',
      parentSerials: [],
      childSerials: [],
      ancestorSerials: [],
      descendantSerials: [],
      assemblyPath: {},
      workOrderIds: ['wo-2025-002'],
      workOrderNumbers: ['WO-2025-002'],
      locationHistory: [
        {
          locationId: 'loc-wip-001',
          timestamp: '2025-10-12T09:00:00Z',
          event: 'CREATED',
        },
        {
          locationId: 'loc-qc-001',
          timestamp: '2025-10-12T14:00:00Z',
          event: 'INSPECTION',
        },
      ],
      depth: 0,
      treeVersion: 1,
    },
  });

  console.log(`✅ Created ${1} serial genealogy record`);

  // 4. Create Digital Thread
  await prisma.digitalThread.upsert({
    where: { serialNumber: 'SFT-002-SN-00001' },
    update: {},
    create: {
      serialNumber: 'SFT-002-SN-00001',
      partId: 'part-shaft-002',
      partNumber: 'SFT-002',
      partRevision: 'B',
      lotNumber: 'LOT-SFT-001',
      workOrderId: 'wo-2025-002',
      workOrderNumber: 'WO-2025-002',
      productionDate: new Date('2025-10-12'),
      productionLocation: 'Plant 1 - Machining',
      parentSerials: [],
      childSerials: [],
      genealogyDepth: 0,
      productionEvents: [
        {
          timestamp: '2025-10-12T08:00:00Z',
          event: 'OPERATION_STARTED',
          operation: 'Turning',
          workCenter: 'WC-LATHE-01',
          operator: 'Tom Anderson',
        },
        {
          timestamp: '2025-10-12T11:30:00Z',
          event: 'OPERATION_COMPLETED',
          operation: 'Turning',
          workCenter: 'WC-LATHE-01',
          operator: 'Tom Anderson',
        },
      ],
      qualityInspections: [
        {
          timestamp: '2025-10-12T14:00:00Z',
          inspectionId: 'fai-sft-002-rev-b',
          result: 'PASS',
          inspector: 'Mike Johnson',
        },
      ],
      faiReportId: 'FAI-SFT-002-REV-B',
      materialTransactions: [
        {
          timestamp: '2025-10-12T08:00:00Z',
          type: 'ISSUE',
          quantity: 1,
          location: 'WC-LATHE-01',
        },
      ],
      installedComponents: [],
      removedComponents: [],
      currentStatus: 'COMPLETED',
      currentLocation: 'loc-fg-001',
      currentOwner: 'Plant 1',
      manufacturedAt: new Date('2025-10-12'),
    },
  });

  console.log(`✅ Created ${1} digital thread`);

  // 5. Create Recall Simulation
  await prisma.recallSimulation.create({
    data: {
      simulationName: 'Raw Material Lot Recall Simulation',
      criteriaType: 'BY_LOT',
      lotNumber: 'LOT-2025-001',
      affectedLots: ['LOT-2025-001', 'LOT-2025-002'],
      affectedSerials: [],
      affectedWorkOrders: ['WO-2025-001'],
      affectedCustomers: ['CO-2025-001'],
      totalUnitsAffected: 200,
      unitsShipped: 0,
      unitsInProduction: 75,
      unitsInInventory: 125,
      estimatedCost: 6400.00,
      impactDetails: {
        byLocation: {
          'loc-raw-001': { units: 125, status: 'IN_INVENTORY' },
          'loc-wip-001': { units: 25, status: 'IN_PRODUCTION' },
          'loc-fg-001': { units: 50, status: 'COMPLETED' },
        },
        byWorkOrder: {
          'WO-2025-001': { units: 100, status: 'IN_PROGRESS' },
        },
      },
      simulatedById: 'admin-user-id',
      notes: 'Simulated recall for lot quality investigation',
    },
  });

  console.log(`✅ Created ${1} recall simulation`);

  console.log('\n📊 Seed Summary:');
  const eventCount = await prisma.traceabilityEvent.count();
  const lotGenCount = await prisma.lotGenealogy.count();
  const serialGenCount = await prisma.serialGenealogy.count();
  const digitalThreadCount = await prisma.digitalThread.count();
  const recallSimCount = await prisma.recallSimulation.count();

  console.log(`  - Traceability Events: ${eventCount}`);
  console.log(`  - Lot Genealogy Records: ${lotGenCount}`);
  console.log(`  - Serial Genealogy Records: ${serialGenCount}`);
  console.log(`  - Digital Threads: ${digitalThreadCount}`);
  console.log(`  - Recall Simulations: ${recallSimCount}`);
  console.log('\n✅ Traceability Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
