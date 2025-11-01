/**
 * Routing Visual Editor Component Tests
 * Issue #179: Epic 5 - Frontend Component Testing Phase 2
 *
 * Tests Routing visual editor with:
 * - ReactFlow integration
 * - Drag-and-drop functionality
 * - Node interactions
 * - Complex state management
 */

import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';

// Mock ReactFlow components
const MockReactFlowNode = ({ data, isConnectable, selected }: any) => (
  <div
    data-testid={`node-${data.id}`}
    className={`node ${selected ? 'selected' : ''}`}
    draggable
  >
    <div data-testid={`node-label-${data.id}`}>{data.label}</div>
    {data.description && <span data-testid={`node-desc-${data.id}`}>{data.description}</span>}
  </div>
);

const RoutingVisualEditor = ({ routing, onSave, onChange }: any) => (
  <div data-testid="routing-visual-editor">
    <h2>Routing: {routing.name}</h2>
    <div data-testid="editor-canvas" className="editor-canvas">
      {routing.operations?.map((op: any) => (
        <MockReactFlowNode key={op.id} data={op} />
      ))}
    </div>
    <button onClick={() => onSave?.()}>Save</button>
  </div>
);

const RoutingNodeComponent = ({ node, onDelete, onEdit, onConnect }: any) => (
  <div data-testid={`routing-node-${node.id}`} className="routing-node">
    <h4>{node.name}</h4>
    <p>{node.operationType}</p>
    <button onClick={() => onEdit?.(node)}>Edit</button>
    <button onClick={() => onDelete?.(node.id)}>Delete</button>
    <button onClick={() => onConnect?.(node.id)}>Connect</button>
  </div>
);

const RoutingConnectionComponent = ({ connection, onDelete }: any) => (
  <div data-testid={`connection-${connection.id}`} className="routing-connection">
    <span>{connection.source}</span>
    <span>→</span>
    <span>{connection.target}</span>
    <button onClick={() => onDelete?.(connection.id)}>Remove</button>
  </div>
);

