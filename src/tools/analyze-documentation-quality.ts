#!/usr/bin/env tsx

/**
 * Documentation Quality Analyzer
 * Comprehensive analysis of API documentation quality across all endpoints
 */

import * as fs from 'fs';

interface QualityMetrics {
  totalEndpoints: number;
  emptyExamples: number;
  genericExamples: number;
  missingSchemas: number;
  inadequateDescriptions: number;
  missingBusinessContext: number;
  qualityScore: number;
  byDomain: Record<string, DomainMetrics>;
  problemEndpoints: ProblemEndpoint[];
}

interface DomainMetrics {
  total: number;
  problems: number;
  qualityScore: number;
  issues: string[];
}

interface ProblemEndpoint {
  path: string;
  method: string;
  domain: string;
  issues: string[];
  severity: 'critical' | 'major' | 'minor';
}

export class DocumentationQualityAnalyzer {
  async analyzeDocumentationQuality(): Promise<QualityMetrics> {
    console.log('🔍 Analyzing API documentation quality across all endpoints...\n');

    // Load OpenAPI specification
    const spec = JSON.parse(await fs.promises.readFile('./docs/api/openapi-spec.json', 'utf8'));
    const paths = spec.paths || {};

    const metrics: QualityMetrics = {
      totalEndpoints: 0,
      emptyExamples: 0,
      genericExamples: 0,
      missingSchemas: 0,
      inadequateDescriptions: 0,
      missingBusinessContext: 0,
      qualityScore: 0,
      byDomain: {},
      problemEndpoints: []
    };

    // Analyze each endpoint
    for (const [pathKey, pathItem] of Object.entries(paths) as [string, any][]) {
      for (const [method, operation] of Object.entries(pathItem) as [string, any][]) {
        if (!this.isHttpMethod(method)) continue;

        metrics.totalEndpoints++;
        const issues = this.analyzeEndpoint(pathKey, method, operation);

        if (issues.length > 0) {
          const domain = this.extractDomain(operation);
          const problemEndpoint: ProblemEndpoint = {
            path: pathKey,
            method: method.toUpperCase(),
            domain,
            issues,
            severity: this.calculateSeverity(issues)
          };

          metrics.problemEndpoints.push(problemEndpoint);

          // Update domain metrics
          if (!metrics.byDomain[domain]) {
            metrics.byDomain[domain] = {
              total: 0,
              problems: 0,
              qualityScore: 0,
              issues: []
            };
          }

          metrics.byDomain[domain].total++;
          metrics.byDomain[domain].problems++;

          // Update global metrics
          if (issues.includes('empty_example')) metrics.emptyExamples++;
          if (issues.includes('generic_example')) metrics.genericExamples++;
          if (issues.includes('missing_schema')) metrics.missingSchemas++;
          if (issues.includes('inadequate_description')) metrics.inadequateDescriptions++;
          if (issues.includes('missing_business_context')) metrics.missingBusinessContext++;
        }
      }
    }

    // Calculate domain quality scores
    for (const domain of Object.keys(metrics.byDomain)) {
      const domainMetrics = metrics.byDomain[domain];
      domainMetrics.qualityScore = Math.round(((domainMetrics.total - domainMetrics.problems) / domainMetrics.total) * 100);

      // Aggregate unique issues
      const domainIssues = new Set<string>();
      metrics.problemEndpoints
        .filter(p => p.domain === domain)
        .forEach(p => p.issues.forEach(issue => domainIssues.add(issue)));
      domainMetrics.issues = Array.from(domainIssues);
    }

    // Calculate overall quality score
    const totalProblems = metrics.problemEndpoints.length;
    metrics.qualityScore = Math.round(((metrics.totalEndpoints - totalProblems) / metrics.totalEndpoints) * 100);

    return metrics;
  }

  private isHttpMethod(method: string): boolean {
    return ['get', 'post', 'put', 'patch', 'delete'].includes(method.toLowerCase());
  }

