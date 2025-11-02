/**
 * Tests for FAI Store (First Article Inspection)
 *
 * Tests the FAI state management store including:
 * - FAI report CRUD operations
 * - Characteristic management
 * - Approval workflows
 * - List operations with pagination and filtering
 * - Error handling and state management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFAIStore } from '../faiStore';
import type { FAIReport, FAICharacteristic, CreateFAIReportInput, UpdateFAIReportInput } from '@/api/fai';

// Mock the FAI API
const mockFAIAPI = {
  create: vi.fn(),
  getById: vi.fn(),
  getByNumber: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  addCharacteristic: vi.fn(),
  getCharacteristics: vi.fn(),
  updateCharacteristic: vi.fn(),
  deleteCharacteristic: vi.fn(),
  approve: vi.fn(),
};

vi.mock('@/api/fai', () => ({
  faiAPI: mockFAIAPI,
}));

// Mock data
const mockFAIReport: FAIReport = {
  id: 'fai-1',
  faiNumber: 'FAI-001',
  partNumber: 'PN-123456',
  serialNumber: 'SN-001',
  description: 'First Article Inspection Report',
  characteristics: [],
  status: 'DRAFT',
  approvedBy: null,
  approvedDate: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockCharacteristic: FAICharacteristic = {
  id: 'char-1',
  faiReportId: 'fai-1',
  characteristicNumber: 1,
  description: 'Dimensional',
  nominal: 10.0,
  upperTolerance: 10.5,
  lowerTolerance: 9.5,
  actualValue: 10.1,
  status: 'PASS',
  notes: 'Within tolerance',
};

describe('FAIStore', () => {
  beforeEach(() => {
    // Reset store state
    useFAIStore.setState({
      reports: [],
      currentReport: null,
      characteristics: [],
      isLoading: false,
      isLoadingDetail: false,
      error: null,
      detailError: null,
      pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
    });

    vi.clearAllMocks();
  });

  describe('FAI Report CRUD Operations', () => {
    it('should create a FAI report successfully', async () => {
      const createInput: CreateFAIReportInput = {
        partNumber: 'PN-123456',
        serialNumber: 'SN-001',
        description: 'First Article Inspection Report',
      };

      mockFAIAPI.create.mockResolvedValue(mockFAIReport);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        const report = await result.current.createFAIReport(createInput);
        expect(report.id).toBe('fai-1');
        expect(report.faiNumber).toBe('FAI-001');
      });

      expect(mockFAIAPI.create).toHaveBeenCalledWith(createInput);
    });

    it('should fetch FAI report by ID', async () => {
      mockFAIAPI.getById.mockResolvedValue(mockFAIReport);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        const report = await result.current.getFAIReport('fai-1');
        expect(report.id).toBe('fai-1');
        expect(report.status).toBe('DRAFT');
      });

      expect(result.current.currentReport?.id).toBe('fai-1');
    });

    it('should fetch FAI report by FAI number', async () => {
      mockFAIAPI.getByNumber.mockResolvedValue(mockFAIReport);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        const report = await result.current.getFAIReportByNumber('FAI-001');
        expect(report.faiNumber).toBe('FAI-001');
      });
    });

    it('should update FAI report', async () => {
      const updatedReport = { ...mockFAIReport, description: 'Updated description' };
      mockFAIAPI.update.mockResolvedValue(updatedReport);

      const { result } = renderHook(() => useFAIStore());

      const updateInput: UpdateFAIReportInput = {
        description: 'Updated description',
      };

      await act(async () => {
        const report = await result.current.updateFAIReport('fai-1', updateInput);
        expect(report.description).toBe('Updated description');
      });

      expect(mockFAIAPI.update).toHaveBeenCalledWith('fai-1', updateInput);
    });

    it('should delete FAI report', async () => {
      mockFAIAPI.delete.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        await result.current.deleteFAIReport('fai-1');
      });

      expect(mockFAIAPI.delete).toHaveBeenCalledWith('fai-1');
    });

    it('should approve FAI report', async () => {
      const approvedReport = {
        ...mockFAIReport,
        status: 'APPROVED',
        approvedBy: 'user-123',
        approvedDate: new Date(),
      };
      mockFAIAPI.approve.mockResolvedValue(approvedReport);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        const report = await result.current.approveFAIReport('fai-1');
        expect(report.status).toBe('APPROVED');
        expect(report.approvedBy).toBe('user-123');
      });

      expect(mockFAIAPI.approve).toHaveBeenCalledWith('fai-1');
    });
  });

  describe('Characteristic Management', () => {
    it('should add characteristic to FAI report', async () => {
      mockFAIAPI.addCharacteristic.mockResolvedValue(mockCharacteristic);

      const { result } = renderHook(() => useFAIStore());

      const createInput = {
        characteristicNumber: 1,
        description: 'Dimensional',
        nominal: 10.0,
        upperTolerance: 10.5,
        lowerTolerance: 9.5,
      };

      await act(async () => {
        const char = await result.current.addCharacteristic('fai-1', createInput);
        expect(char.id).toBe('char-1');
        expect(char.description).toBe('Dimensional');
      });

      expect(mockFAIAPI.addCharacteristic).toHaveBeenCalledWith('fai-1', createInput);
    });

    it('should get characteristics for FAI report', async () => {
      mockFAIAPI.getCharacteristics.mockResolvedValue([mockCharacteristic]);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        await result.current.getCharacteristics('fai-1');
      });

      expect(result.current.characteristics).toHaveLength(1);
      expect(result.current.characteristics[0].id).toBe('char-1');
    });

    it('should update characteristic', async () => {
      const updatedChar = { ...mockCharacteristic, actualValue: 10.2, status: 'FAIL' };
      mockFAIAPI.updateCharacteristic.mockResolvedValue(updatedChar);

      const { result } = renderHook(() => useFAIStore());

      const updateInput = {
        actualValue: 10.2,
        status: 'FAIL' as const,
      };

      await act(async () => {
        const char = await result.current.updateCharacteristic('fai-1', 'char-1', updateInput);
        expect(char.actualValue).toBe(10.2);
        expect(char.status).toBe('FAIL');
      });
    });

    it('should delete characteristic', async () => {
      mockFAIAPI.deleteCharacteristic.mockResolvedValue(undefined);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        await result.current.deleteCharacteristic('fai-1', 'char-1');
      });

      expect(mockFAIAPI.deleteCharacteristic).toHaveBeenCalledWith('fai-1', 'char-1');
    });
  });

  describe('List Operations', () => {
    it('should list FAI reports with pagination', async () => {
      const mockListResponse = {
        reports: [mockFAIReport],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      };

      mockFAIAPI.list.mockResolvedValue(mockListResponse);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        await result.current.listFAIReports();
      });

      expect(result.current.reports).toHaveLength(1);
      expect(result.current.pagination.total).toBe(1);
      expect(result.current.isLoading).toBe(false);
    });

    it('should set page number', async () => {
      const { result } = renderHook(() => useFAIStore());

      act(() => {
        result.current.setPage(2);
      });

      expect(result.current.pagination.page).toBe(2);
    });

    it('should set page size', async () => {
      const { result } = renderHook(() => useFAIStore());

      act(() => {
        result.current.setPageSize(50);
      });

      expect(result.current.pagination.limit).toBe(50);
    });

    it('should set filters', async () => {
      const { result } = renderHook(() => useFAIStore());

      act(() => {
        result.current.setFilters({ status: 'APPROVED' });
      });

      expect(result.current.pagination.page).toBe(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle list error', async () => {
      const error = new Error('Failed to fetch FAI reports');
      mockFAIAPI.list.mockRejectedValue(error);

      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        try {
          await result.current.listFAIReports();
        } catch (e) {
          // Expected
        }
      });

      expect(result.current.error).toBeTruthy();
      expect(result.current.isLoading).toBe(false);
    });

    it('should clear error state', async () => {
      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        result.current.clearError();
      });

      expect(result.current.error).toBeNull();
    });

    it('should clear detail error state', async () => {
      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        result.current.clearDetailError();
      });

      expect(result.current.detailError).toBeNull();
    });
  });

  describe('State Management', () => {
    it('should reset store to initial state', async () => {
      const { result } = renderHook(() => useFAIStore());

      await act(async () => {
        result.current.reset();
      });

      expect(result.current.reports).toHaveLength(0);
      expect(result.current.currentReport).toBeNull();
      expect(result.current.characteristics).toHaveLength(0);
      expect(result.current.error).toBeNull();
    });

    it('should maintain loading state during fetch', async () => {
      mockFAIAPI.list.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  reports: [mockFAIReport],
                  pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
                }),
              100
            )
          )
      );

      const { result } = renderHook(() => useFAIStore());

      act(() => {
        result.current.listFAIReports();
      });

      // Initially loading
      expect(result.current.isLoading).toBe(true);
    });
  });
});
