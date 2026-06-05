# Earntix Task Architecture

## 1. Overview
Tasks are the primary way users earn points on Earntix. The system is split into two separate task paradigms, governed by two distinct Mongoose models:
1. **Public Tasks (`Task.js`)**: Global tasks available to all users (e.g., surveys, general social media follows).
2. **Assigned Tasks (`AssignedTask.js`)**: Private, one-to-one or one-to-many "missions" assigned explicitly to specific users by admins (e.g., high-tier freelance work, specialized blogs).

---

## 2. Public Tasks (`Task.js`)

Public tasks are broadcast to the platform. 

### Key Properties:
- **`rewardPoints`**: Number of points awarded upon successful submission approval.
- **`inputType`**: Enforces what proof the user must provide (`text`, `image`, `file`, `link`, `text_image`, `text_link`, `all`).
- **`allowedExtensions`** / **`maxFileSize`**: Strict validation limits for file uploads.
- **`maxSubmissionsPerUser`**: Prevents users from infinitely milking the same task. Usually defaults to 1.
- **`isActive`**: Boolean determining if the task appears on the dashboard.

### Deletion Policy (Soft Deletes)
When an admin deletes a task, the `deleteTask` controller simply sets `isActive = false` rather than dropping the document. 
*Why?* Because `Submissions` reference the `taskId`. If a task was hard-deleted, all associated user submissions would crash or lose context.

---

## 3. Assigned Tasks (`AssignedTask.js`)

Assigned tasks have a much stricter lifecycle and state machine compared to public tasks.

### Status State Machine
- **`pending`**: Created by admin, awaiting user action.
- **`accepted`**: User clicked "Accept Mission".
- **`in_progress`**: User is actively working on it.
- **`under_review`**: User submitted their work; admin must review.
- **`completed`**: Admin approved. Points awarded.
- **`rejected`**: Admin rejected. User can see `rejectionReason` and retry.
- **`overdue`**: The `deadline` has passed. (Needs chron job implementation).
- **`archived`**: Hidden from active view.

### The 16MB MongoDB Document Limit (WARNING)
> [!WARNING]
> The current architecture for `AssignedTask` embeds `submissions` directly within the AssignedTask document as an array:
> `submissions: [{ userId, content, attachments, customData, submittedAt }]`
> Because MongoDB has a strict 16MB document limit, if a single Assigned Task is assigned to thousands of users, the embedded array will eventually exceed 16MB and crash the database. 
> **Architectural Fix Required:** A dedicated `AssignedTaskSubmission` collection must be created in future scaling phases.

---

## 4. Caching & Performance

Public task listings are heavily cached using an in-memory `node-cache` service.
- **Cache Key:** `tasks_p{page}_l{limit}`
- **TTL:** 120 seconds (2 minutes).
- **Cache Invalidation:** Any time an admin creates, updates, or deletes a task, the cache is busted via `cache.invalidateByPrefix('tasks_')`.

## 5. Daily Task Limits
To prevent users from botting the platform, a global daily limit is enforced during the submission phase (not the viewing phase).
- Limit: 8 successful/pending submissions per day.
- Implemented via `checkDailyLimit(userId)` in `taskService.js`.

---

## 6. Common Issues

| Issue | Cause | Fix |
| :--- | :--- | :--- |
| `Cannot read property 'title' of null` on User Dashboard | A task was hard-deleted from MongoDB, but the user has a submission pointing to it. | Never hard delete tasks. Always set `isActive: false`. |
| Task doesn't appear for user | User might have already reached `maxSubmissionsPerUser`. | Check `Submission` collection for existing documents. |
| Assigned Task crashes on save | The embedded `submissions` array exceeded 16MB. | Refactor schema to normalize submissions out of the task array. |
