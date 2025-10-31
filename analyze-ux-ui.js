#!/usr/bin/env node

/**
 * MachShop UI Assessment - Phase 7: UX/UI Quality and Responsive Design Analysis
 *
 * This script comprehensively analyzes:
 * - UI component consistency and design patterns
 * - Responsive design implementation
 * - Color scheme and accessibility compliance
 * - Typography and visual hierarchy
 * - Spacing, layout, and visual consistency
 * - Form usability and input design
 * - Loading states and feedback mechanisms
 * - Mobile and tablet compatibility
 */

const fs = require('fs');
const path = require('path');

// Analysis configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const OUTPUT_DIR = path.join(__dirname, 'docs', 'ui-assessment', '07-UX-UI');

// Design system analysis patterns
const DESIGN_PATTERNS = {
  COLORS: {
    // Ant Design default colors and custom color patterns
    patterns: [
      /--primary-color:\s*([^;]+)/g,
      /color:\s*([^;,}]+)/g,
      /#[0-9a-fA-F]{3,6}/g,
      /rgb\([^)]+\)/g,
      /rgba\([^)]+\)/g,
      /hsl\([^)]+\)/g,
      /antd-[a-zA-Z]+-[0-9]+/g,
      /blue-[0-9]+/g,
      /green-[0-9]+/g,
      /red-[0-9]+/g
    ],
    accessibility: [
      /contrast.*low/i,
      /contrast.*fail/i,
      /color.*only/i
    ]
  },
  TYPOGRAPHY: {
    patterns: [
      /font-size:\s*([^;,}]+)/g,
      /font-family:\s*([^;,}]+)/g,
      /font-weight:\s*([^;,}]+)/g,
      /line-height:\s*([^;,}]+)/g,
      /text-[a-zA-Z-]+/g,
      /Typography\./g,
      /\.ant-typography/g
    ],
    hierarchy: [
      /h1|heading-1|title-1/gi,
      /h2|heading-2|title-2/gi,
      /h3|heading-3|title-3/gi,
      /h4|heading-4|title-4/gi,
      /h5|heading-5|title-5/gi,
      /h6|heading-6|title-6/gi
    ]
  },
  SPACING: {
    patterns: [
      /margin:\s*([^;,}]+)/g,
      /padding:\s*([^;,}]+)/g,
      /gap:\s*([^;,}]+)/g,
      /space-[0-9]+/g,
      /m[trblxy]?-[0-9]+/g,
      /p[trblxy]?-[0-9]+/g
    ]
  },
  RESPONSIVE: {
    patterns: [
      /@media.*screen/g,
      /min-width:\s*([^)]+)/g,
      /max-width:\s*([^)]+)/g,
      /breakpoint/gi,
      /xs|sm|md|lg|xl|xxl/g,
      /mobile|tablet|desktop/gi
    ],
    breakpoints: [
      /480px|576px|768px|992px|1200px|1600px/g
    ]
  },
  COMPONENTS: {
    antd: [
      /Button/g,
      /Input/g,
      /Form/g,
      /Table/g,
      /Modal/g,
      /Card/g,
      /Layout/g,
      /Menu/g,
      /Select/g,
      /DatePicker/g,
      /Upload/g,
      /Drawer/g,
      /Tabs/g,
      /Steps/g,
      /Collapse/g,
      /Pagination/g,
      /Spin/g,
      /Alert/g,
      /Message/g,
      /Notification/g
    ],
    custom: [
      /components\/[A-Z][a-zA-Z]+/g
    ]
  }
};

// Screen sizes for responsive analysis
const SCREEN_SIZES = {
  mobile: { width: 375, name: 'Mobile' },
  tablet: { width: 768, name: 'Tablet' },
  desktop: { width: 1200, name: 'Desktop' },
  wide: { width: 1920, name: 'Wide Desktop' }
};

