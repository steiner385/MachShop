import React from 'react';
import { Card, Typography, Space, Alert } from 'antd';
import { CalendarOutlined, ProjectOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

/**
 * Production Scheduling Page (Placeholder)
 * Navigation UI Improvement - Sprint 1
 *
 * This is a placeholder page for the Production Scheduling module.
 * Full implementation with Gantt chart scheduled for Sprint 2.
 */

const SchedulingPage: React.FC = () => {
  return (
    <div style={{ padding: '24px' }}>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>
            <CalendarOutlined style={{ marginRight: 8 }} />
            Production Scheduling
          </Title>
          <Text type="secondary">
            Plan and schedule production activities across work centers
          </Text>
        </div>

        <Alert
          message="Feature Coming Soon"
          description="The Production Scheduling module with Gantt chart visualization and drag-drop scheduling is currently under development. Expected delivery: Sprint 2."
          type="info"
          showIcon
          icon={<ProjectOutlined />}
        />

        <Card title="Planned Features" bordered={false}>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Title level={4}>Interactive Gantt Chart</Title>
              <Paragraph>
                Visual timeline of work orders with drag-and-drop scheduling capabilities.
                Easily adjust schedules by moving work orders across the timeline.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Capacity Planning</Title>
              <Paragraph>
                Real-time capacity utilization heatmap showing work center load.
                Identify bottlenecks and optimize resource allocation.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Resource Allocation</Title>
              <Paragraph>
                Assign personnel, equipment, and materials to work orders.
                View resource availability and prevent over-allocation.
              </Paragraph>
            </div>

            <div>
              <Title level={4}>Schedule Optimization</Title>
              <Paragraph>
                Automated schedule suggestions based on priorities, due dates, and resource availability.
                Manual override capabilities for production planners.
              </Paragraph>
            </div>
          </Space>
        </Card>

        <Card title="Backend API Status" bordered={false}>
          <Alert
            message="API Ready"
            description="The backend API endpoint (/api/v1/production-schedules) is already available and ready for integration."
            type="success"
            showIcon
          />
        </Card>
      </Space>
    </div>
  );
};

export default SchedulingPage;
