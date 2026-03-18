import { expect, test, type Page, type Route } from '@playwright/test';

type MockVehicle = {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  year: number;
  color: string;
  status: 'available' | 'rented' | 'maintenance';
  dailyRate: number;
  imageUrl: string | null;
  latitude: number | null;
  longitude: number | null;
  engineEnabled: boolean;
  deviceId?: string | null;
  gpsStatus?: 'online' | 'stale' | 'offline';
  lastTrackedAt?: string | null;
  rentals?: Array<{
    id: string;
    status: 'active' | 'completed' | 'cancelled';
    startDate: string;
    endDate: string;
    actualEndDate?: string | null;
    user?: {
      id: string;
      name: string;
      email: string;
      role: 'admin' | 'customer';
      createdAt: string;
    };
  }>;
};

const baseVehicle: MockVehicle = {
  id: 'vehicle-1',
  plateNumber: 'BP 1234 AA',
  brand: 'Toyota',
  model: 'Avanza',
  year: 2024,
  color: 'Silver',
  status: 'available',
  dailyRate: 350000,
  imageUrl: null,
  latitude: null,
  longitude: null,
  engineEnabled: true,
  gpsStatus: 'offline',
  lastTrackedAt: null,
};

function makeVehicle(overrides: Partial<MockVehicle>): MockVehicle {
  return { ...baseVehicle, ...overrides };
}

function makeRental(overrides: Partial<NonNullable<MockVehicle['rentals']>[number]>) {
  return {
    id: 'rental-1',
    status: 'active' as const,
    startDate: '2026-03-10T00:00:00.000Z',
    endDate: '2026-03-12T00:00:00.000Z',
    actualEndDate: null,
    user: {
      id: 'customer-1',
      name: 'Budi Santoso',
      email: 'budi@example.com',
      role: 'customer' as const,
      createdAt: '2026-03-01T00:00:00.000Z',
    },
    ...overrides,
  };
}

function dashboardPayload(vehicles: MockVehicle[], gpsIntegrationMode: 'demo' | 'production' = 'production') {
  return {
    vehicleStats: {
      total: vehicles.length,
      available: vehicles.filter((vehicle) => vehicle.status === 'available').length,
      rented: vehicles.filter((vehicle) => vehicle.status === 'rented').length,
      maintenance: vehicles.filter((vehicle) => vehicle.status === 'maintenance').length,
    },
    activeRentals: 0,
    unresolvedAlerts: 0,
    recentTracking: 0,
    activeGeofences: 0,
    recentAlerts: [],
    vehiclesWithLocation: vehicles.filter((vehicle) => vehicle.latitude !== null && vehicle.longitude !== null),
    geofences: [],
    revenueStats: {
      totalPotentialRevenue: vehicles.reduce((total, vehicle) => total + vehicle.dailyRate, 0),
      totalDeposit: 0,
      avgDailyRate: vehicles.length ? vehicles.reduce((total, vehicle) => total + vehicle.dailyRate, 0) / vehicles.length : 0,
    },
    gpsIntegrationMode,
  };
}

async function mockJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({
    status,
    contentType: 'application/json',
    body: JSON.stringify(body),
  });
}

async function bootstrapDashboard(page: Page, vehicles: MockVehicle[]) {
  await bootstrapDashboardWithAccount(page, vehicles, 'standard');
}

