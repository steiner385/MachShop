/**
 * Tests for Accessible Colors Utility
 * Issue #284: Enhance Chart Component Accessibility
 *
 * Tests WCAG compliance, colorblind accessibility, and contrast validation
 */

import { describe, it, expect } from 'vitest';
import {
  ACCESSIBLE_COLORS,
  ACCESSIBLE_PATTERNS,
  ACCESSIBLE_SHAPES,
  getAccessibleColorScheme,
  getAccessibleDataPointStyle,
  getAccessibleGradient,
  validateColorContrast,
  CHART_COLOR_CONFIGS,
  getChartTypeColors,
  getThemeAwareColors,
  adjustColorBrightness,
} from '../../utils/accessibleColors';

describe('Accessible Colors Utility', () => {
  describe('Color Palettes', () => {
    it('should have all required color palettes', () => {
      expect(ACCESSIBLE_COLORS).toHaveProperty('primary');
      expect(ACCESSIBLE_COLORS).toHaveProperty('highContrast');
      expect(ACCESSIBLE_COLORS).toHaveProperty('colorblindFriendly');

      // Check that each palette has expected colors
      expect(Object.keys(ACCESSIBLE_COLORS.primary)).toEqual([
        'blue', 'green', 'orange', 'purple', 'red', 'teal', 'magenta', 'gold'
      ]);
    });

    it('should have valid hex color values', () => {
      const hexColorRegex = /^#[0-9A-F]{6}$/i;

      Object.values(ACCESSIBLE_COLORS.primary).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });

      Object.values(ACCESSIBLE_COLORS.highContrast).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });

      Object.values(ACCESSIBLE_COLORS.colorblindFriendly).forEach(color => {
        expect(color).toMatch(hexColorRegex);
      });
    });

    it('should have high contrast colors darker than primary colors', () => {
      // Convert hex to luminance for comparison
      const hexToLuminance = (hex: string) => {
        const rgb = parseInt(hex.slice(1), 16);
        const r = (rgb >> 16) & 255;
        const g = (rgb >> 8) & 255;
        const b = rgb & 255;
        return 0.299 * r + 0.587 * g + 0.114 * b;
      };

      const primaryLuminance = hexToLuminance(ACCESSIBLE_COLORS.primary.blue);
      const highContrastLuminance = hexToLuminance(ACCESSIBLE_COLORS.highContrast.blue);

      expect(highContrastLuminance).toBeLessThan(primaryLuminance);
    });
  });

  describe('Patterns and Shapes', () => {
    it('should have complete pattern definitions', () => {
      const expectedPatterns = [
        'solid', 'diagonal', 'horizontal', 'vertical', 'dots', 'grid', 'cross', 'wave'
      ];

      expectedPatterns.forEach(pattern => {
        expect(Object.values(ACCESSIBLE_PATTERNS)).toContain(
          expect.stringContaining(pattern.replace('diagonal', 'diagonal-stripes'))
        );
      });
    });

    it('should have complete shape definitions', () => {
      const expectedShapes = [
        'circle', 'square', 'triangle', 'diamond', 'star', 'cross', 'plus', 'hexagon'
      ];

      expectedShapes.forEach(shape => {
        expect(Object.values(ACCESSIBLE_SHAPES)).toContain(shape);
      });
    });
  });

  describe('getAccessibleColorScheme', () => {
    it('should return correct number of colors for small datasets', () => {
      const colors = getAccessibleColorScheme(3);
      expect(colors).toHaveLength(3);
      expect(colors[0]).toBe(ACCESSIBLE_COLORS.primary.blue);
      expect(colors[1]).toBe(ACCESSIBLE_COLORS.primary.green);
      expect(colors[2]).toBe(ACCESSIBLE_COLORS.primary.orange);
    });

    it('should cycle colors for large datasets', () => {
      const colors = getAccessibleColorScheme(10);
      expect(colors).toHaveLength(10);

      // Should cycle back to first colors
      const primaryColors = Object.values(ACCESSIBLE_COLORS.primary);
      expect(colors[8]).toBe(primaryColors[0]); // 8 % 8 = 0
      expect(colors[9]).toBe(primaryColors[1]); // 9 % 8 = 1
    });

    it('should return different palettes based on mode', () => {
      const defaultColors = getAccessibleColorScheme(3, 'default');
      const highContrastColors = getAccessibleColorScheme(3, 'highContrast');
      const colorblindColors = getAccessibleColorScheme(3, 'colorblindFriendly');

      expect(defaultColors[0]).toBe(ACCESSIBLE_COLORS.primary.blue);
      expect(highContrastColors[0]).toBe(ACCESSIBLE_COLORS.highContrast.blue);
      expect(colorblindColors[0]).toBe(ACCESSIBLE_COLORS.colorblindFriendly.blue);
    });
  });

  describe('getAccessibleDataPointStyle', () => {
    it('should return complete style object', () => {
      const style = getAccessibleDataPointStyle(0);

      expect(style).toHaveProperty('color');
      expect(style).toHaveProperty('pattern');
      expect(style).toHaveProperty('shape');
      expect(style).toHaveProperty('strokeWidth');
      expect(style).toHaveProperty('opacity');
      expect(style).toHaveProperty('dotSize');
      expect(style).toHaveProperty('activeDotSize');

      expect(style.strokeWidth).toBe(2);
      expect(style.opacity).toBe(1);
      expect(style.dotSize).toBe(6);
      expect(style.activeDotSize).toBe(8);
    });

    it('should cycle through patterns and shapes', () => {
      const style0 = getAccessibleDataPointStyle(0);
      const style8 = getAccessibleDataPointStyle(8); // Should cycle back

      // Colors should cycle
      expect(style0.color).toBe(style8.color);

      // Patterns should cycle
      expect(style0.pattern).toBe(style8.pattern);

      // Shapes should cycle
      expect(style0.shape).toBe(style8.shape);
    });

    it('should respect accessibility mode', () => {
      const defaultStyle = getAccessibleDataPointStyle(0, 'default');
      const highContrastStyle = getAccessibleDataPointStyle(0, 'highContrast');

      expect(defaultStyle.color).not.toBe(highContrastStyle.color);
    });
  });

  describe('getAccessibleGradient', () => {
    it('should generate gradient configuration', () => {
      const gradient = getAccessibleGradient('#FF0000');

      expect(gradient).toHaveProperty('id');
      expect(gradient).toHaveProperty('colors');
      expect(gradient.id).toBe('gradient-FF0000');
      expect(gradient.colors).toHaveLength(2);
      expect(gradient.colors[0]).toEqual({
        offset: '0%',
        stopColor: '#FF0000',
        stopOpacity: 0.8,
      });
      expect(gradient.colors[1]).toEqual({
        offset: '100%',
        stopColor: '#FF0000',
        stopOpacity: 0.1,
      });
    });

    it('should handle custom opacity values', () => {
      const gradient = getAccessibleGradient('#FF0000', { start: 0.9, end: 0.2 });

      expect(gradient.colors[0].stopOpacity).toBe(0.9);
      expect(gradient.colors[1].stopOpacity).toBe(0.2);
    });
  });

  describe('validateColorContrast', () => {
    it('should validate high contrast colors', () => {
      const result = validateColorContrast('#000000', '#FFFFFF');

      expect(result.isValid).toBe(true);
      expect(result.contrastRatio).toBeGreaterThan(7);
      expect(result.level).toBe('AAA');
    });

    it('should identify poor contrast', () => {
      const result = validateColorContrast('#CCCCCC', '#FFFFFF');

      expect(result.isValid).toBe(false);
      expect(result.contrastRatio).toBeLessThan(4.5);
      expect(result.level).toBe('FAIL');
    });

    it('should handle moderate contrast', () => {
      const result = validateColorContrast('#666666', '#FFFFFF');

      expect(result.isValid).toBe(true);
      expect(result.contrastRatio).toBeGreaterThanOrEqual(4.5);
      expect(result.contrastRatio).toBeLessThan(7);
      expect(result.level).toBe('AA');
    });

    it('should handle invalid color formats', () => {
      const result = validateColorContrast('invalid-color', '#FFFFFF');

      expect(result.isValid).toBe(false);
      expect(result.contrastRatio).toBe(0);
      expect(result.level).toBe('FAIL');
    });
  });

  describe('Chart Type Configurations', () => {
    it('should have configurations for all chart types', () => {
      expect(CHART_COLOR_CONFIGS).toHaveProperty('lineChart');
      expect(CHART_COLOR_CONFIGS).toHaveProperty('barChart');
      expect(CHART_COLOR_CONFIGS).toHaveProperty('pieChart');
      expect(CHART_COLOR_CONFIGS).toHaveProperty('areaChart');
      expect(CHART_COLOR_CONFIGS).toHaveProperty('scatterChart');
    });

    it('should have appropriate values for line charts', () => {
      const config = CHART_COLOR_CONFIGS.lineChart;

      expect(config.strokeWidth).toBe(3);
      expect(config.dotSize).toBe(6);
      expect(config.activeDotSize).toBe(8);
      expect(config.gradientOpacity.start).toBe(0.3);
      expect(config.gradientOpacity.end).toBe(0.1);
    });

    it('should have appropriate values for pie charts', () => {
      const config = CHART_COLOR_CONFIGS.pieChart;

      expect(config.strokeWidth).toBe(2);
      expect(config.strokeColor).toBe('#ffffff');
      expect(config.innerRadius).toBe(0);
      expect(config.outerRadius).toBe(80);
    });
  });

  describe('getChartTypeColors', () => {
    it('should return colors with chart-specific configurations', () => {
      const colors = getChartTypeColors('line', 3);

      expect(colors).toHaveLength(3);
      colors.forEach(colorConfig => {
        expect(colorConfig).toHaveProperty('color');
        expect(colorConfig).toHaveProperty('strokeWidth', 3); // From lineChart config
        expect(colorConfig).toHaveProperty('dotSize', 6);
        expect(colorConfig).toHaveProperty('activeDotSize', 8);
      });
    });

    it('should respect accessibility mode', () => {
      const defaultColors = getChartTypeColors('bar', 2, 'default');
      const highContrastColors = getChartTypeColors('bar', 2, 'highContrast');

      expect(defaultColors[0].color).not.toBe(highContrastColors[0].color);

      // Should still have bar chart specific config
      expect(defaultColors[0].opacity).toBe(0.9);
      expect(highContrastColors[0].opacity).toBe(0.9);
    });
  });

  describe('getThemeAwareColors', () => {
    it('should return standard colors for light mode', () => {
      const colors = getThemeAwareColors(false, 3);

      expect(colors).toHaveLength(3);
      expect(colors[0]).toBe(ACCESSIBLE_COLORS.primary.blue);
    });

    it('should return adjusted colors for dark mode', () => {
      const lightColors = getThemeAwareColors(false, 3);
      const darkColors = getThemeAwareColors(true, 3);

      expect(darkColors).toHaveLength(3);
      expect(darkColors[0]).not.toBe(lightColors[0]);

      // Dark mode colors should be lighter (adjusted)
      expect(darkColors[0]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('adjustColorBrightness', () => {
    it('should lighten colors with positive percentage', () => {
      const originalColor = '#333333';
      const lightenedColor = adjustColorBrightness(originalColor, 20);

      // Should result in a lighter color
      expect(lightenedColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(lightenedColor).not.toBe(originalColor);

      // Convert to RGB to verify it's lighter
      const originalRgb = parseInt(originalColor.slice(1), 16);
      const lightenedRgb = parseInt(lightenedColor.slice(1), 16);
      expect(lightenedRgb).toBeGreaterThan(originalRgb);
    });

    it('should darken colors with negative percentage', () => {
      const originalColor = '#CCCCCC';
      const darkenedColor = adjustColorBrightness(originalColor, -20);

      expect(darkenedColor).toMatch(/^#[0-9A-F]{6}$/i);
      expect(darkenedColor).not.toBe(originalColor);

      // Convert to RGB to verify it's darker
      const originalRgb = parseInt(originalColor.slice(1), 16);
      const darkenedRgb = parseInt(darkenedColor.slice(1), 16);
      expect(darkenedRgb).toBeLessThan(originalRgb);
    });

    it('should handle edge cases', () => {
      // Very bright color - should cap at white
      const brightest = adjustColorBrightness('#FFFFFF', 50);
      expect(brightest).toBe('#ffffff');

      // Very dark color - should cap at black
      const darkest = adjustColorBrightness('#000000', -50);
      expect(darkest).toBe('#000000');
    });

    it('should handle color without # prefix', () => {
      const result = adjustColorBrightness('FF0000', 10);
      expect(result).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });

  describe('Color Accessibility Compliance', () => {
    it('should have all primary colors meet AA contrast requirements', () => {
      Object.values(ACCESSIBLE_COLORS.primary).forEach(color => {
        const whiteContrast = validateColorContrast(color, '#FFFFFF');
        const blackContrast = validateColorContrast(color, '#000000');

        // At least one background should provide AA compliance
        expect(whiteContrast.isValid || blackContrast.isValid).toBe(true);
      });
    });

    it('should have high contrast colors meet AAA requirements', () => {
      Object.values(ACCESSIBLE_COLORS.highContrast).forEach(color => {
        const whiteContrast = validateColorContrast(color, '#FFFFFF');

        // High contrast colors should meet AAA with white background
        expect(whiteContrast.level).toBe('AAA');
      });
    });

    it('should have colorblind-friendly colors be distinguishable', () => {
      const colors = Object.values(ACCESSIBLE_COLORS.colorblindFriendly);

      // Test that we have colors from different parts of the spectrum
      // This is a simplified test - full colorblind testing would require specialized algorithms
      expect(colors).toContain(expect.stringMatching(/#[0-9A-F]*[0-4][0-9A-F]*/)); // Blues
      expect(colors).toContain(expect.stringMatching(/#[0-4][0-9A-F]*[0-9A-F]*[0-4]/)); // Greens/Cyans
      expect(colors).toContain(expect.stringMatching(/#[6-9A-F][0-9A-F]*[0-4]/)); // Oranges/Reds
    });
  });

  describe('Performance', () => {
    it('should generate color schemes efficiently for large datasets', () => {
      const start = Date.now();
      const colors = getAccessibleColorScheme(1000);
      const end = Date.now();

      expect(colors).toHaveLength(1000);
      expect(end - start).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should validate colors efficiently', () => {
      const colors = Object.values(ACCESSIBLE_COLORS.primary);
      const start = Date.now();

      colors.forEach(color => {
        validateColorContrast(color, '#FFFFFF');
        validateColorContrast(color, '#000000');
      });

      const end = Date.now();
      expect(end - start).toBeLessThan(50); // Should complete in less than 50ms
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero data points', () => {
      const colors = getAccessibleColorScheme(0);
      expect(colors).toHaveLength(0);
    });

    it('should handle negative data points', () => {
      const colors = getAccessibleColorScheme(-1);
      expect(colors).toHaveLength(0);
    });

    it('should handle very large data points', () => {
      const colors = getAccessibleColorScheme(10000);
      expect(colors).toHaveLength(10000);
      // Should still cycle correctly
      expect(colors[0]).toBe(colors[8]);
      expect(colors[1]).toBe(colors[9]);
    });
  });
});