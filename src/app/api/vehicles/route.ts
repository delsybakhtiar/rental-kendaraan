import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { syncPersistedGpsStatuses, withDerivedGpsStatusList } from '@/lib/tracking';
import { serializeData } from '@/lib/utils-serializer';
import { authenticateRequest, authorizeRole, requireAdmin } from '@/lib/jwt';

// GET /api/vehicles - Get all vehicles
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status } : {};
    const authHeader = request.headers.get('authorization');

    if (authHeader) {
      const authResult = authenticateRequest(request);
      if (!authResult.success || !authResult.user || !authorizeRole(authResult.user, ['admin'])) {
        return authResult.response || NextResponse.json(
          { success: false, error: 'Unauthorized', message: 'Admin access required' },
          { status: 401 }
        );
      }

      await syncPersistedGpsStatuses();

      const vehicles = await db.vehicle.findMany({
        where,
        include: {
          rentals: {
            include: { user: true },
            orderBy: { startDate: 'desc' },
            take: 1,
          },
          _count: {
            select: { trackingLogs: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return NextResponse.json({
        success: true,
        data: serializeData(withDerivedGpsStatusList(vehicles)),
      });
    }

    const vehicles = await db.vehicle.findMany({
      where,
      select: {
        id: true,
        plateNumber: true,
        model: true,
        brand: true,
        year: true,
        color: true,
        status: true,
        latitude: true,
        longitude: true,
        lastLocationAt: true,
        dailyRate: true,
        imageUrl: true,
        engineEnabled: true,
        engineKilledAt: true,
        engineKillReason: true,
        engineKilledBy: true,
        stationarySince: true,
        stationaryLat: true,
        stationaryLng: true,
        stationaryAlertSent: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ 
      success: true, 
      data: serializeData(vehicles) 
    });
  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicles' },
      { status: 500 }
    );
  }
}

// POST /api/vehicles - Create new vehicle
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const {
      plateNumber,
      model,
      brand,
      year,
      color,
      dailyRate,
      imageUrl,
      latitude,
      longitude,
    } = body;

    if (!plateNumber || !model || !brand || !year || !dailyRate) {
      return NextResponse.json(
        { error: 'Missing required vehicle fields' },
        { status: 400 }
      );
    }

    const vehicle = await db.vehicle.create({
      data: {
        plateNumber,
        model,
        brand,
        year,
        color,
        dailyRate,
        imageUrl,
        latitude,
        longitude,
        lastLocationAt: latitude && longitude ? new Date() : null,
      },
    });

    return NextResponse.json(serializeData(vehicle), { status: 201 });
  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to create vehicle' },
      { status: 500 }
    );
  }
}