async function bootstrapDashboardWithAccount(
  page: Page,
  vehicles: MockVehicle[],
  accountType: 'standard' | 'premium',
  gpsIntegrationMode: 'demo' | 'production' = 'production',
) {
  await page.addInitScript((type) => {
    window.localStorage.setItem('token', 'test-token');
    window.localStorage.setItem(
      'user',
      JSON.stringify({
        name: 'Playwright Admin',
        email: 'admin@example.com',
        accountType: type,
      }),
    );
  }, accountType);

  await page.route('**/api/dashboard', (route) => mockJson(route, dashboardPayload(vehicles, gpsIntegrationMode)));
  await page.route('**/api/vehicles?*', (route) => mockJson(route, { success: true, data: vehicles }));
  await page.route('**/api/vehicles', (route) => {
    if (route.request().method() === 'GET') {
      return mockJson(route, { success: true, data: vehicles });
    }
    return mockJson(route, { success: true }, 200);
  });
  await page.route('**/api/geofences?*', (route) => mockJson(route, { success: true, data: [] }));
  await page.route('**/api/geofences/alerts?*', (route) => mockJson(route, { success: true, data: [] }));
  await page.route('**/api/tracking/**', (route) => {
    if (route.request().url().includes('/api/tracking/status')) {
      return mockJson(route, {
        success: true,
        vehicles: {
          total: vehicles.length,
          withLocation: vehicles.filter((vehicle) => vehicle.latitude !== null && vehicle.longitude !== null).length,
          outsideOperationalArea: 1,
          engineKilled: vehicles.filter((vehicle) => vehicle.engineEnabled === false).length,
        },
        gps: {
          online: vehicles.filter((vehicle) => vehicle.gpsStatus === 'online').length,
          stale: vehicles.filter((vehicle) => vehicle.gpsStatus === 'stale').length,
          offline: vehicles.filter((vehicle) => vehicle.gpsStatus === 'offline' || !vehicle.gpsStatus).length,
        },
        tracking: {
          recentPointsLastHour: 12,
        },
        sync: {
          pending: 2,
          exhausted: 1,
          oldestPendingMinutes: 18,
        },
        externalService: {
          configuredUrl: 'https://tracking.example.com',
          status: 'degraded',
          reachable: false,
          httpStatus: null,
          details: 'timeout',
        },
      });
    }

    return mockJson(route, {
      vehicle: {},
      logs: [
        {
          id: 'track-1',
          vehicleId: vehicles[0]?.id || 'vehicle-1',
          latitude: 1.15,
          longitude: 104.55,
          speed: 42,
          heading: 90,
          recordedAt: '2026-03-17T10:00:00.000Z',
          ignition: true,
          fuel: 74,
        },
      ],
      totalPoints: 1,
    });
  });
}

