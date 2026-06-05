# Earntix Admin System & Logging

## 1. Overview
The Admin system is designed with a zero-trust mindset. Not only are standard users prevented from accessing admin routes, but every single destructive or significant action performed by an admin is permanently recorded in the `AdminLog` collection. This prevents rogue admins from making untraceable changes.

## 2. Authentication & Authorization
Admins authenticate through the standard `/api/auth/login` endpoint.

To restrict access, the `isAdmin` middleware is applied to all `/api/admin` and admin-specific routes:
```javascript
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ success: false, message: 'Access denied. Admins only.' });
  }
};
```

**Note:** The system allows for a "System Admin" to be created dynamically on boot using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` environment variables.

## 3. The AdminLog Ledger
Every time an admin performs a sensitive action, a record is added to the `adminlogs` collection.

### 3.1 What is logged?
- **User Actions:** Block, Unblock, Temp Block, Point Adjustments, KYC Verifications/Rejections, Delete User.
- **Task Actions:** Create, Edit, Delete (Archive), Approve/Reject Submissions.
- **Financial Actions:** Complete or Reject Withdrawals.
- **System Events:** Important automated events (like registrations and system errors).

### 3.2 Security Implications
The `AdminLog` is append-only. There are NO API endpoints available to delete or modify logs.
If an admin attempts to maliciously modify a user's points:
```javascript
await AdminLog.create({
  adminId: req.user._id,
  action: 'adjust_points',
  targetId: user._id,
  targetType: 'user',
  details: `Adjusted points by 500. Reason: Manual adjustment`,
  ip: req.ip,
});
```
The original `adminId`, `targetId`, and `ip` are permanently recorded.

## 4. Admin Management Flows

### User Management
- View all users (paginated and optimized with `.lean()`).
- Block users (sets `isBlocked: true`).
- Enforce temporary blocks (`blockedUntil: Date`).

### KYC Management
- Review `pending` KYC documents.
- Approving sets `kycStatus: 'verified'`.
- Rejecting requires a `kycRejectionReason` string so the user knows what to fix.

### Financial Controls
- Admins can directly adjust user points (`points` or `frozenPoints`).
- Approve or Reject Withdrawals (which triggers atomic point deduction or unfreezing — see `07-coin-system.md`).

## 5. Potential Pitfalls
- **Accidental Bulk Deletions:** Admin routes that perform bulk actions (e.g., bulk reject submissions) must run sequentially inside a loop (or using `Promise.allSettled`) to ensure that if one fails, the others still process and individual `AdminLogs` are created for each target.
- **Soft vs Hard Deletes:** Tasks are "soft-deleted" (`isActive: false`) rather than hard-deleted. This is critical because past submissions point to these tasks. If a task is hard-deleted, old submissions will crash the user dashboard when trying to populate the task details.
