#!/usr/bin/env node

/**
 * MachShop UI Assessment - GitHub Issue Generator
 *
 * This script creates GitHub issues for all findings from the comprehensive
 * 8-phase UI assessment, using the templates and labels we created.
 */

const fs = require('fs');
const path = require('path');

// Configuration
const DOCS_DIR = path.join(__dirname, 'docs', 'ui-assessment');
const OUTPUT_DIR = path.join(__dirname, 'assessment-issues');

// Issue templates and their mappings
const ISSUE_TEMPLATES = {
  ACCESSIBILITY: 'ui-accessibility-issue.md',
  DESIGN_CONSISTENCY: 'ui-design-consistency.md',
  INCOMPLETE_FEATURE: 'ui-incomplete-feature.md',
  API_INTEGRATION: 'ui-api-integration.md',
  SPECIALIZED_COMPONENT: 'ui-specialized-component.md'
};

// Priority to GitHub label mapping
const PRIORITY_LABELS = {
  'CRITICAL': 'critical-priority',
  'HIGH': 'high-priority',
  'MEDIUM': 'medium-priority',
  'LOW': 'low-priority'
};

// Assessment findings to convert to issues
const ASSESSMENT_FINDINGS = {
  // Phase 4: Placeholder Analysis - HIGH priority issues
  PLACEHOLDER_ROUTES: [
    {
      title: 'Implement Materials Management Page (/materials)',
      type: 'INCOMPLETE_FEATURE',
      priority: 'HIGH',
      description: 'Placeholder route identified during Phase 4 assessment. Materials page is accessible via navigation but shows placeholder content.',
      assessment_ref: 'Phase 4 - Placeholder Analysis',
      file: 'pages/Materials/MaterialsPage.tsx',
      labels: ['incomplete-feature', 'high-priority', 'phase-4-placeholders', 'materials'],
      acceptance_criteria: [
        'Material inventory management interface',
        'RBAC integration for material permissions',
        'Navigation integration completed',
        'Responsive design implemented',
        'Accessibility compliance verified'
      ]
    },
    {
      title: 'Implement Personnel Management Page (/personnel)',
      type: 'INCOMPLETE_FEATURE',
      priority: 'HIGH',
      description: 'Placeholder route identified during Phase 4 assessment. Personnel page is accessible via navigation but shows placeholder content.',
      assessment_ref: 'Phase 4 - Placeholder Analysis',
      file: 'pages/Personnel/PersonnelPage.tsx',
      labels: ['incomplete-feature', 'high-priority', 'phase-4-placeholders', 'personnel'],
      acceptance_criteria: [
        'Personnel management interface',
        'RBAC integration for HR permissions',
        'Navigation integration completed',
        'Responsive design implemented',
        'Accessibility compliance verified'
      ]
    },
    {
      title: 'Implement Administration Dashboard (/admin)',
      type: 'INCOMPLETE_FEATURE',
      priority: 'HIGH',
      description: 'Placeholder route identified during Phase 4 assessment. Admin page is accessible but shows placeholder content.',
      assessment_ref: 'Phase 4 - Placeholder Analysis',
      file: 'pages/Admin/AdminPage.tsx',
      labels: ['incomplete-feature', 'high-priority', 'phase-4-placeholders', 'admin'],
      acceptance_criteria: [
        'System administration interface',
        'User management functionality',
        'System configuration options',
        'RBAC integration for admin permissions',
        'Navigation integration completed'
      ]
    },
    {
      title: 'Implement User Settings Page (/settings)',
      type: 'INCOMPLETE_FEATURE',
      priority: 'MEDIUM',
      description: 'Placeholder route identified during Phase 4 assessment. Settings page is accessible but shows placeholder content.',
      assessment_ref: 'Phase 4 - Placeholder Analysis',
      file: 'pages/Settings/SettingsPage.tsx',
      labels: ['incomplete-feature', 'medium-priority', 'phase-4-placeholders', 'settings'],
      acceptance_criteria: [
        'User preference settings',
        'Theme and display options',
        'Notification preferences',
        'RBAC integration completed',
        'Accessibility compliance verified'
      ]
    }
  ],

  // Phase 5: API Integration - HIGH priority issues
  API_INTEGRATION: [
    {
      title: 'Replace Hardcoded localhost URLs with Environment Variables',
      type: 'API_INTEGRATION',
      priority: 'HIGH',
      description: '4 hardcoded localhost URLs found during Phase 5 API integration analysis. These URLs make deployment difficult and should use environment variables.',
      assessment_ref: 'Phase 5 - API Integration Analysis',
      files: [
        'api/signatures.ts (2 instances)',
        'api/fai.ts (2 instances)'
      ],
      labels: ['api-integration', 'high-priority', 'phase-5-api', 'configuration', 'technical-debt'],
      specific_urls: [
        'http://localhost:3001/api/v1 in api/signatures.ts',
        'http://localhost:3001/api/v1 in api/fai.ts'
      ],
      env_variables_needed: [
        'REACT_APP_API_BASE_URL',
        'REACT_APP_API_TIMEOUT',
        'REACT_APP_API_RETRY_ATTEMPTS'
      ]
    }
  ],

  // Phase 7: UX/UI Quality - Systematic improvements
  DESIGN_CONSISTENCY: [
    {
      title: 'Standardize Color Usage - Replace Hardcoded Colors with Theme Colors',
      type: 'DESIGN_CONSISTENCY',
      priority: 'MEDIUM',
      description: '55 color inconsistency violations found during Phase 7 UX/UI analysis. 1,730 hardcoded hex colors should be replaced with theme colors for consistency.',
      assessment_ref: 'Phase 7 - UX/UI Quality Analysis',
      labels: ['design-consistency', 'medium-priority', 'phase-7-ux', 'color-system', 'theme'],
      statistics: {
        hardcoded_colors: 1730,
        theme_colors: 0,
        inconsistency_violations: 55
      },
      action_plan: [
        'Create comprehensive theme color palette',
        'Replace hardcoded colors systematically',
        'Update design system documentation',
        'Add linting rules for color usage'
      ]
    },
    {
      title: 'Fix Typography Hierarchy Issues',
      type: 'DESIGN_CONSISTENCY',
      priority: 'HIGH',
      description: '3 typography hierarchy violations found during Phase 7 analysis. Proper heading hierarchy is important for accessibility and SEO.',
      assessment_ref: 'Phase 7 - UX/UI Quality Analysis',
      labels: ['design-consistency', 'high-priority', 'phase-7-ux', 'typography', 'accessibility'],
      violation_count: 3,
      wcag_impact: 'Affects WCAG 2.1 AA compliance for heading structure'
    }
  ],

  // Phase 8: Specialized Components - Accessibility improvements
  SPECIALIZED_COMPONENTS: [
    {
      title: 'Implement Keyboard Navigation for ReactFlow Components',
      type: 'SPECIALIZED_COMPONENT',
      priority: 'HIGH',
      description: '84 ReactFlow components found during Phase 8 analysis. These visual workflow editors need custom keyboard navigation for accessibility compliance.',
      assessment_ref: 'Phase 8 - Specialized Components Analysis',
      component_type: 'ReactFlow',
      labels: ['specialized-component', 'high-priority', 'phase-8-specialized', 'reactflow', 'accessibility', 'keyboard-navigation'],
      component_count: 84,
      improvements_needed: [
        'Custom keyboard navigation for nodes and edges',
        'Tab order through workflow elements',
        'ARIA labels for all interactive elements',
        'Keyboard shortcuts for editing operations',
        'Focus indicators for visual elements'
      ]
    },
    {
      title: 'Add Accessibility Support for D3 Data Visualizations',
      type: 'SPECIALIZED_COMPONENT',
      priority: 'HIGH',
      description: '156 D3 visualization components found during Phase 8 analysis. These complex charts and graphs need accessibility enhancements for WCAG compliance.',
      assessment_ref: 'Phase 8 - Specialized Components Analysis',
      component_type: 'D3 Visualization',
      labels: ['specialized-component', 'high-priority', 'phase-8-specialized', 'd3-visualization', 'accessibility', 'wcag-2.1-aa'],
      component_count: 156,
      improvements_needed: [
        'SVG accessibility attributes (title, desc)',
        'Alternative text for complex visualizations',
        'Data table alternatives for charts',
        'Keyboard navigation for interactive elements',
        'Screen reader compatible descriptions'
      ]
    },
    {
      title: 'Enhance Chart Component Accessibility',
      type: 'SPECIALIZED_COMPONENT',
      priority: 'MEDIUM',
      description: '161 chart components found during Phase 8 analysis. Charts need accessibility enhancements including alternative text and responsive containers.',
      assessment_ref: 'Phase 8 - Specialized Components Analysis',
      component_type: 'Charts',
      labels: ['specialized-component', 'medium-priority', 'phase-8-specialized', 'charts-analytics', 'accessibility'],
      component_count: 161,
      improvements_needed: [
        'Wrap charts in ResponsiveContainer',
        'Add alternative text and ARIA labels',
        'Ensure color accessibility compliance',
        'Implement touch device support',
        'Add data table alternatives'
      ]
    }
  ],

  // Phase 2: Accessibility - Systematic keyboard navigation
  ACCESSIBILITY_KEYBOARD: [
    {
      title: 'Systematic Keyboard Navigation Enhancement - Interactive Elements',
      type: 'ACCESSIBILITY',
      priority: 'HIGH',
      description: '522 keyboard navigation improvement opportunities identified during Phase 2 analysis. 145 interactive elements lack proper keyboard support patterns.',
      assessment_ref: 'Phase 2 - Accessibility Testing',
      labels: ['accessibility', 'high-priority', 'phase-2-accessibility', 'keyboard-navigation', 'wcag-2.1-aa', 'systematic'],
      statistics: {
        interactive_elements: 1490,
        keyboard_handlers: 1,
        improvement_opportunities: 522,
        critical_elements_needing_support: 145
      },
      systematic_approach: [
        'Add onKeyDown handlers for Enter/Space activation',
        'Implement focus management for modals',
        'Create keyboard navigation templates',
        'Add comprehensive keyboard shortcuts documentation'
      ]
    }
  ]
};