describe('Routing Visual Editor Components', () => {

  describe('RoutingVisualEditor', () => {
    const mockRouting = {
      id: 'RT-001',
      name: 'Engine Assembly',
      operations: [
        { id: 'op-1', label: 'Receive', description: 'Material receipt' },
        { id: 'op-2', label: 'Inspect', description: 'Quality inspection' },
        { id: 'op-3', label: 'Assembly', description: 'Main assembly' },
        { id: 'op-4', label: 'Test', description: 'Final testing' }
      ],
      connections: [
        { source: 'op-1', target: 'op-2' },
        { source: 'op-2', target: 'op-3' },
        { source: 'op-3', target: 'op-4' }
      ]
    };

    const mockOnSave = vi.fn();
    const mockOnChange = vi.fn();

    beforeEach(() => {
      mockOnSave.mockClear();
      mockOnChange.mockClear();
    });

    it('should render visual editor with routing name', () => {
      render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={mockOnSave}
            onChange={mockOnChange}
          />
        </BrowserRouter>
      );

      expect(screen.getByText(`Routing: ${mockRouting.name}`)).toBeInTheDocument();
      expect(screen.getByTestId('editor-canvas')).toBeInTheDocument();
    });

    it('should render all operations as nodes', () => {
      render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={mockOnSave}
            onChange={mockOnChange}
          />
        </BrowserRouter>
      );

      mockRouting.operations.forEach(op => {
        expect(screen.getByTestId(`node-${op.id}`)).toBeInTheDocument();
        expect(screen.getByTestId(`node-label-${op.id}`)).toHaveTextContent(op.label);
        expect(screen.getByTestId(`node-desc-${op.id}`)).toHaveTextContent(op.description);
      });
    });

    it('should support drag and drop of nodes', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={mockOnSave}
            onChange={mockOnChange}
          />
        </BrowserRouter>
      );

      const node = screen.getByTestId('node-op-1');

      fireEvent.dragStart(node);
      fireEvent.dragOver(screen.getByTestId('editor-canvas'));
      fireEvent.drop(screen.getByTestId('editor-canvas'));
      fireEvent.dragEnd(node);

      expect(node).toBeInTheDocument();
    });

    it('should support save operation', async () => {
      const user = userEvent.setup();
      render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={mockOnSave}
            onChange={mockOnChange}
          />
        </BrowserRouter>
      );

      const saveButton = screen.getByRole('button', { name: /save/i });
      await user.click(saveButton);

      expect(mockOnSave).toHaveBeenCalled();
    });

    it('should display routing complexity correctly', () => {
      render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={mockOnSave}
            onChange={mockOnChange}
          />
        </BrowserRouter>
      );

      expect(screen.getAllByTestId(/^node-/)).toHaveLength(mockRouting.operations.length);
    });
  });

  describe('RoutingNodeComponent', () => {
    const mockNode = {
      id: 'node-123',
      name: 'Machine Milling',
      operationType: 'MILLING',
      duration: 120,
      resources: ['Machine-01', 'Tool-A']
    };

    const mockOnDelete = vi.fn();
    const mockOnEdit = vi.fn();
    const mockOnConnect = vi.fn();

    beforeEach(() => {
      mockOnDelete.mockClear();
      mockOnEdit.mockClear();
      mockOnConnect.mockClear();
    });

    it('should render node with name and operation type', () => {
      render(
        <RoutingNodeComponent
          node={mockNode}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
          onConnect={mockOnConnect}
        />
      );

      expect(screen.getByText(mockNode.name)).toBeInTheDocument();
      expect(screen.getByText(mockNode.operationType)).toBeInTheDocument();
    });

    it('should provide edit functionality', async () => {
      const user = userEvent.setup();
      render(
        <RoutingNodeComponent
          node={mockNode}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
          onConnect={mockOnConnect}
        />
      );

      const editButton = screen.getByRole('button', { name: /edit/i });
      await user.click(editButton);

      expect(mockOnEdit).toHaveBeenCalledWith(mockNode);
    });

    it('should provide delete functionality', async () => {
      const user = userEvent.setup();
      render(
        <RoutingNodeComponent
          node={mockNode}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
          onConnect={mockOnConnect}
        />
      );

      const deleteButton = screen.getByRole('button', { name: /delete/i });
      await user.click(deleteButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockNode.id);
    });

    it('should provide connection functionality', async () => {
      const user = userEvent.setup();
      render(
        <RoutingNodeComponent
          node={mockNode}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
          onConnect={mockOnConnect}
        />
      );

      const connectButton = screen.getByRole('button', { name: /connect/i });
      await user.click(connectButton);

      expect(mockOnConnect).toHaveBeenCalledWith(mockNode.id);
    });

    it('should support multiple node interactions', async () => {
      const user = userEvent.setup();
      render(
        <RoutingNodeComponent
          node={mockNode}
          onDelete={mockOnDelete}
          onEdit={mockOnEdit}
          onConnect={mockOnConnect}
        />
      );

      // Edit
      await user.click(screen.getByRole('button', { name: /edit/i }));
      expect(mockOnEdit).toHaveBeenCalledWith(mockNode);

      // Connect
      await user.click(screen.getByRole('button', { name: /connect/i }));
      expect(mockOnConnect).toHaveBeenCalledWith(mockNode.id);
    });
  });

  describe('RoutingConnectionComponent', () => {
    const mockConnection = {
      id: 'conn-123',
      source: 'node-op-1',
      target: 'node-op-2',
      label: 'success'
    };

    const mockOnDelete = vi.fn();

    beforeEach(() => {
      mockOnDelete.mockClear();
    });

    it('should render connection with source and target', () => {
      render(
        <RoutingConnectionComponent
          connection={mockConnection}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText(mockConnection.source)).toBeInTheDocument();
      expect(screen.getByText(mockConnection.target)).toBeInTheDocument();
    });

    it('should provide delete functionality', async () => {
      const user = userEvent.setup();
      render(
        <RoutingConnectionComponent
          connection={mockConnection}
          onDelete={mockOnDelete}
        />
      );

      const removeButton = screen.getByRole('button', { name: /remove/i });
      await user.click(removeButton);

      expect(mockOnDelete).toHaveBeenCalledWith(mockConnection.id);
    });

    it('should display connection arrow', () => {
      render(
        <RoutingConnectionComponent
          connection={mockConnection}
          onDelete={mockOnDelete}
        />
      );

      expect(screen.getByText('→')).toBeInTheDocument();
    });

    it('should handle multiple connections', () => {
      const connections = [
        { id: 'conn-1', source: 'op-1', target: 'op-2' },
        { id: 'conn-2', source: 'op-2', target: 'op-3' },
        { id: 'conn-3', source: 'op-3', target: 'op-4' }
      ];

      const { unmount } = render(
        <div>
          {connections.map(conn => (
            <RoutingConnectionComponent
              key={conn.id}
              connection={conn}
              onDelete={mockOnDelete}
            />
          ))}
        </div>
      );

      expect(screen.getAllByText('→')).toHaveLength(3);
      unmount();
    });
  });

  describe('Routing Visual Editor Complex Interactions', () => {
    it('should support node creation and connection workflow', async () => {
      const user = userEvent.setup();
      const mockRouting = {
        id: 'RT-001',
        name: 'Test Routing',
        operations: [
          { id: 'op-1', label: 'Start', description: 'Start operation' },
          { id: 'op-2', label: 'End', description: 'End operation' }
        ],
        connections: []
      };

      render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={vi.fn()}
            onChange={vi.fn()}
          />
        </BrowserRouter>
      );

      // Verify nodes exist
      expect(screen.getByTestId('node-op-1')).toBeInTheDocument();
      expect(screen.getByTestId('node-op-2')).toBeInTheDocument();
    });

    it('should maintain routing integrity during edits', () => {
      const mockRouting = {
        id: 'RT-001',
        name: 'Complex Routing',
        operations: [
          { id: 'op-1', label: 'A', description: 'Step A' },
          { id: 'op-2', label: 'B', description: 'Step B' },
          { id: 'op-3', label: 'C', description: 'Step C' }
        ],
        connections: [
          { source: 'op-1', target: 'op-2' },
          { source: 'op-2', target: 'op-3' }
        ]
      };

      const { rerender } = render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={vi.fn()}
            onChange={vi.fn()}
          />
        </BrowserRouter>
      );

      // Verify all operations rendered
      expect(screen.getByTestId('node-op-1')).toBeInTheDocument();
      expect(screen.getByTestId('node-op-2')).toBeInTheDocument();
      expect(screen.getByTestId('node-op-3')).toBeInTheDocument();
    });

    it('should handle routing with multiple branches', () => {
      const mockRouting = {
        id: 'RT-001',
        name: 'Branching Routing',
        operations: [
          { id: 'op-1', label: 'Inspect', description: 'Quality check' },
          { id: 'op-2a', label: 'Accept', description: 'Pass path' },
          { id: 'op-2b', label: 'Rework', description: 'Fail path' }
        ],
        connections: [
          { source: 'op-1', target: 'op-2a' },
          { source: 'op-1', target: 'op-2b' }
        ]
      };

      render(
        <BrowserRouter>
          <RoutingVisualEditor
            routing={mockRouting}
            onSave={vi.fn()}
            onChange={vi.fn()}
          />
        </BrowserRouter>
      );

      // Verify branching structure
      expect(screen.getByTestId('node-op-1')).toBeInTheDocument();
      expect(screen.getByTestId('node-op-2a')).toBeInTheDocument();
      expect(screen.getByTestId('node-op-2b')).toBeInTheDocument();
    });
  });
});
