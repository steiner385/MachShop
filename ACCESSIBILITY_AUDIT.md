# Interactive Components Accessibility Audit
## Keyboard Navigation & ARIA Enhancement Priority Analysis

**Analysis Date:** October 31, 2025
**Scope:** Frontend React Components (/frontend/src/components)
**Focus:** Table Components, Modal Dialogs, Drag-Drop Interfaces, Complex Form Controls

---

## EXECUTIVE SUMMARY

The MachShop2 codebase has strong foundational accessibility infrastructure in place:
- **useKeyboardHandler** hook for keyboard navigation
- **useFocusManagement** hook for focus management and trapping
- **KeyboardAccessible** components for wrapping interactive elements
- **ariaUtils** with comprehensive ARIA patterns and utilities
- **ApprovalTaskQueue** already implementing advanced keyboard features

However, many components still need keyboard navigation and ARIA enhancements. This analysis identifies the highest-priority components to enhance.

---

## TIER 1: CRITICAL PRIORITY (Highest Impact)
### Heavy-Use Interactive Components Requiring Keyboard Navigation

#### 1. **DraggableStepsTable** ⚠️ CRITICAL
**File:** `/frontend/src/components/Routing/DraggableStepsTable.tsx`

**Current State:**
- Uses `react-beautiful-dnd` for drag-and-drop
- Ant Design Table component
- Has minimal ARIA attributes (only `aria-label="delete step"` on one button)
- No keyboard support for drag-and-drop operations

**Issues:**
- ❌ Drag-drop is mouse-only (no keyboard fallback)
- ❌ No `role` attributes on draggable rows
- ❌ Missing `aria-label` for drag handle (`HolderOutlined` icon)
- ❌ No status announcements for reorder operations
- ❌ Table header missing ARIA table structure
- ❌ Edit/Delete buttons lack proper context

**Estimated Frequency:** Very High (Core routing feature)

**Recommended Enhancements:**
```
- Add keyboard shortcuts (Alt+Up/Down for reordering)
- Implement aria-label for drag handles
- Add live region announcements for reorder operations
- Enhance table structure with proper ARIA roles
- Add skip-to-content keyboard navigation
- Provide context about draggable rows to screen readers
```

---

#### 2. **BuildRecordList** 🔴 CRITICAL
**File:** `/frontend/src/components/BuildRecords/BuildRecordList.tsx`

**Current State:**
- Large table with multiple interactive elements
- Bulk action selection with checkboxes
- Dropdown menus for row actions
- Search, filter, and pagination
- Modal dialogs for creation/editing

**Issues:**
- ❌ No aria-labels for dropdown menus
- ❌ Bulk action buttons lack proper ARIA context
- ❌ Table header structure missing ARIA attributes
- ❌ Filter drawer lacks proper labeling
- ❌ No keyboard shortcuts for common actions
- ❌ Modal dialogs missing focus management
- ❌ Pagination controls need better ARIA support

**Estimated Frequency:** Very High (Primary build management interface)

**Recommended Enhancements:**
```
- Add aria-label to all action buttons
- Implement focus management for modal dialogs
- Add keyboard shortcuts for common operations
- Enhance table with ARIA table structure
- Add status announcements for bulk operations
- Improve pagination accessibility
```

---

#### 3. **ParameterGroupsTree** 🟠 HIGH
**File:** `/frontend/src/components/Parameters/ParameterGroupsTree.tsx`

**Current State:**
- Tree structure with drag-and-drop using `@dnd-kit`
- Expandable groups with form controls
- Modal for creating/editing groups

**Issues:**
- ❌ Tree structure lacks ARIA tree role
- ❌ No keyboard navigation (arrow keys) for tree
- ❌ Drag-drop has no keyboard fallback
- ❌ Tree items missing aria-expanded, aria-selected
- ❌ No keyboard shortcuts for common operations
- ❌ Modals lack focus management

**Estimated Frequency:** High (Parameter configuration)

