import * as crypto from 'crypto';
import * as semver from 'semver';

/**
 * PluginValidationService
 *
 * Provides comprehensive validation for plugin packages including:
 * - Manifest validation
 * - Package integrity verification
 * - Permission analysis
 * - Version compatibility checking
 * - Security scanning
 */
export class PluginValidationService {
  /**
   * Validate plugin manifest structure and content
   */
  static validateManifest(manifest: any): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    const required = ['id', 'name', 'version', 'author', 'apiVersion'];
    for (const field of required) {
      if (!manifest[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Validate id format (alphanumeric and hyphens only)
    if (manifest.id && !/^[a-z0-9-]+$/.test(manifest.id)) {
      errors.push(`Invalid id format: ${manifest.id}. Must contain only lowercase letters, numbers, and hyphens.`);
    }

    // Validate version (SemVer)
    if (manifest.version && !semver.valid(manifest.version)) {
      errors.push(`Invalid version format: ${manifest.version}. Must follow semantic versioning (MAJOR.MINOR.PATCH)`);
    }

    // Validate API version
    if (manifest.apiVersion && !semver.valid(manifest.apiVersion)) {
      errors.push(`Invalid apiVersion format: ${manifest.apiVersion}. Must follow semantic versioning`);
    }

    // Validate MES version if provided
    if (manifest.mesVersion) {
      try {
        semver.validRange(manifest.mesVersion);
      } catch (e) {
        errors.push(`Invalid mesVersion format: ${manifest.mesVersion}. Must be a valid semver range`);
      }
    }

    // Validate license
    const validLicenses = [
      'MIT', 'Apache-2.0', 'GPL-3.0', 'BSD-2-Clause', 'BSD-3-Clause',
      'ISC', 'LGPL-3.0', 'UNLICENSE', 'Proprietary'
    ];
    if (manifest.license && !validLicenses.includes(manifest.license)) {
      console.warn(`Warning: Unusual license type: ${manifest.license}`);
    }

    // Validate hooks if present
    if (manifest.hooks && Array.isArray(manifest.hooks)) {
      const validHooks = [
        'workOrder.beforeCreate',
        'workOrder.afterCreate',
        'workOrder.beforeUpdate',
        'workOrder.afterUpdate',
        'workOrder.beforeComplete',
        'workOrder.afterComplete',
        'material.beforeCreate',
        'material.afterCreate',
        'material.beforeConsume',
        'material.afterConsume',
        'workOrder.validate',
        'material.transform',
        'quality.validateMetrics',
        'external.sync',
        'erp.update',
        'pdm.sync',
        'alert.quality',
        'alert.inventory',
        'alert.production',
        'notification.send',
        'dashboard.render',
        'report.generate',
      ];

      for (const hook of manifest.hooks) {
        if (!validHooks.includes(hook)) {
          errors.push(`Unknown hook point: ${hook}`);
        }
      }
    }

    // Validate permissions if present
    if (manifest.permissions && Array.isArray(manifest.permissions)) {
      const validPermissions = [
        'work_orders:read',
        'work_orders:write',
        'work_orders:delete',
        'materials:read',
        'materials:write',
        'quality:read',
        'quality:write',
        'equipment:read',
        'equipment:write',
        'users:read',
        'users:write',
        'configuration:read',
        'configuration:write',
        'audit_logs:read',
        'reports:read',
        'reports:write',
      ];

      for (const permission of manifest.permissions) {
        if (!validPermissions.includes(permission)) {
          console.warn(`Warning: Unknown permission: ${permission}`);
        }
      }
    }

    // Validate dependencies format if present
    if (manifest.dependencies) {
      if (typeof manifest.dependencies !== 'object') {
        errors.push('dependencies must be an object');
      } else {
        for (const [depId, version] of Object.entries(manifest.dependencies)) {
          if (!/^[a-z0-9-]+$/.test(depId)) {
            errors.push(`Invalid dependency id: ${depId}. Must contain only lowercase letters, numbers, and hyphens.`);
          }
          try {
            semver.validRange(version as string);
          } catch (e) {
            errors.push(`Invalid version range for dependency ${depId}: ${version}`);
          }
        }
      }
    }

    // Validate configuration schema if present
    if (manifest.configuration) {
      if (typeof manifest.configuration !== 'object') {
        errors.push('configuration must be an object');
      } else {
        for (const [key, config] of Object.entries(manifest.configuration as any)) {
          const configObj = config as any;
          if (!configObj.type) {
            errors.push(`Configuration field "${key}" missing type`);
          }
          const validTypes = ['string', 'number', 'boolean', 'array', 'object'];
          if (configObj.type && !validTypes.includes(configObj.type)) {
            errors.push(`Invalid configuration field type for "${key}": ${configObj.type}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Verify package integrity using SHA-256 checksum
   */
  static verifyPackageIntegrity(packageData: Buffer, expectedChecksum: string): boolean {
    const hash = crypto.createHash('sha256');
    hash.update(packageData);
    const computed = hash.digest('hex');
    return computed === expectedChecksum.toLowerCase();
  }

  /**
   * Calculate SHA-256 checksum for a package
   */
  static calculateChecksum(packageData: Buffer): string {
    const hash = crypto.createHash('sha256');
    hash.update(packageData);
    return hash.digest('hex');
  }

  /**
   * Analyze plugin permissions for security concerns
   */
  static analyzePermissions(permissions: string[]): {
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
    warnings: string[];
  } {
    const warnings: string[] = [];
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW';

    const highRiskPermissions = ['users:write', 'configuration:write', 'audit_logs:read'];
    const mediumRiskPermissions = ['materials:write', 'equipment:write', 'reports:write'];

    for (const perm of permissions) {
      if (highRiskPermissions.includes(perm)) {
        warnings.push(`High-risk permission: ${perm}`);
        riskLevel = 'HIGH';
      } else if (mediumRiskPermissions.includes(perm)) {
        warnings.push(`Medium-risk permission: ${perm}`);
        if (riskLevel !== 'HIGH') {
          riskLevel = 'MEDIUM';
        }
      }
    }

    // Flag if requesting too many permissions
    if (permissions.length > 10) {
      warnings.push(`Plugin requests unusually high number of permissions (${permissions.length})`);
      if (riskLevel !== 'HIGH') {
        riskLevel = 'MEDIUM';
      }
    }

    return { riskLevel, warnings };
  }

  /**
   * Check API version compatibility
   */
  static checkApiVersionCompatibility(pluginApiVersion: string, systemApiVersion: string): {
    compatible: boolean;
    reason?: string;
  } {
    try {
      if (!semver.valid(pluginApiVersion)) {
        return { compatible: false, reason: 'Invalid plugin API version format' };
      }

      const pluginMajor = semver.major(pluginApiVersion);
      const systemMajor = semver.major(systemApiVersion);

      if (pluginMajor !== systemMajor) {
        return {
          compatible: false,
          reason: `API version mismatch: plugin requires v${pluginMajor}, system is v${systemMajor}`,
        };
      }

      return { compatible: true };
    } catch (e) {
      return { compatible: false, reason: `Error checking API version: ${(e as Error).message}` };
    }
  }

  /**
   * Check MES version compatibility
   */
  static checkMesVersionCompatibility(mesVersionRange: string, currentMesVersion: string): {
    compatible: boolean;
    reason?: string;
  } {
    try {
      if (!semver.satisfies(currentMesVersion, mesVersionRange)) {
        return {
          compatible: false,
          reason: `MES version ${currentMesVersion} does not satisfy requirement ${mesVersionRange}`,
        };
      }

      return { compatible: true };
    } catch (e) {
      return { compatible: false, reason: `Error checking MES version: ${(e as Error).message}` };
    }
  }

  /**
   * Security scan for common vulnerabilities
   * (In a real implementation, this would integrate with tools like npm audit)
   */
  static async securityScan(manifest: any): Promise<{
    safe: boolean;
    findings: Array<{ severity: 'INFO' | 'WARNING' | 'ERROR'; message: string }>;
  }> {
    const findings: Array<{ severity: 'INFO' | 'WARNING' | 'ERROR'; message: string }> = [];

    // Check for suspicious hook patterns
    if (manifest.hooks?.includes('ui.dashboardWidget')) {
      findings.push({
        severity: 'INFO',
        message: 'Plugin modifies dashboard UI - verify rendering is safe',
      });
    }

    // Check for external.sync hook (integration with external systems)
    if (manifest.hooks?.includes('external.sync')) {
      findings.push({
        severity: 'WARNING',
        message: 'Plugin integrates with external systems - verify API security',
      });
    }

    // Check dependencies for known issues
    if (manifest.dependencies) {
      const suspiciousDeps = ['eval', 'exec', 'child_process'];
      for (const dep of Object.keys(manifest.dependencies)) {
        if (suspiciousDeps.some(s => dep.includes(s))) {
          findings.push({
            severity: 'WARNING',
            message: `Dependency "${dep}" may indicate code execution capabilities`,
          });
        }
      }
    }

    return {
      safe: !findings.some(f => f.severity === 'ERROR'),
      findings,
    };
  }

  /**
   * Validate plugin package format (.mpk is tar.gz with specific structure)
   */
  static validatePackageStructure(manifest: any, files: string[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Must have entry point
    const entryPoints = ['index.js', 'index.ts', 'dist/index.js'];
    const hasEntry = files.some(f => entryPoints.some(ep => f.includes(ep)));

    if (!hasEntry) {
      errors.push('Plugin must have an entry point (index.js, index.ts, or dist/index.js)');
    }

    // Must have manifest.json
    if (!files.some(f => f.includes('manifest.json'))) {
      errors.push('Plugin package must include manifest.json');
    }

    // Should have README
    if (!files.some(f => f.includes('README'))) {
      errors.push('Plugin should include README documentation');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Comprehensive plugin validation
   */
  static async validatePlugin(
    manifest: any,
    packageData: Buffer,
    expectedChecksum: string,
    systemApiVersion: string,
    currentMesVersion: string
  ): Promise<{
    valid: boolean;
    errors: string[];
    warnings: string[];
    securityFindings: Array<{ severity: 'INFO' | 'WARNING' | 'ERROR'; message: string }>;
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 1. Validate manifest
    const manifestValidation = this.validateManifest(manifest);
    if (!manifestValidation.valid) {
      errors.push(...manifestValidation.errors);
    }

    // 2. Verify package integrity
    if (!this.verifyPackageIntegrity(packageData, expectedChecksum)) {
      errors.push('Package integrity check failed - checksum mismatch');
    }

    // 3. Check API compatibility
    const apiCompat = this.checkApiVersionCompatibility(manifest.apiVersion, systemApiVersion);
    if (!apiCompat.compatible) {
      errors.push(apiCompat.reason || 'API version incompatible');
    }

    // 4. Check MES compatibility
    if (manifest.mesVersion) {
      const mesCompat = this.checkMesVersionCompatibility(manifest.mesVersion, currentMesVersion);
      if (!mesCompat.compatible) {
        warnings.push(mesCompat.reason || 'MES version incompatible');
      }
    }

    // 5. Analyze permissions
    if (manifest.permissions) {
      const permAnalysis = this.analyzePermissions(manifest.permissions);
      if (permAnalysis.riskLevel === 'HIGH') {
        warnings.push(`High-risk permissions detected: ${permAnalysis.warnings.join(', ')}`);
      }
    }

    // 6. Security scan
    const securityScan = await this.securityScan(manifest);
    const securityFindings = securityScan.findings;

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      securityFindings,
    };
  }
}

export default PluginValidationService;
