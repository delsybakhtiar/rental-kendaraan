import { NextRequest, NextResponse } from 'next/server';
import { authenticateDeviceRequest } from '@/lib/device-auth';
import { authenticateRequest } from '@/lib/jwt';
import { persistTrackingSyncOutcome, syncTrackingUpdateToService } from '@/lib/tracking-sync';
import { serializeData } from '@/lib/utils-serializer';
import { findTrackableVehicle, ingestTrackingPayload, validateTrackingPayload } from '@/lib/tracking';

export async function handleProductionTrackingIngest(request: NextRequest) {
  const rawBody = await request.text();
  let body: unknown;

  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        message: 'Request body must be valid JSON',
      },
      { status: 400 },
    );
  }

  const validation = validateTrackingPayload(body);
  if (!validation.ok) {
    return NextResponse.json(
      {
        success: false,
        error: 'Validation failed',
        message: validation.message,
      },
      { status: 400 },
    );
  }
  const { payload } = validation;

  const authResult = authenticateRequest(request);
  let userId: string | null = null;
  let deviceId: string | null = null;

  if (authResult.success && authResult.user) {
    userId = authResult.user.userId;
  } else {
    const deviceAuth = authenticateDeviceRequest(request.headers, rawBody);
    if (!deviceAuth.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: deviceAuth.message,
        },
        { status: deviceAuth.status },
      );
    }

    deviceId = deviceAuth.deviceId;
  }

  const vehicle = await findTrackableVehicle(payload.vehicleId);
  if (!vehicle) {
    return NextResponse.json(
      {
        success: false,
        error: 'Vehicle not found',
        message: `Vehicle with ID ${payload.vehicleId} does not exist`,
      },
      { status: 404 },
    );
  }

  if (deviceId && vehicle.deviceId !== deviceId) {
    return NextResponse.json(
      {
        success: false,
        error: 'Device not authorized',
        message: `Device ${deviceId} is not registered for vehicle ${payload.vehicleId}`,
      },
      { status: 403 },
    );
  }

  const result = await ingestTrackingPayload(payload, userId, vehicle);
  if (!result) {
    return NextResponse.json(
      {
        success: false,
        error: 'Vehicle not found',
        message: `Vehicle with ID ${payload.vehicleId} does not exist`,
      },
      { status: 404 },
    );
  }

  const trackingService = await syncTrackingUpdateToService({
    authHeader: request.headers.get('authorization'),
    deviceId,
    deviceTimestamp: request.headers.get('x-device-timestamp'),
    deviceSignature: request.headers.get('x-device-signature'),
    payload,
  });

  const degraded = !trackingService.synced;
  await persistTrackingSyncOutcome(result.log.id, trackingService);

  return NextResponse.json({
    success: true,
    degraded,
    message: degraded
      ? 'Tracking saved locally, but external tracking service sync failed'
      : 'Tracking updated successfully',
    data: serializeData(result.log),
    trackingService,
    sourceMode: 'production',
  }, { status: degraded ? 202 : 200 });
}
