import { PrismaClient } from '@prisma/client';
import {
  TorqueMethod,
  TorquePattern
} from '../../src/types/torque';
import { seedTorqueWrenchesAndRules } from './seed-torque-wrenches-and-rules';

const prisma = new PrismaClient();

// Generate unique suffix from database name for parallel test execution
function generateUniqueSuffix(): string {
  const databaseUrl = process.env.DATABASE_URL || '';
  const match = databaseUrl.match(/\/([^/?]+)(\?|$)/);
  const dbName = match ? match[1] : 'default';
  const projectPart = dbName.replace(/^mes_e2e_db_/, '');
  const timestamp = Date.now().toString().slice(-6);
  const projectHash = projectPart.slice(0, 4).padEnd(4, '0');
  return `${timestamp}${projectHash}`;
}

// Safe logging for parallel execution
function safeLog(message: string): void {
  try {
    console.log(message);
  } catch (error: any) {
    if (error?.code === 'EPIPE' || error?.errno === -32) {
      return;
    }
    throw error;
  }
}

// Sample torque specifications for different engine assembly scenarios
const torqueSpecifications = [
  {
    id: 'torque-spec-001',
    name: 'Cylinder Head Bolts - V8 Engine',
    operationId: 'op-cylinder-head-001',
    partId: 'part-cylinder-head-v8',
    torqueValue: 95.0,
    toleranceLower: 90.0,
    toleranceUpper: 100.0,
    targetValue: 95.0,
    method: TorqueMethod.TORQUE_ANGLE,
    pattern: TorquePattern.STAR,
    unit: 'Nm',
    numberOfPasses: 3,
    angleSpec: 180.0,
    angleToleranceLower: 175.0,
    angleToleranceUpper: 185.0,
    fastenerType: 'M12x1.75',
    fastenerGrade: '10.9',
    fastenerLength: 85.0,
    threadCondition: 'Dry',
    lubrication: 'None',
    toolType: 'Electronic Angle Torque Wrench',
    toolCalibrationRequired: true,
    calibrationRequired: true,
    engineeringApproval: true,
    approvedBy: 'jane.smith', // Quality Engineer
    approvedDate: new Date('2024-01-15'),
    safetyLevel: 'CRITICAL',
    notes: 'Critical engine assembly operation. Follow sequence strictly.',
    revision: 'REV-A',
    effectiveDate: new Date('2024-01-15'),
    expirationDate: new Date('2025-01-15')
  },
  {
    id: 'torque-spec-002',
    name: 'Main Bearing Cap Bolts - V8 Engine',
    operationId: 'op-main-bearing-001',
    partId: 'part-main-bearing-cap',
    torqueValue: 120.0,
    toleranceLower: 115.0,
    toleranceUpper: 125.0,
    targetValue: 120.0,
    method: TorqueMethod.TORQUE_ONLY,
    pattern: TorquePattern.LINEAR,
    unit: 'Nm',
    numberOfPasses: 2,
    fastenerType: 'M14x2.0',
    fastenerGrade: '12.9',
    fastenerLength: 95.0,
    threadCondition: 'Lubricated',
    lubrication: 'Engine Oil',
    toolType: 'Electronic Torque Wrench',
    toolCalibrationRequired: true,
    calibrationRequired: true,
    engineeringApproval: true,
    approvedBy: 'jane.smith',
    approvedDate: new Date('2024-01-20'),
    safetyLevel: 'CRITICAL',
    notes: 'Apply engine oil to threads before torquing.',
    revision: 'REV-B',
    effectiveDate: new Date('2024-01-20'),
    expirationDate: new Date('2025-01-20')
  },
  {
    id: 'torque-spec-003',
    name: 'Connecting Rod Bolts - V8 Engine',
    operationId: 'op-connecting-rod-001',
    partId: 'part-connecting-rod',
    torqueValue: 45.0,
    toleranceLower: 42.0,
    toleranceUpper: 48.0,
    targetValue: 45.0,
    method: TorqueMethod.TORQUE_TO_YIELD,
    pattern: TorquePattern.CROSS,
    unit: 'Nm',
    numberOfPasses: 2,
    yieldPoint: 75.0,
    fastenerType: 'M10x1.5',
    fastenerGrade: '10.9',
    fastenerLength: 55.0,
    threadCondition: 'Lubricated',
    lubrication: 'Molybdenum Grease',
    toolType: 'Yield Control Torque Wrench',
    toolCalibrationRequired: true,
    calibrationRequired: true,
    engineeringApproval: true,
    approvedBy: 'jane.smith',
    approvedDate: new Date('2024-01-25'),
    safetyLevel: 'CRITICAL',
    notes: 'Torque to yield specification. Replace bolts after each use.',
    revision: 'REV-A',
    effectiveDate: new Date('2024-01-25'),
    expirationDate: new Date('2025-01-25')
  },
  {
    id: 'torque-spec-004',
    name: 'Intake Manifold Bolts - V8 Engine',
    operationId: 'op-intake-manifold-001',
    partId: 'part-intake-manifold',
    torqueValue: 25.0,
    toleranceLower: 23.0,
    toleranceUpper: 27.0,
    targetValue: 25.0,
    method: TorqueMethod.TORQUE_ONLY,
    pattern: TorquePattern.SPIRAL,
    unit: 'Nm',
    numberOfPasses: 2,
    fastenerType: 'M8x1.25',
    fastenerGrade: '8.8',
    fastenerLength: 35.0,
    threadCondition: 'Dry',
    lubrication: 'None',
    toolType: 'Electronic Torque Wrench',
    toolCalibrationRequired: true,
    calibrationRequired: true,
    engineeringApproval: true,
    approvedBy: 'jane.smith',
    approvedDate: new Date('2024-02-01'),
    safetyLevel: 'NORMAL',
    notes: 'Standard torque specification for intake manifold.',
    revision: 'REV-A',
    effectiveDate: new Date('2024-02-01'),
    expirationDate: new Date('2025-02-01')
  },
  {
    id: 'torque-spec-005',
    name: 'Transmission Bell Housing Bolts',
    operationId: 'op-transmission-001',
    partId: 'part-bell-housing',
    torqueValue: 65.0,
    toleranceLower: 62.0,
    toleranceUpper: 68.0,
    targetValue: 65.0,
    method: TorqueMethod.TORQUE_ONLY,
    pattern: TorquePattern.STAR,
    unit: 'Nm',
    numberOfPasses: 2,
    fastenerType: 'M12x1.75',
    fastenerGrade: '10.9',
    fastenerLength: 65.0,
    threadCondition: 'Dry',
    lubrication: 'None',
    toolType: 'Electronic Torque Wrench',
    toolCalibrationRequired: true,
    calibrationRequired: true,
    engineeringApproval: false,
    approvedBy: null,
    approvedDate: null,
    safetyLevel: 'NORMAL',
    notes: 'Standard transmission mounting specification.',
    revision: 'REV-A',
    effectiveDate: new Date('2024-02-05'),
    expirationDate: new Date('2025-02-05')
  }
];

