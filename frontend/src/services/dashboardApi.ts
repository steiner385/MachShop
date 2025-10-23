import { apiClient } from './apiClient';

// Date Range Filter
export interface DateRangeFilter {
  startDate?: string;
  endDate?: string;
}

// Dashboard KPI Data
export interface DashboardKPIs {
  activeWorkOrders: number;
  workOrdersChange: number;
  completedToday: number;
  completedChange: number;
  qualityYield: number;
  yieldChange: number;
  equipmentUtilization: number;
  utilizationChange: number;
}

// Recent Work Order Summary
export interface RecentWorkOrder {
  id: string;
  workOrderNumber: string;
  partNumber: string;
  status: string;
  progress: number;
  priority: string;
  dueDate: string;
}

// Alert/Notification
export interface DashboardAlert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  description: string;
  time: string;
  relatedId?: string;
  relatedType?: 'work_order' | 'equipment' | 'quality';
}

// Production Efficiency Metrics
export interface EfficiencyMetrics {
  oee: number; // Overall Equipment Effectiveness
  fpy: number; // First Pass Yield
  onTimeDelivery: number;
}

// Quality Trends
export interface QualityTrends {
  defectRate: number;
  defectRateTrend: number; // positive = increasing, negative = decreasing
  complaintRate: number;
  complaintRateTrend: number;
  ncrRate: number;
  ncrRateTrend: number;
}

/**
 * Dashboard API Service
 * Provides access to dashboard-specific endpoints for KPIs and summary data
 */
export const dashboardApi = {
  /**
   * Get overall KPI metrics for the dashboard
   * @param startDate - Optional start date for filtering (ISO format)
   * @param endDate - Optional end date for filtering (ISO format)
   */
  async getKPIs(startDate?: string, endDate?: string): Promise<DashboardKPIs> {
    return await apiClient.get<DashboardKPIs>('/dashboard/kpis', { startDate, endDate });
  },

  /**
   * Get recent work orders for dashboard display
   * @param limit - Number of recent work orders to return (default: 5)
   * @param startDate - Optional start date for filtering (ISO format)
   * @param endDate - Optional end date for filtering (ISO format)
   */
  async getRecentWorkOrders(limit: number = 5, startDate?: string, endDate?: string): Promise<RecentWorkOrder[]> {
    return await apiClient.get<RecentWorkOrder[]>('/dashboard/recent-work-orders', { limit, startDate, endDate });
  },

  /**
   * Get recent alerts and notifications
   * @param limit - Number of alerts to return (default: 5)
   */
  async getAlerts(limit: number = 5): Promise<DashboardAlert[]> {
    return await apiClient.get<DashboardAlert[]>('/dashboard/alerts', { limit });
  },

  /**
   * Get production efficiency metrics (OEE, FPY, On-Time Delivery)
   * @param startDate - Optional start date for filtering (ISO format)
   * @param endDate - Optional end date for filtering (ISO format)
   */
  async getEfficiencyMetrics(startDate?: string, endDate?: string): Promise<EfficiencyMetrics> {
    return await apiClient.get<EfficiencyMetrics>('/dashboard/efficiency', { startDate, endDate });
  },

  /**
   * Get quality trend statistics
   * @param startDate - Optional start date for filtering (ISO format)
   * @param endDate - Optional end date for filtering (ISO format)
   */
  async getQualityTrends(startDate?: string, endDate?: string): Promise<QualityTrends> {
    return await apiClient.get<QualityTrends>('/dashboard/quality-trends', { startDate, endDate });
  },
};
