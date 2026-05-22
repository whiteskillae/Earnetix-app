const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../utils/logger');
const dns = require('dns');

// Force Node.js to use Google DNS for resolving MongoDB Atlas SRV records.
// The default Windows/ISP DNS sometimes can't resolve _mongodb._tcp SRV records.
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI, {
      serverSelectionTimeoutMS: 10000, // 10s to find a server
      connectTimeoutMS: 10000,          // 10s to establish connection
      socketTimeoutMS: 30000,           // 30s idle socket timeout
      maxPoolSize: 10,                  // up to 10 concurrent connections
      minPoolSize: 2,                   // keep 2 warm connections ready
      family: 4,                        // Force IPv4 for Render
    });
    logger.info(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
