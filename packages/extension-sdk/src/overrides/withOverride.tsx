/**
 * withOverride HOC and Related Components
 * Issue #428: Component Override Safety System with Fallback & Approval
 */

import React, { useEffect, useState } from 'react';
import type { ComponentOverride } from './types';
import { getOverrideRegistry } from './registry';
import { getOverrideValidator } from './validator';

/**
 * withOverride HOC - Wraps component with override support
 * If override exists, renders override component instead
 */
export function withOverride<P extends object>(
  OriginalComponent: React.ComponentType<P>,
  componentId: string,
  siteId?: string
) {
  return function OverrideComponent(props: P) {
    const registry = getOverrideRegistry();
    const [override, setOverride] = useState<ComponentOverride | undefined>(
      registry.getActiveOverride(componentId, siteId)
    );
    const [loading, setLoading] = useState(false);

    useEffect(() => {
      // Update when override changes
      const unsubscribe = registry.onOverrideEvent(event => {
        if (event.componentId === componentId) {
          const activeOverride = registry.getActiveOverride(componentId, siteId);
          setOverride(activeOverride);
        }
      });

      return () => {
        unsubscribe();
      };
    }, [componentId, siteId]);

    const ComponentToRender = override?.component || OriginalComponent;

    return (
      <div data-component-override={componentId} data-override-id={override?.id}>
        <ComponentToRender {...props} />
      </div>
    );
  };
}

/**
 * withFallback HOC - Provides fallback component if override fails
 */
export function withFallback<P extends object>(
  Component: React.ComponentType<P>,
  FallbackComponent: React.ComponentType<P>,
  componentId: string
) {
  return function FallbackWrapped(props: P) {
    const [hasError, setHasError] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const registry = getOverrideRegistry();

    // Use try-catch in render (not ideal, but for fallback)
    const ComponentToRender = hasError ? FallbackComponent : Component;

    return (
      <div
        data-fallback-component={componentId}
        data-has-error={hasError}
        onError={(e: any) => {
          setHasError(true);
          setError(e);
          registry.recordError(`override-${componentId}`, e);
        }}
      >
        <ComponentToRender {...props} />
      </div>
    );
  };
}

/**
 * OverrideErrorBoundary - Error boundary for overrides
 */
interface OverrideErrorBoundaryProps {
  children: React.ReactNode;
  componentId: string;
  overrideId?: string;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface OverrideErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class OverrideErrorBoundary extends React.Component<
  OverrideErrorBoundaryProps,
  OverrideErrorBoundaryState
> {
  constructor(props: OverrideErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    const registry = getOverrideRegistry();

    // Record error in registry if we have override ID
    if (this.props.overrideId) {
      registry.recordError(this.props.overrideId, {
        message: error.message,
        code: 'RENDER_ERROR',
        details: errorInfo,
        stack: error.stack,
      });
    }

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // Log error
    console.error(`Override error in ${this.props.componentId}:`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          data-override-error={this.props.componentId}
          data-override-id={this.props.overrideId}
          style={{
            padding: '1rem',
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '0.25rem',
            color: '#721c24',
          }}
        >
          {this.props.fallback || (
            <div>
              <strong>Component Override Error</strong>
              <p>Error in {this.props.componentId}</p>
              <details style={{ marginTop: '0.5rem', fontSize: '0.875rem' }}>
                <summary>Details</summary>
                <pre style={{ marginTop: '0.5rem', overflow: 'auto' }}>
                  {this.state.error?.message}
                </pre>
              </details>
            </div>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to manage override state and metrics
 */
export function useComponentOverride(componentId: string, siteId?: string) {
  const registry = getOverrideRegistry();
  const validator = getOverrideValidator();
  const [override, setOverride] = useState<ComponentOverride | undefined>(
    registry.getActiveOverride(componentId, siteId)
  );
  const [metrics, setMetrics] = useState(override?.metrics);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const unsubscribe = registry.onOverrideEvent(event => {
      if (event.componentId === componentId) {
        const activeOverride = registry.getActiveOverride(componentId, siteId);
        setOverride(activeOverride);
        if (activeOverride?.metrics) {
          setMetrics(activeOverride.metrics);
        }
      }
    });

    return () => {
      unsubscribe();
    };
  }, [componentId, siteId]);

  const activateOverride = async (overrideId: string) => {
    setLoading(true);
    try {
      await registry.activateOverride(overrideId);
      const newOverride = registry.getActiveOverride(componentId, siteId);
      setOverride(newOverride);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const deactivateOverride = async (overrideId: string) => {
    setLoading(true);
    try {
      await registry.deactivateOverride(overrideId);
      setOverride(undefined);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  const rollback = async (overrideId: string, reason: string) => {
    setLoading(true);
    try {
      await registry.rollback(overrideId, reason, 'user');
      setOverride(undefined);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  return {
    override,
    metrics,
    loading,
    error,
    activateOverride,
    deactivateOverride,
    rollback,
  };
}

/**
 * Component for displaying override metrics
 */
interface OverrideMetricsProps {
  override: ComponentOverride;
  showDetails?: boolean;
}

export function OverrideMetrics({ override, showDetails = false }: OverrideMetricsProps) {
  const metrics = override.metrics;

  if (!metrics) {
    return <div>No metrics available</div>;
  }

  const performanceImpact = metrics.loadTimeMs - (metrics.originalLoadTimeMs || 0);
  const performanceClass =
    performanceImpact < 0
      ? 'positive'
      : performanceImpact > 100
        ? 'negative'
        : 'neutral';

  return (
    <div
      data-override-metrics={override.id}
      style={{
        padding: '1rem',
        backgroundColor: '#f9f9f9',
        border: '1px solid #ddd',
        borderRadius: '0.25rem',
        fontSize: '0.875rem',
      }}
    >
      <h4 style={{ marginTop: 0 }}>Override Metrics</h4>

      <dl style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
        <dt>Error Rate:</dt>
        <dd style={{ color: metrics.errorRate > 0.05 ? 'red' : 'green' }}>
          {(metrics.errorRate * 100).toFixed(2)}%
        </dd>

        <dt>Accessibility Score:</dt>
        <dd style={{ color: metrics.a11yScore >= 80 ? 'green' : 'orange' }}>
          {metrics.a11yScore}/100
        </dd>

        <dt>Test Coverage:</dt>
        <dd style={{ color: metrics.testCoverage >= 80 ? 'green' : 'orange' }}>
          {metrics.testCoverage}%
        </dd>

        <dt>Load Time:</dt>
        <dd className={performanceClass}>
          {metrics.loadTimeMs}ms
          {performanceImpact !== 0 && ` (${performanceImpact > 0 ? '+' : ''}${performanceImpact}ms)`}
        </dd>

        {showDetails && (
          <>
            <dt>Renders:</dt>
            <dd>{metrics.renderCount}</dd>

            <dt>Failed Renders:</dt>
            <dd style={{ color: metrics.failedRenderCount > 0 ? 'orange' : 'green' }}>
              {metrics.failedRenderCount}
            </dd>

            <dt>Avg Render Time:</dt>
            <dd>{metrics.avgRenderTimeMs}ms</dd>
          </>
        )}
      </dl>
    </div>
  );
}
