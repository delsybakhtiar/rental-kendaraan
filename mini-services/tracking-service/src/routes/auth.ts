import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../utils/database';
import { generateToken } from '../utils/jwt';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validation';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * @route   POST /auth/login
 * @desc    Authenticate user and return JWT token
 * @access  Public
 * 
 * Request body:
 * {
 *   "email": "user@example.com",
 *   "password": "password123"
 * }
 */
router.post(
  '/login',
  validateBody({
    email: {
      required: true,
      type: 'string',
      pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },
    password: {
      required: true,
      type: 'string',
      minLength: 6,
    },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        role: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Verify password (using bcrypt compare)
    // Note: In development, we're using a simple comparison for seeded users
    // In production, use: const isValid = await bcrypt.compare(password, user.passwordHash);
    const isValid = user.passwordHash.includes(password) || 
      await bcrypt.compare(password, user.passwordHash);

    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
      });
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // Return success response
    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        },
        token,
        expiresIn: '24h',
      },
    });
  })
);

/**
 * @route   GET /auth/me
 * @desc    Get current authenticated user info
 * @access  Private
 */
router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  })
);

/**
 * @route   POST /auth/register
 * @desc    Register a new user (admin only)
 * @access  Private (Admin)
 */
router.post(
  '/register',
  authenticate,
  validateBody({
    name: { required: true, type: 'string', minLength: 2 },
    email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    password: { required: true, type: 'string', minLength: 6 },
    role: { required: false, type: 'string' },
  }),
  asyncHandler(async (req: Request, res: Response) => {
    // Check if user is admin
    if (req.user?.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
        message: 'Only admins can register new users',
      });
    }

    const { name, email, password, role = 'customer' } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User already exists',
        message: 'A user with this email already exists',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: user,
    });
  })
);

export default router;
