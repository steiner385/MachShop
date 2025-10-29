/**
 * Enhanced Comprehensive Seed Data Script
 * Issue #162: Testing Infrastructure: Comprehensive Development Environment Seed Data Enhancement
 *
 * This script enhances the existing seed data with comprehensive coverage of all 7 manufacturing modalities
 */

import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { DEMO_USERS, DEMO_PASSWORD, validateDemoCredentials } from '../src/config/demoCredentials';
import { ManufacturingModalityGenerator } from './seed-generators';
import {
  DEFAULT_SEED_CONFIG,
  COMPREHENSIVE_SEED_CONFIG,
  MANUFACTURING_MODALITIES
} from './seed-framework';

const prisma = new PrismaClient();

function generateUniqueSuffix(): string {
  // Extract project-specific part from database name
  const projectSuffix = process.env.DATABASE_URL?.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '';
  const timestamp = Date.now().toString().slice(-6);
  return `${projectSuffix}-${timestamp}`.toUpperCase();
}

async function main() {
  console.log('🚀 Starting Enhanced Comprehensive Seed Data Generation...');
  console.log('📊 Issue #162: Testing Infrastructure Enhancement');

  const uniqueSuffix = generateUniqueSuffix();
  console.log(`🏷️  Unique Suffix: ${uniqueSuffix}`);

  // Validate demo credentials
  validateDemoCredentials();

  // Determine configuration based on environment
  const config = process.env.COMPREHENSIVE_SEED === 'true'
    ? COMPREHENSIVE_SEED_CONFIG
    : DEFAULT_SEED_CONFIG;

  console.log(`⚙️  Configuration: ${process.env.COMPREHENSIVE_SEED === 'true' ? 'COMPREHENSIVE' : 'DEFAULT'}`);
  console.log(`📈 Scale Factor: ${config.scaleFactor}x`);
  console.log(`🏭 Manufacturing Modalities: ${config.modalitiesPerSite.length} of 7`);

  // Initialize the generator
  const generator = new ManufacturingModalityGenerator(prisma, config);

  // ===========================================================================
  // PHASE 1: FOUNDATIONAL DATA (Enhanced from existing seed)
  // ===========================================================================
  console.log('\n📋 PHASE 1: Foundational Data Setup');

  // Create demo users (keeping existing structure)
  console.log('👥 Creating demo users...');
  const createdUsers = [];

  for (const demoUser of DEMO_USERS) {
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 10);

    const user = await prisma.user.upsert({
      where: { username: demoUser.username },
      create: {
        username: demoUser.username,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        passwordHash: hashedPassword,
        role: demoUser.role,
        isActive: true,
        createdAt: new Date()
      },
      update: {
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        role: demoUser.role,
        isActive: true
      }
    });

    createdUsers.push(user);
  }
  console.log(`✅ Created ${createdUsers.length} demo users`);

  // Create enterprises
  console.log('🏢 Creating enterprises...');
  const enterprises = [];

  for (let i = 0; i < config.enterpriseCount; i++) {
    const enterprise = await prisma.enterprise.upsert({
      where: { enterpriseCode: `ENT${(i + 1).toString().padStart(2, '0')}-${uniqueSuffix}` },
      create: {
        enterpriseCode: `ENT${(i + 1).toString().padStart(2, '0')}-${uniqueSuffix}`,
        enterpriseName: `Advanced Manufacturing Enterprise ${i + 1}`,
        description: 'Multi-modal aerospace manufacturing corporation',
        headquarters: '123 Manufacturing Drive, Industrial City, USA',
        isActive: true
      },
      update: {
        enterpriseName: `Advanced Manufacturing Enterprise ${i + 1}`,
        description: 'Multi-modal aerospace manufacturing corporation',
        headquarters: '123 Manufacturing Drive, Industrial City, USA'
      }
    });

    enterprises.push(enterprise);
  }
  console.log(`✅ Created ${enterprises.length} enterprises`);

  // ===========================================================================
  // PHASE 2: MANUFACTURING MODALITIES IMPLEMENTATION
  // ===========================================================================
  console.log('\n🏭 PHASE 2: Manufacturing Modalities Implementation');

  const allGeneratedData = {
    sites: [],
    areas: [],
    workCenters: [],
    equipment: [],
    materials: [],
    parts: [],
    workOrders: [],
    qualityPlans: [],
    routings: []
  };

  // Generate sites and manufacturing areas for each enterprise
  for (let enterpriseIndex = 0; enterpriseIndex < enterprises.length; enterpriseIndex++) {
    const enterprise = enterprises[enterpriseIndex];
    console.log(`\n🏢 Processing Enterprise ${enterpriseIndex + 1}: ${enterprise.enterpriseName}`);

    // Generate sites for this enterprise
    for (let siteIndex = 0; siteIndex < config.sitesPerEnterprise; siteIndex++) {
      console.log(`  🏭 Generating Site ${siteIndex + 1}...`);

      const { site, areas } = await generator.generateManufacturingSite(
        enterprise.id,
        siteIndex,
        config.modalitiesPerSite
      );

      allGeneratedData.sites.push(site);
      allGeneratedData.areas.push(...areas);

      // Aggregate all data from areas
      for (const areaData of areas) {
        allGeneratedData.workCenters.push(...areaData.workCenters);
        allGeneratedData.equipment.push(...areaData.equipment);
        allGeneratedData.materials.push(...areaData.materials);
        allGeneratedData.parts.push(...areaData.parts);
        allGeneratedData.workOrders.push(...areaData.workOrders);
        allGeneratedData.qualityPlans.push(...areaData.qualityPlans);
        allGeneratedData.routings.push(...areaData.routings);
      }

      console.log(`    ✅ Site ${siteIndex + 1} complete - ${config.modalitiesPerSite.length} modalities`);
    }
  }

  // ===========================================================================
  // PHASE 3: ADVANCED TEST SCENARIOS
  // ===========================================================================
  console.log('\n🧪 PHASE 3: Advanced Test Scenarios');

  // Generate personnel classifications and assignments
  console.log('👥 Generating personnel structure...');
  await generatePersonnelStructure(createdUsers, allGeneratedData.areas);

  // Generate production schedules
  console.log('📅 Generating production schedules...');
  await generateProductionSchedules(allGeneratedData.parts, allGeneratedData.workOrders);

  // Generate quality data and inspections
  console.log('🔍 Generating quality data...');
  await generateQualityInspections(allGeneratedData.qualityPlans, allGeneratedData.workOrders, createdUsers);

  // Generate material transactions and genealogy
  console.log('📦 Generating material transactions...');
  await generateMaterialTransactions(allGeneratedData.materials, allGeneratedData.workOrders, createdUsers);

  // Generate equipment maintenance and metrics
  console.log('🔧 Generating equipment maintenance data...');
  await generateEquipmentMaintenance(allGeneratedData.equipment, createdUsers);

  // ===========================================================================
  // PHASE 4: REPORTING AND VALIDATION
  // ===========================================================================
  console.log('\n📊 PHASE 4: Final Reporting');

  // Generate comprehensive report
  const report = await generateSeedDataReport();

  console.log('\n' + '='.repeat(80));
  console.log('🎉 ENHANCED SEED DATA GENERATION COMPLETE');
  console.log('='.repeat(80));
  console.log(`📈 Configuration: ${config.scaleFactor}x scale factor`);
  console.log(`🏭 Manufacturing Modalities: ${config.modalitiesPerSite.length}/7 implemented`);
  console.log(`🏢 Enterprises: ${report.enterprises}`);
  console.log(`🏭 Sites: ${report.sites}`);
  console.log(`🔧 Work Centers: ${report.workCenters}`);
  console.log(`⚙️  Equipment: ${report.equipment}`);
  console.log(`📦 Materials: ${report.materials}`);
  console.log(`🔩 Parts: ${report.parts}`);
  console.log(`📋 Work Orders: ${report.workOrders}`);
  console.log(`✅ Quality Plans: ${report.qualityPlans}`);
  console.log(`🛣️  Routings: ${report.routings}`);
  console.log(`👥 Users: ${report.users}`);
  console.log('='.repeat(80));

  // Generate modality coverage report
  console.log('\n📋 MANUFACTURING MODALITY COVERAGE:');
  for (const modalityName of config.modalitiesPerSite) {
    const modality = MANUFACTURING_MODALITIES[modalityName];
    console.log(`✅ ${modality.name} (${modality.code})`);
    console.log(`   - Equipment Types: ${modality.equipmentTypes.length}`);
    console.log(`   - Material Types: ${modality.materialTypes.length}`);
    console.log(`   - Part Categories: ${modality.partCategories.length}`);
  }

  const notImplemented = Object.keys(MANUFACTURING_MODALITIES)
    .filter(key => !config.modalitiesPerSite.includes(key));

  if (notImplemented.length > 0) {
    console.log('\n⏳ NOT YET IMPLEMENTED:');
    for (const modalityName of notImplemented) {
      const modality = MANUFACTURING_MODALITIES[modalityName];
      console.log(`⚪ ${modality.name} (${modality.code})`);
    }
    console.log('\n💡 Set COMPREHENSIVE_SEED=true to enable all modalities');
  }

  console.log('\n🚀 System ready for comprehensive MES testing!');
}

