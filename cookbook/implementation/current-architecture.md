# Current Implementation Architecture

This report analyzes the specific code implementation patterns used in the Earnitix app.

## 🏗️ Structural Pattern: Controller-Service-Model
The backend is organized into clear domains:

### 1. The Controller Layer
- **Location**: `backend/src/controllers/`
- **Responsibility**: Parsing requests, handling basic branching logic, and calling services.
- **Audit**: Controllers are relatively "fat". Some logic (like point calculation) should be moved entirely to services.

### 2. The Service Layer
- **Location**: `backend/src/services/`
- **Responsibility**: Reusable business logic (e.g., `pointService.js`).
- **Audit**: This is the strongest part of the architecture. It allows for centralizing sensitive logic like point awarding.

### 3. The Model Layer
- **Location**: `backend/src/models/`
- **Responsibility**: Data definition and indexing.
- **Audit**: Schemas are well-defined with appropriate enums and defaults.

---

## 🚦 Async & Failure Handling
The app uses a consistent `try/catch` pattern in controllers with `next(error)` to pass errors to a global middleware.

### Weaknesses in Implementation:
1. **Parallel Execution**: Many operations use `await` sequentially. Example:
   ```javascript
   await User.findById(...);
   await Submission.findById(...);
   ```
   **Improvement**: Use `Promise.all()` for independent queries to reduce API latency.
   
2. **State Updates**: Points are updated using `user.points += delta`. 
   **Risk**: If multiple requests hit the server for the same user, this can lead to race conditions.
   **Improvement**: Use MongoDB `$inc` operator: `User.updateOne({ _id }, { $inc: { points: delta } })`.

3. **Memory Usage**: Large file uploads are handled in memory (`multer.memoryStorage`).
   **Risk**: Node.js heap limit crashes.
   **Improvement**: Use `multer.diskStorage` or Stream directly to Cloudinary.

---

## 🎨 Frontend Implementation (React)
- **Hooks**: Custom `useApi` hook handles the logic for attaching tokens and managing loading states.
- **Context**: `AuthContext` is the single source of truth for user data.
- **UI Architecture**: Tab-based navigation in Admin and User panels.
- **Audit**: Components are well-partitioned but some (like `AdminPage.jsx`) are getting too large and should be broken into sub-components.
