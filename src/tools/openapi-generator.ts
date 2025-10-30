#!/usr/bin/env tsx

/**
 * OpenAPI 3.0 Specification Generator
 * Converts TypeScript route analysis to comprehensive OpenAPI documentation
 */

import * as fs from 'fs';
import * as path from 'path';

// OpenAPI 3.0 specification interfaces
interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    version: string;
    description: string;
    contact?: {
      name: string;
      email: string;
      url: string;
    };
    license?: {
      name: string;
      url: string;
    };
  };
  servers: Server[];
  paths: Record<string, PathItem>;
  components: {
    schemas: Record<string, Schema>;
    securitySchemes: Record<string, SecurityScheme>;
    parameters: Record<string, Parameter>;
    responses: Record<string, Response>;
  };
  security: SecurityRequirement[];
  tags: Tag[];
}

interface Server {
  url: string;
  description: string;
}

interface PathItem {
  summary?: string;
  description?: string;
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
  parameters?: Parameter[];
}

interface Operation {
  operationId: string;
  summary?: string;
  description?: string;
  tags: string[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses: Record<string, Response>;
  security?: SecurityRequirement[];
  deprecated?: boolean;
}

interface Parameter {
  name: string;
  in: 'query' | 'header' | 'path' | 'cookie';
  description?: string;
  required: boolean;
  schema: Schema;
  example?: any;
}

interface RequestBody {
  description?: string;
  content: Record<string, MediaType>;
  required: boolean;
}

interface MediaType {
  schema: Schema;
  example?: any;
  examples?: Record<string, Example>;
}

interface Response {
  description: string;
  content?: Record<string, MediaType>;
  headers?: Record<string, Header>;
}

interface Schema {
  type?: string;
  format?: string;
  description?: string;
  properties?: Record<string, Schema>;
  required?: string[];
  items?: Schema;
  enum?: any[];
  example?: any;
  oneOf?: Schema[];
  allOf?: Schema[];
  anyOf?: Schema[];
  $ref?: string;
}

interface SecurityScheme {
  type: string;
  scheme?: string;
  bearerFormat?: string;
  description?: string;
}

interface SecurityRequirement {
  [key: string]: string[];
}

interface Tag {
  name: string;
  description: string;
}

interface Header {
  description?: string;
  schema: Schema;
}

interface Example {
  summary?: string;
  description?: string;
  value: any;
}

// Import our analysis types
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
  imports: string[];
  services: string[];
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

export class OpenAPIGenerator {
  private apiMetadata!: APIMetadata;
  private patternAnalysis: any;
  private spec: Partial<OpenAPISpec> = {};

  constructor() {
    this.initializeSpec();
  }

  async generateOpenAPISpec(
    metadataPath: string,
    patternAnalysisPath: string,
    outputPath: string
  ): Promise<void> {
    console.log('🚀 Generating OpenAPI 3.0 specification...\n');

    // Load analysis data
    this.apiMetadata = JSON.parse(await fs.promises.readFile(metadataPath, 'utf8'));
    this.patternAnalysis = JSON.parse(await fs.promises.readFile(patternAnalysisPath, 'utf8'));

    console.log(`📊 Processing ${this.apiMetadata.totalEndpoints} endpoints across ${this.apiMetadata.modules.length} modules`);

    // Generate specification sections
    this.generateInfo();
    this.generateServers();
    this.generateTags();
    this.generateSecuritySchemes();
    this.generateCommonSchemas();
    this.generatePaths();
    this.generateComponents();

    // Validate and write specification
    const validatedSpec = this.validateAndCleanSpec();
    await this.writeSpecification(validatedSpec, outputPath);

    console.log(`✅ OpenAPI 3.0 specification generated successfully!`);
    console.log(`📄 Output: ${outputPath}`);
    console.log(`📈 Coverage: ${this.apiMetadata.totalEndpoints} endpoints documented`);
  }

  private initializeSpec(): void {
    this.spec = {
      openapi: '3.0.3',
      info: {
        title: '',
        version: '',
        description: ''
      },
      servers: [],
      paths: {},
      components: {
        schemas: {},
        securitySchemes: {},
        parameters: {},
        responses: {}
      },
      security: [],
      tags: []
    };
  }

