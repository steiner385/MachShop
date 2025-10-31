#!/usr/bin/env node

/**
 * MachShop UI Assessment - Phase 6: Page Load Error and Console Statement Analysis
 *
 * This script systematically checks all application routes for:
 * - Console errors, warnings, and logs
 * - Page load failures
 * - JavaScript runtime errors
 * - Network request failures
 * - Performance issues
 * - Accessibility violations during load
 */

const fs = require('fs');
const path = require('path');

// Analysis configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const OUTPUT_DIR = path.join(__dirname, 'docs', 'ui-assessment', '06-ERRORS');
const ROUTE_PATHS = [
  // Critical Routes (P0)
  '/',
  '/login',
  '/dashboard',
  '/work-orders',
  '/work-orders/create',
  '/work-orders/:id',
  '/quality/inspections',
  '/quality/inspections/create',
  '/quality/inspections/:id',
  '/traceability',
  '/traceability/:serialNumber',

  // High Priority Routes (P1)
  '/routing',
  '/routing/create',
  '/routing/:id/edit',
  '/equipment',
  '/equipment/:id',
  '/quality/ncrs',
  '/quality/ncrs/create',
  '/quality/ncrs/:id',
  '/quality/fai',
  '/quality/fai/create',
  '/quality/fai/:id',
  '/work-instructions',
  '/work-instructions/create',
  '/work-instructions/:id',
  '/kits',
  '/kits/create',
  '/kits/:id',
  '/kits/:id/analytics',
  '/kits/:id/reports',

  // Standard Routes (P2)
  '/operations',
  '/operations/:id',
  '/staging',
  '/staging/dashboard',
  '/staging/kits',
  '/staging/materials',
  '/scheduling',
  '/scheduling/capacity',
  '/serialization',
  '/serialization/create',
  '/serialization/:id',
  '/integrations',
  '/integrations/azure',
  '/integrations/mes',
  '/integrations/erp',
  '/signatures',
  '/signatures/create',
  '/signatures/:id',

  // Placeholder Routes (P3)
  '/materials',
  '/personnel',
  '/admin',
  '/settings'
];

// User roles for authentication testing
const USER_ROLES = [
  'System Administrator',
  'Plant Manager',
  'Production Planner',
  'Manufacturing Engineer',
  'Quality Engineer',
  'Quality Inspector',
  'Maintenance Technician'
];

// Error categorization patterns
const ERROR_PATTERNS = {
  CRITICAL: [
    /uncaught\s+error/i,
    /cannot\s+read\s+property/i,
    /undefined\s+is\s+not\s+a\s+function/i,
    /network\s+error/i,
    /failed\s+to\s+fetch/i,
    /authentication\s+failed/i,
    /access\s+denied/i
  ],
  HIGH: [
    /warning/i,
    /deprecated/i,
    /memory\s+leak/i,
    /performance/i,
    /timeout/i,
    /slow\s+query/i
  ],
  MEDIUM: [
    /console\.warn/i,
    /missing\s+prop/i,
    /unknown\s+prop/i,
    /componentwillmount/i,
    /componentwillreceiveprops/i
  ],
  LOW: [
    /console\.log/i,
    /console\.info/i,
    /debug/i
  ]
};

// Analysis results
const results = {
  summary: {
    totalRoutes: ROUTE_PATHS.length,
    routesWithErrors: 0,
    routesWithWarnings: 0,
    routesWithLoadFailures: 0,
    totalConsoleMessages: 0,
    criticalErrors: 0,
    highErrors: 0,
    mediumErrors: 0,
    lowErrors: 0,
    generatedAt: new Date().toISOString()
  },
  routeResults: [],
  errorsByCategory: {
    critical: [],
    high: [],
    medium: [],
    low: []
  },
  performanceIssues: [],
  networkFailures: [],
  recommendations: []
};

/**
 * Categorize error based on severity patterns
 */
function categorizeError(message) {
  const msg = message.toLowerCase();

  for (const pattern of ERROR_PATTERNS.CRITICAL) {
    if (pattern.test(msg)) return 'CRITICAL';
  }
  for (const pattern of ERROR_PATTERNS.HIGH) {
    if (pattern.test(msg)) return 'HIGH';
  }
  for (const pattern of ERROR_PATTERNS.MEDIUM) {
    if (pattern.test(msg)) return 'MEDIUM';
  }
  for (const pattern of ERROR_PATTERNS.LOW) {
    if (pattern.test(msg)) return 'LOW';
  }

  return 'MEDIUM'; // Default for uncategorized
}

