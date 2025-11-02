/**
 * Teamcenter Quality API Client
 * Handles authentication and API communication with Teamcenter Quality system
 * Issue #266 - Teamcenter Quality MRB Integration Infrastructure
 */

import { Logger } from 'winston';
import { PrismaClient } from '@prisma/client';
import type { MRBReview, MRBDisposition, TeamcenterCredentials, MRBSyncConfig } from './TeamcenterMRBModels';

/**
 * Teamcenter API Error
 */
export class TeamcenterAPIError extends Error {
  constructor(
    public statusCode: number,
    public teamcenterError: string,
    message: string
  ) {
    super(message);
    this.name = 'TeamcenterAPIError';
  }
}

/**
 * Teamcenter Quality API Client
 * Manages authentication and communication with Teamcenter Quality system
 */
export class TeamcenterQualityAPIClient {
  private baseUrl: string;
  private credentials: TeamcenterCredentials | null = null;
  private accessToken: string | null = null;
  private tokenExpireTime: Date | null = null;
  private readonly TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutes

  constructor(
    private prisma: PrismaClient,
    private logger: Logger,
    private config: MRBSyncConfig
  ) {
    this.baseUrl = config.teamcenterUrl;
  }

  /**
   * Initialize the client with credentials
   */
  async initialize(): Promise<void> {
    this.logger.info(`Initializing Teamcenter Quality API client for ${this.config.teamcenterId}`);

    try {
      // Load credentials from secure storage
      this.credentials = await this.loadCredentials();

      // Test connection and authenticate
      await this.authenticate();

      this.logger.info('Teamcenter Quality API client initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize Teamcenter Quality API client', { error });
      throw new TeamcenterAPIError(
        500,
        'INITIALIZATION_FAILED',
        `Failed to initialize Teamcenter client: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Authenticate with Teamcenter using configured authentication method
   */
  private async authenticate(): Promise<void> {
    if (!this.credentials) {
      throw new Error('Credentials not loaded');
    }

    switch (this.config.authenticationType) {
      case 'OAUTH2':
        await this.authenticateOAuth2();
        break;
      case 'API_KEY':
        this.accessToken = this.credentials.apiKey || null;
        break;
      case 'BASIC_AUTH':
        await this.authenticateBasicAuth();
        break;
      default:
        throw new Error(`Unsupported authentication type: ${this.config.authenticationType}`);
    }
  }

  /**
   * OAuth2 authentication flow
   */
  private async authenticateOAuth2(): Promise<void> {
    this.logger.debug('Authenticating with Teamcenter using OAuth2');

    if (!this.credentials?.accessToken || this.isTokenExpired()) {
      await this.refreshOAuth2Token();
    } else {
      this.accessToken = this.credentials.accessToken;
    }
  }

  /**
   * Refresh OAuth2 token
   */
  private async refreshOAuth2Token(): Promise<void> {
    const url = `${this.baseUrl}/oauth/token`;

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: this.credentials!.clientId,
          client_secret: this.credentials!.clientSecret || '',
          refresh_token: this.credentials!.refreshToken || '',
        }).toString(),
      });

      if (!response.ok) {
        throw new TeamcenterAPIError(
          response.status,
          'TOKEN_REFRESH_FAILED',
          `Failed to refresh OAuth2 token: ${response.statusText}`
        );
      }

      const data = (await response.json()) as {
        access_token: string;
        expires_in: number;
        refresh_token?: string;
      };

      this.accessToken = data.access_token;
      this.tokenExpireTime = new Date(Date.now() + data.expires_in * 1000);

      // Update credentials in secure storage
      await this.updateCredentials({
        accessToken: data.access_token,
        refreshToken: data.refresh_token || this.credentials!.refreshToken,
        tokenExpireTime: this.tokenExpireTime,
      });

      this.logger.debug('OAuth2 token refreshed successfully');
    } catch (error) {
      this.logger.error('OAuth2 token refresh failed', { error });
      throw error;
    }
  }

  /**
   * Basic Authentication
   */
  private async authenticateBasicAuth(): Promise<void> {
    const username = this.credentials?.username;
    const password = this.credentials?.password;

    if (!username || !password) {
      throw new Error('Username and password required for Basic Auth');
    }

    this.accessToken = Buffer.from(`${username}:${password}`).toString('base64');
  }

  /**
   * Check if OAuth2 token is expired
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpireTime) {
      return true;
    }
    return Date.now() > this.tokenExpireTime.getTime() - this.TOKEN_REFRESH_THRESHOLD;
  }

  /**
   * Load credentials from secure storage
   */
  private async loadCredentials(): Promise<TeamcenterCredentials> {
    try {
      // In production, decrypt credentials from secure vault
      // This is a placeholder implementation
      const storedCredentials = await this.prisma.teamcenterCredentials.findUnique({
        where: { id: this.config.credentialId },
      });

      if (!storedCredentials) {
        throw new Error(`Credentials not found: ${this.config.credentialId}`);
      }

      return storedCredentials as unknown as TeamcenterCredentials;
    } catch (error) {
      this.logger.error('Failed to load Teamcenter credentials', { error });
      throw error;
    }
  }

  /**
   * Update credentials in secure storage
   */
  private async updateCredentials(updates: Partial<TeamcenterCredentials>): Promise<void> {
    try {
      await this.prisma.teamcenterCredentials.update({
        where: { id: this.config.credentialId },
        data: {
          ...updates,
          updatedAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error('Failed to update Teamcenter credentials', { error });
    }
  }

  /**
   * Make authenticated API request to Teamcenter
   */
  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    data?: Record<string, any>
  ): Promise<T> {
    // Ensure token is fresh
    if (this.isTokenExpired() && this.config.authenticationType === 'OAUTH2') {
      await this.refreshOAuth2Token();
    }

    const url = `${this.baseUrl}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'MES-Teamcenter-Integration/1.0',
    };

    if (this.config.authenticationType === 'OAUTH2') {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    } else if (this.config.authenticationType === 'BASIC_AUTH') {
      headers['Authorization'] = `Basic ${this.accessToken}`;
    } else if (this.config.authenticationType === 'API_KEY') {
      headers['X-API-Key'] = this.accessToken || '';
    }

    this.logger.debug(`Making ${method} request to ${endpoint}`);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new TeamcenterAPIError(
          response.status,
          'API_ERROR',
          `Teamcenter API error: ${response.statusText} - ${errorText}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error instanceof TeamcenterAPIError) {
        throw error;
      }
      this.logger.error(`Request to Teamcenter failed: ${endpoint}`, { error });
      throw new TeamcenterAPIError(
        500,
        'REQUEST_FAILED',
        `Failed to make request to Teamcenter: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Test connection to Teamcenter
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('GET', '/api/health');
      return response.status === 'OK';
    } catch (error) {
      this.logger.error('Teamcenter connection test failed', { error });
      return false;
    }
  }

  /**
   * Get MRB review from Teamcenter
   */
  async getMRBReview(mrbNumber: string): Promise<MRBReview | null> {
    try {
      const review = await this.request<MRBReview>(
        'GET',
        `/api/quality/mrb/${encodeURIComponent(mrbNumber)}`
      );
      return review;
    } catch (error) {
      if (error instanceof TeamcenterAPIError && error.statusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Search for MRB reviews in Teamcenter
   */
  async searchMRBReviews(filters: {
    startDate?: Date;
    endDate?: Date;
    status?: string[];
    partNumber?: string;
  }): Promise<MRBReview[]> {
    try {
      const queryParams = new URLSearchParams();

      if (filters.startDate) {
        queryParams.append('startDate', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        queryParams.append('endDate', filters.endDate.toISOString());
      }
      if (filters.status) {
        filters.status.forEach((s) => queryParams.append('status', s));
      }
      if (filters.partNumber) {
        queryParams.append('partNumber', filters.partNumber);
      }

      const reviews = await this.request<MRBReview[]>(
        'GET',
        `/api/quality/mrb/search?${queryParams.toString()}`
      );
      return reviews;
    } catch (error) {
      this.logger.error('Failed to search MRB reviews in Teamcenter', { error });
      throw error;
    }
  }

  /**
   * Create MRB review in Teamcenter
   */
  async createMRBReview(review: Omit<MRBReview, 'id' | 'teamcenterId' | 'createdAt' | 'updatedAt'>): Promise<MRBReview> {
    try {
      const created = await this.request<MRBReview>('POST', '/api/quality/mrb', review);
      return created;
    } catch (error) {
      this.logger.error('Failed to create MRB review in Teamcenter', { error });
      throw error;
    }
  }

  /**
   * Update MRB review in Teamcenter
   */
  async updateMRBReview(mrbNumber: string, updates: Partial<MRBReview>): Promise<MRBReview> {
    try {
      const updated = await this.request<MRBReview>(
        'PUT',
        `/api/quality/mrb/${encodeURIComponent(mrbNumber)}`,
        updates
      );
      return updated;
    } catch (error) {
      this.logger.error(`Failed to update MRB review in Teamcenter: ${mrbNumber}`, { error });
      throw error;
    }
  }

  /**
   * Get dispositions for MRB review
   */
  async getMRBDispositions(mrbNumber: string): Promise<MRBDisposition[]> {
    try {
      const dispositions = await this.request<MRBDisposition[]>(
        'GET',
        `/api/quality/mrb/${encodeURIComponent(mrbNumber)}/dispositions`
      );
      return dispositions;
    } catch (error) {
      this.logger.error(`Failed to get dispositions for MRB: ${mrbNumber}`, { error });
      throw error;
    }
  }

  /**
   * Add disposition to MRB review
   */
  async addMRBDisposition(mrbNumber: string, disposition: Omit<MRBDisposition, 'id' | 'mrbReviewId' | 'createdAt' | 'updatedAt'>): Promise<MRBDisposition> {
    try {
      const created = await this.request<MRBDisposition>(
        'POST',
        `/api/quality/mrb/${encodeURIComponent(mrbNumber)}/dispositions`,
        disposition
      );
      return created;
    } catch (error) {
      this.logger.error(`Failed to add disposition to MRB: ${mrbNumber}`, { error });
      throw error;
    }
  }

  /**
   * Close the client and cleanup resources
   */
  async close(): Promise<void> {
    this.logger.info('Closing Teamcenter Quality API client');
    this.accessToken = null;
    this.credentials = null;
  }
}
