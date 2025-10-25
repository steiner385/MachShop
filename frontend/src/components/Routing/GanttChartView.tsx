/**
 * Gantt Chart View Component
 * Sprint 4: Visual Routing Enhancements
 *
 * Timeline visualization of routing steps with dependencies
 */

import React, { useMemo } from 'react';
import { Card, Empty, Spin, Space, Typography, Tag, Tooltip } from 'antd';
import {
  ClockCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { RoutingStep } from '@/types/routing';
import './GanttChartView.css';

const { Text } = Typography;

interface GanttChartViewProps {
  steps: RoutingStep[];
  loading?: boolean;
}

interface GanttTask {
  id: string;
  stepNumber: number;
  name: string;
  startTime: number; // minutes from routing start
  duration: number; // minutes
  isCriticalPath: boolean;
  isQualityInspection: boolean;
  isOptional: boolean;
  workCenter?: string;
}

/**
 * Gantt Chart View Component
 *
 * Displays routing steps as a timeline (Gantt chart)
 * Shows parallel vs sequential steps and timing
 */
export const GanttChartView: React.FC<GanttChartViewProps> = ({ steps, loading = false }) => {
  // Calculate Gantt tasks from routing steps
  const ganttTasks = useMemo(() => {
    if (steps.length === 0) return [];

    const tasks: GanttTask[] = [];
    let currentTime = 0;

    // Sort steps by step number
    const sortedSteps = [...steps].sort((a, b) => a.stepNumber - b.stepNumber);

    // Calculate start time and duration for each step
    sortedSteps.forEach((step) => {
      const setupTime = (step.setupTimeOverride ?? step.operation?.setupTime ?? 0) / 60; // Convert to minutes
      const cycleTime = (step.cycleTimeOverride ?? step.operation?.duration ?? 0) / 60;
      const teardownTime = (step.teardownTimeOverride ?? step.operation?.teardownTime ?? 0) / 60;
      const totalDuration = setupTime + cycleTime + teardownTime;

      tasks.push({
        id: step.id,
        stepNumber: step.stepNumber,
        name: step.operation?.operationName || `Step ${step.stepNumber}`,
        startTime: currentTime,
        duration: totalDuration || 10, // Default 10 mins if no time specified
        isCriticalPath: step.isCriticalPath || false,
        isQualityInspection: step.isQualityInspection || false,
        isOptional: step.isOptional || false,
        workCenter: step.workCenter?.name,
      });

      currentTime += totalDuration || 10;
    });

    return tasks;
  }, [steps]);

  // Calculate total routing duration
  const totalDuration = useMemo(() => {
    if (ganttTasks.length === 0) return 0;
    const lastTask = ganttTasks[ganttTasks.length - 1];
    return lastTask.startTime + lastTask.duration;
  }, [ganttTasks]);

  // Format time for display
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate bar position and width as percentages
  const getBarStyle = (task: GanttTask) => {
    const left = (task.startTime / totalDuration) * 100;
    const width = (task.duration / totalDuration) * 100;
    return { left: `${left}%`, width: `${width}%` };
  };

  // Get bar color based on task type
  const getBarColor = (task: GanttTask): string => {
    if (task.isCriticalPath) return '#ff4d4f';
    if (task.isQualityInspection) return '#52c41a';
    if (task.isOptional) return '#1890ff';
    return '#8c8c8c';
  };

  if (loading) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
          <div style={{ marginTop: '16px' }}>Loading Gantt chart...</div>
        </div>
      </Card>
    );
  }

  if (steps.length === 0) {
    return (
      <Card>
        <Empty
          image={<ClockCircleOutlined style={{ fontSize: 64, color: '#999' }} />}
          description="No steps to visualize"
        >
          <Text type="secondary">Add routing steps to see the Gantt chart</Text>
        </Empty>
      </Card>
    );
  }

  return (
    <Card
      title={
        <Space>
          <ClockCircleOutlined />
          Gantt Chart - Timeline View
        </Space>
      }
      className="gantt-chart-card"
    >
      {/* Legend */}
      <div style={{ marginBottom: '16px', padding: '12px', background: '#fafafa', borderRadius: '4px' }}>
        <Space size="middle" wrap>
          <Text strong>
            <InfoCircleOutlined /> Legend:
          </Text>
          <Tag color="red">Critical Path</Tag>
          <Tag color="green">Quality Inspection</Tag>
          <Tag color="blue">Optional</Tag>
          <Tag color="default">Standard</Tag>
        </Space>
        <div style={{ marginTop: '8px' }}>
          <Text type="secondary">
            <ClockCircleOutlined /> Total Duration: <strong>{formatTime(totalDuration)}</strong>
          </Text>
        </div>
      </div>

      {/* Timeline Header */}
      <div className="gantt-timeline-header">
        <div className="gantt-task-labels">
          <Text strong>Step</Text>
        </div>
        <div className="gantt-timeline-grid">
          {/* Time markers */}
          <div className="gantt-time-markers">
            {Array.from({ length: 11 }).map((_, i) => {
              const time = (totalDuration / 10) * i;
              return (
                <div key={i} className="time-marker" style={{ left: `${i * 10}%` }}>
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {formatTime(time)}
                  </Text>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Gantt Chart Body */}
      <div className="gantt-chart-body">
        {ganttTasks.map((task, index) => (
          <div key={task.id} className="gantt-row" style={{ animationDelay: `${index * 50}ms` }}>
            {/* Task Label */}
            <div className="gantt-task-label">
              <div>
                <Tag color="blue" style={{ marginRight: 4, fontWeight: 600 }}>
                  {task.stepNumber}
                </Tag>
                <Text strong>{task.name}</Text>
              </div>
              {task.workCenter && (
                <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: '2px' }}>
                  {task.workCenter}
                </Text>
              )}
            </div>

            {/* Timeline Grid */}
            <div className="gantt-timeline">
              {/* Grid lines */}
              {Array.from({ length: 11 }).map((_, i) => (
                <div
                  key={i}
                  className="grid-line"
                  style={{ left: `${i * 10}%` }}
                />
              ))}

              {/* Task Bar */}
              <Tooltip
                title={
                  <div>
                    <div><strong>Step {task.stepNumber}: {task.name}</strong></div>
                    <div>Start: {formatTime(task.startTime)}</div>
                    <div>Duration: {formatTime(task.duration)}</div>
                    <div>End: {formatTime(task.startTime + task.duration)}</div>
                    {task.workCenter && <div>Work Center: {task.workCenter}</div>}
                  </div>
                }
                placement="top"
              >
                <div
                  className="gantt-bar"
                  style={{
                    ...getBarStyle(task),
                    backgroundColor: getBarColor(task),
                  }}
                >
                  <div className="gantt-bar-content">
                    <Text
                      style={{
                        color: '#fff',
                        fontSize: '12px',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatTime(task.duration)}
                    </Text>
                  </div>
                </div>
              </Tooltip>
            </div>
          </div>
        ))}
      </div>

      {/* Info Note */}
      <div style={{ marginTop: '16px', padding: '12px', background: '#e6f7ff', borderRadius: '4px', border: '1px solid #91d5ff' }}>
        <Space>
          <WarningOutlined style={{ color: '#1890ff' }} />
          <Text type="secondary" style={{ fontSize: '13px' }}>
            <strong>Note:</strong> This timeline shows sequential execution. Steps are displayed in order by step number.
            For parallel execution analysis, use the Dependency Graph view.
          </Text>
        </Space>
      </div>
    </Card>
  );
};

export default GanttChartView;
