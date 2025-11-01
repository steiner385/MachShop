/**
 * Ant Design Theme Configuration
 * Integrates MachShop color tokens with Ant Design's theme system
 *
 * This file configures Ant Design components to use our standardized color palette,
 * ensuring consistency between custom components and Ant Design components.
 */

import { theme } from 'antd';
import type { ThemeConfig } from 'antd';
import { baseColors, domainColors } from './tokens/colors';
import { lightTheme, darkTheme } from './tokens/semantic';
import { typographyScale, headingHierarchy } from './tokens/typography';

// Base Ant Design theme configuration
const baseAntdTheme: ThemeConfig = {
  token: {
    // Primary brand colors
    colorPrimary: baseColors.primary[500],
    colorPrimaryBg: baseColors.primary[50],
    colorPrimaryBgHover: baseColors.primary[100],
    colorPrimaryBorder: baseColors.primary[200],
    colorPrimaryBorderHover: baseColors.primary[300],
    colorPrimaryHover: baseColors.primary[400],
    colorPrimaryActive: baseColors.primary[600],
    colorPrimaryTextHover: baseColors.primary[400],
    colorPrimaryText: baseColors.primary[500],
    colorPrimaryTextActive: baseColors.primary[600],

    // Success colors
    colorSuccess: baseColors.success[500],
    colorSuccessBg: baseColors.success[50],
    colorSuccessBgHover: baseColors.success[100],
    colorSuccessBorder: baseColors.success[200],
    colorSuccessBorderHover: baseColors.success[300],
    colorSuccessHover: baseColors.success[400],
    colorSuccessActive: baseColors.success[600],
    colorSuccessTextHover: baseColors.success[400],
    colorSuccessText: baseColors.success[500],
    colorSuccessTextActive: baseColors.success[600],

    // Warning colors
    colorWarning: baseColors.warning[500],
    colorWarningBg: baseColors.warning[50],
    colorWarningBgHover: baseColors.warning[100],
    colorWarningBorder: baseColors.warning[200],
    colorWarningBorderHover: baseColors.warning[300],
    colorWarningHover: baseColors.warning[400],
    colorWarningActive: baseColors.warning[600],
    colorWarningTextHover: baseColors.warning[400],
    colorWarningText: baseColors.warning[500],
    colorWarningTextActive: baseColors.warning[600],

    // Error colors
    colorError: baseColors.error[500],
    colorErrorBg: baseColors.error[50],
    colorErrorBgHover: baseColors.error[100],
    colorErrorBorder: baseColors.error[200],
    colorErrorBorderHover: baseColors.error[300],
    colorErrorHover: baseColors.error[400],
    colorErrorActive: baseColors.error[600],
    colorErrorTextHover: baseColors.error[400],
    colorErrorText: baseColors.error[500],
    colorErrorTextActive: baseColors.error[600],

    // Info colors
    colorInfo: baseColors.info[500],
    colorInfoBg: baseColors.info[50],
    colorInfoBgHover: baseColors.info[100],
    colorInfoBorder: baseColors.info[200],
    colorInfoBorderHover: baseColors.info[300],
    colorInfoHover: baseColors.info[400],
    colorInfoActive: baseColors.info[600],
    colorInfoTextHover: baseColors.info[400],
    colorInfoText: baseColors.info[500],
    colorInfoTextActive: baseColors.info[600],

    // Text colors
    colorText: lightTheme.text.primary,
    colorTextSecondary: lightTheme.text.secondary,
    colorTextTertiary: lightTheme.text.tertiary,
    colorTextQuaternary: lightTheme.text.disabled,

    // Background colors
    colorBgBase: lightTheme.background.primary,
    colorBgContainer: lightTheme.surface.primary,
    colorBgElevated: lightTheme.surface.elevated,
    colorBgLayout: lightTheme.background.secondary,
    colorBgSpotlight: lightTheme.background.tertiary,
    colorBgMask: lightTheme.surface.overlay,

    // Border colors
    colorBorder: lightTheme.border.primary,
    colorBorderSecondary: lightTheme.border.secondary,

    // Link colors
    colorLink: lightTheme.text.link,
    colorLinkActive: lightTheme.text.linkHover,
    colorLinkHover: lightTheme.text.linkHover,

    // Typography - Using our typography scale
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
    fontSize: parseFloat(typographyScale.fontSize.base) * 16, // Convert rem to px (1rem = 16px)
    fontSizeHeading1: parseFloat(headingHierarchy.h1.fontSize) * 16, // 2.25rem = 36px
    fontSizeHeading2: parseFloat(headingHierarchy.h2.fontSize) * 16, // 1.875rem = 30px
    fontSizeHeading3: parseFloat(headingHierarchy.h3.fontSize) * 16, // 1.5rem = 24px
    fontSizeHeading4: parseFloat(headingHierarchy.h4.fontSize) * 16, // 1.25rem = 20px
    fontSizeHeading5: parseFloat(headingHierarchy.h5.fontSize) * 16, // 1.125rem = 18px
    fontSizeLG: parseFloat(typographyScale.fontSize.lg) * 16, // 1.125rem = 18px
    fontSizeSM: parseFloat(typographyScale.fontSize.sm) * 16, // 0.875rem = 14px
    fontSizeXL: parseFloat(typographyScale.fontSize.xl) * 16, // 1.25rem = 20px

    // Spacing and sizing
    sizeUnit: 4,
    sizeStep: 4,
    borderRadius: 6,
    borderRadiusLG: 8,
    borderRadiusSM: 4,
    borderRadiusXS: 2,

    // Control heights
    controlHeight: 32,
    controlHeightLG: 40,
    controlHeightSM: 24,
    controlHeightXS: 16,

    // Motion
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',

    // Box shadow
    boxShadow: lightTheme.shadow.md,
    boxShadowSecondary: lightTheme.shadow.sm,
    boxShadowTertiary: lightTheme.shadow.lg,

    // Z-index
    zIndexBase: 0,
    zIndexPopupBase: 1000,
  },

  // Component-specific overrides
  components: {
    Button: {
      colorPrimary: baseColors.primary[500],
      algorithm: true, // Enable algorithm for automatic color derivation
    },

    Table: {
      headerBg: lightTheme.surface.secondary,
      headerColor: lightTheme.text.primary,
      rowHoverBg: lightTheme.surface.tertiary,
    },

    Card: {
      headerBg: lightTheme.surface.primary,
      colorBorderSecondary: lightTheme.border.secondary,
    },

    Layout: {
      bodyBg: lightTheme.background.secondary,
      headerBg: lightTheme.surface.primary,
      siderBg: lightTheme.surface.primary,
      triggerBg: lightTheme.background.tertiary,
    },

    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: lightTheme.status.infoBackground,
      itemSelectedColor: baseColors.primary[600],
      itemHoverBg: lightTheme.surface.tertiary,
    },

    Form: {
      labelColor: lightTheme.form.labelText,
      verticalLabelPadding: '0 0 8px',
    },

    Input: {
      colorBgContainer: lightTheme.form.inputBackground,
      colorBorder: lightTheme.form.inputBorder,
      colorBorderHover: lightTheme.form.inputBorderHover,
      activeBorderColor: lightTheme.form.inputBorderFocus,
      colorText: lightTheme.form.inputText,
      colorTextPlaceholder: lightTheme.form.inputPlaceholder,
    },

    Select: {
      colorBgContainer: lightTheme.form.inputBackground,
      colorBorder: lightTheme.form.inputBorder,
      colorBorderHover: lightTheme.form.inputBorderHover,
      colorPrimaryHover: lightTheme.form.inputBorderFocus,
    },

    DatePicker: {
      colorBgContainer: lightTheme.form.inputBackground,
      colorBorder: lightTheme.form.inputBorder,
      colorBorderHover: lightTheme.form.inputBorderHover,
      activeBorderColor: lightTheme.form.inputBorderFocus,
    },

    Tag: {
      colorSuccessBg: baseColors.success[50],
      colorSuccessBorder: baseColors.success[200],
      colorWarningBg: baseColors.warning[50],
      colorWarningBorder: baseColors.warning[200],
      colorErrorBg: baseColors.error[50],
      colorErrorBorder: baseColors.error[200],
      colorInfoBg: baseColors.info[50],
      colorInfoBorder: baseColors.info[200],
    },

    Alert: {
      colorSuccessBg: baseColors.success[50],
      colorSuccessBorder: baseColors.success[200],
      colorWarningBg: baseColors.warning[50],
      colorWarningBorder: baseColors.warning[200],
      colorErrorBg: baseColors.error[50],
      colorErrorBorder: baseColors.error[200],
      colorInfoBg: baseColors.info[50],
      colorInfoBorder: baseColors.info[200],
    },

    Badge: {
      colorPrimary: baseColors.error[500], // Default badge color (notifications)
    },

    Progress: {
      colorSuccess: baseColors.success[500],
      colorInfo: baseColors.primary[500],
      colorWarning: baseColors.warning[500],
      colorError: baseColors.error[500],
    },

    Statistic: {
      colorTextHeading: lightTheme.text.primary,
      colorTextDescription: lightTheme.text.secondary,
    },

    Tooltip: {
      colorBgSpotlight: baseColors.neutral[800],
      colorTextLightSolid: baseColors.pure.white,
    },

    Modal: {
      contentBg: lightTheme.surface.primary,
      headerBg: lightTheme.surface.primary,
    },

    Drawer: {
      colorBgElevated: lightTheme.surface.primary,
    },

    Tabs: {
      itemColor: lightTheme.text.secondary,
      itemSelectedColor: baseColors.primary[500],
      itemHoverColor: baseColors.primary[400],
      inkBarColor: baseColors.primary[500],
    },

    Steps: {
      colorPrimary: baseColors.primary[500],
      colorSuccess: baseColors.success[500],
      colorError: baseColors.error[500],
    },
  },

  // Design algorithm configuration
  algorithm: theme.defaultAlgorithm,
};

