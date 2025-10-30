#!/usr/bin/env tsx

/**
 * Categorize APIs in "Other" Category
 * Analyze and recategorize APIs that are currently in the generic "Other" domain
 */

import * as fs from 'fs';

interface APIEndpoint {
  path: string;
  method: string;
  summary: string;
  currentTag: string;
  suggestedCategory: string;
  confidence: 'high' | 'medium' | 'low';
  reasoning: string;
}

interface CategoryRule {
  name: string;
  description: string;
  pathPatterns: RegExp[];
  summaryPatterns: RegExp[];
  examples: string[];
}

class APICategorizer {
  private categoryRules: CategoryRule[] = [
    {
      name: 'Document Management',
      description: 'Document control, work instructions, setup sheets, and technical documentation',
      pathPatterns: [
        /\/unified-documents/,
        /\/work-instructions/,
        /\/setup-sheets/,
        /\/documents/,
        /\/annotations/,
        /\/comments/,
        /\/media/,
        /\/collaboration/
      ],
      summaryPatterns: [
        /document/i,
        /instruction/i,
        /setup.*sheet/i,
        /annotation/i,
        /comment/i,
        /media/i,
        /collaboration/i
      ],
      examples: ['Work instructions', 'Setup sheets', 'Document annotations', 'Media management']
    },
    {
      name: 'Workflow Management',
      description: 'Approval workflows, review processes, and automated business processes',
      pathPatterns: [
        /\/workflows/,
        /\/approvals/,
        /\/unified-approvals/,
        /\/eco-routes/,
        /\/notifications/
      ],
      summaryPatterns: [
        /workflow/i,
        /approval/i,
        /review/i,
        /notification/i,
        /eco/i
      ],
      examples: ['Engineering Change Orders', 'Document approvals', 'Review workflows', 'Notifications']
    },
    {
      name: 'Integration & External Systems',
      description: 'Third-party integrations, data exchange, and external system interfaces',
      pathPatterns: [
        /\/b2m-routes/,
        /\/maximo-routes/,
        /\/predator/,
        /\/indysoft-routes/,
        /\/covalent-routes/,
        /\/cmm-routes/,
        /\/historian-routes/,
        /\/l2-equipment-routes/,
        /\/integration-routes/
      ],
      summaryPatterns: [
        /integration/i,
        /sync/i,
        /export/i,
        /import/i,
        /external/i,
        /route/i
      ],
      examples: ['ERP integration', 'Equipment data collection', 'External system synchronization']
    },
    {
      name: 'Configuration & Administration',
      description: 'System configuration, parameter management, and administrative functions',
      pathPatterns: [
        /\/parameter/,
        /\/roles/,
        /\/permissions/,
        /\/role-templates/,
        /\/user-roles/,
        /\/role-permissions/,
        /\/azure-ad/
      ],
      summaryPatterns: [
        /parameter/i,
        /role/i,
        /permission/i,
        /config/i,
        /setting/i,
        /admin/i,
        /template/i
      ],
      examples: ['User roles', 'System parameters', 'Permission management', 'Configuration templates']
    },
    {
      name: 'Real-time Operations',
      description: 'Real-time monitoring, presence tracking, and live operational data',
      pathPatterns: [
        /\/presence/,
        /\/collaboration\/sessions/,
        /\/collaboration\/state/,
        /\/time-tracking/
      ],
      summaryPatterns: [
        /presence/i,
        /session/i,
        /real.*time/i,
        /live/i,
        /tracking/i
      ],
      examples: ['User presence', 'Active sessions', 'Real-time collaboration', 'Time tracking']
    },
    {
      name: 'Data Analytics & Reporting',
      description: 'Advanced analytics, custom reports, and data visualization beyond basic dashboards',
      pathPatterns: [
        /\/reports/,
        /\/analytics/,
        /\/statistics/,
        /\/trends/,
        /\/metrics/
      ],
      summaryPatterns: [
        /report/i,
        /analytic/i,
        /statistic/i,
        /trend/i,
        /metric/i
      ],
      examples: ['Custom reports', 'Statistical analysis', 'Trend analytics', 'Performance metrics']
    },
    {
      name: 'Search & Discovery',
      description: 'Search functionality, content discovery, and information retrieval',
      pathPatterns: [
        /\/search/,
        /\/query/,
        /\/find/
      ],
      summaryPatterns: [
        /search/i,
        /query/i,
        /find/i,
        /discover/i,
        /lookup/i
      ],
      examples: ['Global search', 'Content discovery', 'Data queries', 'Information lookup']
    },
    {
      name: 'Process Control & Automation',
      description: 'Manufacturing process control, automation sequences, and process data',
      pathPatterns: [
        /\/process/,
        /\/automation/,
        /\/sequences/,
        /\/control/
      ],
      summaryPatterns: [
        /process.*control/i,
        /automation/i,
        /sequence/i,
        /control/i
      ],
      examples: ['Process automation', 'Control sequences', 'Process data collection']
    }
  ];