**Recommended Enhancements:**
```
- Implement ARIA tree structure with tree/treeitem roles
- Add arrow key navigation (Up/Down/Left/Right)
- Provide keyboard drag-and-drop fallback
- Add aria-expanded/aria-selected states
- Implement focus management for modals
- Add status announcements for tree modifications
```

---

#### 4. **VisualRoutingEditor** 🟠 HIGH
**File:** `/frontend/src/components/Routing/VisualRoutingEditor.tsx`

**Current State:**
- ReactFlow-based visual editor with nodes and edges
- Custom node components (RoutingStepNode)
- Drag-and-drop canvas interaction

**Issues:**
- ❌ Canvas-based UI has no keyboard navigation
- ❌ Nodes lack keyboard selection support
- ❌ No keyboard shortcuts for common operations
- ❌ Controls panel lacks proper labeling
- ❌ No status announcements for graph changes
- ❌ ReactFlow doesn't provide native ARIA support

**Estimated Frequency:** High (Advanced routing design)

**Recommended Enhancements:**
```
- Implement keyboard-activated node selection
- Add arrow keys for panning/zooming
- Create keyboard shortcuts overlay
- Label all control buttons properly
- Implement focus management for dialog controls
- Add screen reader announcements for graph state
```

---

## TIER 2: HIGH PRIORITY (Important Impact)
### List and Table Components with Selection/Filtering

#### 5. **MaterialsList** 🟠 HIGH
**File:** `/frontend/src/components/Materials/MaterialsList.tsx`

**Issues:**
- ❌ Table selection with checkboxes lacks aria-labels
- ❌ View mode toggle needs better accessibility
- ❌ Search/filter inputs could have better labels
- ❌ Row action buttons lack context
- ⚠️ Partial: Uses Ant Design's built-in table features

**Recommended Enhancements:**
- Add aria-labels to selection checkboxes
- Enhance filter control labels
- Implement focus management for table

---

#### 6. **KitsList** 🟠 HIGH
**File:** `/frontend/src/components/Kits/KitsList.tsx`

**Issues:**
- ❌ Bulk action buttons lack clear ARIA context
- ❌ Filter drawer missing proper structure
- ❌ Modal dialogs lack focus management
- ❌ Dropdown menus need aria-labels
- ❌ Table column headers missing ARIA attributes

**Recommended Enhancements:**
- Add comprehensive ARIA labeling
- Implement keyboard shortcuts for bulk operations
- Add focus management for modals

---

#### 7. **MaintenanceList** 🟠 HIGH
**File:** `/frontend/src/components/Equipment/MaintenanceList.tsx`

**Issues:**
- ❌ Dual view mode (Equipment/Maintenance) needs clear indication
- ❌ Filter controls lack proper organization
- ❌ Row actions need aria-labels
- ❌ Table sorting needs ARIA support

**Recommended Enhancements:**
- Add view mode ARIA announcements
- Implement sortable column accessibility
- Add filter state announcements

---

## TIER 3: MEDIUM PRIORITY (Moderate Impact)
### Specialized Components & Modals

#### 8. **ApprovalTaskQueue** ✅ GOOD (Reference Implementation)
**File:** `/frontend/src/components/Approvals/ApprovalTaskQueue.tsx`

**Current State:**
- ✅ USES useFocusManagement hook
- ✅ USES useKeyboardHandler hook
- ✅ USES announceToScreenReader from ariaUtils
- ✅ USES useFocusManagement in return
- ✅ HAS aria-labels and proper structure

**Status:** Already implements best practices! Use as reference template.

---

#### 9. **StagingStatusBoard** 🟡 MEDIUM
**File:** `/frontend/src/components/Staging/StagingStatusBoard.tsx`

**Current State:**
- Kanban-style board with drag-and-drop using `react-beautiful-dnd`
- Column-based layout with draggable cards

**Issues:**
- ❌ Drag-drop is mouse-only
- ❌ Columns lack ARIA labels and structure
- ❌ Cards lack selection/focus indicators
- ❌ No keyboard shortcuts for moving between columns
- ❌ Dropdown menus lack proper labeling

