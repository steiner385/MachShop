#!/usr/bin/env node

/**
 * Comprehensive API Integration and Mock Data Analysis Script
 *
 * Analyzes the MachShop frontend codebase for:
 * - API integration patterns and completeness
 * - Mock data vs. real API usage
 * - Hard-coded URLs and configurations
 * - Error handling in API calls
 * - Environment-specific configurations
 * - Data flow patterns (React Query, Zustand, etc.)
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const FRONTEND_DIR = '/home/tony/GitHub/MachShop/frontend/src';
const OUTPUT_DIR = '/home/tony/GitHub/MachShop/docs/ui-assessment/05-DATA';
const ANALYSIS_DATE = new Date().toISOString().split('T')[0];

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Analysis results storage
const analysisResults = {
    apiEndpoints: [],
    mockDataUsage: [],
    hardcodedConfigs: [],
    apiErrorHandling: [],
    missingIntegrations: [],
    dataFlowPatterns: [],
    environmentIssues: [],
    summary: {
        totalApiFiles: 0,
        totalEndpoints: 0,
        endpointsWithMockData: 0,
        endpointsWithErrorHandling: 0,
        hardcodedUrls: 0,
        configurationIssues: 0,
        analysisDate: ANALYSIS_DATE
    }
};

/**
 * Analyze API service files and endpoints
 */
function analyzeApiEndpoints() {
    console.log('🔍 Analyzing API endpoints and service patterns...');

    try {
        // Find all API-related files
        const apiFiles = [
            ...findFiles('api', ['ts', 'tsx', 'js']),
            ...findFiles('services', ['ts', 'tsx', 'js']),
            ...findFilesByPattern('*Api.ts'),
            ...findFilesByPattern('*Service.ts')
        ].filter((file, index, arr) => arr.indexOf(file) === index); // Remove duplicates

        analysisResults.summary.totalApiFiles = apiFiles.length;

        for (const filePath of apiFiles) {
            analyzeApiFile(filePath);
        }

    } catch (error) {
        console.error('Error analyzing API endpoints:', error.message);
    }

    console.log(`Found ${analysisResults.apiEndpoints.length} API endpoints in ${analysisResults.summary.totalApiFiles} files`);
}

/**
 * Analyze individual API file
 */
function analyzeApiFile(filePath) {
    try {
        const fullPath = path.join(FRONTEND_DIR, filePath);
        const content = fs.readFileSync(fullPath, 'utf8');
        const relativePath = filePath;

        // Extract API endpoints
        const endpoints = extractEndpoints(content, relativePath);
        analysisResults.apiEndpoints.push(...endpoints);

        // Check for mock data usage
        const mockUsage = findMockDataInFile(content, relativePath);
        if (mockUsage.length > 0) {
            analysisResults.mockDataUsage.push(...mockUsage);
        }

        // Check for hardcoded configurations
        const hardcodedConfigs = findHardcodedConfigs(content, relativePath);
        if (hardcodedConfigs.length > 0) {
            analysisResults.hardcodedConfigs.push(...hardcodedConfigs);
        }

        // Analyze error handling patterns
        const errorHandling = analyzeErrorHandling(content, relativePath);
        if (errorHandling.length > 0) {
            analysisResults.apiErrorHandling.push(...errorHandling);
        }

    } catch (error) {
        console.warn(`Warning: Failed to analyze ${filePath}: ${error.message}`);
    }
}

/**
 * Extract API endpoints from file content
 */
