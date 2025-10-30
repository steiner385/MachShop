/**
 * Torque Progress Component
 * Detailed progress tracking for torque sequences with pass-by-pass breakdown
 * Real-time statistics and completion tracking
 */

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Target,
  TrendingUp,
  BarChart3,
  Activity
} from 'lucide-react';

import {
  TorqueEventSummary,
  SequenceGuidanceState,
  TorqueSpecificationWithMetadata
} from '../../types/torque';

export interface TorqueProgressProps {
  torqueSpec: TorqueSpecificationWithMetadata;
  guidanceState: SequenceGuidanceState;
  torqueEvents: TorqueEventSummary[];
  showDetailedStats?: boolean;
  showPassBreakdown?: boolean;
  onEventClick?: (event: TorqueEventSummary) => void;
}

interface PassStatistics {
  passNumber: number;
  totalBolts: number;
  completedBolts: number;
  inSpecBolts: number;
  outOfSpecBolts: number;
  reworkRequired: number;
  averageTorque: number;
  minTorque: number;
  maxTorque: number;
  completionPercentage: number;
}

interface OverallStatistics {
  totalEvents: number;
  completedBolts: number;
  totalBolts: number;
  successRate: number;
  averageTorque: number;
  standardDeviation: number;
  cpk: number;
  outOfSpecCount: number;
  reworkCount: number;
  averageTime: number;
}

