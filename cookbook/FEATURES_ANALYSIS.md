# Feature Analysis & Logic Audit

This report breaks down the primary features of Earnitix, their internal logic, dependencies, and potential risks.

---

## 1. User Onboarding & Authentication
*   **Purpose**: Securely register users, verify identity via OTP/Google, and initialize profile state.
*   **Internal Flow**: 
    1.  User registers (`/api/auth/register`) -> OTP generated and emailed.
    2.  User verifies OTP (`/api/auth/verify-otp`) -> JWT issued.
    3.  Profile Completion (`/api/auth/complete-profile`) -> Sets basic metadata.
    4.  KYC Submission (`/api/kyc/submit`) -> Uploads ID to Cloudinary, sets status to `pending`.
*   **Logic Risk**: 
    - **OTP Bruteforce**: Mitigation exists (Rate Limiting) but needs monitoring.
    - **KYC Bypass**: UI restricts access, but backend guards must be consistently applied across ALL earning endpoints.
*   **Scalability**: High (stateless JWT).

---

## 2. Global Earning System (Tasks & Submissions)
*   **Purpose**: Enable users to complete campaigns and missions for points.
*   **Internal Flow**: 
    1.  User fetches active tasks (`/api/tasks`).
    2.  User submits proof (`/api/submissions`) -> File hashed to prevent duplicates.
    3.  Admin reviews (`/api/admin/submissions/:id/approve`) -> Calls `awardPoints` service.
    4.  Points added to user balance.
*   **Logic Risk**: 
    - **Race Condition**: If two admins approve the same submission (rare) or if points are awarded twice during database latency.
    - **Duplicate Submissions**: Prevention relies on `fileHash`. If a user modifies 1 pixel, the hash changes (weak deduplication).
*   **Scalability**: Medium (Heavy DB writes during peak review periods).

---

## 3. KYC Verification Pipeline
*   **Purpose**: Identity verification for regulatory compliance and fraud prevention.
*   **Internal Flow**: 
    - `User` model tracks `kycStatus` (enum: none, pending, verified, rejected).
    - `OnboardingPage` forces KYC upload after profile setup.
    - Admin Review (`KycReview.jsx`) allows manual document inspection.
*   **Logic Risk**: 
    - **Storage Cost**: High-res images on Cloudinary.
    - **Verification Latency**: Manual review creates a bottleneck for onboarding 10,000+ users.

---

## 4. Automated Withdrawal Engine
*   **Purpose**: Convert earned points into currency and transfer to bank.
*   **Internal Flow**: 
    1.  User submits bank details.
    2.  User requests conversion (Min 3000 pts).
    3.  Points moved from `points` to `frozenPoints` (locking).
    4.  Admin processes payment -> `frozenPoints` deducted permanently.
*   **Logic Risk**: 
    - **Double Spending**: Locked points logic is solid, but needs strict ACID transactions in MongoDB to ensure point/frozenPoint updates never fail mid-way.
    - **Min Balance**: Enforced at 3000 pts. If point-to-USD conversion logic changes, historical requests might be inconsistent.

---

## 5. Admin Intelligence & Controls
*   **Purpose**: Platform management, moderation, and data visualization.
*   **Internal Flow**: 
    - `adminGuard` middleware restricts access based on `role: 'admin'`.
    - Dashboard aggregates stats using MongoDB `$group` and `countDocuments`.
*   **Logic Risk**: 
    - **Dashboard Performance**: `countDocuments` on 1M+ rows will be slow. Needs pre-aggregated stats or cached totals.

---

## 📊 Summary Feature Health

| Feature | Logic Maturity | Security | Scalability Risk |
|---------|---------------|----------|-----------------|
| Auth | 🟢 High | 🟢 High | 🔵 Low |
| Earning | 🟡 Medium | 🟡 Medium | 🔴 High (Concurrency) |
| KYC | 🟢 High | 🟡 Medium | 🟡 Medium (Manual) |
| Withdrawal | 🟡 Medium | 🟢 High | 🔵 Low |
| Admin | 🟢 High | 🟢 High | 🔴 High (Query Cost) |
