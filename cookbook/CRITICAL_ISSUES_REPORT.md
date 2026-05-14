# Critical Issues & High-Risk Report

This report summarizes the "MUST FIX" issues identified during the audit.

---

## 🔴 [CRITICAL] Non-Atomic Point Awards
- **Category**: Integrity / Financial
- **Description**: Points are awarded to users using standard object updates (`user.points += val; await user.save()`) instead of atomic `$inc` operations or Mongoose transactions.
- **Impact**: In high-concurrency scenarios, users may lose points or gain duplicates if multiple admins approve tasks at once.
- **Fix**: Switch to `User.findByIdAndUpdate(id, { $inc: { points: val } })` or use transactions.

## 🔴 [CRITICAL] Administrative Logic Leaks
- **Category**: Security
- **Description**: Some user-facing endpoints (like Profile fetch) return sensitive fields that are intended only for admin use (e.g., `registrationIp`, `deviceFingerprint`).
- **Impact**: Potential privacy violations and aids attackers in understanding internal security checks.
- **Fix**: Update the `toJSON` method in `User.js` to whitelist only public fields.

## 🟠 [HIGH] Synchronous Large File Processing
- **Category**: Performance / Stability
- **Description**: Large evidence files (50MB) are uploaded to the API server, held in RAM, and then sent to Cloudinary.
- **Impact**: Server crashes due to Memory (OOM) errors during peak periods.
- **Fix**: Move to client-side direct-to-Cloudinary uploads using signed payloads.

## 🟠 [HIGH] Un-indexed Aggregation
- **Category**: Scalability
- **Description**: The Admin Dashboard counts submissions and calculates totals using expensive collection scans.
- **Impact**: Dashboard will become unresponsive once the database reaches 50k+ records.
- **Fix**: Implement a `Stats` collection for pre-aggregated daily totals.

---

## 📈 Risk Summary Table

| Area | Risk Level | Fix Priority | Estimated Effort |
|------|------------|--------------|------------------|
| Point Logic | **Critical** | P0 | 1 Day |
| Admin Panel | **High** | P1 | 1 Day |
| File Uploads | **High** | P1 | 2 Days |
| DB Queries | **Medium** | P2 | 3 Days |
| Auth Security| **Low** | P3 | 1 Day |
