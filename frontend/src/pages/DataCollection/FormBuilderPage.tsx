/**
 * FormBuilder Page (Issue #45 - Phase 3)
 * Page wrapper component for the form builder admin interface
 */

import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spin, Result, Button, Space } from 'antd';
import { HomeOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { FormBuilder } from '@/components/DataCollection/FormBuilder';

interface FormBuilderPageProps {
  formId?: string;
  routingOperationId?: string;
}

/**
 * FormBuilder Page Component
 * Wrapper component that provides routing and state management for the form builder
 */
export const FormBuilderPage: React.FC<FormBuilderPageProps> = ({
  formId: propFormId,
  routingOperationId: propRoutingOperationId,
}) => {
  const navigate = useNavigate();
  const params = useParams<{ formId?: string; operationId?: string }>();

  // Get IDs from props or URL params
  const formId = propFormId || params.formId;
  const routingOperationId = propRoutingOperationId || params.operationId;

  // Validate required parameters
  if (!routingOperationId) {
    return (
      <Result
        status="error"
        title="Missing Parameter"
        subTitle="Routing Operation ID is required to create or edit forms"
        extra={
          <Button
            type="primary"
            icon={<HomeOutlined />}
            onClick={() => navigate('/admin/routing-operations')}
          >
            Go to Routing Operations
          </Button>
        }
      />
    );
  }

  const handleFormSaved = (form: any) => {
    // Navigate to the form list for this routing operation
    navigate(`/admin/routing-operations/${routingOperationId}/forms`);
  };

  const handleCancel = () => {
    // Navigate back to the form list for this routing operation
    navigate(`/admin/routing-operations/${routingOperationId}/forms`);
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      <div style={{ marginBottom: '16px' }}>
        <Button
          icon={<ArrowLeftOutlined />}
          onClick={handleCancel}
          style={{ marginBottom: '16px' }}
        >
          Back
        </Button>
      </div>

      <FormBuilder
        formId={formId}
        routingOperationId={routingOperationId}
        onFormSaved={handleFormSaved}
        onCancel={handleCancel}
      />
    </div>
  );
};

export default FormBuilderPage;
