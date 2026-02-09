/**
 * Simple in-memory cache utility with TTL support
 * Provides huge perceived speed boost for frequently accessed data
 */

class Cache {
  constructor() {
    this.store = new Map();
    this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
  }

  /**
   * Generate a cache key from route and query parameters
   */
  generateKey(route, query = {}) {
    // Sort query params for consistent keys
    const sortedQuery = Object.keys(query)
      .sort()
      .map(key => `${key}=${query[key]}`)
      .join('&');
    
    return sortedQuery ? `${route}?${sortedQuery}` : route;
  }

  /**
   * Get cached value
   */
  get(key) {
    const item = this.store.get(key);
    
    if (!item) {
      return null;
    }

    // Check if expired
    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      return null;
    }

    return item.value;
  }

  /**
   * Set cached value with optional TTL
   */
  set(key, value, ttl = this.defaultTTL) {
    const expiresAt = Date.now() + ttl;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete cached value
   */
  delete(key) {
    this.store.delete(key);
  }

  /**
   * Clear all cache entries matching a pattern
   */
  clearPattern(pattern) {
    const keysToDelete = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => this.store.delete(key));
  }

  /**
   * Clear all cache
   */
  clear() {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const now = Date.now();
    let valid = 0;
    let expired = 0;

    for (const item of this.store.values()) {
      if (Date.now() > item.expiresAt) {
        expired++;
      } else {
        valid++;
      }
    }

    return {
      total: this.store.size,
      valid,
      expired,
    };
  }

  /**
   * Clean up expired entries (should be called periodically)
   */
  cleanup() {
    const now = Date.now();
    const keysToDelete = [];

    for (const [key, item] of this.store.entries()) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));
    return keysToDelete.length;
  }
}

// Singleton instance
const cache = new Cache();

// Periodic cleanup every 1 minute
setInterval(() => {
  const cleaned = cache.cleanup();
  if (cleaned > 0) {
    console.log(`Cache cleanup: Removed ${cleaned} expired entries`);
  }
}, 60 * 1000);

/**
 * Cache middleware for Express routes
 */
export const cacheMiddleware = (ttl = 5 * 60 * 1000) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Use originalUrl to get full path including base route
    // Parse out just the path (remove query string for key generation)
    const routePath = (req.originalUrl || req.url).split('?')[0];
    
    const cacheKey = cache.generateKey(routePath, req.query);
    const cached = cache.get(cacheKey);

    if (cached) {
      // Set cache headers
      res.setHeader('X-Cache', 'HIT');
      return res.json(cached);
    }

    // Store original json method
    const originalJson = res.json.bind(res);

    // Override json method to cache response
    res.json = function(data) {
      // Only cache successful responses
      if (res.statusCode === 200) {
        cache.set(cacheKey, data, ttl);
      }
      res.setHeader('X-Cache', 'MISS');
      return originalJson(data);
    };

    next();
  };
};

/**
 * Invalidate cache for a specific route pattern
 */
export const invalidateCache = (pattern) => {
  cache.clearPattern(pattern);
  console.log(`Cache invalidated for pattern: ${pattern}`);
};

export default cache;