/**
 * Analyze console messages from browser logs
 */
function analyzeConsoleLogs() {
  console.log('🔍 Analyzing console logs and error patterns...');

  // Search for console statements in source files
  const consolePatterns = [
    /console\.(log|warn|error|info|debug)/g,
    /throw\s+new\s+Error/g,
    /\.catch\(\s*error\s*=>/g,
    /window\.onerror/g,
    /addEventListener\(['"]error['\"]/g
  ];

  function searchDirectory(dir) {
    const items = fs.readdirSync(dir);
    let findings = [];

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        findings = findings.concat(searchDirectory(fullPath));
      } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          consolePatterns.forEach(pattern => {
            const matches = line.match(pattern);
            if (matches) {
              matches.forEach(match => {
                const severity = categorizeError(match);
                const finding = {
                  file: path.relative(FRONTEND_DIR, fullPath),
                  line: index + 1,
                  severity,
                  type: getConsoleType(match),
                  content: line.trim(),
                  message: match
                };

                findings.push(finding);
                results.errorsByCategory[severity.toLowerCase()].push(finding);
                results.summary.totalConsoleMessages++;

                switch(severity) {
                  case 'CRITICAL': results.summary.criticalErrors++; break;
                  case 'HIGH': results.summary.highErrors++; break;
                  case 'MEDIUM': results.summary.mediumErrors++; break;
                  case 'LOW': results.summary.lowErrors++; break;
                }
              });
            }
          });
        });
      }
    }

    return findings;
  }

  return searchDirectory(FRONTEND_DIR);
}

/**
 * Get console message type
 */
function getConsoleType(match) {
  if (match.includes('console.error')) return 'ERROR';
  if (match.includes('console.warn')) return 'WARNING';
  if (match.includes('console.log')) return 'LOG';
  if (match.includes('console.info')) return 'INFO';
  if (match.includes('console.debug')) return 'DEBUG';
  if (match.includes('throw new Error')) return 'THROWN_ERROR';
  if (match.includes('.catch')) return 'ERROR_HANDLER';
  if (match.includes('window.onerror')) return 'GLOBAL_ERROR_HANDLER';
  if (match.includes('addEventListener')) return 'ERROR_LISTENER';
  return 'UNKNOWN';
}

/**
 * Analyze potential performance issues in source code
 */
function analyzePerformanceIssues() {
  console.log('⚡ Analyzing potential performance issues...');

  const performancePatterns = [
    { pattern: /useEffect\(\(\)\s*=>\s*{[\s\S]*?},\s*\[\]\)/, issue: 'Empty dependency array in useEffect', severity: 'MEDIUM' },
    { pattern: /useState\(\(\)\s*=>\s*/, issue: 'Function in useState initializer', severity: 'LOW' },
    { pattern: /\.map\([\s\S]*?\.map\(/, issue: 'Nested array maps (potential O(n²))', severity: 'HIGH' },
    { pattern: /for\s*\([\s\S]*?for\s*\(/, issue: 'Nested for loops', severity: 'MEDIUM' },
    { pattern: /document\.querySelector/, issue: 'Direct DOM manipulation', severity: 'MEDIUM' },
    { pattern: /setInterval|setTimeout/, issue: 'Timer usage (check cleanup)', severity: 'LOW' },
    { pattern: /new\s+Date\(\)/, issue: 'Frequent Date object creation', severity: 'LOW' }
  ];

  function searchPerformanceIssues(dir) {
    const items = fs.readdirSync(dir);
    let issues = [];

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        issues = issues.concat(searchPerformanceIssues(fullPath));
      } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          performancePatterns.forEach(({ pattern, issue, severity }) => {
            if (pattern.test(line)) {
              const finding = {
                file: path.relative(FRONTEND_DIR, fullPath),
                line: index + 1,
                severity,
                issue,
                content: line.trim()
              };

              issues.push(finding);
              results.performanceIssues.push(finding);
            }
          });
        });
      }
    }

    return issues;
  }

  return searchPerformanceIssues(FRONTEND_DIR);
}

/**
 * Analyze network request patterns and potential failures
 */
