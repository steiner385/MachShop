/**
 * Extension Deployment Command
 *
 * Handles deployment of extensions to various environments (dev, staging, production)
 * with automated testing, validation, and rollback capabilities.
 */

import path from 'path';
import fs from 'fs-extra';
import { DeploymentService } from '../utils/deployment-service';
import { validateManifestSchema } from '../utils/manifest-validator';

export interface DeployOptions {
  manifest?: string;
  registry?: string;
  apiKey?: string;
  dryRun?: boolean;
  rollbackOnError?: boolean;
}

/**
 * Deploy extension to target environment
 */
export async function deployExtension(
  environment: string,
  options: DeployOptions = {}
): Promise<void> {
  try {
    // Validate environment
    const validEnvs = ['dev', 'staging', 'production', 'local'];
    if (!validEnvs.includes(environment)) {
      throw new Error(
        `Invalid environment: ${environment}. Must be one of: ${validEnvs.join(', ')}`
      );
    }

    // Resolve manifest path
    const manifestPath = options.manifest
      ? path.resolve(options.manifest)
      : path.resolve('extension.manifest.json');

    // Check if manifest exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    // Read and validate manifest
    console.log(`\n📋 Validating extension manifest...`);
    const manifest = fs.readJsonSync(manifestPath);
    const validation = validateManifestSchema(manifest);

    if (validation.errors.length > 0) {
      console.error(`\n❌ Manifest validation failed:`);
      validation.errors.forEach((err) => {
        console.error(`   - ${err.field}: ${err.message}`);
      });
      process.exit(1);
    }

    console.log(`✅ Manifest valid\n`);

    // Create deployment service
    const registryUrl = options.registry || process.env.EXTENSION_REGISTRY_URL || 'http://localhost:3000';
    const apiKey = options.apiKey || process.env.EXTENSION_REGISTRY_API_KEY;

    if (!apiKey && !options.dryRun) {
      throw new Error('API key required. Set EXTENSION_REGISTRY_API_KEY or use --api-key');
    }

    const service = new DeploymentService({
      registryUrl,
      apiKey: apiKey || '',
      environment,
    });

    // Show deployment plan
    console.log(`📦 Deployment Plan:`);
    console.log(`   Extension: ${manifest.name}`);
    console.log(`   Version: ${manifest.version}`);
    console.log(`   Type: ${manifest.type}`);
    console.log(`   Environment: ${environment}`);
    console.log(`   Registry: ${registryUrl}`);
    console.log(`   Dry Run: ${options.dryRun ? 'Yes' : 'No'}`);
    console.log(`   Rollback on Error: ${options.rollbackOnError ? 'Yes' : 'No'}\n`);

    if (options.dryRun) {
      console.log(`🔍 Performing dry-run deployment...\n`);
    } else {
      console.log(`🚀 Starting deployment...\n`);
    }

    // Execute deployment
    const result = await service.deploy({
      manifest,
      dryRun: options.dryRun,
      rollbackOnError: options.rollbackOnError,
      projectDir: path.dirname(manifestPath),
    });

    // Display results
    if (result.success) {
      console.log(`\n✅ Deployment ${options.dryRun ? 'preview' : ''} successful!\n`);
      console.log(`📊 Deployment Report:`);
      console.log(`   ID: ${result.deploymentId}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Duration: ${result.duration}ms`);
      console.log(`   Tests Passed: ${result.testsRun}/${result.testsPassed}`);
      if (result.warnings.length > 0) {
        console.log(`\n⚠️  Warnings:`);
        result.warnings.forEach((w) => console.log(`   - ${w}`));
      }
    } else {
      console.error(`\n❌ Deployment failed!\n`);
      console.error(`Error: ${result.error}`);
      if (result.details) {
        console.error(`Details: ${result.details}`);
      }
      process.exit(1);
    }

    console.log();
  } catch (error) {
    console.error(`\n❌ Deployment error: ${error.message}\n`);
    process.exit(1);
  }
}
