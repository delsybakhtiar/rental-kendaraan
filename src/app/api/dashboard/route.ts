import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { serializeData } from '@/lib/utils-serializer';

// GET /api/dashboard - Get dashboard statistics
export async function GET() {
  try {
    // Get vehicle counts by status
    const vehiclesByStatus = await db.vehicle.groupBy({
      by: ['status'],
      _count: true,
    });

    const vehicleStats = {
      total: 0,
      available: 0,
      rented: 0,
      maintenance: 0,
    };

    vehiclesByStatus.forEach((item) => {
      vehicleStats.total += item._count;
      if (item.status === 'available') vehicleStats.available = item._count;
      if (item.status === 'rented') vehicleStats.rented = item._count;
      if (item.status === 'maintenance') vehicleStats.maintenance = item._count;
    });

    // Get active rentals count
    const activeRentals = await db.rental.count({
      where: { status: 'active' },
    });

    // Get unresolved alerts count
    const unresolvedAlerts = await db.geofenceAlert.count({
      where: { isResolved: false },
    });

    // Get tracking logs count (last 24 hours)
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentTracking = await db.trackingLog.count({
      where: { recordedAt: { gte: yesterday } },
    });

    // Get active geofences
    const activeGeofences = await db.geofence.count({
      where: { isActive: true },
    });

    // Calculate revenue from active rentals
    const activeRentalsData = await db.rental.findMany({
      where: { status: 'active' },
      include: {
        vehicle: {
          select: { dailyRate: true },
        },
      },
    });

    const totalPotentialRevenue = activeRentalsData.reduce((sum, rental) => {
      const days = Math.ceil(
        (new Date(rental.endDate).getTime() - new Date(rental.startDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      const rate = rental.vehicle.dailyRate ? Number(rental.vehicle.dailyRate) : 0;
      return sum + days * rate;
    }, 0);

    const totalDeposit = activeRentalsData.reduce((sum, rental) => {
      const deposit = rental.deposit ? Number(rental.deposit) : 0;
      return sum + deposit;
    }, 0);

    // Get all vehicles with daily rates for rate summary
    const vehiclesWithRates = await db.vehicle.findMany({
      select: { dailyRate: true, status: true },
    });

    const avgDailyRate = vehiclesWithRates.length > 0
      ? vehiclesWithRates.reduce((sum, v) => sum + (v.dailyRate ? Number(v.dailyRate) : 0), 0) / vehiclesWithRates.length
      : 0;

    // Get recent alerts
    const recentAlerts = await db.geofenceAlert.findMany({
      where: { isResolved: false },
      include: { geofence: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Get vehicle locations for map
    const vehiclesWithLocation = await db.vehicle.findMany({
      where: {
        latitude: { not: null },
        longitude: { not: null },
      },
      select: {
        id: true,
        plateNumber: true,
        model: true,
        brand: true,
        status: true,
        latitude: true,
        longitude: true,
        lastLocationAt: true,
        dailyRate: true,
      },
    });

    // Get geofences for map
    const geofences = await db.geofence.findMany({
      where: { isActive: true },
    });

    const geofencesParsed = geofences.map((gf) => ({
      ...gf,
      coordinates: JSON.parse(gf.coordinates),
    }));

    return NextResponse.json({
      vehicleStats,
      activeRentals,
      unresolvedAlerts,
      recentTracking,
      activeGeofences,
      recentAlerts: serializeData(recentAlerts),
      vehiclesWithLocation: serializeData(vehiclesWithLocation),
      geofences: geofencesParsed,
      revenueStats: {
        totalPotentialRevenue,
        totalDeposit,
        avgDailyRate,
      },
    });
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
