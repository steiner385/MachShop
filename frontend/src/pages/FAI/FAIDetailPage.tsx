import React, { useEffect, useState } from 'react';
import {
  Card,
  Descriptions,
  Tag,
  Button,
  Space,
  Spin,
  Typography,
  Alert,
  message,
  Table,
  Statistic,
  Row,
  Col,
  Modal,
} from 'antd';
import {
  ArrowLeftOutlined,
  CheckCircleOutlined,
  FileSearchOutlined,
  SafetyOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { useFAIStore } from '@/store/faiStore';
import { useSignatureStore } from '@/store/signatureStore';
import { SignatureDisplay } from '@/components/Signatures/SignatureDisplay';
import { SignatureModal, SignatureData } from '@/components/Signatures/SignatureModal';
import { CMMImportModal } from '@/components/FAI/CMMImportModal';
import { useAuthStore } from '@/store/AuthStore';
import { FAICharacteristic } from '@/api/fai';
import type { ColumnsType } from 'antd/es/table';

const { Title } = Typography;

/**
 * Status color mapping
 */
const STATUS_COLORS: Record<string, string> = {
  IN_PROGRESS: 'processing',
  REVIEW: 'warning',
  APPROVED: 'success',
  REJECTED: 'error',
  SUPERSEDED: 'default',
};

/**
 * FAI Detail Page
 *
 * Route: /fai/:id
 *
 * Displays full details of an AS9102 FAI report including:
 * - Report metadata
 * - Characteristics table (Form 3)
 * - Electronic signatures
 * - Approval workflow
 */
const FAIDetailPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [signaturesLoading, setSignaturesLoading] = useState(false);
  const [signatureModalVisible, setSignatureModalVisible] = useState(false);
  const [approvingWithSignature, setApprovingWithSignature] = useState(false);
  const [cmmImportModalVisible, setCmmImportModalVisible] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  const { user } = useAuthStore();

  const {
    currentReport,
    characteristics,
    isLoadingDetail,
    detailError,
    getFAIReport,
    getCharacteristics,
    approveFAIReport,
  } = useFAIStore();

  const {
    signatures,
    getSignaturesForEntity,
    createSignature,
  } = useSignatureStore();

  // Load FAI report on mount
  useEffect(() => {
    if (id) {
      loadFAIData();
    }
  }, [id]);

  const loadFAIData = async () => {
    if (!id) return;
    try {
      await getFAIReport(id);
      await getCharacteristics(id);
      await loadSignatures();
    } catch (error) {
      console.error('Failed to load FAI data:', error);
    }
  };

  // Load signatures
  const loadSignatures = async () => {
    if (!id) return;
    try {
      setSignaturesLoading(true);
      await getSignaturesForEntity('fai_report', id);
    } catch (error: any) {
      console.error('Failed to load signatures:', error);
    } finally {
      setSignaturesLoading(false);
    }
  };

  // Convert signatures
  const convertToSignatureInfo = (auditTrail: typeof signatures): any[] => {
    return auditTrail.map((sig: any) => ({
      id: sig.signatureId || sig.id,
      userId: sig.userId,
      username: sig.username,
      firstName: sig.firstName,
      lastName: sig.lastName,
      signatureType: sig.signatureType,
      signatureLevel: sig.signatureLevel,
      timestamp: sig.timestamp,
      isValid: sig.isValid,
      biometricType: sig.biometricType,
      biometricScore: sig.biometricScore,
      invalidationReason: sig.invalidationReason,
      invalidatedAt: sig.invalidatedAt,
      signatureReason: sig.signatureReason,
    }));
  };

  // Handle approve - opens signature modal
  const handleApprove = () => {
    // Check if all characteristics are measured
    const unmeasured = characteristics.filter(
      (c) => !c.measuredValues || c.measuredValues.length === 0
    );

    if (unmeasured.length > 0) {
      Modal.warning({
        title: 'Cannot Approve',
        content: `There are ${unmeasured.length} characteristics without measurements. All characteristics must be measured before approval.`,
      });
      return;
    }

    setSignatureModalVisible(true);
  };

  // Handle signature and approval
  const handleSign = async (signatureData: SignatureData) => {
    if (!id || !user) return;

    try {
      setApprovingWithSignature(true);

      // Create signature
      await createSignature({
        signedEntityType: 'fai_report',
        signedEntityId: id,
        signedEntityName: currentReport?.faiNumber || 'FAI Report',
        signatureLevel: 'QUALITY', // FAI approval requires quality level
        signatureType: 'QUALIFIED', // Require QUALIFIED signature for FAI
        userId: user.id,
        password: signatureData.password,
        biometricTemplate: signatureData.biometricTemplate,
        biometricScore: signatureData.biometricScore,
        signatureReason: signatureData.signatureReason || 'FAI Report Approval',
      });

      // Approve FAI report
      await approveFAIReport(id);

      message.success('FAI report approved and signed successfully');
      setSignatureModalVisible(false);

      // Reload data
      await loadFAIData();
    } catch (error: any) {
      message.error(error.message || 'Failed to approve FAI report');
    } finally {
      setApprovingWithSignature(false);
    }
  };

  // Handle CMM import success
  const handleCMMImportSuccess = async () => {
    message.success('CMM data imported successfully');
    setCmmImportModalVisible(false);
    // Reload characteristics
    await loadFAIData();
  };

  // Handle PDF generation
  const handleGeneratePDF = async () => {
    if (!id) return;

    setGeneratingPDF(true);
    try {
      // Open download in new tab
      window.open(`/api/v1/fai/${id}/download-pdf`, '_blank');
      message.success('FAIR PDF generated successfully');
    } catch (error: any) {
      message.error('Failed to generate PDF');
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Characteristic table columns
  const charColumns: ColumnsType<FAICharacteristic> = [
    {
      title: '#',
      dataIndex: 'characteristicNumber',
      key: 'characteristicNumber',
      width: '60px',
      sorter: (a, b) => a.characteristicNumber - b.characteristicNumber,
    },
    {
      title: 'Characteristic',
      dataIndex: 'characteristic',
      key: 'characteristic',
      width: '20%',
    },
    {
      title: 'Specification',
      dataIndex: 'specification',
      key: 'specification',
      width: '15%',
    },
    {
      title: 'Nominal',
      dataIndex: 'nominalValue',
      key: 'nominalValue',
      width: '10%',
      align: 'right',
      render: (val: number | null) => (val !== null ? val.toFixed(3) : 'N/A'),
    },
    {
      title: 'Upper Limit',
      dataIndex: 'upperLimit',
      key: 'upperLimit',
      width: '10%',
      align: 'right',
      render: (val: number | null) => (val !== null ? val.toFixed(3) : 'N/A'),
    },
    {
      title: 'Lower Limit',
      dataIndex: 'lowerLimit',
      key: 'lowerLimit',
      width: '10%',
      align: 'right',
      render: (val: number | null) => (val !== null ? val.toFixed(3) : 'N/A'),
    },
    {
      title: 'Actual',
      dataIndex: 'actualValue',
      key: 'actualValue',
      width: '10%',
      align: 'right',
      render: (val: number | null) => (val !== null ? val.toFixed(3) : 'N/A'),
    },
    {
      title: 'Deviation',
      dataIndex: 'deviation',
      key: 'deviation',
      width: '10%',
      align: 'right',
      render: (val: number | null) => (val !== null ? val.toFixed(3) : 'N/A'),
    },
    {
      title: 'Result',
      dataIndex: 'result',
      key: 'result',
      width: '10%',
      align: 'center',
      render: (result: string | null) => {
        if (!result) return <Tag>N/A</Tag>;
        const color = result === 'PASS' ? 'success' : result === 'FAIL' ? 'error' : 'default';
        return <Tag color={color}>{result}</Tag>;
      },
    },
  ];

  if (isLoadingDetail) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" tip="Loading FAI report..."><div /></Spin>
      </div>
    );
  }

  if (detailError || !currentReport) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Alert
            message="Error"
            description={detailError || 'FAI report not found'}
            type="error"
            showIcon
            style={{ marginBottom: '16px' }}
          />
          <Button
            type="primary"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate('/fai')}
          >
            Back to List
          </Button>
        </Card>
      </div>
    );
  }

  const fai = currentReport;
  const canApprove = fai.status === 'REVIEW';

  // Calculate statistics
  const totalChars = characteristics.length;
  const passChars = characteristics.filter((c) => c.result === 'PASS').length;
  const failChars = characteristics.filter((c) => c.result === 'FAIL').length;
  const naChars = characteristics.filter((c) => !c.result || c.result === 'N/A').length;

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Back Button */}
      <Button
        type="text"
        icon={<ArrowLeftOutlined />}
        onClick={() => navigate('/fai')}
        style={{ marginBottom: '16px' }}
      >
        Back to List
      </Button>

      {/* Header Card */}
      <Card style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <Space align="center" style={{ marginBottom: '16px' }}>
              <FileSearchOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
              <Title level={2} style={{ margin: 0 }}>
                {fai.faiNumber}
              </Title>
              <Tag color={STATUS_COLORS[fai.status]} style={{ fontSize: '14px' }}>
                {fai.status}
              </Tag>
            </Space>
          </div>

          <Space size="middle">
            <Button
              size="large"
              icon={<FileSearchOutlined />}
              onClick={() => setCmmImportModalVisible(true)}
              disabled={fai.status === 'APPROVED'}
            >
              Import CMM Data
            </Button>
            <Button
              size="large"
              icon={<FileSearchOutlined />}
              onClick={handleGeneratePDF}
              loading={generatingPDF}
            >
              Generate FAIR PDF
            </Button>
            {canApprove && (
              <Button
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleApprove}
                style={{ background: '#52c41a', borderColor: '#52c41a' }}
              >
                Approve with Signature
              </Button>
            )}
          </Space>
        </div>
      </Card>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Characteristics"
              value={totalChars}
              prefix={<FileSearchOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Pass"
              value={passChars}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Fail"
              value={failChars}
              prefix={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic title="Not Measured" value={naChars} valueStyle={{ color: '#999' }} />
          </Card>
        </Col>
      </Row>

      {/* Metadata */}
      <Card title="Report Details" style={{ marginBottom: '24px' }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="FAI Number">{fai.faiNumber}</Descriptions.Item>
          <Descriptions.Item label="Status">
            <Tag color={STATUS_COLORS[fai.status]}>{fai.status}</Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Part ID">{fai.partId}</Descriptions.Item>
          <Descriptions.Item label="Work Order">{fai.workOrderId || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Inspection ID">{fai.inspectionId || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Revision">{fai.revisionLevel || 'N/A'}</Descriptions.Item>
          <Descriptions.Item label="Created">
            {new Date(fai.createdAt).toLocaleString()}
          </Descriptions.Item>
          <Descriptions.Item label="Last Updated">
            {new Date(fai.updatedAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Characteristics Table */}
      <Card
        title={
          <Space>
            <FileSearchOutlined />
            <span>Form 3 - Characteristic Accountability ({totalChars})</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        <Table
          columns={charColumns}
          dataSource={characteristics}
          rowKey="id"
          pagination={false}
          scroll={{ x: 1400 }}
          bordered
        />
      </Card>

      {/* Electronic Signatures */}
      <Card
        title={
          <Space>
            <SafetyOutlined />
            <span>Electronic Signatures</span>
          </Space>
        }
        style={{ marginBottom: '24px' }}
      >
        {signaturesLoading ? (
          <div style={{ textAlign: 'center', padding: '24px' }}>
            <Spin tip="Loading signatures..."><div /></Spin>
          </div>
        ) : signatures && signatures.length > 0 ? (
          <SignatureDisplay signatures={convertToSignatureInfo(signatures)} showDetails />
        ) : (
          <Alert
            message="No Signatures"
            description="This FAI report has not been electronically signed yet. QUALIFIED signature required for approval."
            type="info"
            showIcon
          />
        )}
      </Card>

      {/* Signature Modal */}
      <SignatureModal
        visible={signatureModalVisible}
        onCancel={() => setSignatureModalVisible(false)}
        onSign={handleSign}
        entityType="fai_report"
        entityId={id || ''}
        entityName={fai.faiNumber}
        signatureLevel="QUALITY"
        signatureType="QUALIFIED"
        requireBiometric={true}
        title="Sign and Approve FAI Report"
        description="Approving this FAI report requires a QUALIFIED electronic signature (username + password + 2FA + biometric). This ensures aerospace quality compliance (AS9102 Rev C)."
      />

      {/* CMM Import Modal */}
      <CMMImportModal
        visible={cmmImportModalVisible}
        faiReportId={id || ''}
        onCancel={() => setCmmImportModalVisible(false)}
        onSuccess={handleCMMImportSuccess}
      />
    </div>
  );
};

export default FAIDetailPage;
