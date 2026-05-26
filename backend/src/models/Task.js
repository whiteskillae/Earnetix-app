const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Task title is required'],
    trim: true,
    maxlength: 200,
  },
  description: {
    type: String,
    required: [true, 'Task description is required'],
    trim: true,
    maxlength: 2000,
  },
  rewardPoints: {
    type: Number,
    required: [true, 'Reward points are required'],
    min: 1,
    max: 10000,
  },
  taskType: {
    type: String,
    enum: ['general', 'blog', 'video', 'software', 'media', 'graphic_design', 'other'],
    default: 'general',
  },
  inputType: {
    type: String,
    enum: ['text', 'image', 'file', 'link', 'text_image', 'text_link', 'all'],
    required: [true, 'Input type is required'],
  },
  allowedExtensions: {
    type: [String],
    default: ['jpg', 'jpeg', 'png', 'webp'],
  },
  maxFileSize: {
    type: Number,
    default: 5 * 1024 * 1024, // 5MB
  },
  maxSubmissionsPerUser: {
    type: Number,
    default: 1,
    min: 1,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  attachments: [{
    name: String,
    url: String,
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
});

taskSchema.index({ isActive: 1 });
taskSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Task', taskSchema);
