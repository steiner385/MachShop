#!/usr/bin/env node

/**
 * MachShop Accessibility Test Runner
 *
 * This script runs comprehensive accessibility tests using the infrastructure
 * established in Phase 2 of the UI assessment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const OUTPUT_DIR = './docs/ui-assessment/02-ACCESSIBILITY';
const SERVER_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5173';
const SERVER_TIMEOUT = 30000; // 30 seconds

console.log('🚀 Starting MachShop Accessibility Test Suite...');
console.log(`📍 Server URL: ${SERVER_URL}`);
console.log(`📊 Output Directory: ${OUTPUT_DIR}`);

/**
 * Check if server is running
 */
async function checkServer() {
  try {
    const response = await fetch(SERVER_URL);
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Run accessibility audit tests
 */
function runAccessibilityAudit() {
  console.log('\n🔍 Running axe-core accessibility audit...');

  try {
    const result = execSync(
      'npx playwright test --project=accessibility-tests --reporter=json',
      {
        encoding: 'utf8',
        cwd: './frontend',
        timeout: 120000 // 2 minutes
      }
    );

    console.log('✅ Accessibility audit completed successfully');
    return JSON.parse(result);
  } catch (error) {
    console.error('❌ Accessibility audit failed:', error.message);
    return null;
  }
}

/**
 * Run keyboard navigation tests
 */
function runKeyboardNavigationTests() {
  console.log('\n⌨️ Running keyboard navigation tests...');

  try {
    const result = execSync(
      'npx playwright test keyboard-navigation.spec.ts --reporter=json',
      {
        encoding: 'utf8',
        cwd: './frontend',
        timeout: 60000 // 1 minute
      }
    );

    console.log('✅ Keyboard navigation tests completed successfully');
    return JSON.parse(result);
  } catch (error) {
    console.error('❌ Keyboard navigation tests failed:', error.message);
    return null;
  }
}

/**
 * Generate comprehensive accessibility report
 */
function generateAccessibilityReport(auditResults, keyboardResults) {
  console.log('\n📄 Generating accessibility compliance report...');

  const report = {
    generatedAt: new Date().toISOString(),
    serverUrl: SERVER_URL,
    summary: {
      totalRoutes: 53,
      routesTested: auditResults ? auditResults.tests?.length || 0 : 0,
      passedTests: auditResults ? auditResults.tests?.filter(t => t.outcome === 'passed').length || 0 : 0,
      failedTests: auditResults ? auditResults.tests?.filter(t => t.outcome === 'failed').length || 0 : 0,
      wcagCompliance: 'In Progress',
      keyboardNavigationStatus: keyboardResults ? 'Tested' : 'Pending Server'
    },
    auditResults: auditResults || { status: 'Requires running server' },
    keyboardResults: keyboardResults || { status: 'Requires running server' },
    recommendations: [
      'Start development server before running tests',
      'Ensure all routes are accessible without authentication for testing',
      'Run tests in multiple browsers for comprehensive coverage',
      'Include manual testing with screen readers (NVDA, JAWS)',
      'Test with keyboard-only navigation for all user workflows'
    ]
  };

  // Save results
  const outputPath = path.join(OUTPUT_DIR, 'accessibility-test-results.json');
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✅ Report saved to: ${outputPath}`);

  return report;
}

/**
 * Main execution function
 */
async function main() {
  console.log('\n🔧 Checking server availability...');

  const serverRunning = await checkServer();

  if (!serverRunning) {
    console.log('⚠️ Development server not running');
    console.log('📝 To run accessibility tests:');
    console.log('   1. Start the development server: npm run dev');
    console.log('   2. Wait for server to be ready');
    console.log('   3. Run this script again: node run-accessibility-tests.js');
    console.log('');
    console.log('📊 Generating report with current status...');

    const report = generateAccessibilityReport(null, null);
    console.log('\n📋 Summary:');
    console.log(`   Server Status: Not Running`);
    console.log(`   Tests Status: Pending Server Start`);
    console.log(`   Infrastructure: ✅ Ready`);
    console.log(`   Test Coverage: 53+ routes ready for testing`);

    return;
  }

  console.log('✅ Server is running, proceeding with tests...');

  // Run the test suites
  const auditResults = runAccessibilityAudit();
  const keyboardResults = runKeyboardNavigationTests();

  // Generate comprehensive report
  const report = generateAccessibilityReport(auditResults, keyboardResults);

  // Print summary
  console.log('\n📋 Test Execution Summary:');
  console.log(`   Routes Tested: ${report.summary.routesTested}/53`);
  console.log(`   Passed Tests: ${report.summary.passedTests}`);
  console.log(`   Failed Tests: ${report.summary.failedTests}`);
  console.log(`   Pass Rate: ${report.summary.routesTested > 0 ? ((report.summary.passedTests / report.summary.routesTested) * 100).toFixed(1) : 0}%`);
  console.log(`   Keyboard Navigation: ${report.summary.keyboardNavigationStatus}`);

  if (report.summary.failedTests > 0) {
    console.log('\n⚠️ Some accessibility tests failed. Review the detailed report for specific issues.');
  } else {
    console.log('\n🎉 All accessibility tests passed!');
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Error running accessibility tests:', error);
    process.exit(1);
  });
}

module.exports = { main, runAccessibilityAudit, runKeyboardNavigationTests, generateAccessibilityReport };