export const TorqueProgress: React.FC<TorqueProgressProps> = ({
  torqueSpec,
  guidanceState,
  torqueEvents,
  showDetailedStats = true,
  showPassBreakdown = true,
  onEventClick
}) => {
  // Calculate pass statistics
  const passStatistics = useMemo((): PassStatistics[] => {
    const passSets = new Map<number, TorqueEventSummary[]>();

    // Group events by pass number
    torqueEvents.forEach(event => {
      const pass = event.passNumber;
      if (!passSets.has(pass)) {
        passSets.set(pass, []);
      }
      passSets.get(pass)!.push(event);
    });

    // Calculate statistics for each pass
    return Array.from(passSets.entries()).map(([passNumber, events]) => {
      const inSpecEvents = events.filter(e => e.isInSpec);
      const outOfSpecEvents = events.filter(e => !e.isInSpec);
      const reworkEvents = events.filter(e => e.requiresRework);

      const torqueValues = events.map(e => e.actualTorque);
      const averageTorque = torqueValues.reduce((sum, val) => sum + val, 0) / torqueValues.length || 0;
      const minTorque = Math.min(...torqueValues) || 0;
      const maxTorque = Math.max(...torqueValues) || 0;

      const expectedBolts = torqueSpec.fastenerCount;
      const completionPercentage = expectedBolts > 0 ? (events.length / expectedBolts) * 100 : 0;

      return {
        passNumber,
        totalBolts: expectedBolts,
        completedBolts: events.length,
        inSpecBolts: inSpecEvents.length,
        outOfSpecBolts: outOfSpecEvents.length,
        reworkRequired: reworkEvents.length,
        averageTorque,
        minTorque,
        maxTorque,
        completionPercentage
      };
    }).sort((a, b) => a.passNumber - b.passNumber);
  }, [torqueEvents, torqueSpec.fastenerCount]);

  // Calculate overall statistics
  const overallStats = useMemo((): OverallStatistics => {
    if (torqueEvents.length === 0) {
      return {
        totalEvents: 0,
        completedBolts: 0,
        totalBolts: torqueSpec.fastenerCount,
        successRate: 0,
        averageTorque: 0,
        standardDeviation: 0,
        cpk: 0,
        outOfSpecCount: 0,
        reworkCount: 0,
        averageTime: 0
      };
    }

    const inSpecEvents = torqueEvents.filter(e => e.isInSpec);
    const outOfSpecEvents = torqueEvents.filter(e => !e.isInSpec);
    const reworkEvents = torqueEvents.filter(e => e.requiresRework);

    // Calculate torque statistics
    const torqueValues = torqueEvents.map(e => e.actualTorque);
    const averageTorque = torqueValues.reduce((sum, val) => sum + val, 0) / torqueValues.length;

    // Standard deviation
    const variance = torqueValues.reduce((sum, val) => sum + Math.pow(val - averageTorque, 2), 0) / torqueValues.length;
    const standardDeviation = Math.sqrt(variance);

    // Process capability index (Cpk)
    const upperLimit = torqueSpec.targetTorque + torqueSpec.tolerancePlus;
    const lowerLimit = torqueSpec.targetTorque - torqueSpec.toleranceMinus;
    const cpuUpper = (upperLimit - averageTorque) / (3 * standardDeviation);
    const cpkLower = (averageTorque - lowerLimit) / (3 * standardDeviation);
    const cpk = standardDeviation > 0 ? Math.min(cpuUpper, cpkLower) : 0;

    // Get unique bolt positions to count completed bolts
    const uniqueBolts = new Set(torqueEvents.map(e => e.boltPosition));

    return {
      totalEvents: torqueEvents.length,
      completedBolts: uniqueBolts.size,
      totalBolts: torqueSpec.fastenerCount,
      successRate: (inSpecEvents.length / torqueEvents.length) * 100,
      averageTorque,
      standardDeviation,
      cpk,
      outOfSpecCount: outOfSpecEvents.length,
      reworkCount: reworkEvents.length,
      averageTime: 0 // Would need timestamp data to calculate
    };
  }, [torqueEvents, torqueSpec]);

  // Get status color for values
  const getStatusColor = (value: number, target: number, tolerance: number): string => {
    const diff = Math.abs(value - target);
    if (diff <= tolerance) return 'text-green-600';
    if (diff <= tolerance * 1.5) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Format percentage
  const formatPercentage = (value: number): string => {
    return `${value.toFixed(1)}%`;
  };

  // Format torque value
  const formatTorque = (value: number): string => {
    return `${value.toFixed(2)} ${torqueSpec.torqueUnit}`;
  };

  return (
    <div className="space-y-4">
      {/* Overall Progress Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Overall Progress
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Main Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Sequence Completion</span>
              <span className="text-sm text-muted-foreground">
                {guidanceState.progress.completedSteps}/{guidanceState.progress.totalSteps} steps
              </span>
            </div>
            <Progress value={guidanceState.progress.overallPercent} className="h-3" />
            <div className="text-center text-sm font-medium">
              {formatPercentage(guidanceState.progress.overallPercent)}
            </div>
          </div>

          {/* Pass Progress */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Pass</span>
              <span className="text-sm text-muted-foreground">
                {guidanceState.progress.currentPass}/{guidanceState.progress.totalPasses}
              </span>
            </div>
            <Progress
              value={(guidanceState.progress.currentPass / guidanceState.progress.totalPasses) * 100}
              className="h-2"
            />
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-2xl font-bold text-green-600">
                  {overallStats.completedBolts}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <Target className="h-4 w-4 text-blue-500" />
                <span className="text-2xl font-bold">
                  {formatPercentage(overallStats.successRate)}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Success Rate</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <span className="text-2xl font-bold text-yellow-600">
                  {overallStats.outOfSpecCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Out of Spec</p>
            </div>

            <div className="text-center">
              <div className="flex items-center justify-center gap-1">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="text-2xl font-bold text-red-600">
                  {overallStats.reworkCount}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">Rework</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="passes" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="passes">Pass Breakdown</TabsTrigger>
          <TabsTrigger value="statistics">Statistics</TabsTrigger>
          <TabsTrigger value="events">Event Log</TabsTrigger>
        </TabsList>

        {/* Pass Breakdown Tab */}
        {showPassBreakdown && (
          <TabsContent value="passes">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Pass-by-Pass Progress
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {passStatistics.map(pass => (
                    <div key={pass.passNumber} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Pass {pass.passNumber}</Badge>
                          <span className="text-sm text-muted-foreground">
                            {formatTorque(pass.averageTorque)} avg
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm">
                            {pass.completedBolts}/{pass.totalBolts}
                          </span>
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-600">{pass.inSpecBolts}</span>
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <span className="text-sm text-yellow-600">{pass.outOfSpecBolts}</span>
                        </div>
                      </div>
                      <Progress value={pass.completionPercentage} className="h-2" />
                      <div className="text-xs text-muted-foreground flex justify-between">
                        <span>Min: {formatTorque(pass.minTorque)}</span>
                        <span>Max: {formatTorque(pass.maxTorque)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Statistics Tab */}
        {showDetailedStats && (
          <TabsContent value="statistics">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Statistical Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Process Statistics */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Process Statistics</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Average Torque:</span>
                        <span className={getStatusColor(overallStats.averageTorque, torqueSpec.targetTorque, torqueSpec.tolerancePlus)}>
                          {formatTorque(overallStats.averageTorque)}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Standard Deviation:</span>
                        <span>{formatTorque(overallStats.standardDeviation)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Process Capability (Cpk):</span>
                        <span className={overallStats.cpk >= 1.33 ? 'text-green-600' : overallStats.cpk >= 1.0 ? 'text-yellow-600' : 'text-red-600'}>
                          {overallStats.cpk.toFixed(3)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Target vs Actual */}
                  <div className="space-y-4">
                    <h4 className="font-semibold">Target vs Actual</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Target:</span>
                        <span>{formatTorque(torqueSpec.targetTorque)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Upper Limit:</span>
                        <span>{formatTorque(torqueSpec.targetTorque + torqueSpec.tolerancePlus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lower Limit:</span>
                        <span>{formatTorque(torqueSpec.targetTorque - torqueSpec.toleranceMinus)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Deviation:</span>
                        <span className={getStatusColor(overallStats.averageTorque, torqueSpec.targetTorque, torqueSpec.tolerancePlus)}>
                          {overallStats.averageTorque > 0 ?
                            formatPercentage(((overallStats.averageTorque - torqueSpec.targetTorque) / torqueSpec.targetTorque) * 100) :
                            '0.0%'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Event Log Tab */}
        <TabsContent value="events">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Torque Event Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Bolt</TableHead>
                    <TableHead>Pass</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Deviation</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {torqueEvents.slice().reverse().map(event => (
                    <TableRow
                      key={event.id}
                      className={onEventClick ? "cursor-pointer hover:bg-muted/50" : ""}
                      onClick={() => onEventClick?.(event)}
                    >
                      <TableCell className="text-sm">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">#{event.boltPosition}</Badge>
                      </TableCell>
                      <TableCell>{event.passNumber}</TableCell>
                      <TableCell>{formatTorque(event.targetTorque)}</TableCell>
                      <TableCell className={getStatusColor(event.actualTorque, event.targetTorque, torqueSpec.tolerancePlus)}>
                        {formatTorque(event.actualTorque)}
                      </TableCell>
                      <TableCell className={event.deviationPercent ? getStatusColor(Math.abs(event.deviationPercent), 0, 5) : ''}>
                        {event.deviationPercent ? formatPercentage(event.deviationPercent) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {event.isInSpec ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-800">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            In Spec
                          </Badge>
                        ) : event.requiresRework ? (
                          <Badge variant="destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            Rework
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Out of Spec
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TorqueProgress;