# STEP AP242 Schema Integration Guide
**Issue #220**: SDK & Extensibility: Add STEP AP242 Integration Fields for MBE

## Overview

This document defines the Prisma schema additions required to support STEP AP242 (ISO 10303-242) Model-Based Enterprise (MBE) integration. These additions enable CAD/PLM integration and Product Manufacturing Information (PMI) traceability across the manufacturing system.

## Schema Changes Required

### 1. Extend `Part` Model

Add STEP AP242 and CAD model reference fields:

```prisma
model Part {
  id                    String    @id @default(cuid())
  partNumber            String    @unique
  partName              String
  partDescription       String?

  // ... existing fields ...

  // STEP AP242 CAD Model Integration
  stepAp242Uuid         String?   @unique                         // UUID from STEP file
  stepAp242FileUrl      String?                                   // URL to STEP file
  stepAp242Version      String?                                   // STEP file version
  stepAp242Checksum     String?                                   // SHA256 checksum
  stepAp242LastSync     DateTime?                                 // Last PLM sync

  // CAD Model Metadata
  cadModelUuid          String?   @unique                         // CAD system UUID
  cadModelRevision      String?                                   // Revision (A, B, C, etc.)
  cadModelFormat        String?   // STEP, JT, 3DPDF, OTHER
  cadSystemSource       String?   // NX, CATIA, Creo, SolidWorks, etc.

  // Product Manufacturing Information
  hasPMI                Boolean   @default(false)                 // Has PMI data
  pmiExtractionDate     DateTime?                                 // When PMI was extracted
  pmiCharacteristics    Json?                                     // Extracted PMI data structure

  // PLM System Integration
  plmSystemName         String?   // Teamcenter, Windchill, ENOVIA, Aras
  plmItemId             String?                                   // PLM item ID
  plmRevisionId         String?                                   // PLM revision ID
  plmLastModified       DateTime?                                 // PLM modification date

  // Relationships
  digitalThreadTraces   DigitalThreadTrace[]

  // Indexes for performance
  @@index([stepAp242Uuid])
  @@index([cadModelUuid])
  @@index([plmItemId])
  @@map("parts")
}
```

### 2. Extend `Operation` Model

Add STEP-based work instruction and PMI annotation references:

```prisma
model Operation {
  id                    String    @id @default(cuid())
  operationCode         String    @unique
  operationName         String

  // ... existing fields ...

  // STEP AP242 Work Instructions
  stepInstructionUuid   String?                                   // UUID of work instruction in CAD
  pmiAnnotationIds      String[]  @default([])                    // Associated PMI annotation IDs
  viewOrientationData   Json?                                     // 3D camera view data

  // PMI-Based Specifications
  pmiTolerances         Json?                                     // GD&T from CAD model
  pmiDimensions         Json?                                     // Dimensions from PMI

  // CAD Model View State
  modelViewStateId      String?                                   // Reference to saved view
  modelViewState        ModelViewState?  @relation(fields: [modelViewStateId], references: [id])

  // Relationships
  digitalThreadTraces   DigitalThreadTrace[]

  // Indexes
  @@index([stepInstructionUuid])
  @@index([modelViewStateId])
  @@map("operations")
}
```

### 3. Extend `QualityCharacteristic` Model

Add PMI feature linkage and GD&T data:

```prisma
model QualityCharacteristic {
  id                    String    @id @default(cuid())
  planId                String
  characteristic        String

  // ... existing fields ...

  // PMI Linkage
  pmiFeatureUuid        String?                                   // UUID of PMI feature in CAD
  pmiAnnotationId       String?                                   // PMI annotation ID
  cadDatumReferences    String[]  @default([])                    // Datum references

  // GD&T from STEP
  gdtType               String?   // FLATNESS, POSITION, PERPENDICULAR, etc.
  gdtTolerance          Float?
  gdtTolerance Unit     String?   // mm, inch, etc.
  gdtModifier           String?   // MMC, LMC, RFS

  // Feature Geometry
  featureGeometry       Json?                                     // Geometric properties

  // As-Built Comparison
  nominalValue          Float?                                    // Design intent
  actualValue           Float?                                    // As-manufactured
  deviation             Float?                                    // nominalValue - actualValue

  // Relationships
  digitalThreadTraces   DigitalThreadTrace[]

  // Indexes
  @@index([pmiFeatureUuid])
  @@index([gdtType])
  @@map("quality_characteristics")
}
```

