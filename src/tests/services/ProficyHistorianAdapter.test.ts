import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProficyHistorianAdapter, ProficyHistorianConfig } from '../../services/ProficyHistorianAdapter';
import axios from 'axios';

// Mock axios
vi.mock('axios');
const mockedAxios = axios as any;

describe('ProficyHistorianAdapter', () => {
  let adapter: ProficyHistorianAdapter;
  let mockConfig: ProficyHistorianConfig;

  beforeEach(() => {
    vi.clearAllMocks();

    mockConfig = {
      baseUrl: 'http://localhost:8080',
      username: 'testuser',
      password: 'testpass',
      authType: 'basic',
      timeout: 30000,
      retryAttempts: 3,
      bufferSize: 100,
    };

    // Mock axios.create to return a mock instance
    const mockInstance = {
      get: vi.fn(),
      post: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    };

    mockedAxios.create = vi.fn(() => mockInstance);

    adapter = new ProficyHistorianAdapter(mockConfig);
  });

  describe('Constructor', () => {
    it('should initialize with config', () => {
      expect(adapter).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: mockConfig.baseUrl,
          timeout: mockConfig.timeout,
        })
      );
    });

    it('should apply default configuration values', () => {
      const minimalConfig: ProficyHistorianConfig = {
        baseUrl: 'http://localhost:8080',
        username: 'user',
        password: 'pass',
      };

      const adapterWithDefaults = new ProficyHistorianAdapter(minimalConfig);
      expect(adapterWithDefaults).toBeDefined();
    });
  });

  describe('testConnection', () => {
    it('should return true when connection succeeds', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.get.mockResolvedValueOnce({ status: 200 });

      const result = await adapter.testConnection();

      expect(result).toBe(true);
      expect(mockInstance.get).toHaveBeenCalledWith('/historian/server/info');
    });

    it('should return false when connection fails', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.get.mockRejectedValueOnce(new Error('Connection failed'));

      const result = await adapter.testConnection();

      expect(result).toBe(false);
    });
  });

  describe('createTag', () => {
    it('should create a tag successfully', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.post.mockResolvedValueOnce({ status: 201 });

      const tag = {
        tagName: 'EQUIPMENT.CNC001.TEMPERATURE',
        description: 'CNC Machine Temperature',
        dataType: 'Float' as const,
        engineeringUnits: '°C',
      };

      const result = await adapter.createTag(tag);

      expect(result).toBe(true);
      expect(mockInstance.post).toHaveBeenCalledWith(
        '/historian/tags',
        expect.objectContaining({
          TagName: tag.tagName,
          DataType: tag.dataType,
        })
      );
    });

    it('should throw error when tag creation fails', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.post.mockRejectedValueOnce(new Error('Tag creation failed'));

      const tag = {
        tagName: 'TEST.TAG',
        dataType: 'Float' as const,
      };

      await expect(adapter.createTag(tag)).rejects.toThrow('Failed to create tag');
    });
  });

  describe('writeDataPoints', () => {
    it('should write data points successfully', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.post.mockResolvedValueOnce({ status: 200 });

      const dataPoints = [
        {
          tagName: 'EQUIPMENT.CNC001.TEMPERATURE',
          value: 75.5,
          timestamp: new Date('2025-10-17T12:00:00Z'),
          quality: 100,
        },
        {
          tagName: 'EQUIPMENT.CNC001.PRESSURE',
          value: 30.2,
          timestamp: new Date('2025-10-17T12:00:00Z'),
          quality: 100,
        },
      ];

      const result = await adapter.writeDataPoints(dataPoints);

      expect(result.success).toBe(true);
      expect(result.pointsWritten).toBe(2);
      expect(result.pointsFailed).toBe(0);
      expect(mockInstance.post).toHaveBeenCalledWith(
        '/historian/data/write',
        expect.objectContaining({
          Data: expect.arrayContaining([
            expect.objectContaining({
              TagName: dataPoints[0].tagName,
              Value: dataPoints[0].value,
            }),
          ]),
        })
      );
    });

    it('should handle write failures', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.post.mockRejectedValueOnce(new Error('Write failed'));

      const dataPoints = [
        {
          tagName: 'TEST.TAG',
          value: 100,
          timestamp: new Date(),
        },
      ];

      const result = await adapter.writeDataPoints(dataPoints);

      expect(result.success).toBe(false);
      expect(result.pointsFailed).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('queryHistoricalData', () => {
    it('should query historical data successfully', async () => {
      const mockInstance = (adapter as any).httpClient;
      const mockResponseData = {
        Data: [
          {
            TagName: 'EQUIPMENT.CNC001.TEMPERATURE',
            Timestamp: '2025-10-17T12:00:00Z',
            Value: 75.5,
            Quality: 100,
          },
          {
            TagName: 'EQUIPMENT.CNC001.TEMPERATURE',
            Timestamp: '2025-10-17T12:01:00Z',
            Value: 76.0,
            Quality: 100,
          },
        ],
      };

      mockInstance.get.mockResolvedValueOnce({ data: mockResponseData });

      const queryOptions = {
        tagNames: ['EQUIPMENT.CNC001.TEMPERATURE'],
        startTime: new Date('2025-10-17T12:00:00Z'),
        endTime: new Date('2025-10-17T12:05:00Z'),
        samplingMode: 'RawByTime' as const,
      };

      const result = await adapter.queryHistoricalData(queryOptions);

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(2);
      expect(result.dataPoints).toHaveLength(2);
      expect(result.dataPoints[0].tagName).toBe('EQUIPMENT.CNC001.TEMPERATURE');
      expect(result.dataPoints[0].value).toBe(75.5);
    });

    it('should handle query failures', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.get.mockRejectedValueOnce(new Error('Query failed'));

      const queryOptions = {
        tagNames: ['TEST.TAG'],
        startTime: new Date('2025-10-17T00:00:00Z'),
        endTime: new Date('2025-10-17T23:59:59Z'),
      };

      const result = await adapter.queryHistoricalData(queryOptions);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('queryAggregatedData', () => {
    it('should query aggregated data successfully', async () => {
      const mockInstance = (adapter as any).httpClient;
      const mockResponseData = {
        Data: [
          {
            TagName: 'EQUIPMENT.CNC001.TEMPERATURE',
            Timestamp: '2025-10-17T12:00:00Z',
            Value: 75.0,
            Quality: 100,
          },
        ],
      };

      mockInstance.get.mockResolvedValueOnce({ data: mockResponseData });

      const result = await adapter.queryAggregatedData(
        ['EQUIPMENT.CNC001.TEMPERATURE'],
        new Date('2025-10-17T00:00:00Z'),
        new Date('2025-10-17T23:59:59Z'),
        'Average',
        60
      );

      expect(result.success).toBe(true);
      expect(result.recordCount).toBe(1);
    });
  });

  describe('bufferDataPoint', () => {
    it('should buffer data points', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.post.mockResolvedValueOnce({ status: 200 });

      const dataPoint = {
        tagName: 'TEST.TAG',
        value: 100,
        timestamp: new Date(),
      };

      await adapter.bufferDataPoint(dataPoint);

      // Buffer should contain the data point (not flushed yet if buffer size not reached)
      const buffer = (adapter as any).dataBuffer;
      expect(buffer).toHaveLength(1);
    });

    it('should auto-flush when buffer size reached', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.post.mockResolvedValue({ status: 200 });

      // Set small buffer size for testing
      (adapter as any).config.bufferSize = 2;

      const dataPoint1 = {
        tagName: 'TEST.TAG',
        value: 100,
        timestamp: new Date(),
      };

      const dataPoint2 = {
        tagName: 'TEST.TAG',
        value: 200,
        timestamp: new Date(),
      };

      await adapter.bufferDataPoint(dataPoint1);
      await adapter.bufferDataPoint(dataPoint2);

      // Should have flushed
      expect(mockInstance.post).toHaveBeenCalled();
    });
  });

  describe('getHealthStatus', () => {
    it('should return connected status when healthy', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.get.mockResolvedValueOnce({ status: 200 });

      const health = await adapter.getHealthStatus();

      expect(health.connected).toBe(true);
      expect(health.responseTime).toBeDefined();
      expect(typeof health.responseTime).toBe('number');
    });

    it('should return disconnected status when unhealthy', async () => {
      const mockInstance = (adapter as any).httpClient;
      mockInstance.get.mockRejectedValueOnce(new Error('Connection failed'));

      const health = await adapter.getHealthStatus();

      expect(health.connected).toBe(false);
      expect(health.error).toBeDefined();
    });
  });
});
