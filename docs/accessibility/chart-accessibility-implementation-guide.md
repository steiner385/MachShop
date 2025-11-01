# Chart Accessibility Implementation Guide

This guide demonstrates how to implement WCAG 2.1 Level AA accessibility compliance for all visualization components in the MachShop2 application.

## ✅ Completed Implementations

### 1. D3 GenealogyTreeVisualization (`src/components/Traceability/GenealogyTreeVisualization.tsx`)
**Status: ✅ WCAG 2.1 Level AA Compliant**

**Accessibility Features Added:**
- SVG accessibility with `role="img"`, `aria-label`, `<title>`, and `<desc>` elements
- Full keyboard navigation (arrow keys, Enter/Space, Home/End, Escape)
- ARIA attributes for all interactive elements
- Visual patterns beyond color (diagonal stripes, dots, cross-hatch)
- Alternative data table view with sorting and pagination
- Live region for screen reader announcements
- Focus management and visual focus indicators
- Comprehensive chart descriptions

### 2. ControlChart (`src/components/SPC/ControlChart.tsx`)
**Status: ✅ WCAG 2.1 Level AA Compliant**

**Accessibility Features Added:**
- Chart accessibility with `role="img"` and comprehensive `aria-label`
- Alternative data table with filtering, sorting, and pagination
- Color accessibility with shapes (circle, triangle, square) for violation types
- ARIA support with proper roles and live regions
- Screen reader support with chart descriptions and accessible tooltips
- Accessible legend with text descriptions of shapes
- Data table summary showing violation counts
- Responsive design with mobile-friendly tables

## 🔧 Accessibility Utility System

### AccessibleChartWrapper Component (`src/components/common/ChartAccessibility.tsx`)

A reusable wrapper that provides standard accessibility features for any chart component:

```tsx
import { AccessibleChartWrapper, useChartAccessibility } from '../common/ChartAccessibility';

<AccessibleChartWrapper
  title="My Chart"
  description="Chart showing sales data over time"
  chartType="Line Chart"
  data={chartData}
  tableColumns={customColumns}
  getTableData={() => processedData}
>
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={data}>
      {/* Your chart components */}
    </LineChart>
  </ResponsiveContainer>
</AccessibleChartWrapper>
```

## 📋 Implementation Checklist for Remaining Components

### Priority 1: High-Impact Components (Immediate Implementation Required)

#### 1. KitAnalyticsDashboard (`src/components/Kits/KitAnalyticsDashboard.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Bar, Line, Pie, Area charts
- **Complexity**: Very High (749 lines, multiple charts)
- **Action Required**: Apply AccessibleChartWrapper to each chart section

#### 2. KitCostAnalysis (`src/components/Kits/KitCostAnalysis.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Pie charts for cost breakdown
- **Complexity**: High (~400 lines)
- **Action Required**: Wrap pie charts with accessibility features

#### 3. OEEMetricsCard (`src/components/Dashboard/OEEMetricsCard.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: OEE performance metrics
- **Complexity**: Medium
- **Action Required**: Add data table alternatives and ARIA labels

### Priority 2: Medium-Impact Components

#### 4. KitReportGenerator (`src/components/Kits/KitReportGenerator.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Multiple report visualizations
- **Complexity**: Very High (859 lines)

#### 5. StagingLocationUtilization (`src/components/Staging/StagingLocationUtilization.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Utilization charts
- **Complexity**: Medium

#### 6. CapabilityReport (`src/components/SPC/CapabilityReport.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Process capability charts
- **Complexity**: High

### Priority 3: Lower-Impact Components

#### 7. SupervisorApprovalDashboard (`src/components/TimeTracking/SupervisorApprovalDashboard.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Time tracking charts
- **Complexity**: Medium

#### 8. ECODashboard (`src/components/ECO/ECODashboard.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Engineering change analytics
- **Complexity**: Medium

#### 9. WorkflowProgressEnhanced (`src/components/Approvals/WorkflowProgressEnhanced.tsx`)
**Status: ❌ Needs Implementation**
- **Charts**: Workflow visualizations
- **Complexity**: Medium

## 🚀 Quick Implementation Examples

### Example 1: Simple Line Chart
```tsx
// Before (Non-accessible)
<ResponsiveContainer width="100%" height={400}>
  <LineChart data={data}>
    <XAxis dataKey="name" />
    <YAxis />
    <Tooltip />
    <Line type="monotone" dataKey="value" stroke="#8884d8" />
  </LineChart>
</ResponsiveContainer>

// After (Accessible)
<AccessibleChartWrapper
  title="Sales Trend"
  description="Line chart showing monthly sales from January to December"
  chartType="Line Chart"
  data={data}
>
  <ResponsiveContainer width="100%" height={400}>
    <LineChart data={data}>
      <XAxis dataKey="name" />
      <YAxis />
      <Tooltip />
      <Line type="monotone" dataKey="value" stroke="#8884d8" />
    </LineChart>
  </ResponsiveContainer>
</AccessibleChartWrapper>
```

