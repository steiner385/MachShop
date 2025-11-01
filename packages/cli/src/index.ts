/**
 * MES SDK CLI Package - Phase 1 Foundation
 * Core CLI tooling for plugin development, testing, and debugging
 *
 * Phase 1 Scope:
 * - Plugin scaffolding with templates
 * - Local development server setup
 * - Mock MES API server
 * - Unit and integration testing framework
 * - Debugging utilities and logging
 * - CI/CD integration
 *
 * Future Phases:
 * - ESLint plugin with best practices
 * - Documentation auto-generation
 * - Advanced performance testing
 * - Webhook tunnel for local testing
 * - Plugin registry integration
 */

export { PluginScaffolder } from './commands/create';
export { DevServer } from './dev-server/server';
export { MockMESServer } from './testing/unit/mock-server';
export { createHookContext, testHook } from './testing/unit/test-utils';
export { MESTestClient } from './testing/integration/test-client';
export type { PluginManifest, HookContext, TestOptions } from './types';
