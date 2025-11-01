/**
 * API Version Detection Middleware
 * Detects requested API version from URL or headers and validates it against supported versions.
 * Attaches version context to request for use by version adapters.
 */

import { Request, Response, NextFunction } from 'express';
import { VersionContext, VersionedRequest } from '../types/versioning';

// Supported API versions
const SUPPORTED_VERSIONS = ['v1', 'v2'];
const DEFAULT_VERSION = 'v1';
const CURRENT_VERSION = 'v2';

/**
 * Detect API version from request URL or header
 * Priority: URL path > API-Version header > default version
 */
export const detectApiVersion = (
  req: Request & Partial<VersionedRequest>,
  res: Response,
  next: NextFunction,
): void => {
  try {
    // Extract version from URL (e.g., /api/v1/work-orders -> v1)
    const urlVersionMatch = req.path.match(/^\/api\/(v\d+)/);
    const urlVersion = urlVersionMatch ? urlVersionMatch[1] : null;

    // Extract version from header (e.g., API-Version: v2)
    const headerVersion = req.get('API-Version')?.toLowerCase();

    // Determine which version to use (with fallback)
    let requestedVersion = urlVersion || headerVersion || DEFAULT_VERSION;
    let versionSource: 'url' | 'header' | 'default' = 'default';

    if (urlVersion) {
      requestedVersion = urlVersion;
      versionSource = 'url';
    } else if (headerVersion) {
      requestedVersion = headerVersion;
      versionSource = 'header';
    }

    // Validate version is supported
    const resolvedVersion = validateVersion(requestedVersion);

    // Create version context
    const versionContext: VersionContext = {
      requestedVersion,
      resolvedVersion,
      versionSource,
      isDeprecated: isVersionDeprecated(resolvedVersion),
      sunsetDate: getVersionSunsetDate(resolvedVersion),
      supportedVersions: SUPPORTED_VERSIONS,
    };

    // Attach to request
    (req as VersionedRequest).versionContext = versionContext;
    (req as VersionedRequest).apiVersion = resolvedVersion;

    // Set response header with resolved version
    res.setHeader('X-API-Version', resolvedVersion);
    res.setHeader('X-API-Version-Semver', getVersionSemver(resolvedVersion));

    // Add deprecation headers if version is deprecated
    if (versionContext.isDeprecated && versionContext.sunsetDate) {
      res.setHeader('Deprecation', 'true');
      res.setHeader('Sunset', versionContext.sunsetDate.toUTCString());
      res.setHeader(
        'Link',
        `<https://docs.mes.com/api/changelog#${resolvedVersion}>; rel="deprecation"`,
      );

      // Add warning to response body via res.locals for use by response wrapper
      res.locals.deprecationWarning = {
        deprecated: true,
        sunsetDate: versionContext.sunsetDate.toISOString(),
        alternativeEndpoint: getAlternativeEndpoint(req.path, resolvedVersion),
        migrationGuide: `https://docs.mes.com/migrate/${resolvedVersion}-to-${CURRENT_VERSION}`,
        message: `API version ${resolvedVersion} is deprecated and will be removed on ${versionContext.sunsetDate.toDateString()}. Please migrate to ${CURRENT_VERSION}.`,
      };
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Validate that requested version is supported
 * Returns the validated version or throws 400
 */
function validateVersion(requestedVersion: string): string {
  // Normalize version (v1, V1, 1 all become v1)
  const normalized = requestedVersion.toLowerCase().startsWith('v')
    ? requestedVersion.toLowerCase()
    : `v${requestedVersion}`;

  if (!SUPPORTED_VERSIONS.includes(normalized)) {
    throw new VersionNotSupportedError(normalized, SUPPORTED_VERSIONS);
  }

  return normalized;
}

/**
 * Check if a version is deprecated
 */
function isVersionDeprecated(version: string): boolean {
  // Define deprecation timeline
  const deprecatedVersions: Record<string, { deprecatedAt: Date; sunsetDate: Date }> = {
    v1: {
      // V1 deprecated as of 2026-01-15, sunset 2027-01-15
      deprecatedAt: new Date('2026-01-15'),
      sunsetDate: new Date('2027-01-15'),
    },
  };

  if (deprecatedVersions[version]) {
    const now = new Date();
    const deprecation = deprecatedVersions[version];
    return now >= deprecation.deprecatedAt;
  }

  return false;
}

/**
 * Get sunset date for a version
 */
function getVersionSunsetDate(version: string): Date | undefined {
  const sunsetDates: Record<string, Date> = {
    v1: new Date('2027-01-15'),
  };

  return sunsetDates[version];
}

/**
 * Get semantic version number for a version identifier
 */
function getVersionSemver(version: string): string {
  const semverMap: Record<string, string> = {
    v1: '1.0.0',
    v2: '2.0.0',
  };

  return semverMap[version] || '0.0.0';
}

/**
 * Get alternative endpoint for a given path
 */
function getAlternativeEndpoint(path: string, fromVersion: string): string {
  if (fromVersion === 'v1') {
    // Replace /api/v1 with /api/v2
    return path.replace(/^\/api\/v1/, '/api/v2');
  }
  return path;
}

/**
 * Error for unsupported API version
 */
export class VersionNotSupportedError extends Error {
  constructor(
    public requestedVersion: string,
    public supportedVersions: string[],
  ) {
    super(
      `API version ${requestedVersion} is not supported. Supported versions: ${supportedVersions.join(', ')}`,
    );
    this.name = 'VersionNotSupportedError';
  }
}

/**
 * Middleware to enforce minimum API version
 * Useful for critical security updates that should not run on old versions
 */
export const requireMinimumVersion = (minimumVersion: string) => {
  return (req: Request & Partial<VersionedRequest>, res: Response, next: NextFunction): void => {
    if (!req.versionContext) {
      throw new Error('Version context not found. Ensure detectApiVersion middleware runs first.');
    }

    const minimum = parseInt(minimumVersion.replace('v', ''));
    const current = parseInt(req.versionContext.resolvedVersion.replace('v', ''));

    if (current < minimum) {
      const error = new Error(
        `This endpoint requires API version ${minimumVersion} or higher. Current: ${req.versionContext.resolvedVersion}`,
      );
      (error as any).statusCode = 400;
      throw error;
    }

    next();
  };
};

/**
 * Middleware to warn about deprecated versions
 */
export const warnDeprecatedVersion = (
  req: Request & Partial<VersionedRequest>,
  res: Response,
  next: NextFunction,
): void => {
  if (req.versionContext?.isDeprecated) {
    console.warn(`
⚠️  DEPRECATED API VERSION WARNING
Version: ${req.versionContext.resolvedVersion}
Requested by: ${req.get('Authorization') || 'Unknown'}
Sunset Date: ${req.versionContext.sunsetDate}
Path: ${req.path}

Please migrate to version ${CURRENT_VERSION} as soon as possible.
    `);
  }

  next();
};

/**
 * Export version information for health checks and diagnostics
 */
export function getVersionInfo() {
  return {
    supportedVersions: SUPPORTED_VERSIONS,
    defaultVersion: DEFAULT_VERSION,
    currentVersion: CURRENT_VERSION,
    deprecatedVersions: {
      v1: {
        status: 'DEPRECATED',
        sunsetDate: '2027-01-15',
        alternative: 'v2',
      },
    },
  };
}
