# Andon System User Guide

## Table of Contents
- [Introduction](#introduction)
- [Getting Started](#getting-started)
- [Raising an Alert](#raising-an-alert)
- [Alert Lifecycle](#alert-lifecycle)
- [Managing Your Alerts](#managing-your-alerts)
- [Understanding Escalations](#understanding-escalations)
- [Common Workflows](#common-workflows)
- [Tips and Best Practices](#tips-and-best-practices)
- [Troubleshooting](#troubleshooting)

## Introduction

The Andon system is your tool for quickly reporting and resolving production issues. Named after the Japanese manufacturing term for a visual alert system, it helps maintain quality, safety, and efficiency on the shop floor.

### What is Andon?

Andon is a lean manufacturing concept that empowers every worker to:
- **Stop problems at the source** - Report issues immediately when detected
- **Get help quickly** - Automatically notify the right people
- **Track resolution** - Monitor progress from report to resolution
- **Prevent recurrence** - Build a knowledge base of issues and solutions

### When to Use Andon

Use the Andon system to report:
- **Quality Issues**: Defects, non-conformances, specification deviations
- **Safety Concerns**: Hazards, near-misses, unsafe conditions
- **Equipment Problems**: Breakdowns, malfunctions, unusual behavior
- **Material Issues**: Shortages, wrong materials, damaged supplies
- **Process Problems**: Unclear instructions, missing tools, workflow blocks

## Getting Started

### Accessing the Andon System

1. **Shop Floor Terminals**: Touch-screen kiosks located throughout the production area
2. **Desktop Access**: Available through the MachShop web application
3. **Mobile Devices**: Tablet-optimized interface for supervisors and managers

### Login and Authentication

```
1. Navigate to the Andon interface
2. Enter your employee ID or scan your badge
3. Select your work area (if not pre-configured)
4. You're ready to report issues!
```

### Understanding the Interface

The Andon interface is designed for quick action:

```
┌─────────────────────────────────────────────┐
│            ANDON ALERT SYSTEM               │
├─────────────────────────────────────────────┤
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ QUALITY  │ │  SAFETY  │ │EQUIPMENT │  │
│  │    🔍    │ │    ⚠️    │ │    🔧    │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ MATERIAL │ │ PROCESS  │ │  OTHER   │  │
│  │    📦    │ │    ⚙️    │ │    ❓    │  │
│  └──────────┘ └──────────┘ └──────────┘  │
│                                             │
│         [VIEW ACTIVE ALERTS]                │
│                                             │
└─────────────────────────────────────────────┘
```

## Raising an Alert

### Step 1: Select Issue Type

Choose the category that best describes your issue:

| Issue Type | Examples | Typical Response Time |
|------------|----------|----------------------|
| **Quality** | Defects, measurement issues, spec violations | 5-10 minutes |
| **Safety** | Injuries, hazards, PPE issues | IMMEDIATE |
| **Equipment** | Breakdowns, alarms, performance issues | 10-15 minutes |
| **Material** | Shortages, wrong parts, damage | 15-20 minutes |
| **Process** | Instructions, tooling, workflow | 20-30 minutes |

### Step 2: Provide Details

Fill in the alert form:

```
┌─────────────────────────────────────────────┐
│           CREATE NEW ALERT                  │
├─────────────────────────────────────────────┤
│                                             │
│  Title: [Brief description of the issue]   │
│                                             │
│  Description (optional):                    │
│  ┌─────────────────────────────────────┐  │
│  │                                      │  │
│  │  Detailed explanation...             │  │
│  │                                      │  │
│  └─────────────────────────────────────┘  │
│                                             │
│  Severity:  ○ Low ○ Medium ● High ○ Critical│
│  Priority:  ○ Low ● Normal ○ High ○ Urgent │
│                                             │
│  Location:                                  │
│  Work Center: [Auto-filled or select]      │
│  Equipment: [Select if applicable]         │
│  Work Order: [Auto-filled if applicable]   │
│                                             │
│  Attachments: [📷 Add Photo] [📎 Add File] │
│                                             │
│  [CANCEL]              [SUBMIT ALERT]       │
│                                             │
└─────────────────────────────────────────────┘
```

### Step 3: Submit and Confirm

After submission:
1. You'll receive an **Alert Number** (e.g., AND-2024-001234)
2. The alert appears on the status board
3. Notifications are sent to the appropriate personnel
4. You can track the alert's progress

### Quick Alert Options

For common issues, use quick alert buttons:
- **Red Button**: Safety emergency (immediate escalation)
- **Yellow Button**: Quality hold (stops the line)
- **Blue Button**: Assistance needed (calls supervisor)

## Alert Lifecycle

Understanding how alerts move through the system:

```
OPEN → ACKNOWLEDGED → IN_PROGRESS → RESOLVED → CLOSED
  ↓         ↓              ↓           ↓
  └─────→ ESCALATED ←──────┘           │
              ↓                        │
          (Higher Level)               │
              ↓                        │
          RESOLVED ←───────────────────┘
```

### Status Definitions

| Status | Description | Who Can Set | Next Steps |
|--------|-------------|-------------|------------|
| **OPEN** | New alert created | System | Wait for acknowledgment |
| **ACKNOWLEDGED** | Someone is aware | Supervisor+ | Begin investigation |
| **IN_PROGRESS** | Being worked on | Assignee | Work toward resolution |
| **ESCALATED** | Elevated to higher level | System/Manager | Higher priority handling |
| **RESOLVED** | Solution implemented | Assignee | Verify and close |
| **CLOSED** | Complete and verified | Supervisor+ | Archive for reference |
| **CANCELLED** | Invalid or duplicate | Supervisor+ | No further action |

### Response Time Expectations

Based on severity and priority:

| Severity | Priority | Target Acknowledgment | Target Resolution |
|----------|----------|----------------------|-------------------|
| CRITICAL | URGENT | < 2 minutes | < 30 minutes |
| CRITICAL | HIGH | < 5 minutes | < 1 hour |
| HIGH | HIGH | < 10 minutes | < 2 hours |
| HIGH | NORMAL | < 15 minutes | < 4 hours |
| MEDIUM | NORMAL | < 30 minutes | < 8 hours |
| LOW | LOW | < 1 hour | < 24 hours |

## Managing Your Alerts

### Viewing Your Alerts

Access your alert dashboard to see:
- **My Open Alerts**: Issues you've raised
- **Assigned to Me**: Issues you need to resolve
- **Team Alerts**: Issues in your area

```
┌─────────────────────────────────────────────┐
│            MY ALERTS DASHBOARD              │
├─────────────────────────────────────────────┤
│                                             │
│  Active Alerts (3)                         │
│  ┌────────────────────────────────────┐   │
│  │ AND-2024-001234 | Equipment Jam    │   │
│  │ Status: IN_PROGRESS | 15 min ago   │   │
│  └────────────────────────────────────┘   │
│  ┌────────────────────────────────────┐   │
│  │ AND-2024-001235 | Material Short   │   │
│  │ Status: OPEN | 5 min ago          │   │
│  └────────────────────────────────────┘   │
│  ┌────────────────────────────────────┐   │
│  │ AND-2024-001236 | Quality Check    │   │
│  │ Status: ACKNOWLEDGED | 2 min ago   │   │
│  └────────────────────────────────────┘   │
│                                             │
└─────────────────────────────────────────────┘
```

### Updating an Alert

If you're assigned to an alert, you can:
1. **Change Status**: Move through the lifecycle
2. **Add Notes**: Document findings and actions
3. **Attach Files**: Add photos or documents
4. **Request Help**: Escalate if needed

### Closing an Alert

When resolving an alert:
1. Document the **root cause**
2. Describe **actions taken**
3. Note any **preventive measures**
4. Confirm the issue is fully resolved

## Understanding Escalations

### Automatic Escalation

The system automatically escalates alerts based on:
- **Time**: No response within target time
- **Severity**: Critical issues escalate faster
- **Rules**: Custom rules for specific scenarios

### Escalation Levels

```
Level 0: Initial Assignment (e.g., Line Supervisor)
   ↓ (no response in 15 min)
Level 1: Area Manager
   ↓ (no response in 30 min)
Level 2: Production Manager
   ↓ (no response in 1 hour)
Level 3: Plant Manager
```

### Manual Escalation

You can manually escalate an alert if:
- The issue is more serious than initially thought
- You need expertise beyond your level
- Resolution is blocked by external factors

## Common Workflows

### Workflow: Quality Issue on Production Line

1. **Operator detects defect**
   - Press Quality button on Andon board
   - Select "Dimensional Issue"
   - Add photo of defective part

2. **Quality Inspector responds**
   - Acknowledges alert
   - Comes to workstation
   - Performs inspection

3. **Resolution**
   - Inspector identifies tool wear
   - Maintenance called for tool change
   - Production resumed after verification
   - Alert closed with preventive maintenance scheduled

### Workflow: Safety Near-Miss

1. **Worker observes unsafe condition**
   - Selects Safety issue type
   - Marks as HIGH severity
   - Describes hazard location

2. **Safety Officer response**
   - Immediate acknowledgment
   - Area cordoned off
   - Hazard assessment conducted

3. **Corrective Action**
   - Hazard eliminated
   - Safety briefing conducted
   - Alert closed with lessons learned documented

### Workflow: Equipment Breakdown

1. **Machine stops unexpectedly**
   - Operator raises Equipment alert
   - Selects CRITICAL severity
   - Notes error code displayed

2. **Maintenance response**
   - Technician assigned automatically
   - Acknowledges and arrives on scene
   - Diagnoses issue

3. **Repair Process**
   - Parts ordered if needed
   - Temporary workaround implemented
   - Full repair completed
   - Alert closed with downtime recorded

## Tips and Best Practices

### Do's

✅ **Be Specific**: "Conveyor belt making grinding noise at Station 3" is better than "Equipment problem"

✅ **Act Quickly**: Report issues as soon as detected to minimize impact

✅ **Include Context**: Mention work order, batch number, or operation when relevant

✅ **Follow Up**: Check on your alerts and provide additional information if requested

✅ **Learn Patterns**: Review closed alerts to understand common issues and solutions

### Don'ts

❌ **Don't Delay**: Waiting makes problems worse and harder to trace

❌ **Don't Assume**: If unsure about severity, err on the side of caution

❌ **Don't Duplicate**: Check if alert already exists before creating new one

❌ **Don't Ignore**: Respond to alerts assigned to you promptly

❌ **Don't Misuse**: System is for legitimate production issues only

### Severity Guidelines

Choose severity based on impact:

| Severity | Production Impact | Safety Impact | Quality Impact | Cost Impact |
|----------|------------------|---------------|----------------|-------------|
| **CRITICAL** | Line stopped | Injury risk | Customer impact | >$10,000 |
| **HIGH** | Significant slowdown | Hazard present | Batch at risk | $1,000-$10,000 |
| **MEDIUM** | Minor slowdown | Potential hazard | Rework needed | $100-$1,000 |
| **LOW** | No immediate impact | Housekeeping issue | Cosmetic only | <$100 |

## Troubleshooting

### Common Issues and Solutions

**Can't log in to Andon system**
- Verify your employee ID is correct
- Ensure you have Andon access permissions
- Contact your supervisor for access issues

**Alert not appearing after submission**
- Check for confirmation message with alert number
- Refresh the dashboard
- Verify network connectivity

**Wrong person assigned to alert**
- Assignment based on issue type and location
- Supervisor can reassign if needed
- Check escalation rules with admin

**Not receiving notifications**
- Verify your contact information in the system
- Check notification preferences
- Ensure you're in the correct notification group

**Can't close an alert**
- Only assignee or supervisor can close
- All required fields must be completed
- Resolution notes are mandatory

### Getting Help

For Andon system issues:
1. **First**: Check this guide and FAQs
2. **Second**: Ask your supervisor or team lead
3. **Third**: Contact IT support (ext. 1234)
4. **Emergency**: Use backup paper forms if system is down

### System Status Indicators

Watch for these system indicators:

| Indicator | Meaning | Action |
|-----------|---------|--------|
| 🟢 Green | System operational | Normal use |
| 🟡 Yellow | Degraded performance | Expect delays |
| 🔴 Red | System unavailable | Use backup process |
| 🔵 Blue | Maintenance mode | Limited functionality |

## Appendix: Quick Reference Card

### Keyboard Shortcuts (Desktop)

- `Alt + N`: New alert
- `Alt + V`: View alerts
- `Alt + S`: Change status
- `Alt + E`: Escalate
- `Esc`: Cancel/Close dialog

### Common Alert Codes

- `QC-xxx`: Quality Control
- `SF-xxx`: Safety
- `EQ-xxx`: Equipment
- `MT-xxx`: Material
- `PR-xxx`: Process
- `OT-xxx`: Other

### Contact List

| Role | Name | Extension | Mobile |
|------|------|-----------|--------|
| Andon Admin | System Admin | 1234 | On-call |
| Day Supervisor | [Name] | 2001 | [Number] |
| Night Supervisor | [Name] | 2002 | [Number] |
| Maintenance | On-duty Tech | 3001 | [Number] |
| Quality | QC Inspector | 4001 | [Number] |
| Safety | Safety Officer | 5001 | [Number] |

---

*Remember: The Andon system is here to help you maintain quality and safety. When in doubt, raise an alert – it's better to be safe than sorry!*