/**
 * Database Connection Service
 * Issue #34: Database Direct Import/ETL Engine
 *
 * Manages connections to external legacy database systems (SQL Server, Oracle, MySQL, PostgreSQL)
 * Supports connection pooling, schema discovery, and query execution
 */

import { logger } from '../../../logging/logger';
import * as sql from 'mssql';
import * as mysql from 'mysql2/promise';
import { Pool as PgPool, Client as PgClient } from 'pg';

export interface DatabaseConfig {
  id?: string;
  name: string;
  type: 'sqlserver' | 'oracle' | 'mysql' | 'postgresql' | 'mariadb';
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl?: boolean;
  connectionTimeout?: number;
}

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  duration: number;
  dataSource?: string;
  databaseVersion?: string;
  error?: string;
}

export interface SchemaDiscovery {
  tables: TableInfo[];
  views: ViewInfo[];
}

export interface TableInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  primaryKey: string[];
  foreignKeys: ForeignKeyInfo[];
  rowCount: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ViewInfo {
  name: string;
  schema: string;
  columns: ColumnInfo[];
  definition?: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  maxLength?: number;
  precision?: number;
  scale?: number;
  defaultValue?: any;
  isIdentity?: boolean;
  isPrimaryKey?: boolean;
}

export interface ForeignKeyInfo {
  name: string;
  columnName: string;
  referencedTable: string;
  referencedColumn: string;
}

export interface QueryResult {
  rows: any[];
  rowCount: number;
  columnCount: number;
  duration: number;
}

export interface StreamCallback {
  (row: any): Promise<void>;
}

export class DatabaseConnectionService {
  private connections: Map<string, any> = new Map();
  private pools: Map<string, any> = new Map();
  private configs: Map<string, DatabaseConfig> = new Map();

