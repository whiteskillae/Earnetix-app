# Authentication & Session Flow

Earnitix uses a dual-token strategy (JWT) combined with OTP and Google OAuth.

```mermaid
graph TD
    A[User Entry] --> B{Login Method}
    B -->|Local| C[Email + Password]
    B -->|Google| D[Google ID Token]
    
    C --> E[Verify Bcrypt Hash]
    E -->|Success| F[Generate JWT Pair]
    
    D --> G[Verify via Google Auth Library]
    G -->|Valid| F
    
    F --> H[Access Token -> JSON Response]
    F --> I[Refresh Token -> HttpOnly Cookie]
    
    H --> J[Client Requests /api/...]
    J -->|401 Expired| K[Call /api/auth/refresh]
    K -->|Cookie Valid| L[Rotate Tokens]
    L --> J
    
    K -->|Invalid| M[Force Logout]
```

## 🔐 Security Features
- **OTP Logic**: Email verification required for local signups.
- **Fingerprinting**: `deviceFingerprint` used to link sessions to hardware.
- **Auto-Logout**: 403 response interceptor triggers session clearing if user is blocked.
