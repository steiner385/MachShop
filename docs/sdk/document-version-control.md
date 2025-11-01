# Document Version Control Service
## Enterprise-Grade Version Control for Work Instructions and Documents

**Issue #72 - Phase 1: Basic Version Control**

## Overview

The Document Version Control Service provides comprehensive version management capabilities for work instructions, documents, and other enterprise content. It implements semantic versioning, full audit trails, rollback functionality, and version comparison features essential for regulated manufacturing environments.

## Features

### Core Version Control
- **Semantic Versioning**: Automatic version numbering using major.minor.patch format
- **Version History**: Complete history of all document versions with metadata
- **Latest Version Tracking**: Quick retrieval of the most recent version
- **Version Listing**: Paginated access to version history with configurable limits

### Version Management
- **Version Publishing**: Mark versions as official releases (draft → published → archived)
- **Rollback Capability**: Restore previous versions with audit trail documentation
- **Version Tagging**: Mark versions with semantic tags (e.g., "production", "qa", "review")
- **Tag-Based Queries**: Retrieve all versions matching specific tags

### Audit & Compliance
- **Change Records**: Complete audit trail of all version modifications
- **Audit Trail Retrieval**: Historical view of changes with timestamps and user information
- **IP Address Tracking**: Log user location for compliance auditing
- **User Agent Tracking**: Track client information for security analysis

### Data Integrity
- **Checksum Verification**: SHA256-based content integrity validation
- **Content Comparison**: Detailed diff showing added, removed, and modified fields
- **Version Comparison**: Full comparison between any two versions
- **Change Summaries**: Statistics on additions, removals, and modifications

## Data Models

### DocumentVersion
```typescript
interface DocumentVersion {
  id: string;                    // Unique identifier: {documentId}-v{versionNumber}
  documentId: string;            // Reference to parent document
  versionNumber: string;         // e.g., "1.2.3"
  majorVersion: number;          // Major version component
  minorVersion: number;          // Minor version component
  patchVersion: number;          // Patch version component
  content: Record<string, any>;  // Document content as JSON
  metadata: VersionMetadata;     // Version creation and release metadata
  status: 'draft' | 'published' | 'archived';
  previousVersionId?: string;    // Link to prior version
  tags: string[];                // User-defined tags for organization
  checksum: string;              // SHA256 hash for integrity verification
}
```

### VersionMetadata
```typescript
interface VersionMetadata {
  createdBy: string;             // User who created this version
  createdAt: Date;               // Creation timestamp
  description?: string;          // Human-readable change description
  tags?: string[];               // Optional version tags
  changeType?: 'major' | 'minor' | 'patch';
  isPublished: boolean;          // Publication status flag
}
```

### ChangeRecord
```typescript
interface ChangeRecord {
  versionId: string;             // Version being modified
  documentId: string;            // Parent document
  changeType: 'create' | 'update' | 'delete' | 'rollback' | 'merge';
  changedBy: string;             // User who made the change
  changedAt: Date;               // Timestamp of change
  description: string;           // Change description
  changes?: Record<string, any>; // Detailed change data
  previousVersionId?: string;    // For rollback operations
  ipAddress?: string;            // User's IP address for compliance
  userAgent?: string;            // Client user agent string
}
```

### VersionComparison
```typescript
interface VersionComparison {
  fromVersion: string;           // Source version number
  toVersion: string;             // Target version number
  differences: {
    field: string;               // Field name
    oldValue: any;               // Previous value
    newValue: any;               // Current value
    type: 'added' | 'removed' | 'modified';
  }[];
  changesSummary: {
    added: number;               // Count of added fields
    removed: number;             // Count of removed fields
    modified: number;            // Count of modified fields
  };
}
```

## API Reference

### Version Creation

#### createVersion()
Creates a new version of a document with automatic version numbering.

```typescript
async createVersion(
  documentId: string,
  content: Record<string, any>,
  metadata: VersionMetadata,
  changeType: 'major' | 'minor' | 'patch' = 'patch'
): Promise<DocumentVersion>
```

