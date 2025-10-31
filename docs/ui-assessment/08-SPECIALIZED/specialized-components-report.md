# Specialized Component Analysis Report

## Executive Summary

**Analysis Date**: 2025-10-31T16:42:15.648Z
**Files Analyzed**: 313
**Specialized Components Found**: 515

### Component Distribution
- **ReactFlow Components**: 84
- **D3 Visualizations**: 156
- **Monaco Editor**: 1
- **Lexical Editor**: 5
- **Chart Components**: 161
- **Complex Forms**: 67
- **Virtualization**: 2
- **Drag & Drop**: 39

### Issue Summary
- **Critical Issues**: 0
- **Accessibility Issues**: 843
- **Performance Issues**: 2

## Detailed Findings

### 1. ReactFlow Components (84 found)

**Components Found:**
- **__tests__/components/Staging/StagingStatusBoard.test.tsx** (Complexity: 10, Lines: 649)
- **api/auth.ts** (Complexity: 0, Lines: 181)
- **api/client.ts** (Complexity: 1, Lines: 81)
- **api/parts.ts** (Complexity: 0, Lines: 119)
- **api/presence.ts** (Complexity: 0, Lines: 131)
- **api/routing.ts** (Complexity: 7, Lines: 394)
- **api/workOrderExecution.ts** (Complexity: 35, Lines: 155)
- **components/Approvals/ApprovalTaskDetail.tsx** (Complexity: 60, Lines: 811)
- **components/Approvals/ApprovalTaskQueue.tsx** (Complexity: 60, Lines: 749)
- **components/Approvals/RejectModal.tsx** (Complexity: 15, Lines: 193)
- **components/Collaboration/ActivityFeed.tsx** (Complexity: 31, Lines: 437)
- **components/Collaboration/AnnotationCanvas.tsx** (Complexity: 80, Lines: 727)
- **components/Collaboration/CollaborationPanel.tsx** (Complexity: 41, Lines: 267)
- **components/Collaboration/CommentThread.tsx** (Complexity: 100, Lines: 541)
- **components/Collaboration/ConflictResolution.tsx** (Complexity: 53, Lines: 495)
- **components/Collaboration/NotificationCenter.tsx** (Complexity: 87, Lines: 554)
- **components/Collaboration/ReviewDashboard.tsx** (Complexity: 53, Lines: 712)
- **components/Common/UUIDDisplay.tsx** (Complexity: 13, Lines: 281)
- **components/Equipment/MaintenanceList.tsx** (Complexity: 38, Lines: 574)
- **components/Execution/ConfigurableExecutionLayout.tsx** (Complexity: 69, Lines: 343)
- **components/Execution/KeyboardShortcutHandler.tsx** (Complexity: 10, Lines: 56)
- **components/Execution/LayoutPreferenceModal.tsx** (Complexity: 11, Lines: 99)
- **components/Execution/__tests__/LayoutPreferenceModal.test.tsx** (Complexity: 9, Lines: 516)
- **components/Execution/layouts/SplitScreenLayout.tsx** (Complexity: 68, Lines: 321)
- **components/Execution/panels/DataCollectionPanel.tsx** (Complexity: 47, Lines: 373)
- **components/Execution/panels/InstructionPanel.tsx** (Complexity: 31, Lines: 276)
- **components/FAI/CMMImportModal.tsx** (Complexity: 43, Lines: 489)
- **components/Kits/KitAnalyticsDashboard.tsx** (Complexity: 63, Lines: 750)
- **components/Kits/KitReportGenerator.tsx** (Complexity: 42, Lines: 859)
- **components/Kits/KitsList.tsx** (Complexity: 53, Lines: 700)
- **components/Layout/MainLayout.tsx** (Complexity: 9, Lines: 571)
- **components/Materials/MaterialsList.tsx** (Complexity: 42, Lines: 535)
- **components/Parameters/DependencyVisualizer.tsx** (Complexity: 39, Lines: 477)
- **components/Personnel/PersonnelList.tsx** (Complexity: 30, Lines: 357)
- **components/Routing/ConnectionEditor.tsx** (Complexity: 23, Lines: 306)
- **components/Routing/DependencyGraph.tsx** (Complexity: 14, Lines: 319)
- **components/Routing/DraggableStepsTable.tsx** (Complexity: 20, Lines: 298)
- **components/Routing/RoutingDetail.tsx** (Complexity: 48, Lines: 837)
- **components/Routing/RoutingForm.tsx** (Complexity: 63, Lines: 679)
- **components/Routing/RoutingList.tsx** (Complexity: 35, Lines: 422)
- **components/Routing/RoutingStepNode.tsx** (Complexity: 5, Lines: 296)
- **components/Routing/RoutingTemplateLibrary.tsx** (Complexity: 37, Lines: 331)
- **components/Routing/VisualRoutingEditor.tsx** (Complexity: 73, Lines: 467)
- **components/SPC/SPCConfiguration.tsx** (Complexity: 40, Lines: 505)
- **components/Scheduling/ScheduleDetail.tsx** (Complexity: 35, Lines: 709)
- **components/Scheduling/SchedulingList.tsx** (Complexity: 38, Lines: 514)
- **components/Search/GlobalSearch.tsx** (Complexity: 45, Lines: 343)
- **components/Signatures/BiometricCapture.tsx** (Complexity: 29, Lines: 307)
- **components/Signatures/SignatureModal.tsx** (Complexity: 27, Lines: 414)
- **components/Site/SiteSelector.tsx** (Complexity: 2, Lines: 185)
- **components/Staging/StagingStatusBoard.tsx** (Complexity: 41, Lines: 567)
- **components/Torque/DigitalWrenchConnection.tsx** (Complexity: 93, Lines: 451)
- **components/Torque/TorqueSequenceVisualization.tsx** (Complexity: 47, Lines: 497)
- **components/WorkInstructions/DataCollectionFormBuilder.tsx** (Complexity: 86, Lines: 809)
- **components/WorkInstructions/DocumentExporter.tsx** (Complexity: 48, Lines: 853)
- **components/WorkInstructions/MediaLibraryBrowser.tsx** (Complexity: 100, Lines: 965)
- **components/WorkInstructions/NativeInstructionEditor.tsx** (Complexity: 79, Lines: 928)
- **components/WorkInstructions/RichTextEditor.tsx** (Complexity: 19, Lines: 234)
- **components/WorkInstructions/TabletExecutionView.tsx** (Complexity: 42, Lines: 443)
- **components/WorkInstructions/TemplateLibrary.tsx** (Complexity: 22, Lines: 381)
- **components/WorkInstructions/WorkInstructionForm.tsx** (Complexity: 54, Lines: 469)
- **components/WorkInstructions/WorkInstructionList.tsx** (Complexity: 31, Lines: 320)
- **components/WorkInstructions/WorkInstructionStepEditor.tsx** (Complexity: 59, Lines: 548)
- **components/WorkInstructions/plugins/ImagePlugin.tsx** (Complexity: 28, Lines: 363)
- **components/WorkInstructions/plugins/VideoPlugin.tsx** (Complexity: 31, Lines: 489)
- **config/demoCredentials.ts** (Complexity: 0, Lines: 439)
- **hooks/__tests__/useRealTimeCollaboration.test.tsx** (Complexity: 34, Lines: 801)
- **hooks/useRealTimeCollaboration.ts** (Complexity: 100, Lines: 378)
- **pages/Dashboard/Dashboard.tsx** (Complexity: 44, Lines: 652)
- **pages/Documents/DocumentsPage.tsx** (Complexity: 38, Lines: 327)
- **pages/FAI/FAICreatePage.tsx** (Complexity: 15, Lines: 212)
- **pages/FAI/FAIDetailPage.tsx** (Complexity: 31, Lines: 520)
- **pages/FAI/FAIListPage.tsx** (Complexity: 25, Lines: 271)
- **pages/Signatures/SignatureAuditPage.tsx** (Complexity: 35, Lines: 460)
- **pages/Sprint3Demo/Sprint3Demo.tsx** (Complexity: 13, Lines: 259)
- **pages/Traceability/Traceability.tsx** (Complexity: 50, Lines: 624)
- **pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx** (Complexity: 49, Lines: 384)
- **pages/WorkInstructions/WorkInstructionDetailPage.tsx** (Complexity: 32, Lines: 438)
- **services/apiClient.ts** (Complexity: 35, Lines: 317)
- **services/realTimeCollaboration.ts** (Complexity: 23, Lines: 316)
- **store/executionLayoutStore.ts** (Complexity: 100, Lines: 592)
- **store/routingStore.ts** (Complexity: 18, Lines: 759)
- **utils/apiErrorHandler.ts** (Complexity: 3, Lines: 172)
- **utils/csrfManager.ts** (Complexity: 0, Lines: 187)

**Common Patterns:**
- `Handle`: 230 uses
- `Position\.`: 13 uses
- `onNodesChange|onEdgesChange`: 12 uses
- `ReactFlowProvider`: 4 uses
- `nodeTypes|edgeTypes`: 3 uses

**Issues Found:**
- **__tests__/components/Staging/StagingStatusBoard.test.tsx**: 1 concerns
- **api/auth.ts**: 1 concerns
- **api/client.ts**: 1 concerns
- **api/parts.ts**: 1 concerns
- **api/presence.ts**: 1 concerns
- **api/routing.ts**: 1 concerns
- **api/workOrderExecution.ts**: 1 concerns
- **components/Approvals/ApprovalTaskDetail.tsx**: 2 concerns
- **components/Approvals/ApprovalTaskQueue.tsx**: 2 concerns
- **components/Approvals/RejectModal.tsx**: 1 concerns
- **components/Collaboration/ActivityFeed.tsx**: 2 concerns
- **components/Collaboration/AnnotationCanvas.tsx**: 2 concerns
- **components/Collaboration/CollaborationPanel.tsx**: 2 concerns
- **components/Collaboration/CommentThread.tsx**: 2 concerns
- **components/Collaboration/ConflictResolution.tsx**: 2 concerns
- **components/Collaboration/NotificationCenter.tsx**: 2 concerns
- **components/Collaboration/ReviewDashboard.tsx**: 2 concerns
- **components/Common/UUIDDisplay.tsx**: 2 concerns
- **components/Equipment/MaintenanceList.tsx**: 2 concerns
- **components/Execution/ConfigurableExecutionLayout.tsx**: 2 concerns
- **components/Execution/KeyboardShortcutHandler.tsx**: 1 concerns
- **components/Execution/LayoutPreferenceModal.tsx**: 2 concerns
- **components/Execution/panels/DataCollectionPanel.tsx**: 2 concerns
- **components/Execution/panels/InstructionPanel.tsx**: 2 concerns
- **components/FAI/CMMImportModal.tsx**: 2 concerns
- **components/Kits/KitAnalyticsDashboard.tsx**: 2 concerns
- **components/Kits/KitReportGenerator.tsx**: 2 concerns
- **components/Kits/KitsList.tsx**: 2 concerns
- **components/Layout/MainLayout.tsx**: 1 concerns
- **components/Materials/MaterialsList.tsx**: 2 concerns
- **components/Parameters/DependencyVisualizer.tsx**: 3 concerns
- **components/Personnel/PersonnelList.tsx**: 2 concerns
- **components/Routing/ConnectionEditor.tsx**: 1 concerns
- **components/Routing/DependencyGraph.tsx**: 2 concerns
- **components/Routing/DraggableStepsTable.tsx**: 1 concerns
- **components/Routing/RoutingDetail.tsx**: 2 concerns
- **components/Routing/RoutingForm.tsx**: 3 concerns
- **components/Routing/RoutingList.tsx**: 2 concerns
- **components/Routing/RoutingStepNode.tsx**: 2 concerns
- **components/Routing/RoutingTemplateLibrary.tsx**: 2 concerns
- **components/Routing/VisualRoutingEditor.tsx**: 5 concerns
- **components/SPC/SPCConfiguration.tsx**: 2 concerns
- **components/Scheduling/ScheduleDetail.tsx**: 2 concerns
- **components/Scheduling/SchedulingList.tsx**: 2 concerns
- **components/Search/GlobalSearch.tsx**: 2 concerns
- **components/Signatures/BiometricCapture.tsx**: 2 concerns
- **components/Signatures/SignatureModal.tsx**: 2 concerns
- **components/Site/SiteSelector.tsx**: 1 concerns
- **components/Staging/StagingStatusBoard.tsx**: 2 concerns
- **components/Torque/DigitalWrenchConnection.tsx**: 2 concerns
- **components/Torque/TorqueSequenceVisualization.tsx**: 2 concerns
- **components/WorkInstructions/DataCollectionFormBuilder.tsx**: 2 concerns
- **components/WorkInstructions/DocumentExporter.tsx**: 2 concerns
- **components/WorkInstructions/MediaLibraryBrowser.tsx**: 2 concerns
- **components/WorkInstructions/NativeInstructionEditor.tsx**: 2 concerns
- **components/WorkInstructions/TabletExecutionView.tsx**: 2 concerns
- **components/WorkInstructions/TemplateLibrary.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionForm.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionList.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionStepEditor.tsx**: 2 concerns
- **components/WorkInstructions/plugins/ImagePlugin.tsx**: 1 concerns
- **components/WorkInstructions/plugins/VideoPlugin.tsx**: 2 concerns
- **config/demoCredentials.ts**: 1 concerns
- **hooks/__tests__/useRealTimeCollaboration.test.tsx**: 1 concerns
- **hooks/useRealTimeCollaboration.ts**: 1 concerns
- **pages/Dashboard/Dashboard.tsx**: 2 concerns
- **pages/Documents/DocumentsPage.tsx**: 2 concerns
- **pages/FAI/FAICreatePage.tsx**: 2 concerns
- **pages/FAI/FAIDetailPage.tsx**: 2 concerns
- **pages/FAI/FAIListPage.tsx**: 2 concerns
- **pages/Signatures/SignatureAuditPage.tsx**: 2 concerns
- **pages/Sprint3Demo/Sprint3Demo.tsx**: 2 concerns
- **pages/Traceability/Traceability.tsx**: 2 concerns
- **pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx**: 2 concerns
- **pages/WorkInstructions/WorkInstructionDetailPage.tsx**: 2 concerns
- **services/apiClient.ts**: 1 concerns
- **services/realTimeCollaboration.ts**: 1 concerns
- **store/executionLayoutStore.ts**: 1 concerns
- **store/routingStore.ts**: 1 concerns
- **utils/apiErrorHandler.ts**: 1 concerns
- **utils/csrfManager.ts**: 1 concerns

