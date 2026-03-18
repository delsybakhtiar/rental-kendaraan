import { expect, test } from '@playwright/test';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { syncTrackingUpdateToService } from '@/lib/tracking-sync';

let server: ReturnType<typeof createServer> | null = null;
let requestCount = 0;
let responseStatus = 200;
let responseBody = { success: true };

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function startMockServer() {
  await new Promise<void>((resolve) => {
    server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST' || req.url !== '/tracking/update') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false }));
        return;
      }

      requestCount += 1;
      await readJsonBody(req);
      res.writeHead(responseStatus, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(responseBody));
    });

    server.listen(3304, '127.0.0.1', () => resolve());
  });
}

async function stopMockServer() {
  if (!server) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server?.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  server = null;
}

test.describe('Tracking sync contract', () => {
  const originalTrackingServiceUrl = process.env.TRACKING_SERVICE_URL;

  test.beforeAll(async () => {
    process.env.TRACKING_SERVICE_URL = 'http://127.0.0.1:3304';
    await startMockServer();
  });

  test.afterEach(() => {
    requestCount = 0;
    responseStatus = 200;
    responseBody = { success: true };
  });

  test.afterAll(async () => {
    await stopMockServer();
    if (originalTrackingServiceUrl === undefined) {
      delete process.env.TRACKING_SERVICE_URL;
      return;
    }

    process.env.TRACKING_SERVICE_URL = originalTrackingServiceUrl;
  });

  test('mengembalikan synced=true saat tracking service sukses', async () => {
    const result = await syncTrackingUpdateToService({
      payload: {
        vehicleId: 'vehicle-1',
        latitude: 1.1,
        longitude: 104.1,
        speed: 40,
        heading: 180,
        ignition: true,
        fuel: 70,
      },
    });

    expect(requestCount).toBe(1);
    expect(result).toEqual({
      attempted: true,
      synced: true,
      status: 200,
      error: null,
    });
  });

  test('mengembalikan synced=false saat tracking service gagal', async () => {
    responseStatus = 503;
    responseBody = { success: false, error: 'service unavailable' };

    const result = await syncTrackingUpdateToService({
      payload: {
        vehicleId: 'vehicle-1',
        latitude: 1.1,
        longitude: 104.1,
        speed: null,
        heading: null,
        ignition: null,
        fuel: null,
      },
    });

    expect(requestCount).toBe(1);
    expect(result.attempted).toBe(true);
    expect(result.synced).toBe(false);
    expect(result.status).toBe(503);
    expect(result.error).toContain('service unavailable');
  });
});
