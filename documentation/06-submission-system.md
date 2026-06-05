# Earntix Submission System

## 1. Overview
The submission system dictates how users submit proof (files, text, links) to verify they completed a task. This system handles complex validation, file hashing for duplicate detection, Cloudinary uploads, and multi-file rollbacks if a database error occurs.

## 2. File Upload Pipeline
Submissions can accept up to 3 attachments (images or documents) simultaneously. The backend heavily utilizes `multer` for memory parsing and `cloudinary` for persistent blob storage.

### 2.1 The Upload Sequence (Atomic)
The `submitProof` controller (in `submissionController.js`) executes in a highly defensive pattern to ensure that **no orphaned files are ever left on Cloudinary** if a MongoDB error occurs.

1.  **Incoming Request:** Multer parses the multi-part form data into `req.files` (temp local storage).
2.  **Basic Validation:** Ensure KYC is active, the daily task limit (8) hasn't been breached, and the max submission count hasn't been reached.
3.  **Deduplication (Pre-upload):**
    *   Files are hashed on disk using `hashFileFromDisk` (SHA-256).
    *   The hash is compared against the `Submission` collection for the specific `taskId` and `userId`.
    *   *If duplicate: Abort and return 409.*
4.  **Security Scan:** `isFileSafe()` validates headers and magic bytes to prevent masqueraded execution files.
5.  **Cloudinary Upload:** Files are uploaded.
6.  **Database Commit:** The `Submission` document is written to MongoDB.
    *   **Failure Catch:** If MongoDB fails to save the document (e.g., due to a sudden connection drop), `rollbackUploads()` fires immediately to delete the uploaded files from Cloudinary, preventing cloud storage bloat.
7.  **Local Cleanup:** `cleanupTempFiles` deletes the temporary `multer` files from disk regardless of success or failure.

---

## 3. Approval / Rejection Workflow

Submissions start as `status: 'pending'`. 

### 3.1 Approval (Admin)
When an admin approves a submission (`approveSubmission`):
- The status changes to `approved`.
- The user is credited the `rewardPoints` from the associated Task.
- The action is logged to `AdminLog`.

### 3.2 Rejection (Admin)
When an admin rejects a submission (`rejectSubmission`):
- The status changes to `rejected`.
- The admin MUST provide a `rejectionReason` string.
- The `canResubmit` boolean is set to `true`.
- The user sees the rejection on their dashboard and is prompted to resubmit.

---

## 4. The Resubmission Pipeline

When a user fixes their work and resubmits (`resubmit`), the backend must perform a complex file-swap without risking data loss.

1.  **Validation:** Ensure the task is still active and `canResubmit` is true.
2.  **Upload New Files:** New files are uploaded to Cloudinary.
3.  **Database Update:** The existing `Submission` document is updated with the new text, links, and new Cloudinary `publicId` arrays. The status resets to `pending`, and `submissionCount` increments.
4.  **Delete Old Files:** **ONLY AFTER** the MongoDB save succeeds, the old files (referenced via `oldAssets`) are deleted from Cloudinary.
    - *If MongoDB fails, the new files are rolled back, and the old files remain intact.*

---

## 5. Potential Bottlenecks & Fixes

- **Cloudinary Rate Limits:** Uploading multiple files concurrently to Cloudinary can trigger HTTP 420 limits on the free tier. The `uploadMultipleToCloudinary` service uses `p-limit` to restrict concurrency to 3 simultaneous uploads to mitigate this.
- **N+1 Queries:** Admin dashboards fetching large arrays of submissions must rely on `.lean()` to prevent event loop exhaustion when populating the `taskId` and `userId` fields. This was recently fixed in the Master Audit.
