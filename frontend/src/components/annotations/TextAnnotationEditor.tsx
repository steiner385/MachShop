/**
 * Text Annotation Editor
 * Issue #66 Phase 3: Text annotations and callout bubbles
 *
 * Provides editor UI for text and callout annotations
 */

import React, { useState, useCallback } from 'react';
import { AnnotationObject, AnnotationProperties } from './types';

interface TextAnnotationEditorProps {
  annotation?: AnnotationObject;
  isCallout?: boolean;
  onSave: (text: string, properties: AnnotationProperties) => void;
  onCancel: () => void;
  x: number;
  y: number;
}

/**
 * Text annotation editor component
 */
export const TextAnnotationEditor: React.FC<TextAnnotationEditorProps> = ({
  annotation,
  isCallout = false,
  onSave,
  onCancel,
  x,
  y,
}) => {
  const [text, setText] = useState(annotation?.properties?.text || '');
  const [fontSize, setFontSize] = useState(
    annotation?.properties?.fontSize || 14
  );
  const [fontFamily, setFontFamily] = useState(
    annotation?.properties?.fontFamily || 'Arial'
  );
  const [textColor, setTextColor] = useState(
    annotation?.properties?.textColor || '#000000'
  );
  const [fontWeight, setFontWeight] = useState(
    annotation?.properties?.fontWeight || 400
  );

  const [calloutStyle, setCalloutStyle] = useState(
    annotation?.properties?.calloutStyle || 'rectangular'
  );
  const [leaderLineStyle, setLeaderLineStyle] = useState(
    annotation?.properties?.leaderLineStyle || 'straight'
  );
  const [leaderTailStyle, setLeaderTailStyle] = useState(
    annotation?.properties?.leaderTailStyle || 'arrow'
  );
  const [fillColor, setFillColor] = useState(
    annotation?.properties?.fillColor || '#ffffff'
  );

  const handleSave = useCallback(() => {
    if (!text.trim()) {
      alert('Please enter some text');
      return;
    }

    const properties: AnnotationProperties = {
      text: text.trim(),
      fontSize,
      fontFamily,
      fontWeight,
      textColor,
      strokeColor: annotation?.properties?.strokeColor || '#000000',
      strokeWidth: annotation?.properties?.strokeWidth || 1,
    };

    if (isCallout) {
      properties.calloutStyle = calloutStyle;
      properties.leaderLineStyle = leaderLineStyle;
      properties.leaderTailStyle = leaderTailStyle;
      properties.fillColor = fillColor;
    }

    onSave(text, properties);
  }, [
    text,
    fontSize,
    fontFamily,
    fontWeight,
    textColor,
    isCallout,
    calloutStyle,
    leaderLineStyle,
    leaderTailStyle,
    fillColor,
    annotation?.properties?.strokeColor,
    annotation?.properties?.strokeWidth,
    onSave,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'Enter') {
        handleSave();
      } else if (e.key === 'Escape') {
        onCancel();
      }
    },
    [handleSave, onCancel]
  );

  return (
    <div
      className="text-annotation-editor"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 1000,
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        padding: '16px',
        maxWidth: '400px',
        minWidth: '300px',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      {/* Title */}
      <div style={{ marginBottom: '12px', fontWeight: 600 }}>
        {isCallout ? 'Callout Annotation' : 'Text Annotation'}
      </div>

      {/* Text input */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter annotation text..."
        style={{
          width: '100%',
          minHeight: '80px',
          padding: '8px',
          fontSize: '14px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          border: '1px solid #ddd',
          borderRadius: '4px',
          marginBottom: '12px',
          fontWeight: fontWeight,
          color: textColor,
          fontFamily: fontFamily,
          resize: 'vertical',
        }}
      />

      {/* Font controls */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
          Font Style
        </label>

        {/* Font family */}
        <select
          value={fontFamily}
          onChange={(e) => setFontFamily(e.target.value)}
          style={{
            width: '100%',
            padding: '6px',
            marginBottom: '8px',
            fontSize: '12px',
            borderRadius: '4px',
            border: '1px solid #ddd',
          }}
        >
          <option value="Arial">Arial</option>
          <option value="Helvetica">Helvetica</option>
          <option value="Times New Roman">Times New Roman</option>
          <option value="Courier New">Courier New</option>
          <option value="Georgia">Georgia</option>
          <option value="Verdana">Verdana</option>
        </select>

        {/* Font size and weight */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
              Size: {fontSize}px
            </label>
            <input
              type="range"
              min="8"
              max="32"
              value={fontSize}
              onChange={(e) => setFontSize(parseInt(e.target.value))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
              Weight
            </label>
            <select
              value={fontWeight}
              onChange={(e) => setFontWeight(parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '4px',
                fontSize: '12px',
                borderRadius: '4px',
                border: '1px solid #ddd',
              }}
            >
              <option value="400">Normal</option>
              <option value="600">Bold</option>
              <option value="700">Bolder</option>
            </select>
          </div>
        </div>

        {/* Color picker */}
        <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
          Text Color
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="color"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            style={{
              width: '40px',
              height: '32px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          />
          <input
            type="text"
            value={textColor}
            onChange={(e) => setTextColor(e.target.value)}
            style={{
              flex: 1,
              padding: '4px 8px',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #ddd',
            }}
          />
        </div>
      </div>

      {/* Callout-specific controls */}
      {isCallout && (
        <div style={{ marginBottom: '12px', paddingTop: '12px', borderTop: '1px solid #eee' }}>
          <label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 500 }}>
            Callout Style
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
                Shape
              </label>
              <select
                value={calloutStyle}
                onChange={(e) => setCalloutStyle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              >
                <option value="rectangular">Rectangle</option>
                <option value="rounded">Rounded</option>
                <option value="cloud">Cloud</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
                Tail
              </label>
              <select
                value={leaderTailStyle}
                onChange={(e) => setLeaderTailStyle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              >
                <option value="none">None</option>
                <option value="arrow">Arrow</option>
                <option value="triangle">Triangle</option>
                <option value="circle">Circle</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
                Line Style
              </label>
              <select
                value={leaderLineStyle}
                onChange={(e) => setLeaderLineStyle(e.target.value)}
                style={{
                  width: '100%',
                  padding: '6px',
                  fontSize: '12px',
                  borderRadius: '4px',
                  border: '1px solid #ddd',
                }}
              >
                <option value="straight">Straight</option>
                <option value="curved">Curved</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '11px', marginBottom: '4px' }}>
                Fill Color
              </label>
              <input
                type="color"
                value={fillColor}
                onChange={(e) => setFillColor(e.target.value)}
                style={{
                  width: '100%',
                  height: '32px',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Preview */}
      <div
        style={{
          marginBottom: '12px',
          padding: '8px',
          backgroundColor: '#f5f5f5',
          borderRadius: '4px',
          fontSize: `${fontSize}px`,
          fontFamily: fontFamily,
          fontWeight: fontWeight,
          color: textColor,
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {text || 'Preview...'}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
        <button
          onClick={onCancel}
          style={{
            padding: '6px 12px',
            backgroundColor: '#f0f0f0',
            border: '1px solid #ccc',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Cancel
        </button>

        <button
          onClick={handleSave}
          style={{
            padding: '6px 12px',
            backgroundColor: '#4a90e2',
            color: '#fff',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Save (Ctrl+Enter)
        </button>
      </div>

      {/* Hint */}
      <div
        style={{
          marginTop: '8px',
          fontSize: '11px',
          color: '#999',
          textAlign: 'center',
        }}
      >
        Press Ctrl+Enter to save or Esc to cancel
      </div>
    </div>
  );
};

export default TextAnnotationEditor;
