/**
 * NCR Workflow Components
 *
 * Collection of components for managing NCR workflow:
 * - State visualization and transitions
 * - Approval dashboard and queue management
 */

export { NCRStateVisualizer } from './NCRStateVisualizer';
export type { StateHistoryEntry, AvailableTransition } from './NCRStateVisualizer';

export { NCRApprovalDashboard } from './NCRApprovalDashboard';
export type { ApprovalRequest, ApprovalStatistics } from './NCRApprovalDashboard';
