/**
 * Demo Video Scenario Seed Data
 *
 * This seed script creates data specifically for the 7 demo video scenarios.
 * It populates the database with users, products, work orders, equipment, and
 * other data that precisely matches the demo scripts.
 */

import {
  PrismaClient,
  EquipmentClass,
  EquipmentStatus,
  EquipmentState,
  MaterialType,
  WorkOrderStatus,
  WorkOrderPriority,
  ProductType,
  ProductLifecycleState,
  ProcessSegmentType,
  RoutingLifecycleState,
  PerformancePeriodType,
  ScheduleState,
  SchedulePriority
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'demo123';

async function main() {
  console.log('🎬 Seeding demo video scenario data...');

  const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);

  // ============================================================
  // 1. CREATE USERS (Personas from scenarios)
  // ============================================================
  console.log('\n📝 Creating scenario users...');

  const users = [
    {
      username: 'sarah.manager',
      email: 'sarah.manager@apex-mfg.com',
      firstName: 'Sarah',
      lastName: 'Manager',
      roles: ['Plant Manager', 'System Administrator'],
      permissions: ['*'] // Wildcard permission for full access
    },
    {
      username: 'mike.chen',
      email: 'mike.chen@apex-mfg.com',
      firstName: 'Mike',
      lastName: 'Chen',
      roles: ['MANUFACTURING_ENGINEER'],
      permissions: ['VIEW_ROUTINGS', 'EDIT_ROUTINGS', 'APPROVE_ROUTINGS']
    },
    {
      username: 'jennifer.rodriguez',
      email: 'jennifer.rodriguez@apex-mfg.com',
      firstName: 'Jennifer',
      lastName: 'Rodriguez',
      roles: ['PROCESS_ENGINEER'],
      permissions: ['VIEW_ROUTINGS', 'EDIT_ROUTINGS', 'VIEW_PROCESS_SEGMENTS']
    },
    {
      username: 'tom.operator',
      email: 'tom.operator@apex-mfg.com',
      firstName: 'Tom',
      lastName: 'Chen',
      roles: ['PRODUCTION_OPERATOR'],
      permissions: ['VIEW_WORK_ORDERS', 'EXECUTE_WORK_ORDERS', 'VIEW_WORK_INSTRUCTIONS']
    },
    {
      username: 'maria.operator',
      email: 'maria.operator@apex-mfg.com',
      firstName: 'Maria',
      lastName: 'Garcia',
      roles: ['PRODUCTION_OPERATOR'],
      permissions: ['VIEW_WORK_ORDERS', 'EXECUTE_WORK_ORDERS']
    },
    {
      username: 'james.operator',
      email: 'james.operator@apex-mfg.com',
      firstName: 'James',
      lastName: 'Wilson',
      roles: ['PRODUCTION_OPERATOR'],
      permissions: ['VIEW_WORK_ORDERS', 'EXECUTE_WORK_ORDERS']
    },
    {
      username: 'carlos.supervisor',
      email: 'carlos.supervisor@apex-mfg.com',
      firstName: 'Carlos',
      lastName: 'Martinez',
      roles: ['PRODUCTION_SUPERVISOR'],
      permissions: ['VIEW_WORK_ORDERS', 'ASSIGN_WORK_ORDERS', 'VIEW_TEAM_PERFORMANCE']
    },
    {
      username: 'elena.supervisor',
      email: 'elena.supervisor@apex-mfg.com',
      firstName: 'Elena',
      lastName: 'Rodriguez',
      roles: ['PRODUCTION_SUPERVISOR'],
      permissions: ['VIEW_WORK_ORDERS', 'ASSIGN_WORK_ORDERS', 'VIEW_TEAM_PERFORMANCE']
    },
    {
      username: 'linda.qe',
      email: 'linda.qe@apex-mfg.com',
      firstName: 'Linda',
      lastName: 'Thompson',
      roles: ['QUALITY_ENGINEER'],
      permissions: ['VIEW_QUALITY', 'CREATE_QUALITY_ALERTS', 'VIEW_TRACEABILITY']
    },
    {
      username: 'rachel.qe',
      email: 'rachel.qe@apex-mfg.com',
      firstName: 'Rachel',
      lastName: 'Kim',
      roles: ['QUALITY_ENGINEER'],
      permissions: ['VIEW_QUALITY', 'PERFORM_FAI', 'APPROVE_DEVIATIONS']
    },
    {
      username: 'david.qe',
      email: 'david.qe@apex-mfg.com',
      firstName: 'David',
      lastName: 'Lee',
      roles: ['QUALITY_ENGINEER'],
      permissions: ['VIEW_QUALITY', 'PERFORM_FAI']
    },
    {
      username: 'mike.maintenance',
      email: 'mike.maintenance@apex-mfg.com',
      firstName: 'Mike',
      lastName: 'Johnson',
      roles: ['MAINTENANCE_TECH'],
      permissions: ['VIEW_EQUIPMENT', 'PERFORM_MAINTENANCE']
    },
    {
      username: 'j.martinez',
      email: 'j.martinez@apex-mfg.com',
      firstName: 'Jose',
      lastName: 'Martinez',
      roles: ['QUALITY_INSPECTOR'],
      permissions: ['VIEW_QUALITY', 'PERFORM_INSPECTIONS']
    },
    {
      username: 'k.williams',
      email: 'k.williams@apex-mfg.com',
      firstName: 'Karen',
      lastName: 'Williams',
      roles: ['QUALITY_INSPECTOR'],
      permissions: ['VIEW_QUALITY', 'PERFORM_INSPECTIONS']
    }
  ];

  const createdUsers = [];
  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { username: userData.username },
      update: {
        passwordHash: hashedPassword,
        ...userData,
        isActive: true
      },
      create: {
        ...userData,
        passwordHash: hashedPassword,
        isActive: true
      }
    });
    createdUsers.push(user);
    console.log(`  ✓ ${userData.firstName} ${userData.lastName} (${userData.username})`);
  }

  // ============================================================
  // 2. CREATE ISA-95 HIERARCHY (Site → Area → WorkCenter → Equipment)
  // ============================================================
  console.log('\n🏭 Creating facility hierarchy...');

  const site = await prisma.site.upsert({
    where: { siteCode: 'SITE-APEX-001' },
    update: {
      siteName: 'Apex Manufacturing Plant 1',
      location: 'Phoenix, AZ',
      isActive: true
    },
    create: {
      siteCode: 'SITE-APEX-001',
      siteName: 'Apex Manufacturing Plant 1',
      location: 'Phoenix, AZ',
      isActive: true
    }
  });

  const machiningArea = await prisma.area.upsert({
    where: { areaCode: 'AREA-MACHINING' },
    update: {
      areaName: 'CNC Machining Area',
      siteId: site.id
    },
    create: {
      areaCode: 'AREA-MACHINING',
      areaName: 'CNC Machining Area',
      siteId: site.id
    }
  });

  const assemblyArea = await prisma.area.upsert({
    where: { areaCode: 'AREA-ASSEMBLY' },
    update: {
      areaName: 'Assembly Area',
      siteId: site.id
    },
    create: {
      areaCode: 'AREA-ASSEMBLY',
      areaName: 'Assembly Area',
      siteId: site.id
    }
  });

  // Work Centers
  const cncWorkCenter = await prisma.workCenter.upsert({
    where: { name: 'CNC Machining Cell 1' },
    update: {
      description: '5-axis CNC machining center',
      capacity: 24.0,
      areaId: machiningArea.id
    },
    create: {
      name: 'CNC Machining Cell 1',
      description: '5-axis CNC machining center',
      capacity: 24.0,
      areaId: machiningArea.id
    }
  });

  const assemblyWorkCenter = await prisma.workCenter.upsert({
    where: { name: 'Assembly Station A' },
    update: {
      description: 'Manual assembly station',
      capacity: 8.0,
      areaId: assemblyArea.id
    },
    create: {
      name: 'Assembly Station A',
      description: 'Manual assembly station',
      capacity: 8.0,
      areaId: assemblyArea.id
    }
  });

  console.log(`  ✓ Site: ${site.siteName}`);
  console.log(`  ✓ Areas: Machining, Assembly`);
  console.log(`  ✓ Work Centers: CNC Machining Cell 1, Assembly Station A`);

  // ============================================================
  // 3. CREATE EQUIPMENT (Matching scenario scripts)
  // ============================================================
  console.log('\n⚙️  Creating equipment...');

  const equipment = [
    {
      equipmentNumber: 'CNC-01',
      name: 'CNC Machine 01',
      equipmentClass: EquipmentClass.PRODUCTION,
      equipmentType: 'CNC_MILL',
      status: EquipmentStatus.OPERATIONAL,
      currentState: EquipmentState.RUNNING,
      workCenterId: cncWorkCenter.id,
      oee: 94.0,
      availability: 98.0,
      performance: 96.0,
      quality: 100.0
    },
    {
      equipmentNumber: 'CNC-02',
      name: 'CNC Machine 02',
      equipmentClass: EquipmentClass.PRODUCTION,
      equipmentType: 'CNC_MILL',
      status: EquipmentStatus.OPERATIONAL,
      currentState: EquipmentState.RUNNING,
      workCenterId: cncWorkCenter.id,
      oee: 88.5,
      availability: 95.0,
      performance: 93.0,
      quality: 100.0
    },
    {
      equipmentNumber: 'CNC-03',
      name: 'CNC Machine 03',
      equipmentClass: EquipmentClass.PRODUCTION,
      equipmentType: 'CNC_MILL',
      status: EquipmentStatus.OPERATIONAL,
      currentState: EquipmentState.RUNNING,
      workCenterId: cncWorkCenter.id,
      oee: 75.2,
      availability: 82.0,
      performance: 92.0,
      quality: 99.8
    },
    {
      equipmentNumber: 'Assembly-01',
      name: 'Assembly Station 01',
      equipmentClass: EquipmentClass.ASSEMBLY,
      equipmentType: 'MANUAL_ASSEMBLY',
      status: EquipmentStatus.AVAILABLE,
      currentState: EquipmentState.IDLE,
      workCenterId: assemblyWorkCenter.id,
      oee: 85.0,
      availability: 90.0,
      performance: 95.0,
      quality: 99.5
    },
    {
      equipmentNumber: 'GRD-02',
      name: 'Grinder 02',
      equipmentClass: EquipmentClass.PRODUCTION,
      equipmentType: 'GRINDER',
      status: EquipmentStatus.OPERATIONAL,
      currentState: EquipmentState.RUNNING,
      workCenterId: cncWorkCenter.id,
      oee: 82.0,
      availability: 88.0,
      performance: 93.0,
      quality: 100.0
    },
    {
      equipmentNumber: 'TW-07',
      name: 'Torque Wrench 07',
      equipmentClass: EquipmentClass.QUALITY,
      equipmentType: 'TORQUE_WRENCH',
      status: EquipmentStatus.MAINTENANCE,
      currentState: EquipmentState.MAINTENANCE,
      workCenterId: assemblyWorkCenter.id,
      oee: null
    }
  ];

  for (const equip of equipment) {
    await prisma.equipment.upsert({
      where: { equipmentNumber: equip.equipmentNumber },
      update: equip,
      create: equip
    });
    console.log(`  ✓ ${equip.equipmentNumber}: ${equip.name} (${equip.status})`);
  }

  // ============================================================
  // 4. CREATE MATERIAL CLASSES
  // ============================================================
  console.log('\n📦 Creating material classes...');

  const finishedGoodsClass = await prisma.materialClass.upsert({
    where: { classCode: 'FG' },
    update: {
      className: 'Finished Goods',
      description: 'Completed products ready for shipment',
      level: 1,
      requiresLotTracking: true,
      requiresSerialTracking: true
    },
    create: {
      classCode: 'FG',
      className: 'Finished Goods',
      description: 'Completed products ready for shipment',
      level: 1,
      requiresLotTracking: true,
      requiresSerialTracking: true
    }
  });

  const componentClass = await prisma.materialClass.upsert({
    where: { classCode: 'COMP' },
    update: {
      className: 'Components',
      description: 'Purchased or manufactured components',
      level: 1,
      requiresLotTracking: true,
      requiresSerialTracking: false
    },
    create: {
      classCode: 'COMP',
      className: 'Components',
      description: 'Purchased or manufactured components',
      level: 1,
      requiresLotTracking: true,
      requiresSerialTracking: false
    }
  });

  console.log('  ✓ Material classes created');

  // ============================================================
  // 5. CREATE MATERIAL DEFINITIONS (Products from scenarios)
  // ============================================================
  console.log('\n📦 Creating material definitions...');

  const products = [
    {
      materialNumber: 'WDG-A-100',
      materialName: 'Widget A',
      description: 'Standard Widget Assembly - 8 operation routing',
      materialClassId: finishedGoodsClass.id,
      baseUnitOfMeasure: 'EA',
      materialType: MaterialType.ASSEMBLY
    },
    {
      materialNumber: 'WDG-B-200',
      materialName: 'Widget B',
      description: 'Widget B Assembly',
      materialClassId: finishedGoodsClass.id,
      baseUnitOfMeasure: 'EA',
      materialType: MaterialType.ASSEMBLY
    },
    {
      materialNumber: 'GEAR-ASM-300',
      materialName: 'Gear Assembly',
      description: 'Precision Gear Assembly',
      materialClassId: finishedGoodsClass.id,
      baseUnitOfMeasure: 'EA',
      materialType: MaterialType.ASSEMBLY
    },
    {
      materialNumber: 'BLADE-TB-500',
      materialName: 'Turbine Blade',
      description: 'Aerospace Turbine Blade - 12 step routing',
      materialClassId: finishedGoodsClass.id,
      baseUnitOfMeasure: 'EA',
      materialType: MaterialType.FINISHED_GOODS
    },
    {
      materialNumber: 'AERO-BRKT-750',
      materialName: 'Aerospace Bracket',
      description: 'Defense Aerospace Bracket - FAI Required',
      materialClassId: finishedGoodsClass.id,
      baseUnitOfMeasure: 'EA',
      materialType: MaterialType.FINISHED_GOODS
    },
    // Components
    {
      materialNumber: 'BP-PLATE-001',
      materialName: 'Base Plate',
      description: 'Machined base plate for Widget A',
      materialClassId: componentClass.id,
      baseUnitOfMeasure: 'EA',
      materialType: MaterialType.COMPONENT
    },
    {
      materialNumber: 'BRG-STD-001',
      materialName: 'Standard Bearing Set',
      description: 'Precision bearing set',
      materialClassId: componentClass.id,
      baseUnitOfMeasure: 'SET',
      materialType: MaterialType.COMPONENT
    },
    {
      materialNumber: 'PCB-CTRL-001',
      materialName: 'Control PCB',
      description: 'Control circuit board',
      materialClassId: componentClass.id,
      baseUnitOfMeasure: 'EA',
      materialType: MaterialType.COMPONENT
    }
  ];

  for (const product of products) {
    await prisma.materialDefinition.upsert({
      where: { materialNumber: product.materialNumber },
      update: product,
      create: product
    });
    console.log(`  ✓ ${product.materialNumber}: ${product.materialName}`);
  }

  // ============================================================
  // 6. CREATE WORK ORDERS (AFTER Parts are created)
  // ============================================================
  // This section will be moved after Part creation

  // ============================================================
  // 7. CREATE PARTS (Product Definitions)
  // ============================================================
  console.log('\n🔧 Creating part definitions...');

  const parts = [
    {
      partNumber: 'WDG-A-100',
      partName: 'Widget A',
      description: 'Standard Widget Assembly - 8 operation routing',
      partType: 'ASSEMBLY',
      productType: ProductType.MADE_TO_STOCK,
      lifecycleState: ProductLifecycleState.PRODUCTION,
      unitOfMeasure: 'EA',
      revision: 'Rev C'
    },
    {
      partNumber: 'WDG-B-200',
      partName: 'Widget B',
      description: 'Widget B Assembly',
      partType: 'ASSEMBLY',
      productType: ProductType.MADE_TO_STOCK,
      lifecycleState: ProductLifecycleState.PRODUCTION,
      unitOfMeasure: 'EA',
      revision: 'Rev B'
    },
    {
      partNumber: 'BLADE-TB-500',
      partName: 'Turbine Blade',
      description: 'Aerospace Turbine Blade - 12 step routing',
      partType: 'COMPONENT',
      productType: ProductType.MADE_TO_ORDER,
      lifecycleState: ProductLifecycleState.PRODUCTION,
      unitOfMeasure: 'EA',
      revision: 'Rev A'
    }
  ];

  const createdParts = [];
  for (const part of parts) {
    const created = await prisma.part.upsert({
      where: { partNumber: part.partNumber },
      update: part,
      create: part
    });
    createdParts.push(created);
    console.log(`  ✓ ${part.partNumber}: ${part.partName}`);
  }

  // ============================================================
  // 8. CREATE PROCESS SEGMENTS (Standard Operations)
  // ============================================================
  console.log('\n⚙️  Creating process segments...');

  const processSegments = [
    {
      segmentCode: 'OP-010-CNC-MILL',
      segmentName: 'CNC Milling',
      description: 'CNC milling operation for precision machining',
      segmentType: ProcessSegmentType.PRODUCTION,
      category: 'MACHINING',
      duration: 600, // 10 minutes
      setupTime: 300, // 5 minutes
      teardownTime: 120, // 2 minutes
      isStandardOperation: true,
      level: 1,
      version: '1.0'
    },
    {
      segmentCode: 'OP-020-DEBURR',
      segmentName: 'Deburring',
      description: 'Manual deburring and surface finishing',
      segmentType: ProcessSegmentType.PRODUCTION,
      category: 'FINISHING',
      duration: 300, // 5 minutes
      setupTime: 60,
      teardownTime: 60,
      isStandardOperation: true,
      level: 1,
      version: '1.0'
    },
    {
      segmentCode: 'OP-030-INSPECT',
      segmentName: 'Quality Inspection',
      description: 'In-process quality inspection',
      segmentType: ProcessSegmentType.QUALITY,
      category: 'INSPECTION',
      duration: 180, // 3 minutes
      setupTime: 30,
      teardownTime: 30,
      isStandardOperation: true,
      level: 1,
      version: '1.0'
    },
    {
      segmentCode: 'OP-040-ASSEMBLY',
      segmentName: 'Manual Assembly',
      description: 'Manual assembly operation',
      segmentType: ProcessSegmentType.PRODUCTION,
      category: 'ASSEMBLY',
      duration: 480, // 8 minutes
      setupTime: 120,
      teardownTime: 60,
      isStandardOperation: true,
      level: 1,
      version: '1.0'
    },
    {
      segmentCode: 'OP-050-GRIND',
      segmentName: 'Grinding',
      description: 'Precision grinding operation',
      segmentType: ProcessSegmentType.PRODUCTION,
      category: 'MACHINING',
      duration: 420, // 7 minutes
      setupTime: 180,
      teardownTime: 90,
      isStandardOperation: true,
      level: 1,
      version: '1.0'
    }
  ];

  const createdSegments = [];
  for (const segment of processSegments) {
    const created = await prisma.processSegment.upsert({
      where: { segmentCode: segment.segmentCode },
      update: segment,
      create: segment
    });
    createdSegments.push(created);
    console.log(`  ✓ ${segment.segmentCode}: ${segment.segmentName}`);
  }

  // ============================================================
  // 9. CREATE ROUTINGS (For Widget A - 8 operations)
  // ============================================================
  console.log('\n📋 Creating routings...');

  const widgetAPart = createdParts.find(p => p.partNumber === 'WDG-A-100');

  if (widgetAPart) {
    const routing = await prisma.routing.upsert({
      where: { routingNumber: 'RT-WDG-A-001' },
      update: {
        partId: widgetAPart.id,
        siteId: site.id,
        version: '1.0',
        lifecycleState: RoutingLifecycleState.RELEASED,
        description: 'Widget A Primary Routing - 8 operations',
        isPrimaryRoute: true,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        approvedBy: 'mike.chen',
        approvedAt: new Date('2024-01-15')
      },
      create: {
        routingNumber: 'RT-WDG-A-001',
        partId: widgetAPart.id,
        siteId: site.id,
        version: '1.0',
        lifecycleState: RoutingLifecycleState.RELEASED,
        description: 'Widget A Primary Routing - 8 operations',
        isPrimaryRoute: true,
        isActive: true,
        effectiveDate: new Date('2024-01-01'),
        approvedBy: 'mike.chen',
        approvedAt: new Date('2024-01-15')
      }
    });

    // Create routing steps
    const routingStepsData = [
      { stepNumber: 10, processSegmentCode: 'OP-010-CNC-MILL', workCenterName: 'CNC Machining Cell 1' },
      { stepNumber: 20, processSegmentCode: 'OP-020-DEBURR', workCenterName: 'CNC Machining Cell 1' },
      { stepNumber: 30, processSegmentCode: 'OP-030-INSPECT', workCenterName: 'CNC Machining Cell 1' },
      { stepNumber: 40, processSegmentCode: 'OP-050-GRIND', workCenterName: 'CNC Machining Cell 1' },
      { stepNumber: 50, processSegmentCode: 'OP-020-DEBURR', workCenterName: 'CNC Machining Cell 1' },
      { stepNumber: 60, processSegmentCode: 'OP-040-ASSEMBLY', workCenterName: 'Assembly Station A' },
      { stepNumber: 70, processSegmentCode: 'OP-030-INSPECT', workCenterName: 'Assembly Station A' },
      { stepNumber: 80, processSegmentCode: 'OP-030-INSPECT', workCenterName: 'Assembly Station A' }
    ];

    for (const stepData of routingStepsData) {
      const segment = createdSegments.find(s => s.segmentCode === stepData.processSegmentCode);
      const workCenter = stepData.workCenterName === 'CNC Machining Cell 1' ? cncWorkCenter : assemblyWorkCenter;

      if (segment) {
        await prisma.routingStep.upsert({
          where: {
            routingId_stepNumber: {
              routingId: routing.id,
              stepNumber: stepData.stepNumber
            }
          },
          update: {
            processSegmentId: segment.id,
            workCenterId: workCenter.id,
            isQualityInspection: stepData.processSegmentCode === 'OP-030-INSPECT'
          },
          create: {
            routingId: routing.id,
            stepNumber: stepData.stepNumber,
            processSegmentId: segment.id,
            workCenterId: workCenter.id,
            isQualityInspection: stepData.processSegmentCode === 'OP-030-INSPECT'
          }
        });
      }
    }

    console.log(`  ✓ RT-WDG-A-001: Widget A routing with 8 steps`);
  }

  // ============================================================
  // 10. CREATE WORK ORDERS (Matching scenario scripts)
  // ============================================================
  console.log('\n📋 Creating work orders...');

  const widgetAPart2 = createdParts.find(p => p.partNumber === 'WDG-A-100');
  const widgetBPart = createdParts.find(p => p.partNumber === 'WDG-B-200');

  // Get user IDs for work order creation
  const sarahManager = createdUsers.find(u => u.username === 'sarah.manager')!;
  const tomOperator = createdUsers.find(u => u.username === 'tom.operator')!;
  const mariaOperator = createdUsers.find(u => u.username === 'maria.operator')!;

  const workOrdersData = [
    {
      workOrderNumber: 'WO-2024-1547',
      partId: widgetAPart2!.id,
      quantity: 50,
      quantityCompleted: 37,
      status: WorkOrderStatus.IN_PROGRESS,
      priority: WorkOrderPriority.HIGH,
      dueDate: new Date('2025-10-23'),
      customerOrder: 'ABC-123',
      createdById: sarahManager.id,
      assignedToId: tomOperator.id,
      startedAt: new Date('2025-10-20T08:00:00'),
      actualStartDate: new Date('2025-10-20')
    },
    {
      workOrderNumber: 'WO-2024-1548',
      partId: widgetBPart!.id,
      quantity: 30,
      quantityCompleted: 13,
      status: WorkOrderStatus.IN_PROGRESS,
      priority: WorkOrderPriority.HIGH,
      dueDate: new Date('2025-10-22'),
      customerOrder: 'XYZ-456',
      createdById: sarahManager.id,
      assignedToId: mariaOperator.id,
      startedAt: new Date('2025-10-19T08:00:00'),
      actualStartDate: new Date('2025-10-19')
    },
    {
      workOrderNumber: 'WO-2024-1549',
      partId: widgetAPart2!.id,
      quantity: 100,
      quantityCompleted: 10,
      status: WorkOrderStatus.IN_PROGRESS,
      priority: WorkOrderPriority.NORMAL,
      dueDate: new Date('2025-10-25'),
      customerOrder: 'GEAR-789',
      createdById: sarahManager.id,
      assignedToId: tomOperator.id,
      startedAt: new Date('2025-10-22T08:00:00'),
      actualStartDate: new Date('2025-10-22')
    },
    {
      workOrderNumber: 'WO-2024-1550',
      partId: widgetAPart2!.id,
      quantity: 40,
      quantityCompleted: 0,
      status: WorkOrderStatus.RELEASED,
      priority: WorkOrderPriority.NORMAL,
      dueDate: new Date('2025-10-26'),
      customerOrder: 'ABC-124',
      createdById: sarahManager.id,
      assignedToId: null,
      startedAt: null,
      actualStartDate: null
    }
  ];

  for (const wo of workOrdersData) {
    const part = await prisma.part.findUnique({ where: { id: wo.partId } });

    if (part) {
      await prisma.workOrder.upsert({
        where: { workOrderNumber: wo.workOrderNumber },
        update: {
          quantity: wo.quantity,
          quantityCompleted: wo.quantityCompleted,
          status: wo.status,
          priority: wo.priority,
          dueDate: wo.dueDate,
          startedAt: wo.startedAt,
          actualStartDate: wo.actualStartDate
        },
        create: {
          workOrderNumber: wo.workOrderNumber,
          partId: wo.partId,
          partNumber: part.partNumber,
          quantity: wo.quantity,
          quantityCompleted: wo.quantityCompleted,
          status: wo.status,
          priority: wo.priority,
          dueDate: wo.dueDate,
          customerOrder: wo.customerOrder,
          createdById: wo.createdById,
          assignedToId: wo.assignedToId,
          startedAt: wo.startedAt,
          actualStartDate: wo.actualStartDate,
          siteId: site.id
        }
      });

      const completionPct = Math.round((wo.quantityCompleted / wo.quantity) * 100);
      console.log(`  ✓ ${wo.workOrderNumber}: ${part.partName} (${completionPct}% complete, ${wo.status})`);
    }
  }

  // ============================================================
  // 11. CREATE OEE PERFORMANCE LOGS (Time-series data)
  // ============================================================
  console.log('\n📊 Creating OEE performance logs...');

  // Get equipment for logging
  const cnc01 = await prisma.equipment.findUnique({ where: { equipmentNumber: 'CNC-01' } });
  const cnc02 = await prisma.equipment.findUnique({ where: { equipmentNumber: 'CNC-02' } });
  const cnc03 = await prisma.equipment.findUnique({ where: { equipmentNumber: 'CNC-03' } });

  // Create hourly logs for the last 8 hours
  const now = new Date();
  const equipmentForLogs = [
    { equipment: cnc01, baseOEE: 94.0, baseAvail: 98.0, basePerf: 96.0, baseQuality: 100.0 },
    { equipment: cnc02, baseOEE: 88.5, baseAvail: 95.0, basePerf: 93.0, baseQuality: 100.0 },
    { equipment: cnc03, baseOEE: 75.2, baseAvail: 82.0, basePerf: 92.0, baseQuality: 99.8 }
  ];

  let logCount = 0;
  for (const { equipment, baseOEE, baseAvail, basePerf, baseQuality } of equipmentForLogs) {
    if (!equipment) continue;

    for (let hour = 8; hour >= 1; hour--) {
      const periodEnd = new Date(now.getTime() - (hour - 1) * 60 * 60 * 1000);
      const periodStart = new Date(periodEnd.getTime() - 60 * 60 * 1000);

      // Add some variance to make data realistic
      const variance = (Math.random() - 0.5) * 10; // ±5%
      const availability = Math.max(70, Math.min(100, baseAvail + variance));
      const performance = Math.max(80, Math.min(100, basePerf + variance));
      const quality = Math.max(95, Math.min(100, baseQuality + (Math.random() - 0.8) * 2));
      const oee = (availability * performance * quality) / 10000;

      const totalProduced = Math.floor((3600 * availability / 100) / (600 * (100 / performance)));
      const goodUnitsCount = Math.floor(totalProduced * (quality / 100));
      const rejectedUnitsCount = Math.max(0, totalProduced - goodUnitsCount);

      await prisma.equipmentPerformanceLog.create({
        data: {
          equipmentId: equipment.id,
          periodStart,
          periodEnd,
          periodType: PerformancePeriodType.HOUR,
          plannedProductionTime: 3600, // 1 hour
          operatingTime: Math.floor(3600 * (availability / 100)),
          downtime: Math.floor(3600 * (1 - availability / 100)),
          availability,
          idealCycleTime: 600, // 10 minutes per unit
          actualCycleTime: 600 * (100 / performance),
          totalUnitsProduced: totalProduced,
          targetProduction: 6, // 6 units per hour
          performance,
          goodUnits: goodUnitsCount,
          rejectedUnits: rejectedUnitsCount,
          scrapUnits: 0, // Assume rejected units can be reworked
          reworkUnits: rejectedUnitsCount, // All rejected units go to rework
          quality,
          oee
        }
      });
      logCount++;
    }
  }

  console.log(`  ✓ Created ${logCount} performance log entries`);

  // ============================================================
  // 12. CREATE PRODUCTION SCHEDULES
  // ============================================================
  console.log('\n📅 Creating production schedules...');

  const schedule = await prisma.productionSchedule.upsert({
    where: { scheduleNumber: 'SCH-2024-10-001' },
    update: {
      scheduleName: 'October 2024 Production Schedule',
      description: 'Monthly production schedule for Phoenix Plant',
      periodStart: new Date('2025-10-01'),
      periodEnd: new Date('2025-10-31'),
      periodType: 'MONTHLY',
      siteId: site.id,
      state: ScheduleState.RELEASED,
      priority: SchedulePriority.NORMAL,
      plannedBy: 'sarah.manager',
      approvedBy: 'sarah.manager',
      approvedAt: new Date('2025-09-28'),
      totalEntries: 4,
      dispatchedCount: 2
    },
    create: {
      scheduleNumber: 'SCH-2024-10-001',
      scheduleName: 'October 2024 Production Schedule',
      description: 'Monthly production schedule for Phoenix Plant',
      periodStart: new Date('2025-10-01'),
      periodEnd: new Date('2025-10-31'),
      periodType: 'MONTHLY',
      siteId: site.id,
      state: ScheduleState.RELEASED,
      priority: SchedulePriority.NORMAL,
      plannedBy: 'sarah.manager',
      approvedBy: 'sarah.manager',
      approvedAt: new Date('2025-09-28'),
      totalEntries: 4,
      dispatchedCount: 2
    }
  });

  console.log(`  ✓ SCH-2024-10-001: October 2024 schedule created`);

  console.log('\n✅ Demo video scenario data seeded successfully!');
  console.log('\n📋 Summary:');
  console.log(`   - ${users.length} users created`);
  console.log(`   - ${equipment.length} equipment items`);
  console.log(`   - ${products.length} material definitions`);
  console.log(`   - ${parts.length} part definitions`);
  console.log(`   - ${processSegments.length} process segments`);
  console.log(`   - 1 routing with 8 steps`);
  console.log(`   - ${workOrdersData.length} work orders`);
  console.log(`   - ${logCount} OEE performance logs`);
  console.log(`   - 1 production schedule`);
  console.log(`\n🎬 Ready for demo video recording!`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding scenario data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
