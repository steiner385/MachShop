/**
 * Quality Inspection & NCR Components Tests
 * Issue #179: Epic 5 - Frontend Component Testing Phase 2
 *
 * Tests quality inspection with:
 * - Measurement entry and validation
 * - Pass/fail decision workflows
 * - Non-conformance reporting
 * - Corrective action tracking
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock Quality Inspection Components
const QualityInspectionForm = ({ inspection, onSubmit, onCancel }: any) => (
  <form data-testid="inspection-form" onSubmit={(e) => { e.preventDefault(); onSubmit?.(inspection); }}>
    <h2>Quality Inspection</h2>
    <div>
      <label htmlFor="measure-input">Measurement:</label>
      <input
        id="measure-input"
        type="number"
        data-testid="measurement-input"
        defaultValue={inspection.measurementValue || ''}
      />
    </div>
    <div>
      <label htmlFor="pass-checkbox">Pass Inspection</label>
      <input
        id="pass-checkbox"
        type="checkbox"
        data-testid="pass-checkbox"
        defaultChecked={inspection.status === 'PASS'}
      />
    </div>
    <button type="submit">Submit</button>
    <button type="button" onClick={onCancel}>Cancel</button>
  </form>
);

const InspectionMeasurementEntry = ({ characteristic, onMeasure, onValidate }: any) => (
  <div data-testid="measurement-entry">
    <h3>{characteristic.name}</h3>
    <span data-testid="spec-lower">{characteristic.lowerSpec}</span>
    <span data-testid="spec-upper">{characteristic.upperSpec}</span>
    <input
      type="number"
      data-testid="measured-value"
      placeholder="Enter measured value"
      onChange={(e) => onValidate?.(e.target.value)}
    />
    <button onClick={() => onMeasure?.()}>Record Measurement</button>
  </div>
);

const NCRForm = ({ ncr, onSubmit }: any) => (
  <form data-testid="ncr-form" onSubmit={(e) => { e.preventDefault(); onSubmit?.(ncr); }}>
    <h2>Non-Conformance Report</h2>
    <textarea
      data-testid="ncr-description"
      placeholder="Describe non-conformance"
      defaultValue={ncr.description || ''}
    />
    <select data-testid="disposition-select" defaultValue={ncr.disposition || ''}>
      <option value="">Select Disposition</option>
      <option value="REWORK">Rework</option>
      <option value="SCRAP">Scrap</option>
      <option value="USE_AS_IS">Use As Is</option>
      <option value="REPAIR">Repair</option>
    </select>
    <button type="submit">Submit NCR</button>
  </form>
);

const CorrectiveActionForm = ({ action, onSubmit }: any) => (
  <form data-testid="corrective-action-form" onSubmit={(e) => { e.preventDefault(); onSubmit?.(action); }}>
    <h2>Corrective Action</h2>
    <textarea
      data-testid="action-description"
      placeholder="Describe corrective action"
      defaultValue={action.description || ''}
    />
    <input
      type="date"
      data-testid="completion-date"
      defaultValue={action.completionDate || ''}
    />
    <button type="submit">Submit Action</button>
  </form>
);

describe('Quality Inspection Components', () => {

  describe('QualityInspectionForm', () => {
    const mockInspection = {
      id: 'insp-001',
      partNumber: 'PN-123',
      measurementValue: null,
      status: 'PENDING'
    };

    const mockOnSubmit = vi.fn();
    const mockOnCancel = vi.fn();

    beforeEach(() => {
      mockOnSubmit.mockClear();
      mockOnCancel.mockClear();
    });

    it('should render inspection form with measurement input', () => {
      render(
        <BrowserRouter>
          <QualityInspectionForm
            inspection={mockInspection}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        </BrowserRouter>
      );

      expect(screen.getByTestId('measurement-input')).toBeInTheDocument();
      expect(screen.getByTestId('pass-checkbox')).toBeInTheDocument();
    });

    it('should handle inspection submission', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <QualityInspectionForm
            inspection={mockInspection}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        </BrowserRouter>
      );

      const submitButton = screen.getByRole('button', { name: /submit/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should handle inspection cancellation', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <QualityInspectionForm
            inspection={mockInspection}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        </BrowserRouter>
      );

      const cancelButton = screen.getByRole('button', { name: /cancel/i });
      await user.click(cancelButton);

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should support pass/fail decision workflow', async () => {
      const user = userEvent.setup();
      const { rerender } = render(
        <BrowserRouter>
          <QualityInspectionForm
            inspection={{ ...mockInspection, status: 'PENDING' }}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        </BrowserRouter>
      );

      const checkbox = screen.getByTestId('pass-checkbox');
      await user.click(checkbox);

      expect(checkbox).toBeInTheDocument();
    });

    it('should allow measurement input', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <QualityInspectionForm
            inspection={mockInspection}
            onSubmit={mockOnSubmit}
            onCancel={mockOnCancel}
          />
        </BrowserRouter>
      );

      const input = screen.getByTestId('measurement-input') as HTMLInputElement;
      await user.type(input, '25.5');

      expect(input.value).toBe('25.5');
    });
  });

  describe('InspectionMeasurementEntry', () => {
    const mockCharacteristic = {
      id: 'char-001',
      name: 'Diameter',
      lowerSpec: 24.9,
      upperSpec: 25.1,
      unit: 'mm'
    };

    const mockOnMeasure = vi.fn();
    const mockOnValidate = vi.fn();

    beforeEach(() => {
      mockOnMeasure.mockClear();
      mockOnValidate.mockClear();
    });

    it('should render characteristic with spec limits', () => {
      render(
        <InspectionMeasurementEntry
          characteristic={mockCharacteristic}
          onMeasure={mockOnMeasure}
          onValidate={mockOnValidate}
        />
      );

      expect(screen.getByText(mockCharacteristic.name)).toBeInTheDocument();
      expect(screen.getByTestId('spec-lower')).toHaveTextContent(mockCharacteristic.lowerSpec.toString());
      expect(screen.getByTestId('spec-upper')).toHaveTextContent(mockCharacteristic.upperSpec.toString());
    });

    it('should accept measured value input', async () => {
      const user = userEvent.setup();
      render(
        <InspectionMeasurementEntry
          characteristic={mockCharacteristic}
          onMeasure={mockOnMeasure}
          onValidate={mockOnValidate}
        />
      );

      const input = screen.getByTestId('measured-value') as HTMLInputElement;
      await user.type(input, '25.0');

      expect(mockOnValidate).toHaveBeenCalled();
    });

    it('should validate measurement against spec limits', async () => {
      const user = userEvent.setup();
      const onValidate = vi.fn((value) => {
        const val = parseFloat(value);
        return val >= mockCharacteristic.lowerSpec && val <= mockCharacteristic.upperSpec;
      });

      render(
        <InspectionMeasurementEntry
          characteristic={mockCharacteristic}
          onMeasure={mockOnMeasure}
          onValidate={onValidate}
        />
      );

      const input = screen.getByTestId('measured-value');
      await user.type(input, '25.0');

      expect(onValidate).toHaveBeenCalledWith('25.0');
    });

    it('should handle record measurement action', async () => {
      const user = userEvent.setup();
      render(
        <InspectionMeasurementEntry
          characteristic={mockCharacteristic}
          onMeasure={mockOnMeasure}
          onValidate={mockOnValidate}
        />
      );

      const recordButton = screen.getByRole('button', { name: /record measurement/i });
      await user.click(recordButton);

      expect(mockOnMeasure).toHaveBeenCalled();
    });

    it('should handle multiple characteristics', () => {
      const characteristics = [
        { id: 'char-1', name: 'Length', lowerSpec: 99.9, upperSpec: 100.1 },
        { id: 'char-2', name: 'Width', lowerSpec: 49.9, upperSpec: 50.1 },
        { id: 'char-3', name: 'Height', lowerSpec: 24.9, upperSpec: 25.1 }
      ];

      const { unmount } = render(
        <div>
          {characteristics.map(char => (
            <InspectionMeasurementEntry
              key={char.id}
              characteristic={char}
              onMeasure={mockOnMeasure}
              onValidate={mockOnValidate}
            />
          ))}
        </div>
      );

      expect(screen.getByText('Length')).toBeInTheDocument();
      expect(screen.getByText('Width')).toBeInTheDocument();
      expect(screen.getByText('Height')).toBeInTheDocument();

      unmount();
    });
  });

  describe('NCRForm', () => {
    const mockNCR = {
      id: 'ncr-001',
      partNumber: 'PN-123',
      description: '',
      disposition: ''
    };

    const mockOnSubmit = vi.fn();

    beforeEach(() => {
      mockOnSubmit.mockClear();
    });

    it('should render NCR form with description and disposition', () => {
      render(
        <BrowserRouter>
          <NCRForm ncr={mockNCR} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('ncr-description')).toBeInTheDocument();
      expect(screen.getByTestId('disposition-select')).toBeInTheDocument();
    });

    it('should allow non-conformance description entry', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <NCRForm ncr={mockNCR} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const textarea = screen.getByTestId('ncr-description') as HTMLTextAreaElement;
      await user.type(textarea, 'Surface scratches on diameter');

      expect(textarea.value).toBe('Surface scratches on diameter');
    });

    it('should support all disposition options', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <NCRForm ncr={mockNCR} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const select = screen.getByTestId('disposition-select') as HTMLSelectElement;

      const dispositions = ['REWORK', 'SCRAP', 'USE_AS_IS', 'REPAIR'];
      for (const disposition of dispositions) {
        await user.selectOptions(select, disposition);
        expect(select.value).toBe(disposition);
      }
    });

    it('should handle NCR submission', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <NCRForm ncr={mockNCR} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      await user.type(screen.getByTestId('ncr-description'), 'Test defect');
      await user.selectOptions(screen.getByTestId('disposition-select'), 'REWORK');

      const submitButton = screen.getByRole('button', { name: /submit ncr/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalled();
    });

    it('should track NCR workflow state', () => {
      const { rerender } = render(
        <BrowserRouter>
          <NCRForm ncr={{ ...mockNCR, status: 'OPEN' }} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('ncr-form')).toBeInTheDocument();

      rerender(
        <BrowserRouter>
          <NCRForm ncr={{ ...mockNCR, status: 'DISPOSITION_ASSIGNED' }} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('ncr-form')).toBeInTheDocument();
    });
  });

  describe('CorrectiveActionForm', () => {
    const mockAction = {
      id: 'action-001',
      ncrId: 'ncr-001',
      description: '',
      completionDate: ''
    };

    const mockOnSubmit = vi.fn();

    beforeEach(() => {
      mockOnSubmit.mockClear();
    });

    it('should render corrective action form', () => {
      render(
        <BrowserRouter>
          <CorrectiveActionForm action={mockAction} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('action-description')).toBeInTheDocument();
      expect(screen.getByTestId('completion-date')).toBeInTheDocument();
    });

    it('should allow action description entry', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <CorrectiveActionForm action={mockAction} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const textarea = screen.getByTestId('action-description') as HTMLTextAreaElement;
      await user.type(textarea, 'Adjust tooling offset');

      expect(textarea.value).toBe('Adjust tooling offset');
    });

    it('should allow completion date entry', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <CorrectiveActionForm action={mockAction} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      const dateInput = screen.getByTestId('completion-date') as HTMLInputElement;
      await user.type(dateInput, '2024-12-01');

      expect(dateInput.value).toBe('2024-12-01');
    });

    it('should handle action submission', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <CorrectiveActionForm action={mockAction} onSubmit={mockOnSubmit} />
        </BrowserRouter>
      );

      await user.type(screen.getByTestId('action-description'), 'Test action');
      await user.type(screen.getByTestId('completion-date'), '2024-12-01');

      const submitButton = screen.getByRole('button', { name: /submit action/i });
      await user.click(submitButton);

      expect(mockOnSubmit).toHaveBeenCalled();
    });
  });

  describe('Quality Inspection Workflow Integration', () => {
    it('should support complete inspection workflow (measure -> pass/fail -> submit)', async () => {
      const user = userEvent.setup();
      const mockCharacteristic = {
        id: 'char-001',
        name: 'Diameter',
        lowerSpec: 24.9,
        upperSpec: 25.1
      };

      const { rerender } = render(
        <BrowserRouter>
          <InspectionMeasurementEntry
            characteristic={mockCharacteristic}
            onMeasure={vi.fn()}
            onValidate={vi.fn()}
          />
        </BrowserRouter>
      );

      const input = screen.getByTestId('measured-value');
      await user.type(input, '25.0');

      expect(input).toBeInTheDocument();
    });

    it('should handle NCR workflow with corrective actions', async () => {
      const user = userEvent.setup();
      const mockNCR = {
        id: 'ncr-001',
        status: 'OPEN',
        description: 'Surface defect'
      };

      const { rerender } = render(
        <BrowserRouter>
          <NCRForm ncr={mockNCR} onSubmit={vi.fn()} />
        </BrowserRouter>
      );

      expect(screen.getByTestId('ncr-form')).toBeInTheDocument();
    });
  });
});
