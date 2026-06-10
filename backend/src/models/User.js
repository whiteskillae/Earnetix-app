const mongoose = require('mongoose');
const crypto = require('crypto');
const { encrypt, decrypt } = require('../utils/encryption');


const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: 100,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    default: null, // null for Google auth users
  },
  username: {
    type: String,
    sparse: true,
    unique: true,
    minlength: 3,
    maxlength: 20,
    match: [/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'],
  },
  bio: {
    type: String,
    maxlength: 200,
    default: '',
  },
  uid: {
    type: String,
    sparse: true,
    unique: true,
    maxlength: 15,
  },
  lastUsernameChange: {
    type: Date,
    default: null,
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user',
  },
  authProvider: {
    type: String,
    enum: ['local', 'google'],
    default: 'local',
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  accountStatus: {
    type: String,
    enum: ['processing', 'active', 'blocked'],
    default: 'processing',
  },
  points: {
    type: Number,
    default: 0,
    min: 0,
  },
  deviceFingerprint: {
    type: String,
    default: null,
  },
  otp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    lastRequestAt: { type: Date, default: null },
    dailyCount: { type: Number, default: 0 },
    lastDailyReset: { type: Date, default: null },
  },
  refreshToken: {
    type: String,
    default: null,
  },
  avatar: {
    type: String,
    default: null,
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  blockedUntil: {
    type: Date,
    default: null,
  },
  registrationIp: {
    type: String,
    default: null,
  },
  mobileNumber: {
    type: String,
    default: null,
  },
  countryCode: {
    type: String,
    default: null,
  },
  country: {
    type: String,
    default: null,
  },
  isProfileComplete: {
    type: Boolean,
    default: false,
  },
  qualifications: {
    type: String,
    default: null,
  },
  skills: {
    type: [String],
    default: [],
  },
  onboardingVersion: {
    type: Number,
    default: 0,
  },
  // ─── KYC FIELDS ──────────────────────────────────────
  kycStatus: {
    type: String,
    enum: ['none', 'pending', 'verified', 'rejected'],
    default: 'none',
  },
  kycDocumentUrl: { type: String, default: null },
  kycDocumentPublicId: { type: String, default: null },
  kycDocumentType: {
    type: String,
    enum: ['aadhar', 'passport', 'national_id', null],
    default: null,
  },
  kycDocumentNumber: {
    type: String,
    sparse: true,
    unique: true,
  },
  kycRejectionReason: { type: String, default: null },
  kycSubmittedAt: { type: Date, default: null },
  kycVerifiedAt: { type: Date, default: null },
  // ─── WITHDRAWAL FIELDS ───────────────────────────────
  frozenPoints: {
    type: Number,
    default: 0,
    min: 0,
  },
  bankDetails: {
    accountName: { type: String, default: null },
    accountNumber: { 
      type: String, 
      default: null,
      get: decrypt,
      set: encrypt,
      select: false // Never return by default in queries
    },
    ifscCode: { 
      type: String, 
      default: null,
      get: decrypt,
      set: encrypt,
      select: false 
    },
    bankName: { type: String, default: null },
    upiId: { 
      type: String, 
      default: null,
      get: decrypt,
      set: encrypt,
      select: false 
    },
  },
  lastBankDetailsUpdated: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { getters: true },
  toObject: { getters: true }
});

// Indexes for fast lookup
userSchema.index({ deviceFingerprint: 1 });
userSchema.index({ registrationIp: 1 });
userSchema.index({ role: 1, points: -1 }); // Index for leaderboard

// Pre-save hook to generate UID
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.uid) {
    // Generate a unique collision-resistant 8-character ID
    // The unique: true index in MongoDB will handle the extremely rare case of a collision
    this.uid = 'E' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }
  next();
});

// Never return sensitive fields in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject({ getters: true });
  delete obj.passwordHash;
  delete obj.otp;
  delete obj.refreshToken;
  delete obj.__v;
  // Make sure bank details aren't accidentally exposed completely
  // Explicitly mask them or delete them for non-admins if needed, 
  // but `select: false` generally prevents them from even loading.
  if (obj.bankDetails) {
    if (obj.bankDetails.accountNumber) obj.bankDetails.accountNumber = '****' + obj.bankDetails.accountNumber.slice(-4);
    if (obj.bankDetails.upiId) obj.bankDetails.upiId = '****' + obj.bankDetails.upiId.slice(-4);
  }
  return obj;
};

module.exports = mongoose.model('User', userSchema);
