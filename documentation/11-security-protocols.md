# Earntix Security Protocols

## 1. Overview
As a platform handling user money, KYC data, and file uploads, security is the top priority. This document outlines the 5 main security vectors and how Earntix mitigates them.

---

## 2. Injection & XSS Protection

### 2.1 Database Injection
Earntix uses Mongoose which inherently sanitizes queries by casting them to schema types. However, to protect against `$ne` or `$where` NoSQL injection attacks, `express-mongo-sanitize` is applied globally in `app.js`.

### 2.2 Cross-Site Scripting (XSS)
- The global `xss-clean` middleware strips `<script>` tags and malicious HTML from all incoming `req.body`, `req.query`, and `req.params`.
- React automatically escapes variables on the frontend.
- `helmet()` secures HTTP headers, enforcing strict Content Security Policies (CSP) and preventing MIME-sniffing.

---

## 3. Rate Limiting & DoS Protection

### 3.1 Global Rate Limiter
Applied to all routes except Admin routes (to ensure admins can always manage the platform).
- 1500 requests per 5 minutes per IP.

### 3.2 Authentication Bruteforce Limiter
- 15 login attempts per minute. Exceeding this blocks the IP/Email for 30 minutes (enforced via Node Cache).
- OTP requests are limited to 4 per 24 hours per email.

### 3.3 Event Loop Starvation Protection
The custom `isOverloaded` middleware monitors the Node.js event loop lag. If a complex query or regex parsing causes the CPU to lock for >200ms, the server instantly returns a `503 Service Unavailable` for new non-admin requests. This prevents a slow endpoint from cascading and crashing the entire server under high load.

---

## 4. File Upload Security
Uploads are the highest risk vector for Remote Code Execution (RCE) and Cloud Billing DoS attacks.
See [08-storage-system.md](08-storage-system.md) for full details, but key protocols include:
1. Blocklist of 30+ executable extensions.
2. Magic Bytes scanning.
3. Max file size constraints enforced at the `multer` streaming layer.
4. Pre-upload SHA-256 deduplication to prevent Cloudinary spam.

---

## 5. Token & Session Security
1. **No LocalStorage for Tokens:** Access tokens are stored purely in React Context (RAM). If an XSS vulnerability is found, the attacker cannot steal the token because it doesn't exist in the DOM.
2. **HttpOnly Refresh Tokens:** Refresh tokens are immune to XSS as they are sent automatically by the browser via HttpOnly cookies.
3. **SameSite=Strict/Lax:** Prevents Cross-Site Request Forgery (CSRF).
4. **Token Rotation:** Every time a user refreshes their token, a brand new Refresh Token is issued and the old one is invalidated in the Database.

---

## 6. Business Logic Security
- **Atomic Operations:** Points are modified strictly using MongoDB `$inc` via `pointService.js` to prevent double-spending race conditions.
- **Bank Detail Lock:** Changing bank details imposes a hard 48-hour cooldown on withdrawals to prevent instant draining if an account is compromised.
- **Admin Zero Trust:** All admin destructive actions are logged in the immutable `AdminLog` collection.
