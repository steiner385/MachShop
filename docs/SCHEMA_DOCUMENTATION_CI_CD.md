# Automated Schema Documentation & CI/CD Integration
**Issue #167**: SDK & Extensibility: Automated Data Dictionary & CI/CD Integration

## Overview

This system provides **fully automated schema extraction, documentation generation, and validation** integrated into the CI/CD pipeline. It ensures that database schema documentation stays synchronized with code changes in real-time.

## Components

### 1. **Schema Extractor** (`scripts/schema-extractor.ts`)

Extracts Prisma schema metadata and generates three types of output:

#### Features
- **Prisma Schema Parsing**: Extracts models, fields, relationships, and enums
- **Metadata JSON**: Machine-readable schema information
- **Markdown Documentation**: Human-readable schema reference
- **Entity Relationship Diagram (ERD)**: Visual schema representation in Mermaid format

#### Usage

```bash
# Compile TypeScript
npx tsc scripts/schema-extractor.ts --outDir ./dist --module commonjs --target es2020

# Run extraction
node dist/scripts/schema-extractor.js
```

#### Output Files

Generated in `docs/generated/`:

```
├── schema-metadata.json          # Machine-readable schema
├── SCHEMA_DOCUMENTATION.md       # Human-readable docs
└── schema-erd.mmd              # Visual diagram
```

#### Example Output

**schema-metadata.json**:
```json
{
  "version": "1.0.0",
  "lastUpdated": "2024-10-31T10:30:00Z",
  "models": [
    {
      "name": "CorrectiveAction",
      "pluralName": "CorrectiveActions",
      "fields": [
        {
          "name": "id",
          "type": "String",
          "required": true,
          "unique": true
        },
        {
          "name": "caNumber",
          "type": "String",
          "required": true
        }
      ],
      "relationships": [
        "assignedTo: User",
        "auditTrail: CorrectiveActionAudit[]"
      ]
    }
  ],
  "enums": {
    "QMSCAStatus": ["OPEN", "IN_PROGRESS", "IMPLEMENTED", "VERIFIED_EFFECTIVE"]
  }
}
```

### 2. **Schema Validation Hook** (`scripts/schema-validation-hook.ts`)

Pre-commit/pre-push validation that:

- ✅ Validates Prisma schema syntax
- ✅ Detects breaking changes (model/field removal)
- ✅ Ensures all models have primary keys
- ✅ Checks for audit timestamps (createdAt/updatedAt)
- ✅ Verifies model documentation exists
- ⚠️ Warns about potentially risky changes

#### Installation

1. **Copy validation script to hooks**:
```bash
cat > .git/hooks/pre-commit << 'EOF'
#!/bin/bash
npx ts-node scripts/schema-validation-hook.ts
exit $?
EOF

cat > .git/hooks/pre-push << 'EOF'
#!/bin/bash
npx ts-node scripts/schema-validation-hook.ts
exit $?
EOF

chmod +x .git/hooks/pre-commit .git/hooks/pre-push
```

2. **Configuration** (in `.husky` for team-wide use):
```bash
npx husky add .husky/pre-commit "npx ts-node scripts/schema-validation-hook.ts"
npx husky add .husky/pre-push "npx ts-node scripts/schema-validation-hook.ts"
```

#### Validation Rules

| Rule | Type | Description |
|------|------|-------------|
| Syntax Validation | Error | Checks Prisma syntax correctness |
| Breaking Changes | Error | Prevents removing models without migration |
| Primary Key | Error | Requires `@id` on at least one field |
| Audit Fields | Warning | Recommends `createdAt`/`updatedAt` |
| Documentation | Warning | Suggests JSDoc comments on models |

#### Example Output

```
🔍 Validating schema changes...

═══════════════════════════════════════════════════════
           SCHEMA VALIDATION RESULTS
═══════════════════════════════════════════════════════

✅ Schema validation passed!
   - Syntax valid
   - No breaking changes
   - All required attributes present
```

### 3. **CI/CD GitHub Actions Workflow** (`.github/workflows/schema-documentation.yml`)

Automates documentation generation when schema changes:

#### Triggers

- **Push to main** with `prisma/schema.prisma` changes
- **Pull requests** to main with schema changes
- **Manual trigger** via workflow dispatch

#### Jobs

1. **Validate Schema Changes**
   - Detects schema modifications
   - Reports changes in PR comments

2. **Generate Documentation**
   - Compiles schema extractor
   - Generates all documentation formats
   - Validates output files

3. **Quality Checks**
   - Validates metadata JSON
   - Reports schema statistics

4. **Commit Documentation** (main only)
   - Auto-commits documentation updates
   - Prevents documentation drift

#### PR Integration

When schema changes are detected in a PR:

```
## 📊 Schema Changes Detected

**Schema Summary:**
- Models: 125
- Enums: 42
- Last Updated: 2024-10-31T10:30:00Z

**Actions:**
- ✅ Schema extracted and validated
- ✅ Documentation generated
- ✅ ERD created
```

## Workflow

### Developer Workflow

```
1. Modify prisma/schema.prisma
   ↓
2. Pre-commit hook validates changes
   ↓
3. Commit changes
   ↓
4. Pre-push hook validates again
   ↓
5. Push to GitHub
   ↓
6. GitHub Actions workflow triggers
   ↓
7. Documentation auto-generated & committed
   ↓
8. PR merged with up-to-date docs
```

### For Pull Requests

```
1. Developer pushes changes to feature branch
   ↓
2. GitHub Actions validates schema
   ↓
3. Posts schema summary comment on PR
   ↓
4. Artifacts available for download
   ↓
5. Reviewer can see schema changes
   ↓
6. Merge to main auto-commits docs
```

## Benefits

