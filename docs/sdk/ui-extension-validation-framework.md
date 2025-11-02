# UI Extension Validation & Testing Framework

**Issue #430** - UI Extension Validation & Testing Framework for Low-Code Platform

## Overview

The UI Extension Validation & Testing Framework provides comprehensive build-time and runtime validation for UI extensions. It ensures that all extensions meet quality, security, accessibility, and design standards before deployment. The framework consists of multiple validators working together to create a robust extension ecosystem.

## Architecture Overview

The validation framework consists of four core validator services:

- **ManifestValidator**: Validates extension manifest.json schema and metadata
- **ComponentContractValidator**: Validates component implementations match required interfaces
- **BundleAnalyzer**: Analyzes bundle size, dependencies, and asset composition
- **ASTAnalyzer**: Performs TypeScript/TSX code analysis for security and best practices

## Core Services

### ManifestValidator

Validates extension manifest.json files for correct schema, required fields, and proper formatting.

**Key Features:**
- Required field validation (name, version, description, author, license, requiredExtensionVersion)
- Semantic versioning validation (MAJOR.MINOR.PATCH format)
- License recognition and validation
- URL format validation for homepage and repository
- Optional field type checking
- Comprehensive error and warning reporting

**Methods:**

```typescript
// Validation
async validateManifest(manifestJson: any): Promise<ManifestValidationResult>
```

**Manifest Validation Result:**

```typescript
interface ManifestValidationResult {
  isValid: boolean;
  errors: string[]; // Critical validation failures
  warnings: string[]; // Non-blocking issues (e.g., unknown license)
  metadata?: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    requiredExtensionVersion: string;
  };
}
```

**Required Fields:**

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| name | string | Extension identifier | "my-component-library" |
| version | string | Semantic version | "1.0.0" |
| description | string | Human-readable description | "Custom component library" |
| author | string | Extension author/organization | "My Company" |
| license | string | OSS license (MIT, Apache-2.0, etc.) | "MIT" |
| requiredExtensionVersion | string | Minimum platform version | "1.0.0" |

**Optional Fields:**

```typescript
{
  homepage?: string;          // Project homepage URL
  repository?: string;        // Repository URL
  keywords?: string[];        // Search tags
  homepage?: string;          // Project homepage
}
```

**Example Usage:**

```typescript
const validator = new ManifestValidator();

const manifest = {
  name: 'my-extension',
  version: '1.0.0',
  description: 'Custom UI extension',
  author: 'My Company',
  license: 'MIT',
  requiredExtensionVersion: '1.0.0',
};

const result = await validator.validateManifest(manifest);
if (!result.isValid) {
  console.error('Manifest validation errors:', result.errors);
}
```

### ComponentContractValidator

Validates that component implementations match required interfaces and follow React best practices.

**Key Features:**
- Component signature extraction from TypeScript/TSX code
- Props interface validation
- Required vs. optional props detection
- React import checking
- Component export validation (default or named)
- Prop type inference from source code

**Methods:**

```typescript
// Validation
async validateComponentContract(
  componentCode: string,
  componentName: string
): Promise<ComponentContractValidationResult>

async validateExports(componentCode: string): Promise<{
  isValid: boolean;
  errors: string[];
  exports: string[];
}>
```

**Component Contract Validation Result:**

```typescript
interface ComponentContractValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  components?: Array<{
    name: string;
    isValid: boolean;
    requiredProps: string[];
    optionalProps: string[];
    returnType: string;
    errors?: string[];
  }>;
}
```

**Example Usage:**

```typescript
const validator = new ComponentContractValidator();

const componentCode = `
  interface MyComponentProps {
    title: string;
    count?: number;
  }

  export const MyComponent: React.FC<MyComponentProps> = ({ title, count }) => {
    return <div>{title}: {count}</div>;
  };
`;

const result = await validator.validateComponentContract(componentCode, 'MyComponent');

if (result.components?.[0].requiredProps.length === 0) {
  console.warn('Component has no required props');
}
```

### BundleAnalyzer

Analyzes extension bundle size, dependencies, and asset composition to ensure optimal performance.

