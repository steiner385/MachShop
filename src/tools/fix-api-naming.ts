#!/usr/bin/env tsx

/**
 * Fix API Naming Issues
 * Generates specific, meaningful, and unique operation names and descriptions
 */

import * as fs from 'fs';

interface OperationNamingRule {
  pathPattern: RegExp;
  method: string;
  summaryTemplate: string;
  businessContext: string;
  domain: string;
  description: string;
}

class APINameFixer {
  private namingRules: OperationNamingRule[] = [
    // Work Orders
    {
      pathPattern: /^\/workorders$/,
      method: 'GET',
      summaryTemplate: 'List work orders',
      businessContext: 'Production work order management and tracking',
      domain: 'Production Management',
      description: 'Retrieve paginated list of manufacturing work orders with filtering and sorting capabilities'
    },
    {
      pathPattern: /^\/workorders$/,
      method: 'POST',
      summaryTemplate: 'Create new work order',
      businessContext: 'Production work order creation and planning',
      domain: 'Production Management',
      description: 'Create a new manufacturing work order for production scheduling and execution'
    },
    {
      pathPattern: /^\/workorders\/([^\/]+)$/,
      method: 'GET',
      summaryTemplate: 'Get work order details',
      businessContext: 'Work order information retrieval',
      domain: 'Production Management',
      description: 'Retrieve detailed information for a specific work order including status, progress, and operations'
    },
    {
      pathPattern: /^\/workorders\/([^\/]+)$/,
      method: 'PUT',
      summaryTemplate: 'Update work order',
      businessContext: 'Work order modification and status updates',
      domain: 'Production Management',
      description: 'Update work order information, status, or operational details'
    },
    {
      pathPattern: /^\/workorders\/([^\/]+)\/operations$/,
      method: 'GET',
      summaryTemplate: 'List work order operations',
      businessContext: 'Manufacturing operation sequence management',
      domain: 'Production Management',
      description: 'Retrieve the sequence of manufacturing operations for a specific work order'
    },

    // Activities/Audit Logging
    {
      pathPattern: /^\/activities$/,
      method: 'POST',
      summaryTemplate: 'Log system activity',
      businessContext: 'Audit trail and activity logging',
      domain: 'Audit & Compliance',
      description: 'Record a new system activity or audit event for compliance tracking'
    },
    {
      pathPattern: /^\/activities\/user\/([^\/]+)$/,
      method: 'GET',
      summaryTemplate: 'Get user activity history',
      businessContext: 'User action tracking and audit',
      domain: 'Audit & Compliance',
      description: 'Retrieve activity history and audit trail for a specific user'
    },
    {
      pathPattern: /^\/activities\/document\/([^\/]+)\/([^\/]+)$/,
      method: 'GET',
      summaryTemplate: 'Get document activity log',
      businessContext: 'Document change tracking and audit',
      domain: 'Audit & Compliance',
      description: 'Retrieve activity history for a specific document including all changes and access events'
    },
    {
      pathPattern: /^\/activities\/feed$/,
      method: 'GET',
      summaryTemplate: 'Get activity feed',
      businessContext: 'Real-time activity monitoring',
      domain: 'Audit & Compliance',
      description: 'Retrieve real-time feed of system activities and events for monitoring dashboard'
    },

    // Materials
    {
      pathPattern: /^\/materials$/,
      method: 'GET',
      summaryTemplate: 'List materials',
      businessContext: 'Material inventory and catalog management',
      domain: 'Material Management',
      description: 'Retrieve paginated list of materials with inventory levels and specifications'
    },
    {
      pathPattern: /^\/materials\/classes$/,
      method: 'GET',
      summaryTemplate: 'List material classes',
      businessContext: 'Material classification and hierarchy',
      domain: 'Material Management',
      description: 'Retrieve material classification hierarchy for organizing inventory and specs'
    },
    {
      pathPattern: /^\/materials\/([^\/]+)\/lot-tracking$/,
      method: 'GET',
      summaryTemplate: 'Get material lot tracking',
      businessContext: 'Material traceability and lot tracking',
      domain: 'Material Management',
      description: 'Retrieve complete lot tracking history for material traceability and compliance'
    },

    // Quality Management
    {
      pathPattern: /^\/fai$/,
      method: 'GET',
      summaryTemplate: 'List first article inspections',
      businessContext: 'First Article Inspection (FAI) management',
      domain: 'Quality Management',
      description: 'Retrieve list of First Article Inspections with status and results'
    },
    {
      pathPattern: /^\/fai$/,
      method: 'POST',
      summaryTemplate: 'Create first article inspection',
      businessContext: 'Quality control and FAI process initiation',
      domain: 'Quality Management',
      description: 'Create new First Article Inspection for quality validation of new parts or processes'
    },
    {
      pathPattern: /^\/fai\/([^\/]+)\/approve$/,
      method: 'POST',
      summaryTemplate: 'Approve first article inspection',
      businessContext: 'Quality approval and certification process',
      domain: 'Quality Management',
      description: 'Approve completed First Article Inspection and authorize production'
    },

    // Equipment Management
    {
      pathPattern: /^\/equipment$/,
      method: 'GET',
      summaryTemplate: 'List equipment',
      businessContext: 'Manufacturing equipment inventory and status',
      domain: 'Equipment Management',
      description: 'Retrieve list of manufacturing equipment with operational status and utilization'
    },
    {
      pathPattern: /^\/equipment\/([^\/]+)\/maintenance$/,
      method: 'GET',
      summaryTemplate: 'Get equipment maintenance history',
      businessContext: 'Equipment maintenance tracking and scheduling',
      domain: 'Equipment Management',
      description: 'Retrieve maintenance history and schedule for specific equipment'
    },
    {
      pathPattern: /^\/equipment\/([^\/]+)\/performance$/,
      method: 'GET',
      summaryTemplate: 'Get equipment performance metrics',
      businessContext: 'Equipment efficiency and OEE monitoring',
      domain: 'Equipment Management',
      description: 'Retrieve performance metrics including OEE, utilization, and efficiency data'
    },

    // Dashboard and Analytics
    {
      pathPattern: /^\/dashboard\/kpis$/,
      method: 'GET',
      summaryTemplate: 'Get dashboard KPI metrics',
      businessContext: 'Manufacturing performance monitoring',
      domain: 'Analytics & Reporting',
      description: 'Retrieve key performance indicators for manufacturing dashboard including production metrics'
    },
    {
      pathPattern: /^\/dashboard\/recent-work-orders$/,
      method: 'GET',
      summaryTemplate: 'Get recent work orders summary',
      businessContext: 'Production status monitoring',
      domain: 'Analytics & Reporting',
      description: 'Retrieve summary of recently active work orders for production oversight'
    },
    {
      pathPattern: /^\/dashboard\/alerts$/,
      method: 'GET',
      summaryTemplate: 'Get system alerts',
      businessContext: 'System monitoring and alerting',
      domain: 'Analytics & Reporting',
      description: 'Retrieve current system alerts and notifications for operational awareness'
    },

    // Authentication
    {
      pathPattern: /^\/auth\/login$/,
      method: 'POST',
      summaryTemplate: 'Authenticate user login',
      businessContext: 'User authentication and session management',
      domain: 'Authentication & Security',
      description: 'Authenticate user credentials and establish secure session with JWT token'
    },
    {
      pathPattern: /^\/auth\/refresh$/,
      method: 'POST',
      summaryTemplate: 'Refresh authentication token',
      businessContext: 'Token renewal and session extension',
      domain: 'Authentication & Security',
      description: 'Refresh expired JWT token to maintain secure session'
    },

    // Personnel Management
    {
      pathPattern: /^\/personnel$/,
      method: 'GET',
      summaryTemplate: 'List personnel',
      businessContext: 'Workforce management and personnel tracking',
      domain: 'Personnel Management',
      description: 'Retrieve list of personnel with skills, certifications, and availability'
    },
    {
      pathPattern: /^\/personnel\/([^\/]+)\/certifications$/,
      method: 'GET',
      summaryTemplate: 'Get personnel certifications',
      businessContext: 'Skill and certification tracking',
      domain: 'Personnel Management',
      description: 'Retrieve certifications and qualifications for specific personnel'
    }
  ];

