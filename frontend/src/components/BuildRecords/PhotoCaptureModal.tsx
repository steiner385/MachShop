import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Modal,
  Button,
  Space,
  Card,
  Row,
  Col,
  Input,
  Select,
  Upload,
  message,
  Divider,
  Typography,
  Tabs,
  Form,
  Slider,
  ColorPicker,
  Tooltip,
  Alert,
  Tag,
  Progress
} from 'antd';
import {
  CameraOutlined,
  UploadOutlined,
  EditOutlined,
  SaveOutlined,
  DeleteOutlined,
  UndoOutlined,
  RedoOutlined,
  PictureOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  LineOutlined,
  FontSizeOutlined,
  HighlightOutlined
} from '@ant-design/icons';
import { Stage, Layer, Line, Text as KonvaText, Arrow, Circle, Rect } from 'react-konva';
import type { UploadProps } from 'antd';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;

interface Operation {
  id: string;
  operationNumber: string;
  description: string;
}

interface PhotoAnnotation {
  type: 'line' | 'arrow' | 'text' | 'circle' | 'rectangle' | 'highlight';
  id: string;
  points?: number[];
  x?: number;
  y?: number;
  text?: string;
  color: string;
  strokeWidth: number;
  fontSize?: number;
  rotation?: number;
  width?: number;
  height?: number;
}

interface PhotoMetadata {
  caption: string;
  operationId?: string;
  category: string;
  tags: string[];
  notes?: string;
}

interface PhotoCaptureModalProps {
  visible: boolean;
  buildRecordId: string;
  operations: Operation[];
  onClose: () => void;
  onPhotoSaved: (photo: any) => void;
}

