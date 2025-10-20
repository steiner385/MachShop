# Functionality & Requirements Gaps Analysis

**Date**: October 19, 2025
**Source**: Role-Based E2E Test Scenario Development & Execution
**Status**: 🔴 Critical Gaps Identified

---

## Executive Summary

During the development of comprehensive role-based test scenarios for all 19 MES user roles and subsequent test execution, we identified **significant functionality and requirements gaps**. These gaps fall into three categories:

1. **Missing Features** - Documented in test scenarios but not yet implemented (HIGH PRIORITY)
2. **Permission Boundary Violations** - Security/access control gaps (HIGH PRIORITY)
3. **Workflow Inconsistencies** - Process flow gaps identified during scenario mapping (MEDIUM PRIORITY)

---

## Category 1: Missing Features (Confirmed by Test Execution)

### 🔴 CRITICAL - Tier 1 Production Features

#### 1.1 Digital Work Instructions System
**Status**: ❌ NOT IMPLEMENTED
**Route**: `/workinstructions` (404 Not Found)
**Impact**: 5 failed tests, blocks Production Operator core functionality

**Required Functionality**:
- View work instruction for specific operation
- Step-by-step guidance display
- Image/diagram support for work instructions
- PDF attachment support
- Revision history tracking
- Electronic acknowledgment (operator signs off on reading WI)

**User Stories Affected**:
- Production Operator: "As an operator, I need to view work instructions for my assigned operation"
- Production Operator: "As an operator, I need step-by-step guidance to execute operations correctly"
- Manufacturing Engineer: "As an engineer, I need to create and publish work instructions"

**Test Scenarios Blocked**:
```
PROD-OP-WI-001: View work instruction for operation ❌
PROD-OP-WI-002: Execute work instruction with step-by-step guidance ❌
PROD-OP-WI-003: CANNOT create or edit work instructions ❌
MFG-ENG-CRUD-002: Create work instruction with images/diagrams ❌
MFG-ENG-CRUD-003: Publish work instruction to production floor ❌
```

**Business Impact**:
- Operators cannot access procedural guidance
- Quality issues due to lack of standardized instructions
- Training difficulties for new operators
- AS9100 compliance gap (work instructions required)

---

#### 1.2 Routing Management UI
**Status**: ❌ NOT IMPLEMENTED
**Route**: `/routing` (404 Not Found)
**Impact**: 6 failed tests, blocks Manufacturing Engineer core functionality

**Required Functionality**:
- View all routings for parts
- Create new routing (sequence of operations)
- Define operations with work centers, tooling, cycle times
- Version control for routing changes
- Multi-site routing support
- Copy/clone routing from similar parts
- Routing approval workflow
- Routing BOM integration

**Backend Status**: ✅ Routing service exists but has schema bugs:
```typescript
// Bug in RoutingService.ts:273
// Uses Part.name but schema has Part.partName
```

**User Stories Affected**:
- Manufacturing Engineer: "As an engineer, I need to define the sequence of operations for a part"
- Manufacturing Engineer: "As an engineer, I need to specify work centers and tooling for each operation"
- Process Engineer: "As a process engineer, I need to optimize routing cycle times"

**Test Scenarios Blocked**:
```
MFG-ENG-AUTH-001: Can access routing management ❌
MFG-ENG-PERM-001: CAN create and modify routings ❌
MFG-ENG-CRUD-001: Create routing for new part ❌
MFG-ENG-CRUD-004: Define process segment with operations ❌
PROC-ENG-CRUD-001: Optimize routing cycle times ❌
PROC-ENG-WORK-001: Analyze routing efficiency ❌
```

**Business Impact**:
- Cannot define manufacturing processes
- No standardized operation sequences
- Manual routing documentation (error-prone)
- Cannot calculate accurate lead times
- Process engineering cannot optimize flows

---

#### 1.3 Production Scheduling Dashboard
**Status**: ⚠️ PARTIALLY IMPLEMENTED
**Route**: `/schedules` (exists but has issues)
**Impact**: 2 failed tests, scheduler role functionality limited

**Required Functionality**:
- Visual scheduling board (Gantt chart)
- Drag-and-drop work order scheduling
- Work center capacity visualization
- Hot job/priority highlighting
- Constraint checking (material availability, tooling, personnel)
- Schedule optimization suggestions
- "What-if" scenario planning
- Schedule conflict alerts

