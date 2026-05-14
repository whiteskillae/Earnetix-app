const { z } = require('zod');
require('dotenv').config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('5000'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(10, 'JWT_ACCESS_SECRET must be at least 10 chars'),
  JWT_REFRESH_SECRET: z.string().min(10, 'JWT_REFRESH_SECRET must be at least 10 chars'),
  JWT_ACCESS_EXPIRY: z.string().default('72h'),
  JWT_REFRESH_EXPIRY: z.string().default('72h'),
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  SMTP_HOST: z.string().default('smtp.gmail.com'),
  SMTP_PORT: z.string().default('587'),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().optional(),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'),
  RATE_LIMIT_MAX: z.string().default('100'),
  LOGIN_RATE_LIMIT_MAX: z.string().default('5'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

let env;
try {
  env = envSchema.parse(process.env);
} catch (err) {
  console.error('❌ Environment validation failed:');
  console.error(err.errors.map(e => `  ${e.path}: ${e.message}`).join('\n'));
  process.exit(1);
}

module.exports = env;
