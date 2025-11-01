/**
 * Properties Panel
 * Issue #66 Phase 6: Frontend UI components and toolbar
 *
 * Provides property editing for selected annotations
 */

import React, { useState, useCallback } from 'react';
import { AnnotationObject, AnnotationType } from './types';

interface PropertiesPanelProps {
  annotation: AnnotationObject | null;
  onPropertyChange: (propertyName: string, value: any) => void;
  onDelete: () => void;
}

/**
 * Properties panel for annotation editing
 */
export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  annotation,
  onPropertyChange,
  onDelete,
}) => {
  if (!annotation) {
    return (
      <div
        className="properties-panel"
        style={{
          width: '250px',
          height: '100vh',
          backgroundColor: '#f8f8f8',
          borderLeft: '1px solid #ddd',
          padding: '12px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#999',
          fontSize: '13px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        No annotation selected
      </div>
    );
  }

  return (
    <div
      className="properties-panel"
      style={{
        width: '250px',
        height: '100vh',
        backgroundColor: '#f8f8f8',
        borderLeft: '1px solid #ddd',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '13px',
        overflow: 'auto',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px', borderBottom: '1px solid #ddd' }}>
        <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: 600 }}>
          {annotation.type} Properties
        </h3>
        <div style={{ fontSize: '11px', color: '#999' }}>ID: {annotation.id}</div>
      </div>

      {/* Position & Size */}
      <PropertySection title="Position & Size">
        <PropertyInput
          label="X"
          value={annotation.x}
          onChange={(v) => onPropertyChange('x', v)}
          type="number"
        />
        <PropertyInput
          label="Y"
          value={annotation.y}
          onChange={(v) => onPropertyChange('y', v)}
          type="number"
        />
        <PropertyInput
          label="Width"
          value={annotation.width}
          onChange={(v) => onPropertyChange('width', v)}
          type="number"
          min={1}
        />
        <PropertyInput
          label="Height"
          value={annotation.height}
          onChange={(v) => onPropertyChange('height', v)}
          type="number"
          min={1}
        />
      </PropertySection>

      {/* Common Properties */}
      {(annotation.properties.strokeColor || annotation.properties.fillColor) && (
        <PropertySection title="Appearance">
          {annotation.properties.strokeColor && (
            <PropertyColorInput
              label="Stroke"
              value={annotation.properties.strokeColor}
              onChange={(v) => onPropertyChange('strokeColor', v)}
            />
          )}
          {annotation.properties.strokeWidth && (
            <PropertyInput
              label="Stroke Width"
              value={annotation.properties.strokeWidth}
              onChange={(v) => onPropertyChange('strokeWidth', v)}
              type="number"
              min={0.5}
              step={0.5}
            />
          )}
          {annotation.properties.fillColor && (
            <PropertyColorInput
              label="Fill"
              value={annotation.properties.fillColor}
              onChange={(v) => onPropertyChange('fillColor', v)}
            />
          )}
          {annotation.properties.fillOpacity !== undefined && (
            <PropertyInput
              label="Fill Opacity"
              value={annotation.properties.fillOpacity}
              onChange={(v) => onPropertyChange('fillOpacity', v)}
              type="range"
              min={0}
              max={1}
              step={0.1}
            />
          )}
        </PropertySection>
      )}

      {/* Text Properties */}
      {annotation.properties.text !== undefined && (
        <PropertySection title="Text">
          <PropertyInput
            label="Text"
            value={annotation.properties.text}
            onChange={(v) => onPropertyChange('text', v)}
            type="textarea"
          />
          {annotation.properties.fontSize && (
            <PropertyInput
              label="Font Size"
              value={annotation.properties.fontSize}
              onChange={(v) => onPropertyChange('fontSize', v)}
              type="number"
              min={8}
              max={32}
            />
          )}
          {annotation.properties.fontFamily && (
            <PropertySelect
              label="Font"
              value={annotation.properties.fontFamily}
              onChange={(v) => onPropertyChange('fontFamily', v)}
              options={['Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana']}
            />
          )}
          {annotation.properties.fontWeight && (
            <PropertySelect
              label="Weight"
              value={annotation.properties.fontWeight}
              onChange={(v) => onPropertyChange('fontWeight', parseInt(v))}
              options={['400', '600', '700']}
              labels={['Normal', 'Bold', 'Bolder']}
            />
          )}
          {annotation.properties.textColor && (
            <PropertyColorInput
              label="Color"
              value={annotation.properties.textColor}
              onChange={(v) => onPropertyChange('textColor', v)}
            />
          )}
        </PropertySection>
      )}

      {/* Arrow Properties */}
      {annotation.properties.arrowEnd !== undefined && (
        <PropertySection title="Arrow">
          {annotation.properties.arrowStart && (
            <PropertySelect
              label="Start"
              value={annotation.properties.arrowStart}
              onChange={(v) => onPropertyChange('arrowStart', v)}
              options={['none', 'arrow', 'circle', 'square']}
            />
          )}
          {annotation.properties.arrowEnd && (
            <PropertySelect
              label="End"
              value={annotation.properties.arrowEnd}
              onChange={(v) => onPropertyChange('arrowEnd', v)}
              options={['none', 'arrow', 'circle', 'square']}
            />
          )}
          {annotation.properties.arrowStyle && (
            <PropertySelect
              label="Style"
              value={annotation.properties.arrowStyle}
              onChange={(v) => onPropertyChange('arrowStyle', v)}
              options={['solid', 'dashed', 'dotted']}
            />
          )}
        </PropertySection>
      )}

      {/* Callout Properties */}
      {annotation.properties.calloutStyle !== undefined && (
        <PropertySection title="Callout">
          {annotation.properties.calloutStyle && (
            <PropertySelect
              label="Shape"
              value={annotation.properties.calloutStyle}
              onChange={(v) => onPropertyChange('calloutStyle', v)}
              options={['rectangular', 'rounded', 'cloud']}
            />
          )}
          {annotation.properties.leaderLineStyle && (
            <PropertySelect
              label="Line"
              value={annotation.properties.leaderLineStyle}
              onChange={(v) => onPropertyChange('leaderLineStyle', v)}
              options={['straight', 'curved']}
            />
          )}
          {annotation.properties.leaderTailStyle && (
            <PropertySelect
              label="Tail"
              value={annotation.properties.leaderTailStyle}
              onChange={(v) => onPropertyChange('leaderTailStyle', v)}
              options={['none', 'arrow', 'triangle', 'circle']}
            />
          )}
        </PropertySection>
      )}

      {/* Other Properties */}
      {annotation.properties.highlightColor !== undefined && (
        <PropertySection title="Highlight">
          <PropertyColorInput
            label="Color"
            value={annotation.properties.highlightColor}
            onChange={(v) => onPropertyChange('highlightColor', v)}
          />
          {annotation.properties.transparency && (
            <PropertyInput
              label="Transparency"
              value={annotation.properties.transparency}
              onChange={(v) => onPropertyChange('transparency', v)}
              type="range"
              min={0}
              max={1}
              step={0.1}
            />
          )}
        </PropertySection>
      )}

      {/* Metadata */}
      <PropertySection title="Metadata">
        <PropertyDisplay label="Created By" value={annotation.createdBy} />
        <PropertyDisplay
          label="Created"
          value={new Date(annotation.timestamp).toLocaleString()}
        />
        {annotation.locked && <PropertyDisplay label="Status" value="Locked" />}
        {annotation.hidden && <PropertyDisplay label="Status" value="Hidden" />}
      </PropertySection>

      {/* Actions */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px',
          borderTop: '1px solid #ddd',
          display: 'flex',
          gap: '8px',
        }}
      >
        <button
          onClick={onDelete}
          style={{
            flex: 1,
            padding: '6px 12px',
            backgroundColor: '#ffe8e8',
            color: '#d32f2f',
            border: '1px solid #ddd',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          Delete
        </button>
      </div>
    </div>
  );
};

interface PropertySectionProps {
  title: string;
  children: React.ReactNode;
}

const PropertySection: React.FC<PropertySectionProps> = ({ title, children }) => (
  <div style={{ padding: '12px', borderBottom: '1px solid #eee' }}>
    <div style={{ fontSize: '11px', fontWeight: 600, color: '#999', marginBottom: '8px', textTransform: 'uppercase' }}>
      {title}
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {children}
    </div>
  </div>
);

interface PropertyInputProps {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: string;
  min?: number;
  max?: number;
  step?: number;
}

const PropertyInput: React.FC<PropertyInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  min,
  max,
  step,
}) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '11px', fontWeight: 500, color: '#666' }}>
      {label}
    </label>
    {type === 'textarea' ? (
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: '4px 6px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          fontSize: '12px',
          fontFamily: 'inherit',
          resize: 'vertical',
          minHeight: '60px',
        }}
      />
    ) : (
      <input
        type={type}
        value={value}
        onChange={(e) => {
          const val = type === 'number' ? parseFloat(e.target.value) : e.target.value;
          onChange(val);
        }}
        min={min}
        max={max}
        step={step}
        style={{
          padding: '4px 6px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          fontSize: '12px',
          fontFamily: 'inherit',
        }}
      />
    )}
  </div>
);