**Recommended Enhancements:**
- Implement keyboard fallback for drag-and-drop
- Add ARIA region roles for columns
- Implement card focus management

---

#### 10. **AnnotationCanvas** 🟡 MEDIUM
**File:** `/frontend/src/components/Collaboration/AnnotationCanvas.tsx`

**Current State:**
- Canvas-based drawing/annotation tool
- Tool selection interface with Popover menus
- Modal for managing annotations

**Issues:**
- ❌ Drawing tools lack keyboard shortcuts
- ❌ Canvas interaction is mouse-only
- ❌ Tool palette needs aria-labels
- ❌ Color picker lacks keyboard support
- ❌ No status announcements for drawing state

**Recommended Enhancements:**
- Add keyboard shortcuts for tool selection
- Create fallback UI for canvas interaction
- Implement aria-labels for all tools
- Add live region for drawing status

---

#### 11. **StepNavigation** 🟡 MEDIUM
**File:** `/frontend/src/components/WorkInstructions/StepNavigation.tsx`

**Current State:**
- Navigation buttons for step progression
- Jump-to-step selector dropdown
- Touch-optimized sizing

**Issues:**
- ⚠️ Buttons are accessible but could have better labels
- ❌ Jump menu needs aria-label
- ⚠️ No keyboard shortcuts for step navigation (could add Alt+N/P)

**Recommended Enhancements:**
- Add aria-labels for all buttons
- Implement keyboard shortcuts (Alt+Next, Alt+Previous)
- Add current step announcements

---

#### 12. **TimeClockKiosk** 🟡 MEDIUM
**File:** `/frontend/src/components/TimeTracking/TimeClockKiosk.tsx`

**Current State:**
- Kiosk interface optimized for touch
- Badge scan input and time tracking

**Issues:**
- ❌ Input field lacks proper labeling
- ❌ Buttons need aria-labels
- ❌ Time display missing aria-live region
- ❌ Alert messages lack proper announcement

**Recommended Enhancements:**
- Add proper input labels
- Implement live region for time/status
- Add keyboard access for essential functions

---

#### 13. **AndonShopFloor** 🟡 MEDIUM
**File:** `/frontend/src/components/Andon/AndonShopFloor.tsx`

**Current State:**
- Quick alert buttons for various issue types
- Modal for detailed alert creation

**Issues:**
- ❌ Quick alert buttons lack clear aria-labels
- ❌ Form in modal needs proper labeling
- ❌ Status displays lack live regions
- ❌ Dropdown selects need aria-labels

**Recommended Enhancements:**
- Add descriptive aria-labels to alert buttons
- Implement form field labels
- Add live regions for status updates

---

## TIER 4: LOWER PRIORITY (Nice to Have)
### Components with Minor Accessibility Gaps

#### 14. **SignatureDisplay/SignatureModal** 🔵 LOW
- Popover content needs structure
- Modal needs focus management
- Verification badges need descriptions

#### 15. **WorkOrderCreate & Related Forms** 🔵 LOW
- Form fields mostly handled by Ant Design
- Could add better field grouping with fieldsets
- Validation messages need aria-labels

#### 16. **SPC Components** 🔵 LOW
- Charts and graphs need accessible descriptions
- Control chart axes lack labels
- Data could be available in tabular format

---

## IMPLEMENTATION ROADMAP

### Phase 1: Critical Tables (Weeks 1-2)
1. **DraggableStepsTable**
   - Add ARIA tree/grid structure
   - Implement keyboard drag-drop fallback (Alt+Up/Down)
   - Add live region announcements
   
2. **BuildRecordList**
   - Add table ARIA structure
   - Focus management for modals
   - Keyboard shortcuts for common operations

### Phase 2: Tree & Complex Components (Weeks 3-4)
3. **ParameterGroupsTree**
   - Implement ARIA tree navigation
   - Arrow key support
   
4. **VisualRoutingEditor**
   - Keyboard node selection
   - Keyboard shortcuts for operations

