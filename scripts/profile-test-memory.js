#!/usr/bin/env node

/**
 * Memory Profiling Script for Integration Tests
 *
 * Helps identify which tests consume the most memory and have potential leaks
 * Usage: node scripts/profile-test-memory.js [test-pattern]
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const TEST_TIMEOUT = 120000; // 2 minutes per test file
const MEMORY_CHECK_INTERVAL = 500; // ms between memory checks
const OUTPUT_FILE = 'test-memory-profile.json';

// Test files to profile
const TEST_PATTERNS = [
  'src/__tests__/services/ReviewService.test.ts',
  'src/__tests__/services/ProcessDataCollectionService.test.ts',
  'src/__tests__/services/EquipmentService.test.ts',
  'src/__tests__/services/NotificationService.test.ts',
  'src/__tests__/services/TraceabilityService.test.ts',
  'src/__tests__/services/SerializationService.test.ts',
];

// Get test pattern from command line or use all
const testPattern = process.argv[2];
const filesToProfile = testPattern
  ? TEST_PATTERNS.filter(f => f.includes(testPattern))
  : TEST_PATTERNS;

if (filesToProfile.length === 0) {
  console.error(`❌ No test files found matching pattern: ${testPattern}`);
  console.log(`Available patterns: ${TEST_PATTERNS.join(', ')}`);
  process.exit(1);
}

console.log(`\n📊 Memory Profiling for Integration Tests`);
console.log(`==========================================\n`);
console.log(`Files to profile: ${filesToProfile.length}`);
console.log(`Test pattern: ${testPattern || 'all'}\n`);

const results = [];
let currentFileIndex = 0;

/**
 * Run a single test file with memory monitoring
 */
async function profileTestFile(testFile) {
  return new Promise((resolve) => {
    console.log(`\n▶️  Profiling: ${path.basename(testFile)}`);

    const memorySnapshots = [];
    const startTime = Date.now();
    let peakMemory = 0;
    let averageMemory = 0;
    let testsPassed = 0;
    let testsFailed = 0;
    let errorOutput = '';

    // Start vitest process for this file
    const vitest = spawn('npx', [
      'vitest',
      'run',
      testFile,
      '--reporter=verbose',
      '--no-coverage',
      '--bail=1'
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        NODE_ENV: 'test'
      },
      timeout: TEST_TIMEOUT,
    });

    // Monitor memory while test runs
    const memoryMonitor = setInterval(() => {
      const usage = process.memoryUsage();
      const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
      const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);

      memorySnapshots.push({
        timestamp: Date.now() - startTime,
        heapUsed: heapUsedMB,
        heapTotal: heapTotalMB,
        external: Math.round(usage.external / 1024 / 1024),
        rss: Math.round(usage.rss / 1024 / 1024),
      });

      peakMemory = Math.max(peakMemory, heapUsedMB);
    }, MEMORY_CHECK_INTERVAL);

    // Capture output
    let stdout = '';
    let stderr = '';

    vitest.stdout.on('data', (data) => {
      stdout += data.toString();
      const output = data.toString();

      // Count test results
      if (output.includes('✓')) {
        testsPassed += (output.match(/✓/g) || []).length;
      }
      if (output.includes('✗')) {
        testsFailed += (output.match(/✗/g) || []).length;
      }
    });

    vitest.stderr.on('data', (data) => {
      stderr += data.toString();
      errorOutput = data.toString();
    });

    vitest.on('close', (code) => {
      clearInterval(memoryMonitor);
      const duration = Date.now() - startTime;

      // Calculate statistics
      if (memorySnapshots.length > 0) {
        averageMemory = Math.round(
          memorySnapshots.reduce((sum, s) => sum + s.heapUsed, 0) / memorySnapshots.length
        );
      }

      // Determine if test passed
      const passed = code === 0;
      const status = passed ? '✅ PASS' : '❌ FAIL';

      console.log(`${status} | Peak: ${peakMemory}MB | Avg: ${averageMemory}MB | Duration: ${duration}ms`);

      if (errorOutput && !passed) {
        console.log(`   Error: ${errorOutput.split('\n')[0].substring(0, 80)}...`);
      }

      const result = {
        file: testFile,
        filename: path.basename(testFile),
        passed,
        testsPassed: testsPassed || 0,
        testsFailed: testsFailed || 0,
        duration,
        peakMemory,
        averageMemory,
        memorySnapshots,
        errorMessage: !passed ? errorOutput.split('\n')[0] : null,
      };

      results.push(result);
      resolve(result);
    });

    // Timeout handler
    setTimeout(() => {
      vitest.kill();
      clearInterval(memoryMonitor);
      console.log(`⏱️  TIMEOUT | Peak: ${peakMemory}MB | Test exceeded ${TEST_TIMEOUT}ms`);

      const result = {
        file: testFile,
        filename: path.basename(testFile),
        passed: false,
        testsPassed: 0,
        testsFailed: 0,
        duration: TEST_TIMEOUT,
        peakMemory,
        averageMemory,
        memorySnapshots,
        errorMessage: 'Test timeout - possible memory leak or infinite loop',
      };

      results.push(result);
      resolve(result);
    }, TEST_TIMEOUT);
  });
}