// Sample torque sequences for different bolt patterns
const torqueSequences = [
  // Cylinder Head - 16 bolt star pattern
  { specificationId: 'torque-spec-001', boltPosition: 1, sequenceNumber: 1, x: 100, y: 50, description: 'Cylinder Head Bolt 1' },
  { specificationId: 'torque-spec-001', boltPosition: 9, sequenceNumber: 2, x: 300, y: 50, description: 'Cylinder Head Bolt 9' },
  { specificationId: 'torque-spec-001', boltPosition: 5, sequenceNumber: 3, x: 200, y: 100, description: 'Cylinder Head Bolt 5' },
  { specificationId: 'torque-spec-001', boltPosition: 13, sequenceNumber: 4, x: 400, y: 100, description: 'Cylinder Head Bolt 13' },
  { specificationId: 'torque-spec-001', boltPosition: 3, sequenceNumber: 5, x: 150, y: 150, description: 'Cylinder Head Bolt 3' },
  { specificationId: 'torque-spec-001', boltPosition: 11, sequenceNumber: 6, x: 350, y: 150, description: 'Cylinder Head Bolt 11' },
  { specificationId: 'torque-spec-001', boltPosition: 7, sequenceNumber: 7, x: 250, y: 200, description: 'Cylinder Head Bolt 7' },
  { specificationId: 'torque-spec-001', boltPosition: 15, sequenceNumber: 8, x: 450, y: 200, description: 'Cylinder Head Bolt 15' },
  { specificationId: 'torque-spec-001', boltPosition: 2, sequenceNumber: 9, x: 125, y: 250, description: 'Cylinder Head Bolt 2' },
  { specificationId: 'torque-spec-001', boltPosition: 10, sequenceNumber: 10, x: 325, y: 250, description: 'Cylinder Head Bolt 10' },
  { specificationId: 'torque-spec-001', boltPosition: 6, sequenceNumber: 11, x: 225, y: 300, description: 'Cylinder Head Bolt 6' },
  { specificationId: 'torque-spec-001', boltPosition: 14, sequenceNumber: 12, x: 425, y: 300, description: 'Cylinder Head Bolt 14' },
  { specificationId: 'torque-spec-001', boltPosition: 4, sequenceNumber: 13, x: 175, y: 350, description: 'Cylinder Head Bolt 4' },
  { specificationId: 'torque-spec-001', boltPosition: 12, sequenceNumber: 14, x: 375, y: 350, description: 'Cylinder Head Bolt 12' },
  { specificationId: 'torque-spec-001', boltPosition: 8, sequenceNumber: 15, x: 275, y: 400, description: 'Cylinder Head Bolt 8' },
  { specificationId: 'torque-spec-001', boltPosition: 16, sequenceNumber: 16, x: 475, y: 400, description: 'Cylinder Head Bolt 16' },

  // Main Bearing Cap - 10 bolt linear pattern
  { specificationId: 'torque-spec-002', boltPosition: 1, sequenceNumber: 1, x: 100, y: 200, description: 'Main Bearing Cap 1 - Bolt 1' },
  { specificationId: 'torque-spec-002', boltPosition: 2, sequenceNumber: 2, x: 150, y: 200, description: 'Main Bearing Cap 1 - Bolt 2' },
  { specificationId: 'torque-spec-002', boltPosition: 3, sequenceNumber: 3, x: 200, y: 200, description: 'Main Bearing Cap 2 - Bolt 1' },
  { specificationId: 'torque-spec-002', boltPosition: 4, sequenceNumber: 4, x: 250, y: 200, description: 'Main Bearing Cap 2 - Bolt 2' },
  { specificationId: 'torque-spec-002', boltPosition: 5, sequenceNumber: 5, x: 300, y: 200, description: 'Main Bearing Cap 3 - Bolt 1' },
  { specificationId: 'torque-spec-002', boltPosition: 6, sequenceNumber: 6, x: 350, y: 200, description: 'Main Bearing Cap 3 - Bolt 2' },
  { specificationId: 'torque-spec-002', boltPosition: 7, sequenceNumber: 7, x: 400, y: 200, description: 'Main Bearing Cap 4 - Bolt 1' },
  { specificationId: 'torque-spec-002', boltPosition: 8, sequenceNumber: 8, x: 450, y: 200, description: 'Main Bearing Cap 4 - Bolt 2' },
  { specificationId: 'torque-spec-002', boltPosition: 9, sequenceNumber: 9, x: 500, y: 200, description: 'Main Bearing Cap 5 - Bolt 1' },
  { specificationId: 'torque-spec-002', boltPosition: 10, sequenceNumber: 10, x: 550, y: 200, description: 'Main Bearing Cap 5 - Bolt 2' },

  // Connecting Rod - 2 bolt cross pattern (8 rods = 16 bolts)
  { specificationId: 'torque-spec-003', boltPosition: 1, sequenceNumber: 1, x: 100, y: 100, description: 'Rod 1 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 2, sequenceNumber: 2, x: 150, y: 100, description: 'Rod 1 - Bolt 2' },
  { specificationId: 'torque-spec-003', boltPosition: 3, sequenceNumber: 3, x: 200, y: 100, description: 'Rod 2 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 4, sequenceNumber: 4, x: 250, y: 100, description: 'Rod 2 - Bolt 2' },
  { specificationId: 'torque-spec-003', boltPosition: 5, sequenceNumber: 5, x: 300, y: 100, description: 'Rod 3 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 6, sequenceNumber: 6, x: 350, y: 100, description: 'Rod 3 - Bolt 2' },
  { specificationId: 'torque-spec-003', boltPosition: 7, sequenceNumber: 7, x: 400, y: 100, description: 'Rod 4 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 8, sequenceNumber: 8, x: 450, y: 100, description: 'Rod 4 - Bolt 2' },
  { specificationId: 'torque-spec-003', boltPosition: 9, sequenceNumber: 9, x: 100, y: 200, description: 'Rod 5 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 10, sequenceNumber: 10, x: 150, y: 200, description: 'Rod 5 - Bolt 2' },
  { specificationId: 'torque-spec-003', boltPosition: 11, sequenceNumber: 11, x: 200, y: 200, description: 'Rod 6 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 12, sequenceNumber: 12, x: 250, y: 200, description: 'Rod 6 - Bolt 2' },
  { specificationId: 'torque-spec-003', boltPosition: 13, sequenceNumber: 13, x: 300, y: 200, description: 'Rod 7 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 14, sequenceNumber: 14, x: 350, y: 200, description: 'Rod 7 - Bolt 2' },
  { specificationId: 'torque-spec-003', boltPosition: 15, sequenceNumber: 15, x: 400, y: 200, description: 'Rod 8 - Bolt 1' },
  { specificationId: 'torque-spec-003', boltPosition: 16, sequenceNumber: 16, x: 450, y: 200, description: 'Rod 8 - Bolt 2' },

  // Intake Manifold - 12 bolt spiral pattern
  { specificationId: 'torque-spec-004', boltPosition: 1, sequenceNumber: 1, x: 150, y: 150, description: 'Intake Manifold Center' },
  { specificationId: 'torque-spec-004', boltPosition: 2, sequenceNumber: 2, x: 200, y: 100, description: 'Intake Manifold Bolt 2' },
  { specificationId: 'torque-spec-004', boltPosition: 3, sequenceNumber: 3, x: 250, y: 150, description: 'Intake Manifold Bolt 3' },
  { specificationId: 'torque-spec-004', boltPosition: 4, sequenceNumber: 4, x: 200, y: 200, description: 'Intake Manifold Bolt 4' },
  { specificationId: 'torque-spec-004', boltPosition: 5, sequenceNumber: 5, x: 100, y: 150, description: 'Intake Manifold Bolt 5' },
  { specificationId: 'torque-spec-004', boltPosition: 6, sequenceNumber: 6, x: 125, y: 100, description: 'Intake Manifold Bolt 6' },
  { specificationId: 'torque-spec-004', boltPosition: 7, sequenceNumber: 7, x: 275, y: 100, description: 'Intake Manifold Bolt 7' },
  { specificationId: 'torque-spec-004', boltPosition: 8, sequenceNumber: 8, x: 300, y: 175, description: 'Intake Manifold Bolt 8' },
  { specificationId: 'torque-spec-004', boltPosition: 9, sequenceNumber: 9, x: 275, y: 225, description: 'Intake Manifold Bolt 9' },
  { specificationId: 'torque-spec-004', boltPosition: 10, sequenceNumber: 10, x: 175, y: 250, description: 'Intake Manifold Bolt 10' },
  { specificationId: 'torque-spec-004', boltPosition: 11, sequenceNumber: 11, x: 100, y: 200, description: 'Intake Manifold Bolt 11' },
  { specificationId: 'torque-spec-004', boltPosition: 12, sequenceNumber: 12, x: 75, y: 125, description: 'Intake Manifold Bolt 12' },

  // Transmission Bell Housing - 8 bolt star pattern
  { specificationId: 'torque-spec-005', boltPosition: 1, sequenceNumber: 1, x: 200, y: 100, description: 'Bell Housing Top' },
  { specificationId: 'torque-spec-005', boltPosition: 5, sequenceNumber: 2, x: 200, y: 300, description: 'Bell Housing Bottom' },
  { specificationId: 'torque-spec-005', boltPosition: 3, sequenceNumber: 3, x: 100, y: 200, description: 'Bell Housing Left' },
  { specificationId: 'torque-spec-005', boltPosition: 7, sequenceNumber: 4, x: 300, y: 200, description: 'Bell Housing Right' },
  { specificationId: 'torque-spec-005', boltPosition: 2, sequenceNumber: 5, x: 150, y: 130, description: 'Bell Housing Top-Left' },
  { specificationId: 'torque-spec-005', boltPosition: 6, sequenceNumber: 6, x: 250, y: 270, description: 'Bell Housing Bottom-Right' },
  { specificationId: 'torque-spec-005', boltPosition: 4, sequenceNumber: 7, x: 150, y: 270, description: 'Bell Housing Bottom-Left' },
  { specificationId: 'torque-spec-005', boltPosition: 8, sequenceNumber: 8, x: 250, y: 130, description: 'Bell Housing Top-Right' }
];

// Sample torque events demonstrating various scenarios
const sampleTorqueEvents = [
  // Perfect cylinder head torque sequence - Pass 1
  {
    sessionId: 'session-demo-001',
    sequenceId: 'seq-demo-001',
    passNumber: 1,
    actualTorque: 94.8,
    targetTorque: 95.0,
    angle: 179.5,
    targetAngle: 180.0,
    status: 'PASS',
    isValid: true,
    deviation: -0.2,
    percentDeviation: -0.21,
    wrenchId: 'wrench-prod-001',
    operatorId: 'john.doe',
    timestamp: new Date('2024-03-01T08:15:30Z')
  },
  {
    sessionId: 'session-demo-001',
    sequenceId: 'seq-demo-002',
    passNumber: 1,
    actualTorque: 95.3,
    targetTorque: 95.0,
    angle: 181.2,
    targetAngle: 180.0,
    status: 'PASS',
    isValid: true,
    deviation: 0.3,
    percentDeviation: 0.32,
    wrenchId: 'wrench-prod-001',
    operatorId: 'john.doe',
    timestamp: new Date('2024-03-01T08:16:00Z')
  },
  {
    sessionId: 'session-demo-001',
    sequenceId: 'seq-demo-003',
    passNumber: 1,
    actualTorque: 94.9,
    targetTorque: 95.0,
    angle: 179.8,
    targetAngle: 180.0,
    status: 'PASS',
    isValid: true,
    deviation: -0.1,
    percentDeviation: -0.11,
    wrenchId: 'wrench-prod-001',
    operatorId: 'john.doe',
    timestamp: new Date('2024-03-01T08:16:30Z')
  },

  // Under-torque scenario requiring rework
  {
    sessionId: 'session-demo-002',
    sequenceId: 'seq-demo-004',
    passNumber: 1,
    actualTorque: 88.5,
    targetTorque: 95.0,
    angle: 175.0,
    targetAngle: 180.0,
    status: 'UNDER_TORQUE',
    isValid: false,
    deviation: -6.5,
    percentDeviation: -6.84,
    wrenchId: 'wrench-prod-002',
    operatorId: 'mike.wilson',
    timestamp: new Date('2024-03-01T10:20:15Z')
  },

  // Over-torque scenario requiring supervisor approval
  {
    sessionId: 'session-demo-003',
    sequenceId: 'seq-demo-005',
    passNumber: 1,
    actualTorque: 102.3,
    targetTorque: 95.0,
    angle: 185.5,
    targetAngle: 180.0,
    status: 'OVER_TORQUE',
    isValid: false,
    deviation: 7.3,
    percentDeviation: 7.68,
    wrenchId: 'wrench-prod-001',
    operatorId: 'sarah.johnson',
    timestamp: new Date('2024-03-01T14:30:45Z')
  },

  // Connecting rod torque-to-yield scenario
  {
    sessionId: 'session-demo-004',
    sequenceId: 'seq-demo-006',
    passNumber: 1,
    actualTorque: 44.8,
    targetTorque: 45.0,
    angle: 95.0,
    targetAngle: 0.0, // Initial torque, no angle yet
    status: 'PASS',
    isValid: true,
    deviation: -0.2,
    percentDeviation: -0.44,
    wrenchId: 'wrench-yield-001',
    operatorId: 'john.doe',
    timestamp: new Date('2024-03-01T16:45:20Z')
  },
  {
    sessionId: 'session-demo-004',
    sequenceId: 'seq-demo-006',
    passNumber: 2,
    actualTorque: 74.2, // Yield point reached
    targetTorque: 75.0,
    angle: 285.0, // Additional angle after yield
    targetAngle: 270.0,
    status: 'YIELD_REACHED',
    isValid: true,
    deviation: -0.8,
    percentDeviation: -1.07,
    wrenchId: 'wrench-yield-001',
    operatorId: 'john.doe',
    timestamp: new Date('2024-03-01T16:45:50Z')
  },

  // Main bearing cap sequence
  {
    sessionId: 'session-demo-005',
    sequenceId: 'seq-demo-007',
    passNumber: 1,
    actualTorque: 119.5,
    targetTorque: 120.0,
    angle: 0.0,
    targetAngle: 0.0,
    status: 'PASS',
    isValid: true,
    deviation: -0.5,
    percentDeviation: -0.42,
    wrenchId: 'wrench-prod-003',
    operatorId: 'david.chen',
    timestamp: new Date('2024-03-02T09:10:00Z')
  },
  {
    sessionId: 'session-demo-005',
    sequenceId: 'seq-demo-007',
    passNumber: 2,
    actualTorque: 120.8,
    targetTorque: 120.0,
    angle: 0.0,
    targetAngle: 0.0,
    status: 'PASS',
    isValid: true,
    deviation: 0.8,
    percentDeviation: 0.67,
    wrenchId: 'wrench-prod-003',
    operatorId: 'david.chen',
    timestamp: new Date('2024-03-02T09:10:30Z')
  }
];

export async function seedTorqueData(): Promise<void> {
  const uniqueSuffix = generateUniqueSuffix();

  safeLog('🔧 Seeding torque management data...');

  try {
    // First, ensure we have the required related data (users, work centers, etc.)
    // These should exist from the main seed file, but we'll verify key ones

    // Check if demo users exist
    const demoUsers = await prisma.user.findMany({
      where: {
        username: {
          in: ['john.doe', 'jane.smith', 'mike.wilson', 'sarah.johnson', 'david.chen']
        }
      }
    });

    if (demoUsers.length === 0) {
      safeLog('⚠️  Demo users not found. Please run main seed first.');
      return;
    }

    // Create or find work centers for torque operations
    const engineAssemblyCenter = await prisma.workCenter.upsert({
      where: { name: 'Engine Assembly Cell' },
      update: {},
      create: {
        name: 'Engine Assembly Cell',
        description: 'Specialized cell for V8 engine assembly with torque control',
        capacity: 8.0,
        efficiency: 0.92,
        isActive: true
      }
    });

    // Create or find parts for torque specifications
    const parts = await Promise.all([
      prisma.part.upsert({
        where: { partNumber: 'ENG-V8-HEAD-001' },
        update: {},
        create: {
          partNumber: 'ENG-V8-HEAD-001',
          name: 'V8 Cylinder Head Assembly',
          description: 'Aluminum cylinder head for V8 engine',
          revision: 'C',
          isActive: true
        }
      }),
      prisma.part.upsert({
        where: { partNumber: 'ENG-V8-BEARING-CAP' },
        update: {},
        create: {
          partNumber: 'ENG-V8-BEARING-CAP',
          name: 'Main Bearing Cap Set',
          description: 'Forged steel main bearing caps for V8 crankshaft',
          revision: 'B',
          isActive: true
        }
      }),
      prisma.part.upsert({
        where: { partNumber: 'ENG-V8-CON-ROD' },
        update: {},
        create: {
          partNumber: 'ENG-V8-CON-ROD',
          name: 'Connecting Rod Assembly',
          description: 'Forged steel connecting rods with bolts',
          revision: 'A',
          isActive: true
        }
      }),
      prisma.part.upsert({
        where: { partNumber: 'ENG-V8-INTAKE' },
        update: {},
        create: {
          partNumber: 'ENG-V8-INTAKE',
          name: 'Intake Manifold',
          description: 'Aluminum intake manifold assembly',
          revision: 'A',
          isActive: true
        }
      }),
      prisma.part.upsert({
        where: { partNumber: 'TRANS-BELL-HOUSING' },
        update: {},
        create: {
          partNumber: 'TRANS-BELL-HOUSING',
          name: 'Transmission Bell Housing',
          description: 'Cast iron transmission bell housing',
          revision: 'A',
          isActive: true
        }
      })
    ]);

    // Create operations for torque specifications
    const operations = await Promise.all([
      prisma.operation.upsert({
        where: { operationNumber: 'OP-CYLINDER-HEAD-001' },
        update: {},
        create: {
          operationNumber: 'OP-CYLINDER-HEAD-001',
          name: 'Cylinder Head Installation',
          description: 'Install and torque cylinder head to engine block',
          workCenterId: engineAssemblyCenter.id,
          setupTime: 15.0,
          cycleTime: 45.0,
          isActive: true
        }
      }),
      prisma.operation.upsert({
        where: { operationNumber: 'OP-MAIN-BEARING-001' },
        update: {},
        create: {
          operationNumber: 'OP-MAIN-BEARING-001',
          name: 'Main Bearing Cap Installation',
          description: 'Install and torque main bearing caps',
          workCenterId: engineAssemblyCenter.id,
          setupTime: 10.0,
          cycleTime: 30.0,
          isActive: true
        }
      }),
      prisma.operation.upsert({
        where: { operationNumber: 'OP-CONNECTING-ROD-001' },
        update: {},
        create: {
          operationNumber: 'OP-CONNECTING-ROD-001',
          name: 'Connecting Rod Installation',
          description: 'Install connecting rods with torque-to-yield bolts',
          workCenterId: engineAssemblyCenter.id,
          setupTime: 20.0,
          cycleTime: 60.0,
          isActive: true
        }
      }),
      prisma.operation.upsert({
        where: { operationNumber: 'OP-INTAKE-MANIFOLD-001' },
        update: {},
        create: {
          operationNumber: 'OP-INTAKE-MANIFOLD-001',
          name: 'Intake Manifold Installation',
          description: 'Install intake manifold with spiral torque pattern',
          workCenterId: engineAssemblyCenter.id,
          setupTime: 5.0,
          cycleTime: 20.0,
          isActive: true
        }
      }),
      prisma.operation.upsert({
        where: { operationNumber: 'OP-TRANSMISSION-001' },
        update: {},
        create: {
          operationNumber: 'OP-TRANSMISSION-001',
          name: 'Transmission Bell Housing',
          description: 'Install transmission bell housing to engine',
          workCenterId: engineAssemblyCenter.id,
          setupTime: 8.0,
          cycleTime: 25.0,
          isActive: true
        }
      })
    ]);

    safeLog('✅ Created work centers, parts, and operations');

    // Create torque specifications
    const createdSpecs = [];
    for (const spec of torqueSpecifications) {
      const operation = operations.find(op => op.operationNumber === spec.operationId);
      const part = parts.find(p => p.partNumber === spec.partId);
      const approver = spec.approvedBy ? demoUsers.find(u => u.username === spec.approvedBy) : null;

      if (!operation || !part) {
        safeLog(`⚠️  Skipping spec ${spec.id} - missing operation or part`);
        continue;
      }

      const torqueSpec = await prisma.torqueSpecification.upsert({
        where: { id: `${spec.id}-${uniqueSuffix}` },
        update: {},
        create: {
          id: `${spec.id}-${uniqueSuffix}`,
          operationId: operation.id,
          partId: part.id,
          torqueValue: spec.torqueValue,
          toleranceLower: spec.toleranceLower,
          toleranceUpper: spec.toleranceUpper,
          targetValue: spec.targetValue,
          method: spec.method,
          pattern: spec.pattern,
          unit: spec.unit,
          numberOfPasses: spec.numberOfPasses,
          angleSpec: spec.angleSpec,
          angleToleranceLower: spec.angleToleranceLower,
          angleToleranceUpper: spec.angleToleranceUpper,
          yieldPoint: spec.yieldPoint,
          fastenerType: spec.fastenerType,
          fastenerGrade: spec.fastenerGrade,
          fastenerLength: spec.fastenerLength,
          threadCondition: spec.threadCondition,
          lubrication: spec.lubrication,
          toolType: spec.toolType,
          toolCalibrationRequired: spec.toolCalibrationRequired,
          calibrationRequired: spec.calibrationRequired,
          engineeringApproval: spec.engineeringApproval,
          approvedBy: approver?.id,
          approvedDate: spec.approvedDate,
          safetyLevel: spec.safetyLevel,
          notes: spec.notes,
          revision: spec.revision,
          effectiveDate: spec.effectiveDate,
          expirationDate: spec.expirationDate
        }
      });

      createdSpecs.push({ original: spec, created: torqueSpec });
    }

    safeLog(`✅ Created ${createdSpecs.length} torque specifications`);

    // Create torque sequences
    const createdSequences = [];
    for (const seq of torqueSequences) {
      const spec = createdSpecs.find(s => s.original.id === seq.specificationId);

      if (!spec) {
        continue;
      }

      const sequence = await prisma.torqueSequence.create({
        data: {
          specificationId: spec.created.id,
          boltPosition: seq.boltPosition,
          sequenceNumber: seq.sequenceNumber,
          x: seq.x,
          y: seq.y,
          description: seq.description
        }
      });

      createdSequences.push({ original: seq, created: sequence });
    }

    safeLog(`✅ Created ${createdSequences.length} torque sequences`);

    // Create sample torque events
    const createdEvents = [];
    for (const event of sampleTorqueEvents) {
      // Find corresponding sequence
      const sequenceMapping = createdSequences.find(s =>
        s.original.specificationId === 'torque-spec-001' &&
        s.original.sequenceNumber === 1
      );

      if (!sequenceMapping) {
        continue;
      }

      const operator = demoUsers.find(u => u.username === event.operatorId);
      if (!operator) {
        continue;
      }

      const torqueEvent = await prisma.torqueEvent.create({
        data: {
          sessionId: `${event.sessionId}-${uniqueSuffix}`,
          sequenceId: sequenceMapping.created.id,
          passNumber: event.passNumber,
          actualTorque: event.actualTorque,
          targetTorque: event.targetTorque,
          angle: event.angle,
          targetAngle: event.targetAngle,
          status: event.status,
          isValid: event.isValid,
          deviation: event.deviation,
          percentDeviation: event.percentDeviation,
          wrenchId: event.wrenchId,
          operatorId: operator.id,
          timestamp: event.timestamp
        }
      });

      createdEvents.push(torqueEvent);
    }

    safeLog(`✅ Created ${createdEvents.length} sample torque events`);

    // Seed digital wrenches and validation rules
    await seedTorqueWrenchesAndRules();

    safeLog('🔧 Torque management data seeding completed successfully');

  } catch (error) {
    console.error('❌ Error seeding torque data:', error);
    throw error;
  }
}

// Allow running this seed file directly
async function main() {
  try {
    await seedTorqueData();
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Only run main() if this file is executed directly
if (require.main === module) {
  main();
}