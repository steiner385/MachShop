/**
 * Location Hierarchy Seed Data
 *
 * Creates standard location hierarchy examples for warehouse and manufacturing
 * environments, demonstrating the hierarchical structure and metadata capabilities.
 *
 * Issue #207: Data Quality - Create Location/Warehouse Lookup Table
 */

import { PrismaClient, LocationType } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Standard location hierarchy seed data
 * Demonstrates warehouse → zone → aisle → bin structure
 */
export const locationSeedData = [
  // Main Warehouse Building
  {
    locationCode: 'WH-MAIN',
    locationName: 'Main Warehouse Building',
    description: 'Primary warehouse facility for raw materials and finished goods',
    locationType: 'WAREHOUSE' as LocationType,
    parentLocationId: null,
    capacityValue: 50000,
    length: 200,
    width: 150,
    height: 25,
    isActive: true,
    allowMixedParts: true,
    children: [
      // Receiving Dock
      {
        locationCode: 'WH-MAIN-RCV',
        locationName: 'Receiving Dock',
        description: 'Material receiving and inspection area',
        locationType: 'RECEIVING_DOCK' as LocationType,
        length: 30,
        width: 20,
        height: 25,
        isActive: true,
        allowMixedParts: true,
      },

      // Shipping Dock
      {
        locationCode: 'WH-MAIN-SHP',
        locationName: 'Shipping Dock',
        description: 'Finished goods shipping area',
        locationType: 'SHIPPING_DOCK' as LocationType,
        length: 30,
        width: 20,
        height: 25,
        isActive: true,
        allowMixedParts: true,
      },

      // Zone A - High-Volume Parts
      {
        locationCode: 'WH-MAIN-ZA',
        locationName: 'Zone A - High Volume',
        description: 'High-volume raw materials and components',
        locationType: 'ZONE' as LocationType,
        length: 80,
        width: 60,
        height: 25,
        isActive: true,
        allowMixedParts: false,
        children: [
          // Aisle A1
          {
            locationCode: 'WH-MAIN-ZA-A1',
            locationName: 'Aisle A1',
            description: 'Primary aisle for steel materials',
            locationType: 'AISLE' as LocationType,
            length: 80,
            width: 8,
            height: 25,
            isActive: true,
            allowMixedParts: false,
            children: [
              // Bins in Aisle A1
              {
                locationCode: 'WH-MAIN-ZA-A1-01',
                locationName: 'Bin A1-01',
                description: 'Steel plate storage',
                locationType: 'BIN' as LocationType,
                capacityValue: 500,
                length: 4,
                width: 8,
                height: 3,
                isActive: true,
                allowMixedParts: false,
              },
              {
                locationCode: 'WH-MAIN-ZA-A1-02',
                locationName: 'Bin A1-02',
                description: 'Steel bar stock',
                locationType: 'BIN' as LocationType,
                capacityValue: 300,
                length: 4,
                width: 8,
                height: 3,
                isActive: true,
                allowMixedParts: false,
              },
              {
                locationCode: 'WH-MAIN-ZA-A1-03',
                locationName: 'Bin A1-03',
                description: 'Steel tubing',
                locationType: 'BIN' as LocationType,
                capacityValue: 400,
                length: 4,
                width: 8,
                height: 3,
                isActive: true,
                allowMixedParts: false,
              },
            ],
          },

          // Aisle A2
          {
            locationCode: 'WH-MAIN-ZA-A2',
            locationName: 'Aisle A2',
            description: 'Aluminum materials',
            locationType: 'AISLE' as LocationType,
            length: 80,
            width: 8,
            height: 25,
            isActive: true,
            allowMixedParts: false,
            children: [
              {
                locationCode: 'WH-MAIN-ZA-A2-01',
                locationName: 'Bin A2-01',
                description: 'Aluminum plate',
                locationType: 'BIN' as LocationType,
                capacityValue: 200,
                length: 4,
                width: 8,
                height: 3,
                isActive: true,
                allowMixedParts: false,
              },
              {
                locationCode: 'WH-MAIN-ZA-A2-02',
                locationName: 'Bin A2-02',
                description: 'Aluminum extrusions',
                locationType: 'BIN' as LocationType,
                capacityValue: 150,
                length: 4,
                width: 8,
                height: 3,
                isActive: true,
                allowMixedParts: false,
              },
            ],
          },
        ],
      },

      // Zone B - Small Parts
      {
        locationCode: 'WH-MAIN-ZB',
        locationName: 'Zone B - Small Parts',
        description: 'Small components and hardware',
        locationType: 'ZONE' as LocationType,
        length: 60,
        width: 40,
        height: 25,
        isActive: true,
        allowMixedParts: true,
        children: [
          {
            locationCode: 'WH-MAIN-ZB-A1',
            locationName: 'Aisle B1',
            description: 'Fasteners and hardware',
            locationType: 'AISLE' as LocationType,
            length: 60,
            width: 6,
            height: 25,
            isActive: true,
            allowMixedParts: true,
            children: [
              {
                locationCode: 'WH-MAIN-ZB-A1-S1',
                locationName: 'Shelf B1-S1',
                description: 'Bolts and screws',
                locationType: 'SHELF' as LocationType,
                capacityValue: 50,
                length: 2,
                width: 6,
                height: 1,
                isActive: true,
                allowMixedParts: true,
              },
              {
                locationCode: 'WH-MAIN-ZB-A1-S2',
                locationName: 'Shelf B1-S2',
                description: 'Nuts and washers',
                locationType: 'SHELF' as LocationType,
                capacityValue: 50,
                length: 2,
                width: 6,
                height: 1,
                isActive: true,
                allowMixedParts: true,
              },
            ],
          },
        ],
      },

      // Zone Q - Quarantine Area
      {
        locationCode: 'WH-MAIN-ZQ',
        locationName: 'Zone Q - Quarantine',
        description: 'Quality hold and quarantine area',
        locationType: 'QUARANTINE_AREA' as LocationType,
        length: 20,
        width: 15,
        height: 25,
        isActive: true,
        allowMixedParts: false,
        requiresEnvironmentalControl: true,
        temperature: 20.0,
        humidity: 45.0,
        children: [
          {
            locationCode: 'WH-MAIN-ZQ-01',
            locationName: 'Quarantine Bin Q-01',
            description: 'Non-conforming materials',
            locationType: 'BIN' as LocationType,
            capacityValue: 100,
            length: 4,
            width: 3,
            height: 2,
            isActive: true,
            allowMixedParts: false,
            requiresEnvironmentalControl: true,
          },
        ],
      },
    ],
  },

  // Manufacturing Building
  {
    locationCode: 'MFG-BLDG-1',
    locationName: 'Manufacturing Building 1',
    description: 'Primary manufacturing facility',
    locationType: 'BUILDING' as LocationType,
    parentLocationId: null,
    length: 150,
    width: 100,
    height: 20,
    isActive: true,
    allowMixedParts: true,
    children: [
      // Manufacturing Floor
      {
        locationCode: 'MFG-BLDG-1-FL1',
        locationName: 'Manufacturing Floor 1',
        description: 'Main production floor',
        locationType: 'FLOOR' as LocationType,
        length: 150,
        width: 100,
        height: 20,
        isActive: true,
        allowMixedParts: true,
        children: [
          // Work Centers
          {
            locationCode: 'MFG-BLDG-1-FL1-WC001',
            locationName: 'Work Center 001',
            description: 'CNC Machining Center #1',
            locationType: 'WORKSTATION' as LocationType,
            length: 8,
            width: 6,
            height: 4,
            isActive: true,
            allowMixedParts: false,
          },
          {
            locationCode: 'MFG-BLDG-1-FL1-WC002',
            locationName: 'Work Center 002',
            description: 'Assembly Station #1',
            locationType: 'WORKSTATION' as LocationType,
            length: 10,
            width: 8,
            height: 3,
            isActive: true,
            allowMixedParts: true,
          },

          // Staging Area
          {
            locationCode: 'MFG-BLDG-1-FL1-STG',
            locationName: 'Production Staging',
            description: 'Work order kitting and staging area',
            locationType: 'STAGING_AREA' as LocationType,
            length: 20,
            width: 15,
            height: 20,
            isActive: true,
            allowMixedParts: true,
          },

          // Tool Crib
          {
            locationCode: 'MFG-BLDG-1-FL1-TC',
            locationName: 'Tool Crib',
            description: 'Production tooling storage',
            locationType: 'TOOL_CRIB' as LocationType,
            length: 15,
            width: 10,
            height: 20,
            isActive: true,
            allowMixedParts: false,
            requiresEnvironmentalControl: true,
          },
        ],
      },
    ],
  },

  // Quality Lab Building
  {
    locationCode: 'QA-LAB',
    locationName: 'Quality Assurance Laboratory',
    description: 'Quality testing and measurement facility',
    locationType: 'BUILDING' as LocationType,
    parentLocationId: null,
    length: 40,
    width: 30,
    height: 15,
    isActive: true,
    allowMixedParts: true,
    requiresEnvironmentalControl: true,
    temperature: 20.0,
    humidity: 45.0,
    children: [
      {
        locationCode: 'QA-LAB-INSP',
        locationName: 'Inspection Area',
        description: 'Dimensional and visual inspection',
        locationType: 'INSPECTION_AREA' as LocationType,
        length: 20,
        width: 15,
        height: 15,
        isActive: true,
        allowMixedParts: true,
        requiresEnvironmentalControl: true,
        temperature: 20.0,
        humidity: 45.0,
      },
    ],
  },
];

