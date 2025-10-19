import React, { useState } from 'react';
import {
  Card,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Upload,
  message,
  Popconfirm,
  Tag,
  Collapse,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  HolderOutlined,
  FileImageOutlined,
  FileTextOutlined,
  VideoCameraOutlined,
  ExclamationCircleOutlined,
  SignatureOutlined,
} from '@ant-design/icons';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { WorkInstructionStep, CreateStepInput, UpdateStepInput } from '@/api/workInstructions';
import { uploadAPI } from '@/api/workInstructions';
import type { UploadFile, UploadProps } from 'antd/es/upload';

const { TextArea } = Input;
const { Panel } = Collapse;

interface WorkInstructionStepEditorProps {
  workInstructionId: string;
  steps: WorkInstructionStep[];
  onAddStep: (data: CreateStepInput) => Promise<void>;
  onUpdateStep: (stepId: string, data: UpdateStepInput) => Promise<void>;
  onDeleteStep: (stepId: string) => Promise<void>;
  onReorderSteps: (stepOrders: { stepId: string; stepNumber: number }[]) => Promise<void>;
  isEditable: boolean;
}

/**
 * Sortable Step Item Component
 */
interface SortableStepItemProps {
  step: WorkInstructionStep;
  onEdit: () => void;
  onDelete: () => void;
  isEditable: boolean;
}

