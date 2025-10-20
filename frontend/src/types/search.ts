/**
 * Frontend Global Search Types
 * Phase 3: Global search functionality
 */

// ============================================
// ENUMS
// ============================================

export enum SearchEntityType {
  WORK_ORDER = 'WORK_ORDER',
  MATERIAL_DEFINITION = 'MATERIAL_DEFINITION',
  MATERIAL_LOT = 'MATERIAL_LOT',
  EQUIPMENT = 'EQUIPMENT',
  PERSONNEL = 'PERSONNEL',
  PRODUCT = 'PRODUCT',
  QUALITY_RECORD = 'QUALITY_RECORD',
  PROCESS_SEGMENT = 'PROCESS_SEGMENT',
  SITE = 'SITE',
  AREA = 'AREA',
  WORK_CENTER = 'WORK_CENTER',
}

export enum SearchScope {
  ALL = 'ALL',
  PRODUCTION = 'PRODUCTION',
  MATERIALS = 'MATERIALS',
  EQUIPMENT = 'EQUIPMENT',
  QUALITY = 'QUALITY',
  ORGANIZATION = 'ORGANIZATION',
}

// ============================================
// INTERFACES
// ============================================

export interface SearchResult {
  entityType: SearchEntityType;
  id: string;
  primaryText: string;
  secondaryText?: string;
  metadata: Record<string, any>;
  relevanceScore: number;
  highlights?: SearchHighlight[];
  status?: string;
  url?: string;
}

export interface SearchHighlight {
  field: string;
  fragment: string;
  matchStart: number;
  matchEnd: number;
}

export interface SearchResponse {
  query: string;
  totalResults: number;
  resultsByType: Record<SearchEntityType, number>;
  results: SearchResult[];
  executionTimeMs: number;
  suggestions?: string[];
}

export interface SearchSuggestion {
  text: string;
  entityType?: SearchEntityType;
  count?: number;
}

export interface SearchRequest {
  query: string;
  scope?: SearchScope;
  entityTypes?: SearchEntityType[];
  limit?: number;
  includeInactive?: boolean;
  siteId?: string;
  areaId?: string;
}

export interface SearchHistoryItem {
  query: string;
  timestamp: string;
  resultCount: number;
  scope?: SearchScope;
}

// ============================================
// UI-SPECIFIC TYPES
// ============================================

export interface SearchResultGroup {
  entityType: SearchEntityType;
  count: number;
  results: SearchResult[];
  expanded: boolean;
}

export interface SearchState {
  query: string;
  scope: SearchScope;
  results: SearchResult[];
  resultGroups: SearchResultGroup[];
  totalResults: number;
  loading: boolean;
  error: string | null;
  executionTimeMs: number;
  recentSearches: SearchHistoryItem[];
}

// ============================================
// CONSTANTS
// ============================================

export const SEARCH_ENTITY_TYPE_LABELS: Record<SearchEntityType, string> = {
  [SearchEntityType.WORK_ORDER]: 'Work Orders',
  [SearchEntityType.MATERIAL_DEFINITION]: 'Material Definitions',
  [SearchEntityType.MATERIAL_LOT]: 'Material Lots',
  [SearchEntityType.EQUIPMENT]: 'Equipment',
  [SearchEntityType.PERSONNEL]: 'Personnel',
  [SearchEntityType.PRODUCT]: 'Products',
  [SearchEntityType.QUALITY_RECORD]: 'Quality Records',
  [SearchEntityType.PROCESS_SEGMENT]: 'Process Segments',
  [SearchEntityType.SITE]: 'Sites',
  [SearchEntityType.AREA]: 'Areas',
  [SearchEntityType.WORK_CENTER]: 'Work Centers',
};

