import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  Card,
  Button,
  Space,
  Typography,
  Alert,
  Radio,
  Divider,
  Timeline,
  Avatar,
  Tag,
  Tabs,
  Input,
  message,
  Tooltip,
  Badge,
  Collapse,
  Descriptions,
} from 'antd';
import {
  ExclamationCircleOutlined,
  UserOutlined,
  ClockCircleOutlined,
  MergeOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  HistoryOutlined,
  FileTextOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { formatDistanceToNow, format } from 'date-fns';
import { diff_match_patch } from 'diff-match-patch';
import { collaborationApi } from '@/api/collaboration';
import { useConflictDetection } from '@/hooks/useRealTimeCollaboration';

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Panel } = Collapse;

interface ConflictData {
  id: string;
  documentType: string;
  documentId: string;
  documentTitle: string;
  conflictType: 'CONTENT' | 'METADATA' | 'STRUCTURE';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  description: string;
  users: ConflictUser[];
  changes: ConflictChange[];
  baseVersion: string;
  createdAt: string;
  resolved: boolean;
  resolution?: ConflictResolution;
}

interface ConflictUser {
  userId: string;
  userName: string;
  lastEditTime: string;
  changes: number;
}

interface ConflictChange {
  id: string;
  userId: string;
  userName: string;
  timestamp: string;
  type: 'INSERT' | 'DELETE' | 'MODIFY';
  field: string;
  oldValue: any;
  newValue: any;
  conflictsWith: string[];
}

interface ConflictResolution {
  strategy: 'ACCEPT_CURRENT' | 'ACCEPT_INCOMING' | 'MERGE_MANUAL' | 'MERGE_AUTO';
  resolvedBy: string;
  resolvedAt: string;
  finalValue: any;
  notes?: string;
}

interface ConflictResolutionProps {
  documentType: string;
  documentId: string;
  currentUserId: string;
  currentUserName: string;
  className?: string;
}

/**
 * Conflict Resolution Component
 * Handles detection and resolution of concurrent editing conflicts
 */
