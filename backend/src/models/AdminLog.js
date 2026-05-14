const mongoose = require('mongoose');

const adminLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    enum: [
      'approve', 'reject', 'create_task', 'edit_task', 'delete_task', 
      'block', 'unblock', 'block_user', 'unblock_user', 'adjust_points', 'temp_block',
      'approve_assigned', 'reject_assigned',
      'kyc_verify', 'kyc_reject', 'kyc_block',
      'withdrawal_complete', 'withdrawal_reject', 'withdrawal_block_user'
    ],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  targetType: {
    type: String,
    enum: ['submission', 'task', 'user', 'assigned_task', 'withdrawal'],
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
