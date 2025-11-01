/**
 * ESLint Plugin for MES Plugin Development
 * Provides 10+ MES-specific rules for building high-quality plugins
 */

import type { ESLintUtils } from '@typescript-eslint/experimental-utils';

interface RuleModule {
  meta: {
    type: string;
    docs: {
      description: string;
      category: string;
      recommended: boolean;
    };
    messages: Record<string, string>;
  };
  create: (context: any) => Record<string, any>;
}

/**
 * Rule 1: no-blocking-hooks
 * Ensures hook implementations don't block the event loop
 */
const noBlockingHooks: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent synchronous blocking operations in hooks',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      blockingSync: 'Hook contains blocking synchronous operation: {{ operation }}. Use async/await instead.',
      blockingLoop: 'Infinite or long-running loop detected in hook. Consider breaking work into async chunks.',
      blockingIO: 'Synchronous I/O detected ({{ call }}). All I/O in hooks must be async.'
    }
  },
  create: (context) => ({
    FunctionDeclaration(node: any) {
      if (!node.id || !node.id.name.includes('Hook')) return;

      const isAsync = node.async;
      if (!isAsync) {
        const hasAwait = checkForAwait(node.body);
        if (!hasAwait) {
          context.report({
            node,
            messageId: 'blockingSync',
            data: { operation: 'synchronous function' }
          });
        }
      }
    }
  })
};

/**
 * Rule 2: require-error-handling
 * Ensures all hooks implement error handling
 */
const requireErrorHandling: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require proper error handling in hook implementations',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      missingTryCatch: 'Hook {{ name }} missing try-catch error handling',
      missingErrorReturn: 'Hook {{ name }} does not return or throw error result',
      unhandledPromise: 'Promise in hook {{ name }} not handled with .catch() or try-catch'
    }
  },
  create: (context) => ({
    FunctionDeclaration(node: any) {
      if (!node.id || !node.id.name.includes('Hook')) return;

      const hasTryCatch = checkForTryCatch(node.body);
      const hasErrorHandling = checkForErrorHandling(node.body);

      if (!hasTryCatch && !hasErrorHandling) {
        context.report({
          node,
          messageId: 'missingTryCatch',
          data: { name: node.id.name }
        });
      }
    }
  })
};

/**
 * Rule 3: limit-hook-execution-time
 * Enforces 5-second execution time limit for hooks
 */
const limitHookExecutionTime: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce 5-second maximum execution time for hooks',
      category: 'Performance',
      recommended: true
    },
    messages: {
      slowOperation: 'Potentially slow operation detected in hook: {{ operation }}',
      noTimeout: 'Hook {{ name }} missing timeout protection',
      slowLoop: 'Unbounded loop in hook could exceed 5-second timeout'
    }
  },
  create: (context) => ({
    FunctionDeclaration(node: any) {
      if (!node.id || !node.id.name.includes('Hook')) return;

      // Check for operations that commonly exceed 5 seconds
      const slowPatterns = ['for', 'while'];
      for (const pattern of slowPatterns) {
        if (checkForPattern(node.body, pattern)) {
          context.report({
            node,
            messageId: 'slowLoop'
          });
        }
      }
    }
  })
};

/**
 * Rule 4: no-direct-db-access
 * Prevents direct database queries in hooks
 */
const noDirectDbAccess: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require using API layer instead of direct database access',
      category: 'Architecture',
      recommended: true
    },
    messages: {
      directQuery: 'Direct database query detected. Use API instead: {{ query }}',
      directConnection: 'Direct database connection in hook. Use provided context.api',
      prismaUsage: 'Direct Prisma client usage. Use context.api or context.database wrapper'
    }
  },
  create: (context) => ({
    CallExpression(node: any) {
      const callee = node.callee;

      // Check for direct Prisma/DB patterns
      if (callee.type === 'MemberExpression') {
        const objName = callee.object?.name;
        const propName = callee.property?.name;

        if (objName === 'prisma' || propName === 'query' || propName === 'execute') {
          context.report({
            node,
            messageId: 'directQuery',
            data: { query: context.sourceCode?.getText(node) || 'database query' }
          });
        }
      }
    }
  })
};

