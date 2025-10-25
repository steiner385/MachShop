/**
 * Work Order Execution API
 * Handles production execution activities for operators
 */

import apiClient, { ApiResponse } from './client';
import { ProductionEntryValues as _ProductionEntryValues } from '@/components/WorkOrders/ProductionEntryForm';

export interface WorkOrderOperation {
  id: string;
  workOrderId: string;
  workOrderNumber?: string;
  operationNumber: number;
  operationName: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'ON_HOLD';
  assignedOperatorId?: string;
  assignedOperatorName?: string;
  orderedQuantity: number;
  completedQuantity: number;
  scrappedQuantity: number;
  reworkQuantity: number;
  startTime?: string;
  endTime?: string;
  workCenterId?: string;
  workCenterName?: string;
}

export interface StartOperationRequest {
  workOrderId: string;
  operationNumber: number;
  workCenterId?: string;
}

export interface StartOperationResponse {
  message: string;
  operation: WorkOrderOperation;
  startTime: string;
}

export interface RecordProductionRequest {
  workOrderId: string;
  operationNumber: number;
  type: 'complete' | 'scrap' | 'rework';
  quantity: number;
  scrapReasonCode?: string;
  reworkReasonCode?: string;
  notes?: string;
}

export interface RecordProductionResponse {
  message: string;
  operation: WorkOrderOperation;
  transaction: {
    id: string;
    type: string;
    quantity: number;
    timestamp: string;
  };
}

export interface CompleteOperationRequest {
  workOrderId: string;
  operationNumber: number;
  notes?: string;
}

export interface CompleteOperationResponse {
  message: string;
  operation: WorkOrderOperation;
  endTime: string;
}

export interface ReportIssueRequest {
  workOrderId: string;
  operationNumber: number;
  issueType: 'quality' | 'equipment' | 'material' | 'other';
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface ReportIssueResponse {
  message: string;
  issueId: string;
  createdAt: string;
}

/**
 * Start an operation
 */
export async function startOperation(
  request: StartOperationRequest
): Promise<StartOperationResponse> {
  return apiClient.post<StartOperationResponse, StartOperationResponse>(
    `/workorders/${request.workOrderId}/operations/${request.operationNumber}/start`,
    request
  );
}

/**
 * Record production (complete, scrap, or rework)
 */
export async function recordProduction(
  request: RecordProductionRequest
): Promise<RecordProductionResponse> {
  return apiClient.post<RecordProductionResponse, RecordProductionResponse>(
    `/workorders/${request.workOrderId}/operations/${request.operationNumber}/record`,
    request
  );
}

/**
 * Complete an operation
 */
export async function completeOperation(
  request: CompleteOperationRequest
): Promise<CompleteOperationResponse> {
  return apiClient.post<CompleteOperationResponse, CompleteOperationResponse>(
    `/workorders/${request.workOrderId}/operations/${request.operationNumber}/complete`,
    request
  );
}

/**
 * Report an issue (quality, equipment, etc.)
 */
export async function reportIssue(
  request: ReportIssueRequest
): Promise<ReportIssueResponse> {
  return apiClient.post<ReportIssueResponse, ReportIssueResponse>(
    `/workorders/${request.workOrderId}/operations/${request.operationNumber}/issues`,
    request
  );
}

/**
 * Get operation details
 */
export async function getOperation(
  workOrderId: string,
  operationNumber: number
): Promise<ApiResponse<WorkOrderOperation>> {
  return apiClient.get<ApiResponse<WorkOrderOperation>, ApiResponse<WorkOrderOperation>>(
    `/workorders/${workOrderId}/operations/${operationNumber}`
  );
}

/**
 * Get operations assigned to current operator
 */
export async function getMyAssignedOperations(): Promise<ApiResponse<WorkOrderOperation[]>> {
  return apiClient.get<ApiResponse<WorkOrderOperation[]>, ApiResponse<WorkOrderOperation[]>>(
    '/workorders/operations/my-assignments'
  );
}
