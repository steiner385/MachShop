export interface OEEMetrics {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
}

export interface DashboardData {
  productionCount: number;
  qualityRate: number;
  utilizationRate: number;
  oee: OEEMetrics;
}

export interface Report {
  id: string;
  reportName: string;
  reportType: string;
  createdAt: Date;
}
