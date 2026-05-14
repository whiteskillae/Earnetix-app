# The Error Book: Failures & Mitigation

This book documents every known and potential failure point in the Earnitix platform.

---

## 🏗️ 1. API & Backend Failures

### [ERR-001] 401 Unauthorized Storm
- **Symptom**: User is logged out suddenly, API calls return 401.
- **Root Cause**: Token expiration mismatch or Refresh Token rotation failure.
- **Impact**: High (User churn).
- **Prevention**: Ensure Axios interceptor properly handles token rotation and concurrent request queuing.

### [ERR-002] 429 Rate Limit Exceeded
- **Symptom**: "Too many requests" message.
- **Root Cause**: Excessive polling from frontend components (e.g., Dashboard reloading every 5 seconds).
- **Prevention**: Implement a custom `useInterval` hook with exponential backoff for data fetching.

### [ERR-003] 504 Gateway Timeout
- **Symptom**: Large evidence upload fails after 30-60 seconds.
- **Root Cause**: Render/Vercel platform timeout for long-running HTTP requests.
- **Prevention**: Chunked uploads or Direct-to-S3/Cloudinary client-side uploads.

---

## 🗄️ 2. Database Failures

### [ERR-101] MongoDB Concurrency Lock
- **Symptom**: Database hangs or latency spikes under load.
- **Root Cause**: Unindexed queries or too many concurrent write locks during mass mission approvals.
- **Prevention**: Audit all `Submission.find()` queries to ensure they hit the `status` or `userId` indexes.

### [ERR-102] Orphaned References
- **Symptom**: Admin dashboard shows "User Not Found" for a submission.
- **Root Cause**: A user was deleted but their submissions remain in the DB.
- **Prevention**: Implement cascading deletes or, preferably, Soft Deletion.

---

## 🔓 3. Authentication Failures

### [ERR-201] Google OAuth "Missing Sub"
- **Symptom**: Google login fails with "Invalid user profile".
- **Root Cause**: User denied email/profile permissions on the Google consent screen.
- **Mitigation**: Clear error messaging on the login screen asking the user to grant required permissions.

### [ERR-202] OTP Delivery Failure
- **Symptom**: User never receives the registration code.
- **Root Cause**: Nodemailer/SMTP provider rate limiting or SPAM filtering.
- **Mitigation**: Use a professional transactional email provider (Postmark, SendGrid).

---

## 🖥️ 4. Frontend Failures

### [ERR-301] State Desync (Points)
- **Symptom**: User sees 5000 points, but withdrawal says "Insufficient balance".
- **Root Cause**: Local state in `AuthContext` not refreshed after a point-modifying event.
- **Fix**: Re-fetch user profile data after mission approval notifications or withdrawal requests.

### [ERR-302] Memory Leak (Modal Overload)
- **Symptom**: Browser tab becomes slow and crashes.
- **Root Cause**: Multiple instances of `Modal.jsx` remaining in the DOM or listeners not cleaned up.
- **Fix**: Use React Portals and ensure `useEffect` cleanup for event listeners.

---

## 💰 5. Withdrawal & Point Failures

### [ERR-401] Double Withdrawal Request
- **Symptom**: User hits "Submit" twice, creating two pending withdrawals.
- **Root Cause**: Frontend button not disabled during submission.
- **Backend Prevention**: `Withdrawal.findOne({ userId, status: 'pending' })` guard (Already implemented).

### [ERR-402] Negative Balance
- **Symptom**: User has -100 points.
- **Root Cause**: Race condition between withdrawal completion and task rejection.
- **Fix**: Add `min: 0` to the `points` field in the Mongoose schema (Already implemented).

---

## 📈 Severity Level Guide
- **🔴 CRITICAL**: Financial loss, Data breach, System downtime.
- **🟠 HIGH**: Broken user flows, Major feature failure.
- **🟡 MEDIUM**: Performance degradation, UI glitches.
- **🔵 LOW**: Typographical errors, minor style issues.
