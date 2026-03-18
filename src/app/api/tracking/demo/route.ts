import { NextRequest } from 'next/server';
import { ensureGpsMode } from '@/lib/gps-mode';
import { handleDemoTrackingIngest } from '@/lib/tracking-demo';

export async function POST(request: NextRequest) {
  const modeCheck = ensureGpsMode('demo');
  if (!modeCheck.ok) {
    return modeCheck.response;
  }

  return handleDemoTrackingIngest(request);
}
