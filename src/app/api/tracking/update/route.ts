import { NextRequest, NextResponse } from 'next/server';

/**
 * @route   POST /api/tracking/update
 * @desc    Update GPS location with geofencing check (proxies to tracking service)
 * @access  Private (requires JWT)
 * 
 * Request body:
 * {
 *   "vehicleId": "string",
 *   "latitude": number,
 *   "longitude": number,
 *   "speed": number,        // optional
 *   "heading": number,      // optional
 *   "ignition": boolean,    // optional
 *   "fuel": number          // optional
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Get authorization header
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', message: 'No token provided' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { vehicleId, latitude, longitude, speed, heading, ignition, fuel } = body;

    // Validate required fields
    if (!vehicleId || typeof latitude !== 'number' || typeof longitude !== 'number') {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'vehicleId, latitude, and longitude are required',
        },
        { status: 400 }
      );
    }

    // Validate coordinate ranges
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation failed',
          message: 'Invalid coordinates',
        },
        { status: 400 }
      );
    }

    // Forward to tracking service (port 3003)
    const trackingServiceUrl = `http://localhost:3003/tracking/update`;
    
    const response = await fetch(trackingServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify({
        vehicle_id: vehicleId,
        lat: latitude,
        lng: longitude,
        speed: speed ?? undefined,
        heading: heading ?? undefined,
        ignition: ignition ?? undefined,
        fuel: fuel ?? undefined,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error in tracking update:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update tracking',
        message: 'An error occurred while updating tracking data',
      },
      { status: 500 }
    );
  }
}
