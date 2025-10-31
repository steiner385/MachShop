#!/usr/bin/env node

/**
 * MachShop UI Assessment - Phase 8: Specialized Component Analysis
 *
 * This script analyzes complex, specialized components that require specific testing approaches:
 * - ReactFlow components (routing editor, visual workflows)
 * - D3 visualizations (traceability graphs, analytics)
 * - Monaco Editor (code editing capabilities)
 * - Lexical Editor (rich text editing)
 * - Chart libraries (Recharts, Chart.js, etc.)
 * - Complex form components (multi-step, dynamic forms)
 * - Interactive visualizations (dependency graphs, network diagrams)
 */

const fs = require('fs');
const path = require('path');

// Analysis configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const OUTPUT_DIR = path.join(__dirname, 'docs', 'ui-assessment', '08-SPECIALIZED');

// Specialized component patterns and their characteristics
const SPECIALIZED_COMPONENTS = {
  REACTFLOW: {
    patterns: [
      /import.*ReactFlow/g,
      /import.*@reactflow/g,
      /useReactFlow/g,
      /ReactFlowProvider/g,
      /Handle/g,
      /Position\./g,
      /nodeTypes|edgeTypes/g,
      /onNodesChange|onEdgesChange/g,
      /addEdge|removeEdge/g,
      /ReactFlowInstance/g
    ],
    files: [
      'VisualRoutingEditor',
      'DependencyGraph',
      'ReactFlow'
    ],
    concerns: [
      'Complex state management with nodes and edges',
      'Performance with large node counts',
      'Accessibility of interactive elements',
      'Touch interaction support',
      'Custom node/edge rendering'
    ]
  },
  D3: {
    patterns: [
      /import.*d3/g,
      /d3\./g,
      /select\(|selectAll\(/g,
      /\.data\(.*\)/g,
      /\.enter\(\)|\.exit\(\)/g,
      /\.append\(|\.remove\(/g,
      /\.attr\(|\.style\(/g,
      /\.scale|\.axis/g,
      /svg/g,
      /zoom|pan/g
    ],
    files: [
      'GenealogyTree',
      'TraceabilityVisualization',
      'DependencyVisualizer',
      'Analytics'
    ],
    concerns: [
      'Complex DOM manipulation',
      'Performance with large datasets',
      'Accessibility of custom SVG elements',
      'Responsive behavior of visualizations',
      'Memory leaks from event listeners'
    ]
  },
  MONACO: {
    patterns: [
      /import.*monaco/g,
      /@monaco-editor/g,
      /monaco\.editor/g,
      /MonacoEditor/g,
      /editor\.create|editor\.setModel/g,
      /IStandaloneCodeEditor/g,
      /monaco\.languages/g
    ],
    files: [
      'CodeEditor',
      'MonacoEditor',
      'ScriptEditor'
    ],
    concerns: [
      'Large bundle size impact',
      'Accessibility for screen readers',
      'Keyboard navigation complexity',
      'Performance with large files',
      'Theme and color contrast'
    ]
  },
  LEXICAL: {
    patterns: [
      /import.*lexical/g,
      /@lexical/g,
      /LexicalComposer/g,
      /RichTextPlugin/g,
      /PlainTextPlugin/g,
      /AutoFocusPlugin/g,
      /HistoryPlugin/g,
      /OnChangePlugin/g,
      /useLexical/g,
      /EditorState/g
    ],
    files: [
      'RichTextEditor',
      'LexicalEditor',
      'TextEditor',
      'InstructionEditor'
    ],
    concerns: [
      'Complex rich text state management',
      'Accessibility of rich text features',
      'Keyboard shortcuts and navigation',
      'Mobile editing experience',
      'Content serialization and validation'
    ]
  },
  CHARTS: {
    patterns: [
      /import.*recharts/g,
      /import.*chart\.js/g,
      /import.*chartjs/g,
      /LineChart|BarChart|PieChart/g,
      /ResponsiveContainer/g,
      /XAxis|YAxis|CartesianGrid/g,
      /Tooltip|Legend/g,
      /Cell|Area|Line|Bar/g
    ],
    files: [
      'Analytics',
      'Dashboard',
      'MetricsCard',
      'Chart'
    ],
    concerns: [
      'Data visualization accessibility',
      'Responsive chart behavior',
      'Color accessibility and contrast',
      'Touch interaction on mobile',
      'Performance with real-time data'
    ]
  },
  COMPLEX_FORMS: {
    patterns: [
      /useFormik/g,
      /react-hook-form/g,
      /Form\.List/g,
      /Form\.Provider/g,
      /Steps|Step/g,
      /Wizard|wizard/g,
      /DynamicForm/g,
      /FormBuilder/g,
      /fieldArrays|FieldArray/g,
      /validation.*schema/g
    ],
    files: [
      'FormBuilder',
      'Wizard',
      'DynamicForm',
      'MultiStep'
    ],
    concerns: [
      'Complex validation logic',
      'Multi-step form state management',
      'Accessibility of dynamic fields',
      'Performance with large forms',
      'Error handling and display'
    ]
  },
  VIRTUALIZATION: {
    patterns: [
      /react-window/g,
      /react-virtualized/g,
      /VirtualList|FixedSizeList/g,
      /VariableSizeList/g,
      /WindowedList/g,
      /virtualized/g,
      /infinite.*scroll/g,
      /lazy.*load/g
    ],
    files: [
      'VirtualList',
      'InfiniteScroll',
      'LazyLoad'
    ],
    concerns: [
      'Accessibility with virtual scrolling',
      'Keyboard navigation in virtual lists',
      'Screen reader support',
      'Performance optimization',
      'Memory usage with large datasets'
    ]
  },
  DRAG_DROP: {
    patterns: [
      /react-dnd/g,
      /dnd-kit/g,
      /react-beautiful-dnd/g,
      /Draggable|Droppable/g,
      /DragDropContext/g,
      /useDrag|useDrop/g,
      /dragover|dragenter|drop/g,
      /draggable/g
    ],
    files: [
      'DraggableTable',
      'DragDrop',
      'Sortable'
    ],
    concerns: [
      'Accessibility of drag and drop',
      'Keyboard alternatives',
      'Touch device support',
      'Visual feedback during drag',
      'Screen reader announcements'
    ]
  }
};

// Analysis results
const results = {
  summary: {
    totalFiles: 0,
    specializedComponents: 0,
    reactFlowComponents: 0,
    d3Components: 0,
    monacoComponents: 0,
    lexicalComponents: 0,
    chartComponents: 0,
    complexFormComponents: 0,
    virtualizationComponents: 0,
    dragDropComponents: 0,
    criticalIssues: 0,
    accessibilityIssues: 0,
    performanceIssues: 0,
    generatedAt: new Date().toISOString()
  },
  componentsByType: {},
  specializedFindings: [],
  accessibilityConcerns: [],
  performanceConcerns: [],
  recommendations: []
};

/**
 * Analyze specialized components across the codebase
 */
function analyzeSpecializedComponents() {
  console.log('🔬 Analyzing specialized components...');

  // Initialize component tracking
  Object.keys(SPECIALIZED_COMPONENTS).forEach(type => {
    results.componentsByType[type] = {
      files: [],
      patterns: [],
      issues: [],
      recommendations: []
    };
  });

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
 * Analyze individual file for specialized component patterns
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(FRONTEND_DIR, filePath);

  // Check each specialized component type
  Object.entries(SPECIALIZED_COMPONENTS).forEach(([type, config]) => {
    let hasComponent = false;
    const foundPatterns = [];

    // Check patterns
    config.patterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        hasComponent = true;
        foundPatterns.push({
          pattern: pattern.source,
          matches: matches.length,
          samples: matches.slice(0, 3)
        });
      }
    });

    // Check file name patterns
    config.files.forEach(filePattern => {
      if (relativePath.toLowerCase().includes(filePattern.toLowerCase())) {
        hasComponent = true;
        foundPatterns.push({
          pattern: `filename:${filePattern}`,
          matches: 1,
          samples: [relativePath]
        });
      }
    });

    if (hasComponent) {
      results.componentsByType[type].files.push({
        file: relativePath,
        patterns: foundPatterns,
        lineCount: lines.length,
        complexity: calculateComplexity(content, type)
      });

      results.componentsByType[type].patterns =
        results.componentsByType[type].patterns.concat(foundPatterns);

      // Update summary counts
      switch(type) {
        case 'REACTFLOW': results.summary.reactFlowComponents++; break;
        case 'D3': results.summary.d3Components++; break;
        case 'MONACO': results.summary.monacoComponents++; break;
        case 'LEXICAL': results.summary.lexicalComponents++; break;
        case 'CHARTS': results.summary.chartComponents++; break;
        case 'COMPLEX_FORMS': results.summary.complexFormComponents++; break;
        case 'VIRTUALIZATION': results.summary.virtualizationComponents++; break;
        case 'DRAG_DROP': results.summary.dragDropComponents++; break;
      }

      results.summary.specializedComponents++;

      // Analyze specific concerns for this component type
      analyzeComponentConcerns(content, relativePath, type, config);
    }
  });
}

/**
 * Calculate complexity score for a specialized component
 */
function calculateComplexity(content, type) {
  let complexity = 0;

  // Base complexity factors
  const useState = (content.match(/useState/g) || []).length;
  const useEffect = (content.match(/useEffect/g) || []).length;
  const callbacks = (content.match(/useCallback|useMemo/g) || []).length;
  const eventHandlers = (content.match(/on[A-Z][a-zA-Z]*/g) || []).length;

  complexity += useState * 2;
  complexity += useEffect * 3;
  complexity += callbacks * 1;
  complexity += eventHandlers * 1;

  // Type-specific complexity factors
  switch(type) {
    case 'REACTFLOW':
      complexity += (content.match(/nodeTypes|edgeTypes/g) || []).length * 5;
      complexity += (content.match(/custom.*node|custom.*edge/gi) || []).length * 3;
      break;
    case 'D3':
      complexity += (content.match(/d3\./g) || []).length;
      complexity += (content.match(/\.data\(|\.enter\(|\.exit\(/g) || []).length * 2;
      break;
    case 'MONACO':
      complexity += (content.match(/monaco\.languages/g) || []).length * 3;
      complexity += (content.match(/editor\.create/g) || []).length * 2;
      break;
    case 'LEXICAL':
      complexity += (content.match(/Plugin/g) || []).length * 2;
      complexity += (content.match(/Command/g) || []).length * 1;
      break;
  }

  return Math.min(complexity, 100); // Cap at 100
}

/**
 * Analyze specific concerns for a component type
 */
function analyzeComponentConcerns(content, filePath, type, config) {
  const concerns = [];

  // Check for common accessibility issues
  if (!content.includes('aria-') && !content.includes('role=')) {
    concerns.push({
      type: 'ACCESSIBILITY',
      severity: 'HIGH',
      issue: 'Missing ARIA attributes for specialized component',
      recommendation: 'Add appropriate ARIA labels and roles for accessibility'
    });
    results.summary.accessibilityIssues++;
  }

  // Check for keyboard navigation support
  if (content.includes('onClick') && !content.includes('onKeyDown')) {
    concerns.push({
      type: 'ACCESSIBILITY',
      severity: 'HIGH',
      issue: 'Missing keyboard navigation support',
      recommendation: 'Add keyboard event handlers for all interactive elements'
    });
    results.summary.accessibilityIssues++;
  }

  // Type-specific concern analysis
  switch(type) {
    case 'REACTFLOW':
      analyzeReactFlowConcerns(content, concerns);
      break;
    case 'D3':
      analyzeD3Concerns(content, concerns);
      break;
    case 'MONACO':
      analyzeMonacoConcerns(content, concerns);
      break;
    case 'LEXICAL':
      analyzeLexicalConcerns(content, concerns);
      break;
    case 'CHARTS':
      analyzeChartConcerns(content, concerns);
      break;
    case 'COMPLEX_FORMS':
      analyzeComplexFormConcerns(content, concerns);
      break;
    case 'VIRTUALIZATION':
      analyzeVirtualizationConcerns(content, concerns);
      break;
    case 'DRAG_DROP':
      analyzeDragDropConcerns(content, concerns);
      break;
  }

  if (concerns.length > 0) {
    results.componentsByType[type].issues.push({
      file: filePath,
      concerns
    });

    // Add to global findings
    results.specializedFindings.push({
      file: filePath,
      type,
      concerns
    });
  }
}

/**
 * Analyze ReactFlow-specific concerns
 */
function analyzeReactFlowConcerns(content, concerns) {
  if (content.includes('nodeTypes') && !content.includes('memo')) {
    concerns.push({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      issue: 'Custom nodes should be memoized',
      recommendation: 'Wrap custom node components in React.memo for better performance'
    });
    results.summary.performanceIssues++;
  }

  if (content.includes('ReactFlow') && !content.includes('maxZoom')) {
    concerns.push({
      type: 'UX',
      severity: 'LOW',
      issue: 'Missing zoom constraints',
      recommendation: 'Set minZoom and maxZoom for better user experience'
    });
  }

  if (content.includes('addEdge') && !content.includes('isValidConnection')) {
    concerns.push({
      type: 'FUNCTIONALITY',
      severity: 'MEDIUM',
      issue: 'Missing edge validation',
      recommendation: 'Add isValidConnection to prevent invalid edge connections'
    });
  }
}

/**
 * Analyze D3-specific concerns
 */
function analyzeD3Concerns(content, concerns) {
  if (content.includes('d3.select') && !content.includes('remove()')) {
    concerns.push({
      type: 'PERFORMANCE',
      severity: 'HIGH',
      issue: 'Potential memory leak - missing cleanup',
      recommendation: 'Ensure D3 elements and event listeners are properly cleaned up'
    });
    results.summary.performanceIssues++;
    results.summary.criticalIssues++;
  }

  if (content.includes('.data(') && content.includes('enter()') && !content.includes('key')) {
    concerns.push({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      issue: 'Missing data keys for efficient updates',
      recommendation: 'Use key functions for data binding to improve update performance'
    });
    results.summary.performanceIssues++;
  }

  if (content.includes('svg') && !content.includes('title') && !content.includes('desc')) {
    concerns.push({
      type: 'ACCESSIBILITY',
      severity: 'HIGH',
      issue: 'SVG missing accessibility attributes',
      recommendation: 'Add title and description elements to SVG for screen readers'
    });
    results.summary.accessibilityIssues++;
  }
}

/**
 * Analyze Monaco Editor-specific concerns
 */
function analyzeMonacoConcerns(content, concerns) {
  if (content.includes('@monaco-editor') && !content.includes('loading')) {
    concerns.push({
      type: 'PERFORMANCE',
      severity: 'MEDIUM',
      issue: 'Missing loading state for Monaco Editor',
      recommendation: 'Add loading indicator while Monaco Editor initializes'
    });
  }

  if (content.includes('monaco.editor') && !content.includes('dispose')) {
    concerns.push({
      type: 'PERFORMANCE',
      severity: 'HIGH',
      issue: 'Missing editor disposal',
      recommendation: 'Call editor.dispose() in cleanup to prevent memory leaks'
    });
    results.summary.performanceIssues++;
    results.summary.criticalIssues++;
  }

  if (content.includes('MonacoEditor') && !content.includes('aria-label')) {
    concerns.push({
      type: 'ACCESSIBILITY',
      severity: 'HIGH',
      issue: 'Missing accessibility labels for code editor',
      recommendation: 'Add aria-label and other accessibility attributes'
    });
    results.summary.accessibilityIssues++;
  }
}

/**
 * Analyze Lexical Editor-specific concerns
 */
function analyzeLexicalConcerns(content, concerns) {
  if (content.includes('LexicalComposer') && !content.includes('ErrorBoundary')) {
    concerns.push({
      type: 'RELIABILITY',
      severity: 'MEDIUM',
      issue: 'Missing error boundary for Lexical editor',
      recommendation: 'Wrap Lexical editor in error boundary for better error handling'
    });
  }

  if (content.includes('OnChangePlugin') && !content.includes('debounce')) {
    concerns.push({
      type: 'PERFORMANCE',
      severity: 'LOW',
      issue: 'Frequent onChange updates',
      recommendation: 'Consider debouncing onChange events for better performance'
    });
  }
}

/**
 * Analyze Chart-specific concerns
 */
function analyzeChartConcerns(content, concerns) {
  if ((content.includes('LineChart') || content.includes('BarChart')) && !content.includes('ResponsiveContainer')) {
    concerns.push({
      type: 'RESPONSIVE',
      severity: 'MEDIUM',
      issue: 'Chart not wrapped in ResponsiveContainer',
      recommendation: 'Wrap charts in ResponsiveContainer for responsive behavior'
    });
  }

  if (content.includes('Chart') && !content.includes('alt=') && !content.includes('aria-label')) {
    concerns.push({
      type: 'ACCESSIBILITY',
      severity: 'HIGH',
      issue: 'Chart missing accessibility attributes',
      recommendation: 'Add alt text or aria-label describing chart content'
    });
    results.summary.accessibilityIssues++;
  }
}

/**
 * Analyze Complex Form-specific concerns
 */
function analyzeComplexFormConcerns(content, concerns) {
  if (content.includes('Form.List') && !content.includes('ErrorBoundary')) {
    concerns.push({
      type: 'RELIABILITY',
      severity: 'MEDIUM',
      issue: 'Dynamic form without error boundary',
      recommendation: 'Add error boundary for dynamic form field handling'
    });
  }

  if (content.includes('validation') && content.includes('yup') && !content.includes('lazy')) {
    concerns.push({
      type: 'PERFORMANCE',
      severity: 'LOW',
      issue: 'Validation schema could be optimized',
      recommendation: 'Consider using lazy validation for better performance'
    });
  }
}

/**
 * Analyze Virtualization-specific concerns
 */
function analyzeVirtualizationConcerns(content, concerns) {
  if (content.includes('FixedSizeList') && !content.includes('aria-rowcount')) {
    concerns.push({
      type: 'ACCESSIBILITY',
      severity: 'HIGH',
      issue: 'Virtual list missing accessibility attributes',
      recommendation: 'Add aria-rowcount, aria-rowindex for screen reader support'
    });
    results.summary.accessibilityIssues++;
  }
}

/**
 * Analyze Drag and Drop-specific concerns
 */
function analyzeDragDropConcerns(content, concerns) {
  if (content.includes('Draggable') && !content.includes('keyboard')) {
    concerns.push({
      type: 'ACCESSIBILITY',
      severity: 'HIGH',
      issue: 'Drag and drop missing keyboard alternative',
      recommendation: 'Provide keyboard alternative for drag and drop functionality'
    });
    results.summary.accessibilityIssues++;
  }
}

/**
 * Generate specialized component recommendations
 */
function generateSpecializedRecommendations() {
  console.log('💡 Generating specialized component recommendations...');

  const recommendations = [];

  // Critical issues recommendations
  if (results.summary.criticalIssues > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Performance & Memory',
      title: `Fix ${results.summary.criticalIssues} critical issues in specialized components`,
      description: 'Critical issues can cause memory leaks and application crashes',
      action: 'Review and fix all critical performance and memory issues immediately'
    });
  }

  // Accessibility recommendations
  if (results.summary.accessibilityIssues > 3) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Accessibility',
      title: `Address ${results.summary.accessibilityIssues} accessibility issues in specialized components`,
      description: 'Specialized components often have unique accessibility challenges',
      action: 'Add ARIA labels, keyboard navigation, and screen reader support'
    });
  }

  // Performance recommendations
  if (results.summary.performanceIssues > 2) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Performance',
      title: `Optimize ${results.summary.performanceIssues} performance issues`,
      description: 'Performance issues in specialized components can significantly impact UX',
      action: 'Implement memoization, cleanup, and performance optimizations'
    });
  }

  // Component-specific recommendations
  if (results.summary.reactFlowComponents > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'ReactFlow',
      title: 'Optimize ReactFlow component implementations',
      description: `${results.summary.reactFlowComponents} ReactFlow components found`,
      action: 'Add node memoization, connection validation, and accessibility features'
    });
  }

  if (results.summary.d3Components > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'D3 Visualizations',
      title: 'Enhance D3 component reliability and accessibility',
      description: `${results.summary.d3Components} D3 components found`,
      action: 'Add proper cleanup, accessibility attributes, and responsive behavior'
    });
  }

  if (results.summary.monacoComponents > 0) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Code Editor',
      title: 'Improve Monaco Editor integration',
      description: `${results.summary.monacoComponents} Monaco Editor components found`,
      action: 'Add proper disposal, loading states, and accessibility support'
    });
  }

  results.recommendations = recommendations;
}

