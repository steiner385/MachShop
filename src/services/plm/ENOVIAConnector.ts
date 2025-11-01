/**
 * ENOVIA PLM Connector
 * Issue #220 Phase 3: Dassault Systemes ENOVIA integration
 *
 * Integrates with Dassault Systemes ENOVIA for:
 * - Product data management
 * - Engineering collaboration
 * - Lifecycle management
 * - Configuration management
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

export class ENOVIAConnector extends PLMConnectorBase {
  private csrfToken?: string;
  private enoviaUrl: string;

  constructor(
    baseUrl: string,
    apiVersion: string,
    credentials: PLMCredentials
  ) {
    super('ENOVIA', baseUrl, apiVersion, credentials);
    this.enoviaUrl = `${this.baseUrl}/enovia/v1`;
  }

  /**
   * Authenticate with ENOVIA
   */
  async authenticate(): Promise<void> {
    try {
      this.logOperation('authenticate', { system: 'ENOVIA' });

      // ENOVIA uses OAuth 2.0
      if (!this.credentials.clientId || !this.credentials.clientSecret) {
        throw new Error('ENOVIA requires clientId and clientSecret');
      }

      const tokenPayload = {
        grant_type: 'client_credentials',
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        scope: 'openid profile email plm'
      };

      const response = await this.makeRequest('POST', '/oauth/token', tokenPayload);

      if (response.access_token) {
        this.sessionToken = response.access_token;
        this.headers['Authorization'] = `Bearer ${this.sessionToken}`;

        // Get CSRF token for write operations
        await this.getCSRFToken();

        logger.info('ENOVIA authentication successful', {
          clientId: this.credentials.clientId
        });
      } else {
        throw new Error('Failed to obtain OAuth token from ENOVIA');
      }
    } catch (error) {
      logger.error('ENOVIA authentication failed:', error);
      throw error;
    }
  }

  /**
   * Get CSRF token for write operations
   */
  private async getCSRFToken(): Promise<void> {
    try {
      const response = await this.makeRequest('GET', '/security/csrf');
      if (response.csrf_token) {
        this.csrfToken = response.csrf_token;
        this.headers['X-CSRF-Token'] = this.csrfToken;
      }
    } catch (error) {
      logger.warn('Failed to get ENOVIA CSRF token:', error);
    }
  }

  /**
   * Search for items in ENOVIA
   */
  async searchItems(query: string, filters?: Record<string, any>): Promise<PLMItem[]> {
    try {
      this.logOperation('searchItems', { query, filters });

      const searchPayload = {
        q: query,
        type: filters?.type || 'Part',
        limit: filters?.limit || 100,
        offset: filters?.offset || 0
      };

      const response = await this.makeRequest('POST', '/search', searchPayload);

      return (response.items || []).map((item: any) => ({
        id: item.id,
        uuid: item.uuid,
        name: item.name,
        type: item.type,
        revision: item.revision,
        status: item.state,
        owner: item.owner,
        createdDate: item.created ? new Date(item.created) : undefined,
        modifiedDate: item.modified ? new Date(item.modified) : undefined,
        metadata: item.attributes
      }));
    } catch (error) {
      logger.error('ENOVIA search failed:', error);
      return [];
    }
  }

  /**
   * Get item details from ENOVIA
   */
  async getItem(itemId: string): Promise<PLMItem> {
    try {
      this.logOperation('getItem', { itemId });

      const response = await this.makeRequest('GET', `/objects/${itemId}`);

      return {
        id: response.id,
        uuid: response.uuid,
        name: response.name,
        type: response.type,
        revision: response.revision,
        status: response.state,
        owner: response.owner,
        createdDate: response.created ? new Date(response.created) : undefined,
        modifiedDate: response.modified ? new Date(response.modified) : undefined,
        metadata: response.attributes
      };
    } catch (error) {
      logger.error('ENOVIA getItem failed:', error);
      throw error;
    }
  }

  /**
   * Get files associated with item
   */
  async getItemFiles(itemId: string): Promise<PLMFile[]> {
    try {
      this.logOperation('getItemFiles', { itemId });

      const response = await this.makeRequest('GET', `/objects/${itemId}/files`);

      return (response.files || []).map((file: any) => ({
        id: file.id,
        fileName: file.name,
        fileType: file.mimeType || path.extname(file.name),
        fileSize: file.size,
        checksum: file.hash,
        downloadUrl: file.downloadUrl,
        uploadedDate: file.created ? new Date(file.created) : undefined,
        metadata: file.metadata
      }));
    } catch (error) {
      logger.error('ENOVIA getItemFiles failed:', error);
      return [];
    }
  }

  /**
   * Download file from ENOVIA
   */
  async downloadFile(fileId: string, savePath: string): Promise<void> {
    try {
      this.logOperation('downloadFile', { fileId, savePath });

      const response = await fetch(`${this.enoviaUrl}/files/${fileId}/download`, {
        method: 'GET',
        headers: this.buildHeaders(),
        timeout: 60000
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(savePath, Buffer.from(buffer));

      logger.info('File downloaded from ENOVIA', {
        fileId,
        savePath,
        size: buffer.byteLength
      });
    } catch (error) {
      logger.error('ENOVIA file download failed:', error);
      throw error;
    }
  }

  /**
   * Upload file to ENOVIA
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

      const response = await fetch(`${this.enoviaUrl}/objects/${itemId}/files`, {
        method: 'POST',
        headers: {
          'Authorization': this.headers['Authorization'] || '',
          'X-CSRF-Token': this.csrfToken || ''
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      const result = await response.json();

      logger.info('File uploaded to ENOVIA', {
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
      logger.error('ENOVIA file upload failed:', error);
      throw error;
    }
  }

  /**
   * Get item relationships in ENOVIA
   */
  async getItemRelationships(itemId: string): Promise<PLMRelationship[]> {
    try {
      this.logOperation('getItemRelationships', { itemId });

      const response = await this.makeRequest('GET', `/objects/${itemId}/relationships`);

      return (response.relationships || []).map((rel: any) => ({
        sourceId: rel.source,
        targetId: rel.target,
        relationshipType: rel.type,
        metadata: rel.attributes
      }));
    } catch (error) {
      logger.error('ENOVIA getItemRelationships failed:', error);
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
        source: sourceId,
        target: targetId,
        type: relationshipType,
        attributes: metadata
      };

      await this.makeRequest('POST', `/objects/${sourceId}/relationships`, payload);

      return {
        sourceId,
        targetId,
        relationshipType,
        metadata
      };
    } catch (error) {
      logger.error('ENOVIA createRelationship failed:', error);
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
      localData.enoviaItem = item;
      localData.enoviaFiles = files;
      localData.enoviaRelationships = relationships;
      localData.lastSyncDate = new Date();

      syncResult.success = true;
      this.lastSyncTime = new Date();

      logger.info('ENOVIA sync completed', {
        itemId,
        itemsSync: syncResult.itemsSync,
        filesSync: syncResult.filesSync,
        relationshipsSync: syncResult.relationshipsSync
      });
    } catch (error) {
      syncResult.errors.push(error instanceof Error ? error.message : String(error));
      logger.error('ENOVIA syncItem failed:', error);
    }

    syncResult.syncTime = Date.now() - startTime;
    return syncResult;
  }

  /**
   * Check ENOVIA connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response.status === 'OK' || response.status === 'UP';
    } catch (error) {
      logger.warn('ENOVIA health check failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from ENOVIA
   */
  async disconnect(): Promise<void> {
    try {
      if (this.sessionToken) {
        await this.makeRequest('POST', '/oauth/revoke', {
          token: this.sessionToken
        });
      }
      this.sessionToken = undefined;
      this.csrfToken = undefined;
      this.headers = {};
      logger.info('Disconnected from ENOVIA');
    } catch (error) {
      logger.warn('ENOVIA disconnect warning:', error);
      this.sessionToken = undefined;
      this.headers = {};
    }
  }
}

export default ENOVIAConnector;
