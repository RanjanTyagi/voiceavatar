/**
 * Client-Side API Cache
 * Feature: ai-avatar-system
 * 
 * Caches API requests to reduce redundant calls.
 * Validates: Requirements 9.5
 * Task 12.4: Implement client-side caching
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

export interface CacheOptions {
  validityPeriod?: number; // in milliseconds
  maxEntries?: number;
}

const DEFAULT_VALIDITY_PERIOD = 5 * 60 * 1000; // 5 minutes
const DEFAULT_MAX_ENTRIES = 50;

export class ApiCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private validityPeriod: number;
  private maxEntries: number;

  constructor(options: CacheOptions = {}) {
    this.cache = new Map();
    this.validityPeriod = options.validityPeriod || DEFAULT_VALIDITY_PERIOD;
    this.maxEntries = options.maxEntries || DEFAULT_MAX_ENTRIES;
  }

  /**
   * Generate cache key from request parameters
   */
  private generateKey(endpoint: string, params: Record<string, unknown>): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map((key) => `${key}=${JSON.stringify(params[key])}`)
      .join('&');
    return `${endpoint}?${sortedParams}`;
  }

  /**
   * Get cached data if valid
   */
  get<T>(endpoint: string, params: Record<string, unknown> = {}): T | null {
    const key = this.generateKey(endpoint, params);
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;

    if (!entry) {
      return null;
    }

    // Check if entry has expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache entry
   */
  set<T>(endpoint: string, params: Record<string, unknown>, data: T): void {
    const key = this.generateKey(endpoint, params);
    const now = Date.now();

    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      expiresAt: now + this.validityPeriod,
    };

    // Enforce max entries limit (LRU eviction)
    if (this.cache.size >= this.maxEntries) {
      // Remove oldest entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(key, entry as CacheEntry<unknown>);
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(endpoint: string, params: Record<string, unknown> = {}): void {
    const key = this.generateKey(endpoint, params);
    this.cache.delete(key);
  }

  /**
   * Invalidate all cache entries for an endpoint
   */
  invalidateEndpoint(endpoint: string): void {
    const keysToDelete: string[] = [];
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(endpoint)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxEntries: number;
    validityPeriod: number;
  } {
    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      validityPeriod: this.validityPeriod,
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }
}

// Global cache instance
let globalCache: ApiCache | null = null;

/**
 * Get or create global cache instance
 */
export function getApiCache(): ApiCache {
  if (!globalCache) {
    globalCache = new ApiCache();
    
    // Set up periodic cleanup (every 5 minutes)
    if (typeof window !== 'undefined') {
      setInterval(() => {
        globalCache?.cleanup();
      }, 5 * 60 * 1000);
    }
  }
  
  return globalCache;
}
