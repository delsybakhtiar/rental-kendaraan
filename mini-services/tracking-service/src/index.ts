import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import trackingRoutes from './routes/tracking';
import healthRoutes from './routes/health';

// ============================================
// Configuration Validation
// ============================================
validateConfig();

// ============================================
// Initialize Express App
// ============================================
const app = express();

// ============================================
// Security Middleware
// ============================================

// Helmet.js - Sets various HTTP headers for security
// Protects against:
// - Cross-site scripting (XSS)
// - Clickjacking
// - Sniffing attacks
// - Cache poisoning
// - Various other attacks
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  ieNoOpen: true,
  noSniff: true,
  originAgentCluster: true,
  permittedCrossDomainPolicies: { permittedPolicies: 'none' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// CORS Configuration
app.use(cors({
  origin: config.nodeEnv === 'production' 
    ? process.env.ALLOWED_ORIGINS?.split(',') 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  maxAge: 86400, // 24 hours
}));

// Rate Limiter - Prevents brute force and DoS attacks
const globalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs, // 15 minutes by default
  max: config.rateLimit.maxRequests, // 100 requests per window by default
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
  legacyHeaders: false, // Disable X-RateLimit-* headers
  // Skip rate limiting for successful requests in development
  skipSuccessfulRequests: config.nodeEnv === 'development',
});

// Apply rate limiter to all routes
app.use(globalLimiter);

// Stricter rate limiter for authentication routes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Only 10 login attempts per 15 minutes
  message: {
    success: false,
    error: 'Too many login attempts',
    message: 'Too many failed login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ============================================
// Body Parsing Middleware
// ============================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ============================================
// Request Logging (Development)
// ============================================
if (config.nodeEnv === 'development') {
  app.use((req, res, next) => {
    console.log(`📨 ${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
  });
}

// ============================================
// Health Check Endpoint
// ============================================
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    status: 'healthy',
    service: 'tracking-service',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
  });
});

// ============================================
// API Routes
// ============================================
app.use('/auth', authLimiter, authRoutes);
app.use('/tracking', trackingRoutes);

// ============================================
// API Documentation Endpoint
// ============================================
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'Car Rental Tracking API',
    version: '1.0.0',
    endpoints: {
      'POST /auth/login': 'Authenticate and get JWT token',
      'GET /auth/me': 'Get current user info (requires auth)',
      'POST /auth/register': 'Register new user (admin only)',
      'POST /tracking/update': 'Update GPS location (requires auth)',
      'GET /tracking/history/:vehicle_id': 'Get tracking history (requires auth)',
      'GET /tracking/alerts': 'Get geofence alerts (requires auth)',
      'PUT /tracking/alerts/:alert_id/resolve': 'Resolve an alert (requires auth)',
    },
    security: {
      authentication: 'JWT Bearer Token',
      rateLimit: `${config.rateLimit.maxRequests} requests per ${config.rateLimit.windowMs / 60000} minutes`,
    },
  });
});

// ============================================
// Error Handling
// ============================================
app.use(notFoundHandler);
app.use(errorHandler);

// ============================================
// Graceful Shutdown
// ============================================
const gracefulShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
  
  // Close server
  server.close(() => {
    console.log('✅ HTTP server closed');
  });

  // Close database connection
  const { prisma } = await import('./utils/database');
  await prisma.$disconnect();
  console.log('✅ Database connection closed');
  
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  // Don't exit on unhandled rejection in development
  if (config.nodeEnv === 'production') {
    gracefulShutdown('unhandledRejection');
  }
});

// ============================================
// Start Server
// ============================================
const server = app.listen(config.port, () => {
  console.log('\n' + '='.repeat(60));
  console.log('🚗 Car Rental Tracking Service');
  console.log('='.repeat(60));
  console.log(`📡 Server running on port ${config.port}`);
  console.log(`🌍 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Local: http://localhost:${config.port}`);
  console.log(`🔐 JWT Auth: Enabled`);
  console.log(`🛡️  Security: Helmet.js + Rate Limiter`);
  console.log(`⚡ Rate Limit: ${config.rateLimit.maxRequests} req/${config.rateLimit.windowMs / 60000}min`);
  console.log('='.repeat(60) + '\n');
});

export default app;
