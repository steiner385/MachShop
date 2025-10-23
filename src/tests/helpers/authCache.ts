import fs from 'fs';
import path from 'path';

/**
 * Authentication Token Cache
 *
 * Caches JWT tokens to prevent rate limiting during E2E tests.
 * Tokens are stored in-memory and persisted to disk for reuse across test runs.
 *
 * This solves the critical issue of 299 rate limit errors (HTTP 429) by:
 * 1. Pre-authenticating all users once during global setup
 * 2. Reusing tokens across all tests
 * 3. Only re-authenticating when tokens expire
 */

export interface CachedToken {
  token: string;
  refreshToken?: string;
  expiresAt: number;
  userId: string;
  username: string;
}

export interface TokenCacheData {
  [username: string]: CachedToken;
}

export class AuthTokenCache {
  private static tokens: Map<string, CachedToken> = new Map();
  private static cacheFilePath = path.join(__dirname, '..', '..', '..', 'test-results', 'auth-cache.json');
  private static isInitialized = false;

  /**
   * Initialize the cache by loading tokens from disk if available
   */
  static initialize(): void {
    if (this.isInitialized) {
      return;
    }

    try {
      // Create test-results directory if it doesn't exist
      const dir = path.dirname(this.cacheFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Load cached tokens from disk if available
      if (fs.existsSync(this.cacheFilePath)) {
        const data = fs.readFileSync(this.cacheFilePath, 'utf-8');
        const cacheData: TokenCacheData = JSON.parse(data);

        // Only load tokens that haven't expired
        const now = Date.now();
        for (const [username, cachedToken] of Object.entries(cacheData)) {
          if (cachedToken.expiresAt > now) {
            this.tokens.set(username, cachedToken);
          }
        }

        console.log(`[Auth Cache] Loaded ${this.tokens.size} valid tokens from cache`);
      }
    } catch (error) {
      console.warn('[Auth Cache] Failed to load cache from disk:', error);
      // Continue with empty cache
    }

    this.isInitialized = true;
  }

  /**
   * Get a cached token for a user
   * Returns null if token doesn't exist or has expired
   */
  static getToken(username: string): CachedToken | null {
    this.initialize();

    const cached = this.tokens.get(username);
    if (!cached) {
      return null;
    }

    // Check if token has expired (with 1 minute buffer)
    const now = Date.now();
    if (cached.expiresAt <= now + 60000) {
      this.tokens.delete(username);
      this.persistToDisk();
      return null;
    }

    return cached;
  }

  /**
   * Store a token in the cache
   */
  static setToken(
    username: string,
    token: string,
    expiresIn: number = 3600000, // Default 1 hour
    userId?: string,
    refreshToken?: string
  ): void {
    this.initialize();

    const cachedToken: CachedToken = {
      token,
      refreshToken,
      expiresAt: Date.now() + expiresIn,
      userId: userId || username,
      username
    };

    this.tokens.set(username, cachedToken);
    this.persistToDisk();
  }

  /**
   * Check if a valid token exists for a user
   */
  static hasValidToken(username: string): boolean {
    return this.getToken(username) !== null;
  }

  /**
   * Clear a specific user's token
   */
  static clearToken(username: string): void {
    this.initialize();
    this.tokens.delete(username);
    this.persistToDisk();
  }

  /**
   * Clear all tokens from cache
   */
  static clearAll(): void {
    this.initialize();
    this.tokens.clear();
    this.persistToDisk();
  }

  /**
   * Get all cached usernames
   */
  static getCachedUsernames(): string[] {
    this.initialize();
    return Array.from(this.tokens.keys());
  }

  /**
   * Get cache statistics
   */
  static getStats(): {
    totalTokens: number;
    validTokens: number;
    expiredTokens: number;
  } {
    this.initialize();

    const now = Date.now();
    let validTokens = 0;
    let expiredTokens = 0;

    for (const cached of this.tokens.values()) {
      if (cached.expiresAt > now + 60000) {
        validTokens++;
      } else {
        expiredTokens++;
      }
    }

    return {
      totalTokens: this.tokens.size,
      validTokens,
      expiredTokens
    };
  }

  /**
   * Persist cache to disk
   */
  private static persistToDisk(): void {
    try {
      const cacheData: TokenCacheData = {};
      for (const [username, token] of this.tokens.entries()) {
        cacheData[username] = token;
      }

      fs.writeFileSync(
        this.cacheFilePath,
        JSON.stringify(cacheData, null, 2),
        'utf-8'
      );
    } catch (error) {
      console.warn('[Auth Cache] Failed to persist cache to disk:', error);
    }
  }

  /**
   * Get cache file path (useful for debugging)
   */
  static getCacheFilePath(): string {
    return this.cacheFilePath;
  }
}
