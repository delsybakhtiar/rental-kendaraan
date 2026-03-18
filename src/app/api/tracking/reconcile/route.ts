import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/jwt';
import { reconcileTrackingLogSyncs } from '@/lib/tracking-sync';

const RECONCILE_SECRET_HEADER = 'x-reconcile-secret';

export async function POST(request: NextRequest) {
  try {
    const configuredSecret = process.env.TRACKING_RECONCILE_SECRET;
    const providedSecret = request.headers.get(RECONCILE_SECRET_HEADER);

    if (!configuredSecret || providedSecret !== configuredSecret) {
      const authResult = requireAdmin(request);
      if (!authResult.success) {
        return authResult.response!;
      }
    }

    const { searchParams } = new URL(request.url);
    const limitParam = Number.parseInt(searchParams.get('limit') || '10', 10);
    const limit = Number.isFinite(limitParam) && limitParam > 0 ? Math.min(limitParam, 100) : 10;

    const summary = await reconcileTrackingLogSyncs(request.headers.get('authorization'), limit);

    return NextResponse.json({
      success: true,
      message: 'Tracking reconciliation finished',
      summary,
    });
  } catch (error) {
    console.error('Error reconciling tracking syncs:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to reconcile tracking syncs',
        message: 'An error occurred while reconciling external tracking sync state',
      },
      { status: 500 }
    );
  }
}