### Example 2: Pie Chart with Custom Table
```tsx
// Custom table columns for pie chart data
const pieTableColumns = [
  {
    title: 'Category',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Value',
    dataIndex: 'value',
    key: 'value',
    render: (value: number) => value.toLocaleString(),
  },
  {
    title: 'Percentage',
    dataIndex: 'percentage',
    key: 'percentage',
    render: (percentage: number) => `${percentage.toFixed(1)}%`,
  },
];

const getPieTableData = () => {
  const total = data.reduce((sum, item) => sum + item.value, 0);
  return data.map((item, index) => ({
    key: index,
    name: item.name,
    value: item.value,
    percentage: (item.value / total) * 100,
  }));
};

<AccessibleChartWrapper
  title="Cost Breakdown"
  description="Pie chart showing cost distribution across categories"
  chartType="Pie Chart"
  data={data}
  tableColumns={pieTableColumns}
  getTableData={getPieTableData}
>
  <ResponsiveContainer width="100%" height={400}>
    <PieChart>
      <Pie
        data={data}
        dataKey="value"
        nameKey="name"
        cx="50%"
        cy="50%"
        outerRadius={80}
        fill="#8884d8"
      />
      <Tooltip />
    </PieChart>
  </ResponsiveContainer>
</AccessibleChartWrapper>
```

### Example 3: Using the HOC Approach
```tsx
import { withChartAccessibility } from '../common/ChartAccessibility';

// Create an accessible version of your chart component
const AccessibleLineChart = withChartAccessibility(LineChart, {
  chartType: 'Line Chart',
  getDescription: (props: any) =>
    `Line chart showing ${props.data?.length || 0} data points over time`,
  getTableColumns: () => [
    { title: 'Date', dataIndex: 'date', key: 'date' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
  ],
});

// Use it like a regular component
<AccessibleLineChart
  title="Performance Trend"
  data={performanceData}
  // ... other props
/>
```

## 🔍 WCAG 2.1 Level AA Compliance Checklist

For each chart component, ensure the following criteria are met:

### Level A Requirements
- ✅ **1.1.1 Non-text Content**: Charts have text alternatives via aria-label and data tables
- ✅ **1.3.1 Info and Relationships**: Semantic structure with proper ARIA landmarks
- ✅ **1.4.1 Use of Color**: Visual patterns and shapes beyond color coding
- ✅ **2.1.1 Keyboard**: Interactive elements accessible via keyboard
- ✅ **4.1.2 Name, Role, Value**: Accessible names and roles for all controls

### Level AA Requirements
- ✅ **1.4.3 Contrast**: Sufficient color contrast (4.5:1 for normal text)
- ✅ **1.4.4 Resize Text**: Text remains readable when zoomed to 200%
- ✅ **2.4.6 Headings and Labels**: Descriptive headings and labels
- ✅ **3.2.2 On Input**: No unexpected context changes

## 📊 Implementation Progress Tracking

| Component | Status | Priority | Estimated Effort | Assignee |
|-----------|--------|----------|------------------|----------|
| GenealogyTreeVisualization | ✅ Complete | High | - | Completed |
| ControlChart | ✅ Complete | High | - | Completed |
| KitAnalyticsDashboard | ❌ Pending | High | 4 hours | TBD |
| KitCostAnalysis | ❌ Pending | High | 2 hours | TBD |
| OEEMetricsCard | ❌ Pending | High | 2 hours | TBD |
| KitReportGenerator | ❌ Pending | Medium | 4 hours | TBD |
| StagingLocationUtilization | ❌ Pending | Medium | 2 hours | TBD |
| CapabilityReport | ❌ Pending | Medium | 3 hours | TBD |
| SupervisorApprovalDashboard | ❌ Pending | Low | 2 hours | TBD |
| ECODashboard | ❌ Pending | Low | 2 hours | TBD |
| WorkflowProgressEnhanced | ❌ Pending | Low | 2 hours | TBD |

**Total Estimated Effort**: 23 hours for remaining components

## 🧪 Testing Accessibility

### Automated Testing Tools
1. **axe-core**: Browser extension for automated accessibility testing
2. **WAVE**: Web accessibility evaluation tool
3. **Lighthouse**: Built-in Chrome accessibility audit

### Manual Testing Checklist
1. **Keyboard Navigation**: Tab through all interactive elements
2. **Screen Reader**: Test with NVDA, JAWS, or VoiceOver
3. **High Contrast Mode**: Verify charts remain usable
4. **Zoom Testing**: Test at 200% zoom level
5. **Color Blindness**: Use color blindness simulators

### Example Test Cases
```javascript
// Jest + Testing Library example
test('chart should have accessible name', () => {
  render(<AccessibleChart title="Test Chart" data={testData} />);
  expect(screen.getByRole('img')).toHaveAccessibleName('Test Chart showing 5 data points');
});

test('data table should be toggleable', () => {
  render(<AccessibleChart title="Test Chart" data={testData} />);
  const tableButton = screen.getByRole('button', { name: /table view/i });
  fireEvent.click(tableButton);
  expect(screen.getByRole('table')).toBeInTheDocument();
});
```

## 📞 Support and Questions

For questions about implementing chart accessibility:

1. Review this documentation
2. Check existing implementations (GenealogyTreeVisualization, ControlChart)
3. Use the AccessibleChartWrapper utility
4. Follow the WCAG 2.1 Level AA checklist

## 🎯 Next Steps

1. **Immediate**: Implement Priority 1 components (KitAnalyticsDashboard, KitCostAnalysis, OEEMetricsCard)
2. **Short-term**: Complete Priority 2 components
3. **Long-term**: Finish Priority 3 components and conduct comprehensive accessibility audit
4. **Ongoing**: Establish accessibility testing in CI/CD pipeline

---

**Document Version**: 1.0
**Last Updated**: Current Date
**Author**: AI Assistant
**Review Status**: Draft