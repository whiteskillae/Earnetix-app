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
  submissionConfig: {
    inputType: {
      type: String,
      enum: ['text', 'image', 'file', 'link', 'multiple_files', 'text_image', 'text_file', 'text_link', 'custom', 'all'],
      default: 'file'
    },
    customFields: [{
      label: String,
      fieldType: { type: String, enum: ['text', 'textarea', 'file', 'image', 'url'] },
      placeholder: String,
      required: { type: Boolean, default: true }
    }],
    maxFileSize: { type: Number, default: 5 * 1024 * 1024 }, // 5MB default
    allowedExtensions: { type: [String], default: ['jpg', 'jpeg', 'png', 'webp', 'mp3', 'mp4', 'docx', 'pdf', 'txt', 'zip'] }
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