const PhotoCaptureModal: React.FC<PhotoCaptureModalProps> = ({
  visible,
  buildRecordId,
  operations,
  onClose,
  onPhotoSaved
}) => {
  const [activeTab, setActiveTab] = useState('capture');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [annotations, setAnnotations] = useState<PhotoAnnotation[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingTool, setDrawingTool] = useState<'line' | 'arrow' | 'text' | 'circle' | 'rectangle' | 'highlight'>('line');
  const [strokeColor, setStrokeColor] = useState('#ff0000');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [fontSize, setFontSize] = useState(16);
  const [imageScale, setImageScale] = useState(1);
  const [imageRotation, setImageRotation] = useState(0);
  const [saving, setSaving] = useState(false);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>('');
  const [form] = Form.useForm();

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (visible) {
      initializeCamera();
    } else {
      cleanup();
    }
    return cleanup;
  }, [visible]);

  useEffect(() => {
    if (capturedImage) {
      setCurrentImage(capturedImage);
      setActiveTab('annotate');
    } else if (uploadedImage) {
      setCurrentImage(uploadedImage);
      setActiveTab('annotate');
    }
  }, [capturedImage, uploadedImage]);

  const initializeCamera = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      setCameras(videoDevices);

      if (videoDevices.length > 0) {
        setSelectedCamera(videoDevices[0].deviceId);
        await startCamera(videoDevices[0].deviceId);
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      message.error('Unable to access camera');
    }
  };

  const startCamera = async (deviceId: string) => {
    try {
      if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        }
      });

      setCameraStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (error) {
      console.error('Error starting camera:', error);
      message.error('Failed to start camera');
    }
  };

  const cleanup = () => {
    if (cameraStream) {
      cameraStream.getTracks().forEach(track => track.stop());
      setCameraStream(null);
    }
  };

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.9);
    setCapturedImage(imageDataUrl);
    message.success('Photo captured successfully');
  }, []);

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setUploadedImage(e.target.result as string);
        message.success('Photo uploaded successfully');
      }
    };
    reader.readAsDataURL(file);
    return false; // Prevent default upload
  };

  const startDrawing = (e: any) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();

    if (drawingTool === 'text') {
      const newAnnotation: PhotoAnnotation = {
        type: 'text',
        id: `text_${Date.now()}`,
        x: pos.x,
        y: pos.y,
        text: 'Double click to edit',
        color: strokeColor,
        strokeWidth: strokeWidth,
        fontSize: fontSize
      };
      setAnnotations([...annotations, newAnnotation]);
    } else {
      const newAnnotation: PhotoAnnotation = {
        type: drawingTool,
        id: `${drawingTool}_${Date.now()}`,
        points: [pos.x, pos.y],
        color: strokeColor,
        strokeWidth: strokeWidth
      };
      setAnnotations([...annotations, newAnnotation]);
    }
  };

  const continueDrawing = (e: any) => {
    if (!isDrawing) return;

    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    const lastAnnotation = annotations[annotations.length - 1];

    if (lastAnnotation && lastAnnotation.points) {
      const newPoints = lastAnnotation.points.concat([point.x, point.y]);
      const updatedAnnotations = [...annotations];
      updatedAnnotations[updatedAnnotations.length - 1] = {
        ...lastAnnotation,
        points: newPoints
      };
      setAnnotations(updatedAnnotations);
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const deleteAnnotation = (id: string) => {
    setAnnotations(annotations.filter(annotation => annotation.id !== id));
  };

  const clearAllAnnotations = () => {
    setAnnotations([]);
  };

  const savePhoto = async () => {
    const metadata = await form.validateFields();

    if (!currentImage) {
      message.error('No image to save');
      return;
    }

    try {
      setSaving(true);

      // Create final image with annotations
      const stage = stageRef.current;
      const dataURL = stage ? stage.toDataURL({ pixelRatio: 2 }) : currentImage;

      // Convert dataURL to blob
      const response = await fetch(dataURL);
      const blob = await response.blob();

      // Create form data
      const formData = new FormData();
      formData.append('photo', blob, `photo_${Date.now()}.jpg`);
      formData.append('buildRecordId', buildRecordId);
      formData.append('caption', metadata.caption || '');
      formData.append('operationId', metadata.operationId || '');
      formData.append('category', metadata.category);
      formData.append('tags', JSON.stringify(metadata.tags || []));
      formData.append('notes', metadata.notes || '');
      formData.append('annotations', JSON.stringify(annotations));

      const apiResponse = await fetch(`/api/build-records/${buildRecordId}/photos`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (apiResponse.ok) {
        const savedPhoto = await apiResponse.json();
        message.success('Photo saved successfully');
        onPhotoSaved(savedPhoto);
        handleClose();
      } else {
        message.error('Failed to save photo');
      }
    } catch (error) {
      console.error('Error saving photo:', error);
      message.error('Error saving photo');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    setCapturedImage(null);
    setUploadedImage(null);
    setCurrentImage(null);
    setAnnotations([]);
    setActiveTab('capture');
    setImageScale(1);
    setImageRotation(0);
    form.resetFields();
    onClose();
  };

  const renderAnnotations = () => {
    return annotations.map((annotation) => {
      switch (annotation.type) {
        case 'line':
          return (
            <Line
              key={annotation.id}
              points={annotation.points}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
              tension={0.5}
              lineCap="round"
              globalCompositeOperation="source-over"
            />
          );
        case 'arrow':
          return (
            <Arrow
              key={annotation.id}
              points={annotation.points}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
              fill={annotation.color}
            />
          );
        case 'text':
          return (
            <KonvaText
              key={annotation.id}
              x={annotation.x}
              y={annotation.y}
              text={annotation.text}
              fontSize={annotation.fontSize}
              fill={annotation.color}
              draggable
            />
          );
        case 'circle':
          const radius = annotation.points ? Math.sqrt(
            Math.pow(annotation.points[2] - annotation.points[0], 2) +
            Math.pow(annotation.points[3] - annotation.points[1], 2)
          ) : 50;
          return (
            <Circle
              key={annotation.id}
              x={annotation.points?.[0] || 0}
              y={annotation.points?.[1] || 0}
              radius={radius}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
            />
          );
        case 'rectangle':
          return (
            <Rect
              key={annotation.id}
              x={annotation.points?.[0] || 0}
              y={annotation.points?.[1] || 0}
              width={annotation.width || 100}
              height={annotation.height || 50}
              stroke={annotation.color}
              strokeWidth={annotation.strokeWidth}
            />
          );
        default:
          return null;
      }
    });
  };

  return (
    <Modal
      title={
        <Space>
          <CameraOutlined />
          Photo Capture & Annotation
        </Space>
      }
      visible={visible}
      onCancel={handleClose}
      width={1200}
      footer={null}
      destroyOnClose
    >
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        {/* Camera Capture Tab */}
        <TabPane tab={<Space><CameraOutlined />Capture</Space>} key="capture">
          <Row gutter={[16, 16]}>
            <Col span={18}>
              <Card>
                <div style={{ textAlign: 'center' }}>
                  <video
                    ref={videoRef}
                    style={{
                      width: '100%',
                      maxWidth: '640px',
                      height: 'auto',
                      border: '2px solid #d9d9d9',
                      borderRadius: '8px'
                    }}
                    autoPlay
                    playsInline
                  />
                  <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
                <div style={{ textAlign: 'center', marginTop: '16px' }}>
                  <Space>
                    <Button
                      type="primary"
                      size="large"
                      icon={<CameraOutlined />}
                      onClick={capturePhoto}
                      disabled={!cameraStream}
                    >
                      Capture Photo
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
            <Col span={6}>
              <Space direction="vertical" style={{ width: '100%' }}>
                <Card title="Camera Settings" size="small">
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <div>
                      <Text strong>Camera:</Text>
                      <Select
                        style={{ width: '100%', marginTop: '4px' }}
                        value={selectedCamera}
                        onChange={(value) => {
                          setSelectedCamera(value);
                          startCamera(value);
                        }}
                      >
                        {cameras.map((camera) => (
                          <Option key={camera.deviceId} value={camera.deviceId}>
                            {camera.label || `Camera ${camera.deviceId.slice(0, 8)}`}
                          </Option>
                        ))}
                      </Select>
                    </div>
                  </Space>
                </Card>

                <Card title="Upload Photo" size="small">
                  <Upload.Dragger
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={handleFileUpload}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">
                      Click or drag photo to upload
                    </p>
                  </Upload.Dragger>
                </Card>
              </Space>
            </Col>
          </Row>
        </TabPane>

        {/* Annotation Tab */}
        <TabPane
          tab={<Space><EditOutlined />Annotate</Space>}
          key="annotate"
          disabled={!currentImage}
        >
          <Row gutter={[16, 16]}>
            <Col span={18}>
              <Card>
                {/* Annotation Toolbar */}
                <div style={{ marginBottom: '16px', padding: '8px', background: '#f5f5f5', borderRadius: '4px' }}>
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <Button.Group>
                          <Button
                            type={drawingTool === 'line' ? 'primary' : 'default'}
                            icon={<LineOutlined />}
                            onClick={() => setDrawingTool('line')}
                          />
                          <Button
                            type={drawingTool === 'arrow' ? 'primary' : 'default'}
                            icon={<HighlightOutlined />}
                            onClick={() => setDrawingTool('arrow')}
                          />
                          <Button
                            type={drawingTool === 'text' ? 'primary' : 'default'}
                            icon={<FontSizeOutlined />}
                            onClick={() => setDrawingTool('text')}
                          />
                          <Button
                            type={drawingTool === 'circle' ? 'primary' : 'default'}
                            icon={<PictureOutlined />}
                            onClick={() => setDrawingTool('circle')}
                          />
                          <Button
                            type={drawingTool === 'rectangle' ? 'primary' : 'default'}
                            icon={<PictureOutlined />}
                            onClick={() => setDrawingTool('rectangle')}
                          />
                        </Button.Group>

                        <Divider type="vertical" />

                        <ColorPicker
                          value={strokeColor}
                          onChange={(color) => setStrokeColor(color.toHexString())}
                        />

                        <Tooltip title="Stroke Width">
                          <Slider
                            style={{ width: 100 }}
                            min={1}
                            max={10}
                            value={strokeWidth}
                            onChange={setStrokeWidth}
                          />
                        </Tooltip>

                        {drawingTool === 'text' && (
                          <Tooltip title="Font Size">
                            <Slider
                              style={{ width: 100 }}
                              min={12}
                              max={48}
                              value={fontSize}
                              onChange={setFontSize}
                            />
                          </Tooltip>
                        )}
                      </Space>
                    </Col>
                    <Col>
                      <Space>
                        <Button icon={<UndoOutlined />} disabled />
                        <Button icon={<RedoOutlined />} disabled />
                        <Button icon={<DeleteOutlined />} onClick={clearAllAnnotations} />
                      </Space>
                    </Col>
                  </Row>
                </div>

                {/* Image Canvas */}
                <div style={{ textAlign: 'center', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                  <Stage
                    ref={stageRef}
                    width={700}
                    height={500}
                    onMouseDown={startDrawing}
                    onMouseMove={continueDrawing}
                    onMouseUp={stopDrawing}
                    scale={{ x: imageScale, y: imageScale }}
                    rotation={imageRotation}
                  >
                    <Layer>
                      {currentImage && (
                        <img
                          src={currentImage}
                          alt="Captured"
                          style={{
                            maxWidth: '100%',
                            maxHeight: '100%',
                            objectFit: 'contain'
                          }}
                          onLoad={(e) => {
                            const img = e.target as HTMLImageElement;
                            if (stageRef.current) {
                              stageRef.current.width(img.naturalWidth);
                              stageRef.current.height(img.naturalHeight);
                            }
                          }}
                        />
                      )}
                      {renderAnnotations()}
                    </Layer>
                  </Stage>
                </div>

                {/* Image Controls */}
                <div style={{ marginTop: '16px', textAlign: 'center' }}>
                  <Space>
                    <Button
                      icon={<ZoomOutOutlined />}
                      onClick={() => setImageScale(Math.max(0.1, imageScale - 0.1))}
                    />
                    <Text>{Math.round(imageScale * 100)}%</Text>
                    <Button
                      icon={<ZoomInOutlined />}
                      onClick={() => setImageScale(Math.min(3, imageScale + 0.1))}
                    />
                    <Divider type="vertical" />
                    <Button
                      icon={<RotateLeftOutlined />}
                      onClick={() => setImageRotation(imageRotation - 90)}
                    />
                    <Button
                      icon={<RotateRightOutlined />}
                      onClick={() => setImageRotation(imageRotation + 90)}
                    />
                  </Space>
                </div>
              </Card>
            </Col>

            <Col span={6}>
              <Card title="Photo Information" size="small">
                <Form form={form} layout="vertical" size="small">
                  <Form.Item
                    name="caption"
                    label="Caption"
                    rules={[{ required: true, message: 'Please enter a caption' }]}
                  >
                    <Input placeholder="Enter photo caption..." />
                  </Form.Item>

                  <Form.Item name="operationId" label="Associated Operation">
                    <Select placeholder="Select operation (optional)" allowClear>
                      {operations.map(op => (
                        <Option key={op.id} value={op.id}>
                          {op.operationNumber} - {op.description}
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="category"
                    label="Category"
                    rules={[{ required: true, message: 'Please select a category' }]}
                  >
                    <Select placeholder="Select category">
                      <Option value="PROGRESS">Progress Photo</Option>
                      <Option value="ISSUE">Issue Documentation</Option>
                      <Option value="INSPECTION">Inspection Photo</Option>
                      <Option value="COMPLETION">Completion Photo</Option>
                      <Option value="DEVIATION">Deviation Photo</Option>
                      <Option value="REFERENCE">Reference Photo</Option>
                    </Select>
                  </Form.Item>

                  <Form.Item name="tags" label="Tags">
                    <Select
                      mode="tags"
                      placeholder="Add tags..."
                      style={{ width: '100%' }}
                    />
                  </Form.Item>

                  <Form.Item name="notes" label="Notes">
                    <TextArea
                      rows={3}
                      placeholder="Additional notes..."
                    />
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      onClick={savePhoto}
                      loading={saving}
                      block
                    >
                      Save Photo
                    </Button>
                  </Form.Item>
                </Form>
              </Card>

              {annotations.length > 0 && (
                <Card title="Annotations" size="small" style={{ marginTop: '16px' }}>
                  <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                    {annotations.map((annotation, index) => (
                      <Row key={annotation.id} justify="space-between" align="middle" style={{ marginBottom: '8px' }}>
                        <Col>
                          <Tag color={annotation.color}>
                            {annotation.type} {index + 1}
                          </Tag>
                        </Col>
                        <Col>
                          <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => deleteAnnotation(annotation.id)}
                          />
                        </Col>
                      </Row>
                    ))}
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </TabPane>
      </Tabs>
    </Modal>
  );
};

export default PhotoCaptureModal;