// Analysis results
const results = {
  summary: {
    totalFiles: 0,
    componentsAnalyzed: 0,
    colorsFound: 0,
    typographyIssues: 0,
    responsiveIssues: 0,
    accessibilityIssues: 0,
    consistencyIssues: 0,
    generatedAt: new Date().toISOString()
  },
  designSystem: {
    colors: [],
    typography: [],
    spacing: [],
    components: []
  },
  responsiveDesign: {
    breakpoints: [],
    mediaQueries: [],
    issues: []
  },
  accessibility: {
    colorContrast: [],
    focusStates: [],
    interactiveElements: [],
    issues: []
  },
  consistency: {
    patterns: [],
    violations: [],
    recommendations: []
  },
  recommendations: []
};

/**
 * Analyze design system usage across components
 */
function analyzeDesignSystem() {
  console.log('🎨 Analyzing design system usage...');

  function analyzeDirectory(dir) {
    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory() && !item.startsWith('.')) {
        analyzeDirectory(fullPath);
      } else if (item.match(/\.(tsx|ts|css|scss|less)$/)) {
        results.summary.totalFiles++;
        analyzeFile(fullPath);
      }
    }
  }

  analyzeDirectory(FRONTEND_DIR);
}

/**
 * Analyze individual file for design patterns
 */
function analyzeFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const relativePath = path.relative(FRONTEND_DIR, filePath);

  // Analyze colors
  analyzeColors(content, relativePath, lines);

  // Analyze typography
  analyzeTypography(content, relativePath, lines);

  // Analyze spacing
  analyzeSpacing(content, relativePath, lines);

  // Analyze component usage
  analyzeComponents(content, relativePath, lines);

  // Analyze responsive design
  analyzeResponsiveDesign(content, relativePath, lines);

  // Analyze accessibility patterns
  analyzeAccessibilityPatterns(content, relativePath, lines);
}

/**
 * Analyze color usage and consistency
 */
function analyzeColors(content, filePath, lines) {
  DESIGN_PATTERNS.COLORS.patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      const color = match[1] || match[0];

      results.designSystem.colors.push({
        file: filePath,
        color: color.trim(),
        type: getColorType(color),
        context: getLineContext(lines, content.indexOf(match[0]))
      });

      results.summary.colorsFound++;
    }
  });

  // Check for accessibility issues
  DESIGN_PATTERNS.COLORS.accessibility.forEach(pattern => {
    if (pattern.test(content)) {
      results.accessibility.colorContrast.push({
        file: filePath,
        issue: 'Potential color accessibility issue',
        pattern: pattern.source
      });
      results.summary.accessibilityIssues++;
    }
  });
}

/**
 * Analyze typography usage
 */
function analyzeTypography(content, filePath, lines) {
  DESIGN_PATTERNS.TYPOGRAPHY.patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.designSystem.typography.push({
        file: filePath,
        property: match[0],
        value: match[1] || 'N/A',
        context: getLineContext(lines, content.indexOf(match[0]))
      });
    }
  });

  // Check typography hierarchy
  let headingLevels = [];
  DESIGN_PATTERNS.TYPOGRAPHY.hierarchy.forEach((pattern, index) => {
    if (pattern.test(content)) {
      headingLevels.push(index + 1);
    }
  });

  // Check for hierarchy issues
  if (headingLevels.length > 0) {
    const sorted = [...headingLevels].sort();
    const isProperHierarchy = sorted.every((level, index) =>
      index === 0 || level <= sorted[index - 1] + 1
    );

    if (!isProperHierarchy) {
      results.summary.typographyIssues++;
      results.consistency.violations.push({
        file: filePath,
        type: 'TYPOGRAPHY_HIERARCHY',
        severity: 'MEDIUM',
        description: 'Improper heading hierarchy detected',
        levels: headingLevels
      });
    }
  }
}

/**
 * Analyze spacing consistency
 */
function analyzeSpacing(content, filePath, lines) {
  DESIGN_PATTERNS.SPACING.patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.designSystem.spacing.push({
        file: filePath,
        property: match[0].split(':')[0],
        value: match[1] || match[0],
        context: getLineContext(lines, content.indexOf(match[0]))
      });
    }
  });
}

/**
 * Analyze component usage patterns
 */
