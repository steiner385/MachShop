#!/usr/bin/env tsx

/**
 * API Patterns Analyzer
 * Analyzes request/response patterns and validation schemas for OpenAPI generation
 */

import * as fs from 'fs';
import * as path from 'path';
import * as ts from 'typescript';

interface SchemaAnalysis {
  module: string;
  schemas: SchemaPattern[];
  responsePatterns: ResponsePattern[];
  requestPatterns: RequestPattern[];
  commonFields: FieldPattern[];
  inconsistencies: string[];
}

interface SchemaPattern {
  name: string;
  type: 'query' | 'body' | 'params';
  fields: FieldAnalysis[];
  complexity: number;
  reusability: number;
}

interface FieldAnalysis {
  name: string;
  type: string;
  required: boolean;
  validation: string[];
  businessContext?: string;
  commonUsage: number;
}

interface ResponsePattern {
  endpoint: string;
  successType: string;
  errorTypes: string[];
  format: 'json' | 'binary' | 'text' | 'unknown';
  hasConsistentFormat: boolean;
}

interface RequestPattern {
  endpoint: string;
  contentType: string;
  bodySchema?: string;
  queryParams?: string[];
  pathParams?: string[];
  fileUpload: boolean;
}

interface FieldPattern {
  fieldName: string;
  variants: string[];
  usageCount: number;
  domains: string[];
  recommendedType: string;
}

export class APIPatternAnalyzer {
  private routesPath: string;
  private fieldFrequency: Map<string, FieldPattern> = new Map();
  private responsePatterns: ResponsePattern[] = [];
  private requestPatterns: RequestPattern[] = [];

  constructor(routesPath: string = './src/routes') {
    this.routesPath = path.resolve(routesPath);
  }

  async analyzePatterns(): Promise<{
    schemaAnalysis: SchemaAnalysis[];
    commonPatterns: FieldPattern[];
    responseAnalysis: any;
    requestAnalysis: any;
    recommendations: string[];
  }> {
    console.log('🔍 Starting comprehensive API pattern analysis...\n');

    // Find all route files
    const routeFiles = await this.findRouteFiles();
    console.log(`📁 Analyzing ${routeFiles.length} route files`);

    // Analyze each route file
    const schemaAnalysis: SchemaAnalysis[] = [];
    for (const filePath of routeFiles) {
      try {
        const analysis = await this.analyzeRouteFile(filePath);
        if (analysis) {
          schemaAnalysis.push(analysis);
        }
      } catch (error) {
        console.error(`❌ Error analyzing ${filePath}:`, error);
      }
    }

    // Generate insights
    const commonPatterns = this.analyzeCommonPatterns();
    const responseAnalysis = this.analyzeResponsePatterns();
    const requestAnalysis = this.analyzeRequestPatterns();
    const recommendations = this.generateRecommendations(schemaAnalysis, commonPatterns);

    console.log(`✅ Analysis complete: ${schemaAnalysis.length} modules analyzed`);

    return {
      schemaAnalysis,
      commonPatterns,
      responseAnalysis,
      requestAnalysis,
      recommendations
    };
  }

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

  private async analyzeRouteFile(filePath: string): Promise<SchemaAnalysis | null> {
    const content = await fs.promises.readFile(filePath, 'utf8');
    const sourceFile = ts.createSourceFile(
      filePath,
      content,
      ts.ScriptTarget.Latest,
      true
    );

    const moduleName = path.basename(filePath, '.ts');
    const schemas = this.extractZodSchemas(sourceFile, content);
    const responsePatterns = this.extractResponsePatterns(sourceFile, content);
    const requestPatterns = this.extractRequestPatterns(sourceFile, content);
    const commonFields = this.trackFieldUsage(schemas, moduleName);
    const inconsistencies = this.detectInconsistencies(schemas, responsePatterns);

    return {
      module: moduleName,
      schemas,
      responsePatterns,
      requestPatterns,
      commonFields,
      inconsistencies
    };
  }

