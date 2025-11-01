/**
 * Aras Innovator PLM Connector
 * Issue #220 Phase 3: Aras Innovator integration
 *
 * Integrates with Aras Innovator PLM system for:
 * - Product data management
 * - Document management
 * - Lifecycle management
 * - Manufacturing collaboration
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

export class ArasConnector extends PLMConnectorBase {
  private arasUrl: string;
  private databaseId: string = 'InnovatorSolutions';

  constructor(
    baseUrl: string,
    apiVersion: string,
    credentials: PLMCredentials
  ) {
    super('Aras', baseUrl, apiVersion, credentials);
    this.arasUrl = `${this.baseUrl}/server/api/${apiVersion}`;
  }

  /**
   * Authenticate with Aras
   */
  async authenticate(): Promise<void> {
    try {
      this.logOperation('authenticate', { system: 'Aras' });

      if (!this.credentials.username || !this.credentials.password) {
        throw new Error('Aras requires username and password');
      }

      const authPayload = {
        username: this.credentials.username,
        password: this.credentials.password,
        database: this.credentials.tenantId || this.databaseId
      };

      const response = await this.makeRequest('POST', '/authentication/login', authPayload);

      if (response.sessionID || response.token) {
        this.sessionToken = response.sessionID || response.token;
        this.headers['Authorization'] = `Bearer ${this.sessionToken}`;
        this.headers['X-Aras-Database'] = this.credentials.tenantId || this.databaseId;

        logger.info('Aras authentication successful', {
          user: this.credentials.username,
          database: this.credentials.tenantId || this.databaseId
        });
      } else {
        throw new Error('Failed to obtain authentication token from Aras');
      }
    } catch (error) {
      logger.error('Aras authentication failed:', error);
      throw error;
    }
  }

  /**
   * Search for items in Aras
   */
  async searchItems(query: string, filters?: Record<string, any>): Promise<PLMItem[]> {
    try {
      this.logOperation('searchItems', { query, filters });

      const searchPayload = {
        itemType: filters?.type || 'Part',
        query: this.buildArasQuery(query, filters),
        pageSize: filters?.limit || 100,
        pageNum: filters?.offset ? Math.floor(filters.offset / 100) + 1 : 1
      };

      const response = await this.makeRequest('POST', '/items/search', searchPayload);

      return (response.items || response.result || []).map((item: any) => (
        {
          id: item.id || item.ID,
          uuid: item.uuid || item.id_uuid,
          name: item.name || item.NAME,
          type: item.type || item.TYPE,
          revision: item.revision || item.REVISION,
          status: item.status || item.STATE,
          owner: item.owner || item.OWNER_ID,
          createdDate: item.createdDate ? new Date(item.createdDate) : undefined,
          modifiedDate: item.modifiedDate ? new Date(item.modifiedDate) : undefined,
          metadata: item.properties || item.attributes || item
        }
      ));
    } catch (error) {
      logger.error('Aras search failed:', error);
      return [];
    }
  }

  /**
   * Get item details from Aras
   */
  async getItem(itemId: string): Promise<PLMItem> {
    try {
      this.logOperation('getItem', { itemId });

      const response = await this.makeRequest('GET', `/items/Part/${itemId}`);

      const item = response.item || response.result || response;

      return {
        id: item.id || item.ID,
        uuid: item.uuid || item.id_uuid,
        name: item.name || item.NAME,
        type: item.type || item.TYPE,
        revision: item.revision || item.REVISION,
        status: item.status || item.STATE,
        owner: item.owner || item.OWNER_ID,
        createdDate: item.createdDate ? new Date(item.createdDate) : undefined,
        modifiedDate: item.modifiedDate ? new Date(item.modifiedDate) : undefined,
        metadata: item.properties || item.attributes || item
      };
    } catch (error) {
      logger.error('Aras getItem failed:', error);
      throw error;
    }
  }

  /**
   * Get files associated with item
   */
  async getItemFiles(itemId: string): Promise<PLMFile[]> {
    try {
      this.logOperation('getItemFiles', { itemId });

      const response = await this.makeRequest('GET', `/items/Part/${itemId}/files`);

      const files = response.files || response.result || [];

      return files.map((file: any) => (
        {
          id: file.id || file.ID,
          fileName: file.fileName || file.filename,
          fileType: file.fileType || file.type || path.extname(file.fileName || file.filename),
          fileSize: file.fileSize || file.size,
          checksum: file.checksum || file.hash,
          downloadUrl: file.downloadUrl || file.url,
          uploadedDate: file.createdDate ? new Date(file.createdDate) : undefined,
          metadata: file.metadata || file.properties || file
        }
      ));
    } catch (error) {
      logger.error('Aras getItemFiles failed:', error);
      return [];
    }
  }

  /**
   * Download file from Aras
   */
  async downloadFile(fileId: string, savePath: string): Promise<void> {
    try {
      this.logOperation('downloadFile', { fileId, savePath });

      const response = await fetch(`${this.arasUrl}/files/${fileId}/download`, {
        method: 'GET',
        headers: this.buildHeaders(),
        timeout: 60000
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(savePath, Buffer.from(buffer));

      logger.info('File downloaded from Aras', {
        fileId,
        savePath,
        size: buffer.byteLength
      });
    } catch (error) {
      logger.error('Aras file download failed:', error);
      throw error;
    }
  }

  /**
   * Upload file to Aras
   */
  async uploadFile(itemId: string, filePath: string, metadata?: Record<string, any>): Promise<PLMFile> {
    try {
      this.logOperation('uploadFile', { itemId, filePath });

      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      const formData = new FormData();
      formData.append('file', new Blob([fileContent]), fileName);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await fetch(`${this.arasUrl}/items/Part/${itemId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': this.headers['Authorization'] || '',
          'X-Aras-Database': this.headers['X-Aras-Database'] || ''
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info('File uploaded to Aras', {
        itemId,
        fileName,
        fileId: result.id
      });

      return {
        id: result.id,
        fileName,
        fileType: path.extname(fileName),
        fileSize: fileContent.length,
        uploadedDate: new Date(),
        metadata
      };
    } catch (error) {
      logger.error('Aras file upload failed:', error);
      throw error;
    }
  }

  /**
   * Get item relationships in Aras
   */
  async getItemRelationships(itemId: string): Promise<PLMRelationship[]> {
    try {
      this.logOperation('getItemRelationships', { itemId });

      const response = await this.makeRequest('GET', `/items/Part/${itemId}/relationships`);

      const relationships = response.relationships || response.result || [];

      return relationships.map((rel: any) => (
        {
          sourceId: rel.sourceId || rel.source_id || rel.RELATED_ID,
          targetId: rel.targetId || rel.target_id || rel.ID,
          relationshipType: rel.relationshipType || rel.type || rel.RELATIONSHIP_ID,
          metadata: rel.metadata || rel.properties || rel
        }
      ));
    } catch (error) {
      logger.error('Aras getItemRelationships failed:', error);
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
        sourceId,
        targetId,
        relationshipType,
        properties: metadata
      };

      await this.makeRequest('POST', `/items/Part/${sourceId}/relationships`, payload);

      return {
        sourceId,
        targetId,
        relationshipType,
        metadata
      };
    } catch (error) {
      logger.error('Aras createRelationship failed:', error);
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
      localData.arasItem = item;
      localData.arasFiles = files;
      localData.arasRelationships = relationships;
      localData.lastSyncDate = new Date();

      syncResult.success = true;
      this.lastSyncTime = new Date();

      logger.info('Aras sync completed', {
        itemId,
        itemsSync: syncResult.itemsSync,
        filesSync: syncResult.filesSync,
        relationshipsSync: syncResult.relationshipsSync
      });
    } catch (error) {
      syncResult.errors.push(error instanceof Error ? error.message : String(error));
      logger.error('Aras syncItem failed:', error);
    }

    syncResult.syncTime = Date.now() - startTime;
    return syncResult;
  }

  /**
   * Check Aras connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response.status === 'OK' || response.status === 'UP' || response.healthy === true;
    } catch (error) {
      logger.warn('Aras health check failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Aras
   */
  async disconnect(): Promise<void> {
    try {
      if (this.sessionToken) {
        await this.makeRequest('POST', '/authentication/logout', {});
      }
      this.sessionToken = undefined;
      this.headers = {};
      logger.info('Disconnected from Aras');
    } catch (error) {
      logger.warn('Aras disconnect warning:', error);
      this.sessionToken = undefined;
      this.headers = {};
    }
  }

  /**
   * Build Aras query string
   */
  private buildArasQuery(query: string, filters?: Record<string, any>): string {
    let q = `<Item type="${filters?.type || 'Part'}" action="get">`;

    // Add search criteria
    if (query) {
      q += `<name>${this.escapeXml(query)}</name>`;
    }

    if (filters) {
      if (filters.status) {
        q += `<state>${this.escapeXml(filters.status)}</state>`;
      }
      if (filters.owner) {
        q += `<owned_by_id>${this.escapeXml(filters.owner)}</owned_by_id>`;
      }
    }

    q += '</Item>';
    return q;
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}

export default ArasConnector;
