#!/usr/bin/env node

/**
 * Dependency Validation Script
 *
 * Validates that all imported packages in the codebase are declared in package.json
 * This prevents "Cannot find module" errors and ensures reproducible builds.
 *
 * Usage:
 *   node scripts/validate-dependencies.js
 *   npm run validate:deps
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Main validation function
 */
function validateDependencies() {
  console.log(`${colors.cyan}🔍 Validating dependencies...${colors.reset}\n`);

  try {
    // 1. Find all imports in source files
    const imports = findAllImports();
    console.log(`${colors.blue}Found ${imports.size} unique imports in source code${colors.reset}`);

    // 2. Load package.json
    if (!fs.existsSync('package.json')) {
      console.error(`${colors.red}❌ package.json not found!${colors.reset}`);
      process.exit(1);
    }

    const pkg = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const declared = new Set([
      ...Object.keys(pkg.dependencies || {}),
      ...Object.keys(pkg.devDependencies || {})
    ]);

    console.log(`${colors.blue}Found ${declared.size} declared dependencies in package.json${colors.reset}\n`);

    // 3. Check for missing dependencies
    const missing = [];
    const external = [];

    imports.forEach(imp => {
      // Skip relative imports (./... or ../...)
      if (imp.startsWith('.') || imp.startsWith('/')) {
        return;
      }

      // Skip TypeScript path aliases (e.g., @/lib, @/services, ~/components)
      if (imp.startsWith('@/') || imp.startsWith('~/')) {
        return;
      }

      // Extract package name (handle scoped packages like @prisma/client)
      const pkgName = imp.startsWith('@')
        ? imp.split('/').slice(0, 2).join('/')
        : imp.split('/')[0];

      // Skip Node.js built-in modules
      if (isBuiltIn(pkgName)) {
        return;
      }

      external.push(pkgName);

      if (!declared.has(pkgName)) {
        missing.push(pkgName);
      }
    });

    // Remove duplicates
    const uniqueMissing = [...new Set(missing)].sort();
    const uniqueExternal = [...new Set(external)].sort();

    // 4. Report results
    console.log(`${colors.blue}📦 External dependencies found: ${uniqueExternal.length}${colors.reset}`);

    if (uniqueMissing.length > 0) {
      console.error(`\n${colors.red}❌ Missing dependencies detected!${colors.reset}\n`);
      console.error(`${colors.yellow}The following packages are imported in code but not declared in package.json:${colors.reset}\n`);

      uniqueMissing.forEach(pkg => {
        console.error(`   ${colors.red}✗${colors.reset} ${pkg}`);
      });

      console.error(`\n${colors.cyan}💡 Fix by running:${colors.reset}`);
      console.error(`   ${colors.green}npm install --save ${uniqueMissing.join(' ')}${colors.reset}`);
      console.error(`   ${colors.yellow}(or --save-dev for development dependencies)${colors.reset}\n`);

      process.exit(1);
    } else {
      console.log(`\n${colors.green}✅ All imports are properly declared in package.json!${colors.reset}`);
      console.log(`${colors.green}✅ Dependency validation passed${colors.reset}\n`);
    }
  } catch (error) {
    console.error(`${colors.red}❌ Validation failed with error:${colors.reset}`);
    console.error(error.message);
    process.exit(1);
  }
}

/**
 * Find all import/require statements in source files
 */
function findAllImports() {
  const imports = new Set();

  // Find all TypeScript/JavaScript files in src directory
  let files = [];
  try {
    const srcExists = fs.existsSync('src');
    if (srcExists) {
      const findCommand = process.platform === 'win32'
        ? 'dir /s /b src\\*.ts src\\*.tsx src\\*.js 2>nul'
        : 'find src -type f \\( -name "*.ts" -o -name "*.tsx" -o -name "*.js" \\) 2>/dev/null';

      files = execSync(findCommand)
        .toString()
        .split('\n')
        .filter(Boolean);
    }

    if (files.length === 0) {
      console.warn(`${colors.yellow}⚠️  No TypeScript/JavaScript files found in src/ directory${colors.reset}`);
      return imports;
    }

    console.log(`${colors.blue}Scanning ${files.length} source files...${colors.reset}`);
  } catch (error) {
    console.warn(`${colors.yellow}⚠️  Could not scan src/ directory: ${error.message}${colors.reset}`);
    return imports;
  }

  // Parse each file for imports
  files.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');

      // Match ES6 imports: import ... from '...'
      const importRegex = /import\s+(?:(?:\{[^}]*\}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"]/g;
      let match;
      while ((match = importRegex.exec(content)) !== null) {
        imports.add(match[1]);
      }

      // Match CommonJS requires: require('...')
      const requireRegex = /require\(['"]([^'"]+)['"]\)/g;
      while ((match = requireRegex.exec(content)) !== null) {
        imports.add(match[1]);
      }

      // Match dynamic imports: import('...')
      const dynamicImportRegex = /import\(['"]([^'"]+)['"]\)/g;
      while ((match = dynamicImportRegex.exec(content)) !== null) {
        imports.add(match[1]);
      }
    } catch (error) {
      console.warn(`${colors.yellow}⚠️  Could not read file ${file}: ${error.message}${colors.reset}`);
    }
  });

  return imports;
}

/**
 * Check if a package is a Node.js built-in module
 */
function isBuiltIn(pkgName) {
  const builtInModules = [
    // Core modules
    'assert', 'buffer', 'child_process', 'cluster', 'crypto', 'dgram', 'dns',
    'domain', 'events', 'fs', 'http', 'https', 'net', 'os', 'path', 'punycode',
    'querystring', 'readline', 'repl', 'stream', 'string_decoder', 'timers',
    'tls', 'tty', 'url', 'util', 'v8', 'vm', 'zlib',

    // Added in Node.js newer versions
    'async_hooks', 'http2', 'inspector', 'perf_hooks', 'trace_events', 'worker_threads',
    'process', 'console',

    // Node.js prefixed imports (node:*)
    'node:assert', 'node:buffer', 'node:child_process', 'node:cluster', 'node:crypto',
    'node:dgram', 'node:dns', 'node:domain', 'node:events', 'node:fs', 'node:http',
    'node:https', 'node:net', 'node:os', 'node:path', 'node:querystring',
    'node:readline', 'node:repl', 'node:stream', 'node:string_decoder', 'node:timers',
    'node:tls', 'node:tty', 'node:url', 'node:util', 'node:v8', 'node:vm', 'node:zlib',
    'node:async_hooks', 'node:http2', 'node:inspector', 'node:perf_hooks',
    'node:trace_events', 'node:worker_threads', 'node:process', 'node:console'
  ];

  return builtInModules.includes(pkgName);
}

// Run validation if executed directly
if (require.main === module) {
  validateDependencies();
}

module.exports = { validateDependencies, findAllImports, isBuiltIn };
