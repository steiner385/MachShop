# Extension Validation Framework

**Version**: 2.0.0

Comprehensive validation and testing framework for MachShop extensions ensuring quality, security, and compliance.

## Overview

The Extension Validation Framework provides:

- ✅ **Manifest Validation** - Schema and semantic validation
- ✅ **Code Quality** - TypeScript, best practices, anti-patterns
- ✅ **Security** - Input validation, XSS prevention, secrets management
- ✅ **Accessibility** - WCAG 2.1 AA compliance checking
- ✅ **Performance** - Bundle size, render performance
- ✅ **Error Handling** - Proper error handling patterns
- ✅ **Testing Framework** - Unit and integration testing utilities

## Installation

```bash
npm install @machshop/extension-validation-framework
```

## Usage

### Command Line

```bash
# Validate an extension
npx validate-extension /path/to/extension

# Validate with options
npx validate-extension /path/to/extension --strict --fix
```

### Programmatic

```typescript
import { validateExtension, formatValidationReport } from '@machshop/extension-validation-framework';

const report = await validateExtension('./my-extension');

if (report.valid) {
  console.log('Extension is valid!');
} else {
  console.log(formatValidationReport(report));
}
```

## Validation Rules

### Manifest Validation

**Schema Validation**:
- Valid JSON structure
- Required fields present
- Correct field types
- Valid format patterns

**Semantic Validation**:
- ID format (lowercase alphanumeric)
- Version follows semver
- Name length (1-100 chars)
- No duplicate IDs
- Description and author present

**Capabilities**:
- All capabilities have IDs
- Capability ID format valid

**UI Components**:
- Components have required fields
- Valid component types
- Widgets specify slots
- Valid permissions

**Navigation**:
- Navigation items have IDs and labels
- Valid menu structure
- At least path or href specified

### Code Quality

**TypeScript**:
- Strict mode enabled
- No implicit any
- Strict null checks
- Proper type definitions

**Quality Issues**:
- No console.log in production
- Limited use of any type
- No hard-coded colors
- No hard-coded spacing
- Unresolved TODO/FIXME comments

### Security

- No `dangerouslySetInnerHTML`
- No `eval()` usage
- No exposed secrets
- No hard-coded API URLs
- Environment variables used properly

### Accessibility (WCAG 2.1 AA)

- Images have alt text
- Form inputs have labels
- Buttons have accessible names
- Semantic HTML used
- Heading hierarchy correct
- Color contrast adequate
- Skip navigation links present

### Error Handling

- Async functions have try-catch
- Promises have .catch()
- Error logging present
- Error boundaries used
- Graceful degradation

## Validation Issues

Each issue contains:

```typescript
interface ValidationIssue {
  code: string;           // Issue code
  message: string;        // Human-readable message
  severity: string;       // 'error' | 'warning' | 'info'
  file?: string;          // File path
  line?: number;          // Line number
  column?: number;        // Column number
  fix?: string;           // Suggested fix
  ruleId: string;         // Which rule found this
}
```

## Validation Report

```typescript
interface ValidationReport {
  valid: boolean;         // Overall pass/fail
  issues: ValidationIssue[];
  errorCount: number;
  warningCount: number;
  infoCount: number;
  duration: number;       // milliseconds
  rulesRun: string[];     // Rules that executed
  timestamp: Date;
}
```

## Examples

### Validate Extension

```typescript
import { validateExtension } from '@machshop/extension-validation-framework';

const report = await validateExtension('./my-extension');

console.log(`Valid: ${report.valid}`);
console.log(`Errors: ${report.errorCount}`);
console.log(`Warnings: ${report.warningCount}`);
```

### Check Specific Issues

```typescript
const report = await validateExtension('./my-extension');

// Find color issues
const colorIssues = report.issues.filter(i =>
  i.code === 'HARDCODED_COLOR'
);

// Find security issues
const securityIssues = report.issues.filter(i =>
  i.ruleId === 'security'
);
```

### Fix Issues

```typescript
const report = await validateExtension('./my-extension');

for (const issue of report.issues) {
  if (issue.fix) {
    console.log(`${issue.code}: ${issue.fix}`);
  }
}
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Validate Extension
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      - run: npm install @machshop/extension-validation-framework
      - run: npx validate-extension .
```

### Pre-commit Hook

```bash
#!/bin/bash
npx validate-extension . --strict
if [ $? -ne 0 ]; then
  echo "Extension validation failed"
  exit 1
fi
```

## Severity Levels

- **Error**: Must be fixed before submission (blocks validation)
- **Warning**: Should be fixed (quality issues)
- **Info**: Nice to have (informational only)

## Best Practices

1. **Run Validation Early**: Check during development
2. **Fix Errors First**: Errors block submission
3. **Address Warnings**: Improves code quality
4. **Review Suggestions**: Follow the provided fixes
5. **Test After Changes**: Re-run validation after fixes
6. **Use in CI/CD**: Automate validation in pipelines

## Exit Codes

- `0`: Validation passed
- `1`: Validation failed (errors found)
- `2`: Validation error (couldn't run)

## Performance

- Validation typically runs in < 2 seconds
- Scales well with extension size
- Minimal memory usage

## Limitations

- Static analysis only (doesn't execute code)
- May have false positives in complex code
- Requires proper file structure

## Configuration

### Options

```typescript
interface ValidationOptions {
  // Treat warnings as errors
  strict?: boolean;

  // Only validate specific rules
  rules?: string[];

  // Exclude certain rules
  excludeRules?: string[];

  // Auto-fix issues (where possible)
  fix?: boolean;

  // Output format
  format?: 'json' | 'text' | 'table';
}
```

## Output Formats

### Text (Default)

```
=== Extension Validation Report ===

Status: ✅ PASS
Duration: 1234ms

Errors: 0
Warnings: 2
Info: 3

Issues:

  src/index.tsx:
    [WARNING] Hard-coded color value found (HARDCODED_COLOR)
    → Use design tokens from useTheme() hook
```

### JSON

```json
{
  "valid": true,
  "issues": [...],
  "errorCount": 0,
  "warningCount": 2,
  "infoCount": 3,
  "duration": 1234,
  "rulesRun": [...]
}
```

## Support

- **Documentation**: `/docs/extension-validation/`
- **GitHub Issues**: Report validation issues
- **Examples**: `/examples/validation/`

## Related Packages

- `@machshop/frontend-extension-sdk` - Core SDK
- `@machshop/navigation-extension-framework` - Navigation
- `@machshop/component-override-framework` - Overrides

## License

MIT
