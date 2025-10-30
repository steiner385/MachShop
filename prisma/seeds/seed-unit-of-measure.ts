/**
 * UnitOfMeasure Seed Data
 * Comprehensive standard units for manufacturing operations
 * Supports metric, imperial, and specialized manufacturing units
 */

import { PrismaClient, UnitType, SystemOfMeasure } from '@prisma/client';

const prisma = new PrismaClient();

export interface UnitSeedData {
  code: string;
  name: string;
  description?: string;
  unitType: UnitType;
  systemOfMeasure: SystemOfMeasure;
  isBaseUnit: boolean;
  conversionFactor?: number;
  baseUnitCode?: string; // Will be resolved to baseUnitId during seeding
  symbol?: string;
  isActive: boolean;
  sortOrder: number;
}

/**
 * Comprehensive seed data for standard units of measure
 */
export const unitSeedData: UnitSeedData[] = [
  // ============================================================================
  // QUANTITY (Count/Each) Units
  // ============================================================================
  {
    code: 'EA',
    name: 'Each',
    description: 'Individual units or pieces',
    unitType: 'QUANTITY',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: 'ea',
    isActive: true,
    sortOrder: 100,
  },
  {
    code: 'PC',
    name: 'Piece',
    description: 'Individual pieces',
    unitType: 'QUANTITY',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 1,
    baseUnitCode: 'EA',
    symbol: 'pc',
    isActive: true,
    sortOrder: 101,
  },
  {
    code: 'DZ',
    name: 'Dozen',
    description: 'Twelve units',
    unitType: 'QUANTITY',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 12,
    baseUnitCode: 'EA',
    symbol: 'dz',
    isActive: true,
    sortOrder: 102,
  },
  {
    code: 'GROSS',
    name: 'Gross',
    description: 'One hundred forty-four units (12 dozen)',
    unitType: 'QUANTITY',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 144,
    baseUnitCode: 'EA',
    symbol: 'gr',
    isActive: true,
    sortOrder: 103,
  },
  {
    code: 'PAIR',
    name: 'Pair',
    description: 'Two matching units',
    unitType: 'QUANTITY',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 2,
    baseUnitCode: 'EA',
    symbol: 'pr',
    isActive: true,
    sortOrder: 104,
  },

  // ============================================================================
  // MASS (Weight) Units - Metric System
  // ============================================================================
  {
    code: 'KG',
    name: 'Kilogram',
    description: 'Base metric unit of mass',
    unitType: 'MASS',
    systemOfMeasure: 'METRIC',
    isBaseUnit: true,
    symbol: 'kg',
    isActive: true,
    sortOrder: 200,
  },
  {
    code: 'G',
    name: 'Gram',
    description: 'Metric unit of mass',
    unitType: 'MASS',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 0.001,
    baseUnitCode: 'KG',
    symbol: 'g',
    isActive: true,
    sortOrder: 201,
  },
  {
    code: 'MG',
    name: 'Milligram',
    description: 'One thousandth of a gram',
    unitType: 'MASS',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 0.000001,
    baseUnitCode: 'KG',
    symbol: 'mg',
    isActive: true,
    sortOrder: 202,
  },
  {
    code: 'T',
    name: 'Metric Ton',
    description: 'One thousand kilograms',
    unitType: 'MASS',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 1000,
    baseUnitCode: 'KG',
    symbol: 't',
    isActive: true,
    sortOrder: 203,
  },

  // ============================================================================
  // MASS (Weight) Units - Imperial System
  // ============================================================================
  {
    code: 'LB',
    name: 'Pound',
    description: 'Imperial unit of mass',
    unitType: 'MASS',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: true,
    symbol: 'lb',
    isActive: true,
    sortOrder: 250,
  },
  {
    code: 'OZ',
    name: 'Ounce',
    description: 'Imperial unit of mass - 1/16 pound',
    unitType: 'MASS',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 0.0625,
    baseUnitCode: 'LB',
    symbol: 'oz',
    isActive: true,
    sortOrder: 251,
  },
  {
    code: 'TON',
    name: 'Short Ton',
    description: 'Imperial ton - 2000 pounds',
    unitType: 'MASS',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 2000,
    baseUnitCode: 'LB',
    symbol: 'ton',
    isActive: true,
    sortOrder: 252,
  },

  // ============================================================================
  // LENGTH (Distance) Units - Metric System
  // ============================================================================
  {
    code: 'M',
    name: 'Meter',
    description: 'Base metric unit of length',
    unitType: 'LENGTH',
    systemOfMeasure: 'METRIC',
    isBaseUnit: true,
    symbol: 'm',
    isActive: true,
    sortOrder: 300,
  },
  {
    code: 'MM',
    name: 'Millimeter',
    description: 'One thousandth of a meter',
    unitType: 'LENGTH',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 0.001,
    baseUnitCode: 'M',
    symbol: 'mm',
    isActive: true,
    sortOrder: 301,
  },
  {
    code: 'CM',
    name: 'Centimeter',
    description: 'One hundredth of a meter',
    unitType: 'LENGTH',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 0.01,
    baseUnitCode: 'M',
    symbol: 'cm',
    isActive: true,
    sortOrder: 302,
  },
  {
    code: 'KM',
    name: 'Kilometer',
    description: 'One thousand meters',
    unitType: 'LENGTH',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 1000,
    baseUnitCode: 'M',
    symbol: 'km',
    isActive: true,
    sortOrder: 303,
  },

  // ============================================================================
  // LENGTH (Distance) Units - Imperial System
  // ============================================================================
  {
    code: 'FT',
    name: 'Foot',
    description: 'Imperial unit of length',
    unitType: 'LENGTH',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: true,
    symbol: 'ft',
    isActive: true,
    sortOrder: 350,
  },
  {
    code: 'IN',
    name: 'Inch',
    description: 'Imperial unit of length - 1/12 foot',
    unitType: 'LENGTH',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 0.0833333,
    baseUnitCode: 'FT',
    symbol: 'in',
    isActive: true,
    sortOrder: 351,
  },
  {
    code: 'YD',
    name: 'Yard',
    description: 'Imperial unit of length - 3 feet',
    unitType: 'LENGTH',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 3,
    baseUnitCode: 'FT',
    symbol: 'yd',
    isActive: true,
    sortOrder: 352,
  },
  {
    code: 'MI',
    name: 'Mile',
    description: 'Imperial unit of length - 5280 feet',
    unitType: 'LENGTH',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 5280,
    baseUnitCode: 'FT',
    symbol: 'mi',
    isActive: true,
    sortOrder: 353,
  },

  // ============================================================================
  // VOLUME Units - Metric System
  // ============================================================================
  {
    code: 'L',
    name: 'Liter',
    description: 'Metric unit of volume',
    unitType: 'VOLUME',
    systemOfMeasure: 'METRIC',
    isBaseUnit: true,
    symbol: 'L',
    isActive: true,
    sortOrder: 400,
  },
  {
    code: 'ML',
    name: 'Milliliter',
    description: 'One thousandth of a liter',
    unitType: 'VOLUME',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 0.001,
    baseUnitCode: 'L',
    symbol: 'mL',
    isActive: true,
    sortOrder: 401,
  },
  {
    code: 'M3',
    name: 'Cubic Meter',
    description: 'Cubic meter - 1000 liters',
    unitType: 'VOLUME',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 1000,
    baseUnitCode: 'L',
    symbol: 'm³',
    isActive: true,
    sortOrder: 402,
  },

  // ============================================================================
  // VOLUME Units - Imperial System
  // ============================================================================
  {
    code: 'GAL',
    name: 'Gallon',
    description: 'Imperial unit of volume',
    unitType: 'VOLUME',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: true,
    symbol: 'gal',
    isActive: true,
    sortOrder: 450,
  },
  {
    code: 'QT',
    name: 'Quart',
    description: 'Imperial unit of volume - 1/4 gallon',
    unitType: 'VOLUME',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 0.25,
    baseUnitCode: 'GAL',
    symbol: 'qt',
    isActive: true,
    sortOrder: 451,
  },
  {
    code: 'PT',
    name: 'Pint',
    description: 'Imperial unit of volume - 1/8 gallon',
    unitType: 'VOLUME',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 0.125,
    baseUnitCode: 'GAL',
    symbol: 'pt',
    isActive: true,
    sortOrder: 452,
  },
  {
    code: 'FLOZ',
    name: 'Fluid Ounce',
    description: 'Imperial unit of volume - 1/128 gallon',
    unitType: 'VOLUME',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 0.0078125,
    baseUnitCode: 'GAL',
    symbol: 'fl oz',
    isActive: true,
    sortOrder: 453,
  },

  // ============================================================================
  // AREA Units - Metric System
  // ============================================================================
  {
    code: 'M2',
    name: 'Square Meter',
    description: 'Metric unit of area',
    unitType: 'AREA',
    systemOfMeasure: 'METRIC',
    isBaseUnit: true,
    symbol: 'm²',
    isActive: true,
    sortOrder: 500,
  },
  {
    code: 'CM2',
    name: 'Square Centimeter',
    description: 'One ten-thousandth of a square meter',
    unitType: 'AREA',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 0.0001,
    baseUnitCode: 'M2',
    symbol: 'cm²',
    isActive: true,
    sortOrder: 501,
  },
  {
    code: 'MM2',
    name: 'Square Millimeter',
    description: 'One millionth of a square meter',
    unitType: 'AREA',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 0.000001,
    baseUnitCode: 'M2',
    symbol: 'mm²',
    isActive: true,
    sortOrder: 502,
  },

  // ============================================================================
  // AREA Units - Imperial System
  // ============================================================================
  {
    code: 'FT2',
    name: 'Square Foot',
    description: 'Imperial unit of area',
    unitType: 'AREA',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: true,
    symbol: 'ft²',
    isActive: true,
    sortOrder: 550,
  },
  {
    code: 'IN2',
    name: 'Square Inch',
    description: 'Imperial unit of area - 1/144 square foot',
    unitType: 'AREA',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 0.00694444,
    baseUnitCode: 'FT2',
    symbol: 'in²',
    isActive: true,
    sortOrder: 551,
  },

  // ============================================================================
  // TIME Units
  // ============================================================================
  {
    code: 'SEC',
    name: 'Second',
    description: 'Base unit of time',
    unitType: 'TIME',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: 's',
    isActive: true,
    sortOrder: 600,
  },
  {
    code: 'MIN',
    name: 'Minute',
    description: 'Sixty seconds',
    unitType: 'TIME',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 60,
    baseUnitCode: 'SEC',
    symbol: 'min',
    isActive: true,
    sortOrder: 601,
  },
  {
    code: 'HR',
    name: 'Hour',
    description: 'Sixty minutes',
    unitType: 'TIME',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 3600,
    baseUnitCode: 'SEC',
    symbol: 'hr',
    isActive: true,
    sortOrder: 602,
  },
  {
    code: 'DAY',
    name: 'Day',
    description: 'Twenty-four hours',
    unitType: 'TIME',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 86400,
    baseUnitCode: 'SEC',
    symbol: 'day',
    isActive: true,
    sortOrder: 603,
  },

  // ============================================================================
  // TEMPERATURE Units
  // ============================================================================
  {
    code: 'C',
    name: 'Celsius',
    description: 'Metric temperature scale',
    unitType: 'TEMPERATURE',
    systemOfMeasure: 'METRIC',
    isBaseUnit: true,
    symbol: '°C',
    isActive: true,
    sortOrder: 700,
  },
  {
    code: 'K',
    name: 'Kelvin',
    description: 'Absolute temperature scale',
    unitType: 'TEMPERATURE',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 1, // Special conversion: K = C + 273.15
    baseUnitCode: 'C',
    symbol: 'K',
    isActive: true,
    sortOrder: 701,
  },
  {
    code: 'F',
    name: 'Fahrenheit',
    description: 'Imperial temperature scale',
    unitType: 'TEMPERATURE',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 1, // Special conversion: F = (C * 9/5) + 32
    baseUnitCode: 'C',
    symbol: '°F',
    isActive: true,
    sortOrder: 702,
  },

  // ============================================================================
  // PRESSURE Units
  // ============================================================================
  {
    code: 'PA',
    name: 'Pascal',
    description: 'SI unit of pressure',
    unitType: 'PRESSURE',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: 'Pa',
    isActive: true,
    sortOrder: 800,
  },
  {
    code: 'KPA',
    name: 'Kilopascal',
    description: 'One thousand pascals',
    unitType: 'PRESSURE',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 1000,
    baseUnitCode: 'PA',
    symbol: 'kPa',
    isActive: true,
    sortOrder: 801,
  },
  {
    code: 'BAR',
    name: 'Bar',
    description: 'Metric pressure unit - 100,000 pascals',
    unitType: 'PRESSURE',
    systemOfMeasure: 'METRIC',
    isBaseUnit: false,
    conversionFactor: 100000,
    baseUnitCode: 'PA',
    symbol: 'bar',
    isActive: true,
    sortOrder: 802,
  },
  {
    code: 'PSI',
    name: 'Pounds per Square Inch',
    description: 'Imperial pressure unit',
    unitType: 'PRESSURE',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 6895, // Approximate conversion to pascals
    baseUnitCode: 'PA',
    symbol: 'psi',
    isActive: true,
    sortOrder: 803,
  },

  // ============================================================================
  // ENERGY Units
  // ============================================================================
  {
    code: 'J',
    name: 'Joule',
    description: 'SI unit of energy',
    unitType: 'ENERGY',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: 'J',
    isActive: true,
    sortOrder: 900,
  },
  {
    code: 'KJ',
    name: 'Kilojoule',
    description: 'One thousand joules',
    unitType: 'ENERGY',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 1000,
    baseUnitCode: 'J',
    symbol: 'kJ',
    isActive: true,
    sortOrder: 901,
  },
  {
    code: 'KWH',
    name: 'Kilowatt Hour',
    description: 'Practical unit of energy - 3.6 million joules',
    unitType: 'ENERGY',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 3600000,
    baseUnitCode: 'J',
    symbol: 'kWh',
    isActive: true,
    sortOrder: 902,
  },
  {
    code: 'BTU',
    name: 'British Thermal Unit',
    description: 'Imperial unit of energy',
    unitType: 'ENERGY',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 1055, // Approximate conversion to joules
    baseUnitCode: 'J',
    symbol: 'BTU',
    isActive: true,
    sortOrder: 903,
  },

  // ============================================================================
  // POWER Units
  // ============================================================================
  {
    code: 'W',
    name: 'Watt',
    description: 'SI unit of power',
    unitType: 'POWER',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: 'W',
    isActive: true,
    sortOrder: 1000,
  },
  {
    code: 'KW',
    name: 'Kilowatt',
    description: 'One thousand watts',
    unitType: 'POWER',
    systemOfMeasure: 'SI',
    isBaseUnit: false,
    conversionFactor: 1000,
    baseUnitCode: 'W',
    symbol: 'kW',
    isActive: true,
    sortOrder: 1001,
  },
  {
    code: 'HP',
    name: 'Horsepower',
    description: 'Imperial unit of power',
    unitType: 'POWER',
    systemOfMeasure: 'IMPERIAL',
    isBaseUnit: false,
    conversionFactor: 746, // Approximate conversion to watts
    baseUnitCode: 'W',
    symbol: 'hp',
    isActive: true,
    sortOrder: 1002,
  },

  // ============================================================================
  // SPECIALTY Manufacturing Units
  // ============================================================================
  {
    code: 'PPM',
    name: 'Parts Per Million',
    description: 'Quality measurement unit for defect rates',
    unitType: 'OTHER',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: 'ppm',
    isActive: true,
    sortOrder: 1100,
  },
  {
    code: 'PERCENT',
    name: 'Percent',
    description: 'Percentage measurement',
    unitType: 'OTHER',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: '%',
    isActive: true,
    sortOrder: 1101,
  },
  {
    code: 'RPM',
    name: 'Revolutions Per Minute',
    description: 'Rotational speed measurement',
    unitType: 'VELOCITY',
    systemOfMeasure: 'SI',
    isBaseUnit: true,
    symbol: 'rpm',
    isActive: true,
    sortOrder: 1102,
  },
];

