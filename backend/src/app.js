const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const env = require('./config/env');
const { apiLimiter } = require('./middleware/rateLimiter');
const errorHandler = require('./middleware/errorHandler');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const taskRoutes = require('./routes/taskRoutes');
const submissionRoutes = require('./routes/submissionRoutes');
const adminRoutes = require('./routes/adminRoutes');
const announcementRoutes = require('./routes/announcementRoutes');
const reportRoutes = require('./routes/reportRoutes');
const skillCategoryRoutes = require('./routes/skillCategoryRoutes');
const assignedTaskRoutes = require('./routes/assignedTaskRoutes');
const kycRoutes = require('./routes/kycRoutes');
const withdrawalRoutes = require('./routes/withdrawalRoutes');
const galleryRoutes = require('./routes/galleryRoutes');

const app = express();
app.set('trust proxy', true);

// ─── HTTPS ENFORCEMENT (Production) ───────────────────
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] !== 'https') {
      return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
  });
}

// ─── SECURITY ──────────────────────────────────────────
app.use(helmet({
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }, // Fixed: Prevents Google OAuth popup blocks
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// CORS Configuration
// Normalize CLIENT_URL: strip trailing slash to match browser origin headers
const cleanClientUrl = env.CLIENT_URL ? env.CLIENT_URL.replace(/\/$/, '') : '';

const allowedOrigins = [
  cleanClientUrl,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://earnetix-app.vercel.app',
  'https://earnetix-app-93ba.vercel.app',
  'https://earnetix-app.vercel.app',
  'https://earnetix-app-93ba.vercel.app',
  'https://earnetix-app.onrender.com',
  'https://www.earnetixhub.com',
  'https://earnetixhub.com'
].filter(Boolean); // remove empty strings

// Manual headers for robust CORS (especially for preflight OPTIONS)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin) || /^https:\/\/(earnitix|earnetix)-app.*\.vercel\.app$/.test(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  } else {
    // Fallback if needed, though cors() will also handle it
    res.header("Access-Control-Allow-Origin", "https://www.earnetixhub.com");
  }
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Credentials", "true");

  if (req.method === "OPTIONS") {
      return res.sendStatus(200);
  }
  next();
});

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin) || /^https:\/\/(earnitix|earnetix)-app.*\.vercel\.app$/.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent HTTP parameter pollution
app.use(hpp());

// ─── PARSERS ───────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

app.get('/api/health', (req, res) => {
  res.json({ success: true, message: 'EARNETIX API is running', timestamp: new Date().toISOString() });
});

// ─── RATE LIMITING ─────────────────────────────────────
app.use('/api', apiLimiter);

// ─── ANALYTICS TRACKING ────────────────────────────────
const analyticsTracker = require('./middleware/analyticsTracker');
app.use('/api', analyticsTracker);

// ─── ROUTES ────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/announcements', announcementRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/skill-categories', skillCategoryRoutes);
app.use('/api/assigned-tasks', assignedTaskRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/withdrawals', withdrawalRoutes);
app.use('/api/admin/gallery', galleryRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Global error handler
app.use(errorHandler);

module.exports = app;
