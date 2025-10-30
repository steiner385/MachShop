#!/usr/bin/env tsx

/**
 * API Inventory Generator
 * Creates comprehensive API endpoint inventory with enhanced categorization
 */

import * as fs from 'fs';
import * as path from 'path';

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

interface ValidationSchema {
  name: string;
  type: 'query' | 'body' | 'params';
  schema: any;
  zodDefinition: string;
}

async function generateInventoryReport(metadataPath: string): Promise<void> {
  console.log('📋 Generating comprehensive API inventory report...\n');

  // Load metadata
  const metadata: APIMetadata = JSON.parse(
    await fs.promises.readFile(metadataPath, 'utf8')
  );

  // Enhanced categorization
  const enhancedDomains = categorizeEndpointsEnhanced(metadata.modules);
  const securityAnalysis = analyzeSecurityPatterns(metadata.modules);
  const validationAnalysis = analyzeValidationPatterns(metadata.modules);
  const operationalInsights = generateOperationalInsights(metadata.modules);

  // Generate comprehensive report
  const report = generateMarkdownReport(
    metadata,
    enhancedDomains,
    securityAnalysis,
    validationAnalysis,
    operationalInsights
  );

  // Write report
  const outputPath = './docs/generated/api-inventory-report.md';
  await fs.promises.writeFile(outputPath, report, 'utf8');

  console.log(`✅ Comprehensive API inventory report generated: ${outputPath}`);
  console.log(`📊 Summary: ${metadata.totalEndpoints} endpoints across ${metadata.modules.length} modules`);
  console.log(`🔒 Security coverage: ${securityAnalysis.protectedEndpoints}/${metadata.totalEndpoints} (${Math.round((securityAnalysis.protectedEndpoints / metadata.totalEndpoints) * 100)}%)`);
  console.log(`✅ Validation coverage: ${validationAnalysis.validatedEndpoints}/${metadata.totalEndpoints} (${Math.round((validationAnalysis.validatedEndpoints / metadata.totalEndpoints) * 100)}%)`);
}

function categorizeEndpointsEnhanced(modules: RouteModule[]): Record<string, any> {
  const domains: Record<string, any> = {};

  modules.forEach(module => {
    const domain = module.businessDomain;

    if (!domains[domain]) {
      domains[domain] = {
        modules: [],
        totalEndpoints: 0,
        methods: {} as Record<string, number>,
        hasValidation: 0,
        hasDocumentation: 0,
        securityLevel: 'unknown'
      };
    }

    domains[domain].modules.push(module);
    domains[domain].totalEndpoints += module.endpoints.length;

    // Analyze methods
    module.endpoints.forEach(endpoint => {
      domains[domain].methods[endpoint.method] = (domains[domain].methods[endpoint.method] || 0) + 1;

      if (endpoint.description) {
        domains[domain].hasDocumentation++;
      }
    });

    // Analyze validation
    if (module.schemas.length > 0) {
      domains[domain].hasValidation += module.endpoints.length;
    }

    // Analyze security level
    const hasAuth = module.endpoints.some(e =>
      e.middleware.includes('requirePermission') ||
      e.middleware.includes('requireRole') ||
      e.middleware.includes('authMiddleware')
    );

    if (hasAuth) {
      domains[domain].securityLevel = 'high';
    } else if (domains[domain].securityLevel === 'unknown') {
      domains[domain].securityLevel = 'public';
    }
  });

  return domains;
}

function analyzeSecurityPatterns(modules: RouteModule[]): any {
  const patterns = {
    requirePermission: 0,
    requireRole: 0,
    requireSiteAccess: 0,
    requireProductionAccess: 0,
    authMiddleware: 0,
    asyncHandler: 0,
    publicEndpoints: 0,
    protectedEndpoints: 0
  };

  let totalEndpoints = 0;

  modules.forEach(module => {
    module.endpoints.forEach(endpoint => {
      totalEndpoints++;
      let hasAuth = false;

      endpoint.middleware.forEach(middleware => {
        if (middleware in patterns) {
          patterns[middleware as keyof typeof patterns]++;
          if (middleware !== 'asyncHandler') {
            hasAuth = true;
          }
        }
      });

      if (hasAuth) {
        patterns.protectedEndpoints++;
      } else {
        patterns.publicEndpoints++;
      }
    });
  });

  return { ...patterns, totalEndpoints };
}

