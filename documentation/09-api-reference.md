# Earntix API Architecture & Routes

## 1. Overview
The Earntix backend provides a RESTful API grouped by functional modules. All routes expect and return `application/json` (except for `multipart/form-data` endpoints handling file uploads).

### 1.1 Base URL
All API requests branch off: `https://api.domain.com/api`

### 1.2 Authentication Middleware
Routes are protected by decorators:
- `auth`: Requires a valid JWT Bearer access token. Extracts `req.user`.
- `adminGuard`: Checks if `req.user.role === 'admin'`. Will throw 403 otherwise.
- `optionalAuth`: Checks for a token, but doesn't throw if missing (used for public blogs).

---

## 2. Core API Inventory

### Auth Routes (`/api/auth`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/register` | Enqueues OTP, caches user data (no DB write). | No |
| `POST` | `/verify-otp` | Verifies OTP and writes to DB. | No |
| `POST` | `/login` | Returns `accessToken` & sets HTTP-only `refreshToken`. | No |
| `POST` | `/google` | OAuth verification and instant login/registration. | No |
| `GET`  | `/refresh` | Reads HTTP-only cookie, returns new `accessToken`. | No (Reads Cookie) |
| `POST` | `/logout` | Clears cookie and invalidates DB refresh token. | Yes |

### User Profile (`/api/user`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/profile` | Returns current user without sensitive fields. | Yes |
| `PUT`  | `/profile` | Updates user details (bio, avatar, skills). | Yes |
| `GET`  | `/leaderboard` | Returns top users sorted by points (uses cache). | Yes |

### Public Tasks (`/api/tasks`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/` | Paginated list of active tasks (cached 2m). | Yes |
| `GET`  | `/:id` | Fetch specific task. | Yes |
| `POST` | `/` | **[Admin]** Create a new task. | Yes (Admin) |
| `DELETE`| `/:id` | **[Admin]** Soft-deletes a task (`isActive: false`). | Yes (Admin) |

### Assigned Tasks (`/api/assigned-tasks`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `GET`  | `/my-tasks` | Get missions assigned specifically to the user. | Yes |
| `POST` | `/:id/accept`| User accepts the assigned mission. | Yes |
| `POST` | `/` | **[Admin]** Create a new assigned mission. | Yes (Admin) |
| `PUT`  | `/:id/status`| **[Admin]** Force status change. | Yes (Admin) |

### Submissions (`/api/submissions`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/` | Multi-part upload for task proof. | Yes (Rate Limited) |
| `GET`  | `/my` | Returns user's past submissions. | Yes |
| `PUT`  | `/:id/resubmit`| Submit corrected proof after rejection. | Yes |

### Withdrawals (`/api/withdrawals`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/bank-details`| Save bank details (subject to 48h cooldown). | Yes |
| `POST` | `/request` | Freeze points and request payout. | Yes |
| `PUT`  | `/admin/:id/complete`| **[Admin]** Mark as paid & burn points. | Yes (Admin) |
| `PUT`  | `/admin/:id/reject`| **[Admin]** Reject & unfreeze points. | Yes (Admin) |

### KYC (`/api/kyc`)
| Method | Endpoint | Description | Auth Required |
| :--- | :--- | :--- | :--- |
| `POST` | `/submit` | Upload ID document. | Yes |
| `PUT`  | `/admin/:id/verify`| **[Admin]** Approve user KYC. | Yes (Admin) |
| `PUT`  | `/admin/:id/reject`| **[Admin]** Reject with reason. | Yes (Admin) |

---

## 3. Global Response Format
To maintain consistency, all APIs conform to a standardized JSON response:

**Success Response:**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Human readable error message"
}
```

*Note: The global error handler (`errorHandler.js`) strips stack traces in production, but logs them internally using Winston.*
