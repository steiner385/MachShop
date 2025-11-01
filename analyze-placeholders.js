#!/usr/bin/env node

/**
 * Comprehensive Placeholder and Dead Link Analysis Script
 *
 * Analyzes the MachShop frontend codebase for:
 * - TODO/FIXME/PLACEHOLDER markers
 * - Dead links and non-functional navigation
 * - Incomplete UI components
 * - Hard-coded mock data
 * - Route mismatches between navigation and App.tsx
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FRONTEND_DIR = '/home/tony/GitHub/MachShop/frontend/src';
const OUTPUT_DIR = '/home/tony/GitHub/MachShop/docs/ui-assessment/04-PLACEHOLDERS';
const ANALYSIS_DATE = new Date().toISOString().split('T')[0];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Analysis results storage
const analysisResults = {
    placeholderMarkers: [],
    deadLinks: [],
    incompleteComponents: [],
    routeMismatches: [],
    mockData: [],
    summary: {
        totalFiles: 0,
        filesWithPlaceholders: 0,
        totalPlaceholders: 0,
        criticalIssues: 0,
        analysisDate: ANALYSIS_DATE
    }
};

/**
 * Search for placeholder markers in code
 */
function findPlaceholderMarkers() {
    console.log('🔍 Scanning for placeholder markers...');

    const patterns = [
        'TODO',
        'FIXME',
        'PLACEHOLDER',
        'Coming Soon',
        'Not Implemented',
        'Under Construction',
        'Work in Progress',
        'TBD',
        'XXX'
    ];

    const extensions = ['tsx', 'ts', 'jsx', 'js'];

    for (const pattern of patterns) {
        try {
            const command = `grep -rn "${pattern}" ${FRONTEND_DIR} --include="*.tsx" --include="*.ts" --include="*.jsx" --include="*.js" 2>/dev/null || true`;
            const output = execSync(command, { encoding: 'utf8' });

            if (output.trim()) {
                const lines = output.trim().split('\n');
                lines.forEach(line => {
                    const [filePath, lineNumber, ...content] = line.split(':');

                    if (filePath && lineNumber && content.length > 0) {
                        const relativePath = filePath.replace(FRONTEND_DIR + '/', '');

                        analysisResults.placeholderMarkers.push({
                            file: relativePath,
                            line: parseInt(lineNumber),
                            pattern: pattern,
                            content: content.join(':').trim(),
                            severity: determineSeverity(content.join(':').trim(), pattern),
                            category: categorizeMarker(content.join(':').trim())
                        });
                    }
                });
            }
        } catch (error) {
            console.warn(`Warning: Failed to search for pattern "${pattern}": ${error.message}`);
        }
    }

    console.log(`Found ${analysisResults.placeholderMarkers.length} placeholder markers`);
}

/**
 * Determine severity of placeholder marker
 */
function determineSeverity(content, pattern) {
    const contentLower = content.toLowerCase();

    // Critical indicators
    if (contentLower.includes('critical') ||
        contentLower.includes('urgent') ||
        contentLower.includes('security') ||
        contentLower.includes('compliance')) {
        return 'CRITICAL';
    }

    // High priority indicators
    if (contentLower.includes('production') ||
        contentLower.includes('user') ||
        contentLower.includes('workflow') ||
        contentLower.includes('navigation') ||
        pattern === 'FIXME') {
        return 'HIGH';
    }

    // Medium priority
    if (pattern === 'TODO' || pattern === 'PLACEHOLDER') {
        return 'MEDIUM';
    }

    return 'LOW';
}

/**
 * Categorize placeholder marker by functionality
 */
function categorizeMarker(content) {
    const contentLower = content.toLowerCase();

    if (contentLower.includes('ui') || contentLower.includes('component') || contentLower.includes('design')) {
        return 'UI_COMPONENT';
    }
    if (contentLower.includes('api') || contentLower.includes('service') || contentLower.includes('endpoint')) {
        return 'API_INTEGRATION';
    }
    if (contentLower.includes('test') || contentLower.includes('spec')) {
        return 'TESTING';
    }
    if (contentLower.includes('navigation') || contentLower.includes('route') || contentLower.includes('link')) {
        return 'NAVIGATION';
    }
    if (contentLower.includes('data') || contentLower.includes('mock') || contentLower.includes('dummy')) {
        return 'DATA';
    }
    if (contentLower.includes('permission') || contentLower.includes('auth') || contentLower.includes('role')) {
        return 'SECURITY';
    }

    return 'GENERAL';
}

