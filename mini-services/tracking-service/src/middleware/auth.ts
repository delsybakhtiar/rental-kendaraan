import { Request, Response, NextFunction, RequestHandler } from 'express';
import { verifyToken, extractBearerToken, DecodedToken } from '../utils/jwt';

// Custom Request interface with user data
export interface AuthenticatedRequest extends Request {
  user?: DecodedToken;
}

/**
 * Authentication middleware
 * Verifies JWT token and attaches user data to request
 */
export const authenticate: RequestHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extract token from Authorization header
    const token = extractBearerToken(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'Authentication required',
        message: 'No token provided. Please include a valid Bearer token in Authorization header.',
      });
      return;
    }

    // Verify token
    const decoded = verifyToken(token);
    
    // Attach user data to request (type assertion for Express)
    (req as AuthenticatedRequest).user = decoded;
    
    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    
    res.status(401).json({
      success: false,
      error: 'Authentication failed',
      message,
    });
  }
};

/**
 * Authorization middleware - check user role
 * @param roles - Array of allowed roles
 */
export const authorize = (...roles: string[]): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const authReq = req as AuthenticatedRequest;
      
      if (!authReq.user) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          message: 'User not authenticated',
        });
        return;
      }

      if (!roles.includes(authReq.user.role)) {
        res.status(403).json({
          success: false,
          error: 'Access denied',
          message: `This action requires one of the following roles: ${roles.join(', ')}`,
        });
        return;
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      res.status(500).json({
        success: false,
        error: 'Authorization check failed',
        message: 'An error occurred during authorization',
      });
    }
  };
};

/**
 * Optional authentication middleware
 * Attaches user data if token is present, but doesn't require it
 */
export const optionalAuth: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const token = extractBearerToken(req.headers.authorization);

    if (token) {
      const decoded = verifyToken(token);
      (req as AuthenticatedRequest).user = decoded;
    }

    next();
  } catch {
    // Ignore token errors for optional auth
    next();
  }
};
