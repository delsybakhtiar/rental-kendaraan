import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/jwt';

// GET /api/geofences - Get all geofences
export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');

    const where = isActive !== null ? { isActive: isActive === 'true' } : {};

    const geofences = await db.geofence.findMany({
      where,
      include: {
        _count: {
          select: { alerts: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Parse coordinates from JSON string
    const geofencesWithParsedCoords = geofences.map((gf) => ({
      ...gf,
      coordinates: JSON.parse(gf.coordinates),
    }));

    return NextResponse.json(geofencesWithParsedCoords);
  } catch (error) {
    console.error('Error fetching geofences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geofences' },
      { status: 500 }
    );
  }
}

// POST /api/geofences - Create new geofence
export async function POST(request: NextRequest) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const body = await request.json();
    const {
      name,
      description,
      coordinates, // Array of [lng, lat] pairs
      color,
      type,
      alertOnEntry,
      alertOnExit,
    } = body;

    const geofence = await db.geofence.create({
      data: {
        name,
        description,
        coordinates: JSON.stringify(coordinates),
        color: color || '#22c55e',
        type: type || 'safe',
        alertOnEntry: alertOnEntry ?? false,
        alertOnExit: alertOnExit ?? true,
      },
    });

    return NextResponse.json({
      ...geofence,
      coordinates: JSON.parse(geofence.coordinates),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating geofence:', error);
    return NextResponse.json(
      { error: 'Failed to create geofence' },
      { status: 500 }
    );
  }
}