**Current Issues**:
- Route configuration problems
- Dashboard not loading properly for scheduler role
- Permission checks failing

**Test Scenarios Blocked**:
```
SCHED-AUTH-001: Can access scheduling dashboard ❌
SCHED-WORK-001: Schedule work order to work center ⚠️
SCHED-WORK-002: Identify schedule conflicts ❌
SCHED-INT-001: View real-time work center capacity ❌
```

**Business Impact**:
- Manual scheduling (inefficient)
- Cannot visualize production capacity
- Schedule conflicts not detected
- Hot jobs not prioritized effectively

---

#### 1.4 Quality Approval Workflow
**Status**: ❌ NOT IMPLEMENTED
**Routes**: Quality approval screens missing
**Impact**: 4 failed tests, quality management incomplete

**Required Functionality**:
- Approve/reject quality documents
- Electronic signature integration (21 CFR Part 11)
- Approval routing (multi-level approvals)
- Approval history and audit trail
- Document status tracking
- Notification system for pending approvals

**User Stories Affected**:
- Quality Engineer: "As a QE, I need to approve FAI reports"
- Quality Inspector: "As an inspector, I need to approve inspection results"
- Production Operator: "As an operator, I CANNOT approve quality documents (permission boundary)"

**Test Scenarios Blocked**:
```
PROD-OP-PERM-004: CANNOT approve quality documents ❌
QUAL-ENG-WORK-001: Approve FAI report ❌
QUAL-ENG-WORK-002: Review and approve inspection plan ❌
DCMA-AUDIT-003: View approval history for audit ❌
```

**Business Impact**:
- Manual quality approvals (paper-based)
- No electronic signature compliance
- Audit trail gaps
- DCMA audit readiness issues

---

### 🟡 MEDIUM PRIORITY - Additional Missing Features

#### 1.5 Personnel Management UI
**Status**: 🟡 PARTIALLY IMPLEMENTED (backend exists)
**Routes**: Personnel pages limited

**Required Functionality**:
- View personnel qualifications and certifications
- Assign personnel to work centers
- Track training requirements
- Manage shift schedules
- Competency matrix visualization
- Personnel availability calendar

**Test Scenarios Affected**:
```
PROD-SUP-RPT-001: View team qualifications ⚠️
MAINT-SUP-CRUD-001: Assign technician to work order ⚠️
PLANT-MGR-RPT-002: View workforce utilization ⚠️
```

---

#### 1.6 Material Movement Tracking
**Status**: 🟡 PARTIALLY IMPLEMENTED
**Routes**: Material tracking limited

**Required Functionality**:
- Real-time material location tracking
- Lot/serial number scanning
- Material transfer between work centers
- Material consumption recording
- Material genealogy (parent-child relationships)
- Expiration date tracking

**Test Scenarios Affected**:
```
MAT-HAND-WORK-001: Transfer material between work centers ⚠️
MAT-HAND-INT-001: Scan barcode to track material movement ⚠️
TRACE-WORK-001: Trace material from raw to finished good ⚠️
```

---

#### 1.7 Equipment Maintenance Scheduling
**Status**: 🟡 PARTIALLY IMPLEMENTED
**Routes**: Maintenance module exists but limited

**Required Functionality**:
- Preventive maintenance scheduling
- Work order generation for maintenance
- Equipment history tracking
- Spare parts inventory integration
- Maintenance calendar view
- Downtime tracking and reporting

**Test Scenarios Affected**:
```
MAINT-TECH-WORK-001: Complete preventive maintenance ⚠️
MAINT-SUP-CRUD-003: Schedule preventive maintenance ⚠️
PLANT-MGR-RPT-003: View equipment downtime analysis ⚠️
```

---

## Category 2: Permission Boundary Violations (Security Gaps)

### 🔴 HIGH PRIORITY - Security Issues

#### 2.1 Create Work Order Button - Not Properly Restricted
**Status**: ❌ SECURITY VIOLATION
**Affected Roles**: Production Operator, Production Supervisor, Production Scheduler

**Current Behavior**:
- "Create Work Order" button is visible and enabled for roles without `workorders.write` permission
- Frontend does not check permissions before rendering action buttons

**Expected Behavior**:
- Button should be disabled or hidden for roles without permission
- Backend API properly rejects unauthorized requests (✅ working)
- Frontend should match backend permission model

