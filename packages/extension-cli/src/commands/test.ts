/**
 * Extension Testing Command
 *
 * Runs tests for extensions with multiple output formats,
 * coverage reporting, and integration testing capabilities.
 */

import path from 'path';
import fs from 'fs-extra';
import { TestRunner } from '../utils/test-runner';

export interface TestOptions {
  watch?: boolean;
  coverage?: boolean;
  format?: string;
  match?: string;
}

/**
 * Run extension tests
 */
export async function testExtension(
  filePath?: string,
  options: TestOptions = {}
): Promise<void> {
  try {
    // Resolve project directory
    const projectDir = filePath
      ? path.resolve(filePath)
      : path.resolve('.');

    // Check if project directory exists
    if (!fs.existsSync(projectDir)) {
      throw new Error(`Project directory not found: ${projectDir}`);
    }

    // Check if test files exist
    const testPattern = path.join(projectDir, '**/__tests__/*.test.{ts,js}');
    const testDir = path.join(projectDir, '__tests__');

    if (!fs.existsSync(testDir)) {
      console.warn(`\n⚠️  No test directory found at ${testDir}`);
      console.log(`Run 'mach-ext generate --with-tests' to scaffold tests\n`);
      process.exit(0);
    }

    console.log(`\n🧪 Running extension tests...\n`);
    console.log(`   Project: ${projectDir}`);
    console.log(`   Watch Mode: ${options.watch ? 'enabled' : 'disabled'}`);
    console.log(`   Coverage: ${options.coverage ? 'enabled' : 'disabled'}`);
    console.log(`   Format: ${options.format || 'text'}`);
    if (options.match) {
      console.log(`   Pattern: ${options.match}`);
    }
    console.log();

    // Create test runner
    const runner = new TestRunner({
      projectDir,
      watch: options.watch,
      coverage: options.coverage,
      format: options.format as 'text' | 'json' | 'junit',
      pattern: options.match,
    });

    // Run tests
    const results = await runner.run();

    // Display results
    if (options.format === 'json') {
      console.log(JSON.stringify(results, null, 2));
    } else if (options.format === 'junit') {
      console.log(results.junit);
    } else {
      // Text format (default)
      console.log(`\n📊 Test Results:`);
      console.log(`   Total: ${results.total}`);
      console.log(`   Passed: ${results.passed}`);
      console.log(`   Failed: ${results.failed}`);
      console.log(`   Skipped: ${results.skipped}`);
      console.log(`   Duration: ${results.duration}ms\n`);

      if (results.failed > 0) {
        console.log(`❌ ${results.failed} test(s) failed:\n`);
        results.failures?.forEach((failure) => {
          console.log(`   ${failure.suite} > ${failure.test}`);
          console.log(`   ${failure.error}\n`);
        });
      }

      if (options.coverage) {
        console.log(`\n📈 Coverage Report:`);
        console.log(`   Statements: ${results.coverage?.statements || 0}%`);
        console.log(`   Branches: ${results.coverage?.branches || 0}%`);
        console.log(`   Functions: ${results.coverage?.functions || 0}%`);
        console.log(`   Lines: ${results.coverage?.lines || 0}%\n`);
      }
    }

    // Exit with appropriate code
    if (results.failed > 0 && !options.watch) {
      process.exit(1);
    }
  } catch (error) {
    console.error(`\n❌ Test execution error: ${error.message}\n`);
    process.exit(1);
  }
}
