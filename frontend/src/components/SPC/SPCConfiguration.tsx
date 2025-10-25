import React, { useState, useEffect } from 'react';
import {
  Form,
  Select,
  InputNumber,
  Switch,
  Button,
  Card,
  Steps,
  Space,
  Typography,
  Divider,
  Alert,
  Checkbox,
  Radio,
  Row,
  Col,
  Tooltip,
  message,
} from 'antd';
import {
  BarChartOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons';
import axios from 'axios';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Option } = Select;

/**
 * SPC Chart Type
 */
type SPCChartType = 'X_BAR_R' | 'X_BAR_S' | 'I_MR' | 'P_CHART' | 'NP_CHART' | 'C_CHART' | 'U_CHART' | 'EWMA' | 'CUSUM';

/**
 * Limit Calculation Method
 */
type LimitCalculationMethod = 'HISTORICAL_DATA' | 'SPEC_LIMITS' | 'MANUAL';

/**
 * SPC Configuration Form Data
 */
interface SPCConfigurationData {
  parameterId: string;
  chartType: SPCChartType;
  subgroupSize?: number;
  limitsBasedOn: LimitCalculationMethod;
  historicalDataDays?: number;
  USL?: number;
  LSL?: number;
  targetValue?: number;
  enabledRules: number[];
  ruleSensitivity: 'STRICT' | 'NORMAL' | 'RELAXED';
  enableCapability: boolean;
  confidenceLevel: number;
  isActive: boolean;
}

/**
 * SPCConfiguration Props
 */
interface SPCConfigurationProps {
  /** Parameter ID to configure */
  parameterId: string;
  /** Parameter name */
  parameterName?: string;
  /** Existing configuration (for editing) */
  existingConfig?: any;
  /** Callback on configuration saved */
  onSaved?: (config: any) => void;
  /** Callback on cancel */
  onCancel?: () => void;
}

/**
 * Chart Type Descriptions
 */
const CHART_TYPE_DESCRIPTIONS: Record<SPCChartType, string> = {
  X_BAR_R: 'X-bar and Range chart - For variable data with subgroups (n=2-10)',
  X_BAR_S: 'X-bar and Standard Deviation chart - For variable data with larger subgroups (n>10)',
  I_MR: 'Individual and Moving Range chart - For individual measurements',
  P_CHART: 'P-chart - For proportion of defective items',
  NP_CHART: 'NP-chart - For number of defective items',
  C_CHART: 'C-chart - For count of defects per unit',
  U_CHART: 'U-chart - For defects per unit (variable sample size)',
  EWMA: 'Exponentially Weighted Moving Average - For detecting small shifts',
  CUSUM: 'Cumulative Sum - For detecting small persistent shifts',
};

/**
 * Western Electric Rules
 */
const WESTERN_ELECTRIC_RULES = [
  { number: 1, name: 'One point beyond 3σ', severity: 'CRITICAL', description: 'Detects extreme values' },
  { number: 2, name: '9 points on same side', severity: 'WARNING', description: 'Detects process shift' },
  { number: 3, name: '6 points trending', severity: 'WARNING', description: 'Detects gradual trend' },
  { number: 4, name: '14 points alternating', severity: 'WARNING', description: 'Detects excessive variation' },
  { number: 5, name: '2 of 3 beyond 2σ', severity: 'WARNING', description: 'Detects moderate shift' },
  { number: 6, name: '4 of 5 beyond 1σ', severity: 'INFO', description: 'Detects slight shift' },
  { number: 7, name: '15 within 1σ', severity: 'INFO', description: 'Detects stratification' },
  { number: 8, name: '8 beyond 1σ either side', severity: 'WARNING', description: 'Detects increased variation' },
];

/**
 * SPCConfiguration Component
 *
 * Wizard for creating or editing SPC configurations.
 *
 * Features:
 * - Step-by-step configuration wizard
 * - Chart type selection
 * - Control limit calculation options
 * - Western Electric Rules configuration
 * - Capability analysis settings
 * - Real-time preview
 * - Form validation
 *
 * @example
 * ```tsx
 * <SPCConfiguration
 *   parameterId="param-123"
 *   parameterName="Temperature"
 *   onSaved={(config) => console.log('Saved:', config)}
 * />
 * ```
 */