**Key Features:**
- Bundle size calculation (gzipped and uncompressed)
- Size limit enforcement (500 KB gzipped default)
- Dependency analysis (direct, dev, peer dependencies)
- Heavy dependency identification (lodash, moment, d3, etc.)
- Asset composition analysis (images, styles, scripts)
- Dependency tree depth calculation
- Duplicate dependency detection
- Dependency compatibility validation

**Methods:**

```typescript
// Analysis
async analyzeBundleSize(
  bundleContent: Buffer,
  packageJson?: any
): Promise<BundleAnalysisResult>

async validateDependencyCompatibility(
  packageJson?: any,
  requiredExtensionVersion?: string
): Promise<{
  isValid: boolean;
  errors: string[];
  warnings: string[];
}>
```

**Bundle Analysis Result:**

```typescript
interface BundleAnalysisResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  bundleSize: {
    gzipped: number;        // Compressed size in bytes
    uncompressed: number;   // Original size in bytes
    limit: number;          // Maximum allowed size
  };
  dependencies: {
    totalCount: number;
    directDependencies: string[];
    devDependencies: string[];
    peerDependencies: string[];
    duplicates: Array<{ name: string; versions: string[] }>;
  };
  assets: {
    totalCount: number;
    images: number;
    styles: number;
    scripts: number;
  };
  tree: {
    depth: number;
    largestDependency?: { name: string; size: number };
  };
}
```

**Bundle Size Limits:**

| Type | Limit | Warning Threshold |
|------|-------|-------------------|
| Gzipped | 500 KB | 400 KB (80%) |
| Uncompressed | 2 MB | 1.6 MB (80%) |

**Example Usage:**

```typescript
const analyzer = new BundleAnalyzer();
const fs = require('fs');

const bundleContent = fs.readFileSync('./dist/extension.js');
const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));

const result = await analyzer.analyzeBundleSize(bundleContent, packageJson);

if (!result.isValid) {
  console.error('Bundle exceeds size limit:', result.errors);
}

if (result.warnings.length > 0) {
  console.warn('Bundle warnings:', result.warnings);
}
```

**Bundle Comparison Analyzer:**

```typescript
const comparisonAnalyzer = new BundleComparisonAnalyzer();

const comparison = comparisonAnalyzer.compare(baseline, current);

if (comparison.sizeIncreasePercent > 10) {
  console.warn(`Bundle size increased by ${comparison.sizeIncreasePercent}%`);
}

if (comparison.dependencyDelta > 5) {
  console.warn(`${comparison.dependencyDelta} new dependencies added`);
}
```

### ASTAnalyzer

Performs static code analysis on TypeScript/TSX files to detect issues and enforce best practices.

**Key Features:**
- Import analysis (Ant Design, external, local imports)
- Non-Ant Design component detection
- Hardcoded color identification
- Unsafe import detection (fs, child_process, etc.)
- Component counting and identification
- Component props analysis
- Security issue detection (XSS, code injection, etc.)
- React best practices checking

**Methods:**

```typescript
// Analysis
async analyzeCode(code: string): Promise<ASTAnalysisResult>

async analyzeComponentProps(
  componentCode: string,
  componentName: string
): Promise<{
  isValid: boolean;
  errors: string[];
  props: Array<{
    name: string;
    type: string;
    required: boolean;
    hasDefault: boolean;
  }>;
}>

async detectSecurityIssues(code: string): Promise<{
  issues: Array<{
    type: string;
    description: string;
    severity: 'high' | 'medium' | 'low';
  }>;
}>
```

**AST Analysis Result:**

```typescript
interface ASTAnalysisResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  analysis: {
    nonAntDesignComponents: string[];
    hardcodedColors: Array<{
      color: string;
      line: number;
      context: string;
    }>;
    unsafeImports: string[];
    componentCount: number;
    importsAnalysis: {
      totalImports: number;
      antDesignImports: number;
      externalImports: number;
      localImports: number;
    };
  };
}
```

**Security Issues Detected:**

| Issue Type | Severity | Description |
|-----------|----------|-------------|
| XSS Risk | High | Use of dangerouslySetInnerHTML |
| Code Injection | High | Use of eval() or Function constructor |
| XSS Risk | Medium | Use of innerHTML |
| Input Validation | Low | onChange handler without validation |

