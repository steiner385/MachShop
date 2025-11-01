/**
 * Oracle EBS Surrogate - Query Builder Utilities
 * Provides advanced filtering, sorting, pagination, and search capabilities
 */

export interface QueryFilter {
  field: string;
  operator: 'eq' | 'ne' | 'lt' | 'lte' | 'gt' | 'gte' | 'like' | 'in' | 'between';
  value: any;
}

export interface QueryOptions {
  filters?: QueryFilter[];
  sort?: { field: string; direction: 'ASC' | 'DESC' }[];
  pagination?: { page: number; pageSize: number };
  search?: { fields: string[]; query: string };
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class QueryBuilder {
  /**
   * Build SQL WHERE clause from filters
   */
  static buildWhereClause(
    filters: QueryFilter[],
    baseTable?: string
  ): { sql: string; params: any[] } {
    if (!filters || filters.length === 0) {
      return { sql: '', params: [] };
    }

    const conditions: string[] = [];
    const params: any[] = [];

    for (const filter of filters) {
      const field = baseTable ? `${baseTable}.${filter.field}` : filter.field;

      switch (filter.operator) {
        case 'eq':
          conditions.push(`${field} = ?`);
          params.push(filter.value);
          break;

        case 'ne':
          conditions.push(`${field} != ?`);
          params.push(filter.value);
          break;

        case 'lt':
          conditions.push(`${field} < ?`);
          params.push(filter.value);
          break;

        case 'lte':
          conditions.push(`${field} <= ?`);
          params.push(filter.value);
          break;

        case 'gt':
          conditions.push(`${field} > ?`);
          params.push(filter.value);
          break;

        case 'gte':
          conditions.push(`${field} >= ?`);
          params.push(filter.value);
          break;

        case 'like':
          conditions.push(`${field} LIKE ?`);
          params.push(`%${filter.value}%`);
          break;

        case 'in':
          const placeholders = Array(filter.value.length).fill('?').join(',');
          conditions.push(`${field} IN (${placeholders})`);
          params.push(...filter.value);
          break;

        case 'between':
          conditions.push(`${field} BETWEEN ? AND ?`);
          params.push(filter.value[0], filter.value[1]);
          break;
      }
    }

    const sql = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    return { sql, params };
  }

  /**
   * Build SQL ORDER BY clause
   */
  static buildOrderByClause(
    sort?: { field: string; direction: 'ASC' | 'DESC' }[],
    baseTable?: string
  ): string {
    if (!sort || sort.length === 0) {
      return '';
    }

    const orderClauses = sort.map(
      (s) => {
        const field = baseTable ? `${baseTable}.${s.field}` : s.field;
        return `${field} ${s.direction}`;
      }
    );

    return `ORDER BY ${orderClauses.join(', ')}`;
  }

  /**
   * Build SQL LIMIT clause for pagination
   */
  static buildLimitClause(pagination?: {
    page: number;
    pageSize: number;
  }): { sql: string; offset: number } {
    if (!pagination) {
      return { sql: '', offset: 0 };
    }

    const offset = (pagination.page - 1) * pagination.pageSize;
    const sql = `LIMIT ${pagination.pageSize} OFFSET ${offset}`;

    return { sql, offset };
  }

  /**
   * Build full SELECT query with all options
   */
  static buildSelectQuery(
    table: string,
    options: QueryOptions,
    selectFields: string = '*'
  ): { sql: string; params: any[] } {
    let sql = `SELECT ${selectFields} FROM ${table}`;
    const params: any[] = [];

    // Add WHERE clause
    if (options.filters) {
      const { sql: whereSQL, params: whereParams } = this.buildWhereClause(
        options.filters,
        table
      );
      if (whereSQL) {
        sql += ` ${whereSQL}`;
        params.push(...whereParams);
      }
    }

    // Add search clause
    if (options.search) {
      const searchConditions = options.search.fields.map(
        (field) => `${table}.${field} LIKE ?`
      ).join(' OR ');

      if (sql.includes('WHERE')) {
        sql += ` AND (${searchConditions})`;
      } else {
        sql += ` WHERE (${searchConditions})`;
      }

      for (let i = 0; i < options.search.fields.length; i++) {
        params.push(`%${options.search.query}%`);
      }
    }

    // Add ORDER BY clause
    const orderBy = this.buildOrderByClause(options.sort, table);
    if (orderBy) {
      sql += ` ${orderBy}`;
    }

    // Add LIMIT clause
    const { sql: limitSQL } = this.buildLimitClause(options.pagination);
    if (limitSQL) {
      sql += ` ${limitSQL}`;
    }

    return { sql, params };
  }

  /**
   * Build count query
   */
  static buildCountQuery(
    table: string,
    filters?: QueryFilter[]
  ): { sql: string; params: any[] } {
    let sql = `SELECT COUNT(*) as count FROM ${table}`;
    const params: any[] = [];

    if (filters) {
      const { sql: whereSQL, params: whereParams } = this.buildWhereClause(
        filters,
        table
      );
      if (whereSQL) {
        sql += ` ${whereSQL}`;
        params.push(...whereParams);
      }
    }

    return { sql, params };
  }

  /**
   * Validate filter parameters
   */
  static validateFilters(filters: QueryFilter[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const validOperators = ['eq', 'ne', 'lt', 'lte', 'gt', 'gte', 'like', 'in', 'between'];

    for (const filter of filters) {
      if (!filter.field) {
        errors.push('Filter field is required');
      }

      if (!validOperators.includes(filter.operator)) {
        errors.push(`Invalid operator: ${filter.operator}`);
      }

      if (filter.value === undefined || filter.value === null) {
        errors.push(`Value required for filter on ${filter.field}`);
      }

      if (filter.operator === 'between' && (!Array.isArray(filter.value) || filter.value.length !== 2)) {
        errors.push('Between operator requires array with 2 values');
      }

      if (filter.operator === 'in' && !Array.isArray(filter.value)) {
        errors.push('In operator requires array value');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Escape SQL wildcards in like queries
   */
  static escapeLike(value: string): string {
    return value.replace(/[%_]/g, '\\$&');
  }

  /**
   * Parse query parameters from request
   */
  static parseQueryParams(query: Record<string, any>): QueryOptions {
    const options: QueryOptions = {};

    // Parse filters
    if (query.filters) {
      try {
        const filtersData = typeof query.filters === 'string'
          ? JSON.parse(query.filters)
          : query.filters;

        if (Array.isArray(filtersData)) {
          options.filters = filtersData;
        }
      } catch (error) {
        console.warn('Failed to parse filters', error);
      }
    }

    // Parse sort
    if (query.sort) {
      try {
        const sortData = typeof query.sort === 'string'
          ? JSON.parse(query.sort)
          : query.sort;

        if (Array.isArray(sortData)) {
          options.sort = sortData;
        }
      } catch (error) {
        console.warn('Failed to parse sort', error);
      }
    }

    // Parse pagination
    if (query.page || query.pageSize) {
      options.pagination = {
        page: parseInt(query.page) || 1,
        pageSize: parseInt(query.pageSize) || 20
      };
    }

    // Parse search
    if (query.search && query.searchFields) {
      try {
        const fields = typeof query.searchFields === 'string'
          ? query.searchFields.split(',')
          : query.searchFields;

        options.search = {
          query: query.search,
          fields
        };
      } catch (error) {
        console.warn('Failed to parse search', error);
      }
    }

    return options;
  }
}

/**
 * Example usage in a route handler:
 *
 * const options = QueryBuilder.parseQueryParams(req.query);
 * const validation = QueryBuilder.validateFilters(options.filters || []);
 *
 * if (!validation.valid) {
 *   return res.status(400).json({ errors: validation.errors });
 * }
 *
 * const { sql, params } = QueryBuilder.buildSelectQuery('work_orders', options);
 * const results = await db.all(sql, params);
 *
 * const { sql: countSQL, params: countParams } = QueryBuilder.buildCountQuery('work_orders', options.filters);
 * const countResult = await db.get(countSQL, countParams);
 *
 * return res.json({
 *   data: results,
 *   pagination: {
 *     page: options.pagination?.page || 1,
 *     pageSize: options.pagination?.pageSize || 20,
 *     total: countResult.count,
 *     totalPages: Math.ceil(countResult.count / (options.pagination?.pageSize || 20))
 *   }
 * });
 */
