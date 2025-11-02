/**
 * Claude AI Provider Adapter
 * Implementation of AIProvider for Anthropic's Claude
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
  StopReason,
  ContentBlock,
} from './AIProvider';

export class ClaudeAdapter implements AIProvider {
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
      apiEndpoint: config.apiEndpoint || 'https://api.anthropic.com/v1',
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

    if (this.config.maxTokens < 1 || this.config.maxTokens > 200000) {
      errors.push('maxTokens must be between 1 and 200000');
    }

    if (this.config.temperature < 0 || this.config.temperature > 1) {
      errors.push('temperature must be between 0 and 1');
    }

    // Model availability warnings
    const validModels = ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'];
    if (!validModels.includes(this.config.model)) {
      warnings.push(`Model ${this.config.model} may not be available in Claude API`);
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
      const response = await this.makeRequest<ClaudeResponse>(payload);
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

      const fetchResponse = await fetch(`${this.config.apiEndpoint}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(payload),
      });

      if (!fetchResponse.ok) {
        throw new AIProviderError(
          'STREAMING_ERROR',
          `HTTP ${fetchResponse.status}`,
          fetchResponse.status,
          undefined,
          fetchResponse.status >= 500
        );
      }

      const reader = fetchResponse.body?.getReader();
      if (!reader) {
        throw new AIProviderError('STREAM_ERROR', 'Failed to get response reader');
      }

      const decoder = new TextDecoder();
      let buffer = '';

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
            yield this.mapStreamChunk(event);
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
    // Claude doesn't have a direct token counting API, estimate roughly
    // 1 token ≈ 4 characters for English text
    return Math.ceil(text.length / 4);
  }

  async estimateCost(inputTokens: number, outputTokens: number): Promise<number> {
    // Pricing for Claude 3 (as of training data cutoff)
    // Adjust these based on actual pricing
    const costPerMillion = {
      'claude-3-opus-20240229': { input: 15, output: 75 },
      'claude-3-sonnet-20240229': { input: 3, output: 15 },
      'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
    };

    const pricing = costPerMillion[this.config.model as keyof typeof costPerMillion] || {
      input: 0.003,
      output: 0.015,
    };

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
    const messages = request.messages || (request.prompt ? [{ role: 'user', content: request.prompt }] : []);

    return {
      model: this.config.model,
      max_tokens: request.maxTokens || this.config.maxTokens,
      temperature: request.temperature ?? this.config.temperature,
      system: request.systemPrompt,
      messages: messages.map((m) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : m.content,
      })),
      stop_sequences: request.stopSequences,
      tools: request.tools?.map((t) => ({
        name: t.name,
        description: t.description,
        input_schema: t.inputSchema,
      })),
    };
  }

  private async makeRequest<T>(payload: any): Promise<T> {
    const response = await fetch(`${this.config.apiEndpoint}/messages`, {
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
      'x-api-key': this.config.apiKey!,
      'anthropic-version': '2023-06-01',
      ...this.config.customHeaders,
    };
  }

  private mapResponse(response: ClaudeResponse): CompletionResponse {
    const content = response.content
      .filter((c) => c.type === 'text')
      .map((c) => (c as any).text)
      .join('');

    return {
      id: response.id,
      content,
      contentBlocks: response.content as ContentBlock[],
      stopReason: response.stop_reason as StopReason,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      },
      model: response.model,
      timestamp: new Date(),
    };
  }

  private mapStreamChunk(event: any): StreamChunk {
    return {
      id: event.message?.id || event.content_block?.id || '',
      type: event.type,
      timestamp: new Date(),
      delta: event.delta,
      message: event.message ? this.mapResponse(event.message) : undefined,
    };
  }

  private recordMetrics(usage: { input_tokens: number; output_tokens: number }, latency: number): void {
    this.stats.totalRequests++;
    this.stats.totalInputTokens += usage.input_tokens;
    this.stats.totalOutputTokens += usage.output_tokens;
    this.latencies.push(latency);

    // Keep only last 100 latencies
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

// ========== Type Definitions for Claude API Response ==========

interface ClaudeResponse {
  id: string;
  type: string;
  role: string;
  content: any[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}