const SortableStepItem: React.FC<SortableStepItemProps> = ({
  step,
  onEdit,
  onDelete,
  isEditable,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <Card
        size="small"
        style={{ marginBottom: '12px' }}
        title={
          <Space>
            {isEditable && (
              <HolderOutlined
                {...listeners}
                {...attributes}
                style={{ cursor: 'grab', fontSize: '16px' }}
              />
            )}
            <span>Step {step.stepNumber}: {step.title}</span>
            {step.isCritical && (
              <Tag color="red" icon={<ExclamationCircleOutlined />}>Critical</Tag>
            )}
            {step.requiresSignature && (
              <Tag color="blue" icon={<SignatureOutlined />}>Signature Required</Tag>
            )}
          </Space>
        }
        extra={
          isEditable && (
            <Space>
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={onEdit}
              />
              <Popconfirm
                title="Delete this step?"
                onConfirm={onDelete}
                okText="Yes"
                cancelText="No"
                okButtonProps={{ danger: true }}
              >
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                />
              </Popconfirm>
            </Space>
          )
        }
      >
        <p style={{ marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{step.content}</p>

        {/* Media Display */}
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {step.imageUrls && step.imageUrls.length > 0 && (
            <div>
              <FileImageOutlined style={{ marginRight: '8px' }} />
              <span style={{ color: '#666' }}>{step.imageUrls.length} image(s)</span>
            </div>
          )}
          {step.videoUrls && step.videoUrls.length > 0 && (
            <div>
              <VideoCameraOutlined style={{ marginRight: '8px' }} />
              <span style={{ color: '#666' }}>{step.videoUrls.length} video(s)</span>
            </div>
          )}
          {step.attachmentUrls && step.attachmentUrls.length > 0 && (
            <div>
              <FileTextOutlined style={{ marginRight: '8px' }} />
              <span style={{ color: '#666' }}>{step.attachmentUrls.length} attachment(s)</span>
            </div>
          )}
          {step.estimatedDuration && (
            <div>
              <span style={{ color: '#666' }}>
                Est. Duration: {Math.floor(step.estimatedDuration / 60)} min {step.estimatedDuration % 60} sec
              </span>
            </div>
          )}
        </Space>
      </Card>
    </div>
  );
};

/**
 * Work Instruction Step Editor Component
 *
 * Manages steps with drag-and-drop reordering, CRUD operations, and file uploads
 */
export const WorkInstructionStepEditor: React.FC<WorkInstructionStepEditorProps> = ({
  workInstructionId,
  steps,
  onAddStep,
  onUpdateStep,
  onDeleteStep,
  onReorderSteps,
  isEditable,
}) => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingStep, setEditingStep] = useState<WorkInstructionStep | null>(null);
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [imageFileList, setImageFileList] = useState<UploadFile[]>([]);
  const [videoFileList, setVideoFileList] = useState<UploadFile[]>([]);
  const [attachmentFileList, setAttachmentFileList] = useState<UploadFile[]>([]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = steps.findIndex((step) => step.id === active.id);
      const newIndex = steps.findIndex((step) => step.id === over?.id);

      const reorderedSteps = arrayMove(steps, oldIndex, newIndex);

      // Create step orders for API
      const stepOrders = reorderedSteps.map((step, index) => ({
        stepId: step.id,
        stepNumber: index + 1,
      }));

      try {
        await onReorderSteps(stepOrders);
        message.success('Steps reordered successfully');
      } catch (error: any) {
        message.error(error.message || 'Failed to reorder steps');
      }
    }
  };

  // Open modal for adding/editing
  const handleOpenModal = (step?: WorkInstructionStep) => {
    if (step) {
      setEditingStep(step);
      form.setFieldsValue({
        title: step.title,
        content: step.content,
        estimatedDuration: step.estimatedDuration,
        isCritical: step.isCritical,
        requiresSignature: step.requiresSignature,
      });
    } else {
      setEditingStep(null);
      form.resetFields();
      form.setFieldsValue({
        stepNumber: steps.length + 1,
        isCritical: false,
        requiresSignature: false,
      });
    }
    setImageFileList([]);
    setVideoFileList([]);
    setAttachmentFileList([]);
    setIsModalVisible(true);
  };

  // Close modal
  const handleCloseModal = () => {
    setIsModalVisible(false);
    setEditingStep(null);
    form.resetFields();
    setImageFileList([]);
    setVideoFileList([]);
    setAttachmentFileList([]);
  };

  // Handle form submit
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();

      // Upload files
      const imageUrls: string[] = [];
      const videoUrls: string[] = [];
      const attachmentUrls: string[] = [];

      setUploading(true);

      // Upload images
      for (const file of imageFileList) {
        if (file.originFileObj) {
          try {
            const response = await uploadAPI.uploadFile(file.originFileObj);
            imageUrls.push(response.url);
          } catch (error) {
            console.error('Image upload failed:', error);
          }
        }
      }

      // Upload videos
      for (const file of videoFileList) {
        if (file.originFileObj) {
          try {
            const response = await uploadAPI.uploadFile(file.originFileObj);
            videoUrls.push(response.url);
          } catch (error) {
            console.error('Video upload failed:', error);
          }
        }
      }

      // Upload attachments
      for (const file of attachmentFileList) {
        if (file.originFileObj) {
          try {
            const response = await uploadAPI.uploadFile(file.originFileObj);
            attachmentUrls.push(response.url);
          } catch (error) {
            console.error('Attachment upload failed:', error);
          }
        }
      }

      setUploading(false);

      const stepData = {
        ...values,
        imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
        videoUrls: videoUrls.length > 0 ? videoUrls : undefined,
        attachmentUrls: attachmentUrls.length > 0 ? attachmentUrls : undefined,
      };

      if (editingStep) {
        await onUpdateStep(editingStep.id, stepData as UpdateStepInput);
        message.success('Step updated successfully');
      } else {
        await onAddStep(stepData as CreateStepInput);
        message.success('Step added successfully');
      }

      handleCloseModal();
    } catch (error: any) {
      setUploading(false);
      if (error.errorFields) {
        // Validation error
        return;
      }
      message.error(error.message || 'Failed to save step');
    }
  };

  // Handle delete step
  const handleDelete = async (stepId: string) => {
    try {
      await onDeleteStep(stepId);
      message.success('Step deleted successfully');
    } catch (error: any) {
      message.error(error.message || 'Failed to delete step');
    }
  };

  // Upload props
  const uploadProps: UploadProps = {
    beforeUpload: () => false, // Prevent auto upload
    maxCount: 10,
  };

  return (
    <div>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Steps ({steps.length})</h3>
        {isEditable && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => handleOpenModal()}
          >
            Add Step
          </Button>
        )}
      </div>

      {/* Steps List */}
      {steps.length === 0 ? (
        <Empty
          description="No steps added yet"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
            disabled={!isEditable}
          >
            {steps.map((step) => (
              <SortableStepItem
                key={step.id}
                step={step}
                onEdit={() => handleOpenModal(step)}
                onDelete={() => handleDelete(step.id)}
                isEditable={isEditable}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}

      {/* Add/Edit Step Modal */}
      <Modal
        title={editingStep ? 'Edit Step' : 'Add Step'}
        open={isModalVisible}
        onOk={handleSubmit}
        onCancel={handleCloseModal}
        width={800}
        okText={editingStep ? 'Update' : 'Add'}
        confirmLoading={uploading}
      >
        <Form
          form={form}
          layout="vertical"
        >
          {/* Step Number */}
          <Form.Item
            label="Step Number"
            name="stepNumber"
            rules={[{ required: true, message: 'Please enter step number' }]}
          >
            <InputNumber min={1} style={{ width: '100%' }} disabled={!!editingStep} />
          </Form.Item>

          {/* Title */}
          <Form.Item
            label="Title"
            name="title"
            rules={[
              { required: true, message: 'Please enter title' },
              { max: 200, message: 'Title must not exceed 200 characters' },
            ]}
          >
            <Input placeholder="Enter step title" />
          </Form.Item>

          {/* Content */}
          <Form.Item
            label="Instructions"
            name="content"
            rules={[
              { required: true, message: 'Please enter instructions' },
              { max: 5000, message: 'Instructions must not exceed 5000 characters' },
            ]}
          >
            <TextArea
              placeholder="Enter detailed step-by-step instructions"
              rows={6}
              showCount
              maxLength={5000}
            />
          </Form.Item>

          {/* Estimated Duration */}
          <Form.Item
            label="Estimated Duration (seconds)"
            name="estimatedDuration"
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>

          {/* Flags */}
          <Space size="large">
            <Form.Item
              label="Critical Step"
              name="isCritical"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>

            <Form.Item
              label="Requires Signature"
              name="requiresSignature"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </Space>

          {/* File Uploads */}
          <Collapse defaultActiveKey={[]}>
            <Panel header="Attachments (Images, Videos, Documents)" key="1">
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {/* Images */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    <FileImageOutlined /> Images
                  </label>
                  <Upload
                    {...uploadProps}
                    listType="picture-card"
                    fileList={imageFileList}
                    onChange={({ fileList }) => setImageFileList(fileList)}
                    accept="image/*"
                  >
                    <div>
                      <PlusOutlined />
                      <div style={{ marginTop: 8 }}>Upload</div>
                    </div>
                  </Upload>
                </div>

                {/* Videos */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    <VideoCameraOutlined /> Videos
                  </label>
                  <Upload
                    {...uploadProps}
                    listType="text"
                    fileList={videoFileList}
                    onChange={({ fileList }) => setVideoFileList(fileList)}
                    accept="video/*"
                  >
                    <Button icon={<PlusOutlined />}>Upload Video</Button>
                  </Upload>
                </div>

                {/* Documents */}
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500 }}>
                    <FileTextOutlined /> Documents (PDF, Word, etc.)
                  </label>
                  <Upload
                    {...uploadProps}
                    listType="text"
                    fileList={attachmentFileList}
                    onChange={({ fileList }) => setAttachmentFileList(fileList)}
                    accept=".pdf,.doc,.docx"
                  >
                    <Button icon={<PlusOutlined />}>Upload Document</Button>
                  </Upload>
                </div>
              </Space>
            </Panel>
          </Collapse>
        </Form>
      </Modal>
    </div>
  );
};

export default WorkInstructionStepEditor;
