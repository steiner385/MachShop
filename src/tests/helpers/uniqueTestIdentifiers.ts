/**
 * Unique Test Identifier Generation Utilities
 *
 * Provides worker-aware unique identifiers for parallel test execution.
 * Prevents test collisions in parallel worker environments by combining:
 * - High-resolution timestamp
 * - Process ID (distinguishes parallel workers)
 * - Random component (handles same-millisecond edge cases)
 */

/**
 * Generate truly unique version for parallel test execution
 * Format: {major}.{timestamp}.{processId}.{random}
 * Example: 1.1735320600123.12345.abc123
 *
 * @param major - Major version number (default: 1)
 * @returns Unique version string safe for parallel execution
 */
export function generateUniqueVersion(major: number = 1): string {
  const timestamp = Date.now();
  const processId = process.pid;
  const random = Math.random().toString(36).substring(2, 8); // 6-char random string
  return `${major}.${timestamp}.${processId}.${random}`;
}

/**
 * Generate unique identifier for test resources
 * Format: {prefix}-{timestamp}-{processId}-{random}
 * Example: TEST-1735320600123-12345-abc123
 *
 * @param prefix - Identifier prefix (default: 'TEST')
 * @returns Unique identifier string safe for parallel execution
 */
export function generateUniqueId(prefix: string = 'TEST'): string {
  const timestamp = Date.now();
  const processId = process.pid;
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}-${timestamp}-${processId}-${random}`;
}

/**
 * Generate unique routing number for test routings
 * Format: {prefix}-{timestamp}-{processId}-{random}
 * Example: RT-1735320600123-12345-abc123
 *
 * @param prefix - Routing number prefix (default: 'RT')
 * @returns Unique routing number safe for parallel execution
 */
export function generateUniqueRoutingNumber(prefix: string = 'RT'): string {
  return generateUniqueId(prefix);
}

/**
 * Generate unique template name for test templates
 * Format: {baseName} {timestamp}-{processId}-{random}
 * Example: Test Template 1735320600123-12345-abc123
 *
 * @param baseName - Base template name (default: 'Test Template')
 * @returns Unique template name safe for parallel execution
 */
export function generateUniqueTemplateName(baseName: string = 'Test Template'): string {
  const timestamp = Date.now();
  const processId = process.pid;
  const random = Math.random().toString(36).substring(2, 8);
  return `${baseName} ${timestamp}-${processId}-${random}`;
}

/**
 * Legacy compatibility: Generate timestamp-based unique suffix
 * This maintains backward compatibility with existing test patterns
 * that use `${timestamp}-${randomSuffix}` format.
 *
 * @returns Object with timestamp and unique suffix
 */
export function generateTimestampWithSuffix(): { timestamp: number; suffix: string } {
  const timestamp = Date.now();
  const processId = process.pid;
  const random = Math.random().toString(36).substring(2, 8);
  const suffix = `${processId}-${random}`;

  return { timestamp, suffix };
}

/**
 * Create unique database test data with automatic cleanup tracking
 *
 * @param resourceType - Type of resource being created
 * @param identifier - Unique identifier for the resource
 * @returns Tracking object for cleanup
 */
export function createTestResourceTracker(resourceType: string, identifier: string) {
  return {
    type: resourceType,
    id: identifier,
    createdAt: Date.now(),
    processId: process.pid
  };
}

// Export commonly used combinations for convenience
export const TestIdentifiers = {
  uniqueVersion: generateUniqueVersion,
  uniqueId: generateUniqueId,
  routingNumber: generateUniqueRoutingNumber,
  templateName: generateUniqueTemplateName,
  timestampSuffix: generateTimestampWithSuffix,
  resourceTracker: createTestResourceTracker
} as const;

export default TestIdentifiers;