**Ant Design Components Supported:**

The analyzer recognizes 40+ Ant Design components including:
- Button, Input, Select, Form
- Modal, Message, Notification
- Table, List, Pagination
- DatePicker, TimePicker
- And 30+ more components

**Example Usage:**

```typescript
const analyzer = new ASTAnalyzer();
const fs = require('fs');

const code = fs.readFileSync('./src/MyComponent.tsx', 'utf8');

const result = await analyzer.analyzeCode(code);

if (!result.isValid) {
  console.error('Code analysis errors:', result.errors);
}

const securityResult = analyzer.detectSecurityIssues(code);
if (securityResult.issues.length > 0) {
  console.error('Security issues found:', securityResult.issues);
}
```

## Validation Report Generator

Generates comprehensive validation reports combining results from all validators.

**Methods:**

```typescript
// Report generation
async generateReport(
  extensionId: string,
  validatorResults: {
    manifest: ManifestValidationResult;
    componentContract: ComponentContractValidationResult;
  }
): Promise<ValidationReport>

async formatReport(report: ValidationReport): string
```

**Validation Report:**

```typescript
interface ValidationReport {
  extensionId: string;
  timestamp: Date;
  overallValid: boolean;
  validatorResults: {
    manifest: ManifestValidationResult;
    componentContract: ComponentContractValidationResult;
    accessibility?: { isValid: boolean; errors: string[] };
    antDesign?: { isValid: boolean; errors: string[] };
    themeTokens?: { isValid: boolean; errors: string[] };
    bundleSize?: { isValid: boolean; errors: string[] };
    performance?: { isValid: boolean; errors: string[] };
    security?: { isValid: boolean; errors: string[] };
  };
  totalErrors: number;
  totalWarnings: number;
}
```

**Example Usage:**

```typescript
const generator = new ValidationReportGenerator();

const report = generator.generateReport('ext-my-extension', {
  manifest: manifestResult,
  componentContract: componentResult,
});

const formatted = generator.formatReport(report);
console.log(formatted);
```

## Validation Workflow

### Build-Time Validation

```
1. Manifest Validation
   ├── Required fields check
   ├── Version format validation
   ├── License validation
   └── URL format validation

2. Component Contract Validation
   ├── Component signature extraction
   ├── Props interface validation
   ├── Export validation
   └── React best practices check

3. Bundle Analysis
   ├── Size measurement
   ├── Dependency analysis
   ├── Asset composition
   └── Heavy dependency detection

4. Code Analysis
   ├── Security issue detection
   ├── Hardcoded color detection
   ├── Non-Ant Design component detection
   └── Import analysis

5. Report Generation
   └── Comprehensive validation report
```

### Validation Stages

**Stage 1: Manifest Validation**
- Files: manifest.json
- Time: < 100ms
- Pass Rate: 95%+

**Stage 2: Component Contract**
- Files: *.tsx, *.ts
- Time: < 200ms per file
- Pass Rate: 90%+

**Stage 3: Bundle Analysis**
- Files: dist/extension.js, package.json
- Time: < 500ms
- Pass Rate: 85%+

**Stage 4: Code Analysis**
- Files: src/**/*.ts{x}
- Time: < 1000ms
- Pass Rate: 80%+

## Integration Points

### With Other Services