**Parameters:**
- `documentId`: Unique identifier for the document
- `content`: Document content as JSON object
- `metadata`: Version metadata including creator and description
- `changeType`: Type of semantic version increment (default: 'patch')

**Returns:** Created DocumentVersion object

**Example:**
```typescript
const version = await versionControl.createVersion(
  'work-instruction-001',
  { title: 'Assembly Steps', steps: [...] },
  {
    createdBy: 'operator1',
    description: 'Updated assembly procedure',
    isPublished: false
  },
  'minor'
);
// Result: version.versionNumber = '1.1.0' (incremented from previous 1.0.x)
```

**Behavior:**
- If no previous version exists, creates version 0.0.1
- For existing versions, increments according to changeType:
  - 'patch': increments patch only (1.0.0 → 1.0.1)
  - 'minor': increments minor, resets patch (1.0.5 → 1.1.0)
  - 'major': increments major, resets minor/patch (1.5.3 → 2.0.0)
- Automatically records change in audit trail
- Generates SHA256 checksum for integrity

### Version Retrieval

#### getVersion()
Retrieves a specific version by ID.

```typescript
async getVersion(versionId: string): Promise<DocumentVersion | null>
```

**Parameters:**
- `versionId`: Version identifier (e.g., 'doc1-v1.0.0')

**Returns:** DocumentVersion object or null if not found

**Example:**
```typescript
const version = await versionControl.getVersion('work-instruction-001-v1.0.0');
if (version) {
  console.log('Content:', version.content);
}
```

#### getLatestVersion()
Retrieves the most recent version of a document.

```typescript
async getLatestVersion(documentId: string): Promise<DocumentVersion | null>
```

**Parameters:**
- `documentId`: Document identifier

**Returns:** Latest DocumentVersion or null if no versions exist

**Example:**
```typescript
const latest = await versionControl.getLatestVersion('work-instruction-001');
console.log('Current version:', latest?.versionNumber); // "1.5.3"
```

#### listVersions()
Retrieves all versions of a document with pagination support.

```typescript
async listVersions(
  documentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<DocumentVersion[]>
```

**Parameters:**
- `documentId`: Document identifier
- `limit`: Maximum number of versions to return (default: 50)
- `offset`: Number of versions to skip for pagination (default: 0)

**Returns:** Array of DocumentVersion objects (newest first)

**Example:**
```typescript
// Get first 10 versions
const page1 = await versionControl.listVersions('doc1', 10, 0);

// Get next 10 versions
const page2 = await versionControl.listVersions('doc1', 10, 10);

// Get all versions (default behavior)
const allVersions = await versionControl.listVersions('doc1');
```

### Version Management

#### publishVersion()
Marks a version as an official release (changes status from 'draft' to 'published').

```typescript
async publishVersion(
  versionId: string,
  publishedBy: string
): Promise<DocumentVersion | null>
```

**Parameters:**
- `versionId`: Version identifier
- `publishedBy`: User publishing the version (for audit trail)

**Returns:** Updated DocumentVersion or null if not found

**Example:**
```typescript
const published = await versionControl.publishVersion(
  'work-instruction-001-v1.0.0',
  'supervisor1'
);
console.log('Status:', published?.status); // 'published'
```

**Behavior:**
- Changes version status to 'published'
- Records publication event in audit trail
- Used to mark versions ready for production use

#### rollback()
Reverts a document to a previous version with reason tracking.

```typescript
async rollback(
  documentId: string,
  targetVersionId: string,
  reason: string,
  performedBy: string
): Promise<DocumentVersion | null>
```

**Parameters:**
- `documentId`: Document identifier
- `targetVersionId`: Version to restore
- `reason`: Explanation for rollback (required for audit trail)
- `performedBy`: User performing the rollback

**Returns:** New version containing rolled-back content