// ===========================================================================
// HELPER FUNCTIONS FOR ADVANCED SCENARIOS
// ===========================================================================

async function generatePersonnelStructure(users: any[], areas: any[]) {
  // Create personnel classes
  const personnelClasses = ['Operator', 'Technician', 'Engineer', 'Supervisor', 'Manager'];

  for (const className of personnelClasses) {
    await prisma.personnelClass.upsert({
      where: { className },
      create: {
        className,
        description: `${className} personnel classification`,
        requiredCertifications: className === 'Engineer' ? ['Engineering Degree'] : ['Basic Safety'],
        isActive: true
      },
      update: {
        description: `${className} personnel classification`
      }
    });
  }

  // Assign users to areas and classes
  for (let i = 0; i < users.length; i++) {
    const user = users[i];
    const area = areas[i % areas.length]?.area;

    if (area) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          primaryAreaId: area.id
        }
      });
    }
  }
}

async function generateProductionSchedules(parts: any[], workOrders: any[]) {
  const scheduleName = `Production Schedule ${new Date().toISOString().slice(0, 7)}`;

  const schedule = await prisma.productionSchedule.upsert({
    where: { scheduleName },
    create: {
      scheduleName,
      description: 'Monthly production schedule covering all manufacturing modalities',
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'ACTIVE',
      isActive: true
    },
    update: {
      description: 'Monthly production schedule covering all manufacturing modalities'
    }
  });

  // Create schedule items for active work orders
  const activeWorkOrders = workOrders.filter(wo => wo.status === 'RELEASED' || wo.status === 'IN_PROGRESS');

  for (const workOrder of activeWorkOrders.slice(0, 20)) { // Limit to 20 for performance
    await prisma.scheduleItem.upsert({
      where: {
        scheduleId_workOrderId: {
          scheduleId: schedule.id,
          workOrderId: workOrder.id
        }
      },
      create: {
        scheduleId: schedule.id,
        workOrderId: workOrder.id,
        plannedStartDate: workOrder.plannedStartDate,
        plannedEndDate: workOrder.plannedEndDate,
        actualStartDate: workOrder.actualStartDate,
        actualEndDate: workOrder.actualEndDate,
        priority: workOrder.priority,
        status: 'SCHEDULED'
      },
      update: {
        status: 'SCHEDULED'
      }
    });
  }
}

