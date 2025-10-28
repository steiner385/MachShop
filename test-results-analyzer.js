#!/usr/bin/env node

/**
 * Comprehensive Test Results Analyzer for MES E2E Test Suite
 *
 * Analyzes all 882 tests across 18 Playwright projects and generates
 * detailed breakdowns by project and status.
 */

const fs = require('fs');
const path = require('path');

class TestResultsAnalyzer {
  constructor() {
    this.testResultsDir = path.join(__dirname, 'test-results');
    this.playwrightConfig = path.join(__dirname, 'playwright.config.ts');
    this.projects = [];
    this.results = {
      totalTests: 0,
      totalPassed: 0,
      totalFailed: 0,
      totalSkipped: 0,
      totalNotRun: 0,
      projectBreakdown: {},
      executionSummary: {},
      infrastructureIssues: []
    };
  }

  /**
   * Extract project names from Playwright configuration
   */
  extractProjectsFromConfig() {
    try {
      const configContent = fs.readFileSync(this.playwrightConfig, 'utf-8');

      // Extract project names using regex
      const projectRegex = /name:\s*['"`]([^'"`]+)['"`]/g;
      let match;
      const projects = [];

      while ((match = projectRegex.exec(configContent)) !== null) {
        projects.push(match[1]);
      }

      this.projects = projects;
      console.log(`📋 Found ${projects.length} projects in Playwright config:`);
      projects.forEach((project, index) => {
        console.log(`   ${index + 1}. ${project}`);
      });

      return projects;
    } catch (error) {
      console.error('❌ Error reading Playwright config:', error.message);
      return [];
    }
  }

  /**
   * Parse JSON result files
   */
  parseJsonResults() {
    const resultFiles = fs.readdirSync(this.testResultsDir)
      .filter(file => file.endsWith('.json') && file !== '.last-run.json')
      .map(file => path.join(this.testResultsDir, file));

    console.log(`\n📊 Analyzing ${resultFiles.length} JSON result files...`);

    for (const filePath of resultFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(content);

        console.log(`   📄 Processing: ${path.basename(filePath)}`);

        if (data.stats) {
          // Main results file format
          this.processMainResults(data, filePath);
        } else if (data.suites) {
          // Suite-based results format
          this.processSuiteResults(data, filePath);
        } else if (Array.isArray(data)) {
          // Array of test results
          this.processArrayResults(data, filePath);
        } else {
          console.log(`     ⚠️  Unknown format in ${path.basename(filePath)}`);
        }
      } catch (error) {
        console.error(`     ❌ Error parsing ${path.basename(filePath)}:`, error.message);
      }
    }
  }

  /**
   * Process main results file with stats
   */
  processMainResults(data, filePath) {
    const fileName = path.basename(filePath);
    console.log(`     📈 Stats found - Expected: ${data.stats.expected}, Skipped: ${data.stats.skipped}, Unexpected: ${data.stats.unexpected}, Flaky: ${data.stats.flaky}`);

    // Try to determine project name from file structure or content
    let projectName = 'unknown';
    if (data.config && data.config.projects) {
      // Multiple projects in one file
      data.config.projects.forEach(project => {
        if (project.name) {
          projectName = project.name;
          this.updateProjectStats(projectName, {
            expected: data.stats.expected || 0,
            passed: (data.stats.expected || 0) - (data.stats.unexpected || 0) - (data.stats.skipped || 0),
            failed: data.stats.unexpected || 0,
            skipped: data.stats.skipped || 0
          });
        }
      });
    } else {
      // Single project file
      this.updateProjectStats(projectName, {
        expected: data.stats.expected || 0,
        passed: (data.stats.expected || 0) - (data.stats.unexpected || 0) - (data.stats.skipped || 0),
        failed: data.stats.unexpected || 0,
        skipped: data.stats.skipped || 0
      });
    }
  }

  /**
   * Process suite-based results
   */
  processSuiteResults(data, filePath) {
    const fileName = path.basename(filePath);
    console.log(`     📁 Processing suite results in ${fileName}`);

    let totalTests = 0;
    let passed = 0;
    let failed = 0;
    let skipped = 0;

    if (data.suites && Array.isArray(data.suites)) {
      data.suites.forEach(suite => {
        if (suite.specs) {
          suite.specs.forEach(spec => {
            if (spec.tests) {
              spec.tests.forEach(test => {
                totalTests++;
                const result = test.results?.[0];
                if (result) {
                  switch (result.status) {
                    case 'passed':
                      passed++;
                      break;
                    case 'failed':
                      failed++;
                      break;
                    case 'skipped':
                      skipped++;
                      break;
                  }
                }
              });
            }
          });
        }
      });
    }

    console.log(`     📊 Found ${totalTests} tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);

    // Try to determine project from file name or content
    const projectName = this.inferProjectName(fileName, data);
    this.updateProjectStats(projectName, {
      expected: totalTests,
      passed: passed,
      failed: failed,
      skipped: skipped
    });
  }

  /**
   * Process array-based results
   */
  processArrayResults(data, filePath) {
    const fileName = path.basename(filePath);
    console.log(`     📋 Processing array results in ${fileName}`);

    let passed = 0;
    let failed = 0;
    let skipped = 0;

    data.forEach(item => {
      if (item.status) {
        switch (item.status) {
          case 'passed':
            passed++;
            break;
          case 'failed':
            failed++;
            break;
          case 'skipped':
            skipped++;
            break;
        }
      }
    });

    const total = passed + failed + skipped;
    console.log(`     📊 Found ${total} tests: ${passed} passed, ${failed} failed, ${skipped} skipped`);

    const projectName = this.inferProjectName(fileName, data);
    this.updateProjectStats(projectName, {
      expected: total,
      passed: passed,
      failed: failed,
      skipped: skipped
    });
  }

  /**
   * Parse XML result files
   */
  parseXmlResults() {
    const xmlFiles = fs.readdirSync(this.testResultsDir)
      .filter(file => file.endsWith('.xml'))
      .map(file => path.join(this.testResultsDir, file));

    console.log(`\n📄 Analyzing ${xmlFiles.length} XML result files...`);

    for (const filePath of xmlFiles) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        this.parseXmlContent(content, filePath);
      } catch (error) {
        console.error(`❌ Error parsing ${path.basename(filePath)}:`, error.message);
      }
    }
  }

  /**
   * Parse XML content for test results
   */
  parseXmlContent(content, filePath) {
    const fileName = path.basename(filePath);
    console.log(`   📄 Processing: ${fileName}`);

    // Extract test statistics from XML
    const testsuiteRegex = /<testsuite[^>]*name="([^"]*)"[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*skipped="(\d+)"/g;
    const rootTestsuiteRegex = /<testsuites[^>]*tests="(\d+)"[^>]*failures="(\d+)"[^>]*skipped="(\d+)"/g;

    let match;
    let totalTests = 0;
    let totalFailed = 0;
    let totalSkipped = 0;

    // Check for root testsuite element first
    while ((match = rootTestsuiteRegex.exec(content)) !== null) {
      totalTests = parseInt(match[1]);
      totalFailed = parseInt(match[2]);
      totalSkipped = parseInt(match[3]);

      console.log(`     📊 Root suite: ${totalTests} tests, ${totalFailed} failures, ${totalSkipped} skipped`);

      const projectName = this.inferProjectName(fileName, { content });
      this.updateProjectStats(projectName, {
        expected: totalTests,
        passed: totalTests - totalFailed - totalSkipped,
        failed: totalFailed,
        skipped: totalSkipped
      });
      break;
    }

    // If no root suite, process individual test suites
    if (totalTests === 0) {
      while ((match = testsuiteRegex.exec(content)) !== null) {
        const suiteName = match[1];
        const tests = parseInt(match[2]);
        const failures = parseInt(match[3]);
        const skipped = parseInt(match[4]);
        const passed = tests - failures - skipped;

        console.log(`     📁 Suite "${suiteName}": ${tests} tests, ${failures} failures, ${skipped} skipped`);

        totalTests += tests;
        totalFailed += failures;
        totalSkipped += skipped;
      }

      if (totalTests > 0) {
        const projectName = this.inferProjectName(fileName, { content });
        this.updateProjectStats(projectName, {
          expected: totalTests,
          passed: totalTests - totalFailed - totalSkipped,
          failed: totalFailed,
          skipped: totalSkipped
        });
      }
    }
  }

  /**
   * Infer project name from file name or content
   */
  inferProjectName(fileName, data) {
    // Try to match against known project names
    for (const project of this.projects) {
      if (fileName.includes(project) ||
          (data.content && data.content.includes(project)) ||
          (data.config && JSON.stringify(data.config).includes(project))) {
        return project;
      }
    }

    // Fallback to file name without extension
    return fileName.replace(/\.(json|xml)$/, '') || 'unknown';
  }

  /**
   * Update project statistics
   */
  updateProjectStats(projectName, stats) {
    if (!this.results.projectBreakdown[projectName]) {
      this.results.projectBreakdown[projectName] = {
        expected: 0,
        passed: 0,
        failed: 0,
        skipped: 0,
        notRun: 0,
        successRate: 0
      };
    }

    const project = this.results.projectBreakdown[projectName];
    project.expected += stats.expected || 0;
    project.passed += stats.passed || 0;
    project.failed += stats.failed || 0;
    project.skipped += stats.skipped || 0;

    // Calculate not run (expected - passed - failed - skipped)
    project.notRun = Math.max(0, project.expected - project.passed - project.failed - project.skipped);

    // Calculate success rate
    if (project.expected > 0) {
      project.successRate = Math.round((project.passed / project.expected) * 100 * 100) / 100;
    }
  }

  /**
   * Calculate overall statistics
   */
  calculateOverallStats() {
    this.results.totalTests = 0;
    this.results.totalPassed = 0;
    this.results.totalFailed = 0;
    this.results.totalSkipped = 0;
    this.results.totalNotRun = 0;

    Object.values(this.results.projectBreakdown).forEach(project => {
      this.results.totalTests += project.expected;
      this.results.totalPassed += project.passed;
      this.results.totalFailed += project.failed;
      this.results.totalSkipped += project.skipped;
      this.results.totalNotRun += project.notRun;
    });
  }

  /**
   * Generate comprehensive report
   */
  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE E2E TEST RESULTS ANALYSIS');
    console.log('='.repeat(80));

    console.log(`\n📈 OVERALL STATISTICS:`);
    console.log(`   Total Tests: ${this.results.totalTests}`);
    console.log(`   ✅ Passed: ${this.results.totalPassed} (${Math.round((this.results.totalPassed / this.results.totalTests) * 100)}%)`);
    console.log(`   ❌ Failed: ${this.results.totalFailed} (${Math.round((this.results.totalFailed / this.results.totalTests) * 100)}%)`);
    console.log(`   ⏭️  Skipped: ${this.results.totalSkipped} (${Math.round((this.results.totalSkipped / this.results.totalTests) * 100)}%)`);
    console.log(`   ⚪ Not Run: ${this.results.totalNotRun} (${Math.round((this.results.totalNotRun / this.results.totalTests) * 100)}%)`);

    console.log(`\n📋 PROJECT BREAKDOWN:`);
    console.log('   ' + '-'.repeat(76));
    console.log('   Project Name                    Tests  Pass  Fail  Skip  NotRun  Success');
    console.log('   ' + '-'.repeat(76));

    // Sort projects by success rate (descending)
    const sortedProjects = Object.entries(this.results.projectBreakdown)
      .sort(([,a], [,b]) => b.successRate - a.successRate);

    sortedProjects.forEach(([name, stats]) => {
      const nameStr = name.padEnd(30);
      const testsStr = stats.expected.toString().padStart(5);
      const passStr = stats.passed.toString().padStart(4);
      const failStr = stats.failed.toString().padStart(4);
      const skipStr = stats.skipped.toString().padStart(4);
      const notRunStr = stats.notRun.toString().padStart(6);
      const successStr = `${stats.successRate}%`.padStart(7);

      let statusIcon = '✅';
      if (stats.successRate < 50) statusIcon = '🔴';
      else if (stats.successRate < 80) statusIcon = '🟡';
      else if (stats.successRate < 100) statusIcon = '🟠';

      console.log(`   ${statusIcon} ${nameStr} ${testsStr} ${passStr} ${failStr} ${skipStr} ${notRunStr} ${successStr}`);
    });

    console.log('   ' + '-'.repeat(76));

    // Summary by status groups
    console.log(`\n🎯 PROJECTS BY SUCCESS RATE:`);
    const perfect = sortedProjects.filter(([,stats]) => stats.successRate === 100);
    const high = sortedProjects.filter(([,stats]) => stats.successRate >= 80 && stats.successRate < 100);
    const medium = sortedProjects.filter(([,stats]) => stats.successRate >= 50 && stats.successRate < 80);
    const low = sortedProjects.filter(([,stats]) => stats.successRate < 50);

    console.log(`   ✅ Perfect (100%): ${perfect.length} projects`);
    perfect.forEach(([name]) => console.log(`      - ${name}`));

    console.log(`   🟠 High (80-99%): ${high.length} projects`);
    high.forEach(([name]) => console.log(`      - ${name}`));

    console.log(`   🟡 Medium (50-79%): ${medium.length} projects`);
    medium.forEach(([name]) => console.log(`      - ${name}`));

    console.log(`   🔴 Low (<50%): ${low.length} projects`);
    low.forEach(([name]) => console.log(`      - ${name}`));

    // Check for missing projects
    const foundProjects = Object.keys(this.results.projectBreakdown);
    const missingProjects = this.projects.filter(p => !foundProjects.includes(p));

    if (missingProjects.length > 0) {
      console.log(`\n⚠️  MISSING PROJECTS (${missingProjects.length}):`);
      missingProjects.forEach(project => {
        console.log(`   - ${project} (no test results found)`);
      });
    }

    console.log('\n' + '='.repeat(80));
  }

  /**
   * Save detailed results to JSON file
   */
  saveDetailedResults() {
    const outputFile = path.join(__dirname, 'test-analysis-results.json');

    const detailedResults = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProjects: this.projects.length,
        projectsWithResults: Object.keys(this.results.projectBreakdown).length,
        totalTests: this.results.totalTests,
        totalPassed: this.results.totalPassed,
        totalFailed: this.results.totalFailed,
        totalSkipped: this.results.totalSkipped,
        totalNotRun: this.results.totalNotRun,
        overallSuccessRate: Math.round((this.results.totalPassed / this.results.totalTests) * 100 * 100) / 100
      },
      expectedTotalTests: 882,
      testGap: 882 - this.results.totalTests,
      projects: this.projects,
      projectBreakdown: this.results.projectBreakdown,
      missingProjects: this.projects.filter(p => !Object.keys(this.results.projectBreakdown).includes(p))
    };

    fs.writeFileSync(outputFile, JSON.stringify(detailedResults, null, 2));
    console.log(`💾 Detailed results saved to: ${outputFile}`);

    return detailedResults;
  }

  /**
   * Run complete analysis
   */
  async analyze() {
    console.log('🔍 Starting comprehensive test results analysis...\n');

    // Step 1: Extract projects from config
    this.extractProjectsFromConfig();

    // Step 2: Parse result files
    this.parseJsonResults();
    this.parseXmlResults();

    // Step 3: Calculate overall statistics
    this.calculateOverallStats();

    // Step 4: Generate and display report
    this.generateReport();

    // Step 5: Save detailed results
    const detailedResults = this.saveDetailedResults();

    console.log('\n✅ Analysis complete!\n');

    return detailedResults;
  }
}

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new TestResultsAnalyzer();
  analyzer.analyze().catch(console.error);
}

module.exports = TestResultsAnalyzer;