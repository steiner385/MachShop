/**
 * Global Search Types
 * Phase 3: Global search functionality across all entities
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
  PRODUCTION = 'PRODUCTION',       // Work orders, products, process segments
  MATERIALS = 'MATERIALS',          // Material definitions, lots
  EQUIPMENT = 'EQUIPMENT',          // Equipment only
  QUALITY = 'QUALITY',              // Quality records
  ORGANIZATION = 'ORGANIZATION',    // Sites, areas, work centers, personnel
}

// ============================================
// INTERFACES
// ============================================

/**
 * Global search request parameters
 */
export interface GlobalSearchRequest {
  query: string;                           // Search query string
  scope?: SearchScope;                     // Optional scope filter
  entityTypes?: SearchEntityType[];        // Optional entity type filters
  limit?: number;                          // Maximum results per entity type (default: 10)
  offset?: number;                         // Pagination offset
  includeInactive?: boolean;               // Include inactive/archived entities
  siteId?: string;                         // Filter by site
  areaId?: string;                         // Filter by area
}

/**
 * Search result for a single entity
 */
export interface SearchResult {
  entityType: SearchEntityType;
  id: string;
  primaryText: string;                     // Main display text (e.g., work order number)
  secondaryText?: string;                  // Secondary display text (e.g., description)
  metadata: Record<string, any>;           // Entity-specific metadata
  relevanceScore: number;                  // 0-1 relevance score
  highlights?: SearchHighlight[];          // Text highlights
  status?: string;                         // Entity status
  url?: string;                            // Deep link URL
}

/**
 * Highlighted text segment in search results
 */
export interface SearchHighlight {
  field: string;                           // Field name that matched
  fragment: string;                        // Text fragment with match
  matchStart: number;                      // Match start position
  matchEnd: number;                        // Match end position
}

/**
 * Global search response
 */
export interface GlobalSearchResponse {
  query: string;
  totalResults: number;
  resultsByType: Record<SearchEntityType, number>;
  results: SearchResult[];
  executionTimeMs: number;
  suggestions?: string[];                  // Search suggestions/corrections
}

/**
 * Search autocomplete suggestion
 */
export interface SearchSuggestion {
  text: string;
  entityType?: SearchEntityType;
  count?: number;                          // Number of results for this suggestion
}

/**
 * Recent search history item
 */
export interface SearchHistoryItem {
  query: string;
  timestamp: Date;
  resultCount: number;
  scope?: SearchScope;
}

// ============================================
// SEARCH RESULT METADATA INTERFACES
// ============================================

export interface WorkOrderSearchMetadata {
  workOrderNumber: string;
  partNumber: string;
  status: string;
  priority: string;
  dueDate?: string;
  quantityRequired: number;
  quantityCompleted: number;
  progress: number;
}

export interface MaterialDefinitionSearchMetadata {
  materialNumber: string;
  name: string;
  materialType: string;
  category?: string;
  unitOfMeasure: string;
  isActive: boolean;
}

export interface MaterialLotSearchMetadata {
  lotNumber: string;
  materialDefinitionId: string;
  materialName: string;
  quantity: number;
  unitOfMeasure: string;
  expirationDate?: string;
  status: string;
}

export interface EquipmentSearchMetadata {
  equipmentNumber: string;
  name: string;
  equipmentClass: string;
  status: string;
  currentState: string;
  oee?: number;
  location?: string;
}

export interface PersonnelSearchMetadata {
  personnelNumber: string;
  firstName: string;
  lastName: string;
  email?: string;
  phoneNumber?: string;
  jobTitle?: string;
  department?: string;
  isActive: boolean;
}

export interface ProductSearchMetadata {
  productNumber: string;
  name: string;
  productFamily?: string;
  version?: string;
  isActive: boolean;
}

export interface QualityRecordSearchMetadata {
  recordNumber: string;
  recordType: string;
  workOrderNumber?: string;
  partNumber?: string;
  status: string;
  createdAt: string;
}

export interface ProcessSegmentSearchMetadata {
  segmentNumber: string;
  name: string;
  segmentType: string;
  duration?: number;
  isActive: boolean;
}

// ============================================
// UTILITY TYPES
// ============================================

export type SearchMetadata =
  | WorkOrderSearchMetadata
  | MaterialDefinitionSearchMetadata
  | MaterialLotSearchMetadata
  | EquipmentSearchMetadata
  | PersonnelSearchMetadata
  | ProductSearchMetadata
  | QualityRecordSearchMetadata
  | ProcessSegmentSearchMetadata;

// ============================================
// SEARCH CONFIGURATION
// ============================================

export interface SearchConfig {
  enableFuzzySearch: boolean;              // Enable fuzzy matching
  fuzzyThreshold: number;                  // 0-1, lower = more fuzzy
  maxResults: number;                      // Maximum total results
  maxResultsPerType: number;               // Maximum results per entity type
  enableHighlighting: boolean;             // Enable text highlighting
  enableSuggestions: boolean;              // Enable search suggestions
  minQueryLength: number;                  // Minimum query length
  searchHistorySize: number;               // Number of recent searches to store
}

export const DEFAULT_SEARCH_CONFIG: SearchConfig = {
  enableFuzzySearch: true,
  fuzzyThreshold: 0.6,
  maxResults: 100,
  maxResultsPerType: 10,
  enableHighlighting: true,
  enableSuggestions: true,
  minQueryLength: 2,
  searchHistorySize: 20,
};

// ============================================
// SEARCH WEIGHTS (for relevance scoring)
// ============================================

export interface SearchWeights {
  exactMatch: number;                      // Weight for exact matches
  prefixMatch: number;                     // Weight for prefix matches
  containsMatch: number;                   // Weight for substring matches
  fuzzyMatch: number;                      // Weight for fuzzy matches
  primaryField: number;                    // Multiplier for primary fields
  secondaryField: number;                  // Multiplier for secondary fields
  recentness: number;                      // Multiplier for recent entities
}

export const DEFAULT_SEARCH_WEIGHTS: SearchWeights = {
  exactMatch: 100,
  prefixMatch: 75,
  containsMatch: 50,
  fuzzyMatch: 25,
  primaryField: 2.0,
  secondaryField: 1.0,
  recentness: 1.2,
};
