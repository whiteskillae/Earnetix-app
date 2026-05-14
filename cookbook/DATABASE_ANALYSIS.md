# Database Analysis & Schema Audit

Earnitix utilizes MongoDB with Mongoose ODM. This report analyzes the data structure and indexing strategy.

---

## 🗺️ Data Model Overview

### 1. User Model (`User.js`)
- **Primary Keys**: `_id`, `email` (unique)
- **State Fields**: `points`, `frozenPoints`, `kycStatus`, `role`, `isBlocked`
- **Security Fields**: `passwordHash`, `refreshToken`, `deviceFingerprint`, `loginHistory`
- **Audit**: `registrationIp`, `timestamps: true`
- **Indexing**: 
    - `deviceFingerprint: 1` (Fraud detection)
    - `registrationIp: 1` (Multi-account detection)
    - `role: 1, points: -1` (Leaderboard optimization)

### 2. Task Model (`Task.js`)
- **Purpose**: Campaign definition.
- **Fields**: `rewardPoints`, `inputType` (enum), `maxSubmissionsPerUser`, `isActive`.
- **Indexing**: `isActive: 1`, `createdAt: -1`.

### 3. Submission Model (`Submission.js`)
- **Purpose**: Evidence tracking.
- **Fields**: `fileHash` (Deduplication), `status` (pending/approved/rejected), `canResubmit`.
- **Indexing**: 
    - `userId: 1, taskId: 1` (Prevents duplicate entries)
    - `fileHash: 1` (Deduplication lookup)
    - `userId: 1, createdAt: -1` (Performance for profile history)

### 4. Withdrawal Model (`Withdrawal.js`)
- **Purpose**: Payment ledger.
- **Fields**: `pointsUsed`, `amountUSD`, `status`, `bankDetails` (Snapshot of bank info at time of request).
- **Indexing**: `userId: 1, status: 1`, `status: 1, createdAt: -1`.

---

## 🔍 Critical Findings & Risks

### 1. Deduplication Strategy
The `fileHash` (SHA-256) in `Submission` is the only guard against duplicate file uploads. 
- **Risk**: A minor edit to an image (re-save or crop) changes the hash.
- **Recommendation**: Implement Perceptual Hashing (pHash) for images to catch "near-duplicates".

### 2. Transaction Management
Missions approval and Withdrawal processing involve multi-document updates:
- Approve: `Submission` update + `User` points update + `AdminLog` create.
- **Risk**: If the server crashes between updating the submission and updating user points, the user loses their reward.
- **Recommendation**: Use Mongoose Transactions (`session.startTransaction()`) for all point-related logic.

### 3. Denormalization vs. Referencing
- `Withdrawal` stores a snapshot of `bankDetails`. This is **Good practice** as it prevents payment issues if a user changes their bank details after requesting a withdrawal.
- `Submission` references `taskId`. If a task is deleted, the submission becomes orphaned or causes errors.
- **Recommendation**: Implement Soft Deletes (`isActive: false`) instead of hard deletes for Tasks.

### 4. Scalability of Leaderboard
Current leaderboard uses an index on `points`. 
- **Capacity**: For 10,000 users, this is fine. 
- **Risk**: For 1M users, fetching "Top 100" is fast, but calculating "Your Rank" is expensive.
- **Recommendation**: Use Redis Sorted Sets for real-time leaderboards at scale.

---

## 📐 Entity Relationship Diagram (Mental)
`User` (1) --- (N) `Submission`
`Task` (1) --- (N) `Submission`
`User` (1) --- (N) `Withdrawal`
`Admin` (1) --- (N) `AdminLog`
