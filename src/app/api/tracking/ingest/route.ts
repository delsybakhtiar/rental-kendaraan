import { NextRequest } from 'next/server';
import { ensureGpsMode } from '@/lib/gps-mode';
import { handleProductionTrackingIngest } from '@/lib/tracking-production';

export async function POST(request: NextRequest) {
  const modeCheck = ensureGpsMode('production');
  if (!modeCheck.ok) {
    return modeCheck.response;
  }

  return handleProductionTrackingIngest(request);
}
