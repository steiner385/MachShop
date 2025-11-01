#!/usr/bin/env node
/**
 * MachShop Extension Developer CLI
 *
 * Provides developer-friendly tools for extension development, testing, and deployment:
 * - Extension scaffold generator
 * - Manifest validator
 * - Local development server
 * - Deployment automation
 * - Testing utilities
 */

import { program } from 'commander';
import { generateExtension } from './commands/generate';
import { validateManifest } from './commands/validate';
import { startDevServer } from './commands/dev';
import { deployExtension } from './commands/deploy';
import { testExtension } from './commands/test';

const version = '1.0.0';

// Create CLI program
const cli = program
  .name('mach-ext')
  .description('MachShop Extension Developer CLI - Build, validate, test, and deploy extensions')
  .version(version);

// Register commands
cli
  .command('generate <name>')
  .description('Generate a new extension scaffold from templates')
  .option('-t, --type <type>', 'Extension type (ui-component, business-logic, data-model, integration, compliance, infrastructure)', 'ui-component')
  .option('-d, --directory <dir>', 'Output directory', '.')
  .option('--typescript', 'Generate TypeScript project')
  .option('--with-tests', 'Include test files')
  .option('--with-docs', 'Include documentation files')
  .action(generateExtension);

cli
  .command('validate [path]')
  .description('Validate extension manifest against schema')
  .option('-f, --format <format>', 'Output format (text, json)', 'text')
  .option('--strict', 'Enable strict validation')
  .option('--fix', 'Attempt to auto-fix validation errors')
  .action(validateManifest);

cli
  .command('dev')
  .description('Start local development server for extension testing')
  .option('-p, --port <port>', 'Server port', '3001')
  .option('--manifest <path>', 'Path to extension manifest')
  .option('--watch', 'Watch mode - reload on changes')
  .option('--hot', 'Hot module replacement')
  .action(startDevServer);

cli
  .command('deploy <environment>')
  .description('Deploy extension to specified environment')
  .option('-m, --manifest <path>', 'Path to extension manifest')
  .option('--registry <url>', 'Extension registry URL')
  .option('--api-key <key>', 'API key for authentication')
  .option('--dry-run', 'Preview deployment without applying changes')
  .option('--rollback-on-error', 'Automatically rollback on deployment error')
  .action(deployExtension);

cli
  .command('test [path]')
  .description('Run tests for extension')
  .option('--watch', 'Watch mode')
  .option('--coverage', 'Generate coverage report')
  .option('--format <format>', 'Test output format (text, json, junit)', 'text')
  .option('--match <pattern>', 'Run tests matching pattern')
  .action(testExtension);

// Additional utility commands
cli
  .command('lint [path]')
  .description('Lint extension code')
  .action(() => {
    console.log('Extension linting not yet implemented');
  });

cli
  .command('build [path]')
  .description('Build extension for production')
  .option('--minify', 'Minify output')
  .option('--sourcemap', 'Generate source maps')
  .action(() => {
    console.log('Extension build not yet implemented');
  });

cli
  .command('publish [path]')
  .description('Publish extension to registry')
  .option('--registry <url>', 'Extension registry URL')
  .option('--api-key <key>', 'API key for authentication')
  .option('--dry-run', 'Preview publication without publishing')
  .action(() => {
    console.log('Extension publishing not yet implemented');
  });

// Parse arguments and execute
cli.parse(process.argv);

// Show help if no command provided
if (!process.argv.slice(2).length) {
  cli.outputHelp();
}

export default cli;