  private extractZodSchemas(sourceFile: ts.SourceFile, content: string): SchemaPattern[] {
    const schemas: SchemaPattern[] = [];

    // Enhanced regex to capture more Zod patterns
    const schemaPatterns = [
      /const\s+(\w+Schema)\s*=\s*z\.object\(\s*\{([^}]+)\}\s*\)/gs,
      /const\s+(\w+Schema)\s*=\s*z\.object\(\s*\{([\s\S]*?)\}\s*\)/gs,
      /export\s+const\s+(\w+Schema)\s*=\s*z\.object\(\s*\{([\s\S]*?)\}\s*\)/gs
    ];

    schemaPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const schemaName = match[1];
        const schemaContent = match[2];

        const fields = this.parseZodFields(schemaContent);
        const type = this.determineSchemaType(schemaName);
        const complexity = this.calculateSchemaComplexity(fields);
        const reusability = this.assessReusability(fields);

        schemas.push({
          name: schemaName,
          type,
          fields,
          complexity,
          reusability
        });
      }
    });

    return schemas;
  }

  private parseZodFields(schemaContent: string): FieldAnalysis[] {
    const fields: FieldAnalysis[] = [];

    // Enhanced field parsing with better validation extraction
    const fieldLines = schemaContent.split(',').map(line => line.trim()).filter(line => line);

    for (const line of fieldLines) {
      const fieldMatch = line.match(/(\w+):\s*z\.(\w+)(\([^)]*\))?(.*)/);
      if (fieldMatch) {
        const [, fieldName, zodType, zodArgs, modifiers] = fieldMatch;

        const validation = this.extractValidationRules(zodType, zodArgs, modifiers);
        const required = !modifiers.includes('optional()');

        fields.push({
          name: fieldName,
          type: this.mapZodTypeToJsonSchema(zodType),
          required,
          validation,
          businessContext: this.inferBusinessContext(fieldName),
          commonUsage: 0 // Will be calculated later
        });
      }
    }

    return fields;
  }

  private extractValidationRules(zodType: string, zodArgs?: string, modifiers?: string): string[] {
    const rules: string[] = [];

    // Basic type rules
    rules.push(`type: ${zodType}`);

    // Extract constraints from arguments
    if (zodArgs) {
      const minMatch = zodArgs.match(/min\((\d+)/);
      if (minMatch) rules.push(`min: ${minMatch[1]}`);

      const maxMatch = zodArgs.match(/max\((\d+)/);
      if (maxMatch) rules.push(`max: ${maxMatch[1]}`);

      const emailMatch = zodArgs.match(/email\(\)/);
      if (emailMatch) rules.push('format: email');
    }

    // Extract modifiers
    if (modifiers) {
      if (modifiers.includes('optional()')) rules.push('optional: true');
      if (modifiers.includes('nullable()')) rules.push('nullable: true');
    }

    return rules;
  }

  private extractResponsePatterns(sourceFile: ts.SourceFile, content: string): ResponsePattern[] {
    const patterns: ResponsePattern[] = [];

    // Look for response patterns in the code
    const responseMatches = content.matchAll(/res\.(json|send|status)\(([^)]+)\)/g);

    for (const match of responseMatches) {
      const method = match[1];
      const response = match[2];

      // Simplified pattern detection
      patterns.push({
        endpoint: 'detected',
        successType: method === 'json' ? 'application/json' : 'text/plain',
        errorTypes: [],
        format: method === 'json' ? 'json' : 'text',
        hasConsistentFormat: true
      });
    }

    return patterns;
  }

  private extractRequestPatterns(sourceFile: ts.SourceFile, content: string): RequestPattern[] {
    const patterns: RequestPattern[] = [];

    // Look for request body parsing patterns
    const bodyPatterns = content.matchAll(/req\.body/g);
    const queryPatterns = content.matchAll(/req\.query/g);
    const paramsPatterns = content.matchAll(/req\.params/g);
    const fileUploadPatterns = content.matchAll(/multer|upload/g);

    if (bodyPatterns) {
      patterns.push({
        endpoint: 'detected',
        contentType: 'application/json',
        fileUpload: Array.from(fileUploadPatterns).length > 0
      });
    }

    return patterns;
  }

  private trackFieldUsage(schemas: SchemaPattern[], moduleName: string): FieldPattern[] {
    const fields: FieldPattern[] = [];

    schemas.forEach(schema => {
      schema.fields.forEach(field => {
        const existing = this.fieldFrequency.get(field.name);

        if (existing) {
          existing.usageCount++;
          if (!existing.variants.includes(field.type)) {
            existing.variants.push(field.type);
          }
          if (!existing.domains.includes(moduleName)) {
            existing.domains.push(moduleName);
          }
        } else {
          this.fieldFrequency.set(field.name, {
            fieldName: field.name,
            variants: [field.type],
            usageCount: 1,
            domains: [moduleName],
            recommendedType: field.type
          });
        }
      });
    });

    return Array.from(this.fieldFrequency.values());
  }

  private detectInconsistencies(schemas: SchemaPattern[], responses: ResponsePattern[]): string[] {
    const inconsistencies: string[] = [];

    // Check for type inconsistencies
    const fieldTypes = new Map<string, Set<string>>();

    schemas.forEach(schema => {
      schema.fields.forEach(field => {
        if (!fieldTypes.has(field.name)) {
          fieldTypes.set(field.name, new Set());
        }
        fieldTypes.get(field.name)!.add(field.type);
      });
    });

    fieldTypes.forEach((types, fieldName) => {
      if (types.size > 1) {
        inconsistencies.push(`Field '${fieldName}' has inconsistent types: ${Array.from(types).join(', ')}`);
      }
    });

    return inconsistencies;
  }

  private analyzeCommonPatterns(): FieldPattern[] {
    return Array.from(this.fieldFrequency.values())
      .filter(field => field.usageCount >= 3)
      .sort((a, b) => b.usageCount - a.usageCount);
  }

  private analyzeResponsePatterns(): any {
    const formats = new Map<string, number>();
    const contentTypes = new Map<string, number>();

    this.responsePatterns.forEach(pattern => {
      formats.set(pattern.format, (formats.get(pattern.format) || 0) + 1);
      contentTypes.set(pattern.successType, (contentTypes.get(pattern.successType) || 0) + 1);
    });

    return {
      totalResponses: this.responsePatterns.length,
      formatDistribution: Object.fromEntries(formats),
      contentTypeDistribution: Object.fromEntries(contentTypes)
    };
  }

  private analyzeRequestPatterns(): any {
    const contentTypes = new Map<string, number>();
    let fileUploads = 0;

    this.requestPatterns.forEach(pattern => {
      contentTypes.set(pattern.contentType, (contentTypes.get(pattern.contentType) || 0) + 1);
      if (pattern.fileUpload) fileUploads++;
    });

    return {
      totalRequests: this.requestPatterns.length,
      contentTypeDistribution: Object.fromEntries(contentTypes),
      fileUploadEndpoints: fileUploads
    };
  }

  private generateRecommendations(
    schemaAnalysis: SchemaAnalysis[],
    commonPatterns: FieldPattern[]
  ): string[] {
    const recommendations: string[] = [];

    // Schema standardization recommendations
    const totalSchemas = schemaAnalysis.reduce((sum, analysis) => sum + analysis.schemas.length, 0);
    if (totalSchemas > 0) {
      recommendations.push(`Standardize ${commonPatterns.length} common field patterns across schemas`);
    }

    // Type consistency recommendations
    const inconsistentFields = commonPatterns.filter(field => field.variants.length > 1);
    if (inconsistentFields.length > 0) {
      recommendations.push(`Resolve type inconsistencies in ${inconsistentFields.length} fields`);
    }

    // Validation enhancement recommendations
    const schemasWithoutValidation = schemaAnalysis.filter(analysis =>
      analysis.schemas.some(schema => schema.fields.some(field => field.validation.length <= 1))
    );

    if (schemasWithoutValidation.length > 0) {
      recommendations.push(`Enhance validation rules in ${schemasWithoutValidation.length} schema modules`);
    }

    return recommendations;
  }

  private determineSchemaType(schemaName: string): 'query' | 'body' | 'params' {
    if (schemaName.toLowerCase().includes('query')) return 'query';
    if (schemaName.toLowerCase().includes('param')) return 'params';
    return 'body';
  }

  private calculateSchemaComplexity(fields: FieldAnalysis[]): number {
    return fields.length + fields.filter(f => f.validation.length > 2).length;
  }

  private assessReusability(fields: FieldAnalysis[]): number {
    const commonFields = ['id', 'createdAt', 'updatedAt', 'name', 'description'];
    const reusableFields = fields.filter(f => commonFields.includes(f.name));
    return Math.round((reusableFields.length / fields.length) * 100);
  }

  private mapZodTypeToJsonSchema(zodType: string): string {
    const mapping: Record<string, string> = {
      'string': 'string',
      'number': 'number',
      'boolean': 'boolean',
      'date': 'string',
      'array': 'array',
      'object': 'object',
      'enum': 'string',
      'union': 'oneOf',
      'optional': 'optional',
      'nullable': 'nullable'
    };

    return mapping[zodType.toLowerCase()] || 'string';
  }

  private inferBusinessContext(fieldName: string): string | undefined {
    const contexts: Record<string, string> = {
      'workOrder': 'Production Management',
      'material': 'Material Management',
      'quality': 'Quality Management',
      'user': 'Personnel Management',
      'equipment': 'Equipment Management',
      'document': 'Document Management',
      'routing': 'Production Management',
      'inspection': 'Quality Management'
    };

    for (const [key, context] of Object.entries(contexts)) {
      if (fieldName.toLowerCase().includes(key.toLowerCase())) {
        return context;
      }
    }

    return undefined;
  }

  async exportAnalysis(analysis: any, outputPath: string): Promise<void> {
    const jsonData = JSON.stringify(analysis, null, 2);
    await fs.promises.writeFile(outputPath, jsonData, 'utf8');
    console.log(`✅ Pattern analysis exported to: ${outputPath}`);
  }
}