### 4. Extend `WorkInstruction` Model

Add STEP model and 3D annotation references:

```prisma
model WorkInstruction {
  id                    String    @id @default(cuid())
  title                 String
  description           String?

  // ... existing fields ...

  // STEP AP242 3D Instructions
  stepModelUuid         String?                                   // 3D model UUID
  pmiViewStates         String[]  @default([])                    // Saved 3D view state IDs
  annotatedModelUrl     String?                                   // URL to annotated 3D model

  // 3D Model View Reference
  modelViewStates       ModelViewState[]

  // Indexes
  @@index([stepModelUuid])
  @@map("work_instructions")
}
```

### 5. Create New `DigitalThreadTrace` Model

Link CAD models to manufacturing data:

```prisma
model DigitalThreadTrace {
  id                    String    @id @default(cuid())

  // CAD Model Reference
  cadModelUuid          String                                    // Source STEP/CAD model
  pmiFeatureId          String                                    // PMI feature in CAD

  // Manufacturing Data
  partId                String
  part                  Part      @relation(fields: [partId], references: [id], onDelete: Cascade)

  operationIds          String[]  @default([])                    // Operations on this feature
  qualityCharacteristicIds String[] @default([])                  // Quality checks

  // Measurements and Comparison
  measurementData       Json?                                     // {key: value} measurement results
  asBuiltNominal        Float?                                    // Design value from CAD
  asBuiltActual         Float?                                    // Measured value
  asBuiltDeviation      Float?                                    // Deviation from design
  withinTolerance       Boolean?                                  // Pass/fail

  // Traceability
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
  createdBy             String?                                   // User who created trace
  verifiedBy            String?                                   // User who verified
  verifiedAt            DateTime?

  // Indexes
  @@index([cadModelUuid])
  @@index([partId])
  @@index([pmiFeatureId])
  @@map("digital_thread_traces")
}
```

### 6. Create New `ModelViewState` Model

Store 3D model view states for operations:

```prisma
model ModelViewState {
  id                    String    @id @default(cuid())

  // Model Reference
  modelUuid             String                                    // Associated STEP model
  operationId           String?                                   // Associated operation
  operation             Operation?  @relation(fields: [operationId], references: [id], onDelete: SetNull)

  // View Metadata
  viewName              String                                    // e.g., "Operation 10 Setup"
  description           String?

  // Camera Properties
  cameraPositionX       Float
  cameraPositionY       Float
  cameraPositionZ       Float
  cameraTargetX         Float
  cameraTargetY         Float
  cameraTargetZ         Float
  cameraUpX             Float
  cameraUpY             Float
  cameraUpZ             Float
  fov                   Float?    @default(45)                    // Field of view in degrees

  // Visibility and Highlighting
  visibleFeaturesJson   Json?                                     // Array of visible feature IDs
  hiddenFeaturesJson    Json?                                     // Array of hidden feature IDs
  highlightedFeaturesJson Json?                                   // Array of highlighted feature IDs
  highlightColor        String?   @default("#FF0000")             // Highlight color (hex)

  // Metadata
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Indexes
  @@index([modelUuid])
  @@index([operationId])
  @@map("model_view_states")
}
```

### 7. Create New `PLMIntegration` Model

Store PLM system connection configurations:

```prisma
model PLMIntegration {
  id                    String    @id @default(cuid())

  // System Information
  systemName            String    // Teamcenter, Windchill, ENOVIA, Aras
  systemVersion         String?

  // Connection Details
  baseUrl               String
  apiVersion            String
  authMethod            String    // oauth, basic, saml, api_key

  // Credentials (encrypted)
  credentialsEncrypted  String                                    // Encrypted credential JSON

  // Configuration
  autoSyncEnabled       Boolean   @default(true)
  syncIntervalMinutes   Int       @default(60)
  fileExportPath        String?

  // Status
  isActive              Boolean   @default(true)
  lastSyncAt            DateTime?
  lastError             String?

  // Metadata
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  // Indexes
  @@unique([systemName])
  @@map("plm_integrations")
}
```

