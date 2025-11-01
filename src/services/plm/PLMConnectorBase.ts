/**
 * PLM System Connector Base Class
 * Issue #220 Phase 3: Unified PLM integration framework
 *
 * Abstract base class for PLM system connectors
 * Supports: Teamcenter, Windchill, ENOVIA, Aras
 */

import { logger } from '../../logging/logger';

export interface PLMCredentials {
  username?: string;
  password?: string;
  apiKey?: string;
  oauthToken?: string;
  clientId?: string;
  clientSecret?: string;
  tenantId?: string;
}

export interface PLMItem {
  id: string;
  uuid?: string;
  name: string;
  type: string;
  revision?: string;
  status?: string;
  owner?: string;
  createdDate?: Date;
  modifiedDate?: Date;
  metadata?: Record<string, any>;
}

export interface PLMFile {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  checksum?: string;
  downloadUrl?: string;
  uploadedDate?: Date;
  metadata?: Record<string, any>;
}

export interface PLMRelationship {
  sourceId: string;
  targetId: string;
  relationshipType: string;
  metadata?: Record<string, any>;
}

export interface PLMSyncResult {
  success: boolean;
  itemsSync: number;
  filesSync: number;
  relationshipsSync: number;
  errors: string[];
  warnings: string[];
  syncTime: number;
}

export abstract class PLMConnectorBase {
  protected systemName: string;
  protected baseUrl: string;
  protected apiVersion: string;
  protected credentials: PLMCredentials;
  protected sessionToken?: string;
  protected headers: Record<string, string> = {};
  protected lastSyncTime?: Date;
  protected timeout = 30000; // 30 second timeout

  constructor(
    systemName: string,
    baseUrl: string,
    apiVersion: string,
    credentials: PLMCredentials
  ) {
    this.systemName = systemName;
    this.baseUrl = baseUrl;
    this.apiVersion = apiVersion;
    this.credentials = credentials;
  }

  /**
   * Authenticate with PLM system
   */
  abstract authenticate(): Promise<void>;

  /**
   * Search for items in PLM
   */
  abstract searchItems(query: string, filters?: Record<string, any>): Promise<PLMItem[]>;

  /**
   * Get item details
   */
  abstract getItem(itemId: string): Promise<PLMItem>;

  /**
   * Get item files
   */
  abstract getItemFiles(itemId: string): Promise<PLMFile[]>;

  /**
   * Download file from PLM
   */
  abstract downloadFile(fileId: string, savePath: string): Promise<void>;

  /**
   * Upload file to PLM
   */
  abstract uploadFile(itemId: string, filePath: string, metadata?: Record<string, any>): Promise<PLMFile>;

  /**
   * Get item relationships
   */
  abstract getItemRelationships(itemId: string): Promise<PLMRelationship[]>;

  /**
   * Create item relationship
   */
  abstract createRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    metadata?: Record<string, any>
  ): Promise<PLMRelationship>;

  /**
   * Synchronize item to local system
   */
  abstract syncItem(itemId: string, localData: Record<string, any>): Promise<PLMSyncResult>;

  /**
   * Check connection health
   */
  abstract healthCheck(): Promise<boolean>;

  /**
   * Disconnect from PLM system
   */
  abstract disconnect(): Promise<void>;

  /**
   * Build headers for API requests
   */
  protected buildHeaders(customHeaders?: Record<string, string>): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'User-Agent': `MachShop/${this.apiVersion}`,
      ...this.headers,
      ...customHeaders
    };
  }

  /**
   * Make HTTP request with error handling
   */
  protected async makeRequest(
    method: string,
    endpoint: string,
    body?: any,
    customHeaders?: Record<string, string>
  ): Promise<any> {
    const url = `${this.baseUrl}${endpoint}`;
    const options: any = {
      method,
      headers: this.buildHeaders(customHeaders),
      timeout: this.timeout
    };

    if (body) {
      options.body = JSON.stringify(body);
    }

    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`${this.systemName} API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      logger.error(`PLM request failed to ${this.systemName}:`, error);
      throw error;
    }
  }

  /**
   * Format timestamp for PLM system
   */
  protected formatTimestamp(date: Date): string {
    return date.toISOString();
  }

  /**
   * Parse timestamp from PLM system
   */
  protected parseTimestamp(timestamp: string): Date {
    return new Date(timestamp);
  }

  /**
   * Log operation
   */
  protected logOperation(operation: string, details: Record<string, any>): void {
    logger.info(`[${this.systemName}] ${operation}`, details);
  }
}

export default PLMConnectorBase;
