import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { authenticateRequest, authorizeRole, unauthorizedResponse } from '@/lib/jwt';

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user (admin only)
 * @access  Private (Admin)
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = authenticateRequest(request);
    
    if (!authResult.success) {
      return authResult.response;
    }

    // Check if user is admin
    if (!authorizeRole(authResult.user!, ['admin'])) {
      return unauthorizedResponse('Only admins can register new users');
    }

    const body = await request.json();
    const { name, email, password, role = 'customer' } = body;

    // Validate input
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Name, email, and password are required',
        },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid email format',
        },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Password must be at least 6 characters',
        },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: 'User already exists',
          message: 'A user with this email already exists',
        },
        { status: 409 }
      );
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user
    const user = await db.user.create({
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

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
      data: user,
    }, { status: 201 });
  } catch (error) {
    console.error('Register error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        message: 'An error occurred during registration',
      },
      { status: 500 }
    );
  }
}