### 2. D3 Visualizations (156 found)

**Components Found:**
- **__tests__/components/Kits/KitAnalyticsDashboard.test.tsx** (Complexity: 3, Lines: 716)
- **__tests__/components/Kits/KitCostAnalysis.test.tsx** (Complexity: 4, Lines: 613)
- **__tests__/components/Kits/KitReportGenerator.test.tsx** (Complexity: 0, Lines: 693)
- **__tests__/components/Staging/StagingLocationUtilization.test.tsx** (Complexity: 60, Lines: 752)
- **api/kits.ts** (Complexity: 25, Lines: 348)
- **api/parts.ts** (Complexity: 0, Lines: 119)
- **api/rbac.ts** (Complexity: 33, Lines: 335)
- **api/routing.ts** (Complexity: 7, Lines: 394)
- **api/routingTemplates.ts** (Complexity: 0, Lines: 194)
- **api/workInstructions.ts** (Complexity: 21, Lines: 335)
- **components/Admin/AzureAD/AzureADConfig.tsx** (Complexity: 51, Lines: 563)
- **components/Admin/AzureAD/AzureADDashboard.tsx** (Complexity: 22, Lines: 450)
- **components/Admin/AzureAD/UserSyncManager.tsx** (Complexity: 40, Lines: 568)
- **components/Admin/AzureADConfig.tsx** (Complexity: 48, Lines: 610)
- **components/Admin/AzureADDashboard.tsx** (Complexity: 26, Lines: 343)
- **components/Admin/UserSyncManager.tsx** (Complexity: 49, Lines: 584)
- **components/Approvals/ApprovalTaskDetail.tsx** (Complexity: 60, Lines: 811)
- **components/Approvals/ApprovalTaskQueue.tsx** (Complexity: 60, Lines: 749)
- **components/Approvals/RejectModal.tsx** (Complexity: 15, Lines: 193)
- **components/Approvals/WorkflowProgressEnhanced.tsx** (Complexity: 41, Lines: 909)
- **components/Approvals/WorkflowStatus.tsx** (Complexity: 5, Lines: 253)
- **components/BuildRecords/BuildBookGenerator.tsx** (Complexity: 42, Lines: 787)
- **components/BuildRecords/BuildRecordDetail.tsx** (Complexity: 40, Lines: 847)
- **components/BuildRecords/BuildRecordList.tsx** (Complexity: 66, Lines: 879)
- **components/BuildRecords/BuildRecordOperationSignOff.tsx** (Complexity: 58, Lines: 600)
- **components/BuildRecords/DeviationTracker.tsx** (Complexity: 74, Lines: 763)
- **components/BuildRecords/PhotoCaptureModal.tsx** (Complexity: 80, Lines: 740)
- **components/Collaboration/CollaborationPanel.tsx** (Complexity: 41, Lines: 267)
- **components/Collaboration/CommentThread.tsx** (Complexity: 100, Lines: 541)
- **components/Collaboration/ConflictResolution.tsx** (Complexity: 53, Lines: 495)
- **components/Collaboration/ReviewDashboard.tsx** (Complexity: 53, Lines: 712)
- **components/Collaboration/__tests__/CommentThread.test.tsx** (Complexity: 14, Lines: 357)
- **components/Collaboration/withCollaboration.tsx** (Complexity: 66, Lines: 395)
- **components/Dashboard/OEEMetricsCard.tsx** (Complexity: 18, Lines: 387)
- **components/ECO/ECODashboard.tsx** (Complexity: 39, Lines: 664)
- **components/ECO/ECOForm.tsx** (Complexity: 36, Lines: 656)
- **components/Equipment/MaintenanceList.tsx** (Complexity: 38, Lines: 574)
- **components/Execution/ConfigurableExecutionLayout.tsx** (Complexity: 69, Lines: 343)
- **components/Execution/LayoutPreferenceModal.tsx** (Complexity: 11, Lines: 99)
- **components/Execution/__tests__/LayoutPreferenceModal.test.tsx** (Complexity: 9, Lines: 516)
- **components/Execution/layouts/OverlayLayout.tsx** (Complexity: 12, Lines: 64)
- **components/Execution/layouts/PictureInPictureLayout.tsx** (Complexity: 10, Lines: 45)
- **components/Execution/layouts/SplitScreenLayout.tsx** (Complexity: 68, Lines: 321)
- **components/Execution/layouts/TabbedLayout.tsx** (Complexity: 13, Lines: 62)
- **components/Execution/panels/DataCollectionPanel.tsx** (Complexity: 47, Lines: 373)
- **components/Execution/panels/InstructionPanel.tsx** (Complexity: 31, Lines: 276)
- **components/FAI/CMMImportModal.tsx** (Complexity: 43, Lines: 489)
- **components/Kits/KitAnalyticsDashboard.tsx** (Complexity: 63, Lines: 750)
- **components/Kits/KitCostAnalysis.tsx** (Complexity: 33, Lines: 845)
- **components/Kits/KitForm.tsx** (Complexity: 58, Lines: 632)
- **components/Kits/KitReportGenerator.tsx** (Complexity: 42, Lines: 859)
- **components/Kits/KitsList.tsx** (Complexity: 53, Lines: 700)
- **components/LLP/LLPAlertManagement.tsx** (Complexity: 86, Lines: 988)
- **components/LLP/LLPConfigurationForm.tsx** (Complexity: 63, Lines: 859)
- **components/LLP/LLPDashboard.tsx** (Complexity: 28, Lines: 696)
- **components/LLP/LLPDetailView.tsx** (Complexity: 47, Lines: 978)
- **components/LLP/LLPLifeEventForm.tsx** (Complexity: 74, Lines: 884)
- **components/Layout/__tests__/MainLayout.test.tsx** (Complexity: 0, Lines: 244)
- **components/Materials/MaterialsList.tsx** (Complexity: 42, Lines: 535)
- **components/Navigation/__tests__/Breadcrumbs.test.tsx** (Complexity: 0, Lines: 431)
- **components/Parameters/DependencyVisualizer.tsx** (Complexity: 39, Lines: 477)
- **components/Parameters/FormulaBuilder.tsx** (Complexity: 77, Lines: 786)
- **components/Parameters/ParameterGroupsTree.tsx** (Complexity: 67, Lines: 768)
- **components/Parameters/ParameterLimitsEditor.tsx** (Complexity: 44, Lines: 485)
- **components/Personnel/PersonnelList.tsx** (Complexity: 30, Lines: 357)
- **components/Routing/ActiveUsersIndicator.tsx** (Complexity: 0, Lines: 245)
- **components/Routing/ConnectionEditor.tsx** (Complexity: 23, Lines: 306)
- **components/Routing/DependencyGraph.tsx** (Complexity: 14, Lines: 319)
- **components/Routing/DraggableStepsTable.tsx** (Complexity: 20, Lines: 298)
- **components/Routing/RoutingChangedAlert.tsx** (Complexity: 10, Lines: 175)
- **components/Routing/RoutingDetail.tsx** (Complexity: 48, Lines: 837)
- **components/Routing/RoutingForm.tsx** (Complexity: 63, Lines: 679)
- **components/Routing/RoutingList.tsx** (Complexity: 35, Lines: 422)
- **components/Routing/RoutingPalette.tsx** (Complexity: 22, Lines: 374)
- **components/Routing/RoutingStepNode.tsx** (Complexity: 2, Lines: 296)
- **components/Routing/StepBuilderModal.tsx** (Complexity: 49, Lines: 470)
- **components/Routing/VersionConflictModal.tsx** (Complexity: 35, Lines: 215)
- **components/SPC/CapabilityReport.tsx** (Complexity: 9, Lines: 413)
- **components/SPC/RuleViolationAlert.tsx** (Complexity: 58, Lines: 514)
- **components/SPC/SPCConfiguration.tsx** (Complexity: 40, Lines: 505)
- **components/Scheduling/ScheduleDetail.tsx** (Complexity: 35, Lines: 709)
- **components/Scheduling/SchedulingList.tsx** (Complexity: 38, Lines: 514)
- **components/Search/__tests__/GlobalSearch.test.tsx** (Complexity: 7, Lines: 878)
- **components/Signatures/SignatureModal.tsx** (Complexity: 27, Lines: 414)
- **components/Site/SiteSelector.tsx** (Complexity: 2, Lines: 185)
- **components/Site/__tests__/SiteSelector.test.tsx** (Complexity: 2, Lines: 633)
- **components/Staging/StagingDashboard.tsx** (Complexity: 58, Lines: 561)
- **components/Staging/StagingLocationUtilization.tsx** (Complexity: 100, Lines: 849)
- **components/Staging/StagingStatusBoard.tsx** (Complexity: 41, Lines: 567)
- **components/TimeTracking/MobileTimeTracker.tsx** (Complexity: 67, Lines: 832)
- **components/TimeTracking/SupervisorApprovalDashboard.tsx** (Complexity: 56, Lines: 934)
- **components/TimeTracking/TimeClockKiosk.tsx** (Complexity: 71, Lines: 812)
- **components/TimeTracking/TimeEntryHistory.tsx** (Complexity: 30, Lines: 618)
- **components/TimeTracking/TimeEntryManagement.tsx** (Complexity: 64, Lines: 705)
- **components/TimeTracking/TimeTrackingWidget.tsx** (Complexity: 72, Lines: 777)
- **components/TimeTracking/TimeTypeIndicator.tsx** (Complexity: 6, Lines: 337)
- **components/Torque/DigitalWrenchConnection.tsx** (Complexity: 93, Lines: 451)
- **components/Torque/TorqueProgress.tsx** (Complexity: 18, Lines: 463)
- **components/Torque/TorqueSequenceVisualization.tsx** (Complexity: 47, Lines: 497)
- **components/Torque/TorqueValidationDisplay.tsx** (Complexity: 62, Lines: 533)
- **components/Traceability/GenealogyTreeVisualization.tsx** (Complexity: 50, Lines: 379)
- **components/WorkInstructions/DataCollectionFormBuilder.tsx** (Complexity: 86, Lines: 809)
- **components/WorkInstructions/DocumentExporter.tsx** (Complexity: 48, Lines: 853)
- **components/WorkInstructions/DocumentImporter.tsx** (Complexity: 50, Lines: 782)
- **components/WorkInstructions/MediaLibraryBrowser.tsx** (Complexity: 100, Lines: 965)
- **components/WorkInstructions/NativeInstructionEditor.tsx** (Complexity: 79, Lines: 928)
- **components/WorkInstructions/ProgressIndicator.tsx** (Complexity: 0, Lines: 113)
- **components/WorkInstructions/RichTextEditor.tsx** (Complexity: 19, Lines: 234)
- **components/WorkInstructions/StepNavigation.tsx** (Complexity: 26, Lines: 144)
- **components/WorkInstructions/TabletExecutionView.tsx** (Complexity: 42, Lines: 443)
- **components/WorkInstructions/TemplateLibrary.tsx** (Complexity: 22, Lines: 381)
- **components/WorkInstructions/WorkInstructionList.tsx** (Complexity: 31, Lines: 320)
- **components/WorkInstructions/WorkInstructionStepEditor.tsx** (Complexity: 59, Lines: 548)
- **components/WorkInstructions/__tests__/ProgressIndicator.test.tsx** (Complexity: 2, Lines: 373)
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx** (Complexity: 21, Lines: 624)
- **components/WorkInstructions/plugins/ImagePlugin.tsx** (Complexity: 25, Lines: 363)
- **components/WorkInstructions/plugins/VideoPlugin.tsx** (Complexity: 28, Lines: 489)
- **components/WorkOrders/OperatorAssignment.tsx** (Complexity: 29, Lines: 201)
- **components/WorkOrders/WorkOrderPriorityChange.tsx** (Complexity: 17, Lines: 204)
- **components/WorkOrders/WorkOrderReschedule.tsx** (Complexity: 14, Lines: 221)
- **pages/Admin/AdminPage.tsx** (Complexity: 19, Lines: 320)
- **pages/Admin/AzureADPage.tsx** (Complexity: 9, Lines: 138)
- **pages/Admin/PermissionCatalogPage.tsx** (Complexity: 99, Lines: 615)
- **pages/Admin/RBACDashboardPage.tsx** (Complexity: 4, Lines: 452)
- **pages/Admin/RoleManagementPage.tsx** (Complexity: 61, Lines: 679)
- **pages/Admin/UserRoleAssignmentPage.tsx** (Complexity: 63, Lines: 896)
- **pages/Dashboard/Dashboard.tsx** (Complexity: 44, Lines: 652)
- **pages/Documents/DocumentsPage.tsx** (Complexity: 38, Lines: 327)
- **pages/FAI/FAIDetailPage.tsx** (Complexity: 31, Lines: 520)
- **pages/FAI/FAIListPage.tsx** (Complexity: 25, Lines: 271)
- **pages/Integration/IntegrationConfig.tsx** (Complexity: 45, Lines: 665)
- **pages/Integration/IntegrationLogs.tsx** (Complexity: 49, Lines: 549)
- **pages/Kits/KitAnalyticsPage.tsx** (Complexity: 17, Lines: 292)
- **pages/Operations/OperationCreatePage.tsx** (Complexity: 25, Lines: 347)
- **pages/Production/TeamWorkQueue.tsx** (Complexity: 15, Lines: 229)
- **pages/Quality/InspectionDetail.tsx** (Complexity: 18, Lines: 105)
- **pages/Quality/Inspections.tsx** (Complexity: 39, Lines: 438)
- **pages/Quality/NCRDetail.tsx** (Complexity: 13, Lines: 122)
- **pages/Quality/NCRs.tsx** (Complexity: 37, Lines: 542)
- **pages/Settings/SettingsPage.tsx** (Complexity: 0, Lines: 183)
- **pages/Signatures/SignatureAuditPage.tsx** (Complexity: 35, Lines: 460)
- **pages/Traceability/Traceability.tsx** (Complexity: 50, Lines: 624)
- **pages/Traceability/TraceabilityDetailPage.tsx** (Complexity: 10, Lines: 172)
- **pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx** (Complexity: 49, Lines: 384)
- **pages/WorkInstructions/WorkInstructionDetailPage.tsx** (Complexity: 32, Lines: 438)
- **pages/WorkOrders/WorkOrderDetails.tsx** (Complexity: 32, Lines: 381)
- **pages/WorkOrders/WorkOrderExecution.tsx** (Complexity: 73, Lines: 445)
- **pages/WorkOrders/WorkOrders.tsx** (Complexity: 53, Lines: 522)
- **services/workOrderApi.ts** (Complexity: 8, Lines: 249)
- **store/executionLayoutStore.ts** (Complexity: 100, Lines: 592)
- **tests/components/BuildRecordDetail.test.tsx** (Complexity: 5, Lines: 692)
- **tests/components/PhotoCaptureModal.test.tsx** (Complexity: 10, Lines: 541)
- **tests/components/TimeTypeIndicator.test.tsx** (Complexity: 0, Lines: 279)
- **tests/integration/workInstructions.test.tsx** (Complexity: 40, Lines: 459)
- **types/kits.ts** (Complexity: 26, Lines: 411)
- **types/search.ts** (Complexity: 3, Lines: 235)