// Dark theme configuration
export const darkAntdTheme: ThemeConfig = {
  ...baseAntdTheme,
  token: {
    ...baseAntdTheme.token,
    // Override colors for dark mode
    colorText: darkTheme.text.primary,
    colorTextSecondary: darkTheme.text.secondary,
    colorTextTertiary: darkTheme.text.tertiary,
    colorTextQuaternary: darkTheme.text.disabled,

    colorBgBase: darkTheme.background.primary,
    colorBgContainer: darkTheme.surface.primary,
    colorBgElevated: darkTheme.surface.elevated,
    colorBgLayout: darkTheme.background.secondary,
    colorBgSpotlight: darkTheme.background.tertiary,
    colorBgMask: darkTheme.surface.overlay,

    colorBorder: darkTheme.border.primary,
    colorBorderSecondary: darkTheme.border.secondary,

    colorLink: darkTheme.text.link,
    colorLinkActive: darkTheme.text.linkHover,
    colorLinkHover: darkTheme.text.linkHover,

    boxShadow: darkTheme.shadow.md,
    boxShadowSecondary: darkTheme.shadow.sm,
    boxShadowTertiary: darkTheme.shadow.lg,
  },
  components: {
    ...baseAntdTheme.components,
    Table: {
      ...baseAntdTheme.components?.Table,
      headerBg: darkTheme.surface.secondary,
      headerColor: darkTheme.text.primary,
      rowHoverBg: darkTheme.surface.tertiary,
    },
    Layout: {
      ...baseAntdTheme.components?.Layout,
      bodyBg: darkTheme.background.secondary,
      headerBg: darkTheme.surface.primary,
      siderBg: darkTheme.surface.primary,
      triggerBg: darkTheme.background.tertiary,
    },
    // Add more dark mode component overrides as needed
  },
  algorithm: theme.darkAlgorithm,
};

