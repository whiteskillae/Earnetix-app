const mongoose = require('mongoose');
const { encrypt, decrypt } = require('../utils/encryption');

const withdrawalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  pointsUsed: {
    type: Number,
    required: true,
    min: 3000,
  },
  amountUSD: {
    type: Number,
    required: true,
    min: 30,
  },
  bankDetails: {
    accountName: { type: String, required: true },
    accountNumber: { 
      type: String, 
      required: true,
      get: decrypt,
      set: encrypt,
      select: false 
    },
    ifscCode: { 
      type: String, 
      default: null,
      get: decrypt,
      set: encrypt,
      select: false 
    },
    bankName: { type: String, required: true },
    upiId: { 
      type: String, 
      default: null,
      get: decrypt,
      set: encrypt,
      select: false 
    },
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'rejected'],
    default: 'pending',
  },
  adminNote: {
    type: String,
    default: null,
  },
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  processedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Mask sensitive fields in JSON
withdrawalSchema.methods.toJSON = function () {
  const obj = this.toObject({ getters: true });
  delete obj.__v;
  if (obj.bankDetails) {
    if (obj.bankDetails.accountNumber) obj.bankDetails.accountNumber = '****' + obj.bankDetails.accountNumber.slice(-4);
    if (obj.bankDetails.upiId) obj.bankDetails.upiId = '****' + obj.bankDetails.upiId.slice(-4);
  }
  return obj;
};

// Indexes for fast lookup
withdrawalSchema.index({ userId: 1, status: 1 });
withdrawalSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Withdrawal', withdrawalSchema);
