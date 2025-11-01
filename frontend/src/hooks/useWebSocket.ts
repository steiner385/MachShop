/**
 * useWebSocket Hook for Real-Time Notifications
 *
 * Provides a custom React hook for managing WebSocket connections
 * and receiving real-time notifications from the backend.
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useAuthStore } from '@/store/AuthStore';

/**
 * Message types matching backend WebSocketMessageType enum
 */
export enum WebSocketMessageType {
  NOTIFICATION = 'NOTIFICATION',
  APPROVAL_REQUEST = 'APPROVAL_REQUEST',
  STATE_CHANGE = 'STATE_CHANGE',
  ERROR = 'ERROR',
  PING = 'PING',
  PONG = 'PONG',
  SUBSCRIBE = 'SUBSCRIBE',
  UNSUBSCRIBE = 'UNSUBSCRIBE',
  RECONNECT = 'RECONNECT',
}

/**
 * WebSocket message structure
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: string;
  id?: string;
}

/**
 * Hook configuration options
 */
export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  subscribedChannels?: string[];
}

/**
 * Hook return type
 */
export interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: Omit<WebSocketMessage, 'timestamp'>) => void;
  subscribe: (channel: string) => void;
  unsubscribe: (channel: string) => void;
  disconnect: () => void;
  reconnect: () => void;
  lastMessage: WebSocketMessage | null;
}

/**
 * Custom hook for WebSocket connections
 */
export const useWebSocket = (
  options: UseWebSocketOptions = {}
): UseWebSocketReturn => {
  const {
    autoConnect = true,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    subscribedChannels = [],
  } = options;

  const { token, user } = useAuthStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!token || !user) {
      console.warn('Cannot connect WebSocket: user not authenticated');
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.debug('WebSocket already connected');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws?token=${token}`;

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        reconnectAttemptsRef.current = 0;

        // Subscribe to configured channels
        subscribedChannels.forEach((channel) => {
          ws.send(
            JSON.stringify({
              type: WebSocketMessageType.SUBSCRIBE,
              data: { channel },
              timestamp: new Date().toISOString(),
            })
          );
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          console.debug('WebSocket message received', message);
        } catch (error) {
          console.error('Failed to parse WebSocket message', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error', error);
        setIsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);

        // Attempt to reconnect
        if (
          reconnectAttemptsRef.current < maxReconnectAttempts &&
          autoConnect
        ) {
          reconnectAttemptsRef.current++;
          console.log(
            `Attempting to reconnect... (${reconnectAttemptsRef.current}/${maxReconnectAttempts})`
          );

          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to create WebSocket connection', error);
      setIsConnected(false);
    }
  }, [token, user, autoConnect, reconnectInterval, maxReconnectAttempts, subscribedChannels]);

  /**
   * Disconnect from WebSocket server
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
  }, []);

  /**
   * Reconnect to WebSocket server
   */
  const reconnect = useCallback(() => {
    reconnectAttemptsRef.current = 0;
    disconnect();
    connect();
  }, [connect, disconnect]);

  /**
   * Send message via WebSocket
   */
  const sendMessage = useCallback(
    (message: Omit<WebSocketMessage, 'timestamp'>) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        console.warn('WebSocket not connected, cannot send message');
        return;
      }

      try {
        wsRef.current.send(
          JSON.stringify({
            ...message,
            timestamp: new Date().toISOString(),
          })
        );
      } catch (error) {
        console.error('Failed to send WebSocket message', error);
      }
    },
    []
  );

  /**
   * Subscribe to a channel
   */
  const subscribe = useCallback((channel: string) => {
    sendMessage({
      type: WebSocketMessageType.SUBSCRIBE,
      data: { channel },
      id: `sub-${Date.now()}`,
    });
  }, [sendMessage]);

  /**
   * Unsubscribe from a channel
   */
  const unsubscribe = useCallback((channel: string) => {
    sendMessage({
      type: WebSocketMessageType.UNSUBSCRIBE,
      data: { channel },
      id: `unsub-${Date.now()}`,
    });
  }, [sendMessage]);

  /**
   * Setup and cleanup
   */
  useEffect(() => {
    if (autoConnect && token && user) {
      connect();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
    };
  }, [autoConnect, token, user, connect]);

  return {
    isConnected,
    sendMessage,
    subscribe,
    unsubscribe,
    disconnect,
    reconnect,
    lastMessage,
  };
};

export default useWebSocket;