**Test Failures**:
```
PROD-OP-PERM-002: CANNOT create new work orders ❌
PROD-SUP-PERM-003: CANNOT create new work orders ❌
SCHED-PERM-003: CANNOT create new work orders ❌
```

**Security Risk**:
- Users without permission can click buttons and receive error messages
- Poor user experience (confusion about permissions)
- Potential for users to attempt unauthorized actions

**Fix Required**:
```typescript
// Add to WorkOrderList.tsx
import { useAuthStore } from '@/store/authStore';

const { hasPermission } = useAuthStore();
const canCreateWorkOrder = hasPermission('workorders.write');

<Button
  type="primary"
  disabled={!canCreateWorkOrder}
  onClick={handleCreate}
>
  Create Work Order
</Button>
```

---

#### 2.2 Admin Functions - Not Properly Guarded
**Status**: ❌ SECURITY VIOLATION
**Affected Roles**: Production Operator, Production Supervisor

**Current Behavior**:
- Admin/system configuration links visible to non-admin roles
- No route guards on admin pages
- Users can navigate to admin routes and get 403 errors

**Expected Behavior**:
- Admin menu items hidden from non-admin roles
- Route guards redirect unauthorized users
- Clear permission boundaries

**Test Failures**:
```
PROD-OP-AUTH-002: CANNOT access admin functions ❌
PROD-SUP-AUTH-003: CANNOT access admin or system config ❌
```

**Security Risk**:
- Information disclosure (users see admin options exist)
- Poor UX (users confused about access)
- Potential for privilege escalation attempts

**Fix Required**:
```typescript
// Add to MainLayout.tsx navigation
{hasRole('System Administrator', 'Plant Manager') && (
  <Menu.Item key="/admin">
    <SettingOutlined />
    <span>Administration</span>
  </Menu.Item>
)}
```

---

#### 2.3 DCMA Inspector - Dashboard Authorization Errors
**Status**: ⚠️ CONFIGURATION ISSUE (not a security risk, but UX problem)

**Current Behavior**:
- DCMA Inspector has `*.read` permission (read-only access to everything)
- Dashboard endpoint requires specific roles: `System Administrator`, `Plant Manager`, `Production Supervisor`, `Production Planner`, `Operator`
- DCMA Inspector gets 403 errors on dashboard API calls

**Expected Behavior**:
- DCMA Inspector should be able to view dashboard (read-only)
- API should check for `dashboard.read` permission instead of hardcoded roles
- READ-ONLY access properly enforced

**Backend Fix Required**:
```typescript
// src/routes/dashboardRoutes.ts
// BEFORE (role-based check):
requireRole(['System Administrator', 'Plant Manager', ...])

// AFTER (permission-based check):
requirePermission('dashboard.read')
```

**Test Warnings** (not failures, but logged):
```
Multiple role authorization failed for dcma.inspector on /dashboard/kpis
Multiple role authorization failed for dcma.inspector on /dashboard/recent-work-orders
```

---

## Category 3: Workflow & Process Gaps

### 🟡 MEDIUM PRIORITY - Workflow Issues

#### 3.1 Material Requirement Planning (MRP) Integration
**Gap Identified**: Test scenarios assume MRP integration exists

**Current State**:
- Work orders created manually
- No automatic material requirement calculation
- No purchase requisition generation

**Expected Functionality** (from test scenarios):
```
PROD-PLAN-INT-001: Create work order with automatic material requirements
PROD-PLAN-INT-002: Generate purchase requisitions for missing materials
WARE-MGR-INT-001: Receive MRP-driven material requests
```

**Business Impact**:
- Manual material planning (inefficient)
- Material shortages not predicted
- No integration with ERP for purchasing

---

#### 3.2 Real-Time Equipment Status Integration
**Gap Identified**: Test scenarios assume equipment integration exists

**Current State**:
- Equipment status manually entered
- No real-time machine data collection
- No automatic downtime tracking

**Expected Functionality** (from test scenarios):
```
PROD-OP-INT-002: Equipment status visible before starting operation
MAINT-TECH-INT-001: Receive automatic alert when equipment fails
PLANT-MGR-RPT-004: View real-time OEE dashboard
```

**Business Impact**:
- No real-time production visibility
- Downtime not automatically captured
- OEE calculations based on manual data

---

#### 3.3 Cross-Site Material Transfers
**Gap Identified**: Multi-site routing scenarios assume transfer workflows exist

**Current State**:
- Single-site system implementation
- No inter-site transfer functionality
- Multi-site routing data model exists but no UI