function analyzeComponents(content, filePath, lines) {
  // Ant Design components
  DESIGN_PATTERNS.COMPONENTS.antd.forEach(component => {
    const matches = content.match(new RegExp(`<${component.source}[\\s>]`, 'g'));
    if (matches) {
      results.designSystem.components.push({
        file: filePath,
        component: component.source,
        type: 'antd',
        count: matches.length,
        usage: 'standard'
      });
      results.summary.componentsAnalyzed++;
    }
  });

  // Custom components
  DESIGN_PATTERNS.COMPONENTS.custom.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.designSystem.components.push({
        file: filePath,
        component: match[0],
        type: 'custom',
        count: 1,
        usage: 'custom'
      });
    }
  });
}

/**
 * Analyze responsive design implementation
 */
function analyzeResponsiveDesign(content, filePath, lines) {
  // Find media queries
  DESIGN_PATTERNS.RESPONSIVE.patterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.responsiveDesign.mediaQueries.push({
        file: filePath,
        query: match[0],
        value: match[1] || 'N/A',
        context: getLineContext(lines, content.indexOf(match[0]))
      });
    }
  });

  // Find breakpoints
  DESIGN_PATTERNS.RESPONSIVE.breakpoints.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.responsiveDesign.breakpoints.push({
        file: filePath,
        breakpoint: match[0],
        context: getLineContext(lines, content.indexOf(match[0]))
      });
    }
  });

  // Check for responsive issues
  if (content.includes('overflow-x') && content.includes('scroll')) {
    results.responsiveDesign.issues.push({
      file: filePath,
      type: 'HORIZONTAL_SCROLL',
      severity: 'MEDIUM',
      description: 'Potential horizontal scrolling detected'
    });
    results.summary.responsiveIssues++;
  }

  if (content.includes('fixed') && content.includes('width') && !content.includes('max-width')) {
    results.responsiveDesign.issues.push({
      file: filePath,
      type: 'FIXED_WIDTH',
      severity: 'LOW',
      description: 'Fixed width without max-width constraint'
    });
    results.summary.responsiveIssues++;
  }
}

/**
 * Analyze accessibility patterns in UI
 */
function analyzeAccessibilityPatterns(content, filePath, lines) {
  // Focus states
  const focusPatterns = [
    /:focus/g,
    /focus-visible/g,
    /outline/g,
    /ring/g
  ];

  focusPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.accessibility.focusStates.push({
        file: filePath,
        pattern: match[0],
        context: getLineContext(lines, content.indexOf(match[0]))
      });
    }
  });

  // Interactive elements
  const interactivePatterns = [
    /onClick/g,
    /onKeyDown/g,
    /tabIndex/g,
    /role=/g,
    /aria-/g
  ];

  interactivePatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      results.accessibility.interactiveElements.push({
        file: filePath,
        pattern: match[0],
        context: getLineContext(lines, content.indexOf(match[0]))
      });
    }
  });

  // Check for accessibility anti-patterns
  const antiPatterns = [
    { pattern: /onClick.*(?!onKeyDown)/g, issue: 'Click handler without keyboard support' },
    { pattern: /tabIndex.*-1/g, issue: 'Negative tabIndex removing keyboard access' },
    { pattern: /color.*only/gi, issue: 'Relying on color alone for information' }
  ];

  antiPatterns.forEach(({ pattern, issue }) => {
    if (pattern.test(content)) {
      results.accessibility.issues.push({
        file: filePath,
        issue,
        severity: 'MEDIUM',
        pattern: pattern.source
      });
      results.summary.accessibilityIssues++;
    }
  });
}

/**
 * Get color type classification
 */
function getColorType(color) {
  if (color.startsWith('#')) return 'hex';
  if (color.startsWith('rgb')) return 'rgb';
  if (color.startsWith('hsl')) return 'hsl';
  if (color.includes('antd') || color.includes('primary') || color.includes('secondary')) return 'theme';
  if (/^[a-zA-Z]+$/.test(color)) return 'named';
  return 'unknown';
}

/**
 * Get line context for a position in content
 */
function getLineContext(lines, position) {
  if (position < 0) return 'N/A';

  let currentPos = 0;
  for (let i = 0; i < lines.length; i++) {
    if (currentPos + lines[i].length >= position) {
      return lines[i].trim();
    }
    currentPos += lines[i].length + 1; // +1 for newline
  }
  return 'N/A';
}

/**
 * Analyze consistency patterns across the codebase
 */
