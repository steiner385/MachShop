import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Sample digital wrench configurations for different brands and connection types
export const digitalWrenchConfigs = [
  {
    id: 'wrench-prod-001',
    name: 'Production Line Wrench #1',
    brand: 'SNAP_ON',
    model: 'ATECH3F150',
    connectionType: 'BLUETOOTH',
    address: '00:11:22:33:44:55',
    serialNumber: 'SN-SNAPON-001',
    calibrationDate: new Date('2024-01-15'),
    calibrationDue: new Date('2025-01-15'),
    calibrationCertificate: 'CAL-CERT-2024-001',
    lastMaintenance: new Date('2024-01-15'),
    nextMaintenance: new Date('2024-07-15'),
    isActive: true,
    settings: {
      units: 'Nm',
      precision: 0.1,
      autoMode: true,
      timeout: 30000,
      dataLogging: true,
      alertsEnabled: true,
      maxTorque: 200.0,
      minTorque: 5.0
    },
    capabilities: {
      torqueRange: { min: 5.0, max: 200.0 },
      angleCapable: true,
      angleRange: { min: 0, max: 720 },
      torqueToYield: true,
      dataLogging: true,
      realTimeMonitoring: true,
      batteryLife: 12,
      operatingTemp: { min: -10, max: 50 }
    }
  },
  {
    id: 'wrench-prod-002',
    name: 'Production Line Wrench #2',
    brand: 'NORBAR',
    model: 'EvoTorque',
    connectionType: 'WIFI',
    address: '192.168.10.101',
    serialNumber: 'SN-NORBAR-002',
    calibrationDate: new Date('2024-02-01'),
    calibrationDue: new Date('2025-02-01'),
    calibrationCertificate: 'CAL-CERT-2024-002',
    lastMaintenance: new Date('2024-02-01'),
    nextMaintenance: new Date('2024-08-01'),
    isActive: true,
    settings: {
      units: 'Nm',
      precision: 0.05,
      autoMode: true,
      timeout: 45000,
      dataLogging: true,
      alertsEnabled: true,
      maxTorque: 300.0,
      minTorque: 10.0
    },
    capabilities: {
      torqueRange: { min: 10.0, max: 300.0 },
      angleCapable: true,
      angleRange: { min: 0, max: 1080 },
      torqueToYield: false,
      dataLogging: true,
      realTimeMonitoring: true,
      batteryLife: 16,
      operatingTemp: { min: -5, max: 45 }
    }
  },
  {
    id: 'wrench-prod-003',
    name: 'Heavy Duty Wrench #1',
    brand: 'CDI',
    model: '2503MRMH',
    connectionType: 'SERIAL',
    address: 'COM3',
    serialNumber: 'SN-CDI-003',
    calibrationDate: new Date('2024-01-20'),
    calibrationDue: new Date('2025-01-20'),
    calibrationCertificate: 'CAL-CERT-2024-003',
    lastMaintenance: new Date('2024-01-20'),
    nextMaintenance: new Date('2024-07-20'),
    isActive: true,
    settings: {
      units: 'Nm',
      precision: 0.2,
      autoMode: false,
      timeout: 60000,
      dataLogging: true,
      alertsEnabled: true,
      maxTorque: 500.0,
      minTorque: 20.0
    },
    capabilities: {
      torqueRange: { min: 20.0, max: 500.0 },
      angleCapable: false,
      angleRange: { min: 0, max: 0 },
      torqueToYield: false,
      dataLogging: true,
      realTimeMonitoring: false,
      batteryLife: 8,
      operatingTemp: { min: 0, max: 40 }
    }
  },
  {
    id: 'wrench-yield-001',
    name: 'Yield Control Wrench #1',
    brand: 'ATLAS_COPCO',
    model: 'QST25',
    connectionType: 'ETHERNET',
    address: '192.168.10.105',
    serialNumber: 'SN-ATLAS-001',
    calibrationDate: new Date('2024-02-10'),
    calibrationDue: new Date('2025-02-10'),
    calibrationCertificate: 'CAL-CERT-2024-004',
    lastMaintenance: new Date('2024-02-10'),
    nextMaintenance: new Date('2024-08-10'),
    isActive: true,
    settings: {
      units: 'Nm',
      precision: 0.1,
      autoMode: true,
      timeout: 30000,
      dataLogging: true,
      alertsEnabled: true,
      maxTorque: 100.0,
      minTorque: 5.0
    },
    capabilities: {
      torqueRange: { min: 5.0, max: 100.0 },
      angleCapable: true,
      angleRange: { min: 0, max: 720 },
      torqueToYield: true,
      dataLogging: true,
      realTimeMonitoring: true,
      batteryLife: 10,
      operatingTemp: { min: -5, max: 50 }
    }
  },
  {
    id: 'wrench-backup-001',
    name: 'Backup Wrench #1',
    brand: 'SNAP_ON',
    model: 'ATECH1F100',
    connectionType: 'BLUETOOTH',
    address: '00:11:22:33:44:66',
    serialNumber: 'SN-SNAPON-BACKUP-001',
    calibrationDate: new Date('2024-01-10'),
    calibrationDue: new Date('2025-01-10'),
    calibrationCertificate: 'CAL-CERT-2024-005',
    lastMaintenance: new Date('2024-01-10'),
    nextMaintenance: new Date('2024-07-10'),
    isActive: false, // Backup unit
    settings: {
      units: 'Nm',
      precision: 0.1,
      autoMode: true,
      timeout: 30000,
      dataLogging: true,
      alertsEnabled: true,
      maxTorque: 150.0,
      minTorque: 5.0
    },
    capabilities: {
      torqueRange: { min: 5.0, max: 150.0 },
      angleCapable: true,
      angleRange: { min: 0, max: 360 },
      torqueToYield: false,
      dataLogging: true,
      realTimeMonitoring: true,
      batteryLife: 12,
      operatingTemp: { min: -10, max: 50 }
    }
  }
];

