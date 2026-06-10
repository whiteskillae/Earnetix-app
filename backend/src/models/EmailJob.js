const mongoose = require('mongoose');

const emailJobSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
  },
  otpCode: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending',
  },
  attempts: {
    type: Number,
    default: 0,
  },
  lastError: {
    type: String,
    default: null,
  },
  nextAttemptAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Indexes for the polling query
emailJobSchema.index({ status: 1, nextAttemptAt: 1 });

module.exports = mongoose.model('EmailJob', emailJobSchema);
