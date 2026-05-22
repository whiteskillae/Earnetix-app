const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema({
  dateString: {
    type: String,
    required: true,
    unique: true, // Format: YYYY-MM-DD
  },
  apiHits: {
    type: Number,
    default: 0,
  },
  pageViews: {
    type: Number,
    default: 0,
  },
  uniqueVisitors: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

// Index for fast time-series queries
analyticsSchema.index({ dateString: -1 });

module.exports = mongoose.model('Analytics', analyticsSchema);
