# Location/Warehouse Lookup Table - Implementation Guide

**Issue #207: Data Quality - Create Location/Warehouse Lookup Table & Migrate String Fields**

## Overview

This guide documents the implementation of the hierarchical Location lookup table that replaces ~15 String location fields throughout the system with standardized, traceable location references.

## Business Value

### ✅ **Immediate Benefits**
- **Consistent location naming** - No more "Warehouse A", "WH-A", "wh_a" variations
- **Location hierarchies** - Warehouse → Zone → Aisle → Bin structure
- **Capacity tracking** - Monitor storage utilization and plan capacity
- **Warehouse zone management** - Organized material placement strategies
- **Better inventory accuracy** - Standardized locations reduce picking errors

### 🚀 **Future Capabilities Enabled**
- Advanced warehouse features (putaway strategies, picking optimization)
- Location-based reporting and analytics
- Capacity planning and utilization analysis
- Integration with WMS systems
- Environmental control tracking

## Technical Implementation

### Database Schema Changes

#### 1. New LocationType Enum
```prisma
enum LocationType {
  WAREHOUSE       // Top-level warehouse building
  BUILDING        // Manufacturing/office building
  FLOOR           // Floor within a building
  ZONE            // Zone within a floor (e.g., Zone A, Zone B)
  AISLE           // Aisle within a zone
  ROW             // Row within an aisle
  BIN             // Storage bin/slot
  SHELF           // Shelf within a bin
  WORKSTATION     // Manufacturing workstation
  STORAGE_AREA    // General storage area
  STAGING_AREA    // Material staging area
  QUARANTINE_AREA // Quality quarantine area
  SHIPPING_DOCK   // Shipping/outbound dock
  RECEIVING_DOCK  // Receiving/inbound dock
  INSPECTION_AREA // Quality inspection area
  REWORK_AREA     // Rework/repair area
  SCRAP_AREA      // Scrap holding area
  TOOL_CRIB       // Tool storage area
  OFFICE          // Office space
  OTHER           // Other location types
}
```

#### 2. Location Model
```prisma
model Location {
  id                    String       @id @default(cuid())
  locationCode          String       @unique          // e.g., "WH-A-01-B-05"
  locationName          String                        // e.g., "Warehouse A, Floor 1, Zone B, Bin 5"
  description           String?                       // Additional description
  locationType          LocationType                  // Type of location

  // Hierarchical relationships
  parentLocationId      String?
  parentLocation        Location?    @relation("LocationHierarchy", fields: [parentLocationId], references: [id])
  childLocations        Location[]   @relation("LocationHierarchy")

  // Site/Area integration
  siteId                String?
  site                  Site?        @relation(fields: [siteId], references: [id])
  areaId                String?
  area                  Area?        @relation(fields: [areaId], references: [id])

  // Capacity management
  capacityValue         Decimal?                      // Storage capacity value
  capacityUnitOfMeasureId String?                     // Capacity unit
  capacityUnitOfMeasure UnitOfMeasure? @relation("LocationCapacityUOM", fields: [capacityUnitOfMeasureId], references: [id])
  currentUtilization    Decimal?     @default(0)     // Current utilization percentage

  // Physical dimensions
  length                Decimal?                      // Length dimension
  width                 Decimal?                      // Width dimension
  height                Decimal?                      // Height dimension
  dimensionUnitOfMeasureId String?                    // Dimension unit
  dimensionUnitOfMeasure UnitOfMeasure? @relation("LocationDimensionUOM", fields: [dimensionUnitOfMeasureId], references: [id])

  // Operational attributes
  isActive              Boolean      @default(true)   // Location is active/available
  allowMixedParts       Boolean      @default(true)   // Allow different parts in same location
  requiresEnvironmentalControl Boolean @default(false) // Special environmental requirements
  temperature           Decimal?                      // Temperature requirement
  humidity              Decimal?                      // Humidity requirement

  // Contact information
  contactPhone          String?                       // Contact phone for location
  contactEmail          String?                       // Contact email for location

  // Audit fields
  createdAt             DateTime     @default(now())
  updatedAt             DateTime     @updatedAt

  // Relations back to entities using this location
  materialLots          MaterialLot[]                 // Materials stored at this location
  inventoryRecords      Inventory[]                   // Inventory records for this location
  serializedParts       SerializedPart[]              // Serialized parts at this location

  // Location change history (from/to relationships)
  materialStateHistoryFrom MaterialStateHistory[] @relation("FromLocation")
  materialStateHistoryTo   MaterialStateHistory[] @relation("ToLocation")

  @@map("locations")
}
```

