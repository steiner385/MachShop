import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Table,
  Space,
  Typography,
  Tag,
  Input,
  Modal,
  Form,
  InputNumber,
  Select,
  message,
  Tooltip,
} from 'antd';
import {
  PlusOutlined,
  BarcodeOutlined,
  SearchOutlined,
  CopyOutlined,
  CheckCircleOutlined,
  ApartmentOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/services/apiClient';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { Search } = Input;

interface SerializedPart {
  id: string;
  serialNumber: string;
  partNumber: string;
  partName: string;
  partType: string;
  lotNumber?: string;
  status: string;
  manufactureDate: string;
  createdAt: string;
}

interface SerialNumberFormat {
  prefix?: string;
  sequencePadding?: number;
  includeCheckDigit?: boolean;
  pattern?: string;
}

/**
 * Serialization List Page
 *
 * Route: /serialization
 *
 * Displays list of serialized parts and provides serial number generation
 */
const SerializationListPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [parts, setParts] = useState<SerializedPart[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [searchText, setSearchText] = useState('');

  // Modal states
  const [generateModalVisible, setGenerateModalVisible] = useState(false);
  const [batchModalVisible, setBatchModalVisible] = useState(false);
  const [createPartModalVisible, setCreatePartModalVisible] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generatedSerial, setGeneratedSerial] = useState<string | null>(null);

  const [form] = Form.useForm();
  const [batchForm] = Form.useForm();
  const [createPartForm] = Form.useForm();

  // Explicitly set default values when generate modal opens
  useEffect(() => {
    if (generateModalVisible && !generatedSerial) {
      form.setFieldsValue({
        sequencePadding: 6,
        includeCheckDigit: true,
      });
    }
  }, [generateModalVisible, generatedSerial, form]);

  // Explicitly set default values when batch modal opens
  useEffect(() => {
    if (batchModalVisible) {
      batchForm.setFieldsValue({
        sequencePadding: 6,
        includeCheckDigit: true,
      });
    }
  }, [batchModalVisible, batchForm]);

  const loadParts = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiClient.get<any>('/serialization/parts', {
        params: {
          page: currentPage,
          limit: pageSize,
          search: searchText || undefined,
        },
      });
      setParts(response.parts || []);
      setTotal(response.total || 0);
    } catch (error: any) {
      console.error('Failed to load parts:', error);
      message.error('Failed to load serialized parts');
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize, searchText]);

  useEffect(() => {
    loadParts();
  }, [loadParts]);

  const handleGenerateSingle = useCallback(async (values: SerialNumberFormat) => {
    console.log('[TEST DEBUG] handleGenerateSingle called with:', values);
    setGenerating(true);
    try {
      console.log('[TEST DEBUG] Starting API call...');
      const response = await apiClient.post<any>('/serialization/generate', values);
      console.log('[TEST DEBUG] API call completed:', response);

      console.log('[TEST DEBUG] Setting generated serial:', response.serialNumber);
      setGeneratedSerial(response.serialNumber);

      console.log('[TEST DEBUG] Showing success message');
      message.success('Serial number generated successfully');

      console.log('[TEST DEBUG] Resetting form');
      form.resetFields();

      console.log('[TEST DEBUG] handleGenerateSingle completed successfully');
    } catch (error: any) {
      console.error('[TEST DEBUG] Generate single serial error:', error);
      console.error('[TEST DEBUG] Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        requestUrl: error.config?.url,
        fullUrl: error.config?.baseURL ? error.config.baseURL + error.config.url : error.config?.url,
        method: error.config?.method,
        headers: error.config?.headers
      });
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate serial number';
      message.error(errorMessage);
    } finally {
      console.log('[TEST DEBUG] Setting generating to false');
      setGenerating(false);
    }
  }, [form]);

  const handleGenerateBatch = useCallback(async (values: any) => {
    console.log('[TEST DEBUG] handleGenerateBatch called with:', values);
    setGenerating(true);
    try {
      console.log('[TEST DEBUG] Starting batch API call...');
      const response = await apiClient.post<any>('/serialization/generate-batch', {
        ...values,
        count: values.quantity,
      });
      console.log('[TEST DEBUG] Batch API call completed:', response);

      // Display success message with increased duration for test visibility
      console.log('[TEST DEBUG] Showing success message for', response.count, 'serials');
      message.success(`Generated ${response.count} serial numbers`, 4);

      // Show detailed results modal
      console.log('[TEST DEBUG] Opening info modal');
      Modal.info({
        title: 'Batch Generated',
        content: (
          <div>
            <p>Successfully generated {response.count} serial numbers:</p>
            <ul style={{ maxHeight: 300, overflow: 'auto' }}>
              {response.serialNumbers.slice(0, 20).map((sn: any) => (
                <li key={sn.serialNumber}>{sn.serialNumber}</li>
              ))}
              {response.count > 20 && (
                <li>... and {response.count - 20} more</li>
              )}
            </ul>
          </div>
        ),
        width: 600,
      });

      // Reset form and close after slight delay for UX
      console.log('[TEST DEBUG] Resetting batch form');
      batchForm.resetFields();
      setTimeout(() => {
        console.log('[TEST DEBUG] Closing batch modal');
        setBatchModalVisible(false);
      }, 500);

      console.log('[TEST DEBUG] handleGenerateBatch completed successfully');
    } catch (error: any) {
      console.error('[TEST DEBUG] Generate batch error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to generate batch';
      message.error(errorMessage);
    } finally {
      console.log('[TEST DEBUG] Setting batch generating to false');
      setGenerating(false);
    }
  }, [batchForm]);

  const handleCreatePart = useCallback(async (values: any) => {
    setGenerating(true);
    try {
      await apiClient.post('/serialization/parts', {
        serialNumber: values.serialNumber,
        partNumber: values.partNumber, // Backend handles partNumber → partId lookup
        lotNumber: values.lotNumber,
        status: 'IN_PRODUCTION', // Default status for newly created serialized parts
        manufactureDate: new Date().toISOString(),
      });

      // Display success message with increased duration for test visibility
      message.success('Serialized part created successfully', 4);

      // Reset form and reload data immediately
      createPartForm.resetFields();
      loadParts(); // Reload the list to show new part

      // Delay modal close slightly to ensure success message is visible
      // This improves UX by giving users time to see confirmation
      setTimeout(() => {
        setCreatePartModalVisible(false);
      }, 500);
    } catch (error: any) {
      console.error('Create part error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create serialized part';
      message.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  }, [createPartForm, loadParts]);

  // Expose form instances and handlers to window for E2E testing
  // IMPORTANT: This must be after handler definitions to avoid "before initialization" errors
  useEffect(() => {
    if (import.meta.env.MODE !== 'production') {
      (window as any).__TEST_FORMS__ = {
        serialForm: form,
        batchForm: batchForm,
        createPartForm: createPartForm,
        // Expose handler functions for direct invocation in tests
        handleGenerateSingle,
        handleGenerateBatch,
        handleCreatePart,
      };
    }
    return () => {
      if ((window as any).__TEST_FORMS__) {
        delete (window as any).__TEST_FORMS__;
      }
    };
  }, [form, batchForm, createPartForm, handleGenerateSingle, handleGenerateBatch, handleCreatePart]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success('Copied to clipboard');
  };

  const columns: ColumnsType<SerializedPart> = [
    {
      title: 'Serial Number',
      dataIndex: 'serialNumber',
      key: 'serialNumber',
      width: 220,
      render: (text: string) => (
        <Space>
          <BarcodeOutlined />
          <Button
            type="link"
            style={{ padding: 0, fontWeight: 500 }}
            onClick={() => navigate(`/traceability/${text}`)}
          >
            {text}
          </Button>
          <Tooltip title="Copy">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => copyToClipboard(text)}
            />
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Part Number',
      dataIndex: 'partNumber',
      key: 'partNumber',
      width: 150,
    },
    {
      title: 'Part Name',
      dataIndex: 'partName',
      key: 'partName',
      width: 200,
    },
    {
      title: 'Type',
      dataIndex: 'partType',
      key: 'partType',
      width: 120,
      render: (type: string) => {
        const colorMap: Record<string, string> = {
          FINISHED: 'blue',
          WIP: 'orange',
          RAW_MATERIAL: 'green',
          PURCHASED: 'purple',
        };
        return <Tag color={colorMap[type] || 'default'}>{type}</Tag>;
      },
    },
    {
      title: 'Lot Number',
      dataIndex: 'lotNumber',
      key: 'lotNumber',
      width: 150,
      render: (lot: string | null) => lot || 'N/A',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const colorMap: Record<string, string> = {
          IN_PRODUCTION: 'processing',
          COMPLETED: 'success',
          ACTIVE: 'success',
          USED: 'default',
          SCRAPPED: 'error',
        };
        return <Tag color={colorMap[status] || 'default'}>{status}</Tag>;
      },
    },
    {
      title: 'Manufacture Date',
      dataIndex: 'manufactureDate',
      key: 'manufactureDate',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right' as const,
      render: (_: any, record: SerializedPart) => (
        <Space>
          <Tooltip title="View Traceability">
            <Button
              type="text"
              size="small"
              icon={<ApartmentOutlined />}
              onClick={() => navigate(`/traceability/${record.serialNumber}`)}
            >
              Trace
            </Button>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <Space align="center" style={{ marginBottom: '12px' }}>
              <BarcodeOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>
                Serial Number Management
              </Title>
            </Space>
            <Text type="secondary">
              Generate and manage serial numbers with advanced traceability features
            </Text>
          </div>
          <Button
            icon={<ApartmentOutlined />}
            onClick={() => navigate('/traceability')}
          >
            View Traceability
          </Button>
        </div>
      </div>

      {/* Actions */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Space size="middle" style={{ width: '100%', justifyContent: 'space-between' }}>
            <Space>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => setCreatePartModalVisible(true)}
                data-testid="create-part-button"
              >
                Create Serialized Part
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => setGenerateModalVisible(true)}
                data-testid="generate-serial-button"
              >
                Generate Serial Number
              </Button>
              <Button
                icon={<PlusOutlined />}
                onClick={() => setBatchModalVisible(true)}
                data-testid="generate-batch-button"
              >
                Generate Batch
              </Button>
            </Space>
            <Search
              placeholder="Search serial numbers..."
              allowClear
              style={{ width: 300 }}
              onSearch={setSearchText}
              prefix={<SearchOutlined />}
            />
          </Space>
        </Space>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={parts}
          rowKey="id"
          loading={loading}
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} parts`,
            onChange: (page, size) => {
              setCurrentPage(page);
              setPageSize(size || 20);
            },
          }}
          scroll={{ x: 1400 }}
        />
      </Card>

      {/* Generate Single Modal */}
      <Modal
        title="Generate Serial Number"
        open={generateModalVisible}
        onCancel={() => {
          setGenerateModalVisible(false);
          setGeneratedSerial(null);
          form.resetFields();
        }}
        footer={null}
      >
        {!generatedSerial ? (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleGenerateSingle}
            initialValues={{
              sequencePadding: 6,
              includeCheckDigit: true,
            }}
          >
            <Form.Item
              label="Prefix"
              name="prefix"
              rules={[{ required: true, message: 'Please enter prefix' }]}
            >
              <Input placeholder="e.g., SN" data-testid="serial-prefix-input" />
            </Form.Item>

            <Form.Item label="Sequence Padding" name="sequencePadding">
              <InputNumber min={4} max={12} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item label="Include Check Digit" name="includeCheckDigit">
              <Select>
                <Select.Option value={true}>Yes (Luhn Algorithm)</Select.Option>
                <Select.Option value={false}>No</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => setGenerateModalVisible(false)}>Cancel</Button>
                <Button
                  type="primary"
                  onClick={() => form.submit()}
                  loading={generating}
                  data-testid="generate-submit-button"
                >
                  Generate
                </Button>
              </Space>
            </Form.Item>
          </Form>
        ) : (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <CheckCircleOutlined style={{ fontSize: 64, color: '#52c41a', marginBottom: 16 }} />
            <Title level={4}>Serial Number Generated</Title>
            <Card style={{ marginTop: 16, background: '#f0f2f5' }}>
              <Space>
                <Text code style={{ fontSize: 18 }}>
                  {generatedSerial}
                </Text>
                <Button icon={<CopyOutlined />} onClick={() => copyToClipboard(generatedSerial)}>
                  Copy
                </Button>
              </Space>
            </Card>
            <Button
              type="primary"
              style={{ marginTop: 16 }}
              onClick={() => {
                setGenerateModalVisible(false);
                setGeneratedSerial(null);
              }}
            >
              Close
            </Button>
          </div>
        )}
      </Modal>

      {/* Generate Batch Modal */}
      <Modal
        title="Generate Batch Serial Numbers"
        open={batchModalVisible}
        onCancel={() => {
          setBatchModalVisible(false);
          batchForm.resetFields();
        }}
        footer={null}
      >
        <Form
          form={batchForm}
          layout="vertical"
          onFinish={handleGenerateBatch}
          initialValues={{
            sequencePadding: 6,
            includeCheckDigit: true,
          }}
        >
          <Form.Item
            label="Prefix"
            name="prefix"
            rules={[{ required: true, message: 'Please enter prefix' }]}
          >
            <Input placeholder="e.g., BATCH" data-testid="batch-prefix-input" />
          </Form.Item>

          <Form.Item
            label="Quantity"
            name="quantity"
            rules={[{ required: true, message: 'Please enter quantity' }]}
          >
            <InputNumber
              min={1}
              max={1000}
              style={{ width: '100%' }}
              placeholder="Number of serials to generate"
              data-testid="batch-quantity-input"
            />
          </Form.Item>

          <Form.Item label="Sequence Padding" name="sequencePadding">
            <InputNumber min={4} max={12} style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Include Check Digit" name="includeCheckDigit">
            <Select>
              <Select.Option value={true}>Yes (Luhn Algorithm)</Select.Option>
              <Select.Option value={false}>No</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setBatchModalVisible(false)}>Cancel</Button>
              <Button
                type="primary"
                onClick={() => batchForm.submit()}
                loading={generating}
                data-testid="generate-batch-submit-button"
              >
                Generate Batch
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Create Serialized Part Modal */}
      <Modal
        title="Create Serialized Part"
        open={createPartModalVisible}
        onCancel={() => setCreatePartModalVisible(false)}
        footer={null}
        destroyOnClose
      >
        <Form form={createPartForm} layout="vertical" onFinish={handleCreatePart}>
          <Form.Item
            label="Serial Number"
            name="serialNumber"
            rules={[{ required: true, message: 'Please enter serial number' }]}
          >
            <Input placeholder="e.g., SN-20251015-000001-7" data-testid="serial-number-input" />
          </Form.Item>

          <Form.Item
            label="Part Number"
            name="partNumber"
            rules={[{ required: true, message: 'Please enter part number' }]}
          >
            <Input placeholder="e.g., PN-001" data-testid="part-number-input" />
          </Form.Item>

          <Form.Item
            label="Lot Number"
            name="lotNumber"
          >
            <Input placeholder="e.g., LOT-20251015-001" data-testid="lot-number-input" />
          </Form.Item>

          <Form.Item
            label="Part Type"
            name="partType"
          >
            <Select placeholder="Select part type" data-testid="part-type-select">
              <Select.Option value="FINISHED">Finished</Select.Option>
              <Select.Option value="WIP">Work in Progress</Select.Option>
              <Select.Option value="RAW_MATERIAL">Raw Material</Select.Option>
              <Select.Option value="PURCHASED">Purchased</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={() => setCreatePartModalVisible(false)}>Cancel</Button>
              <Button type="primary" htmlType="submit" loading={generating}>
                Create Part
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default SerializationListPage;
