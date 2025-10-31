/**
 * Staging Status Board Component
 *
 * Kanban-style board for visualizing staging workflow status
 * and managing kit progression through staging stages
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Tag,
  Avatar,
  Typography,
  Space,
  Button,
  Dropdown,
  Badge,
  Progress,
  Tooltip,
  Modal,
  message,
  Select,
  Input,
  Divider
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  MoreOutlined,
  WarningOutlined,
  EnvironmentOutlined,
  BarcodeOutlined,
  EditOutlined,
  EyeOutlined,
  ArrowRightOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { useKitStore } from '../../store/kitStore';
import {
  Kit,
  KitPriority,
  KitPriorityColors,
  KitPriorityLabels
} from '../../types/kits';

dayjs.extend(relativeTime);

const { Text, Title } = Typography;
const { Option } = Select;
const { Search } = Input;

// Staging workflow stages
const STAGING_STAGES = [
  {
    id: 'planned',
    title: 'Planned',
    subtitle: 'Ready for staging',
    color: '#1890ff',
    icon: <ClockCircleOutlined />
  },
  {
    id: 'assigned',
    title: 'Assigned',
    subtitle: 'Location assigned',
    color: '#722ed1',
    icon: <EnvironmentOutlined />
  },
  {
    id: 'in-progress',
    title: 'In Progress',
    subtitle: 'Being staged',
    color: '#faad14',
    icon: <PlayCircleOutlined />
  },
  {
    id: 'staged',
    title: 'Staged',
    subtitle: 'Ready for issue',
    color: '#52c41a',
    icon: <CheckCircleOutlined />
  }
];

interface StagingItem {
  id: string;
  kitNumber: string;
  kitName: string;
  priority: KitPriority;
  workOrderNumber: string;
  partNumber: string;
  stagingLocationCode?: string;
  assignedUser?: string;
  progress: number;
  itemCount: number;
  stagedCount: number;
  shortageCount: number;
  dueDate?: string;
  startedAt?: string;
  estimatedCompletion?: string;
  issues: Array<{
    type: 'shortage' | 'delay' | 'quality';
    message: string;
    severity: 'low' | 'medium' | 'high';
  }>;
}

interface StagingStatusBoardProps {
  viewMode?: 'board' | 'list';
  filterOptions?: {
    area?: string;
    priority?: KitPriority[];
    assignedUser?: string;
  };
}

export const StagingStatusBoard: React.FC<StagingStatusBoardProps> = ({
  viewMode = 'board',
  filterOptions
}) => {
  // Store state
  const { kits, loading, fetchKits, transitionKitStatus } = useKitStore();

  // Local state
  const [boardData, setBoardData] = useState<Record<string, StagingItem[]>>({
    planned: [],
    assigned: [],
    'in-progress': [],
    staged: []
  });
  const [searchText, setSearchText] = useState('');
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<KitPriority[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>('all');
  const [dragging, setDragging] = useState(false);

  // Load and organize staging data
  useEffect(() => {
    // Mock data transformation - replace with actual data processing
    const mockStagingItems: StagingItem[] = [
      {
        id: '1',
        kitNumber: 'KIT-WO-12345-01',
        kitName: 'Engine Assembly Kit - ENG-001',
        priority: KitPriority.HIGH,
        workOrderNumber: 'WO-12345',
        partNumber: 'ENG-001',
        stagingLocationCode: 'STG-A1',
        assignedUser: 'John Smith',
        progress: 25,
        itemCount: 12,
        stagedCount: 3,
        shortageCount: 1,
        dueDate: dayjs().add(2, 'days').toISOString(),
        startedAt: dayjs().subtract(1, 'hour').toISOString(),
        issues: [
          { type: 'shortage', message: 'Part COMP-001 shortage (5 units)', severity: 'medium' }
        ]
      },
      {
        id: '2',
        kitNumber: 'KIT-WO-12346-01',
        kitName: 'Compressor Kit - COMP-002',
        priority: KitPriority.URGENT,
        workOrderNumber: 'WO-12346',
        partNumber: 'COMP-002',
        progress: 0,
        itemCount: 8,
        stagedCount: 0,
        shortageCount: 0,
        dueDate: dayjs().add(1, 'day').toISOString(),
        issues: []
      },
      {
        id: '3',
        kitNumber: 'KIT-WO-12347-01',
        kitName: 'Turbine Assembly Kit - TUR-001',
        priority: KitPriority.NORMAL,
        workOrderNumber: 'WO-12347',
        partNumber: 'TUR-001',
        stagingLocationCode: 'STG-B2',
        assignedUser: 'Sarah Johnson',
        progress: 75,
        itemCount: 15,
        stagedCount: 11,
        shortageCount: 0,
        dueDate: dayjs().add(3, 'days').toISOString(),
        startedAt: dayjs().subtract(3, 'hours').toISOString(),
        estimatedCompletion: dayjs().add(1, 'hour').toISOString(),
        issues: []
      },
      {
        id: '4',
        kitNumber: 'KIT-WO-12348-01',
        kitName: 'Fan Assembly Kit - FAN-001',
        priority: KitPriority.HIGH,
        workOrderNumber: 'WO-12348',
        partNumber: 'FAN-001',
        stagingLocationCode: 'STG-C1',
        assignedUser: 'Mike Wilson',
        progress: 100,
        itemCount: 20,
        stagedCount: 20,
        shortageCount: 0,
        dueDate: dayjs().add(1, 'day').toISOString(),
        startedAt: dayjs().subtract(6, 'hours').toISOString(),
        issues: []
      }
    ];

    // Organize items by stage
    const organized = {
      planned: mockStagingItems.filter(item => item.progress === 0 && !item.stagingLocationCode),
      assigned: mockStagingItems.filter(item => item.progress === 0 && item.stagingLocationCode),
      'in-progress': mockStagingItems.filter(item => item.progress > 0 && item.progress < 100),
      staged: mockStagingItems.filter(item => item.progress === 100)
    };

    setBoardData(organized);
  }, [kits]);

  // Handle drag and drop
  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result;
    setDragging(false);

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    // Find the item being moved
    const sourceItems = Array.from(boardData[source.droppableId]);
    const destinationItems = Array.from(boardData[destination.droppableId]);
    const movedItem = sourceItems.find(item => item.id === draggableId);

    if (!movedItem) return;

    // Remove from source
    sourceItems.splice(source.index, 1);

    // Add to destination
    destinationItems.splice(destination.index, 0, movedItem);

    // Update local state immediately for responsiveness
    setBoardData({
      ...boardData,
      [source.droppableId]: sourceItems,
      [destination.droppableId]: destinationItems
    });

    // TODO: Update backend with new status
    try {
      // Map stage to kit status
      const statusMap = {
        planned: 'PLANNED',
        assigned: 'STAGING',
        'in-progress': 'STAGING',
        staged: 'STAGED'
      };

      const newStatus = statusMap[destination.droppableId as keyof typeof statusMap];
      if (newStatus) {
        await transitionKitStatus({
          kitId: movedItem.id,
          newStatus: newStatus as any,
          reason: `Moved to ${destination.droppableId} stage`
        });
        message.success(`Kit ${movedItem.kitNumber} moved to ${destination.droppableId}`);
      }
    } catch (error) {
      // Revert on error
      setBoardData({
        ...boardData,
        [source.droppableId]: Array.from(boardData[source.droppableId]),
        [destination.droppableId]: Array.from(boardData[destination.droppableId])
      });
      message.error('Failed to update kit status');
    }
  };

  // Handle kit actions
  const handleKitAction = (action: string, item: StagingItem) => {
    switch (action) {
      case 'start':
        message.info(`Starting staging for ${item.kitNumber}`);
        break;
      case 'pause':
        message.info(`Pausing staging for ${item.kitNumber}`);
        break;
      case 'complete':
        message.info(`Completing staging for ${item.kitNumber}`);
        break;
      case 'edit':
        message.info(`Editing ${item.kitNumber}`);
        break;
      case 'view':
        message.info(`Viewing details for ${item.kitNumber}`);
        break;
      default:
        break;
    }
  };

  // Render staging item card
  const renderStagingItem = (item: StagingItem, index: number) => (
    <Draggable key={item.id} draggableId={item.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          style={{
            ...provided.draggableProps.style,
            marginBottom: 8
          }}
        >
          <Card
            size="small"
            hoverable
            style={{
              border: snapshot.isDragging ? '2px solid #1890ff' : '1px solid #d9d9d9',
              boxShadow: snapshot.isDragging ? '0 4px 12px rgba(0,0,0,0.15)' : undefined
            }}
          >
            {/* Header */}
            <div style={{ marginBottom: 8 }}>
              <Row justify="space-between" align="top">
                <Col flex="auto">
                  <Text strong style={{ fontSize: '13px' }}>{item.kitNumber}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {item.workOrderNumber} • {item.partNumber}
                  </Text>
                </Col>
                <Col>
                  <Space size={4}>
                    <Tag color={KitPriorityColors[item.priority]} style={{ fontSize: '10px', margin: 0 }}>
                      {KitPriorityLabels[item.priority]}
                    </Tag>
                    <Dropdown
                      menu={{
                        items: [
                          { key: 'view', icon: <EyeOutlined />, label: 'View Details' },
                          { key: 'edit', icon: <EditOutlined />, label: 'Edit Kit' },
                          { type: 'divider' },
                          { key: 'start', icon: <PlayCircleOutlined />, label: 'Start Staging' },
                          { key: 'pause', icon: <PauseCircleOutlined />, label: 'Pause Staging' },
                          { key: 'complete', icon: <CheckCircleOutlined />, label: 'Complete Staging' }
                        ],
                        onClick: (e) => handleKitAction(e.key, item)
                      }}
                      trigger={['click']}
                    >
                      <Button type="text" size="small" icon={<MoreOutlined />} />
                    </Dropdown>
                  </Space>
                </Col>
              </Row>
            </div>

            {/* Kit name */}
            <Text style={{ fontSize: '12px', display: 'block', marginBottom: 8 }}>
              {item.kitName}
            </Text>

            {/* Progress */}
            <div style={{ marginBottom: 8 }}>
              <Progress
                percent={item.progress}
                size="small"
                strokeColor={item.progress === 100 ? '#52c41a' : '#1890ff'}
                showInfo={false}
              />
              <Text type="secondary" style={{ fontSize: '10px' }}>
                {item.stagedCount}/{item.itemCount} items staged
                {item.shortageCount > 0 && (
                  <Text type="danger"> • {item.shortageCount} shortages</Text>
                )}
              </Text>
            </div>

            {/* Location and user */}
            {(item.stagingLocationCode || item.assignedUser) && (
              <div style={{ marginBottom: 8 }}>
                {item.stagingLocationCode && (
                  <Tag icon={<EnvironmentOutlined />} color="blue" style={{ fontSize: '10px', marginRight: 4 }}>
                    {item.stagingLocationCode}
                  </Tag>
                )}
                {item.assignedUser && (
                  <Tag icon={<UserOutlined />} color="green" style={{ fontSize: '10px' }}>
                    {item.assignedUser}
                  </Tag>
                )}
              </div>
            )}

            {/* Timing info */}
            <div style={{ marginBottom: 8 }}>
              {item.dueDate && (
                <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
                  Due: {dayjs(item.dueDate).format('MMM DD, HH:mm')}
                </Text>
              )}
              {item.startedAt && (
                <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
                  Started: {dayjs(item.startedAt).fromNow()}
                </Text>
              )}
              {item.estimatedCompletion && (
                <Text type="secondary" style={{ fontSize: '10px', display: 'block' }}>
                  Est. completion: {dayjs(item.estimatedCompletion).fromNow()}
                </Text>
              )}
            </div>

            {/* Issues */}
            {item.issues.length > 0 && (
              <div>
                {item.issues.map((issue, idx) => (
                  <Tooltip key={idx} title={issue.message}>
                    <Tag
                      color={issue.severity === 'high' ? 'red' : issue.severity === 'medium' ? 'orange' : 'yellow'}
                      style={{ fontSize: '9px', marginBottom: 2 }}
                    >
                      <WarningOutlined style={{ marginRight: 2 }} />
                      {issue.type}
                    </Tag>
                  </Tooltip>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}
    </Draggable>
  );

  // Render stage column
  const renderStageColumn = (stage: typeof STAGING_STAGES[0]) => {
    const items = boardData[stage.id] || [];

    return (
      <Col xs={24} sm={12} lg={6} key={stage.id}>
        <Card
          title={
            <Space>
              <Badge count={items.length} showZero>
                {stage.icon}
              </Badge>
              <span style={{ fontSize: '14px' }}>{stage.title}</span>
            </Space>
          }
          extra={<Text type="secondary" style={{ fontSize: '11px' }}>{stage.subtitle}</Text>}
          size="small"
          style={{ height: '70vh' }}
          headStyle={{ backgroundColor: stage.color, color: 'white', padding: '8px 12px' }}
          bodyStyle={{ padding: 8, height: 'calc(70vh - 50px)', overflowY: 'auto' }}
        >
          <Droppable droppableId={stage.id}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                style={{
                  backgroundColor: snapshot.isDraggingOver ? '#f0f0f0' : 'transparent',
                  minHeight: '100%',
                  padding: 4,
                  borderRadius: 4
                }}
              >
                {items.map((item, index) => renderStagingItem(item, index))}
                {provided.placeholder}
                {items.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
                    No items in this stage
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </Card>
      </Col>
    );
  };

  // Filter controls
  const filterControls = (
    <Row gutter={16} style={{ marginBottom: 16 }}>
      <Col flex="auto">
        <Search
          placeholder="Search kits by number, name, or work order..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          style={{ maxWidth: 400 }}
        />
      </Col>
      <Col>
        <Select
          value={selectedArea}
          onChange={setSelectedArea}
          style={{ width: 120 }}
          placeholder="Area"
        >
          <Option value="all">All Areas</Option>
          <Option value="area-a">Area A</Option>
          <Option value="area-b">Area B</Option>
          <Option value="area-c">Area C</Option>
        </Select>
      </Col>
      <Col>
        <Select
          mode="multiple"
          value={selectedPriority}
          onChange={setSelectedPriority}
          style={{ width: 150 }}
          placeholder="Priority"
        >
          {Object.values(KitPriority).map(priority => (
            <Option key={priority} value={priority}>
              {KitPriorityLabels[priority]}
            </Option>
          ))}
        </Select>
      </Col>
      <Col>
        <Select
          value={selectedUser}
          onChange={setSelectedUser}
          style={{ width: 140 }}
          placeholder="Assigned User"
        >
          <Option value="all">All Users</Option>
          <Option value="john">John Smith</Option>
          <Option value="sarah">Sarah Johnson</Option>
          <Option value="mike">Mike Wilson</Option>
        </Select>
      </Col>
    </Row>
  );

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Title level={3} style={{ marginBottom: 16 }}>
        Staging Status Board
      </Title>

      {/* Filter Controls */}
      {filterControls}

      {/* Kanban Board */}
      <DragDropContext onDragEnd={handleDragEnd} onDragStart={() => setDragging(true)}>
        <Row gutter={16}>
          {STAGING_STAGES.map(stage => renderStageColumn(stage))}
        </Row>
      </DragDropContext>
    </div>
  );
};

export default StagingStatusBoard;