async function openAddVehicleDialog(page: Page) {
  await expect(page.getByText('Daftar Kendaraan')).toBeVisible();
  await page.getByRole('button', { name: 'Tambah' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

async function fillVehicleForm(page: Page) {
  await page.getByTestId('vehicle-plate-number').fill('BP 9999 ZZ');
  await page.getByTestId('vehicle-brand').fill('Honda');
  await page.getByTestId('vehicle-model').fill('BR-V');
  await page.getByTestId('vehicle-daily-rate').fill('450000');
}

function pngBuffer(color: string, width = 160, height = 90) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
      <rect width="100%" height="100%" fill="${color}" />
    </svg>`,
  );
}

test.describe('Admin dashboard vehicle image flow', () => {
  test('cta upgrade hanya tampil untuk akun standard dan mengarah ke WhatsApp pengembang', async ({ page }) => {
    await bootstrapDashboardWithAccount(page, [baseVehicle], 'standard');

    await page.goto('/admin/dashboard');

    const bannerCta = page.getByTestId('upgrade-premium-banner-cta');
    const panelCta = page.getByTestId('upgrade-premium-panel-cta');
    const expectedHref =
      'https://wa.me/6285374383791?text=Halo%20Pengembang%2C%20saya%20ingin%20upgrade%20akun%20saya%20dari%20Standart%20ke%20Premium.';

    await expect(bannerCta).toBeVisible();
    await expect(panelCta).toBeVisible();
    await expect(bannerCta).toHaveAttribute('href', expectedHref);
    await expect(panelCta).toHaveAttribute('href', expectedHref);
  });

  test('cta upgrade tidak tampil untuk akun premium', async ({ page }) => {
    await bootstrapDashboardWithAccount(page, [baseVehicle], 'premium');

    await page.goto('/admin/dashboard');

    await expect(page.getByTestId('upgrade-premium-banner-cta')).toHaveCount(0);
    await expect(page.getByTestId('upgrade-premium-panel-cta')).toHaveCount(0);
    await expect(page.getByText('Akun Standard')).toHaveCount(0);
  });

  test('dashboard menampilkan indikator mode gps aktif', async ({ page }) => {
    await bootstrapDashboardWithAccount(page, [baseVehicle], 'premium', 'demo');

    await page.goto('/admin/dashboard');

    await expect(page.getByTestId('gps-mode-indicator')).toContainText('GPS Demo Mode');
  });

  test('dashboard premium menampilkan unduh laporan dan riwayat kendaraan', async ({ page }) => {
    await bootstrapDashboardWithAccount(page, [baseVehicle], 'premium');

    await page.goto('/admin/dashboard');

    await expect(page.getByTestId('premium-export-report')).toBeVisible();
    await page.getByRole('tab', { name: 'Riwayat' }).click();
    await expect(page.getByTestId('premium-history-panel')).toContainText('Sewa Selesai');
  });

  test('dashboard premium menampilkan ringkasan fleet security dan tab tracking dasar', async ({ page }) => {
    const trackedVehicle = makeVehicle({
      id: 'vehicle-tracked',
      plateNumber: 'BP 4321 ZZ',
      latitude: 1.15,
      longitude: 105.15,
      gpsStatus: 'online',
      status: 'rented',
    });

    await bootstrapDashboardWithAccount(page, [trackedVehicle], 'premium');
    await page.goto('/admin/dashboard');

    await expect(page.getByTestId('fleet-gps-online')).toContainText('1');
    await expect(page.getByTestId('fleet-outside-area')).toContainText('1');
    await expect(page.getByTestId('fleet-sync-pending')).toContainText('2');
    await expect(page.getByTestId('fleet-security-health')).toContainText('Tracking Service Degraded');

    await page.getByTestId('vehicle-list-item-vehicle-tracked').click();
    await page.getByRole('tab', { name: 'Tracking' }).click();
    await expect(page.getByTestId('premium-tracking-panel')).toContainText('Riwayat Tracking');
    await expect(page.getByTestId('premium-tracking-panel')).toContainText('1.150000, 104.550000');
  });

  test('dashboard premium menampilkan workflow security dan provisioning device GPS', async ({ page }) => {
    const trackedVehicle = makeVehicle({
      id: 'vehicle-security',
      plateNumber: 'BP 7777 GG',
      brand: 'Mitsubishi',
      model: 'Xpander',
      latitude: 1.11,
      longitude: 105.11,
      gpsStatus: 'stale',
      deviceId: 'GPS-OLD-01',
    });
    const putBodies: Array<Record<string, unknown>> = [];

    await bootstrapDashboardWithAccount(page, [trackedVehicle], 'premium');
    await page.route('**/api/vehicles/vehicle-security', async (route) => {
      if (route.request().method() === 'PUT') {
        putBodies.push(route.request().postDataJSON() as Record<string, unknown>);
        await mockJson(route, {
          ...trackedVehicle,
          deviceId: 'GPS-BTN-009',
        });
        return;
      }

      await mockJson(route, trackedVehicle);
    });

    await page.goto('/admin/dashboard');
    await page.getByRole('tab', { name: 'Security' }).click();
    await expect(page.getByTestId('premium-security-workflow')).toContainText('Keluar Area');
    await expect(page.getByTestId('premium-security-workflow')).toContainText('GPS Stale');
    await expect(page.getByTestId('premium-security-workflow')).toContainText('GPS-OLD-01');

    await page.getByText('Fokus Kendaraan').click();
    await page.getByTestId('device-id-input').fill('GPS-BTN-009');
    await page.getByTestId('device-id-save').click();

    await expect.poll(() => putBodies.length).toBe(1);
    expect(putBodies[0]?.deviceId).toBe('GPS-BTN-009');
  });

  test('dashboard basic menampilkan masa sewa dan status terlambat pada kendaraan', async ({ page }) => {
    const overdueVehicle = makeVehicle({
      id: 'vehicle-overdue',
      status: 'rented',
      rentals: [
        makeRental({
          status: 'active',
          startDate: '2026-03-10T00:00:00.000Z',
          endDate: '2026-03-12T00:00:00.000Z',
        }),
      ],
    });

    await bootstrapDashboard(page, [overdueVehicle]);
    await page.goto('/admin/dashboard');

    await expect(page.getByTestId('vehicle-rental-summary-vehicle-overdue')).toContainText('10 Mar 2026 - 12 Mar 2026');
    await expect(page.getByTestId('vehicle-rental-summary-vehicle-overdue')).toContainText('Sewa Terlambat');

    await page.getByTestId('vehicle-list-item-vehicle-overdue').click();
    await expect(page.getByTestId('selected-vehicle-rental-start')).toContainText('10 Mar 2026');
    await expect(page.getByTestId('selected-vehicle-rental-end')).toContainText('12 Mar 2026');
    await expect(page.getByTestId('selected-vehicle-rental-status')).toContainText('Terlambat');
  });

  test('upload sukses lalu submit menyimpan imageUrl hasil upload', async ({ page }) => {
    const createdBodies: Array<Record<string, unknown>> = [];

    await bootstrapDashboard(page, [baseVehicle]);
    await page.route('**/api/upload', (route) =>
      mockJson(route, { success: true, imageUrl: 'https://cdn.example.com/vehicle-success.webp' }),
    );
    await page.route('**/api/vehicles', async (route) => {
      if (route.request().method() === 'POST') {
        createdBodies.push(route.request().postDataJSON() as Record<string, unknown>);
        await mockJson(route, { success: true });
        return;
      }

      await mockJson(route, { success: true, data: [baseVehicle] });
    });

    await page.goto('/admin/dashboard');
    await openAddVehicleDialog(page);
    await page.getByTestId('vehicle-image-input').setInputFiles({
      name: 'car.png',
      mimeType: 'image/png',
      buffer: pngBuffer('#ff8a00'),
    });

    await expect(page.getByTestId('vehicle-image-preview')).toBeVisible();
    await expect(page.getByText('Upload Berhasil')).toBeVisible();

    await fillVehicleForm(page);
    await page.getByTestId('vehicle-submit').click();

    await expect.poll(() => createdBodies.length).toBe(1);
    expect(createdBodies[0]?.imageUrl).toBe('https://cdn.example.com/vehicle-success.webp');
  });

  test('upload sukses lalu submit menampilkan gambar kendaraan di list dan detail', async ({ page }) => {
    const vehicles = [baseVehicle];
    const createdVehicle = makeVehicle({
      id: 'vehicle-uploaded',
      plateNumber: 'BP 9999 ZZ',
      brand: 'Honda',
      model: 'BR-V',
      dailyRate: 450000,
      imageUrl: '/uploaded-vehicle.webp',
    });

    await bootstrapDashboard(page, vehicles);
    await page.route('**/api/dashboard', (route) => mockJson(route, dashboardPayload(vehicles)));
    await page.route('**/api/upload', (route) =>
      mockJson(route, { success: true, imageUrl: '/uploaded-vehicle.webp' }),
    );
    await page.route('**/uploaded-vehicle.webp', (route) =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: pngBuffer('#3366ff', 240, 140) }),
    );
    await page.route('**/api/vehicles?*', (route) => mockJson(route, { success: true, data: vehicles }));
    await page.route('**/api/vehicles', async (route) => {
      if (route.request().method() === 'POST') {
        vehicles.unshift(createdVehicle);
        await mockJson(route, { success: true, data: createdVehicle });
        return;
      }

      await mockJson(route, { success: true, data: vehicles });
    });

    await page.goto('/admin/dashboard');
    await openAddVehicleDialog(page);
    await page.getByTestId('vehicle-image-input').setInputFiles({
      name: 'car-display.png',
      mimeType: 'image/png',
      buffer: pngBuffer('#3366ff'),
    });

    await expect(page.getByText('Upload Berhasil')).toBeVisible();
    await fillVehicleForm(page);
    await page.getByTestId('vehicle-submit').click();

    await expect(page.getByTestId('vehicle-list-item-vehicle-uploaded')).toBeVisible();
    await expect(page.getByTestId('vehicle-list-image-vehicle-uploaded')).toHaveAttribute('src', '/uploaded-vehicle.webp');
    await expect(page.getByTestId('vehicle-list-image-vehicle-uploaded-fallback')).toHaveCount(0);

    await page.getByTestId('vehicle-list-item-vehicle-uploaded').click();
    await expect(page.getByTestId('selected-vehicle-image')).toHaveAttribute('src', '/uploaded-vehicle.webp');
    await expect(page.getByTestId('selected-vehicle-image-fallback')).toHaveCount(0);
  });

  test('submit saat upload masih berjalan diblok dan tidak mengirim create vehicle', async ({ page }) => {
    const createdBodies: Array<Record<string, unknown>> = [];
    let resolveUpload: (() => void) | null = null;
    const uploadFinished = new Promise<void>((resolve) => {
      resolveUpload = resolve;
    });

    await bootstrapDashboard(page, [baseVehicle]);
    await page.route('**/api/upload', async (route) => {
      await uploadFinished;
      await mockJson(route, { success: true, imageUrl: 'https://cdn.example.com/in-flight.webp' });
    });
    await page.route('**/api/vehicles', async (route) => {
      if (route.request().method() === 'POST') {
        createdBodies.push(route.request().postDataJSON() as Record<string, unknown>);
        await mockJson(route, { success: true });
        return;
      }

      await mockJson(route, { success: true, data: [baseVehicle] });
    });

    await page.goto('/admin/dashboard');
    await openAddVehicleDialog(page);
    await fillVehicleForm(page);

    await page.getByTestId('vehicle-image-input').setInputFiles({
      name: 'slow-upload.png',
      mimeType: 'image/png',
      buffer: pngBuffer('#0088ff'),
    });

    await expect(page.getByTestId('vehicle-submit')).toBeDisabled();
    await page.getByTestId('vehicle-submit').click({ force: true });
    expect(createdBodies).toHaveLength(0);

    resolveUpload?.();
    await expect(page.getByText('Upload Berhasil')).toBeVisible();
  });

  test('retry upload file yang sama setelah gagal tetap memicu upload kedua', async ({ page }) => {
    let uploadAttempts = 0;

    await bootstrapDashboard(page, [baseVehicle]);
    await page.route('**/api/upload', async (route) => {
      uploadAttempts += 1;

      if (uploadAttempts === 1) {
        await mockJson(route, { success: false, error: 'Upload pertama gagal' }, 500);
        return;
      }

      await mockJson(route, { success: true, imageUrl: 'https://cdn.example.com/retry.webp' });
    });

    await page.goto('/admin/dashboard');
    await openAddVehicleDialog(page);

    const filePayload = {
      name: 'retry.png',
      mimeType: 'image/png',
      buffer: pngBuffer('#00aa55'),
    };

    await page.getByTestId('vehicle-image-input').setInputFiles(filePayload);
    await expect(page.getByText('Upload pertama gagal')).toBeVisible();
    await expect(page.getByTestId('vehicle-image-preview')).toHaveCount(0);

    await page.getByTestId('vehicle-image-input').setInputFiles(filePayload);
    await expect(page.getByText('Upload Berhasil')).toBeVisible();
    await expect(page.getByTestId('vehicle-image-preview')).toBeVisible();
    expect(uploadAttempts).toBe(2);
  });

  test('form tambah kendaraan tetap rapi di mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await bootstrapDashboard(page, [baseVehicle]);

    await page.goto('/admin/dashboard');
    await openAddVehicleDialog(page);

    const dialog = page.getByRole('dialog');
    const brandInput = page.getByTestId('vehicle-brand');
    const modelInput = page.getByTestId('vehicle-model');
    const uploadTrigger = page.getByTestId('vehicle-image-upload-trigger');
    const submitButton = page.getByTestId('vehicle-submit');

    await expect(dialog).toBeVisible();
    await expect(uploadTrigger).toBeVisible();
    await expect(submitButton).toBeVisible();

    const [dialogBox, brandBox, modelBox, submitBox] = await Promise.all([
      dialog.boundingBox(),
      brandInput.boundingBox(),
      modelInput.boundingBox(),
      submitButton.boundingBox(),
    ]);

    expect(dialogBox).not.toBeNull();
    expect(brandBox).not.toBeNull();
    expect(modelBox).not.toBeNull();
    expect(submitBox).not.toBeNull();

    expect(Math.abs((brandBox?.x ?? 0) - (modelBox?.x ?? 0))).toBeLessThan(4);
    expect((modelBox?.y ?? 0)).toBeGreaterThan((brandBox?.y ?? 0));
    expect((submitBox?.width ?? 0)).toBeGreaterThan(250);
    expect((dialogBox?.width ?? 0)).toBeLessThanOrEqual(360);
  });

  test('fallback muncul saat imageUrl kendaraan rusak', async ({ page }) => {
    const brokenVehicle = makeVehicle({
      id: 'vehicle-broken',
      plateNumber: 'BP 4040 XX',
      imageUrl: '/broken-image.jpg',
    });

    await bootstrapDashboard(page, [brokenVehicle]);
    await page.route('**/broken-image.jpg', (route) => route.abort());

    await page.goto('/admin/dashboard');
    await page.getByText('BP 4040 XX').click();

    await expect(page.getByTestId('vehicle-list-image-vehicle-broken-fallback')).toBeVisible();
    await expect(page.getByTestId('selected-vehicle-image-fallback')).toBeVisible();
  });

  test('tracking request admin selalu mengirim authorization header', async ({ page }) => {
    let trackingAuthHeader: string | undefined;

    await bootstrapDashboard(page, [baseVehicle]);
    await page.route('**/api/tracking/vehicle-1?hours=24', async (route) => {
      trackingAuthHeader = route.request().headers().authorization;
      await mockJson(route, { vehicle: {}, logs: [], totalPoints: 0 });
    });

    await page.goto('/admin/dashboard');
    await page.getByTestId('vehicle-list-item-vehicle-1').click();

    await expect.poll(() => trackingAuthHeader).toBe('Bearer test-token');
  });

  test('dashboard premium menampilkan badge gps online stale dan offline', async ({ page }) => {
    const vehicles = [
      makeVehicle({
        id: 'vehicle-online',
        plateNumber: 'BP 1000 ON',
        gpsStatus: 'online',
        lastTrackedAt: new Date().toISOString(),
      }),
      makeVehicle({
        id: 'vehicle-stale',
        plateNumber: 'BP 2000 ST',
        gpsStatus: 'stale',
        lastTrackedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      }),
      makeVehicle({
        id: 'vehicle-offline',
        plateNumber: 'BP 3000 OF',
        gpsStatus: 'offline',
        lastTrackedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      }),
    ];

    await bootstrapDashboardWithAccount(page, vehicles, 'premium');
    await page.goto('/admin/dashboard');

    await expect(page.getByTestId('vehicle-list-item-vehicle-online')).toContainText('GPS Online');
    await expect(page.getByTestId('vehicle-list-item-vehicle-stale')).toContainText('GPS Stale');
    await expect(page.getByTestId('vehicle-list-item-vehicle-offline')).toContainText('GPS Offline');

    await page.getByTestId('vehicle-list-item-vehicle-stale').click();
    await expect(page.getByText('Status GPS')).toBeVisible();
    await expect(page.getByTestId('selected-vehicle-gps-status')).toHaveText('GPS Stale');
    await expect(page.getByTestId('selected-vehicle-gps-helper')).toContainText('lokasi terakhir kendaraan sudah lama tidak diperbarui');
  });

  test('thumbnail landscape dan portrait tetap memakai object-fit contain', async ({ page }) => {
    const landscapeVehicle = makeVehicle({
      id: 'vehicle-landscape',
      plateNumber: 'BP 1111 LS',
      imageUrl: '/landscape.png',
    });
    const portraitVehicle = makeVehicle({
      id: 'vehicle-portrait',
      plateNumber: 'BP 2222 PT',
      imageUrl: '/portrait.png',
    });

    await bootstrapDashboard(page, [landscapeVehicle, portraitVehicle]);
    await page.route('**/landscape.png', (route) =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: pngBuffer('#6633ff', 320, 120) }),
    );
    await page.route('**/portrait.png', (route) =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: pngBuffer('#ff3366', 120, 320) }),
    );

    await page.goto('/admin/dashboard');

    await expect(page.getByTestId('vehicle-list-image-vehicle-landscape')).toHaveCSS('object-fit', 'contain');
    await expect(page.getByTestId('vehicle-list-image-vehicle-portrait')).toHaveCSS('object-fit', 'contain');

    await page.getByText('BP 1111 LS').click();
    await expect(page.getByTestId('selected-vehicle-image')).toHaveCSS('object-fit', 'contain');

    await page.getByText('BP 2222 PT').click();
    await expect(page.getByTestId('selected-vehicle-image')).toHaveCSS('object-fit', 'contain');
  });

  test('hapus preview lalu submit mengirim imageUrl null', async ({ page }) => {
    const createdBodies: Array<Record<string, unknown>> = [];

    await bootstrapDashboard(page, [baseVehicle]);
    await page.route('**/api/upload', (route) =>
      mockJson(route, { success: true, imageUrl: 'https://cdn.example.com/to-remove.webp' }),
    );
    await page.route('**/api/vehicles', async (route) => {
      if (route.request().method() === 'POST') {
        createdBodies.push(route.request().postDataJSON() as Record<string, unknown>);
        await mockJson(route, { success: true });
        return;
      }

      await mockJson(route, { success: true, data: [baseVehicle] });
    });

    await page.goto('/admin/dashboard');
    await openAddVehicleDialog(page);
    await page.getByTestId('vehicle-image-input').setInputFiles({
      name: 'remove.png',
      mimeType: 'image/png',
      buffer: pngBuffer('#ffaa00'),
    });

    await expect(page.getByTestId('vehicle-image-preview')).toBeVisible();
    await page.getByTestId('vehicle-image-remove').click();
    await expect(page.getByTestId('vehicle-image-preview')).toHaveCount(0);

    await fillVehicleForm(page);
    await page.getByTestId('vehicle-submit').click();

    await expect.poll(() => createdBodies.length).toBe(1);
    expect(createdBodies[0]?.imageUrl).toBeNull();
  });

  test('complete rental mengupdate vehicle dan rental aktif', async ({ page }) => {
    const rentedVehicle = makeVehicle({
      id: 'vehicle-rented',
      plateNumber: 'BP 7777 RT',
      status: 'rented',
      imageUrl: '/rented.png',
    });
    const vehicleUpdates: Array<Record<string, unknown>> = [];
    const rentalUpdates: Array<Record<string, unknown>> = [];

    await bootstrapDashboard(page, [rentedVehicle]);
    await page.route('**/rented.png', (route) =>
      route.fulfill({ status: 200, contentType: 'image/svg+xml', body: pngBuffer('#3366ff', 200, 120) }),
    );
    await page.route('**/api/rentals/vehicle/vehicle-rented/active', (route) =>
      mockJson(route, {
        success: true,
        data: { id: 'rental-1' },
      }),
    );
    await page.route('**/api/vehicles/vehicle-rented', async (route) => {
      if (route.request().method() === 'PUT') {
        vehicleUpdates.push(route.request().postDataJSON() as Record<string, unknown>);
        await mockJson(route, { success: true });
        return;
      }

      await mockJson(route, rentedVehicle);
    });
    await page.route('**/api/rentals/rental-1', async (route) => {
      if (route.request().method() === 'PATCH') {
        rentalUpdates.push(route.request().postDataJSON() as Record<string, unknown>);
      }
      await mockJson(route, { success: true });
    });

    await page.goto('/admin/dashboard');
    await page.getByRole('button', { name: 'Selesaikan' }).click();
    await page.getByRole('button', { name: 'Ya, Selesaikan' }).click();

    await expect.poll(() => vehicleUpdates.length).toBe(1);
    await expect.poll(() => rentalUpdates.length).toBe(1);
    expect(vehicleUpdates[0]?.status).toBe('available');
    expect(rentalUpdates[0]?.status).toBe('completed');
  });

  test('delete vehicle mengirim request delete setelah konfirmasi', async ({ page }) => {
    const deletableVehicle = makeVehicle({
      id: 'vehicle-delete',
      plateNumber: 'BP 3333 DL',
    });
    const deletedIds: string[] = [];

    await bootstrapDashboard(page, [deletableVehicle]);
    await page.route('**/api/vehicles/vehicle-delete', async (route) => {
      if (route.request().method() === 'DELETE') {
        deletedIds.push('vehicle-delete');
        await mockJson(route, { success: true });
        return;
      }

      await mockJson(route, deletableVehicle);
    });
    page.on('dialog', (dialog) => dialog.accept());

    await page.goto('/admin/dashboard');
    await page.getByText('BP 3333 DL').click();
    await page.getByRole('button').filter({ has: page.locator('svg.lucide-trash2') }).click();

    await expect.poll(() => deletedIds.length).toBe(1);
  });
});
