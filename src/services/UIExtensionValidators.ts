/**
 * UI Extension Validators
 * Build-time validators for UI extensions - manifest and component contract validation
 * Issue #430 - UI Extension Validation & Testing Framework
 */

/**
 * Manifest Validation Result
 */
export interface ManifestValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata?: {
    name: string;
    version: string;
    description: string;
    author: string;
    license: string;
    requiredExtensionVersion: string;
  };
}

/**
 * Component Contract Validation Result
 */
export interface ComponentContractValidationResult {
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

/**
 * Validation Report
 */
export interface ValidationReport {
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

/**
 * Manifest Validator
 * Validates extension manifest.json schema and required fields
 */
export class ManifestValidator {
  /**
   * Validate extension manifest
   */
  validateManifest(manifestJson: any): ManifestValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!manifestJson.name) {
      errors.push('Missing required field: name');
    }
    if (!manifestJson.version) {
      errors.push('Missing required field: version');
    }
    if (!manifestJson.description) {
      errors.push('Missing required field: description');
    }
    if (!manifestJson.author) {
      errors.push('Missing required field: author');
    }
    if (!manifestJson.license) {
      errors.push('Missing required field: license');
    }
    if (!manifestJson.requiredExtensionVersion) {
      errors.push('Missing required field: requiredExtensionVersion');
    }

    // Validate field formats
    if (manifestJson.name && typeof manifestJson.name !== 'string') {
      errors.push('Field "name" must be a string');
    }
    if (manifestJson.version && !this.isValidVersion(manifestJson.version)) {
      errors.push(`Invalid version format: "${manifestJson.version}" (expected semver format)`);
    }
    if (manifestJson.license && !this.isValidLicense(manifestJson.license)) {
      warnings.push(`Unknown license: "${manifestJson.license}"`);
    }

    // Validate optional fields
    if (manifestJson.keywords && !Array.isArray(manifestJson.keywords)) {
      errors.push('Field "keywords" must be an array');
    }
    if (manifestJson.homepage && !this.isValidUrl(manifestJson.homepage)) {
      errors.push(`Invalid homepage URL: "${manifestJson.homepage}"`);
    }
    if (manifestJson.repository && typeof manifestJson.repository !== 'string') {
      errors.push('Field "repository" must be a string');
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      metadata: isValid
        ? {
            name: manifestJson.name,
            version: manifestJson.version,
            description: manifestJson.description,
            author: manifestJson.author,
            license: manifestJson.license,
            requiredExtensionVersion: manifestJson.requiredExtensionVersion,
          }
        : undefined,
    };
  }

  /**
   * Check if version string is valid semver
   */
  private isValidVersion(version: string): boolean {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?(\+[a-zA-Z0-9]+)?$/;
    return semverRegex.test(version);
  }

  /**
   * Check if license is recognized
   */
  private isValidLicense(license: string): boolean {
    const validLicenses = [
      'MIT',
      'Apache-2.0',
      'GPL-3.0',
      'ISC',
      'BSD-2-Clause',
      'BSD-3-Clause',
      'LGPL-3.0',
      'MPL-2.0',
      'UNLICENSE',
      'PROPRIETARY',
    ];
    return validLicenses.includes(license);
  }

  /**
   * Check if URL is valid
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url);
      return true;
    } catch {
      return false;
    }
  }
}

/**
 * Component Contract Validator
 * Validates that component implementations match required interfaces
 */
export class ComponentContractValidator {
  /**
   * Validate component contract
   */
  validateComponentContract(componentCode: string, componentName: string): ComponentContractValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const components: Array<{
      name: string;
      isValid: boolean;
      requiredProps: string[];
      optionalProps: string[];
      returnType: string;
      errors?: string[];
    }> = [];

    // Extract component signature using regex patterns - make it more flexible
    const componentSignatureRegex = new RegExp(
      `(export\\s+)?(const|function)\\s+${componentName}\\s*(?::\\s*React\\.FC)?\\s*=?\\s*\\(([^)]*)\\)[^{]*\\{`,
      's'
    );

    const match = componentSignatureRegex.exec(componentCode);

    // If not found, try a simpler pattern
    let match2 = match;
    if (!match2) {
      const simpleRegex = new RegExp(
        `(export\\s+)?(const|function)\\s+${componentName}\\s*=?\\s*(?:\\()?\\s*\\(([^)]*)\\)`,
        's'
      );
      match2 = simpleRegex.exec(componentCode);
    }

