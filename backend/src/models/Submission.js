const mongoose = require('mongoose');

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true,
  },
  textContent: {
    type: String,
    trim: true,
    maxlength: 5000,
    default: null,
  },
  attachments: [{
    url: String,
    publicId: String,
    resourceType: String,
    originalName: String,
  }],
  fileHash: {
    type: String,
    default: null, // SHA-256 hash for duplicate detection
  },
  linkUrl: {
    type: String,
    trim: true,
    default: null,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  rejectionReason: {
    type: String,
    default: null,
    maxlength: 500,
  },
  canResubmit: {
    type: Boolean,
    default: false, // only true after rejection
  },
  submissionCount: {
    type: Number,
    default: 1,
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
}, {
  timestamps: true,
});

submissionSchema.index({ userId: 1, taskId: 1 });
submissionSchema.index({ fileHash: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ userId: 1, createdAt: -1 }); // for daily limit queries
// Compound indexes for admin review performance
submissionSchema.index({ status: 1, createdAt: -1 }); // Admin: filter pending + sort by newest
submissionSchema.index({ taskId: 1, status: 1 }); // Per-task submission counts (stats aggregation)


module.exports = mongoose.model('Submission', submissionSchema);
