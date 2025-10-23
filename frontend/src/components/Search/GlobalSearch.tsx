/**
 * Global Search Component
 * Phase 3: Global search with autocomplete
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Input,
  Select,
  List,
  Tag,
  Spin,
  Empty,
  Typography,
  Badge,
  Collapse,
  Space,
  Card,
  Tooltip,
  Button,
} from 'antd';
import {
  SearchOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
  FilterOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import { searchAPI } from '@/api/search';
import {
  SearchScope,
  SearchResult,
  SearchResultGroup,
  SEARCH_SCOPE_LABELS,
  SEARCH_ENTITY_TYPE_LABELS,
  SEARCH_ENTITY_TYPE_COLORS,
  groupResultsByType,
  formatSearchExecutionTime,
} from '@/types/search';

const { Option } = Select;
const { Text } = Typography;
const { Panel } = Collapse;

interface GlobalSearchProps {
  placeholder?: string;
  defaultScope?: SearchScope;
  onResultClick?: (result: SearchResult) => void;
  compact?: boolean;
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({
  placeholder = 'Search work orders, materials, equipment...',
  defaultScope = SearchScope.ALL,
  onResultClick,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>(defaultScope);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [resultGroups, setResultGroups] = useState<SearchResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [showResults, setShowResults] = useState(false);

  /**
   * Perform search
   */
  const performSearch = useCallback(
    async (searchQuery: string) => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setResults([]);
        setResultGroups([]);
        setTotalResults(0);
        setShowResults(false);
        return;
      }

      setLoading(true);
      setShowResults(true);

      const response = await searchAPI.search({
        query: searchQuery.trim(),
        scope,
        limit: 10,
      });

      if (response.success && response.data) {
        setResults(response.data.results);
        setResultGroups(groupResultsByType(response.data.results));
        setTotalResults(response.data.totalResults);
        setExecutionTimeMs(response.data.executionTimeMs);
      } else {
        setResults([]);
        setResultGroups([]);
        setTotalResults(0);
      }

      setLoading(false);
    },
    [scope]
  );

  /**
   * Handle search input change with debouncing
   */
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (query) {
        performSearch(query);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [query, performSearch]);

  /**
   * Handle result click
   */
  const handleResultClick = (result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else if (result.url) {
      navigate(result.url);
      setShowResults(false);
      setQuery('');
    }
  };

  /**
   * Clear search
   */
  const handleClear = () => {
    setQuery('');
    setResults([]);
    setResultGroups([]);
    setTotalResults(0);
    setShowResults(false);
  };

  /**
   * Handle scope change
   */
  const handleScopeChange = (newScope: SearchScope) => {
    setScope(newScope);
    if (query) {
      performSearch(query);
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      {/* Search Input */}
      <Space.Compact style={{ width: '100%' }}>
        {!compact && (
          <Select
            value={scope}
            onChange={handleScopeChange}
            style={{ width: 150 }}
            suffixIcon={<FilterOutlined />}
          >
            {Object.values(SearchScope).map((scopeValue) => (
              <Option key={scopeValue} value={scopeValue}>
                {SEARCH_SCOPE_LABELS[scopeValue]}
              </Option>
            ))}
          </Select>
        )}

        <Input
          size="large"
          placeholder={placeholder}
          prefix={<SearchOutlined />}
          suffix={
            query && (
              <CloseCircleOutlined
                onClick={handleClear}
                style={{ cursor: 'pointer', color: '#999' }}
              />
            )
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          allowClear
        />
      </Space.Compact>

      {/* Search Results Dropdown */}
      {showResults && (
        <Card
          style={{
            position: 'absolute',
            top: compact ? 45 : 50,
            left: 0,
            right: 0,
            maxHeight: '70vh',
            overflowY: 'auto',
            zIndex: 1000,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          }}
          bodyStyle={{ padding: 0 }}
        >
          {loading ? (
            <div style={{ padding: '40px', textAlign: 'center' }}>
              <Spin size="large" tip="Searching..."><div /></Spin>
            </div>
          ) : totalResults === 0 ? (
            <div style={{ padding: '40px' }}>
              <Empty
                description={
                  query
                    ? `No results found for "${query}"`
                    : 'Start typing to search'
                }
              />
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f0f0f0',
                  background: '#fafafa',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Text strong>
                  Found {totalResults} result{totalResults !== 1 ? 's' : ''}
                </Text>
                <Space>
                  <Tooltip title="Search execution time">
                    <Tag icon={<ThunderboltOutlined />} color="blue">
                      {formatSearchExecutionTime(executionTimeMs)}
                    </Tag>
                  </Tooltip>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => setShowResults(false)}
                  >
                    Close
                  </Button>
                </Space>
              </div>

              {/* Grouped Results */}
              <Collapse
                ghost
                defaultActiveKey={resultGroups.map((group) => group.entityType)}
                style={{ borderRadius: 0 }}
              >
                {resultGroups.map((group) => (
                  <Panel
                    key={group.entityType}
                    header={
                      <Space>
                        <Badge
                          count={group.count}
                          style={{ backgroundColor: '#52c41a' }}
                        />
                        <Text strong>
                          {SEARCH_ENTITY_TYPE_LABELS[group.entityType]}
                        </Text>
                      </Space>
                    }
                  >
                    <List
                      dataSource={group.results}
                      renderItem={(result) => (
                        <List.Item
                          key={result.id}
                          onClick={() => handleResultClick(result)}
                          style={{
                            cursor: 'pointer',
                            padding: '12px 16px',
                            transition: 'background 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = '#f5f5f5';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                          }}
                        >
                          <List.Item.Meta
                            title={
                              <Space>
                                <Text strong>{result.primaryText}</Text>
                                {result.status && (
                                  <Tag
                                    color={
                                      SEARCH_ENTITY_TYPE_COLORS[result.entityType]
                                    }
                                  >
                                    {result.status}
                                  </Tag>
                                )}
                              </Space>
                            }
                            description={
                              <Text type="secondary">{result.secondaryText}</Text>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  </Panel>
                ))}
              </Collapse>
            </>
          )}
        </Card>
      )}
    </div>
  );
};

export default GlobalSearch;
