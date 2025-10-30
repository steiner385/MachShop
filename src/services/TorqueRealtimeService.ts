/**
 * Torque Real-time Service
 * Handles WebSocket connections and real-time event distribution
 * Provides live updates for torque validation and sequence progress
 */

import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import {
  RealtimeTorqueEvent,
  TorqueValidationResult,
  DigitalWrenchReading,
  SequenceGuidanceState,
  TorqueError
} from '../types/torque';

export interface ClientConnection {
  id: string;
  socket: WebSocket;
  workOrderId?: string;
  operatorId?: string;
  subscribedEvents: Set<string>;
  lastActivity: Date;
  authenticated: boolean;
}

export interface RealtimeMessage {
  type: string;
  data: any;
  timestamp: Date;
  messageId: string;
  workOrderId?: string;
  operatorId?: string;
}

export interface SubscriptionFilter {
  workOrderId?: string;
  operatorId?: string;
  eventTypes?: string[];
  boltPosition?: number;
  torqueSpecId?: string;
}

export class TorqueRealtimeService extends EventEmitter {
  private wss?: WebSocketServer;
  private clients: Map<string, ClientConnection> = new Map();
  private subscriptions: Map<string, SubscriptionFilter> = new Map();
  private messageHistory: RealtimeMessage[] = [];
  private maxHistorySize = 1000;
  private heartbeatInterval?: NodeJS.Timer;

  constructor() {
    super();
    this.setupHeartbeat();
  }

  /**
   * Initialize WebSocket server
   */
  initialize(server: Server, path: string = '/torque-ws'): void {
    this.wss = new WebSocketServer({
      server,
      path,
      perMessageDeflate: false
    });

    this.wss.on('connection', (socket: WebSocket, request) => {
      this.handleConnection(socket, request);
    });

    this.wss.on('error', (error) => {
      console.error('WebSocket server error:', error);
      this.emit('server_error', error);
    });

    console.log(`Torque real-time WebSocket server initialized on path: ${path}`);
  }

  /**
   * Handle new WebSocket connection
   */
  private handleConnection(socket: WebSocket, request: any): void {
    const clientId = this.generateClientId();
    const client: ClientConnection = {
      id: clientId,
      socket,
      subscribedEvents: new Set(['connection', 'validation_result', 'sequence_update']),
      lastActivity: new Date(),
      authenticated: false
    };

    this.clients.set(clientId, client);

    // Send welcome message
    this.sendToClient(clientId, {
      type: 'connection_established',
      data: {
        clientId,
        serverTime: new Date(),
        availableEvents: this.getAvailableEventTypes()
      },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });

    // Set up event handlers
    socket.on('message', (data) => {
      this.handleClientMessage(clientId, data);
    });

    socket.on('close', () => {
      this.handleClientDisconnect(clientId);
    });

    socket.on('error', (error) => {
      console.error(`Client ${clientId} error:`, error);
      this.handleClientDisconnect(clientId);
    });

    socket.on('pong', () => {
      const client = this.clients.get(clientId);
      if (client) {
        client.lastActivity = new Date();
      }
    });

    this.emit('client_connected', { clientId, client });
    console.log(`Client ${clientId} connected`);
  }

