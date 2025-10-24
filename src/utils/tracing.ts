/**
 * OpenTelemetry Tracing Configuration
 * Distributed tracing for MES application with Jaeger integration
 * Phase 2, Task 2.2: Service Instrumentation
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';

// Get service name from environment or default
const serviceName = process.env.SERVICE_NAME || 'mes-monolith';
const environment = process.env.NODE_ENV || 'development';
const serviceVersion = process.env.APP_VERSION || '1.0.0';

// Jaeger configuration
const jaegerHost = process.env.JAEGER_HOST || 'localhost';
const jaegerPort = parseInt(process.env.JAEGER_PORT || '6832', 10);

// Create Jaeger exporter
const jaegerExporter = new JaegerExporter({
  host: jaegerHost,
  port: jaegerPort,
  // Alternative: Use HTTP endpoint
  // endpoint: `http://${jaegerHost}:14268/api/traces`,
});

// Create span processor
const spanProcessor = new BatchSpanProcessor(jaegerExporter);

// Create resource with service information
const resource = resourceFromAttributes({
  [SemanticResourceAttributes.SERVICE_NAME]: serviceName,
  [SemanticResourceAttributes.SERVICE_VERSION]: serviceVersion,
  [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: environment,
});

// Create and configure the SDK
const sdk = new NodeSDK({
  resource,
  spanProcessor,
  instrumentations: [
    getNodeAutoInstrumentations({
      // Customize auto-instrumentation
      '@opentelemetry/instrumentation-http': {
        enabled: true,
        requestHook: (span, request) => {
          // Add custom attributes to HTTP spans
          span.setAttribute('http.request_id', ((request as any).headers || {})['x-request-id'] || '');
        },
      },
      '@opentelemetry/instrumentation-express': {
        enabled: true,
      },
      '@opentelemetry/instrumentation-pg': {
        enabled: true,
        enhancedDatabaseReporting: true,
      },
      '@opentelemetry/instrumentation-redis': {
        enabled: true,
      },
    }),
  ],
});

/**
 * Initialize OpenTelemetry tracing
 * Call this before starting your application
 */
export function initializeTracing(): void {
  try {
    if (process.env.ENABLE_TRACING !== 'false') {
      sdk.start();
      console.log('OpenTelemetry tracing initialized');
      console.log(`  Service: ${serviceName}`);
      console.log(`  Jaeger: ${jaegerHost}:${jaegerPort}`);
      console.log(`  Environment: ${environment}`);
    } else {
      console.log('OpenTelemetry tracing disabled (ENABLE_TRACING=false)');
    }
  } catch (error) {
    console.error('Failed to initialize OpenTelemetry tracing:', error);
  }
}

/**
 * Shutdown tracing gracefully
 * Call this during application shutdown
 */
export async function shutdownTracing(): Promise<void> {
  try {
    await sdk.shutdown();
    console.log('OpenTelemetry tracing shutdown complete');
  } catch (error) {
    console.error('Error shutting down OpenTelemetry tracing:', error);
  }
}

// Handle graceful shutdown on process termination
process.on('SIGTERM', async () => {
  await shutdownTracing();
  process.exit(0);
});

export default {
  initializeTracing,
  shutdownTracing,
};
