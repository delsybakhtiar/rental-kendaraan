import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';
import { requireAdmin } from '@/lib/jwt';

/**
 * @route   POST /api/vehicles/[id]/engine
 * @desc    Kill vehicle engine remotely (security feature)
 *          Sets status to 'emergency' and stops marker movement
 * @access  Private (requires JWT, admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id: vehicleId } = await params;

    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Get vehicle
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        plateNumber: true,
        brand: true,
        model: true,
        status: true,
        engineEnabled: true,
        latitude: true,
        longitude: true,
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (!vehicle.engineEnabled) {
      return NextResponse.json(
        { success: false, error: 'Engine already disabled', message: 'Mesin sudah dalam kondisi dimatikan' },
        { status: 400 }
      );
    }

    // Kill engine and set status to emergency
    await db.vehicle.update({
      where: { id: vehicleId },
      data: {
        engineEnabled: false,
        engineKilledAt: new Date(),
        engineKillReason: reason || 'Remote Engine Kill - Vehicle outside Bintan Island',
        status: 'emergency',
      },
    });

    // Create critical alert
    await db.geofenceAlert.create({
      data: {
        geofenceId: null,
        vehicleId: vehicleId,
        alertType: 'engine_kill',
        alertLevel: 'critical',
        message: `🔒 ENGINE KILL AKTIF: Mesin kendaraan ${vehicle.plateNumber} telah DIMATIKAN secara REMOTE!
Alasan: ${reason || 'Kendaraan di luar zona Bintan Island'}
Lokasi: ${vehicle.latitude?.toFixed(4)}, ${vehicle.longitude?.toFixed(4)}
Waktu: ${new Date().toLocaleString('id-ID')}
Status kendaraan diubah menjadi DARURAT/EMERGENCY.`,
        locationLat: vehicle.latitude,
        locationLng: vehicle.longitude,
        isResolved: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Engine kill activated for vehicle ${vehicle.plateNumber}`,
      data: serializeData({
        vehicle_id: vehicleId,
        plate_number: vehicle.plateNumber,
        vehicle_name: `${vehicle.brand} ${vehicle.model}`,
        engine_enabled: false,
        status: 'emergency',
        engine_killed_at: new Date(),
        reason: reason || 'Remote Engine Kill - Vehicle outside Bintan Island',
      }),
    });
  } catch (error) {
    console.error('Error in engine kill:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to kill engine',
        message: 'An error occurred while activating engine kill',
      },
      { status: 500 }
    );
  }
}

/**
 * @route   PUT /api/vehicles/[id]/engine
 * @desc    Restore vehicle engine (undo engine kill)
 *          Resets status to previous state
 * @access  Private (requires JWT, admin only)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    const { id: vehicleId } = await params;

    // Get vehicle
    const vehicle = await db.vehicle.findUnique({
      where: { id: vehicleId },
      select: {
        id: true,
        plateNumber: true,
        brand: true,
        model: true,
        status: true,
        engineEnabled: true,
        rentals: {
          where: { status: 'active' },
          take: 1,
        },
      },
    });

    if (!vehicle) {
      return NextResponse.json(
        { success: false, error: 'Vehicle not found' },
        { status: 404 }
      );
    }

    if (vehicle.engineEnabled) {
      return NextResponse.json(
        { success: false, error: 'Engine already enabled', message: 'Mesin sudah dalam kondisi aktif' },
        { status: 400 }
      );
    }

    // Determine the proper status based on active rental
    const newStatus = vehicle.rentals.length > 0 ? 'rented' : 'available';

    // Restore engine and reset status
    await db.vehicle.update({
      where: { id: vehicleId },
      data: {
        engineEnabled: true,
        engineKilledAt: null,
        engineKillReason: null,
        status: newStatus,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Engine restored for vehicle ${vehicle.plateNumber}`,
      data: serializeData({
        vehicle_id: vehicleId,
        plate_number: vehicle.plateNumber,
        vehicle_name: `${vehicle.brand} ${vehicle.model}`,
        engine_enabled: true,
        status: newStatus,
      }),
    });
  } catch (error) {
    console.error('Error in engine restore:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to restore engine',
        message: 'An error occurred while restoring engine',
      },
      { status: 500 }
    );
  }
}
