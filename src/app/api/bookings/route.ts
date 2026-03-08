import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';

// POST /api/bookings - Create a new booking
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      vehicleId,
      startDate,
      endDate,
      duration,
      basePrice,
      driverFee,
      totalAmount,
      rentalOption,
      pickupLocation,
      customerName,
      customerPhone,
    } = body;

    console.log('📝 Creating booking for vehicle:', vehicleId);

    // Validate required fields
    if (!vehicleId || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, message: 'Data tidak lengkap' },
        { status: 400 }
      );
    }

    // Check if vehicle exists and is available
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, message: 'Kendaraan tidak ditemukan' },
        { status: 404 }
      );
    }

    console.log('🚗 Vehicle found:', vehicle.plateNumber, 'Status:', vehicle.status);

    if (vehicle.status !== 'available') {
      return NextResponse.json(
        { success: false, message: 'Kendaraan tidak tersedia untuk disewa' },
        { status: 400 }
      );
    }

    // Find or create a guest user for the booking
    let user = await db.user.findFirst({
      where: { email: `guest_${customerPhone || 'unknown'}@rental.com` },
    });

    if (!user) {
      user = await db.user.create({
        data: {
          name: customerName || 'Guest User',
          email: `guest_${customerPhone || Date.now()}@rental.com`,
          passwordHash: 'guest_account',
          role: 'customer',
          accountType: 'standard',
        },
      });
      console.log('👤 Created guest user:', user.id);
    }

    // Calculate expiry time (30 minutes from now)
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);

    // Create the rental with pending status
    const rental = await db.rental.create({
      data: {
        vehicleId,
        userId: user.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        totalAmount: totalAmount || basePrice + (driverFee || 0),
        deposit: 0,
        status: 'pending',
        notes: JSON.stringify({
          duration: duration || 1,
          basePrice: basePrice || 0,
          driverFee: driverFee || 0,
          rentalOption: rentalOption || 'lepas-kunci',
          pickupLocation: pickupLocation || '',
          customerName: customerName || 'Guest',
          customerPhone: customerPhone || '',
          expiresAt: expiresAt.toISOString(),
        }),
      },
      include: {
        vehicle: {
          select: {
            id: true,
            plateNumber: true,
            brand: true,
            model: true,
            year: true,
          },
        },
      },
    });

    console.log('✅ Booking created:', rental.id);
    console.log('📅 Expires at:', expiresAt.toISOString());

    // Return pending booking response
    const pendingBooking = {
      id: rental.id,
      vehicleId: rental.vehicleId,
      vehicle: serializeData(rental.vehicle),
      startDate: rental.startDate.toISOString(),
      endDate: rental.endDate.toISOString(),
      duration: duration || 1,
      basePrice: basePrice || 0,
      driverFee: driverFee || 0,
      totalAmount: Number(rental.totalAmount) || totalAmount || 0,
      rentalOption: rentalOption || 'lepas-kunci',
      pickupLocation: pickupLocation || '',
      customerName: customerName || 'Guest',
      customerPhone: customerPhone || '',
      expiresAt: expiresAt.toISOString(),
      status: 'pending',
      createdAt: rental.createdAt.toISOString(),
    };

    return NextResponse.json({
      success: true,
      message: 'Booking berhasil dibuat',
      data: pendingBooking,
    });
  } catch (error) {
    console.error('❌ Error creating booking:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal membuat booking: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// GET /api/bookings - Get all bookings (for admin)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    const where = status ? { status } : {};

    const rentals = await db.rental.findMany({
      where,
      include: {
        vehicle: true,
        user: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      data: serializeData(rentals),
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}