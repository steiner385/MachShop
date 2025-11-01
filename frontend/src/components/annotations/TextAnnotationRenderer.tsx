/**
 * Text Annotation Renderer
 * Issue #66 Phase 3: Text annotations and callout bubbles
 *
 * Renders text and callout annotations to SVG
 */

import React from 'react';
import { AnnotationObject, AnnotationProperties } from './types';

interface TextAnnotationRendererProps {
  annotation: AnnotationObject;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  isSelected: boolean;
  viewport: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  onClick: () => void;
}

/**
 * Text annotation renderer
 */
export const TextAnnotationRenderer: React.FC<TextAnnotationRendererProps> = ({
  annotation,
  screenX,
  screenY,
  screenWidth,
  screenHeight,
  isSelected,
  viewport,
  onClick,
}) => {
  const { properties } = annotation;
  const strokeColor = isSelected ? '#ff6b6b' : (properties.strokeColor || '#000000');
  const textColor = properties.textColor || '#000000';
  const fontSize = properties.fontSize || 14;
  const fontFamily = properties.fontFamily || 'Arial';
  const fontWeight = properties.fontWeight || 400;
  const text = properties.text || '';

  if (annotation.type === 'text') {
    return (
      <g
        onClick={onClick}
        style={{ cursor: 'pointer' }}
        key={annotation.id}
      >
        {/* Background rect for visibility */}
        <rect
          x={screenX}
          y={screenY}
          width={screenWidth}
          height={screenHeight}
          fill="transparent"
          stroke={strokeColor}
          strokeWidth="1"
          strokeDasharray={isSelected ? '2,2' : 'none'}
          opacity="0.5"
        />

        {/* Text */}
        <text
          x={screenX + 4}
          y={screenY + fontSize + 2}
          fontSize={fontSize * viewport.scale}
          fontFamily={fontFamily}
          fontWeight={fontWeight}
          fill={textColor}
          style={{
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {text}
        </text>

        {/* Selection handles */}
        {isSelected && (
          <>
            <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
            <circle
              cx={screenX + screenWidth}
              cy={screenY + screenHeight}
              r="5"
              fill="#ff6b6b"
            />
          </>
        )}
      </g>
    );
  }

  if (annotation.type === 'callout') {
    return (
      <CalloutRenderer
        annotation={annotation}
        screenX={screenX}
        screenY={screenY}
        screenWidth={screenWidth}
        screenHeight={screenHeight}
        isSelected={isSelected}
        viewport={viewport}
        onClick={onClick}
      />
    );
  }

  return null;
};

interface CalloutRendererProps {
  annotation: AnnotationObject;
  screenX: number;
  screenY: number;
  screenWidth: number;
  screenHeight: number;
  isSelected: boolean;
  viewport: {
    scale: number;
    offsetX: number;
    offsetY: number;
  };
  onClick: () => void;
}

/**
 * Callout bubble renderer
 */
const CalloutRenderer: React.FC<CalloutRendererProps> = ({
  annotation,
  screenX,
  screenY,
  screenWidth,
  screenHeight,
  isSelected,
  viewport,
  onClick,
}) => {
  const { properties } = annotation;
  const strokeColor = isSelected ? '#ff6b6b' : (properties.strokeColor || '#000000');
  const fillColor = properties.fillColor || '#ffffff';
  const textColor = properties.textColor || '#000000';
  const fontSize = properties.fontSize || 12;
  const fontFamily = properties.fontFamily || 'Arial';
  const fontWeight = properties.fontWeight || 400;
  const text = properties.text || '';
  const calloutStyle = properties.calloutStyle || 'rectangular';
  const leaderLineStyle = properties.leaderLineStyle || 'straight';
  const leaderTailStyle = properties.leaderTailStyle || 'arrow';

  const padding = 8;
  const cornerRadius = calloutStyle === 'rounded' ? 8 : 0;

  // Callout tail position (center bottom)
  const tailX = screenX + screenWidth / 2;
  const tailY = screenY + screenHeight;
  const tailLength = 15;
  const tailWidth = 10;

  // Leader line end point (where arrow points to)
  const leaderEndX = tailX;
  const leaderEndY = tailY + tailLength;

  return (
    <g onClick={onClick} style={{ cursor: 'pointer' }} key={annotation.id}>
      {/* Leader line */}
      <LeaderLine
        startX={tailX}
        startY={tailY}
        endX={leaderEndX}
        endY={leaderEndY}
        style={leaderLineStyle}
        tailStyle={leaderTailStyle}
        color={strokeColor}
        strokeWidth="1.5"
      />

      {/* Callout bubble */}
      <CalloutBubble
        x={screenX}
        y={screenY}
        width={screenWidth}
        height={screenHeight}
        style={calloutStyle}
        cornerRadius={cornerRadius}
        tailX={tailX}
        tailY={tailY}
        tailWidth={tailWidth}
        fillColor={fillColor}
        strokeColor={strokeColor}
        strokeWidth={isSelected ? '2' : '1'}
      />

      {/* Text inside callout */}
      <text
        x={screenX + padding}
        y={screenY + fontSize + padding}
        fontSize={fontSize * viewport.scale}
        fontFamily={fontFamily}
        fontWeight={fontWeight}
        fill={textColor}
        style={{
          pointerEvents: 'none',
          userSelect: 'none',
          wordWrap: 'break-word',
        }}
      >
        {text.split('\n').map((line, i) => (
          <tspan key={i} x={screenX + padding} dy={fontSize * viewport.scale + 2}>
            {line}
          </tspan>
        ))}
      </text>

      {/* Selection handles */}
      {isSelected && (
        <>
          <circle cx={screenX} cy={screenY} r="5" fill="#ff6b6b" />
          <circle
            cx={screenX + screenWidth}
            cy={screenY + screenHeight}
            r="5"
            fill="#ff6b6b"
          />
        </>
      )}
    </g>
  );
};

interface LeaderLineProps {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  style: 'straight' | 'curved';
  tailStyle: 'none' | 'arrow' | 'triangle' | 'circle';
  color: string;
  strokeWidth: string;
}

/**
 * Leader line renderer (line from callout to target)
 */
const LeaderLine: React.FC<LeaderLineProps> = ({
  startX,
  startY,
  endX,
  endY,
  style,
  tailStyle,
  color,
  strokeWidth,
}) => {
  // Create curved path if needed
  const pathData =
    style === 'curved'
      ? `M ${startX} ${startY} Q ${(startX + endX) / 2} ${(startY + endY) / 2 + 20}, ${endX} ${endY}`
      : `M ${startX} ${startY} L ${endX} ${endY}`;

  return (
    <>
      {/* Line */}
      <path
        d={pathData}
        stroke={color}
        strokeWidth={strokeWidth}
        fill="none"
      />

      {/* Tail marker */}
      {tailStyle === 'arrow' && (
        <polygon
          points={`${endX - 5},${endY - 10} ${endX + 5},${endY - 10} ${endX},${endY}`}
          fill={color}
        />
      )}
      {tailStyle === 'triangle' && (
        <polygon
          points={`${endX - 8},${endY - 8} ${endX + 8},${endY - 8} ${endX},${endY}`}
          fill={color}
        />
      )}
      {tailStyle === 'circle' && (
        <circle cx={endX} cy={endY} r="4" fill={color} />
      )}
    </>
  );
};

interface CalloutBubbleProps {
  x: number;
  y: number;
  width: number;
  height: number;
  style: 'rectangular' | 'rounded' | 'cloud';
  cornerRadius: number;
  tailX: number;
  tailY: number;
  tailWidth: number;
  fillColor: string;
  strokeColor: string;
  strokeWidth: string;
}

/**
 * Callout bubble shape renderer
 */
const CalloutBubble: React.FC<CalloutBubbleProps> = ({
  x,
  y,
  width,
  height,
  style,
  cornerRadius,
  tailX,
  tailY,
  tailWidth,
  fillColor,
  strokeColor,
  strokeWidth,
}) => {
  if (style === 'cloud') {
    // Cloud style: rounded rectangle with multiple bumps
    const cloudPath = `
      M ${x + 20} ${y}
      L ${x + width - 20} ${y}
      Q ${x + width} ${y} ${x + width} ${y + 20}
      Q ${x + width + 15} ${y + height / 2} ${x + width} ${y + height - 20}
      L ${x + 20} ${y + height}
      Q ${x} ${y + height} ${x} ${y + height - 20}
      Q ${x - 15} ${y + height / 2} ${x} ${y + 20}
      Q ${x} ${y} ${x + 20} ${y}
    `;

    return (
      <>
        <path
          d={cloudPath}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        {/* Tail */}
        <polygon
          points={`${tailX - tailWidth / 2},${tailY} ${tailX + tailWidth / 2},${tailY} ${tailX},${tailY + 12}`}
          fill={fillColor}
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
      </>
    );
  }

  // Rectangular or rounded style
  return (
    <>
      {/* Main bubble */}
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={cornerRadius}
        ry={cornerRadius}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />

      {/* Tail triangle */}
      <polygon
        points={`${tailX - tailWidth / 2},${tailY} ${tailX + tailWidth / 2},${tailY} ${tailX},${tailY + 12}`}
        fill={fillColor}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
      />
    </>
  );
};

export default TextAnnotationRenderer;