**Example:**
```typescript
const newVersion = await versionControl.rollback(
  'work-instruction-001',
  'work-instruction-001-v1.0.0',
  'Critical error discovered in v1.0.2',
  'admin1'
);
console.log('Rolled back to:', newVersion?.versionNumber); // "1.0.3" with v1.0.0 content
```

**Behavior:**
- Creates new patch version containing previous version's content
- Records rollback reason in change history
- Maintains full audit trail for compliance
- Links new version to source for traceability

#### tagVersion()
Adds semantic tags to a version for organization and retrieval.

```typescript
async tagVersion(
  versionId: string,
  tags: string[],
  taggedBy: string
): Promise<DocumentVersion | null>
```

**Parameters:**
- `versionId`: Version identifier
- `tags`: Array of tag strings to add
- `taggedBy`: User applying tags (for audit trail)

**Returns:** Updated DocumentVersion or null if not found

**Example:**
```typescript
const tagged = await versionControl.tagVersion(
  'work-instruction-001-v1.0.0',
  ['production', 'approved', 'active'],
  'supervisor1'
);
```

**Behavior:**
- Adds tags to version (automatically deduplicates)
- Records tagging action in audit trail
- Useful for marking versions as production-ready, approved, etc.

#### getVersionsByTag()
Retrieves all versions matching a specific tag.

```typescript
async getVersionsByTag(
  documentId: string,
  tag: string
): Promise<DocumentVersion[]>
```

**Parameters:**
- `documentId`: Document identifier
- `tag`: Tag to search for

**Returns:** Array of matching DocumentVersion objects

**Example:**
```typescript
// Get all production-approved versions
const prodVersions = await versionControl.getVersionsByTag(
  'work-instruction-001',
  'production'
);
```

### Version Comparison

#### compareVersions()
Compares two versions and identifies all differences.

```typescript
async compareVersions(
  fromVersionId: string,
  toVersionId: string
): Promise<VersionComparison>
```

**Parameters:**
- `fromVersionId`: Source version identifier
- `toVersionId`: Target version identifier

**Returns:** VersionComparison object with detailed differences

**Example:**
```typescript
const comparison = await versionControl.compareVersions(
  'work-instruction-001-v1.0.0',
  'work-instruction-001-v1.0.2'
);

console.log('Changes summary:');
console.log(`- Added fields: ${comparison.changesSummary.added}`);
console.log(`- Removed fields: ${comparison.changesSummary.removed}`);
console.log(`- Modified fields: ${comparison.changesSummary.modified}`);

// View specific changes
comparison.differences.forEach(diff => {
  console.log(`${diff.field}: ${diff.type}`);
  if (diff.type === 'modified') {
    console.log(`  Old: ${diff.oldValue}`);
    console.log(`  New: ${diff.newValue}`);
  }
});
```

**Difference Types:**
- `'added'`: Field exists in target version but not in source
- `'removed'`: Field exists in source version but not in target
- `'modified'`: Field value changed between versions

### Audit Trail

#### getAuditTrail()
Retrieves the complete change history for a document.

```typescript
async getAuditTrail(
  documentId: string,
  limit: number = 100
): Promise<ChangeRecord[]>
```

**Parameters:**
- `documentId`: Document identifier
- `limit`: Maximum number of records to return (default: 100)

**Returns:** Array of ChangeRecord objects (newest first)

**Example:**
```typescript
const history = await versionControl.getAuditTrail('work-instruction-001', 50);

history.forEach(record => {
  console.log(`${record.changedAt}: ${record.changeType} by ${record.changedBy}`);
  console.log(`  Reason: ${record.description}`);
  if (record.ipAddress) {
    console.log(`  IP: ${record.ipAddress}`);
  }
});
```

**Change Types in Audit Trail:**
- `'create'`: New version created
- `'update'`: Version metadata updated (e.g., tagging, publishing)
- `'delete'`: Version archived
- `'rollback'`: Version restored from prior version
- `'merge'`: Version result of merge operation (Phase 2)

