/**
 * Annotation Toolbar
 * Issue #66 Phase 6: Frontend UI components and toolbar
 *
 * Provides tool selection and category organization
 */

import React, { useState } from 'react';
import { AnnotationTool } from './types';
import { ToolRegistry } from './tools/ToolRegistry';

interface AnnotationToolbarProps {
  selectedToolId?: string;
  onToolSelect: (tool: AnnotationTool) => void;
  onToolDeselect: () => void;
  toolRegistry: ToolRegistry;
  vertical?: boolean;
}

/**
 * Annotation toolbar component
 */
export const AnnotationToolbar: React.FC<AnnotationToolbarProps> = ({
  selectedToolId,
  onToolSelect,
  onToolDeselect,
  toolRegistry,
  vertical = false,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const toolsByCategories = toolRegistry.getToolsByCategories();
  const categories = Object.keys(toolsByCategories).sort();

  const handleToolClick = (tool: AnnotationTool) => {
    if (selectedToolId === tool.id) {
      onToolDeselect();
    } else {
      onToolSelect(tool);
    }
  };

  const handleCategoryClick = (category: string) => {
    setExpandedCategory(expandedCategory === category ? null : category);
  };

  return (
    <div
      className="annotation-toolbar"
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: '4px',
        padding: '8px',
        backgroundColor: '#f8f8f8',
        border: vertical ? '1px solid #ddd' : 'none',
        borderBottom: !vertical ? '1px solid #ddd' : 'none',
        flexWrap: vertical ? 'nowrap' : 'wrap',
        minWidth: vertical ? '60px' : 'auto',
        maxWidth: vertical ? '80px' : 'auto',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: '12px',
      }}
    >
      {categories.map((category) => (
        <ToolbarCategory
          key={category}
          category={category}
          tools={toolsByCategories[category]}
          selectedToolId={selectedToolId}
          onToolClick={handleToolClick}
          isExpanded={expandedCategory === category}
          onToggleExpand={() => handleCategoryClick(category)}
          vertical={vertical}
          onShowTooltip={(toolId) => setShowTooltip(toolId)}
          onHideTooltip={() => setShowTooltip(null)}
          showTooltipFor={showTooltip}
        />
      ))}
    </div>
  );
};

interface ToolbarCategoryProps {
  category: string;
  tools: AnnotationTool[];
  selectedToolId?: string;
  onToolClick: (tool: AnnotationTool) => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
  vertical?: boolean;
  onShowTooltip: (toolId: string) => void;
  onHideTooltip: () => void;
  showTooltipFor?: string | null;
}

/**
 * Toolbar category group
 */
const ToolbarCategory: React.FC<ToolbarCategoryProps> = ({
  category,
  tools,
  selectedToolId,
  onToolClick,
  isExpanded,
  onToggleExpand,
  vertical = false,
  onShowTooltip,
  onHideTooltip,
  showTooltipFor,
}) => {
  const getCategoryIcon = (cat: string): string => {
    const icons: Record<string, string> = {
      shape: '◻',
      text: 'A',
      measurement: '📏',
      markup: '🖍',
    };
    return icons[cat] || '•';
  };

  const getCategoryLabel = (cat: string): string => {
    return cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        gap: '2px',
        position: 'relative',
      }}
    >
      {/* Category button */}
      <button
        onClick={onToggleExpand}
        title={getCategoryLabel(category)}
        style={{
          padding: '6px 8px',
          backgroundColor: isExpanded ? '#e8f0ff' : '#fff',
          border: `1px solid ${isExpanded ? '#4a90e2' : '#ddd'}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          color: isExpanded ? '#4a90e2' : '#666',
          minWidth: vertical ? '40px' : 'auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '4px',
        }}
      >
        {getCategoryIcon(category)}
        {!vertical && getCategoryLabel(category)}
        {!vertical && <span style={{ fontSize: '10px' }}>▼</span>}
      </button>

      {/* Tools */}
      {isExpanded && (
        <div
          style={{
            display: 'flex',
            flexDirection: vertical ? 'column' : 'row',
            gap: '2px',
            flexWrap: vertical ? 'nowrap' : 'wrap',
            position: vertical ? 'static' : 'absolute',
            top: vertical ? 'auto' : '100%',
            left: vertical ? '100%' : 0,
            marginTop: vertical ? '2px' : 0,
            marginLeft: vertical ? '2px' : 0,
            backgroundColor: '#fff',
            border: '1px solid #ddd',
            borderRadius: '4px',
            padding: '4px',
            zIndex: 100,
            minWidth: '200px',
          }}
        >
          {tools.map((tool) => (
            <ToolButton
              key={tool.id}
              tool={tool}
              isSelected={selectedToolId === tool.id}
              onClick={() => onToolClick(tool)}
              onMouseEnter={() => onShowTooltip(tool.id)}
              onMouseLeave={onHideTooltip}
              showTooltip={showTooltipFor === tool.id}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface ToolButtonProps {
  tool: AnnotationTool;
  isSelected: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  showTooltip: boolean;
}

/**
 * Individual tool button
 */
const ToolButton: React.FC<ToolButtonProps> = ({
  tool,
  isSelected,
  onClick,
  onMouseEnter,
  onMouseLeave,
  showTooltip,
}) => {
  const getToolIcon = (toolId: string): string => {
    const icons: Record<string, string> = {
      arrow: '➔',
      rectangle: '▭',
      circle: '●',
      line: '─',
      freehand: '✏',
      text: 'A',
      callout: '💬',
      highlight: '🖍',
      measurement: '📏',
    };
    return icons[toolId] || '●';
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        title={tool.name}
        style={{
          padding: '6px 10px',
          backgroundColor: isSelected ? '#4a90e2' : '#fff',
          color: isSelected ? '#fff' : '#333',
          border: `1px solid ${isSelected ? '#4a90e2' : '#ddd'}`,
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          transition: 'all 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ fontSize: '14px' }}>{getToolIcon(tool.id)}</span>
        {tool.name}
      </button>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            padding: '6px 8px',
            backgroundColor: '#333',
            color: '#fff',
            borderRadius: '4px',
            fontSize: '11px',
            whiteSpace: 'nowrap',
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          {tool.description}
          <div
            style={{
              position: 'absolute',
              top: '100%',
              left: '50%',
              transform: 'translateX(-50%)',
              borderLeft: '4px solid transparent',
              borderRight: '4px solid transparent',
              borderTop: '4px solid #333',
            }}
          />
        </div>
      )}
    </div>
  );
};

export default AnnotationToolbar;
