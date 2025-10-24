/**
 * Routing Template Library Component
 * Phase 2: Visual + Tabular UI
 *
 * Component for saving and loading common routing patterns as reusable templates
 */

import React, { useState } from 'react';
import { Modal, Card, List, Button, Input, Space, Tag, Empty, message, Popconfirm } from 'antd';
import {
  SaveOutlined,
  FolderOpenOutlined,
  DeleteOutlined,
  CopyOutlined,
  SearchOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';
import { Node, Edge } from 'reactflow';

const { TextArea } = Input;

/**
 * Routing Template structure
 */
export interface RoutingTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  nodes: Node[];
  edges: Edge[];
  tags: string[];
  isFavorite?: boolean;
  createdBy?: string;
  createdAt: Date;
  usageCount?: number;
}

interface RoutingTemplateLibraryProps {
  visible: boolean;
  mode: 'save' | 'load';
  currentNodes?: Node[];
  currentEdges?: Edge[];
  onSaveTemplate?: (template: Omit<RoutingTemplate, 'id' | 'createdAt'>) => Promise<void>;
  onLoadTemplate?: (template: RoutingTemplate) => void;
  onClose: () => void;
}

/**
 * Sample templates (in real app, these would come from backend)
 */
const SAMPLE_TEMPLATES: RoutingTemplate[] = [
  {
    id: 'tpl-1',
    name: 'Basic Machining Process',
    description: 'Standard 3-step machining: Cut → Deburr → Inspect',
    category: 'Machining',
    tags: ['machining', 'basic', 'inspection'],
    nodes: [],
    edges: [],
    isFavorite: true,
    createdAt: new Date('2025-01-15'),
    usageCount: 47,
  },
  {
    id: 'tpl-2',
    name: 'Assembly with Parallel Operations',
    description: 'Parallel subassembly operations converging to final assembly',
    category: 'Assembly',
    tags: ['assembly', 'parallel', 'advanced'],
    nodes: [],
    edges: [],
    createdAt: new Date('2025-02-20'),
    usageCount: 23,
  },
  {
    id: 'tpl-3',
    name: 'OSP with Quality Gates',
    description: 'Outside processing with pre/post quality inspections',
    category: 'OSP',
    tags: ['osp', 'farmout', 'quality'],
    nodes: [],
    edges: [],
    isFavorite: true,
    createdAt: new Date('2025-03-10'),
    usageCount: 15,
  },
];

/**
 * Routing Template Library Component
 */
