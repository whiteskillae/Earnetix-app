# API Architecture & Endpoint Map

The Earnitix API is a RESTful system with centralized authentication and role-based access control.

## 🧱 Middleware Flow
For a standard protected request:
`Client` -> `apiLimiter` -> `authMiddleware` -> `zodValidator` (Optional) -> `adminGuard` (Optional) -> `Controller` -> `Response`

---

## 📡 Endpoint Directory

### 🔐 Authentication (`/api/auth`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/register` | None | New user registration + OTP send |
| POST | `/verify-otp` | None | OTP verification + JWT issuance |
| POST | `/resend-otp` | None | Resend registration OTP |
| POST | `/login` | None | Password-based authentication |
| POST | `/google` | None | Google OAuth ID Token verification |
| POST | `/refresh` | Cookie | Rotate Access/Refresh tokens |
| POST | `/logout` | JWT | Terminate session |
| POST | `/complete-profile` | JWT | Set name/country after signup |

### 👤 User Operations (`/api/users`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/profile` | JWT | Fetch current user data |
| PUT | `/profile` | JWT | Update profile metadata |
| GET | `/leaderboard` | JWT | Top earners global list |

### 🛠️ Tasks & Campaigns (`/api/tasks`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/` | JWT | List available campaigns |
| GET | `/:id` | JWT | Task details & instructions |
| POST | `/` | Admin | Create new campaign (with attachments) |
| PUT | `/:id` | Admin | Edit campaign details |
| DELETE | `/:id` | Admin | Archive/Remove campaign |

### 📤 Submissions (`/api/submissions`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/` | JWT | Submit task evidence (Multiform) |
| GET | `/my` | JWT | Current user's submission history |
| PUT | `/:id/resubmit` | JWT | Resubmit rejected evidence |

### 🛡️ Admin Controls (`/api/admin`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/dashboard` | Admin | Platform stats overview |
| GET | `/users` | Admin | Paginated user directory |
| GET | `/submissions` | Admin | Evidence review queue |
| PUT | `/submissions/:id/approve` | Admin | Approve + Award points |
| PUT | `/submissions/:id/reject` | Admin | Reject with feedback |
| PATCH | `/users/:id/toggle-block` | Admin | Ban/Unban user |
| POST | `/users/:id/adjust-points` | Admin | Direct balance correction |

### 🪪 KYC Management (`/api/kyc`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/submit` | JWT | Upload ID document |
| GET | `/status` | JWT | Check verification state |
| GET | `/admin/list` | Admin | Pending KYC review queue |

### 💳 Withdrawals (`/api/withdrawals`)
| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/bank-details` | JWT | Update payment destination |
| POST | `/request` | JWT | Initiate points-to-cash conversion |
| GET | `/admin/all` | Admin | Payout processing queue |

---

## 🏗️ Architectural Risks
1. **Long-Polling/Sockets**: Missing. Real-time notifications for approval/rejection rely on manual refreshes or periodic polling.
2. **Transaction Integrity**: Point awards (`pointService.js`) and Withdrawal locking should ideally use Mongoose `startSession()` to prevent data corruption during server crashes.
3. **API Timeouts**: Uploading large evidence (50MB) may timeout on serverless environments (Render/Vercel) if network is slow.