### 8. Create New `STEPFileImport` Model

Track STEP file imports and their status:

```prisma
model STEPFileImport {
  id                    String    @id @default(cuid())

  // File Information
  fileName              String
  fileUrl               String
  fileHash              String    @unique
  fileSize              Int

  // Import Details
  stepUuid              String    @unique                         // Extracted STEP UUID
  cadSystemSource       String?
  cadModelRevision      String?

  // Related Data
  partId                String?                                   // Linked part if any

  // Import Status
  status                String    // pending, processing, success, failed
  pmiExtracted          Boolean   @default(false)
  pmiExtractionDate     DateTime?

  // Results
  extractedPMIJson      Json?                                     // Extracted PMI data
  extractionErrors      String[]  @default([])
  extractionWarnings    String[]  @default([])

  // Metadata
  importedAt            DateTime  @default(now())
  importedBy            String?
  completedAt           DateTime?

  // Indexes
  @@index([stepUuid])
  @@index([partId])
  @@index([status])
  @@map("step_file_imports")
}
```

## Database Migration

To apply these changes, create a Prisma migration:

```bash
npx prisma migrate dev --name add_step_ap242_integration_fields
```

This will:
1. Create new tables for `DigitalThreadTrace`, `ModelViewState`, `PLMIntegration`, and `STEPFileImport`
2. Add new columns to `Part`, `Operation`, `QualityCharacteristic`, and `WorkInstruction` tables
3. Generate TypeScript types
4. Update Prisma Client

## Indexes and Performance

Added indexes for common queries:

| Model | Indexes | Reason |
|-------|---------|--------|
| Part | stepAp242Uuid, cadModelUuid, plmItemId | Fast CAD model lookups |
| Operation | stepInstructionUuid, modelViewStateId | Work instruction retrieval |
| QualityCharacteristic | pmiFeatureUuid, gdtType | PMI feature linking |
| DigitalThreadTrace | cadModelUuid, partId, pmiFeatureId | Digital thread queries |
| ModelViewState | modelUuid, operationId | 3D view state retrieval |
| PLMIntegration | systemName (unique) | Single PLM per system |
| STEPFileImport | stepUuid, partId, status | Import tracking |

## Data Types and Storage

### JSON Fields Usage

Several fields use JSON for flexible data storage:

- **Part.pmiCharacteristics**: Entire PMI data structure from STEP
- **Operation.pmiTolerances**: Array of tolerance specifications
- **Operation.pmiDimensions**: Array of dimension specifications
- **Operation.viewOrientationData**: 3D camera position and target
- **QualityCharacteristic.featureGeometry**: Geometric properties
- **DigitalThreadTrace.measurementData**: Measurement key-value pairs
- **ModelViewState.visibleFeaturesJson**: Array of visible feature IDs
- **STEPFileImport.extractedPMIJson**: Complete extracted PMI data

### Encryption Considerations

The `PLMIntegration.credentialsEncrypted` field should be:
1. Encrypted at rest in the database
2. Only decrypted in memory for API calls
3. Never logged or exposed in error messages

## Next Steps

1. **Apply Migration**: `npx prisma migrate dev`
2. **Generate Types**: `npx prisma generate`
3. **Update Services**: Implement STEP import service using the types in `src/types/step-ap242.ts`
4. **Create API Routes**: Endpoints for STEP import, PMI extraction, PLM sync
5. **Implement UI**: 3D model viewer, PMI display, digital thread visualization

## Migration Path for Existing Data

For existing `Part` records without STEP data:

```typescript
// Mark as non-MBE parts
await prisma.part.updateMany({
  where: { stepAp242Uuid: null },
  data: { hasPMI: false }
});

// Can later batch-update when STEP files are available
```

## References

- ISO 10303-242:2022 - Managed model-based 3D engineering
- ISO 10303-238:2022 - Model based integrated manufacturing
- Boeing MBE Data and Process Standards
- Lockheed Martin Model-Based Enterprise Playbook

---

**Status**: Ready for implementation
**Priority**: High (Required for aerospace OEM compliance)
**Effort**: Phase 1 of 4 (Schema foundation)
