#!/usr/bin/env node

/**
 * MachShop UI Assessment - Phase 3: Navigation Structure and User Flow Analysis
 *
 * This script systematically analyzes:
 * - Navigation menu hierarchy and structure
 * - User flow patterns between sections
 * - Navigation accessibility and efficiency
 * - Route relationships and dependencies
 * - Breadcrumb trails and deep-linking
 * - Dead-end routes and orphaned pages
 */

const fs = require('fs');
const path = require('path');

// Analysis configuration
const FRONTEND_DIR = path.join(__dirname, 'frontend', 'src');
const OUTPUT_DIR = path.join(__dirname, 'docs', 'ui-assessment', '03-NAVIGATION');

// Known application routes and their relationships
const ROUTE_HIERARCHY = {
  '/': {
    title: 'Dashboard',
    type: 'root',
    children: [],
    parent: null,
    access: 'all'
  },
  '/login': {
    title: 'Login',
    type: 'auth',
    children: [],
    parent: null,
    access: 'public'
  },
  '/dashboard': {
    title: 'Dashboard',
    type: 'dashboard',
    children: [],
    parent: '/',
    access: 'authenticated'
  },
  '/work-orders': {
    title: 'Work Orders',
    type: 'module',
    children: ['/work-orders/create', '/work-orders/:id'],
    parent: null,
    access: 'production'
  },
  '/work-orders/create': {
    title: 'Create Work Order',
    type: 'form',
    children: [],
    parent: '/work-orders',
    access: 'production-create'
  },
  '/work-orders/:id': {
    title: 'Work Order Details',
    type: 'detail',
    children: [],
    parent: '/work-orders',
    access: 'production-view'
  },
  '/quality': {
    title: 'Quality',
    type: 'module',
    children: ['/quality/inspections', '/quality/ncrs', '/quality/fai'],
    parent: null,
    access: 'quality'
  },
  '/quality/inspections': {
    title: 'Quality Inspections',
    type: 'list',
    children: ['/quality/inspections/create', '/quality/inspections/:id'],
    parent: '/quality',
    access: 'quality-inspector'
  },
  '/quality/inspections/create': {
    title: 'Create Inspection',
    type: 'form',
    children: [],
    parent: '/quality/inspections',
    access: 'quality-create'
  },
  '/quality/inspections/:id': {
    title: 'Inspection Details',
    type: 'detail',
    children: [],
    parent: '/quality/inspections',
    access: 'quality-view'
  },
  '/quality/ncrs': {
    title: 'Non-Conformance Reports',
    type: 'list',
    children: ['/quality/ncrs/create', '/quality/ncrs/:id'],
    parent: '/quality',
    access: 'quality-engineer'
  },
  '/quality/ncrs/create': {
    title: 'Create NCR',
    type: 'form',
    children: [],
    parent: '/quality/ncrs',
    access: 'quality-create'
  },
  '/quality/ncrs/:id': {
    title: 'NCR Details',
    type: 'detail',
    children: [],
    parent: '/quality/ncrs',
    access: 'quality-view'
  },
  '/quality/fai': {
    title: 'First Article Inspection',
    type: 'list',
    children: ['/quality/fai/create', '/quality/fai/:id'],
    parent: '/quality',
    access: 'quality-engineer'
  },
  '/quality/fai/create': {
    title: 'Create FAI',
    type: 'form',
    children: [],
    parent: '/quality/fai',
    access: 'quality-create'
  },
  '/quality/fai/:id': {
    title: 'FAI Details',
    type: 'detail',
    children: [],
    parent: '/quality/fai',
    access: 'quality-view'
  },
  '/traceability': {
    title: 'Traceability',
    type: 'module',
    children: ['/traceability/:serialNumber'],
    parent: null,
    access: 'quality'
  },
  '/traceability/:serialNumber': {
    title: 'Traceability Details',
    type: 'detail',
    children: [],
    parent: '/traceability',
    access: 'quality-view'
  },
  '/routing': {
    title: 'Routing Management',
    type: 'module',
    children: ['/routing/create', '/routing/:id/edit'],
    parent: null,
    access: 'manufacturing-engineer'
  },
  '/routing/create': {
    title: 'Create Routing',
    type: 'form',
    children: [],
    parent: '/routing',
    access: 'engineering-create'
  },
  '/routing/:id/edit': {
    title: 'Edit Routing',
    type: 'form',
    children: [],
    parent: '/routing',
    access: 'engineering-edit'
  },
  '/equipment': {
    title: 'Equipment Management',
    type: 'module',
    children: ['/equipment/:id'],
    parent: null,
    access: 'maintenance'
  },
  '/equipment/:id': {
    title: 'Equipment Details',
    type: 'detail',
    children: [],
    parent: '/equipment',
    access: 'maintenance-view'
  },
  '/work-instructions': {
    title: 'Work Instructions',
    type: 'module',
    children: ['/work-instructions/create', '/work-instructions/:id'],
    parent: null,
    access: 'manufacturing-engineer'
  },
  '/work-instructions/create': {
    title: 'Create Work Instruction',
    type: 'form',
    children: [],
    parent: '/work-instructions',
    access: 'engineering-create'
  },
  '/work-instructions/:id': {
    title: 'Work Instruction Details',
    type: 'detail',
    children: [],
    parent: '/work-instructions',
    access: 'engineering-view'
  },
  '/kits': {
    title: 'Kitting Management',
    type: 'module',
    children: ['/kits/create', '/kits/:id', '/kits/:id/analytics', '/kits/:id/reports'],
    parent: null,
    access: 'production'
  },
  '/kits/create': {
    title: 'Create Kit',
    type: 'form',
    children: [],
    parent: '/kits',
    access: 'production-create'
  },
  '/kits/:id': {
    title: 'Kit Details',
    type: 'detail',
    children: [],
    parent: '/kits',
    access: 'production-view'
  },
  '/kits/:id/analytics': {
    title: 'Kit Analytics',
    type: 'analytics',
    children: [],
    parent: '/kits/:id',
    access: 'production-analytics'
  },
  '/kits/:id/reports': {
    title: 'Kit Reports',
    type: 'reports',
    children: [],
    parent: '/kits/:id',
    access: 'production-reports'
  },
  '/operations': {
    title: 'Operations',
    type: 'module',
    children: ['/operations/:id'],
    parent: null,
    access: 'production'
  },
  '/operations/:id': {
    title: 'Operation Details',
    type: 'detail',
    children: [],
    parent: '/operations',
    access: 'production-view'
  },
  '/staging': {
    title: 'Material Staging',
    type: 'module',
    children: ['/staging/dashboard', '/staging/kits', '/staging/materials'],
    parent: null,
    access: 'production'
  },
  '/staging/dashboard': {
    title: 'Staging Dashboard',
    type: 'dashboard',
    children: [],
    parent: '/staging',
    access: 'production-view'
  },
  '/staging/kits': {
    title: 'Staging Kits',
    type: 'list',
    children: [],
    parent: '/staging',
    access: 'production-view'
  },
  '/staging/materials': {
    title: 'Staging Materials',
    type: 'list',
    children: [],
    parent: '/staging',
    access: 'production-view'
  },
  '/scheduling': {
    title: 'Production Scheduling',
    type: 'module',
    children: ['/scheduling/capacity'],
    parent: null,
    access: 'production-planner'
  },
  '/scheduling/capacity': {
    title: 'Capacity Planning',
    type: 'analytics',
    children: [],
    parent: '/scheduling',
    access: 'planning-view'
  },
  '/serialization': {
    title: 'Serialization',
    type: 'module',
    children: ['/serialization/create', '/serialization/:id'],
    parent: null,
    access: 'production'
  },
  '/serialization/create': {
    title: 'Create Serial Number',
    type: 'form',
    children: [],
    parent: '/serialization',
    access: 'production-create'
  },
  '/serialization/:id': {
    title: 'Serial Number Details',
    type: 'detail',
    children: [],
    parent: '/serialization',
    access: 'production-view'
  },
  '/integrations': {
    title: 'System Integrations',
    type: 'module',
    children: ['/integrations/azure', '/integrations/mes', '/integrations/erp'],
    parent: null,
    access: 'system-admin'
  },
  '/integrations/azure': {
    title: 'Azure Integration',
    type: 'integration',
    children: [],
    parent: '/integrations',
    access: 'system-admin'
  },
  '/integrations/mes': {
    title: 'MES Integration',
    type: 'integration',
    children: [],
    parent: '/integrations',
    access: 'system-admin'
  },
  '/integrations/erp': {
    title: 'ERP Integration',
    type: 'integration',
    children: [],
    parent: '/integrations',
    access: 'system-admin'
  },
  '/signatures': {
    title: 'Digital Signatures',
    type: 'module',
    children: ['/signatures/create', '/signatures/:id'],
    parent: null,
    access: 'quality'
  },
  '/signatures/create': {
    title: 'Create Signature',
    type: 'form',
    children: [],
    parent: '/signatures',
    access: 'quality-create'
  },
  '/signatures/:id': {
    title: 'Signature Details',
    type: 'detail',
    children: [],
    parent: '/signatures',
    access: 'quality-view'
  },
  '/materials': {
    title: 'Materials Management',
    type: 'placeholder',
    children: [],
    parent: null,
    access: 'production'
  },
  '/personnel': {
    title: 'Personnel Management',
    type: 'placeholder',
    children: [],
    parent: null,
    access: 'system-admin'
  },
  '/admin': {
    title: 'Administration',
    type: 'placeholder',
    children: [],
    parent: null,
    access: 'system-admin'
  },
  '/settings': {
    title: 'Settings',
    type: 'placeholder',
    children: [],
    parent: null,
    access: 'authenticated'
  }
};