/**
 * Generate GitHub issue content from assessment findings
 */
function generateIssueContent(finding) {
  const { title, type, priority, description, assessment_ref, labels = [] } = finding;

  let content = '';

  // Use appropriate template based on type
  switch(type) {
    case 'INCOMPLETE_FEATURE':
      content = generateIncompleteFeatureIssue(finding);
      break;
    case 'API_INTEGRATION':
      content = generateAPIIntegrationIssue(finding);
      break;
    case 'DESIGN_CONSISTENCY':
      content = generateDesignConsistencyIssue(finding);
      break;
    case 'SPECIALIZED_COMPONENT':
      content = generateSpecializedComponentIssue(finding);
      break;
    case 'ACCESSIBILITY':
      content = generateAccessibilityIssue(finding);
      break;
    default:
      content = generateGenericIssue(finding);
  }

  return {
    title,
    content,
    labels: [...labels, PRIORITY_LABELS[priority], 'ui-assessment']
  };
}

/**
 * Generate incomplete feature issue content
 */
function generateIncompleteFeatureIssue(finding) {
  return `## Incomplete Feature Description

**Feature/Component:** ${finding.title}
**Location:** \`${finding.file}\`

**Feature Type:**
- [x] Placeholder route/page
- [ ] Incomplete component
- [ ] TODO/placeholder marker
- [ ] Mock data that needs real implementation
- [ ] Missing navigation integration

## Assessment Reference
**Assessment Report:** ${finding.assessment_ref}
**Details:**
- Severity: ${finding.priority}
- Category: Incomplete UI Feature
- File: \`${finding.file}\`

## Current State
Placeholder page component exists but shows placeholder content. Navigation integration is present but functionality is not implemented.

## Expected Implementation
${finding.description}

## User Impact
- [ ] Blocks critical user workflows
- [x] Prevents access to important functionality
- [x] Affects navigation completeness
- [ ] Cosmetic/nice-to-have feature

## Acceptance Criteria
${finding.acceptance_criteria.map(criteria => `- [ ] ${criteria}`).join('\n')}

## Priority Justification
${finding.priority} priority: ${finding.description}`;
}

