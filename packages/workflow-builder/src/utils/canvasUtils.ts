/**
 * Canvas Utility Functions
 * Helper functions for canvas operations, geometry, and transformations
 */

import { NodeConfig, Connection } from '../types/workflow';

/**
 * Point in 2D space
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Rectangle bounds
 */
export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Get node bounds
 */
export const getNodeBounds = (node: NodeConfig): Bounds => ({
  x: node.x,
  y: node.y,
  width: node.width || 100,
  height: node.height || 60,
});

/**
 * Check if point is inside node
 */
export const pointInNode = (point: Point, node: NodeConfig): boolean => {
  const bounds = getNodeBounds(node);
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
};

/**
 * Check if point is near node boundary (within margin)
 */
export const pointNearNode = (point: Point, node: NodeConfig, margin: number = 10): boolean => {
  const bounds = getNodeBounds(node);
  return (
    point.x >= bounds.x - margin &&
    point.x <= bounds.x + bounds.width + margin &&
    point.y >= bounds.y - margin &&
    point.y <= bounds.y + bounds.height + margin
  );
};

/**
 * Get node center
 */
export const getNodeCenter = (node: NodeConfig): Point => {
  const bounds = getNodeBounds(node);
  return {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  };
};

/**
 * Get distance between two points
 */
export const distance = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Get angle between two points (in degrees, 0-360)
 */
export const angle = (p1: Point, p2: Point): number => {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  let angle = Math.atan2(dy, dx) * (180 / Math.PI);
  if (angle < 0) {
    angle += 360;
  }
  return angle;
};

/**
 * Check if two bounding boxes overlap
 */
export const boundsOverlap = (bounds1: Bounds, bounds2: Bounds): boolean => {
  return !(
    bounds1.x + bounds1.width < bounds2.x ||
    bounds2.x + bounds2.width < bounds1.x ||
    bounds1.y + bounds1.height < bounds2.y ||
    bounds2.y + bounds2.height < bounds1.y
  );
};

/**
 * Check if two nodes overlap
 */
export const nodesOverlap = (node1: NodeConfig, node2: NodeConfig): boolean => {
  const bounds1 = getNodeBounds(node1);
  const bounds2 = getNodeBounds(node2);
  return boundsOverlap(bounds1, bounds2);
};

/**
 * Get bounding box for multiple nodes
 */
export const getNodesBounds = (nodes: NodeConfig[]): Bounds | null => {
  if (nodes.length === 0) return null;

  let minX = nodes[0].x;
  let minY = nodes[0].y;
  let maxX = nodes[0].x + (nodes[0].width || 100);
  let maxY = nodes[0].y + (nodes[0].height || 60);

  for (let i = 1; i < nodes.length; i++) {
    const node = nodes[i];
    minX = Math.min(minX, node.x);
    minY = Math.min(minY, node.y);
    maxX = Math.max(maxX, node.x + (node.width || 100));
    maxY = Math.max(maxY, node.y + (node.height || 60));
  }

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
};

/**
 * Transform point with pan and zoom
 */
export const transformPoint = (
  point: Point,
  panX: number,
  panY: number,
  zoom: number
): Point => ({
  x: point.x * zoom + panX,
  y: point.y * zoom + panY,
});

/**
 * Inverse transform point (screen to canvas)
 */
export const inverseTransformPoint = (
  point: Point,
  panX: number,
  panY: number,
  zoom: number
): Point => ({
  x: (point.x - panX) / zoom,
  y: (point.y - panY) / zoom,
});

/**
 * Get connection path using Bezier curves
 */
export const getConnectionPath = (
  source: NodeConfig,
  target: NodeConfig
): string => {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);

  // Source is at bottom of node
  const sourceY = source.y + (source.height || 60);
  const sourceX = sourceCenter.x;

  // Target is at top of node
  const targetY = target.y;
  const targetX = targetCenter.x;

  // Control points for Bezier curve
  const controlY = (sourceY + targetY) / 2;

  return `M ${sourceX} ${sourceY} C ${sourceX} ${controlY}, ${targetX} ${controlY}, ${targetX} ${targetY}`;
};

/**
 * Get closest point on line segment to a given point
 */
export const closestPointOnLine = (
  point: Point,
  lineStart: Point,
  lineEnd: Point
): Point => {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;

  if (dx === 0 && dy === 0) {
    return lineStart;
  }

  const t = Math.max(
    0,
    Math.min(1, ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) / (dx * dx + dy * dy))
  );

  return {
    x: lineStart.x + t * dx,
    y: lineStart.y + t * dy,
  };
};

/**
 * Get distance from point to line segment
 */
