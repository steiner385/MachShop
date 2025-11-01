/**
 * NCR State Visualizer Component
 *
 * Displays the current NCR workflow state with visual indicators:
 * - State timeline showing progression from DRAFT to CLOSED
 * - Visual state transitions with valid next states
 * - Required fields for state transitions
 * - Approval requirements and status
 * - State history timeline
 *
 * Supports aerospace quality states:
 * DRAFT → SUBMITTED → UNDER_INVESTIGATION → CONTAINMENT → PENDING_DISPOSITION
 *         ↓              ↓                                  ↓
 *       CANCELLED    CANCELLED                    CTP/DDR/MRB
 *                                                    ↓
 *                                            CORRECTIVE_ACTION
 *                                                    ↓
 *                                                VERIFICATION
 *                                                    ↓
 *                                                  CLOSED
 */

import React, { useMemo } from 'react';
import {
  Card,
  Timeline,
  Tag,
  Button,
  Space,
  Tooltip,
  Empty,
  Divider,
  Row,
  Col,
  Statistic,
  Alert,
  Badge,
} from 'antd';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ArrowRightOutlined,
  FileTextOutlined,
  CheckOutlined,
  LockOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

/**
 * NCR State Type
 */
type NCRState =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'UNDER_INVESTIGATION'
  | 'CONTAINMENT'
  | 'PENDING_DISPOSITION'
  | 'CTP'
  | 'DDR'
  | 'MRB'
  | 'CORRECTIVE_ACTION'
  | 'VERIFICATION'
  | 'CLOSED'
  | 'CANCELLED';

/**
 * State history entry
 */
export interface StateHistoryEntry {
  id: string;
  fromState: NCRState;
  toState: NCRState;
  changedBy: string;
  changedByName?: string;
  changeReason?: string;
  approvalRequired: boolean;
  approvedAt: Date;
  createdAt?: Date;
}

/**
 * Available transition
 */
export interface AvailableTransition {
  toState: NCRState;
  description: string;
  requiresApproval: boolean;
  requiredFields: string[];
  requiredRole?: string;
}

/**
 * NCR State Visualizer Props
 */
interface NCRStateVisualizerProps {
  /** Current NCR status */
  currentState: NCRState;
  /** NCR number for reference */
  ncrNumber: string;
  /** Available transitions from current state */
  availableTransitions: AvailableTransition[];
  /** State history */
  stateHistory: StateHistoryEntry[];
  /** Whether NCR can transition */
  canTransition?: boolean;
  /** Current user role for role-based transitions */
  userRole?: string;
  /** Days in current state */
  daysInState?: number;
  /** Missing required fields for transition */
  missingRequiredFields?: string[];
  /** Callback when transition is selected */
  onTransitionSelect?: (toState: NCRState) => void;
  /** Loading state */
  isLoading?: boolean;
}

/**
 * State color mapping for visual feedback
 */
const STATE_COLORS: Record<NCRState, string> = {
  DRAFT: '#d9d9d9',
  SUBMITTED: '#1890ff',
  UNDER_INVESTIGATION: '#faad14',
  CONTAINMENT: '#ff7a45',
  PENDING_DISPOSITION: '#722ed1',
  CTP: '#13c2c2',
  DDR: '#eb2f96',
  MRB: '#722ed1',
  CORRECTIVE_ACTION: '#fa8c16',
  VERIFICATION: '#52c41a',
  CLOSED: '#595959',
  CANCELLED: '#ff4d4f',
};

/**
 * State descriptions for tooltips
 */
const STATE_DESCRIPTIONS: Record<NCRState, string> = {
  DRAFT: 'Initial state - NCR being prepared',
  SUBMITTED: 'NCR submitted for review',
  UNDER_INVESTIGATION: 'Root cause analysis in progress',
  CONTAINMENT: 'Containment actions being implemented',
  PENDING_DISPOSITION: 'Awaiting disposition decision',
  CTP: 'Continue to Process disposition approved',
  DDR: 'Delayed Disposition Required',
  MRB: 'Material Review Board evaluation',
  CORRECTIVE_ACTION: 'Corrective/Preventive Actions in progress',
  VERIFICATION: 'Effectiveness verification in progress',
  CLOSED: 'NCR closed and complete',
  CANCELLED: 'NCR cancelled',
};

/**
 * NCR State Visualizer Component
 */