/**
 * Generate API integration issue content
 */
function generateAPIIntegrationIssue(finding) {
  return `## API Integration Issue

**Issue Type:**
- [x] Hardcoded URLs/endpoints
- [ ] Missing error handling
- [ ] Mock data in production code
- [x] Environment configuration issues

**Affected Files:**
${finding.files.map(file => `- \`${file}\``).join('\n')}

## Assessment Reference
**Assessment Report:** ${finding.assessment_ref}
**Details:**
- Issue Count: ${finding.specific_urls.length}
- Severity: ${finding.priority}
- Category: Configuration Issues

## Current Implementation
${finding.description}

## Problems Identified
- [x] Hardcoded localhost URLs make deployment difficult
- [ ] Missing error handling reduces user experience
- [ ] Mock data in production affects functionality
- [ ] No retry logic for failed requests
- [x] Inconsistent API call patterns

## Recommended Solution

### Configuration Improvements
- [x] Replace hardcoded URLs with environment variables
- [x] Use centralized API configuration
- [x] Implement proper environment handling

## Environment Variables Needed
\`\`\`
${finding.env_variables_needed.join('\n')}
\`\`\`

## Specific URLs to Replace
${finding.specific_urls.map(url => `- \`${url}\``).join('\n')}`;
}

/**
 * Generate design consistency issue content
 */
function generateDesignConsistencyIssue(finding) {
  return `## Design Consistency Issue

