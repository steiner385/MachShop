/**
 * Torque Validation Display Component
 * Real-time visual feedback for torque validation with in-spec/out-of-spec indication
 * Includes gauge visualization and immediate feedback
 */

import React, { useEffect, useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Gauge,
  TrendingUp,
  TrendingDown,
  Target,
  RefreshCw
} from 'lucide-react';

import {
  TorqueValidationResult,
  DigitalWrenchReading,
  TorqueSpecificationWithMetadata
} from '../../types/torque';

export interface TorqueValidationDisplayProps {
  torqueSpec: TorqueSpecificationWithMetadata;
  currentReading?: DigitalWrenchReading;
  validationResult?: TorqueValidationResult;
  isLiveReading?: boolean;
  showGauge?: boolean;
  showTrend?: boolean;
  showTolerance?: boolean;
  onAcceptReading?: () => void;
  onRejectReading?: () => void;
  onRetryReading?: () => void;
  enableAutoAccept?: boolean;
  autoAcceptDelay?: number;
}

interface TorqueGaugeProps {
  value: number;
  target: number;
  min: number;
  max: number;
  upperLimit: number;
  lowerLimit: number;
  size?: number;
  showLabels?: boolean;
}

// Torque Gauge Component
const TorqueGauge: React.FC<TorqueGaugeProps> = ({
  value,
  target,
  min,
  max,
  upperLimit,
  lowerLimit,
  size = 200,
  showLabels = true
}) => {
  const centerX = size / 2;
  const centerY = size / 2;
  const radius = size * 0.35;
  const strokeWidth = size * 0.1;

  // Calculate angles (gauge spans 180 degrees from bottom-left to bottom-right)
  const startAngle = 180;
  const endAngle = 360;
  const totalAngle = endAngle - startAngle;

  const valueAngle = startAngle + ((value - min) / (max - min)) * totalAngle;
  const targetAngle = startAngle + ((target - min) / (max - min)) * totalAngle;
  const lowerLimitAngle = startAngle + ((lowerLimit - min) / (max - min)) * totalAngle;
  const upperLimitAngle = startAngle + ((upperLimit - min) / (max - min)) * totalAngle;

  // Convert angles to radians for calculations
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

  // Calculate arc path
  const createArcPath = (start: number, end: number, r: number) => {
    const startAngleRad = toRadians(start);
    const endAngleRad = toRadians(end);

    const x1 = centerX + r * Math.cos(startAngleRad);
    const y1 = centerY + r * Math.sin(startAngleRad);
    const x2 = centerX + r * Math.cos(endAngleRad);
    const y2 = centerY + r * Math.sin(endAngleRad);

    const largeArc = end - start > 180 ? 1 : 0;

    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };

  // Determine gauge color based on value
  const getGaugeColor = () => {
    if (value >= lowerLimit && value <= upperLimit) return '#10b981'; // Green
    if (value < lowerLimit || value > upperLimit) return '#f59e0b'; // Amber
    if (value < min * 0.5 || value > max * 1.5) return '#ef4444'; // Red
    return '#6b7280'; // Gray
  };

  return (
    <div className="relative inline-block">
      <svg width={size} height={size} className="rotate-0">
        {/* Background Arc */}
        <path
          d={createArcPath(startAngle, endAngle, radius)}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Tolerance Zone Arc */}
        <path
          d={createArcPath(lowerLimitAngle, upperLimitAngle, radius)}
          fill="none"
          stroke="#dcfce7"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />

        {/* Value Arc */}
        <path
          d={createArcPath(startAngle, Math.min(valueAngle, endAngle), radius)}
          fill="none"
          stroke={getGaugeColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className="transition-all duration-300"
        />

        {/* Target Indicator */}
        <g>
          <line
            x1={centerX + (radius - strokeWidth / 2) * Math.cos(toRadians(targetAngle))}
            y1={centerY + (radius - strokeWidth / 2) * Math.sin(toRadians(targetAngle))}
            x2={centerX + (radius + strokeWidth / 2) * Math.cos(toRadians(targetAngle))}
            y2={centerY + (radius + strokeWidth / 2) * Math.sin(toRadians(targetAngle))}
            stroke="#3b82f6"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>

        {/* Value Pointer */}
        <g className="transition-all duration-300">
          <line
            x1={centerX}
            y1={centerY}
            x2={centerX + (radius * 0.8) * Math.cos(toRadians(valueAngle))}
            y2={centerY + (radius * 0.8) * Math.sin(toRadians(valueAngle))}
            stroke={getGaugeColor()}
            strokeWidth="4"
            strokeLinecap="round"
          />
          <circle cx={centerX} cy={centerY} r="6" fill={getGaugeColor()} />
        </g>

        {/* Labels */}
        {showLabels && (
          <g>
            <text x={centerX} y={centerY + 40} textAnchor="middle" className="text-2xl font-bold fill-current">
              {value.toFixed(1)}
            </text>
            <text x={centerX} y={centerY + 55} textAnchor="middle" className="text-sm fill-gray-500">
              Target: {target.toFixed(1)}
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

export const TorqueValidationDisplay: React.FC<TorqueValidationDisplayProps> = ({
  torqueSpec,
  currentReading,
  validationResult,
  isLiveReading = false,
  showGauge = true,
  showTrend = true,
  showTolerance = true,
  onAcceptReading,
  onRejectReading,
  onRetryReading,
  enableAutoAccept = false,
  autoAcceptDelay = 3000
}) => {
  const [recentReadings, setRecentReadings] = useState<number[]>([]);
  const [autoAcceptTimer, setAutoAcceptTimer] = useState<NodeJS.Timeout | null>(null);
  const [timeToAutoAccept, setTimeToAutoAccept] = useState<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate gauge parameters
  const targetTorque = torqueSpec.targetTorque;
  const upperLimit = targetTorque + torqueSpec.tolerancePlus;
  const lowerLimit = targetTorque - torqueSpec.toleranceMinus;
  const gaugeMin = Math.max(0, lowerLimit * 0.5);
  const gaugeMax = upperLimit * 1.5;

  // Track recent readings for trend analysis
  useEffect(() => {
    if (currentReading) {
      setRecentReadings(prev => {
        const updated = [...prev, currentReading.torqueValue];
        return updated.slice(-10); // Keep last 10 readings
      });
    }
  }, [currentReading]);

  // Auto-accept functionality
  useEffect(() => {
    if (enableAutoAccept && validationResult?.isInSpec && onAcceptReading) {
      setTimeToAutoAccept(autoAcceptDelay / 1000);

      const timer = setTimeout(() => {
        onAcceptReading();
      }, autoAcceptDelay);

      const countdown = setInterval(() => {
        setTimeToAutoAccept(prev => {
          if (prev <= 1) {
            clearInterval(countdown);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      setAutoAcceptTimer(timer);
      intervalRef.current = countdown;

      return () => {
        clearTimeout(timer);
        clearInterval(countdown);
        setTimeToAutoAccept(0);
      };
    }
  }, [enableAutoAccept, validationResult, onAcceptReading, autoAcceptDelay]);

  // Cancel auto-accept
  const cancelAutoAccept = () => {
    if (autoAcceptTimer) {
      clearTimeout(autoAcceptTimer);
      setAutoAcceptTimer(null);
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimeToAutoAccept(0);
  };

  // Calculate trend
  const getTrend = (): 'up' | 'down' | 'stable' => {
    if (recentReadings.length < 3) return 'stable';

    const recent = recentReadings.slice(-3);
    const increasing = recent.every((val, i) => i === 0 || val > recent[i - 1]);
    const decreasing = recent.every((val, i) => i === 0 || val < recent[i - 1]);

    if (increasing) return 'up';
    if (decreasing) return 'down';
    return 'stable';
  };

  // Get status information
  const getStatusInfo = () => {
    if (!validationResult) {
      return {
        status: 'waiting',
        color: 'gray',
        icon: Gauge,
        message: 'Waiting for torque reading...'
      };
    }

    if (validationResult.isInSpec) {
      return {
        status: 'in_spec',
        color: 'green',
        icon: CheckCircle,
        message: 'Torque is within specification'
      };
    }

    if (validationResult.requiresRework) {
      return {
        status: 'rework',
        color: 'red',
        icon: XCircle,
        message: 'Torque requires rework'
      };
    }

    return {
      status: 'out_of_spec',
      color: 'yellow',
      icon: AlertTriangle,
      message: 'Torque is out of specification'
    };
  };

  const statusInfo = getStatusInfo();
  const trend = getTrend();

  return (
    <div className="space-y-4">
      {/* Main Validation Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gauge className="h-5 w-5" />
            Torque Validation
            {isLiveReading && (
              <Badge variant="outline" className="animate-pulse">
                LIVE
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Gauge Visualization */}
            {showGauge && currentReading && (
              <div className="flex-shrink-0 flex justify-center">
                <TorqueGauge
                  value={currentReading.torqueValue}
                  target={targetTorque}
                  min={gaugeMin}
                  max={gaugeMax}
                  upperLimit={upperLimit}
                  lowerLimit={lowerLimit}
                  size={250}
                />
              </div>
            )}

            {/* Validation Details */}
            <div className="flex-1 space-y-4">
              {/* Status Alert */}
              <Alert className={`border-${statusInfo.color}-200 bg-${statusInfo.color}-50`}>
                <statusInfo.icon className={`h-4 w-4 text-${statusInfo.color}-600`} />
                <AlertDescription className={`text-${statusInfo.color}-800`}>
                  {statusInfo.message}
                  {validationResult && (
                    <div className="mt-2 text-sm">
                      Deviation: {validationResult.deviationPercent.toFixed(2)}%
                    </div>
                  )}
                </AlertDescription>
              </Alert>

              {/* Current Reading */}
              {currentReading && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold">
                      {currentReading.torqueValue.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-600">
                      {currentReading.torqueUnit}
                    </div>
                    <div className="text-xs text-gray-500">Actual</div>
                  </div>

                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">
                      {targetTorque.toFixed(2)}
                    </div>
                    <div className="text-sm text-blue-600">
                      {torqueSpec.torqueUnit}
                    </div>
                    <div className="text-xs text-blue-500">Target</div>
                  </div>
                </div>
              )}

              {/* Tolerance Information */}
              {showTolerance && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Tolerance Range</span>
                    <div className="flex items-center gap-1">
                      {trend === 'up' && <TrendingUp className="h-4 w-4 text-red-500" />}
                      {trend === 'down' && <TrendingDown className="h-4 w-4 text-blue-500" />}
                      {showTrend && (
                        <span className="text-xs text-gray-500">
                          {trend === 'up' ? 'Increasing' : trend === 'down' ? 'Decreasing' : 'Stable'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Lower: {lowerLimit.toFixed(2)} {torqueSpec.torqueUnit}</span>
                    <span>Upper: {upperLimit.toFixed(2)} {torqueSpec.torqueUnit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                    <div
                      className="bg-green-400 h-2 rounded-full"
                      style={{
                        marginLeft: `${((lowerLimit - gaugeMin) / (gaugeMax - gaugeMin)) * 100}%`,
                        width: `${((upperLimit - lowerLimit) / (gaugeMax - gaugeMin)) * 100}%`
                      }}
                    />
                    {currentReading && (
                      <div
                        className="w-1 h-4 bg-gray-800 -mt-3 relative"
                        style={{
                          left: `${((currentReading.torqueValue - gaugeMin) / (gaugeMax - gaugeMin)) * 100}%`
                        }}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          {validationResult && (onAcceptReading || onRejectReading || onRetryReading) && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex gap-2">
                {onAcceptReading && validationResult.isInSpec && (
                  <Button
                    onClick={() => {
                      cancelAutoAccept();
                      onAcceptReading();
                    }}
                    className="flex items-center gap-2"
                  >
                    <CheckCircle className="h-4 w-4" />
                    Accept Reading
                  </Button>
                )}

                {onRejectReading && !validationResult.isInSpec && (
                  <Button
                    onClick={() => {
                      cancelAutoAccept();
                      onRejectReading();
                    }}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Reject Reading
                  </Button>
                )}

                {onRetryReading && (
                  <Button
                    onClick={() => {
                      cancelAutoAccept();
                      onRetryReading();
                    }}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Retry
                  </Button>
                )}
              </div>

              {/* Auto-accept Timer */}
              {enableAutoAccept && timeToAutoAccept > 0 && validationResult.isInSpec && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Auto-accepting in {timeToAutoAccept}s
                  </span>
                  <Button
                    onClick={cancelAutoAccept}
                    variant="ghost"
                    size="sm"
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Supervisor Review Required */}
          {validationResult?.requiresSupervisorReview && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                This reading requires supervisor review before proceeding.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Reading History */}
      {showTrend && recentReadings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recent Readings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-1 h-16 items-end">
              {recentReadings.slice(-10).map((reading, index) => {
                const height = ((reading - gaugeMin) / (gaugeMax - gaugeMin)) * 100;
                const isInSpec = reading >= lowerLimit && reading <= upperLimit;

                return (
                  <div
                    key={index}
                    className={`flex-1 rounded-t ${
                      isInSpec ? 'bg-green-400' : 'bg-red-400'
                    } transition-all duration-300`}
                    style={{ height: `${Math.max(height, 5)}%` }}
                    title={`${reading.toFixed(2)} ${torqueSpec.torqueUnit}`}
                  />
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TorqueValidationDisplay;