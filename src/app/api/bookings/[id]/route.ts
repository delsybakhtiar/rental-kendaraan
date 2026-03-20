import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';
import { authenticateRequest, authorizeRole } from '@/lib/jwt';
import { deriveFallbackBookingCode } from '@/lib/booking-code';

function getBookingNotesToken(notes: string | null): string | null {
  if (!notes) return null;

  try {
    const parsed = JSON.parse(notes) as { bookingToken?: string };
    return parsed.bookingToken || null;
  } catch {
    return null;
  }
}

function isAdminRequest(request: NextRequest): boolean {
  const authResult = authenticateRequest(request);
  return !!(authResult.success && authResult.user && authorizeRole(authResult.user, ['admin']));
}

// PATCH /api/bookings/[id] - Update booking status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, bookingToken } = body;

    console.log(`📝 PATCH /api/bookings/${id} - Status: ${status}`);

    // Get the current booking
    const rental = await db.rental.findUnique({
      where: { id },
      include: { vehicle: true },
    });

    if (!rental) {
      console.log(`❌ Booking not found: ${id}`);
      return NextResponse.json(
        { success: false, message: 'Booking tidak ditemukan' },
        { status: 404 }
      );
    }

    const isAdmin = isAdminRequest(request);
    const storedBookingToken = getBookingNotesToken(rental.notes);
    const isAuthorizedGuest = !!bookingToken && !!storedBookingToken && bookingToken === storedBookingToken;

    if (!isAdmin && !isAuthorizedGuest) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized booking access' },
        { status: 401 }
      );
    }

    console.log(`✅ Found booking: ${rental.id}, Vehicle: ${rental.vehicle?.plateNumber}`);

    // Handle different status updates
    if (status === 'paid') {
      console.log('💰 Processing payment confirmation...');

      // Payment confirmed - update rental status AND vehicle status
      const [updatedRental] = await db.$transaction([
        // Update rental status to active
        db.rental.update({
          where: { id },
          data: {
            status: 'active',
            updatedAt: new Date(),
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
        }),
        // Update vehicle status to rented
        db.vehicle.update({
          where: { id: rental.vehicleId },
          data: {
            status: 'rented',
            updatedAt: new Date(),
          },
        }),
      ]);

      console.log(`✅ Payment confirmed for booking ${id}`);
      console.log(`✅ Vehicle ${rental.vehicle?.plateNumber} status updated to 'rented'`);

      return NextResponse.json({
        success: true,
        message: 'Pembayaran berhasil dikonfirmasi! Kendaraan berhasil disewa.',
        data: serializeData(updatedRental),
      });
    }

    if (status === 'cancelled') {
      console.log('❌ Cancelling booking...');

      // Booking cancelled - update rental status
      const updatedRental = await db.rental.update({
        where: { id },
        data: {
          status: 'cancelled',
          updatedAt: new Date(),
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

      console.log(`❌ Booking ${id} cancelled`);

      return NextResponse.json({
        success: true,
        message: 'Booking dibatalkan',
        data: serializeData(updatedRental),
      });
    }

    if (status === 'expired') {
      console.log('⏰ Expiring booking...');

      // Booking expired - update rental status
      const updatedRental = await db.rental.update({
        where: { id },
        data: {
          status: 'expired',
          updatedAt: new Date(),
        },
      });

      console.log(`⏰ Booking ${id} expired`);

      return NextResponse.json({
        success: true,
        message: 'Booking expired',
        data: serializeData(updatedRental),
      });
    }

    if (status === 'completed') {
      console.log('✅ Completing rental...');

      // Rental completed - update rental status AND vehicle status back to available
      const [updatedRental] = await db.$transaction([
        db.rental.update({
          where: { id },
          data: {
            status: 'completed',
            actualEndDate: new Date(),
            updatedAt: new Date(),
          },
        }),
        db.vehicle.update({
          where: { id: rental.vehicleId },
          data: {
            status: 'available',
            updatedAt: new Date(),
          },
        }),
      ]);

      console.log(`✅ Rental ${id} completed, vehicle back to available`);

      return NextResponse.json({
        success: true,
        message: 'Rental selesai',
        data: serializeData(updatedRental),
      });
    }

    // Generic status update
    console.log(`📝 Updating booking status to: ${status}`);
    const updatedRental = await db.rental.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      data: serializeData(updatedRental),
    });
  } catch (error) {
    console.error('❌ Error updating booking:', error);
    return NextResponse.json(
      { success: false, message: 'Gagal mengupdate booking: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    );
  }
}

// GET /api/bookings/[id] - Get specific booking
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
        { success: false, message: 'Booking tidak ditemukan' },
        { status: 404 }
      );
    }

    const isAdmin = isAdminRequest(request);
    const bookingToken = new URL(request.url).searchParams.get('bookingToken');
    const storedBookingToken = getBookingNotesToken(rental.notes);

    if (!isAdmin && (!bookingToken || bookingToken !== storedBookingToken)) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized booking access' },
        { status: 401 }
      );
    }

    // Parse notes to get additional booking info
    let notesData = {};
    try {
      notesData = rental.notes ? JSON.parse(rental.notes) : {};
    } catch {
      // Ignore parse errors
    }

    const booking = {
      ...serializeData(rental),
      ...notesData,
      bookingCode:
        (notesData as { bookingCode?: string }).bookingCode || deriveFallbackBookingCode(rental.id),
    };

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to fetch booking' },
      { status: 500 }
    );
  }
}