**Component/Area Affected:** Application-wide color system

**Issue Category:**
- [x] Color inconsistency (one-off colors vs theme colors)
- [ ] Typography hierarchy issues
- [ ] Spacing inconsistency
- [ ] Component usage patterns
- [ ] Responsive design issues

**Severity:** ${finding.priority}

## Assessment Reference
**Assessment Report:** ${finding.assessment_ref}
**Statistics:**
${finding.statistics ? Object.entries(finding.statistics).map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${value}`).join('\n') : ''}

## Current State
${finding.description}

## Design System Goal
Consistent color usage throughout the application using centralized theme colors instead of hardcoded values.

## Proposed Solution
${finding.action_plan ? finding.action_plan.map(action => `- [ ] ${action}`).join('\n') : ''}

## Impact
- [x] Visual inconsistency across the application
- [ ] Confusion for users
- [x] Maintenance burden for developers
- [x] Brand/design system compliance`;
}

/**
 * Generate specialized component issue content
 */
function generateSpecializedComponentIssue(finding) {
  return `## Specialized Component Enhancement

**Component Type:**
- ${finding.component_type === 'ReactFlow' ? '[x]' : '[ ]'} ReactFlow (Visual routing editor, workflow diagrams)
- ${finding.component_type === 'D3 Visualization' ? '[x]' : '[ ]'} D3 Visualization (Charts, graphs, traceability)
- ${finding.component_type === 'Charts' ? '[x]' : '[ ]'} Chart Components (Recharts, analytics)
- [ ] Monaco Editor (Code editing)
- [ ] Lexical Editor (Rich text editing)
- [ ] Complex Forms (Multi-step, dynamic forms)
- [ ] Virtualization (Large lists, tables)
- [ ] Drag & Drop (Interactive interfaces)

**Component Count:** ${finding.component_count} components

**Issue Category:**
- [ ] Performance optimization
- [x] Accessibility improvements
- [ ] Memory leak prevention
- [ ] Mobile/touch support
- [ ] Error handling
- [ ] User experience enhancement

## Assessment Reference
**Assessment Report:** ${finding.assessment_ref}
**Component Type:** ${finding.component_type}
**Components Found:** ${finding.component_count}

## Current Behavior
${finding.description}

## Technical Improvements Needed
${finding.improvements_needed.map(improvement => `- [ ] ${improvement}`).join('\n')}

## Testing Requirements
- [x] Accessibility testing (keyboard, screen reader)
- [ ] Performance testing with large datasets
- [ ] Memory leak testing
- [ ] Mobile/touch device testing
- [ ] Cross-browser compatibility testing`;
}

/**
 * Generate accessibility issue content
 */
function generateAccessibilityIssue(finding) {
  return `## Accessibility Issue Description

**Component/Page Affected:** Application-wide interactive elements

**Issue Type:**
- [x] Missing keyboard navigation
- [ ] Missing ARIA labels/attributes
- [ ] Insufficient color contrast
- [ ] Missing focus indicators
- [ ] Screen reader compatibility

**Severity:** ${finding.priority}

## Assessment Reference
**Assessment Report:** ${finding.assessment_ref}
**Statistics:**
${Object.entries(finding.statistics).map(([key, value]) => `- ${key.replace(/_/g, ' ')}: ${value}`).join('\n')}

## Current Behavior
${finding.description}

## Expected Behavior
All interactive elements should support keyboard navigation with Enter/Space key activation and proper focus management.

## WCAG Guidelines
- [x] 2.1 Keyboard Accessible
- [ ] 2.4 Navigable
- [ ] 4.1 Compatible

## Proposed Solution
${finding.systematic_approach.map(approach => `- [ ] ${approach}`).join('\n')}

## Testing Requirements
- [x] Keyboard navigation testing
- [x] Screen reader testing (NVDA/JAWS)
- [ ] Color contrast verification
- [x] axe-core automated testing
- [x] Manual accessibility review`;
}