/**
 * Generate comprehensive specialized components report
 */
function generateSpecializedReport() {
  console.log('📄 Generating specialized components report...');

  const report = `# Specialized Component Analysis Report

## Executive Summary

**Analysis Date**: ${results.summary.generatedAt}
**Files Analyzed**: ${results.summary.totalFiles}
**Specialized Components Found**: ${results.summary.specializedComponents}

### Component Distribution
- **ReactFlow Components**: ${results.summary.reactFlowComponents}
- **D3 Visualizations**: ${results.summary.d3Components}
- **Monaco Editor**: ${results.summary.monacoComponents}
- **Lexical Editor**: ${results.summary.lexicalComponents}
- **Chart Components**: ${results.summary.chartComponents}
- **Complex Forms**: ${results.summary.complexFormComponents}
- **Virtualization**: ${results.summary.virtualizationComponents}
- **Drag & Drop**: ${results.summary.dragDropComponents}

### Issue Summary
- **Critical Issues**: ${results.summary.criticalIssues}
- **Accessibility Issues**: ${results.summary.accessibilityIssues}
- **Performance Issues**: ${results.summary.performanceIssues}

## Detailed Findings

### 1. ReactFlow Components (${results.summary.reactFlowComponents} found)

${results.componentsByType.REACTFLOW.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.REACTFLOW.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

**Common Patterns:**
${Object.entries(
  results.componentsByType.REACTFLOW.patterns.reduce((acc, pattern) => {
    acc[pattern.pattern] = (acc[pattern.pattern] || 0) + pattern.matches;
    return acc;
  }, {})
).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pattern, count]) => `- \`${pattern}\`: ${count} uses`).join('\n')}

