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
  taskType: {
    type: String,
    enum: ['general', 'blog', 'video', 'software', 'media', 'graphic_design', 'other'],
    default: 'general',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  deadline: {
    type: Date,
    default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
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
    enum: ['pending', 'accepted', 'in_progress', 'under_review', 'completed', 'rejected', 'overdue', 'archived'],
    default: 'pending',
  },
  assignedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  requiredSkills: [{
    type: String,
  }],
  submissionConfig: {
    inputType: {
      type: String,
      enum: ['text', 'image', 'file', 'link', 'multiple_files', 'text_image', 'text_file', 'text_link', 'image_file', 'custom', 'all'],
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
  submissions: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    content: String,
    attachments: [String],
    customData: Map, // Store dynamic field data
    submittedAt: { type: Date, default: Date.now },
  }],
  rejectionReason: String,
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
// Compound indexes for common query patterns
assignedTaskSchema.index({ status: 1, createdAt: -1 }); // Admin: filter by status, sort by newest
assignedTaskSchema.index({ assignedUsers: 1, status: 1 }); // User: my tasks filtered by status
assignedTaskSchema.index({ 'submissions.userId': 1 }); // Daily limit check query

module.exports = mongoose.model('AssignedTask', assignedTaskSchema);
