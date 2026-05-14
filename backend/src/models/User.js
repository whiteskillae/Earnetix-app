const mongoose = require('mongoose');

const loginEntrySchema = new mongoose.Schema({
  ip: String,
  userAgent: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

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
  points: {
    type: Number,
    default: 0,
    min: 0,
  },
  deviceFingerprint: {
    type: String,
    default: null,
  },
  loginHistory: {
    type: [loginEntrySchema],
    default: [],
  },
  otp: {
    code: { type: String, default: null },
    expiresAt: { type: Date, default: null },
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
    accountNumber: { type: String, default: null },
    ifscCode: { type: String, default: null },
    bankName: { type: String, default: null },
    upiId: { type: String, default: null },
  },
}, {
  timestamps: true,
});

// Indexes for fast lookup
userSchema.index({ deviceFingerprint: 1 });
userSchema.index({ registrationIp: 1 });
userSchema.index({ role: 1, points: -1 }); // Index for leaderboard
userSchema.index({ uid: 1 });
userSchema.index({ username: 1 });

// Pre-save hook to generate UID
userSchema.pre('save', async function (next) {
  if (this.isNew && !this.uid) {
    let isUnique = false;
    while (!isUnique) {
      const newUid = 'E' + Math.floor(10000000 + Math.random() * 90000000);
      const existing = await mongoose.models.User.findOne({ uid: newUid });
      if (!existing) {
        this.uid = newUid;
        isUnique = true;
      }
    }
  }
  next();
});

// Never return sensitive fields in JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otp;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
