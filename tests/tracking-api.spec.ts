import { PrismaClient } from '@prisma/client';
import { expect, test } from '@playwright/test';
import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { generateToken } from '@/lib/jwt';

const runDbIntegration = process.env.PLAYWRIGHT_GPS_DB === '1';
const prisma = new PrismaClient();
const adminToken = generateToken({
  userId: 'admin-tracking-test',
  email: 'admin-tracking-test@example.com',
  role: 'admin',
});

const authHeaders = {
  Authorization: `Bearer ${adminToken}`,
};

let forwardedBodies: Array<Record<string, unknown>> = [];
let trackingServiceServer: ReturnType<typeof createServer> | null = null;

async function readJsonBody(req: IncomingMessage) {
  const chunks: Buffer[] = [];

  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return JSON.parse(Buffer.concat(chunks).toString('utf8')) as Record<string, unknown>;
}

async function startTrackingServiceMock() {
  await new Promise<void>((resolve) => {
    trackingServiceServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
      if (req.method !== 'POST' || req.url !== '/tracking/update') {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: 'Not found' }));
        return;
      }

      const body = await readJsonBody(req);
      forwardedBodies.push(body);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, geofenceChecked: true }));
    });

    trackingServiceServer.listen(3303, '127.0.0.1', () => resolve());
  });
}

async function stopTrackingServiceMock() {
  if (!trackingServiceServer) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    trackingServiceServer?.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
  trackingServiceServer = null;
}

async function createVehicle() {
  const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  return prisma.vehicle.create({
    data: {
      plateNumber: `E2E-${uniqueSuffix}`,
      model: 'Avanza',
      brand: 'Toyota',
      year: 2024,
      color: 'Silver',
      dailyRate: 350000,
    },
  });
}

async function cleanupVehicle(vehicleId: string) {
  await prisma.vehicle.deleteMany({
    where: { id: vehicleId },
  });
}

test.describe.configure({ mode: 'serial' });

test.describe('Tracking API integration', () => {
  test.skip(!runDbIntegration, 'Set PLAYWRIGHT_GPS_DB=1 to run database-backed GPS integration tests.');
  const vehicleIdsToCleanup: string[] = [];

  test.beforeAll(async () => {
    await startTrackingServiceMock();
  });

  test.afterEach(async () => {
    while (vehicleIdsToCleanup.length > 0) {
      const vehicleId = vehicleIdsToCleanup.pop();
      if (vehicleId) {
        await cleanupVehicle(vehicleId);
      }
    }

    forwardedBodies = [];
  });

  test.afterAll(async () => {
    await stopTrackingServiceMock();
    await prisma.$disconnect();
  });

  test('POST /api/tracking menerima payload valid dan menulis histori + current state', async ({ request }) => {
    const vehicle = await createVehicle();
    vehicleIdsToCleanup.push(vehicle.id);

    const response = await request.post('/api/tracking', {
      headers: authHeaders,
      data: {
        vehicleId: vehicle.id,
        latitude: 1.1234,
        longitude: 104.1234,
        speed: 42.5,
        heading: 180,
        ignition: true,
        fuel: 75,
      },
    });

    expect(response.status()).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      message: 'Tracking log created successfully',
    });

    const updatedVehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicle.id },
      select: {
        latitude: true,
        longitude: true,
        lastLocationAt: true,
        lastTrackedAt: true,
        gpsStatus: true,
        currentSpeed: true,
        currentHeading: true,
        ignitionStatus: true,
      },
    });

    const trackingLogs = await prisma.trackingLog.findMany({
      where: { vehicleId: vehicle.id },
      orderBy: { recordedAt: 'desc' },
    });

    expect(trackingLogs).toHaveLength(1);
    expect(trackingLogs[0]).toMatchObject({
      vehicleId: vehicle.id,
      latitude: 1.1234,
      longitude: 104.1234,
      speed: 42.5,
      heading: 180,
      ignition: true,
      fuel: 75,
    });

    expect(updatedVehicle).toMatchObject({
      latitude: 1.1234,
      longitude: 104.1234,
      gpsStatus: 'online',
      currentSpeed: 42.5,
      currentHeading: 180,
      ignitionStatus: true,
    });
    expect(updatedVehicle.lastLocationAt).not.toBeNull();
    expect(updatedVehicle.lastTrackedAt).not.toBeNull();
  });

  test('POST /api/tracking menolak payload invalid', async ({ request }) => {
    const response = await request.post('/api/tracking', {
      headers: authHeaders,
      data: {
        vehicleId: '',
        latitude: 'invalid',
        longitude: 104.1234,
      },
    });

    expect(response.status()).toBe(400);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Validation failed',
    });
  });

  test('POST /api/tracking/update menulis current state ke DB dan tetap meneruskan ke tracking service', async ({ request }) => {
    const vehicle = await createVehicle();
    vehicleIdsToCleanup.push(vehicle.id);

    const response = await request.post('/api/tracking/update', {
      headers: authHeaders,
      data: {
        vehicleId: vehicle.id,
        latitude: 1.777,
        longitude: 104.888,
        speed: 55,
        heading: 270,
        ignition: false,
        fuel: 60,
      },
    });

    expect(response.status()).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      success: true,
      trackingService: {
        attempted: true,
        synced: true,
        status: 200,
      },
    });

    expect(forwardedBodies).toHaveLength(1);
    expect(forwardedBodies[0]).toMatchObject({
      vehicle_id: vehicle.id,
      lat: 1.777,
      lng: 104.888,
      speed: 55,
      heading: 270,
      ignition: false,
      fuel: 60,
    });

    const updatedVehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicle.id },
      select: {
        latitude: true,
        longitude: true,
        lastTrackedAt: true,
        gpsStatus: true,
        currentSpeed: true,
        currentHeading: true,
        ignitionStatus: true,
      },
    });
    const trackingLogs = await prisma.trackingLog.findMany({
      where: { vehicleId: vehicle.id },
    });

    expect(trackingLogs).toHaveLength(1);
    expect(updatedVehicle).toMatchObject({
      latitude: 1.777,
      longitude: 104.888,
      gpsStatus: 'online',
      currentSpeed: 55,
      currentHeading: 270,
      ignitionStatus: false,
    });
    expect(updatedVehicle.lastTrackedAt).not.toBeNull();
  });

  test('POST /api/tracking/update mengembalikan 404 untuk kendaraan yang tidak valid dan tidak memanggil tracking service', async ({ request }) => {
    const response = await request.post('/api/tracking/update', {
      headers: authHeaders,
      data: {
        vehicleId: 'vehicle-does-not-exist',
        latitude: 1.999,
        longitude: 104.999,
      },
    });

    expect(response.status()).toBe(404);
    await expect(response.json()).resolves.toMatchObject({
      success: false,
      error: 'Vehicle not found',
    });
    expect(forwardedBodies).toHaveLength(0);
  });
});
