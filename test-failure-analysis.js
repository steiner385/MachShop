#!/usr/bin/env node

/**
 * E2E Test Failure Analysis Script
 * Analyzes test results to categorize failures and identify patterns
 */

const fs = require('fs');
const path = require('path');

class TestFailureAnalyzer {
  constructor() {
    this.failureCategories = {
      'UI_VISIBILITY': [],
      'TIMING_ISSUES': [],
      'DATA_CONFLICTS': [],
      'NAVIGATION': [],
      'NETWORK_ERRORS': [],
      'BUSINESS_LOGIC': [],
      'PERFORMANCE': [],
      'OTHER': []
    };
  }

  analyzeFailures() {
    console.log('🔍 Analyzing E2E Test Failures...\n');

    // Analyze test-results directory if it exists
    const testResultsDir = path.join(process.cwd(), 'test-results');
    if (fs.existsSync(testResultsDir)) {
      this.scanTestResults(testResultsDir);
    }

    // Look for recent failure screenshots
    this.findFailureScreenshots();

    // Generate analysis report
    this.generateReport();
  }

  scanTestResults(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stats = fs.statSync(filePath);

      if (stats.isDirectory()) {
        this.scanTestResults(filePath);
      } else if (file.endsWith('.png')) {
        this.categorizeFailureScreenshot(file, filePath);
      }
    });
  }

  categorizeFailureScreenshot(filename, filepath) {
    // Extract test name from screenshot filename
    const testName = filename.replace(/test-failed-\d+\.png$/, '');

    // Categorize based on common patterns
    if (filename.includes('visibility') || filename.includes('toBeVisible')) {
      this.failureCategories.UI_VISIBILITY.push({
        test: testName,
        file: filepath,
        type: 'Element not visible'
      });
    } else if (filename.includes('timeout') || filename.includes('navigation')) {
      this.failureCategories.TIMING_ISSUES.push({
        test: testName,
        file: filepath,
        type: 'Timeout or timing issue'
      });
    } else if (filename.includes('routing') && filename.includes('edit')) {
      this.failureCategories.NAVIGATION.push({
        test: testName,
        file: filepath,
        type: 'Navigation failure'
      });
    } else {
      this.failureCategories.OTHER.push({
        test: testName,
        file: filepath,
        type: 'Unclassified failure'
      });
    }
  }

  findFailureScreenshots() {
    // Look for failure screenshots in common locations
    const possibleDirs = [
      'test-results',
      'playwright-report',
      'screenshots',
      'failures'
    ];

    possibleDirs.forEach(dir => {
      const fullPath = path.join(process.cwd(), dir);
      if (fs.existsSync(fullPath)) {
        console.log(`📂 Found test results directory: ${dir}`);
      }
    });
  }

  generateReport() {
    console.log('📊 FAILURE ANALYSIS REPORT\n');
    console.log('=' .repeat(50));

    let totalFailures = 0;

    Object.entries(this.failureCategories).forEach(([category, failures]) => {
      if (failures.length > 0) {
        console.log(`\n🔴 ${category}: ${failures.length} failures`);
        failures.forEach((failure, index) => {
          console.log(`  ${index + 1}. ${failure.test} - ${failure.type}`);
        });
        totalFailures += failures.length;
      }
    });

    if (totalFailures === 0) {
      console.log('\n✅ No failure screenshots found - tests may still be running');
      console.log('💡 Run this script after tests complete for detailed analysis');
    }

    console.log('\n' + '=' .repeat(50));
    console.log(`📈 Total Categorized Failures: ${totalFailures}`);

    // Generate recommendations
    this.generateRecommendations();
  }

  generateRecommendations() {
    console.log('\n🎯 RECOMMENDED FIXES:\n');

    if (this.failureCategories.UI_VISIBILITY.length > 0) {
      console.log('1. UI VISIBILITY ISSUES:');
      console.log('   • Add explicit wait conditions before assertions');
      console.log('   • Increase timeout for slow-loading components');
      console.log('   • Use page.waitForSelector() with proper selectors');
      console.log('   • Check for dynamic content loading patterns\n');
    }

    if (this.failureCategories.TIMING_ISSUES.length > 0) {
      console.log('2. TIMING ISSUES:');
      console.log('   • Implement proper wait strategies');
      console.log('   • Use networkidle or domcontentloaded wait conditions');
      console.log('   • Add retry mechanisms for flaky operations');
      console.log('   • Consider increasing global test timeouts\n');
    }

    if (this.failureCategories.NAVIGATION.length > 0) {
      console.log('3. NAVIGATION ISSUES:');
      console.log('   • Verify URL patterns and routing logic');
      console.log('   • Add navigation wait conditions');
      console.log('   • Check for authentication requirements');
      console.log('   • Validate page load completion\n');
    }

    console.log('📋 NEXT STEPS:');
    console.log('   1. Run individual failing tests in debug mode');
    console.log('   2. Check browser network logs for errors');
    console.log('   3. Verify test data consistency');
    console.log('   4. Update selectors for UI changes');
  }
}

// Run analysis
const analyzer = new TestFailureAnalyzer();
analyzer.analyzeFailures();