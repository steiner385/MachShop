/**
 * Global Search API Client
 * Frontend API client for global search functionality
 * Phase 3: Global search implementation
 */

import { apiClient, ApiResponse } from './client';
import {
  SearchResponse,
  SearchRequest,
  SearchSuggestion,
  SearchScope,
  SearchEntityType,
} from '@/types/search';

const BASE_URL = '/search';

/**
 * Perform global search
 */
export async function search(request: SearchRequest): Promise<ApiResponse<SearchResponse>> {
  try {
    // Build query parameters
    const params: Record<string, string> = {
      q: request.query,
    };

    if (request.scope) {
      params.scope = request.scope;
    }

    if (request.entityTypes && request.entityTypes.length > 0) {
      params.entityTypes = request.entityTypes.join(',');
    }

    if (request.limit) {
      params.limit = request.limit.toString();
    }

    if (request.includeInactive !== undefined) {
      params.includeInactive = request.includeInactive.toString();
    }

    if (request.siteId) {
      params.siteId = request.siteId;
    }

    if (request.areaId) {
      params.areaId = request.areaId;
    }

    const response = await apiClient.get<SearchResponse>(BASE_URL, { params });
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to perform search',
    };
  }
}

/**
 * Get search suggestions/autocomplete
 */
export async function getSearchSuggestions(
  query: string,
  limit: number = 5
): Promise<ApiResponse<{ query: string; suggestions: SearchSuggestion[] }>> {
  try {
    const response = await apiClient.get<{ query: string; suggestions: SearchSuggestion[] }>(
      `${BASE_URL}/suggestions`,
      {
        params: { q: query, limit },
      }
    );
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to get search suggestions',
    };
  }
}

/**
 * Get available search scopes
 */
export async function getSearchScopes(): Promise<
  ApiResponse<{ scopes: Array<{ value: SearchScope; label: string }> }>
> {
  try {
    const response = await apiClient.get<{
      scopes: Array<{ value: SearchScope; label: string }>;
    }>(`${BASE_URL}/scopes`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error: error.response?.data?.message || error.message || 'Failed to get search scopes',
    };
  }
}

/**
 * Get available entity types
 */
export async function getSearchEntityTypes(): Promise<
  ApiResponse<{ entityTypes: Array<{ value: SearchEntityType; label: string }> }>
> {
  try {
    const response = await apiClient.get<{
      entityTypes: Array<{ value: SearchEntityType; label: string }>;
    }>(`${BASE_URL}/entity-types`);
    return { success: true, data: response.data };
  } catch (error: any) {
    return {
      success: false,
      error:
        error.response?.data?.message || error.message || 'Failed to get search entity types',
    };
  }
}

/**
 * Quick search helper - performs search with default parameters
 */
export async function quickSearch(query: string): Promise<ApiResponse<SearchResponse>> {
  return search({
    query,
    scope: SearchScope.ALL,
    limit: 10,
  });
}

/**
 * Search within a specific scope
 */
export async function searchInScope(
  query: string,
  scope: SearchScope
): Promise<ApiResponse<SearchResponse>> {
  return search({
    query,
    scope,
    limit: 10,
  });
}

/**
 * Search for a specific entity type
 */
export async function searchEntityType(
  query: string,
  entityType: SearchEntityType
): Promise<ApiResponse<SearchResponse>> {
  return search({
    query,
    entityTypes: [entityType],
    limit: 20,
  });
}

// Named exports
export const searchAPI = {
  search,
  quickSearch,
  searchInScope,
  searchEntityType,
  getSearchSuggestions,
  getSearchScopes,
  getSearchEntityTypes,
};

export default searchAPI;
