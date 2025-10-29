/**
 * Home Realm Discovery Service (Issue #134)
 *
 * Implements intelligent provider selection based on user attributes.
 * Provides automatic routing to appropriate SSO providers based on email domains,
 * user groups, and configurable discovery rules.
 *
 * Features:
 * - Domain-based provider discovery
 * - Priority-based rule evaluation
 * - Fallback to default providers
 * - Caching for performance
 * - Analytics tracking for optimization
 */

import { SsoProvider, HomeRealmDiscovery } from '@prisma/client';
import prisma from '../lib/database';
import { logger } from '../utils/logger';
import SsoProviderService from './SsoProviderService';

export interface DiscoveryRule {
  id: string;
  name: string;
  pattern: string;
  providerId: string;
  priority: number;
  isActive: boolean;
  provider?: SsoProvider;
}

export interface DiscoveryResult {
  provider: SsoProvider;
  matchedRule?: DiscoveryRule;
  confidence: number; // 0-1 scale
  fallbackUsed: boolean;
}

export interface DiscoveryRequest {
  email: string;
  userAgent?: string;
  ipAddress?: string;
  userGroups?: string[];
}

export class HomeRealmDiscoveryService {
  private static instance: HomeRealmDiscoveryService;
  private providerService: SsoProviderService;
  private ruleCache = new Map<string, DiscoveryRule[]>();
  private readonly CACHE_TTL = 300000; // 5 minutes
  private cacheTimestamp = 0;

  private constructor() {
    this.providerService = SsoProviderService.getInstance();
  }

  public static getInstance(): HomeRealmDiscoveryService {
    if (!HomeRealmDiscoveryService.instance) {
      HomeRealmDiscoveryService.instance = new HomeRealmDiscoveryService();
    }
    return HomeRealmDiscoveryService.instance;
  }

  /**
   * Discover the appropriate provider for a user
   */
  async discoverProvider(request: DiscoveryRequest): Promise<DiscoveryResult | null> {
    try {
      const domain = this.extractDomain(request.email);

      logger.info('Starting home realm discovery', {
        email: request.email,
        domain,
        userAgent: request.userAgent
      });

      // Try domain-based discovery first
      const domainResult = await this.discoverByDomain(domain);
      if (domainResult) {
        await this.trackDiscoveryEvent(request, domainResult, 'domain_match');
        return domainResult;
      }

      // Try group-based discovery if user groups are provided
      if (request.userGroups && request.userGroups.length > 0) {
        const groupResult = await this.discoverByGroups(request.userGroups);
        if (groupResult) {
          await this.trackDiscoveryEvent(request, groupResult, 'group_match');
          return groupResult;
        }
      }

      // Fall back to default provider
      const fallbackResult = await this.getFallbackProvider(request.email);
      if (fallbackResult) {
        await this.trackDiscoveryEvent(request, fallbackResult, 'fallback');
        return fallbackResult;
      }

      logger.warn('No provider found for user', { email: request.email, domain });
      return null;

    } catch (error) {
      logger.error('Failed to discover provider', { error, request });
      throw error;
    }
  }

  /**
   * Create a new discovery rule
   */
  async createRule(rule: Omit<DiscoveryRule, 'id'>): Promise<HomeRealmDiscovery> {
    try {
      // Validate the rule
      await this.validateRule(rule);

      // Check if provider exists
      const provider = await this.providerService.getProviderById(rule.providerId);
      if (!provider) {
        throw new Error(`Provider with ID '${rule.providerId}' not found`);
      }

      const createdRule = await prisma.homeRealmDiscovery.create({
        data: {
          name: rule.name,
          pattern: rule.pattern,
          providerId: rule.providerId,
          priority: rule.priority,
          isActive: rule.isActive
        }
      });

      // Invalidate cache
      this.invalidateCache();

      logger.info('Home realm discovery rule created', {
        ruleId: createdRule.id,
        pattern: rule.pattern,
        providerId: rule.providerId
      });

      return createdRule;

    } catch (error) {
      logger.error('Failed to create discovery rule', { error, rule });
      throw error;
    }
  }