**Common Patterns:**
- `zoom|pan`: 1175 uses
- `\.append\(|\.remove\(`: 82 uses
- `svg`: 29 uses
- `\.attr\(|\.style\(`: 24 uses
- `d3\.`: 14 uses

**Issues Found:**
- **__tests__/components/Kits/KitCostAnalysis.test.tsx**: 1 concerns
- **__tests__/components/Staging/StagingLocationUtilization.test.tsx**: 1 concerns
- **api/kits.ts**: 1 concerns
- **api/parts.ts**: 1 concerns
- **api/rbac.ts**: 1 concerns
- **api/routing.ts**: 1 concerns
- **api/routingTemplates.ts**: 1 concerns
- **api/workInstructions.ts**: 1 concerns
- **components/Admin/AzureAD/AzureADConfig.tsx**: 2 concerns
- **components/Admin/AzureAD/AzureADDashboard.tsx**: 2 concerns
- **components/Admin/AzureAD/UserSyncManager.tsx**: 2 concerns
- **components/Admin/AzureADConfig.tsx**: 2 concerns
- **components/Admin/AzureADDashboard.tsx**: 2 concerns
- **components/Admin/UserSyncManager.tsx**: 2 concerns
- **components/Approvals/ApprovalTaskDetail.tsx**: 2 concerns
- **components/Approvals/ApprovalTaskQueue.tsx**: 2 concerns
- **components/Approvals/RejectModal.tsx**: 1 concerns
- **components/Approvals/WorkflowProgressEnhanced.tsx**: 2 concerns
- **components/Approvals/WorkflowStatus.tsx**: 1 concerns
- **components/BuildRecords/BuildBookGenerator.tsx**: 2 concerns
- **components/BuildRecords/BuildRecordDetail.tsx**: 2 concerns
- **components/BuildRecords/BuildRecordList.tsx**: 2 concerns
- **components/BuildRecords/BuildRecordOperationSignOff.tsx**: 2 concerns
- **components/BuildRecords/DeviationTracker.tsx**: 2 concerns
- **components/BuildRecords/PhotoCaptureModal.tsx**: 2 concerns
- **components/Collaboration/CollaborationPanel.tsx**: 2 concerns
- **components/Collaboration/CommentThread.tsx**: 2 concerns
- **components/Collaboration/ConflictResolution.tsx**: 2 concerns
- **components/Collaboration/ReviewDashboard.tsx**: 2 concerns
- **components/Collaboration/__tests__/CommentThread.test.tsx**: 1 concerns
- **components/Collaboration/withCollaboration.tsx**: 2 concerns
- **components/Dashboard/OEEMetricsCard.tsx**: 2 concerns
- **components/ECO/ECODashboard.tsx**: 2 concerns
- **components/ECO/ECOForm.tsx**: 2 concerns
- **components/Equipment/MaintenanceList.tsx**: 2 concerns
- **components/Execution/ConfigurableExecutionLayout.tsx**: 2 concerns
- **components/Execution/LayoutPreferenceModal.tsx**: 2 concerns
- **components/Execution/layouts/OverlayLayout.tsx**: 1 concerns
- **components/Execution/layouts/PictureInPictureLayout.tsx**: 1 concerns
- **components/Execution/layouts/TabbedLayout.tsx**: 1 concerns
- **components/Execution/panels/DataCollectionPanel.tsx**: 2 concerns
- **components/Execution/panels/InstructionPanel.tsx**: 2 concerns
- **components/FAI/CMMImportModal.tsx**: 2 concerns
- **components/Kits/KitAnalyticsDashboard.tsx**: 2 concerns
- **components/Kits/KitCostAnalysis.tsx**: 1 concerns
- **components/Kits/KitForm.tsx**: 2 concerns
- **components/Kits/KitReportGenerator.tsx**: 2 concerns
- **components/Kits/KitsList.tsx**: 2 concerns
- **components/LLP/LLPAlertManagement.tsx**: 2 concerns
- **components/LLP/LLPConfigurationForm.tsx**: 2 concerns
- **components/LLP/LLPDashboard.tsx**: 2 concerns
- **components/LLP/LLPDetailView.tsx**: 2 concerns
- **components/LLP/LLPLifeEventForm.tsx**: 2 concerns
- **components/Layout/__tests__/MainLayout.test.tsx**: 1 concerns
- **components/Materials/MaterialsList.tsx**: 2 concerns
- **components/Navigation/__tests__/Breadcrumbs.test.tsx**: 1 concerns
- **components/Parameters/DependencyVisualizer.tsx**: 2 concerns
- **components/Parameters/FormulaBuilder.tsx**: 2 concerns
- **components/Parameters/ParameterGroupsTree.tsx**: 2 concerns
- **components/Parameters/ParameterLimitsEditor.tsx**: 2 concerns
- **components/Personnel/PersonnelList.tsx**: 2 concerns
- **components/Routing/ActiveUsersIndicator.tsx**: 1 concerns
- **components/Routing/ConnectionEditor.tsx**: 1 concerns
- **components/Routing/DependencyGraph.tsx**: 2 concerns
- **components/Routing/DraggableStepsTable.tsx**: 1 concerns
- **components/Routing/RoutingChangedAlert.tsx**: 2 concerns
- **components/Routing/RoutingDetail.tsx**: 2 concerns
- **components/Routing/RoutingForm.tsx**: 2 concerns
- **components/Routing/RoutingList.tsx**: 2 concerns
- **components/Routing/RoutingPalette.tsx**: 2 concerns
- **components/Routing/RoutingStepNode.tsx**: 1 concerns
- **components/Routing/StepBuilderModal.tsx**: 1 concerns
- **components/Routing/VersionConflictModal.tsx**: 2 concerns
- **components/SPC/CapabilityReport.tsx**: 2 concerns
- **components/SPC/RuleViolationAlert.tsx**: 2 concerns
- **components/SPC/SPCConfiguration.tsx**: 2 concerns
- **components/Scheduling/ScheduleDetail.tsx**: 2 concerns
- **components/Scheduling/SchedulingList.tsx**: 2 concerns
- **components/Search/__tests__/GlobalSearch.test.tsx**: 1 concerns
- **components/Signatures/SignatureModal.tsx**: 2 concerns
- **components/Site/SiteSelector.tsx**: 1 concerns
- **components/Staging/StagingDashboard.tsx**: 2 concerns
- **components/Staging/StagingLocationUtilization.tsx**: 2 concerns
- **components/Staging/StagingStatusBoard.tsx**: 2 concerns
- **components/TimeTracking/MobileTimeTracker.tsx**: 2 concerns
- **components/TimeTracking/SupervisorApprovalDashboard.tsx**: 2 concerns
- **components/TimeTracking/TimeClockKiosk.tsx**: 2 concerns
- **components/TimeTracking/TimeEntryHistory.tsx**: 2 concerns
- **components/TimeTracking/TimeEntryManagement.tsx**: 2 concerns
- **components/TimeTracking/TimeTrackingWidget.tsx**: 2 concerns
- **components/TimeTracking/TimeTypeIndicator.tsx**: 1 concerns
- **components/Torque/DigitalWrenchConnection.tsx**: 2 concerns
- **components/Torque/TorqueProgress.tsx**: 2 concerns
- **components/Torque/TorqueSequenceVisualization.tsx**: 3 concerns
- **components/Torque/TorqueValidationDisplay.tsx**: 2 concerns
- **components/Traceability/GenealogyTreeVisualization.tsx**: 3 concerns
- **components/WorkInstructions/DataCollectionFormBuilder.tsx**: 2 concerns
- **components/WorkInstructions/DocumentExporter.tsx**: 2 concerns
- **components/WorkInstructions/DocumentImporter.tsx**: 2 concerns
- **components/WorkInstructions/MediaLibraryBrowser.tsx**: 2 concerns
- **components/WorkInstructions/NativeInstructionEditor.tsx**: 2 concerns
- **components/WorkInstructions/ProgressIndicator.tsx**: 1 concerns
- **components/WorkInstructions/StepNavigation.tsx**: 2 concerns
- **components/WorkInstructions/TabletExecutionView.tsx**: 2 concerns
- **components/WorkInstructions/TemplateLibrary.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionList.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionStepEditor.tsx**: 2 concerns
- **components/WorkInstructions/__tests__/ProgressIndicator.test.tsx**: 1 concerns
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx**: 2 concerns
- **components/WorkInstructions/plugins/ImagePlugin.tsx**: 1 concerns
- **components/WorkInstructions/plugins/VideoPlugin.tsx**: 2 concerns
- **components/WorkOrders/OperatorAssignment.tsx**: 2 concerns
- **components/WorkOrders/WorkOrderPriorityChange.tsx**: 1 concerns
- **components/WorkOrders/WorkOrderReschedule.tsx**: 1 concerns
- **pages/Admin/AdminPage.tsx**: 2 concerns
- **pages/Admin/AzureADPage.tsx**: 2 concerns
- **pages/Admin/PermissionCatalogPage.tsx**: 2 concerns
- **pages/Admin/RBACDashboardPage.tsx**: 2 concerns
- **pages/Admin/RoleManagementPage.tsx**: 1 concerns
- **pages/Admin/UserRoleAssignmentPage.tsx**: 2 concerns
- **pages/Dashboard/Dashboard.tsx**: 2 concerns
- **pages/Documents/DocumentsPage.tsx**: 2 concerns
- **pages/FAI/FAIDetailPage.tsx**: 2 concerns
- **pages/FAI/FAIListPage.tsx**: 2 concerns
- **pages/Integration/IntegrationConfig.tsx**: 2 concerns
- **pages/Integration/IntegrationLogs.tsx**: 2 concerns
- **pages/Kits/KitAnalyticsPage.tsx**: 2 concerns
- **pages/Operations/OperationCreatePage.tsx**: 2 concerns
- **pages/Production/TeamWorkQueue.tsx**: 2 concerns
- **pages/Quality/InspectionDetail.tsx**: 2 concerns
- **pages/Quality/Inspections.tsx**: 2 concerns
- **pages/Quality/NCRDetail.tsx**: 2 concerns
- **pages/Quality/NCRs.tsx**: 2 concerns
- **pages/Settings/SettingsPage.tsx**: 1 concerns
- **pages/Signatures/SignatureAuditPage.tsx**: 2 concerns
- **pages/Traceability/Traceability.tsx**: 2 concerns
- **pages/Traceability/TraceabilityDetailPage.tsx**: 2 concerns
- **pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx**: 2 concerns
- **pages/WorkInstructions/WorkInstructionDetailPage.tsx**: 2 concerns
- **pages/WorkOrders/WorkOrderDetails.tsx**: 2 concerns
- **pages/WorkOrders/WorkOrderExecution.tsx**: 2 concerns
- **pages/WorkOrders/WorkOrders.tsx**: 2 concerns
- **services/workOrderApi.ts**: 1 concerns
- **store/executionLayoutStore.ts**: 1 concerns
- **tests/components/TimeTypeIndicator.test.tsx**: 1 concerns
- **tests/integration/workInstructions.test.tsx**: 1 concerns
- **types/kits.ts**: 1 concerns
- **types/search.ts**: 1 concerns

