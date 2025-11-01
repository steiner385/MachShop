/**
 * Version Management System
 *
 * Handles semantic versioning, version comparison, and compatibility checking.
 */

import type { SemanticVersion, VersionComparisonResult, VersionConstraint } from './types';

/**
 * Version Manager
 *
 * Provides semantic versioning utilities including:
 * - Version parsing and validation
 * - Version comparison
 * - Constraint checking
 * - Version range validation
 */
export class VersionManager {
  private readonly SEMVER_REGEX =
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

  /**
   * Parse a version string into semantic version components
   */
  parseSemver(version: string): SemanticVersion | null {
    const match = version.match(this.SEMVER_REGEX);

    if (!match) {
      return null;
    }

    return {
      major: parseInt(match[1], 10),
      minor: parseInt(match[2], 10),
      patch: parseInt(match[3], 10),
      prerelease: match[4],
      metadata: match[5],
    };
  }

  /**
   * Validate a version string
   */
  isValidVersion(version: string): boolean {
    return this.parseSemver(version) !== null;
  }

  /**
   * Compare two versions
   *
   * Returns:
   * - isNewer: true if version1 > version2
   * - isOlder: true if version1 < version2
   * - isSame: true if version1 == version2
   */
  compare(version1: string, version2: string): VersionComparisonResult {
    const v1 = this.parseSemver(version1);
    const v2 = this.parseSemver(version2);

    if (!v1 || !v2) {
      throw new Error(`Invalid version format: ${!v1 ? version1 : version2}`);
    }

    const majorDiff = v1.major - v2.major;
    const minorDiff = v1.minor - v2.minor;
    const patchDiff = v1.patch - v2.patch;

    let isNewer = false;
    let isOlder = false;
    let isSame = false;

    if (majorDiff !== 0) {
      isNewer = majorDiff > 0;
      isOlder = majorDiff < 0;
    } else if (minorDiff !== 0) {
      isNewer = minorDiff > 0;
      isOlder = minorDiff < 0;
    } else if (patchDiff !== 0) {
      isNewer = patchDiff > 0;
      isOlder = patchDiff < 0;
    } else if (v1.prerelease && !v2.prerelease) {
      isOlder = true;
    } else if (!v1.prerelease && v2.prerelease) {
      isNewer = true;
    } else if (v1.prerelease && v2.prerelease) {
      const preComparison = this.comparePrerelease(v1.prerelease, v2.prerelease);
      isNewer = preComparison > 0;
      isOlder = preComparison < 0;
      isSame = preComparison === 0;
    } else {
      isSame = true;
    }

    return {
      isNewer,
      isOlder,
      isSame,
      majorChanged: majorDiff !== 0,
      minorChanged: minorDiff !== 0,
      patchChanged: patchDiff !== 0,
    };
  }

  /**
   * Check if a version satisfies a constraint
   */
  satisfiesConstraint(version: string, constraint: VersionConstraint): boolean {
    const v = this.parseSemver(version);

    if (!v) {
      return false;
    }

    // Check exact match
    if (constraint.exact) {
      return version === constraint.exact;
    }

    // Check excluded versions
    if (constraint.excludeVersions?.includes(version)) {
      return false;
    }

    // Check minimum version
    const minV = this.parseSemver(constraint.minVersion);
    if (!minV) {
      return false;
    }

    const minComparison = this.compare(version, constraint.minVersion);
    if (minComparison.isOlder) {
      return false;
    }

    // Check maximum version
    if (constraint.maxVersion) {
      const maxV = this.parseSemver(constraint.maxVersion);
      if (!maxV) {
        return false;
      }

      const maxComparison = this.compare(version, constraint.maxVersion);
      if (maxComparison.isNewer) {
        return false;
      }
    }

    return true;
  }

