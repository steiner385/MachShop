/**
 * Custom Hook: useRealtimeUpdates
 * Provides WebSocket-based real-time updates for dispatcher dashboard
 * Phase 7: Forklift Dispatcher Dashboard
 */

import { useEffect, useRef, useState, useCallback } from 'react';

export interface RealtimeEvent<T = any> {
  type: 'movement' | 'forklift' | 'operator' | 'metrics';
  action: 'create' | 'update' | 'delete';
  data: T;
  timestamp: Date;
}

export interface UseRealtimeOptions {
  url?: string;
  reconnectDelay?: number;
  maxReconnectAttempts?: number;
  onError?: (error: Error) => void;
}

/**
 * Custom hook for WebSocket real-time updates
 */
export const useRealtimeUpdates = <T = any>(options: UseRealtimeOptions = {}) => {
  const {
    url = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/api/realtime`,
    reconnectDelay = 3000,
    maxReconnectAttempts = 5,
    onError,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<RealtimeEvent<T> | null>(null);
  const [connectionAttempt, setConnectionAttempt] = useState(0);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<Map<string, ((event: RealtimeEvent<T>) => void)[]>>(new Map());

  /**
   * Connect to WebSocket
   */
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[Realtime] Connected');
        setIsConnected(true);
        setConnectionAttempt(0);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data) as RealtimeEvent<T>;
          message.timestamp = new Date(message.timestamp);

          setLastEvent(message);

          // Trigger handlers for this event type
          const handlers = handlersRef.current.get(message.type) || [];
          handlers.forEach((handler) => handler(message));

          // Trigger wildcard handlers
          const wildcardHandlers = handlersRef.current.get('*') || [];
          wildcardHandlers.forEach((handler) => handler(message));
        } catch (error) {
          console.error('[Realtime] Failed to parse message:', error);
        }
      };

      ws.onerror = (event) => {
        const error = new Error('WebSocket connection error');
        console.error('[Realtime] Connection error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('[Realtime] Disconnected');
        setIsConnected(false);
        attemptReconnect();
      };

      wsRef.current = ws;
    } catch (error) {
      const wsError = error instanceof Error ? error : new Error('Failed to connect');
      console.error('[Realtime] Connection failed:', wsError);
      onError?.(wsError);
      attemptReconnect();
    }
  }, [url, onError]);

  /**
   * Attempt to reconnect with exponential backoff
   */
  const attemptReconnect = useCallback(() => {
    if (connectionAttempt >= maxReconnectAttempts) {
      console.warn('[Realtime] Max reconnection attempts reached');
      return;
    }

    const delay = reconnectDelay * Math.pow(2, connectionAttempt);
    console.log(`[Realtime] Reconnecting in ${delay}ms...`);

    reconnectTimeoutRef.current = setTimeout(() => {
      setConnectionAttempt((prev) => prev + 1);
      connect();
    }, delay);
  }, [connectionAttempt, maxReconnectAttempts, reconnectDelay, connect]);

  /**
   * Send message to server
   */
  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[Realtime] WebSocket not connected');
    }
  }, []);

  /**
   * Subscribe to events
   */
  const subscribe = useCallback((eventType: string, handler: (event: RealtimeEvent<T>) => void) => {
    const handlers = handlersRef.current.get(eventType) || [];
    handlers.push(handler);
    handlersRef.current.set(eventType, handlers);

    // Return unsubscribe function
    return () => {
      const updated = handlers.filter((h) => h !== handler);
      handlersRef.current.set(eventType, updated);
    };
  }, []);

  /**
   * Unsubscribe from all handlers
   */
  const unsubscribeAll = useCallback(() => {
    handlersRef.current.clear();
  }, []);

  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setIsConnected(false);
    unsubscribeAll();
  }, [unsubscribeAll]);

  /**
   * Connect on mount
   */
  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastEvent,
    send,
    subscribe,
    unsubscribeAll,
    disconnect,
    reconnect: connect,
  };
};

export default useRealtimeUpdates;
