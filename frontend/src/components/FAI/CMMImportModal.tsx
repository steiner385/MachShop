import React, { useState } from 'react';
import {
  Modal,
  Upload,
  Button,
  Steps,
  Table,
  Alert,
  Space,
  Typography,
  Statistic,
  Row,
  Col,
  Tag,
  message,
} from 'antd';
import {
  InboxOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  FileSearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import type { ColumnsType } from 'antd/es/table';
import axios from 'axios';

const { Dragger } = Upload;

interface CMMImportModalProps {
  visible: boolean;
  faiReportId: string;
  onCancel: () => void;
  onSuccess: () => void;
}

interface CMMDimension {
  characteristicNumber: number;
  characteristic: string;
  nominalValue: number;
  upperTolerance: number;
  lowerTolerance: number;
  actualValue: number;
  deviation: number;
  result: 'PASS' | 'FAIL';
  unitOfMeasure: string;
}

interface CMMImportPreview {
  totalDimensions: number;
  matchedCharacteristics: number;
  unmatchedDimensions: CMMDimension[];
  outOfToleranceCount: number;
  estimatedImportTime: number;
}

interface CMMImportResult {
  success: boolean;
  importedCount: number;
  updatedCount: number;
  errorCount: number;
  errors: string[];
  warnings: string[];
  summary: {
    totalDimensions: number;
    passCount: number;
    failCount: number;
    unmatchedDimensions: string[];
  };
}

export const CMMImportModal: React.FC<CMMImportModalProps> = ({
  visible,
  faiReportId,
  onCancel,
  onSuccess,
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [xmlContent, setXmlContent] = useState<string>('');
  const [isValidating, setIsValidating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [preview, setPreview] = useState<CMMImportPreview | null>(null);
  const [importResult, setImportResult] = useState<CMMImportResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Reset state when modal closes
  const handleCancel = () => {
    setCurrentStep(0);
    setFileList([]);
    setXmlContent('');
    setPreview(null);
    setImportResult(null);
    setValidationError(null);
    onCancel();
  };

  // Handle file upload
  const handleFileChange = async (info: any) => {
    const { file } = info;

    if (file.status === 'removed') {
      setFileList([]);
      setXmlContent('');
      setValidationError(null);
      return;
    }

    // Read file content
    const reader = new FileReader();
    reader.onload = async (e) => {
      const content = e.target?.result as string;
      setXmlContent(content);
      setFileList([file]);

      // Auto-validate
      await validateXML(content);
    };
    reader.readAsText(file.originFileObj as Blob);

    // Prevent upload
    return false;
  };

  // Validate XML file
  const validateXML = async (content: string) => {
    setIsValidating(true);
    setValidationError(null);

    try {
      const response = await axios.post(
        `/api/v1/fai/${faiReportId}/import-cmm/validate`,
        { xmlContent: content }
      );

      if (!response.data.isValid) {
        setValidationError(response.data.errors.join(', '));
        message.error('Invalid XML file');
      } else {
        message.success('XML file validated successfully');
        if (response.data.warnings.length > 0) {
          message.warning(`Warnings: ${response.data.warnings.join(', ')}`);
        }
      }
    } catch (error: any) {
      setValidationError(error.response?.data?.error || 'Validation failed');
      message.error('Failed to validate XML file');
    } finally {
      setIsValidating(false);
    }
  };

  // Generate preview
  const handlePreview = async () => {
    if (!xmlContent) {
      message.error('Please upload a file first');
      return;
    }

    setIsValidating(true);
    try {
      const response = await axios.post(
        `/api/v1/fai/${faiReportId}/import-cmm/preview`,
        { xmlContent }
      );

      setPreview(response.data);
      setCurrentStep(1);
      message.success('Preview generated successfully');
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to generate preview');
    } finally {
      setIsValidating(false);
    }
  };

  // Execute import
  const handleImport = async () => {
    if (!xmlContent) return;

    setIsImporting(true);
    try {
      const response = await axios.post(`/api/v1/fai/${faiReportId}/import-cmm`, {
        xmlContent,
        autoMatch: true,
      });

      setImportResult(response.data);
      setCurrentStep(2);

      if (response.data.success) {
        message.success(
          `Successfully imported ${response.data.importedCount} characteristics`
        );
      } else {
        message.error('Import completed with errors');
      }
    } catch (error: any) {
      message.error(error.response?.data?.error || 'Failed to import CMM data');
    } finally {
      setIsImporting(false);
    }
  };

  // Complete import
  const handleComplete = () => {
    onSuccess();
    handleCancel();
  };

  // Table columns for unmatched dimensions
  const unmatchedColumns: ColumnsType<CMMDimension> = [
    {
      title: '#',
      dataIndex: 'characteristicNumber',
      key: 'characteristicNumber',
      width: 50,
    },
    {
      title: 'Characteristic',
      dataIndex: 'characteristic',
      key: 'characteristic',
      width: 200,
    },
    {
      title: 'Actual',
      dataIndex: 'actualValue',
      key: 'actualValue',
      width: 100,
      render: (val: number) => val.toFixed(3),
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: 80,
      render: (result: string) => (
        <Tag color={result === 'PASS' ? 'success' : 'error'}>{result}</Tag>
      ),
    },
  ];

  return (
    <Modal
      title={
        <Space>
          <FileSearchOutlined />
          <span>Import CMM Data (PC-DMIS XML)</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      width={900}
      footer={null}
      destroyOnClose
    >
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        <Steps.Step title="Upload" icon={<UploadOutlined />} />
        <Steps.Step title="Preview" icon={<FileSearchOutlined />} />
        <Steps.Step title="Import" icon={<CheckCircleOutlined />} />
      </Steps>

      {/* Step 1: File Upload */}
      {currentStep === 0 && (
        <div>
          <Dragger
            fileList={fileList}
            beforeUpload={() => false}
            onChange={handleFileChange}
            accept=".xml,.dmi"
            maxCount={1}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">
              Click or drag PC-DMIS XML file to this area to upload
            </p>
            <p className="ant-upload-hint">
              Supports .xml and .dmi files. Maximum size: 10MB
            </p>
          </Dragger>

          {validationError && (
            <Alert
              message="Validation Error"
              description={validationError}
              type="error"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          {fileList.length > 0 && !validationError && (
            <Alert
              message="File Uploaded Successfully"
              description="Click 'Preview Import' to see what will be imported"
              type="success"
              showIcon
              style={{ marginTop: 16 }}
            />
          )}

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button
                type="primary"
                onClick={handlePreview}
                loading={isValidating}
                disabled={!xmlContent || !!validationError}
              >
                Preview Import
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* Step 2: Preview */}
      {currentStep === 1 && preview && (
        <div>
          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={6}>
              <Statistic
                title="Total Dimensions"
                value={preview.totalDimensions}
                prefix={<FileSearchOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Matched"
                value={preview.matchedCharacteristics}
                valueStyle={{ color: '#3f8600' }}
                prefix={<CheckCircleOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Unmatched"
                value={preview.unmatchedDimensions.length}
                valueStyle={{ color: '#cf1322' }}
                prefix={<WarningOutlined />}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Out of Tolerance"
                value={preview.outOfToleranceCount}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
          </Row>

          {preview.unmatchedDimensions.length > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Alert
                message="Unmatched Dimensions"
                description={`${preview.unmatchedDimensions.length} dimensions could not be automatically matched to existing characteristics. These will be skipped.`}
                type="warning"
                showIcon
              />

              <Table
                columns={unmatchedColumns}
                dataSource={preview.unmatchedDimensions}
                rowKey="characteristicNumber"
                size="small"
                pagination={{ pageSize: 5 }}
                style={{ marginTop: 16 }}
              />
            </div>
          )}

          <Alert
            message="Import Ready"
            description={`Estimated import time: ${(preview.estimatedImportTime / 1000).toFixed(1)} seconds`}
            type="info"
            showIcon
          />

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setCurrentStep(0)}>Back</Button>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button
                type="primary"
                onClick={handleImport}
                loading={isImporting}
                disabled={preview.matchedCharacteristics === 0}
              >
                Import {preview.matchedCharacteristics} Characteristics
              </Button>
            </Space>
          </div>
        </div>
      )}

      {/* Step 3: Import Results */}
      {currentStep === 2 && importResult && (
        <div>
          {importResult.success ? (
            <Alert
              message="Import Successful"
              description={`Successfully imported ${importResult.importedCount} characteristics`}
              type="success"
              showIcon
              icon={<CheckCircleOutlined />}
              style={{ marginBottom: 24 }}
            />
          ) : (
            <Alert
              message="Import Completed with Errors"
              description={`${importResult.errorCount} errors occurred during import`}
              type="error"
              showIcon
              style={{ marginBottom: 24 }}
            />
          )}

          <Row gutter={16} style={{ marginBottom: 24 }}>
            <Col span={8}>
              <Statistic
                title="Imported"
                value={importResult.importedCount}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Pass"
                value={importResult.summary.passCount}
                valueStyle={{ color: '#3f8600' }}
              />
            </Col>
            <Col span={8}>
              <Statistic
                title="Fail"
                value={importResult.summary.failCount}
                valueStyle={{ color: '#cf1322' }}
              />
            </Col>
          </Row>

          {importResult.warnings.length > 0 && (
            <Alert
              message="Warnings"
              description={
                <ul>
                  {importResult.warnings.map((warning, idx) => (
                    <li key={idx}>{warning}</li>
                  ))}
                </ul>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          {importResult.errors.length > 0 && (
            <Alert
              message="Errors"
              description={
                <ul>
                  {importResult.errors.map((error, idx) => (
                    <li key={idx}>{error}</li>
                  ))}
                </ul>
              }
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
          )}

          <div style={{ marginTop: 24, textAlign: 'right' }}>
            <Button type="primary" onClick={handleComplete}>
              Complete
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default CMMImportModal;
