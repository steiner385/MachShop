# OSP Operations Management System - User Guide

**Issue #59: Core OSP/Farmout Operations Management System**

## Table of Contents

1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Managing OSP Operations](#managing-osp-operations)
4. [Shipment Management](#shipment-management)
5. [Supplier Information](#supplier-information)
6. [Performance Tracking](#performance-tracking)
7. [Common Tasks](#common-tasks)
8. [FAQ](#faq)

## Getting Started

### Accessing the System

1. Open your web browser and navigate to: `https://yourcompany.com/osp`
2. Log in with your credentials
3. You'll see the main OSP dashboard

### User Interface Overview

The OSP system uses a clean, intuitive interface organized around four main sections:

- **Operations Dashboard**: View and manage OSP operations
- **Supplier Masters**: Manage supplier capabilities
- **Create Shipment**: Initiate new shipments
- **Performance Dashboard**: Track supplier performance

## Dashboard Overview

### Main Dashboard

The Operations Dashboard is your primary view for managing outside processing operations.

#### Status Overview Cards

At the top of the dashboard, you'll see four summary cards:

- **Total Operations**: All OSP operations in the system
- **Completed Operations**: Successfully accepted and completed
- **In Transit**: Shipments currently traveling to/from supplier
- **Issues**: Operations requiring attention or approval

#### Operations List

The main table displays all operations with the following columns:

| Column | Description |
|--------|-------------|
| OSP # | Unique operation identifier (OSP-YYYY-#####) |
| Operation | Manufacturing operation being performed |
| Supplier | Vendor performing the operation |
| Status | Current state of operation |
| Qty Sent | Quantity shipped to supplier |
| Qty Received | Quantity returned from supplier |
| Accepted | Quantity accepted after inspection |
| Est. Return | Expected return date |

#### Filtering Operations

Use the **Status Filter** dropdown to view operations in specific states:

- **All**: Show all operations
- **PENDING_SHIPMENT**: Waiting to be sent
- **SHIPPED**: In transit to supplier
- **AT_SUPPLIER**: Arrived at supplier facility
- **IN_PROGRESS**: Being processed by supplier
- **INSPECTION**: Under quality inspection
- **RECEIVED**: Returned but awaiting acceptance
- **ACCEPTED**: Approved and ready for use
- **REJECTED**: Failed quality inspection

#### Color-Coded Status Badges

Status badges use colors for quick visual identification:

- **Blue (PENDING_SHIPMENT)**: Awaiting shipment
- **Orange (SHIPPED, IN_PROGRESS)**: In active processing
- **Yellow (INSPECTION, RECEIVED)**: Awaiting action
- **Green (ACCEPTED)**: Complete
- **Red (REJECTED)**: Failed

### Quick Actions

From the operations list, you can:

1. **Click an operation row** to view full details
2. **Click the Status Badge** to transition to the next state (if allowed)
3. **Click Cancel** to cancel an operation (if status permits)

## Managing OSP Operations

### Viewing Operation Details

When you click on an operation, a detail panel opens showing:

- **Operation Information**: OSP number, supplier, dates
- **Quantities**: Sent, received, accepted, rejected
- **Costs**: Estimated cost, actual cost, variance
- **Status**: Current state and available transitions
- **Notes**: Any special instructions or records

### Transitioning Operation Status

Operations follow a defined workflow:

```
PENDING_SHIPMENT → SHIPPED → AT_SUPPLIER → IN_PROGRESS → INSPECTION → RECEIVED → ACCEPTED
```

#### Transitioning to the Next State

1. Click on the operation in the list
2. Look for the **available status buttons** in the detail panel
3. Click the next status button (e.g., "Mark as Shipped")
4. Confirm the transition

#### Valid Transitions

Not all transitions are allowed. The system prevents invalid status changes:

- **From PENDING_SHIPMENT**: Can go to SHIPPED
- **From SHIPPED**: Can go to AT_SUPPLIER
- **From AT_SUPPLIER**: Can go to IN_PROGRESS
- **From IN_PROGRESS**: Can go to INSPECTION
- **From INSPECTION**: Can go to RECEIVED
- **From RECEIVED**: Can go to ACCEPTED or REJECTED
- **From ACCEPTED**: Operation is complete

### Canceling an Operation

You can cancel an operation if it hasn't been accepted:

1. Click on the operation
2. Scroll to the bottom of the detail panel
3. Click **"Cancel Operation"** button
4. Enter the reason for cancellation
5. Click **"Confirm"**

Cancellations are logged for audit purposes.

### Recording Quantities

As the operation progresses, you'll update quantity information:

1. **Quantity Sent**: Recorded when operation is SHIPPED
2. **Quantity Received**: Recorded when operation is RECEIVED
3. **Quantity Accepted**: Recorded when operation is ACCEPTED (may differ from received if defects are found)
4. **Quantity Rejected**: Any pieces that fail quality inspection

## Shipment Management

### Creating a New Shipment

The **Create Shipment** wizard guides you through the process in three steps.

#### Step 1: Select Operation

1. Click **"Create Shipment"** from the menu
2. Click the **Operation dropdown**
3. Select the operation to ship
4. Review the operation summary
5. Click **"Next"**

#### Step 2: Shipment Details

Enter the shipping information:

- **Shipment Type**:
  - *TO_SUPPLIER*: Materials going to supplier
  - *FROM_SUPPLIER*: Materials returning from supplier
- **Quantity**: Number of units being shipped
- **Shipping Method**: Ground, Air, 2-Day, Overnight, etc.
- **PO/Job Number** (optional): Reference number for tracking

#### Step 3: Carrier Information

Enter carrier details:

- **Carrier Name**: FedEx, UPS, DHL, etc.
- **Tracking Number**: Provided by the carrier
- **Notes** (optional): Special handling instructions

Click **"Create Shipment"** to complete.

### Tracking Shipments

Once a shipment is created and marked as shipped:

1. Go to the **Operations Dashboard**
2. Find the operation
3. Look for **"View Shipments"** button
4. Click to see all shipments for that operation
5. Click on a shipment to see tracking information

#### Tracking by Number

If you have a tracking number:

1. Go to **Operations Dashboard**
2. Use the **Search** function (if available)
3. Enter the tracking number
4. View detailed shipment status

### Shipment Status Flow

Shipments progress through these states:

| Status | Meaning |
|--------|---------|
| DRAFT | Shipment created but not ready to send |
| RELEASED | Ready for pickup by carrier |
| PICKED | Carrier has picked up the shipment |
| SHIPPED | In transit |
| IN_TRANSIT | Actively being transported |
| DELIVERED | Delivered to recipient |
| RECEIVED | Confirmed receipt at destination |

### Recording Carrier Updates

As carrier updates arrive:

1. Open the shipment details
2. Click **"Update Tracking"**
3. Enter the new tracking information
4. Update the status if known
5. Click **"Save"**

## Supplier Information

### Supplier Masters

The **Supplier Masters** section helps you manage supplier capabilities and qualifications.

#### Viewing Suppliers

The supplier list shows:

- **Supplier Code**: Internal identifier
- **Supplier Name**: Company name
- **Quality Rating**: Badge showing recent quality performance
- **On-Time Rate**: Percentage of on-time deliveries

#### Adding Supplier Capabilities

To authorize a supplier for new operations:

1. Click **"Add Capability"** button
2. Fill in the capability form:
   - **Capability Type**: Type of operation (e.g., Heat Treat, Plating)
   - **Certifications**: Required certifications (e.g., ISO 9001, NADCAP)
   - **Min Order Quantity**: Minimum units per order
   - **Max Order Quantity**: Maximum units per order
   - **Standard Lead Time**: Expected processing days
3. Click **"Save"**

#### Managing Capabilities

Once capabilities are added, you can:

- **View** all capabilities for a supplier
- **Update** lead times or order constraints
- **Archive** capabilities that are no longer used
- **Add certifications** as supplier qualifications improve

### Viewing Supplier Details

Click on a supplier name to see:

- **Contact Information**: Phone, email, address
- **Active Capabilities**: Operations they're qualified for
- **Recent Performance**: Last 12 months of metrics
- **Quality Issues**: Any recent problems
- **Certifications**: Current certifications held

## Performance Tracking

### Performance Dashboard

The **Performance Dashboard** provides insights into supplier performance.

#### Overview Cards

At the top, see aggregate metrics:

- **Average Quality Score**: Overall quality performance
- **Average On-Time Rate**: Delivery timeliness
- **Total Active Suppliers**: Count of suppliers
- **Top Performer**: Best-performing supplier

#### Supplier Rankings

The main table ranks suppliers by overall performance score:

| Column | Meaning |
|--------|---------|
| Rank | 1-10 ranking based on overall score |
| Supplier | Vendor name |
| Quality % | Quality score (0-100%) |
| On-Time % | Delivery timeliness (0-100%) |
| Cost Variance % | How actual costs compare to estimates |
| Overall Score | Weighted composite score |

Colors indicate performance:
- **Green**: 90% or higher (excellent)
- **Yellow**: 75-89% (acceptable)
- **Red**: Below 75% (needs improvement)

#### Performance Scorecard

Click on a supplier to see their detailed scorecard:

- **12-Month Metrics**: Complete history
- **Average Scores**: Overall performance averages
- **Trend Analysis**: Improving or declining
- **Specific Metrics**: Detailed quality, delivery, and cost data

### Understanding Performance Metrics

#### On-Time Delivery Rate
- Percentage of operations completed by the requested return date
- Calculated: (On-time completions ÷ Total completions) × 100

#### Quality Score
- Percentage of accepted operations with no defects
- Calculated: (Defect-free operations ÷ Total completions) × 100

#### Cost Variance
- How actual costs compare to estimated costs
- Calculated: ((Estimated cost - Actual cost) ÷ Estimated cost) × 100
- Positive variance means supplier came in under budget

#### Overall Score
- Weighted average of three metrics:
  - 40% On-time delivery
  - 40% Quality
  - 20% Cost variance

## Common Tasks

### Task 1: Send an Operation to a Supplier

**Time: 10-15 minutes**

1. Go to **Operations Dashboard**
2. Review the operation details
3. Create a shipment:
   - Click **"Create Shipment"**
   - Select the operation
   - Enter shipment details
   - Provide carrier information
4. Mark operation as SHIPPED
5. Provide the tracking number to supplier

### Task 2: Receive and Inspect Materials

**Time: 20-30 minutes**

1. Monitor shipment tracking
2. When delivered, go to the operation record
3. Update the operation to RECEIVED status
4. Record quantities received:
   - Total items received
   - Items with defects
   - Items accepted for use
5. Mark as ACCEPTED if quality is satisfactory
6. Or REJECTED if quality issues exist
7. Document any defects in the notes

### Task 3: Check Supplier Performance

**Time: 5 minutes**

1. Go to **Performance Dashboard**
2. Find the supplier in the rankings table
3. Click on their name to view the scorecard
4. Review their recent performance
5. Use data to inform future supplier decisions

### Task 4: Add a New Supplier Capability

**Time: 5-10 minutes**

1. Go to **Supplier Masters**
2. Find the supplier in the list
3. Click **"Add Capability"**
4. Select the operation type they can perform
5. Enter certifications they have
6. Set minimum/maximum order quantities
7. Specify standard lead time
8. Click **"Save"**

### Task 5: Track a Shipment

**Time: 5 minutes**

1. You have a tracking number from the carrier
2. Go to **Operations Dashboard**
3. Use the **Search** function (if available)
4. Enter the tracking number
5. View the shipment status and expected delivery date
6. Click on the shipment for detailed tracking history

## FAQ

### Q: Can I send the same operation to multiple suppliers at once?

**A**: No. Each OSP operation is associated with a single supplier. If you need to split an operation across multiple suppliers, create separate OSP operations for each supplier with the appropriate quantities.

### Q: What happens if I reject an operation due to quality issues?

**A**: When you REJECT an operation:
- It's marked as REJECTED in the system
- The supplier is notified
- Quality issues are logged
- The operation typically must be resubmitted or reworked
- The supplier's quality metrics are negatively impacted

### Q: Can I cancel an operation after it's been shipped?

**A**: You can cancel an operation at any point until it's ACCEPTED. However:
- Cancellation after SHIPPED may incur costs
- You should notify the supplier immediately
- Document the cancellation reason in the notes
- The system logs all cancellations for audit purposes

### Q: How are supplier performance scores calculated?

**A**: Scores are calculated monthly from completed operations:
- On-time deliveries: 40% of score
- Quality (defect-free): 40% of score
- Cost variance: 20% of score

Scores are aggregated monthly, quarterly, and annually.

### Q: What should I do if a shipment tracking number is incorrect?

**A**:
1. Contact the carrier immediately to verify the correct tracking number
2. Update the shipment record with the correct number
3. Click **"Update Tracking"** in the shipment details
4. Enter the corrected tracking number
5. Save the changes

### Q: Can I see the history of all operations sent to a specific supplier?

**A**: Yes! Go to:
1. **Supplier Masters**
2. Click on the supplier
3. View **"Recent Operations"** section (if available)
4. This shows all operations with that supplier

Or from **Operations Dashboard**, use the Status Filter and manually search for operations with that supplier name.

### Q: How do I know when a shipment is expected to arrive?

**A**:
1. Once a shipment is marked as SHIPPED, the standard lead time for that supplier is used as a baseline
2. Check the shipment details for the **Estimated Delivery Date**
3. Use carrier tracking for more precise delivery windows
4. Monitor the shipment status in the system

### Q: What if I notice a supplier's performance is declining?

**A**:
1. Review their **Performance Scorecard**
2. Identify which metrics are declining (quality, delivery, cost)
3. Consider:
   - Scheduling a call with the supplier
   - Reviewing recent operations for common issues
   - Reducing volumes if quality is concerning
   - Finding an alternative supplier for new operations
4. Document any discussions in operation notes

### Q: Can I export operation or shipment data?

**A**: Contact your system administrator. Export functionality may be available through reports or data export features.

### Q: How long does the system keep historical data?

**A**: Your administrator determines data retention. Typically:
- Current year operations: Always available
- Previous years: 3-5 year retention
- Archived operations: May be moved to separate storage

### Q: Who can I contact if I have problems?

**A**:
- **Technical Issues**: Contact your IT department or system administrator
- **Process Questions**: Ask your supervisor or operations manager
- **Access Issues**: Contact your system administrator
- **Bug Reports**: Document the issue and send to the development team

---

## Tips for Efficient Use

1. **Check the dashboard daily** for operations requiring attention
2. **Update tracking numbers promptly** for visibility
3. **Monitor performance scores** to identify supplier trends
4. **Use status filters** to focus on specific operations
5. **Document issues** in operation notes for future reference
6. **Review supplier scorecards** before assigning new operations

---

**Last Updated**: November 1, 2025
**Version**: 1.0.0
**Issue Reference**: #59

For additional support, contact your system administrator.
