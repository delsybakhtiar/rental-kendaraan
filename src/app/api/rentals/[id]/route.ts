import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';
import { requireAdmin } from '@/lib/jwt';

// PATCH /api/rentals/[id] - Update rental status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id } = await params;
    const body = await request.json();
    const { status, actualEndDate } = body;

    const rental = await db.rental.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!rental) {
      return NextResponse.json(
        { success: false, message: 'Rental tidak ditemukan' },
        { status: 404 }
      );
    }

    // Update rental
    const updatedRental = await db.rental.update({
      where: { id },
      data: {
        status,
        actualEndDate: actualEndDate ? new Date(actualEndDate) : status === 'completed' ? new Date() : null,
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Rental ${id} status updated to '${status}'`);

    return NextResponse.json({
      success: true,
      message: 'Status rental berhasil diupdate',
      data: serializeData(updatedRental),
    });
  } catch (error) {
    console.error('Error updating rental:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate rental' },
      { status: 500 }
    );
  }
}

// GET /api/rentals/[id] - Get specific rental
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

    const rental = await db.rental.findUnique({
      where: { id },
      include: {
        vehicle: true,
        user: true,
      },
    });

    if (!rental) {
      return NextResponse.json(
        { success: false, message: 'Rental tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: serializeData(rental),
    });
  } catch (error) {
    console.error('Error fetching rental:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch rental' },
      { status: 500 }
    );
  }
}