/**
 * Seed the UnitOfMeasure table with standard manufacturing units
 */
export async function seedUnitsOfMeasure(): Promise<void> {
  console.log('🌱 Seeding UnitOfMeasure table...');

  // First pass: Create all units without baseUnitId relationships
  const createdUnits = new Map<string, string>(); // code -> id mapping

  console.log('📦 Creating base units...');
  for (const unit of unitSeedData.filter(u => u.isBaseUnit)) {
    const created = await prisma.unitOfMeasure.upsert({
      where: { code: unit.code },
      update: {
        name: unit.name,
        description: unit.description,
        unitType: unit.unitType,
        systemOfMeasure: unit.systemOfMeasure,
        isBaseUnit: unit.isBaseUnit,
        symbol: unit.symbol,
        isActive: unit.isActive,
        sortOrder: unit.sortOrder,
      },
      create: {
        code: unit.code,
        name: unit.name,
        description: unit.description,
        unitType: unit.unitType,
        systemOfMeasure: unit.systemOfMeasure,
        isBaseUnit: unit.isBaseUnit,
        symbol: unit.symbol,
        isActive: unit.isActive,
        sortOrder: unit.sortOrder,
      },
    });

    createdUnits.set(unit.code, created.id);
    console.log(`   ✓ ${unit.code} - ${unit.name}`);
  }

  // Second pass: Create derived units with baseUnitId relationships
  console.log('🔗 Creating derived units with relationships...');
  for (const unit of unitSeedData.filter(u => !u.isBaseUnit)) {
    const baseUnitId = unit.baseUnitCode ? createdUnits.get(unit.baseUnitCode) : null;

    if (unit.baseUnitCode && !baseUnitId) {
      console.warn(`⚠️  Warning: Base unit ${unit.baseUnitCode} not found for ${unit.code}`);
    }

    const created = await prisma.unitOfMeasure.upsert({
      where: { code: unit.code },
      update: {
        name: unit.name,
        description: unit.description,
        unitType: unit.unitType,
        systemOfMeasure: unit.systemOfMeasure,
        isBaseUnit: unit.isBaseUnit,
        conversionFactor: unit.conversionFactor,
        baseUnitId: baseUnitId,
        symbol: unit.symbol,
        isActive: unit.isActive,
        sortOrder: unit.sortOrder,
      },
      create: {
        code: unit.code,
        name: unit.name,
        description: unit.description,
        unitType: unit.unitType,
        systemOfMeasure: unit.systemOfMeasure,
        isBaseUnit: unit.isBaseUnit,
        conversionFactor: unit.conversionFactor,
        baseUnitId: baseUnitId,
        symbol: unit.symbol,
        isActive: unit.isActive,
        sortOrder: unit.sortOrder,
      },
    });

    createdUnits.set(unit.code, created.id);
    console.log(`   ✓ ${unit.code} - ${unit.name} (${unit.baseUnitCode ? `base: ${unit.baseUnitCode}` : 'standalone'})`);
  }

  console.log(`✅ Successfully seeded ${unitSeedData.length} units of measure`);

  // Summary statistics
  const stats = unitSeedData.reduce((acc, unit) => {
    acc[unit.unitType] = (acc[unit.unitType] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('\n📊 Seeding Summary:');
  Object.entries(stats).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} units`);
  });
}

/**
 * Main seeding function for CLI usage
 */
export async function main(): Promise<void> {
  try {
    await seedUnitsOfMeasure();
  } catch (error) {
    console.error('❌ Error seeding units of measure:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// CLI execution
if (require.main === module) {
  main().catch(console.error);
}