**Expected Functionality** (from test scenarios):
```
WARE-MGR-WORK-003: Transfer material to another site
LOG-COORD-WORK-001: Coordinate cross-site material shipment
INV-SPEC-WORK-002: Reconcile inventory across multiple sites
```

**Business Impact**:
- Cannot manage multi-site operations
- Manual tracking of cross-site transfers
- Inventory visibility limited to single site

---

#### 3.4 Lot Traceability - Forward and Backward
**Gap Identified**: Complete genealogy tracking not fully implemented

**Current State**:
- Basic lot tracking exists
- Material lot relationships stored
- No UI for visualizing complete genealogy

**Expected Functionality** (from test scenarios):
```
TRACE-WORK-001: Full forward traceability (raw material → finished goods)
TRACE-WORK-002: Full backward traceability (finished goods → raw materials)
QUAL-ENG-AUDIT-002: Generate traceability report for DCMA audit
```

**Business Impact**:
- Manual traceability investigations (slow)
- Recall procedures inefficient
- Audit preparation time-consuming

---

#### 3.5 Serialization & Unique ID Tracking
**Gap Identified**: Advanced serialization features not implemented

**Current State**:
- Basic serial number storage
- No barcode/QR code generation
- No serial number validation rules

**Expected Functionality** (from test scenarios):
```
SERIAL-WORK-001: Generate unique serial number per business rules
SERIAL-WORK-002: Print serialized part label with QR code
SERIAL-INT-001: Scan serial number to retrieve part history
```

**Business Impact**:
- Manual serial number assignment
- No automated label printing
- Serial number conflicts possible

---

## Category 4: Data Model & Backend Issues

### 🟡 LOW PRIORITY - Technical Debt

#### 4.1 Prisma Schema Inconsistencies
**Issue**: Field name mismatches between services and schema

**Example Found**:
```typescript
// RoutingService.ts:273 uses:
part: { select: { name: true } }

// But Prisma schema has:
model Part {
  partName String  // Not "name"
}
```

**Impact**:
- Backend errors during routing queries
- Runtime crashes when routing feature accessed

**Fix Required**: Audit all services for schema field name usage

---

#### 4.2 Missing Database Indexes
**Gap Identified**: Performance issues likely for large datasets

**Areas of Concern**:
- Work order queries by status and date range (no composite index)
- Material lot queries by part number (not indexed)
- Serial number lookups (not indexed on serialNumber field)

**Test Scenarios That May Fail at Scale**:
```
PROD-PLAN-RPT-001: View work orders summary (large datasets)
TRACE-WORK-001: Material traceability (complex joins)
SERIAL-WORK-003: Search by serial number (table scan)
```

---

## Category 5: Requirements Gaps (Design Clarifications Needed)

### 🔵 CLARIFICATION NEEDED

#### 5.1 Electronic Signature Workflow
**Question**: How should multi-level approvals work?

**Test Scenario Assumptions**:
- FAI reports require 2 signatures: Quality Engineer + Quality Inspector
- NCR dispositions require 3 signatures: QE + QI + Customer approval (for aerospace)
- Work instructions require 1 signature: Manufacturing Engineer

**Clarification Needed**:
- Sequential vs. parallel approvals?
- Approval delegation rules?
- Re-approval after document revision?

---

#### 5.2 DCMA Inspector Access Level
**Question**: Should DCMA have truly universal read access?

**Current Implementation**: `*.read` permission (everything)

**Questions**:
- Should DCMA see user passwords/security settings?
- Should DCMA see cost data?
- Should DCMA see proprietary process parameters?
- Should DCMA access be time-limited (audit window only)?

**Recommendation**: Define explicit permission list for DCMA rather than wildcard

---

#### 5.3 Work Order Creation Authority
**Question**: Who can create work orders?

**Current Assumptions** (from test scenarios):
- Production Planner: ✅ YES
- Production Scheduler: ❌ NO (can only schedule existing WOs)
- Production Supervisor: ❌ NO (supervises execution)
- Manufacturing Engineer: ❌ NO (designs processes)

**Clarification Needed**:
- Can supervisors create emergency work orders?
- Can engineers create prototype/R&D work orders?
- What about rework work orders?

---

## Summary Statistics