/**
 * Generate generic issue content
 */
function generateGenericIssue(finding) {
  return `## Issue Description

${finding.description}

## Assessment Reference
**Assessment Report:** ${finding.assessment_ref}
**Priority:** ${finding.priority}

## Details
${JSON.stringify(finding, null, 2)}`;
}

/**
 * Create all GitHub issues from assessment findings
 */
function createAssessmentIssues() {
  console.log('🚀 Creating GitHub issues from UI assessment findings...');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const allIssues = [];
  let totalIssues = 0;

  // Process each category of findings
  Object.entries(ASSESSMENT_FINDINGS).forEach(([category, findings]) => {
    console.log(`\n📝 Processing ${category} findings...`);

    findings.forEach((finding, index) => {
      const issue = generateIssueContent(finding);
      const filename = `${category.toLowerCase()}_${index + 1}_${finding.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.md`;

      // Save individual issue file
      fs.writeFileSync(
        path.join(OUTPUT_DIR, filename),
        `---
title: "${issue.title}"
labels: [${issue.labels.map(l => `"${l}"`).join(', ')}]
---

${issue.content}`
      );

      allIssues.push({
        filename,
        ...issue,
        category,
        priority: finding.priority
      });

      totalIssues++;
      console.log(`  ✅ Created: ${issue.title}`);
    });
  });

  // Create summary file
  const summary = `# UI Assessment GitHub Issues Summary

**Generated:** ${new Date().toISOString()}
**Total Issues Created:** ${totalIssues}

## Issues by Priority

### Critical Priority
${allIssues.filter(i => i.priority === 'CRITICAL').map(i => `- ${i.title}`).join('\n') || '*No critical issues*'}

### High Priority
${allIssues.filter(i => i.priority === 'HIGH').map(i => `- ${i.title}`).join('\n')}

### Medium Priority
${allIssues.filter(i => i.priority === 'MEDIUM').map(i => `- ${i.title}`).join('\n')}

### Low Priority
${allIssues.filter(i => i.priority === 'LOW').map(i => `- ${i.title}`).join('\n') || '*No low priority issues*'}

## Issues by Category

${Object.entries(ASSESSMENT_FINDINGS).map(([category, findings]) =>
  `### ${category.replace(/_/g, ' ')}
${findings.map(f => `- ${f.title} (${f.priority})`).join('\n')}`
).join('\n\n')}

## How to Create These Issues

1. **Individual Issues**: Use the generated .md files in the \`assessment-issues/\` directory
2. **Batch Creation**: Copy content from each file to create GitHub issues manually
3. **GitHub CLI**: Use \`gh issue create --title "..." --body-file filename.md --label "..."\`
4. **API Integration**: Use GitHub API to create issues programmatically

## Labels to Apply

All issues should include the base label \`ui-assessment\` plus specific labels from our label system:

- Priority: \`critical-priority\`, \`high-priority\`, \`medium-priority\`, \`low-priority\`
- Category: \`accessibility\`, \`design-consistency\`, \`incomplete-feature\`, \`api-integration\`, \`specialized-component\`
- Phase: \`phase-2-accessibility\`, \`phase-4-placeholders\`, \`phase-5-api\`, \`phase-7-ux\`, \`phase-8-specialized\`
- Technical: \`keyboard-navigation\`, \`wcag-2.1-aa\`, \`reactflow\`, \`d3-visualization\`, etc.

---

*Issues generated from comprehensive 8-phase UI assessment conducted on October 31, 2025*
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), summary);

  console.log(`\n📊 Summary:`);
  console.log(`  Total Issues: ${totalIssues}`);
  console.log(`  Critical: ${allIssues.filter(i => i.priority === 'CRITICAL').length}`);
  console.log(`  High: ${allIssues.filter(i => i.priority === 'HIGH').length}`);
  console.log(`  Medium: ${allIssues.filter(i => i.priority === 'MEDIUM').length}`);
  console.log(`  Low: ${allIssues.filter(i => i.priority === 'LOW').length}`);
  console.log(`\n📁 Issues saved to: ${OUTPUT_DIR}`);
  console.log(`📋 Review README.md for creation instructions`);

  return allIssues;
}

// Run the issue creation
if (require.main === module) {
  createAssessmentIssues();
}

module.exports = { createAssessmentIssues, generateIssueContent, ASSESSMENT_FINDINGS };