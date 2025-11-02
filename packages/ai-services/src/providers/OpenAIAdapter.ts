/**
 * OpenAI Provider Adapter
 * Implementation of AIProvider for OpenAI's GPT models
 */

import {
  AIProvider,
  AIProviderConfig,
  AIProviderError,
  CompletionRequest,
  CompletionResponse,
  ConfigValidationResult,
  HealthCheckResult,
  UsageStats,
  StreamChunk,
  StructuredOutputRequest,
} from './AIProvider';

export class OpenAIAdapter implements AIProvider {
  private config: AIProviderConfig;
  private stats: UsageStats = {
    totalRequests: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    estimatedCost: 0,
    errorCount: 0,
    averageLatency: 0,
  };
  private latencies: number[] = [];

  constructor(config: AIProviderConfig) {
    this.config = this.normalizeConfig(config);
  }

  private normalizeConfig(config: AIProviderConfig): AIProviderConfig {
    return {
      ...config,
      apiEndpoint: config.apiEndpoint || 'https://api.openai.com/v1',
      timeout: config.timeout || 30000,
      retryPolicy: config.retryPolicy || {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffMultiplier: 2,
      },
    };
  }

  getConfig(): AIProviderConfig {
    return { ...this.config };
  }

  setConfig(config: Partial<AIProviderConfig>): void {
    this.config = { ...this.config, ...config };
  }

  validateConfig(): ConfigValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!this.config.apiKey) {
      errors.push('API key is required');
    }

    if (!this.config.model) {
      errors.push('Model is required');
    }

    if (this.config.maxTokens < 1 || this.config.maxTokens > 128000) {
      errors.push('maxTokens must be between 1 and 128000');
    }

    if (this.config.temperature < 0 || this.config.temperature > 2) {
      errors.push('temperature must be between 0 and 2');
    }

    // Model availability warnings
    const validModels = ['gpt-4', 'gpt-4-turbo', 'gpt-4-turbo-preview', 'gpt-3.5-turbo'];
    const modelExists = validModels.some((m) => this.config.model.startsWith(m));
    if (!modelExists) {
      warnings.push(`Model ${this.config.model} may not be recognized by OpenAI API`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const startTime = Date.now();

    try {
      const payload = this.buildRequestPayload(request);
      const response = await this.makeRequest<OpenAIResponse>(payload);
      const latency = Date.now() - startTime;

      this.recordMetrics(response.usage, latency);

      return this.mapResponse(response);
    } catch (error) {
      this.stats.errorCount++;
      throw this.handleError(error);
    }
  }

  async *stream(request: CompletionRequest): AsyncIterableIterator<StreamChunk> {
    try {
      const payload = {
        ...this.buildRequestPayload(request),
        stream: true,
      };

      const response = await fetch(`${this.config.apiEndpoint}/chat/completions`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new AIProviderError(
          'STREAMING_ERROR',
          `HTTP ${response.status}`,
          response.status,
          undefined,
          response.status >= 500
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new AIProviderError('STREAM_ERROR', 'Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';
      let messageId = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;

            const event = JSON.parse(data);
            if (!messageId && event.id) {
              messageId = event.id;
            }

            yield {
              id: messageId,
              type: 'content_block_delta',
              timestamp: new Date(),
              delta: {
                type: 'text_delta',
                text: event.choices?.[0]?.delta?.content || '',
              },
            };
          }
        }
      }
    } catch (error) {
      throw this.handleError(error);
    }
  }

  async structuredOutput<T>(request: StructuredOutputRequest, schema: any): Promise<T> {
    const prompt = `
Respond with valid JSON matching this schema:
${JSON.stringify(schema, null, 2)}

User request: ${request.prompt || request.messages?.[request.messages.length - 1].content}
`;

    const modifiedRequest: CompletionRequest = {
      ...request,
      prompt,
      stopSequences: ['}'],
    };

    const response = await this.complete(modifiedRequest);

    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      throw new AIProviderError(
        'JSON_PARSE_ERROR',
        `Failed to parse structured output: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  async countTokens(text: string): Promise<number> {
    // OpenAI doesn't have direct token counting in basic API, estimate
    // Rough estimate: 1 token ≈ 4 characters
    return Math.ceil(text.length / 4);
  }

  async estimateCost(inputTokens: number, outputTokens: number): Promise<number> {
    // Pricing for GPT-4 (as of training data cutoff)
    const costPerMillion = {
      'gpt-4': { input: 30, output: 60 },
      'gpt-4-turbo': { input: 10, output: 30 },
      'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
    };

    const modelKey = Object.keys(costPerMillion).find((key) => this.config.model.startsWith(key));
    const pricing = modelKey
      ? costPerMillion[modelKey as keyof typeof costPerMillion]
      : { input: 0.0005, output: 0.0015 };

    return (inputTokens * pricing.input + outputTokens * pricing.output) / 1000000;
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      await this.complete({
        prompt: 'Hello',
        maxTokens: 10,
      });

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        available: true,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        available: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        lastChecked: new Date(),
      };
    }
  }

  getUsageStats(): UsageStats {
    return {
      ...this.stats,
      averageLatency:
        this.latencies.length > 0
          ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
          : 0,
    };
  }

  private buildRequestPayload(request: CompletionRequest): any {
    const messages = request.messages || (request.prompt ? [{ role: 'user' as const, content: request.prompt }] : []);

    return {
      model: this.config.model,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      top_p: request.topP ?? this.config.topP ?? 1,
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
      stop: request.stopSequences,
      tools: request.tools?.map((t) => ({
        type: 'function',
        function: {
          name: t.name,
          description: t.description,
          parameters: t.inputSchema,
        },
      })),
    };
  }

  private async makeRequest<T>(payload: any): Promise<T> {
    const response = await fetch(`${this.config.apiEndpoint}/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeout || 30000),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new AIProviderError(
        error.error?.type || 'API_ERROR',
        error.error?.message || 'Unknown error',
        response.status,
        undefined,
        response.status >= 500
      );
    }

    return response.json();
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      ...this.config.customHeaders,
    };
  }

  private mapResponse(response: OpenAIResponse): CompletionResponse {
    const content = response.choices[0].message.content || '';

    return {
      id: response.id,
      content,
      stopReason: this.mapStopReason(response.choices[0].finish_reason),
      usage: {
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
        totalTokens: response.usage.total_tokens,
      },
      model: response.model,
      timestamp: new Date(),
    };
  }

  private mapStopReason(reason: string): any {
    const mapping: Record<string, string> = {
      stop: 'end_turn',
      length: 'max_tokens',
      tool_calls: 'tool_use',
    };
    return mapping[reason] || reason;
  }

  private recordMetrics(usage: { prompt_tokens: number; completion_tokens: number }, latency: number): void {
    this.stats.totalRequests++;
    this.stats.totalInputTokens += usage.prompt_tokens;
    this.stats.totalOutputTokens += usage.completion_tokens;
    this.latencies.push(latency);

    if (this.latencies.length > 100) {
      this.latencies.shift();
    }
  }

  private handleError(error: unknown): AIProviderError {
    if (error instanceof AIProviderError) {
      return error;
    }

    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new AIProviderError('TIMEOUT', 'Request timeout', undefined, error, true);
      }
      return new AIProviderError('REQUEST_ERROR', error.message, undefined, error, true);
    }

    return new AIProviderError('UNKNOWN_ERROR', 'An unknown error occurred');
  }
}

// ========== Type Definitions for OpenAI API Response ==========

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}