// User flow patterns - common navigation paths
const COMMON_USER_FLOWS = [
  {
    name: 'Work Order Creation Flow',
    flow: ['/dashboard', '/work-orders', '/work-orders/create'],
    userRoles: ['Production Planner', 'Manufacturing Engineer'],
    expectedTime: '2-3 minutes',
    priority: 'critical'
  },
  {
    name: 'Quality Inspection Flow',
    flow: ['/dashboard', '/quality/inspections', '/quality/inspections/create'],
    userRoles: ['Quality Inspector'],
    expectedTime: '1-2 minutes',
    priority: 'critical'
  },
  {
    name: 'NCR Investigation Flow',
    flow: ['/dashboard', '/quality/ncrs', '/quality/ncrs/:id', '/traceability/:serialNumber'],
    userRoles: ['Quality Engineer'],
    expectedTime: '5-10 minutes',
    priority: 'high'
  },
  {
    name: 'Routing Management Flow',
    flow: ['/dashboard', '/routing', '/routing/create'],
    userRoles: ['Manufacturing Engineer'],
    expectedTime: '10-15 minutes',
    priority: 'high'
  },
  {
    name: 'Kit Analytics Review Flow',
    flow: ['/dashboard', '/kits', '/kits/:id', '/kits/:id/analytics'],
    userRoles: ['Production Planner'],
    expectedTime: '3-5 minutes',
    priority: 'medium'
  },
  {
    name: 'Equipment Maintenance Flow',
    flow: ['/dashboard', '/equipment', '/equipment/:id'],
    userRoles: ['Maintenance Technician'],
    expectedTime: '2-3 minutes',
    priority: 'medium'
  },
  {
    name: 'Traceability Investigation Flow',
    flow: ['/dashboard', '/traceability', '/traceability/:serialNumber'],
    userRoles: ['Quality Engineer', 'Quality Inspector'],
    expectedTime: '3-5 minutes',
    priority: 'high'
  }
];

