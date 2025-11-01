/**
 * Quality Analytics Dashboard Unit Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QualityAnalyticsDashboard from '../QualityAnalyticsDashboard';
import qualityAnalyticsService from '../../../services/qualityAnalyticsService';

// Mock the service
jest.mock('../../../services/qualityAnalyticsService');

const mockQualitySummary = {
  siteId: 'site1',
  period: 'DAY',
  metrics: {
    ncrRate: 0.8,
    firstPassYield: 97.5,
    dpmo: 8000,
    copq: 2.5,
    scrapRate: 1.2,
    reworkRate: 1.8,
  },
  trends: {
    ncrRateTrend: 10,
    firstPassYieldTrend: -2,
    dproTrend: 5,
  },
  topPareto: [],
  alertCount: 3,
  escapeCount: 1,
};

const mockParetoAnalysis = {
  analysisType: 'DEFECT_TYPE',
  items: [
    { category: 'Dimensional', count: 45, value: 4500, percentage: 60, cumulativePercentage: 60 },
    { category: 'Surface', count: 20, value: 2000, percentage: 27, cumulativePercentage: 87 },
    { category: 'Function', count: 10, value: 1000, percentage: 13, cumulativePercentage: 100 },
  ],
  vitalFewCount: 2,
  totalItems: 3,
  totalOccurrences: 75,
  totalCost: 7500,
};

const mockCoqData = {
  totalCoq: 150000,
  preventionCost: 10000,
  appraisalCost: 20000,
  internalFailureCost: 80000,
  externalFailureCost: 40000,
  copqPercent: 2.5,
};

describe('QualityAnalyticsDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with correct title', async () => {
    (qualityAnalyticsService.getQualitySummary as jest.Mock).mockResolvedValue(mockQualitySummary);
    (qualityAnalyticsService.getParetoAnalysis as jest.Mock).mockResolvedValue(mockParetoAnalysis);
    (qualityAnalyticsService.getCostOfQuality as jest.Mock).mockResolvedValue(mockCoqData);

    render(<QualityAnalyticsDashboard siteId="site1" />);

    await waitFor(() => {
      expect(screen.getByText('Quality Analytics Dashboard')).toBeInTheDocument();
    });
  });

  it('should display key metrics cards', async () => {
    (qualityAnalyticsService.getQualitySummary as jest.Mock).mockResolvedValue(mockQualitySummary);
    (qualityAnalyticsService.getParetoAnalysis as jest.Mock).mockResolvedValue(mockParetoAnalysis);
    (qualityAnalyticsService.getCostOfQuality as jest.Mock).mockResolvedValue(mockCoqData);

    render(<QualityAnalyticsDashboard siteId="site1" />);

    await waitFor(() => {
      expect(screen.getByText('NCR Rate')).toBeInTheDocument();
      expect(screen.getByText('First Pass Yield')).toBeInTheDocument();
      expect(screen.getByText('DPMO')).toBeInTheDocument();
      expect(screen.getByText('Active Alerts')).toBeInTheDocument();
    });
  });

  it('should display metric values correctly', async () => {
    (qualityAnalyticsService.getQualitySummary as jest.Mock).mockResolvedValue(mockQualitySummary);
    (qualityAnalyticsService.getParetoAnalysis as jest.Mock).mockResolvedValue(mockParetoAnalysis);
    (qualityAnalyticsService.getCostOfQuality as jest.Mock).mockResolvedValue(mockCoqData);

    render(<QualityAnalyticsDashboard siteId="site1" />);

    await waitFor(() => {
      expect(screen.getByText('0.8')).toBeInTheDocument();
      expect(screen.getByText('97.5')).toBeInTheDocument();
    });
  });

  it('should call API with correct parameters on load', async () => {
    (qualityAnalyticsService.getQualitySummary as jest.Mock).mockResolvedValue(mockQualitySummary);
    (qualityAnalyticsService.getParetoAnalysis as jest.Mock).mockResolvedValue(mockParetoAnalysis);
    (qualityAnalyticsService.getCostOfQuality as jest.Mock).mockResolvedValue(mockCoqData);

    render(<QualityAnalyticsDashboard siteId="site1" />);

    await waitFor(() => {
      expect(qualityAnalyticsService.getQualitySummary).toHaveBeenCalledWith('site1', 'DAY');
    });
  });

  it('should handle period change', async () => {
    (qualityAnalyticsService.getQualitySummary as jest.Mock).mockResolvedValue(mockQualitySummary);
    (qualityAnalyticsService.getParetoAnalysis as jest.Mock).mockResolvedValue(mockParetoAnalysis);
    (qualityAnalyticsService.getCostOfQuality as jest.Mock).mockResolvedValue(mockCoqData);

    render(<QualityAnalyticsDashboard siteId="site1" />);

    await waitFor(() => {
      expect(screen.getByText('Last Day')).toBeInTheDocument();
    });

    const selectElement = screen.getByDisplayValue('Last Day') as HTMLSelectElement;
    fireEvent.change(selectElement, { target: { value: 'MONTH' } });

    await waitFor(() => {
      expect(qualityAnalyticsService.getQualitySummary).toHaveBeenLastCalledWith('site1', 'MONTH');
    });
  });

  it('should display error message on API failure', async () => {
    const errorMessage = 'Failed to fetch quality data';
    (qualityAnalyticsService.getQualitySummary as jest.Mock).mockRejectedValue(new Error(errorMessage));
    (qualityAnalyticsService.getParetoAnalysis as jest.Mock).mockRejectedValue(new Error(errorMessage));
    (qualityAnalyticsService.getCostOfQuality as jest.Mock).mockRejectedValue(new Error(errorMessage));

    render(<QualityAnalyticsDashboard siteId="site1" />);

    await waitFor(() => {
      expect(screen.getByText(errorMessage)).toBeInTheDocument();
    });
  });

  it('should handle refresh button click', async () => {
    (qualityAnalyticsService.getQualitySummary as jest.Mock)
      .mockResolvedValueOnce(mockQualitySummary)
      .mockResolvedValueOnce(mockQualitySummary);
    (qualityAnalyticsService.getParetoAnalysis as jest.Mock).mockResolvedValue(mockParetoAnalysis);
    (qualityAnalyticsService.getCostOfQuality as jest.Mock).mockResolvedValue(mockCoqData);

    render(<QualityAnalyticsDashboard siteId="site1" />);

    await waitFor(() => {
      expect(screen.getByText('Quality Analytics Dashboard')).toBeInTheDocument();
    });

    const refreshButton = screen.getByText('Refresh') as HTMLButtonElement;
    fireEvent.click(refreshButton);

    await waitFor(() => {
      expect(qualityAnalyticsService.getQualitySummary).toHaveBeenCalledTimes(2);
    });
  });
});