async function generateQualityInspections(qualityPlans: any[], workOrders: any[], users: any[]) {
  const qualityInspector = users.find(u => u.role === 'QUALITY') || users[0];

  for (const qualityPlan of qualityPlans.slice(0, 10)) { // Limit for performance
    await prisma.qualityInspection.create({
      data: {
        inspectionNumber: `QI-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        qualityPlanId: qualityPlan.id,
        inspectorId: qualityInspector.id,
        inspectionDate: new Date(),
        status: 'COMPLETED',
        overallResult: 'PASS',
        notes: 'Automated seed data quality inspection'
      }
    });
  }
}

async function generateMaterialTransactions(materials: any[], workOrders: any[], users: any[]) {
  const user = users[0];

  for (const material of materials.slice(0, 20)) { // Limit for performance
    if (material.lot) {
      await prisma.materialTransaction.create({
        data: {
          transactionNumber: `MT-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          materialLotId: material.lot.id,
          transactionType: 'ISSUE',
          quantity: Math.random() * 10,
          unitOfMeasure: material.lot.unitOfMeasure,
          transactionDate: new Date(),
          reason: 'Production issue for seed data',
          performedById: user.id
        }
      });
    }
  }
}

async function generateEquipmentMaintenance(equipment: any[], users: any[]) {
  const maintenanceUser = users.find(u => u.role === 'MAINTENANCE') || users[0];

  for (const equipmentItem of equipment.slice(0, 15)) { // Limit for performance
    await prisma.maintenanceRecord.create({
      data: {
        recordNumber: `MR-${Date.now()}-${Math.random().toString(36).substring(7)}`,
        equipmentId: equipmentItem.id,
        maintenanceType: 'PREVENTIVE',
        description: 'Routine preventive maintenance',
        scheduledDate: new Date(),
        completedDate: new Date(),
        status: 'COMPLETED',
        performedById: maintenanceUser.id,
        laborHours: Math.random() * 4 + 1,
        cost: Math.random() * 500 + 100
      }
    });
  }
}

async function generateSeedDataReport() {
  const [
    enterprises,
    sites,
    areas,
    workCenters,
    equipment,
    materials,
    parts,
    workOrders,
    qualityPlans,
    routings,
    users
  ] = await Promise.all([
    prisma.enterprise.count(),
    prisma.site.count(),
    prisma.area.count(),
    prisma.workCenter.count(),
    prisma.equipment.count(),
    prisma.materialDefinition.count(),
    prisma.part.count(),
    prisma.workOrder.count(),
    prisma.qualityPlan.count(),
    prisma.routing.count(),
    prisma.user.count()
  ]);

  return {
    enterprises,
    sites,
    areas,
    workCenters,
    equipment,
    materials,
    parts,
    workOrders,
    qualityPlans,
    routings,
    users
  };
}

// ===========================================================================
// EXECUTION
// ===========================================================================

main()
  .catch((e) => {
    console.error('❌ Error during seed data generation:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });