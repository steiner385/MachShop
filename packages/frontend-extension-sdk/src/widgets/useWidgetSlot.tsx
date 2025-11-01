/**
 * useWidgetSlot Hook
 *
 * Provides utilities for widgets to register themselves and access slot information.
 * Integrates with the UIExtensionRegistry for dynamic widget loading.
 *
 * @module frontend-extension-sdk/widgets/useWidgetSlot
 */

import * as React from 'react';
import { useExtensionContext } from '../context';

/**
 * Widget slot information
 */
export interface WidgetSlotInfo {
  /**
   * Slot identifier
   */
  slotId: string;

  /**
   * All widgets registered for this slot
   */
  widgets: any[]; // RegisteredWidget[]

  /**
   * Number of widgets in this slot
   */
  count: number;

  /**
   * Whether slot has any widgets
   */
  isEmpty: boolean;

  /**
   * Widgets ordered by registration order
   */
  orderedWidgets: any[];
}

/**
 * Hook to access widget slot information
 *
 * @param slotId - The slot ID to get information for
 * @returns Slot information and utilities
 *
 * @example
 * ```typescript
 * const { widgets, isEmpty } = useWidgetSlot('dashboard-widgets');
 * return isEmpty ? <EmptyState /> : <WidgetList widgets={widgets} />;
 * ```
 */
export function useWidgetSlot(slotId: string): WidgetSlotInfo {
  const context = useExtensionContext();
  const [widgets, setWidgets] = React.useState<any[]>([]);

  // Load widgets from registry
  React.useEffect(() => {
    if (context.registry) {
      const slotWidgets = context.registry
        .getWidgetRegistry()
        .getWidgetsForSlot(slotId, context.siteId);

      setWidgets(slotWidgets);
    }
  }, [context.registry, slotId, context.siteId]);

  return {
    slotId,
    widgets,
    count: widgets.length,
    isEmpty: widgets.length === 0,
    orderedWidgets: [...widgets].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)),
  };
}

/**
 * Hook to register a widget
 *
 * @param widget - Widget to register
 * @returns Whether registration was successful
 *
 * @example
 * ```typescript
 * const success = useRegisterWidget({
 *   id: 'my-extension:dashboard-widget',
 *   extensionId: 'my-extension',
 *   slot: 'dashboard-widgets',
 *   component: MyWidget,
 * });
 * ```
 */
export function useRegisterWidget(widget: any): boolean {
  // RegisteredWidget
  const context = useExtensionContext();
  const [registered, setRegistered] = React.useState(false);

  React.useEffect(() => {
    if (context.registry) {
      try {
        context.registry.getWidgetRegistry().registerWidget(widget);
        setRegistered(true);
      } catch (error) {
        context.logger.error('Failed to register widget', error);
        setRegistered(false);
      }
    }
  }, [context.registry, widget, context.logger]);

  return registered;
}

/**
 * Hook to get a single widget by ID
 *
 * @param widgetId - ID of widget to retrieve
 * @returns The widget or undefined
 */
export function useWidget(widgetId: string): any | undefined {
  // RegisteredWidget
  const context = useExtensionContext();
  const [widget, setWidget] = React.useState<any | undefined>(undefined);

  React.useEffect(() => {
    if (context.registry) {
      const w = context.registry.getWidgetRegistry().getWidget(widgetId);
      setWidget(w);
    }
  }, [context.registry, widgetId]);

  return widget;
}

/**
 * Hook to get all widgets from an extension
 *
 * @param extensionId - Extension ID to get widgets for
 * @returns Array of widgets
 */
export function useExtensionWidgets(extensionId: string): any[] {
  // RegisteredWidget[]
  const context = useExtensionContext();
  const [widgets, setWidgets] = React.useState<any[]>([]);

  React.useEffect(() => {
    if (context.registry) {
      const w = context.registry
        .getWidgetRegistry()
        .getExtensionWidgets(extensionId);
      setWidgets(w);
    }
  }, [context.registry, extensionId]);

  return widgets;
}

/**
 * Component to render widgets for a slot
 */
export function WidgetSlotRenderer({
  slot: slotId,
  emptyState,
  errorFallback,
  loading,
}: {
  slot: string;
  emptyState?: React.ReactElement;
  errorFallback?: React.ComponentType<{ error: Error }>;
  loading?: React.ReactElement;
}): React.ReactElement {
  const { widgets, isEmpty } = useWidgetSlot(slotId);
  const [errors, setErrors] = React.useState<Record<string, Error>>({});

  if (isEmpty) {
    return emptyState || <div>No widgets available</div>;
  }

  return (
    <div className="widget-slot">
      {widgets.map((widget) => {
        const error = errors[widget.id];

        if (error && errorFallback) {
          const ErrorComponent = errorFallback;
          return <ErrorComponent key={widget.id} error={error} />;
        }

        return (
          <React.Suspense
            key={widget.id}
            fallback={loading || <div>Loading...</div>}
          >
            <widget.component />
          </React.Suspense>
        );
      })}
    </div>
  );
}

/**
 * Lazy load a widget with error handling
 */
export function withWidgetErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: React.ReactElement
): React.FC<P> {
  return function WidgetErrorBoundary(props: P) {
    const [error, setError] = React.useState<Error | null>(null);

    React.useEffect(() => {
      const errorHandler = (event: ErrorEvent) => {
        setError(event.error);
      };

      window.addEventListener('error', errorHandler);
      return () => window.removeEventListener('error', errorHandler);
    }, []);

    if (error) {
      return fallback || <div>Widget Error: {error.message}</div>;
    }

    try {
      return <Component {...props} />;
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      return fallback || <div>Widget Error</div>;
    }
  };
}