### 3. Monaco Editor Components (1 found)

**Components Found:**
- **components/Parameters/FormulaBuilder.tsx** (Complexity: 77, Lines: 786)

**Issues Found:**
- **components/Parameters/FormulaBuilder.tsx**: 3 concerns

### 4. Lexical Editor Components (5 found)

**Components Found:**
- **components/WorkInstructions/NativeInstructionEditor.tsx** (Complexity: 79, Lines: 928)
- **components/WorkInstructions/RichTextEditor.tsx** (Complexity: 81, Lines: 234)
- **components/WorkInstructions/plugins/ImagePlugin.tsx** (Complexity: 43, Lines: 363)
- **components/WorkInstructions/plugins/ToolbarPlugin.tsx** (Complexity: 82, Lines: 432)
- **components/WorkInstructions/plugins/VideoPlugin.tsx** (Complexity: 46, Lines: 489)

**Issues Found:**
- **components/WorkInstructions/NativeInstructionEditor.tsx**: 2 concerns
- **components/WorkInstructions/RichTextEditor.tsx**: 1 concerns
- **components/WorkInstructions/plugins/ImagePlugin.tsx**: 2 concerns
- **components/WorkInstructions/plugins/ToolbarPlugin.tsx**: 2 concerns
- **components/WorkInstructions/plugins/VideoPlugin.tsx**: 3 concerns

### 5. Chart Components (161 found)

**Components Found:**
- **__tests__/components/Kits/KitAnalyticsDashboard.test.tsx** (Complexity: 3, Lines: 716)
- **__tests__/components/Kits/KitCostAnalysis.test.tsx** (Complexity: 4, Lines: 613)
- **__tests__/components/Kits/KitReportGenerator.test.tsx** (Complexity: 0, Lines: 693)
- **__tests__/components/Kits/KitsList.test.tsx** (Complexity: 0, Lines: 748)
- **__tests__/components/Staging/StagingDashboard.test.tsx** (Complexity: 5, Lines: 561)
- **__tests__/components/Staging/StagingLocationUtilization.test.tsx** (Complexity: 60, Lines: 752)
- **__tests__/components/Staging/StagingStatusBoard.test.tsx** (Complexity: 10, Lines: 649)
- **api/equipment.ts** (Complexity: 0, Lines: 568)
- **api/kits.ts** (Complexity: 25, Lines: 348)
- **components/Admin/AzureAD/AzureADConfig.tsx** (Complexity: 51, Lines: 563)
- **components/Admin/AzureAD/AzureADDashboard.tsx** (Complexity: 22, Lines: 450)
- **components/Admin/AzureAD/UserSyncManager.tsx** (Complexity: 40, Lines: 568)
- **components/Admin/AzureADConfig.tsx** (Complexity: 48, Lines: 610)
- **components/Admin/AzureADDashboard.tsx** (Complexity: 26, Lines: 343)
- **components/Admin/UserSyncManager.tsx** (Complexity: 49, Lines: 584)
- **components/Approvals/ApprovalTaskDetail.tsx** (Complexity: 60, Lines: 811)
- **components/Approvals/ApprovalTaskQueue.tsx** (Complexity: 60, Lines: 749)
- **components/Approvals/RejectModal.tsx** (Complexity: 15, Lines: 193)
- **components/Approvals/WorkflowProgressEnhanced.tsx** (Complexity: 41, Lines: 909)
- **components/Approvals/WorkflowStatus.tsx** (Complexity: 5, Lines: 253)
- **components/BuildRecords/BuildBookGenerator.tsx** (Complexity: 42, Lines: 787)
- **components/BuildRecords/BuildRecordDetail.tsx** (Complexity: 40, Lines: 847)
- **components/BuildRecords/BuildRecordList.tsx** (Complexity: 66, Lines: 879)
- **components/BuildRecords/BuildRecordOperationSignOff.tsx** (Complexity: 58, Lines: 600)
- **components/BuildRecords/DeviationTracker.tsx** (Complexity: 74, Lines: 763)
- **components/BuildRecords/PhotoCaptureModal.tsx** (Complexity: 80, Lines: 740)
- **components/Collaboration/ActivityFeed.tsx** (Complexity: 31, Lines: 437)
- **components/Collaboration/AnnotationCanvas.tsx** (Complexity: 80, Lines: 727)
- **components/Collaboration/CommentThread.tsx** (Complexity: 100, Lines: 541)
- **components/Collaboration/ConflictResolution.tsx** (Complexity: 53, Lines: 495)
- **components/Collaboration/NotificationCenter.tsx** (Complexity: 87, Lines: 554)
- **components/Collaboration/ReviewDashboard.tsx** (Complexity: 53, Lines: 712)
- **components/Collaboration/ReviewTaskQueue.tsx** (Complexity: 65, Lines: 544)
- **components/Common/UUIDDisplay.tsx** (Complexity: 13, Lines: 281)
- **components/Common/__tests__/UUIDDisplay.test.tsx** (Complexity: 0, Lines: 286)
- **components/Dashboard/OEEMetricsCard.tsx** (Complexity: 18, Lines: 387)
- **components/Dashboard/__tests__/OEEMetricsCard.test.tsx** (Complexity: 2, Lines: 534)
- **components/ECO/ECODashboard.tsx** (Complexity: 39, Lines: 664)
- **components/ECO/ECOForm.tsx** (Complexity: 36, Lines: 656)
- **components/Equipment/MaintenanceList.tsx** (Complexity: 38, Lines: 574)
- **components/Equipment/__tests__/MaintenanceList.test.tsx** (Complexity: 0, Lines: 702)
- **components/Execution/ConfigurableExecutionLayout.tsx** (Complexity: 69, Lines: 343)
- **components/Execution/layouts/SplitScreenLayout.tsx** (Complexity: 68, Lines: 321)
- **components/Execution/layouts/TabbedLayout.tsx** (Complexity: 13, Lines: 62)
- **components/Kits/KitAnalyticsDashboard.tsx** (Complexity: 63, Lines: 750)
- **components/Kits/KitCostAnalysis.tsx** (Complexity: 33, Lines: 845)
- **components/Kits/KitForm.tsx** (Complexity: 58, Lines: 632)
- **components/Kits/KitReportGenerator.tsx** (Complexity: 42, Lines: 859)
- **components/Kits/KitsList.tsx** (Complexity: 53, Lines: 700)
- **components/LLP/LLPAlertManagement.tsx** (Complexity: 86, Lines: 988)
- **components/LLP/LLPConfigurationForm.tsx** (Complexity: 63, Lines: 859)
- **components/LLP/LLPDashboard.tsx** (Complexity: 28, Lines: 696)
- **components/LLP/LLPDetailView.tsx** (Complexity: 47, Lines: 978)
- **components/LLP/LLPLifeEventForm.tsx** (Complexity: 74, Lines: 884)
- **components/Layout/MainLayout.tsx** (Complexity: 9, Lines: 571)
- **components/Materials/MaterialsList.tsx** (Complexity: 42, Lines: 535)
- **components/Materials/__tests__/MaterialsList.test.tsx** (Complexity: 8, Lines: 679)
- **components/Parameters/DependencyVisualizer.tsx** (Complexity: 39, Lines: 477)
- **components/Parameters/FormulaBuilder.tsx** (Complexity: 77, Lines: 786)
- **components/Personnel/PersonnelList.tsx** (Complexity: 30, Lines: 357)
- **components/Routing/ActiveUsersIndicator.tsx** (Complexity: 0, Lines: 245)
- **components/Routing/ConnectionEditor.tsx** (Complexity: 23, Lines: 306)
- **components/Routing/DependencyGraph.tsx** (Complexity: 14, Lines: 319)
- **components/Routing/DraggableStepsTable.tsx** (Complexity: 20, Lines: 298)
- **components/Routing/GanttChartView.tsx** (Complexity: 5, Lines: 269)
- **components/Routing/RoutingDetail.tsx** (Complexity: 48, Lines: 837)
- **components/Routing/RoutingForm.tsx** (Complexity: 63, Lines: 679)
- **components/Routing/RoutingList.tsx** (Complexity: 35, Lines: 422)
- **components/Routing/RoutingPalette.tsx** (Complexity: 22, Lines: 374)
- **components/Routing/RoutingStepNode.tsx** (Complexity: 2, Lines: 296)
- **components/Routing/RoutingTemplateLibrary.tsx** (Complexity: 37, Lines: 331)
- **components/Routing/SaveAsTemplateModal.tsx** (Complexity: 14, Lines: 168)
- **components/Routing/StepBuilderModal.tsx** (Complexity: 49, Lines: 470)
- **components/Routing/VisualRoutingEditor.tsx** (Complexity: 52, Lines: 467)
- **components/SPC/CapabilityReport.tsx** (Complexity: 9, Lines: 413)
- **components/SPC/ControlChart.tsx** (Complexity: 11, Lines: 446)
- **components/SPC/RuleViolationAlert.tsx** (Complexity: 58, Lines: 514)
- **components/SPC/SPCConfiguration.tsx** (Complexity: 40, Lines: 505)
- **components/SPC/__tests__/CapabilityReport.test.tsx** (Complexity: 4, Lines: 511)
- **components/SPC/__tests__/ControlChart.test.tsx** (Complexity: 0, Lines: 540)
- **components/SPC/__tests__/RuleViolationAlert.test.tsx** (Complexity: 71, Lines: 718)
- **components/Scheduling/ScheduleDetail.tsx** (Complexity: 35, Lines: 709)
- **components/Scheduling/SchedulingList.tsx** (Complexity: 38, Lines: 514)
- **components/Search/GlobalSearch.tsx** (Complexity: 45, Lines: 343)
- **components/Signatures/SignatureDisplay.tsx** (Complexity: 5, Lines: 285)
- **components/Signatures/SignatureModal.tsx** (Complexity: 27, Lines: 414)
- **components/Site/SiteSelector.tsx** (Complexity: 2, Lines: 185)
- **components/Staging/StagingDashboard.tsx** (Complexity: 58, Lines: 561)
- **components/Staging/StagingLocationUtilization.tsx** (Complexity: 100, Lines: 849)
- **components/Staging/StagingStatusBoard.tsx** (Complexity: 41, Lines: 567)
- **components/TimeTracking/MobileTimeTracker.tsx** (Complexity: 67, Lines: 832)
- **components/TimeTracking/SupervisorApprovalDashboard.tsx** (Complexity: 56, Lines: 934)
- **components/TimeTracking/TimeEntryEdit.tsx** (Complexity: 64, Lines: 847)
- **components/TimeTracking/TimeEntryHistory.tsx** (Complexity: 30, Lines: 618)
- **components/TimeTracking/TimeEntryManagement.tsx** (Complexity: 64, Lines: 705)
- **components/TimeTracking/TimeTrackingWidget.tsx** (Complexity: 72, Lines: 777)
- **components/TimeTracking/TimeTypeIndicator.tsx** (Complexity: 6, Lines: 337)
- **components/Torque/DigitalWrenchConnection.tsx** (Complexity: 93, Lines: 451)
- **components/Torque/TorqueProgress.tsx** (Complexity: 18, Lines: 463)
- **components/Torque/TorqueSequenceVisualization.tsx** (Complexity: 47, Lines: 497)
- **components/Torque/TorqueValidationDisplay.tsx** (Complexity: 62, Lines: 533)
- **components/WorkInstructions/DataCollectionFormBuilder.tsx** (Complexity: 86, Lines: 809)
- **components/WorkInstructions/DocumentImporter.tsx** (Complexity: 50, Lines: 782)
- **components/WorkInstructions/NativeInstructionEditor.tsx** (Complexity: 79, Lines: 928)
- **components/WorkInstructions/ProgressIndicator.tsx** (Complexity: 0, Lines: 113)
- **components/WorkInstructions/RichTextEditor.tsx** (Complexity: 19, Lines: 234)
- **components/WorkInstructions/StepNavigation.tsx** (Complexity: 26, Lines: 144)
- **components/WorkInstructions/TabletExecutionView.tsx** (Complexity: 42, Lines: 443)
- **components/WorkInstructions/TemplateLibrary.tsx** (Complexity: 22, Lines: 381)
- **components/WorkInstructions/WorkInstructionList.tsx** (Complexity: 31, Lines: 320)
- **components/WorkInstructions/WorkInstructionStepEditor.tsx** (Complexity: 59, Lines: 548)
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx** (Complexity: 21, Lines: 624)
- **components/WorkInstructions/plugins/ToolbarPlugin.tsx** (Complexity: 54, Lines: 432)
- **components/WorkOrders/ProductionEntryForm.tsx** (Complexity: 30, Lines: 223)
- **components/WorkOrders/WorkOrderCreate.tsx** (Complexity: 24, Lines: 231)
- **components/WorkOrders/WorkOrderPriorityChange.tsx** (Complexity: 17, Lines: 204)
- **components/WorkOrders/WorkOrderReschedule.tsx** (Complexity: 14, Lines: 221)
- **components/WorkOrders/WorkOrderStatusUpdate.tsx** (Complexity: 18, Lines: 189)
- **pages/Admin/AdminPage.tsx** (Complexity: 19, Lines: 320)
- **pages/Admin/AzureADPage.tsx** (Complexity: 9, Lines: 138)
- **pages/Admin/PermissionCatalogPage.tsx** (Complexity: 99, Lines: 615)
- **pages/Admin/RBACDashboardPage.tsx** (Complexity: 4, Lines: 452)
- **pages/Admin/RoleManagementPage.tsx** (Complexity: 61, Lines: 679)
- **pages/Admin/UserRoleAssignmentPage.tsx** (Complexity: 63, Lines: 896)
- **pages/Dashboard/Dashboard.tsx** (Complexity: 44, Lines: 652)
- **pages/Dashboard/__tests__/Dashboard.test.tsx** (Complexity: 5, Lines: 176)
- **pages/Equipment/Equipment.tsx** (Complexity: 29, Lines: 251)
- **pages/FAI/FAIListPage.tsx** (Complexity: 25, Lines: 271)
- **pages/Integration/IntegrationConfig.tsx** (Complexity: 45, Lines: 665)
- **pages/Integration/IntegrationDashboard.tsx** (Complexity: 34, Lines: 435)
- **pages/Integration/IntegrationLogs.tsx** (Complexity: 49, Lines: 549)
- **pages/Kits/KitAnalyticsPage.tsx** (Complexity: 17, Lines: 292)
- **pages/Kits/KitsPage.tsx** (Complexity: 2, Lines: 50)
- **pages/Operations/OperationCreatePage.tsx** (Complexity: 25, Lines: 347)
- **pages/Operations/OperationListPage.tsx** (Complexity: 45, Lines: 333)
- **pages/Quality/Inspections.tsx** (Complexity: 39, Lines: 438)
- **pages/Quality/NCRs.tsx** (Complexity: 37, Lines: 542)
- **pages/Quality/Quality.tsx** (Complexity: 18, Lines: 377)
- **pages/Routing/RoutingTemplatesPage.tsx** (Complexity: 38, Lines: 381)
- **pages/Serialization/SerializationListPage.tsx** (Complexity: 68, Lines: 679)
- **pages/Signatures/SignatureAuditPage.tsx** (Complexity: 35, Lines: 460)
- **pages/Staging/StagingPage.tsx** (Complexity: 12, Lines: 142)
- **pages/Traceability/Traceability.tsx** (Complexity: 50, Lines: 624)
- **pages/Traceability/TraceabilityDetailPage.tsx** (Complexity: 10, Lines: 172)
- **pages/WorkOrders/WorkOrderDetails.tsx** (Complexity: 32, Lines: 381)
- **pages/WorkOrders/WorkOrderEdit.tsx** (Complexity: 13, Lines: 112)
- **pages/WorkOrders/WorkOrders.tsx** (Complexity: 53, Lines: 522)
- **services/dashboardApi.ts** (Complexity: 2, Lines: 110)
- **store/equipmentStore.ts** (Complexity: 0, Lines: 616)
- **store/kitStore.ts** (Complexity: 14, Lines: 856)
- **test-utils/assertions.ts** (Complexity: 10, Lines: 371)
- **test-utils/factories.ts** (Complexity: 4, Lines: 368)
- **test-utils/helpers.ts** (Complexity: 11, Lines: 410)
- **tests/components/BuildRecordDetail.test.tsx** (Complexity: 5, Lines: 692)
- **tests/components/PhotoCaptureModal.test.tsx** (Complexity: 10, Lines: 541)
- **tests/e2e/collaborative-routing.spec.ts** (Complexity: 0, Lines: 487)
- **types/kits.ts** (Complexity: 26, Lines: 411)
- **types/search.ts** (Complexity: 3, Lines: 235)
- **types/uuid.ts** (Complexity: 3, Lines: 88)
- **utils/__tests__/uuidUtils.test.ts** (Complexity: 4, Lines: 533)
- **utils/uuidUtils.ts** (Complexity: 4, Lines: 306)

