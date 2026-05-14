# Project Overview: Earnitix

## 🌟 Application Purpose
Earnitix is a high-concurrency, task-based earning platform designed to connect users with micro-missions (social media tasks, content verification, etc.) for monetary rewards. It incorporates a robust KYC verification system and an automated withdrawal engine.

## 🏗️ Technical Stack

### Frontend (Client-Side)
- **Framework**: React 18 (Vite-powered)
- **State Management**: Context API (`AuthContext`)
- **Styling**: Vanilla CSS with a focus on Glassmorphism and modern UI tokens
- **Communication**: Axios with centralized interceptors for token refresh and 403 handling
- **Tools**: Lucide Icons, React Hot Toast, React Router DOM 6

### Backend (Server-Side)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose ODM)
- **Auth**: JWT (Access + Refresh Tokens), OTP via Email, Google OAuth 2.0
- **Storage**: Cloudinary (Image/File hosting)
- **Validation**: Zod (Schema-based validation)
- **Security**: Helmet, CORS, express-rate-limit, hpp, xss-clean, express-mongo-sanitize

## 🧩 Architectural Pattern

The application follows a **Modular Monolith** architecture with a clear separation of concerns:

1. **Routes**: Entry points for HTTP requests, mapped to specific features.
2. **Middleware**: Sequential logic for Auth, Admin Guards, Rate Limiting, and Validation.
3. **Controllers**: Core business logic orchestrating data flow between services and models.
4. **Models**: Strictly typed Mongoose schemas for data persistence and validation.
5. **Services**: Reusable utility modules for Points, OTP, Tokens, and File Uploads.

## 📡 Deployment Strategy
- **Frontend**: Vercel (Configured for SPA routing)
- **Backend**: Render (Configured for environment-based scaling)
- **Database**: MongoDB Atlas (Managed cluster)

## 📈 Current Maturity Level
The application is currently in its **Late Beta / Pre-Production** phase. Core earning and verification loops are implemented, but system-wide load testing and edge-case handling for simultaneous point deductions need final verification.
