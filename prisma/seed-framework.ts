/**
 * Comprehensive Seed Data Generation Framework
 * Issue #162: Testing Infrastructure: Comprehensive Development Environment Seed Data Enhancement
 *
 * This framework generates realistic test data for all 7 manufacturing modalities:
 * - Additive Manufacturing
 * - Composites
 * - Turbine Airfoils
 * - Rotating Parts
 * - Tubes & Ducts
 * - Combustors & Structures
 * - Engine Assembly
 */

import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';

// =============================================================================
// CORE FRAMEWORK INTERFACES
// =============================================================================

export interface ManufacturingModality {
  name: string;
  code: string;
  description: string;
  materialTypes: string[];
  equipmentTypes: string[];
  processTypes: string[];
  qualityRequirements: string[];
  partCategories: PartCategory[];
}

export interface PartCategory {
  name: string;
  partCount: number;
  complexity: 'SIMPLE' | 'MODERATE' | 'COMPLEX';
  workOrdersPerPart: {
    historic: number;
    active: number;
    planned: number;
  };
  materialUsage: MaterialRequirement[];
  operationTypes: string[];
}

export interface MaterialRequirement {
  materialCode: string;
  quantityRange: [number, number];
  unit: string;
  wastePercentage: number;
}

export interface SeedDataConfig {
  enterpriseCount: number;
  sitesPerEnterprise: number;
  areasPerSite: number;
  modalitiesPerSite: string[];
  scaleFactor: number; // Multiplier for data volume (1.0 = standard, 2.0 = double, etc.)
  generateHistoricalData: boolean;
  historicalDataYears: number;
}

// =============================================================================
// MANUFACTURING MODALITY DEFINITIONS
// =============================================================================