function analyzeConsistency() {
  console.log('🔍 Analyzing UI consistency patterns...');

  // Group colors by type and frequency
  const colorUsage = {};
  results.designSystem.colors.forEach(color => {
    const key = color.color.toLowerCase();
    if (!colorUsage[key]) {
      colorUsage[key] = { count: 0, files: new Set(), type: color.type };
    }
    colorUsage[key].count++;
    colorUsage[key].files.add(color.file);
  });

  // Identify inconsistent color usage
  Object.entries(colorUsage).forEach(([color, usage]) => {
    if (usage.count === 1 && usage.type === 'hex' && !color.includes('transparent')) {
      results.consistency.violations.push({
        type: 'COLOR_INCONSISTENCY',
        severity: 'LOW',
        description: `Color ${color} used only once - consider using theme colors`,
        color,
        files: Array.from(usage.files)
      });
      results.summary.consistencyIssues++;
    }
  });

  // Group component usage
  const componentUsage = {};
  results.designSystem.components.forEach(comp => {
    const key = comp.component;
    if (!componentUsage[key]) {
      componentUsage[key] = { count: 0, files: new Set(), type: comp.type };
    }
    componentUsage[key].count++;
    componentUsage[key].files.add(comp.file);
  });

  // Identify component consistency patterns
  const popularComponents = Object.entries(componentUsage)
    .filter(([_, usage]) => usage.count > 5)
    .sort((a, b) => b[1].count - a[1].count);

  results.consistency.patterns = popularComponents.map(([component, usage]) => ({
    component,
    usage: usage.count,
    files: usage.files.size,
    type: usage.type,
    consistency: usage.files.size > 1 ? 'consistent' : 'isolated'
  }));
}

/**
 * Generate UX/UI recommendations
 */
function generateRecommendations() {
  console.log('💡 Generating UX/UI recommendations...');

  const recommendations = [];

  // Color consistency recommendations
  const inconsistentColors = results.consistency.violations.filter(v => v.type === 'COLOR_INCONSISTENCY');
  if (inconsistentColors.length > 5) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Design Consistency',
      title: `Standardize ${inconsistentColors.length} inconsistent color usages`,
      description: 'Multiple one-off colors can create visual inconsistency',
      action: 'Create a standardized color palette and replace one-off colors with theme colors'
    });
  }

  // Typography recommendations
  if (results.summary.typographyIssues > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Typography',
      title: `Fix ${results.summary.typographyIssues} typography hierarchy issues`,
      description: 'Proper heading hierarchy is important for accessibility and SEO',
      action: 'Review and fix heading level progressions throughout the application'
    });
  }

  // Responsive design recommendations
  if (results.summary.responsiveIssues > 3) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Responsive Design',
      title: `Address ${results.summary.responsiveIssues} responsive design issues`,
      description: 'Responsive issues can significantly impact mobile user experience',
      action: 'Test and fix responsive behavior across all major breakpoints'
    });
  }

  // Accessibility recommendations
  if (results.summary.accessibilityIssues > 2) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Accessibility',
      title: `Fix ${results.summary.accessibilityIssues} UI accessibility issues`,
      description: 'UI accessibility issues prevent some users from using the application',
      action: 'Add proper keyboard support, ARIA labels, and focus management'
    });
  }

  // Component consistency recommendations
  const antdComponents = results.consistency.patterns.filter(p => p.type === 'antd').length;
  const customComponents = results.consistency.patterns.filter(p => p.type === 'custom').length;

  if (customComponents > antdComponents) {
    recommendations.push({
      priority: 'LOW',
      category: 'Component Strategy',
      title: 'Review custom component necessity',
      description: `${customComponents} custom components vs ${antdComponents} Ant Design components`,
      action: 'Evaluate if custom components could be replaced with Ant Design equivalents'
    });
  }

  // Design system adoption recommendations
  const themeColors = results.designSystem.colors.filter(c => c.type === 'theme').length;
  const hexColors = results.designSystem.colors.filter(c => c.type === 'hex').length;

  if (hexColors > themeColors * 2) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Design System',
      title: 'Increase theme color adoption',
      description: `${hexColors} hardcoded colors vs ${themeColors} theme colors`,
      action: 'Replace hardcoded colors with design system theme colors'
    });
  }

  results.recommendations = recommendations;
}