export const ConflictResolution: React.FC<ConflictResolutionProps> = ({
  documentType,
  documentId,
  currentUserId,
  currentUserName,
  className,
}) => {
  // State
  const [activeConflicts, setActiveConflicts] = useState<ConflictData[]>([]);
  const [selectedConflict, setSelectedConflict] = useState<ConflictData | null>(null);
  const [resolutionStrategy, setResolutionStrategy] = useState<ConflictResolution['strategy']>('MERGE_MANUAL');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  // Conflict detection hook
  const { conflicts, hasConflicts, conflictCount, resolveConflict } = useConflictDetection(
    documentType,
    documentId,
    (conflict) => {
      message.warning(`Conflict detected: ${conflict.data.message}`);
      loadActiveConflicts();
    }
  );

  // Load active conflicts
  const loadActiveConflicts = useCallback(async () => {
    try {
      const response = await collaborationApi.getDocumentConflicts(documentType, documentId);
      setActiveConflicts(response.data);
    } catch (error: any) {
      console.error('Failed to load conflicts:', error);
    }
  }, [documentType, documentId]);

  // Initial load
  useEffect(() => {
    loadActiveConflicts();
  }, [loadActiveConflicts]);

  // Handle conflict selection
  const handleSelectConflict = useCallback((conflict: ConflictData) => {
    setSelectedConflict(conflict);
    setResolutionStrategy('MERGE_MANUAL');
    setResolutionNotes('');
  }, []);

  // Handle conflict resolution
  const handleResolveConflict = useCallback(async () => {
    if (!selectedConflict) return;

    setIsResolving(true);

    try {
      const resolution: ConflictResolution = {
        strategy: resolutionStrategy,
        resolvedBy: currentUserId,
        resolvedAt: new Date().toISOString(),
        finalValue: {}, // This would contain the resolved content
        notes: resolutionNotes.trim() || undefined,
      };

      await collaborationApi.resolveConflict(selectedConflict.id, resolution);

      // Update local state
      resolveConflict(selectedConflict.id);
      setActiveConflicts(prev => prev.filter(c => c.id !== selectedConflict.id));
      setSelectedConflict(null);

      message.success('Conflict resolved successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to resolve conflict');
    } finally {
      setIsResolving(false);
    }
  }, [selectedConflict, resolutionStrategy, resolutionNotes, currentUserId, resolveConflict]);

  // Generate diff visualization
  const generateDiff = useCallback((change: ConflictChange) => {
    if (typeof change.oldValue !== 'string' || typeof change.newValue !== 'string') {
      return null;
    }

    const dmp = new diff_match_patch();
    const diffs = dmp.diff_main(change.oldValue, change.newValue);
    dmp.diff_cleanupSemantic(diffs);

    return diffs.map((diff, index) => {
      const [operation, text] = diff;
      let className = '';
      let style = {};

      switch (operation) {
        case 1: // Insert
          className = 'diff-insert';
          style = { backgroundColor: '#b7eb8f', padding: '2px 4px' };
          break;
        case -1: // Delete
          className = 'diff-delete';
          style = { backgroundColor: '#ffadd2', padding: '2px 4px', textDecoration: 'line-through' };
          break;
        default: // Equal
          className = 'diff-equal';
          break;
      }

      return (
        <span key={index} className={className} style={style}>
          {text}
        </span>
      );
    });
  }, []);

  // Get conflict severity color
  const getSeverityColor = (severity: ConflictData['severity']) => {
    switch (severity) {
      case 'LOW': return '#52c41a';
      case 'MEDIUM': return '#faad14';
      case 'HIGH': return '#ff4d4f';
      case 'CRITICAL': return '#722ed1';
      default: return '#8c8c8c';
    }
  };

  // Get conflict type icon
  const getConflictTypeIcon = (type: ConflictData['conflictType']) => {
    switch (type) {
      case 'CONTENT': return <EditOutlined />;
      case 'METADATA': return <FileTextOutlined />;
      case 'STRUCTURE': return <MergeOutlined />;
      default: return <ExclamationCircleOutlined />;
    }
  };

  return (
    <div className={className}>
      {/* Conflict Indicator */}
      {hasConflicts && (
        <Alert
          message={`${conflictCount} conflict${conflictCount > 1 ? 's' : ''} detected`}
          description="Multiple users are editing this document simultaneously. Click to resolve conflicts."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          action={
            <Button
              size="small"
              type="primary"
              onClick={() => setSelectedConflict(activeConflicts[0] || null)}
            >
              Resolve
            </Button>
          }
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Active Conflicts List */}
      {activeConflicts.length > 0 && (
        <Card
          title={
            <Space>
              <ExclamationCircleOutlined />
              <Text strong>Active Conflicts ({activeConflicts.length})</Text>
            </Space>
          }
          size="small"
          style={{ marginBottom: '16px' }}
        >
          {activeConflicts.map(conflict => (
            <Card
              key={conflict.id}
              size="small"
              style={{ marginBottom: '8px' }}
              onClick={() => handleSelectConflict(conflict)}
              hoverable
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space>
                  {getConflictTypeIcon(conflict.conflictType)}
                  <Text strong>{conflict.description}</Text>
                  <Tag color={getSeverityColor(conflict.severity)}>
                    {conflict.severity}
                  </Tag>
                </Space>
                <Space>
                  <Text type="secondary">
                    {conflict.users.length} user{conflict.users.length > 1 ? 's' : ''}
                  </Text>
                  <Text type="secondary">
                    {formatDistanceToNow(new Date(conflict.createdAt), { addSuffix: true })}
                  </Text>
                </Space>
              </div>
            </Card>
          ))}
        </Card>
      )}

      {/* Conflict Resolution Modal */}
      <Modal
        title={
          <Space>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <Text strong>Resolve Conflict</Text>
          </Space>
        }
        open={!!selectedConflict}
        onCancel={() => setSelectedConflict(null)}
        footer={[
          <Button key="cancel" onClick={() => setSelectedConflict(null)}>
            Cancel
          </Button>,
          <Button
            key="resolve"
            type="primary"
            loading={isResolving}
            onClick={handleResolveConflict}
            icon={<CheckOutlined />}
          >
            Resolve Conflict
          </Button>,
        ]}
        width={900}
        style={{ top: 20 }}
      >
        {selectedConflict && (
          <div>
            {/* Conflict Overview */}
            <Card size="small" style={{ marginBottom: '16px' }}>
              <Descriptions column={2} size="small">
                <Descriptions.Item label="Document">
                  {selectedConflict.documentTitle || `${selectedConflict.documentType} #${selectedConflict.documentId}`}
                </Descriptions.Item>
                <Descriptions.Item label="Type">
                  <Space>
                    {getConflictTypeIcon(selectedConflict.conflictType)}
                    {selectedConflict.conflictType}
                  </Space>
                </Descriptions.Item>
                <Descriptions.Item label="Severity">
                  <Tag color={getSeverityColor(selectedConflict.severity)}>
                    {selectedConflict.severity}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Time">
                  {format(new Date(selectedConflict.createdAt), 'PPpp')}
                </Descriptions.Item>
                <Descriptions.Item label="Users Involved" span={2}>
                  <Space>
                    {selectedConflict.users.map(user => (
                      <Tooltip
                        key={user.userId}
                        title={`Last edit: ${formatDistanceToNow(new Date(user.lastEditTime), { addSuffix: true })}`}
                      >
                        <Badge count={user.changes} size="small">
                          <Avatar size="small" icon={<UserOutlined />}>
                            {user.userName[0]?.toUpperCase()}
                          </Avatar>
                        </Badge>
                      </Tooltip>
                    ))}
                  </Space>
                </Descriptions.Item>
              </Descriptions>
            </Card>

            {/* Conflict Details */}
            <Tabs
              defaultActiveKey="changes"
              items={[
                {
                  key: 'changes',
                  label: 'Changes',
                  children: (
                    <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                      <Timeline>
                        {selectedConflict.changes.map(change => (
                          <Timeline.Item
                            key={change.id}
                            dot={
                              <Avatar
                                size="small"
                                style={{
                                  backgroundColor: change.type === 'INSERT' ? '#52c41a' :
                                    change.type === 'DELETE' ? '#ff4d4f' : '#faad14'
                                }}
                              >
                                {change.type === 'INSERT' ? '+' :
                                  change.type === 'DELETE' ? '-' : '~'}
                              </Avatar>
                            }
                          >
                            <div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Space>
                                  <Text strong>{change.userName}</Text>
                                  <Tag size="small">{change.type}</Tag>
                                  <Text type="secondary">{change.field}</Text>
                                </Space>
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {formatDistanceToNow(new Date(change.timestamp), { addSuffix: true })}
                                </Text>
                              </div>

                              {/* Diff visualization */}
                              <Collapse ghost size="small" style={{ marginTop: '8px' }}>
                                <Panel header="View Changes" key="diff">
                                  <div style={{ backgroundColor: '#fafafa', padding: '8px', borderRadius: '4px' }}>
                                    {generateDiff(change)}
                                  </div>
                                </Panel>
                              </Collapse>

                              {/* Conflicts with */}
                              {change.conflictsWith.length > 0 && (
                                <div style={{ marginTop: '8px' }}>
                                  <Text type="danger" style={{ fontSize: '12px' }}>
                                    Conflicts with {change.conflictsWith.length} other change{change.conflictsWith.length > 1 ? 's' : ''}
                                  </Text>
                                </div>
                              )}
                            </div>
                          </Timeline.Item>
                        ))}
                      </Timeline>
                    </div>
                  ),
                },
                {
                  key: 'resolution',
                  label: 'Resolution Strategy',
                  children: (
                    <div>
                      <Title level={5}>Choose Resolution Strategy</Title>
                      <Radio.Group
                        value={resolutionStrategy}
                        onChange={(e) => setResolutionStrategy(e.target.value)}
                        style={{ width: '100%' }}
                      >
                        <Space direction="vertical" style={{ width: '100%' }}>
                          <Radio value="ACCEPT_CURRENT">
                            <div>
                              <Text strong>Accept Current Version</Text>
                              <div style={{ marginLeft: '24px', color: '#666' }}>
                                Keep the currently saved version and discard conflicting changes
                              </div>
                            </div>
                          </Radio>
                          <Radio value="ACCEPT_INCOMING">
                            <div>
                              <Text strong>Accept Incoming Changes</Text>
                              <div style={{ marginLeft: '24px', color: '#666' }}>
                                Apply all incoming changes and overwrite current version
                              </div>
                            </div>
                          </Radio>
                          <Radio value="MERGE_AUTO">
                            <div>
                              <Text strong>Auto-merge (Recommended)</Text>
                              <div style={{ marginLeft: '24px', color: '#666' }}>
                                Automatically merge compatible changes
                              </div>
                            </div>
                          </Radio>
                          <Radio value="MERGE_MANUAL">
                            <div>
                              <Text strong>Manual Merge</Text>
                              <div style={{ marginLeft: '24px', color: '#666' }}>
                                Manually review and merge each conflict
                              </div>
                            </div>
                          </Radio>
                        </Space>
                      </Radio.Group>

                      <Divider />

                      <Title level={5}>Resolution Notes</Title>
                      <TextArea
                        placeholder="Add notes about this resolution (optional)..."
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        rows={3}
                      />
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ConflictResolution;