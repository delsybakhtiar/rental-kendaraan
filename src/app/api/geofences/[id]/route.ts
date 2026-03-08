import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/geofences/[id] - Get single geofence
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const geofence = await db.geofence.findUnique({
      where: { id },
      include: {
        alerts: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!geofence) {
      return NextResponse.json({ error: 'Geofence not found' }, { status: 404 });
    }

    return NextResponse.json({
      ...geofence,
      coordinates: JSON.parse(geofence.coordinates),
    });
  } catch (error) {
    console.error('Error fetching geofence:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geofence' },
      { status: 500 }
    );
  }
}

// PUT /api/geofences/[id] - Update geofence
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = { ...body };
    if (body.coordinates) {
      updateData.coordinates = JSON.stringify(body.coordinates);
    }

    const geofence = await db.geofence.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      ...geofence,
      coordinates: JSON.parse(geofence.coordinates),
    });
  } catch (error) {
    console.error('Error updating geofence:', error);
    return NextResponse.json(
      { error: 'Failed to update geofence' },
      { status: 500 }
    );
  }
}

// DELETE /api/geofences/[id] - Delete geofence
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.geofence.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting geofence:', error);
    return NextResponse.json(
      { error: 'Failed to delete geofence' },
      { status: 500 }
    );
  }
}
