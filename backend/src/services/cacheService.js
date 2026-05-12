const NodeCache = require('node-cache');

// Standard TTL: 5 minutes (300 seconds)
// Checkperiod: 60 seconds
const cache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

/**
 * Cache service for Earnitix
 * Used to store frequently accessed data like active tasks and announcements.
 */
const cacheService = {
  get: (key) => cache.get(key),
  set: (key, value, ttl) => cache.set(key, value, ttl),
  del: (key) => cache.del(key),
  flush: () => cache.flushAll(),
  
  // Specific helpers
  clearTasks: () => cache.del('active_tasks'),
  clearAnnouncements: () => cache.del('active_announcements')
};

module.exports = cacheService;
