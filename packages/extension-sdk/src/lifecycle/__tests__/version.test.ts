/**
 * Version Manager Tests
 */

import { describe, it, expect } from 'vitest';
import { VersionManager } from '../version';

describe('VersionManager', () => {
  const versionManager = new VersionManager();

  describe('parseSemver', () => {
    it('should parse valid semantic version', () => {
      const semver = versionManager.parseSemver('1.2.3');
      expect(semver).toEqual({
        major: 1,
        minor: 2,
        patch: 3,
        prerelease: undefined,
        metadata: undefined,
      });
    });

    it('should parse prerelease version', () => {
      const semver = versionManager.parseSemver('1.0.0-alpha');
      expect(semver?.prerelease).toBe('alpha');
    });

    it('should parse version with metadata', () => {
      const semver = versionManager.parseSemver('1.0.0+build.123');
      expect(semver?.metadata).toBe('build.123');
    });

    it('should return null for invalid version', () => {
      expect(versionManager.parseSemver('1.0')).toBeNull();
      expect(versionManager.parseSemver('v1.0.0')).toBeNull();
    });
  });

  describe('compare', () => {
    it('should identify newer version', () => {
      const result = versionManager.compare('1.0.0', '2.0.0');
      expect(result.isNewer).toBe(false);
      expect(result.isOlder).toBe(true);
    });

    it('should identify older version', () => {
      const result = versionManager.compare('2.0.0', '1.0.0');
      expect(result.isNewer).toBe(true);
      expect(result.isOlder).toBe(false);
    });

    it('should identify same version', () => {
      const result = versionManager.compare('1.0.0', '1.0.0');
      expect(result.isSame).toBe(true);
      expect(result.isNewer).toBe(false);
      expect(result.isOlder).toBe(false);
    });

    it('should track which component changed', () => {
      const majorResult = versionManager.compare('1.0.0', '2.0.0');
      expect(majorResult.majorChanged).toBe(true);
      expect(majorResult.minorChanged).toBe(false);
      expect(majorResult.patchChanged).toBe(false);

      const minorResult = versionManager.compare('1.0.0', '1.1.0');
      expect(minorResult.majorChanged).toBe(false);
      expect(minorResult.minorChanged).toBe(true);
      expect(minorResult.patchChanged).toBe(false);

      const patchResult = versionManager.compare('1.0.0', '1.0.1');
      expect(patchResult.majorChanged).toBe(false);
      expect(patchResult.minorChanged).toBe(false);
      expect(patchResult.patchChanged).toBe(true);
    });
  });

  describe('satisfiesConstraint', () => {
    it('should validate minimum version', () => {
      const result = versionManager.satisfiesConstraint('1.5.0', {
        minVersion: '1.0.0',
      });
      expect(result).toBe(true);

      const failResult = versionManager.satisfiesConstraint('0.9.0', {
        minVersion: '1.0.0',
      });
      expect(failResult).toBe(false);
    });

    it('should validate maximum version', () => {
      const result = versionManager.satisfiesConstraint('1.5.0', {
        minVersion: '1.0.0',
        maxVersion: '2.0.0',
      });
      expect(result).toBe(true);

      const failResult = versionManager.satisfiesConstraint('2.1.0', {
        minVersion: '1.0.0',
        maxVersion: '2.0.0',
      });
      expect(failResult).toBe(false);
    });

    it('should match exact version', () => {
      const result = versionManager.satisfiesConstraint('1.0.0', {
        minVersion: '1.0.0',
        exact: '1.0.0',
      });
      expect(result).toBe(true);

      const failResult = versionManager.satisfiesConstraint('1.0.1', {
        minVersion: '1.0.0',
        exact: '1.0.0',
      });
      expect(failResult).toBe(false);
    });

    it('should exclude specific versions', () => {
      const result = versionManager.satisfiesConstraint('1.0.0', {
        minVersion: '1.0.0',
        excludeVersions: ['1.0.1', '1.0.2'],
      });
      expect(result).toBe(true);

      const failResult = versionManager.satisfiesConstraint('1.0.1', {
        minVersion: '1.0.0',
        excludeVersions: ['1.0.1', '1.0.2'],
      });
      expect(failResult).toBe(false);
    });
  });

  describe('satisfiesRange', () => {
    it('should match exact version', () => {
      expect(versionManager.satisfiesRange('1.0.0', '1.0.0')).toBe(true);
      expect(versionManager.satisfiesRange('1.0.1', '1.0.0')).toBe(false);
    });

    it('should match caret range', () => {
      expect(versionManager.satisfiesRange('1.2.3', '^1.0.0')).toBe(true);
      expect(versionManager.satisfiesRange('1.9.9', '^1.0.0')).toBe(true);
      expect(versionManager.satisfiesRange('2.0.0', '^1.0.0')).toBe(false);
    });

    it('should match tilde range', () => {
      expect(versionManager.satisfiesRange('1.2.3', '~1.2.0')).toBe(true);
      expect(versionManager.satisfiesRange('1.2.9', '~1.2.0')).toBe(true);
      expect(versionManager.satisfiesRange('1.3.0', '~1.2.0')).toBe(false);
    });

    it('should match comparison operators', () => {
      expect(versionManager.satisfiesRange('1.5.0', '>=1.0.0')).toBe(true);
      expect(versionManager.satisfiesRange('0.9.0', '>=1.0.0')).toBe(false);

      expect(versionManager.satisfiesRange('1.5.0', '>1.0.0')).toBe(true);
      expect(versionManager.satisfiesRange('1.0.0', '>1.0.0')).toBe(false);

      expect(versionManager.satisfiesRange('1.5.0', '<=2.0.0')).toBe(true);
      expect(versionManager.satisfiesRange('2.1.0', '<=2.0.0')).toBe(false);

      expect(versionManager.satisfiesRange('1.5.0', '<2.0.0')).toBe(true);
      expect(versionManager.satisfiesRange('2.0.0', '<2.0.0')).toBe(false);
    });
  });

  describe('sortVersions', () => {
    it('should sort versions in ascending order', () => {
      const versions = ['2.0.0', '1.0.0', '1.5.0', '1.0.1'];
      const sorted = versionManager.sortVersions(versions);
      expect(sorted).toEqual(['1.0.0', '1.0.1', '1.5.0', '2.0.0']);
    });

    it('should handle prerelease versions', () => {
      const versions = ['1.0.0', '1.0.0-alpha', '1.0.0-beta', '1.1.0'];
      const sorted = versionManager.sortVersions(versions);
      expect(sorted[0]).toBe('1.0.0-alpha');
      expect(sorted[sorted.length - 1]).toBe('1.1.0');
    });
  });

  describe('getLatestVersion', () => {
    it('should get latest version', () => {
      const versions = ['1.0.0', '2.0.0', '1.5.0'];
      expect(versionManager.getLatestVersion(versions)).toBe('2.0.0');
    });

    it('should return null for empty array', () => {
      expect(versionManager.getLatestVersion([])).toBeNull();
    });
  });

  describe('getLowestVersion', () => {
    it('should get lowest version', () => {
      const versions = ['2.0.0', '1.0.0', '1.5.0'];
      expect(versionManager.getLowestVersion(versions)).toBe('1.0.0');
    });

    it('should return null for empty array', () => {
      expect(versionManager.getLowestVersion([])).toBeNull();
    });
  });

  describe('incrementVersion', () => {
    it('should increment major version', () => {
      expect(versionManager.incrementVersion('1.2.3', 'major')).toBe('2.0.0');
    });

    it('should increment minor version', () => {
      expect(versionManager.incrementVersion('1.2.3', 'minor')).toBe('1.3.0');
    });

    it('should increment patch version', () => {
      expect(versionManager.incrementVersion('1.2.3', 'patch')).toBe('1.2.4');
    });

    it('should remove prerelease and metadata', () => {
      expect(versionManager.incrementVersion('1.0.0-alpha+build', 'patch')).toBe('1.0.1');
    });
  });
});
