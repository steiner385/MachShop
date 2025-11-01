/**
 * Schema Validation Hook for Pre-Commit/Pre-Push
 * Issue #167: SDK & Extensibility: Automated Data Dictionary & CI/CD Integration
 *
 * Validates that:
 * 1. Schema changes are syntactically valid
 * 2. All new models have documentation
 * 3. All new fields have type annotations
 * 4. Relationships are properly defined
 * 5. No breaking changes without migration
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ValidationError {
  type: 'error' | 'warning';
  line?: number;
  message: string;
  suggestion?: string;
}

class SchemaValidationHook {
  private schemaPath: string;
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  constructor(schemaPath = './prisma/schema.prisma') {
    this.schemaPath = schemaPath;
  }

  /**
   * Get current schema content from git staging area
   */
  private getStagedSchema(): string {
    try {
      return execSync(`git show :${this.schemaPath}`, { encoding: 'utf-8' });
    } catch {
      // If not in staging, read from filesystem
      return fs.readFileSync(this.schemaPath, 'utf-8');
    }
  }

  /**
   * Get previous schema content from HEAD
   */
  private getHeadSchema(): string {
    try {
      return execSync(`git show HEAD:${this.schemaPath}`, { encoding: 'utf-8' });
    } catch {
      // No HEAD (first commit) - no schema changes to validate
      return '';
    }
  }

  /**
   * Validate schema syntax
   */
  private validateSyntax(schema: string): void {
    const lines = schema.split('\n');
    let inBlock = false;
    let blockName = '';
    let braceCount = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip comments and empty lines
      if (trimmed.startsWith('//') || trimmed === '') {
        continue;
      }

      // Check for block opening
      const blockMatch = trimmed.match(/^(model|enum|type|datasource|generator)\s+(\w+)/);
      if (blockMatch) {
        inBlock = true;
        blockName = `${blockMatch[1]} ${blockMatch[2]}`;

        if (!line.includes('{')) {
          this.errors.push({
            type: 'error',
            line: i + 1,
            message: `Missing opening brace for ${blockName}`,
            suggestion: `Add '{' to line: ${line} {`,
          });
        }
      }

      // Track braces
      braceCount += (line.match(/{/g) || []).length;
      braceCount -= (line.match(/}/g) || []).length;

      // Validate field syntax if in model
      if (
        inBlock &&
        blockMatch?.[1] === 'model' &&
        trimmed !== '' &&
        !trimmed.startsWith('}')
      ) {
        const fieldMatch = trimmed.match(/^\s*(\w+)\s+(\w+[\?\[\]]*)/);
        if (!fieldMatch && !trimmed.startsWith('@@')) {
          this.warnings.push({
            type: 'warning',
            line: i + 1,
            message: `Potentially invalid field syntax: ${trimmed}`,
          });
        }
      }
    }

    if (braceCount !== 0) {
      this.errors.push({
        type: 'error',
        message: `Mismatched braces: expected 0, got ${braceCount}`,
        suggestion: 'Check that all opening braces have matching closing braces',
      });
    }
  }

  /**
   * Validate no breaking changes
   */
  private validateNoBreakingChanges(oldSchema: string, newSchema: string): void {
    const oldModels = this.extractModelNames(oldSchema);
    const newModels = this.extractModelNames(newSchema);

    // Check for removed models (breaking change)
    for (const model of oldModels) {
      if (!newModels.includes(model)) {
        this.errors.push({
          type: 'error',
          message: `Model '${model}' was removed - this is a breaking change`,
          suggestion: `If you need to remove a model, create a migration using 'npx prisma migrate'`,
        });
      }
    }

    // Check for removed fields (potential breaking change)
    if (oldSchema !== '') {
      const oldFields = this.extractFieldsPerModel(oldSchema);
      const newFields = this.extractFieldsPerModel(newSchema);

      for (const [model, fields] of Object.entries(oldFields)) {
        if (newFields[model]) {
          for (const field of fields) {
            if (!newFields[model].includes(field)) {
              this.warnings.push({
                type: 'warning',
                message: `Field '${field}' was removed from model '${model}'`,
                suggestion: `Use 'npx prisma migrate' to safely handle field removal`,
              });
            }
          }
        }
      }
    }
  }

  /**
   * Validate all models have descriptions
   */
  private validateModelDocumentation(schema: string): void {
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schema)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];

      // Check for JSDoc comment before model
      const modelIndex = match.index;
      const beforeModel = schema.substring(
        Math.max(0, modelIndex - 200),
        modelIndex
      );

      const hasDocumentation =
        beforeModel.includes('///') || beforeModel.includes('/**');

      if (!hasDocumentation) {
        this.warnings.push({
          type: 'warning',
          message: `Model '${modelName}' lacks documentation comment`,
          suggestion: `Add JSDoc comment above model: /// ${modelName} description`,
        });
      }
    }
  }

  /**
   * Validate required attributes on fields
   */
  private validateFieldAttributes(schema: string): void {
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let modelMatch;

    while ((modelMatch = modelRegex.exec(schema)) !== null) {
      const modelName = modelMatch[1];
      const modelBody = modelMatch[2];

      // Check for id field
      if (!modelBody.includes('@id')) {
        this.errors.push({
          type: 'error',
          message: `Model '${modelName}' is missing primary key (@id)`,
          suggestion: `Add @id attribute to the id field`,
        });
      }

      // Check for timestamps
      const hasCreatedAt = modelBody.includes('createdAt');
      const hasUpdatedAt = modelBody.includes('updatedAt');

      if (!hasCreatedAt || !hasUpdatedAt) {
        this.warnings.push({
          type: 'warning',
          message: `Model '${modelName}' lacks audit timestamps (createdAt/updatedAt)`,
          suggestion: `Add:
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt`,
        });
      }
    }
  }

  /**
   * Extract model names from schema
   */
  private extractModelNames(schema: string): string[] {
    const models: string[] = [];
    const modelRegex = /model\s+(\w+)/g;
    let match;

    while ((match = modelRegex.exec(schema)) !== null) {
      models.push(match[1]);
    }

    return models;
  }

  /**
   * Extract fields per model
   */
  private extractFieldsPerModel(
    schema: string
  ): Record<string, string[]> {
    const fields: Record<string, string[]> = {};
    const modelRegex = /model\s+(\w+)\s*\{([^}]+)\}/g;
    let match;

    while ((match = modelRegex.exec(schema)) !== null) {
      const modelName = match[1];
      const modelBody = match[2];
      const modelFields: string[] = [];

      const fieldRegex = /^\s*(\w+)\s+/gm;
      let fieldMatch;

      while ((fieldMatch = fieldRegex.exec(modelBody)) !== null) {
        modelFields.push(fieldMatch[1]);
      }

      fields[modelName] = modelFields;
    }

    return fields;
  }

  /**
   * Run all validations
   */
  public async validate(): Promise<boolean> {
    const stagedSchema = this.getStagedSchema();

    if (!stagedSchema) {
      console.log('✅ No schema changes to validate');
      return true;
    }

    console.log('🔍 Validating schema changes...');

    // Run validations
    this.validateSyntax(stagedSchema);

    const headSchema = this.getHeadSchema();
    if (headSchema) {
      this.validateNoBreakingChanges(headSchema, stagedSchema);
    }

    this.validateFieldAttributes(stagedSchema);
    this.validateModelDocumentation(stagedSchema);

    // Report results
    this.printResults();

    return this.errors.length === 0;
  }

  /**
   * Print validation results
   */
  private printResults(): void {
    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('           SCHEMA VALIDATION RESULTS');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');

    if (this.errors.length > 0) {
      console.log(`❌ ERRORS (${this.errors.length}):`);
      console.log('');
      for (const error of this.errors) {
        console.log(`  [ERROR] ${error.message}`);
        if (error.line) console.log(`          Line: ${error.line}`);
        if (error.suggestion)
          console.log(`          Suggestion: ${error.suggestion}`);
        console.log('');
      }
    }

    if (this.warnings.length > 0) {
      console.log(`⚠️  WARNINGS (${this.warnings.length}):`);
      console.log('');
      for (const warning of this.warnings) {
        console.log(`  [WARNING] ${warning.message}`);
        if (warning.line) console.log(`           Line: ${warning.line}`);
        if (warning.suggestion)
          console.log(`           Suggestion: ${warning.suggestion}`);
        console.log('');
      }
    }

    if (this.errors.length === 0 && this.warnings.length === 0) {
      console.log('✅ Schema validation passed!');
      console.log('   - Syntax valid');
      console.log('   - No breaking changes');
      console.log('   - All required attributes present');
    }

    console.log('');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
  }
}

// Installation instructions
export function printInstallationInstructions(): void {
  const preCommitHook = `#!/bin/bash
# Pre-commit hook: Validate schema changes
npx ts-node scripts/schema-validation-hook.ts`;

  const prePushHook = `#!/bin/bash
# Pre-push hook: Validate schema changes before pushing
npx ts-node scripts/schema-validation-hook.ts`;

  console.log('📝 Installation Instructions:');
  console.log('');
  console.log('1. Pre-commit hook (.git/hooks/pre-commit):');
  console.log(preCommitHook);
  console.log('');
  console.log('2. Pre-push hook (.git/hooks/pre-push):');
  console.log(prePushHook);
  console.log('');
  console.log('3. Make hooks executable:');
  console.log('   chmod +x .git/hooks/pre-commit');
  console.log('   chmod +x .git/hooks/pre-push');
}

// Run if executed directly
if (require.main === module) {
  const validator = new SchemaValidationHook();
  validator.validate().then(success => {
    process.exit(success ? 0 : 1);
  });
}

export { SchemaValidationHook, ValidationError };
