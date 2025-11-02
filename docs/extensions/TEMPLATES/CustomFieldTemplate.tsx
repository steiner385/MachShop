/**
 * CustomFieldTemplate - Custom form field scaffold
 *
 * Use this template to create custom form field components.
 */

import React, { useState, useCallback } from 'react';
import { Input, Space, Button, Tag } from 'antd';
import { PlusOutlined, CloseOutlined } from '@ant-design/icons';
import { useTheme } from '@/hooks/useTheme';
import styles from './CustomFieldTemplate.module.css';

/**
 * TODO: Define your field value type
 */
export type FieldValue = string[]; // Example: array of strings

/**
 * TODO: Define field props
 */
export interface CustomFieldTemplateProps {
  /** Current value */
  value?: FieldValue;

  /** Callback when value changes */
  onChange?: (value: FieldValue) => void;

  /** Placeholder text */
  placeholder?: string;

  /** Disabled state */
  disabled?: boolean;

  /** Maximum number of items */
  max?: number;
}

/**
 * CustomFieldTemplate
 *
 * TODO: Add description of your custom field
 * Example: A field for managing a list of tags/items
 */
export const CustomFieldTemplate: React.FC<CustomFieldTemplateProps> = ({
  value = [],
  onChange,
  placeholder = 'Enter value',
  disabled = false,
  max,
}) => {
  const { theme } = useTheme();
  const [inputValue, setInputValue] = useState('');

  /**
   * Add new item
   */
  const handleAdd = useCallback(() => {
    if (!inputValue.trim()) return;
    if (max && value.length >= max) return;

    const newValue = [...value, inputValue.trim()];
    onChange?.(newValue);
    setInputValue('');
  }, [inputValue, value, onChange, max]);

  /**
   * Remove item
   */
  const handleRemove = useCallback((index: number) => {
    const newValue = value.filter((_, i) => i !== index);
    onChange?.(newValue);
  }, [value, onChange]);

  /**
   * Handle Enter key
   */
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className={styles.container}>
      {/* Display current items */}
      {value.length > 0 && (
        <Space wrap className={styles.items}>
          {value.map((item, index) => (
            <Tag
              key={index}
              closable={!disabled}
              onClose={() => handleRemove(index)}
            >
              {item}
            </Tag>
          ))}
        </Space>
      )}

      {/* Input for new items */}
      {(!max || value.length < max) && (
        <Space.Compact style={{ width: '100%' }}>
          <Input
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAdd}
            disabled={disabled || !inputValue.trim()}
          >
            Add
          </Button>
        </Space.Compact>
      )}

      {/* TODO: Customize the UI above for your field type */}
    </div>
  );
};

CustomFieldTemplate.displayName = 'CustomFieldTemplate';

export default CustomFieldTemplate;
