/**
 * AI Provider Interface - Agnostic to any LLM provider
 * Supports Claude, OpenAI, Local LLMs, and custom implementations
 */

// ========== Provider Configuration ==========

export interface AIProviderConfig {
  providerId: string;
  providerType: AIProviderType;
  apiKey?: string;
  apiEndpoint?: string;
  model: string;
  maxTokens: number;
  temperature: number;
  topP?: number;
  timeout?: number;
  retryPolicy?: RetryConfig;
  customHeaders?: Record<string, string>;
}

export type AIProviderType =
  | 'claude'
  | 'openai'
  | 'google'
  | 'local-llm'
  | 'custom';

export interface RetryConfig {
  maxRetries: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

// ========== Provider Interface ==========

export interface AIProvider {
  // Configuration
  getConfig(): AIProviderConfig;
  setConfig(config: Partial<AIProviderConfig>): void;
  validateConfig(): ConfigValidationResult;

  // Core LLM Operations
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  stream(request: CompletionRequest): AsyncIterableIterator<StreamChunk>;

  // Structured Output
  structuredOutput<T>(
    request: StructuredOutputRequest,
    schema: JsonSchema
  ): Promise<T>;

  // Embeddings (optional)
  embed?(texts: string[]): Promise<EmbeddingResponse>;

  // Token Management
  countTokens(text: string): Promise<number>;
  estimateCost(inputTokens: number, outputTokens: number): Promise<number>;

  // Health & Status
  healthCheck(): Promise<HealthCheckResult>;
  getUsageStats(): UsageStats;

  // Cleanup
  shutdown?(): Promise<void>;
}

// ========== Request/Response Types ==========

export interface CompletionRequest {
  prompt?: string;
  messages?: Message[];
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stopSequences?: string[];
  tools?: Tool[];
  toolChoice?: 'auto' | 'none' | string;
}

export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | ContentBlock[];
  toolUseId?: string;
}

export type ContentBlock =
  | TextContent
  | ImageContent
  | ToolUseContent
  | ToolResultContent;

export interface TextContent {
  type: 'text';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64' | 'url';
    media_type?: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';
    data?: string; // base64
    url?: string;
  };
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultContent {
  type: 'tool_result';
  toolUseId: string;
  content: string;
  isError?: boolean;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: JsonSchema;
}

export interface JsonSchema {
  $schema?: string;
  type: string;
  properties?: Record<string, JsonSchema>;
  required?: string[];
  items?: JsonSchema;
  enum?: unknown[];
  description?: string;
  [key: string]: unknown;
}

export interface CompletionResponse {
  id: string;
  content: string;
  contentBlocks?: ContentBlock[];
  stopReason: StopReason;
  usage: TokenUsage;
  model: string;
  timestamp: Date;
  finishReason?: FinishReason;
  toolUses?: ToolUse[];
}

export type StopReason =
  | 'end_turn'
  | 'max_tokens'
  | 'stop_sequence'
  | 'tool_use';

export type FinishReason =
  | 'stop'
  | 'length'
  | 'tool_calls'
  | 'content_filter';

export interface ToolUse {
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface StreamChunk {
  id: string;
  type: 'start' | 'content_block_start' | 'content_block_delta' | 'content_block_stop' | 'message_stop' | 'error';
  timestamp: Date;
  delta?: {
    type: string;
    text?: string;
    [key: string]: unknown;
  };
  message?: CompletionResponse;
  error?: AIProviderError;
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cacheCreationTokens?: number;
  cacheReadTokens?: number;
}

export interface StructuredOutputRequest extends CompletionRequest {
  format?: 'json' | 'yaml' | 'xml';
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: TokenUsage;
}

// ========== Provider State & Health ==========

export interface UsageStats {
  totalRequests: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  estimatedCost: number;
  errorCount: number;
  averageLatency: number;
  lastRequest?: Date;
}

export interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  available: boolean;
  message?: string;
  lastChecked: Date;
}

export interface ConfigValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

// ========== Error Handling ==========

export class AIProviderError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public originalError?: Error,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    type: string;
    status?: number;
  };
}

// ========== Provider Registry ==========

export interface ProviderFactory {
  create(config: AIProviderConfig): AIProvider;
  getAvailableProviders(): string[];
  isProviderAvailable(providerType: AIProviderType): boolean;
}

export class ProviderRegistry {
  private static providers: Map<AIProviderType, ProviderFactory> = new Map();

  static register(type: AIProviderType, factory: ProviderFactory): void {
    ProviderRegistry.providers.set(type, factory);
  }

  static getFactory(type: AIProviderType): ProviderFactory {
    const factory = ProviderRegistry.providers.get(type);
    if (!factory) {
      throw new AIProviderError(
        'PROVIDER_NOT_FOUND',
        `No provider registered for type: ${type}`
      );
    }
    return factory;
  }

  static createProvider(config: AIProviderConfig): AIProvider {
    const factory = ProviderRegistry.getFactory(config.providerType);
    return factory.create(config);
  }

  static isRegistered(type: AIProviderType): boolean {
    return ProviderRegistry.providers.has(type);
  }
}
