import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/jwt';
import { serializeData } from '@/lib/utils-serializer';

/**
 * @route   GET /api/tracking
 * @desc    Get all tracking logs with filters
 * @access  Private (requires JWT)
 * 
 * Query params:
 * - vehicleId: string
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - limit: number (default: 100)
 */
export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = authenticateRequest(request);
    
    if (!authResult.success) {
      return authResult.response || NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const vehicleId = searchParams.get('vehicleId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 1000);

    const where: Record<string, unknown> = {};

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    if (startDate || endDate) {
      where.recordedAt = {};
      if (startDate) {
        (where.recordedAt as Record<string, unknown>).gte = new Date(startDate);
      }
      if (endDate) {
        (where.recordedAt as Record<string, unknown>).lte = new Date(endDate);
      }
    }

    const logs = await db.trackingLog.findMany({
      where,
      include: {
        vehicle: {
          select: {
            plateNumber: true,
            model: true,
            brand: true,
            dailyRate: true,
          },
        },
      },
      orderBy: { recordedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({
      success: true,
      data: serializeData(logs),
    });
  } catch (error) {
    console.error('Error fetching tracking logs:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to fetch tracking logs',
        message: 'An error occurred while fetching tracking data',
      },
      { status: 500 }
    );
  }
}

/**
 * @route   POST /api/tracking
 * @desc    Create new tracking log (for GPS device integration)
 * @access  Private (requires JWT)
 * 
 * Request body:
 * {
 *   "vehicleId": "string",
 *   "latitude": number,
 *   "longitude": number,
 *   "speed": number,        // optional
 *   "heading": number,      // optional
 *   "ignition": boolean,    // optional
 *   "fuel": number          // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const authResult = authenticateRequest(request);
    
    if (!authResult.success || !authResult.user) {
      return authResult.response || NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vehicleId, latitude, longitude, speed, heading, ignition, fuel } = body;
    const userId = authResult.user.userId;

    // Validate required fields
    if (!vehicleId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'vehicleId, latitude, and longitude are required',
        },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180',
        },
        { status: 400 }
      );
    }

    // Check if vehicle exists
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      select: { id: true, plateNumber: true },
    });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle not found',
          message: `Vehicle with ID ${vehicleId} does not exist`,
        },
        { status: 404 }
      );
    }

    // Create tracking log
    const log = await db.trackingLog.create({
      data: {
        vehicleId,
        latitude,
        longitude,
        speed: speed ?? null,
        heading: heading ?? null,
        ignition: ignition ?? false,
        fuel: fuel ?? null,
        userId,
      },
    });

    // Update vehicle current location
    await db.vehicle.update({
      where: { id: vehicleId },
      data: {
        latitude,
        longitude,
        lastLocationAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Tracking log created successfully',
      data: serializeData(log),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating tracking log:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tracking log',
        message: 'An error occurred while saving tracking data',
      },
      { status: 500 }
    );
  }
}
