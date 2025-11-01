/**
 * Teamcenter PLM Connector
 * Issue #220 Phase 3: Siemens Teamcenter integration
 *
 * Integrates with Siemens Teamcenter PLM system for:
 * - CAD model management
 * - Engineering change management
 * - Lifecycle tracking
 * - Multi-site collaboration
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

export class TeamcenterConnector extends PLMConnectorBase {
  private authUrl: string;
  private searchUrl: string;
  private itemUrl: string;
  private fileUrl: string;

  constructor(
    baseUrl: string,
    apiVersion: string,
    credentials: PLMCredentials
  ) {
    super('Teamcenter', baseUrl, apiVersion, credentials);

    // Build Teamcenter API endpoints
    this.authUrl = `${this.baseUrl}/api/v${apiVersion}/authentication`;
    this.searchUrl = `${this.baseUrl}/api/v${apiVersion}/search`;
    this.itemUrl = `${this.baseUrl}/api/v${apiVersion}/item`;
    this.fileUrl = `${this.baseUrl}/api/v${apiVersion}/file`;
  }

  /**
   * Authenticate with Teamcenter
   */
  async authenticate(): Promise<void> {
    try {
      this.logOperation('authenticate', { system: 'Teamcenter' });

      const authPayload = {
        user: this.credentials.username,
        password: this.credentials.password,
        tenantId: this.credentials.tenantId || 'DEFAULT'
      };

      const response = await this.makeRequest('POST', '/authentication/login', authPayload);

      if (response.token) {
        this.sessionToken = response.token;
        this.headers['Authorization'] = `Bearer ${this.sessionToken}`;
        this.headers['X-TCSession'] = response.sessionId || '';

        logger.info('Teamcenter authentication successful', {
          user: this.credentials.username,
          tenant: this.credentials.tenantId
        });
      } else {
        throw new Error('Failed to obtain authentication token');
      }
    } catch (error) {
      logger.error('Teamcenter authentication failed:', error);
      throw error;
    }
  }

  /**
   * Search for items in Teamcenter
   */
  async searchItems(query: string, filters?: Record<string, any>): Promise<PLMItem[]> {
    try {
      this.logOperation('searchItems', { query, filters });

      const searchPayload = {
        searchString: query,
        searchType: 'FULL_TEXT',
        ...filters
      };

      const response = await this.makeRequest('POST', '/search/items', searchPayload);

      return (response.items || []).map((item: any) => ({
        id: item.uid,
        uuid: item.uuid,
        name: item.name,
        type: item.type,
        revision: item.revision,
        status: item.status,
        owner: item.ownerName,
        createdDate: item.createDate ? new Date(item.createDate) : undefined,
        modifiedDate: item.modDate ? new Date(item.modDate) : undefined,
        metadata: item.properties
      }));
    } catch (error) {
      logger.error('Teamcenter search failed:', error);
      return [];
    }
  }

  /**
   * Get item details from Teamcenter
   */
  async getItem(itemId: string): Promise<PLMItem> {
    try {
      this.logOperation('getItem', { itemId });

      const response = await this.makeRequest('GET', `/item/${itemId}`);

      return {
        id: response.uid,
        uuid: response.uuid,
        name: response.name,
        type: response.type,
        revision: response.revision,
        status: response.status,
        owner: response.ownerName,
        createdDate: response.createDate ? new Date(response.createDate) : undefined,
        modifiedDate: response.modDate ? new Date(response.modDate) : undefined,
        metadata: response.properties
      };
    } catch (error) {
      logger.error('Teamcenter getItem failed:', error);
      throw error;
    }
  }

  /**
   * Get files associated with item
   */
  async getItemFiles(itemId: string): Promise<PLMFile[]> {
    try {
      this.logOperation('getItemFiles', { itemId });

      const response = await this.makeRequest('GET', `/item/${itemId}/files`);

      return (response.files || []).map((file: any) => ({
        id: file.uid,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        checksum: file.checksum,
        downloadUrl: file.downloadUrl,
        uploadedDate: file.uploadDate ? new Date(file.uploadDate) : undefined,
        metadata: file.properties
      }));
    } catch (error) {
      logger.error('Teamcenter getItemFiles failed:', error);
      return [];
    }
  }

  /**
   * Download file from Teamcenter
   */
  async downloadFile(fileId: string, savePath: string): Promise<void> {
    try {
      this.logOperation('downloadFile', { fileId, savePath });

      const response = await fetch(`${this.fileUrl}/${fileId}/download`, {
        method: 'GET',
        headers: this.buildHeaders(),
        timeout: 60000 // 60 second timeout for file downloads
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.statusText}`);
      }

      const buffer = await response.arrayBuffer();
      await fs.writeFile(savePath, Buffer.from(buffer));

      logger.info('File downloaded from Teamcenter', {
        fileId,
        savePath,
        size: buffer.byteLength
      });
    } catch (error) {
      logger.error('Teamcenter file download failed:', error);
      throw error;
    }
  }

  /**
   * Upload file to Teamcenter
   */
  async uploadFile(itemId: string, filePath: string, metadata?: Record<string, any>): Promise<PLMFile> {
    try {
      this.logOperation('uploadFile', { itemId, filePath });

      const fileContent = await fs.readFile(filePath);
      const fileName = path.basename(filePath);

      // Teamcenter multipart upload
      const formData = new FormData();
      formData.append('file', new Blob([fileContent]), fileName);
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata));
      }

      const response = await fetch(`${this.itemUrl}/${itemId}/files/upload`, {
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

      logger.info('File uploaded to Teamcenter', {
        itemId,
        fileName,
        fileId: result.fileUid
      });

      return {
        id: result.fileUid,
        fileName,
        fileType: path.extname(fileName),
        fileSize: fileContent.length,
        uploadedDate: new Date(),
        metadata
      };
    } catch (error) {
      logger.error('Teamcenter file upload failed:', error);
      throw error;
    }
  }

  /**
   * Get item relationships in Teamcenter
   */
  async getItemRelationships(itemId: string): Promise<PLMRelationship[]> {
    try {
      this.logOperation('getItemRelationships', { itemId });

      const response = await this.makeRequest('GET', `/item/${itemId}/relationships`);

      return (response.relationships || []).map((rel: any) => ({
        sourceId: rel.sourceUid,
        targetId: rel.targetUid,
        relationshipType: rel.type,
        metadata: rel.properties
      }));
    } catch (error) {
      logger.error('Teamcenter getItemRelationships failed:', error);
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
        sourceUid: sourceId,
        targetUid: targetId,
        type: relationshipType,
        properties: metadata
      };

      const response = await this.makeRequest(
        'POST',
        `/item/${sourceId}/relationships`,
        payload
      );

      return {
        sourceId,
        targetId,
        relationshipType,
        metadata
      };
    } catch (error) {
      logger.error('Teamcenter createRelationship failed:', error);
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
      localData.tcItem = item;
      localData.tcFiles = files;
      localData.tcRelationships = relationships;
      localData.lastSyncDate = new Date();

      syncResult.success = true;
      this.lastSyncTime = new Date();

      logger.info('Teamcenter sync completed', {
        itemId,
        itemsSync: syncResult.itemsSync,
        filesSync: syncResult.filesSync,
        relationshipsSync: syncResult.relationshipsSync
      });
    } catch (error) {
      syncResult.errors.push(error instanceof Error ? error.message : String(error));
      logger.error('Teamcenter syncItem failed:', error);
    }

    syncResult.syncTime = Date.now() - startTime;
    return syncResult;
  }

  /**
   * Check Teamcenter connection health
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.makeRequest('GET', '/health');
      return response.status === 'OK' || response.healthy === true;
    } catch (error) {
      logger.warn('Teamcenter health check failed:', error);
      return false;
    }
  }

  /**
   * Disconnect from Teamcenter
   */
  async disconnect(): Promise<void> {
    try {
      if (this.sessionToken) {
        await this.makeRequest('POST', '/authentication/logout', {});
      }
      this.sessionToken = undefined;
      this.headers = {};
      logger.info('Disconnected from Teamcenter');
    } catch (error) {
      logger.warn('Teamcenter disconnect warning:', error);
      // Don't throw - clean up anyway
      this.sessionToken = undefined;
      this.headers = {};
    }
  }
}

export default TeamcenterConnector;
