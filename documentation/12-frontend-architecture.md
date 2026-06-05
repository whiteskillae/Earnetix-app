# Earntix Frontend Architecture

## 1. Core Stack
The frontend is built for speed and responsiveness, utilizing:
- **Framework:** React 18
- **Build Tool:** Vite (Hot Module Replacement, fast bundling)
- **Routing:** React Router DOM (v6+)
- **Styling:** CSS Modules / Vanilla CSS (or Tailwind depending on specific component implementation).
- **HTTP Client:** Axios (configured with interceptors for token handling).

---

## 2. State Management

Earntix avoids heavy state managers like Redux in favor of React Context for global state, and localized state for component-specific logic.

### 2.1 The Auth Context (`AuthContext.jsx`)
The most critical piece of global state. It holds:
- `user`: The current user object.
- `accessToken`: The short-lived JWT.
- `isAuthenticated`: Boolean determining routing access.

**Security:** The `accessToken` lives ONLY in the AuthContext (in memory). If the user hard-refreshes the page, the state is wiped. A `useEffect` hook immediately calls the `/api/auth/refresh` endpoint to hydrate the state using the HttpOnly cookie.

---

## 3. Network Interceptors (Axios)

To make dual-token auth seamless, Axios is configured with an interceptor:

1. **Request Interceptor:** Injects the `Authorization: Bearer <accessToken>` header into every outgoing request if the token exists in context.
2. **Response Interceptor:** 
   - If an API returns `401 Unauthorized` with a `TOKEN_EXPIRED` flag.
   - It pauses all pending requests.
   - Silently calls `/api/auth/refresh`.
   - On success, it updates the `accessToken` in memory and retries all paused requests.
   - On failure (refresh token is invalid), it forcefully logs the user out and redirects to `/login`.

---

## 4. Route Protection

React Router is wrapped with custom guard components:

### `<ProtectedRoute />`
Wraps all user-facing dashboard routes. If `!isAuthenticated`, redirects to `/login`.

### `<AdminRoute />`
Wraps all `/admin/*` routes. Checks `user.role === 'admin'`. If false, redirects to the standard user dashboard or a 403 page.

---

## 5. Component Philosophy

1. **Smart vs Dumb Components:** Pages (e.g., `TasksPage.jsx`) are "Smart". They fetch data via Axios, manage loading states, and handle business logic. Components (e.g., `TaskCard.jsx`) are "Dumb". They accept props and emit events via callbacks.
2. **Optimistic UI:** When a user "Likes" a blog or "Accepts" a task, the UI updates instantly before the API responds, making the app feel incredibly fast. If the API fails, the state is rolled back and a toast notification is shown.
3. **Debouncing:** Search bars and heavy inputs are debounced (e.g., waiting 500ms after the user stops typing) before hitting the backend APIs to prevent server flooding.
