/**
 * Supplier Master Data Management Component
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * View and manage supplier capabilities, certifications, and OSP qualifications
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Table,
  Button,
  Modal,
  Form,
  Alert,
  Spinner,
  Row,
  Col,
  Card,
  Badge
} from 'react-bootstrap';
import axios from 'axios';

interface SupplierCapability {
  id: string;
  vendorId: string;
  capabilityType: string;
  certifications: string[];
  minOrderQuantity: number;
  maxOrderQuantity?: number;
  standardLeadDays: number;
  isActive: boolean;
}

interface Supplier {
  id: string;
  code: string;
  name: string;
  contactEmail?: string;
  contactPhone?: string;
  qualityRating: number;
  onTimeDeliveryRate: number;
  isActive: boolean;
}

const SupplierMasterData: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [capabilities, setCapabilities] = useState<SupplierCapability[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showCapabilityModal, setShowCapabilityModal] = useState(false);
  const [newCapability, setNewCapability] = useState({
    capabilityType: '',
    certifications: '',
    minOrderQuantity: 1,
    maxOrderQuantity: undefined,
    standardLeadDays: 0
  });

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      setLoading(true);
      setError(null);
      // This would fetch from a vendors endpoint
      // For now, we'll show the structure
    } catch (err: any) {
      setError('Failed to fetch suppliers');
    } finally {
      setLoading(false);
    }
  };

  const fetchCapabilities = async (vendorId: string) => {
    try {
      setLoading(true);
      // Fetch capabilities for this supplier
      // Would be from a GET /osp/suppliers/:vendorId/capabilities endpoint
    } catch (err: any) {
      setError('Failed to fetch supplier capabilities');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCapability = async () => {
    if (!selectedSupplier) return;

    try {
      const certArray = newCapability.certifications
        .split(',')
        .map(c => c.trim())
        .filter(c => c);

      const payload = {
        capabilityType: newCapability.capabilityType,
        certifications: certArray,
        minOrderQuantity: newCapability.minOrderQuantity,
        maxOrderQuantity: newCapability.maxOrderQuantity,
        standardLeadDays: newCapability.standardLeadDays
      };

      // POST to /api/v1/osp/suppliers/:vendorId/capabilities
      await axios.post(`/api/v1/osp/suppliers/${selectedSupplier.id}/capabilities`, payload);

      setShowCapabilityModal(false);
      setNewCapability({
        capabilityType: '',
        certifications: '',
        minOrderQuantity: 1,
        maxOrderQuantity: undefined,
        standardLeadDays: 0
      });

      if (selectedSupplier) {
        fetchCapabilities(selectedSupplier.id);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add capability');
    }
  };

  const handleSelectSupplier = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    await fetchCapabilities(supplier.id);
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 90) return 'success';
    if (rating >= 75) return 'warning';
    return 'danger';
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Supplier Master Data Management</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      <Row className="mb-4">
        <Col md={6}>
          <Card>
            <Card.Header>
              <Card.Title className="mb-0">Suppliers</Card.Title>
            </Card.Header>
            <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {loading ? (
                <Spinner animation="border" />
              ) : suppliers.length > 0 ? (
                <Table striped bordered size="sm">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Quality</th>
                      <th>OnTime %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((supplier) => (
                      <tr
                        key={supplier.id}
                        onClick={() => handleSelectSupplier(supplier)}
                        style={{ cursor: 'pointer' }}
                        className={selectedSupplier?.id === supplier.id ? 'table-active' : ''}
                      >
                        <td>{supplier.code}</td>
                        <td>{supplier.name}</td>
                        <td>
                          <Badge bg={getRatingColor(supplier.qualityRating)}>
                            {supplier.qualityRating}%
                          </Badge>
                        </td>
                        <td>
                          <Badge bg={getRatingColor(supplier.onTimeDeliveryRate)}>
                            {supplier.onTimeDeliveryRate}%
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              ) : (
                <Alert variant="info">No suppliers found</Alert>
              )}
            </Card.Body>
          </Card>
        </Col>

        <Col md={6}>
          {selectedSupplier && (
            <Card>
              <Card.Header>
                <Row className="align-items-center">
                  <Col>
                    <Card.Title className="mb-0">
                      {selectedSupplier.name} - Capabilities
                    </Card.Title>
                  </Col>
                  <Col xs="auto">
                    <Button
                      size="sm"
                      variant="primary"
                      onClick={() => setShowCapabilityModal(true)}
                    >
                      + Add Capability
                    </Button>
                  </Col>
                </Row>
              </Card.Header>
              <Card.Body style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {capabilities.length > 0 ? (
                  <Table striped bordered size="sm">
                    <thead>
                      <tr>
                        <th>Capability</th>
                        <th>Min Order</th>
                        <th>Lead Days</th>
                        <th>Certifications</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capabilities.map((cap) => (
                        <tr key={cap.id}>
                          <td>{cap.capabilityType}</td>
                          <td>{cap.minOrderQuantity}</td>
                          <td>{cap.standardLeadDays}</td>
                          <td>
                            {cap.certifications.map((cert) => (
                              <Badge key={cert} bg="info" className="me-1">
                                {cert}
                              </Badge>
                            ))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                ) : (
                  <Alert variant="info">
                    No capabilities defined. Add one to enable OSP operations with this supplier.
                  </Alert>
                )}
              </Card.Body>
            </Card>
          )}
        </Col>
      </Row>

      <AddCapabilityModal
        show={showCapabilityModal}
        onHide={() => setShowCapabilityModal(false)}
        newCapability={newCapability}
        setNewCapability={setNewCapability}
        onAdd={handleAddCapability}
      />
    </Container>
  );
};

interface AddCapabilityModalProps {
  show: boolean;
  onHide: () => void;
  newCapability: any;
  setNewCapability: (cap: any) => void;
  onAdd: () => Promise<void>;
}

const AddCapabilityModal: React.FC<AddCapabilityModalProps> = ({
  show,
  onHide,
  newCapability,
  setNewCapability,
  onAdd
}) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAdd();
      onHide();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal show={show} onHide={onHide}>
      <Modal.Header closeButton>
        <Modal.Title>Add Supplier Capability</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Capability Type *</Form.Label>
            <Form.Control
              type="text"
              value={newCapability.capabilityType}
              onChange={(e) =>
                setNewCapability({ ...newCapability, capabilityType: e.target.value })
              }
              placeholder="e.g., HEAT_TREAT, PLATING, MACHINING"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Certifications (comma-separated)</Form.Label>
            <Form.Control
              type="text"
              value={newCapability.certifications}
              onChange={(e) =>
                setNewCapability({ ...newCapability, certifications: e.target.value })
              }
              placeholder="e.g., AS9100, NADCAP, ISO9001"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Minimum Order Quantity *</Form.Label>
            <Form.Control
              type="number"
              value={newCapability.minOrderQuantity}
              onChange={(e) =>
                setNewCapability({ ...newCapability, minOrderQuantity: parseInt(e.target.value) })
              }
              min="1"
              required
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Maximum Order Quantity</Form.Label>
            <Form.Control
              type="number"
              value={newCapability.maxOrderQuantity || ''}
              onChange={(e) =>
                setNewCapability({
                  ...newCapability,
                  maxOrderQuantity: e.target.value ? parseInt(e.target.value) : undefined
                })
              }
              min="1"
            />
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Standard Lead Time (days) *</Form.Label>
            <Form.Control
              type="number"
              value={newCapability.standardLeadDays}
              onChange={(e) =>
                setNewCapability({
                  ...newCapability,
                  standardLeadDays: parseInt(e.target.value)
                })
              }
              min="0"
              required
            />
          </Form.Group>

          <div className="d-grid gap-2">
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? <Spinner animation="border" size="sm" /> : 'Add Capability'}
            </Button>
          </div>
        </Form>
      </Modal.Body>
    </Modal>
  );
};

export default SupplierMasterData;
