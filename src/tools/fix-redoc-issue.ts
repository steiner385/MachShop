#!/usr/bin/env tsx

/**
 * Redoc Configuration Fix Tool
 * Fixes the "process is not defined" error by ensuring proper Redoc initialization
 */

import * as fs from 'fs';
import * as path from 'path';

export class RedocConfigurationFixer {
  private redocPath: string;

  constructor() {
    this.redocPath = './docs/api/redoc/index.html';
  }

  async fixRedocConfiguration(): Promise<void> {
    console.log('🔧 Fixing Redoc configuration...\n');

    // Check if the file exists
    if (!await this.fileExists(this.redocPath)) {
      throw new Error(`Redoc file not found: ${this.redocPath}`);
    }

    // Read the current file
    const currentContent = await fs.promises.readFile(this.redocPath, 'utf8');

    // Check if it already has the correct configuration
    if (this.hasCorrectConfiguration(currentContent)) {
      console.log('✅ Redoc configuration is already correct');
      return;
    }

    // Generate the correct Redoc HTML
    const fixedContent = this.generateCorrectRedocHTML();

    // Write the fixed content
    await fs.promises.writeFile(this.redocPath, fixedContent, 'utf8');

    console.log('✅ Redoc configuration fixed successfully');
    console.log('🔍 Fixed issues:');
    console.log('   • Moved theme configuration to JavaScript');
    console.log('   • Added proper error handling');
    console.log('   • Implemented DOM ready listener');
    console.log('   • Added loading indicator');
  }

  private async fileExists(filePath: string): Promise<boolean> {
    try {
      await fs.promises.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  private hasCorrectConfiguration(content: string): boolean {
    // Check for the new JavaScript initialization pattern
    return content.includes('Redoc.init(') &&
           content.includes('DOMContentLoaded') &&
           content.includes('redoc-container') &&
           !content.includes('<redoc ');
  }

  private generateCorrectRedocHTML(): string {
    return `<!DOCTYPE html>
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
        .error {
            color: #f44336;
            padding: 20px;
            text-align: center;
            font-family: 'Roboto', sans-serif;
        }
    </style>
</head>
<body>
    <div id="redoc-container">
        <div class="loading">Loading API Documentation...</div>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/redoc@2.1.3/bundles/redoc.standalone.js"></script>
    <script>
        // Initialize Redoc with proper error handling and browser compatibility
        document.addEventListener('DOMContentLoaded', function() {
            try {
                // Ensure Redoc is available
                if (typeof Redoc === 'undefined') {
                    throw new Error('Redoc library failed to load');
                }

                // Initialize with comprehensive configuration
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
                            },
                            warning: {
                                main: '#FF9800'
                            },
                            error: {
                                main: '#f44336'
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
                                fontFamily: 'Monaco, Consolas, monospace'
                            }
                        },
                        sidebar: {
                            width: '260px',
                            backgroundColor: '#fafafa'
                        },
                        rightPanel: {
                            backgroundColor: '#263238'
                        },
                        fab: {
                            backgroundColor: '#1976d2'
                        }
                    },
                    expandResponses: '200,201',
                    requiredPropsFirst: true,
                    sortPropsAlphabetically: true,
                    showExtensions: true,
                    pathInMiddlePanel: true,
                    menuToggle: true,
                    nativeScrollbars: true,
                    lazyRendering: true,
                    disableSearch: false,
                    onlyRequiredInSamples: false
                }, document.getElementById('redoc-container'));

                console.log('✅ Redoc initialized successfully');

            } catch (error) {
                console.error('❌ Failed to initialize Redoc:', error);

                const container = document.getElementById('redoc-container');
                if (container) {
                    container.innerHTML =
                        '<div class="error">' +
                        '<h2>Error Loading API Documentation</h2>' +
                        '<p>Failed to initialize Redoc. Please check:</p>' +
                        '<ul style="text-align: left; display: inline-block;">' +
                        '<li>OpenAPI specification is valid</li>' +
                        '<li>Internet connection for CDN resources</li>' +
                        '<li>Browser console for detailed errors</li>' +
                        '</ul>' +
                        '<p><strong>Error:</strong> ' + error.message + '</p>' +
                        '</div>';
                }
            }
        });

        // Additional error handling for network issues
        window.addEventListener('error', function(e) {
            if (e.target && e.target.src && e.target.src.includes('redoc')) {
                console.error('❌ Failed to load Redoc from CDN:', e.target.src);
                const container = document.getElementById('redoc-container');
                if (container && container.innerHTML.includes('Loading')) {
                    container.innerHTML =
                        '<div class="error">' +
                        '<h2>Network Error</h2>' +
                        '<p>Failed to load Redoc from CDN. Please check your internet connection.</p>' +
                        '</div>';
                }
            }
        });
    </script>
</body>
</html>`;
  }

  async validateConfiguration(): Promise<boolean> {
    try {
      if (!await this.fileExists(this.redocPath)) {
        console.log('❌ Redoc file does not exist');
        return false;
      }

      const content = await fs.promises.readFile(this.redocPath, 'utf8');

      const checks = [
        { name: 'JavaScript initialization', test: () => content.includes('Redoc.init(') },
        { name: 'DOM ready listener', test: () => content.includes('DOMContentLoaded') },
        { name: 'Container element', test: () => content.includes('redoc-container') },
        { name: 'Error handling', test: () => content.includes('catch (error)') },
        { name: 'Loading indicator', test: () => content.includes('Loading API Documentation') },
        { name: 'No legacy attributes', test: () => !content.includes('<redoc ') }
      ];

      let allPassed = true;
      console.log('🔍 Validating Redoc configuration:');

      for (const check of checks) {
        const passed = check.test();
        console.log(`   ${passed ? '✅' : '❌'} ${check.name}`);
        if (!passed) allPassed = false;
      }

      return allPassed;

    } catch (error) {
      console.error('❌ Validation failed:', error);
      return false;
    }
  }
}

async function main() {
  console.log('🚀 Starting Redoc configuration fix...\n');

  try {
    const fixer = new RedocConfigurationFixer();

    // First, validate the current state
    console.log('📋 Validating current configuration...');
    const isValid = await fixer.validateConfiguration();

    if (isValid) {
      console.log('\n✅ Redoc configuration is already correct!');
    } else {
      console.log('\n🔧 Fixing configuration issues...');
      await fixer.fixRedocConfiguration();

      // Validate again
      console.log('\n📋 Re-validating configuration...');
      const isFixedValid = await fixer.validateConfiguration();

      if (isFixedValid) {
        console.log('\n✅ Redoc configuration successfully fixed!');
      } else {
        console.log('\n❌ Some issues remain after fix attempt');
      }
    }

    console.log('\n🎉 Redoc fix process completed!');
    console.log('💡 The "process is not defined" error should now be resolved.');

  } catch (error) {
    console.error('\n❌ Fix process failed:', error);
    process.exit(1);
  }
}

// Run the fix if called directly
if (require.main === module) {
  main().catch(console.error);
}