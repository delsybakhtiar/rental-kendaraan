function getPositiveIntegerEnv(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) {
    return fallback;
  }

  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getTrackingServiceBaseUrl() {
  return (process.env.TRACKING_SERVICE_URL || 'http://localhost:3003').replace(/\/$/, '');
}

export function getTrackingServiceTimeoutMs() {
  return getPositiveIntegerEnv('TRACKING_SYNC_TIMEOUT_MS', 5000);
}

export async function fetchTrackingServiceStatus(authHeader?: string | null) {
  const response = await fetch(`${getTrackingServiceBaseUrl()}/tracking/status`, {
    method: 'GET',
    headers: {
      ...(authHeader ? { Authorization: authHeader } : {}),
    },
    signal: AbortSignal.timeout(Math.min(getTrackingServiceTimeoutMs(), 5000)),
  });

  const body = await response.text();
  let data: unknown = null;

  try {
    data = body ? JSON.parse(body) : null;
  } catch {
    data = body || null;
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  };
}