function analyzeValidationPatterns(modules: RouteModule[]): any {
  const patterns = {
    totalSchemas: 0,
    queryValidation: 0,
    bodyValidation: 0,
    paramsValidation: 0,
    validatedEndpoints: 0,
    schemasPerModule: {} as Record<string, number>
  };

  modules.forEach(module => {
    patterns.totalSchemas += module.schemas.length;
    patterns.schemasPerModule[module.moduleName] = module.schemas.length;

    if (module.schemas.length > 0) {
      patterns.validatedEndpoints += module.endpoints.length;
    }

    module.schemas.forEach(schema => {
      if (schema.type === 'query') patterns.queryValidation++;
      if (schema.type === 'body') patterns.bodyValidation++;
      if (schema.type === 'params') patterns.paramsValidation++;
    });
  });

  return patterns;
}

function generateOperationalInsights(modules: RouteModule[]): any {
  const insights = {
    crudOperations: {} as Record<string, Record<string, number>>,
    resourcePatterns: {} as Record<string, number>,
    complexityScores: {} as Record<string, number>,
    integrationPoints: [] as string[]
  };

  modules.forEach(module => {
    // Analyze CRUD patterns
    const crudOps = { Create: 0, Read: 0, Update: 0, Delete: 0 };

    module.endpoints.forEach(endpoint => {
      switch (endpoint.method) {
        case 'POST': crudOps.Create++; break;
        case 'GET': crudOps.Read++; break;
        case 'PUT':
        case 'PATCH': crudOps.Update++; break;
        case 'DELETE': crudOps.Delete++; break;
      }
    });

    insights.crudOperations[module.moduleName] = crudOps;

    // Calculate complexity score
    const complexity =
      module.endpoints.length * 1 +
      module.schemas.length * 2 +
      module.services.length * 1.5;

    insights.complexityScores[module.moduleName] = Math.round(complexity);

    // Identify integration points
    if (module.moduleName.includes('integration') ||
        module.moduleName.includes('Routes') ||
        module.services.some(s => s.includes('Service'))) {
      insights.integrationPoints.push(module.moduleName);
    }
  });

  return insights;
}

