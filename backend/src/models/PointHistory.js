const mongoose = require('mongoose');

const pointHistorySchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['earned', 'spent', 'deducted'],
    required: true,
  },
  reason: {
    type: String,
    required: true,
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId, // Optional: reference to the task, blog, or withdrawal ID
    default: null,
  },
  referenceModel: {
    type: String, // E.g. 'Task', 'Blog', 'AssignedTask', 'Withdrawal'
    default: null,
  }
}, {
  timestamps: true,
});

pointHistorySchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('PointHistory', pointHistorySchema);
