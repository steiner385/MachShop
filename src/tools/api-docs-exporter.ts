#!/usr/bin/env tsx

/**
 * API Documentation Multi-Format Exporter
 * Exports API documentation to various formats for different use cases
 */

import * as fs from 'fs';
import * as path from 'path';

interface ExportOptions {
  formats: string[];
  outputDir: string;
  includeExamples: boolean;
  businessDomainsOnly?: string[];
  templateStyle?: 'detailed' | 'summary' | 'minimal';
}

interface APIMetadata {
  modules: RouteModule[];
  totalEndpoints: number;
  endpointsByMethod: Record<string, number>;
  endpointsByDomain: Record<string, number>;
  generatedAt: string;
  coverage: {
    documented: number;
    validated: number;
    total: number;
  };
}

interface RouteModule {
  filePath: string;
  moduleName: string;
  baseRoute: string;
  endpoints: APIEndpoint[];
  schemas: ValidationSchema[];
  businessDomain: string;
  description?: string;
}

interface APIEndpoint {
  method: string;
  path: string;
  description?: string;
  middleware: string[];
  tags: string[];
  deprecated?: boolean;
}

interface ValidationSchema {
  name: string;
  type: 'query' | 'body' | 'params';
  schema: any;
  zodDefinition: string;
}

export class APIDocumentationExporter {
  private metadata!: APIMetadata;
  private openApiSpec: any;
  private patternAnalysis: any;

  async exportDocumentation(options: ExportOptions): Promise<void> {
    console.log('📦 Starting multi-format API documentation export...\n');

    // Load source data
    await this.loadSourceData();

    // Ensure output directory exists
    await this.ensureDirectory(options.outputDir);

    // Export in requested formats
    for (const format of options.formats) {
      console.log(`📄 Exporting ${format.toUpperCase()} format...`);

      switch (format.toLowerCase()) {
        case 'markdown':
          await this.exportMarkdown(options);
          break;
        case 'html':
          await this.exportHTML(options);
          break;
        case 'pdf':
          await this.exportPDF(options);
          break;
        case 'postman':
          await this.exportPostman(options);
          break;
        case 'insomnia':
          await this.exportInsomnia(options);
          break;
        case 'curl':
          await this.exportCurlExamples(options);
          break;
        case 'typescript':
          await this.exportTypeScriptClient(options);
          break;
        case 'python':
          await this.exportPythonClient(options);
          break;
        default:
          console.warn(`⚠️  Unknown format: ${format}`);
      }
    }

    console.log(`\n✅ Multi-format export completed!`);
    console.log(`📁 Output directory: ${options.outputDir}`);
  }

  private async loadSourceData(): Promise<void> {
    try {
      this.metadata = JSON.parse(await fs.promises.readFile('./docs/generated/api-metadata.json', 'utf8'));
      this.openApiSpec = JSON.parse(await fs.promises.readFile('./docs/generated/openapi-spec.json', 'utf8'));
      this.patternAnalysis = JSON.parse(await fs.promises.readFile('./docs/generated/api-pattern-analysis.json', 'utf8'));
    } catch (error) {
      throw new Error(`Failed to load source data: ${error}`);
    }
  }

  private async ensureDirectory(dir: string): Promise<void> {
    await fs.promises.mkdir(dir, { recursive: true });
  }

  private async exportMarkdown(options: ExportOptions): Promise<void> {
    const markdown = this.generateMarkdownContent(options);
    const filePath = path.join(options.outputDir, 'api-documentation.md');
    await fs.promises.writeFile(filePath, markdown, 'utf8');
    console.log(`✅ Markdown exported: ${filePath}`);
  }

