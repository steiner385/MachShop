/**
 * Global Search Service
 * Provides cross-entity search functionality across the MES system
 * Phase 3: Global search implementation
 */

import { PrismaClient } from '@prisma/client';
import {
  GlobalSearchRequest,
  GlobalSearchResponse,
  SearchResult,
  SearchEntityType,
  SearchScope,
  DEFAULT_SEARCH_CONFIG,
  DEFAULT_SEARCH_WEIGHTS,
  WorkOrderSearchMetadata,
  MaterialDefinitionSearchMetadata,
  MaterialLotSearchMetadata,
  EquipmentSearchMetadata,
  PersonnelSearchMetadata,
  ProductSearchMetadata,
} from '../types/search';

const prisma = new PrismaClient();

export class GlobalSearchService {
  /**
   * Perform global search across all entity types
   */
  static async search(request: GlobalSearchRequest): Promise<GlobalSearchResponse> {
    const startTime = Date.now();
    const {
      query,
      scope = SearchScope.ALL,
      entityTypes,
      limit = DEFAULT_SEARCH_CONFIG.maxResultsPerType,
      includeInactive = false,
      siteId,
      areaId,
    } = request;

    // Validate query
    if (!query || query.trim().length < DEFAULT_SEARCH_CONFIG.minQueryLength) {
      return {
        query,
        totalResults: 0,
        resultsByType: {} as any,
        results: [],
        executionTimeMs: Date.now() - startTime,
      };
    }

    const searchTerm = query.trim().toLowerCase();
    const results: SearchResult[] = [];
    const resultsByType: Record<SearchEntityType, number> = {} as any;

    // Determine which entity types to search
    const typesToSearch = entityTypes || this.getEntityTypesForScope(scope);

    // Search each entity type in parallel
    const searchPromises = typesToSearch.map(async (entityType) => {
      const entityResults = await this.searchEntityType(
        entityType,
        searchTerm,
        limit,
        includeInactive,
        siteId,
        areaId
      );
      return { entityType, results: entityResults };
    });

    const searchResults = await Promise.all(searchPromises);

    // Aggregate results
    searchResults.forEach(({ entityType, results: entityResults }) => {
      results.push(...entityResults);
      resultsByType[entityType] = entityResults.length;
    });

    // Sort all results by relevance score (descending)
    results.sort((a, b) => b.relevanceScore - a.relevanceScore);

    const executionTimeMs = Date.now() - startTime;

    return {
      query,
      totalResults: results.length,
      resultsByType,
      results,
      executionTimeMs,
    };
  }

  /**
   * Get entity types to search based on scope
   */
  private static getEntityTypesForScope(scope: SearchScope): SearchEntityType[] {
    switch (scope) {
      case SearchScope.PRODUCTION:
        return [
          SearchEntityType.WORK_ORDER,
          SearchEntityType.PRODUCT,
          SearchEntityType.PROCESS_SEGMENT,
        ];
      case SearchScope.MATERIALS:
        return [
          SearchEntityType.MATERIAL_DEFINITION,
          SearchEntityType.MATERIAL_LOT,
        ];
      case SearchScope.EQUIPMENT:
        return [SearchEntityType.EQUIPMENT];
      case SearchScope.QUALITY:
        return [SearchEntityType.QUALITY_RECORD];
      case SearchScope.ORGANIZATION:
        return [
          SearchEntityType.SITE,
          SearchEntityType.AREA,
          SearchEntityType.WORK_CENTER,
          SearchEntityType.PERSONNEL,
        ];
      case SearchScope.ALL:
      default:
        return Object.values(SearchEntityType);
    }
  }

  /**
   * Search a specific entity type
   */
  private static async searchEntityType(
    entityType: SearchEntityType,
    searchTerm: string,
    limit: number,
    includeInactive: boolean,
    siteId?: string,
    areaId?: string
  ): Promise<SearchResult[]> {
    switch (entityType) {
      case SearchEntityType.WORK_ORDER:
        return this.searchWorkOrders(searchTerm, limit, siteId, areaId);
      case SearchEntityType.MATERIAL_DEFINITION:
        return this.searchMaterialDefinitions(searchTerm, limit, includeInactive);
      case SearchEntityType.MATERIAL_LOT:
        return this.searchMaterialLots(searchTerm, limit);
      case SearchEntityType.EQUIPMENT:
        return this.searchEquipment(searchTerm, limit, includeInactive, siteId, areaId);
      case SearchEntityType.PERSONNEL:
        return this.searchPersonnel(searchTerm, limit, includeInactive);
      case SearchEntityType.PRODUCT:
        return this.searchProducts(searchTerm, limit, includeInactive);
      case SearchEntityType.PROCESS_SEGMENT:
        return this.searchProcessSegments(searchTerm, limit, includeInactive);
      case SearchEntityType.SITE:
        return this.searchSites(searchTerm, limit);
      case SearchEntityType.AREA:
        return this.searchAreas(searchTerm, limit, siteId);
      case SearchEntityType.WORK_CENTER:
        return this.searchWorkCenters(searchTerm, limit, areaId);
      default:
        return [];
    }
  }