/**
 * Generate comprehensive UX/UI report
 */
function generateUXUIReport() {
  console.log('📄 Generating UX/UI quality report...');

  const report = `# UX/UI Quality and Responsive Design Analysis Report

## Executive Summary

**Analysis Date**: ${results.summary.generatedAt}
**Files Analyzed**: ${results.summary.totalFiles}
**Components Analyzed**: ${results.summary.componentsAnalyzed}

### Design System Health
- **Colors Found**: ${results.summary.colorsFound}
- **Typography Issues**: ${results.summary.typographyIssues}
- **Responsive Issues**: ${results.summary.responsiveIssues}
- **Accessibility Issues**: ${results.summary.accessibilityIssues}
- **Consistency Issues**: ${results.summary.consistencyIssues}

## Detailed Findings

### 1. Design System Analysis

#### Color Usage (${results.designSystem.colors.length} instances)

**By Type:**
${Object.entries(
  results.designSystem.colors.reduce((acc, color) => {
    acc[color.type] = (acc[color.type] || 0) + 1;
    return acc;
  }, {})
).map(([type, count]) => `- **${type.charAt(0).toUpperCase() + type.slice(1)}**: ${count}`).join('\n')}

#### Component Usage Patterns

**Most Used Components:**
${results.consistency.patterns.slice(0, 10).map(pattern =>
  `- **${pattern.component}** (${pattern.type}): Used ${pattern.usage} times across ${pattern.files} files`
).join('\n')}

#### Typography Analysis

**Typography Properties Found**: ${results.designSystem.typography.length}
${results.summary.typographyIssues > 0 ?
  `\n**Issues Detected**: ${results.summary.typographyIssues} heading hierarchy violations` :
  '\n**Status**: No typography hierarchy issues detected'
}

### 2. Responsive Design Analysis

#### Breakpoints Found (${results.responsiveDesign.breakpoints.length} instances)

${results.responsiveDesign.breakpoints.length > 0 ?
  `**Common Breakpoints:**
${Object.entries(
  results.responsiveDesign.breakpoints.reduce((acc, bp) => {
    acc[bp.breakpoint] = (acc[bp.breakpoint] || 0) + 1;
    return acc;
  }, {})
).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([bp, count]) => `- **${bp}**: ${count} uses`).join('\n')}` :
  '*No responsive breakpoints found*'
}

#### Media Queries (${results.responsiveDesign.mediaQueries.length} found)

${results.responsiveDesign.mediaQueries.length > 0 ?
  `**Sample Media Queries:**
${results.responsiveDesign.mediaQueries.slice(0, 5).map(mq =>
  `- \`${mq.query}\` in ${mq.file}`
).join('\n')}
${results.responsiveDesign.mediaQueries.length > 5 ? `\n*...and ${results.responsiveDesign.mediaQueries.length - 5} more*` : ''}` :
  '*No media queries found*'
}

#### Responsive Issues (${results.summary.responsiveIssues} found)

${results.responsiveDesign.issues.length > 0 ?
  `| File | Type | Severity | Description |
|------|------|----------|-------------|
${results.responsiveDesign.issues.map(issue => `| ${issue.file} | ${issue.type} | ${issue.severity} | ${issue.description} |`).join('\n')}` :
  '*No responsive design issues detected*'
}

### 3. Accessibility Analysis

#### Focus States (${results.accessibility.focusStates.length} found)

${results.accessibility.focusStates.length > 0 ?
  `**Focus Implementation Status**: ${results.accessibility.focusStates.length} focus-related patterns found across ${new Set(results.accessibility.focusStates.map(f => f.file)).size} files` :
  '**Focus Implementation Status**: Limited focus state implementation detected'
}

#### Interactive Elements (${results.accessibility.interactiveElements.length} found)

**Accessibility Patterns:**
${Object.entries(
  results.accessibility.interactiveElements.reduce((acc, elem) => {
    acc[elem.pattern] = (acc[elem.pattern] || 0) + 1;
    return acc;
  }, {})
).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([pattern, count]) => `- **${pattern}**: ${count} uses`).join('\n')}

#### Accessibility Issues (${results.summary.accessibilityIssues} found)

${results.accessibility.issues.length > 0 ?
  `| File | Issue | Severity |
