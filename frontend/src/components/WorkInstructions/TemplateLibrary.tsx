/**
 * Template Library Component
 *
 * Provides a library of pre-built work instruction templates for common
 * manufacturing operations. Supports search, category filtering, and template preview.
 */

import React, { useState } from 'react';
import { Modal, List, Card, Input, Space, Tag, Button, Empty, Row, Col } from 'antd';
import {
  SearchOutlined,
  FileTextOutlined,
  ToolOutlined,
  ExperimentOutlined,
  BugOutlined,
  BuildOutlined,
  FormatPainterOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  SettingOutlined,
} from '@ant-design/icons';

const { Search } = Input;

/**
 * Template interface
 */
export interface WorkInstructionTemplate {
  id: string;
  name: string;
  description: string;
  category: 'Assembly' | 'Quality' | 'Fabrication' | 'Machining' | 'Finishing' | 'Maintenance' | 'Setup' | 'Inspection';
  steps: TemplateStep[];
  estimatedDuration?: number; // Total duration in seconds
  icon: React.ReactNode;
}

export interface TemplateStep {
  stepNumber: number;
  title: string;
  content: string;
  estimatedDuration?: number;
  isCritical?: boolean;
  requiresSignature?: boolean;
}

/**
 * Pre-defined templates for common manufacturing operations
 */
