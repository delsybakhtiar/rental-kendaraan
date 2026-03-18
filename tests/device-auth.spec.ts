import { expect, test } from '@playwright/test';
import {
  authenticateDeviceRequest,
  createDeviceAuthHeaders,
} from '@/lib/device-auth';

test.describe('Device auth foundation', () => {
  const originalSecret = process.env.GPS_DEVICE_SHARED_SECRET;

  test.beforeEach(() => {
    process.env.GPS_DEVICE_SHARED_SECRET = 'device-auth-test-secret';
  });

  test.afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.GPS_DEVICE_SHARED_SECRET;
      return;
    }

    process.env.GPS_DEVICE_SHARED_SECRET = originalSecret;
  });

  test('menerima signature device yang valid', async () => {
    const rawBody = JSON.stringify({
      vehicleId: 'vehicle-1',
      latitude: 1.123,
      longitude: 104.456,
    });
    const headers = new Headers(
      createDeviceAuthHeaders('gps-device-1', rawBody, 'device-auth-test-secret', Date.now().toString()),
    );

    const result = authenticateDeviceRequest(headers, rawBody);

    expect(result).toEqual({
      success: true,
      deviceId: 'gps-device-1',
    });
  });

  test('menolak signature device yang tidak valid', async () => {
    const rawBody = JSON.stringify({
      vehicleId: 'vehicle-1',
      latitude: 1.123,
      longitude: 104.456,
    });
    const headers = new Headers(
      createDeviceAuthHeaders('gps-device-1', rawBody, 'device-auth-test-secret', Date.now().toString()),
    );
    headers.set('x-device-signature', 'deadbeef');

    const result = authenticateDeviceRequest(headers, rawBody);

    expect(result).toEqual({
      success: false,
      status: 401,
      message: 'Device signature is invalid',
    });
  });

  test('menolak timestamp device yang stale', async () => {
    const rawBody = JSON.stringify({
      vehicleId: 'vehicle-1',
      latitude: 1.123,
      longitude: 104.456,
    });
    const staleTimestamp = (Date.now() - 10 * 60 * 1000).toString();
    const headers = new Headers(
      createDeviceAuthHeaders('gps-device-1', rawBody, 'device-auth-test-secret', staleTimestamp),
    );

    const result = authenticateDeviceRequest(headers, rawBody);

    expect(result).toEqual({
      success: false,
      status: 401,
      message: 'Device timestamp is expired or invalid',
    });
  });
});
