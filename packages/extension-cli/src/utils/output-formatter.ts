/**
 * Output Formatter Utility
 *
 * Provides consistent, colorful terminal output formatting.
 */

import type { ValidationResult } from './manifest-validator';

/**
 * Color codes for terminal output
 */
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

/**
 * Print validation results to console
 */
export function printValidationResults(result: ValidationResult): void {
  console.log(`${colors.bright}Validation Results:${colors.reset}`);
  console.log();

  if (result.valid) {
    console.log(`${colors.green}✅ Manifest is valid${colors.reset}\n`);
  } else {
    console.log(`${colors.red}❌ Manifest has errors${colors.reset}\n`);
  }

  if (result.errors.length > 0) {
    console.log(`${colors.red}${colors.bright}Errors (${result.errors.length}):${colors.reset}`);
    result.errors.forEach((error) => {
      console.log(`  ${colors.red}✗${colors.reset} ${colors.bright}${error.field}${colors.reset}`);
      console.log(`    ${error.message}`);
      if (error.value !== undefined) {
        console.log(`    Current value: ${JSON.stringify(error.value)}`);
      }
    });
    console.log();
  }

  if (result.warnings.length > 0) {
    console.log(`${colors.yellow}${colors.bright}Warnings (${result.warnings.length}):${colors.reset}`);
    result.warnings.forEach((warning) => {
      console.log(`  ${colors.yellow}⚠${colors.reset} ${colors.bright}${warning.field}${colors.reset}`);
      console.log(`    ${warning.message}`);
    });
    console.log();
  }
}

/**
 * Format a success message
 */
export function printSuccess(message: string): void {
  console.log(`${colors.green}${colors.bright}✅ ${message}${colors.reset}`);
}

/**
 * Format an error message
 */
export function printError(message: string): void {
  console.error(`${colors.red}${colors.bright}❌ ${message}${colors.reset}`);
}

/**
 * Format a warning message
 */
export function printWarning(message: string): void {
  console.log(`${colors.yellow}${colors.bright}⚠️  ${message}${colors.reset}`);
}

/**
 * Format an info message
 */
export function printInfo(message: string): void {
  console.log(`${colors.blue}${colors.bright}ℹ️  ${message}${colors.reset}`);
}

/**
 * Format a header
 */
export function printHeader(title: string): void {
  console.log(`\n${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}  ${title}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

/**
 * Format a section
 */
export function printSection(title: string): void {
  console.log(`\n${colors.bright}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.dim}${'-'.repeat(title.length)}${colors.reset}`);
}

/**
 * Format table output
 */
export function printTable(
  headers: string[],
  rows: (string | number)[][]
): void {
  // Calculate column widths
  const widths = headers.map((h) => h.length);
  rows.forEach((row) => {
    row.forEach((cell, idx) => {
      widths[idx] = Math.max(widths[idx], String(cell).length);
    });
  });

  // Print header
  const headerLine = headers
    .map((h, idx) => h.padEnd(widths[idx]))
    .join(' | ');
  console.log(colors.bright + headerLine + colors.reset);
  console.log(
    widths.map((w) => '-'.repeat(w)).join('-+-')
  );

  // Print rows
  rows.forEach((row) => {
    const rowLine = row
      .map((cell, idx) => String(cell).padEnd(widths[idx]))
      .join(' | ');
    console.log(rowLine);
  });
}

/**
 * Create a progress indicator
 */
export function createProgressBar(
  current: number,
  total: number,
  width: number = 30
): string {
  const percentage = Math.round((current / total) * 100);
  const filledWidth = Math.round((width * current) / total);
  const emptyWidth = width - filledWidth;

  const bar =
    '█'.repeat(filledWidth) + '░'.repeat(emptyWidth);
  return `[${bar}] ${percentage}%`;
}

/**
 * Format duration in milliseconds as human-readable string
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  if (ms < 60000) {
    return `${(ms / 1000).toFixed(2)}s`;
  }
  return `${(ms / 60000).toFixed(2)}m`;
}
