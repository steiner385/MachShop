/**
 * WebSocket Service for Real-Time Notifications
 *
 * Handles WebSocket connections and broadcasts notifications to connected clients
 * in real-time for approval workflows, NCR state changes, and other critical events.
 */

import WebSocket from 'ws';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { config } from '../config/config';
import { logger } from '../utils/logger';

/**
 * Message types for WebSocket communication
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
 * WebSocket message payload structure
 */
export interface WebSocketMessage {
  type: WebSocketMessageType;
  data: any;
  timestamp: string;
  id?: string;
}

/**
 * Client connection info
 */
interface ClientConnection {
  ws: WebSocket;
  userId: string;
  username: string;
  connectedAt: Date;
  subscriptions: Set<string>;
}

/**
 * WebSocket Service - Manages real-time notifications
 */
export class WebSocketService {
  private wss: WebSocket.Server | null = null;
  private clients: Map<string, ClientConnection> = new Map();
  private userSessions: Map<string, Set<string>> = new Map(); // userId -> Set of connectionIds
  private heartbeatInterval: NodeJS.Timer | null = null;

  /**
   * Initialize WebSocket server
   */
  initialize(httpServer: HTTPServer): void {
    try {
      this.wss = new WebSocket.Server({ server: httpServer, path: '/ws' });

      this.wss.on('connection', (ws: WebSocket, req) => {
        this.handleConnection(ws, req);
      });

      // Start heartbeat to keep connections alive
      this.startHeartbeat();

      logger.info('WebSocket server initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize WebSocket server', { error });
      throw error;
    }
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(ws: WebSocket, req: any): void {
    let clientId: string | null = null;
    let userId: string | null = null;

    try {
      // Extract token from query parameters
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        ws.close(4001, 'Missing authentication token');
        logger.warn('WebSocket connection rejected: missing token');
        return;
      }

      // Verify JWT token
      const decoded = jwt.verify(token, config.jwtSecret) as any;
      userId = decoded.userId;
      const username = decoded.username || decoded.email;

      clientId = `${userId}-${Date.now()}-${Math.random()}`;

      // Store client connection
      const clientConnection: ClientConnection = {
        ws,
        userId,
        username,
        connectedAt: new Date(),
        subscriptions: new Set(),
      };

      this.clients.set(clientId, clientConnection);

      // Track user sessions
      if (!this.userSessions.has(userId)) {
        this.userSessions.set(userId, new Set());
      }
      this.userSessions.get(userId)!.add(clientId);

      logger.info('WebSocket client connected', {
        clientId,
        userId,
        username,
        totalClients: this.clients.size,
      });

      // Send welcome message
      this.sendMessage(ws, {
        type: WebSocketMessageType.RECONNECT,
        data: { clientId, userId, message: 'Connected to notification service' },
        timestamp: new Date().toISOString(),
      });

      // Handle incoming messages
      ws.on('message', (data: WebSocket.Data) => {
        this.handleMessage(clientId!, data);
      });

      // Handle client disconnect
      ws.on('close', () => {
        this.handleDisconnect(clientId!);
      });

      // Handle errors
      ws.on('error', (error) => {
        logger.error('WebSocket error', { clientId, error: error.message });
      });
    } catch (error) {
      logger.error('Failed to handle WebSocket connection', { error });
      ws.close(4002, 'Authentication failed');
    }
  }

  /**
   * Handle incoming WebSocket messages
   */
  private handleMessage(clientId: string, data: WebSocket.Data): void {
    try {
      const message = JSON.parse(data.toString()) as WebSocketMessage;
      const client = this.clients.get(clientId);

      if (!client) {
        logger.warn('Received message from unknown client', { clientId });
        return;
      }

      switch (message.type) {
        case WebSocketMessageType.PING:
          this.sendMessage(client.ws, {
            type: WebSocketMessageType.PONG,
            data: { timestamp: Date.now() },
            timestamp: new Date().toISOString(),
            id: message.id,
          });
          break;

        case WebSocketMessageType.SUBSCRIBE:
          // Subscribe to specific channels (e.g., 'ncr-approvals', 'user-123-notifications')
          if (message.data.channel) {
            client.subscriptions.add(message.data.channel);
            logger.info('Client subscribed to channel', {
              clientId,
              channel: message.data.channel,
              subscriptions: Array.from(client.subscriptions),
            });
          }
          break;

        case WebSocketMessageType.UNSUBSCRIBE:
          if (message.data.channel) {
            client.subscriptions.delete(message.data.channel);
            logger.info('Client unsubscribed from channel', {
              clientId,
              channel: message.data.channel,
              subscriptions: Array.from(client.subscriptions),
            });
          }
          break;

        default:
          logger.warn('Unknown message type', {
            clientId,
            type: message.type,
          });
      }
    } catch (error) {
      logger.error('Failed to handle WebSocket message', { clientId, error });
    }
  }

