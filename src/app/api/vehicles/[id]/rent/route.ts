import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/jwt';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/vehicles/[id]/rent - Rent a vehicle (update status to rented)
export async function POST(
  request: NextRequest,
  { params }: RouteParams
) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id } = await params;
    const body = await request.json();
    const { price, startDate, endDate, duration } = body;

    // Check if vehicle exists
    const vehicle = await db.vehicle.findUnique({
      where: { id },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      );
    }

    // Check if vehicle is available
    if (vehicle.status === 'rented') {
      return NextResponse.json(
        { success: false, message: 'Kendaraan sedang disewa' },
        { status: 400 }
      );
    }

    if (vehicle.status === 'maintenance') {
      return NextResponse.json(
        { success: false, message: 'Kendaraan sedang dalam perawatan' },
        { status: 400 }
      );
    }

    if (vehicle.status === 'emergency') {
      return NextResponse.json(
        { success: false, message: 'Kendaraan tidak tersedia (status darurat)' },
        { status: 400 }
      );
    }

    // Get or create a customer user for rental
    let customerUser = await db.user.findFirst({
      where: { email: 'customer@bintanrental.com' },
    });

    if (!customerUser) {
      // Create a default customer user
      customerUser = await db.user.create({
        data: {
          name: 'Walk-in Customer',
          email: 'customer@bintanrental.com',
          passwordHash: 'customer_placeholder',
          role: 'customer',
        },
      });
    }

    // Update vehicle status to rented
    const updatedVehicle = await db.vehicle.update({
      where: { id },
      data: {
        status: 'rented',
        updatedAt: new Date(),
      },
    });

    // Parse dates from request or use defaults
    const rentalStartDate = startDate ? new Date(startDate) : new Date();
    const rentalEndDate = endDate ? new Date(endDate) : (() => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      return d;
    })();

    // Create a rental record
    const rental = await db.rental.create({
      data: {
        vehicleId: id,
        userId: customerUser.id,
        startDate: rentalStartDate,
        endDate: rentalEndDate,
        totalAmount: price || vehicle.dailyRate,
        deposit: 0,
        status: 'active',
        startOdometer: 0,
        notes: duration ? `Durasi sewa: ${duration} hari` : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Pembayaran berhasil! Kendaraan berhasil disewa.',
      data: {
        vehicle: {
          id: updatedVehicle.id,
          plateNumber: updatedVehicle.plateNumber,
          brand: updatedVehicle.brand,
          model: updatedVehicle.model,
          status: updatedVehicle.status,
        },
        rental: {
          id: rental.id,
          startDate: rental.startDate,
          endDate: rental.endDate,
          duration: duration || 1,
          totalAmount: rental.totalAmount,
        },
      },
    });
  } catch (error) {
    console.error('Error renting vehicle:', error);
    return NextResponse.json(
      { success: false, message: 'Terjadi kesalahan saat memproses penyewaan' },
      { status: 500 }
    );
  }
}