// Sample validation rules for different torque scenarios
export const validationRules = [
  {
    id: 'rule-standard-tolerance',
    name: 'Standard Tolerance Check',
    description: 'Standard ±3% tolerance for normal torque operations',
    ruleType: 'TOLERANCE',
    parameters: {
      tolerancePercent: 3.0,
      allowOverTorque: false,
      maxRetries: 3,
      requireApprovalForFailure: false
    },
    isActive: true,
    severity: 'ERROR',
    applicableOperations: ['normal', 'standard'],
    applicableSafetyLevels: ['NORMAL']
  },
  {
    id: 'rule-critical-tolerance',
    name: 'Critical Component Tolerance',
    description: 'Strict ±1.5% tolerance for critical safety components',
    ruleType: 'TOLERANCE',
    parameters: {
      tolerancePercent: 1.5,
      allowOverTorque: false,
      maxRetries: 2,
      requireApprovalForFailure: true,
      requireSupervisorSignoff: true
    },
    isActive: true,
    severity: 'CRITICAL',
    applicableOperations: ['critical', 'safety'],
    applicableSafetyLevels: ['CRITICAL']
  },
  {
    id: 'rule-warning-zone',
    name: 'Warning Zone Detection',
    description: 'Warning when readings approach tolerance limits (90% of tolerance)',
    ruleType: 'WARNING_ZONE',
    parameters: {
      warningZonePercent: 90.0,
      tolerancePercent: 3.0,
      enableAudioAlert: true,
      enableVisualAlert: true
    },
    isActive: true,
    severity: 'WARNING',
    applicableOperations: ['all'],
    applicableSafetyLevels: ['NORMAL', 'CRITICAL']
  },
  {
    id: 'rule-progressive-torque',
    name: 'Progressive Torque Validation',
    description: 'Validates progressive torque increases between passes',
    ruleType: 'PROGRESSIVE',
    parameters: {
      minimumIncrease: 5.0,
      maximumIncrease: 20.0,
      allowDecrease: false,
      passVariationLimit: 2.0
    },
    isActive: true,
    severity: 'ERROR',
    applicableOperations: ['multi-pass'],
    applicableSafetyLevels: ['NORMAL', 'CRITICAL']
  },
  {
    id: 'rule-angle-validation',
    name: 'Angle Validation for Torque-Angle',
    description: 'Validates angle measurements for torque-angle specifications',
    ruleType: 'ANGLE',
    parameters: {
      angleTolerance: 5.0,
      requireAngleProgression: true,
      minimumAngle: 30.0,
      maximumAngle: 720.0
    },
    isActive: true,
    severity: 'ERROR',
    applicableOperations: ['torque-angle'],
    applicableSafetyLevels: ['NORMAL', 'CRITICAL']
  },
  {
    id: 'rule-yield-detection',
    name: 'Yield Point Detection',
    description: 'Detects yield point for torque-to-yield operations',
    ruleType: 'YIELD',
    parameters: {
      yieldDetectionSensitivity: 0.1,
      minimumYieldAngle: 45.0,
      maximumYieldAngle: 360.0,
      yieldTorqueTolerance: 2.0
    },
    isActive: true,
    severity: 'ERROR',
    applicableOperations: ['torque-to-yield'],
    applicableSafetyLevels: ['CRITICAL']
  },
  {
    id: 'rule-sequence-validation',
    name: 'Sequence Order Validation',
    description: 'Validates bolts are torqued in correct sequence order',
    ruleType: 'SEQUENCE',
    parameters: {
      enforceStrictOrder: true,
      allowSkipWithApproval: true,
      maxSequenceDeviation: 1,
      requireJustificationForSkip: true
    },
    isActive: true,
    severity: 'WARNING',
    applicableOperations: ['all'],
    applicableSafetyLevels: ['NORMAL', 'CRITICAL']
  },
  {
    id: 'rule-tool-calibration',
    name: 'Tool Calibration Check',
    description: 'Validates tool calibration status before operation',
    ruleType: 'CALIBRATION',
    parameters: {
      checkCalibrationExpiry: true,
      warningDaysBefore: 30,
      blockExpiredTools: true,
      requireCalibrationCertificate: true
    },
    isActive: true,
    severity: 'CRITICAL',
    applicableOperations: ['all'],
    applicableSafetyLevels: ['CRITICAL']
  },
  {
    id: 'rule-operator-certification',
    name: 'Operator Certification Check',
    description: 'Validates operator certification for critical operations',
    ruleType: 'CERTIFICATION',
    parameters: {
      requireCertification: true,
      certificationTypes: ['TORQUE_OPERATOR', 'CRITICAL_ASSEMBLY'],
      checkCertificationExpiry: true,
      warningDaysBefore: 60
    },
    isActive: true,
    severity: 'ERROR',
    applicableOperations: ['critical'],
    applicableSafetyLevels: ['CRITICAL']
  },
  {
    id: 'rule-environmental-conditions',
    name: 'Environmental Conditions Check',
    description: 'Validates environmental conditions for precision torque operations',
    ruleType: 'ENVIRONMENTAL',
    parameters: {
      temperatureRange: { min: 18, max: 25 },
      humidityRange: { min: 40, max: 70 },
      checkConditions: true,
      allowOverrideWithApproval: true
    },
    isActive: false, // Disabled by default
    severity: 'WARNING',
    applicableOperations: ['precision'],
    applicableSafetyLevels: ['CRITICAL']
  }
];