  /**
   * Handle client message
   */
  private handleClientMessage(clientId: string, data: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    try {
      const message = JSON.parse(data.toString());

      switch (message.type) {
        case 'authenticate':
          this.handleAuthentication(clientId, message.data);
          break;

        case 'subscribe':
          this.handleSubscription(clientId, message.data);
          break;

        case 'unsubscribe':
          this.handleUnsubscription(clientId, message.data);
          break;

        case 'get_history':
          this.handleHistoryRequest(clientId, message.data);
          break;

        case 'ping':
          this.sendToClient(clientId, {
            type: 'pong',
            data: { serverTime: new Date() },
            timestamp: new Date(),
            messageId: this.generateMessageId()
          });
          break;

        default:
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: `Unknown message type: ${message.type}` },
            timestamp: new Date(),
            messageId: this.generateMessageId()
          });
      }
    } catch (error) {
      this.sendToClient(clientId, {
        type: 'error',
        data: { message: 'Invalid message format' },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });
    }
  }

  /**
   * Handle client authentication
   */
  private handleAuthentication(clientId: string, authData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    // TODO: Implement proper authentication logic
    // For now, accept any authentication with userId
    if (authData.userId && authData.workOrderId) {
      client.authenticated = true;
      client.operatorId = authData.userId;
      client.workOrderId = authData.workOrderId;

      this.sendToClient(clientId, {
        type: 'authentication_success',
        data: {
          operatorId: authData.userId,
          workOrderId: authData.workOrderId
        },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });

      console.log(`Client ${clientId} authenticated as user ${authData.userId}`);
    } else {
      this.sendToClient(clientId, {
        type: 'authentication_failed',
        data: { message: 'Invalid authentication data' },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });
    }
  }

  /**
   * Handle subscription request
   */
  private handleSubscription(clientId: string, subscriptionData: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) {
      this.sendToClient(clientId, {
        type: 'subscription_failed',
        data: { message: 'Authentication required' },
        timestamp: new Date(),
        messageId: this.generateMessageId()
      });
      return;
    }

    const filter: SubscriptionFilter = {
      workOrderId: subscriptionData.workOrderId || client.workOrderId,
      operatorId: subscriptionData.operatorId || client.operatorId,
      eventTypes: subscriptionData.eventTypes || [],
      boltPosition: subscriptionData.boltPosition,
      torqueSpecId: subscriptionData.torqueSpecId
    };

    this.subscriptions.set(clientId, filter);

    // Add event types to client subscription
    if (filter.eventTypes) {
      filter.eventTypes.forEach(eventType => {
        client.subscribedEvents.add(eventType);
      });
    }

    this.sendToClient(clientId, {
      type: 'subscription_success',
      data: {
        filter,
        subscribed: Array.from(client.subscribedEvents)
      },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });

    console.log(`Client ${clientId} subscribed with filter:`, filter);
  }

  /**
   * Handle unsubscription request
   */
  private handleUnsubscription(clientId: string, unsubscriptionData: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    if (unsubscriptionData.eventTypes) {
      unsubscriptionData.eventTypes.forEach((eventType: string) => {
        client.subscribedEvents.delete(eventType);
      });
    }

    if (unsubscriptionData.clearAll) {
      client.subscribedEvents.clear();
      this.subscriptions.delete(clientId);
    }

    this.sendToClient(clientId, {
      type: 'unsubscription_success',
      data: {
        remaining: Array.from(client.subscribedEvents)
      },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });
  }

  /**
   * Handle history request
   */
  private handleHistoryRequest(clientId: string, historyData: any): void {
    const client = this.clients.get(clientId);
    if (!client || !client.authenticated) return;

    const filter = this.subscriptions.get(clientId);
    const limit = historyData.limit || 50;

    let history = this.messageHistory.slice();

    // Apply filters
    if (filter?.workOrderId) {
      history = history.filter(msg => msg.workOrderId === filter.workOrderId);
    }

    if (filter?.operatorId) {
      history = history.filter(msg => msg.operatorId === filter.operatorId);
    }

    if (filter?.eventTypes && filter.eventTypes.length > 0) {
      history = history.filter(msg => filter.eventTypes!.includes(msg.type));
    }

    // Get recent messages
    const recentHistory = history.slice(-limit).reverse();

    this.sendToClient(clientId, {
      type: 'history_response',
      data: {
        messages: recentHistory,
        total: history.length,
        limit
      },
      timestamp: new Date(),
      messageId: this.generateMessageId()
    });
  }

  /**
   * Handle client disconnect
   */
  private handleClientDisconnect(clientId: string): void {
    const client = this.clients.get(clientId);
    if (client) {
      this.clients.delete(clientId);
      this.subscriptions.delete(clientId);
      this.emit('client_disconnected', { clientId, client });
      console.log(`Client ${clientId} disconnected`);
    }
  }

  /**
   * Broadcast torque validation result
   */
  broadcastValidationResult(
    reading: DigitalWrenchReading,
    result: TorqueValidationResult,
    workOrderId: string,
    operatorId: string,
    boltPosition: number
  ): void {
    const message: RealtimeMessage = {
      type: 'validation_result',
      data: {
        reading,
        result,
        boltPosition,
        timestamp: new Date()
      },
      timestamp: new Date(),
      messageId: this.generateMessageId(),
      workOrderId,
      operatorId
    };

    this.broadcastMessage(message);
  }

  /**
   * Broadcast sequence update
   */
  broadcastSequenceUpdate(
    guidanceState: SequenceGuidanceState,
    workOrderId: string,
    operatorId: string
  ): void {
    const message: RealtimeMessage = {
      type: 'sequence_update',
      data: guidanceState,
      timestamp: new Date(),
      messageId: this.generateMessageId(),
      workOrderId,
      operatorId
    };

    this.broadcastMessage(message);
  }

  /**
   * Broadcast error
   */
  broadcastError(
    error: TorqueError,
    workOrderId?: string,
    operatorId?: string
  ): void {
    const message: RealtimeMessage = {
      type: 'error',
      data: error,
      timestamp: new Date(),
      messageId: this.generateMessageId(),
      workOrderId,
      operatorId
    };

    this.broadcastMessage(message);
  }

  /**
   * Broadcast supervisor alert
   */
  broadcastSupervisorAlert(
    alertType: 'review_required' | 'rework_needed' | 'sequence_complete',
    data: any,
    workOrderId: string,
    operatorId: string
  ): void {
    const message: RealtimeMessage = {
      type: 'supervisor_alert',
      data: {
        alertType,
        ...data
      },
      timestamp: new Date(),
      messageId: this.generateMessageId(),
      workOrderId,
      operatorId
    };

    this.broadcastMessage(message);
  }

  /**
   * Broadcast message to matching clients
   */
  private broadcastMessage(message: RealtimeMessage): void {
    // Add to history
    this.messageHistory.push(message);
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }

    // Send to matching clients
    for (const [clientId, client] of this.clients) {
      if (this.shouldReceiveMessage(client, message)) {
        this.sendToClient(clientId, message);
      }
    }

    // Emit event for logging/monitoring
    this.emit('message_broadcast', message);
  }

  /**
   * Check if client should receive message
   */
  private shouldReceiveMessage(client: ClientConnection, message: RealtimeMessage): boolean {
    if (!client.authenticated || !client.subscribedEvents.has(message.type)) {
      return false;
    }

    const filter = this.subscriptions.get(client.id);
    if (!filter) return true;

    // Check work order filter
    if (filter.workOrderId && message.workOrderId !== filter.workOrderId) {
      return false;
    }

    // Check operator filter
    if (filter.operatorId && message.operatorId !== filter.operatorId) {
      return false;
    }

    // Check bolt position filter
    if (filter.boltPosition && message.data.boltPosition !== filter.boltPosition) {
      return false;
    }

    return true;
  }

  /**
   * Send message to specific client
   */
  private sendToClient(clientId: string, message: RealtimeMessage): void {
    const client = this.clients.get(clientId);
    if (!client || client.socket.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.socket.send(JSON.stringify(message));
    } catch (error) {
      console.error(`Failed to send message to client ${clientId}:`, error);
      this.handleClientDisconnect(clientId);
    }
  }

  /**
   * Set up heartbeat to detect dead connections
   */
  private setupHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const timeout = 60000; // 1 minute timeout

      for (const [clientId, client] of this.clients) {
        const timeSinceActivity = now.getTime() - client.lastActivity.getTime();

        if (timeSinceActivity > timeout) {
          console.log(`Client ${clientId} timed out, disconnecting`);
          this.handleClientDisconnect(clientId);
        } else {
          // Send ping
          if (client.socket.readyState === WebSocket.OPEN) {
            client.socket.ping();
          }
        }
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Get available event types
   */
  private getAvailableEventTypes(): string[] {
    return [
      'validation_result',
      'sequence_update',
      'error',
      'supervisor_alert',
      'wrench_connected',
      'wrench_disconnected',
      'session_started',
      'session_ended',
      'rework_required'
    ];
  }

  /**
   * Generate unique client ID
   */
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate unique message ID
   */
  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get connection statistics
   */
  getConnectionStats(): {
    totalClients: number;
    authenticatedClients: number;
    activeSubscriptions: number;
    messageHistorySize: number;
  } {
    const totalClients = this.clients.size;
    const authenticatedClients = Array.from(this.clients.values()).filter(c => c.authenticated).length;
    const activeSubscriptions = this.subscriptions.size;

    return {
      totalClients,
      authenticatedClients,
      activeSubscriptions,
      messageHistorySize: this.messageHistory.length
    };
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const client of this.clients.values()) {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.close();
      }
    }

    this.clients.clear();
    this.subscriptions.clear();

    if (this.wss) {
      this.wss.close();
    }
  }
}

export default TorqueRealtimeService;