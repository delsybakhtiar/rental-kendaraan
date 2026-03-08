import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';

// GET /api/vehicles/[id] - Get single vehicle
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const vehicle = await db.vehicle.findUnique({
      where: { id },
      include: {
        rentals: {
          include: { user: true },
          orderBy: { createdAt: 'desc' },
          take: 5,
        },
        trackingLogs: {
          orderBy: { recordedAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json({ error: 'Vehicle not found' }, { status: 404 });
    }

    return NextResponse.json(serializeData(vehicle));
  } catch (error) {
    console.error('Error fetching vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vehicle' },
      { status: 500 }
    );
  }
}

// PUT /api/vehicles/[id] - Update vehicle
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    const vehicle = await db.vehicle.update({
      where: { id },
      data: {
        ...body,
        lastLocationAt: body.latitude && body.longitude ? new Date() : undefined,
      },
    });

    return NextResponse.json(serializeData(vehicle));
  } catch (error) {
    console.error('Error updating vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to update vehicle' },
      { status: 500 }
    );
  }
}

// DELETE /api/vehicles/[id] - Delete vehicle
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    await db.vehicle.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting vehicle:', error);
    return NextResponse.json(
      { error: 'Failed to delete vehicle' },
      { status: 500 }
    );
  }
}