// Analysis results
const results = {
  summary: {
    totalRoutes: Object.keys(ROUTE_HIERARCHY).length,
    moduleRoutes: 0,
    detailRoutes: 0,
    formRoutes: 0,
    placeholderRoutes: 0,
    orphanedRoutes: 0,
    navigationDepth: {
      average: 0,
      maximum: 0,
      minimum: 0
    },
    userFlowCoverage: 0,
    generatedAt: new Date().toISOString()
  },
  navigationStructure: {},
  userFlowAnalysis: [],
  navigationIssues: [],
  accessibilityIssues: [],
  recommendations: [],
  routeMetrics: {}
};

/**
 * Analyze navigation menu structure in source files
 */
function analyzeNavigationMenus() {
  console.log('🧭 Analyzing navigation menu structure...');

  const navigationFiles = [
    'components/Navigation/MainNavigation.tsx',
    'components/Layout/Sidebar.tsx',
    'components/Layout/Header.tsx',
    'App.tsx',
    'components/Navigation/NavigationMenu.tsx'
  ];

  const navigationStructure = {
    menus: [],
    links: [],
    breadcrumbs: [],
    issues: []
  };

  navigationFiles.forEach(file => {
    const fullPath = path.join(FRONTEND_DIR, file);
    if (fs.existsSync(fullPath)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      analyzeNavigationFile(content, file, navigationStructure);
    }
  });

  return navigationStructure;
}

