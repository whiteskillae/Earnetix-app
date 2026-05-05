const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    enum: ['approve', 'reject', 'create_task', 'edit_task', 'delete_task', 'block_user', 'unblock_user'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  targetType: {
    type: String,
    enum: ['submission', 'task', 'user'],
    required: true,
  },
  details: {
    type: String,
    default: null,
  },
  ip: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

adminLogSchema.index({ adminId: 1 });
adminLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AdminLog', adminLogSchema);