### Gaps by Category
| Category | Critical | High | Medium | Low | Total |
|----------|----------|------|--------|-----|-------|
| Missing Features | 4 | 0 | 3 | 0 | **7** |
| Security/Permissions | 2 | 1 | 0 | 0 | **3** |
| Workflow Gaps | 0 | 0 | 5 | 0 | **5** |
| Backend Issues | 0 | 0 | 0 | 2 | **2** |
| Requirements Clarification | 0 | 0 | 3 | 0 | **3** |
| **TOTAL** | **6** | **1** | **11** | **2** | **20** |

### Impact on Test Pass Rate
| Tier | Total Tests | Blocked by Gaps | Affected % |
|------|-------------|-----------------|------------|
| Tier 1 (Production) | 83 | 12 | 14% |
| Tier 2 (Quality) | ~70 (est.) | ~10 (est.) | ~14% |
| Tier 3 (Materials) | ~50 (est.) | ~8 (est.) | ~16% |
| Tier 4 (Maintenance) | ~30 (est.) | ~5 (est.) | ~17% |
| Tier 5 (Admin) | ~25 (est.) | ~3 (est.) | ~12% |

**Estimated Overall Impact**: ~38 tests blocked out of ~258 total tests ≈ **15% of tests cannot pass** due to missing features

---

## Prioritized Action Plan

### Phase 1: Critical Gaps (Sprint 1-2)
**Goal**: Enable core production workflows

1. ✅ **Implement Work Instructions UI** (5 days)
   - View work instructions
   - Step-by-step display
   - PDF attachments

2. ✅ **Implement Routing Management UI** (8 days)
   - View routings
   - Create/edit routing
   - Fix Prisma schema bug

3. ✅ **Fix Permission Boundary Violations** (2 days)
   - Add permission checks to buttons
   - Add role guards to admin routes
   - Fix DCMA dashboard access

4. ✅ **Implement Quality Approval Workflow** (5 days)
   - Approval screens
   - Electronic signature integration
   - Approval history

**Sprint 1-2 Total**: 20 days = 4 weeks

---

### Phase 2: High Priority Gaps (Sprint 3-4)
**Goal**: Complete Tier 1 functionality

1. ✅ **Fix Production Scheduling Dashboard** (3 days)
2. ✅ **Enhance Personnel Management UI** (5 days)
3. ✅ **Complete Material Movement Tracking** (5 days)
4. ✅ **Equipment Maintenance Scheduling** (5 days)

**Sprint 3-4 Total**: 18 days

---

### Phase 3: Medium Priority Gaps (Sprint 5-6)
**Goal**: Advanced features and integrations

1. ✅ **MRP Integration** (8 days)
2. ✅ **Real-Time Equipment Integration** (10 days)
3. ✅ **Cross-Site Transfer Workflows** (7 days)
4. ✅ **Enhanced Traceability UI** (5 days)
5. ✅ **Serialization Features** (5 days)

**Sprint 5-6 Total**: 35 days

---

### Phase 4: Technical Debt & Optimization
**Goal**: Performance and maintainability

1. ✅ **Audit Prisma Schema Usage** (2 days)
2. ✅ **Add Database Indexes** (3 days)
3. ✅ **Requirements Clarification Meetings** (3 days)
4. ✅ **Update Documentation** (2 days)

**Phase 4 Total**: 10 days

---

## Conclusion

The role-based testing effort has successfully identified **20 significant gaps** across the MES system:

- **6 CRITICAL gaps** requiring immediate attention
- **1 HIGH priority gap** affecting security
- **11 MEDIUM priority gaps** limiting functionality
- **2 LOW priority technical debt items**

### Value Delivered by Testing Effort

1. **Early Gap Detection**: Found issues before production deployment
2. **Prioritized Roadmap**: Clear understanding of what to build next
3. **User-Centric View**: Gaps identified from user role perspective
4. **Compliance Visibility**: AS9100/DCMA gaps clearly documented
5. **Security Improvements**: Permission violations found and documented

### Next Steps

1. **Development Team**: Review and estimate effort for Phase 1 critical gaps
2. **Product Team**: Clarify requirements questions in Category 5
3. **QA Team**: Continue testing Tiers 2-5 to identify additional gaps
4. **Project Management**: Schedule sprints for gap remediation

---

**Report Generated**: October 19, 2025
**Source**: Role-Based E2E Test Development & Execution
**Total Gaps Identified**: 20
**Tests Blocked**: ~38 out of 258 (15%)
**Estimated Remediation**: 83 days (≈4 months with 1 developer)
