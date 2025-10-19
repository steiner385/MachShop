/**
 * Material Service Seed Script
 * Populates material database with parts, inventory, and lot tracking data
 */

import { PrismaClient } from '../../../node_modules/.prisma/client-material';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Material Service database...');

  // User IDs from Auth Service
  const ADMIN_USER_ID = 'admin-user-id';
  const MATERIAL_HANDLER_ID = 'material-handler-id';

  // Location IDs from Resource Service
  const LOCATION_RAW_MATERIAL = 'loc-raw-001';
  const LOCATION_WIP = 'loc-wip-001';
  const LOCATION_FG = 'loc-fg-001';

  // 1. Create Parts
  const partBracket = await prisma.part.upsert({
    where: { partNumber: 'BRK-001' },
    update: {},
    create: {
      id: 'part-bracket-001',
      partNumber: 'BRK-001',
      partName: 'Machined Aluminum Bracket',
      description: 'CNC machined aluminum mounting bracket',
      revision: 'C',
      unitOfMeasure: 'EA',
      materialType: 'ALUMINUM_6061',
      standardCost: 15.75,
      weight: 0.25,
      weightUnit: 'LB',
      minimumStock: 50,
      reorderPoint: 75,
      leadTimeDays: 14,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      isActive: true,
    },
  });

  const partShaft = await prisma.part.upsert({
    where: { partNumber: 'SFT-002' },
    update: {},
    create: {
      id: 'part-shaft-002',
      partNumber: 'SFT-002',
      partName: 'Steel Drive Shaft',
      description: 'Precision ground steel drive shaft',
      revision: 'B',
      unitOfMeasure: 'EA',
      materialType: 'STEEL_4140',
      standardCost: 45.00,
      weight: 2.5,
      weightUnit: 'LB',
      minimumStock: 25,
      reorderPoint: 40,
      leadTimeDays: 21,
      requiresLotTracking: true,
      requiresSerialTracking: true,
      isActive: true,
    },
  });

  const partHousing = await prisma.part.upsert({
    where: { partNumber: 'HSG-003' },
    update: {},
    create: {
      id: 'part-housing-003',
      partNumber: 'HSG-003',
      partName: 'Cast Iron Housing',
      description: 'Cast iron motor housing',
      revision: 'A',
      unitOfMeasure: 'EA',
      materialType: 'CAST_IRON',
      standardCost: 85.50,
      weight: 12.0,
      weightUnit: 'LB',
      minimumStock: 10,
      reorderPoint: 20,
      leadTimeDays: 30,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      isActive: true,
    },
  });

  const partRawAluminum = await prisma.part.upsert({
    where: { partNumber: 'RM-AL6061-001' },
    update: {},
    create: {
      id: 'part-raw-aluminum',
      partNumber: 'RM-AL6061-001',
      partName: 'Aluminum 6061 Bar Stock',
      description: '2" x 4" x 12" aluminum bar stock',
      unitOfMeasure: 'EA',
      materialType: 'RAW_MATERIAL',
      standardCost: 32.00,
      weight: 5.5,
      weightUnit: 'LB',
      minimumStock: 100,
      reorderPoint: 150,
      leadTimeDays: 7,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      isActive: true,
    },
  });

  console.log(`✅ Created ${4} parts`);

  // 2. Create BOM Items
  await prisma.bOMItem.create({
    data: {
      parentPartId: partBracket.id,
      childPartId: partRawAluminum.id,
      quantity: 0.4,
      unitOfMeasure: 'EA',
      findNumber: '1',
      notes: 'One bracket requires 40% of bar stock',
      isActive: true,
      effectiveDate: new Date('2025-01-01'),
    },
  });

  console.log(`✅ Created BOM relationships`);

  // 3. Create Material Lots
  const lot1 = await prisma.materialLot.upsert({
    where: { lotNumber: 'LOT-2025-001' },
    update: {},
    create: {
      lotNumber: 'LOT-2025-001',
      partId: partRawAluminum.id,
      quantity: 200,
      quantityRemaining: 125,
      unitOfMeasure: 'EA',
      supplierLotNumber: 'SUP-AL-98765',
      receivedDate: new Date('2025-09-15'),
      manufactureDate: new Date('2025-09-01'),
      expirationDate: new Date('2030-09-01'),
      qualityStatus: 'APPROVED',
      certificateUrls: ['https://example.com/certs/lot-2025-001.pdf'],
      msdsUrls: ['https://example.com/msds/aluminum-6061.pdf'],
      isActive: true,
    },
  });

  const lot2 = await prisma.materialLot.upsert({
    where: { lotNumber: 'LOT-2025-002' },
    update: {},
    create: {
      lotNumber: 'LOT-2025-002',
      partId: partBracket.id,
      quantity: 75,
      quantityRemaining: 50,
      unitOfMeasure: 'EA',
      receivedDate: new Date('2025-10-05'),
      manufactureDate: new Date('2025-10-05'),
      qualityStatus: 'APPROVED',
      certificateUrls: [],
      msdsUrls: [],
      isActive: true,
    },
  });

  console.log(`✅ Created ${2} material lots`);

  // 4. Create Inventory Records
  await prisma.inventory.upsert({
    where: { partId_locationId_lotNumber: { partId: partRawAluminum.id, locationId: LOCATION_RAW_MATERIAL, lotNumber: lot1.lotNumber } },
    update: {},
    create: {
      partId: partRawAluminum.id,
      locationId: LOCATION_RAW_MATERIAL,
      lotNumber: lot1.lotNumber,
      quantityOnHand: 125,
      quantityAvailable: 100,
      quantityReserved: 25,
      quantityAllocated: 0,
      status: 'AVAILABLE',
    },
  });

  await prisma.inventory.upsert({
    where: { partId_locationId_lotNumber: { partId: partBracket.id, locationId: LOCATION_FG, lotNumber: lot2.lotNumber } },
    update: {},
    create: {
      partId: partBracket.id,
      locationId: LOCATION_FG,
      lotNumber: lot2.lotNumber,
      quantityOnHand: 50,
      quantityAvailable: 50,
      quantityReserved: 0,
      quantityAllocated: 0,
      status: 'AVAILABLE',
    },
  });

  await prisma.inventory.upsert({
    where: { partId_locationId_lotNumber: { partId: partBracket.id, locationId: LOCATION_WIP, lotNumber: lot2.lotNumber } },
    update: {},
    create: {
      partId: partBracket.id,
      locationId: LOCATION_WIP,
      lotNumber: lot2.lotNumber,
      quantityOnHand: 25,
      quantityAvailable: 20,
      quantityReserved: 5,
      quantityAllocated: 0,
      status: 'AVAILABLE',
    },
  });

  console.log(`✅ Created ${3} inventory records`);

  // 5. Create Material Transactions
  await prisma.materialTransaction.create({
    data: {
      transactionNumber: 'TXN-2025-001',
      partId: partRawAluminum.id,
      lotNumber: lot1.lotNumber,
      transactionType: 'RECEIPT',
      quantity: 200,
      unitOfMeasure: 'EA',
      toLocation: LOCATION_RAW_MATERIAL,
      unitCost: 32.00,
      totalCost: 6400.00,
      transactionDate: new Date('2025-09-15T10:00:00Z'),
      createdById: MATERIAL_HANDLER_ID,
    },
  });

  await prisma.materialTransaction.create({
    data: {
      transactionNumber: 'TXN-2025-002',
      partId: partRawAluminum.id,
      lotNumber: lot1.lotNumber,
      transactionType: 'ISSUE',
      quantity: 40,
      unitOfMeasure: 'EA',
      fromLocation: LOCATION_RAW_MATERIAL,
      toLocation: LOCATION_WIP,
      workOrderId: 'wo-2025-001',
      unitCost: 32.00,
      totalCost: 1280.00,
      transactionDate: new Date('2025-10-05T08:30:00Z'),
      createdById: MATERIAL_HANDLER_ID,
    },
  });

  await prisma.materialTransaction.create({
    data: {
      transactionNumber: 'TXN-2025-003',
      partId: partBracket.id,
      lotNumber: lot2.lotNumber,
      transactionType: 'RECEIPT',
      quantity: 75,
      unitOfMeasure: 'EA',
      toLocation: LOCATION_FG,
      workOrderId: 'wo-2025-001',
      referenceNumber: 'WO-2025-001 Completion',
      unitCost: 15.75,
      totalCost: 1181.25,
      transactionDate: new Date('2025-10-07T16:00:00Z'),
      createdById: MATERIAL_HANDLER_ID,
    },
  });

  console.log(`✅ Created ${3} material transactions`);

  // 6. Create Serialized Parts
  await prisma.serializedPart.create({
    data: {
      serialNumber: 'SFT-002-SN-00001',
      partId: partShaft.id,
      lotNumber: 'LOT-SFT-001',
      workOrderId: 'wo-2025-002',
      status: 'COMPLETED',
      manufactureDate: new Date('2025-10-12'),
      customerOrder: 'CO-2025-002',
      genealogyTree: {},
    },
  });

  await prisma.serializedPart.create({
    data: {
      serialNumber: 'SFT-002-SN-00002',
      partId: partShaft.id,
      lotNumber: 'LOT-SFT-001',
      workOrderId: 'wo-2025-002',
      status: 'IN_PRODUCTION',
      manufactureDate: new Date('2025-10-13'),
      customerOrder: 'CO-2025-002',
      genealogyTree: {},
    },
  });

  console.log(`✅ Created ${2} serialized parts`);

  // 7. Create Serial Number Range
  await prisma.serialNumberRange.upsert({
    where: { rangePrefix: 'SFT-002-SN' },
    update: {},
    create: {
      rangePrefix: 'SFT-002-SN',
      currentNumber: 3,
      startNumber: 1,
      endNumber: 99999,
      format: 'SFT-002-SN-{#####}',
      isActive: true,
    },
  });

  console.log(`✅ Created serial number range`);

  console.log('\n📊 Seed Summary:');
  const partCount = await prisma.part.count();
  const lotCount = await prisma.materialLot.count();
  const inventoryCount = await prisma.inventory.count();
  const transactionCount = await prisma.materialTransaction.count();
  const serialCount = await prisma.serializedPart.count();

  console.log(`  - Parts: ${partCount}`);
  console.log(`  - Material Lots: ${lotCount}`);
  console.log(`  - Inventory Records: ${inventoryCount}`);
  console.log(`  - Transactions: ${transactionCount}`);
  console.log(`  - Serialized Parts: ${serialCount}`);
  console.log('\n✅ Material Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
