# Earntix Performance Tuning

## 1. Overview
Scaling Earntix to 15,000+ concurrent users requires strict adherence to memory and CPU optimization principles within Node.js and MongoDB.

## 2. The `.lean()` Principle
As outlined in [10-database-indexes.md](10-database-indexes.md), standard Mongoose queries return fully hydrated Document objects.
- **Cost:** Hydrating 1000 users takes ~300ms and massive RAM.
- **Solution:** `User.find().lean()` returns raw JSON. This takes ~30ms and negligible RAM.
**Enforcement:** ALL read-only list routes (Admin dashboards, task lists, leaderboard) MUST use `.lean()`.

## 3. Projection (Selecting Fields)
Never fetch data you don't need, especially over large arrays.
```javascript
// BAD: Fetches the entire user object including passwordHash, loginHistory (huge array)
const users = await User.find().lean();

// GOOD: Fetches only the required fields
const users = await User.find().select('name email points isVerified').lean();
```

## 4. In-Memory Caching (`node-cache`)
The Earntix backend utilizes `node-cache` (`src/services/cacheService.js`) to offload heavy read operations from MongoDB.

### Heavily Cached Routes:
1. **Leaderboard:** `GET /api/user/leaderboard` is requested constantly. The DB query involves a massive sort. It is cached for 5 minutes.
2. **Public Tasks:** `GET /api/tasks` is cached for 2 minutes. Admin edits to tasks automatically bust this cache.
3. **Login Attempts:** Brute-force tracking is stored in cache, not the DB, to prevent DB write-thrashing during an attack.

## 5. Event Loop Overload Protection
Node.js is single-threaded. If a single bad regex or massive array loop blocks the thread for 2 seconds, ALL 15,000 users stall for 2 seconds.

Earntix uses `toobusy-js` (implemented in the `isOverloaded` middleware).
- It monitors the event loop lag.
- If the lag exceeds `200ms`, it returns `503 Service Unavailable`.
- This ensures the server sheds load gracefully rather than crashing completely.

## 6. Cloudinary Streaming
Files are never loaded fully into RAM. They are streamed directly from the disk using `fs.createReadStream` piped into Cloudinary. This guarantees stable memory usage even if 100 users upload 100MB files simultaneously.