  /**
   * Handle client disconnect
   */
  private handleDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);

    if (client) {
      const userId = client.userId;

      // Remove client
      this.clients.delete(clientId);

      // Remove from user sessions
      const userSessions = this.userSessions.get(userId);
      if (userSessions) {
        userSessions.delete(clientId);
        if (userSessions.size === 0) {
          this.userSessions.delete(userId);
        }
      }

      logger.info('WebSocket client disconnected', {
        clientId,
        userId,
        totalClients: this.clients.size,
      });
    }
  }

  /**
   * Broadcast notification to specific user
   */
  broadcastToUser(
    userId: string,
    notification: any,
    messageType: WebSocketMessageType = WebSocketMessageType.NOTIFICATION
  ): void {
    const clientIds = this.userSessions.get(userId);

    if (!clientIds || clientIds.size === 0) {
      logger.debug('User not connected', { userId });
      return;
    }

    const message: WebSocketMessage = {
      type: messageType,
      data: notification,
      timestamp: new Date().toISOString(),
    };

    let sentCount = 0;
    clientIds.forEach((clientId) => {
      const client = this.clients.get(clientId);
      if (client && client.ws.readyState === WebSocket.OPEN) {
        this.sendMessage(client.ws, message);
        sentCount++;
      }
    });

    logger.info('Notification broadcasted to user', {
      userId,
      sessions: clientIds.size,
      sent: sentCount,
    });
  }

  /**
   * Broadcast to all users subscribed to a channel
   */
  broadcastToChannel(
    channel: string,
    notification: any,
    messageType: WebSocketMessageType = WebSocketMessageType.NOTIFICATION
  ): void {
    let broadcastCount = 0;

    const message: WebSocketMessage = {
      type: messageType,
      data: notification,
      timestamp: new Date().toISOString(),
    };

    this.clients.forEach((client) => {
      if (
        client.subscriptions.has(channel) &&
        client.ws.readyState === WebSocket.OPEN
      ) {
        this.sendMessage(client.ws, message);
        broadcastCount++;
      }
    });

    logger.info('Message broadcasted to channel', {
      channel,
      recipients: broadcastCount,
    });
  }

  /**
   * Broadcast approval request notification
   */
  broadcastApprovalRequest(
    approvalId: string,
    approverId: string,
    ncrNumber: string,
    requestType: string,
    dueDate: Date
  ): void {
    this.broadcastToUser(
      approverId,
      {
        approvalId,
        ncrNumber,
        requestType,
        dueDate,
        message: `New approval request for ${ncrNumber} (${requestType})`,
      },
      WebSocketMessageType.APPROVAL_REQUEST
    );
  }

  /**
   * Broadcast NCR state change notification
   */
  broadcastStateChange(
    ncrId: string,
    ncrNumber: string,
    fromState: string,
    toState: string,
    changedBy: string,
    subscribedUserIds: string[]
  ): void {
    subscribedUserIds.forEach((userId) => {
      this.broadcastToUser(
        userId,
        {
          ncrId,
          ncrNumber,
          fromState,
          toState,
          changedBy,
          message: `NCR ${ncrNumber} transitioned from ${fromState} to ${toState}`,
        },
        WebSocketMessageType.STATE_CHANGE
      );
    });
  }

  /**
   * Send message to WebSocket
   */
  private sendMessage(ws: WebSocket, message: WebSocketMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Failed to send WebSocket message', { error });
      }
    }
  }

  /**
   * Start heartbeat to keep connections alive
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      let pingCount = 0;

      this.clients.forEach((client) => {
        if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
          pingCount++;
        }
      });

      logger.debug('WebSocket heartbeat sent', {
        pingCount,
        totalClients: this.clients.size,
      });
    }, 30000); // Every 30 seconds
  }

  /**
   * Get connection statistics
   */
  getStats(): {
    totalConnections: number;
    uniqueUsers: number;
    connections: Array<{ userId: string; username: string; connectedAt: string }>;
  } {
    const connections: Array<{
      userId: string;
      username: string;
      connectedAt: string;
    }> = [];

    this.clients.forEach((client) => {
      connections.push({
        userId: client.userId,
        username: client.username,
        connectedAt: client.connectedAt.toISOString(),
      });
    });

    return {
      totalConnections: this.clients.size,
      uniqueUsers: this.userSessions.size,
      connections,
    };
  }

  /**
   * Shutdown WebSocket server
   */
  shutdown(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.clients.forEach((client) => {
      client.ws.close(1000, 'Server shutting down');
    });

    if (this.wss) {
      this.wss.close(() => {
        logger.info('WebSocket server closed');
      });
    }
  }
}

// Export singleton instance
export const webSocketService = new WebSocketService();
export default webSocketService;
