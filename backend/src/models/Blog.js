const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  name: String,
  url: String,
  type: { type: String, enum: ['image', 'pdf', 'iframe', 'link'], default: 'image' },
  publicId: String, // Cloudinary public_id for deletion
}, { _id: false });

const blogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    // Can reference either Task or AssignedTask
  },
  taskType: {
    type: String,
    enum: ['public', 'assigned'],
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Blog title is required'],
    trim: true,
    maxlength: 200,
  },
  // HTML content (all pages concatenated with page-break divs)
  content: {
    type: String,
    required: [true, 'Blog content is required'],
  },
  // Individual pages stored separately
  pages: {
    type: [String],
    default: [],
  },
  coverImage: {
    type: String,
    default: null,
  },
  coverImagePublicId: {
    type: String,
    default: null,
  },
  excerpt: {
    type: String,
    maxlength: 500,
    default: '',
  },
  attachments: {
    type: [attachmentSchema],
    default: [],
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'blocked'],
    default: 'pending',
  },
  rejectionCount: {
    type: Number,
    default: 0,
    min: 0,
    max: 2,
  },
  rejectionReason: {
    type: String,
    default: null,
    maxlength: 1000,
  },
  publishedAt: {
    type: Date,
    default: null,
  },
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  reviewedAt: {
    type: Date,
    default: null,
  },
  // Word count for display
  wordCount: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

blogSchema.index({ userId: 1 });
blogSchema.index({ taskId: 1, userId: 1 });
blogSchema.index({ status: 1 });
blogSchema.index({ publishedAt: -1 });
blogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Blog', blogSchema);
