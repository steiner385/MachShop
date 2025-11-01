/**
 * Mobile Scanning Interface
 * Phase 6: PWA mobile app for manual movement scanning
 * Issue #64: Material Movement & Logistics Management System
 *
 * Features:
 * - Barcode/QR code scanning for containers and work orders
 * - Manual container and part number input with validation
 * - Real-time location and movement status updates
 * - Offline-first design with local sync queue
 * - Touch-optimized UI for mobile devices
 * - Scan history and validation feedback
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  TextField,
  Typography,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  List,
  ListItem,
  ListItemText,
  ListItemButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  LinearProgress,
  Container,
} from '@mui/material';
import {
  QrCode2 as QrCodeIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Send as SendIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

interface ScannedItem {
  id: string;
  containerNumber: string;
  partNumber?: string;
  quantity?: number;
  unitOfMeasure?: string;
  location?: string;
  timestamp: Date;
  status: 'pending' | 'confirmed' | 'error';
  errorMessage?: string;
}

interface MovementStep {
  label: string;
  description: string;
  required: boolean;
  completed: boolean;
}

interface LocalSyncQueue {
  id: string;
  operation: 'create' | 'update' | 'complete';
  data: any;
  timestamp: Date;
  retries: number;
  status: 'pending' | 'synced' | 'failed';
}

const MobileScanning: React.FC = () => {
  // Scanning state
  const [scanInput, setScanInput] = useState('');
  const [scannedItems, setScannedItems] = useState<ScannedItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<LocalSyncQueue[]>([]);

  // Form state
  const [containerNumber, setContainerNumber] = useState('');
  const [partNumber, setPartNumber] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitOfMeasure, setUnitOfMeasure] = useState('lbs');
  const [fromLocation, setFromLocation] = useState('');
  const [toLocation, setToLocation] = useState('');
  const [selectedItem, setSelectedItem] = useState<ScannedItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // UI state
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Offline sync state
  const [offlineCount, setOfflineCount] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Movement steps definition
  const movementSteps: MovementStep[] = [
    { label: 'Scan Container', description: 'Scan or enter container number', required: true, completed: !!containerNumber },
    { label: 'Source Location', description: 'Confirm pickup location', required: true, completed: !!fromLocation },
    { label: 'Destination', description: 'Scan or enter destination location', required: true, completed: !!toLocation },
    { label: 'Review & Confirm', description: 'Review movement details', required: true, completed: false },
  ];

  // Handle online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Attempt to sync offline queue when online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      syncOfflineQueue();
    }
  }, [isOnline]);

  /**
   * Parse barcode/QR code input
   * Supports formats: CONTAINER:XXX, PART:XXX, LOC:XXX
   */
  const parseBarcode = (input: string): { type: 'container' | 'part' | 'location' | 'unknown'; value: string } => {
    const upperInput = input.toUpperCase().trim();

    if (upperInput.startsWith('CONT-') || upperInput.startsWith('C-')) {
      return { type: 'container', value: upperInput };
    } else if (upperInput.startsWith('PART-') || upperInput.startsWith('P-')) {
      return { type: 'part', value: upperInput };
    } else if (upperInput.startsWith('LOC-') || upperInput.startsWith('L-')) {
      return { type: 'location', value: upperInput };
    }

    return { type: 'unknown', value: input };
  };

  /**
   * Validate scanned container
   */
  const validateContainer = async (container: string): Promise<boolean> => {
    try {
      const response = await fetch(`/api/containers/${container}`, {
        method: 'GET',
      });
      return response.ok;
    } catch (error) {
      console.error('Container validation error:', error);
      return false;
    }
  };

  /**
   * Handle barcode/QR code scan
   */
  const handleScan = async (input: string) => {
    if (!input.trim()) return;

    setLoading(true);
    setMessage('');

    try {
      const parsed = parseBarcode(input);

      switch (parsed.type) {
        case 'container':
          // Validate container exists
          const isValid = await validateContainer(parsed.value);
          if (!isValid) {
            setMessageType('error');
            setMessage(`Container not found: ${parsed.value}`);
            break;
          }

          setContainerNumber(parsed.value);
          setCurrentStep(1);
          setMessageType('success');
          setMessage(`Container scanned: ${parsed.value}`);
          break;

        case 'location':
          if (!fromLocation) {
            setFromLocation(parsed.value);
            setCurrentStep(2);
            setMessageType('success');
            setMessage(`Source location set: ${parsed.value}`);
          } else if (!toLocation) {
            setToLocation(parsed.value);
            setCurrentStep(3);
            setMessageType('success');
            setMessage(`Destination location set: ${parsed.value}`);
          }
          break;

        case 'part':
          setPartNumber(parsed.value);
          setMessageType('success');
          setMessage(`Part number scanned: ${parsed.value}`);
          break;

        default:
          setMessageType('error');
          setMessage('Invalid barcode format. Use CONT-, PART-, or LOC- prefix');
      }

      setScanInput('');
    } catch (error) {
      setMessageType('error');
      setMessage(`Scan error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
      scanInputRef.current?.focus();
    }
  };

  /**
   * Submit movement to backend or add to sync queue if offline
   */
  const submitMovement = async () => {
    if (!containerNumber || !fromLocation || !toLocation) {
      setMessageType('error');
      setMessage('Please complete all required fields');
      return;
    }

    setLoading(true);
    const movementData = {
      containerId: containerNumber,
      partNumber: partNumber || undefined,
      quantity: quantity ? parseFloat(quantity) : undefined,
      unitOfMeasure: unitOfMeasure,
      fromLocation,
      toLocation,
      submittedBy: 'mobile-scanner',
      timestamp: new Date(),
    };

    try {
      if (isOnline) {
        // Submit directly to backend
        const response = await fetch('/api/movements/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(movementData),
        });

        if (!response.ok) {
          throw new Error(`Server error: ${response.statusText}`);
        }

        const result = await response.json();
        setMessageType('success');
        setMessage('Movement submitted successfully');
        setLastSyncTime(new Date());

        // Add to completed items
        addScannedItem({
          containerNumber,
          partNumber,
          quantity: quantity ? parseFloat(quantity) : undefined,
          unitOfMeasure,
          location: toLocation,
          status: 'confirmed',
        });

        resetForm();
      } else {
        // Add to offline sync queue
        const queueItem: LocalSyncQueue = {
          id: `sync-${Date.now()}`,
          operation: 'create',
          data: movementData,
          timestamp: new Date(),
          retries: 0,
          status: 'pending',
        };

        setSyncQueue([...syncQueue, queueItem]);
        localStorage.setItem('movement_sync_queue', JSON.stringify([...syncQueue, queueItem]));

        setMessageType('info');
        setMessage('Movement saved offline. Will sync when connection restored.');
        setOfflineCount(offlineCount + 1);

        // Add to completed items
        addScannedItem({
          containerNumber,
          partNumber,
          quantity: quantity ? parseFloat(quantity) : undefined,
          unitOfMeasure,
          location: toLocation,
          status: 'pending',
        });

        resetForm();
      }
    } catch (error) {
      setMessageType('error');
      setMessage(`Submission error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Sync offline queue with backend
   */
  const syncOfflineQueue = async () => {
    if (syncQueue.length === 0 || isSyncing) return;

    setSyncing(true);
    const failedItems: LocalSyncQueue[] = [];

    for (const item of syncQueue) {
      try {
        const response = await fetch('/api/movements/mobile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item.data),
        });

        if (response.ok) {
          // Update item status
          setSyncQueue((prev) =>
            prev.map((qi) =>
              qi.id === item.id ? { ...qi, status: 'synced' } : qi
            )
          );
        } else {
          failedItems.push({ ...item, retries: item.retries + 1 });
        }
      } catch (error) {
        failedItems.push({ ...item, retries: item.retries + 1 });
      }
    }

    // Remove synced items, keep failed items with retry
    setSyncQueue(failedItems.filter((item) => item.retries < 3));
    localStorage.setItem(
      'movement_sync_queue',
      JSON.stringify(failedItems.filter((item) => item.retries < 3))
    );

    setLastSyncTime(new Date());
    setSyncing(false);

    if (failedItems.length === 0) {
      setMessageType('success');
      setMessage('Offline queue synced successfully');
      setOfflineCount(0);
    }
  };

  /**
   * Add item to scanned list
   */
  const addScannedItem = (item: Omit<ScannedItem, 'id' | 'timestamp' | 'status'> & Partial<Pick<ScannedItem, 'status' | 'errorMessage'>>) => {
    const newItem: ScannedItem = {
      id: `scan-${Date.now()}`,
      containerNumber: item.containerNumber,
      partNumber: item.partNumber,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      location: item.location,
      timestamp: new Date(),
      status: item.status || 'pending',
      errorMessage: item.errorMessage,
    };

    setScannedItems([newItem, ...scannedItems]);
  };

  /**
   * Edit scanned item
   */
  const editItem = (item: ScannedItem) => {
    setSelectedItem(item);
    setEditDialogOpen(true);
  };

  /**
   * Delete scanned item
   */
  const deleteItem = (id: string) => {
    setScannedItems(scannedItems.filter((item) => item.id !== id));
  };

  /**
   * Reset form to initial state
   */
  const resetForm = () => {
    setContainerNumber('');
    setPartNumber('');
    setQuantity('');
    setFromLocation('');
    setToLocation('');
    setCurrentStep(0);
    setScanInput('');
    scanInputRef.current?.focus();
  };

  return (
    <Container maxWidth="md" sx={{ pb: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 3, mt: 2 }}>
        <Typography variant="h4" sx={{ mb: 1 }}>
          Mobile Scanning Interface
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Scan containers and manage material movements on the shop floor
        </Typography>
      </Box>

      {/* Connection Status */}
      <Box sx={{ mb: 2, display: 'flex', gap: 1, alignItems: 'center' }}>
        <Chip
          icon={isOnline ? CheckIcon : ErrorIcon}
          label={isOnline ? 'Online' : 'Offline'}
          color={isOnline ? 'success' : 'error'}
          size="small"
        />
        {!isOnline && (
          <Chip label={`${offlineCount} pending`} variant="outlined" size="small" />
        )}
        {lastSyncTime && (
          <Typography variant="caption" color="text.secondary">
            Last sync: {lastSyncTime.toLocaleTimeString()}
          </Typography>
        )}
      </Box>

      {/* Message Alert */}
      {message && (
        <Alert
          severity={messageType}
          onClose={() => setMessage('')}
          sx={{ mb: 2 }}
          icon={
            messageType === 'success' ? (
              <CheckIcon />
            ) : messageType === 'error' ? (
              <ErrorIcon />
            ) : undefined
          }
        >
          {message}
        </Alert>
      )}

      {/* Progress Steps */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stepper activeStep={currentStep} sx={{ mb: 2 }}>
            {movementSteps.map((step, index) => (
              <Step
                key={index}
                completed={step.completed && index < currentStep}
              >
                <StepLabel>{step.label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </CardContent>
      </Card>

      {/* Scan Input Section */}
      <Card sx={{ mb: 3, backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Box sx={{ mb: 2 }}>
            <TextField
              inputRef={scanInputRef}
              fullWidth
              placeholder="Scan barcode or QR code here..."
              value={scanInput}
              onChange={(e) => setScanInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleScan(scanInput);
                }
              }}
              disabled={loading}
              InputProps={{
                startAdornment: <QrCodeIcon sx={{ mr: 1, color: 'primary.main' }} />,
              }}
              autoFocus
            />
          </Box>
          <Button
            variant="contained"
            fullWidth
            onClick={() => handleScan(scanInput)}
            disabled={loading || !scanInput.trim()}
            startIcon={loading ? <CircularProgress size={20} /> : <QrCodeIcon />}
          >
            {loading ? 'Processing...' : 'Scan'}
          </Button>
        </CardContent>
      </Card>

      {/* Manual Entry Section */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle1" sx={{ mb: 2 }}>
            Manual Entry
          </Typography>

          <TextField
            fullWidth
            label="Container Number"
            value={containerNumber}
            onChange={(e) => setContainerNumber(e.target.value.toUpperCase())}
            placeholder="e.g., CONT-001"
            sx={{ mb: 2 }}
            disabled={loading}
          />

          <TextField
            fullWidth
            label="Part Number (Optional)"
            value={partNumber}
            onChange={(e) => setPartNumber(e.target.value.toUpperCase())}
            placeholder="e.g., PART-123"
            sx={{ mb: 2 }}
            disabled={loading}
          />

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              label="Quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              type="number"
              disabled={loading}
            />
            <FormControl fullWidth disabled={loading}>
              <InputLabel>Unit of Measure</InputLabel>
              <Select
                value={unitOfMeasure}
                onChange={(e) => setUnitOfMeasure(e.target.value)}
                label="Unit of Measure"
              >
                <MenuItem value="lbs">Pounds (lbs)</MenuItem>
                <MenuItem value="kg">Kilograms (kg)</MenuItem>
                <MenuItem value="units">Units</MenuItem>
                <MenuItem value="cases">Cases</MenuItem>
                <MenuItem value="pallets">Pallets</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
            <TextField
              label="From Location"
              value={fromLocation}
              onChange={(e) => setFromLocation(e.target.value.toUpperCase())}
              placeholder="e.g., LOC-A1"
              disabled={loading}
            />
            <TextField
              label="To Location"
              value={toLocation}
              onChange={(e) => setToLocation(e.target.value.toUpperCase())}
              placeholder="e.g., LOC-B2"
              disabled={loading}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={submitMovement}
              disabled={loading || !containerNumber || !fromLocation || !toLocation}
              startIcon={loading ? <CircularProgress size={20} /> : <SendIcon />}
            >
              {loading ? 'Submitting...' : 'Submit Movement'}
            </Button>
            <Button
              variant="outlined"
              onClick={resetForm}
              disabled={loading}
            >
              Clear
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Sync Controls */}
      {!isOnline && syncQueue.length > 0 && (
        <Card sx={{ mb: 3, backgroundColor: '#fff3cd' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="subtitle2">
                  {syncQueue.length} pending sync
                </Typography>
                <LinearProgress variant="determinate" value={(syncQueue.filter((i) => i.status === 'synced').length / syncQueue.length) * 100} sx={{ mt: 1 }} />
              </Box>
              <Button
                variant="contained"
                size="small"
                onClick={syncOfflineQueue}
                disabled={isSyncing}
                startIcon={isSyncing ? <CircularProgress size={16} /> : <RefreshIcon />}
              >
                {isSyncing ? 'Syncing...' : 'Sync Now'}
              </Button>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Scanned Items History */}
      <Card>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Scan History ({scannedItems.length})
          </Typography>

          {scannedItems.length === 0 ? (
            <Typography color="text.secondary" sx={{ textAlign: 'center', py: 3 }}>
              No scans yet. Start scanning containers to see them here.
            </Typography>
          ) : (
            <List sx={{ maxHeight: 400, overflow: 'auto' }}>
              {scannedItems.map((item) => (
                <ListItem
                  key={item.id}
                  secondaryAction={
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Button
                        size="small"
                        startIcon={<EditIcon />}
                        onClick={() => editItem(item)}
                      >
                        Edit
                      </Button>
                      <Button
                        size="small"
                        color="error"
                        startIcon={<DeleteIcon />}
                        onClick={() => deleteItem(item.id)}
                      >
                        Delete
                      </Button>
                    </Box>
                  }
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle2">{item.containerNumber}</Typography>
                        <Chip
                          size="small"
                          label={item.status}
                          color={
                            item.status === 'confirmed'
                              ? 'success'
                              : item.status === 'error'
                              ? 'error'
                              : 'default'
                          }
                        />
                      </Box>
                    }
                    secondary={
                      <>
                        {item.partNumber && `Part: ${item.partNumber} | `}
                        {item.quantity && `Qty: ${item.quantity} ${item.unitOfMeasure} | `}
                        {item.location && `Loc: ${item.location} | `}
                        {item.timestamp.toLocaleTimeString()}
                      </>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)}>
        <DialogTitle>Edit Scan Item</DialogTitle>
        <DialogContent>
          {selectedItem && (
            <Box sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <TextField
                fullWidth
                label="Container Number"
                value={selectedItem.containerNumber}
                disabled
              />
              <TextField
                fullWidth
                label="Part Number"
                value={selectedItem.partNumber || ''}
                disabled
              />
              <TextField
                fullWidth
                label="Quantity"
                value={selectedItem.quantity || ''}
                disabled
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default MobileScanning;