|------|-------|----------|
${results.accessibility.issues.map(issue => `| ${issue.file} | ${issue.issue} | ${issue.severity} |`).join('\n')}` :
  '*No accessibility anti-patterns detected*'
}

### 4. Design Consistency Analysis

#### Consistency Violations (${results.summary.consistencyIssues} found)

${results.consistency.violations.length > 0 ?
  `**By Type:**
${Object.entries(
  results.consistency.violations.reduce((acc, violation) => {
    acc[violation.type] = (acc[violation.type] || 0) + 1;
    return acc;
  }, {})
).map(([type, count]) => `- **${type.replace(/_/g, ' ')}**: ${count} violations`).join('\n')}

**Sample Violations:**
${results.consistency.violations.slice(0, 5).map(violation =>
  `- **${violation.type}**: ${violation.description}`
).join('\n')}
${results.consistency.violations.length > 5 ? `\n*...and ${results.consistency.violations.length - 5} more*` : ''}` :
  '*No consistency violations detected*'
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

### Low Priority Actions
${results.recommendations.filter(r => r.priority === 'LOW').map(r =>
  `1. **${r.title}** (${r.category})
   - ${r.description}
   - Action: ${r.action}`
).join('\n')}

## Best Practices for UX/UI Quality

### Design System
1. **Consistent Color Palette** - Use theme colors instead of hardcoded values
2. **Typography Scale** - Implement consistent typography hierarchy
3. **Component Library** - Leverage Ant Design components for consistency
4. **Spacing System** - Use consistent spacing values throughout

### Responsive Design
1. **Mobile-First Approach** - Design for mobile devices first
2. **Flexible Layouts** - Use CSS Grid and Flexbox for responsive layouts
3. **Breakpoint Strategy** - Define clear breakpoint strategy and stick to it
4. **Touch Targets** - Ensure interactive elements are appropriately sized for touch

### Accessibility
1. **Keyboard Navigation** - Ensure all interactive elements are keyboard accessible
2. **Color Contrast** - Maintain WCAG AA contrast ratios
3. **Focus Management** - Implement visible and logical focus indicators
4. **Semantic HTML** - Use proper HTML semantics and ARIA attributes

### Performance
1. **Optimized Assets** - Compress and optimize images and fonts
2. **Critical CSS** - Load critical CSS inline for faster rendering
3. **Progressive Enhancement** - Build core functionality first, enhance progressively
4. **Loading States** - Provide feedback during loading and transitions

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
    path.join(OUTPUT_DIR, 'ux-ui-analysis-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Save human-readable report
  const report = generateUXUIReport();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'ux-ui-analysis-report.md'),
    report
  );

  console.log(`📊 UX/UI analysis complete! Reports saved to ${OUTPUT_DIR}`);
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting comprehensive UX/UI quality and responsive design analysis...');
  console.log(`📂 Analyzing frontend directory: ${FRONTEND_DIR}`);
  console.log(`📝 Results will be saved to: ${OUTPUT_DIR}`);

  try {
    console.log('\n🎨 Phase 1: Design System Analysis...');
    analyzeDesignSystem();

    console.log('\n🔍 Phase 2: Consistency Analysis...');
    analyzeConsistency();

    console.log('\n💡 Phase 3: Recommendation Generation...');
    generateRecommendations();

    console.log('\n📄 Phase 4: Report Generation...');
    saveResults();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 UX/UI ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Files Analyzed: ${results.summary.totalFiles}`);
    console.log(`Components Analyzed: ${results.summary.componentsAnalyzed}`);
    console.log(`Colors Found: ${results.summary.colorsFound}`);
    console.log(`Typography Issues: ${results.summary.typographyIssues}`);
    console.log(`Responsive Issues: ${results.summary.responsiveIssues}`);
    console.log(`Accessibility Issues: ${results.summary.accessibilityIssues}`);
    console.log(`Consistency Issues: ${results.summary.consistencyIssues}`);
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
  analyzeDesignSystem,
  analyzeConsistency,
  generateRecommendations,
  results
};