// Manufacturing-specific theme extensions
export const manufacturingThemeExtensions = {
  // Equipment status colors for Ant Design components
  equipmentStatus: {
    running: {
      color: domainColors.equipment.running,
      backgroundColor: baseColors.success[50],
    },
    idle: {
      color: domainColors.equipment.idle,
      backgroundColor: baseColors.warning[50],
    },
    maintenance: {
      color: domainColors.equipment.maintenance,
      backgroundColor: baseColors.info[50],
    },
    fault: {
      color: domainColors.equipment.fault,
      backgroundColor: baseColors.error[50],
    },
    offline: {
      color: domainColors.equipment.offline,
      backgroundColor: baseColors.neutral[50],
    },
  },

  // Work order status colors
  workOrderStatus: {
    pending: {
      color: domainColors.workOrder.pending,
      backgroundColor: baseColors.neutral[50],
    },
    inProgress: {
      color: domainColors.workOrder.inProgress,
      backgroundColor: baseColors.primary[50],
    },
    completed: {
      color: domainColors.workOrder.completed,
      backgroundColor: baseColors.success[50],
    },
    onHold: {
      color: domainColors.workOrder.onHold,
      backgroundColor: baseColors.warning[50],
    },
    cancelled: {
      color: domainColors.workOrder.cancelled,
      backgroundColor: baseColors.error[50],
    },
  },
};

// Export default theme configurations
export const lightAntdTheme = baseAntdTheme;
// darkAntdTheme is already exported above

// Theme configuration map
export const antdThemes = {
  light: lightAntdTheme,
  dark: darkAntdTheme,
} as const;

export type AntdThemeName = keyof typeof antdThemes;