export const distanceToLine = (
  point: Point,
  lineStart: Point,
  lineEnd: Point
): number => {
  const closest = closestPointOnLine(point, lineStart, lineEnd);
  return distance(point, closest);
};

/**
 * Snap point to grid
 */
export const snapToGrid = (point: Point, gridSize: number): Point => ({
  x: Math.round(point.x / gridSize) * gridSize,
  y: Math.round(point.y / gridSize) * gridSize,
});

/**
 * Align nodes (left, center, right, top, middle, bottom)
 */
export enum AlignmentType {
  LEFT = 'left',
  CENTER = 'center',
  RIGHT = 'right',
  TOP = 'top',
  MIDDLE = 'middle',
  BOTTOM = 'bottom',
}

export const alignNodes = (
  nodes: NodeConfig[],
  alignment: AlignmentType
): Array<{ nodeId: string; x: number; y: number }> => {
  if (nodes.length === 0) return [];

  const bounds = getNodesBounds(nodes);
  if (!bounds) return [];

  const results: Array<{ nodeId: string; x: number; y: number }> = [];

  for (const node of nodes) {
    let x = node.x;
    let y = node.y;

    switch (alignment) {
      case AlignmentType.LEFT:
        x = bounds.x;
        break;
      case AlignmentType.CENTER:
        x = bounds.x + bounds.width / 2 - (node.width || 100) / 2;
        break;
      case AlignmentType.RIGHT:
        x = bounds.x + bounds.width - (node.width || 100);
        break;
      case AlignmentType.TOP:
        y = bounds.y;
        break;
      case AlignmentType.MIDDLE:
        y = bounds.y + bounds.height / 2 - (node.height || 60) / 2;
        break;
      case AlignmentType.BOTTOM:
        y = bounds.y + bounds.height - (node.height || 60);
        break;
    }

    results.push({ nodeId: node.id, x, y });
  }

  return results;
};

/**
 * Distribute nodes evenly (horizontally or vertically)
 */
export enum DistributionType {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}

export const distributeNodes = (
  nodes: NodeConfig[],
  distribution: DistributionType,
  spacing: number = 20
): Array<{ nodeId: string; x: number; y: number }> => {
  if (nodes.length < 3) return [];

  const sortedNodes = [...nodes];
  const results: Array<{ nodeId: string; x: number; y: number }> = [];

  if (distribution === DistributionType.HORIZONTAL) {
    sortedNodes.sort((a, b) => a.x - b.x);

    const bounds = getNodesBounds(sortedNodes);
    if (!bounds) return [];

    const totalWidth = sortedNodes.reduce((sum, n) => sum + (n.width || 100), 0);
    const totalSpacing = (sortedNodes.length - 1) * spacing;
    const availableSpace = bounds.width - totalWidth;
    const distributeSpacing = (availableSpace - totalSpacing) / (sortedNodes.length - 1);

    let currentX = bounds.x;
    for (const node of sortedNodes) {
      results.push({ nodeId: node.id, x: currentX, y: node.y });
      currentX += (node.width || 100) + spacing + distributeSpacing;
    }
  } else {
    // VERTICAL
    sortedNodes.sort((a, b) => a.y - b.y);

    const bounds = getNodesBounds(sortedNodes);
    if (!bounds) return [];

    const totalHeight = sortedNodes.reduce((sum, n) => sum + (n.height || 60), 0);
    const totalSpacing = (sortedNodes.length - 1) * spacing;
    const availableSpace = bounds.height - totalHeight;
    const distributeSpacing = (availableSpace - totalSpacing) / (sortedNodes.length - 1);

    let currentY = bounds.y;
    for (const node of sortedNodes) {
      results.push({ nodeId: node.id, x: node.x, y: currentY });
      currentY += (node.height || 60) + spacing + distributeSpacing;
    }
  }

  return results;
};

/**
 * Get connection label position (middle of curve)
 */
export const getConnectionLabelPosition = (
  source: NodeConfig,
  target: NodeConfig
): Point => {
  const sourceCenter = getNodeCenter(source);
  const targetCenter = getNodeCenter(target);

  const sourceY = source.y + (source.height || 60);
  const targetY = target.y;

  // Midpoint of Bezier curve (approximation)
  return {
    x: (sourceCenter.x + targetCenter.x) / 2,
    y: (sourceY + targetY) / 2,
  };
};

/**
 * Clamp value between min and max
 */
export const clamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

/**
 * Lerp (linear interpolation) between two values
 */
export const lerp = (a: number, b: number, t: number): number => {
  return a + (b - a) * t;
};

/**
 * Ease-in-out cubic
 */
export const easeInOutCubic = (t: number): number => {
  return t < 0.5
    ? 4 * t * t * t
    : 1 - Math.pow(-2 * t + 2, 3) / 2;
};