/**
 * Analyze individual navigation file
 */
function analyzeNavigationFile(content, filename, structure) {
  const lines = content.split('\n');

  lines.forEach((line, index) => {
    // Look for navigation links
    const linkPatterns = [
      /<Link\s+to="([^"]+)"/g,
      /<NavLink\s+to="([^"]+)"/g,
      /navigate\(['"]([^'"]+)['"]\)/g,
      /href=['"]([^'"]+)['"]/g,
      /path:\s*['"]([^'"]+)['"]/g
    ];

    linkPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(line)) !== null) {
        structure.links.push({
          file: filename,
          line: index + 1,
          path: match[1],
          context: line.trim()
        });
      }
    });

    // Look for menu structures
    if (line.includes('menuItems') || line.includes('navigationItems') || line.includes('sidebarItems')) {
      structure.menus.push({
        file: filename,
        line: index + 1,
        type: 'menu_definition',
        context: line.trim()
      });
    }

    // Look for breadcrumb implementations
    if (line.includes('breadcrumb') || line.includes('Breadcrumb')) {
      structure.breadcrumbs.push({
        file: filename,
        line: index + 1,
        context: line.trim()
      });
    }
  });
}

/**
 * Calculate navigation depth for each route
 */
function calculateNavigationDepth() {
  console.log('📊 Calculating navigation depth metrics...');

  const depths = [];

  Object.keys(ROUTE_HIERARCHY).forEach(route => {
    let depth = 0;
    let current = route;

    // Calculate depth by counting parent relationships
    while (ROUTE_HIERARCHY[current] && ROUTE_HIERARCHY[current].parent) {
      depth++;
      current = ROUTE_HIERARCHY[current].parent;

      // Prevent infinite loops
      if (depth > 10) break;
    }

    depths.push(depth);
    results.routeMetrics[route] = {
      depth,
      type: ROUTE_HIERARCHY[route].type,
      children: ROUTE_HIERARCHY[route].children.length,
      hasParent: !!ROUTE_HIERARCHY[route].parent
    };
  });

  results.summary.navigationDepth = {
    average: depths.reduce((a, b) => a + b, 0) / depths.length,
    maximum: Math.max(...depths),
    minimum: Math.min(...depths)
  };
}

/**
 * Analyze user flows and navigation patterns
 */
function analyzeUserFlows() {
  console.log('🔄 Analyzing user flow patterns...');

  COMMON_USER_FLOWS.forEach(flow => {
    const analysis = {
      name: flow.name,
      priority: flow.priority,
      userRoles: flow.userRoles,
      expectedTime: flow.expectedTime,
      flowLength: flow.flow.length,
      navigationEfficiency: 0,
      issues: [],
      recommendations: []
    };

    // Check if all routes in flow exist
    flow.flow.forEach((route, index) => {
      if (!ROUTE_HIERARCHY[route]) {
        analysis.issues.push(`Route not found: ${route}`);
      } else {
        // Check navigation relationships
        if (index > 0) {
          const previousRoute = flow.flow[index - 1];
          const currentRoute = route;

          // Check if there's a logical navigation path
          if (!isLogicalNavigation(previousRoute, currentRoute)) {
            analysis.issues.push(`Illogical navigation: ${previousRoute} → ${currentRoute}`);
          }
        }
      }
    });

    // Calculate navigation efficiency (fewer steps = more efficient)
    analysis.navigationEfficiency = Math.max(0, 100 - (flow.flow.length * 10));

    // Generate recommendations
    if (analysis.issues.length > 0) {
      analysis.recommendations.push('Review navigation flow for logical progression');
    }

    if (flow.flow.length > 5) {
      analysis.recommendations.push('Consider simplifying flow - too many steps may impact user experience');
    }

    results.userFlowAnalysis.push(analysis);
  });

  // Calculate overall user flow coverage
  const totalRoutes = Object.keys(ROUTE_HIERARCHY).length;
  const routesInFlows = new Set();
  COMMON_USER_FLOWS.forEach(flow => {
    flow.flow.forEach(route => routesInFlows.add(route));
  });

  results.summary.userFlowCoverage = (routesInFlows.size / totalRoutes) * 100;
}

