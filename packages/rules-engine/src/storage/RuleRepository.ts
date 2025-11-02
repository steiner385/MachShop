/**
 * Rule Repository
 * Storage and retrieval of rules
 */

import { Rule, RuleTemplate, RuleFilter, PaginatedResults } from '../types';

/**
 * Repository for managing rules and templates
 */
export class RuleRepository {
  private rules: Map<string, Rule> = new Map();
  private templates: Map<string, RuleTemplate> = new Map();
  private ruleVersions: Map<string, Rule[]> = new Map();

  /**
   * Save rule
   */
  async saveRule(rule: Rule): Promise<void> {
    this.rules.set(rule.id, { ...rule });

    // Version tracking
    if (!this.ruleVersions.has(rule.id)) {
      this.ruleVersions.set(rule.id, []);
    }
    this.ruleVersions.get(rule.id)!.push({ ...rule });
  }

  /**
   * Get rule
   */
  async getRule(ruleId: string): Promise<Rule | null> {
    return this.rules.get(ruleId) || null;
  }

  /**
   * Delete rule
   */
  async deleteRule(ruleId: string): Promise<void> {
    this.rules.delete(ruleId);
  }

  /**
   * List rules with pagination
   */
  async listRules(filter?: RuleFilter, offset: number = 0, limit: number = 50): Promise<PaginatedResults<Rule>> {
    let results = Array.from(this.rules.values());

    if (filter) {
      if (filter.status) {
        results = results.filter((r) => r.status === filter.status);
      }
      if (filter.category) {
        results = results.filter((r) => r.category === filter.category);
      }
      if (filter.tags) {
        results = results.filter((r) => r.tags?.some((t) => filter.tags!.includes(t)));
      }
      if (filter.siteId) {
        results = results.filter((r) => r.siteId === filter.siteId || !r.siteId);
      }
      if (filter.enabled !== undefined) {
        results = results.filter((r) => r.enabled === filter.enabled);
      }
    }

    const total = results.length;
    const items = results.slice(offset, offset + limit);

    return {
      items,
      total,
      limit,
      offset,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Search rules
   */
  async searchRules(query: string): Promise<Rule[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.rules.values()).filter(
      (r) =>
        r.name.toLowerCase().includes(lowerQuery) ||
        r.description?.toLowerCase().includes(lowerQuery) ||
        r.tags?.some((t) => t.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get rule versions
   */
  async getRuleVersions(ruleId: string): Promise<Rule[]> {
    return this.ruleVersions.get(ruleId) || [];
  }

  /**
   * Restore rule version
   */
  async restoreRuleVersion(ruleId: string, version: string): Promise<Rule> {
    const versions = this.ruleVersions.get(ruleId) || [];
    const targetVersion = versions.find((v) => v.version === version);
    if (!targetVersion) {
      throw new Error(`Version ${version} not found`);
    }

    const restored = { ...targetVersion, version };
    this.rules.set(ruleId, restored);
    return restored;
  }

  /**
   * Save template
   */
  async saveTemplate(template: RuleTemplate): Promise<void> {
    this.templates.set(template.id, { ...template });
  }

  /**
   * Get template
   */
  async getTemplate(templateId: string): Promise<RuleTemplate | null> {
    return this.templates.get(templateId) || null;
  }

  /**
   * List templates
   */
  async listTemplates(category?: string): Promise<RuleTemplate[]> {
    let results = Array.from(this.templates.values());

    if (category) {
      results = results.filter((t) => t.category === category);
    }

    return results;
  }

  /**
   * Get templates by category
   */
  async getTemplatesByCategory(category: string): Promise<RuleTemplate[]> {
    return Array.from(this.templates.values()).filter((t) => t.category === category);
  }

  /**
   * Clear all (for testing)
   */
  async clear(): Promise<void> {
    this.rules.clear();
    this.templates.clear();
    this.ruleVersions.clear();
  }
}

// Singleton instance
export const ruleRepository = new RuleRepository();