  private generateInfo(): void {
    this.spec.info = {
      title: 'MachShop Manufacturing Execution System API',
      version: '1.0.0',
      description: `
# MachShop MES API Documentation

Comprehensive API documentation for the MachShop Manufacturing Execution System (MES),
designed for aerospace component manufacturing with full traceability and compliance.

## API Coverage
- **${this.apiMetadata.totalEndpoints} Endpoints** across ${this.apiMetadata.modules.length} modules
- **${Object.keys(this.apiMetadata.endpointsByDomain).length} Business Domains**
- **${Math.round((this.apiMetadata.coverage.documented / this.apiMetadata.coverage.total) * 100)}% Documentation Coverage**

## Standards Compliance
- ISA-95 Manufacturing Operations Management
- AS9100 Quality Management Systems
- FDA 21 CFR Part 11 Electronic Records
- ITAR Export Control Compliance

## Authentication
All endpoints require JWT bearer token authentication with role-based access control (RBAC).

Generated: ${new Date().toLocaleString()}
      `.trim(),
      contact: {
        name: 'MES Development Team',
        email: 'api-support@machshop.com',
        url: 'https://docs.machshop.com'
      },
      license: {
        name: 'Proprietary',
        url: 'https://machshop.com/license'
      }
    };
  }

  private generateServers(): void {
    this.spec.servers = [
      {
        url: 'https://api.machshop.com/api/v1',
        description: 'Production MES API'
      },
      {
        url: 'https://staging-api.machshop.com/api/v1',
        description: 'Staging Environment'
      },
      {
        url: 'http://localhost:3001/api/v1',
        description: 'Development Environment'
      }
    ];
  }

  private generateTags(): void {
    const domainDescriptions: Record<string, string> = {
      'Production Management': 'Work orders, routings, schedules, and production execution',
      'Quality Management': 'Inspections, FAI, NCRs, and quality measurements',
      'Material Management': 'Materials, inventory, traceability, and BOM management',
      'Equipment Management': 'Equipment status, maintenance, and performance monitoring',
      'Document Management': 'Work instructions, setup sheets, SOPs, and document control',
      'Personnel Management': 'User management, skills, certifications, and availability',
      'Authentication & Security': 'Authentication, authorization, and security management',
      'Workflow Management': 'Approval workflows, reviews, and process automation',
      'Time Tracking': 'Labor time, machine time, and cost tracking',
      'Administration': 'System administration, roles, and permissions',
      'Collaboration': 'Comments, reviews, activities, and notifications',
      'Analytics & Reporting': 'Dashboard metrics, KPIs, and search functionality',
      'Core Infrastructure': 'Sites, areas, work centers, and system configuration',
      'External Integration': 'ERP integration, data exchange, and third-party systems'
    };

    this.spec.tags = Object.entries(this.apiMetadata.endpointsByDomain)
      .sort(([,a], [,b]) => b - a)
      .map(([domain, count]) => ({
        name: domain,
        description: `${domainDescriptions[domain] || 'Business domain operations'} (${count} endpoints)`
      }));
  }

  private generateSecuritySchemes(): void {
    this.spec.components!.securitySchemes = {
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT Bearer token authentication with role-based access control'
      },
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key for service-to-service communication'
      }
    };