    const finalMatch = match || match2;
    if (!finalMatch) {
      errors.push(`Component "${componentName}" not found in provided code`);
      return {
        isValid: false,
        errors,
        warnings,
      };
    }

    // Parse props
    const propsString = finalMatch[3] || '';
    const propNames = this.extractPropNames(propsString);
    const requiredProps = propNames.filter((p) => !propsString.includes(`${p}?`));
    const optionalProps = propNames.filter((p) => propsString.includes(`${p}?`));

    // Validate common prop requirements
    const commonErrors: string[] = [];
    if (requiredProps.length === 0 && optionalProps.length === 0) {
      commonErrors.push('Component has no props defined');
    }

    // Check for React best practices
    if (!componentCode.includes('React') && !componentCode.includes('jsx')) {
      warnings.push('Component does not appear to import React or use JSX');
    }

    components.push({
      name: componentName,
      isValid: commonErrors.length === 0,
      requiredProps,
      optionalProps,
      returnType: finalMatch[4] ? finalMatch[4].trim() : 'ReactNode',
      errors: commonErrors.length > 0 ? commonErrors : undefined,
    });

    const isValid = errors.length === 0 && components.every((c) => c.isValid);

    return {
      isValid,
      errors,
      warnings,
      components,
    };
  }

  /**
   * Extract prop names from props signature
   */
  private extractPropNames(propsString: string): string[] {
    if (!propsString.trim()) return [];

    // Simple regex to extract property names from TypeScript interface-like string
    const propRegex = /(\w+)\s*(\?)?:/g;
    const propNames: string[] = [];
    let match;

    while ((match = propRegex.exec(propsString)) !== null) {
      propNames.push(match[1]);
    }

    return propNames;
  }

  /**
   * Validate component exports
   */
  validateExports(componentCode: string): { isValid: boolean; errors: string[]; exports: string[] } {
    const errors: string[] = [];
    const exports: string[] = [];

    // Check for default export
    const hasDefaultExport = /export\s+default\s+/m.test(componentCode);

    // Extract named exports
    const namedExportRegex = /export\s+(?:const|function|class)\s+(\w+)/g;
    let match;
    while ((match = namedExportRegex.exec(componentCode)) !== null) {
      exports.push(match[1]);
    }

    if (!hasDefaultExport && exports.length === 0) {
      errors.push('Component must have either a default export or named exports');
    }

    return {
      isValid: errors.length === 0,
      errors,
      exports,
    };
  }
}

/**
 * Validation Report Generator
 * Generates comprehensive validation reports
 */
export class ValidationReportGenerator {
  /**
   * Generate validation report
   */
  generateReport(
    extensionId: string,
    validatorResults: {
      manifest: ManifestValidationResult;
      componentContract: ComponentContractValidationResult;
    }
  ): ValidationReport {
    const totalErrors =
      validatorResults.manifest.errors.length + validatorResults.componentContract.errors.length;
    const totalWarnings =
      validatorResults.manifest.warnings.length + validatorResults.componentContract.warnings.length;

    const overallValid =
      validatorResults.manifest.isValid && validatorResults.componentContract.isValid;

    return {
      extensionId,
      timestamp: new Date(),
      overallValid,
      validatorResults: {
        manifest: validatorResults.manifest,
        componentContract: validatorResults.componentContract,
      },
      totalErrors,
      totalWarnings,
    };
  }

  /**
   * Format report for display
   */
  formatReport(report: ValidationReport): string {
    let output = `\nUI Extension Validation Report\n`;
    output += `================================\n`;
    output += `Extension: ${report.extensionId}\n`;
    output += `Timestamp: ${report.timestamp.toISOString()}\n`;
    output += `Status: ${report.overallValid ? '✓ VALID' : '✗ INVALID'}\n`;
    output += `\nErrors: ${report.totalErrors}\n`;
    output += `Warnings: ${report.totalWarnings}\n`;

    if (report.validatorResults.manifest.errors.length > 0) {
      output += `\nManifest Errors:\n`;
      report.validatorResults.manifest.errors.forEach((err) => {
        output += `  - ${err}\n`;
      });
    }

    if (report.validatorResults.componentContract.errors.length > 0) {
      output += `\nComponent Contract Errors:\n`;
      report.validatorResults.componentContract.errors.forEach((err) => {
        output += `  - ${err}\n`;
      });
    }

    return output;
  }
}