/**
 * Check if navigation between two routes is logical
 */
function isLogicalNavigation(from, to) {
  const fromRoute = ROUTE_HIERARCHY[from];
  const toRoute = ROUTE_HIERARCHY[to];

  if (!fromRoute || !toRoute) return false;

  // Direct parent-child relationship is logical
  if (fromRoute.children.includes(to) || toRoute.parent === from) {
    return true;
  }

  // Sibling routes (same parent) are logical
  if (fromRoute.parent === toRoute.parent && fromRoute.parent !== null) {
    return true;
  }

  // Dashboard to any module is logical
  if (from === '/dashboard' && toRoute.type === 'module') {
    return true;
  }

  // Module to its list/create pages is logical
  if (toRoute.parent === from) {
    return true;
  }

  return false;
}

/**
 * Identify navigation issues and anti-patterns
 */
function identifyNavigationIssues() {
  console.log('⚠️ Identifying navigation issues...');

  const issues = [];

  // Check for orphaned routes (no parent and not in any menu)
  Object.keys(ROUTE_HIERARCHY).forEach(route => {
    const routeInfo = ROUTE_HIERARCHY[route];

    if (!routeInfo.parent && route !== '/' && route !== '/login' && route !== '/dashboard') {
      if (!hasMenuReference(route)) {
        issues.push({
          type: 'ORPHANED_ROUTE',
          severity: 'MEDIUM',
          route: route,
          description: 'Route appears to be orphaned - no parent and no menu reference',
          recommendation: 'Add to navigation menu or establish parent relationship'
        });
      }
    }
  });

  // Check for deep navigation (more than 3 levels)
  Object.keys(ROUTE_HIERARCHY).forEach(route => {
    const depth = results.routeMetrics[route].depth;

    if (depth > 3) {
      issues.push({
        type: 'DEEP_NAVIGATION',
        severity: 'LOW',
        route: route,
        depth: depth,
        description: `Navigation depth of ${depth} may impact user experience`,
        recommendation: 'Consider flattening navigation hierarchy'
      });
    }
  });

  // Check for placeholder routes that should be implemented
  Object.keys(ROUTE_HIERARCHY).forEach(route => {
    const routeInfo = ROUTE_HIERARCHY[route];

    if (routeInfo.type === 'placeholder') {
      issues.push({
        type: 'PLACEHOLDER_ROUTE',
        severity: 'HIGH',
        route: route,
        description: 'Route is marked as placeholder but may be needed for complete user flows',
        recommendation: 'Implement route or remove from navigation'
      });
    }
  });

  // Check for missing breadcrumbs on deep routes
  Object.keys(ROUTE_HIERARCHY).forEach(route => {
    const depth = results.routeMetrics[route].depth;

    if (depth > 1 && !hasBreadcrumbImplementation(route)) {
      issues.push({
        type: 'MISSING_BREADCRUMBS',
        severity: 'LOW',
        route: route,
        description: 'Deep route should have breadcrumb navigation',
        recommendation: 'Implement breadcrumb navigation for better user orientation'
      });
    }
  });

  results.navigationIssues = issues;

  // Update summary statistics
  results.summary.orphanedRoutes = issues.filter(i => i.type === 'ORPHANED_ROUTE').length;
  results.summary.placeholderRoutes = issues.filter(i => i.type === 'PLACEHOLDER_ROUTE').length;
}

