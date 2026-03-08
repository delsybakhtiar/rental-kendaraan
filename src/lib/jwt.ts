import jwt, { JwtPayload } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production-min-32-chars';

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
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): DecodedToken | null {
  try {
    return jwt.verify(token, JWT_SECRET) as DecodedToken;
  } catch (error) {
    console.error('JWT verification failed:', error instanceof Error ? error.message : 'Unknown error');
    return null;
  }
}

/**
 * Extract token from Authorization header
 * Format: "Bearer <token>"
 */
export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  
  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }
  
  return parts[1];
}

/**
 * Authentication result
 */
export interface AuthResult {
  success: boolean;
  user?: DecodedToken;
  error?: string;
  response?: NextResponse;
}

/**
 * Verify authentication from request
 * Returns user data if valid, or error response if invalid
 */
export function authenticateRequest(request: NextRequest): AuthResult {
  try {
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return {
        success: false,
        error: 'No token provided',
        response: NextResponse.json(
          {
            success: false,
            error: 'Authentication required',
            message: 'No token provided. Please include a valid Bearer token in Authorization header.',
          },
          { status: 401 }
        ),
      };
    }

    const decoded = verifyToken(token);

    if (!decoded) {
      return {
        success: false,
        error: 'Invalid token',
        response: NextResponse.json(
          {
            success: false,
            error: 'Authentication failed',
            message: 'Invalid or expired token. Please login again.',
          },
          { status: 401 }
        ),
      };
    }

    return {
      success: true,
      user: decoded,
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return {
      success: false,
      error: 'Authentication failed',
      response: NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: 'An error occurred during authentication',
        },
        { status: 500 }
      ),
    };
  }
}

/**
 * Check if user has required role
 */
export function authorizeRole(user: DecodedToken, allowedRoles: string[]): boolean {
  return allowedRoles.includes(user.role);
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized access'): NextResponse {
  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized',
      message,
    },
    { status: 403 }
  );
}
