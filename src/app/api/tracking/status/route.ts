import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/jwt';
import { fetchTrackingServiceStatus, getTrackingServiceBaseUrl } from '@/lib/tracking-service';
import { syncPersistedGpsStatuses } from '@/lib/tracking';
import { isInsideOperationalArea } from '@/lib/operational-area';

export async function GET(request: NextRequest) {
  try {
    const authResult = requireAdmin(request);
    if (!authResult.success) {
      return authResult.response!;
    }

    await syncPersistedGpsStatuses();

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const [vehicles, recentTracking, failedSyncs, exhaustedSyncs, oldestFailedSync] = await Promise.all([
      db.vehicle.findMany({
        select: {
          id: true,
          latitude: true,
          longitude: true,
          gpsStatus: true,
          engineEnabled: true,
        },
      }),
      db.trackingLog.count({
        where: { recordedAt: { gte: oneHourAgo } },
      }),
      db.trackingLog.count({
        where: { externalSyncStatus: 'failed' },
      }),
      db.trackingLog.count({
        where: { externalSyncStatus: 'exhausted' },
      }),
      db.trackingLog.findFirst({
        where: { externalSyncStatus: 'failed' },
        orderBy: { externalSyncAttemptedAt: 'asc' },
        select: {
          externalSyncAttemptedAt: true,
          recordedAt: true,
        },
      }),
    ]);

    const gps = {
      online: vehicles.filter((vehicle) => vehicle.gpsStatus === 'online').length,
      stale: vehicles.filter((vehicle) => vehicle.gpsStatus === 'stale').length,
      offline: vehicles.filter((vehicle) => vehicle.gpsStatus === 'offline' || !vehicle.gpsStatus).length,
    };

    const vehiclesOutsideOperationalArea = vehicles.filter((vehicle) =>
      vehicle.latitude !== null &&
      vehicle.longitude !== null &&
      !isInsideOperationalArea(vehicle.latitude, vehicle.longitude),
    ).length;

    const engineKilled = vehicles.filter((vehicle) => vehicle.engineEnabled === false).length;
    const withLocation = vehicles.filter((vehicle) => vehicle.latitude !== null && vehicle.longitude !== null).length;

    const oldestPendingMinutes = oldestFailedSync
      ? Math.floor(
          (Date.now() - new Date(oldestFailedSync.externalSyncAttemptedAt ?? oldestFailedSync.recordedAt).getTime()) /
          (1000 * 60),
        )
      : 0;

    let externalService = {
      configuredUrl: getTrackingServiceBaseUrl(),
      status: failedSyncs > 0 || exhaustedSyncs > 0 ? 'degraded' : 'unknown',
      reachable: false,
      httpStatus: null as number | null,
      details: null as unknown,
    };

    try {
      const serviceStatus = await fetchTrackingServiceStatus(request.headers.get('authorization'));
      externalService = {
        configuredUrl: getTrackingServiceBaseUrl(),
        status: serviceStatus.ok ? 'healthy' : 'degraded',
        reachable: serviceStatus.ok,
        httpStatus: serviceStatus.status,
        details: serviceStatus.data,
      };
    } catch (error) {
      externalService = {
        configuredUrl: getTrackingServiceBaseUrl(),
        status: failedSyncs > 0 || exhaustedSyncs > 0 ? 'degraded' : 'offline',
        reachable: false,
        httpStatus: null,
        details: error instanceof Error ? error.message : 'Failed to reach tracking service',
      };
    }

    return NextResponse.json({
      success: true,
      vehicles: {
        total: vehicles.length,
        withLocation,
        outsideOperationalArea: vehiclesOutsideOperationalArea,
        engineKilled,
      },
      gps,
      tracking: {
        recentPointsLastHour: recentTracking,
      },
      sync: {
        pending: failedSyncs,
        exhausted: exhaustedSyncs,
        oldestPendingMinutes,
      },
      externalService,
    });
  } catch (error) {
    console.error('Error fetching tracking status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tracking status',
        message: 'An error occurred while fetching tracking status',
      },
      { status: 500 },
    );
  }
}
