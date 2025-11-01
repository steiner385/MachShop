/**
 * Windchill PLM Connector
 * Issue #220 Phase 3: PTC Windchill integration
 *
 * Integrates with PTC Windchill PLM system for:
 * - Product data management
 * - Document management
 * - Collaboration
 * - Lifecycle management
 */

import PLMConnectorBase, {
  PLMCredentials,
  PLMItem,
  PLMFile,
  PLMRelationship,
  PLMSyncResult
} from './PLMConnectorBase';
import { logger } from '../../logging/logger';
import { promises as fs } from 'fs';
import path from 'path';

export class WindchillConnector extends PLMConnectorBase {
  private restUrl: string;

  constructor(
    baseUrl: string,
    apiVersion: string,
    credentials: PLMCredentials
  ) {
    super('Windchill', baseUrl, apiVersion, credentials);
    this.restUrl = `${this.baseUrl}/Windchill/servlet/rest/${apiVersion}`;
  }

  /**
   * Authenticate with Windchill
   */
  async authenticate(): Promise<void> {
    try {
      this.logOperation('authenticate', { system: 'Windchill' });

      // Windchill uses HTTP Basic Auth or OAuth
      if (this.credentials.username && this.credentials.password) {
        const credentials = Buffer.from(
          `${this.credentials.username}:${this.credentials.password}`
        ).toString('base64');

        this.headers['Authorization'] = `Basic ${credentials}`;
      } else if (this.credentials.oauthToken) {
        this.headers['Authorization'] = `Bearer ${this.credentials.oauthToken}`;
      }

      // Verify authentication
      const response = await this.makeRequest('GET', '/me');

      if (response.name || response.username) {
        logger.info('Windchill authentication successful', {
          user: response.username || response.name
        });
      } else {
        throw new Error('Failed to authenticate with Windchill');
      }
    } catch (error) {
      logger.error('Windchill authentication failed:', error);
      throw error;
    }
  }

  /**
   * Search for items in Windchill
   */
  async searchItems(query: string, filters?: Record<string, any>): Promise<PLMItem[]> {
    try {
      this.logOperation('searchItems', { query, filters });

      // Windchill search query format
      const searchQuery = this.buildWindchillQuery(query, filters);

      const response = await this.makeRequest('GET', `/search`, {
        q: searchQuery,
        ...filters
      });

      return (response.results || []).map((item: any) => ({
        id: item.oid,
        uuid: item.uuid,
        name: item.name,
        type: item.type,
        revision: item.versionId,
        status: item.lifecycleState,
        owner: item.ownerName,
        createdDate: item.createTimestamp ? new Date(item.createTimestamp) : undefined,
        modifiedDate: item.modifyTimestamp ? new Date(item.modifyTimestamp) : undefined,
        metadata: item.attributes
      }));
    } catch (error) {
      logger.error('Windchill search failed:', error);
      return [];
    }
  }

  /**
   * Get item details from Windchill
   */
  async getItem(itemId: string): Promise<PLMItem> {
    try {
      this.logOperation('getItem', { itemId });

      const response = await this.makeRequest('GET', `/objects/${itemId}`);

      return {
        id: response.oid,
        uuid: response.uuid,
        name: response.name,
        type: response.type,
        revision: response.versionId,
        status: response.lifecycleState,
        owner: response.ownerName,
        createdDate: response.createTimestamp ? new Date(response.createTimestamp) : undefined,
        modifiedDate: response.modifyTimestamp ? new Date(response.modifyTimestamp) : undefined,
        metadata: response.attributes
      };
    } catch (error) {
      logger.error('Windchill getItem failed:', error);
      throw error;
    }
  }

  /**
   * Get files associated with item
   */
  async getItemFiles(itemId: string): Promise<PLMFile[]> {
    try {
      this.logOperation('getItemFiles', { itemId });

      const response = await this.makeRequest('GET', `/objects/${itemId}/attachments`);

      return (response.attachments || []).map((file: any) => ({
        id: file.oid,
        fileName: file.fileName,
        fileType: file.fileFormat || path.extname(file.fileName),
        fileSize: file.fileSize,
        checksum: file.contentHash,
        downloadUrl: file.downloadLink,
        uploadedDate: file.createTimestamp ? new Date(file.createTimestamp) : undefined,
        metadata: file.attributes
      }));
    } catch (error) {
      logger.error('Windchill getItemFiles failed:', error);
      return [];
    }
  }

