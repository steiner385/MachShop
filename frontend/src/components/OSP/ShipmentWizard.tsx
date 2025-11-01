/**
 * Shipment Wizard Component
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Multi-step form to create and track OSP shipments
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Form,
  Button,
  Alert,
  Spinner,
  Row,
  Col,
  Card,
  ProgressBar,
  Table
} from 'react-bootstrap';
import axios from 'axios';

interface OSPOperation {
  id: string;
  ospNumber: string;
  status: string;
  quantitySent: number;
  quantityReceived: number;
}

interface Shipment {
  ospOperationId: string;
  shipmentType: string;
  sendingVendorId: string;
  receivingVendorId: string;
  quantity: number;
  carrierName?: string;
  trackingNumber?: string;
  shippingMethod?: string;
  poNumber?: string;
  notes?: string;
}

const ShipmentWizard: React.FC = () => {
  const [step, setStep] = useState(1);
  const [ospOperations, setOspOperations] = useState<OSPOperation[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [shipmentData, setShipmentData] = useState<Shipment>({
    ospOperationId: '',
    shipmentType: 'TO_SUPPLIER',
    sendingVendorId: '',
    receivingVendorId: '',
    quantity: 0,
    carrierName: '',
    trackingNumber: '',
    shippingMethod: '',
    poNumber: '',
    notes: ''
  });

  const [recentShipments, setRecentShipments] = useState<any[]>([]);

  useEffect(() => {
    fetchOSPOperations();
    fetchRecentShipments();
  }, []);

  const fetchOSPOperations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/v1/osp/operations', {
        params: { status: 'PENDING_SHIPMENT,AT_SUPPLIER' }
      });
      setOspOperations(response.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch OSP operations');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentShipments = async () => {
    try {
      const response = await axios.get('/api/v1/osp/shipments', {
        params: { limit: 10 }
      });
      setRecentShipments(response.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch shipments');
    }
  };

  const handleStepChange = (value: any, field: string) => {
    setShipmentData({
      ...shipmentData,
      [field]: value
    });
  };

  const handleCreateShipment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!shipmentData.ospOperationId) {
        setError('Please select an OSP operation');
        return;
      }

      if (shipmentData.quantity <= 0) {
        setError('Please enter a valid quantity');
        return;
      }

      const payload = {
        ospOperationId: shipmentData.ospOperationId,
        shipmentType: shipmentData.shipmentType,
        sendingVendorId: shipmentData.sendingVendorId,
        receivingVendorId: shipmentData.receivingVendorId,
        quantity: shipmentData.quantity,
        ...(shipmentData.carrierName && { carrierName: shipmentData.carrierName }),
        ...(shipmentData.trackingNumber && { trackingNumber: shipmentData.trackingNumber }),
        ...(shipmentData.shippingMethod && { shippingMethod: shipmentData.shippingMethod }),
        ...(shipmentData.poNumber && { poNumber: shipmentData.poNumber }),
        ...(shipmentData.notes && { notes: shipmentData.notes })
      };

      await axios.post('/api/v1/osp/shipments', payload);

      setSuccessMessage('Shipment created successfully!');
      setStep(1);
      setShipmentData({
        ospOperationId: '',
        shipmentType: 'TO_SUPPLIER',
        sendingVendorId: '',
        receivingVendorId: '',
        quantity: 0,
        carrierName: '',
        trackingNumber: '',
        shippingMethod: '',
        poNumber: '',
        notes: ''
      });

      setTimeout(() => setSuccessMessage(null), 3000);
      fetchRecentShipments();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create shipment');
    } finally {
      setLoading(false);
    }
  };

  const selectedOp = ospOperations.find(op => op.id === shipmentData.ospOperationId);

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">OSP Shipment Wizard</h2>

      {error && <Alert variant="danger">{error}</Alert>}
      {successMessage && <Alert variant="success">{successMessage}</Alert>}

      <Row>
        <Col lg={8}>
          <Card>
            <Card.Header>
              <Row className="align-items-center">
                <Col>
                  <Card.Title className="mb-0">Create New Shipment</Card.Title>
                </Col>
                <Col xs="auto">
                  <span className="text-muted">Step {step} of 3</span>
                </Col>
              </Row>
              <ProgressBar now={(step / 3) * 100} className="mt-2" />
            </Card.Header>
            <Card.Body>
              <Form onSubmit={handleCreateShipment}>
                {/* Step 1: Select Operation */}
                {step === 1 && (
                  <>
                    <h5>Step 1: Select OSP Operation</h5>
                    <Form.Group className="mb-3">
                      <Form.Label>OSP Operation *</Form.Label>
                      <Form.Select
                        value={shipmentData.ospOperationId}
                        onChange={(e) => handleStepChange(e.target.value, 'ospOperationId')}
                        disabled={loading}
                        required
                      >
                        <option value="">Select an operation...</option>
                        {ospOperations.map((op) => (
                          <option key={op.id} value={op.id}>
                            {op.ospNumber} ({op.status}) - Qty: {op.quantitySent}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>

                    {selectedOp && (
                      <Alert variant="info">
                        <strong>Selected Operation:</strong> {selectedOp.ospNumber}
                        <br />
                        <strong>Status:</strong> {selectedOp.status}
                        <br />
                        <strong>Quantity Sent:</strong> {selectedOp.quantitySent}
                        <br />
                        <strong>Quantity Received:</strong> {selectedOp.quantityReceived}
                      </Alert>
                    )}

                    <Button
                      variant="primary"
                      onClick={() => setStep(2)}
                      disabled={!shipmentData.ospOperationId}
                    >
                      Next Step →
                    </Button>
                  </>
                )}

                {/* Step 2: Shipment Details */}
                {step === 2 && (
                  <>
                    <h5>Step 2: Shipment Details</h5>
                    <Form.Group className="mb-3">
                      <Form.Label>Shipment Type *</Form.Label>
                      <Form.Select
                        value={shipmentData.shipmentType}
                        onChange={(e) => handleStepChange(e.target.value, 'shipmentType')}
                      >
                        <option value="TO_SUPPLIER">To Supplier (Outbound)</option>
                        <option value="FROM_SUPPLIER">From Supplier (Inbound)</option>
                        <option value="SUPPLIER_TO_SUPPLIER">Supplier to Supplier</option>
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Quantity *</Form.Label>
                      <Form.Control
                        type="number"
                        value={shipmentData.quantity}
                        onChange={(e) => handleStepChange(parseInt(e.target.value), 'quantity')}
                        min="1"
                        required
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Shipping Method</Form.Label>
                      <Form.Select
                        value={shipmentData.shippingMethod}
                        onChange={(e) => handleStepChange(e.target.value, 'shippingMethod')}
                      >
                        <option value="">Select method...</option>
                        <option value="Ground">Ground</option>
                        <option value="Air">Air</option>
                        <option value="Ocean">Ocean</option>
                        <option value="Courier">Courier</option>
                      </Form.Select>
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>PO Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={shipmentData.poNumber}
                        onChange={(e) => handleStepChange(e.target.value, 'poNumber')}
                        placeholder="Enter ERP PO number..."
                      />
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button variant="secondary" onClick={() => setStep(1)}>
                        ← Previous
                      </Button>
                      <Button variant="primary" onClick={() => setStep(3)}>
                        Next Step →
                      </Button>
                    </div>
                  </>
                )}

                {/* Step 3: Carrier Information */}
                {step === 3 && (
                  <>
                    <h5>Step 3: Carrier & Tracking</h5>
                    <Form.Group className="mb-3">
                      <Form.Label>Carrier Name</Form.Label>
                      <Form.Control
                        type="text"
                        value={shipmentData.carrierName}
                        onChange={(e) => handleStepChange(e.target.value, 'carrierName')}
                        placeholder="e.g., FedEx, UPS, DHL..."
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Tracking Number</Form.Label>
                      <Form.Control
                        type="text"
                        value={shipmentData.trackingNumber}
                        onChange={(e) => handleStepChange(e.target.value, 'trackingNumber')}
                        placeholder="Enter tracking number..."
                      />
                    </Form.Group>

                    <Form.Group className="mb-3">
                      <Form.Label>Notes</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={3}
                        value={shipmentData.notes}
                        onChange={(e) => handleStepChange(e.target.value, 'notes')}
                        placeholder="Any additional notes..."
                      />
                    </Form.Group>

                    <div className="d-flex gap-2">
                      <Button variant="secondary" onClick={() => setStep(2)}>
                        ← Previous
                      </Button>
                      <Button
                        variant="success"
                        type="submit"
                        disabled={loading || !shipmentData.ospOperationId || shipmentData.quantity <= 0}
                      >
                        {loading ? <Spinner animation="border" size="sm" /> : 'Create Shipment'}
                      </Button>
                    </div>
                  </>
                )}
              </Form>
            </Card.Body>
          </Card>
        </Col>

        <Col lg={4}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Recent Shipments</Card.Title>
            </Card.Header>
            <Card.Body style={{ maxHeight: '500px', overflowY: 'auto' }}>
              {recentShipments.length > 0 ? (
                <Table striped bordered size="sm">
                  <thead>
                    <tr>
                      <th>Shipment #</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentShipments.slice(0, 10).map((shipment) => (
                      <tr key={shipment.id}>
                        <td>{shipment.shipmentNumber}</td>
                        <td>
                          <small>{shipment.status}</small>
                        </td>
                        <td>
                          <small>
                            {new Date(shipment.createdAt).toLocaleDateString()}
                          </small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info" size="sm">
                  No recent shipments
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default ShipmentWizard;