/**
 * Generate report from profiling results
 */
function generateReport(results) {
  console.log(`\n\n📈 Memory Profiling Report`);
  console.log(`================================\n`);

  // Sort by peak memory
  const sorted = [...results].sort((a, b) => b.peakMemory - a.peakMemory);

  // Summary table
  console.log('Test File Performance Summary:');
  console.log('─'.repeat(100));
  console.log(
    'File'.padEnd(45) +
    'Status'.padEnd(10) +
    'Peak (MB)'.padEnd(12) +
    'Avg (MB)'.padEnd(12) +
    'Tests'.padEnd(10) +
    'Duration (ms)'.padEnd(15)
  );
  console.log('─'.repeat(100));

  sorted.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    const testCount = `${result.testsPassed}/${result.testsPassed + result.testsFailed}`;
    console.log(
      result.filename.padEnd(45) +
      status.padEnd(10) +
      result.peakMemory.toString().padEnd(12) +
      result.averageMemory.toString().padEnd(12) +
      testCount.padEnd(10) +
      result.duration.toString().padEnd(15)
    );
  });

  console.log('─'.repeat(100));

  // Memory analysis
  const totalPeakMemory = results.reduce((sum, r) => sum + r.peakMemory, 0);
  const avgPeakMemory = Math.round(totalPeakMemory / results.length);
  const maxMemory = Math.max(...results.map(r => r.peakMemory));
  const minMemory = Math.min(...results.map(r => r.peakMemory));

  console.log(`\n📊 Memory Statistics:`);
  console.log(`   Total Peak Memory: ${totalPeakMemory}MB`);
  console.log(`   Average Peak Memory: ${avgPeakMemory}MB`);
  console.log(`   Maximum: ${maxMemory}MB (${sorted[0].filename})`);
  console.log(`   Minimum: ${minMemory}MB`);

  // Test success rate
  const passedCount = results.filter(r => r.passed).length;
  const successRate = Math.round((passedCount / results.length) * 100);
  console.log(`\n✅ Success Rate: ${successRate}% (${passedCount}/${results.length} files)`);

  // Identify problematic tests
  const problematic = results.filter(r => r.peakMemory > 300 || !r.passed);
  if (problematic.length > 0) {
    console.log(`\n⚠️  Problematic Tests (High Memory or Failed):`);
    problematic.forEach(r => {
      console.log(`   - ${r.filename}`);
      if (r.peakMemory > 300) {
        console.log(`     💾 High Memory: ${r.peakMemory}MB peak`);
      }
      if (!r.passed) {
        console.log(`     ❌ Failed: ${r.errorMessage?.substring(0, 60)}...`);
      }
    });
  }

  // Save detailed results
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`\n📁 Detailed results saved to: ${OUTPUT_FILE}`);

  return results;
}

/**
 * Main execution
 */
async function main() {
  try {
    // Profile each test file sequentially
    for (const testFile of filesToProfile) {
      await profileTestFile(testFile);
      // Wait between test files to allow GC
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    // Generate report
    generateReport(results);

    // Exit with appropriate code
    const allPassed = results.every(r => r.passed);
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    console.error('❌ Profiling failed:', error.message);
    process.exit(1);
  }
}

// Run profiling
main();