### 3. Updated Models with Location References

The following models now include both legacy String fields and new Location references:

#### MaterialLot
```prisma
model MaterialLot {
  // ... existing fields ...
  location            String?              // Legacy field (to be deprecated)
  locationId          String?              // FK to Location
  locationRef         Location?            @relation(fields: [locationId], references: [id])
  // ... rest of model ...
}
```

#### SerializedPart
```prisma
model SerializedPart {
  // ... existing fields ...
  currentLocation       String?              // Legacy field (to be deprecated)
  currentLocationId     String?              // FK to Location
  currentLocationRef    Location?            @relation(fields: [currentLocationId], references: [id])
  // ... rest of model ...
}
```

#### MaterialStateHistory
```prisma
model MaterialStateHistory {
  // ... existing fields ...
  fromLocation   String?             // Legacy field (to be deprecated)
  fromLocationId String?             // FK to Location
  toLocation     String?             // Legacy field (to be deprecated)
  toLocationId   String?             // FK to Location
  fromLocationRef  Location?         @relation("FromLocation", fields: [fromLocationId], references: [id])
  toLocationRef    Location?         @relation("ToLocation", fields: [toLocationId], references: [id])
  // ... rest of model ...
}
```

#### Inventory
```prisma
model Inventory {
  // ... existing fields ...
  location      String               // Legacy field (to be deprecated)
  locationId    String?              // FK to Location
  locationRef   Location?            @relation(fields: [locationId], references: [id])
  // ... rest of model ...
}
```

### 4. Affected Models Summary

| Model | Legacy String Field(s) | New FK Field(s) | Status |
|-------|----------------------|-----------------|--------|
| MaterialLot | `location` | `locationId` | ✅ Implemented |
| SerializedPart | `currentLocation` | `currentLocationId` | ✅ Implemented |
| MaterialStateHistory | `fromLocation`, `toLocation` | `fromLocationId`, `toLocationId` | ✅ Implemented |
| Inventory | `location` | `locationId` | ✅ Implemented |
| Site | `location` | `locationId` | ⏳ Future |
| MeasurementEquipment | `location` | `locationId` | ⏳ Future |
| ToolDrawing | `storageLocation` | `storageLocationId` | ⏳ Future |
| DispatchLog | `dispatchedFrom` | `dispatchedFromLocationId` | ⏳ Future |
| ERPMaterialTransaction | `fromLocation`, `toLocation` | `fromLocationId`, `toLocationId` | ⏳ Future |
| EquipmentMaterialMovement | `fromLocation`, `toLocation` | `fromLocationId`, `toLocationId` | ⏳ Future |

## Migration Strategy

### Phase 1: Schema Migration (✅ Complete)
1. **Add Location table and enum** - ✅ Complete
2. **Add foreign key fields** - ✅ Complete for core models
3. **Validate schema** - ✅ Complete

### Phase 2: Data Migration (🔄 In Progress)
1. **Seed standard locations** - ✅ Complete (`prisma/seeds/seed-locations.ts`)
2. **Analyze existing location strings** - ⏳ Pending
3. **Create location mapping rules** - ⏳ Pending
4. **Migrate existing data** - ⏳ Pending

### Phase 3: Application Updates (⏳ Future)
1. **Update API endpoints** - Accept both String and Location ID
2. **Update frontend components** - Location picker components
3. **Update business logic** - Use Location references
4. **Add location management UI** - Location hierarchy management

### Phase 4: Cleanup (⏳ Future)
1. **Deprecate String fields** - Add deprecation warnings
2. **Remove String fields** - After full migration
3. **Update documentation** - API and user guides

## Location Hierarchy Examples

