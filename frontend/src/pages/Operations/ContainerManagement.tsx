/**
 * Container Management Page
 * Phase 10: Container scanning and pallet tracking interface
 * Issue #64: Material Movement & Logistics Management System
 *
 * Features:
 * - Real-time container tracking
 * - Container scanning with barcode/QR codes
 * - Location-based container management
 * - Pallet consolidation
 * - Container utilization analytics
 * - Movement history tracking
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
  Tab,
  Tabs,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  LinearProgress,
  Alert,
  CircularProgress,
  IconButton,
  Menu,
  MenuItem,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Refresh as RefreshIcon,
  Download as DownloadIcon,
  LocationOn as LocationOnIcon,
} from '@mui/icons-material';
import { useBarcodeScan } from '../../hooks/useBarcodeScan';

interface Container {
  id: string;
  containerNumber: string;
  containerType: string;
  size: string;
  status: 'EMPTY' | 'LOADED' | 'IN_TRANSIT' | 'AT_LOCATION' | 'DAMAGED';
  currentLocation: string;
  capacity: number;
  currentQuantity: number;
  currentContents: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

interface ContainerFilter {
  status?: string;
  location?: string;
  containerType?: string;
  searchTerm?: string;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const ContainerManagement: React.FC = () => {
  // State management
  const [tabValue, setTabValue] = useState(0);
  const [containers, setContainers] = useState<Container[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState<ContainerFilter>({});
  const [selectedContainer, setSelectedContainer] = useState<Container | null>(null);
  const [openDetailDialog, setOpenDetailDialog] = useState(false);
  const [openScanDialog, setOpenScanDialog] = useState(false);
  const [openTransferDialog, setOpenTransferDialog] = useState(false);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [activeMenuContainer, setActiveMenuContainer] = useState<string | null>(null);

  // Barcode scanning hook
  const {
    isScanning,
    isCameraAvailable,
    scannerError,
    lastScan,
    startCameraScanning,
    stopCameraScanning,
    handleManualInput
  } = useBarcodeScan({
    mode: 'continuous'
  });

  // Transfer state
  const [transferData, setTransferData] = useState({
    toLocation: '',
    transferredBy: '',
  });

  // Load containers on component mount and tab change
  useEffect(() => {
    loadContainers();
  }, []);

  // Handle barcode scan result
  useEffect(() => {
    if (lastScan && tabValue === 1) {
      // Auto-populate container field on scan
      const containerNumber = lastScan.data.split('-')[1] || lastScan.data;
      handleScanInput(containerNumber);
    }
  }, [lastScan, tabValue]);

  /**
   * Load containers from API
   */
  const loadContainers = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.location) params.append('location', filters.location);
      if (filters.containerType) params.append('containerType', filters.containerType);

      const response = await fetch(`/api/movements/containers?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load containers: ${response.statusText}`);
      }

      const data = await response.json();
      setContainers(data.data || []);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load containers';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle container scan input
   */
  const handleScanInput = async (containerNumber: string) => {
    try {
      // Search for container
      const container = containers.find(c =>
        c.containerNumber.toUpperCase() === containerNumber.toUpperCase()
      );

      if (container) {
        setSelectedContainer(container);
        setOpenDetailDialog(true);
      } else {
        setError(`Container not found: ${containerNumber}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error processing scan');
    }
  };

  /**
   * Load materials into container
   */
  const handleLoadContainer = async (containerId: string, partNumbers: string[], quantity: number) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/movements/containers/${containerId}/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          partNumbers,
          quantity,
          loadedBy: localStorage.getItem('userId') || 'system'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to load container: ${response.statusText}`);
      }

      await loadContainers();
      setOpenDetailDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load container');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Unload materials from container
   */
  const handleUnloadContainer = async (containerId: string, quantity: number, targetLocation: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/movements/containers/${containerId}/unload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          quantity,
          unloadedBy: localStorage.getItem('userId') || 'system',
          targetLocation
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to unload container: ${response.statusText}`);
      }

      await loadContainers();
      setOpenDetailDialog(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to unload container');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Transfer container to new location
   */
  const handleTransferContainer = async () => {
    if (!selectedContainer || !transferData.toLocation) {
      setError('Please select a location');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`/api/movements/containers/${selectedContainer.id}/transfer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          toLocation: transferData.toLocation,
          transferredBy: localStorage.getItem('userId') || 'system'
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to transfer container: ${response.statusText}`);
      }

      await loadContainers();
      setOpenTransferDialog(false);
      setTransferData({ toLocation: '', transferredBy: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to transfer container');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get container movement history
   */
  const handleViewHistory = async (containerId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/movements/containers/${containerId}/history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load history: ${response.statusText}`);
      }

      const data = await response.json();
      // Display history in a dialog or side panel
      console.log('Container history:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Get container utilization metrics
   */
  const handleViewUtilization = async (containerId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/movements/containers/${containerId}/utilization`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load utilization: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('Container utilization:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load utilization');
    } finally {
      setLoading(false);
    }
  };

  // Handle pagination
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Handle tab change
  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    if (newValue === 1) {
      startCameraScanning();
    } else {
      stopCameraScanning();
    }
  };

  // Handle menu actions
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, containerId: string) => {
    setAnchorEl(event.currentTarget);
    setActiveMenuContainer(containerId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setActiveMenuContainer(null);
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      'EMPTY': 'default',
      'LOADED': 'success',
      'IN_TRANSIT': 'info',
      'AT_LOCATION': 'primary',
      'DAMAGED': 'error'
    };
    return colors[status] || 'default';
  };

  const paginatedContainers = containers.slice(
    page * rowsPerPage,
    page * rowsPerPage + rowsPerPage
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <h1>Container Management</h1>
            <p>Real-time container tracking and pallet management</p>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadContainers}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Tab Navigation */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange} aria-label="container-tabs">
          <Tab label="Container List" id="tab-0" aria-controls="tabpanel-0" />
          <Tab label="Scanner" id="tab-1" aria-controls="tabpanel-1" />
          <Tab label="Analytics" id="tab-2" aria-controls="tabpanel-2" />
        </Tabs>
      </Box>

      {/* Tab 0: Container List */}
      <TabPanel value={tabValue} index={0}>
        <Card>
          <CardHeader title="Active Containers" />
          <Divider />
          <CardContent>
            {/* Filters */}
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
              <TextField
                label="Search"
                placeholder="Container number, location..."
                size="small"
                value={filters.searchTerm || ''}
                onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value })}
              />
              <TextField
                select
                label="Status"
                size="small"
                value={filters.status || ''}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="EMPTY">Empty</MenuItem>
                <MenuItem value="LOADED">Loaded</MenuItem>
                <MenuItem value="IN_TRANSIT">In Transit</MenuItem>
                <MenuItem value="AT_LOCATION">At Location</MenuItem>
                <MenuItem value="DAMAGED">Damaged</MenuItem>
              </TextField>
              <TextField
                label="Location"
                placeholder="e.g., Warehouse A"
                size="small"
                value={filters.location || ''}
                onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              />
              <Button
                variant="contained"
                onClick={loadContainers}
                disabled={loading}
              >
                Apply Filters
              </Button>
            </Box>

            {/* Loading indicator */}
            {loading && <LinearProgress />}

            {/* Container Table */}
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                    <TableCell>Container #</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Location</TableCell>
                    <TableCell>Utilization</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {paginatedContainers.length > 0 ? (
                    paginatedContainers.map((container) => (
                      <TableRow key={container.id} hover>
                        <TableCell sx={{ fontWeight: 500 }}>
                          {container.containerNumber}
                        </TableCell>
                        <TableCell>{container.containerType}</TableCell>
                        <TableCell>
                          <Chip
                            label={container.status}
                            color={getStatusColor(container.status)}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <LocationOnIcon sx={{ fontSize: 18 }} />
                            {container.currentLocation}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 200 }}>
                            <LinearProgress
                              variant="determinate"
                              value={(container.currentQuantity / container.capacity) * 100}
                              sx={{ flex: 1 }}
                            />
                            <span style={{ fontSize: 12 }}>
                              {Math.round((container.currentQuantity / container.capacity) * 100)}%
                            </span>
                          </Box>
                        </TableCell>
                        <TableCell align="right">
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, container.id)}
                          >
                            <MoreVertIcon />
                          </IconButton>
                          <Menu
                            anchorEl={anchorEl}
                            open={activeMenuContainer === container.id}
                            onClose={handleMenuClose}
                          >
                            <MenuItem
                              onClick={() => {
                                setSelectedContainer(container);
                                setOpenDetailDialog(true);
                                handleMenuClose();
                              }}
                            >
                              <VisibilityIcon sx={{ mr: 1 }} /> View Details
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                setSelectedContainer(container);
                                setOpenTransferDialog(true);
                                handleMenuClose();
                              }}
                            >
                              <EditIcon sx={{ mr: 1 }} /> Transfer
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                handleViewHistory(container.id);
                                handleMenuClose();
                              }}
                            >
                              View History
                            </MenuItem>
                            <MenuItem
                              onClick={() => {
                                handleViewUtilization(container.id);
                                handleMenuClose();
                              }}
                            >
                              View Utilization
                            </MenuItem>
                          </Menu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                        {loading ? <CircularProgress /> : 'No containers found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>

            {/* Pagination */}
            <TablePagination
              rowsPerPageOptions={[5, 10, 25, 50]}
              component="div"
              count={containers.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 1: Scanner */}
      <TabPanel value={tabValue} index={1}>
        <Card>
          <CardHeader title="Container Scanner" />
          <Divider />
          <CardContent>
            {/* Camera Status */}
            <Alert severity={isCameraAvailable ? 'success' : 'warning'} sx={{ mb: 2 }}>
              {isCameraAvailable ? 'Camera ready' : 'Camera not available - use manual input'}
            </Alert>

            {/* Scanner Error */}
            {scannerError && (
              <Alert severity="error" sx={{ mb: 2 }}>
                Scanner error: {scannerError}
              </Alert>
            )}

            {/* Camera View */}
            <Box
              sx={{
                width: '100%',
                maxWidth: 500,
                height: 400,
                backgroundColor: '#000',
                borderRadius: 1,
                mb: 3,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff'
              }}
            >
              {isScanning ? (
                <div>Camera scanning...</div>
              ) : (
                <Button
                  variant="contained"
                  onClick={startCameraScanning}
                  disabled={!isCameraAvailable}
                >
                  Start Camera
                </Button>
              )}
            </Box>

            {/* Manual Input */}
            <TextField
              fullWidth
              label="Container Number"
              placeholder="Enter container number or scan code"
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleScanInput((e.target as HTMLInputElement).value);
                  (e.target as HTMLInputElement).value = '';
                }
              }}
              sx={{ mb: 2 }}
            />

            {/* Last Scan Result */}
            {lastScan && (
              <Card sx={{ backgroundColor: '#f0f7ff', mb: 2 }}>
                <CardContent>
                  <strong>Last Scan:</strong> {lastScan.data}
                  <br />
                  <small>Type: {lastScan.format}</small>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      </TabPanel>

      {/* Tab 2: Analytics */}
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>
          {/* Container Statistics Cards */}
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <div style={{ textAlign: 'center' }}>
                  <h3>Total Containers</h3>
                  <h2>{containers.length}</h2>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <div style={{ textAlign: 'center' }}>
                  <h3>Empty</h3>
                  <h2>{containers.filter(c => c.status === 'EMPTY').length}</h2>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <div style={{ textAlign: 'center' }}>
                  <h3>In Transit</h3>
                  <h2>{containers.filter(c => c.status === 'IN_TRANSIT').length}</h2>
                </div>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <div style={{ textAlign: 'center' }}>
                  <h3>Avg Utilization</h3>
                  <h2>
                    {containers.length > 0
                      ? Math.round(
                          (containers.reduce((sum, c) => sum + (c.currentQuantity / c.capacity), 0) /
                            containers.length) *
                            100
                        )
                      : 0}
                    %
                  </h2>
                </div>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Detail Dialog */}
      <Dialog open={openDetailDialog} onClose={() => setOpenDetailDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Container Details</DialogTitle>
        <DialogContent dividers>
          {selectedContainer && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <strong>Container Number:</strong> {selectedContainer.containerNumber}
              </Box>
              <Box>
                <strong>Type:</strong> {selectedContainer.containerType}
              </Box>
              <Box>
                <strong>Current Location:</strong> {selectedContainer.currentLocation}
              </Box>
              <Box>
                <strong>Status:</strong>
                <Chip
                  label={selectedContainer.status}
                  color={getStatusColor(selectedContainer.status)}
                  sx={{ ml: 1 }}
                />
              </Box>
              <Box>
                <strong>Utilization:</strong>
                <LinearProgress
                  variant="determinate"
                  value={(selectedContainer.currentQuantity / selectedContainer.capacity) * 100}
                  sx={{ mt: 1, mb: 1 }}
                />
                {Math.round((selectedContainer.currentQuantity / selectedContainer.capacity) * 100)}%
              </Box>
              <Box>
                <strong>Contents:</strong>
                <Box sx={{ pl: 2, mt: 1 }}>
                  {selectedContainer.currentContents.length > 0 ? (
                    selectedContainer.currentContents.map((item, idx) => (
                      <div key={idx}>• {item}</div>
                    ))
                  ) : (
                    <div>Empty</div>
                  )}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDetailDialog(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={openTransferDialog} onClose={() => setOpenTransferDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Transfer Container</DialogTitle>
        <DialogContent dividers>
          {selectedContainer && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
              <Box>
                <strong>Container:</strong> {selectedContainer.containerNumber}
              </Box>
              <TextField
                fullWidth
                label="Destination Location"
                value={transferData.toLocation}
                onChange={(e) => setTransferData({ ...transferData, toLocation: e.target.value })}
                placeholder="e.g., Warehouse B, Bay 3"
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenTransferDialog(false)}>Cancel</Button>
          <Button
            onClick={handleTransferContainer}
            variant="contained"
            disabled={loading}
          >
            Transfer
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ContainerManagement;
