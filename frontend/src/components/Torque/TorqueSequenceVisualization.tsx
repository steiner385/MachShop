/**
 * Torque Sequence Visualization Component
 * Visual guidance for bolt tightening sequences with real-time progress
 * Supports multiple patterns: star, spiral, cross, linear
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Play,
  Pause,
  Square,
  CheckCircle,
  AlertTriangle,
  Wrench,
  Target,
  RotateCcw
} from 'lucide-react';

// Import torque types
import {
  TorqueSequenceWithVisual,
  SequenceGuidanceState,
  TorqueEventSummary,
  BoltPosition,
  TorquePattern
} from '../../types/torque';

export interface TorqueSequenceVisualizationProps {
  sequence: TorqueSequenceWithVisual;
  guidanceState: SequenceGuidanceState;
  onBoltClick: (boltPosition: number) => void;
  onStartSequence: () => void;
  onPauseSequence: () => void;
  onStopSequence: () => void;
  onResetSequence: () => void;
  showAudioCues?: boolean;
  enableInteraction?: boolean;
  theme?: 'light' | 'dark';
}

interface BoltState {
  position: number;
  status: 'pending' | 'current' | 'completed' | 'out_of_spec' | 'rework_required';
  torqueValue?: number;
  isInSpec?: boolean;
  passNumber?: number;
}

export const TorqueSequenceVisualization: React.FC<TorqueSequenceVisualizationProps> = ({
  sequence,
  guidanceState,
  onBoltClick,
  onStartSequence,
  onPauseSequence,
  onStopSequence,
  onResetSequence,
  showAudioCues = true,
  enableInteraction = true,
  theme = 'light'
}) => {
  const [boltStates, setBoltStates] = useState<Map<number, BoltState>>(new Map());
  const [animationEnabled, setAnimationEnabled] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(100);

  // Initialize bolt states
  useEffect(() => {
    const initialStates = new Map<number, BoltState>();

    sequence.boltPositions.forEach(bolt => {
      initialStates.set(bolt.position, {
        position: bolt.position,
        status: 'pending'
      });
    });

    // Update with completed positions
    guidanceState.visualData.completedPositions.forEach(position => {
      const state = initialStates.get(position);
      if (state) {
        state.status = 'completed';
      }
    });

    // Set current position
    if (guidanceState.visualData.currentPosition > 0) {
      const currentState = initialStates.get(guidanceState.visualData.currentPosition);
      if (currentState) {
        currentState.status = 'current';
      }
    }

    setBoltStates(initialStates);
  }, [sequence, guidanceState]);

  // Update bolt states when guidance state changes
  useEffect(() => {
    if (guidanceState.lastEvent) {
      setBoltStates(prev => {
        const updated = new Map(prev);
        const boltState = updated.get(guidanceState.lastEvent!.boltPosition);

        if (boltState) {
          boltState.torqueValue = guidanceState.lastEvent!.actualTorque;
          boltState.isInSpec = guidanceState.lastEvent!.isInSpec;
          boltState.passNumber = guidanceState.lastEvent!.passNumber;
          boltState.status = guidanceState.lastEvent!.requiresRework
            ? 'rework_required'
            : guidanceState.lastEvent!.isInSpec
              ? 'completed'
              : 'out_of_spec';
        }

        return updated;
      });
    }
  }, [guidanceState.lastEvent]);

  // Audio cue functionality
  const playAudioCue = useCallback((type: 'success' | 'warning' | 'error' | 'next') => {
    if (!showAudioCues) return;

    // Create audio context for sound generation
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Set frequency based on cue type
    switch (type) {
      case 'success':
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
        break;
      case 'warning':
        oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
        break;
      case 'error':
        oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
        break;
      case 'next':
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime);
        break;
    }

    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.2);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  }, [showAudioCues]);

  // Generate SVG path for bolt pattern visualization
  const generatePatternPath = (pattern: TorquePattern, boltPositions: BoltPosition[]): string => {
    if (boltPositions.length === 0) return '';

    const center = { x: 150, y: 150 }; // SVG center
    const radius = 120;

    switch (pattern) {
      case 'STAR':
        // Star pattern: opposite bolts first
        const starOrder = [];
        const step = Math.floor(boltPositions.length / 2);
        for (let i = 0; i < boltPositions.length; i++) {
          starOrder.push((i * step) % boltPositions.length);
        }
        return starOrder.map(index => {
          const bolt = boltPositions[index];
          return `${index === 0 ? 'M' : 'L'} ${bolt.coordinates?.x || 0} ${bolt.coordinates?.y || 0}`;
        }).join(' ');

      case 'SPIRAL':
        // Spiral pattern: clockwise from start
        return boltPositions.map((bolt, index) =>
          `${index === 0 ? 'M' : 'L'} ${bolt.coordinates?.x || 0} ${bolt.coordinates?.y || 0}`
        ).join(' ');

      case 'CROSS':
        // Cross pattern: alternating quadrants
        const crossOrder = [];
        const quadrantSize = Math.ceil(boltPositions.length / 4);
        for (let quad = 0; quad < 4; quad++) {
          for (let i = 0; i < quadrantSize; i++) {
            const index = quad * quadrantSize + i;
            if (index < boltPositions.length) {
              crossOrder.push(index);
            }
          }
        }
        return crossOrder.map((index, i) => {
          const bolt = boltPositions[index];
          return `${i === 0 ? 'M' : 'L'} ${bolt.coordinates?.x || 0} ${bolt.coordinates?.y || 0}`;
        }).join(' ');

      case 'LINEAR':
      default:
        // Linear pattern: sequential order
        return boltPositions.map((bolt, index) =>
          `${index === 0 ? 'M' : 'L'} ${bolt.coordinates?.x || 0} ${bolt.coordinates?.y || 0}`
        ).join(' ');
    }
  };

  // Get bolt color based on status
  const getBoltColor = (state: BoltState): string => {
    switch (state.status) {
      case 'current':
        return '#3b82f6'; // Blue
      case 'completed':
        return '#10b981'; // Green
      case 'out_of_spec':
        return '#f59e0b'; // Amber
      case 'rework_required':
        return '#ef4444'; // Red
      case 'pending':
      default:
        return '#6b7280'; // Gray
    }
  };

  // Handle bolt click
  const handleBoltClick = (boltPosition: number) => {
    if (!enableInteraction) return;

    playAudioCue('next');
    onBoltClick(boltPosition);
  };

  // Calculate overall progress
  const completedBolts = Array.from(boltStates.values()).filter(
    state => state.status === 'completed'
  ).length;
  const totalBolts = sequence.boltPositions.length;
  const progressPercentage = totalBolts > 0 ? (completedBolts / totalBolts) * 100 : 0;

  return (
    <div className={`space-y-4 ${theme === 'dark' ? 'dark' : ''}`}>
      {/* Header Controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Wrench className="h-5 w-5" />
              {sequence.sequenceName}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                Pass {guidanceState.progress.currentPass}/{guidanceState.progress.totalPasses}
              </Badge>
              <Badge variant="outline">
                {sequence.torqueSpec?.targetTorque} {sequence.torqueSpec?.torqueUnit || 'Nm'}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{completedBolts}/{totalBolts} bolts completed</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-2">
            {guidanceState.status === 'ready' && (
              <Button onClick={onStartSequence} className="flex items-center gap-2">
                <Play className="h-4 w-4" />
                Start Sequence
              </Button>
            )}

            {guidanceState.status === 'in_progress' && (
              <Button onClick={onPauseSequence} variant="outline" className="flex items-center gap-2">
                <Pause className="h-4 w-4" />
                Pause
              </Button>
            )}

            <Button onClick={onStopSequence} variant="outline" className="flex items-center gap-2">
              <Square className="h-4 w-4" />
              Stop
            </Button>

            <Button onClick={onResetSequence} variant="outline" className="flex items-center gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 ml-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(Math.max(50, zoomLevel - 25))}
              >
                -
              </Button>
              <span className="text-sm w-12 text-center">{zoomLevel}%</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setZoomLevel(Math.min(200, zoomLevel + 25))}
              >
                +
              </Button>
            </div>
          </div>

          {/* Current Step Information */}
          {guidanceState.status === 'in_progress' && (
            <Alert>
              <Target className="h-4 w-4" />
              <AlertDescription>
                <div className="flex justify-between items-center">
                  <div>
                    <strong>Bolt Position {guidanceState.currentStep.boltPosition}</strong>
                    {guidanceState.currentStep.instructions && (
                      <p className="text-sm mt-1">{guidanceState.currentStep.instructions}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {guidanceState.currentStep.targetTorque} {sequence.torqueSpec?.torqueUnit || 'Nm'}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pass {guidanceState.currentStep.passNumber}
                    </div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Main Visualization */}
      <Card>
        <CardContent className="p-6">
          <div
            className="relative mx-auto border rounded-lg overflow-hidden bg-gray-50"
            style={{
              width: `${300 * (zoomLevel / 100)}px`,
              height: `${300 * (zoomLevel / 100)}px`,
              maxWidth: '100%'
            }}
          >
            <svg
              width="100%"
              height="100%"
              viewBox="0 0 300 300"
              className="absolute inset-0"
            >
              {/* Pattern Guide Path */}
              {sequence.visualPattern?.svg ? (
                <g dangerouslySetInnerHTML={{ __html: sequence.visualPattern.svg }} />
              ) : (
                <path
                  d={generatePatternPath(sequence.torqueSpec?.sequencePattern || 'LINEAR', sequence.boltPositions)}
                  stroke="#e5e7eb"
                  strokeWidth="2"
                  strokeDasharray="5,5"
                  fill="none"
                />
              )}

              {/* Bolt Positions */}
              {sequence.boltPositions.map((bolt) => {
                const boltState = boltStates.get(bolt.position);
                if (!boltState) return null;

                const x = bolt.coordinates?.x || 150;
                const y = bolt.coordinates?.y || 150;

                return (
                  <g key={bolt.position}>
                    {/* Bolt Circle */}
                    <circle
                      cx={x}
                      cy={y}
                      r={boltState.status === 'current' ? 12 : 10}
                      fill={getBoltColor(boltState)}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className={`cursor-pointer transition-all duration-300 ${
                        enableInteraction ? 'hover:opacity-80' : ''
                      } ${animationEnabled && boltState.status === 'current' ? 'animate-pulse' : ''}`}
                      onClick={() => handleBoltClick(bolt.position)}
                    />

                    {/* Bolt Position Number */}
                    <text
                      x={x}
                      y={y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="text-xs font-semibold fill-white pointer-events-none"
                    >
                      {bolt.position}
                    </text>

                    {/* Status Icon */}
                    {boltState.status === 'completed' && (
                      <CheckCircle
                        x={x + 8}
                        y={y - 8}
                        width="8"
                        height="8"
                        className="fill-green-500"
                      />
                    )}

                    {(boltState.status === 'out_of_spec' || boltState.status === 'rework_required') && (
                      <AlertTriangle
                        x={x + 8}
                        y={y - 8}
                        width="8"
                        height="8"
                        className="fill-red-500"
                      />
                    )}

                    {/* Bolt Label */}
                    {bolt.label && (
                      <text
                        x={x}
                        y={y - 20}
                        textAnchor="middle"
                        className="text-xs fill-gray-600"
                      >
                        {bolt.label}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Next Position Indicator */}
              {guidanceState.visualData.nextPositions.length > 0 && (
                guidanceState.visualData.nextPositions.slice(0, 3).map((position, index) => {
                  const bolt = sequence.boltPositions.find(b => b.position === position);
                  if (!bolt || !bolt.coordinates) return null;

                  return (
                    <circle
                      key={`next-${position}`}
                      cx={bolt.coordinates.x}
                      cy={bolt.coordinates.y}
                      r={15 + index * 2}
                      fill="none"
                      stroke="#3b82f6"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                      opacity={0.7 - index * 0.2}
                      className={animationEnabled ? 'animate-ping' : ''}
                    />
                  );
                })
              )}
            </svg>
          </div>
        </CardContent>
      </Card>

      {/* Status Messages */}
      {guidanceState.messages.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {guidanceState.messages.map((message, index) => (
                <Alert key={index} variant={
                  message.includes('error') || message.includes('failed') ? 'destructive' : 'default'
                }>
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default TorqueSequenceVisualization;