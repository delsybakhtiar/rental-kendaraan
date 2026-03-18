import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/jwt';
import { syncPersistedGpsStatuses, withDerivedGpsStatus } from '@/lib/tracking';
import { serializeData } from '@/lib/utils-serializer';

/**
 * @route   GET /api/tracking/[vehicleId]
 * @desc    Get tracking history for a specific vehicle
 * @access  Private (requires JWT)
 * 
 * Query params:
 * - startDate: ISO date string
 * - endDate: ISO date string
 * - hours: number (default: 24) - Hours to look back if no date range
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ vehicleId: string }> }
) {
  try {
    // Authenticate request
    const authResult = authenticateRequest(request);
    
    if (!authResult.success) {
      return authResult.response || NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    await syncPersistedGpsStatuses();

    const { vehicleId } = await params;
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const hours = parseInt(searchParams.get('hours') || '24');

    const where: Record<string, unknown> = { vehicleId };

    if (startDate && endDate) {
      where.recordedAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else {
      // Default: last N hours
      const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
      where.recordedAt = { gte: cutoff };
    }

    const logs = await db.trackingLog.findMany({
      where,
      orderBy: { recordedAt: 'asc' },
    });

    // Get vehicle info
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        plateNumber: true,
        model: true,
        brand: true,
        color: true,
        status: true,
        latitude: true,
        longitude: true,
        lastLocationAt: true,
        lastTrackedAt: true,
        gpsStatus: true,
        currentSpeed: true,
        currentHeading: true,
        ignitionStatus: true,
        deviceId: true,
        dailyRate: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        {
          success: false,
          error: 'Vehicle not found',
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      vehicle: serializeData(withDerivedGpsStatus(vehicle)),
      logs: serializeData(logs),
      totalPoints: logs.length,
    });
  } catch (error) {
    console.error('Error fetching vehicle tracking:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tracking data',
        message: 'An error occurred while fetching vehicle tracking history',
      },
      { status: 500 }
    );
  }
}
