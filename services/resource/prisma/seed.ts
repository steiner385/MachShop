/**
 * Resource Service Seed Script
 * Populates resource database with sites, equipment, personnel, products, and routings
 */

import { PrismaClient } from '../../../node_modules/.prisma/client-resource';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Resource Service database...');

  // 1. Create Site
  const site1 = await prisma.site.upsert({
    where: { siteCode: 'PLANT-001' },
    update: {},
    create: {
      siteCode: 'PLANT-001',
      siteName: 'Main Manufacturing Plant',
      description: 'Primary manufacturing facility',
      address: '123 Industrial Way',
      city: 'Detroit',
      state: 'MI',
      country: 'USA',
      postalCode: '48201',
      timezone: 'America/Detroit',
      phoneNumber: '555-0100',
      email: 'plant001@machshop.com',
      isActive: true,
    },
  });

  console.log(`✅ Created site: ${site1.siteName}`);

  // 2. Create Areas
  const areaProd = await prisma.area.create({
    data: {
      siteId: site1.id,
      areaCode: 'MACHINING',
      areaName: 'Machining Department',
      description: 'CNC machining and turning operations',
      areaType: 'PRODUCTION',
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} area`);

  // 3. Create Work Centers
  const wcMill = await prisma.workCenter.upsert({
    where: { siteId_workCenterCode: { siteId: site1.id, workCenterCode: 'WC-MILL-01' } },
    update: {},
    create: {
      siteId: site1.id,
      areaId: areaProd.id,
      workCenterCode: 'WC-MILL-01',
      workCenterName: '3-Axis CNC Mill #1',
      description: 'Haas VF-3 3-axis CNC milling machine',
      equipmentLevel: 'WORK_CENTER',
      equipmentType: 'CNC',
      capabilities: ['MILLING', 'DRILLING', 'BORING'],
      capacity: 20,
      capacityUOM: 'parts/hour',
      status: 'AVAILABLE',
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} work center`);

  // 4. Create Products
  const productBracket = await prisma.product.upsert({
    where: { productCode: 'BRK-001' },
    update: {},
    create: {
      productCode: 'BRK-001',
      productName: 'Machined Aluminum Bracket',
      description: 'CNC machined aluminum mounting bracket',
      revision: 'C',
      productFamily: 'BRACKETS',
      productLine: 'STANDARD',
      productType: 'MANUFACTURED_PART',
      unitOfMeasure: 'EA',
      standardCost: 15.75,
      targetLeadTime: 5,
      lifecycleStatus: 'PRODUCTION',
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} product`);

  // 5. Create Routing
  const routing1 = await prisma.routing.create({
    data: {
      productId: productBracket.id,
      routingCode: 'RTG-BRK-001',
      routingName: 'Standard Bracket Routing',
      revision: '1',
      description: 'Standard CNC milling process for aluminum bracket',
      routingType: 'STANDARD',
      isDefault: true,
      isActive: true,
      effectiveDate: new Date('2025-01-01'),
    },
  });

  // 6. Create Operations
  const operation1 = await prisma.operation.create({
    data: {
      routingId: routing1.id,
      operationNumber: 10,
      operationCode: 'OP-010',
      operationName: 'CNC Milling',
      description: 'Mill bracket features on 3-axis CNC',
      workCenterId: wcMill.id,
      workCenterCode: 'WC-MILL-01',
      alternateWorkCenters: [],
      setupTime: 30,
      runTime: 15,
      teardownTime: 5,
      laborHours: 0.25,
      crewSize: 1,
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} routing with ${1} operation`);

  // 7. Create Personnel
  const personnel1 = await prisma.personnel.create({
    data: {
      userId: 'operator-user-id',
      employeeNumber: 'EMP-001',
      firstName: 'Tom',
      lastName: 'Anderson',
      displayName: 'Tom Anderson',
      email: 'tom.operator@machshop.com',
      phoneNumber: '555-0101',
      department: 'Machining',
      jobTitle: 'CNC Operator',
      shift: 'DAY',
      employmentType: 'FULL_TIME',
      hireDate: new Date('2020-01-15'),
      primarySiteId: site1.id,
      isActive: true,
    },
  });

  console.log(`✅ Created ${1} personnel record`);

  // 8. Create Skills
  const skillCNC = await prisma.skill.create({
    data: {
      skillCode: 'CNC-MILL',
      skillName: 'CNC Milling',
      description: '3-axis CNC milling machine operation',
      skillCategory: 'MACHINING',
      isActive: true,
    },
  });

  // 9. Assign Skill to Personnel
  await prisma.personnelSkill.create({
    data: {
      personnelId: personnel1.id,
      skillId: skillCNC.id,
      proficiencyLevel: 'ADVANCED',
      acquiredDate: new Date('2020-06-01'),
    },
  });

  console.log(`✅ Created ${1} skill and assigned to personnel`);

  // 10. Create Tools
  const tool1 = await prisma.tool.create({
    data: {
      toolNumber: 'T0001',
      toolName: '0.5" Carbide End Mill',
      description: '2-flute carbide end mill for aluminum',
      toolType: 'CUTTING_TOOL',
      toolFamily: 'END_MILLS',
      manufacturer: 'Kennametal',
      modelNumber: 'KM-050-2F',
      currentLocationId: wcMill.id,
      currentSiteId: site1.id,
      status: 'AVAILABLE',
      condition: 'GOOD',
      acquisitionDate: new Date('2024-01-01'),
      requiresCalibration: false,
      purchaseCost: 45.00,
      replacementCost: 45.00,
    },
  });

  console.log(`✅ Created ${1} tool`);

  console.log('\n📊 Seed Summary:');
  const siteCount = await prisma.site.count();
  const wcCount = await prisma.workCenter.count();
  const productCount = await prisma.product.count();
  const routingCount = await prisma.routing.count();
  const personnelCount = await prisma.personnel.count();
  const toolCount = await prisma.tool.count();

  console.log(`  - Sites: ${siteCount}`);
  console.log(`  - Work Centers: ${wcCount}`);
  console.log(`  - Products: ${productCount}`);
  console.log(`  - Routings: ${routingCount}`);
  console.log(`  - Personnel: ${personnelCount}`);
  console.log(`  - Tools: ${toolCount}`);
  console.log('\n✅ Resource Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
