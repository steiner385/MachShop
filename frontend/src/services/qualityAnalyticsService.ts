/**
 * Quality Analytics API Service
 * Client-side service for interacting with Quality Analytics backend endpoints
 */

import { API_BASE_URL } from '../config/api';

export interface MetricData {
  metricType: string;
  period: string;
  value: number;
  trend: number | null;
  status: 'GREEN' | 'YELLOW' | 'RED';
  numerator: number;
  denominator: number;
}

export interface ParetoItem {
  category: string;
  count: number;
  value: number;
  percentage: number;
  cumulativePercentage: number;
}

export interface ParetoAnalysis {
  analysisType: string;
  items: ParetoItem[];
  vitalFewCount: number;
  totalItems: number;
  totalOccurrences: number;
  totalCost: number | null;
}

export interface CostOfQuality {
  totalCoq: number;
  preventionCost: number;
  appraisalCost: number;
  internalFailureCost: number;
  externalFailureCost: number;
  copqPercent: number;
}

export interface QualitySummary {
  siteId: string;
  period: string;
  metrics: {
    ncrRate: number;
    firstPassYield: number;
    dpmo: number;
    copq: number;
    scrapRate: number;
    reworkRate: number;
  };
  trends: {
    ncrRateTrend: number | null;
    firstPassYieldTrend: number | null;
    dproTrend: number | null;
  };
  topPareto: ParetoAnalysis[];
  alertCount: number;
  escapeCount: number;
}

export interface QualityConfig {
  id: string;
  siteId: string;
  ncrRateThreshold: number;
  fypThreshold: number;
  dpmoThreshold: number;
  copqThreshold: number;
  scrapRateThreshold: number;
  reworkRateThreshold: number;
  alertEnabled: boolean;
  alertRecipients: string[];
  reportingCurrency: string;
}

class QualityAnalyticsService {
  /**
   * Get comprehensive quality summary for a site
   */
  async getQualitySummary(siteId: string, period: 'DAY' | 'WEEK' | 'MONTH' = 'DAY'): Promise<QualitySummary> {
    const response = await fetch(
      `${API_BASE_URL}/quality/metrics/summary?siteId=${siteId}&period=${period}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch quality summary');
    return response.json();
  }

  /**
   * Calculate NCR Rate
   */
  async getNcrRate(
    siteId: string,
    startDate: string,
    endDate: string,
    defectType?: string,
    product?: string
  ): Promise<MetricData> {
    const params = new URLSearchParams({ siteId, startDate, endDate });
    if (defectType) params.append('defectType', defectType);
    if (product) params.append('product', product);

    const response = await fetch(
      `${API_BASE_URL}/quality/metrics/ncr-rate?${params}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch NCR rate');
    return response.json();
  }

  /**
   * Calculate First Pass Yield
   */
  async getFirstPassYield(
    siteId: string,
    startDate: string,
    endDate: string,
    product?: string
  ): Promise<MetricData> {
    const params = new URLSearchParams({ siteId, startDate, endDate });
    if (product) params.append('product', product);

    const response = await fetch(
      `${API_BASE_URL}/quality/metrics/first-pass-yield?${params}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch FPY');
    return response.json();
  }

  /**
   * Calculate DPMO
   */
  async getDPMO(
    siteId: string,
    startDate: string,
    endDate: string,
    severity?: string
  ): Promise<MetricData> {
    const params = new URLSearchParams({ siteId, startDate, endDate });
    if (severity) params.append('severity', severity);

    const response = await fetch(
      `${API_BASE_URL}/quality/metrics/dpmo?${params}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch DPMO');
    return response.json();
  }

  /**
   * Generate Pareto Analysis
   */
  async getParetoAnalysis(
    siteId: string,
    analysisType: string,
    startDate: string,
    endDate: string,
    severity?: string,
    defectType?: string
  ): Promise<ParetoAnalysis> {
    const params = new URLSearchParams({ siteId, startDate, endDate });
    if (severity) params.append('severity', severity);
    if (defectType) params.append('defectType', defectType);

    const response = await fetch(
      `${API_BASE_URL}/quality/pareto/${analysisType}?${params}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch Pareto analysis');
    return response.json();
  }

  /**
   * Get Cost of Quality
   */
  async getCostOfQuality(
    siteId: string,
    startDate: string,
    endDate: string
  ): Promise<CostOfQuality> {
    const params = new URLSearchParams({ siteId, startDate, endDate });

    const response = await fetch(
      `${API_BASE_URL}/quality/coq?${params}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch CoQ');
    return response.json();
  }

  /**
   * Get Cost of Quality History
   */
  async getCoqHistory(siteId: string, months: number = 12): Promise<any> {
    const params = new URLSearchParams({ siteId, months: months.toString() });

    const response = await fetch(
      `${API_BASE_URL}/quality/coq/history?${params}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch CoQ history');
    return response.json();
  }

  /**
   * Get Quality Configuration
   */
  async getQualityConfig(siteId: string): Promise<QualityConfig> {
    const response = await fetch(
      `${API_BASE_URL}/quality/config/${siteId}`,
      { credentials: 'include' }
    );
    if (!response.ok) throw new Error('Failed to fetch quality config');
    return response.json();
  }

  /**
   * Update Quality Configuration
   */
  async updateQualityConfig(siteId: string, config: Partial<QualityConfig>): Promise<QualityConfig> {
    const response = await fetch(
      `${API_BASE_URL}/quality/config/${siteId}`,
      {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      }
    );
    if (!response.ok) throw new Error('Failed to update quality config');
    return response.json();
  }
}

export default new QualityAnalyticsService();
