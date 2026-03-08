import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';

// GET /api/vehicles - Get all vehicles
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status } : {};

    const vehicles = await db.vehicle.findMany({
      where,
      include: {
        rentals: {
          where: { status: 'active' },
          include: { user: true },
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
export async function POST(request: Request) {
  try {
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