  private analyzeEndpoint(path: string, method: string, operation: any): string[] {
    const issues: string[] = [];

    // Check for empty examples
    const successResponse = this.getSuccessResponse(operation);
    if (successResponse) {
      const example = successResponse.content?.['application/json']?.example;
      if (!example || this.isEmpty(example)) {
        issues.push('empty_example');
      } else if (this.isGeneric(example)) {
        issues.push('generic_example');
      }

      // Check schema quality
      const schema = successResponse.content?.['application/json']?.schema;
      if (!schema || this.isEmptySchema(schema)) {
        issues.push('missing_schema');
      }
    }

    // Check description quality
    if (!operation.description || operation.description.length < 20) {
      issues.push('inadequate_description');
    }

    // Check for business context
    if (!operation.description?.includes('Business Context') &&
        !operation.description?.includes('Domain:') &&
        !operation.summary?.includes('manufacturing')) {
      issues.push('missing_business_context');
    }

    // Check for missing response codes
    if (!operation.responses || Object.keys(operation.responses).length < 3) {
      issues.push('insufficient_response_codes');
    }

    // Check parameter quality
    if (operation.parameters && operation.parameters.some((p: any) => !p.description)) {
      issues.push('undocumented_parameters');
    }

    return issues;
  }

  private getSuccessResponse(operation: any): any {
    const responses = operation.responses || {};
    return responses['200'] || responses['201'] || null;
  }

  private isEmpty(example: any): boolean {
    if (!example) return true;
    if (typeof example === 'object') {
      return Object.keys(example).length === 0;
    }
    return false;
  }

  private isGeneric(example: any): boolean {
    if (typeof example !== 'object') return false;

    const genericPatterns = [
      'example-id',
      'Example Resource',
      'example',
      'sample',
      'test'
    ];

    const exampleStr = JSON.stringify(example).toLowerCase();
    return genericPatterns.some(pattern => exampleStr.includes(pattern.toLowerCase()));
  }

  private isEmptySchema(schema: any): boolean {
    if (!schema) return true;
    if (schema.type === 'object' && (!schema.properties || Object.keys(schema.properties).length === 0)) {
      return true;
    }
    return false;
  }

  private extractDomain(operation: any): string {
    if (operation.tags && operation.tags.length > 0) {
      return operation.tags[0];
    }
    return 'Unknown';
  }

  private calculateSeverity(issues: string[]): 'critical' | 'major' | 'minor' {
    if (issues.includes('empty_example') && issues.includes('missing_schema')) {
      return 'critical';
    }
    if (issues.includes('empty_example') || issues.includes('generic_example')) {
      return 'major';
    }
    return 'minor';
  }

