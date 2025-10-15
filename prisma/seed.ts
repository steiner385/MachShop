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
  // First, check if routing exists and handle operations
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
      createdById: adminUser.id,
      assignedToId: operator.id,
      startedAt: new Date('2024-01-15T08:00:00Z'),
      completedAt: new Date('2024-01-28T16:30:00Z')
    }
  });

  console.log('✅ Work orders created');

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

  // Create equipment using upsert
  const cncMachine = await prisma.equipment.upsert({
    where: { equipmentNumber: 'CNC-001' },
    update: {
      name: 'DMG MORI 5-Axis Machining Center',
      description: 'High precision 5-axis CNC machine',
      manufacturer: 'DMG MORI',
      model: 'DMU 50 3rd Generation',
      serialNumber: 'DMG-2023-001',
      workCenterId: machiningCenter.id,
      status: 'IN_USE'
    },
    create: {
      equipmentNumber: 'CNC-001',
      name: 'DMG MORI 5-Axis Machining Center',
      description: 'High precision 5-axis CNC machine',
      manufacturer: 'DMG MORI',
      model: 'DMU 50 3rd Generation',
      serialNumber: 'DMG-2023-001',
      workCenterId: machiningCenter.id,
      status: 'IN_USE'
    }
  });

  console.log('✅ Equipment created');

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

  console.log('✅ Serialized parts created');

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

  console.log('🎉 Database seed completed successfully!');
  
  console.log('\n📊 Seed Summary:');
  console.log(`👥 Users: ${await prisma.user.count()}`);
  console.log(`🏭 Work Centers: ${await prisma.workCenter.count()}`);
  console.log(`🔧 Parts: ${await prisma.part.count()}`);
  console.log(`📋 Work Orders: ${await prisma.workOrder.count()}`);
  console.log(`🔍 Quality Plans: ${await prisma.qualityPlan.count()}`);
  console.log(`📝 Quality Inspections: ${await prisma.qualityInspection.count()}`);
  console.log(`⚠️  NCRs: ${await prisma.nCR.count()}`);
  console.log(`🏗️  Equipment: ${await prisma.equipment.count()}`);
  console.log(`🔢 Serialized Parts: ${await prisma.serializedPart.count()}`);
  console.log(`📦 Inventory Items: ${await prisma.inventory.count()}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });