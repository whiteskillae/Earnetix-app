const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const SkillCategory = require('../models/SkillCategory');
const env = require('../config/env');
const logger = require('../utils/logger');

const skillsData = [
  {
    name: "Development",
    skills: ["Coding / Programming", "Web Development", "App Development", "Software Designing", "Game Development", "Cloud Computing", "DevOps", "QA Testing", "Automation"]
  },
  {
    name: "Design & Creative",
    skills: ["UI/UX Design", "Graphic Designing", "Video Editing", "Motion Graphics", "Animation", "Photography", "Cinematography", "Video Production", "Architectural Design", "Interior Design", "Music Production", "Choreography"]
  },
  {
    name: "Writing & Content",
    skills: ["Content Writing", "Copywriting", "Blogging", "Script Writing", "Voice Over"]
  },
  {
    name: "Marketing",
    skills: ["SEO", "Digital Marketing", "Social Media Management", "Influencer Marketing", "Content Creator", "Branding", "E-commerce"]
  },
  {
    name: "Data & AI",
    skills: ["Data Analysis", "Business Analytics", "AI Prompt Engineering", "Machine Learning", "Artificial Intelligence", "Cyber Security", "Networking"]
  },
  {
    name: "Finance & Business",
    skills: ["Trading Knowledge", "Financial Market Knowledge", "Cryptocurrency", "HR Management", "Project Management", "Entrepreneurship", "Sales"]
  },
  {
    name: "Education & Support",
    skills: ["Public Speaking", "Teaching", "Coaching", "Fitness Coaching", "Customer Support", "Virtual Assistance", "Technical Support", "Research"]
  }
];

/**
 * Seeds the initial admin user and default skills from environment variables.
 */
const seedAdmin = async () => {
  try {
    // Seed skills if empty
    const skillCount = await SkillCategory.countDocuments();
    if (skillCount === 0) {
      await SkillCategory.insertMany(skillsData);
      logger.info('✅ Default skills seeded successfully.');
    }

    const adminEmail = process.env.ADMIN_EMAIL || 'whiteskillae@gmail.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'earnitix2026v1';

    const existingAdmin = await User.findOne({ email: adminEmail });
    if (existingAdmin) {
      let changed = false;
      if (existingAdmin.role !== 'admin') {
        existingAdmin.role = 'admin';
        changed = true;
        logger.info('Updated existing user to admin role.');
      }

      // Sync password if it has changed in the .env file
      const isMatch = await bcrypt.compare(adminPassword, existingAdmin.passwordHash);
      if (!isMatch) {
        existingAdmin.passwordHash = await bcrypt.hash(adminPassword, 12);
        existingAdmin.authProvider = 'local'; // Ensure local login is supported
        changed = true;
        logger.info('Updated admin password to match .env configuration.');
      }

      if (changed) {
        await existingAdmin.save();
      } else {
        logger.info('Admin user already exists and is fully synchronized.');
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
    logger.error('Error seeding admin and skills:', error);
  }
};

module.exports = seedAdmin;