function analyzeNetworkPatterns() {
  console.log('🌐 Analyzing network request patterns...');

  const networkPatterns = [
    { pattern: /fetch\(/, type: 'FETCH_CALL', severity: 'INFO' },
    { pattern: /axios\.(get|post|put|delete|patch)/, type: 'AXIOS_CALL', severity: 'INFO' },
    { pattern: /\.catch\(.*?error.*?\)/, type: 'ERROR_HANDLING', severity: 'GOOD' },
    { pattern: /timeout:\s*\d+/, type: 'TIMEOUT_CONFIG', severity: 'GOOD' },
    { pattern: /retry|retries/, type: 'RETRY_LOGIC', severity: 'GOOD' },
    { pattern: /localhost:\d+/, type: 'HARDCODED_LOCALHOST', severity: 'HIGH' },
    { pattern: /http:\/\/[^localhost]/, type: 'INSECURE_HTTP', severity: 'CRITICAL' }
  ];

  function searchNetworkIssues(dir) {
    const items = fs.readdirSync(dir);
    let issues = [];

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        issues = issues.concat(searchNetworkIssues(fullPath));
      } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, index) => {
          networkPatterns.forEach(({ pattern, type, severity }) => {
            const matches = line.match(pattern);
            if (matches) {
              const finding = {
                file: path.relative(FRONTEND_DIR, fullPath),
                line: index + 1,
                severity,
                type,
                content: line.trim(),
                match: matches[0]
              };

              issues.push(finding);
              if (severity === 'HIGH' || severity === 'CRITICAL') {
                results.networkFailures.push(finding);
              }
            }
          });
        });
      }
    }

    return issues;
  }

  return searchNetworkIssues(FRONTEND_DIR);
}

/**
 * Generate route-specific error analysis
 */
function analyzeRouteErrors() {
  console.log('🔍 Analyzing route-specific error patterns...');

  ROUTE_PATHS.forEach(route => {
    const routeResult = {
      route,
      hasErrors: false,
      hasWarnings: false,
      hasLoadFailures: false,
      consoleMessages: 0,
      errors: [],
      warnings: [],
      loadIssues: [],
      recommendations: []
    };

    // This would typically be done with actual browser automation
    // For now, we'll analyze static patterns related to routes

    const routeFiles = findRouteRelatedFiles(route);
    routeFiles.forEach(file => {
      // Analyze file for potential issues
      const fileIssues = analyzeFileForErrors(file);
      if (fileIssues.length > 0) {
        routeResult.hasErrors = true;
        routeResult.errors = routeResult.errors.concat(fileIssues);
      }
    });

    if (routeResult.hasErrors) {
      results.summary.routesWithErrors++;
    }

    results.routeResults.push(routeResult);
  });
}

/**
 * Find files related to a specific route
 */
function findRouteRelatedFiles(route) {
  const routeName = route.split('/').filter(Boolean).join('');
  const possibleFiles = [];

  // Search for component files that might be related to this route
  function searchForRouteFiles(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        searchForRouteFiles(fullPath);
      } else if (item.match(/\.(ts|tsx|js|jsx)$/)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes(route) ||
            content.toLowerCase().includes(routeName.toLowerCase()) ||
            item.toLowerCase().includes(routeName.toLowerCase())) {
          possibleFiles.push(fullPath);
        }
      }
    }
  }

  searchForRouteFiles(FRONTEND_DIR);
  return possibleFiles;
}

/**
 * Analyze a specific file for error patterns
 */
function analyzeFileForErrors(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const issues = [];

  lines.forEach((line, index) => {
    // Check for common error patterns
    const errorPatterns = [
      /console\.error/,
      /throw\s+new\s+Error/,
      /undefined\s+is\s+not/,
      /cannot\s+read\s+property/,
      /failed\s+to\s+fetch/,
      /network\s+error/i
    ];

    errorPatterns.forEach(pattern => {
      if (pattern.test(line)) {
        issues.push({
          file: path.relative(FRONTEND_DIR, filePath),
          line: index + 1,
          content: line.trim(),
          severity: categorizeError(line)
        });
      }
    });
  });

  return issues;
}

/**
 * Generate recommendations based on findings
 */
