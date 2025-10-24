# Routing Visual Editor - User Guide

## Table of Contents
1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Visual Editor Interface](#visual-editor-interface)
4. [Working with Nodes](#working-with-nodes)
5. [Connecting Steps](#connecting-steps)
6. [Advanced Routing Patterns](#advanced-routing-patterns)
7. [Templates](#templates)
8. [Collaboration Features](#collaboration-features)
9. [Best Practices](#best-practices)
10. [Troubleshooting](#troubleshooting)

---

## Overview

The Visual Routing Editor is a modern, graphical interface for creating and managing manufacturing routings. Built on ReactFlow, it provides an intuitive drag-and-drop experience for designing complex production flows.

### Key Features
- **Dual-Mode Interface**: Switch seamlessly between Form View and Visual Editor
- **Industry-Standard Node Types**: PROCESS, INSPECTION, DECISION, PARALLEL operations, and more
- **Auto-Layout**: Automatic graph layout using Dagre algorithm
- **Real-Time Collaboration**: See who's viewing/editing routings with you
- **Template Library**: Save and reuse common routing patterns
- **Version Control**: Optimistic locking prevents conflicting changes

### When to Use Visual Editor
- **Complex routings** with multiple branches or parallel operations
- **Visual documentation** for production processes
- **Template creation** for standardized operations
- **Quick prototyping** of new manufacturing flows

---

## Getting Started

### Accessing the Visual Editor

1. **Navigate to Routings**
   - From the main menu, select **Production** → **Routings**
   - Or go directly to `/routings`

2. **Create or Edit a Routing**
   - Click **"Create New Routing"** or select an existing routing
   - Fill in basic information (Routing Number, Part, Site)

3. **Switch to Visual Editor**
   - Click the **"Visual Editor"** tab at the top of the form
   - The ReactFlow canvas will appear

### Required Permissions
- **View**: `routings.read` or role: Production Supervisor, Production Planner
- **Edit**: `routings.write` or role: Manufacturing Engineer, Process Engineer
- **Approve**: `routings.approve` or role: Plant Manager, Quality Manager

---

## Visual Editor Interface

### Main Components

#### 1. Canvas (ReactFlow)
The central workspace where you design your routing by adding and connecting nodes.

**Navigation:**
- **Pan**: Click and drag on empty space
- **Zoom**: Mouse wheel or zoom controls
- **Select**: Click on nodes or edges

#### 2. Control Panel
Quick-add buttons for common node types:
- **Start/End**: Flow terminators
- **Process**: Standard manufacturing operations
- **Inspection**: Quality control checkpoints
- **Decision**: Conditional branching
- **Parallel**: Concurrent operations
- **OSP**: Outside processing/farmout
- **Lot Control**: Lot splitting/merging

#### 3. Zoom Controls
- **Zoom In** (+)
- **Zoom Out** (-)
- **Fit View**: Center all nodes

#### 4. Mini-Map
Small overview of the entire routing for quick navigation (optional).

#### 5. Action Buttons
- **Save**: Persist changes to database
- **Undo**: Revert last change (if implemented)
- **Redo**: Reapply undone change (if implemented)
- **Auto-Layout**: Automatically organize nodes

---

## Working with Nodes

### Node Types

#### START Node (Green)
- **Purpose**: Entry point for routing
- **Color**: Green (#52c41a)
- **Icon**: Play icon
- **Usage**: Every routing should have one START node

#### PROCESS Node (Blue)
- **Purpose**: Standard manufacturing operation
- **Color**: Blue (#1890ff)
- **Icon**: Tool icon
- **Properties**:
  - Operation code
  - Work center
  - Standard time
  - Setup time
  - Control type (LOT/SERIAL)

#### INSPECTION Node (Purple)
- **Purpose**: Quality inspection checkpoint
- **Color**: Purple (#722ed1)
- **Icon**: Check circle
- **Properties**:
  - Inspection type
  - Required documentation
  - Acceptance criteria

#### DECISION Node (Yellow)
- **Purpose**: Mutually exclusive paths (e.g., Pass/Fail)
- **Color**: Yellow (#faad14)
- **Icon**: Branches
- **Usage**: For conditional routing based on inspection results

#### PARALLEL_SPLIT Node (Purple)
- **Purpose**: Start concurrent operations
- **Color**: Purple (#722ed1)
- **Icon**: Split
- **Usage**: When multiple operations can happen simultaneously

#### PARALLEL_JOIN Node (Purple)
- **Purpose**: Wait for all parallel operations to complete
- **Color**: Purple (#722ed1)
- **Icon**: Merge
- **Usage**: Synchronization point after PARALLEL_SPLIT

#### OSP Node (Pink)
- **Purpose**: Outside processing/farmout operations
- **Color**: Pink (#eb2f96)
- **Icon**: External link
- **Properties**:
  - Vendor information
  - Lead time
  - Cost

#### LOT_SPLIT Node (Lime)
- **Purpose**: Divide lot into sub-lots
- **Color**: Lime (#a0d911)
- **Icon**: Split
- **Usage**: When lot must be divided for parallel processing

#### LOT_MERGE Node (Lime)
- **Purpose**: Combine sub-lots back into one
- **Color**: Lime (#a0d911)
- **Icon**: Merge
- **Usage**: Reunite lots after LOT_SPLIT

#### TELESCOPING Node (Gray)
- **Purpose**: Optional operation
- **Color**: Gray
- **Icon**: Optional flag
- **Usage**: Operations that may be skipped

#### END Node (Red)
- **Purpose**: Exit point for routing
- **Color**: Red (#f5222d)
- **Icon**: Stop icon
- **Usage**: Every routing should have at least one END node

### Adding Nodes

**Method 1: Control Panel**
1. Click the desired node type button in the control panel
2. Node appears on canvas at default position
3. Drag to desired location

**Method 2: Palette (if available)**
1. Open the routing palette
2. Search or browse node types
3. Click or drag node to canvas

### Editing Node Properties

1. **Click on a node** to select it
2. **Right-click** or **double-click** to open properties panel
3. Edit fields:
   - Label/Name
   - Step number
   - Operation code
   - Work center
   - Timing (setup, standard, teardown)
   - Control type (LOT_CONTROLLED, SERIAL_CONTROLLED, MIXED)
   - Optional flags (isOptional, isCriticalPath)
4. **Save** changes

### Deleting Nodes

1. **Select the node** (click to highlight)
2. Press **Delete** key or **Backspace**
3. Or click **Delete** button in properties panel
4. Confirm deletion if prompted

---

## Connecting Steps

### Creating Connections (Edges)

1. **Hover over source node** until connection handles appear
2. **Click and drag** from output handle (right side)
3. **Drop on target node's** input handle (left side)
4. Edge is created automatically

### Connection Types (Dependency Types)

#### FINISH_TO_START (FS) - Default
- Most common dependency
- Next step starts when previous step finishes
- **Example**: Machining must finish before inspection starts

#### START_TO_START (SS)
- Both steps start at the same time
- **Example**: Setup and material preparation can start together

#### FINISH_TO_FINISH (FF)
- Both steps must finish together
- **Example**: Final assembly and packaging complete simultaneously

#### START_TO_FINISH (SF)
- Rare dependency
- Next step starts when previous step finishes
- **Example**: Just-in-time scenarios

### Editing Connection Properties

1. **Click on an edge** to select it
2. **Connection Editor modal** appears
3. Configure:
   - **Dependency Type**: FS, SS, FF, SF
   - **Lag/Lead Time**:
     - Positive = Delay (wait time after dependency)
     - Negative = Lead (overlap time)
   - **Description**: Notes about the connection
   - **Flags**: Optional, Critical Path
4. **Save** changes

### Deleting Connections

1. **Click on edge** to select it
2. Press **Delete** key
3. Or click **Delete** button in connection editor

---

## Advanced Routing Patterns

### Mutually Exclusive Operations (DECISION)

**Use Case**: Route based on inspection results (Pass/Fail)

**Pattern:**
```
[PROCESS] → [INSPECTION] → [DECISION]
                              ├─ Pass → [SHIPPING]
                              └─ Fail → [REWORK] → [INSPECTION]
```

**Setup:**
1. Add INSPECTION node after process
2. Add DECISION node after inspection
3. Create two edges from DECISION:
   - One labeled "Pass" to shipping
   - One labeled "Fail" to rework
4. Connect rework back to inspection (loop)

### Parallel Operations

**Use Case**: Multiple operations that can happen simultaneously

**Pattern:**
```
[PROCESS] → [PARALLEL_SPLIT]
              ├─ [MACHINING]
              ├─ [HEAT_TREAT]
              └─ [COATING]
            → [PARALLEL_JOIN] → [FINAL_ASSEMBLY]
```

**Setup:**
1. Add PARALLEL_SPLIT node
2. Add multiple operation nodes (MACHINING, HEAT_TREAT, COATING)
3. Connect PARALLEL_SPLIT to all parallel operations
4. Add PARALLEL_JOIN node
5. Connect all parallel operations to PARALLEL_JOIN
6. Continue to next step

### Telescoping (Optional Operations)

**Use Case**: Operations that may be skipped based on customer requirements

**Pattern:**
```
[MACHINING] → [DEBURRING] → [FINAL_INSPECTION]
              (isOptional=true)
```

**Setup:**
1. Add TELESCOPING node or mark regular node as optional
2. Set `isOptional=true` in node properties
3. Connect normally in sequence
4. System allows skipping during execution

### OSP/Farmout Operations

**Use Case**: Send part to external vendor for processing

**Pattern:**
```
[PREP] → [OSP: Heat Treatment] → [INSPECTION] → [ASSEMBLY]
```

**Setup:**
1. Add OSP node
2. Configure vendor information:
   - Vendor name/ID
   - Lead time (days)
   - Cost
   - Shipping instructions
3. Connect in sequence

### Lot Control

**Use Case**: Divide lot for parallel processing, then reunite

**Pattern:**
```
[RECEIVING] → [LOT_SPLIT]
                ├─ [LINE_1]
                ├─ [LINE_2]
                └─ [LINE_3]
              → [LOT_MERGE] → [FINAL_PACKAGING]
```

**Setup:**
1. Add LOT_SPLIT node where lot divides
2. Add parallel processes
3. Add LOT_MERGE node to reunite lots
4. Set control type to LOT_CONTROLLED on relevant nodes
5. Continue to next steps

---

## Templates

### What Are Templates?

Templates are reusable routing patterns that can be saved and loaded to quickly create new routings. They capture:
- Node structure (all steps and their types)
- Connections (edges and dependencies)
- Visual layout (node positions)
- Step properties (operation codes, timing, etc.)

### Benefits
- **Consistency**: Standardize processes across products
- **Speed**: Create new routings in seconds
- **Best Practices**: Capture proven workflows
- **Training**: Document standard procedures

### Creating a Template

#### From Visual Editor:
1. **Design your routing** in the visual editor
2. Click **"Save as Template"** button (or menu option)
3. **Template Dialog** appears:
   - **Name**: Descriptive name (e.g., "Standard PCB Assembly")
   - **Description**: Detailed explanation
   - **Category**: ASSEMBLY, MACHINING, INSPECTION, etc.
   - **Tags**: Keywords for searching (e.g., ["pcb", "electronics"])
4. Click **"Save Template"**

#### From Existing Routing:
1. Navigate to routing details page
2. Click **"Save as Template"** in actions menu
3. Fill in template details
4. Save

### Browsing Templates

1. **Open Template Library**:
   - From routings page: Click **"Templates"** button
   - Or navigate to `/routings/templates`

2. **Template Library Features**:
   - **Search**: Find by name or description
   - **Filter by Category**: ASSEMBLY, MACHINING, INSPECTION, OSP, OTHER
   - **Filter by Tags**: Click tags to filter
   - **Sort by**: Usage count, favorites, date created
   - **View Modes**: Grid or list view

3. **Template Cards Show**:
   - Template name and description
   - Category badge
   - Usage count (how many times used)
   - Favorite star icon
   - Preview thumbnail (if available)
   - Created by and date

### Using a Template

1. **Find desired template** in library
2. Click **"Use Template"** or **"Load"** button
3. You're redirected to **new routing form**
4. Template data is pre-filled:
   - All nodes and connections loaded in visual editor
   - Switch to Form View to set routing-specific data:
     - Routing Number
     - Part
     - Site
     - Version
5. **Customize** as needed
6. **Save** new routing

**Note**: Using a template increments its usage count, helping identify popular patterns.

### Managing Templates

#### Favorite Templates:
- Click **star icon** to mark as favorite
- Favorites appear at top of template library
- Personal to each user

#### Edit Template:
1. Open template in library
2. Click **"Edit"** button
3. Modify name, description, category, or tags
4. **Cannot edit visual data** - create new template instead
5. Save changes

#### Delete Template:
1. Open template in library
2. Click **"Delete"** button
3. Confirm deletion
4. Template is permanently removed

---

## Collaboration Features

### Active Users Indicator

**What It Shows**:
- Who is currently viewing the routing
- Who is actively editing
- User avatars or initials
- User names on hover

**Location**: Top-right corner of routing form

**Status Indicators**:
- **Viewing** (eye icon): User is looking at routing
- **Editing** (pencil icon): User is making changes

### Real-Time Change Alerts

**When Someone Else Edits**:
- **Alert appears**: "This routing has been modified by [User]"
- **Options**:
  - **Reload**: Fetch latest version (lose your changes)
  - **Continue**: Keep working (may cause conflict)
- **Recommendation**: Reload if you haven't made significant changes

### Version Conflict Resolution

**If You Try to Save Conflicting Changes**:
1. **Conflict Modal** appears:
   - Shows who made changes
   - Shows when changes were made
   - Displays version numbers

2. **Resolution Options**:
   - **Reload Latest**: Discard your changes, load theirs
   - **Force Overwrite**: Keep your changes, overwrite theirs (⚠️ use carefully)
   - **Cancel**: Stay in editor, manually merge changes

3. **Best Practice**:
   - Communicate with other user via chat/phone
   - Reload latest and reapply your changes
   - Avoid force overwrite unless certain

### Optimistic Locking

The system uses version numbers to detect conflicts:
- Each save increments version number
- Save only succeeds if your version matches database version
- Prevents silent data loss from concurrent edits

---

## Best Practices

### Routing Design

1. **Start Simple**
   - Begin with linear flow (START → PROCESS → PROCESS → END)
   - Add complexity only when needed

2. **Use Meaningful Names**
   - Label nodes with clear operation names
   - Example: "CNC Milling - Op 10" not just "Milling"

3. **Follow Step Number Conventions**
   - Use 10, 20, 30... for flexibility
   - Allows inserting steps (15, 25) later

4. **Mark Critical Path**
   - Identify longest duration sequence
   - Set `isCriticalPath=true` on bottleneck steps

5. **Document Decisions**
   - Add descriptions to DECISION nodes
   - Explain criteria for each branch

### Visual Layout

1. **Use Auto-Layout**
   - Click "Auto-Layout" button for clean arrangement
   - Saves time and improves readability

2. **Left-to-Right Flow**
   - START on left, END on right
   - Matches reading direction

3. **Group Related Operations**
   - Keep parallel operations aligned vertically
   - Use whitespace to separate logical sections

4. **Avoid Crossing Edges**
   - Rearrange nodes to minimize edge crossings
   - Improves clarity

### Templates

1. **Create Templates Early**
   - Save common patterns as templates
   - Example: "3-Step Inspection Process"

2. **Use Descriptive Names**
   - "Standard PCB Assembly - Through-Hole"
   - Not just "PCB Template"

3. **Add Good Descriptions**
   - Explain when to use template
   - List any prerequisites

4. **Tag Thoroughly**
   - Add multiple tags for easy searching
   - Include product types, operations, equipment

5. **Review and Update**
   - Periodically review template library
   - Update or delete obsolete templates

### Collaboration

1. **Check Active Users**
   - Before editing, see who else is viewing
   - Coordinate with them if possible

2. **Save Frequently**
   - Reduces risk of conflicts
   - Enables incremental changes

3. **Reload Before Major Changes**
   - If someone else edited recently
   - Ensures you're working on latest version

4. **Use Descriptive Commit Messages**
   - If system has audit log
   - Example: "Added heat treatment step per engineering change ECN-12345"

---

## Troubleshooting

### Visual Editor Won't Load

**Symptoms**: Canvas is blank or shows error

**Solutions**:
1. **Refresh browser**: Ctrl+F5 (hard refresh)
2. **Clear cache**: Browser settings → Clear browsing data
3. **Check permissions**: Ensure you have `routings.read` permission
4. **Network issues**: Check browser console for API errors
5. **Contact admin**: If problem persists

### Nodes Won't Connect

**Symptoms**: Can't create edges between nodes

**Solutions**:
1. **Check connection handles**: Hover to reveal handles
2. **Connection direction**: Drag from output (right) to input (left)
3. **Node compatibility**: Some node types may have restrictions
4. **Try different target**: Some nodes may have max connections

### Changes Not Saving

**Symptoms**: Save button doesn't work or changes disappear

**Solutions**:
1. **Check for errors**: Look for error messages
2. **Validation issues**: Ensure required fields are filled
3. **Permission check**: Verify you have `routings.write` permission
4. **Network connection**: Check internet connectivity
5. **Version conflict**: Reload latest version and retry

### Template Not Loading

**Symptoms**: Template loads but data is missing

**Solutions**:
1. **Template corruption**: Try different template
2. **Version mismatch**: Template may be from older system version
3. **Missing data**: Template may have incomplete data
4. **Browser compatibility**: Try different browser
5. **Report issue**: Contact administrator with template ID

### Auto-Layout Issues

**Symptoms**: Auto-layout creates messy arrangement

**Solutions**:
1. **Simplify routing**: Too many nodes may cause issues
2. **Manual arrangement**: Layout manually for complex routings
3. **Group operations**: Use fewer top-level nodes
4. **Break into sub-routings**: Split very large routings

### Performance Issues

**Symptoms**: Slow rendering, lag when moving nodes

**Solutions**:
1. **Reduce node count**: Very large routings (>100 nodes) may be slow
2. **Close other tabs**: Free up browser memory
3. **Disable mini-map**: If available, turn off mini-map
4. **Use Form View**: For simple edits, use form instead
5. **Upgrade browser**: Use latest Chrome or Edge

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` / `Cmd+S` | Save routing |
| `Ctrl+Z` / `Cmd+Z` | Undo (if implemented) |
| `Ctrl+Y` / `Cmd+Y` | Redo (if implemented) |
| `Delete` / `Backspace` | Delete selected node/edge |
| `Ctrl+A` / `Cmd+A` | Select all nodes |
| `Ctrl+C` / `Cmd+C` | Copy selected nodes (if implemented) |
| `Ctrl+V` / `Cmd+V` | Paste nodes (if implemented) |
| `+` | Zoom in |
| `-` | Zoom out |
| `0` | Fit view (show all nodes) |

---

## API Reference

For developers integrating with the routing system:

### Endpoints

**Get Routing Visual Data**:
```http
GET /api/v1/routings/:id/visual-data
Authorization: Bearer {token}
```

**Create Routing with Visual Data**:
```http
POST /api/v1/routings/visual
Content-Type: application/json
Authorization: Bearer {token}

{
  "routingNumber": "RTG-001",
  "partId": "part-uuid",
  "siteId": "site-uuid",
  "visualData": {
    "nodes": [...],
    "edges": [...]
  }
}
```

**Update Routing with Visual Data**:
```http
PUT /api/v1/routings/:id/visual
Content-Type: application/json
Authorization: Bearer {token}

{
  "visualData": {
    "nodes": [...],
    "edges": [...]
  }
}
```

For complete API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

---

## Support

### Getting Help

1. **In-App Help**: Click "?" icon in top-right corner
2. **Documentation**: [https://docs.example.com/routing-editor](https://docs.example.com/routing-editor)
3. **Training Videos**: [https://training.example.com/routing](https://training.example.com/routing)
4. **Support Ticket**: [support@example.com](mailto:support@example.com)
5. **User Community**: [https://community.example.com](https://community.example.com)

### Feature Requests

Submit feature requests at: [https://feedback.example.com](https://feedback.example.com)

### Report Bugs

Report bugs with:
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Browser and version

---

## Glossary

- **Node**: A step or operation in the routing (visual representation)
- **Edge**: A connection between nodes (visual representation)
- **Routing**: Complete sequence of manufacturing operations
- **Step**: Individual operation in a routing (data model)
- **Dependency**: Relationship between steps (FS, SS, FF, SF)
- **Critical Path**: Longest duration sequence determining total cycle time
- **Lot Control**: Method of tracking parts (LOT vs SERIAL)
- **OSP**: Outside Processing (farmout to external vendor)
- **Telescoping**: Optional operation that may be skipped
- **Template**: Reusable routing pattern
- **Optimistic Locking**: Conflict prevention using version numbers

---

**Version**: 1.0
**Last Updated**: October 2025
**Feedback**: [routing-feedback@example.com](mailto:routing-feedback@example.com)
