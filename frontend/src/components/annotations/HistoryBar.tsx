/**
 * History Bar
 * Issue #66 Phase 5: Undo/redo and zoom/pan controls
 *
 * Provides UI for undo/redo and viewport controls
 */

import React, { useState, useCallback } from 'react';

interface HistoryBarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onZoomToFit: () => void;
  zoomPercentage: number;
  onZoomChange: (percentage: number) => void;
}

/**
 * History and viewport controls bar
 */
export const HistoryBar: React.FC<HistoryBarProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onZoomToFit,
  zoomPercentage,
  onZoomChange,
}) => {
  const [showZoomInput, setShowZoomInput] = useState(false);
  const [zoomInput, setZoomInput] = useState(String(zoomPercentage));

  const handleZoomInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setZoomInput(e.target.value);
  }, []);

  const handleZoomInputSubmit = useCallback(() => {
    const value = parseInt(zoomInput);
    if (!isNaN(value) && value >= 10 && value <= 500) {
      onZoomChange(value / 100);
    }
    setShowZoomInput(false);
  }, [zoomInput, onZoomChange]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleZoomInputSubmit();
    } else if (e.key === 'Escape') {
      setShowZoomInput(false);
    }
  }, [handleZoomInputSubmit]);

  return (
    <div
      className="history-bar"
      style={{
        display: 'flex',
        gap: '4px',
        padding: '8px 12px',
        backgroundColor: '#f0f0f0',
        borderBottom: '1px solid #ddd',
        alignItems: 'center',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
      }}
    >
      {/* Undo/Redo group */}
      <div style={{ display: 'flex', gap: '2px', borderRight: '1px solid #ccc', paddingRight: '8px' }}>
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          style={{
            padding: '6px 10px',
            backgroundColor: canUndo ? '#fff' : '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: canUndo ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            color: canUndo ? '#333' : '#ccc',
          }}
        >
          ↶ Undo
        </button>

        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          style={{
            padding: '6px 10px',
            backgroundColor: canRedo ? '#fff' : '#f5f5f5',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: canRedo ? 'pointer' : 'not-allowed',
            fontSize: '13px',
            color: canRedo ? '#333' : '#ccc',
          }}
        >
          ↷ Redo
        </button>
      </div>

      {/* Zoom group */}
      <div style={{ display: 'flex', gap: '2px', alignItems: 'center' }}>
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          style={{
            padding: '6px 8px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            minWidth: '32px',
          }}
        >
          −
        </button>

        <div
          onClick={() => setShowZoomInput(true)}
          style={{
            padding: '6px 12px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            minWidth: '60px',
            textAlign: 'center',
            cursor: 'pointer',
            userSelect: 'none',
          }}
          title="Click to change zoom"
        >
          {showZoomInput ? (
            <input
              autoFocus
              type="number"
              min="10"
              max="500"
              value={zoomInput}
              onChange={handleZoomInputChange}
              onBlur={handleZoomInputSubmit}
              onKeyDown={handleKeyDown}
              style={{
                width: '100%',
                border: 'none',
                textAlign: 'center',
                fontSize: '13px',
                fontFamily: 'inherit',
              }}
            />
          ) : (
            `${zoomPercentage}%`
          )}
        </div>

        <button
          onClick={onZoomIn}
          title="Zoom In"
          style={{
            padding: '6px 8px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            minWidth: '32px',
          }}
        >
          +
        </button>

        <button
          onClick={onZoomReset}
          title="Reset Zoom (100%)"
          style={{
            padding: '6px 8px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            color: '#666',
          }}
        >
          1:1
        </button>

        <button
          onClick={onZoomToFit}
          title="Zoom to Fit"
          style={{
            padding: '6px 8px',
            backgroundColor: '#fff',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 500,
            color: '#666',
          }}
        >
          Fit
        </button>
      </div>

      {/* Info */}
      <div style={{ marginLeft: 'auto', color: '#999', fontSize: '11px' }}>
        Use scroll wheel + Ctrl to zoom
      </div>
    </div>
  );
};

export default HistoryBar;