  /**
   * Test database connection
   */
  async testConnection(config: DatabaseConfig): Promise<ConnectionTestResult> {
    const startTime = Date.now();

    try {
      logger.info('Testing database connection', {
        type: config.type,
        host: config.host,
        database: config.database
      });

      let connection: any;
      let version = '';

      switch (config.type) {
        case 'sqlserver':
          connection = await this.createSQLServerConnection(config);
          const sqlResult = await connection.request().query('SELECT @@VERSION as version');
          version = sqlResult.recordset[0]?.version || 'Unknown';
          await connection.close();
          break;

        case 'mysql':
        case 'mariadb':
          connection = await mysql.createConnection({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database,
            waitForConnections: true,
            connectionLimit: 1,
            queueLimit: 0
          });
          const mysqlResult = await connection.query('SELECT VERSION() as version');
          version = mysqlResult[0]?.[0]?.version || 'Unknown';
          await connection.end();
          break;

        case 'postgresql':
          connection = new PgClient({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database
          });
          await connection.connect();
          const pgResult = await connection.query('SELECT version() as version');
          version = pgResult.rows[0]?.version || 'Unknown';
          await connection.end();
          break;

        case 'oracle':
          // Oracle connection test (requires oracledb setup)
          logger.warn('Oracle connection testing requires additional configuration');
          return {
            success: false,
            message: 'Oracle connection testing not fully implemented',
            duration: Date.now() - startTime,
            error: 'Requires Oracle Instant Client installation'
          };

        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }

      const duration = Date.now() - startTime;

      logger.info('Database connection test successful', {
        type: config.type,
        duration,
        version
      });

      return {
        success: true,
        message: `Successfully connected to ${config.type} database`,
        duration,
        databaseVersion: version
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMsg = error instanceof Error ? error.message : String(error);

      logger.error('Database connection test failed:', {
        type: config.type,
        error: errorMsg,
        duration
      });

      return {
        success: false,
        message: `Failed to connect to ${config.type} database`,
        duration,
        error: errorMsg
      };
    }
  }

  /**
   * Create connection pool
   */
  async createConnection(config: DatabaseConfig): Promise<string> {
    const connectionId = `${config.type}:${config.host}:${config.database}`;

    try {
      logger.info('Creating database connection', { connectionId });

      let pool: any;

      switch (config.type) {
        case 'sqlserver':
          pool = new sql.ConnectionPool({
            server: config.host,
            port: config.port,
            database: config.database,
            authentication: {
              type: 'default',
              options: {
                userName: config.username,
                password: config.password
              }
            },
            options: {
              encrypt: config.ssl || false,
              trustServerCertificate: true,
              connectionTimeout: config.connectionTimeout || 30000,
              requestTimeout: 30000
            }
          });
          await pool.connect();
          break;

        case 'mysql':
        case 'mariadb':
          pool = mysql.createPool({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
          });
          break;

        case 'postgresql':
          pool = new PgPool({
            host: config.host,
            port: config.port,
            user: config.username,
            password: config.password,
            database: config.database,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: config.connectionTimeout || 30000
          });
          // Test the pool
          const client = await pool.connect();
          client.release();
          break;

        default:
          throw new Error(`Unsupported database type: ${config.type}`);
      }

      this.pools.set(connectionId, pool);
      this.configs.set(connectionId, config);

      logger.info('Database connection created successfully', { connectionId });

      return connectionId;
    } catch (error) {
      logger.error('Failed to create database connection:', error);
      throw error;
    }
  }

  /**
   * Close connection
   */
  async closeConnection(connectionId: string): Promise<void> {
    try {
      const pool = this.pools.get(connectionId);
      if (!pool) {
        logger.warn('Connection not found', { connectionId });
        return;
      }

      if (pool instanceof sql.ConnectionPool) {
        await pool.close();
      } else if (pool instanceof PgPool) {
        await pool.end();
      } else if (typeof pool.end === 'function') {
        await pool.end();
      }

      this.pools.delete(connectionId);
      this.configs.delete(connectionId);

      logger.info('Database connection closed', { connectionId });
    } catch (error) {
      logger.error('Error closing database connection:', error);
      throw error;
    }
  }

  /**
   * Discover database schema
   */
  async discoverSchema(connectionId: string): Promise<SchemaDiscovery> {
    const pool = this.pools.get(connectionId);
    const config = this.configs.get(connectionId);

    if (!pool || !config) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    try {
      logger.info('Discovering database schema', { connectionId });

      let tables: TableInfo[] = [];
      let views: ViewInfo[] = [];

      switch (config.type) {
        case 'sqlserver':
          tables = await this.discoverSQLServerSchema(pool, config);
          views = await this.discoverSQLServerViews(pool, config);
          break;

        case 'mysql':
        case 'mariadb':
          tables = await this.discoverMySQLSchema(pool, config);
          views = await this.discoverMySQLViews(pool, config);
          break;

        case 'postgresql':
          tables = await this.discoverPostgreSQLSchema(pool, config);
          views = await this.discoverPostgreSQLViews(pool, config);
          break;

        default:
          throw new Error(`Schema discovery not supported for ${config.type}`);
      }

      logger.info('Schema discovery completed', {
        connectionId,
        tableCount: tables.length,
        viewCount: views.length
      });

      return { tables, views };
    } catch (error) {
      logger.error('Schema discovery failed:', error);
      throw error;
    }
  }

  /**
   * Execute query
   */
  async executeQuery(
    connectionId: string,
    query: string,
    params?: any[]
  ): Promise<QueryResult> {
    const pool = this.pools.get(connectionId);
    const config = this.configs.get(connectionId);

    if (!pool || !config) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    const startTime = Date.now();

    try {
      logger.info('Executing query', { connectionId, queryLength: query.length });

      let result: any;

      switch (config.type) {
        case 'sqlserver':
          const request = pool.request();
          if (params) {
            params.forEach((param, index) => {
              request.input(`param${index}`, param);
            });
          }
          result = await request.query(query);
          return {
            rows: result.recordset || [],
            rowCount: result.rowsAffected?.[0] || 0,
            columnCount: result.recordset?.length || 0,
            duration: Date.now() - startTime
          };

        case 'mysql':
        case 'mariadb':
          const connection = await pool.getConnection();
          const [rows] = await connection.query(query, params || []);
          connection.release();
          return {
            rows: Array.isArray(rows) ? rows : [],
            rowCount: Array.isArray(rows) ? rows.length : 0,
            columnCount: Array.isArray(rows) && rows.length > 0 ? Object.keys(rows[0]).length : 0,
            duration: Date.now() - startTime
          };

        case 'postgresql':
          const pgResult = await pool.query(query, params || []);
          return {
            rows: pgResult.rows,
            rowCount: pgResult.rowCount || 0,
            columnCount: pgResult.fields?.length || 0,
            duration: Date.now() - startTime
          };

        default:
          throw new Error(`Query execution not supported for ${config.type}`);
      }
    } catch (error) {
      logger.error('Query execution failed:', error);
      throw error;
    }
  }

  /**
   * Stream query results
   */
  async streamQuery(
    connectionId: string,
    query: string,
    callback: StreamCallback,
    batchSize: number = 1000
  ): Promise<void> {
    const pool = this.pools.get(connectionId);
    const config = this.configs.get(connectionId);

    if (!pool || !config) {
      throw new Error(`Connection not found: ${connectionId}`);
    }

    try {
      logger.info('Starting query stream', { connectionId, batchSize });

      let processedRows = 0;

      switch (config.type) {
        case 'sqlserver':
          // SQL Server streaming
          const stream = pool.request().stream(true);

          let batch: any[] = [];
          const processBatch = async () => {
            for (const row of batch) {
              await callback(row);
              processedRows++;
            }
            batch = [];
          };

          stream.on('row', async (row: any) => {
            batch.push(row);
            if (batch.length >= batchSize) {
              stream.pause();
              await processBatch();
              stream.resume();
            }
          });

          return new Promise((resolve, reject) => {
            stream.on('end', async () => {
              if (batch.length > 0) {
                await processBatch();
              }
              logger.info('Query stream completed', { processedRows });
              resolve();
            });

            stream.on('error', (error: Error) => {
              logger.error('Stream error:', error);
              reject(error);
            });
          });

        case 'mysql':
        case 'mariadb':
          const connection = await pool.getConnection();
          const [rows] = await connection.query(query);

          for (const row of rows as any[]) {
            await callback(row);
            processedRows++;
          }

          connection.release();
          logger.info('Query stream completed', { processedRows });
          break;

        case 'postgresql':
          const pgQuery = query.split('LIMIT')[0] + ` LIMIT ${batchSize} OFFSET 0`;
          let offset = 0;
          let hasMore = true;

          while (hasMore) {
            const pagedQuery = query.split('LIMIT')[0] + ` LIMIT ${batchSize} OFFSET ${offset}`;
            const result = await pool.query(pagedQuery);

            if (result.rows.length === 0) {
              hasMore = false;
              break;
            }

            for (const row of result.rows) {
              await callback(row);
              processedRows++;
            }

            offset += batchSize;
          }

          logger.info('Query stream completed', { processedRows });
          break;

        default:
          throw new Error(`Streaming not supported for ${config.type}`);
      }
    } catch (error) {
      logger.error('Stream failed:', error);
      throw error;
    }
  }

  /**
   * Private helper: Create SQL Server connection
   */
  private async createSQLServerConnection(config: DatabaseConfig): Promise<sql.ConnectionPool> {
    const pool = new sql.ConnectionPool({
      server: config.host,
      port: config.port,
      database: config.database,
      authentication: {
        type: 'default',
        options: {
          userName: config.username,
          password: config.password
        }
      },
      options: {
        encrypt: config.ssl || false,
        trustServerCertificate: true,
        connectionTimeout: config.connectionTimeout || 30000
      }
    });

    await pool.connect();
    return pool;
  }

  /**
   * Discover SQL Server schema
   */
  private async discoverSQLServerSchema(
    pool: sql.ConnectionPool,
    config: DatabaseConfig
  ): Promise<TableInfo[]> {
    const query = `
      SELECT
        t.TABLE_NAME,
        t.TABLE_SCHEMA,
        COUNT(*) as ColumnCount
      FROM INFORMATION_SCHEMA.TABLES t
      WHERE t.TABLE_TYPE = 'BASE TABLE'
      GROUP BY t.TABLE_NAME, t.TABLE_SCHEMA
    `;

    const result = await pool.request().query(query);
    const tables: TableInfo[] = [];

    for (const tableRow of result.recordset || []) {
      const columnQuery = `
        SELECT
          c.COLUMN_NAME,
          c.DATA_TYPE,
          c.IS_NULLABLE,
          c.CHARACTER_MAXIMUM_LENGTH,
          c.NUMERIC_PRECISION,
          c.NUMERIC_SCALE,
          c.COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS c
        WHERE c.TABLE_NAME = '${tableRow.TABLE_NAME}'
        AND c.TABLE_SCHEMA = '${tableRow.TABLE_SCHEMA}'
      `;

      const columnResult = await pool.request().query(columnQuery);

      const columns: ColumnInfo[] = (columnResult.recordset || []).map((col: any) => ({
        name: col.COLUMN_NAME,
        dataType: col.DATA_TYPE,
        nullable: col.IS_NULLABLE === 'YES',
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
        precision: col.NUMERIC_PRECISION,
        scale: col.NUMERIC_SCALE,
        defaultValue: col.COLUMN_DEFAULT
      }));

      tables.push({
        name: tableRow.TABLE_NAME,
        schema: tableRow.TABLE_SCHEMA,
        columns,
        primaryKey: [],
        foreignKeys: [],
        rowCount: 0
      });
    }

    return tables;
  }

  /**
   * Discover SQL Server views
   */
  private async discoverSQLServerViews(
    pool: sql.ConnectionPool,
    config: DatabaseConfig
  ): Promise<ViewInfo[]> {
    const query = `
      SELECT
        v.TABLE_NAME,
        v.TABLE_SCHEMA
      FROM INFORMATION_SCHEMA.VIEWS v
      WHERE v.TABLE_SCHEMA != 'sys'
    `;

    const result = await pool.request().query(query);
    return (result.recordset || []).map((view: any) => ({
      name: view.TABLE_NAME,
      schema: view.TABLE_SCHEMA,
      columns: []
    }));
  }

  /**
   * Discover MySQL schema
   */
  private async discoverMySQLSchema(
    pool: mysql.Pool,
    config: DatabaseConfig
  ): Promise<TableInfo[]> {
    const connection = await pool.getConnection();

    const query = `
      SELECT TABLE_NAME, TABLE_SCHEMA
      FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = '${config.database}'
      AND TABLE_TYPE = 'BASE TABLE'
    `;

    const [tableResults] = await connection.query(query);
    const tables: TableInfo[] = [];

    for (const tableRow of tableResults as any[]) {
      const columnQuery = `
        SELECT
          COLUMN_NAME,
          COLUMN_TYPE,
          IS_NULLABLE,
          CHARACTER_MAXIMUM_LENGTH,
          NUMERIC_PRECISION,
          NUMERIC_SCALE,
          COLUMN_DEFAULT
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = '${tableRow.TABLE_NAME}'
        AND TABLE_SCHEMA = '${tableRow.TABLE_SCHEMA}'
      `;

      const [columnResults] = await connection.query(columnQuery);

      const columns: ColumnInfo[] = (columnResults as any[]).map((col: any) => ({
        name: col.COLUMN_NAME,
        dataType: col.COLUMN_TYPE,
        nullable: col.IS_NULLABLE === 'YES',
        maxLength: col.CHARACTER_MAXIMUM_LENGTH,
        precision: col.NUMERIC_PRECISION,
        scale: col.NUMERIC_SCALE,
        defaultValue: col.COLUMN_DEFAULT
      }));

      tables.push({
        name: tableRow.TABLE_NAME,
        schema: tableRow.TABLE_SCHEMA,
        columns,
        primaryKey: [],
        foreignKeys: [],
        rowCount: 0
      });
    }

    connection.release();
    return tables;
  }

  /**
   * Discover MySQL views
   */
  private async discoverMySQLViews(
    pool: mysql.Pool,
    config: DatabaseConfig
  ): Promise<ViewInfo[]> {
    const connection = await pool.getConnection();

    const query = `
      SELECT TABLE_NAME, TABLE_SCHEMA
      FROM INFORMATION_SCHEMA.VIEWS
      WHERE TABLE_SCHEMA = '${config.database}'
    `;

    const [viewResults] = await connection.query(query);
    connection.release();

    return (viewResults as any[]).map((view: any) => ({
      name: view.TABLE_NAME,
      schema: view.TABLE_SCHEMA,
      columns: []
    }));
  }

  /**
   * Discover PostgreSQL schema
   */
  private async discoverPostgreSQLSchema(
    pool: PgPool,
    config: DatabaseConfig
  ): Promise<TableInfo[]> {
    const query = `
      SELECT table_name, table_schema
      FROM information_schema.tables
      WHERE table_schema != 'pg_catalog'
      AND table_schema != 'information_schema'
      AND table_type = 'BASE TABLE'
    `;

    const result = await pool.query(query);
    const tables: TableInfo[] = [];

    for (const tableRow of result.rows) {
      const columnQuery = `
        SELECT
          column_name,
          data_type,
          is_nullable,
          character_maximum_length,
          numeric_precision,
          numeric_scale,
          column_default
        FROM information_schema.columns
        WHERE table_name = $1
        AND table_schema = $2
      `;

      const columnResult = await pool.query(columnQuery, [tableRow.table_name, tableRow.table_schema]);

      const columns: ColumnInfo[] = columnResult.rows.map((col: any) => ({
        name: col.column_name,
        dataType: col.data_type,
        nullable: col.is_nullable === 'YES',
        maxLength: col.character_maximum_length,
        precision: col.numeric_precision,
        scale: col.numeric_scale,
        defaultValue: col.column_default
      }));

      tables.push({
        name: tableRow.table_name,
        schema: tableRow.table_schema,
        columns,
        primaryKey: [],
        foreignKeys: [],
        rowCount: 0
      });
    }

    return tables;
  }

  /**
   * Discover PostgreSQL views
   */
  private async discoverPostgreSQLViews(
    pool: PgPool,
    config: DatabaseConfig
  ): Promise<ViewInfo[]> {
    const query = `
      SELECT table_name, table_schema
      FROM information_schema.views
      WHERE table_schema != 'pg_catalog'
      AND table_schema != 'information_schema'
    `;

    const result = await pool.query(query);

    return result.rows.map((view: any) => ({
      name: view.table_name,
      schema: view.table_schema,
      columns: []
    }));
  }
}

export default DatabaseConnectionService;
