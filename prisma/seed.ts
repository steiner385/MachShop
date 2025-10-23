import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { DEMO_USERS, DEMO_PASSWORD, validateDemoCredentials } from '../src/config/demoCredentials';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

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

  // For backward compatibility, assign specific users to variables
  const adminUser = createdUsers.find(u => u.username === 'admin')!;
  const qualityEngineer = createdUsers.find(u => u.username === 'jane.smith')!;
  const operator = createdUsers.find(u => u.username === 'john.doe')!;

  console.log('✅ Users created');

  // Create work centers using upsert to handle existing data
  const machiningCenter = await prisma.workCenter.upsert({
    where: { name: 'CNC Machining Cell 1' },
    update: {
      description: '5-axis CNC machining center for precision parts',
      capacity: 24.0
    },
    create: {
      name: 'CNC Machining Cell 1',
      description: '5-axis CNC machining center for precision parts',
      capacity: 24.0
    }
  });

  const assemblyArea = await prisma.workCenter.upsert({
    where: { name: 'Assembly Station A' },
    update: {
      description: 'Manual assembly station for engine components',
      capacity: 8.0
    },
    create: {
      name: 'Assembly Station A',
      description: 'Manual assembly station for engine components',
      capacity: 8.0
    }
  });

  console.log('✅ Work centers created');

  // Create ISA-95 hierarchy: Site → Area → WorkCenter → Equipment
  const mainSite = await prisma.site.upsert({
    where: { siteCode: 'SITE-001' },
    update: {
      siteName: 'Manufacturing Plant 1',
      location: 'Phoenix, AZ',
      isActive: true
    },
    create: {
      siteCode: 'SITE-001',
      siteName: 'Manufacturing Plant 1',
      location: 'Phoenix, AZ',
      isActive: true
    }
  });

  const productionArea = await prisma.area.upsert({
    where: { areaCode: 'AREA-PROD-001' },
    update: {
      areaName: 'Precision Machining Area',
      description: 'High-precision CNC machining and assembly area',
      siteId: mainSite.id,
      isActive: true
    },
    create: {
      areaCode: 'AREA-PROD-001',
      areaName: 'Precision Machining Area',
      description: 'High-precision CNC machining and assembly area',
      siteId: mainSite.id,
      isActive: true
    }
  });

  // Link existing work centers to the area
  await prisma.workCenter.update({
    where: { id: machiningCenter.id },
    data: { areaId: productionArea.id }
  });

  await prisma.workCenter.update({
    where: { id: assemblyArea.id },
    data: { areaId: productionArea.id }
  });

  console.log('✅ ISA-95 hierarchy (Site → Area → WorkCenter) created');

  // Create parts using upsert to handle existing data
  const turbineBlade = await prisma.part.upsert({
    where: { partNumber: 'ENG-BLADE-001' },
    update: {
      partName: 'Turbine Blade Assembly',
      description: 'High-pressure turbine blade for jet engine',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-TB-001',
      revision: 'C'
    },
    create: {
      partNumber: 'ENG-BLADE-001',
      partName: 'Turbine Blade Assembly',
      description: 'High-pressure turbine blade for jet engine',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-TB-001',
      revision: 'C'
    }
  });

  const guideVane = await prisma.part.upsert({
    where: { partNumber: 'ENG-VANE-002' },
    update: {
      partName: 'Guide Vane',
      description: 'Variable guide vane for compressor section',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-GV-002',
      revision: 'B'
    },
    create: {
      partNumber: 'ENG-VANE-002',
      partName: 'Guide Vane',
      description: 'Variable guide vane for compressor section',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-GV-002',
      revision: 'B'
    }
  });

  const compressorDisk = await prisma.part.upsert({
    where: { partNumber: 'ENG-DISK-003' },
    update: {
      partName: 'Compressor Disk',
      description: 'High-speed compressor disk assembly',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-CD-003',
      revision: 'A'
    },
    create: {
      partNumber: 'ENG-DISK-003',
      partName: 'Compressor Disk',
      description: 'High-speed compressor disk assembly',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-CD-003',
      revision: 'A'
    }
  });

  console.log('✅ Parts created');

  // Create routings using upsert with operations handling
  // First, delete all work order operations to allow routing operations to be deleted
  await prisma.workOrderOperation.deleteMany({});

  // Then, check if routing exists and handle operations
  const existingRouting = await prisma.routing.findUnique({
    where: { routingNumber: 'RT-BLADE-001' },
    include: { operations: true }
  });

  if (existingRouting) {
    // Delete existing operations to recreate them
    await prisma.routingOperation.deleteMany({
      where: { routingId: existingRouting.id }
    });
  }

  const bladeRouting = await prisma.routing.upsert({
    where: { routingNumber: 'RT-BLADE-001' },
    update: {
      description: 'Standard turbine blade manufacturing route',
      operations: {
        create: [
          {
            operationNumber: 10,
            operationName: 'Rough Machining',
            description: 'Rough machine blade profile',
            setupTime: 2.0,
            cycleTime: 1.5,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 20,
            operationName: 'Finish Machining',
            description: 'Finish machine to final dimensions',
            setupTime: 1.0,
            cycleTime: 2.0,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 30,
            operationName: 'Assembly',
            description: 'Assemble blade components',
            setupTime: 0.5,
            cycleTime: 0.75,
            workCenterId: assemblyArea.id
          }
        ]
      }
    },
    create: {
      routingNumber: 'RT-BLADE-001',
      description: 'Standard turbine blade manufacturing route',
      operations: {
        create: [
          {
            operationNumber: 10,
            operationName: 'Rough Machining',
            description: 'Rough machine blade profile',
            setupTime: 2.0,
            cycleTime: 1.5,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 20,
            operationName: 'Finish Machining',
            description: 'Finish machine to final dimensions',
            setupTime: 1.0,
            cycleTime: 2.0,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 30,
            operationName: 'Assembly',
            description: 'Assemble blade components',
            setupTime: 0.5,
            cycleTime: 0.75,
            workCenterId: assemblyArea.id
          }
        ]
      }
    }
  });

  // Create guide vane routing
  const vaneRouting = await prisma.routing.upsert({
    where: { routingNumber: 'RT-VANE-001' },
    update: {
      description: 'Standard guide vane manufacturing route',
      operations: {
        create: [
          {
            operationNumber: 10,
            operationName: 'Casting',
            description: 'Cast vane from molten metal',
            setupTime: 3.0,
            cycleTime: 2.5,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 20,
            operationName: 'Machining',
            description: 'Machine vane to final dimensions',
            setupTime: 1.5,
            cycleTime: 1.75,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 30,
            operationName: 'Final Inspection',
            description: 'Inspect vane dimensions and finish',
            setupTime: 0.25,
            cycleTime: 0.5,
            workCenterId: assemblyArea.id
          }
        ]
      }
    },
    create: {
      routingNumber: 'RT-VANE-001',
      description: 'Standard guide vane manufacturing route',
      operations: {
        create: [
          {
            operationNumber: 10,
            operationName: 'Casting',
            description: 'Cast vane from molten metal',
            setupTime: 3.0,
            cycleTime: 2.5,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 20,
            operationName: 'Machining',
            description: 'Machine vane to final dimensions',
            setupTime: 1.5,
            cycleTime: 1.75,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 30,
            operationName: 'Final Inspection',
            description: 'Inspect vane dimensions and finish',
            setupTime: 0.25,
            cycleTime: 0.5,
            workCenterId: assemblyArea.id
          }
        ]
      }
    }
  });

  // Create compressor disk routing
  const diskRouting = await prisma.routing.upsert({
    where: { routingNumber: 'RT-DISK-001' },
    update: {
      description: 'Standard compressor disk manufacturing route',
      operations: {
        create: [
          {
            operationNumber: 10,
            operationName: 'Forging',
            description: 'Forge disk from billet',
            setupTime: 4.0,
            cycleTime: 3.0,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 20,
            operationName: 'Heat Treatment',
            description: 'Heat treat for strength',
            setupTime: 2.0,
            cycleTime: 4.0,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 30,
            operationName: 'Precision Machining',
            description: 'Machine disk to tight tolerances',
            setupTime: 2.5,
            cycleTime: 3.5,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 40,
            operationName: 'Balancing',
            description: 'Balance disk for rotation',
            setupTime: 1.0,
            cycleTime: 1.5,
            workCenterId: assemblyArea.id
          }
        ]
      }
    },
    create: {
      routingNumber: 'RT-DISK-001',
      description: 'Standard compressor disk manufacturing route',
      operations: {
        create: [
          {
            operationNumber: 10,
            operationName: 'Forging',
            description: 'Forge disk from billet',
            setupTime: 4.0,
            cycleTime: 3.0,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 20,
            operationName: 'Heat Treatment',
            description: 'Heat treat for strength',
            setupTime: 2.0,
            cycleTime: 4.0,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 30,
            operationName: 'Precision Machining',
            description: 'Machine disk to tight tolerances',
            setupTime: 2.5,
            cycleTime: 3.5,
            workCenterId: machiningCenter.id
          },
          {
            operationNumber: 40,
            operationName: 'Balancing',
            description: 'Balance disk for rotation',
            setupTime: 1.0,
            cycleTime: 1.5,
            workCenterId: assemblyArea.id
          }
        ]
      }
    }
  });

  console.log('✅ Routings created');

  // Create quality plans using upsert with characteristics handling
  const existingQualityPlan = await prisma.qualityPlan.findUnique({
    where: { planNumber: 'QP-BLADE-001' },
    include: { characteristics: true }
  });

  if (existingQualityPlan) {
    // Delete existing characteristics to recreate them
    await prisma.qualityCharacteristic.deleteMany({
      where: { planId: existingQualityPlan.id }
    });
  }

  const bladeQualityPlan = await prisma.qualityPlan.upsert({
    where: { planNumber: 'QP-BLADE-001' },
    update: {
      planName: 'Turbine Blade Final Inspection',
      partId: turbineBlade.id,
      operation: 'Final Inspection',
      description: 'Complete dimensional and surface finish inspection',
      characteristics: {
        create: [
          {
            characteristic: 'Blade Length',
            specification: '125.0 ± 0.1 mm',
            toleranceType: 'BILATERAL',
            nominalValue: 125.0,
            upperLimit: 125.1,
            lowerLimit: 124.9,
            unitOfMeasure: 'mm',
            inspectionMethod: 'CMM'
          },
          {
            characteristic: 'Surface Finish',
            specification: 'Ra ≤ 1.6 μm',
            toleranceType: 'UNILATERAL_MINUS',
            nominalValue: 0.8,
            upperLimit: 1.6,
            lowerLimit: 0,
            unitOfMeasure: 'μm',
            inspectionMethod: 'Profilometer'
          },
          {
            characteristic: 'Airfoil Thickness',
            specification: '3.25 +0.05/-0.10 mm',
            toleranceType: 'UNILATERAL_PLUS',
            nominalValue: 3.25,
            upperLimit: 3.30,
            lowerLimit: 3.15,
            unitOfMeasure: 'mm',
            inspectionMethod: 'CMM'
          }
        ]
      }
    },
    create: {
      planNumber: 'QP-BLADE-001',
      planName: 'Turbine Blade Final Inspection',
      partId: turbineBlade.id,
      operation: 'Final Inspection',
      description: 'Complete dimensional and surface finish inspection',
      characteristics: {
        create: [
          {
            characteristic: 'Blade Length',
            specification: '125.0 ± 0.1 mm',
            toleranceType: 'BILATERAL',
            nominalValue: 125.0,
            upperLimit: 125.1,
            lowerLimit: 124.9,
            unitOfMeasure: 'mm',
            inspectionMethod: 'CMM'
          },
          {
            characteristic: 'Surface Finish',
            specification: 'Ra ≤ 1.6 μm',
            toleranceType: 'UNILATERAL_MINUS',
            nominalValue: 0.8,
            upperLimit: 1.6,
            lowerLimit: 0,
            unitOfMeasure: 'μm',
            inspectionMethod: 'Profilometer'
          },
          {
            characteristic: 'Airfoil Thickness',
            specification: '3.25 +0.05/-0.10 mm',
            toleranceType: 'UNILATERAL_PLUS',
            nominalValue: 3.25,
            upperLimit: 3.30,
            lowerLimit: 3.15,
            unitOfMeasure: 'mm',
            inspectionMethod: 'CMM'
          }
        ]
      }
    }
  });

  console.log('✅ Quality plans created');

  // Create work orders using upsert
  const workOrder1 = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2024-001001' },
    update: {
      partId: turbineBlade.id,
      quantity: 10,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date('2024-02-15'),
      customerOrder: 'CO-2024-001',
      routingId: bladeRouting.id,
      createdById: adminUser.id,
      assignedToId: operator.id,
      startedAt: new Date('2024-01-20T09:00:00Z')
    },
    create: {
      workOrderNumber: 'WO-2024-001001',
      partId: turbineBlade.id,
      quantity: 10,
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date('2024-02-15'),
      customerOrder: 'CO-2024-001',
      routingId: bladeRouting.id,
      createdById: adminUser.id,
      assignedToId: operator.id,
      startedAt: new Date('2024-01-20T09:00:00Z')
    }
  });

  const workOrder2 = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2024-001002' },
    update: {
      partId: guideVane.id,
      quantity: 25,
      priority: 'NORMAL',
      status: 'RELEASED',
      dueDate: new Date('2024-03-01'),
      customerOrder: 'CO-2024-002',
      routingId: vaneRouting.id,
      createdById: adminUser.id
    },
    create: {
      workOrderNumber: 'WO-2024-001002',
      partId: guideVane.id,
      quantity: 25,
      priority: 'NORMAL',
      status: 'RELEASED',
      dueDate: new Date('2024-03-01'),
      customerOrder: 'CO-2024-002',
      routingId: vaneRouting.id,
      createdById: adminUser.id
    }
  });

  const workOrder3 = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2024-001003' },
    update: {
      partId: compressorDisk.id,
      quantity: 5,
      priority: 'HIGH',
      status: 'COMPLETED',
      dueDate: new Date('2024-01-28'),
      customerOrder: 'CO-2024-003',
      routingId: diskRouting.id,
      createdById: adminUser.id,
      assignedToId: operator.id,
      startedAt: new Date('2024-01-15T08:00:00Z'),
      completedAt: new Date('2024-01-28T16:30:00Z')
    },
    create: {
      workOrderNumber: 'WO-2024-001003',
      partId: compressorDisk.id,
      quantity: 5,
      priority: 'HIGH',
      status: 'COMPLETED',
      dueDate: new Date('2024-01-28'),
      customerOrder: 'CO-2024-003',
      routingId: diskRouting.id,
      createdById: adminUser.id,
      assignedToId: operator.id,
      startedAt: new Date('2024-01-15T08:00:00Z'),
      completedAt: new Date('2024-01-28T16:30:00Z')
    }
  });

  // Create a CREATED status work order for release workflow testing
  const workOrder4 = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-2024-001004' },
    update: {
      partId: guideVane.id,
      quantity: 15,
      priority: 'NORMAL',
      status: 'CREATED',
      dueDate: new Date('2024-03-15'),
      customerOrder: 'CO-2024-004',
      routingId: vaneRouting.id,
      createdById: adminUser.id
    },
    create: {
      workOrderNumber: 'WO-2024-001004',
      partId: guideVane.id,
      quantity: 15,
      priority: 'NORMAL',
      status: 'CREATED',
      dueDate: new Date('2024-03-15'),
      customerOrder: 'CO-2024-004',
      routingId: vaneRouting.id,
      createdById: adminUser.id
    }
  });

  console.log('✅ Work orders created');

  // Create work order operations for ALL work orders

  // Fetch routing operations for all routings
  const bladeRoutingOps = await prisma.routingOperation.findMany({
    where: { routingId: bladeRouting.id },
    orderBy: { operationNumber: 'asc' }
  });

  const vaneRoutingOps = await prisma.routingOperation.findMany({
    where: { routingId: vaneRouting.id },
    orderBy: { operationNumber: 'asc' }
  });

  const diskRoutingOps = await prisma.routingOperation.findMany({
    where: { routingId: diskRouting.id },
    orderBy: { operationNumber: 'asc' }
  });

  // WO-2024-001001 (IN_PROGRESS) - 3 operations from blade routing
  if (bladeRoutingOps.length >= 3) {
    await prisma.workOrderOperation.upsert({
      where: { id: 'wo1-op1' },
      update: {
        routingOperationId: bladeRoutingOps[0].id,
        status: 'COMPLETED',
        quantity: workOrder1.quantity,
        quantityCompleted: 10,
        quantityScrap: 0
      },
      create: {
        id: 'wo1-op1',
        workOrderId: workOrder1.id,
        routingOperationId: bladeRoutingOps[0].id,
        status: 'COMPLETED',
        quantity: workOrder1.quantity,
        quantityCompleted: 10,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo1-op2' },
      update: {
        routingOperationId: bladeRoutingOps[1].id,
        status: 'IN_PROGRESS',
        quantity: workOrder1.quantity,
        quantityCompleted: 6,
        quantityScrap: 1
      },
      create: {
        id: 'wo1-op2',
        workOrderId: workOrder1.id,
        routingOperationId: bladeRoutingOps[1].id,
        status: 'IN_PROGRESS',
        quantity: workOrder1.quantity,
        quantityCompleted: 6,
        quantityScrap: 1
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo1-op3' },
      update: {
        routingOperationId: bladeRoutingOps[2].id,
        status: 'PENDING',
        quantity: workOrder1.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      },
      create: {
        id: 'wo1-op3',
        workOrderId: workOrder1.id,
        routingOperationId: bladeRoutingOps[2].id,
        status: 'PENDING',
        quantity: workOrder1.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      }
    });

    console.log('✅ Work order operations created for WO-2024-001001');
  }

  // WO-2024-001002 (RELEASED) - 3 operations from vane routing, all pending
  if (vaneRoutingOps.length >= 3) {
    await prisma.workOrderOperation.upsert({
      where: { id: 'wo2-op1' },
      update: {
        routingOperationId: vaneRoutingOps[0].id,
        status: 'PENDING',
        quantity: workOrder2.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      },
      create: {
        id: 'wo2-op1',
        workOrderId: workOrder2.id,
        routingOperationId: vaneRoutingOps[0].id,
        status: 'PENDING',
        quantity: workOrder2.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo2-op2' },
      update: {
        routingOperationId: vaneRoutingOps[1].id,
        status: 'PENDING',
        quantity: workOrder2.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      },
      create: {
        id: 'wo2-op2',
        workOrderId: workOrder2.id,
        routingOperationId: vaneRoutingOps[1].id,
        status: 'PENDING',
        quantity: workOrder2.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo2-op3' },
      update: {
        routingOperationId: vaneRoutingOps[2].id,
        status: 'PENDING',
        quantity: workOrder2.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      },
      create: {
        id: 'wo2-op3',
        workOrderId: workOrder2.id,
        routingOperationId: vaneRoutingOps[2].id,
        status: 'PENDING',
        quantity: workOrder2.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      }
    });

    console.log('✅ Work order operations created for WO-2024-001002');
  }

  // WO-2024-001003 (COMPLETED) - 4 operations from disk routing, all completed
  if (diskRoutingOps.length >= 4) {
    await prisma.workOrderOperation.upsert({
      where: { id: 'wo3-op1' },
      update: {
        routingOperationId: diskRoutingOps[0].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      },
      create: {
        id: 'wo3-op1',
        workOrderId: workOrder3.id,
        routingOperationId: diskRoutingOps[0].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo3-op2' },
      update: {
        routingOperationId: diskRoutingOps[1].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      },
      create: {
        id: 'wo3-op2',
        workOrderId: workOrder3.id,
        routingOperationId: diskRoutingOps[1].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo3-op3' },
      update: {
        routingOperationId: diskRoutingOps[2].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      },
      create: {
        id: 'wo3-op3',
        workOrderId: workOrder3.id,
        routingOperationId: diskRoutingOps[2].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo3-op4' },
      update: {
        routingOperationId: diskRoutingOps[3].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      },
      create: {
        id: 'wo3-op4',
        workOrderId: workOrder3.id,
        routingOperationId: diskRoutingOps[3].id,
        status: 'COMPLETED',
        quantity: workOrder3.quantity,
        quantityCompleted: 5,
        quantityScrap: 0
      }
    });

    console.log('✅ Work order operations created for WO-2024-001003');
  }

  // WO-2024-001004 (CREATED) - 3 operations from vane routing, all pending
  if (vaneRoutingOps.length >= 3) {
    await prisma.workOrderOperation.upsert({
      where: { id: 'wo4-op1' },
      update: {
        routingOperationId: vaneRoutingOps[0].id,
        status: 'PENDING',
        quantity: workOrder4.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      },
      create: {
        id: 'wo4-op1',
        workOrderId: workOrder4.id,
        routingOperationId: vaneRoutingOps[0].id,
        status: 'PENDING',
        quantity: workOrder4.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo4-op2' },
      update: {
        routingOperationId: vaneRoutingOps[1].id,
        status: 'PENDING',
        quantity: workOrder4.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      },
      create: {
        id: 'wo4-op2',
        workOrderId: workOrder4.id,
        routingOperationId: vaneRoutingOps[1].id,
        status: 'PENDING',
        quantity: workOrder4.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      }
    });

    await prisma.workOrderOperation.upsert({
      where: { id: 'wo4-op3' },
      update: {
        routingOperationId: vaneRoutingOps[2].id,
        status: 'PENDING',
        quantity: workOrder4.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      },
      create: {
        id: 'wo4-op3',
        workOrderId: workOrder4.id,
        routingOperationId: vaneRoutingOps[2].id,
        status: 'PENDING',
        quantity: workOrder4.quantity,
        quantityCompleted: 0,
        quantityScrap: 0
      }
    });

    console.log('✅ Work order operations created for WO-2024-001004');
  }

  console.log('✅ All work order operations created');

  // Create quality inspections using upsert
  const inspection1 = await prisma.qualityInspection.upsert({
    where: { inspectionNumber: 'QI-2024-001001' },
    update: {
      workOrderId: workOrder1.id,
      planId: bladeQualityPlan.id,
      inspectorId: qualityEngineer.id,
      status: 'COMPLETED',
      result: 'PASS',
      quantity: 6,
      startedAt: new Date('2024-01-25T14:00:00Z'),
      completedAt: new Date('2024-01-25T15:30:00Z'),
      notes: 'All characteristics within tolerance'
    },
    create: {
      inspectionNumber: 'QI-2024-001001',
      workOrderId: workOrder1.id,
      planId: bladeQualityPlan.id,
      inspectorId: qualityEngineer.id,
      status: 'COMPLETED',
      result: 'PASS',
      quantity: 6,
      startedAt: new Date('2024-01-25T14:00:00Z'),
      completedAt: new Date('2024-01-25T15:30:00Z'),
      notes: 'All characteristics within tolerance'
    }
  });

  console.log('✅ Quality inspections created');

  // Create NCR using upsert
  const ncr1 = await prisma.nCR.upsert({
    where: { ncrNumber: 'NCR-2024-001' },
    update: {
      workOrderId: workOrder1.id,
      inspectionId: inspection1.id,
      partNumber: turbineBlade.partNumber,
      operation: 'Finish Machining',
      defectType: 'Dimensional',
      description: 'Blade length exceeds maximum tolerance by 0.05mm on 3 parts',
      severity: 'MAJOR',
      status: 'OPEN',
      quantity: 3,
      createdById: qualityEngineer.id,
      assignedToId: adminUser.id,
      dueDate: new Date('2024-02-01')
    },
    create: {
      ncrNumber: 'NCR-2024-001',
      workOrderId: workOrder1.id,
      inspectionId: inspection1.id,
      partNumber: turbineBlade.partNumber,
      operation: 'Finish Machining',
      defectType: 'Dimensional',
      description: 'Blade length exceeds maximum tolerance by 0.05mm on 3 parts',
      severity: 'MAJOR',
      status: 'OPEN',
      quantity: 3,
      createdById: qualityEngineer.id,
      assignedToId: adminUser.id,
      dueDate: new Date('2024-02-01')
    }
  });

  console.log('✅ NCRs created');

  // Create equipment using upsert with ISA-95 fields
  const cncMachine = await prisma.equipment.upsert({
    where: { equipmentNumber: 'CNC-001' },
    update: {
      name: 'DMG MORI 5-Axis Machining Center',
      description: 'High precision 5-axis CNC machine',
      manufacturer: 'DMG MORI',
      model: 'DMU 50 3rd Generation',
      serialNumber: 'DMG-2023-001',
      equipmentClass: 'PRODUCTION',
      equipmentType: 'CNC_MILL',
      equipmentLevel: 1,
      siteId: mainSite.id,
      areaId: productionArea.id,
      workCenterId: machiningCenter.id,
      status: 'OPERATIONAL',
      currentState: 'RUNNING',
      installDate: new Date('2023-06-15'),
      commissionDate: new Date('2023-07-01'),
      ratedCapacity: 24.0, // 24 parts per day
      currentCapacity: 24.0,
      utilizationRate: 85.5,
      availability: 92.3,
      performance: 88.7,
      quality: 97.2,
      oee: 79.5 // OEE = 92.3 × 88.7 × 97.2 / 10000
    },
    create: {
      equipmentNumber: 'CNC-001',
      name: 'DMG MORI 5-Axis Machining Center',
      description: 'High precision 5-axis CNC machine',
      manufacturer: 'DMG MORI',
      model: 'DMU 50 3rd Generation',
      serialNumber: 'DMG-2023-001',
      equipmentClass: 'PRODUCTION',
      equipmentType: 'CNC_MILL',
      equipmentLevel: 1,
      siteId: mainSite.id,
      areaId: productionArea.id,
      workCenterId: machiningCenter.id,
      status: 'OPERATIONAL',
      currentState: 'RUNNING',
      installDate: new Date('2023-06-15'),
      commissionDate: new Date('2023-07-01'),
      ratedCapacity: 24.0,
      currentCapacity: 24.0,
      utilizationRate: 85.5,
      availability: 92.3,
      performance: 88.7,
      quality: 97.2,
      oee: 79.5
    }
  });

  // Create CMM quality inspection equipment
  const cmmMachine = await prisma.equipment.upsert({
    where: { equipmentNumber: 'CMM-001' },
    update: {
      name: 'Zeiss CONTURA G3 CMM',
      description: 'Coordinate Measuring Machine for precision inspection',
      manufacturer: 'Zeiss',
      model: 'CONTURA G3 10/16/6',
      serialNumber: 'ZEISS-2023-101',
      equipmentClass: 'QUALITY',
      equipmentType: 'CMM',
      equipmentLevel: 1,
      siteId: mainSite.id,
      areaId: productionArea.id,
      status: 'AVAILABLE',
      currentState: 'IDLE',
      installDate: new Date('2023-08-01'),
      commissionDate: new Date('2023-08-15'),
      ratedCapacity: 50.0, // 50 inspections per day
      currentCapacity: 50.0,
      utilizationRate: 65.0,
      availability: 95.0,
      performance: 85.0,
      quality: 99.5,
      oee: 80.3
    },
    create: {
      equipmentNumber: 'CMM-001',
      name: 'Zeiss CONTURA G3 CMM',
      description: 'Coordinate Measuring Machine for precision inspection',
      manufacturer: 'Zeiss',
      model: 'CONTURA G3 10/16/6',
      serialNumber: 'ZEISS-2023-101',
      equipmentClass: 'QUALITY',
      equipmentType: 'CMM',
      equipmentLevel: 1,
      siteId: mainSite.id,
      areaId: productionArea.id,
      status: 'AVAILABLE',
      currentState: 'IDLE',
      installDate: new Date('2023-08-01'),
      commissionDate: new Date('2023-08-15'),
      ratedCapacity: 50.0,
      currentCapacity: 50.0,
      utilizationRate: 65.0,
      availability: 95.0,
      performance: 85.0,
      quality: 99.5,
      oee: 80.3
    }
  });

  // Create equipment state history for CNC machine
  await prisma.equipmentStateHistory.create({
    data: {
      equipmentId: cncMachine.id,
      previousState: 'IDLE',
      newState: 'RUNNING',
      reason: 'Work order WO-2024-001001 started',
      changedBy: operator.id,
      stateStartTime: new Date('2024-01-20T09:00:00Z'),
      stateEndTime: null, // Currently running
      downtime: false,
      workOrderId: null // Will be linked after work orders are created
    }
  });

  // Create equipment performance log for CNC machine (last shift)
  await prisma.equipmentPerformanceLog.create({
    data: {
      equipmentId: cncMachine.id,
      periodStart: new Date('2024-01-25T06:00:00Z'),
      periodEnd: new Date('2024-01-25T14:00:00Z'),
      periodType: 'SHIFT',
      plannedProductionTime: 28800, // 8 hours in seconds
      operatingTime: 26640, // 7.4 hours (92.5% availability)
      downtime: 2160, // 36 minutes downtime
      availability: 92.5,
      idealCycleTime: 3600, // 1 hour per part
      actualCycleTime: 4050, // 1.125 hours per part (88.9% performance)
      totalUnitsProduced: 7,
      targetProduction: 8,
      performance: 88.9,
      goodUnits: 6,
      rejectedUnits: 1,
      scrapUnits: 0,
      reworkUnits: 0,
      quality: 97.1, // 6 good / 7 total
      oee: 79.9, // 92.5 × 88.9 × 97.1 / 10000
      notes: 'Normal production shift, 1 part rejected due to dimensional variance'
    }
  });

  console.log('✅ ISA-95 Equipment with OEE tracking created');

  // Create ISA-95 Personnel Hierarchy

  // 1. Personnel Classifications (hierarchical)
  const managerClass = await prisma.personnelClass.upsert({
    where: { classCode: 'MGR' },
    update: {
      className: 'Manager',
      description: 'Production and operations management',
      level: 1,
      parentClassId: null
    },
    create: {
      classCode: 'MGR',
      className: 'Manager',
      description: 'Production and operations management',
      level: 1,
      parentClassId: null
    }
  });

  const supervisorClass = await prisma.personnelClass.upsert({
    where: { classCode: 'SUPV' },
    update: {
      className: 'Supervisor',
      description: 'Line supervision and team leadership',
      level: 2,
      parentClassId: managerClass.id
    },
    create: {
      classCode: 'SUPV',
      className: 'Supervisor',
      description: 'Line supervision and team leadership',
      level: 2,
      parentClassId: managerClass.id
    }
  });

  const engineerClass = await prisma.personnelClass.upsert({
    where: { classCode: 'ENG' },
    update: {
      className: 'Engineer',
      description: 'Engineering and technical specialists',
      level: 3,
      parentClassId: null
    },
    create: {
      classCode: 'ENG',
      className: 'Engineer',
      description: 'Engineering and technical specialists',
      level: 3,
      parentClassId: null
    }
  });

  const technicianClass = await prisma.personnelClass.upsert({
    where: { classCode: 'TECH' },
    update: {
      className: 'Technician',
      description: 'Skilled technical personnel',
      level: 4,
      parentClassId: supervisorClass.id
    },
    create: {
      classCode: 'TECH',
      className: 'Technician',
      description: 'Skilled technical personnel',
      level: 4,
      parentClassId: supervisorClass.id
    }
  });

  const operatorClass = await prisma.personnelClass.upsert({
    where: { classCode: 'OPR' },
    update: {
      className: 'Operator',
      description: 'Production operators and assemblers',
      level: 5,
      parentClassId: technicianClass.id
    },
    create: {
      classCode: 'OPR',
      className: 'Operator',
      description: 'Production operators and assemblers',
      level: 5,
      parentClassId: technicianClass.id
    }
  });

  console.log('✅ Personnel classifications created');

  // 2. Qualification Definitions
  const cncOperatorQual = await prisma.personnelQualification.upsert({
    where: { qualificationCode: 'QUAL-CNC-OPR' },
    update: {
      qualificationName: 'CNC Machine Operator',
      description: 'Certified to operate CNC machining centers',
      qualificationType: 'CERTIFICATION',
      issuingOrganization: 'NIMS - National Institute for Metalworking Skills',
      validityPeriodMonths: 36,
      requiresRenewal: true,
      personnelClassId: operatorClass.id
    },
    create: {
      qualificationCode: 'QUAL-CNC-OPR',
      qualificationName: 'CNC Machine Operator',
      description: 'Certified to operate CNC machining centers',
      qualificationType: 'CERTIFICATION',
      issuingOrganization: 'NIMS - National Institute for Metalworking Skills',
      validityPeriodMonths: 36,
      requiresRenewal: true,
      personnelClassId: operatorClass.id
    }
  });

  const cmmInspectorQual = await prisma.personnelQualification.upsert({
    where: { qualificationCode: 'QUAL-CMM-INSP' },
    update: {
      qualificationName: 'CMM Inspector',
      description: 'Certified CMM operator and dimensional inspector',
      qualificationType: 'CERTIFICATION',
      issuingOrganization: 'ASQ - American Society for Quality',
      validityPeriodMonths: 24,
      requiresRenewal: true,
      personnelClassId: technicianClass.id
    },
    create: {
      qualificationCode: 'QUAL-CMM-INSP',
      qualificationName: 'CMM Inspector',
      description: 'Certified CMM operator and dimensional inspector',
      qualificationType: 'CERTIFICATION',
      issuingOrganization: 'ASQ - American Society for Quality',
      validityPeriodMonths: 24,
      requiresRenewal: true,
      personnelClassId: technicianClass.id
    }
  });

  const safetyCertQual = await prisma.personnelQualification.upsert({
    where: { qualificationCode: 'QUAL-SAFETY-001' },
    update: {
      qualificationName: 'Manufacturing Safety Certification',
      description: 'Annual safety training and certification',
      qualificationType: 'TRAINING',
      issuingOrganization: 'OSHA',
      validityPeriodMonths: 12,
      requiresRenewal: true,
      personnelClassId: null // Required for all personnel
    },
    create: {
      qualificationCode: 'QUAL-SAFETY-001',
      qualificationName: 'Manufacturing Safety Certification',
      description: 'Annual safety training and certification',
      qualificationType: 'TRAINING',
      issuingOrganization: 'OSHA',
      validityPeriodMonths: 12,
      requiresRenewal: true,
      personnelClassId: null // Required for all personnel
    }
  });

  const as9100AuditorQual = await prisma.personnelQualification.upsert({
    where: { qualificationCode: 'QUAL-AS9100-AUDIT' },
    update: {
      qualificationName: 'AS9100 Internal Auditor',
      description: 'Qualified to conduct AS9100 internal audits',
      qualificationType: 'CERTIFICATION',
      issuingOrganization: 'SAE International',
      validityPeriodMonths: 36,
      requiresRenewal: true,
      personnelClassId: engineerClass.id
    },
    create: {
      qualificationCode: 'QUAL-AS9100-AUDIT',
      qualificationName: 'AS9100 Internal Auditor',
      description: 'Qualified to conduct AS9100 internal audits',
      qualificationType: 'CERTIFICATION',
      issuingOrganization: 'SAE International',
      validityPeriodMonths: 36,
      requiresRenewal: true,
      personnelClassId: engineerClass.id
    }
  });

  console.log('✅ Personnel qualifications created');

  // 3. Update Users with ISA-95 Personnel Fields
  await prisma.user.update({
    where: { id: adminUser.id },
    data: {
      employeeNumber: 'EMP-001',
      personnelClassId: managerClass.id,
      hireDate: new Date('2020-01-15'),
      phone: '+1-555-0101',
      emergencyContact: 'Emergency Contact 1',
      emergencyPhone: '+1-555-0102',
      department: 'Operations Management',
      supervisorId: null, // Top of hierarchy
      costCenter: 'CC-100',
      laborRate: 85.00
    }
  });

  await prisma.user.update({
    where: { id: qualityEngineer.id },
    data: {
      employeeNumber: 'EMP-002',
      personnelClassId: engineerClass.id,
      hireDate: new Date('2021-03-10'),
      phone: '+1-555-0201',
      emergencyContact: 'Emergency Contact 2',
      emergencyPhone: '+1-555-0202',
      department: 'Quality Assurance',
      supervisorId: adminUser.id,
      costCenter: 'CC-200',
      laborRate: 65.00
    }
  });

  await prisma.user.update({
    where: { id: operator.id },
    data: {
      employeeNumber: 'EMP-003',
      personnelClassId: operatorClass.id,
      hireDate: new Date('2022-06-01'),
      phone: '+1-555-0301',
      emergencyContact: 'Emergency Contact 3',
      emergencyPhone: '+1-555-0302',
      department: 'Production',
      supervisorId: adminUser.id,
      costCenter: 'CC-300',
      laborRate: 45.00
    }
  });

  console.log('✅ Users updated with ISA-95 personnel fields');

  // 4. Create Personnel Certifications
  const today = new Date();
  const oneYearFromNow = new Date();
  oneYearFromNow.setFullYear(today.getFullYear() + 1);
  const twoYearsFromNow = new Date();
  twoYearsFromNow.setFullYear(today.getFullYear() + 2);
  const threeYearsFromNow = new Date();
  threeYearsFromNow.setFullYear(today.getFullYear() + 3);

  await prisma.personnelCertification.upsert({
    where: {
      personnelId_qualificationId: {
        personnelId: operator.id,
        qualificationId: cncOperatorQual.id
      }
    },
    update: {
      certificationNumber: 'NIMS-CNC-2023-1234',
      issuedDate: new Date('2023-01-15'),
      expirationDate: threeYearsFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2023-01-15'),
      notes: 'Level II CNC Machine Operator certification'
    },
    create: {
      personnelId: operator.id,
      qualificationId: cncOperatorQual.id,
      certificationNumber: 'NIMS-CNC-2023-1234',
      issuedDate: new Date('2023-01-15'),
      expirationDate: threeYearsFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2023-01-15'),
      notes: 'Level II CNC Machine Operator certification'
    }
  });

  await prisma.personnelCertification.upsert({
    where: {
      personnelId_qualificationId: {
        personnelId: qualityEngineer.id,
        qualificationId: cmmInspectorQual.id
      }
    },
    update: {
      certificationNumber: 'ASQ-CMM-2023-5678',
      issuedDate: new Date('2023-06-01'),
      expirationDate: twoYearsFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2023-06-01'),
      notes: 'Certified CMM Programmer and Inspector'
    },
    create: {
      personnelId: qualityEngineer.id,
      qualificationId: cmmInspectorQual.id,
      certificationNumber: 'ASQ-CMM-2023-5678',
      issuedDate: new Date('2023-06-01'),
      expirationDate: twoYearsFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2023-06-01'),
      notes: 'Certified CMM Programmer and Inspector'
    }
  });

  // Safety certification for all personnel
  await prisma.personnelCertification.upsert({
    where: {
      personnelId_qualificationId: {
        personnelId: adminUser.id,
        qualificationId: safetyCertQual.id
      }
    },
    update: {
      certificationNumber: 'SAFETY-2024-001',
      issuedDate: new Date('2024-01-10'),
      expirationDate: oneYearFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2024-01-10'),
      notes: 'Annual safety training completed'
    },
    create: {
      personnelId: adminUser.id,
      qualificationId: safetyCertQual.id,
      certificationNumber: 'SAFETY-2024-001',
      issuedDate: new Date('2024-01-10'),
      expirationDate: oneYearFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2024-01-10'),
      notes: 'Annual safety training completed'
    }
  });

  await prisma.personnelCertification.upsert({
    where: {
      personnelId_qualificationId: {
        personnelId: qualityEngineer.id,
        qualificationId: safetyCertQual.id
      }
    },
    update: {
      certificationNumber: 'SAFETY-2024-002',
      issuedDate: new Date('2024-01-10'),
      expirationDate: oneYearFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2024-01-10'),
      notes: 'Annual safety training completed'
    },
    create: {
      personnelId: qualityEngineer.id,
      qualificationId: safetyCertQual.id,
      certificationNumber: 'SAFETY-2024-002',
      issuedDate: new Date('2024-01-10'),
      expirationDate: oneYearFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2024-01-10'),
      notes: 'Annual safety training completed'
    }
  });

  await prisma.personnelCertification.upsert({
    where: {
      personnelId_qualificationId: {
        personnelId: operator.id,
        qualificationId: safetyCertQual.id
      }
    },
    update: {
      certificationNumber: 'SAFETY-2024-003',
      issuedDate: new Date('2024-01-10'),
      expirationDate: oneYearFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2024-01-10'),
      notes: 'Annual safety training completed'
    },
    create: {
      personnelId: operator.id,
      qualificationId: safetyCertQual.id,
      certificationNumber: 'SAFETY-2024-003',
      issuedDate: new Date('2024-01-10'),
      expirationDate: oneYearFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2024-01-10'),
      notes: 'Annual safety training completed'
    }
  });

  await prisma.personnelCertification.upsert({
    where: {
      personnelId_qualificationId: {
        personnelId: qualityEngineer.id,
        qualificationId: as9100AuditorQual.id
      }
    },
    update: {
      certificationNumber: 'AS9100-AUDIT-2023-9876',
      issuedDate: new Date('2023-09-15'),
      expirationDate: threeYearsFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2023-09-15'),
      notes: 'Certified AS9100 Rev D Internal Auditor'
    },
    create: {
      personnelId: qualityEngineer.id,
      qualificationId: as9100AuditorQual.id,
      certificationNumber: 'AS9100-AUDIT-2023-9876',
      issuedDate: new Date('2023-09-15'),
      expirationDate: threeYearsFromNow,
      status: 'ACTIVE',
      verifiedBy: adminUser.id,
      verifiedAt: new Date('2023-09-15'),
      notes: 'Certified AS9100 Rev D Internal Auditor'
    }
  });

  console.log('✅ Personnel certifications created');

  // 5. Create Personnel Skills
  const cncProgrammingSkill = await prisma.personnelSkill.upsert({
    where: { skillCode: 'SKILL-CNC-PROG' },
    update: {
      skillName: 'CNC Programming',
      description: 'G-code and CAM programming for CNC machines',
      skillCategory: 'MACHINING'
    },
    create: {
      skillCode: 'SKILL-CNC-PROG',
      skillName: 'CNC Programming',
      description: 'G-code and CAM programming for CNC machines',
      skillCategory: 'MACHINING'
    }
  });

  const cmmOperationSkill = await prisma.personnelSkill.upsert({
    where: { skillCode: 'SKILL-CMM-OPR' },
    update: {
      skillName: 'CMM Operation',
      description: 'Coordinate Measuring Machine operation and programming',
      skillCategory: 'INSPECTION'
    },
    create: {
      skillCode: 'SKILL-CMM-OPR',
      skillName: 'CMM Operation',
      description: 'Coordinate Measuring Machine operation and programming',
      skillCategory: 'INSPECTION'
    }
  });

  const qualityControlSkill = await prisma.personnelSkill.upsert({
    where: { skillCode: 'SKILL-QC' },
    update: {
      skillName: 'Quality Control',
      description: 'Quality inspection and control procedures',
      skillCategory: 'QUALITY'
    },
    create: {
      skillCode: 'SKILL-QC',
      skillName: 'Quality Control',
      description: 'Quality inspection and control procedures',
      skillCategory: 'QUALITY'
    }
  });

  const blueprintReadingSkill = await prisma.personnelSkill.upsert({
    where: { skillCode: 'SKILL-BLUEPRINT' },
    update: {
      skillName: 'Blueprint Reading',
      description: 'Technical drawing and GD&T interpretation',
      skillCategory: 'MACHINING'
    },
    create: {
      skillCode: 'SKILL-BLUEPRINT',
      skillName: 'Blueprint Reading',
      description: 'Technical drawing and GD&T interpretation',
      skillCategory: 'MACHINING'
    }
  });

  const assemblySkill = await prisma.personnelSkill.upsert({
    where: { skillCode: 'SKILL-ASSEMBLY' },
    update: {
      skillName: 'Precision Assembly',
      description: 'Mechanical assembly of precision components',
      skillCategory: 'ASSEMBLY'
    },
    create: {
      skillCode: 'SKILL-ASSEMBLY',
      skillName: 'Precision Assembly',
      description: 'Mechanical assembly of precision components',
      skillCategory: 'ASSEMBLY'
    }
  });

  console.log('✅ Personnel skills created');

  // 6. Create Personnel Skill Assignments (Competency Matrix)
  await prisma.personnelSkillAssignment.upsert({
    where: {
      personnelId_skillId: {
        personnelId: operator.id,
        skillId: cncProgrammingSkill.id
      }
    },
    update: {
      competencyLevel: 'COMPETENT', // Level 3
      assessedBy: adminUser.id,
      assessedAt: new Date('2024-01-05'),
      lastUsedDate: new Date('2024-01-20'),
      certifiedDate: new Date('2023-06-15'),
      notes: 'Proficient in Mastercam and Fusion 360'
    },
    create: {
      personnelId: operator.id,
      skillId: cncProgrammingSkill.id,
      competencyLevel: 'COMPETENT', // Level 3
      assessedBy: adminUser.id,
      assessedAt: new Date('2024-01-05'),
      lastUsedDate: new Date('2024-01-20'),
      certifiedDate: new Date('2023-06-15'),
      notes: 'Proficient in Mastercam and Fusion 360'
    }
  });

  await prisma.personnelSkillAssignment.upsert({
    where: {
      personnelId_skillId: {
        personnelId: operator.id,
        skillId: blueprintReadingSkill.id
      }
    },
    update: {
      competencyLevel: 'PROFICIENT', // Level 4
      assessedBy: qualityEngineer.id,
      assessedAt: new Date('2023-12-10'),
      lastUsedDate: new Date('2024-01-20'),
      certifiedDate: new Date('2022-08-01'),
      notes: 'Expert in GD&T interpretation'
    },
    create: {
      personnelId: operator.id,
      skillId: blueprintReadingSkill.id,
      competencyLevel: 'PROFICIENT', // Level 4
      assessedBy: qualityEngineer.id,
      assessedAt: new Date('2023-12-10'),
      lastUsedDate: new Date('2024-01-20'),
      certifiedDate: new Date('2022-08-01'),
      notes: 'Expert in GD&T interpretation'
    }
  });

  await prisma.personnelSkillAssignment.upsert({
    where: {
      personnelId_skillId: {
        personnelId: qualityEngineer.id,
        skillId: cmmOperationSkill.id
      }
    },
    update: {
      competencyLevel: 'EXPERT', // Level 5
      assessedBy: adminUser.id,
      assessedAt: new Date('2023-11-15'),
      lastUsedDate: new Date('2024-01-25'),
      certifiedDate: new Date('2021-05-01'),
      notes: 'Certified Zeiss CMM programmer and trainer'
    },
    create: {
      personnelId: qualityEngineer.id,
      skillId: cmmOperationSkill.id,
      competencyLevel: 'EXPERT', // Level 5
      assessedBy: adminUser.id,
      assessedAt: new Date('2023-11-15'),
      lastUsedDate: new Date('2024-01-25'),
      certifiedDate: new Date('2021-05-01'),
      notes: 'Certified Zeiss CMM programmer and trainer'
    }
  });

  await prisma.personnelSkillAssignment.upsert({
    where: {
      personnelId_skillId: {
        personnelId: qualityEngineer.id,
        skillId: qualityControlSkill.id
      }
    },
    update: {
      competencyLevel: 'EXPERT', // Level 5
      assessedBy: adminUser.id,
      assessedAt: new Date('2023-10-01'),
      lastUsedDate: new Date('2024-01-25'),
      certifiedDate: new Date('2021-03-15'),
      notes: 'AS9100 lead auditor and quality systems expert'
    },
    create: {
      personnelId: qualityEngineer.id,
      skillId: qualityControlSkill.id,
      competencyLevel: 'EXPERT', // Level 5
      assessedBy: adminUser.id,
      assessedAt: new Date('2023-10-01'),
      lastUsedDate: new Date('2024-01-25'),
      certifiedDate: new Date('2021-03-15'),
      notes: 'AS9100 lead auditor and quality systems expert'
    }
  });

  await prisma.personnelSkillAssignment.upsert({
    where: {
      personnelId_skillId: {
        personnelId: operator.id,
        skillId: assemblySkill.id
      }
    },
    update: {
      competencyLevel: 'ADVANCED_BEGINNER', // Level 2
      assessedBy: adminUser.id,
      assessedAt: new Date('2023-09-01'),
      lastUsedDate: new Date('2024-01-15'),
      certifiedDate: null,
      notes: 'Still developing assembly skills, requires occasional guidance'
    },
    create: {
      personnelId: operator.id,
      skillId: assemblySkill.id,
      competencyLevel: 'ADVANCED_BEGINNER', // Level 2
      assessedBy: adminUser.id,
      assessedAt: new Date('2023-09-01'),
      lastUsedDate: new Date('2024-01-15'),
      certifiedDate: null,
      notes: 'Still developing assembly skills, requires occasional guidance'
    }
  });

  console.log('✅ Personnel skill assignments (competency matrix) created');

  // 7. Create Personnel Work Center Assignments
  await prisma.personnelWorkCenterAssignment.upsert({
    where: {
      personnelId_workCenterId: {
        personnelId: operator.id,
        workCenterId: machiningCenter.id
      }
    },
    update: {
      isPrimary: true,
      effectiveDate: new Date('2022-06-15'),
      certifiedDate: new Date('2022-08-01'),
      notes: 'Primary CNC operator for Cell 1'
    },
    create: {
      personnelId: operator.id,
      workCenterId: machiningCenter.id,
      isPrimary: true,
      effectiveDate: new Date('2022-06-15'),
      certifiedDate: new Date('2022-08-01'),
      notes: 'Primary CNC operator for Cell 1'
    }
  });

  await prisma.personnelWorkCenterAssignment.upsert({
    where: {
      personnelId_workCenterId: {
        personnelId: operator.id,
        workCenterId: assemblyArea.id
      }
    },
    update: {
      isPrimary: false,
      effectiveDate: new Date('2023-03-01'),
      certifiedDate: new Date('2023-05-15'),
      notes: 'Backup assembler for Station A'
    },
    create: {
      personnelId: operator.id,
      workCenterId: assemblyArea.id,
      isPrimary: false,
      effectiveDate: new Date('2023-03-01'),
      certifiedDate: new Date('2023-05-15'),
      notes: 'Backup assembler for Station A'
    }
  });

  console.log('✅ Personnel work center assignments created');

  // 8. Create Personnel Availability (Shift Schedules)
  const shiftStart = new Date();
  shiftStart.setHours(6, 0, 0, 0); // 6 AM today
  const shiftEnd = new Date();
  shiftEnd.setHours(14, 0, 0, 0); // 2 PM today

  await prisma.personnelAvailability.create({
    data: {
      personnelId: operator.id,
      availabilityType: 'AVAILABLE',
      startDateTime: shiftStart,
      endDateTime: shiftEnd,
      shiftCode: 'SHIFT_A',
      isRecurring: true,
      recurrenceRule: 'FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR', // Monday-Friday
      notes: 'Day shift (6 AM - 2 PM)'
    }
  });

  const nextWeekVacationStart = new Date();
  nextWeekVacationStart.setDate(nextWeekVacationStart.getDate() + 7);
  nextWeekVacationStart.setHours(0, 0, 0, 0);
  const nextWeekVacationEnd = new Date(nextWeekVacationStart);
  nextWeekVacationEnd.setDate(nextWeekVacationEnd.getDate() + 5);
  nextWeekVacationEnd.setHours(23, 59, 59, 999);

  await prisma.personnelAvailability.create({
    data: {
      personnelId: qualityEngineer.id,
      availabilityType: 'VACATION',
      startDateTime: nextWeekVacationStart,
      endDateTime: nextWeekVacationEnd,
      shiftCode: null,
      isRecurring: false,
      reason: 'Annual vacation',
      approvedBy: adminUser.id,
      approvedAt: new Date(),
      notes: 'Approved vacation - 5 days'
    }
  });

  console.log('✅ Personnel availability (shift schedules) created');
  console.log('✅ ISA-95 Personnel Hierarchy complete');

  // =======================
  // ISA-95 Material Hierarchy (Task 1.3)
  // =======================

  // 1. Create Material Classes (hierarchical)
  const rawMaterialClass = await prisma.materialClass.upsert({
    where: { classCode: 'RAW' },
    update: {
      className: 'Raw Material',
      description: 'Raw materials for manufacturing (metals, plastics, chemicals)',
      level: 1,
      parentClassId: null,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      requiresExpirationDate: false,
      shelfLifeDays: null,
      storageRequirements: 'Climate controlled warehouse',
      handlingInstructions: 'Follow MSDS safety guidelines'
    },
    create: {
      classCode: 'RAW',
      className: 'Raw Material',
      description: 'Raw materials for manufacturing (metals, plastics, chemicals)',
      level: 1,
      parentClassId: null,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      requiresExpirationDate: false,
      shelfLifeDays: null,
      storageRequirements: 'Climate controlled warehouse',
      handlingInstructions: 'Follow MSDS safety guidelines'
    }
  });

  const metalClass = await prisma.materialClass.upsert({
    where: { classCode: 'METAL' },
    update: {
      className: 'Metal Alloys',
      description: 'Ferrous and non-ferrous metal alloys',
      level: 2,
      parentClassId: rawMaterialClass.id,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      requiresExpirationDate: false,
      shelfLifeDays: null,
      storageRequirements: 'Dry storage, corrosion prevention',
      handlingInstructions: 'Use appropriate lifting equipment, prevent contamination'
    },
    create: {
      classCode: 'METAL',
      className: 'Metal Alloys',
      description: 'Ferrous and non-ferrous metal alloys',
      level: 2,
      parentClassId: rawMaterialClass.id,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      requiresExpirationDate: false,
      shelfLifeDays: null,
      storageRequirements: 'Dry storage, corrosion prevention',
      handlingInstructions: 'Use appropriate lifting equipment, prevent contamination'
    }
  });

  const wipClass = await prisma.materialClass.upsert({
    where: { classCode: 'WIP' },
    update: {
      className: 'Work In Progress',
      description: 'Partially manufactured materials and assemblies',
      level: 1,
      parentClassId: null,
      requiresLotTracking: true,
      requiresSerialTracking: true,
      requiresExpirationDate: false,
      shelfLifeDays: null,
      storageRequirements: 'Secure WIP storage area',
      handlingInstructions: 'Handle with care, maintain cleanliness'
    },
    create: {
      classCode: 'WIP',
      className: 'Work In Progress',
      description: 'Partially manufactured materials and assemblies',
      level: 1,
      parentClassId: null,
      requiresLotTracking: true,
      requiresSerialTracking: true,
      requiresExpirationDate: false,
      shelfLifeDays: null,
      storageRequirements: 'Secure WIP storage area',
      handlingInstructions: 'Handle with care, maintain cleanliness'
    }
  });

  const consumableClass = await prisma.materialClass.upsert({
    where: { classCode: 'CONS' },
    update: {
      className: 'Consumable',
      description: 'Consumable materials (cutting fluids, tools, PPE)',
      level: 1,
      parentClassId: null,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      requiresExpirationDate: true,
      shelfLifeDays: 365,
      storageRequirements: 'Follow MSDS storage requirements',
      handlingInstructions: 'Use PPE when handling chemicals'
    },
    create: {
      classCode: 'CONS',
      className: 'Consumable',
      description: 'Consumable materials (cutting fluids, tools, PPE)',
      level: 1,
      parentClassId: null,
      requiresLotTracking: true,
      requiresSerialTracking: false,
      requiresExpirationDate: true,
      shelfLifeDays: 365,
      storageRequirements: 'Follow MSDS storage requirements',
      handlingInstructions: 'Use PPE when handling chemicals'
    }
  });

  console.log('✅ Material classes created');

  // 2. Create Material Definitions
  const aluminumAlloy = await prisma.materialDefinition.upsert({
    where: { materialNumber: 'AL-6061-T6-BAR' },
    update: {
      materialName: 'Aluminum 6061-T6 Bar Stock',
      description: 'Aluminum alloy 6061-T6 bar stock for machining',
      materialClassId: metalClass.id,
      baseUnitOfMeasure: 'LB',
      alternateUnitOfMeasure: 'KG',
      conversionFactor: 0.453592,
      materialType: 'RAW_MATERIAL',
      materialGrade: '6061-T6',
      specification: 'ASTM B221',
      minimumStock: 500.0,
      reorderPoint: 1000.0,
      reorderQuantity: 2000.0,
      leadTimeDays: 30,
      requiresLotTracking: true,
      lotNumberFormat: 'AL-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: null,
      standardCost: 3.50,
      currency: 'USD',
      requiresInspection: true,
      inspectionFrequency: 'LOT',
      primarySupplierId: 'SUPP-001',
      supplierPartNumber: 'AL6061T6-125-12FT',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    },
    create: {
      materialNumber: 'AL-6061-T6-BAR',
      materialName: 'Aluminum 6061-T6 Bar Stock',
      description: 'Aluminum alloy 6061-T6 bar stock for machining',
      materialClassId: metalClass.id,
      baseUnitOfMeasure: 'LB',
      alternateUnitOfMeasure: 'KG',
      conversionFactor: 0.453592,
      materialType: 'RAW_MATERIAL',
      materialGrade: '6061-T6',
      specification: 'ASTM B221',
      minimumStock: 500.0,
      reorderPoint: 1000.0,
      reorderQuantity: 2000.0,
      leadTimeDays: 30,
      requiresLotTracking: true,
      lotNumberFormat: 'AL-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: null,
      standardCost: 3.50,
      currency: 'USD',
      requiresInspection: true,
      inspectionFrequency: 'LOT',
      primarySupplierId: 'SUPP-001',
      supplierPartNumber: 'AL6061T6-125-12FT',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    }
  });

  const titaniumAlloy = await prisma.materialDefinition.upsert({
    where: { materialNumber: 'TI-6AL4V-BAR' },
    update: {
      materialName: 'Titanium Ti-6Al-4V Bar Stock',
      description: 'Titanium Grade 5 (Ti-6Al-4V) bar stock for aerospace applications',
      materialClassId: metalClass.id,
      baseUnitOfMeasure: 'LB',
      alternateUnitOfMeasure: 'KG',
      conversionFactor: 0.453592,
      materialType: 'RAW_MATERIAL',
      materialGrade: 'Ti-6Al-4V',
      specification: 'AMS 4928',
      minimumStock: 200.0,
      reorderPoint: 400.0,
      reorderQuantity: 800.0,
      leadTimeDays: 60,
      requiresLotTracking: true,
      lotNumberFormat: 'TI-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: null,
      standardCost: 35.00,
      currency: 'USD',
      requiresInspection: true,
      inspectionFrequency: '100%',
      primarySupplierId: 'SUPP-002',
      supplierPartNumber: 'TI6AL4V-150-12FT',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    },
    create: {
      materialNumber: 'TI-6AL4V-BAR',
      materialName: 'Titanium Ti-6Al-4V Bar Stock',
      description: 'Titanium Grade 5 (Ti-6Al-4V) bar stock for aerospace applications',
      materialClassId: metalClass.id,
      baseUnitOfMeasure: 'LB',
      alternateUnitOfMeasure: 'KG',
      conversionFactor: 0.453592,
      materialType: 'RAW_MATERIAL',
      materialGrade: 'Ti-6Al-4V',
      specification: 'AMS 4928',
      minimumStock: 200.0,
      reorderPoint: 400.0,
      reorderQuantity: 800.0,
      leadTimeDays: 60,
      requiresLotTracking: true,
      lotNumberFormat: 'TI-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: null,
      standardCost: 35.00,
      currency: 'USD',
      requiresInspection: true,
      inspectionFrequency: '100%',
      primarySupplierId: 'SUPP-002',
      supplierPartNumber: 'TI6AL4V-150-12FT',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    }
  });

  const stainlessSteel = await prisma.materialDefinition.upsert({
    where: { materialNumber: 'SS-304-SHEET' },
    update: {
      materialName: 'Stainless Steel 304 Sheet',
      description: '304 stainless steel sheet for fabrication',
      materialClassId: metalClass.id,
      baseUnitOfMeasure: 'SHEET',
      alternateUnitOfMeasure: 'LB',
      conversionFactor: 25.0,
      materialType: 'RAW_MATERIAL',
      materialGrade: '304',
      specification: 'ASTM A240',
      minimumStock: 50.0,
      reorderPoint: 100.0,
      reorderQuantity: 200.0,
      leadTimeDays: 20,
      requiresLotTracking: true,
      lotNumberFormat: 'SS-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: null,
      standardCost: 150.00,
      currency: 'USD',
      requiresInspection: true,
      inspectionFrequency: 'SAMPLE',
      primarySupplierId: 'SUPP-003',
      supplierPartNumber: 'SS304-4X8-062',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    },
    create: {
      materialNumber: 'SS-304-SHEET',
      materialName: 'Stainless Steel 304 Sheet',
      description: '304 stainless steel sheet for fabrication',
      materialClassId: metalClass.id,
      baseUnitOfMeasure: 'SHEET',
      alternateUnitOfMeasure: 'LB',
      conversionFactor: 25.0,
      materialType: 'RAW_MATERIAL',
      materialGrade: '304',
      specification: 'ASTM A240',
      minimumStock: 50.0,
      reorderPoint: 100.0,
      reorderQuantity: 200.0,
      leadTimeDays: 20,
      requiresLotTracking: true,
      lotNumberFormat: 'SS-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: null,
      standardCost: 150.00,
      currency: 'USD',
      requiresInspection: true,
      inspectionFrequency: 'SAMPLE',
      primarySupplierId: 'SUPP-003',
      supplierPartNumber: 'SS304-4X8-062',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    }
  });

  const cuttingFluid = await prisma.materialDefinition.upsert({
    where: { materialNumber: 'FLUID-COOLANT-001' },
    update: {
      materialName: 'Synthetic Cutting Fluid',
      description: 'Water-soluble synthetic cutting fluid for CNC machining',
      materialClassId: consumableClass.id,
      baseUnitOfMeasure: 'GAL',
      alternateUnitOfMeasure: 'L',
      conversionFactor: 3.78541,
      materialType: 'CONSUMABLE',
      materialGrade: null,
      specification: null,
      minimumStock: 100.0,
      reorderPoint: 200.0,
      reorderQuantity: 500.0,
      leadTimeDays: 7,
      requiresLotTracking: true,
      lotNumberFormat: 'FL-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: 365,
      standardCost: 45.00,
      currency: 'USD',
      requiresInspection: false,
      inspectionFrequency: null,
      primarySupplierId: 'SUPP-004',
      supplierPartNumber: 'COOLANT-SYN-5GAL',
      msdsUrl: 'https://example.com/msds/coolant-001.pdf',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    },
    create: {
      materialNumber: 'FLUID-COOLANT-001',
      materialName: 'Synthetic Cutting Fluid',
      description: 'Water-soluble synthetic cutting fluid for CNC machining',
      materialClassId: consumableClass.id,
      baseUnitOfMeasure: 'GAL',
      alternateUnitOfMeasure: 'L',
      conversionFactor: 3.78541,
      materialType: 'CONSUMABLE',
      materialGrade: null,
      specification: null,
      minimumStock: 100.0,
      reorderPoint: 200.0,
      reorderQuantity: 500.0,
      leadTimeDays: 7,
      requiresLotTracking: true,
      lotNumberFormat: 'FL-{YYYYMMDD}-{###}',
      defaultShelfLifeDays: 365,
      standardCost: 45.00,
      currency: 'USD',
      requiresInspection: false,
      inspectionFrequency: null,
      primarySupplierId: 'SUPP-004',
      supplierPartNumber: 'COOLANT-SYN-5GAL',
      msdsUrl: 'https://example.com/msds/coolant-001.pdf',
      drawingNumber: null,
      revision: null,
      isActive: true,
      isPhantom: false,
      isObsolete: false
    }
  });

  console.log('✅ Material definitions created');

  // 3. Create Material Properties
  await prisma.materialProperty.upsert({
    where: {
      materialId_propertyName: {
        materialId: aluminumAlloy.id,
        propertyName: 'Density'
      }
    },
    update: {
      propertyType: 'PHYSICAL',
      propertyValue: '2.70 g/cm³',
      propertyUnit: 'g/cm³',
      testMethod: 'ASTM B311',
      nominalValue: 2.70,
      minValue: 2.68,
      maxValue: 2.72,
      isRequired: true,
      isCritical: false,
      notes: 'Density at room temperature'
    },
    create: {
      materialId: aluminumAlloy.id,
      propertyName: 'Density',
      propertyType: 'PHYSICAL',
      propertyValue: '2.70 g/cm³',
      propertyUnit: 'g/cm³',
      testMethod: 'ASTM B311',
      nominalValue: 2.70,
      minValue: 2.68,
      maxValue: 2.72,
      isRequired: true,
      isCritical: false,
      notes: 'Density at room temperature'
    }
  });

  await prisma.materialProperty.upsert({
    where: {
      materialId_propertyName: {
        materialId: aluminumAlloy.id,
        propertyName: 'Tensile Strength'
      }
    },
    update: {
      propertyType: 'MECHANICAL',
      propertyValue: '45 ksi (310 MPa)',
      propertyUnit: 'ksi',
      testMethod: 'ASTM E8',
      nominalValue: 45.0,
      minValue: 42.0,
      maxValue: 48.0,
      isRequired: true,
      isCritical: true,
      notes: 'Ultimate tensile strength for T6 temper'
    },
    create: {
      materialId: aluminumAlloy.id,
      propertyName: 'Tensile Strength',
      propertyType: 'MECHANICAL',
      propertyValue: '45 ksi (310 MPa)',
      propertyUnit: 'ksi',
      testMethod: 'ASTM E8',
      nominalValue: 45.0,
      minValue: 42.0,
      maxValue: 48.0,
      isRequired: true,
      isCritical: true,
      notes: 'Ultimate tensile strength for T6 temper'
    }
  });

  await prisma.materialProperty.upsert({
    where: {
      materialId_propertyName: {
        materialId: titaniumAlloy.id,
        propertyName: 'Density'
      }
    },
    update: {
      propertyType: 'PHYSICAL',
      propertyValue: '4.43 g/cm³',
      propertyUnit: 'g/cm³',
      testMethod: 'ASTM B381',
      nominalValue: 4.43,
      minValue: 4.40,
      maxValue: 4.46,
      isRequired: true,
      isCritical: false,
      notes: 'Density at room temperature for Grade 5'
    },
    create: {
      materialId: titaniumAlloy.id,
      propertyName: 'Density',
      propertyType: 'PHYSICAL',
      propertyValue: '4.43 g/cm³',
      propertyUnit: 'g/cm³',
      testMethod: 'ASTM B381',
      nominalValue: 4.43,
      minValue: 4.40,
      maxValue: 4.46,
      isRequired: true,
      isCritical: false,
      notes: 'Density at room temperature for Grade 5'
    }
  });

  await prisma.materialProperty.upsert({
    where: {
      materialId_propertyName: {
        materialId: titaniumAlloy.id,
        propertyName: 'Tensile Strength'
      }
    },
    update: {
      propertyType: 'MECHANICAL',
      propertyValue: '130 ksi (896 MPa)',
      propertyUnit: 'ksi',
      testMethod: 'ASTM E8',
      nominalValue: 130.0,
      minValue: 125.0,
      maxValue: 135.0,
      isRequired: true,
      isCritical: true,
      notes: 'Minimum ultimate tensile strength per AMS 4928'
    },
    create: {
      materialId: titaniumAlloy.id,
      propertyName: 'Tensile Strength',
      propertyType: 'MECHANICAL',
      propertyValue: '130 ksi (896 MPa)',
      propertyUnit: 'ksi',
      testMethod: 'ASTM E8',
      nominalValue: 130.0,
      minValue: 125.0,
      maxValue: 135.0,
      isRequired: true,
      isCritical: true,
      notes: 'Minimum ultimate tensile strength per AMS 4928'
    }
  });

  await prisma.materialProperty.upsert({
    where: {
      materialId_propertyName: {
        materialId: stainlessSteel.id,
        propertyName: 'Chromium Content'
      }
    },
    update: {
      propertyType: 'CHEMICAL',
      propertyValue: '18-20%',
      propertyUnit: '%',
      testMethod: 'ASTM E1086',
      nominalValue: 19.0,
      minValue: 18.0,
      maxValue: 20.0,
      isRequired: true,
      isCritical: true,
      notes: 'Chromium content for corrosion resistance'
    },
    create: {
      materialId: stainlessSteel.id,
      propertyName: 'Chromium Content',
      propertyType: 'CHEMICAL',
      propertyValue: '18-20%',
      propertyUnit: '%',
      testMethod: 'ASTM E1086',
      nominalValue: 19.0,
      minValue: 18.0,
      maxValue: 20.0,
      isRequired: true,
      isCritical: true,
      notes: 'Chromium content for corrosion resistance'
    }
  });

  console.log('✅ Material properties created');

  // 4. Create Material Lots with expiration and genealogy tracking
  const aluminumLot1 = await prisma.materialLot.upsert({
    where: { lotNumber: 'AL-20240115-001' },
    update: {
      materialId: aluminumAlloy.id,
      supplierLotNumber: 'ALCOA-2024-W012',
      purchaseOrderNumber: 'PO-2024-001',
      heatNumber: 'HEAT-AL-2024-001',
      originalQuantity: 2000.0,
      currentQuantity: 1450.0,
      unitOfMeasure: 'LB',
      location: 'Warehouse A - Rack 12',
      warehouseId: 'WH-001',
      manufactureDate: new Date('2023-12-01'),
      receivedDate: new Date('2024-01-15'),
      expirationDate: null,
      shelfLifeDays: null,
      firstUsedDate: new Date('2024-01-20'),
      lastUsedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: ['https://example.com/certs/al-20240115-001-mtc.pdf'],
      supplierId: 'SUPP-001',
      supplierName: 'Alcoa Corporation',
      manufacturerId: 'MFG-001',
      manufacturerName: 'Alcoa Mill Products',
      countryOfOrigin: 'USA',
      unitCost: 3.50,
      totalCost: 7000.00,
      currency: 'USD',
      isSplit: false,
      isMerged: false,
      notes: 'Verified material certifications, passed incoming inspection'
    },
    create: {
      lotNumber: 'AL-20240115-001',
      materialId: aluminumAlloy.id,
      supplierLotNumber: 'ALCOA-2024-W012',
      purchaseOrderNumber: 'PO-2024-001',
      heatNumber: 'HEAT-AL-2024-001',
      originalQuantity: 2000.0,
      currentQuantity: 1450.0,
      unitOfMeasure: 'LB',
      location: 'Warehouse A - Rack 12',
      warehouseId: 'WH-001',
      manufactureDate: new Date('2023-12-01'),
      receivedDate: new Date('2024-01-15'),
      expirationDate: null,
      shelfLifeDays: null,
      firstUsedDate: new Date('2024-01-20'),
      lastUsedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: ['https://example.com/certs/al-20240115-001-mtc.pdf'],
      supplierId: 'SUPP-001',
      supplierName: 'Alcoa Corporation',
      manufacturerId: 'MFG-001',
      manufacturerName: 'Alcoa Mill Products',
      countryOfOrigin: 'USA',
      unitCost: 3.50,
      totalCost: 7000.00,
      currency: 'USD',
      isSplit: false,
      isMerged: false,
      notes: 'Verified material certifications, passed incoming inspection'
    }
  });

  const titaniumLot1 = await prisma.materialLot.upsert({
    where: { lotNumber: 'TI-20240120-001' },
    update: {
      materialId: titaniumAlloy.id,
      supplierLotNumber: 'TIMET-2024-W003',
      purchaseOrderNumber: 'PO-2024-002',
      heatNumber: 'HEAT-TI-2024-001',
      originalQuantity: 500.0,
      currentQuantity: 425.0,
      unitOfMeasure: 'LB',
      location: 'Warehouse A - Secure Rack 1',
      warehouseId: 'WH-001',
      manufactureDate: new Date('2023-11-15'),
      receivedDate: new Date('2024-01-20'),
      expirationDate: null,
      shelfLifeDays: null,
      firstUsedDate: new Date('2024-01-22'),
      lastUsedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: ['https://example.com/certs/ti-20240120-001-mtc.pdf', 'https://example.com/certs/ti-20240120-001-coa.pdf'],
      supplierId: 'SUPP-002',
      supplierName: 'TIMET',
      manufacturerId: 'MFG-002',
      manufacturerName: 'TIMET Production',
      countryOfOrigin: 'USA',
      unitCost: 35.00,
      totalCost: 17500.00,
      currency: 'USD',
      isSplit: false,
      isMerged: false,
      notes: 'Aerospace grade titanium, full traceability to mill'
    },
    create: {
      lotNumber: 'TI-20240120-001',
      materialId: titaniumAlloy.id,
      supplierLotNumber: 'TIMET-2024-W003',
      purchaseOrderNumber: 'PO-2024-002',
      heatNumber: 'HEAT-TI-2024-001',
      originalQuantity: 500.0,
      currentQuantity: 425.0,
      unitOfMeasure: 'LB',
      location: 'Warehouse A - Secure Rack 1',
      warehouseId: 'WH-001',
      manufactureDate: new Date('2023-11-15'),
      receivedDate: new Date('2024-01-20'),
      expirationDate: null,
      shelfLifeDays: null,
      firstUsedDate: new Date('2024-01-22'),
      lastUsedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: ['https://example.com/certs/ti-20240120-001-mtc.pdf', 'https://example.com/certs/ti-20240120-001-coa.pdf'],
      supplierId: 'SUPP-002',
      supplierName: 'TIMET',
      manufacturerId: 'MFG-002',
      manufacturerName: 'TIMET Production',
      countryOfOrigin: 'USA',
      unitCost: 35.00,
      totalCost: 17500.00,
      currency: 'USD',
      isSplit: false,
      isMerged: false,
      notes: 'Aerospace grade titanium, full traceability to mill'
    }
  });

  // Create lot with expiration (cutting fluid)
  const expiringLot = await prisma.materialLot.upsert({
    where: { lotNumber: 'FL-20240110-001' },
    update: {
      materialId: cuttingFluid.id,
      supplierLotNumber: 'MASTERCHEM-2024-001',
      purchaseOrderNumber: 'PO-2024-003',
      heatNumber: null,
      originalQuantity: 100.0,
      currentQuantity: 65.0,
      unitOfMeasure: 'GAL',
      location: 'Warehouse B - Chemical Storage',
      warehouseId: 'WH-002',
      manufactureDate: new Date('2023-12-15'),
      receivedDate: new Date('2024-01-10'),
      expirationDate: new Date('2025-01-10'),
      shelfLifeDays: 365,
      firstUsedDate: new Date('2024-01-12'),
      lastUsedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: ['https://example.com/certs/fl-20240110-001-sds.pdf'],
      supplierId: 'SUPP-004',
      supplierName: 'Master Chemical',
      manufacturerId: 'MFG-004',
      manufacturerName: 'Master Chemical Corp',
      countryOfOrigin: 'USA',
      unitCost: 45.00,
      totalCost: 4500.00,
      currency: 'USD',
      isSplit: false,
      isMerged: false,
      notes: 'Store in cool, dry place. Check concentration regularly.'
    },
    create: {
      lotNumber: 'FL-20240110-001',
      materialId: cuttingFluid.id,
      supplierLotNumber: 'MASTERCHEM-2024-001',
      purchaseOrderNumber: 'PO-2024-003',
      heatNumber: null,
      originalQuantity: 100.0,
      currentQuantity: 65.0,
      unitOfMeasure: 'GAL',
      location: 'Warehouse B - Chemical Storage',
      warehouseId: 'WH-002',
      manufactureDate: new Date('2023-12-15'),
      receivedDate: new Date('2024-01-10'),
      expirationDate: new Date('2025-01-10'),
      shelfLifeDays: 365,
      firstUsedDate: new Date('2024-01-12'),
      lastUsedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: ['https://example.com/certs/fl-20240110-001-sds.pdf'],
      supplierId: 'SUPP-004',
      supplierName: 'Master Chemical',
      manufacturerId: 'MFG-004',
      manufacturerName: 'Master Chemical Corp',
      countryOfOrigin: 'USA',
      unitCost: 45.00,
      totalCost: 4500.00,
      currency: 'USD',
      isSplit: false,
      isMerged: false,
      notes: 'Store in cool, dry place. Check concentration regularly.'
    }
  });

  // Create lot with upcoming expiration (for expiration tests)
  const expiringSoonDate = new Date();
  expiringSoonDate.setDate(expiringSoonDate.getDate() + 20); // Expires in 20 days

  await prisma.materialLot.upsert({
    where: { lotNumber: 'FL-20240115-002' },
    update: {
      materialId: cuttingFluid.id,
      supplierLotNumber: 'MASTERCHEM-2024-002',
      purchaseOrderNumber: 'PO-2024-004',
      heatNumber: null,
      originalQuantity: 50.0,
      currentQuantity: 48.0,
      unitOfMeasure: 'GAL',
      location: 'Warehouse B - Chemical Storage',
      warehouseId: 'WH-002',
      manufactureDate: new Date('2024-01-01'),
      receivedDate: new Date('2024-01-15'),
      expirationDate: expiringSoonDate,
      shelfLifeDays: 365,
      firstUsedDate: new Date('2024-01-17'),
      lastUsedDate: new Date('2024-01-24'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: [],
      supplierId: 'SUPP-004',
      supplierName: 'Master Chemical',
      unitCost: 45.00,
      totalCost: 2250.00,
      currency: 'USD',
      notes: 'Expiring soon - use first'
    },
    create: {
      lotNumber: 'FL-20240115-002',
      materialId: cuttingFluid.id,
      supplierLotNumber: 'MASTERCHEM-2024-002',
      purchaseOrderNumber: 'PO-2024-004',
      heatNumber: null,
      originalQuantity: 50.0,
      currentQuantity: 48.0,
      unitOfMeasure: 'GAL',
      location: 'Warehouse B - Chemical Storage',
      warehouseId: 'WH-002',
      manufactureDate: new Date('2024-01-01'),
      receivedDate: new Date('2024-01-15'),
      expirationDate: expiringSoonDate,
      shelfLifeDays: 365,
      firstUsedDate: new Date('2024-01-17'),
      lastUsedDate: new Date('2024-01-24'),
      status: 'AVAILABLE',
      state: 'APPROVED',
      isQuarantined: false,
      qualityStatus: 'APPROVED',
      certificationUrls: [],
      supplierId: 'SUPP-004',
      supplierName: 'Master Chemical',
      unitCost: 45.00,
      totalCost: 2250.00,
      currency: 'USD',
      notes: 'Expiring soon - use first'
    }
  });

  console.log('✅ Material lots created');

  // 5. Create Material Sublots (Split operations)
  await prisma.materialSublot.upsert({
    where: { sublotNumber: 'AL-20240115-001-SUB-001' },
    update: {
      parentLotId: aluminumLot1.id,
      operationType: 'SPLIT',
      quantity: 150.0,
      unitOfMeasure: 'LB',
      workOrderId: workOrder1.id,
      location: 'CNC Machining Cell 1',
      status: 'IN_USE',
      splitReason: 'Material allocated for WO-2024-001001',
      createdById: operator.id
    },
    create: {
      sublotNumber: 'AL-20240115-001-SUB-001',
      parentLotId: aluminumLot1.id,
      operationType: 'SPLIT',
      quantity: 150.0,
      unitOfMeasure: 'LB',
      workOrderId: workOrder1.id,
      location: 'CNC Machining Cell 1',
      status: 'IN_USE',
      splitReason: 'Material allocated for WO-2024-001001',
      createdById: operator.id
    }
  });

  await prisma.materialSublot.upsert({
    where: { sublotNumber: 'TI-20240120-001-SUB-001' },
    update: {
      parentLotId: titaniumLot1.id,
      operationType: 'SPLIT',
      quantity: 25.0,
      unitOfMeasure: 'LB',
      workOrderId: workOrder1.id,
      location: 'CNC Machining Cell 1',
      status: 'IN_USE',
      splitReason: 'Titanium for turbine blade manufacturing',
      createdById: operator.id
    },
    create: {
      sublotNumber: 'TI-20240120-001-SUB-001',
      parentLotId: titaniumLot1.id,
      operationType: 'SPLIT',
      quantity: 25.0,
      unitOfMeasure: 'LB',
      workOrderId: workOrder1.id,
      location: 'CNC Machining Cell 1',
      status: 'IN_USE',
      splitReason: 'Titanium for turbine blade manufacturing',
      createdById: operator.id
    }
  });

  console.log('✅ Material sublots (split operations) created');

  // 6. Create Material Lot Genealogy (Parent-child relationships)
  // Simulate consuming aluminum lot to produce WIP lot
  const wipLot = await prisma.materialLot.upsert({
    where: { lotNumber: 'WIP-20240125-001' },
    update: {
      materialId: aluminumAlloy.id,
      originalQuantity: 8.5,
      currentQuantity: 8.5,
      unitOfMeasure: 'EA',
      location: 'WIP Storage',
      receivedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'IN_PROCESS',
      qualityStatus: 'PENDING',
      parentLotId: aluminumLot1.id,
      isSplit: false,
      notes: 'Machined turbine blades - awaiting final inspection'
    },
    create: {
      lotNumber: 'WIP-20240125-001',
      materialId: aluminumAlloy.id,
      originalQuantity: 8.5,
      currentQuantity: 8.5,
      unitOfMeasure: 'EA',
      location: 'WIP Storage',
      receivedDate: new Date('2024-01-25'),
      status: 'AVAILABLE',
      state: 'IN_PROCESS',
      qualityStatus: 'PENDING',
      parentLotId: aluminumLot1.id,
      isSplit: false,
      notes: 'Machined turbine blades - awaiting final inspection'
    }
  });

  await prisma.materialLotGenealogy.upsert({
    where: {
      parentLotId_childLotId_processDate: {
        parentLotId: aluminumLot1.id,
        childLotId: wipLot.id,
        processDate: new Date('2024-01-25T10:00:00Z')
      }
    },
    update: {
      relationshipType: 'CONSUMED_BY',
      quantityConsumed: 150.0,
      quantityProduced: 8.5,
      unitOfMeasure: 'LB',
      workOrderId: workOrder1.id,
      operatorId: operator.id,
      notes: 'Aluminum consumed in rough machining operation'
    },
    create: {
      parentLotId: aluminumLot1.id,
      childLotId: wipLot.id,
      relationshipType: 'CONSUMED_BY',
      quantityConsumed: 150.0,
      quantityProduced: 8.5,
      unitOfMeasure: 'LB',
      workOrderId: workOrder1.id,
      processDate: new Date('2024-01-25T10:00:00Z'),
      operatorId: operator.id,
      notes: 'Aluminum consumed in rough machining operation'
    }
  });

  console.log('✅ Material lot genealogy created');

  // 7. Create Material State History (State transitions)
  await prisma.materialStateHistory.create({
    data: {
      lotId: aluminumLot1.id,
      previousState: null,
      newState: 'RECEIVED',
      previousStatus: null,
      newStatus: 'QUARANTINED',
      reason: 'Initial receipt - pending incoming inspection',
      transitionType: 'AUTOMATIC',
      quantity: 2000.0,
      unitOfMeasure: 'LB',
      changedById: null,
      changedAt: new Date('2024-01-15T08:00:00Z'),
      toLocation: 'Receiving Dock',
      notes: 'Material received from supplier, awaiting inspection'
    }
  });

  await prisma.materialStateHistory.create({
    data: {
      lotId: aluminumLot1.id,
      previousState: 'RECEIVED',
      newState: 'INSPECTED',
      previousStatus: 'QUARANTINED',
      newStatus: 'AVAILABLE',
      reason: 'Incoming inspection passed',
      transitionType: 'MANUAL',
      quantity: 2000.0,
      unitOfMeasure: 'LB',
      inspectionId: inspection1.id,
      changedById: qualityEngineer.id,
      changedAt: new Date('2024-01-15T14:30:00Z'),
      fromLocation: 'Receiving Dock',
      toLocation: 'Warehouse A - Rack 12',
      qualityNotes: 'All dimensions and certifications verified',
      notes: 'Material approved for production use'
    }
  });

  await prisma.materialStateHistory.create({
    data: {
      lotId: aluminumLot1.id,
      previousState: 'INSPECTED',
      newState: 'ISSUED',
      previousStatus: 'AVAILABLE',
      newStatus: 'IN_USE',
      reason: 'Material issued to work order WO-2024-001001',
      transitionType: 'MANUAL',
      quantity: 150.0,
      unitOfMeasure: 'LB',
      workOrderId: workOrder1.id,
      changedById: operator.id,
      changedAt: new Date('2024-01-20T09:15:00Z'),
      fromLocation: 'Warehouse A - Rack 12',
      toLocation: 'CNC Machining Cell 1',
      notes: '150 lbs issued for turbine blade production'
    }
  });

  await prisma.materialStateHistory.create({
    data: {
      lotId: titaniumLot1.id,
      previousState: null,
      newState: 'RECEIVED',
      previousStatus: null,
      newStatus: 'QUARANTINED',
      reason: 'Initial receipt - 100% aerospace material inspection required',
      transitionType: 'AUTOMATIC',
      quantity: 500.0,
      unitOfMeasure: 'LB',
      changedById: null,
      changedAt: new Date('2024-01-20T10:00:00Z'),
      toLocation: 'Receiving Dock',
      notes: 'Titanium requires full certification review and dimensional check'
    }
  });

  await prisma.materialStateHistory.create({
    data: {
      lotId: titaniumLot1.id,
      previousState: 'RECEIVED',
      newState: 'APPROVED',
      previousStatus: 'QUARANTINED',
      newStatus: 'AVAILABLE',
      reason: '100% inspection passed, certs verified',
      transitionType: 'MANUAL',
      quantity: 500.0,
      unitOfMeasure: 'LB',
      changedById: qualityEngineer.id,
      changedAt: new Date('2024-01-20T16:00:00Z'),
      fromLocation: 'Receiving Dock',
      toLocation: 'Warehouse A - Secure Rack 1',
      qualityNotes: 'Heat number verified, material certs match PO, all dimensions within spec',
      notes: 'Titanium cleared for aerospace production'
    }
  });

  console.log('✅ Material state history created');
  console.log('✅ ISA-95 Material Hierarchy complete');

  // ==========================================
  // ISA-95 Process Segment Models (Task 1.4)
  // ==========================================

  // Create Process Segments (hierarchical production operations)
  const millingSegment = await prisma.processSegment.upsert({
    where: { segmentCode: 'OP-010-MILL' },
    update: {},
    create: {
      segmentCode: 'OP-010-MILL',
      segmentName: 'CNC Milling Operation',
      description: 'Precision CNC milling of aerospace turbine blades',
      level: 1,
      segmentType: 'PRODUCTION',
      category: 'MACHINING',
      duration: 3600, // 1 hour
      setupTime: 1800, // 30 minutes
      teardownTime: 600, // 10 minutes
      minCycleTime: 3000,
      maxCycleTime: 4200,
      version: '1.0',
      isActive: true,
      requiresApproval: true,
      approvedBy: 'ENG-001',
      approvedAt: new Date('2024-01-10')
    }
  });

  const roughMillingStep = await prisma.processSegment.upsert({
    where: { segmentCode: 'OP-010-MILL-010' },
    update: {},
    create: {
      segmentCode: 'OP-010-MILL-010',
      segmentName: 'Rough Milling',
      description: 'Rough milling to remove bulk material',
      level: 2,
      parentSegmentId: millingSegment.id,
      segmentType: 'PRODUCTION',
      category: 'MACHINING',
      duration: 1200, // 20 minutes
      setupTime: 0,
      teardownTime: 0,
      minCycleTime: 1000,
      maxCycleTime: 1400,
      version: '1.0',
      isActive: true
    }
  });

  const finishMillingStep = await prisma.processSegment.upsert({
    where: { segmentCode: 'OP-010-MILL-020' },
    update: {},
    create: {
      segmentCode: 'OP-010-MILL-020',
      segmentName: 'Finish Milling',
      description: 'Finish milling to final dimensions',
      level: 2,
      parentSegmentId: millingSegment.id,
      segmentType: 'PRODUCTION',
      category: 'MACHINING',
      duration: 2400, // 40 minutes
      setupTime: 0,
      teardownTime: 0,
      minCycleTime: 2000,
      maxCycleTime: 2800,
      version: '1.0',
      isActive: true
    }
  });

  const inspectionSegment = await prisma.processSegment.upsert({
    where: { segmentCode: 'OP-020-INSPECT' },
    update: {},
    create: {
      segmentCode: 'OP-020-INSPECT',
      segmentName: 'CMM Inspection',
      description: 'Coordinate measuring machine dimensional inspection',
      level: 1,
      segmentType: 'QUALITY',
      category: 'INSPECTION',
      duration: 1800, // 30 minutes
      setupTime: 600, // 10 minutes
      teardownTime: 300, // 5 minutes
      version: '1.0',
      isActive: true,
      requiresApproval: true
    }
  });

  console.log('✅ Process segments created (4 segments)');

  // Create Process Segment Parameters
  const millingSpeedParam = await prisma.processSegmentParameter.upsert({
    where: {
      segmentId_parameterName: {
        segmentId: millingSegment.id,
        parameterName: 'Spindle Speed'
      }
    },
    update: {},
    create: {
      segmentId: millingSegment.id,
      parameterName: 'Spindle Speed',
      parameterType: 'SET_POINT',
      dataType: 'NUMBER',
      defaultValue: '3000',
      unitOfMeasure: 'RPM',
      minValue: 2000,
      maxValue: 5000,
      isRequired: true,
      isCritical: true,
      requiresVerification: true
    }
  });

  const millingFeedRateParam = await prisma.processSegmentParameter.upsert({
    where: {
      segmentId_parameterName: {
        segmentId: millingSegment.id,
        parameterName: 'Feed Rate'
      }
    },
    update: {},
    create: {
      segmentId: millingSegment.id,
      parameterName: 'Feed Rate',
      parameterType: 'SET_POINT',
      dataType: 'NUMBER',
      defaultValue: '15',
      unitOfMeasure: 'IPM',
      minValue: 10,
      maxValue: 25,
      isRequired: true,
      isCritical: true
    }
  });

  const inspectionTempParam = await prisma.processSegmentParameter.upsert({
    where: {
      segmentId_parameterName: {
        segmentId: inspectionSegment.id,
        parameterName: 'Temperature'
      }
    },
    update: {},
    create: {
      segmentId: inspectionSegment.id,
      parameterName: 'Temperature',
      parameterType: 'MEASURED',
      dataType: 'NUMBER',
      defaultValue: '68',
      unitOfMeasure: '°F',
      minValue: 66,
      maxValue: 70,
      isRequired: true,
      isCritical: true,
      notes: 'CMM room must be temperature controlled for accuracy'
    }
  });

  console.log('✅ Process segment parameters created (3 parameters)');

  // Create Process Segment Dependencies
  const millingToInspectionDep = await prisma.processSegmentDependency.upsert({
    where: {
      dependentSegmentId_prerequisiteSegmentId: {
        dependentSegmentId: inspectionSegment.id,
        prerequisiteSegmentId: millingSegment.id
      }
    },
    update: {},
    create: {
      dependentSegmentId: inspectionSegment.id,
      prerequisiteSegmentId: millingSegment.id,
      dependencyType: 'MUST_COMPLETE',
      timingType: 'FINISH_TO_START',
      lagTime: 300, // 5 minute minimum cooldown
      condition: 'Part must cool to room temperature',
      isOptional: false
    }
  });

  const roughToFinishDep = await prisma.processSegmentDependency.upsert({
    where: {
      dependentSegmentId_prerequisiteSegmentId: {
        dependentSegmentId: finishMillingStep.id,
        prerequisiteSegmentId: roughMillingStep.id
      }
    },
    update: {},
    create: {
      dependentSegmentId: finishMillingStep.id,
      prerequisiteSegmentId: roughMillingStep.id,
      dependencyType: 'MUST_COMPLETE',
      timingType: 'FINISH_TO_START',
      lagTime: 0,
      isOptional: false
    }
  });

  console.log('✅ Process segment dependencies created (2 dependencies)');

  // Create Personnel Segment Specifications
  const millingOperatorSpec = await prisma.personnelSegmentSpecification.create({
    data: {
      segmentId: millingSegment.id,
      personnelClassId: technicianClass.id,
      minimumCompetency: 'COMPETENT',
      requiredCertifications: ['CNC-001', 'SAFETY-001'],
      quantity: 1,
      roleName: 'CNC Operator',
      roleDescription: 'Operates CNC milling machine',
      isOptional: false
    }
  });

  const inspectionOperatorSpec = await prisma.personnelSegmentSpecification.create({
    data: {
      segmentId: inspectionSegment.id,
      personnelClassId: technicianClass.id,
      minimumCompetency: 'PROFICIENT',
      requiredCertifications: ['CMM-001', 'QA-001'],
      quantity: 1,
      roleName: 'Quality Inspector',
      roleDescription: 'Performs CMM inspection',
      isOptional: false
    }
  });

  console.log('✅ Personnel segment specifications created (2 specs)');

  // Create Equipment Segment Specifications
  const millingEquipmentSpec = await prisma.equipmentSegmentSpecification.create({
    data: {
      segmentId: millingSegment.id,
      equipmentClass: 'PRODUCTION',
      equipmentType: 'CNC_MILL',
      requiredCapabilities: ['5-axis', 'high-speed-spindle'],
      quantity: 1,
      setupRequired: true,
      setupTime: 1800
    }
  });

  const inspectionEquipmentSpec = await prisma.equipmentSegmentSpecification.create({
    data: {
      segmentId: inspectionSegment.id,
      equipmentClass: 'QUALITY',
      equipmentType: 'CMM',
      requiredCapabilities: ['optical-probe', 'touch-probe'],
      quantity: 1,
      setupRequired: true,
      setupTime: 600
    }
  });

  console.log('✅ Equipment segment specifications created (2 specs)');

  // Create Material Segment Specifications
  const titaniumMaterialSpec = await prisma.materialSegmentSpecification.create({
    data: {
      segmentId: millingSegment.id,
      materialDefinitionId: titaniumAlloy.id,
      quantity: 1.5,
      unitOfMeasure: 'LB',
      consumptionType: 'PER_UNIT',
      requiredProperties: ['tensile-strength', 'hardness'],
      qualityRequirements: 'Must have certification for aerospace use',
      isOptional: false,
      allowSubstitutes: false
    }
  });

  const cuttingFluidSpec = await prisma.materialSegmentSpecification.create({
    data: {
      segmentId: millingSegment.id,
      materialType: 'CONSUMABLE',
      quantity: 0.5,
      unitOfMeasure: 'GAL',
      consumptionType: 'PER_BATCH',
      isOptional: false,
      allowSubstitutes: true
    }
  });

  console.log('✅ Material segment specifications created (2 specs)');

  // Create Physical Asset Segment Specifications
  const endMillTooling = await prisma.physicalAssetSegmentSpecification.create({
    data: {
      segmentId: millingSegment.id,
      assetType: 'TOOLING',
      assetCode: 'EM-0.500-TiN',
      assetName: '0.5" TiN Coated End Mill',
      specifications: {
        diameter: '0.5"',
        coating: 'TiN',
        flutes: 4,
        material: 'Carbide'
      },
      quantity: 2,
      requiresCalibration: false,
      estimatedLifeCycles: 500
    }
  });

  const workHoldingFixture = await prisma.physicalAssetSegmentSpecification.create({
    data: {
      segmentId: millingSegment.id,
      assetType: 'FIXTURE',
      assetCode: 'FIX-TB-001',
      assetName: 'Turbine Blade Workholding Fixture',
      specifications: {
        partNumber: 'TB-100',
        drawingNumber: 'FIX-TB-001-A'
      },
      quantity: 1,
      requiresCalibration: false
    }
  });

  const cmmProbe = await prisma.physicalAssetSegmentSpecification.create({
    data: {
      segmentId: inspectionSegment.id,
      assetType: 'GAUGE',
      assetCode: 'PROBE-OPT-001',
      assetName: 'CMM Optical Probe',
      specifications: {
        accuracy: '0.0001"',
        type: 'Optical',
        calibrationInterval: 90
      },
      quantity: 1,
      requiresCalibration: true,
      calibrationInterval: 90 // days
    }
  });

  console.log('✅ Physical asset segment specifications created (3 assets)');
  console.log('✅ ISA-95 Process Segment Hierarchy complete');

  // Create serialized parts for traceability using upsert
  const serializedPart1 = await prisma.serializedPart.upsert({
    where: { serialNumber: 'TB-2024-001001-S001' },
    update: {
      partId: turbineBlade.id,
      workOrderId: workOrder1.id,
      lotNumber: 'LOT-2024-001',
      status: 'IN_PRODUCTION',
      currentLocation: 'CNC Machining Cell 1',
      manufactureDate: new Date('2024-01-25')
    },
    create: {
      serialNumber: 'TB-2024-001001-S001',
      partId: turbineBlade.id,
      workOrderId: workOrder1.id,
      lotNumber: 'LOT-2024-001',
      status: 'IN_PRODUCTION',
      currentLocation: 'CNC Machining Cell 1',
      manufactureDate: new Date('2024-01-25')
    }
  });

  // Create serialized part with LOT number as serial number for forward traceability test
  const serializedPart2 = await prisma.serializedPart.upsert({
    where: { serialNumber: 'LOT-2024-001' },
    update: {
      partId: turbineBlade.id,
      workOrderId: workOrder1.id,
      lotNumber: 'LOT-2024-001',
      status: 'COMPLETED',
      currentLocation: 'Finished Goods',
      manufactureDate: new Date('2024-01-26')
    },
    create: {
      serialNumber: 'LOT-2024-001',
      partId: turbineBlade.id,
      workOrderId: workOrder1.id,
      lotNumber: 'LOT-2024-001',
      status: 'COMPLETED',
      currentLocation: 'Finished Goods',
      manufactureDate: new Date('2024-01-26')
    }
  });

  console.log('✅ Serialized parts created');

  // Create test parts for E2E traceability tests
  const testPart = await prisma.part.upsert({
    where: { partNumber: 'PN-001' },
    update: {
      partName: 'Test Part for Traceability',
      description: 'Test part used in E2E traceability workflow tests',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-PN-001',
      revision: 'A'
    },
    create: {
      partNumber: 'PN-001',
      partName: 'Test Part for Traceability',
      description: 'Test part used in E2E traceability workflow tests',
      partType: 'MANUFACTURED',
      unitOfMeasure: 'EA',
      drawingNumber: 'DWG-PN-001',
      revision: 'A'
    }
  });

  // Create test work order for traceability tests
  const testWorkOrder = await prisma.workOrder.upsert({
    where: { workOrderNumber: 'WO-20251015-001' },
    update: {
      partId: testPart.id,
      quantity: 50,
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-11-01'),
      customerOrder: 'CO-TEST-001',
      createdById: adminUser.id,
      assignedToId: operator.id,
      startedAt: new Date('2025-10-15T08:00:00Z')
    },
    create: {
      workOrderNumber: 'WO-20251015-001',
      partId: testPart.id,
      quantity: 50,
      priority: 'NORMAL',
      status: 'IN_PROGRESS',
      dueDate: new Date('2025-11-01'),
      customerOrder: 'CO-TEST-001',
      createdById: adminUser.id,
      assignedToId: operator.id,
      startedAt: new Date('2025-10-15T08:00:00Z')
    }
  });

  // Create test serialized parts with expected serial numbers for E2E tests
  const testSerializedPart1 = await prisma.serializedPart.upsert({
    where: { serialNumber: 'SN-20251015-000001-7' },
    update: {
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      lotNumber: 'LOT-20251015-001',
      status: 'COMPLETED',
      currentLocation: 'Finished Goods',
      manufactureDate: new Date('2025-10-15')
    },
    create: {
      serialNumber: 'SN-20251015-000001-7',
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      lotNumber: 'LOT-20251015-001',
      status: 'COMPLETED',
      currentLocation: 'Finished Goods',
      manufactureDate: new Date('2025-10-15')
    }
  });

  // Create additional test serialized parts for list/search tests
  const testSerializedPart2 = await prisma.serializedPart.upsert({
    where: { serialNumber: 'SN-20251015-000002-5' },
    update: {
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      lotNumber: 'LOT-20251015-001',
      status: 'COMPLETED',
      currentLocation: 'Finished Goods',
      manufactureDate: new Date('2025-10-15')
    },
    create: {
      serialNumber: 'SN-20251015-000002-5',
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      lotNumber: 'LOT-20251015-001',
      status: 'COMPLETED',
      currentLocation: 'Finished Goods',
      manufactureDate: new Date('2025-10-15')
    }
  });

  const testSerializedPart3 = await prisma.serializedPart.upsert({
    where: { serialNumber: 'SN-20251015-000003-3' },
    update: {
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      lotNumber: 'LOT-20251015-001',
      status: 'IN_PRODUCTION',
      currentLocation: 'Assembly Station A',
      manufactureDate: new Date('2025-10-15')
    },
    create: {
      serialNumber: 'SN-20251015-000003-3',
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      lotNumber: 'LOT-20251015-001',
      status: 'IN_PRODUCTION',
      currentLocation: 'Assembly Station A',
      manufactureDate: new Date('2025-10-15')
    }
  });

  console.log('✅ Test data for traceability created');

  // Create test FAI reports for E2E FAI workflow tests
  const faiReport1 = await prisma.fAIReport.upsert({
    where: { faiNumber: 'FAI-20251015-001' },
    update: {
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      revisionLevel: 'A',
      status: 'IN_PROGRESS',
      createdById: qualityEngineer.id
    },
    create: {
      faiNumber: 'FAI-20251015-001',
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      revisionLevel: 'A',
      status: 'IN_PROGRESS',
      createdById: qualityEngineer.id
    }
  });

  const faiReport2 = await prisma.fAIReport.upsert({
    where: { faiNumber: 'FAI-20251015-002' },
    update: {
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      revisionLevel: 'A',
      status: 'REVIEW',
      createdById: qualityEngineer.id
    },
    create: {
      faiNumber: 'FAI-20251015-002',
      partId: testPart.id,
      workOrderId: testWorkOrder.id,
      revisionLevel: 'A',
      status: 'REVIEW',
      createdById: qualityEngineer.id
    }
  });

  console.log('✅ Test FAI reports created');

  // For inventory, we'll use a compound unique constraint approach
  // First, try to find existing inventory by part and location
  const existingInventory = await prisma.inventory.findFirst({
    where: {
      partId: turbineBlade.id,
      location: 'Finished Goods',
      lotNumber: 'LOT-2024-001'
    }
  });

  const inventory1 = existingInventory ?
    await prisma.inventory.update({
      where: { id: existingInventory.id },
      data: {
        quantity: 5,
        unitOfMeasure: 'EA',
        unitCost: 15000.00,
        receivedDate: new Date('2024-01-28')
      }
    }) :
    await prisma.inventory.create({
      data: {
        partId: turbineBlade.id,
        location: 'Finished Goods',
        lotNumber: 'LOT-2024-001',
        quantity: 5,
        unitOfMeasure: 'EA',
        unitCost: 15000.00,
        receivedDate: new Date('2024-01-28')
      }
    });

  console.log('✅ Inventory created');

  // ==============================================
  // PRODUCTION SCHEDULES (ISA-95 Task 1.6)
  // ==============================================

  // Schedule 1: January 2025 Production Schedule (RELEASED state)
  const schedule1 = await prisma.productionSchedule.upsert({
    where: { scheduleNumber: 'SCH-2025-01' },
    update: {
      scheduleName: 'January 2025 Production Schedule',
      description: 'Production schedule for January 2025 covering turbine blade and guide vane manufacturing',
      periodStart: new Date('2025-01-01T00:00:00Z'),
      periodEnd: new Date('2025-01-31T23:59:59Z'),
      periodType: 'MONTHLY',
      siteId: mainSite.id,
      state: 'RELEASED',
      stateChangedAt: new Date('2025-01-02T10:00:00Z'),
      priority: 'HIGH',
      plannedBy: adminUser.id,
      approvedBy: adminUser.id,
      approvedAt: new Date('2025-01-02T10:00:00Z'),
      totalEntries: 3,
      dispatchedCount: 0,
      isFeasible: true,
      notes: 'High-priority schedule for January manufacturing operations'
    },
    create: {
      scheduleNumber: 'SCH-2025-01',
      scheduleName: 'January 2025 Production Schedule',
      description: 'Production schedule for January 2025 covering turbine blade and guide vane manufacturing',
      periodStart: new Date('2025-01-01T00:00:00Z'),
      periodEnd: new Date('2025-01-31T23:59:59Z'),
      periodType: 'MONTHLY',
      siteId: mainSite.id,
      state: 'RELEASED',
      stateChangedAt: new Date('2025-01-02T10:00:00Z'),
      priority: 'HIGH',
      plannedBy: adminUser.id,
      approvedBy: adminUser.id,
      approvedAt: new Date('2025-01-02T10:00:00Z'),
      totalEntries: 3,
      dispatchedCount: 0,
      isFeasible: true,
      notes: 'High-priority schedule for January manufacturing operations'
    }
  });

  // Schedule 2: February 2025 Production Schedule (FORECAST state)
  const schedule2 = await prisma.productionSchedule.upsert({
    where: { scheduleNumber: 'SCH-2025-02' },
    update: {
      scheduleName: 'February 2025 Production Forecast',
      description: 'Tentative production forecast for February 2025',
      periodStart: new Date('2025-02-01T00:00:00Z'),
      periodEnd: new Date('2025-02-28T23:59:59Z'),
      periodType: 'MONTHLY',
      siteId: mainSite.id,
      state: 'FORECAST',
      stateChangedAt: new Date('2025-01-15T14:30:00Z'),
      priority: 'NORMAL',
      plannedBy: adminUser.id,
      totalEntries: 3,
      dispatchedCount: 0,
      isFeasible: true,
      feasibilityNotes: 'Pending material availability confirmation',
      notes: 'Preliminary forecast pending customer order confirmations'
    },
    create: {
      scheduleNumber: 'SCH-2025-02',
      scheduleName: 'February 2025 Production Forecast',
      description: 'Tentative production forecast for February 2025',
      periodStart: new Date('2025-02-01T00:00:00Z'),
      periodEnd: new Date('2025-02-28T23:59:59Z'),
      periodType: 'MONTHLY',
      siteId: mainSite.id,
      state: 'FORECAST',
      stateChangedAt: new Date('2025-01-15T14:30:00Z'),
      priority: 'NORMAL',
      plannedBy: adminUser.id,
      totalEntries: 3,
      dispatchedCount: 0,
      isFeasible: true,
      feasibilityNotes: 'Pending material availability confirmation',
      notes: 'Preliminary forecast pending customer order confirmations'
    }
  });

  // Schedule 1 Entries
  const scheduleEntry1 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule1.id, entryNumber: 1 } },
    update: {
      partId: turbineBlade.id,
      partNumber: turbineBlade.partNumber,
      description: 'Turbine Blade Production - Customer Order CO-2025-001',
      plannedQuantity: 100,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-01-05T08:00:00Z'),
      plannedEndDate: new Date('2025-01-15T17:00:00Z'),
      priority: 'HIGH',
      sequenceNumber: 1,
      estimatedDuration: 10, // days
      workCenterId: machiningCenter.id,
      customerOrder: 'CO-2025-001',
      customerDueDate: new Date('2025-01-20T00:00:00Z'),
      salesOrder: 'SO-2025-001',
      notes: 'High-priority customer order'
    },
    create: {
      scheduleId: schedule1.id,
      entryNumber: 1,
      partId: turbineBlade.id,
      partNumber: turbineBlade.partNumber,
      description: 'Turbine Blade Production - Customer Order CO-2025-001',
      plannedQuantity: 100,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-01-05T08:00:00Z'),
      plannedEndDate: new Date('2025-01-15T17:00:00Z'),
      priority: 'HIGH',
      sequenceNumber: 1,
      estimatedDuration: 10,
      workCenterId: machiningCenter.id,
      customerOrder: 'CO-2025-001',
      customerDueDate: new Date('2025-01-20T00:00:00Z'),
      salesOrder: 'SO-2025-001',
      notes: 'High-priority customer order'
    }
  });

  const scheduleEntry2 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule1.id, entryNumber: 2 } },
    update: {
      partId: guideVane.id,
      partNumber: guideVane.partNumber,
      description: 'Guide Vane Production - Stock Replenishment',
      plannedQuantity: 200,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-01-10T08:00:00Z'),
      plannedEndDate: new Date('2025-01-25T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 2,
      estimatedDuration: 15,
      workCenterId: machiningCenter.id,
      notes: 'Stock replenishment for inventory'
    },
    create: {
      scheduleId: schedule1.id,
      entryNumber: 2,
      partId: guideVane.id,
      partNumber: guideVane.partNumber,
      description: 'Guide Vane Production - Stock Replenishment',
      plannedQuantity: 200,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-01-10T08:00:00Z'),
      plannedEndDate: new Date('2025-01-25T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 2,
      estimatedDuration: 15,
      workCenterId: machiningCenter.id,
      notes: 'Stock replenishment for inventory'
    }
  });

  const scheduleEntry3 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule1.id, entryNumber: 3 } },
    update: {
      partId: compressorDisk.id,
      partNumber: compressorDisk.partNumber,
      description: 'Compressor Disk Production - Customer Order CO-2025-002',
      plannedQuantity: 50,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-01-20T08:00:00Z'),
      plannedEndDate: new Date('2025-01-30T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 3,
      estimatedDuration: 10,
      workCenterId: assemblyArea.id,
      customerOrder: 'CO-2025-002',
      customerDueDate: new Date('2025-02-05T00:00:00Z'),
      salesOrder: 'SO-2025-002',
      notes: 'Assembly operations required'
    },
    create: {
      scheduleId: schedule1.id,
      entryNumber: 3,
      partId: compressorDisk.id,
      partNumber: compressorDisk.partNumber,
      description: 'Compressor Disk Production - Customer Order CO-2025-002',
      plannedQuantity: 50,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-01-20T08:00:00Z'),
      plannedEndDate: new Date('2025-01-30T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 3,
      estimatedDuration: 10,
      workCenterId: assemblyArea.id,
      customerOrder: 'CO-2025-002',
      customerDueDate: new Date('2025-02-05T00:00:00Z'),
      salesOrder: 'SO-2025-002',
      notes: 'Assembly operations required'
    }
  });

  // Schedule 2 Entries (Forecast)
  const scheduleEntry4 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule2.id, entryNumber: 1 } },
    update: {
      partId: turbineBlade.id,
      partNumber: turbineBlade.partNumber,
      description: 'Turbine Blade Production - Forecasted Demand',
      plannedQuantity: 150,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-02-03T08:00:00Z'),
      plannedEndDate: new Date('2025-02-14T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 1,
      estimatedDuration: 11,
      workCenterId: machiningCenter.id,
      notes: 'Forecasted based on historical demand patterns'
    },
    create: {
      scheduleId: schedule2.id,
      entryNumber: 1,
      partId: turbineBlade.id,
      partNumber: turbineBlade.partNumber,
      description: 'Turbine Blade Production - Forecasted Demand',
      plannedQuantity: 150,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-02-03T08:00:00Z'),
      plannedEndDate: new Date('2025-02-14T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 1,
      estimatedDuration: 11,
      workCenterId: machiningCenter.id,
      notes: 'Forecasted based on historical demand patterns'
    }
  });

  const scheduleEntry5 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule2.id, entryNumber: 2 } },
    update: {
      partId: guideVane.id,
      partNumber: guideVane.partNumber,
      description: 'Guide Vane Production - Forecasted Demand',
      plannedQuantity: 250,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-02-10T08:00:00Z'),
      plannedEndDate: new Date('2025-02-24T17:00:00Z'),
      priority: 'LOW',
      sequenceNumber: 2,
      estimatedDuration: 14,
      workCenterId: machiningCenter.id,
      notes: 'Low-priority forecast for inventory build-up'
    },
    create: {
      scheduleId: schedule2.id,
      entryNumber: 2,
      partId: guideVane.id,
      partNumber: guideVane.partNumber,
      description: 'Guide Vane Production - Forecasted Demand',
      plannedQuantity: 250,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-02-10T08:00:00Z'),
      plannedEndDate: new Date('2025-02-24T17:00:00Z'),
      priority: 'LOW',
      sequenceNumber: 2,
      estimatedDuration: 14,
      workCenterId: machiningCenter.id,
      notes: 'Low-priority forecast for inventory build-up'
    }
  });

  const scheduleEntry6 = await prisma.scheduleEntry.upsert({
    where: { scheduleId_entryNumber: { scheduleId: schedule2.id, entryNumber: 3 } },
    update: {
      partId: compressorDisk.id,
      partNumber: compressorDisk.partNumber,
      description: 'Compressor Disk Production - Forecasted Demand',
      plannedQuantity: 75,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-02-17T08:00:00Z'),
      plannedEndDate: new Date('2025-02-27T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 3,
      estimatedDuration: 10,
      workCenterId: assemblyArea.id,
      notes: 'Tentative forecast pending customer confirmations'
    },
    create: {
      scheduleId: schedule2.id,
      entryNumber: 3,
      partId: compressorDisk.id,
      partNumber: compressorDisk.partNumber,
      description: 'Compressor Disk Production - Forecasted Demand',
      plannedQuantity: 75,
      unitOfMeasure: 'EA',
      plannedStartDate: new Date('2025-02-17T08:00:00Z'),
      plannedEndDate: new Date('2025-02-27T17:00:00Z'),
      priority: 'NORMAL',
      sequenceNumber: 3,
      estimatedDuration: 10,
      workCenterId: assemblyArea.id,
      notes: 'Tentative forecast pending customer confirmations'
    }
  });

  // Schedule Constraints
  const constraint1 = await prisma.scheduleConstraint.create({
    data: {
      entryId: scheduleEntry1.id,
      constraintType: 'CAPACITY',
      constraintName: 'Machining Center Capacity',
      description: 'Work center capacity constraint for January turbine blade production',
      resourceId: machiningCenter.id,
      resourceType: 'WORK_CENTER',
      requiredQuantity: 800, // machine hours
      availableQuantity: 900,
      unitOfMeasure: 'HOURS',
      constraintDate: new Date('2025-01-05T00:00:00Z'),
      isViolated: false,
      notes: 'Capacity within acceptable limits'
    }
  });

  const constraint2 = await prisma.scheduleConstraint.create({
    data: {
      entryId: scheduleEntry1.id,
      constraintType: 'MATERIAL',
      constraintName: 'Titanium Alloy Raw Material',
      description: 'Raw material availability for turbine blade production',
      resourceType: 'MATERIAL',
      requiredQuantity: 500, // kg
      availableQuantity: 450,
      unitOfMeasure: 'KG',
      leadTimeDays: 14,
      constraintDate: new Date('2025-01-05T00:00:00Z'),
      isViolated: true,
      violationSeverity: 'MEDIUM',
      violationMessage: 'Material shortage of 50 kg - procurement in progress',
      notes: 'Material order placed on 2024-12-20, expected delivery 2025-01-03'
    }
  });

  const constraint3 = await prisma.scheduleConstraint.create({
    data: {
      entryId: scheduleEntry2.id,
      constraintType: 'CAPACITY',
      constraintName: 'Machining Center Capacity',
      description: 'Work center capacity constraint for guide vane production',
      resourceId: machiningCenter.id,
      resourceType: 'WORK_CENTER',
      requiredQuantity: 1200, // machine hours
      availableQuantity: 1500,
      unitOfMeasure: 'HOURS',
      constraintDate: new Date('2025-01-10T00:00:00Z'),
      isViolated: false,
      notes: 'Sufficient capacity available'
    }
  });

  const constraint4 = await prisma.scheduleConstraint.create({
    data: {
      entryId: scheduleEntry4.id,
      constraintType: 'DATE',
      constraintName: 'Customer Due Date',
      description: 'Customer requested delivery date constraint',
      constraintDate: new Date('2025-02-20T00:00:00Z'),
      isViolated: false,
      notes: 'Schedule meets customer deadline with 6 days buffer'
    }
  });

  // State History Records
  const stateHistory1 = await prisma.scheduleStateHistory.create({
    data: {
      scheduleId: schedule1.id,
      previousState: 'FORECAST',
      newState: 'RELEASED',
      transitionDate: new Date('2025-01-02T10:00:00Z'),
      reason: 'Schedule approved by production manager - all constraints verified',
      changedBy: adminUser.id,
      entriesAffected: 3,
      notificationsSent: true,
      notes: 'Released for dispatch and work order creation'
    }
  });

  const stateHistory2 = await prisma.scheduleStateHistory.create({
    data: {
      scheduleId: schedule2.id,
      previousState: null,
      newState: 'FORECAST',
      transitionDate: new Date('2025-01-15T14:30:00Z'),
      reason: 'Initial forecast created based on demand planning',
      changedBy: adminUser.id,
      entriesAffected: 3,
      notificationsSent: false,
      notes: 'Tentative schedule pending customer order confirmations'
    }
  });

  console.log('✅ Production schedules created (2 schedules, 6 entries, 4 constraints)');

  // ============================================================================
  // Task 1.7: Production Dispatching & Execution Seed Data
  // ============================================================================

  console.log('\n📋 Seeding Task 1.7: Production Dispatching & Execution data...');

  // Work Order Status History (tracking all status transitions)
  // Work Order 1 history: CREATED → RELEASED → IN_PROGRESS
  const woHistory1_1 = await prisma.workOrderStatusHistory.upsert({
    where: { id: 'wo-hist-1-created' },
    update: {},
    create: {
      id: 'wo-hist-1-created',
      workOrderId: workOrder1.id,
      previousStatus: null,
      newStatus: 'CREATED',
      transitionDate: new Date('2025-01-10T08:00:00Z'),
      reason: 'Work order created from production schedule',
      changedBy: adminUser.id,
      quantityAtTransition: 0,
      scrapAtTransition: 0,
      notes: 'Initial work order creation'
    }
  });

  const woHistory1_2 = await prisma.workOrderStatusHistory.upsert({
    where: { id: 'wo-hist-1-released' },
    update: {},
    create: {
      id: 'wo-hist-1-released',
      workOrderId: workOrder1.id,
      previousStatus: 'CREATED',
      newStatus: 'RELEASED',
      transitionDate: new Date('2025-01-10T09:00:00Z'),
      reason: 'Released to shop floor for production',
      changedBy: adminUser.id,
      quantityAtTransition: 0,
      scrapAtTransition: 0,
      notes: 'Materials reserved, routing verified, personnel assigned'
    }
  });

  const woHistory1_3 = await prisma.workOrderStatusHistory.upsert({
    where: { id: 'wo-hist-1-inprogress' },
    update: {},
    create: {
      id: 'wo-hist-1-inprogress',
      workOrderId: workOrder1.id,
      previousStatus: 'RELEASED',
      newStatus: 'IN_PROGRESS',
      transitionDate: new Date('2025-01-10T10:00:00Z'),
      reason: 'Production started',
      changedBy: operator.id,
      quantityAtTransition: 0,
      scrapAtTransition: 0,
      notes: 'Operator started first operation'
    }
  });

  // Work Order 2 history: CREATED → RELEASED → IN_PROGRESS
  const woHistory2_1 = await prisma.workOrderStatusHistory.upsert({
    where: { id: 'wo-hist-2-created' },
    update: {},
    create: {
      id: 'wo-hist-2-created',
      workOrderId: workOrder2.id,
      previousStatus: null,
      newStatus: 'CREATED',
      transitionDate: new Date('2025-01-11T08:00:00Z'),
      reason: 'Work order created',
      changedBy: adminUser.id,
      quantityAtTransition: 0,
      scrapAtTransition: 0
    }
  });

  const woHistory2_2 = await prisma.workOrderStatusHistory.upsert({
    where: { id: 'wo-hist-2-released' },
    update: {},
    create: {
      id: 'wo-hist-2-released',
      workOrderId: workOrder2.id,
      previousStatus: 'CREATED',
      newStatus: 'RELEASED',
      transitionDate: new Date('2025-01-11T09:00:00Z'),
      reason: 'Released to shop floor',
      changedBy: adminUser.id,
      quantityAtTransition: 0,
      scrapAtTransition: 0
    }
  });

  const woHistory2_3 = await prisma.workOrderStatusHistory.upsert({
    where: { id: 'wo-hist-2-inprogress' },
    update: {},
    create: {
      id: 'wo-hist-2-inprogress',
      workOrderId: workOrder2.id,
      previousStatus: 'RELEASED',
      newStatus: 'IN_PROGRESS',
      transitionDate: new Date('2025-01-11T10:30:00Z'),
      reason: 'Production started',
      changedBy: operator.id,
      quantityAtTransition: 0,
      scrapAtTransition: 0
    }
  });

  // Dispatch Logs (when work orders are released to shop floor)
  const dispatch1 = await prisma.dispatchLog.upsert({
    where: { id: 'dispatch-1' },
    update: {},
    create: {
      id: 'dispatch-1',
      workOrderId: workOrder1.id,
      dispatchedAt: new Date('2025-01-10T09:00:00Z'),
      dispatchedBy: adminUser.id,
      dispatchedFrom: 'Production Schedule SCH-2025-01',
      assignedToId: operator.id,
      workCenterId: machiningCenter.id,
      priorityOverride: 'HIGH',
      expectedStartDate: new Date('2025-01-10T10:00:00Z'),
      expectedEndDate: new Date('2025-01-15T17:00:00Z'),
      quantityDispatched: 100,
      materialReserved: true,
      toolingReserved: true,
      dispatchNotes: 'High priority turbine blade order - customer committed delivery',
      metadata: { customerOrder: 'CO-2025-001', lineNumber: 'Line 1' }
    }
  });

  const dispatch2 = await prisma.dispatchLog.upsert({
    where: { id: 'dispatch-2' },
    update: {},
    create: {
      id: 'dispatch-2',
      workOrderId: workOrder2.id,
      dispatchedAt: new Date('2025-01-11T09:00:00Z'),
      dispatchedBy: adminUser.id,
      dispatchedFrom: 'Production Schedule SCH-2025-01',
      assignedToId: operator.id,
      workCenterId: machiningCenter.id,
      priorityOverride: null,
      expectedStartDate: new Date('2025-01-11T10:00:00Z'),
      expectedEndDate: new Date('2025-01-18T17:00:00Z'),
      quantityDispatched: 50,
      materialReserved: true,
      toolingReserved: false,
      dispatchNotes: 'Guide vane production - normal priority'
    }
  });

  // Work Performance Records

  // Labor Performance for WO1
  const laborPerf1 = await prisma.workPerformance.upsert({
    where: { id: 'labor-perf-1' },
    update: {},
    create: {
      id: 'labor-perf-1',
      workOrderId: workOrder1.id,
      operationId: null, // Work order level
      performanceType: 'LABOR',
      recordedAt: new Date('2025-01-10T17:00:00Z'),
      recordedBy: operator.id,
      personnelId: operator.id,
      laborHours: 8.5,
      laborCost: 425.00, // 8.5 hrs * $50/hr
      laborEfficiency: 94.1, // (8 standard hrs / 8.5 actual hrs * 100)
      notes: 'Day 1 production - setup took longer than expected'
    }
  });

  const laborPerf2 = await prisma.workPerformance.upsert({
    where: { id: 'labor-perf-2' },
    update: {},
    create: {
      id: 'labor-perf-2',
      workOrderId: workOrder1.id,
      operationId: null,
      performanceType: 'LABOR',
      recordedAt: new Date('2025-01-11T17:00:00Z'),
      recordedBy: operator.id,
      personnelId: operator.id,
      laborHours: 7.8,
      laborCost: 390.00,
      laborEfficiency: 102.6, // Better than standard
      notes: 'Day 2 production - improved efficiency'
    }
  });

  // Material Performance for WO1
  const materialPerf1 = await prisma.workPerformance.upsert({
    where: { id: 'material-perf-1' },
    update: {},
    create: {
      id: 'material-perf-1',
      workOrderId: workOrder1.id,
      operationId: null,
      performanceType: 'MATERIAL',
      recordedAt: new Date('2025-01-10T17:00:00Z'),
      recordedBy: operator.id,
      partId: titaniumLot1.id,
      quantityConsumed: 52.5, // Consumed 52.5 kg
      quantityPlanned: 50.0,  // Planned 50 kg
      materialVariance: -2.5, // Overrun
      unitCost: 125.00,
      totalCost: 6562.50,
      notes: 'Material overrun due to scrap in first operation'
    }
  });

  // Equipment Performance for WO1
  const equipmentPerf1 = await prisma.workPerformance.upsert({
    where: { id: 'equipment-perf-1' },
    update: {},
    create: {
      id: 'equipment-perf-1',
      workOrderId: workOrder1.id,
      operationId: null,
      performanceType: 'EQUIPMENT',
      recordedAt: new Date('2025-01-10T17:00:00Z'),
      recordedBy: operator.id,
      equipmentId: cncMachine.id,
      setupTime: 45,       // 45 minutes setup
      runTime: 465,        // 465 minutes run time (7.75 hrs)
      plannedSetupTime: 30,
      plannedRunTime: 450,
      notes: 'Setup took 15 min longer than planned due to tool wear'
    }
  });

  // Quality Performance for WO1
  const qualityPerf1 = await prisma.workPerformance.upsert({
    where: { id: 'quality-perf-1' },
    update: {},
    create: {
      id: 'quality-perf-1',
      workOrderId: workOrder1.id,
      operationId: null,
      performanceType: 'QUALITY',
      recordedAt: new Date('2025-01-10T17:00:00Z'),
      recordedBy: operator.id,
      quantityProduced: 20,
      quantityGood: 18,
      quantityScrap: 2,
      quantityRework: 0,
      yieldPercentage: 90.0,
      scrapReason: '2 parts failed dimensional inspection - out of tolerance on critical dimension'
    }
  });

  // Downtime Performance for WO1
  const downtimePerf1 = await prisma.workPerformance.upsert({
    where: { id: 'downtime-perf-1' },
    update: {},
    create: {
      id: 'downtime-perf-1',
      workOrderId: workOrder1.id,
      operationId: null,
      performanceType: 'DOWNTIME',
      recordedAt: new Date('2025-01-10T14:30:00Z'),
      recordedBy: operator.id,
      downtimeMinutes: 30,
      downtimeReason: 'Tool breakage required replacement',
      downtimeCategory: 'BREAKDOWN',
      notes: 'Cutting tool failed mid-operation, replaced with spare'
    }
  });

  // Production Variances

  // Quantity Variance for WO1
  const quantityVariance1 = await prisma.productionVariance.upsert({
    where: { id: 'var-qty-1' },
    update: {},
    create: {
      id: 'var-qty-1',
      workOrderId: workOrder1.id,
      operationId: null,
      varianceType: 'QUANTITY',
      varianceName: 'Day 1 Production Quantity Variance',
      plannedValue: 20,  // Expected 20 units
      actualValue: 18,   // Produced 18 good units
      variance: -2,      // 2 units short
      variancePercent: -10.0,
      isFavorable: false,
      costImpact: 500.00,
      rootCause: 'Scrap due to dimensional tolerance issues - tooling wear suspected',
      correctiveAction: 'Tool inspection and replacement implemented',
      responsibleParty: operator.id,
      calculatedAt: new Date('2025-01-10T17:30:00Z'),
      periodStart: new Date('2025-01-10T10:00:00Z'),
      periodEnd: new Date('2025-01-10T17:00:00Z'),
      isResolved: false,
      notes: 'Engineering investigating root cause of dimensional drift'
    }
  });

  // Time Variance for WO1
  const timeVariance1 = await prisma.productionVariance.upsert({
    where: { id: 'var-time-1' },
    update: {},
    create: {
      id: 'var-time-1',
      workOrderId: workOrder1.id,
      operationId: null,
      varianceType: 'TIME',
      varianceName: 'Setup Time Variance',
      plannedValue: 30,  // 30 min planned setup
      actualValue: 45,   // 45 min actual setup
      variance: 15,      // 15 min over
      variancePercent: 50.0,
      isFavorable: false,
      costImpact: 12.50,  // 0.25 hr * $50/hr
      rootCause: 'Tool wear required additional setup time for alignment',
      correctiveAction: 'Preventive tool replacement scheduled',
      responsibleParty: operator.id,
      calculatedAt: new Date('2025-01-10T10:45:00Z'),
      periodStart: new Date('2025-01-10T10:00:00Z'),
      periodEnd: new Date('2025-01-10T10:45:00Z'),
      isResolved: true,
      resolvedAt: new Date('2025-01-10T11:00:00Z'),
      resolvedBy: adminUser.id
    }
  });

  // Material Variance for WO1
  const materialVariance1 = await prisma.productionVariance.upsert({
    where: { id: 'var-material-1' },
    update: {},
    create: {
      id: 'var-material-1',
      workOrderId: workOrder1.id,
      operationId: null,
      varianceType: 'MATERIAL',
      varianceName: 'Titanium Alloy Material Usage Variance',
      plannedValue: 50.0,  // 50 kg planned
      actualValue: 52.5,   // 52.5 kg actual
      variance: 2.5,       // 2.5 kg overrun
      variancePercent: 5.0,
      isFavorable: false,
      costImpact: 312.50,  // 2.5 kg * $125/kg
      rootCause: 'Higher scrap rate in first operation due to dimensional issues',
      correctiveAction: 'Tool maintenance and operator re-training',
      responsibleParty: operator.id,
      calculatedAt: new Date('2025-01-10T17:30:00Z'),
      periodStart: new Date('2025-01-10T10:00:00Z'),
      periodEnd: new Date('2025-01-10T17:00:00Z'),
      isResolved: false
    }
  });

  // Efficiency Variance for WO1
  const efficiencyVariance1 = await prisma.productionVariance.upsert({
    where: { id: 'var-efficiency-1' },
    update: {},
    create: {
      id: 'var-efficiency-1',
      workOrderId: workOrder1.id,
      operationId: null,
      varianceType: 'EFFICIENCY',
      varianceName: 'Labor Efficiency Variance',
      plannedValue: 8.0,   // 8 standard hours
      actualValue: 8.5,    // 8.5 actual hours
      variance: 0.5,       // 0.5 hrs over
      variancePercent: 6.25,
      isFavorable: false,
      costImpact: 25.00,   // 0.5 hr * $50/hr
      rootCause: 'Extended setup time and downtime for tool replacement',
      correctiveAction: 'Preventive maintenance schedule updated',
      responsibleParty: operator.id,
      calculatedAt: new Date('2025-01-10T17:30:00Z'),
      periodStart: new Date('2025-01-10T10:00:00Z'),
      periodEnd: new Date('2025-01-10T17:00:00Z'),
      isResolved: true,
      resolvedAt: new Date('2025-01-11T08:00:00Z'),
      resolvedBy: adminUser.id,
      notes: 'Day 2 efficiency improved to 102.6% after corrective actions'
    }
  });

  // Yield Variance for WO1
  const yieldVariance1 = await prisma.productionVariance.upsert({
    where: { id: 'var-yield-1' },
    update: {},
    create: {
      id: 'var-yield-1',
      workOrderId: workOrder1.id,
      operationId: null,
      varianceType: 'YIELD',
      varianceName: 'Production Yield Variance',
      plannedValue: 100.0,  // Expected 100% yield (or 20 good from 20 produced)
      actualValue: 90.0,    // Actual 90% yield (18 good from 20 produced)
      variance: -10.0,
      variancePercent: -10.0,
      isFavorable: false,
      costImpact: 500.00,
      rootCause: '10% scrap rate due to dimensional tolerance issues',
      correctiveAction: 'Tool replacement and process parameter review',
      responsibleParty: qualityEngineer.id,
      calculatedAt: new Date('2025-01-10T17:30:00Z'),
      periodStart: new Date('2025-01-10T10:00:00Z'),
      periodEnd: new Date('2025-01-10T17:00:00Z'),
      isResolved: false,
      notes: 'Quality engineering investigating process capability'
    }
  });

  console.log('✅ Production dispatching & execution data created:');
  console.log('   - 6 status history records (WO1: 3, WO2: 3)');
  console.log('   - 2 dispatch logs');
  console.log('   - 7 work performance records (2 labor, 1 material, 1 equipment, 1 quality, 1 downtime, 1 additional labor)');
  console.log('   - 5 production variances (quantity, time, material, efficiency, yield)');

  console.log('🎉 Database seed completed successfully!');

  // Create GE Proficy Historian Integration Configuration
  const proficyHistorianConfig = await prisma.integrationConfig.upsert({
    where: { name: 'proficy_historian' },
    update: {
      displayName: 'GE Proficy Historian',
      type: 'HISTORIAN',
      enabled: true,
      config: {
        baseUrl: process.env.PROFICY_HISTORIAN_URL || 'http://localhost:8080',
        username: process.env.PROFICY_HISTORIAN_USERNAME || 'admin',
        password: process.env.PROFICY_HISTORIAN_PASSWORD || 'password',
        serverName: process.env.PROFICY_HISTORIAN_SERVER || 'DefaultServer',
        authType: process.env.PROFICY_HISTORIAN_AUTH_TYPE || 'basic',
        bufferSize: parseInt(process.env.PROFICY_HISTORIAN_BUFFER_SIZE || '100'),
      },
    },
    create: {
      name: 'proficy_historian',
      displayName: 'GE Proficy Historian',
      type: 'HISTORIAN',
      enabled: false, // Disabled by default until configured
      config: {
        baseUrl: process.env.PROFICY_HISTORIAN_URL || 'http://localhost:8080',
        username: process.env.PROFICY_HISTORIAN_USERNAME || 'admin',
        password: process.env.PROFICY_HISTORIAN_PASSWORD || 'password',
        serverName: process.env.PROFICY_HISTORIAN_SERVER || 'DefaultServer',
        authType: process.env.PROFICY_HISTORIAN_AUTH_TYPE || 'basic',
        bufferSize: parseInt(process.env.PROFICY_HISTORIAN_BUFFER_SIZE || '100'),
      },
    },
  });

  console.log('✅ GE Proficy Historian integration configuration created');

  // ===================================================
  // AEROSPACE INTEGRATION CONFIGURATIONS (AS9100 Rev D)
  // ===================================================

  // IBM Maximo CMMS Configuration
  const maximoConfig = await prisma.integrationConfig.upsert({
    where: { name: 'ibm_maximo' },
    update: {
      displayName: 'IBM Maximo CMMS',
      type: 'CMMS',
      enabled: true,
      config: {
        baseUrl: process.env.MAXIMO_BASE_URL || 'https://your-maximo-server.com',
        username: process.env.MAXIMO_USERNAME || '',
        password: process.env.MAXIMO_PASSWORD || '',
        apiKey: process.env.MAXIMO_API_KEY || '',
        timeout: parseInt(process.env.MAXIMO_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.MAXIMO_RETRY_ATTEMPTS || '3'),
        useOSLC: process.env.MAXIMO_USE_OSLC === 'true',
        oslcVersion: process.env.MAXIMO_OSLC_VERSION || '2.0',
        syncInterval: parseInt(process.env.MAXIMO_SYNC_INTERVAL || '900000'),
        autoCreateWorkOrders: process.env.MAXIMO_AUTO_CREATE_WORK_ORDERS === 'true',
      },
    },
    create: {
      name: 'ibm_maximo',
      displayName: 'IBM Maximo CMMS',
      type: 'CMMS',
      enabled: false, // Disabled by default until configured
      config: {
        baseUrl: 'https://your-maximo-server.com',
        timeout: 30000,
        retryAttempts: 3,
        useOSLC: true,
        oslcVersion: '2.0',
        syncInterval: 900000,
        autoCreateWorkOrders: false,
      },
    },
  });
  console.log('✅ IBM Maximo CMMS integration configuration created');

  // Indysoft Gauge Calibration Configuration
  const indysoftConfig = await prisma.integrationConfig.upsert({
    where: { name: 'indysoft_calibration' },
    update: {
      displayName: 'Indysoft Gauge Calibration',
      type: 'CALIBRATION',
      enabled: true,
      config: {
        baseUrl: process.env.INDYSOFT_BASE_URL || 'https://your-indysoft-server.com',
        username: process.env.INDYSOFT_USERNAME || '',
        password: process.env.INDYSOFT_PASSWORD || '',
        timeout: parseInt(process.env.INDYSOFT_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.INDYSOFT_RETRY_ATTEMPTS || '3'),
        enableISO17025: process.env.INDYSOFT_ENABLE_ISO17025 === 'true',
        enableMSA: process.env.INDYSOFT_ENABLE_MSA === 'true',
        enableGageRR: process.env.INDYSOFT_ENABLE_GAGE_RR === 'true',
        syncInterval: parseInt(process.env.INDYSOFT_SYNC_INTERVAL || '3600000'),
        alertOnOutOfCal: process.env.INDYSOFT_ALERT_ON_OUT_OF_CAL === 'true',
        autoQuarantine: process.env.INDYSOFT_AUTO_QUARANTINE === 'true',
      },
    },
    create: {
      name: 'indysoft_calibration',
      displayName: 'Indysoft Gauge Calibration',
      type: 'CALIBRATION',
      enabled: false, // Disabled by default until configured
      config: {
        baseUrl: 'https://your-indysoft-server.com',
        timeout: 30000,
        retryAttempts: 3,
        enableISO17025: true,
        enableMSA: true,
        enableGageRR: true,
        syncInterval: 3600000,
        alertOnOutOfCal: true,
        autoQuarantine: true,
      },
    },
  });
  console.log('✅ Indysoft Gauge Calibration integration configuration created');

  // Covalent Skills Tracking Configuration
  const covalentConfig = await prisma.integrationConfig.upsert({
    where: { name: 'covalent_skills' },
    update: {
      displayName: 'Covalent Skills Tracking',
      type: 'SKILLS',
      enabled: true,
      config: {
        baseUrl: process.env.COVALENT_BASE_URL || 'https://your-covalent-server.com',
        apiKey: process.env.COVALENT_API_KEY || '',
        timeout: parseInt(process.env.COVALENT_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.COVALENT_RETRY_ATTEMPTS || '3'),
        enableAS9100Compliance: process.env.COVALENT_ENABLE_AS9100_COMPLIANCE === 'true',
        faiInspectorValidation: process.env.COVALENT_FAI_INSPECTOR_VALIDATION === 'true',
        specialProcessTracking: process.env.COVALENT_SPECIAL_PROCESS_TRACKING === 'true',
        syncInterval: parseInt(process.env.COVALENT_SYNC_INTERVAL || '3600000'),
        certExpiryWarningDays: parseInt(process.env.COVALENT_CERT_EXPIRY_WARNING_DAYS || '30'),
      },
    },
    create: {
      name: 'covalent_skills',
      displayName: 'Covalent Skills Tracking',
      type: 'SKILLS',
      enabled: false, // Disabled by default until configured
      config: {
        baseUrl: 'https://your-covalent-server.com',
        timeout: 30000,
        retryAttempts: 3,
        enableAS9100Compliance: true,
        faiInspectorValidation: true,
        specialProcessTracking: true,
        syncInterval: 3600000,
        certExpiryWarningDays: 30,
      },
    },
  });
  console.log('✅ Covalent Skills Tracking integration configuration created');

  // Shop Floor Connect Configuration
  const shopFloorConnectConfig = await prisma.integrationConfig.upsert({
    where: { name: 'shop_floor_connect' },
    update: {
      displayName: 'Shop Floor Connect',
      type: 'SFC',
      enabled: true,
      config: {
        baseUrl: process.env.SHOP_FLOOR_CONNECT_BASE_URL || 'https://your-sfc-server.com',
        username: process.env.SHOP_FLOOR_CONNECT_USERNAME || '',
        password: process.env.SHOP_FLOOR_CONNECT_PASSWORD || '',
        timeout: parseInt(process.env.SHOP_FLOOR_CONNECT_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.SHOP_FLOOR_CONNECT_RETRY_ATTEMPTS || '3'),
        plmIntegration: process.env.SHOP_FLOOR_CONNECT_PLM_INTEGRATION || 'TEAMCENTER',
        enableECOTracking: process.env.SHOP_FLOOR_CONNECT_ENABLE_ECO_TRACKING === 'true',
        enableMBE: process.env.SHOP_FLOOR_CONNECT_ENABLE_MBE === 'true',
        syncInterval: parseInt(process.env.SHOP_FLOOR_CONNECT_SYNC_INTERVAL || '300000'),
        autoVersionCheck: process.env.SHOP_FLOOR_CONNECT_AUTO_VERSION_CHECK === 'true',
      },
    },
    create: {
      name: 'shop_floor_connect',
      displayName: 'Shop Floor Connect',
      type: 'SFC',
      enabled: false, // Disabled by default until configured
      config: {
        baseUrl: 'https://your-sfc-server.com',
        timeout: 30000,
        retryAttempts: 3,
        plmIntegration: 'TEAMCENTER',
        enableECOTracking: true,
        enableMBE: true,
        syncInterval: 300000,
        autoVersionCheck: true,
      },
    },
  });
  console.log('✅ Shop Floor Connect integration configuration created');

  // Predator PDM Configuration
  const predatorPDMConfig = await prisma.integrationConfig.upsert({
    where: { name: 'predator_pdm' },
    update: {
      displayName: 'Predator PDM',
      type: 'PDM',
      enabled: true,
      config: {
        baseUrl: process.env.PREDATOR_PDM_BASE_URL || 'https://your-pdm-server.com',
        username: process.env.PREDATOR_PDM_USERNAME || '',
        password: process.env.PREDATOR_PDM_PASSWORD || '',
        timeout: parseInt(process.env.PREDATOR_PDM_TIMEOUT || '30000'),
        retryAttempts: parseInt(process.env.PREDATOR_PDM_RETRY_ATTEMPTS || '3'),
        enableMBE: process.env.PREDATOR_PDM_ENABLE_MBE === 'true',
        enableReqIF: process.env.PREDATOR_PDM_ENABLE_REQIF === 'true',
        autoVersioning: process.env.PREDATOR_PDM_AUTO_VERSIONING === 'true',
      },
    },
    create: {
      name: 'predator_pdm',
      displayName: 'Predator PDM',
      type: 'PDM',
      enabled: false, // Disabled by default until configured
      config: {
        baseUrl: 'https://your-pdm-server.com',
        timeout: 30000,
        retryAttempts: 3,
        enableMBE: true,
        enableReqIF: true,
        autoVersioning: true,
      },
    },
  });
  console.log('✅ Predator PDM integration configuration created');

  // Predator DNC Configuration
  const predatorDNCConfig = await prisma.integrationConfig.upsert({
    where: { name: 'predator_dnc' },
    update: {
      displayName: 'Predator DNC',
      type: 'DNC',
      enabled: true,
      config: {
        baseUrl: process.env.PREDATOR_DNC_BASE_URL || 'https://your-dnc-server.com',
        username: process.env.PREDATOR_DNC_USERNAME || '',
        password: process.env.PREDATOR_DNC_PASSWORD || '',
        timeout: parseInt(process.env.PREDATOR_DNC_TIMEOUT || '60000'),
        retryAttempts: parseInt(process.env.PREDATOR_DNC_RETRY_ATTEMPTS || '3'),
        enableAuthorizationHandshake: process.env.PREDATOR_DNC_ENABLE_AUTHORIZATION_HANDSHAKE === 'true',
        enableOperatorValidation: process.env.PREDATOR_DNC_ENABLE_OPERATOR_VALIDATION === 'true',
        enableProgramVersioning: process.env.PREDATOR_DNC_ENABLE_PROGRAM_VERSIONING === 'true',
        enableGaugeValidation: process.env.PREDATOR_DNC_ENABLE_GAUGE_VALIDATION === 'true',
        alertOnAuthorizationFailure: process.env.PREDATOR_DNC_ALERT_ON_AUTHORIZATION_FAILURE === 'true',
        mtconnectEnabled: process.env.PREDATOR_DNC_MTCONNECT_ENABLED === 'true',
      },
    },
    create: {
      name: 'predator_dnc',
      displayName: 'Predator DNC',
      type: 'DNC',
      enabled: false, // Disabled by default until configured
      config: {
        baseUrl: 'https://your-dnc-server.com',
        timeout: 60000,
        retryAttempts: 3,
        enableAuthorizationHandshake: true,
        enableOperatorValidation: true,
        enableProgramVersioning: true,
        enableGaugeValidation: true,
        alertOnAuthorizationFailure: true,
        mtconnectEnabled: true,
      },
    },
  });
  console.log('✅ Predator DNC integration configuration created');

  console.log('\n📊 Seed Summary:');
  console.log(`👥 Users: ${await prisma.user.count()}`);
  console.log(`🏭 Sites: ${await prisma.site.count()}`);
  console.log(`📍 Areas: ${await prisma.area.count()}`);
  console.log(`🏭 Work Centers: ${await prisma.workCenter.count()}`);
  console.log(`🔧 Parts: ${await prisma.part.count()}`);
  console.log(`📋 Work Orders: ${await prisma.workOrder.count()} (CREATED: 1, IN_PROGRESS: 2, RELEASED: 1, COMPLETED: 1)`);
  console.log(`🔍 Quality Plans: ${await prisma.qualityPlan.count()}`);
  console.log(`📝 Quality Inspections: ${await prisma.qualityInspection.count()}`);
  console.log(`⚠️  NCRs: ${await prisma.nCR.count()}`);
  console.log(`🏗️  Equipment: ${await prisma.equipment.count()}`);
  console.log(`🔢 Serialized Parts: ${await prisma.serializedPart.count()}`);
  console.log(`📦 Inventory Items: ${await prisma.inventory.count()}`);
  console.log(`\n👤 ISA-95 Personnel Hierarchy:`);
  console.log(`   📊 Personnel Classes: ${await prisma.personnelClass.count()}`);
  console.log(`   📜 Qualifications: ${await prisma.personnelQualification.count()}`);
  console.log(`   🎓 Certifications: ${await prisma.personnelCertification.count()}`);
  console.log(`   🔧 Skills: ${await prisma.personnelSkill.count()}`);
  console.log(`   📈 Skill Assignments: ${await prisma.personnelSkillAssignment.count()}`);
  console.log(`   🏭 Work Center Assignments: ${await prisma.personnelWorkCenterAssignment.count()}`);
  console.log(`   📅 Availability Records: ${await prisma.personnelAvailability.count()}`);
  console.log(`\n📦 ISA-95 Material Hierarchy:`);
  console.log(`   🏷️  Material Classes: ${await prisma.materialClass.count()}`);
  console.log(`   📋 Material Definitions: ${await prisma.materialDefinition.count()}`);
  console.log(`   🔬 Material Properties: ${await prisma.materialProperty.count()}`);
  console.log(`   📦 Material Lots: ${await prisma.materialLot.count()}`);
  console.log(`   🔀 Material Sublots: ${await prisma.materialSublot.count()}`);
  console.log(`   🔗 Lot Genealogy Records: ${await prisma.materialLotGenealogy.count()}`);
  console.log(`   📊 State History Records: ${await prisma.materialStateHistory.count()}`);
  console.log(`\n⚙️  ISA-95 Process Segment Hierarchy:`);
  console.log(`   📋 Process Segments: ${await prisma.processSegment.count()}`);
  console.log(`   🔧 Segment Parameters: ${await prisma.processSegmentParameter.count()}`);
  console.log(`   🔗 Segment Dependencies: ${await prisma.processSegmentDependency.count()}`);
  console.log(`   👥 Personnel Specifications: ${await prisma.personnelSegmentSpecification.count()}`);
  console.log(`   🏭 Equipment Specifications: ${await prisma.equipmentSegmentSpecification.count()}`);
  console.log(`   📦 Material Specifications: ${await prisma.materialSegmentSpecification.count()}`);
  console.log(`   🔨 Physical Asset Specifications: ${await prisma.physicalAssetSegmentSpecification.count()}`);
  console.log(`\n📅 ISA-95 Production Scheduling:`);
  console.log(`   📋 Production Schedules: ${await prisma.productionSchedule.count()}`);
  console.log(`   📝 Schedule Entries: ${await prisma.scheduleEntry.count()}`);
  console.log(`   ⚠️  Schedule Constraints: ${await prisma.scheduleConstraint.count()}`);
  console.log(`   📊 State History Records: ${await prisma.scheduleStateHistory.count()}`);
  console.log(`\n🏭 ISA-95 Production Dispatching & Execution:`);
  console.log(`   📊 Work Order Status History: ${await prisma.workOrderStatusHistory.count()}`);
  console.log(`   🚀 Dispatch Logs: ${await prisma.dispatchLog.count()}`);
  console.log(`   ⚙️  Work Performance Records: ${await prisma.workPerformance.count()}`);
  console.log(`   📉 Production Variances: ${await prisma.productionVariance.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });