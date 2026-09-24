import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { env } from './config/env.js';
import apiV1Router from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';
import { NotFoundError } from './utils/errors.js';
import { sendSuccess } from './utils/response.js';

const app = express();

// 1. HTTP Security Headers
app.use(helmet({
  contentSecurityPolicy: false // Allows API to serve JSON without CSP warnings
}));

// 2. CORS Whitelist
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    if (env.CORS_ORIGINS.includes(origin) || env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// 3. Rate Limiting for Auth
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many authentication requests from this IP. Please try again after 15 minutes.'
    }
  }
});
app.use('/api/v1/auth/login', authLimiter);

// 4. Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// 5. Request Logging
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// 6. Health Check Endpoint
app.get('/health', (req, res) => {
  return sendSuccess(res, {
    status: 'UP',
    environment: env.NODE_ENV,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  }, 'MarichiHR API is healthy');
});

// 7. Mount API v1 Master Router
app.use('/api/v1', apiV1Router);

// 8. 404 Route Handler
app.use((req, res, next) => {
  next(new NotFoundError(`API endpoint ${req.method} ${req.originalUrl}`));
});

// 9. Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
