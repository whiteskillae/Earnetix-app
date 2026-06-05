# Earntix Testing Strategy

## 1. Overview
Given the financial nature of Earntix (points equating to real money), regression testing is non-negotiable. 

## 2. Load Testing (`autocannon`)
To simulate 15,000+ users, we use `autocannon`.
Before production launches, run load tests against the core API endpoints (especially Auth and Submissions) to ensure the `isOverloaded` middleware functions correctly and PM2 cluster mode distributes the load evenly.

```bash
# Example Load Test: 1000 connections for 30 seconds
npx autocannon -c 1000 -d 30 http://localhost:5000/api/tasks
```

## 3. Unit & Integration Testing
*(Note: A formal test suite like Jest/Supertest should be implemented).*

### Critical Paths to Test:
1. **Point Atomicity:**
   - Write a script that attempts to fire 50 simultaneous withdrawal requests for the same user.
   - Assert that only ONE request succeeds and the `frozenPoints` strictly equals the requested amount.
2. **File Validation:**
   - Attempt to upload an `.exe` disguised as a `.png`.
   - Assert that the server rejects it.
3. **Admin Logging:**
   - Hit an admin endpoint to adjust points.
   - Assert that an exact log was generated in the `AdminLog` collection.

## 4. Manual QA Matrix
Before any major release, manually verify:
- **Registration:** Can register, receive OTP, verify, and complete profile.
- **Submissions:** Can upload a file, admin can reject it, user can resubmit, admin can approve, points are accurately added.
- **Withdrawals:** Can request withdrawal, admin can approve (points burned), or reject (points unfrozen).
- **Rate Limits:** Purposely fail login 15 times and ensure the account is temporarily blocked for 30 minutes.
