#!/usr/bin/env node

/**
 * MachShop Keyboard Navigation Analysis
 *
 * This script analyzes keyboard navigation patterns based on the component
 * inventory and specialized component analysis from our UI assessment.
 */

const fs = require('fs');
const path = require('path');

// Analysis configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const OUTPUT_DIR = path.join(__dirname, 'docs', 'ui-assessment', '02-ACCESSIBILITY');

// Keyboard navigation patterns and requirements
const KEYBOARD_PATTERNS = {
  INTERACTIVE_ELEMENTS: [
    { pattern: /onClick\s*=/, requirement: 'Must support Enter/Space key activation', severity: 'HIGH' },
    { pattern: /<button/gi, requirement: 'Native keyboard support expected', severity: 'LOW' },
    { pattern: /<input|<select|<textarea/gi, requirement: 'Native keyboard support available', severity: 'LOW' },
    { pattern: /tabIndex\s*=\s*[{"]?(-?\d+)/, requirement: 'Proper tab order management', severity: 'MEDIUM' },
    { pattern: /onKeyDown|onKeyPress|onKeyUp/gi, requirement: 'Keyboard event handling present', severity: 'GOOD' },
    { pattern: /role\s*=\s*[{"]?(button|link|menuitem)/, requirement: 'ARIA role needs keyboard support', severity: 'HIGH' }
  ],

  NAVIGATION_ELEMENTS: [
    { pattern: /<Link|<NavLink/gi, requirement: 'React Router links support keyboard by default', severity: 'LOW' },
    { pattern: /navigate\(|history\.push/gi, requirement: 'Programmatic navigation - check keyboard triggers', severity: 'MEDIUM' },
    { pattern: /Menu\.|<Menu/gi, requirement: 'Menu components need arrow key navigation', severity: 'HIGH' },
    { pattern: /Dropdown|dropdown/gi, requirement: 'Dropdown components need keyboard support', severity: 'MEDIUM' }
  ],

  COMPLEX_COMPONENTS: [
    { pattern: /ReactFlow|@reactflow/gi, requirement: 'Custom keyboard navigation for nodes/edges', severity: 'HIGH' },
    { pattern: /d3\.|D3/gi, requirement: 'SVG elements need keyboard accessibility', severity: 'HIGH' },
    { pattern: /monaco|Monaco/gi, requirement: 'Editor has built-in keyboard navigation', severity: 'LOW' },
    { pattern: /Lexical|lexical/gi, requirement: 'Rich text editor keyboard shortcuts', severity: 'MEDIUM' },
    { pattern: /Table\.|<Table/gi, requirement: 'Table navigation with arrow keys', severity: 'MEDIUM' },
    { pattern: /Modal\.|<Modal/gi, requirement: 'Focus trapping and Escape key handling', severity: 'HIGH' },
    { pattern: /Drawer\.|<Drawer/gi, requirement: 'Focus management for drawer panels', severity: 'MEDIUM' }
  ],

  FORM_ELEMENTS: [
    { pattern: /Form\.|<Form/gi, requirement: 'Form field navigation with Tab/Shift+Tab', severity: 'MEDIUM' },
    { pattern: /DatePicker|TimePicker/gi, requirement: 'Date picker keyboard navigation', severity: 'MEDIUM' },
    { pattern: /Upload\.|<Upload/gi, requirement: 'File upload keyboard accessibility', severity: 'MEDIUM' },
    { pattern: /Steps\.|<Steps/gi, requirement: 'Step navigation with arrow keys', severity: 'MEDIUM' },
    { pattern: /Slider\.|<Slider/gi, requirement: 'Slider control with arrow keys', severity: 'MEDIUM' }
  ]
};

// Results storage
const results = {
  summary: {
    totalFiles: 0,
    interactiveElements: 0,
    keyboardHandlers: 0,
    potentialIssues: 0,
    goodPatterns: 0,
    generatedAt: new Date().toISOString()
  },
  routeAnalysis: [],
  componentAnalysis: [],
  keyboardIssues: [],
  recommendations: []
};

/**
 * Analyze keyboard navigation patterns in the codebase
 */
function analyzeKeyboardPatterns() {
  console.log('⌨️ Analyzing keyboard navigation patterns...');

  function analyzeDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        analyzeDirectory(fullPath);
      } else if (item.match(/\.(tsx|ts|jsx|js)$/)) {
        results.summary.totalFiles++;
        analyzeFile(fullPath);
      }
    }
  }

  analyzeDirectory(FRONTEND_DIR);
}

/**
 * Analyze individual file for keyboard navigation patterns
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(FRONTEND_DIR, filePath);

  const fileIssues = [];
  const filePatterns = [];

  // Check all keyboard pattern categories
  Object.entries(KEYBOARD_PATTERNS).forEach(([category, patterns]) => {
    patterns.forEach(({ pattern, requirement, severity }) => {
      const matches = content.match(pattern);
      if (matches) {
        const finding = {
          file: relativePath,
          category,
          pattern: pattern.source,
          requirement,
          severity,
          matchCount: matches.length,
          samples: matches.slice(0, 3)
        };

        filePatterns.push(finding);

        // Count different types
        switch(severity) {
          case 'HIGH':
            results.summary.potentialIssues++;
            fileIssues.push({
              ...finding,
              issue: `High priority keyboard support needed: ${requirement}`
            });
            break;
          case 'MEDIUM':
            results.summary.potentialIssues++;
            fileIssues.push({
              ...finding,
              issue: `Medium priority keyboard consideration: ${requirement}`
            });
            break;
          case 'GOOD':
            results.summary.goodPatterns++;
            break;
          case 'LOW':
            // These are usually good patterns or have native support
            break;
        }

        if (category === 'INTERACTIVE_ELEMENTS') {
          results.summary.interactiveElements += matches.length;
        }
      }
    });
  });

  // Look for keyboard event handlers specifically
  const keyboardHandlers = content.match(/onKey(Down|Up|Press)/gi);
  if (keyboardHandlers) {
    results.summary.keyboardHandlers += keyboardHandlers.length;
  }

  // Store file analysis if it has significant patterns
  if (filePatterns.length > 0) {
    results.componentAnalysis.push({
      file: relativePath,
      patterns: filePatterns,
      issues: fileIssues,
      keyboardHandlers: keyboardHandlers ? keyboardHandlers.length : 0,
      lineCount: lines.length
    });
  }

  // Add issues to global list
  if (fileIssues.length > 0) {
    results.keyboardIssues = results.keyboardIssues.concat(fileIssues);
  }
}

/**
 * Analyze specific routes for keyboard navigation
 */
function analyzeRouteKeyboardNavigation() {
  console.log('🗺️ Analyzing route-specific keyboard navigation...');

  const criticalRoutes = [
    { route: '/', components: ['Dashboard'], priority: 'CRITICAL' },
    { route: '/login', components: ['LoginForm'], priority: 'CRITICAL' },
    { route: '/work-orders', components: ['WorkOrdersList', 'Table', 'Button'], priority: 'HIGH' },
    { route: '/quality/inspections', components: ['InspectionsList', 'Form'], priority: 'HIGH' },
    { route: '/routing', components: ['ReactFlow', 'VisualEditor'], priority: 'HIGH' },
    { route: '/traceability', components: ['D3Visualization', 'Graph'], priority: 'HIGH' },
    { route: '/equipment', components: ['EquipmentList', 'Modal'], priority: 'MEDIUM' },
    { route: '/kits', components: ['KitsList', 'Analytics'], priority: 'MEDIUM' }
  ];

  criticalRoutes.forEach(({ route, components, priority }) => {
    const routeAnalysis = {
      route,
      priority,
      components,
      keyboardRequirements: [],
      estimatedComplexity: 'MEDIUM',
      testingNotes: []
    };

    // Determine keyboard requirements based on components
    components.forEach(component => {
      if (component.includes('ReactFlow')) {
        routeAnalysis.keyboardRequirements.push('Custom node/edge keyboard navigation');
        routeAnalysis.keyboardRequirements.push('Tab order through nodes');
        routeAnalysis.keyboardRequirements.push('Keyboard shortcuts for editing');
        routeAnalysis.estimatedComplexity = 'HIGH';
      }

      if (component.includes('D3') || component.includes('Graph')) {
        routeAnalysis.keyboardRequirements.push('SVG element keyboard accessibility');
        routeAnalysis.keyboardRequirements.push('Focus indicators for graph elements');
        routeAnalysis.estimatedComplexity = 'HIGH';
      }

      if (component.includes('Form')) {
        routeAnalysis.keyboardRequirements.push('Tab navigation through form fields');
        routeAnalysis.keyboardRequirements.push('Submit on Enter key');
        routeAnalysis.keyboardRequirements.push('Field validation keyboard support');
      }

      if (component.includes('Table') || component.includes('List')) {
        routeAnalysis.keyboardRequirements.push('Arrow key navigation in tables');
        routeAnalysis.keyboardRequirements.push('Sort column keyboard activation');
        routeAnalysis.keyboardRequirements.push('Row selection with Space/Enter');
      }

      if (component.includes('Modal')) {
        routeAnalysis.keyboardRequirements.push('Focus trapping within modal');
        routeAnalysis.keyboardRequirements.push('Escape key to close');
        routeAnalysis.keyboardRequirements.push('Return focus to trigger element');
      }
    });

    // Add testing notes
    routeAnalysis.testingNotes.push('Test with keyboard-only navigation');
    routeAnalysis.testingNotes.push('Verify focus indicators are visible');
    routeAnalysis.testingNotes.push('Test with screen reader + keyboard');

    if (routeAnalysis.estimatedComplexity === 'HIGH') {
      routeAnalysis.testingNotes.push('Requires specialized accessibility testing');
      routeAnalysis.testingNotes.push('Test with domain expert (manufacturing user)');
    }

    results.routeAnalysis.push(routeAnalysis);
  });
}

/**
 * Generate keyboard navigation recommendations
 */
function generateKeyboardRecommendations() {
  console.log('💡 Generating keyboard navigation recommendations...');

  const recommendations = [
    {
      priority: 'HIGH',
      category: 'Interactive Elements',
      title: 'Add keyboard support to custom interactive elements',
      description: `${results.summary.potentialIssues} interactive elements may need keyboard support`,
      action: 'Add onKeyDown handlers for Enter/Space key activation',
      affectedComponents: results.keyboardIssues.filter(i => i.category === 'INTERACTIVE_ELEMENTS').length
    },
    {
      priority: 'HIGH',
      category: 'Specialized Components',
      title: 'Implement accessibility for ReactFlow and D3 components',
      description: 'Complex visualizations require custom keyboard navigation',
      action: 'Add ARIA labels, keyboard shortcuts, and focus management',
      affectedComponents: results.keyboardIssues.filter(i => i.category === 'COMPLEX_COMPONENTS').length
    },
    {
      priority: 'MEDIUM',
      category: 'Navigation',
      title: 'Enhance menu and dropdown keyboard navigation',
      description: 'Menu components need arrow key navigation support',
      action: 'Implement arrow key navigation for menu items',
      affectedComponents: results.keyboardIssues.filter(i => i.category === 'NAVIGATION_ELEMENTS').length
    },
    {
      priority: 'MEDIUM',
      category: 'Forms',
      title: 'Optimize form keyboard navigation',
      description: 'Complex forms may benefit from enhanced keyboard shortcuts',
      action: 'Add keyboard shortcuts for common form actions',
      affectedComponents: results.keyboardIssues.filter(i => i.category === 'FORM_ELEMENTS').length
    },
    {
      priority: 'LOW',
      category: 'General',
      title: 'Implement application-wide keyboard shortcuts',
      description: 'Power users would benefit from global keyboard shortcuts',
      action: 'Add shortcuts for navigation, search, and common actions',
      affectedComponents: 'All routes'
    }
  ];

  results.recommendations = recommendations;
}

/**
 * Generate comprehensive keyboard navigation report
 */
function generateKeyboardNavigationReport() {
  console.log('📄 Generating keyboard navigation report...');

  const report = `# Keyboard Navigation Analysis Report

## Executive Summary

**Analysis Date**: ${results.summary.generatedAt}
**Files Analyzed**: ${results.summary.totalFiles}
**Interactive Elements Found**: ${results.summary.interactiveElements}

### Keyboard Navigation Health
- **Keyboard Event Handlers**: ${results.summary.keyboardHandlers}
- **Good Patterns Found**: ${results.summary.goodPatterns}
- **Potential Issues**: ${results.summary.potentialIssues}
- **Overall Assessment**: ${ results.summary.potentialIssues < 50 ? 'GOOD' : results.summary.potentialIssues < 150 ? 'NEEDS IMPROVEMENT' : 'REQUIRES ATTENTION'}

## Route-Specific Analysis

### Critical Routes (Keyboard Navigation Priority)

${results.routeAnalysis.filter(r => r.priority === 'CRITICAL').map(route =>
`#### ${route.route}
- **Components**: ${route.components.join(', ')}
- **Complexity**: ${route.estimatedComplexity}
- **Requirements**:
${route.keyboardRequirements.map(req => `  - ${req}`).join('\n')}
- **Testing Notes**:
${route.testingNotes.map(note => `  - ${note}`).join('\n')}`
).join('\n\n')}

### High Priority Routes

${results.routeAnalysis.filter(r => r.priority === 'HIGH').map(route =>
`#### ${route.route}
- **Components**: ${route.components.join(', ')}
- **Complexity**: ${route.estimatedComplexity}
- **Key Requirements**: ${route.keyboardRequirements.slice(0, 3).join(', ')}`
).join('\n\n')}

## Component Analysis Summary

### Most Complex Components (Keyboard Navigation)

${results.componentAnalysis
  .sort((a, b) => b.issues.length - a.issues.length)
  .slice(0, 10)
  .map(comp => `- **${comp.file}**: ${comp.issues.length} keyboard considerations, ${comp.keyboardHandlers} handlers`)
  .join('\n')}

### Keyboard Navigation Issues by Category

${Object.entries(
  results.keyboardIssues.reduce((acc, issue) => {
    acc[issue.category] = (acc[issue.category] || 0) + 1;
    return acc;
  }, {})
).map(([category, count]) => `- **${category.replace(/_/g, ' ')}**: ${count} items`).join('\n')}

## Recommendations

### Immediate Actions Required

${results.recommendations.filter(r => r.priority === 'HIGH').map(r =>
`#### ${r.title}
- **Category**: ${r.category}
- **Description**: ${r.description}
- **Action**: ${r.action}
- **Affected Components**: ${r.affectedComponents}`
).join('\n\n')}

### Medium Priority Actions

${results.recommendations.filter(r => r.priority === 'MEDIUM').map(r =>
`#### ${r.title}
- **Action**: ${r.action}
- **Components**: ${r.affectedComponents}`
).join('\n\n')}

## Testing Guidelines

### Manual Testing Checklist

#### Basic Keyboard Navigation
- [ ] Tab key moves focus to all interactive elements
- [ ] Shift+Tab moves focus in reverse order
- [ ] Enter key activates buttons and links
- [ ] Space key activates buttons and checkboxes
- [ ] Arrow keys navigate within components (menus, tables)
- [ ] Escape key closes modals and dropdowns

#### Specialized Component Testing
- [ ] **ReactFlow Components**: Custom keyboard shortcuts work
- [ ] **D3 Visualizations**: SVG elements are keyboard accessible
- [ ] **Forms**: All fields accessible via keyboard
- [ ] **Tables**: Arrow key navigation and sorting
- [ ] **Modals**: Focus trapping and escape handling

#### Screen Reader + Keyboard Testing
- [ ] Test with NVDA (free screen reader)
- [ ] Test with JAWS (if available)
- [ ] Verify ARIA labels are announced correctly
- [ ] Test with keyboard + screen reader combinations

### Automated Testing Commands

\`\`\`bash
# Run accessibility tests (requires running server)
node run-accessibility-tests.js

# Run keyboard navigation tests specifically
npx playwright test keyboard-navigation.spec.ts

# Run full accessibility suite
npx playwright test --project=accessibility-tests
\`\`\`

## Implementation Priority

1. **Week 1-2**: Address critical routes (/, /login, /work-orders)
2. **Week 3-4**: Enhance specialized components (ReactFlow, D3)
3. **Week 5-6**: Improve form and table navigation
4. **Week 7-8**: Add application-wide keyboard shortcuts

## Success Metrics

- [ ] All critical routes pass keyboard-only navigation test
- [ ] 100% of interactive elements support keyboard activation
- [ ] All modals and dropdowns have proper focus management
- [ ] Specialized components have documented keyboard shortcuts
- [ ] Screen reader + keyboard testing passes for all user workflows

---

*Report generated on ${results.summary.generatedAt} by MachShop UI Assessment - Phase 2*
`;

  return report;
}

/**
 * Save analysis results
 */
function saveResults() {
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Save detailed JSON results
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'keyboard-navigation-analysis.json'),
    JSON.stringify(results, null, 2)
  );

  // Save human-readable report
  const report = generateKeyboardNavigationReport();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'keyboard-navigation-report.md'),
    report
  );

  console.log(`📊 Keyboard navigation analysis complete! Reports saved to ${OUTPUT_DIR}`);
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting keyboard navigation analysis...');
  console.log(`📂 Analyzing frontend directory: ${FRONTEND_DIR}`);
  console.log(`📝 Results will be saved to: ${OUTPUT_DIR}`);

  try {
    console.log('\n⌨️ Phase 1: Pattern Analysis...');
    analyzeKeyboardPatterns();

    console.log('\n🗺️ Phase 2: Route Analysis...');
    analyzeRouteKeyboardNavigation();

    console.log('\n💡 Phase 3: Recommendation Generation...');
    generateKeyboardRecommendations();

    console.log('\n📄 Phase 4: Report Generation...');
    saveResults();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 KEYBOARD NAVIGATION ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Files Analyzed: ${results.summary.totalFiles}`);
    console.log(`Interactive Elements: ${results.summary.interactiveElements}`);
    console.log(`Keyboard Handlers: ${results.summary.keyboardHandlers}`);
    console.log(`Potential Issues: ${results.summary.potentialIssues}`);
    console.log(`Good Patterns: ${results.summary.goodPatterns}`);
    console.log(`Routes Analyzed: ${results.routeAnalysis.length}`);
    console.log(`Recommendations: ${results.recommendations.length}`);
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
  analyzeKeyboardPatterns,
  analyzeRouteKeyboardNavigation,
  generateKeyboardRecommendations,
  results
};