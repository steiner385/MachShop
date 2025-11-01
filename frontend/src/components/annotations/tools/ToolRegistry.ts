/**
 * Tool Registry
 * Issue #66: Manages available annotation tools and their configurations
 */

import { AnnotationTool, AnnotationType } from '../types';

/**
 * Registry for all annotation tools
 */
export class ToolRegistry {
  private tools: Map<string, AnnotationTool> = new Map();

  constructor() {
    this.registerDefaultTools();
  }

  /**
   * Register default tools
   */
  private registerDefaultTools(): void {
    // Shape tools
    this.registerTool({
      id: 'arrow',
      type: 'arrow',
      name: 'Arrow',
      icon: 'arrow',
      description: 'Draw directional arrows with customizable styles',
      category: 'shape',
      cursor: 'crosshair',
      defaultProperties: {
        strokeColor: '#000000',
        strokeWidth: 2,
        arrowStart: 'none',
        arrowEnd: 'arrow',
        arrowStyle: 'solid',
      },
    });

    this.registerTool({
      id: 'rectangle',
      type: 'rectangle',
      name: 'Rectangle',
      icon: 'rectangle',
      description: 'Draw rectangular areas',
      category: 'shape',
      cursor: 'crosshair',
      defaultProperties: {
        strokeColor: '#000000',
        strokeWidth: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
      },
    });

    this.registerTool({
      id: 'circle',
      type: 'circle',
      name: 'Circle',
      icon: 'circle',
      description: 'Draw circular areas',
      category: 'shape',
      cursor: 'crosshair',
      defaultProperties: {
        strokeColor: '#000000',
        strokeWidth: 2,
        fillColor: 'transparent',
        fillOpacity: 0,
      },
    });

    this.registerTool({
      id: 'line',
      type: 'line',
      name: 'Line',
      icon: 'line',
      description: 'Draw straight lines',
      category: 'shape',
      cursor: 'crosshair',
      defaultProperties: {
        strokeColor: '#000000',
        strokeWidth: 2,
      },
    });

    this.registerTool({
      id: 'freehand',
      type: 'freehand',
      name: 'Freehand',
      icon: 'pen',
      description: 'Draw custom shapes with freehand tool',
      category: 'shape',
      cursor: 'pencil',
      defaultProperties: {
        strokeColor: '#000000',
        strokeWidth: 2,
      },
    });

    // Text tools
    this.registerTool({
      id: 'text',
      type: 'text',
      name: 'Text',
      icon: 'text',
      description: 'Add text annotations',
      category: 'text',
      cursor: 'text',
      defaultProperties: {
        text: '',
        fontSize: 14,
        fontFamily: 'Arial',
        fontWeight: 400,
        textColor: '#000000',
      },
    });

    this.registerTool({
      id: 'callout',
      type: 'callout',
      name: 'Callout',
      icon: 'callout',
      description: 'Add text callouts with leader lines',
      category: 'text',
      cursor: 'text',
      defaultProperties: {
        text: '',
        fontSize: 12,
        fontFamily: 'Arial',
        calloutStyle: 'rectangular',
        leaderLineStyle: 'straight',
        leaderTailStyle: 'arrow',
        fillColor: '#ffffff',
        strokeColor: '#000000',
      },
    });

    // Markup tools
    this.registerTool({
      id: 'highlight',
      type: 'highlight',
      name: 'Highlight',
      icon: 'highlight',
      description: 'Highlight areas with semi-transparent overlay',
      category: 'markup',
      cursor: 'crosshair',
      defaultProperties: {
        highlightColor: '#ffff00',
        transparency: 0.3,
        strokeColor: '#ffff00',
        strokeWidth: 1,
      },
    });

    // Measurement tools
    this.registerTool({
      id: 'measurement',
      type: 'measurement',
      name: 'Measure',
      icon: 'ruler',
      description: 'Measure distances and angles',
      category: 'measurement',
      cursor: 'crosshair',
      defaultProperties: {
        unit: 'px',
        showDimension: true,
        strokeColor: '#0066cc',
        strokeWidth: 1,
      },
    });
  }

  /**
   * Register a custom tool
   */
  registerTool(tool: AnnotationTool): void {
    this.tools.set(tool.id, tool);
  }

  /**
   * Unregister a tool
   */
  unregisterTool(toolId: string): void {
    this.tools.delete(toolId);
  }

  /**
   * Get tool by ID
   */
  getTool(toolId: string): AnnotationTool | undefined {
    return this.tools.get(toolId);
  }

  /**
   * Get all tools
   */
  getAllTools(): AnnotationTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tools by category
   */
  getToolsByCategory(category: string): AnnotationTool[] {
    return Array.from(this.tools.values()).filter((tool) => tool.category === category);
  }

  /**
   * Get tools by type
   */
  getToolsByType(type: AnnotationType): AnnotationTool[] {
    return Array.from(this.tools.values()).filter((tool) => tool.type === type);
  }

  /**
   * Get all tool categories
   */
  getCategories(): string[] {
    const categories = new Set<string>();
    this.tools.forEach((tool) => categories.add(tool.category));
    return Array.from(categories);
  }

  /**
   * Check if tool exists
   */
  hasTool(toolId: string): boolean {
    return this.tools.has(toolId);
  }

  /**
   * Get tool count
   */
  getToolCount(): number {
    return this.tools.size;
  }

  /**
   * Get tools organized by category
   */
  getToolsByCategories(): Record<string, AnnotationTool[]> {
    const grouped: Record<string, AnnotationTool[]> = {};

    this.tools.forEach((tool) => {
      if (!grouped[tool.category]) {
        grouped[tool.category] = [];
      }
      grouped[tool.category].push(tool);
    });

    return grouped;
  }

  /**
   * Update tool configuration
   */
  updateTool(toolId: string, updates: Partial<AnnotationTool>): void {
    const tool = this.tools.get(toolId);
    if (tool) {
      this.tools.set(toolId, { ...tool, ...updates });
    }
  }

  /**
   * Export tool configurations
   */
  export(): Record<string, AnnotationTool> {
    const result: Record<string, AnnotationTool> = {};
    this.tools.forEach((tool, id) => {
      result[id] = tool;
    });
    return result;
  }

  /**
   * Import tool configurations
   */
  import(tools: Record<string, AnnotationTool>): void {
    Object.entries(tools).forEach(([, tool]) => {
      this.registerTool(tool);
    });
  }
}
