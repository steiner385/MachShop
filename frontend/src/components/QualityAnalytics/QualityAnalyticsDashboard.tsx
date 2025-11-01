/**
 * Quality Analytics Executive Dashboard (Issue #58)
 * Comprehensive quality metrics visualization and analysis
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  Card,
  Row,
  Col,
  Tabs,
  Spin,
  Alert,
  Button,
  Space,
  Select,
  DatePicker,
  Statistic,
  Progress,
  Table,
  Tag,
  Empty,
} from 'antd';
import {
  LineChartOutlined,
  BarChartOutlined,
  AlertOutlined,
  SettingOutlined,
  ReloadOutlined,
  DownloadOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import qualityAnalyticsService from '../../services/qualityAnalyticsService';
import MetricsCard from './MetricsCard';
import ParetoChart from './ParetoChart';
import CostOfQualityChart from './CostOfQualityChart';
import QualityAlertsPanel from './QualityAlertsPanel';
import QualityConfigPanel from './QualityConfigPanel';
import type { QualitySummary, ParetoAnalysis, CostOfQuality } from '../../services/qualityAnalyticsService';

interface DashboardState {
  summary: QualitySummary | null;
  paretoData: ParetoAnalysis[];
  coqData: CostOfQuality | null;
  loading: boolean;
  error: string | null;
  period: 'DAY' | 'WEEK' | 'MONTH';
  siteId: string;
  lastRefresh: Date | null;
}

const QualityAnalyticsDashboard: React.FC<{ siteId: string }> = ({ siteId: initialSiteId }) => {
  const [state, setState] = useState<DashboardState>({
    summary: null,
    paretoData: [],
    coqData: null,
    loading: false,
    error: null,
    period: 'DAY',
    siteId: initialSiteId,
    lastRefresh: null,
  });

  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showConfig, setShowConfig] = useState(false);

  // Fetch all dashboard data
  const fetchDashboardData = useCallback(async (period: 'DAY' | 'WEEK' | 'MONTH' = state.period) => {
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const [summary, defectPareto, rootCausePareto, coq] = await Promise.all([
        qualityAnalyticsService.getQualitySummary(state.siteId, period),
        qualityAnalyticsService.getParetoAnalysis(state.siteId, 'DEFECT_TYPE',
          dayjs().startOf(period.toLowerCase()).toISOString(),
          dayjs().toISOString()),
        qualityAnalyticsService.getParetoAnalysis(state.siteId, 'ROOT_CAUSE',
          dayjs().startOf(period.toLowerCase()).toISOString(),
          dayjs().toISOString()),
        qualityAnalyticsService.getCostOfQuality(state.siteId,
          dayjs().startOf(period.toLowerCase()).toISOString(),
          dayjs().toISOString()),
      ]);

      setState(prev => ({
        ...prev,
        summary,
        paretoData: [defectPareto, rootCausePareto],
        coqData: coq,
        period,
        loading: false,
        lastRefresh: new Date(),
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to fetch quality data',
        loading: false,
      }));
    }
  }, [state.siteId, state.period]);

  // Initial data load
  useEffect(() => {
    fetchDashboardData();
  }, [state.siteId]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchDashboardData();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchDashboardData]);

  const handlePeriodChange = (newPeriod: 'DAY' | 'WEEK' | 'MONTH') => {
    setState(prev => ({ ...prev, period: newPeriod }));
    fetchDashboardData(newPeriod);
  };

  const handleSiteChange = (newSiteId: string) => {
    setState(prev => ({ ...prev, siteId: newSiteId }));
  };

  const getMetricStatus = (value: number, metric: string): { status: 'success' | 'normal' | 'exception', label: string } => {
    const statusMap: { [key: string]: { green: number; yellow: number } } = {
      ncrRate: { green: 0.5, yellow: 1.0 },
      firstPassYield: { green: 98, yellow: 95 },
      dpmo: { green: 3000, yellow: 10000 },
    };

    const threshold = statusMap[metric];
    if (!threshold) return { status: 'normal', label: 'Normal' };

    if (metric === 'firstPassYield') {
      if (value >= threshold.green) return { status: 'success', label: 'Excellent' };
      if (value >= threshold.yellow) return { status: 'normal', label: 'Good' };
      return { status: 'exception', label: 'Needs Improvement' };
    } else {
      if (value <= threshold.green) return { status: 'success', label: 'Excellent' };
      if (value <= threshold.yellow) return { status: 'normal', label: 'Good' };
      return { status: 'exception', label: 'Needs Improvement' };
    }
  };

  const { summary, paretoData, coqData, loading, error, period, lastRefresh } = state;

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row gutter={[16, 16]} align="middle" justify="space-between" style={{ marginBottom: '24px' }}>
        <Col>
          <h1>Quality Analytics Dashboard</h1>
        </Col>
        <Col>
          <Space>
            <Select
              style={{ width: 150 }}
              value={period}
              onChange={handlePeriodChange}
              options={[
                { label: 'Last Day', value: 'DAY' },
                { label: 'Last Week', value: 'WEEK' },
                { label: 'Last Month', value: 'MONTH' },
              ]}
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => fetchDashboardData()}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setShowConfig(true)}
            >
              Configure
            </Button>
            <Button icon={<DownloadOutlined />}>
              Export
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Status Information */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          {error && <Alert message="Error" description={error} type="error" showIcon closable />}
          {lastRefresh && (
            <Alert
              message={`Last updated: ${lastRefresh.toLocaleTimeString()}`}
              type="info"
              showIcon
              closable
            />
          )}
        </Col>
      </Row>

      {loading && !summary ? (
        <Spin size="large" style={{ display: 'flex', justifyContent: 'center', padding: '60px' }} />
      ) : summary ? (
        <>
          {/* Key Metrics Row */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24} sm={12} lg={6}>
              <MetricsCard
                title="NCR Rate"
                value={summary.metrics.ncrRate}
                unit="%"
                trend={summary.trends.ncrRateTrend}
                status={getMetricStatus(summary.metrics.ncrRate, 'ncrRate').status}
                icon={<AlertOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricsCard
                title="First Pass Yield"
                value={summary.metrics.firstPassYield}
                unit="%"
                trend={summary.trends.firstPassYieldTrend}
                status={getMetricStatus(summary.metrics.firstPassYield, 'firstPassYield').status}
                icon={<BarChartOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <MetricsCard
                title="DPMO"
                value={summary.metrics.dpmo}
                unit=""
                trend={summary.trends.dproTrend}
                status={getMetricStatus(summary.metrics.dpmo, 'dpmo').status}
                icon={<LineChartOutlined />}
              />
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="Active Alerts"
                  value={summary.alertCount}
                  valueStyle={{ color: summary.alertCount > 0 ? '#ff4d4f' : '#52c41a' }}
                  prefix={<AlertOutlined />}
                  suffix={`/ ${summary.escapeCount} Escaped`}
                />
              </Card>
            </Col>
          </Row>

          {/* Tabs for detailed views */}
          <Card style={{ marginBottom: '24px' }}>
            <Tabs
              defaultActiveKey="1"
              items={[
                {
                  key: '1',
                  label: 'Pareto Analysis',
                  icon: <BarChartOutlined />,
                  children: (
                    <Row gutter={[16, 16]}>
                      {paretoData.map((pareto, index) => (
                        <Col xs={24} lg={12} key={index}>
                          <ParetoChart data={pareto} />
                        </Col>
                      ))}
                    </Row>
                  ),
                },
                {
                  key: '2',
                  label: 'Cost of Quality',
                  icon: <LineChartOutlined />,
                  children: coqData ? (
                    <CostOfQualityChart data={coqData} />
                  ) : (
                    <Empty description="No cost data available" />
                  ),
                },
                {
                  key: '3',
                  label: 'Quality Alerts',
                  icon: <AlertOutlined />,
                  children: <QualityAlertsPanel siteId={state.siteId} />,
                },
              ]}
            />
          </Card>
        </>
      ) : (
        <Empty description="No data available" />
      )}

      {/* Configuration Panel Modal */}
      {showConfig && (
        <QualityConfigPanel
          siteId={state.siteId}
          open={showConfig}
          onClose={() => setShowConfig(false)}
          onConfigSaved={() => {
            setShowConfig(false);
            fetchDashboardData();
          }}
        />
      )}
    </div>
  );
};

export default QualityAnalyticsDashboard;
