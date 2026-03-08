import { Request, Response, NextFunction, RequestHandler } from 'express';
import { ValidationError } from './errorHandler';

/**
 * Validation rule interface
 */
interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'object' | 'array';
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => boolean | string;
}

/**
 * Validation schema
 */
type ValidationSchema = Record<string, ValidationRule>;

/**
 * Validate a single value against a rule
 */
function validateValue(value: unknown, rule: ValidationRule, field: string): string | null {
  // Check required
  if (rule.required && (value === undefined || value === null || value === '')) {
    return `${field} is required`;
  }

  // Skip further validation if value is not provided and not required
  if (value === undefined || value === null) {
    return null;
  }

  // Check type
  if (rule.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      return `${field} must be of type ${rule.type}`;
    }
  }

  // Check string length
  if (typeof value === 'string') {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `${field} must be at least ${rule.minLength} characters`;
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `${field} must be at most ${rule.maxLength} characters`;
    }
    if (rule.pattern && !rule.pattern.test(value)) {
      return `${field} has invalid format`;
    }
  }

  // Check number range
  if (typeof value === 'number') {
    if (rule.min !== undefined && value < rule.min) {
      return `${field} must be at least ${rule.min}`;
    }
    if (rule.max !== undefined && value > rule.max) {
      return `${field} must be at most ${rule.max}`;
    }
  }

  // Check array length
  if (Array.isArray(value)) {
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      return `${field} must have at least ${rule.minLength} items`;
    }
    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      return `${field} must have at most ${rule.maxLength} items`;
    }
  }

  // Custom validation
  if (rule.custom) {
    const result = rule.custom(value);
    if (typeof result === 'string') {
      return result;
    }
    if (result === false) {
      return `${field} is invalid`;
    }
  }

  return null;
}

/**
 * Validate request body against a schema
 */
export function validateBody(schema: ValidationSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: Record<string, string> = {};

      for (const [field, rule] of Object.entries(schema)) {
        const value = req.body[field];
        const error = validateValue(value, rule, field);
        if (error) {
          errors[field] = error;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Validate request params against a schema
 */
export function validateParams(schema: ValidationSchema): RequestHandler {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const errors: Record<string, string> = {};

      for (const [field, rule] of Object.entries(schema)) {
        const value = req.params[field];
        const error = validateValue(value, rule, field);
        if (error) {
          errors[field] = error;
        }
      }

      if (Object.keys(errors).length > 0) {
        throw new ValidationError('Validation failed', errors);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Coordinate validation helper
 */
export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return false;
  }
  
  // Latitude: -90 to 90
  // Longitude: -180 to 180
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * GPS coordinate validation schema
 */
export const gpsCoordinatesSchema: ValidationSchema = {
  lat: {
    required: true,
    type: 'number',
    min: -90,
    max: 90,
  },
  lng: {
    required: true,
    type: 'number',
    min: -180,
    max: 180,
  },
};
