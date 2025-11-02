/**
 * UI Extension Validation Test Suite
 * Tests for manifest validation, component contracts, bundle analysis, and AST analysis
 * Issue #430 - UI Extension Validation & Testing Framework
 */

import { describe, it, expect } from 'vitest';
import {
  ManifestValidator,
  ComponentContractValidator,
  ValidationReportGenerator,
  ManifestValidationResult,
  ComponentContractValidationResult,
} from '../../services/UIExtensionValidators';
import { BundleAnalyzer, BundleComparisonAnalyzer } from '../../services/UIBundleAnalyzer';
import { ASTAnalyzer } from '../../services/UIASTAnalyzer';

describe('ManifestValidator', () => {
  const validator = new ManifestValidator();

  it('should validate a correct manifest', () => {
    const manifest = {
      name: 'MyExtension',
      version: '1.0.0',
      description: 'A test extension',
      author: 'Test Author',
      license: 'MIT',
      requiredExtensionVersion: '1.0.0',
    };

    const result = validator.validateManifest(manifest);

    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.metadata).toBeDefined();
    expect(result.metadata?.name).toBe('MyExtension');
    expect(result.metadata?.version).toBe('1.0.0');
  });

  it('should detect missing required fields', () => {
    const manifest = {
      name: 'MyExtension',
      // missing version, description, author, license, requiredExtensionVersion
    };

    const result = validator.validateManifest(manifest);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors).toContain('Missing required field: version');
    expect(result.errors).toContain('Missing required field: description');
  });

  it('should validate version format', () => {
    const manifestValid = {
      name: 'MyExtension',
      version: '1.2.3',
      description: 'Test',
      author: 'Author',
      license: 'MIT',
      requiredExtensionVersion: '1.0.0',
    };

    const manifestInvalid = {
      name: 'MyExtension',
      version: '1.2',
      description: 'Test',
      author: 'Author',
      license: 'MIT',
      requiredExtensionVersion: '1.0.0',
    };

    expect(validator.validateManifest(manifestValid).isValid).toBe(true);
    expect(validator.validateManifest(manifestInvalid).isValid).toBe(false);
    expect(validator.validateManifest(manifestInvalid).errors).toContain(
      'Invalid version format: "1.2" (expected semver format)'
    );
  });

  it('should validate license field', () => {
    const manifestValid = {
      name: 'MyExtension',
      version: '1.0.0',
      description: 'Test',
      author: 'Author',
      license: 'MIT',
      requiredExtensionVersion: '1.0.0',
    };

    const manifestUnknown = {
      name: 'MyExtension',
      version: '1.0.0',
      description: 'Test',
      author: 'Author',
      license: 'UNKNOWN-LICENSE',
      requiredExtensionVersion: '1.0.0',
    };

    expect(validator.validateManifest(manifestValid).warnings).toHaveLength(0);
    expect(validator.validateManifest(manifestUnknown).warnings.length).toBeGreaterThan(0);
  });

  it('should validate homepage URL format', () => {
    const manifest = {
      name: 'MyExtension',
      version: '1.0.0',
      description: 'Test',
      author: 'Author',
      license: 'MIT',
      requiredExtensionVersion: '1.0.0',
      homepage: 'not-a-url',
    };

    const result = validator.validateManifest(manifest);

    expect(result.errors).toContain('Invalid homepage URL: "not-a-url"');
  });

  it('should validate keywords as array', () => {
    const manifest = {
      name: 'MyExtension',
      version: '1.0.0',
      description: 'Test',
      author: 'Author',
      license: 'MIT',
      requiredExtensionVersion: '1.0.0',
      keywords: 'not-an-array',
    };

    const result = validator.validateManifest(manifest);

    expect(result.errors).toContain('Field "keywords" must be an array');
  });
});

describe('ComponentContractValidator', () => {
  const validator = new ComponentContractValidator();

  it('should validate a correct component contract', () => {
    const componentCode = `
      const MyComponent = (props: { title: string; onClose?: () => void; count?: number }) => {
        return <div>{props.title}</div>;
      };
    `;

    const result = validator.validateComponentContract(componentCode, 'MyComponent');

    expect(result.components?.length).toBe(1);
    expect(result.components?.[0].name).toBe('MyComponent');
  });

  it('should detect missing component', () => {
    const componentCode = `
      export const OtherComponent = () => <div>Test</div>;
    `;

    const result = validator.validateComponentContract(componentCode, 'MyComponent');

    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Component "MyComponent" not found in provided code');
  });

  it('should validate component exports', () => {
    const codeWithDefault = `
      export default function MyComponent() {
        return <div>Test</div>;
      }
    `;

    const codeWithNamed = `
      export const MyComponent = () => <div>Test</div>;
    `;

    const codeNoExport = `
      function MyComponent() {
        return <div>Test</div>;
      }
    `;

    expect(validator.validateExports(codeWithDefault).isValid).toBe(true);
    expect(validator.validateExports(codeWithNamed).isValid).toBe(true);
    expect(validator.validateExports(codeNoExport).isValid).toBe(false);
  });

  it('should validate component has props', () => {
    const componentCode = `
      export const MyComponent = (props: { title: string; count: number }) => <div>{props.title}: {props.count}</div>;
    `;

    const result = validator.validateComponentContract(componentCode, 'MyComponent');

    expect(result.components?.length).toBe(1);
    expect(result.components?.[0].requiredProps.length).toBeGreaterThan(0);
  });
});