  /**
   * Download file from Windchill
   */
  async downloadFile(fileId: string, savePath: string): Promise<void> {
    try {
      this.logOperation('downloadFile', { fileId, savePath });

      const response = await fetch(`${this.restUrl}/attachments/${fileId}/download`, {
        method: 'GET',
        headers: this.buildHeaders(),
        timeout: 60000
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(savePath, Buffer.from(buffer));

      logger.info('File downloaded from Windchill', {
        fileId,
        savePath,
        size: buffer.byteLength
      });
    } catch (error) {
      logger.error('Windchill file download failed:', error);
      throw error;
    }
  }

  /**
   * Upload file to Windchill
   */
  async uploadFile(itemId: string, filePath: string, metadata?: Record<string, any>): Promise<PLMFile> {
    try {
      this.logOperation('uploadFile', { itemId, filePath });

      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      const formData = new FormData();
      formData.append('file', new Blob([fileContent]), fileName);
      if (metadata) {
        formData.append('attributes', JSON.stringify(metadata));
      }

      const response = await fetch(`${this.restUrl}/objects/${itemId}/attachments`, {
        method: 'POST',
        headers: {
          'Authorization': this.headers['Authorization'] || ''
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info('File uploaded to Windchill', {
        itemId,
        fileName,
        fileId: result.oid
      });

      return {
        id: result.oid,
        fileName,
        fileType: path.extname(fileName),
        fileSize: fileContent.length,
        uploadedDate: new Date(),
        metadata
      };
    } catch (error) {
      logger.error('Windchill file upload failed:', error);
      throw error;
    }
  }

  /**
   * Get item relationships in Windchill
   */
  async getItemRelationships(itemId: string): Promise<PLMRelationship[]> {
    try {
      this.logOperation('getItemRelationships', { itemId });

      const response = await this.makeRequest('GET', `/objects/${itemId}/links`);

      return (response.links || []).map((rel: any) => ({
        sourceId: rel.sourceOid,
        targetId: rel.targetOid,
        relationshipType: rel.linkType,
        metadata: rel.attributes
      }));
    } catch (error) {
      logger.error('Windchill getItemRelationships failed:', error);
      return [];
    }
  }

  /**
   * Create relationship between items
   */
  async createRelationship(
    sourceId: string,
    targetId: string,
    relationshipType: string,
    metadata?: Record<string, any>
  ): Promise<PLMRelationship> {
    try {
      this.logOperation('createRelationship', {
        sourceId,
        targetId,
        relationshipType
      });

      const payload = {
        sourceOid: sourceId,
        targetOid: targetId,
        linkType: relationshipType,
        attributes: metadata
      };

      await this.makeRequest('POST', `/objects/${sourceId}/links`, payload);

      return {
        sourceId,
        targetId,
        relationshipType,
        metadata
      };
    } catch (error) {
      logger.error('Windchill createRelationship failed:', error);
      throw error;
    }
  }

  /**
   * Synchronize item with local system
   */
  async syncItem(itemId: string, localData: Record<string, any>): Promise<PLMSyncResult> {
    const syncResult: PLMSyncResult = {
      success: false,
      itemsSync: 0,
      filesSync: 0,
      relationshipsSync: 0,
      errors: [],
      warnings: [],
      syncTime: 0
    };

    const startTime = Date.now();

    try {
      this.logOperation('syncItem', { itemId });

      // Get item
      const item = await this.getItem(itemId);
      syncResult.itemsSync = 1;

      // Get files
      const files = await this.getItemFiles(itemId);
      syncResult.filesSync = files.length;

      // Get relationships
      const relationships = await this.getItemRelationships(itemId);
      syncResult.relationshipsSync = relationships.length;

      // Update local data
      localData.windchillItem = item;
      localData.windchillFiles = files;
      localData.windchillRelationships = relationships;
      localData.lastSyncDate = new Date();

      syncResult.success = true;
      this.lastSyncTime = new Date();

      logger.info('Windchill sync completed', {
        itemId,
        itemsSync: syncResult.itemsSync,
        filesSync: syncResult.filesSync,
        relationshipsSync: syncResult.relationshipsSync
      });
    } catch (error) {
      syncResult.errors.push(error instanceof Error ? error.message : String(error));
      logger.error('Windchill syncItem failed:', error);
    }

    syncResult.syncTime = Date.now() - startTime;
    return syncResult;
  }

  /**
   * Check Windchill connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response.status === 'UP' || response.healthy === true;
    } catch (error) {
      logger.warn('Windchill health check failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Windchill
   */
  async disconnect(): Promise<void> {
    try {
      // Windchill HTTP Basic Auth doesn't need explicit logout
      this.headers = {};
      logger.info('Disconnected from Windchill');
    } catch (error) {
      logger.warn('Windchill disconnect warning:', error);
      this.headers = {};
    }
  }

  /**
   * Build Windchill query string
   */
  private buildWindchillQuery(query: string, filters?: Record<string, any>): string {
    let q = `*${query}*`;

    if (filters) {
      if (filters.type) {
        q += ` AND type:${filters.type}`;
      }
      if (filters.status) {
        q += ` AND state:${filters.status}`;
      }
      if (filters.owner) {
        q += ` AND owner:${filters.owner}`;
      }
    }

    return q;
  }
}

export default WindchillConnector;
