const Analytics = require('../models/Analytics');
const logger = require('../utils/logger');
const jwt = require('jsonwebtoken');

// Memory buffer for stats
let statsBuffer = {
  apiHits: 0,
  pageViews: 0,
  uniqueIps: new Set(),
  activeUsers: new Set()
};

// Helper to get YYYY-MM-DD
const getDateString = () => new Date().toISOString().split('T')[0];

/**
 * Flush memory buffer to MongoDB
 */
const flushAnalytics = async () => {
  if (statsBuffer.apiHits === 0 && statsBuffer.pageViews === 0 && statsBuffer.uniqueIps.size === 0 && statsBuffer.activeUsers.size === 0) return;

  const dateString = getDateString();
  const currentHits = statsBuffer.apiHits;
  const currentViews = statsBuffer.pageViews;
  const currentUniques = statsBuffer.uniqueIps.size;
  const currentUsers = Array.from(statsBuffer.activeUsers);

  // Reset buffer immediately
  statsBuffer.apiHits = 0;
  statsBuffer.pageViews = 0;
  statsBuffer.uniqueIps.clear();
  statsBuffer.activeUsers.clear();

  try {
    await Analytics.findOneAndUpdate(
      { dateString },
      { 
        $inc: { 
          apiHits: currentHits, 
          pageViews: currentViews,
          uniqueVisitors: currentUniques
        },
        $addToSet: {
          activeUsers: { $each: currentUsers }
        }
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  } catch (error) {
    logger.error(`Analytics flush failed: ${error.message}`);
    // Restore buffer on failure to avoid data loss (approximate)
    statsBuffer.apiHits += currentHits;
    statsBuffer.pageViews += currentViews;
  }
};

// Flush every 30 seconds
setInterval(flushAnalytics, 30000);

/**
 * Analytics tracking middleware
 */
const analyticsTracker = (req, res, next) => {
  // Always count as an API hit
  statsBuffer.apiHits += 1;

  // Simple heuristic for "page views" (GET requests to non-static assets, or specific endpoints)
  if (req.method === 'GET' && !req.path.includes('.')) {
    statsBuffer.pageViews += 1;
  }

  // Track unique IPs for the current interval
  const ip = req.ip || req.headers['x-forwarded-for'];
  if (ip) {
    statsBuffer.uniqueIps.add(ip);
  }

  // Track active users by decoding JWT if present
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.decode(token);
      if (decoded && decoded.userId) {
        statsBuffer.activeUsers.add(decoded.userId);
      }
    } catch (e) {
      // ignore invalid tokens
    }
  }

  next();
};

module.exports = analyticsTracker;