function extractEndpoints(content, filePath) {
    const endpoints = [];

    // Common API patterns
    const patterns = [
        // axios patterns
        /axios\.(get|post|put|delete|patch)\s*\(\s*['"`]([^'"`]+)['"`]/g,
        // fetch patterns
        /fetch\s*\(\s*['"`]([^'"`]+)['"`]/g,
        // url constants
        /(?:const|let|var)\s+\w+\s*=\s*['"`]\/api\/[^'"`]+['"`]/g,
        // endpoint definitions
        /endpoint\s*:\s*['"`]([^'"`]+)['"`]/g
    ];

    patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const method = match[1] || 'GET';
            const url = match[2] || match[1];

            if (url && url.includes('/api/')) {
                endpoints.push({
                    file: filePath,
                    method: method.toUpperCase(),
                    url: url,
                    lineNumber: findLineNumber(content, match.index),
                    hasMockData: checkForMockDataNearby(content, match.index),
                    hasErrorHandling: checkForErrorHandlingNearby(content, match.index),
                    category: categorizeEndpoint(url)
                });
            }
        }
    });

    return endpoints;
}

/**
 * Find mock data usage in file
 */
function findMockDataInFile(content, filePath) {
    const mockUsage = [];

    const mockPatterns = [
        /const\s+mock\w*\s*=\s*\[?\{/g,
        /useState\s*\(\s*\[?\s*\{[^}]*id\s*:\s*['"]\w+['"]/g,
        /return\s+Promise\.resolve\s*\(\s*\{[^}]*mock/g,
        /\/\*\s*mock\s*data/gi,
        /\/\/\s*temporary\s*mock/gi
    ];

    mockPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            mockUsage.push({
                file: filePath,
                lineNumber: findLineNumber(content, match.index),
                pattern: match[0],
                context: getContextAroundMatch(content, match.index, 100),
                severity: determineMockDataSeverity(match[0]),
                category: categorizeMockData(match[0])
            });
        }
    });

    return mockUsage;
}

/**
 * Find hardcoded configurations
 */
function findHardcodedConfigs(content, filePath) {
    const configs = [];

    const configPatterns = [
        // Hardcoded URLs
        /['"`]https?:\/\/[^'"`]+['"`]/g,
        // Hardcoded ports
        /['"`][^'"`]*:\d{4,5}[^'"`]*['"`]/g,
        // Environment-specific values
        /['"`](?:localhost|127\.0\.0\.1|dev\.|staging\.|prod\.)[^'"`]*['"`]/g,
        // API keys or tokens (masked)
        /(?:key|token|secret)\s*[:=]\s*['"`][A-Za-z0-9_-]{10,}['"`]/g
    ];

    configPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            const value = match[0];

            // Skip obvious non-issues
            if (!value.includes('test') &&
                !value.includes('example') &&
                !value.includes('localhost:3000') && // Common dev server
                !value.includes('placeholder')) {

                configs.push({
                    file: filePath,
                    lineNumber: findLineNumber(content, match.index),
                    value: value.length > 50 ? value.substring(0, 50) + '...' : value,
                    type: categorizeConfig(value),
                    severity: determineConfigSeverity(value),
                    recommendation: getConfigRecommendation(value)
                });
            }
        }
    });

    return configs;
}

/**
 * Analyze error handling patterns
 */
function analyzeErrorHandling(content, filePath) {
    const errorHandling = [];

    const errorPatterns = [
        /\.catch\s*\(\s*(?:error|err)\s*=>/g,
        /try\s*\{[\s\S]*?\}\s*catch\s*\(/g,
        /\.then\s*\([^)]+\)\s*\.catch\s*\(/g,
        /throw\s+new\s+Error\s*\(/g,
        /console\.error/g
    ];

    let totalApiCalls = (content.match(/axios\.|fetch\(/g) || []).length;
    let errorHandlersFound = 0;

    errorPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
            errorHandlersFound++;

            errorHandling.push({
                file: filePath,
                lineNumber: findLineNumber(content, match.index),
                pattern: match[0],
                type: categorizeErrorHandler(match[0]),
                context: getContextAroundMatch(content, match.index, 80)
            });
        }
    });

    // Calculate error handling coverage
    if (totalApiCalls > 0) {
        const coverage = (errorHandlersFound / totalApiCalls) * 100;

        if (coverage < 50) {
            analysisResults.missingIntegrations.push({
                file: filePath,
                issue: 'INSUFFICIENT_ERROR_HANDLING',
                severity: 'MEDIUM',
                description: `Only ${errorHandlersFound} error handlers for ${totalApiCalls} API calls (${coverage.toFixed(1)}% coverage)`,
                recommendation: 'Add comprehensive error handling for all API calls'
            });
        }
    }

    return errorHandling;
}

/**
 * Analyze data flow patterns (React Query, Zustand, etc.)
 */
function analyzeDataFlowPatterns() {
    console.log('🔍 Analyzing data flow patterns...');

    try {
        // Find React Query usage
        const reactQueryFiles = findFilesByContent('useQuery\\|useMutation\\|QueryClient');

        // Find Zustand store usage
        const zustandFiles = findFilesByContent('zustand\\|useStore');

        // Find direct API calls in components
        const directApiFiles = findFilesByContent('axios\\|fetch', 'components');

        analysisResults.dataFlowPatterns.push({
            pattern: 'REACT_QUERY',
            files: reactQueryFiles,
            count: reactQueryFiles.length,
            recommendation: reactQueryFiles.length > 0 ? 'Good use of React Query for server state' : 'Consider using React Query for server state management'
        });

        analysisResults.dataFlowPatterns.push({
            pattern: 'ZUSTAND_STATE',
            files: zustandFiles,
            count: zustandFiles.length,
            recommendation: 'Zustand stores found - ensure proper separation of client vs server state'
        });

        analysisResults.dataFlowPatterns.push({
            pattern: 'DIRECT_API_CALLS',
            files: directApiFiles,
            count: directApiFiles.length,
            recommendation: directApiFiles.length > 10 ? 'Consider centralizing API calls in service layer' : 'Good API call organization'
        });

    } catch (error) {
        console.error('Error analyzing data flow patterns:', error.message);
    }

    console.log(`Found ${analysisResults.dataFlowPatterns.length} data flow patterns`);
}

/**
 * Check for environment-specific issues
 */
function checkEnvironmentIssues() {
    console.log('🔍 Checking for environment-specific issues...');

    try {
        // Check for environment configuration files
        const configFiles = [
            'config/api.ts',
            'config/environment.ts',
            'constants/api.ts',
            'utils/config.ts'
        ];

        for (const configFile of configFiles) {
            const fullPath = path.join(FRONTEND_DIR, configFile);
            if (fs.existsSync(fullPath)) {
                const content = fs.readFileSync(fullPath, 'utf8');

                // Check for proper environment variable usage
                const envVarUsage = (content.match(/process\.env\./g) || []).length;
                const hardcodedUrls = (content.match(/['"`]https?:\/\/[^'"`]+['"`]/g) || []).length;

                if (hardcodedUrls > envVarUsage) {
                    analysisResults.environmentIssues.push({
                        file: configFile,
                        issue: 'HARDCODED_URLS_IN_CONFIG',
                        severity: 'HIGH',
                        description: `${hardcodedUrls} hardcoded URLs vs ${envVarUsage} environment variables`,
                        recommendation: 'Use environment variables for all API URLs and configuration'
                    });
                }
            }
        }

        // Check for missing environment variable usage in API files
        const apiFilesWithoutEnvVars = findApiFilesWithoutEnvVars();
        if (apiFilesWithoutEnvVars.length > 0) {
            analysisResults.environmentIssues.push({
                issue: 'API_FILES_WITHOUT_ENV_VARS',
                severity: 'MEDIUM',
                files: apiFilesWithoutEnvVars,
                description: `${apiFilesWithoutEnvVars.length} API files may not use environment configuration`,
                recommendation: 'Ensure all API calls use centralized configuration'
            });
        }

    } catch (error) {
        console.error('Error checking environment issues:', error.message);
    }

    console.log(`Found ${analysisResults.environmentIssues.length} environment issues`);
}

// Utility functions

function findFiles(directory, extensions) {
    try {
        const command = `find ${FRONTEND_DIR}/${directory} -type f \\( ${extensions.map(ext => `-name "*.${ext}"`).join(' -o ')} \\) 2>/dev/null || true`;
        const output = execSync(command, { encoding: 'utf8' });
        return output.trim().split('\n').filter(line => line.trim()).map(file => file.replace(FRONTEND_DIR + '/', ''));
    } catch (error) {
        return [];
    }
}

function findFilesByPattern(pattern) {
    try {
        const command = `find ${FRONTEND_DIR} -name "${pattern}" 2>/dev/null || true`;
        const output = execSync(command, { encoding: 'utf8' });
        return output.trim().split('\n').filter(line => line.trim()).map(file => file.replace(FRONTEND_DIR + '/', ''));
    } catch (error) {
        return [];
    }
}

function findFilesByContent(pattern, directory = '') {
    try {
        const searchDir = directory ? `${FRONTEND_DIR}/${directory}` : FRONTEND_DIR;
        const command = `grep -rl "${pattern}" ${searchDir} --include="*.tsx" --include="*.ts" 2>/dev/null || true`;
        const output = execSync(command, { encoding: 'utf8' });
        return output.trim().split('\n').filter(line => line.trim()).map(file => file.replace(FRONTEND_DIR + '/', ''));
    } catch (error) {
        return [];
    }
}

function findApiFilesWithoutEnvVars() {
    const apiFiles = findFiles('api', ['ts', 'tsx']);
    const filesWithoutEnvVars = [];

    for (const file of apiFiles) {
        try {
            const fullPath = path.join(FRONTEND_DIR, file);
            const content = fs.readFileSync(fullPath, 'utf8');

            const hasHardcodedUrls = /['"`]https?:\/\/[^'"`]+['"`]/.test(content);
            const hasEnvVars = /process\.env\./.test(content);

            if (hasHardcodedUrls && !hasEnvVars) {
                filesWithoutEnvVars.push(file);
            }
        } catch (error) {
            // Skip files that can't be read
        }
    }

    return filesWithoutEnvVars;
}

function findLineNumber(content, index) {
    return content.substring(0, index).split('\n').length;
}

function getContextAroundMatch(content, index, length = 100) {
    const start = Math.max(0, index - length / 2);
    const end = Math.min(content.length, index + length / 2);
    return content.substring(start, end).replace(/\n/g, ' ').trim();
}

function checkForMockDataNearby(content, index) {
    const context = getContextAroundMatch(content, index, 200);
    return /mock|dummy|test|sample/i.test(context);
}

function checkForErrorHandlingNearby(content, index) {
    const context = getContextAroundMatch(content, index, 300);
    return /catch|error|try\s*\{/.test(context);
}

function categorizeEndpoint(url) {
    if (url.includes('/auth/') || url.includes('/login/')) return 'AUTHENTICATION';
    if (url.includes('/workorder/') || url.includes('/work-order/')) return 'WORK_ORDERS';
    if (url.includes('/quality/') || url.includes('/inspection/')) return 'QUALITY';
    if (url.includes('/material/') || url.includes('/inventory/')) return 'MATERIALS';
    if (url.includes('/user/') || url.includes('/personnel/')) return 'USERS';
    if (url.includes('/equipment/') || url.includes('/machine/')) return 'EQUIPMENT';
    if (url.includes('/routing/') || url.includes('/process/')) return 'ROUTING';
    return 'GENERAL';
}

function determineMockDataSeverity(content) {
    if (content.includes('production') || content.includes('critical')) return 'CRITICAL';
    if (content.includes('user') || content.includes('api')) return 'HIGH';
    return 'MEDIUM';
}

function categorizeMockData(content) {
    if (content.includes('user') || content.includes('person')) return 'USER_DATA';
    if (content.includes('order') || content.includes('work')) return 'WORK_ORDER_DATA';
    if (content.includes('material') || content.includes('inventory')) return 'MATERIAL_DATA';
    return 'GENERAL_DATA';
}

function categorizeConfig(value) {
    if (value.includes('http://') || value.includes('https://')) return 'URL';
    if (value.includes(':') && /\d{4,5}/.test(value)) return 'PORT';
    if (value.includes('key') || value.includes('token')) return 'CREDENTIAL';
    return 'GENERAL';
}

function determineConfigSeverity(value) {
    if (value.includes('prod') || value.includes('api')) return 'HIGH';
    if (value.includes('staging') || value.includes('dev')) return 'MEDIUM';
    return 'LOW';
}

function getConfigRecommendation(value) {
    if (value.includes('http')) return 'Move to environment variables (REACT_APP_API_URL)';
    if (value.includes('key') || value.includes('token')) return 'Move to secure environment configuration';
    return 'Consider using environment-based configuration';
}

function categorizeErrorHandler(pattern) {
    if (pattern.includes('catch')) return 'PROMISE_CATCH';
    if (pattern.includes('try')) return 'TRY_CATCH';
    if (pattern.includes('throw')) return 'ERROR_THROW';
    if (pattern.includes('console')) return 'CONSOLE_ERROR';
    return 'OTHER';
}

/**
 * Generate summary statistics
 */
function generateSummary() {
    console.log('📊 Generating summary statistics...');

    analysisResults.summary.totalEndpoints = analysisResults.apiEndpoints.length;
    analysisResults.summary.endpointsWithMockData = analysisResults.apiEndpoints.filter(ep => ep.hasMockData).length;
    analysisResults.summary.endpointsWithErrorHandling = analysisResults.apiEndpoints.filter(ep => ep.hasErrorHandling).length;
    analysisResults.summary.hardcodedUrls = analysisResults.hardcodedConfigs.filter(config => config.type === 'URL').length;
    analysisResults.summary.configurationIssues = analysisResults.environmentIssues.length;
}

/**
 * Generate reports
 */
function generateReport() {
    console.log('📄 Generating API integration report...');

    // Generate JSON report
    const jsonReport = JSON.stringify(analysisResults, null, 2);
    fs.writeFileSync(path.join(OUTPUT_DIR, 'api-integration-analysis.json'), jsonReport);

    // Generate Markdown report
    const markdownReport = generateMarkdownReport();
    fs.writeFileSync(path.join(OUTPUT_DIR, 'api-integration-report.md'), markdownReport);

    console.log(`📊 API integration analysis complete! Reports saved to ${OUTPUT_DIR}`);
}

/**
 * Generate Markdown report
 */
function generateMarkdownReport() {
    const { summary } = analysisResults;

    return `# API Integration and Mock Data Analysis Report

## Executive Summary

**Analysis Date**: ${summary.analysisDate}
**API Files Analyzed**: ${summary.totalApiFiles}
**Total Endpoints Found**: ${summary.totalEndpoints}

### Integration Health
- **Endpoints with Mock Data**: ${summary.endpointsWithMockData} (${summary.totalEndpoints > 0 ? ((summary.endpointsWithMockData/summary.totalEndpoints)*100).toFixed(1) : 0}%)
- **Endpoints with Error Handling**: ${summary.endpointsWithErrorHandling} (${summary.totalEndpoints > 0 ? ((summary.endpointsWithErrorHandling/summary.totalEndpoints)*100).toFixed(1) : 0}%)
- **Hardcoded URLs**: ${summary.hardcodedUrls}
- **Configuration Issues**: ${summary.configurationIssues}

## Detailed Findings

### 1. API Endpoints (${analysisResults.apiEndpoints.length} found)

#### By Category
${generateEndpointCategoryBreakdown()}

#### Endpoints Requiring Attention
${generateEndpointTable()}

### 2. Mock Data Usage (${analysisResults.mockDataUsage.length} instances)

#### By Severity
- **Critical**: ${analysisResults.mockDataUsage.filter(m => m.severity === 'CRITICAL').length}
- **High**: ${analysisResults.mockDataUsage.filter(m => m.severity === 'HIGH').length}
- **Medium**: ${analysisResults.mockDataUsage.filter(m => m.severity === 'MEDIUM').length}

${generateMockDataTable()}

### 3. Configuration Issues (${analysisResults.hardcodedConfigs.length} found)

${generateConfigTable()}

### 4. Error Handling Analysis

${generateErrorHandlingAnalysis()}

### 5. Data Flow Patterns

${generateDataFlowAnalysis()}

### 6. Environment Configuration Issues

${generateEnvironmentIssues()}

## Recommendations

### High Priority Actions
${generateHighPriorityAPIRecommendations()}

### Medium Priority Actions
${generateMediumPriorityAPIRecommendations()}

### Best Practices Implementation
${generateBestPracticesRecommendations()}

---

*Report generated on ${new Date().toISOString()} by MachShop UI Assessment Tool*
`;
}

function generateEndpointCategoryBreakdown() {
    const categories = {};
    analysisResults.apiEndpoints.forEach(ep => {
        categories[ep.category] = (categories[ep.category] || 0) + 1;
    });

    return Object.entries(categories)
        .map(([category, count]) => `- **${category}**: ${count}`)
        .join('\n');
}

function generateEndpointTable() {
    const endpointsWithIssues = analysisResults.apiEndpoints
        .filter(ep => ep.hasMockData || !ep.hasErrorHandling)
        .slice(0, 15);

    if (endpointsWithIssues.length === 0) return '*(No endpoints with issues found)*';

    let table = '| File | Method | URL | Issues |\n';
    table += '|------|--------|-----|--------|\n';

    endpointsWithIssues.forEach(endpoint => {
        const issues = [];
        if (endpoint.hasMockData) issues.push('Mock Data');
        if (!endpoint.hasErrorHandling) issues.push('No Error Handling');

        table += `| ${endpoint.file} | ${endpoint.method} | ${endpoint.url} | ${issues.join(', ')} |\n`;
    });

    return table;
}

function generateMockDataTable() {
    const criticalAndHigh = analysisResults.mockDataUsage
        .filter(m => m.severity === 'CRITICAL' || m.severity === 'HIGH')
        .slice(0, 10);

    if (criticalAndHigh.length === 0) return '*(No critical or high severity mock data found)*';

    let table = '| File | Line | Severity | Category | Context |\n';
    table += '|------|------|----------|----------|---------|\n';

    criticalAndHigh.forEach(mock => {
        table += `| ${mock.file} | ${mock.line} | ${mock.severity} | ${mock.category} | ${mock.context.substring(0, 60)}... |\n`;
    });

    return table;
}

function generateConfigTable() {
    const highAndMedium = analysisResults.hardcodedConfigs
        .filter(c => c.severity === 'HIGH' || c.severity === 'MEDIUM')
        .slice(0, 10);

    if (highAndMedium.length === 0) return '*(No significant configuration issues found)*';

    let table = '| File | Type | Severity | Value | Recommendation |\n';
    table += '|------|------|----------|-------|----------------|\n';

    highAndMedium.forEach(config => {
        table += `| ${config.file} | ${config.type} | ${config.severity} | ${config.value} | ${config.recommendation} |\n`;
    });

    return table;
}

function generateErrorHandlingAnalysis() {
    const totalFiles = analysisResults.summary.totalApiFiles;
    const filesWithErrors = analysisResults.apiErrorHandling.length;
    const coverage = totalFiles > 0 ? ((filesWithErrors / totalFiles) * 100).toFixed(1) : 0;

    return `**Error Handling Coverage**: ${filesWithErrors}/${totalFiles} files (${coverage}%)

#### Error Handling Patterns Found
- **Promise Catch**: ${analysisResults.apiErrorHandling.filter(eh => eh.type === 'PROMISE_CATCH').length}
- **Try-Catch Blocks**: ${analysisResults.apiErrorHandling.filter(eh => eh.type === 'TRY_CATCH').length}
- **Error Throwing**: ${analysisResults.apiErrorHandling.filter(eh => eh.type === 'ERROR_THROW').length}
- **Console Errors**: ${analysisResults.apiErrorHandling.filter(eh => eh.type === 'CONSOLE_ERROR').length}

#### Files Needing Better Error Handling
${analysisResults.missingIntegrations.filter(mi => mi.issue === 'INSUFFICIENT_ERROR_HANDLING').map(mi => `- ${mi.file}: ${mi.description}`).join('\n') || '*(All files have adequate error handling)*'}`;
}

function generateDataFlowAnalysis() {
    return analysisResults.dataFlowPatterns.map(pattern =>
        `**${pattern.pattern}**: ${pattern.count} files\n- ${pattern.recommendation}`
    ).join('\n\n') || '*(No data flow patterns analyzed)*';
}

function generateEnvironmentIssues() {
    if (analysisResults.environmentIssues.length === 0) return '*(No environment configuration issues found)*';

    return analysisResults.environmentIssues.map(issue =>
        `**${issue.issue}**: ${issue.severity}\n- ${issue.description}\n- Recommendation: ${issue.recommendation}`
    ).join('\n\n');
}

function generateHighPriorityAPIRecommendations() {
    const recommendations = [];

    const criticalMock = analysisResults.mockDataUsage.filter(m => m.severity === 'CRITICAL').length;
    if (criticalMock > 0) {
        recommendations.push(`1. **Replace ${criticalMock} critical mock data instances** - These may be serving fake data to production users`);
    }

    const hardcodedUrls = analysisResults.summary.hardcodedUrls;
    if (hardcodedUrls > 0) {
        recommendations.push(`2. **Fix ${hardcodedUrls} hardcoded URLs** - Use environment variables for all API endpoints`);
    }

    const endpointsWithoutErrors = analysisResults.summary.totalEndpoints - analysisResults.summary.endpointsWithErrorHandling;
    if (endpointsWithoutErrors > 5) {
        recommendations.push(`3. **Add error handling to ${endpointsWithoutErrors} API endpoints** - Improve user experience and debugging`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '*(No high priority API actions identified)*';
}

function generateMediumPriorityAPIRecommendations() {
    const recommendations = [];

    const highMock = analysisResults.mockDataUsage.filter(m => m.severity === 'HIGH').length;
    if (highMock > 0) {
        recommendations.push(`1. **Review ${highMock} high priority mock data instances** - Plan API integration timeline`);
    }

    const configIssues = analysisResults.summary.configurationIssues;
    if (configIssues > 0) {
        recommendations.push(`2. **Address ${configIssues} configuration issues** - Improve environment management`);
    }

    return recommendations.length > 0 ? recommendations.join('\n') : '*(No medium priority API actions identified)*';
}

function generateBestPracticesRecommendations() {
    return `1. **Centralize API Configuration** - Use environment variables for all endpoints
2. **Implement Consistent Error Handling** - Add try-catch or .catch() to all API calls
3. **Use React Query** - Leverage server state management for better caching and error handling
4. **Type Safety** - Ensure all API responses are properly typed
5. **Mock Data Strategy** - Use proper development vs production environment handling`;
}

// Main execution
console.log('🚀 Starting comprehensive API integration and mock data analysis...');
console.log(`📂 Analyzing frontend directory: ${FRONTEND_DIR}`);
console.log(`📝 Results will be saved to: ${OUTPUT_DIR}`);
console.log('');

try {
    analyzeApiEndpoints();
    analyzeDataFlowPatterns();
    checkEnvironmentIssues();
    generateSummary();
    generateReport();

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 API INTEGRATION ANALYSIS SUMMARY');
    console.log('='.repeat(80));
    console.log(`API Files Analyzed: ${analysisResults.summary.totalApiFiles}`);
    console.log(`Total Endpoints: ${analysisResults.summary.totalEndpoints}`);
    console.log(`Endpoints with Mock Data: ${analysisResults.summary.endpointsWithMockData} (${analysisResults.summary.totalEndpoints > 0 ? ((analysisResults.summary.endpointsWithMockData/analysisResults.summary.totalEndpoints)*100).toFixed(1) : 0}%)`);
    console.log(`Endpoints with Error Handling: ${analysisResults.summary.endpointsWithErrorHandling} (${analysisResults.summary.totalEndpoints > 0 ? ((analysisResults.summary.endpointsWithErrorHandling/analysisResults.summary.totalEndpoints)*100).toFixed(1) : 0}%)`);
    console.log(`Hardcoded URLs: ${analysisResults.summary.hardcodedUrls}`);
    console.log(`Configuration Issues: ${analysisResults.summary.configurationIssues}`);
    console.log('='.repeat(80));

    process.exit(0);
} catch (error) {
    console.error('❌ API integration analysis failed:', error.message);
    process.exit(1);
}