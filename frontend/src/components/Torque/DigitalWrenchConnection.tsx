/**
 * Digital Wrench Connection Component
 * Displays wrench connectivity status, battery level, calibration status
 * Provides connection controls and real-time monitoring
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Bluetooth,
  Wifi,
  Usb,
  Cable,
  Battery,
  Signal,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Settings,
  Wrench,
  Calendar,
  Zap
} from 'lucide-react';

import {
  DigitalWrenchConfig,
  DigitalWrenchReading,
  DigitalWrenchBrand,
  WrenchConnectionStatus
} from '../../types/torque';

export interface DigitalWrenchConnectionProps {
  wrenchConfig: DigitalWrenchConfig;
  connectionStatus: WrenchConnectionStatus;
  lastReading?: DigitalWrenchReading;
  onConnect: () => void;
  onDisconnect: () => void;
  onRefresh: () => void;
  onSettings: () => void;
  onCalibrate?: () => void;
  showDiagnostics?: boolean;
  allowManualControl?: boolean;
}

const getConnectionIcon = (type: string) => {
  switch (type) {
    case 'Bluetooth':
      return Bluetooth;
    case 'WiFi':
      return Wifi;
    case 'USB':
      return Usb;
    case 'Serial':
      return Cable;
    default:
      return Wrench;
  }
};

const getBrandIcon = (brand: DigitalWrenchBrand): string => {
  switch (brand) {
    case DigitalWrenchBrand.SNAP_ON:
      return '🔧'; // Snap-on logo placeholder
    case DigitalWrenchBrand.NORBAR:
      return '⚙️'; // Norbar logo placeholder
    case DigitalWrenchBrand.CDI:
      return '🔩'; // CDI logo placeholder
    case DigitalWrenchBrand.GEDORE:
      return '🛠️'; // Gedore logo placeholder
    case DigitalWrenchBrand.BETA:
      return '⚡'; // Beta logo placeholder
    case DigitalWrenchBrand.CRAFTSMAN:
      return '🔨'; // Craftsman logo placeholder
    default:
      return '🔧';
  }
};

const getConnectionStatusColor = (isConnected: boolean, errorCount: number) => {
  if (!isConnected) return 'red';
  if (errorCount > 0) return 'yellow';
  return 'green';
};

const getBatteryColor = (level: number) => {
  if (level > 60) return 'green';
  if (level > 20) return 'yellow';
  return 'red';
};

const getSignalStrengthBars = (strength?: number) => {
  if (!strength) return 0;

  // Convert signal strength to bars (1-4)
  if (strength >= -30) return 4;
  if (strength >= -50) return 3;
  if (strength >= -70) return 2;
  if (strength >= -90) return 1;
  return 0;
};

export const DigitalWrenchConnection: React.FC<DigitalWrenchConnectionProps> = ({
  wrenchConfig,
  connectionStatus,
  lastReading,
  onConnect,
  onDisconnect,
  onRefresh,
  onSettings,
  onCalibrate,
  showDiagnostics = false,
  allowManualControl = true
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [lastHeartbeat, setLastHeartbeat] = useState<Date | null>(null);

  const ConnectionIcon = getConnectionIcon(wrenchConfig.connectionSettings.type);
  const statusColor = getConnectionStatusColor(connectionStatus.isConnected, connectionStatus.errorCount);

  // Update heartbeat
  useEffect(() => {
    if (connectionStatus.isConnected) {
      setLastHeartbeat(connectionStatus.lastHeartbeat);
    }
  }, [connectionStatus]);

  // Handle connection
  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } finally {
      setIsConnecting(false);
    }
  };

  // Calculate calibration status
  const getCalibrationStatus = () => {
    const now = new Date();
    const dueDate = new Date(wrenchConfig.calibrationDueDate);
    const daysUntilDue = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (connectionStatus.calibrationStatus === 'expired') {
      return {
        status: 'expired',
        message: 'Calibration expired',
        color: 'red',
        icon: XCircle
      };
    }

    if (daysUntilDue <= 7) {
      return {
        status: 'warning',
        message: `Calibration due in ${daysUntilDue} days`,
        color: 'yellow',
        icon: AlertTriangle
      };
    }

    return {
      status: 'valid',
      message: `Calibration valid for ${daysUntilDue} days`,
      color: 'green',
      icon: CheckCircle
    };
  };

  const calibrationInfo = getCalibrationStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="text-lg">{getBrandIcon(wrenchConfig.brand)}</div>
            <div>
              <div className="font-semibold">{wrenchConfig.brand} {wrenchConfig.model}</div>
              <div className="text-sm text-muted-foreground">S/N: {wrenchConfig.serialNumber}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={`border-${statusColor}-300 text-${statusColor}-700 bg-${statusColor}-50`}
            >
              <div className={`w-2 h-2 rounded-full bg-${statusColor}-500 mr-1`} />
              {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Connection Controls */}
        <div className="flex items-center gap-2">
          {!connectionStatus.isConnected ? (
            <Button
              onClick={handleConnect}
              disabled={isConnecting}
              className="flex items-center gap-2"
            >
              <ConnectionIcon className="h-4 w-4" />
              {isConnecting ? 'Connecting...' : 'Connect'}
            </Button>
          ) : (
            <Button
              onClick={onDisconnect}
              variant="outline"
              className="flex items-center gap-2"
            >
              <XCircle className="h-4 w-4" />
              Disconnect
            </Button>
          )}

          <Button
            onClick={onRefresh}
            variant="ghost"
            size="sm"
            className="flex items-center gap-1"
          >
            <RefreshCw className="h-3 w-3" />
            Refresh
          </Button>

          {allowManualControl && (
            <Button
              onClick={onSettings}
              variant="ghost"
              size="sm"
              className="flex items-center gap-1"
            >
              <Settings className="h-3 w-3" />
              Settings
            </Button>
          )}
        </div>

        {/* Connection Information */}
        <div className="grid grid-cols-2 gap-4">
          {/* Connection Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <ConnectionIcon className="h-4 w-4" />
              <span className="font-medium">Connection:</span>
              <span>{wrenchConfig.connectionSettings.type}</span>
            </div>

            {wrenchConfig.connectionSettings.address && (
              <div className="text-sm text-muted-foreground">
                Address: {wrenchConfig.connectionSettings.address}
                {wrenchConfig.connectionSettings.port && `:${wrenchConfig.connectionSettings.port}`}
              </div>
            )}

            {lastHeartbeat && (
              <div className="text-sm text-muted-foreground">
                Last seen: {lastHeartbeat.toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Torque Range */}
          <div className="space-y-2">
            <div className="text-sm">
              <span className="font-medium">Range:</span>
              <div className="text-muted-foreground">
                {wrenchConfig.torqueRange.min} - {wrenchConfig.torqueRange.max} {wrenchConfig.torqueRange.unit}
              </div>
            </div>
            <div className="text-sm">
              <span className="font-medium">Accuracy:</span>
              <span className="text-muted-foreground ml-1">±{wrenchConfig.accuracy}%</span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Status Indicators */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Battery Level */}
          {connectionStatus.batteryLevel !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Battery className={`h-4 w-4 text-${getBatteryColor(connectionStatus.batteryLevel)}-500`} />
                <span className="text-sm font-medium">Battery</span>
              </div>
              <Progress
                value={connectionStatus.batteryLevel}
                className={`h-2 bg-${getBatteryColor(connectionStatus.batteryLevel)}-100`}
              />
              <div className="text-xs text-center text-muted-foreground">
                {connectionStatus.batteryLevel}%
              </div>
            </div>
          )}

          {/* Signal Strength */}
          {connectionStatus.signalStrength !== undefined && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Signal className="h-4 w-4" />
                <span className="text-sm font-medium">Signal</span>
              </div>
              <div className="flex items-end gap-1 h-6">
                {[1, 2, 3, 4].map(bar => (
                  <div
                    key={bar}
                    className={`flex-1 rounded-t ${
                      bar <= getSignalStrengthBars(connectionStatus.signalStrength)
                        ? 'bg-green-500'
                        : 'bg-gray-200'
                    }`}
                    style={{ height: `${bar * 25}%` }}
                  />
                ))}
              </div>
              <div className="text-xs text-center text-muted-foreground">
                {connectionStatus.signalStrength} dBm
              </div>
            </div>
          )}

          {/* Error Count */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className={`h-4 w-4 ${connectionStatus.errorCount > 0 ? 'text-yellow-500' : 'text-gray-400'}`} />
              <span className="text-sm font-medium">Errors</span>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold ${connectionStatus.errorCount > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {connectionStatus.errorCount}
              </div>
              {connectionStatus.lastError && (
                <div className="text-xs text-muted-foreground truncate">
                  {connectionStatus.lastError}
                </div>
              )}
            </div>
          </div>
        </div>

        <Separator />

        {/* Calibration Status */}
        <div className="space-y-3">
          <Alert className={`border-${calibrationInfo.color}-200 bg-${calibrationInfo.color}-50`}>
            <calibrationInfo.icon className={`h-4 w-4 text-${calibrationInfo.color}-600`} />
            <AlertDescription className={`text-${calibrationInfo.color}-800`}>
              <div className="flex items-center justify-between">
                <span>{calibrationInfo.message}</span>
                {onCalibrate && calibrationInfo.status !== 'valid' && (
                  <Button
                    onClick={onCalibrate}
                    size="sm"
                    variant="outline"
                    className="ml-2"
                  >
                    Calibrate
                  </Button>
                )}
              </div>
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="font-medium">Last Calibration:</span>
              <div className="text-muted-foreground">
                {new Date(wrenchConfig.lastCalibrationDate).toLocaleDateString()}
              </div>
            </div>
            <div>
              <span className="font-medium">Next Due:</span>
              <div className="text-muted-foreground">
                {new Date(wrenchConfig.calibrationDueDate).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>

        {/* Last Reading */}
        {lastReading && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                <span className="text-sm font-medium">Last Reading</span>
                <Badge variant="outline" className="text-xs">
                  {new Date(lastReading.timestamp).toLocaleTimeString()}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold">{lastReading.torqueValue.toFixed(2)}</div>
                  <div className="text-xs text-muted-foreground">Torque ({lastReading.torqueUnit})</div>
                </div>
                {lastReading.angle && (
                  <div>
                    <div className="text-lg font-bold">{lastReading.angle.toFixed(1)}°</div>
                    <div className="text-xs text-muted-foreground">Angle</div>
                  </div>
                )}
                <div>
                  <div className={`text-lg font-bold ${lastReading.isCalibrated ? 'text-green-600' : 'text-red-600'}`}>
                    {lastReading.isCalibrated ? '✓' : '✗'}
                  </div>
                  <div className="text-xs text-muted-foreground">Calibrated</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Diagnostics */}
        {showDiagnostics && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span className="text-sm font-medium">Diagnostics</span>
              </div>
              <div className="text-xs space-y-1 text-muted-foreground font-mono">
                <div>Wrench ID: {wrenchConfig.id}</div>
                <div>Active: {wrenchConfig.isActive ? 'Yes' : 'No'}</div>
                <div>Connection Type: {wrenchConfig.connectionSettings.type}</div>
                {wrenchConfig.connectionSettings.baudRate && (
                  <div>Baud Rate: {wrenchConfig.connectionSettings.baudRate}</div>
                )}
                <div>Status: {connectionStatus.isConnected ? 'Connected' : 'Disconnected'}</div>
                <div>Calibration: {connectionStatus.calibrationStatus}</div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default DigitalWrenchConnection;