/**
 * Check if route has menu reference (simplified check)
 */
function hasMenuReference(route) {
  // This would typically check actual menu files
  // For now, assume module-level routes are in menus
  return ROUTE_HIERARCHY[route].type === 'module';
}

/**
 * Check if route has breadcrumb implementation (simplified check)
 */
function hasBreadcrumbImplementation(route) {
  // This would typically check for actual breadcrumb implementations
  // For now, assume detail and form routes have breadcrumbs
  const type = ROUTE_HIERARCHY[route].type;
  return type === 'detail' || type === 'form';
}

/**
 * Analyze navigation accessibility
 */
function analyzeNavigationAccessibility() {
  console.log('♿ Analyzing navigation accessibility...');

  const accessibilityIssues = [];

  // Check for keyboard navigation support
  accessibilityIssues.push({
    type: 'KEYBOARD_NAVIGATION',
    severity: 'HIGH',
    description: 'Verify all navigation elements support keyboard navigation',
    recommendation: 'Ensure all links and buttons are keyboard accessible with proper tab order',
    testRequired: true
  });

  // Check for ARIA labels and roles
  accessibilityIssues.push({
    type: 'ARIA_LABELS',
    severity: 'MEDIUM',
    description: 'Navigation should have proper ARIA labels and landmark roles',
    recommendation: 'Add role="navigation", aria-label, and proper ARIA attributes',
    testRequired: true
  });

  // Check for focus management
  accessibilityIssues.push({
    type: 'FOCUS_MANAGEMENT',
    severity: 'HIGH',
    description: 'Route changes should manage focus appropriately',
    recommendation: 'Implement focus management for route transitions and modal navigation',
    testRequired: true
  });

  // Check for screen reader compatibility
  accessibilityIssues.push({
    type: 'SCREEN_READER',
    severity: 'HIGH',
    description: 'Navigation should be properly announced to screen readers',
    recommendation: 'Test with screen readers and add appropriate announcements',
    testRequired: true
  });

  results.accessibilityIssues = accessibilityIssues;
}

/**
 * Generate navigation recommendations
 */
function generateNavigationRecommendations() {
  console.log('💡 Generating navigation recommendations...');

  const recommendations = [];

  // Critical recommendations based on issues
  const criticalIssues = results.navigationIssues.filter(i => i.severity === 'HIGH');
  if (criticalIssues.length > 0) {
    recommendations.push({
      priority: 'CRITICAL',
      category: 'Navigation Issues',
      title: `Address ${criticalIssues.length} high-severity navigation issues`,
      description: 'High-severity navigation issues can significantly impact user experience',
      action: 'Review and fix placeholder routes and missing navigation elements'
    });
  }

  // User flow recommendations
  const inefficientFlows = results.userFlowAnalysis.filter(f => f.navigationEfficiency < 70);
  if (inefficientFlows.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'User Experience',
      title: `Optimize ${inefficientFlows.length} inefficient user flows`,
      description: 'Complex navigation flows can frustrate users and reduce productivity',
      action: 'Simplify navigation paths and reduce number of clicks for common tasks'
    });
  }

  // Accessibility recommendations
  if (results.accessibilityIssues.length > 0) {
    recommendations.push({
      priority: 'HIGH',
      category: 'Accessibility',
      title: 'Implement comprehensive navigation accessibility',
      description: 'Navigation must be accessible to all users including those with disabilities',
      action: 'Add ARIA labels, keyboard navigation support, and screen reader compatibility'
    });
  }

  // Navigation depth recommendations
  if (results.summary.navigationDepth.maximum > 3) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'Information Architecture',
      title: 'Consider flattening navigation hierarchy',
      description: `Maximum navigation depth of ${results.summary.navigationDepth.maximum} may impact usability`,
      action: 'Review deep navigation paths and consider restructuring for better accessibility'
    });
  }

  // User flow coverage recommendations
  if (results.summary.userFlowCoverage < 80) {
    recommendations.push({
      priority: 'LOW',
      category: 'Coverage',
      title: 'Expand user flow analysis coverage',
      description: `Only ${results.summary.userFlowCoverage.toFixed(1)}% of routes are covered in defined user flows`,
      action: 'Define additional user flows to ensure all application areas are optimized'
    });
  }

  results.recommendations = recommendations;
}

