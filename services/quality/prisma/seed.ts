/**
 * Quality Service Seed Script
 * Populates quality database with plans, inspections, FAI, and NCR data
 */

import { PrismaClient } from '../../../node_modules/.prisma/client-quality';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Quality Service database...');

  // User IDs from Auth Service
  const ADMIN_USER_ID = 'admin-user-id';
  const QC_INSPECTOR_ID = 'qc-inspector-id';
  const SUPERVISOR_USER_ID = 'supervisor-user-id';

  // Part IDs from Resource Service
  const PART_ID_BRACKET = 'part-bracket-001';
  const PART_ID_SHAFT = 'part-shaft-002';

  // Work Order IDs from Work Order Service
  const WORK_ORDER_ID = 'wo-2025-001';

  // 1. Create Quality Plans
  const qualityPlan1 = await prisma.qualityPlan.upsert({
    where: { planNumber: 'QP-BRK-001' },
    update: {},
    create: {
      planNumber: 'QP-BRK-001',
      planName: 'Bracket Final Inspection',
      description: 'Final inspection quality plan for machined aluminum bracket',
      partId: PART_ID_BRACKET,
      partNumber: 'BRK-001',
      inspectionType: 'FINAL',
      samplingPlan: 'FIRST_LAST',
      sampleSize: 2,
      acceptanceLevel: 0.0,
      version: '1.0',
      isActive: true,
      effectiveDate: new Date('2025-01-01'),
      createdById: ADMIN_USER_ID,
      updatedById: ADMIN_USER_ID,
    },
  });

  console.log(`✅ Created quality plan: ${qualityPlan1.planNumber}`);

  // 2. Create Quality Characteristics
  const char1 = await prisma.qualityCharacteristic.create({
    data: {
      planId: qualityPlan1.id,
      characteristicNumber: 10,
      characteristicName: 'Overall Length',
      description: 'Total length of bracket',
      characteristicType: 'DIMENSIONAL',
      nominalValue: 6.000,
      lowerTolerance: -0.005,
      upperTolerance: 0.005,
      unit: 'IN',
      isCritical: true,
      measurementMethod: 'Micrometer',
      measurementEquipment: 'MITU-001',
      inspectionFrequency: 'FIRST_LAST',
    },
  });

  const char2 = await prisma.qualityCharacteristic.create({
    data: {
      planId: qualityPlan1.id,
      characteristicNumber: 20,
      characteristicName: 'Hole Diameter',
      description: 'Mounting hole diameter',
      characteristicType: 'DIMENSIONAL',
      nominalValue: 0.500,
      lowerTolerance: -0.002,
      upperTolerance: 0.002,
      unit: 'IN',
      isCritical: false,
      isMajor: true,
      measurementMethod: 'Pin Gauge',
      measurementEquipment: 'PG-500',
      inspectionFrequency: 'SAMPLE',
    },
  });

  const char3 = await prisma.qualityCharacteristic.create({
    data: {
      planId: qualityPlan1.id,
      characteristicNumber: 30,
      characteristicName: 'Surface Finish',
      description: 'Surface finish on machined faces',
      characteristicType: 'VISUAL',
      acceptableCriteria: 'No visible tool marks, smooth finish',
      rejectionCriteria: 'Visible gouges, deep scratches, or rough finish',
      isCritical: false,
      isMinor: true,
      measurementMethod: 'Visual inspection',
      inspectionFrequency: 'EACH',
    },
  });

  console.log(`✅ Created ${3} quality characteristics`);

  // 3. Create Quality Inspections
  const inspection1 = await prisma.qualityInspection.upsert({
    where: { inspectionNumber: 'INS-2025-001' },
    update: {},
    create: {
      inspectionNumber: 'INS-2025-001',
      planId: qualityPlan1.id,
      workOrderId: WORK_ORDER_ID,
      partId: PART_ID_BRACKET,
      lotNumber: 'LOT-2025-002',
      inspectionType: 'FINAL',
      inspectionDate: new Date('2025-10-07T14:00:00Z'),
      inspectorId: QC_INSPECTOR_ID,
      status: 'COMPLETED',
      result: 'PASS',
      quantityInspected: 2,
      quantityAccepted: 2,
      quantityRejected: 0,
      ncrGenerated: false,
      notes: 'First and last piece inspection passed all criteria',
      attachmentUrls: [],
    },
  });

  console.log(`✅ Created inspection: ${inspection1.inspectionNumber}`);

  // 4. Create Quality Measurements
  await prisma.qualityMeasurement.create({
    data: {
      inspectionId: inspection1.id,
      characteristicId: char1.id,
      measuredValue: 6.002,
      result: 'PASS',
      deviation: 0.002,
      deviationPercent: 0.033,
      measuredBy: QC_INSPECTOR_ID,
      measurementEquipment: 'MITU-001',
      measurementMethod: 'Micrometer',
      notes: 'First piece - within tolerance',
    },
  });

  await prisma.qualityMeasurement.create({
    data: {
      inspectionId: inspection1.id,
      characteristicId: char2.id,
      measuredValue: 0.5005,
      result: 'PASS',
      deviation: 0.0005,
      deviationPercent: 0.1,
      measuredBy: QC_INSPECTOR_ID,
      measurementEquipment: 'PG-500',
      measurementMethod: 'Pin Gauge',
      notes: 'Within specification',
    },
  });

  console.log(`✅ Created ${2} quality measurements`);

  // 5. Create NCR (Non-Conformance Report)
  const ncr1 = await prisma.nCR.upsert({
    where: { ncrNumber: 'NCR-2025-001' },
    update: {},
    create: {
      ncrNumber: 'NCR-2025-001',
      partId: PART_ID_BRACKET,
      workOrderId: WORK_ORDER_ID,
      lotNumber: 'LOT-2025-001',
      ncrType: 'INTERNAL',
      severity: 'MINOR',
      status: 'CLOSED',
      problemDescription: 'Three parts found with surface finish below specification due to worn cutting tool',
      rootCause: 'Cutting tool exceeded recommended tool life. Tool change interval not followed.',
      quantityAffected: 3,
      disposition: 'SCRAP',
      dispositionDate: new Date('2025-10-06T10:00:00Z'),
      dispositionBy: SUPERVISOR_USER_ID,
      dispositionNotes: 'Parts scrapped. Tool replaced.',
      scrapCost: 47.25,
      reworkCost: 0,
      totalCost: 47.25,
      containmentAction: 'All parts in lot inspected. Implemented tool life tracking.',
      containmentDate: new Date('2025-10-06T11:00:00Z'),
      correctiveAction: 'Implement automatic tool life counter on CNC machine',
      correctiveActionDue: new Date('2025-10-20'),
      correctiveActionComplete: true,
      correctiveActionDate: new Date('2025-10-18'),
      preventiveAction: 'Add tool life tracking to all CNC machines',
      preventiveActionComplete: false,
      createdById: QC_INSPECTOR_ID,
      assignedToId: SUPERVISOR_USER_ID,
    },
  });

  console.log(`✅ Created NCR: ${ncr1.ncrNumber}`);

  // 6. Create FAI Report
  const faiReport1 = await prisma.fAIReport.upsert({
    where: { faiNumber: 'FAI-SFT-002-REV-B' },
    update: {},
    create: {
      faiNumber: 'FAI-SFT-002-REV-B',
      partId: PART_ID_SHAFT,
      partNumber: 'SFT-002',
      partRevision: 'B',
      serialNumber: 'SFT-002-SN-00001',
      faiType: 'FULL',
      reason: 'ENGINEERING_CHANGE',
      status: 'APPROVED',
      inspectionDate: new Date('2025-10-12'),
      submittedDate: new Date('2025-10-13'),
      approvedDate: new Date('2025-10-14'),
      inspectedBy: QC_INSPECTOR_ID,
      submittedBy: QC_INSPECTOR_ID,
      approvedBy: ADMIN_USER_ID,
      result: 'PASS',
      quantityInspected: 1,
      attachmentUrls: ['https://example.com/fai/SFT-002-REV-B.pdf'],
      drawingUrls: ['https://example.com/drawings/SFT-002-REV-B.pdf'],
      notes: 'Full dimensional layout completed. All characteristics within specification.',
    },
  });

  console.log(`✅ Created FAI report: ${faiReport1.faiNumber}`);

  // 7. Create FAI Characteristics
  await prisma.fAICharacteristic.create({
    data: {
      faiReportId: faiReport1.id,
      characteristicNumber: 1,
      characteristicName: 'Shaft Diameter',
      specification: '1.000 +0.000/-0.002',
      nominalValue: 1.000,
      lowerTolerance: -0.002,
      upperTolerance: 0.000,
      unit: 'IN',
      measuredValue: 0.9995,
      deviation: -0.0005,
      result: 'PASS',
      measurementMethod: 'Micrometer',
      measurementEquipment: 'MITU-002',
      balloonNumber: '1',
      notes: 'Measured at 3 locations, average reported',
    },
  });

  await prisma.fAICharacteristic.create({
    data: {
      faiReportId: faiReport1.id,
      characteristicNumber: 2,
      characteristicName: 'Overall Length',
      specification: '12.000 ±0.010',
      nominalValue: 12.000,
      lowerTolerance: -0.010,
      upperTolerance: 0.010,
      unit: 'IN',
      measuredValue: 12.003,
      deviation: 0.003,
      result: 'PASS',
      measurementMethod: 'Caliper',
      measurementEquipment: 'CAL-001',
      balloonNumber: '2',
    },
  });

  console.log(`✅ Created ${2} FAI characteristics`);

  // 8. Create Electronic Signature
  // NOTE: Commented out due to polymorphic foreign key constraint issue
  // The ElectronicSignature model has multiple foreign keys on the same recordId field
  // which causes conflicts. This needs schema redesign to fix properly.
  /*
  await prisma.electronicSignature.create({
    data: {
      signatureType: 'APPROVED',
      meaning: 'Approved for production',
      signedById: ADMIN_USER_ID,
      signedByName: 'System Administrator',
      signedByTitle: 'Quality Manager',
      ipAddress: '192.168.1.100',
      signatureHash: 'sha256:abcd1234...',
      signatureReason: 'FAI approved after engineering review',
      recordType: 'FAIReport',
      recordId: faiReport1.id,
      isVerified: true,
      verificationCode: 'VER-FAI-001',
    },
  });

  console.log(`✅ Created electronic signature`);
  */

  // 9. Create QIF Measurement Plan
  const qifPlan = await prisma.qIFMeasurementPlan.create({
    data: {
      planId: 'QIF-PLAN-001',
      qifVersion: '3.0',
      qifFileUrl: 'https://example.com/qif/plan-001.qif',
      partId: PART_ID_SHAFT,
      partNumber: 'SFT-002',
      importedBy: ADMIN_USER_ID,
    },
  });

  console.log(`✅ Created QIF measurement plan`);

  console.log('\n📊 Seed Summary:');
  const planCount = await prisma.qualityPlan.count();
  const charCount = await prisma.qualityCharacteristic.count();
  const inspectionCount = await prisma.qualityInspection.count();
  const measurementCount = await prisma.qualityMeasurement.count();
  const ncrCount = await prisma.nCR.count();
  const faiCount = await prisma.fAIReport.count();

  console.log(`  - Quality Plans: ${planCount}`);
  console.log(`  - Characteristics: ${charCount}`);
  console.log(`  - Inspections: ${inspectionCount}`);
  console.log(`  - Measurements: ${measurementCount}`);
  console.log(`  - NCRs: ${ncrCount}`);
  console.log(`  - FAI Reports: ${faiCount}`);
  console.log('\n✅ Quality Service database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