export const SEARCH_ENTITY_TYPE_ICONS: Record<SearchEntityType, string> = {
  [SearchEntityType.WORK_ORDER]: 'file-text',
  [SearchEntityType.MATERIAL_DEFINITION]: 'inbox',
  [SearchEntityType.MATERIAL_LOT]: 'barcode',
  [SearchEntityType.EQUIPMENT]: 'tool',
  [SearchEntityType.PERSONNEL]: 'user',
  [SearchEntityType.PRODUCT]: 'appstore',
  [SearchEntityType.QUALITY_RECORD]: 'check-circle',
  [SearchEntityType.PROCESS_SEGMENT]: 'deployment-unit',
  [SearchEntityType.SITE]: 'home',
  [SearchEntityType.AREA]: 'block',
  [SearchEntityType.WORK_CENTER]: 'cluster',
};

export const SEARCH_ENTITY_TYPE_COLORS: Record<SearchEntityType, string> = {
  [SearchEntityType.WORK_ORDER]: 'blue',
  [SearchEntityType.MATERIAL_DEFINITION]: 'green',
  [SearchEntityType.MATERIAL_LOT]: 'cyan',
  [SearchEntityType.EQUIPMENT]: 'orange',
  [SearchEntityType.PERSONNEL]: 'purple',
  [SearchEntityType.PRODUCT]: 'magenta',
  [SearchEntityType.QUALITY_RECORD]: 'gold',
  [SearchEntityType.PROCESS_SEGMENT]: 'lime',
  [SearchEntityType.SITE]: 'geekblue',
  [SearchEntityType.AREA]: 'volcano',
  [SearchEntityType.WORK_CENTER]: 'red',
};

export const SEARCH_SCOPE_LABELS: Record<SearchScope, string> = {
  [SearchScope.ALL]: 'All',
  [SearchScope.PRODUCTION]: 'Production',
  [SearchScope.MATERIALS]: 'Materials',
  [SearchScope.EQUIPMENT]: 'Equipment',
  [SearchScope.QUALITY]: 'Quality',
  [SearchScope.ORGANIZATION]: 'Organization',
};

export const SEARCH_SCOPE_DESCRIPTIONS: Record<SearchScope, string> = {
  [SearchScope.ALL]: 'Search across all entities',
  [SearchScope.PRODUCTION]: 'Work orders, products, and process segments',
  [SearchScope.MATERIALS]: 'Material definitions and lots',
  [SearchScope.EQUIPMENT]: 'Equipment only',
  [SearchScope.QUALITY]: 'Quality records',
  [SearchScope.ORGANIZATION]: 'Sites, areas, work centers, and personnel',
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getEntityTypeIcon(entityType: SearchEntityType): string {
  return SEARCH_ENTITY_TYPE_ICONS[entityType] || 'file';
}

export function getEntityTypeLabel(entityType: SearchEntityType): string {
  return SEARCH_ENTITY_TYPE_LABELS[entityType] || entityType;
}

export function getEntityTypeColor(entityType: SearchEntityType): string {
  return SEARCH_ENTITY_TYPE_COLORS[entityType] || 'default';
}

export function getScopeLabel(scope: SearchScope): string {
  return SEARCH_SCOPE_LABELS[scope] || scope;
}

export function getScopeDescription(scope: SearchScope): string {
  return SEARCH_SCOPE_DESCRIPTIONS[scope] || '';
}

export function groupResultsByType(results: SearchResult[]): SearchResultGroup[] {
  const groups: Record<SearchEntityType, SearchResult[]> = {} as any;

  results.forEach((result) => {
    if (!groups[result.entityType]) {
      groups[result.entityType] = [];
    }
    groups[result.entityType].push(result);
  });

  return Object.entries(groups).map(([entityType, results]) => ({
    entityType: entityType as SearchEntityType,
    count: results.length,
    results,
    expanded: true,
  }));
}

export function formatSearchExecutionTime(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  return `${(ms / 1000).toFixed(2)}s`;
}

export function highlightText(text: string, query: string): string {
  if (!query) return text;

  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}
