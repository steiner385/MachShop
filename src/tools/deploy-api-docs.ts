#!/usr/bin/env tsx

/**
 * API Documentation Deployment Tool
 * Deploys interactive Swagger UI and Redoc documentation
 */

import * as fs from 'fs';
import * as path from 'path';

export class APIDocumentationDeployer {
  private docsDir: string;
  private outputDir: string;

  constructor() {
    this.docsDir = './docs/generated';
    this.outputDir = './docs/api';
  }

  async deployDocumentation(): Promise<void> {
    console.log('🚀 Deploying interactive API documentation...\n');

    // Ensure output directory exists
    await this.ensureDirectory(this.outputDir);

    // Deploy Swagger UI
    await this.deploySwaggerUI();

    // Deploy Redoc
    await this.deployRedoc();

    // Create index page
    await this.createIndexPage();

    // Copy OpenAPI specs
    await this.copyOpenAPISpecs();

    console.log('✅ API documentation deployment completed!');
    console.log('\n📚 Available Documentation:');
    console.log(`   📖 Main Portal: ${this.outputDir}/index.html`);
    console.log(`   🔧 Swagger UI: ${this.outputDir}/swagger/index.html`);
    console.log(`   📘 Redoc: ${this.outputDir}/redoc/index.html`);
    console.log('\n🌐 To serve locally:');
    console.log('   npm run docs:api:serve');
  }

  private async ensureDirectory(dir: string): Promise<void> {
    try {
      await fs.promises.mkdir(dir, { recursive: true });
    } catch (error) {
      // Directory already exists
    }
  }

  private async deploySwaggerUI(): Promise<void> {
    console.log('📋 Deploying Swagger UI...');

    const swaggerDir = path.join(this.outputDir, 'swagger');
    await this.ensureDirectory(swaggerDir);

    // Create Swagger UI HTML
    const swaggerHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MachShop API Documentation - Swagger UI</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui.css" />
    <style>
        html { box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }
        *, *:before, *:after { box-sizing: inherit; }
        body { margin:0; background: #fafafa; }
        .swagger-ui .topbar { background-color: #1976d2; }
        .swagger-ui .topbar .download-url-wrapper { display: none; }
    </style>
</head>
<body>
    <div id="swagger-ui"></div>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@4.15.5/swagger-ui-standalone-preset.js"></script>
    <script>
        window.onload = function() {
            const ui = SwaggerUIBundle({
                url: '../openapi-spec.json',
                dom_id: '#swagger-ui',
                deepLinking: true,
                presets: [
                    SwaggerUIBundle.presets.apis,
                    SwaggerUIStandalonePreset
                ],
                plugins: [
                    SwaggerUIBundle.plugins.DownloadUrl
                ],
                layout: "StandaloneLayout",
                validatorUrl: null,
                tryItOutEnabled: true,
                supportedSubmitMethods: ['get', 'post', 'put', 'delete', 'patch'],
                onComplete: function() {
                    console.log('Swagger UI loaded successfully');
                },
                docExpansion: 'list',
                tagsSorter: 'alpha',
                operationsSorter: 'alpha',
                defaultModelsExpandDepth: 1,
                defaultModelExpandDepth: 1
            });
        };
    </script>
</body>
</html>`;

    await fs.promises.writeFile(path.join(swaggerDir, 'index.html'), swaggerHTML, 'utf8');
    console.log('✅ Swagger UI deployed');
  }

  private async deployRedoc(): Promise<void> {
    console.log('📚 Deploying Redoc...');

    const redocDir = path.join(this.outputDir, 'redoc');
    await this.ensureDirectory(redocDir);

    // Create Redoc HTML with proper JavaScript initialization
    const redocHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MachShop API Documentation - Redoc</title>
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: 'Roboto', sans-serif;
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            font-family: 'Roboto', sans-serif;
            color: #666;
        }
    </style>
</head>
<body>
    <div id="redoc-container">
        <div class="loading">Loading API Documentation...</div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js"></script>
    <script>
        // Initialize Redoc with proper error handling
        document.addEventListener('DOMContentLoaded', function() {
            try {
                Redoc.init('../openapi-spec.json', {
                    scrollYOffset: 0,
                    hideDownloadButton: false,
                    hideHostname: false,
                    theme: {
                        colors: {
                            primary: {
                                main: '#1976d2'
                            },
                            success: {
                                main: '#00C853'
                            }
                        },
                        typography: {
                            fontSize: '14px',
                            lineHeight: '1.5em',
                            fontFamily: 'Roboto, sans-serif',
                            headings: {
                                fontFamily: 'Montserrat, sans-serif',
                                fontWeight: '400'
                            },
                            code: {
                                fontSize: '13px',
                                fontFamily: 'Monaco, monospace'
                            }
                        },
                        sidebar: {
                            width: '260px',
                            backgroundColor: '#fafafa'
                        },
                        rightPanel: {
                            backgroundColor: '#263238'
                        }
                    },
                    expandResponses: '200,201',
                    requiredPropsFirst: true,
                    sortPropsAlphabetically: true,
                    showExtensions: true,
                    pathInMiddlePanel: true,
                    menuToggle: true,
                    nativeScrollbars: true,
                    lazyRendering: true
                }, document.getElementById('redoc-container'));
            } catch (error) {
                console.error('Failed to initialize Redoc:', error);
                document.getElementById('redoc-container').innerHTML =
                    '<div class="loading" style="color: #f44336;">Error loading API documentation. Please check the OpenAPI specification.</div>';
            }
        });
    </script>
</body>
</html>`;

    await fs.promises.writeFile(path.join(redocDir, 'index.html'), redocHTML, 'utf8');
    console.log('✅ Redoc deployed');
  }

  private async createIndexPage(): Promise<void> {
    console.log('🏠 Creating documentation index page...');

    const indexHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MachShop API Documentation Portal</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .container {
            max-width: 800px;
            margin: 2rem;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
            color: white;
            padding: 3rem 2rem;
            text-align: center;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
            font-weight: 300;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
            margin-bottom: 1rem;
        }

        .stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
            gap: 1rem;
            margin-top: 2rem;
        }

        .stat {
            text-align: center;
            padding: 1rem;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 8px;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            display: block;
        }

        .stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }

        .content {
            padding: 3rem 2rem;
        }

        .description {
            text-align: center;
            margin-bottom: 3rem;
            color: #666;
            line-height: 1.6;
        }

        .features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }

