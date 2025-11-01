/**
 * Forklift Dispatcher Dashboard
 * Phase 7: Real-time dashboard for managing move requests and forklift operations
 * Issue #64: Material Movement & Logistics Management System
 *
 * Features:
 * - Real-time move request queue visualization
 * - Forklift fleet status and operator assignments
 * - Interactive request assignment and tracking
 * - Priority-based request management
 * - GPS tracking for equipment
 * - Performance metrics and KPIs
 * - Geospatial visualization
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Typography,
  Chip,
  Avatar,
  AvatarGroup,
  LinearProgress,
  Container,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  Badge,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  CheckCircle as CompleteIcon,
  Schedule as PendingIcon,
  DirectionsCar as ForkliftIcon,
  Person as OperatorIcon,
  LocationOn as LocationIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingIcon,
  Refresh as RefreshIcon,
  Close as CancelIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface MoveRequest {
  id: string;
  containerIds: string[];
  sourceLocation: string;
  destinationLocation: string;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  status: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: Date;
  assignedForkliftId?: string;
  assignedOperatorId?: string;
  estimatedTime?: number;
  actualTime?: number;
}

interface Forklift {
  id: string;
  equipmentNumber: string;
  type: string;
  status: 'ACTIVE' | 'IDLE' | 'MAINTENANCE' | 'CHARGING';
  currentOperatorId?: string;
  currentLocationId?: string;
  lastGPSLocation?: { lat: number; lon: number };
  lastGPSUpdateAt?: Date;
  meterHours: number;
  capacity: number;
  assignedRequest?: MoveRequest;
}

interface Operator {
  id: string;
  name: string;
  currentForkliftId?: string;
  status: 'AVAILABLE' | 'ASSIGNED' | 'ON_BREAK' | 'OFFLINE';
  completedRequests: number;
}

interface DispatcherMetrics {
  totalRequests: number;
  openRequests: number;
  completedRequests: number;
  averageCompletionTime: number;
  forkliftUtilization: number;
  pendingAssignments: number;
}

interface TimeSeriesData {
  time: string;
  completed: number;
  inProgress: number;
}

const ForkliftDispatcher: React.FC = () => {
  // State
  const [moveRequests, setMoveRequests] = useState<MoveRequest[]>([]);
  const [forklifts, setForklifts] = useState<Forklift[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [metrics, setMetrics] = useState<DispatcherMetrics | null>(null);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);

  // UI State
  const [selectedRequest, setSelectedRequest] = useState<MoveRequest | null>(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedForklift, setSelectedForklift] = useState<string>('');
  const [selectedOperator, setSelectedOperator] = useState<string>('');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('OPEN');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Load data on mount and set up polling
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Poll every 5 seconds
    return () => clearInterval(interval);
  }, []);

  /**
   * Load dispatcher data
   */
  const loadData = useCallback(async () => {
    try {
      setRefreshing(true);
      const [reqResponse, fkResponse, opResponse, metResponse, timeResponse] = await Promise.all([
        fetch('/api/movements/requests'),
        fetch('/api/forklifts'),
        fetch('/api/operators'),
        fetch('/api/movements/metrics'),
        fetch('/api/movements/timeseries?hours=24'),
      ]);

      if (reqResponse.ok) {
        const requests = await reqResponse.json();
        setMoveRequests(requests.map((r: any) => ({ ...r, createdAt: new Date(r.createdAt) })));
      }

      if (fkResponse.ok) {
        const data = await fkResponse.json();
        setForklifts(data);
      }

      if (opResponse.ok) {
        const data = await opResponse.json();
        setOperators(data);
      }

      if (metResponse.ok) {
        const data = await metResponse.json();
        setMetrics(data);
      }

      if (timeResponse.ok) {
        const data = await timeResponse.json();
        setTimeSeriesData(data);
      }

      setError(null);
    } catch (err) {
      setError(`Failed to load data: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRefreshing(false);
    }
  }, []);

  /**
   * Filter move requests
   */
  const filteredRequests = moveRequests.filter((req) => {
    const priorityMatch = filterPriority === 'ALL' || req.priority === filterPriority;
    const statusMatch = filterStatus === 'ALL' || req.status === filterStatus;
    return priorityMatch && statusMatch;
  });

  /**
   * Open assign dialog
   */
  const handleAssignClick = (request: MoveRequest) => {
    setSelectedRequest(request);
    setSelectedForklift(request.assignedForkliftId || '');
    setSelectedOperator(request.assignedOperatorId || '');
    setAssignDialogOpen(true);
  };

  /**
   * Assign request to forklift and operator
   */
  const handleAssignRequest = async () => {
    if (!selectedRequest || !selectedForklift || !selectedOperator) {
      setError('Please select both forklift and operator');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/movements/requests/${selectedRequest.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          forkliftId: selectedForklift,
          operatorId: selectedOperator,
        }),
      });

      if (response.ok) {
        setAssignDialogOpen(false);
        await loadData();
      } else {
        setError('Failed to assign request');
      }
    } catch (err) {
      setError(`Assignment error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Complete request
   */
  const handleCompleteRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/movements/requests/${requestId}/complete`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadData();
      } else {
        setError('Failed to complete request');
      }
    } catch (err) {
      setError(`Completion error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Cancel request
   */
  const handleCancelRequest = async (requestId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/movements/requests/${requestId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        await loadData();
      } else {
        setError('Failed to cancel request');
      }
    } catch (err) {
      setError(`Cancellation error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get priority chip color
   */
  const getPriorityColor = (priority: string): any => {
    switch (priority) {
      case 'URGENT':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'NORMAL':
        return 'info';
      case 'LOW':
        return 'default';
      default:
        return 'default';
    }
  };

  /**
   * Get status chip color
   */
  const getStatusColor = (status: string): any => {
    switch (status) {
      case 'COMPLETED':
        return 'success';
      case 'IN_PROGRESS':
        return 'info';
      case 'ASSIGNED':
        return 'warning';
      case 'OPEN':
        return 'default';
      case 'CANCELLED':
        return 'error';
      default:
        return 'default';
    }
  };

  /**
   * Get available operators for selected forklift
   */
  const getAvailableOperators = () => {
    return operators.filter((op) => op.status === 'AVAILABLE' || op.currentForkliftId === selectedForklift);
  };

  /**
   * Get available forklifts
   */
  const getAvailableForklifts = () => {
    return forklifts.filter((fk) => fk.status === 'ACTIVE' || fk.status === 'IDLE');
  };

  return (
    <Container maxWidth="lg" sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, mt: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h4">Forklift Dispatcher Dashboard</Typography>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={loadData}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : 'Refresh'}
          </Button>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Real-time management of material movement requests and forklift operations
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Key Metrics */}
      {metrics && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Open Requests
                    </Typography>
                    <Typography variant="h5">{metrics.openRequests}</Typography>
                  </Box>
                  <PendingIcon sx={{ fontSize: 40, color: 'warning.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Completed Today
                    </Typography>
                    <Typography variant="h5">{metrics.completedRequests}</Typography>
                  </Box>
                  <CompleteIcon sx={{ fontSize: 40, color: 'success.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Avg Completion Time
                    </Typography>
                    <Typography variant="h5">{metrics.averageCompletionTime}m</Typography>
                  </Box>
                  <SpeedIcon sx={{ fontSize: 40, color: 'info.main' }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography color="text.secondary" variant="caption">
                      Utilization
                    </Typography>
                    <Typography variant="h5">{Math.round(metrics.forkliftUtilization)}%</Typography>
                  </Box>
                  <TrendingIcon sx={{ fontSize: 40, color: 'primary.main' }} />
                </Box>
                <LinearProgress variant="determinate" value={metrics.forkliftUtilization} sx={{ mt: 1 }} />
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Charts Row */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Time Series Chart */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardHeader title="Request Activity (24h)" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={timeSeriesData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="time" />
                  <YAxis />
                  <ChartTooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completed" stroke="#4caf50" name="Completed" />
                  <Line type="monotone" dataKey="inProgress" stroke="#2196f3" name="In Progress" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Request Status Distribution */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardHeader title="Request Status Distribution" />
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Open', value: moveRequests.filter((r) => r.status === 'OPEN').length, fill: '#ff9800' },
                      { name: 'In Progress', value: moveRequests.filter((r) => r.status === 'IN_PROGRESS').length, fill: '#2196f3' },
                      { name: 'Completed', value: moveRequests.filter((r) => r.status === 'COMPLETED').length, fill: '#4caf50' },
                    ]}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                    dataKey="value"
                  >
                    <Cell fill="#ff9800" />
                    <Cell fill="#2196f3" />
                    <Cell fill="#4caf50" />
                  </Pie>
                  <ChartTooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Fleet Status */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Fleet Status" />
        <CardContent>
          <Grid container spacing={2}>
            {forklifts.map((forklift) => {
              const operator = forklift.currentOperatorId ? operators.find((op) => op.id === forklift.currentOperatorId) : null;
              const statusColor =
                forklift.status === 'ACTIVE'
                  ? 'success'
                  : forklift.status === 'IDLE'
                  ? 'default'
                  : forklift.status === 'MAINTENANCE'
                  ? 'error'
                  : 'warning';

              return (
                <Grid item xs={12} sm={6} md={4} key={forklift.id}>
                  <Paper sx={{ p: 2, backgroundColor: '#fafafa' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ForkliftIcon color={statusColor as any} />
                        <Box>
                          <Typography variant="subtitle2">{forklift.equipmentNumber}</Typography>
                          <Typography variant="caption" color="text.secondary">
                            {forklift.type}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip label={forklift.status} color={statusColor as any} size="small" />
                    </Box>

                    <Divider sx={{ my: 1 }} />

                    {operator && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <OperatorIcon fontSize="small" />
                        <Typography variant="caption">{operator.name}</Typography>
                      </Box>
                    )}

                    {forklift.currentLocationId && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <LocationIcon fontSize="small" />
                        <Typography variant="caption">{forklift.currentLocationId}</Typography>
                      </Box>
                    )}

                    <Typography variant="caption" color="text.secondary">
                      Meter Hours: {forklift.meterHours} | Capacity: {forklift.capacity} lbs
                    </Typography>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>

      {/* Move Requests Table */}
      <Card>
        <CardHeader
          title="Move Requests Queue"
          action={
            <Box sx={{ display: 'flex', gap: 1 }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Priority</InputLabel>
                <Select value={filterPriority} label="Priority" onChange={(e) => setFilterPriority(e.target.value)}>
                  <MenuItem value="ALL">All Priorities</MenuItem>
                  <MenuItem value="URGENT">Urgent</MenuItem>
                  <MenuItem value="HIGH">High</MenuItem>
                  <MenuItem value="NORMAL">Normal</MenuItem>
                  <MenuItem value="LOW">Low</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Status</InputLabel>
                <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                  <MenuItem value="ALL">All Status</MenuItem>
                  <MenuItem value="OPEN">Open</MenuItem>
                  <MenuItem value="ASSIGNED">Assigned</MenuItem>
                  <MenuItem value="IN_PROGRESS">In Progress</MenuItem>
                  <MenuItem value="COMPLETED">Completed</MenuItem>
                </Select>
              </FormControl>
            </Box>
          }
        />

        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell>Request ID</TableCell>
                <TableCell>Containers</TableCell>
                <TableCell>Source → Destination</TableCell>
                <TableCell>Priority</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Forklift</TableCell>
                <TableCell>Operator</TableCell>
                <TableCell>Time</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredRequests.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((request) => {
                const forklift = request.assignedForkliftId ? forklifts.find((f) => f.id === request.assignedForkliftId) : null;
                const operator = request.assignedOperatorId ? operators.find((o) => o.id === request.assignedOperatorId) : null;

                return (
                  <TableRow key={request.id} hover>
                    <TableCell>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>
                        {request.id.substring(0, 8)}
                      </Typography>
                    </TableCell>
                    <TableCell>{request.containerIds.length}</TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {request.sourceLocation} → {request.destinationLocation}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={request.priority} color={getPriorityColor(request.priority)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={request.status} color={getStatusColor(request.status)} size="small" />
                    </TableCell>
                    <TableCell>
                      {forklift ? (
                        <Tooltip title={forklift.equipmentNumber}>
                          <Typography variant="caption">{forklift.equipmentNumber}</Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {operator ? (
                        <Tooltip title={operator.name}>
                          <Typography variant="caption">{operator.name}</Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          Unassigned
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">
                        {request.actualTime ? `${request.actualTime}m` : request.estimatedTime ? `~${request.estimatedTime}m` : '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {request.status === 'OPEN' && (
                        <Tooltip title="Assign Request">
                          <IconButton
                            size="small"
                            onClick={() => handleAssignClick(request)}
                            disabled={loading}
                          >
                            <AssignmentIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {request.status === 'IN_PROGRESS' && (
                        <Tooltip title="Complete Request">
                          <IconButton
                            size="small"
                            onClick={() => handleCompleteRequest(request.id)}
                            disabled={loading}
                          >
                            <CompleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      {['OPEN', 'ASSIGNED'].includes(request.status) && (
                        <Tooltip title="Cancel Request">
                          <IconButton
                            size="small"
                            onClick={() => handleCancelRequest(request.id)}
                            disabled={loading}
                          >
                            <CancelIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={filteredRequests.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) => {
            setRowsPerPage(parseInt(event.target.value, 10));
            setPage(0);
          }}
        />
      </Card>

      {/* Assignment Dialog */}
      <Dialog open={assignDialogOpen} onClose={() => setAssignDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Assign Move Request</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {selectedRequest && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Request Details
                </Typography>
                <Typography variant="body2">
                  {selectedRequest.sourceLocation} → {selectedRequest.destinationLocation}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedRequest.containerIds.length} containers
                </Typography>
              </Box>

              <Divider />

              <FormControl fullWidth>
                <InputLabel>Forklift</InputLabel>
                <Select
                  value={selectedForklift}
                  label="Forklift"
                  onChange={(e) => {
                    setSelectedForklift(e.target.value);
                    setSelectedOperator(''); // Reset operator
                  }}
                >
                  {getAvailableForklifts().map((fk) => (
                    <MenuItem key={fk.id} value={fk.id}>
                      {fk.equipmentNumber} ({fk.status})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel>Operator</InputLabel>
                <Select value={selectedOperator} label="Operator" onChange={(e) => setSelectedOperator(e.target.value)}>
                  {getAvailableOperators().map((op) => (
                    <MenuItem key={op.id} value={op.id}>
                      {op.name} ({op.completedRequests} completed)
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleAssignRequest}
            variant="contained"
            disabled={loading || !selectedForklift || !selectedOperator}
          >
            Assign
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ForkliftDispatcher;