export const RoutingTemplateLibrary: React.FC<RoutingTemplateLibraryProps> = ({
  visible,
  mode,
  currentNodes = [],
  currentEdges = [],
  onSaveTemplate,
  onLoadTemplate,
  onClose,
}) => {
  const [templates] = useState<RoutingTemplate[]>(SAMPLE_TEMPLATES);
  const [searchText, setSearchText] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Save template form state
  const [templateName, setTemplateName] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState('General');
  const [templateTags, setTemplateTags] = useState('');

  /**
   * Filter templates by search and category
   */
  const filteredTemplates = templates.filter((tpl) => {
    const matchesSearch =
      !searchText ||
      tpl.name.toLowerCase().includes(searchText.toLowerCase()) ||
      tpl.description.toLowerCase().includes(searchText.toLowerCase()) ||
      tpl.tags.some((tag) => tag.toLowerCase().includes(searchText.toLowerCase()));

    const matchesCategory = !selectedCategory || tpl.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  /**
   * Get unique categories
   */
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  /**
   * Handle save template
   */
  const handleSaveTemplate = async () => {
    if (!templateName.trim()) {
      message.error('Please enter a template name');
      return;
    }

    const newTemplate: Omit<RoutingTemplate, 'id' | 'createdAt'> = {
      name: templateName,
      description: templateDescription,
      category: templateCategory,
      tags: templateTags.split(',').map((t) => t.trim()).filter(Boolean),
      nodes: currentNodes,
      edges: currentEdges,
    };

    try {
      await onSaveTemplate?.(newTemplate);
      message.success('Template saved successfully');
      handleClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to save template');
    }
  };

  /**
   * Handle load template
   */
  const handleLoadTemplate = (template: RoutingTemplate) => {
    onLoadTemplate?.(template);
    message.success(`Loaded template: ${template.name}`);
    handleClose();
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    setTemplateName('');
    setTemplateDescription('');
    setTemplateCategory('General');
    setTemplateTags('');
    setSearchText('');
    setSelectedCategory(null);
    onClose();
  };

  return (
    <Modal
      title={mode === 'save' ? 'Save as Template' : 'Load Template'}
      open={visible}
      onCancel={handleClose}
      width={700}
      footer={null}
    >
      {mode === 'save' ? (
        /* SAVE MODE */
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <Input
            placeholder="Template Name *"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            size="large"
          />

          <TextArea
            placeholder="Description"
            value={templateDescription}
            onChange={(e) => setTemplateDescription(e.target.value)}
            rows={3}
          />

          <Input
            placeholder="Category (e.g., Machining, Assembly)"
            value={templateCategory}
            onChange={(e) => setTemplateCategory(e.target.value)}
          />

          <Input
            placeholder="Tags (comma-separated)"
            value={templateTags}
            onChange={(e) => setTemplateTags(e.target.value)}
          />

          <div style={{ color: '#8c8c8c', fontSize: '12px' }}>
            This template will include {currentNodes.length} steps and {currentEdges.length} connections.
          </div>

          <Space>
            <Button type="primary" icon={<SaveOutlined />} onClick={handleSaveTemplate}>
              Save Template
            </Button>
            <Button onClick={handleClose}>Cancel</Button>
          </Space>
        </Space>
      ) : (
        /* LOAD MODE */
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          {/* Search and Filter */}
          <Input
            placeholder="Search templates..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />

          <Space wrap>
            <Button
              type={!selectedCategory ? 'primary' : 'default'}
              size="small"
              onClick={() => setSelectedCategory(null)}
            >
              All
            </Button>
            {categories.map((cat) => (
              <Button
                key={cat}
                type={selectedCategory === cat ? 'primary' : 'default'}
                size="small"
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Button>
            ))}
          </Space>

          {/* Template List */}
          <div style={{ maxHeight: '400px', overflow: 'auto' }}>
            {filteredTemplates.length === 0 ? (
              <Empty description="No templates found" />
            ) : (
              <List
                dataSource={filteredTemplates}
                renderItem={(template) => (
                  <Card
                    size="small"
                    style={{ marginBottom: '8px' }}
                    hoverable
                    actions={[
                      <Button
                        type="link"
                        icon={<FolderOpenOutlined />}
                        onClick={() => handleLoadTemplate(template)}
                      >
                        Load
                      </Button>,
                      <Button type="link" icon={<CopyOutlined />}>
                        Duplicate
                      </Button>,
                      <Popconfirm
                        title="Delete template?"
                        onConfirm={() => message.info('Delete functionality coming soon')}
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          Delete
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Space>
                        {template.isFavorite ? (
                          <StarFilled style={{ color: '#faad14' }} />
                        ) : (
                          <StarOutlined style={{ color: '#d9d9d9' }} />
                        )}
                        <strong>{template.name}</strong>
                        <Tag color="blue">{template.category}</Tag>
                      </Space>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {template.description}
                      </div>
                      <Space size={4} wrap>
                        {template.tags.map((tag) => (
                          <Tag key={tag} style={{ margin: 0, fontSize: '11px' }}>
                            {tag}
                          </Tag>
                        ))}
                      </Space>
                      <div style={{ fontSize: '11px', color: '#8c8c8c' }}>
                        Used {template.usageCount} times • Created {template.createdAt.toLocaleDateString()}
                      </div>
                    </Space>
                  </Card>
                )}
              />
            )}
          </div>
        </Space>
      )}
    </Modal>
  );
};

export default RoutingTemplateLibrary;
