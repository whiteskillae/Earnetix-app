const mongoose = require('mongoose');

const assignedTaskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  deadline: {
    type: Date,
    required: [true, 'Deadline is required'],
  },
  rewardPoints: {
    type: Number,
    required: [true, 'Reward points are required'],
    min: 0,
  },
  attachments: [{
    name: String,
    url: String,
  }],
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in_progress', 'completed', 'rejected', 'overdue'],
    default: 'pending',
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  requiredSkills: [{
    type: String,
  }],
  submissions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    attachments: [String],
    submittedAt: { type: Date, default: Date.now },
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }
}, {
  timestamps: true,
});

assignedTaskSchema.index({ status: 1 });
assignedTaskSchema.index({ assignedUsers: 1 });
assignedTaskSchema.index({ deadline: 1 });

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
