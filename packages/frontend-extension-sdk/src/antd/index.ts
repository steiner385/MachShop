/**
 * Ant Design Components Module
 *
 * Re-exports all Ant Design components with version lock and enforcement.
 * Prevents usage of discouraged or deprecated components.
 * All extensions must use components from this module for consistency.
 *
 * @module antd-components
 */

// Re-export core components
export { default as Affix } from 'antd/es/affix';
export { default as Anchor } from 'antd/es/anchor';
export { default as AutoComplete } from 'antd/es/auto-complete';
export { default as Avatar } from 'antd/es/avatar';
export { default as Badge } from 'antd/es/badge';
export { default as Breadcrumb } from 'antd/es/breadcrumb';
export { default as Button } from 'antd/es/button';
export { default as Calendar } from 'antd/es/calendar';
export { default as Card } from 'antd/es/card';
export { default as Carousel } from 'antd/es/carousel';
export { default as Cascader } from 'antd/es/cascader';
export { default as Checkbox } from 'antd/es/checkbox';
export { default as Collapse } from 'antd/es/collapse';
export { default as ColorPicker } from 'antd/es/color-picker';
export { default as ConfigProvider } from 'antd/es/config-provider';
export { default as DatePicker } from 'antd/es/date-picker';
export { default as Divider } from 'antd/es/divider';
export { default as Drawer } from 'antd/es/drawer';
export { default as Dropdown } from 'antd/es/dropdown';
export { default as Empty } from 'antd/es/empty';
export { default as FloatButton } from 'antd/es/float-button';
export { default as Form } from 'antd/es/form';
export { default as Grid } from 'antd/es/grid';
export { default as Image } from 'antd/es/image';
export { default as Input } from 'antd/es/input';
export { default as InputNumber } from 'antd/es/input-number';
export { default as Layout } from 'antd/es/layout';
export { default as List } from 'antd/es/list';
export { default as Mentions } from 'antd/es/mentions';
export { default as Menu } from 'antd/es/menu';
export { default as Message } from 'antd/es/message';
export { default as Modal } from 'antd/es/modal';
export { default as notification } from 'antd/es/notification';
export { default as PageHeader } from 'antd/es/page-header';
export { default as Pagination } from 'antd/es/pagination';
export { default as Popconfirm } from 'antd/es/popconfirm';
export { default as Popover } from 'antd/es/popover';
export { default as Progress } from 'antd/es/progress';
export { default as Radio } from 'antd/es/radio';
export { default as Rate } from 'antd/es/rate';
export { default as Result } from 'antd/es/result';
export { default as Row } from 'antd/es/row';
export { default as Segmented } from 'antd/es/segmented';
export { default as Select } from 'antd/es/select';
export { default as Skeleton } from 'antd/es/skeleton';
export { default as Slider } from 'antd/es/slider';
export { default as Space } from 'antd/es/space';
export { default as Spin } from 'antd/es/spin';
export { default as Statistic } from 'antd/es/statistic';
export { default as Steps } from 'antd/es/steps';
export { default as Switch } from 'antd/es/switch';
export { default as Table } from 'antd/es/table';
export { default as Tabs } from 'antd/es/tabs';
export { default as Tag } from 'antd/es/tag';
export { default as TimePicker } from 'antd/es/time-picker';
export { default as Timeline } from 'antd/es/timeline';
export { default as Tooltip } from 'antd/es/tooltip';
export { default as Tour } from 'antd/es/tour';
export { default as Transfer } from 'antd/es/transfer';
export { default as Tree } from 'antd/es/tree';
export { default as TreeSelect } from 'antd/es/tree-select';
export { default as Typography } from 'antd/es/typography';
export { default as Upload } from 'antd/es/upload';
export { default as Watermark } from 'antd/es/watermark';

// Re-export icons
export * as Icons from '@ant-design/icons';

// Re-export theme utilities
export { useToken } from 'antd/es/theme';

/**
 * Ant Design Version Information
 */
export const ANTD_VERSION = '5.11.0'; // Match your Ant Design version

/**
 * List of discouraged components (don't use in extensions)
 */
export const DISCOURAGED_COMPONENTS = [
  'Descriptions', // Use custom layout instead
  'Spin', // Consider using Skeleton for better UX
];

/**
 * List of deprecated components (don't use)
 */
export const DEPRECATED_COMPONENTS = [
  'BackTop', // Use FloatButton instead
  'LocaleProvider', // Use ConfigProvider instead
];

/**
 * Validate component usage
 */
export function isComponentAllowed(componentName: string): boolean {
  return (
    !DISCOURAGED_COMPONENTS.includes(componentName) && !DEPRECATED_COMPONENTS.includes(componentName)
  );
}

/**
 * Get alternative recommendation for discouraged components
 */
export function getComponentAlternative(componentName: string): string | null {
  const alternatives: Record<string, string> = {
    BackTop: 'FloatButton',
    LocaleProvider: 'ConfigProvider',
    Descriptions: 'Custom layout with Grid and Typography',
  };

  return alternatives[componentName] || null;
}

/**
 * Assert component is allowed
 */
export function assertComponentAllowed(componentName: string): void {
  if (!isComponentAllowed(componentName)) {
    const alternative = getComponentAlternative(componentName);
    const message = `Component '${componentName}' is not allowed in extensions`;
    const suggestion = alternative ? ` Use '${alternative}' instead` : '';
    throw new Error(`${message}.${suggestion}`);
  }
}