  /**
   * Search work orders
   */
  private static async searchWorkOrders(
    searchTerm: string,
    limit: number,
    siteId?: string,
    areaId?: string
  ): Promise<SearchResult[]> {
    const workOrders = await prisma.workOrder.findMany({
      where: {
        AND: [
          {
            OR: [
              { workOrderNumber: { contains: searchTerm, mode: 'insensitive' } },
              { partNumber: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          siteId ? { siteId } : {},
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return workOrders.map((wo) => ({
      entityType: SearchEntityType.WORK_ORDER,
      id: wo.id,
      primaryText: wo.workOrderNumber,
      secondaryText: `${wo.partNumber || 'Unknown Part'}`,
      metadata: {
        workOrderNumber: wo.workOrderNumber,
        partNumber: wo.partNumber || '',
        status: wo.status,
        priority: wo.priority,
        dueDate: wo.dueDate?.toISOString(),
        quantityRequired: wo.quantity,
        quantityCompleted: wo.quantityCompleted,
        progress: wo.quantity > 0 ? (wo.quantityCompleted / wo.quantity) * 100 : 0,
      } as WorkOrderSearchMetadata,
      relevanceScore: this.calculateRelevanceScore(
        searchTerm,
        [wo.workOrderNumber, wo.partNumber || '']
      ),
      status: wo.status,
      url: `/workorders/${wo.id}`,
    }));
  }

  /**
   * Search material definitions
   */
  private static async searchMaterialDefinitions(
    searchTerm: string,
    limit: number,
    includeInactive: boolean
  ): Promise<SearchResult[]> {
    const materials = await prisma.materialDefinition.findMany({
      where: {
        AND: [
          {
            OR: [
              { materialNumber: { contains: searchTerm, mode: 'insensitive' } },
              { materialName: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          includeInactive ? {} : { isActive: true },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return materials.map((mat) => ({
      entityType: SearchEntityType.MATERIAL_DEFINITION,
      id: mat.id,
      primaryText: mat.materialNumber,
      secondaryText: mat.materialName,
      metadata: {
        materialNumber: mat.materialNumber,
        name: mat.materialName,
        materialType: mat.materialType,
        category: undefined,
        unitOfMeasure: mat.baseUnitOfMeasure,
        isActive: mat.isActive,
      } as MaterialDefinitionSearchMetadata,
      relevanceScore: this.calculateRelevanceScore(
        searchTerm,
        [mat.materialNumber, mat.materialName, mat.description || '']
      ),
      status: mat.isActive ? 'Active' : 'Inactive',
      url: `/materials/definitions/${mat.id}`,
    }));
  }

  /**
   * Search material lots
   */
  private static async searchMaterialLots(
    searchTerm: string,
    limit: number
  ): Promise<SearchResult[]> {
    const lots = await prisma.materialLot.findMany({
      where: {
        OR: [
          { lotNumber: { contains: searchTerm, mode: 'insensitive' } },
          { supplierLotNumber: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      include: {
        material: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return lots.map((lot) => ({
      entityType: SearchEntityType.MATERIAL_LOT,
      id: lot.id,
      primaryText: lot.lotNumber,
      secondaryText: lot.material?.materialName || 'Unknown Material',
      metadata: {
        lotNumber: lot.lotNumber,
        materialDefinitionId: lot.materialId,
        materialName: lot.material?.materialName || '',
        quantity: lot.currentQuantity,
        unitOfMeasure: lot.unitOfMeasure,
        expirationDate: lot.expirationDate?.toISOString(),
        status: lot.status,
      } as MaterialLotSearchMetadata,
      relevanceScore: this.calculateRelevanceScore(
        searchTerm,
        [lot.lotNumber, lot.supplierLotNumber || '', lot.material?.materialName || '']
      ),
      status: lot.status,
      url: `/materials/lots/${lot.id}`,
    }));
  }

  /**
   * Search equipment
   */
  private static async searchEquipment(
    searchTerm: string,
    limit: number,
    includeInactive: boolean,
    siteId?: string,
    areaId?: string
  ): Promise<SearchResult[]> {
    const equipment = await prisma.equipment.findMany({
      where: {
        AND: [
          {
            OR: [
              { equipmentNumber: { contains: searchTerm, mode: 'insensitive' } },
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          includeInactive ? {} : { isActive: true },
          siteId ? { siteId } : {},
          areaId ? { areaId } : {},
        ],
      },
      include: {
        site: true,
        area: true,
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return equipment.map((eq) => ({
      entityType: SearchEntityType.EQUIPMENT,
      id: eq.id,
      primaryText: eq.equipmentNumber,
      secondaryText: eq.name,
      metadata: {
        equipmentNumber: eq.equipmentNumber,
        name: eq.name,
        equipmentClass: eq.equipmentClass,
        status: eq.status,
        currentState: eq.currentState,
        oee: eq.oee || undefined,
        location: `${eq.site?.siteName || ''} - ${eq.area?.areaName || ''}`.trim(),
      } as EquipmentSearchMetadata,
      relevanceScore: this.calculateRelevanceScore(
        searchTerm,
        [eq.equipmentNumber, eq.name, eq.description || '']
      ),
      status: eq.status,
      url: `/equipment/${eq.id}`,
    }));
  }

  /**
   * Search personnel (User model)
   */
  private static async searchPersonnel(
    searchTerm: string,
    limit: number,
    includeInactive: boolean
  ): Promise<SearchResult[]> {
    const personnel = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: searchTerm, mode: 'insensitive' } },
              { firstName: { contains: searchTerm, mode: 'insensitive' } },
              { lastName: { contains: searchTerm, mode: 'insensitive' } },
              { email: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          includeInactive ? {} : { isActive: true },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return personnel.map((person) => ({
      entityType: SearchEntityType.PERSONNEL,
      id: person.id,
      primaryText: `${person.firstName || ''} ${person.lastName || ''}`.trim() || person.username,
      secondaryText: person.username,
      metadata: {
        personnelNumber: person.username,
        firstName: person.firstName || '',
        lastName: person.lastName || '',
        email: person.email || undefined,
        phoneNumber: undefined,
        jobTitle: undefined,
        department: undefined,
        isActive: person.isActive,
      } as PersonnelSearchMetadata,
      relevanceScore: this.calculateRelevanceScore(
        searchTerm,
        [person.username, person.firstName || '', person.lastName || '', person.email]
      ),
      status: person.isActive ? 'Active' : 'Inactive',
      url: `/personnel/${person.id}`,
    }));
  }

  /**
   * Search products (Part model)
   */
  private static async searchProducts(
    searchTerm: string,
    limit: number,
    includeInactive: boolean
  ): Promise<SearchResult[]> {
    const products = await prisma.part.findMany({
      where: {
        AND: [
          {
            OR: [
              { partNumber: { contains: searchTerm, mode: 'insensitive' } },
              { partName: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          includeInactive ? {} : { isActive: true },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return products.map((prod) => ({
      entityType: SearchEntityType.PRODUCT,
      id: prod.id,
      primaryText: prod.partNumber,
      secondaryText: prod.partName,
      metadata: {
        productNumber: prod.partNumber,
        name: prod.partName,
        productFamily: undefined,
        version: prod.revision || undefined,
        isActive: prod.isActive,
      } as ProductSearchMetadata,
      relevanceScore: this.calculateRelevanceScore(
        searchTerm,
        [prod.partNumber, prod.partName, prod.description || '']
      ),
      status: prod.isActive ? 'Active' : 'Inactive',
      url: `/products/${prod.id}`,
    }));
  }

  /**
   * Search process segments
   */
  private static async searchProcessSegments(
    searchTerm: string,
    limit: number,
    includeInactive: boolean
  ): Promise<SearchResult[]> {
    const segments = await prisma.operation.findMany({
      where: {
        AND: [
          {
            OR: [
              { segmentCode: { contains: searchTerm, mode: 'insensitive' } },
              { segmentName: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          includeInactive ? {} : { isActive: true },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return segments.map((seg) => ({
      entityType: SearchEntityType.PROCESS_SEGMENT,
      id: seg.id,
      primaryText: seg.segmentCode,
      secondaryText: seg.segmentName,
      metadata: {
        segmentNumber: seg.segmentCode,
        name: seg.segmentName,
        segmentType: seg.segmentType,
        duration: seg.duration || undefined,
        isActive: seg.isActive,
      },
      relevanceScore: this.calculateRelevanceScore(
        searchTerm,
        [seg.segmentCode, seg.segmentName, seg.description || '']
      ),
      status: seg.isActive ? 'Active' : 'Inactive',
      url: `/process-segments/${seg.id}`,
    }));
  }

  /**
   * Search sites
   */
  private static async searchSites(searchTerm: string, limit: number): Promise<SearchResult[]> {
    const sites = await prisma.site.findMany({
      where: {
        OR: [
          { siteCode: { contains: searchTerm, mode: 'insensitive' } },
          { siteName: { contains: searchTerm, mode: 'insensitive' } },
        ],
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return sites.map((site) => ({
      entityType: SearchEntityType.SITE,
      id: site.id,
      primaryText: site.siteCode,
      secondaryText: site.siteName,
      metadata: {},
      relevanceScore: this.calculateRelevanceScore(searchTerm, [site.siteCode, site.siteName]),
      url: `/organization/sites/${site.id}`,
    }));
  }

  /**
   * Search areas
   */
  private static async searchAreas(
    searchTerm: string,
    limit: number,
    siteId?: string
  ): Promise<SearchResult[]> {
    const areas = await prisma.area.findMany({
      where: {
        AND: [
          {
            OR: [
              { areaCode: { contains: searchTerm, mode: 'insensitive' } },
              { areaName: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          siteId ? { siteId } : {},
        ],
      },
      include: { site: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return areas.map((area) => ({
      entityType: SearchEntityType.AREA,
      id: area.id,
      primaryText: area.areaCode,
      secondaryText: `${area.areaName} (${area.site.siteName})`,
      metadata: {},
      relevanceScore: this.calculateRelevanceScore(searchTerm, [area.areaCode, area.areaName]),
      url: `/organization/areas/${area.id}`,
    }));
  }

  /**
   * Search work centers
   */
  private static async searchWorkCenters(
    searchTerm: string,
    limit: number,
    areaId?: string
  ): Promise<SearchResult[]> {
    const workCenters = await prisma.workCenter.findMany({
      where: {
        AND: [
          {
            OR: [
              { name: { contains: searchTerm, mode: 'insensitive' } },
              { description: { contains: searchTerm, mode: 'insensitive' } },
            ],
          },
          areaId ? { areaId } : {},
        ],
      },
      include: { area: true },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return workCenters.map((wc) => ({
      entityType: SearchEntityType.WORK_CENTER,
      id: wc.id,
      primaryText: wc.name,
      secondaryText: wc.area ? `${wc.area.areaName}` : '',
      metadata: {},
      relevanceScore: this.calculateRelevanceScore(searchTerm, [wc.name, wc.description || '']),
      url: `/organization/work-centers/${wc.id}`,
    }));
  }

  /**
   * Calculate relevance score for search results
   */
  private static calculateRelevanceScore(searchTerm: string, fields: string[]): number {
    const term = searchTerm.toLowerCase();
    let maxScore = 0;

    fields.forEach((field, index) => {
      const fieldValue = (field || '').toLowerCase();
      let score = 0;

      // Exact match
      if (fieldValue === term) {
        score = DEFAULT_SEARCH_WEIGHTS.exactMatch;
      }
      // Prefix match
      else if (fieldValue.startsWith(term)) {
        score = DEFAULT_SEARCH_WEIGHTS.prefixMatch;
      }
      // Contains match
      else if (fieldValue.includes(term)) {
        score = DEFAULT_SEARCH_WEIGHTS.containsMatch;
      }

      // Primary field (first field) gets higher weight
      if (index === 0) {
        score *= DEFAULT_SEARCH_WEIGHTS.primaryField;
      } else {
        score *= DEFAULT_SEARCH_WEIGHTS.secondaryField;
      }

      maxScore = Math.max(maxScore, score);
    });

    // Normalize to 0-1 range
    return Math.min(maxScore / DEFAULT_SEARCH_WEIGHTS.exactMatch, 1.0);
  }
}

export default GlobalSearchService;
