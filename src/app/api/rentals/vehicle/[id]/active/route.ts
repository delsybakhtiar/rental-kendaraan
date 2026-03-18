import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';
import { requireAdmin } from '@/lib/jwt';

// GET /api/rentals/vehicle/[id]/active - Get active rental for a vehicle
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id } = await params;

    const rental = await db.rental.findFirst({
      where: {
        vehicleId: id,
        status: 'active',
      },
      include: {
        vehicle: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!rental) {
      return NextResponse.json({
        success: false,
        message: 'Tidak ada rental aktif untuk kendaraan ini',
        data: null,
      });
    }

    return NextResponse.json({
      success: true,
      data: serializeData(rental),
    });
  } catch (error) {
    console.error('Error fetching active rental:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch active rental' },
      { status: 500 }
    );
  }
}