export const MANUFACTURING_MODALITIES: Record<string, ManufacturingModality> = {
  ADDITIVE: {
    name: 'Additive Manufacturing',
    code: 'AM',
    description: 'Layer-by-layer 3D printing and additive processes',
    materialTypes: ['METAL_POWDER', 'POLYMER_RESIN', 'CERAMIC_SLURRY', 'SUPPORT_MATERIAL'],
    equipmentTypes: ['SLA_PRINTER', 'SLS_PRINTER', 'METAL_PBF', 'POST_PROCESSING'],
    processTypes: ['PRINT_SETUP', 'PRINTING', 'POST_CURE', 'SUPPORT_REMOVAL', 'FINISHING'],
    qualityRequirements: ['DIMENSIONAL_ACCURACY', 'SURFACE_FINISH', 'DENSITY_CHECK', 'LAYER_ADHESION'],
    partCategories: [
      {
        name: 'Prototype Components',
        partCount: 25,
        complexity: 'SIMPLE',
        workOrdersPerPart: { historic: 8, active: 2, planned: 3 },
        materialUsage: [
          { materialCode: 'AM-RESIN-001', quantityRange: [50, 200], unit: 'ML', wastePercentage: 15 },
          { materialCode: 'AM-SUPPORT-001', quantityRange: [10, 50], unit: 'ML', wastePercentage: 90 }
        ],
        operationTypes: ['DESIGN_PREP', 'PRINT_SETUP', 'PRINTING', 'POST_CURE', 'SUPPORT_REMOVAL', 'INSPECTION']
      },
      {
        name: 'Production Tooling',
        partCount: 15,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 5, active: 1, planned: 2 },
        materialUsage: [
          { materialCode: 'AM-METAL-TI64', quantityRange: [100, 500], unit: 'G', wastePercentage: 8 }
        ],
        operationTypes: ['CAD_PREP', 'SUPPORT_GEN', 'PRINTING', 'HIP_TREATMENT', 'MACHINING', 'TESTING']
      },
      {
        name: 'Complex Assemblies',
        partCount: 8,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 3, active: 1, planned: 1 },
        materialUsage: [
          { materialCode: 'AM-INCONEL-718', quantityRange: [200, 1000], unit: 'G', wastePercentage: 12 }
        ],
        operationTypes: ['TOPOLOGY_OPT', 'MULTI_MATERIAL', 'PRINTING', 'STRESS_RELIEF', 'PRECISION_MACHINING', 'NDT']
      }
    ]
  },

  COMPOSITES: {
    name: 'Composites',
    code: 'COMP',
    description: 'Fiber-reinforced composite structures and laminates',
    materialTypes: ['CARBON_FIBER', 'GLASS_FIBER', 'ARAMID_FIBER', 'EPOXY_RESIN', 'PREPREG'],
    equipmentTypes: ['AUTOCLAVE', 'LAYUP_TABLE', 'FILAMENT_WINDER', 'RTM_PRESS', 'TRIM_STATION'],
    processTypes: ['PLY_CUTTING', 'LAYUP', 'BAGGING', 'CURING', 'TRIMMING', 'MACHINING'],
    qualityRequirements: ['FIBER_ORIENTATION', 'VOID_CONTENT', 'RESIN_CONTENT', 'INTERLAMINAR_STRENGTH'],
    partCategories: [
      {
        name: 'Structural Panels',
        partCount: 20,
        complexity: 'SIMPLE',
        workOrdersPerPart: { historic: 12, active: 3, planned: 4 },
        materialUsage: [
          { materialCode: 'CF-PREPREG-001', quantityRange: [2, 8], unit: 'SQM', wastePercentage: 25 },
          { materialCode: 'RELEASE-FILM', quantityRange: [2.5, 10], unit: 'SQM', wastePercentage: 5 }
        ],
        operationTypes: ['MATERIAL_PREP', 'PLY_CUTTING', 'LAYUP', 'VACUUM_BAG', 'AUTOCLAVE_CURE', 'TRIM']
      },
      {
        name: 'Complex Shapes',
        partCount: 12,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 8, active: 2, planned: 2 },
        materialUsage: [
          { materialCode: 'CF-FABRIC-001', quantityRange: [1, 4], unit: 'SQM', wastePercentage: 30 },
          { materialCode: 'EPOXY-RESIN', quantityRange: [0.5, 2], unit: 'KG', wastePercentage: 10 }
        ],
        operationTypes: ['MANDREL_PREP', 'WET_LAYUP', 'WRAPPING', 'PRESSURE_CURE', 'MANDREL_REMOVAL', 'FINISHING']
      },
      {
        name: 'Critical Flight Hardware',
        partCount: 6,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 4, active: 1, planned: 1 },
        materialUsage: [
          { materialCode: 'HM-CF-PREPREG', quantityRange: [5, 15], unit: 'SQM', wastePercentage: 20 },
          { materialCode: 'HONEYCOMB-CORE', quantityRange: [0.5, 2], unit: 'SQM', wastePercentage: 15 }
        ],
        operationTypes: ['DESIGN_ANALYSIS', 'TOOL_PREP', 'PRECISION_LAYUP', 'CO_BONDING', 'MACHINING', 'NDT', 'PROOF_TEST']
      }
    ]
  },

  TURBINE_AIRFOILS: {
    name: 'Turbine Airfoils',
    code: 'TA',
    description: 'High-precision turbine and compressor airfoil components',
    materialTypes: ['INCONEL_718', 'RENE_80', 'TITANIUM_6AL4V', 'CERAMIC_COATING'],
    equipmentTypes: ['5AXIS_MILL', 'EDM_MACHINE', 'GRINDER', 'COATING_BOOTH', 'CMM'],
    processTypes: ['ROUGH_MILL', 'FINISH_MILL', 'EDM_DETAIL', 'GRINDING', 'COATING', 'BALANCING'],
    qualityRequirements: ['AIRFOIL_PROFILE', 'SURFACE_FINISH', 'DIMENSIONAL_TOLERANCE', 'COATING_THICKNESS'],
    partCategories: [
      {
        name: 'Fan Blades',
        partCount: 18,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 15, active: 4, planned: 5 },
        materialUsage: [
          { materialCode: 'TI-6AL4V-BAR', quantityRange: [2, 5], unit: 'KG', wastePercentage: 60 }
        ],
        operationTypes: ['FORGING', 'ROUGH_MILL', 'FINISH_MILL', 'GRINDING', 'INSPECTION', 'BALANCING']
      },
      {
        name: 'Turbine Blades',
        partCount: 24,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 10, active: 3, planned: 3 },
        materialUsage: [
          { materialCode: 'INCONEL-718', quantityRange: [1.5, 3], unit: 'KG', wastePercentage: 65 },
          { materialCode: 'TBC-COATING', quantityRange: [50, 150], unit: 'G', wastePercentage: 20 }
        ],
        operationTypes: ['CASTING', 'HIP', 'ROUGH_MILL', 'EDM', 'FINISH_MILL', 'COATING', 'FINAL_INSPECTION']
      },
      {
        name: 'Stator Vanes',
        partCount: 16,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 12, active: 3, planned: 4 },
        materialUsage: [
          { materialCode: 'RENE-80', quantityRange: [2, 4], unit: 'KG', wastePercentage: 55 }
        ],
        operationTypes: ['INVESTMENT_CAST', 'ROUGH_MILL', 'FINISH_MILL', 'GRINDING', 'COATING', 'CMM_INSPECTION']
      }
    ]
  },

  ROTATING_PARTS: {
    name: 'Rotating Parts',
    code: 'RP',
    description: 'High-speed rotating components requiring precision balancing',
    materialTypes: ['STEEL_4340', 'TITANIUM_6AL4V', 'INCONEL_625', 'ALUMINUM_7075'],
    equipmentTypes: ['CNC_LATHE', 'GRINDER', 'BALANCE_MACHINE', 'HEAT_TREAT', 'ULTRASONIC_TEST'],
    processTypes: ['TURNING', 'GRINDING', 'HEAT_TREATMENT', 'BALANCING', 'NDT', 'ASSEMBLY'],
    qualityRequirements: ['RUNOUT', 'BALANCE_GRADE', 'SURFACE_FINISH', 'HARDNESS'],
    partCategories: [
      {
        name: 'Shafts',
        partCount: 14,
        complexity: 'SIMPLE',
        workOrdersPerPart: { historic: 18, active: 4, planned: 6 },
        materialUsage: [
          { materialCode: 'STEEL-4340', quantityRange: [10, 50], unit: 'KG', wastePercentage: 35 }
        ],
        operationTypes: ['ROUGH_TURN', 'HEAT_TREAT', 'FINISH_TURN', 'GRIND', 'BALANCE', 'FINAL_INSPECT']
      },
      {
        name: 'Discs',
        partCount: 10,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 12, active: 3, planned: 3 },
        materialUsage: [
          { materialCode: 'INCONEL-625', quantityRange: [5, 25], unit: 'KG', wastePercentage: 45 }
        ],
        operationTypes: ['FORGING', 'ROUGH_MILL', 'HEAT_TREAT', 'FINISH_MILL', 'BALANCE', 'ULTRASONIC']
      },
      {
        name: 'Impellers',
        partCount: 8,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 8, active: 2, planned: 2 },
        materialUsage: [
          { materialCode: 'TI-6AL4V', quantityRange: [3, 15], unit: 'KG', wastePercentage: 70 }
        ],
        operationTypes: ['5AXIS_MILL', 'DEBURR', 'STRESS_RELIEF', 'FINISH_MILL', 'BALANCE', 'FLOW_TEST']
      }
    ]
  },

  TUBES_DUCTS: {
    name: 'Tubes & Ducts',
    code: 'TD',
    description: 'Tubular structures and ducting systems',
    materialTypes: ['STAINLESS_STEEL', 'TITANIUM_TUBE', 'ALUMINUM_TUBE', 'COMPOSITE_TUBE'],
    equipmentTypes: ['TUBE_BENDER', 'WELDING_STATION', 'PRESSURE_TEST', 'LEAK_TEST', 'FORMING_PRESS'],
    processTypes: ['CUTTING', 'BENDING', 'WELDING', 'FORMING', 'PRESSURE_TEST', 'LEAK_TEST'],
    qualityRequirements: ['DIMENSIONAL_CHECK', 'WELD_QUALITY', 'PRESSURE_RATING', 'LEAK_RATE'],
    partCategories: [
      {
        name: 'Fuel Lines',
        partCount: 22,
        complexity: 'SIMPLE',
        workOrdersPerPart: { historic: 20, active: 5, planned: 7 },
        materialUsage: [
          { materialCode: 'SS-316-TUBE', quantityRange: [2, 10], unit: 'M', wastePercentage: 15 }
        ],
        operationTypes: ['CUT_TO_LENGTH', 'BEND', 'END_FORM', 'CLEAN', 'PRESSURE_TEST', 'FINAL_INSPECT']
      },
      {
        name: 'Air Ducts',
        partCount: 16,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 15, active: 4, planned: 4 },
        materialUsage: [
          { materialCode: 'AL-6061-SHEET', quantityRange: [2, 8], unit: 'SQM', wastePercentage: 25 }
        ],
        operationTypes: ['SHEAR', 'FORM', 'WELD', 'MACHINE_FLANGES', 'LEAK_TEST', 'SURFACE_TREAT']
      },
      {
        name: 'Heat Exchangers',
        partCount: 6,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 6, active: 1, planned: 2 },
        materialUsage: [
          { materialCode: 'SS-321-TUBE', quantityRange: [20, 100], unit: 'M', wastePercentage: 20 },
          { materialCode: 'BRAZING-ALLOY', quantityRange: [0.5, 2], unit: 'KG', wastePercentage: 10 }
        ],
        operationTypes: ['TUBE_PREP', 'ASSEMBLY', 'BRAZING', 'LEAK_TEST', 'PRESSURE_TEST', 'PERFORMANCE_TEST']
      }
    ]
  },

  COMBUSTORS_STRUCTURES: {
    name: 'Combustors & Structures',
    code: 'CS',
    description: 'High-temperature combustion components and structural assemblies',
    materialTypes: ['HASTELLOY_X', 'INCONEL_625', 'CERAMIC_MATRIX', 'REFRACTORY_METAL'],
    equipmentTypes: ['PLASMA_WELDER', 'FURNACE', 'SHOT_PEEN', 'THERMAL_SPRAY', 'STRESS_RELIEF'],
    processTypes: ['FORMING', 'WELDING', 'HEAT_TREATMENT', 'COATING', 'ASSEMBLY', 'TESTING'],
    qualityRequirements: ['WELD_INTEGRITY', 'THERMAL_CYCLING', 'COATING_ADHESION', 'PRESSURE_CAPABILITY'],
    partCategories: [
      {
        name: 'Combustor Liners',
        partCount: 12,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 8, active: 2, planned: 3 },
        materialUsage: [
          { materialCode: 'HASTELLOY-X', quantityRange: [3, 12], unit: 'KG', wastePercentage: 30 },
          { materialCode: 'TBC-COATING', quantityRange: [100, 500], unit: 'G', wastePercentage: 15 }
        ],
        operationTypes: ['FORMING', 'MACHINING', 'WELDING', 'STRESS_RELIEF', 'COATING', 'THERMAL_TEST']
      },
      {
        name: 'Structural Frames',
        partCount: 8,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 10, active: 2, planned: 3 },
        materialUsage: [
          { materialCode: 'TI-6AL4V-SHEET', quantityRange: [5, 20], unit: 'KG', wastePercentage: 35 }
        ],
        operationTypes: ['SHEAR', 'FORM', 'WELD', 'HEAT_TREAT', 'MACHINE', 'FINAL_INSPECT']
      },
      {
        name: 'Nozzle Assemblies',
        partCount: 6,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 5, active: 1, planned: 2 },
        materialUsage: [
          { materialCode: 'INCONEL-625', quantityRange: [8, 30], unit: 'KG', wastePercentage: 40 },
          { materialCode: 'CERAMIC-INSULATION', quantityRange: [1, 5], unit: 'KG', wastePercentage: 20 }
        ],
        operationTypes: ['PRECISION_CAST', 'MACHINE', 'WELD', 'COATING', 'ASSEMBLY', 'FLOW_TEST']
      }
    ]
  },

  ENGINE_ASSEMBLY: {
    name: 'Engine Assembly',
    code: 'EA',
    description: 'Final engine assembly and testing operations',
    materialTypes: ['ASSEMBLY_HARDWARE', 'SEALANTS', 'LUBRICANTS', 'TEST_FLUIDS'],
    equipmentTypes: ['ASSEMBLY_STAND', 'TORQUE_WRENCH', 'TEST_CELL', 'BALANCING_MACHINE', 'CALIBRATION_STATION'],
    processTypes: ['SUB_ASSEMBLY', 'MAIN_ASSEMBLY', 'TORQUE_CHECK', 'LEAK_TEST', 'PERFORMANCE_TEST', 'CALIBRATION'],
    qualityRequirements: ['ASSEMBLY_INTEGRITY', 'PERFORMANCE_SPEC', 'VIBRATION_LIMITS', 'EFFICIENCY_TARGET'],
    partCategories: [
      {
        name: 'Sub-Assemblies',
        partCount: 15,
        complexity: 'MODERATE',
        workOrdersPerPart: { historic: 25, active: 6, planned: 8 },
        materialUsage: [
          { materialCode: 'ASSEMBLY-KIT', quantityRange: [1, 1], unit: 'SET', wastePercentage: 5 }
        ],
        operationTypes: ['COMPONENT_PREP', 'SUB_ASSEMBLY', 'TORQUE_CHECK', 'LEAK_TEST', 'FUNCTIONAL_TEST', 'PACKAGE']
      },
      {
        name: 'Complete Engines',
        partCount: 4,
        complexity: 'COMPLEX',
        workOrdersPerPart: { historic: 12, active: 3, planned: 4 },
        materialUsage: [
          { materialCode: 'ENGINE-KIT', quantityRange: [1, 1], unit: 'SET', wastePercentage: 2 },
          { materialCode: 'TEST-FLUIDS', quantityRange: [50, 200], unit: 'L', wastePercentage: 80 }
        ],
        operationTypes: ['MAIN_ASSEMBLY', 'SYSTEM_TEST', 'CALIBRATION', 'PERFORMANCE_TEST', 'ACCEPTANCE_TEST', 'SHIP_PREP']
      }
    ]
  }
};

