# Earntix Database Indexing Strategy

## 1. Overview
MongoDB indexing is critical for an application expecting 15,000+ concurrent users. Without proper indexes, basic operations (like finding a user's submissions) would require Collection Scans (COLLSCAN), iterating over millions of documents and causing CPU exhaustion.

Earntix uses a combination of Single Field Indexes, Compound Indexes, and Sparse Indexes.

---

## 2. Core Indexes per Collection

### 2.1 User Collection (`users`)
- **`email` (Unique):** Used for login lookups.
- **`uid` (Unique, Sparse):** Used for public profiles and referrals.
- **`username` (Unique, Sparse):** Optional unique handle. *Note: `sparse: true` is critical here to allow multiple users to have a `null` username during onboarding.*
- **`deviceFingerprint` (1):** Used by admins to search for alt-accounts.
- **`registrationIp` (1):** Used to identify bot farms on signup.
- **`{ role: 1, points: -1 }`:** A compound index to instantly retrieve the Leaderboard without sorting in memory.

### 2.2 Task Collection (`tasks`)
- **`isActive` (1):** To filter out soft-deleted tasks on the public dashboard.
- **`createdAt` (-1):** For sorting tasks by newest first.

### 2.3 Submission Collection (`submissions`)
Submissions will be the largest collection by volume.
- **`{ userId: 1, taskId: 1 }`:** To quickly check if a user has already submitted a specific task.
- **`fileHash` (1):** For O(1) duplicate file detection during uploads.
- **`status` (1):** Admin dashboard filtering (e.g., show all 'pending').
- **`{ userId: 1, createdAt: -1 }`:** Required for computing the "Daily Upload Limit" query efficiently.
- **`{ status: 1, createdAt: -1 }`:** Admin dashboard compound index (filter by status AND sort by date).

### 2.4 Admin Logs (`adminlogs`)
- **`adminId` (1):** Audit an admin's historical actions.
- **`{ action: 1, createdAt: -1 }`:** Fast filtering for specific actions (e.g., show all `adjust_points` events).

---

## 3. The `.lean()` Methodology

Even with perfect indexes, Mongoose is inherently slow at hydrating (converting raw BSON into full Mongoose Document instances). Mongoose Documents include getters, setters, and internal tracking logic which inflates memory usage by roughly 5x.

**Rule for all `GET` routes:**
If the route only reads data and sends it to the client (i.e., it doesn't call `.save()`), you MUST use `.lean()`.

*Example from `adminController.js`:*
```javascript
// BAD: Will crash server on 5000 users
const users = await User.find().sort({ createdAt: -1 });

// GOOD: Returns pure JSON objects, minimal memory overhead
const users = await User.find()
  .select('name email points kycStatus accountStatus createdAt uid')
  .sort({ createdAt: -1 })
  .lean();
```

---

## 4. Query Timeouts
Mongoose does not inherently time out operations. If an un-indexed query runs, it could lock the CPU for 10 seconds.
Earntix handles this via the global Event Loop monitor in `app.js`. If the event loop lags more than 200ms, the server automatically returns a `503 Service Unavailable (Overloaded)` error for new requests until the long-running query finishes and the CPU breathes.