**Common Chart Types:**
- `LineChart|BarChart|PieChart`: 65 uses
- `filename:Chart`: 3 uses

**Issues Found:**
- **__tests__/components/Kits/KitCostAnalysis.test.tsx**: 2 concerns
- **__tests__/components/Kits/KitReportGenerator.test.tsx**: 1 concerns
- **__tests__/components/Kits/KitsList.test.tsx**: 1 concerns
- **__tests__/components/Staging/StagingDashboard.test.tsx**: 1 concerns
- **__tests__/components/Staging/StagingLocationUtilization.test.tsx**: 2 concerns
- **__tests__/components/Staging/StagingStatusBoard.test.tsx**: 1 concerns
- **api/equipment.ts**: 1 concerns
- **api/kits.ts**: 1 concerns
- **components/Admin/AzureAD/AzureADConfig.tsx**: 2 concerns
- **components/Admin/AzureAD/AzureADDashboard.tsx**: 2 concerns
- **components/Admin/AzureAD/UserSyncManager.tsx**: 2 concerns
- **components/Admin/AzureADConfig.tsx**: 2 concerns
- **components/Admin/AzureADDashboard.tsx**: 2 concerns
- **components/Admin/UserSyncManager.tsx**: 2 concerns
- **components/Approvals/ApprovalTaskDetail.tsx**: 2 concerns
- **components/Approvals/ApprovalTaskQueue.tsx**: 2 concerns
- **components/Approvals/RejectModal.tsx**: 1 concerns
- **components/Approvals/WorkflowProgressEnhanced.tsx**: 4 concerns
- **components/Approvals/WorkflowStatus.tsx**: 1 concerns
- **components/BuildRecords/BuildBookGenerator.tsx**: 2 concerns
- **components/BuildRecords/BuildRecordDetail.tsx**: 2 concerns
- **components/BuildRecords/BuildRecordList.tsx**: 2 concerns
- **components/BuildRecords/BuildRecordOperationSignOff.tsx**: 2 concerns
- **components/BuildRecords/DeviationTracker.tsx**: 2 concerns
- **components/BuildRecords/PhotoCaptureModal.tsx**: 2 concerns
- **components/Collaboration/ActivityFeed.tsx**: 2 concerns
- **components/Collaboration/AnnotationCanvas.tsx**: 2 concerns
- **components/Collaboration/CommentThread.tsx**: 2 concerns
- **components/Collaboration/ConflictResolution.tsx**: 2 concerns
- **components/Collaboration/NotificationCenter.tsx**: 2 concerns
- **components/Collaboration/ReviewDashboard.tsx**: 2 concerns
- **components/Collaboration/ReviewTaskQueue.tsx**: 2 concerns
- **components/Common/UUIDDisplay.tsx**: 2 concerns
- **components/Common/__tests__/UUIDDisplay.test.tsx**: 1 concerns
- **components/Dashboard/OEEMetricsCard.tsx**: 2 concerns
- **components/Dashboard/__tests__/OEEMetricsCard.test.tsx**: 1 concerns
- **components/ECO/ECODashboard.tsx**: 4 concerns
- **components/ECO/ECOForm.tsx**: 2 concerns
- **components/Equipment/MaintenanceList.tsx**: 2 concerns
- **components/Equipment/__tests__/MaintenanceList.test.tsx**: 1 concerns
- **components/Execution/ConfigurableExecutionLayout.tsx**: 2 concerns
- **components/Execution/layouts/TabbedLayout.tsx**: 1 concerns
- **components/Kits/KitAnalyticsDashboard.tsx**: 3 concerns
- **components/Kits/KitCostAnalysis.tsx**: 2 concerns
- **components/Kits/KitForm.tsx**: 2 concerns
- **components/Kits/KitReportGenerator.tsx**: 4 concerns
- **components/Kits/KitsList.tsx**: 2 concerns
- **components/LLP/LLPAlertManagement.tsx**: 2 concerns
- **components/LLP/LLPConfigurationForm.tsx**: 2 concerns
- **components/LLP/LLPDashboard.tsx**: 2 concerns
- **components/LLP/LLPDetailView.tsx**: 2 concerns
- **components/LLP/LLPLifeEventForm.tsx**: 2 concerns
- **components/Layout/MainLayout.tsx**: 1 concerns
- **components/Materials/MaterialsList.tsx**: 2 concerns
- **components/Materials/__tests__/MaterialsList.test.tsx**: 1 concerns
- **components/Parameters/DependencyVisualizer.tsx**: 2 concerns
- **components/Parameters/FormulaBuilder.tsx**: 2 concerns
- **components/Personnel/PersonnelList.tsx**: 2 concerns
- **components/Routing/ActiveUsersIndicator.tsx**: 1 concerns
- **components/Routing/ConnectionEditor.tsx**: 1 concerns
- **components/Routing/DependencyGraph.tsx**: 2 concerns
- **components/Routing/DraggableStepsTable.tsx**: 1 concerns
- **components/Routing/GanttChartView.tsx**: 2 concerns
- **components/Routing/RoutingDetail.tsx**: 4 concerns
- **components/Routing/RoutingForm.tsx**: 2 concerns
- **components/Routing/RoutingList.tsx**: 2 concerns
- **components/Routing/RoutingPalette.tsx**: 2 concerns
- **components/Routing/RoutingStepNode.tsx**: 1 concerns
- **components/Routing/RoutingTemplateLibrary.tsx**: 2 concerns
- **components/Routing/SaveAsTemplateModal.tsx**: 1 concerns
- **components/Routing/StepBuilderModal.tsx**: 1 concerns
- **components/Routing/VisualRoutingEditor.tsx**: 2 concerns
- **components/SPC/CapabilityReport.tsx**: 3 concerns
- **components/SPC/ControlChart.tsx**: 2 concerns
- **components/SPC/RuleViolationAlert.tsx**: 2 concerns
- **components/SPC/SPCConfiguration.tsx**: 4 concerns
- **components/SPC/__tests__/CapabilityReport.test.tsx**: 2 concerns
- **components/SPC/__tests__/ControlChart.test.tsx**: 2 concerns
- **components/SPC/__tests__/RuleViolationAlert.test.tsx**: 1 concerns
- **components/Scheduling/ScheduleDetail.tsx**: 2 concerns
- **components/Scheduling/SchedulingList.tsx**: 2 concerns
- **components/Search/GlobalSearch.tsx**: 2 concerns
- **components/Signatures/SignatureDisplay.tsx**: 1 concerns
- **components/Signatures/SignatureModal.tsx**: 2 concerns
- **components/Site/SiteSelector.tsx**: 1 concerns
- **components/Staging/StagingDashboard.tsx**: 2 concerns
- **components/Staging/StagingLocationUtilization.tsx**: 4 concerns
- **components/Staging/StagingStatusBoard.tsx**: 2 concerns
- **components/TimeTracking/MobileTimeTracker.tsx**: 2 concerns
- **components/TimeTracking/SupervisorApprovalDashboard.tsx**: 4 concerns
- **components/TimeTracking/TimeEntryEdit.tsx**: 2 concerns
- **components/TimeTracking/TimeEntryHistory.tsx**: 2 concerns
- **components/TimeTracking/TimeEntryManagement.tsx**: 2 concerns
- **components/TimeTracking/TimeTrackingWidget.tsx**: 2 concerns
- **components/TimeTracking/TimeTypeIndicator.tsx**: 1 concerns
- **components/Torque/DigitalWrenchConnection.tsx**: 2 concerns
- **components/Torque/TorqueProgress.tsx**: 4 concerns
- **components/Torque/TorqueSequenceVisualization.tsx**: 2 concerns
- **components/Torque/TorqueValidationDisplay.tsx**: 2 concerns
- **components/WorkInstructions/DataCollectionFormBuilder.tsx**: 4 concerns
- **components/WorkInstructions/DocumentImporter.tsx**: 2 concerns
- **components/WorkInstructions/NativeInstructionEditor.tsx**: 2 concerns
- **components/WorkInstructions/ProgressIndicator.tsx**: 1 concerns
- **components/WorkInstructions/StepNavigation.tsx**: 2 concerns
- **components/WorkInstructions/TabletExecutionView.tsx**: 2 concerns
- **components/WorkInstructions/TemplateLibrary.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionList.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionStepEditor.tsx**: 2 concerns
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx**: 2 concerns
- **components/WorkInstructions/plugins/ToolbarPlugin.tsx**: 1 concerns
- **components/WorkOrders/ProductionEntryForm.tsx**: 2 concerns
- **components/WorkOrders/WorkOrderCreate.tsx**: 1 concerns
- **components/WorkOrders/WorkOrderPriorityChange.tsx**: 1 concerns
- **components/WorkOrders/WorkOrderReschedule.tsx**: 1 concerns
- **components/WorkOrders/WorkOrderStatusUpdate.tsx**: 2 concerns
- **pages/Admin/AdminPage.tsx**: 4 concerns
- **pages/Admin/AzureADPage.tsx**: 2 concerns
- **pages/Admin/PermissionCatalogPage.tsx**: 2 concerns
- **pages/Admin/RBACDashboardPage.tsx**: 4 concerns
- **pages/Admin/RoleManagementPage.tsx**: 1 concerns
- **pages/Admin/UserRoleAssignmentPage.tsx**: 2 concerns
- **pages/Dashboard/Dashboard.tsx**: 3 concerns
- **pages/Dashboard/__tests__/Dashboard.test.tsx**: 1 concerns
- **pages/Equipment/Equipment.tsx**: 1 concerns
- **pages/FAI/FAIListPage.tsx**: 2 concerns
- **pages/Integration/IntegrationConfig.tsx**: 2 concerns
- **pages/Integration/IntegrationDashboard.tsx**: 2 concerns
- **pages/Integration/IntegrationLogs.tsx**: 2 concerns
- **pages/Kits/KitAnalyticsPage.tsx**: 4 concerns
- **pages/Kits/KitsPage.tsx**: 1 concerns
- **pages/Operations/OperationCreatePage.tsx**: 2 concerns
- **pages/Operations/OperationListPage.tsx**: 2 concerns
- **pages/Quality/Inspections.tsx**: 2 concerns
- **pages/Quality/NCRs.tsx**: 2 concerns
- **pages/Quality/Quality.tsx**: 2 concerns
- **pages/Routing/RoutingTemplatesPage.tsx**: 2 concerns
- **pages/Serialization/SerializationListPage.tsx**: 2 concerns
- **pages/Signatures/SignatureAuditPage.tsx**: 2 concerns
- **pages/Staging/StagingPage.tsx**: 4 concerns
- **pages/Traceability/Traceability.tsx**: 2 concerns
- **pages/Traceability/TraceabilityDetailPage.tsx**: 2 concerns
- **pages/WorkOrders/WorkOrderDetails.tsx**: 2 concerns
- **pages/WorkOrders/WorkOrderEdit.tsx**: 2 concerns
- **pages/WorkOrders/WorkOrders.tsx**: 2 concerns
- **services/dashboardApi.ts**: 1 concerns
- **store/equipmentStore.ts**: 1 concerns
- **store/kitStore.ts**: 1 concerns
- **test-utils/factories.ts**: 1 concerns
- **test-utils/helpers.ts**: 1 concerns
- **tests/e2e/collaborative-routing.spec.ts**: 2 concerns
- **types/kits.ts**: 1 concerns
- **types/search.ts**: 1 concerns
- **types/uuid.ts**: 1 concerns
- **utils/__tests__/uuidUtils.test.ts**: 1 concerns
- **utils/uuidUtils.ts**: 1 concerns