/**
 * Generate comprehensive navigation report
 */
function generateNavigationReport() {
  console.log('📄 Generating navigation structure report...');

  const report = `# Navigation Structure and User Flow Analysis Report

## Executive Summary

**Analysis Date**: ${results.summary.generatedAt}
**Total Routes Analyzed**: ${results.summary.totalRoutes}
**User Flow Coverage**: ${results.summary.userFlowCoverage.toFixed(1)}%

### Navigation Metrics
- **Average Navigation Depth**: ${results.summary.navigationDepth.average.toFixed(1)} levels
- **Maximum Navigation Depth**: ${results.summary.navigationDepth.maximum} levels
- **Orphaned Routes**: ${results.summary.orphanedRoutes}
- **Placeholder Routes**: ${results.summary.placeholderRoutes}

### Route Distribution
- **Module Routes**: ${Object.values(ROUTE_HIERARCHY).filter(r => r.type === 'module').length}
- **Detail Routes**: ${Object.values(ROUTE_HIERARCHY).filter(r => r.type === 'detail').length}
- **Form Routes**: ${Object.values(ROUTE_HIERARCHY).filter(r => r.type === 'form').length}
- **Placeholder Routes**: ${Object.values(ROUTE_HIERARCHY).filter(r => r.type === 'placeholder').length}

## Detailed Findings

### 1. Navigation Issues (${results.navigationIssues.length} found)

#### By Severity
- **High**: ${results.navigationIssues.filter(i => i.severity === 'HIGH').length}
- **Medium**: ${results.navigationIssues.filter(i => i.severity === 'MEDIUM').length}
- **Low**: ${results.navigationIssues.filter(i => i.severity === 'LOW').length}

${results.navigationIssues.length > 0 ?
  `| Type | Route | Severity | Description |
|------|-------|----------|-------------|
${results.navigationIssues.map(i => `| ${i.type} | ${i.route || 'N/A'} | ${i.severity} | ${i.description} |`).join('\n')}` :
  '*No navigation issues found*'
}

### 2. User Flow Analysis (${results.userFlowAnalysis.length} flows analyzed)

#### Flow Efficiency

| Flow Name | Priority | Steps | Efficiency | Issues |
|-----------|----------|-------|------------|--------|
${results.userFlowAnalysis.map(f => `| ${f.name} | ${f.priority} | ${f.flowLength} | ${f.navigationEfficiency}% | ${f.issues.length} |`).join('\n')}

#### Critical Flows (Priority: Critical)
${results.userFlowAnalysis.filter(f => f.priority === 'critical').map(f =>
  `- **${f.name}**: ${f.flowLength} steps, ${f.navigationEfficiency}% efficiency
  - User Roles: ${f.userRoles.join(', ')}
  - Expected Time: ${f.expectedTime}
  - Issues: ${f.issues.length > 0 ? f.issues.join(', ') : 'None'}`
).join('\n')}

#### High Priority Flows
${results.userFlowAnalysis.filter(f => f.priority === 'high').map(f =>
  `- **${f.name}**: ${f.flowLength} steps, ${f.navigationEfficiency}% efficiency
  - User Roles: ${f.userRoles.join(', ')}
  - Issues: ${f.issues.length > 0 ? f.issues.join(', ') : 'None'}`
).join('\n')}

### 3. Navigation Accessibility Analysis

${results.accessibilityIssues.length > 0 ?
  `| Type | Severity | Description | Test Required |
|------|----------|-------------|---------------|
${results.accessibilityIssues.map(a => `| ${a.type} | ${a.severity} | ${a.description} | ${a.testRequired ? 'Yes' : 'No'} |`).join('\n')}` :
  '*Navigation accessibility analysis pending*'
}

### 4. Route Depth Analysis

#### Routes by Depth
${Array.from({length: results.summary.navigationDepth.maximum + 1}, (_, i) => i).map(depth => {
  const routesAtDepth = Object.keys(results.routeMetrics).filter(route => results.routeMetrics[route].depth === depth);
  return `- **Depth ${depth}**: ${routesAtDepth.length} routes${routesAtDepth.length > 0 ? ` (${routesAtDepth.slice(0, 3).join(', ')}${routesAtDepth.length > 3 ? '...' : ''})` : ''}`;
}).join('\n')}

#### Deep Navigation Routes (Depth > 2)
${Object.keys(results.routeMetrics)
  .filter(route => results.routeMetrics[route].depth > 2)
  .map(route => `- **${route}**: Depth ${results.routeMetrics[route].depth}, Type: ${results.routeMetrics[route].type}`)
  .join('\n') || '*No deep navigation routes found*'}

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

## Best Practices for Navigation Design

### Information Architecture
1. **Flat Hierarchy** - Keep navigation depth to 3 levels or fewer
2. **Logical Grouping** - Group related functionality together
3. **Consistent Patterns** - Use consistent navigation patterns across modules
4. **Clear Labels** - Use descriptive, user-friendly navigation labels

### User Experience
1. **Breadcrumb Navigation** - Implement breadcrumbs for routes deeper than 2 levels
2. **Context Preservation** - Maintain user context when navigating between related pages
3. **Quick Access** - Provide shortcuts for frequently used functions
4. **Progress Indicators** - Show progress in multi-step workflows

### Accessibility
1. **Keyboard Navigation** - Ensure all navigation elements are keyboard accessible
2. **Screen Reader Support** - Implement proper ARIA labels and landmarks
3. **Focus Management** - Manage focus appropriately during navigation
4. **Color Independence** - Don't rely solely on color for navigation cues

### Performance
1. **Code Splitting** - Implement route-based code splitting
2. **Lazy Loading** - Load route components on demand
3. **Prefetching** - Prefetch likely next pages for better performance
4. **Navigation Guards** - Implement efficient route guards and permissions

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
    path.join(OUTPUT_DIR, 'navigation-analysis-results.json'),
    JSON.stringify(results, null, 2)
  );

  // Save human-readable report
  const report = generateNavigationReport();
  fs.writeFileSync(
    path.join(OUTPUT_DIR, 'navigation-analysis-report.md'),
    report
  );

  console.log(`📊 Navigation analysis complete! Reports saved to ${OUTPUT_DIR}`);
}

/**
 * Main analysis function
 */
async function main() {
  console.log('🚀 Starting comprehensive navigation structure and user flow analysis...');
  console.log(`📂 Analyzing application routes and navigation patterns`);
  console.log(`📝 Results will be saved to: ${OUTPUT_DIR}`);

  try {
    console.log('\n🧭 Phase 1: Navigation Menu Analysis...');
    results.navigationStructure = analyzeNavigationMenus();

    console.log('\n📊 Phase 2: Navigation Depth Calculation...');
    calculateNavigationDepth();

    console.log('\n🔄 Phase 3: User Flow Analysis...');
    analyzeUserFlows();

    console.log('\n⚠️ Phase 4: Navigation Issue Identification...');
    identifyNavigationIssues();

    console.log('\n♿ Phase 5: Navigation Accessibility Analysis...');
    analyzeNavigationAccessibility();

    console.log('\n💡 Phase 6: Recommendation Generation...');
    generateNavigationRecommendations();

    console.log('\n📄 Phase 7: Report Generation...');
    saveResults();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 NAVIGATION ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Routes: ${results.summary.totalRoutes}`);
    console.log(`User Flow Coverage: ${results.summary.userFlowCoverage.toFixed(1)}%`);
    console.log(`Average Navigation Depth: ${results.summary.navigationDepth.average.toFixed(1)} levels`);
    console.log(`Maximum Navigation Depth: ${results.summary.navigationDepth.maximum} levels`);
    console.log(`Navigation Issues: ${results.navigationIssues.length}`);
    console.log(`Orphaned Routes: ${results.summary.orphanedRoutes}`);
    console.log(`Placeholder Routes: ${results.summary.placeholderRoutes}`);
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
  analyzeNavigationMenus,
  calculateNavigationDepth,
  analyzeUserFlows,
  identifyNavigationIssues,
  analyzeNavigationAccessibility,
  generateNavigationRecommendations,
  results
};