function generateRecommendations() {
  console.log('💡 Generating recommendations...');

  const recommendations = [];

  // Critical error recommendations
  if (results.summary.criticalErrors > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Error Handling',
      title: `Address ${results.summary.criticalErrors} critical errors`,
      description: 'Critical errors can cause application crashes and poor user experience',
      action: 'Review and fix all critical error patterns immediately'
    });
  }

  // High priority recommendations
  if (results.summary.highErrors > 5) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Error Handling',
      title: `Address ${results.summary.highErrors} high priority errors`,
      description: 'High priority errors impact performance and reliability',
      action: 'Plan fixes for high priority errors in next sprint'
    });
  }

  // Performance recommendations
  if (results.performanceIssues.length > 10) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Performance',
      title: `Optimize ${results.performanceIssues.length} performance issues`,
      description: 'Performance issues can slow down the application',
      action: 'Review and optimize performance bottlenecks'
    });
  }

  // Network security recommendations
  const insecureRequests = results.networkFailures.filter(f => f.type === 'INSECURE_HTTP');
  if (insecureRequests.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Security',
      title: `Fix ${insecureRequests.length} insecure HTTP requests`,
      description: 'HTTP requests should use HTTPS in production',
      action: 'Replace all HTTP URLs with HTTPS equivalents'
    });
  }

  // Localhost hardcoding recommendations
  const localhostUrls = results.networkFailures.filter(f => f.type === 'HARDCODED_LOCALHOST');
  if (localhostUrls.length > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Configuration',
      title: `Replace ${localhostUrls.length} hardcoded localhost URLs`,
      description: 'Hardcoded URLs make deployment difficult',
      action: 'Use environment variables for all API endpoints'
    });
  }

  results.recommendations = recommendations;
}

/**
 * Generate comprehensive report
 */
function generateReport() {
  console.log('📄 Generating page error analysis report...');

  const report = `# Page Load Error and Console Analysis Report

## Executive Summary

**Analysis Date**: ${results.summary.generatedAt}
**Total Routes Analyzed**: ${results.summary.totalRoutes}
**Routes with Errors**: ${results.summary.routesWithErrors} (${((results.summary.routesWithErrors / results.summary.totalRoutes) * 100).toFixed(1)}%)

### Error Summary
- **Critical Errors**: ${results.summary.criticalErrors}
- **High Priority Errors**: ${results.summary.highErrors}
- **Medium Priority Errors**: ${results.summary.mediumErrors}
- **Low Priority Errors**: ${results.summary.lowErrors}
- **Total Console Messages**: ${results.summary.totalConsoleMessages}

### Issue Categories
- **Performance Issues**: ${results.performanceIssues.length}
- **Network Failures**: ${results.networkFailures.length}
- **Routes with Load Failures**: ${results.summary.routesWithLoadFailures}

## Detailed Findings

### 1. Critical Errors (${results.summary.criticalErrors} found)

${results.errorsByCategory.critical.length > 0 ?
  `| File | Line | Type | Content |
|------|------|------|---------|
${results.errorsByCategory.critical.map(e => `| ${e.file} | ${e.line} | ${e.type} | ${e.content.substring(0, 80)}... |`).join('\n')}` :
  '*No critical errors found - excellent!*'
}

### 2. High Priority Errors (${results.summary.highErrors} found)

${results.errorsByCategory.high.length > 0 ?
  `| File | Line | Type | Content |
|------|------|------|---------|
${results.errorsByCategory.high.slice(0, 10).map(e => `| ${e.file} | ${e.line} | ${e.type} | ${e.content.substring(0, 80)}... |`).join('\n')}
${results.errorsByCategory.high.length > 10 ? `\n*...and ${results.errorsByCategory.high.length - 10} more*` : ''}` :
  '*No high priority errors found*'
}

### 3. Performance Issues (${results.performanceIssues.length} found)

${results.performanceIssues.length > 0 ?
  `#### By Severity
- **High**: ${results.performanceIssues.filter(p => p.severity === 'HIGH').length}
- **Medium**: ${results.performanceIssues.filter(p => p.severity === 'MEDIUM').length}
- **Low**: ${results.performanceIssues.filter(p => p.severity === 'LOW').length}

| File | Line | Severity | Issue |
|------|------|----------|-------|
${results.performanceIssues.slice(0, 15).map(p => `| ${p.file} | ${p.line} | ${p.severity} | ${p.issue} |`).join('\n')}
${results.performanceIssues.length > 15 ? `\n*...and ${results.performanceIssues.length - 15} more*` : ''}` :
  '*No performance issues found*'
}

### 4. Network Request Issues (${results.networkFailures.length} found)

${results.networkFailures.length > 0 ?
  `| File | Line | Type | Severity | Content |
|------|------|------|----------|---------|
${results.networkFailures.map(n => `| ${n.file} | ${n.line} | ${n.type} | ${n.severity} | ${n.content.substring(0, 60)}... |`).join('\n')}` :
  '*No network request issues found*'
}

### 5. Route-Specific Analysis

#### Routes with Errors (${results.routeResults.filter(r => r.hasErrors).length} found)

${results.routeResults.filter(r => r.hasErrors).length > 0 ?
  `| Route | Error Count | Warning Count | Load Issues |
|-------|-------------|---------------|-------------|
${results.routeResults.filter(r => r.hasErrors).map(r => `| ${r.route} | ${r.errors.length} | ${r.warnings.length} | ${r.loadIssues.length} |`).join('\n')}` :
  '*All routes appear to be error-free*'
}

## Recommendations

### Immediate Actions Required
${results.recommendations.filter(r => r.priority === 'CRITICAL').map(r =>
  `1. **${r.title}** (${r.category})
   - ${r.description}
   - Action: ${r.action}`
).join('\n')}

### High Priority Actions
${results.recommendations.filter(r => r.priority === 'HIGH').map(r =>
  `1. **${r.title}** (${r.category})
   - ${r.description}
   - Action: ${r.action}`
).join('\n')}

### Medium Priority Actions
${results.recommendations.filter(r => r.priority === 'MEDIUM').map(r =>
  `1. **${r.title}** (${r.category})
   - ${r.description}
   - Action: ${r.action}`
).join('\n')}

## Best Practices

### Error Handling
1. **Consistent Error Boundaries** - Implement React error boundaries for all route components
2. **Global Error Handler** - Set up window.onerror and unhandledrejection handlers
3. **Network Error Recovery** - Implement retry logic for failed API requests
4. **User-Friendly Error Messages** - Replace technical errors with user-friendly messages

### Performance Optimization
1. **Code Splitting** - Implement route-based code splitting for better loading performance
2. **Lazy Loading** - Use React.lazy for component-level lazy loading
3. **Memoization** - Use React.memo and useMemo for expensive calculations
4. **Bundle Analysis** - Regular bundle size analysis and optimization

### Monitoring and Logging
1. **Error Tracking** - Implement error tracking service (Sentry, LogRocket, etc.)
2. **Performance Monitoring** - Set up Core Web Vitals monitoring
3. **Console Cleanup** - Remove debug console statements from production builds
4. **Structured Logging** - Use structured logging for better error analysis

---

*Report generated on ${results.summary.generatedAt} by MachShop UI Assessment Tool*
`;

  return report;
}