✅ **Prevents Documentation Drift**: Automatic updates on every schema change
✅ **Catches Undocumented Changes**: Pre-commit validation enforces standards
✅ **Early Warning**: Breaking changes caught before commit
✅ **Team Awareness**: PR comments notify reviewers of schema changes
✅ **Audit Trail**: All schema changes tracked in git history
✅ **Visual Documentation**: ERD diagrams for complex schemas
✅ **Reduced Maintenance**: Eliminates manual documentation updates
✅ **Single Source of Truth**: Documentation always matches code

## Integration Points

### With Existing Systems

**Dependency on Issue #165 & #166**:
- ✅ Issue #165: Data Dictionary Infrastructure
- ✅ Issue #166: Initial Database Documentation

**Extends**:
- Database documentation
- Data dictionary
- Developer portal
- API documentation

### Compatibility

- **Prisma ORM**: Works with any Prisma schema
- **TypeScript**: Leverages TypeScript for type safety
- **Node.js**: Runs on any Node 18+ environment
- **Git**: Uses git for change detection
- **GitHub**: Integrates with GitHub Actions

## Configuration

### Environment Variables

```bash
# Optional: Custom schema location
PRISMA_SCHEMA_PATH=./prisma/schema.prisma

# Optional: Custom output directory
SCHEMA_OUTPUT_DIR=./docs/generated

# Optional: Enable verbose logging
SCHEMA_EXTRACTOR_DEBUG=true
```

### NPM Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "schema:extract": "ts-node scripts/schema-extractor.ts",
    "schema:validate": "ts-node scripts/schema-validation-hook.ts",
    "schema:setup-hooks": "chmod +x .git/hooks/pre-commit .git/hooks/pre-push"
  }
}
```

## Usage Examples

### Extract Schema Locally

```bash
npm run schema:extract
```

### Validate Changes Before Commit

```bash
npm run schema:validate
```

### Setup Git Hooks Automatically

```bash
npm run schema:setup-hooks
```

### Generate Documentation Only

```bash
npx tsc scripts/schema-extractor.ts --outDir dist && \
node -e "require('./dist/scripts/schema-extractor.js').SchemaExtractor().run()"
```

### Update Documentation in CI/CD

```bash
# Manually trigger GitHub Actions
gh workflow run schema-documentation.yml
```

## File Structure

```
project/
├── scripts/
│   ├── schema-extractor.ts                    # Main extractor
│   └── schema-validation-hook.ts              # Validation rules
├── .github/
│   └── workflows/
│       └── schema-documentation.yml           # CI/CD workflow
├── docs/
│   ├── SCHEMA_DOCUMENTATION_CI_CD.md          # This file
│   └── generated/
│       ├── schema-metadata.json               # Auto-generated
│       ├── SCHEMA_DOCUMENTATION.md            # Auto-generated
│       └── schema-erd.mmd                     # Auto-generated
└── prisma/
    └── schema.prisma                          # Source of truth
```

## Troubleshooting

### Schema Extraction Fails

```bash
# Check Prisma schema syntax
npx prisma validate

# Verify schema file exists
ls -la prisma/schema.prisma

# Run extractor with debug output
DEBUG=* npm run schema:extract
```

### Pre-commit Hook Not Running

```bash
# Make hooks executable
chmod +x .git/hooks/pre-commit .git/hooks/pre-push

# Verify hook file
cat .git/hooks/pre-commit

# Test hook manually
.git/hooks/pre-commit
```

### GitHub Actions Workflow Not Triggering

```bash
# Verify workflow is enabled
gh workflow list

# Check workflow runs
gh run list --workflow schema-documentation.yml

# View workflow logs
gh run view [RUN_ID] --log
```

### Documentation Not Updating

```bash
# Force manual trigger
gh workflow run schema-documentation.yml -f

# Check for uncommitted changes
git status docs/generated/

# Verify workflow permissions
# Settings > Actions > General > Workflow Permissions > Read and Write
```

## Advanced Usage

### Custom Model Descriptions

Add JSDoc comments to your schema:

```prisma
/// Tracks corrective and preventive actions for quality management.
/// This model manages the complete CAPA lifecycle from initiation through verification.
model CorrectiveAction {
  id String @id @default(cuid())
  // ... fields
}
```

### Custom Field Documentation

Add inline comments:

```prisma
model CorrectiveAction {
  id String @id @default(cuid())
  /// The unique identifier for this CA (e.g., CA-2024-001)
  caNumber String @unique
  // ... more fields
}
```

### Filtering Models in Documentation

Extend `schema-extractor.ts` to support custom filters:

```typescript
// Filter models by pattern
const models = metadata.models.filter(m =>
  !m.name.startsWith('_') // Skip internal models
);
```

### Custom ERD Generation

Modify ERD format in `schema-extractor.ts`:

```typescript
// Generate PlantUML instead of Mermaid
private generatePlantUmlERD(): string {
  // Custom implementation
}
```

## Maintenance

### Regular Tasks

- **Weekly**: Review schema documentation updates
- **Monthly**: Validate metadata quality
- **Quarterly**: Update ERD rendering tool if needed

### Updating Tools

```bash
# Update Prisma
npm update @prisma/client prisma

# Update TypeScript
npm update typescript

# Update GitHub Actions
# Manually update .github/workflows/schema-documentation.yml
```

## Support & Issues

For issues or feature requests:

1. Check existing GitHub issues
2. Review workflow logs in GitHub Actions
3. Run validation hook locally for detailed errors
4. File issue with schema sample and error output

## Related

- **Issue #165**: Data Dictionary Infrastructure
- **Issue #166**: Initial Database Documentation
- **Issue #80**: Developer Tooling & Documentation
- **Issue #343**: Phase 5 Documentation Completion

---

*Last Updated: 2024-10-31*
*Maintained by: Development Team*