**Compliance Information:**
- All changes logged with timestamp
- User attribution for accountability
- IP address and user agent captured (when available)
- Detailed change descriptions for context

## Implementation Details

### Semantic Versioning

The service uses semantic versioning to track different types of changes:

```
MAJOR.MINOR.PATCH
```

- **MAJOR**: Breaking changes or major feature updates (1.0.0 → 2.0.0)
- **MINOR**: New non-breaking features or functionality (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes and minor updates (1.0.0 → 1.0.1)

When incrementing, lower-level versions reset:
- Major increment: `1.5.3 → 2.0.0`
- Minor increment: `1.0.5 → 1.1.0`
- Patch increment: `1.0.0 → 1.0.1`

### Data Integrity

The service verifies document integrity using SHA256 checksums:

```typescript
// Checksums for identical content are always the same
const content1 = { title: 'Document' };
const content2 = { title: 'Document' };
// checksum(content1) === checksum(content2)

// Different content produces different checksums
const content3 = { title: 'Updated' };
// checksum(content1) !== checksum(content3)
```

Checksums are calculated when versions are created and can be used to:
- Verify content hasn't been corrupted
- Detect duplicate versions
- Validate version integrity in compliance audits

### Error Handling

The service handles errors gracefully:

```typescript
// Version not found returns null
const version = await versionControl.getVersion('nonexistent');
// Result: null

// List operations return empty arrays on error
const versions = await versionControl.listVersions('doc1');
// Result: [] (even if there's a database error)

// Critical operations throw errors
try {
  await versionControl.createVersion('doc1', {}, metadata);
} catch (error) {
  // Handle database errors
}
```

## Use Cases

### Manufacturing Work Instructions
```typescript
// Create new work instruction version
const v1 = await versionControl.createVersion(
  'assembly-procedure-123',
  {
    title: 'Assembly Procedure',
    steps: [
      'Step 1: Align parts',
      'Step 2: Apply adhesive',
      'Step 3: Clamp assembly'
    ]
  },
  {
    createdBy: 'operator1',
    description: 'Initial procedure',
    isPublished: false
  }
);

// Update with improvements
const v2 = await versionControl.createVersion(
  'assembly-procedure-123',
  {
    title: 'Assembly Procedure - Revised',
    steps: [
      'Step 1: Pre-inspect parts',
      'Step 2: Align parts',
      'Step 3: Apply adhesive (2ml)',
      'Step 4: Clamp assembly'
    ]
  },
  {
    createdBy: 'operator1',
    description: 'Added pre-inspection step and adhesive quantity',
    isPublished: false
  },
  'minor'
);

// Publish for production
await versionControl.publishVersion(v2.id, 'supervisor1');

// Tag as production-ready
await versionControl.tagVersion(v2.id, ['production', 'approved'], 'supervisor1');
```

### Quality Document Management
```typescript
// Track quality procedures with full history
const qcProcedure = await versionControl.createVersion(
  'quality-checklist-456',
  {
    title: 'QC Inspection Checklist',
    items: ['Visual inspection', 'Dimension verification', 'Electrical test']
  },
  {
    createdBy: 'qc-manager1',
    description: 'Initial checklist version',
    isPublished: false
  }
);

// Later, compare with updated procedure
const updateChecklist = await versionControl.createVersion(
  'quality-checklist-456',
  {
    title: 'QC Inspection Checklist - Updated',
    items: [
      'Visual inspection',
      'Dimension verification',
      'Electrical test',
      'Environmental stress screening'
    ]
  },
  {
    createdBy: 'qc-manager1',
    description: 'Added environmental stress screening requirement',
    isPublished: false
  },
  'minor'
);

// View what changed
const diff = await versionControl.compareVersions(
  qcProcedure.id,
  updateChecklist.id
);
console.log(`Added items: ${diff.changesSummary.added}`);
```

### Compliance & Audit
```typescript
// View complete change history for compliance
const auditTrail = await versionControl.getAuditTrail('document-001');

// Generate compliance report
const report = {
  documentId: 'document-001',
  totalVersions: auditTrail.length,
  changes: auditTrail.map(record => ({
    timestamp: record.changedAt,
    type: record.changeType,
    user: record.changedBy,
    userIP: record.ipAddress,
    description: record.description
  }))
};
```

## Phase 1 Capabilities

This Phase 1 implementation includes:

✅ **Core Version Control**
- Semantic versioning (major.minor.patch)
- Version creation with automatic numbering
- Complete version history management
- Latest version tracking

✅ **Publishing & States**
- Draft/Published/Archived status tracking
- Version publishing workflow
- Status transitions and tracking

✅ **Rollback & Recovery**
- Full version rollback capability
- Reason tracking for compliance
- Automatic audit trail recording

✅ **Audit & Compliance**
- Complete change record history
- User attribution and timestamps
- IP address and user agent tracking
- Detailed change descriptions

✅ **Data Integrity**
- SHA256 checksum verification
- Content comparison and diff generation
- Version comparison with change summaries

✅ **Organization & Retrieval**
- Version tagging system
- Tag-based version queries
- Paginated version listing

## Phase 2 & 3 Preview

Future phases will add:

### Phase 2: Advanced Features
- Branch and merge operations
- Conflict detection and resolution
- 3-way merge support
- Parallel development workflows
- Branch protection policies

### Phase 3: Enterprise Features
- Digital signature support
- Compliance rule enforcement
- Automated approval workflows
- Advanced encryption options
- Integration with document management systems

## Performance Considerations

### Checksum Calculation
- SHA256 checksums calculated on version creation
- Minimal performance impact for typical document sizes
- Cached in database for integrity verification

### Pagination
- Default limit of 50 versions per page
- Configurable for memory-constrained environments
- Efficient database queries with ordering

### Audit Trail
- Default limit of 100 records per query
- Efficient timestamp-based ordering
- Suitable for compliance audits and reporting

## Error Scenarios

### Common Errors

**Version Not Found**
```typescript
const version = await versionControl.getVersion('invalid-id');
// Returns: null
```

**Document Not Found**
```typescript
const versions = await versionControl.listVersions('nonexistent');
// Returns: []
```

**Database Connection Error**
```typescript
try {
  await versionControl.createVersion('doc1', {}, metadata);
} catch (error) {
  // Database error propagates for critical operations
  console.error('Failed to create version:', error.message);
}
```

## Testing

The service includes comprehensive test coverage:

- **39 tests** covering all operations
- Version creation with semantic versioning
- Version retrieval and listing
- Rollback functionality
- Publishing workflows
- Version comparison and diffs
- Audit trail tracking
- Tagging and tag queries
- Checksum integrity
- Error handling scenarios
- Integration workflows

Run tests:
```bash
npm test -- src/tests/services/DocumentVersionControlService.test.ts
```

## Migration & Upgrade

### From Phase 0 (No Version Control)

If upgrading from systems without version control:

```typescript
// Create initial version from current document
const initialVersion = await versionControl.createVersion(
  documentId,
  existingDocumentContent,
  {
    createdBy: 'system-migration',
    description: 'Initial version (migrated from legacy system)',
    isPublished: true
  },
  'major'
);

// Publish as production version
await versionControl.publishVersion(initialVersion.id, 'admin');
await versionControl.tagVersion(initialVersion.id, ['migrated', 'production'], 'admin');
```

## Related Issues & Features

- **Issue #72**: Document Version Control & History (Phase 1: This implementation)
- **Issue #72a**: Advanced Features (Phase 2: Planned)
- **Issue #72b**: Enterprise Features (Phase 3: Planned)

## References

- [Semantic Versioning](https://semver.org/)
- [SHA256 Hashing](https://en.wikipedia.org/wiki/SHA-2)
- [Audit Trail Best Practices](https://en.wikipedia.org/wiki/Audit_trail)

---

**Implementation Date**: November 2025
**Last Updated**: November 1, 2025
**Status**: Implemented - Phase 1 Complete