/**
 * Find route mismatches between navigation menu and App.tsx
 */
function findRouteMismatches() {
    console.log('🔍 Analyzing route mismatches...');

    try {
        // Read App.tsx routes
        const appRoutes = extractRoutesFromApp();

        // Read MainLayout navigation items
        const navRoutes = extractNavigationRoutes();

        // Find mismatches
        navRoutes.forEach(navRoute => {
            const matchingAppRoute = appRoutes.find(appRoute =>
                appRoute.path === navRoute.path ||
                navRoute.path.startsWith(appRoute.path)
            );

            if (!matchingAppRoute) {
                analysisResults.routeMismatches.push({
                    type: 'NAVIGATION_WITHOUT_ROUTE',
                    navigationPath: navRoute.path,
                    navigationLabel: navRoute.label,
                    severity: 'HIGH',
                    description: 'Navigation menu item has no corresponding route in App.tsx'
                });
            }
        });

        // Find routes without navigation
        appRoutes.forEach(appRoute => {
            const matchingNavRoute = navRoutes.find(navRoute =>
                navRoute.path === appRoute.path ||
                appRoute.path.startsWith(navRoute.path)
            );

            if (!matchingNavRoute && !appRoute.path.includes(':') && appRoute.path !== '*') {
                analysisResults.routeMismatches.push({
                    type: 'ROUTE_WITHOUT_NAVIGATION',
                    routePath: appRoute.path,
                    component: appRoute.component,
                    severity: 'MEDIUM',
                    description: 'Route exists but is not accessible through navigation menu'
                });
            }
        });

    } catch (error) {
        console.error('Error analyzing route mismatches:', error.message);
    }

    console.log(`Found ${analysisResults.routeMismatches.length} route mismatches`);
}

/**
 * Extract routes from App.tsx
 */
function extractRoutesFromApp() {
    const appPath = path.join(FRONTEND_DIR, 'App.tsx');
    const routes = [];

    try {
        const content = fs.readFileSync(appPath, 'utf8');
        const routeRegex = /<Route\s+path="([^"]+)"\s+element={[^}]*<(\w+)[^>]*>}/g;

        let match;
        while ((match = routeRegex.exec(content)) !== null) {
            routes.push({
                path: match[1],
                component: match[2]
            });
        }
    } catch (error) {
        console.error('Error reading App.tsx:', error.message);
    }

    return routes;
}

/**
 * Extract navigation routes from MainLayout.tsx
 */
