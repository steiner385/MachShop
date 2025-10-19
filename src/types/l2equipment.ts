/**
 * TypeScript Type Definitions for ISA-95 Level 2 (Equipment) Integration
 *
 * Supports:
 * - OPC UA equipment data collection
 * - MTConnect machine monitoring
 * - MQTT IoT device integration
 * - Equipment command/response protocol
 * - Material movement tracking through equipment
 * - Process data collection
 */

import {
  DataCollectionType,
  CommandType,
  CommandStatus,
} from '@prisma/client';

// ============================================================================
// Equipment Data Collection Types
// ============================================================================

export interface EquipmentDataPoint {
  dataPointName: string;
  dataPointId?: string; // OPC UA NodeId, MTConnect DataItemId
  value: number | string | boolean | object;
  unitOfMeasure?: string;
  quality?: 'GOOD' | 'BAD' | 'UNCERTAIN';
  timestamp: Date;
}

export interface CollectDataPointInput {
  equipmentId: string;
  dataCollectionType: DataCollectionType;
  dataPointName: string;
  dataPointId?: string;
  value: number | string | boolean | object;
  unitOfMeasure?: string;
  quality?: 'GOOD' | 'BAD' | 'UNCERTAIN';
  workOrderId?: string;
  operationId?: string;
  productionRunId?: string;
  equipmentState?: string;
  protocol?: 'OPC_UA' | 'MTCONNECT' | 'MQTT' | 'MODBUS' | 'REST';
  sourceAddress?: string;
}

export interface EquipmentDataCollectionRecord {
  id: string;
  equipmentId: string;
  dataCollectionType: DataCollectionType;
  collectionTimestamp: Date;
  dataPointName: string;
  dataPointId?: string;
  numericValue?: number;
  stringValue?: string;
  booleanValue?: boolean;
  jsonValue?: any;
  unitOfMeasure?: string;
  quality?: string;
  workOrderId?: string;
  operationId?: string;
  productionRunId?: string;
  equipmentState?: string;
  protocol?: string;
  sourceAddress?: string;
  createdAt: Date;
}