  async fixApiNaming(): Promise<void> {
    console.log('🔧 Fixing API naming issues...\n');

    // Read the current OpenAPI spec
    const specPath = './docs/api/openapi-spec.json';
    const spec = JSON.parse(await fs.promises.readFile(specPath, 'utf8'));

    let fixedCount = 0;
    let totalEndpoints = 0;

    // Process each path
    for (const [pathKey, pathItem] of Object.entries(spec.paths) as [string, any][]) {
      for (const [method, operation] of Object.entries(pathItem) as [string, any][]) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue;

        totalEndpoints++;
        const rule = this.findMatchingRule(pathKey, method.toUpperCase());

        if (rule) {
          // Apply the naming rule
          operation.summary = rule.summaryTemplate;
          operation.description = this.generateDetailedDescription(rule, pathKey, method);
          operation.tags = [rule.domain];

          // Update business context in description
          if (operation.description && !operation.description.includes('Business Domain:')) {
            operation.description += `\n\n**Business Domain:** ${rule.domain}\n**Manufacturing Context:** ${rule.businessContext}`;
          } else {
            operation.description = operation.description.replace(
              /\*\*Business Domain:\*\* [^\n]+/,
              `**Business Domain:** ${rule.domain}`
            ).replace(
              /\*\*Manufacturing Context:\*\* [^\n]+/,
              `**Manufacturing Context:** ${rule.businessContext}`
            );
          }

          fixedCount++;
          console.log(`✅ Fixed: ${method.toUpperCase()} ${pathKey} -> "${rule.summaryTemplate}"`);
        } else {
          // Generate a better generic name
          const improved = this.generateImprovedGenericName(pathKey, method);
          operation.summary = improved.summary;
          operation.description = improved.description;
          operation.tags = [improved.domain];

          console.log(`🔄 Improved: ${method.toUpperCase()} ${pathKey} -> "${improved.summary}"`);
          fixedCount++;
        }
      }
    }