  private generateMarkdownContent(options: ExportOptions): string {
    const { templateStyle = 'detailed' } = options;

    let content = `# MachShop API Documentation

> Comprehensive API reference for the MachShop Manufacturing Execution System

Generated: ${new Date().toLocaleString()}

## Overview

The MachShop API provides comprehensive access to manufacturing execution system functionality with **${this.metadata.totalEndpoints} endpoints** across **${this.metadata.modules.length} modules**.

### Key Statistics

| Metric | Value |
|--------|-------|
| Total Endpoints | ${this.metadata.totalEndpoints} |
| Business Domains | ${Object.keys(this.metadata.endpointsByDomain).length} |
| Documentation Coverage | ${Math.round((this.metadata.coverage.documented / this.metadata.coverage.total) * 100)}% |
| Validation Coverage | ${Math.round((this.metadata.coverage.validated / this.metadata.coverage.total) * 100)}% |

### Authentication

All API endpoints require authentication using JWT Bearer tokens:

\`\`\`http
Authorization: Bearer <your-jwt-token>
\`\`\`

## Business Domains

`;

    // Add domain sections
    const domains = Object.entries(this.metadata.endpointsByDomain)
      .sort(([,a], [,b]) => b - a);

    domains.forEach(([domain, count]) => {
      if (options.businessDomainsOnly && !options.businessDomainsOnly.includes(domain)) {
        return;
      }

      content += `### ${domain}\n\n`;
      content += `${count} endpoints available\n\n`;

      const domainModules = this.metadata.modules.filter(m => m.businessDomain === domain);

      domainModules.forEach(module => {
        content += `#### ${module.moduleName}\n\n`;
        if (module.description) {
          content += `${module.description}\n\n`;
        }

        if (templateStyle === 'detailed') {
          module.endpoints.forEach(endpoint => {
            content += this.formatEndpointMarkdown(endpoint, options);
          });
        } else if (templateStyle === 'summary') {
          content += `**Endpoints:** ${module.endpoints.length}\n\n`;
          content += `**Base Route:** \`${module.baseRoute}\`\n\n`;
        }

        content += `\n`;
      });
    });

    return content;
  }

  private formatEndpointMarkdown(endpoint: APIEndpoint, options: ExportOptions): string {
    let content = `##### ${endpoint.method} ${endpoint.path}\n\n`;

    if (endpoint.description) {
      content += `${endpoint.description}\n\n`;
    }

    if (endpoint.middleware.length > 0) {
      content += `**Middleware:** ${endpoint.middleware.join(', ')}\n\n`;
    }

    if (endpoint.deprecated) {
      content += `⚠️ **DEPRECATED**\n\n`;
    }

    if (options.includeExamples) {
      content += this.generateExampleMarkdown(endpoint);
    }

    return content;
  }

  private generateExampleMarkdown(endpoint: APIEndpoint): string {
    let content = `**Example Request:**\n\n`;

    content += `\`\`\`http\n`;
    content += `${endpoint.method} ${endpoint.path} HTTP/1.1\n`;
    content += `Host: api.machshop.com\n`;
    content += `Authorization: Bearer <token>\n`;
    content += `Content-Type: application/json\n`;
    content += `\`\`\`\n\n`;

    return content;
  }

