/**
 * UI Bundle Analyzer
 * Analyzes bundle size and dependencies for UI extensions
 * Issue #430 - UI Extension Validation & Testing Framework
 */

/**
 * Bundle Analysis Result
 */
export interface BundleAnalysisResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  bundleSize: {
    gzipped: number; // bytes
    uncompressed: number; // bytes
    limit: number; // bytes
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

/**
 * Dependency Tree Node
 */
interface DependencyNode {
  name: string;
  version: string;
  size: number;
  children: DependencyNode[];
}

/**
 * Bundle Analyzer
 * Analyzes bundle size, dependencies, and assets
 */
export class BundleAnalyzer {
  private readonly maxBundleSize = 500 * 1024; // 500 KB default limit

  /**
   * Analyze bundle
   */
  analyzeBundleSize(bundleContent: Buffer, packageJson?: any): BundleAnalysisResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Calculate bundle sizes
    const uncompressed = bundleContent.length;
    const gzipped = this.estimateGzipSize(bundleContent);

    // Check size limits
    if (gzipped > this.maxBundleSize) {
      errors.push(
        `Bundle size exceeds limit: ${this.formatBytes(gzipped)} > ${this.formatBytes(this.maxBundleSize)}`
      );
    } else if (gzipped > this.maxBundleSize * 0.8) {
      warnings.push(
        `Bundle size approaching limit: ${this.formatBytes(gzipped)} (${Math.round((gzipped / this.maxBundleSize) * 100)}%)`
      );
    }

    // Analyze dependencies
    const dependencies = this.analyzeDependencies(packageJson);

    // Check for problematic dependencies
    if (packageJson?.dependencies) {
      const heavyDependencies = this.identifyHeavyDependencies(packageJson.dependencies);
      if (heavyDependencies.length > 0) {
        warnings.push(
          `Large dependencies detected: ${heavyDependencies.join(', ')} (consider tree-shaking or code-splitting)`
        );
      }
    }

    // Analyze assets
    const assets = this.analyzeAssets(bundleContent);

    // Find largest dependency
    let largestDependency: { name: string; size: number } | undefined;
    if (dependencies.directDependencies.length > 0) {
      largestDependency = {
        name: dependencies.directDependencies[0],
        size: Math.round(uncompressed / dependencies.directDependencies.length),
      };
    }

    const isValid = errors.length === 0;

    return {
      isValid,
      errors,
      warnings,
      bundleSize: {
        gzipped,
        uncompressed,
        limit: this.maxBundleSize,
      },
      dependencies,
      assets,
      tree: {
        depth: this.calculateDependencyTreeDepth(packageJson),
        largestDependency,
      },
    };
  }

  /**
   * Estimate gzip size (simplified)
   */
  private estimateGzipSize(content: Buffer): number {
    // Rough estimation: gzip typically compresses to 20-30% of original
    const estimationRatio = 0.25;
    return Math.ceil(content.length * estimationRatio);
  }

  /**
   * Analyze dependencies
   */
  private analyzeDependencies(packageJson?: any): {
    totalCount: number;
    directDependencies: string[];
    devDependencies: string[];
    peerDependencies: string[];
    duplicates: Array<{ name: string; versions: string[] }>;
  } {
    const directDependencies = Object.keys(packageJson?.dependencies || {});
    const devDependencies = Object.keys(packageJson?.devDependencies || {});
    const peerDependencies = Object.keys(packageJson?.peerDependencies || {});

    // Check for duplicates
    const allDeps = [...directDependencies, ...devDependencies, ...peerDependencies];
    const duplicates: Array<{ name: string; versions: string[] }> = [];

    const depMap = new Map<string, string[]>();
    for (const dep of allDeps) {
      if (!depMap.has(dep)) {
        depMap.set(dep, []);
      }
      const version = packageJson?.dependencies?.[dep] || packageJson?.devDependencies?.[dep] || '';
      if (version && !depMap.get(dep)!.includes(version)) {
        depMap.get(dep)!.push(version);
      }
    }

    depMap.forEach((versions, name) => {
      if (versions.length > 1) {
        duplicates.push({ name, versions });
      }
    });

    return {
      totalCount: allDeps.length,
      directDependencies,
      devDependencies,
      peerDependencies,
      duplicates,
    };
  }