export interface QueryDataPointsInput {
  equipmentId?: string;
  dataPointName?: string;
  dataCollectionType?: DataCollectionType;
  workOrderId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface DataCollectionSummary {
  equipmentId: string;
  equipmentNumber: string;
  equipmentName: string;
  totalDataPoints: number;
  dataPointsByType: Record<DataCollectionType, number>;
  latestDataPoint?: EquipmentDataCollectionRecord;
  oldestDataPoint?: EquipmentDataCollectionRecord;
  period: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// Equipment Command Types
// ============================================================================

export interface IssueCommandInput {
  equipmentId: string;
  commandType: CommandType;
  commandName: string;
  commandPayload?: any;
  workOrderId?: string;
  operationId?: string;
  timeoutSeconds?: number;
  maxRetries?: number;
  priority?: number; // 1=highest, 10=lowest
  issuedBy: string;
}

export interface EquipmentCommandRecord {
  id: string;
  equipmentId: string;
  commandType: CommandType;
  commandStatus: CommandStatus;
  commandName: string;
  commandPayload?: any;
  workOrderId?: string;
  operationId?: string;
  issuedAt: Date;
  sentAt?: Date;
  acknowledgedAt?: Date;
  completedAt?: Date;
  responsePayload?: any;
  responseCode?: string;
  responseMessage?: string;
  timeoutSeconds: number;
  retryCount: number;
  maxRetries: number;
  priority: number;
  issuedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpdateCommandStatusInput {
  commandId: string;
  commandStatus: CommandStatus;
  responsePayload?: any;
  responseCode?: string;
  responseMessage?: string;
  sentAt?: Date;
  acknowledgedAt?: Date;
  completedAt?: Date;
}

export interface QueryCommandsInput {
  equipmentId?: string;
  commandType?: CommandType;
  commandStatus?: CommandStatus;
  workOrderId?: string;
  startDate?: Date;
  endDate?: Date;
  priority?: number;
  limit?: number;
}

export interface CommandExecutionSummary {
  equipmentId: string;
  equipmentNumber: string;
  equipmentName: string;
  totalCommands: number;
  commandsByType: Record<CommandType, number>;
  commandsByStatus: Record<CommandStatus, number>;
  averageExecutionTime: number; // milliseconds
  successRate: number; // percentage
  period: {
    start: Date;
    end: Date;
  };
}

// OPC UA Specific Types
export interface OPCUACommandMessage {
  methodId: string; // OPC UA method node ID
  inputArguments?: any[];
  objectId?: string; // Parent object node ID
}

export interface OPCUACommandResponse {
  statusCode: number;
  outputArguments?: any[];
  executionTime: number;
}

// MTConnect Specific Types
export interface MTConnectCommandMessage {
  deviceName: string;
  commandName: string;
  parameters?: Record<string, any>;
}

export interface MTConnectCommandResponse {
  result: 'SUCCESS' | 'FAIL';
  commandId: string;
  message?: string;
}

// MQTT Specific Types
export interface MQTTCommandMessage {
  topic: string;
  payload: any;
  qos?: 0 | 1 | 2;
  retain?: boolean;
}

export interface MQTTCommandResponse {
  acknowledged: boolean;
  messageId?: string;
  timestamp: Date;
}

// ============================================================================
// Material Movement Tracking Types
// ============================================================================

export interface RecordMaterialMovementInput {
  equipmentId: string;
  partId?: string;
  partNumber: string;
  lotNumber?: string;
  serialNumber?: string;
  movementType: 'LOAD' | 'UNLOAD' | 'CONSUME' | 'PRODUCE' | 'SCRAP' | 'TRANSFER';
  quantity: number;
  unitOfMeasure: string;
  workOrderId?: string;
  operationId?: string;
  fromLocation?: string;
  toLocation?: string;
  qualityStatus?: 'GOOD' | 'HOLD' | 'REJECT' | 'SCRAP';
  upstreamTraceId?: string;
  downstreamTraceId?: string;
  recordedBy: 'SYSTEM' | 'OPERATOR' | 'EQUIPMENT';
}

export interface EquipmentMaterialMovementRecord {
  id: string;
  equipmentId: string;
  partId?: string;
  partNumber: string;
  lotNumber?: string;
  serialNumber?: string;
  movementType: string;
  quantity: number;
  unitOfMeasure: string;
  movementTimestamp: Date;
  workOrderId?: string;
  operationId?: string;
  fromLocation?: string;
  toLocation?: string;
  qualityStatus?: string;
  upstreamTraceId?: string;
  downstreamTraceId?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface QueryMaterialMovementsInput {
  equipmentId?: string;
  partNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  movementType?: string;
  workOrderId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface MaterialMovementSummary {
  equipmentId: string;
  equipmentNumber: string;
  equipmentName: string;
  totalMovements: number;
  movementsByType: Record<string, number>;
  movementsByPart: Array<{
    partNumber: string;
    quantity: number;
    movements: number;
  }>;
  period: {
    start: Date;
    end: Date;
  };
}

export interface MaterialTraceabilityChain {
  movements: EquipmentMaterialMovementRecord[];
  upstreamChain: EquipmentMaterialMovementRecord[];
  downstreamChain: EquipmentMaterialMovementRecord[];
  totalQuantity: number;
  uniqueLots: string[];
  uniqueSerials: string[];
}

// ============================================================================
// Process Data Collection Types
// ============================================================================

export interface StartProcessDataCollectionInput {
  equipmentId: string;
  processName: string;
  processStepNumber?: number;
  workOrderId?: string;
  operationId?: string;
  partNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  parameters: Record<string, any>;
  operatorId?: string;
  supervisorId?: string;
}

export interface CompleteProcessDataCollectionInput {
  processDataCollectionId: string;
  endTimestamp: Date;
  quantityProduced?: number;
  quantityGood?: number;
  quantityScrap?: number;
  inSpecCount?: number;
  outOfSpecCount?: number;
  averageUtilization?: number;
  peakUtilization?: number;
  alarmCount?: number;
  criticalAlarmCount?: number;
  additionalParameters?: Record<string, any>;
}

export interface ProcessDataCollectionRecord {
  id: string;
  equipmentId: string;
  processName: string;
  processStepNumber?: number;
  startTimestamp: Date;
  endTimestamp?: Date;
  duration?: number;
  workOrderId?: string;
  operationId?: string;
  partNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  parameters: any;
  quantityProduced?: number;
  quantityGood?: number;
  quantityScrap?: number;
  inSpecCount?: number;
  outOfSpecCount?: number;
  averageUtilization?: number;
  peakUtilization?: number;
  alarmCount: number;
  criticalAlarmCount: number;
  operatorId?: string;
  supervisorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface QueryProcessDataInput {
  equipmentId?: string;
  processName?: string;
  workOrderId?: string;
  partNumber?: string;
  lotNumber?: string;
  serialNumber?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}

export interface ProcessDataSummary {
  equipmentId: string;
  equipmentNumber: string;
  equipmentName: string;
  processName: string;
  totalRuns: number;
  totalQuantityProduced: number;
  totalQuantityGood: number;
  totalQuantityScrap: number;
  yieldPercentage: number;
  averageCycleTime: number; // seconds
  averageUtilization: number;
  totalAlarms: number;
  totalCriticalAlarms: number;
  period: {
    start: Date;
    end: Date;
  };
}

export interface ProcessParameterTrend {
  parameterName: string;
  dataPoints: Array<{
    timestamp: Date;
    value: any;
    processDataCollectionId: string;
  }>;
  statistics: {
    min?: number;
    max?: number;
    average?: number;
    stdDev?: number;
  };
}

// ============================================================================
// Equipment State and Status Types
// ============================================================================

export interface EquipmentStatus {
  equipmentId: string;
  equipmentNumber: string;
  equipmentName: string;
  currentState: string;
  stateChangedAt: Date;
  isOnline: boolean;
  lastDataPointTimestamp?: Date;
  lastCommandTimestamp?: Date;
  activeWorkOrderId?: string;
  activeWorkOrderNumber?: string;
  currentUtilization?: number;
  oee?: number;
}

export interface EquipmentHealthMetrics {
  equipmentId: string;
  equipmentNumber: string;
  equipmentName: string;
  availability: number; // percentage
  performance: number; // percentage
  quality: number; // percentage
  oee: number; // percentage
  mtbf?: number; // Mean Time Between Failures (hours)
  mttr?: number; // Mean Time To Repair (hours)
  totalAlarms: number;
  criticalAlarms: number;
  period: {
    start: Date;
    end: Date;
  };
}

// ============================================================================
// Real-time Equipment Monitoring Types
// ============================================================================

export interface EquipmentMonitoringSnapshot {
  equipmentId: string;
  equipmentNumber: string;
  equipmentName: string;
  timestamp: Date;
  state: string;
  workOrderId?: string;
  workOrderNumber?: string;
  currentDataPoints: EquipmentDataPoint[];
  recentCommands: EquipmentCommandRecord[];
  recentMovements: EquipmentMaterialMovementRecord[];
  activeProcesses: ProcessDataCollectionRecord[];
  healthMetrics: EquipmentHealthMetrics;
}

export interface AlarmEvent {
  equipmentId: string;
  equipmentNumber: string;
  alarmCode: string;
  alarmMessage: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  timestamp: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  clearedAt?: Date;
}

// ============================================================================
// Integration Protocol Types
// ============================================================================

export interface OPCUADataPoint {
  nodeId: string;
  displayName: string;
  value: any;
  dataType: string;
  statusCode: number;
  sourceTimestamp: Date;
  serverTimestamp: Date;
}

export interface MTConnectDataItem {
  dataItemId: string;
  name: string;
  type: string;
  subType?: string;
  category: 'SAMPLE' | 'EVENT' | 'CONDITION';
  value: any;
  timestamp: Date;
  sequence: number;
}

export interface MQTTDataMessage {
  topic: string;
  payload: any;
  qos: 0 | 1 | 2;
  retain: boolean;
  timestamp: Date;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface DataCollectionResponse {
  success: boolean;
  message: string;
  data: EquipmentDataCollectionRecord;
}

export interface CommandResponse {
  success: boolean;
  message: string;
  data: EquipmentCommandRecord;
}

export interface MaterialMovementResponse {
  success: boolean;
  message: string;
  data: EquipmentMaterialMovementRecord;
}

export interface ProcessDataResponse {
  success: boolean;
  message: string;
  data: ProcessDataCollectionRecord;
}

export interface QueryResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page?: number;
  limit?: number;
}

export interface SummaryResponse<T> {
  success: boolean;
  data: T;
}
