# API Request Lifecycle Diagram

This diagram illustrates the flow of a standard request through the Earnitix backend.

```mermaid
sequenceDiagram
    participant Client
    participant RateLimiter
    participant AuthMiddleware
    participant ZodValidator
    participant Controller
    participant Mongoose
    participant Database

    Client->>RateLimiter: HTTP Request
    RateLimiter->>RateLimiter: Check IP Limit
    RateLimiter->>AuthMiddleware: Forward
    AuthMiddleware->>AuthMiddleware: Verify JWT / Refresh
    AuthMiddleware->>ZodValidator: Forward (Optional)
    ZodValidator->>ZodValidator: Schema Check
    ZodValidator->>Controller: Valid Request
    Controller->>Mongoose: Query / Mutation
    Mongoose->>Database: WiredTiger Engine
    Database-->>Mongoose: Raw Result
    Mongoose-->>Controller: Hydrated Model
    Controller-->>Client: JSON Response (Success/Fail)
```

## 🛠️ Internal Hooks
1.  **Request Logging**: `morgan` (if implemented) or custom logger.
2.  **Error Bubbling**: `next(error)` sends to `errorHandler.js`.
3.  **Sanitization**: `toJSON` hook on schemas before response.
