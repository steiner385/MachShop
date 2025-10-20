/**
 * Global Search Routes
 * RESTful API endpoints for global search functionality
 * Phase 3: Global search implementation
 */

import { Router, Request, Response } from 'express';
import GlobalSearchService from '../services/GlobalSearchService';
import { GlobalSearchRequest, SearchScope, SearchEntityType } from '../types/search';
import authMiddleware from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/v1/search
 * @desc Perform global search across all entities
 * @access Private
 * @query q - Search query string (required)
 * @query scope - Search scope filter (optional)
 * @query entityTypes - Comma-separated entity types (optional)
 * @query limit - Maximum results per entity type (optional, default: 10)
 * @query includeInactive - Include inactive entities (optional, default: false)
 * @query siteId - Filter by site ID (optional)
 * @query areaId - Filter by area ID (optional)
 */
router.get(
  '/',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const {
        q: query,
        scope,
        entityTypes,
        limit,
        includeInactive,
        siteId,
        areaId,
      } = req.query;

      // Validate query
      if (!query || typeof query !== 'string' || query.trim().length < 2) {
        return res.status(400).json({
          error: 'Search query must be at least 2 characters',
        });
      }

      // Parse entity types if provided
      let parsedEntityTypes: SearchEntityType[] | undefined;
      if (entityTypes && typeof entityTypes === 'string') {
        parsedEntityTypes = entityTypes
          .split(',')
          .map((type) => type.trim())
          .filter((type) => Object.values(SearchEntityType).includes(type as SearchEntityType)) as SearchEntityType[];
      }

      const searchRequest: GlobalSearchRequest = {
        query: query.trim(),
        scope: scope as SearchScope | undefined,
        entityTypes: parsedEntityTypes,
        limit: limit ? parseInt(limit as string, 10) : undefined,
        includeInactive: includeInactive === 'true',
        siteId: siteId as string | undefined,
        areaId: areaId as string | undefined,
      };

      const searchResponse = await GlobalSearchService.search(searchRequest);

      return res.status(200).json(searchResponse);
    } catch (error: any) {
      console.error('Global search error:', error);
      return res.status(500).json({
        error: 'Failed to perform search',
        message: error.message,
      });
    }
  }
);

/**
 * @route GET /api/v1/search/suggestions
 * @desc Get search suggestions/autocomplete
 * @access Private
 * @query q - Partial search query (required)
 * @query limit - Maximum suggestions (optional, default: 5)
 */
router.get(
  '/suggestions',
  authMiddleware,
  async (req: Request, res: Response) => {
    try {
      const { q: query, limit = 5 } = req.query;

      // Validate query
      if (!query || typeof query !== 'string' || query.trim().length < 1) {
        return res.status(400).json({
          error: 'Query must be at least 1 character',
        });
      }

      // Validate limit
      const parsedLimit = parseInt(limit as string, 10);
      if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 20) {
        return res.status(400).json({
          error: 'Limit must be between 1 and 20',
        });
      }

      // Perform a quick search with minimal results
      const searchRequest: GlobalSearchRequest = {
        query: query as string,
        limit: 3, // Get top 3 results from each type for suggestions
      };

      const searchResponse = await GlobalSearchService.search(searchRequest);

      // Extract unique suggestions from results
      const suggestions = searchResponse.results
        .slice(0, parsedLimit)
        .map((result) => ({
          text: result.primaryText,
          entityType: result.entityType,
        }));

      return res.status(200).json({
        query,
        suggestions,
      });
    } catch (error: any) {
      console.error('Search suggestions error:', error);
      return res.status(500).json({
        error: 'Failed to get search suggestions',
        message: error.message,
      });
    }
  }
);

/**
 * @route GET /api/v1/search/scopes
 * @desc Get available search scopes
 * @access Private
 */
router.get('/scopes', authMiddleware, async (req: Request, res: Response) => {
  try {
    const scopes = Object.values(SearchScope).map((scope) => ({
      value: scope,
      label: scope
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' '),
    }));

    return res.status(200).json({ scopes });
  } catch (error: any) {
    console.error('Get search scopes error:', error);
    return res.status(500).json({
      error: 'Failed to get search scopes',
      message: error.message,
    });
  }
});

/**
 * @route GET /api/v1/search/entity-types
 * @desc Get available entity types for search
 * @access Private
 */
router.get('/entity-types', authMiddleware, async (req: Request, res: Response) => {
  try {
    const entityTypes = Object.values(SearchEntityType).map((type) => ({
      value: type,
      label: type
        .split('_')
        .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
        .join(' '),
    }));

    return res.status(200).json({ entityTypes });
  } catch (error: any) {
    console.error('Get entity types error:', error);
    return res.status(500).json({
      error: 'Failed to get entity types',
      message: error.message,
    });
  }
});

export default router;
