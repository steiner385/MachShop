/**
 * Life-Limited Parts (LLP) Comprehensive Seed Data Generator
 *
 * Creates realistic seed data for LLP development and testing including:
 * - LLP parts with various criticality levels and retirement types
 * - Serialized parts in different life stages
 * - Complete life history events and traceability
 * - Alerts at different severity levels
 * - Certifications with various types and statuses
 * - Retirement scenarios and compliance examples
 *
 * Usage:
 *   npm run db:seed:llp                    # Basic LLP data
 *   COMPREHENSIVE_LLP=true npm run db:seed:llp  # Comprehensive dataset
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import {
  LLPCriticalityLevel,
  LLPRetirementType,
  LLPAlertSeverity,
  LLPAlertType,
  LLPCertificationType
} from '@prisma/client';

const prisma = new PrismaClient();

// Configuration
interface LLPSeedConfig {
  llpPartCount: number;
  serializedPartsPerPart: number;
  eventsPerPart: number;
  alertsPercentage: number;
  certificationsPerPart: number;
  includeRetiredParts: boolean;
  includeComplexScenarios: boolean;
}

const DEFAULT_CONFIG: LLPSeedConfig = {
  llpPartCount: 10,
  serializedPartsPerPart: 3,
  eventsPerPart: 8,
  alertsPercentage: 30,
  certificationsPerPart: 2,
  includeRetiredParts: true,
  includeComplexScenarios: false
};

const COMPREHENSIVE_CONFIG: LLPSeedConfig = {
  llpPartCount: 50,
  serializedPartsPerPart: 8,
  eventsPerPart: 20,
  alertsPercentage: 40,
  certificationsPerPart: 4,
  includeRetiredParts: true,
  includeComplexScenarios: true
};

// LLP Part Templates for realistic aerospace components
const LLP_PART_TEMPLATES = [
  {
    category: 'TURBINE_BLADES',
    parts: [
      { name: 'High-Pressure Turbine Blade Stage 1', cycleLimit: 1000, timeLimit: 8760, criticalityLevel: LLPCriticalityLevel.CRITICAL },
      { name: 'High-Pressure Turbine Blade Stage 2', cycleLimit: 1200, timeLimit: 10000, criticalityLevel: LLPCriticalityLevel.CRITICAL },
      { name: 'Low-Pressure Turbine Blade Stage 1', cycleLimit: 1500, timeLimit: 12000, criticalityLevel: LLPCriticalityLevel.CONTROLLED },
      { name: 'Low-Pressure Turbine Blade Stage 2', cycleLimit: 1800, timeLimit: 15000, criticalityLevel: LLPCriticalityLevel.CONTROLLED }
    ]
  },
  {
    category: 'COMPRESSOR_COMPONENTS',
    parts: [
      { name: 'High-Pressure Compressor Disk Stage 5', cycleLimit: 2000, timeLimit: null, criticalityLevel: LLPCriticalityLevel.CRITICAL },
      { name: 'High-Pressure Compressor Disk Stage 10', cycleLimit: 2500, timeLimit: null, criticalityLevel: LLPCriticalityLevel.CRITICAL },
      { name: 'Low-Pressure Compressor Blade Row 1', cycleLimit: 3000, timeLimit: 20000, criticalityLevel: LLPCriticalityLevel.CONTROLLED },
      { name: 'Compressor Case Assembly', cycleLimit: null, timeLimit: 25000, criticalityLevel: LLPCriticalityLevel.TRACKED }
    ]
  },
  {
    category: 'ROTATING_ASSEMBLIES',
    parts: [
      { name: 'High-Pressure Shaft Assembly', cycleLimit: 1500, timeLimit: 15000, criticalityLevel: LLPCriticalityLevel.CRITICAL },
      { name: 'Low-Pressure Shaft Assembly', cycleLimit: 2000, timeLimit: 20000, criticalityLevel: LLPCriticalityLevel.CONTROLLED },
      { name: 'Turbine Rotor Assembly Stage 1', cycleLimit: 1200, timeLimit: 12000, criticalityLevel: LLPCriticalityLevel.CRITICAL },
      { name: 'Compressor Rotor Assembly', cycleLimit: 2500, timeLimit: 18000, criticalityLevel: LLPCriticalityLevel.CONTROLLED }
    ]
  },
  {
    category: 'STRUCTURAL_COMPONENTS',
    parts: [
      { name: 'Engine Mount Assembly', cycleLimit: null, timeLimit: 30000, criticalityLevel: LLPCriticalityLevel.TRACKED },
      { name: 'Combustor Liner Assembly', cycleLimit: 800, timeLimit: 8000, criticalityLevel: LLPCriticalityLevel.CRITICAL },
      { name: 'Exhaust Nozzle Assembly', cycleLimit: 2000, timeLimit: 22000, criticalityLevel: LLPCriticalityLevel.CONTROLLED },
      { name: 'Fan Containment Case', cycleLimit: null, timeLimit: 40000, criticalityLevel: LLPCriticalityLevel.TRACKED }
    ]
  }
];

// Event type templates with realistic scenarios
const EVENT_TEMPLATES = [
  { type: 'MANUFACTURING_COMPLETE', cycles: 0, hours: 0, probability: 1.0 },
  { type: 'QUALITY_INSPECTION', cycles: 0, hours: 0, probability: 0.9 },
  { type: 'INSTALLATION', cycles: 0, hours: 0, probability: 1.0 },
  { type: 'OPERATION', cycles: null, hours: null, probability: 0.8 },
  { type: 'MAINTENANCE', cycles: null, hours: null, probability: 0.6 },
  { type: 'INSPECTION', cycles: null, hours: null, probability: 0.4 },
  { type: 'REPAIR', cycles: null, hours: null, probability: 0.2 },
  { type: 'REMOVAL', cycles: null, hours: null, probability: 0.3 },
  { type: 'OVERHAUL', cycles: null, hours: null, probability: 0.15 },
  { type: 'RETIREMENT', cycles: null, hours: null, probability: 0.1 }
];

class LLPDataGenerator {
  private config: LLPSeedConfig;
  private uniqueSuffix: string;
  private createdParts: any[] = [];
  private createdSerializedParts: any[] = [];
  private createdUsers: any[] = [];

  constructor(config: LLPSeedConfig) {
    this.config = config;
    this.uniqueSuffix = Date.now().toString().slice(-6);
  }

  async generateComprehensiveLLPData(): Promise<void> {
    console.log('🔧 Starting LLP Data Generation...');
    console.log(`📊 Configuration: ${this.config.llpPartCount} parts, ${this.config.serializedPartsPerPart} serialized each`);

    // Create prerequisite data
    await this.createPrerequisiteData();

    // Generate LLP parts
    await this.generateLLPParts();

    // Generate serialized parts with complete lifecycles
    await this.generateSerializedPartsWithLifecycles();

    // Generate alerts
    await this.generateAlerts();

    // Generate certifications
    await this.generateCertifications();

    // Generate complex scenarios if enabled
    if (this.config.includeComplexScenarios) {
      await this.generateComplexScenarios();
    }

    console.log('✅ LLP Data Generation Complete!');
    this.printSummary();
  }

  private async createPrerequisiteData(): Promise<void> {
    console.log('👥 Creating prerequisite data...');

    // Create demo users for LLP operations
    const users = [
      { username: 'llp.operator', firstName: 'LLP', lastName: 'Operator', email: 'llp.operator@aerospace.com', role: 'Production Operator' },
      { username: 'llp.supervisor', firstName: 'LLP', lastName: 'Supervisor', email: 'llp.supervisor@aerospace.com', role: 'Production Supervisor' },
      { username: 'llp.engineer', firstName: 'LLP', lastName: 'Engineer', email: 'llp.engineer@aerospace.com', role: 'Manufacturing Engineer' },
      { username: 'llp.inspector', firstName: 'Quality', lastName: 'Inspector', email: 'quality.inspector@aerospace.com', role: 'Quality Inspector' },
      { username: 'llp.mechanic', firstName: 'Aircraft', lastName: 'Mechanic', email: 'mechanic@airline.com', role: 'Maintenance Technician' }
    ];

    for (const userData of users) {
      const user = await prisma.user.upsert({
        where: { username: userData.username },
        create: {
          ...userData,
          passwordHash: '$2b$10$hashedpassword', // Demo password hash
          isActive: true
        },
        update: userData
      });
      this.createdUsers.push(user);
    }

    console.log(`✅ Created ${this.createdUsers.length} demo users`);
  }

  private async generateLLPParts(): Promise<void> {
    console.log('⚙️ Generating LLP parts...');

    let partIndex = 0;
    for (const category of LLP_PART_TEMPLATES) {
      for (const template of category.parts) {
        if (partIndex >= this.config.llpPartCount) break;

        const retirementType = this.determineRetirementType(template.cycleLimit, template.timeLimit);
        const partNumber = `LLP-${category.category.substring(0, 3)}-${String(partIndex + 1).padStart(3, '0')}-${this.uniqueSuffix}`;

        const part = await prisma.part.create({
          data: {
            partNumber,
            partName: template.name,
            partType: 'MANUFACTURED',
            description: `${template.name} - Life-Limited Part for aerospace engine`,
            isLifeLimited: true,
            llpCriticalityLevel: template.criticalityLevel,
            llpRetirementType: retirementType,
            llpCycleLimit: template.cycleLimit,
            llpTimeLimit: template.timeLimit,
            llpInspectionInterval: template.cycleLimit ? Math.floor(template.cycleLimit * 0.1) : null,
            llpRegulatoryReference: this.generateRegulatoryReference(),
            llpCertificationRequired: template.criticalityLevel === LLPCriticalityLevel.CRITICAL,
            llpNotes: `Critical aerospace component requiring life tracking per ${this.generateRegulatoryReference()}`,
            createdAt: faker.date.past({ years: 2 }),
            updatedAt: new Date()
          }
        });

        this.createdParts.push({ ...part, template, category: category.category });
        partIndex++;
      }
    }

    console.log(`✅ Created ${this.createdParts.length} LLP parts`);
  }

  private async generateSerializedPartsWithLifecycles(): Promise<void> {
    console.log('🏭 Generating serialized parts with complete lifecycles...');

    for (const part of this.createdParts) {
      for (let i = 0; i < this.config.serializedPartsPerPart; i++) {
        const serialNumber = `SN-${part.partNumber.split('-')[1]}-${String(i + 1).padStart(3, '0')}-${this.uniqueSuffix}`;

        const manufacturingDate = faker.date.past({ years: 3 });
        const status = this.determinePartStatus();

        const serializedPart = await prisma.serializedPart.create({
          data: {
            partId: part.id,
            serialNumber,
            status,
            manufacturingDate,
            location: this.generateLocation(),
            notes: `Serialized ${part.partName} for engine tracking`,
            createdAt: manufacturingDate,
            updatedAt: new Date()
          }
        });

        // Generate complete lifecycle for this serialized part
        await this.generateLifecycleEvents(serializedPart, part);

        this.createdSerializedParts.push({ ...serializedPart, part });
      }
    }

    console.log(`✅ Created ${this.createdSerializedParts.length} serialized parts with lifecycles`);
  }

  private async generateLifecycleEvents(serializedPart: any, part: any): Promise<void> {
    const events = [];
    let currentCycles = 0;
    let currentHours = 0;
    let currentDate = new Date(serializedPart.manufacturingDate);

    // Always start with manufacturing
    events.push({
      serializedPartId: serializedPart.id,
      eventType: 'MANUFACTURING_COMPLETE',
      eventDate: currentDate,
      cyclesAtEvent: 0,
      hoursAtEvent: 0,
      performedBy: this.getRandomUser().username,
      location: 'Manufacturing Plant A',
      notes: 'Initial manufacturing completion and quality verification',
      metadata: {
        batchNumber: `BATCH-${faker.string.alphanumeric(8).toUpperCase()}`,
        qualityLevel: part.llpCriticalityLevel,
        manufacturingProcess: this.generateManufacturingProcess(part.category)
      }
    });

    // Quality inspection after manufacturing
    if (Math.random() < 0.9) {
      currentDate = new Date(currentDate.getTime() + faker.number.int({ min: 1, max: 7 }) * 24 * 60 * 60 * 1000);
      events.push({
        serializedPartId: serializedPart.id,
        eventType: 'QUALITY_INSPECTION',
        eventDate: currentDate,
        cyclesAtEvent: 0,
        hoursAtEvent: 0,
        performedBy: this.createdUsers.find(u => u.role === 'Quality Inspector')?.username || 'quality.inspector',
        location: 'Quality Control Lab',
        notes: 'Comprehensive dimensional and material verification',
        inspectionResults: {
          dimensionalCheck: 'PASS',
          materialVerification: 'PASS',
          surfaceFinish: 'PASS',
          ndt: {
            ultrasonicTest: 'PASS',
            eddyCurrent: 'PASS',
            fluorescantPenetrant: 'PASS'
          }
        }
      });
    }

    // Installation event
    currentDate = new Date(currentDate.getTime() + faker.number.int({ min: 7, max: 30 }) * 24 * 60 * 60 * 1000);
    events.push({
      serializedPartId: serializedPart.id,
      eventType: 'INSTALLATION',
      eventDate: currentDate,
      cyclesAtEvent: 0,
      hoursAtEvent: 0,
      parentAssemblyId: `ENGINE-${faker.string.alphanumeric(8).toUpperCase()}`,
      parentSerialNumber: `ENG-${faker.string.alphanumeric(6).toUpperCase()}`,
      workOrderId: `WO-INSTALL-${faker.string.alphanumeric(6)}`,
      performedBy: this.createdUsers.find(u => u.role === 'Maintenance Technician')?.username || 'llp.mechanic',
      location: this.generateMaintenanceLocation(),
      notes: 'Initial installation in engine assembly',
      metadata: {
        installationProcedure: `PROC-INSTALL-${part.category.substring(0, 3)}-001`,
        torqueSpecifications: this.generateTorqueSpecs(),
        toolsUsed: ['TORQUE_WRENCH', 'ALIGNMENT_FIXTURE', 'THREAD_LOCKER']
      }
    });

    // Generate operational and maintenance events
    const remainingEvents = this.config.eventsPerPart - 3; // Account for manufacturing, inspection, installation
    for (let i = 0; i < remainingEvents; i++) {
      const template = this.selectEventTemplate(serializedPart.status === 'RETIRED' && i === remainingEvents - 1);

      // Skip if random probability doesn't match
      if (Math.random() > template.probability) continue;

      // Calculate time progression
      const daysToAdd = faker.number.int({ min: 30, max: 180 });
      currentDate = new Date(currentDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);

      // Calculate usage progression based on part limits and time
      if (template.type === 'OPERATION') {
        const cycleIncrement = faker.number.int({ min: 20, max: 100 });
        const hourIncrement = faker.number.int({ min: 100, max: 500 });
        currentCycles += cycleIncrement;
        currentHours += hourIncrement;

        // Respect part limits
        if (part.llpCycleLimit && currentCycles > part.llpCycleLimit * 0.95) {
          currentCycles = Math.floor(part.llpCycleLimit * faker.number.float({ min: 0.8, max: 0.95 }));
        }
        if (part.llpTimeLimit && currentHours > part.llpTimeLimit * 0.95) {
          currentHours = Math.floor(part.llpTimeLimit * faker.number.float({ min: 0.8, max: 0.95 }));
        }
      }

      const event = {
        serializedPartId: serializedPart.id,
        eventType: template.type,
        eventDate: currentDate,
        cyclesAtEvent: currentCycles,
        hoursAtEvent: currentHours,
        performedBy: this.getRandomUser().username,
        location: template.type.includes('OPERATION') ? 'In Service' : this.generateMaintenanceLocation(),
        notes: this.generateEventNotes(template.type, currentCycles, currentHours),
        ...this.generateEventSpecificData(template.type, part, currentCycles, currentHours)
      };

      events.push(event);
    }

    // Create all events
    await prisma.llpLifeHistory.createMany({ data: events });
  }

  private async generateAlerts(): Promise<void> {
    console.log('🚨 Generating LLP alerts...');

    const alertCount = Math.floor(this.createdSerializedParts.length * this.config.alertsPercentage / 100);
    const selectedParts = faker.helpers.arrayElements(this.createdSerializedParts, alertCount);

    for (const serializedPart of selectedParts) {
      const alertType = faker.helpers.arrayElement(Object.values(LLPAlertType));
      const severity = this.determineSeverityForPart(serializedPart);

      const alert = await prisma.llpAlert.create({
        data: {
          serializedPartId: serializedPart.id,
          alertType,
          severity,
          title: this.generateAlertTitle(alertType, severity),
          message: this.generateAlertMessage(alertType, severity, serializedPart),
          currentCycles: faker.number.int({ min: 100, max: 900 }),
          currentHours: faker.number.int({ min: 1000, max: 8000 }),
          cycleThreshold: serializedPart.part.llpCycleLimit ? Math.floor(serializedPart.part.llpCycleLimit * 0.75) : null,
          hourThreshold: serializedPart.part.llpTimeLimit ? Math.floor(serializedPart.part.llpTimeLimit * 0.75) : null,
          isActive: Math.random() > 0.3, // 70% active
          isAcknowledged: Math.random() > 0.5,
          acknowledgedBy: Math.random() > 0.5 ? this.getRandomUser().username : null,
          acknowledgedAt: Math.random() > 0.5 ? faker.date.recent({ days: 30 }) : null,
          generatedAt: faker.date.recent({ days: 60 }),
          metadata: {
            percentageUsed: faker.number.float({ min: 50, max: 95 }),
            estimatedRetirementDate: faker.date.future({ years: 1 }).toISOString(),
            riskLevel: severity === LLPAlertSeverity.CRITICAL || severity === LLPAlertSeverity.URGENT ? 'HIGH' : 'MODERATE',
            automaticGeneration: true
          }
        }
      });

      // Some alerts may be resolved
      if (!alert.isActive && Math.random() > 0.5) {
        await prisma.llpAlert.update({
          where: { id: alert.id },
          data: {
            resolvedBy: this.getRandomUser().username,
            resolvedAt: faker.date.recent({ days: 15 }),
            resolution: this.generateResolution(alertType),
            resolutionNotes: this.generateResolutionNotes(alertType)
          }
        });
      }
    }

    console.log(`✅ Created ${alertCount} LLP alerts`);
  }

  private async generateCertifications(): Promise<void> {
    console.log('📜 Generating LLP certifications...');

    let certificationCount = 0;
    for (const serializedPart of this.createdSerializedParts) {
      const certCount = faker.number.int({ min: 1, max: this.config.certificationsPerPart });

      for (let i = 0; i < certCount; i++) {
        const certificationType = faker.helpers.arrayElement(Object.values(LLPCertificationType));
        const issuedDate = faker.date.between({
          from: serializedPart.manufacturingDate,
          to: new Date()
        });

        const certification = await prisma.llpCertification.create({
          data: {
            serializedPartId: serializedPart.id,
            certificationType,
            certificationNumber: this.generateCertificationNumber(certificationType, serializedPart),
            issuingOrganization: this.generateIssuingOrganization(certificationType),
            issuedDate,
            expirationDate: this.calculateExpirationDate(issuedDate, certificationType),
            certificationStandard: this.getCertificationStandard(certificationType),
            documentUrl: `/api/llp/documents/cert-${faker.string.alphanumeric(8)}.pdf`,
            isActive: Math.random() > 0.1, // 90% active
            isVerified: Math.random() > 0.2, // 80% verified
            verifiedBy: Math.random() > 0.2 ? this.getRandomUser().username : null,
            verifiedAt: Math.random() > 0.2 ? faker.date.recent({ days: 30 }) : null,
            verificationNotes: Math.random() > 0.3 ? 'Certification reviewed and verified as authentic' : null,
            complianceStandards: this.getComplianceStandards(certificationType),
            metadata: this.generateCertificationMetadata(certificationType, serializedPart)
          }
        });

        certificationCount++;
      }
    }

    console.log(`✅ Created ${certificationCount} LLP certifications`);
  }

  private async generateComplexScenarios(): Promise<void> {
    console.log('🌟 Generating complex LLP scenarios...');

    // Scenario 1: Part exceeding life limits (urgent situation)
    const criticalPart = this.createdSerializedParts.find(sp =>
      sp.part.llpCriticalityLevel === LLPCriticalityLevel.CRITICAL
    );

    if (criticalPart) {
      await this.createExceededLimitsScenario(criticalPart);
    }

    // Scenario 2: Part with certification expiration issues
    const controlledPart = this.createdSerializedParts.find(sp =>
      sp.part.llpCriticalityLevel === LLPCriticalityLevel.CONTROLLED
    );

    if (controlledPart) {
      await this.createCertificationExpirationScenario(controlledPart);
    }

    // Scenario 3: Part with complex maintenance history
    const trackedPart = this.createdSerializedParts.find(sp =>
      sp.part.llpCriticalityLevel === LLPCriticalityLevel.TRACKED
    );

    if (trackedPart) {
      await this.createComplexMaintenanceScenario(trackedPart);
    }

    console.log('✅ Created complex LLP scenarios');
  }

  private async createExceededLimitsScenario(serializedPart: any): Promise<void> {
    // Create urgent alert for exceeded limits
    await prisma.llpAlert.create({
      data: {
        serializedPartId: serializedPart.id,
        alertType: LLPAlertType.LIFE_LIMIT_EXCEEDED,
        severity: LLPAlertSeverity.URGENT,
        title: 'URGENT: Life Limit Exceeded',
        message: 'Part has exceeded critical life limits - immediate retirement required',
        currentCycles: serializedPart.part.llpCycleLimit ? serializedPart.part.llpCycleLimit + 50 : 0,
        currentHours: serializedPart.part.llpTimeLimit ? serializedPart.part.llpTimeLimit + 100 : 0,
        cycleThreshold: serializedPart.part.llpCycleLimit,
        hourThreshold: serializedPart.part.llpTimeLimit,
        isActive: true,
        isAcknowledged: true,
        acknowledgedBy: this.createdUsers.find(u => u.role === 'Production Supervisor')?.username,
        acknowledgedAt: faker.date.recent({ days: 1 }),
        generatedAt: faker.date.recent({ days: 2 }),
        metadata: {
          percentageUsed: 105,
          exceedsCycles: !!serializedPart.part.llpCycleLimit,
          exceedsHours: !!serializedPart.part.llpTimeLimit,
          safetyRisk: 'HIGH',
          requiresImmediateAction: true
        }
      }
    });

    // Create recent life event showing exceeded usage
    await prisma.llpLifeHistory.create({
      data: {
        serializedPartId: serializedPart.id,
        eventType: 'OPERATION',
        eventDate: faker.date.recent({ days: 1 }),
        cyclesAtEvent: serializedPart.part.llpCycleLimit ? serializedPart.part.llpCycleLimit + 50 : 0,
        hoursAtEvent: serializedPart.part.llpTimeLimit ? serializedPart.part.llpTimeLimit + 100 : 0,
        performedBy: 'SYSTEM',
        location: 'In Service',
        notes: 'CRITICAL: Part usage has exceeded certified life limits',
        metadata: {
          automaticDetection: true,
          exceedsLimits: true,
          riskAssessment: 'IMMEDIATE_RETIREMENT_REQUIRED'
        }
      }
    });
  }

  private async createCertificationExpirationScenario(serializedPart: any): Promise<void> {
    // Create expiring certification
    const expiringDate = new Date();
    expiringDate.setDate(expiringDate.getDate() + 15); // Expires in 15 days

    await prisma.llpCertification.create({
      data: {
        serializedPartId: serializedPart.id,
        certificationType: LLPCertificationType.MAINTENANCE,
        certificationNumber: `EXPIRING-${faker.string.alphanumeric(8)}`,
        issuingOrganization: 'Authorized Maintenance Organization',
        issuedDate: faker.date.past({ years: 1 }),
        expirationDate: expiringDate,
        certificationStandard: 'FAR 145',
        documentUrl: `/api/llp/documents/expiring-${faker.string.alphanumeric(8)}.pdf`,
        isActive: true,
        isVerified: true,
        verifiedBy: this.getRandomUser().username,
        verifiedAt: faker.date.past({ days: 300 }),
        complianceStandards: ['FAA', 'EASA'],
        metadata: {
          certificationScope: 'SCHEDULED_MAINTENANCE',
          nextInspectionDue: expiringDate.toISOString(),
          urgentRenewalRequired: true
        }
      }
    });

    // Create alert for expiring certification
    await prisma.llpAlert.create({
      data: {
        serializedPartId: serializedPart.id,
        alertType: LLPAlertType.CERTIFICATION_EXPIRING,
        severity: LLPAlertSeverity.WARNING,
        title: 'Certification Expiring Soon',
        message: 'Maintenance certification expires in 15 days - renewal required',
        currentCycles: faker.number.int({ min: 400, max: 800 }),
        currentHours: faker.number.int({ min: 3000, max: 7000 }),
        isActive: true,
        isAcknowledged: false,
        generatedAt: faker.date.recent({ days: 1 }),
        metadata: {
          expirationDate: expiringDate.toISOString(),
          daysUntilExpiration: 15,
          renewalRequired: true,
          complianceRisk: 'MODERATE'
        }
      }
    });
  }

  private async createComplexMaintenanceScenario(serializedPart: any): Promise<void> {
    // Create series of complex maintenance events
    const maintenanceEvents = [
      {
        eventType: 'INSPECTION',
        notes: 'Routine borescope inspection - minor wear noted',
        inspectionResults: {
          borescope: 'MINOR_WEAR',
          visualInspection: 'PASS',
          measurements: { wear: '0.002in', withinLimits: true }
        }
      },
      {
        eventType: 'REPAIR',
        notes: 'Minor repair performed - blend repair on leading edge',
        repairDetails: {
          repairType: 'BLEND_REPAIR',
          location: 'LEADING_EDGE',
          repairProcedure: 'RP-BLEND-001',
          beforeDimensions: { thickness: '0.125in' },
          afterDimensions: { thickness: '0.123in' },
          withinRepairLimits: true
        }
      },
      {
        eventType: 'MAINTENANCE',
        notes: 'Comprehensive overhaul - component refurbishment',
        metadata: {
          maintenanceType: 'OVERHAUL',
          workScope: 'COMPREHENSIVE_REFURBISHMENT',
          proceduresFollowed: ['PROC-OH-001', 'PROC-OH-002'],
          componentsReplaced: ['SEAL_RING', 'GASKET_ASSEMBLY'],
          testResults: { vibrationTest: 'PASS', balanceTest: 'PASS' }
        }
      }
    ];

    let eventDate = faker.date.past({ years: 1 });
    let cycles = faker.number.int({ min: 200, max: 400 });
    let hours = faker.number.int({ min: 1500, max: 3000 });

    for (const eventTemplate of maintenanceEvents) {
      eventDate = new Date(eventDate.getTime() + faker.number.int({ min: 60, max: 120 }) * 24 * 60 * 60 * 1000);
      cycles += faker.number.int({ min: 20, max: 50 });
      hours += faker.number.int({ min: 150, max: 350 });

      await prisma.llpLifeHistory.create({
        data: {
          serializedPartId: serializedPart.id,
          eventType: eventTemplate.eventType,
          eventDate,
          cyclesAtEvent: cycles,
          hoursAtEvent: hours,
          workOrderId: `WO-${faker.string.alphanumeric(8)}`,
          performedBy: this.createdUsers.find(u => u.role === 'Maintenance Technician')?.username || 'llp.mechanic',
          location: this.generateMaintenanceLocation(),
          notes: eventTemplate.notes,
          inspectionResults: (eventTemplate as any).inspectionResults || null,
          repairDetails: (eventTemplate as any).repairDetails || null,
          metadata: (eventTemplate as any).metadata || null
        }
      });
    }
  }

  // Helper methods for data generation
  private determineRetirementType(cycleLimit: number | null, timeLimit: number | null): LLPRetirementType {
    if (cycleLimit && timeLimit) return LLPRetirementType.CYCLES_OR_TIME;
    if (cycleLimit && !timeLimit) return LLPRetirementType.CYCLES_ONLY;
    if (!cycleLimit && timeLimit) return LLPRetirementType.TIME_ONLY;
    return LLPRetirementType.CYCLES_OR_TIME; // Default
  }

  private generateRegulatoryReference(): string {
    const authorities = ['FAA', 'EASA', 'TCCA'];
    const types = ['AD', 'SB', 'SIL', 'ASB'];
    const authority = faker.helpers.arrayElement(authorities);
    const type = faker.helpers.arrayElement(types);
    const year = faker.date.past({ years: 5 }).getFullYear();
    const number = faker.string.numeric(3);

    return `${authority}-${type}-${year}-${number}`;
  }

  private determinePartStatus(): string {
    const statuses = ['ACTIVE', 'IN_MAINTENANCE', 'STORED', 'RETIRED'];
    const weights = [0.7, 0.15, 0.1, 0.05]; // 70% active, 15% maintenance, 10% stored, 5% retired

    const random = Math.random();
    let cumulative = 0;

    for (let i = 0; i < weights.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }

    return 'ACTIVE';
  }

  private generateLocation(): string {
    const locations = [
      'Engine Assembly Bay 1',
      'Engine Assembly Bay 2',
      'Quality Control Lab',
      'Component Storage A',
      'Component Storage B',
      'Maintenance Hangar 1',
      'Maintenance Hangar 2',
      'Line Maintenance Station',
      'Engine Test Cell',
      'Parts Warehouse'
    ];

    return faker.helpers.arrayElement(locations);
  }

  private generateMaintenanceLocation(): string {
    const locations = [
      'Maintenance Hangar A',
      'Maintenance Hangar B',
      'Line Maintenance Station 1',
      'Line Maintenance Station 2',
      'Component Repair Shop',
      'Engine Overhaul Facility',
      'Aircraft Maintenance Base',
      'Quick Turn Station'
    ];

    return faker.helpers.arrayElement(locations);
  }

  private selectEventTemplate(forceRetirement: boolean = false): any {
    if (forceRetirement) {
      return EVENT_TEMPLATES.find(t => t.type === 'RETIREMENT') || EVENT_TEMPLATES[0];
    }

    return faker.helpers.arrayElement(EVENT_TEMPLATES.filter(t => t.type !== 'RETIREMENT'));
  }

  private generateEventNotes(eventType: string, cycles: number, hours: number): string {
    const noteTemplates = {
      'MANUFACTURING_COMPLETE': 'Part manufacturing completed and passed final quality inspection',
      'QUALITY_INSPECTION': 'Comprehensive quality inspection performed per procedure',
      'INSTALLATION': 'Part installed in engine assembly per maintenance manual',
      'OPERATION': `Operational data recorded - ${cycles} cycles, ${hours} hours total time`,
      'MAINTENANCE': 'Scheduled maintenance performed per manufacturer recommendations',
      'INSPECTION': 'Detailed inspection completed - all parameters within limits',
      'REPAIR': 'Minor repair performed per approved repair procedure',
      'REMOVAL': 'Part removed from service for scheduled maintenance',
      'OVERHAUL': 'Complete overhaul performed at authorized repair station',
      'RETIREMENT': 'Part retired from service due to life limit expiration'
    };

    return noteTemplates[eventType] || `${eventType} event recorded`;
  }

  private generateEventSpecificData(eventType: string, part: any, cycles: number, hours: number): any {
    const commonData: any = {};

    switch (eventType) {
      case 'INSTALLATION':
        commonData.parentAssemblyId = `ENGINE-${faker.string.alphanumeric(8)}`;
        commonData.parentSerialNumber = `ENG-${faker.string.alphanumeric(6)}`;
        commonData.workOrderId = `WO-${faker.string.alphanumeric(8)}`;
        break;

      case 'MAINTENANCE':
      case 'REPAIR':
      case 'OVERHAUL':
        commonData.workOrderId = `WO-${faker.string.alphanumeric(8)}`;
        commonData.metadata = {
          maintenanceType: eventType,
          procedureReference: `PROC-${eventType.substring(0, 4)}-001`,
          environmentalConditions: {
            temperature: `${faker.number.int({ min: 65, max: 80 })}°F`,
            humidity: `${faker.number.int({ min: 30, max: 60 })}%`
          }
        };
        break;

      case 'INSPECTION':
        commonData.inspectionResults = {
          visualInspection: 'PASS',
          dimensionalCheck: 'PASS',
          ndt: {
            required: part.llpCriticalityLevel === LLPCriticalityLevel.CRITICAL,
            results: 'PASS'
          }
        };
        break;

      case 'RETIREMENT':
        commonData.metadata = {
          retirementReason: 'LIFE_LIMIT_REACHED',
          disposition: faker.helpers.arrayElement(['SCRAP', 'MUSEUM', 'TRAINING']),
          finalCycles: cycles,
          finalHours: hours
        };
        break;
    }

    return commonData;
  }

  private generateManufacturingProcess(category: string): any {
    const processes = {
      'TURBINE_BLADES': {
        material: 'Inconel 718',
        process: 'Investment Casting',
        heatTreatment: 'Solution + Age',
        machining: 'CNC 5-Axis',
        coating: 'TBC + Bond Coat'
      },
      'COMPRESSOR_COMPONENTS': {
        material: 'Ti-6Al-4V',
        process: 'Forging + Machining',
        heatTreatment: 'Solution + Age',
        machining: 'CNC Multi-Axis',
        coating: 'None'
      },
      'ROTATING_ASSEMBLIES': {
        material: 'Inconel 718',
        process: 'Forging + Welding',
        heatTreatment: 'Stress Relief',
        machining: 'CNC Turning',
        balancing: 'Dynamic Balance'
      },
      'STRUCTURAL_COMPONENTS': {
        material: 'Aluminum 7075',
        process: 'Machining',
        heatTreatment: 'T6',
        machining: 'CNC 3-Axis',
        coating: 'Anodize'
      }
    };

    return processes[category] || processes['STRUCTURAL_COMPONENTS'];
  }

  private generateTorqueSpecs(): any {
    return {
      boltTorque: `${faker.number.int({ min: 20, max: 100 })} ft-lbs`,
      torqueSequence: 'Star Pattern',
      verificationMethod: 'Torque Wrench + Angle',
      lubricant: 'Anti-Seize Compound'
    };
  }

  private getRandomUser(): any {
    return faker.helpers.arrayElement(this.createdUsers);
  }

  private determineSeverityForPart(serializedPart: any): LLPAlertSeverity {
    const criticality = serializedPart.part.llpCriticalityLevel;

    if (criticality === LLPCriticalityLevel.CRITICAL) {
      return faker.helpers.arrayElement([LLPAlertSeverity.CRITICAL, LLPAlertSeverity.URGENT]);
    } else if (criticality === LLPCriticalityLevel.CONTROLLED) {
      return faker.helpers.arrayElement([LLPAlertSeverity.WARNING, LLPAlertSeverity.CRITICAL]);
    } else {
      return faker.helpers.arrayElement([LLPAlertSeverity.INFO, LLPAlertSeverity.WARNING]);
    }
  }

  private generateAlertTitle(alertType: LLPAlertType, severity: LLPAlertSeverity): string {
    const titles = {
      [LLPAlertType.LIFE_LIMIT_APPROACHING]: {
        [LLPAlertSeverity.INFO]: 'Life Limit Information',
        [LLPAlertSeverity.WARNING]: 'Life Limit Approaching',
        [LLPAlertSeverity.CRITICAL]: 'Critical Life Limit Warning',
        [LLPAlertSeverity.URGENT]: 'URGENT: Life Limit Critical'
      },
      [LLPAlertType.LIFE_LIMIT_EXCEEDED]: {
        [LLPAlertSeverity.URGENT]: 'URGENT: Life Limit Exceeded'
      },
      [LLPAlertType.INSPECTION_DUE]: {
        [LLPAlertSeverity.INFO]: 'Inspection Due',
        [LLPAlertSeverity.WARNING]: 'Inspection Overdue'
      },
      [LLPAlertType.CERTIFICATION_EXPIRING]: {
        [LLPAlertSeverity.WARNING]: 'Certification Expiring',
        [LLPAlertSeverity.CRITICAL]: 'Certification Expired'
      }
    };

    return titles[alertType]?.[severity] || `${alertType} Alert`;
  }

  private generateAlertMessage(alertType: LLPAlertType, severity: LLPAlertSeverity, serializedPart: any): string {
    const partName = serializedPart.part.partName;
    const serialNumber = serializedPart.serialNumber;

    switch (alertType) {
      case LLPAlertType.LIFE_LIMIT_APPROACHING:
        return `${partName} (S/N: ${serialNumber}) is approaching life limits and requires retirement planning`;
      case LLPAlertType.LIFE_LIMIT_EXCEEDED:
        return `${partName} (S/N: ${serialNumber}) has exceeded certified life limits - immediate retirement required`;
      case LLPAlertType.INSPECTION_DUE:
        return `${partName} (S/N: ${serialNumber}) requires scheduled inspection per maintenance program`;
      case LLPAlertType.CERTIFICATION_EXPIRING:
        return `Certification for ${partName} (S/N: ${serialNumber}) is expiring - renewal required`;
      default:
        return `Alert for ${partName} (S/N: ${serialNumber})`;
    }
  }

  private generateResolution(alertType: LLPAlertType): string {
    const resolutions = {
      [LLPAlertType.LIFE_LIMIT_APPROACHING]: 'RETIREMENT_SCHEDULED',
      [LLPAlertType.LIFE_LIMIT_EXCEEDED]: 'PART_RETIRED',
      [LLPAlertType.INSPECTION_DUE]: 'INSPECTION_COMPLETED',
      [LLPAlertType.CERTIFICATION_EXPIRING]: 'CERTIFICATION_RENEWED'
    };

    return resolutions[alertType] || 'RESOLVED';
  }

  private generateResolutionNotes(alertType: LLPAlertType): string {
    const notes = {
      [LLPAlertType.LIFE_LIMIT_APPROACHING]: 'Retirement scheduled for next maintenance cycle',
      [LLPAlertType.LIFE_LIMIT_EXCEEDED]: 'Part immediately retired and removed from service',
      [LLPAlertType.INSPECTION_DUE]: 'Inspection completed successfully, all parameters within limits',
      [LLPAlertType.CERTIFICATION_EXPIRING]: 'Certification renewed for next compliance period'
    };

    return notes[alertType] || 'Alert resolved per standard procedure';
  }

  private generateCertificationNumber(type: LLPCertificationType, serializedPart: any): string {
    const prefixes = {
      [LLPCertificationType.MANUFACTURING]: 'MANUF',
      [LLPCertificationType.INSTALLATION]: 'INSTALL',
      [LLPCertificationType.MAINTENANCE]: 'MAINT',
      [LLPCertificationType.OVERHAUL]: 'OVERHAUL',
      [LLPCertificationType.REPAIR]: 'REPAIR'
    };

    const prefix = prefixes[type] || 'CERT';
    const year = new Date().getFullYear();
    const number = faker.string.numeric(6);

    return `${prefix}-${year}-${number}`;
  }

  private generateIssuingOrganization(type: LLPCertificationType): string {
    const organizations = {
      [LLPCertificationType.MANUFACTURING]: 'Manufacturing Quality Assurance',
      [LLPCertificationType.INSTALLATION]: 'Certified Installation Team',
      [LLPCertificationType.MAINTENANCE]: 'Authorized Maintenance Organization',
      [LLPCertificationType.OVERHAUL]: 'Approved Overhaul Facility',
      [LLPCertificationType.REPAIR]: 'Certified Repair Station'
    };

    return organizations[type] || 'Certification Authority';
  }

  private calculateExpirationDate(issuedDate: Date, type: LLPCertificationType): Date | null {
    const expirationMonths = {
      [LLPCertificationType.MANUFACTURING]: null, // No expiration
      [LLPCertificationType.INSTALLATION]: 24,
      [LLPCertificationType.MAINTENANCE]: 12,
      [LLPCertificationType.OVERHAUL]: 36,
      [LLPCertificationType.REPAIR]: 18
    };

    const months = expirationMonths[type];
    if (!months) return null;

    const expirationDate = new Date(issuedDate);
    expirationDate.setMonth(expirationDate.getMonth() + months);
    return expirationDate;
  }

  private getCertificationStandard(type: LLPCertificationType): string {
    const standards = {
      [LLPCertificationType.MANUFACTURING]: 'AS9100',
      [LLPCertificationType.INSTALLATION]: 'MIL-STD-1530',
      [LLPCertificationType.MAINTENANCE]: 'FAR 145',
      [LLPCertificationType.OVERHAUL]: 'FAR 145',
      [LLPCertificationType.REPAIR]: 'FAR 145'
    };

    return standards[type] || 'Industry Standard';
  }

  private getComplianceStandards(type: LLPCertificationType): string[] {
    const standards = {
      [LLPCertificationType.MANUFACTURING]: ['FAA', 'AS9100', 'ISO 9001'],
      [LLPCertificationType.INSTALLATION]: ['FAA', 'EASA'],
      [LLPCertificationType.MAINTENANCE]: ['FAA', 'EASA', 'TCCA'],
      [LLPCertificationType.OVERHAUL]: ['FAA', 'EASA'],
      [LLPCertificationType.REPAIR]: ['FAA', 'EASA']
    };

    return standards[type] || ['FAA'];
  }

  private generateCertificationMetadata(type: LLPCertificationType, serializedPart: any): any {
    switch (type) {
      case LLPCertificationType.MANUFACTURING:
        return {
          batchNumber: `BATCH-${faker.string.alphanumeric(8)}`,
          qualityLevel: serializedPart.part.llpCriticalityLevel,
          materialCertification: 'Material Test Report MTR-' + faker.string.numeric(6),
          heatTreatmentCert: 'HT-CERT-' + faker.string.numeric(6)
        };

      case LLPCertificationType.INSTALLATION:
        return {
          installationProcedure: `PROC-INSTALL-${faker.string.alphanumeric(6)}`,
          torqueSpecifications: this.generateTorqueSpecs(),
          installationDate: faker.date.past({ years: 1 }).toISOString(),
          installedBy: this.getRandomUser().username
        };

      case LLPCertificationType.MAINTENANCE:
        return {
          maintenanceType: 'SCHEDULED_INSPECTION',
          workOrderNumber: `WO-MAINT-${faker.string.alphanumeric(8)}`,
          nextInspectionDue: faker.date.future({ years: 1 }).toISOString(),
          complianceChecks: ['VISUAL', 'DIMENSIONAL', 'NDT']
        };

      default:
        return {
          certificationScope: type,
          validUntil: this.calculateExpirationDate(new Date(), type)?.toISOString()
        };
    }
  }

  private printSummary(): void {
    console.log('\n📊 LLP Data Generation Summary:');
    console.log(`   💼 Parts Created: ${this.createdParts.length}`);
    console.log(`   🏷️  Serialized Parts: ${this.createdSerializedParts.length}`);
    console.log(`   📝 Life Events: ~${this.createdSerializedParts.length * this.config.eventsPerPart}`);
    console.log(`   🚨 Alerts: ~${Math.floor(this.createdSerializedParts.length * this.config.alertsPercentage / 100)}`);
    console.log(`   📜 Certifications: ~${this.createdSerializedParts.length * this.config.certificationsPerPart}`);
    console.log(`   👥 Demo Users: ${this.createdUsers.length}`);
    console.log('\n🎯 Ready for development and testing!');
  }
}

// Main execution
async function main() {
  try {
    console.log('🚀 Starting LLP Seed Data Generation...\n');

    // Determine configuration
    const isComprehensive = process.env.COMPREHENSIVE_LLP === 'true';
    const config = isComprehensive ? COMPREHENSIVE_CONFIG : DEFAULT_CONFIG;

    console.log(`⚙️  Configuration: ${isComprehensive ? 'COMPREHENSIVE' : 'DEFAULT'}`);
    console.log(`📊 Scale: ${config.llpPartCount} parts × ${config.serializedPartsPerPart} serialized each\n`);

    const generator = new LLPDataGenerator(config);
    await generator.generateComprehensiveLLPData();

  } catch (error) {
    console.error('❌ Error generating LLP seed data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Execute if run directly
if (require.main === module) {
  main()
    .then(() => {
      console.log('\n✅ LLP seed data generation completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Fatal error:', error);
      process.exit(1);
    });
}

export { LLPDataGenerator, DEFAULT_CONFIG, COMPREHENSIVE_CONFIG };