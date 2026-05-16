const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

const deleteUser = async () => {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error('MONGO_URI not found in environment');

    await mongoose.connect(uri);
    console.log('Connected to MongoDB');

    const User = require('./src/models/User');
    const Submission = require('./src/models/Submission');
    const Withdrawal = require('./src/models/Withdrawal');

    // Find the user by name or username
    const user = await User.findOne({ 
      $or: [
        { name: /kishu/i },
        { username: /kishu/i },
        { email: /kishu/i }
      ]
    });

    if (!user) {
      console.log('User "kishu" not found.');
      process.exit(0);
    }

    console.log(`Found user: ${user.name} (${user.email}). ID: ${user._id}. Deleting...`);

    // Delete related data
    const subDelete = await Submission.deleteMany({ userId: user._id });
    const withDelete = await Withdrawal.deleteMany({ userId: user._id });
    const userDelete = await User.deleteOne({ _id: user._id });

    console.log(`Deleted ${subDelete.deletedCount} submissions.`);
    console.log(`Deleted ${withDelete.deletedCount} withdrawals.`);
    console.log(`User deleted: ${userDelete.deletedCount}`);

    console.log('Account "kishu" fully purged from system.');
    process.exit(0);
  } catch (err) {
    console.error('CRITICAL ERROR:', err.message);
    process.exit(1);
  }
};

deleteUser();
