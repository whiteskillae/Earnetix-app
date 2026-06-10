const mongoose = require('mongoose');

const loginLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  ip: {
    type: String,
    required: true,
  },
  userAgent: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['success', 'failed'],
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// TTL Index to automatically delete logs older than 90 days (7776000 seconds)
loginLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
// Index to quickly fetch a user's login history
loginLogSchema.index({ userId: 1, timestamp: -1 });

module.exports = mongoose.model('LoginLog', loginLogSchema);
