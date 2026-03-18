import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest, requireAdmin } from '@/lib/jwt';
import { serializeData } from '@/lib/utils-serializer';
import { ingestTrackingPayload, validateTrackingPayload, findTrackableVehicle } from '@/lib/tracking';

/**
 * @route   GET /api/tracking
 * @desc    Get all tracking logs with filters
 * @access  Private (JWT admin or signed GPS device)
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
 * @desc    Create new tracking log manually (internal/admin)
 * @access  Private (admin JWT)
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
    const rawBody = await request.text();
    let body: unknown;

    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Request body must be valid JSON',
        },
        { status: 400 }
      );
    }

    const validation = validateTrackingPayload(body);
    if (!validation.ok) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: validation.message,
        },
        { status: 400 }
      );
    }
    const { payload } = validation;

    const authResult = requireAdmin(request);
    if (!authResult.success || !authResult.user) {
      return authResult.response || NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    const userId = authResult.user.userId;

    const vehicle = await findTrackableVehicle(payload.vehicleId);
    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle not found',
          message: `Vehicle with ID ${payload.vehicleId} does not exist`,
        },
        { status: 404 }
      );
    }

    const result = await ingestTrackingPayload(payload, userId, vehicle);
    if (!result) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle not found',
          message: `Vehicle with ID ${payload.vehicleId} does not exist`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Tracking log created successfully',
      data: serializeData(result.log),
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
