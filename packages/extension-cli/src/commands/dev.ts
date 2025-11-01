/**
 * Local Development Server Command
 *
 * Starts a local development server for testing extensions in isolation,
 * with hot module reloading and live code updates.
 */

import path from 'path';
import fs from 'fs-extra';
import { DevServer } from '../dev-server/dev-server';
import { validateManifestSchema } from '../utils/manifest-validator';

export interface DevOptions {
  port?: string;
  manifest?: string;
  watch?: boolean;
  hot?: boolean;
}

/**
 * Start development server
 */
export async function startDevServer(options: DevOptions = {}): Promise<void> {
  try {
    // Resolve manifest path
    const manifestPath = options.manifest
      ? path.resolve(options.manifest)
      : path.resolve('extension.manifest.json');

    // Check if manifest exists
    if (!fs.existsSync(manifestPath)) {
      throw new Error(`Manifest file not found: ${manifestPath}`);
    }

    // Read and validate manifest
    console.log(`\n🔍 Validating extension manifest...`);
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

    // Create and start dev server
    const port = parseInt(options.port || '3001', 10);
    const projectDir = path.dirname(manifestPath);
    const server = new DevServer(
      {
        port,
        manifest,
        projectDir,
        watch: options.watch || false,
        hotReload: options.hot || false,
      }
    );

    console.log(`🚀 Starting development server...`);
    console.log(`   Extension: ${manifest.name} (${manifest.type})`);
    console.log(`   Port: ${port}`);
    console.log(`   Watch Mode: ${options.watch ? 'enabled' : 'disabled'}`);
    console.log(`   Hot Reload: ${options.hot ? 'enabled' : 'disabled'}`);
    console.log(`\n📖 Extension API available at http://localhost:${port}/api`);
    console.log(`🧪 Test UI available at http://localhost:${port}\n`);

    // Start server
    await server.start();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log(`\n🛑 Shutting down development server...`);
      await server.stop();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      console.log(`\n🛑 Shutting down development server...`);
      await server.stop();
      process.exit(0);
    });
  } catch (error) {
    console.error(`\n❌ Error starting dev server: ${error.message}\n`);
    process.exit(1);
  }
}