${results.componentsByType.REACTFLOW.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.REACTFLOW.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No ReactFlow components found*'
}

### 2. D3 Visualizations (${results.summary.d3Components} found)

${results.componentsByType.D3.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.D3.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

**Common Patterns:**
${Object.entries(
  results.componentsByType.D3.patterns.reduce((acc, pattern) => {
    acc[pattern.pattern] = (acc[pattern.pattern] || 0) + pattern.matches;
    return acc;
  }, {})
).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([pattern, count]) => `- \`${pattern}\`: ${count} uses`).join('\n')}

${results.componentsByType.D3.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.D3.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No D3 visualizations found*'
}

### 3. Monaco Editor Components (${results.summary.monacoComponents} found)

${results.componentsByType.MONACO.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.MONACO.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

${results.componentsByType.MONACO.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.MONACO.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No Monaco Editor components found*'
}

### 4. Lexical Editor Components (${results.summary.lexicalComponents} found)

${results.componentsByType.LEXICAL.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.LEXICAL.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

${results.componentsByType.LEXICAL.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.LEXICAL.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No Lexical Editor components found*'
}

### 5. Chart Components (${results.summary.chartComponents} found)

${results.componentsByType.CHARTS.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.CHARTS.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

**Common Chart Types:**
${Object.entries(
  results.componentsByType.CHARTS.patterns.reduce((acc, pattern) => {
    if (pattern.pattern.includes('Chart')) {
      acc[pattern.pattern] = (acc[pattern.pattern] || 0) + pattern.matches;
    }
    return acc;
  }, {})
).sort((a, b) => b[1] - a[1]).map(([pattern, count]) => `- \`${pattern}\`: ${count} uses`).join('\n')}

${results.componentsByType.CHARTS.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.CHARTS.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No Chart components found*'
}

### 6. Complex Form Components (${results.summary.complexFormComponents} found)

${results.componentsByType.COMPLEX_FORMS.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.COMPLEX_FORMS.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

${results.componentsByType.COMPLEX_FORMS.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.COMPLEX_FORMS.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No Complex Form components found*'
}

### 7. Virtualization Components (${results.summary.virtualizationComponents} found)

${results.componentsByType.VIRTUALIZATION.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.VIRTUALIZATION.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

${results.componentsByType.VIRTUALIZATION.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.VIRTUALIZATION.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No Virtualization components found*'
}

### 8. Drag & Drop Components (${results.summary.dragDropComponents} found)

${results.componentsByType.DRAG_DROP.files.length > 0 ?
  `**Components Found:**
${results.componentsByType.DRAG_DROP.files.map(comp =>
  `- **${comp.file}** (Complexity: ${comp.complexity}, Lines: ${comp.lineCount})`
).join('\n')}

${results.componentsByType.DRAG_DROP.issues.length > 0 ?
  `**Issues Found:**
${results.componentsByType.DRAG_DROP.issues.map(issue =>
  `- **${issue.file}**: ${issue.concerns.length} concerns`
).join('\n')}` : '**Issues**: No issues detected'
}` :
  '*No Drag & Drop components found*'
}

## Critical Issues Analysis

${results.specializedFindings.filter(f => f.concerns.some(c => c.severity === 'HIGH')).length > 0 ?
  `### High Severity Issues

${results.specializedFindings.filter(f => f.concerns.some(c => c.severity === 'HIGH')).map(finding =>
  `#### ${finding.file} (${finding.type})
${finding.concerns.filter(c => c.severity === 'HIGH').map(concern =>
    `- **${concern.type}**: ${concern.issue}
  - *Recommendation*: ${concern.recommendation}`
  ).join('\n')}`
).join('\n\n')}` :
  '*No high severity issues found*'
}

## Recommendations

### Critical Actions Required
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

## Best Practices for Specialized Components

### ReactFlow Components
1. **Performance**: Memoize custom nodes and edges
2. **Accessibility**: Add ARIA labels to nodes and provide keyboard navigation
3. **Validation**: Implement connection validation logic
4. **Responsive**: Ensure proper viewport handling on different screen sizes

### D3 Visualizations
1. **Memory Management**: Always clean up event listeners and DOM elements
2. **Accessibility**: Add SVG titles, descriptions, and ARIA attributes
3. **Performance**: Use data keys for efficient updates
4. **Responsive**: Implement responsive resize handling

### Monaco Editor
1. **Performance**: Dispose editors properly to prevent memory leaks
2. **Accessibility**: Configure editor for screen reader compatibility
3. **Loading**: Show loading states during editor initialization
4. **Themes**: Ensure sufficient color contrast in all themes

### Lexical Editor
1. **Error Handling**: Wrap in error boundaries for robust error handling
2. **Performance**: Debounce onChange events for better performance
3. **Accessibility**: Configure accessibility features and keyboard shortcuts
4. **Plugins**: Use appropriate plugins for required functionality

### Chart Components
1. **Accessibility**: Provide alternative text and data tables
2. **Responsive**: Use ResponsiveContainer for all charts
3. **Colors**: Ensure sufficient contrast and don't rely on color alone
4. **Performance**: Optimize for real-time data updates

### Complex Forms
1. **Error Handling**: Implement comprehensive error boundaries
2. **Performance**: Use lazy validation and form optimization techniques
3. **Accessibility**: Ensure proper form labeling and error announcements
4. **State Management**: Use appropriate state management for complex forms

### Virtualization
1. **Accessibility**: Implement proper ARIA attributes for virtual lists
2. **Keyboard Navigation**: Ensure keyboard navigation works correctly
3. **Performance**: Optimize item rendering and memory usage
4. **Screen Readers**: Provide appropriate announcements for dynamic content

### Drag & Drop
1. **Accessibility**: Always provide keyboard alternatives
2. **Visual Feedback**: Ensure clear visual feedback during drag operations
3. **Touch Support**: Test and optimize for touch devices
4. **Screen Readers**: Implement proper announcements for drag and drop actions

---

*Report generated on ${results.summary.generatedAt} by MachShop UI Assessment Tool*
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
    path.join(OUTPUT_DIR, 'specialized-components-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Save human-readable report
  const report = generateSpecializedReport();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'specialized-components-report.md'),
    report
  );

  console.log(`📊 Specialized components analysis complete! Reports saved to ${OUTPUT_DIR}`);
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting specialized component analysis...');
  console.log(`📂 Analyzing frontend directory: ${FRONTEND_DIR}`);
  console.log(`📝 Results will be saved to: ${OUTPUT_DIR}`);

  try {
    console.log('\n🔬 Phase 1: Component Discovery and Pattern Analysis...');
    analyzeSpecializedComponents();

    console.log('\n💡 Phase 2: Recommendation Generation...');
    generateSpecializedRecommendations();

    console.log('\n📄 Phase 3: Report Generation...');
    saveResults();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 SPECIALIZED COMPONENTS ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Files Analyzed: ${results.summary.totalFiles}`);
    console.log(`Specialized Components: ${results.summary.specializedComponents}`);
    console.log(`ReactFlow Components: ${results.summary.reactFlowComponents}`);
    console.log(`D3 Visualizations: ${results.summary.d3Components}`);
    console.log(`Monaco Editors: ${results.summary.monacoComponents}`);
    console.log(`Lexical Editors: ${results.summary.lexicalComponents}`);
    console.log(`Chart Components: ${results.summary.chartComponents}`);
    console.log(`Complex Forms: ${results.summary.complexFormComponents}`);
    console.log(`Virtualization: ${results.summary.virtualizationComponents}`);
    console.log(`Drag & Drop: ${results.summary.dragDropComponents}`);
    console.log(`Critical Issues: ${results.summary.criticalIssues}`);
    console.log(`Accessibility Issues: ${results.summary.accessibilityIssues}`);
    console.log(`Performance Issues: ${results.summary.performanceIssues}`);
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
  analyzeSpecializedComponents,
  generateSpecializedRecommendations,
  results
};