interface PropertyColorInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const PropertyColorInput: React.FC<PropertyColorInputProps> = ({ label, value, onChange }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '11px', fontWeight: 500, color: '#666' }}>
      {label}
    </label>
    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
      <input
        type="color"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '40px',
          height: '32px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          cursor: 'pointer',
        }}
      />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          padding: '4px 6px',
          border: '1px solid #ddd',
          borderRadius: '3px',
          fontSize: '11px',
          fontFamily: 'monospace',
        }}
      />
    </div>
  </div>
);

interface PropertySelectProps {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  options: string[];
  labels?: string[];
}

const PropertySelect: React.FC<PropertySelectProps> = ({ label, value, onChange, options, labels }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
    <label style={{ fontSize: '11px', fontWeight: 500, color: '#666' }}>
      {label}
    </label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        padding: '4px 6px',
        border: '1px solid #ddd',
        borderRadius: '3px',
        fontSize: '12px',
        fontFamily: 'inherit',
      }}
    >
      {options.map((opt, idx) => (
        <option key={opt} value={opt}>
          {labels?.[idx] || opt}
        </option>
      ))}
    </select>
  </div>
);

interface PropertyDisplayProps {
  label: string;
  value: string;
}

const PropertyDisplay: React.FC<PropertyDisplayProps> = ({ label, value }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
    <span style={{ color: '#666' }}>{label}:</span>
    <span style={{ fontWeight: 500, color: '#333' }}>{value}</span>
  </div>
);

export default PropertiesPanel;