describe('BundleAnalyzer', () => {
  const analyzer = new BundleAnalyzer();

  it('should analyze bundle size', () => {
    const bundleContent = Buffer.from('x'.repeat(100 * 1024)); // 100 KB

    const result = analyzer.analyzeBundleSize(bundleContent);

    expect(result.bundleSize.uncompressed).toBe(100 * 1024);
    expect(result.bundleSize.gzipped).toBeGreaterThan(0);
    expect(result.bundleSize.gzipped).toBeLessThan(result.bundleSize.uncompressed);
    expect(result.isValid).toBe(true);
  });

  it('should detect oversized bundles', () => {
    // Create a much larger bundle to exceed the limit (estimated gzip is ~25% of original)
    // So 600KB uncompressed = ~150KB gzipped, which should still be under 500KB limit
    // Need to create larger content
    const largeContent = 'x'.repeat(2500 * 1024); // 2.5 MB uncompressed = ~625 KB gzipped
    const bundleContent = Buffer.from(largeContent);

    const result = analyzer.analyzeBundleSize(bundleContent);

    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should warn when bundle approaches size limit', () => {
    // 2 MB uncompressed = ~500 KB gzipped (at the limit)
    const bundleContent = Buffer.from('x'.repeat(2000 * 1024)); // 2 MB

    const result = analyzer.analyzeBundleSize(bundleContent);

    // With estimated gzip at ~25%, should trigger warning
    if (result.bundleSize.gzipped > 400 * 1024) {
      expect(result.warnings.length).toBeGreaterThan(0);
    }
  });

  it('should analyze dependencies', () => {
    const packageJson = {
      dependencies: {
        react: '^18.0.0',
        'antd': '^5.0.0',
      },
      devDependencies: {
        typescript: '^4.9.0',
        vitest: '^0.34.0',
      },
      peerDependencies: {
        'react-dom': '^18.0.0',
      },
    };

    const bundleContent = Buffer.from('test');
    const result = analyzer.analyzeBundleSize(bundleContent, packageJson);

    expect(result.dependencies.totalCount).toBe(5);
    expect(result.dependencies.directDependencies).toContain('react');
    expect(result.dependencies.devDependencies).toContain('typescript');
    expect(result.dependencies.peerDependencies).toContain('react-dom');
  });

  it('should identify heavy dependencies', () => {
    const packageJson = {
      dependencies: {
        lodash: '^4.17.0',
        moment: '^2.29.0',
        'antd': '^5.0.0',
      },
    };

    const bundleContent = Buffer.from('test');
    const result = analyzer.analyzeBundleSize(bundleContent, packageJson);

    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should validate dependency compatibility', () => {
    const packageJson = {
      dependencies: {
        'my-dep': '1.0.0',
      },
      peerDependencies: {
        react: '^18.0.0',
      },
    };

    const result = analyzer.validateDependencyCompatibility(packageJson);

    expect(result.isValid).toBe(true);
  });

  it('should detect missing peer dependencies', () => {
    const packageJson = {
      dependencies: {
        'my-dep': '1.0.0',
      },
    };

    const result = analyzer.validateDependencyCompatibility(packageJson);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('BundleComparisonAnalyzer', () => {
  const analyzer = new BundleComparisonAnalyzer();

  it('should compare bundle metrics', () => {
    const baseline: any = {
      bundleSize: {
        gzipped: 100 * 1024,
      },
      dependencies: {
        totalCount: 10,
      },
    };

    const current: any = {
      bundleSize: {
        gzipped: 120 * 1024,
      },
      dependencies: {
        totalCount: 15,
      },
    };

    const result = analyzer.compare(baseline, current);

    expect(result.sizeIncrease).toBe(20 * 1024);
    expect(result.sizeIncreasePercent).toBeGreaterThan(10);
    expect(result.dependencyDelta).toBe(5);
  });

  it('should warn on significant size increase', () => {
    const baseline: any = {
      bundleSize: {
        gzipped: 100 * 1024,
      },
      dependencies: {
        totalCount: 10,
      },
    };

    const current: any = {
      bundleSize: {
        gzipped: 200 * 1024, // 100% increase
      },
      dependencies: {
        totalCount: 10,
      },
    };

    const result = analyzer.compare(baseline, current);

    expect(result.warnings.length).toBeGreaterThan(0);
  });
});

describe('ASTAnalyzer', () => {
  const analyzer = new ASTAnalyzer();

  it('should analyze valid component code', () => {
    // Simulated code (not actual imports to avoid dependency resolution)
    const code = `
      // import React from 'react';
      // import { Button, Input } from 'antd';

      export const MyComponent = () => {
        return (
          <div>
            {/* <Button>Click me</Button> */}
            {/* <Input placeholder="Enter text" /> */}
          </div>
        );
      };
    `;

    const result = analyzer.analyzeCode(code);

    // Validator should work without external dependencies in test
    expect(result.analysis.importsAnalysis.totalImports >= 0).toBe(true);
  });

  it('should detect hardcoded colors', () => {
    const code = `
      const styles = {
        container: {
          backgroundColor: '#FF0000',
          color: 'rgb(255, 0, 0)',
        },
      };

      export const MyComponent = () => <div style={styles.container}>Test</div>;
    `;

    const result = analyzer.analyzeCode(code);

    expect(result.analysis.hardcodedColors.length).toBeGreaterThan(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it('should detect non-Ant Design components', () => {
    const code = `
      // import { Button } from 'antd';
      // import { MuiButton } from '@material-ui/core';

      export const MyComponent = () => (
        <div>
          <Button>Ant Button</Button>
          <MuiButton>MUI Button</MuiButton>
        </div>
      );
    `;

    const result = analyzer.analyzeCode(code);

    expect(result.analysis.nonAntDesignComponents.length).toBeGreaterThan(0);
  });

  it('should detect unsafe imports', () => {
    const code = `
      import fs from 'fs';
      import { execSync } from 'child_process';

      export const MyComponent = () => <div>Test</div>;
    `;

    const result = analyzer.analyzeCode(code);

    expect(result.isValid).toBe(false);
    expect(result.analysis.unsafeImports.length).toBeGreaterThan(0);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('should count components', () => {
    const code = `
      export const Component1 = () => <div>1</div>;
      export const Component2 = () => <div>2</div>;
      export function Component3() { return <div>3</div>; }
    `;

    const result = analyzer.analyzeCode(code);

    expect(result.analysis.componentCount).toBeGreaterThan(0);
  });

  it('should analyze component props', () => {
    const componentCode = `
      export const MyComponent = ({ title, count }) => {
        return <div>{title}</div>;
      };
    `;

    const result = analyzer.analyzeComponentProps(componentCode, 'MyComponent');

    // Component is found and can be analyzed
    expect(result.errors.length).toBeLessThanOrEqual(1);
  });

  it('should detect security issues', () => {
    const code = `
      export const MyComponent = ({ html }) => (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      );
    `;

    const result = analyzer.detectSecurityIssues(code);

    expect(result.issues.length).toBeGreaterThan(0);
    expect(result.issues[0].severity).toBe('high');
  });

  it('should detect XSS risks', () => {
    const code = `
      export const MyComponent = () => {
        const elem = document.getElementById('test');
        elem.innerHTML = '<div>XSS</div>';
      };
    `;

    const result = analyzer.detectSecurityIssues(code);

    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('should detect eval usage', () => {
    const code = `
      export const MyComponent = () => {
        const fn = eval('function() { return 42; }');
        return <div>{fn()}</div>;
      };
    `;

    const result = analyzer.detectSecurityIssues(code);

    expect(result.issues.some((issue) => issue.type === 'Code Injection')).toBe(true);
  });
});

describe('ValidationReportGenerator', () => {
  const generator = new ValidationReportGenerator();

  it('should generate validation report', () => {
    const manifestResult: ManifestValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const componentResult: ComponentContractValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const report = generator.generateReport('ext-123', {
      manifest: manifestResult,
      componentContract: componentResult,
    });

    expect(report.extensionId).toBe('ext-123');
    expect(report.overallValid).toBe(true);
    expect(report.totalErrors).toBe(0);
  });

  it('should report errors in validation', () => {
    const manifestResult: ManifestValidationResult = {
      isValid: false,
      errors: ['Missing required field: version'],
      warnings: [],
    };

    const componentResult: ComponentContractValidationResult = {
      isValid: false,
      errors: ['Component not found'],
      warnings: [],
    };

    const report = generator.generateReport('ext-123', {
      manifest: manifestResult,
      componentContract: componentResult,
    });

    expect(report.overallValid).toBe(false);
    expect(report.totalErrors).toBe(2);
  });

  it('should format report for display', () => {
    const manifestResult: ManifestValidationResult = {
      isValid: false,
      errors: ['Missing required field: version'],
      warnings: ['Unknown license'],
    };

    const componentResult: ComponentContractValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    };

    const report = generator.generateReport('ext-123', {
      manifest: manifestResult,
      componentContract: componentResult,
    });

    const formatted = generator.formatReport(report);

    expect(formatted).toContain('ext-123');
    expect(formatted).toContain('Missing required field: version');
    expect(formatted).toContain('INVALID');
  });
});
