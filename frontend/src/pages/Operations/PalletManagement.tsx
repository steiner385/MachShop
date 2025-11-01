/**
 * Pallet Management Page
 * Phase 10: Container Management UI
 * Issue #64: Material Movement & Logistics Management System
 *
 * Features:
 * - Pallet consolidation
 * - Cross-dock operations
 * - Pallet wave management
 * - Container consolidation tracking
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Container,
  Divider,
  Grid,
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
  Chip,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';

interface Pallet {
  id: string;
  palletNumber: string;
  status: 'EMPTY' | 'CONSOLIDATING' | 'CONSOLIDATED' | 'IN_TRANSIT' | 'DELIVERED';
  containerCount: number;
  totalWeight: number;
  targetLocation: string;
  createdAt: Date;
  containers: {
    id: string;
    containerNumber: string;
    quantity: number;
  }[];
}

export const PalletManagement: React.FC = () => {
  const [pallets, setPallets] = useState<Pallet[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPallet, setSelectedPallet] = useState<Pallet | null>(null);
  const [newPallet, setNewPallet] = useState({
    palletNumber: '',
    targetLocation: '',
    containers: [] as string[]
  });

  /**
   * Load pallets from API
   */
  const loadPallets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // For now, using mock data
      // In production, this would fetch from /api/movements/pallets
      const mockPallets: Pallet[] = [
        {
          id: '1',
          palletNumber: 'PALLET-001',
          status: 'CONSOLIDATED',
          containerCount: 4,
          totalWeight: 250,
          targetLocation: 'Warehouse B',
          createdAt: new Date(),
          containers: [
            { id: 'cont-1', containerNumber: 'CONT-101', quantity: 50 },
            { id: 'cont-2', containerNumber: 'CONT-102', quantity: 75 },
            { id: 'cont-3', containerNumber: 'CONT-103', quantity: 60 },
            { id: 'cont-4', containerNumber: 'CONT-104', quantity: 65 }
          ]
        },
        {
          id: '2',
          palletNumber: 'PALLET-002',
          status: 'CONSOLIDATING',
          containerCount: 2,
          totalWeight: 150,
          targetLocation: 'Warehouse C',
          createdAt: new Date(),
          containers: [
            { id: 'cont-5', containerNumber: 'CONT-105', quantity: 80 },
            { id: 'cont-6', containerNumber: 'CONT-106', quantity: 70 }
          ]
        }
      ];

      setPallets(mockPallets);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load pallets';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPallets();
  }, [loadPallets]);

  /**
   * Create new pallet
   */
  const handleCreatePallet = async () => {
    if (!newPallet.palletNumber || newPallet.containers.length === 0) {
      setError('Please enter pallet number and select containers');
      return;
    }

    try {
      setLoading(true);
      // API call would go here
      const createdPallet: Pallet = {
        id: `pallet-${Date.now()}`,
        palletNumber: newPallet.palletNumber,
        status: 'CONSOLIDATING',
        containerCount: newPallet.containers.length,
        totalWeight: 0, // Would be calculated
        targetLocation: newPallet.targetLocation,
        createdAt: new Date(),
        containers: []
      };

      setPallets([...pallets, createdPallet]);
      setOpenDialog(false);
      setNewPallet({ palletNumber: '', targetLocation: '', containers: [] });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create pallet';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Consolidate pallet
   */
  const handleConsolidatePallet = async (palletId: string) => {
    try {
      setLoading(true);
      // API call would go here
      setPallets(pallets.map(p =>
        p.id === palletId ? { ...p, status: 'CONSOLIDATED' as const } : p
      ));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to consolidate pallet';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Delete pallet
   */
  const handleDeletePallet = async (palletId: string) => {
    if (window.confirm('Are you sure you want to delete this pallet?')) {
      try {
        setLoading(true);
        setPallets(pallets.filter(p => p.id !== palletId));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete pallet';
        setError(errorMessage);
      } finally {
        setLoading(false);
      }
    }
  };

  const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success' => {
    const colors: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
      'EMPTY': 'default',
      'CONSOLIDATING': 'warning',
      'CONSOLIDATED': 'success',
      'IN_TRANSIT': 'info',
      'DELIVERED': 'primary'
    };
    return colors[status] || 'default';
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <h1>Pallet Management</h1>
            <p>Consolidate and manage pallets for shipment</p>
          </Box>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setOpenDialog(true)}
          >
            New Pallet
          </Button>
        </Box>

        {error && (
          <Alert severity="error" onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>

      {/* Statistics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <h3>Total Pallets</h3>
                <h2>{pallets.length}</h2>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <h3>Consolidating</h3>
                <h2>{pallets.filter(p => p.status === 'CONSOLIDATING').length}</h2>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <h3>Consolidated</h3>
                <h2>{pallets.filter(p => p.status === 'CONSOLIDATED').length}</h2>
              </div>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <div style={{ textAlign: 'center' }}>
                <h3>Total Containers</h3>
                <h2>{pallets.reduce((sum, p) => sum + p.containerCount, 0)}</h2>
              </div>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Pallets Table */}
      <Card>
        <CardHeader title="Active Pallets" />
        <Divider />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                  <TableCell>Pallet #</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Containers</TableCell>
                  <TableCell>Total Weight</TableCell>
                  <TableCell>Target Location</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {pallets.map((pallet) => (
                  <TableRow key={pallet.id} hover>
                    <TableCell sx={{ fontWeight: 500 }}>
                      {pallet.palletNumber}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={pallet.status}
                        color={getStatusColor(pallet.status)}
                        size="small"
                      />
                    </TableCell>
                    <TableCell>{pallet.containerCount}</TableCell>
                    <TableCell>{pallet.totalWeight} lbs</TableCell>
                    <TableCell>{pallet.targetLocation}</TableCell>
                    <TableCell align="right">
                      {pallet.status === 'CONSOLIDATING' && (
                        <Button
                          size="small"
                          onClick={() => handleConsolidatePallet(pallet.id)}
                        >
                          Consolidate
                        </Button>
                      )}
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => handleDeletePallet(pallet.id)}
                      >
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Pallet Detail Dialog */}
      {selectedPallet && (
        <Dialog open={!!selectedPallet} onClose={() => setSelectedPallet(null)} maxWidth="sm" fullWidth>
          <DialogTitle>{selectedPallet.palletNumber}</DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <strong>Status:</strong>
                <Chip
                  label={selectedPallet.status}
                  color={getStatusColor(selectedPallet.status)}
                  sx={{ ml: 1 }}
                />
              </Box>
              <Box>
                <strong>Target Location:</strong> {selectedPallet.targetLocation}
              </Box>
              <Box>
                <strong>Containers:</strong>
                <List sx={{ pl: 0 }}>
                  {selectedPallet.containers.map((container) => (
                    <ListItem key={container.id}>
                      <ListItemText
                        primary={container.containerNumber}
                        secondary={`Quantity: ${container.quantity}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSelectedPallet(null)}>Close</Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Create Pallet Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Pallet</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 2 }}>
            <TextField
              fullWidth
              label="Pallet Number"
              placeholder="e.g., PALLET-001"
              value={newPallet.palletNumber}
              onChange={(e) => setNewPallet({ ...newPallet, palletNumber: e.target.value })}
            />
            <TextField
              fullWidth
              label="Target Location"
              placeholder="e.g., Warehouse B"
              value={newPallet.targetLocation}
              onChange={(e) => setNewPallet({ ...newPallet, targetLocation: e.target.value })}
            />
            <Box>
              <strong>Select Containers:</strong>
              <Box sx={{ mt: 1, pl: 2 }}>
                {/* Container selection would go here */}
                <p style={{ color: '#999' }}>Container selection UI</p>
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button
            onClick={handleCreatePallet}
            variant="contained"
            disabled={loading}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default PalletManagement;
