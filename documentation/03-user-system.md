# Earntix User Management & KYC System

## 1. Overview
The User system is the core of Earntix, managing authentication state, wallets (points), user profiles, KYC (Know Your Customer) verification, and banking details. The `User.js` Mongoose model is central to this.

---

## 2. The User State Machine
Users transition through several distinct states across different properties:

### 2.1 `isVerified` (Email Verification)
- **`false`**: Registration initiated. (Stored in Redis/cache only; not yet in MongoDB).
- **`true`**: OTP provided, user exists in MongoDB.

### 2.2 `isProfileComplete`
- **`false`**: User just signed up. Must complete the onboarding form (name, username, mobile, skills, country).
- **`true`**: Form completed. Can access dashboard.

### 2.3 `kycStatus` (Identity Verification)
- **`none`**: Default. Can view tasks but cannot submit proofs or request withdrawals.
- **`pending`**: User submitted an ID document. Awaiting admin review.
- **`verified`**: Admin approved. User is fully operational.
- **`rejected`**: Admin rejected (e.g., blurry ID). User must resubmit.

### 2.4 `accountStatus`
- **`processing`**: Newly registered.
- **`active`**: Fully active.
- **`blocked`**: Soft-banned by admin. Can log in but cannot perform actions.
*(Note: A harder ban exists via `isBlocked: true` which completely prevents login).*

---

## 3. Profile & Data Schema

The `User.js` model contains highly sensitive data. To protect it:
1. **Never return sensitive fields to the client.** The model includes a `toJSON` override:
```javascript
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.otp;
  delete obj.refreshToken;
  delete obj.__v;
  return obj;
};
```
2. **Auto-generated UID:** A unique `uid` (e.g., `E12345678`) is generated via a `pre('save')` hook for public referencing.
3. **Sparse Indexes:** Fields like `username` and `kycDocumentNumber` are sparse/unique, preventing duplicates without crashing on nulls.

---

## 4. Banking Details & Security Locks

Users must save bank details (`bankDetails` object) before withdrawing.
**Security Measure:** To prevent account takeover attacks where a hacker changes the bank details and immediately withdraws funds, there is a **48-hour cooldown** enforced on the `saveBankDetails` route.
```javascript
// From withdrawalController.js
if (user.lastBankDetailsUpdated) {
  const timeSinceUpdate = Date.now() - new Date(user.lastBankDetailsUpdated).getTime();
  if (timeSinceUpdate < 48 * 60 * 60 * 1000) {
    throw new Error('Security Lock: You can only update bank details once every 48 hours.');
  }
}
```

---

## 5. Security & Analytics Tracking

- **`loginHistory`**: Tracks the last 20 logins (`ip`, `userAgent`, `timestamp`).
- **`deviceFingerprint`**: Passed from the frontend to track unique devices. Used to detect multiple accounts originating from the same physical device.
- **`registrationIp`**: Hardcoded upon creation. Used to identify bot farms.

## 6. Common Issues

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| `Cannot read properties of undefined (reading 'accountName')` | Legacy user without `bankDetails` object. | Add a migration script or defensive checks (`user.bankDetails?.accountName`). |
| `Duplicate key error index: username_1 dup key: { : null }` | `sparse: true` is missing on the `username` index in MongoDB. | Ensure index is rebuilt with `sparse: true`. |
| Cannot login after 15 attempts. | Brute force trigger. | Admin must clear the `login_attempts` cache or wait 30 mins. |