### Standard Warehouse Structure
```
WH-MAIN (Warehouse)
├── WH-MAIN-RCV (Receiving Dock)
├── WH-MAIN-SHP (Shipping Dock)
├── WH-MAIN-ZA (Zone A - High Volume)
│   ├── WH-MAIN-ZA-A1 (Aisle A1)
│   │   ├── WH-MAIN-ZA-A1-01 (Bin A1-01)
│   │   ├── WH-MAIN-ZA-A1-02 (Bin A1-02)
│   │   └── WH-MAIN-ZA-A1-03 (Bin A1-03)
│   └── WH-MAIN-ZA-A2 (Aisle A2)
│       ├── WH-MAIN-ZA-A2-01 (Bin A2-01)
│       └── WH-MAIN-ZA-A2-02 (Bin A2-02)
├── WH-MAIN-ZB (Zone B - Small Parts)
│   └── WH-MAIN-ZB-A1 (Aisle B1)
│       ├── WH-MAIN-ZB-A1-S1 (Shelf B1-S1)
│       └── WH-MAIN-ZB-A1-S2 (Shelf B1-S2)
└── WH-MAIN-ZQ (Zone Q - Quarantine)
    └── WH-MAIN-ZQ-01 (Quarantine Bin Q-01)
```

### Manufacturing Structure
```
MFG-BLDG-1 (Manufacturing Building)
└── MFG-BLDG-1-FL1 (Manufacturing Floor 1)
    ├── MFG-BLDG-1-FL1-WC001 (Work Center 001)
    ├── MFG-BLDG-1-FL1-WC002 (Work Center 002)
    ├── MFG-BLDG-1-FL1-STG (Production Staging)
    └── MFG-BLDG-1-FL1-TC (Tool Crib)
```

## Usage Examples

### Creating Location Hierarchy

```typescript
// Create a warehouse with zones and bins
const warehouse = await prisma.location.create({
  data: {
    locationCode: 'WH-NORTH',
    locationName: 'North Warehouse',
    locationType: 'WAREHOUSE',
    capacityValue: 10000,
    isActive: true,
  }
});

const zone = await prisma.location.create({
  data: {
    locationCode: 'WH-NORTH-ZA',
    locationName: 'Zone A - Raw Materials',
    locationType: 'ZONE',
    parentLocationId: warehouse.id,
    isActive: true,
  }
});
```

### Querying Location Hierarchy

```typescript
// Get location with full hierarchy
const locationWithChildren = await prisma.location.findUnique({
  where: { locationCode: 'WH-MAIN' },
  include: {
    childLocations: {
      include: {
        childLocations: {
          include: {
            childLocations: true
          }
        }
      }
    },
    parentLocation: true,
    site: true,
    area: true,
  }
});

// Get all materials at a location and its children
const materialsInWarehouse = await prisma.materialLot.findMany({
  where: {
    locationRef: {
      OR: [
        { locationCode: 'WH-MAIN' },
        { parentLocation: { locationCode: 'WH-MAIN' } },
        { parentLocation: { parentLocation: { locationCode: 'WH-MAIN' } } },
      ]
    }
  },
  include: {
    locationRef: true,
    material: true,
  }
});
```

### Material Movement Tracking

```typescript
// Track material movement with locations
await prisma.materialStateHistory.create({
  data: {
    lotId: materialLot.id,
    fromLocationId: sourceLocation.id,
    toLocationId: destinationLocation.id,
    previousState: 'STAGED',
    newState: 'ISSUED',
    transitionType: 'MANUAL',
    changedById: user.id,
  }
});
```

## Seeding Location Data

Run the location seed script to create standard hierarchy:

```bash
npx ts-node prisma/seeds/seed-locations.ts
```

This creates:
- Main warehouse with zones, aisles, and bins
- Manufacturing building with work centers
- Quality lab with inspection areas
- Environmental controls for sensitive areas

## Integration Guidelines

### API Design
```typescript
// Accept both legacy string and new location ID
interface MaterialLotUpdate {
  location?: string;          // Legacy support (deprecated)
  locationId?: string;        // New location reference
  // ... other fields
}
```

