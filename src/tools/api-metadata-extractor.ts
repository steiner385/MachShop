/**
 * API Metadata Extractor
 * Systematically extracts comprehensive metadata from TypeScript API route files
 * Similar to schema-metadata-extractor but focused on REST API endpoints
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

export interface APIEndpoint {
  method: string;
  path: string;
  description?: string;
  middleware: string[];
  validation?: {
    query?: string;
    body?: string;
    params?: string;
  };
  responses?: {
    success?: string;
    error?: string[];
  };
  tags: string[];
  deprecated?: boolean;
  businessContext?: string;
  examples?: any[];
}

export interface RouteModule {
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

export interface ValidationSchema {
  name: string;
  type: 'query' | 'body' | 'params';
  schema: any;
  zodDefinition: string;
}

export interface APIMetadata {
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

export class APIMetadataExtractor {
  private routesPath: string;
  private sourceFiles: Map<string, ts.SourceFile> = new Map();

  constructor(routesPath: string = './src/routes') {
    this.routesPath = path.resolve(routesPath);
  }

  /**
   * Extract comprehensive API metadata from all route files
   */
  async extractMetadata(): Promise<APIMetadata> {
    console.log('🔍 Starting API metadata extraction...');

    // Find all TypeScript route files
    const routeFiles = await this.findRouteFiles();
    console.log(`📁 Found ${routeFiles.length} route files`);

    // Parse each route file
    const modules: RouteModule[] = [];
    for (const filePath of routeFiles) {
      try {
        const module = await this.parseRouteFile(filePath);
        if (module) {
          modules.push(module);
        }
      } catch (error) {
        console.error(`❌ Error parsing ${filePath}:`, error);
      }
    }

    // Calculate statistics
    const totalEndpoints = modules.reduce((sum, mod) => sum + mod.endpoints.length, 0);
    const endpointsByMethod = this.calculateMethodStats(modules);
    const endpointsByDomain = this.calculateDomainStats(modules);
    const coverage = this.calculateCoverage(modules);

    console.log(`✅ Extracted metadata for ${modules.length} modules, ${totalEndpoints} endpoints`);

    return {
      modules,
      totalEndpoints,
      endpointsByMethod,
      endpointsByDomain,
      generatedAt: new Date().toISOString(),
      coverage
    };
  }

  /**
   * Find all TypeScript route files recursively
   */
  private async findRouteFiles(): Promise<string[]> {
    const files: string[] = [];

    const walkDir = async (dirPath: string): Promise<void> => {
      const entries = await fs.promises.readdir(dirPath, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          await walkDir(fullPath);
        } else if (entry.isFile() &&
                   entry.name.endsWith('.ts') &&
                   !entry.name.includes('.test.') &&
                   !entry.name.includes('.spec.')) {
          files.push(fullPath);
        }
      }
    };

    await walkDir(this.routesPath);
    return files;
  }

  /**
   * Parse a single route file and extract endpoints
   */
  private async parseRouteFile(filePath: string): Promise<RouteModule | null> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    this.sourceFiles.set(filePath, sourceFile);

    const moduleName = this.extractModuleName(filePath);
    const baseRoute = this.inferBaseRoute(moduleName);
    const imports = this.extractImports(sourceFile);
    const services = this.extractServices(sourceFile);
    const schemas = this.extractValidationSchemas(sourceFile);
    const endpoints = this.extractEndpoints(sourceFile, baseRoute);
    const businessDomain = this.inferBusinessDomain(moduleName);
    const description = this.extractModuleDescription(sourceFile);

    return {
      filePath: path.relative(process.cwd(), filePath),
      moduleName,
      baseRoute,
      endpoints,
      imports,
      services,
      schemas,
      businessDomain,
      description
    };
  }

  /**
   * Extract module name from file path
   */
  private extractModuleName(filePath: string): string {
    const fileName = path.basename(filePath, '.ts');
    return fileName.replace(/Routes$/, ''); // Remove "Routes" suffix if present
  }

  /**
   * Infer base route from module name
   */
  private inferBaseRoute(moduleName: string): string {
    // Handle special cases
    const routeMapping: Record<string, string> = {
      'auth': '/auth',
      'workOrders': '/workorders',
      'workOrderExecution': '/workorders/execution',
      'productionSchedules': '/production-schedules',
      'timeTracking': '/time-tracking',
      'workInstructions': '/work-instructions',
      'setupSheets': '/setup-sheets',
      'inspectionPlans': '/inspection-plans',
      'unifiedDocuments': '/documents',
      'unifiedApprovals': '/approvals',
      'roleTemplates': '/role-templates',
      'azureAdGraph': '/azure-ad'
    };

    if (routeMapping[moduleName]) {
      return routeMapping[moduleName];
    }

    // Convert camelCase to kebab-case
    return '/' + moduleName.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
  }

  /**
   * Extract import statements
   */
  private extractImports(sourceFile: ts.SourceFile): string[] {
    const imports: string[] = [];

    ts.forEachChild(sourceFile, (node) => {
      if (ts.isImportDeclaration(node)) {
        const moduleSpecifier = node.moduleSpecifier;
        if (ts.isStringLiteral(moduleSpecifier)) {
          imports.push(moduleSpecifier.text);
        }
      }
    });

    return imports;
  }

  /**
   * Extract service dependencies
   */
  private extractServices(sourceFile: ts.SourceFile): string[] {
    const services: string[] = [];
    const servicePattern = /(\w+Service)/g;

    const sourceText = sourceFile.getFullText();
    let match;
    while ((match = servicePattern.exec(sourceText)) !== null) {
      if (!services.includes(match[1])) {
        services.push(match[1]);
      }
    }

    return services;
  }

  /**
   * Extract Zod validation schemas
   */
  private extractValidationSchemas(sourceFile: ts.SourceFile): ValidationSchema[] {
    const schemas: ValidationSchema[] = [];
    const sourceText = sourceFile.getFullText();

    // Find schema variable declarations
    const schemaPattern = /const\s+(\w+Schema)\s*=\s*z\.object\(\{([^}]+)\}\)/g;
    let match;

    while ((match = schemaPattern.exec(sourceText)) !== null) {
      const schemaName = match[1];
      const schemaContent = match[2];

      // Determine schema type based on name
      let type: 'query' | 'body' | 'params' = 'body';
      if (schemaName.toLowerCase().includes('query')) type = 'query';
      if (schemaName.toLowerCase().includes('param')) type = 'params';

      schemas.push({
        name: schemaName,
        type,
        schema: this.parseZodSchema(schemaContent),
        zodDefinition: match[0]
      });
    }

    return schemas;
  }

  /**
   * Parse Zod schema content to extract field information
   */
  private parseZodSchema(schemaContent: string): any {
    // Simple parsing - in a production version, we'd use a proper AST parser
    const fields: Record<string, any> = {};
    const fieldPattern = /(\w+):\s*z\.(\w+)\([^)]*\)([^,\n]*)/g;

    let match;
    while ((match = fieldPattern.exec(schemaContent)) !== null) {
      const fieldName = match[1];
      const zodType = match[2];
      const modifiers = match[3];

      fields[fieldName] = {
        type: zodType,
        required: !modifiers.includes('optional()'),
        modifiers: modifiers.trim()
      };
    }

    return fields;
  }

  /**
   * Extract API endpoints from router calls
   */
  private extractEndpoints(sourceFile: ts.SourceFile, baseRoute: string): APIEndpoint[] {
    const endpoints: APIEndpoint[] = [];
    const sourceText = sourceFile.getFullText();

    // Extract router method calls
    const routerPattern = /router\.(get|post|put|patch|delete)\(['"]([^'"]*)['"]/g;
    let match;

    while ((match = routerPattern.exec(sourceText)) !== null) {
      const method = match[1].toUpperCase();
      const routePath = match[2];
      const fullPath = this.constructFullPath(baseRoute, routePath);

      // Find the associated function to extract more details
      const endpointInfo = this.extractEndpointDetails(sourceText, match.index, method, routePath);

      endpoints.push({
        method,
        path: fullPath,
        ...endpointInfo
      });
    }

    return endpoints;
  }

  /**
   * Extract detailed endpoint information from the route handler
   */
  private extractEndpointDetails(sourceText: string, matchIndex: number, method: string, routePath: string): Partial<APIEndpoint> {
    // Extract JSDoc comment if present
    const beforeMatch = sourceText.substring(0, matchIndex);
    const jsdocMatch = beforeMatch.match(/\/\*\*[\s\S]*?\*\/\s*$/);

    let description: string | undefined;
    let tags: string[] = [];

    if (jsdocMatch) {
      const jsdoc = jsdocMatch[0];

      // Extract @desc or description
      const descMatch = jsdoc.match(/@desc\s+(.+)/);
      if (descMatch) {
        description = descMatch[1].trim();
      }

      // Extract @route for tags
      const routeMatch = jsdoc.match(/@route\s+(\w+)\s+(.+)/);
      if (routeMatch) {
        tags.push('documented');
      }

      // Check for @deprecated
      if (jsdoc.includes('@deprecated')) {
        tags.push('deprecated');
      }
    }

    // Extract middleware from the route definition
    const afterMatch = sourceText.substring(matchIndex);
    const routeDefMatch = afterMatch.match(/router\.\w+\([^,]+,\s*([^)]+)\)/);
    const middleware: string[] = [];

    if (routeDefMatch) {
      const middlewareText = routeDefMatch[1];

      // Common middleware patterns
      if (middlewareText.includes('requirePermission')) middleware.push('requirePermission');
      if (middlewareText.includes('requireRole')) middleware.push('requireRole');
      if (middlewareText.includes('requireSiteAccess')) middleware.push('requireSiteAccess');
      if (middlewareText.includes('requireProductionAccess')) middleware.push('requireProductionAccess');
      if (middlewareText.includes('authMiddleware')) middleware.push('authMiddleware');
      if (middlewareText.includes('asyncHandler')) middleware.push('asyncHandler');
    }

    return {
      description,
      middleware,
      tags,
      deprecated: tags.includes('deprecated')
    };
  }

  /**
   * Construct full API path
   */
  private constructFullPath(baseRoute: string, routePath: string): string {
    const basePath = '/api/v1';
    const fullPath = basePath + baseRoute + (routePath === '/' ? '' : routePath);
    return fullPath.replace(/\/+/g, '/'); // Remove duplicate slashes
  }

  /**
   * Infer business domain from module name
   */
  private inferBusinessDomain(moduleName: string): string {
    const domainMapping: Record<string, string> = {
      // Core Manufacturing
      'workOrders': 'Production Management',
      'workOrderExecution': 'Production Management',
      'routings': 'Production Management',
      'routingTemplates': 'Production Management',
      'productionSchedules': 'Production Management',
      'processSegments': 'Production Management',

      // Quality Management
      'quality': 'Quality Management',
      'fai': 'Quality Management',
      'inspectionPlans': 'Quality Management',
      'spc': 'Quality Management',
      'parameterLimits': 'Quality Management',
      'parameterGroups': 'Quality Management',
      'parameterFormulas': 'Quality Management',

      // Material Management
      'materials': 'Material Management',
      'traceability': 'Material Management',
      'serialization': 'Material Management',
      'products': 'Material Management',

      // Equipment & Assets
      'equipment': 'Equipment Management',
      'timeTracking': 'Time Tracking',
      'personnel': 'Personnel Management',

      // Document Management
      'workInstructions': 'Document Management',
      'setupSheets': 'Document Management',
      'sops': 'Document Management',
      'toolDrawings': 'Document Management',
      'unifiedDocuments': 'Document Management',
      'media': 'Document Management',
      'upload': 'Document Management',

      // Collaboration
      'comments': 'Collaboration',
      'annotations': 'Collaboration',
      'reviews': 'Collaboration',
      'notifications': 'Collaboration',
      'activities': 'Collaboration',
      'collaboration': 'Collaboration',

      // Workflow & Approvals
      'workflows': 'Workflow Management',
      'unifiedApprovals': 'Workflow Management',

      // Security & Access
      'auth': 'Authentication & Security',
      'sso': 'Authentication & Security',
      'ssoAdmin': 'Authentication & Security',
      'azureAdGraph': 'Authentication & Security',
      'audit': 'Authentication & Security',
      'signatures': 'Authentication & Security',

      // Administration
      'roles': 'Administration',
      'permissions': 'Administration',
      'roleTemplates': 'Administration',
      'user-roles': 'Administration',
      'role-permissions': 'Administration',

      // Integration
      'integrationRoutes': 'External Integration',
      'maximoRoutes': 'External Integration',
      'indysoftRoutes': 'External Integration',
      'covalentRoutes': 'External Integration',
      'shopFloorConnectRoutes': 'External Integration',
      'predatorPDMRoutes': 'External Integration',
      'predatorDNCRoutes': 'External Integration',
      'cmmRoutes': 'External Integration',
      'b2mRoutes': 'External Integration',
      'l2EquipmentRoutes': 'External Integration',
      'historianRoutes': 'External Integration',

      // Engineering
      'ecoRoutes': 'Engineering Change Management',

      // Analytics & Reporting
      'dashboard': 'Analytics & Reporting',
      'search': 'Analytics & Reporting',

      // Infrastructure
      'sites': 'Core Infrastructure',
      'presence': 'Core Infrastructure'
    };

    return domainMapping[moduleName] || 'Other';
  }

  /**
   * Extract module description from comments
   */
  private extractModuleDescription(sourceFile: ts.SourceFile): string | undefined {
    const sourceText = sourceFile.getFullText();

    // Look for file-level comments
    const fileCommentMatch = sourceText.match(/^\/\*\*[\s\S]*?\*\//);
    if (fileCommentMatch) {
      const comment = fileCommentMatch[0];

      // Extract description from comment
      const lines = comment.split('\n')
        .map(line => line.replace(/^\s*\*\s?/, '').trim())
        .filter(line => line && !line.startsWith('*') && !line.startsWith('/'));

      if (lines.length > 0) {
        return lines[0];
      }
    }

    return undefined;
  }

  /**
   * Calculate endpoint statistics by HTTP method
   */
  private calculateMethodStats(modules: RouteModule[]): Record<string, number> {
    const stats: Record<string, number> = {};

    modules.forEach(module => {
      module.endpoints.forEach(endpoint => {
        stats[endpoint.method] = (stats[endpoint.method] || 0) + 1;
      });
    });

    return stats;
  }

  /**
   * Calculate endpoint statistics by business domain
   */
  private calculateDomainStats(modules: RouteModule[]): Record<string, number> {
    const stats: Record<string, number> = {};

    modules.forEach(module => {
      stats[module.businessDomain] = (stats[module.businessDomain] || 0) + module.endpoints.length;
    });

    return stats;
  }

  /**
   * Calculate documentation coverage statistics
   */
  private calculateCoverage(modules: RouteModule[]): { documented: number; validated: number; total: number } {
    let documented = 0;
    let validated = 0;
    let total = 0;

    modules.forEach(module => {
      module.endpoints.forEach(endpoint => {
        total++;
        if (endpoint.description) documented++;
        if (endpoint.tags.includes('documented')) validated++;
      });
    });

    return { documented, validated, total };
  }

  /**
   * Export metadata to JSON file
   */
  async exportToFile(metadata: APIMetadata, outputPath: string): Promise<void> {
    const jsonData = JSON.stringify(metadata, null, 2);
    await fs.promises.writeFile(outputPath, jsonData, 'utf8');
    console.log(`✅ API metadata exported to: ${outputPath}`);
  }
}

export default APIMetadataExtractor;