function extractNavigationRoutes() {
    const layoutPath = path.join(FRONTEND_DIR, 'components/Layout/MainLayout.tsx');
    const routes = [];

    try {
        const content = fs.readFileSync(layoutPath, 'utf8');

        // Extract navigation items from menuItems array
        const keyRegex = /key:\s*['"`]([^'"`]+)['"`]/g;
        const labelRegex = /label:\s*['"`]([^'"`]+)['"`]/g;

        let keyMatch, labelMatch;
        const keys = [];
        const labels = [];

        while ((keyMatch = keyRegex.exec(content)) !== null) {
            keys.push(keyMatch[1]);
        }

        // Reset regex
        labelRegex.lastIndex = 0;
        while ((labelMatch = labelRegex.exec(content)) !== null) {
            labels.push(labelMatch[1]);
        }

        // Combine keys and labels (simplified approach)
        keys.forEach((key, index) => {
            if (key.startsWith('/')) {
                routes.push({
                    path: key,
                    label: labels[index] || 'Unknown'
                });
            }
        });

    } catch (error) {
        console.error('Error reading MainLayout.tsx:', error.message);
    }

    return routes;
}

/**
 * Find incomplete components and placeholder pages
 */
function findIncompleteComponents() {
    console.log('🔍 Scanning for incomplete components...');

    // Known placeholder pages from discovery phase
    const knownPlaceholders = [
        'MaterialsPage',
        'PersonnelPage',
        'AdminPage',
        'SettingsPage'
    ];

    knownPlaceholders.forEach(componentName => {
        try {
            const command = `find ${FRONTEND_DIR} -name "*.tsx" -exec grep -l "${componentName}" {} \\; 2>/dev/null || true`;
            const output = execSync(command, { encoding: 'utf8' });

            if (output.trim()) {
                const files = output.trim().split('\n');
                files.forEach(filePath => {
                    const relativePath = filePath.replace(FRONTEND_DIR + '/', '');

                    analysisResults.incompleteComponents.push({
                        file: relativePath,
                        component: componentName,
                        type: 'PLACEHOLDER_PAGE',
                        severity: 'MEDIUM',
                        description: `Component identified as placeholder during discovery phase`
                    });
                });
            }
        } catch (error) {
            console.warn(`Warning: Failed to search for component "${componentName}": ${error.message}`);
        }
    });

    // Search for empty components or obvious placeholders
    try {
        const command = `grep -rn "return.*div.*Coming Soon\\|return.*div.*Under Construction\\|return.*div.*TODO\\|return.*div.*Placeholder" ${FRONTEND_DIR} --include="*.tsx" --include="*.jsx" 2>/dev/null || true`;
        const output = execSync(command, { encoding: 'utf8' });

        if (output.trim()) {
            const lines = output.trim().split('\n');
            lines.forEach(line => {
                const [filePath, lineNumber, ...content] = line.split(':');

                if (filePath && lineNumber) {
                    const relativePath = filePath.replace(FRONTEND_DIR + '/', '');

                    analysisResults.incompleteComponents.push({
                        file: relativePath,
                        line: parseInt(lineNumber),
                        type: 'PLACEHOLDER_CONTENT',
                        content: content.join(':').trim(),
                        severity: 'HIGH',
                        description: 'Component returns placeholder content'
                    });
                }
            });
        }
    } catch (error) {
        console.warn('Warning: Failed to search for placeholder content:', error.message);
    }

    console.log(`Found ${analysisResults.incompleteComponents.length} incomplete components`);
}

/**
 * Find mock data and hard-coded values
 */
function findMockData() {
    console.log('🔍 Scanning for mock data...');

    const mockPatterns = [
        'mockData',
        'sampleData',
        'dummyData',
        'testData',
        'hardcoded',
        'hard-coded',
        'const.*=.*\\[.*{.*id.*:.*1.*}',
        'useState.*\\[.*{.*name.*:.*test'
    ];

    for (const pattern of mockPatterns) {
        try {
            const command = `grep -rn "${pattern}" ${FRONTEND_DIR} --include="*.tsx" --include="*.ts" 2>/dev/null || true`;
            const output = execSync(command, { encoding: 'utf8' });

            if (output.trim()) {
                const lines = output.trim().split('\n');
                lines.forEach(line => {
                    const [filePath, lineNumber, ...content] = line.split(':');

                    if (filePath && lineNumber) {
                        const relativePath = filePath.replace(FRONTEND_DIR + '/', '');
                        const contentStr = content.join(':').trim();

                        // Skip test files and obvious non-issues
                        if (!relativePath.includes('test') &&
                            !relativePath.includes('spec') &&
                            !contentStr.includes('import') &&
                            !contentStr.includes('jest')) {

                            analysisResults.mockData.push({
                                file: relativePath,
                                line: parseInt(lineNumber),
                                pattern: pattern,
                                content: contentStr,
                                severity: determineMockDataSeverity(contentStr),
                                category: categorizeMockData(contentStr)
                            });
                        }
                    }
                });
            }
        } catch (error) {
            console.warn(`Warning: Failed to search for mock data pattern "${pattern}": ${error.message}`);
        }
    }

    console.log(`Found ${analysisResults.mockData.length} potential mock data instances`);
}

/**
 * Determine severity of mock data
 */
function determineMockDataSeverity(content) {
    const contentLower = content.toLowerCase();

    if (contentLower.includes('production') || contentLower.includes('api')) {
        return 'CRITICAL';
    }
    if (contentLower.includes('user') || contentLower.includes('data')) {
        return 'HIGH';
    }
    if (contentLower.includes('test') || contentLower.includes('sample')) {
        return 'MEDIUM';
    }

    return 'LOW';
}

/**
 * Categorize mock data by type
 */
function categorizeMockData(content) {
    const contentLower = content.toLowerCase();

    if (contentLower.includes('user') || contentLower.includes('person')) {
        return 'USER_DATA';
    }
    if (contentLower.includes('order') || contentLower.includes('work')) {
        return 'WORK_ORDER_DATA';
    }
    if (contentLower.includes('material') || contentLower.includes('inventory')) {
        return 'MATERIAL_DATA';
    }
    if (contentLower.includes('quality') || contentLower.includes('inspection')) {
        return 'QUALITY_DATA';
    }
    if (contentLower.includes('config') || contentLower.includes('setting')) {
        return 'CONFIGURATION_DATA';
    }

    return 'GENERAL_DATA';
}

/**
 * Generate summary statistics
 */
function generateSummary() {
    console.log('📊 Generating summary statistics...');

    // Count unique files with issues
    const filesWithIssues = new Set();

    analysisResults.placeholderMarkers.forEach(item => filesWithIssues.add(item.file));
    analysisResults.incompleteComponents.forEach(item => filesWithIssues.add(item.file));
    analysisResults.mockData.forEach(item => filesWithIssues.add(item.file));

    // Count critical issues
    let criticalIssues = 0;
    criticalIssues += analysisResults.placeholderMarkers.filter(item => item.severity === 'CRITICAL').length;
    criticalIssues += analysisResults.routeMismatches.filter(item => item.severity === 'CRITICAL').length;
    criticalIssues += analysisResults.incompleteComponents.filter(item => item.severity === 'CRITICAL').length;
    criticalIssues += analysisResults.mockData.filter(item => item.severity === 'CRITICAL').length;

    // Update summary
    analysisResults.summary = {
        totalFiles: getTotalFileCount(),
        filesWithPlaceholders: filesWithIssues.size,
        totalPlaceholders: analysisResults.placeholderMarkers.length,
        totalRouteMismatches: analysisResults.routeMismatches.length,
        totalIncompleteComponents: analysisResults.incompleteComponents.length,
        totalMockDataInstances: analysisResults.mockData.length,
        criticalIssues: criticalIssues,
        analysisDate: ANALYSIS_DATE
    };
}

/**
 * Get total file count for percentage calculations
 */
function getTotalFileCount() {
    try {
        const command = `find ${FRONTEND_DIR} -name "*.tsx" -o -name "*.ts" -o -name "*.jsx" -o -name "*.js" | wc -l`;
        const output = execSync(command, { encoding: 'utf8' });
        return parseInt(output.trim());
    } catch (error) {
        return 0;
    }
}

/**
 * Generate detailed report
 */
function generateReport() {
    console.log('📄 Generating detailed report...');

    // Generate JSON report
    const jsonReport = JSON.stringify(analysisResults, null, 2);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'placeholder-analysis-results.json'), jsonReport);

    // Generate Markdown report
    const markdownReport = generateMarkdownReport();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'placeholder-analysis-report.md'), markdownReport);

    console.log(`📊 Analysis complete! Reports saved to ${OUTPUT_DIR}`);
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport() {
    const { summary } = analysisResults;

    return `# Placeholder and Dead Link Analysis Report

## Executive Summary

**Analysis Date**: ${summary.analysisDate}
**Total Files Analyzed**: ${summary.totalFiles}
**Files with Issues**: ${summary.filesWithPlaceholders} (${((summary.filesWithPlaceholders/summary.totalFiles)*100).toFixed(1)}%)

### Issues Found
- **Placeholder Markers**: ${summary.totalPlaceholders}
- **Route Mismatches**: ${summary.totalRouteMismatches}
- **Incomplete Components**: ${summary.totalIncompleteComponents}
- **Mock Data Instances**: ${summary.totalMockDataInstances}
- **Critical Issues**: ${summary.criticalIssues}

## Detailed Findings

### 1. Placeholder Markers (${analysisResults.placeholderMarkers.length} found)

#### By Severity
- **Critical**: ${analysisResults.placeholderMarkers.filter(p => p.severity === 'CRITICAL').length}
- **High**: ${analysisResults.placeholderMarkers.filter(p => p.severity === 'HIGH').length}
- **Medium**: ${analysisResults.placeholderMarkers.filter(p => p.severity === 'MEDIUM').length}
- **Low**: ${analysisResults.placeholderMarkers.filter(p => p.severity === 'LOW').length}

#### By Category
- **UI Components**: ${analysisResults.placeholderMarkers.filter(p => p.category === 'UI_COMPONENT').length}
- **API Integration**: ${analysisResults.placeholderMarkers.filter(p => p.category === 'API_INTEGRATION').length}
- **Navigation**: ${analysisResults.placeholderMarkers.filter(p => p.category === 'NAVIGATION').length}
- **Testing**: ${analysisResults.placeholderMarkers.filter(p => p.category === 'TESTING').length}
- **Data**: ${analysisResults.placeholderMarkers.filter(p => p.category === 'DATA').length}
- **Security**: ${analysisResults.placeholderMarkers.filter(p => p.category === 'SECURITY').length}
- **General**: ${analysisResults.placeholderMarkers.filter(p => p.category === 'GENERAL').length}

${generatePlaceholderTable()}

### 2. Route Mismatches (${analysisResults.routeMismatches.length} found)

${generateRouteMismatchTable()}

### 3. Incomplete Components (${analysisResults.incompleteComponents.length} found)

${generateIncompleteComponentTable()}

### 4. Mock Data Instances (${analysisResults.mockData.length} found)

#### By Category
- **User Data**: ${analysisResults.mockData.filter(m => m.category === 'USER_DATA').length}
- **Work Order Data**: ${analysisResults.mockData.filter(m => m.category === 'WORK_ORDER_DATA').length}
- **Material Data**: ${analysisResults.mockData.filter(m => m.category === 'MATERIAL_DATA').length}
- **Quality Data**: ${analysisResults.mockData.filter(m => m.category === 'QUALITY_DATA').length}
- **Configuration Data**: ${analysisResults.mockData.filter(m => m.category === 'CONFIGURATION_DATA').length}
- **General Data**: ${analysisResults.mockData.filter(m => m.category === 'GENERAL_DATA').length}

${generateMockDataTable()}

## Recommendations

### High Priority Actions
${generateHighPriorityRecommendations()}

### Medium Priority Actions
${generateMediumPriorityRecommendations()}

### Low Priority Actions
${generateLowPriorityRecommendations()}

---

*Report generated on ${new Date().toISOString()} by MachShop UI Assessment Tool*
`;
}

