import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/geofences/alerts - Get all geofence alerts
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const isResolved = searchParams.get('isResolved');
    const vehicleId = searchParams.get('vehicleId');

    const where: Record<string, unknown> = {};

    if (isResolved !== null) {
      where.isResolved = isResolved === 'true';
    }

    if (vehicleId) {
      where.vehicleId = vehicleId;
    }

    const alerts = await db.geofenceAlert.findMany({
      where,
      include: {
        geofence: true,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get vehicle info separately
    const vehicleIds = [...new Set(alerts.map((a) => a.vehicleId))];
    const vehicles = await db.vehicle.findMany({
      where: { id: { in: vehicleIds } },
      select: { id: true, plateNumber: true, model: true, brand: true },
    });

    const vehiclesMap = new Map(vehicles.map((v) => [v.id, v]));

    const alertsWithVehicle = alerts.map((alert) => ({
      ...alert,
      vehicle: vehiclesMap.get(alert.vehicleId),
    }));

    return NextResponse.json(alertsWithVehicle);
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch alerts' },
      { status: 500 }
    );
  }
}

// PUT /api/geofences/alerts - Resolve an alert
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { alertId } = body;

    const alert = await db.geofenceAlert.update({
      where: { id: alertId },
      data: {
        isResolved: true,
        resolvedAt: new Date(),
      },
    });

    return NextResponse.json(alert);
  } catch (error) {
    console.error('Error resolving alert:', error);
    return NextResponse.json(
      { error: 'Failed to resolve alert' },
      { status: 500 }
    );
  }
}