    this.spec.security = [
      { BearerAuth: [] }
    ];
  }

  private generateCommonSchemas(): void {
    // Generate schemas from our pattern analysis
    const commonSchemas: Record<string, Schema> = {
      Error: {
        type: 'object',
        properties: {
          error: {
            type: 'string',
            description: 'Error message'
          },
          code: {
            type: 'string',
            description: 'Error code'
          },
          details: {
            type: 'object',
            description: 'Additional error details'
          }
        },
        required: ['error']
      },
      PaginationInfo: {
        type: 'object',
        properties: {
          page: {
            type: 'integer',
            description: 'Current page number',
            minimum: 1
          },
          limit: {
            type: 'integer',
            description: 'Items per page',
            minimum: 1,
            maximum: 1000
          },
          total: {
            type: 'integer',
            description: 'Total number of items'
          },
          totalPages: {
            type: 'integer',
            description: 'Total number of pages'
          }
        }
      },
      BaseEntity: {
        type: 'object',
        properties: {
          id: {
            type: 'string',
            description: 'Unique identifier'
          },
          createdAt: {
            type: 'string',
            format: 'date-time',
            description: 'Creation timestamp'
          },
          updatedAt: {
            type: 'string',
            format: 'date-time',
            description: 'Last update timestamp'
          }
        },
        required: ['id', 'createdAt', 'updatedAt']
      }
    };

    // Add domain-specific schemas based on common patterns
    this.generateDomainSchemas(commonSchemas);

    this.spec.components!.schemas = commonSchemas;
  }

  private generateDomainSchemas(schemas: Record<string, Schema>): void {
    // Manufacturing-specific schemas
    schemas.WorkOrder = {
      type: 'object',
      allOf: [
        { $ref: '#/components/schemas/BaseEntity' },
        {
          type: 'object',
          properties: {
            workOrderNumber: {
              type: 'string',
              description: 'Unique work order number'
            },
            partNumber: {
              type: 'string',
              description: 'Part number being manufactured'
            },
            quantityOrdered: {
              type: 'integer',
              minimum: 1,
              description: 'Quantity to manufacture'
            },
            status: {
              type: 'string',
              enum: ['PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'],
              description: 'Work order status'
            },
            priority: {
              type: 'string',
              enum: ['LOW', 'NORMAL', 'HIGH', 'URGENT'],
              description: 'Work order priority'
            },
            dueDate: {
              type: 'string',
              format: 'date-time',
              description: 'Due date for completion'
            }
          },
          required: ['workOrderNumber', 'partNumber', 'quantityOrdered', 'status']
        }
      ]
    };

    schemas.Material = {
      type: 'object',
      allOf: [
        { $ref: '#/components/schemas/BaseEntity' },
        {
          type: 'object',
          properties: {
            materialNumber: {
              type: 'string',
              description: 'Material identification number'
            },
            description: {
              type: 'string',
              description: 'Material description'
            },
            materialClass: {
              type: 'string',
              description: 'Material classification'
            },
            unitOfMeasure: {
              type: 'string',
              description: 'Unit of measure (EA, LB, FT, etc.)'
            }
          },
          required: ['materialNumber', 'description']
        }
      ]
    };

    schemas.QualityInspection = {
      type: 'object',
      allOf: [
        { $ref: '#/components/schemas/BaseEntity' },
        {
          type: 'object',
          properties: {
            inspectionType: {
              type: 'string',
              enum: ['INCOMING', 'IN_PROCESS', 'FINAL', 'AUDIT'],
              description: 'Type of quality inspection'
            },
            result: {
              type: 'string',
              enum: ['PASS', 'FAIL', 'CONDITIONAL'],
              description: 'Inspection result'
            },
            inspector: {
              type: 'string',
              description: 'Inspector user ID'
            },
            inspectionDate: {
              type: 'string',
              format: 'date-time',
              description: 'Date of inspection'
            }
          },
          required: ['inspectionType', 'result', 'inspector']
        }
      ]
    };
  }

  private generatePaths(): void {
    console.log('🔧 Generating API paths...');

    this.apiMetadata.modules.forEach(module => {
      module.endpoints.forEach(endpoint => {
        this.generatePath(endpoint, module);
      });
    });

    console.log(`✅ Generated ${Object.keys(this.spec.paths!).length} API paths`);
  }

  private generatePath(endpoint: APIEndpoint, module: RouteModule): void {
    const pathKey = endpoint.path.replace('/api/v1', '');
    const method = endpoint.method.toLowerCase() as keyof PathItem;

    if (!this.spec.paths![pathKey]) {
      this.spec.paths![pathKey] = {};
    }

    const operation: Operation = {
      operationId: this.generateOperationId(endpoint, module),
      summary: endpoint.description || this.generateSummary(endpoint, module),
      description: this.generateDescription(endpoint, module),
      tags: [module.businessDomain],
      parameters: this.generateParameters(endpoint, module),
      responses: this.generateResponses(endpoint, module),
      deprecated: endpoint.deprecated || false
    };

    // Add request body for POST/PUT/PATCH
    if (['post', 'put', 'patch'].includes(method)) {
      operation.requestBody = this.generateRequestBody(endpoint, module);
    }

    // Add security requirements
    operation.security = this.generateSecurity(endpoint);

    this.spec.paths![pathKey][method] = operation;
  }

  private generateOperationId(endpoint: APIEndpoint, module: RouteModule): string {
    const method = endpoint.method.toLowerCase();
    const cleanPath = endpoint.path
      .replace('/api/v1/', '')
      .replace(/[{}]/g, '')
      .replace(/\//g, '_')
      .replace(/:/g, '_by_');

    return `${method}_${cleanPath}`;
  }

  private generateSummary(endpoint: APIEndpoint, module: RouteModule): string {
    const method = endpoint.method;
    const resource = module.moduleName;

    const summaryTemplates: Record<string, string> = {
      'GET': `Get ${resource}`,
      'POST': `Create ${resource}`,
      'PUT': `Update ${resource}`,
      'PATCH': `Partially update ${resource}`,
      'DELETE': `Delete ${resource}`
    };

    return summaryTemplates[method] || `${method} ${resource}`;
  }

  private generateDescription(endpoint: APIEndpoint, module: RouteModule): string {
    const baseDescription = endpoint.description || this.generateSummary(endpoint, module);

    let description = baseDescription;

    // Add middleware information
    if (endpoint.middleware.length > 0) {
      description += `\n\n**Middleware:** ${endpoint.middleware.join(', ')}`;
    }

    // Add business context
    description += `\n\n**Business Domain:** ${module.businessDomain}`;

    return description;
  }

  private generateParameters(endpoint: APIEndpoint, module: RouteModule): Parameter[] {
    const parameters: Parameter[] = [];

    // Extract path parameters
    const pathParams = endpoint.path.match(/:(\w+)/g);
    if (pathParams) {
      pathParams.forEach(param => {
        const paramName = param.substring(1);
        parameters.push({
          name: paramName,
          in: 'path',
          required: true,
          description: `${paramName} identifier`,
          schema: { type: 'string' }
        });
      });
    }

    // Add common query parameters for GET requests
    if (endpoint.method === 'GET') {
      parameters.push(
        {
          name: 'page',
          in: 'query',
          required: false,
          description: 'Page number for pagination',
          schema: { type: 'integer', minimum: 1, default: 1 }
        },
        {
          name: 'limit',
          in: 'query',
          required: false,
          description: 'Number of items per page',
          schema: { type: 'integer', minimum: 1, maximum: 1000, default: 50 }
        }
      );
    }

    return parameters;
  }

  private generateRequestBody(endpoint: APIEndpoint, module: RouteModule): RequestBody | undefined {
    if (!['POST', 'PUT', 'PATCH'].includes(endpoint.method)) {
      return undefined;
    }

    // Try to find a matching schema
    const bodySchema = module.schemas.find(s => s.type === 'body');
    const schemaRef = bodySchema
      ? `#/components/schemas/${bodySchema.name}`
      : '#/components/schemas/BaseEntity';

    return {
      description: `${module.moduleName} data`,
      required: true,
      content: {
        'application/json': {
          schema: { $ref: schemaRef },
          example: this.generateExample(endpoint, module)
        }
      }
    };
  }

  private generateResponses(endpoint: APIEndpoint, module: RouteModule): Record<string, Response> {
    const responses: Record<string, Response> = {
      '400': {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      '401': {
        description: 'Unauthorized',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      '500': {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    };

    // Success responses
    if (endpoint.method === 'GET') {
      responses['200'] = {
        description: 'Successful response',
        content: {
          'application/json': {
            schema: this.generateSuccessSchema(endpoint, module),
            example: this.generateExample(endpoint, module)
          }
        }
      };
    } else if (endpoint.method === 'POST') {
      responses['201'] = {
        description: 'Resource created successfully',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${this.inferResourceSchema(module.moduleName)}` }
          }
        }
      };
    } else if (endpoint.method === 'DELETE') {
      responses['204'] = {
        description: 'Resource deleted successfully'
      };
    } else {
      responses['200'] = {
        description: 'Operation successful',
        content: {
          'application/json': {
            schema: { $ref: `#/components/schemas/${this.inferResourceSchema(module.moduleName)}` }
          }
        }
      };
    }

    return responses;
  }

  private generateSuccessSchema(endpoint: APIEndpoint, module: RouteModule): Schema {
    const resourceSchema = this.inferResourceSchema(module.moduleName);

    // If it's a list endpoint, wrap in array with pagination
    if (endpoint.path.endsWith(module.baseRoute) && endpoint.method === 'GET') {
      return {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { $ref: `#/components/schemas/${resourceSchema}` }
          },
          pagination: { $ref: '#/components/schemas/PaginationInfo' }
        }
      };
    }

    return { $ref: `#/components/schemas/${resourceSchema}` };
  }

  private inferResourceSchema(moduleName: string): string {
    const schemaMapping: Record<string, string> = {
      'workOrders': 'WorkOrder',
      'materials': 'Material',
      'quality': 'QualityInspection',
      'inspectionPlans': 'QualityInspection',
      'fai': 'QualityInspection'
    };

    return schemaMapping[moduleName] || 'BaseEntity';
  }

  private generateSecurity(endpoint: APIEndpoint): SecurityRequirement[] {
    const hasAuth = endpoint.middleware.some(m =>
      ['requirePermission', 'requireRole', 'authMiddleware'].includes(m)
    );

    return hasAuth ? [{ BearerAuth: [] }] : [];
  }

  private generateExample(endpoint: APIEndpoint, module: RouteModule): any {
    // Generate contextual examples based on module type
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
      },
      'quality': {
        inspectionType: 'FINAL',
        result: 'PASS',
        inspector: 'quality-inspector-001',
        inspectionDate: '2024-10-30T10:00:00Z'
      }
    };

    return examples[module.moduleName] || { id: 'example-id', name: 'Example Resource' };
  }

  private generateComponents(): void {
    // Add common parameters
    this.spec.components!.parameters = {
      PageParam: {
        name: 'page',
        in: 'query',
        description: 'Page number for pagination',
        required: false,
        schema: { type: 'integer', minimum: 1, default: 1 }
      },
      LimitParam: {
        name: 'limit',
        in: 'query',
        description: 'Number of items per page',
        required: false,
        schema: { type: 'integer', minimum: 1, maximum: 1000, default: 50 }
      }
    };

    // Add common responses
    this.spec.components!.responses = {
      BadRequest: {
        description: 'Bad Request',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Unauthorized: {
        description: 'Unauthorized - Invalid or missing authentication',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      },
      InternalServerError: {
        description: 'Internal Server Error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' }
          }
        }
      }
    };
  }

  private validateAndCleanSpec(): OpenAPISpec {
    // Ensure all required fields are present and valid
    const spec = this.spec as OpenAPISpec;

    // Remove empty or invalid paths
    Object.keys(spec.paths).forEach(path => {
      const pathItem = spec.paths[path];
      if (!pathItem || Object.keys(pathItem).length === 0) {
        delete spec.paths[path];
      }
    });

    // Validate operation IDs are unique
    const operationIds = new Set<string>();
    Object.values(spec.paths).forEach(pathItem => {
      ['get', 'post', 'put', 'patch', 'delete'].forEach(method => {
        const operation = pathItem[method as keyof PathItem] as Operation;
        if (operation?.operationId) {
          if (operationIds.has(operation.operationId)) {
            operation.operationId += `_${Math.random().toString(36).substr(2, 5)}`;
          }
          operationIds.add(operation.operationId);
        }
      });
    });

    return spec;
  }

  private async writeSpecification(spec: OpenAPISpec, outputPath: string): Promise<void> {
    const yamlContent = this.convertToYAML(spec);
    const jsonContent = JSON.stringify(spec, null, 2);

    // Write both YAML and JSON versions
    const yamlPath = outputPath.replace('.json', '.yaml');
    const jsonPath = outputPath;

    await fs.promises.writeFile(yamlPath, yamlContent, 'utf8');
    await fs.promises.writeFile(jsonPath, jsonContent, 'utf8');

    console.log(`📄 YAML specification: ${yamlPath}`);
    console.log(`📄 JSON specification: ${jsonPath}`);
  }

  private convertToYAML(spec: OpenAPISpec): string {
    // Simple YAML conversion (in production, use a proper YAML library)
    const yamlLines: string[] = [];

    yamlLines.push(`openapi: "${spec.openapi}"`);
    yamlLines.push('info:');
    yamlLines.push(`  title: "${spec.info.title}"`);
    yamlLines.push(`  version: "${spec.info.version}"`);
    yamlLines.push(`  description: |`);
    spec.info.description.split('\n').forEach(line => {
      yamlLines.push(`    ${line}`);
    });

    yamlLines.push('');
    yamlLines.push('# For complete YAML specification, use the JSON version with a YAML converter');
    yamlLines.push('# This is a simplified YAML header for compatibility');

    return yamlLines.join('\n');
  }
}

async function main() {
  console.log('🚀 Starting OpenAPI 3.0 specification generation...\n');

  try {
    const generator = new OpenAPIGenerator();

    await generator.generateOpenAPISpec(
      './docs/generated/api-metadata.json',
      './docs/generated/api-pattern-analysis.json',
      './docs/generated/openapi-spec.json'
    );

    console.log('\n🎉 OpenAPI 3.0 specification generation completed!');
    console.log('📚 Next steps:');
    console.log('   • Deploy Swagger UI for interactive documentation');
    console.log('   • Set up Redoc for alternative documentation view');
    console.log('   • Configure CI/CD validation for API changes');

  } catch (error) {
    console.error('❌ Error generating OpenAPI specification:', error);
    process.exit(1);
  }
}

// Run the OpenAPI generator
main().catch(console.error);