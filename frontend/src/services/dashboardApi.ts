import { apiClient } from './apiClient';

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
   */
  async getKPIs(): Promise<DashboardKPIs> {
    const response = await apiClient.get<DashboardKPIs>('/dashboard/kpis');
    return response.data;
  },

  /**
   * Get recent work orders for dashboard display
   * @param limit - Number of recent work orders to return (default: 5)
   */
  async getRecentWorkOrders(limit: number = 5): Promise<RecentWorkOrder[]> {
    const response = await apiClient.get<RecentWorkOrder[]>('/dashboard/recent-work-orders', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get recent alerts and notifications
   * @param limit - Number of alerts to return (default: 5)
   */
  async getAlerts(limit: number = 5): Promise<DashboardAlert[]> {
    const response = await apiClient.get<DashboardAlert[]>('/dashboard/alerts', {
      params: { limit },
    });
    return response.data;
  },

  /**
   * Get production efficiency metrics (OEE, FPY, On-Time Delivery)
   */
  async getEfficiencyMetrics(): Promise<EfficiencyMetrics> {
    const response = await apiClient.get<EfficiencyMetrics>('/dashboard/efficiency');
    return response.data;
  },

  /**
   * Get quality trend statistics
   */
  async getQualityTrends(): Promise<QualityTrends> {
    const response = await apiClient.get<QualityTrends>('/dashboard/quality-trends');
    return response.data;
  },
};
