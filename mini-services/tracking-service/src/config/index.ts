import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the correct path
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  // Server
  port: parseInt(process.env.PORT || '3003', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  
  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  },
  
  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10), // 15 minutes
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
  },
  
  // Database
  database: {
    url: process.env.DATABASE_URL || 'file:../../db/custom.db',
  },
} as const;

// Validate required configuration
export function validateConfig(): void {
  const errors: string[] = [];
  
  if (config.nodeEnv === 'production') {
    if (config.jwt.secret === 'default-secret-change-in-production') {
      errors.push('JWT_SECRET must be set in production environment');
    }
    if (config.jwt.secret.length < 32) {
      errors.push('JWT_SECRET should be at least 32 characters in production');
    }
  }
  
  if (errors.length > 0) {
    console.error('Configuration errors:');
    errors.forEach((error) => console.error(`  - ${error}`));
    process.exit(1);
  }
}
