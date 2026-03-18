import { NextRequest, NextResponse } from 'next/server';
import { authenticateRequest } from '@/lib/jwt';
import { serializeData } from '@/lib/utils-serializer';
import { findTrackableVehicle, ingestTrackingPayload, validateTrackingPayload } from '@/lib/tracking';

const DEMO_TOKEN_HEADER = 'x-demo-token';

function getDemoToken() {
  return process.env.GPS_DEMO_TOKEN || null;
}

export async function handleDemoTrackingIngest(request: NextRequest) {
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

  if (authResult.success && authResult.user) {
    userId = authResult.user.userId;
  } else {
    const configuredDemoToken = getDemoToken();
    const providedDemoToken = request.headers.get(DEMO_TOKEN_HEADER);

    if (!configuredDemoToken || !providedDemoToken || providedDemoToken !== configuredDemoToken) {
      return NextResponse.json(
        {
          success: false,
          error: 'Authentication failed',
          message: 'Demo ingest membutuhkan admin JWT atau x-demo-token yang valid.',
        },
        { status: 401 },
      );
    }
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

  return NextResponse.json({
    success: true,
    message: 'Demo tracking berhasil disimpan',
    data: serializeData(result.log),
    sourceMode: 'demo',
  }, { status: 201 });
}
