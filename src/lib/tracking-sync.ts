import { db } from '@/lib/db';
import {
  DEVICE_ID_HEADER,
  DEVICE_SIGNATURE_HEADER,
  DEVICE_TIMESTAMP_HEADER,
} from '@/lib/device-auth';
import { getTrackingServiceBaseUrl, getTrackingServiceTimeoutMs } from '@/lib/tracking-service';

export interface TrackingServiceSyncResult {
  attempted: boolean;
  synced: boolean;
  status: number | null;
  error: string | null;
}

function getPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getTrackingSyncConfig() {
  return {
    timeoutMs: getTrackingServiceTimeoutMs(),
    maxAttempts: getPositiveIntegerEnv('TRACKING_SYNC_MAX_ATTEMPTS', 5),
  };
}

export interface TrackingSyncPayload {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed: number | null;
  heading: number | null;
  ignition: boolean | null;
  fuel: number | null;
}

interface SyncTrackingUpdateOptions {
  authHeader?: string | null;
  deviceId?: string | null;
  deviceTimestamp?: string | null;
  deviceSignature?: string | null;
  payload: TrackingSyncPayload;
}

export async function syncTrackingUpdateToService({
  authHeader,
  deviceId,
  deviceTimestamp,
  deviceSignature,
  payload,
}: SyncTrackingUpdateOptions): Promise<TrackingServiceSyncResult> {
  const trackingServiceUrl = `${getTrackingServiceBaseUrl()}/tracking/update`;
  const { timeoutMs } = getTrackingSyncConfig();

  const result: TrackingServiceSyncResult = {
    attempted: false,
    synced: false,
    status: null,
    error: null,
  };

  try {
    result.attempted = true;

    const response = await fetch(trackingServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader ? { Authorization: authHeader } : {}),
        ...(deviceId ? { [DEVICE_ID_HEADER]: deviceId } : {}),
        ...(deviceTimestamp ? { [DEVICE_TIMESTAMP_HEADER]: deviceTimestamp } : {}),
        ...(deviceSignature ? { [DEVICE_SIGNATURE_HEADER]: deviceSignature } : {}),
      },
      body: JSON.stringify({
        vehicle_id: payload.vehicleId,
        lat: payload.latitude,
        lng: payload.longitude,
        speed: payload.speed ?? undefined,
        heading: payload.heading ?? undefined,
        ignition: payload.ignition ?? undefined,
        fuel: payload.fuel ?? undefined,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    result.status = response.status;
    result.synced = response.ok;

    if (!response.ok) {
      const errorBody = await response.text();
      result.error = errorBody || 'Tracking service returned a non-2xx response';
    }
  } catch (error) {
    result.error = error instanceof Error ? error.message : 'Failed to reach tracking service';
  }

  return result;
}

export async function persistTrackingSyncOutcome(logId: string, result: TrackingServiceSyncResult) {
  const currentLog = await db.trackingLog.findUnique({
    where: { id: logId },
    select: { externalSyncAttempts: true },
  });

  const nextAttempts = (currentLog?.externalSyncAttempts ?? 0) + (result.attempted ? 1 : 0);
  const { maxAttempts } = getTrackingSyncConfig();
  const attemptedAt = result.attempted ? new Date() : null;

  return db.trackingLog.update({
    where: { id: logId },
    data: {
      externalSyncStatus: result.synced ? 'synced' : nextAttempts >= maxAttempts ? 'exhausted' : 'failed',
      externalSyncAttempts: {
        increment: result.attempted ? 1 : 0,
      },
      externalSyncAttemptedAt: attemptedAt,
      externalSyncedAt: result.synced ? attemptedAt : null,
      externalSyncError: result.synced ? null : result.error,
    },
  });
}

export async function reconcileTrackingLogSyncs(authHeader: string | null, limit = 10) {
  const { maxAttempts } = getTrackingSyncConfig();
  const logs = await db.trackingLog.findMany({
    where: {
      externalSyncStatus: {
        in: ['failed'],
      },
      externalSyncAttempts: {
        lt: maxAttempts,
      },
    },
    orderBy: [
      { externalSyncAttemptedAt: 'asc' },
      { recordedAt: 'asc' },
    ],
    take: limit,
  });

  const results = await Promise.all(logs.map(async (log) => {
    const syncResult = await syncTrackingUpdateToService({
      authHeader,
      payload: {
        vehicleId: log.vehicleId,
        latitude: log.latitude,
        longitude: log.longitude,
        speed: log.speed,
        heading: log.heading,
        ignition: log.ignition,
        fuel: log.fuel,
      },
    });

    await persistTrackingSyncOutcome(log.id, syncResult);

    return {
      logId: log.id,
      vehicleId: log.vehicleId,
      ...syncResult,
    };
  }));

  return {
    attempted: results.length,
    synced: results.filter((result) => result.synced).length,
    failed: results.filter((result) => !result.synced).length,
    results,
  };
}
