/**
 * Automation Rules Engine
 * Main export file
 */

// Type exports
export * from './types';

// Core exports
export { RuleEngine, ruleEngine } from './core/RuleEngine';
export { ActionExecutor, actionExecutor } from './core/ActionExecutor';

// Storage exports
export { RuleRepository, ruleRepository } from './storage/RuleRepository';

// Template exports
export { getPreBuiltRules, getRulesByCategory, getRulesByTags, getPreBuiltRule } from './templates/PreBuiltRules';

// Singleton instances
export { ruleEngine, actionExecutor, ruleRepository };
