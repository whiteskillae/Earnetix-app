# Common Failure Patterns & Antidotes

This document outlines recurring patterns of failure observed during the audit and provides specific technical antidotes.

---

## 🔄 Pattern 1: The "Ghost Points" Race Condition
**Scenario**: Admin A and Admin B both approve different missions for User X at the exact same millisecond.
- **The Failure**: Both read the same initial point balance. Both add their respective rewards and save. The last one to save "wins", overwriting the other's update. User X loses points.
- **Antidote**: 
  - **Level 1**: Use MongoDB `$inc` operator. This happens at the database engine level and is atomic.
  - **Level 2**: Implement a "Wallet Ledger" where you never update a balance field directly, but instead sum up all `Transaction` documents.

---

## 📤 Pattern 2: The "Large Upload Crash"
**Scenario**: Multiple users try to upload 50MB proof images/files simultaneously on a small server instance.
- **The Failure**: Node.js RAM usage spikes as it holds several 50MB buffers. The server runs out of memory (OOM) and restarts, killing all active sessions.
- **Antidote**: 
  - **Short term**: Limit file size in `multer` to 10MB.
  - **Long term**: Use Pre-signed URLs. The client uploads directly to Cloudinary/S3. The backend only receives the URL and metadata.

---

## 🔑 Pattern 3: The "Token Desync" Loop
**Scenario**: A user's access token expires exactly when they submit a form.
- **The Failure**: The API returns 401. The frontend interceptor tries to refresh but fails due to a network glitch. The user is redirected to login mid-action, losing their form data.
- **Antidote**: 
  - **Technical**: Implement "Retry Queuing" in the Axios interceptor. Queue all failed requests while a refresh is in progress, then replay them once the new token is acquired.

---

## 🕵️ Pattern 4: The "Stale Admin State"
**Scenario**: An admin blocks a user, but the user is already logged in.
- **The Failure**: The user continues to navigate the app because their JWT is still valid for 1 hour.
- **Antidote**: 
  - **Implemented**: The 403 interceptor and `AuthContext` check `isBlocked` on every sensitive API call.
  - **Better**: Use a short-lived Access Token (15 mins) and a "Blacklist" in Redis for immediately revoked tokens.

---

## 📡 Pattern 5: The "Dashboard Latency Crawl"
**Scenario**: The database grows to 100,000 submissions.
- **The Failure**: The admin dashboard takes 10+ seconds to load because it's counting rows in a massive collection.
- **Antidote**: 
  - **Technical**: Use Materialized Views or a separate `Stats` collection. Update the counts asynchronously using a change stream or hook.
