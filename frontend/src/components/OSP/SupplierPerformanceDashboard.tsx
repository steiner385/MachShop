/**
 * Supplier Performance Dashboard Component
 * Issue #59: Core OSP/Farmout Operations Management System
 *
 * Visualize supplier rankings, metrics trends, and performance scorecards
 */

import React, { useState, useEffect } from 'react';
import {
  Container,
  Table,
  Row,
  Col,
  Card,
  Badge,
  ProgressBar,
  Spinner,
  Alert,
  Button,
  Modal
} from 'react-bootstrap';
import axios from 'axios';

interface SupplierRanking {
  vendorId: string;
  vendorName: string;
  vendorCode: string;
  onTimeDeliveryPercent: number;
  qualityPercent: number;
  costVariancePercent?: number;
  overallScore: number;
}

interface SupplierScorecard {
  vendorName: string;
  averageQualityPercent: number;
  averageOnTimePercent: number;
  averageOverallScore: number;
  recentMetrics: any[];
}

const SupplierPerformanceDashboard: React.FC = () => {
  const [rankings, setRankings] = useState<SupplierRanking[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<SupplierRanking | null>(null);
  const [scorecard, setScorecard] = useState<SupplierScorecard | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showScorecardModal, setShowScorecardModal] = useState(false);

  useEffect(() => {
    fetchRankings();
  }, []);

  const fetchRankings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('/api/v1/osp/suppliers/rankings', {
        params: { limit: 20 }
      });
      setRankings(response.data.data || []);
    } catch (err: any) {
      setError('Failed to fetch supplier rankings');
    } finally {
      setLoading(false);
    }
  };

  const fetchScorecard = async (vendorId: string) => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/v1/osp/suppliers/${vendorId}/scorecard`);
      setScorecard(response.data.data);
      setShowScorecardModal(true);
    } catch (err: any) {
      setError('Failed to fetch supplier scorecard');
    } finally {
      setLoading(false);
    }
  };

  const handleViewScorecard = async (supplier: SupplierRanking) => {
    setSelectedSupplier(supplier);
    await fetchScorecard(supplier.vendorId);
  };

  const getScoreBadge = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 75) return 'warning';
    return 'danger';
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#28a745';
    if (score >= 75) return '#ffc107';
    return '#dc3545';
  };

  return (
    <Container fluid className="py-4">
      <h2 className="mb-4">Supplier Performance Dashboard</h2>

      {error && <Alert variant="danger">{error}</Alert>}

      {/* Performance Metrics Overview */}
      <Row className="mb-4">
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h6>Avg Quality Score</h6>
              <h4>
                {rankings.length > 0
                  ? (rankings.reduce((sum, r) => sum + r.qualityPercent, 0) / rankings.length).toFixed(1)
                  : 0}
                %
              </h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h6>Avg On-Time Rate</h6>
              <h4>
                {rankings.length > 0
                  ? (rankings.reduce((sum, r) => sum + r.onTimeDeliveryPercent, 0) / rankings.length).toFixed(1)
                  : 0}
                %
              </h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h6>Total Suppliers</h6>
              <h4>{rankings.length}</h4>
            </Card.Body>
          </Card>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body className="text-center">
              <h6>Top Performer</h6>
              <h6>
                {rankings.length > 0 ? (
                  <Badge bg={getScoreBadge(rankings[0].overallScore)}>
                    {rankings[0].vendorCode}
                  </Badge>
                ) : (
                  <span className="text-muted">-</span>
                )}
              </h6>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Supplier Rankings */}
      <Card>
        <Card.Header>
          <Row className="align-items-center">
            <Col>
              <Card.Title className="mb-0">Supplier Rankings</Card.Title>
            </Col>
            <Col xs="auto">
              <Button size="sm" variant="outline-primary" onClick={fetchRankings} disabled={loading}>
                Refresh
              </Button>
            </Col>
          </Row>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center py-5">
              <Spinner animation="border" />
            </div>
          ) : rankings.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Supplier Code</th>
                  <th>Supplier Name</th>
                  <th>Quality %</th>
                  <th>On-Time %</th>
                  <th>Cost Variance %</th>
                  <th>Overall Score</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {rankings.map((supplier, index) => (
                  <tr key={supplier.vendorId}>
                    <td>
                      <strong>#{index + 1}</strong>
                    </td>
                    <td>{supplier.vendorCode}</td>
                    <td>{supplier.vendorName}</td>
                    <td>
                      <div className="d-flex align-items-center">
                        <ProgressBar
                          now={supplier.qualityPercent}
                          label={`${supplier.qualityPercent.toFixed(1)}%`}
                          style={{ width: '100px' }}
                          className="me-2"
                          variant={supplier.qualityPercent >= 90 ? 'success' : 'warning'}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="d-flex align-items-center">
                        <ProgressBar
                          now={supplier.onTimeDeliveryPercent}
                          label={`${supplier.onTimeDeliveryPercent.toFixed(1)}%`}
                          style={{ width: '100px' }}
                          className="me-2"
                          variant={supplier.onTimeDeliveryPercent >= 90 ? 'success' : 'warning'}
                        />
                      </div>
                    </td>
                    <td>
                      {supplier.costVariancePercent !== undefined ? (
                        <Badge
                          bg={Math.abs(supplier.costVariancePercent) <= 5 ? 'success' : 'warning'}
                        >
                          {supplier.costVariancePercent.toFixed(1)}%
                        </Badge>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <Badge
                        bg={getScoreBadge(supplier.overallScore)}
                        style={{
                          fontSize: '0.95rem',
                          padding: '0.5rem 0.75rem'
                        }}
                      >
                        {supplier.overallScore.toFixed(1)}
                      </Badge>
                    </td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleViewScorecard(supplier)}
                      >
                        View Details
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          ) : (
            <Alert variant="info">No supplier rankings available</Alert>
          )}
        </Card.Body>
      </Card>

      {/* Scorecard Modal */}
      <ScorecardModal
        show={showScorecardModal}
        onHide={() => setShowScorecardModal(false)}
        supplier={selectedSupplier}
        scorecard={scorecard}
      />
    </Container>
  );
};

interface ScorecardModalProps {
  show: boolean;
  onHide: () => void;
  supplier: SupplierRanking | null;
  scorecard: SupplierScorecard | null;
}

const ScorecardModal: React.FC<ScorecardModalProps> = ({
  show,
  onHide,
  supplier,
  scorecard
}) => {
  if (!supplier || !scorecard) return null;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{supplier.vendorName} - Performance Scorecard</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Row className="mb-4">
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted">Quality Score</h6>
                <h3>
                  <Badge bg={scorecard.averageQualityPercent >= 90 ? 'success' : 'warning'}>
                    {scorecard.averageQualityPercent.toFixed(1)}%
                  </Badge>
                </h3>
                <ProgressBar
                  now={scorecard.averageQualityPercent}
                  className="mt-2"
                  variant={scorecard.averageQualityPercent >= 90 ? 'success' : 'warning'}
                />
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted">On-Time Rate</h6>
                <h3>
                  <Badge bg={scorecard.averageOnTimePercent >= 90 ? 'success' : 'warning'}>
                    {scorecard.averageOnTimePercent.toFixed(1)}%
                  </Badge>
                </h3>
                <ProgressBar
                  now={scorecard.averageOnTimePercent}
                  className="mt-2"
                  variant={scorecard.averageOnTimePercent >= 90 ? 'success' : 'warning'}
                />
              </Card.Body>
            </Card>
          </Col>
          <Col md={4}>
            <Card className="text-center">
              <Card.Body>
                <h6 className="text-muted">Overall Score</h6>
                <h3>
                  <Badge
                    bg={
                      scorecard.averageOverallScore >= 90
                        ? 'success'
                        : scorecard.averageOverallScore >= 75
                        ? 'warning'
                        : 'danger'
                    }
                  >
                    {scorecard.averageOverallScore.toFixed(1)}
                  </Badge>
                </h3>
                <ProgressBar
                  now={scorecard.averageOverallScore}
                  className="mt-2"
                  variant={
                    scorecard.averageOverallScore >= 90
                      ? 'success'
                      : scorecard.averageOverallScore >= 75
                      ? 'warning'
                      : 'danger'
                  }
                />
              </Card.Body>
            </Card>
          </Col>
        </Row>

        <h6>Recent Metrics (Last 12 Periods)</h6>
        <Table striped bordered size="sm">
          <thead>
            <tr>
              <th>Period</th>
              <th>Quality %</th>
              <th>On-Time %</th>
              <th>Overall Score</th>
            </tr>
          </thead>
          <tbody>
            {scorecard.recentMetrics.map((metric, idx) => (
              <tr key={idx}>
                <td>{new Date(metric.periodStart).toLocaleDateString()}</td>
                <td>{metric.qualityPercent?.toFixed(1)}%</td>
                <td>{metric.onTimeDeliveryPercent?.toFixed(1)}%</td>
                <td>
                  <Badge bg={metric.overallScore >= 90 ? 'success' : 'warning'}>
                    {metric.overallScore?.toFixed(1)}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Modal.Body>
    </Modal>
  );
};

export default SupplierPerformanceDashboard;
