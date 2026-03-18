import { NextRequest, NextResponse } from 'next/server';
import { ensureGpsMode } from '@/lib/gps-mode';
import { handleProductionTrackingIngest } from '@/lib/tracking-production';

/**
 * @route   POST /api/tracking/update
 * @desc    Update GPS location with geofencing check (proxies to tracking service)
 * @access  Private (JWT admin or signed GPS device)
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
    const modeCheck = ensureGpsMode('production');
    if (!modeCheck.ok) {
      return modeCheck.response;
    }

    return handleProductionTrackingIngest(request);
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