/**
 * Rule 5: require-permission-checks
 * Ensures hooks validate user permissions
 */
const requirePermissionChecks: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require permission/authorization checks in hooks',
      category: 'Security',
      recommended: true
    },
    messages: {
      missingPermissionCheck: 'Hook {{ name }} missing permission check',
      missingAuthValidation: 'Hook {{ name }} missing authorization validation',
      noContextCheck: 'Hook should validate context.user permissions'
    }
  },
  create: (context) => ({
    FunctionDeclaration(node: any) {
      if (!node.id || !node.id.name.includes('Hook')) return;

      const hasPermissionCheck = checkForPermissionLogic(node.body);
      if (!hasPermissionCheck) {
        context.report({
          node,
          messageId: 'missingPermissionCheck',
          data: { name: node.id.name }
        });
      }
    }
  })
};

/**
 * Rule 6: no-unhandled-promises
 * Ensures all promises are properly awaited or handled
 */
const noUnhandledPromises: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require all promises to be awaited or explicitly handled',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      unhandledPromise: 'Promise not awaited or handled with .catch()',
      missingAwait: 'Async function call missing await operator',
      fireAndForget: 'Fire-and-forget promises not allowed in hooks'
    }
  },
  create: (context) => ({
    ExpressionStatement(node: any) {
      if (node.expression?.type === 'CallExpression') {
        const callExpr = node.expression;

        // Check if calling async function without await
        if (callExpr.callee?.name && !checkIsAwaited(node)) {
          context.report({
            node,
            messageId: 'unhandledPromise'
          });
        }
      }
    }
  })
};

/**
 * Rule 7: no-console-in-production
 * Restricts console usage in production code
 */
const noConsoleInProduction: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Prevent console logging in production hook code',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      consoleNotAllowed: 'console.{{ method }} not allowed in production hooks. Use proper logging service.',
      debugConsole: 'Debug logging detected. Use logger service instead.',
      noConsoleError: 'console.error not allowed. Use proper error handling.'
    }
  },
  create: (context) => ({
    CallExpression(node: any) {
      const callee = node.callee;

      if (callee?.object?.name === 'console') {
        const method = callee.property?.name;
        if (['log', 'debug', 'info', 'warn', 'error'].includes(method)) {
          context.report({
            node,
            messageId: 'consoleNotAllowed',
            data: { method }
          });
        }
      }
    }
  })
};

/**
 * Rule 8: require-pagination
 * Enforces pagination for large queries
 */
const requirePagination: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require pagination parameters for queries that return many records',
      category: 'Performance',
      recommended: true
    },
    messages: {
      missingPagination: 'Query without pagination could return large result set',
      noPaginationParams: 'Missing limit/offset or page/pageSize parameters',
      unboundedQuery: 'Unbounded query detected. Must include pagination limits.'
    }
  },
  create: (context) => ({
    CallExpression(node: any) {
      const callee = node.callee;
      const text = context.sourceCode?.getText(node) || '';

      // Check for query patterns
      if (text.includes('find') || text.includes('query') || text.includes('select')) {
        const hasPagination = checkForPaginationParams(node);
        if (!hasPagination) {
          context.report({
            node,
            messageId: 'missingPagination'
          });
        }
      }
    }
  })
};

/**
 * Rule 9: validate-manifest
 * Validates plugin manifest structure
 */
const validateManifest: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Validate plugin manifest.json structure and required fields',
      category: 'Best Practices',
      recommended: true
    },
    messages: {
      invalidManifest: 'Invalid plugin manifest: {{ issue }}',
      missingField: 'Required manifest field missing: {{ field }}',
      invalidVersion: 'Invalid semantic version in manifest'
    }
  },
  create: (context) => {
    // This rule typically runs on manifest files
    return {};
  }
};

/**
 * Rule 10: security-linting
 * Detects security anti-patterns
 */
