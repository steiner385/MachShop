import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { TorqueRealtimeService } from '@/services/TorqueRealtimeService';
import {
  TorqueRealtimeClient,
  TorqueRealtimeMessage,
  TorqueEvent,
  TorqueStatus,
  TorqueValidationResult,
  ValidationSeverity
} from '@/types/torque';

// Mock WebSocket
class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      this.onopen?.(new Event('open'));
    }, 10);
  }

  send(data: string) {
    // Mock successful send
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    this.onclose?.(new CloseEvent('close'));
  }

  // Helper method to simulate receiving a message
  simulateMessage(data: any) {
    if (this.readyState === MockWebSocket.OPEN) {
      this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(data) }));
    }
  }

  // Helper method to simulate connection error
  simulateError() {
    this.onerror?.(new Event('error'));
  }
}

// Mock the global WebSocket
global.WebSocket = MockWebSocket as any;

describe('TorqueRealtimeService', () => {
  let realtimeService: TorqueRealtimeService;

  beforeEach(() => {
    realtimeService = new TorqueRealtimeService();
    vi.clearAllMocks();
  });

  afterEach(() => {
    realtimeService.stop();
  });

  describe('Service Lifecycle', () => {
    it('should start service successfully', async () => {
      const result = await realtimeService.start(8080);

      expect(result).toBe(true);
      expect(realtimeService.isRunning()).toBe(true);
    });

    it('should stop service successfully', async () => {
      await realtimeService.start(8080);
      const result = await realtimeService.stop();

      expect(result).toBe(true);
      expect(realtimeService.isRunning()).toBe(false);
    });

    it('should not start service twice', async () => {
      await realtimeService.start(8080);

      await expect(
        realtimeService.start(8080)
      ).rejects.toThrow('Realtime service is already running');
    });

    it('should handle stop when service is not running', async () => {
      const result = await realtimeService.stop();

      expect(result).toBe(true); // Should succeed even if not running
    });
  });

  describe('Client Connection Management', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);
    });

    it('should add client successfully', () => {
      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events', 'validation-results'],
        isActive: true
      };

      const result = realtimeService.addClient(client);

      expect(result).toBe(true);
      expect(realtimeService.getClients()).toHaveLength(1);
      expect(realtimeService.getClient('client-001')).toEqual(client);
    });

    it('should reject duplicate client IDs', () => {
      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);

      expect(() => realtimeService.addClient(client))
        .toThrow('Client with ID client-001 already exists');
    });

    it('should remove client successfully', () => {
      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);
      const result = realtimeService.removeClient('client-001');

      expect(result).toBe(true);
      expect(realtimeService.getClients()).toHaveLength(0);
    });

    it('should return false when removing non-existent client', () => {
      const result = realtimeService.removeClient('non-existent');

      expect(result).toBe(false);
    });

    it('should get clients by session ID', () => {
      const client1: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      const client2: TorqueRealtimeClient = {
        id: 'client-002',
        sessionId: 'session-123',
        userId: 'user-789',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['validation-results'],
        isActive: true
      };

      const client3: TorqueRealtimeClient = {
        id: 'client-003',
        sessionId: 'session-456',
        userId: 'user-999',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client1);
      realtimeService.addClient(client2);
      realtimeService.addClient(client3);

      const sessionClients = realtimeService.getClientsBySession('session-123');

      expect(sessionClients).toHaveLength(2);
      expect(sessionClients.map(c => c.id)).toContain('client-001');
      expect(sessionClients.map(c => c.id)).toContain('client-002');
      expect(sessionClients.map(c => c.id)).not.toContain('client-003');
    });

    it('should get clients by user ID', () => {
      const client1: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      const client2: TorqueRealtimeClient = {
        id: 'client-002',
        sessionId: 'session-456',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['validation-results'],
        isActive: true
      };

      realtimeService.addClient(client1);
      realtimeService.addClient(client2);

      const userClients = realtimeService.getClientsByUser('user-456');

      expect(userClients).toHaveLength(2);
      expect(userClients.map(c => c.id)).toContain('client-001');
      expect(userClients.map(c => c.id)).toContain('client-002');
    });
  });

  describe('Message Broadcasting', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);

      // Add test clients
      const clients: TorqueRealtimeClient[] = [
        {
          id: 'client-001',
          sessionId: 'session-123',
          userId: 'user-456',
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['torque-events', 'validation-results'],
          isActive: true
        },
        {
          id: 'client-002',
          sessionId: 'session-123',
          userId: 'user-789',
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['torque-events'],
          isActive: true
        },
        {
          id: 'client-003',
          sessionId: 'session-456',
          userId: 'user-999',
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['validation-results'],
          isActive: true
        }
      ];

      clients.forEach(client => realtimeService.addClient(client));
    });

    it('should broadcast message to all clients', () => {
      const broadcastSpy = vi.spyOn(realtimeService, 'sendToClient');

      const message: TorqueRealtimeMessage = {
        type: 'TORQUE_EVENT',
        payload: {
          sessionId: 'session-123',
          event: 'test-event'
        },
        timestamp: new Date()
      };

      realtimeService.broadcast(message);

      expect(broadcastSpy).toHaveBeenCalledTimes(3);
      expect(broadcastSpy).toHaveBeenCalledWith('client-001', message);
      expect(broadcastSpy).toHaveBeenCalledWith('client-002', message);
      expect(broadcastSpy).toHaveBeenCalledWith('client-003', message);
    });

    it('should broadcast message to session clients only', () => {
      const broadcastSpy = vi.spyOn(realtimeService, 'sendToClient');

      const message: TorqueRealtimeMessage = {
        type: 'TORQUE_EVENT',
        payload: {
          sessionId: 'session-123',
          event: 'session-specific-event'
        },
        timestamp: new Date()
      };

      realtimeService.broadcastToSession('session-123', message);

      expect(broadcastSpy).toHaveBeenCalledTimes(2);
      expect(broadcastSpy).toHaveBeenCalledWith('client-001', message);
      expect(broadcastSpy).toHaveBeenCalledWith('client-002', message);
      expect(broadcastSpy).not.toHaveBeenCalledWith('client-003', message);
    });

    it('should broadcast message to user clients only', () => {
      const broadcastSpy = vi.spyOn(realtimeService, 'sendToClient');

      const message: TorqueRealtimeMessage = {
        type: 'VALIDATION_RESULT',
        payload: {
          userId: 'user-456',
          result: 'user-specific-result'
        },
        timestamp: new Date()
      };

      realtimeService.broadcastToUser('user-456', message);

      expect(broadcastSpy).toHaveBeenCalledTimes(2);
      expect(broadcastSpy).toHaveBeenCalledWith('client-001', message);
      expect(broadcastSpy).toHaveBeenCalledWith('client-002', message);
      expect(broadcastSpy).not.toHaveBeenCalledWith('client-003', message);
    });

    it('should send message to specific client', () => {
      const mockWs = { send: vi.fn(), readyState: MockWebSocket.OPEN };
      realtimeService['clientConnections'].set('client-001', mockWs as any);

      const message: TorqueRealtimeMessage = {
        type: 'DIRECT_MESSAGE',
        payload: {
          content: 'Direct message content'
        },
        timestamp: new Date()
      };

      realtimeService.sendToClient('client-001', message);

      expect(mockWs.send).toHaveBeenCalledOnce();
      expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify(message));
    });

    it('should handle message filtering by subscription', () => {
      const broadcastSpy = vi.spyOn(realtimeService, 'sendToClient');

      const torqueMessage: TorqueRealtimeMessage = {
        type: 'TORQUE_EVENT',
        payload: { event: 'torque-event' },
        timestamp: new Date()
      };

      const validationMessage: TorqueRealtimeMessage = {
        type: 'VALIDATION_RESULT',
        payload: { result: 'validation-result' },
        timestamp: new Date()
      };

      // client-001 subscribes to both, client-002 only to torque-events, client-003 only to validation-results
      realtimeService.broadcastFiltered(torqueMessage, (client) =>
        client.subscriptions.includes('torque-events')
      );

      expect(broadcastSpy).toHaveBeenCalledTimes(2); // client-001 and client-002

      broadcastSpy.mockClear();

      realtimeService.broadcastFiltered(validationMessage, (client) =>
        client.subscriptions.includes('validation-results')
      );

      expect(broadcastSpy).toHaveBeenCalledTimes(2); // client-001 and client-003
    });
  });

  describe('Torque Event Broadcasting', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);

      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);
    });

    it('should broadcast torque event to session clients', () => {
      const broadcastSpy = vi.spyOn(realtimeService, 'broadcastToSession');

      const torqueEvent: TorqueEvent = {
        id: 'event-001',
        sequenceId: 'seq-001',
        sessionId: 'session-123',
        passNumber: 1,
        actualTorque: 150.0,
        targetTorque: 150.0,
        angle: 45.0,
        status: TorqueStatus.PASS,
        isValid: true,
        deviation: 0,
        percentDeviation: 0,
        wrenchId: 'wrench-001',
        operatorId: 'operator-123',
        timestamp: new Date(),
        createdAt: new Date()
      };

      realtimeService.broadcastTorqueEvent(torqueEvent);

      expect(broadcastSpy).toHaveBeenCalledOnce();
      expect(broadcastSpy).toHaveBeenCalledWith('session-123', {
        type: 'TORQUE_EVENT',
        payload: torqueEvent,
        timestamp: expect.any(Date)
      });
    });

    it('should emit event on torque event broadcast', () => {
      const eventSpy = vi.fn();
      realtimeService.on('torqueEventBroadcast', eventSpy);

      const torqueEvent: TorqueEvent = {
        id: 'event-001',
        sequenceId: 'seq-001',
        sessionId: 'session-123',
        passNumber: 1,
        actualTorque: 150.0,
        targetTorque: 150.0,
        angle: 45.0,
        status: TorqueStatus.PASS,
        isValid: true,
        deviation: 0,
        percentDeviation: 0,
        wrenchId: 'wrench-001',
        operatorId: 'operator-123',
        timestamp: new Date(),
        createdAt: new Date()
      };

      realtimeService.broadcastTorqueEvent(torqueEvent);

      expect(eventSpy).toHaveBeenCalledOnce();
      expect(eventSpy).toHaveBeenCalledWith(torqueEvent);
    });
  });

  describe('Validation Result Broadcasting', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);

      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['validation-results'],
        isActive: true
      };

      realtimeService.addClient(client);
    });

    it('should broadcast validation result to session clients', () => {
      const broadcastSpy = vi.spyOn(realtimeService, 'broadcastToSession');

      const validationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: true,
        status: TorqueStatus.PASS,
        deviation: 0,
        percentDeviation: 0,
        message: 'Reading within specification',
        severity: ValidationSeverity.INFO,
        timestamp: new Date(),
        appliedRules: [],
        readings: []
      };

      realtimeService.broadcastValidationResult(validationResult);

      expect(broadcastSpy).toHaveBeenCalledOnce();
      expect(broadcastSpy).toHaveBeenCalledWith('session-123', {
        type: 'VALIDATION_RESULT',
        payload: validationResult,
        timestamp: expect.any(Date)
      });
    });

    it('should emit event on validation result broadcast', () => {
      const eventSpy = vi.fn();
      realtimeService.on('validationResultBroadcast', eventSpy);

      const validationResult: TorqueValidationResult = {
        sessionId: 'session-123',
        isValid: false,
        status: TorqueStatus.OVER_TORQUE,
        deviation: 10.0,
        percentDeviation: 6.67,
        message: 'Reading above specification',
        severity: ValidationSeverity.ERROR,
        timestamp: new Date(),
        appliedRules: [],
        readings: []
      };

      realtimeService.broadcastValidationResult(validationResult);

      expect(eventSpy).toHaveBeenCalledOnce();
      expect(eventSpy).toHaveBeenCalledWith(validationResult);
    });
  });

  describe('Heartbeat Management', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);
    });

    it('should update client heartbeat', () => {
      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(Date.now() - 60000), // 1 minute ago
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);

      const oldHeartbeat = client.lastHeartbeat;
      realtimeService.updateHeartbeat('client-001');

      const updatedClient = realtimeService.getClient('client-001');
      expect(updatedClient?.lastHeartbeat.getTime()).toBeGreaterThan(oldHeartbeat.getTime());
    });

    it('should identify stale clients', () => {
      const activeClient: TorqueRealtimeClient = {
        id: 'active-client',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(), // Current time
        subscriptions: ['torque-events'],
        isActive: true
      };

      const staleClient: TorqueRealtimeClient = {
        id: 'stale-client',
        sessionId: 'session-123',
        userId: 'user-789',
        connectionTime: new Date(),
        lastHeartbeat: new Date(Date.now() - 120000), // 2 minutes ago
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(activeClient);
      realtimeService.addClient(staleClient);

      const staleClients = realtimeService.getStaleClients(60000); // 1 minute threshold

      expect(staleClients).toHaveLength(1);
      expect(staleClients[0].id).toBe('stale-client');
    });

    it('should cleanup stale clients', () => {
      const staleClient: TorqueRealtimeClient = {
        id: 'stale-client',
        sessionId: 'session-123',
        userId: 'user-789',
        connectionTime: new Date(),
        lastHeartbeat: new Date(Date.now() - 120000), // 2 minutes ago
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(staleClient);

      const cleanedCount = realtimeService.cleanupStaleClients(60000); // 1 minute threshold

      expect(cleanedCount).toBe(1);
      expect(realtimeService.getClient('stale-client')).toBeUndefined();
    });

    it('should emit event when cleaning up stale clients', () => {
      const cleanupSpy = vi.fn();
      realtimeService.on('clientCleanup', cleanupSpy);

      const staleClient: TorqueRealtimeClient = {
        id: 'stale-client',
        sessionId: 'session-123',
        userId: 'user-789',
        connectionTime: new Date(),
        lastHeartbeat: new Date(Date.now() - 120000), // 2 minutes ago
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(staleClient);
      realtimeService.cleanupStaleClients(60000);

      expect(cleanupSpy).toHaveBeenCalledOnce();
      expect(cleanupSpy).toHaveBeenCalledWith(['stale-client']);
    });
  });

  describe('Statistics and Monitoring', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);

      // Add multiple clients for testing
      const clients: TorqueRealtimeClient[] = [
        {
          id: 'client-001',
          sessionId: 'session-123',
          userId: 'user-456',
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['torque-events'],
          isActive: true
        },
        {
          id: 'client-002',
          sessionId: 'session-123',
          userId: 'user-789',
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['validation-results'],
          isActive: true
        },
        {
          id: 'client-003',
          sessionId: 'session-456',
          userId: 'user-999',
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['torque-events', 'validation-results'],
          isActive: false
        }
      ];

      clients.forEach(client => realtimeService.addClient(client));
    });

    it('should get service statistics', () => {
      const stats = realtimeService.getStatistics();

      expect(stats).toBeDefined();
      expect(stats.totalClients).toBe(3);
      expect(stats.activeClients).toBe(2);
      expect(stats.uniqueSessions).toBe(2);
      expect(stats.uniqueUsers).toBe(3);
      expect(stats.isRunning).toBe(true);
      expect(stats.uptime).toBeGreaterThan(0);
    });

    it('should track message statistics', () => {
      const message: TorqueRealtimeMessage = {
        type: 'TORQUE_EVENT',
        payload: { event: 'test-event' },
        timestamp: new Date()
      };

      realtimeService.broadcast(message);
      realtimeService.broadcast(message);

      const stats = realtimeService.getStatistics();

      expect(stats.messagesSent).toBe(6); // 2 broadcasts × 3 clients
      expect(stats.messagesPerSecond).toBeGreaterThanOrEqual(0);
    });

    it('should get connection statistics by session', () => {
      const sessionStats = realtimeService.getSessionStatistics('session-123');

      expect(sessionStats).toBeDefined();
      expect(sessionStats.sessionId).toBe('session-123');
      expect(sessionStats.clientCount).toBe(2);
      expect(sessionStats.activeClients).toBe(2);
      expect(sessionStats.uniqueUsers).toBe(2);
    });

    it('should return undefined for non-existent session statistics', () => {
      const sessionStats = realtimeService.getSessionStatistics('non-existent');

      expect(sessionStats).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);
    });

    it('should handle WebSocket connection errors gracefully', () => {
      const errorSpy = vi.fn();
      realtimeService.on('clientError', errorSpy);

      const client: TorqueRealtimeClient = {
        id: 'error-client',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);

      const mockWs = new MockWebSocket('ws://localhost:8080');
      realtimeService['clientConnections'].set('error-client', mockWs as any);

      // Simulate WebSocket error
      mockWs.simulateError();

      expect(errorSpy).toHaveBeenCalledOnce();
    });

    it('should handle message sending errors', () => {
      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);

      // Mock WebSocket with error on send
      const mockWs = {
        send: vi.fn().mockImplementation(() => {
          throw new Error('Send failed');
        }),
        readyState: MockWebSocket.OPEN
      };

      realtimeService['clientConnections'].set('client-001', mockWs as any);

      const message: TorqueRealtimeMessage = {
        type: 'TEST_MESSAGE',
        payload: { test: 'data' },
        timestamp: new Date()
      };

      // Should not throw error
      expect(() => realtimeService.sendToClient('client-001', message)).not.toThrow();
    });

    it('should handle invalid message formats', () => {
      const client: TorqueRealtimeClient = {
        id: 'client-001',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);

      const mockWs = { send: vi.fn(), readyState: MockWebSocket.OPEN };
      realtimeService['clientConnections'].set('client-001', mockWs as any);

      // Try to send invalid message (circular reference that can't be JSON stringified)
      const circularMessage: any = { type: 'CIRCULAR', payload: {} };
      circularMessage.payload.circular = circularMessage;

      // Should not throw error
      expect(() => realtimeService.sendToClient('client-001', circularMessage)).not.toThrow();
    });

    it('should handle client disconnection gracefully', () => {
      const disconnectSpy = vi.fn();
      realtimeService.on('clientDisconnected', disconnectSpy);

      const client: TorqueRealtimeClient = {
        id: 'disconnect-client',
        sessionId: 'session-123',
        userId: 'user-456',
        connectionTime: new Date(),
        lastHeartbeat: new Date(),
        subscriptions: ['torque-events'],
        isActive: true
      };

      realtimeService.addClient(client);

      const mockWs = new MockWebSocket('ws://localhost:8080');
      realtimeService['clientConnections'].set('disconnect-client', mockWs as any);

      // Simulate WebSocket close
      mockWs.close();

      expect(disconnectSpy).toHaveBeenCalledOnce();
      expect(disconnectSpy).toHaveBeenCalledWith('disconnect-client');
    });
  });

  describe('Performance and Scalability', () => {
    beforeEach(async () => {
      await realtimeService.start(8080);
    });

    it('should handle large number of clients', () => {
      const clientCount = 100;
      const clients: TorqueRealtimeClient[] = [];

      for (let i = 0; i < clientCount; i++) {
        const client: TorqueRealtimeClient = {
          id: `client-${i.toString().padStart(3, '0')}`,
          sessionId: `session-${Math.floor(i / 10)}`, // 10 clients per session
          userId: `user-${i}`,
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['torque-events'],
          isActive: true
        };

        clients.push(client);
        realtimeService.addClient(client);
      }

      expect(realtimeService.getClients()).toHaveLength(clientCount);

      const stats = realtimeService.getStatistics();
      expect(stats.totalClients).toBe(clientCount);
      expect(stats.uniqueSessions).toBe(10);
    });

    it('should handle rapid message broadcasting', () => {
      // Add a few clients
      for (let i = 0; i < 10; i++) {
        const client: TorqueRealtimeClient = {
          id: `rapid-client-${i}`,
          sessionId: 'rapid-session',
          userId: `user-${i}`,
          connectionTime: new Date(),
          lastHeartbeat: new Date(),
          subscriptions: ['torque-events'],
          isActive: true
        };

        realtimeService.addClient(client);
      }

      const startTime = Date.now();

      // Send 100 messages rapidly
      for (let i = 0; i < 100; i++) {
        const message: TorqueRealtimeMessage = {
          type: 'RAPID_MESSAGE',
          payload: { index: i },
          timestamp: new Date()
        };

        realtimeService.broadcastToSession('rapid-session', message);
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (1 second)
      expect(duration).toBeLessThan(1000);

      const stats = realtimeService.getStatistics();
      expect(stats.messagesSent).toBe(1000); // 100 messages × 10 clients
    });
  });
});