async function main() {
  console.log('🚀 Starting API pattern analysis...\n');

  try {
    const analyzer = new APIPatternAnalyzer('./src/routes');
    const analysis = await analyzer.analyzePatterns();

    // Export detailed analysis
    const outputPath = './docs/generated/api-pattern-analysis.json';
    await analyzer.exportAnalysis(analysis, outputPath);

    // Display summary
    console.log('\n📊 Pattern Analysis Summary:');
    console.log('===============================');
    console.log(`📋 Modules Analyzed: ${analysis.schemaAnalysis.length}`);
    console.log(`🔄 Common Patterns: ${analysis.commonPatterns.length}`);
    console.log(`⚠️  Recommendations: ${analysis.recommendations.length}`);
    console.log('');

    console.log('🔍 Top Common Field Patterns:');
    analysis.commonPatterns.slice(0, 10).forEach((pattern: FieldPattern) => {
      console.log(`   ${pattern.fieldName}: used ${pattern.usageCount} times across ${pattern.domains.length} domains`);
      if (pattern.variants.length > 1) {
        console.log(`     ⚠️  Type variants: ${pattern.variants.join(', ')}`);
      }
    });

    console.log('\n💡 Key Recommendations:');
    analysis.recommendations.forEach((rec: string) => {
      console.log(`   • ${rec}`);
    });

    console.log(`\n✅ Detailed analysis saved to: ${outputPath}`);

  } catch (error) {
    console.error('❌ Error during pattern analysis:', error);
    process.exit(1);
  }
}

// Run the pattern analysis
main().catch(console.error);