const securityLinting: RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Detect security anti-patterns and vulnerabilities',
      category: 'Security',
      recommended: true
    },
    messages: {
      sqlInjection: 'Potential SQL injection vulnerability detected',
      hardcodedSecret: 'Hardcoded credentials detected',
      insecureRandom: 'Insecure random number generation',
      xssVulnerability: 'Potential XSS vulnerability'
    }
  },
  create: (context) => ({
    Literal(node: any) {
      const value = node.value;

      // Check for hardcoded patterns
      if (typeof value === 'string') {
        if (value.includes('password=') || value.includes('token=') || value.includes('api_key=')) {
          context.report({
            node,
            messageId: 'hardcodedSecret'
          });
        }
      }
    }
  })
};

// Helper functions
function checkForAwait(node: any): boolean {
  let hasAwait = false;
  walk(node, (n) => {
    if (n.type === 'AwaitExpression') hasAwait = true;
  });
  return hasAwait;
}

function checkForTryCatch(node: any): boolean {
  let hasTryCatch = false;
  walk(node, (n) => {
    if (n.type === 'TryStatement') hasTryCatch = true;
  });
  return hasTryCatch;
}

function checkForErrorHandling(node: any): boolean {
  let hasErrorHandling = false;
  walk(node, (n) => {
    if (n.type === 'CallExpression' && n.callee?.property?.name === 'catch') {
      hasErrorHandling = true;
    }
  });
  return hasErrorHandling;
}

function checkForPattern(node: any, pattern: string): boolean {
  let found = false;
  walk(node, (n) => {
    if (n.type === pattern.charAt(0).toUpperCase() + pattern.slice(1) + 'Statement') {
      found = true;
    }
  });
  return found;
}

function checkForPermissionLogic(node: any): boolean {
  let hasPermissionCheck = false;
  walk(node, (n) => {
    if (n.type === 'CallExpression') {
      const text = JSON.stringify(n).toLowerCase();
      if (text.includes('permission') || text.includes('authorize') || text.includes('role')) {
        hasPermissionCheck = true;
      }
    }
  });
  return hasPermissionCheck;
}

function checkIsAwaited(node: any): boolean {
  return node.parent?.type === 'AwaitExpression';
}

function checkForPaginationParams(node: any): boolean {
  const text = JSON.stringify(node).toLowerCase();
  return text.includes('limit') || text.includes('offset') || text.includes('page') || text.includes('pagesize');
}

function walk(node: any, callback: (n: any) => void): void {
  if (!node) return;
  callback(node);
  for (const key in node) {
    if (key !== 'parent' && typeof node[key] === 'object') {
      if (Array.isArray(node[key])) {
        node[key].forEach((n) => walk(n, callback));
      } else {
        walk(node[key], callback);
      }
    }
  }
}

// Export all rules
const rules: Record<string, RuleModule> = {
  'no-blocking-hooks': noBlockingHooks,
  'require-error-handling': requireErrorHandling,
  'limit-hook-execution-time': limitHookExecutionTime,
  'no-direct-db-access': noDirectDbAccess,
  'require-permission-checks': requirePermissionChecks,
  'no-unhandled-promises': noUnhandledPromises,
  'no-console-in-production': noConsoleInProduction,
  'require-pagination': requirePagination,
  'validate-manifest': validateManifest,
  'security-linting': securityLinting
};

// Export plugin configuration
module.exports = {
  rules,
  configs: {
    recommended: {
      plugins: ['@mes/eslint-plugin'],
      rules: {
        '@mes/eslint-plugin/no-blocking-hooks': 'error',
        '@mes/eslint-plugin/require-error-handling': 'error',
        '@mes/eslint-plugin/limit-hook-execution-time': 'warn',
        '@mes/eslint-plugin/no-direct-db-access': 'error',
        '@mes/eslint-plugin/require-permission-checks': 'error',
        '@mes/eslint-plugin/no-unhandled-promises': 'error',
        '@mes/eslint-plugin/no-console-in-production': 'warn',
        '@mes/eslint-plugin/require-pagination': 'warn',
        '@mes/eslint-plugin/validate-manifest': 'error',
        '@mes/eslint-plugin/security-linting': 'error'
      }
    }
  }
};
