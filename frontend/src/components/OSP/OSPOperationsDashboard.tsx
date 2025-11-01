/**
 * OSP Operations Dashboard Component
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Displays pending OSP operations, status tracking, and quantity management
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Table,
  Button,
  Badge,
  Modal,
  Form,
  Alert,
  Spinner,
  Row,
  Col,
  Card
} from 'react-bootstrap';
import axios from 'axios';

interface OSPOperation {
  id: string;
  ospNumber: string;
  operationId: string;
  vendorId: string;
  quantitySent: number;
  quantityReceived: number;
  quantityAccepted: number;
  quantityRejected: number;
  status: string;
  requestedReturnDate: string;
  expectedReturnDate?: string;
  actualReturnDate?: string;
  estimatedCost?: number;
  actualCost?: number;
  notes?: string;
  createdAt: string;
}

interface OSPOperationsDashboardProps {
  workOrderId?: string;
  vendorId?: string;
}

const OSPOperationsDashboard: React.FC<OSPOperationsDashboardProps> = ({
  workOrderId,
  vendorId
}) => {
  const [operations, setOperations] = useState<OSPOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedOperation, setSelectedOperation] = useState<OSPOperation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchOperations();
  }, [workOrderId, vendorId, filterStatus]);

  const fetchOperations = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: any = {};
      if (workOrderId) params.workOrderId = workOrderId;
      if (vendorId) params.vendorId = vendorId;
      if (filterStatus) params.status = filterStatus;

      const response = await axios.get('/api/v1/osp/operations', { params });
      setOperations(response.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch OSP operations');
    } finally {
      setLoading(false);
    }
  };

  const handleTransitionStatus = async (ospId: string, newStatus: string) => {
    try {
      await axios.post(`/api/v1/osp/operations/${ospId}/transition`, { status: newStatus });
      setShowModal(false);
      fetchOperations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to transition status');
    }
  };

  const handleCancel = async (ospId: string, reason: string) => {
    try {
      await axios.post(`/api/v1/osp/operations/${ospId}/cancel`, { reason });
      setShowModal(false);
      fetchOperations();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to cancel operation');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, string> = {
      PENDING_SHIPMENT: 'warning',
      SHIPPED: 'info',
      AT_SUPPLIER: 'primary',
      IN_PROGRESS: 'primary',
      INSPECTION: 'secondary',
      RECEIVED: 'info',
      ACCEPTED: 'success',
      REJECTED: 'danger',
      CANCELLED: 'dark'
    };
    return <Badge bg={variants[status] || 'secondary'}>{status}</Badge>;
  };

  const getQuantityStatus = (op: OSPOperation) => {
    const total = op.quantitySent;
    const complete = op.quantityAccepted;
    const rejected = op.quantityRejected;
    const percentage = Math.round((complete / total) * 100);

    return `${complete}/${total} (${rejected} rejected, ${percentage}% accepted)`;
  };

  return (
    <Container fluid className="py-4">
      <Row className="mb-4">
        <Col md={8}>
          <h2>OSP Operations Dashboard</h2>
        </Col>
        <Col md={4}>
          <Form.Select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            size="sm"
          >
            <option value="">All Statuses</option>
            <option value="PENDING_SHIPMENT">Pending Shipment</option>
            <option value="SHIPPED">Shipped</option>
            <option value="AT_SUPPLIER">At Supplier</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="INSPECTION">Inspection</option>
            <option value="RECEIVED">Received</option>
            <option value="ACCEPTED">Accepted</option>
            <option value="REJECTED">Rejected</option>
          </Form.Select>
        </Col>
      </Row>

      {error && <Alert variant="danger">{error}</Alert>}

      {loading ? (
        <div className="text-center py-5">
          <Spinner animation="border" />
        </div>
      ) : (
        <>
          <Row className="mb-3">
            <Col md={3}>
              <Card>
                <Card.Body>
                  <Card.Title>Total Operations</Card.Title>
                  <h4>{operations.length}</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card>
                <Card.Body>
                  <Card.Title>Completed</Card.Title>
                  <h4>{operations.filter(o => o.status === 'ACCEPTED').length}</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card>
                <Card.Body>
                  <Card.Title>In Transit</Card.Title>
                  <h4>{operations.filter(o => ['SHIPPED', 'AT_SUPPLIER', 'IN_PROGRESS'].includes(o.status)).length}</h4>
                </Card.Body>
              </Card>
            </Col>
            <Col md={3}>
              <Card>
                <Card.Body>
                  <Card.Title>Issues</Card.Title>
                  <h4>{operations.filter(o => ['REJECTED', 'CANCELLED'].includes(o.status)).length}</h4>
                </Card.Body>
              </Card>
            </Col>
          </Row>

          <Table striped bordered hover responsive>
            <thead>
              <tr>
                <th>OSP Number</th>
                <th>Status</th>
                <th>Quantities</th>
                <th>Requested Return</th>
                <th>Estimated Cost</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {operations.map((op) => (
                <tr key={op.id}>
                  <td>
                    <strong>{op.ospNumber}</strong>
                  </td>
                  <td>{getStatusBadge(op.status)}</td>
                  <td>{getQuantityStatus(op)}</td>
                  <td>{new Date(op.requestedReturnDate).toLocaleDateString()}</td>
                  <td>{op.estimatedCost ? `$${op.estimatedCost.toFixed(2)}` : '-'}</td>
                  <td>
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => {
                        setSelectedOperation(op);
                        setShowModal(true);
                      }}
                    >
                      Manage
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </>
      )}

      <OSPOperationModal
        show={showModal}
        operation={selectedOperation}
        onHide={() => setShowModal(false)}
        onTransition={handleTransitionStatus}
        onCancel={handleCancel}
      />
    </Container>
  );
};

interface OSPOperationModalProps {
  show: boolean;
  operation: OSPOperation | null;
  onHide: () => void;
  onTransition: (ospId: string, newStatus: string) => Promise<void>;
  onCancel: (ospId: string, reason: string) => Promise<void>;
}

const OSPOperationModal: React.FC<OSPOperationModalProps> = ({
  show,
  operation,
  onHide,
  onTransition,
  onCancel
}) => {
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);

  if (!operation) return null;

  const getAvailableTransitions: Record<string, string[]> = {
    PENDING_SHIPMENT: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['AT_SUPPLIER', 'CANCELLED'],
    AT_SUPPLIER: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['INSPECTION', 'CANCELLED'],
    INSPECTION: ['RECEIVED', 'REJECTED', 'CANCELLED'],
    RECEIVED: ['ACCEPTED', 'REJECTED'],
    ACCEPTED: [],
    REJECTED: ['PENDING_SHIPMENT', 'CANCELLED'],
    CANCELLED: []
  };

  const transitions = getAvailableTransitions[operation.status] || [];

  const handleStatusChange = async (newStatus: string) => {
    setLoading(true);
    try {
      await onTransition(operation.id, newStatus);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOperation = async () => {
    setLoading(true);
    try {
      await onCancel(operation.id, cancelReason);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>Manage OSP Operation {operation.ospNumber}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="mb-3">
          <Col md={6}>
            <strong>Status:</strong> {operation.status}
          </Col>
          <Col md={6}>
            <strong>Quantity Sent:</strong> {operation.quantitySent}
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={6}>
            <strong>Quantity Received:</strong> {operation.quantityReceived}
          </Col>
          <Col md={6}>
            <strong>Quantity Accepted:</strong> {operation.quantityAccepted}
          </Col>
        </Row>
        <Row className="mb-3">
          <Col md={6}>
            <strong>Requested Return:</strong> {new Date(operation.requestedReturnDate).toLocaleDateString()}
          </Col>
          <Col md={6}>
            <strong>Expected Return:</strong> {operation.expectedReturnDate ? new Date(operation.expectedReturnDate).toLocaleDateString() : '-'}
          </Col>
        </Row>

        <hr />

        <h6>Status Transitions</h6>
        {transitions.length > 0 ? (
          <div className="mb-3">
            {transitions.map((status) => (
              <Button
                key={status}
                variant={status === 'CANCELLED' ? 'danger' : 'success'}
                size="sm"
                className="me-2 mb-2"
                onClick={() => handleStatusChange(status)}
                disabled={loading}
              >
                {status === 'CANCELLED' ? 'Cancel Operation' : `Transition to ${status}`}
              </Button>
            ))}
          </div>
        ) : (
          <Alert variant="info">No status transitions available</Alert>
        )}

        {operation.status !== 'CANCELLED' && operation.status !== 'ACCEPTED' && (
          <>
            <hr />
            <h6>Cancel Operation</h6>
            <Form.Group className="mb-3">
              <Form.Label>Reason for Cancellation</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Enter cancellation reason..."
              />
            </Form.Group>
            <Button
              variant="danger"
              size="sm"
              onClick={handleCancelOperation}
              disabled={loading || !cancelReason}
            >
              {loading ? <Spinner animation="border" size="sm" /> : 'Confirm Cancellation'}
            </Button>
          </>
        )}
      </Modal.Body>
    </Modal>
  );
};

export default OSPOperationsDashboard;