  /**
   * Update an existing discovery rule
   */
  async updateRule(id: string, updates: Partial<DiscoveryRule>): Promise<HomeRealmDiscovery> {
    try {
      const existingRule = await prisma.homeRealmDiscovery.findUnique({
        where: { id }
      });

      if (!existingRule) {
        throw new Error(`Discovery rule with ID '${id}' not found`);
      }

      // Validate updates
      if (updates.providerId) {
        const provider = await this.providerService.getProviderById(updates.providerId);
        if (!provider) {
          throw new Error(`Provider with ID '${updates.providerId}' not found`);
        }
      }

      if (updates.pattern) {
        await this.validatePattern(updates.pattern);
      }

      const updatedRule = await prisma.homeRealmDiscovery.update({
        where: { id },
        data: {
          ...(updates.name && { name: updates.name }),
          ...(updates.pattern && { pattern: updates.pattern }),
          ...(updates.providerId && { providerId: updates.providerId }),
          ...(updates.priority !== undefined && { priority: updates.priority }),
          ...(updates.isActive !== undefined && { isActive: updates.isActive })
        }
      });

      // Invalidate cache
      this.invalidateCache();

      logger.info('Home realm discovery rule updated', {
        ruleId: id,
        updates: Object.keys(updates)
      });

      return updatedRule;

    } catch (error) {
      logger.error('Failed to update discovery rule', { error, id, updates });
      throw error;
    }
  }

  /**
   * Delete a discovery rule
   */
  async deleteRule(id: string): Promise<void> {
    try {
      const rule = await prisma.homeRealmDiscovery.findUnique({
        where: { id }
      });

      if (!rule) {
        throw new Error(`Discovery rule with ID '${id}' not found`);
      }

      await prisma.homeRealmDiscovery.delete({
        where: { id }
      });

      // Invalidate cache
      this.invalidateCache();

      logger.info('Home realm discovery rule deleted', {
        ruleId: id,
        pattern: rule.pattern
      });

    } catch (error) {
      logger.error('Failed to delete discovery rule', { error, id });
      throw error;
    }
  }