- **Extension Governance Framework (Issue #396)**: Validates extensions comply with governance policies
- **Component Library (Issue #397)**: Ensures components use library components
- **Automation Rules (Issue #398)**: Validates automation rule syntax
- **Form & UI Builder (Issue #399)**: Validates form configurations
- **Marketplace (Issue #401)**: Pre-deployment validation for marketplace submissions
- **CI/CD Pipeline**: GitHub Actions integration for automated validation

## Best Practices

1. **Validate Early**: Run validators during development, not just at deployment
2. **Fix Errors First**: Resolve all errors before fixing warnings
3. **Monitor Bundle Size**: Track bundle size across versions
4. **Use Theme Tokens**: Replace hardcoded colors with theme tokens
5. **Minimize Dependencies**: Keep dependency count low
6. **Security First**: Address all high-severity security issues
7. **Component Contracts**: Define clear prop interfaces
8. **Test Coverage**: Aim for 80%+ code coverage

## Testing

Comprehensive test suite with 31 tests covering:

- **Manifest Validation**: Required fields, version format, license validation
- **Component Contracts**: Component detection, props validation, exports
- **Bundle Analysis**: Size limits, dependency analysis, heavy dependencies
- **AST Analysis**: Security issues, hardcoded colors, unsafe imports
- **Report Generation**: Report creation and formatting

**Run Tests:**

```bash
npm test -- src/tests/services/UIExtensionValidation.test.ts
```

## Performance Considerations

- **Manifest Validation**: ~50-100ms per manifest
- **Component Contract**: ~100-200ms per component
- **Bundle Analysis**: ~200-500ms per bundle
- **Code Analysis**: ~500-1000ms per 1000 lines of code
- **Total Validation**: ~1-3 seconds for typical extension

## Security & Compliance

- All validators run in sandboxed environment
- No external API calls during validation
- File system access restricted to input artifacts
- No shell command execution
- All results logged with timestamp and extension ID
- Audit trail of all validation operations

## Common Validation Errors

| Error | Solution |
|-------|----------|
| Missing required manifest field | Add field to manifest.json |
| Invalid version format | Use semantic versioning (X.Y.Z) |
| Bundle size exceeds limit | Remove unused dependencies or code-split |
| Hardcoded colors found | Use theme tokens instead |
| Unsafe imports detected | Remove imports from fs, child_process, etc. |
| Non-Ant Design components | Replace with Ant Design equivalents |
| No required props detected | Define component prop interface |

## Troubleshooting

**Validator doesn't find my component:**
- Ensure component is exported (export const or export default)
- Check component name matches exactly
- Verify component has proper TypeScript type annotation

**Bundle size validation fails:**
- Run `npm run build` before analysis
- Check for minification and tree-shaking
- Remove unused dependencies from package.json
- Consider code-splitting large components

**Security issues reported:**
- Replace dangerouslySetInnerHTML with sanitized content
- Avoid eval() and Function constructor
- Use trusted libraries for user input handling
- Sanitize all user-provided HTML

## Future Enhancements

**Phase 2 Runtime Validators:**
- Ant Design theme token validation
- Accessibility (a11y) checking (WCAG 2.1)
- Performance profiling and benchmarking

**Phase 3 CI/CD Integration:**
- GitHub Actions workflow
- Automated validation on pull requests
- Pre-commit hooks
- Release gating based on validation results

**Phase 4 Advanced Features:**
- Custom validation rules
- Plugins for domain-specific validation
- Visual validation report dashboard
- Performance trend tracking

## API Reference

### ManifestValidator

```typescript
class ManifestValidator {
  validateManifest(manifestJson: any): ManifestValidationResult
}
```

### ComponentContractValidator

```typescript
class ComponentContractValidator {
  validateComponentContract(
    componentCode: string,
    componentName: string
  ): ComponentContractValidationResult

  validateExports(componentCode: string): {
    isValid: boolean;
    errors: string[];
    exports: string[];
  }
}
```

### BundleAnalyzer

```typescript
class BundleAnalyzer {
  analyzeBundleSize(
    bundleContent: Buffer,
    packageJson?: any
  ): BundleAnalysisResult

  validateDependencyCompatibility(
    packageJson?: any,
    requiredExtensionVersion?: string
  ): { isValid: boolean; errors: string[]; warnings: string[] }
}

class BundleComparisonAnalyzer {
  compare(
    baseline: BundleAnalysisResult,
    current: BundleAnalysisResult
  ): {
    sizeIncrease: number;
    sizeIncreasePercent: number;
    dependencyDelta: number;
    warnings: string[];
  }
}
```

### ASTAnalyzer

```typescript
class ASTAnalyzer {
  analyzeCode(code: string): ASTAnalysisResult

  analyzeComponentProps(
    componentCode: string,
    componentName: string
  ): { isValid: boolean; errors: string[]; props: [...] }

  detectSecurityIssues(code: string): { issues: [...] }
}
```

### ValidationReportGenerator

```typescript
class ValidationReportGenerator {
  generateReport(
    extensionId: string,
    validatorResults: {...}
  ): ValidationReport

  formatReport(report: ValidationReport): string
}
```