### Phase 3: List Components (Weeks 5-6)
5. **MaterialsList, KitsList, MaintenanceList**
   - Consistent ARIA labeling
   - Focus management

### Phase 4: Specialized Components (Weeks 7-8)
6. **StagingStatusBoard, AnnotationCanvas, TimeClockKiosk**
   - Context-specific enhancements
   - Keyboard fallbacks

---

## SHARED UTILITIES ALREADY IN PLACE

### Available Hooks
- ✅ `useKeyboardHandler` - For keyboard event handling
- ✅ `useFocusManagement` - For focus management and trapping
- ✅ `useComponentShortcuts` - For keyboard shortcuts

### Available Components
- ✅ `KeyboardAccessible` HOC
- ✅ `ClickableDiv` - Pre-built keyboard-accessible div
- ✅ `KeyboardListItem` - For list item keyboard support
- ✅ `SelectableCard` - For card selection
- ✅ `ToggleButton` - For toggle functionality

### Available Utilities
- ✅ `buildAriaAttributes()` - Build ARIA attributes
- ✅ `buildAriaLabel()` - Build label attributes
- ✅ `buildAriaState()` - Build state attributes
- ✅ `announceToScreenReader()` - Screen reader announcements
- ✅ `validateAriaImplementation()` - Validate ARIA setup
- ✅ `getAccessibleName()` - Get element's accessible name

---

## QUICK START TEMPLATE

For each component enhancement:

```tsx
import { useFocusManagement } from '@/hooks/useFocusManagement';
import { useKeyboardHandler } from '@/hooks/useKeyboardHandler';
import { announceToScreenReader, buildAriaAttributes } from '@/utils/ariaUtils';
import { KeyboardAccessible, ClickableDiv } from '@/components/common/KeyboardAccessible';

// In component:
const containerRef = useRef<HTMLDivElement>(null);
const { focusNext, focusPrevious } = useFocusManagement({
  containerRef,
  enableFocusTrap: true,
  restoreFocus: true,
  autoFocus: true,
});

const { keyboardProps } = useKeyboardHandler({
  enableArrowNavigation: true,
  onArrowNavigation: (direction) => {
    if (direction === 'down') focusNext();
    if (direction === 'up') focusPrevious();
  },
  onActivate: handleActivate,
});

// On state change:
announceToScreenReader('Operation completed successfully', 'POLITE');
```

---

## COMPONENT DEPENDENCY ANALYSIS

### Heavy Users of Tables/Lists
- BuildRecordList → impacts build management workflow
- MaterialsList → impacts material tracking
- KitsList → impacts kit staging workflow
- MaintenanceList → impacts equipment management

### Heavy Users of Drag-Drop
- DraggableStepsTable → impacts routing design
- ParameterGroupsTree → impacts parameter organization
- StagingStatusBoard → impacts kit workflow
- VisualRoutingEditor → impacts routing visualization

### Heavy Users of Modals
- BuildRecordList (create/filter)
- ApprovalTaskQueue (rejection, delegation)
- ParameterGroupsTree (create/edit)
- AnnotationCanvas (annotation management)

---

## SUCCESS METRICS

After implementation, aim for:
- ✅ 100% keyboard navigable for all critical workflows
- ✅ WCAG 2.1 Level AA compliance
- ✅ Zero automatic accessibility violations in axe/Lighthouse
- ✅ All interactive elements have proper ARIA labels
- ✅ All modal dialogs have focus management
- ✅ All drag-drop interfaces have keyboard fallbacks

---

## NOTES FOR IMPLEMENTATION

1. **Leverage existing infrastructure** - All necessary hooks and components already exist
2. **Follow ApprovalTaskQueue pattern** - It's a good reference implementation
3. **Test with keyboard only** - Navigate entire workflows without mouse
4. **Test with screen readers** - NVDA (Windows), VoiceOver (Mac), JAWS (commercial)
5. **Document keyboard shortcuts** - Create help screen or tooltip
6. **Add skip links** - For large tables and complex interfaces
7. **Update Storybook** - Document accessibility features in component stories

