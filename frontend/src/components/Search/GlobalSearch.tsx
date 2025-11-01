/**
 * Global Search Component
 * Phase 3: Global search with autocomplete
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
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
import { useFocusManagement } from '../../hooks/useFocusManagement';
import { useKeyboardHandler } from '../../hooks/useKeyboardHandler';
import { useComponentShortcuts } from '../../contexts/KeyboardShortcutContext';
import { announceToScreenReader } from '../../utils/ariaUtils';
import {
  SearchOutlined,
  CloseCircleOutlined,
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
import { isLikelyUUIDQuery, isValidUUID, reconstructUUID } from '../../utils/uuidUtils';

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
  placeholder = 'Search work orders, materials, equipment... or paste a UUID',
  defaultScope = SearchScope.ALL,
  onResultClick,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<SearchScope>(defaultScope);
  const [_results, setResults] = useState<SearchResult[]>([]);
  const [resultGroups, setResultGroups] = useState<SearchResultGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [totalResults, setTotalResults] = useState(0);
  const [executionTimeMs, setExecutionTimeMs] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);

  // Refs for focus management
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  // Flatten all results for keyboard navigation
  const flatResults = useMemo(() => {
    return resultGroups.reduce<SearchResult[]>((acc, group) => {
      return acc.concat(group.results);
    }, []);
  }, [resultGroups]);

  // Focus management for search results
  const { focusElement } = useFocusManagement({
    containerRef,
    enableFocusTrap: false,
    restoreFocus: false,
  });

  // Keyboard navigation functions
  const navigateResults = useCallback((direction: 'up' | 'down') => {
    if (flatResults.length === 0 || !showResults) return;

    let newIndex;
    if (direction === 'down') {
      newIndex = selectedResultIndex < flatResults.length - 1 ? selectedResultIndex + 1 : 0;
    } else {
      newIndex = selectedResultIndex > 0 ? selectedResultIndex - 1 : flatResults.length - 1;
    }

    setSelectedResultIndex(newIndex);

    // Announce to screen readers
    const result = flatResults[newIndex];
    if (result) {
      announceToScreenReader(`Selected result ${newIndex + 1} of ${flatResults.length}: ${result.primaryText}`, 'POLITE');
    }

    // Scroll selected item into view
    setTimeout(() => {
      const selectedElement = resultsRef.current?.querySelector(`[data-result-index="${newIndex}"]`) as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }, 0);
  }, [flatResults, selectedResultIndex, showResults]);

  const selectCurrentResult = useCallback(() => {
    if (selectedResultIndex >= 0 && flatResults[selectedResultIndex]) {
      const result = flatResults[selectedResultIndex];
      handleResultClick(result);
      announceToScreenReader(`Opening ${result.primaryText}`, 'POLITE');
    }
  }, [selectedResultIndex, flatResults, handleResultClick]);

  const closeResults = useCallback(() => {
    setShowResults(false);
    setSelectedResultIndex(-1);
    announceToScreenReader('Search results closed', 'POLITE');
    // Return focus to input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  }, []);

  // Keyboard handler for search input and results navigation
  const { keyboardProps } = useKeyboardHandler({
    enableActivation: false,
    enableArrowNavigation: true,
    enableEscape: true,
    onArrowNavigation: (direction, event) => {
      if (showResults && flatResults.length > 0) {
        event.preventDefault();
        if (direction === 'down' || direction === 'up') {
          navigateResults(direction);
        }
      }
    },
    onEscape: (event) => {
      if (showResults) {
        event.preventDefault();
        closeResults();
      }
    },
  });

  // Register keyboard shortcuts
  useComponentShortcuts('global-search', [
    {
      description: 'Open search results',
      keys: 'ArrowDown',
      handler: () => {
        if (query && !showResults && flatResults.length > 0) {
          setShowResults(true);
          setSelectedResultIndex(0);
        }
      },
      category: 'search',
      priority: 2,
    },
    {
      description: 'Select search result',
      keys: 'Enter',
      handler: (event) => {
        if (showResults && selectedResultIndex >= 0) {
          event.preventDefault();
          selectCurrentResult();
        }
      },
      category: 'search',
      priority: 3,
    },
    {
      description: 'Clear search',
      keys: 'Ctrl+K',
      handler: () => {
        handleClear();
        inputRef.current?.focus();
      },
      category: 'search',
      priority: 2,
    },
  ]);

  // Reset selection when results change
  useEffect(() => {
    setSelectedResultIndex(-1);
  }, [resultGroups]);

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

      const trimmedQuery = searchQuery.trim();
      let queryToSearch = trimmedQuery;

      // Check if query is a UUID or UUID-like
      if (isLikelyUUIDQuery(trimmedQuery)) {
        // Try to reconstruct full UUID if it's partial
        const reconstructed = reconstructUUID(trimmedQuery);
        if (reconstructed) {
          queryToSearch = reconstructed;
        }

        // If it's a valid UUID, prioritize exact UUID search
        if (isValidUUID(queryToSearch)) {
          console.log('Detected UUID query, performing exact lookup:', queryToSearch);
        }
      }

      const response = await searchAPI.search({
        query: queryToSearch,
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
  const handleResultClick = useCallback((result: SearchResult) => {
    if (onResultClick) {
      onResultClick(result);
    } else if (result.url) {
      navigate(result.url);
      setShowResults(false);
      setQuery('');
    }
  }, [onResultClick, navigate]);

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
    <div
      ref={containerRef}
      {...keyboardProps}
      style={{ position: 'relative', width: '100%' }}
      role="search"
      aria-label="Global search with keyboard navigation"
    >
      {/* Search Input */}
      <Space.Compact style={{ width: '100%' }}>
        {!compact && (
          <Select
            value={scope}
            onChange={handleScopeChange}
            style={{ width: 150 }}
            suffixIcon={<FilterOutlined />}
            aria-label="Search scope filter"
            aria-describedby="search-scope-hint"
          >
            {Object.values(SearchScope).map((scopeValue) => (
              <Option key={scopeValue} value={scopeValue}>
                {SEARCH_SCOPE_LABELS[scopeValue]}
              </Option>
            ))}
          </Select>
        )}

        <Input
          ref={inputRef}
          size="large"
          placeholder={placeholder}
          prefix={<SearchOutlined />}
          suffix={
            query && (
              <CloseCircleOutlined
                onClick={handleClear}
                style={{ cursor: 'pointer', color: '#999' }}
                aria-label="Clear search"
              />
            )
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query && setShowResults(true)}
          allowClear
          aria-label="Search input"
          aria-describedby="search-instructions"
          aria-expanded={showResults}
          aria-owns={showResults ? 'search-results' : undefined}
          aria-autocomplete="list"
          aria-activedescendant={
            selectedResultIndex >= 0 && flatResults[selectedResultIndex]
              ? `search-result-${flatResults[selectedResultIndex].id}`
              : undefined
          }
          onKeyDown={(e) => {
            // Handle Enter in input when no result is selected
            if (e.key === 'Enter' && !showResults && query) {
              e.preventDefault();
              performSearch(query);
              setShowResults(true);
            }
          }}
        />
      </Space.Compact>

      {/* Search Results Dropdown */}
      {showResults && (
        <Card
          ref={resultsRef}
          id="search-results"
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
          role="listbox"
          aria-label={`Search results: ${totalResults} found`}
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
                      renderItem={(result, index) => {
                        const globalIndex = flatResults.indexOf(result);
                        const isSelected = globalIndex === selectedResultIndex;

                        return (
                          <List.Item
                            key={result.id}
                            id={`search-result-${result.id}`}
                            data-result-index={globalIndex}
                            onClick={() => handleResultClick(result)}
                            style={{
                              cursor: 'pointer',
                              padding: '12px 16px',
                              transition: 'background 0.2s',
                              background: isSelected ? '#e6f7ff' : 'transparent',
                              border: isSelected ? '2px solid #1890ff' : '2px solid transparent',
                            }}
                            onMouseEnter={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = '#f5f5f5';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isSelected) {
                                e.currentTarget.style.background = 'transparent';
                              }
                            }}
                            role="option"
                            aria-selected={isSelected}
                            tabIndex={-1}
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
                        );
                      }}
                    />
                  </Panel>
                ))}
              </Collapse>
            </>
          )}
        </Card>
      )}

      {/* Hidden ARIA hints for screen readers */}
      <div id="search-instructions" style={{ display: 'none' }}>
        Use arrow keys to navigate results, Enter to select, Escape to close. Type to search across work orders, materials, equipment, and more.
      </div>
      <div id="search-scope-hint" style={{ display: 'none' }}>
        Filter search scope to narrow results to specific entity types.
      </div>
    </div>
  );
};

export default GlobalSearch;