  /**
   * Check if a version range expression is satisfied
   *
   * Supports:
   * - "1.2.3" - exact version
   * - ">=1.2.3" - greater than or equal
   * - ">1.2.3" - greater than
   * - "<=1.2.3" - less than or equal
   * - "<1.2.3" - less than
   * - "~1.2.3" - compatible with (allows patch updates)
   * - "^1.2.3" - compatible with (allows minor and patch updates)
   * - "1.2.3 - 2.0.0" - range
   */
  satisfiesRange(version: string, range: string): boolean {
    // Handle exact version
    if (!range.match(/[<>~^]/)) {
      return version === range;
    }

    // Handle caret (^) - allows minor and patch updates
    if (range.startsWith('^')) {
      const baseVersion = range.substring(1);
      const baseV = this.parseSemver(baseVersion);
      if (!baseV) return false;

      const v = this.parseSemver(version);
      if (!v) return false;

      // Must match major version and be >= base version
      if (v.major !== baseV.major) {
        return false;
      }

      return this.compare(version, baseVersion).isNewer || version === baseVersion;
    }

    // Handle tilde (~) - allows patch updates
    if (range.startsWith('~')) {
      const baseVersion = range.substring(1);
      const baseV = this.parseSemver(baseVersion);
      if (!baseV) return false;

      const v = this.parseSemver(version);
      if (!v) return false;

      // Must match major.minor and be >= base version
      if (v.major !== baseV.major || v.minor !== baseV.minor) {
        return false;
      }

      return this.compare(version, baseVersion).isNewer || version === baseVersion;
    }

    // Handle >= and >
    if (range.startsWith('>=')) {
      const baseVersion = range.substring(2);
      const comparison = this.compare(version, baseVersion);
      return comparison.isNewer || comparison.isSame;
    }

    if (range.startsWith('>')) {
      const baseVersion = range.substring(1);
      const comparison = this.compare(version, baseVersion);
      return comparison.isNewer;
    }

    // Handle <= and <
    if (range.startsWith('<=')) {
      const baseVersion = range.substring(2);
      const comparison = this.compare(version, baseVersion);
      return comparison.isOlder || comparison.isSame;
    }

    if (range.startsWith('<')) {
      const baseVersion = range.substring(1);
      const comparison = this.compare(version, baseVersion);
      return comparison.isOlder;
    }

    return false;
  }

  /**
   * Sort versions in ascending order
   */
  sortVersions(versions: string[]): string[] {
    return [...versions].sort((v1, v2) => {
      const comparison = this.compare(v1, v2);
      return comparison.isNewer ? 1 : comparison.isOlder ? -1 : 0;
    });
  }

  /**
   * Get the latest version from an array
   */
  getLatestVersion(versions: string[]): string | null {
    if (versions.length === 0) {
      return null;
    }

    const sorted = this.sortVersions(versions);
    return sorted[sorted.length - 1];
  }

  /**
   * Get the lowest version from an array
   */
  getLowestVersion(versions: string[]): string | null {
    if (versions.length === 0) {
      return null;
    }

    const sorted = this.sortVersions(versions);
    return sorted[0];
  }

  /**
   * Filter versions that satisfy a constraint
   */
  filterVersions(versions: string[], constraint: VersionConstraint): string[] {
    return versions.filter((v) => this.satisfiesConstraint(v, constraint));
  }

  /**
   * Increment a version component
   */
  incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const v = this.parseSemver(version);
    if (!v) {
      throw new Error(`Invalid version: ${version}`);
    }

    switch (type) {
      case 'major':
        v.major++;
        v.minor = 0;
        v.patch = 0;
        break;
      case 'minor':
        v.minor++;
        v.patch = 0;
        break;
      case 'patch':
        v.patch++;
        break;
    }

    v.prerelease = undefined;
    v.metadata = undefined;

    return `${v.major}.${v.minor}.${v.patch}`;
  }

  /**
   * Compare prerelease versions
   */
  private comparePrerelease(pre1: string, pre2: string): number {
    const parts1 = pre1.split('.');
    const parts2 = pre2.split('.');

    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i];
      const part2 = parts2[i];

      if (!part1) return -1;
      if (!part2) return 1;

      const num1 = parseInt(part1, 10);
      const num2 = parseInt(part2, 10);

      const isNum1 = !isNaN(num1);
      const isNum2 = !isNaN(num2);

      if (isNum1 && isNum2) {
        if (num1 !== num2) return num1 - num2;
      } else if (isNum1 || isNum2) {
        return isNum1 ? -1 : 1;
      } else if (part1 !== part2) {
        return part1.localeCompare(part2);
      }
    }

    return 0;
  }
}