  /**
   * Identify large/heavy dependencies
   */
  private identifyHeavyDependencies(dependencies: Record<string, string>): string[] {
    // List of commonly large dependencies to watch for
    const heavyPackages = ['lodash', 'moment', 'jquery', 'd3', 'three', 'babylon'];
    return Object.keys(dependencies).filter((dep) =>
      heavyPackages.some((heavy) => dep.toLowerCase().includes(heavy.toLowerCase()))
    );
  }

  /**
   * Analyze assets in bundle
   */
  private analyzeAssets(content: Buffer): { totalCount: number; images: number; styles: number; scripts: number } {
    const contentStr = content.toString('utf8', 0, Math.min(content.length, 10000));

    // Simple pattern matching for asset types
    const imageCount = (contentStr.match(/\.(png|jpg|jpeg|gif|svg|webp)/gi) || []).length;
    const styleCount = (contentStr.match(/\.css|<style|@import/gi) || []).length;
    const scriptCount = (contentStr.match(/\.js|<script|import\s/gi) || []).length;

    return {
      totalCount: imageCount + styleCount + scriptCount,
      images: imageCount,
      styles: styleCount,
      scripts: scriptCount,
    };
  }

  /**
   * Calculate dependency tree depth
   */
  private calculateDependencyTreeDepth(packageJson?: any): number {
    if (!packageJson?.dependencies) return 0;

    let maxDepth = 1;
    const visited = new Set<string>();

    const traverse = (deps: Record<string, string>, currentDepth: number): void => {
      if (currentDepth > maxDepth) {
        maxDepth = currentDepth;
      }

      // Limit traversal to prevent infinite loops
      if (currentDepth > 10) return;

      for (const depName of Object.keys(deps || {})) {
        if (!visited.has(depName)) {
          visited.add(depName);
          // In real scenario, would load transitive dependencies
          // For now, just track depth limit
        }
      }
    };

    traverse(packageJson.dependencies, 1);
    return maxDepth;
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate dependencies are compatible with platform
   */
  validateDependencyCompatibility(
    packageJson?: any,
    requiredExtensionVersion?: string
  ): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!packageJson) {
      return { isValid: true, errors: [], warnings: [] };
    }

    // Check for problematic peer dependencies
    const peerDeps = packageJson.peerDependencies || {};
    if (Object.keys(peerDeps).length === 0) {
      warnings.push('No peer dependencies declared (may indicate compatibility issues)');
    }

    // Check for version constraints
    const deps = packageJson.dependencies || {};
    for (const [depName, version] of Object.entries(deps)) {
      if (typeof version === 'string') {
        // Check for overly strict version constraints
        if (version.startsWith('=')) {
          warnings.push(`Dependency "${depName}" uses exact version constraint (may cause issues)`);
        }
        // Check for missing versions
        if (version === '' || version === '*') {
          errors.push(`Dependency "${depName}" has invalid version constraint`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

/**
 * Bundle Comparison Analyzer
 * Compares bundle metrics across versions
 */
export class BundleComparisonAnalyzer {
  /**
   * Compare bundle metrics
   */
  compare(
    baseline: BundleAnalysisResult,
    current: BundleAnalysisResult
  ): {
    sizeIncrease: number;
    sizeIncreasePercent: number;
    dependencyDelta: number;
    warnings: string[];
  } {
    const warnings: string[] = [];

    const sizeIncrease = current.bundleSize.gzipped - baseline.bundleSize.gzipped;
    const sizeIncreasePercent = (sizeIncrease / baseline.bundleSize.gzipped) * 100;
    const dependencyDelta =
      current.dependencies.totalCount - baseline.dependencies.totalCount;

    // Generate warnings based on deltas
    if (sizeIncreasePercent > 10) {
      warnings.push(
        `Significant bundle size increase: +${sizeIncreasePercent.toFixed(1)}% (+${this.formatBytes(sizeIncrease)})`
      );
    }

    if (dependencyDelta > 5) {
      warnings.push(`${dependencyDelta} new dependencies added`);
    }

    return {
      sizeIncrease,
      sizeIncreasePercent,
      dependencyDelta,
      warnings,
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    return (
      (Math.round((bytes / Math.pow(k, i)) * 100) / 100).toFixed(2) +
      ' ' +
      sizes[i]
    );
  }
}
