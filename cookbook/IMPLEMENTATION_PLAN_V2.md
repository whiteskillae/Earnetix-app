# Master Fix Implementation Plan v2

## Phase Order & Risk Assessment

| Phase | Fix | Risk | Files Affected |
|-------|-----|------|----------------|
| 1 | Atomic Point Updates | **CRITICAL** | pointService.js, adminController.js, withdrawalController.js |
| 2 | ACID Transactions | **HIGH** | adminController.js, withdrawalController.js |
| 3 | Upload Security & Validation | **HIGH** | uploadService.js, uploadMiddleware.js, submissionController.js |
| 4 | File Size Limits (FE+BE) | **MEDIUM** | uploadMiddleware.js, submissionRoutes.js, kycRoutes.js, TasksPage.jsx |
| 5 | Scalability (Dashboard Cache + Indexes) | **MEDIUM** | adminController.js, cacheService.js |
| 6 | Task Soft Delete (preserve evidence) | **MEDIUM** | taskController.js, Task model |
| 7 | Admin Gallery Page | **LOW** | NEW: GalleryManagement.jsx, galleryRoutes.js, AdminPage.jsx |
| 8 | Rejection/Block cleanup rules | **MEDIUM** | adminController.js, kycController.js |
| 9 | Security Hardening | **LOW** | auth.js, rateLimiter.js |

## Dependency Map — Point Mutations
- `pointService.js:awardPoints()` — called by adminController.approveSubmission, adminController.approveAssignedTask
- `adminController.adjustPoints()` — direct admin point adjustment
- `withdrawalController.completeWithdrawal()` — deducts points + frozenPoints
- `withdrawalController.rejectWithdrawal()` — unfreezes frozenPoints
- `withdrawalController.requestWithdrawal()` — freezes points
- `withdrawalController.blockWithdrawalUser()` — unfreezes + blocks