        .feature {
            text-align: center;
            padding: 2rem;
            border: 1px solid #e0e0e0;
            border-radius: 12px;
            transition: transform 0.2s, box-shadow 0.2s;
        }

        .feature:hover {
            transform: translateY(-4px);
            box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
        }

        .feature-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }

        .feature h3 {
            color: #333;
            margin-bottom: 0.5rem;
        }

        .feature p {
            color: #666;
            line-height: 1.5;
            margin-bottom: 1.5rem;
        }

        .btn {
            display: inline-block;
            padding: 0.75rem 1.5rem;
            background: #1976d2;
            color: white;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            transition: background 0.2s;
        }

        .btn:hover {
            background: #1565c0;
        }

        .btn-secondary {
            background: #757575;
        }

        .btn-secondary:hover {
            background: #616161;
        }

        .quick-links {
            background: #f5f5f5;
            padding: 2rem;
            border-radius: 12px;
            margin-top: 2rem;
        }

        .quick-links h3 {
            margin-bottom: 1rem;
            color: #333;
        }

        .link-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
        }

        .quick-link {
            display: block;
            padding: 1rem;
            background: white;
            border-radius: 8px;
            text-decoration: none;
            color: #333;
            transition: transform 0.2s;
        }

        .quick-link:hover {
            transform: translateY(-2px);
        }

        .quick-link strong {
            color: #1976d2;
        }

        .footer {
            text-align: center;
            padding: 2rem;
            color: #666;
            border-top: 1px solid #e0e0e0;
            margin-top: 2rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🏭 MachShop API</h1>
            <p>Manufacturing Execution System API Documentation</p>
            <p>Comprehensive documentation for aerospace component manufacturing</p>

            <div class="stats">
                <div class="stat">
                    <span class="stat-number">864</span>
                    <span class="stat-label">Endpoints</span>
                </div>
                <div class="stat">
                    <span class="stat-number">62</span>
                    <span class="stat-label">Modules</span>
                </div>
                <div class="stat">
                    <span class="stat-number">14</span>
                    <span class="stat-label">Domains</span>
                </div>
                <div class="stat">
                    <span class="stat-number">57%</span>
                    <span class="stat-label">Documented</span>
                </div>
            </div>
        </div>

        <div class="content">
            <div class="description">
                <p>Explore our comprehensive API documentation built for aerospace manufacturing with full traceability,
                compliance with ISA-95 standards, and role-based access control. Choose your preferred documentation interface below.</p>
            </div>

            <div class="features">
                <div class="feature">
                    <div class="feature-icon">🔧</div>
                    <h3>Swagger UI</h3>
                    <p>Interactive API exploration with try-it-out functionality. Perfect for developers who want to test endpoints directly.</p>
                    <a href="swagger/index.html" class="btn">Open Swagger UI</a>
                </div>

                <div class="feature">
                    <div class="feature-icon">📚</div>
                    <h3>Redoc</h3>
                    <p>Beautiful, responsive documentation with excellent navigation. Ideal for comprehensive API reference.</p>
                    <a href="redoc/index.html" class="btn">Open Redoc</a>
                </div>
            </div>

            <div class="quick-links">
                <h3>📋 Quick Access</h3>
                <div class="link-grid">
                    <a href="openapi-spec.json" class="quick-link">
                        <strong>OpenAPI JSON</strong><br>
                        <small>Raw specification file</small>
                    </a>
                    <a href="openapi-spec.yaml" class="quick-link">
                        <strong>OpenAPI YAML</strong><br>
                        <small>Human-readable format</small>
                    </a>
                    <a href="../generated/api-inventory-report.md" class="quick-link">
                        <strong>API Inventory</strong><br>
                        <small>Comprehensive analysis</small>
                    </a>
                    <a href="../generated/coverage-report.md" class="quick-link">
                        <strong>Coverage Report</strong><br>
                        <small>Documentation metrics</small>
                    </a>
                </div>
            </div>

            <div class="footer">
                <p><strong>Standards Compliance:</strong> ISA-95 • AS9100 • FDA 21 CFR Part 11 • ITAR</p>
                <p>Generated: ${new Date().toLocaleString()}</p>
            </div>
        </div>
    </div>
</body>
</html>`;

    await fs.promises.writeFile(path.join(this.outputDir, 'index.html'), indexHTML, 'utf8');
    console.log('✅ Index page created');
  }

  private async copyOpenAPISpecs(): Promise<void> {
    console.log('📄 Copying OpenAPI specifications...');

    const specs = ['openapi-spec.json', 'openapi-spec.yaml'];

    for (const spec of specs) {
      const sourcePath = path.join(this.docsDir, spec);
      const destPath = path.join(this.outputDir, spec);

      try {
        await fs.promises.copyFile(sourcePath, destPath);
        console.log(`✅ Copied ${spec}`);
      } catch (error) {
        console.warn(`⚠️  Could not copy ${spec}:`, error);
      }
    }
  }
}

// Add package.json script helper
async function updatePackageJsonScripts(): Promise<void> {
  const packageJsonPath = './package.json';

  try {
    const packageJson = JSON.parse(await fs.promises.readFile(packageJsonPath, 'utf8'));

    // Add API documentation scripts
    const apiDocScripts = {
      'docs:api:extract': 'tsx src/tools/test-api-extractor.ts',
      'docs:api:analyze': 'tsx src/tools/analyze-api-patterns.ts',
      'docs:api:generate': 'tsx src/tools/openapi-generator.ts',
      'docs:api:deploy': 'tsx src/tools/deploy-api-docs.ts',
      'docs:api:serve': 'npx http-server docs/api -p 8080 -o',
      'docs:api:all': 'npm run docs:api:extract && npm run docs:api:analyze && npm run docs:api:generate && npm run docs:api:deploy',
      'docs:api:dev': 'npm run docs:api:all && npm run docs:api:serve'
    };

    // Merge new scripts
    packageJson.scripts = { ...packageJson.scripts, ...apiDocScripts };

    // Write updated package.json
    await fs.promises.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

    console.log('✅ Package.json scripts updated');
    console.log('📋 New commands available:');
    Object.keys(apiDocScripts).forEach(script => {
      console.log(`   npm run ${script}`);
    });

  } catch (error) {
    console.warn('⚠️  Could not update package.json scripts:', error);
  }
}

async function main() {
  console.log('🚀 Starting API documentation deployment...\n');

  try {
    const deployer = new APIDocumentationDeployer();
    await deployer.deployDocumentation();

    // Update package.json with new scripts
    await updatePackageJsonScripts();

    console.log('\n🎉 API documentation deployment completed successfully!');
    console.log('\n🚀 To get started:');
    console.log('   npm run docs:api:serve  # Serve documentation locally');
    console.log('   npm run docs:api:all    # Regenerate all documentation');

  } catch (error) {
    console.error('❌ Error deploying API documentation:', error);
    process.exit(1);
  }
}

// Run the deployment
main().catch(console.error);