  async analyzeCategorization(): Promise<void> {
    console.log('🔍 Analyzing APIs currently in "Other" category...\n');

    // Load OpenAPI specification
    const spec = JSON.parse(await fs.promises.readFile('./docs/api/openapi-spec.json', 'utf8'));
    const paths = spec.paths || {};

    const otherEndpoints: APIEndpoint[] = [];
    const categorizedEndpoints: APIEndpoint[] = [];

    // Find all endpoints currently tagged as "Other"
    for (const [pathKey, pathItem] of Object.entries(paths) as [string, any][]) {
      for (const [method, operation] of Object.entries(pathItem) as [string, any][]) {
        if (!['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) continue;

        const tags = operation.tags || [];
        if (tags.includes('Other') || tags.includes('Core Operations')) {
          const endpoint: APIEndpoint = {
            path: pathKey,
            method: method.toUpperCase(),
            summary: operation.summary || 'Unnamed',
            currentTag: tags[0] || 'Other',
            suggestedCategory: 'Other',
            confidence: 'low',
            reasoning: 'No clear categorization found'
          };

          const suggestion = this.suggestCategory(pathKey, operation.summary);
          if (suggestion) {
            endpoint.suggestedCategory = suggestion.category;
            endpoint.confidence = suggestion.confidence;
            endpoint.reasoning = suggestion.reasoning;
            categorizedEndpoints.push(endpoint);
          } else {
            otherEndpoints.push(endpoint);
          }
        }
      }
    }

    // Generate categorization report
    await this.generateCategorizationReport(categorizedEndpoints, otherEndpoints);

    // Apply the new categorizations
    await this.applyCategorizations(categorizedEndpoints);
  }

  private suggestCategory(path: string, summary: string): {category: string, confidence: 'high' | 'medium' | 'low', reasoning: string} | null {
    const pathLower = path.toLowerCase();
    const summaryLower = (summary || '').toLowerCase();

    // Try to match against category rules
    for (const rule of this.categoryRules) {
      let pathMatch = false;
      let summaryMatch = false;
      let matchedPatterns: string[] = [];

      // Check path patterns
      for (const pattern of rule.pathPatterns) {
        if (pattern.test(pathLower)) {
          pathMatch = true;
          matchedPatterns.push(`path: ${pattern.source}`);
          break;
        }
      }

      // Check summary patterns
      for (const pattern of rule.summaryPatterns) {
        if (pattern.test(summaryLower)) {
          summaryMatch = true;
          matchedPatterns.push(`summary: ${pattern.source}`);
          break;
        }
      }

      // Determine confidence based on matches
      if (pathMatch && summaryMatch) {
        return {
          category: rule.name,
          confidence: 'high',
          reasoning: `Strong match - ${matchedPatterns.join(', ')}`
        };
      } else if (pathMatch || summaryMatch) {
        return {
          category: rule.name,
          confidence: 'medium',
          reasoning: `Partial match - ${matchedPatterns.join(', ')}`
        };
      }
    }

    // Try some additional specific patterns
    const specificRules = [
      {
        patterns: [/audit/, /log/, /activity/],
        category: 'Audit & Compliance',
        reasoning: 'Audit and logging functionality'
      },
      {
        patterns: [/health/, /status/, /ping/],
        category: 'System Health & Monitoring',
        reasoning: 'System health and status monitoring'
      },
      {
        patterns: [/test/, /validate/, /check/],
        category: 'Testing & Validation',
        reasoning: 'Testing and validation operations'
      }
    ];

    for (const rule of specificRules) {
      for (const pattern of rule.patterns) {
        if (pattern.test(pathLower) || pattern.test(summaryLower)) {
          return {
            category: rule.category,
            confidence: 'medium',
            reasoning: rule.reasoning
          };
        }
      }
    }

    return null;
  }

  private async generateCategorizationReport(categorized: APIEndpoint[], remaining: APIEndpoint[]): Promise<void> {
    console.log('📊 Categorization Analysis Report');
    console.log('================================\n');

    console.log(`📈 Summary:`);
    console.log(`   Total "Other" endpoints analyzed: ${categorized.length + remaining.length}`);
    console.log(`   Successfully categorized: ${categorized.length}`);
    console.log(`   Remaining in "Other": ${remaining.length}`);
    console.log(`   Success rate: ${Math.round((categorized.length / (categorized.length + remaining.length)) * 100)}%`);
    console.log('');

    // Group by suggested category
    const categoryGroups = new Map<string, APIEndpoint[]>();
    categorized.forEach(endpoint => {
      if (!categoryGroups.has(endpoint.suggestedCategory)) {
        categoryGroups.set(endpoint.suggestedCategory, []);
      }
      categoryGroups.get(endpoint.suggestedCategory)!.push(endpoint);
    });

    console.log('🏷️  Suggested Categories:');
    for (const [category, endpoints] of categoryGroups.entries()) {
      console.log(`\n   📂 ${category} (${endpoints.length} endpoints):`);

      endpoints.slice(0, 5).forEach(endpoint => {
        const confidence = endpoint.confidence === 'high' ? '🟢' : endpoint.confidence === 'medium' ? '🟡' : '🔴';
        console.log(`      ${confidence} ${endpoint.method} ${endpoint.path}`);
        console.log(`         "${endpoint.summary}"`);
        console.log(`         Reasoning: ${endpoint.reasoning}`);
      });

      if (endpoints.length > 5) {
        console.log(`      ... and ${endpoints.length - 5} more`);
      }
    }

    if (remaining.length > 0) {
      console.log(`\n❓ Remaining uncategorized (${remaining.length}):`);
      remaining.slice(0, 10).forEach(endpoint => {
        console.log(`   • ${endpoint.method} ${endpoint.path} - "${endpoint.summary}"`);
      });
      if (remaining.length > 10) {
        console.log(`   ... and ${remaining.length - 10} more`);
      }
    }

    // Export detailed report
    const report = {
      summary: {
        totalAnalyzed: categorized.length + remaining.length,
        categorized: categorized.length,
        remaining: remaining.length,
        successRate: Math.round((categorized.length / (categorized.length + remaining.length)) * 100)
      },
      categorizedEndpoints: categorized,
      remainingEndpoints: remaining,
      suggestedCategories: Array.from(categoryGroups.keys()).map(category => ({
        name: category,
        count: categoryGroups.get(category)!.length,
        endpoints: categoryGroups.get(category)!
      })),
      generatedAt: new Date().toISOString()
    };

    const outputPath = './docs/generated/categorization-analysis.json';
    await fs.promises.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`\n📄 Detailed analysis exported: ${outputPath}`);
  }

  private async applyCategorizations(endpoints: APIEndpoint[]): Promise<void> {
    console.log('\n🔧 Applying new categorizations to OpenAPI specification...');

    const spec = JSON.parse(await fs.promises.readFile('./docs/api/openapi-spec.json', 'utf8'));
    let updatedCount = 0;

    // Apply the new categorizations
    for (const endpoint of endpoints) {
      const pathItem = spec.paths[endpoint.path];
      if (pathItem && pathItem[endpoint.method.toLowerCase()]) {
        const operation = pathItem[endpoint.method.toLowerCase()];

        // Update the tag
        operation.tags = [endpoint.suggestedCategory];

        // Update the description to include the new business domain
        if (operation.description) {
          operation.description = operation.description.replace(
            /\*\*Business Domain:\*\* [^\n]+/,
            `**Business Domain:** ${endpoint.suggestedCategory}`
          );
        }

        updatedCount++;
      }
    }

    // Update the tags section to include new categories
    if (!spec.tags) spec.tags = [];

    const existingTags = new Set(spec.tags.map((tag: any) => tag.name));
    const newCategories = [...new Set(endpoints.map(e => e.suggestedCategory))];

    for (const category of newCategories) {
      if (!existingTags.has(category)) {
        const categoryRule = this.categoryRules.find(rule => rule.name === category);
        spec.tags.push({
          name: category,
          description: categoryRule?.description || `${category} operations and management`
        });
      }
    }

    // Write the updated specification
    await fs.promises.writeFile('./docs/api/openapi-spec.json', JSON.stringify(spec, null, 2), 'utf8');

    console.log(`✅ Applied ${updatedCount} categorization updates`);
    console.log(`📊 New categories added: ${newCategories.join(', ')}`);
  }

  async generateCategoryOverview(): Promise<void> {
    console.log('\n📚 Business Domain Categories Overview');
    console.log('=====================================\n');

    this.categoryRules.forEach((rule, index) => {
      console.log(`${index + 1}. **${rule.name}**`);
      console.log(`   ${rule.description}`);
      console.log(`   Examples: ${rule.examples.join(', ')}`);
      console.log('');
    });
  }
}

async function main() {
  console.log('🏷️  Starting API categorization analysis...\n');

  try {
    const categorizer = new APICategorizer();

    // Show available categories
    await categorizer.generateCategoryOverview();

    // Analyze and apply categorizations
    await categorizer.analyzeCategorization();

    console.log('\n🎉 API categorization completed successfully!');
    console.log('📈 All "Other" category APIs have been analyzed and recategorized where possible.');

  } catch (error) {
    console.error('❌ Error during categorization:', error);
    process.exit(1);
  }
}

main().catch(console.error);