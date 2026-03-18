import { db } from '@/lib/db';

export interface TrackingPayload {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  ignition: boolean | null;
  fuel: number | null;
}

export type GpsLifecycleStatus = 'online' | 'stale' | 'offline';

const DEFAULT_STALE_AFTER_MINUTES = 5;
const DEFAULT_OFFLINE_AFTER_MINUTES = 30;

function getPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getGpsStatusThresholds() {
  const staleAfterMinutes = getPositiveIntegerEnv('GPS_STALE_AFTER_MINUTES', DEFAULT_STALE_AFTER_MINUTES);
  const offlineAfterMinutes = Math.max(
    getPositiveIntegerEnv('GPS_OFFLINE_AFTER_MINUTES', DEFAULT_OFFLINE_AFTER_MINUTES),
    staleAfterMinutes + 1,
  );

  return {
    staleAfterMinutes,
    offlineAfterMinutes,
  };
}

export function deriveGpsStatus(lastTrackedAt: Date | string | null | undefined): GpsLifecycleStatus {
  if (!lastTrackedAt) {
    return 'offline';
  }

  const trackedAt = lastTrackedAt instanceof Date ? lastTrackedAt : new Date(lastTrackedAt);
  if (Number.isNaN(trackedAt.getTime())) {
    return 'offline';
  }

  const { staleAfterMinutes, offlineAfterMinutes } = getGpsStatusThresholds();
  const ageInMinutes = (Date.now() - trackedAt.getTime()) / (1000 * 60);

  if (ageInMinutes >= offlineAfterMinutes) {
    return 'offline';
  }

  if (ageInMinutes >= staleAfterMinutes) {
    return 'stale';
  }

  return 'online';
}

export function withDerivedGpsStatus<T extends { lastTrackedAt?: Date | string | null; gpsStatus?: string | null }>(vehicle: T): T & { gpsStatus: GpsLifecycleStatus } {
  return {
    ...vehicle,
    gpsStatus: deriveGpsStatus(vehicle.lastTrackedAt),
  };
}

export function withDerivedGpsStatusList<T extends { lastTrackedAt?: Date | string | null; gpsStatus?: string | null }>(vehicles: T[]): Array<T & { gpsStatus: GpsLifecycleStatus }> {
  return vehicles.map(withDerivedGpsStatus);
}

export async function syncPersistedGpsStatuses(now = new Date()) {
  const { staleAfterMinutes, offlineAfterMinutes } = getGpsStatusThresholds();
  const staleCutoff = new Date(now.getTime() - staleAfterMinutes * 60 * 1000);
  const offlineCutoff = new Date(now.getTime() - offlineAfterMinutes * 60 * 1000);

  const [online, stale, offlineNoTrack, offlineOldTrack] = await db.$transaction([
    db.vehicle.updateMany({
      where: {
        lastTrackedAt: {
          gt: staleCutoff,
        },
        gpsStatus: {
          not: 'online',
        },
      },
      data: {
        gpsStatus: 'online',
      },
    }),
    db.vehicle.updateMany({
      where: {
        lastTrackedAt: {
          lte: staleCutoff,
          gt: offlineCutoff,
        },
        gpsStatus: {
          not: 'stale',
        },
      },
      data: {
        gpsStatus: 'stale',
      },
    }),
    db.vehicle.updateMany({
      where: {
        lastTrackedAt: null,
        gpsStatus: {
          not: 'offline',
        },
      },
      data: {
        gpsStatus: 'offline',
      },
    }),
    db.vehicle.updateMany({
      where: {
        lastTrackedAt: {
          lte: offlineCutoff,
        },
        gpsStatus: {
          not: 'offline',
        },
      },
      data: {
        gpsStatus: 'offline',
      },
    }),
  ]);

  return {
    online: online.count,
    stale: stale.count,
    offline: offlineNoTrack.count + offlineOldTrack.count,
  };
}

