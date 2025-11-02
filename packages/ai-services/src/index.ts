/**
 * AI Services Package - Index/Export File (Issue #400)
 * Provider-agnostic AI services for low-code/no-code development
 */

// Types
export * from './types';

// Provider Interface & Registry
export {
  AIProvider,
  AIProviderConfig,
  AIProviderType,
  ProviderRegistry,
  ProviderFactory,
  AIProviderError,
  CompletionRequest,
  CompletionResponse,
  StreamChunk,
  TokenUsage,
  Message,
  ContentBlock,
  Tool,
  JsonSchema,
} from './providers/AIProvider';

// Provider Adapters
export { ClaudeAdapter } from './providers/ClaudeAdapter';
export { OpenAIAdapter } from './providers/OpenAIAdapter';

// Core AI Agent Service
export { AIAgentService } from './agents/AIAgentService';

import { AIAgentService } from './agents/AIAgentService';

// Exported interface for initialization
export interface AIServicesConfig {
  providerType: 'claude' | 'openai' | 'google' | 'local-llm' | 'custom';
  apiKey?: string;
  apiEndpoint?: string;
  model: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
}

/**
 * Initialize AI Services with the specified provider
 * @param config AI Services configuration
 * @returns AIAgentService instance
 */
export function initializeAIServices(config: AIServicesConfig): AIAgentService {
  const providerConfig = {
    providerId: `${config.providerType}-${Date.now()}`,
    providerType: config.providerType as any,
    apiKey: config.apiKey,
    apiEndpoint: config.apiEndpoint,
    model: config.model,
    maxTokens: config.maxTokens || 2000,
    temperature: config.temperature ?? 0.7,
    topP: config.topP ?? 1,
  };

  return new AIAgentService(providerConfig);
}

// Package version and metadata
export const VERSION = '1.0.0';

export const SUPPORTED_PROVIDERS = ['claude', 'openai', 'google', 'local-llm', 'custom'] as const;

export const CAPABILITY_CATEGORIES = [
  'workflow-generation',
  'form-generation',
  'rule-generation',
  'data-mapping',
  'documentation',
  'code-review',
  'conflict-detection',
  'chatbot',
  'recommendations',
] as const;