  /**
   * Get all discovery rules
   */
  async getRules(): Promise<DiscoveryRule[]> {
    const rules = await prisma.homeRealmDiscovery.findMany({
      include: {
        provider: true
      },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    return rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      pattern: rule.pattern,
      providerId: rule.providerId,
      priority: rule.priority,
      isActive: rule.isActive,
      provider: rule.provider
    }));
  }

  /**
   * Test a rule against a sample email
   */
  async testRule(ruleId: string, email: string): Promise<{
    matches: boolean;
    provider?: SsoProvider;
    confidence: number;
  }> {
    const rule = await prisma.homeRealmDiscovery.findUnique({
      where: { id: ruleId },
      include: { provider: true }
    });

    if (!rule) {
      throw new Error(`Rule with ID '${ruleId}' not found`);
    }

    const domain = this.extractDomain(email);
    const matches = this.testPattern(rule.pattern, domain);

    return {
      matches,
      provider: matches ? rule.provider : undefined,
      confidence: matches ? 1.0 : 0.0
    };
  }

  /**
   * Get discovery analytics
   */
  async getAnalytics(days = 30): Promise<{
    totalDiscoveries: number;
    domainMatches: number;
    groupMatches: number;
    fallbackUsed: number;
    topDomains: Array<{ domain: string; count: number }>;
    providerUsage: Array<{ providerId: string; providerName: string; count: number }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // This would require adding discovery event tracking
    // For now, return mock data structure
    return {
      totalDiscoveries: 0,
      domainMatches: 0,
      groupMatches: 0,
      fallbackUsed: 0,
      topDomains: [],
      providerUsage: []
    };
  }

  /**
   * Private methods
   */

  private async discoverByDomain(domain: string): Promise<DiscoveryResult | null> {
    const rules = await this.getActiveRules();

    for (const rule of rules) {
      if (this.testPattern(rule.pattern, domain)) {
        const provider = await this.providerService.getProviderById(rule.providerId);
        if (provider && provider.isActive) {
          return {
            provider,
            matchedRule: rule,
            confidence: 1.0,
            fallbackUsed: false
          };
        }
      }
    }

    return null;
  }

  private async discoverByGroups(userGroups: string[]): Promise<DiscoveryResult | null> {
    // Get providers that have group restrictions matching user groups
    const providers = await prisma.ssoProvider.findMany({
      where: {
        isActive: true,
        groupRestrictions: {
          hasSome: userGroups
        }
      },
      orderBy: { priority: 'desc' }
    });

    if (providers.length > 0) {
      return {
        provider: providers[0],
        confidence: 0.8,
        fallbackUsed: false
      };
    }

    return null;
  }

  private async getFallbackProvider(email: string): Promise<DiscoveryResult | null> {
    // Try to get providers available for this user's domain
    const availableProviders = await this.providerService.getAvailableProvidersForUser(email);

    if (availableProviders.length === 0) {
      return null;
    }

    // Use the first available provider (highest priority)
    return {
      provider: availableProviders[0],
      confidence: 0.5,
      fallbackUsed: true
    };
  }

  private async getActiveRules(): Promise<DiscoveryRule[]> {
    const now = Date.now();

    // Use cache if valid
    if (this.ruleCache.has('active') && (now - this.cacheTimestamp) < this.CACHE_TTL) {
      return this.ruleCache.get('active')!;
    }

    // Fetch fresh rules
    const rules = await prisma.homeRealmDiscovery.findMany({
      where: { isActive: true },
      include: { provider: true },
      orderBy: [
        { priority: 'desc' },
        { createdAt: 'asc' }
      ]
    });

    const mappedRules = rules.map(rule => ({
      id: rule.id,
      name: rule.name,
      pattern: rule.pattern,
      providerId: rule.providerId,
      priority: rule.priority,
      isActive: rule.isActive,
      provider: rule.provider
    }));

    // Update cache
    this.ruleCache.set('active', mappedRules);
    this.cacheTimestamp = now;

    return mappedRules;
  }

  private testPattern(pattern: string, domain: string): boolean {
    try {
      // Support wildcard patterns
      if (pattern.includes('*')) {
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        const regex = new RegExp(`^${regexPattern}$`, 'i');
        return regex.test(domain);
      }

      // Exact match (case insensitive)
      return pattern.toLowerCase() === domain.toLowerCase();

    } catch (error) {
      logger.warn('Invalid pattern in discovery rule', { pattern, error });
      return false;
    }
  }

  private extractDomain(email: string): string {
    const parts = email.split('@');
    return parts.length === 2 ? parts[1].toLowerCase() : '';
  }

  private async validateRule(rule: Partial<DiscoveryRule>): Promise<void> {
    if (!rule.name?.trim()) {
      throw new Error('Rule name is required');
    }

    if (!rule.pattern?.trim()) {
      throw new Error('Rule pattern is required');
    }

    if (!rule.providerId?.trim()) {
      throw new Error('Provider ID is required');
    }

    await this.validatePattern(rule.pattern);
  }

  private async validatePattern(pattern: string): Promise<void> {
    // Basic validation for email domain patterns
    if (!pattern.match(/^[\w\-.*]+\.[a-zA-Z]{2,}$/)) {
      throw new Error('Invalid domain pattern format');
    }

    // Test pattern compilation for wildcard patterns
    if (pattern.includes('*')) {
      try {
        const regexPattern = pattern
          .replace(/\./g, '\\.')
          .replace(/\*/g, '.*');
        new RegExp(`^${regexPattern}$`, 'i');
      } catch (error) {
        throw new Error('Invalid wildcard pattern');
      }
    }
  }

  private async trackDiscoveryEvent(
    request: DiscoveryRequest,
    result: DiscoveryResult,
    matchType: 'domain_match' | 'group_match' | 'fallback'
  ): Promise<void> {
    try {
      // This would integrate with the analytics service
      // For now, just log the event
      logger.info('Home realm discovery completed', {
        email: request.email,
        providerId: result.provider.id,
        providerName: result.provider.name,
        matchType,
        confidence: result.confidence,
        fallbackUsed: result.fallbackUsed,
        ruleId: result.matchedRule?.id
      });
    } catch (error) {
      logger.warn('Failed to track discovery event', { error });
    }
  }

  private invalidateCache(): void {
    this.ruleCache.clear();
    this.cacheTimestamp = 0;
  }
}

export default HomeRealmDiscoveryService;