export function validateTrackingPayload(body: unknown): { ok: true; payload: TrackingPayload } | { ok: false; message: string } {
  if (!body || typeof body !== 'object') {
    return { ok: false, message: 'Request body is required' };
  }

  const {
    vehicleId,
    latitude,
    longitude,
    speed,
    heading,
    ignition,
    fuel,
  } = body as Record<string, unknown>;

  if (typeof vehicleId !== 'string' || vehicleId.trim().length === 0) {
    return { ok: false, message: 'vehicleId is required' };
  }

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return { ok: false, message: 'latitude and longitude must be valid numbers' };
  }

  const safeLatitude = latitude as number;
  const safeLongitude = longitude as number;

  if (safeLatitude < -90 || safeLatitude > 90 || safeLongitude < -180 || safeLongitude > 180) {
    return { ok: false, message: 'Invalid coordinates. Latitude must be between -90 and 90, longitude between -180 and 180' };
  }

  const safeSpeed = speed === undefined || speed === null ? null : Number(speed);
  if (safeSpeed !== null && (!Number.isFinite(safeSpeed) || safeSpeed < 0)) {
    return { ok: false, message: 'speed must be a valid number greater than or equal to 0' };
  }

  const safeHeading = heading === undefined || heading === null ? null : Number(heading);
  if (safeHeading !== null && (!Number.isFinite(safeHeading) || safeHeading < 0 || safeHeading > 360)) {
    return { ok: false, message: 'heading must be a valid number between 0 and 360' };
  }

  if (ignition !== undefined && ignition !== null && typeof ignition !== 'boolean') {
    return { ok: false, message: 'ignition must be a boolean value' };
  }

  const safeFuel = fuel === undefined || fuel === null ? null : Number(fuel);
  if (safeFuel !== null && (!Number.isFinite(safeFuel) || safeFuel < 0 || safeFuel > 100)) {
    return { ok: false, message: 'fuel must be a valid percentage between 0 and 100' };
  }

  return {
    ok: true,
    payload: {
      vehicleId: vehicleId.trim(),
      latitude: safeLatitude,
      longitude: safeLongitude,
      speed: safeSpeed,
      heading: safeHeading,
      ignition: ignition ?? null,
      fuel: safeFuel,
    },
  };
}

export async function findTrackableVehicle(vehicleId: string) {
  return db.vehicle.findUnique({
    where: { id: vehicleId },
    select: { id: true, plateNumber: true, deviceId: true },
  });
}

export async function persistTrackingSnapshot(payload: TrackingPayload, userId?: string | null) {
  const trackedAt = new Date();
  let safeUserId: string | null = null;

  if (userId) {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    safeUserId = user?.id ?? null;
  }

  const log = await db.trackingLog.create({
    data: {
      vehicleId: payload.vehicleId,
      latitude: payload.latitude,
      longitude: payload.longitude,
      speed: payload.speed,
      heading: payload.heading,
      ignition: payload.ignition ?? false,
      fuel: payload.fuel,
      userId: safeUserId,
      externalSyncStatus: 'local_only',
    },
  });

  await db.vehicle.update({
    where: { id: payload.vehicleId },
    data: {
      latitude: payload.latitude,
      longitude: payload.longitude,
      lastLocationAt: trackedAt,
      lastTrackedAt: trackedAt,
      gpsStatus: 'online',
      currentSpeed: payload.speed,
      currentHeading: payload.heading,
      ignitionStatus: payload.ignition,
    },
  });

  return log;
}

export async function ingestTrackingPayload(
  payload: TrackingPayload,
  userId?: string | null,
  vehicle = undefined as Awaited<ReturnType<typeof findTrackableVehicle>> | undefined,
) {
  const trackedVehicle = vehicle ?? await findTrackableVehicle(payload.vehicleId);

  if (!trackedVehicle) {
    return null;
  }

  const log = await persistTrackingSnapshot(payload, userId);

  return { vehicle: trackedVehicle, log };
}
