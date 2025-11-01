/**
 * Quality Configuration Panel Component
 * Configure quality thresholds and settings
 */

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  Select,
  Button,
  Space,
  Spin,
  message,
  Alert,
  Divider,
  Row,
  Col,
  Card,
} from 'antd';
import { SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import qualityAnalyticsService from '../../services/qualityAnalyticsService';
import type { QualityConfig } from '../../services/qualityAnalyticsService';

interface QualityConfigPanelProps {
  siteId: string;
  open: boolean;
  onClose: () => void;
  onConfigSaved: () => void;
}

const QualityConfigPanel: React.FC<QualityConfigPanelProps> = ({
  siteId,
  open,
  onClose,
  onConfigSaved,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<QualityConfig | null>(null);

  useEffect(() => {
    if (open) {
      loadConfig();
    }
  }, [open, siteId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const data = await qualityAnalyticsService.getQualityConfig(siteId);
      setConfig(data);
      form.setFieldsValue({
        ncrRateThreshold: data.ncrRateThreshold,
        fypThreshold: data.fypThreshold,
        dpmoThreshold: data.dpmoThreshold,
        copqThreshold: data.copqThreshold,
        scrapRateThreshold: data.scrapRateThreshold,
        reworkRateThreshold: data.reworkRateThreshold,
        alertEnabled: data.alertEnabled,
        reportingCurrency: data.reportingCurrency,
      });
    } catch (error) {
      message.error('Failed to load quality configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values: any) => {
    setSaving(true);
    try {
      await qualityAnalyticsService.updateQualityConfig(siteId, values);
      message.success('Quality configuration updated successfully');
      onConfigSaved();
    } catch (error) {
      message.error('Failed to save quality configuration');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      title="Quality Configuration"
      open={open}
      onCancel={onClose}
      width={800}
      footer={null}
      bodyStyle={{ maxHeight: '80vh', overflowY: 'auto' }}
    >
      <Spin spinning={loading}>
        {config && (
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Alert
              message="Quality Thresholds Configuration"
              description="Configure the thresholds for quality metrics. When actual metrics exceed these values, alerts will be triggered."
              type="info"
              showIcon
              style={{ marginBottom: '24px' }}
            />

            {/* Metric Thresholds Section */}
            <Card title="Metric Thresholds" style={{ marginBottom: '24px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="NCR Rate Threshold (%)"
                    name="ncrRateThreshold"
                    rules={[{ required: true, message: 'Please enter NCR rate threshold' }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={2}
                      placeholder="1.0"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="First Pass Yield Threshold (%)"
                    name="fypThreshold"
                    rules={[{ required: true, message: 'Please enter FPY threshold' }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={2}
                      placeholder="95.0"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="DPMO Threshold"
                    name="dpmoThreshold"
                    rules={[{ required: true, message: 'Please enter DPMO threshold' }]}
                  >
                    <InputNumber
                      min={0}
                      step={1000}
                      placeholder="10000"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Cost of Quality Threshold (%)"
                    name="copqThreshold"
                    rules={[{ required: true, message: 'Please enter COPQ threshold' }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={2}
                      placeholder="5.0"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={[16, 16]}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Scrap Rate Threshold (%)"
                    name="scrapRateThreshold"
                    rules={[{ required: true, message: 'Please enter scrap rate threshold' }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={2}
                      placeholder="2.0"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Rework Rate Threshold (%)"
                    name="reworkRateThreshold"
                    rules={[{ required: true, message: 'Please enter rework rate threshold' }]}
                  >
                    <InputNumber
                      min={0}
                      max={100}
                      step={0.1}
                      precision={2}
                      placeholder="3.0"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            <Divider />

            {/* Alert Configuration Section */}
            <Card title="Alert Configuration" style={{ marginBottom: '24px' }}>
              <Form.Item
                label="Enable Alerts"
                name="alertEnabled"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>

              <Form.Item
                label="Reporting Currency"
                name="reportingCurrency"
                rules={[{ required: true, message: 'Please select reporting currency' }]}
              >
                <Select
                  options={[
                    { label: 'USD', value: 'USD' },
                    { label: 'EUR', value: 'EUR' },
                    { label: 'GBP', value: 'GBP' },
                    { label: 'JPY', value: 'JPY' },
                    { label: 'CAD', value: 'CAD' },
                  ]}
                />
              </Form.Item>
            </Card>

            {/* Documentation */}
            <Card title="Threshold Guidelines" type="inner">
              <div style={{ fontSize: '12px', lineHeight: '1.8' }}>
                <p>
                  <strong>NCR Rate:</strong> Percentage of non-conformance reports relative to units produced.
                  Industry average: 0.5-1.5%
                </p>
                <p>
                  <strong>First Pass Yield:</strong> Percentage of units passing inspection without defects.
                  Target: &gt;95%
                </p>
                <p>
                  <strong>DPMO:</strong> Defects per million opportunities. Six Sigma quality: &lt;3,400
                </p>
                <p>
                  <strong>Cost of Quality:</strong> Percentage of revenue spent on quality activities.
                  Target for mature systems: 2-3%
                </p>
                <p>
                  <strong>Scrap Rate:</strong> Percentage of material scrapped due to defects.
                  Target: &lt;2%
                </p>
                <p>
                  <strong>Rework Rate:</strong> Percentage of units requiring rework.
                  Target: &lt;3%
                </p>
              </div>
            </Card>

            <Divider />

            {/* Form Actions */}
            <Form.Item style={{ marginBottom: 0 }}>
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={loadConfig} icon={<ReloadOutlined />}>
                  Reset
                </Button>
                <Button type="primary" loading={saving} icon={<SaveOutlined />} htmlType="submit">
                  Save Configuration
                </Button>
              </Space>
            </Form.Item>
          </Form>
        )}
      </Spin>
    </Modal>
  );
};

export default QualityConfigPanel;
