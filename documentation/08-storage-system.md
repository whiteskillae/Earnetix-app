# Earntix Storage & File Handling System

## 1. Overview
Earntix handles a massive volume of user-uploaded files (Submission proofs, Task attachments, Blog images, User avatars). 
All file storage is offloaded to **Cloudinary** to keep the primary backend stateless and scalable.

## 2. Multi-Layer Security Validation

To prevent malicious uploads (like remote code execution payloads disguised as images), files pass through several rigorous checks in `uploadService.js`.

### 2.1 Blocked Extensions Hardcode
No matter what a Task allows, the system has a hardcoded array of `BLOCKED_EXTENSIONS` (e.g., `.exe`, `.sh`, `.php`, `.js`, `.pl`, `.dll`). If a user tries to upload one of these, it throws immediately.

### 2.2 Magic Byte Scanning (File Security Service)
Extensions can be easily spoofed (e.g., renaming `malware.exe` to `proof.jpg`).
Earntix uses `file-type` to read the first few bytes of the file on disk (the "Magic Bytes") to verify the true MIME type. If a file claims to be a `.jpg` but the magic bytes resolve to `application/x-executable`, the upload is blocked and an `AdminLog` security event is triggered.

### 2.3 Size Limits
- **Images:** Max 15MB
- **Other Files:** Max 1GB
- *(Limits can be overridden by specific Task configurations)*

---

## 3. Streaming Architecture (Zero RAM Bloat)

Handling 1GB files in a Node.js environment is dangerous. If 5 users upload 1GB files simultaneously, a standard `buffer`-based upload will consume 5GB of RAM and crash the server.

Earntix solves this using **Disk-to-Cloud Stream Piping**:
1. `multer` is configured to use `diskStorage` (writing chunks to a temporary `/tmp/uploads` folder) instead of `memoryStorage`.
2. `uploadToCloudinaryFromDisk` creates an `fs.createReadStream`.
3. The stream is piped directly into `cloudinary.uploader.upload_stream`.
4. Result: A 1GB file takes <50MB of RAM to upload.

---

## 4. Concurrency Controls & Deduplication

### 4.1 Parallel Uploads (`p-limit`)
Uploading 5 files sequentially takes 5x longer. But uploading 5 files simultaneously without limits can trigger HTTP 420 limits from Cloudinary.
`uploadMultipleToCloudinary` uses `Promise.allSettled` to upload files in parallel batches (default `concurrency: 3`).

### 4.2 Deduplication Hashing
Users frequently try to cheat the system by submitting the same screenshot for multiple tasks.
Earntix prevents this by hashing the file on disk (using `crypto.createHash('sha256')`) *before* uploading it to Cloudinary. 
If the hash already exists in the `Submission` collection for that Task/User, the upload is aborted early, saving bandwidth and preventing spam.

---

## 5. Rollback System
Because uploading to Cloudinary and saving to MongoDB are two separate operations, we must prevent "Orphaned Files" (files sitting in Cloudinary that don't exist in MongoDB because the DB crashed).

```javascript
// Example Workflow from SubmissionController
const uploadedAssets = [];
try {
  // 1. Upload to cloud
  const results = await uploadMultipleToCloudinary(req.files);
  uploadedAssets.push(...results);

  // 2. Save to DB
  await Submission.create({ attachments: uploadedAssets });
} catch (error) {
  // 3. Rollback
  await rollbackUploads(uploadedAssets);
  throw error;
} finally {
  // 4. Always delete the temp disk file
  cleanupTempFiles(req.files);
}
```

## 6. Cloudinary Deletion Strategy
When deleting files, it's critical to pass the correct `resource_type` (image, video, raw). Cloudinary's `destroy` API will fail if you try to delete a `.zip` file while passing `{ resource_type: 'image' }`. 
Earntix stores the `resource_type` alongside the `publicId` in the database to ensure O(1) instantaneous deletion.
