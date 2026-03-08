import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { authenticateRequest } from '@/lib/jwt';
import { serializeData } from '@/lib/utils-serializer';

/**
 * @route   GET /api/alerts
 * @desc    Get all geofence alerts (for real-time dashboard polling)
 * @access  Private (requires JWT)
 * 
 * Query params:
 * - resolved: boolean - Include resolved alerts (default: false)
 * - limit: number (default: 50)
 * - since: ISO date string - Get alerts created after this date
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
    const resolved = searchParams.get('resolved') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 200);
    const since = searchParams.get('since');

    const where: Record<string, unknown> = resolved ? {} : { isResolved: false };

    if (since) {
      where.createdAt = { gte: new Date(since) };
    }

    const alerts = await db.geofenceAlert.findMany({
      where,
      include: {
        geofence: {
          select: {
            name: true,
            type: true,
            color: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Get vehicle info
    const vehicleIds = [...new Set(alerts.map((a) => a.vehicleId))];
    const vehicles = vehicleIds.length > 0 ? await db.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: {
        id: true,
        plateNumber: true,
        model: true,
        brand: true,
        dailyRate: true,
      },
    }) : [];
    
    const vehicleMap = new Map(vehicles.map((v) => [v.id, serializeData(v)]));

    const alertsWithVehicle = alerts.map((alert) => ({
      id: alert.id,
      vehicle: vehicleMap.get(alert.vehicleId) || null,
      geofence: alert.geofence,
      alertType: alert.alertType,
      message: alert.message,
      location: {
        lat: alert.locationLat,
        lng: alert.locationLng,
      },
      isResolved: alert.isResolved,
      resolvedAt: alert.resolvedAt,
      createdAt: alert.createdAt,
    }));

    // Count unresolved
    const unresolvedCount = await db.geofenceAlert.count({
      where: { isResolved: false },
    });

    return NextResponse.json({
      success: true,
      data: alertsWithVehicle,
      meta: {
        total: alerts.length,
        unresolvedCount,
        hasMore: alerts.length === limit,
      },
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch alerts',
        message: 'An error occurred while fetching geofence alerts',
      },
      { status: 500 }
    );
  }
}