// =============================================================================
// DATA GENERATION UTILITIES
// =============================================================================

export class SeedDataGenerator {
  protected prisma: PrismaClient;
  protected config: SeedDataConfig;
  protected uniqueSuffix: string;

  constructor(prisma: PrismaClient, config: SeedDataConfig) {
    this.prisma = prisma;
    this.config = config;
    this.uniqueSuffix = this.generateUniqueSuffix();
  }

  private generateUniqueSuffix(): string {
    const projectSuffix = process.env.DATABASE_URL?.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, '') || '';
    const timestamp = Date.now().toString().slice(-6);
    return `${projectSuffix}-${timestamp}`.toUpperCase();
  }

  /**
   * Generate realistic part numbers following aerospace conventions
   */
  generatePartNumber(modality: string, category: string, index: number): string {
    const modalityCode = MANUFACTURING_MODALITIES[modality]?.code || 'GEN';
    const categoryCode = category.split(' ').map(w => w.charAt(0)).join('').toUpperCase();
    const paddedIndex = index.toString().padStart(3, '0');
    return `${modalityCode}-${categoryCode}-${paddedIndex}`;
  }

  /**
   * Generate realistic work order numbers
   */
  generateWorkOrderNumber(year: number, sequence: number): string {
    return `WO-${year}-${sequence.toString().padStart(6, '0')}`;
  }

  /**
   * Generate realistic material lot numbers
   */
  generateLotNumber(materialCode: string): string {
    const date = faker.date.recent({ days: 365 }).toISOString().slice(0, 10).replace(/-/g, '');
    const batch = faker.string.alphanumeric({ length: 4, casing: 'upper' });
    return `${materialCode}-${date}-${batch}`;
  }

  /**
   * Generate realistic serial numbers
   */
  generateSerialNumber(partNumber: string, sequence: number): string {
    const year = new Date().getFullYear().toString().slice(-2);
    return `${partNumber}-${year}${sequence.toString().padStart(4, '0')}`;
  }

  /**
   * Generate time-based data with realistic patterns
   */
  generateTimeData(baseDate: Date, processingHours: number) {
    const startDate = new Date(baseDate);
    const endDate = new Date(startDate.getTime() + (processingHours * 60 * 60 * 1000));

    return {
      startDate,
      endDate,
      processingHours,
      setupTime: Math.round(processingHours * 0.15 * 60), // 15% setup time in minutes
      runTime: Math.round(processingHours * 0.75 * 60),   // 75% run time in minutes
      teardownTime: Math.round(processingHours * 0.10 * 60) // 10% teardown time in minutes
    };
  }

  /**
   * Generate realistic quality measurements with appropriate distributions
   */
  generateQualityMeasurement(characteristic: string, nominal: number, tolerance: number) {
    // Generate measurement with normal distribution around nominal
    const stdDev = tolerance / 6; // 6-sigma approach
    const measurement = faker.number.float({
      min: nominal - tolerance,
      max: nominal + tolerance,
      fractionDigits: 3
    });

    const deviation = Math.abs(measurement - nominal);
    const isInSpec = deviation <= tolerance;
    const capability = tolerance > 0 ? (tolerance - deviation) / tolerance : 1;

    return {
      measurement,
      nominal,
      tolerance,
      deviation,
      isInSpec,
      capability: Math.max(0, Math.min(1, capability))
    };
  }

  /**
   * Generate realistic equipment utilization data
   */
  generateEquipmentMetrics(equipmentType: string, workCenterName: string) {
    // Different equipment types have different baseline characteristics
    const baselineOEE = {
      'CNC_MACHINE': 0.75,
      'ASSEMBLY_STATION': 0.85,
      'TEST_STATION': 0.70,
      'ADDITIVE_PRINTER': 0.80,
      'WELDING_STATION': 0.78
    };

    const oee = baselineOEE[equipmentType] || 0.75;
    const availability = Math.min(0.95, oee + faker.number.float({ min: 0, max: 0.15, precision: 0.01 }));
    const performance = Math.min(0.95, oee / availability + faker.number.float({ min: 0, max: 0.10, precision: 0.01 }));
    const quality = Math.min(0.99, oee / (availability * performance) + faker.number.float({ min: 0, max: 0.05, precision: 0.01 }));

    return {
      availability: Math.max(0.5, availability),
      performance: Math.max(0.6, performance),
      quality: Math.max(0.85, quality),
      oee: availability * performance * quality,
      mtbf: faker.number.float({ min: 150, max: 800, fractionDigits: 1 }), // Mean time between failures (hours)
      mttr: faker.number.float({ min: 2, max: 24, fractionDigits: 1 })    // Mean time to repair (hours)
    };
  }
}

// =============================================================================
// EXPORT CONFIGURATION
// =============================================================================

export const DEFAULT_SEED_CONFIG: SeedDataConfig = {
  enterpriseCount: 1,
  sitesPerEnterprise: 3,
  areasPerSite: 4,
  modalitiesPerSite: ['ADDITIVE', 'COMPOSITES', 'TURBINE_AIRFOILS', 'ROTATING_PARTS'], // Start with 4 of 7
  scaleFactor: 1.0,
  generateHistoricalData: true,
  historicalDataYears: 2
};

export const COMPREHENSIVE_SEED_CONFIG: SeedDataConfig = {
  enterpriseCount: 2,
  sitesPerEnterprise: 4,
  areasPerSite: 6,
  modalitiesPerSite: Object.keys(MANUFACTURING_MODALITIES), // All 7 modalities
  scaleFactor: 2.0,
  generateHistoricalData: true,
  historicalDataYears: 3
};