import React, { ReactNode, CSSProperties } from 'react';
import { ResponsiveContainer } from 'recharts';

/**
 * ResponsiveChartContainer Wrapper
 *
 * Provides standardized responsive container for all chart components
 * Ensures consistent sizing, responsive behavior, and accessibility
 */

export interface ResponsiveChartContainerProps {
  children: ReactNode;
  width?: string | number;
  height?: number;
  minHeight?: number;
  maxHeight?: number;
  aspect?: number;
  className?: string;
  style?: CSSProperties;
  'aria-label'?: string;
  'aria-describedby'?: string;
}

export const ResponsiveChartContainer: React.FC<ResponsiveChartContainerProps> = ({
  children,
  width = '100%',
  height = 400,
  minHeight = 200,
  maxHeight = 800,
  aspect,
  className,
  style,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
}) => {
  // Calculate responsive height if aspect ratio is provided
  const responsiveHeight = aspect ? undefined : height;

  const containerStyle: CSSProperties = {
    width: '100%',
    height: responsiveHeight,
    minHeight,
    maxHeight,
    position: 'relative',
    ...style,
  };

  return (
    <div
      className={className}
      style={containerStyle}
      role="img"
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
    >
      <ResponsiveContainer
        width={width}
        height={responsiveHeight}
        aspect={aspect}
      >
        {children}
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Preset configurations for common chart layouts
 */
export const ChartContainerPresets = {
  // Standard dashboard chart
  dashboard: {
    height: 300,
    minHeight: 200,
    maxHeight: 400,
  },

  // Large detailed chart
  detailed: {
    height: 500,
    minHeight: 300,
    maxHeight: 700,
  },

  // Compact chart for cards or small spaces
  compact: {
    height: 200,
    minHeight: 150,
    maxHeight: 250,
  },

  // Full height chart for dedicated chart pages
  fullHeight: {
    height: 600,
    minHeight: 400,
    maxHeight: 800,
  },

  // Square aspect ratio chart
  square: {
    aspect: 1,
    minHeight: 200,
    maxHeight: 600,
  },

  // Wide chart for timeline or horizontal data
  wide: {
    aspect: 2,
    minHeight: 200,
    maxHeight: 400,
  },
};

/**
 * Higher-order component to add responsive container to any chart
 */
export const withResponsiveContainer = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  preset: keyof typeof ChartContainerPresets = 'dashboard'
) => {
  return React.forwardRef<any, P & ResponsiveChartContainerProps>((props, ref) => {
    const {
      width,
      height,
      minHeight,
      maxHeight,
      aspect,
      className,
      style,
      'aria-label': ariaLabel,
      'aria-describedby': ariaDescribedBy,
      ...chartProps
    } = props;

    const presetConfig = ChartContainerPresets[preset];

    return (
      <ResponsiveChartContainer
        width={width}
        height={height ?? presetConfig.height}
        minHeight={minHeight ?? presetConfig.minHeight}
        maxHeight={maxHeight ?? presetConfig.maxHeight}
        aspect={aspect ?? presetConfig.aspect}
        className={className}
        style={style}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
      >
        <WrappedComponent ref={ref} {...(chartProps as P)} />
      </ResponsiveChartContainer>
    );
  });
};

export default ResponsiveChartContainer;