/**
 * Seeds location hierarchy data
 */
async function seedLocations() {
  console.log('🌱 Seeding location hierarchy data...');

  // Helper function to create location with children recursively
  async function createLocationWithChildren(locationData: any, parentId: string | null = null, siteId?: string, areaId?: string) {
    const { children, ...locationFields } = locationData;

    const location = await prisma.location.create({
      data: {
        ...locationFields,
        parentLocationId: parentId,
        siteId: siteId,
        areaId: areaId,
        // Set some default UOM references if available
        capacityUnitOfMeasureId: locationFields.capacityValue ? undefined : undefined, // Will need to be set after UOM seeding
        dimensionUnitOfMeasureId: locationFields.length ? undefined : undefined, // Will need to be set after UOM seeding
      },
    });

    console.log(`  ✅ Created location: ${location.locationCode} - ${location.locationName}`);

    // Recursively create children
    if (children && children.length > 0) {
      for (const child of children) {
        await createLocationWithChildren(child, location.id, siteId, areaId);
      }
    }

    return location;
  }

  try {
    // Create each top-level location with its hierarchy
    for (const locationData of locationSeedData) {
      await createLocationWithChildren(locationData);
    }

    console.log('✅ Location hierarchy seed data completed successfully!');
    console.log(`   Created hierarchical location structure with warehouses, zones, aisles, and bins.`);

  } catch (error) {
    console.error('❌ Error seeding location data:', error);
    throw error;
  }
}

/**
 * Main seed function
 */
export async function seedLocationData() {
  try {
    await seedLocations();
  } catch (error) {
    console.error('Failed to seed location data:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  seedLocationData();
}