/**
 * Kit Form Component
 *
 * Modal-based form for creating and editing kits with validation
 * using react-hook-form + Zod following MachShop patterns
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Button,
  Space,
  Row,
  Col,
  Card,
  Table,
  InputNumber,
  Typography,
  Divider,
  Alert,
  Tooltip,
  Popconfirm
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
  PlusOutlined,
  DeleteOutlined,
  SearchOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { useKitStore } from '../../store/kitStore';
import {
  Kit,
  KitPriority,
  AssemblyStage,
  KitFormData,
  KitItemFormData,
  KitPriorityLabels,
  CreateKitRequest
} from '../../types/kits';

const { Option } = Select;
const { TextArea } = Input;
const { Text, Title } = Typography;

// Zod validation schema
const kitItemSchema = z.object({
  partId: z.string().min(1, 'Part is required'),
  requiredQuantity: z.number().min(1, 'Quantity must be at least 1'),
  notes: z.string().optional()
});

const kitFormSchema = z.object({
  kitName: z.string().min(1, 'Kit name is required').max(200, 'Kit name too long'),
  workOrderId: z.string().min(1, 'Work order is required'),
  operationId: z.string().optional(),
  priority: z.nativeEnum(KitPriority),
  assemblyStage: z.nativeEnum(AssemblyStage).optional(),
  dueDate: z.string().optional(),
  notes: z.string().max(1000, 'Notes too long').optional(),
  kitItems: z.array(kitItemSchema).min(1, 'At least one kit item is required')
});

interface KitFormProps {
  visible: boolean;
  onCancel: () => void;
  kit?: Kit | null;
  mode: 'create' | 'edit';
}

export const KitForm: React.FC<KitFormProps> = ({
  visible,
  onCancel,
  kit,
  mode
}) => {
  // Store state and actions
  const {
    loading,
    error,
    createKit,
    updateKit,
    clearErrors
  } = useKitStore();

  // Local state
  const [workOrders, setWorkOrders] = useState<Array<{ id: string; workOrderNumber: string; partNumber?: string }>>([]);
  const [operations, setOperations] = useState<Array<{ id: string; operationNumber: string; operationName: string }>>([]);
  const [availableParts, setAvailableParts] = useState<Array<{ id: string; partNumber: string; partName: string; inventoryQuantity: number }>>([]);
  const [partSearchText, setPartSearchText] = useState('');

  // Form setup
  const {
    control,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors, isDirty }
  } = useForm<KitFormData>({
    resolver: zodResolver(kitFormSchema),
    defaultValues: {
      kitName: '',
      workOrderId: '',
      operationId: '',
      priority: KitPriority.NORMAL,
      assemblyStage: undefined,
      dueDate: '',
      notes: '',
      kitItems: []
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'kitItems'
  });

  const watchedWorkOrderId = watch('workOrderId');

  // Initialize form when kit changes (edit mode)
  useEffect(() => {
    if (mode === 'edit' && kit) {
      reset({
        kitName: kit.kitName,
        workOrderId: kit.workOrderId,
        operationId: kit.operationId || '',
        priority: kit.priority,
        assemblyStage: kit.assemblyStage,
        dueDate: kit.dueDate ? dayjs(kit.dueDate).format('YYYY-MM-DD') : '',
        notes: kit.notes || '',
        kitItems: kit.kitItems?.map(item => ({
          partId: item.partId,
          requiredQuantity: item.requiredQuantity,
          notes: item.notes || ''
        })) || []
      });
    } else if (mode === 'create') {
      reset({
        kitName: '',
        workOrderId: '',
        operationId: '',
        priority: KitPriority.NORMAL,
        assemblyStage: undefined,
        dueDate: '',
        notes: '',
        kitItems: []
      });
    }
  }, [kit, mode, reset]);

  // Load work orders when modal opens
  useEffect(() => {
    if (visible) {
      loadWorkOrders();
      loadAvailableParts();
      clearErrors();
    }
  }, [visible, clearErrors]);

  // Load operations when work order changes
  useEffect(() => {
    if (watchedWorkOrderId) {
      loadOperations(watchedWorkOrderId);
    }
  }, [watchedWorkOrderId]);

  // Mock data loading functions (replace with actual API calls)
  const loadWorkOrders = async () => {
    // TODO: Implement actual API call
    setWorkOrders([
      { id: '1', workOrderNumber: 'WO-12345', partNumber: 'ENG-001' },
      { id: '2', workOrderNumber: 'WO-12346', partNumber: 'ENG-002' }
    ]);
  };

  const loadOperations = async (workOrderId: string) => {
    // TODO: Implement actual API call
    setOperations([
      { id: '1', operationNumber: 'OP-010', operationName: 'Assembly' },
      { id: '2', operationNumber: 'OP-020', operationName: 'Inspection' }
    ]);
  };

  const loadAvailableParts = async () => {
    // TODO: Implement actual API call with search
    setAvailableParts([
      { id: '1', partNumber: 'COMP-001', partName: 'Component 1', inventoryQuantity: 100 },
      { id: '2', partNumber: 'COMP-002', partName: 'Component 2', inventoryQuantity: 50 },
      { id: '3', partNumber: 'COMP-003', partName: 'Component 3', inventoryQuantity: 25 }
    ]);
  };

  // Event handlers
  const onSubmit = async (data: KitFormData) => {
    try {
      const requestData: CreateKitRequest = {
        kitName: data.kitName,
        workOrderId: data.workOrderId,
        operationId: data.operationId || undefined,
        priority: data.priority,
        assemblyStage: data.assemblyStage,
        dueDate: data.dueDate || undefined,
        notes: data.notes || undefined,
        kitItems: data.kitItems.map(item => ({
          partId: item.partId,
          requiredQuantity: item.requiredQuantity,
          notes: item.notes || undefined
        }))
      };

      let success: boolean;
      if (mode === 'create') {
        success = await createKit(requestData);
      } else {
        success = await updateKit(kit!.id, requestData);
      }

      if (success) {
        reset();
        onCancel();
      }
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleAddItem = () => {
    append({
      partId: '',
      requiredQuantity: 1,
      notes: ''
    });
  };

  const handleRemoveItem = (index: number) => {
    remove(index);
  };

  const handleCancel = () => {
    if (isDirty) {
      Modal.confirm({
        title: 'Unsaved Changes',
        content: 'You have unsaved changes. Are you sure you want to close without saving?',
        okText: 'Yes, Close',
        cancelText: 'Continue Editing',
        onOk: () => {
          reset();
          onCancel();
        }
      });
    } else {
      reset();
      onCancel();
    }
  };

  // Kit items table columns
  const kitItemColumns: ColumnsType<KitItemFormData & { index: number }> = [
    {
      title: 'Part Number',
      dataIndex: 'partId',
      key: 'partId',
      render: (_, record, index) => (
        <Controller
          name={`kitItems.${index}.partId`}
          control={control}
          render={({ field, fieldState }) => (
            <Select
              {...field}
              placeholder="Select part"
              showSearch
              optionFilterProp="children"
              style={{ width: '100%' }}
              status={fieldState.error ? 'error' : undefined}
              filterOption={(input, option) =>
                option?.children?.toString().toLowerCase().includes(input.toLowerCase())
              }
            >
              {availableParts.map(part => (
                <Option key={part.id} value={part.id}>
                  {part.partNumber} - {part.partName}
                </Option>
              ))}
            </Select>
          )}
        />
      ),
      width: 300
    },
    {
      title: 'Required Qty',
      dataIndex: 'requiredQuantity',
      key: 'requiredQuantity',
      render: (_, record, index) => (
        <Controller
          name={`kitItems.${index}.requiredQuantity`}
          control={control}
          render={({ field, fieldState }) => (
            <InputNumber
              {...field}
              min={1}
              max={9999}
              style={{ width: '100%' }}
              status={fieldState.error ? 'error' : undefined}
            />
          )}
        />
      ),
      width: 120
    },
    {
      title: 'Available',
      dataIndex: 'availableQuantity',
      key: 'availableQuantity',
      render: (_, record, index) => {
        const partId = watch(`kitItems.${index}.partId`);
        const part = availableParts.find(p => p.id === partId);
        const requiredQty = watch(`kitItems.${index}.requiredQuantity`) || 0;
        const availableQty = part?.inventoryQuantity || 0;
        const isShortage = requiredQty > availableQty;

        return (
          <Text type={isShortage ? 'danger' : 'success'}>
            {availableQty}
            {isShortage && (
              <Tooltip title={`Shortage: ${requiredQty - availableQty} units`}>
                <InfoCircleOutlined style={{ marginLeft: 4, color: '#ff4d4f' }} />
              </Tooltip>
            )}
          </Text>
        );
      },
      width: 100
    },
    {
      title: 'Notes',
      dataIndex: 'notes',
      key: 'notes',
      render: (_, record, index) => (
        <Controller
          name={`kitItems.${index}.notes`}
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              placeholder="Optional notes"
              style={{ width: '100%' }}
            />
          )}
        />
      ),
      width: 200
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record, index) => (
        <Popconfirm
          title="Remove this item?"
          onConfirm={() => handleRemoveItem(index)}
        >
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            danger
          />
        </Popconfirm>
      ),
      width: 80
    }
  ];

  const tableData = fields.map((field, index) => ({
    ...field,
    key: field.id,
    index
  }));

  return (
    <Modal
      title={mode === 'create' ? 'Create New Kit' : 'Edit Kit'}
      open={visible}
      onCancel={handleCancel}
      width={1000}
      footer={[
        <Button key="cancel" onClick={handleCancel}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={loading.creating || loading.updating}
          onClick={handleSubmit(onSubmit)}
        >
          {mode === 'create' ? 'Create Kit' : 'Update Kit'}
        </Button>
      ]}
      destroyOnClose
    >
      {/* Error Alert */}
      {error.general && (
        <Alert
          message="Error"
          description={error.general}
          type="error"
          closable
          onClose={clearErrors}
          style={{ marginBottom: 16 }}
        />
      )}

      <Form layout="vertical">
        {/* Basic Information */}
        <Card title="Kit Information" size="small" style={{ marginBottom: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="Kit Name"
                validateStatus={errors.kitName ? 'error' : ''}
                help={errors.kitName?.message}
                required
              >
                <Controller
                  name="kitName"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      placeholder="Enter kit name"
                      maxLength={200}
                      showCount
                    />
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Priority"
                validateStatus={errors.priority ? 'error' : ''}
                help={errors.priority?.message}
                required
              >
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} placeholder="Select priority">
                      {Object.values(KitPriority).map(priority => (
                        <Option key={priority} value={priority}>
                          {KitPriorityLabels[priority]}
                        </Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                label="Due Date"
                validateStatus={errors.dueDate ? 'error' : ''}
                help={errors.dueDate?.message}
              >
                <Controller
                  name="dueDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      {...field}
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(date) => field.onChange(date?.format('YYYY-MM-DD'))}
                      style={{ width: '100%' }}
                      placeholder="Select due date"
                    />
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                label="Work Order"
                validateStatus={errors.workOrderId ? 'error' : ''}
                help={errors.workOrderId?.message}
                required
              >
                <Controller
                  name="workOrderId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select work order"
                      showSearch
                      optionFilterProp="children"
                    >
                      {workOrders.map(wo => (
                        <Option key={wo.id} value={wo.id}>
                          {wo.workOrderNumber} {wo.partNumber && `- ${wo.partNumber}`}
                        </Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Operation (Optional)"
                validateStatus={errors.operationId ? 'error' : ''}
                help={errors.operationId?.message}
              >
                <Controller
                  name="operationId"
                  control={control}
                  render={({ field }) => (
                    <Select
                      {...field}
                      placeholder="Select operation"
                      allowClear
                      disabled={!watchedWorkOrderId}
                    >
                      {operations.map(op => (
                        <Option key={op.id} value={op.id}>
                          {op.operationNumber} - {op.operationName}
                        </Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                label="Assembly Stage"
                validateStatus={errors.assemblyStage ? 'error' : ''}
                help={errors.assemblyStage?.message}
              >
                <Controller
                  name="assemblyStage"
                  control={control}
                  render={({ field }) => (
                    <Select {...field} placeholder="Select stage" allowClear>
                      {Object.values(AssemblyStage).map(stage => (
                        <Option key={stage} value={stage}>
                          {stage}
                        </Option>
                      ))}
                    </Select>
                  )}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Notes"
            validateStatus={errors.notes ? 'error' : ''}
            help={errors.notes?.message}
          >
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <TextArea
                  {...field}
                  placeholder="Optional notes about this kit"
                  rows={3}
                  maxLength={1000}
                  showCount
                />
              )}
            />
          </Form.Item>
        </Card>

        {/* Kit Items */}
        <Card
          title={
            <Space>
              <span>Kit Items</span>
              {errors.kitItems && (
                <Text type="danger" style={{ fontSize: '12px' }}>
                  {typeof errors.kitItems === 'object' && 'message' in errors.kitItems
                    ? errors.kitItems.message
                    : 'At least one item is required'}
                </Text>
              )}
            </Space>
          }
          extra={
            <Button
              type="primary"
              size="small"
              icon={<PlusOutlined />}
              onClick={handleAddItem}
            >
              Add Item
            </Button>
          }
          size="small"
        >
          <Table
            columns={kitItemColumns}
            dataSource={tableData}
            pagination={false}
            size="small"
            locale={{
              emptyText: 'No kit items added. Click "Add Item" to get started.'
            }}
            scroll={{ y: 300 }}
          />
        </Card>
      </Form>
    </Modal>
  );
};

export default KitForm;