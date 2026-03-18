import { NextResponse } from 'next/server';

export type GpsIntegrationMode = 'demo' | 'production';

export function getGpsIntegrationMode(): GpsIntegrationMode {
  const raw = process.env.GPS_INTEGRATION_MODE?.trim().toLowerCase();
  return raw === 'demo' ? 'demo' : 'production';
}

export function isDemoMode() {
  return getGpsIntegrationMode() === 'demo';
}

export function isProductionMode() {
  return getGpsIntegrationMode() === 'production';
}

export function getGpsModeLabel(mode = getGpsIntegrationMode()): string {
  return mode === 'demo' ? 'Demo' : 'Production';
}

export function ensureGpsMode(mode: GpsIntegrationMode) {
  const activeMode = getGpsIntegrationMode();

  if (activeMode === mode) {
    return { ok: true as const, mode: activeMode };
  }

  return {
    ok: false as const,
    mode: activeMode,
    response: NextResponse.json(
      {
        success: false,
        error: 'GPS mode mismatch',
        message: `Route ini hanya aktif saat GPS mode ${mode}. Mode aktif saat ini adalah ${activeMode}.`,
      },
      { status: 404 },
    ),
  };
}
