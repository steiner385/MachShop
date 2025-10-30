#!/usr/bin/env tsx

/**
 * API Documentation Verification Tool
 * Verifies that Swagger UI and Redoc documentation are working correctly
 */

import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

export class DocumentationVerifier {
  private docsPath: string;
  private testPort: number;

  constructor() {
    this.docsPath = './docs/api';
    this.testPort = 8888; // Use different port to avoid conflicts
  }

  async verifyDocumentation(): Promise<void> {
    console.log('🔍 Verifying API documentation setup...\n');

    // Check file structure
    await this.verifyFileStructure();

    // Validate OpenAPI specification
    await this.validateOpenAPISpec();

    // Test HTTP serving
    await this.testHTTPServing();

    console.log('\n✅ API documentation verification completed successfully!');
    console.log('\n🚀 To start serving your documentation:');
    console.log('   npm run docs:api:serve');
    console.log('\n📖 Documentation URLs:');
    console.log('   • Main Portal: http://localhost:8080/');
    console.log('   • Swagger UI: http://localhost:8080/swagger/');
    console.log('   • Redoc: http://localhost:8080/redoc/');
  }

  private async verifyFileStructure(): Promise<void> {
    console.log('📁 Checking file structure...');

    const requiredFiles = [
      'index.html',
      'openapi-spec.json',
      'openapi-spec.yaml',
      'swagger/index.html',
      'redoc/index.html'
    ];

    const missingFiles: string[] = [];

    for (const file of requiredFiles) {
      const filePath = path.join(this.docsPath, file);
      try {
        await fs.promises.access(filePath);
        console.log(`   ✅ ${file}`);
      } catch (error) {
        console.log(`   ❌ ${file} (missing)`);
        missingFiles.push(file);
      }
    }

    if (missingFiles.length > 0) {
      throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
    }

    console.log('✅ All required files present\n');
  }

  private async validateOpenAPISpec(): Promise<void> {
    console.log('🔧 Validating OpenAPI specification...');

    const specPath = path.join(this.docsPath, 'openapi-spec.json');

    try {
      const specContent = await fs.promises.readFile(specPath, 'utf8');
      const spec = JSON.parse(specContent);

      // Validate required OpenAPI fields
      const requiredFields = ['openapi', 'info', 'paths', 'components'];
      const missingFields = requiredFields.filter(field => !spec[field]);

      if (missingFields.length > 0) {
        throw new Error(`Missing required OpenAPI fields: ${missingFields.join(', ')}`);
      }

      // Check version
      if (!spec.openapi.startsWith('3.0')) {
        throw new Error(`Invalid OpenAPI version: ${spec.openapi}. Expected 3.0.x`);
      }

      // Check paths
      const pathCount = Object.keys(spec.paths).length;
      if (pathCount === 0) {
        throw new Error('No API paths found in specification');
      }

      // Check security schemes
      const securitySchemes = spec.components?.securitySchemes || {};
      if (!securitySchemes.BearerAuth) {
        console.log('   ⚠️  BearerAuth security scheme not found');
      }

      console.log(`   ✅ OpenAPI ${spec.openapi} specification`);
      console.log(`   ✅ ${pathCount} API paths documented`);
      console.log(`   ✅ ${Object.keys(securitySchemes).length} security schemes`);
      console.log(`   ✅ API title: ${spec.info.title}`);

    } catch (error) {
      throw new Error(`OpenAPI validation failed: ${error}`);
    }

    console.log('✅ OpenAPI specification is valid\n');
  }

  private async testHTTPServing(): Promise<void> {
    console.log('🌐 Testing HTTP serving...');

    return new Promise((resolve, reject) => {
      // Start HTTP server
      const server = spawn('python3', ['-m', 'http.server', this.testPort.toString()], {
        cwd: this.docsPath,
        stdio: 'pipe'
      });

      // Give server time to start
      setTimeout(async () => {
        try {
          // Test endpoints
          await this.testEndpoint('/', 'Main documentation portal');
          await this.testEndpoint('/swagger/', 'Swagger UI');
          await this.testEndpoint('/redoc/', 'Redoc documentation');
          await this.testEndpoint('/openapi-spec.json', 'OpenAPI specification');

          // Test OpenAPI spec content
          await this.testOpenAPIContent();

          console.log('✅ HTTP serving works correctly\n');

          // Clean up
          server.kill();
          resolve();

        } catch (error) {
          server.kill();
          reject(error);
        }
      }, 2000);

      // Handle server errors
      server.on('error', (error) => {
        reject(new Error(`Failed to start HTTP server: ${error}`));
      });
    });
  }

  private async testEndpoint(path: string, description: string): Promise<void> {
    const url = `http://localhost:${this.testPort}${path}`;

    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`   ✅ ${description} (${response.status})`);

    } catch (error) {
      throw new Error(`${description} failed: ${error}`);
    }
  }

  private async testOpenAPIContent(): Promise<void> {
    const url = `http://localhost:${this.testPort}/openapi-spec.json`;

    try {
      const response = await fetch(url);
      const spec = await response.json();

      const pathCount = Object.keys(spec.paths).length;
      const title = spec.info?.title || 'Unknown';

      console.log(`   ✅ OpenAPI content loads: ${pathCount} paths, "${title}"`);

      // Test if Swagger UI can access the spec
      await this.testSwaggerUIReference();

    } catch (error) {
      throw new Error(`OpenAPI content test failed: ${error}`);
    }
  }

  private async testSwaggerUIReference(): Promise<void> {
    const url = `http://localhost:${this.testPort}/swagger/`;

    try {
      const response = await fetch(url);
      const html = await response.text();

      // Check if Swagger UI HTML references the OpenAPI spec correctly
      if (!html.includes('../openapi-spec.json')) {
        throw new Error('Swagger UI does not reference OpenAPI spec correctly');
      }

      // Check if Swagger UI dependencies are loaded
      if (!html.includes('swagger-ui-bundle.js')) {
        throw new Error('Swagger UI dependencies not found');
      }

      console.log(`   ✅ Swagger UI references OpenAPI spec correctly`);

    } catch (error) {
      throw new Error(`Swagger UI reference test failed: ${error}`);
    }
  }
}

// Health check function for CI/CD
export async function healthCheck(): Promise<boolean> {
  try {
    const verifier = new DocumentationVerifier();
    await verifier.verifyDocumentation();
    return true;
  } catch (error) {
    console.error('❌ Documentation health check failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting API documentation verification...\n');

  try {
    const verifier = new DocumentationVerifier();
    await verifier.verifyDocumentation();

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Verification failed:', error);
    console.error('\n💡 To fix issues:');
    console.error('   1. Run: npm run docs:api:all');
    console.error('   2. Ensure all documentation files are generated');
    console.error('   3. Check OpenAPI specification validity');
    process.exit(1);
  }
}

// Run verification if called directly
if (require.main === module) {
  main().catch(console.error);
}