  async generateQualityReport(metrics: QualityMetrics): Promise<void> {
    console.log('📊 API Documentation Quality Report');
    console.log('=====================================\n');

    // Overall metrics
    console.log('🎯 Overall Quality Metrics:');
    console.log(`   Total Endpoints: ${metrics.totalEndpoints}`);
    console.log(`   Quality Score: ${metrics.qualityScore}% (${metrics.totalEndpoints - metrics.problemEndpoints.length}/${metrics.totalEndpoints} endpoints)`);
    console.log('');

    // Problem breakdown
    console.log('⚠️  Quality Issues:');
    console.log(`   Empty Examples: ${metrics.emptyExamples} (${Math.round((metrics.emptyExamples / metrics.totalEndpoints) * 100)}%)`);
    console.log(`   Generic Examples: ${metrics.genericExamples} (${Math.round((metrics.genericExamples / metrics.totalEndpoints) * 100)}%)`);
    console.log(`   Missing Schemas: ${metrics.missingSchemas} (${Math.round((metrics.missingSchemas / metrics.totalEndpoints) * 100)}%)`);
    console.log(`   Inadequate Descriptions: ${metrics.inadequateDescriptions} (${Math.round((metrics.inadequateDescriptions / metrics.totalEndpoints) * 100)}%)`);
    console.log(`   Missing Business Context: ${metrics.missingBusinessContext} (${Math.round((metrics.missingBusinessContext / metrics.totalEndpoints) * 100)}%)`);
    console.log('');

    // Domain analysis
    console.log('🏢 Quality by Business Domain:');
    const sortedDomains = Object.entries(metrics.byDomain)
      .sort(([,a], [,b]) => a.qualityScore - b.qualityScore);

    sortedDomains.forEach(([domain, domainMetrics]) => {
      const status = domainMetrics.qualityScore >= 80 ? '✅' :
                    domainMetrics.qualityScore >= 60 ? '⚠️' : '❌';
      console.log(`   ${status} ${domain}: ${domainMetrics.qualityScore}% (${domainMetrics.problems}/${domainMetrics.total} issues)`);

      if (domainMetrics.issues.length > 0) {
        console.log(`      Common issues: ${domainMetrics.issues.join(', ')}`);
      }
    });
    console.log('');

    // Critical issues
    const criticalIssues = metrics.problemEndpoints.filter(p => p.severity === 'critical');
    if (criticalIssues.length > 0) {
      console.log('🚨 Critical Quality Issues (Top 10):');
      criticalIssues.slice(0, 10).forEach(issue => {
        console.log(`   ${issue.method} ${issue.path} (${issue.domain})`);
        console.log(`      Issues: ${issue.issues.join(', ')}`);
      });
      console.log('');
    }

    // Generate detailed report file
    await this.exportDetailedReport(metrics);

    // Action plan
    console.log('💡 Recommended Action Plan:');
    console.log('   1. Fix empty examples (highest priority)');
    console.log('   2. Replace generic examples with realistic data');
    console.log('   3. Add proper response schemas');
    console.log('   4. Enhance endpoint descriptions');
    console.log('   5. Add manufacturing business context');
    console.log('');

    console.log('🎯 Quality Targets:');
    console.log('   • Short term: 80% quality score (fix critical issues)');
    console.log('   • Medium term: 90% quality score (comprehensive examples)');
    console.log('   • Long term: 95% quality score (enterprise-grade documentation)');
  }

  private async exportDetailedReport(metrics: QualityMetrics): Promise<void> {
    const report = {
      summary: {
        totalEndpoints: metrics.totalEndpoints,
        qualityScore: metrics.qualityScore,
        criticalIssues: metrics.problemEndpoints.filter(p => p.severity === 'critical').length,
        majorIssues: metrics.problemEndpoints.filter(p => p.severity === 'major').length,
        minorIssues: metrics.problemEndpoints.filter(p => p.severity === 'minor').length
      },
      domainAnalysis: metrics.byDomain,
      problemEndpoints: metrics.problemEndpoints,
      generatedAt: new Date().toISOString()
    };

    const outputPath = './docs/generated/documentation-quality-report.json';
    await fs.promises.writeFile(outputPath, JSON.stringify(report, null, 2), 'utf8');
    console.log(`📄 Detailed report exported: ${outputPath}`);
  }
}

async function main() {
  console.log('🚀 Starting comprehensive documentation quality analysis...\n');

  try {
    const analyzer = new DocumentationQualityAnalyzer();
    const metrics = await analyzer.analyzeDocumentationQuality();
    await analyzer.generateQualityReport(metrics);

    if (metrics.qualityScore < 50) {
      console.log('\n❌ CRITICAL: Documentation quality is below acceptable standards');
      console.log('   Immediate action required to fix systemic issues');
    } else if (metrics.qualityScore < 80) {
      console.log('\n⚠️  WARNING: Documentation quality needs improvement');
      console.log('   Focus on high-impact fixes for better developer experience');
    } else {
      console.log('\n✅ Good documentation quality foundation');
      console.log('   Continue improving toward enterprise-grade standards');
    }

  } catch (error) {
    console.error('❌ Error analyzing documentation quality:', error);
    process.exit(1);
  }
}

// Run the analysis
main().catch(console.error);