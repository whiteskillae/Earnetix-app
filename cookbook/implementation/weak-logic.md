# Weak Logic & Anti-Patterns Audit

This report documents specific blocks of code where the logic is inefficient, risky, or follows anti-patterns.

---

## 1. Wasteful File Deduplication
- **File**: `backend/src/controllers/submissionController.js`
- **Logic**: In `submitProof`, the system uploads the file to Cloudinary, receives a hash in the response, then checks for duplicates in the DB. If a duplicate exists, it deletes the file from Cloudinary.
- **Risk**: 
    - Wasted bandwidth and API credits.
    - Slower response time for the user.
    - Potential for orphaned Cloudinary assets if the deletion call fails.
- **Better Approach**: Hash the file buffer locally using the `crypto` module *before* the upload call. Check the DB for the hash. If unique, then upload.

---

## 2. Sequential Await in Admin Dashboard
- **File**: `backend/src/controllers/adminController.js`
- **Logic**: The `getDashboard` function uses `await Promise.all()` for some counts, but several `require` statements and additional logic are executed sequentially.
- **Risk**: Unnecessary blocking of the event loop.
- **Better Approach**: Move all `require` statements to the top of the file and ensure all independent counts are truly parallelized.

---

## 3. Lack of Concurrency Control in Point Awards
- **File**: `backend/src/services/pointService.js`
- **Logic**: `awardPoints` fetches a user, adds points, and saves.
- **Risk**: **Race Condition**. If two threads approve missions for the same user simultaneously, both might read `points = 100`, add `10`, and both save `110`, resulting in `110` instead of `120`.
- **Better Approach**: Use MongoDB atomic `$inc` or a transactional lock.

---

## 4. Onboarding Redirect Loops
- **File**: `frontend/src/pages/OnboardingPage.jsx`
- **Logic**: Dependency on `kycStatus` in `AuthContext` triggers redirects.
- **Risk**: If the API returns a slightly different status string or is `null`, the user can get stuck in a redirect loop between Dashboard and Onboarding.
- **Better Approach**: Implement a robust state-machine for onboarding transitions.

---

## 5. Generic Error Catching
- **File**: `backend/src/middleware/errorHandler.js`
- **Logic**: Generic `400` status for any `Error` object.
- **Risk**: Users might see "Bad Request" for internal service failures (like Cloudinary being down), which should be a `502` or `503`.
- **Better Approach**: Subclass `Error` (e.g., `AppError`, `ValidationError`, `AuthError`) and check instances in the handler.