/**
 * Generate placeholder table for markdown
 */
function generatePlaceholderTable() {
    const criticalAndHigh = analysisResults.placeholderMarkers
        .filter(p => p.severity === 'CRITICAL' || p.severity === 'HIGH')
        .slice(0, 20); // Limit to top 20

    if (criticalAndHigh.length === 0) return '*(No critical or high priority placeholder markers found)*';

    let table = '| File | Line | Severity | Category | Content |\n';
    table += '|------|------|----------|----------|---------|\n';

    criticalAndHigh.forEach(placeholder => {
        table += `| ${placeholder.file} | ${placeholder.line} | ${placeholder.severity} | ${placeholder.category} | ${placeholder.content.substring(0, 100)}... |\n`;
    });

    return table;
}

/**
 * Generate route mismatch table
 */
function generateRouteMismatchTable() {
    if (analysisResults.routeMismatches.length === 0) return '*(No route mismatches found)*';

    let table = '| Type | Path | Description | Severity |\n';
    table += '|------|------|-------------|----------|\n';

    analysisResults.routeMismatches.forEach(mismatch => {
        const path = mismatch.navigationPath || mismatch.routePath || 'N/A';
        table += `| ${mismatch.type} | ${path} | ${mismatch.description} | ${mismatch.severity} |\n`;
    });

    return table;
}

