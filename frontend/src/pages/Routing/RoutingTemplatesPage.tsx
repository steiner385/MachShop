/**
 * Routing Templates Library Page
 * Sprint 4: Routing Management UI
 *
 * Route: /routings/templates
 *
 * Template library for browsing, searching, and using routing templates
 */

import React, { useEffect, useState } from 'react';
import {
  Card,
  Row,
  Col,
  Input,
  Select,
  Button,
  Empty,
  Spin,
  message,
  Tag,
  Space,
  Tooltip,
  Typography,
} from 'antd';
import {
  StarOutlined,
  StarFilled,
  PlusOutlined,
  SearchOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useSite } from '@/contexts/SiteContext';
import routingTemplateApi, { RoutingTemplate, SearchTemplatesParams } from '@/api/routingTemplates';

const { Search } = Input;
const { Option } = Select;
const { Title, Text, Paragraph } = Typography;

const RoutingTemplatesPage: React.FC = () => {
  const navigate = useNavigate();
  const { currentSite } = useSite();

  const [templates, setTemplates] = useState<RoutingTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [showFavorites, setShowFavorites] = useState(false);

  // Fetch templates
  const fetchTemplates = async () => {
    if (!currentSite) return;

    setLoading(true);
    try {
      const params: SearchTemplatesParams = {
        search: searchText || undefined,
        category: categoryFilter,
        siteId: currentSite.id,
        isFavorite: showFavorites || undefined,
        sortBy: 'createdAt',
        sortOrder: 'desc',
      };

      const response = await routingTemplateApi.getTemplates(params);
      setTemplates(response.templates);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
      message.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  // Load templates on mount and when filters change
  useEffect(() => {
    fetchTemplates();
  }, [currentSite, searchText, categoryFilter, showFavorites]);

  // Toggle favorite
  const handleToggleFavorite = async (templateId: string) => {
    try {
      await routingTemplateApi.toggleFavorite(templateId);
      message.success('Favorite updated');
      fetchTemplates();
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
      message.error('Failed to update favorite');
    }
  };

  // Use template - navigate to create routing with template
  const handleUseTemplate = (template: RoutingTemplate) => {
    navigate(`/routings/create?templateId=${template.id}`);
  };

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Title level={2}>
          <AppstoreOutlined /> Template Library
        </Title>
        <Paragraph>
          Browse and use routing templates to quickly create new routings
        </Paragraph>
      </div>

      {/* Search and Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Search
              placeholder="Search templates..."
              allowClear
              onSearch={(value) => setSearchText(value)}
              onChange={(e) => !e.target.value && setSearchText('')}
              enterButton={<SearchOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="Category"
              style={{ width: '100%' }}
              allowClear
              onChange={(value) => setCategoryFilter(value)}
              value={categoryFilter}
            >
              <Option value="MACHINING">Machining</Option>
              <Option value="ASSEMBLY">Assembly</Option>
              <Option value="INSPECTION">Inspection</Option>
              <Option value="FINISHING">Finishing</Option>
              <Option value="PACKAGING">Packaging</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type={showFavorites ? 'primary' : 'default'}
              icon={<StarOutlined />}
              onClick={() => setShowFavorites(!showFavorites)}
              style={{ width: '100%' }}
            >
              {showFavorites ? 'All Templates' : 'Favorites Only'}
            </Button>
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Button
              type="default"
              onClick={() => navigate('/routings')}
              style={{ width: '100%' }}
            >
              Back to Routings
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Templates Grid */}
      <Spin spinning={loading}>
        {templates.length === 0 && !loading ? (
          <Empty description="No templates found" />
        ) : (
          <Row gutter={[16, 16]}>
            {templates.map((template) => (
              <Col xs={24} sm={12} md={8} lg={6} key={template.id}>
                <Card
                  data-testid={`template-card-${template.id}`}
                  className="template-card"
                  hoverable
                  actions={[
                    <Tooltip title={template.isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                      <Button
                        type="text"
                        icon={template.isFavorite ? <StarFilled style={{ color: '#faad14' }} /> : <StarOutlined />}
                        onClick={() => handleToggleFavorite(template.id)}
                      />
                    </Tooltip>,
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      onClick={() => handleUseTemplate(template)}
                    >
                      Use Template
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={
                      <div>
                        {template.name}
                        {template.isFavorite && (
                          <StarFilled style={{ color: '#faad14', marginLeft: '8px', fontSize: '14px' }} />
                        )}
                      </div>
                    }
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {template.description && (
                          <Paragraph
                            ellipsis={{ rows: 2 }}
                            style={{ margin: 0, fontSize: '12px' }}
                          >
                            {template.description}
                          </Paragraph>
                        )}
                        {template.category && (
                          <Tag color="blue">{template.category}</Tag>
                        )}
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Used {template.usageCount} times
                        </Text>
                        {template.rating && (
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Rating: {template.rating.toFixed(1)}/5
                          </Text>
                        )}
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>
    </div>
  );
};

export default RoutingTemplatesPage;
