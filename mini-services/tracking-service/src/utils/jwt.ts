import jwt, { JwtPayload, SignOptions } from 'jsonwebtoken';
import { config } from '../config';

// Token payload interface
export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
}

// Extended JwtPayload with our custom fields
export interface DecodedToken extends JwtPayload {
  userId: string;
  email: string;
  role: string;
}

/**
 * Generate JWT token for authenticated user
 */
export function generateToken(payload: TokenPayload): string {
  try {
    const options: SignOptions = {
      expiresIn: config.jwt.expiresIn,
    };
    return jwt.sign(payload, config.jwt.secret, options);
  } catch (error) {
    console.error('Error generating JWT token:', error);
    throw new Error('Failed to generate authentication token');
  }
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): DecodedToken {
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as DecodedToken;
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    console.error('Error verifying JWT token:', error);
    throw new Error('Token verification failed');
  }
}

/**
 * Extract token from Authorization header
 * Format: "Bearer <token>"
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) {
    return null;
  }
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
}