export const NCRStateVisualizer: React.FC<NCRStateVisualizerProps> = ({
  currentState,
  ncrNumber,
  availableTransitions,
  stateHistory,
  canTransition = true,
  userRole,
  daysInState,
  missingRequiredFields = [],
  onTransitionSelect,
  isLoading = false,
}) => {
  /**
   * Get state badge color based on urgency
   */
  const getStateBadgeColor = (state: NCRState): string => {
    switch (state) {
      case 'DRAFT':
      case 'SUBMITTED':
        return 'blue';
      case 'UNDER_INVESTIGATION':
      case 'CONTAINMENT':
        return 'orange';
      case 'PENDING_DISPOSITION':
      case 'MRB':
        return 'purple';
      case 'CTP':
      case 'DDR':
        return 'cyan';
      case 'CORRECTIVE_ACTION':
        return 'gold';
      case 'VERIFICATION':
        return 'green';
      case 'CLOSED':
        return 'default';
      case 'CANCELLED':
        return 'red';
      default:
        return 'default';
    }
  };

  /**
   * Render state transition with arrow
   */
  const renderTransition = (fromState: NCRState, toState: NCRState) => (
    <Space key={`${fromState}-${toState}`} size={0}>
      <Tag color={getStateBadgeColor(fromState)}>{fromState}</Tag>
      <ArrowRightOutlined />
      <Tag color={getStateBadgeColor(toState)}>{toState}</Tag>
    </Space>
  );

  /**
   * Calculate days in current state
   */
  const displayDaysInState = useMemo(() => {
    if (daysInState !== undefined) {
      return daysInState;
    }
    // Calculate from last state change
    if (stateHistory.length > 0) {
      const lastChange = stateHistory[0];
      return dayjs().diff(dayjs(lastChange.approvedAt), 'day');
    }
    return 0;
  }, [daysInState, stateHistory]);

  /**
   * Check if state is final (no further transitions)
   */
  const isFinalState = currentState === 'CLOSED' || currentState === 'CANCELLED';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Current State Overview */}
      <Card
        title={
          <Space>
            <FileTextOutlined />
            <span>NCR {ncrNumber} - State Overview</span>
          </Space>
        }
        loading={isLoading}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Current State"
              value={
                <Tooltip title={STATE_DESCRIPTIONS[currentState]}>
                  <Badge
                    color={STATE_COLORS[currentState]}
                    text={
                      <Tag color={getStateBadgeColor(currentState)} style={{ marginLeft: 8 }}>
                        {currentState}
                      </Tag>
                    }
                  />
                </Tooltip>
              }
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Days in State"
              value={displayDaysInState}
              suffix="days"
              prefix={<CalendarOutlined />}
              valueStyle={{
                color: displayDaysInState > 7 ? '#ff4d4f' : displayDaysInState > 3 ? '#faad14' : '#52c41a',
              }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="State Changes"
              value={stateHistory.length}
              prefix={<CheckOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Status"
              value={
                isFinalState ? (
                  <Tag color={currentState === 'CLOSED' ? 'green' : 'red'}>
                    {currentState === 'CLOSED' ? 'Complete' : 'Cancelled'}
                  </Tag>
                ) : (
                  <Tag color="processing">In Progress</Tag>
                )
              }
            />
          </Col>
        </Row>

        {/* Alerts for missing requirements */}
        {missingRequiredFields.length > 0 && (
          <>
            <Divider />
            <Alert
              type="warning"
              showIcon
              message="Missing Required Fields for Transition"
              description={
                <ul style={{ marginBottom: 0, marginTop: 8 }}>
                  {missingRequiredFields.map((field) => (
                    <li key={field}>{field}</li>
                  ))}
                </ul>
              }
            />
          </>
        )}

        {/* Final state notification */}
        {isFinalState && (
          <>
            <Divider />
            <Alert
              type="info"
              showIcon
              icon={<LockOutlined />}
              message={`NCR is ${currentState === 'CLOSED' ? 'closed' : 'cancelled'} - no further transitions allowed`}
            />
          </>
        )}
      </Card>

      {/* Available Transitions */}
      {!isFinalState && availableTransitions.length > 0 && (
        <Card
          title={
            <Space>
              <ArrowRightOutlined />
              <span>Available Transitions ({availableTransitions.length})</span>
            </Space>
          }
          loading={isLoading}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {availableTransitions.map((transition) => {
              const hasRequiredFields = missingRequiredFields.length === 0;
              const isAllowedByRole = !transition.requiredRole || transition.requiredRole === userRole;
              const canExecute = hasRequiredFields && isAllowedByRole && canTransition;

              return (
                <Card
                  key={transition.toState}
                  size="small"
                  style={{
                    background: canExecute ? '#fafafa' : '#f5f5f5',
                    border: canExecute ? '1px solid #1890ff' : '1px solid #d9d9d9',
                  }}
                >
                  <Row align="middle" justify="space-between">
                    <Col flex="auto">
                      <Space direction="vertical" size={0} style={{ width: '100%' }}>
                        <Space>
                          <Tag color={getStateBadgeColor(currentState)}>{currentState}</Tag>
                          <ArrowRightOutlined />
                          <Tag color={getStateBadgeColor(transition.toState)}>
                            {transition.toState}
                          </Tag>
                        </Space>
                        <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>
                          {transition.description}
                        </div>
                        {transition.requiredFields.length > 0 && (
                          <div
                            style={{
                              color: '#999',
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            Required fields: {transition.requiredFields.join(', ')}
                          </div>
                        )}
                        {transition.requiresApproval && (
                          <div
                            style={{
                              color: '#1890ff',
                              fontSize: 12,
                              marginTop: 4,
                            }}
                          >
                            <LockOutlined /> Requires approval
                          </div>
                        )}
                      </Space>
                    </Col>
                    <Col style={{ marginLeft: 16 }}>
                      <Tooltip
                        title={
                          !canExecute
                            ? !hasRequiredFields
                              ? 'Missing required fields'
                              : !isAllowedByRole
                              ? `Requires ${transition.requiredRole} role`
                              : 'Transition not available'
                            : ''
                        }
                      >
                        <Button
                          type="primary"
                          disabled={!canExecute}
                          loading={isLoading}
                          onClick={() => onTransitionSelect?.(transition.toState)}
                        >
                          Transition
                        </Button>
                      </Tooltip>
                    </Col>
                  </Row>
                </Card>
              );
            })}
          </Space>
        </Card>
      )}

      {/* No Transitions Available */}
      {!isFinalState && availableTransitions.length === 0 && (
        <Card
          title={
            <Space>
              <ArrowRightOutlined />
              <span>Available Transitions</span>
            </Space>
          }
        >
          <Empty
            description="No transitions available from current state"
            style={{ paddingTop: 24, paddingBottom: 24 }}
          />
        </Card>
      )}

      {/* State History Timeline */}
      {stateHistory.length > 0 && (
        <Card
          title={
            <Space>
              <ClockCircleOutlined />
              <span>State Change History ({stateHistory.length})</span>
            </Space>
          }
          loading={isLoading}
        >
          <Timeline
            items={stateHistory.map((entry, index) => ({
              color:
                entry.toState === 'CLOSED'
                  ? 'green'
                  : entry.toState === 'CANCELLED'
                  ? 'red'
                  : 'blue',
              dot:
                index === 0 ? (
                  <CheckCircleOutlined style={{ fontSize: 16 }} />
                ) : (
                  <ClockCircleOutlined style={{ fontSize: 16 }} />
                ),
              children: (
                <div>
                  <div style={{ marginBottom: 4 }}>
                    <Space>
                      <Tag color={getStateBadgeColor(entry.fromState)}>{entry.fromState}</Tag>
                      <ArrowRightOutlined />
                      <Tag color={getStateBadgeColor(entry.toState)}>{entry.toState}</Tag>
                    </Space>
                  </div>
                  <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                    By: <strong>{entry.changedByName || entry.changedBy}</strong>
                  </div>
                  {entry.changeReason && (
                    <div style={{ color: '#666', fontSize: 13, marginBottom: 4 }}>
                      Reason: {entry.changeReason}
                    </div>
                  )}
                  <div style={{ color: '#999', fontSize: 12 }}>
                    <Tooltip title={dayjs(entry.approvedAt).format('MMMM D, YYYY h:mm A')}>
                      {dayjs(entry.approvedAt).fromNow()}
                    </Tooltip>
                    {entry.approvalRequired && (
                      <Tag color="blue" style={{ marginLeft: 8 }}>
                        Approved
                      </Tag>
                    )}
                  </div>
                </div>
              ),
            }))}
          />
        </Card>
      )}
    </div>
  );
};

export default NCRStateVisualizer;
