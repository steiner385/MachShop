/**
 * MachShop Extension CLI
 *
 * Main export for CLI package
 */

export { generateExtension } from './commands/generate';
export { validateManifest } from './commands/validate';
export { startDevServer } from './commands/dev';
export { deployExtension } from './commands/deploy';
export { testExtension } from './commands/test';

export { validateManifestSchema, validateManifestFile } from './utils/manifest-validator';
export type { ValidationResult, ValidationError, ValidationWarning } from './utils/manifest-validator';

export { DeploymentService } from './utils/deployment-service';
export type { DeploymentResult, DeploymentConfig, DeploymentRequest } from './utils/deployment-service';

export { TestRunner } from './utils/test-runner';
export type { TestResult, TestConfig } from './utils/test-runner';

export { DevServer } from './dev-server/dev-server';
export type { DevServerConfig } from './dev-server/dev-server';

// Re-export CLI for direct use
import cli from './cli';
export default cli;