### 6. Complex Form Components (67 found)

**Components Found:**
- **__tests__/components/Kits/KitForm.test.tsx** (Complexity: 12, Lines: 610)
- **__tests__/components/Kits/KitReportGenerator.test.tsx** (Complexity: 0, Lines: 693)
- **api/inspectionPlans.ts** (Complexity: 100, Lines: 262)
- **api/routing.ts** (Complexity: 7, Lines: 394)
- **api/setupSheets.ts** (Complexity: 11, Lines: 260)
- **api/sops.ts** (Complexity: 7, Lines: 294)
- **api/workInstructions.ts** (Complexity: 21, Lines: 335)
- **components/Approvals/ApprovalTaskDetail.tsx** (Complexity: 60, Lines: 811)
- **components/Approvals/WorkflowProgressEnhanced.tsx** (Complexity: 41, Lines: 909)
- **components/Approvals/WorkflowStatus.tsx** (Complexity: 5, Lines: 253)
- **components/BuildRecords/DeviationTracker.tsx** (Complexity: 74, Lines: 763)
- **components/ECO/ECOForm.tsx** (Complexity: 36, Lines: 656)
- **components/Execution/ConfigurableExecutionLayout.tsx** (Complexity: 69, Lines: 343)
- **components/Execution/LayoutPreferenceModal.tsx** (Complexity: 11, Lines: 99)
- **components/Execution/__tests__/LayoutPreferenceModal.test.tsx** (Complexity: 9, Lines: 516)
- **components/Execution/layouts/OverlayLayout.tsx** (Complexity: 12, Lines: 64)
- **components/Execution/layouts/PictureInPictureLayout.tsx** (Complexity: 10, Lines: 45)
- **components/Execution/layouts/SplitScreenLayout.tsx** (Complexity: 68, Lines: 321)
- **components/Execution/layouts/TabbedLayout.tsx** (Complexity: 13, Lines: 62)
- **components/Execution/panels/DataCollectionPanel.tsx** (Complexity: 47, Lines: 373)
- **components/Execution/panels/InstructionPanel.tsx** (Complexity: 31, Lines: 276)
- **components/FAI/CMMImportModal.tsx** (Complexity: 43, Lines: 489)
- **components/Kits/KitForm.tsx** (Complexity: 58, Lines: 632)
- **components/Kits/KitReportGenerator.tsx** (Complexity: 42, Lines: 859)
- **components/LLP/LLPConfigurationForm.tsx** (Complexity: 63, Lines: 859)
- **components/Routing/ConnectionEditor.tsx** (Complexity: 23, Lines: 306)
- **components/Routing/DependencyGraph.tsx** (Complexity: 14, Lines: 319)
- **components/Routing/DraggableStepsTable.tsx** (Complexity: 20, Lines: 298)
- **components/Routing/GanttChartView.tsx** (Complexity: 5, Lines: 269)
- **components/Routing/RoutingDetail.tsx** (Complexity: 48, Lines: 837)
- **components/Routing/RoutingPalette.tsx** (Complexity: 22, Lines: 374)
- **components/Routing/RoutingStepNode.tsx** (Complexity: 2, Lines: 296)
- **components/Routing/StepBuilderModal.tsx** (Complexity: 49, Lines: 470)
- **components/Routing/VisualRoutingEditor.tsx** (Complexity: 52, Lines: 467)
- **components/SPC/SPCConfiguration.tsx** (Complexity: 40, Lines: 505)
- **components/SPC/__tests__/SPCConfiguration.test.tsx** (Complexity: 10, Lines: 701)
- **components/Signatures/SignatureModal.tsx** (Complexity: 27, Lines: 414)
- **components/Torque/TorqueProgress.tsx** (Complexity: 18, Lines: 463)
- **components/Torque/TorqueSequenceVisualization.tsx** (Complexity: 47, Lines: 497)
- **components/WorkInstructions/DataCollectionFormBuilder.tsx** (Complexity: 86, Lines: 809)
- **components/WorkInstructions/DocumentExporter.tsx** (Complexity: 48, Lines: 853)
- **components/WorkInstructions/DocumentImporter.tsx** (Complexity: 50, Lines: 782)
- **components/WorkInstructions/MediaLibraryBrowser.tsx** (Complexity: 100, Lines: 965)
- **components/WorkInstructions/NativeInstructionEditor.tsx** (Complexity: 79, Lines: 928)
- **components/WorkInstructions/ProgressIndicator.tsx** (Complexity: 0, Lines: 113)
- **components/WorkInstructions/StepNavigation.tsx** (Complexity: 26, Lines: 144)
- **components/WorkInstructions/TabletExecutionView.tsx** (Complexity: 42, Lines: 443)
- **components/WorkInstructions/TemplateLibrary.tsx** (Complexity: 22, Lines: 381)
- **components/WorkInstructions/WorkInstructionForm.tsx** (Complexity: 54, Lines: 469)
- **components/WorkInstructions/WorkInstructionList.tsx** (Complexity: 31, Lines: 320)
- **components/WorkInstructions/WorkInstructionStepEditor.tsx** (Complexity: 59, Lines: 548)
- **components/WorkInstructions/__tests__/ProgressIndicator.test.tsx** (Complexity: 2, Lines: 373)
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx** (Complexity: 21, Lines: 624)
- **pages/FAI/FAICreatePage.tsx** (Complexity: 15, Lines: 212)
- **pages/Operations/OperationCreatePage.tsx** (Complexity: 25, Lines: 347)
- **pages/Routing/RoutingDetailPage.tsx** (Complexity: 0, Lines: 22)
- **pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx** (Complexity: 49, Lines: 384)
- **pages/WorkInstructions/WorkInstructionDetailPage.tsx** (Complexity: 32, Lines: 438)
- **pages/WorkInstructions/WorkInstructionExecutePage.tsx** (Complexity: 6, Lines: 24)
- **store/executionLayoutStore.ts** (Complexity: 100, Lines: 592)
- **store/routingStore.ts** (Complexity: 18, Lines: 759)
- **store/workInstructionStore.ts** (Complexity: 45, Lines: 439)
- **test-utils/helpers.ts** (Complexity: 11, Lines: 410)
- **tests/e2e/collaborative-routing.spec.ts** (Complexity: 0, Lines: 487)
- **tests/integration/workInstructions.test.tsx** (Complexity: 40, Lines: 459)
- **types/kits.ts** (Complexity: 26, Lines: 411)
- **types/routing.ts** (Complexity: 15, Lines: 542)

**Issues Found:**
- **api/inspectionPlans.ts**: 1 concerns
- **api/routing.ts**: 1 concerns
- **api/setupSheets.ts**: 1 concerns
- **api/sops.ts**: 1 concerns
- **api/workInstructions.ts**: 1 concerns
- **components/Approvals/ApprovalTaskDetail.tsx**: 2 concerns
- **components/Approvals/WorkflowProgressEnhanced.tsx**: 2 concerns
- **components/Approvals/WorkflowStatus.tsx**: 1 concerns
- **components/BuildRecords/DeviationTracker.tsx**: 2 concerns
- **components/ECO/ECOForm.tsx**: 2 concerns
- **components/Execution/ConfigurableExecutionLayout.tsx**: 2 concerns
- **components/Execution/LayoutPreferenceModal.tsx**: 2 concerns
- **components/Execution/layouts/OverlayLayout.tsx**: 1 concerns
- **components/Execution/layouts/PictureInPictureLayout.tsx**: 1 concerns
- **components/Execution/layouts/TabbedLayout.tsx**: 1 concerns
- **components/Execution/panels/DataCollectionPanel.tsx**: 2 concerns
- **components/Execution/panels/InstructionPanel.tsx**: 2 concerns
- **components/FAI/CMMImportModal.tsx**: 2 concerns
- **components/Kits/KitForm.tsx**: 2 concerns
- **components/Kits/KitReportGenerator.tsx**: 2 concerns
- **components/LLP/LLPConfigurationForm.tsx**: 2 concerns
- **components/Routing/ConnectionEditor.tsx**: 1 concerns
- **components/Routing/DependencyGraph.tsx**: 2 concerns
- **components/Routing/DraggableStepsTable.tsx**: 1 concerns
- **components/Routing/GanttChartView.tsx**: 1 concerns
- **components/Routing/RoutingDetail.tsx**: 2 concerns
- **components/Routing/RoutingPalette.tsx**: 2 concerns
- **components/Routing/RoutingStepNode.tsx**: 1 concerns
- **components/Routing/StepBuilderModal.tsx**: 1 concerns
- **components/Routing/VisualRoutingEditor.tsx**: 2 concerns
- **components/SPC/SPCConfiguration.tsx**: 2 concerns
- **components/SPC/__tests__/SPCConfiguration.test.tsx**: 1 concerns
- **components/Signatures/SignatureModal.tsx**: 2 concerns
- **components/Torque/TorqueProgress.tsx**: 2 concerns
- **components/Torque/TorqueSequenceVisualization.tsx**: 2 concerns
- **components/WorkInstructions/DataCollectionFormBuilder.tsx**: 2 concerns
- **components/WorkInstructions/DocumentExporter.tsx**: 2 concerns
- **components/WorkInstructions/DocumentImporter.tsx**: 2 concerns
- **components/WorkInstructions/MediaLibraryBrowser.tsx**: 2 concerns
- **components/WorkInstructions/NativeInstructionEditor.tsx**: 3 concerns
- **components/WorkInstructions/ProgressIndicator.tsx**: 1 concerns
- **components/WorkInstructions/StepNavigation.tsx**: 2 concerns
- **components/WorkInstructions/TabletExecutionView.tsx**: 2 concerns
- **components/WorkInstructions/TemplateLibrary.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionForm.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionList.tsx**: 2 concerns
- **components/WorkInstructions/WorkInstructionStepEditor.tsx**: 2 concerns
- **components/WorkInstructions/__tests__/ProgressIndicator.test.tsx**: 1 concerns
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx**: 2 concerns
- **pages/FAI/FAICreatePage.tsx**: 2 concerns
- **pages/Operations/OperationCreatePage.tsx**: 2 concerns
- **pages/Routing/RoutingDetailPage.tsx**: 1 concerns
- **pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx**: 2 concerns
- **pages/WorkInstructions/WorkInstructionDetailPage.tsx**: 2 concerns
- **pages/WorkInstructions/WorkInstructionExecutePage.tsx**: 1 concerns
- **store/executionLayoutStore.ts**: 1 concerns
- **store/routingStore.ts**: 1 concerns
- **store/workInstructionStore.ts**: 1 concerns
- **test-utils/helpers.ts**: 1 concerns
- **tests/e2e/collaborative-routing.spec.ts**: 1 concerns
- **tests/integration/workInstructions.test.tsx**: 1 concerns
- **types/kits.ts**: 1 concerns
- **types/routing.ts**: 1 concerns

### 7. Virtualization Components (2 found)

