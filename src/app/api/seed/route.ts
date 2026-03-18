import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';

/**
 * @route   POST /api/seed
 * @desc    Create demo users for testing
 * @access  Public (in production, this should be protected)
 */
export async function POST(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: 'Seed endpoint disabled in production' },
        { status: 403 }
      );
    }

    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Create Standard Admin (admin_kecil)
    const standardAdmin = await db.user.upsert({
      where: { email: 'admin_kecil@rental.com' },
      update: {
        name: 'Admin Kecil',
        role: 'admin',
        accountType: 'standard',
      },
      create: {
        email: 'admin_kecil@rental.com',
        name: 'Admin Kecil',
        passwordHash: hashedPassword,
        role: 'admin',
        accountType: 'standard',
      },
    });

    // Create Premium Admin (admin_premium)
    const premiumAdmin = await db.user.upsert({
      where: { email: 'admin_premium@rental.com' },
      update: {
        name: 'Admin Premium',
        role: 'admin',
        accountType: 'premium',
      },
      create: {
        email: 'admin_premium@rental.com',
        name: 'Admin Premium',
        passwordHash: hashedPassword,
        role: 'admin',
        accountType: 'premium',
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Demo users created successfully',
      data: {
        users: [
          {
            email: standardAdmin.email,
            name: standardAdmin.name,
            accountType: standardAdmin.accountType,
          },
          {
            email: premiumAdmin.email,
            name: premiumAdmin.name,
            accountType: premiumAdmin.accountType,
          },
        ],
      },
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to seed demo users' },
      { status: 500 }
    );
  }
}

/**
 * @route   GET /api/seed
 * @desc    Check if demo users exist
 */
export async function GET() {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { success: false, message: 'Seed endpoint disabled in production' },
        { status: 403 }
      );
    }

    const users = await db.user.findMany({
      where: {
        email: {
          in: ['admin_kecil@rental.com', 'admin_premium@rental.com'],
        },
      },
      select: {
        email: true,
        name: true,
        accountType: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: { users },
    });
  } catch (error) {
    console.error('Check seed error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check demo users' },
      { status: 500 }
    );
  }
}
