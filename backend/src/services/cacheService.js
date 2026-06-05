const NodeCache = require('node-cache');

// Standard TTL: 5 minutes (300 seconds)
// Checkperiod: 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Cache service for Earnetix
 * Used to store frequently accessed data like active tasks and announcements.
 *
 * IMPROVED: Targeted invalidation instead of flush() to prevent thundering herd.
 * When a task changes, only task-related cache keys are cleared — not dashboard,
 * announcements, or user data.
 */
const cacheService = {
  get: (key) => cache.get(key),
  set: (key, value, ttl) => cache.set(key, value, ttl),
  del: (key) => cache.del(key),

  /**
   * Invalidate all keys that start with a given prefix.
   * Example: invalidateByPrefix('tasks_') clears tasks_p1_l20, tasks_p2_l20, etc.
   * but leaves admin_dashboard, announcements, etc. untouched.
   */
  invalidateByPrefix: (prefix) => {
    const keys = cache.keys();
    const toDelete = keys.filter(k => k.startsWith(prefix));
    if (toDelete.length > 0) {
      cache.del(toDelete);
    }
    return toDelete.length;
  },

  /**
   * Flush ALL cached data. 
   * Only use for catastrophic resets — prefer invalidateByPrefix for normal operations.
   */
  flush: () => cache.flushAll(),
  
  // ─── Specific Helpers ──────────────────────────────────
  clearTasks: () => cacheService.invalidateByPrefix('tasks_'),
  clearAnnouncements: () => cache.del('active_announcements'),
  clearDashboard: () => cache.del('admin_dashboard'),

  // ─── Stats (useful for monitoring) ─────────────────────
  getStats: () => cache.getStats(),
  getKeyCount: () => cache.keys().length,
};

module.exports = cacheService;