const TEMPLATES: WorkInstructionTemplate[] = [
  {
    id: 'tpl-001',
    name: 'Mechanical Assembly',
    description: '10-step procedure for mechanical component assembly with fastener installation and torque verification',
    category: 'Assembly',
    steps: [
      { stepNumber: 1, title: 'Verify Parts and Tools', content: 'Check all parts against BOM. Ensure torque wrench is calibrated within last 30 days.', estimatedDuration: 120 },
      { stepNumber: 2, title: 'Clean Mating Surfaces', content: 'Use lint-free cloth and isopropyl alcohol to clean all mating surfaces. Allow to dry completely.', estimatedDuration: 180 },
      { stepNumber: 3, title: 'Apply Thread Locker', content: 'Apply Loctite 243 (blue) to fastener threads as specified in drawing notes.', estimatedDuration: 60 },
      { stepNumber: 4, title: 'Position Components', content: 'Align components using alignment pins. Ensure proper orientation per assembly drawing.', estimatedDuration: 240 },
      { stepNumber: 5, title: 'Install Fasteners Hand-Tight', content: 'Install all fasteners hand-tight in star pattern. Do not fully tighten yet.', estimatedDuration: 300 },
      { stepNumber: 6, title: 'Torque to Specification', content: 'Torque fasteners to specification in star pattern. Record torque values on traveler.', estimatedDuration: 420, isCritical: true, requiresSignature: true },
      { stepNumber: 7, title: 'Verify Assembly', content: 'Check for gaps, alignment, and proper seating of all components.', estimatedDuration: 180 },
      { stepNumber: 8, title: 'Mark Fasteners', content: 'Apply torque witness marks to all fasteners using paint pen.', estimatedDuration: 120 },
      { stepNumber: 9, title: 'Perform Functional Test', content: 'Test assembly for proper operation per test procedure TP-12345.', estimatedDuration: 300, isCritical: true },
      { stepNumber: 10, title: 'Final Inspection and Documentation', content: 'Perform final visual inspection. Complete traveler and apply inspection stamp.', estimatedDuration: 180, requiresSignature: true },
    ],
    estimatedDuration: 2100,
    icon: <ToolOutlined />,
  },
  {
    id: 'tpl-002',
    name: 'Dimensional Inspection',
    description: '5-step template for first article and in-process dimensional inspection procedures',
    category: 'Quality',
    steps: [
      { stepNumber: 1, title: 'Review Inspection Requirements', content: 'Review drawing and inspection plan. Identify all critical dimensions and tolerances.', estimatedDuration: 300 },
      { stepNumber: 2, title: 'Calibrate Measurement Equipment', content: 'Verify calibration status of all measurement tools. Equipment must be within calibration period.', estimatedDuration: 180, isCritical: true },
      { stepNumber: 3, title: 'Set Up Inspection Fixtures', content: 'Set up CMM program or manual inspection fixtures per inspection plan.', estimatedDuration: 420 },
      { stepNumber: 4, title: 'Perform Measurements', content: 'Measure all dimensions per inspection plan. Record actual values on inspection report.', estimatedDuration: 900, isCritical: true, requiresSignature: true },
      { stepNumber: 5, title: 'Analyze Results and Disposition', content: 'Compare actuals to tolerances. Determine accept/reject disposition. Complete inspection report.', estimatedDuration: 300, isCritical: true, requiresSignature: true },
    ],
    estimatedDuration: 2100,
    icon: <ExperimentOutlined />,
  },
  {
    id: 'tpl-003',
    name: 'TIG Welding Process',
    description: '8-step template for TIG welding operations with pre/post-weld procedures and safety checks',
    category: 'Fabrication',
    steps: [
      { stepNumber: 1, title: 'Pre-Weld Safety Check', content: 'Verify welding area is clean and ventilated. Check PPE (welding helmet, gloves, jacket). Test equipment.', estimatedDuration: 180, isCritical: true },
      { stepNumber: 2, title: 'Prepare Joint', content: 'Clean weld area with wire brush and solvent. Remove oxide, oil, and contaminants within 2 inches of joint.', estimatedDuration: 240 },
      { stepNumber: 3, title: 'Set Welding Parameters', content: 'Set amperage, voltage, and gas flow per WPS-456. Argon flow rate: 15-20 CFH.', estimatedDuration: 120 },
      { stepNumber: 4, title: 'Tack Weld', content: 'Create tack welds at fixture points. Verify fit-up and alignment before full weld.', estimatedDuration: 300 },
      { stepNumber: 5, title: 'Perform Root Pass', content: 'Execute root pass per WPS. Maintain consistent travel speed and arc length.', estimatedDuration: 600, isCritical: true },
      { stepNumber: 6, title: 'Perform Fill and Cap Passes', content: 'Complete fill and cap passes. Allow cooling between passes as specified.', estimatedDuration: 900, isCritical: true },
      { stepNumber: 7, title: 'Visual Inspection', content: 'Inspect weld for cracks, porosity, undercut, and incomplete fusion. Use 10x magnifier.', estimatedDuration: 240, requiresSignature: true },
      { stepNumber: 8, title: 'Post-Weld Documentation', content: 'Record weld parameters, filler material lot, and inspector stamp on traveler.', estimatedDuration: 180, requiresSignature: true },
    ],
    estimatedDuration: 2760,
    icon: <ThunderboltOutlined />,
  },
  {
    id: 'tpl-004',
    name: 'CNC Machine Setup',
    description: '12-step template for CNC machining center setup and first piece verification',
    category: 'Machining',
    steps: [
      { stepNumber: 1, title: 'Review Work Order and Prints', content: 'Review work order, part drawing, and NC program. Verify part number and revision.', estimatedDuration: 180 },
      { stepNumber: 2, title: 'Verify Raw Material', content: 'Check material certification. Verify material type, size, and heat lot against requirements.', estimatedDuration: 120, isCritical: true },
      { stepNumber: 3, title: 'Install Workholding', content: 'Install vise or fixture. Indicate to within 0.001" TIR. Record indicator readings.', estimatedDuration: 600 },
      { stepNumber: 4, title: 'Load NC Program', content: 'Load NC program file. Verify program number matches work order.', estimatedDuration: 120 },
      { stepNumber: 5, title: 'Install Tooling', content: 'Install tools per tool list. Verify tool numbers, offsets, and lengths in tool table.', estimatedDuration: 900 },
      { stepNumber: 6, title: 'Set Work Offsets', content: 'Probe or indicate workpiece. Set G54 work offset. Record X, Y, Z values.', estimatedDuration: 420 },
      { stepNumber: 7, title: 'Dry Run Program', content: 'Run program in single block mode with Z-axis raised. Verify tool paths.', estimatedDuration: 600 },
      { stepNumber: 8, title: 'Machine First Piece', content: 'Machine first piece at reduced feed rate (75%). Monitor for tool breakage or chatter.', estimatedDuration: 1800, isCritical: true },
      { stepNumber: 9, title: 'Inspect First Piece', content: 'Measure critical dimensions on first piece. Verify all features are within tolerance.', estimatedDuration: 900, isCritical: true, requiresSignature: true },
      { stepNumber: 10, title: 'Adjust Offsets if Needed', content: 'Adjust tool offsets based on first piece inspection results. Document changes.', estimatedDuration: 300 },
      { stepNumber: 11, title: 'Run Second Piece for Verification', content: 'Machine second piece at full speed. Re-inspect to confirm offset adjustments.', estimatedDuration: 1200 },
      { stepNumber: 12, title: 'Approve Setup and Begin Production', content: 'Stamp first article report. Update setup sheet with actual cycle time. Begin production run.', estimatedDuration: 180, requiresSignature: true },
    ],
    estimatedDuration: 7320,
    icon: <SettingOutlined />,
  },
  {
    id: 'tpl-005',
    name: 'Paint and Coating Application',
    description: '6-step template for surface preparation, painting, and curing procedures',
    category: 'Finishing',
    steps: [
      { stepNumber: 1, title: 'Surface Preparation', content: 'Clean surface with solvent. Remove grease, oil, and contaminants. Sand with 320 grit paper.', estimatedDuration: 900 },
      { stepNumber: 2, title: 'Mask Areas', content: 'Mask threads, datums, and areas not to be painted using tape and paper.', estimatedDuration: 480 },
      { stepNumber: 3, title: 'Apply Primer', content: 'Apply primer per spec. Maintain 8-12 inch spray distance. Apply 2-3 mils wet film thickness.', estimatedDuration: 600, isCritical: true },
      { stepNumber: 4, title: 'Cure Primer', content: 'Allow primer to flash dry for 15 minutes. Bake at 180°F for 30 minutes if specified.', estimatedDuration: 1800 },
      { stepNumber: 5, title: 'Apply Topcoat', content: 'Apply topcoat in 2-3 coats. Allow 10 minutes flash time between coats. Final thickness: 2-3 mils DFT.', estimatedDuration: 900, isCritical: true },
      { stepNumber: 6, title: 'Final Cure and Inspection', content: 'Cure per paint spec (usually 24 hours air dry or bake cycle). Inspect for runs, sags, orange peel.', estimatedDuration: 300, requiresSignature: true },
    ],
    estimatedDuration: 4980,
    icon: <FormatPainterOutlined />,
  },
  {
    id: 'tpl-006',
    name: 'Preventive Maintenance',
    description: '7-step template for equipment preventive maintenance and lubrication',
    category: 'Maintenance',
    steps: [
      { stepNumber: 1, title: 'Lockout/Tagout Equipment', content: 'Follow LOTO procedure. Verify zero energy state before beginning work.', estimatedDuration: 180, isCritical: true },
      { stepNumber: 2, title: 'Visual Inspection', content: 'Inspect equipment for leaks, loose fasteners, wear, and damage. Document findings.', estimatedDuration: 300 },
      { stepNumber: 3, title: 'Clean Equipment', content: 'Remove chips, coolant residue, and debris. Clean guards and covers.', estimatedDuration: 600 },
      { stepNumber: 4, title: 'Lubricate Per Schedule', content: 'Lubricate all points per lubrication chart. Use specified lubricants and quantities.', estimatedDuration: 480 },
      { stepNumber: 5, title: 'Check Fluid Levels', content: 'Check hydraulic oil, coolant, and way oil levels. Top off as needed with correct fluids.', estimatedDuration: 240 },
      { stepNumber: 6, title: 'Test Operation', content: 'Remove LOTO. Run equipment through test cycle. Listen for unusual noises or vibration.', estimatedDuration: 420 },
      { stepNumber: 7, title: 'Complete PM Documentation', content: 'Record all activities on PM checklist. Note any items requiring follow-up. Update CMMS.', estimatedDuration: 180, requiresSignature: true },
    ],
    estimatedDuration: 2400,
    icon: <ToolOutlined />,
  },
  {
    id: 'tpl-007',
    name: 'First Article Inspection (FAI)',
    description: '8-step AS9102 compliant first article inspection procedure',
    category: 'Inspection',
    steps: [
      { stepNumber: 1, title: 'Review FAI Requirements', content: 'Review customer PO, part drawing, and AS9102 forms. Verify FAI is required.', estimatedDuration: 300 },
      { stepNumber: 2, title: 'Select First Article Sample', content: 'Select first production piece from approved setup. Verify lot traceability.', estimatedDuration: 120 },
      { stepNumber: 3, title: 'Complete Form 1 (Part Accountability)', content: 'Fill out Form 1 with part info, PO number, lot number, and organization details.', estimatedDuration: 180 },
      { stepNumber: 4, title: 'Perform 100% Dimensional Inspection', content: 'Measure all dimensions per Form 2. Use calibrated tools. Record actual values and tolerances.', estimatedDuration: 1800, isCritical: true },
      { stepNumber: 5, title: 'Complete Form 2 (Product Accountability)', content: 'Transfer measurements to Form 2. Calculate deviations. Mark conformance status.', estimatedDuration: 600, isCritical: true },
      { stepNumber: 6, title: 'Complete Form 3 (Conformance Verification)', content: 'Document functional tests, material certs, and special processes. Attach supporting data.', estimatedDuration: 420 },
      { stepNumber: 7, title: 'Engineering Review and Approval', content: 'Submit FAI package to engineering for review. Address any findings or NCRs.', estimatedDuration: 300, requiresSignature: true },
      { stepNumber: 8, title: 'Submit to Customer', content: 'Compile complete FAI package with all forms and data. Submit to customer per contract requirements.', estimatedDuration: 240, requiresSignature: true },
    ],
    estimatedDuration: 3960,
    icon: <FileTextOutlined />,
  },
  {
    id: 'tpl-008',
    name: 'Non-Conformance Investigation',
    description: '6-step template for investigating and documenting non-conformances',
    category: 'Quality',
    steps: [
      { stepNumber: 1, title: 'Identify and Quarantine', content: 'Identify non-conforming material. Tag and move to quarantine area. Document quantity and defect.', estimatedDuration: 180, isCritical: true },
      { stepNumber: 2, title: 'Open NCR', content: 'Create NCR in quality system. Assign NCR number. Document defect description with photos.', estimatedDuration: 300 },
      { stepNumber: 3, title: 'Determine Root Cause', content: 'Investigate root cause using 5-Why or fishbone analysis. Document findings.', estimatedDuration: 900 },
      { stepNumber: 4, title: 'Identify Corrective Action', content: 'Define corrective action to prevent recurrence. Assign responsible party and due date.', estimatedDuration: 420 },
      { stepNumber: 5, title: 'Disposition Material', content: 'Determine disposition: Use-As-Is, Rework, Repair, Scrap. Obtain MRB approval if required.', estimatedDuration: 300, isCritical: true, requiresSignature: true },
      { stepNumber: 6, title: 'Close NCR', content: 'Verify corrective action completed. Update quality metrics. Close NCR in system.', estimatedDuration: 240, requiresSignature: true },
    ],
    estimatedDuration: 2340,
    icon: <BugOutlined />,
  },
  {
    id: 'tpl-009',
    name: 'Sheet Metal Bending',
    description: '7-step template for press brake operations with bend angle verification',
    category: 'Fabrication',
    steps: [
      { stepNumber: 1, title: 'Review Bend Sequence', content: 'Study part drawing and flat pattern. Plan bend sequence to avoid interference with tooling.', estimatedDuration: 240 },
      { stepNumber: 2, title: 'Select and Install Tooling', content: 'Select punch and die based on material thickness and bend radius. Install and align tooling.', estimatedDuration: 600 },
      { stepNumber: 3, title: 'Calculate Bend Allowance', content: 'Calculate bend allowance and setback. Adjust back gauge position for first bend.', estimatedDuration: 180 },
      { stepNumber: 4, title: 'Set Press Parameters', content: 'Set tonnage, depth, and dwell time. Input material k-factor and thickness.', estimatedDuration: 120 },
      { stepNumber: 5, title: 'Bend Test Piece', content: 'Bend test piece. Measure angle with protractor or CMM. Adjust tonnage/depth as needed.', estimatedDuration: 420 },
      { stepNumber: 6, title: 'Perform Production Bends', content: 'Complete all bends in sequence. Check angle and dimensions every 5 pieces.', estimatedDuration: 1200, isCritical: true },
      { stepNumber: 7, title: 'Final Inspection', content: 'Measure all bend angles and dimensions. Verify part is within tolerance. Document results.', estimatedDuration: 360, requiresSignature: true },
    ],
    estimatedDuration: 3120,
    icon: <BuildOutlined />,
  },
  {
    id: 'tpl-010',
    name: 'Safety Inspection Procedure',
    description: '5-step template for workplace safety inspections and hazard identification',
    category: 'Inspection',
    steps: [
      { stepNumber: 1, title: 'Review Inspection Checklist', content: 'Review safety inspection checklist for area. Gather clipboard, camera, and tagging supplies.', estimatedDuration: 120 },
      { stepNumber: 2, title: 'Walk Through Work Area', content: 'Systematically inspect work area. Look for slip/trip hazards, blocked exits, chemical storage issues.', estimatedDuration: 900 },
      { stepNumber: 3, title: 'Inspect Equipment and Guards', content: 'Check machine guards in place. Verify emergency stops functional. Check electrical cords for damage.', estimatedDuration: 600, isCritical: true },
      { stepNumber: 4, title: 'Document Findings', content: 'Photograph and document all safety hazards. Rate severity (High/Medium/Low). Tag immediate hazards.', estimatedDuration: 420 },
      { stepNumber: 5, title: 'Create Corrective Actions', content: 'Create work orders for repairs. Assign responsible parties. Set due dates based on severity.', estimatedDuration: 360, requiresSignature: true },
    ],
    estimatedDuration: 2400,
    icon: <SafetyOutlined />,
  },
];

