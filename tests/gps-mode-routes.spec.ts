import { expect, test } from '@playwright/test';

const activeMode = process.env.GPS_INTEGRATION_MODE === 'demo' ? 'demo' : 'production';

test.describe('GPS mode route gating', () => {
  test('route demo hanya aktif saat mode demo', async ({ request }) => {
    const response = await request.post('/api/tracking/demo', {
      data: {},
    });

    if (activeMode === 'demo') {
      expect(response.status()).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: 'Validation failed',
      });
      return;
    }

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'GPS mode mismatch',
    });
  });

  test('route ingest production hanya aktif saat mode production', async ({ request }) => {
    const response = await request.post('/api/tracking/ingest', {
      data: {},
    });

    if (activeMode === 'production') {
      expect(response.status()).toBe(400);
      await expect(response.json()).resolves.toMatchObject({
        success: false,
        error: 'Validation failed',
      });
      return;
    }

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'GPS mode mismatch',
    });
  });
});
