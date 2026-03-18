import crypto from 'node:crypto';

export const DEVICE_ID_HEADER = 'x-device-id';
export const DEVICE_TIMESTAMP_HEADER = 'x-device-timestamp';
export const DEVICE_SIGNATURE_HEADER = 'x-device-signature';

const DEFAULT_MAX_SKEW_MS = 5 * 60 * 1000;

export interface DeviceAuthSuccess {
  success: true;
  deviceId: string;
}

export interface DeviceAuthFailure {
  success: false;
  status: number;
  message: string;
}

export function getDeviceSharedSecret(): string | null {
  return process.env.GPS_DEVICE_SHARED_SECRET || null;
}

export function buildDeviceSignaturePayload(deviceId: string, timestamp: string, rawBody: string): string {
  return `${timestamp}.${deviceId}.${rawBody}`;
}

export function signDevicePayload(secret: string, deviceId: string, timestamp: string, rawBody: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(buildDeviceSignaturePayload(deviceId, timestamp, rawBody))
    .digest('hex');
}

export function createDeviceAuthHeaders(deviceId: string, rawBody: string, secret: string, timestamp = Date.now().toString()): Record<string, string> {
  return {
    [DEVICE_ID_HEADER]: deviceId,
    [DEVICE_TIMESTAMP_HEADER]: timestamp,
    [DEVICE_SIGNATURE_HEADER]: signDevicePayload(secret, deviceId, timestamp, rawBody),
  };
}

export function isFreshDeviceTimestamp(timestamp: string, now = Date.now()): boolean {
  const parsed = Number(timestamp);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return false;
  }

  return Math.abs(now - parsed) <= DEFAULT_MAX_SKEW_MS;
}

export function authenticateDeviceRequest(headers: Headers, rawBody: string): DeviceAuthSuccess | DeviceAuthFailure {
  const deviceId = headers.get(DEVICE_ID_HEADER)?.trim();
  const timestamp = headers.get(DEVICE_TIMESTAMP_HEADER)?.trim();
  const signature = headers.get(DEVICE_SIGNATURE_HEADER)?.trim();

  if (!deviceId || !timestamp || !signature) {
    return {
      success: false,
      status: 401,
      message: 'Device authentication headers are incomplete',
    };
  }

  const secret = getDeviceSharedSecret();
  if (!secret) {
    return {
      success: false,
      status: 503,
      message: 'Device authentication is not configured',
    };
  }

  if (!isFreshDeviceTimestamp(timestamp)) {
    return {
      success: false,
      status: 401,
      message: 'Device timestamp is expired or invalid',
    };
  }

  const expectedSignature = signDevicePayload(secret, deviceId, timestamp, rawBody);
  const providedBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return {
      success: false,
      status: 401,
      message: 'Device signature is invalid',
    };
  }

  return {
    success: true,
    deviceId,
  };
}