export const SPCConfiguration: React.FC<SPCConfigurationProps> = ({
  parameterId,
  parameterName = 'Parameter',
  existingConfig,
  onSaved,
  onCancel,
}) => {
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [chartType, setChartType] = useState<SPCChartType>(existingConfig?.chartType || 'I_MR');
  const [limitsBasedOn, setLimitsBasedOn] = useState<LimitCalculationMethod>(
    existingConfig?.limitsBasedOn || 'HISTORICAL_DATA'
  );
  const [enabledRules, setEnabledRules] = useState<number[]>(existingConfig?.enabledRules || [1, 2, 3, 4, 5, 6, 7, 8]);

  // Initialize form with existing config
  useEffect(() => {
    if (existingConfig) {
      form.setFieldsValue({
        chartType: existingConfig.chartType,
        subgroupSize: existingConfig.subgroupSize,
        limitsBasedOn: existingConfig.limitsBasedOn,
        historicalDataDays: existingConfig.historicalDataDays || 30,
        USL: existingConfig.USL,
        LSL: existingConfig.LSL,
        targetValue: existingConfig.targetValue,
        ruleSensitivity: existingConfig.ruleSensitivity || 'NORMAL',
        enableCapability: existingConfig.enableCapability ?? true,
        confidenceLevel: existingConfig.confidenceLevel || 0.95,
        isActive: existingConfig.isActive ?? true,
      });
      setChartType(existingConfig.chartType);
      setLimitsBasedOn(existingConfig.limitsBasedOn);
      setEnabledRules(existingConfig.enabledRules || [1, 2, 3, 4, 5, 6, 7, 8]);
    }
  }, [existingConfig, form]);

  // Handle save
  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const configData: SPCConfigurationData = {
        parameterId,
        chartType,
        subgroupSize: values.subgroupSize,
        limitsBasedOn,
        historicalDataDays: limitsBasedOn === 'HISTORICAL_DATA' ? values.historicalDataDays : undefined,
        USL: values.USL,
        LSL: values.LSL,
        targetValue: values.targetValue,
        enabledRules,
        ruleSensitivity: values.ruleSensitivity,
        enableCapability: values.enableCapability,
        confidenceLevel: values.confidenceLevel,
        isActive: values.isActive,
      };

      // Call API to save configuration
      const response = existingConfig
        ? await axios.put(`/api/v1/spc/configurations/${parameterId}`, configData)
        : await axios.post('/api/v1/spc/configurations', configData);

      message.success('SPC configuration saved successfully');
      onSaved?.(response.data);
    } catch (error: any) {
      console.error('Error saving SPC configuration:', error);
      message.error(error.response?.data?.error || 'Failed to save SPC configuration');
    } finally {
      setLoading(false);
    }
  };

  // Wizard steps
  const steps = [
    {
      title: 'Chart Type',
      icon: <BarChartOutlined />,
      content: (
        <div>
          <Title level={4}>Select Chart Type</Title>
          <Paragraph>Choose the type of control chart based on your data characteristics.</Paragraph>

          <Form.Item
            name="chartType"
            label="Chart Type"
            rules={[{ required: true, message: 'Please select a chart type' }]}
          >
            <Select
              size="large"
              value={chartType}
              onChange={(value) => setChartType(value)}
              placeholder="Select chart type"
            >
              {Object.entries(CHART_TYPE_DESCRIPTIONS).map(([type, description]) => (
                <Option key={type} value={type}>
                  <div>
                    <Text strong>{type.replace(/_/g, '-')}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {description}
                    </Text>
                  </div>
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Subgroup Size (for X-bar charts) */}
          {(chartType === 'X_BAR_R' || chartType === 'X_BAR_S') && (
            <Form.Item
              name="subgroupSize"
              label="Subgroup Size"
              rules={[
                { required: true, message: 'Please enter subgroup size' },
                { type: 'number', min: 2, max: 25, message: 'Subgroup size must be between 2 and 25' },
              ]}
            >
              <InputNumber
                min={2}
                max={25}
                style={{ width: '100%' }}
                placeholder="Enter subgroup size (typically 2-10)"
              />
            </Form.Item>
          )}

          <Alert
            message="Chart Type Selection Guide"
            description={
              <ul>
                <li>Variable data with subgroups: X-bar/R or X-bar/S</li>
                <li>Individual measurements: I-MR</li>
                <li>Attribute data (defectives): P-chart or NP-chart</li>
                <li>Attribute data (defects): C-chart or U-chart</li>
                <li>Detecting small shifts: EWMA or CUSUM</li>
              </ul>
            }
            type="info"
            showIcon
          />
        </div>
      ),
    },
    {
      title: 'Control Limits',
      icon: <SettingOutlined />,
      content: (
        <div>
          <Title level={4}>Control Limits Configuration</Title>
          <Paragraph>Specify how control limits should be calculated.</Paragraph>

          <Form.Item
            name="limitsBasedOn"
            label="Calculate Limits From"
            rules={[{ required: true, message: 'Please select calculation method' }]}
          >
            <Radio.Group value={limitsBasedOn} onChange={(e) => setLimitsBasedOn(e.target.value)}>
              <Space direction="vertical">
                <Radio value="HISTORICAL_DATA">
                  <Text strong>Historical Data</Text>
                  <br />
                  <Text type="secondary">Calculate from past process data</Text>
                </Radio>
                <Radio value="SPEC_LIMITS">
                  <Text strong>Specification Limits</Text>
                  <br />
                  <Text type="secondary">Derive from LSL/USL</Text>
                </Radio>
                <Radio value="MANUAL">
                  <Text strong>Manual Entry</Text>
                  <br />
                  <Text type="secondary">Enter limits manually</Text>
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          {limitsBasedOn === 'HISTORICAL_DATA' && (
            <Form.Item
              name="historicalDataDays"
              label="Historical Data Period (days)"
              rules={[{ required: true, message: 'Please enter historical data period' }]}
            >
              <InputNumber min={7} max={365} style={{ width: '100%' }} placeholder="30" />
            </Form.Item>
          )}

          <Divider>Specification Limits (Optional)</Divider>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="USL" label="Upper Spec Limit (USL)">
                <InputNumber style={{ width: '100%' }} placeholder="e.g., 100.0" step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="targetValue" label="Target Value">
                <InputNumber style={{ width: '100%' }} placeholder="e.g., 90.0" step={0.1} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="LSL" label="Lower Spec Limit (LSL)">
                <InputNumber style={{ width: '100%' }} placeholder="e.g., 80.0" step={0.1} />
              </Form.Item>
            </Col>
          </Row>

          <Alert
            message={
              <span>
                <InfoCircleOutlined /> Specification limits are used for capability analysis and visual reference
              </span>
            }
            type="info"
          />
        </div>
      ),
    },
    {
      title: 'Rules & Sensitivity',
      icon: <CheckCircleOutlined />,
      content: (
        <div>
          <Title level={4}>Western Electric Rules</Title>
          <Paragraph>Select which rules to enable for out-of-control detection.</Paragraph>

          <div style={{ marginBottom: '24px' }}>
            <Text strong>Enabled Rules:</Text>
            <div style={{ marginTop: '12px' }}>
              <Checkbox.Group
                value={enabledRules}
                onChange={(values) => setEnabledRules(values as number[])}
                style={{ width: '100%' }}
              >
                <Row gutter={[16, 16]}>
                  {WESTERN_ELECTRIC_RULES.map((rule) => (
                    <Col span={12} key={rule.number}>
                      <Checkbox value={rule.number}>
                        <Tooltip title={rule.description}>
                          <Space>
                            <Text strong>Rule {rule.number}:</Text>
                            <Text>{rule.name}</Text>
                            {rule.severity === 'CRITICAL' && <Text type="danger">(Critical)</Text>}
                            {rule.severity === 'WARNING' && <Text type="warning">(Warning)</Text>}
                          </Space>
                        </Tooltip>
                      </Checkbox>
                    </Col>
                  ))}
                </Row>
              </Checkbox.Group>
            </div>
          </div>

          <Divider />

          <Form.Item
            name="ruleSensitivity"
            label="Rule Sensitivity"
            tooltip="Adjust sensitivity of rule detection"
          >
            <Radio.Group>
              <Space direction="vertical">
                <Radio value="STRICT">
                  <Text strong>Strict</Text> - Earlier detection, more sensitive
                </Radio>
                <Radio value="NORMAL">
                  <Text strong>Normal</Text> - Standard Western Electric thresholds
                </Radio>
                <Radio value="RELAXED">
                  <Text strong>Relaxed</Text> - Less sensitive, fewer false alarms
                </Radio>
              </Space>
            </Radio.Group>
          </Form.Item>

          <Divider />

          <Form.Item
            name="enableCapability"
            label="Process Capability Analysis"
            valuePropName="checked"
            tooltip="Calculate Cp, Cpk, Pp, Ppk indices"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            name="confidenceLevel"
            label="Confidence Level"
            tooltip="Statistical confidence level for capability analysis"
          >
            <Select>
              <Option value={0.90}>90%</Option>
              <Option value={0.95}>95%</Option>
              <Option value={0.99}>99%</Option>
            </Select>
          </Form.Item>

          <Form.Item name="isActive" label="Activate Configuration" valuePropName="checked">
            <Switch />
          </Form.Item>
        </div>
      ),
    },
  ];

  return (
    <Card
      title={
        <Space>
          <BarChartOutlined />
          <Title level={3} style={{ margin: 0 }}>
            {existingConfig ? 'Edit' : 'Configure'} SPC for {parameterName}
          </Title>
        </Space>
      }
      extra={
        <Space>
          {onCancel && (
            <Button onClick={onCancel}>Cancel</Button>
          )}
        </Space>
      }
    >
      <Steps current={currentStep} style={{ marginBottom: '32px' }}>
        {steps.map((step) => (
          <Step key={step.title} title={step.title} icon={step.icon} />
        ))}
      </Steps>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          chartType: 'I_MR',
          limitsBasedOn: 'HISTORICAL_DATA',
          historicalDataDays: 30,
          ruleSensitivity: 'NORMAL',
          enableCapability: true,
          confidenceLevel: 0.95,
          isActive: true,
        }}
      >
        <div style={{ minHeight: '400px' }}>{steps[currentStep].content}</div>

        <Divider />

        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Button disabled={currentStep === 0} onClick={() => setCurrentStep(currentStep - 1)}>
            Previous
          </Button>
          <Space>
            {currentStep < steps.length - 1 && (
              <Button type="primary" onClick={() => setCurrentStep(currentStep + 1)}>
                Next
              </Button>
            )}
            {currentStep === steps.length - 1 && (
              <Button type="primary" icon={<SaveOutlined />} loading={loading} onClick={handleSave}>
                Save Configuration
              </Button>
            )}
          </Space>
        </Space>
      </Form>
    </Card>
  );
};

export default SPCConfiguration;