/**
 * Generate incomplete component table
 */
function generateIncompleteComponentTable() {
    if (analysisResults.incompleteComponents.length === 0) return '*(No incomplete components found)*';

    let table = '| File | Component/Type | Severity | Description |\n';
    table += '|------|----------------|----------|-------------|\n';

    analysisResults.incompleteComponents.forEach(component => {
        const identifier = component.component || component.type || 'Unknown';
        table += `| ${component.file} | ${identifier} | ${component.severity} | ${component.description} |\n`;
    });

    return table;
}

/**
 * Generate mock data table
 */
function generateMockDataTable() {
    const criticalAndHigh = analysisResults.mockData
        .filter(m => m.severity === 'CRITICAL' || m.severity === 'HIGH')
        .slice(0, 15); // Limit to top 15

    if (criticalAndHigh.length === 0) return '*(No critical or high priority mock data instances found)*';

    let table = '| File | Line | Severity | Category | Content |\n';
    table += '|------|------|----------|----------|---------|\n';

    criticalAndHigh.forEach(mock => {
        table += `| ${mock.file} | ${mock.line} | ${mock.severity} | ${mock.category} | ${mock.content.substring(0, 80)}... |\n`;
    });

    return table;
}

/**
 * Generate high priority recommendations
 */
function generateHighPriorityRecommendations() {
    const recommendations = [];

    const criticalPlaceholders = analysisResults.placeholderMarkers.filter(p => p.severity === 'CRITICAL').length;
    if (criticalPlaceholders > 0) {
        recommendations.push(`1. **Address ${criticalPlaceholders} critical placeholder markers** - These may indicate security or compliance issues`);
    }

    const criticalMockData = analysisResults.mockData.filter(m => m.severity === 'CRITICAL').length;
    if (criticalMockData > 0) {
        recommendations.push(`2. **Replace ${criticalMockData} critical mock data instances** - These may be serving hardcoded data to production users`);
    }

    const navMismatches = analysisResults.routeMismatches.filter(r => r.type === 'NAVIGATION_WITHOUT_ROUTE').length;
    if (navMismatches > 0) {
        recommendations.push(`3. **Fix ${navMismatches} navigation items without routes** - These create broken user experiences`);
    }

    const placeholderComponents = analysisResults.incompleteComponents.filter(c => c.severity === 'HIGH').length;
    if (placeholderComponents > 0) {
        recommendations.push(`4. **Complete ${placeholderComponents} high-priority placeholder components** - These affect core user workflows`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '*(No high priority actions identified)*';
}

/**
 * Generate medium priority recommendations
 */
function generateMediumPriorityRecommendations() {
    const recommendations = [];

    const mediumPlaceholders = analysisResults.placeholderMarkers.filter(p => p.severity === 'MEDIUM').length;
    if (mediumPlaceholders > 0) {
        recommendations.push(`1. **Address ${mediumPlaceholders} medium priority placeholder markers** - Plan implementation timeline`);
    }

    const orphanedRoutes = analysisResults.routeMismatches.filter(r => r.type === 'ROUTE_WITHOUT_NAVIGATION').length;
    if (orphanedRoutes > 0) {
        recommendations.push(`2. **Review ${orphanedRoutes} routes without navigation** - Determine if navigation links needed`);
    }

    const mediumComponents = analysisResults.incompleteComponents.filter(c => c.severity === 'MEDIUM').length;
    if (mediumComponents > 0) {
        recommendations.push(`3. **Plan completion of ${mediumComponents} placeholder pages** - Implement or remove from navigation`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '*(No medium priority actions identified)*';
}

/**
 * Generate low priority recommendations
 */
function generateLowPriorityRecommendations() {
    const recommendations = [];

    const lowPlaceholders = analysisResults.placeholderMarkers.filter(p => p.severity === 'LOW').length;
    if (lowPlaceholders > 0) {
        recommendations.push(`1. **Clean up ${lowPlaceholders} low priority markers** - Good housekeeping for code quality`);
    }

    const testMockData = analysisResults.mockData.filter(m => m.severity === 'LOW').length;
    if (testMockData > 0) {
        recommendations.push(`2. **Review ${testMockData} mock data instances** - Ensure appropriate for context`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '*(No low priority actions identified)*';
}

// Main execution
console.log('🚀 Starting comprehensive placeholder and dead link analysis...');
console.log(`📂 Analyzing frontend directory: ${FRONTEND_DIR}`);
console.log(`📝 Results will be saved to: ${OUTPUT_DIR}`);
console.log('');

try {
    findPlaceholderMarkers();
    findRouteMismatches();
    findIncompleteComponents();
    findMockData();
    generateSummary();
    generateReport();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`Files Analyzed: ${analysisResults.summary.totalFiles}`);
    console.log(`Files with Issues: ${analysisResults.summary.filesWithPlaceholders} (${((analysisResults.summary.filesWithPlaceholders/analysisResults.summary.totalFiles)*100).toFixed(1)}%)`);
    console.log(`Placeholder Markers: ${analysisResults.summary.totalPlaceholders}`);
    console.log(`Route Mismatches: ${analysisResults.summary.totalRouteMismatches}`);
    console.log(`Incomplete Components: ${analysisResults.summary.totalIncompleteComponents}`);
    console.log(`Mock Data Instances: ${analysisResults.summary.totalMockDataInstances}`);
    console.log(`Critical Issues: ${analysisResults.summary.criticalIssues}`);
    console.log('='.repeat(80));

    process.exit(0);
} catch (error) {
    console.error('❌ Analysis failed:', error.message);
    process.exit(1);
}