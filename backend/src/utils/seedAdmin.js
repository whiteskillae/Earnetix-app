const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const env = require('../config/env');
const logger = require('../utils/logger');

/**
 * Seeds the initial admin user from environment variables.
 */
const seedAdmin = async () => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      logger.warn('ADMIN_EMAIL or ADMIN_PASSWORD not found in environment. Skipping admin seed.');
      return;
    }

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        await existingAdmin.save();
        logger.info('Updated existing user to admin role.');
      } else {
        logger.info('Admin user already exists.');
      }
      return;
    }

    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await User.create({
      name: 'System Admin',
      email: adminEmail,
      passwordHash,
      role: 'admin',
      isVerified: true,
      registrationIp: '127.0.0.1', // internal
    });

    logger.info(`✅ Admin user created: ${adminEmail}`);
  } catch (error) {
    logger.error('Error seeding admin:', error);
  }
};

module.exports = seedAdmin;
