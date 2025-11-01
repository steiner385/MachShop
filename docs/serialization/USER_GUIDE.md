# Serialization Workflows - User Guide
**Issue #150: Serialization - Advanced Assignment Workflows**

## Table of Contents

1. [Getting Started](#getting-started)
2. [Vendor Serial Management](#vendor-serial-management)
3. [System-Generated Serials](#system-generated-serials)
4. [Late Assignment Workflows](#late-assignment-workflows)
5. [Serial Propagation](#serial-propagation)
6. [Uniqueness & Conflict Management](#uniqueness--conflict-management)
7. [Trigger Configuration](#trigger-configuration)
8. [Serial Printing](#serial-printing)
9. [Audit Trail & Compliance](#audit-trail--compliance)
10. [Best Practices](#best-practices)

---

## Getting Started

### System Requirements

- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Access Level**: Production Access Required
- **Network**: Stable internet connection

### Accessing the Serialization System

1. Log in to the MachShop platform
2. Navigate to **Production** → **Serialization**
3. Select your manufacturing site from the site selector

### Key Concepts

**Serial Number**: A unique identifier assigned to manufactured parts for traceability.

**Trigger**: An automated rule that initiates serial assignment when a specific event occurs.

**Propagation**: The tracking of serials through manufacturing operations (pass-through, split, merge).

**Uniqueness Scope**: The level at which serials must be unique (Site, Enterprise, Part Type).

---

## Vendor Serial Management

### Overview

Use vendor serial management when receiving pre-serialized components from external suppliers.

### Workflow: Receiving Vendor Serials

#### Step 1: Access Vendor Serial Entry

1. Go to **Serialization** → **Vendor Serials** → **New**
2. Or use the **Receive Vendor Serial** button on the dashboard

#### Step 2: Enter Vendor Information

Fill in the following fields:

| Field | Required | Format | Example |
|-------|----------|--------|---------|
| Vendor Serial Number | Yes | Alphanumeric | `VS-2024-001` |
| Vendor Name | Yes | Text | `Acme Corporation` |
| Part ID | Yes | Part identifier | `PART-123456` |
| Received Date | No | Date-Time | `2024-11-01 10:00 AM` |

#### Step 3: Validate Serial

The system automatically validates:
- Format compliance (alphanumeric, length, pattern)
- Uniqueness (checks for duplicates)
- Part existence
- Vendor information

#### Step 4: Confirm Receipt

Click **Receive Vendor Serial** to register the serial in the system.

**Status**: Serial moves from PENDING to RECEIVED

### Workflow: Accepting/Rejecting Vendor Serials

#### Accept a Vendor Serial

1. Go to **Vendor Serials** → **Pending** tab
2. Select the serial number
3. Click **Accept**
4. Optionally link to internal serial (if not auto-generated)
5. Click **Confirm Accept**

**Result**: Serial status changes to ACCEPTED and is now usable in production.

#### Reject a Vendor Serial

1. Go to **Vendor Serials** → **Pending** tab
2. Select the serial number
3. Click **Reject**
4. Enter rejection reason (e.g., "Damaged packaging", "Format mismatch")
5. Click **Confirm Reject**

**Result**: Serial is marked REJECTED and excluded from production.

### Best Practices for Vendor Serials

- ✅ Use consistent serial number formatting
- ✅ Validate vendor information before accepting
- ✅ Document rejection reasons for vendor communication
- ✅ Review vendor serial statistics monthly
- ✅ Set up automated validation rules for repeat vendors

---

## System-Generated Serials

### Overview

System-generated serials are automatically created using configurable patterns when triggered by manufacturing events.

### Workflow: Configuring Serial Patterns

#### Step 1: Access Format Configuration

1. Go to **Settings** → **Serial Number Formats**
2. Click **New Format**

#### Step 2: Define Pattern Template

**Pattern Template** uses these tokens:

| Token | Description | Example |
|-------|-------------|---------|
| `{YYYY}` | 4-digit year | 2024 |
| `{MM}` | 2-digit month | 11 |
| `{DD}` | 2-digit day | 01 |
| `{SEQ:n}` | Sequential number (n digits) | {SEQ:4} → 0001 |
| `{RANDOM:n}` | Random alphanumeric (n chars) | {RANDOM:3} → X7K |
| `{CHECK:type}` | Check digit (luhn, modulo11) | {CHECK:luhn} → 4 |

**Example Patterns:**

```
TST-{YYYY}{MM}{DD}-{SEQ:4}
→ TST-20241101-0001, TST-20241101-0002

PROD-{SEQ:6}-{CHECK:luhn}
→ PROD-000001-8, PROD-000002-7
```

#### Step 3: Configure Pattern Properties

- **Prefix**: Static prefix (e.g., "PROD-")
- **Padding**: Left-pad sequence numbers with zeros
- **Check Digit**: Add Luhn or Modulo-11 check digit
- **Reset Frequency**: Daily, Weekly, Monthly, Yearly, Never

#### Step 4: Test Pattern

1. Click **Generate Test Serial**
2. Review generated sample
3. Click **Save** if pattern is correct

### Workflow: Setting Up Triggers

#### Step 1: Access Trigger Configuration

1. Go to **Serialization** → **Triggers** → **New Trigger**
2. Select the part from dropdown

#### Step 2: Configure Trigger Event

**Trigger Types Available:**

| Type | When It Fires | Use Case |
|------|---------------|----------|
| MATERIAL_RECEIPT | When material is received | Incoming components |
| WORK_ORDER_CREATE | When work order is created | Manufacturing start |
| OPERATION_COMPLETE | When operation finishes | After specific process |
| QUALITY_CHECKPOINT | When quality check passes | Inspection completion |
| BATCH_COMPLETION | When batch is finished | End of production run |

Select the trigger type that matches your manufacturing event.

#### Step 3: Select Assignment Type

Choose how serials are assigned:

- **SYSTEM_GENERATED**: Auto-generated from pattern
- **VENDOR**: Use vendor-supplied serial
- **LATE_ASSIGNMENT**: Manual assignment later

#### Step 4: Configure Conditional Logic (Optional)

For conditional triggers:

1. Enable **Conditional Trigger**
2. Add conditions (e.g., "Site = Location A")
3. Trigger only fires when conditions match

#### Step 5: Enable Batch Mode (Optional)

For high-volume serial generation:

1. Enable **Batch Mode**
2. Specify **Batch Size** (units per batch)
3. System generates serials in configured batches

#### Step 6: Save Trigger

Click **Create Trigger** to activate.

### Viewing Generated Serials

1. Go to **Serialization** → **Generated Serials**
2. Select part from filter
3. View all generated serials with timestamps and status

---

## Late Assignment Workflows

### Overview

Late assignment enables deferred serialization for post-manufacturing processes (e.g., after heat treatment).

### Workflow: Creating Placeholders

#### Step 1: Create Placeholder

1. Go to **Serialization** → **Late Assignment** → **New Placeholder**
2. Fill in:
   - **Part ID**: Which part is being produced
   - **Work Order**: Associated work order (optional)
   - **Operation Code**: Which operation completes (optional)
   - **Quantity**: How many units to create placeholders for

#### Step 2: Track Placeholders

1. Go to **Serialization** → **Late Assignment** → **Pending**
2. View all awaiting serialization
3. Filter by:
   - Status (PENDING, SERIALIZED, FAILED)
   - Part
   - Date range

### Workflow: Assigning Serials to Placeholders

#### When Serialization Occurs

1. Go to **Late Assignment** → **Pending**
2. Select placeholder
3. Click **Assign Serial**
4. Enter serial number
5. Click **Confirm**

**Result**: Placeholder status changes to SERIALIZED with timestamp.

### Workflow: Handling Failed Assignments

#### Mark as Failed

If a placeholder cannot be serialized:

1. Select placeholder
2. Click **Mark Failed**
3. Enter reason (e.g., "Part defective")
4. Click **Confirm**

**Result**: Placeholder marked FAILED, excluded from active tracking.

### Late Assignment Statistics

1. Go to **Serialization** → **Late Assignment** → **Statistics**
2. View for selected part:
   - Total pending placeholders
   - Successfully serialized count
   - Failed count
   - Average time to serialization

---

## Serial Propagation

### Overview

Serial propagation tracks how products move through manufacturing operations, capturing parent-child relationships and transformations.

### Propagation Types

**1. Pass-Through**
- Serial passes unchanged through operation
- Example: Testing, packaging

**2. Split**
- One serial becomes multiple serials
- Example: Large assembly split for sub-assembly

**3. Merge**
- Multiple serials combine into one
- Example: Components assembled into final product

**4. Transformation**
- Serial modified but maintains identity
- Example: Heat treatment, plating

### Workflow: Recording Pass-Through

1. At work center, scan/enter serial
2. Go to **Serialization** → **Propagation** → **Pass-Through**
3. Enter:
   - **Source Serial**: Serial being processed
   - **Operation Code**: Which operation (e.g., OP-001)
   - **Work Center**: Where it's processed
4. Click **Record**

**Result**: Operation recorded in serial lineage.

### Workflow: Recording Split

When one serial becomes multiple:

1. Go to **Serialization** → **Propagation** → **Record Split**
2. Enter:
   - **Source Serial**: Original serial
   - **Target Serials**: New serials created
   - **Operation Code**: Where split occurred
3. Click **Record Split**

**Result**: Parent-child relationship created, both serials linked.

### Workflow: Recording Merge

When multiple serials combine:

1. Go to **Serialization** → **Propagation** → **Record Merge**
2. Enter:
   - **Source Serials**: Serials being merged
   - **Target Serial**: Resulting serial
   - **Operation Code**: Where merge occurred
3. Click **Record Merge**

**Result**: Multi-parent lineage recorded.

### Viewing Serial Lineage

1. Go to **Serialization** → **Propagation** → **View Lineage**
2. Enter serial number
3. View:
   - **Ancestors**: All parent serials
   - **Descendants**: All child serials
   - **History**: All operations performed

### Propagation Statistics

1. Go to **Serialization** → **Propagation** → **Statistics**
2. View for selected part:
   - Total propagations recorded
   - Breakdown by type (pass-through, split, merge)
   - Operations performed
   - Average lineage depth

---

## Uniqueness & Conflict Management

### Overview

The system prevents duplicate serials within configured scopes (Site, Enterprise, Part Type).

### Uniqueness Scopes

**Site Level**: Serial must be unique within manufacturing site
- Use for: Track-and-trace within facility

**Enterprise Level**: Serial must be unique across all facilities
- Use for: Customer-facing traceability

**Part Type Level**: Serial must be unique within all parts of same type
- Use for: Component families

### Workflow: Checking Uniqueness

#### During Serial Creation

1. Go to **Serialization** → **Check Uniqueness**
2. Enter:
   - **Serial Number**: Number to check
   - **Part**: Which part type
   - **Scopes**: Where to check (Site, Enterprise, Part Type)
3. Click **Check**

**Results**:
- ✅ **Unique**: Serial available, can be assigned
- ⚠️ **Conflicts Found**: Duplicate detected, resolution required

### Workflow: Resolving Conflicts

When duplicates are detected:

#### Option 1: Keep This Serial

1. Click **Keep This Serial**
2. System keeps current serial, marks others as duplicate
3. Click **Confirm**

**Use case**: When new serial is the valid one.

#### Option 2: Retire Conflicting Serial

1. Click **Retire**
2. Select which serial to retire
3. Click **Confirm**

**Result**: Conflicting serial marked RETIRED, removed from active use.

#### Option 3: Mark as Invalid

1. Click **Mark Invalid**
2. System marks all conflicting serials as invalid
3. Click **Confirm**

**Use case**: When multiple duplicates exist, none are valid.

### Conflict Resolution History

1. Go to **Serialization** → **Uniqueness** → **Conflicts** → **History**
2. View all resolved conflicts:
   - Serial numbers
   - Resolution method used
   - Who resolved it
   - When it was resolved

---

## Trigger Configuration

### Overview

Triggers automate serial assignment based on manufacturing events.

### Workflow: Creating Triggers

**See [System-Generated Serials](#system-generated-serials) section above for detailed trigger setup.**

### Managing Active Triggers

#### View Triggers

1. Go to **Serialization** → **Triggers**
2. Select part to filter
3. View table of active triggers

**Columns shown:**
- Trigger type
- Assignment type
- Status (Active/Inactive)
- Batch mode configuration
- Last execution

#### Modify Trigger

1. Click **Edit** on trigger row
2. Change:
   - Conditions
   - Batch size
   - Status
3. Click **Save**

**Result**: Changes take effect immediately.

#### Disable Trigger

1. Click **Disable** on trigger row
2. Confirm disable

**Result**: Trigger no longer fires on events.

#### Re-enable Trigger

1. Click **Enable** on trigger row
2. Confirm enable

**Result**: Trigger resumes operation.

#### Delete Trigger

1. Click **Delete** on trigger row
2. Confirm deletion (irreversible)

**Result**: Trigger removed from system.

### Trigger Statistics

1. Go to **Serialization** → **Triggers** → **Statistics**
2. View for selected part:
   - Total triggers configured
   - Active/Inactive count
   - Breakdown by type
   - Breakdown by assignment type
   - Conditional triggers count
   - Batch-enabled count

---

## Serial Printing

### Overview

Configure label templates for printing serial numbers on physical labels.

### Workflow: Creating Print Template

#### Step 1: New Template

1. Go to **Serialization** → **Printing** → **Templates** → **New**
2. Name template (e.g., "Standard Shipping Label")

#### Step 2: Select Label Format

Choose printer type:
- **Zebra ZPL**: For Zebra printers
- **Thermal PDF**: For thermal label printers
- **Standard Label**: For any printer

#### Step 3: Set Label Dimensions

Select label size:
- 2" × 3" (Small label)
- 4" × 6" (Standard shipping)
- 3" × 5" (Medium label)

#### Step 4: Configure Quality

Select DPI (resolution):
- **203 DPI**: Standard quality
- **300 DPI**: High quality
- **600 DPI**: Maximum quality

#### Step 5: Customize Content

Choose what to print:

- ☑️ Serial Number (text)
- ☑️ QR Code (encodes serial, scannable)
- ☑️ Barcode (1D barcode format)
- ☑️ Lot Number
- ☑️ Part Number
- ☑️ Date

#### Step 6: Format Text

- **Font Family**: Courier, Arial, Times New Roman
- **Font Size**: 8-36 points

#### Step 7: Test Template

1. Click **Test Print**
2. System sends test print to configured printer
3. Verify label layout and content

#### Step 8: Save Template

Click **Save Template** to activate.

### Workflow: Printing Serials

#### Print Single Serial

1. Go to **Serialization** → **Printing** → **Print**
2. Enter serial number
3. Select template
4. Click **Print**

**Result**: Label prints to default printer.

#### Batch Print

1. Go to **Serialization** → **Printing** → **Batch Print**
2. Upload file with serial numbers (CSV, Excel)
3. Select template
4. Click **Print Batch**

**Result**: All serials print with configured template.

---

## Audit Trail & Compliance

### Overview

Complete audit trail tracks all serial operations for regulatory compliance (FDA, ISO, etc.).

### Accessing Audit Trail

1. Go to **Serialization** → **Audit Trail**
2. View chronological list of all events

### Filtering Audit Events

**By Event Type:**
- Vendor Received
- Vendor Accepted
- Serial Generated
- Propagated
- Conflict Detected
- Conflict Resolved

**By Status:**
- Success (✓)
- Failed (✗)
- Pending (⏱)

**By Date Range:**
- Use calendar picker to select dates

### Event Details

Click on any event to see:
- Event ID (unique identifier)
- Serial number
- What happened (event type)
- Who performed it (operator/system)
- When it happened (timestamp)
- Additional context

### Compliance Reports

#### Generate Audit Report

1. Go to **Audit Trail** → **Export**
2. Select date range
3. Select filters (optional)
4. Click **Generate CSV**

**Result**: Downloads audit trail as Excel file for archival.

#### Compliance Dashboard

1. Go to **Audit Trail** → **Compliance**
2. View statistics:
   - Total events recorded
   - Success rate (%)
   - Failed operations
   - Trends over time

### Best Practices for Compliance

- ✅ Review audit trail weekly
- ✅ Export monthly reports for archival
- ✅ Document all conflict resolutions
- ✅ Maintain change logs for trigger modifications
- ✅ Verify serial authenticity regularly

---

## Best Practices

### Serial Management

1. **Use Consistent Formats**
   - Define pattern templates early
   - Enforce naming conventions
   - Audit non-compliant serials

2. **Validate Early**
   - Check uniqueness before assignment
   - Verify vendor serials on receipt
   - Test system-generated patterns

3. **Document Decisions**
   - Record conflict resolutions
   - Note exceptions
   - Maintain audit trail

### Trigger Configuration

1. **Test Before Production**
   - Create test triggers first
   - Verify with sample parts
   - Validate generated serials

2. **Monitor Trigger Performance**
   - Review statistics regularly
   - Check failed operations
   - Adjust batch sizes as needed

3. **Organize by Part Type**
   - Group similar parts
   - Use consistent trigger naming
   - Document trigger purposes

### Propagation Tracking

1. **Record Immediately**
   - Scan at each operation
   - Complete split/merge at point of operation
   - Don't batch record later

2. **Verify Lineage**
   - Periodically check serial lineage
   - Ensure parent-child relationships are correct
   - Fix any gaps promptly

3. **Use Meaningful Operation Codes**
   - Match your routing structure
   - Include location in code (e.g., OP-001-WC01)
   - Document mapping

### Uniqueness Management

1. **Define Scopes Clearly**
   - Document why each scope
   - Review scope effectiveness quarterly
   - Adjust if needed

2. **Resolve Conflicts Promptly**
   - Don't leave conflicts pending
   - Document resolution reason
   - Communicate with affected teams

3. **Review Conflict Trends**
   - Monitor conflict rate
   - Investigate spikes
   - Prevent recurring issues

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| Serial generation fails | Check format config, verify part exists |
| Trigger not firing | Verify trigger is enabled, check conditions |
| Uniqueness check timeout | Reduce scope, increase search timeout |
| Lineage shows incomplete | Ensure all operations recorded, check dates |
| Print template not working | Test printer connection, verify template format |
| Audit trail missing events | Check date range filter, verify permissions |

For additional help, see [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)

---

## Additional Resources

- **API Documentation**: See [API_REFERENCE.md](./API_REFERENCE.md)
- **Deployment Guide**: See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Troubleshooting**: See [TROUBLESHOOTING.md](./TROUBLESHOOTING.md)
- **Video Tutorials**: Available in system help menu
- **Contact Support**: production-support@company.com
