const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const User = require('../models/User');

const seedAdmin = async () => {
  try {
    const adminEmail = env.ADMIN_EMAIL;
    const adminPassword = env.ADMIN_PASSWORD;

    if (!adminEmail || !adminPassword) {
      console.error('❌ Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env');
      process.exit(1);
    }

    // Connect to database
    await mongoose.connect(env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Check if admin exists
    let adminUser = await User.findOne({ email: adminEmail });

    if (adminUser) {
      console.log(`ℹ️ Admin user already exists: ${adminEmail}`);
      // Force update password if needed
      adminUser.passwordHash = await bcrypt.hash(adminPassword, 12);
      adminUser.role = 'admin';
      adminUser.isVerified = true;
      await adminUser.save();
      console.log('✅ Admin credentials updated.');
    } else {
      // Create admin user
      const passwordHash = await bcrypt.hash(adminPassword, 12);
      await User.create({
        name: 'System Admin',
        email: adminEmail,
        passwordHash,
        role: 'admin',
        isVerified: true,
        registrationIp: '127.0.0.1',
        accountStatus: 'active',
        isProfileComplete: true
      });
      console.log(`✅ Admin user created: ${adminEmail}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding admin:', error);
    process.exit(1);
  }
};

seedAdmin();
