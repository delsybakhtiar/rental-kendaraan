import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/jwt';

/**
 * @route   GET /api/auth/me
 * @desc    Get current authenticated user info
 * @access  Private (requires JWT)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = authenticateRequest(request);
    
    if (!authResult.success) {
      return authResult.response;
    }

    const user = await db.user.findUnique({
      where: { id: authResult.user!.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        accountType: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: 'User not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        ...user,
        accountType: user.accountType || 'standard',
      },
    });
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
      },
      { status: 500 }
    );
  }
}