/**
 * Template Library Props
 */
interface TemplateLibraryProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (template: WorkInstructionTemplate) => void;
}

/**
 * Template Library Component
 */
export const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  visible,
  onClose,
  onSelect,
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Get unique categories
  const categories = Array.from(new Set(TEMPLATES.map((t) => t.category)));

  // Filter templates based on search and category
  const filteredTemplates = TEMPLATES.filter((template) => {
    const matchesSearch =
      template.name.toLowerCase().includes(searchText.toLowerCase()) ||
      template.description.toLowerCase().includes(searchText.toLowerCase());
    const matchesCategory = !selectedCategory || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle template selection
  const handleSelect = (template: WorkInstructionTemplate) => {
    onSelect(template);
    onClose();
  };

  // Reset filters when modal closes
  const handleClose = () => {
    setSearchText('');
    setSelectedCategory('');
    onClose();
  };

  return (
    <Modal
      title="Work Instruction Templates"
      open={visible}
      onCancel={handleClose}
      footer={null}
      width={900}
      style={{ top: 20 }}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* Search */}
        <Search
          placeholder="Search templates by name or description..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="large"
        />

        {/* Category Filters */}
        <Space wrap>
          <Button
            type={!selectedCategory ? 'primary' : 'default'}
            size="middle"
            onClick={() => setSelectedCategory('')}
          >
            All Categories
          </Button>
          {categories.map((category) => (
            <Button
              key={category}
              type={selectedCategory === category ? 'primary' : 'default'}
              size="middle"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </Space>

        {/* Results Count */}
        <div style={{ color: '#666', fontSize: 13 }}>
          {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} found
        </div>

        {/* Template Grid */}
        {filteredTemplates.length === 0 ? (
          <Empty
            description="No templates match your search"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ) : (
          <List
            grid={{
              gutter: 16,
              xs: 1,
              sm: 1,
              md: 2,
              lg: 2,
              xl: 2,
            }}
            dataSource={filteredTemplates}
            renderItem={(template) => (
              <List.Item>
                <Card
                  hoverable
                  onClick={() => handleSelect(template)}
                  bodyStyle={{ padding: 16 }}
                  style={{ height: '100%', cursor: 'pointer' }}
                >
                  <Space direction="vertical" style={{ width: '100%' }} size="small">
                    {/* Header with Icon and Category */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Space>
                        <div style={{ fontSize: 24, color: '#1890ff' }}>{template.icon}</div>
                        <div style={{ fontWeight: 500, fontSize: 15 }}>{template.name}</div>
                      </Space>
                      <Tag color="blue">{template.category}</Tag>
                    </div>

                    {/* Description */}
                    <div style={{ fontSize: 13, color: '#666', lineHeight: 1.5 }}>
                      {template.description}
                    </div>

                    {/* Metadata */}
                    <Space split={<span style={{ color: '#d9d9d9' }}>•</span>} style={{ fontSize: 12, color: '#999' }}>
                      <span>{template.steps.length} steps</span>
                      {template.estimatedDuration && (
                        <span>~{Math.round(template.estimatedDuration / 60)} min</span>
                      )}
                      <span>
                        {template.steps.filter((s) => s.isCritical).length > 0 &&
                          `${template.steps.filter((s) => s.isCritical).length} critical`}
                      </span>
                    </Space>
                  </Space>
                </Card>
              </List.Item>
            )}
          />
        )}
      </Space>
    </Modal>
  );
};

export default TemplateLibrary;