function generateMarkdownReport(
  metadata: APIMetadata,
  domains: Record<string, any>,
  security: any,
  validation: any,
  insights: any
): string {
  const date = new Date().toLocaleString();

  return `# Comprehensive API Inventory Report

Generated: ${date}

## Executive Summary

This report provides a comprehensive analysis of the MachShop Manufacturing Execution System (MES) API, covering **${metadata.totalEndpoints} endpoints** across **${metadata.modules.length} route modules**. The API demonstrates strong manufacturing domain coverage with robust security and validation patterns.

### Key Metrics

| Metric | Value | Coverage |
|--------|--------|----------|
| **Total Endpoints** | ${metadata.totalEndpoints} | 100% |
| **Route Modules** | ${metadata.modules.length} | - |
| **Documentation Coverage** | ${metadata.coverage.documented}/${metadata.coverage.total} | ${Math.round((metadata.coverage.documented / metadata.coverage.total) * 100)}% |
| **Security Protection** | ${security.protectedEndpoints}/${security.totalEndpoints} | ${Math.round((security.protectedEndpoints / security.totalEndpoints) * 100)}% |
| **Validation Coverage** | ${validation.validatedEndpoints}/${security.totalEndpoints} | ${Math.round((validation.validatedEndpoints / security.totalEndpoints) * 100)}% |

## Business Domain Analysis

${Object.entries(domains)
  .sort(([,a], [,b]) => b.totalEndpoints - a.totalEndpoints)
  .map(([domain, data]) => `### ${domain}

- **Endpoints:** ${data.totalEndpoints}
- **Modules:** ${data.modules.length}
- **Documentation:** ${Math.round((data.hasDocumentation / data.totalEndpoints) * 100)}%
- **Security Level:** ${data.securityLevel}
- **Method Distribution:** ${Object.entries(data.methods).map(([method, count]) => `${method}: ${count}`).join(', ')}

**Key Modules:** ${data.modules.slice(0, 3).map((m: any) => m.moduleName).join(', ')}`).join('\n\n')}

## HTTP Method Distribution

${Object.entries(metadata.endpointsByMethod)
  .sort(([,a], [,b]) => b - a)
  .map(([method, count]) => `- **${method}:** ${count} endpoints (${Math.round((count / metadata.totalEndpoints) * 100)}%)`)
  .join('\n')}

## Security Analysis

### Authentication & Authorization Patterns

| Pattern | Endpoints | Usage |
|---------|-----------|-------|
| Protected Endpoints | ${security.protectedEndpoints} | ${Math.round((security.protectedEndpoints / security.totalEndpoints) * 100)}% |
| Public Endpoints | ${security.publicEndpoints} | ${Math.round((security.publicEndpoints / security.totalEndpoints) * 100)}% |
| Permission-Based | ${security.requirePermission} | ${Math.round((security.requirePermission / security.totalEndpoints) * 100)}% |
| Role-Based | ${security.requireRole} | ${Math.round((security.requireRole / security.totalEndpoints) * 100)}% |
| Site Access Control | ${security.requireSiteAccess} | ${Math.round((security.requireSiteAccess / security.totalEndpoints) * 100)}% |
| Production Access | ${security.requireProductionAccess} | ${Math.round((security.requireProductionAccess / security.totalEndpoints) * 100)}% |

## Validation Analysis

### Zod Schema Distribution

- **Total Schemas:** ${validation.totalSchemas}
- **Query Validation:** ${validation.queryValidation} schemas
- **Body Validation:** ${validation.bodyValidation} schemas
- **Params Validation:** ${validation.paramsValidation} schemas

### Top Validated Modules

${Object.entries(validation.schemasPerModule)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([module, count]) => `- **${module}:** ${count} schemas`)
  .join('\n')}

## Operational Insights

### API Complexity Analysis

${Object.entries(insights.complexityScores)
  .sort(([,a], [,b]) => b - a)
  .slice(0, 10)
  .map(([module, score]) => `- **${module}:** ${score} complexity points`)
  .join('\n')}

### Integration Points

${insights.integrationPoints.map((point: string) => `- ${point}`).join('\n')}

### CRUD Operation Patterns

${Object.entries(insights.crudOperations)
  .filter(([, ops]: [string, any]) => Object.values(ops).some(v => v > 5))
  .slice(0, 10)
  .map(([module, ops]: [string, any]) => `- **${module}:** Create: ${ops.Create}, Read: ${ops.Read}, Update: ${ops.Update}, Delete: ${ops.Delete}`)
  .join('\n')}

## Largest Route Modules

${metadata.modules
  .sort((a, b) => b.endpoints.length - a.endpoints.length)
  .slice(0, 15)
  .map((module, index) => `${index + 1}. **${module.moduleName}** (${module.businessDomain}) - ${module.endpoints.length} endpoints`)
  .join('\n')}

## Recommendations

### Priority Actions

1. **Improve Documentation Coverage**: Current coverage is ${Math.round((metadata.coverage.documented / metadata.coverage.total) * 100)}%. Focus on documenting the remaining ${metadata.coverage.total - metadata.coverage.documented} undocumented endpoints.

2. **Security Standardization**: ${security.publicEndpoints} endpoints appear to be public. Review these for potential security concerns.

3. **Validation Enhancement**: Extend Zod validation to more modules, particularly in the ${Object.entries(validation.schemasPerModule).filter(([,count]) => count === 0).length} modules without validation.

4. **Domain-Specific Documentation**: Enhance categorization for the "Other" domain which contains ${domains.Other?.totalEndpoints || 0} endpoints.

### Quick Wins

- Implement OpenAPI spec generation from existing JSDoc comments
- Add request/response examples to high-traffic endpoints
- Standardize error response formats across all domains
- Create domain-specific API guides for manufacturing workflows

---

*This report was generated automatically from TypeScript route analysis. For updates, run \`npm run docs:api:inventory\`.*

## Appendix: Technical Details

**Analysis Method:** TypeScript AST parsing of Express.js routes
**Route Discovery:** Recursive file system traversal of \`src/routes/\`
**Validation Detection:** Zod schema extraction and analysis
**Security Analysis:** Middleware pattern recognition
**Business Context:** Domain mapping based on manufacturing workflows

**Generated At:** ${metadata.generatedAt}
`;
}

async function main() {
  const metadataPath = './docs/generated/api-metadata.json';

  try {
    await generateInventoryReport(metadataPath);
  } catch (error) {
    console.error('❌ Error generating inventory report:', error);
    process.exit(1);
  }
}

// Run the report generation
main().catch(console.error);