### Frontend Components
```typescript
// Location picker component
<LocationPicker
  value={materialLot.locationId}
  onChange={(locationId) => updateLocation(locationId)}
  locationType={['BIN', 'SHELF']}  // Filter by types
  showHierarchy={true}             // Show full path
/>
```

### Business Logic
```typescript
// Location utilities
class LocationService {
  async getLocationPath(locationId: string): Promise<string> {
    // Returns: "WH-MAIN / Zone A / Aisle A1 / Bin A1-01"
  }

  async getCapacityUtilization(locationId: string): Promise<number> {
    // Calculate current utilization percentage
  }

  async findAvailableLocations(partType: string): Promise<Location[]> {
    // Find suitable locations for part type
  }
}
```

## Compliance & Traceability

### AS9100 Compliance
- **Material Traceability**: Complete location history for all materials
- **Documentation**: Audit trail of all location changes
- **Process Control**: Controlled location assignments and movements

### Benefits for Aerospace Manufacturing
- **Segregation**: Quarantine areas for non-conforming materials
- **Environmental Control**: Temperature/humidity tracking for sensitive materials
- **Tool Control**: Dedicated tool cribs with access controls
- **Work Flow**: Controlled material flow through staging areas

## Performance Considerations

### Indexing Strategy
```sql
-- Key indexes for Location model
CREATE INDEX idx_locations_location_code ON locations(location_code);
CREATE INDEX idx_locations_location_type ON locations(location_type);
CREATE INDEX idx_locations_parent_location_id ON locations(parent_location_id);
CREATE INDEX idx_locations_site_id ON locations(site_id);
CREATE INDEX idx_locations_is_active ON locations(is_active);

-- Foreign key indexes
CREATE INDEX idx_material_lots_location_id ON material_lots(location_id);
CREATE INDEX idx_serialized_parts_current_location_id ON serialized_parts(current_location_id);
CREATE INDEX idx_inventory_location_id ON inventory(location_id);
```

### Query Optimization
- Use `include` strategically for hierarchy queries
- Implement pagination for location listings
- Cache frequently accessed location paths
- Use database views for complex location aggregations

## Testing Strategy

### Unit Tests
- Location hierarchy creation and validation
- Capacity calculation logic
- Location code generation and validation
- Parent-child relationship enforcement

### Integration Tests
- Material movement with location tracking
- Location-based inventory queries
- Hierarchy traversal performance
- API endpoint compatibility (string vs. ID)

### Data Migration Tests
- String-to-location mapping accuracy
- Data integrity during migration
- Performance with large datasets
- Rollback procedures

## Future Enhancements

### Phase 2 Features
- **Capacity Planning**: Automated capacity alerts and planning
- **Put-away Strategies**: Intelligent location assignment rules
- **Pick Path Optimization**: Warehouse pick route optimization
- **Location Analytics**: Usage patterns and optimization suggestions

### Integration Opportunities
- **WMS Integration**: Connect with warehouse management systems
- **ERP Integration**: Sync with enterprise resource planning
- **IoT Integration**: Real-time location monitoring sensors
- **Mobile Apps**: Location scanning and mobile updates

## Support & Maintenance

### Documentation Updates
- Keep location hierarchy documentation current
- Update API documentation with new endpoints
- Maintain user guides for location management

### Monitoring
- Track location utilization metrics
- Monitor query performance
- Alert on location capacity thresholds
- Audit location changes for compliance

### Backup & Recovery
- Include location data in backup procedures
- Test location hierarchy restore procedures
- Document recovery steps for location corruption

---

## Summary

The Location/Warehouse Lookup Table implementation provides:

✅ **Foundation** (L0) - Core infrastructure for warehouse and material management
✅ **Data Quality** - Standardized, consistent location references
✅ **Traceability** - Complete audit trail of material movements
✅ **Scalability** - Hierarchical structure supports growth
✅ **Compliance** - AS9100 material traceability requirements

**Implementation Status**: Schema and seed data complete, ready for data migration and application integration.

**Priority Score**: 7.0/10 - Important foundation for warehouse operations and inventory accuracy.