**Components Found:**
- **__tests__/components/Kits/KitAnalyticsDashboard.test.tsx** (Complexity: 3, Lines: 716)
- **test-utils/helpers.ts** (Complexity: 11, Lines: 410)

**Issues Found:**
- **test-utils/helpers.ts**: 1 concerns

### 8. Drag & Drop Components (39 found)

**Components Found:**
- **__tests__/components/Staging/StagingStatusBoard.test.tsx** (Complexity: 10, Lines: 649)
- **components/BuildRecords/PhotoCaptureModal.tsx** (Complexity: 80, Lines: 740)
- **components/Collaboration/CommentThread.tsx** (Complexity: 100, Lines: 541)
- **components/Common/UUIDDisplay.tsx** (Complexity: 13, Lines: 281)
- **components/Common/__tests__/UUIDDisplay.test.tsx** (Complexity: 0, Lines: 286)
- **components/Dashboard/__tests__/OEEMetricsCard.test.tsx** (Complexity: 2, Lines: 534)
- **components/Layout/MainLayout.tsx** (Complexity: 9, Lines: 571)
- **components/Layout/__tests__/MainLayout.test.tsx** (Complexity: 0, Lines: 244)
- **components/Parameters/ParameterGroupsTree.tsx** (Complexity: 67, Lines: 768)
- **components/Routing/DraggableStepsTable.tsx** (Complexity: 20, Lines: 298)
- **components/Routing/RoutingDetail.tsx** (Complexity: 48, Lines: 837)
- **components/Routing/RoutingForm.tsx** (Complexity: 63, Lines: 679)
- **components/Routing/RoutingPalette.tsx** (Complexity: 22, Lines: 374)
- **components/Routing/VisualRoutingEditor.tsx** (Complexity: 52, Lines: 467)
- **components/SPC/__tests__/SPCConfiguration.test.tsx** (Complexity: 10, Lines: 701)
- **components/Site/SiteSelector.tsx** (Complexity: 2, Lines: 185)
- **components/Site/__tests__/SiteSelector.test.tsx** (Complexity: 2, Lines: 633)
- **components/Staging/StagingStatusBoard.tsx** (Complexity: 41, Lines: 567)
- **components/TimeTracking/MobileTimeTracker.tsx** (Complexity: 67, Lines: 832)
- **components/TimeTracking/TimeClockKiosk.tsx** (Complexity: 71, Lines: 812)
- **components/WorkInstructions/DataCollectionFormBuilder.tsx** (Complexity: 86, Lines: 809)
- **components/WorkInstructions/DocumentImporter.tsx** (Complexity: 50, Lines: 782)
- **components/WorkInstructions/MediaLibraryBrowser.tsx** (Complexity: 100, Lines: 965)
- **components/WorkInstructions/NativeInstructionEditor.tsx** (Complexity: 79, Lines: 928)
- **components/WorkInstructions/WorkInstructionStepEditor.tsx** (Complexity: 59, Lines: 548)
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx** (Complexity: 21, Lines: 624)
- **components/WorkInstructions/plugins/ImagePlugin.tsx** (Complexity: 25, Lines: 363)
- **components/WorkOrders/__tests__/OperatorAssignment.test.tsx** (Complexity: 4, Lines: 578)
- **components/WorkOrders/__tests__/WorkOrderCreate.test.tsx** (Complexity: 2, Lines: 804)
- **components/WorkOrders/__tests__/WorkOrderPriorityChange.test.tsx** (Complexity: 18, Lines: 591)
- **components/WorkOrders/__tests__/WorkOrderReschedule.test.tsx** (Complexity: 21, Lines: 530)
- **components/WorkOrders/__tests__/WorkOrderStatusUpdate.test.tsx** (Complexity: 12, Lines: 573)
- **pages/__tests__/ComponentSmoke.test.tsx** (Complexity: 1, Lines: 216)
- **test-utils/helpers.ts** (Complexity: 11, Lines: 410)
- **tests/components/BuildRecordDetail.test.tsx** (Complexity: 5, Lines: 692)
- **tests/components/BuildRecordList.test.tsx** (Complexity: 12, Lines: 597)
- **tests/components/PhotoCaptureModal.test.tsx** (Complexity: 10, Lines: 541)
- **tests/components/TimeTrackingWidget.test.tsx** (Complexity: 14, Lines: 563)
- **tests/integration/workInstructions.test.tsx** (Complexity: 40, Lines: 459)

**Issues Found:**
- **__tests__/components/Staging/StagingStatusBoard.test.tsx**: 1 concerns
- **components/BuildRecords/PhotoCaptureModal.tsx**: 2 concerns
- **components/Collaboration/CommentThread.tsx**: 2 concerns
- **components/Common/UUIDDisplay.tsx**: 2 concerns
- **components/Common/__tests__/UUIDDisplay.test.tsx**: 1 concerns
- **components/Dashboard/__tests__/OEEMetricsCard.test.tsx**: 1 concerns
- **components/Layout/MainLayout.tsx**: 1 concerns
- **components/Layout/__tests__/MainLayout.test.tsx**: 1 concerns
- **components/Parameters/ParameterGroupsTree.tsx**: 2 concerns
- **components/Routing/DraggableStepsTable.tsx**: 2 concerns
- **components/Routing/RoutingDetail.tsx**: 3 concerns
- **components/Routing/RoutingForm.tsx**: 2 concerns
- **components/Routing/RoutingPalette.tsx**: 3 concerns
- **components/Routing/VisualRoutingEditor.tsx**: 3 concerns
- **components/SPC/__tests__/SPCConfiguration.test.tsx**: 1 concerns
- **components/Site/SiteSelector.tsx**: 1 concerns
- **components/Staging/StagingStatusBoard.tsx**: 3 concerns
- **components/TimeTracking/MobileTimeTracker.tsx**: 2 concerns
- **components/TimeTracking/TimeClockKiosk.tsx**: 2 concerns
- **components/WorkInstructions/DataCollectionFormBuilder.tsx**: 3 concerns
- **components/WorkInstructions/DocumentImporter.tsx**: 2 concerns
- **components/WorkInstructions/MediaLibraryBrowser.tsx**: 2 concerns
- **components/WorkInstructions/NativeInstructionEditor.tsx**: 3 concerns
- **components/WorkInstructions/WorkInstructionStepEditor.tsx**: 2 concerns
- **components/WorkInstructions/__tests__/StepNavigation.test.tsx**: 2 concerns
- **components/WorkInstructions/plugins/ImagePlugin.tsx**: 1 concerns
- **pages/__tests__/ComponentSmoke.test.tsx**: 1 concerns
- **test-utils/helpers.ts**: 1 concerns
- **tests/components/BuildRecordList.test.tsx**: 1 concerns
- **tests/components/TimeTrackingWidget.test.tsx**: 1 concerns
- **tests/integration/workInstructions.test.tsx**: 1 concerns

## Critical Issues Analysis

### High Severity Issues

#### __tests__/components/Kits/KitCostAnalysis.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### __tests__/components/Kits/KitCostAnalysis.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### __tests__/components/Kits/KitReportGenerator.test.tsx (CHARTS)
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### __tests__/components/Kits/KitsList.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### __tests__/components/Staging/StagingDashboard.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### __tests__/components/Staging/StagingLocationUtilization.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### __tests__/components/Staging/StagingLocationUtilization.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### __tests__/components/Staging/StagingStatusBoard.test.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### __tests__/components/Staging/StagingStatusBoard.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### __tests__/components/Staging/StagingStatusBoard.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/auth.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/client.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/equipment.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/inspectionPlans.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/kits.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/kits.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/parts.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/parts.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/presence.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/rbac.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/routing.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/routing.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/routing.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/routingTemplates.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/setupSheets.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/sops.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/workInstructions.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/workInstructions.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### api/workOrderExecution.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Admin/AzureAD/AzureADConfig.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureAD/AzureADConfig.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureAD/AzureADDashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureAD/AzureADDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureAD/UserSyncManager.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureAD/UserSyncManager.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureADConfig.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureADConfig.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureADDashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/AzureADDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/UserSyncManager.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Admin/UserSyncManager.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/ApprovalTaskDetail.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/ApprovalTaskDetail.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/ApprovalTaskDetail.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/ApprovalTaskDetail.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/ApprovalTaskQueue.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/ApprovalTaskQueue.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/ApprovalTaskQueue.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/RejectModal.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Approvals/RejectModal.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Approvals/RejectModal.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Approvals/WorkflowProgressEnhanced.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/WorkflowProgressEnhanced.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Approvals/WorkflowProgressEnhanced.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Approvals/WorkflowStatus.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Approvals/WorkflowStatus.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Approvals/WorkflowStatus.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/BuildRecords/BuildBookGenerator.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/BuildBookGenerator.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/BuildRecordDetail.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/BuildRecordDetail.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/BuildRecordList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/BuildRecordList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/BuildRecordOperationSignOff.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/BuildRecordOperationSignOff.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/DeviationTracker.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/DeviationTracker.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/DeviationTracker.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/PhotoCaptureModal.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/PhotoCaptureModal.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/BuildRecords/PhotoCaptureModal.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ActivityFeed.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ActivityFeed.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/AnnotationCanvas.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/AnnotationCanvas.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/CollaborationPanel.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/CollaborationPanel.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/CommentThread.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/CommentThread.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/CommentThread.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/CommentThread.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ConflictResolution.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ConflictResolution.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ConflictResolution.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/NotificationCenter.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/NotificationCenter.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ReviewDashboard.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ReviewDashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ReviewDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/ReviewTaskQueue.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Collaboration/__tests__/CommentThread.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Collaboration/withCollaboration.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Common/UUIDDisplay.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Common/UUIDDisplay.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Common/UUIDDisplay.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Common/__tests__/UUIDDisplay.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Common/__tests__/UUIDDisplay.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Dashboard/OEEMetricsCard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Dashboard/OEEMetricsCard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Dashboard/__tests__/OEEMetricsCard.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Dashboard/__tests__/OEEMetricsCard.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/ECO/ECODashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/ECO/ECODashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/ECO/ECOForm.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/ECO/ECOForm.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/ECO/ECOForm.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Equipment/MaintenanceList.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Equipment/MaintenanceList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Equipment/MaintenanceList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Equipment/__tests__/MaintenanceList.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/ConfigurableExecutionLayout.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/ConfigurableExecutionLayout.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/ConfigurableExecutionLayout.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/ConfigurableExecutionLayout.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/KeyboardShortcutHandler.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/LayoutPreferenceModal.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/LayoutPreferenceModal.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/LayoutPreferenceModal.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/layouts/OverlayLayout.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/layouts/OverlayLayout.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/layouts/PictureInPictureLayout.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/layouts/PictureInPictureLayout.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/layouts/TabbedLayout.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/layouts/TabbedLayout.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/layouts/TabbedLayout.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Execution/panels/DataCollectionPanel.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/panels/DataCollectionPanel.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/panels/DataCollectionPanel.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/panels/InstructionPanel.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/panels/InstructionPanel.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Execution/panels/InstructionPanel.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/FAI/CMMImportModal.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/FAI/CMMImportModal.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/FAI/CMMImportModal.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitAnalyticsDashboard.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitAnalyticsDashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitAnalyticsDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Kits/KitCostAnalysis.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Kits/KitCostAnalysis.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Kits/KitForm.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitForm.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitForm.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitReportGenerator.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitReportGenerator.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitReportGenerator.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Kits/KitReportGenerator.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitsList.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitsList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Kits/KitsList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPAlertManagement.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPAlertManagement.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPConfigurationForm.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPConfigurationForm.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPConfigurationForm.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPDashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPDetailView.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPDetailView.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPLifeEventForm.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/LLP/LLPLifeEventForm.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Layout/MainLayout.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Layout/MainLayout.tsx (CHARTS)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Layout/MainLayout.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Layout/__tests__/MainLayout.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Layout/__tests__/MainLayout.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Materials/MaterialsList.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Materials/MaterialsList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Materials/MaterialsList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Materials/__tests__/MaterialsList.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Navigation/__tests__/Breadcrumbs.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Parameters/DependencyVisualizer.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/DependencyVisualizer.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/DependencyVisualizer.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/FormulaBuilder.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/FormulaBuilder.tsx (MONACO)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/FormulaBuilder.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/ParameterGroupsTree.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/ParameterGroupsTree.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Parameters/ParameterLimitsEditor.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Personnel/PersonnelList.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Personnel/PersonnelList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Personnel/PersonnelList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/ActiveUsersIndicator.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/ActiveUsersIndicator.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/ConnectionEditor.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/ConnectionEditor.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/ConnectionEditor.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/ConnectionEditor.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/DependencyGraph.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DependencyGraph.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DependencyGraph.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DependencyGraph.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DraggableStepsTable.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DraggableStepsTable.tsx (D3)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DraggableStepsTable.tsx (CHARTS)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DraggableStepsTable.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/DraggableStepsTable.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Drag and drop missing keyboard alternative
  - *Recommendation*: Provide keyboard alternative for drag and drop functionality

#### components/Routing/GanttChartView.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Routing/GanttChartView.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/RoutingChangedAlert.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingDetail.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingDetail.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingDetail.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Routing/RoutingDetail.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingDetail.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Drag and drop missing keyboard alternative
  - *Recommendation*: Provide keyboard alternative for drag and drop functionality