    // Write the updated spec
    await fs.promises.writeFile(specPath, JSON.stringify(spec, null, 2), 'utf8');

    console.log(`\n🎉 API naming fix completed!`);
    console.log(`   📊 Total endpoints: ${totalEndpoints}`);
    console.log(`   ✅ Fixed/improved: ${fixedCount}`);
    console.log(`   📈 Success rate: ${Math.round((fixedCount / totalEndpoints) * 100)}%`);
  }

  private findMatchingRule(path: string, method: string): OperationNamingRule | null {
    return this.namingRules.find(rule =>
      rule.pathPattern.test(path) && rule.method === method
    ) || null;
  }

  private generateDetailedDescription(rule: OperationNamingRule, path: string, method: string): string {
    let description = rule.description;

    // Add parameter context for parameterized paths
    const paramMatches = path.match(/:(\w+)/g);
    if (paramMatches) {
      const paramNames = paramMatches.map(p => p.substring(1));
      description += `\n\n**Parameters:** ${paramNames.join(', ')}`;
    }

    // Add method-specific context
    if (method.toUpperCase() === 'GET' && path.includes('/:')) {
      description += '\n**Returns:** Single resource with detailed information';
    } else if (method.toUpperCase() === 'GET') {
      description += '\n**Returns:** Collection of resources with pagination support';
    } else if (method.toUpperCase() === 'POST') {
      description += '\n**Returns:** Created resource with generated ID';
    } else if (method.toUpperCase() === 'PUT') {
      description += '\n**Returns:** Updated resource with modifications';
    }

    return description;
  }

  private generateImprovedGenericName(path: string, method: string): {summary: string, description: string, domain: string} {
    // Extract meaningful parts from the path
    const pathParts = path.split('/').filter(part => part && !part.startsWith(':'));
    const lastPart = pathParts[pathParts.length - 1] || pathParts[pathParts.length - 2] || 'resource';

    // Clean up the resource name
    const resourceName = this.humanizeResourceName(lastPart);

    // Generate action-specific summary
    const action = this.getActionName(method, path);
    const summary = `${action} ${resourceName}`;

    // Generate description
    const description = this.generateGenericDescription(action, resourceName, path, method);

    // Infer domain
    const domain = this.inferDomainFromPath(path);

    return { summary, description, domain };
  }

  private humanizeResourceName(resourceName: string): string {
    // Convert from various naming conventions to human readable
    return resourceName
      .replace(/([A-Z])/g, ' $1') // camelCase to spaces
      .replace(/[-_]/g, ' ') // kebab-case and snake_case to spaces
      .toLowerCase()
      .replace(/\b\w/g, l => l.toUpperCase()) // capitalize words
      .trim();
  }

  private getActionName(method: string, path: string): string {
    const hasParams = path.includes('/:');

    switch (method.toUpperCase()) {
      case 'GET':
        return hasParams ? 'Get' : 'List';
      case 'POST':
        return 'Create';
      case 'PUT':
        return 'Update';
      case 'PATCH':
        return 'Modify';
      case 'DELETE':
        return 'Delete';
      default:
        return 'Process';
    }
  }

  private generateGenericDescription(action: string, resourceName: string, path: string, method: string): string {
    const hasParams = path.includes('/:');

    let description = `${action} ${resourceName.toLowerCase()}`;

    if (method.toUpperCase() === 'GET' && hasParams) {
      description += ' with detailed information and related data';
    } else if (method.toUpperCase() === 'GET') {
      description += ' with filtering, sorting, and pagination support';
    } else if (method.toUpperCase() === 'POST') {
      description += ' with validation and business rule enforcement';
    } else if (method.toUpperCase() === 'PUT') {
      description += ' with complete resource replacement and validation';
    } else if (method.toUpperCase() === 'PATCH') {
      description += ' with partial updates and field-level validation';
    } else if (method.toUpperCase() === 'DELETE') {
      description += ' with cascade handling and cleanup operations';
    }

    return description;
  }

  private inferDomainFromPath(path: string): string {
    const pathLower = path.toLowerCase();

    if (pathLower.includes('workorder') || pathLower.includes('production') || pathLower.includes('schedule')) {
      return 'Production Management';
    } else if (pathLower.includes('material') || pathLower.includes('inventory') || pathLower.includes('bom')) {
      return 'Material Management';
    } else if (pathLower.includes('quality') || pathLower.includes('fai') || pathLower.includes('inspection')) {
      return 'Quality Management';
    } else if (pathLower.includes('equipment') || pathLower.includes('machine') || pathLower.includes('tool')) {
      return 'Equipment Management';
    } else if (pathLower.includes('personnel') || pathLower.includes('user') || pathLower.includes('employee')) {
      return 'Personnel Management';
    } else if (pathLower.includes('auth') || pathLower.includes('login') || pathLower.includes('permission')) {
      return 'Authentication & Security';
    } else if (pathLower.includes('dashboard') || pathLower.includes('analytics') || pathLower.includes('report')) {
      return 'Analytics & Reporting';
    } else if (pathLower.includes('document') || pathLower.includes('instruction') || pathLower.includes('approval')) {
      return 'Document Management';
    } else if (pathLower.includes('activity') || pathLower.includes('audit') || pathLower.includes('log')) {
      return 'Audit & Compliance';
    } else {
      return 'Core Operations';
    }
  }

  async generateNamingReport(): Promise<void> {
    console.log('\n📊 Generating naming improvement report...');

    const spec = JSON.parse(await fs.promises.readFile('./docs/api/openapi-spec.json', 'utf8'));
    const summaries = new Map<string, number>();
    let totalEndpoints = 0;

    // Count summary frequencies
    for (const [pathKey, pathItem] of Object.entries(spec.paths) as [string, any][]) {
      for (const [method, operation] of Object.entries(pathItem) as [string, any][]) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue;

        totalEndpoints++;
        const summary = operation.summary || 'Unnamed';
        summaries.set(summary, (summaries.get(summary) || 0) + 1);
      }
    }

    // Find duplicates
    const duplicates = Array.from(summaries.entries())
      .filter(([summary, count]) => count > 1)
      .sort((a, b) => b[1] - a[1]);

    console.log(`\n📈 Naming Quality Report:`);
    console.log(`   Total endpoints: ${totalEndpoints}`);
    console.log(`   Unique names: ${summaries.size}`);
    console.log(`   Duplicate names: ${duplicates.length}`);
    console.log(`   Uniqueness rate: ${Math.round(((summaries.size - duplicates.length) / summaries.size) * 100)}%`);

    if (duplicates.length > 0) {
      console.log(`\n❌ Most common duplicate names:`);
      duplicates.slice(0, 10).forEach(([summary, count]) => {
        console.log(`   "${summary}" appears ${count} times`);
      });
    } else {
      console.log(`\n✅ All API names are unique!`);
    }
  }
}

async function main() {
  console.log('🏷️  Starting API naming improvement...\n');

  try {
    const fixer = new APINameFixer();

    // Generate initial report
    await fixer.generateNamingReport();

    // Fix the naming issues
    await fixer.fixApiNaming();

    // Generate final report
    await fixer.generateNamingReport();

  } catch (error) {
    console.error('❌ Error fixing API naming:', error);
    process.exit(1);
  }
}

main().catch(console.error);