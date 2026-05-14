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
}, {
  timestamps: true,
});

// Indexes for fast lookup
userSchema.index({ deviceFingerprint: 1 });
userSchema.index({ registrationIp: 1 });
userSchema.index({ role: 1, points: -1 }); // Index for leaderboard

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