#### components/Routing/RoutingForm.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingForm.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingForm.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingForm.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingList.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingPalette.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingPalette.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingPalette.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingPalette.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Drag and drop missing keyboard alternative
  - *Recommendation*: Provide keyboard alternative for drag and drop functionality

#### components/Routing/RoutingStepNode.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/RoutingStepNode.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/RoutingStepNode.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/RoutingStepNode.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/RoutingTemplateLibrary.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/RoutingTemplateLibrary.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/SaveAsTemplateModal.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/StepBuilderModal.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/StepBuilderModal.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/StepBuilderModal.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Routing/VersionConflictModal.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/VisualRoutingEditor.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/VisualRoutingEditor.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/VisualRoutingEditor.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Routing/VisualRoutingEditor.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Drag and drop missing keyboard alternative
  - *Recommendation*: Provide keyboard alternative for drag and drop functionality

#### components/SPC/CapabilityReport.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/SPC/CapabilityReport.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/SPC/ControlChart.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/SPC/RuleViolationAlert.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/SPC/RuleViolationAlert.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/SPC/SPCConfiguration.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/SPC/SPCConfiguration.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/SPC/SPCConfiguration.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/SPC/SPCConfiguration.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/SPC/__tests__/CapabilityReport.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/SPC/__tests__/ControlChart.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/SPC/__tests__/RuleViolationAlert.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/SPC/__tests__/SPCConfiguration.test.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/SPC/__tests__/SPCConfiguration.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Scheduling/ScheduleDetail.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Scheduling/ScheduleDetail.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Scheduling/ScheduleDetail.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Scheduling/SchedulingList.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Scheduling/SchedulingList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Scheduling/SchedulingList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Search/GlobalSearch.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Search/GlobalSearch.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Search/__tests__/GlobalSearch.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Signatures/BiometricCapture.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Signatures/SignatureDisplay.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Signatures/SignatureModal.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Signatures/SignatureModal.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Signatures/SignatureModal.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Signatures/SignatureModal.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Site/SiteSelector.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Site/SiteSelector.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Site/SiteSelector.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Site/SiteSelector.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Staging/StagingDashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Staging/StagingDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Staging/StagingLocationUtilization.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Staging/StagingLocationUtilization.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Staging/StagingStatusBoard.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Staging/StagingStatusBoard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Staging/StagingStatusBoard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Staging/StagingStatusBoard.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Drag and drop missing keyboard alternative
  - *Recommendation*: Provide keyboard alternative for drag and drop functionality

#### components/TimeTracking/MobileTimeTracker.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/MobileTimeTracker.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/MobileTimeTracker.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/SupervisorApprovalDashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/SupervisorApprovalDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/TimeTracking/TimeClockKiosk.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeClockKiosk.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeEntryEdit.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeEntryHistory.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeEntryHistory.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeEntryManagement.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeEntryManagement.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeTrackingWidget.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeTrackingWidget.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/TimeTracking/TimeTypeIndicator.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/TimeTracking/TimeTypeIndicator.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/Torque/DigitalWrenchConnection.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/DigitalWrenchConnection.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/DigitalWrenchConnection.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/TorqueProgress.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/TorqueProgress.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/Torque/TorqueProgress.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/TorqueSequenceVisualization.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/TorqueSequenceVisualization.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: SVG missing accessibility attributes
  - *Recommendation*: Add title and description elements to SVG for screen readers

#### components/Torque/TorqueSequenceVisualization.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/TorqueSequenceVisualization.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/TorqueValidationDisplay.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Torque/TorqueValidationDisplay.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/Traceability/GenealogyTreeVisualization.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DataCollectionFormBuilder.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DataCollectionFormBuilder.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DataCollectionFormBuilder.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### components/WorkInstructions/DataCollectionFormBuilder.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DataCollectionFormBuilder.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Drag and drop missing keyboard alternative
  - *Recommendation*: Provide keyboard alternative for drag and drop functionality

#### components/WorkInstructions/DocumentExporter.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DocumentExporter.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DocumentExporter.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DocumentImporter.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DocumentImporter.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DocumentImporter.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/DocumentImporter.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/MediaLibraryBrowser.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/MediaLibraryBrowser.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/MediaLibraryBrowser.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/MediaLibraryBrowser.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/NativeInstructionEditor.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/NativeInstructionEditor.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/NativeInstructionEditor.tsx (LEXICAL)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/NativeInstructionEditor.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/NativeInstructionEditor.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/NativeInstructionEditor.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Drag and drop missing keyboard alternative
  - *Recommendation*: Provide keyboard alternative for drag and drop functionality

#### components/WorkInstructions/ProgressIndicator.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/ProgressIndicator.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/ProgressIndicator.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/StepNavigation.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/StepNavigation.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/StepNavigation.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TabletExecutionView.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TabletExecutionView.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TabletExecutionView.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TabletExecutionView.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TemplateLibrary.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TemplateLibrary.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TemplateLibrary.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/TemplateLibrary.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionForm.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionForm.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionList.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionList.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionList.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionList.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionStepEditor.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionStepEditor.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionStepEditor.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionStepEditor.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/WorkInstructionStepEditor.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/__tests__/ProgressIndicator.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/__tests__/ProgressIndicator.test.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/__tests__/StepNavigation.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/__tests__/StepNavigation.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/__tests__/StepNavigation.test.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/__tests__/StepNavigation.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/plugins/ImagePlugin.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/plugins/ImagePlugin.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/plugins/ImagePlugin.tsx (LEXICAL)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/plugins/ImagePlugin.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkInstructions/plugins/ToolbarPlugin.tsx (LEXICAL)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/plugins/ToolbarPlugin.tsx (CHARTS)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/plugins/VideoPlugin.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/plugins/VideoPlugin.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkInstructions/plugins/VideoPlugin.tsx (LEXICAL)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkOrders/OperatorAssignment.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkOrders/ProductionEntryForm.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### components/WorkOrders/WorkOrderCreate.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkOrders/WorkOrderPriorityChange.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkOrders/WorkOrderPriorityChange.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkOrders/WorkOrderReschedule.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkOrders/WorkOrderReschedule.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### components/WorkOrders/WorkOrderStatusUpdate.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### config/demoCredentials.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### hooks/__tests__/useRealTimeCollaboration.test.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### hooks/useRealTimeCollaboration.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### pages/Admin/AdminPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/AdminPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### pages/Admin/AzureADPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/AzureADPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/PermissionCatalogPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/PermissionCatalogPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/RBACDashboardPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/RBACDashboardPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### pages/Admin/RoleManagementPage.tsx (D3)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/RoleManagementPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/UserRoleAssignmentPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Admin/UserRoleAssignmentPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Dashboard/Dashboard.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Dashboard/Dashboard.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Dashboard/Dashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### pages/Dashboard/__tests__/Dashboard.test.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### pages/Documents/DocumentsPage.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Documents/DocumentsPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Equipment/Equipment.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### pages/FAI/FAICreatePage.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/FAI/FAICreatePage.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/FAI/FAIDetailPage.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/FAI/FAIDetailPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/FAI/FAIListPage.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/FAI/FAIListPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/FAI/FAIListPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Integration/IntegrationConfig.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Integration/IntegrationConfig.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Integration/IntegrationDashboard.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Integration/IntegrationLogs.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Integration/IntegrationLogs.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Kits/KitAnalyticsPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Kits/KitAnalyticsPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### pages/Kits/KitsPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### pages/Operations/OperationCreatePage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Operations/OperationCreatePage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Operations/OperationCreatePage.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Operations/OperationListPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Production/TeamWorkQueue.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Quality/InspectionDetail.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Quality/Inspections.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Quality/Inspections.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Quality/NCRDetail.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Quality/NCRs.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Quality/NCRs.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Quality/Quality.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Routing/RoutingDetailPage.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### pages/Routing/RoutingTemplatesPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Serialization/SerializationListPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Settings/SettingsPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### pages/Signatures/SignatureAuditPage.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Signatures/SignatureAuditPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Signatures/SignatureAuditPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Sprint3Demo/Sprint3Demo.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Staging/StagingPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### pages/Traceability/Traceability.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Traceability/Traceability.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Traceability/Traceability.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Traceability/TraceabilityDetailPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/Traceability/TraceabilityDetailPage.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkInstructions/CollaborativeWorkInstructionDetailPage.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkInstructions/WorkInstructionDetailPage.tsx (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkInstructions/WorkInstructionDetailPage.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkInstructions/WorkInstructionDetailPage.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkInstructions/WorkInstructionExecutePage.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### pages/WorkOrders/WorkOrderDetails.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkOrders/WorkOrderDetails.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkOrders/WorkOrderEdit.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkOrders/WorkOrderExecution.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkOrders/WorkOrders.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/WorkOrders/WorkOrders.tsx (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Missing keyboard navigation support
  - *Recommendation*: Add keyboard event handlers for all interactive elements

#### pages/__tests__/ComponentSmoke.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### services/apiClient.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### services/dashboardApi.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### services/realTimeCollaboration.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### services/workOrderApi.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/equipmentStore.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/executionLayoutStore.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/executionLayoutStore.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/executionLayoutStore.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/kitStore.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/routingStore.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/routingStore.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### store/workInstructionStore.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### test-utils/factories.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### test-utils/helpers.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### test-utils/helpers.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### test-utils/helpers.ts (VIRTUALIZATION)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### test-utils/helpers.ts (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### tests/components/BuildRecordList.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### tests/components/TimeTrackingWidget.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### tests/components/TimeTypeIndicator.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### tests/e2e/collaborative-routing.spec.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility
- **ACCESSIBILITY**: Chart missing accessibility attributes
  - *Recommendation*: Add alt text or aria-label describing chart content

#### tests/e2e/collaborative-routing.spec.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### tests/integration/workInstructions.test.tsx (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### tests/integration/workInstructions.test.tsx (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### tests/integration/workInstructions.test.tsx (DRAG_DROP)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### types/kits.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### types/kits.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### types/kits.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### types/routing.ts (COMPLEX_FORMS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### types/search.ts (D3)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### types/search.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### types/uuid.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### utils/__tests__/uuidUtils.test.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### utils/apiErrorHandler.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### utils/csrfManager.ts (REACTFLOW)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

#### utils/uuidUtils.ts (CHARTS)
- **ACCESSIBILITY**: Missing ARIA attributes for specialized component
  - *Recommendation*: Add appropriate ARIA labels and roles for accessibility

## Recommendations

### Critical Actions Required


### High Priority Actions
1. **Address 843 accessibility issues in specialized components** (Accessibility)
   - Specialized components often have unique accessibility challenges
   - Action: Add ARIA labels, keyboard navigation, and screen reader support
1. **Enhance D3 component reliability and accessibility** (D3 Visualizations)
   - 156 D3 components found
   - Action: Add proper cleanup, accessibility attributes, and responsive behavior

### Medium Priority Actions
1. **Optimize ReactFlow component implementations** (ReactFlow)
   - 84 ReactFlow components found
   - Action: Add node memoization, connection validation, and accessibility features
1. **Improve Monaco Editor integration** (Code Editor)
   - 1 Monaco Editor components found
   - Action: Add proper disposal, loading states, and accessibility support

## Best Practices for Specialized Components

### ReactFlow Components
1. **Performance**: Memoize custom nodes and edges
2. **Accessibility**: Add ARIA labels to nodes and provide keyboard navigation
3. **Validation**: Implement connection validation logic
4. **Responsive**: Ensure proper viewport handling on different screen sizes

### D3 Visualizations
1. **Memory Management**: Always clean up event listeners and DOM elements
2. **Accessibility**: Add SVG titles, descriptions, and ARIA attributes
3. **Performance**: Use data keys for efficient updates
4. **Responsive**: Implement responsive resize handling

### Monaco Editor
1. **Performance**: Dispose editors properly to prevent memory leaks
2. **Accessibility**: Configure editor for screen reader compatibility
3. **Loading**: Show loading states during editor initialization
4. **Themes**: Ensure sufficient color contrast in all themes

### Lexical Editor
1. **Error Handling**: Wrap in error boundaries for robust error handling
2. **Performance**: Debounce onChange events for better performance
3. **Accessibility**: Configure accessibility features and keyboard shortcuts
4. **Plugins**: Use appropriate plugins for required functionality

### Chart Components
1. **Accessibility**: Provide alternative text and data tables
2. **Responsive**: Use ResponsiveContainer for all charts
3. **Colors**: Ensure sufficient contrast and don't rely on color alone
4. **Performance**: Optimize for real-time data updates

### Complex Forms
1. **Error Handling**: Implement comprehensive error boundaries
2. **Performance**: Use lazy validation and form optimization techniques
3. **Accessibility**: Ensure proper form labeling and error announcements
4. **State Management**: Use appropriate state management for complex forms

### Virtualization
1. **Accessibility**: Implement proper ARIA attributes for virtual lists
2. **Keyboard Navigation**: Ensure keyboard navigation works correctly
3. **Performance**: Optimize item rendering and memory usage
4. **Screen Readers**: Provide appropriate announcements for dynamic content

### Drag & Drop
1. **Accessibility**: Always provide keyboard alternatives
2. **Visual Feedback**: Ensure clear visual feedback during drag operations
3. **Touch Support**: Test and optimize for touch devices
4. **Screen Readers**: Implement proper announcements for drag and drop actions

---

*Report generated on 2025-10-31T16:42:15.648Z by MachShop UI Assessment Tool*