// Generate unique suffix for parallel test execution
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

export async function seedTorqueWrenchesAndRules(): Promise<void> {
  const uniqueSuffix = generateUniqueSuffix();

  safeLog('🔧 Seeding digital wrenches and validation rules...');

  try {
    // Note: In a real implementation, digital wrench configs and validation rules
    // would likely be stored in separate tables or configuration systems.
    // For this seed, we'll create them as JSON data that can be loaded by the services.

    // Create a configuration storage mechanism
    const configEntries = [];

    // Store digital wrench configurations
    for (const wrench of digitalWrenchConfigs) {
      const configEntry = {
        id: `wrench-config-${wrench.id}-${uniqueSuffix}`,
        type: 'DIGITAL_WRENCH_CONFIG',
        key: wrench.id,
        value: JSON.stringify(wrench),
        category: 'torque_management',
        isActive: wrench.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      configEntries.push(configEntry);
    }

    // Store validation rules
    for (const rule of validationRules) {
      const configEntry = {
        id: `validation-rule-${rule.id}-${uniqueSuffix}`,
        type: 'VALIDATION_RULE',
        key: rule.id,
        value: JSON.stringify(rule),
        category: 'torque_validation',
        isActive: rule.isActive,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      configEntries.push(configEntry);
    }

    // Store configuration entries (using a hypothetical SystemConfiguration table)
    // Note: You might need to create this table in your schema or adapt to your config system
    safeLog(`📝 Storing ${configEntries.length} configuration entries...`);

    // For demonstration, we'll store these as files that can be loaded by the services
    const fs = require('fs');
    const path = require('path');

    const configDir = path.join(process.cwd(), 'config', 'torque');
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    // Write digital wrench configurations
    const wrenchConfigPath = path.join(configDir, `wrenches-${uniqueSuffix}.json`);
    fs.writeFileSync(wrenchConfigPath, JSON.stringify(digitalWrenchConfigs, null, 2));

    // Write validation rules
    const rulesConfigPath = path.join(configDir, `validation-rules-${uniqueSuffix}.json`);
    fs.writeFileSync(rulesConfigPath, JSON.stringify(validationRules, null, 2));

    safeLog(`✅ Created digital wrench config: ${wrenchConfigPath}`);
    safeLog(`✅ Created validation rules config: ${rulesConfigPath}`);

    // Create sample tool inventory entries in the database
    const createdTools = [];
    for (const wrench of digitalWrenchConfigs) {
      try {
        const tool = await prisma.tool.upsert({
          where: { serialNumber: wrench.serialNumber },
          update: {},
          create: {
            name: wrench.name,
            type: 'TORQUE_WRENCH',
            manufacturer: wrench.brand,
            model: wrench.model,
            serialNumber: wrench.serialNumber,
            calibrationDate: wrench.calibrationDate,
            calibrationDue: wrench.calibrationDue,
            isActive: wrench.isActive,
            specifications: JSON.stringify({
              torqueRange: wrench.capabilities.torqueRange,
              angleCapable: wrench.capabilities.angleCapable,
              connectionType: wrench.connectionType,
              precision: wrench.settings.precision
            })
          }
        });
        createdTools.push(tool);
      } catch (error) {
        // Tool table might not exist, skip silently
        safeLog(`⚠️  Tool table not available, skipping tool creation for ${wrench.name}`);
      }
    }

    if (createdTools.length > 0) {
      safeLog(`✅ Created ${createdTools.length} tool inventory entries`);
    }

    safeLog('🔧 Digital wrenches and validation rules seeding completed successfully');

    return;

  } catch (error) {
    console.error('❌ Error seeding wrenches and rules:', error);
    throw error;
  }
}

// Allow running this seed file directly
async function main() {
  try {
    await seedTorqueWrenchesAndRules();
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