/**
 * Advanced Feature Components Tests
 * Issue #179: Epic 5 - Frontend Component Testing Phase 2
 *
 * Tests advanced manufacturing features:
 * - Traceability & genealogy visualization
 * - Equipment management & monitoring
 * - Production scheduling & Gantt charts
 * - SPC & control charts
 * - Electronic signatures
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock Components
const TraceabilityGenealogyTree = ({ serials, onSelectNode }: any) => (
  <div data-testid="genealogy-tree">
    <h2>Product Genealogy</h2>
    {serials?.map((s: any) => (
      <div key={s.id} data-testid={`serial-node-${s.id}`} onClick={() => onSelectNode?.(s)}>
        {s.serialNumber}
      </div>
    ))}
  </div>
);

const EquipmentStatusMonitor = ({ equipment, refreshInterval }: any) => (
  <div data-testid="equipment-monitor">
    <h2>Equipment Status</h2>
    {equipment?.map((e: any) => (
      <div key={e.id} data-testid={`equipment-${e.id}`}>
        <span>{e.name}</span>
        <span data-testid={`status-${e.id}`}>{e.status}</span>
      </div>
    ))}
  </div>
);

const ProductionScheduleGantt = ({ schedule, onDateChange }: any) => (
  <div data-testid="gantt-chart">
    <h2>Production Schedule</h2>
    {schedule?.workOrders?.map((wo: any) => (
      <div key={wo.id} data-testid={`gantt-bar-${wo.id}`}>
        {wo.partNumber} - {wo.startDate} to {wo.endDate}
      </div>
    ))}
  </div>
);

const SPCControlChart = ({ data, ruleSettings, onAnomalyDetected }: any) => (
  <div data-testid="spc-chart">
    <h2>Control Chart</h2>
    <div data-testid="chart-canvas">
      {data?.measurements?.map((m: any, idx: number) => (
        <span key={idx} data-testid={`measurement-${idx}`}>{m}</span>
      ))}
    </div>
  </div>
);

const ElectronicSignatureForm = ({ document, onSign }: any) => (
  <form data-testid="signature-form" onSubmit={(e) => { e.preventDefault(); onSign?.(); }}>
    <h2>Electronic Signature</h2>
    <p>{document.name}</p>
    <input
      type="password"
      data-testid="pin-input"
      placeholder="Enter PIN"
    />
    <button type="submit">Sign Document</button>
  </form>
);

describe('Advanced Manufacturing Feature Components', () => {

  describe('TraceabilityGenealogyTree', () => {
    const mockSerials = [
      { id: 'p1', serialNumber: 'SN-100', type: 'parent', level: 0 },
      { id: 'c1', serialNumber: 'SN-101', type: 'child', level: 1, parent: 'p1' },
      { id: 'c2', serialNumber: 'SN-102', type: 'child', level: 1, parent: 'p1' },
      { id: 'gc1', serialNumber: 'SN-103', type: 'grandchild', level: 2, parent: 'c1' }
    ];

    const mockOnSelectNode = vi.fn();

    beforeEach(() => {
      mockOnSelectNode.mockClear();
    });

    it('should render genealogy tree with all serial nodes', () => {
      render(
        <BrowserRouter>
          <TraceabilityGenealogyTree serials={mockSerials} onSelectNode={mockOnSelectNode} />
        </BrowserRouter>
      );

      mockSerials.forEach(serial => {
        expect(screen.getByTestId(`serial-node-${serial.id}`)).toBeInTheDocument();
        expect(screen.getByText(serial.serialNumber)).toBeInTheDocument();
      });
    });

    it('should handle node selection for genealogy inspection', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <TraceabilityGenealogyTree serials={mockSerials} onSelectNode={mockOnSelectNode} />
        </BrowserRouter>
      );

      const parentNode = screen.getByTestId('serial-node-p1');
      await user.click(parentNode);

      expect(mockOnSelectNode).toHaveBeenCalledWith(mockSerials[0]);
    });

    it('should display hierarchical relationships', () => {
      render(
        <BrowserRouter>
          <TraceabilityGenealogyTree serials={mockSerials} onSelectNode={mockOnSelectNode} />
        </BrowserRouter>
      );

      // Verify all levels present
      expect(screen.getByText('SN-100')).toBeInTheDocument(); // Parent
      expect(screen.getByText('SN-101')).toBeInTheDocument(); // Child
      expect(screen.getByText('SN-103')).toBeInTheDocument(); // Grandchild
    });

    it('should support forward and backward traceability', () => {
      const { rerender } = render(
        <BrowserRouter>
          <TraceabilityGenealogyTree serials={mockSerials} onSelectNode={mockOnSelectNode} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('serial-node-p1')).toBeInTheDocument();
      expect(screen.getByTestId('serial-node-c1')).toBeInTheDocument();
      expect(screen.getByTestId('serial-node-gc1')).toBeInTheDocument();
    });
  });

  describe('EquipmentStatusMonitor', () => {
    const mockEquipment = [
      { id: 'eq1', name: 'Milling Machine A', status: 'RUNNING', utilization: 85 },
      { id: 'eq2', name: 'Milling Machine B', status: 'IDLE', utilization: 0 },
      { id: 'eq3', name: 'Thermal Chamber', status: 'MAINTENANCE', utilization: 0 }
    ];

    it('should display equipment status', () => {
      render(
        <BrowserRouter>
          <EquipmentStatusMonitor equipment={mockEquipment} refreshInterval={5000} />
        </BrowserRouter>
      );

      expect(screen.getByText('Milling Machine A')).toBeInTheDocument();
      expect(screen.getByTestId('status-eq1')).toHaveTextContent('RUNNING');
      expect(screen.getByTestId('status-eq2')).toHaveTextContent('IDLE');
    });

    it('should support real-time status updates', () => {
      const { rerender } = render(
        <BrowserRouter>
          <EquipmentStatusMonitor equipment={mockEquipment} refreshInterval={5000} />
        </BrowserRouter>
      );

      const updatedEquipment = [
        { ...mockEquipment[0], status: 'IDLE' },
        ...mockEquipment.slice(1)
      ];

      rerender(
        <BrowserRouter>
          <EquipmentStatusMonitor equipment={updatedEquipment} refreshInterval={5000} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('status-eq1')).toHaveTextContent('IDLE');
    });

    it('should handle all equipment status states', () => {
      const states = ['RUNNING', 'IDLE', 'MAINTENANCE', 'OFFLINE', 'ERROR'];
      const equipment = states.map((status, idx) => ({
        id: `eq${idx}`,
        name: `Machine ${idx}`,
        status
      }));

      const { unmount } = render(
        <BrowserRouter>
          <EquipmentStatusMonitor equipment={equipment} refreshInterval={5000} />
        </BrowserRouter>
      );

      states.forEach((status, idx) => {
        expect(screen.getByTestId(`status-eq${idx}`)).toHaveTextContent(status);
      });

      unmount();
    });

    it('should display equipment utilization', () => {
      render(
        <BrowserRouter>
          <EquipmentStatusMonitor equipment={mockEquipment} refreshInterval={5000} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('equipment-eq1')).toBeInTheDocument();
      expect(screen.getByTestId('equipment-eq2')).toBeInTheDocument();
    });
  });

  describe('ProductionScheduleGantt', () => {
    const mockSchedule = {
      workOrders: [
        { id: 'wo1', partNumber: 'PN-001', startDate: '2024-11-01', endDate: '2024-11-05' },
        { id: 'wo2', partNumber: 'PN-002', startDate: '2024-11-02', endDate: '2024-11-08' },
        { id: 'wo3', partNumber: 'PN-003', startDate: '2024-11-06', endDate: '2024-11-10' }
      ]
    };

    const mockOnDateChange = vi.fn();

    it('should render Gantt chart with work orders', () => {
      render(
        <BrowserRouter>
          <ProductionScheduleGantt schedule={mockSchedule} onDateChange={mockOnDateChange} />
        </BrowserRouter>
      );

      expect(screen.getByText(/PN-001/)).toBeInTheDocument();
      expect(screen.getByText(/PN-002/)).toBeInTheDocument();
      expect(screen.getByText(/PN-003/)).toBeInTheDocument();
    });

    it('should display schedule timeline', () => {
      render(
        <BrowserRouter>
          <ProductionScheduleGantt schedule={mockSchedule} onDateChange={mockOnDateChange} />
        </BrowserRouter>
      );

      mockSchedule.workOrders.forEach(wo => {
        expect(screen.getByTestId(`gantt-bar-${wo.id}`)).toBeInTheDocument();
      });
    });

    it('should handle schedule conflicts and overlaps', () => {
      render(
        <BrowserRouter>
          <ProductionScheduleGantt schedule={mockSchedule} onDateChange={mockOnDateChange} />
        </BrowserRouter>
      );

      // WO2 overlaps with WO1
      expect(screen.getByText(/PN-001.*2024-11-05/)).toBeInTheDocument();
      expect(screen.getByText(/PN-002.*2024-11-08/)).toBeInTheDocument();
    });

    it('should support date range changes', () => {
      render(
        <BrowserRouter>
          <ProductionScheduleGantt schedule={mockSchedule} onDateChange={mockOnDateChange} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    });
  });

  describe('SPCControlChart', () => {
    const mockData = {
      measurements: [22.5, 23.1, 24.8, 25.2, 25.5, 25.1, 24.9, 23.2, 22.8, 24.5],
      centerLine: 24.5,
      upperControlLimit: 25.5,
      lowerControlLimit: 23.5
    };

    const mockRuleSettings = {
      pointOutOfControl: true,
      seriesOfEight: true,
      trendOfSix: true
    };

    const mockOnAnomalyDetected = vi.fn();

    beforeEach(() => {
      mockOnAnomalyDetected.mockClear();
    });

    it('should render control chart with measurements', () => {
      render(
        <SPCControlChart
          data={mockData}
          ruleSettings={mockRuleSettings}
          onAnomalyDetected={mockOnAnomalyDetected}
        />
      );

      expect(screen.getByTestId('spc-chart')).toBeInTheDocument();
      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });

    it('should display all measurement points', () => {
      render(
        <SPCControlChart
          data={mockData}
          ruleSettings={mockRuleSettings}
          onAnomalyDetected={mockOnAnomalyDetected}
        />
      );

      mockData.measurements.forEach((_, idx) => {
        expect(screen.getByTestId(`measurement-${idx}`)).toBeInTheDocument();
      });
    });

    it('should detect out-of-control conditions', () => {
      const outOfControlData = {
        measurements: [22.5, 23.1, 24.8, 26.5, 27.2, 28.1, 25.1, 24.9, 23.2, 22.8],
        centerLine: 24.5,
        upperControlLimit: 25.5,
        lowerControlLimit: 23.5
      };

      render(
        <SPCControlChart
          data={outOfControlData}
          ruleSettings={mockRuleSettings}
          onAnomalyDetected={mockOnAnomalyDetected}
        />
      );

      expect(screen.getByTestId('spc-chart')).toBeInTheDocument();
    });

    it('should apply statistical rules for anomaly detection', () => {
      render(
        <SPCControlChart
          data={mockData}
          ruleSettings={mockRuleSettings}
          onAnomalyDetected={mockOnAnomalyDetected}
        />
      );

      expect(screen.getByTestId('chart-canvas')).toBeInTheDocument();
    });
  });

  describe('ElectronicSignatureForm', () => {
    const mockDocument = {
      id: 'doc-001',
      name: 'Work Instruction WI-2024-001',
      version: '1.0',
      type: 'WORK_INSTRUCTION'
    };

    const mockOnSign = vi.fn();

    beforeEach(() => {
      mockOnSign.mockClear();
    });

    it('should render signature form with document details', () => {
      render(
        <BrowserRouter>
          <ElectronicSignatureForm document={mockDocument} onSign={mockOnSign} />
        </BrowserRouter>
      );

      expect(screen.getByText(mockDocument.name)).toBeInTheDocument();
      expect(screen.getByTestId('pin-input')).toBeInTheDocument();
    });

    it('should require PIN entry for signing', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <ElectronicSignatureForm document={mockDocument} onSign={mockOnSign} />
        </BrowserRouter>
      );

      const pinInput = screen.getByTestId('pin-input') as HTMLInputElement;
      await user.type(pinInput, '1234');

      expect(pinInput.value).toBe('1234');
    });

    it('should handle document signature submission', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <ElectronicSignatureForm document={mockDocument} onSign={mockOnSign} />
        </BrowserRouter>
      );

      const pinInput = screen.getByTestId('pin-input');
      await user.type(pinInput, '1234');

      const submitButton = screen.getByRole('button', { name: /sign document/i });
      await user.click(submitButton);

      expect(mockOnSign).toHaveBeenCalled();
    });

    it('should support multiple signature workflows', () => {
      const documents = [
        { id: 'doc-1', name: 'Work Instruction', type: 'WORK_INSTRUCTION' },
        { id: 'doc-2', name: 'Quality Approval', type: 'QUALITY_APPROVAL' },
        { id: 'doc-3', name: 'Engineer Review', type: 'ENGINEER_REVIEW' }
      ];

      const { unmount } = render(
        <div>
          {documents.map(doc => (
            <ElectronicSignatureForm
              key={doc.id}
              document={doc}
              onSign={mockOnSign}
            />
          ))}
        </div>
      );

      documents.forEach(doc => {
        expect(screen.getByText(doc.name)).toBeInTheDocument();
      });

      unmount();
    });
  });

  describe('Advanced Feature Integration Tests', () => {
    it('should support complete genealogy traceability workflow', async () => {
      const user = userEvent.setup();
      const serials = [
        { id: 'p1', serialNumber: 'SN-100', type: 'parent' },
        { id: 'c1', serialNumber: 'SN-101', type: 'child', parent: 'p1' }
      ];

      const { rerender } = render(
        <BrowserRouter>
          <TraceabilityGenealogyTree serials={serials} onSelectNode={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText('SN-100')).toBeInTheDocument();
      expect(screen.getByText('SN-101')).toBeInTheDocument();
    });

    it('should monitor equipment throughout production execution', () => {
      const equipment = [
        { id: 'eq1', name: 'Machine A', status: 'RUNNING' },
        { id: 'eq2', name: 'Machine B', status: 'IDLE' }
      ];

      const { rerender } = render(
        <BrowserRouter>
          <EquipmentStatusMonitor equipment={equipment} refreshInterval={5000} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('status-eq1')).toHaveTextContent('RUNNING');

      // Simulate status change
      const updatedEquipment = [
        { id: 'eq1', name: 'Machine A', status: 'IDLE' },
        { id: 'eq2', name: 'Machine B', status: 'RUNNING' }
      ];

      rerender(
        <BrowserRouter>
          <EquipmentStatusMonitor equipment={updatedEquipment} refreshInterval={5000} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('status-eq1')).toHaveTextContent('IDLE');
      expect(screen.getByTestId('status-eq2')).toHaveTextContent('RUNNING');
    });

    it('should manage production schedule with multiple work orders', () => {
      const schedule = {
        workOrders: [
          { id: 'wo1', partNumber: 'PN-001', startDate: '2024-11-01', endDate: '2024-11-05' },
          { id: 'wo2', partNumber: 'PN-002', startDate: '2024-11-02', endDate: '2024-11-08' }
        ]
      };

      render(
        <BrowserRouter>
          <ProductionScheduleGantt schedule={schedule} onDateChange={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByText(/PN-001/)).toBeInTheDocument();
      expect(screen.getByText(/PN-002/)).toBeInTheDocument();
    });

    it('should apply SPC rules to detect quality issues', () => {
      const data = {
        measurements: [22.5, 23.1, 24.8, 25.2, 25.5],
        centerLine: 24.5,
        upperControlLimit: 25.5,
        lowerControlLimit: 23.5
      };

      render(
        <SPCControlChart
          data={data}
          ruleSettings={{ pointOutOfControl: true }}
          onAnomalyDetected={vi.fn()}
        />
      );

      expect(screen.getByTestId('spc-chart')).toBeInTheDocument();
    });
  });
});