  private async exportHTML(options: ExportOptions): Promise<void> {
    const markdown = this.generateMarkdownContent(options);

    // Simple HTML wrapper (in production, use a proper markdown-to-HTML converter)
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MachShop API Documentation</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; line-height: 1.6; }
        h1, h2, h3, h4, h5, h6 { color: #333; }
        pre { background: #f5f5f5; padding: 1rem; border-radius: 4px; overflow-x: auto; }
        code { background: #f5f5f5; padding: 0.2rem 0.4rem; border-radius: 3px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 0.5rem; text-align: left; }
        th { background: #f5f5f5; }
        blockquote { border-left: 4px solid #ddd; margin: 0; padding: 0 1rem; color: #666; }
    </style>
</head>
<body>
    <pre>${markdown.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</body>
</html>`;

    const filePath = path.join(options.outputDir, 'api-documentation.html');
    await fs.promises.writeFile(filePath, html, 'utf8');
    console.log(`✅ HTML exported: ${filePath}`);
  }

  private async exportPDF(options: ExportOptions): Promise<void> {
    // Note: In production, use puppeteer or similar for proper PDF generation
    const markdown = this.generateMarkdownContent(options);
    const filePath = path.join(options.outputDir, 'api-documentation.txt');

    await fs.promises.writeFile(filePath, `MachShop API Documentation\n${'='.repeat(50)}\n\n${markdown}`, 'utf8');
    console.log(`✅ Text format exported (PDF placeholder): ${filePath}`);
    console.log(`   Note: For PDF generation, install puppeteer and implement HTML-to-PDF conversion`);
  }

  private async exportPostman(options: ExportOptions): Promise<void> {
    const collection = {
      info: {
        name: 'MachShop API',
        description: 'Manufacturing Execution System API Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      auth: {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: '{{auth_token}}',
            type: 'string'
          }
        ]
      },
      variable: [
        {
          key: 'base_url',
          value: 'https://api.machshop.com/api/v1',
          type: 'string'
        },
        {
          key: 'auth_token',
          value: 'your-jwt-token-here',
          type: 'string'
        }
      ],
      item: this.generatePostmanItems(options)
    };

    const filePath = path.join(options.outputDir, 'MachShop-API.postman_collection.json');
    await fs.promises.writeFile(filePath, JSON.stringify(collection, null, 2), 'utf8');
    console.log(`✅ Postman collection exported: ${filePath}`);
  }

  private generatePostmanItems(options: ExportOptions): any[] {
    const items: any[] = [];

    // Group by business domain
    const domains = Object.keys(this.metadata.endpointsByDomain);

    domains.forEach(domain => {
      if (options.businessDomainsOnly && !options.businessDomainsOnly.includes(domain)) {
        return;
      }

      const domainFolder = {
        name: domain,
        item: [] as any[]
      };

      const domainModules = this.metadata.modules.filter(m => m.businessDomain === domain);

      domainModules.forEach(module => {
        const moduleFolder = {
          name: module.moduleName,
          item: [] as any[]
        };

        module.endpoints.forEach(endpoint => {
          const request = {
            name: `${endpoint.method} ${endpoint.path.split('/').pop()}`,
            request: {
              method: endpoint.method,
              header: [
                {
                  key: 'Content-Type',
                  value: 'application/json',
                  type: 'text'
                }
              ],
              url: {
                raw: `{{base_url}}${endpoint.path.replace('/api/v1', '')}`,
                host: ['{{base_url}}'],
                path: endpoint.path.replace('/api/v1/', '').split('/')
              }
            }
          };

          if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            (request.request as any).body = {
              mode: 'raw',
              raw: this.generateExampleBody(module),
              options: {
                raw: {
                  language: 'json'
                }
              }
            };
          }

          moduleFolder.item.push(request);
        });

        if (moduleFolder.item.length > 0) {
          domainFolder.item.push(moduleFolder);
        }
      });

      if (domainFolder.item.length > 0) {
        items.push(domainFolder);
      }
    });

    return items;
  }

  private generateExampleBody(module: RouteModule): string {
    const examples: Record<string, any> = {
      'workOrders': {
        workOrderNumber: 'WO-2024-001',
        partNumber: 'ENGINE-BLADE-A380',
        quantityOrdered: 10,
        status: 'RELEASED',
        priority: 'HIGH'
      },
      'materials': {
        materialNumber: 'MAT-TI-6AL4V',
        description: 'Titanium Alloy Ti-6Al-4V',
        materialClass: 'RAW_MATERIAL',
        unitOfMeasure: 'LB'
      }
    };

    return JSON.stringify(examples[module.moduleName] || { name: 'Example Resource' }, null, 2);
  }

  private async exportInsomnia(options: ExportOptions): Promise<void> {
    // Insomnia workspace format
    const workspace = {
      _type: 'export',
      __export_format: 4,
      __export_date: new Date().toISOString(),
      __export_source: 'machshop-api-exporter',
      resources: [
        {
          _id: 'wrk_machshop',
          _type: 'workspace',
          name: 'MachShop API',
          description: 'Manufacturing Execution System API'
        },
        {
          _id: 'env_base',
          _type: 'environment',
          name: 'Base Environment',
          data: {
            base_url: 'https://api.machshop.com/api/v1',
            auth_token: 'your-jwt-token-here'
          }
        }
      ]
    };

    const filePath = path.join(options.outputDir, 'MachShop-API.insomnia.json');
    await fs.promises.writeFile(filePath, JSON.stringify(workspace, null, 2), 'utf8');
    console.log(`✅ Insomnia workspace exported: ${filePath}`);
  }

  private async exportCurlExamples(options: ExportOptions): Promise<void> {
    let curlExamples = `# MachShop API - cURL Examples\n\n`;
    curlExamples += `# Set your authentication token\n`;
    curlExamples += `export AUTH_TOKEN="your-jwt-token-here"\n`;
    curlExamples += `export BASE_URL="https://api.machshop.com/api/v1"\n\n`;

    // Generate examples for each business domain
    const domains = Object.keys(this.metadata.endpointsByDomain).slice(0, 5); // Limit examples

    domains.forEach(domain => {
      const domainModules = this.metadata.modules.filter(m => m.businessDomain === domain);

      curlExamples += `## ${domain}\n\n`;

      domainModules.slice(0, 2).forEach(module => { // Limit per domain
        module.endpoints.slice(0, 3).forEach(endpoint => { // Limit per module
          curlExamples += `### ${endpoint.method} ${endpoint.path}\n\n`;

          if (endpoint.description) {
            curlExamples += `# ${endpoint.description}\n`;
          }

          curlExamples += `curl -X ${endpoint.method} \\\n`;
          curlExamples += `  "$BASE_URL${endpoint.path.replace('/api/v1', '')}" \\\n`;
          curlExamples += `  -H "Authorization: Bearer $AUTH_TOKEN" \\\n`;
          curlExamples += `  -H "Content-Type: application/json"`;

          if (['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
            curlExamples += ` \\\n  -d '${this.generateExampleBody(module)}'`;
          }

          curlExamples += `\n\n`;
        });
      });
    });

    const filePath = path.join(options.outputDir, 'curl-examples.sh');
    await fs.promises.writeFile(filePath, curlExamples, 'utf8');
    console.log(`✅ cURL examples exported: ${filePath}`);
  }

  private async exportTypeScriptClient(options: ExportOptions): Promise<void> {
    const clientCode = `// MachShop API TypeScript Client
// Generated from OpenAPI specification

export interface ApiConfig {
  baseUrl: string;
  authToken: string;
}

export class MachShopApiClient {
  private config: ApiConfig;

  constructor(config: ApiConfig) {
    this.config = config;
  }

  private async request<T>(
    method: string,
    path: string,
    data?: any
  ): Promise<T> {
    const url = \`\${this.config.baseUrl}\${path}\`;

    const options: RequestInit = {
      method,
      headers: {
        'Authorization': \`Bearer \${this.config.authToken}\`,
        'Content-Type': 'application/json',
      },
    };

    if (data) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(\`API request failed: \${response.statusText}\`);
    }

    return response.json();
  }

  // Example methods (expand based on your API)
  async getWorkOrders(): Promise<any[]> {
    return this.request('GET', '/workorders');
  }

  async createWorkOrder(data: any): Promise<any> {
    return this.request('POST', '/workorders', data);
  }

  async getMaterials(): Promise<any[]> {
    return this.request('GET', '/materials');
  }

  // Add more methods as needed...
}

// Usage example:
// const client = new MachShopApiClient({
//   baseUrl: 'https://api.machshop.com/api/v1',
//   authToken: 'your-jwt-token'
// });
//
// const workOrders = await client.getWorkOrders();
`;

    const filePath = path.join(options.outputDir, 'machshop-api-client.ts');
    await fs.promises.writeFile(filePath, clientCode, 'utf8');
    console.log(`✅ TypeScript client exported: ${filePath}`);
  }

  private async exportPythonClient(options: ExportOptions): Promise<void> {
    const clientCode = `"""
MachShop API Python Client
Generated from OpenAPI specification
"""

import requests
from typing import Dict, List, Optional, Any
import json


class MachShopApiClient:
    """Python client for the MachShop Manufacturing Execution System API."""

    def __init__(self, base_url: str, auth_token: str):
        """
        Initialize the API client.

        Args:
            base_url: The base URL of the API (e.g., 'https://api.machshop.com/api/v1')
            auth_token: JWT authentication token
        """
        self.base_url = base_url.rstrip('/')
        self.session = requests.Session()
        self.session.headers.update({
            'Authorization': f'Bearer {auth_token}',
            'Content-Type': 'application/json'
        })

    def _request(self, method: str, path: str, data: Optional[Dict] = None) -> Any:
        """Make an API request."""
        url = f"{self.base_url}{path}"

        try:
            response = self.session.request(
                method=method,
                url=url,
                json=data if data else None
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise Exception(f"API request failed: {e}")

    # Work Orders
    def get_work_orders(self, page: int = 1, limit: int = 50) -> Dict:
        """Get work orders with pagination."""
        return self._request('GET', f'/workorders?page={page}&limit={limit}')

    def create_work_order(self, work_order_data: Dict) -> Dict:
        """Create a new work order."""
        return self._request('POST', '/workorders', work_order_data)

    def get_work_order(self, work_order_id: str) -> Dict:
        """Get a specific work order by ID."""
        return self._request('GET', f'/workorders/{work_order_id}')

    # Materials
    def get_materials(self, page: int = 1, limit: int = 50) -> Dict:
        """Get materials with pagination."""
        return self._request('GET', f'/materials?page={page}&limit={limit}')

    def create_material(self, material_data: Dict) -> Dict:
        """Create a new material."""
        return self._request('POST', '/materials', material_data)

    # Quality
    def get_quality_inspections(self, page: int = 1, limit: int = 50) -> Dict:
        """Get quality inspections with pagination."""
        return self._request('GET', f'/fai?page={page}&limit={limit}')

    def create_quality_inspection(self, inspection_data: Dict) -> Dict:
        """Create a new quality inspection."""
        return self._request('POST', '/fai', inspection_data)


# Usage example:
if __name__ == "__main__":
    client = MachShopApiClient(
        base_url='https://api.machshop.com/api/v1',
        auth_token='your-jwt-token-here'
    )

    # Get work orders
    work_orders = client.get_work_orders()
    print(f"Found {len(work_orders.get('data', []))} work orders")

    # Create a new work order
    new_work_order = {
        'workOrderNumber': 'WO-2024-001',
        'partNumber': 'ENGINE-BLADE-A380',
        'quantityOrdered': 10,
        'status': 'RELEASED',
        'priority': 'HIGH'
    }

    created_wo = client.create_work_order(new_work_order)
    print(f"Created work order: {created_wo['id']}")
`;

    const filePath = path.join(options.outputDir, 'machshop_api_client.py');
    await fs.promises.writeFile(filePath, clientCode, 'utf8');
    console.log(`✅ Python client exported: ${filePath}`);
  }
}

async function main() {
  console.log('🚀 Starting multi-format API documentation export...\n');

  try {
    const exporter = new APIDocumentationExporter();

    // Export all formats
    await exporter.exportDocumentation({
      formats: ['markdown', 'html', 'postman', 'insomnia', 'curl', 'typescript', 'python'],
      outputDir: './docs/exports',
      includeExamples: true,
      templateStyle: 'detailed'
    });

    // Export domain-specific collections
    const priorityDomains = ['Production Management', 'Quality Management', 'Material Management'];

    await exporter.exportDocumentation({
      formats: ['markdown', 'postman'],
      outputDir: './docs/exports/priority-domains',
      includeExamples: true,
      businessDomainsOnly: priorityDomains,
      templateStyle: 'detailed'
    });

    console.log('\n🎉 Multi-format export completed successfully!');
    console.log('📁 Check ./docs/exports/ for all generated files');
    console.log('📁 Check ./docs/exports/priority-domains/ for domain-specific exports');

  } catch (error) {
    console.error('❌ Error during export:', error);
    process.exit(1);
  }
}

// Run the multi-format export
main().catch(console.error);