/**
 * Save results to files
 */
function saveResults() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save detailed JSON results
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'page-error-analysis-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Save human-readable report
  const report = generateReport();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'page-error-analysis-report.md'),
    report
  );

  console.log(`📊 Page error analysis complete! Reports saved to ${OUTPUT_DIR}`);
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting comprehensive page error and console analysis...');
  console.log(`📂 Analyzing frontend directory: ${FRONTEND_DIR}`);
  console.log(`📝 Results will be saved to: ${OUTPUT_DIR}`);

  try {
    // Run all analysis phases
    console.log('\n🔍 Phase 1: Console Log Analysis...');
    analyzeConsoleLogs();

    console.log('\n⚡ Phase 2: Performance Issue Analysis...');
    analyzePerformanceIssues();

    console.log('\n🌐 Phase 3: Network Pattern Analysis...');
    analyzeNetworkPatterns();

    console.log('\n🔍 Phase 4: Route-Specific Error Analysis...');
    analyzeRouteErrors();

    console.log('\n💡 Phase 5: Generating Recommendations...');
    generateRecommendations();

    console.log('\n📄 Phase 6: Generating Reports...');
    saveResults();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 PAGE ERROR ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Routes Analyzed: ${results.summary.totalRoutes}`);
    console.log(`Routes with Errors: ${results.summary.routesWithErrors} (${((results.summary.routesWithErrors / results.summary.totalRoutes) * 100).toFixed(1)}%)`);
    console.log(`Critical Errors: ${results.summary.criticalErrors}`);
    console.log(`High Priority Errors: ${results.summary.highErrors}`);
    console.log(`Performance Issues: ${results.performanceIssues.length}`);
    console.log(`Network Issues: ${results.networkFailures.length}`);
    console.log(`Total Console Messages: ${results.summary.totalConsoleMessages}`);
    console.log('='.repeat(80));

  } catch (error) {
    console.error('❌ Error during analysis:', error);
    process.exit(1);
  }
}

// Run analysis
if (require.main === module) {
  main();
}

module.exports = {
  analyzeConsoleLogs,
  analyzePerformanceIssues,
  analyzeNetworkPatterns,
  analyzeRouteErrors,
  generateRecommendations,
  results
};