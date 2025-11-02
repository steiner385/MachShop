/**
 * Manufacturing Operations Component Library
 *
 * Provides pre-built React components for manufacturing operations:
 * - Work Order Management
 * - Production Scheduling
 * - Quality Controls
 * - Time Tracking
 * - Material Handling
 * - Equipment Monitoring
 * - Batch/Lot Management
 */

// Work Order Management Components
export { WorkOrderForm } from './components/work-orders/WorkOrderForm';
export { WorkOrderStatusBadge } from './components/work-orders/WorkOrderStatusBadge';
export { WorkOrderList } from './components/work-orders/WorkOrderList';
export { WorkOrderTimeline } from './components/work-orders/WorkOrderTimeline';
export { OperationNavigator } from './components/work-orders/OperationNavigator';

// Production Scheduling Components
export { GanttChart } from './components/scheduling/GanttChart';
export { ScheduleView } from './components/scheduling/ScheduleView';
export { OperationSequencer } from './components/scheduling/OperationSequencer';
export { ResourceAllocationView } from './components/scheduling/ResourceAllocationView';
export { CapacityPlanner } from './components/scheduling/CapacityPlanner';

// Quality Control Components
export { QualityCheckForm } from './components/quality/QualityCheckForm';
export { MeasurementCapture } from './components/quality/MeasurementCapture';
export { AcceptanceRejectDialog } from './components/quality/AcceptanceRejectDialog';
export { NCRDashboard } from './components/quality/NCRDashboard';
export { SampleSelectionWidget } from './components/quality/SampleSelectionWidget';

// Time Tracking Components
export { ShiftClock } from './components/time-tracking/ShiftClock';
export { OperationTimeEntry } from './components/time-tracking/OperationTimeEntry';
export { BreakTracker } from './components/time-tracking/BreakTracker';
export { TimeSheetReview } from './components/time-tracking/TimeSheetReview';

// Material Handling Components
export { InventoryPicker } from './components/material-handling/InventoryPicker';
export { MaterialStaging } from './components/material-handling/MaterialStaging';
export { ConsumptionTracker } from './components/material-handling/ConsumptionTracker';
export { MaterialAllocationView } from './components/material-handling/MaterialAllocationView';

// Equipment Monitoring Components
export { EquipmentStatus } from './components/equipment/EquipmentStatus';
export { ParametersDisplay } from './components/equipment/ParametersDisplay';
export { MaintenanceAlerts } from './components/equipment/MaintenanceAlerts';
export { EquipmentHealthIndicator } from './components/equipment/EquipmentHealthIndicator';

// Batch/Lot Management Components
export { LotCreationForm } from './components/batch-lot/LotCreationForm';
export { SerializationTracker } from './components/batch-lot/SerializationTracker';
export { LotTrackingTimeline } from './components/batch-lot/LotTrackingTimeline';
export { BatchRecallManager } from './components/batch-lot/BatchRecallManager';

// Types
export * from './types';
