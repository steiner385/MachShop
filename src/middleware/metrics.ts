/**
 * Prometheus Metrics Middleware
 * Provides metrics collection for the MES application
 * Phase 2, Task 2.2: Service Instrumentation
 */

import { Request, Response, NextFunction, Express } from 'express';
import promClient from 'prom-client';

// Create a Registry to register the metrics
export const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({
  register,
  prefix: 'mes_',
});

// Custom metrics
export const httpRequestDuration = new promClient.Histogram({
  name: 'mes_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [register],
});

export const httpRequestTotal = new promClient.Counter({
  name: 'mes_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

export const activeRequests = new promClient.Gauge({
  name: 'mes_http_active_requests',
  help: 'Number of active HTTP requests',
  labelNames: ['method', 'route'],
  registers: [register],
});

export const databaseQueryDuration = new promClient.Histogram({
  name: 'mes_database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

export const databaseErrors = new promClient.Counter({
  name: 'mes_database_errors_total',
  help: 'Total number of database errors',
  labelNames: ['operation', 'table', 'error_type'],
  registers: [register],
});

export const businessMetrics = {
  workOrdersCreated: new promClient.Counter({
    name: 'mes_work_orders_created_total',
    help: 'Total number of work orders created',
    labelNames: ['status'],
    registers: [register],
  }),
  qualityInspections: new promClient.Counter({
    name: 'mes_quality_inspections_total',
    help: 'Total number of quality inspections',
    labelNames: ['result'],
    registers: [register],
  }),
  materialTransactions: new promClient.Counter({
    name: 'mes_material_transactions_total',
    help: 'Total number of material transactions',
    labelNames: ['type'],
    registers: [register],
  }),
  serialNumbersGenerated: new promClient.Counter({
    name: 'mes_serial_numbers_generated_total',
    help: 'Total number of serial numbers generated',
    registers: [register],
  }),
};

/**
 * Middleware to track HTTP request metrics
 */
export function metricsMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();
  const route = req.route?.path || req.path;
  const method = req.method;

  // Increment active requests
  activeRequests.inc({ method, route });

  // Track request completion
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const statusCode = res.statusCode.toString();

    // Record metrics
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration);
    httpRequestTotal.inc({ method, route, status_code: statusCode });
    activeRequests.dec({ method, route });
  });

  next();
}

/**
 * Setup metrics endpoint
 */
export function setupMetricsEndpoint(app: Express): void {
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      const metrics = await register.metrics();
      res.end(metrics);
    } catch (error) {
      res.status(500).end(error);
    }
  });

  app.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      service: process.env.SERVICE_NAME || 'mes-monolith',
    });
  });
}

/**
 * Helper function to track database operations
 */
export function trackDatabaseQuery<T>(
  operation: string,
  table: string,
  queryFn: () => Promise<T>
): Promise<T> {
  const start = Date.now();

  return queryFn()
    .then((result) => {
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation, table }, duration);
      return result;
    })
    .catch((error) => {
      const duration = (Date.now() - start) / 1000;
      databaseQueryDuration.observe({ operation, table }, duration);
      databaseErrors.inc({ operation, table, error_type: error.name || 'Unknown' });
      throw error;
    });
}

export default {
  register,
  metricsMiddleware,
  setupMetricsEndpoint,
  trackDatabaseQuery,
  businessMetrics,
};
