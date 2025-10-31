/**
 * Keyboard Shortcuts Help Component
 * Issue #279: Implement Keyboard Navigation for ReactFlow Components
 *
 * Displays a modal with all available keyboard shortcuts for ReactFlow components
 * WCAG 2.1 Level AA compliant help dialog
 */

import React from 'react';
import { Modal, Table, Typography, Tag } from 'antd';
import { QuestionCircleOutlined } from '@ant-design/icons';
import {
  REACTFLOW_KEYBOARD_SHORTCUTS,
  getShortcutsByCategory,
  formatShortcutKeys,
  KeyboardShortcut,
} from '../../constants/reactflow-keyboard-shortcuts';

const { Title, Text } = Typography;

interface KeyboardShortcutsHelpProps {
  visible: boolean;
  onClose: () => void;
  component?: 'VisualRoutingEditor' | 'DependencyVisualizer' | 'All';
}

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  visible,
  onClose,
  component = 'All',
}) => {
  // Filter shortcuts based on component context
  const getRelevantShortcuts = (): KeyboardShortcut[] => {
    if (component === 'All') {
      return REACTFLOW_KEYBOARD_SHORTCUTS.filter(
        shortcut => shortcut.implementation !== 'Not yet implemented'
      );
    }

    // Component-specific filtering could be added here
    return REACTFLOW_KEYBOARD_SHORTCUTS.filter(
      shortcut => shortcut.implementation !== 'Not yet implemented'
    );
  };

  const relevantShortcuts = getRelevantShortcuts();

  const columns = [
    {
      title: 'Shortcut',
      dataIndex: 'key',
      key: 'key',
      width: 120,
      render: (keys: string[]) => (
        <code
          style={{
            background: '#f5f5f5',
            padding: '2px 8px',
            borderRadius: '4px',
            fontSize: '12px',
            fontWeight: 500,
          }}
        >
          {formatShortcutKeys(keys)}
        </code>
      ),
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (text: string) => <Text>{text}</Text>,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 100,
      render: (category: string) => {
        const colorMap = {
          navigation: 'blue',
          selection: 'green',
          editing: 'orange',
          view: 'purple',
          creation: 'cyan',
        };
        return (
          <Tag color={colorMap[category as keyof typeof colorMap] || 'default'}>
            {category}
          </Tag>
        );
      },
    },
    {
      title: 'Context',
      dataIndex: 'context',
      key: 'context',
      width: 150,
      render: (context: string) => context && <Text type="secondary">{context}</Text>,
    },
  ];

  const categorizedShortcuts = {
    navigation: getShortcutsByCategory('navigation').filter(s =>
      relevantShortcuts.includes(s)
    ),
    selection: getShortcutsByCategory('selection').filter(s =>
      relevantShortcuts.includes(s)
    ),
    editing: getShortcutsByCategory('editing').filter(s =>
      relevantShortcuts.includes(s)
    ),
    view: getShortcutsByCategory('view').filter(s =>
      relevantShortcuts.includes(s)
    ),
    creation: getShortcutsByCategory('creation').filter(s =>
      relevantShortcuts.includes(s)
    ),
  };

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <QuestionCircleOutlined />
          <span>Keyboard Shortcuts</span>
          {component !== 'All' && (
            <Tag color="blue">{component}</Tag>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={null}
      width={800}
      centered
      aria-labelledby="shortcuts-modal-title"
      aria-describedby="shortcuts-modal-description"
    >
      <div id="shortcuts-modal-title" className="sr-only">
        Keyboard shortcuts help for ReactFlow components
      </div>
      <div id="shortcuts-modal-description" style={{ marginBottom: '16px' }}>
        <Text type="secondary">
          Use these keyboard shortcuts to navigate and interact with the diagram efficiently.
          All shortcuts work when the diagram has focus.
        </Text>
      </div>

      {/* Quick reference for most common shortcuts */}
      <div style={{ marginBottom: '24px', padding: '16px', background: '#f9f9f9', borderRadius: '6px' }}>
        <Title level={5} style={{ margin: '0 0 12px 0' }}>
          Most Common Shortcuts
        </Title>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
          <div><code>Tab</code> Navigate elements</div>
          <div><code>Enter</code> Select element</div>
          <div><code>Delete</code> Remove element</div>
          <div><code>Ctrl + N</code> Create new node</div>
          <div><code>Ctrl + 0</code> Fit view</div>
          <div><code>Ctrl + ?</code> Show this help</div>
        </div>
      </div>

      {/* Categorized shortcuts table */}
      <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
        {Object.entries(categorizedShortcuts).map(([category, shortcuts]) => {
          if (shortcuts.length === 0) return null;

          return (
            <div key={category} style={{ marginBottom: '20px' }}>
              <Title level={5} style={{ margin: '0 0 8px 0', textTransform: 'capitalize' }}>
                {category} ({shortcuts.length})
              </Title>
              <Table
                dataSource={shortcuts.map((shortcut, index) => ({
                  ...shortcut,
                  key: `${category}-${index}`,
                }))}
                columns={columns}
                pagination={false}
                size="small"
                showHeader={false}
                style={{ marginBottom: '16px' }}
              />
            </div>
          );
        })}
      </div>

      {/* Footer with accessibility note */}
      <div style={{
        marginTop: '16px',
        padding: '12px',
        background: '#e6f7ff',
        borderRadius: '4px',
        border: '1px solid #91d5ff'
      }}>
        <Text type="secondary" style={{ fontSize: '12px' }}>
          <strong>Accessibility Note:</strong> These shortcuts follow WCAG 2.1 Level AA guidelines.
          Screen reader users will receive audio feedback for most actions.
          Press <code>Escape</code> to close this dialog.
        </Text>
      </div>
    </Modal>
  );
};

export default KeyboardShortcutsHelp;