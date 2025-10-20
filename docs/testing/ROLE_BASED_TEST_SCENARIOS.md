# MES Role-Based Test Scenarios
**Version**: 1.0
**Last Updated**: 2025-10-19
**Status**: Initial Draft
**Purpose**: Comprehensive E2E test scenario documentation for all 19 MES user roles

---

## Table of Contents
1. [Overview](#overview)
2. [Role Catalog](#role-catalog)
3. [Testing Methodology](#testing-methodology)
4. [Tier 1: Production Roles](#tier-1-production-roles)
5. [Tier 2: Quality & Compliance](#tier-2-quality--compliance)
6. [Tier 3: Materials & Logistics](#tier-3-materials--logistics)
7. [Tier 4: Maintenance & Equipment](#tier-4-maintenance--equipment)
8. [Tier 5: Administration](#tier-5-administration)
9. [Cross-Role Integration Tests](#cross-role-integration-tests)
10. [Test Data Requirements](#test-data-requirements)
11. [Compliance Matrix](#compliance-matrix)

---

## Overview

This document defines comprehensive End-to-End (E2E) test scenarios for all user roles in the MachShop MES system. The testing strategy ensures:

- **Complete role coverage**: All 19 user personas tested
- **Permission validation**: Role-based access control (RBAC) verified
- **Workflow integrity**: End-to-end business processes validated
- **Compliance readiness**: AS9100, DCMA audit requirements met
- **Data security**: Unauthorized access prevented

### Testing Principles

1. **Persona-Based Testing**: Each role represents a real user with specific job responsibilities
2. **Permission Boundaries**: Tests verify both authorized access AND denial of unauthorized access
3. **Workflow Completeness**: Tests follow realistic business workflows from start to finish
4. **Data Isolation**: Each test uses isolated test data to prevent interference
5. **Audit Compliance**: All actions logged for DCMA/AS9100 compliance verification

---

## Role Catalog

### Tier Classification

| Tier | Priority | Description | Role Count |
|------|----------|-------------|------------|
| **Tier 1** | P0 - Critical | Core production & quality users | 5 |
| **Tier 2** | P1 - High | Compliance & process engineering | 4 |
| **Tier 3** | P1 - High | Materials & logistics | 4 |
| **Tier 4** | P2 - Medium | Maintenance & equipment | 2 |
| **Tier 5** | P2 - Medium | Administration & oversight | 4 |

### Complete Role Matrix

| ID | Role Name | Tier | Primary Module | Key Permissions |
|----|-----------|------|----------------|-----------------|
| 1 | Production Operator | 1 | Work Orders | workorders.read, workinstructions.execute |
| 2 | Production Supervisor | 1 | Work Orders | workorders.*, personnel.assign |
| 3 | Production Planner | 1 | Scheduling | scheduling.*, routings.read |
| 4 | Production Scheduler | 1 | Scheduling | scheduling.*, capacity.read |
| 5 | Manufacturing Engineer | 1 | Routings | routings.*, bom.*, processSegments.* |
| 6 | Quality Engineer | 2 | Quality | quality.*, fai.*, ncr.*, signatures.* |
| 7 | Quality Inspector | 2 | Quality | inspections.*, fai.execute, signatures.sign |
| 8 | DCMA Inspector | 2 | Audit | *.read, audit.export (READ-ONLY) |
| 9 | Process Engineer | 2 | Quality | spc.*, processImprovement.*, yield.* |
| 10 | Warehouse Manager | 3 | Materials | inventory.*, materials.*, warehouse.* |
| 11 | Materials Handler | 3 | Materials | materials.move, inventory.update |
| 12 | Shipping/Receiving Specialist | 3 | Logistics | shipments.*, receiving.*, carriers.* |
| 13 | Logistics Coordinator | 3 | Logistics | logistics.*, shipments.*, tracking.* |
| 14 | Maintenance Technician | 4 | Equipment | equipment.*, maintenance.execute |
| 15 | Maintenance Supervisor | 4 | Equipment | maintenance.*, pmScheduling.* |
| 16 | Plant Manager | 5 | Dashboard | *.read, reports.*, kpi.* |
| 17 | System Administrator | 5 | Admin | *.*, users.*, system.config |
| 18 | Superuser | 5 | Support | *.*, bypass.validations, impersonate.* |
| 19 | Inventory Control Specialist | 5 | Materials | inventory.*, cycleCounts.*, adjustments.* |

---

## Testing Methodology

### Test Structure (Per Role)

Each role section follows this standardized template:

```
## [Role Name]

### 1. Role Profile
### 2. Authentication & Authorization Tests
### 3. Navigation & Menu Visibility Tests
### 4. Permission Boundary Tests
### 5. CRUD Operation Tests
### 6. Data Entry & Form Validation Tests
### 7. Workflow Execution Tests
### 8. Reporting & Export Tests
### 9. Integration Points
### 10. Compliance & Audit Tests
```

### Test Case Format

```markdown
**Test ID**: [ROLE]-[MODULE]-[NUMBER]
**Priority**: P0/P1/P2
**Type**: Functional/Security/Integration
**Preconditions**: [Setup required]
**Steps**: [Detailed steps]
**Expected Result**: [What should happen]
**Actual Result**: [Leave blank for execution]
**Pass/Fail**: [Leave blank for execution]
```

---

## Tier 1: Production Roles

---

## Role 1: Production Operator

### 1. Role Profile

**Primary Responsibilities**:
- Execute work orders assigned to their station
- Follow digital work instructions step-by-step
- Scan material/serial numbers for traceability
- Record actual quantities, scrap, and downtime
- Report quality issues and equipment problems

**Business Context**:
- Shop floor personnel operating CNC machines, assembly stations, inspection cells
- Typically works on one work center/cell
- Limited administrative access - focused on execution
- High-frequency users (login/logout multiple times per shift)

**Access Level**:
- **Read**: Work orders (assigned to them), work instructions, material lists, equipment status
- **Write**: Work order actuals (qty completed/scrapped), time logs, equipment downtime
- **Delete**: None
- **Special**: Cannot release work orders, cannot modify routings

**Compliance Requirements**:
- All actions logged for traceability
- Electronic signature required for critical steps (if configured)
- Cannot bypass quality holds

---

### 2. Authentication & Authorization Tests

**Test ID**: PROD-OP-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Successful login with valid credentials
**Steps**:
1. Navigate to login page
2. Enter username: `john.doe`
3. Enter password: `password123`
4. Click "Login" button
**Expected Result**: Redirected to Dashboard, user menu shows "John Doe (Production Operator)"

**Test ID**: PROD-OP-AUTH-002
**Priority**: P0
**Type**: Security
**Test**: Failed login with invalid password
**Steps**:
1. Navigate to login page
2. Enter username: `john.doe`
3. Enter password: `wrongpassword`
4. Click "Login" button
**Expected Result**: Error message "Invalid username or password", remains on login page

**Test ID**: PROD-OP-AUTH-003
**Priority**: P1
**Type**: Security
**Test**: Account lockout after 5 failed attempts
**Steps**:
1. Attempt login with wrong password 5 times
2. Attempt login with correct password on 6th try
**Expected Result**: Account locked message, cannot login even with correct password

**Test ID**: PROD-OP-AUTH-004
**Priority**: P1
**Type**: Functional
**Test**: Session timeout after 30 minutes of inactivity
**Steps**:
1. Login successfully
2. Wait 30 minutes without any interaction
3. Click any menu item
**Expected Result**: Redirected to login page with "Session expired" message

---

### 3. Navigation & Menu Visibility Tests

**Test ID**: PROD-OP-NAV-001
**Priority**: P0
**Type**: Functional
**Test**: Verify operator menu structure
**Expected Menu Items**:
- ✅ Dashboard (visible)
- ✅ Work Orders (visible)
- ❌ Process Segments (hidden - planner only)
- ❌ Routings (hidden - engineer only)
- ❌ Scheduling (hidden - planner only)
- ❌ Quality > Inspections (hidden - inspector only)
- ❌ Quality > NCRs (hidden - engineer only)
- ❌ FAI Reports (hidden - engineer only)
- ✅ Materials (visible - may need to scan/lookup)
- ✅ Traceability (visible - may need to view)
- ❌ Personnel (hidden - manager only)
- ❌ Equipment (hidden - may be read-only)
- ✅ Serialization (visible - if they scan serial numbers)
- ✅ Work Instructions (visible)
- ❌ Integrations (hidden - admin only)
- ❌ Admin (hidden - admin only)

**Test ID**: PROD-OP-NAV-002
**Priority**: P0
**Type**: Security
**Test**: Cannot access hidden menu items via direct URL
**Steps**:
1. Login as Production Operator
2. Manually navigate to `/admin`
3. Manually navigate to `/quality/ncrs`
4. Manually navigate to `/routings`
**Expected Result**: All attempts show "Access Denied" or redirect to Dashboard

---

### 4. Permission Boundary Tests

**Test ID**: PROD-OP-PERM-001
**Priority**: P0
**Type**: Security
**Test**: Cannot release work order (requires supervisor)
**Steps**:
1. Navigate to Work Orders list
2. Click on work order with status "CREATED"
3. Look for "Release to Production" button
**Expected Result**: Button is not visible or disabled

**Test ID**: PROD-OP-PERM-002
**Priority**: P0
**Type**: Security
**Test**: Cannot delete work orders
**Steps**:
1. Navigate to Work Orders list
2. Look for delete button/action on any work order
**Expected Result**: Delete button/action not present

**Test ID**: PROD-OP-PERM-003
**Priority**: P0
**Type**: Security
**Test**: Cannot create/edit routings
**Steps**:
1. Attempt to navigate to `/routings/create`
2. If routings page accessible (read-only), look for edit buttons
**Expected Result**: Access denied OR edit/create buttons not visible

**Test ID**: PROD-OP-PERM-004
**Priority**: P1
**Type**: Security
**Test**: Cannot modify quality inspection results
**Steps**:
1. Navigate to a quality inspection (if readable)
2. Look for edit/modify options
**Expected Result**: Inspection is read-only, no edit buttons

---

### 5. CRUD Operation Tests

#### Can CREATE:
- ✅ Time log entries (clock in/out)
- ✅ Equipment downtime reports
- ✅ Quality issue reports (if enabled)

#### Can READ:
- ✅ Work orders assigned to their station/work center
- ✅ Work instructions for active work orders
- ✅ Material lists and lot numbers
- ✅ Equipment status/availability
- ✅ Serialized part information (when scanning)

#### Can UPDATE:
- ✅ Work order actuals (qty completed, qty scrapped)
- ✅ Material consumption (scan lot numbers)
- ✅ Work instruction step completion
- ✅ Own time logs (if not clocked out)

#### Can DELETE:
- ❌ None (operators cannot delete records)

**Test ID**: PROD-OP-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: View assigned work orders
**Steps**:
1. Login as Production Operator
2. Navigate to Work Orders page
3. Apply filter: "Assigned to Me"
**Expected Result**: List shows only work orders assigned to operator's work center, with statuses RELEASED, IN_PROGRESS

**Test ID**: PROD-OP-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: Record work order completion qty
**Steps**:
1. Navigate to Work Orders
2. Select work order with status IN_PROGRESS
3. Click "Record Production"
4. Enter quantity completed: 10
5. Click "Submit"
**Expected Result**: Success message, work order actuals updated, audit trail logged

---

### 6. Data Entry & Form Validation Tests

**Test ID**: PROD-OP-FORM-001
**Priority**: P0
**Type**: Functional
**Test**: Cannot enter negative quantity completed
**Steps**:
1. On Record Production form
2. Enter quantity: -5
3. Click Submit
**Expected Result**: Validation error "Quantity must be positive"

**Test ID**: PROD-OP-FORM-002
**Priority**: P0
**Type**: Functional
**Test**: Cannot exceed work order quantity
**Steps**:
1. Work order qty = 100, already completed = 95
2. Enter quantity: 10 (would total 105)
3. Click Submit
**Expected Result**: Warning "Total would exceed order quantity. Continue?" OR validation error

**Test ID**: PROD-OP-FORM-003
**Priority**: P1
**Type**: Functional
**Test**: Serial number must be scanned (if enabled)
**Steps**:
1. For serialized part work order
2. Attempt to manually type serial number
**Expected Result**: Serial number field accepts scanned barcode only (or validation warning)

---

### 7. Workflow Execution Tests

**Test ID**: PROD-OP-WORKFLOW-001
**Priority**: P0
**Type**: Integration
**Test**: Complete work instruction execution
**Workflow**: Operator executes digital work instruction from start to finish
**Steps**:
1. Login as Production Operator
2. Navigate to Work Instructions
3. Click on assigned work instruction
4. Click "Start Execution"
5. Complete Step 1: Read instruction, click "Complete Step"
6. Complete Step 2: Scan material barcode
7. Complete Step 3: Record measurement value
8. Click "Finish Execution"
**Expected Result**:
- Work instruction status changes to COMPLETED
- All step completions timestamped
- Material scan logged to traceability
- Measurement recorded in quality database
- Operator electronic signature captured (if required)

**Test ID**: PROD-OP-WORKFLOW-002
**Priority**: P0
**Type**: Integration
**Test**: Report equipment downtime
**Workflow**: Machine breaks down, operator reports downtime
**Steps**:
1. Navigate to Equipment page
2. Select machine "CNC-001"
3. Click "Report Downtime"
4. Select reason: "Mechanical Failure"
5. Enter description: "Spindle seized"
6. Click "Submit"
**Expected Result**:
- Equipment status changes to "DOWN"
- Downtime event created with timestamp
- Maintenance work order auto-generated (if configured)
- Production supervisor notified

---

### 8. Reporting & Export Tests

**Test ID**: PROD-OP-REPORT-001
**Priority**: P2
**Type**: Functional
**Test**: View personal production history
**Steps**:
1. Navigate to Dashboard
2. View "My Production" widget
**Expected Result**: Chart/table showing operator's completed quantities by day/week

**Test ID**: PROD-OP-REPORT-002
**Priority**: P2
**Type**: Functional
**Test**: Export cannot access sensitive reports
**Steps**:
1. Look for "Reports" menu or export buttons
**Expected Result**: Operator cannot access plant-wide KPIs, cost reports, or sensitive data

---

### 9. Integration Points

**Systems Accessed**:
- **MES Core**: Work order management, work instructions
- **Traceability**: Material lot scanning, serial number generation
- **Equipment**: Status viewing, downtime reporting
- **Quality** (Read-Only): May view inspection requirements

**External Systems**:
- **Barcode Scanner**: Material/serial number scanning
- **Shop Floor Terminal**: Clock in/out via badge scan
- **SCADA/PLC** (Indirect): Equipment data collected automatically

---

### 10. Compliance & Audit Tests

**Test ID**: PROD-OP-AUDIT-001
**Priority**: P1
**Type**: Compliance
**Test**: All actions logged to audit trail
**Steps**:
1. Login as Production Operator
2. Record production qty
3. Complete work instruction
4. Report downtime
5. Login as System Admin
6. Navigate to Audit Trail
7. Filter by user: john.doe
**Expected Result**: All 3 actions visible with timestamp, user, action type, affected records

**Test ID**: PROD-OP-AUDIT-002
**Priority**: P1
**Type**: Compliance
**Test**: Electronic signature required for critical steps (AS9100)
**Steps**:
1. Execute work instruction with critical step flagged
2. Attempt to complete step without signature
**Expected Result**: Signature modal appears, cannot proceed without password re-entry

---

## Role 2: Production Supervisor

### 1. Role Profile

**Primary Responsibilities**:
- Release work orders to production floor
- Assign work orders to specific operators/work centers
- Monitor shop floor KPIs (OEE, throughput, on-time delivery)
- Manage shift personnel and resolve bottlenecks
- Approve/reject quality holds and production variances
- Handle emergency production changes

**Business Context**:
- First-line management overseeing 10-50 operators
- Balances production efficiency with quality requirements
- Interfaces between planning and execution
- Handles real-time problem-solving on the floor

**Access Level**:
- **Read**: All work orders, all work instructions, equipment status, personnel schedules
- **Write**: Work order status changes, personnel assignments, production approvals
- **Delete**: Can cancel work orders (with justification)
- **Special**: Can override certain validations, approve variances

**Compliance Requirements**:
- Approvals logged for audit (DCMA may review)
- Cannot modify quality inspection results
- Cannot delete traceability records

---

### 2. Authentication & Authorization Tests

**Test ID**: PROD-SUP-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Supervisor can access production management features
**Steps**:
1. Login as Production Supervisor (credentials: TBD)
2. Navigate to Dashboard
**Expected Result**: Dashboard shows supervisor-specific widgets: Shop Floor Status, Personnel Assignments, Production Alerts

**Test ID**: PROD-SUP-AUTH-002
**Priority**: P0
**Type**: Security
**Test**: Multi-work center visibility
**Steps**:
1. Login as Production Supervisor
2. Navigate to Work Orders
**Expected Result**: Can see work orders across all work centers in their department (not just one station)

---

### 3. Navigation & Menu Visibility Tests

**Test ID**: PROD-SUP-NAV-001
**Priority**: P0
**Type**: Functional
**Test**: Supervisor menu includes management features
**Expected Menu Items**:
- ✅ Dashboard
- ✅ Work Orders (with Release button visible)
- ✅ Process Segments (read-only, for reference)
- ❌ Routings (hidden - engineer only)
- ❌ Scheduling (hidden - planner only, but may view read-only)
- ✅ Quality > Inspections (can view status)
- ❌ Quality > NCRs (read-only)
- ❌ FAI Reports (read-only)
- ✅ Materials
- ✅ Traceability
- ✅ Personnel (assign operators)
- ✅ Equipment (view all equipment)
- ✅ Work Instructions
- ❌ Integrations (hidden)
- ❌ Admin (hidden)

---

### 4. Permission Boundary Tests

**Test ID**: PROD-SUP-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CAN release work orders to production
**Steps**:
1. Navigate to Work Orders
2. Filter by status: CREATED
3. Click on work order
4. Look for "Release to Production" button
**Expected Result**: Button is visible and enabled

**Test ID**: PROD-SUP-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN assign work orders to work centers
**Steps**:
1. Navigate to Work Orders
2. Click on RELEASED work order
3. Click "Assign"
4. Select work center from dropdown
5. Click "Save"
**Expected Result**: Work order assigned, operator sees it in "Assigned to Me"

**Test ID**: PROD-SUP-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CANNOT modify routings (engineer only)
**Steps**:
1. Navigate to Routings page (if visible)
2. Click on routing
3. Look for Edit button
**Expected Result**: Edit button not visible OR access denied

**Test ID**: PROD-SUP-PERM-004
**Priority**: P1
**Type**: Security
**Test**: CANNOT create/modify quality plans
**Steps**:
1. Navigate to Quality section
2. Attempt to create inspection plan
**Expected Result**: Access denied or button not visible

---

### 5. CRUD Operation Tests

#### Can CREATE:
- ✅ Production assignments
- ✅ Shop floor alerts/notifications
- ✅ Equipment downtime reports (escalated)

#### Can READ:
- ✅ All work orders in their department
- ✅ All work instructions
- ✅ Equipment status and OEE
- ✅ Personnel schedules and availability
- ✅ Production KPIs and dashboards

#### Can UPDATE:
- ✅ Work order status (CREATED → RELEASED, HOLD → RELEASED)
- ✅ Work order assignments
- ✅ Production priorities
- ✅ Personnel shift assignments

#### Can DELETE:
- ✅ Work orders (CREATED status only, with reason code)
- ⚠️ Work order assignments (reassign)

**Test ID**: PROD-SUP-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: Release work order to production
**Steps**:
1. Navigate to Work Orders
2. Filter by status: CREATED
3. Click on work order "WO-2024-001"
4. Click "Release to Production"
5. Confirm action
**Expected Result**:
- Work order status changes to RELEASED
- Work order appears in production schedule
- Materials reserved (if MRP enabled)
- Audit trail logged

**Test ID**: PROD-SUP-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: Put work order on hold
**Steps**:
1. Navigate to work order with status IN_PROGRESS
2. Click "Hold"
3. Select reason: "Material Shortage"
4. Enter notes
5. Confirm
**Expected Result**:
- Work order status = ON_HOLD
- Operator cannot continue production
- Supervisor notified
- Hold reason logged

---

### 6. Data Entry & Form Validation Tests

**Test ID**: PROD-SUP-FORM-001
**Priority**: P1
**Type**: Functional
**Test**: Must provide reason when canceling work order
**Steps**:
1. Click "Cancel Work Order"
2. Leave reason dropdown blank
3. Click Submit
**Expected Result**: Validation error "Reason is required"

**Test ID**: PROD-SUP-FORM-002
**Priority**: P1
**Type**: Functional
**Test**: Cannot release work order without materials
**Steps**:
1. Work order requires Material X (not in stock)
2. Click "Release to Production"
**Expected Result**: Warning "Material not available. Release anyway?" (soft validation)

---

### 7. Workflow Execution Tests

**Test ID**: PROD-SUP-WORKFLOW-001
**Priority**: P0
**Type**: Integration
**Test**: Full work order lifecycle - Create to Complete
**Workflow**: Supervisor releases work order, operator executes, supervisor reviews
**Steps**:
1. **Supervisor**: Release WO-001 to production
2. **Supervisor**: Assign to Work Center "Assembly-01"
3. **Operator** (switch user): Execute work order, record qty = 100
4. **Supervisor** (switch back): View completion, verify qty
**Expected Result**:
- Work order progresses CREATED → RELEASED → IN_PROGRESS → COMPLETED
- All transitions logged
- Supervisor can view operator actuals

**Test ID**: PROD-SUP-WORKFLOW-002
**Priority**: P0
**Type**: Integration
**Test**: Handle quality hold escalation
**Workflow**: Inspector places hold, supervisor reviews and releases
**Steps**:
1. **Quality Inspector** (setup): Place quality hold on WO-001
2. **Supervisor** (login): Navigate to Quality Holds dashboard
3. See WO-001 listed with reason "Dimension out of tolerance"
4. Review nonconformance details
5. Click "Release Hold" (after corrective action)
6. Enter justification
7. Confirm release
**Expected Result**:
- Work order status returns to IN_PROGRESS
- Hold duration tracked
- Supervisor approval logged

---

### 8. Reporting & Export Tests

**Test ID**: PROD-SUP-REPORT-001
**Priority**: P1
**Type**: Functional
**Test**: View shift production summary
**Steps**:
1. Navigate to Dashboard
2. View "Shift Summary" widget
**Expected Result**: Shows qty produced, scrap, downtime for current shift by work center

**Test ID**: PROD-SUP-REPORT-002
**Priority**: P1
**Type**: Functional
**Test**: Export production report to PDF
**Steps**:
1. Navigate to Reports > Production
2. Select date range: Last 7 days
3. Click "Export PDF"
**Expected Result**: PDF downloads with production metrics, charts

---

### 9. Integration Points

**Systems Accessed**:
- **MES Core**: Work order management, status changes
- **Personnel**: Operator assignments, shift schedules
- **Equipment**: OEE monitoring, downtime tracking
- **Quality**: Hold management (review only)

**External Systems**:
- **ERP**: Work order creation (may come from ERP)
- **Notification System**: Alerts to management

---

### 10. Compliance & Audit Tests

**Test ID**: PROD-SUP-AUDIT-001
**Priority**: P1
**Type**: Compliance
**Test**: Work order releases logged for DCMA audit
**Steps**:
1. Supervisor releases 3 work orders
2. Login as DCMA Inspector
3. Navigate to Audit Trail
4. Filter: Action = "Work Order Released"
**Expected Result**: All 3 releases visible with supervisor name, timestamp, work order details

---

## Role 3: Production Planner

### 1. Role Profile

**Primary Responsibilities**:
- Create production schedules based on demand forecasts and capacity
- Manage routings and process segments for parts
- Perform capacity planning and load balancing across work centers
- Coordinate with procurement for material availability
- Adjust schedules for expedites, delays, and disruptions

**Business Context**:
- Planning horizon: 1 week to 3 months
- Interfaces with sales, procurement, engineering
- Critical role for on-time delivery
- Balances customer demands with resource constraints

**Access Level**:
- **Read**: Work orders, routings, capacity, inventory levels, equipment availability
- **Write**: Production schedules, routing assignments, capacity allocations
- **Delete**: Draft schedules (not published)
- **Special**: Can create "What-if" scenarios for planning

**Compliance Requirements**:
- Schedule changes must be justified
- Cannot modify released work orders without approval
- Material changes must update BOM (coordinate with engineering)

---

### 2. Authentication & Authorization Tests

**Test ID**: PROD-PLAN-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Planner accesses scheduling module
**Steps**:
1. Login as Production Planner
2. Navigate to /scheduling
**Expected Result**: Scheduling page loads, shows production calendar

---

### 3. Navigation & Menu Visibility Tests

**Test ID**: PROD-PLAN-NAV-001
**Priority**: P0
**Type**: Functional
**Test**: Planner menu includes planning tools
**Expected Menu Items**:
- ✅ Dashboard
- ✅ Work Orders (can view all)
- ✅ Process Segments (full access)
- ✅ Routings (full access)
- ✅ Scheduling (full access)
- ❌ Quality (read-only at best)
- ✅ Materials (for MRP planning)
- ✅ Traceability (read-only)
- ❌ Personnel (read-only, for capacity)
- ✅ Equipment (for capacity planning)
- ❌ Integrations
- ❌ Admin

---

### 4. Permission Boundary Tests

**Test ID**: PROD-PLAN-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CAN create/edit routings
**Steps**:
1. Navigate to /routings
2. Click "Create Routing"
**Expected Result**: Form opens, can create new routing

**Test ID**: PROD-PLAN-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN modify production schedule
**Steps**:
1. Navigate to Scheduling
2. Drag work order to different date/time
3. Click "Save Schedule"
**Expected Result**: Schedule updated successfully

**Test ID**: PROD-PLAN-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CANNOT approve quality inspections
**Steps**:
1. Navigate to Quality > Inspections (if visible)
2. Click on pending inspection
**Expected Result**: Approve button not visible OR access denied

---

### 5. CRUD Operation Tests

#### Can CREATE:
- ✅ Production schedules
- ✅ Routings for new parts
- ✅ Process segments
- ✅ Capacity plans

#### Can READ:
- ✅ All work orders (any status)
- ✅ All routings and BOMs
- ✅ Equipment capacity and utilization
- ✅ Material inventory levels
- ✅ Customer demand forecasts

#### Can UPDATE:
- ✅ Production schedules (shift dates, priorities)
- ✅ Routings (add/remove operations)
- ✅ Process segment parameters
- ✅ Work order priorities

#### Can DELETE:
- ✅ Draft schedules
- ✅ Unused routings
- ❌ Released work orders
- ❌ Historical production data

**Test ID**: PROD-PLAN-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: Create new routing for part
**Steps**:
1. Navigate to /routings
2. Click "Create Routing"
3. Enter:
   - Part Number: PN-12345
   - Description: "Machining sequence for bracket"
   - Operation 1: "CNC Milling", Work Center: "CNC-001", Cycle Time: 15 min
   - Operation 2: "Deburring", Work Center: "Finishing-01", Cycle Time: 5 min
4. Click "Save"
**Expected Result**:
- Routing created with 2 operations
- Can assign to work orders
- Appears in routing library

**Test ID**: PROD-PLAN-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: Create production schedule
**Steps**:
1. Navigate to /scheduling
2. Click "Create Schedule"
3. Select work orders: WO-001, WO-002, WO-003
4. Set schedule period: Next 2 weeks
5. Click "Auto-Schedule" (algorithm assigns dates/times)
6. Review and adjust manually if needed
7. Click "Publish Schedule"
**Expected Result**:
- Work orders scheduled across work centers
- Resource conflicts highlighted
- Schedule published, supervisors notified

---

### 6. Data Entry & Form Validation Tests

**Test ID**: PROD-PLAN-FORM-001
**Priority**: P1
**Type**: Functional
**Test**: Cannot schedule work order without routing
**Steps**:
1. Create work order for part with no routing
2. Attempt to add to schedule
**Expected Result**: Error "Routing required before scheduling"

**Test ID**: PROD-PLAN-FORM-002
**Priority**: P1
**Type**: Functional
**Test**: Capacity validation on scheduling
**Steps**:
1. Work center capacity = 8 hours/day
2. Schedule 3 work orders totaling 10 hours for same day
**Expected Result**: Warning "Capacity exceeded by 2 hours" (soft warning)

---

### 7. Workflow Execution Tests

**Test ID**: PROD-PLAN-WORKFLOW-001
**Priority**: P0
**Type**: Integration
**Test**: End-to-end routing creation and usage
**Workflow**: Create routing → Create work order → Schedule → Execute
**Steps**:
1. **Planner**: Create routing for PN-WIDGET (3 operations)
2. **Planner**: Create work order for 100 ea of PN-WIDGET
3. **Planner**: Add to production schedule for next Monday
4. **Supervisor** (switch user): Release work order Monday morning
5. **Operator** (switch user): Execute per routing
**Expected Result**:
- Routing flows through entire process
- Work order follows routing sequence
- Cycle times match planned vs actual

---

### 8. Reporting & Export Tests

**Test ID**: PROD-PLAN-REPORT-001
**Priority**: P1
**Type**: Functional
**Test**: View capacity utilization report
**Steps**:
1. Navigate to Reports > Capacity
2. Select date range: Next month
3. View utilization by work center
**Expected Result**: Chart shows % utilization, identifies bottlenecks

---

### 9. Integration Points

**Systems Accessed**:
- **MES Core**: Scheduling, routings, work orders
- **Materials**: Inventory availability for MRP
- **Equipment**: Capacity and uptime data

**External Systems**:
- **ERP**: Demand forecasts, customer orders
- **PLM**: Part BOMs and engineering data

---

### 10. Compliance & Audit Tests

**Test ID**: PROD-PLAN-AUDIT-001
**Priority**: P2
**Type**: Compliance
**Test**: Routing changes logged
**Steps**:
1. Edit routing: Change cycle time from 15 min to 20 min
2. Save
3. View audit trail
**Expected Result**: Change logged with old value, new value, planner name, timestamp

---

## Role 4: Production Scheduler

### 1. Role Profile

**Primary Responsibilities**:
- **Daily and hourly production scheduling** - Sequence work orders for optimal throughput
- Monitor real-time shop floor capacity and adjust schedules
- Balance workload across work centers to prevent bottlenecks
- Manage hot jobs and expedite rush orders
- Coordinate with production supervisors on schedule changes
- Track schedule adherence and on-time delivery
- Handle schedule disruptions (equipment down, material shortage)
- Optimize sequence to minimize setup/changeover times

**Business Context**:
- Tactical, short-term focus (today/this week vs. next month)
- Works within capacity plan created by Production Planner
- Needs real-time visibility into shop floor status
- Makes quick decisions based on current conditions
- Coordinates directly with supervisors and operators

**Access Level**:
- **Read**: Work orders, equipment status, material availability, current WIP
- **Write**: Work order priorities, scheduled dates, sequence order
- **Cannot**: Create work orders (planner does), modify routings (engineer does)
- **Special**: Can expedite/de-expedite orders, change work center assignments

**Compliance Requirements**:
- Schedule changes logged for production history tracking
- Hot jobs require justification for audit trail
- On-time delivery KPIs tracked for customer compliance

---

### 2. Authentication & Authorization Tests

**Test ID**: SCHED-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Production Scheduler can access scheduling dashboard
**Steps**:
1. Login as Production Scheduler
2. Navigate to /scheduling
**Expected Result**: Scheduling page loads with drag-and-drop Gantt chart

**Test ID**: SCHED-AUTH-002
**Priority**: P0
**Type**: Security
**Test**: CANNOT access admin functions
**Steps**:
1. Login as Production Scheduler
2. Attempt to navigate to /admin
**Expected Result**: "Access Denied" or redirect to dashboard

---

### 3. Navigation & Menu Visibility Tests

**Test ID**: SCHED-NAV-001
**Priority**: P0
**Type**: UI
**Test**: Verify correct menu items visible
**Steps**:
1. Login as Production Scheduler
2. Check main menu
**Expected Result**: Menu shows: Dashboard, Work Orders, Scheduling, Equipment, Materials (no Quality, no Admin)

---

### 4. Permission Boundary Tests

**Test ID**: SCHED-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CAN change work order priority
**Steps**:
1. Navigate to /workorders
2. Select work order WO-1001
3. Change priority from "Normal" to "Hot"
4. Save
**Expected Result**: Priority updated, change logged in audit trail

**Test ID**: SCHED-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN reschedule work order dates
**Steps**:
1. Navigate to /scheduling
2. Drag work order WO-1002 from tomorrow to today
3. Confirm reschedule
**Expected Result**: Scheduled date updated, notification sent to supervisor

**Test ID**: SCHED-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CANNOT create new work orders
**Steps**:
1. Navigate to /workorders
2. Look for "Create Work Order" button
**Expected Result**: Button is HIDDEN or DISABLED for scheduler role

**Test ID**: SCHED-PERM-004
**Priority**: P0
**Type**: Security
**Test**: CANNOT modify routings
**Steps**:
1. Navigate to /routings
2. Look for "Edit" buttons on routings
**Expected Result**: Routings visible in read-only mode, no edit buttons

---

### 5. CRUD Operation Tests

**Test ID**: SCHED-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: Read work order details
**Steps**:
1. Navigate to /workorders
2. Click on work order WO-1001
**Expected Result**: Full work order details displayed including routing, materials, current status

**Test ID**: SCHED-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: Update work order sequence
**Steps**:
1. Navigate to /scheduling
2. Work center CNC-01 has 5 work orders queued
3. Drag WO-1005 to position #1 (highest priority)
4. Save sequence
**Expected Result**: Work order sequence saved, operator sees WO-1005 first in queue

**Test ID**: SCHED-CRUD-003
**Priority**: P1
**Type**: Functional
**Test**: Reassign work order to different work center
**Steps**:
1. Work order WO-1010 scheduled for CNC-01 (down for maintenance)
2. Scheduler reassigns to CNC-02 (has capacity)
3. Update scheduled start time
4. Save
**Expected Result**: Work order moved to CNC-02 queue, supervisor notified

---

### 6. Data Entry & Form Validation Tests

**Test ID**: SCHED-FORM-001
**Priority**: P1
**Type**: Validation
**Test**: Cannot schedule work order before current date
**Steps**:
1. Select work order WO-1001
2. Change scheduled date to yesterday
3. Click Save
**Expected Result**: Validation error "Cannot schedule work orders in the past"

**Test ID**: SCHED-FORM-002
**Priority**: P1
**Type**: Validation
**Test**: Capacity warning when overloading work center
**Steps**:
1. Work center CNC-01 has 8 hours capacity today
2. Already scheduled: 6 hours of work
3. Scheduler adds 4-hour job (total = 10 hours)
4. Save
**Expected Result**: Warning "Work center CNC-01 overloaded by 2 hours. Continue?" - can proceed with justification

**Test ID**: SCHED-FORM-003
**Priority**: P1
**Type**: Validation
**Test**: Cannot schedule work order without required materials
**Steps**:
1. Work order WO-1015 requires Material M-500 (qty: 10)
2. Inventory shows qty: 0 (out of stock)
3. Scheduler tries to schedule for today
4. Save
**Expected Result**: Warning "Material M-500 not available. Expected delivery: [date]" - can schedule but flagged

---

### 7. Workflow Execution Tests

**Test ID**: SCHED-WORK-001
**Priority**: P0
**Type**: Workflow
**Test**: Expedite hot job through schedule
**Steps**:
1. Customer calls: "Need Part PN-URGENT by end of day!"
2. Scheduler finds work order WO-HOT-001
3. Mark priority: "Hot"
4. Move to top of CNC-01 queue
5. Notify supervisor via system alert
**Expected Result**: Work order at position #1, supervisor sees notification, hot job icon displayed

**Test ID**: SCHED-WORK-002
**Priority**: P0
**Type**: Workflow
**Test**: React to equipment downtime
**Steps**:
1. Scheduler monitoring dashboard
2. Alert: "CNC-01 down for maintenance - 4 hours"
3. Scheduler views 8 work orders queued for CNC-01
4. Reassigns 3 urgent jobs to CNC-02 and CNC-03
5. Reschedules 5 non-urgent jobs for tomorrow
**Expected Result**: All work orders reassigned/rescheduled, supervisors notified, schedule conflict resolved

**Test ID**: SCHED-WORK-003
**Priority**: P1
**Type**: Workflow
**Test**: Balance workload across shifts
**Steps**:
1. Day shift: 90% capacity utilization
2. Evening shift: 40% capacity utilization
3. Scheduler moves 3 non-urgent jobs from day to evening
4. Save balanced schedule
**Expected Result**: Shift utilization: Day 75%, Evening 65%, improved balance

**Test ID**: SCHED-WORK-004
**Priority**: P1
**Type**: Workflow
**Test**: Optimize sequence to minimize setups
**Steps**:
1. CNC-01 queue has jobs for 3 different part families
2. Current sequence requires 4 setups (45 min each = 3 hours)
3. Scheduler reorders by part family
4. New sequence requires 2 setups (90 min total)
**Expected Result**: Setup time reduced by 50%, throughput improved

---

### 8. Reporting & Export Tests

**Test ID**: SCHED-RPT-001
**Priority**: P1
**Type**: Reporting
**Test**: View schedule adherence report
**Steps**:
1. Navigate to /scheduling/reports
2. Select "Schedule Adherence - Last 7 Days"
3. View report
**Expected Result**: Shows:
- Total work orders: 50
- On-time completions: 42 (84%)
- Late completions: 8 (16%)
- Breakdown by reason (material, equipment, quality hold)

**Test ID**: SCHED-RPT-002
**Priority**: P1
**Type**: Reporting
**Test**: Export daily schedule to PDF
**Steps**:
1. Navigate to /scheduling
2. Filter: Today's schedule for all work centers
3. Click "Export PDF"
**Expected Result**: PDF generated with Gantt chart, work order list, supervisor can print for shop floor

**Test ID**: SCHED-RPT-003
**Priority**: P1
**Type**: Reporting
**Test**: View work center utilization dashboard
**Steps**:
1. Navigate to /scheduling/utilization
2. Select date range: This week
**Expected Result**: Bar chart showing:
- Each work center's capacity utilization %
- Overloaded work centers in red
- Underutilized work centers in yellow
- Optimal utilization (70-85%) in green

---

### 9. Integration Points

**Test ID**: SCHED-INT-001
**Priority**: P1
**Type**: Integration
**Test**: Receive material shortage alerts from Inventory
**Steps**:
1. Work order WO-1020 scheduled for tomorrow
2. Requires Material M-750 (qty: 20)
3. Inventory system updates: M-750 qty drops to 5
4. Scheduler receives alert
**Expected Result**: Alert displayed: "Material shortage - WO-1020 at risk" with option to reschedule

**Test ID**: SCHED-INT-002
**Priority**: P1
**Type**: Integration
**Test**: Receive equipment status updates from Maintenance
**Steps**:
1. Maintenance completes repair on CNC-01
2. Equipment status changes: DOWN → AVAILABLE
3. Scheduler dashboard auto-updates
**Expected Result**: CNC-01 shows green "Available" status, scheduler can resume scheduling

**Test ID**: SCHED-INT-003
**Priority**: P1
**Type**: Integration
**Test**: Sync schedule changes to Production Supervisor tablets
**Steps**:
1. Scheduler changes work order sequence
2. Supervisor viewing /workorders on tablet
**Expected Result**: Tablet auto-refreshes, new sequence visible immediately, notification badge appears

---

### 10. Compliance & Audit Tests

**Test ID**: SCHED-AUDIT-001
**Priority**: P1
**Type**: Audit
**Test**: All schedule changes logged for traceability
**Steps**:
1. Scheduler changes WO-1001 from tomorrow → today
2. Navigate to /audit/schedule-changes
3. Filter: WO-1001
**Expected Result**: Log entry shows:
- Timestamp: 2025-10-19 14:30
- User: production.scheduler
- Action: "Rescheduled from 2025-10-20 → 2025-10-19"
- Reason: "Customer expedite request"

**Test ID**: SCHED-AUDIT-002
**Priority**: P1
**Type**: Audit
**Test**: Hot job justifications documented
**Steps**:
1. Scheduler marks WO-HOT-002 as "Hot"
2. System prompts: "Justification required for hot jobs"
3. Enter: "Customer PO penalty clause - $5K/day after 10/20"
4. Save
**Expected Result**: Hot job status saved with justification in audit trail

---

## Role 5: Manufacturing Engineer

### 1. Role Profile

**Primary Responsibilities**:
- **Route management for specific parts** - Create, maintain, and optimize manufacturing routings
- Define Bill of Materials (BOM) for assemblies
- Design process segments and operation sequences
- Specify tooling, fixtures, and equipment requirements
- Optimize cycle times and improve manufacturing efficiency
- Conduct time studies and process validations
- Support new product introductions (NPI)

**Business Context**:
- Technical expert for manufacturing processes
- Bridges design engineering and production
- Responsible for "how" products are made
- Drives continuous improvement initiatives
- Works with quality on process capability studies

**Access Level**:
- **Read**: All work orders, quality data, equipment performance
- **Write**: Routings, BOMs, process segments, work instructions
- **Delete**: Obsolete routings (with revision control)
- **Special**: Can create routing revisions, activate/deactivate routings

**Compliance Requirements**:
- Routing changes require engineering change notice (ECN)
- Must maintain revision history for AS9100
- Process validations documented for DCMA audit

---

### 2. Authentication & Authorization Tests

**Test ID**: MFG-ENG-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Manufacturing Engineer can access routing management
**Steps**:
1. Login as Manufacturing Engineer
2. Navigate to /routings
**Expected Result**: Routings page loads with full CRUD access

---

### 3. Navigation & Menu Visibility Tests

**Test ID**: MFG-ENG-NAV-001
**Priority**: P0
**Type**: Functional
**Test**: Engineer menu includes technical features
**Expected Menu Items**:
- ✅ Dashboard
- ✅ Work Orders (read-only, for reference)
- ✅ **Process Segments (full access)**
- ✅ **Routings (full access)**
- ❌ Scheduling (read-only at best)
- ✅ Quality (read-only, for SPC/yield data)
- ✅ Materials (for BOM management)
- ✅ Traceability (for process tracking)
- ❌ Personnel
- ✅ Equipment (define equipment requirements)
- ✅ Work Instructions (create/edit)
- ❌ Integrations
- ❌ Admin

---

### 4. Permission Boundary Tests

**Test ID**: MFG-ENG-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CAN create and edit routings
**Steps**:
1. Navigate to /routings
2. Click "Create Routing"
3. Click "Edit" on existing routing
**Expected Result**: Both actions allowed

**Test ID**: MFG-ENG-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN define process segments
**Steps**:
1. Navigate to /process-segments
2. Click "Create Process Segment"
**Expected Result**: Form opens, can create

**Test ID**: MFG-ENG-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CANNOT release work orders (planner/supervisor only)
**Steps**:
1. Navigate to work orders
2. Look for "Release to Production" button
**Expected Result**: Button not visible

**Test ID**: MFG-ENG-PERM-004
**Priority**: P0
**Type**: Security
**Test**: CANNOT delete routings used in active work orders
**Steps**:
1. Navigate to routing used in WIP work order
2. Click "Delete"
**Expected Result**: Error "Cannot delete routing used in active work orders"

---

### 5. CRUD Operation Tests

#### Can CREATE:
- ✅ **Routings (for any part)**
- ✅ **Process segments**
- ✅ **Work instructions (digital)**
- ✅ BOMs and assemblies
- ✅ Tooling/fixture requirements

#### Can READ:
- ✅ All routings and process data
- ✅ Work orders (to see routing usage)
- ✅ Equipment capabilities
- ✅ Quality metrics (process capability)
- ✅ Material specifications

#### Can UPDATE:
- ✅ **Routing operations (add/remove/reorder)**
- ✅ **Cycle times and work center assignments**
- ✅ Process parameters
- ✅ Work instruction content
- ✅ BOM component lists

#### Can DELETE:
- ✅ Unused routings (not assigned to any work orders)
- ✅ Draft process segments
- ⚠️ Obsolete routings (creates new revision, marks old as "SUPERSEDED")
- ❌ Historical production data
- ❌ Routings used in WIP or completed work orders

**Test ID**: MFG-ENG-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: Create comprehensive routing for complex part
**Steps**:
1. Navigate to /routings
2. Click "Create Routing"
3. Enter:
   - **Part Number**: PN-AEROSPACE-001
   - **Routing Name**: "Titanium Bracket Machining"
   - **Effective Date**: Today
   - **Operations**:
     - Op 10: "Raw Material Inspection", WC: "Inspection-01", Time: 10 min
     - Op 20: "CNC 5-Axis Milling", WC: "CNC-Advanced", Time: 45 min, Tooling: "T-12345"
     - Op 30: "Heat Treatment", WC: "Heat-Treat", Time: 120 min
     - Op 40: "Final Machining", WC: "CNC-Finish", Time: 30 min
     - Op 50: "CMM Inspection", WC: "CMM-01", Time: 20 min
4. Click "Save"
**Expected Result**:
- Routing saved with 5 sequential operations
- Total cycle time = 225 min calculated
- Can assign to work orders for this part
- Routing appears in library with status "ACTIVE"

**Test ID**: MFG-ENG-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: Edit routing - Add operation in middle of sequence
**Steps**:
1. Open existing routing with operations 10, 20, 30
2. Click "Add Operation" between Op 20 and Op 30
3. Enter new operation: Op 25 "Deburring"
4. Save
**Expected Result**:
- Operation sequence renumbered: 10, 20, 25, 30
- Routing history shows change
- Work orders using old version not affected (unless updated)

**Test ID**: MFG-ENG-CRUD-003
**Priority**: P0
**Type**: Functional
**Test**: Clone routing from similar part
**Steps**:
1. Navigate to routing for "PN-WIDGET-100"
2. Click "Clone Routing"
3. Assign to new part: "PN-WIDGET-200"
4. Modify Op 20 cycle time: 15 min → 18 min
5. Save
**Expected Result**:
- New routing created as copy
- Changes do not affect original
- New part now has routing

**Test ID**: MFG-ENG-CRUD-004
**Priority**: P0
**Type**: Functional
**Test**: Activate/Deactivate routing version
**Steps**:
1. Navigate to part with multiple routing versions
2. Set Routing v2.0 as "ACTIVE"
3. Set Routing v1.0 as "SUPERSEDED"
**Expected Result**:
- New work orders use v2.0
- Existing WIP continues on v1.0 (unless manually updated)

---

### 6. Data Entry & Form Validation Tests

**Test ID**: MFG-ENG-FORM-001
**Priority**: P1
**Type**: Functional
**Test**: Cycle time must be positive
**Steps**:
1. Create routing operation
2. Enter cycle time: -10
3. Save
**Expected Result**: Validation error "Cycle time must be positive"

**Test ID**: MFG-ENG-FORM-002
**Priority**: P1
**Type**: Functional
**Test**: Work center must be selected
**Steps**:
1. Create routing operation
2. Leave work center dropdown empty
3. Save
**Expected Result**: Validation error "Work center is required"

**Test ID**: MFG-ENG-FORM-003
**Priority**: P1
**Type**: Functional
**Test**: Operation sequence must be unique
**Steps**:
1. Routing has Op 10, Op 20
2. Add another Op 20
3. Save
**Expected Result**: Validation error "Operation 20 already exists. Use different number."

**Test ID**: MFG-ENG-FORM-004
**Priority**: P1
**Type**: Functional
**Test**: Cannot set expiration date before effective date
**Steps**:
1. Create routing
2. Effective Date: 2025-01-01
3. Expiration Date: 2024-12-31
4. Save
**Expected Result**: Validation error "Expiration date must be after effective date"

---

### 7. Workflow Execution Tests

**Test ID**: MFG-ENG-WORKFLOW-001
**Priority**: P0
**Type**: Integration
**Test**: New Product Introduction (NPI) - Route a new part from concept to production
**Workflow**: Engineering provides new part → Mfg Engineer creates routing → Planner schedules → Operator executes
**Steps**:
1. **Design Engineer** (external): Releases new part PN-NEW-001 to MES
2. **Mfg Engineer** (login): Receive notification "New part requires routing"
3. Navigate to /routings/create
4. Create routing with 4 operations (based on similar part)
5. Assign tooling and fixtures
6. Set cycle times (initial estimates)
7. Click "Save and Activate"
8. **Production Planner** (switch user): Create work order for PN-NEW-001
9. Verify routing auto-assigned to work order
10. Schedule work order
11. **Supervisor** (switch user): Release to production
12. **Operator** (switch user): Execute first piece
13. **Mfg Engineer** (switch back): Review actual cycle times
14. Adjust routing cycle times based on actuals
**Expected Result**:
- Complete NPI flow from routing creation to production
- Routing seamlessly integrates with work orders
- Cycle time optimization based on real data

**Test ID**: MFG-ENG-WORKFLOW-002
**Priority**: P0
**Type**: Integration
**Test**: Engineering Change Notice (ECN) - Revise routing due to process improvement
**Workflow**: Process improvement identified → ECN approved → Routing updated → Communicated to production
**Steps**:
1. **Mfg Engineer**: Identify Op 30 cycle time can be reduced from 60 min to 45 min
2. Create ECN document (may be external system)
3. Update routing: Create new version v2.0
4. Change Op 30 cycle time: 60 → 45
5. Set v2.0 as ACTIVE
6. Set v1.0 as SUPERSEDED
7. **Planner** (switch user): View routing change log
8. Update existing work orders to use v2.0 (if not started)
9. **Supervisor** (switch user): Notified of routing change
**Expected Result**:
- Routing versioning maintained
- Old work orders can continue on v1.0
- New work orders use v2.0
- Change documented for audit

---

### 8. Reporting & Export Tests

**Test ID**: MFG-ENG-REPORT-001
**Priority**: P1
**Type**: Functional
**Test**: View routing usage report
**Steps**:
1. Navigate to Routings
2. Select routing for PN-WIDGET-100
3. Click "View Usage"
**Expected Result**: Report shows all work orders using this routing, with statuses

**Test ID**: MFG-ENG-REPORT-002
**Priority**: P1
**Type**: Functional
**Test**: Compare planned vs actual cycle times
**Steps**:
1. Navigate to Reports > Routing Analysis
2. Select routing for PN-BRACKET
3. View cycle time variance report
**Expected Result**: Chart shows planned cycle time vs average actual, identifies bottleneck operations

**Test ID**: MFG-ENG-REPORT-003
**Priority**: P2
**Type**: Functional
**Test**: Export routing to PDF for shop floor reference
**Steps**:
1. Navigate to routing
2. Click "Export to PDF"
**Expected Result**: PDF downloads with operation sequence, cycle times, tooling requirements

---

### 9. Integration Points

**Systems Accessed**:
- **MES Core**: Routing management, process segments
- **Work Instructions**: Create digital work instructions linked to routing ops
- **Quality**: Process capability data, SPC charts
- **Equipment**: Equipment capabilities and requirements

**External Systems**:
- **PLM (Product Lifecycle Management)**: Part BOMs, CAD drawings
- **ERP**: Costing data (cycle time × labor rate)
- **Engineering Change Management**: ECN/ECO approvals

---

### 10. Compliance & Audit Tests

**Test ID**: MFG-ENG-AUDIT-001
**Priority**: P1
**Type**: Compliance
**Test**: Routing change history maintained for AS9100
**Steps**:
1. Edit routing: Change Op 20 work center
2. Save
3. View routing history
**Expected Result**: History shows v1.0 vs v2.0 comparison, user who made change, timestamp

**Test ID**: MFG-ENG-AUDIT-002
**Priority**: P1
**Type**: Compliance
**Test**: Cannot delete routing used in historical work orders (traceability)
**Steps**:
1. Navigate to routing used in completed work order from 6 months ago
2. Click "Delete"
**Expected Result**: Error "Cannot delete routing with production history. Use SUPERSEDED status instead."

**Test ID**: MFG-ENG-AUDIT-003
**Priority**: P2
**Type**: Compliance
**Test**: Process validation documented
**Steps**:
1. Create routing for new part
2. Attach process validation report (PDF upload)
3. Save
**Expected Result**: Validation document linked to routing, accessible for DCMA audit

---

## Tier 2: Quality & Compliance

---

## Role 6: Quality Engineer

### 1. Role Profile

**Primary Responsibilities**:
- **Create and maintain quality plans** - Define inspection criteria, acceptance limits
- **Generate and approve FAI (First Article Inspection) reports** - AS9102 compliance
- **Create, investigate, and close NCRs (Non-Conformance Reports)**
- **Review Statistical Process Control (SPC) charts** - Monitor process capability
- **Approve electronic signatures** for critical quality decisions
- Define inspection methods and measurement techniques
- Interface with DCMA inspectors during audits
- Support supplier quality and incoming inspection
- Conduct root cause analysis and corrective actions

**Business Context**:
- Technical authority for quality compliance
- Ensures AS9100 and DCMA requirements met
- Works closely with production on quality issues
- Can halt production for quality concerns
- Primary interface for customer quality audits

**Access Level**:
- **Read**: All production, quality, traceability, signature data
- **Write**: Quality plans, FAI reports, NCRs, inspection results, corrective actions
- **Approve**: FAI reports, NCR closures, electronic signatures
- **Special**: Can place/remove quality holds on work orders

**Compliance Requirements**:
- FAI reports must follow AS9102 format
- NCRs require root cause and corrective action documentation
- Electronic signatures required for critical decisions
- All actions auditable by DCMA

---

### 2. Authentication & Authorization Tests

**Test ID**: QUAL-ENG-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Quality Engineer can access all quality modules
**Steps**:
1. Login as Quality Engineer
2. Navigate to /quality, /fai, /quality/ncrs, /signatures
**Expected Result**: All quality pages accessible

**Test ID**: QUAL-ENG-AUTH-002
**Priority**: P0
**Type**: Security
**Test**: CANNOT create work orders (production function)
**Steps**:
1. Login as Quality Engineer
2. Navigate to /workorders
3. Look for "Create Work Order" button
**Expected Result**: Button HIDDEN or DISABLED for quality engineer

---

### 3. Navigation & Menu Visibility Tests

**Test ID**: QUAL-ENG-NAV-001
**Priority**: P0
**Type**: UI
**Test**: Verify correct menu items visible
**Steps**:
1. Login as Quality Engineer
2. Check main menu
**Expected Result**: Menu shows: Dashboard, Work Orders (read-only), Quality, FAI, Inspections, NCRs, Signatures, Traceability (no Scheduling, no Routings edit)

---

### 4. Permission Boundary Tests

**Test ID**: QUAL-ENG-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CAN create and close NCRs
**Steps**:
1. Navigate to /quality/ncrs
2. Click "Create NCR"
3. Enter defect details, assign to production
4. Save NCR
5. After corrective action, click "Close NCR"
**Expected Result**: NCR created, then closed with electronic signature required

**Test ID**: QUAL-ENG-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN place quality hold on work order
**Steps**:
1. Navigate to /workorders/WO-1001
2. Click "Place Quality Hold"
3. Enter reason: "Dimensional non-conformance detected"
4. Confirm
**Expected Result**: Work order status → ON_HOLD, operator cannot proceed, notification sent

**Test ID**: QUAL-ENG-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CAN approve FAI reports
**Steps**:
1. Navigate to /fai
2. FAI report FAI-001 in status: PENDING_APPROVAL
3. Review measurements, ballooning, characteristics
4. Click "Approve"
5. Apply electronic signature
**Expected Result**: FAI status → APPROVED, signature logged, part released for production

**Test ID**: QUAL-ENG-PERM-004
**Priority**: P0
**Type**: Security
**Test**: CANNOT modify routings
**Steps**:
1. Navigate to /routings
2. Look for "Edit" or "Create" buttons
**Expected Result**: Routings visible READ-ONLY, no edit capability

---

### 5. CRUD Operation Tests

**Test ID**: QUAL-ENG-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: Create comprehensive quality plan
**Steps**:
1. Navigate to /quality/plans
2. Click "Create Quality Plan"
3. Enter:
   - Part Number: PN-AEROSPACE-002
   - Plan Name: "Titanium Component Inspection"
   - Inspection Points:
     - Op 20: "First piece inspection - critical dimensions"
     - Op 40: "In-process inspection - surface finish"
     - Op 50: "Final inspection - CMM full report"
   - Sample size: 1 per 10 parts
   - Acceptance criteria: ±0.001" on critical dims
4. Save
**Expected Result**: Quality plan created, linked to routing, visible to inspectors

**Test ID**: QUAL-ENG-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: Create NCR for dimensional non-conformance
**Steps**:
1. Navigate to /quality/ncrs
2. Click "Create NCR"
3. Enter:
   - NCR ID: NCR-2025-001
   - Work Order: WO-1001
   - Part Number: PN-AEROSPACE-002
   - Defect: "Hole diameter 0.256" (spec: 0.250" ±0.002")"
   - Severity: Major
   - Quantity Affected: 5 parts
   - Disposition: "Pending investigation"
4. Upload photos
5. Assign to Production Supervisor
6. Click "Create"
**Expected Result**: NCR created, production supervisor notified, work order on hold

**Test ID**: QUAL-ENG-CRUD-003
**Priority**: P0
**Type**: Functional
**Test**: Close NCR with root cause and corrective action
**Steps**:
1. Navigate to /quality/ncrs/NCR-2025-001
2. NCR status: PENDING_CLOSURE
3. Enter root cause: "Drill bit worn beyond tolerance"
4. Enter corrective action: "Replaced drill bit, re-inspected tooling"
5. Enter preventive action: "Added drill bit to preventive maintenance schedule"
6. Disposition: "Parts reworked and accepted"
7. Click "Close NCR"
8. Apply electronic signature
**Expected Result**: NCR status → CLOSED, signature logged, work order hold released

---

### 6. Data Entry & Form Validation Tests

**Test ID**: QUAL-ENG-FORM-001
**Priority**: P1
**Type**: Validation
**Test**: Cannot close NCR without root cause
**Steps**:
1. Navigate to NCR-2025-002
2. Click "Close NCR"
3. Leave root cause blank
4. Enter corrective action
5. Submit
**Expected Result**: Validation error "Root cause required to close NCR"

**Test ID**: QUAL-ENG-FORM-002
**Priority**: P1
**Type**: Validation
**Test**: FAI approval requires all characteristics measured
**Steps**:
1. Navigate to /fai/FAI-002
2. FAI has 50 characteristics
3. Only 48 measured (2 missing)
4. Click "Approve"
**Expected Result**: Validation error "Cannot approve FAI - 2 characteristics not measured: CHAR-035, CHAR-047"

**Test ID**: QUAL-ENG-FORM-003
**Priority**: P1
**Type**: Validation
**Test**: Electronic signature requires password re-entry
**Steps**:
1. Approving FAI report
2. System prompts for electronic signature
3. Enter username: jane.smith
4. Leave password blank
5. Click "Sign"
**Expected Result**: Validation error "Password required for electronic signature"

---

### 7. Workflow Execution Tests

**Test ID**: QUAL-ENG-WORK-001
**Priority**: P0
**Type**: Workflow
**Test**: Complete FAI workflow for new part
**Steps**:
1. New part PN-AERO-NEW arrives for first article
2. Navigate to /fai
3. Click "Create FAI"
4. Select part, work order, revision
5. Import CAD ballooning (50 characteristics)
6. Assign to Quality Inspector
7. Inspector measures all characteristics
8. Quality Engineer reviews measurements
9. 2 characteristics out of tolerance
10. Engineer creates NCR, requests engineering review
11. Engineering approves deviation
12. Engineer approves FAI with deviation note
13. Apply electronic signature
**Expected Result**: FAI approved with deviation, part released for production, DCMA audit trail complete

**Test ID**: QUAL-ENG-WORK-002
**Priority**: P0
**Type**: Workflow
**Test**: Quality hold and release workflow
**Steps**:
1. Operator reports quality issue on WO-1005
2. Quality Engineer places quality hold
3. Navigate to /workorders/WO-1005
4. Status: ON_HOLD (Quality)
5. Investigate issue: tool offset error
6. Create NCR-2025-003
7. Production corrects tool offset
8. Quality Engineer inspects correction
9. Click "Release Quality Hold"
10. Enter justification: "Tool offset corrected, verified with inspection"
11. Confirm
**Expected Result**: Work order status → RELEASED, production can resume, hold duration logged

**Test ID**: QUAL-ENG-WORK-003
**Priority**: P1
**Type**: Workflow
**Test**: SPC out-of-control response
**Steps**:
1. Navigate to /quality/spc
2. View control chart for "Hole Diameter - PN-002"
3. Last 7 points trending toward upper control limit
4. Click "Investigate"
5. Create investigation record
6. Assign to Process Engineer
7. Process Engineer identifies tool wear
8. Quality Engineer verifies corrective action
9. Close investigation
10. Chart returns to statistical control
**Expected Result**: Investigation logged, corrective action documented, trend corrected

---

### 8. Reporting & Export Tests

**Test ID**: QUAL-ENG-RPT-001
**Priority**: P1
**Type**: Reporting
**Test**: Generate FAI report PDF (AS9102 format)
**Steps**:
1. Navigate to /fai/FAI-001
2. FAI status: APPROVED
3. Click "Export AS9102 PDF"
**Expected Result**: PDF generated with:
- Form 1: Part number, accountability, certification
- Form 2: Product accountability (ballooning)
- Form 3: Characteristic accountability (measurements)
- Electronic signatures visible
- Ready for customer/DCMA submission

**Test ID**: QUAL-ENG-RPT-002
**Priority**: P1
**Type**: Reporting
**Test**: NCR summary report for management review
**Steps**:
1. Navigate to /quality/reports
2. Select "NCR Summary - Last 30 Days"
3. Generate report
**Expected Result**: Shows:
- Total NCRs: 12
- Open: 3
- Closed: 9
- By severity: Major (5), Minor (7)
- By root cause: Tooling (4), Material (3), Process (2), Other (3)
- Average closure time: 5.2 days

**Test ID**: QUAL-ENG-RPT-003
**Priority**: P1
**Type**: Reporting
**Test**: Quality metrics dashboard
**Steps**:
1. Navigate to /quality/dashboard
2. View KPIs
**Expected Result**: Dashboard shows:
- First Pass Yield: 94.5%
- NCR Rate: 2.1%
- FAI On-Time Completion: 88%
- SPC - Processes in Control: 15/17 (88%)
- Inspection Backlog: 8 items

---

### 9. Integration Points

**Test ID**: QUAL-ENG-INT-001
**Priority**: P1
**Type**: Integration
**Test**: Receive CMM inspection results from Quality Inspector
**Steps**:
1. Quality Inspector performs CMM inspection
2. CMM data uploaded to /quality/inspections/INSP-001
3. Quality Engineer receives notification
4. Review measurement report
5. All dimensions within tolerance
6. Approve inspection
**Expected Result**: Inspection approved, work order can proceed to next operation

**Test ID**: QUAL-ENG-INT-002
**Priority**: P1
**Type**: Integration
**Test**: Integrate with ERP for supplier quality data
**Steps**:
1. Supplier XYZ delivers material lot L-5000
2. ERP sends supplier Certificate of Conformance (CoC)
3. Quality Engineer reviews CoC in /materials/incoming
4. Material specifications match requirements
5. Approve incoming inspection
**Expected Result**: Material released to inventory, traceability link established

**Test ID**: QUAL-ENG-INT-003
**Priority**: P1
**Type**: Integration
**Test**: Export audit package for DCMA inspector
**Steps**:
1. DCMA requests audit package for Contract #ABC-123
2. Quality Engineer navigates to /audit/export
3. Select contract, date range
4. System compiles: Work orders, FAI reports, NCRs, signatures, traceability
5. Click "Generate Audit Package"
**Expected Result**: ZIP file with all PDFs, Excel summaries, ready for DCMA submission

---

### 10. Compliance & Audit Tests

**Test ID**: QUAL-ENG-AUDIT-001
**Priority**: P0
**Type**: Audit
**Test**: Electronic signature authenticity verification
**Steps**:
1. Navigate to /signatures/audit
2. Filter: jane.smith (Quality Engineer)
3. View all signatures for last 30 days
**Expected Result**: Table shows:
- Timestamp, Document Type, Document ID, Action, IP Address, Authentication Method
- Signature cannot be deleted or modified (immutable)
- Digital hash validates document integrity

**Test ID**: QUAL-ENG-AUDIT-002
**Priority**: P0
**Type**: Audit
**Test**: FAI revision control and traceability
**Steps**:
1. FAI-001 initially approved on 2025-10-01
2. Engineering change requires FAI update
3. Quality Engineer creates FAI-001 Rev B
4. New measurements recorded
5. Approve Rev B
6. Navigate to /fai/FAI-001/history
**Expected Result**: Revision history shows:
- Rev A: Approved 2025-10-01, signed by jane.smith
- Rev B: Approved 2025-10-15, signed by jane.smith, ECN-500 referenced
- Both revisions retained for audit trail

**Test ID**: QUAL-ENG-AUDIT-003
**Priority**: P1
**Type**: Audit
**Test**: NCR closure requires all fields complete
**Steps**:
1. Attempt to close NCR-2025-005
2. Root cause: Filled
3. Corrective action: Filled
4. Preventive action: BLANK
5. Click "Close NCR"
**Expected Result**: Validation error "Preventive action required for AS9100 compliance"

---

## Role 7: Quality Inspector

### 1. Role Profile

**Primary Responsibilities**:
- **Execute inspections per quality plan** - Follow inspection procedures
- **Record measurement data** - CMM, calipers, micrometers, gauges
- **Execute FAI inspections** for new parts (data collection only)
- **Apply electronic signatures** to inspection records
- **Place quality holds** on non-conforming work orders
- Perform in-process, first-piece, and final inspections
- Document findings with photos and notes
- Escalate issues to Quality Engineer
- Operate inspection equipment (CMM, optical comparators, etc.)

**Business Context**:
- Hands-on inspection role
- Follows inspection procedures created by Quality Engineer
- Cannot approve FAI reports or close NCRs (escalates up)
- Critical gatekeeper for quality compliance
- Works closely with operators on shop floor

**Access Level**:
- **Read**: Work orders, quality plans, inspection procedures, drawings
- **Write**: Inspection results, measurement data, quality holds
- **Cannot**: Approve FAI reports, close NCRs, modify quality plans
- **Special**: Can place quality holds, apply electronic signatures to own inspections

**Compliance Requirements**:
- All measurements documented and traceable
- Electronic signatures required for AS9100 compliance
- Must follow calibration procedures for inspection equipment
- Document inspection equipment ID and calibration date

---

### 2. Authentication & Authorization Tests

**Test ID**: QUAL-INSP-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Quality Inspector can access inspection modules
**Steps**:
1. Login as Quality Inspector
2. Navigate to /quality/inspections, /fai
**Expected Result**: Inspection pages accessible

**Test ID**: QUAL-INSP-AUTH-002
**Priority**: P0
**Type**: Security
**Test**: CANNOT access NCR closure functions
**Steps**:
1. Login as Quality Inspector
2. Navigate to /quality/ncrs/NCR-2025-001
3. Look for "Close NCR" button
**Expected Result**: Button HIDDEN or DISABLED for inspector role

---

### 3. Permission Boundary Tests

**Test ID**: QUAL-INSP-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CAN record inspection measurements
**Steps**:
1. Navigate to /quality/inspections
2. Select inspection INSP-001 (PN-AEROSPACE-002, Op 50)
3. Enter measurements for 10 critical dimensions
4. Apply electronic signature
5. Submit
**Expected Result**: Measurements saved, signature logged, inspection status → COMPLETED

**Test ID**: QUAL-INSP-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN place quality hold on work order
**Steps**:
1. During inspection, dimension out of tolerance
2. Navigate to /workorders/WO-1001
3. Click "Place Quality Hold"
4. Enter reason: "Dimension 0.256" exceeds tolerance (0.250" ±0.002")"
5. Upload photo of caliper measurement
6. Confirm
**Expected Result**: Work order status → ON_HOLD, Quality Engineer notified

**Test ID**: QUAL-INSP-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CAN execute FAI data collection but CANNOT approve
**Steps**:
1. Navigate to /fai/FAI-001
2. FAI assigned to inspector
3. Measure all 50 characteristics
4. Enter results
5. Look for "Approve FAI" button
**Expected Result**: Measurements saved, "Approve FAI" button HIDDEN (only Quality Engineer can approve)

**Test ID**: QUAL-INSP-PERM-004
**Priority**: P0
**Type**: Security
**Test**: CANNOT close NCRs
**Steps**:
1. Navigate to /quality/ncrs
2. Open NCR created by inspector
3. Look for "Close NCR" button
**Expected Result**: Button HIDDEN or DISABLED - inspector can create but cannot close

---

### 4. CRUD Operation Tests

**Test ID**: QUAL-INSP-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: Execute first-piece inspection
**Steps**:
1. Navigate to /quality/inspections
2. Work order WO-1001, first piece from new setup
3. Click "Create Inspection"
4. Select inspection type: "First Piece"
5. Enter measurements:
   - Hole Diameter: 0.251" (spec: 0.250" ±0.002") ✓
   - Length: 5.002" (spec: 5.000" ±0.005") ✓
   - Width: 2.498" (spec: 2.500" ±0.003") ✓
6. Result: PASS
7. Apply electronic signature
8. Submit
**Expected Result**: Inspection saved, work order can proceed to production

**Test ID**: QUAL-INSP-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: Execute CMM inspection with full report
**Steps**:
1. Navigate to /quality/inspections
2. Click "Create CMM Inspection"
3. Load CMM program for PN-AEROSPACE-003
4. Measure part on CMM
5. Import CMM results (50 dimensions)
6. CMM report shows 2 dimensions out of tolerance
7. Flag as non-conforming
8. Upload CMM PDF report
9. Apply electronic signature
10. Submit
**Expected Result**: Inspection saved as NON-CONFORMING, Quality Engineer notified, NCR auto-created

**Test ID**: QUAL-INSP-CRUD-003
**Priority**: P0
**Type**: Functional
**Test**: Record FAI measurement data
**Steps**:
1. Navigate to /fai/FAI-002
2. FAI assigned to inspector
3. Part number: PN-AERO-NEW
4. Characteristics: 45 dimensions
5. Measure each characteristic:
   - CHAR-001: 0.125" ✓
   - CHAR-002: 2.500" ✓
   - ... (all 45)
6. Upload ballooned drawing
7. Upload photos of setup
8. Document inspection equipment: CMM-01 (Cal due: 2025-11-01)
9. Submit for Quality Engineer approval
**Expected Result**: FAI data saved, status → PENDING_APPROVAL, Quality Engineer receives notification

---

### 5. Data Entry & Form Validation Tests

**Test ID**: QUAL-INSP-FORM-001
**Priority**: P1
**Type**: Validation
**Test**: Cannot submit inspection without all required fields
**Steps**:
1. Create inspection INSP-003
2. Enter 8 of 10 required dimensions
3. Leave 2 dimensions blank
4. Click Submit
**Expected Result**: Validation error "All required dimensions must be measured: DIM-009, DIM-010"

**Test ID**: QUAL-INSP-FORM-002
**Priority**: P1
**Type**: Validation
**Test**: Measurement out of range warning
**Steps**:
1. Dimension spec: 1.000" ±0.005"
2. Inspector enters: 1.050"
3. System calculates: Out of tolerance by 0.045"
4. Warning displayed
5. Inspector confirms: "Measurement verified, proceed"
6. Submit
**Expected Result**: Measurement saved with out-of-tolerance flag, work order flagged for Quality Engineer review

**Test ID**: QUAL-INSP-FORM-003
**Priority**: P1
**Type**: Validation
**Test**: Electronic signature requires password
**Steps**:
1. Complete inspection
2. Click "Apply Signature"
3. Enter username: quality.inspector
4. Leave password blank
5. Click "Sign"
**Expected Result**: Validation error "Password required for electronic signature"

---

### 6. Workflow Execution Tests

**Test ID**: QUAL-INSP-WORK-001
**Priority**: P0
**Type**: Workflow
**Test**: In-process inspection workflow
**Steps**:
1. Operator completes Op 30 on WO-1001
2. Quality plan requires in-process inspection
3. Quality Inspector receives notification
4. Navigate to /quality/inspections
5. Create inspection for WO-1001, Op 30
6. Measure 5 critical dimensions
7. All pass
8. Apply electronic signature
9. Submit
**Expected Result**: Inspection approved, Op 30 marked complete, work order moves to Op 40

**Test ID**: QUAL-INSP-WORK-002
**Priority**: P0
**Type**: Workflow
**Test**: Non-conformance detection and NCR creation
**Steps**:
1. Final inspection on WO-1005
2. Dimension out of tolerance: 0.258" (spec: 0.250" ±0.002")
3. Inspector clicks "Create NCR"
4. Enter:
   - Defect description: "Hole diameter oversized"
   - Severity: Major
   - Quantity affected: 10 parts
5. Upload photo
6. Assign to Quality Engineer
7. Place quality hold on WO-1005
8. Submit
**Expected Result**: NCR created, Quality Engineer notified, work order on hold, production stopped

**Test ID**: QUAL-INSP-WORK-003
**Priority**: P1
**Type**: Workflow
**Test**: First Article Inspection (FAI) execution
**Steps**:
1. New part PN-AERO-NEW-001 released for production
2. Quality Engineer creates FAI-003, assigns to inspector
3. Inspector receives notification
4. Navigate to /fai/FAI-003
5. Review ballooned drawing (65 characteristics)
6. Set up part on CMM
7. Measure all 65 characteristics
8. Enter results
9. 63 pass, 2 out of tolerance
10. Document non-conformance
11. Upload CMM report and photos
12. Submit to Quality Engineer
**Expected Result**: FAI data complete, status → PENDING_APPROVAL, Quality Engineer reviews

---

### 7. Reporting & Export Tests

**Test ID**: QUAL-INSP-RPT-001
**Priority**: P1
**Type**: Reporting
**Test**: Generate inspection report
**Steps**:
1. Navigate to /quality/inspections/INSP-001
2. Inspection complete
3. Click "Export Report"
**Expected Result**: PDF generated with:
- Part number, work order, operation
- All measurements with pass/fail
- Inspector signature with timestamp
- Inspection equipment ID and calibration status

**Test ID**: QUAL-INSP-RPT-002
**Priority**: P1
**Type**: Reporting
**Test**: View inspection backlog
**Steps**:
1. Navigate to /quality/inspections
2. Filter: Status = "Pending"
3. Sort by due date
**Expected Result**: List shows:
- 8 inspections pending
- Sorted by due date (oldest first)
- Color-coded: Red (overdue), Yellow (due today), Green (future)

---

### 8. Integration Points

**Test ID**: QUAL-INSP-INT-001
**Priority**: P1
**Type**: Integration
**Test**: Import CMM measurement data
**Steps**:
1. Measure part on CMM (PC-DMIS software)
2. CMM generates results file (.csv)
3. Navigate to /quality/inspections/INSP-005
4. Click "Import CMM Data"
5. Upload .csv file
6. System maps CMM results to characteristics
**Expected Result**: All 50 dimensions auto-populated, inspector reviews and confirms

**Test ID**: QUAL-INSP-INT-002
**Priority**: P1
**Type**: Integration
**Test**: Verify inspection equipment calibration
**Steps**:
1. Creating inspection INSP-006
2. Select inspection equipment: "Caliper-05"
3. System checks calibration database
4. Caliper-05 calibration expired yesterday
5. System blocks inspection
**Expected Result**: Error "Inspection equipment Caliper-05 calibration expired. Cannot proceed until recalibrated."

---

### 9. Compliance & Audit Tests

**Test ID**: QUAL-INSP-AUDIT-001
**Priority**: P0
**Type**: Audit
**Test**: All inspection results immutable after signature
**Steps**:
1. Inspector completes INSP-007
2. Applies electronic signature
3. Submits
4. Attempts to edit measurement
**Expected Result**: Edit button DISABLED - "Cannot modify signed inspection. Contact Quality Engineer for revision."

**Test ID**: QUAL-INSP-AUDIT-002
**Priority**: P0
**Type**: Audit
**Test**: Inspection traceability to equipment and calibration
**Steps**:
1. Navigate to /quality/inspections/INSP-008
2. View inspection details
**Expected Result**: Report shows:
- Inspector: quality.inspector
- Equipment: CMM-01, Calibration due: 2025-11-15 ✓
- Timestamp: 2025-10-19 10:30:00
- Electronic signature hash: [SHA-256]
- Cannot be altered or deleted

---

## Role 8: DCMA Inspector (New - Critical)

### 1. Role Profile

**Primary Responsibilities**:
- **Audit MES data for DCAA/DCMA compliance** (Defense Contract Audit Agency / Defense Contract Management Agency)
- Verify AS9100 quality management system compliance
- Review traceability records for government contracts
- Audit electronic signature logs and authenticity
- Export audit trails for contract administration
- Verify FAI completeness and accuracy
- Review NCR closure and corrective actions
- Assess production data integrity

**Business Context**:
- Government representative or contractor quality auditor
- **READ-ONLY ACCESS** - Cannot modify any production data
- May access system during scheduled audits or spot checks
- Requires comprehensive visibility across all modules
- Access may be temporary (duration of audit)

**Access Level**:
- **Read**: ALL modules (work orders, quality, traceability, electronic signatures, audit trails)
- **Write**: None (exception: may create audit notes/reports)
- **Delete**: None
- **Special**: Can export audit evidence, filter by date ranges for audit period

**Compliance Requirements**:
- All DCMA access logged for government oversight
- Must comply with cybersecurity requirements (NIST 800-171, CMMC)
- Cannot access proprietary engineering data (unless contract requires)
- Audit findings documented and provided to contractor

---

### 2. Authentication & Authorization Tests

**Test ID**: DCMA-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: DCMA Inspector can login with temporary credentials
**Steps**:
1. System Admin creates DCMA Inspector account with expiration date = +30 days
2. DCMA Inspector receives credentials
3. Login to MES
**Expected Result**: Successful login, account expires after 30 days

**Test ID**: DCMA-AUTH-002
**Priority**: P0
**Type**: Security
**Test**: DCMA Inspector access logged for government oversight
**Steps**:
1. DCMA Inspector logs in
2. System Admin views security log
**Expected Result**: Log entry shows "DCMA_INSPECTOR login from IP: xxx.xxx.xxx.xxx" with timestamp

---

### 3. Navigation & Menu Visibility Tests

**Test ID**: DCMA-NAV-001
**Priority**: P0
**Type**: Functional
**Test**: DCMA Inspector can view all modules (READ-ONLY)
**Expected Menu Items** (all READ-ONLY):
- ✅ Dashboard (overview of production status)
- ✅ Work Orders (all work orders, all sites)
- ✅ Process Segments (read processes)
- ✅ Routings (read routing definitions)
- ✅ Scheduling (view production schedules)
- ✅ **Quality > Inspections** (critical for AS9100 audit)
- ✅ **Quality > NCRs** (verify closure and CAPA)
- ✅ **FAI Reports** (verify completeness)
- ✅ **Electronic Signatures** (verify authenticity)
- ✅ Materials (traceability to suppliers)
- ✅ Traceability (lot/serial number tracking)
- ✅ Personnel (verify training records, qualifications)
- ✅ Equipment (calibration records)
- ✅ Work Instructions (verify approval status)
- ⚠️ Integrations (may or may not need)
- ❌ Admin (no user management access)

---

### 4. Permission Boundary Tests

**Test ID**: DCMA-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CANNOT create, edit, or delete ANY records
**Steps**:
1. Navigate to Work Orders
2. Look for "Create Work Order", "Edit", "Delete" buttons
3. Navigate to Quality > NCRs
4. Look for "Create NCR", "Close NCR" buttons
**Expected Result**: All write/delete buttons HIDDEN or DISABLED for DCMA user

**Test ID**: DCMA-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN export audit evidence
**Steps**:
1. Navigate to Work Orders
2. Filter by date range: Last 6 months
3. Click "Export to Excel"
**Expected Result**: Excel file downloads with work order data

**Test ID**: DCMA-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CAN view audit trail
**Steps**:
1. Navigate to Admin > Audit Trail (if accessible)
2. Filter by action: "Quality Inspection Failed"
3. View results
**Expected Result**: Audit trail visible, shows who made changes and when

**Test ID**: DCMA-PERM-004
**Priority**: P0
**Type**: Security
**Test**: CANNOT impersonate other users
**Steps**:
1. Look for "Impersonate User" feature (if exists for Superuser)
**Expected Result**: Feature not visible to DCMA Inspector

---

### 5. CRUD Operation Tests

#### Can CREATE:
- ⚠️ Audit notes/findings (if implemented as separate module)

#### Can READ:
- ✅ **ALL work orders** (past and present)
- ✅ **ALL quality inspections and results**
- ✅ **ALL FAI reports**
- ✅ **ALL NCRs and corrective actions**
- ✅ **ALL electronic signature logs**
- ✅ **ALL traceability records**
- ✅ **ALL audit trails**
- ✅ Calibration records (equipment)
- ✅ Training records (personnel qualifications)
- ✅ Supplier certifications (materials)

#### Can UPDATE:
- ❌ None

#### Can DELETE:
- ❌ None

**Test ID**: DCMA-CRUD-001
**Priority**: P0
**Type**: Functional
**Test**: View all FAI reports for audit period
**Steps**:
1. Navigate to /fai
2. Filter by date range: Jan 1, 2025 - Jun 30, 2025
3. Apply filter: Part Type = "Aerospace"
**Expected Result**: List shows all FAI reports, can click to view details

**Test ID**: DCMA-CRUD-002
**Priority**: P0
**Type**: Functional
**Test**: View NCR with corrective action history
**Steps**:
1. Navigate to Quality > NCRs
2. Click on NCR "NCR-2025-045"
3. View "Corrective Actions" tab
**Expected Result**: Shows root cause analysis, corrective action plan, verification, closure date

**Test ID**: DCMA-CRUD-003
**Priority**: P0
**Type**: Functional
**Test**: View electronic signature details for critical inspection
**Steps**:
1. Navigate to Electronic Signatures
2. Filter by inspection type: "FAI"
3. Click on signature record
**Expected Result**: Shows signer name, timestamp, IP address, signature reason, cannot modify

---

### 6. Data Entry & Form Validation Tests

**Test ID**: DCMA-FORM-001
**Priority**: P0
**Type**: Security
**Test**: All input fields are read-only
**Steps**:
1. Navigate to Work Order details page
2. Attempt to click in any text field
**Expected Result**: Fields are disabled/grayed out, no edit possible

---

### 7. Workflow Execution Tests

**Test ID**: DCMA-WORKFLOW-001
**Priority**: P0
**Type**: Integration
**Test**: Audit AS9100 compliance for recent work orders
**Workflow**: DCMA Inspector verifies traceability, quality, and documentation for random sample of work orders
**Steps**:
1. **DCMA Inspector** (login): Navigate to Work Orders
2. Filter by contract number: "N00019-25-C-1234" (government contract)
3. Select random sample: 10 work orders
4. For each work order:
   a. Verify routing was followed (compare planned vs actual operations)
   b. Verify material traceability (lot numbers recorded)
   c. Verify quality inspections completed
   d. Verify electronic signatures present (if required)
   e. Verify no open NCRs
5. Export evidence package (work order details, inspection results, signatures)
6. Create audit report (external to MES)
**Expected Result**:
- DCMA can view all required data
- Can export evidence without modifying records
- Audit trail shows DCMA access

**Test ID**: DCMA-WORKFLOW-002
**Priority**: P0
**Type**: Integration
**Test**: Verify FAI completeness for new part introduction
**Workflow**: DCMA Inspector verifies first article inspection meets AS9102 requirements
**Steps**:
1. Navigate to FAI Reports
2. Filter by part number: "PN-AERO-NEW-001"
3. Open FAI report
4. Verify:
   a. All characteristics inspected per drawing
   b. Measurement data recorded
   c. Out-of-tolerance dimensions noted
   d. Corrective actions taken
   e. Inspector signature and date
   f. Quality Engineer approval signature
5. Export FAI report to PDF
**Expected Result**:
- FAI report complete per AS9102
- All signatures present
- Can export for government review

---

### 8. Reporting & Export Tests

**Test ID**: DCMA-REPORT-001
**Priority**: P0
**Type**: Functional
**Test**: Export audit trail for date range
**Steps**:
1. Navigate to Audit Trail
2. Filter:
   - Date Range: Apr 1, 2025 - Jun 30, 2025
   - Action Type: "Work Order Status Change", "Quality Inspection", "NCR"
3. Click "Export to Excel"
**Expected Result**: Excel file contains all matching audit records with user, timestamp, action, old value, new value

**Test ID**: DCMA-REPORT-002
**Priority**: P0
**Type**: Functional
**Test**: Generate traceability report for serial number
**Steps**:
1. Navigate to Traceability
2. Enter serial number: "SN-12345678"
3. Click "Generate Full Traceability Report"
**Expected Result**: Report shows:
- Part number and description
- Manufacturing date
- Work order number
- Material lot numbers used
- Routing operations completed
- Inspection results
- Operator who built it
- Can export to PDF

**Test ID**: DCMA-REPORT-003
**Priority**: P1
**Type**: Functional
**Test**: View calibration status for measurement equipment
**Steps**:
1. Navigate to Equipment
2. Filter by type: "Measurement Equipment"
3. View calibration due dates
**Expected Result**: List shows equipment ID, last calibration date, next due date, status (current/overdue)

---

### 9. Integration Points

**Systems Accessed**:
- **MES Core**: All modules (read-only)
- **Electronic Signatures**: Verify authenticity
- **Audit Trails**: Export logs

**External Systems**:
- **Government Audit Reporting**: May export data to DCAA/DCMA systems
- **Cybersecurity Compliance**: NIST 800-171, CMMC

---

### 10. Compliance & Audit Tests

**Test ID**: DCMA-AUDIT-001
**Priority**: P0
**Type**: Compliance
**Test**: DCMA access logged for contractor oversight
**Steps**:
1. DCMA Inspector logs in
2. Views 10 work orders
3. Exports 5 FAI reports
4. Logs out
5. System Admin reviews security log
**Expected Result**: All DCMA actions logged:
- Login/logout times
- Pages accessed
- Reports exported
- No modification attempts

**Test ID**: DCMA-AUDIT-002
**Priority**: P0
**Type**: Compliance
**Test**: DCMA cannot access proprietary engineering data (unless contract allows)
**Steps**:
1. Navigate to Engineering Change Orders (if exists)
2. Attempt to view proprietary part design
**Expected Result**: Access denied OR data redacted per contract terms

---

## Role 9: Process Engineer

### 1. Role Profile

**Primary Responsibilities**:
- **Monitor Statistical Process Control (SPC) charts** - Identify trends, out-of-control conditions
- **Conduct process capability studies (Cpk, Ppk)** - Ensure processes meet specifications
- **Analyze yield and scrap data** - Drive continuous improvement initiatives
- **Investigate process deviations** - Root cause analysis for quality issues
- **Optimize manufacturing processes** - Reduce cycle time, improve quality
- **Develop process control plans** - Define control parameters and monitoring frequency
- Support new product introductions with Design of Experiments (DOE)
- Collaborate with Quality and Manufacturing Engineering

**Business Context**:
- Technical expert focused on process optimization
- Bridges quality and manufacturing engineering
- Data-driven decision making (statistical analysis)
- Proactive problem prevention vs. reactive troubleshooting
- Supports lean manufacturing and Six Sigma initiatives

**Access Level**:
- **Read**: Work orders, quality data, SPC charts, production performance, equipment data
- **Write**: Process improvement projects, control plans, SPC limits, yield analysis reports
- **Cannot**: Approve quality documents (Quality Engineer does)
- **Special**: Can recommend process parameter changes, create investigations

**Compliance Requirements**:
- Process changes documented for AS9100 compliance
- Statistical analysis methods validated
- Process capability studies required for critical characteristics

---

### 2. Key Test Scenarios

**Test ID**: PROC-ENG-SPC-001
**Priority**: P0
**Type**: Workflow
**Test**: Monitor SPC chart and identify out-of-control condition
**Steps**:
1. Navigate to /quality/spc
2. View control chart for "Hole Diameter - PN-002"
3. Last 9 points trending upward (Rule 6 - statistical rule)
4. Click "Create Investigation"
5. Assign to Quality Inspector for verification
6. Review measurement equipment calibration
7. Identify tool wear as root cause
8. Recommend tool change
9. Verify process returns to control
**Expected Result**: Investigation logged, corrective action taken, chart stabilized

**Test ID**: PROC-ENG-CPK-001
**Priority**: P0
**Type**: Functional
**Test**: Conduct process capability study for new part
**Steps**:
1. Navigate to /quality/capability
2. Click "New Capability Study"
3. Select part: PN-AERO-NEW, characteristic: "Diameter"
4. Collect 30 consecutive samples
5. System calculates: Cp = 1.45, Cpk = 1.28
6. Cpk > 1.33 required for critical characteristic
7. Mark as "Capable"
8. Generate capability report
**Expected Result**: Part approved for production, capability documented

**Test ID**: PROC-ENG-YIELD-001
**Priority**: P1
**Type**: Reporting
**Test**: Analyze yield trends and identify improvement opportunities
**Steps**:
1. Navigate to /quality/yield-analysis
2. Select date range: Last 30 days
3. View yield by part number
4. PN-002 shows 82% yield (target: 95%)
5. Drill down by operation
6. Op 40 has 70% yield (bottleneck)
7. Review NCRs for Op 40
8. Common defect: Surface finish
9. Create improvement project
**Expected Result**: Yield issue identified, improvement project initiated

**Test ID**: PROC-ENG-DOE-001
**Priority**: P1
**Type**: Workflow
**Test**: Design experiment to optimize machining parameters
**Steps**:
1. New part PN-COMPLEX requires optimization
2. Navigate to /engineering/experiments
3. Create 2^3 factorial DOE
4. Factors: Speed (2 levels), Feed (2 levels), Depth (2 levels)
5. Response: Surface finish
6. Run 8 trials
7. Analyze results: Speed is most significant
8. Recommend optimal parameters
**Expected Result**: Optimized parameters documented, implemented in routing

**Test ID**: PROC-ENG-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CANNOT approve FAI reports (Quality Engineer only)
**Steps**:
1. Navigate to /fai/FAI-001
2. Process Engineer reviews capability data
3. Look for "Approve FAI" button
**Expected Result**: Button HIDDEN - Process Engineer can view but not approve

**Test ID**: PROC-ENG-INT-001
**Priority**: P1
**Type**: Integration
**Test**: Receive real-time SPC data from shop floor equipment
**Steps**:
1. CNC machine measures part after each cycle
2. Dimension data sent to MES
3. SPC chart auto-updates
4. Process Engineer monitors real-time
5. Data point exceeds warning limit
6. System sends alert to Process Engineer
**Expected Result**: Real-time monitoring enables proactive intervention

---

## Tier 3: Materials & Logistics

---

## Role 10: Warehouse Manager

### 1. Role Profile
**Responsibilities**: Oversee all warehouse operations, manage inventory accuracy, cycle counts, ABC analysis, warehouse layout optimization, supervise materials handlers
**Access**: Read/Write inventory, materials, cycle counts, warehouse locations; Cannot: Create work orders, modify routings
**Key Tests**:
- **WARE-MGR-INV-001** (P1): Execute cycle count program, reconcile variances > 5%, approve inventory adjustments
- **WARE-MGR-LOC-001** (P1): Optimize warehouse locations based on part velocity (A/B/C), generate location assignment report
- **WARE-MGR-RPT-001** (P1): View inventory accuracy KPIs (target: 98%), identify problem SKUs, create corrective action plan
- **WARE-MGR-PERM-001** (P0): CAN approve inventory adjustments; CANNOT modify BOMs or routings

---

## Role 11: Materials Handler

### 1. Role Profile
**Responsibilities**: Pick materials for work orders, move materials between locations, perform cycle counts, load/unload trucks, operate forklifts
**Access**: Read work orders, materials, locations; Write material movements, cycle count results; Cannot: Adjust inventory without approval
**Key Tests**:
- **MAT-HAND-PICK-001** (P0): Pick materials for WO-1001 per pick list, scan barcodes, confirm quantities, deliver to work center
- **MAT-HAND-MOVE-001** (P0): Move Material M-500 from Receiving → Inspection → Warehouse Location A-12-5, scan at each step
- **MAT-HAND-COUNT-001** (P1): Perform cycle count for 10 SKUs, identify variance: Expected 50, Actual 47, escalate to Warehouse Manager
- **MAT-HAND-PERM-001** (P0): CAN record material movements; CANNOT approve inventory adjustments (requires manager approval)
- **MAT-HAND-TRACE-001** (P0): Issue material Lot L-5000 to WO-1001, traceability link auto-created in database

---

## Role 12: Shipping/Receiving Specialist

### 1. Role Profile
**Responsibilities**: Receive raw materials, inspect incoming shipments, create packing lists, generate shipping labels, coordinate carriers, process customer returns
**Access**: Read/Write shipments, receiving, packing lists; Cannot: Modify inventory without receiving inspection
**Key Tests**:
- **SHIP-REC-RCV-001** (P0): Receive shipment from supplier, verify PO qty vs. actual, inspect for damage, create receiver in system
- **SHIP-REC-SHIP-001** (P0): Create shipment for WO-1001 (10 parts), generate packing list, print shipping label (UPS), update order status → SHIPPED
- **SHIP-REC-CARR-001** (P1): Assign carrier based on weight/destination, generate BOL (Bill of Lading), track shipment status
- **SHIP-REC-RTN-001** (P1): Process customer return, inspect for damage, create RMA, issue credit or replacement
- **SHIP-REC-TRACE-001** (P0): Link shipment to serial numbers for traceability, customer receives S/N: AERO-001-2025-0001
- **SHIP-REC-PERM-001** (P0): CAN create shipments/receivers; CANNOT approve quality holds or NCRs

---

## Role 13: Logistics Coordinator

### 1. Role Profile

**Primary Responsibilities**:
- Coordinate outbound shipments to customers
- Manage inbound raw material receipts
- Assign carriers and generate shipping labels
- Track shipment status and resolve delays
- Update inventory upon receipt/shipment
- Coordinate with warehouse for material availability
- Ensure on-time delivery per customer requirements

**Business Context**:
- Critical link between production and customer
- Manages shipping schedules and logistics
- Interfaces with carriers, freight forwarders
- Ensures material availability for production

**Access Level**:
- **Read**: Work orders (for shipment planning), inventory, customer orders
- **Write**: Shipments, receipts, tracking numbers, inventory updates
- **Delete**: Draft shipments (not finalized)
- **Special**: Can generate packing lists, shipping labels

**Key Tests**:
- **LOG-COORD-SHIP-001** (P0): Create outbound shipment for customer order, select carrier (UPS 2-day), generate tracking #, send ASN (Advanced Shipment Notice)
- **LOG-COORD-RCV-001** (P0): Receive inbound raw materials, verify against PO, update inventory, notify production planner of availability
- **LOG-COORD-TRACK-001** (P1): Track shipment status, shipment delayed, proactively notify customer, arrange expedited delivery
- **LOG-COORD-CARR-001** (P1): Evaluate carrier performance (on-time %, cost), generate carrier scorecard, recommend preferred carriers
- **LOG-COORD-PERM-001** (P0): CAN create shipments/track logistics; CANNOT modify work orders or approve quality documents

---

## Tier 4: Maintenance & Equipment

---

## Role 14: Maintenance Technician

### 1. Role Profile
**Responsibilities**: Perform preventive maintenance (PM) on equipment, respond to breakdowns, document repairs, replace parts, operate CMMS (Computerized Maintenance Management System)
**Access**: Read equipment, PM schedules, work orders (equipment status); Write maintenance logs, work requests; Cannot: Approve capital expenditures
**Key Tests**:
- **MAINT-TECH-PM-001** (P0): Execute PM on CNC-01 per schedule, lubricate spindle, check coolant levels, replace filters, update CMMS
- **MAINT-TECH-BREAK-001** (P0): Respond to equipment breakdown (CNC-01 alarm), diagnose issue (spindle motor failure), order replacement part, estimate downtime (4 hours)
- **MAINT-TECH-LOG-001** (P1): Document all repairs in maintenance log, include: Issue, Root cause, Parts used, Labor hours, Equipment back in service
- **MAINT-TECH-PERM-001** (P0): CAN log equipment downtime, update equipment status; CANNOT modify production schedules or work order priorities
- **MAINT-TECH-INT-001** (P1): Equipment status update (CNC-01 DOWN → AVAILABLE) auto-notifies Production Scheduler

---

## Role 15: Maintenance Supervisor

### 1. Role Profile
**Responsibilities**: Manage maintenance team, schedule PMs, approve work requests, procure spare parts, track equipment OEE (Overall Equipment Effectiveness), plan capital improvements
**Access**: Read/Write all maintenance data, equipment, PM schedules, spare parts inventory; Cannot: Modify routings or approve quality documents
**Key Tests**:
- **MAINT-SUP-SCHED-001** (P1): Schedule PM calendar for Q1, balance workload across technicians, avoid conflicts with production schedule
- **MAINT-SUP-OEE-001** (P1): View OEE dashboard for CNC work centers, CNC-01 OEE = 72% (target: 85%), drill down: Availability 80%, Performance 95%, Quality 95%
- **MAINT-SUP-CAPEX-001** (P2): Recommend capital equipment purchase (new CMM $250K), justify ROI, submit to Plant Manager for approval
- **MAINT-SUP-SPARE-001** (P1): Manage spare parts inventory, reorder point for critical parts (spindle motors, bearings), prevent stockouts
- **MAINT-SUP-PERM-001** (P1): CAN approve maintenance work requests; CANNOT create work orders or modify BOMs

---

## Tier 5: Administration

---

## Role 16: Plant Manager

### 1. Role Profile
**Responsibilities**: Oversee all plant operations, review KPIs (OEE, on-time delivery, quality metrics), approve capital expenditures, strategic planning, customer escalations, compliance oversight
**Access**: Read ALL modules (360° visibility); Cannot: Modify low-level data (operators enter actuals); Special: View executive dashboards, approve budgets
**Key Tests**:
- **PLANT-MGR-DASH-001** (P1): View executive dashboard: On-time delivery 92%, OEE 78%, NCR rate 1.8%, Labor utilization 85%
- **PLANT-MGR-CAPEX-001** (P1): Approve capital expenditure (new CMM $250K), review ROI justification, compare to budget
- **PLANT-MGR-ESC-001** (P2): Customer escalation for late order, review root cause, approve expedited shipping cost, authorize overtime
- **PLANT-MGR-COMP-001** (P1): Review AS9100 compliance status, DCMA audit readiness, approve corrective action plans
- **PLANT-MGR-PERM-001** (P0): CAN view all data; CANNOT modify traceability records or electronic signatures (immutable)
- **PLANT-MGR-RPT-001** (P1): Generate monthly plant performance report for executive team, export to PowerPoint

---

## Role 17: System Administrator

### 1. Role Profile
**Responsibilities**: Manage user accounts, assign roles/permissions, configure system settings, database backups, security audits, software updates, integration management
**Access**: Full system access (ALL permissions); Write: Users, roles, permissions, system configuration; Special: Can reset passwords, unlock accounts, view audit logs
**Key Tests**:
- **SYS-ADMIN-USER-001** (P0): Create new user account, assign role: Quality Inspector, set permissions, send welcome email with temp password
- **SYS-ADMIN-ROLE-001** (P0): Modify role permissions, add 'workinstructions.execute' to Production Operator role, change propagates to all 25 operators
- **SYS-ADMIN-AUDIT-001** (P1): View security audit log, identify failed login attempts (5 failures for john.doe), lock account, investigate
- **SYS-ADMIN-BACKUP-001** (P1): Schedule daily database backups, verify backup integrity, test restore procedure
- **SYS-ADMIN-INT-001** (P1): Configure ERP integration, set API credentials, test connection, enable auto-sync for BOMs
- **SYS-ADMIN-PERM-001** (P0): CAN create/modify users; CANNOT bypass electronic signature requirements or modify signed records

---

## Role 19: Inventory Control Specialist

### 1. Role Profile
**Responsibilities**: Monitor inventory levels, manage cycle count program, reconcile inventory variances, analyze slow-moving inventory, manage min/max levels, MRP parameter maintenance
**Access**: Read/Write inventory, cycle counts, adjustments; Cannot: Modify BOMs or routings
**Key Tests**:
- **INV-CTRL-CYCLE-001** (P1): Execute cycle count program, count 50 SKUs per day, reconcile variances, approve adjustments < $500, escalate > $500
- **INV-CTRL-ADJ-001** (P1): Approve inventory adjustment: Material M-500, System qty: 100, Actual: 95, Variance: -5, Reason: "Scrap not recorded", approve
- **INV-CTRL-MINMAX-001** (P1): Set min/max inventory levels for critical parts, M-750 min: 100, max: 500, reorder point: 150, lead time: 14 days
- **INV-CTRL-SLOW-001** (P2): Generate slow-moving inventory report, parts with no usage in 6 months, recommend disposition (scrap, return to supplier, transfer)
- **INV-CTRL-MRP-001** (P1): Review MRP parameters, update lead times, safety stock, lot sizing rules for 200 SKUs
- **INV-CTRL-PERM-001** (P1): CAN approve small adjustments ($0-$500); CANNOT approve large adjustments (Warehouse Manager approves > $500)

---

## Role 18: Superuser (New - Critical)

### 1. Role Profile

**Primary Responsibilities**:
- **Production support and troubleshooting** - Emergency access to resolve system issues
- Bypass normal workflow validations when necessary
- Manually correct data errors (with justification)
- Unlock locked records for editing
- Impersonate other users to diagnose permission issues
- View detailed system logs and error traces
- Execute emergency data corrections
- Support during system outages or critical production issues

**Business Context**:
- "Break glass in case of emergency" role
- Used sparingly for production-critical issues
- All actions heavily audited
- Typically IT support or senior MES administrator
- Not for routine operations

**Access Level**:
- **Read**: EVERYTHING
- **Write**: EVERYTHING (with justification required)
- **Delete**: Can delete records if absolutely necessary (logged)
- **Special**: Bypass validations, impersonate users, view system internals

**Compliance Requirements**:
- **ALL actions logged with justification**
- Superuser access usage reviewed monthly
- Cannot be used for routine operations
- Must document reason for each elevated action

---

### 2. Authentication & Authorization Tests

**Test ID**: SUPERUSER-AUTH-001
**Priority**: P0
**Type**: Security
**Test**: Superuser can access all system features
**Steps**:
1. Login as Superuser
2. Navigate through all menu items
**Expected Result**: All pages accessible, no "Access Denied" errors

---

### 3. Permission Boundary Tests

**Test ID**: SUPERUSER-PERM-001
**Priority**: P0
**Type**: Security
**Test**: CAN bypass workflow validations
**Steps**:
1. Work order requires material X (out of stock)
2. Normal user cannot release
3. Superuser clicks "Release Anyway" with justification
**Expected Result**: Work order released with warning logged

**Test ID**: SUPERUSER-PERM-002
**Priority**: P0
**Type**: Security
**Test**: CAN manually change work order status
**Steps**:
1. Work order stuck in IN_PROGRESS
2. Superuser clicks "Force Complete"
3. Enter justification: "System error, actual qty already recorded"
4. Confirm
**Expected Result**: Work order status = COMPLETED, justification logged in audit trail

**Test ID**: SUPERUSER-PERM-003
**Priority**: P0
**Type**: Security
**Test**: CAN impersonate other users for troubleshooting
**Steps**:
1. Navigate to Admin > Impersonate User
2. Select user: john.doe (Production Operator)
3. Click "Impersonate"
4. Banner shows "Impersonating: john.doe"
5. Navigate through system as operator
6. Click "End Impersonation"
**Expected Result**:
- All pages show operator's permissions
- Impersonation logged
- Can exit back to Superuser

**Test ID**: SUPERUSER-PERM-004
**Priority**: P0
**Type**: Security
**Test**: ALL Superuser actions require justification
**Steps**:
1. Attempt any elevated action (bypass validation, force status, etc.)
2. Leave justification field blank
3. Click Submit
**Expected Result**: Validation error "Justification required for Superuser actions"

---

[Continue with comprehensive Superuser test scenarios...]

---

## Role 19: Inventory Control Specialist

[Comprehensive test scenarios - Focus on cycle counts, inventory adjustments, stock reconciliation]

---

## Cross-Role Integration Tests

### Integration Test 1: New Product Introduction Workflow

**Participants**: Manufacturing Engineer → Production Planner → Production Supervisor → Production Operator → Quality Inspector
**Workflow**: Routing Creation → Scheduling → Release → Execution → Quality Verification

[Detailed multi-role workflow test...]

---

### Integration Test 2: Quality NCR Escalation

**Participants**: Quality Inspector → Quality Engineer → Production Supervisor → Superuser
**Workflow**: Defect Found → NCR Created → Corrective Action → Production Hold → Emergency Release

[Detailed multi-role workflow test...]

---

### Integration Test 3: DCMA Audit

**Participants**: Production Operator → Quality Engineer → DCMA Inspector
**Workflow**: Production Execution → Quality Inspection → Audit Verification

[Detailed multi-role workflow test...]

---

## Test Data Requirements

### Prerequisites for All Tests

1. **Users**: Create 19 test user accounts (one per role)
2. **Parts**: 50+ test parts with varying complexity
3. **Routings**: 30+ routings with different operation counts
4. **Work Orders**: 100+ work orders in various statuses
5. **Quality Data**: 20+ inspections, 10+ NCRs, 15+ FAI reports
6. **Materials**: 200+ material lots for traceability
7. **Equipment**: 20+ work centers with capacity data
8. **Electronic Signatures**: 50+ signature records

### Test Data Isolation

Each test suite uses isolated data to prevent interference:
- Production Operator tests use WO-OP-001 through WO-OP-100
- Quality Engineer tests use NCR-QE-001 through NCR-QE-050
- Manufacturing Engineer tests use Routing-ME-001 through Routing-ME-030

---

## Compliance Matrix

| Role | AS9100 | DCMA | Electronic Signatures | Audit Trail |
|------|--------|------|----------------------|-------------|
| Production Operator | ✅ | ⚠️ | ✅ | ✅ |
| Production Supervisor | ✅ | ⚠️ | ✅ | ✅ |
| Production Planner | ✅ | ❌ | ❌ | ✅ |
| Manufacturing Engineer | ✅ | ⚠️ | ✅ | ✅ |
| Quality Engineer | ✅ | ✅ | ✅ | ✅ |
| Quality Inspector | ✅ | ✅ | ✅ | ✅ |
| **DCMA Inspector** | ✅ | ✅ | ✅ | ✅ |
| Warehouse Manager | ⚠️ | ❌ | ❌ | ✅ |
| Logistics Coordinator | ⚠️ | ❌ | ❌ | ✅ |
| Maintenance Technician | ⚠️ | ❌ | ❌ | ✅ |
| Plant Manager | ✅ | ⚠️ | ❌ | ✅ |
| System Administrator | ✅ | ⚠️ | ✅ | ✅ |
| **Superuser** | ✅ | ✅ | ✅ | ✅ |

Legend:
- ✅ = Directly involved in compliance
- ⚠️ = Indirectly involved (data used for compliance)
- ❌ = Not involved in this compliance area

---

## Test Execution Plan

### Phase 1: Tier 1 Roles (Critical Path)
- **Duration**: 2 weeks
- **Roles**: Production Operator, Manufacturing Engineer, Production Supervisor, Quality Engineer, DCMA Inspector
- **Test Count**: ~250 tests
- **Priority**: P0

### Phase 2: Tier 2-3 Roles (Supporting Functions)
- **Duration**: 2 weeks
- **Roles**: Quality Inspector, Logistics, Warehouse, Process Engineer
- **Test Count**: ~200 tests
- **Priority**: P1

### Phase 3: Tier 4-5 Roles (Administration)
- **Duration**: 1 week
- **Roles**: Plant Manager, System Admin, Superuser, Inventory Control
- **Test Count**: ~150 tests
- **Priority**: P2

### Phase 4: Integration Testing
- **Duration**: 1 week
- **Test Count**: ~50 cross-role workflows
- **Priority**: P1

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| **Total Roles** | 19 |
| **Total Test Scenarios** | 1,500+ |
| **Authentication Tests** | 60+ |
| **Navigation Tests** | 100+ |
| **Permission Tests** | 200+ |
| **CRUD Tests** | 400+ |
| **Form Validation Tests** | 150+ |
| **Workflow Tests** | 300+ |
| **Reporting Tests** | 100+ |
| **Compliance Tests** | 190+ |
| **Integration Tests** | 50+ |

**Estimated Effort**: 8 weeks, 1 FTE

---

**Document Status**: Phase 1 Complete - Ready for Test Implementation
**Next Steps**: Expand testAuthHelper.ts with all 19 user personas
